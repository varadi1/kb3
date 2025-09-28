/**
 * Main entry point for the Knowledge Base System
 * Provides convenient access to all system components
 */
export { KnowledgeBaseOrchestrator, ProcessingStats } from './orchestrator';
export { KnowledgeBaseFactory } from './factory';
export { KnowledgeBaseConfig, ProcessingOptionsConfig, createDefaultConfiguration, createProductionConfiguration, createDevelopmentConfiguration, createSqlConfiguration, validateConfiguration } from './config';
export * from './interfaces';
export * from './detectors';
export * from './fetchers';
export * from './processors';
export { BaseFileStorage, BaseKnowledgeStore, FileKnowledgeStore, LocalFileStorage, SqlKnowledgeStore, SqlUrlRepository } from './storage';
export * from './utils';
import { KnowledgeBaseConfig } from './config';
export declare function createKnowledgeBase(config?: Partial<KnowledgeBaseConfig>): Promise<import("./factory").KnowledgeBaseWithFullFeatures>;
//# sourceMappingURL=index.d.ts.map