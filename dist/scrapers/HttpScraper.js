"use strict";
/**
 * Adapter for existing HttpFetcher to work as IScraper
 * Adapter Pattern: Adapts HttpFetcher to IScraper interface
 * Single Responsibility: Only responsible for HTTP scraping
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpScraper = void 0;
const BaseScraper_1 = require("./BaseScraper");
const IScraper_1 = require("../interfaces/IScraper");
const HttpFetcher_1 = require("../fetchers/HttpFetcher");
class HttpScraper extends BaseScraper_1.BaseScraper {
    httpFetcher;
    constructor(httpFetcher) {
        super(IScraper_1.ScraperType.HTTP, {
            javascript: false,
            cookies: true,
            proxy: false,
            screenshot: false,
            pdfGeneration: false,
            multiPage: false
        });
        this.httpFetcher = httpFetcher || new HttpFetcher_1.HttpFetcher();
    }
    async scrape(url, options) {
        this.validateOptions(options);
        const startTime = Date.now();
        try {
            // Adapt scraper options to fetcher options
            const fetcherOptions = this.adaptOptions(options);
            // Use existing HttpFetcher
            const fetchedContent = await this.httpFetcher.fetch(url, fetcherOptions);
            // Convert to ScrapedContent
            const content = typeof fetchedContent.content === 'string'
                ? Buffer.from(fetchedContent.content)
                : fetchedContent.content;
            return {
                url,
                content,
                mimeType: fetchedContent.mimeType,
                metadata: {
                    statusCode: fetchedContent.metadata?.statusCode,
                    headers: fetchedContent.metadata?.headers,
                    cookies: this.extractCookies(fetchedContent.metadata?.headers),
                    redirectChain: fetchedContent.metadata?.redirectChain,
                    loadTime: Date.now() - startTime
                },
                scraperName: this.name,
                timestamp: new Date()
            };
        }
        catch (error) {
            throw new Error(`HTTP scraping failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    adaptOptions(options) {
        if (!options)
            return {};
        return {
            timeout: options.timeout,
            headers: options.headers,
            userAgent: options.userAgent,
            maxRetries: options.retries
        };
    }
    extractCookies(headers) {
        if (!headers || !headers['set-cookie']) {
            return undefined;
        }
        const cookies = [];
        const setCookieHeader = headers['set-cookie'];
        const cookieStrings = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
        for (const cookieString of cookieStrings) {
            const [nameValue] = cookieString.split(';');
            const [name, value] = nameValue.split('=');
            if (name && value) {
                cookies.push({ name: name.trim(), value: value.trim() });
            }
        }
        return cookies.length > 0 ? cookies : undefined;
    }
}
exports.HttpScraper = HttpScraper;
//# sourceMappingURL=HttpScraper.js.map