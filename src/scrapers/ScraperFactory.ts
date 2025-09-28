/**
 * Factory for creating and configuring scrapers
 * Factory Pattern: Creates scraper instances based on configuration
 * Dependency Inversion: Depends on abstractions (IScraper)
 */

import { ScraperRegistry } from './ScraperRegistry';
import { ScraperSelector } from './ScraperSelector';
import { HttpScraper } from './HttpScraper';
import { PlaywrightScraper } from './PlaywrightScraper';
import { Crawl4AIScraper } from './Crawl4AIScraper';
import { DoclingScraper } from './DoclingScraper';
import { DeepDoctectionScraper } from './DeepDoctectionScraper';
import { ScraperAwareContentFetcher } from '../fetchers/ScraperAwareContentFetcher';
import { IContentFetcher } from '../interfaces/IContentFetcher';
import { KnowledgeBaseConfig } from '../config/Configuration';
import { DomainRateLimiter } from './DomainRateLimiter';
import { ScrapingErrorCollector } from './ScrapingErrorCollector';
import { IRateLimiter } from '../interfaces/IRateLimiter';
import { IErrorCollector } from '../interfaces/IErrorCollector';

export class ScraperFactory {
  /**
   * Creates and configures scrapers based on configuration
   */
  static setupScrapers(config: KnowledgeBaseConfig): {
    registry: ScraperRegistry;
    selector: ScraperSelector;
  } {
    const registry = ScraperRegistry.getInstance();
    const selector = new ScraperSelector(registry);

    // Clear existing registrations
    registry.clear();

    // Register enabled scrapers
    const enabledScrapers = config.scraping?.enabledScrapers || ['http'];

    for (const scraperName of enabledScrapers) {

      switch (scraperName) {
        case 'http':
          registry.register('http', new HttpScraper());
          break;
        case 'playwright':
          registry.register('playwright', new PlaywrightScraper());
          break;
        case 'crawl4ai':
          registry.register('crawl4ai', new Crawl4AIScraper());
          break;
        case 'docling':
          registry.register('docling', new DoclingScraper());
          break;
        case 'deepdoctection':
          registry.register('deepdoctection', new DeepDoctectionScraper());
          break;
      }
    }

    // Set default scraper
    const defaultScraper = config.scraping?.defaultScraper || 'http';
    if (registry.has(defaultScraper)) {
      registry.setDefault(defaultScraper);
    }

    // Configure scraper rules
    const scraperRules = config.scraping?.scraperRules || [];
    for (const rule of scraperRules) {
      selector.addRule(rule);
    }

    return { registry, selector };
  }

  /**
   * Creates a scraper-aware content fetcher
   */
  static createScraperAwareContentFetcher(
    baseFetcher: IContentFetcher,
    config: KnowledgeBaseConfig
  ): ScraperAwareContentFetcher {
    const { registry, selector } = ScraperFactory.setupScrapers(config);

    // Create rate limiter based on configuration
    const rateLimiter = ScraperFactory.createRateLimiter(config);

    // Create error collector based on configuration
    const errorCollector = ScraperFactory.createErrorCollector(config);

    const fetcher = new ScraperAwareContentFetcher(
      baseFetcher,
      selector,
      registry,
      undefined, // parameter manager will be created internally
      rateLimiter,
      errorCollector
    );

    // Configure domain-specific rate limits if provided
    if (config.scraping?.rateLimiting?.domainIntervals) {
      for (const [domain, intervalMs] of Object.entries(config.scraping.rateLimiting.domainIntervals)) {
        fetcher.setDomainRateLimit(domain, intervalMs);
      }
    }

    return fetcher;
  }

  /**
   * Registers custom scrapers
   */
  static registerCustomScrapers(
    customScrapers: Array<{ name: string; scraper: any }>
  ): void {
    const registry = ScraperRegistry.getInstance();
    for (const { name, scraper } of customScrapers) {
      registry.register(name, scraper);
    }
  }

  /**
   * Creates a rate limiter based on configuration
   */
  private static createRateLimiter(config: KnowledgeBaseConfig): IRateLimiter {
    const rateLimitConfig = config.scraping?.rateLimiting;

    return new DomainRateLimiter({
      enabled: rateLimitConfig?.enabled !== false,
      defaultIntervalMs: rateLimitConfig?.defaultIntervalMs || 1000,
      domainIntervals: new Map(
        Object.entries(rateLimitConfig?.domainIntervals || {})
      )
    });
  }

  /**
   * Creates an error collector based on configuration
   */
  private static createErrorCollector(_config: KnowledgeBaseConfig): IErrorCollector {
    // Configuration could be used in the future for max errors, etc.
    return new ScrapingErrorCollector();
  }
}