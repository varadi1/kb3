/**
 * File storage wrapper that tracks processed/cleaned files
 * Open/Closed Principle: Extends functionality without modifying base storage
 * Single Responsibility: Adds processed file tracking to storage operations
 * Decorator Pattern: Wraps existing storage with additional behavior
 */
import { IFileStorage, StorageOptions, FileMetadata, ListOptions, StorageStats } from '../interfaces/IFileStorage';
import { IProcessedFileRepository, ProcessingType } from '../interfaces/IProcessedFileRepository';
export interface ProcessedStorageOptions extends StorageOptions {
    metadata?: {
        url?: string;
        mimeType?: string;
        originalFileId?: string;
        processingType?: ProcessingType;
        cleanersUsed?: string[];
        cleaningConfig?: Record<string, any>;
        [key: string]: any;
    };
}
export declare class ProcessedFileStorageWithTracking implements IFileStorage {
    private baseStorage;
    private processedFileRepository;
    constructor(baseStorage: IFileStorage, processedFileRepository: IProcessedFileRepository);
    /**
     * Store processed content and track it in the repository
     */
    store(content: Buffer, filename: string, options?: ProcessedStorageOptions): Promise<string>;
    /**
     * Retrieve processed file content
     */
    retrieve(path: string): Promise<Buffer | null>;
    /**
     * Check if processed file exists
     */
    exists(path: string): Promise<boolean>;
    /**
     * Delete processed file and update tracking
     */
    delete(path: string): Promise<boolean>;
    /**
     * Get metadata for processed file
     */
    getMetadata(path: string): Promise<FileMetadata | null>;
    /**
     * List processed files
     */
    list(pattern?: string, options?: ListOptions): Promise<string[]>;
    /**
     * Get storage statistics
     */
    getStats(): Promise<StorageStats>;
    /**
     * Ensure filename includes processed files path
     */
    private ensureProcessedPath;
    /**
     * Guess MIME type from filename
     */
    private guessMimeType;
    /**
     * Update metadata file with processed file ID
     */
    private updateMetadataWithId;
}
//# sourceMappingURL=ProcessedFileStorageWithTracking.d.ts.map