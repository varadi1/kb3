/**
 * Local file system storage implementation
 * Single Responsibility: Manages file storage on local file system
 */
import { BaseFileStorage } from './BaseFileStorage';
import { StorageOptions, FileMetadata, ListOptions, StorageStats } from '../interfaces/IFileStorage';
export declare class LocalFileStorage extends BaseFileStorage {
    constructor(basePath: string, compressionEnabled?: boolean, encryptionEnabled?: boolean);
    store(content: Buffer, filename: string, options?: StorageOptions): Promise<string>;
    retrieve(filePath: string): Promise<Buffer | null>;
    exists(filePath: string): Promise<boolean>;
    delete(filePath: string): Promise<boolean>;
    getMetadata(filePath: string): Promise<FileMetadata | null>;
    list(pattern?: string, options?: ListOptions): Promise<string[]>;
    getStats(): Promise<StorageStats>;
    /**
     * Ensures the base directory exists
     */
    private ensureBaseDirectory;
    /**
     * Gets the metadata file path for a given file
     * @param filePath The file path
     * @returns Metadata file path
     */
    private getMetadataPath;
    /**
     * Writes metadata to a file
     * @param filePath The file path
     * @param metadata The metadata to write
     */
    private writeMetadata;
    /**
     * Creates metadata from file stats (fallback)
     * @param filePath The file path
     * @returns File metadata or null if file doesn't exist
     */
    private createMetadataFromStats;
    /**
     * Gets the directory listing with detailed information
     * @param pattern Optional file pattern
     * @param options List options
     * @returns Array of file metadata
     */
    listDetailed(pattern?: string, options?: ListOptions): Promise<FileMetadata[]>;
    /**
     * Cleans up orphaned metadata files
     * @returns Number of cleaned up files
     */
    cleanupMetadata(): Promise<number>;
}
//# sourceMappingURL=LocalFileStorage.d.ts.map