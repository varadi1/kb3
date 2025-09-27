/**
 * Single Responsibility: Manages registration and retrieval of scrapers
 * Open/Closed Principle: Open for extension (new scrapers), closed for modification
 * Dependency Inversion: Depends on IScraper abstraction
 */

import { IScraper } from '../interfaces/IScraper';

export class ScraperRegistry {
  private static instance: ScraperRegistry;
  private readonly scrapers: Map<string, IScraper> = new Map();
  private defaultScraperName?: string;

  private constructor() {}

  /**
   * Gets the singleton instance of the registry
   */
  static getInstance(): ScraperRegistry {
    if (!ScraperRegistry.instance) {
      ScraperRegistry.instance = new ScraperRegistry();
    }
    return ScraperRegistry.instance;
  }

  /**
   * Registers a scraper with the given name
   * @param name The unique name for the scraper
   * @param scraper The scraper implementation
   */
  register(name: string, scraper: IScraper): void {
    if (this.scrapers.has(name)) {
      throw new Error(`Scraper with name '${name}' is already registered`);
    }
    this.scrapers.set(name, scraper);
  }

  /**
   * Unregisters a scraper
   * @param name The name of the scraper to unregister
   */
  unregister(name: string): void {
    this.scrapers.delete(name);
    if (this.defaultScraperName === name) {
      this.defaultScraperName = undefined;
    }
  }

  /**
   * Gets a scraper by name
   * @param name The name of the scraper
   * @returns The scraper or undefined if not found
   */
  get(name: string): IScraper | undefined {
    return this.scrapers.get(name);
  }

  /**
   * Gets all registered scrapers
   * @returns Array of scraper entries
   */
  getAll(): Array<[string, IScraper]> {
    return Array.from(this.scrapers.entries());
  }

  /**
   * Gets all scraper names
   * @returns Array of scraper names
   */
  getNames(): string[] {
    return Array.from(this.scrapers.keys());
  }

  /**
   * Sets the default scraper
   * @param name The name of the scraper to use as default
   */
  setDefault(name: string): void {
    if (!this.scrapers.has(name)) {
      throw new Error(`Cannot set default: scraper '${name}' is not registered`);
    }
    this.defaultScraperName = name;
  }

  /**
   * Gets the default scraper
   * @returns The default scraper or undefined
   */
  getDefault(): IScraper | undefined {
    return this.defaultScraperName ? this.scrapers.get(this.defaultScraperName) : undefined;
  }

  /**
   * Checks if a scraper is registered
   * @param name The name to check
   * @returns True if registered
   */
  has(name: string): boolean {
    return this.scrapers.has(name);
  }

  /**
   * Clears all registered scrapers
   */
  clear(): void {
    this.scrapers.clear();
    this.defaultScraperName = undefined;
  }

  /**
   * Resets the singleton instance (useful for testing)
   */
  static reset(): void {
    ScraperRegistry.instance = new ScraperRegistry();
  }
}