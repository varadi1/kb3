/**
 * Enhanced factory for creating knowledge base components with tag support
 * Open/Closed: Extends KnowledgeBaseFactory without modifying it
 * Dependency Injection: Provides tag-aware implementations when requested
 */
import { KnowledgeBaseConfig } from '../config/Configuration';
import { KnowledgeBaseOrchestratorWithTags } from '../orchestrator/KnowledgeBaseOrchestratorWithTags';
export interface KnowledgeBaseConfigWithTags extends KnowledgeBaseConfig {
    /**
     * Enable tag support for URL organization
     */
    enableTags?: boolean;
    /**
     * Database path for tags (defaults to same as URL repository)
     */
    tagDbPath?: string;
}
export declare class KnowledgeBaseFactoryWithTags {
    /**
     * Creates a fully configured knowledge base orchestrator with tag support
     * @param config System configuration with tag support
     * @returns Configured orchestrator with tags
     */
    static createKnowledgeBaseWithTags(config: KnowledgeBaseConfigWithTags): KnowledgeBaseOrchestratorWithTags;
    /**
     * Creates URL repository with tag support
     * @param config System configuration
     * @returns URL repository with tags
     */
    private static createUrlRepositoryWithTags;
    /**
     * Creates URL detector based on configuration
     * @param config System configuration
     * @returns URL detector registry
     */
    private static createUrlDetector;
    /**
     * Creates content fetcher based on configuration
     * @param config System configuration
     * @returns Content fetcher
     */
    private static createContentFetcher;
    /**
     * Creates content processor based on configuration
     * @param config System configuration
     * @returns Content processor registry
     */
    private static createContentProcessor;
    /**
     * Creates knowledge store based on configuration
     * @param config System configuration
     * @returns Knowledge store implementation
     */
    private static createKnowledgeStore;
    /**
     * Creates file storage based on configuration
     * @param config System configuration
     * @returns File storage implementation
     */
    private static createFileStorage;
    /**
     * Creates content change detector
     * @param config System configuration
     * @param urlRepository URL repository (if available)
     * @returns Content change detector
     */
    private static createContentChangeDetector;
}
//# sourceMappingURL=KnowledgeBaseFactoryWithTags.d.ts.map