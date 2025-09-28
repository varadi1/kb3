/**
 * File storage wrapper that tracks processed/cleaned files
 * Open/Closed Principle: Extends functionality without modifying base storage
 * Single Responsibility: Adds processed file tracking to storage operations
 * Decorator Pattern: Wraps existing storage with additional behavior
 */

import { IFileStorage, StorageOptions, FileMetadata, ListOptions, StorageStats } from '../interfaces/IFileStorage';
import {
  IProcessedFileRepository,
  ProcessedFileInfo,
  ProcessingType
} from '../interfaces/IProcessedFileRepository';
import * as crypto from 'crypto';
import * as path from 'path';

export interface ProcessedStorageOptions extends StorageOptions {
  metadata?: {
    url?: string;
    mimeType?: string;
    originalFileId?: string;
    processingType?: ProcessingType;
    cleanersUsed?: string[];
    cleaningConfig?: Record<string, any>;
    [key: string]: any;
  };
}

export class ProcessedFileStorageWithTracking implements IFileStorage {
  constructor(
    private baseStorage: IFileStorage,
    private processedFileRepository: IProcessedFileRepository
  ) {}

  /**
   * Store processed content and track it in the repository
   */
  async store(content: Buffer, filename: string, options?: ProcessedStorageOptions): Promise<string> {
    // Ensure processed files go to the correct directory
    const processedFilename = this.ensureProcessedPath(filename);

    // Store the file using base storage
    const storagePath = await this.baseStorage.store(content, processedFilename, options);

    // Track the processed file
    try {
      // Calculate checksum
      const checksum = crypto.createHash('sha256').update(content).digest('hex');

      // Extract metadata from options
      const url = options?.metadata?.url || 'unknown';
      const mimeType = options?.metadata?.mimeType || this.guessMimeType(filename);
      const originalFileId = options?.metadata?.originalFileId;
      const processingType = options?.metadata?.processingType || ProcessingType.CLEANED;
      const cleanersUsed = options?.metadata?.cleanersUsed;
      const cleaningConfig = options?.metadata?.cleaningConfig;

      const fileInfo: ProcessedFileInfo = {
        originalFileId,
        url,
        filePath: storagePath,
        mimeType,
        size: content.length,
        checksum,
        processingType,
        cleanersUsed,
        cleaningConfig,
        metadata: {
          ...options?.metadata,
          filename: processedFilename,
          storedAt: new Date().toISOString(),
          originalFilename: filename
        }
      };

      const fileId = await this.processedFileRepository.recordProcessedFile(fileInfo);

      // Store the file ID in metadata for reference
      const metadataWithId = {
        ...fileInfo.metadata,
        processedFileId: fileId
      };

      // Update metadata file with the ID
      await this.updateMetadataWithId(storagePath, metadataWithId);

    } catch (error) {
      // Log error but don't fail the storage operation
      console.error('Failed to track processed file:', error);
    }

    return storagePath;
  }

  /**
   * Retrieve processed file content
   */
  async retrieve(path: string): Promise<Buffer | null> {
    return this.baseStorage.retrieve(path);
  }

  /**
   * Check if processed file exists
   */
  async exists(path: string): Promise<boolean> {
    return this.baseStorage.exists(path);
  }

  /**
   * Delete processed file and update tracking
   */
  async delete(path: string): Promise<boolean> {
    // First delete from base storage
    const deleted = await this.baseStorage.delete(path);

    if (deleted) {
      // Update status in repository (don't delete record, just mark as deleted)
      try {
        const metadata = await this.getMetadata(path);
        if (metadata?.metadata?.processedFileId) {
          await this.processedFileRepository.updateFileStatus(
            metadata.metadata.processedFileId,
            'deleted' as any // We'll need to import ProcessedFileStatus
          );
        }
      } catch (error) {
        console.error('Failed to update processed file status:', error);
      }
    }

    return deleted;
  }

  /**
   * Get metadata for processed file
   */
  async getMetadata(path: string): Promise<FileMetadata | null> {
    return this.baseStorage.getMetadata(path);
  }

  /**
   * List processed files
   */
  async list(pattern?: string, options?: ListOptions): Promise<string[]> {
    // List files matching the pattern (base storage handles paths)
    return this.baseStorage.list(pattern, options);
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    return this.baseStorage.getStats();
  }

  /**
   * Ensure filename includes processed files path
   */
  private ensureProcessedPath(filename: string): string {
    // Extract just the filename from any path
    const basename = path.basename(filename);

    // Add prefix to indicate it's a processed file
    const processedName = basename.startsWith('processed_') ?
      basename :
      `processed_${Date.now()}_${basename}`;

    // Return just the filename (base storage will handle the path)
    return processedName;
  }

  /**
   * Guess MIME type from filename
   */
  private guessMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: Record<string, string> = {
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.md': 'text/markdown',
      '.json': 'application/json',
      '.xml': 'application/xml'
    };
    return mimeTypes[ext] || 'text/plain';
  }

  /**
   * Update metadata file with processed file ID
   */
  private async updateMetadataWithId(filePath: string, metadata: any): Promise<void> {
    try {
      const metadataPath = `${filePath}.meta.json`;
      const existingMetadata = await this.baseStorage.getMetadata(filePath);

      if (existingMetadata) {
        const updatedMetadata = {
          ...existingMetadata,
          metadata: {
            ...existingMetadata.metadata,
            ...metadata
          }
        };

        // Write updated metadata directly using fs since base storage doesn't have update method
        const fs = await import('fs/promises');
        await fs.writeFile(
          metadataPath,
          JSON.stringify(updatedMetadata, null, 2)
        );
      }
    } catch (error) {
      console.error('Failed to update metadata with processed file ID:', error);
    }
  }
}