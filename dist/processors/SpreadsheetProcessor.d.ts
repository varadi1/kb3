/**
 * Spreadsheet processor for Excel documents (XLSX, XLS)
 * Single Responsibility: Processes Microsoft Excel spreadsheets
 */
import { BaseProcessor } from './BaseProcessor';
import { ProcessingOptions, ProcessedContent } from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
export declare class SpreadsheetProcessor extends BaseProcessor {
    constructor(maxTextLength?: number);
    protected performProcessing(content: Buffer | string, _contentType: ContentType, options: ProcessingOptions): Promise<ProcessedContent>;
    private processWorkbook;
    private processSheet;
    private findDataBounds;
    private trimData;
    private createTableFromSheet;
    private looksLikeHeaders;
    private generateTextFromSheet;
    private generateTextFromWorkbook;
    private extractTitleFromWorkbook;
    private createWorkbookStructure;
    private analyzeCellTypes;
    private looksLikeDate;
    private extractSpreadsheetMetadata;
    private generateSheetId;
}
//# sourceMappingURL=SpreadsheetProcessor.d.ts.map