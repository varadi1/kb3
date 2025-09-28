/**
 * Batch configuration manager for scraper parameters
 * Single Responsibility: Manages batch configuration operations
 * Open/Closed Principle: Extensible for new configuration strategies
 */
import { ScraperParameterManager } from './ScraperParameterManager';
import { ScraperSelector } from './ScraperSelector';
import { ScraperConfiguration } from '../interfaces/IScraperParameters';
/**
 * Batch operation for configuring scrapers
 */
export interface BatchOperation {
    type: 'set' | 'update' | 'remove' | 'clear';
    urls?: string[];
    patterns?: string[];
    configuration?: ScraperConfiguration;
    updateFn?: (current: ScraperConfiguration) => ScraperConfiguration;
}
/**
 * Configuration preset for common use cases
 */
export interface ConfigurationPreset {
    name: string;
    description: string;
    configuration: ScraperConfiguration;
    urlPatterns?: string[];
    applicableScrapers?: string[];
}
/**
 * Batch configuration result
 */
export interface BatchConfigurationResult {
    successful: string[];
    failed: Array<{
        url: string;
        error: string;
    }>;
    totalProcessed: number;
    totalSuccessful: number;
    totalFailed: number;
}
export declare class BatchConfigurationManager {
    private parameterManager;
    private scraperSelector;
    private presets;
    constructor(parameterManager: ScraperParameterManager, scraperSelector: ScraperSelector);
    /**
     * Execute a batch operation
     */
    executeBatchOperation(operation: BatchOperation): BatchConfigurationResult;
    /**
     * Apply a preset configuration
     */
    applyPreset(presetName: string, urls: string[]): BatchConfigurationResult;
    /**
     * Configure URLs by domain
     */
    configureByDomain(domain: string, configuration: ScraperConfiguration): BatchConfigurationResult;
    /**
     * Configure URLs by file extension
     */
    configureByExtension(extension: string, configuration: ScraperConfiguration): BatchConfigurationResult;
    /**
     * Create a configuration builder for fluent API
     */
    createConfigurationBuilder(): ConfigurationBuilder;
    /**
     * Get all configured URLs with their configurations
     */
    getAllConfigurations(): Map<string, ScraperConfiguration>;
    /**
     * Import configurations from a Map
     */
    importConfigurations(configs: Map<string, ScraperConfiguration>): BatchConfigurationResult;
    /**
     * Export configurations to JSON
     */
    exportToJSON(): string;
    /**
     * Import configurations from JSON
     */
    importFromJSON(json: string): BatchConfigurationResult;
    private batchSet;
    private batchUpdate;
    private batchRemove;
    private resolveUrls;
    private matchesPattern;
    private initializePresets;
}
/**
 * Fluent configuration builder
 */
export declare class ConfigurationBuilder {
    private manager;
    private scraperType;
    private parameters;
    private priority?;
    private enabled;
    constructor(manager: BatchConfigurationManager);
    forScraper(scraperType: string): this;
    withParameters(parameters: any): this;
    withPriority(priority: number): this;
    enabled(value: boolean): this;
    applyTo(urls: string[]): BatchConfigurationResult;
    applyToPattern(pattern: string): BatchConfigurationResult;
    applyToDomain(domain: string): BatchConfigurationResult;
    applyToExtension(extension: string): BatchConfigurationResult;
}
//# sourceMappingURL=BatchConfigurationManager.d.ts.map