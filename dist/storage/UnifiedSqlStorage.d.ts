/**
 * Unified SQL storage that manages all tables in a single database
 * Single Responsibility: Manages database connection and schema
 * Open/Closed: Can be extended with new table definitions
 * Interface Segregation: Provides specific repository interfaces
 */
import { IKnowledgeStore } from '../interfaces/IKnowledgeStore';
import { IUrlRepository, UrlRecord, UrlMetadata } from '../interfaces/IUrlRepository';
import { IOriginalFileRepository } from '../interfaces/IOriginalFileRepository';
import { ITagManager } from '../interfaces/ITagManager';
import { ITag } from '../interfaces/ITag';
/**
 * Unified configuration for single database storage
 */
export interface UnifiedStorageConfig {
    dbPath: string;
    enableWAL?: boolean;
    enableForeignKeys?: boolean;
    backupEnabled?: boolean;
}
/**
 * Repository collection interface for unified storage
 */
export interface UnifiedRepositories {
    knowledgeStore: IKnowledgeStore;
    urlRepository: IUrlRepositoryWithTags;
    originalFileRepository: IOriginalFileRepository;
    tagManager: ITagManager;
}
/**
 * Extended URL repository interface with tag support
 */
export interface IUrlRepositoryWithTags extends IUrlRepository {
    registerWithTags(url: string, metadata?: UrlMetadata & {
        tags?: string[];
    }): Promise<string>;
    getUrlInfoWithTags(url: string): Promise<(UrlRecord & {
        tags?: ITag[];
    }) | null>;
    getUrlsByTags(tagNames: string[], requireAll?: boolean): Promise<(UrlRecord & {
        tags?: ITag[];
    })[]>;
}
/**
 * Main unified storage class that creates and manages all repositories
 */
export declare class UnifiedSqlStorage {
    private db;
    private readonly config;
    private initPromise;
    private knowledgeStore;
    private urlRepository;
    private originalFileRepository;
    private tagManager;
    private urlTagRepository;
    constructor(config: UnifiedStorageConfig);
    /**
     * Initialize the unified database and all tables
     */
    initialize(): Promise<void>;
    private _performInitialization;
    /**
     * Create all tables with foreign key relationships
     */
    private createTables;
    /**
     * Create indices for better query performance
     */
    private createIndices;
    /**
     * Initialize repository instances
     */
    private initializeRepositories;
    /**
     * Get all repositories
     */
    getRepositories(): UnifiedRepositories;
    /**
     * Close database connection
     */
    close(): Promise<void>;
    /**
     * Helper method to run SQL queries
     */
    private run;
}
//# sourceMappingURL=UnifiedSqlStorage.d.ts.map