"use strict";
/**
 * File-based knowledge store implementation
 * Single Responsibility: Manages knowledge entries using file system storage
 * Suitable for persistent storage without external databases
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
exports.FileKnowledgeStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const BaseKnowledgeStore_1 = require("./BaseKnowledgeStore");
const IKnowledgeStore_1 = require("../interfaces/IKnowledgeStore");
class FileKnowledgeStore extends BaseKnowledgeStore_1.BaseKnowledgeStore {
    storePath;
    indexPath;
    entriesPath;
    backupEnabled;
    // In-memory cache for performance
    entriesCache = null;
    indexCache = null;
    cacheLastModified = 0;
    constructor(storePath, indexedFields, backupEnabled = true) {
        super(indexedFields);
        this.storePath = path.resolve(storePath);
        this.indexPath = path.join(this.storePath, 'index.json');
        this.entriesPath = path.join(this.storePath, 'entries');
        this.backupEnabled = backupEnabled;
    }
    async store(entry) {
        this.validateEntry(entry);
        await this.ensureDirectories();
        await this.loadCache();
        // Check for existing entry with same URL
        const existingId = this.findByUrl(entry.url);
        if (existingId && existingId !== entry.id) {
            throw new Error(`Entry with URL already exists: ${entry.url}`);
        }
        // Write entry file
        const entryFile = path.join(this.entriesPath, `${entry.id}.json`);
        await this.writeEntryFile(entryFile, entry);
        // Update cache and index
        if (this.entriesCache) {
            this.entriesCache.set(entry.id, { ...entry });
        }
        if (this.indexCache) {
            this.updateIndex(entry, 'add');
            await this.saveIndex();
        }
        return entry.id;
    }
    async retrieve(id) {
        await this.loadCache();
        if (this.entriesCache?.has(id)) {
            return { ...this.entriesCache.get(id) };
        }
        // Try loading directly from file
        const entryFile = path.join(this.entriesPath, `${id}.json`);
        try {
            const content = await fs.readFile(entryFile, 'utf8');
            const entry = JSON.parse(content);
            // Convert date strings back to Date objects
            entry.createdAt = new Date(entry.createdAt);
            entry.updatedAt = new Date(entry.updatedAt);
            return entry;
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return null;
            }
            throw error;
        }
    }
    async update(id, updates) {
        const existing = await this.retrieve(id);
        if (!existing)
            return false;
        await this.loadCache();
        // Create backup if enabled
        if (this.backupEnabled) {
            await this.createBackup(existing);
        }
        // Apply updates
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date()
        };
        this.validateEntry(updated);
        // Write updated entry
        const entryFile = path.join(this.entriesPath, `${id}.json`);
        await this.writeEntryFile(entryFile, updated);
        // Update cache and index
        if (this.entriesCache) {
            this.entriesCache.set(id, { ...updated });
        }
        if (this.indexCache) {
            this.updateIndex(existing, 'remove');
            this.updateIndex(updated, 'add');
            await this.saveIndex();
        }
        return true;
    }
    async delete(id) {
        const existing = await this.retrieve(id);
        if (!existing)
            return false;
        await this.loadCache();
        // Create backup if enabled
        if (this.backupEnabled) {
            await this.createBackup(existing);
        }
        // Delete entry file
        const entryFile = path.join(this.entriesPath, `${id}.json`);
        try {
            await fs.unlink(entryFile);
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        // Update cache and index
        if (this.entriesCache) {
            this.entriesCache.delete(id);
        }
        if (this.indexCache) {
            this.updateIndex(existing, 'remove');
            await this.saveIndex();
        }
        return true;
    }
    async search(criteria) {
        this.validateSearchCriteria(criteria);
        await this.loadCache();
        if (!this.entriesCache || !this.indexCache) {
            return [];
        }
        let candidateIds = null;
        // Use indexes for efficient filtering
        if (criteria.contentType && this.indexCache.contentTypes.has(criteria.contentType)) {
            candidateIds = new Set(this.indexCache.contentTypes.get(criteria.contentType));
        }
        if (criteria.tags && criteria.tags.length > 0) {
            const tagIds = new Set();
            for (const tag of criteria.tags) {
                const entryIds = this.indexCache.tags.get(tag) || [];
                entryIds.forEach(id => tagIds.add(id));
            }
            if (candidateIds === null) {
                candidateIds = tagIds;
            }
            else {
                candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)));
            }
        }
        // Get entries to search
        const entriesToSearch = candidateIds
            ? Array.from(candidateIds).map(id => this.entriesCache.get(id)).filter(Boolean)
            : Array.from(this.entriesCache.values());
        // Apply additional filtering
        let matchingEntries = entriesToSearch.filter(entry => this.matchesSearchCriteria(entry, criteria));
        // Sort results
        matchingEntries = this.sortEntries(matchingEntries, criteria.sortBy, criteria.sortOrder);
        // Apply pagination
        return this.paginateEntries(matchingEntries, criteria.offset, criteria.limit);
    }
    async getStats() {
        await this.loadCache();
        if (!this.entriesCache) {
            return {
                totalEntries: 0,
                totalSize: 0,
                contentTypes: {},
                processingStatus: {
                    [IKnowledgeStore_1.ProcessingStatus.PENDING]: 0,
                    [IKnowledgeStore_1.ProcessingStatus.PROCESSING]: 0,
                    [IKnowledgeStore_1.ProcessingStatus.COMPLETED]: 0,
                    [IKnowledgeStore_1.ProcessingStatus.FAILED]: 0
                }
            };
        }
        const entries = Array.from(this.entriesCache.values());
        const totalEntries = entries.length;
        if (totalEntries === 0) {
            return {
                totalEntries: 0,
                totalSize: 0,
                contentTypes: {},
                processingStatus: {
                    [IKnowledgeStore_1.ProcessingStatus.PENDING]: 0,
                    [IKnowledgeStore_1.ProcessingStatus.PROCESSING]: 0,
                    [IKnowledgeStore_1.ProcessingStatus.COMPLETED]: 0,
                    [IKnowledgeStore_1.ProcessingStatus.FAILED]: 0
                }
            };
        }
        const totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
        // Count by content type
        const contentTypes = {};
        for (const entry of entries) {
            contentTypes[entry.contentType] = (contentTypes[entry.contentType] || 0) + 1;
        }
        // Count by processing status
        const processingStatus = {
            [IKnowledgeStore_1.ProcessingStatus.PENDING]: 0,
            [IKnowledgeStore_1.ProcessingStatus.PROCESSING]: 0,
            [IKnowledgeStore_1.ProcessingStatus.COMPLETED]: 0,
            [IKnowledgeStore_1.ProcessingStatus.FAILED]: 0
        };
        for (const entry of entries) {
            processingStatus[entry.processingStatus]++;
        }
        // Find oldest and newest entries
        const sortedByDate = [...entries].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        const oldestEntry = sortedByDate[0].createdAt;
        const newestEntry = sortedByDate[sortedByDate.length - 1].createdAt;
        return {
            totalEntries,
            totalSize,
            contentTypes,
            processingStatus,
            oldestEntry,
            newestEntry
        };
    }
    /**
     * Ensures required directories exist
     */
    async ensureDirectories() {
        try {
            await fs.mkdir(this.storePath, { recursive: true });
            await fs.mkdir(this.entriesPath, { recursive: true });
            if (this.backupEnabled) {
                const backupPath = path.join(this.storePath, 'backups');
                await fs.mkdir(backupPath, { recursive: true });
            }
        }
        catch (error) {
            throw new Error(`Failed to create directories: ${error.message}`);
        }
    }
    /**
     * Loads cache from disk if needed
     */
    async loadCache() {
        try {
            const indexStat = await fs.stat(this.indexPath).catch(() => null);
            const indexModified = indexStat?.mtime.getTime() || 0;
            // Check if cache is still valid
            if (this.entriesCache && this.indexCache && indexModified <= this.cacheLastModified) {
                return;
            }
            // Load index
            this.indexCache = await this.loadIndex();
            // Load all entries
            this.entriesCache = new Map();
            const entryFiles = await fs.readdir(this.entriesPath).catch(() => []);
            for (const file of entryFiles) {
                if (!file.endsWith('.json'))
                    continue;
                const entryFile = path.join(this.entriesPath, file);
                try {
                    const content = await fs.readFile(entryFile, 'utf8');
                    const entry = JSON.parse(content);
                    // Convert date strings back to Date objects
                    entry.createdAt = new Date(entry.createdAt);
                    entry.updatedAt = new Date(entry.updatedAt);
                    this.entriesCache.set(entry.id, entry);
                }
                catch (error) {
                    console.warn(`Failed to load entry from ${file}:`, error.message);
                }
            }
            this.cacheLastModified = Date.now();
        }
        catch (error) {
            console.warn('Failed to load cache, starting fresh:', error.message);
            this.entriesCache = new Map();
            this.indexCache = this.createEmptyIndex();
        }
    }
    /**
     * Loads index from disk
     */
    async loadIndex() {
        try {
            const content = await fs.readFile(this.indexPath, 'utf8');
            const indexData = JSON.parse(content);
            return {
                urls: new Map(Object.entries(indexData.urls || {})),
                contentTypes: new Map(Object.entries(indexData.contentTypes || {})),
                tags: new Map(Object.entries(indexData.tags || {}))
            };
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return this.createEmptyIndex();
            }
            throw error;
        }
    }
    /**
     * Saves index to disk
     */
    async saveIndex() {
        if (!this.indexCache)
            return;
        const indexData = {
            urls: Object.fromEntries(this.indexCache.urls.entries()),
            contentTypes: Object.fromEntries(this.indexCache.contentTypes.entries()),
            tags: Object.fromEntries(this.indexCache.tags.entries())
        };
        await fs.writeFile(this.indexPath, JSON.stringify(indexData, null, 2), 'utf8');
    }
    /**
     * Creates an empty index
     */
    createEmptyIndex() {
        return {
            urls: new Map(),
            contentTypes: new Map(),
            tags: new Map()
        };
    }
    /**
     * Updates the index with an entry
     */
    updateIndex(entry, operation) {
        if (!this.indexCache)
            return;
        if (operation === 'add') {
            // URL index
            const urlIds = this.indexCache.urls.get(entry.url) || [];
            if (!urlIds.includes(entry.id)) {
                urlIds.push(entry.id);
                this.indexCache.urls.set(entry.url, urlIds);
            }
            // Content type index
            const contentTypeIds = this.indexCache.contentTypes.get(entry.contentType) || [];
            if (!contentTypeIds.includes(entry.id)) {
                contentTypeIds.push(entry.id);
                this.indexCache.contentTypes.set(entry.contentType, contentTypeIds);
            }
            // Tag index
            for (const tag of entry.tags) {
                const tagIds = this.indexCache.tags.get(tag) || [];
                if (!tagIds.includes(entry.id)) {
                    tagIds.push(entry.id);
                    this.indexCache.tags.set(tag, tagIds);
                }
            }
        }
        else {
            // Remove from indexes
            this.removeFromIndex(this.indexCache.urls, entry.url, entry.id);
            this.removeFromIndex(this.indexCache.contentTypes, entry.contentType, entry.id);
            for (const tag of entry.tags) {
                this.removeFromIndex(this.indexCache.tags, tag, entry.id);
            }
        }
    }
    removeFromIndex(index, key, entryId) {
        const ids = index.get(key);
        if (ids) {
            const idx = ids.indexOf(entryId);
            if (idx !== -1) {
                ids.splice(idx, 1);
                if (ids.length === 0) {
                    index.delete(key);
                }
            }
        }
    }
    /**
     * Finds entry ID by URL
     */
    findByUrl(url) {
        if (!this.indexCache)
            return null;
        const entryIds = this.indexCache.urls.get(url);
        return entryIds && entryIds.length > 0 ? entryIds[0] : null;
    }
    /**
     * Writes an entry to file
     */
    async writeEntryFile(filePath, entry) {
        const content = JSON.stringify(entry, null, 2);
        await fs.writeFile(filePath, content, 'utf8');
    }
    /**
     * Creates a backup of an entry
     */
    async createBackup(entry) {
        if (!this.backupEnabled)
            return;
        const backupDir = path.join(this.storePath, 'backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupFile = path.join(backupDir, `${entry.id}_${timestamp}.json`);
        await this.writeEntryFile(backupFile, entry);
    }
    /**
     * Invalidates the cache
     */
    invalidateCache() {
        this.entriesCache = null;
        this.indexCache = null;
        this.cacheLastModified = 0;
    }
    /**
     * Gets the store path
     */
    getStorePath() {
        return this.storePath;
    }
    /**
     * Rebuilds the index from all entries
     */
    async rebuildIndex() {
        await this.loadCache();
        if (!this.entriesCache)
            return;
        this.indexCache = this.createEmptyIndex();
        for (const entry of this.entriesCache.values()) {
            this.updateIndex(entry, 'add');
        }
        await this.saveIndex();
    }
}
exports.FileKnowledgeStore = FileKnowledgeStore;
//# sourceMappingURL=FileKnowledgeStore.js.map