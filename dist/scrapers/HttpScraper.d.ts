/**
 * Adapter for existing HttpFetcher to work as IScraper
 * Adapter Pattern: Adapts HttpFetcher to IScraper interface
 * Single Responsibility: Only responsible for HTTP scraping
 */
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent } from '../interfaces/IScraper';
import { IContentFetcher } from '../interfaces/IContentFetcher';
export declare class HttpScraper extends BaseScraper {
    private readonly httpFetcher;
    constructor(httpFetcher?: IContentFetcher);
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    private adaptOptions;
    private extractCookies;
}
//# sourceMappingURL=HttpScraper.d.ts.map