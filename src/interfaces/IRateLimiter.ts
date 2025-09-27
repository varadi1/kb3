/**
 * Interface Segregation Principle: Focused interface for rate limiting
 * Single Responsibility: Only responsible for managing request rates
 */

/**
 * Rate limiter interface for controlling request frequency
 */
export interface IRateLimiter {
  /**
   * Waits if necessary before allowing a request to a domain
   * @param domain The domain to check
   * @returns Promise that resolves when request can proceed
   */
  waitForDomain(domain: string): Promise<void>;

  /**
   * Records that a request to a domain has been made
   * @param domain The domain that was requested
   */
  recordRequest(domain: string): void;

  /**
   * Gets the current wait time for a domain
   * @param domain The domain to check
   * @returns Wait time in milliseconds, 0 if no wait needed
   */
  getWaitTime(domain: string): number;

  /**
   * Clears rate limiting history for a domain
   * @param domain The domain to clear, or undefined to clear all
   */
  clearHistory(domain?: string): void;

  /**
   * Updates rate limit settings for a domain
   * @param domain The domain to configure
   * @param intervalMs Minimum interval between requests in milliseconds
   */
  setDomainInterval(domain: string, intervalMs: number): void;

  /**
   * Gets current configuration
   * @returns Rate limiting configuration
   */
  getConfiguration(): RateLimitConfiguration;
}

/**
 * Configuration for rate limiting
 */
export interface RateLimitConfiguration {
  defaultIntervalMs: number;
  domainIntervals: Map<string, number>;
  enabled: boolean;
}

/**
 * Rate limit statistics
 */
export interface RateLimitStats {
  domain: string;
  lastRequestTime: Date | null;
  requestCount: number;
  totalWaitTime: number;
  averageWaitTime: number;
}