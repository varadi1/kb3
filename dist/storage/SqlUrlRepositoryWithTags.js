"use strict";
/**
 * Enhanced SQL-based URL repository with tag support
 * Single Responsibility: Manages URL tracking with tag integration
 * Open/Closed: Extends SqlUrlRepository without modifying it
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlUrlRepositoryWithTags = void 0;
const SqlUrlRepository_1 = require("./SqlUrlRepository");
const SqlTagManager_1 = require("./SqlTagManager");
const SqlUrlTagRepository_1 = require("./SqlUrlTagRepository");
const ErrorHandler_1 = require("../utils/ErrorHandler");
class SqlUrlRepositoryWithTags extends SqlUrlRepository_1.SqlUrlRepository {
    tagManager;
    urlTagRepository;
    dbConnection = null;
    constructor(dbPath = './data/urls.db') {
        super(dbPath);
        // These will be initialized when the database is ready
        this.tagManager = null;
        this.urlTagRepository = null;
    }
    /**
     * Initialize repository with tag support
     */
    async initializeWithTags() {
        // Initialize parent repository first
        await this.initialize();
        try {
            // Get database connection from parent
            this.dbConnection = this.db;
            if (!this.dbConnection) {
                throw new Error('Database connection not available');
            }
            // Initialize tag manager and URL-tag repository
            this.tagManager = new SqlTagManager_1.SqlTagManager(this.dbConnection);
            await this.tagManager.initialize();
            this.urlTagRepository = new SqlUrlTagRepository_1.SqlUrlTagRepository(this.dbConnection, this.tagManager);
            await this.urlTagRepository.initialize();
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('TAG_INIT_ERROR', 'Failed to initialize tag support for URL repository', { error });
        }
    }
    /**
     * Register a URL with optional tags
     */
    async registerWithTags(url, metadata) {
        try {
            // Ensure initialization
            if (!this.tagManager || !this.urlTagRepository) {
                await this.initializeWithTags();
            }
            // Extract tags from metadata
            const tags = metadata?.tags || [];
            const metadataWithoutTags = { ...metadata };
            delete metadataWithoutTags.tags;
            // Register the URL using parent method
            const urlId = await this.register(url, metadataWithoutTags);
            // Add tags if provided
            if (tags.length > 0) {
                const tagIds = await this.tagManager.ensureTagsExist(tags);
                await this.urlTagRepository.addTagsToUrl(urlId, tagIds);
            }
            return urlId;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_REGISTER_WITH_TAGS_ERROR', 'Failed to register URL with tags', { url, metadata, error });
        }
    }
    /**
     * Get URL info with tags
     */
    async getUrlInfoWithTags(url) {
        try {
            const urlInfo = await this.getUrlInfo(url);
            if (!urlInfo)
                return null;
            const tags = await this.urlTagRepository.getTagsForUrl(urlInfo.id);
            return {
                ...urlInfo,
                tags
            };
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_INFO_WITH_TAGS_ERROR', 'Failed to get URL info with tags', { url, error });
        }
    }
    /**
     * Get URLs by tag names
     */
    async getUrlsByTags(tagNames, requireAll = false) {
        try {
            const urlIds = await this.urlTagRepository.getUrlsWithTagNames(tagNames, requireAll);
            const urls = [];
            for (const urlId of urlIds) {
                const urlRecord = await this.getUrlById(urlId);
                if (urlRecord) {
                    const tags = await this.urlTagRepository.getTagsForUrl(urlId);
                    urls.push({
                        ...urlRecord,
                        tags
                    });
                }
            }
            return urls;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_URLS_BY_TAGS_ERROR', 'Failed to get URLs by tags', { tagNames, requireAll, error });
        }
    }
    /**
     * Add tags to an existing URL
     */
    async addTagsToUrl(url, tagNames) {
        try {
            const urlInfo = await this.getUrlInfo(url);
            if (!urlInfo) {
                throw ErrorHandler_1.ErrorHandler.createError('URL_NOT_FOUND', 'URL not found in repository', { url });
            }
            const tagIds = await this.tagManager.ensureTagsExist(tagNames);
            return await this.urlTagRepository.addTagsToUrl(urlInfo.id, tagIds);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('ADD_TAGS_TO_URL_ERROR', 'Failed to add tags to URL', { url, tagNames, error });
        }
    }
    /**
     * Remove tags from an existing URL
     */
    async removeTagsFromUrl(url, tagNames) {
        try {
            const urlInfo = await this.getUrlInfo(url);
            if (!urlInfo) {
                throw ErrorHandler_1.ErrorHandler.createError('URL_NOT_FOUND', 'URL not found in repository', { url });
            }
            const tagIds = [];
            for (const name of tagNames) {
                const tag = await this.tagManager.getTagByName(name);
                if (tag) {
                    tagIds.push(tag.id);
                }
            }
            return await this.urlTagRepository.removeTagsFromUrl(urlInfo.id, tagIds);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('REMOVE_TAGS_FROM_URL_ERROR', 'Failed to remove tags from URL', { url, tagNames, error });
        }
    }
    /**
     * Set tags for a URL (replaces existing tags)
     */
    async setUrlTags(url, tagNames) {
        try {
            const urlInfo = await this.getUrlInfo(url);
            if (!urlInfo) {
                throw ErrorHandler_1.ErrorHandler.createError('URL_NOT_FOUND', 'URL not found in repository', { url });
            }
            const tagIds = await this.tagManager.ensureTagsExist(tagNames);
            return await this.urlTagRepository.setTagsForUrl(urlInfo.id, tagIds);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('SET_URL_TAGS_ERROR', 'Failed to set URL tags', { url, tagNames, error });
        }
    }
    /**
     * Get tags for a URL
     */
    async getUrlTags(url) {
        try {
            const urlInfo = await this.getUrlInfo(url);
            if (!urlInfo) {
                return [];
            }
            return await this.urlTagRepository.getTagsForUrl(urlInfo.id);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_URL_TAGS_ERROR', 'Failed to get URL tags', { url, error });
        }
    }
    /**
     * Batch register URLs with tags
     */
    async batchRegisterWithTags(urlsWithTags) {
        try {
            const urlIds = [];
            for (const item of urlsWithTags) {
                const metadata = {
                    ...item.metadata,
                    tags: item.tags
                };
                const urlId = await this.registerWithTags(item.url, metadata);
                urlIds.push(urlId);
            }
            return urlIds;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('BATCH_REGISTER_WITH_TAGS_ERROR', 'Failed to batch register URLs with tags', { urlsWithTags, error });
        }
    }
    /**
     * Get URL record by ID (helper method)
     */
    async getUrlById(id) {
        try {
            const row = await this.getFromDb('SELECT * FROM urls WHERE id = ?', [id]);
            if (!row)
                return null;
            return this.rowToUrlRecord(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_URL_BY_ID_ERROR', 'Failed to get URL by ID', { id, error });
        }
    }
    /**
     * Helper method to get from database
     */
    async getFromDb(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.dbConnection) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.dbConnection.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row || null);
            });
        });
    }
    /**
     * Convert database row to UrlRecord (helper)
     */
    rowToUrlRecord(row) {
        return {
            id: row.id,
            url: row.url,
            normalizedUrl: row.normalized_url,
            contentHash: row.content_hash || undefined,
            status: row.status,
            errorMessage: row.error_message || undefined,
            firstSeen: new Date(row.first_seen),
            lastChecked: new Date(row.last_checked),
            processCount: row.process_count,
            metadata: JSON.parse(row.metadata)
        };
    }
    /**
     * Get tag manager for external use
     */
    getTagManager() {
        return this.tagManager;
    }
    /**
     * Get URL-tag repository for external use
     */
    getUrlTagRepository() {
        return this.urlTagRepository;
    }
}
exports.SqlUrlRepositoryWithTags = SqlUrlRepositoryWithTags;
//# sourceMappingURL=SqlUrlRepositoryWithTags.js.map