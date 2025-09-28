/**
 * File storage wrapper that tracks original files
 * Open/Closed Principle: Extends functionality without modifying base storage
 * Single Responsibility: Adds file tracking to storage operations
 */
import { IFileStorage, StorageOptions, FileMetadata, ListOptions, StorageStats } from '../interfaces/IFileStorage';
import { IOriginalFileRepository } from '../interfaces/IOriginalFileRepository';
export declare class FileStorageWithTracking implements IFileStorage {
    private baseStorage;
    private originalFileRepository;
    constructor(baseStorage: IFileStorage, originalFileRepository: IOriginalFileRepository);
    store(content: Buffer, filename: string, options?: StorageOptions): Promise<string>;
    retrieve(path: string): Promise<Buffer | null>;
    exists(path: string): Promise<boolean>;
    delete(path: string): Promise<boolean>;
    getMetadata(path: string): Promise<FileMetadata | null>;
    list(pattern?: string, options?: ListOptions): Promise<string[]>;
    getStats(): Promise<StorageStats>;
    private guessMimeType;
}
//# sourceMappingURL=FileStorageWithTracking.d.ts.map