"use strict";
/**
 * Base class for file storage implementations
 * Template Method Pattern + Single Responsibility Principle
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
exports.BaseFileStorage = void 0;
const IFileStorage_1 = require("../interfaces/IFileStorage");
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
class BaseFileStorage {
    basePath;
    compressionEnabled;
    encryptionEnabled;
    constructor(basePath, compressionEnabled = false, encryptionEnabled = false) {
        this.basePath = path.resolve(basePath);
        this.compressionEnabled = compressionEnabled;
        this.encryptionEnabled = encryptionEnabled;
    }
    /**
     * Validates storage options
     * @param options Storage options to validate
     * @throws Error if validation fails
     */
    validateStorageOptions(options = {}) {
        if (options.metadata && typeof options.metadata !== 'object') {
            throw new Error('Metadata must be an object');
        }
    }
    /**
     * Validates list options
     * @param options List options to validate
     * @throws Error if validation fails
     */
    validateListOptions(options = {}) {
        if (options.limit !== undefined && options.limit < 0) {
            throw new Error('List limit cannot be negative');
        }
        if (options.sortBy !== undefined && !Object.values(IFileStorage_1.FileSort).includes(options.sortBy)) {
            throw new Error('Invalid sort field');
        }
        if (options.sortOrder !== undefined && !Object.values(IFileStorage_1.SortOrder).includes(options.sortOrder)) {
            throw new Error('Invalid sort order');
        }
    }
    /**
     * Validates filename
     * @param filename Filename to validate
     * @throws Error if validation fails
     */
    validateFilename(filename) {
        if (!filename || filename.trim().length === 0) {
            throw new Error('Filename cannot be empty');
        }
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw new Error('Filename cannot contain path separators or relative paths');
        }
        if (filename.length > 255) {
            throw new Error('Filename too long (max 255 characters)');
        }
        // Check for reserved names on Windows
        const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4',
            'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2',
            'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'];
        const nameWithoutExt = path.parse(filename).name.toUpperCase();
        if (reservedNames.includes(nameWithoutExt)) {
            throw new Error(`Filename cannot be a reserved name: ${nameWithoutExt}`);
        }
    }
    /**
     * Generates a unique filename to avoid collisions
     * @param originalFilename Original filename
     * @param content File content for hashing
     * @returns Unique filename
     */
    generateUniqueFilename(originalFilename, content) {
        const timestamp = Date.now();
        const contentHash = this.calculateChecksum(content).substring(0, 8);
        const ext = path.extname(originalFilename);
        const name = path.parse(originalFilename).name;
        return `${name}_${timestamp}_${contentHash}${ext}`;
    }
    /**
     * Calculates file checksum
     * @param content File content
     * @returns Content checksum
     */
    calculateChecksum(content) {
        return crypto.createHash('md5').update(content).digest('hex');
    }
    /**
     * Determines MIME type from filename
     * @param filename Filename to analyze
     * @returns MIME type
     */
    determineMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.csv': 'text/csv',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.gif': 'image/gif',
            '.bmp': 'image/bmp',
            '.svg': 'image/svg+xml',
            '.zip': 'application/zip',
            '.tar': 'application/x-tar',
            '.gz': 'application/gzip'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
    /**
     * Compresses content if compression is enabled
     * @param content Content to compress
     * @param options Storage options
     * @returns Compressed content or original if compression disabled
     */
    async compressContent(content, options) {
        if (!this.compressionEnabled && !options.compress) {
            return content;
        }
        // Simple gzip compression (in real implementation, you'd use zlib)
        // For now, return original content
        return content;
    }
    /**
     * Decompresses content if it was compressed
     * @param content Content to decompress
     * @param metadata File metadata
     * @returns Decompressed content or original if not compressed
     */
    async decompressContent(content, metadata) {
        if (!metadata.isCompressed) {
            return content;
        }
        // Simple gzip decompression (in real implementation, you'd use zlib)
        // For now, return original content
        return content;
    }
    /**
     * Encrypts content if encryption is enabled
     * @param content Content to encrypt
     * @param options Storage options
     * @returns Encrypted content or original if encryption disabled
     */
    async encryptContent(content, options) {
        if (!this.encryptionEnabled && !options.encrypt) {
            return content;
        }
        // Simple encryption (in real implementation, you'd use proper encryption)
        // For now, return original content
        return content;
    }
    /**
     * Decrypts content if it was encrypted
     * @param content Content to decrypt
     * @param metadata File metadata
     * @returns Decrypted content or original if not encrypted
     */
    async decryptContent(content, metadata) {
        if (!metadata.isEncrypted) {
            return content;
        }
        // Simple decryption (in real implementation, you'd use proper decryption)
        // For now, return original content
        return content;
    }
    /**
     * Creates file metadata
     * @param filePath File path
     * @param content File content
     * @param options Storage options
     * @returns File metadata
     */
    createFileMetadata(filePath, content, options = {}) {
        const now = new Date();
        return {
            path: filePath,
            size: content.length,
            createdAt: now,
            updatedAt: now,
            mimeType: this.determineMimeType(path.basename(filePath)),
            checksum: this.calculateChecksum(content),
            isCompressed: options.compress || false,
            isEncrypted: options.encrypt || false,
            metadata: options.metadata || {}
        };
    }
    /**
     * Sorts file metadata list
     * @param files File metadata array
     * @param sortBy Sort field
     * @param sortOrder Sort order
     * @returns Sorted file metadata array
     */
    sortFiles(files, sortBy = IFileStorage_1.FileSort.NAME, sortOrder = IFileStorage_1.SortOrder.ASC) {
        return files.sort((a, b) => {
            let comparison = 0;
            switch (sortBy) {
                case IFileStorage_1.FileSort.NAME:
                    comparison = path.basename(a.path).localeCompare(path.basename(b.path));
                    break;
                case IFileStorage_1.FileSort.SIZE:
                    comparison = a.size - b.size;
                    break;
                case IFileStorage_1.FileSort.CREATED_AT:
                    comparison = a.createdAt.getTime() - b.createdAt.getTime();
                    break;
                case IFileStorage_1.FileSort.UPDATED_AT:
                    comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
                    break;
                default:
                    comparison = 0;
            }
            return sortOrder === IFileStorage_1.SortOrder.ASC ? comparison : -comparison;
        });
    }
    /**
     * Applies pagination to file list
     * @param files File metadata array
     * @param limit Maximum number of files to return
     * @returns Paginated file metadata array
     */
    paginateFiles(files, limit) {
        if (!limit || limit <= 0) {
            return files;
        }
        return files.slice(0, limit);
    }
    /**
     * Matches files against a glob pattern
     * @param filename Filename to test
     * @param pattern Glob pattern
     * @returns true if filename matches pattern
     */
    matchesPattern(filename, pattern) {
        if (!pattern)
            return true;
        // Simple glob pattern matching (*, ?)
        const regexPattern = pattern
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(filename);
    }
    /**
     * Gets the base storage path
     * @returns Base storage path
     */
    getBasePath() {
        return this.basePath;
    }
    /**
     * Checks if compression is enabled
     * @returns true if compression is enabled
     */
    isCompressionEnabled() {
        return this.compressionEnabled;
    }
    /**
     * Checks if encryption is enabled
     * @returns true if encryption is enabled
     */
    isEncryptionEnabled() {
        return this.encryptionEnabled;
    }
}
exports.BaseFileStorage = BaseFileStorage;
//# sourceMappingURL=BaseFileStorage.js.map