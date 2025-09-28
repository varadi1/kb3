"use strict";
/**
 * HTTP Header-based URL detector
 * Single Responsibility: Detects content type by making HEAD requests
 * Handles URLs without clear extensions or misleading extensions
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HeaderBasedDetector = void 0;
const axios_1 = __importDefault(require("axios"));
const BaseUrlDetector_1 = require("./BaseUrlDetector");
const IUrlDetector_1 = require("../interfaces/IUrlDetector");
class HeaderBasedDetector extends BaseUrlDetector_1.BaseUrlDetector {
    mimeTypeMap;
    timeout;
    constructor(timeout = 10000) {
        super(Object.values(IUrlDetector_1.ContentType), 2);
        this.timeout = timeout;
        this.mimeTypeMap = this.initializeMimeTypeMap();
    }
    canHandle(url) {
        try {
            const parsedUrl = this.validateUrl(url);
            return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    async performDetection(url) {
        try {
            const response = await this.performHeadRequest(url);
            const contentType = this.extractContentType(response);
            const contentLength = this.extractContentLength(response);
            // First try to detect from Content-Type
            let detectedType = this.mapMimeTypeToContentType(contentType);
            // If content type is unknown or invalid, check Content-Disposition
            if (detectedType === IUrlDetector_1.ContentType.UNKNOWN || contentType === '/' || contentType === '') {
                detectedType = this.detectFromContentDisposition(response) || detectedType;
            }
            return this.createClassification(detectedType, contentType !== '/' ? contentType : this.guessedMimeType(detectedType), 0.9, // High confidence for header-based detection
            {
                detectionMethod: 'headers',
                headers: response.headers,
                statusCode: response.status,
                finalUrl: response.request?.responseURL || url,
                contentDisposition: response.headers['content-disposition']
            }, contentLength);
        }
        catch (error) {
            throw new Error(`Header detection failed for ${url}: ${error.message || error}`);
        }
    }
    async performHeadRequest(url) {
        try {
            return await axios_1.default.head(url, {
                timeout: this.timeout,
                maxRedirects: 5,
                validateStatus: (status) => status < 400, // Accept 2xx and 3xx
                headers: {
                    'User-Agent': 'KnowledgeBase-HeaderDetector/1.0'
                }
            });
        }
        catch (error) {
            if (error.response?.status === 405) {
                // Some servers don't support HEAD, try GET with minimal range
                return await this.performPartialGetRequest(url);
            }
            throw error;
        }
    }
    async performPartialGetRequest(url) {
        return await axios_1.default.get(url, {
            timeout: this.timeout,
            maxRedirects: 5,
            headers: {
                'User-Agent': 'KnowledgeBase-HeaderDetector/1.0',
                'Range': 'bytes=0-1023' // Only fetch first 1KB
            },
            validateStatus: (status) => status < 400 || status === 206 // Accept partial content
        });
    }
    extractContentType(response) {
        const contentType = response.headers['content-type'] ||
            response.headers['Content-Type'] ||
            'application/octet-stream';
        // Extract main content type, ignoring charset and other parameters
        return contentType.split(';')[0].trim().toLowerCase();
    }
    extractContentLength(response) {
        const contentLength = response.headers['content-length'] ||
            response.headers['Content-Length'];
        return contentLength ? parseInt(contentLength, 10) : undefined;
    }
    mapMimeTypeToContentType(mimeType) {
        const mapped = this.mimeTypeMap.get(mimeType);
        if (mapped) {
            return mapped;
        }
        // Fallback patterns for unmapped MIME types
        if (mimeType.startsWith('text/')) {
            if (mimeType.includes('html'))
                return IUrlDetector_1.ContentType.HTML;
            if (mimeType.includes('xml'))
                return IUrlDetector_1.ContentType.XML;
            if (mimeType.includes('csv'))
                return IUrlDetector_1.ContentType.CSV;
            return IUrlDetector_1.ContentType.TXT;
        }
        if (mimeType.startsWith('image/'))
            return IUrlDetector_1.ContentType.IMAGE;
        if (mimeType.startsWith('video/'))
            return IUrlDetector_1.ContentType.VIDEO;
        if (mimeType.startsWith('audio/'))
            return IUrlDetector_1.ContentType.AUDIO;
        if (mimeType.startsWith('application/')) {
            if (mimeType.includes('json'))
                return IUrlDetector_1.ContentType.JSON;
            if (mimeType.includes('xml'))
                return IUrlDetector_1.ContentType.XML;
            if (mimeType.includes('zip') || mimeType.includes('compress')) {
                return IUrlDetector_1.ContentType.ARCHIVE;
            }
        }
        return IUrlDetector_1.ContentType.UNKNOWN;
    }
    initializeMimeTypeMap() {
        const mimeTypes = [
            // Documents
            ['application/pdf', IUrlDetector_1.ContentType.PDF],
            ['application/msword', IUrlDetector_1.ContentType.DOC],
            ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', IUrlDetector_1.ContentType.DOCX],
            // Spreadsheets
            ['application/vnd.ms-excel', IUrlDetector_1.ContentType.XLSX],
            ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', IUrlDetector_1.ContentType.XLSX],
            ['text/csv', IUrlDetector_1.ContentType.CSV],
            // Text formats
            ['text/plain', IUrlDetector_1.ContentType.TXT],
            ['text/markdown', IUrlDetector_1.ContentType.TXT],
            ['application/json', IUrlDetector_1.ContentType.JSON],
            ['application/xml', IUrlDetector_1.ContentType.XML],
            ['text/xml', IUrlDetector_1.ContentType.XML],
            // Web formats
            ['text/html', IUrlDetector_1.ContentType.HTML],
            // Images
            ['image/jpeg', IUrlDetector_1.ContentType.IMAGE],
            ['image/png', IUrlDetector_1.ContentType.IMAGE],
            ['image/gif', IUrlDetector_1.ContentType.IMAGE],
            ['image/bmp', IUrlDetector_1.ContentType.IMAGE],
            ['image/svg+xml', IUrlDetector_1.ContentType.IMAGE],
            ['image/webp', IUrlDetector_1.ContentType.IMAGE],
            // Video
            ['video/mp4', IUrlDetector_1.ContentType.VIDEO],
            ['video/x-msvideo', IUrlDetector_1.ContentType.VIDEO],
            ['video/quicktime', IUrlDetector_1.ContentType.VIDEO],
            ['video/webm', IUrlDetector_1.ContentType.VIDEO],
            // Audio
            ['audio/mpeg', IUrlDetector_1.ContentType.AUDIO],
            ['audio/wav', IUrlDetector_1.ContentType.AUDIO],
            ['audio/ogg', IUrlDetector_1.ContentType.AUDIO],
            // Archives
            ['application/zip', IUrlDetector_1.ContentType.ARCHIVE],
            ['application/vnd.rar', IUrlDetector_1.ContentType.ARCHIVE],
            ['application/x-7z-compressed', IUrlDetector_1.ContentType.ARCHIVE],
            ['application/x-tar', IUrlDetector_1.ContentType.ARCHIVE],
            ['application/gzip', IUrlDetector_1.ContentType.ARCHIVE]
        ];
        return new Map(mimeTypes);
    }
    detectFromContentDisposition(response) {
        const contentDisposition = response.headers['content-disposition'] ||
            response.headers['Content-Disposition'];
        if (!contentDisposition)
            return null;
        // Extract filename from Content-Disposition header
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=\s*((['"]).*?\2|[^;\n]*)/);
        if (!filenameMatch || !filenameMatch[1])
            return null;
        const filename = filenameMatch[1].replace(/['"]/g, '');
        const extension = filename.split('.').pop()?.toLowerCase();
        // Map file extension to ContentType
        switch (extension) {
            case 'pdf': return IUrlDetector_1.ContentType.PDF;
            case 'doc': return IUrlDetector_1.ContentType.DOC;
            case 'docx': return IUrlDetector_1.ContentType.DOCX;
            case 'xls':
            case 'xlsx': return IUrlDetector_1.ContentType.XLSX;
            case 'csv': return IUrlDetector_1.ContentType.CSV;
            case 'txt': return IUrlDetector_1.ContentType.TXT;
            case 'json': return IUrlDetector_1.ContentType.JSON;
            case 'xml': return IUrlDetector_1.ContentType.XML;
            case 'html':
            case 'htm': return IUrlDetector_1.ContentType.HTML;
            case 'jpg':
            case 'jpeg':
            case 'png':
            case 'gif':
            case 'bmp': return IUrlDetector_1.ContentType.IMAGE;
            case 'mp4':
            case 'avi':
            case 'mov': return IUrlDetector_1.ContentType.VIDEO;
            case 'mp3':
            case 'wav':
            case 'ogg': return IUrlDetector_1.ContentType.AUDIO;
            case 'zip':
            case 'rar':
            case 'tar':
            case 'gz':
            case '7z': return IUrlDetector_1.ContentType.ARCHIVE;
            default: return null;
        }
    }
    guessedMimeType(contentType) {
        const typeToMime = {
            [IUrlDetector_1.ContentType.PDF]: 'application/pdf',
            [IUrlDetector_1.ContentType.HTML]: 'text/html',
            [IUrlDetector_1.ContentType.WEBPAGE]: 'text/html',
            [IUrlDetector_1.ContentType.MARKDOWN]: 'text/markdown',
            [IUrlDetector_1.ContentType.DOC]: 'application/msword',
            [IUrlDetector_1.ContentType.DOCX]: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            [IUrlDetector_1.ContentType.RTF]: 'application/rtf',
            [IUrlDetector_1.ContentType.XLSX]: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            [IUrlDetector_1.ContentType.CSV]: 'text/csv',
            [IUrlDetector_1.ContentType.TXT]: 'text/plain',
            [IUrlDetector_1.ContentType.TEXT]: 'text/plain',
            [IUrlDetector_1.ContentType.JSON]: 'application/json',
            [IUrlDetector_1.ContentType.XML]: 'application/xml',
            [IUrlDetector_1.ContentType.IMAGE]: 'image/unknown',
            [IUrlDetector_1.ContentType.VIDEO]: 'video/unknown',
            [IUrlDetector_1.ContentType.AUDIO]: 'audio/unknown',
            [IUrlDetector_1.ContentType.ARCHIVE]: 'application/zip',
            [IUrlDetector_1.ContentType.UNKNOWN]: 'application/octet-stream'
        };
        return typeToMime[contentType] || 'application/octet-stream';
    }
    /**
     * Adds support for new MIME types (Open/Closed Principle)
     * @param mimeType MIME type
     * @param contentType Mapped content type
     */
    addMimeType(mimeType, contentType) {
        this.mimeTypeMap.set(mimeType.toLowerCase(), contentType);
    }
    /**
     * Gets all supported MIME types
     * @returns Array of supported MIME types
     */
    getSupportedMimeTypes() {
        return Array.from(this.mimeTypeMap.keys());
    }
}
exports.HeaderBasedDetector = HeaderBasedDetector;
//# sourceMappingURL=HeaderBasedDetector.js.map