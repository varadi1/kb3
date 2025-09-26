/**
 * Interface Segregation Principle: Focused interface for orchestration
 * Single Responsibility Principle: Only responsible for coordinating the processing pipeline
 */

import { ProcessingOptions } from './IContentProcessor';

export { ProcessingOptions };

export interface IOrchestrator {
  /**
   * Processes a single URL through the entire pipeline
   * @param url The URL to process
   * @param options Optional processing configuration
   * @returns Promise resolving to processing result
   */
  processUrl(url: string, options?: ProcessingOptions): Promise<ProcessingResult>;

  /**
   * Processes multiple URLs concurrently
   * @param urls Array of URLs to process
   * @param options Optional processing configuration
   * @returns Promise resolving to processing results
   */
  processUrls(urls: string[], options?: ProcessingOptions): Promise<ProcessingResult[]>;

  /**
   * Reprocesses an existing knowledge entry
   * @param entryId The knowledge entry ID
   * @param options Optional processing configuration
   * @returns Promise resolving to processing result
   */
  reprocessEntry(entryId: string, options?: ProcessingOptions): Promise<ProcessingResult>;

  /**
   * Gets processing status for ongoing operations
   * @returns Promise resolving to current processing status
   */
  getStatus(): Promise<ProcessingStatus>;
}

export interface ProcessingResult {
  success: boolean;
  entryId?: string;
  url: string;
  contentType?: string;
  error?: ProcessingError;
  metadata: Record<string, any>;
  processingTime: number;
  storagePath?: string;
}

export interface ProcessingStatus {
  totalProcessing: number;
  completed: number;
  failed: number;
  pending: number;
  currentOperations: CurrentOperation[];
}

export interface CurrentOperation {
  url: string;
  stage: ProcessingStage;
  startedAt: Date;
  progress?: number;
}

export enum ProcessingStage {
  DETECTING = 'detecting',
  FETCHING = 'fetching',
  PROCESSING = 'processing',
  STORING = 'storing',
  INDEXING = 'indexing'
}

export interface ProcessingError {
  code: ErrorCode;
  message: string;
  details?: any;
  stage: ProcessingStage;
}

export enum ErrorCode {
  INVALID_URL = 'INVALID_URL',
  UNSUPPORTED_TYPE = 'UNSUPPORTED_TYPE',
  FETCH_FAILED = 'FETCH_FAILED',
  PROCESSING_FAILED = 'PROCESSING_FAILED',
  STORAGE_FAILED = 'STORAGE_FAILED',
  TIMEOUT = 'TIMEOUT',
  ACCESS_DENIED = 'ACCESS_DENIED',
  RATE_LIMITED = 'RATE_LIMITED',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}