"use strict";
/**
 * SQL-based implementation of IUrlTagRepository using SQLite
 * Single Responsibility: Manages URL-tag relationships
 * Dependency Inversion: Implements IUrlTagRepository abstraction
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqlUrlTagRepository = void 0;
const ErrorHandler_1 = require("../utils/ErrorHandler");
class SqlUrlTagRepository {
    db;
    tagManager;
    constructor(db, tagManager) {
        this.db = db;
        this.tagManager = tagManager;
    }
    /**
     * Initializes URL-tag relationship table
     */
    async initialize() {
        try {
            // Create many-to-many relationship table
            await this.run(`
        CREATE TABLE IF NOT EXISTS url_tags (
          url_id TEXT NOT NULL,
          tag_id TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          PRIMARY KEY (url_id, tag_id),
          FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
          FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
        )
      `);
            // Create indices for better query performance
            await this.run('CREATE INDEX IF NOT EXISTS idx_url_tags_url ON url_tags(url_id)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_url_tags_tag ON url_tags(tag_id)');
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_TAG_INIT_ERROR', 'Failed to initialize URL-tag relationship table', { error });
        }
    }
    async addTagsToUrl(urlId, tagIds) {
        try {
            if (tagIds.length === 0)
                return true;
            const now = Date.now();
            // Add each tag to the URL (ignore duplicates)
            for (const tagId of tagIds) {
                await this.run(`INSERT OR IGNORE INTO url_tags (url_id, tag_id, created_at)
           VALUES (?, ?, ?)`, [urlId, tagId, now]);
            }
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('ADD_TAGS_ERROR', 'Failed to add tags to URL', { urlId, tagIds, error });
        }
    }
    async removeTagsFromUrl(urlId, tagIds) {
        try {
            if (tagIds.length === 0)
                return true;
            const placeholders = tagIds.map(() => '?').join(',');
            await this.run(`DELETE FROM url_tags
         WHERE url_id = ? AND tag_id IN (${placeholders})`, [urlId, ...tagIds]);
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('REMOVE_TAGS_ERROR', 'Failed to remove tags from URL', { urlId, tagIds, error });
        }
    }
    async getTagsForUrl(urlId) {
        try {
            const rows = await this.all(`SELECT tag_id FROM url_tags
         WHERE url_id = ?
         ORDER BY created_at DESC`, [urlId]);
            const tags = [];
            for (const row of rows) {
                const tag = await this.tagManager.getTag(row.tag_id);
                if (tag) {
                    tags.push(tag);
                }
            }
            return tags;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_TAGS_ERROR', 'Failed to get tags for URL', { urlId, error });
        }
    }
    async getUrlsWithTag(tagId, includeChildren = false) {
        try {
            const tagIds = [tagId];
            if (includeChildren) {
                const childTags = await this.tagManager.getChildTags(tagId, true);
                tagIds.push(...childTags.map(t => t.id));
            }
            const placeholders = tagIds.map(() => '?').join(',');
            const rows = await this.all(`SELECT DISTINCT url_id FROM url_tags
         WHERE tag_id IN (${placeholders})
         ORDER BY url_id`, tagIds);
            return rows.map(row => row.url_id);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_URLS_WITH_TAG_ERROR', 'Failed to get URLs with tag', { tagId, includeChildren, error });
        }
    }
    async getUrlsWithTags(tagIds, requireAll = false) {
        try {
            if (tagIds.length === 0)
                return [];
            if (requireAll) {
                // URLs must have ALL specified tags
                const placeholders = tagIds.map(() => '?').join(',');
                const rows = await this.all(`SELECT url_id FROM url_tags
           WHERE tag_id IN (${placeholders})
           GROUP BY url_id
           HAVING COUNT(DISTINCT tag_id) = ?
           ORDER BY url_id`, [...tagIds, tagIds.length]);
                return rows.map(row => row.url_id);
            }
            else {
                // URLs with ANY of the specified tags
                const placeholders = tagIds.map(() => '?').join(',');
                const rows = await this.all(`SELECT DISTINCT url_id FROM url_tags
           WHERE tag_id IN (${placeholders})
           ORDER BY url_id`, tagIds);
                return rows.map(row => row.url_id);
            }
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_URLS_WITH_TAGS_ERROR', 'Failed to get URLs with tags', { tagIds, requireAll, error });
        }
    }
    async setTagsForUrl(urlId, tagIds) {
        try {
            // Start a transaction for atomicity
            await this.run('BEGIN TRANSACTION');
            try {
                // Clear existing tags
                await this.run('DELETE FROM url_tags WHERE url_id = ?', [urlId]);
                // Add new tags
                if (tagIds.length > 0) {
                    await this.addTagsToUrl(urlId, tagIds);
                }
                await this.run('COMMIT');
                return true;
            }
            catch (innerError) {
                await this.run('ROLLBACK');
                throw innerError;
            }
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('SET_TAGS_ERROR', 'Failed to set tags for URL', { urlId, tagIds, error });
        }
    }
    async clearTagsForUrl(urlId) {
        try {
            await this.run('DELETE FROM url_tags WHERE url_id = ?', [urlId]);
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('CLEAR_TAGS_ERROR', 'Failed to clear tags for URL', { urlId, error });
        }
    }
    async getTagUrlCounts(tagIds) {
        try {
            const counts = new Map();
            let sql = `SELECT tag_id, COUNT(*) as count
                 FROM url_tags`;
            const params = [];
            if (tagIds && tagIds.length > 0) {
                const placeholders = tagIds.map(() => '?').join(',');
                sql += ` WHERE tag_id IN (${placeholders})`;
                params.push(...tagIds);
            }
            sql += ' GROUP BY tag_id';
            const rows = await this.all(sql, params);
            for (const row of rows) {
                counts.set(row.tag_id, row.count);
            }
            return counts;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_TAG_COUNTS_ERROR', 'Failed to get tag URL counts', { tagIds, error });
        }
    }
    async urlHasTag(urlId, tagId) {
        try {
            const result = await this.get(`SELECT COUNT(*) as count FROM url_tags
         WHERE url_id = ? AND tag_id = ?`, [urlId, tagId]);
            return result ? result.count > 0 : false;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_HAS_TAG_ERROR', 'Failed to check if URL has tag', { urlId, tagId, error });
        }
    }
    async getUrlsWithTagNames(tagNames, requireAll = false) {
        try {
            if (tagNames.length === 0)
                return [];
            // Get tag IDs from names
            const tagIds = [];
            for (const name of tagNames) {
                const tag = await this.tagManager.getTagByName(name);
                if (tag) {
                    tagIds.push(tag.id);
                }
            }
            if (tagIds.length === 0)
                return [];
            return await this.getUrlsWithTags(tagIds, requireAll);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('GET_URLS_WITH_TAG_NAMES_ERROR', 'Failed to get URLs with tag names', { tagNames, requireAll, error });
        }
    }
    /**
     * Helper method to run SQL queries
     */
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Helper method to get single row
     */
    async get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row || null);
            });
        });
    }
    /**
     * Helper method to get multiple rows
     */
    async all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows || []);
            });
        });
    }
}
exports.SqlUrlTagRepository = SqlUrlTagRepository;
//# sourceMappingURL=SqlUrlTagRepository.js.map