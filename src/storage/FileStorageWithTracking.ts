/**
 * File storage wrapper that tracks original files
 * Open/Closed Principle: Extends functionality without modifying base storage
 * Single Responsibility: Adds file tracking to storage operations
 */

import { IFileStorage, StorageOptions, FileMetadata, ListOptions, StorageStats } from '../interfaces/IFileStorage';
import { IOriginalFileRepository, OriginalFileInfo } from '../interfaces/IOriginalFileRepository';
import * as crypto from 'crypto';
import * as path from 'path';

export class FileStorageWithTracking implements IFileStorage {
  constructor(
    private baseStorage: IFileStorage,
    private originalFileRepository: IOriginalFileRepository
  ) {}

  async store(content: Buffer, filename: string, options?: StorageOptions): Promise<string> {
    // First, store the file using base storage
    const storagePath = await this.baseStorage.store(content, filename, options);

    // Then track the original file
    try {
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      // Extract URL and other metadata from options
      const url = options?.metadata?.url || 'unknown';
      const mimeType = options?.metadata?.mimeType || this.guessMimeType(filename);
      const scraperUsed = options?.metadata?.scraperUsed;

      const fileInfo: OriginalFileInfo = {
        url,
        filePath: storagePath,
        mimeType,
        size: content.length,
        checksum,
        scraperUsed,
        metadata: {
          ...options?.metadata,
          filename,
          storedAt: new Date().toISOString()
        }
      };

      await this.originalFileRepository.recordOriginalFile(fileInfo);
      // Successfully tracked original file
    } catch (error) {
      // Log error but don't fail the storage operation
      console.error('Failed to track original file:', error);
    }

    return storagePath;
  }

  async retrieve(path: string): Promise<Buffer | null> {
    return this.baseStorage.retrieve(path);
  }

  async exists(path: string): Promise<boolean> {
    return this.baseStorage.exists(path);
  }

  async delete(path: string): Promise<boolean> {
    return this.baseStorage.delete(path);
  }

  async getMetadata(path: string): Promise<FileMetadata | null> {
    return this.baseStorage.getMetadata(path);
  }

  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    return this.baseStorage.list(pattern, options);
  }

  async getStats(): Promise<StorageStats> {
    return this.baseStorage.getStats();
  }

  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.html': 'text/html',
      '.pdf': 'application/pdf',
      '.txt': 'text/plain',
      '.json': 'application/json',
      '.xml': 'application/xml',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.rtf': 'application/rtf'
    };
    return mimeTypes[ext] || 'application/octet-stream';
  }
}