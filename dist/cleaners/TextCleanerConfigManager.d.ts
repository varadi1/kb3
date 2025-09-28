/**
 * Text Cleaner Configuration Manager
 * Single Responsibility: Manage per-URL cleaner configurations
 */
import { ITextCleanerConfig, ITextCleanerConfigManager } from '../interfaces/ITextCleaner';
export declare class TextCleanerConfigManager implements ITextCleanerConfigManager {
    private db;
    private dbPath;
    private inMemoryCache;
    constructor(dbPath?: string);
    /**
     * Initialize the database
     */
    private initializeDatabase;
    /**
     * Set configuration for a specific URL
     */
    setUrlConfig(url: string, cleanerName: string, config: ITextCleanerConfig): Promise<void>;
    /**
     * Get configuration for a specific URL
     */
    getUrlConfig(url: string, cleanerName: string): Promise<ITextCleanerConfig | null>;
    /**
     * Set configuration for multiple URLs
     */
    batchSetConfig(urls: string[], cleanerName: string, config: ITextCleanerConfig): Promise<void>;
    /**
     * Get all configurations for a URL
     */
    getAllUrlConfigs(url: string): Promise<Map<string, ITextCleanerConfig>>;
    /**
     * Remove configuration for a URL
     */
    removeUrlConfig(url: string, cleanerName?: string): Promise<void>;
    /**
     * Apply configuration template to URLs matching a pattern
     */
    applyConfigTemplate(pattern: string | RegExp, cleanerName: string, config: ITextCleanerConfig): Promise<number>;
    /**
     * Get statistics about stored configurations
     */
    getStats(): {
        totalUrls: number;
        totalConfigs: number;
        configsByCleaners: Map<string, number>;
        cacheSize: number;
    };
    /**
     * Export all configurations
     */
    exportConfigurations(): Promise<Record<string, Record<string, ITextCleanerConfig>>>;
    /**
     * Import configurations
     */
    importConfigurations(configs: Record<string, Record<string, ITextCleanerConfig>>): Promise<void>;
    /**
     * Clean up old configurations
     */
    cleanupOldConfigs(daysOld?: number): Promise<number>;
    /**
     * Close database connection
     */
    close(): void;
}
//# sourceMappingURL=TextCleanerConfigManager.d.ts.map