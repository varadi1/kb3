/**
 * Interface Segregation Principle: Focused interface for content fetching
 * Single Responsibility Principle: Only responsible for content retrieval
 */

export interface IContentFetcher {
  /**
   * Determines if this fetcher can fetch from the given URL
   * @param url The URL to check
   * @returns true if this fetcher can fetch from the URL
   */
  canFetch(url: string): boolean;

  /**
   * Fetches content from the given URL
   * @param url The URL to fetch content from
   * @param options Optional fetch configuration
   * @returns Promise resolving to fetched content
   */
  fetch(url: string, options?: FetchOptions): Promise<FetchedContent>;
}

export interface FetchOptions {
  timeout?: number;
  headers?: Record<string, string>;
  maxSize?: number;
  followRedirects?: boolean;
  userAgent?: string;
}

export interface FetchedContent {
  content: Buffer | string;
  mimeType: string;
  size: number;
  headers: Record<string, string>;
  url: string; // Final URL after redirects
  metadata: Record<string, any>;
}