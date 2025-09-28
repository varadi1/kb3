/**
 * Content Processor with Text Cleaning Integration
 * Decorator Pattern: Wraps existing processor with cleaning capabilities
 * Single Responsibility: Adds text cleaning to content processing
 */
import { IContentProcessor, ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
import { TextFormat, IChainResult } from '../interfaces/ITextCleaner';
import { TextCleaningOrchestrator } from '../cleaners/TextCleaningOrchestrator';
export interface ProcessingOptionsWithCleaning extends ProcessingOptions {
    textCleaning?: {
        enabled: boolean;
        cleanerNames?: string[];
        autoSelect?: boolean;
        url?: string;
        storeMetadata?: boolean;
        preserveOriginal?: boolean;
        format?: TextFormat;
    };
}
export interface ProcessedContentWithCleaning extends ProcessedContent {
    cleaningResult?: IChainResult;
    originalText?: string;
}
export declare class ContentProcessorWithCleaning implements IContentProcessor {
    private baseProcessor;
    private cleaningOrchestrator;
    constructor(baseProcessor: IContentProcessor, orchestrator?: TextCleaningOrchestrator);
    /**
     * Get supported content types (delegates to base processor)
     */
    getSupportedTypes(): ContentType[];
    /**
     * Check if can process content type (delegates to base processor)
     */
    canProcess(contentType: ContentType): boolean;
    /**
     * Process content with optional text cleaning
     */
    process(content: Buffer | string, contentType: ContentType, options?: ProcessingOptionsWithCleaning): Promise<ProcessedContentWithCleaning>;
    /**
     * Map content type to text format
     */
    private mapContentTypeToTextFormat;
    /**
     * Configure cleaners for a specific URL
     */
    configureCleanersForUrl(url: string, cleanerConfigs: Map<string, any>): Promise<void>;
    /**
     * Batch configure cleaners for multiple URLs
     */
    batchConfigureCleaners(urls: string[], cleanerName: string, config: any): Promise<void>;
    /**
     * Get cleaning configuration for a URL
     */
    getUrlCleaningConfig(url: string): Promise<Map<string, any>>;
    /**
     * Apply configuration template to URLs matching pattern
     */
    applyCleaningTemplate(urlPattern: string | RegExp, cleanerName: string, config: any): Promise<number>;
    /**
     * Get statistics about text cleaning
     */
    getCleaningStats(): any;
    /**
     * Export cleaning configurations
     */
    exportCleaningConfigurations(): any;
}
//# sourceMappingURL=ContentProcessorWithCleaning.d.ts.map