/**
 * Extension-based URL detector
 * Single Responsibility: Detects content type based on file extensions
 * Open/Closed Principle: Extensible through configuration
 */
import { BaseUrlDetector } from './BaseUrlDetector';
import { ContentType, UrlClassification } from '../interfaces/IUrlDetector';
export declare class ExtensionBasedDetector extends BaseUrlDetector {
    private readonly extensionMap;
    constructor();
    canHandle(url: string): boolean;
    protected performDetection(url: string): Promise<UrlClassification>;
    private initializeExtensionMap;
    /**
     * Adds support for new extensions (Open/Closed Principle)
     * @param extension File extension
     * @param info Extension information
     */
    addExtension(extension: string, info: ExtensionInfo): void;
    /**
     * Gets all supported extensions
     * @returns Array of supported extensions
     */
    getSupportedExtensions(): string[];
}
interface ExtensionInfo {
    contentType: ContentType;
    mimeType: string;
    alternativeMimeTypes?: string[];
}
export {};
//# sourceMappingURL=ExtensionBasedDetector.d.ts.map