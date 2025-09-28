"use strict";
/**
 * Content fetcher that integrates with the scraping system
 * Decorator Pattern: Enhances existing fetcher with scraper selection
 * Single Responsibility: Bridges ContentFetcher interface with Scraper system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScraperAwareContentFetcher = void 0;
const ScraperSelector_1 = require("../scrapers/ScraperSelector");
const ScraperRegistry_1 = require("../scrapers/ScraperRegistry");
const HttpScraper_1 = require("../scrapers/HttpScraper");
const ScraperParameterManager_1 = require("../scrapers/ScraperParameterManager");
const DomainRateLimiter_1 = require("../scrapers/DomainRateLimiter");
const ScrapingErrorCollector_1 = require("../scrapers/ScrapingErrorCollector");
class ScraperAwareContentFetcher {
    scraperSelector;
    scraperRegistry;
    fallbackFetcher;
    parameterManager;
    rateLimiter;
    errorCollector;
    constructor(fallbackFetcher, scraperSelector, scraperRegistry, parameterManager, rateLimiter, errorCollector) {
        this.fallbackFetcher = fallbackFetcher;
        this.scraperRegistry = scraperRegistry || ScraperRegistry_1.ScraperRegistry.getInstance();
        this.scraperSelector = scraperSelector || new ScraperSelector_1.ScraperSelector(this.scraperRegistry);
        this.parameterManager = parameterManager || new ScraperParameterManager_1.ScraperParameterManager();
        this.rateLimiter = rateLimiter || new DomainRateLimiter_1.DomainRateLimiter();
        this.errorCollector = errorCollector || new ScrapingErrorCollector_1.ScrapingErrorCollector();
        // Ensure HttpScraper is registered as default
        this.ensureDefaultScraper();
    }
    async fetch(url, options) {
        // Select appropriate scraper
        const scraper = this.scraperSelector.selectScraper(url);
        if (scraper) {
            // Apply URL-specific parameters if configured
            this.applyUrlParameters(scraper, url);
            // Use selected scraper with rate limiting and error collection
            return this.fetchWithScraper(scraper, url, options);
        }
        // Fallback to original fetcher
        return this.fallbackFetcher.fetch(url, options);
    }
    async fetchBatch(urls, options) {
        // Group URLs by scraper for efficient batch processing
        const scraperGroups = this.scraperSelector.groupUrlsByScaper(urls);
        const results = [];
        const processedUrls = new Set();
        // Process each scraper's batch
        for (const [scraper, scraperUrls] of scraperGroups) {
            const scraperOptions = this.adaptOptions(options);
            const scrapedContents = await scraper.scrapeBatch(scraperUrls, scraperOptions);
            for (const scrapedContent of scrapedContents) {
                results.push(this.convertToFetchedContent(scrapedContent));
                processedUrls.add(scrapedContent.url);
            }
        }
        // Process remaining URLs with fallback fetcher
        const remainingUrls = urls.filter(url => !processedUrls.has(url));
        if (remainingUrls.length > 0) {
            // Check if fallback fetcher has batch support
            if ('fetchBatch' in this.fallbackFetcher) {
                const fallbackResults = await this.fallbackFetcher.fetchBatch(remainingUrls, options);
                results.push(...fallbackResults);
            }
            else {
                // Fallback to sequential processing
                for (const url of remainingUrls) {
                    results.push(await this.fallbackFetcher.fetch(url, options));
                }
            }
        }
        return results;
    }
    canFetch(url) {
        // Check if any scraper can handle it
        const scraper = this.scraperSelector.selectScraper(url);
        if (scraper) {
            return true;
        }
        // Check fallback fetcher
        return this.fallbackFetcher.canFetch(url);
    }
    /**
     * Gets the scraper selector for configuration
     */
    getScraperSelector() {
        return this.scraperSelector;
    }
    /**
     * Gets the scraper registry for adding new scrapers
     */
    getScraperRegistry() {
        return this.scraperRegistry;
    }
    /**
     * Gets the parameter manager for configuring scraper parameters
     */
    getParameterManager() {
        return this.parameterManager;
    }
    /**
     * Sets parameters for a specific URL
     */
    setUrlParameters(url, config) {
        this.parameterManager.setParameters(url, config);
    }
    /**
     * Sets parameters for multiple URLs in batch
     */
    setBatchParameters(batch) {
        this.parameterManager.setBatchParameters(batch);
    }
    /**
     * Gets parameters for a specific URL
     */
    getUrlParameters(url) {
        return this.parameterManager.getParameters(url);
    }
    /**
     * Clears parameters for a URL or all URLs
     */
    clearParameters(url) {
        this.parameterManager.clearParameters(url);
    }
    /**
     * Sets rate limiting interval for a specific domain
     * @param domain The domain to configure
     * @param intervalMs Minimum interval between requests in milliseconds
     */
    setDomainRateLimit(domain, intervalMs) {
        this.rateLimiter.setDomainInterval(domain, intervalMs);
    }
    /**
     * Gets the current rate limiter for external configuration
     */
    getRateLimiter() {
        return this.rateLimiter;
    }
    /**
     * Gets the error collector for accessing scraping issues
     */
    getErrorCollector() {
        return this.errorCollector;
    }
    /**
     * Gets all scraping issues for a URL
     * @param url The URL to get issues for
     * @returns The scraping issues
     */
    getScrapingIssues(url) {
        return this.errorCollector.getIssues(url);
    }
    /**
     * Clears scraping issues for a URL or all URLs
     * @param url The URL to clear issues for, or undefined for all
     */
    clearScrapingIssues(url) {
        this.errorCollector.clearIssues(url);
    }
    async fetchWithScraper(scraper, url, options) {
        const domain = DomainRateLimiter_1.DomainRateLimiter.extractDomain(url);
        const scraperOptions = this.adaptOptions(options, url);
        const errorContext = scraperOptions.errorContext || url;
        let waitedMs = 0;
        try {
            // Apply rate limiting unless explicitly skipped
            if (!scraperOptions.skipRateLimit) {
                const startWait = Date.now();
                await this.rateLimiter.waitForDomain(domain);
                waitedMs = Date.now() - startWait;
                if (waitedMs > 0 && scraperOptions.collectErrors !== false) {
                    this.errorCollector.recordWarning(errorContext, `Rate limited: waited ${waitedMs}ms for domain ${domain}`, { domain, waitedMs });
                }
            }
            // Record the request
            this.rateLimiter.recordRequest(domain);
            // Scrape the content
            const scrapedContent = await scraper.scrape(url, scraperOptions);
            // Add rate limit info to metadata if we waited
            if (waitedMs > 0) {
                scrapedContent.metadata = scrapedContent.metadata || {};
                scrapedContent.metadata.rateLimitInfo = {
                    waitedMs,
                    domain,
                    requestNumber: this.rateLimiter.getStats(domain).requestCount
                };
            }
            // Add collected errors/warnings to metadata
            if (scraperOptions.collectErrors !== false) {
                const issues = this.errorCollector.getIssues(errorContext);
                if (issues.summary.errorCount > 0 || issues.summary.warningCount > 0) {
                    scrapedContent.metadata = scrapedContent.metadata || {};
                    scrapedContent.metadata.scrapingIssues = {
                        errors: issues.errors.map(e => ({
                            timestamp: e.timestamp,
                            message: e.message,
                            severity: e.severity,
                            stack: e.stack
                        })),
                        warnings: issues.warnings.map(w => ({
                            timestamp: w.timestamp,
                            message: w.message,
                            severity: w.severity
                        })),
                        summary: issues.summary
                    };
                }
            }
            return this.convertToFetchedContent(scrapedContent);
        }
        catch (error) {
            // Record the error
            if (scraperOptions.collectErrors !== false) {
                this.errorCollector.recordError(errorContext, error instanceof Error ? error : String(error), { scraper: scraper.getName(), url, domain });
            }
            throw error;
        }
    }
    /**
     * Applies URL-specific parameters to a scraper
     */
    applyUrlParameters(scraper, url) {
        const config = this.parameterManager.getParameters(url);
        if (config && scraper.setParameters) {
            scraper.setParameters(config.parameters);
        }
    }
    convertToFetchedContent(scrapedContent) {
        return {
            url: scrapedContent.url,
            content: scrapedContent.content,
            mimeType: scrapedContent.mimeType,
            size: scrapedContent.content.length,
            headers: scrapedContent.metadata?.headers || {},
            metadata: {
                statusCode: scrapedContent.metadata?.statusCode,
                headers: scrapedContent.metadata?.headers,
                etag: scrapedContent.metadata?.headers?.etag,
                lastModified: scrapedContent.metadata?.headers?.['last-modified'],
                contentLength: scrapedContent.content.length,
                redirectChain: scrapedContent.metadata?.redirectChain,
                scraperUsed: scrapedContent.scraperName,
                scraperConfig: scrapedContent.metadata?.scraperConfig,
                scraperMetadata: scrapedContent.metadata?.scraperMetadata
            }
        };
    }
    adaptOptions(options, url) {
        const base = options ? {
            timeout: options.timeout,
            headers: options.headers,
            userAgent: options.userAgent
        } : {};
        // Add URL-specific parameters if available
        if (url) {
            const config = this.parameterManager.getParameters(url);
            if (config) {
                base.scraperSpecific = config.parameters;
            }
        }
        return base;
    }
    ensureDefaultScraper() {
        if (!this.scraperRegistry.has('http')) {
            const httpScraper = new HttpScraper_1.HttpScraper(this.fallbackFetcher);
            this.scraperRegistry.register('http', httpScraper);
            this.scraperRegistry.setDefault('http');
        }
    }
}
exports.ScraperAwareContentFetcher = ScraperAwareContentFetcher;
//# sourceMappingURL=ScraperAwareContentFetcher.js.map