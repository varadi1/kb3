/**
 * Interface for URL tracking and duplicate detection
 * Single Responsibility: Only manages URL tracking and deduplication
 * Interface Segregation: Focused interface for URL management
 */

export interface IUrlRepository {
  /**
   * Checks if a URL has already been processed
   * @param url The URL to check
   * @returns Promise resolving to true if URL exists, false otherwise
   */
  exists(url: string): Promise<boolean>;

  /**
   * Registers a URL as being processed
   * @param url The URL being processed
   * @param metadata Optional metadata for the URL
   * @returns Promise resolving to the URL record ID
   */
  register(url: string, metadata?: UrlMetadata): Promise<string>;

  /**
   * Updates the processing status of a URL
   * @param id The URL record ID
   * @param status The new processing status
   * @param error Optional error message if failed
   * @returns Promise resolving to success status
   */
  updateStatus(id: string, status: UrlStatus, error?: string): Promise<boolean>;

  /**
   * Gets information about a URL
   * @param url The URL to query
   * @returns Promise resolving to URL record or null if not found
   */
  getUrlInfo(url: string): Promise<UrlRecord | null>;

  /**
   * Gets URL by its hash (for content-based deduplication)
   * @param hash The content hash
   * @returns Promise resolving to URL record or null if not found
   */
  getByHash(hash: string): Promise<UrlRecord | null>;

  /**
   * Lists all URLs with optional filtering
   * @param filter Optional filter criteria
   * @returns Promise resolving to array of URL records
   */
  list(filter?: UrlFilter): Promise<UrlRecord[]>;

  /**
   * Removes a URL from the repository
   * @param id The URL record ID
   * @returns Promise resolving to success status
   */
  remove(id: string): Promise<boolean>;

  /**
   * Updates the content hash for a URL
   * @param id The URL record ID
   * @param contentHash The content hash
   * @returns Promise resolving to success status
   */
  updateHash(id: string, contentHash: string): Promise<boolean>;
}

export interface UrlRecord {
  id: string;
  url: string;
  normalizedUrl: string;
  contentHash?: string;
  status: UrlStatus;
  errorMessage?: string;
  firstSeen: Date;
  lastChecked: Date;
  processCount: number;
  metadata?: UrlMetadata;
}

export interface UrlMetadata {
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
  [key: string]: any;
}

export enum UrlStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped'
}

export interface UrlFilter {
  status?: UrlStatus;
  since?: Date;
  contentType?: string;
  limit?: number;
  offset?: number;
}