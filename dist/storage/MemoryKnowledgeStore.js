"use strict";
/**
 * In-memory knowledge store implementation
 * Single Responsibility: Manages knowledge entries in memory
 * Suitable for development, testing, and small datasets
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryKnowledgeStore = void 0;
const BaseKnowledgeStore_1 = require("./BaseKnowledgeStore");
const IKnowledgeStore_1 = require("../interfaces/IKnowledgeStore");
class MemoryKnowledgeStore extends BaseKnowledgeStore_1.BaseKnowledgeStore {
    entries;
    urlIndex; // url -> entry IDs
    contentTypeIndex; // contentType -> entry IDs
    tagIndex; // tag -> entry IDs
    constructor(indexedFields) {
        super(indexedFields);
        this.entries = new Map();
        this.urlIndex = new Map();
        this.contentTypeIndex = new Map();
        this.tagIndex = new Map();
    }
    async store(entry) {
        this.validateEntry(entry);
        // Check for existing entry with same URL
        const existingId = await this.findByUrl(entry.url);
        if (existingId && existingId !== entry.id) {
            throw new Error(`Entry with URL already exists: ${entry.url}`);
        }
        // Store the entry
        this.entries.set(entry.id, { ...entry });
        // Update indexes
        this.updateIndexes(entry, 'add');
        return entry.id;
    }
    async retrieve(id) {
        const entry = this.entries.get(id);
        return entry ? { ...entry } : null;
    }
    async update(id, updates) {
        const existing = this.entries.get(id);
        if (!existing)
            return false;
        // Remove from old indexes
        this.updateIndexes(existing, 'remove');
        // Apply updates
        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date()
        };
        // Validate updated entry
        this.validateEntry(updated);
        // Store updated entry
        this.entries.set(id, updated);
        // Update indexes
        this.updateIndexes(updated, 'add');
        return true;
    }
    async delete(id) {
        const entry = this.entries.get(id);
        if (!entry)
            return false;
        // Remove from indexes
        this.updateIndexes(entry, 'remove');
        // Delete entry
        this.entries.delete(id);
        return true;
    }
    async search(criteria) {
        this.validateSearchCriteria(criteria);
        let candidateIds = null;
        // Use indexes for efficient filtering when possible
        if (criteria.contentType) {
            candidateIds = new Set(this.contentTypeIndex.get(criteria.contentType) || []);
        }
        if (criteria.tags && criteria.tags.length > 0) {
            const tagIds = new Set();
            for (const tag of criteria.tags) {
                const entryIds = this.tagIndex.get(tag) || [];
                entryIds.forEach(id => tagIds.add(id));
            }
            if (candidateIds === null) {
                candidateIds = tagIds;
            }
            else {
                // Intersection with existing candidates
                candidateIds = new Set([...candidateIds].filter(id => tagIds.has(id)));
            }
        }
        // Get entries to search (either candidates or all entries)
        const entriesToSearch = candidateIds
            ? Array.from(candidateIds).map(id => this.entries.get(id)).filter(Boolean)
            : Array.from(this.entries.values());
        // Apply additional filtering
        let matchingEntries = entriesToSearch.filter(entry => this.matchesSearchCriteria(entry, criteria));
        // Sort results
        matchingEntries = this.sortEntries(matchingEntries, criteria.sortBy, criteria.sortOrder);
        // Apply pagination
        return this.paginateEntries(matchingEntries, criteria.offset, criteria.limit);
    }
    async getStats() {
        const entries = Array.from(this.entries.values());
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
     * Finds entry ID by URL
     * @param url The URL to search for
     * @returns Entry ID or null if not found
     */
    async findByUrl(url) {
        const entryIds = this.urlIndex.get(url);
        return entryIds && entryIds.length > 0 ? entryIds[0] : null;
    }
    /**
     * Updates the various indexes
     * @param entry The entry to index
     * @param operation Add or remove from indexes
     */
    updateIndexes(entry, operation) {
        if (operation === 'add') {
            // URL index
            const urlIds = this.urlIndex.get(entry.url) || [];
            if (!urlIds.includes(entry.id)) {
                urlIds.push(entry.id);
                this.urlIndex.set(entry.url, urlIds);
            }
            // Content type index
            const contentTypeIds = this.contentTypeIndex.get(entry.contentType) || [];
            if (!contentTypeIds.includes(entry.id)) {
                contentTypeIds.push(entry.id);
                this.contentTypeIndex.set(entry.contentType, contentTypeIds);
            }
            // Tag index
            for (const tag of entry.tags) {
                const tagIds = this.tagIndex.get(tag) || [];
                if (!tagIds.includes(entry.id)) {
                    tagIds.push(entry.id);
                    this.tagIndex.set(tag, tagIds);
                }
            }
        }
        else {
            // Remove from URL index
            const urlIds = this.urlIndex.get(entry.url) || [];
            const urlIndex = urlIds.indexOf(entry.id);
            if (urlIndex !== -1) {
                urlIds.splice(urlIndex, 1);
                if (urlIds.length === 0) {
                    this.urlIndex.delete(entry.url);
                }
                else {
                    this.urlIndex.set(entry.url, urlIds);
                }
            }
            // Remove from content type index
            const contentTypeIds = this.contentTypeIndex.get(entry.contentType) || [];
            const contentTypeIndex = contentTypeIds.indexOf(entry.id);
            if (contentTypeIndex !== -1) {
                contentTypeIds.splice(contentTypeIndex, 1);
                if (contentTypeIds.length === 0) {
                    this.contentTypeIndex.delete(entry.contentType);
                }
                else {
                    this.contentTypeIndex.set(entry.contentType, contentTypeIds);
                }
            }
            // Remove from tag indexes
            for (const tag of entry.tags) {
                const tagIds = this.tagIndex.get(tag) || [];
                const tagIndex = tagIds.indexOf(entry.id);
                if (tagIndex !== -1) {
                    tagIds.splice(tagIndex, 1);
                    if (tagIds.length === 0) {
                        this.tagIndex.delete(tag);
                    }
                    else {
                        this.tagIndex.set(tag, tagIds);
                    }
                }
            }
        }
    }
    /**
     * Gets all entries (for testing/debugging)
     * @returns Array of all entries
     */
    async getAllEntries() {
        return Array.from(this.entries.values()).map(entry => ({ ...entry }));
    }
    /**
     * Clears all entries and indexes
     */
    async clear() {
        this.entries.clear();
        this.urlIndex.clear();
        this.contentTypeIndex.clear();
        this.tagIndex.clear();
    }
    /**
     * Gets the current size of the store
     * @returns Number of entries
     */
    size() {
        return this.entries.size;
    }
    /**
     * Checks if an entry exists
     * @param id The entry ID
     * @returns true if entry exists
     */
    has(id) {
        return this.entries.has(id);
    }
    /**
     * Gets index statistics for debugging
     * @returns Index statistics
     */
    getIndexStats() {
        return {
            urlIndexSize: this.urlIndex.size,
            contentTypeIndexSize: this.contentTypeIndex.size,
            tagIndexSize: this.tagIndex.size,
            totalEntries: this.entries.size
        };
    }
    /**
     * Rebuilds all indexes (useful for maintenance)
     */
    async rebuildIndexes() {
        // Clear existing indexes
        this.urlIndex.clear();
        this.contentTypeIndex.clear();
        this.tagIndex.clear();
        // Rebuild from current entries
        for (const entry of this.entries.values()) {
            this.updateIndexes(entry, 'add');
        }
    }
}
exports.MemoryKnowledgeStore = MemoryKnowledgeStore;
//# sourceMappingURL=MemoryKnowledgeStore.js.map