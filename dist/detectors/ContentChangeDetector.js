"use strict";
/**
 * Content change detector implementation using URL repository
 * Single Responsibility: Detects if content at URLs has changed
 * Dependency Inversion: Depends on IUrlRepository abstraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentChangeDetector = void 0;
class ContentChangeDetector {
    urlRepository;
    constructor(urlRepository) {
        this.urlRepository = urlRepository;
    }
    /**
     * Check if content at a URL has changed since last check
     */
    async hasContentChanged(url, currentHash, metadata) {
        const urlInfo = await this.urlRepository.getUrlInfo(url);
        if (!urlInfo || !urlInfo.contentHash) {
            // Never processed before, so it's "new" content
            return {
                hasChanged: true,
                currentHash,
                metadata
            };
        }
        const hasChanged = urlInfo.contentHash !== currentHash;
        return {
            hasChanged,
            previousHash: urlInfo.contentHash,
            currentHash,
            lastChecked: urlInfo.lastChecked,
            metadata: {
                etag: metadata?.etag,
                lastModified: metadata?.lastModified,
                contentLength: metadata?.contentLength,
                ...metadata
            }
        };
    }
    /**
     * Record that content was processed
     */
    async recordContentProcessed(url, contentHash, metadata) {
        const urlInfo = await this.urlRepository.getUrlInfo(url);
        if (urlInfo) {
            // Update existing record with new hash
            await this.urlRepository.updateHash(urlInfo.id, contentHash);
        }
        else {
            // Register new URL with hash
            await this.urlRepository.register(url, {
                contentHash,
                ...metadata
            });
        }
    }
    /**
     * Get the last known hash for a URL
     */
    async getLastKnownHash(url) {
        const urlInfo = await this.urlRepository.getUrlInfo(url);
        return urlInfo?.contentHash || null;
    }
    /**
     * Clear the change history for a URL
     */
    async clearHistory(url) {
        const urlInfo = await this.urlRepository.getUrlInfo(url);
        if (urlInfo) {
            await this.urlRepository.remove(urlInfo.id);
        }
    }
}
exports.ContentChangeDetector = ContentChangeDetector;
//# sourceMappingURL=ContentChangeDetector.js.map