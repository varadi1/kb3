/**
 * Document processor for Word documents (DOCX)
 * Single Responsibility: Processes Microsoft Word documents
 */

import * as mammoth from 'mammoth';
import { BaseProcessor } from './BaseProcessor';
import {
  ProcessingOptions,
  ProcessedContent,
  ExtractedImage,
  ExtractedTable
} from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';

export class DocumentProcessor extends BaseProcessor {
  constructor(maxTextLength: number = 1000000) {
    super([ContentType.DOCX], maxTextLength);
  }

  protected async performProcessing(
    content: Buffer | string,
    _contentType: ContentType,
    options: ProcessingOptions
  ): Promise<ProcessedContent> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    try {
      const result = await mammoth.extractRawText(buffer as any);
      const text = this.cleanText(result.value);

      // Also extract with styles for better structure analysis
      const htmlResult = await mammoth.convertToHtml(buffer as any);
      const structuredData = this.processHtmlContent(htmlResult.value, options);

      const title = options.extractMetadata ? this.extractTitle(text) : undefined;
      const links = options.extractLinks ? this.extractLinks(text) : [];
      const tables = structuredData.tables;
      const structure = options.extractMetadata ? this.extractStructure(text) : undefined;
      const metadata = this.extractDocumentMetadata(result, htmlResult, options);

      return this.createProcessedContent(
        text,
        title,
        metadata,
        structuredData.images,
        links,
        tables,
        structure
      );
    } catch (error: any) {
      throw new Error(`Document processing failed: ${error.message}`);
    }
  }

  private processHtmlContent(html: string, options: ProcessingOptions): StructuredDocumentData {
    // Use a simple HTML parser since mammoth generates clean HTML
    const images = options.extractImages ? this.extractImagesFromHtml(html) : [];
    const tables = this.extractTablesFromHtml(html);

    return {
      images,
      tables
    };
  }

  private extractImagesFromHtml(html: string): ExtractedImage[] {
    const images: ExtractedImage[] = [];
    const imgRegex = /<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*>/gi;
    let match;

    while ((match = imgRegex.exec(html)) !== null) {
      const src = match[1];
      const alt = match[2];

      images.push({
        src,
        alt,
        caption: alt
      });
    }

    return images;
  }

  private extractTablesFromHtml(html: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];

    // Simple table extraction from mammoth-generated HTML
    const tableRegex = /<table[^>]*>(.*?)<\/table>/gis;
    let tableMatch;

    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      const table = this.parseTableFromHtml(tableHtml);
      if (table) {
        tables.push(table);
      }
    }

    return tables;
  }

  private parseTableFromHtml(tableHtml: string): ExtractedTable | null {
    const rows: string[][] = [];
    const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis;
    let rowMatch;

    while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
      const rowHtml = rowMatch[1];
      const cells: string[] = [];
      const cellRegex = /<t[dh][^>]*>(.*?)<\/t[dh]>/gis;
      let cellMatch;

      while ((cellMatch = cellRegex.exec(rowHtml)) !== null) {
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, '') // Remove HTML tags
          .replace(/&nbsp;/g, ' ') // Replace non-breaking spaces
          .trim();
        cells.push(cellText);
      }

      if (cells.length > 0) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return null;

    // Assume first row is headers
    const headers = rows[0];
    const dataRows = rows.slice(1);

    return {
      headers,
      rows: dataRows
    };
  }

  private extractDocumentMetadata(
    textResult: any,
    htmlResult: any,
    _options: ProcessingOptions
  ): Record<string, any> {
    const metadata: Record<string, any> = {
      contentType: ContentType.DOCX,
      characterCount: textResult.value.length,
      wordCount: this.countWords(textResult.value)
    };

    // Add conversion messages/warnings from mammoth
    if (textResult.messages && textResult.messages.length > 0) {
      metadata.conversionMessages = textResult.messages.map((msg: any) => ({
        type: msg.type,
        message: msg.message
      }));
    }

    if (htmlResult.messages && htmlResult.messages.length > 0) {
      metadata.htmlConversionMessages = htmlResult.messages.map((msg: any) => ({
        type: msg.type,
        message: msg.message
      }));
    }

    // Analyze document structure from HTML
    const structureInfo = this.analyzeDocumentStructure(htmlResult.value);
    metadata.structure = structureInfo;

    return metadata;
  }

  private analyzeDocumentStructure(html: string): Record<string, any> {
    return {
      hasHeadings: /<h[1-6][^>]*>/i.test(html),
      headingCount: (html.match(/<h[1-6][^>]*>/gi) || []).length,
      paragraphCount: (html.match(/<p[^>]*>/gi) || []).length,
      tableCount: (html.match(/<table[^>]*>/gi) || []).length,
      listCount: (html.match(/<[ou]l[^>]*>/gi) || []).length,
      imageCount: (html.match(/<img[^>]*>/gi) || []).length,
      hasFormatting: this.hasRichFormatting(html)
    };
  }

  private hasRichFormatting(html: string): boolean {
    const formattingTags = ['<strong>', '<em>', '<u>', '<b>', '<i>', '<sup>', '<sub>'];
    return formattingTags.some(tag => html.includes(tag));
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}

interface StructuredDocumentData {
  images: ExtractedImage[];
  tables: ExtractedTable[];
}