/**
 * Placeholder for Firecrawl scraper implementation
 * Single Responsibility: Fast web scraping with Firecrawl API
 */
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent } from '../interfaces/IScraper';
export declare class FirecrawlScraper extends BaseScraper {
    private apiKey?;
    constructor(apiKey?: string);
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    canHandle(url: string): boolean;
}
//# sourceMappingURL=FirecrawlScraper.d.ts.map