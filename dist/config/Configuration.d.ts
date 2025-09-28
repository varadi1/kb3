/**
 * Configuration interface and default implementation
 * Single Responsibility: Manages system configuration
 */
export interface KnowledgeBaseConfig {
    storage: {
        unified?: {
            enabled: boolean;
            dbPath: string;
            enableWAL?: boolean;
            enableForeignKeys?: boolean;
            backupEnabled?: boolean;
            autoMigrate?: boolean;
            migrationOptions?: {
                backupOriginal?: boolean;
                deleteOriginalAfterSuccess?: boolean;
            };
        };
        knowledgeStore: {
            type: 'memory' | 'file' | 'sql';
            path?: string;
            dbPath?: string;
            urlDbPath?: string;
            indexedFields?: string[];
            backupEnabled?: boolean;
        };
        fileStorage: {
            basePath: string;
            compressionEnabled?: boolean;
            encryptionEnabled?: boolean;
        };
        fileStore: {
            path: string;
        };
        originalFileStore?: {
            type?: 'sql';
            path?: string;
        };
        processedFileStore?: {
            type?: 'sql';
            path?: string;
            enabled?: boolean;
        };
        enableDuplicateDetection?: boolean;
        enableUrlTracking?: boolean;
        urlRepositoryPath?: string;
    };
    processing: {
        maxTextLength?: number;
        defaultOptions?: ProcessingOptionsConfig;
        concurrency?: number;
        timeout?: number;
        textExtraction?: boolean;
        metadataExtraction?: boolean;
        skipUnchangedContent?: boolean;
    };
    network: {
        timeout?: number;
        maxSize?: number;
        userAgent?: string;
        followRedirects?: boolean;
        maxRedirects?: number;
    };
    detection: {
        enableExtensionDetection?: boolean;
        enableHeaderDetection?: boolean;
        enableContentDetection?: boolean;
        contentSampleSize?: number;
    };
    logging: {
        level: 'debug' | 'info' | 'warn' | 'error';
        enableConsole?: boolean;
        logFile?: string;
    };
    scraping?: {
        defaultScraper?: string;
        scraperRules?: Array<{
            pattern: string;
            scraperName: string;
            priority?: number;
        }>;
        scraperConfigs?: Record<string, any>;
        enabledScrapers?: string[];
        rateLimiting?: {
            enabled?: boolean;
            defaultIntervalMs?: number;
            domainIntervals?: Record<string, number>;
        };
        errorCollection?: {
            enabled?: boolean;
            maxErrorsPerContext?: number;
            contextRetentionMs?: number;
        };
    };
}
export interface ProcessingOptionsConfig {
    extractImages?: boolean;
    extractLinks?: boolean;
    extractMetadata?: boolean;
    maxTextLength?: number;
    preserveFormatting?: boolean;
    forceReprocess?: boolean;
}
export declare function createDefaultConfiguration(overrides?: Partial<KnowledgeBaseConfig>): KnowledgeBaseConfig;
export declare function createProductionConfiguration(): KnowledgeBaseConfig;
export declare function createDevelopmentConfiguration(): KnowledgeBaseConfig;
export declare function createSqlConfiguration(overrides?: Partial<KnowledgeBaseConfig>): KnowledgeBaseConfig;
export declare function createUnifiedConfiguration(overrides?: Partial<KnowledgeBaseConfig>): KnowledgeBaseConfig;
export declare function validateConfiguration(config: KnowledgeBaseConfig): void;
//# sourceMappingURL=Configuration.d.ts.map