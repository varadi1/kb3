"use strict";
/**
 * Unified factory for creating knowledge base components with all features
 * Single Responsibility: Creates and wires up system components
 * Dependency Injection: Provides concrete implementations based on configuration
 *
 * Features included:
 * - Tag support for URL organization
 * - Original file tracking with repository
 * - Standard knowledge base functionality
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnowledgeBaseFactoryWithFileTracking = exports.KnowledgeBaseFactoryWithTags = exports.KnowledgeBaseFactory = void 0;
const Configuration_1 = require("../config/Configuration");
const KnowledgeBaseOrchestratorWithTags_1 = require("../orchestrator/KnowledgeBaseOrchestratorWithTags");
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
const SqlUrlRepositoryWithTags_1 = require("../storage/SqlUrlRepositoryWithTags");
const SqlOriginalFileRepository_1 = require("../storage/SqlOriginalFileRepository");
const FileStorageWithTracking_1 = require("../storage/FileStorageWithTracking");
const ContentChangeDetector_1 = require("../detectors/ContentChangeDetector");
const path = __importStar(require("path"));
class KnowledgeBaseFactory {
    /**
     * Creates a fully configured knowledge base orchestrator with all features
     * Now includes tag support and file tracking by default
     * @param config System configuration
     * @returns Configured orchestrator with all features
     */
    static async createKnowledgeBase(config) {
        // Initialize original file repository (always enabled now)
        const originalFilePath = config.storage.originalFileStore?.path ||
            path.join(path.dirname(config.storage.knowledgeStore.dbPath || config.storage.knowledgeStore.path || './data'), 'original_files.db');
        const originalFileRepository = new SqlOriginalFileRepository_1.SqlOriginalFileRepository(originalFilePath);
        await originalFileRepository.initialize();
        // Create base components
        const urlDetector = this.createUrlDetector(config);
        const contentFetcher = this.createContentFetcher(config);
        const contentProcessor = this.createContentProcessor(config);
        const knowledgeStore = this.createKnowledgeStore(config);
        // Create file storage with tracking (always enabled now)
        const baseFileStorage = this.createFileStorage(config);
        const fileStorage = new FileStorageWithTracking_1.FileStorageWithTracking(baseFileStorage, originalFileRepository);
        // Create URL repository with tags (always enabled now)
        const urlRepository = await this.createUrlRepositoryWithTags(config);
        const contentChangeDetector = this.createContentChangeDetector(config, urlRepository);
        // Create orchestrator with tags support
        const orchestrator = new KnowledgeBaseOrchestratorWithTags_1.KnowledgeBaseOrchestratorWithTags(urlDetector, contentFetcher, contentProcessor, knowledgeStore, fileStorage, urlRepository, contentChangeDetector);
        // Add the getOriginalFileRepository method to the orchestrator
        orchestrator.getOriginalFileRepository = () => originalFileRepository;
        return orchestrator;
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
            // Remove extension-based detector (implementation would need registry method)
        }
        return registry;
    }
    /**
     * Creates content fetcher based on configuration
     * @param config System configuration
     * @returns Content fetcher registry
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
    static createContentProcessor(_config) {
        return (0, processors_1.createDefaultProcessorRegistry)();
    }
    /**
     * Creates knowledge store based on configuration
     * @param config System configuration
     * @returns Knowledge store implementation
     */
    static createKnowledgeStore(config) {
        const storeConfig = config.storage.knowledgeStore;
        switch (storeConfig.type) {
            case 'file':
                if (!storeConfig.path) {
                    throw new Error('File knowledge store requires path configuration');
                }
                return new storage_1.FileKnowledgeStore(storeConfig.path, storeConfig.indexedFields, storeConfig.backupEnabled);
            case 'sql':
                return new SqlKnowledgeStore_1.SqlKnowledgeStore(storeConfig.dbPath || './data/knowledge.db');
            case 'memory':
            default:
                return new storage_1.MemoryKnowledgeStore(storeConfig.indexedFields);
        }
    }
    /**
     * Creates file storage based on configuration
     * @param config System configuration
     * @returns File storage implementation
     */
    static createFileStorage(config) {
        const storageConfig = config.storage.fileStorage;
        return new storage_1.LocalFileStorage(storageConfig.basePath, storageConfig.compressionEnabled, storageConfig.encryptionEnabled);
    }
    /**
     * Creates URL repository with tag support (always enabled now)
     * @param config System configuration
     * @returns URL repository with tags
     */
    static async createUrlRepositoryWithTags(config) {
        // Always create URL repository with tags when using SQL storage or URL tracking is enabled
        if (config.storage.knowledgeStore.type === 'sql' ||
            config.storage.enableDuplicateDetection ||
            config.storage.enableUrlTracking) {
            const dbPath = config.tagDbPath ||
                config.storage.urlRepositoryPath ||
                config.storage.knowledgeStore.urlDbPath ||
                './data/urls.db';
            const repository = new SqlUrlRepositoryWithTags_1.SqlUrlRepositoryWithTags(dbPath);
            await repository.initializeWithTags();
            return repository;
        }
        return undefined;
    }
    /**
     * Creates content change detector if enabled
     * @param config System configuration
     * @param urlRepository URL repository instance
     * @returns Content change detector or undefined
     */
    static createContentChangeDetector(config, urlRepository) {
        // Only create if we have a URL repository and change detection is enabled
        if (urlRepository && config.storage.enableDuplicateDetection !== false) {
            return new ContentChangeDetector_1.ContentChangeDetector(urlRepository);
        }
        return undefined;
    }
    /**
     * Creates a knowledge base with default configuration (with all features)
     * @returns Knowledge base with default settings and all features
     */
    static async createDefaultKnowledgeBase() {
        const { createDefaultConfiguration } = require('../config');
        const config = createDefaultConfiguration();
        return this.createKnowledgeBase(config);
    }
    /**
     * Creates a knowledge base for production use (with all features)
     * @returns Knowledge base with production settings and all features
     */
    static async createProductionKnowledgeBase() {
        const { createProductionConfiguration } = require('../config');
        const config = createProductionConfiguration();
        return this.createKnowledgeBase(config);
    }
    /**
     * Creates a knowledge base for development use (with all features)
     * @returns Knowledge base with development settings and all features
     */
    static async createDevelopmentKnowledgeBase() {
        const { createDevelopmentConfiguration } = require('../config');
        const config = createDevelopmentConfiguration();
        return this.createKnowledgeBase(config);
    }
    /**
     * Creates with default SQL configuration and all features
     */
    static async createDefault() {
        const baseConfig = (0, Configuration_1.createSqlConfiguration)();
        const defaultConfig = {
            ...baseConfig,
            storage: {
                ...baseConfig.storage,
                originalFileStore: {
                    type: 'sql',
                    path: path.join(process.cwd(), 'data', 'original_files.db')
                }
            }
        };
        return this.createKnowledgeBase(defaultConfig);
    }
    /**
     * Backward compatibility: Creates a knowledge base with tags support
     * @deprecated Use createKnowledgeBase instead (tags are always included)
     */
    static async createKnowledgeBaseWithTags(config) {
        return this.createKnowledgeBase(config);
    }
    /**
     * Backward compatibility: Creates a knowledge base with file tracking
     * @deprecated Use createKnowledgeBase instead (file tracking is always included)
     */
    static async createKnowledgeBaseWithFileTracking(config) {
        return this.createKnowledgeBase(config);
    }
}
exports.KnowledgeBaseFactory = KnowledgeBaseFactory;
/**
 * Backward compatibility export for KnowledgeBaseFactoryWithTags
 * @deprecated Use KnowledgeBaseFactory instead (tags are always included)
 */
class KnowledgeBaseFactoryWithTags extends KnowledgeBaseFactory {
}
exports.KnowledgeBaseFactoryWithTags = KnowledgeBaseFactoryWithTags;
/**
 * Backward compatibility export for KnowledgeBaseFactoryWithFileTracking
 * @deprecated Use KnowledgeBaseFactory instead (file tracking is always included)
 */
class KnowledgeBaseFactoryWithFileTracking extends KnowledgeBaseFactory {
}
exports.KnowledgeBaseFactoryWithFileTracking = KnowledgeBaseFactoryWithFileTracking;
//# sourceMappingURL=KnowledgeBaseFactory.js.map