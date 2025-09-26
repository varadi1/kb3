/**
 * Central export for all interfaces
 * Promotes Interface Segregation Principle by providing clean access to all contracts
 */

// Core interfaces
export * from './IUrlDetector';
export * from './IContentFetcher';
export * from './IContentProcessor';
export * from './IKnowledgeStore';
export * from './IFileStorage';
export * from './IOrchestrator';

// Common types and enums
export { ContentType } from './IUrlDetector';
export { ProcessingStatus, SortField, SortOrder } from './IKnowledgeStore';
export { FileSort, SortOrder as FileSortOrder } from './IFileStorage';
export { ProcessingStage, ErrorCode } from './IOrchestrator';