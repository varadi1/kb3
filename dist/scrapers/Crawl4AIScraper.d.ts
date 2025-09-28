/**
 * Crawl4AI scraper implementation with full parameter support
 * Single Responsibility: AI-powered web crawling with Crawl4AI
 */
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent } from '../interfaces/IScraper';
export declare class Crawl4AIScraper extends BaseScraper {
    private pythonBridge;
    private wrapperPath;
    private sessionCache;
    constructor();
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    private extractCrawl4AIParams;
    private buildCrawlerConfig;
    private buildCrawlConfig;
    private buildExtractionStrategy;
    private buildChunkingStrategy;
    private buildContentFilter;
    private mapCacheMode;
    private processContent;
    private buildMetadata;
    canHandle(url: string): boolean;
    /**
     * Optimized batch scraping for Crawl4AI
     */
    scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]>;
    protected getBatchSize(options: ScraperOptions): number;
    /**
     * Clean up session-based crawlers
     */
    cleanupSession(sessionId: string): Promise<void>;
    /**
     * Clean up all resources
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=Crawl4AIScraper.d.ts.map