/**
 * Local file system fetcher
 * Single Responsibility: Fetches content from local file system
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { BaseFetcher } from './BaseFetcher';
import { FetchOptions, FetchedContent } from '../interfaces/IContentFetcher';
import * as mimeTypes from 'mime-types';

export class FileFetcher extends BaseFetcher {
  private readonly basePath?: string;
  private readonly allowedExtensions?: Set<string>;

  constructor(
    maxSize: number = 100 * 1024 * 1024,
    timeout: number = 5000,
    basePath?: string,
    allowedExtensions?: string[]
  ) {
    super(maxSize, timeout);
    this.basePath = basePath;
    this.allowedExtensions = allowedExtensions ? new Set(allowedExtensions) : undefined;
  }

  canFetch(url: string): boolean {
    try {
      const parsedUrl = this.validateUrl(url);
      return parsedUrl.protocol === 'file:';
    } catch {
      // Also handle direct file paths
      return this.isValidFilePath(url);
    }
  }

  protected async performFetch(url: string, options: FetchOptions): Promise<FetchedContent> {
    const filePath = this.extractFilePath(url);
    const resolvedPath = this.resolvePath(filePath);

    await this.validateFileAccess(resolvedPath);

    const stats = await fs.stat(resolvedPath);
    this.checkContentSize(stats.size, options.maxSize!);

    const content = await fs.readFile(resolvedPath);
    const mimeType = this.determineMimeType(resolvedPath);

    return this.createFetchedContent(
      content,
      mimeType,
      url,
      {},
      {
        filePath: resolvedPath,
        fileSize: stats.size,
        lastModified: stats.mtime,
        created: stats.ctime,
        isDirectory: stats.isDirectory(),
        permissions: stats.mode
      }
    );
  }

  private extractFilePath(url: string): string {
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'file:') {
        return parsedUrl.pathname;
      }
    } catch {
      // Handle direct file paths
      return url;
    }

    return url;
  }

  private resolvePath(filePath: string): string {
    let resolvedPath: string;

    if (path.isAbsolute(filePath)) {
      resolvedPath = filePath;
    } else if (this.basePath) {
      resolvedPath = path.resolve(this.basePath, filePath);
    } else {
      resolvedPath = path.resolve(filePath);
    }

    // Security: Ensure path is within allowed directory if basePath is set
    if (this.basePath) {
      const relativePath = path.relative(this.basePath, resolvedPath);
      if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        throw new Error(`Access denied: Path outside allowed directory: ${filePath}`);
      }
    }

    return resolvedPath;
  }

  private async validateFileAccess(filePath: string): Promise<void> {
    try {
      await fs.access(filePath, fs.constants.R_OK);
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`File not found: ${filePath}`);
      }
      if (error.code === 'EACCES') {
        throw new Error(`Access denied: ${filePath}`);
      }
      throw error;
    }

    // Check allowed extensions if configured
    if (this.allowedExtensions) {
      const extension = path.extname(filePath).toLowerCase().substring(1);
      if (!this.allowedExtensions.has(extension)) {
        throw new Error(`File extension not allowed: ${extension}`);
      }
    }
  }

  private determineMimeType(filePath: string): string {
    const mimeType = mimeTypes.lookup(filePath);
    return mimeType || 'application/octet-stream';
  }

  private isValidFilePath(url: string): boolean {
    try {
      // Basic validation - check if it looks like a file path
      return typeof url === 'string' && url.length > 0 && !url.includes('://');
    } catch {
      return false;
    }
  }

  /**
   * Lists files in a directory
   * @param directoryUrl Directory URL or path
   * @param options Fetch options
   * @returns Promise resolving to array of file URLs
   */
  async listFiles(directoryUrl: string, _options: FetchOptions = {}): Promise<string[]> {
    const dirPath = this.extractFilePath(directoryUrl);
    const resolvedPath = this.resolvePath(dirPath);

    try {
      const stats = await fs.stat(resolvedPath);
      if (!stats.isDirectory()) {
        throw new Error(`Not a directory: ${resolvedPath}`);
      }

      const entries = await fs.readdir(resolvedPath, { withFileTypes: true });
      const files: string[] = [];

      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = path.join(resolvedPath, entry.name);

          // Check allowed extensions if configured
          if (this.allowedExtensions) {
            const extension = path.extname(entry.name).toLowerCase().substring(1);
            if (!this.allowedExtensions.has(extension)) {
              continue;
            }
          }

          files.push(`file://${filePath}`);
        }
      }

      return files;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        throw new Error(`Directory not found: ${resolvedPath}`);
      }
      if (error.code === 'EACCES') {
        throw new Error(`Access denied: ${resolvedPath}`);
      }
      throw error;
    }
  }

  /**
   * Checks if a file exists
   * @param url File URL or path
   * @returns Promise resolving to existence status
   */
  async exists(url: string): Promise<boolean> {
    try {
      const filePath = this.extractFilePath(url);
      const resolvedPath = this.resolvePath(filePath);
      await fs.access(resolvedPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets file metadata without reading content
   * @param url File URL or path
   * @returns Promise resolving to file metadata
   */
  async getMetadata(url: string): Promise<FileMetadata> {
    const filePath = this.extractFilePath(url);
    const resolvedPath = this.resolvePath(filePath);

    await this.validateFileAccess(resolvedPath);

    const stats = await fs.stat(resolvedPath);
    const mimeType = this.determineMimeType(resolvedPath);

    return {
      path: resolvedPath,
      size: stats.size,
      mimeType,
      lastModified: stats.mtime,
      created: stats.ctime,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
      permissions: stats.mode
    };
  }

  /**
   * Gets the base path for relative file resolution
   * @returns Base path or undefined
   */
  getBasePath(): string | undefined {
    return this.basePath;
  }

  /**
   * Gets allowed file extensions
   * @returns Set of allowed extensions or undefined
   */
  getAllowedExtensions(): Set<string> | undefined {
    return this.allowedExtensions ? new Set(this.allowedExtensions) : undefined;
  }
}

export interface FileMetadata {
  path: string;
  size: number;
  mimeType: string;
  lastModified: Date;
  created: Date;
  isDirectory: boolean;
  isFile: boolean;
  permissions: number;
}