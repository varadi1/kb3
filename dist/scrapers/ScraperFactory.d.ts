/**
 * Factory for creating and configuring scrapers
 * Factory Pattern: Creates scraper instances based on configuration
 * Dependency Inversion: Depends on abstractions (IScraper)
 */
import { ScraperRegistry } from './ScraperRegistry';
import { ScraperSelector } from './ScraperSelector';
import { ScraperAwareContentFetcher } from '../fetchers/ScraperAwareContentFetcher';
import { IContentFetcher } from '../interfaces/IContentFetcher';
import { KnowledgeBaseConfig } from '../config/Configuration';
export declare class ScraperFactory {
    /**
     * Creates and configures scrapers based on configuration
     */
    static setupScrapers(config: KnowledgeBaseConfig): {
        registry: ScraperRegistry;
        selector: ScraperSelector;
    };
    /**
     * Creates a scraper-aware content fetcher
     */
    static createScraperAwareContentFetcher(baseFetcher: IContentFetcher, config: KnowledgeBaseConfig): ScraperAwareContentFetcher;
    /**
     * Registers custom scrapers
     */
    static registerCustomScrapers(customScrapers: Array<{
        name: string;
        scraper: any;
    }>): void;
    /**
     * Creates a rate limiter based on configuration
     */
    private static createRateLimiter;
    /**
     * Creates an error collector based on configuration
     */
    private static createErrorCollector;
}
//# sourceMappingURL=ScraperFactory.d.ts.map