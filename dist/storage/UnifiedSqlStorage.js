"use strict";
/**
 * Unified SQL storage that manages all tables in a single database
 * Single Responsibility: Manages database connection and schema
 * Open/Closed: Can be extended with new table definitions
 * Interface Segregation: Provides specific repository interfaces
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
exports.UnifiedSqlStorage = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const crypto = __importStar(require("crypto"));
const ErrorHandler_1 = require("../utils/ErrorHandler");
const IKnowledgeStore_1 = require("../interfaces/IKnowledgeStore");
const IUrlRepository_1 = require("../interfaces/IUrlRepository");
const IOriginalFileRepository_1 = require("../interfaces/IOriginalFileRepository");
const SqlTagManager_1 = require("./SqlTagManager");
const SqlUrlTagRepository_1 = require("./SqlUrlTagRepository");
/**
 * Main unified storage class that creates and manages all repositories
 */
class UnifiedSqlStorage {
    db = null;
    config;
    initPromise = null;
    // Repository instances
    knowledgeStore = null;
    urlRepository = null;
    originalFileRepository = null;
    tagManager = null;
    urlTagRepository = null;
    constructor(config) {
        this.config = {
            enableWAL: true,
            enableForeignKeys: true,
            ...config
        };
    }
    /**
     * Initialize the unified database and all tables
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
            const dir = path.dirname(this.config.dbPath);
            await fs.mkdir(dir, { recursive: true });
            // Open database connection
            await new Promise((resolve, reject) => {
                this.db = new sqlite3.Database(this.config.dbPath, (err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            // Configure database
            if (this.config.enableForeignKeys) {
                await this.run('PRAGMA foreign_keys = ON');
            }
            if (this.config.enableWAL) {
                try {
                    await this.run('PRAGMA journal_mode = WAL');
                }
                catch (walError) {
                    console.warn('Could not enable WAL mode, using default journal mode:', walError);
                }
            }
            // Create all tables with proper foreign key relationships
            await this.createTables();
            // Initialize repository instances
            this.initializeRepositories();
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('UNIFIED_DB_INIT_ERROR', 'Failed to initialize unified database', { dbPath: this.config.dbPath, error });
        }
    }
    /**
     * Create all tables with foreign key relationships
     */
    async createTables() {
        // URLs table (primary table)
        await this.run(`
      CREATE TABLE IF NOT EXISTS urls (
        id TEXT PRIMARY KEY,
        url TEXT NOT NULL,
        normalized_url TEXT NOT NULL UNIQUE,
        content_hash TEXT,
        previous_hash TEXT,
        status TEXT NOT NULL,
        error_message TEXT,
        first_seen INTEGER NOT NULL,
        last_checked INTEGER NOT NULL,
        last_content_change INTEGER,
        process_count INTEGER DEFAULT 0,
        content_version INTEGER DEFAULT 1,
        metadata TEXT NOT NULL
      )
    `);
        // Tags table (for categorization)
        await this.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        parent_id TEXT,
        description TEXT,
        color TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL
      )
    `);
        // URL-Tag relationship table
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
        // Knowledge entries table (with foreign key to URLs)
        await this.run(`
      CREATE TABLE IF NOT EXISTS knowledge_entries (
        id TEXT PRIMARY KEY,
        url_id TEXT NOT NULL,
        url TEXT NOT NULL,
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
        FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
        UNIQUE(url_id, checksum)
      )
    `);
        // Original files table (with foreign key to URLs)
        await this.run(`
      CREATE TABLE IF NOT EXISTS original_files (
        id TEXT PRIMARY KEY,
        url_id TEXT,
        url TEXT NOT NULL,
        file_path TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL,
        checksum TEXT NOT NULL,
        scraper_used TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        accessed_at INTEGER,
        download_url TEXT,
        FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE SET NULL
      )
    `);
        // Create all indices for performance
        await this.createIndices();
    }
    /**
     * Create indices for better query performance
     */
    async createIndices() {
        // URL indices
        await this.run('CREATE INDEX IF NOT EXISTS idx_normalized_url ON urls(normalized_url)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_url_content_hash ON urls(content_hash)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_url_status ON urls(status)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_url_first_seen ON urls(first_seen)');
        // Tag indices
        await this.run('CREATE INDEX IF NOT EXISTS idx_tag_name ON tags(name)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_tag_parent ON tags(parent_id)');
        // URL-Tag indices
        await this.run('CREATE INDEX IF NOT EXISTS idx_url_tags_url ON url_tags(url_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_url_tags_tag ON url_tags(tag_id)');
        // Knowledge entry indices
        await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_url_id ON knowledge_entries(url_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_url ON knowledge_entries(url)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_checksum ON knowledge_entries(checksum)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_entries(created_at)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_content_type ON knowledge_entries(content_type)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_entries(processing_status)');
        // Original file indices
        await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_url_id ON original_files(url_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_url ON original_files(url)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_status ON original_files(status)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_mime_type ON original_files(mime_type)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_created_at ON original_files(created_at)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_checksum ON original_files(checksum)');
    }
    /**
     * Initialize repository instances
     */
    initializeRepositories() {
        if (!this.db) {
            throw new Error('Database not initialized');
        }
        // Initialize core repositories
        this.tagManager = new SqlTagManager_1.SqlTagManager(this.db);
        this.urlTagRepository = new SqlUrlTagRepository_1.SqlUrlTagRepository(this.db, this.tagManager);
        // Initialize implementations with database connection
        this.knowledgeStore = new KnowledgeStoreImpl(this.db);
        this.urlRepository = new UrlRepositoryImpl(this.db, this.tagManager, this.urlTagRepository);
        this.originalFileRepository = new OriginalFileRepositoryImpl(this.db);
    }
    /**
     * Get all repositories
     */
    getRepositories() {
        if (!this.knowledgeStore || !this.urlRepository || !this.originalFileRepository || !this.tagManager) {
            throw new Error('Storage not initialized. Call initialize() first.');
        }
        return {
            knowledgeStore: this.knowledgeStore,
            urlRepository: this.urlRepository,
            originalFileRepository: this.originalFileRepository,
            tagManager: this.tagManager
        };
    }
    /**
     * Close database connection
     */
    async close() {
        if (this.db) {
            await new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err)
                        reject(err);
                    else
                        resolve();
                });
            });
            this.db = null;
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
}
exports.UnifiedSqlStorage = UnifiedSqlStorage;
/**
 * Knowledge Store implementation for unified database
 */
class KnowledgeStoreImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async store(entry) {
        const id = entry.id || crypto.randomUUID();
        const now = Date.now();
        const createdAt = entry.createdAt ? entry.createdAt.getTime() : now;
        const updatedAt = entry.updatedAt ? entry.updatedAt.getTime() : now;
        // Get URL ID from the URL
        const urlId = await this.getUrlId(entry.url);
        if (!urlId) {
            throw new Error(`URL not registered: ${entry.url}`);
        }
        await this.run(`INSERT OR REPLACE INTO knowledge_entries
       (id, url_id, url, title, content_type, text, metadata, tags,
        created_at, updated_at, size, checksum, processing_status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, urlId, entry.url, entry.title, entry.contentType, entry.text,
            JSON.stringify(entry.metadata), JSON.stringify(entry.tags),
            createdAt, updatedAt, entry.size, entry.checksum,
            entry.processingStatus || IKnowledgeStore_1.ProcessingStatus.COMPLETED,
            entry.errorMessage || null
        ]);
        return id;
    }
    async retrieve(url) {
        const row = await this.get('SELECT * FROM knowledge_entries WHERE url = ?', [url]);
        if (!row)
            return null;
        return this.rowToKnowledgeEntry(row);
    }
    async search(criteria) {
        let query = 'SELECT * FROM knowledge_entries WHERE 1=1';
        const params = [];
        if (criteria.query) {
            query += ' AND (title LIKE ? OR text LIKE ?)';
            const searchTerm = `%${criteria.query}%`;
            params.push(searchTerm, searchTerm);
        }
        if (criteria.contentType) {
            query += ' AND content_type = ?';
            params.push(criteria.contentType);
        }
        if (criteria.tags && criteria.tags.length > 0) {
            const tagConditions = criteria.tags.map(() => 'tags LIKE ?');
            query += ` AND (${tagConditions.join(' OR ')})`;
            criteria.tags.forEach(tag => params.push(`%"${tag}"%`));
        }
        if (criteria.dateRange?.from) {
            query += ' AND created_at >= ?';
            params.push(criteria.dateRange.from.getTime());
        }
        if (criteria.dateRange?.to) {
            query += ' AND created_at <= ?';
            params.push(criteria.dateRange.to.getTime());
        }
        // Add sorting
        const sortField = criteria.sortBy || 'created_at';
        const sortOrder = criteria.sortOrder || 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}`;
        // Add pagination
        if (criteria.limit) {
            query += ' LIMIT ?';
            params.push(criteria.limit);
            if (criteria.offset) {
                query += ' OFFSET ?';
                params.push(criteria.offset);
            }
        }
        const rows = await this.all(query, params);
        return rows.map(row => this.rowToKnowledgeEntry(row));
    }
    async update(url, updates) {
        const setClause = [];
        const params = [];
        if (updates.title !== undefined) {
            setClause.push('title = ?');
            params.push(updates.title);
        }
        if (updates.text !== undefined) {
            setClause.push('text = ?');
            params.push(updates.text);
        }
        if (updates.metadata !== undefined) {
            setClause.push('metadata = ?');
            params.push(JSON.stringify(updates.metadata));
        }
        if (updates.tags !== undefined) {
            setClause.push('tags = ?');
            params.push(JSON.stringify(updates.tags));
        }
        if (updates.processingStatus !== undefined) {
            setClause.push('processing_status = ?');
            params.push(updates.processingStatus);
        }
        if (setClause.length === 0)
            return false;
        setClause.push('updated_at = ?');
        params.push(Date.now());
        params.push(url);
        await this.run(`UPDATE knowledge_entries SET ${setClause.join(', ')} WHERE url = ?`, params);
        return true;
    }
    async delete(url) {
        await this.run('DELETE FROM knowledge_entries WHERE url = ?', [url]);
        return true;
    }
    async exists(url) {
        const row = await this.get('SELECT COUNT(*) as count FROM knowledge_entries WHERE url = ?', [url]);
        return (row?.count || 0) > 0;
    }
    async getStats() {
        const stats = await this.get(`
      SELECT
        COUNT(*) as totalEntries,
        SUM(size) as totalSize
      FROM knowledge_entries
    `);
        const byType = await this.all(`
      SELECT content_type, COUNT(*) as count
      FROM knowledge_entries
      GROUP BY content_type
    `);
        const contentTypes = {};
        byType.forEach(row => {
            contentTypes[row.content_type] = row.count;
        });
        return {
            totalEntries: stats?.totalEntries || 0,
            totalSize: stats?.totalSize || 0,
            contentTypes,
            processingStatus: {
                [IKnowledgeStore_1.ProcessingStatus.PENDING]: 0,
                [IKnowledgeStore_1.ProcessingStatus.PROCESSING]: 0,
                [IKnowledgeStore_1.ProcessingStatus.COMPLETED]: stats?.totalEntries || 0,
                [IKnowledgeStore_1.ProcessingStatus.FAILED]: 0
            }
        };
    }
    async clear() {
        await this.run('DELETE FROM knowledge_entries');
    }
    async getUrlId(url) {
        const row = await this.get('SELECT id FROM urls WHERE url = ? OR normalized_url = ?', [url, this.normalizeUrl(url)]);
        return row?.id || null;
    }
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            // Sort query parameters for consistent comparison
            const sortedParams = Array.from(urlObj.searchParams.entries())
                .sort((a, b) => a[0].localeCompare(b[0]));
            urlObj.search = new URLSearchParams(sortedParams).toString();
            return urlObj.toString();
        }
        catch {
            return url;
        }
    }
    rowToKnowledgeEntry(row) {
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
            errorMessage: row.error_message
        };
    }
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row || null);
            });
        });
    }
    all(sql, params = []) {
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
/**
 * URL Repository implementation for unified database with tag support
 */
class UrlRepositoryImpl {
    db;
    tagManager;
    urlTagRepository;
    constructor(db, tagManager, urlTagRepository) {
        this.db = db;
        this.tagManager = tagManager;
        this.urlTagRepository = urlTagRepository;
    }
    async register(url, metadata) {
        const id = crypto.randomUUID();
        const now = Date.now();
        const normalizedUrl = this.normalizeUrl(url);
        // Check if URL already exists
        const existing = await this.get('SELECT id FROM urls WHERE normalized_url = ?', [normalizedUrl]);
        if (existing) {
            // Update metadata if provided
            if (metadata) {
                const existingMetadata = await this.get('SELECT metadata FROM urls WHERE id = ?', [existing.id]);
                const currentMetadata = existingMetadata?.metadata ? JSON.parse(existingMetadata.metadata) : {};
                const updatedMetadata = { ...currentMetadata, ...metadata };
                await this.run('UPDATE urls SET metadata = ?, last_checked = ? WHERE id = ?', [JSON.stringify(updatedMetadata), now, existing.id]);
            }
            return existing.id;
        }
        await this.run(`INSERT INTO urls (id, url, normalized_url, content_hash, status, first_seen, last_checked, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
            id, url, normalizedUrl, null,
            IUrlRepository_1.UrlStatus.PENDING, now, now,
            JSON.stringify(metadata || {})
        ]);
        return id;
    }
    async registerWithTags(url, metadata) {
        const tags = metadata?.tags || [];
        const metadataWithoutTags = { ...metadata };
        delete metadataWithoutTags.tags;
        const urlId = await this.register(url, metadataWithoutTags);
        if (tags.length > 0) {
            const tagIds = await this.tagManager.ensureTagsExist(tags);
            await this.urlTagRepository.addTagsToUrl(urlId, tagIds);
        }
        return urlId;
    }
    async getUrlInfo(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const row = await this.get('SELECT * FROM urls WHERE url = ? OR normalized_url = ?', [url, normalizedUrl]);
        if (!row)
            return null;
        return this.rowToUrlRecord(row);
    }
    async getUrlInfoWithTags(url) {
        const urlInfo = await this.getUrlInfo(url);
        if (!urlInfo)
            return null;
        const tags = await this.urlTagRepository.getTagsForUrl(urlInfo.id);
        return {
            ...urlInfo,
            tags
        };
    }
    async getUrlsByTags(tagNames, requireAll = false) {
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
    async getUrlById(id) {
        const row = await this.get('SELECT * FROM urls WHERE id = ?', [id]);
        if (!row)
            return null;
        return this.rowToUrlRecord(row);
    }
    async updateStatus(url, status, errorMessage) {
        const normalizedUrl = this.normalizeUrl(url);
        await this.run(`UPDATE urls SET status = ?, error_message = ?, last_checked = ?
       WHERE url = ? OR normalized_url = ?`, [status, errorMessage || null, Date.now(), url, normalizedUrl]);
        return true;
    }
    async updateContentHash(url, newHash) {
        const normalizedUrl = this.normalizeUrl(url);
        const now = Date.now();
        // Get current hash
        const current = await this.get('SELECT content_hash FROM urls WHERE url = ? OR normalized_url = ?', [url, normalizedUrl]);
        if (!current)
            return false;
        // Update with new hash and track change
        await this.run(`UPDATE urls
       SET content_hash = ?, previous_hash = ?, last_content_change = ?,
           content_version = content_version + 1, last_checked = ?
       WHERE url = ? OR normalized_url = ?`, [newHash, current.content_hash, now, now, url, normalizedUrl]);
        return true;
    }
    async isDuplicate(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const row = await this.get('SELECT COUNT(*) as count FROM urls WHERE normalized_url = ?', [normalizedUrl]);
        return (row?.count || 0) > 0;
    }
    async hasContentChanged(url, currentHash) {
        const normalizedUrl = this.normalizeUrl(url);
        const row = await this.get('SELECT content_hash FROM urls WHERE url = ? OR normalized_url = ?', [url, normalizedUrl]);
        if (!row || !row.content_hash)
            return true;
        return row.content_hash !== currentHash;
    }
    async listUrls(filter) {
        let query = 'SELECT * FROM urls WHERE 1=1';
        const params = [];
        if (filter) {
            if (filter.status) {
                query += ' AND status = ?';
                params.push(filter.status);
            }
            if (filter.since) {
                query += ' AND first_seen >= ?';
                params.push(filter.since.getTime());
            }
            if (filter.contentType) {
                query += ' AND json_extract(metadata, "$.contentType") = ?';
                params.push(filter.contentType);
            }
        }
        query += ' ORDER BY last_checked DESC';
        if (filter?.limit) {
            query += ' LIMIT ?';
            params.push(filter.limit);
        }
        const rows = await this.all(query, params);
        return rows.map(row => this.rowToUrlRecord(row));
    }
    async exists(url) {
        const normalizedUrl = this.normalizeUrl(url);
        const row = await this.get('SELECT COUNT(*) as count FROM urls WHERE url = ? OR normalized_url = ?', [url, normalizedUrl]);
        return (row?.count || 0) > 0;
    }
    async getByHash(hash) {
        const row = await this.get('SELECT * FROM urls WHERE content_hash = ?', [hash]);
        if (!row)
            return null;
        return this.rowToUrlRecord(row);
    }
    async list(filter) {
        return this.listUrls(filter);
    }
    async remove(id) {
        await this.run('DELETE FROM urls WHERE id = ?', [id]);
        return true;
    }
    async updateHash(id, contentHash) {
        await this.run('UPDATE urls SET content_hash = ?, last_checked = ? WHERE id = ?', [contentHash, Date.now(), id]);
        return true;
    }
    async clear() {
        await this.run('DELETE FROM urls');
    }
    // Tag management methods for compatibility
    getTagManager() {
        return this.tagManager;
    }
    async initializeWithTags() {
        // No-op for compatibility - tags are already initialized
        return Promise.resolve();
    }
    async addTagsToUrl(url, tagNames) {
        const urlInfo = await this.getUrlInfo(url);
        if (!urlInfo) {
            throw new Error(`URL not found: ${url}`);
        }
        const tagIds = await this.tagManager.ensureTagsExist(tagNames);
        await this.urlTagRepository.addTagsToUrl(urlInfo.id, tagIds);
        return true;
    }
    async removeTagsFromUrl(url, tagNames) {
        const urlInfo = await this.getUrlInfo(url);
        if (!urlInfo) {
            throw new Error(`URL not found: ${url}`);
        }
        const tags = await Promise.all(tagNames.map(name => this.tagManager.getTagByName(name)));
        const tagIds = tags.filter(t => t !== null).map(t => t.id);
        if (tagIds.length > 0) {
            await this.urlTagRepository.removeTagsFromUrl(urlInfo.id, tagIds);
        }
        return true;
    }
    async getUrlTags(url) {
        const urlInfo = await this.getUrlInfo(url);
        if (!urlInfo) {
            return [];
        }
        return await this.urlTagRepository.getTagsForUrl(urlInfo.id);
    }
    async setUrlTags(url, tagNames) {
        const urlInfo = await this.getUrlInfo(url);
        if (!urlInfo) {
            throw new Error(`URL not found: ${url}`);
        }
        // Get all existing tags for this URL
        const existingTags = await this.urlTagRepository.getTagsForUrl(urlInfo.id);
        // Remove all existing tags if there are any
        if (existingTags.length > 0) {
            const existingTagIds = existingTags.map(t => t.id);
            await this.urlTagRepository.removeTagsFromUrl(urlInfo.id, existingTagIds);
        }
        // Add new tags
        if (tagNames.length > 0) {
            const tagIds = await this.tagManager.ensureTagsExist(tagNames);
            await this.urlTagRepository.addTagsToUrl(urlInfo.id, tagIds);
        }
        return true;
    }
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            const sortedParams = Array.from(urlObj.searchParams.entries())
                .sort((a, b) => a[0].localeCompare(b[0]));
            urlObj.search = new URLSearchParams(sortedParams).toString();
            return urlObj.toString();
        }
        catch {
            return url;
        }
    }
    rowToUrlRecord(row) {
        return {
            id: row.id,
            url: row.url,
            normalizedUrl: row.normalized_url,
            contentHash: row.content_hash,
            status: row.status,
            errorMessage: row.error_message,
            firstSeen: new Date(row.first_seen),
            lastChecked: new Date(row.last_checked),
            processCount: row.process_count,
            metadata: JSON.parse(row.metadata)
        };
    }
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row || null);
            });
        });
    }
    all(sql, params = []) {
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
/**
 * Original File Repository implementation for unified database
 */
class OriginalFileRepositoryImpl {
    db;
    constructor(db) {
        this.db = db;
    }
    async initialize() {
        // Database is already initialized by UnifiedSqlStorage
        return Promise.resolve();
    }
    async recordOriginalFile(fileInfo) {
        const id = `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
        const now = Date.now();
        // Get URL ID if URL is provided
        let urlId = null;
        if (fileInfo.url) {
            const urlRow = await this.get('SELECT id FROM urls WHERE url = ? OR normalized_url = ?', [fileInfo.url, this.normalizeUrl(fileInfo.url)]);
            urlId = urlRow?.id || null;
        }
        const downloadUrl = `/api/files/original/${id}/download`;
        try {
            await this.run(`INSERT INTO original_files
         (id, url_id, url, file_path, mime_type, size, checksum, scraper_used,
          status, metadata, created_at, updated_at, download_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                id, urlId, fileInfo.url, fileInfo.filePath, fileInfo.mimeType,
                fileInfo.size, fileInfo.checksum, fileInfo.scraperUsed || null,
                IOriginalFileRepository_1.FileStatus.ACTIVE,
                JSON.stringify({
                    ...fileInfo.metadata,
                    cleaningMetadata: fileInfo.cleaningMetadata
                }),
                now, now, downloadUrl
            ]);
            return id;
        }
        catch (error) {
            // Check if error is due to duplicate file_path
            if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('file_path')) {
                // File already exists, update with cleaningMetadata if provided
                const existing = await this.get('SELECT id, metadata FROM original_files WHERE file_path = ?', [fileInfo.filePath]);
                if (existing) {
                    // If cleaningMetadata is provided, update the record
                    if (fileInfo.cleaningMetadata) {
                        const existingMetadata = existing.metadata ? JSON.parse(existing.metadata) : {};
                        const updatedMetadata = {
                            ...existingMetadata,
                            cleaningMetadata: fileInfo.cleaningMetadata
                        };
                        await this.run('UPDATE original_files SET metadata = ?, updated_at = ? WHERE id = ?', [JSON.stringify(updatedMetadata), Date.now(), existing.id]);
                    }
                    return existing.id;
                }
            }
            throw error;
        }
    }
    async getOriginalFile(fileId) {
        const row = await this.get('SELECT * FROM original_files WHERE id = ?', [fileId]);
        if (!row)
            return null;
        // Update accessed_at
        await this.run('UPDATE original_files SET accessed_at = ? WHERE id = ?', [Date.now(), fileId]);
        return this.rowToFileRecord(row);
    }
    async getOriginalFilesByUrl(url) {
        const rows = await this.all('SELECT * FROM original_files WHERE url = ? ORDER BY created_at DESC', [url]);
        return rows.map(row => this.rowToFileRecord(row));
    }
    async updateFileStatus(fileId, status) {
        await this.run('UPDATE original_files SET status = ?, updated_at = ? WHERE id = ?', [status, Date.now(), fileId]);
        return true;
    }
    async deleteOriginalFile(fileId) {
        await this.run('DELETE FROM original_files WHERE id = ?', [fileId]);
        return true;
    }
    async listOriginalFiles(options) {
        let query = 'SELECT * FROM original_files WHERE 1=1';
        const params = [];
        if (options) {
            if (options.status) {
                query += ' AND status = ?';
                params.push(options.status);
            }
            if (options.mimeType) {
                query += ' AND mime_type = ?';
                params.push(options.mimeType);
            }
            if (options.scraperUsed) {
                query += ' AND scraper_used = ?';
                params.push(options.scraperUsed);
            }
            if (options.fromDate) {
                query += ' AND created_at >= ?';
                params.push(options.fromDate.getTime());
            }
            if (options.toDate) {
                query += ' AND created_at <= ?';
                params.push(options.toDate.getTime());
            }
        }
        query += ' ORDER BY created_at DESC';
        if (options?.limit) {
            query += ' LIMIT ?';
            params.push(options.limit);
            if (options.offset) {
                query += ' OFFSET ?';
                params.push(options.offset);
            }
        }
        const rows = await this.all(query, params);
        return rows.map(row => this.rowToFileRecord(row));
    }
    async getStatistics() {
        const stats = await this.get(`
      SELECT
        COUNT(*) as totalFiles,
        SUM(size) as totalSize,
        COUNT(DISTINCT url) as uniqueUrls
      FROM original_files
      WHERE status = 'active'
    `);
        const byType = await this.all(`
      SELECT mime_type, COUNT(*) as count, SUM(size) as total_size
      FROM original_files
      WHERE status = 'active'
      GROUP BY mime_type
    `);
        const byStatus = await this.all(`
      SELECT status, COUNT(*) as count
      FROM original_files
      GROUP BY status
    `);
        const byScraper = await this.all(`
      SELECT scraper_used, COUNT(*) as count
      FROM original_files
      WHERE scraper_used IS NOT NULL
      GROUP BY scraper_used
    `);
        const averageFileSize = stats && stats.totalFiles > 0
            ? Math.round(stats.totalSize / stats.totalFiles)
            : 0;
        return {
            totalFiles: stats?.totalFiles || 0,
            totalSize: stats?.totalSize || 0,
            filesByStatus: byStatus.reduce((acc, row) => {
                acc[row.status] = row.count;
                return acc;
            }, {}),
            filesByMimeType: byType.reduce((acc, row) => {
                acc[row.mime_type] = row.count;
                return acc;
            }, {}),
            filesByScraperUsed: byScraper.reduce((acc, row) => {
                acc[row.scraper_used] = row.count;
                return acc;
            }, {}),
            averageFileSize
        };
    }
    async cleanupOldFiles(olderThanDays) {
        const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);
        const result = await this.get('SELECT COUNT(*) as count FROM original_files WHERE created_at < ? AND status = ?', [cutoffTime, IOriginalFileRepository_1.FileStatus.ACTIVE]);
        await this.run('UPDATE original_files SET status = ? WHERE created_at < ? AND status = ?', [IOriginalFileRepository_1.FileStatus.DELETED, cutoffTime, IOriginalFileRepository_1.FileStatus.ACTIVE]);
        return result?.count || 0;
    }
    normalizeUrl(url) {
        try {
            const urlObj = new URL(url);
            const sortedParams = Array.from(urlObj.searchParams.entries())
                .sort((a, b) => a[0].localeCompare(b[0]));
            urlObj.search = new URLSearchParams(sortedParams).toString();
            return urlObj.toString();
        }
        catch {
            return url;
        }
    }
    rowToFileRecord(row) {
        // Parse the stored metadata
        const parsedMetadata = row.metadata ? JSON.parse(row.metadata) : {};
        // Extract cleaningMetadata from the stored metadata
        const { cleaningMetadata, ...otherMetadata } = parsedMetadata;
        return {
            id: row.id,
            url: row.url,
            filePath: row.file_path,
            mimeType: row.mime_type,
            size: row.size,
            checksum: row.checksum,
            scraperUsed: row.scraper_used,
            cleaningMetadata: cleaningMetadata || undefined,
            status: row.status,
            metadata: Object.keys(otherMetadata).length > 0 ? otherMetadata : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            accessedAt: row.accessed_at ? new Date(row.accessed_at) : undefined,
            downloadUrl: row.download_url
        };
    }
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row || null);
            });
        });
    }
    all(sql, params = []) {
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
//# sourceMappingURL=UnifiedSqlStorage.js.map