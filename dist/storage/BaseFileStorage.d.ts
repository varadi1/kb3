/**
 * Base class for file storage implementations
 * Template Method Pattern + Single Responsibility Principle
 */
import { IFileStorage, StorageOptions, FileMetadata, ListOptions, FileSort, SortOrder, StorageStats } from '../interfaces/IFileStorage';
export declare abstract class BaseFileStorage implements IFileStorage {
    protected readonly basePath: string;
    protected readonly compressionEnabled: boolean;
    protected readonly encryptionEnabled: boolean;
    constructor(basePath: string, compressionEnabled?: boolean, encryptionEnabled?: boolean);
    abstract store(content: Buffer, filename: string, options?: StorageOptions): Promise<string>;
    abstract retrieve(path: string): Promise<Buffer | null>;
    abstract exists(path: string): Promise<boolean>;
    abstract delete(path: string): Promise<boolean>;
    abstract getMetadata(path: string): Promise<FileMetadata | null>;
    abstract list(pattern?: string, options?: ListOptions): Promise<string[]>;
    abstract getStats(): Promise<StorageStats>;
    /**
     * Validates storage options
     * @param options Storage options to validate
     * @throws Error if validation fails
     */
    protected validateStorageOptions(options?: StorageOptions): void;
    /**
     * Validates list options
     * @param options List options to validate
     * @throws Error if validation fails
     */
    protected validateListOptions(options?: ListOptions): void;
    /**
     * Validates filename
     * @param filename Filename to validate
     * @throws Error if validation fails
     */
    protected validateFilename(filename: string): void;
    /**
     * Generates a unique filename to avoid collisions
     * @param originalFilename Original filename
     * @param content File content for hashing
     * @returns Unique filename
     */
    protected generateUniqueFilename(originalFilename: string, content: Buffer): string;
    /**
     * Calculates file checksum
     * @param content File content
     * @returns Content checksum
     */
    protected calculateChecksum(content: Buffer): string;
    /**
     * Determines MIME type from filename
     * @param filename Filename to analyze
     * @returns MIME type
     */
    protected determineMimeType(filename: string): string;
    /**
     * Compresses content if compression is enabled
     * @param content Content to compress
     * @param options Storage options
     * @returns Compressed content or original if compression disabled
     */
    protected compressContent(content: Buffer, options: StorageOptions): Promise<Buffer>;
    /**
     * Decompresses content if it was compressed
     * @param content Content to decompress
     * @param metadata File metadata
     * @returns Decompressed content or original if not compressed
     */
    protected decompressContent(content: Buffer, metadata: FileMetadata): Promise<Buffer>;
    /**
     * Encrypts content if encryption is enabled
     * @param content Content to encrypt
     * @param options Storage options
     * @returns Encrypted content or original if encryption disabled
     */
    protected encryptContent(content: Buffer, options: StorageOptions): Promise<Buffer>;
    /**
     * Decrypts content if it was encrypted
     * @param content Content to decrypt
     * @param metadata File metadata
     * @returns Decrypted content or original if not encrypted
     */
    protected decryptContent(content: Buffer, metadata: FileMetadata): Promise<Buffer>;
    /**
     * Creates file metadata
     * @param filePath File path
     * @param content File content
     * @param options Storage options
     * @returns File metadata
     */
    protected createFileMetadata(filePath: string, content: Buffer, options?: StorageOptions): FileMetadata;
    /**
     * Sorts file metadata list
     * @param files File metadata array
     * @param sortBy Sort field
     * @param sortOrder Sort order
     * @returns Sorted file metadata array
     */
    protected sortFiles(files: FileMetadata[], sortBy?: FileSort, sortOrder?: SortOrder): FileMetadata[];
    /**
     * Applies pagination to file list
     * @param files File metadata array
     * @param limit Maximum number of files to return
     * @returns Paginated file metadata array
     */
    protected paginateFiles(files: FileMetadata[], limit?: number): FileMetadata[];
    /**
     * Matches files against a glob pattern
     * @param filename Filename to test
     * @param pattern Glob pattern
     * @returns true if filename matches pattern
     */
    protected matchesPattern(filename: string, pattern?: string): boolean;
    /**
     * Gets the base storage path
     * @returns Base storage path
     */
    getBasePath(): string;
    /**
     * Checks if compression is enabled
     * @returns true if compression is enabled
     */
    isCompressionEnabled(): boolean;
    /**
     * Checks if encryption is enabled
     * @returns true if encryption is enabled
     */
    isEncryptionEnabled(): boolean;
}
//# sourceMappingURL=BaseFileStorage.d.ts.map