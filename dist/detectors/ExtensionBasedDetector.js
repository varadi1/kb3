"use strict";
/**
 * Extension-based URL detector
 * Single Responsibility: Detects content type based on file extensions
 * Open/Closed Principle: Extensible through configuration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtensionBasedDetector = void 0;
const BaseUrlDetector_1 = require("./BaseUrlDetector");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class ExtensionBasedDetector extends BaseUrlDetector_1.BaseUrlDetector {
    extensionMap;
    constructor() {
        super(Object.values(IUrlDetector_1.ContentType), 1);
        this.extensionMap = this.initializeExtensionMap();
    }
    canHandle(url) {
        const extension = this.extractFileExtension(url);
        return extension !== null && this.extensionMap.has(extension);
    }
    async performDetection(url) {
        const extension = this.extractFileExtension(url);
        if (!extension || !this.extensionMap.has(extension)) {
            throw new Error(`Unsupported extension: ${extension}`);
        }
        const extensionInfo = this.extensionMap.get(extension);
        return this.createClassification(extensionInfo.contentType, extensionInfo.mimeType, 0.8, // High confidence for extension-based detection
        {
            extension,
            detectionMethod: 'extension',
            alternativeMimeTypes: extensionInfo.alternativeMimeTypes
        });
    }
    initializeExtensionMap() {
        const extensions = [
            // Documents
            ['pdf', { contentType: IUrlDetector_1.ContentType.PDF, mimeType: 'application/pdf' }],
            ['doc', { contentType: IUrlDetector_1.ContentType.DOC, mimeType: 'application/msword' }],
            ['docx', { contentType: IUrlDetector_1.ContentType.DOCX, mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }],
            ['rtf', { contentType: IUrlDetector_1.ContentType.RTF, mimeType: 'application/rtf', alternativeMimeTypes: ['text/rtf'] }],
            // Spreadsheets
            ['xls', { contentType: IUrlDetector_1.ContentType.XLSX, mimeType: 'application/vnd.ms-excel' }],
            ['xlsx', { contentType: IUrlDetector_1.ContentType.XLSX, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }],
            ['csv', { contentType: IUrlDetector_1.ContentType.CSV, mimeType: 'text/csv' }],
            // Text formats
            ['txt', { contentType: IUrlDetector_1.ContentType.TXT, mimeType: 'text/plain' }],
            ['md', { contentType: IUrlDetector_1.ContentType.MARKDOWN, mimeType: 'text/markdown' }],
            ['markdown', { contentType: IUrlDetector_1.ContentType.MARKDOWN, mimeType: 'text/markdown' }],
            ['json', { contentType: IUrlDetector_1.ContentType.JSON, mimeType: 'application/json' }],
            ['xml', { contentType: IUrlDetector_1.ContentType.XML, mimeType: 'application/xml', alternativeMimeTypes: ['text/xml'] }],
            // Web formats
            ['html', { contentType: IUrlDetector_1.ContentType.HTML, mimeType: 'text/html' }],
            ['htm', { contentType: IUrlDetector_1.ContentType.HTML, mimeType: 'text/html' }],
            // Images
            ['jpg', { contentType: IUrlDetector_1.ContentType.IMAGE, mimeType: 'image/jpeg' }],
            ['jpeg', { contentType: IUrlDetector_1.ContentType.IMAGE, mimeType: 'image/jpeg' }],
            ['png', { contentType: IUrlDetector_1.ContentType.IMAGE, mimeType: 'image/png' }],
            ['gif', { contentType: IUrlDetector_1.ContentType.IMAGE, mimeType: 'image/gif' }],
            ['bmp', { contentType: IUrlDetector_1.ContentType.IMAGE, mimeType: 'image/bmp' }],
            ['svg', { contentType: IUrlDetector_1.ContentType.IMAGE, mimeType: 'image/svg+xml' }],
            ['webp', { contentType: IUrlDetector_1.ContentType.IMAGE, mimeType: 'image/webp' }],
            // Video
            ['mp4', { contentType: IUrlDetector_1.ContentType.VIDEO, mimeType: 'video/mp4' }],
            ['avi', { contentType: IUrlDetector_1.ContentType.VIDEO, mimeType: 'video/x-msvideo' }],
            ['mov', { contentType: IUrlDetector_1.ContentType.VIDEO, mimeType: 'video/quicktime' }],
            ['webm', { contentType: IUrlDetector_1.ContentType.VIDEO, mimeType: 'video/webm' }],
            // Audio
            ['mp3', { contentType: IUrlDetector_1.ContentType.AUDIO, mimeType: 'audio/mpeg' }],
            ['wav', { contentType: IUrlDetector_1.ContentType.AUDIO, mimeType: 'audio/wav' }],
            ['ogg', { contentType: IUrlDetector_1.ContentType.AUDIO, mimeType: 'audio/ogg' }],
            // Archives
            ['zip', { contentType: IUrlDetector_1.ContentType.ARCHIVE, mimeType: 'application/zip' }],
            ['rar', { contentType: IUrlDetector_1.ContentType.ARCHIVE, mimeType: 'application/vnd.rar' }],
            ['7z', { contentType: IUrlDetector_1.ContentType.ARCHIVE, mimeType: 'application/x-7z-compressed' }],
            ['tar', { contentType: IUrlDetector_1.ContentType.ARCHIVE, mimeType: 'application/x-tar' }],
            ['gz', { contentType: IUrlDetector_1.ContentType.ARCHIVE, mimeType: 'application/gzip' }]
        ];
        return new Map(extensions);
    }
    /**
     * Adds support for new extensions (Open/Closed Principle)
     * @param extension File extension
     * @param info Extension information
     */
    addExtension(extension, info) {
        this.extensionMap.set(extension.toLowerCase(), info);
    }
    /**
     * Gets all supported extensions
     * @returns Array of supported extensions
     */
    getSupportedExtensions() {
        return Array.from(this.extensionMap.keys());
    }
}
exports.ExtensionBasedDetector = ExtensionBasedDetector;
//# sourceMappingURL=ExtensionBasedDetector.js.map