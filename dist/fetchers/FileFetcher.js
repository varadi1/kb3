"use strict";
/**
 * Local file system fetcher
 * Single Responsibility: Fetches content from local file system
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileFetcher = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const BaseFetcher_1 = require("./BaseFetcher");
const mimeTypes = __importStar(require("mime-types"));
class FileFetcher extends BaseFetcher_1.BaseFetcher {
    basePath;
    allowedExtensions;
    constructor(maxSize = 100 * 1024 * 1024, timeout = 5000, basePath, allowedExtensions) {
        super(maxSize, timeout);
        this.basePath = basePath;
        this.allowedExtensions = allowedExtensions ? new Set(allowedExtensions) : undefined;
    }
    canFetch(url) {
        try {
            const parsedUrl = this.validateUrl(url);
            return parsedUrl.protocol === 'file:';
        }
        catch {
            // Also handle direct file paths
            return this.isValidFilePath(url);
        }
    }
    async performFetch(url, options) {
        const filePath = this.extractFilePath(url);
        const resolvedPath = this.resolvePath(filePath);
        await this.validateFileAccess(resolvedPath);
        const stats = await fs.stat(resolvedPath);
        this.checkContentSize(stats.size, options.maxSize);
        const content = await fs.readFile(resolvedPath);
        const mimeType = this.determineMimeType(resolvedPath);
        return this.createFetchedContent(content, mimeType, url, {}, {
            filePath: resolvedPath,
            fileSize: stats.size,
            lastModified: stats.mtime,
            created: stats.ctime,
            isDirectory: stats.isDirectory(),
            permissions: stats.mode
        });
    }
    extractFilePath(url) {
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol === 'file:') {
                return parsedUrl.pathname;
            }
        }
        catch {
            // Handle direct file paths
            return url;
        }
        return url;
    }
    resolvePath(filePath) {
        let resolvedPath;
        if (path.isAbsolute(filePath)) {
            resolvedPath = filePath;
        }
        else if (this.basePath) {
            resolvedPath = path.resolve(this.basePath, filePath);
        }
        else {
            resolvedPath = path.resolve(filePath);
        }
        // Security: Ensure path is within allowed directory if basePath is set
        if (this.basePath) {
            const relativePath = path.relative(this.basePath, resolvedPath);
            if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
                throw new Error(`Access denied: Path outside allowed directory: ${filePath}`);
            }
        }
        return resolvedPath;
    }
    async validateFileAccess(filePath) {
        try {
            await fs.access(filePath, fs.constants.R_OK);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`File not found: ${filePath}`);
            }
            if (error.code === 'EACCES') {
                throw new Error(`Access denied: ${filePath}`);
            }
            throw error;
        }
        // Check allowed extensions if configured
        if (this.allowedExtensions) {
            const extension = path.extname(filePath).toLowerCase().substring(1);
            if (!this.allowedExtensions.has(extension)) {
                throw new Error(`File extension not allowed: ${extension}`);
            }
        }
    }
    determineMimeType(filePath) {
        const mimeType = mimeTypes.lookup(filePath);
        return mimeType || 'application/octet-stream';
    }
    isValidFilePath(url) {
        try {
            // Basic validation - check if it looks like a file path
            return typeof url === 'string' && url.length > 0 && !url.includes('://');
        }
        catch {
            return false;
        }
    }
    /**
     * Lists files in a directory
     * @param directoryUrl Directory URL or path
     * @param options Fetch options
     * @returns Promise resolving to array of file URLs
     */
    async listFiles(directoryUrl, _options = {}) {
        const dirPath = this.extractFilePath(directoryUrl);
        const resolvedPath = this.resolvePath(dirPath);
        try {
            const stats = await fs.stat(resolvedPath);
            if (!stats.isDirectory()) {
                throw new Error(`Not a directory: ${resolvedPath}`);
            }
            const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
            const files = [];
            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = path.join(resolvedPath, entry.name);
                    // Check allowed extensions if configured
                    if (this.allowedExtensions) {
                        const extension = path.extname(entry.name).toLowerCase().substring(1);
                        if (!this.allowedExtensions.has(extension)) {
                            continue;
                        }
                    }
                    files.push(`file://${filePath}`);
                }
            }
            return files;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Directory not found: ${resolvedPath}`);
            }
            if (error.code === 'EACCES') {
                throw new Error(`Access denied: ${resolvedPath}`);
            }
            throw error;
        }
    }
    /**
     * Checks if a file exists
     * @param url File URL or path
     * @returns Promise resolving to existence status
     */
    async exists(url) {
        try {
            const filePath = this.extractFilePath(url);
            const resolvedPath = this.resolvePath(filePath);
            await fs.access(resolvedPath, fs.constants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    /**
     * Gets file metadata without reading content
     * @param url File URL or path
     * @returns Promise resolving to file metadata
     */
    async getMetadata(url) {
        const filePath = this.extractFilePath(url);
        const resolvedPath = this.resolvePath(filePath);
        await this.validateFileAccess(resolvedPath);
        const stats = await fs.stat(resolvedPath);
        const mimeType = this.determineMimeType(resolvedPath);
        return {
            path: resolvedPath,
            size: stats.size,
            mimeType,
            lastModified: stats.mtime,
            created: stats.ctime,
            isDirectory: stats.isDirectory(),
            isFile: stats.isFile(),
            permissions: stats.mode
        };
    }
    /**
     * Gets the base path for relative file resolution
     * @returns Base path or undefined
     */
    getBasePath() {
        return this.basePath;
    }
    /**
     * Gets allowed file extensions
     * @returns Set of allowed extensions or undefined
     */
    getAllowedExtensions() {
        return this.allowedExtensions ? new Set(this.allowedExtensions) : undefined;
    }
}
exports.FileFetcher = FileFetcher;
//# sourceMappingURL=FileFetcher.js.map