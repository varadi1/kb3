/**
 * Parameter Storage Service - Handles persistence of scraper parameters
 * Single Responsibility: Store and retrieve scraper parameters from database
 * Open/Closed: Can extend storage backends without modifying existing code
 */

import * as sqlite3 from 'sqlite3';
import { Database as SqliteDatabase } from 'sqlite3';
import * as path from 'path';

// Define ScraperConfiguration locally
interface ScraperConfiguration {
  scraperType: string;
  parameters: any;
  priority?: number;
  enabled?: boolean;
  urlPattern?: string | RegExp;
}

export interface StoredParameterConfiguration {
  url: string;
  scraperType: string;
  parameters: string; // JSON string
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IParameterStorageService {
  initialize(): Promise<void>;
  saveParameters(url: string, config: ScraperConfiguration): Promise<void>;
  getParameters(url: string): Promise<ScraperConfiguration | null>;
  saveParametersBatch(configs: Array<{ url: string; config: ScraperConfiguration }>): Promise<void>;
  getParametersBatch(urls: string[]): Promise<Map<string, ScraperConfiguration>>;
  deleteParameters(url: string): Promise<void>;
  deleteParametersBatch(urls: string[]): Promise<void>;
  getAllParameters(): Promise<Map<string, ScraperConfiguration>>;
  getParametersByScraperType(scraperType: string): Promise<Map<string, ScraperConfiguration>>;
}

export class ParameterStorageService implements IParameterStorageService {
  private db: SqliteDatabase | null = null;
  private dbPath: string;
  private initialized: boolean = false;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || path.join(process.cwd(), 'data', 'unified.db');
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          reject(err);
          return;
        }

        // Create parameters table if it doesn't exist
        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS scraper_parameters (
            url TEXT PRIMARY KEY,
            scraper_type TEXT NOT NULL,
            parameters TEXT NOT NULL,
            priority INTEGER DEFAULT 10,
            enabled INTEGER DEFAULT 1,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
          );

          CREATE INDEX IF NOT EXISTS idx_scraper_type ON scraper_parameters(scraper_type);
          CREATE INDEX IF NOT EXISTS idx_priority ON scraper_parameters(priority);
          CREATE INDEX IF NOT EXISTS idx_enabled ON scraper_parameters(enabled);
        `;

        this.db!.exec(createTableSQL, (err) => {
          if (err) {
            reject(err);
            return;
          }

          this.initialized = true;
          resolve();
        });
      });
    });
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.db) {
      throw new Error('ParameterStorageService not initialized. Call initialize() first.');
    }
  }

  async saveParameters(url: string, config: ScraperConfiguration): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO scraper_parameters
        (url, scraper_type, parameters, priority, enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      const params = [
        url,
        config.scraperType,
        JSON.stringify(config.parameters),
        config.priority || 10,
        config.enabled !== false ? 1 : 0
      ];

      this.db!.run(sql, params, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async getParameters(url: string): Promise<ScraperConfiguration | null> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT scraper_type, parameters, priority, enabled
        FROM scraper_parameters
        WHERE url = ?
      `;

      this.db!.get(sql, [url], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          resolve(null);
          return;
        }

        try {
          const config: ScraperConfiguration = {
            scraperType: row.scraper_type,
            parameters: JSON.parse(row.parameters),
            priority: row.priority,
            enabled: row.enabled === 1
          };
          resolve(config);
        } catch (parseErr) {
          reject(parseErr);
        }
      });
    });
  }

  async saveParametersBatch(configs: Array<{ url: string; config: ScraperConfiguration }>): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO scraper_parameters
        (url, scraper_type, parameters, priority, enabled, updated_at)
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
      `;

      this.db!.serialize(() => {
        this.db!.run('BEGIN TRANSACTION');

        const stmt = this.db!.prepare(sql);
        let hasError = false;

        for (const { url, config } of configs) {
          if (hasError) break;

          stmt.run(
            url,
            config.scraperType,
            JSON.stringify(config.parameters),
            config.priority || 10,
            config.enabled !== false ? 1 : 0,
            (err) => {
              if (err) {
                hasError = true;
                this.db!.run('ROLLBACK');
                reject(err);
              }
            }
          );
        }

        stmt.finalize((err) => {
          if (err || hasError) {
            if (!hasError) {
              this.db!.run('ROLLBACK');
              reject(err);
            }
            return;
          }

          this.db!.run('COMMIT', (err) => {
            if (err) {
              reject(err);
              return;
            }
            resolve();
          });
        });
      });
    });
  }

  async getParametersBatch(urls: string[]): Promise<Map<string, ScraperConfiguration>> {
    this.ensureInitialized();

    if (urls.length === 0) {
      return new Map();
    }

    return new Promise((resolve, reject) => {
      const placeholders = urls.map(() => '?').join(',');
      const sql = `
        SELECT url, scraper_type, parameters, priority, enabled
        FROM scraper_parameters
        WHERE url IN (${placeholders})
      `;

      this.db!.all(sql, urls, (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const result: Map<string, ScraperConfiguration> = new Map<string, ScraperConfiguration>();

        for (const row of rows) {
          try {
            const config: ScraperConfiguration = {
              scraperType: row.scraper_type,
              parameters: JSON.parse(row.parameters),
              priority: row.priority,
              enabled: row.enabled === 1
            };
            result.set(row.url, config);
          } catch (parseErr) {
            console.error(`Failed to parse parameters for URL ${row.url}:`, parseErr);
          }
        }

        resolve(result);
      });
    });
  }

  async deleteParameters(url: string): Promise<void> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM scraper_parameters WHERE url = ?';

      this.db!.run(sql, [url], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async deleteParametersBatch(urls: string[]): Promise<void> {
    this.ensureInitialized();

    if (urls.length === 0) {
      return;
    }

    return new Promise((resolve, reject) => {
      const placeholders = urls.map(() => '?').join(',');
      const sql = `DELETE FROM scraper_parameters WHERE url IN (${placeholders})`;

      this.db!.run(sql, urls, (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  async getAllParameters(): Promise<Map<string, ScraperConfiguration>> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT url, scraper_type, parameters, priority, enabled
        FROM scraper_parameters
        ORDER BY priority DESC, url ASC
      `;

      this.db!.all(sql, [], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const result: Map<string, ScraperConfiguration> = new Map<string, ScraperConfiguration>();

        for (const row of rows) {
          try {
            const config: ScraperConfiguration = {
              scraperType: row.scraper_type,
              parameters: JSON.parse(row.parameters),
              priority: row.priority,
              enabled: row.enabled === 1
            };
            result.set(row.url, config);
          } catch (parseErr) {
            console.error(`Failed to parse parameters for URL ${row.url}:`, parseErr);
          }
        }

        resolve(result);
      });
    });
  }

  async getParametersByScraperType(scraperType: string): Promise<Map<string, ScraperConfiguration>> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const sql = `
        SELECT url, scraper_type, parameters, priority, enabled
        FROM scraper_parameters
        WHERE scraper_type = ?
        ORDER BY priority DESC, url ASC
      `;

      this.db!.all(sql, [scraperType], (err, rows: any[]) => {
        if (err) {
          reject(err);
          return;
        }

        const result: Map<string, ScraperConfiguration> = new Map<string, ScraperConfiguration>();

        for (const row of rows) {
          try {
            const config: ScraperConfiguration = {
              scraperType: row.scraper_type,
              parameters: JSON.parse(row.parameters),
              priority: row.priority,
              enabled: row.enabled === 1
            };
            result.set(row.url, config);
          } catch (parseErr) {
            console.error(`Failed to parse parameters for URL ${row.url}:`, parseErr);
          }
        }

        resolve(result);
      });
    });
  }

  /**
   * Get parameter statistics
   */
  async getStatistics(): Promise<{
    total: number;
    byScraperType: Record<string, number>;
    byPriority: Record<number, number>;
  }> {
    this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const queries = {
        total: 'SELECT COUNT(*) as count FROM scraper_parameters',
        byScraperType: `
          SELECT scraper_type, COUNT(*) as count
          FROM scraper_parameters
          GROUP BY scraper_type
        `,
        byPriority: `
          SELECT priority, COUNT(*) as count
          FROM scraper_parameters
          GROUP BY priority
        `
      };

      const results: any = {
        total: 0,
        byScraperType: {},
        byPriority: {}
      };

      // Get total count
      this.db!.get(queries.total, [], (err, row: any) => {
        if (err) {
          reject(err);
          return;
        }
        results.total = row.count;

        // Get counts by scraper type
        this.db!.all(queries.byScraperType, [], (err, rows: any[]) => {
          if (err) {
            reject(err);
            return;
          }
          for (const row of rows) {
            results.byScraperType[row.scraper_type] = row.count;
          }

          // Get counts by priority
          this.db!.all(queries.byPriority, [], (err, rows: any[]) => {
            if (err) {
              reject(err);
              return;
            }
            for (const row of rows) {
              results.byPriority[row.priority] = row.count;
            }

            resolve(results);
          });
        });
      });
    });
  }

  /**
   * Close database connection
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) {
          reject(err);
          return;
        }
        this.db = null;
        this.initialized = false;
        resolve();
      });
    });
  }
}