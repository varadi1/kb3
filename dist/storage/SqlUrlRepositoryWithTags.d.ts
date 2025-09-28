/**
 * Enhanced SQL-based URL repository with tag support
 * Single Responsibility: Manages URL tracking with tag integration
 * Open/Closed: Extends SqlUrlRepository without modifying it
 */
import { SqlUrlRepository } from './SqlUrlRepository';
import { IUrlTagRepository } from '../interfaces/IUrlTagRepository';
import { ITagManager } from '../interfaces/ITagManager';
import { ITag } from '../interfaces/ITag';
import { UrlMetadata, UrlRecord } from '../interfaces/IUrlRepository';
export interface UrlMetadataWithTags extends UrlMetadata {
    tags?: string[];
}
export interface UrlRecordWithTags extends UrlRecord {
    tags?: ITag[];
}
export declare class SqlUrlRepositoryWithTags extends SqlUrlRepository {
    private tagManager;
    private urlTagRepository;
    private dbConnection;
    constructor(dbPath?: string);
    /**
     * Initialize repository with tag support
     */
    initializeWithTags(): Promise<void>;
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
     * Helper method to get from database
     */
    private getFromDb;
    /**
     * Convert database row to UrlRecord (helper)
     */
    private rowToUrlRecord;
    /**
     * Get tag manager for external use
     */
    getTagManager(): ITagManager;
    /**
     * Get URL-tag repository for external use
     */
    getUrlTagRepository(): IUrlTagRepository;
}
//# sourceMappingURL=SqlUrlRepositoryWithTags.d.ts.map