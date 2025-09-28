/**
 * Interface Segregation Principle: Focused interface for knowledge storage
 * Single Responsibility Principle: Only responsible for metadata management
 */
export interface IKnowledgeStore {
    /**
     * Stores knowledge entry metadata
     * @param entry The knowledge entry to store
     * @returns Promise resolving to the stored entry ID
     */
    store(entry: KnowledgeEntry): Promise<string>;
    /**
     * Retrieves a knowledge entry by ID
     * @param id The entry ID
     * @returns Promise resolving to the knowledge entry or null if not found
     */
    retrieve(id: string): Promise<KnowledgeEntry | null>;
    /**
     * Searches knowledge entries by criteria
     * @param criteria Search criteria
     * @returns Promise resolving to matching knowledge entries
     */
    search(criteria: SearchCriteria): Promise<KnowledgeEntry[]>;
    /**
     * Updates an existing knowledge entry
     * @param id The entry ID
     * @param updates Partial entry updates
     * @returns Promise resolving to success status
     */
    update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean>;
    /**
     * Deletes a knowledge entry
     * @param id The entry ID
     * @returns Promise resolving to success status
     */
    delete(id: string): Promise<boolean>;
    /**
     * Gets statistics about the knowledge store
     * @returns Promise resolving to store statistics
     */
    getStats(): Promise<StoreStats>;
}
export interface KnowledgeEntry {
    id: string;
    url: string;
    title: string;
    contentType: string;
    text: string;
    metadata: Record<string, any>;
    tags: string[];
    createdAt: Date;
    updatedAt: Date;
    size: number;
    checksum: string;
    processingStatus: ProcessingStatus;
    errorMessage?: string;
}
export interface SearchCriteria {
    query?: string;
    contentType?: string;
    tags?: string[];
    dateRange?: DateRange;
    limit?: number;
    offset?: number;
    sortBy?: SortField;
    sortOrder?: SortOrder;
}
export interface DateRange {
    from?: Date;
    to?: Date;
}
export declare enum ProcessingStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed"
}
export declare enum SortField {
    CREATED_AT = "createdAt",
    UPDATED_AT = "updatedAt",
    TITLE = "title",
    SIZE = "size",
    RELEVANCE = "relevance"
}
export declare enum SortOrder {
    ASC = "asc",
    DESC = "desc"
}
export interface StoreStats {
    totalEntries: number;
    totalSize: number;
    contentTypes: Record<string, number>;
    processingStatus: Record<ProcessingStatus, number>;
    oldestEntry?: Date;
    newestEntry?: Date;
}
//# sourceMappingURL=IKnowledgeStore.d.ts.map