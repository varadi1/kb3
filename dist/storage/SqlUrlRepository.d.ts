/**
 * SQL-based implementation of IUrlRepository using SQLite
 * Single Responsibility: Manages URL tracking and duplicate detection
 * Dependency Inversion: Depends on IUrlRepository abstraction
 */
import { IUrlRepository, UrlRecord, UrlMetadata, UrlStatus, UrlFilter } from '../interfaces/IUrlRepository';
export declare class SqlUrlRepository implements IUrlRepository {
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
    exists(url: string): Promise<boolean>;
    register(url: string, metadata?: UrlMetadata): Promise<string>;
    updateStatus(id: string, status: UrlStatus, error?: string): Promise<boolean>;
    getUrlInfo(url: string): Promise<UrlRecord | null>;
    getByHash(hash: string): Promise<UrlRecord | null>;
    list(filter?: UrlFilter): Promise<UrlRecord[]>;
    remove(id: string): Promise<boolean>;
    /**
     * Updates the content hash for a URL and tracks content changes
     */
    updateHash(id: string, contentHash: string): Promise<boolean>;
    /**
     * Checks if content with given hash already exists
     */
    hashExists(hash: string): Promise<boolean>;
    /**
     * Closes the database connection
     */
    close(): Promise<void>;
    /**
     * Normalizes URL for consistent comparison
     */
    private normalizeUrl;
    /**
     * Converts database row to UrlRecord
     */
    private rowToRecord;
}
//# sourceMappingURL=SqlUrlRepository.d.ts.map