/**
 * Central export for all storage implementations
 * Facilitates easy import and dependency injection
 */

// Knowledge stores
export { BaseKnowledgeStore } from './BaseKnowledgeStore';
export { MemoryKnowledgeStore, IndexStats } from './MemoryKnowledgeStore';
export { FileKnowledgeStore } from './FileKnowledgeStore';
export { SqlKnowledgeStore } from './SqlKnowledgeStore';

// File storage
export { BaseFileStorage } from './BaseFileStorage';
export { LocalFileStorage } from './LocalFileStorage';

// URL Repository
export { SqlUrlRepository } from './SqlUrlRepository';
// SqlUrlRepositoryWithTags is now integrated into SqlUrlRepository
export { SqlUrlRepository as SqlUrlRepositoryWithTags } from './SqlUrlRepository'; // Backward compatibility
export { UrlMetadataWithTags, UrlRecordWithTags } from './SqlUrlRepository';

// Configuration Persistence
export { SqlConfigurationPersistence } from './SqlConfigurationPersistence';

// Tag Management
export { SqlTagManager } from './SqlTagManager';
export { SqlUrlTagRepository } from './SqlUrlTagRepository';

// Original File Repository
export { SqlOriginalFileRepository } from './SqlOriginalFileRepository';

// Processed File Repository and Storage
export { SqlProcessedFileRepository } from './SqlProcessedFileRepository';
export { ProcessedFileStorageWithTracking } from './ProcessedFileStorageWithTracking';
export { FileStorageWithTracking } from './FileStorageWithTracking';

// Import required classes for the factory functions
import { BaseKnowledgeStore } from './BaseKnowledgeStore';
import { MemoryKnowledgeStore } from './MemoryKnowledgeStore';
import { FileKnowledgeStore } from './FileKnowledgeStore';
import { LocalFileStorage } from './LocalFileStorage';

// Factory functions for creating default storage implementations
export function createDefaultKnowledgeStore(storePath?: string): BaseKnowledgeStore {
  if (storePath) {
    return new FileKnowledgeStore(storePath);
  }
  return new MemoryKnowledgeStore();
}

export function createDefaultFileStorage(basePath: string): LocalFileStorage {
  return new LocalFileStorage(basePath);
}