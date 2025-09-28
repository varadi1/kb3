/**
 * Interface Segregation Principle: Focused interface for tracking original files
 * Single Responsibility: Only manages original file metadata and references
 */

export interface IOriginalFileRepository {
  /**
   * Initialize the repository (create tables if needed)
   */
  initialize(): Promise<void>;

  /**
   * Records an original file in the repository
   * @param fileInfo Information about the original file
   * @returns Promise resolving to the unique file ID
   */
  recordOriginalFile(fileInfo: OriginalFileInfo): Promise<string>;

  /**
   * Retrieves original file information by ID
   * @param fileId The unique file identifier
   * @returns Promise resolving to file info or null if not found
   */
  getOriginalFile(fileId: string): Promise<OriginalFileRecord | null>;

  /**
   * Retrieves original files by URL
   * @param url The source URL
   * @returns Promise resolving to array of file records
   */
  getOriginalFilesByUrl(url: string): Promise<OriginalFileRecord[]>;

  /**
   * Lists all original files with optional filtering
   * @param options Filtering options
   * @returns Promise resolving to array of file records
   */
  listOriginalFiles(options?: ListOriginalFilesOptions): Promise<OriginalFileRecord[]>;

  /**
   * Updates the status of an original file
   * @param fileId The unique file identifier
   * @param status The new status
   * @returns Promise resolving to success status
   */
  updateFileStatus(fileId: string, status: FileStatus): Promise<boolean>;

  /**
   * Gets statistics about original files
   * @returns Promise resolving to statistics
   */
  getStatistics(): Promise<OriginalFileStatistics>;
}

export interface OriginalFileInfo {
  url: string;
  filePath: string;
  mimeType: string;
  size: number;
  checksum: string;
  scraperUsed?: string;
  cleaningMetadata?: {
    cleanersUsed: string[];
    cleaningConfig?: Record<string, any>;
    statistics?: {
      originalLength: number;
      cleanedLength: number;
      compressionRatio: string;
      processingTimeMs: number;
    };
    processedFileId?: string;
  };
  metadata?: Record<string, any>;
}

export interface OriginalFileRecord extends OriginalFileInfo {
  id: string;
  status: FileStatus;
  createdAt: Date;
  updatedAt: Date;
  accessedAt?: Date;
  downloadUrl?: string; // URL that frontend can use to download the file
}

export enum FileStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted',
  PROCESSING = 'processing',
  ERROR = 'error'
}

export interface ListOriginalFilesOptions {
  url?: string;
  status?: FileStatus;
  mimeType?: string;
  scraperUsed?: string;
  fromDate?: Date;
  toDate?: Date;
  limit?: number;
  offset?: number;
  sortBy?: 'createdAt' | 'size' | 'url';
  sortOrder?: 'asc' | 'desc';
}

export interface OriginalFileStatistics {
  totalFiles: number;
  totalSize: number;
  filesByStatus: Record<FileStatus, number>;
  filesByMimeType: Record<string, number>;
  filesByScraperUsed: Record<string, number>;
  oldestFile?: Date;
  newestFile?: Date;
  averageFileSize: number;
}