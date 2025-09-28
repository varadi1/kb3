/**
 * Single Responsibility: Manages registration and retrieval of scrapers
 * Open/Closed Principle: Open for extension (new scrapers), closed for modification
 * Dependency Inversion: Depends on IScraper abstraction
 */
import { IScraper } from '../interfaces/IScraper';
export declare class ScraperRegistry {
    private static instance;
    private readonly scrapers;
    private defaultScraperName?;
    private constructor();
    /**
     * Gets the singleton instance of the registry
     */
    static getInstance(): ScraperRegistry;
    /**
     * Registers a scraper with the given name
     * @param name The unique name for the scraper
     * @param scraper The scraper implementation
     */
    register(name: string, scraper: IScraper): void;
    /**
     * Unregisters a scraper
     * @param name The name of the scraper to unregister
     */
    unregister(name: string): void;
    /**
     * Gets a scraper by name
     * @param name The name of the scraper
     * @returns The scraper or undefined if not found
     */
    get(name: string): IScraper | undefined;
    /**
     * Gets all registered scrapers
     * @returns Array of scraper entries
     */
    getAll(): Array<[string, IScraper]>;
    /**
     * Gets all scraper names
     * @returns Array of scraper names
     */
    getNames(): string[];
    /**
     * Sets the default scraper
     * @param name The name of the scraper to use as default
     */
    setDefault(name: string): void;
    /**
     * Gets the default scraper
     * @returns The default scraper or undefined
     */
    getDefault(): IScraper | undefined;
    /**
     * Checks if a scraper is registered
     * @param name The name to check
     * @returns True if registered
     */
    has(name: string): boolean;
    /**
     * Clears all registered scrapers
     */
    clear(): void;
    /**
     * Resets the singleton instance (useful for testing)
     */
    static reset(): void;
}
//# sourceMappingURL=ScraperRegistry.d.ts.map