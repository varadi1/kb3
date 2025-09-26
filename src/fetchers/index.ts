/**
 * Central export for all content fetchers
 * Facilitates easy import and dependency injection
 */

export { BaseFetcher } from './BaseFetcher';
export { HttpFetcher } from './HttpFetcher';
export { SmartHttpFetcher } from './SmartHttpFetcher';
export { FileFetcher } from './FileFetcher';
export {
  FetcherRegistry,
  FetchAttempt,
  FetcherInfo,
  RetryConfig,
  ConnectivityResult,
  FetcherTestResult
} from './FetcherRegistry';

// Import required classes for the factory function
import { FetcherRegistry } from './FetcherRegistry';
import { SmartHttpFetcher } from './SmartHttpFetcher';
import { FileFetcher } from './FileFetcher';

// Factory function for creating default fetcher registry
export function createDefaultFetcherRegistry(): FetcherRegistry {
  const registry = new FetcherRegistry();

  // Add standard fetchers
  // Use SmartHttpFetcher instead of HttpFetcher to handle JavaScript redirects
  registry.addFetcher(new SmartHttpFetcher());
  registry.addFetcher(new FileFetcher());

  return registry;
}