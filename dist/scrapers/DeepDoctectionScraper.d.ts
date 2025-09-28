/**
 * Placeholder for DeepDoctection scraper implementation
 * Single Responsibility: Deep document analysis and extraction
 */
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent } from '../interfaces/IScraper';
export declare class DeepDoctectionScraper extends BaseScraper {
    constructor();
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    canHandle(url: string): boolean;
}
//# sourceMappingURL=DeepDoctectionScraper.d.ts.map