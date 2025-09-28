/**
 * Registry for content processors
 * Single Responsibility: Manages and coordinates multiple processors
 * Open/Closed Principle: Easy to add new processors
 * Dependency Inversion: Depends on IContentProcessor abstraction
 */
import { IContentProcessor, ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare class ProcessorRegistry implements IContentProcessor {
    private readonly processors;
    private readonly fallbackProcessor?;
    constructor(processors?: IContentProcessor[], fallbackProcessor?: IContentProcessor);
    /**
     * Checks if any processor can handle the content type
     * @param contentType The content type to check
     * @returns true if at least one processor can handle it
     */
    canProcess(contentType: ContentType): boolean;
    /**
     * Adds a new processor to the registry
     * @param processor The processor to add
     */
    addProcessor(processor: IContentProcessor): void;
    /**
     * Removes a processor from the registry
     * @param processor The processor to remove
     */
    removeProcessor(processor: IContentProcessor): boolean;
    /**
     * Processes content using the best available processor
     * @param content The content to process
     * @param contentType The type of content
     * @param options Processing options
     * @returns Promise resolving to processed content
     */
    process(content: Buffer | string, contentType: ContentType, options?: ProcessingOptions): Promise<ProcessedContent>;
    /**
     * Attempts to process using all capable processors and returns results
     * @param content The content to process
     * @param contentType The type of content
     * @param options Processing options
     * @returns Promise resolving to array of processing attempts
     */
    processAll(content: Buffer | string, contentType: ContentType, options?: ProcessingOptions): Promise<ProcessingAttempt[]>;
    /**
     * Gets the best processing result from multiple attempts
     * @param content The content to process
     * @param contentType The type of content
     * @param options Processing options
     * @returns Promise resolving to the best processing result
     */
    processBest(content: Buffer | string, contentType: ContentType, options?: ProcessingOptions): Promise<ProcessedContent>;
    /**
     * Gets information about registered processors
     * @returns Array of processor information
     */
    getProcessorInfo(): ProcessorInfo[];
    /**
     * Gets all supported content types across all processors
     * @returns Array of supported content types
     */
    getSupportedTypes(): ContentType[];
    /**
     * Finds processors that can handle a specific content type
     * @param contentType The content type to check
     * @returns Array of capable processors
     */
    getProcessorsForType(contentType: ContentType): string[];
    /**
     * Gets count of registered processors
     * @returns Number of registered processors
     */
    getProcessorCount(): number;
    /**
     * Sets a fallback processor
     * @param processor The fallback processor
     */
    setFallbackProcessor(processor: IContentProcessor): void;
    /**
     * Clears all registered processors
     */
    clear(): void;
    /**
     * Tests processing capabilities for a content type
     * @param contentType The content type to test
     * @returns Processing capability information
     */
    testCapabilities(contentType: ContentType): ProcessingCapabilities;
}
export interface ProcessingAttempt {
    processor: string;
    success: boolean;
    result?: ProcessedContent;
    error?: string;
    duration: number;
}
export interface ProcessorInfo {
    name: string;
    supportedTypes: ContentType[];
    maxTextLength: number | string;
}
export interface ProcessingCapabilities {
    contentType: ContentType;
    isSupported: boolean;
    processorCount: number;
    processors: string[];
    hasFallback: boolean;
}
//# sourceMappingURL=ProcessorRegistry.d.ts.map