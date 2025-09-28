/**
 * Text content processor
 * Single Responsibility: Processes plain text and text-based formats
 */
import { BaseProcessor } from './BaseProcessor';
import { ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare class TextProcessor extends BaseProcessor {
    constructor(maxTextLength?: number);
    protected performProcessing(content: Buffer | string, contentType: ContentType, options: ProcessingOptions): Promise<ProcessedContent>;
    private extractTextContent;
    private processJsonContent;
    private formatJsonForReading;
    private processXmlContent;
    private processCsvContent;
    private parseCsvLine;
    private extractTables;
    private extractCsvTable;
    private extractMarkdownTables;
    private parseMarkdownTable;
    private parseTableRow;
    private extractMetadata;
    private countWords;
    private detectTextEncoding;
    private analyzeJsonStructure;
    private analyzeCsvStructure;
}
//# sourceMappingURL=TextProcessor.d.ts.map