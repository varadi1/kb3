"use strict";
/**
 * SQL-based implementation of IUrlRepository using SQLite
 * Single Responsibility: Manages URL tracking and duplicate detection
 * Dependency Inversion: Depends on IUrlRepository abstraction
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
exports.SqlUrlRepository = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const crypto = __importStar(require("crypto"));
const IUrlRepository_1 = require("../interfaces/IUrlRepository");
const ErrorHandler_1 = require("../utils/ErrorHandler");
class SqlUrlRepository {
    db = null;
    dbPath;
    initPromise = null;
    constructor(dbPath = './data/urls.db') {
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
            // Enable foreign keys and WAL mode for better concurrency
            await this.run('PRAGMA foreign_keys = ON');
            await this.run('PRAGMA journal_mode = WAL');
            // Create urls table with content change tracking
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
            // Create indices for better query performance
            await this.run('CREATE INDEX IF NOT EXISTS idx_normalized_url ON urls(normalized_url)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_content_hash ON urls(content_hash)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_status ON urls(status)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_first_seen ON urls(first_seen)');
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', 'Failed to initialize URL repository database', { dbPath: this.dbPath, error });
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
    async exists(url) {
        await this.initialize();
        try {
            const normalizedUrl = this.normalizeUrl(url);
            const result = await this.get('SELECT COUNT(*) as count FROM urls WHERE normalized_url = ?', [normalizedUrl]);
            return result ? result.count > 0 : false;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_CHECK_ERROR', 'Failed to check URL existence', { url, error });
        }
    }
    async register(url, metadata) {
        await this.initialize();
        try {
            const normalizedUrl = this.normalizeUrl(url);
            // Check if URL already exists
            const existing = await this.get('SELECT id FROM urls WHERE normalized_url = ?', [normalizedUrl]);
            if (existing) {
                // Update existing record
                await this.run(`UPDATE urls SET
            last_checked = ?,
            process_count = process_count + 1,
            metadata = ?
          WHERE id = ?`, [Date.now(), JSON.stringify(metadata || {}), existing.id]);
                return existing.id;
            }
            // Create new record
            const id = crypto.randomUUID();
            const now = Date.now();
            await this.run(`INSERT INTO urls
         (id, url, normalized_url, status, first_seen, last_checked, process_count, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [
                id,
                url,
                normalizedUrl,
                IUrlRepository_1.UrlStatus.PENDING,
                now,
                now,
                1,
                JSON.stringify(metadata || {})
            ]);
            return id;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_REGISTRATION_ERROR', 'Failed to register URL', { url, error });
        }
    }
    async updateStatus(id, status, error) {
        await this.initialize();
        try {
            await this.run(`UPDATE urls SET
          status = ?,
          error_message = ?,
          last_checked = ?
        WHERE id = ?`, [status, error || null, Date.now(), id]);
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('STATUS_UPDATE_ERROR', 'Failed to update URL status', { id, status, error });
        }
    }
    async getUrlInfo(url) {
        await this.initialize();
        try {
            const normalizedUrl = this.normalizeUrl(url);
            const row = await this.get('SELECT * FROM urls WHERE normalized_url = ?', [normalizedUrl]);
            if (!row)
                return null;
            return this.rowToRecord(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_INFO_ERROR', 'Failed to get URL info', { url, error });
        }
    }
    async getByHash(hash) {
        await this.initialize();
        try {
            const row = await this.get('SELECT * FROM urls WHERE content_hash = ?', [hash]);
            if (!row)
                return null;
            return this.rowToRecord(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('HASH_LOOKUP_ERROR', 'Failed to get URL by hash', { hash, error });
        }
    }
    async list(filter) {
        await this.initialize();
        try {
            let sql = 'SELECT * FROM urls WHERE 1=1';
            const params = [];
            if (filter) {
                if (filter.status) {
                    sql += ' AND status = ?';
                    params.push(filter.status);
                }
                if (filter.since) {
                    sql += ' AND first_seen >= ?';
                    params.push(filter.since.getTime());
                }
                if (filter.contentType) {
                    sql += ' AND json_extract(metadata, "$.contentType") = ?';
                    params.push(filter.contentType);
                }
            }
            sql += ' ORDER BY last_checked DESC';
            if (filter?.limit) {
                sql += ' LIMIT ?';
                params.push(filter.limit);
            }
            if (filter?.offset) {
                sql += ' OFFSET ?';
                params.push(filter.offset);
            }
            const rows = await this.all(sql, params);
            return rows.map(row => this.rowToRecord(row));
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_LIST_ERROR', 'Failed to list URLs', { filter, error });
        }
    }
    async remove(id) {
        await this.initialize();
        try {
            await this.run('DELETE FROM urls WHERE id = ?', [id]);
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('URL_REMOVAL_ERROR', 'Failed to remove URL', { id, error });
        }
    }
    /**
     * Updates the content hash for a URL and tracks content changes
     */
    async updateHash(id, contentHash) {
        await this.initialize();
        try {
            // First get the current hash to track changes
            const current = await this.get('SELECT content_hash, content_version FROM urls WHERE id = ?', [id]);
            if (current) {
                const hasChanged = current.content_hash !== null && current.content_hash !== contentHash;
                const newVersion = hasChanged ? (current.content_version + 1) : current.content_version;
                // Update with tracking of previous hash and version increment if changed
                await this.run(`UPDATE urls SET
           content_hash = ?,
           previous_hash = CASE WHEN ? THEN content_hash ELSE previous_hash END,
           last_content_change = CASE WHEN ? THEN ? ELSE last_content_change END,
           content_version = ?,
           last_checked = ?
           WHERE id = ?`, [contentHash, hasChanged, hasChanged, Date.now(), newVersion, Date.now(), id]);
            }
            else {
                // Fallback to simple update if record not found
                await this.run('UPDATE urls SET content_hash = ?, last_checked = ? WHERE id = ?', [contentHash, Date.now(), id]);
            }
            return true;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('HASH_UPDATE_ERROR', 'Failed to update content hash', { id, contentHash, error });
        }
    }
    /**
     * Checks if content with given hash already exists
     */
    async hashExists(hash) {
        await this.initialize();
        try {
            const result = await this.get('SELECT COUNT(*) as count FROM urls WHERE content_hash = ?', [hash]);
            return result ? result.count > 0 : false;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('HASH_CHECK_ERROR', 'Failed to check hash existence', { hash, error });
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
     * Normalizes URL for consistent comparison
     */
    normalizeUrl(url) {
        try {
            const parsed = new URL(url);
            // Remove trailing slashes
            parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/';
            // Sort query parameters
            const params = Array.from(parsed.searchParams.entries());
            params.sort((a, b) => a[0].localeCompare(b[0]));
            parsed.search = '';
            params.forEach(([key, value]) => parsed.searchParams.append(key, value));
            // Remove fragment
            parsed.hash = '';
            // Convert to lowercase
            return parsed.toString().toLowerCase();
        }
        catch (error) {
            // If URL parsing fails, just return lowercase version
            return url.toLowerCase();
        }
    }
    /**
     * Converts database row to UrlRecord
     */
    rowToRecord(row) {
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
}
exports.SqlUrlRepository = SqlUrlRepository;
//# sourceMappingURL=SqlUrlRepository.js.map