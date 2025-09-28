/**
 * PDF content processor
 * Single Responsibility: Processes PDF documents and extracts text content
 */
import { BaseProcessor } from './BaseProcessor';
import { ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare class PdfProcessor extends BaseProcessor {
    constructor(maxTextLength?: number);
    protected performProcessing(content: Buffer | string, _contentType: ContentType, options: ProcessingOptions): Promise<ProcessedContent>;
    private extractTitleFromPdf;
    private extractTablesFromPdfText;
    private detectTableInLines;
    private analyzeColumnStructure;
    private arePatternsSimilar;
    private extractColumnsFromLine;
    private extractPdfMetadata;
    private countWords;
    private detectTablePresence;
    private calculateAverageLineLength;
}
//# sourceMappingURL=PdfProcessor.d.ts.map