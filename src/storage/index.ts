/**
 * Central export for all storage implementations
 * Facilitates easy import and dependency injection
 */

// Base classes
export { BaseKnowledgeStore } from './BaseKnowledgeStore';
export { BaseFileStorage } from './BaseFileStorage';

// Test-only storage implementation
export { MemoryKnowledgeStore } from './MemoryKnowledgeStore';

// SQL-based storage implementations
export { SqlKnowledgeStore } from './SqlKnowledgeStore';
export { UnifiedSqlStorage } from './UnifiedSqlStorage';

// File storage
export { LocalFileStorage } from './LocalFileStorage';

// URL Repository
export { SqlUrlRepository } from './SqlUrlRepository';
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

// Import UnifiedSqlStorage for the factory function
import { UnifiedSqlStorage } from './UnifiedSqlStorage';

// Factory function for creating default storage implementation
export function createDefaultKnowledgeStore(storePath?: string): UnifiedSqlStorage {
  return new UnifiedSqlStorage({
    dbPath: storePath || ':memory:'
  });
}

// Factory function for creating file storage
import { LocalFileStorage as LocalFileStorageClass } from './LocalFileStorage';
export function createDefaultFileStorage(basePath: string): LocalFileStorageClass {
  return new LocalFileStorageClass(basePath);
}