/**
 * SQL-based implementation of ITagManager using SQLite
 * Single Responsibility: Manages tag lifecycle and operations
 * Dependency Inversion: Implements ITagManager abstraction
 */
import * as sqlite3 from 'sqlite3';
import { ITagManager } from '../interfaces/ITagManager';
import { ITag, TagCreateInput, TagUpdateInput, TagFilter } from '../interfaces/ITag';
export declare class SqlTagManager implements ITagManager {
    private db;
    constructor(db: sqlite3.Database);
    /**
     * Initializes tag-related database tables
     */
    initialize(): Promise<void>;
    createTag(input: TagCreateInput): Promise<ITag>;
    getTag(id: string): Promise<ITag | null>;
    getTagByName(name: string): Promise<ITag | null>;
    updateTag(id: string, input: TagUpdateInput): Promise<ITag>;
    deleteTag(id: string, deleteChildren?: boolean): Promise<boolean>;
    listTags(filter?: TagFilter): Promise<ITag[]>;
    getChildTags(parentId: string, recursive?: boolean): Promise<ITag[]>;
    getTagPath(id: string): Promise<ITag[]>;
    isNameAvailable(name: string, excludeId?: string): Promise<boolean>;
    ensureTagsExist(tagNames: string[]): Promise<string[]>;
    /**
     * Helper method to get URL counts for tags
     */
    private getTagUrlCounts;
    /**
     * Helper method to check for circular references
     */
    private wouldCreateCircularReference;
    /**
     * Helper method to get all descendants recursively
     */
    private getDescendants;
    /**
     * Helper method to delete all descendants recursively
     */
    private deleteDescendants;
    /**
     * Helper method to convert database row to ITag
     */
    private rowToTag;
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
//# sourceMappingURL=SqlTagManager.d.ts.map