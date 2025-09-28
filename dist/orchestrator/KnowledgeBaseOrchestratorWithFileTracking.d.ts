/**
 * Open/Closed Principle: Extends base orchestrator without modifying it
 * Single Responsibility: Adds original file tracking to the orchestration process
 */
import { KnowledgeBaseOrchestrator } from './KnowledgeBaseOrchestrator';
import { IOriginalFileRepository } from '../interfaces/IOriginalFileRepository';
import { IUrlDetector } from '../interfaces/IUrlDetector';
import { IContentFetcher } from '../interfaces/IContentFetcher';
import { IContentProcessor } from '../interfaces/IContentProcessor';
import { IFileStorage } from '../interfaces/IFileStorage';
import { IKnowledgeStore } from '../interfaces/IKnowledgeStore';
import { IUrlRepository } from '../interfaces/IUrlRepository';
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
import { ProcessingOptions } from '../interfaces/IContentProcessor';
export declare class KnowledgeBaseOrchestratorWithFileTracking extends KnowledgeBaseOrchestrator {
    private originalFileRepository;
    constructor(urlDetector: IUrlDetector, contentFetcher: IContentFetcher, contentProcessor: IContentProcessor, knowledgeStore: IKnowledgeStore, fileStorage: IFileStorage, urlRepository: IUrlRepository | undefined, contentChangeDetector: IContentChangeDetector | undefined, originalFileRepository: IOriginalFileRepository);
    /**
     * Override processUrl to add file tracking
     */
    processUrl(url: string, options?: ProcessingOptions): Promise<any>;
    /**
     * Get the original file repository for direct access
     */
    getOriginalFileRepository(): IOriginalFileRepository;
}
//# sourceMappingURL=KnowledgeBaseOrchestratorWithFileTracking.d.ts.map