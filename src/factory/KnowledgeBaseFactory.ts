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
import {
  BaseKnowledgeStore,
  MemoryKnowledgeStore,
  FileKnowledgeStore,
  LocalFileStorage
} from '../storage';
import { SqlKnowledgeStore } from '../storage/SqlKnowledgeStore';
import { SqlUrlRepositoryWithTags } from '../storage/SqlUrlRepositoryWithTags';
import { SqlOriginalFileRepository } from '../storage/SqlOriginalFileRepository';
import { FileStorageWithTracking } from '../storage/FileStorageWithTracking';
import { IUrlRepository } from '../interfaces/IUrlRepository';
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
import { ContentChangeDetector } from '../detectors/ContentChangeDetector';
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
   * @param config System configuration
   * @returns Configured orchestrator with all features
   */
  static async createKnowledgeBase(
    config: KnowledgeBaseConfigExtended
  ): Promise<KnowledgeBaseWithFullFeatures> {
    // Initialize original file repository (always enabled now)
    let originalFileRepository: any;
    const originalFilePath = config.storage.originalFileStore?.path ||
      path.join(
        path.dirname(config.storage.knowledgeStore.dbPath || config.storage.knowledgeStore.path || './data'),
        'original_files.db'
      );

    try {
      originalFileRepository = new SqlOriginalFileRepository(originalFilePath);
      await originalFileRepository.initialize();
    } catch (error) {
      // Log the error but continue - the original file tracking is optional
      console.warn('Could not initialize original file repository, continuing without file tracking:', error);
      // Create a null repository that does nothing
      originalFileRepository = {
        recordOriginalFile: async () => ({ id: 'null' }),
        getOriginalFile: async () => null,
        listOriginalFiles: async () => [],
        getOriginalFilesByUrl: async () => [],
        updateFileStatus: async () => true,
        updateFileAccessTime: async () => true,
        getFileStatistics: async () => ({ totalFiles: 0, byMimeType: {}, byStatus: {}, byScraper: {} }),
        clearOldFiles: async () => 0,
        close: async () => {}
      } as any;
    }

    // Create base components
    const urlDetector = this.createUrlDetector(config);
    const contentFetcher = this.createContentFetcher(config);
    const contentProcessor = this.createContentProcessor(config);
    const knowledgeStore = this.createKnowledgeStore(config);

    // Create file storage with tracking (always enabled now)
    const baseFileStorage = this.createFileStorage(config);
    const fileStorage = new FileStorageWithTracking(
      baseFileStorage,
      originalFileRepository
    );

    // Create URL repository with tags (always enabled now)
    const urlRepository = await this.createUrlRepositoryWithTags(config);
    const contentChangeDetector = this.createContentChangeDetector(config, urlRepository);

    // Create orchestrator with all features integrated
    const orchestrator = new KnowledgeBaseOrchestrator(
      urlDetector,
      contentFetcher,
      contentProcessor,
      knowledgeStore,
      fileStorage,
      urlRepository,
      contentChangeDetector,
      originalFileRepository  // File tracking support
    );

    return orchestrator as KnowledgeBaseWithFullFeatures;
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
   * Creates knowledge store based on configuration
   * @param config System configuration
   * @returns Knowledge store implementation
   */
  private static createKnowledgeStore(config: KnowledgeBaseConfig): BaseKnowledgeStore {
    const storeConfig = config.storage.knowledgeStore;

    switch (storeConfig.type) {
      case 'file':
        if (!storeConfig.path) {
          throw new Error('File knowledge store requires path configuration');
        }
        return new FileKnowledgeStore(
          storeConfig.path,
          storeConfig.indexedFields,
          storeConfig.backupEnabled
        );

      case 'sql':
        return new SqlKnowledgeStore(
          storeConfig.dbPath || './data/knowledge.db'
        );

      case 'memory':
      default:
        return new MemoryKnowledgeStore(storeConfig.indexedFields);
    }
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
   * Creates URL repository with tag support (always enabled now)
   * @param config System configuration
   * @returns URL repository with tags
   */
  private static async createUrlRepositoryWithTags(
    config: KnowledgeBaseConfigExtended
  ): Promise<SqlUrlRepositoryWithTags | undefined> {
    // Always create URL repository with tags when using SQL storage or URL tracking is enabled
    if (config.storage.knowledgeStore.type === 'sql' ||
        config.storage.enableDuplicateDetection ||
        config.storage.enableUrlTracking) {

      const dbPath = config.tagDbPath ||
                    config.storage.urlRepositoryPath ||
                    config.storage.knowledgeStore.urlDbPath ||
                    './data/urls.db';

      const repository = new SqlUrlRepositoryWithTags(dbPath);
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
  private static createContentChangeDetector(
    config: KnowledgeBaseConfig,
    urlRepository?: IUrlRepository
  ): IContentChangeDetector | undefined {
    // Only create if we have a URL repository and change detection is enabled
    if (urlRepository && config.storage.enableDuplicateDetection !== false) {
      return new ContentChangeDetector(urlRepository);
    }
    return undefined;
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