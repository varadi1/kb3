/**
 * In-memory knowledge store implementation
 * Single Responsibility: Manages knowledge entries in memory
 * Suitable for development, testing, and small datasets
 */
import { BaseKnowledgeStore } from './BaseKnowledgeStore';
import { KnowledgeEntry, SearchCriteria, StoreStats } from '../interfaces/IKnowledgeStore';
export declare class MemoryKnowledgeStore extends BaseKnowledgeStore {
    private readonly entries;
    private readonly urlIndex;
    private readonly contentTypeIndex;
    private readonly tagIndex;
    constructor(indexedFields?: string[]);
    store(entry: KnowledgeEntry): Promise<string>;
    retrieve(id: string): Promise<KnowledgeEntry | null>;
    update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    search(criteria: SearchCriteria): Promise<KnowledgeEntry[]>;
    getStats(): Promise<StoreStats>;
    /**
     * Finds entry ID by URL
     * @param url The URL to search for
     * @returns Entry ID or null if not found
     */
    private findByUrl;
    /**
     * Updates the various indexes
     * @param entry The entry to index
     * @param operation Add or remove from indexes
     */
    private updateIndexes;
    /**
     * Gets all entries (for testing/debugging)
     * @returns Array of all entries
     */
    getAllEntries(): Promise<KnowledgeEntry[]>;
    /**
     * Clears all entries and indexes
     */
    clear(): Promise<void>;
    /**
     * Gets the current size of the store
     * @returns Number of entries
     */
    size(): number;
    /**
     * Checks if an entry exists
     * @param id The entry ID
     * @returns true if entry exists
     */
    has(id: string): boolean;
    /**
     * Gets index statistics for debugging
     * @returns Index statistics
     */
    getIndexStats(): IndexStats;
    /**
     * Rebuilds all indexes (useful for maintenance)
     */
    rebuildIndexes(): Promise<void>;
}
export interface IndexStats {
    urlIndexSize: number;
    contentTypeIndexSize: number;
    tagIndexSize: number;
    totalEntries: number;
}
//# sourceMappingURL=MemoryKnowledgeStore.d.ts.map