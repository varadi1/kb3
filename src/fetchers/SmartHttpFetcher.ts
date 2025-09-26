/**
 * Smart HTTP fetcher that handles JavaScript-based redirects
 * Single Responsibility: Extends HttpFetcher to handle non-standard redirects
 * Open/Closed Principle: Extends HttpFetcher without modifying it
 */

import { HttpFetcher } from './HttpFetcher';
import { FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';

export class SmartHttpFetcher extends HttpFetcher {
  private readonly jsRedirectPatterns: Map<RegExp, (url: string) => string>;

  constructor(
    maxSize: number = 100 * 1024 * 1024,
    timeout: number = 30000,
    followRedirects: boolean = true,
    maxRedirects: number = 10
  ) {
    super(maxSize, timeout, followRedirects, maxRedirects);

    // Initialize known JavaScript redirect patterns
    this.jsRedirectPatterns = new Map([
      // file-examples.com pattern
      [
        /file-examples\.com\/wp-content\/storage\//,
        (url: string) => url.replace('file-examples.com/wp-content/storage/', 'file-examples.com/storage/fe185d2bd268d64e19968c4/')
      ]
    ]);
  }

  protected async performFetch(url: string, options: FetchOptions): Promise<FetchedContent> {
    // First check if URL matches known redirect patterns
    const knownRedirectUrl = this.getKnownRedirectUrl(url);
    if (knownRedirectUrl && knownRedirectUrl !== url) {
      try {
        // Try fetching from the known redirect URL directly
        return await super.performFetch(knownRedirectUrl, options);
      } catch (error) {
        // If known redirect fails, fall back to original URL
        console.warn(`Known redirect failed for ${knownRedirectUrl}, trying original URL`);
      }
    }

    // Try normal fetch
    const result = await super.performFetch(url, options);

    // Check if we got HTML when we expected something else based on file extension
    if (this.isUnexpectedHtml(url, result)) {
      // Try to detect and handle JavaScript redirect
      const redirectUrl = this.detectJsRedirect(url, result);
      if (redirectUrl && redirectUrl !== url) {
        // Fetch from the redirect URL
        return await super.performFetch(redirectUrl, options);
      }
    }

    return result;
  }

  /**
   * Check if we received HTML content when we expected a binary file
   */
  private isUnexpectedHtml(url: string, content: FetchedContent): boolean {
    const extension = this.getFileExtension(url);
    const binaryExtensions = ['doc', 'docx', 'xls', 'xlsx', 'pdf', 'zip', 'rar', 'ppt', 'pptx'];

    return binaryExtensions.includes(extension) &&
           (content.mimeType.includes('html') || content.mimeType === 'text/html');
  }

  /**
   * Extract file extension from URL
   */
  private getFileExtension(url: string): string {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  }

  /**
   * Try to detect JavaScript redirect from HTML content
   */
  private detectJsRedirect(url: string, content: FetchedContent): string | null {
    const html = content.content.toString('utf-8');

    // Check for file-examples.com specific redirect pattern
    if (url.includes('file-examples.com')) {
      // Look for the JavaScript redirect pattern in the HTML
      const jsRedirectMatch = html.match(/url\.replace\('([^']+)',\s*'([^']+)'\)/);
      if (jsRedirectMatch) {
        return url.replace(jsRedirectMatch[1], jsRedirectMatch[2]);
      }
    }

    // Check for meta refresh redirects
    const metaRefreshMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["']\d+;\s*url=([^"']+)/i);
    if (metaRefreshMatch) {
      const redirectUrl = metaRefreshMatch[1];
      return new URL(redirectUrl, url).href;
    }

    // Check for window.location redirects
    const locationMatch = html.match(/window\.location(?:\.href)?\s*=\s*["']([^"']+)["']/);
    if (locationMatch) {
      const redirectUrl = locationMatch[1];
      return new URL(redirectUrl, url).href;
    }

    return null;
  }

  /**
   * Get known redirect URL based on patterns
   */
  private getKnownRedirectUrl(url: string): string | null {
    for (const [pattern, transformer] of this.jsRedirectPatterns) {
      if (pattern.test(url)) {
        return transformer(url);
      }
    }
    return null;
  }

  /**
   * Add a custom redirect pattern
   * This allows extending the fetcher with new patterns without modifying the class
   */
  addRedirectPattern(pattern: RegExp, transformer: (url: string) => string): void {
    this.jsRedirectPatterns.set(pattern, transformer);
  }
}