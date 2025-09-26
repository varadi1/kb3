/**
 * Interface Segregation Principle: Small, focused interface for URL detection
 * Single Responsibility Principle: Only responsible for URL classification
 */

export interface IUrlDetector {
  /**
   * Determines if this detector can handle the given URL
   * @param url The URL to check
   * @returns true if this detector can handle the URL
   */
  canHandle(url: string): boolean;

  /**
   * Detects the content type and metadata for the URL
   * @param url The URL to analyze
   * @returns Promise resolving to URL classification info
   */
  detect(url: string): Promise<UrlClassification>;
}

export interface UrlClassification {
  type: ContentType;
  mimeType?: string;
  size?: number;
  metadata: Record<string, any>;
  confidence: number; // 0-1 scale
}

export enum ContentType {
  PDF = 'pdf',
  HTML = 'html',
  DOC = 'doc',
  DOCX = 'docx',
  RTF = 'rtf',
  XLSX = 'xlsx',
  CSV = 'csv',
  TXT = 'txt',
  JSON = 'json',
  XML = 'xml',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  ARCHIVE = 'archive',
  UNKNOWN = 'unknown'
}