/**
 * Enhanced factory for creating knowledge base components with tag support
 * Open/Closed: Extends KnowledgeBaseFactory without modifying it
 * Dependency Injection: Provides tag-aware implementations when requested
 */

import { KnowledgeBaseConfig } from '../config/Configuration';
import { KnowledgeBaseOrchestratorWithTags } from '../orchestrator/KnowledgeBaseOrchestratorWithTags';
import { SqlUrlRepositoryWithTags } from '../storage/SqlUrlRepositoryWithTags';

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
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
import { ContentChangeDetector } from '../detectors/ContentChangeDetector';

export interface KnowledgeBaseConfigWithTags extends KnowledgeBaseConfig {
  /**
   * Enable tag support for URL organization
   */
  enableTags?: boolean;

  /**
   * Database path for tags (defaults to same as URL repository)
   */
  tagDbPath?: string;
}

export class KnowledgeBaseFactoryWithTags {
  /**
   * Creates a fully configured knowledge base orchestrator with tag support
   * @param config System configuration with tag support
   * @returns Configured orchestrator with tags
   */
  static createKnowledgeBaseWithTags(
    config: KnowledgeBaseConfigWithTags
  ): KnowledgeBaseOrchestratorWithTags {
    const urlDetector = this.createUrlDetector(config);
    const contentFetcher = this.createContentFetcher(config);
    const contentProcessor = this.createContentProcessor(config);
    const knowledgeStore = this.createKnowledgeStore(config);
    const fileStorage = this.createFileStorage(config);
    const urlRepository = this.createUrlRepositoryWithTags(config);
    const contentChangeDetector = this.createContentChangeDetector(config, urlRepository);

    return new KnowledgeBaseOrchestratorWithTags(
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
   * Creates URL repository with tag support
   * @param config System configuration
   * @returns URL repository with tags
   */
  private static createUrlRepositoryWithTags(
    config: KnowledgeBaseConfigWithTags
  ): SqlUrlRepositoryWithTags | undefined {
    if (!config.storage.enableUrlTracking) {
      return undefined;
    }

    const dbPath = config.tagDbPath || config.storage.urlRepositoryPath || './data/urls.db';
    return new SqlUrlRepositoryWithTags(dbPath);
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
      // Remove extension-based detector if needed
    }

    return registry;
  }

  /**
   * Creates content fetcher based on configuration
   * @param config System configuration
   * @returns Content fetcher
   */
  private static createContentFetcher(
    config: KnowledgeBaseConfig
  ): FetcherRegistry | ScraperAwareContentFetcher {
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
  private static createContentProcessor(config: KnowledgeBaseConfig): ProcessorRegistry {
    const registry = createDefaultProcessorRegistry();

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
  private static createKnowledgeStore(config: KnowledgeBaseConfig): BaseKnowledgeStore {
    const storeConfig = config.storage.knowledgeStore;

    switch (storeConfig.type) {
      case 'memory':
        return new MemoryKnowledgeStore();

      case 'file':
        return new FileKnowledgeStore(
          storeConfig.path || './data/knowledge'
        );

      case 'sql':
        return new SqlKnowledgeStore(storeConfig.path || './data/knowledge.db');

      default:
        // Default to memory store
        return new MemoryKnowledgeStore();
    }
  }

  /**
   * Creates file storage based on configuration
   * @param config System configuration
   * @returns File storage implementation
   */
  private static createFileStorage(config: KnowledgeBaseConfig): LocalFileStorage {
    return new LocalFileStorage(
      config.storage.fileStore?.path || config.storage.fileStorage?.basePath || './data/files'
    );
  }

  /**
   * Creates content change detector
   * @param config System configuration
   * @param urlRepository URL repository (if available)
   * @returns Content change detector
   */
  private static createContentChangeDetector(
    config: KnowledgeBaseConfig,
    urlRepository?: SqlUrlRepositoryWithTags
  ): IContentChangeDetector | undefined {
    if (!config.processing.skipUnchangedContent || !urlRepository) {
      return undefined;
    }

    return new ContentChangeDetector(urlRepository);
  }
}