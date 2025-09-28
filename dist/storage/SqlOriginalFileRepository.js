"use strict";
/**
 * SQL implementation of IOriginalFileRepository
 * Single Responsibility: Only manages original file records in SQL database
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
exports.SqlOriginalFileRepository = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const crypto = __importStar(require("crypto"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs/promises"));
const IOriginalFileRepository_1 = require("../interfaces/IOriginalFileRepository");
const ErrorHandler_1 = require("../utils/ErrorHandler");
class SqlOriginalFileRepository {
    db = null;
    dbPath;
    constructor(databasePath) {
        this.dbPath = databasePath;
    }
    async initialize() {
        if (this.db)
            return;
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            await fs.mkdir(dir, { recursive: true });
            // Create database connection
            this.db = await this.createDatabase();
            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');
            // Try to enable WAL mode, but fall back gracefully if it fails
            // This prevents SQLITE_IOERR in test environments or systems that don't support WAL
            try {
                await this.run('PRAGMA journal_mode = WAL');
            }
            catch (walError) {
                // Fall back to default journal mode if WAL fails
                console.warn('Could not enable WAL mode, using default journal mode:', walError);
            }
            // Create original_files table
            await this.run(`
        CREATE TABLE IF NOT EXISTS original_files (
          id TEXT PRIMARY KEY,
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
          download_url TEXT
        )
      `);
            // Create indices for better query performance
            await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_url ON original_files(url)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_status ON original_files(status)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_mime_type ON original_files(mime_type)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_created_at ON original_files(created_at)');
            await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_checksum ON original_files(checksum)');
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', `Failed to initialize original files repository: ${error}`, { originalError: error });
        }
    }
    createDatabase() {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(this.dbPath, (err) => {
                if (err)
                    reject(err);
                else
                    resolve(db);
            });
        });
    }
    run(sql, params = []) {
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
    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row);
            });
        });
    }
    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            if (!this.db) {
                reject(new Error('Database not initialized'));
                return;
            }
            this.db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows);
            });
        });
    }
    async recordOriginalFile(fileInfo) {
        if (!this.db)
            throw new Error('Database not initialized');
        const fileId = this.generateFileId();
        const now = Date.now();
        try {
            // Generate download URL (this would typically be a route in your API)
            const downloadUrl = `/api/files/original/${fileId}/download`;
            // Combine cleaningMetadata with general metadata for storage
            const combinedMetadata = {
                ...fileInfo.metadata,
                cleaningMetadata: fileInfo.cleaningMetadata
            };
            await this.run(`
        INSERT INTO original_files (
          id, url, file_path, mime_type, size, checksum,
          scraper_used, status, metadata, created_at, updated_at, download_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
                fileId,
                fileInfo.url,
                fileInfo.filePath,
                fileInfo.mimeType,
                fileInfo.size,
                fileInfo.checksum,
                fileInfo.scraperUsed || null,
                IOriginalFileRepository_1.FileStatus.ACTIVE,
                combinedMetadata ? JSON.stringify(combinedMetadata) : null,
                now,
                now,
                downloadUrl
            ]);
            return fileId;
        }
        catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('file_path')) {
                // File already exists, update with new metadata if cleaningMetadata is present
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
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', `Failed to record original file: ${error.message}`, { fileInfo, originalError: error });
        }
    }
    async getOriginalFile(fileId) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const row = await this.get('SELECT * FROM original_files WHERE id = ?', [fileId]);
            if (!row)
                return null;
            // Update accessed_at timestamp
            const now = Date.now();
            await this.run('UPDATE original_files SET accessed_at = ? WHERE id = ?', [now, fileId]);
            // Return updated record with accessed_at set
            row.accessed_at = now;
            return this.rowToRecord(row);
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', `Failed to get original file: ${error}`, { fileId, originalError: error });
        }
    }
    async getOriginalFilesByUrl(url) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const rows = await this.all('SELECT * FROM original_files WHERE url = ? ORDER BY created_at DESC', [url]);
            return rows.map(row => this.rowToRecord(row));
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', `Failed to get original files by URL: ${error}`, { url, originalError: error });
        }
    }
    async listOriginalFiles(options = {}) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            const conditions = [];
            const params = [];
            if (options.url) {
                conditions.push('url = ?');
                params.push(options.url);
            }
            if (options.status) {
                conditions.push('status = ?');
                params.push(options.status);
            }
            if (options.mimeType) {
                conditions.push('mime_type = ?');
                params.push(options.mimeType);
            }
            if (options.scraperUsed) {
                conditions.push('scraper_used = ?');
                params.push(options.scraperUsed);
            }
            if (options.fromDate) {
                conditions.push('created_at >= ?');
                params.push(options.fromDate.getTime());
            }
            if (options.toDate) {
                conditions.push('created_at <= ?');
                params.push(options.toDate.getTime());
            }
            let query = 'SELECT * FROM original_files';
            if (conditions.length > 0) {
                query += ' WHERE ' + conditions.join(' AND ');
            }
            // Add sorting
            const sortBy = options.sortBy || 'created_at';
            const sortOrder = options.sortOrder || 'desc';
            const sortColumn = this.mapSortColumn(sortBy);
            query += ` ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}`;
            // Add pagination
            if (options.limit) {
                query += ` LIMIT ${options.limit}`;
                if (options.offset) {
                    query += ` OFFSET ${options.offset}`;
                }
            }
            const rows = await this.all(query, params);
            return rows.map(row => this.rowToRecord(row));
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', `Failed to list original files: ${error}`, { options, originalError: error });
        }
    }
    async updateFileStatus(fileId, status) {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            await this.run('UPDATE original_files SET status = ?, updated_at = ? WHERE id = ?', [status, Date.now(), fileId]);
            // Check if any row was actually updated
            const result = await this.get('SELECT id FROM original_files WHERE id = ?', [fileId]);
            return result !== undefined;
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', `Failed to update file status: ${error}`, { fileId, status, originalError: error });
        }
    }
    async getStatistics() {
        if (!this.db)
            throw new Error('Database not initialized');
        try {
            // Get total files and size
            const totals = await this.get(`
        SELECT
          COUNT(*) as total_files,
          SUM(size) as total_size,
          AVG(size) as avg_size,
          MIN(created_at) as oldest,
          MAX(created_at) as newest
        FROM original_files
        WHERE status != 'deleted'
      `);
            // Get files by status
            const statusRows = await this.all(`
        SELECT status, COUNT(*) as count
        FROM original_files
        GROUP BY status
      `);
            const filesByStatus = Object.values(IOriginalFileRepository_1.FileStatus).reduce((acc, status) => ({ ...acc, [status]: 0 }), {});
            statusRows.forEach((row) => {
                filesByStatus[row.status] = row.count;
            });
            // Get files by mime type
            const mimeRows = await this.all(`
        SELECT mime_type, COUNT(*) as count
        FROM original_files
        WHERE status != 'deleted'
        GROUP BY mime_type
      `);
            const filesByMimeType = {};
            mimeRows.forEach((row) => {
                filesByMimeType[row.mime_type] = row.count;
            });
            // Get files by scraper
            const scraperRows = await this.all(`
        SELECT scraper_used, COUNT(*) as count
        FROM original_files
        WHERE status != 'deleted' AND scraper_used IS NOT NULL
        GROUP BY scraper_used
      `);
            const filesByScraperUsed = {};
            scraperRows.forEach((row) => {
                filesByScraperUsed[row.scraper_used] = row.count;
            });
            return {
                totalFiles: totals?.total_files || 0,
                totalSize: totals?.total_size || 0,
                averageFileSize: totals?.avg_size || 0,
                filesByStatus,
                filesByMimeType,
                filesByScraperUsed,
                oldestFile: totals?.oldest ? new Date(totals.oldest) : undefined,
                newestFile: totals?.newest ? new Date(totals.newest) : undefined
            };
        }
        catch (error) {
            throw ErrorHandler_1.ErrorHandler.createError('DATABASE_ERROR', `Failed to get statistics: ${error}`, { originalError: error });
        }
    }
    generateFileId() {
        const timestamp = Date.now();
        const random = crypto.randomBytes(8).toString('hex');
        return `file_${timestamp}_${random}`;
    }
    mapSortColumn(sortBy) {
        const mapping = {
            'createdAt': 'created_at',
            'size': 'size',
            'url': 'url'
        };
        return mapping[sortBy] || 'created_at';
    }
    rowToRecord(row) {
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
            scraperUsed: row.scraper_used || undefined,
            cleaningMetadata: cleaningMetadata || undefined,
            status: row.status,
            metadata: Object.keys(otherMetadata).length > 0 ? otherMetadata : undefined,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            accessedAt: row.accessed_at ? new Date(row.accessed_at) : undefined,
            downloadUrl: row.download_url
        };
    }
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
}
exports.SqlOriginalFileRepository = SqlOriginalFileRepository;
//# sourceMappingURL=SqlOriginalFileRepository.js.map