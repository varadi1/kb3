/**
 * Content fetcher that integrates with the scraping system
 * Decorator Pattern: Enhances existing fetcher with scraper selection
 * Single Responsibility: Bridges ContentFetcher interface with Scraper system
 */
import { IContentFetcher, FetchedContent, FetchOptions } from '../interfaces/IContentFetcher';
import { ScraperSelector } from '../scrapers/ScraperSelector';
import { ScraperRegistry } from '../scrapers/ScraperRegistry';
import { ScraperParameterManager } from '../scrapers/ScraperParameterManager';
import { IRateLimiter } from '../interfaces/IRateLimiter';
import { IErrorCollector } from '../interfaces/IErrorCollector';
import type { ScraperConfiguration, BatchScraperConfiguration } from '../interfaces/IScraperParameters';
export declare class ScraperAwareContentFetcher implements IContentFetcher {
    private readonly scraperSelector;
    private readonly scraperRegistry;
    private readonly fallbackFetcher;
    private readonly parameterManager;
    private readonly rateLimiter;
    private readonly errorCollector;
    constructor(fallbackFetcher: IContentFetcher, scraperSelector?: ScraperSelector, scraperRegistry?: ScraperRegistry, parameterManager?: ScraperParameterManager, rateLimiter?: IRateLimiter, errorCollector?: IErrorCollector);
    fetch(url: string, options?: FetchOptions): Promise<FetchedContent>;
    fetchBatch(urls: string[], options?: FetchOptions): Promise<FetchedContent[]>;
    canFetch(url: string): boolean;
    /**
     * Gets the scraper selector for configuration
     */
    getScraperSelector(): ScraperSelector;
    /**
     * Gets the scraper registry for adding new scrapers
     */
    getScraperRegistry(): ScraperRegistry;
    /**
     * Gets the parameter manager for configuring scraper parameters
     */
    getParameterManager(): ScraperParameterManager;
    /**
     * Sets parameters for a specific URL
     */
    setUrlParameters(url: string, config: ScraperConfiguration): void;
    /**
     * Sets parameters for multiple URLs in batch
     */
    setBatchParameters(batch: BatchScraperConfiguration): void;
    /**
     * Gets parameters for a specific URL
     */
    getUrlParameters(url: string): ScraperConfiguration | null;
    /**
     * Clears parameters for a URL or all URLs
     */
    clearParameters(url?: string): void;
    /**
     * Sets rate limiting interval for a specific domain
     * @param domain The domain to configure
     * @param intervalMs Minimum interval between requests in milliseconds
     */
    setDomainRateLimit(domain: string, intervalMs: number): void;
    /**
     * Gets the current rate limiter for external configuration
     */
    getRateLimiter(): IRateLimiter;
    /**
     * Gets the error collector for accessing scraping issues
     */
    getErrorCollector(): IErrorCollector;
    /**
     * Gets all scraping issues for a URL
     * @param url The URL to get issues for
     * @returns The scraping issues
     */
    getScrapingIssues(url: string): any;
    /**
     * Clears scraping issues for a URL or all URLs
     * @param url The URL to clear issues for, or undefined for all
     */
    clearScrapingIssues(url?: string): void;
    private fetchWithScraper;
    /**
     * Applies URL-specific parameters to a scraper
     */
    private applyUrlParameters;
    private convertToFetchedContent;
    private adaptOptions;
    private ensureDefaultScraper;
}
//# sourceMappingURL=ScraperAwareContentFetcher.d.ts.map