/**
 * Content-based URL detector
 * Single Responsibility: Detects content type by analyzing actual content
 * Fallback when headers and extensions are unreliable
 */

import axios from 'axios';
import { BaseUrlDetector } from './BaseUrlDetector';
import { ContentType, UrlClassification } from '../interfaces/IUrlDetector';

export class ContentBasedDetector extends BaseUrlDetector {
  private readonly sampleSize: number;
  private readonly timeout: number;
  private readonly magicNumbers: Map<string, MagicNumberInfo>;

  constructor(sampleSize: number = 2048, timeout: number = 15000) {
    super(Object.values(ContentType), 3);
    this.sampleSize = sampleSize;
    this.timeout = timeout;
    this.magicNumbers = this.initializeMagicNumbers();
  }

  canHandle(url: string): boolean {
    try {
      const parsedUrl = this.validateUrl(url);
      return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
    } catch {
      return false;
    }
  }

  protected async performDetection(url: string): Promise<UrlClassification> {
    try {
      const content = await this.fetchContentSample(url);
      const detection = this.analyzeContent(content);

      return this.createClassification(
        detection.contentType,
        detection.mimeType,
        detection.confidence,
        {
          detectionMethod: 'content-analysis',
          sampleSize: content.length,
          patterns: detection.patterns,
          encoding: detection.encoding
        }
      );
    } catch (error) {
      throw new Error(`Content detection failed for ${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async fetchContentSample(url: string): Promise<Buffer> {
    const response = await axios.get(url, {
      timeout: this.timeout,
      maxRedirects: 5,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'KnowledgeBase-ContentDetector/1.0',
        'Range': `bytes=0-${this.sampleSize - 1}`
      },
      validateStatus: (status) => status < 400 || status === 206
    });

    return Buffer.from(response.data);
  }

  private analyzeContent(content: Buffer): ContentAnalysis {
    const analyses: ContentAnalysis[] = [
      this.checkMagicNumbers(content),
      this.analyzeTextContent(content),
      this.analyzeStructuredContent(content),
      this.analyzeWebContent(content)
    ];

    // Return the analysis with highest confidence
    return analyses.reduce((best, current) =>
      current.confidence > best.confidence ? current : best
    );
  }

  private checkMagicNumbers(content: Buffer): ContentAnalysis {
    for (const [pattern, info] of this.magicNumbers) {
      const patternBytes = this.hexStringToBuffer(pattern);
      if (this.bufferStartsWith(content, patternBytes)) {
        return {
          contentType: info.contentType,
          mimeType: info.mimeType,
          confidence: 0.95,
          patterns: [`magic-${pattern}`],
          encoding: 'binary'
        };
      }
    }

    return {
      contentType: ContentType.UNKNOWN,
      mimeType: 'application/octet-stream',
      confidence: 0,
      patterns: [],
      encoding: 'binary'
    };
  }

  private analyzeTextContent(content: Buffer): ContentAnalysis {
    const text = content.toString('utf8', 0, Math.min(1024, content.length));

    // Check if content is primarily text
    const nonPrintableChars = text.replace(/[\x20-\x7E\s]/g, '').length;
    const textRatio = (text.length - nonPrintableChars) / text.length;

    if (textRatio < 0.8) {
      return {
        contentType: ContentType.UNKNOWN,
        mimeType: 'application/octet-stream',
        confidence: 0,
        patterns: [],
        encoding: 'binary'
      };
    }

    const patterns: string[] = [];

    // CSV detection
    if (this.looksLikeCSV(text)) {
      patterns.push('csv-structure');
      return {
        contentType: ContentType.CSV,
        mimeType: 'text/csv',
        confidence: 0.8,
        patterns,
        encoding: 'utf8'
      };
    }

    // JSON detection
    if (this.looksLikeJSON(text)) {
      patterns.push('json-structure');
      return {
        contentType: ContentType.JSON,
        mimeType: 'application/json',
        confidence: 0.85,
        patterns,
        encoding: 'utf8'
      };
    }

    // XML detection
    if (this.looksLikeXML(text)) {
      patterns.push('xml-structure');
      return {
        contentType: ContentType.XML,
        mimeType: 'application/xml',
        confidence: 0.85,
        patterns,
        encoding: 'utf8'
      };
    }

    return {
      contentType: ContentType.TXT,
      mimeType: 'text/plain',
      confidence: 0.6,
      patterns: ['text-content'],
      encoding: 'utf8'
    };
  }

  private analyzeStructuredContent(content: Buffer): ContentAnalysis {
    const text = content.toString('utf8', 0, Math.min(2048, content.length));

    // Check for Office documents (even if corrupted headers)
    if (text.includes('word/') || text.includes('xl/') || text.includes('ppt/')) {
      return {
        contentType: text.includes('word/') ? ContentType.DOCX : ContentType.XLSX,
        mimeType: text.includes('word/')
          ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        confidence: 0.7,
        patterns: ['office-structure'],
        encoding: 'binary'
      };
    }

    return {
      contentType: ContentType.UNKNOWN,
      mimeType: 'application/octet-stream',
      confidence: 0,
      patterns: [],
      encoding: 'binary'
    };
  }

  private analyzeWebContent(content: Buffer): ContentAnalysis {
    const text = content.toString('utf8', 0, Math.min(1024, content.length));

    // HTML detection
    const htmlPatterns = [
      /<!DOCTYPE\s+html/i,
      /<html[^>]*>/i,
      /<head[^>]*>/i,
      /<body[^>]*>/i,
      /<meta[^>]*>/i
    ];

    const htmlMatches = htmlPatterns.filter(pattern => pattern.test(text));

    if (htmlMatches.length >= 2) {
      return {
        contentType: ContentType.HTML,
        mimeType: 'text/html',
        confidence: 0.85,
        patterns: ['html-structure'],
        encoding: 'utf8'
      };
    }

    return {
      contentType: ContentType.UNKNOWN,
      mimeType: 'application/octet-stream',
      confidence: 0,
      patterns: [],
      encoding: 'binary'
    };
  }

  private looksLikeCSV(text: string): boolean {
    const lines = text.split('\n').slice(0, 5);
    if (lines.length < 2) return false;

    const firstLineCommas = (lines[0].match(/,/g) || []).length;
    if (firstLineCommas === 0) return false;

    return lines.slice(1).every(line => {
      const commas = (line.match(/,/g) || []).length;
      return Math.abs(commas - firstLineCommas) <= 1;
    });
  }

  private looksLikeJSON(text: string): boolean {
    const trimmed = text.trim();
    return (trimmed.startsWith('{') && trimmed.includes('":')) ||
           (trimmed.startsWith('[') && trimmed.includes('":'));
  }

  private looksLikeXML(text: string): boolean {
    const trimmed = text.trim();
    return trimmed.startsWith('<?xml') ||
           (trimmed.startsWith('<') && trimmed.includes('</'));
  }

  private initializeMagicNumbers(): Map<string, MagicNumberInfo> {
    const magicNumbers: [string, MagicNumberInfo][] = [
      // PDF
      ['25504446', { contentType: ContentType.PDF, mimeType: 'application/pdf' }],

      // Images
      ['FFD8FF', { contentType: ContentType.IMAGE, mimeType: 'image/jpeg' }],
      ['89504E47', { contentType: ContentType.IMAGE, mimeType: 'image/png' }],
      ['47494638', { contentType: ContentType.IMAGE, mimeType: 'image/gif' }],
      ['424D', { contentType: ContentType.IMAGE, mimeType: 'image/bmp' }],

      // Archives
      ['504B0304', { contentType: ContentType.ARCHIVE, mimeType: 'application/zip' }],
      ['504B0506', { contentType: ContentType.ARCHIVE, mimeType: 'application/zip' }],
      ['504B0708', { contentType: ContentType.ARCHIVE, mimeType: 'application/zip' }],
      ['526172211A07', { contentType: ContentType.ARCHIVE, mimeType: 'application/vnd.rar' }],

      // Audio/Video
      ['000001BA', { contentType: ContentType.VIDEO, mimeType: 'video/mpeg' }],
      ['000001B3', { contentType: ContentType.VIDEO, mimeType: 'video/mpeg' }],
      ['494433', { contentType: ContentType.AUDIO, mimeType: 'audio/mpeg' }],
      ['FFFB', { contentType: ContentType.AUDIO, mimeType: 'audio/mpeg' }]
    ];

    return new Map(magicNumbers);
  }

  private hexStringToBuffer(hexString: string): Buffer {
    return Buffer.from(hexString, 'hex');
  }

  private bufferStartsWith(buffer: Buffer, pattern: Buffer): boolean {
    if (buffer.length < pattern.length) return false;

    for (let i = 0; i < pattern.length; i++) {
      if (buffer[i] !== pattern[i]) return false;
    }

    return true;
  }
}

interface ContentAnalysis {
  contentType: ContentType;
  mimeType: string;
  confidence: number;
  patterns: string[];
  encoding: string;
}

interface MagicNumberInfo {
  contentType: ContentType;
  mimeType: string;
}