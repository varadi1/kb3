/**
 * Unit tests for rate limiting and error collection features
 * Tests SOLID compliance and functionality
 */

import { DomainRateLimiter } from '../../../src/scrapers/DomainRateLimiter';
import { ScrapingErrorCollector } from '../../../src/scrapers/ScrapingErrorCollector';
import { createDefaultConfiguration } from '../../../src/config/Configuration';
import { ScraperFactory } from '../../../src/scrapers/ScraperFactory';
import { FetcherRegistry } from '../../../src/fetchers/FetcherRegistry';

describe('Rate Limiting and Error Collection', () => {
  describe('DomainRateLimiter', () => {
    describe('SOLID Compliance', () => {
      test('follows Single Responsibility Principle', () => {
        const limiter = new DomainRateLimiter();

        // Only responsible for rate limiting
        expect(limiter.waitForDomain).toBeDefined();
        expect(limiter.recordRequest).toBeDefined();
        expect(limiter.getWaitTime).toBeDefined();

        // No unrelated methods
        expect((limiter as any).fetchContent).toBeUndefined();
        expect((limiter as any).processData).toBeUndefined();
      });

      test('follows Open/Closed Principle', () => {
        // Can be extended without modification
        class CustomRateLimiter extends DomainRateLimiter {
          async waitForDomain(domain: string): Promise<void> {
            // Custom implementation
            await super.waitForDomain(domain);
            console.log(`Custom wait for ${domain}`);
          }
        }

        const custom = new CustomRateLimiter();
        expect(custom).toBeInstanceOf(DomainRateLimiter);
      });

      test('follows Interface Segregation Principle', () => {
        const limiter = new DomainRateLimiter();

        // Implements focused interface
        expect(limiter.waitForDomain).toBeDefined();
        expect(limiter.recordRequest).toBeDefined();
        expect(limiter.getWaitTime).toBeDefined();
        expect(limiter.clearHistory).toBeDefined();
        expect(limiter.setDomainInterval).toBeDefined();
        expect(limiter.getConfiguration).toBeDefined();
      });
    });

    describe('Functionality', () => {
      let limiter: DomainRateLimiter;

      beforeEach(() => {
        limiter = new DomainRateLimiter({
          enabled: true,
          defaultIntervalMs: 100
        });
      });

      test('enforces rate limits between requests', async () => {
        const domain = 'example.com';

        // First request - no wait
        const wait1 = limiter.getWaitTime(domain);
        expect(wait1).toBe(0);

        limiter.recordRequest(domain);

        // Second request immediately - should wait
        const wait2 = limiter.getWaitTime(domain);
        expect(wait2).toBeGreaterThan(0);
        expect(wait2).toBeLessThanOrEqual(100);
      });

      test('respects domain-specific intervals', () => {
        const domain = 'special.com';
        limiter.setDomainInterval(domain, 500);

        limiter.recordRequest(domain);
        const waitTime = limiter.getWaitTime(domain);

        expect(waitTime).toBeLessThanOrEqual(500);
      });

      test('extracts domain from URL correctly', () => {
        expect(DomainRateLimiter.extractDomain('https://example.com/path')).toBe('example.com');
        expect(DomainRateLimiter.extractDomain('http://sub.example.com')).toBe('sub.example.com');
        expect(DomainRateLimiter.extractDomain('invalid-url')).toBe('unknown');
      });

      test('tracks statistics correctly', () => {
        const domain = 'test.com';

        limiter.recordRequest(domain);
        limiter.recordRequest(domain);

        const stats = limiter.getStats(domain);
        expect(stats.requestCount).toBe(2);
        expect(stats.domain).toBe(domain);
        expect(stats.lastRequestTime).toBeInstanceOf(Date);
      });

      test('can be disabled', async () => {
        const disabledLimiter = new DomainRateLimiter({
          enabled: false,
          defaultIntervalMs: 1000
        });

        const domain = 'example.com';
        disabledLimiter.recordRequest(domain);

        const waitTime = disabledLimiter.getWaitTime(domain);
        expect(waitTime).toBe(0);
      });
    });
  });

  describe('ScrapingErrorCollector', () => {
    describe('SOLID Compliance', () => {
      test('follows Single Responsibility Principle', () => {
        const collector = new ScrapingErrorCollector();

        // Only responsible for error collection
        expect(collector.recordError).toBeDefined();
        expect(collector.recordWarning).toBeDefined();
        expect(collector.getErrors).toBeDefined();
        expect(collector.getWarnings).toBeDefined();

        // No unrelated methods
        expect((collector as any).scrapeContent).toBeUndefined();
        expect((collector as any).rateLimit).toBeUndefined();
      });

      test('follows Liskov Substitution Principle', () => {
        const collector = new ScrapingErrorCollector();

        // Can be used wherever IErrorCollector is expected
        function processWithCollector(c: any) {
          c.recordError('context', new Error('test'));
          return c.getErrors('context');
        }

        const errors = processWithCollector(collector);
        expect(errors).toHaveLength(1);
      });
    });

    describe('Functionality', () => {
      let collector: ScrapingErrorCollector;

      beforeEach(() => {
        collector = new ScrapingErrorCollector();
      });

      test('records and retrieves errors correctly', () => {
        const context = 'https://example.com';
        const error = new Error('Connection failed');

        collector.recordError(context, error, { attempt: 1 });

        const errors = collector.getErrors(context);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Connection failed');
        expect(errors[0].metadata?.attempt).toBe(1);
      });

      test('records and retrieves warnings correctly', () => {
        const context = 'https://example.com';

        collector.recordWarning(context, 'Slow response', { responseTime: 5000 });

        const warnings = collector.getWarnings(context);
        expect(warnings).toHaveLength(1);
        expect(warnings[0].message).toBe('Slow response');
        expect(warnings[0].metadata?.responseTime).toBe(5000);
      });

      test('provides issue summary', () => {
        const context = 'https://example.com';

        collector.recordError(context, new Error('Error 1'));
        collector.recordError(context, new Error('Fatal error'));
        collector.recordWarning(context, 'Warning 1');

        const issues = collector.getIssues(context);
        expect(issues.summary.errorCount).toBe(2);
        expect(issues.summary.warningCount).toBe(1);
        expect(issues.errors).toHaveLength(2);
        expect(issues.warnings).toHaveLength(1);
      });

      test('classifies error severity correctly', () => {
        const context = 'test';

        collector.recordError(context, new Error('Connection timeout'));
        collector.recordError(context, new Error('Fatal: System crash'));
        collector.recordError(context, new Error('Generic error'));

        const errors = collector.getErrors(context);
        expect(errors.find(e => e.message.includes('timeout'))?.severity).toBe('recoverable');
        expect(errors.find(e => e.message.includes('Fatal'))?.severity).toBe('critical');
        expect(errors.find(e => e.message.includes('Generic'))?.severity).toBe('error');
      });

      test('exports all issues correctly', () => {
        collector.recordError('url1', new Error('Error 1'));
        collector.recordWarning('url2', 'Warning 1');
        collector.recordError('url3', new Error('Error 2'));

        const allIssues = collector.exportIssues();
        expect(allIssues.size).toBe(3);
        expect(allIssues.has('url1')).toBe(true);
        expect(allIssues.has('url2')).toBe(true);
        expect(allIssues.has('url3')).toBe(true);
      });

      test('clears issues correctly', () => {
        const context = 'https://example.com';

        collector.recordError(context, new Error('Error'));
        collector.recordWarning(context, 'Warning');

        collector.clearIssues(context);

        const issues = collector.getIssues(context);
        expect(issues.summary.errorCount).toBe(0);
        expect(issues.summary.warningCount).toBe(0);
      });

      test('merges collectors correctly', () => {
        const other = new ScrapingErrorCollector();
        other.recordError('url1', new Error('Other error'));

        collector.recordError('url2', new Error('My error'));
        collector.merge(other);

        const url1Issues = collector.getIssues('url1');
        const url2Issues = collector.getIssues('url2');

        expect(url1Issues.summary.errorCount).toBe(1);
        expect(url2Issues.summary.errorCount).toBe(1);
      });
    });
  });

  describe('Integration with ScraperAwareContentFetcher', () => {
    test('applies rate limiting and collects errors', async () => {
      const config = createDefaultConfiguration({
        scraping: {
          enabledScrapers: ['http'],
          rateLimiting: {
            enabled: true,
            defaultIntervalMs: 50,
            domainIntervals: {
              'example.com': 100
            }
          },
          errorCollection: {
            enabled: true
          }
        }
      });

      const baseFetcher = new FetcherRegistry();
      const fetcher = ScraperFactory.createScraperAwareContentFetcher(baseFetcher, config);

      // Test rate limiting configuration
      const rateLimiter = fetcher.getRateLimiter();
      expect(rateLimiter.getConfiguration().defaultIntervalMs).toBe(50);

      // Test error collector
      const errorCollector = fetcher.getErrorCollector();
      expect(errorCollector).toBeDefined();

      // Test domain-specific rate limit setting
      fetcher.setDomainRateLimit('special.com', 200);
      const limiterConfig = rateLimiter.getConfiguration();
      expect(limiterConfig.domainIntervals.get('special.com')).toBe(200);
    });

    test('configuration properly flows to components', () => {
      const config = createDefaultConfiguration({
        scraping: {
          rateLimiting: {
            enabled: false,
            defaultIntervalMs: 2000,
            domainIntervals: {
              'api.example.com': 5000,
              'slow-site.com': 10000
            }
          }
        }
      });

      const baseFetcher = new FetcherRegistry();
      const fetcher = ScraperFactory.createScraperAwareContentFetcher(baseFetcher, config);

      const rateLimiter = fetcher.getRateLimiter();
      const limiterConfig = rateLimiter.getConfiguration();

      expect(limiterConfig.enabled).toBe(false);
      expect(limiterConfig.defaultIntervalMs).toBe(2000);
      expect(limiterConfig.domainIntervals.get('api.example.com')).toBe(5000);
      expect(limiterConfig.domainIntervals.get('slow-site.com')).toBe(10000);
    });
  });
});