/**
 * Registry for content fetchers
 * Single Responsibility: Manages and coordinates multiple fetchers
 * Open/Closed Principle: Easy to add new fetchers
 * Dependency Inversion: Depends on IContentFetcher abstraction
 */

import { IContentFetcher, FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';

export class FetcherRegistry implements IContentFetcher {
  private readonly fetchers: IContentFetcher[];
  private readonly retryConfig: RetryConfig;

  constructor(fetchers: IContentFetcher[] = [], retryConfig?: Partial<RetryConfig>) {
    this.fetchers = [...fetchers];
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffFactor: 2,
      retryOn: ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT'],
      ...retryConfig
    };
  }

  /**
   * Checks if any fetcher can handle the URL
   * @param url The URL or path to check
   * @returns true if at least one fetcher can handle it
   */
  canFetch(url: string): boolean {
    return this.fetchers.some(fetcher => fetcher.canFetch(url));
  }

  /**
   * Adds a new fetcher to the registry
   * @param fetcher The fetcher to add
   */
  addFetcher(fetcher: IContentFetcher): void {
    this.fetchers.push(fetcher);
  }

  /**
   * Removes a fetcher from the registry
   * @param fetcher The fetcher to remove
   */
  removeFetcher(fetcher: IContentFetcher): boolean {
    const index = this.fetchers.indexOf(fetcher);
    if (index !== -1) {
      this.fetchers.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Fetches content using the first available fetcher
   * @param url The URL to fetch
   * @param options Fetch options
   * @returns Promise resolving to fetched content
   */
  async fetch(url: string, options: FetchOptions = {}): Promise<FetchedContent> {
    const capableFetchers = this.fetchers.filter(fetcher => fetcher.canFetch(url));

    if (capableFetchers.length === 0) {
      throw new Error(`No fetcher can handle URL: ${url}`);
    }

    let lastError: Error | null = null;

    for (const fetcher of capableFetchers) {
      try {
        return await this.fetchWithRetry(fetcher, url, options);
      } catch (error: any) {
        lastError = error;
        console.warn(`Fetcher ${fetcher.constructor.name} failed for ${url}:`, error.message);
        continue;
      }
    }

    throw new Error(`All fetchers failed for ${url}. Last error: ${lastError?.message}`);
  }

  /**
   * Attempts to fetch using all capable fetchers and returns results
   * @param url The URL to fetch
   * @param options Fetch options
   * @returns Promise resolving to array of fetch attempts
   */
  async fetchAll(url: string, options: FetchOptions = {}): Promise<FetchAttempt[]> {
    const capableFetchers = this.fetchers.filter(fetcher => fetcher.canFetch(url));
    const attempts: FetchAttempt[] = [];

    for (const fetcher of capableFetchers) {
      const startTime = Date.now();
      try {
        const content = await this.fetchWithRetry(fetcher, url, options);
        attempts.push({
          fetcher: fetcher.constructor.name,
          success: true,
          content,
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        attempts.push({
          fetcher: fetcher.constructor.name,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    }

    return attempts;
  }

  /**
   * Fetches content with retry logic
   * @param fetcher The fetcher to use
   * @param url The URL to fetch
   * @param options Fetch options
   * @returns Promise resolving to fetched content
   */
  private async fetchWithRetry(
    fetcher: IContentFetcher,
    url: string,
    options: FetchOptions
  ): Promise<FetchedContent> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await fetcher.fetch(url, options);
      } catch (error: any) {
        lastError = error;

        // Don't retry on final attempt or non-retryable errors
        if (attempt === this.retryConfig.maxRetries || !this.shouldRetry(error)) {
          break;
        }

        // Wait before retry with exponential backoff
        const delay = this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffFactor, attempt);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Determines if an error should trigger a retry
   * @param error The error to check
   * @returns true if the error is retryable
   */
  private shouldRetry(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return this.retryConfig.retryOn.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  /**
   * Sleeps for the specified duration
   * @param ms Milliseconds to sleep
   * @returns Promise that resolves after the delay
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets information about registered fetchers
   * @returns Array of fetcher information
   */
  getFetcherInfo(): FetcherInfo[] {
    return this.fetchers.map(fetcher => ({
      name: fetcher.constructor.name,
      maxSize: (fetcher as any).getMaxSize?.() || 'unknown',
      timeout: (fetcher as any).getTimeout?.() || 'unknown',
      userAgent: (fetcher as any).getUserAgent?.() || 'unknown'
    }));
  }

  /**
   * Gets count of registered fetchers
   * @returns Number of registered fetchers
   */
  getFetcherCount(): number {
    return this.fetchers.length;
  }

  /**
   * Gets retry configuration
   * @returns Current retry configuration
   */
  getRetryConfig(): RetryConfig {
    return { ...this.retryConfig };
  }

  /**
   * Updates retry configuration
   * @param config New retry configuration
   */
  setRetryConfig(config: Partial<RetryConfig>): void {
    Object.assign(this.retryConfig, config);
  }

  /**
   * Clears all registered fetchers
   */
  clear(): void {
    this.fetchers.length = 0;
  }

  /**
   * Tests connectivity to a URL using available fetchers
   * @param url The URL to test
   * @param options Fetch options
   * @returns Promise resolving to connectivity status
   */
  async testConnectivity(url: string, options: FetchOptions = {}): Promise<ConnectivityResult> {
    const capableFetchers = this.fetchers.filter(fetcher => fetcher.canFetch(url));

    if (capableFetchers.length === 0) {
      return {
        url,
        accessible: false,
        error: 'No fetcher can handle URL',
        testedFetchers: []
      };
    }

    const testResults: FetcherTestResult[] = [];
    let accessible = false;

    for (const fetcher of capableFetchers) {
      const startTime = Date.now();
      try {
        // Try to fetch just headers or minimal content for connectivity test
        if (typeof (fetcher as any).isAccessible === 'function') {
          const result = await (fetcher as any).isAccessible(url, options);
          testResults.push({
            fetcher: fetcher.constructor.name,
            success: result,
            duration: Date.now() - startTime
          });
          if (result) accessible = true;
        } else {
          // Fallback: try actual fetch with timeout
          await fetcher.fetch(url, { ...options, timeout: 5000 });
          testResults.push({
            fetcher: fetcher.constructor.name,
            success: true,
            duration: Date.now() - startTime
          });
          accessible = true;
          break; // Success, no need to test other fetchers
        }
      } catch (error: any) {
        testResults.push({
          fetcher: fetcher.constructor.name,
          success: false,
          duration: Date.now() - startTime,
          error: error.message
        });
      }
    }

    return {
      url,
      accessible,
      testedFetchers: testResults
    };
  }
}

export interface FetchAttempt {
  fetcher: string;
  success: boolean;
  content?: FetchedContent;
  error?: string;
  duration: number;
}

export interface FetcherInfo {
  name: string;
  maxSize: number | string;
  timeout: number | string;
  userAgent: string;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffFactor: number;
  retryOn: string[];
}

export interface ConnectivityResult {
  url: string;
  accessible: boolean;
  error?: string;
  testedFetchers: FetcherTestResult[];
}

export interface FetcherTestResult {
  fetcher: string;
  success: boolean;
  duration: number;
  error?: string;
}