"use strict";
/**
 * Local file system storage implementation
 * Single Responsibility: Manages file storage on local file system
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
exports.LocalFileStorage = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const BaseFileStorage_1 = require("./BaseFileStorage");
const IFileStorage_1 = require("../interfaces/IFileStorage");
class LocalFileStorage extends BaseFileStorage_1.BaseFileStorage {
    constructor(basePath, compressionEnabled = false, encryptionEnabled = false) {
        super(basePath, compressionEnabled, encryptionEnabled);
    }
    async store(content, filename, options = {}) {
        this.validateFilename(filename);
        this.validateStorageOptions(options);
        await this.ensureBaseDirectory();
        // Generate unique filename if collision would occur
        let finalFilename = filename;
        if (!options.overwrite) {
            const potentialPath = path.join(this.basePath, filename);
            if (await this.exists(potentialPath)) {
                finalFilename = this.generateUniqueFilename(filename, content);
            }
        }
        const filePath = path.join(this.basePath, finalFilename);
        // Process content (compression, encryption)
        let processedContent = await this.compressContent(content, options);
        processedContent = await this.encryptContent(processedContent, options);
        // Write file
        await fs.writeFile(filePath, processedContent);
        // Write metadata
        const metadata = this.createFileMetadata(filePath, content, options);
        await this.writeMetadata(filePath, metadata);
        return filePath;
    }
    async retrieve(filePath) {
        try {
            const metadata = await this.getMetadata(filePath);
            if (!metadata)
                return null;
            let content = await fs.readFile(filePath);
            // Process content (decryption, decompression)
            content = await this.decryptContent(content, metadata);
            content = await this.decompressContent(content, metadata);
            return content;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async exists(filePath) {
        try {
            await fs.access(filePath, fs.constants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    }
    async delete(filePath) {
        try {
            // Delete the file
            await fs.unlink(filePath);
            // Delete metadata
            const metadataPath = this.getMetadataPath(filePath);
            try {
                await fs.unlink(metadataPath);
            }
            catch {
                // Ignore metadata deletion errors
            }
            return true;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return false;
            }
            throw error;
        }
    }
    async getMetadata(filePath) {
        const metadataPath = this.getMetadataPath(filePath);
        try {
            const metadataContent = await fs.readFile(metadataPath, 'utf8');
            const metadata = JSON.parse(metadataContent);
            // Convert date strings back to Date objects
            metadata.createdAt = new Date(metadata.createdAt);
            metadata.updatedAt = new Date(metadata.updatedAt);
            return metadata;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                // Fallback: create metadata from file stats
                return await this.createMetadataFromStats(filePath);
            }
            throw error;
        }
    }
    async list(pattern, options = {}) {
        this.validateListOptions(options);
        try {
            const files = await fs.readdir(this.basePath);
            const matchingFiles = [];
            for (const file of files) {
                // Skip metadata files
                if (file.endsWith('.meta.json'))
                    continue;
                if (!this.matchesPattern(file, pattern))
                    continue;
                const filePath = path.join(this.basePath, file);
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    let metadata = null;
                    if (options.includeMetadata) {
                        metadata = await this.getMetadata(filePath);
                    }
                    if (!metadata) {
                        metadata = {
                            path: filePath,
                            size: stats.size,
                            createdAt: stats.birthtime,
                            updatedAt: stats.mtime,
                            mimeType: this.determineMimeType(file),
                            checksum: '',
                            isCompressed: false,
                            isEncrypted: false,
                            metadata: {}
                        };
                    }
                    matchingFiles.push(metadata);
                }
            }
            // Sort files
            const sortedFiles = this.sortFiles(matchingFiles, options.sortBy || IFileStorage_1.FileSort.NAME, options.sortOrder || IFileStorage_1.SortOrder.ASC);
            // Apply pagination
            const paginatedFiles = this.paginateFiles(sortedFiles, options.limit);
            // Return paths
            return paginatedFiles.map(file => file.path);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
    async getStats() {
        try {
            const files = await fs.readdir(this.basePath);
            let totalFiles = 0;
            let totalSize = 0;
            const fileTypes = {};
            let oldestFile;
            let newestFile;
            for (const file of files) {
                // Skip metadata files
                if (file.endsWith('.meta.json'))
                    continue;
                const filePath = path.join(this.basePath, file);
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    totalFiles++;
                    totalSize += stats.size;
                    const ext = path.extname(file).toLowerCase();
                    fileTypes[ext] = (fileTypes[ext] || 0) + 1;
                    if (!oldestFile || stats.birthtime < oldestFile) {
                        oldestFile = stats.birthtime;
                    }
                    if (!newestFile || stats.birthtime > newestFile) {
                        newestFile = stats.birthtime;
                    }
                }
            }
            const averageFileSize = totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0;
            // Get available space
            let availableSpace;
            try {
                const stats = await fs.statfs(this.basePath);
                availableSpace = stats.bavail * stats.bsize;
            }
            catch {
                // Not all systems support statfs, ignore error
            }
            return {
                totalFiles,
                totalSize,
                averageFileSize,
                fileTypes,
                oldestFile,
                newestFile,
                availableSpace
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return {
                    totalFiles: 0,
                    totalSize: 0,
                    averageFileSize: 0,
                    fileTypes: {},
                    availableSpace: undefined
                };
            }
            throw error;
        }
    }
    /**
     * Ensures the base directory exists
     */
    async ensureBaseDirectory() {
        try {
            await fs.mkdir(this.basePath, { recursive: true });
        }
        catch (error) {
            throw new Error(`Failed to create base directory: ${error.message}`);
        }
    }
    /**
     * Gets the metadata file path for a given file
     * @param filePath The file path
     * @returns Metadata file path
     */
    getMetadataPath(filePath) {
        const dir = path.dirname(filePath);
        const name = path.basename(filePath);
        return path.join(dir, `${name}.meta.json`);
    }
    /**
     * Writes metadata to a file
     * @param filePath The file path
     * @param metadata The metadata to write
     */
    async writeMetadata(filePath, metadata) {
        const metadataPath = this.getMetadataPath(filePath);
        const metadataContent = JSON.stringify(metadata, null, 2);
        await fs.writeFile(metadataPath, metadataContent, 'utf8');
    }
    /**
     * Creates metadata from file stats (fallback)
     * @param filePath The file path
     * @returns File metadata or null if file doesn't exist
     */
    async createMetadataFromStats(filePath) {
        try {
            const stats = await fs.stat(filePath);
            if (!stats.isFile())
                return null;
            return {
                path: filePath,
                size: stats.size,
                createdAt: stats.birthtime,
                updatedAt: stats.mtime,
                mimeType: this.determineMimeType(path.basename(filePath)),
                checksum: '',
                isCompressed: false,
                isEncrypted: false,
                metadata: {}
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    /**
     * Gets the directory listing with detailed information
     * @param pattern Optional file pattern
     * @param options List options
     * @returns Array of file metadata
     */
    async listDetailed(pattern, options = {}) {
        this.validateListOptions(options);
        try {
            const files = await fs.readdir(this.basePath);
            const matchingFiles = [];
            for (const file of files) {
                // Skip metadata files
                if (file.endsWith('.meta.json'))
                    continue;
                if (!this.matchesPattern(file, pattern))
                    continue;
                const filePath = path.join(this.basePath, file);
                const stats = await fs.stat(filePath);
                if (stats.isFile()) {
                    const metadata = await this.getMetadata(filePath) ||
                        await this.createMetadataFromStats(filePath);
                    if (metadata) {
                        matchingFiles.push(metadata);
                    }
                }
            }
            // Sort files
            const sortedFiles = this.sortFiles(matchingFiles, options.sortBy || IFileStorage_1.FileSort.NAME, options.sortOrder || IFileStorage_1.SortOrder.ASC);
            // Apply pagination
            return this.paginateFiles(sortedFiles, options.limit);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
    /**
     * Cleans up orphaned metadata files
     * @returns Number of cleaned up files
     */
    async cleanupMetadata() {
        try {
            const files = await fs.readdir(this.basePath);
            let cleanedUp = 0;
            for (const file of files) {
                if (file.endsWith('.meta.json')) {
                    const originalFile = file.replace('.meta.json', '');
                    const originalPath = path.join(this.basePath, originalFile);
                    if (!await this.exists(originalPath)) {
                        const metadataPath = path.join(this.basePath, file);
                        await fs.unlink(metadataPath);
                        cleanedUp++;
                    }
                }
            }
            return cleanedUp;
        }
        catch (error) {
            throw new Error(`Failed to cleanup metadata: ${error.message}`);
        }
    }
}
exports.LocalFileStorage = LocalFileStorage;
//# sourceMappingURL=LocalFileStorage.js.map