/**
 * Main orchestrator for the knowledge base system
 * Single Responsibility: Coordinates the entire processing pipeline
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */
import { IOrchestrator, ProcessingOptions, ProcessingResult, ProcessingStatus } from '../interfaces/IOrchestrator';
import { IUrlDetector } from '../interfaces/IUrlDetector';
import { IContentFetcher } from '../interfaces/IContentFetcher';
import { IContentProcessor } from '../interfaces/IContentProcessor';
import { IKnowledgeStore } from '../interfaces/IKnowledgeStore';
import { IFileStorage } from '../interfaces/IFileStorage';
import { IUrlRepository } from '../interfaces/IUrlRepository';
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
export declare class KnowledgeBaseOrchestrator implements IOrchestrator {
    private readonly urlDetector;
    private readonly contentFetcher;
    private readonly contentProcessor;
    private readonly knowledgeStore;
    private readonly fileStorage;
    private readonly urlRepository?;
    private readonly contentChangeDetector?;
    private readonly currentOperations;
    private processingStats;
    constructor(urlDetector: IUrlDetector, contentFetcher: IContentFetcher, contentProcessor: IContentProcessor, knowledgeStore: IKnowledgeStore, fileStorage: IFileStorage, urlRepository?: IUrlRepository, contentChangeDetector?: IContentChangeDetector);
    processUrl(url: string, options?: ProcessingOptions): Promise<ProcessingResult>;
    processUrls(urls: string[], options?: ProcessingOptions): Promise<ProcessingResult[]>;
    /**
     * Process URLs with individual rate limit configurations
     * @param urlConfigs Array of URL configurations with individual settings
     * @param globalOptions Global options applied to all URLs
     */
    processUrlsWithConfigs(urlConfigs: Array<{
        url: string;
        rateLimitMs?: number;
        scraperOptions?: any;
        processingOptions?: ProcessingOptions;
    }>, globalOptions?: ProcessingOptions): Promise<ProcessingResult[]>;
    reprocessEntry(entryId: string, options?: ProcessingOptions): Promise<ProcessingResult>;
    getStatus(): Promise<ProcessingStatus>;
    private detectUrl;
    private fetchContent;
    private processContent;
    private storeFile;
    private indexKnowledge;
    private generateEntryId;
    private generateOperationId;
    private hashUrl;
    private calculateContentHash;
    private startOperation;
    private updateOperationStage;
    private completeOperation;
    private failOperation;
    private getCurrentStage;
    private calculateProgress;
    private getCompletedStages;
    private createProcessingError;
    private enhanceError;
    private mapFetchErrorToCode;
    private generateFilename;
    private getExtensionFromMimeType;
    private extractTitleFromUrl;
    private extractTags;
    /**
     * Gets processing statistics
     * @returns Processing statistics
     */
    getProcessingStats(): ProcessingStats;
    /**
     * Resets processing statistics
     */
    resetStats(): void;
    /**
     * Gets current operations count
     * @returns Number of currently processing operations
     */
    getCurrentOperationsCount(): number;
    /**
     * Cancels all current operations (graceful shutdown)
     */
    cancelAllOperations(): Promise<void>;
}
export interface ProcessingStats {
    totalProcessed: number;
    successful: number;
    failed: number;
}
//# sourceMappingURL=KnowledgeBaseOrchestrator.d.ts.map