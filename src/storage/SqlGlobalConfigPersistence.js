"use strict";
/**
 * SQL-based implementation of global configuration persistence
 * Single Responsibility: Manages global configuration persistence in database
 * Follows SOLID principles for clean architecture
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
exports.SqlGlobalConfigPersistence = void 0;
const sqlite3 = __importStar(require("sqlite3"));
const ErrorHandler_1 = require("../utils/ErrorHandler");
class SqlGlobalConfigPersistence {
    dbPath;
    db;
    tableName = 'global_config';
    constructor(dbPath) {
        this.dbPath = dbPath;
        this.db = new sqlite3.Database(dbPath);
        // Table creation happens async in loadAllConfig
    }
    /**
     * Ensures the global_config table exists
     */
    async ensureTableExists() {
        return new Promise((resolve, reject) => {
            const sql = `
        CREATE TABLE IF NOT EXISTS ${this.tableName} (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          config_type TEXT NOT NULL UNIQUE,
          config_data TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
            this.db.run(sql, (err) => {
                if (err) {
                    reject(ErrorHandler_1.ErrorHandler.createError('DB_ERROR', 'Failed to create table', { error: err }));
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Saves scraper configuration to database
     */
    async saveScraperConfig(scrapers) {
        return this.saveConfig('scrapers', { scrapers });
    }
    /**
     * Saves cleaner configuration to database
     */
    async saveCleanerConfig(cleaners) {
        return this.saveConfig('cleaners', { cleaners });
    }
    /**
     * Generic method to save configuration
     */
    async saveConfig(configType, data) {
        // Ensure table exists before trying to save
        await this.ensureTableExists();
        return new Promise((resolve, reject) => {
            const sql = `
        INSERT OR REPLACE INTO ${this.tableName} (config_type, config_data, updated_at)
        VALUES (?, ?, datetime('now'))
      `;
            this.db.run(sql, [configType, JSON.stringify(data)], (err) => {
                if (err) {
                    reject(ErrorHandler_1.ErrorHandler.createError('DB_ERROR', 'Failed to save config', {
                        configType,
                        error: err
                    }));
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Loads scraper configuration from database
     */
    async loadScraperConfig() {
        const config = await this.loadConfig('scrapers');
        return config?.scrapers || null;
    }
    /**
     * Loads cleaner configuration from database
     */
    async loadCleanerConfig() {
        const config = await this.loadConfig('cleaners');
        return config?.cleaners || null;
    }
    /**
     * Generic method to load configuration
     */
    async loadConfig(configType) {
        return new Promise((resolve, reject) => {
            const sql = `
        SELECT config_data FROM ${this.tableName}
        WHERE config_type = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `;
            this.db.get(sql, [configType], (err, row) => {
                if (err) {
                    reject(ErrorHandler_1.ErrorHandler.createError('DB_ERROR', 'Failed to load config', {
                        configType,
                        error: err
                    }));
                }
                else if (row) {
                    try {
                        resolve(JSON.parse(row.config_data));
                    }
                    catch (parseErr) {
                        reject(ErrorHandler_1.ErrorHandler.createError('PARSE_ERROR', 'Invalid config data', {
                            configType,
                            error: parseErr
                        }));
                    }
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    /**
     * Loads all configuration from database
     */
    async loadAllConfig() {
        // Ensure table exists before trying to load
        await this.ensureTableExists();
        const [scrapers, cleaners] = await Promise.all([
            this.loadScraperConfig(),
            this.loadCleanerConfig()
        ]);
        return {
            scrapers: scrapers || [],
            cleaners: cleaners || []
        };
    }
    /**
     * Clears all configuration
     */
    async clearConfig() {
        return new Promise((resolve, reject) => {
            const sql = `DELETE FROM ${this.tableName}`;
            this.db.run(sql, (err) => {
                if (err) {
                    reject(ErrorHandler_1.ErrorHandler.createError('DB_ERROR', 'Failed to clear config', { error: err }));
                }
                else {
                    resolve();
                }
            });
        });
    }
    /**
     * Closes the database connection
     */
    close() {
        this.db.close();
    }
}
exports.SqlGlobalConfigPersistence = SqlGlobalConfigPersistence;
//# sourceMappingURL=SqlGlobalConfigPersistence.js.map