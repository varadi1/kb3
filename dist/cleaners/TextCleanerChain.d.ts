/**
 * Text Cleaner Chain - Chain of Responsibility Pattern
 * Single Responsibility: Sequential text processing through cleaners
 */
import { ITextCleaner, ITextCleanerChain, ITextCleanerConfig, IChainResult, TextFormat } from '../interfaces/ITextCleaner';
export declare class TextCleanerChain implements ITextCleanerChain {
    private cleaners;
    /**
     * Add a cleaner to the chain
     */
    addCleaner(cleaner: ITextCleaner, config?: ITextCleanerConfig): ITextCleanerChain;
    /**
     * Remove a cleaner from the chain
     */
    removeCleaner(cleanerName: string): ITextCleanerChain;
    /**
     * Process text through the chain
     */
    process(input: string, format: TextFormat): Promise<IChainResult>;
    /**
     * Get all cleaners in the chain
     */
    getCleaners(): ITextCleaner[];
    /**
     * Clear all cleaners from the chain
     */
    clear(): void;
    /**
     * Sort cleaners by priority (higher priority = earlier execution)
     */
    private sortByPriority;
    /**
     * Check if processing should stop
     */
    private shouldStopProcessing;
    /**
     * Check if error is critical
     */
    private isCriticalError;
    /**
     * Get chain configuration
     */
    getConfiguration(): Array<{
        cleanerName: string;
        config: ITextCleanerConfig;
    }>;
    /**
     * Update cleaner configuration in the chain
     */
    updateCleanerConfig(cleanerName: string, config: Partial<ITextCleanerConfig>): void;
    /**
     * Clone the chain
     */
    clone(): TextCleanerChain;
    /**
     * Get chain statistics
     */
    getStats(): {
        totalCleaners: number;
        enabledCleaners: number;
        supportedFormats: Set<TextFormat>;
        averagePriority: number;
    };
}
//# sourceMappingURL=TextCleanerChain.d.ts.map