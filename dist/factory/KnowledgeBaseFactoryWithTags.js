"use strict";
/**
 * Enhanced factory for creating knowledge base components with tag support
 * Open/Closed: Extends KnowledgeBaseFactory without modifying it
 * Dependency Injection: Provides tag-aware implementations when requested
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseFactoryWithTags = void 0;
const KnowledgeBaseOrchestratorWithTags_1 = require("../orchestrator/KnowledgeBaseOrchestratorWithTags");
const SqlUrlRepositoryWithTags_1 = require("../storage/SqlUrlRepositoryWithTags");
// Detectors
const detectors_1 = require("../detectors");
// Fetchers
const fetchers_1 = require("../fetchers");
const ScraperFactory_1 = require("../scrapers/ScraperFactory");
// Processors
const processors_1 = require("../processors");
// Storage
const storage_1 = require("../storage");
const SqlKnowledgeStore_1 = require("../storage/SqlKnowledgeStore");
const ContentChangeDetector_1 = require("../detectors/ContentChangeDetector");
class KnowledgeBaseFactoryWithTags {
    /**
     * Creates a fully configured knowledge base orchestrator with tag support
     * @param config System configuration with tag support
     * @returns Configured orchestrator with tags
     */
    static createKnowledgeBaseWithTags(config) {
        const urlDetector = this.createUrlDetector(config);
        const contentFetcher = this.createContentFetcher(config);
        const contentProcessor = this.createContentProcessor(config);
        const knowledgeStore = this.createKnowledgeStore(config);
        const fileStorage = this.createFileStorage(config);
        const urlRepository = this.createUrlRepositoryWithTags(config);
        const contentChangeDetector = this.createContentChangeDetector(config, urlRepository);
        return new KnowledgeBaseOrchestratorWithTags_1.KnowledgeBaseOrchestratorWithTags(urlDetector, contentFetcher, contentProcessor, knowledgeStore, fileStorage, urlRepository, contentChangeDetector);
    }
    /**
     * Creates URL repository with tag support
     * @param config System configuration
     * @returns URL repository with tags
     */
    static createUrlRepositoryWithTags(config) {
        if (!config.storage.enableUrlTracking) {
            return undefined;
        }
        const dbPath = config.tagDbPath || config.storage.urlRepositoryPath || './data/urls.db';
        return new SqlUrlRepositoryWithTags_1.SqlUrlRepositoryWithTags(dbPath);
    }
    /**
     * Creates URL detector based on configuration
     * @param config System configuration
     * @returns URL detector registry
     */
    static createUrlDetector(config) {
        const registry = (0, detectors_1.createDefaultDetectorRegistry)();
        // Configure detectors based on config
        if (!config.detection.enableExtensionDetection) {
            // Remove extension-based detector if needed
        }
        return registry;
    }
    /**
     * Creates content fetcher based on configuration
     * @param config System configuration
     * @returns Content fetcher
     */
    static createContentFetcher(config) {
        const registry = (0, fetchers_1.createDefaultFetcherRegistry)();
        // Configure retry settings
        registry.setRetryConfig({
            maxRetries: 3,
            retryDelay: 1000,
            backoffFactor: 2,
            retryOn: ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT']
        });
        // If scraping is configured, wrap with ScraperAwareContentFetcher
        if (config.scraping && config.scraping.enabledScrapers && config.scraping.enabledScrapers.length > 0) {
            return ScraperFactory_1.ScraperFactory.createScraperAwareContentFetcher(registry, config);
        }
        return registry;
    }
    /**
     * Creates content processor based on configuration
     * @param config System configuration
     * @returns Content processor registry
     */
    static createContentProcessor(config) {
        const registry = (0, processors_1.createDefaultProcessorRegistry)();
        // Configure processors based on config
        if (config.processing.textExtraction) {
            // Enable text extraction processors
        }
        if (config.processing.metadataExtraction) {
            // Enable metadata extraction
        }
        return registry;
    }
    /**
     * Creates knowledge store based on configuration
     * @param config System configuration
     * @returns Knowledge store implementation
     */
    static createKnowledgeStore(config) {
        const storeConfig = config.storage.knowledgeStore;
        switch (storeConfig.type) {
            case 'memory':
                return new storage_1.MemoryKnowledgeStore();
            case 'file':
                return new storage_1.FileKnowledgeStore(storeConfig.path || './data/knowledge');
            case 'sql':
                return new SqlKnowledgeStore_1.SqlKnowledgeStore(storeConfig.path || './data/knowledge.db');
            default:
                // Default to memory store
                return new storage_1.MemoryKnowledgeStore();
        }
    }
    /**
     * Creates file storage based on configuration
     * @param config System configuration
     * @returns File storage implementation
     */
    static createFileStorage(config) {
        return new storage_1.LocalFileStorage(config.storage.fileStore?.path || config.storage.fileStorage?.basePath || './data/files');
    }
    /**
     * Creates content change detector
     * @param config System configuration
     * @param urlRepository URL repository (if available)
     * @returns Content change detector
     */
    static createContentChangeDetector(config, urlRepository) {
        if (!config.processing.skipUnchangedContent || !urlRepository) {
            return undefined;
        }
        return new ContentChangeDetector_1.ContentChangeDetector(urlRepository);
    }
}
exports.KnowledgeBaseFactoryWithTags = KnowledgeBaseFactoryWithTags;
//# sourceMappingURL=KnowledgeBaseFactoryWithTags.js.map