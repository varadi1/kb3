/**
 * Domain-based rate limiter implementation
 * Single Responsibility: Manages rate limiting for domain requests
 * Open/Closed: Can be extended for different rate limiting strategies
 */

import { IRateLimiter, RateLimitConfiguration, RateLimitStats } from '../interfaces/IRateLimiter';

export class DomainRateLimiter implements IRateLimiter {
  private lastRequestTimes: Map<string, number> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private totalWaitTimes: Map<string, number> = new Map();
  private configuration: RateLimitConfiguration;

  constructor(config?: Partial<RateLimitConfiguration>) {
    this.configuration = {
      defaultIntervalMs: config?.defaultIntervalMs || 1000,
      domainIntervals: new Map(config?.domainIntervals || []),
      enabled: config?.enabled !== false
    };
  }

  async waitForDomain(domain: string): Promise<void> {
    if (!this.configuration.enabled) {
      return;
    }

    const waitTime = this.getWaitTime(domain);

    if (waitTime > 0) {
      this.recordWaitTime(domain, waitTime);
      await this.delay(waitTime);
    }
  }

  recordRequest(domain: string): void {
    const now = Date.now();
    this.lastRequestTimes.set(domain, now);

    const count = this.requestCounts.get(domain) || 0;
    this.requestCounts.set(domain, count + 1);
  }

  getWaitTime(domain: string): number {
    if (!this.configuration.enabled) {
      return 0;
    }

    const lastRequestTime = this.lastRequestTimes.get(domain);
    if (!lastRequestTime) {
      return 0;
    }

    const interval = this.getIntervalForDomain(domain);
    const timeSinceLastRequest = Date.now() - lastRequestTime;
    const waitTime = Math.max(0, interval - timeSinceLastRequest);

    return waitTime;
  }

  clearHistory(domain?: string): void {
    if (domain) {
      this.lastRequestTimes.delete(domain);
      this.requestCounts.delete(domain);
      this.totalWaitTimes.delete(domain);
    } else {
      this.lastRequestTimes.clear();
      this.requestCounts.clear();
      this.totalWaitTimes.clear();
    }
  }

  setDomainInterval(domain: string, intervalMs: number): void {
    if (intervalMs < 0) {
      throw new Error('Interval must be non-negative');
    }
    this.configuration.domainIntervals.set(domain, intervalMs);
  }

  getConfiguration(): RateLimitConfiguration {
    return {
      ...this.configuration,
      domainIntervals: new Map(this.configuration.domainIntervals)
    };
  }

  /**
   * Gets statistics for a domain
   * @param domain The domain to get stats for
   * @returns Rate limit statistics
   */
  getStats(domain: string): RateLimitStats {
    const lastRequestTime = this.lastRequestTimes.get(domain);
    const requestCount = this.requestCounts.get(domain) || 0;
    const totalWaitTime = this.totalWaitTimes.get(domain) || 0;

    return {
      domain,
      lastRequestTime: lastRequestTime ? new Date(lastRequestTime) : null,
      requestCount,
      totalWaitTime,
      averageWaitTime: requestCount > 0 ? totalWaitTime / requestCount : 0
    };
  }

  /**
   * Extracts domain from URL
   * @param url The URL to extract domain from
   * @returns The domain
   */
  static extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  private getIntervalForDomain(domain: string): number {
    return this.configuration.domainIntervals.get(domain) ||
           this.configuration.defaultIntervalMs;
  }

  private recordWaitTime(domain: string, waitTime: number): void {
    const total = this.totalWaitTimes.get(domain) || 0;
    this.totalWaitTimes.set(domain, total + waitTime);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}