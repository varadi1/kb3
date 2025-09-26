/**
 * Interface for detecting content changes at URLs
 * SOLID Principle: Interface Segregation - Focused solely on change detection
 */

/**
 * Result of a content change detection check
 */
export interface ContentChangeResult {
  hasChanged: boolean;
  previousHash?: string;
  currentHash: string;
  lastChecked?: Date;
  metadata?: {
    etag?: string;
    lastModified?: string;
    contentLength?: number;
  };
}

/**
 * Interface for content change detection
 * Single Responsibility: Detect if content at a URL has changed
 */
export interface IContentChangeDetector {
  /**
   * Check if content at a URL has changed since last check
   * @param url The URL to check
   * @param currentHash The hash of the current content
   * @param metadata Optional metadata like etag, last-modified headers
   * @returns Information about whether content has changed
   */
  hasContentChanged(
    url: string,
    currentHash: string,
    metadata?: Record<string, any>
  ): Promise<ContentChangeResult>;

  /**
   * Record that content was processed
   * @param url The URL that was processed
   * @param contentHash The hash of the processed content
   * @param metadata Optional metadata to store
   */
  recordContentProcessed(
    url: string,
    contentHash: string,
    metadata?: Record<string, any>
  ): Promise<void>;

  /**
   * Get the last known hash for a URL
   * @param url The URL to check
   * @returns The last known content hash, or null if never processed
   */
  getLastKnownHash(url: string): Promise<string | null>;

  /**
   * Clear the change history for a URL
   * @param url The URL to clear history for
   */
  clearHistory(url: string): Promise<void>;
}