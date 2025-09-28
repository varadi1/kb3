"use strict";
/**
 * Text Cleaner Configuration Manager
 * Single Responsibility: Manage per-URL cleaner configurations
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TextCleanerConfigManager = void 0;
const better_sqlite3_1 = __importDefault(require("better-sqlite3"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
class TextCleanerConfigManager {
    db = null;
    dbPath;
    inMemoryCache;
    constructor(dbPath = './data/cleaner_configs.db') {
        this.dbPath = dbPath;
        this.inMemoryCache = new Map();
        this.initializeDatabase();
    }
    /**
     * Initialize the database
     */
    initializeDatabase() {
        try {
            // Ensure directory exists
            const dir = path.dirname(this.dbPath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            this.db = new better_sqlite3_1.default(this.dbPath);
            // Create table if not exists
            this.db.exec(`
        CREATE TABLE IF NOT EXISTS cleaner_configs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          url TEXT NOT NULL,
          cleaner_name TEXT NOT NULL,
          config TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          UNIQUE(url, cleaner_name)
        );

        CREATE INDEX IF NOT EXISTS idx_url ON cleaner_configs(url);
        CREATE INDEX IF NOT EXISTS idx_cleaner ON cleaner_configs(cleaner_name);
        CREATE INDEX IF NOT EXISTS idx_updated ON cleaner_configs(updated_at);
      `);
            console.log(`Initialized cleaner config database at: ${this.dbPath}`);
        }
        catch (error) {
            console.error('Failed to initialize cleaner config database:', error);
            // Fall back to in-memory only
            this.db = null;
        }
    }
    /**
     * Set configuration for a specific URL
     */
    async setUrlConfig(url, cleanerName, config) {
        // Update cache
        if (!this.inMemoryCache.has(url)) {
            this.inMemoryCache.set(url, new Map());
        }
        this.inMemoryCache.get(url).set(cleanerName, config);
        // Update database if available
        if (this.db) {
            try {
                const configJson = JSON.stringify(config);
                const now = Date.now();
                const stmt = this.db.prepare(`
          INSERT INTO cleaner_configs (url, cleaner_name, config, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(url, cleaner_name)
          DO UPDATE SET config = excluded.config, updated_at = excluded.updated_at
        `);
                stmt.run(url, cleanerName, configJson, now, now);
                console.log(`Saved config for ${cleanerName} on ${url}`);
            }
            catch (error) {
                console.error('Failed to save cleaner config to database:', error);
            }
        }
    }
    /**
     * Get configuration for a specific URL
     */
    async getUrlConfig(url, cleanerName) {
        // Check cache first
        const cached = this.inMemoryCache.get(url)?.get(cleanerName);
        if (cached) {
            return cached;
        }
        // Check database
        if (this.db) {
            try {
                const stmt = this.db.prepare(`
          SELECT config FROM cleaner_configs
          WHERE url = ? AND cleaner_name = ?
        `);
                const row = stmt.get(url, cleanerName);
                if (row) {
                    const config = JSON.parse(row.config);
                    // Update cache
                    if (!this.inMemoryCache.has(url)) {
                        this.inMemoryCache.set(url, new Map());
                    }
                    this.inMemoryCache.get(url).set(cleanerName, config);
                    return config;
                }
            }
            catch (error) {
                console.error('Failed to get cleaner config from database:', error);
            }
        }
        return null;
    }
    /**
     * Set configuration for multiple URLs
     */
    async batchSetConfig(urls, cleanerName, config) {
        if (this.db) {
            const transaction = this.db.transaction(() => {
                for (const url of urls) {
                    this.setUrlConfig(url, cleanerName, config);
                }
            });
            try {
                transaction();
                console.log(`Batch set config for ${urls.length} URLs`);
            }
            catch (error) {
                console.error('Batch config update failed:', error);
                throw error;
            }
        }
        else {
            // Fall back to individual updates
            for (const url of urls) {
                await this.setUrlConfig(url, cleanerName, config);
            }
        }
    }
    /**
     * Get all configurations for a URL
     */
    async getAllUrlConfigs(url) {
        const configs = new Map();
        // Check cache first
        const cached = this.inMemoryCache.get(url);
        if (cached) {
            return new Map(cached);
        }
        // Load from database
        if (this.db) {
            try {
                const stmt = this.db.prepare(`
          SELECT cleaner_name, config FROM cleaner_configs
          WHERE url = ?
        `);
                const rows = stmt.all(url);
                for (const row of rows) {
                    const config = JSON.parse(row.config);
                    configs.set(row.cleaner_name, config);
                }
                // Update cache
                if (configs.size > 0) {
                    this.inMemoryCache.set(url, new Map(configs));
                }
            }
            catch (error) {
                console.error('Failed to get all configs from database:', error);
            }
        }
        return configs;
    }
    /**
     * Remove configuration for a URL
     */
    async removeUrlConfig(url, cleanerName) {
        // Update cache
        if (cleanerName) {
            this.inMemoryCache.get(url)?.delete(cleanerName);
        }
        else {
            this.inMemoryCache.delete(url);
        }
        // Update database
        if (this.db) {
            try {
                if (cleanerName) {
                    const stmt = this.db.prepare(`
            DELETE FROM cleaner_configs
            WHERE url = ? AND cleaner_name = ?
          `);
                    stmt.run(url, cleanerName);
                }
                else {
                    const stmt = this.db.prepare(`
            DELETE FROM cleaner_configs
            WHERE url = ?
          `);
                    stmt.run(url);
                }
                console.log(`Removed config for ${url}${cleanerName ? ` (${cleanerName})` : ''}`);
            }
            catch (error) {
                console.error('Failed to remove config from database:', error);
            }
        }
    }
    /**
     * Apply configuration template to URLs matching a pattern
     */
    async applyConfigTemplate(pattern, cleanerName, config) {
        if (!this.db) {
            console.warn('Database not available for template application');
            return 0;
        }
        try {
            // Get all URLs from database
            const stmt = this.db.prepare(`
        SELECT DISTINCT url FROM cleaner_configs
      `);
            const rows = stmt.all();
            // Filter URLs matching the pattern
            const matchingUrls = [];
            const regex = typeof pattern === 'string'
                ? new RegExp(pattern.replace(/\*/g, '.*'))
                : pattern;
            for (const row of rows) {
                if (regex.test(row.url)) {
                    matchingUrls.push(row.url);
                }
            }
            // Apply configuration to matching URLs
            if (matchingUrls.length > 0) {
                await this.batchSetConfig(matchingUrls, cleanerName, config);
            }
            return matchingUrls.length;
        }
        catch (error) {
            console.error('Failed to apply config template:', error);
            return 0;
        }
    }
    /**
     * Get statistics about stored configurations
     */
    getStats() {
        const stats = {
            totalUrls: 0,
            totalConfigs: 0,
            configsByCleaners: new Map(),
            cacheSize: this.inMemoryCache.size
        };
        if (this.db) {
            try {
                // Count total URLs
                const urlCountStmt = this.db.prepare(`
          SELECT COUNT(DISTINCT url) as count FROM cleaner_configs
        `);
                const urlCount = urlCountStmt.get();
                stats.totalUrls = urlCount.count;
                // Count total configs
                const configCountStmt = this.db.prepare(`
          SELECT COUNT(*) as count FROM cleaner_configs
        `);
                const configCount = configCountStmt.get();
                stats.totalConfigs = configCount.count;
                // Count by cleaner
                const cleanerStatsStmt = this.db.prepare(`
          SELECT cleaner_name, COUNT(*) as count
          FROM cleaner_configs
          GROUP BY cleaner_name
        `);
                const cleanerStats = cleanerStatsStmt.all();
                for (const row of cleanerStats) {
                    stats.configsByCleaners.set(row.cleaner_name, row.count);
                }
            }
            catch (error) {
                console.error('Failed to get stats from database:', error);
            }
        }
        return stats;
    }
    /**
     * Export all configurations
     */
    async exportConfigurations() {
        const exported = {};
        if (this.db) {
            try {
                const stmt = this.db.prepare(`
          SELECT url, cleaner_name, config
          FROM cleaner_configs
          ORDER BY url, cleaner_name
        `);
                const rows = stmt.all();
                for (const row of rows) {
                    if (!exported[row.url]) {
                        exported[row.url] = {};
                    }
                    exported[row.url][row.cleaner_name] = JSON.parse(row.config);
                }
            }
            catch (error) {
                console.error('Failed to export configurations:', error);
            }
        }
        return exported;
    }
    /**
     * Import configurations
     */
    async importConfigurations(configs) {
        for (const [url, cleanerConfigs] of Object.entries(configs)) {
            for (const [cleanerName, config] of Object.entries(cleanerConfigs)) {
                await this.setUrlConfig(url, cleanerName, config);
            }
        }
    }
    /**
     * Clean up old configurations
     */
    async cleanupOldConfigs(daysOld = 30) {
        if (!this.db) {
            return 0;
        }
        try {
            const cutoffTime = Date.now() - (daysOld * 24 * 60 * 60 * 1000);
            const stmt = this.db.prepare(`
        DELETE FROM cleaner_configs
        WHERE updated_at < ?
      `);
            const result = stmt.run(cutoffTime);
            console.log(`Cleaned up ${result.changes} old configurations`);
            return result.changes;
        }
        catch (error) {
            console.error('Failed to cleanup old configs:', error);
            return 0;
        }
    }
    /**
     * Close database connection
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.inMemoryCache.clear();
    }
}
exports.TextCleanerConfigManager = TextCleanerConfigManager;
//# sourceMappingURL=TextCleanerConfigManager.js.map