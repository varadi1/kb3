/**
 * Text Cleaner Registry - Singleton Pattern
 * Single Responsibility: Manage registration and retrieval of text cleaners
 * Open/Closed: New cleaners can be added without modifying the registry
 */
import { ITextCleaner, ITextCleanerRegistry, TextFormat } from '../interfaces/ITextCleaner';
export declare class TextCleanerRegistry implements ITextCleanerRegistry {
    private static instance;
    private cleaners;
    private constructor();
    /**
     * Get singleton instance
     */
    static getInstance(): TextCleanerRegistry;
    /**
     * Register a new cleaner
     */
    register(cleaner: ITextCleaner): void;
    /**
     * Unregister a cleaner
     */
    unregister(cleanerName: string): void;
    /**
     * Get a cleaner by name
     */
    getCleaner(cleanerName: string): ITextCleaner | undefined;
    /**
     * Get all registered cleaners
     */
    getAllCleaners(): ITextCleaner[];
    /**
     * Get cleaners that support a specific format
     */
    getCleanersForFormat(format: TextFormat): ITextCleaner[];
    /**
     * Check if a cleaner is registered
     */
    hasClleaner(cleanerName: string): boolean;
    /**
     * Clear all registered cleaners
     */
    clear(): void;
    /**
     * Get registry statistics
     */
    getStats(): {
        totalCleaners: number;
        cleanersByFormat: Map<TextFormat, number>;
        enabledCleaners: number;
    };
    /**
     * Initialize with default cleaners
     */
    initializeDefaultCleaners(): void;
    /**
     * Get cleaners sorted by priority
     */
    getCleanersByPriority(ascending?: boolean): ITextCleaner[];
    /**
     * Export registry configuration
     */
    exportConfiguration(): Record<string, any>;
    /**
     * Import registry configuration
     */
    importConfiguration(config: Record<string, any>): void;
}
//# sourceMappingURL=TextCleanerRegistry.d.ts.map