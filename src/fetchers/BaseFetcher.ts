/**
 * Base class for content fetchers
 * Template Method Pattern + Single Responsibility Principle
 */

import { IContentFetcher, FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';

export abstract class BaseFetcher implements IContentFetcher {
  protected readonly maxSize: number;
  protected readonly timeout: number;
  protected readonly userAgent: string;

  constructor(maxSize: number = 100 * 1024 * 1024, timeout: number = 30000) {
    this.maxSize = maxSize;
    this.timeout = timeout;
    this.userAgent = 'KnowledgeBase-Fetcher/1.0';
  }

  abstract canFetch(url: string): boolean;

  async fetch(url: string, options: FetchOptions = {}): Promise<FetchedContent> {
    if (!this.canFetch(url)) {
      throw new Error(`Cannot handle URL: ${url}`);
    }

    const mergedOptions = this.mergeOptions(options);
    this.validateOptions(mergedOptions);

    try {
      return await this.performFetch(url, mergedOptions);
    } catch (error) {
      throw new Error(`Fetch failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  protected abstract performFetch(url: string, options: FetchOptions): Promise<FetchedContent>;

  protected mergeOptions(options: FetchOptions): FetchOptions {
    return {
      timeout: options.timeout || this.timeout,
      maxSize: options.maxSize || this.maxSize,
      followRedirects: options.followRedirects !== false,
      userAgent: options.userAgent || this.userAgent,
      headers: {
        'User-Agent': options.userAgent || this.userAgent,
        ...options.headers
      }
    };
  }

  protected validateOptions(options: FetchOptions): void {
    if (options.maxSize && options.maxSize <= 0) {
      throw new Error('maxSize must be positive');
    }

    if (options.timeout && options.timeout <= 0) {
      throw new Error('timeout must be positive');
    }
  }

  protected validateUrl(url: string): URL {
    try {
      return new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL format: ${url}`);
    }
  }

  protected createFetchedContent(
    content: Buffer | string,
    mimeType: string,
    url: string,
    headers: Record<string, string> = {},
    metadata: Record<string, any> = {}
  ): FetchedContent {
    const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');

    return {
      content: contentBuffer,
      mimeType,
      size: contentBuffer.length,
      headers,
      url,
      metadata: {
        ...metadata,
        fetchedAt: new Date(),
        fetcherClass: this.constructor.name
      }
    };
  }

  protected parseMimeType(contentType: string): string {
    return contentType.split(';')[0].trim().toLowerCase() || 'application/octet-stream';
  }

  protected checkContentSize(size: number, maxSize: number): void {
    if (size > maxSize) {
      throw new Error(`Content size ${size} exceeds maximum allowed size ${maxSize}`);
    }
  }

  /**
   * Gets the maximum content size this fetcher will handle
   * @returns Maximum content size in bytes
   */
  getMaxSize(): number {
    return this.maxSize;
  }

  /**
   * Gets the default timeout for this fetcher
   * @returns Timeout in milliseconds
   */
  getTimeout(): number {
    return this.timeout;
  }

  /**
   * Gets the user agent string used by this fetcher
   * @returns User agent string
   */
  getUserAgent(): string {
    return this.userAgent;
  }
}