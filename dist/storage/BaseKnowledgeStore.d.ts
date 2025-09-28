/**
 * Base class for knowledge stores
 * Template Method Pattern + Single Responsibility Principle
 */
import { IKnowledgeStore, KnowledgeEntry, SearchCriteria, StoreStats, SortField, SortOrder } from '../interfaces/IKnowledgeStore';
export declare abstract class BaseKnowledgeStore implements IKnowledgeStore {
    protected readonly indexedFields: Set<string>;
    constructor(indexedFields?: string[]);
    abstract store(entry: KnowledgeEntry): Promise<string>;
    abstract retrieve(id: string): Promise<KnowledgeEntry | null>;
    abstract update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean>;
    abstract delete(id: string): Promise<boolean>;
    abstract search(criteria: SearchCriteria): Promise<KnowledgeEntry[]>;
    abstract getStats(): Promise<StoreStats>;
    /**
     * Creates a new knowledge entry with default values
     * @param url The source URL
     * @param title The entry title
     * @param contentType The content type
     * @param text The processed text content
     * @param metadata Additional metadata
     * @returns A new knowledge entry
     */
    protected createKnowledgeEntry(url: string, title: string, contentType: string, text: string, metadata?: Record<string, any>, tags?: string[]): KnowledgeEntry;
    /**
     * Validates a knowledge entry
     * @param entry The entry to validate
     * @throws Error if validation fails
     */
    protected validateEntry(entry: KnowledgeEntry): void;
    /**
     * Validates search criteria
     * @param criteria The criteria to validate
     * @throws Error if validation fails
     */
    protected validateSearchCriteria(criteria: SearchCriteria): void;
    /**
     * Generates a unique ID for a knowledge entry
     * @param url The source URL
     * @param contentType The content type
     * @param timestamp The creation timestamp
     * @returns A unique entry ID
     */
    protected generateId(url: string, contentType: string, timestamp: Date): string;
    /**
     * Calculates a checksum for content
     * @param content The content to checksum
     * @returns Content checksum
     */
    protected calculateChecksum(content: string): string;
    /**
     * Normalizes text for search
     * @param text The text to normalize
     * @returns Normalized text
     */
    protected normalizeSearchText(text: string): string;
    /**
     * Extracts search terms from a query
     * @param query The search query
     * @returns Array of search terms
     */
    protected extractSearchTerms(query: string): string[];
    /**
     * Matches entry against search criteria
     * @param entry The entry to match
     * @param criteria The search criteria
     * @returns true if entry matches criteria
     */
    protected matchesSearchCriteria(entry: KnowledgeEntry, criteria: SearchCriteria): boolean;
    /**
     * Sorts entries based on criteria
     * @param entries The entries to sort
     * @param sortBy Sort field
     * @param sortOrder Sort order
     * @returns Sorted entries
     */
    protected sortEntries(entries: KnowledgeEntry[], sortBy?: SortField, sortOrder?: SortOrder): KnowledgeEntry[];
    /**
     * Applies pagination to entries
     * @param entries The entries to paginate
     * @param offset The offset
     * @param limit The limit
     * @returns Paginated entries
     */
    protected paginateEntries(entries: KnowledgeEntry[], offset?: number, limit?: number): KnowledgeEntry[];
    /**
     * Gets the indexed fields for this store
     * @returns Set of indexed field names
     */
    getIndexedFields(): Set<string>;
    /**
     * Adds a field to be indexed
     * @param field The field name to index
     */
    addIndexedField(field: string): void;
    /**
     * Removes a field from being indexed
     * @param field The field name to remove from index
     */
    removeIndexedField(field: string): void;
}
//# sourceMappingURL=BaseKnowledgeStore.d.ts.map