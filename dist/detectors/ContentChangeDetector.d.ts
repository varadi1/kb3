/**
 * Content change detector implementation using URL repository
 * Single Responsibility: Detects if content at URLs has changed
 * Dependency Inversion: Depends on IUrlRepository abstraction
 */
import { IContentChangeDetector, ContentChangeResult } from '../interfaces/IContentChangeDetector';
import { IUrlRepository } from '../interfaces/IUrlRepository';
export declare class ContentChangeDetector implements IContentChangeDetector {
    private readonly urlRepository;
    constructor(urlRepository: IUrlRepository);
    /**
     * Check if content at a URL has changed since last check
     */
    hasContentChanged(url: string, currentHash: string, metadata?: Record<string, any>): Promise<ContentChangeResult>;
    /**
     * Record that content was processed
     */
    recordContentProcessed(url: string, contentHash: string, metadata?: Record<string, any>): Promise<void>;
    /**
     * Get the last known hash for a URL
     */
    getLastKnownHash(url: string): Promise<string | null>;
    /**
     * Clear the change history for a URL
     */
    clearHistory(url: string): Promise<void>;
}
//# sourceMappingURL=ContentChangeDetector.d.ts.map