/**
 * Factory for creating knowledge base with original file tracking
 * Dependency Inversion Principle: Depends on abstractions, not concretions
 * Open/Closed Principle: Extends existing factory without modifying it
 */
import { KnowledgeBaseConfig } from '../config/Configuration';
import { KnowledgeBaseOrchestrator } from '../orchestrator/KnowledgeBaseOrchestrator';
import { IOriginalFileRepository } from '../interfaces/IOriginalFileRepository';
export interface KnowledgeBaseConfigWithFileTracking extends KnowledgeBaseConfig {
    /**
     * Configuration for original file tracking
     */
    storage: KnowledgeBaseConfig['storage'] & {
        originalFileStore?: {
            type?: 'sql';
            path?: string;
        };
    };
}
export interface KnowledgeBaseWithFileTracking extends KnowledgeBaseOrchestrator {
    getOriginalFileRepository(): IOriginalFileRepository;
}
export declare class KnowledgeBaseFactoryWithFileTracking {
    /**
     * Creates a knowledge base with original file tracking capability
     * Wraps the file storage to track original files
     */
    static createKnowledgeBaseWithFileTracking(config: KnowledgeBaseConfigWithFileTracking): Promise<KnowledgeBaseWithFileTracking>;
    /**
     * Creates with default SQL configuration
     */
    static createDefault(): Promise<KnowledgeBaseWithFileTracking>;
}
//# sourceMappingURL=KnowledgeBaseFactoryWithFileTracking.d.ts.map