/**
 * Unified factory for creating knowledge base components with all features
 * Single Responsibility: Creates and wires up system components
 * Dependency Injection: Provides concrete implementations based on configuration
 *
 * Features included:
 * - Tag support for URL organization
 * - Original file tracking with repository
 * - Standard knowledge base functionality
 */
import { KnowledgeBaseConfig } from '../config/Configuration';
import { KnowledgeBaseOrchestratorWithTags } from '../orchestrator/KnowledgeBaseOrchestratorWithTags';
import { IOriginalFileRepository } from '../interfaces/IOriginalFileRepository';
/**
 * Extended configuration interface with all features
 */
export interface KnowledgeBaseConfigExtended extends KnowledgeBaseConfig {
    /**
     * Enable tag support for URL organization (always enabled now)
     */
    enableTags?: boolean;
    /**
     * Database path for tags (defaults to same as URL repository)
     */
    tagDbPath?: string;
    /**
     * Configuration for original file tracking (always enabled now)
     */
    storage: KnowledgeBaseConfig['storage'] & {
        originalFileStore?: {
            type?: 'sql';
            path?: string;
        };
    };
}
/**
 * Knowledge base with both file tracking and tag support
 */
export interface KnowledgeBaseWithFullFeatures extends KnowledgeBaseOrchestratorWithTags {
    getOriginalFileRepository(): IOriginalFileRepository;
}
export declare class KnowledgeBaseFactory {
    /**
     * Creates a fully configured knowledge base orchestrator with all features
     * Now includes tag support and file tracking by default
     * @param config System configuration
     * @returns Configured orchestrator with all features
     */
    static createKnowledgeBase(config: KnowledgeBaseConfigExtended): Promise<KnowledgeBaseWithFullFeatures>;
    /**
     * Creates URL detector based on configuration
     * @param config System configuration
     * @returns URL detector registry
     */
    private static createUrlDetector;
    /**
     * Creates content fetcher based on configuration
     * @param config System configuration
     * @returns Content fetcher registry
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
     * Creates URL repository with tag support (always enabled now)
     * @param config System configuration
     * @returns URL repository with tags
     */
    private static createUrlRepositoryWithTags;
    /**
     * Creates content change detector if enabled
     * @param config System configuration
     * @param urlRepository URL repository instance
     * @returns Content change detector or undefined
     */
    private static createContentChangeDetector;
    /**
     * Creates a knowledge base with default configuration (with all features)
     * @returns Knowledge base with default settings and all features
     */
    static createDefaultKnowledgeBase(): Promise<KnowledgeBaseWithFullFeatures>;
    /**
     * Creates a knowledge base for production use (with all features)
     * @returns Knowledge base with production settings and all features
     */
    static createProductionKnowledgeBase(): Promise<KnowledgeBaseWithFullFeatures>;
    /**
     * Creates a knowledge base for development use (with all features)
     * @returns Knowledge base with development settings and all features
     */
    static createDevelopmentKnowledgeBase(): Promise<KnowledgeBaseWithFullFeatures>;
    /**
     * Creates with default SQL configuration and all features
     */
    static createDefault(): Promise<KnowledgeBaseWithFullFeatures>;
    /**
     * Backward compatibility: Creates a knowledge base with tags support
     * @deprecated Use createKnowledgeBase instead (tags are always included)
     */
    static createKnowledgeBaseWithTags(config: KnowledgeBaseConfigExtended): Promise<KnowledgeBaseWithFullFeatures>;
    /**
     * Backward compatibility: Creates a knowledge base with file tracking
     * @deprecated Use createKnowledgeBase instead (file tracking is always included)
     */
    static createKnowledgeBaseWithFileTracking(config: KnowledgeBaseConfigExtended): Promise<KnowledgeBaseWithFullFeatures>;
}
/**
 * Backward compatibility export for KnowledgeBaseFactoryWithTags
 * @deprecated Use KnowledgeBaseFactory instead (tags are always included)
 */
export declare class KnowledgeBaseFactoryWithTags extends KnowledgeBaseFactory {
}
/**
 * Backward compatibility export for KnowledgeBaseFactoryWithFileTracking
 * @deprecated Use KnowledgeBaseFactory instead (file tracking is always included)
 */
export declare class KnowledgeBaseFactoryWithFileTracking extends KnowledgeBaseFactory {
}
/**
 * Backward compatibility type exports
 */
export type KnowledgeBaseConfigWithTags = KnowledgeBaseConfigExtended;
export type KnowledgeBaseConfigWithFileTracking = KnowledgeBaseConfigExtended;
export type KnowledgeBaseWithFileTracking = KnowledgeBaseWithFullFeatures;
//# sourceMappingURL=KnowledgeBaseFactory.d.ts.map