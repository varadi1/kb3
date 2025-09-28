/**
 * Base class for content processors
 * Template Method Pattern + Single Responsibility Principle
 */
import { IContentProcessor, ProcessingOptions, ProcessedContent, ExtractedImage, ExtractedLink, ExtractedTable, ContentStructure } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare abstract class BaseProcessor implements IContentProcessor {
    protected readonly supportedTypes: ContentType[];
    protected readonly maxTextLength: number;
    constructor(supportedTypes: ContentType[], maxTextLength?: number);
    getSupportedTypes(): ContentType[];
    canProcess(contentType: ContentType): boolean;
    process(content: Buffer | string, contentType: ContentType, options?: ProcessingOptions): Promise<ProcessedContent>;
    protected abstract performProcessing(content: Buffer | string, contentType: ContentType, options: ProcessingOptions): Promise<ProcessedContent>;
    protected mergeOptions(options: ProcessingOptions): ProcessingOptions;
    protected validateOptions(options: ProcessingOptions): void;
    protected createProcessedContent(text: string, title?: string, metadata?: Record<string, any>, images?: ExtractedImage[], links?: ExtractedLink[], tables?: ExtractedTable[], structure?: ContentStructure): ProcessedContent;
    protected truncateText(text: string, maxLength: number): string;
    protected extractTitle(text: string): string | undefined;
    protected extractLinks(text: string): ExtractedLink[];
    protected cleanText(text: string): string;
    protected normalizeWhitespace(text: string): string;
    protected extractStructure(text: string): ContentStructure | undefined;
    private extractHeadings;
    private extractSections;
    private findHeadingLine;
    private generateId;
    protected detectEncoding(buffer: Buffer): string;
    /**
     * Gets the maximum text length this processor will handle
     * @returns Maximum text length
     */
    getMaxTextLength(): number;
}
//# sourceMappingURL=BaseProcessor.d.ts.map