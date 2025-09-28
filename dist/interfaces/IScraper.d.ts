/**
 * Interface Segregation Principle: Focused interface for web scraping libraries
 * Single Responsibility Principle: Only responsible for scraping content from URLs
 * Dependency Inversion Principle: High-level modules depend on this abstraction
 */
import type { ScraperSpecificParameters } from './IScraperParameters';
export interface IScraper {
    /**
     * Gets the name of the scraping library
     * @returns The scraper library name
     */
    getName(): string;
    /**
     * Determines if this scraper can handle the given URL
     * @param url The URL to check
     * @returns True if the scraper can handle the URL
     */
    canHandle(url: string): boolean;
    /**
     * Scrapes content from the given URL
     * @param url The URL to scrape
     * @param options Optional scraping configuration
     * @returns Promise resolving to scraped content
     */
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    /**
     * Scrapes multiple URLs in batch
     * @param urls Array of URLs to scrape
     * @param options Optional scraping configuration
     * @returns Promise resolving to array of scraped content
     */
    scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]>;
    /**
     * Gets the supported features of this scraper
     * @returns The features supported by this scraper
     */
    getFeatures(): ScraperFeatures;
    /**
     * Sets scraper-specific parameters
     * @param params The scraper-specific parameters
     */
    setParameters?(params: ScraperSpecificParameters): void;
    /**
     * Gets current scraper parameters
     * @returns The current parameters or null
     */
    getParameters?(): ScraperSpecificParameters | null;
}
export interface ScraperOptions {
    timeout?: number;
    retries?: number;
    waitForSelector?: string;
    executeScript?: string;
    userAgent?: string;
    headers?: Record<string, string>;
    proxy?: string;
    screenshot?: boolean;
    cookies?: Array<{
        name: string;
        value: string;
        domain?: string;
    }>;
    scraperSpecific?: any;
    rateLimitMs?: number;
    skipRateLimit?: boolean;
    collectErrors?: boolean;
    errorContext?: string;
}
export interface ScrapedContent {
    url: string;
    content: Buffer;
    mimeType: string;
    metadata: ScrapedMetadata;
    scraperName: string;
    timestamp: Date;
}
export interface ScrapedMetadata {
    title?: string;
    statusCode?: number;
    headers?: Record<string, string>;
    cookies?: Array<{
        name: string;
        value: string;
    }>;
    redirectChain?: string[];
    loadTime?: number;
    screenshot?: Buffer;
    error?: string;
    scraperConfig?: ScraperSpecificParameters;
    scraperMetadata?: Record<string, any>;
    scrapingIssues?: {
        errors: Array<{
            timestamp: Date;
            message: string;
            severity: 'critical' | 'error' | 'recoverable';
            stack?: string;
        }>;
        warnings: Array<{
            timestamp: Date;
            message: string;
            severity: 'warning' | 'info';
        }>;
        summary: {
            errorCount: number;
            warningCount: number;
            criticalErrors: number;
        };
    };
    rateLimitInfo?: {
        waitedMs: number;
        domain: string;
        requestNumber: number;
    };
}
export interface ScraperFeatures {
    javascript: boolean;
    cookies: boolean;
    proxy: boolean;
    screenshot: boolean;
    pdfGeneration: boolean;
    multiPage: boolean;
}
export declare enum ScraperType {
    HTTP = "http",
    PLAYWRIGHT = "playwright",
    CRAWL4AI = "crawl4ai",
    DOCLING = "docling",
    DEEPDOCTECTION = "deepdoctection",
    CUSTOM = "custom"
}
//# sourceMappingURL=IScraper.d.ts.map