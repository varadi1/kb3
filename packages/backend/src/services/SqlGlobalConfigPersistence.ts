/**
 * SQL-based implementation of global configuration persistence
 * Single Responsibility: Manages global configuration persistence in database
 * Follows SOLID principles for clean architecture
 */

import * as sqlite3 from 'sqlite3';
// Error handling utilities

export interface GlobalConfig {
  scrapers?: Array<{
    type: string;
    enabled: boolean;
    priority: number;
    parameters?: Record<string, any>;
  }>;
  cleaners?: Array<{
    type: string;
    enabled: boolean;
    order: number;
    parameters?: Record<string, any>;
  }>;
}

export class SqlGlobalConfigPersistence {
  private db: sqlite3.Database;
  private readonly tableName = 'global_config';

  constructor(private readonly dbPath: string) {
    this.db = new sqlite3.Database(dbPath);
    // Table creation happens async in loadAllConfig
  }

  /**
   * Ensures the global_config table exists
   */
  private async ensureTableExists(): Promise<void> {
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
          reject(new Error(`Failed to create table: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Saves scraper configuration to database
   */
  async saveScraperConfig(scrapers: GlobalConfig['scrapers']): Promise<void> {
    return this.saveConfig('scrapers', { scrapers });
  }

  /**
   * Saves cleaner configuration to database
   */
  async saveCleanerConfig(cleaners: GlobalConfig['cleaners']): Promise<void> {
    return this.saveConfig('cleaners', { cleaners });
  }

  /**
   * Generic method to save configuration
   */
  private async saveConfig(configType: string, data: any): Promise<void> {
    // Ensure table exists before trying to save
    await this.ensureTableExists();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO ${this.tableName} (config_type, config_data, updated_at)
        VALUES (?, ?, datetime('now'))
      `;

      this.db.run(sql, [configType, JSON.stringify(data)], (err) => {
        if (err) {
          reject(new Error(`Failed to save config for ${configType}: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Loads scraper configuration from database
   */
  async loadScraperConfig(): Promise<GlobalConfig['scrapers'] | null> {
    const config = await this.loadConfig('scrapers');
    return config?.scrapers || null;
  }

  /**
   * Loads cleaner configuration from database
   */
  async loadCleanerConfig(): Promise<GlobalConfig['cleaners'] | null> {
    const config = await this.loadConfig('cleaners');
    return config?.cleaners || null;
  }

  /**
   * Generic method to load configuration
   */
  private async loadConfig(configType: string): Promise<any | null> {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT config_data FROM ${this.tableName}
        WHERE config_type = ?
        ORDER BY updated_at DESC
        LIMIT 1
      `;

      this.db.get(sql, [configType], (err, row: any) => {
        if (err) {
          reject(new Error(`Failed to load config for ${configType}: ${err.message}`));
        } else if (row) {
          try {
            resolve(JSON.parse(row.config_data));
          } catch (parseErr) {
            reject(new Error(`Invalid config data for ${configType}: ${parseErr.message}`));
          }
        } else {
          resolve(null);
        }
      });
    });
  }

  /**
   * Loads all configuration from database
   */
  async loadAllConfig(): Promise<GlobalConfig> {
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
  async clearConfig(): Promise<void> {
    return new Promise((resolve, reject) => {
      const sql = `DELETE FROM ${this.tableName}`;

      this.db.run(sql, (err) => {
        if (err) {
          reject(new Error(`Failed to clear config: ${err.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Closes the database connection
   */
  close(): void {
    this.db.close();
  }
}