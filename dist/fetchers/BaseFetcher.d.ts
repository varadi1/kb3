/**
 * Base class for content fetchers
 * Template Method Pattern + Single Responsibility Principle
 */
import { IContentFetcher, FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';
export declare abstract class BaseFetcher implements IContentFetcher {
    protected readonly maxSize: number;
    protected readonly timeout: number;
    protected readonly userAgent: string;
    constructor(maxSize?: number, timeout?: number);
    abstract canFetch(url: string): boolean;
    fetch(url: string, options?: FetchOptions): Promise<FetchedContent>;
    protected abstract performFetch(url: string, options: FetchOptions): Promise<FetchedContent>;
    protected mergeOptions(options: FetchOptions): FetchOptions;
    protected validateOptions(options: FetchOptions): void;
    protected validateUrl(url: string): URL;
    protected createFetchedContent(content: Buffer | string, mimeType: string, url: string, headers?: Record<string, string>, metadata?: Record<string, any>): FetchedContent;
    protected parseMimeType(contentType: string): string;
    protected checkContentSize(size: number, maxSize: number): void;
    /**
     * Gets the maximum content size this fetcher will handle
     * @returns Maximum content size in bytes
     */
    getMaxSize(): number;
    /**
     * Gets the default timeout for this fetcher
     * @returns Timeout in milliseconds
     */
    getTimeout(): number;
    /**
     * Gets the user agent string used by this fetcher
     * @returns User agent string
     */
    getUserAgent(): string;
}
//# sourceMappingURL=BaseFetcher.d.ts.map