/**
 * Text Cleaning Orchestrator - Facade Pattern
 * Single Responsibility: Coordinate text cleaning operations
 * Dependency Inversion: Depends on abstractions (interfaces)
 */
import { ITextCleaner, ITextCleanerConfig, IChainResult, TextFormat, ITextCleanerConfigManager } from '../interfaces/ITextCleaner';
import { TextCleanerRegistry } from './TextCleanerRegistry';
import { TextCleanerChain } from './TextCleanerChain';
export interface ITextCleaningOrchestrator {
    /**
     * Clean text with specific cleaners
     */
    cleanWithCleaners(text: string, cleanerNames: string[], format: TextFormat, url?: string): Promise<IChainResult>;
    /**
     * Clean text with automatic cleaner selection
     */
    cleanAuto(text: string, format: TextFormat, url?: string): Promise<IChainResult>;
    /**
     * Clean text with a custom chain
     */
    cleanWithChain(text: string, chain: TextCleanerChain, format: TextFormat): Promise<IChainResult>;
    /**
     * Configure cleaners for a URL
     */
    configureForUrl(url: string, cleanerConfigs: Map<string, ITextCleanerConfig>): Promise<void>;
    /**
     * Get configuration for a URL
     */
    getUrlConfiguration(url: string): Promise<Map<string, ITextCleanerConfig>>;
    /**
     * Batch configure URLs
     */
    batchConfigureUrls(urls: string[], cleanerName: string, config: ITextCleanerConfig): Promise<void>;
}
export declare class TextCleaningOrchestrator implements ITextCleaningOrchestrator {
    private registry;
    private configManager;
    private defaultChains;
    constructor(registry?: TextCleanerRegistry, configManager?: ITextCleanerConfigManager);
    /**
     * Clean text with specific cleaners
     */
    cleanWithCleaners(text: string, cleanerNames: string[], format: TextFormat, url?: string): Promise<IChainResult>;
    /**
     * Clean text with automatic cleaner selection
     */
    cleanAuto(text: string, format: TextFormat, url?: string): Promise<IChainResult>;
    /**
     * Clean text with a custom chain
     */
    cleanWithChain(text: string, chain: TextCleanerChain, format: TextFormat): Promise<IChainResult>;
    /**
     * Configure cleaners for a URL
     */
    configureForUrl(url: string, cleanerConfigs: Map<string, ITextCleanerConfig>): Promise<void>;
    /**
     * Get configuration for a URL
     */
    getUrlConfiguration(url: string): Promise<Map<string, ITextCleanerConfig>>;
    /**
     * Batch configure URLs
     */
    batchConfigureUrls(urls: string[], cleanerName: string, config: ITextCleanerConfig): Promise<void>;
    /**
     * Initialize default chains for each format
     */
    private initializeDefaultChains;
    /**
     * Create default chain for a format
     */
    private createDefaultChainForFormat;
    /**
     * Apply URL-specific configurations to a chain
     */
    private applyUrlConfigurations;
    /**
     * Store cleaning metadata for a URL
     */
    private storeCleaningMetadata;
    /**
     * Get recommended cleaners for a format
     */
    getRecommendedCleaners(format: TextFormat): ITextCleaner[];
    /**
     * Validate cleaner configuration
     */
    validateConfiguration(cleanerName: string, config: ITextCleanerConfig): boolean;
    /**
     * Get orchestrator statistics
     */
    getStats(): {
        registeredCleaners: number;
        defaultChains: number;
        supportedFormats: number;
    };
    /**
     * Apply template configuration to URLs matching a pattern
     */
    applyConfigurationTemplate(pattern: string | RegExp, cleanerName: string, config: ITextCleanerConfig): Promise<number>;
    /**
     * Export all configurations
     */
    exportConfigurations(): {
        registry: Record<string, any>;
        defaultChains: Record<string, any>;
    };
}
//# sourceMappingURL=TextCleaningOrchestrator.d.ts.map