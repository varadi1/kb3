/**
 * Smart HTTP fetcher that handles JavaScript-based redirects
 * Single Responsibility: Extends HttpFetcher to handle non-standard redirects
 * Open/Closed Principle: Extends HttpFetcher without modifying it
 */
import { HttpFetcher } from './HttpFetcher';
import { FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';
export declare class SmartHttpFetcher extends HttpFetcher {
    private readonly jsRedirectPatterns;
    constructor(maxSize?: number, timeout?: number, followRedirects?: boolean, maxRedirects?: number);
    protected performFetch(url: string, options: FetchOptions): Promise<FetchedContent>;
    /**
     * Check if we received HTML content when we expected a binary file
     */
    private isUnexpectedHtml;
    /**
     * Extract file extension from URL
     */
    private getFileExtension;
    /**
     * Try to detect JavaScript redirect from HTML content
     */
    private detectJsRedirect;
    /**
     * Get known redirect URL based on patterns
     */
    private getKnownRedirectUrl;
    /**
     * Add a custom redirect pattern
     * This allows extending the fetcher with new patterns without modifying the class
     */
    addRedirectPattern(pattern: RegExp, transformer: (url: string) => string): void;
}
//# sourceMappingURL=SmartHttpFetcher.d.ts.map