/**
 * Playwright scraper implementation with full parameter support
 * Single Responsibility: Browser automation scraping with Playwright
 */
import { BaseScraper } from './BaseScraper';
import { ScraperOptions, ScrapedContent } from '../interfaces/IScraper';
export declare class PlaywrightScraper extends BaseScraper {
    private browserInstance;
    private contextInstance;
    constructor();
    scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    private extractPlaywrightParams;
    private loadPlaywright;
    private getMockPlaywright;
    private launchBrowser;
    private createContext;
    private configurePage;
    private navigateToUrl;
    private waitForContent;
    private scrollToBottom;
    private clickElements;
    private extractContent;
    private buildMetadata;
    private takeScreenshot;
    private generatePDF;
    canHandle(url: string): boolean;
    /**
     * Optimized batch scraping for Playwright
     */
    scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]>;
    protected getBatchSize(options: ScraperOptions): number;
}
//# sourceMappingURL=PlaywrightScraper.d.ts.map