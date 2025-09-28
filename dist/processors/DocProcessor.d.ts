/**
 * DOC processor for legacy Microsoft Word documents
 * Single Responsibility: Processes legacy DOC files (binary format)
 * Note: DOC files are complex binary format, we extract what text we can
 */
import { BaseProcessor } from './BaseProcessor';
import { ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare class DocProcessor extends BaseProcessor {
    constructor(maxTextLength?: number);
    protected performProcessing(content: Buffer | string, _contentType: ContentType, options: ProcessingOptions): Promise<ProcessedContent>;
    /**
     * Extract readable text from DOC binary format
     * This is a simplified extraction that looks for text patterns
     * A complete implementation would require parsing the FIB and Word Document Stream
     */
    private extractTextFromDoc;
    /**
     * Alternative text extraction method for ASCII content
     */
    private extractAsciiText;
    private extractDocMetadata;
    /**
     * Attempt to extract basic document properties
     * This is a simplified approach - full implementation would parse the property streams
     */
    private extractBasicProperties;
    private cleanPropertyValue;
    private countWords;
}
//# sourceMappingURL=DocProcessor.d.ts.map