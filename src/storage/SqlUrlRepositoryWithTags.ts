/**
 * Enhanced SQL-based URL repository with tag support
 * Single Responsibility: Manages URL tracking with tag integration
 * Open/Closed: Extends SqlUrlRepository without modifying it
 */

import { SqlUrlRepository } from './SqlUrlRepository';
import { SqlTagManager } from './SqlTagManager';
import { SqlUrlTagRepository } from './SqlUrlTagRepository';
import { IUrlTagRepository } from '../interfaces/IUrlTagRepository';
import { ITagManager } from '../interfaces/ITagManager';
import { ITag } from '../interfaces/ITag';
import { UrlMetadata, UrlRecord, UrlStatus } from '../interfaces/IUrlRepository';
import { ErrorHandler } from '../utils/ErrorHandler';
import * as sqlite3 from 'sqlite3';

export interface UrlMetadataWithTags extends UrlMetadata {
  tags?: string[];
}

export interface UrlRecordWithTags extends UrlRecord {
  tags?: ITag[];
}

export class SqlUrlRepositoryWithTags extends SqlUrlRepository {
  private tagManager: SqlTagManager;
  private urlTagRepository: SqlUrlTagRepository;
  private dbConnection: sqlite3.Database | null = null;

  constructor(dbPath: string = './data/urls.db') {
    super(dbPath);
    // These will be initialized when the database is ready
    this.tagManager = null as any;
    this.urlTagRepository = null as any;
  }

  /**
   * Initialize repository with tag support
   */
  async initializeWithTags(): Promise<void> {
    // Initialize parent repository first
    await (this as any).initialize();

    try {
      // Get database connection from parent
      this.dbConnection = (this as any).db;

      if (!this.dbConnection) {
        throw new Error('Database connection not available');
      }

      // Initialize tag manager and URL-tag repository
      this.tagManager = new SqlTagManager(this.dbConnection);
      await this.tagManager.initialize();

      this.urlTagRepository = new SqlUrlTagRepository(this.dbConnection, this.tagManager);
      await this.urlTagRepository.initialize();
    } catch (error) {
      throw ErrorHandler.createError(
        'TAG_INIT_ERROR',
        'Failed to initialize tag support for URL repository',
        { error }
      );
    }
  }

  /**
   * Register a URL with optional tags
   */
  async registerWithTags(url: string, metadata?: UrlMetadataWithTags): Promise<string> {
    try {
      // Ensure initialization
      if (!this.tagManager || !this.urlTagRepository) {
        await this.initializeWithTags();
      }

      // Extract tags from metadata
      const tags = metadata?.tags || [];
      const metadataWithoutTags = { ...metadata };
      delete metadataWithoutTags.tags;

      // Register the URL using parent method
      const urlId = await this.register(url, metadataWithoutTags);

      // Add tags if provided
      if (tags.length > 0) {
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

      const tags = await this.urlTagRepository.getTagsForUrl(urlInfo.id);
      return {
        ...urlInfo,
        tags
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
      const row = await this.getFromDb<any>(
        'SELECT * FROM urls WHERE id = ?',
        [id]
      );

      if (!row) return null;

      return this.rowToUrlRecord(row);
    } catch (error) {
      throw ErrorHandler.createError(
        'GET_URL_BY_ID_ERROR',
        'Failed to get URL by ID',
        { id, error }
      );
    }
  }

  /**
   * Helper method to get from database
   */
  private async getFromDb<T>(sql: string, params: any[] = []): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.dbConnection) {
        reject(new Error('Database not initialized'));
        return;
      }

      this.dbConnection.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row as T || null);
      });
    });
  }

  /**
   * Convert database row to UrlRecord (helper)
   */
  private rowToUrlRecord(row: any): UrlRecord {
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

  /**
   * Get tag manager for external use
   */
  getTagManager(): ITagManager {
    return this.tagManager;
  }

  /**
   * Get URL-tag repository for external use
   */
  getUrlTagRepository(): IUrlTagRepository {
    return this.urlTagRepository;
  }
}