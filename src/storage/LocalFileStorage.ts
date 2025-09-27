/**
 * Local file system storage implementation
 * Single Responsibility: Manages file storage on local file system
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseFileStorage } from './BaseFileStorage';
import {
  StorageOptions,
  FileMetadata,
  ListOptions,
  StorageStats,
  FileSort,
  SortOrder
} from '../interfaces/IFileStorage';

export class LocalFileStorage extends BaseFileStorage {
  constructor(
    basePath: string,
    compressionEnabled: boolean = false,
    encryptionEnabled: boolean = false
  ) {
    super(basePath, compressionEnabled, encryptionEnabled);
  }

  async store(content: Buffer, filename: string, options: StorageOptions = {}): Promise<string> {
    this.validateFilename(filename);
    this.validateStorageOptions(options);

    await this.ensureBaseDirectory();

    // Generate unique filename if collision would occur
    let finalFilename = filename;
    if (!options.overwrite) {
      const potentialPath = path.join(this.basePath, filename);
      if (await this.exists(potentialPath)) {
        finalFilename = this.generateUniqueFilename(filename, content);
      }
    }

    const filePath = path.join(this.basePath, finalFilename);

    // Process content (compression, encryption)
    let processedContent = await this.compressContent(content, options);
    processedContent = await this.encryptContent(processedContent, options);

    // Write file
    await fs.writeFile(filePath, processedContent);

    // Write metadata
    const metadata = this.createFileMetadata(filePath, content, options);
    await this.writeMetadata(filePath, metadata);

    return filePath;
  }

  async retrieve(filePath: string): Promise<Buffer | null> {
    try {
      const metadata = await this.getMetadata(filePath);
      if (!metadata) return null;

      let content = await fs.readFile(filePath);

      // Process content (decryption, decompression)
      content = await this.decryptContent(content, metadata);
      content = await this.decompressContent(content, metadata);

      return content;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  async delete(filePath: string): Promise<boolean> {
    try {
      // Delete the file
      await fs.unlink(filePath);

      // Delete metadata
      const metadataPath = this.getMetadataPath(filePath);
      try {
        await fs.unlink(metadataPath);
      } catch {
        // Ignore metadata deletion errors
      }

      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(filePath: string): Promise<FileMetadata | null> {
    const metadataPath = this.getMetadataPath(filePath);

    try {
      const metadataContent = await fs.readFile(metadataPath, 'utf8');
      const metadata = JSON.parse(metadataContent) as FileMetadata;

      // Convert date strings back to Date objects
      metadata.createdAt = new Date(metadata.createdAt);
      metadata.updatedAt = new Date(metadata.updatedAt);

      return metadata;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // Fallback: create metadata from file stats
        return await this.createMetadataFromStats(filePath);
      }
      throw error;
    }
  }

  async list(pattern?: string, options: ListOptions = {}): Promise<string[]> {
    this.validateListOptions(options);

    try {
      const files = await fs.readdir(this.basePath);
      const matchingFiles: FileMetadata[] = [];

      for (const file of files) {
        // Skip metadata files
        if (file.endsWith('.meta.json')) continue;

        if (!this.matchesPattern(file, pattern)) continue;

        const filePath = path.join(this.basePath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          let metadata: FileMetadata | null = null;

          if (options.includeMetadata) {
            metadata = await this.getMetadata(filePath);
          }

          if (!metadata) {
            metadata = {
              path: filePath,
              size: stats.size,
              createdAt: stats.birthtime,
              updatedAt: stats.mtime,
              mimeType: this.determineMimeType(file),
              checksum: '',
              isCompressed: false,
              isEncrypted: false,
              metadata: {}
            };
          }

          matchingFiles.push(metadata);
        }
      }

      // Sort files
      const sortedFiles = this.sortFiles(
        matchingFiles,
        options.sortBy || FileSort.NAME,
        options.sortOrder || SortOrder.ASC
      );

      // Apply pagination
      const paginatedFiles = this.paginateFiles(sortedFiles, options.limit);

      // Return paths
      return paginatedFiles.map(file => file.path);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  async getStats(): Promise<StorageStats> {
    try {
      const files = await fs.readdir(this.basePath);
      let totalFiles = 0;
      let totalSize = 0;
      const fileTypes: Record<string, number> = {};
      let oldestFile: Date | undefined;
      let newestFile: Date | undefined;

      for (const file of files) {
        // Skip metadata files
        if (file.endsWith('.meta.json')) continue;

        const filePath = path.join(this.basePath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          totalFiles++;
          totalSize += stats.size;

          const ext = path.extname(file).toLowerCase();
          fileTypes[ext] = (fileTypes[ext] || 0) + 1;

          if (!oldestFile || stats.birthtime < oldestFile) {
            oldestFile = stats.birthtime;
          }

          if (!newestFile || stats.birthtime > newestFile) {
            newestFile = stats.birthtime;
          }
        }
      }

      const averageFileSize = totalFiles > 0 ? Math.round(totalSize / totalFiles) : 0;

      // Get available space
      let availableSpace: number | undefined;
      try {
        const stats = await fs.statfs(this.basePath);
        availableSpace = stats.bavail * stats.bsize;
      } catch {
        // Not all systems support statfs, ignore error
      }

      return {
        totalFiles,
        totalSize,
        averageFileSize,
        fileTypes,
        oldestFile,
        newestFile,
        availableSpace
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return {
          totalFiles: 0,
          totalSize: 0,
          averageFileSize: 0,
          fileTypes: {},
          availableSpace: undefined
        };
      }
      throw error;
    }
  }

  /**
   * Ensures the base directory exists
   */
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create base directory: ${error.message}`);
    }
  }

  /**
   * Gets the metadata file path for a given file
   * @param filePath The file path
   * @returns Metadata file path
   */
  private getMetadataPath(filePath: string): string {
    const dir = path.dirname(filePath);
    const name = path.basename(filePath);
    return path.join(dir, `${name}.meta.json`);
  }

  /**
   * Writes metadata to a file
   * @param filePath The file path
   * @param metadata The metadata to write
   */
  private async writeMetadata(filePath: string, metadata: FileMetadata): Promise<void> {
    const metadataPath = this.getMetadataPath(filePath);
    const metadataContent = JSON.stringify(metadata, null, 2);
    await fs.writeFile(metadataPath, metadataContent, 'utf8');
  }

  /**
   * Creates metadata from file stats (fallback)
   * @param filePath The file path
   * @returns File metadata or null if file doesn't exist
   */
  private async createMetadataFromStats(filePath: string): Promise<FileMetadata | null> {
    try {
      const stats = await fs.stat(filePath);

      if (!stats.isFile()) return null;

      return {
        path: filePath,
        size: stats.size,
        createdAt: stats.birthtime,
        updatedAt: stats.mtime,
        mimeType: this.determineMimeType(path.basename(filePath)),
        checksum: '',
        isCompressed: false,
        isEncrypted: false,
        metadata: {}
      };
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null;
      }
      throw error;
    }
  }

  /**
   * Gets the directory listing with detailed information
   * @param pattern Optional file pattern
   * @param options List options
   * @returns Array of file metadata
   */
  async listDetailed(pattern?: string, options: ListOptions = {}): Promise<FileMetadata[]> {
    this.validateListOptions(options);

    try {
      const files = await fs.readdir(this.basePath);
      const matchingFiles: FileMetadata[] = [];

      for (const file of files) {
        // Skip metadata files
        if (file.endsWith('.meta.json')) continue;

        if (!this.matchesPattern(file, pattern)) continue;

        const filePath = path.join(this.basePath, file);
        const stats = await fs.stat(filePath);

        if (stats.isFile()) {
          const metadata = await this.getMetadata(filePath) ||
                          await this.createMetadataFromStats(filePath);

          if (metadata) {
            matchingFiles.push(metadata);
          }
        }
      }

      // Sort files
      const sortedFiles = this.sortFiles(
        matchingFiles,
        options.sortBy || FileSort.NAME,
        options.sortOrder || SortOrder.ASC
      );

      // Apply pagination
      return this.paginateFiles(sortedFiles, options.limit);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  /**
   * Cleans up orphaned metadata files
   * @returns Number of cleaned up files
   */
  async cleanupMetadata(): Promise<number> {
    try {
      const files = await fs.readdir(this.basePath);
      let cleanedUp = 0;

      for (const file of files) {
        if (file.endsWith('.meta.json')) {
          const originalFile = file.replace('.meta.json', '');
          const originalPath = path.join(this.basePath, originalFile);

          if (!await this.exists(originalPath)) {
            const metadataPath = path.join(this.basePath, file);
            await fs.unlink(metadataPath);
            cleanedUp++;
          }
        }
      }

      return cleanedUp;
    } catch (error: any) {
      throw new Error(`Failed to cleanup metadata: ${error.message}`);
    }
  }
}