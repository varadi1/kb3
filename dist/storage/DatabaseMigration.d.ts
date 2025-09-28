/**
 * Database migration utility for consolidating multiple databases into unified storage
 * Single Responsibility: Handles migration from old to new database structure
 * Open/Closed: Can be extended with new migration strategies
 */
/**
 * Migration options
 */
export interface MigrationOptions {
    knowledgeDbPath?: string;
    urlsDbPath?: string;
    originalFilesDbPath?: string;
    targetDbPath: string;
    backupOriginal?: boolean;
    deleteOriginalAfterSuccess?: boolean;
    verbose?: boolean;
    dryRun?: boolean;
}
/**
 * Migration result
 */
export interface MigrationResult {
    success: boolean;
    migratedTables: {
        urls: number;
        tags: number;
        urlTags: number;
        knowledgeEntries: number;
        originalFiles: number;
    };
    errors: string[];
    warnings: string[];
    backupPaths?: string[];
}
/**
 * Database migration utility
 */
export declare class DatabaseMigration {
    private options;
    private sourceConnections;
    constructor(options: MigrationOptions);
    /**
     * Perform the migration
     */
    migrate(): Promise<MigrationResult>;
    /**
     * Validate that source databases exist
     */
    private validateSourceDatabases;
    /**
     * Create backups of original databases
     */
    private createBackups;
    /**
     * Open connections to source databases
     */
    private openSourceConnections;
    /**
     * Open a single database connection
     */
    private openDatabase;
    /**
     * Close source database connections
     */
    private closeSourceConnections;
    /**
     * Close a single database connection
     */
    private closeDatabase;
    /**
     * Migrate URLs table
     */
    private migrateUrls;
    /**
     * Migrate tags table
     */
    private migrateTags;
    /**
     * Migrate URL-tags relationship table
     */
    private migrateUrlTags;
    /**
     * Migrate knowledge entries table
     */
    private migrateKnowledgeEntries;
    /**
     * Migrate original files table
     */
    private migrateOriginalFiles;
    /**
     * Check if a table exists in database
     */
    private tableExists;
    /**
     * Query all rows
     */
    private queryAll;
    /**
     * Query single row
     */
    private queryOne;
    /**
     * Run a query without expecting results
     */
    private runQuery;
    /**
     * Delete original databases after successful migration
     */
    private deleteOriginalDatabases;
}
/**
 * Convenience function to perform migration
 */
export declare function migrateToUnifiedDatabase(options: MigrationOptions): Promise<MigrationResult>;
//# sourceMappingURL=DatabaseMigration.d.ts.map