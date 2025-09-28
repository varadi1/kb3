/**
 * HTTP Header-based URL detector
 * Single Responsibility: Detects content type by making HEAD requests
 * Handles URLs without clear extensions or misleading extensions
 */
import { BaseUrlDetector } from './BaseUrlDetector';
import { ContentType, UrlClassification } from '../interfaces/IUrlDetector';
export declare class HeaderBasedDetector extends BaseUrlDetector {
    private readonly mimeTypeMap;
    private readonly timeout;
    constructor(timeout?: number);
    canHandle(url: string): boolean;
    protected performDetection(url: string): Promise<UrlClassification>;
    private performHeadRequest;
    private performPartialGetRequest;
    private extractContentType;
    private extractContentLength;
    private mapMimeTypeToContentType;
    private initializeMimeTypeMap;
    private detectFromContentDisposition;
    private guessedMimeType;
    /**
     * Adds support for new MIME types (Open/Closed Principle)
     * @param mimeType MIME type
     * @param contentType Mapped content type
     */
    addMimeType(mimeType: string, contentType: ContentType): void;
    /**
     * Gets all supported MIME types
     * @returns Array of supported MIME types
     */
    getSupportedMimeTypes(): string[];
}
//# sourceMappingURL=HeaderBasedDetector.d.ts.map