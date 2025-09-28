/**
 * SQL-based implementation of IUrlTagRepository using SQLite
 * Single Responsibility: Manages URL-tag relationships
 * Dependency Inversion: Implements IUrlTagRepository abstraction
 */
import * as sqlite3 from 'sqlite3';
import { IUrlTagRepository } from '../interfaces/IUrlTagRepository';
import { ITag } from '../interfaces/ITag';
import { ITagManager } from '../interfaces/ITagManager';
export declare class SqlUrlTagRepository implements IUrlTagRepository {
    private db;
    private tagManager;
    constructor(db: sqlite3.Database, tagManager: ITagManager);
    /**
     * Initializes URL-tag relationship table
     */
    initialize(): Promise<void>;
    addTagsToUrl(urlId: string, tagIds: string[]): Promise<boolean>;
    removeTagsFromUrl(urlId: string, tagIds: string[]): Promise<boolean>;
    getTagsForUrl(urlId: string): Promise<ITag[]>;
    getUrlsWithTag(tagId: string, includeChildren?: boolean): Promise<string[]>;
    getUrlsWithTags(tagIds: string[], requireAll?: boolean): Promise<string[]>;
    setTagsForUrl(urlId: string, tagIds: string[]): Promise<boolean>;
    clearTagsForUrl(urlId: string): Promise<boolean>;
    getTagUrlCounts(tagIds?: string[]): Promise<Map<string, number>>;
    urlHasTag(urlId: string, tagId: string): Promise<boolean>;
    getUrlsWithTagNames(tagNames: string[], requireAll?: boolean): Promise<string[]>;
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
}
//# sourceMappingURL=SqlUrlTagRepository.d.ts.map