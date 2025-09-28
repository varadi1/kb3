/**
 * Central export for all storage implementations
 * Facilitates easy import and dependency injection
 */
export { BaseKnowledgeStore } from './BaseKnowledgeStore';
export { MemoryKnowledgeStore, IndexStats } from './MemoryKnowledgeStore';
export { FileKnowledgeStore } from './FileKnowledgeStore';
export { SqlKnowledgeStore } from './SqlKnowledgeStore';
export { BaseFileStorage } from './BaseFileStorage';
export { LocalFileStorage } from './LocalFileStorage';
export { SqlUrlRepository } from './SqlUrlRepository';
export { SqlUrlRepositoryWithTags } from './SqlUrlRepositoryWithTags';
export { SqlTagManager } from './SqlTagManager';
export { SqlUrlTagRepository } from './SqlUrlTagRepository';
export { SqlOriginalFileRepository } from './SqlOriginalFileRepository';
import { BaseKnowledgeStore } from './BaseKnowledgeStore';
import { LocalFileStorage } from './LocalFileStorage';
export declare function createDefaultKnowledgeStore(storePath?: string): BaseKnowledgeStore;
export declare function createDefaultFileStorage(basePath: string): LocalFileStorage;
//# sourceMappingURL=index.d.ts.map