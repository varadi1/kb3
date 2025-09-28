/**
 * RTF (Rich Text Format) processor
 * Single Responsibility: Processes RTF documents
 * Open/Closed: Extends BaseProcessor
 */
import { BaseProcessor } from './BaseProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
import { ProcessedContent, ProcessingOptions } from '../interfaces/IContentProcessor';
export declare class RtfProcessor extends BaseProcessor {
    constructor();
    protected performProcessing(content: Buffer | string, _contentType: ContentType, _options: ProcessingOptions): Promise<ProcessedContent>;
    /**
     * Extracts plain text from RTF content
     * RTF format uses control words starting with backslash
     */
    private extractPlainTextFromRtf;
    /**
     * Extracts metadata from RTF content
     */
    private extractRtfMetadata;
    /**
     * Cleans RTF control words from a string
     */
    private cleanRtfString;
    /**
     * Counts words in text
     */
    private countWords;
}
//# sourceMappingURL=RtfProcessor.d.ts.map