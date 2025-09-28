/**
 * Central export for all content fetchers
 * Facilitates easy import and dependency injection
 */
export { BaseFetcher } from './BaseFetcher';
export { HttpFetcher } from './HttpFetcher';
export { SmartHttpFetcher } from './SmartHttpFetcher';
export { FileFetcher } from './FileFetcher';
export { FetcherRegistry, FetchAttempt, FetcherInfo, RetryConfig, ConnectivityResult, FetcherTestResult } from './FetcherRegistry';
import { FetcherRegistry } from './FetcherRegistry';
export declare function createDefaultFetcherRegistry(): FetcherRegistry;
//# sourceMappingURL=index.d.ts.map