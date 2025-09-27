/**
 * SQL-based implementation of IKnowledgeStore using SQLite
 * Single Responsibility: Manages knowledge entries in SQL database
 * Open/Closed: Extends BaseKnowledgeStore, closed for modification
 */

import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import {
  KnowledgeEntry,
  SearchCriteria,
  StoreStats,
  ProcessingStatus,
  SortField,
  SortOrder
} from '../interfaces/IKnowledgeStore';
import { BaseKnowledgeStore } from './BaseKnowledgeStore';
import { ErrorHandler } from '../utils/ErrorHandler';

export class SqlKnowledgeStore extends BaseKnowledgeStore {
  private db: sqlite3.Database | null = null;
  private readonly dbPath: string;
  private initPromise: Promise<void> | null = null;

  constructor(dbPath: string = './data/knowledge.db') {
    super();
    this.dbPath = dbPath;
  }

  /**
   * Initializes the SQLite database and creates tables if needed
   */
  private async initialize(): Promise<void> {
    if (this.db) return;

    if (this.initPromise) {
      await this.initPromise;
      return;
    }

    this.initPromise = this._performInitialization();
    await this.initPromise;
  }

  private async _performInitialization(): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      // Open database connection
      await new Promise<void>((resolve, reject) => {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) reject(err);
          else resolve();
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

    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        'Failed to initialize SQL database',
        { dbPath: this.dbPath, error }
      );
    }
  }

  /**
   * Helper method to run SQL queries
   */
  private async run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Helper method to get single row
   */
  private async get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  /**
   * Helper method to get multiple rows
   */
  private async all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows as T[]) || []);
      });
    });
  }

  async store(entry: KnowledgeEntry): Promise<string> {
    await this.initialize();

    try {
      // Validate entry
      this.validateEntry(entry);

      // Check for duplicate URL + checksum
      const existing = await this.get<{ id: string }>(
        'SELECT id FROM knowledge_entries WHERE url = ? AND checksum = ?',
        [entry.url, entry.checksum]
      );

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
      await this.run(
        `INSERT INTO knowledge_entries
         (id, url, title, content_type, text, metadata, tags, created_at,
          updated_at, size, checksum, processing_status, error_message)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
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
        ]
      );

      return entry.id;
    } catch (error) {
      throw ErrorHandler.createError(
        'STORAGE_ERROR',
        'Failed to store knowledge entry',
        { entryId: entry.id, error }
      );
    }
  }

  async retrieve(id: string): Promise<KnowledgeEntry | null> {
    await this.initialize();

    try {
      const row = await this.get<any>(
        'SELECT * FROM knowledge_entries WHERE id = ?',
        [id]
      );

      if (!row) return null;

      return this.rowToEntry(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'RETRIEVAL_ERROR',
        'Failed to retrieve knowledge entry',
        { entryId: id, error }
      );
    }
  }

  async search(criteria: SearchCriteria): Promise<KnowledgeEntry[]> {
    await this.initialize();

    try {
      let sql = 'SELECT * FROM knowledge_entries WHERE 1=1';
      const params: any[] = [];

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
      const sortField = this.mapSortField(criteria.sortBy || SortField.CREATED_AT);
      const sortOrder = criteria.sortOrder === SortOrder.ASC ? 'ASC' : 'DESC';
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

      const rows = await this.all<any>(sql, params);
      return rows.map(row => this.rowToEntry(row));

    } catch (error) {
      throw ErrorHandler.createError(
        'SEARCH_ERROR',
        'Failed to search knowledge entries',
        { criteria, error }
      );
    }
  }

  async update(id: string, updates: Partial<KnowledgeEntry>): Promise<boolean> {
    await this.initialize();

    try {
      const setClauses: string[] = [];
      const params: any[] = [];

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
    } catch (error) {
      throw ErrorHandler.createError(
        'UPDATE_ERROR',
        'Failed to update knowledge entry',
        { entryId: id, error }
      );
    }
  }

  async delete(id: string): Promise<boolean> {
    await this.initialize();

    try {
      await this.run('DELETE FROM knowledge_entries WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw ErrorHandler.createError(
        'DELETE_ERROR',
        'Failed to delete knowledge entry',
        { entryId: id, error }
      );
    }
  }

  async getStats(): Promise<StoreStats> {
    await this.initialize();

    try {
      const stats: StoreStats = {
        totalEntries: 0,
        totalSize: 0,
        contentTypes: {},
        processingStatus: {
          [ProcessingStatus.PENDING]: 0,
          [ProcessingStatus.PROCESSING]: 0,
          [ProcessingStatus.COMPLETED]: 0,
          [ProcessingStatus.FAILED]: 0
        }
      };

      // Get total entries and size
      const totals = await this.get<{ count: number; totalSize: number }>(
        'SELECT COUNT(*) as count, SUM(size) as totalSize FROM knowledge_entries',
        []
      );

      if (totals) {
        stats.totalEntries = totals.count;
        stats.totalSize = totals.totalSize || 0;
      }

      // Get content type distribution
      const contentTypes = await this.all<{ content_type: string; count: number }>(
        'SELECT content_type, COUNT(*) as count FROM knowledge_entries GROUP BY content_type',
        []
      );

      contentTypes.forEach(row => {
        stats.contentTypes[row.content_type] = row.count;
      });

      // Get processing status distribution
      const statuses = await this.all<{ processing_status: string; count: number }>(
        'SELECT processing_status, COUNT(*) as count FROM knowledge_entries GROUP BY processing_status',
        []
      );

      statuses.forEach(row => {
        stats.processingStatus[row.processing_status as ProcessingStatus] = row.count;
      });

      // Get date range
      const dates = await this.get<{ oldest: number; newest: number }>(
        'SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM knowledge_entries',
        []
      );

      if (dates) {
        stats.oldestEntry = dates.oldest ? new Date(dates.oldest) : undefined;
        stats.newestEntry = dates.newest ? new Date(dates.newest) : undefined;
      }

      return stats;
    } catch (error) {
      throw ErrorHandler.createError(
        'STATS_ERROR',
        'Failed to get store statistics',
        { error }
      );
    }
  }

  /**
   * Checks if a URL already exists in the store
   */
  async urlExists(url: string): Promise<boolean> {
    await this.initialize();

    try {
      const result = await this.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM knowledge_entries WHERE url = ?',
        [url]
      );

      return result ? result.count > 0 : false;
    } catch (error) {
      throw ErrorHandler.createError(
        'URL_CHECK_ERROR',
        'Failed to check URL existence',
        { url, error }
      );
    }
  }

  /**
   * Gets entry by URL
   */
  async getByUrl(url: string): Promise<KnowledgeEntry | null> {
    await this.initialize();

    try {
      const row = await this.get<any>(
        'SELECT * FROM knowledge_entries WHERE url = ? ORDER BY updated_at DESC LIMIT 1',
        [url]
      );

      if (!row) return null;

      return this.rowToEntry(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'URL_RETRIEVAL_ERROR',
        'Failed to retrieve entry by URL',
        { url, error }
      );
    }
  }

  /**
   * Closes the database connection
   */
  async close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      this.db.close((err) => {
        if (err) reject(err);
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
  private rowToEntry(row: any): KnowledgeEntry {
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
      processingStatus: row.processing_status as ProcessingStatus,
      errorMessage: row.error_message || undefined
    };
  }

  /**
   * Maps SortField enum to database column name
   */
  private mapSortField(field: SortField): string {
    switch (field) {
      case SortField.CREATED_AT:
        return 'created_at';
      case SortField.UPDATED_AT:
        return 'updated_at';
      case SortField.TITLE:
        return 'title';
      case SortField.SIZE:
        return 'size';
      default:
        return 'created_at';
    }
  }
}