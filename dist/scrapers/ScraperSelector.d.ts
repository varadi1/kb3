/**
 * Single Responsibility: Selects appropriate scraper for URLs
 * Open/Closed Principle: Open for new selection strategies
 * Interface Segregation: Focused interface for scraper selection
 */
import { IScraper } from '../interfaces/IScraper';
import { ScraperRegistry } from './ScraperRegistry';
export interface ScraperSelectionRule {
    pattern: RegExp | string;
    scraperName: string;
    priority?: number;
}
export interface ScraperSelectionStrategy {
    selectScraper(url: string): IScraper | null;
}
export declare class ScraperSelector {
    private rules;
    private readonly registry;
    private fallbackStrategy?;
    constructor(registry?: ScraperRegistry);
    /**
     * Adds a selection rule for URL-to-scraper mapping
     * @param rule The selection rule
     */
    addRule(rule: ScraperSelectionRule): void;
    /**
     * Adds multiple selection rules in batch
     * @param rules Array of selection rules
     */
    addRules(rules: ScraperSelectionRule[]): void;
    /**
     * Sets rules for a batch of URLs
     * @param urls Array of URLs or patterns
     * @param scraperName The scraper to use for these URLs
     * @param priority Optional priority
     */
    setScraperForUrls(urls: string[], scraperName: string, priority?: number): void;
    /**
     * Removes a rule by pattern
     * @param pattern The pattern to remove
     */
    removeRule(pattern: RegExp | string): void;
    /**
     * Clears all selection rules
     */
    clearRules(): void;
    /**
     * Gets all current rules
     */
    getRules(): ScraperSelectionRule[];
    /**
     * Selects the appropriate scraper for a URL
     * @param url The URL to process
     * @returns The selected scraper or null
     */
    selectScraper(url: string): IScraper | null;
    /**
     * Selects scrapers for multiple URLs
     * @param urls Array of URLs
     * @returns Map of URL to scraper
     */
    selectScrapersForBatch(urls: string[]): Map<string, IScraper | null>;
    /**
     * Groups URLs by their selected scraper for efficient batch processing
     * @param urls Array of URLs
     * @returns Map of scraper to URLs
     */
    groupUrlsByScaper(urls: string[]): Map<IScraper, string[]>;
    /**
     * Sets a fallback selection strategy
     * @param strategy The fallback strategy
     */
    setFallbackStrategy(strategy: ScraperSelectionStrategy): void;
    private matchesRule;
    private sortRulesByPriority;
}
/**
 * Strategy for selecting scraper based on domain
 */
export declare class DomainBasedSelectionStrategy implements ScraperSelectionStrategy {
    private domainScraperMap;
    private readonly registry;
    constructor(registry?: ScraperRegistry);
    setDomainScraper(domain: string, scraperName: string): void;
    selectScraper(url: string): IScraper | null;
}
//# sourceMappingURL=ScraperSelector.d.ts.map