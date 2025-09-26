/**
 * HTTP Header-based URL detector
 * Single Responsibility: Detects content type by making HEAD requests
 * Handles URLs without clear extensions or misleading extensions
 */

import axios, { AxiosResponse } from 'axios';
import { BaseUrlDetector } from './BaseUrlDetector';
import { ContentType, UrlClassification } from '../interfaces/IUrlDetector';

export class HeaderBasedDetector extends BaseUrlDetector {
  private readonly mimeTypeMap: Map<string, ContentType>;
  private readonly timeout: number;

  constructor(timeout: number = 10000) {
    super(Object.values(ContentType), 2);
    this.timeout = timeout;
    this.mimeTypeMap = this.initializeMimeTypeMap();
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
      const response = await this.performHeadRequest(url);
      const contentType = this.extractContentType(response);
      const contentLength = this.extractContentLength(response);

      // First try to detect from Content-Type
      let detectedType = this.mapMimeTypeToContentType(contentType);

      // If content type is unknown or invalid, check Content-Disposition
      if (detectedType === ContentType.UNKNOWN || contentType === '/' || contentType === '') {
        detectedType = this.detectFromContentDisposition(response) || detectedType;
      }

      return this.createClassification(
        detectedType,
        contentType !== '/' ? contentType : this.guessedMimeType(detectedType),
        0.9, // High confidence for header-based detection
        {
          detectionMethod: 'headers',
          headers: response.headers,
          statusCode: response.status,
          finalUrl: response.request?.responseURL || url,
          contentDisposition: response.headers['content-disposition']
        },
        contentLength
      );
    } catch (error: any) {
      throw new Error(`Header detection failed for ${url}: ${error.message || error}`);
    }
  }

  private async performHeadRequest(url: string): Promise<AxiosResponse> {
    try {
      return await axios.head(url, {
        timeout: this.timeout,
        maxRedirects: 5,
        validateStatus: (status) => status < 400, // Accept 2xx and 3xx
        headers: {
          'User-Agent': 'KnowledgeBase-HeaderDetector/1.0'
        }
      });
    } catch (error: any) {
      if (error.response?.status === 405) {
        // Some servers don't support HEAD, try GET with minimal range
        return await this.performPartialGetRequest(url);
      }
      throw error;
    }
  }

  private async performPartialGetRequest(url: string): Promise<AxiosResponse> {
    return await axios.get(url, {
      timeout: this.timeout,
      maxRedirects: 5,
      headers: {
        'User-Agent': 'KnowledgeBase-HeaderDetector/1.0',
        'Range': 'bytes=0-1023' // Only fetch first 1KB
      },
      validateStatus: (status) => status < 400 || status === 206 // Accept partial content
    });
  }

  private extractContentType(response: AxiosResponse): string {
    const contentType = response.headers['content-type'] ||
                       response.headers['Content-Type'] ||
                       'application/octet-stream';

    // Extract main content type, ignoring charset and other parameters
    return contentType.split(';')[0].trim().toLowerCase();
  }

  private extractContentLength(response: AxiosResponse): number | undefined {
    const contentLength = response.headers['content-length'] ||
                         response.headers['Content-Length'];

    return contentLength ? parseInt(contentLength, 10) : undefined;
  }

  private mapMimeTypeToContentType(mimeType: string): ContentType {
    const mapped = this.mimeTypeMap.get(mimeType);
    if (mapped) {
      return mapped;
    }

    // Fallback patterns for unmapped MIME types
    if (mimeType.startsWith('text/')) {
      if (mimeType.includes('html')) return ContentType.HTML;
      if (mimeType.includes('xml')) return ContentType.XML;
      if (mimeType.includes('csv')) return ContentType.CSV;
      return ContentType.TXT;
    }

    if (mimeType.startsWith('image/')) return ContentType.IMAGE;
    if (mimeType.startsWith('video/')) return ContentType.VIDEO;
    if (mimeType.startsWith('audio/')) return ContentType.AUDIO;

    if (mimeType.startsWith('application/')) {
      if (mimeType.includes('json')) return ContentType.JSON;
      if (mimeType.includes('xml')) return ContentType.XML;
      if (mimeType.includes('zip') || mimeType.includes('compress')) {
        return ContentType.ARCHIVE;
      }
    }

    return ContentType.UNKNOWN;
  }

  private initializeMimeTypeMap(): Map<string, ContentType> {
    const mimeTypes: [string, ContentType][] = [
      // Documents
      ['application/pdf', ContentType.PDF],
      ['application/msword', ContentType.DOC],
      ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', ContentType.DOCX],

      // Spreadsheets
      ['application/vnd.ms-excel', ContentType.XLSX],
      ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', ContentType.XLSX],
      ['text/csv', ContentType.CSV],

      // Text formats
      ['text/plain', ContentType.TXT],
      ['text/markdown', ContentType.TXT],
      ['application/json', ContentType.JSON],
      ['application/xml', ContentType.XML],
      ['text/xml', ContentType.XML],

      // Web formats
      ['text/html', ContentType.HTML],

      // Images
      ['image/jpeg', ContentType.IMAGE],
      ['image/png', ContentType.IMAGE],
      ['image/gif', ContentType.IMAGE],
      ['image/bmp', ContentType.IMAGE],
      ['image/svg+xml', ContentType.IMAGE],
      ['image/webp', ContentType.IMAGE],

      // Video
      ['video/mp4', ContentType.VIDEO],
      ['video/x-msvideo', ContentType.VIDEO],
      ['video/quicktime', ContentType.VIDEO],
      ['video/webm', ContentType.VIDEO],

      // Audio
      ['audio/mpeg', ContentType.AUDIO],
      ['audio/wav', ContentType.AUDIO],
      ['audio/ogg', ContentType.AUDIO],

      // Archives
      ['application/zip', ContentType.ARCHIVE],
      ['application/vnd.rar', ContentType.ARCHIVE],
      ['application/x-7z-compressed', ContentType.ARCHIVE],
      ['application/x-tar', ContentType.ARCHIVE],
      ['application/gzip', ContentType.ARCHIVE]
    ];

    return new Map(mimeTypes);
  }

  private detectFromContentDisposition(response: AxiosResponse): ContentType | null {
    const contentDisposition = response.headers['content-disposition'] ||
                               response.headers['Content-Disposition'];

    if (!contentDisposition) return null;

    // Extract filename from Content-Disposition header
    const filenameMatch = contentDisposition.match(/filename[^;=\n]*=\s*((['"]).*?\2|[^;\n]*)/);
    if (!filenameMatch || !filenameMatch[1]) return null;

    const filename = filenameMatch[1].replace(/['"]/g, '');
    const extension = filename.split('.').pop()?.toLowerCase();

    // Map file extension to ContentType
    switch (extension) {
      case 'pdf': return ContentType.PDF;
      case 'doc': return ContentType.DOC;
      case 'docx': return ContentType.DOCX;
      case 'xls':
      case 'xlsx': return ContentType.XLSX;
      case 'csv': return ContentType.CSV;
      case 'txt': return ContentType.TXT;
      case 'json': return ContentType.JSON;
      case 'xml': return ContentType.XML;
      case 'html':
      case 'htm': return ContentType.HTML;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp': return ContentType.IMAGE;
      case 'mp4':
      case 'avi':
      case 'mov': return ContentType.VIDEO;
      case 'mp3':
      case 'wav':
      case 'ogg': return ContentType.AUDIO;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
      case '7z': return ContentType.ARCHIVE;
      default: return null;
    }
  }

  private guessedMimeType(contentType: ContentType): string {
    const typeToMime: Record<ContentType, string> = {
      [ContentType.PDF]: 'application/pdf',
      [ContentType.HTML]: 'text/html',
      [ContentType.DOC]: 'application/msword',
      [ContentType.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      [ContentType.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      [ContentType.CSV]: 'text/csv',
      [ContentType.TXT]: 'text/plain',
      [ContentType.JSON]: 'application/json',
      [ContentType.XML]: 'application/xml',
      [ContentType.IMAGE]: 'image/unknown',
      [ContentType.VIDEO]: 'video/unknown',
      [ContentType.AUDIO]: 'audio/unknown',
      [ContentType.ARCHIVE]: 'application/zip',
      [ContentType.UNKNOWN]: 'application/octet-stream'
    };
    return typeToMime[contentType] || 'application/octet-stream';
  }

  /**
   * Adds support for new MIME types (Open/Closed Principle)
   * @param mimeType MIME type
   * @param contentType Mapped content type
   */
  addMimeType(mimeType: string, contentType: ContentType): void {
    this.mimeTypeMap.set(mimeType.toLowerCase(), contentType);
  }

  /**
   * Gets all supported MIME types
   * @returns Array of supported MIME types
   */
  getSupportedMimeTypes(): string[] {
    return Array.from(this.mimeTypeMap.keys());
  }
}