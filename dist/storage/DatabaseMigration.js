"use strict";
/**
 * Database migration utility for consolidating multiple databases into unified storage
 * Single Responsibility: Handles migration from old to new database structure
 * Open/Closed: Can be extended with new migration strategies
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
exports.DatabaseMigration = void 0;
exports.migrateToUnifiedDatabase = migrateToUnifiedDatabase;
const sqlite3 = __importStar(require("sqlite3"));
const fs = __importStar(require("fs/promises"));
const UnifiedSqlStorage_1 = require("./UnifiedSqlStorage");
/**
 * Database migration utility
 */
class DatabaseMigration {
    options;
    sourceConnections = {};
    constructor(options) {
        this.options = options;
    }
    /**
     * Perform the migration
     */
    async migrate() {
        const result = {
            success: false,
            migratedTables: {
                urls: 0,
                tags: 0,
                urlTags: 0,
                knowledgeEntries: 0,
                originalFiles: 0
            },
            errors: [],
            warnings: []
        };
        try {
            // Validate source databases exist
            await this.validateSourceDatabases(result);
            if (result.errors.length > 0) {
                return result;
            }
            // Create backups if requested
            if (this.options.backupOriginal && !this.options.dryRun) {
                result.backupPaths = await this.createBackups();
            }
            // Initialize unified storage
            if (this.options.verbose) {
                console.log(`Creating unified database at: ${this.options.targetDbPath}`);
            }
            if (!this.options.dryRun) {
                const unifiedStorage = new UnifiedSqlStorage_1.UnifiedSqlStorage({
                    dbPath: this.options.targetDbPath,
                    enableWAL: true,
                    enableForeignKeys: true
                });
                await unifiedStorage.initialize();
                // Open source database connections
                await this.openSourceConnections();
                // Migrate data in correct order (respecting foreign keys)
                await this.migrateUrls(result);
                await this.migrateTags(result);
                await this.migrateUrlTags(result);
                await this.migrateKnowledgeEntries(result);
                await this.migrateOriginalFiles(result);
                // Close connections
                await unifiedStorage.close();
                await this.closeSourceConnections();
                // Delete original databases if requested
                if (this.options.deleteOriginalAfterSuccess) {
                    await this.deleteOriginalDatabases();
                }
            }
            result.success = true;
            if (this.options.verbose) {
                console.log('Migration completed successfully!');
                console.log('Migration statistics:', result.migratedTables);
            }
        }
        catch (error) {
            result.errors.push(`Migration failed: ${error}`);
            if (this.options.verbose) {
                console.error('Migration error:', error);
            }
        }
        return result;
    }
    /**
     * Validate that source databases exist
     */
    async validateSourceDatabases(result) {
        if (this.options.knowledgeDbPath) {
            try {
                await fs.access(this.options.knowledgeDbPath);
            }
            catch {
                result.warnings.push(`Knowledge database not found: ${this.options.knowledgeDbPath}`);
            }
        }
        if (this.options.urlsDbPath) {
            try {
                await fs.access(this.options.urlsDbPath);
            }
            catch {
                result.warnings.push(`URLs database not found: ${this.options.urlsDbPath}`);
            }
        }
        if (this.options.originalFilesDbPath) {
            try {
                await fs.access(this.options.originalFilesDbPath);
            }
            catch {
                result.warnings.push(`Original files database not found: ${this.options.originalFilesDbPath}`);
            }
        }
        if (result.warnings.length === 3) {
            result.errors.push('No source databases found for migration');
        }
    }
    /**
     * Create backups of original databases
     */
    async createBackups() {
        const backupPaths = [];
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        if (this.options.knowledgeDbPath) {
            const backupPath = `${this.options.knowledgeDbPath}.backup-${timestamp}`;
            await fs.copyFile(this.options.knowledgeDbPath, backupPath);
            backupPaths.push(backupPath);
            if (this.options.verbose) {
                console.log(`Created backup: ${backupPath}`);
            }
        }
        if (this.options.urlsDbPath) {
            const backupPath = `${this.options.urlsDbPath}.backup-${timestamp}`;
            await fs.copyFile(this.options.urlsDbPath, backupPath);
            backupPaths.push(backupPath);
            if (this.options.verbose) {
                console.log(`Created backup: ${backupPath}`);
            }
        }
        if (this.options.originalFilesDbPath) {
            const backupPath = `${this.options.originalFilesDbPath}.backup-${timestamp}`;
            await fs.copyFile(this.options.originalFilesDbPath, backupPath);
            backupPaths.push(backupPath);
            if (this.options.verbose) {
                console.log(`Created backup: ${backupPath}`);
            }
        }
        return backupPaths;
    }
    /**
     * Open connections to source databases
     */
    async openSourceConnections() {
        if (this.options.knowledgeDbPath) {
            this.sourceConnections.knowledge = await this.openDatabase(this.options.knowledgeDbPath);
        }
        if (this.options.urlsDbPath) {
            this.sourceConnections.urls = await this.openDatabase(this.options.urlsDbPath);
        }
        if (this.options.originalFilesDbPath) {
            this.sourceConnections.originalFiles = await this.openDatabase(this.options.originalFilesDbPath);
        }
    }
    /**
     * Open a single database connection
     */
    openDatabase(dbPath) {
        return new Promise((resolve, reject) => {
            const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
                if (err)
                    reject(err);
                else
                    resolve(db);
            });
        });
    }
    /**
     * Close source database connections
     */
    async closeSourceConnections() {
        const closePromises = [];
        if (this.sourceConnections.knowledge) {
            closePromises.push(this.closeDatabase(this.sourceConnections.knowledge));
        }
        if (this.sourceConnections.urls) {
            closePromises.push(this.closeDatabase(this.sourceConnections.urls));
        }
        if (this.sourceConnections.originalFiles) {
            closePromises.push(this.closeDatabase(this.sourceConnections.originalFiles));
        }
        await Promise.all(closePromises);
    }
    /**
     * Close a single database connection
     */
    closeDatabase(db) {
        return new Promise((resolve, reject) => {
            db.close((err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Migrate URLs table
     */
    async migrateUrls(result) {
        if (!this.sourceConnections.urls) {
            if (this.options.verbose) {
                console.log('Skipping URLs migration - no source database');
            }
            return;
        }
        try {
            const targetDb = await this.openDatabase(this.options.targetDbPath);
            // Get all URLs from source
            const urls = await this.queryAll(this.sourceConnections.urls, 'SELECT * FROM urls');
            // Insert into target
            for (const url of urls) {
                await this.runQuery(targetDb, `INSERT OR IGNORE INTO urls
           (id, url, normalized_url, content_hash, previous_hash, status,
            error_message, first_seen, last_checked, last_content_change,
            process_count, content_version, metadata)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    url.id, url.url, url.normalized_url, url.content_hash,
                    url.previous_hash, url.status, url.error_message,
                    url.first_seen, url.last_checked, url.last_content_change,
                    url.process_count, url.content_version, url.metadata
                ]);
            }
            await this.closeDatabase(targetDb);
            result.migratedTables.urls = urls.length;
            if (this.options.verbose) {
                console.log(`Migrated ${urls.length} URLs`);
            }
        }
        catch (error) {
            result.errors.push(`Failed to migrate URLs: ${error}`);
        }
    }
    /**
     * Migrate tags table
     */
    async migrateTags(result) {
        if (!this.sourceConnections.urls) {
            if (this.options.verbose) {
                console.log('Skipping tags migration - no source database');
            }
            return;
        }
        try {
            // Check if tags table exists in source
            const tableExists = await this.tableExists(this.sourceConnections.urls, 'tags');
            if (!tableExists) {
                if (this.options.verbose) {
                    console.log('No tags table found in source database');
                }
                return;
            }
            const targetDb = await this.openDatabase(this.options.targetDbPath);
            // Get all tags from source
            const tags = await this.queryAll(this.sourceConnections.urls, 'SELECT * FROM tags ORDER BY parent_id NULLS FIRST');
            // Insert into target (order matters for parent references)
            for (const tag of tags) {
                await this.runQuery(targetDb, `INSERT OR IGNORE INTO tags
           (id, name, parent_id, description, color, created_at)
           VALUES (?, ?, ?, ?, ?, ?)`, [
                    tag.id, tag.name, tag.parent_id,
                    tag.description, tag.color, tag.created_at
                ]);
            }
            await this.closeDatabase(targetDb);
            result.migratedTables.tags = tags.length;
            if (this.options.verbose) {
                console.log(`Migrated ${tags.length} tags`);
            }
        }
        catch (error) {
            result.errors.push(`Failed to migrate tags: ${error}`);
        }
    }
    /**
     * Migrate URL-tags relationship table
     */
    async migrateUrlTags(result) {
        if (!this.sourceConnections.urls) {
            if (this.options.verbose) {
                console.log('Skipping URL-tags migration - no source database');
            }
            return;
        }
        try {
            // Check if url_tags table exists in source
            const tableExists = await this.tableExists(this.sourceConnections.urls, 'url_tags');
            if (!tableExists) {
                if (this.options.verbose) {
                    console.log('No url_tags table found in source database');
                }
                return;
            }
            const targetDb = await this.openDatabase(this.options.targetDbPath);
            // Get all URL-tag relationships from source
            const urlTags = await this.queryAll(this.sourceConnections.urls, 'SELECT * FROM url_tags');
            // Insert into target
            for (const urlTag of urlTags) {
                await this.runQuery(targetDb, `INSERT OR IGNORE INTO url_tags (url_id, tag_id, created_at)
           VALUES (?, ?, ?)`, [urlTag.url_id, urlTag.tag_id, urlTag.created_at]);
            }
            await this.closeDatabase(targetDb);
            result.migratedTables.urlTags = urlTags.length;
            if (this.options.verbose) {
                console.log(`Migrated ${urlTags.length} URL-tag relationships`);
            }
        }
        catch (error) {
            result.errors.push(`Failed to migrate URL-tags: ${error}`);
        }
    }
    /**
     * Migrate knowledge entries table
     */
    async migrateKnowledgeEntries(result) {
        if (!this.sourceConnections.knowledge) {
            if (this.options.verbose) {
                console.log('Skipping knowledge entries migration - no source database');
            }
            return;
        }
        try {
            const targetDb = await this.openDatabase(this.options.targetDbPath);
            // Get all knowledge entries from source
            const entries = await this.queryAll(this.sourceConnections.knowledge, 'SELECT * FROM knowledge_entries');
            // For each entry, find corresponding URL ID
            for (const entry of entries) {
                // Look up URL ID in target database
                const urlRow = await this.queryOne(targetDb, 'SELECT id FROM urls WHERE url = ? OR normalized_url = ?', [entry.url, entry.url]);
                const urlId = urlRow?.id || null;
                if (!urlId) {
                    result.warnings.push(`No URL found for knowledge entry: ${entry.url}`);
                    // Create a new URL entry if needed
                    const newUrlId = `migrated_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    await this.runQuery(targetDb, `INSERT INTO urls (id, url, normalized_url, status, first_seen, last_checked, metadata)
             VALUES (?, ?, ?, ?, ?, ?, ?)`, [newUrlId, entry.url, entry.url, 'migrated', Date.now(), Date.now(), '{}']);
                }
                await this.runQuery(targetDb, `INSERT OR IGNORE INTO knowledge_entries
           (id, url_id, url, title, content_type, text, metadata, tags,
            created_at, updated_at, size, checksum, processing_status, error_message)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    entry.id, urlId || `migrated_${entry.id}`, entry.url, entry.title,
                    entry.content_type, entry.text, entry.metadata, entry.tags,
                    entry.created_at, entry.updated_at, entry.size, entry.checksum,
                    entry.processing_status, entry.error_message
                ]);
            }
            await this.closeDatabase(targetDb);
            result.migratedTables.knowledgeEntries = entries.length;
            if (this.options.verbose) {
                console.log(`Migrated ${entries.length} knowledge entries`);
            }
        }
        catch (error) {
            result.errors.push(`Failed to migrate knowledge entries: ${error}`);
        }
    }
    /**
     * Migrate original files table
     */
    async migrateOriginalFiles(result) {
        if (!this.sourceConnections.originalFiles) {
            if (this.options.verbose) {
                console.log('Skipping original files migration - no source database');
            }
            return;
        }
        try {
            const targetDb = await this.openDatabase(this.options.targetDbPath);
            // Get all original files from source
            const files = await this.queryAll(this.sourceConnections.originalFiles, 'SELECT * FROM original_files');
            // For each file, find corresponding URL ID
            for (const file of files) {
                // Look up URL ID in target database
                const urlRow = await this.queryOne(targetDb, 'SELECT id FROM urls WHERE url = ? OR normalized_url = ?', [file.url, file.url]);
                const urlId = urlRow?.id || null;
                await this.runQuery(targetDb, `INSERT OR IGNORE INTO original_files
           (id, url_id, url, file_path, mime_type, size, checksum,
            scraper_used, status, metadata, created_at, updated_at,
            accessed_at, download_url)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
                    file.id, urlId, file.url, file.file_path, file.mime_type,
                    file.size, file.checksum, file.scraper_used, file.status,
                    file.metadata, file.created_at, file.updated_at,
                    file.accessed_at, file.download_url
                ]);
            }
            await this.closeDatabase(targetDb);
            result.migratedTables.originalFiles = files.length;
            if (this.options.verbose) {
                console.log(`Migrated ${files.length} original files`);
            }
        }
        catch (error) {
            result.errors.push(`Failed to migrate original files: ${error}`);
        }
    }
    /**
     * Check if a table exists in database
     */
    async tableExists(db, tableName) {
        const result = await this.queryOne(db, `SELECT COUNT(*) as count FROM sqlite_master
       WHERE type='table' AND name=?`, [tableName]);
        return (result?.count || 0) > 0;
    }
    /**
     * Query all rows
     */
    queryAll(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.all(sql, params, (err, rows) => {
                if (err)
                    reject(err);
                else
                    resolve(rows || []);
            });
        });
    }
    /**
     * Query single row
     */
    queryOne(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.get(sql, params, (err, row) => {
                if (err)
                    reject(err);
                else
                    resolve(row || null);
            });
        });
    }
    /**
     * Run a query without expecting results
     */
    runQuery(db, sql, params = []) {
        return new Promise((resolve, reject) => {
            db.run(sql, params, (err) => {
                if (err)
                    reject(err);
                else
                    resolve();
            });
        });
    }
    /**
     * Delete original databases after successful migration
     */
    async deleteOriginalDatabases() {
        if (this.options.knowledgeDbPath) {
            await fs.unlink(this.options.knowledgeDbPath);
            if (this.options.verbose) {
                console.log(`Deleted original database: ${this.options.knowledgeDbPath}`);
            }
        }
        if (this.options.urlsDbPath) {
            await fs.unlink(this.options.urlsDbPath);
            if (this.options.verbose) {
                console.log(`Deleted original database: ${this.options.urlsDbPath}`);
            }
        }
        if (this.options.originalFilesDbPath) {
            await fs.unlink(this.options.originalFilesDbPath);
            if (this.options.verbose) {
                console.log(`Deleted original database: ${this.options.originalFilesDbPath}`);
            }
        }
    }
}
exports.DatabaseMigration = DatabaseMigration;
/**
 * Convenience function to perform migration
 */
async function migrateToUnifiedDatabase(options) {
    const migration = new DatabaseMigration(options);
    return await migration.migrate();
}
//# sourceMappingURL=DatabaseMigration.js.map