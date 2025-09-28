"use strict";
/**
 * File storage wrapper that tracks processed/cleaned files
 * Open/Closed Principle: Extends functionality without modifying base storage
 * Single Responsibility: Adds processed file tracking to storage operations
 * Decorator Pattern: Wraps existing storage with additional behavior
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
exports.ProcessedFileStorageWithTracking = void 0;
const IProcessedFileRepository_1 = require("../interfaces/IProcessedFileRepository");
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
class ProcessedFileStorageWithTracking {
    baseStorage;
    processedFileRepository;
    constructor(baseStorage, processedFileRepository) {
        this.baseStorage = baseStorage;
        this.processedFileRepository = processedFileRepository;
    }
    /**
     * Store processed content and track it in the repository
     */
    async store(content, filename, options) {
        // Ensure processed files go to the correct directory
        const processedFilename = this.ensureProcessedPath(filename);
        // Store the file using base storage
        const storagePath = await this.baseStorage.store(content, processedFilename, options);
        // Track the processed file
        try {
            // Calculate checksum
            const checksum = crypto.createHash('sha256').update(content).digest('hex');
            // Extract metadata from options
            const url = options?.metadata?.url || 'unknown';
            const mimeType = options?.metadata?.mimeType || this.guessMimeType(filename);
            const originalFileId = options?.metadata?.originalFileId;
            const processingType = options?.metadata?.processingType || IProcessedFileRepository_1.ProcessingType.CLEANED;
            const cleanersUsed = options?.metadata?.cleanersUsed;
            const cleaningConfig = options?.metadata?.cleaningConfig;
            const fileInfo = {
                originalFileId,
                url,
                filePath: storagePath,
                mimeType,
                size: content.length,
                checksum,
                processingType,
                cleanersUsed,
                cleaningConfig,
                metadata: {
                    ...options?.metadata,
                    filename: processedFilename,
                    storedAt: new Date().toISOString(),
                    originalFilename: filename
                }
            };
            const fileId = await this.processedFileRepository.recordProcessedFile(fileInfo);
            // Store the file ID in metadata for reference
            const metadataWithId = {
                ...fileInfo.metadata,
                processedFileId: fileId
            };
            // Update metadata file with the ID
            await this.updateMetadataWithId(storagePath, metadataWithId);
        }
        catch (error) {
            // Log error but don't fail the storage operation
            console.error('Failed to track processed file:', error);
        }
        return storagePath;
    }
    /**
     * Retrieve processed file content
     */
    async retrieve(path) {
        return this.baseStorage.retrieve(path);
    }
    /**
     * Check if processed file exists
     */
    async exists(path) {
        return this.baseStorage.exists(path);
    }
    /**
     * Delete processed file and update tracking
     */
    async delete(path) {
        // First delete from base storage
        const deleted = await this.baseStorage.delete(path);
        if (deleted) {
            // Update status in repository (don't delete record, just mark as deleted)
            try {
                const metadata = await this.getMetadata(path);
                if (metadata?.metadata?.processedFileId) {
                    await this.processedFileRepository.updateFileStatus(metadata.metadata.processedFileId, 'deleted' // We'll need to import ProcessedFileStatus
                    );
                }
            }
            catch (error) {
                console.error('Failed to update processed file status:', error);
            }
        }
        return deleted;
    }
    /**
     * Get metadata for processed file
     */
    async getMetadata(path) {
        return this.baseStorage.getMetadata(path);
    }
    /**
     * List processed files
     */
    async list(pattern, options) {
        // List files matching the pattern (base storage handles paths)
        return this.baseStorage.list(pattern, options);
    }
    /**
     * Get storage statistics
     */
    async getStats() {
        return this.baseStorage.getStats();
    }
    /**
     * Ensure filename includes processed files path
     */
    ensureProcessedPath(filename) {
        // Extract just the filename from any path
        const basename = path.basename(filename);
        // Add prefix to indicate it's a processed file
        const processedName = basename.startsWith('processed_') ?
            basename :
            `processed_${Date.now()}_${basename}`;
        // Return just the filename (base storage will handle the path)
        return processedName;
    }
    /**
     * Guess MIME type from filename
     */
    guessMimeType(filename) {
        const ext = path.extname(filename).toLowerCase();
        const mimeTypes = {
            '.txt': 'text/plain',
            '.html': 'text/html',
            '.md': 'text/markdown',
            '.json': 'application/json',
            '.xml': 'application/xml'
        };
        return mimeTypes[ext] || 'text/plain';
    }
    /**
     * Update metadata file with processed file ID
     */
    async updateMetadataWithId(filePath, metadata) {
        try {
            const metadataPath = `${filePath}.meta.json`;
            const existingMetadata = await this.baseStorage.getMetadata(filePath);
            if (existingMetadata) {
                const updatedMetadata = {
                    ...existingMetadata,
                    metadata: {
                        ...existingMetadata.metadata,
                        ...metadata
                    }
                };
                // Write updated metadata directly using fs since base storage doesn't have update method
                const fs = await Promise.resolve().then(() => __importStar(require('fs/promises')));
                await fs.writeFile(metadataPath, JSON.stringify(updatedMetadata, null, 2));
            }
        }
        catch (error) {
            console.error('Failed to update metadata with processed file ID:', error);
        }
    }
}
exports.ProcessedFileStorageWithTracking = ProcessedFileStorageWithTracking;
//# sourceMappingURL=ProcessedFileStorageWithTracking.js.map