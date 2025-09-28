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

import { KnowledgeBaseConfig, createSqlConfiguration } from '../config/Configuration';
import { KnowledgeBaseOrchestrator } from '../orchestrator/KnowledgeBaseOrchestrator';

// Detectors
import { UrlDetectorRegistry, createDefaultDetectorRegistry } from '../detectors';

// Fetchers
import { FetcherRegistry, createDefaultFetcherRegistry } from '../fetchers';
import { ScraperFactory } from '../scrapers/ScraperFactory';
import { ScraperAwareContentFetcher } from '../fetchers/ScraperAwareContentFetcher';

// Processors
import { ProcessorRegistry, createDefaultProcessorRegistry } from '../processors';

// Storage
import { LocalFileStorage } from '../storage';
import { SqlProcessedFileRepository } from '../storage/SqlProcessedFileRepository';
import { FileStorageWithTracking } from '../storage/FileStorageWithTracking';
import { ProcessedFileStorageWithTracking } from '../storage/ProcessedFileStorageWithTracking';
import { ContentProcessorWithCleaning } from '../processors/ContentProcessorWithCleaning';
import { ContentChangeDetector } from '../detectors/ContentChangeDetector';
import { UnifiedSqlStorage } from '../storage/UnifiedSqlStorage';
import { DatabaseMigration } from '../storage/DatabaseMigration';
import * as path from 'path';

/**
 * Extended configuration interface with all features
 */
export interface KnowledgeBaseConfigExtended extends KnowledgeBaseConfig {
  /**
   * Enable tag support for URL organization (always enabled now)
   */
  enableTags?: boolean;

  /**
   * Database path for tags (defaults to same as URL repository)
   */
  tagDbPath?: string;

  /**
   * Configuration for original file tracking (always enabled now)
   */
  storage: KnowledgeBaseConfig['storage'] & {
    originalFileStore?: {
      type?: 'sql';
      path?: string;
    };
  };
}

/**
 * Knowledge base with both file tracking and tag support
 */
export interface KnowledgeBaseWithFullFeatures extends KnowledgeBaseOrchestrator {
  // Both features are now integrated in the base orchestrator
}

export class KnowledgeBaseFactory {
  /**
   * Creates a fully configured knowledge base orchestrator with all features
   * Now includes tag support and file tracking by default
   * Supports unified storage for simpler database management
   * @param config System configuration
   * @returns Configured orchestrator with all features
   */
  static async createKnowledgeBase(
    config: KnowledgeBaseConfigExtended
  ): Promise<KnowledgeBaseWithFullFeatures> {
    // Always use unified storage (single database)
    // The legacy multi-database approach is deprecated
    return this.createUnifiedKnowledgeBase(config);
  }

  /**
   * Creates knowledge base with unified storage (single database)
   */
  private static async createUnifiedKnowledgeBase(
    config: KnowledgeBaseConfigExtended
  ): Promise<KnowledgeBaseWithFullFeatures> {
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
    const unifiedStorage = new UnifiedSqlStorage({
      dbPath: config.storage.unified!.dbPath,
      enableWAL: config.storage.unified!.enableWAL ?? true,
      enableForeignKeys: config.storage.unified!.enableForeignKeys ?? true,
      backupEnabled: config.storage.unified!.backupEnabled ?? false
    });
    await unifiedStorage.initialize();

    // Get repositories from unified storage
    const repositories = unifiedStorage.getRepositories();

    // Initialize processed file repository if enabled
    let processedFileStorage: any = null;
    if (config.storage.processedFileStore?.enabled) {
      const processedFilePath = config.storage.processedFileStore.path ||
        path.join(path.dirname(config.storage.unified!.dbPath), 'processed_files.db');

      try {
        const processedFileRepository = new SqlProcessedFileRepository(processedFilePath);
        await processedFileRepository.initialize();

        // Use configured file storage path or a path relative to the database
        const processedStoragePath = config.storage.fileStorage?.basePath ||
          path.join(path.dirname(config.storage.unified!.dbPath), 'processed');
        const baseProcessedStorage = new LocalFileStorage(processedStoragePath, false, false);
        processedFileStorage = new ProcessedFileStorageWithTracking(
          baseProcessedStorage,
          processedFileRepository
        );
      } catch (error) {
        console.warn('Could not initialize processed file repository:', error);
      }
    }

    // Create base components
    const urlDetector = this.createUrlDetector(config);
    const contentFetcher = this.createContentFetcher(config);
    const baseContentProcessor = this.createContentProcessor(config);

    // Wrap processor with cleaning capabilities if processed storage is available
    const contentProcessor = processedFileStorage ?
      new ContentProcessorWithCleaning(baseContentProcessor, undefined, processedFileStorage) :
      baseContentProcessor;

    // Create file storage with tracking
    const baseFileStorage = this.createFileStorage(config);
    const fileStorage = new FileStorageWithTracking(
      baseFileStorage,
      repositories.originalFileRepository
    );

    // Create content change detector
    const contentChangeDetector = new ContentChangeDetector(repositories.urlRepository);

    // Create orchestrator with unified repositories
    const orchestrator = new KnowledgeBaseOrchestrator(
      urlDetector,
      contentFetcher,
      contentProcessor,
      repositories.knowledgeStore,
      fileStorage,
      repositories.urlRepository as any,  // Cast to match expected type
      contentChangeDetector,
      repositories.originalFileRepository
    );

    return orchestrator as KnowledgeBaseWithFullFeatures;
  }

  /**
   * Perform automatic migration from multiple databases to unified
   */
  private static async performAutoMigration(config: KnowledgeBaseConfigExtended): Promise<void> {
    const fs = require('fs');

    // Check if any legacy databases exist
    const knowledgeDbPath = config.storage.knowledgeStore.dbPath;
    const urlsDbPath = config.storage.urlRepositoryPath || config.storage.knowledgeStore.urlDbPath;
    const originalFilesDbPath = config.storage.originalFileStore?.path;

    const hasLegacyDbs =
      (knowledgeDbPath && fs.existsSync(knowledgeDbPath)) ||
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
    if (fs.existsSync(config.storage.unified!.dbPath)) {
      if (config.logging.level === 'debug') {
        console.log('Unified database already exists, skipping migration');
      }
      return;
    }

    const migration = new DatabaseMigration({
      knowledgeDbPath: config.storage.knowledgeStore.dbPath,
      urlsDbPath: config.storage.urlRepositoryPath || config.storage.knowledgeStore.urlDbPath,
      originalFilesDbPath: config.storage.originalFileStore?.path,
      targetDbPath: config.storage.unified!.dbPath,
      backupOriginal: config.storage.unified!.migrationOptions?.backupOriginal ?? true,
      deleteOriginalAfterSuccess: config.storage.unified!.migrationOptions?.deleteOriginalAfterSuccess ?? false,
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
  private static createUrlDetector(config: KnowledgeBaseConfig): UrlDetectorRegistry {
    const registry = createDefaultDetectorRegistry();

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
  private static createContentFetcher(config: KnowledgeBaseConfig): FetcherRegistry | ScraperAwareContentFetcher {
    const registry = createDefaultFetcherRegistry();

    // Configure retry settings
    registry.setRetryConfig({
      maxRetries: 3,
      retryDelay: 1000,
      backoffFactor: 2,
      retryOn: ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT']
    });

    // If scraping is configured, wrap with ScraperAwareContentFetcher
    if (config.scraping && config.scraping.enabledScrapers && config.scraping.enabledScrapers.length > 0) {
      return ScraperFactory.createScraperAwareContentFetcher(registry, config);
    }

    return registry;
  }

  /**
   * Creates content processor based on configuration
   * @param config System configuration
   * @returns Content processor registry
   */
  private static createContentProcessor(_config: KnowledgeBaseConfig): ProcessorRegistry {
    return createDefaultProcessorRegistry();
  }

  /**
   * Creates file storage based on configuration
   * @param config System configuration
   * @returns File storage implementation
   */
  private static createFileStorage(config: KnowledgeBaseConfig): LocalFileStorage {
    const storageConfig = config.storage.fileStorage;

    return new LocalFileStorage(
      storageConfig.basePath,
      storageConfig.compressionEnabled,
      storageConfig.encryptionEnabled
    );
  }



  /**
   * Creates a knowledge base with default configuration (with all features)
   * @returns Knowledge base with default settings and all features
   */
  static async createDefaultKnowledgeBase(): Promise<KnowledgeBaseWithFullFeatures> {
    const { createDefaultConfiguration } = require('../config');
    const config = createDefaultConfiguration();
    return this.createKnowledgeBase(config);
  }

  /**
   * Creates a knowledge base for production use (with all features)
   * @returns Knowledge base with production settings and all features
   */
  static async createProductionKnowledgeBase(): Promise<KnowledgeBaseWithFullFeatures> {
    const { createProductionConfiguration } = require('../config');
    const config = createProductionConfiguration();
    return this.createKnowledgeBase(config);
  }

  /**
   * Creates a knowledge base for development use (with all features)
   * @returns Knowledge base with development settings and all features
   */
  static async createDevelopmentKnowledgeBase(): Promise<KnowledgeBaseWithFullFeatures> {
    const { createDevelopmentConfiguration } = require('../config');
    const config = createDevelopmentConfiguration();
    return this.createKnowledgeBase(config);
  }

  /**
   * Creates with default SQL configuration and all features
   */
  static async createDefault(): Promise<KnowledgeBaseWithFullFeatures> {
    const baseConfig = createSqlConfiguration();
    const defaultConfig: KnowledgeBaseConfigExtended = {
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
  static async createKnowledgeBaseWithTags(
    config: KnowledgeBaseConfigExtended
  ): Promise<KnowledgeBaseWithFullFeatures> {
    return this.createKnowledgeBase(config);
  }

  /**
   * Backward compatibility: Creates a knowledge base with file tracking
   * @deprecated Use createKnowledgeBase instead (file tracking is always included)
   */
  static async createKnowledgeBaseWithFileTracking(
    config: KnowledgeBaseConfigExtended
  ): Promise<KnowledgeBaseWithFullFeatures> {
    return this.createKnowledgeBase(config);
  }
}

/**
 * Backward compatibility export for KnowledgeBaseFactoryWithTags
 * @deprecated Use KnowledgeBaseFactory instead (tags are always included)
 */
export class KnowledgeBaseFactoryWithTags extends KnowledgeBaseFactory {}

/**
 * Backward compatibility export for KnowledgeBaseFactoryWithFileTracking
 * @deprecated Use KnowledgeBaseFactory instead (file tracking is always included)
 */
export class KnowledgeBaseFactoryWithFileTracking extends KnowledgeBaseFactory {}

/**
 * Backward compatibility type exports
 */
export type KnowledgeBaseConfigWithTags = KnowledgeBaseConfigExtended;
export type KnowledgeBaseConfigWithFileTracking = KnowledgeBaseConfigExtended;
export type KnowledgeBaseWithFileTracking = KnowledgeBaseWithFullFeatures;