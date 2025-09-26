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

// Processors
import { ProcessorRegistry, createDefaultProcessorRegistry } from '../processors';

// Storage
import {
  BaseKnowledgeStore,
  MemoryKnowledgeStore,
  FileKnowledgeStore,
  LocalFileStorage
} from '../storage';

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

    return new KnowledgeBaseOrchestrator(
      urlDetector,
      contentFetcher,
      contentProcessor,
      knowledgeStore,
      fileStorage
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
  private static createContentFetcher(_config: KnowledgeBaseConfig): FetcherRegistry {
    const registry = createDefaultFetcherRegistry();

    // Configure retry settings
    registry.setRetryConfig({
      maxRetries: 3,
      retryDelay: 1000,
      backoffFactor: 2,
      retryOn: ['ECONNRESET', 'ENOTFOUND', 'TIMEOUT']
    });

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