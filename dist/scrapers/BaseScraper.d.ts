/**
 * Base implementation for scrapers
 * Open/Closed Principle: Base class for extension
 * Template Method Pattern: Provides common functionality
 */
import { IScraper, ScraperOptions, ScrapedContent, ScraperFeatures } from '../interfaces/IScraper';
import type { ScraperSpecificParameters as ScraperParams } from '../interfaces/IScraperParameters';
export declare abstract class BaseScraper implements IScraper {
    protected readonly name: string;
    protected readonly features: ScraperFeatures;
    protected parameters: ScraperParams | null;
    constructor(name: string, features?: Partial<ScraperFeatures>);
    getName(): string;
    getFeatures(): ScraperFeatures;
    canHandle(url: string): boolean;
    abstract scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    /**
     * Sets scraper-specific parameters
     */
    setParameters(params: ScraperParams): void;
    /**
     * Gets current scraper parameters
     */
    getParameters(): ScraperParams | null;
    /**
     * Merges options with stored parameters
     */
    protected mergeOptions(options?: ScraperOptions): ScraperOptions;
    /**
     * Default batch implementation - can be overridden for optimized batch processing
     */
    scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]>;
    /**
     * Determines batch size based on scraper capabilities and configuration
     */
    protected getBatchSize(_options: ScraperOptions): number;
    protected scrapeWithErrorHandling(url: string, options?: ScraperOptions): Promise<ScrapedContent>;
    protected createErrorResult(url: string, error: any): ScrapedContent;
    protected validateOptions(options?: ScraperOptions): void;
}
//# sourceMappingURL=BaseScraper.d.ts.map