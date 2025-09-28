/**
 * Enhanced orchestrator with tag support for batch operations
 * Open/Closed: Extends KnowledgeBaseOrchestrator without modifying it
 * Single Responsibility: Adds tag-based batch processing capabilities
 */
import { KnowledgeBaseOrchestrator } from './KnowledgeBaseOrchestrator';
import { SqlUrlRepositoryWithTags, UrlMetadataWithTags } from '../storage/SqlUrlRepositoryWithTags';
import { IUrlDetector } from '../interfaces/IUrlDetector';
import { IContentFetcher } from '../interfaces/IContentFetcher';
import { IContentProcessor } from '../interfaces/IContentProcessor';
import { IKnowledgeStore } from '../interfaces/IKnowledgeStore';
import { IFileStorage } from '../interfaces/IFileStorage';
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
import { ProcessingOptions, ProcessingResult } from '../interfaces/IOrchestrator';
import { ITag } from '../interfaces/ITag';
export interface ProcessingOptionsWithTags extends ProcessingOptions {
    tags?: string[];
}
export interface UrlWithTags {
    url: string;
    tags?: string[];
    metadata?: UrlMetadataWithTags;
}
export interface BatchProcessingByTagOptions extends ProcessingOptions {
    includeChildTags?: boolean;
    requireAllTags?: boolean;
}
export declare class KnowledgeBaseOrchestratorWithTags extends KnowledgeBaseOrchestrator {
    private urlRepositoryWithTags?;
    constructor(urlDetector: IUrlDetector, contentFetcher: IContentFetcher, contentProcessor: IContentProcessor, knowledgeStore: IKnowledgeStore, fileStorage: IFileStorage, urlRepository?: SqlUrlRepositoryWithTags, contentChangeDetector?: IContentChangeDetector);
    /**
     * Process a single URL with optional tags
     */
    processUrlWithTags(url: string, options?: ProcessingOptionsWithTags): Promise<ProcessingResult>;
    /**
     * Process multiple URLs with tags
     */
    processUrlsWithTags(urlsWithTags: UrlWithTags[], globalOptions?: ProcessingOptions): Promise<ProcessingResult[]>;
    /**
     * Process all URLs with specific tags
     */
    processUrlsByTags(tagNames: string[], options?: BatchProcessingByTagOptions): Promise<ProcessingResult[]>;
    /**
     * Add tags to a URL
     */
    addTagsToUrl(url: string, tagNames: string[]): Promise<boolean>;
    /**
     * Remove tags from a URL
     */
    removeTagsFromUrl(url: string, tagNames: string[]): Promise<boolean>;
    /**
     * Get all tags for a URL
     */
    getUrlTags(url: string): Promise<ITag[]>;
    /**
     * Create a new tag
     */
    createTag(name: string, parentName?: string, description?: string): Promise<ITag>;
    /**
     * List all tags
     */
    listTags(): Promise<ITag[]>;
    /**
     * Delete a tag
     */
    deleteTag(tagName: string, deleteChildren?: boolean): Promise<boolean>;
    /**
     * Get tag hierarchy
     */
    getTagHierarchy(tagName: string): Promise<ITag[]>;
}
//# sourceMappingURL=KnowledgeBaseOrchestratorWithTags.d.ts.map