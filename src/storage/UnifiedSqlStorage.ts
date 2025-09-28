/**
 * Unified SQL storage that manages all tables in a single database
 * Single Responsibility: Manages database connection and schema
 * Open/Closed: Can be extended with new table definitions
 * Interface Segregation: Provides specific repository interfaces
 */

import * as sqlite3 from 'sqlite3';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as crypto from 'crypto';
import { ErrorHandler } from '../utils/ErrorHandler';
import { IKnowledgeStore, KnowledgeEntry, SearchCriteria, StoreStats, ProcessingStatus } from '../interfaces/IKnowledgeStore';
import { IUrlRepository, UrlRecord, UrlMetadata, UrlStatus, UrlFilter } from '../interfaces/IUrlRepository';
import { IOriginalFileRepository, OriginalFileInfo, OriginalFileRecord, FileStatus, ListOriginalFilesOptions, OriginalFileStatistics } from '../interfaces/IOriginalFileRepository';
import { ITagManager } from '../interfaces/ITagManager';
import { IUrlTagRepository } from '../interfaces/IUrlTagRepository';
import { ITag } from '../interfaces/ITag';
import { SqlTagManager } from './SqlTagManager';
import { SqlUrlTagRepository } from './SqlUrlTagRepository';

/**
 * Unified configuration for single database storage
 */
export interface UnifiedStorageConfig {
  dbPath: string;
  enableWAL?: boolean;
  enableForeignKeys?: boolean;
  backupEnabled?: boolean;
}

/**
 * Repository collection interface for unified storage
 */
export interface UnifiedRepositories {
  knowledgeStore: IKnowledgeStore;
  urlRepository: IUrlRepositoryWithTags;
  originalFileRepository: IOriginalFileRepository;
  tagManager: ITagManager;
}

/**
 * Extended URL repository interface with tag support
 */
export interface IUrlRepositoryWithTags extends IUrlRepository {
  registerWithTags(url: string, metadata?: UrlMetadata & { tags?: string[] }): Promise<string>;
  getUrlInfoWithTags(url: string): Promise<(UrlRecord & { tags?: ITag[] }) | null>;
  getUrlsByTags(tagNames: string[], requireAll?: boolean): Promise<(UrlRecord & { tags?: ITag[] })[]>;
}

/**
 * Main unified storage class that creates and manages all repositories
 */
export class UnifiedSqlStorage {
  private db: sqlite3.Database | null = null;
  private readonly config: UnifiedStorageConfig;
  private initPromise: Promise<void> | null = null;

  // Repository instances
  private knowledgeStore: KnowledgeStoreImpl | null = null;
  private urlRepository: UrlRepositoryImpl | null = null;
  private originalFileRepository: OriginalFileRepositoryImpl | null = null;
  private tagManager: SqlTagManager | null = null;
  private urlTagRepository: SqlUrlTagRepository | null = null;

  constructor(config: UnifiedStorageConfig) {
    this.config = {
      enableWAL: true,
      enableForeignKeys: true,
      ...config
    };
  }

  /**
   * Initialize the unified database and all tables
   */
  async initialize(): Promise<void> {
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
      const dir = path.dirname(this.config.dbPath);
      await fs.mkdir(dir, { recursive: true });

      // Open database connection
      await new Promise<void>((resolve, reject) => {
        this.db = new sqlite3.Database(this.config.dbPath, (err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Configure database
      if (this.config.enableForeignKeys) {
        await this.run('PRAGMA foreign_keys = ON');
      }

      if (this.config.enableWAL) {
        try {
          await this.run('PRAGMA journal_mode = WAL');
        } catch (walError) {
          console.warn('Could not enable WAL mode, using default journal mode:', walError);
        }
      }

      // Create all tables with proper foreign key relationships
      await this.createTables();

      // Initialize repository instances
      this.initializeRepositories();

    } catch (error) {
      throw ErrorHandler.createError(
        'UNIFIED_DB_INIT_ERROR',
        'Failed to initialize unified database',
        { dbPath: this.config.dbPath, error }
      );
    }
  }

  /**
   * Create all tables with foreign key relationships
   */
  private async createTables(): Promise<void> {
    // URLs table (primary table)
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

    // Tags table (for categorization)
    await this.run(`
      CREATE TABLE IF NOT EXISTS tags (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        parent_id TEXT,
        description TEXT,
        color TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (parent_id) REFERENCES tags(id) ON DELETE SET NULL
      )
    `);

    // URL-Tag relationship table
    await this.run(`
      CREATE TABLE IF NOT EXISTS url_tags (
        url_id TEXT NOT NULL,
        tag_id TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        PRIMARY KEY (url_id, tag_id),
        FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

    // Knowledge entries table (with foreign key to URLs)
    await this.run(`
      CREATE TABLE IF NOT EXISTS knowledge_entries (
        id TEXT PRIMARY KEY,
        url_id TEXT NOT NULL,
        url TEXT NOT NULL,
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
        FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE CASCADE,
        UNIQUE(url_id, checksum)
      )
    `);

    // Original files table (with foreign key to URLs)
    await this.run(`
      CREATE TABLE IF NOT EXISTS original_files (
        id TEXT PRIMARY KEY,
        url_id TEXT,
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
        download_url TEXT,
        FOREIGN KEY (url_id) REFERENCES urls(id) ON DELETE SET NULL
      )
    `);

    // Create all indices for performance
    await this.createIndices();
  }

  /**
   * Create indices for better query performance
   */
  private async createIndices(): Promise<void> {
    // URL indices
    await this.run('CREATE INDEX IF NOT EXISTS idx_normalized_url ON urls(normalized_url)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_url_content_hash ON urls(content_hash)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_url_status ON urls(status)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_url_first_seen ON urls(first_seen)');

    // Tag indices
    await this.run('CREATE INDEX IF NOT EXISTS idx_tag_name ON tags(name)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_tag_parent ON tags(parent_id)');

    // URL-Tag indices
    await this.run('CREATE INDEX IF NOT EXISTS idx_url_tags_url ON url_tags(url_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_url_tags_tag ON url_tags(tag_id)');

    // Knowledge entry indices
    await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_url_id ON knowledge_entries(url_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_url ON knowledge_entries(url)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_checksum ON knowledge_entries(checksum)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_created ON knowledge_entries(created_at)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_content_type ON knowledge_entries(content_type)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_knowledge_status ON knowledge_entries(processing_status)');

    // Original file indices
    await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_url_id ON original_files(url_id)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_url ON original_files(url)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_status ON original_files(status)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_mime_type ON original_files(mime_type)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_created_at ON original_files(created_at)');
    await this.run('CREATE INDEX IF NOT EXISTS idx_original_files_checksum ON original_files(checksum)');
  }

  /**
   * Initialize repository instances
   */
  private initializeRepositories(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // Initialize core repositories
    this.tagManager = new SqlTagManager(this.db);
    this.urlTagRepository = new SqlUrlTagRepository(this.db, this.tagManager);

    // Initialize implementations with database connection
    this.knowledgeStore = new KnowledgeStoreImpl(this.db);
    this.urlRepository = new UrlRepositoryImpl(this.db, this.tagManager, this.urlTagRepository);
    this.originalFileRepository = new OriginalFileRepositoryImpl(this.db);
  }

  /**
   * Get all repositories
   */
  getRepositories(): UnifiedRepositories {
    if (!this.knowledgeStore || !this.urlRepository || !this.originalFileRepository || !this.tagManager) {
      throw new Error('Storage not initialized. Call initialize() first.');
    }

    return {
      knowledgeStore: this.knowledgeStore,
      urlRepository: this.urlRepository,
      originalFileRepository: this.originalFileRepository,
      tagManager: this.tagManager
    };
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await new Promise<void>((resolve, reject) => {
        this.db!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      this.db = null;
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
}

/**
 * Knowledge Store implementation for unified database
 */
class KnowledgeStoreImpl implements IKnowledgeStore {
  constructor(private db: sqlite3.Database) {}

  async store(entry: KnowledgeEntry): Promise<string> {
    const id = entry.id || crypto.randomUUID();
    const now = Date.now();
    const createdAt = entry.createdAt ? entry.createdAt.getTime() : now;
    const updatedAt = entry.updatedAt ? entry.updatedAt.getTime() : now;

    // Get URL ID from the URL
    const urlId = await this.getUrlId(entry.url);
    if (!urlId) {
      throw new Error(`URL not registered: ${entry.url}`);
    }

    await this.run(
      `INSERT OR REPLACE INTO knowledge_entries
       (id, url_id, url, title, content_type, text, metadata, tags,
        created_at, updated_at, size, checksum, processing_status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, urlId, entry.url, entry.title, entry.contentType, entry.text,
        JSON.stringify(entry.metadata), JSON.stringify(entry.tags),
        createdAt, updatedAt, entry.size, entry.checksum,
        entry.processingStatus || ProcessingStatus.COMPLETED,
        entry.errorMessage || null
      ]
    );

    return id;
  }

  async retrieve(url: string): Promise<KnowledgeEntry | null> {
    const row = await this.get<any>(
      'SELECT * FROM knowledge_entries WHERE url = ?',
      [url]
    );

    if (!row) return null;

    return this.rowToKnowledgeEntry(row);
  }

  async search(criteria: SearchCriteria): Promise<KnowledgeEntry[]> {
    let query = 'SELECT * FROM knowledge_entries WHERE 1=1';
    const params: any[] = [];

    if (criteria.query) {
      query += ' AND (title LIKE ? OR text LIKE ?)';
      const searchTerm = `%${criteria.query}%`;
      params.push(searchTerm, searchTerm);
    }

    if (criteria.contentType) {
      query += ' AND content_type = ?';
      params.push(criteria.contentType);
    }

    if (criteria.tags && criteria.tags.length > 0) {
      const tagConditions = criteria.tags.map(() => 'tags LIKE ?');
      query += ` AND (${tagConditions.join(' OR ')})`;
      criteria.tags.forEach(tag => params.push(`%"${tag}"%`));
    }

    if (criteria.dateRange?.from) {
      query += ' AND created_at >= ?';
      params.push(criteria.dateRange.from.getTime());
    }

    if (criteria.dateRange?.to) {
      query += ' AND created_at <= ?';
      params.push(criteria.dateRange.to.getTime());
    }

    // Add sorting
    const sortField = criteria.sortBy || 'created_at';
    const sortOrder = criteria.sortOrder || 'DESC';
    query += ` ORDER BY ${sortField} ${sortOrder}`;

    // Add pagination
    if (criteria.limit) {
      query += ' LIMIT ?';
      params.push(criteria.limit);

      if (criteria.offset) {
        query += ' OFFSET ?';
        params.push(criteria.offset);
      }
    }

    const rows = await this.all<any>(query, params);
    return rows.map(row => this.rowToKnowledgeEntry(row));
  }

  async update(url: string, updates: Partial<KnowledgeEntry>): Promise<boolean> {
    const setClause: string[] = [];
    const params: any[] = [];

    if (updates.title !== undefined) {
      setClause.push('title = ?');
      params.push(updates.title);
    }

    if (updates.text !== undefined) {
      setClause.push('text = ?');
      params.push(updates.text);
    }

    if (updates.metadata !== undefined) {
      setClause.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (updates.tags !== undefined) {
      setClause.push('tags = ?');
      params.push(JSON.stringify(updates.tags));
    }

    if (updates.processingStatus !== undefined) {
      setClause.push('processing_status = ?');
      params.push(updates.processingStatus);
    }

    if (setClause.length === 0) return false;

    setClause.push('updated_at = ?');
    params.push(Date.now());

    params.push(url);

    await this.run(
      `UPDATE knowledge_entries SET ${setClause.join(', ')} WHERE url = ?`,
      params
    );

    return true;
  }

  async delete(url: string): Promise<boolean> {
    await this.run(
      'DELETE FROM knowledge_entries WHERE url = ?',
      [url]
    );
    return true;
  }

  async exists(url: string): Promise<boolean> {
    const row = await this.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM knowledge_entries WHERE url = ?',
      [url]
    );
    return (row?.count || 0) > 0;
  }

  async getStats(): Promise<StoreStats> {
    const stats = await this.get<{
      totalEntries: number;
      totalSize: number;
    }>(`
      SELECT
        COUNT(*) as totalEntries,
        SUM(size) as totalSize
      FROM knowledge_entries
    `);

    const byType = await this.all<{
      content_type: string;
      count: number;
    }>(`
      SELECT content_type, COUNT(*) as count
      FROM knowledge_entries
      GROUP BY content_type
    `);

    const contentTypes: Record<string, number> = {};
    byType.forEach(row => {
      contentTypes[row.content_type] = row.count;
    });

    return {
      totalEntries: stats?.totalEntries || 0,
      totalSize: stats?.totalSize || 0,
      contentTypes,
      processingStatus: {
        [ProcessingStatus.PENDING]: 0,
        [ProcessingStatus.PROCESSING]: 0,
        [ProcessingStatus.COMPLETED]: stats?.totalEntries || 0,
        [ProcessingStatus.FAILED]: 0
      }
    };
  }

  async clear(): Promise<void> {
    await this.run('DELETE FROM knowledge_entries');
  }

  private async getUrlId(url: string): Promise<string | null> {
    const row = await this.get<{ id: string }>(
      'SELECT id FROM urls WHERE url = ? OR normalized_url = ?',
      [url, this.normalizeUrl(url)]
    );
    return row?.id || null;
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Sort query parameters for consistent comparison
      const sortedParams = Array.from(urlObj.searchParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));
      urlObj.search = new URLSearchParams(sortedParams).toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private rowToKnowledgeEntry(row: any): KnowledgeEntry {
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
      processingStatus: row.processing_status,
      errorMessage: row.error_message
    };
  }

  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  private all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows as T[]) || []);
      });
    });
  }
}

/**
 * URL Repository implementation for unified database with tag support
 */
class UrlRepositoryImpl implements IUrlRepositoryWithTags {
  constructor(
    private db: sqlite3.Database,
    private tagManager: ITagManager,
    private urlTagRepository: IUrlTagRepository
  ) {}

  async register(url: string, metadata?: UrlMetadata): Promise<string> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const normalizedUrl = this.normalizeUrl(url);

    // Check if URL already exists
    const existing = await this.get<{ id: string }>(
      'SELECT id FROM urls WHERE normalized_url = ?',
      [normalizedUrl]
    );

    if (existing) {
      return existing.id;
    }

    await this.run(
      `INSERT INTO urls (id, url, normalized_url, content_hash, status, first_seen, last_checked, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, url, normalizedUrl, null,
        UrlStatus.PENDING, now, now,
        JSON.stringify(metadata || {})
      ]
    );

    return id;
  }

  async registerWithTags(url: string, metadata?: UrlMetadata & { tags?: string[] }): Promise<string> {
    const tags = metadata?.tags || [];
    const metadataWithoutTags = { ...metadata };
    delete (metadataWithoutTags as any).tags;

    const urlId = await this.register(url, metadataWithoutTags);

    if (tags.length > 0) {
      const tagIds = await this.tagManager.ensureTagsExist(tags);
      await this.urlTagRepository.addTagsToUrl(urlId, tagIds);
    }

    return urlId;
  }

  async getUrlInfo(url: string): Promise<UrlRecord | null> {
    const normalizedUrl = this.normalizeUrl(url);
    const row = await this.get<any>(
      'SELECT * FROM urls WHERE url = ? OR normalized_url = ?',
      [url, normalizedUrl]
    );

    if (!row) return null;

    return this.rowToUrlRecord(row);
  }

  async getUrlInfoWithTags(url: string): Promise<(UrlRecord & { tags?: ITag[] }) | null> {
    const urlInfo = await this.getUrlInfo(url);
    if (!urlInfo) return null;

    const tags = await this.urlTagRepository.getTagsForUrl(urlInfo.id);
    return {
      ...urlInfo,
      tags
    };
  }

  async getUrlsByTags(tagNames: string[], requireAll: boolean = false): Promise<(UrlRecord & { tags?: ITag[] })[]> {
    const urlIds = await this.urlTagRepository.getUrlsWithTagNames(tagNames, requireAll);
    const urls: (UrlRecord & { tags?: ITag[] })[] = [];

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
  }

  async getUrlById(id: string): Promise<UrlRecord | null> {
    const row = await this.get<any>(
      'SELECT * FROM urls WHERE id = ?',
      [id]
    );

    if (!row) return null;

    return this.rowToUrlRecord(row);
  }

  async updateStatus(url: string, status: UrlStatus, errorMessage?: string): Promise<boolean> {
    const normalizedUrl = this.normalizeUrl(url);
    await this.run(
      `UPDATE urls SET status = ?, error_message = ?, last_checked = ?
       WHERE url = ? OR normalized_url = ?`,
      [status, errorMessage || null, Date.now(), url, normalizedUrl]
    );
    return true;
  }

  async updateContentHash(url: string, newHash: string): Promise<boolean> {
    const normalizedUrl = this.normalizeUrl(url);
    const now = Date.now();

    // Get current hash
    const current = await this.get<{ content_hash: string | null }>(
      'SELECT content_hash FROM urls WHERE url = ? OR normalized_url = ?',
      [url, normalizedUrl]
    );

    if (!current) return false;

    // Update with new hash and track change
    await this.run(
      `UPDATE urls
       SET content_hash = ?, previous_hash = ?, last_content_change = ?,
           content_version = content_version + 1, last_checked = ?
       WHERE url = ? OR normalized_url = ?`,
      [newHash, current.content_hash, now, now, url, normalizedUrl]
    );

    return true;
  }

  async isDuplicate(url: string): Promise<boolean> {
    const normalizedUrl = this.normalizeUrl(url);
    const row = await this.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM urls WHERE normalized_url = ?',
      [normalizedUrl]
    );
    return (row?.count || 0) > 0;
  }

  async hasContentChanged(url: string, currentHash: string): Promise<boolean> {
    const normalizedUrl = this.normalizeUrl(url);
    const row = await this.get<{ content_hash: string | null }>(
      'SELECT content_hash FROM urls WHERE url = ? OR normalized_url = ?',
      [url, normalizedUrl]
    );

    if (!row || !row.content_hash) return true;
    return row.content_hash !== currentHash;
  }

  async listUrls(filter?: UrlFilter): Promise<UrlRecord[]> {
    let query = 'SELECT * FROM urls WHERE 1=1';
    const params: any[] = [];

    if (filter) {
      if (filter.status) {
        query += ' AND status = ?';
        params.push(filter.status);
      }

      if (filter.since) {
        query += ' AND first_seen >= ?';
        params.push(filter.since.getTime());
      }

      if (filter.contentType) {
        query += ' AND json_extract(metadata, "$.contentType") = ?';
        params.push(filter.contentType);
      }
    }

    query += ' ORDER BY last_checked DESC';

    if (filter?.limit) {
      query += ' LIMIT ?';
      params.push(filter.limit);
    }

    const rows = await this.all<any>(query, params);
    return rows.map(row => this.rowToUrlRecord(row));
  }

  async exists(url: string): Promise<boolean> {
    const normalizedUrl = this.normalizeUrl(url);
    const row = await this.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM urls WHERE url = ? OR normalized_url = ?',
      [url, normalizedUrl]
    );
    return (row?.count || 0) > 0;
  }

  async getByHash(hash: string): Promise<UrlRecord | null> {
    const row = await this.get<any>(
      'SELECT * FROM urls WHERE content_hash = ?',
      [hash]
    );
    if (!row) return null;
    return this.rowToUrlRecord(row);
  }

  async list(filter?: UrlFilter): Promise<UrlRecord[]> {
    return this.listUrls(filter);
  }

  async remove(id: string): Promise<boolean> {
    await this.run('DELETE FROM urls WHERE id = ?', [id]);
    return true;
  }

  async updateHash(id: string, contentHash: string): Promise<boolean> {
    await this.run(
      'UPDATE urls SET content_hash = ?, last_checked = ? WHERE id = ?',
      [contentHash, Date.now(), id]
    );
    return true;
  }

  async clear(): Promise<void> {
    await this.run('DELETE FROM urls');
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sortedParams = Array.from(urlObj.searchParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));
      urlObj.search = new URLSearchParams(sortedParams).toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private rowToUrlRecord(row: any): UrlRecord {
    return {
      id: row.id,
      url: row.url,
      normalizedUrl: row.normalized_url,
      contentHash: row.content_hash,
      status: row.status,
      errorMessage: row.error_message,
      firstSeen: new Date(row.first_seen),
      lastChecked: new Date(row.last_checked),
      processCount: row.process_count,
      metadata: JSON.parse(row.metadata)
    };
  }

  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  private all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows as T[]) || []);
      });
    });
  }
}

/**
 * Original File Repository implementation for unified database
 */
class OriginalFileRepositoryImpl implements IOriginalFileRepository {
  constructor(private db: sqlite3.Database) {}

  async initialize(): Promise<void> {
    // Database is already initialized by UnifiedSqlStorage
    return Promise.resolve();
  }

  async recordOriginalFile(fileInfo: OriginalFileInfo): Promise<string> {
    const id = `file_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const now = Date.now();

    // Get URL ID if URL is provided
    let urlId: string | null = null;
    if (fileInfo.url) {
      const urlRow = await this.get<{ id: string }>(
        'SELECT id FROM urls WHERE url = ? OR normalized_url = ?',
        [fileInfo.url, this.normalizeUrl(fileInfo.url)]
      );
      urlId = urlRow?.id || null;
    }

    const downloadUrl = `/api/files/original/${id}/download`;

    await this.run(
      `INSERT INTO original_files
       (id, url_id, url, file_path, mime_type, size, checksum, scraper_used,
        status, metadata, created_at, updated_at, download_url)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, urlId, fileInfo.url, fileInfo.filePath, fileInfo.mimeType,
        fileInfo.size, fileInfo.checksum, fileInfo.scraperUsed || null,
        FileStatus.ACTIVE,
        JSON.stringify(fileInfo.metadata || {}),
        now, now, downloadUrl
      ]
    );

    return id;
  }

  async getOriginalFile(fileId: string): Promise<OriginalFileRecord | null> {
    const row = await this.get<any>(
      'SELECT * FROM original_files WHERE id = ?',
      [fileId]
    );

    if (!row) return null;

    // Update accessed_at
    await this.run(
      'UPDATE original_files SET accessed_at = ? WHERE id = ?',
      [Date.now(), fileId]
    );

    return this.rowToFileRecord(row);
  }

  async getOriginalFilesByUrl(url: string): Promise<OriginalFileRecord[]> {
    const rows = await this.all<any>(
      'SELECT * FROM original_files WHERE url = ? ORDER BY created_at DESC',
      [url]
    );

    return rows.map(row => this.rowToFileRecord(row));
  }

  async updateFileStatus(fileId: string, status: FileStatus): Promise<boolean> {
    await this.run(
      'UPDATE original_files SET status = ?, updated_at = ? WHERE id = ?',
      [status, Date.now(), fileId]
    );
    return true;
  }

  async deleteOriginalFile(fileId: string): Promise<boolean> {
    await this.run(
      'DELETE FROM original_files WHERE id = ?',
      [fileId]
    );
    return true;
  }

  async listOriginalFiles(options?: ListOriginalFilesOptions): Promise<OriginalFileRecord[]> {
    let query = 'SELECT * FROM original_files WHERE 1=1';
    const params: any[] = [];

    if (options) {
      if (options.status) {
        query += ' AND status = ?';
        params.push(options.status);
      }

      if (options.mimeType) {
        query += ' AND mime_type = ?';
        params.push(options.mimeType);
      }

      if (options.scraperUsed) {
        query += ' AND scraper_used = ?';
        params.push(options.scraperUsed);
      }

      if (options.fromDate) {
        query += ' AND created_at >= ?';
        params.push(options.fromDate.getTime());
      }

      if (options.toDate) {
        query += ' AND created_at <= ?';
        params.push(options.toDate.getTime());
      }
    }

    query += ' ORDER BY created_at DESC';

    if (options?.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);

      if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
      }
    }

    const rows = await this.all<any>(query, params);
    return rows.map(row => this.rowToFileRecord(row));
  }

  async getStatistics(): Promise<OriginalFileStatistics> {
    const stats = await this.get<{
      totalFiles: number;
      totalSize: number;
      uniqueUrls: number;
    }>(`
      SELECT
        COUNT(*) as totalFiles,
        SUM(size) as totalSize,
        COUNT(DISTINCT url) as uniqueUrls
      FROM original_files
      WHERE status = 'active'
    `);

    const byType = await this.all<{
      mime_type: string;
      count: number;
      total_size: number;
    }>(`
      SELECT mime_type, COUNT(*) as count, SUM(size) as total_size
      FROM original_files
      WHERE status = 'active'
      GROUP BY mime_type
    `);

    const byStatus = await this.all<{
      status: string;
      count: number;
    }>(`
      SELECT status, COUNT(*) as count
      FROM original_files
      GROUP BY status
    `);

    const byScraper = await this.all<{
      scraper_used: string;
      count: number;
    }>(`
      SELECT scraper_used, COUNT(*) as count
      FROM original_files
      WHERE scraper_used IS NOT NULL
      GROUP BY scraper_used
    `);

    const averageFileSize = stats && stats.totalFiles > 0
      ? Math.round(stats.totalSize / stats.totalFiles)
      : 0;

    return {
      totalFiles: stats?.totalFiles || 0,
      totalSize: stats?.totalSize || 0,
      filesByStatus: byStatus.reduce((acc, row) => {
        acc[row.status] = row.count;
        return acc;
      }, {} as Record<string, number>),
      filesByMimeType: byType.reduce((acc, row) => {
        acc[row.mime_type] = row.count;
        return acc;
      }, {} as Record<string, number>),
      filesByScraperUsed: byScraper.reduce((acc, row) => {
        acc[row.scraper_used] = row.count;
        return acc;
      }, {} as Record<string, number>),
      averageFileSize
    };
  }

  async cleanupOldFiles(olderThanDays: number): Promise<number> {
    const cutoffTime = Date.now() - (olderThanDays * 24 * 60 * 60 * 1000);

    const result = await this.get<{ count: number }>(
      'SELECT COUNT(*) as count FROM original_files WHERE created_at < ? AND status = ?',
      [cutoffTime, FileStatus.ACTIVE]
    );

    await this.run(
      'UPDATE original_files SET status = ? WHERE created_at < ? AND status = ?',
      [FileStatus.DELETED, cutoffTime, FileStatus.ACTIVE]
    );

    return result?.count || 0;
  }

  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const sortedParams = Array.from(urlObj.searchParams.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));
      urlObj.search = new URLSearchParams(sortedParams).toString();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  private rowToFileRecord(row: any): OriginalFileRecord {
    return {
      id: row.id,
      url: row.url,
      filePath: row.file_path,
      mimeType: row.mime_type,
      size: row.size,
      checksum: row.checksum,
      scraperUsed: row.scraper_used,
      status: row.status,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessedAt: row.accessed_at ? new Date(row.accessed_at) : undefined,
      downloadUrl: row.download_url
    };
  }

  private run(sql: string, params: any[] = []): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  private get<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  private all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve((rows as T[]) || []);
      });
    });
  }
}