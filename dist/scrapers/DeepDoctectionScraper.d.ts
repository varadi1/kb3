/**
 * DeepDoctection scraper implementation with Python bridge
 * Single Responsibility: Deep document analysis and extraction using ML models
 */
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent } from '../interfaces/IScraper';
export declare class DeepDoctectionScraper extends BaseScraper {
    private pythonBridge;
    private wrapperPath;
    constructor();
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    private extractDeepDoctectionParams;
    private buildDeepDoctectionOptions;
    private extractContent;
    private convertToMarkdown;
    private convertToHTML;
    private buildMetadata;
    private getMimeType;
    canHandle(url: string): boolean;
}
//# sourceMappingURL=DeepDoctectionScraper.d.ts.map