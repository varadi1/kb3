/**
 * Main entry point for the Knowledge Base System
 * Provides convenient access to all system components
 */

// Main orchestrator and factory
export { KnowledgeBaseOrchestrator, ProcessingStats } from './orchestrator';
export { KnowledgeBaseFactory } from './factory';

// Configuration
export {
  KnowledgeBaseConfig,
  ProcessingOptionsConfig,
  createDefaultConfiguration,
  createProductionConfiguration,
  createDevelopmentConfiguration,
  createSqlConfiguration,
  validateConfiguration
} from './config';

// Core interfaces
export * from './interfaces';

// Component implementations
export * from './detectors';
export * from './fetchers';
export * from './processors';
export {
  BaseFileStorage,
  BaseKnowledgeStore,
  FileKnowledgeStore,
  LocalFileStorage,
  SqlKnowledgeStore,
  SqlUrlRepository
} from './storage';

// Utilities
export * from './utils';

// Import for the convenience function
import { KnowledgeBaseFactory } from './factory';
import { KnowledgeBaseConfig, createDefaultConfiguration } from './config';

// Convenience function for quick setup
export function createKnowledgeBase(config?: Partial<KnowledgeBaseConfig>) {
  if (config) {
    const fullConfig = createDefaultConfiguration(config);
    return KnowledgeBaseFactory.createKnowledgeBase(fullConfig);
  }
  return KnowledgeBaseFactory.createDefaultKnowledgeBase();
}