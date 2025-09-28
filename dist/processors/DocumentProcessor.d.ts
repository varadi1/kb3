/**
 * Document processor for Word documents (DOCX)
 * Single Responsibility: Processes Microsoft Word documents
 */
import { BaseProcessor } from './BaseProcessor';
import { ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare class DocumentProcessor extends BaseProcessor {
    constructor(maxTextLength?: number);
    protected performProcessing(content: Buffer | string, _contentType: ContentType, options: ProcessingOptions): Promise<ProcessedContent>;
    private processHtmlContent;
    private extractImagesFromHtml;
    private extractTablesFromHtml;
    private parseTableFromHtml;
    private extractDocumentMetadata;
    private analyzeDocumentStructure;
    private hasRichFormatting;
    private countWords;
}
//# sourceMappingURL=DocumentProcessor.d.ts.map