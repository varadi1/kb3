/**
 * HTML content processor
 * Single Responsibility: Processes HTML content and extracts structured data
 */
import { BaseProcessor } from './BaseProcessor';
import { ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare class HtmlProcessor extends BaseProcessor {
    constructor(maxTextLength?: number);
    protected performProcessing(content: Buffer | string, _contentType: ContentType, options: ProcessingOptions): Promise<ProcessedContent>;
    private extractTextContent;
    private extractFormattedText;
    private extractHtmlTitle;
    private extractHtmlLinks;
    private extractImages;
    private extractTables;
    private extractHtmlStructure;
    private extractMetadata;
    private isValidUrl;
    private parseNumber;
    private generateHtmlId;
}
//# sourceMappingURL=HtmlProcessor.d.ts.map