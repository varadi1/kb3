/**
 * Domain-based rate limiter implementation
 * Single Responsibility: Manages rate limiting for domain requests
 * Open/Closed: Can be extended for different rate limiting strategies
 */
import { IRateLimiter, RateLimitConfiguration, RateLimitStats } from '../interfaces/IRateLimiter';
export declare class DomainRateLimiter implements IRateLimiter {
    private lastRequestTimes;
    private requestCounts;
    private totalWaitTimes;
    private configuration;
    constructor(config?: Partial<RateLimitConfiguration>);
    waitForDomain(domain: string): Promise<void>;
    recordRequest(domain: string): void;
    getWaitTime(domain: string): number;
    clearHistory(domain?: string): void;
    setDomainInterval(domain: string, intervalMs: number): void;
    getConfiguration(): RateLimitConfiguration;
    /**
     * Gets statistics for a domain
     * @param domain The domain to get stats for
     * @returns Rate limit statistics
     */
    getStats(domain: string): RateLimitStats;
    /**
     * Extracts domain from URL
     * @param url The URL to extract domain from
     * @returns The domain
     */
    static extractDomain(url: string): string;
    private getIntervalForDomain;
    private recordWaitTime;
    private delay;
}
//# sourceMappingURL=DomainRateLimiter.d.ts.map