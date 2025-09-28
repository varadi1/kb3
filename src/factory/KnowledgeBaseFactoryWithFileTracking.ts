/**
 * Factory for creating knowledge base with original file tracking
 * Dependency Inversion Principle: Depends on abstractions, not concretions
 * Open/Closed Principle: Extends existing factory without modifying it
 */

import { KnowledgeBaseConfig, createSqlConfiguration } from '../config/Configuration';
import { KnowledgeBaseOrchestrator } from '../orchestrator/KnowledgeBaseOrchestrator';
import { SqlOriginalFileRepository } from '../storage/SqlOriginalFileRepository';
import { FileStorageWithTracking } from '../storage/FileStorageWithTracking';
import { KnowledgeBaseFactory } from './KnowledgeBaseFactory';
import { IOriginalFileRepository } from '../interfaces/IOriginalFileRepository';
import * as path from 'path';

export interface KnowledgeBaseConfigWithFileTracking extends KnowledgeBaseConfig {
  /**
   * Configuration for original file tracking
   */
  storage: KnowledgeBaseConfig['storage'] & {
    originalFileStore?: {
      type?: 'sql';
      path?: string;
    };
  };
}

export interface KnowledgeBaseWithFileTracking extends KnowledgeBaseOrchestrator {
  getOriginalFileRepository(): IOriginalFileRepository;
}

export class KnowledgeBaseFactoryWithFileTracking {
  /**
   * Creates a knowledge base with original file tracking capability
   * Wraps the file storage to track original files
   */
  static async createKnowledgeBaseWithFileTracking(
    config: KnowledgeBaseConfigWithFileTracking
  ): Promise<KnowledgeBaseWithFileTracking> {
    // Initialize original file repository
    const originalFilePath = config.storage.originalFileStore?.path ||
      path.join(
        path.dirname(config.storage.knowledgeStore.dbPath || config.storage.knowledgeStore.path || './data'),
        'original_files.db'
      );

    const originalFileRepository = new SqlOriginalFileRepository(originalFilePath);
    await originalFileRepository.initialize();

    // Create the standard knowledge base using the existing factory
    const standardKb = KnowledgeBaseFactory.createKnowledgeBase(config);

    // Get the file storage from the orchestrator (using type assertion to access private member)
    const originalFileStorage = (standardKb as any).fileStorage;

    // Wrap the file storage with tracking capability
    const fileStorageWithTracking = new FileStorageWithTracking(
      originalFileStorage,
      originalFileRepository
    );

    // Replace the file storage in the orchestrator
    (standardKb as any).fileStorage = fileStorageWithTracking;

    // Add the getOriginalFileRepository method to the orchestrator
    (standardKb as any).getOriginalFileRepository = () => originalFileRepository;

    return standardKb as KnowledgeBaseWithFileTracking;
  }

  /**
   * Creates with default SQL configuration
   */
  static async createDefault(): Promise<KnowledgeBaseWithFileTracking> {
    const baseConfig = createSqlConfiguration();
    const defaultConfig: KnowledgeBaseConfigWithFileTracking = {
      ...baseConfig,
      storage: {
        ...baseConfig.storage,
        originalFileStore: {
          type: 'sql',
          path: path.join(process.cwd(), 'data', 'original_files.db')
        }
      }
    };

    return this.createKnowledgeBaseWithFileTracking(defaultConfig);
  }
}