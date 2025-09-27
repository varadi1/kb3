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