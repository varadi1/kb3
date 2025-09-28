"use strict";
/**
 * HTTP/HTTPS content fetcher
 * Single Responsibility: Fetches content from HTTP/HTTPS URLs
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpFetcher = void 0;
const axios_1 = __importDefault(require("axios"));
const BaseFetcher_1 = require("./BaseFetcher");
class HttpFetcher extends BaseFetcher_1.BaseFetcher {
    maxRedirects;
    constructor(maxSize = 100 * 1024 * 1024, timeout = 30000, _followRedirects = true, maxRedirects = 10) {
        super(maxSize, timeout);
        // followRedirects is used in performFetch method
        this.maxRedirects = maxRedirects;
    }
    canFetch(url) {
        try {
            const parsedUrl = this.validateUrl(url);
            return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
        }
        catch {
            return false;
        }
    }
    async performFetch(url, options) {
        const response = await this.makeRequest(url, options);
        const mimeType = this.extractMimeType(response);
        return this.createFetchedContent(Buffer.from(response.data), mimeType, response.request?.responseURL || url, this.normalizeHeaders(response.headers), {
            statusCode: response.status,
            statusText: response.statusText,
            redirectCount: this.getRedirectCount(response),
            finalUrl: response.request?.responseURL || url
        });
    }
    async makeRequest(url, options) {
        try {
            const axiosOptions = {
                method: 'GET',
                url,
                timeout: options.timeout,
                maxRedirects: options.followRedirects ? this.maxRedirects : 0,
                responseType: 'arraybuffer',
                headers: options.headers,
                validateStatus: (status) => status < 400,
                maxContentLength: options.maxSize,
                maxBodyLength: options.maxSize
            };
            return await (0, axios_1.default)(axiosOptions);
        }
        catch (error) {
            if (error.code === 'ECONNABORTED') {
                throw new Error('Request timeout');
            }
            if (error.response?.status === 404) {
                throw new Error('Resource not found (404)');
            }
            if (error.response?.status === 403) {
                throw new Error('Access denied (403)');
            }
            if (error.response?.status === 429) {
                throw new Error('Rate limited (429)');
            }
            if (error.response?.status >= 500) {
                throw new Error(`Server error (${error.response.status})`);
            }
            throw error;
        }
    }
    extractMimeType(response) {
        let contentType = response.headers['content-type'] ||
            response.headers['Content-Type'] ||
            'application/octet-stream';
        // If Content-Type is invalid or just "/", try to detect from Content-Disposition
        if (contentType === '/' || contentType === '' || !contentType.includes('/')) {
            const mimeFromDisposition = this.detectMimeTypeFromContentDisposition(response);
            if (mimeFromDisposition) {
                contentType = mimeFromDisposition;
            }
        }
        return this.parseMimeType(contentType);
    }
    detectMimeTypeFromContentDisposition(response) {
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
        // Map common file extensions to MIME types
        const extToMime = {
            'pdf': 'application/pdf',
            'doc': 'application/msword',
            'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'xls': 'application/vnd.ms-excel',
            'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'csv': 'text/csv',
            'txt': 'text/plain',
            'json': 'application/json',
            'xml': 'application/xml',
            'html': 'text/html',
            'htm': 'text/html',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'zip': 'application/zip',
            'rar': 'application/x-rar-compressed'
        };
        return extension && extToMime[extension] ? extToMime[extension] : null;
    }
    normalizeHeaders(headers) {
        const normalized = {};
        for (const [key, value] of Object.entries(headers)) {
            if (typeof value === 'string') {
                normalized[key.toLowerCase()] = value;
            }
            else if (Array.isArray(value) && value.length > 0) {
                normalized[key.toLowerCase()] = value[0];
            }
        }
        return normalized;
    }
    getRedirectCount(response) {
        // Axios doesn't provide redirect count directly
        // This is a simplified approach
        const finalUrl = response.request?.responseURL;
        const originalUrl = response.config?.url;
        return finalUrl && originalUrl && finalUrl !== originalUrl ? 1 : 0;
    }
    /**
     * Fetches only headers (HEAD request)
     * @param url The URL to fetch headers from
     * @param options Fetch options
     * @returns Promise resolving to headers
     */
    async fetchHeaders(url, options = {}) {
        if (!this.canFetch(url)) {
            throw new Error(`Cannot handle URL: ${url}`);
        }
        const mergedOptions = this.mergeOptions(options);
        try {
            const response = await axios_1.default.head(url, {
                timeout: mergedOptions.timeout,
                maxRedirects: mergedOptions.followRedirects ? this.maxRedirects : 0,
                headers: mergedOptions.headers,
                validateStatus: (status) => status < 400
            });
            return this.normalizeHeaders(response.headers);
        }
        catch (error) {
            if (error.response?.status === 405) {
                // Some servers don't support HEAD requests, fallback to partial GET
                return await this.fetchHeadersWithPartialGet(url, mergedOptions);
            }
            throw error;
        }
    }
    async fetchHeadersWithPartialGet(url, options) {
        const response = await axios_1.default.get(url, {
            timeout: options.timeout,
            maxRedirects: options.followRedirects ? this.maxRedirects : 0,
            headers: {
                ...options.headers,
                'Range': 'bytes=0-0' // Request only the first byte
            },
            validateStatus: (status) => status < 400 || status === 206,
            responseType: 'arraybuffer'
        });
        return this.normalizeHeaders(response.headers);
    }
    /**
     * Checks if a URL is accessible without downloading content
     * @param url The URL to check
     * @param options Fetch options
     * @returns Promise resolving to accessibility status
     */
    async isAccessible(url, options = {}) {
        try {
            await this.fetchHeaders(url, options);
            return true;
        }
        catch {
            return false;
        }
    }
}
exports.HttpFetcher = HttpFetcher;
//# sourceMappingURL=HttpFetcher.js.map