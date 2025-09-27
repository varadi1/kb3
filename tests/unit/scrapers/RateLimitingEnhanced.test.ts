/**
 * Enhanced unit tests for rate limiting functionality
 * Comprehensive coverage with edge cases and error scenarios
 */

import { DomainRateLimiter } from '../../../src/scrapers/DomainRateLimiter';
import { IRateLimiter, RateLimitConfiguration } from '../../../src/interfaces/IRateLimiter';

describe('DomainRateLimiter - Enhanced Tests', () => {
  let limiter: DomainRateLimiter;

  beforeEach(() => {
    limiter = new DomainRateLimiter({
      enabled: true,
      defaultIntervalMs: 100
    });
  });

  afterEach(() => {
    limiter.clearHistory();
  });

  describe('Configuration Management', () => {
    test('should initialize with default configuration', () => {
      const defaultLimiter = new DomainRateLimiter();
      const config = defaultLimiter.getConfiguration();

      expect(config.enabled).toBe(true);
      expect(config.defaultIntervalMs).toBe(1000);
      expect(config.domainIntervals.size).toBe(0);
    });

    test('should accept custom configuration', () => {
      const customLimiter = new DomainRateLimiter({
        enabled: false,
        defaultIntervalMs: 5000,
        domainIntervals: new Map([
          ['example.com', 2000],
          ['api.com', 3000]
        ])
      });

      const config = customLimiter.getConfiguration();
      expect(config.enabled).toBe(false);
      expect(config.defaultIntervalMs).toBe(5000);
      expect(config.domainIntervals.get('example.com')).toBe(2000);
      expect(config.domainIntervals.get('api.com')).toBe(3000);
    });

    test('should update domain intervals dynamically', () => {
      limiter.setDomainInterval('test.com', 500);
      limiter.setDomainInterval('slow.com', 10000);

      const config = limiter.getConfiguration();
      expect(config.domainIntervals.get('test.com')).toBe(500);
      expect(config.domainIntervals.get('slow.com')).toBe(10000);
    });

    test('should throw error for negative interval', () => {
      expect(() => {
        limiter.setDomainInterval('test.com', -100);
      }).toThrow('Interval must be non-negative');
    });

    test('should allow zero interval for immediate processing', () => {
      limiter.setDomainInterval('urgent.com', 0);
      const config = limiter.getConfiguration();
      expect(config.domainIntervals.get('urgent.com')).toBe(0);
    });
  });

  describe('Rate Limiting Logic', () => {
    test('should not wait for first request to a domain', async () => {
      const startTime = Date.now();
      await limiter.waitForDomain('new-domain.com');
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(10); // Should be almost instant
    });

    test('should enforce wait time for subsequent requests', async () => {
      const domain = 'test.com';

      // First request - no wait
      limiter.recordRequest(domain);

      // Immediate second request should require wait
      const waitTime = limiter.getWaitTime(domain);
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(100);
    });

    test('should respect domain-specific intervals over default', () => {
      const domain = 'special.com';
      limiter.setDomainInterval(domain, 500);

      limiter.recordRequest(domain);
      const waitTime = limiter.getWaitTime(domain);

      expect(waitTime).toBeLessThanOrEqual(500);
      expect(waitTime).toBeGreaterThan(100); // Should use 500ms, not default 100ms
    });

    test('should handle multiple domains independently', () => {
      limiter.recordRequest('domain1.com');
      limiter.recordRequest('domain2.com');

      const wait1 = limiter.getWaitTime('domain1.com');
      const wait2 = limiter.getWaitTime('domain2.com');

      expect(wait1).toBeGreaterThan(0);
      expect(wait2).toBeGreaterThan(0);

      // Different domains should have independent timings
      expect(Math.abs(wait1 - wait2)).toBeLessThan(10);
    });

    test('should return zero wait time when disabled', () => {
      const disabledLimiter = new DomainRateLimiter({
        enabled: false,
        defaultIntervalMs: 1000
      });

      disabledLimiter.recordRequest('test.com');
      const waitTime = disabledLimiter.getWaitTime('test.com');

      expect(waitTime).toBe(0);
    });

    test('should properly calculate wait time after delay', async () => {
      const domain = 'test.com';
      limiter.recordRequest(domain);

      // Wait for half the interval
      await new Promise(resolve => setTimeout(resolve, 50));

      const waitTime = limiter.getWaitTime(domain);
      expect(waitTime).toBeGreaterThan(0);
      expect(waitTime).toBeLessThanOrEqual(50);
    });
  });

  describe('Statistics Tracking', () => {
    test('should track request counts correctly', () => {
      const domain = 'stats.com';

      limiter.recordRequest(domain);
      limiter.recordRequest(domain);
      limiter.recordRequest(domain);

      const stats = limiter.getStats(domain);
      expect(stats.requestCount).toBe(3);
      expect(stats.domain).toBe(domain);
    });

    test('should track last request time', () => {
      const domain = 'time.com';
      const beforeTime = Date.now();

      limiter.recordRequest(domain);

      const stats = limiter.getStats(domain);
      expect(stats.lastRequestTime).toBeInstanceOf(Date);
      expect(stats.lastRequestTime!.getTime()).toBeGreaterThanOrEqual(beforeTime);
      expect(stats.lastRequestTime!.getTime()).toBeLessThanOrEqual(Date.now());
    });

    test('should return null for last request time when no requests made', () => {
      const stats = limiter.getStats('never-requested.com');

      expect(stats.lastRequestTime).toBeNull();
      expect(stats.requestCount).toBe(0);
      expect(stats.totalWaitTime).toBe(0);
    });

    test('should calculate average wait time', async () => {
      const domain = 'avg.com';

      // Make multiple requests with waits
      limiter.recordRequest(domain);
      await limiter.waitForDomain(domain);

      limiter.recordRequest(domain);
      await limiter.waitForDomain(domain);

      const stats = limiter.getStats(domain);
      expect(stats.averageWaitTime).toBeGreaterThanOrEqual(0);
    });
  });

  describe('History Management', () => {
    test('should clear history for specific domain', () => {
      limiter.recordRequest('keep.com');
      limiter.recordRequest('clear.com');

      limiter.clearHistory('clear.com');

      const keepStats = limiter.getStats('keep.com');
      const clearStats = limiter.getStats('clear.com');

      expect(keepStats.requestCount).toBe(1);
      expect(clearStats.requestCount).toBe(0);
      expect(clearStats.lastRequestTime).toBeNull();
    });

    test('should clear all history when domain not specified', () => {
      limiter.recordRequest('domain1.com');
      limiter.recordRequest('domain2.com');
      limiter.recordRequest('domain3.com');

      limiter.clearHistory();

      expect(limiter.getStats('domain1.com').requestCount).toBe(0);
      expect(limiter.getStats('domain2.com').requestCount).toBe(0);
      expect(limiter.getStats('domain3.com').requestCount).toBe(0);
    });

    test('should maintain domain intervals after clearing history', () => {
      limiter.setDomainInterval('test.com', 500);
      limiter.recordRequest('test.com');

      limiter.clearHistory('test.com');

      const config = limiter.getConfiguration();
      expect(config.domainIntervals.get('test.com')).toBe(500);
    });
  });

  describe('Domain Extraction', () => {
    test('should extract domain from various URL formats', () => {
      expect(DomainRateLimiter.extractDomain('https://example.com/path')).toBe('example.com');
      expect(DomainRateLimiter.extractDomain('http://sub.example.com')).toBe('sub.example.com');
      expect(DomainRateLimiter.extractDomain('https://example.com:8080/path')).toBe('example.com');
      expect(DomainRateLimiter.extractDomain('ftp://ftp.example.com')).toBe('ftp.example.com');
    });

    test('should handle invalid URLs gracefully', () => {
      expect(DomainRateLimiter.extractDomain('not-a-url')).toBe('unknown');
      expect(DomainRateLimiter.extractDomain('')).toBe('unknown');
      expect(DomainRateLimiter.extractDomain('://invalid')).toBe('unknown');
    });

    test('should handle special characters in domain', () => {
      expect(DomainRateLimiter.extractDomain('https://測試.com')).toBe('測試.com');
      expect(DomainRateLimiter.extractDomain('https://example-with-dash.com')).toBe('example-with-dash.com');
    });
  });

  describe('Concurrent Request Handling', () => {
    test('should handle concurrent requests to same domain', async () => {
      const domain = 'concurrent.com';
      const promises: Promise<void>[] = [];

      // Simulate 5 concurrent requests
      for (let i = 0; i < 5; i++) {
        promises.push(limiter.waitForDomain(domain));
        limiter.recordRequest(domain);
      }

      await Promise.all(promises);

      const stats = limiter.getStats(domain);
      expect(stats.requestCount).toBe(5);
    });

    test('should handle concurrent requests to different domains', async () => {
      const domains = ['domain1.com', 'domain2.com', 'domain3.com'];
      const promises: Promise<void>[] = [];

      for (const domain of domains) {
        promises.push(limiter.waitForDomain(domain));
        limiter.recordRequest(domain);
      }

      await Promise.all(promises);

      for (const domain of domains) {
        const stats = limiter.getStats(domain);
        expect(stats.requestCount).toBe(1);
      }
    });
  });

  describe('Edge Cases and Boundaries', () => {
    test('should handle very large interval values', () => {
      const domain = 'slow.com';
      const largeInterval = Number.MAX_SAFE_INTEGER;

      limiter.setDomainInterval(domain, largeInterval);
      limiter.recordRequest(domain);

      const waitTime = limiter.getWaitTime(domain);
      expect(waitTime).toBeLessThanOrEqual(largeInterval);
    });

    test('should handle rapid successive requests', () => {
      const domain = 'rapid.com';

      for (let i = 0; i < 100; i++) {
        limiter.recordRequest(domain);
      }

      const stats = limiter.getStats(domain);
      expect(stats.requestCount).toBe(100);
    });

    test('should maintain precision with small intervals', () => {
      const domain = 'precise.com';
      limiter.setDomainInterval(domain, 1); // 1ms interval

      limiter.recordRequest(domain);
      const waitTime = limiter.getWaitTime(domain);

      expect(waitTime).toBeGreaterThanOrEqual(0);
      expect(waitTime).toBeLessThanOrEqual(1);
    });
  });

  describe('Interface Implementation', () => {
    test('should implement IRateLimiter interface correctly', () => {
      const rateLimiter: IRateLimiter = limiter;

      // Verify all interface methods are implemented
      expect(rateLimiter.waitForDomain).toBeDefined();
      expect(rateLimiter.recordRequest).toBeDefined();
      expect(rateLimiter.getWaitTime).toBeDefined();
      expect(rateLimiter.clearHistory).toBeDefined();
      expect(rateLimiter.setDomainInterval).toBeDefined();
      expect(rateLimiter.getConfiguration).toBeDefined();
    });

    test('should return proper configuration structure', () => {
      const config: RateLimitConfiguration = limiter.getConfiguration();

      expect(config).toHaveProperty('enabled');
      expect(config).toHaveProperty('defaultIntervalMs');
      expect(config).toHaveProperty('domainIntervals');
      expect(config.domainIntervals).toBeInstanceOf(Map);
    });
  });
});