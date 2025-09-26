/**
 * Extension-based URL detector
 * Single Responsibility: Detects content type based on file extensions
 * Open/Closed Principle: Extensible through configuration
 */

import { BaseUrlDetector } from './BaseUrlDetector';
import { ContentType, UrlClassification } from '../interfaces/IUrlDetector';

export class ExtensionBasedDetector extends BaseUrlDetector {
  private readonly extensionMap: Map<string, ExtensionInfo>;

  constructor() {
    super(Object.values(ContentType), 1);
    this.extensionMap = this.initializeExtensionMap();
  }

  canHandle(url: string): boolean {
    const extension = this.extractFileExtension(url);
    return extension !== null && this.extensionMap.has(extension);
  }

  protected async performDetection(url: string): Promise<UrlClassification> {
    const extension = this.extractFileExtension(url);

    if (!extension || !this.extensionMap.has(extension)) {
      throw new Error(`Unsupported extension: ${extension}`);
    }

    const extensionInfo = this.extensionMap.get(extension)!;

    return this.createClassification(
      extensionInfo.contentType,
      extensionInfo.mimeType,
      0.8, // High confidence for extension-based detection
      {
        extension,
        detectionMethod: 'extension',
        alternativeMimeTypes: extensionInfo.alternativeMimeTypes
      }
    );
  }

  private initializeExtensionMap(): Map<string, ExtensionInfo> {
    const extensions: [string, ExtensionInfo][] = [
      // Documents
      ['pdf', { contentType: ContentType.PDF, mimeType: 'application/pdf' }],
      ['doc', { contentType: ContentType.DOC, mimeType: 'application/msword' }],
      ['docx', { contentType: ContentType.DOCX, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
      ['rtf', { contentType: ContentType.RTF, mimeType: 'application/rtf', alternativeMimeTypes: ['text/rtf'] }],

      // Spreadsheets
      ['xls', { contentType: ContentType.XLSX, mimeType: 'application/vnd.ms-excel' }],
      ['xlsx', { contentType: ContentType.XLSX, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
      ['csv', { contentType: ContentType.CSV, mimeType: 'text/csv' }],

      // Text formats
      ['txt', { contentType: ContentType.TXT, mimeType: 'text/plain' }],
      ['md', { contentType: ContentType.TXT, mimeType: 'text/markdown' }],
      ['json', { contentType: ContentType.JSON, mimeType: 'application/json' }],
      ['xml', { contentType: ContentType.XML, mimeType: 'application/xml', alternativeMimeTypes: ['text/xml'] }],

      // Web formats
      ['html', { contentType: ContentType.HTML, mimeType: 'text/html' }],
      ['htm', { contentType: ContentType.HTML, mimeType: 'text/html' }],

      // Images
      ['jpg', { contentType: ContentType.IMAGE, mimeType: 'image/jpeg' }],
      ['jpeg', { contentType: ContentType.IMAGE, mimeType: 'image/jpeg' }],
      ['png', { contentType: ContentType.IMAGE, mimeType: 'image/png' }],
      ['gif', { contentType: ContentType.IMAGE, mimeType: 'image/gif' }],
      ['bmp', { contentType: ContentType.IMAGE, mimeType: 'image/bmp' }],
      ['svg', { contentType: ContentType.IMAGE, mimeType: 'image/svg+xml' }],
      ['webp', { contentType: ContentType.IMAGE, mimeType: 'image/webp' }],

      // Video
      ['mp4', { contentType: ContentType.VIDEO, mimeType: 'video/mp4' }],
      ['avi', { contentType: ContentType.VIDEO, mimeType: 'video/x-msvideo' }],
      ['mov', { contentType: ContentType.VIDEO, mimeType: 'video/quicktime' }],
      ['webm', { contentType: ContentType.VIDEO, mimeType: 'video/webm' }],

      // Audio
      ['mp3', { contentType: ContentType.AUDIO, mimeType: 'audio/mpeg' }],
      ['wav', { contentType: ContentType.AUDIO, mimeType: 'audio/wav' }],
      ['ogg', { contentType: ContentType.AUDIO, mimeType: 'audio/ogg' }],

      // Archives
      ['zip', { contentType: ContentType.ARCHIVE, mimeType: 'application/zip' }],
      ['rar', { contentType: ContentType.ARCHIVE, mimeType: 'application/vnd.rar' }],
      ['7z', { contentType: ContentType.ARCHIVE, mimeType: 'application/x-7z-compressed' }],
      ['tar', { contentType: ContentType.ARCHIVE, mimeType: 'application/x-tar' }],
      ['gz', { contentType: ContentType.ARCHIVE, mimeType: 'application/gzip' }]
    ];

    return new Map(extensions);
  }

  /**
   * Adds support for new extensions (Open/Closed Principle)
   * @param extension File extension
   * @param info Extension information
   */
  addExtension(extension: string, info: ExtensionInfo): void {
    this.extensionMap.set(extension.toLowerCase(), info);
  }

  /**
   * Gets all supported extensions
   * @returns Array of supported extensions
   */
  getSupportedExtensions(): string[] {
    return Array.from(this.extensionMap.keys());
  }
}

interface ExtensionInfo {
  contentType: ContentType;
  mimeType: string;
  alternativeMimeTypes?: string[];
}