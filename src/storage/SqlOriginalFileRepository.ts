/**
 * SQL implementation of IOriginalFileRepository
 * Single Responsibility: Only manages original file records in SQL database
 */

import * as sqlite3 from 'sqlite3';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  IOriginalFileRepository,
  OriginalFileInfo,
  OriginalFileRecord,
  FileStatus,
  ListOriginalFilesOptions,
  OriginalFileStatistics
} from '../interfaces/IOriginalFileRepository';
import { ErrorHandler } from '../utils/ErrorHandler';

export class SqlOriginalFileRepository implements IOriginalFileRepository {
  private db: sqlite3.Database | null = null;
  private readonly dbPath: string;

  constructor(databasePath: string) {
    this.dbPath = databasePath;
  }

  async initialize(): Promise<void> {
    if (this.db) return;

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
      } catch (walError) {
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

    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to initialize original files repository: ${error}`,
        { originalError: error }
      );
    }
  }

  private createDatabase(): Promise<sqlite3.Database> {
    return new Promise((resolve, reject) => {
      const db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve(db);
      });
    });
  }

  private run(sql: string, params: any[] = []): Promise<void> {
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

  private get<T>(sql: string, params: any[] = []): Promise<T | undefined> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T);
      });
    });
  }

  private all<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows as T[]);
      });
    });
  }

  async recordOriginalFile(fileInfo: OriginalFileInfo): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

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
        FileStatus.ACTIVE,
        combinedMetadata ? JSON.stringify(combinedMetadata) : null,
        now,
        now,
        downloadUrl
      ]);

      return fileId;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('file_path')) {
        // File already exists, update with new metadata if cleaningMetadata is present
        const existing = await this.get<{ id: string; metadata: string }>(
          'SELECT id, metadata FROM original_files WHERE file_path = ?',
          [fileInfo.filePath]
        );
        if (existing) {
          // If cleaningMetadata is provided, update the record
          if (fileInfo.cleaningMetadata) {
            const existingMetadata = existing.metadata ? JSON.parse(existing.metadata) : {};
            const updatedMetadata = {
              ...existingMetadata,
              cleaningMetadata: fileInfo.cleaningMetadata
            };

            await this.run(
              'UPDATE original_files SET metadata = ?, updated_at = ? WHERE id = ?',
              [JSON.stringify(updatedMetadata), Date.now(), existing.id]
            );
          }
          return existing.id;
        }
      }
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to record original file: ${error.message}`,
        { fileInfo, originalError: error }
      );
    }
  }

  async getOriginalFile(fileId: string): Promise<OriginalFileRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const row = await this.get<any>(
        'SELECT * FROM original_files WHERE id = ?',
        [fileId]
      );

      if (!row) return null;

      // Update accessed_at timestamp
      const now = Date.now();
      await this.run(
        'UPDATE original_files SET accessed_at = ? WHERE id = ?',
        [now, fileId]
      );

      // Return updated record with accessed_at set
      row.accessed_at = now;
      return this.rowToRecord(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to get original file: ${error}`,
        { fileId, originalError: error }
      );
    }
  }

  async getOriginalFilesByUrl(url: string): Promise<OriginalFileRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = await this.all<any>(
        'SELECT * FROM original_files WHERE url = ? ORDER BY created_at DESC',
        [url]
      );

      return rows.map(row => this.rowToRecord(row));
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to get original files by URL: ${error}`,
        { url, originalError: error }
      );
    }
  }

  async listOriginalFiles(options: ListOriginalFilesOptions = {}): Promise<OriginalFileRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const conditions: string[] = [];
      const params: any[] = [];

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

      const rows = await this.all<any>(query, params);
      return rows.map(row => this.rowToRecord(row));
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to list original files: ${error}`,
        { options, originalError: error }
      );
    }
  }

  async updateFileStatus(fileId: string, status: FileStatus): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.run(
        'UPDATE original_files SET status = ?, updated_at = ? WHERE id = ?',
        [status, Date.now(), fileId]
      );

      // Check if any row was actually updated
      const result = await this.get<{ id: string }>(
        'SELECT id FROM original_files WHERE id = ?',
        [fileId]
      );

      return result !== undefined;
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to update file status: ${error}`,
        { fileId, status, originalError: error }
      );
    }
  }

  async getStatistics(): Promise<OriginalFileStatistics> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get total files and size
      const totals = await this.get<any>(`
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
      const statusRows = await this.all<any>(`
        SELECT status, COUNT(*) as count
        FROM original_files
        GROUP BY status
      `);
      const filesByStatus: Record<FileStatus, number> = Object.values(FileStatus).reduce(
        (acc, status) => ({ ...acc, [status]: 0 }),
        {} as Record<FileStatus, number>
      );
      statusRows.forEach((row: any) => {
        filesByStatus[row.status as FileStatus] = row.count;
      });

      // Get files by mime type
      const mimeRows = await this.all<any>(`
        SELECT mime_type, COUNT(*) as count
        FROM original_files
        WHERE status != 'deleted'
        GROUP BY mime_type
      `);
      const filesByMimeType: Record<string, number> = {};
      mimeRows.forEach((row: any) => {
        filesByMimeType[row.mime_type] = row.count;
      });

      // Get files by scraper
      const scraperRows = await this.all<any>(`
        SELECT scraper_used, COUNT(*) as count
        FROM original_files
        WHERE status != 'deleted' AND scraper_used IS NOT NULL
        GROUP BY scraper_used
      `);
      const filesByScraperUsed: Record<string, number> = {};
      scraperRows.forEach((row: any) => {
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
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to get statistics: ${error}`,
        { originalError: error }
      );
    }
  }

  private generateFileId(): string {
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `file_${timestamp}_${random}`;
  }

  private mapSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      'createdAt': 'created_at',
      'size': 'size',
      'url': 'url'
    };
    return mapping[sortBy] || 'created_at';
  }

  private rowToRecord(row: any): OriginalFileRecord {
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
      status: row.status as FileStatus,
      metadata: Object.keys(otherMetadata).length > 0 ? otherMetadata : undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      accessedAt: row.accessed_at ? new Date(row.accessed_at) : undefined,
      downloadUrl: row.download_url
    };
  }

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
}