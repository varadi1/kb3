/**
 * Interface for managing processed/cleaned file records
 * Interface Segregation Principle: Separate interface for processed files
 * Single Responsibility: Only manages processed file metadata
 */

export interface IProcessedFileRepository {
  /**
   * Initialize the repository (create tables, etc.)
   */
  initialize(): Promise<void>;

  /**
   * Record a new processed file
   */
  recordProcessedFile(fileInfo: ProcessedFileInfo): Promise<string>;

  /**
   * Get processed file by ID
   */
  getProcessedFile(fileId: string): Promise<ProcessedFileRecord | null>;

  /**
   * Get all processed files for a specific original file
   */
  getProcessedFilesByOriginal(originalFileId: string): Promise<ProcessedFileRecord[]>;

  /**
   * Get all processed files for a URL
   */
  getProcessedFilesByUrl(url: string): Promise<ProcessedFileRecord[]>;

  /**
   * List processed files with filtering options
   */
  listProcessedFiles(options?: ListProcessedFilesOptions): Promise<ProcessedFileRecord[]>;

  /**
   * Update the status of a processed file
   */
  updateFileStatus(fileId: string, status: ProcessedFileStatus): Promise<boolean>;

  /**
   * Get statistics about processed files
   */
  getStatistics(): Promise<ProcessedFileStatistics>;

  /**
   * Close the repository connection
   */
  close(): Promise<void>;
}

/**
 * Information about a processed file to be recorded
 */
export interface ProcessedFileInfo {
  originalFileId?: string;  // Reference to original file
  url: string;
  filePath: string;
  mimeType: string;
  size: number;
  checksum: string;
  processingType: ProcessingType;
  cleanersUsed?: string[];  // Which cleaners were applied
  cleaningConfig?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Complete processed file record from database
 */
export interface ProcessedFileRecord extends ProcessedFileInfo {
  id: string;
  status: ProcessedFileStatus;
  createdAt: Date;
  updatedAt: Date;
  accessedAt?: Date;
  downloadUrl?: string;
}

/**
 * Types of processing that can be applied
 */
export enum ProcessingType {
  CLEANED = 'cleaned',           // Text cleaning applied
  EXTRACTED = 'extracted',       // Content extraction
  SUMMARIZED = 'summarized',     // AI summarization
  TRANSLATED = 'translated',     // Language translation
  NORMALIZED = 'normalized',     // Format normalization
  COMBINED = 'combined'          // Multiple processing types
}

/**
 * Status of processed files
 */
export enum ProcessedFileStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  PROCESSING = 'processing',
  ERROR = 'error'
}

/**
 * Options for listing processed files
 */
export interface ListProcessedFilesOptions {
  originalFileId?: string;
  url?: string;
  processingType?: ProcessingType;
  status?: ProcessedFileStatus;
  cleanersUsed?: string[];
  fromDate?: Date;
  toDate?: Date;
  sortBy?: 'createdAt' | 'size' | 'processingType';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Statistics about processed files
 */
export interface ProcessedFileStatistics {
  totalFiles: number;
  totalSize: number;
  averageFileSize: number;
  filesByStatus: Record<ProcessedFileStatus, number>;
  filesByProcessingType: Record<ProcessingType, number>;
  filesByMimeType: Record<string, number>;
  cleanerUsageCount: Record<string, number>;
  oldestFile?: Date;
  newestFile?: Date;
  originalFilesWithProcessed: number;
  averageProcessedPerOriginal: number;
}