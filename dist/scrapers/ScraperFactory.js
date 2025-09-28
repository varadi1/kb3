"use strict";
/**
 * Factory for creating and configuring scrapers
 * Factory Pattern: Creates scraper instances based on configuration
 * Dependency Inversion: Depends on abstractions (IScraper)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperFactory = void 0;
const ScraperRegistry_1 = require("./ScraperRegistry");
const ScraperSelector_1 = require("./ScraperSelector");
const HttpScraper_1 = require("./HttpScraper");
const PlaywrightScraper_1 = require("./PlaywrightScraper");
const Crawl4AIScraper_1 = require("./Crawl4AIScraper");
const DoclingScraper_1 = require("./DoclingScraper");
const DeepDoctectionScraper_1 = require("./DeepDoctectionScraper");
const ScraperAwareContentFetcher_1 = require("../fetchers/ScraperAwareContentFetcher");
const DomainRateLimiter_1 = require("./DomainRateLimiter");
const ScrapingErrorCollector_1 = require("./ScrapingErrorCollector");
class ScraperFactory {
    /**
     * Creates and configures scrapers based on configuration
     */
    static setupScrapers(config) {
        const registry = ScraperRegistry_1.ScraperRegistry.getInstance();
        const selector = new ScraperSelector_1.ScraperSelector(registry);
        // Clear existing registrations
        registry.clear();
        // Register enabled scrapers
        const enabledScrapers = config.scraping?.enabledScrapers || ['http'];
        for (const scraperName of enabledScrapers) {
            switch (scraperName) {
                case 'http':
                    registry.register('http', new HttpScraper_1.HttpScraper());
                    break;
                case 'playwright':
                    registry.register('playwright', new PlaywrightScraper_1.PlaywrightScraper());
                    break;
                case 'crawl4ai':
                    registry.register('crawl4ai', new Crawl4AIScraper_1.Crawl4AIScraper());
                    break;
                case 'docling':
                    registry.register('docling', new DoclingScraper_1.DoclingScraper());
                    break;
                case 'deepdoctection':
                    registry.register('deepdoctection', new DeepDoctectionScraper_1.DeepDoctectionScraper());
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
    static createScraperAwareContentFetcher(baseFetcher, config) {
        const { registry, selector } = ScraperFactory.setupScrapers(config);
        // Create rate limiter based on configuration
        const rateLimiter = ScraperFactory.createRateLimiter(config);
        // Create error collector based on configuration
        const errorCollector = ScraperFactory.createErrorCollector(config);
        const fetcher = new ScraperAwareContentFetcher_1.ScraperAwareContentFetcher(baseFetcher, selector, registry, undefined, // parameter manager will be created internally
        rateLimiter, errorCollector);
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
    static registerCustomScrapers(customScrapers) {
        const registry = ScraperRegistry_1.ScraperRegistry.getInstance();
        for (const { name, scraper } of customScrapers) {
            registry.register(name, scraper);
        }
    }
    /**
     * Creates a rate limiter based on configuration
     */
    static createRateLimiter(config) {
        const rateLimitConfig = config.scraping?.rateLimiting;
        return new DomainRateLimiter_1.DomainRateLimiter({
            enabled: rateLimitConfig?.enabled !== false,
            defaultIntervalMs: rateLimitConfig?.defaultIntervalMs || 1000,
            domainIntervals: new Map(Object.entries(rateLimitConfig?.domainIntervals || {}))
        });
    }
    /**
     * Creates an error collector based on configuration
     */
    static createErrorCollector(_config) {
        // Configuration could be used in the future for max errors, etc.
        return new ScrapingErrorCollector_1.ScrapingErrorCollector();
    }
}
exports.ScraperFactory = ScraperFactory;
//# sourceMappingURL=ScraperFactory.js.map