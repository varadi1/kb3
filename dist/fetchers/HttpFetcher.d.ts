/**
 * HTTP/HTTPS content fetcher
 * Single Responsibility: Fetches content from HTTP/HTTPS URLs
 */
import { BaseFetcher } from './BaseFetcher';
import { FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';
export declare class HttpFetcher extends BaseFetcher {
    private readonly maxRedirects;
    constructor(maxSize?: number, timeout?: number, _followRedirects?: boolean, maxRedirects?: number);
    canFetch(url: string): boolean;
    protected performFetch(url: string, options: FetchOptions): Promise<FetchedContent>;
    private makeRequest;
    private extractMimeType;
    private detectMimeTypeFromContentDisposition;
    private normalizeHeaders;
    private getRedirectCount;
    /**
     * Fetches only headers (HEAD request)
     * @param url The URL to fetch headers from
     * @param options Fetch options
     * @returns Promise resolving to headers
     */
    fetchHeaders(url: string, options?: FetchOptions): Promise<Record<string, string>>;
    private fetchHeadersWithPartialGet;
    /**
     * Checks if a URL is accessible without downloading content
     * @param url The URL to check
     * @param options Fetch options
     * @returns Promise resolving to accessibility status
     */
    isAccessible(url: string, options?: FetchOptions): Promise<boolean>;
}
//# sourceMappingURL=HttpFetcher.d.ts.map