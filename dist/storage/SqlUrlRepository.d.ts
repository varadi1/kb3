/**
 * SQL-based implementation of IUrlRepository using SQLite
 * Single Responsibility: Manages URL tracking and duplicate detection
 * Dependency Inversion: Depends on IUrlRepository abstraction
 */
import { IUrlRepository, UrlRecord, UrlMetadata, UrlStatus, UrlFilter } from '../interfaces/IUrlRepository';
import { IUrlTagRepository } from '../interfaces/IUrlTagRepository';
import { ITagManager } from '../interfaces/ITagManager';
import { ITag } from '../interfaces/ITag';
export interface UrlMetadataWithTags extends UrlMetadata {
    tags?: string[];
}
export interface UrlRecordWithTags extends UrlRecord {
    tags?: ITag[];
}
export declare class SqlUrlRepository implements IUrlRepository {
    private db;
    private readonly dbPath;
    private initPromise;
    private tagManager;
    private urlTagRepository;
    private readonly tagsEnabled;
    constructor(dbPath?: string, enableTags?: boolean);
    /**
     * Initializes the SQLite database and creates tables if needed
     */
    private initialize;
    private _performInitialization;
    /**
     * Initialize tag support
     */
    private initializeTags;
    /**
     * Initialize repository with tag support (legacy compatibility)
     */
    initializeWithTags(): Promise<void>;
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
     * Register a URL with optional tags
     */
    registerWithTags(url: string, metadata?: UrlMetadataWithTags): Promise<string>;
    /**
     * Get URL info with tags
     */
    getUrlInfoWithTags(url: string): Promise<UrlRecordWithTags | null>;
    /**
     * Get URLs by tag names
     */
    getUrlsByTags(tagNames: string[], requireAll?: boolean): Promise<UrlRecordWithTags[]>;
    /**
     * Add tags to an existing URL
     */
    addTagsToUrl(url: string, tagNames: string[]): Promise<boolean>;
    /**
     * Remove tags from an existing URL
     */
    removeTagsFromUrl(url: string, tagNames: string[]): Promise<boolean>;
    /**
     * Set tags for a URL (replaces existing tags)
     */
    setUrlTags(url: string, tagNames: string[]): Promise<boolean>;
    /**
     * Get tags for a URL
     */
    getUrlTags(url: string): Promise<ITag[]>;
    /**
     * Batch register URLs with tags
     */
    batchRegisterWithTags(urlsWithTags: Array<{
        url: string;
        tags?: string[];
        metadata?: UrlMetadata;
    }>): Promise<string[]>;
    /**
     * Get URL record by ID (helper method)
     */
    private getUrlById;
    /**
     * Get tag manager for external use
     */
    getTagManager(): ITagManager | null;
    /**
     * Get URL-tag repository for external use
     */
    getUrlTagRepository(): IUrlTagRepository | null;
    /**
     * Check if tags are enabled
     */
    areTagsEnabled(): boolean;
    /**
     * Converts database row to UrlRecord
     */
    private rowToRecord;
}
//# sourceMappingURL=SqlUrlRepository.d.ts.map