"use strict";
/**
 * File storage wrapper that tracks original files
 * Open/Closed Principle: Extends functionality without modifying base storage
 * Single Responsibility: Adds file tracking to storage operations
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
exports.FileStorageWithTracking = void 0;
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
class FileStorageWithTracking {
    baseStorage;
    originalFileRepository;
    constructor(baseStorage, originalFileRepository) {
        this.baseStorage = baseStorage;
        this.originalFileRepository = originalFileRepository;
    }
    async store(content, filename, options) {
        // First, store the file using base storage
        const storagePath = await this.baseStorage.store(content, filename, options);
        // Then track the original file
        try {
            // Calculate checksum
            const checksum = crypto.createHash('sha256').update(content).digest('hex');
            // Extract URL and other metadata from options
            const url = options?.metadata?.url || 'unknown';
            const mimeType = options?.metadata?.mimeType || this.guessMimeType(filename);
            const scraperUsed = options?.metadata?.scraperUsed;
            const fileInfo = {
                url,
                filePath: storagePath,
                mimeType,
                size: content.length,
                checksum,
                scraperUsed,
                metadata: {
                    ...options?.metadata,
                    filename,
                    storedAt: new Date().toISOString()
                }
            };
            await this.originalFileRepository.recordOriginalFile(fileInfo);
            // Successfully tracked original file
        }
        catch (error) {
            // Log error but don't fail the storage operation
            console.error('Failed to track original file:', error);
        }
        return storagePath;
    }
    async retrieve(path) {
        return this.baseStorage.retrieve(path);
    }
    async exists(path) {
        return this.baseStorage.exists(path);
    }
    async delete(path) {
        return this.baseStorage.delete(path);
    }
    async getMetadata(path) {
        return this.baseStorage.getMetadata(path);
    }
    async list(pattern, options) {
        return this.baseStorage.list(pattern, options);
    }
    async getStats() {
        return this.baseStorage.getStats();
    }
    guessMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.html': 'text/html',
            '.pdf': 'application/pdf',
            '.txt': 'text/plain',
            '.json': 'application/json',
            '.xml': 'application/xml',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.rtf': 'application/rtf'
        };
        return mimeTypes[ext] || 'application/octet-stream';
    }
}
exports.FileStorageWithTracking = FileStorageWithTracking;
//# sourceMappingURL=FileStorageWithTracking.js.map