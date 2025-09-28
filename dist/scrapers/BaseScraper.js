"use strict";
/**
 * Base implementation for scrapers
 * Open/Closed Principle: Base class for extension
 * Template Method Pattern: Provides common functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseScraper = void 0;
class BaseScraper {
    name;
    features;
    parameters = null;
    constructor(name, features) {
        this.name = name;
        this.features = {
            javascript: false,
            cookies: false,
            proxy: false,
            screenshot: false,
            pdfGeneration: false,
            multiPage: false,
            ...features
        };
    }
    getName() {
        return this.name;
    }
    getFeatures() {
        return { ...this.features };
    }
    canHandle(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    /**
     * Sets scraper-specific parameters
     */
    setParameters(params) {
        this.parameters = params;
    }
    /**
     * Gets current scraper parameters
     */
    getParameters() {
        return this.parameters;
    }
    /**
     * Merges options with stored parameters
     */
    mergeOptions(options) {
        if (!options) {
            options = {};
        }
        // If we have stored parameters, merge them with options
        if (this.parameters) {
            options.scraperSpecific = {
                ...this.parameters,
                ...options.scraperSpecific
            };
        }
        return options;
    }
    /**
     * Default batch implementation - can be overridden for optimized batch processing
     */
    async scrapeBatch(urls, options) {
        const results = [];
        const mergedOptions = this.mergeOptions(options);
        const batchSize = this.getBatchSize(mergedOptions);
        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            const batchPromises = batch.map(url => this.scrapeWithErrorHandling(url, mergedOptions));
            const batchResults = await Promise.allSettled(batchPromises);
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    // Create error result
                    results.push(this.createErrorResult(urls[results.length], result.reason));
                }
            }
        }
        return results;
    }
    /**
     * Determines batch size based on scraper capabilities and configuration
     */
    getBatchSize(_options) {
        // Override in specific scrapers if they support different batch sizes
        return 5; // Default concurrent batch size
    }
    async scrapeWithErrorHandling(url, options) {
        try {
            return await this.scrape(url, options);
        }
        catch (error) {
            return this.createErrorResult(url, error);
        }
    }
    createErrorResult(url, error) {
        return {
            url,
            content: Buffer.from(''),
            mimeType: 'text/plain',
            metadata: {
                error: error?.message || 'Unknown error occurred',
                scraperConfig: this.parameters || undefined
            },
            scraperName: this.name,
            timestamp: new Date()
        };
    }
    validateOptions(options) {
        if (!options)
            return;
        if (options.timeout && options.timeout < 0) {
            throw new Error('Timeout must be non-negative');
        }
        if (options.retries && options.retries < 0) {
            throw new Error('Retries must be non-negative');
        }
    }
}
exports.BaseScraper = BaseScraper;
//# sourceMappingURL=BaseScraper.js.map