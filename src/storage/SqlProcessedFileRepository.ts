/**
 * SQL implementation of IProcessedFileRepository
 * Single Responsibility: Only manages processed file records in SQL database
 * Open/Closed: Can be extended without modification
 */

import * as sqlite3 from 'sqlite3';
import * as crypto from 'crypto';
import * as path from 'path';
import * as fs from 'fs/promises';
import {
  IProcessedFileRepository,
  ProcessedFileInfo,
  ProcessedFileRecord,
  ProcessedFileStatus,
  ProcessingType,
  ListProcessedFilesOptions,
  ProcessedFileStatistics
} from '../interfaces/IProcessedFileRepository';
import { ErrorHandler } from '../utils/ErrorHandler';

export class SqlProcessedFileRepository implements IProcessedFileRepository {
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

      // Try to enable WAL mode
      try {
        await this.run('PRAGMA journal_mode = WAL');
      } catch (walError) {
        console.warn('Could not enable WAL mode for processed files:', walError);
      }

      // Create processed_files table
      await this.run(`
        CREATE TABLE IF NOT EXISTS processed_files (
          id TEXT PRIMARY KEY,
          original_file_id TEXT,
          url TEXT NOT NULL,
          file_path TEXT NOT NULL UNIQUE,
          mime_type TEXT NOT NULL,
          size INTEGER NOT NULL,
          checksum TEXT NOT NULL,
          processing_type TEXT NOT NULL,
          cleaners_used TEXT,
          cleaning_config TEXT,
          status TEXT NOT NULL DEFAULT 'active',
          metadata TEXT,
          created_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL,
          accessed_at INTEGER,
          download_url TEXT
        )
      `);

      // Try to add foreign key constraint if original_files table exists
      // This is optional for standalone usage but enforced when used with full system
      try {
        await this.run(`
          CREATE TABLE IF NOT EXISTS original_files_check (
            id TEXT PRIMARY KEY
          )
        `);
        await this.run('DROP TABLE original_files_check');

        // If we can create a check table, try to verify original_files exists
        const result = await this.get<{name: string}>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='original_files'",
          []
        );

        if (result) {
          // Original files table exists, we can reference it
          // Note: SQLite doesn't support adding foreign keys after table creation
          // so this is mainly for documentation
          console.log('Original files table found, foreign key relationship available');
        }
      } catch (error) {
        // Ignore - foreign key is optional
      }

      // Create indices for better query performance
      await this.run('CREATE INDEX IF NOT EXISTS idx_processed_files_original ON processed_files(original_file_id)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_processed_files_url ON processed_files(url)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_processed_files_status ON processed_files(status)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_processed_files_type ON processed_files(processing_type)');
      await this.run('CREATE INDEX IF NOT EXISTS idx_processed_files_created ON processed_files(created_at)');

    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to initialize processed files repository: ${error}`,
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

  async recordProcessedFile(fileInfo: ProcessedFileInfo): Promise<string> {
    if (!this.db) throw new Error('Database not initialized');

    const fileId = this.generateFileId();
    const now = Date.now();

    try {
      // Generate download URL
      const downloadUrl = `/api/files/processed/${fileId}/download`;

      await this.run(`
        INSERT INTO processed_files (
          id, original_file_id, url, file_path, mime_type, size, checksum,
          processing_type, cleaners_used, cleaning_config,
          status, metadata, created_at, updated_at, download_url
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        fileId,
        fileInfo.originalFileId || null,
        fileInfo.url,
        fileInfo.filePath,
        fileInfo.mimeType,
        fileInfo.size,
        fileInfo.checksum,
        fileInfo.processingType,
        fileInfo.cleanersUsed ? JSON.stringify(fileInfo.cleanersUsed) : null,
        fileInfo.cleaningConfig ? JSON.stringify(fileInfo.cleaningConfig) : null,
        ProcessedFileStatus.ACTIVE,
        fileInfo.metadata ? JSON.stringify(fileInfo.metadata) : null,
        now,
        now,
        downloadUrl
      ]);

      return fileId;
    } catch (error: any) {
      if (error.code === 'SQLITE_CONSTRAINT' && error.message.includes('file_path')) {
        // File already exists, return existing ID
        const existing = await this.get<{ id: string }>(
          'SELECT id FROM processed_files WHERE file_path = ?',
          [fileInfo.filePath]
        );
        if (existing) {
          return existing.id;
        }
      }
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to record processed file: ${error.message}`,
        { fileInfo, originalError: error }
      );
    }
  }

  async getProcessedFile(fileId: string): Promise<ProcessedFileRecord | null> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const row = await this.get<any>(
        'SELECT * FROM processed_files WHERE id = ?',
        [fileId]
      );

      if (!row) return null;

      // Update accessed_at timestamp
      const now = Date.now();
      await this.run(
        'UPDATE processed_files SET accessed_at = ? WHERE id = ?',
        [now, fileId]
      );

      row.accessed_at = now;
      return this.rowToRecord(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to get processed file: ${error}`,
        { fileId, originalError: error }
      );
    }
  }

  async getProcessedFilesByOriginal(originalFileId: string): Promise<ProcessedFileRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = await this.all<any>(
        'SELECT * FROM processed_files WHERE original_file_id = ? ORDER BY created_at DESC',
        [originalFileId]
      );

      return rows.map(row => this.rowToRecord(row));
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to get processed files by original: ${error}`,
        { originalFileId, originalError: error }
      );
    }
  }

  async getProcessedFilesByUrl(url: string): Promise<ProcessedFileRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const rows = await this.all<any>(
        'SELECT * FROM processed_files WHERE url = ? ORDER BY created_at DESC',
        [url]
      );

      return rows.map(row => this.rowToRecord(row));
    } catch (error) {
      throw ErrorHandler.createError(
        'DATABASE_ERROR',
        `Failed to get processed files by URL: ${error}`,
        { url, originalError: error }
      );
    }
  }

  async listProcessedFiles(options: ListProcessedFilesOptions = {}): Promise<ProcessedFileRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const conditions: string[] = [];
      const params: any[] = [];

      if (options.originalFileId) {
        conditions.push('original_file_id = ?');
        params.push(options.originalFileId);
      }

      if (options.url) {
        conditions.push('url = ?');
        params.push(options.url);
      }

      if (options.processingType) {
        conditions.push('processing_type = ?');
        params.push(options.processingType);
      }

      if (options.status) {
        conditions.push('status = ?');
        params.push(options.status);
      }

      if (options.cleanersUsed && options.cleanersUsed.length > 0) {
        // Check if all specified cleaners were used
        const cleanerConditions = options.cleanersUsed.map(cleaner =>
          `cleaners_used LIKE '%"${cleaner}"%'`
        ).join(' AND ');
        conditions.push(`(${cleanerConditions})`);
      }

      if (options.fromDate) {
        conditions.push('created_at >= ?');
        params.push(options.fromDate.getTime());
      }

      if (options.toDate) {
        conditions.push('created_at <= ?');
        params.push(options.toDate.getTime());
      }

      let query = 'SELECT * FROM processed_files';
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // Add sorting
      const sortBy = options.sortBy || 'createdAt';
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
        `Failed to list processed files: ${error}`,
        { options, originalError: error }
      );
    }
  }

  async updateFileStatus(fileId: string, status: ProcessedFileStatus): Promise<boolean> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.run(
        'UPDATE processed_files SET status = ?, updated_at = ? WHERE id = ?',
        [status, Date.now(), fileId]
      );

      const result = await this.get<{ id: string }>(
        'SELECT id FROM processed_files WHERE id = ?',
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

  async getStatistics(): Promise<ProcessedFileStatistics> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      // Get total files and size
      const totals = await this.get<any>(`
        SELECT
          COUNT(*) as total_files,
          SUM(size) as total_size,
          AVG(size) as avg_size,
          MIN(created_at) as oldest,
          MAX(created_at) as newest,
          COUNT(DISTINCT original_file_id) as unique_originals
        FROM processed_files
        WHERE status != 'deleted'
      `);

      // Get files by status
      const statusRows = await this.all<any>(`
        SELECT status, COUNT(*) as count
        FROM processed_files
        GROUP BY status
      `);
      const filesByStatus: Record<ProcessedFileStatus, number> = Object.values(ProcessedFileStatus).reduce(
        (acc, status) => ({ ...acc, [status]: 0 }),
        {} as Record<ProcessedFileStatus, number>
      );
      statusRows.forEach((row: any) => {
        filesByStatus[row.status as ProcessedFileStatus] = row.count;
      });

      // Get files by processing type
      const typeRows = await this.all<any>(`
        SELECT processing_type, COUNT(*) as count
        FROM processed_files
        WHERE status != 'deleted'
        GROUP BY processing_type
      `);
      const filesByProcessingType: Record<ProcessingType, number> = Object.values(ProcessingType).reduce(
        (acc, type) => ({ ...acc, [type]: 0 }),
        {} as Record<ProcessingType, number>
      );
      typeRows.forEach((row: any) => {
        filesByProcessingType[row.processing_type as ProcessingType] = row.count;
      });

      // Get files by mime type
      const mimeRows = await this.all<any>(`
        SELECT mime_type, COUNT(*) as count
        FROM processed_files
        WHERE status != 'deleted'
        GROUP BY mime_type
      `);
      const filesByMimeType: Record<string, number> = {};
      mimeRows.forEach((row: any) => {
        filesByMimeType[row.mime_type] = row.count;
      });

      // Get cleaner usage statistics
      const cleanerRows = await this.all<any>(`
        SELECT cleaners_used
        FROM processed_files
        WHERE cleaners_used IS NOT NULL AND status != 'deleted'
      `);
      const cleanerUsageCount: Record<string, number> = {};
      cleanerRows.forEach((row: any) => {
        try {
          const cleaners = JSON.parse(row.cleaners_used);
          if (Array.isArray(cleaners)) {
            cleaners.forEach((cleaner: string) => {
              cleanerUsageCount[cleaner] = (cleanerUsageCount[cleaner] || 0) + 1;
            });
          }
        } catch {
          // Ignore JSON parse errors
        }
      });

      return {
        totalFiles: totals?.total_files || 0,
        totalSize: totals?.total_size || 0,
        averageFileSize: totals?.avg_size || 0,
        filesByStatus,
        filesByProcessingType,
        filesByMimeType,
        cleanerUsageCount,
        oldestFile: totals?.oldest ? new Date(totals.oldest) : undefined,
        newestFile: totals?.newest ? new Date(totals.newest) : undefined,
        originalFilesWithProcessed: totals?.unique_originals || 0,
        averageProcessedPerOriginal: totals?.unique_originals > 0
          ? (totals?.total_files || 0) / totals.unique_originals
          : 0
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
    return `processed_${timestamp}_${random}`;
  }

  private mapSortColumn(sortBy: string): string {
    const mapping: Record<string, string> = {
      'createdAt': 'created_at',
      'size': 'size',
      'processingType': 'processing_type'
    };
    return mapping[sortBy] || 'created_at';
  }

  private rowToRecord(row: any): ProcessedFileRecord {
    return {
      id: row.id,
      originalFileId: row.original_file_id || undefined,
      url: row.url,
      filePath: row.file_path,
      mimeType: row.mime_type,
      size: row.size,
      checksum: row.checksum,
      processingType: row.processing_type as ProcessingType,
      cleanersUsed: row.cleaners_used ? JSON.parse(row.cleaners_used) : undefined,
      cleaningConfig: row.cleaning_config ? JSON.parse(row.cleaning_config) : undefined,
      status: row.status as ProcessedFileStatus,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
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