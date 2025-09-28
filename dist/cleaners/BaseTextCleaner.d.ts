/**
 * Base abstract class for text cleaners - Template Method Pattern
 * Single Responsibility: Common cleaner functionality
 * Open/Closed: Extended by concrete cleaners, not modified
 */
import { ITextCleaner, ITextCleanerConfig, ITextCleaningResult, IConfigValidationResult, TextFormat } from '../interfaces/ITextCleaner';
export declare abstract class BaseTextCleaner implements ITextCleaner {
    readonly name: string;
    readonly description: string;
    readonly supportedFormats: TextFormat[];
    readonly defaultConfig: ITextCleanerConfig;
    protected config: ITextCleanerConfig;
    constructor(name: string, description: string, supportedFormats: TextFormat[], defaultConfig: ITextCleanerConfig);
    /**
     * Template method for cleaning text
     */
    clean(input: string, config?: ITextCleanerConfig): Promise<ITextCleaningResult>;
    /**
     * Check if this cleaner can handle the input
     */
    canClean(input: string, format: TextFormat): boolean;
    /**
     * Get current configuration
     */
    getConfig(): ITextCleanerConfig;
    /**
     * Update configuration
     */
    updateConfig(config: Partial<ITextCleanerConfig>): void;
    /**
     * Validate configuration
     */
    validateConfig(config: ITextCleanerConfig): IConfigValidationResult;
    /**
     * Abstract method for the main cleaning logic
     */
    protected abstract performCleaning(input: string, config: ITextCleanerConfig): Promise<string>;
    /**
     * Optional pre-processing step
     */
    protected preProcess(input: string, _config: ITextCleanerConfig): Promise<string>;
    /**
     * Optional post-processing step
     */
    protected postProcess(input: string, _config: ITextCleanerConfig): Promise<string>;
    /**
     * Validate input before processing
     */
    protected validateInput(input: string, config: ITextCleanerConfig): boolean;
    /**
     * Merge configurations
     */
    protected mergeConfig(config?: ITextCleanerConfig): ITextCleanerConfig;
    /**
     * Create cleaning result
     */
    protected createResult(original: string, cleaned: string, config: ITextCleanerConfig, processingTime: number): ITextCleaningResult;
    /**
     * Calculate cleaning statistics (can be overridden)
     */
    protected calculateStatistics(original: string, cleaned: string): any;
    /**
     * Generate warnings if needed (can be overridden)
     */
    protected generateWarnings(_original: string, _cleaned: string): string[] | undefined;
    /**
     * Subclasses can override to add specific config validation
     */
    protected validateSpecificConfig(_config: ITextCleanerConfig, _errors: string[], _warnings: string[]): void;
}
//# sourceMappingURL=BaseTextCleaner.d.ts.map