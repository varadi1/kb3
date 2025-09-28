"use strict";
/**
 * Base class for content fetchers
 * Template Method Pattern + Single Responsibility Principle
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFetcher = void 0;
class BaseFetcher {
    maxSize;
    timeout;
    userAgent;
    constructor(maxSize = 100 * 1024 * 1024, timeout = 30000) {
        this.maxSize = maxSize;
        this.timeout = timeout;
        this.userAgent = 'KnowledgeBase-Fetcher/1.0';
    }
    async fetch(url, options = {}) {
        if (!this.canFetch(url)) {
            throw new Error(`Cannot handle URL: ${url}`);
        }
        const mergedOptions = this.mergeOptions(options);
        this.validateOptions(mergedOptions);
        try {
            return await this.performFetch(url, mergedOptions);
        }
        catch (error) {
            throw new Error(`Fetch failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    mergeOptions(options) {
        return {
            timeout: options.timeout || this.timeout,
            maxSize: options.maxSize || this.maxSize,
            followRedirects: options.followRedirects !== false,
            userAgent: options.userAgent || this.userAgent,
            headers: {
                'User-Agent': options.userAgent || this.userAgent,
                ...options.headers
            }
        };
    }
    validateOptions(options) {
        if (options.maxSize && options.maxSize <= 0) {
            throw new Error('maxSize must be positive');
        }
        if (options.timeout && options.timeout <= 0) {
            throw new Error('timeout must be positive');
        }
    }
    validateUrl(url) {
        try {
            return new URL(url);
        }
        catch (error) {
            throw new Error(`Invalid URL format: ${url}`);
        }
    }
    createFetchedContent(content, mimeType, url, headers = {}, metadata = {}) {
        const contentBuffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
        return {
            content: contentBuffer,
            mimeType,
            size: contentBuffer.length,
            headers,
            url,
            metadata: {
                ...metadata,
                fetchedAt: new Date(),
                fetcherClass: this.constructor.name
            }
        };
    }
    parseMimeType(contentType) {
        return contentType.split(';')[0].trim().toLowerCase() || 'application/octet-stream';
    }
    checkContentSize(size, maxSize) {
        if (size > maxSize) {
            throw new Error(`Content size ${size} exceeds maximum allowed size ${maxSize}`);
        }
    }
    /**
     * Gets the maximum content size this fetcher will handle
     * @returns Maximum content size in bytes
     */
    getMaxSize() {
        return this.maxSize;
    }
    /**
     * Gets the default timeout for this fetcher
     * @returns Timeout in milliseconds
     */
    getTimeout() {
        return this.timeout;
    }
    /**
     * Gets the user agent string used by this fetcher
     * @returns User agent string
     */
    getUserAgent() {
        return this.userAgent;
    }
}
exports.BaseFetcher = BaseFetcher;
//# sourceMappingURL=BaseFetcher.js.map