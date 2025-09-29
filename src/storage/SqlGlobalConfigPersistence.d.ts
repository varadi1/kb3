/**
 * SQL-based implementation of global configuration persistence
 * Single Responsibility: Manages global configuration persistence in database
 * Follows SOLID principles for clean architecture
 */
export interface GlobalConfig {
    scrapers?: Array<{
        type: string;
        enabled: boolean;
        priority: number;
        parameters?: Record<string, any>;
    }>;
    cleaners?: Array<{
        type: string;
        enabled: boolean;
        order: number;
        parameters?: Record<string, any>;
    }>;
}
export declare class SqlGlobalConfigPersistence {
    private readonly dbPath;
    private db;
    private readonly tableName;
    constructor(dbPath: string);
    /**
     * Ensures the global_config table exists
     */
    private ensureTableExists;
    /**
     * Saves scraper configuration to database
     */
    saveScraperConfig(scrapers: GlobalConfig['scrapers']): Promise<void>;
    /**
     * Saves cleaner configuration to database
     */
    saveCleanerConfig(cleaners: GlobalConfig['cleaners']): Promise<void>;
    /**
     * Generic method to save configuration
     */
    private saveConfig;
    /**
     * Loads scraper configuration from database
     */
    loadScraperConfig(): Promise<GlobalConfig['scrapers'] | null>;
    /**
     * Loads cleaner configuration from database
     */
    loadCleanerConfig(): Promise<GlobalConfig['cleaners'] | null>;
    /**
     * Generic method to load configuration
     */
    private loadConfig;
    /**
     * Loads all configuration from database
     */
    loadAllConfig(): Promise<GlobalConfig>;
    /**
     * Clears all configuration
     */
    clearConfig(): Promise<void>;
    /**
     * Closes the database connection
     */
    close(): void;
}
//# sourceMappingURL=SqlGlobalConfigPersistence.d.ts.map