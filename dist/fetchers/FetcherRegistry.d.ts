/**
 * Registry for content fetchers
 * Single Responsibility: Manages and coordinates multiple fetchers
 * Open/Closed Principle: Easy to add new fetchers
 * Dependency Inversion: Depends on IContentFetcher abstraction
 */
import { IContentFetcher, FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';
export declare class FetcherRegistry implements IContentFetcher {
    private readonly fetchers;
    private readonly retryConfig;
    constructor(fetchers?: IContentFetcher[], retryConfig?: Partial<RetryConfig>);
    /**
     * Checks if any fetcher can handle the URL
     * @param url The URL or path to check
     * @returns true if at least one fetcher can handle it
     */
    canFetch(url: string): boolean;
    /**
     * Adds a new fetcher to the registry
     * @param fetcher The fetcher to add
     */
    addFetcher(fetcher: IContentFetcher): void;
    /**
     * Removes a fetcher from the registry
     * @param fetcher The fetcher to remove
     */
    removeFetcher(fetcher: IContentFetcher): boolean;
    /**
     * Fetches content using the first available fetcher
     * @param url The URL to fetch
     * @param options Fetch options
     * @returns Promise resolving to fetched content
     */
    fetch(url: string, options?: FetchOptions): Promise<FetchedContent>;
    /**
     * Attempts to fetch using all capable fetchers and returns results
     * @param url The URL to fetch
     * @param options Fetch options
     * @returns Promise resolving to array of fetch attempts
     */
    fetchAll(url: string, options?: FetchOptions): Promise<FetchAttempt[]>;
    /**
     * Fetches content with retry logic
     * @param fetcher The fetcher to use
     * @param url The URL to fetch
     * @param options Fetch options
     * @returns Promise resolving to fetched content
     */
    private fetchWithRetry;
    /**
     * Determines if an error should trigger a retry
     * @param error The error to check
     * @returns true if the error is retryable
     */
    private shouldRetry;
    /**
     * Sleeps for the specified duration
     * @param ms Milliseconds to sleep
     * @returns Promise that resolves after the delay
     */
    private sleep;
    /**
     * Gets information about registered fetchers
     * @returns Array of fetcher information
     */
    getFetcherInfo(): FetcherInfo[];
    /**
     * Gets count of registered fetchers
     * @returns Number of registered fetchers
     */
    getFetcherCount(): number;
    /**
     * Gets retry configuration
     * @returns Current retry configuration
     */
    getRetryConfig(): RetryConfig;
    /**
     * Updates retry configuration
     * @param config New retry configuration
     */
    setRetryConfig(config: Partial<RetryConfig>): void;
    /**
     * Clears all registered fetchers
     */
    clear(): void;
    /**
     * Tests connectivity to a URL using available fetchers
     * @param url The URL to test
     * @param options Fetch options
     * @returns Promise resolving to connectivity status
     */
    testConnectivity(url: string, options?: FetchOptions): Promise<ConnectivityResult>;
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
//# sourceMappingURL=FetcherRegistry.d.ts.map