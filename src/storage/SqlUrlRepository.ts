/**
 * SQL-based implementation of IUrlRepository using SQLite
 * Single Responsibility: Manages URL tracking and duplicate detection
 * Dependency Inversion: Depends on IUrlRepository abstraction
 */

import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import {
  IUrlRepository,
  UrlRecord,
  UrlMetadata,
  UrlStatus,
  UrlFilter
} from '../interfaces/IUrlRepository';
import { ErrorHandler } from '../utils/ErrorHandler';
import { SqlTagManager } from './SqlTagManager';
import { SqlUrlTagRepository } from './SqlUrlTagRepository';
import { IUrlTagRepository } from '../interfaces/IUrlTagRepository';
import { ITagManager } from '../interfaces/ITagManager';
import { ITag } from '../interfaces/ITag';

export interface UrlMetadataWithTags extends UrlMetadata {
  tags?: string[];
}

export interface UrlRecordWithTags extends Omit<UrlRecord, 'tags'> {
  tags?: ITag[];
}

export class SqlUrlRepository implements IUrlRepository {
  private db: sqlite3.Database | null = null;
  private readonly dbPath: string;
  private initPromise: Promise<void> | null = null;

  // Tag support (optional)
  private tagManager: SqlTagManager | null = null;
  private urlTagRepository: SqlUrlTagRepository | null = null;
  private readonly tagsEnabled: boolean;

  constructor(dbPath: string = './data/urls.db', enableTags: boolean = false) {
    this.dbPath = dbPath;
    this.tagsEnabled = enableTags;
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

      // Initialize tag support if enabled
      if (this.tagsEnabled) {
        await this.initializeTags();
      }

    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        'Failed to initialize URL repository database',
        { dbPath: this.dbPath, error }
      );
    }
  }

  /**
   * Initialize tag support
   */
  private async initializeTags(): Promise<void> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Initialize tag manager and URL-tag repository
      this.tagManager = new SqlTagManager(this.db);
      await this.tagManager.initialize();

      this.urlTagRepository = new SqlUrlTagRepository(this.db, this.tagManager);
      await this.urlTagRepository.initialize();
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_INIT_ERROR',
        'Failed to initialize tag support',
        { error }
      );
    }
  }

  /**
   * Initialize repository with tag support (legacy compatibility)
   */
  async initializeWithTags(): Promise<void> {
    await this.initialize();
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

  async exists(url: string): Promise<boolean> {
    await this.initialize();

    try {
      const normalizedUrl = this.normalizeUrl(url);
      const result = await this.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM urls WHERE normalized_url = ?',
        [normalizedUrl]
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

  async register(url: string, metadata?: UrlMetadata): Promise<string> {
    await this.initialize();

    try {
      const normalizedUrl = this.normalizeUrl(url);

      // Check if URL already exists
      const existing = await this.get<{ id: string }>(
        'SELECT id FROM urls WHERE normalized_url = ?',
        [normalizedUrl]
      );

      if (existing) {
        // Update existing record
        await this.run(
          `UPDATE urls SET
            last_checked = ?,
            process_count = process_count + 1,
            metadata = ?
          WHERE id = ?`,
          [Date.now(), JSON.stringify(metadata || {}), existing.id]
        );
        return existing.id;
      }

      // Create new record
      const id = crypto.randomUUID();
      const now = Date.now();

      await this.run(
        `INSERT INTO urls
         (id, url, normalized_url, status, first_seen, last_checked, process_count, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          url,
          normalizedUrl,
          UrlStatus.PENDING,
          now,
          now,
          1,
          JSON.stringify(metadata || {})
        ]
      );

      return id;
    } catch (error) {
      throw ErrorHandler.createError(
        'URL_REGISTRATION_ERROR',
        'Failed to register URL',
        { url, error }
      );
    }
  }

  async updateStatus(id: string, status: UrlStatus, error?: string): Promise<boolean> {
    await this.initialize();

    try {
      await this.run(
        `UPDATE urls SET
          status = ?,
          error_message = ?,
          last_checked = ?
        WHERE id = ?`,
        [status, error || null, Date.now(), id]
      );

      return true;
    } catch (error) {
      throw ErrorHandler.createError(
        'STATUS_UPDATE_ERROR',
        'Failed to update URL status',
        { id, status, error }
      );
    }
  }

  async getUrlInfo(url: string): Promise<UrlRecord | null> {
    await this.initialize();

    try {
      const normalizedUrl = this.normalizeUrl(url);
      const row = await this.get<any>(
        'SELECT * FROM urls WHERE normalized_url = ?',
        [normalizedUrl]
      );

      if (!row) return null;

      return this.rowToRecord(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'URL_INFO_ERROR',
        'Failed to get URL info',
        { url, error }
      );
    }
  }

  async getByHash(hash: string): Promise<UrlRecord | null> {
    await this.initialize();

    try {
      const row = await this.get<any>(
        'SELECT * FROM urls WHERE content_hash = ?',
        [hash]
      );

      if (!row) return null;

      return this.rowToRecord(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'HASH_LOOKUP_ERROR',
        'Failed to get URL by hash',
        { hash, error }
      );
    }
  }

  async list(filter?: UrlFilter): Promise<UrlRecord[]> {
    await this.initialize();

    try {
      let sql = 'SELECT * FROM urls WHERE 1=1';
      const params: any[] = [];

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

      const rows = await this.all<any>(sql, params);
      return rows.map(row => this.rowToRecord(row));

    } catch (error) {
      throw ErrorHandler.createError(
        'URL_LIST_ERROR',
        'Failed to list URLs',
        { filter, error }
      );
    }
  }

  async remove(id: string): Promise<boolean> {
    await this.initialize();

    try {
      await this.run('DELETE FROM urls WHERE id = ?', [id]);
      return true;
    } catch (error) {
      throw ErrorHandler.createError(
        'URL_REMOVAL_ERROR',
        'Failed to remove URL',
        { id, error }
      );
    }
  }

  /**
   * Updates the content hash for a URL and tracks content changes
   */
  async updateHash(id: string, contentHash: string): Promise<boolean> {
    await this.initialize();

    try {
      // First get the current hash to track changes
      const current = await this.get<{ content_hash: string | null; content_version: number }>(
        'SELECT content_hash, content_version FROM urls WHERE id = ?',
        [id]
      );

      if (current) {
        const hasChanged = current.content_hash !== null && current.content_hash !== contentHash;
        const newVersion = hasChanged ? (current.content_version + 1) : current.content_version;

        // Update with tracking of previous hash and version increment if changed
        await this.run(
          `UPDATE urls SET
           content_hash = ?,
           previous_hash = CASE WHEN ? THEN content_hash ELSE previous_hash END,
           last_content_change = CASE WHEN ? THEN ? ELSE last_content_change END,
           content_version = ?,
           last_checked = ?
           WHERE id = ?`,
          [contentHash, hasChanged, hasChanged, Date.now(), newVersion, Date.now(), id]
        );
      } else {
        // Fallback to simple update if record not found
        await this.run(
          'UPDATE urls SET content_hash = ?, last_checked = ? WHERE id = ?',
          [contentHash, Date.now(), id]
        );
      }
      return true;
    } catch (error) {
      throw ErrorHandler.createError(
        'HASH_UPDATE_ERROR',
        'Failed to update content hash',
        { id, contentHash, error }
      );
    }
  }

  async updateMetadata(id: string, metadata: Partial<UrlMetadata>): Promise<boolean> {
    await this.initialize();

    try {
      // Get existing metadata first
      const existing = await this.get<{ metadata: string }>(
        'SELECT metadata FROM urls WHERE id = ?',
        [id]
      );

      if (!existing) {
        return false;
      }

      // Merge existing metadata with new metadata
      const existingMetadata = JSON.parse(existing.metadata || '{}');
      const mergedMetadata = { ...existingMetadata, ...metadata };

      // Update metadata in database
      await this.run(
        'UPDATE urls SET metadata = ?, last_checked = ? WHERE id = ?',
        [JSON.stringify(mergedMetadata), Date.now(), id]
      );

      return true;
    } catch (error) {
      throw ErrorHandler.createError(
        'METADATA_UPDATE_ERROR',
        'Failed to update URL metadata',
        { id, metadata, error }
      );
    }
  }

  /**
   * Checks if content with given hash already exists
   */
  async hashExists(hash: string): Promise<boolean> {
    await this.initialize();

    try {
      const result = await this.get<{ count: number }>(
        'SELECT COUNT(*) as count FROM urls WHERE content_hash = ?',
        [hash]
      );

      return result ? result.count > 0 : false;
    } catch (error) {
      throw ErrorHandler.createError(
        'HASH_CHECK_ERROR',
        'Failed to check hash existence',
        { hash, error }
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
   * Normalizes URL for consistent comparison
   */
  private normalizeUrl(url: string): string {
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
    } catch (error) {
      // If URL parsing fails, just return lowercase version
      return url.toLowerCase();
    }
  }

  /**
   * Register a URL with optional tags
   */
  async registerWithTags(url: string, metadata?: UrlMetadataWithTags): Promise<string> {
    try {
      // Extract tags from metadata
      const tags = metadata?.tags || [];
      const metadataWithoutTags = { ...metadata };
      delete metadataWithoutTags.tags;

      // Register the URL using base method
      const urlId = await this.register(url, metadataWithoutTags);

      // Add tags if provided and tags are enabled
      if (tags.length > 0 && this.tagsEnabled && this.tagManager && this.urlTagRepository) {
        const tagIds = await this.tagManager.ensureTagsExist(tags);
        await this.urlTagRepository.addTagsToUrl(urlId, tagIds);
      }

      return urlId;
    } catch (error) {
      throw ErrorHandler.createError(
        'URL_REGISTER_WITH_TAGS_ERROR',
        'Failed to register URL with tags',
        { url, metadata, error }
      );
    }
  }

  /**
   * Get URL info with tags
   */
  async getUrlInfoWithTags(url: string): Promise<UrlRecordWithTags | null> {
    try {
      const urlInfo = await this.getUrlInfo(url);
      if (!urlInfo) return null;

      if (this.tagsEnabled && this.urlTagRepository) {
        const tags = await this.urlTagRepository.getTagsForUrl(urlInfo.id);
        const { tags: _, ...urlInfoWithoutTags } = urlInfo;
        return {
          ...urlInfoWithoutTags,
          tags
        };
      }

      // Convert to UrlRecordWithTags format (without ITag[] tags)
      const { tags: _, ...urlInfoWithoutTags } = urlInfo;
      return {
        ...urlInfoWithoutTags,
        tags: undefined
      };
    } catch (error) {
      throw ErrorHandler.createError(
        'URL_INFO_WITH_TAGS_ERROR',
        'Failed to get URL info with tags',
        { url, error }
      );
    }
  }

  /**
   * Get URLs by tag names
   */
  async getUrlsByTags(tagNames: string[], requireAll: boolean = false): Promise<UrlRecordWithTags[]> {
    if (!this.tagsEnabled || !this.urlTagRepository) {
      return [];
    }

    try {
      const urlIds = await this.urlTagRepository.getUrlsWithTagNames(tagNames, requireAll);
      const urls: UrlRecordWithTags[] = [];

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
    } catch (error) {
      throw ErrorHandler.createError(
        'GET_URLS_BY_TAGS_ERROR',
        'Failed to get URLs by tags',
        { tagNames, requireAll, error }
      );
    }
  }

  /**
   * Add tags to an existing URL
   */
  async addTagsToUrl(url: string, tagNames: string[]): Promise<boolean> {
    if (!this.tagsEnabled || !this.tagManager || !this.urlTagRepository) {
      return false;
    }

    try {
      const urlInfo = await this.getUrlInfo(url);
      if (!urlInfo) {
        throw ErrorHandler.createError(
          'URL_NOT_FOUND',
          'URL not found in repository',
          { url }
        );
      }

      const tagIds = await this.tagManager.ensureTagsExist(tagNames);
      return await this.urlTagRepository.addTagsToUrl(urlInfo.id, tagIds);
    } catch (error) {
      throw ErrorHandler.createError(
        'ADD_TAGS_TO_URL_ERROR',
        'Failed to add tags to URL',
        { url, tagNames, error }
      );
    }
  }

  /**
   * Remove tags from an existing URL
   */
  async removeTagsFromUrl(url: string, tagNames: string[]): Promise<boolean> {
    if (!this.tagsEnabled || !this.tagManager || !this.urlTagRepository) {
      return false;
    }

    try {
      const urlInfo = await this.getUrlInfo(url);
      if (!urlInfo) {
        throw ErrorHandler.createError(
          'URL_NOT_FOUND',
          'URL not found in repository',
          { url }
        );
      }

      const tagIds: string[] = [];
      for (const name of tagNames) {
        const tag = await this.tagManager.getTagByName(name);
        if (tag) {
          tagIds.push(tag.id);
        }
      }

      return await this.urlTagRepository.removeTagsFromUrl(urlInfo.id, tagIds);
    } catch (error) {
      throw ErrorHandler.createError(
        'REMOVE_TAGS_FROM_URL_ERROR',
        'Failed to remove tags from URL',
        { url, tagNames, error }
      );
    }
  }

  /**
   * Set tags for a URL (replaces existing tags)
   */
  async setUrlTags(url: string, tagNames: string[]): Promise<boolean> {
    if (!this.tagsEnabled || !this.tagManager || !this.urlTagRepository) {
      return false;
    }

    try {
      const urlInfo = await this.getUrlInfo(url);
      if (!urlInfo) {
        throw ErrorHandler.createError(
          'URL_NOT_FOUND',
          'URL not found in repository',
          { url }
        );
      }

      const tagIds = await this.tagManager.ensureTagsExist(tagNames);
      return await this.urlTagRepository.setTagsForUrl(urlInfo.id, tagIds);
    } catch (error) {
      throw ErrorHandler.createError(
        'SET_URL_TAGS_ERROR',
        'Failed to set URL tags',
        { url, tagNames, error }
      );
    }
  }

  /**
   * Get tags for a URL
   */
  async getUrlTags(url: string): Promise<ITag[]> {
    if (!this.tagsEnabled || !this.urlTagRepository) {
      return [];
    }

    try {
      const urlInfo = await this.getUrlInfo(url);
      if (!urlInfo) {
        return [];
      }

      return await this.urlTagRepository.getTagsForUrl(urlInfo.id);
    } catch (error) {
      throw ErrorHandler.createError(
        'GET_URL_TAGS_ERROR',
        'Failed to get URL tags',
        { url, error }
      );
    }
  }

  /**
   * Batch register URLs with tags
   */
  async batchRegisterWithTags(
    urlsWithTags: Array<{ url: string; tags?: string[]; metadata?: UrlMetadata }>
  ): Promise<string[]> {
    try {
      const urlIds: string[] = [];

      for (const item of urlsWithTags) {
        const metadata: UrlMetadataWithTags = {
          ...item.metadata,
          tags: item.tags
        };
        const urlId = await this.registerWithTags(item.url, metadata);
        urlIds.push(urlId);
      }

      return urlIds;
    } catch (error) {
      throw ErrorHandler.createError(
        'BATCH_REGISTER_WITH_TAGS_ERROR',
        'Failed to batch register URLs with tags',
        { urlsWithTags, error }
      );
    }
  }

  /**
   * Get URL record by ID (helper method)
   */
  private async getUrlById(id: string): Promise<UrlRecord | null> {
    try {
      const row = await this.get<any>(
        'SELECT * FROM urls WHERE id = ?',
        [id]
      );

      if (!row) return null;

      return this.rowToRecord(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'GET_URL_BY_ID_ERROR',
        'Failed to get URL by ID',
        { id, error }
      );
    }
  }

  /**
   * Get tag manager for external use
   */
  getTagManager(): ITagManager | null {
    return this.tagManager;
  }

  /**
   * Get URL-tag repository for external use
   */
  getUrlTagRepository(): IUrlTagRepository | null {
    return this.urlTagRepository;
  }

  /**
   * Check if tags are enabled
   */
  areTagsEnabled(): boolean {
    return this.tagsEnabled;
  }

  /**
   * Converts database row to UrlRecord
   */
  private rowToRecord(row: any): UrlRecord {
    return {
      id: row.id,
      url: row.url,
      normalizedUrl: row.normalized_url,
      contentHash: row.content_hash || undefined,
      status: row.status as UrlStatus,
      errorMessage: row.error_message || undefined,
      firstSeen: new Date(row.first_seen),
      lastChecked: new Date(row.last_checked),
      processCount: row.process_count,
      metadata: JSON.parse(row.metadata)
    };
  }
}