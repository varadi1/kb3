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

export class ScraperSelector {
  private rules: ScraperSelectionRule[] = [];
  private readonly registry: ScraperRegistry;
  private fallbackStrategy?: ScraperSelectionStrategy;

  constructor(registry?: ScraperRegistry) {
    this.registry = registry || ScraperRegistry.getInstance();
  }

  /**
   * Adds a selection rule for URL-to-scraper mapping
   * @param rule The selection rule
   */
  addRule(rule: ScraperSelectionRule): void {
    this.rules.push({
      ...rule,
      priority: rule.priority ?? 0
    });
    this.sortRulesByPriority();
  }

  /**
   * Adds multiple selection rules in batch
   * @param rules Array of selection rules
   */
  addRules(rules: ScraperSelectionRule[]): void {
    for (const rule of rules) {
      this.addRule(rule);
    }
  }

  /**
   * Sets rules for a batch of URLs
   * @param urls Array of URLs or patterns
   * @param scraperName The scraper to use for these URLs
   * @param priority Optional priority
   */
  setScraperForUrls(urls: string[], scraperName: string, priority?: number): void {
    for (const url of urls) {
      this.addRule({
        pattern: url,
        scraperName,
        priority
      });
    }
  }

  /**
   * Removes a rule by pattern
   * @param pattern The pattern to remove
   */
  removeRule(pattern: RegExp | string): void {
    const patternStr = pattern instanceof RegExp ? pattern.source : pattern;
    this.rules = this.rules.filter(rule => {
      const rulePattern = rule.pattern instanceof RegExp ? rule.pattern.source : rule.pattern;
      return rulePattern !== patternStr;
    });
  }

  /**
   * Clears all selection rules
   */
  clearRules(): void {
    this.rules = [];
  }

  /**
   * Gets all current rules
   */
  getRules(): ScraperSelectionRule[] {
    return [...this.rules];
  }

  /**
   * Selects the appropriate scraper for a URL
   * @param url The URL to process
   * @returns The selected scraper or null
   */
  selectScraper(url: string): IScraper | null {
    // Check rules first
    for (const rule of this.rules) {
      if (this.matchesRule(url, rule)) {
        const scraper = this.registry.get(rule.scraperName);
        if (scraper && scraper.canHandle(url)) {
          return scraper;
        }
      }
    }

    // Try fallback strategy if set
    if (this.fallbackStrategy) {
      const scraper = this.fallbackStrategy.selectScraper(url);
      if (scraper) {
        return scraper;
      }
    }

    // Try default scraper
    const defaultScraper = this.registry.getDefault();
    if (defaultScraper && defaultScraper.canHandle(url)) {
      return defaultScraper;
    }

    // Try any scraper that can handle the URL
    for (const [_, scraper] of this.registry.getAll()) {
      if (scraper.canHandle(url)) {
        return scraper;
      }
    }

    return null;
  }

  /**
   * Selects scrapers for multiple URLs
   * @param urls Array of URLs
   * @returns Map of URL to scraper
   */
  selectScrapersForBatch(urls: string[]): Map<string, IScraper | null> {
    const result = new Map<string, IScraper | null>();
    for (const url of urls) {
      result.set(url, this.selectScraper(url));
    }
    return result;
  }

  /**
   * Groups URLs by their selected scraper for efficient batch processing
   * @param urls Array of URLs
   * @returns Map of scraper to URLs
   */
  groupUrlsByScaper(urls: string[]): Map<IScraper, string[]> {
    const groups = new Map<IScraper, string[]>();

    for (const url of urls) {
      const scraper = this.selectScraper(url);
      if (scraper) {
        const group = groups.get(scraper) || [];
        group.push(url);
        groups.set(scraper, group);
      }
    }

    return groups;
  }

  /**
   * Sets a fallback selection strategy
   * @param strategy The fallback strategy
   */
  setFallbackStrategy(strategy: ScraperSelectionStrategy): void {
    this.fallbackStrategy = strategy;
  }

  private matchesRule(url: string, rule: ScraperSelectionRule): boolean {
    if (typeof rule.pattern === 'string') {
      // Exact match or wildcard pattern
      if (rule.pattern.includes('*')) {
        const regexPattern = rule.pattern
          .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
          .replace(/\*/g, '.*');
        return new RegExp(`^${regexPattern}$`).test(url);
      }
      return url === rule.pattern || url.includes(rule.pattern);
    } else {
      // RegExp pattern
      return rule.pattern.test(url);
    }
  }

  private sortRulesByPriority(): void {
    this.rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }
}

/**
 * Strategy for selecting scraper based on domain
 */
export class DomainBasedSelectionStrategy implements ScraperSelectionStrategy {
  private domainScraperMap: Map<string, string> = new Map();
  private readonly registry: ScraperRegistry;

  constructor(registry?: ScraperRegistry) {
    this.registry = registry || ScraperRegistry.getInstance();
  }

  setDomainScraper(domain: string, scraperName: string): void {
    this.domainScraperMap.set(domain, scraperName);
  }

  selectScraper(url: string): IScraper | null {
    try {
      const urlObj = new URL(url);
      const domain = urlObj.hostname;

      const scraperName = this.domainScraperMap.get(domain);
      if (scraperName) {
        return this.registry.get(scraperName) || null;
      }
    } catch {
      // Invalid URL
    }
    return null;
  }
}