/**
 * Docling scraper implementation with full parameter support
 * Single Responsibility: Document extraction with IBM's Docling
 */
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent } from '../interfaces/IScraper';
export declare class DoclingScraper extends BaseScraper {
    private pythonBridge;
    private wrapperPath;
    private documentCache;
    constructor();
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    private extractDoclingParams;
    private buildDoclingOptions;
    private downloadDocument;
    private extractContent;
    private convertToMarkdown;
    private convertToHTML;
    private formatTable;
    private tableToMarkdown;
    private tableToCSV;
    private tableToHTML;
    private getMimeType;
    private buildMetadata;
    canHandle(url: string): boolean;
    /**
     * Batch processing for documents
     */
    scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]>;
    protected getBatchSize(options: ScraperOptions): number;
    /**
     * Clean up resources
     */
    cleanup(): Promise<void>;
}
//# sourceMappingURL=DoclingScraper.d.ts.map