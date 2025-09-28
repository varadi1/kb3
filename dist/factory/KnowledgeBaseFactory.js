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
const KnowledgeBaseOrchestrator_1 = require("../orchestrator/KnowledgeBaseOrchestrator");
// Detectors
const detectors_1 = require("../detectors");
// Fetchers
const fetchers_1 = require("../fetchers");
const ScraperFactory_1 = require("../scrapers/ScraperFactory");
// Processors
const processors_1 = require("../processors");
// Storage
const storage_1 = require("../storage");
const SqlProcessedFileRepository_1 = require("../storage/SqlProcessedFileRepository");
const FileStorageWithTracking_1 = require("../storage/FileStorageWithTracking");
const ProcessedFileStorageWithTracking_1 = require("../storage/ProcessedFileStorageWithTracking");
const ContentProcessorWithCleaning_1 = require("../processors/ContentProcessorWithCleaning");
const ContentChangeDetector_1 = require("../detectors/ContentChangeDetector");
const UnifiedSqlStorage_1 = require("../storage/UnifiedSqlStorage");
const DatabaseMigration_1 = require("../storage/DatabaseMigration");
const path = __importStar(require("path"));
class KnowledgeBaseFactory {
    /**
     * Creates a fully configured knowledge base orchestrator with all features
     * Now includes tag support and file tracking by default
     * Supports unified storage for simpler database management
     * @param config System configuration
     * @returns Configured orchestrator with all features
     */
    static async createKnowledgeBase(config) {
        // Always use unified storage (single database)
        // The legacy multi-database approach is deprecated
        return this.createUnifiedKnowledgeBase(config);
    }
    /**
     * Creates knowledge base with unified storage (single database)
     */
    static async createUnifiedKnowledgeBase(config) {
        // Ensure unified configuration exists with defaults if not provided
        // This maintains backward compatibility with legacy configurations
        if (!config.storage.unified || !config.storage.unified.enabled) {
            // Set up unified configuration based on legacy settings
            config.storage.unified = {
                enabled: true,
                dbPath: config.storage.knowledgeStore?.dbPath || './data/unified.db',
                enableWAL: true,
                enableForeignKeys: true,
                backupEnabled: config.storage.knowledgeStore?.backupEnabled ?? false,
                autoMigrate: false // Don't auto-migrate for legacy configs
            };
        }
        // Perform auto-migration if configured
        if (config.storage.unified?.autoMigrate) {
            await this.performAutoMigration(config);
        }
        // Initialize unified storage
        const unifiedStorage = new UnifiedSqlStorage_1.UnifiedSqlStorage({
            dbPath: config.storage.unified.dbPath,
            enableWAL: config.storage.unified.enableWAL ?? true,
            enableForeignKeys: config.storage.unified.enableForeignKeys ?? true,
            backupEnabled: config.storage.unified.backupEnabled ?? false
        });
        await unifiedStorage.initialize();
        // Get repositories from unified storage
        const repositories = unifiedStorage.getRepositories();
        // Initialize processed file repository if enabled
        let processedFileStorage = null;
        if (config.storage.processedFileStore?.enabled) {
            const processedFilePath = config.storage.processedFileStore.path ||
                path.join(path.dirname(config.storage.unified.dbPath), 'processed_files.db');
            try {
                const processedFileRepository = new SqlProcessedFileRepository_1.SqlProcessedFileRepository(processedFilePath);
                await processedFileRepository.initialize();
                // Use configured file storage path or a path relative to the database
                const processedStoragePath = config.storage.fileStorage?.basePath ||
                    path.join(path.dirname(config.storage.unified.dbPath), 'processed');
                const baseProcessedStorage = new storage_1.LocalFileStorage(processedStoragePath, false, false);
                processedFileStorage = new ProcessedFileStorageWithTracking_1.ProcessedFileStorageWithTracking(baseProcessedStorage, processedFileRepository);
            }
            catch (error) {
                console.warn('Could not initialize processed file repository:', error);
            }
        }
        // Create base components
        const urlDetector = this.createUrlDetector(config);
        const contentFetcher = this.createContentFetcher(config);
        const baseContentProcessor = this.createContentProcessor(config);
        // Wrap processor with cleaning capabilities if processed storage is available
        const contentProcessor = processedFileStorage ?
            new ContentProcessorWithCleaning_1.ContentProcessorWithCleaning(baseContentProcessor, undefined, processedFileStorage) :
            baseContentProcessor;
        // Create file storage with tracking
        const baseFileStorage = this.createFileStorage(config);
        const fileStorage = new FileStorageWithTracking_1.FileStorageWithTracking(baseFileStorage, repositories.originalFileRepository);
        // Create content change detector
        const contentChangeDetector = new ContentChangeDetector_1.ContentChangeDetector(repositories.urlRepository);
        // Create orchestrator with unified repositories
        const orchestrator = new KnowledgeBaseOrchestrator_1.KnowledgeBaseOrchestrator(urlDetector, contentFetcher, contentProcessor, repositories.knowledgeStore, fileStorage, repositories.urlRepository, // Cast to match expected type
        contentChangeDetector, repositories.originalFileRepository);
        return orchestrator;
    }
    /**
     * Perform automatic migration from multiple databases to unified
     */
    static async performAutoMigration(config) {
        const fs = require('fs');
        // Check if any legacy databases exist
        const knowledgeDbPath = config.storage.knowledgeStore.dbPath;
        const urlsDbPath = config.storage.urlRepositoryPath || config.storage.knowledgeStore.urlDbPath;
        const originalFilesDbPath = config.storage.originalFileStore?.path;
        const hasLegacyDbs = (knowledgeDbPath && fs.existsSync(knowledgeDbPath)) ||
            (urlsDbPath && fs.existsSync(urlsDbPath)) ||
            (originalFilesDbPath && fs.existsSync(originalFilesDbPath));
        // Skip migration if no legacy databases exist
        if (!hasLegacyDbs) {
            if (config.logging.level === 'debug') {
                console.log('No legacy databases found, skipping migration');
            }
            return;
        }
        // Check if unified already exists
        if (fs.existsSync(config.storage.unified.dbPath)) {
            if (config.logging.level === 'debug') {
                console.log('Unified database already exists, skipping migration');
            }
            return;
        }
        const migration = new DatabaseMigration_1.DatabaseMigration({
            knowledgeDbPath: config.storage.knowledgeStore.dbPath,
            urlsDbPath: config.storage.urlRepositoryPath || config.storage.knowledgeStore.urlDbPath,
            originalFilesDbPath: config.storage.originalFileStore?.path,
            targetDbPath: config.storage.unified.dbPath,
            backupOriginal: config.storage.unified.migrationOptions?.backupOriginal ?? true,
            deleteOriginalAfterSuccess: config.storage.unified.migrationOptions?.deleteOriginalAfterSuccess ?? false,
            verbose: config.logging.level === 'debug'
        });
        const result = await migration.migrate();
        if (!result.success) {
            throw new Error(`Migration failed: ${result.errors.join(', ')}`);
        }
        if (config.logging.level === 'info' || config.logging.level === 'debug') {
            console.log(`Migration completed successfully. Migrated:
        - URLs: ${result.migratedTables.urls}
        - Tags: ${result.migratedTables.tags}
        - URL-Tags: ${result.migratedTables.urlTags}
        - Knowledge Entries: ${result.migratedTables.knowledgeEntries}
        - Original Files: ${result.migratedTables.originalFiles}`);
        }
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
     * Creates file storage based on configuration
     * @param config System configuration
     * @returns File storage implementation
     */
    static createFileStorage(config) {
        const storageConfig = config.storage.fileStorage;
        return new storage_1.LocalFileStorage(storageConfig.basePath, storageConfig.compressionEnabled, storageConfig.encryptionEnabled);
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