/**
 * Text content processor
 * Single Responsibility: Processes plain text and text-based formats
 */

import { BaseProcessor } from './BaseProcessor';
import {
  ProcessingOptions,
  ProcessedContent,
  ExtractedTable
} from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';

export class TextProcessor extends BaseProcessor {
  constructor(maxTextLength: number = 1000000) {
    super([
      ContentType.TXT,
      ContentType.CSV,
      ContentType.JSON,
      ContentType.XML,
      ContentType.MARKDOWN
    ], maxTextLength);
  }

  protected async performProcessing(
    content: Buffer | string,
    contentType: ContentType,
    options: ProcessingOptions
  ): Promise<ProcessedContent> {
    const text = this.extractTextContent(content, contentType);
    const cleanedText = this.cleanText(text);

    const title = options.extractMetadata ? this.extractTitle(cleanedText) : undefined;
    const links = options.extractLinks ? this.extractLinks(cleanedText) : [];
    const tables = this.extractTables(cleanedText, contentType);
    const structure = options.extractMetadata ? this.extractStructure(cleanedText) : undefined;

    const metadata = this.extractMetadata(text, contentType, options);

    return this.createProcessedContent(
      cleanedText,
      title,
      metadata,
      [], // No images in text content
      links,
      tables,
      structure
    );
  }

  private extractTextContent(content: Buffer | string, contentType: ContentType): string {
    let text: string;

    if (Buffer.isBuffer(content)) {
      const encoding = this.detectEncoding(content);
      text = content.toString(encoding === 'binary' ? 'latin1' : 'utf8');
    } else {
      text = content;
    }

    // Handle specific content types
    switch (contentType) {
      case ContentType.JSON:
        return this.processJsonContent(text);
      case ContentType.XML:
        return this.processXmlContent(text);
      case ContentType.CSV:
        return this.processCsvContent(text);
      case ContentType.MARKDOWN:
        // Markdown is returned as-is since it's already readable text
        return text;
      default:
        return text;
    }
  }

  private processJsonContent(text: string): string {
    try {
      const jsonObject = JSON.parse(text);
      return this.formatJsonForReading(jsonObject);
    } catch (error) {
      // If parsing fails, return original text
      return text;
    }
  }

  private formatJsonForReading(obj: any, indent: number = 0): string {
    const spaces = '  '.repeat(indent);

    if (typeof obj === 'string') {
      return obj;
    } else if (typeof obj === 'number' || typeof obj === 'boolean') {
      return String(obj);
    } else if (obj === null) {
      return 'null';
    } else if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';

      const items = obj.map(item =>
        `${spaces}- ${this.formatJsonForReading(item, indent + 1)}`
      );
      return items.join('\n');
    } else if (typeof obj === 'object') {
      const entries = Object.entries(obj);
      if (entries.length === 0) return '{}';

      const lines = entries.map(([key, value]) => {
        const formattedValue = this.formatJsonForReading(value, indent + 1);
        return `${spaces}${key}: ${formattedValue}`;
      });
      return lines.join('\n');
    }

    return String(obj);
  }

  private processXmlContent(text: string): string {
    // Simple XML to readable text conversion
    return text
      .replace(/<[^>]*>/g, '') // Remove XML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\n\s*\n/g, '\n') // Remove empty lines
      .trim();
  }

  private processCsvContent(text: string): string {
    // Convert CSV to readable text format
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return text;

    const rows = lines.map(line => this.parseCsvLine(line));
    const headers = rows[0];
    const dataRows = rows.slice(1);

    if (dataRows.length === 0) return headers.join(', ');

    // Format as readable text
    const formattedRows = dataRows.map(row => {
      return headers.map((header, index) =>
        `${header}: ${row[index] || ''}`
      ).join(', ');
    });

    return formattedRows.join('\n');
  }

  private parseCsvLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  private extractTables(text: string, contentType: ContentType): ExtractedTable[] {
    const tables: ExtractedTable[] = [];

    if (contentType === ContentType.CSV) {
      const csvTable = this.extractCsvTable(text);
      if (csvTable) {
        tables.push(csvTable);
      }
    } else {
      // Extract Markdown-style tables
      const markdownTables = this.extractMarkdownTables(text);
      tables.push(...markdownTables);
    }

    return tables;
  }

  private extractCsvTable(text: string): ExtractedTable | null {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) return null;

    const rows = lines.map(line => this.parseCsvLine(line));
    const headers = rows[0];
    const dataRows = rows.slice(1);

    return {
      headers,
      rows: dataRows
    };
  }

  private extractMarkdownTables(text: string): ExtractedTable[] {
    const tables: ExtractedTable[] = [];
    const lines = text.split('\n');

    for (let i = 0; i < lines.length - 1; i++) {
      const line = lines[i].trim();
      const nextLine = lines[i + 1].trim();

      // Check if this looks like a markdown table header
      if (line.includes('|') && nextLine.match(/^[\s\-|:]+$/)) {
        const table = this.parseMarkdownTable(lines, i);
        if (table) {
          tables.push(table);
        }
      }
    }

    return tables;
  }

  private parseMarkdownTable(lines: string[], startIndex: number): ExtractedTable | null {
    const headers = this.parseTableRow(lines[startIndex]);
    if (!headers || headers.length === 0) return null;

    const rows: string[][] = [];

    // Skip the separator line
    for (let i = startIndex + 2; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line.includes('|')) break;

      const row = this.parseTableRow(line);
      if (row && row.length > 0) {
        rows.push(row);
      } else {
        break;
      }
    }

    return {
      headers,
      rows
    };
  }

  private parseTableRow(line: string): string[] | null {
    if (!line.includes('|')) return null;

    const cells = line.split('|').map(cell => cell.trim());

    // Remove empty cells at start and end (common in markdown tables)
    if (cells[0] === '') cells.shift();
    if (cells[cells.length - 1] === '') cells.pop();

    return cells.length > 0 ? cells : null;
  }

  private extractMetadata(
    text: string,
    contentType: ContentType,
    _options: ProcessingOptions
  ): Record<string, any> {
    const metadata: Record<string, any> = {
      contentType,
      characterCount: text.length,
      wordCount: this.countWords(text),
      lineCount: text.split('\n').length,
      encoding: this.detectTextEncoding(text)
    };

    if (contentType === ContentType.JSON) {
      try {
        const jsonObject = JSON.parse(text);
        metadata.jsonStructure = this.analyzeJsonStructure(jsonObject);
      } catch {
        metadata.jsonValid = false;
      }
    }

    if (contentType === ContentType.CSV) {
      const csvInfo = this.analyzeCsvStructure(text);
      metadata.csvInfo = csvInfo;
    }

    return metadata;
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  private detectTextEncoding(text: string): string {
    // Simple heuristics for text encoding detection
    const hasExtendedAscii = /[\u0080-\u00FF]/.test(text);
    const hasUnicode = /[\u0100-\uFFFF]/.test(text);

    if (hasUnicode) return 'utf8-unicode';
    if (hasExtendedAscii) return 'utf8-extended';
    return 'ascii';
  }

  private analyzeJsonStructure(obj: any): any {
    if (Array.isArray(obj)) {
      return {
        type: 'array',
        length: obj.length,
        itemTypes: [...new Set(obj.map(item => typeof item))]
      };
    } else if (typeof obj === 'object' && obj !== null) {
      return {
        type: 'object',
        keys: Object.keys(obj),
        keyCount: Object.keys(obj).length
      };
    } else {
      return {
        type: typeof obj,
        value: obj
      };
    }
  }

  private analyzeCsvStructure(text: string): any {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return null;

    const firstRow = this.parseCsvLine(lines[0]);
    const columnCount = firstRow.length;
    const rowCount = lines.length;

    return {
      columnCount,
      rowCount: rowCount - 1, // Excluding header
      hasHeader: rowCount > 1,
      columns: firstRow
    };
  }
}