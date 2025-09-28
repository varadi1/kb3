import {
  KnowledgeBaseFactory,
  createSqlConfiguration,
  IKnowledgeBaseOrchestrator,
  ProcessingResult,
  ITag,
  IConfiguration
} from 'kb3';
import * as path from 'path';
import { EventEmitter } from 'events';

export interface UrlWithTags {
  url: string;
  tags?: string[];
}

export interface ProcessingOptions {
  scraperType?: string;
  cleaners?: string[];
  extractImages?: boolean;
  extractLinks?: boolean;
  extractMetadata?: boolean;
  preserveFormatting?: boolean;
}

export interface UrlParameters {
  scraperType?: string;
  parameters?: Record<string, any>;
  cleaners?: string[];
  priority?: number;
}

export class KB3Service extends EventEmitter {
  private static instance: KB3Service;
  private orchestrator: IKnowledgeBaseOrchestrator;
  private config: IConfiguration;
  private processingQueue: Map<string, ProcessingResult> = new Map();

  private constructor() {
    super();

    // Initialize with SQL configuration (unified storage)
    this.config = createSqlConfiguration({
      dbPath: path.join(process.cwd(), 'data', 'unified.db'),
      enableWAL: true,
      enableForeignKeys: true,
      autoMigrate: true,
      processing: {
        concurrency: 10,
        timeout: 30000
      },
      network: {
        maxSize: 100 * 1024 * 1024, // 100MB
        timeout: 30000
      }
    });

    this.orchestrator = KnowledgeBaseFactory.createKnowledgeBase(this.config);
    this.setupEventHandlers();
  }

  public static getInstance(): KB3Service {
    if (!KB3Service.instance) {
      KB3Service.instance = new KB3Service();
    }
    return KB3Service.instance;
  }

  private setupEventHandlers(): void {
    // Hook into processing events if available
    // This would emit events for real-time updates
  }

  // URL Management
  async getUrls(options?: {
    offset?: number;
    limit?: number;
    status?: string;
    tags?: string[];
    search?: string;
  }): Promise<any[]> {
    try {
      // Use orchestrator's repository following SOLID principles
      const urlRepo = this.orchestrator.getUrlRepository();
      return await urlRepo.getAll(options);
    } catch (error) {
      console.error('Error getting URLs:', error);
      return [];
    }
  }

  async addUrl(url: string, tags?: string[]): Promise<ProcessingResult> {
    const result = await this.orchestrator.processUrl(url);

    if (tags && tags.length > 0) {
      await this.addTagsToUrl(url, tags);
    }

    this.emit('url:added', { url, result });
    return result;
  }

  async addUrls(urls: UrlWithTags[]): Promise<ProcessingResult[]> {
    const results = await this.orchestrator.processUrlsWithTags(urls);
    this.emit('urls:added', { count: urls.length, results });
    return results;
  }

  async processUrl(
    url: string,
    options?: ProcessingOptions
  ): Promise<ProcessingResult> {
    this.emit('processing:started', { url });

    try {
      const result = await this.orchestrator.processUrl(url, options);

      this.emit('processing:completed', { url, result });
      this.processingQueue.set(url, result);

      return result;
    } catch (error) {
      this.emit('processing:failed', { url, error });
      throw error;
    }
  }

  async processUrls(
    urls: string[],
    options?: ProcessingOptions
  ): Promise<ProcessingResult[]> {
    this.emit('batch:started', { count: urls.length });

    const results = await this.orchestrator.processUrls(urls, options);

    this.emit('batch:completed', { count: urls.length, results });
    return results;
  }

  async setUrlParameters(url: string, parameters: UrlParameters): Promise<void> {
    const fetcher = this.config.contentFetcher;
    if (!fetcher || !('setUrlParameters' in fetcher)) {
      throw new Error('URL parameters configuration not available');
    }

    (fetcher as any).setUrlParameters(url, parameters);
    this.emit('config:updated', { url, parameters });
  }

  // Tag Management
  async getTags(): Promise<ITag[]> {
    try {
      const tagRepo = this.orchestrator.getTagRepository();
      return await tagRepo.getAll();
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  async createTag(name: string, parentName?: string): Promise<ITag> {
    const result = await this.orchestrator.createTag(name, parentName);
    this.emit('tag:created', result);
    return result;
  }

  async updateTag(id: number, updates: Partial<ITag>): Promise<boolean> {
    try {
      const tagRepo = this.orchestrator.getTagRepository();
      const success = await tagRepo.update(id, updates);
      if (success) {
        this.emit('tag:updated', { id, updates });
      }
      return success;
    } catch (error) {
      console.error('Error updating tag:', error);
      return false;
    }
  }

  async deleteTag(id: number): Promise<boolean> {
    try {
      const tagRepo = this.orchestrator.getTagRepository();
      const success = await tagRepo.delete(id);
      if (success) {
        this.emit('tag:deleted', { id });
      }
      return success;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  }

  async addTagsToUrl(url: string, tagNames: string[]): Promise<boolean> {
    const success = await this.orchestrator.addTagsToUrl(url, tagNames);
    if (success) {
      this.emit('url:tagged', { url, tags: tagNames });
    }
    return success;
  }

  async processUrlsByTags(
    tagNames: string[],
    options?: ProcessingOptions & { includeChildTags?: boolean }
  ): Promise<ProcessingResult[]> {
    return await this.orchestrator.processUrlsByTags(tagNames, options);
  }

  // Configuration
  getAvailableScrapers(): string[] {
    return [
      'http',
      'playwright',
      'crawl4ai',
      'docling',
      'deepdoctection'
    ];
  }

  getAvailableCleaners(): string[] {
    return [
      'sanitizehtml',
      'xss',
      'voca',
      'remark',
      'readability'
    ];
  }

  getScraperConfig(scraperType: string): any {
    const configs: Record<string, any> = {
      http: {
        timeout: 30000,
        maxRedirects: 5,
        headers: {}
      },
      playwright: {
        headless: true,
        viewport: { width: 1920, height: 1080 },
        waitUntil: 'networkidle',
        timeout: 30000
      },
      crawl4ai: {
        extractImages: true,
        extractLinks: true,
        waitForSelector: null
      },
      docling: {
        parseImages: true,
        parseTables: true
      },
      deepdoctection: {
        useOCR: false,
        detectLayout: true
      }
    };

    return configs[scraperType] || {};
  }

  getCleanerConfig(cleanerType: string): any {
    const configs: Record<string, any> = {
      sanitizehtml: {
        allowedTags: [],
        allowedAttributes: {}
      },
      xss: {
        whiteList: {},
        stripIgnoreTag: true
      },
      voca: {
        stripTags: true,
        trim: true,
        normalize: true
      },
      remark: {
        removeImages: false,
        simplifyLinks: true
      },
      readability: {
        debug: false,
        maxElemsToParse: 0
      }
    };

    return configs[cleanerType] || {};
  }

  // Content Access
  async getOriginalContent(urlId: string): Promise<Buffer | null> {
    try {
      // Use orchestrator's abstraction instead of direct config access
      const originalRepo = this.orchestrator.getOriginalFileRepository();
      const record = await originalRepo.getFileByUrlId(parseInt(urlId));
      if (!record || !record.file_path) return null;

      const fs = await import('fs/promises');
      return await fs.readFile(record.file_path);
    } catch (error) {
      console.error('Error getting original content:', error);
      return null;
    }
  }

  async getCleanedContent(urlId: string): Promise<string | null> {
    try {
      // Use orchestrator's knowledge store abstraction
      const knowledgeStore = this.orchestrator.getKnowledgeStore();
      const entries = await knowledgeStore.search({ url: urlId });
      if (entries.length === 0) return null;

      return entries[0].text;
    } catch (error) {
      console.error('Error getting cleaned content:', error);
      return null;
    }
  }

  // Statistics
  async getStatistics(): Promise<any> {
    try {
      // Follow SOLID principles - use orchestrator's interface, not config internals
      const urlRepo = this.orchestrator.getUrlRepository();
      const tagRepo = this.orchestrator.getTagRepository();
      const knowledgeStore = this.orchestrator.getKnowledgeStore();

      const [urls, tags, stats] = await Promise.all([
        urlRepo.getAll().catch(() => []),
        tagRepo.getAll().catch(() => []),
        knowledgeStore.getStats().catch(() => ({ totalSize: 0, totalEntries: 0 }))
      ]);

      return {
        totalUrls: urls.length,
        processedUrls: urls.filter(u => u.status === 'completed').length,
        failedUrls: urls.filter(u => u.status === 'failed').length,
        totalSize: stats.totalSize || 0,
        tags: tags.length
      };
    } catch (error) {
      console.error('Statistics error:', error);
      // Return safe defaults during initialization
      return {
        totalUrls: 0,
        processedUrls: 0,
        failedUrls: 0,
        totalSize: 0,
        tags: 0
      };
    }
  }

  // Export/Import
  async exportData(options: {
    format: 'json' | 'csv' | 'txt';
    includeContent?: boolean;
    urlIds?: string[];
    tags?: string[];
  }): Promise<any> {
    try {
      // Use orchestrator's repositories following SOLID principles
      const urlRepo = this.orchestrator.getUrlRepository();
      const tagRepo = this.orchestrator.getTagRepository();

      const [urls, tags] = await Promise.all([
        urlRepo.getAll({ tags: options.tags }),
        tagRepo.getAll()
      ]);

      return { urls, tags, format: options.format };
    } catch (error) {
      console.error('Error exporting data:', error);
      return { urls: [], tags: [], format: options.format };
    }
  }

  async importData(data: any, format: 'json' | 'csv' | 'txt'): Promise<any> {
    // Would need implementation
    return { success: true, imported: 0 };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Cleanup resources if needed
    this.removeAllListeners();
  }
}