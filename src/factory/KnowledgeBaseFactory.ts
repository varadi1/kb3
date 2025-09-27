/**
 * Factory for creating knowledge base components
 * Single Responsibility: Creates and wires up system components
 * Dependency Injection: Provides concrete implementations based on configuration
 */

import { KnowledgeBaseConfig } from '../config/Configuration';
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
import { SqlUrlRepository } from '../storage/SqlUrlRepository';
import { IUrlRepository } from '../interfaces/IUrlRepository';
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
import { ContentChangeDetector } from '../detectors/ContentChangeDetector';

export class KnowledgeBaseFactory {
  /**
   * Creates a fully configured knowledge base orchestrator
   * @param config System configuration
   * @returns Configured orchestrator
   */
  static createKnowledgeBase(config: KnowledgeBaseConfig): KnowledgeBaseOrchestrator {
    const urlDetector = this.createUrlDetector(config);
    const contentFetcher = this.createContentFetcher(config);
    const contentProcessor = this.createContentProcessor(config);
    const knowledgeStore = this.createKnowledgeStore(config);
    const fileStorage = this.createFileStorage(config);
    const urlRepository = this.createUrlRepository(config);
    const contentChangeDetector = this.createContentChangeDetector(config, urlRepository);

    return new KnowledgeBaseOrchestrator(
      urlDetector,
      contentFetcher,
      contentProcessor,
      knowledgeStore,
      fileStorage,
      urlRepository,
      contentChangeDetector
    );
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
   * Creates URL repository based on configuration
   * @param config System configuration
   * @returns URL repository implementation or undefined
   */
  private static createUrlRepository(config: KnowledgeBaseConfig): IUrlRepository | undefined {
    const storeConfig = config.storage.knowledgeStore;

    // Only create URL repository if using SQL storage or explicitly enabled
    if (storeConfig.type === 'sql' || config.storage.enableDuplicateDetection) {
      return new SqlUrlRepository(
        storeConfig.urlDbPath || './data/urls.db'
      );
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
   * Creates a knowledge base with default configuration
   * @returns Knowledge base with default settings
   */
  static createDefaultKnowledgeBase(): KnowledgeBaseOrchestrator {
    const { createDefaultConfiguration } = require('../config');
    const config = createDefaultConfiguration();
    return this.createKnowledgeBase(config);
  }

  /**
   * Creates a knowledge base for production use
   * @returns Knowledge base with production settings
   */
  static createProductionKnowledgeBase(): KnowledgeBaseOrchestrator {
    const { createProductionConfiguration } = require('../config');
    const config = createProductionConfiguration();
    return this.createKnowledgeBase(config);
  }

  /**
   * Creates a knowledge base for development use
   * @returns Knowledge base with development settings
   */
  static createDevelopmentKnowledgeBase(): KnowledgeBaseOrchestrator {
    const { createDevelopmentConfiguration } = require('../config');
    const config = createDevelopmentConfiguration();
    return this.createKnowledgeBase(config);
  }
}