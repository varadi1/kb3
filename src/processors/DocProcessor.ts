/**
 * DOC processor for legacy Microsoft Word documents
 * Single Responsibility: Processes legacy DOC files (binary format)
 * Note: DOC files are complex binary format, we extract what text we can
 */

import { BaseProcessor } from './BaseProcessor';
import {
  ProcessingOptions,
  ProcessedContent
} from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';

export class DocProcessor extends BaseProcessor {
  constructor(maxTextLength: number = 1000000) {
    super([ContentType.DOC], maxTextLength);
  }

  protected async performProcessing(
    content: Buffer | string,
    _contentType: ContentType,
    options: ProcessingOptions
  ): Promise<ProcessedContent> {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);

    try {
      // DOC files are Compound File Binary Format (CFBF)
      // For now, we'll do a simple text extraction
      // A full implementation would require parsing the OLE2 structure
      const text = this.extractTextFromDoc(buffer);

      const title = options.extractMetadata ? this.extractTitle(text) : undefined;
      const links = options.extractLinks ? this.extractLinks(text) : [];
      const structure = options.extractMetadata ? this.extractStructure(text) : undefined;
      const metadata = this.extractDocMetadata(buffer, text, options);

      return this.createProcessedContent(
        text,
        title,
        metadata,
        [], // No image extraction for DOC files in this simple implementation
        links,
        [], // No table extraction for DOC files in this simple implementation
        structure
      );
    } catch (error: any) {
      throw new Error(`DOC processing failed: ${error.message}`);
    }
  }

  /**
   * Extract readable text from DOC binary format
   * This is a simplified extraction that looks for text patterns
   * A complete implementation would require parsing the FIB and Word Document Stream
   */
  private extractTextFromDoc(buffer: Buffer): string {
    const texts: string[] = [];

    // Check if it's a valid DOC file (should start with D0CF11E0)
    const header = buffer.slice(0, 4).toString('hex');
    if (header !== 'd0cf11e0') {
      throw new Error('Invalid DOC file format');
    }

    // Simple text extraction: look for sequences of printable characters
    // DOC files often contain text in UTF-16LE encoding
    let currentText = '';
    let i = 0;

    while (i < buffer.length - 1) {
      // Try to read as UTF-16LE (2 bytes per character)
      const char1 = buffer[i];
      const char2 = buffer[i + 1];

      // Check if it's a printable ASCII character in UTF-16LE
      if (char2 === 0 && char1 >= 32 && char1 <= 126) {
        currentText += String.fromCharCode(char1);
        i += 2;
      }
      // Also check for regular ASCII text
      else if (char1 >= 32 && char1 <= 126) {
        currentText += String.fromCharCode(char1);
        i++;
      }
      // Non-printable character, save current text if long enough
      else {
        if (currentText.length > 3) {
          texts.push(currentText);
        }
        currentText = '';
        i++;
      }
    }

    // Save any remaining text
    if (currentText.length > 3) {
      texts.push(currentText);
    }

    // Join texts with spaces and clean up
    const extractedText = texts
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    // If we couldn't extract much text, try a different approach
    if (extractedText.length < 100) {
      // Try extracting any readable ASCII sequences
      const asciiText = this.extractAsciiText(buffer);
      if (asciiText.length > extractedText.length) {
        return asciiText;
      }
    }

    return extractedText;
  }

  /**
   * Alternative text extraction method for ASCII content
   */
  private extractAsciiText(buffer: Buffer): string {
    const texts: string[] = [];
    let currentText = '';

    for (let i = 0; i < buffer.length; i++) {
      const byte = buffer[i];

      // Check for printable ASCII characters
      if (byte >= 32 && byte <= 126) {
        currentText += String.fromCharCode(byte);
      } else if (currentText.length > 5) {
        // Save text segments that are at least 5 characters
        texts.push(currentText);
        currentText = '';
      } else {
        currentText = '';
      }
    }

    if (currentText.length > 5) {
      texts.push(currentText);
    }

    // Filter out likely non-text content (e.g., embedded binary data)
    const filteredTexts = texts.filter(text => {
      // Check if the text looks like actual content (not random characters)
      const hasSpaces = text.includes(' ');
      const hasLetters = /[a-zA-Z]/.test(text);
      const notAllCaps = text !== text.toUpperCase();

      return text.length > 10 && (hasSpaces || (hasLetters && notAllCaps));
    });

    return filteredTexts.join(' ').replace(/\s+/g, ' ').trim();
  }

  private extractDocMetadata(
    buffer: Buffer,
    text: string,
    _options: ProcessingOptions
  ): Record<string, any> {
    const metadata: Record<string, any> = {
      contentType: ContentType.DOC,
      fileFormat: 'Microsoft Word 97-2003 Document',
      binarySize: buffer.length,
      extractedTextLength: text.length,
      wordCount: this.countWords(text)
    };

    // Check file header
    const header = buffer.slice(0, 4).toString('hex');
    metadata.fileSignature = header.toUpperCase();
    metadata.isValidDoc = header === 'd0cf11e0';

    // Try to extract some basic properties
    // Note: Full property extraction would require parsing the Document Summary Information stream
    const properties = this.extractBasicProperties(buffer);
    if (properties) {
      metadata.properties = properties;
    }

    return metadata;
  }

  /**
   * Attempt to extract basic document properties
   * This is a simplified approach - full implementation would parse the property streams
   */
  private extractBasicProperties(buffer: Buffer): Record<string, any> | null {
    const properties: Record<string, any> = {};

    // Look for common property markers in the binary
    const bufferStr = buffer.toString('binary');

    // Try to find title (often stored as UTF-16LE)
    const titleMatch = bufferStr.match(/\x00T\x00i\x00t\x00l\x00e\x00\x00\x00([^\x00]+)/);
    if (titleMatch) {
      properties.title = this.cleanPropertyValue(titleMatch[1]);
    }

    // Try to find author
    const authorMatch = bufferStr.match(/\x00A\x00u\x00t\x00h\x00o\x00r\x00\x00\x00([^\x00]+)/);
    if (authorMatch) {
      properties.author = this.cleanPropertyValue(authorMatch[1]);
    }

    return Object.keys(properties).length > 0 ? properties : null;
  }

  private cleanPropertyValue(value: string): string {
    return value
      .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
      .trim();
  }

  private countWords(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length;
  }
}