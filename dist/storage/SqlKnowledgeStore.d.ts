/**
 * SQL-based implementation of IKnowledgeStore using SQLite
 * Single Responsibility: Manages knowledge entries in SQL database
 * Open/Closed: Extends BaseKnowledgeStore, closed for modification
 */
import { KnowledgeEntry, SearchCriteria, StoreStats } from '../interfaces/IKnowledgeStore';
import { BaseKnowledgeStore } from './BaseKnowledgeStore';
export declare class SqlKnowledgeStore extends BaseKnowledgeStore {
    private db;
    private readonly dbPath;
    private initPromise;
    constructor(dbPath?: string);
    /**
     * Initializes the SQLite database and creates tables if needed
     */
    private initialize;
    private _performInitialization;
    /**
     * Helper method to run SQL queries
     */
    private run;
    /**
     * Helper method to get single row
     */
    private get;
    /**
     * Helper method to get multiple rows
     */
    private all;
    store(entry: KnowledgeEntry): Promise<string>;
    retrieve(id: string): Promise<KnowledgeEntry | null>;
    search(criteria: SearchCriteria): Promise<KnowledgeEntry[]>;
    update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean>;
    delete(id: string): Promise<boolean>;
    getStats(): Promise<StoreStats>;
    /**
     * Checks if a URL already exists in the store
     */
    urlExists(url: string): Promise<boolean>;
    /**
     * Gets entry by URL
     */
    getByUrl(url: string): Promise<KnowledgeEntry | null>;
    /**
     * Closes the database connection
     */
    close(): Promise<void>;
    /**
     * Converts database row to KnowledgeEntry
     */
    private rowToEntry;
    /**
     * Maps SortField enum to database column name
     */
    private mapSortField;
}
//# sourceMappingURL=SqlKnowledgeStore.d.ts.map