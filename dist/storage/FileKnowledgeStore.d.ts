/**
 * File-based knowledge store implementation
 * Single Responsibility: Manages knowledge entries using file system storage
 * Suitable for persistent storage without external databases
 */
import { BaseKnowledgeStore } from './BaseKnowledgeStore';
import { KnowledgeEntry, SearchCriteria, StoreStats } from '../interfaces/IKnowledgeStore';
export declare class FileKnowledgeStore extends BaseKnowledgeStore {
    private readonly storePath;
    private readonly indexPath;
    private readonly entriesPath;
    private readonly backupEnabled;
    private entriesCache;
    private indexCache;
    private cacheLastModified;
    constructor(storePath: string, indexedFields?: string[], backupEnabled?: boolean);
    store(entry: KnowledgeEntry): Promise<string>;
    retrieve(id: string): Promise<KnowledgeEntry | null>;
    update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    search(criteria: SearchCriteria): Promise<KnowledgeEntry[]>;
    getStats(): Promise<StoreStats>;
    /**
     * Ensures required directories exist
     */
    private ensureDirectories;
    /**
     * Loads cache from disk if needed
     */
    private loadCache;
    /**
     * Loads index from disk
     */
    private loadIndex;
    /**
     * Saves index to disk
     */
    private saveIndex;
    /**
     * Creates an empty index
     */
    private createEmptyIndex;
    /**
     * Updates the index with an entry
     */
    private updateIndex;
    private removeFromIndex;
    /**
     * Finds entry ID by URL
     */
    private findByUrl;
    /**
     * Writes an entry to file
     */
    private writeEntryFile;
    /**
     * Creates a backup of an entry
     */
    private createBackup;
    /**
     * Invalidates the cache
     */
    invalidateCache(): void;
    /**
     * Gets the store path
     */
    getStorePath(): string;
    /**
     * Rebuilds the index from all entries
     */
    rebuildIndex(): Promise<void>;
}
//# sourceMappingURL=FileKnowledgeStore.d.ts.map