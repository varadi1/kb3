/**
 * Interface Segregation Principle: Focused interface for file storage
 * Single Responsibility Principle: Only responsible for file operations
 */
export interface IFileStorage {
    /**
     * Stores a file and returns its storage path
     * @param content The file content
     * @param filename The desired filename
     * @param options Optional storage configuration
     * @returns Promise resolving to the storage path
     */
    store(content: Buffer, filename: string, options?: StorageOptions): Promise<string>;
    /**
     * Retrieves a file by its storage path
     * @param path The file storage path
     * @returns Promise resolving to the file content or null if not found
     */
    retrieve(path: string): Promise<Buffer | null>;
    /**
     * Checks if a file exists at the given path
     * @param path The file storage path
     * @returns Promise resolving to existence status
     */
    exists(path: string): Promise<boolean>;
    /**
     * Deletes a file at the given path
     * @param path The file storage path
     * @returns Promise resolving to success status
     */
    delete(path: string): Promise<boolean>;
    /**
     * Gets file metadata
     * @param path The file storage path
     * @returns Promise resolving to file metadata or null if not found
     */
    getMetadata(path: string): Promise<FileMetadata | null>;
    /**
     * Lists files matching the given pattern
     * @param pattern File pattern (glob-style)
     * @param options Optional listing options
     * @returns Promise resolving to matching file paths
     */
    list(pattern?: string, options?: ListOptions): Promise<string[]>;
    /**
     * Gets storage statistics
     * @returns Promise resolving to storage statistics
     */
    getStats(): Promise<StorageStats>;
}
export interface StorageOptions {
    overwrite?: boolean;
    compress?: boolean;
    encrypt?: boolean;
    metadata?: Record<string, any>;
}
export interface FileMetadata {
    path: string;
    size: number;
    createdAt: Date;
    updatedAt: Date;
    mimeType: string;
    checksum: string;
    isCompressed?: boolean;
    isEncrypted?: boolean;
    metadata?: Record<string, any>;
}
export interface ListOptions {
    recursive?: boolean;
    includeMetadata?: boolean;
    sortBy?: FileSort;
    sortOrder?: SortOrder;
    limit?: number;
}
export declare enum FileSort {
    NAME = "name",
    SIZE = "size",
    CREATED_AT = "createdAt",
    UPDATED_AT = "updatedAt"
}
export declare enum SortOrder {
    ASC = "asc",
    DESC = "desc"
}
export interface StorageStats {
    totalFiles: number;
    totalSize: number;
    averageFileSize: number;
    fileTypes: Record<string, number>;
    oldestFile?: Date;
    newestFile?: Date;
    availableSpace?: number;
}
//# sourceMappingURL=IFileStorage.d.ts.map