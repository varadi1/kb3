/**
 * Text Cleaner Configuration Manager
 * Single Responsibility: Manage per-URL cleaner configurations
 */

import Database from 'better-sqlite3';
import {
  ITextCleanerConfig,
  ITextCleanerConfigManager
} from '../interfaces/ITextCleaner';
import * as path from 'path';
import * as fs from 'fs';

export class TextCleanerConfigManager implements ITextCleanerConfigManager {
  private db: Database.Database | null = null;
  private dbPath: string;
  private inMemoryCache: Map<string, Map<string, ITextCleanerConfig>>;

  constructor(dbPath: string = './data/cleaner_configs.db') {
    this.dbPath = dbPath;
    this.inMemoryCache = new Map();
    this.initializeDatabase();
  }

  /**
   * Initialize the database
   */
  private initializeDatabase(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.db = new Database(this.dbPath);

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
    } catch (error) {
      console.error('Failed to initialize cleaner config database:', error);
      // Fall back to in-memory only
      this.db = null;
    }
  }

  /**
   * Set configuration for a specific URL
   */
  async setUrlConfig(
    url: string,
    cleanerName: string,
    config: ITextCleanerConfig
  ): Promise<void> {
    // Update cache
    if (!this.inMemoryCache.has(url)) {
      this.inMemoryCache.set(url, new Map());
    }
    this.inMemoryCache.get(url)!.set(cleanerName, config);

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
      } catch (error) {
        console.error('Failed to save cleaner config to database:', error);
      }
    }
  }

  /**
   * Get configuration for a specific URL
   */
  async getUrlConfig(
    url: string,
    cleanerName: string
  ): Promise<ITextCleanerConfig | null> {
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

        const row = stmt.get(url, cleanerName) as { config: string } | undefined;
        if (row) {
          const config = JSON.parse(row.config) as ITextCleanerConfig;

          // Update cache
          if (!this.inMemoryCache.has(url)) {
            this.inMemoryCache.set(url, new Map());
          }
          this.inMemoryCache.get(url)!.set(cleanerName, config);

          return config;
        }
      } catch (error) {
        console.error('Failed to get cleaner config from database:', error);
      }
    }

    return null;
  }

  /**
   * Set configuration for multiple URLs
   */
  async batchSetConfig(
    urls: string[],
    cleanerName: string,
    config: ITextCleanerConfig
  ): Promise<void> {
    if (this.db) {
      const transaction = this.db.transaction(() => {
        for (const url of urls) {
          this.setUrlConfig(url, cleanerName, config);
        }
      });

      try {
        transaction();
        console.log(`Batch set config for ${urls.length} URLs`);
      } catch (error) {
        console.error('Batch config update failed:', error);
        throw error;
      }
    } else {
      // Fall back to individual updates
      for (const url of urls) {
        await this.setUrlConfig(url, cleanerName, config);
      }
    }
  }

  /**
   * Get all configurations for a URL
   */
  async getAllUrlConfigs(url: string): Promise<Map<string, ITextCleanerConfig>> {
    const configs = new Map<string, ITextCleanerConfig>();

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

        const rows = stmt.all(url) as Array<{ cleaner_name: string; config: string }>;

        for (const row of rows) {
          const config = JSON.parse(row.config) as ITextCleanerConfig;
          configs.set(row.cleaner_name, config);
        }

        // Update cache
        if (configs.size > 0) {
          this.inMemoryCache.set(url, new Map(configs));
        }
      } catch (error) {
        console.error('Failed to get all configs from database:', error);
      }
    }

    return configs;
  }

  /**
   * Remove configuration for a URL
   */
  async removeUrlConfig(url: string, cleanerName?: string): Promise<void> {
    // Update cache
    if (cleanerName) {
      this.inMemoryCache.get(url)?.delete(cleanerName);
    } else {
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
        } else {
          const stmt = this.db.prepare(`
            DELETE FROM cleaner_configs
            WHERE url = ?
          `);
          stmt.run(url);
        }

        console.log(`Removed config for ${url}${cleanerName ? ` (${cleanerName})` : ''}`);
      } catch (error) {
        console.error('Failed to remove config from database:', error);
      }
    }
  }

  /**
   * Apply configuration template to URLs matching a pattern
   */
  async applyConfigTemplate(
    pattern: string | RegExp,
    cleanerName: string,
    config: ITextCleanerConfig
  ): Promise<number> {
    if (!this.db) {
      console.warn('Database not available for template application');
      return 0;
    }

    try {
      // Get all URLs from database
      const stmt = this.db.prepare(`
        SELECT DISTINCT url FROM cleaner_configs
      `);
      const rows = stmt.all() as Array<{ url: string }>;

      // Filter URLs matching the pattern
      const matchingUrls: string[] = [];
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
    } catch (error) {
      console.error('Failed to apply config template:', error);
      return 0;
    }
  }

  /**
   * Get statistics about stored configurations
   */
  getStats(): {
    totalUrls: number;
    totalConfigs: number;
    configsByCleaners: Map<string, number>;
    cacheSize: number;
  } {
    const stats = {
      totalUrls: 0,
      totalConfigs: 0,
      configsByCleaners: new Map<string, number>(),
      cacheSize: this.inMemoryCache.size
    };

    if (this.db) {
      try {
        // Count total URLs
        const urlCountStmt = this.db.prepare(`
          SELECT COUNT(DISTINCT url) as count FROM cleaner_configs
        `);
        const urlCount = urlCountStmt.get() as { count: number };
        stats.totalUrls = urlCount.count;

        // Count total configs
        const configCountStmt = this.db.prepare(`
          SELECT COUNT(*) as count FROM cleaner_configs
        `);
        const configCount = configCountStmt.get() as { count: number };
        stats.totalConfigs = configCount.count;

        // Count by cleaner
        const cleanerStatsStmt = this.db.prepare(`
          SELECT cleaner_name, COUNT(*) as count
          FROM cleaner_configs
          GROUP BY cleaner_name
        `);
        const cleanerStats = cleanerStatsStmt.all() as Array<{ cleaner_name: string; count: number }>;

        for (const row of cleanerStats) {
          stats.configsByCleaners.set(row.cleaner_name, row.count);
        }
      } catch (error) {
        console.error('Failed to get stats from database:', error);
      }
    }

    return stats;
  }

  /**
   * Export all configurations
   */
  async exportConfigurations(): Promise<Record<string, Record<string, ITextCleanerConfig>>> {
    const exported: Record<string, Record<string, ITextCleanerConfig>> = {};

    if (this.db) {
      try {
        const stmt = this.db.prepare(`
          SELECT url, cleaner_name, config
          FROM cleaner_configs
          ORDER BY url, cleaner_name
        `);

        const rows = stmt.all() as Array<{ url: string; cleaner_name: string; config: string }>;

        for (const row of rows) {
          if (!exported[row.url]) {
            exported[row.url] = {};
          }
          exported[row.url][row.cleaner_name] = JSON.parse(row.config);
        }
      } catch (error) {
        console.error('Failed to export configurations:', error);
      }
    }

    return exported;
  }

  /**
   * Import configurations
   */
  async importConfigurations(
    configs: Record<string, Record<string, ITextCleanerConfig>>
  ): Promise<void> {
    for (const [url, cleanerConfigs] of Object.entries(configs)) {
      for (const [cleanerName, config] of Object.entries(cleanerConfigs)) {
        await this.setUrlConfig(url, cleanerName, config);
      }
    }
  }

  /**
   * Clean up old configurations
   */
  async cleanupOldConfigs(daysOld: number = 30): Promise<number> {
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
    } catch (error) {
      console.error('Failed to cleanup old configs:', error);
      return 0;
    }
  }

  /**
   * Close database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.inMemoryCache.clear();
  }
}