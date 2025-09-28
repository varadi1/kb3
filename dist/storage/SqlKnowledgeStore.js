"use strict";
/**
 * SQL-based implementation of IKnowledgeStore using SQLite
 * Single Responsibility: Manages knowledge entries in SQL database
 * Open/Closed: Extends BaseKnowledgeStore, closed for modification
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
exports.SqlKnowledgeStore = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const crypto = __importStar(require("crypto"));
const IKnowledgeStore_1 = require("../interfaces/IKnowledgeStore");
const BaseKnowledgeStore_1 = require("./BaseKnowledgeStore");
const ErrorHandler_1 = require("../utils/ErrorHandler");
class SqlKnowledgeStore extends BaseKnowledgeStore_1.BaseKnowledgeStore {
    db = null;
    dbPath;
    initPromise = null;
    constructor(dbPath = './data/knowledge.db') {
        super();
        this.dbPath = dbPath;
    }
    /**
     * Initializes the SQLite database and creates tables if needed
     */
    async initialize() {
        if (this.db)
            return;
        if (this.initPromise) {
            await this.initPromise;
            return;
        }
        this.initPromise = this._performInitialization();
        await this.initPromise;
    }
    async _performInitialization() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            await fs.mkdir(dir, { recursive: true });
            // Open database connection
            await new Promise((resolve, reject) => {
                this.db = new sqlite3.Database(this.dbPath, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');
            // Create knowledge_entries table
            await this.run(`
        CREATE TABLE IF NOT EXISTS knowledge_entries (
          id TEXT PRIMARY KEY,
          url TEXT NOT NULL UNIQUE,
          title TEXT NOT NULL,
          content_type TEXT NOT NULL,
          text TEXT NOT NULL,
          metadata TEXT NOT NULL,
          tags TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          size INTEGER NOT NULL,
          checksum TEXT NOT NULL,
          processing_status TEXT NOT NULL,
          error_message TEXT,
          UNIQUE(url, checksum)
        )
      `);
            // Create indices for better query performance
            await this.run('CREATE INDEX IF NOT EXISTS idx_url ON knowledge_entries(url)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_checksum ON knowledge_entries(checksum)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_content_type ON knowledge_entries(content_type)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_status ON knowledge_entries(processing_status)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_created_at ON knowledge_entries(created_at)');
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', 'Failed to initialize SQL database', { dbPath: this.dbPath, error });
        }
    }
    /**
     * Helper method to run SQL queries
     */
    async run(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
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
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
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
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows || []);
            });
        });
    }
    async store(entry) {
        await this.initialize();
        try {
            // Validate entry
            this.validateEntry(entry);
            // Check for duplicate URL + checksum
            const existing = await this.get('SELECT id FROM knowledge_entries WHERE url = ? AND checksum = ?', [entry.url, entry.checksum]);
            if (existing) {
                // Update existing entry
                await this.update(existing.id, entry);
                return existing.id;
            }
            // Generate ID if not provided
            if (!entry.id) {
                entry.id = crypto.randomUUID();
            }
            // Insert new entry
            await this.run(`INSERT INTO knowledge_entries
         (id, url, title, content_type, text, metadata, tags, created_at,
          updated_at, size, checksum, processing_status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                entry.id,
                entry.url,
                entry.title,
                entry.contentType,
                entry.text,
                JSON.stringify(entry.metadata),
                JSON.stringify(entry.tags),
                entry.createdAt.getTime(),
                entry.updatedAt.getTime(),
                entry.size,
                entry.checksum,
                entry.processingStatus,
                entry.errorMessage || null
            ]);
            return entry.id;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('STORAGE_ERROR', 'Failed to store knowledge entry', { entryId: entry.id, error });
        }
    }
    async retrieve(id) {
        await this.initialize();
        try {
            const row = await this.get('SELECT * FROM knowledge_entries WHERE id = ?', [id]);
            if (!row)
                return null;
            return this.rowToEntry(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('RETRIEVAL_ERROR', 'Failed to retrieve knowledge entry', { entryId: id, error });
        }
    }
    async search(criteria) {
        await this.initialize();
        try {
            let sql = 'SELECT * FROM knowledge_entries WHERE 1=1';
            const params = [];
            // Build query based on criteria
            if (criteria.query) {
                sql += ' AND (title LIKE ? OR text LIKE ?)';
                const searchTerm = `%${criteria.query}%`;
                params.push(searchTerm, searchTerm);
            }
            if (criteria.contentType) {
                sql += ' AND content_type = ?';
                params.push(criteria.contentType);
            }
            if (criteria.tags && criteria.tags.length > 0) {
                sql += ' AND (';
                const tagConditions = criteria.tags.map(() => 'tags LIKE ?').join(' OR ');
                sql += tagConditions + ')';
                criteria.tags.forEach(tag => params.push(`%"${tag}"%`));
            }
            if (criteria.dateRange) {
                if (criteria.dateRange.from) {
                    sql += ' AND created_at >= ?';
                    params.push(criteria.dateRange.from.getTime());
                }
                if (criteria.dateRange.to) {
                    sql += ' AND created_at <= ?';
                    params.push(criteria.dateRange.to.getTime());
                }
            }
            // Add sorting
            const sortField = this.mapSortField(criteria.sortBy || IKnowledgeStore_1.SortField.CREATED_AT);
            const sortOrder = criteria.sortOrder === IKnowledgeStore_1.SortOrder.ASC ? 'ASC' : 'DESC';
            sql += ` ORDER BY ${sortField} ${sortOrder}`;
            // Add pagination
            if (criteria.limit) {
                sql += ' LIMIT ?';
                params.push(criteria.limit);
            }
            if (criteria.offset) {
                sql += ' OFFSET ?';
                params.push(criteria.offset);
            }
            const rows = await this.all(sql, params);
            return rows.map(row => this.rowToEntry(row));
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('SEARCH_ERROR', 'Failed to search knowledge entries', { criteria, error });
        }
    }
    async update(id, updates) {
        await this.initialize();
        try {
            const setClauses = [];
            const params = [];
            // Build update query dynamically
            if (updates.title !== undefined) {
                setClauses.push('title = ?');
                params.push(updates.title);
            }
            if (updates.text !== undefined) {
                setClauses.push('text = ?');
                params.push(updates.text);
            }
            if (updates.metadata !== undefined) {
                setClauses.push('metadata = ?');
                params.push(JSON.stringify(updates.metadata));
            }
            if (updates.tags !== undefined) {
                setClauses.push('tags = ?');
                params.push(JSON.stringify(updates.tags));
            }
            if (updates.processingStatus !== undefined) {
                setClauses.push('processing_status = ?');
                params.push(updates.processingStatus);
            }
            if (updates.errorMessage !== undefined) {
                setClauses.push('error_message = ?');
                params.push(updates.errorMessage);
            }
            if (setClauses.length === 0) {
                return false;
            }
            // Always update the updated_at timestamp
            setClauses.push('updated_at = ?');
            params.push(Date.now());
            // Add ID to params
            params.push(id);
            const sql = `UPDATE knowledge_entries SET ${setClauses.join(', ')} WHERE id = ?`;
            await this.run(sql, params);
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('UPDATE_ERROR', 'Failed to update knowledge entry', { entryId: id, error });
        }
    }
    async delete(id) {
        await this.initialize();
        try {
            await this.run('DELETE FROM knowledge_entries WHERE id = ?', [id]);
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DELETE_ERROR', 'Failed to delete knowledge entry', { entryId: id, error });
        }
    }
    async getStats() {
        await this.initialize();
        try {
            const stats = {
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
            // Get total entries and size
            const totals = await this.get('SELECT COUNT(*) as count, SUM(size) as totalSize FROM knowledge_entries', []);
            if (totals) {
                stats.totalEntries = totals.count;
                stats.totalSize = totals.totalSize || 0;
            }
            // Get content type distribution
            const contentTypes = await this.all('SELECT content_type, COUNT(*) as count FROM knowledge_entries GROUP BY content_type', []);
            contentTypes.forEach(row => {
                stats.contentTypes[row.content_type] = row.count;
            });
            // Get processing status distribution
            const statuses = await this.all('SELECT processing_status, COUNT(*) as count FROM knowledge_entries GROUP BY processing_status', []);
            statuses.forEach(row => {
                stats.processingStatus[row.processing_status] = row.count;
            });
            // Get date range
            const dates = await this.get('SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM knowledge_entries', []);
            if (dates) {
                stats.oldestEntry = dates.oldest ? new Date(dates.oldest) : undefined;
                stats.newestEntry = dates.newest ? new Date(dates.newest) : undefined;
            }
            return stats;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('STATS_ERROR', 'Failed to get store statistics', { error });
        }
    }
    /**
     * Checks if a URL already exists in the store
     */
    async urlExists(url) {
        await this.initialize();
        try {
            const result = await this.get('SELECT COUNT(*) as count FROM knowledge_entries WHERE url = ?', [url]);
            return result ? result.count > 0 : false;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_CHECK_ERROR', 'Failed to check URL existence', { url, error });
        }
    }
    /**
     * Gets entry by URL
     */
    async getByUrl(url) {
        await this.initialize();
        try {
            const row = await this.get('SELECT * FROM knowledge_entries WHERE url = ? ORDER BY updated_at DESC LIMIT 1', [url]);
            if (!row)
                return null;
            return this.rowToEntry(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_RETRIEVAL_ERROR', 'Failed to retrieve entry by URL', { url, error });
        }
    }
    /**
     * Closes the database connection
     */
    async close() {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                resolve();
                return;
            }
            this.db.close((err) => {
                if (err)
                    reject(err);
                else {
                    this.db = null;
                    resolve();
                }
            });
        });
    }
    /**
     * Converts database row to KnowledgeEntry
     */
    rowToEntry(row) {
        return {
            id: row.id,
            url: row.url,
            title: row.title,
            contentType: row.content_type,
            text: row.text,
            metadata: JSON.parse(row.metadata),
            tags: JSON.parse(row.tags),
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            size: row.size,
            checksum: row.checksum,
            processingStatus: row.processing_status,
            errorMessage: row.error_message || undefined
        };
    }
    /**
     * Maps SortField enum to database column name
     */
    mapSortField(field) {
        switch (field) {
            case IKnowledgeStore_1.SortField.CREATED_AT:
                return 'created_at';
            case IKnowledgeStore_1.SortField.UPDATED_AT:
                return 'updated_at';
            case IKnowledgeStore_1.SortField.TITLE:
                return 'title';
            case IKnowledgeStore_1.SortField.SIZE:
                return 'size';
            default:
                return 'created_at';
        }
    }
}
exports.SqlKnowledgeStore = SqlKnowledgeStore;
//# sourceMappingURL=SqlKnowledgeStore.js.map