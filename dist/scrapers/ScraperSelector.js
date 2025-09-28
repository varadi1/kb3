"use strict";
/**
 * Single Responsibility: Selects appropriate scraper for URLs
 * Open/Closed Principle: Open for new selection strategies
 * Interface Segregation: Focused interface for scraper selection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DomainBasedSelectionStrategy = exports.ScraperSelector = void 0;
const ScraperRegistry_1 = require("./ScraperRegistry");
class ScraperSelector {
    rules = [];
    registry;
    fallbackStrategy;
    constructor(registry) {
        this.registry = registry || ScraperRegistry_1.ScraperRegistry.getInstance();
    }
    /**
     * Adds a selection rule for URL-to-scraper mapping
     * @param rule The selection rule
     */
    addRule(rule) {
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
    addRules(rules) {
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
    setScraperForUrls(urls, scraperName, priority) {
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
    removeRule(pattern) {
        const patternStr = pattern instanceof RegExp ? pattern.source : pattern;
        this.rules = this.rules.filter(rule => {
            const rulePattern = rule.pattern instanceof RegExp ? rule.pattern.source : rule.pattern;
            return rulePattern !== patternStr;
        });
    }
    /**
     * Clears all selection rules
     */
    clearRules() {
        this.rules = [];
    }
    /**
     * Gets all current rules
     */
    getRules() {
        return [...this.rules];
    }
    /**
     * Selects the appropriate scraper for a URL
     * @param url The URL to process
     * @returns The selected scraper or null
     */
    selectScraper(url) {
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
    selectScrapersForBatch(urls) {
        const result = new Map();
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
    groupUrlsByScaper(urls) {
        const groups = new Map();
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
    setFallbackStrategy(strategy) {
        this.fallbackStrategy = strategy;
    }
    matchesRule(url, rule) {
        if (typeof rule.pattern === 'string') {
            // Exact match or wildcard pattern
            if (rule.pattern.includes('*')) {
                const regexPattern = rule.pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*');
                return new RegExp(`^${regexPattern}$`).test(url);
            }
            return url === rule.pattern || url.includes(rule.pattern);
        }
        else {
            // RegExp pattern
            return rule.pattern.test(url);
        }
    }
    sortRulesByPriority() {
        this.rules.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    }
}
exports.ScraperSelector = ScraperSelector;
/**
 * Strategy for selecting scraper based on domain
 */
class DomainBasedSelectionStrategy {
    domainScraperMap = new Map();
    registry;
    constructor(registry) {
        this.registry = registry || ScraperRegistry_1.ScraperRegistry.getInstance();
    }
    setDomainScraper(domain, scraperName) {
        this.domainScraperMap.set(domain, scraperName);
    }
    selectScraper(url) {
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname;
            const scraperName = this.domainScraperMap.get(domain);
            if (scraperName) {
                return this.registry.get(scraperName) || null;
            }
        }
        catch {
            // Invalid URL
        }
        return null;
    }
}
exports.DomainBasedSelectionStrategy = DomainBasedSelectionStrategy;
//# sourceMappingURL=ScraperSelector.js.map