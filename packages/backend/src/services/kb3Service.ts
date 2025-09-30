import {
  KnowledgeBaseFactory,
  createSqlConfiguration,
  ProcessingResult,
  ITag
} from 'kb3';
import * as path from 'path';
import { EventEmitter } from 'events';
import { SqlGlobalConfigPersistence } from './SqlGlobalConfigPersistence';

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
  private orchestrator: any; // KnowledgeBaseOrchestrator with extended features
  private config: any; // Configuration object
  private processingQueue: Map<string, ProcessingResult> = new Map();
  private urlStore: Map<string, any> = new Map(); // Local cache for URLs
  private initialized: Promise<void>;
  private globalConfigPersistence: SqlGlobalConfigPersistence;
  private isQueueProcessing: boolean = false;
  private queueInterval: NodeJS.Timeout | null = null;
  private processingItems: Map<string, any> = new Map(); // Track items being processed

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
      },
      // Enable scraping to support parameter configuration
      scraping: {
        enabledScrapers: ['http', 'playwright', 'crawl4ai', 'docling', 'deepdoctection'],
        defaultScraper: 'http',
        scraperConfigs: {
          http: {
            timeout: 30000,
            followRedirects: true,
            maxRedirects: 5
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
        },
        rateLimiting: {
          enabled: true,
          requestsPerSecond: 2
        }
      }
    });

    // Store initialization promise
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize global config persistence
    const dbPath = path.join(process.cwd(), 'data', 'unified.db');
    this.globalConfigPersistence = new SqlGlobalConfigPersistence(dbPath);

    // Load saved configuration from database
    const savedConfig = await this.globalConfigPersistence.loadAllConfig();

    // Merge saved config with default config
    if (savedConfig.scrapers && savedConfig.scrapers.length > 0) {
      this.config.scraping.enabledScrapers = savedConfig.scrapers
        .filter(s => s.enabled)
        .map(s => s.type);

      // Update scraper configs
      savedConfig.scrapers.forEach(scraper => {
        if (scraper.parameters) {
          this.config.scraping.scraperConfigs[scraper.type] = {
            ...this.config.scraping.scraperConfigs[scraper.type],
            ...scraper.parameters
          };
        }
      });
    }

    if (savedConfig.cleaners && savedConfig.cleaners.length > 0) {
      this.config.cleaning = this.config.cleaning || { enabledCleaners: [], cleanerConfigs: {} };
      this.config.cleaning.enabledCleaners = savedConfig.cleaners
        .filter(c => c.enabled)
        .map(c => c.type);
    }

    // createKnowledgeBase is async, must await it
    this.orchestrator = await KnowledgeBaseFactory.createKnowledgeBase(this.config);
    this.setupEventHandlers();
  }

  public static getInstance(): KB3Service {
    if (!KB3Service.instance) {
      KB3Service.instance = new KB3Service();
    }
    return KB3Service.instance;
  }

  // Ensure service is initialized before use
  private async ensureInitialized(): Promise<void> {
    if (this.initialized) {
      await this.initialized;
    }
  }

  private setupEventHandlers(): void {
    // Hook into processing events if available
    // This would emit events for real-time updates
  }

  // Helper method to enrich a URL with its parameters
  private async enrichUrlWithParameters(url: any): Promise<any> {
    try {
      // Get parameters for this URL
      console.log(`[DEBUG] Enriching URL: ${url.url} (id: ${url.id})`);
      const params = await this.getUrlParameters(url.url);
      console.log(`[DEBUG] Retrieved parameters:`, params);

      // Merge parameters with URL data
      if (params) {
        const enriched = {
          ...url,
          scraperType: params.scraperType || 'default',
          cleaners: params.cleaners || [],
          scraperParameters: params.parameters || {}
        };
        console.log(`[DEBUG] Enriched URL with scraper: ${enriched.scraperType}, cleaners: ${enriched.cleaners.join(', ') || 'none'}`);
        return enriched;
      }

      // Return URL with default values if no parameters
      console.log(`[DEBUG] No parameters found, using defaults`);
      return {
        ...url,
        scraperType: url.scraperType || 'default',
        cleaners: url.cleaners || []
      };
    } catch (error) {
      console.error(`Error enriching URL ${url.url} with parameters:`, error);
      // Return URL with defaults on error
      return {
        ...url,
        scraperType: url.scraperType || 'default',
        cleaners: url.cleaners || []
      };
    }
  }

  // URL Management
  async getUrls(options?: {
    offset?: number;
    limit?: number;
    status?: string;
    tags?: string[];
    search?: string;
  }): Promise<any[]> {
    await this.ensureInitialized();
    try {
      // Get URL repository from orchestrator
      const urlRepository = this.orchestrator.getUrlRepository();
      if (!urlRepository) {
        console.warn('URL repository not available');
        return [];
      }

      // Build filter for repository query
      const filter: any = {};
      if (options?.status) {
        filter.status = options.status;
      }

      // Get URLs from database
      const urls = await urlRepository.list(filter);

      // Ensure all URLs have tags array initialized and enrich with parameters
      const urlsWithTags = await Promise.all(
        urls.map(async u => {
          const urlWithTags = {
            ...u,
            tags: u.tags || []
          };
          // Enrich with scraper/cleaner parameters
          return await this.enrichUrlWithParameters(urlWithTags);
        })
      );

      // Apply additional filters that repository might not support
      let filtered = urlsWithTags;

      // Filter by tags if provided
      if (options?.tags && options.tags.length > 0) {
        filtered = filtered.filter(u =>
          u.tags && u.tags.some((t: string) => options.tags?.includes(t))
        );
      }

      // Search filter
      if (options?.search) {
        const search = options.search.toLowerCase();
        filtered = filtered.filter(u =>
          u.url.toLowerCase().includes(search)
        );
      }

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || filtered.length;
      return filtered.slice(offset, offset + limit);
    } catch (error) {
      console.error('Error getting URLs:', error);
      return [];
    }
  }

  async addUrl(url: string, tags?: string[]): Promise<ProcessingResult> {
    await this.ensureInitialized();

    // Get URL repository from orchestrator
    const urlRepository = this.orchestrator.getUrlRepository();
    if (!urlRepository) {
      throw new Error('URL repository not available');
    }

    // Check if URL already exists
    const exists = await urlRepository.exists(url);
    if (exists) {
      const urlInfo = await urlRepository.getUrlInfo(url);
      return {
        success: false,
        url,
        error: {
          code: 'DUPLICATE_URL',
          message: `URL already exists with status: ${urlInfo?.status}`,
          stage: 'REGISTRATION'
        },
        metadata: { existingUrl: urlInfo }
      } as ProcessingResult;
    }

    // Check if repository supports registerWithTags for proper tag storage
    let urlId: string;
    const urlRepoWithTags = urlRepository as any;

    if (urlRepoWithTags.registerWithTags && tags && tags.length > 0) {
      // Use registerWithTags to properly store tags in relational table
      urlId = await urlRepoWithTags.registerWithTags(url, {
        tags: tags,
        addedAt: new Date()
      });
    } else {
      // Register without tags in metadata to avoid dual storage
      urlId = await urlRepository.register(url, {
        addedAt: new Date()
      });
      // Tags will be added separately if repository supports it
    }

    // Store in local cache for quick access
    this.urlStore.set(url, {
      id: urlId,
      url,
      status: 'pending',
      tags: tags || [],
      metadata: {},
      addedAt: new Date()
    });

    // Add tags if provided and registerWithTags wasn't used
    // This handles the fallback case when registerWithTags is not available
    if (tags && tags.length > 0 && !urlRepoWithTags.registerWithTags) {
      try {
        await this.addTagsToUrl(url, tags);
      } catch (error) {
        console.warn(`Failed to add tags to URL ${url}:`, error);
      }
    }

    this.emit('url:added', { url, id: urlId, tags });

    return {
      success: true,
      url,
      metadata: {
        id: urlId,
        status: 'pending',
        tags: tags || []
      },
      processingTime: 0
    } as ProcessingResult;
  }

  async addUrls(urls: UrlWithTags[]): Promise<ProcessingResult[]> {
    await this.ensureInitialized();

    const results: ProcessingResult[] = [];

    // Process each URL individually using the addUrl method
    for (const urlObj of urls) {
      try {
        const result = await this.addUrl(urlObj.url, urlObj.tags);
        results.push(result);
      } catch (error) {
        // If addUrl throws an error, convert it to a failed ProcessingResult
        results.push({
          success: false,
          url: urlObj.url,
          error: {
            code: 'ADD_FAILED',
            message: error instanceof Error ? error.message : 'Failed to add URL',
            stage: 'REGISTRATION'
          },
          processingTime: 0
        } as ProcessingResult);
      }
    }

    this.emit('urls:added', { count: urls.length, results });
    return results;
  }

  async processUrl(
    url: string,
    options?: ProcessingOptions
  ): Promise<ProcessingResult> {
    await this.ensureInitialized();
    this.emit('processing:started', { url });

    try {
      const result = await this.orchestrator.processUrl(url, options);

      // Update URL in local cache
      const existingUrl = this.urlStore.get(url) || { url, tags: [] };
      this.urlStore.set(url, {
        ...existingUrl,
        url,
        status: result.success ? 'completed' : 'failed',
        metadata: result.metadata,
        processedAt: new Date()
      });

      this.emit('processing:completed', { url, result });
      this.processingQueue.set(url, result);

      return result;
    } catch (error) {
      // Update URL status in cache
      const existingUrl = this.urlStore.get(url) || { url, tags: [] };
      this.urlStore.set(url, {
        ...existingUrl,
        url,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.emit('processing:failed', { url, error });
      throw error;
    }
  }

  async processUrls(
    urls: string[],
    options?: ProcessingOptions
  ): Promise<ProcessingResult[]> {
    await this.ensureInitialized();
    this.emit('batch:started', { count: urls.length });

    const results = await this.orchestrator.processUrls(urls, options);

    // Store URLs in local cache
    urls.forEach((url, index) => {
      const result = results[index];
      const existingUrl = this.urlStore.get(url) || { url, tags: [] };
      this.urlStore.set(url, {
        ...existingUrl,
        url,
        status: result.success ? 'completed' : 'failed',
        metadata: result.metadata,
        processedAt: new Date()
      });
    });

    this.emit('batch:completed', { count: urls.length, results });
    return results;
  }

  async setUrlParameters(url: string, parameters: UrlParameters): Promise<void> {
    await this.ensureInitialized();

    // Save directly to database
    const sqlite3 = require('sqlite3');
    const path = require('path');
    const dbPath = path.join(__dirname, '..', '..', '..', '..', 'data', 'unified.db');
    const db = new sqlite3.Database(dbPath);

    await new Promise<void>((resolve, reject) => {
      // First, delete any existing parameters for this URL
      db.run('DELETE FROM url_parameters WHERE url = ?', [url], (deleteErr: any) => {
        if (deleteErr) {
          db.close();
          reject(deleteErr);
          return;
        }

        // Now insert the new parameters
        const cleanersJson = JSON.stringify(parameters.cleaners || []);
        const parametersJson = JSON.stringify(parameters.parameters || {});

        db.run(
          `INSERT INTO url_parameters (url, scraper_type, cleaners, priority, parameters, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
          [
            url,
            parameters.scraperType || 'default',
            cleanersJson,
            parameters.priority || 10,
            parametersJson
          ],
          (insertErr: any) => {
            db.close();
            if (insertErr) {
              reject(insertErr);
            } else {
              console.log(`[DEBUG] Saved parameters to DB for URL: ${url}`);
              resolve();
            }
          }
        );
      });
    });

    // Also set in fetcher for immediate use (if available)
    try {
      const fetcher = (this.orchestrator as any).contentFetcher;
      if (fetcher && 'setUrlParameters' in fetcher) {
        await (fetcher as any).setUrlParameters(url, parameters);
      }
    } catch (error) {
      // Fetcher update failed, but DB save succeeded
      console.warn('Failed to update fetcher, but DB save succeeded:', error);
    }

    this.emit('config:updated', { url, parameters });
  }

  async getUrlParameters(url: string): Promise<UrlParameters | null> {
    await this.ensureInitialized();

    try {
      // Read directly from the database
      const sqlite3 = require('sqlite3');
      const path = require('path');
      // Backend runs from packages/backend, so need to go up 2 directories
      const dbPath = path.join(__dirname, '..', '..', '..', '..', 'data', 'unified.db');
      console.log(`[DEBUG] Using database path: ${dbPath}`);
      const db = new sqlite3.Database(dbPath);

      return new Promise((resolve) => {
        db.get(
          'SELECT * FROM url_parameters WHERE url = ?',
          [url],
          (err: any, row: any) => {
            db.close();

            if (err) {
              console.error(`[DEBUG] Database error for URL ${url}:`, err);
              resolve(null);
              return;
            }

            if (!row) {
              console.log(`[DEBUG] No parameters found in DB for URL: ${url}`);
              resolve(null);
              return;
            }

            console.log(`[DEBUG] Found parameters in DB for URL ${url}:`, row);

            // Parse cleaners if it's a JSON string
            let cleaners = [];
            try {
              cleaners = typeof row.cleaners === 'string' ? JSON.parse(row.cleaners) : row.cleaners || [];
            } catch (e) {
              cleaners = [];
            }

            // Parse parameters if it's a JSON string
            let parameters = {};
            try {
              parameters = typeof row.parameters === 'string' ? JSON.parse(row.parameters) : row.parameters || {};
            } catch (e) {
              parameters = {};
            }

            resolve({
              scraperType: row.scraper_type || 'http',
              cleaners: cleaners,
              parameters: parameters,
              priority: row.priority || 10
            });
          }
        );
      });
    } catch (error) {
      console.error('Error reading parameters from database:', error);
      return null;
    }
  }

  async removeUrlParameters(url: string): Promise<void> {
    await this.ensureInitialized();

    // Get the content fetcher from the orchestrator, not the config
    const fetcher = (this.orchestrator as any).contentFetcher;
    if (!fetcher || !('parameterManager' in fetcher)) {
      return;
    }

    const parameterManager = (fetcher as any).parameterManager;
    if (parameterManager && 'clearParameters' in parameterManager) {
      await parameterManager.clearParameters(url);
      this.emit('config:removed', { url });
    }
  }

  // Tag Management
  async getTags(): Promise<ITag[]> {
    await this.ensureInitialized();
    try {
      // Use orchestrator's getTags method which exists
      return await this.orchestrator.getTags();
    } catch (error) {
      console.error('Error getting tags:', error);
      return [];
    }
  }

  async createTag(name: string, parentName?: string): Promise<ITag> {
    await this.ensureInitialized();
    const result = await this.orchestrator.createTag(name, parentName);
    this.emit('tag:created', result);
    return result;
  }

  async updateTag(id: number, updates: Partial<ITag>): Promise<boolean> {
    try {
      // Note: Orchestrator doesn't provide tag update functionality
      // This would need to be implemented in the core KB3 system
      console.warn('Tag update not supported by orchestrator interface');
      return false;
    } catch (error) {
      console.error('Error updating tag:', error);
      return false;
    }
  }

  async deleteTag(id: number): Promise<boolean> {
    await this.ensureInitialized();
    try {
      // Get tag name from ID (we need to find the tag first)
      const tags = await this.orchestrator.getTags();
      const tag = tags.find((t: ITag) => t.id === id);
      if (!tag) return false;

      const success = await this.orchestrator.deleteTag(tag.name);
      if (success) {
        this.emit('tag:deleted', { id });
      }
      return success;
    } catch (error) {
      console.error('Error deleting tag:', error);
      return false;
    }
  }

  async getUrlById(id: string): Promise<string | null> {
    await this.ensureInitialized();
    const urls = await this.getUrls();
    const urlObj = urls.find(u => u.id === id);
    return urlObj ? urlObj.url : null;
  }

  // Get single URL object by ID - needed for tests
  async getUrl(id: string): Promise<any | null> {
    await this.ensureInitialized();
    const urls = await this.getUrls();
    return urls.find(u => u.id === id || u.url === id) || null;
  }

  // Update URL metadata - needed for tests
  async updateUrl(id: string, updates: any): Promise<{ success: boolean }> {
    await this.ensureInitialized();
    try {
      // Get URL repository from orchestrator
      const urlRepository = this.orchestrator.getUrlRepository();
      if (!urlRepository) {
        throw new Error('URL repository not available');
      }

      // Find the actual URL record ID (could be URL string or UUID)
      const urls = await this.getUrls();
      const urlObj = urls.find(u => u.id === id || u.url === id);

      if (!urlObj) {
        console.error('URL not found:', id);
        return { success: false };
      }

      const urlRecordId = urlObj.id;

      // Handle different update types
      if (updates.tags !== undefined) {
        await this.addTagsToUrl(urlRecordId, updates.tags);
      }

      if (updates.authority !== undefined) {
        await this.updateUrlAuthority(urlRecordId, updates.authority);
      }

      if (updates.status !== undefined) {
        // Persist status to database
        const { UrlStatus } = await import('kb3');
        const statusMapping: { [key: string]: any } = {
          'pending': UrlStatus.PENDING,
          'processing': UrlStatus.PROCESSING,
          'completed': UrlStatus.COMPLETED,
          'failed': UrlStatus.FAILED,
          'skipped': UrlStatus.SKIPPED
        };

        const dbStatus = statusMapping[updates.status];
        if (dbStatus) {
          await urlRepository.updateStatus(urlRecordId, dbStatus);
        }

        // Also update local cache
        const existingUrl = this.urlStore.get(id) || { url: id };
        this.urlStore.set(id, { ...existingUrl, status: updates.status });
      }

      if (updates.metadata !== undefined) {
        // Persist metadata to database
        await urlRepository.updateMetadata(urlRecordId, updates.metadata);

        // Also update local cache
        const existingUrl = this.urlStore.get(id) || { url: id };
        this.urlStore.set(id, { ...existingUrl, metadata: updates.metadata });
      }

      // Handle scraper configuration updates
      if (updates.scraperType || updates.cleaners || updates.priority) {
        await this.setUrlParameters(urlObj.url, {
          scraperType: updates.scraperType,
          cleaners: updates.cleaners,
          priority: updates.priority
        });
      }

      return { success: true };
    } catch (error) {
      console.error('Error updating URL:', error);
      return { success: false };
    }
  }

  // Delete a single URL
  async deleteUrl(id: string): Promise<boolean> {
    await this.ensureInitialized();

    // Get URL repository from orchestrator
    const urlRepository = this.orchestrator.getUrlRepository();
    if (!urlRepository) {
      throw new Error('URL repository not available');
    }

    // First check if the ID is a UUID or URL
    let urlRecord = null;
    const urls = await this.getUrls();
    const urlObj = urls.find(u => u.id === id || u.url === id);

    if (!urlObj) {
      return false; // URL not found
    }

    // Remove from repository using the ID
    const success = await urlRepository.remove(urlObj.id);

    if (success) {
      // Clean up related data
      this.urlStore.delete(id);
      this.urlStore.delete(urlObj.url);
      this.emit('url:deleted', { id: urlObj.id, url: urlObj.url });

      // Remove associated parameters if they exist
      try {
        await this.removeUrlParameters(urlObj.url);
      } catch (error) {
        // Parameters might not exist, that's okay
        console.log('No parameters to remove for URL:', urlObj.url);
      }
    }

    return success;
  }

  // Delete multiple URLs
  async deleteUrls(ids: string[]): Promise<{ successful: number; failed: string[] }> {
    await this.ensureInitialized();

    const failed: string[] = [];
    let successful = 0;

    for (const id of ids) {
      try {
        const deleted = await this.deleteUrl(id);
        if (deleted) {
          successful++;
        } else {
          failed.push(id);
        }
      } catch (error) {
        console.error(`Failed to delete URL ${id}:`, error);
        failed.push(id);
      }
    }

    return { successful, failed };
  }

  async addTagsToUrl(url: string, tagNames: string[]): Promise<boolean> {
    await this.ensureInitialized();
    const success = await this.orchestrator.addTagsToUrl(url, tagNames);
    if (success) {
      this.emit('url:tagged', { url, tags: tagNames });
    }
    return success;
  }

  async addTagsToUrlById(id: string, tagNames: string[]): Promise<boolean> {
    const url = await this.getUrlById(id);
    if (!url) {
      throw new Error(`URL not found with id: ${id}`);
    }
    return this.addTagsToUrl(url, tagNames);
  }

  async removeTagsFromUrl(url: string, tagNames: string[]): Promise<boolean> {
    await this.ensureInitialized();
    // For now, return true as tag removal is not yet implemented in orchestrator
    // TODO: Implement in orchestrator
    this.emit('url:untagged', { url, tags: tagNames });
    return true;
  }

  async setUrlTags(url: string, tagNames: string[]): Promise<boolean> {
    await this.ensureInitialized();
    // Replace all existing tags with the new set of tags
    // This is a combination of removing all existing tags and adding new ones
    // TODO: Implement in orchestrator
    this.emit('url:tags-replaced', { url, tags: tagNames });
    return true;
  }

  async updateUrlAuthority(url: string, authority: number): Promise<boolean> {
    await this.ensureInitialized();
    // For now, return true as authority update is not yet implemented
    // TODO: Implement in orchestrator
    this.emit('url:authority-updated', { url, authority });
    return true;
  }

  async processUrlsByTags(
    tagNames: string[],
    options?: ProcessingOptions & { includeChildTags?: boolean }
  ): Promise<ProcessingResult[]> {
    await this.ensureInitialized();
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

  // Update scraper configuration
  async updateScraperConfigs(scrapers: Array<{
    type: string;
    enabled: boolean;
    priority: number;
    parameters?: Record<string, any>;
  }>): Promise<void> {
    // Store scrapers configuration in memory
    // In production, this should be persisted to a database
    if (!this.config.scraping) {
      this.config.scraping = {
        enabledScrapers: [],
        defaultScraper: 'http',
        scraperConfigs: {}
      };
    }

    // Update enabled scrapers
    this.config.scraping.enabledScrapers = scrapers
      .filter(s => s.enabled)
      .map(s => s.type);

    // Update scraper configs with parameters
    scrapers.forEach(scraper => {
      if (!this.config.scraping.scraperConfigs[scraper.type]) {
        this.config.scraping.scraperConfigs[scraper.type] = {};
      }
      this.config.scraping.scraperConfigs[scraper.type] = {
        ...this.config.scraping.scraperConfigs[scraper.type],
        ...scraper.parameters,
        priority: scraper.priority,
        enabled: scraper.enabled
      };
    });

    console.log('Updated scraper configs:', scrapers);

    // Save to database for persistence
    await this.globalConfigPersistence.saveScraperConfig(scrapers);
  }

  // Update cleaner configuration
  async updateCleanerConfigs(cleaners: Array<{
    type: string;
    enabled: boolean;
    order: number;
    parameters?: Record<string, any>;
  }>): Promise<void> {
    // Store cleaners configuration in memory
    // In production, this should be persisted to a database
    if (!this.config.cleaning) {
      this.config.cleaning = {
        enabledCleaners: [],
        cleanerConfigs: {}
      };
    }

    // Update enabled cleaners
    this.config.cleaning.enabledCleaners = cleaners
      .filter(c => c.enabled)
      .sort((a, b) => a.order - b.order)
      .map(c => c.type);

    // Update cleaner configs with parameters
    cleaners.forEach(cleaner => {
      if (!this.config.cleaning.cleanerConfigs[cleaner.type]) {
        this.config.cleaning.cleanerConfigs[cleaner.type] = {};
      }
      this.config.cleaning.cleanerConfigs[cleaner.type] = {
        ...this.config.cleaning.cleanerConfigs[cleaner.type],
        ...cleaner.parameters,
        order: cleaner.order,
        enabled: cleaner.enabled
      };
    });

    console.log('Updated cleaner configs:', cleaners);

    // Save to database for persistence
    await this.globalConfigPersistence.saveCleanerConfig(cleaners);
  }

  // Get current scraper configuration
  async getScraperConfigs(): Promise<Array<{
    type: string;
    enabled: boolean;
    priority: number;
    parameters?: Record<string, any>;
  }>> {
    // Load from database first
    const savedScrapers = await this.globalConfigPersistence.loadScraperConfig();

    if (savedScrapers && savedScrapers.length > 0) {
      return savedScrapers;
    }

    // Fallback to in-memory config
    const enabledScrapers = this.config.scraping?.enabledScrapers || ['http'];
    const scraperConfigs = this.config.scraping?.scraperConfigs || {};

    const availableScrapers = this.getAvailableScrapers();

    return availableScrapers.map(scraperType => ({
      type: scraperType,
      enabled: enabledScrapers.includes(scraperType),
      priority: scraperConfigs[scraperType]?.priority || 10,
      parameters: scraperConfigs[scraperType] || {}
    }));
  }

  // Get current cleaner configuration
  async getCleanerConfigs(): Promise<Array<{
    type: string;
    enabled: boolean;
    order: number;
    parameters?: Record<string, any>;
  }>> {
    // Load from database first
    const savedCleaners = await this.globalConfigPersistence.loadCleanerConfig();

    if (savedCleaners && savedCleaners.length > 0) {
      return savedCleaners;
    }

    // Fallback to in-memory config
    const enabledCleaners = this.config.cleaning?.enabledCleaners || [];
    const cleanerConfigs = this.config.cleaning?.cleanerConfigs || {};

    const availableCleaners = this.getAvailableCleaners();

    return availableCleaners.map((cleanerType, index) => ({
      type: cleanerType,
      enabled: enabledCleaners.includes(cleanerType),
      order: cleanerConfigs[cleanerType]?.order || index,
      parameters: cleanerConfigs[cleanerType] || {}
    }));
  }

  // Content Access
  async getOriginalContent(urlId: string): Promise<Buffer | null> {
    await this.ensureInitialized();
    try {
      // Use orchestrator's getOriginalFileRepository method
      const originalRepo = this.orchestrator.getOriginalFileRepository();
      if (!originalRepo) {
        console.warn('Original file repository not available');
        return null;
      }

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
      // Note: Orchestrator doesn't expose knowledge store directly
      // This would need to be implemented in the core KB3 system
      console.warn('Direct knowledge store access not supported by orchestrator');
      return null;
    } catch (error) {
      console.error('Error getting cleaned content:', error);
      return null;
    }
  }

  // Statistics
  async getStatistics(): Promise<any> {
    await this.ensureInitialized();
    try {
      // Use what we can get from the orchestrator
      const tags = await this.orchestrator.getTags().catch(() => []);
      const processingStats = this.orchestrator.getProcessingStats ?
        this.orchestrator.getProcessingStats() :
        { totalProcessed: 0, successful: 0, failed: 0 };

      // Get URL stats from database via repository
      const urlRepository = this.orchestrator.getUrlRepository();
      const urls = urlRepository ? await urlRepository.list() : [];

      return {
        totalUrls: urls.length,
        processedUrls: processingStats.successful || urls.filter(u => u.status === 'completed').length,
        failedUrls: processingStats.failed || urls.filter(u => u.status === 'failed').length,
        totalSize: 0, // Not available from orchestrator
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
    await this.ensureInitialized();
    try {
      // Use the getUrls method which can be properly mocked
      let urls = await this.getUrls({ tags: options.tags });

      // Filter by URL IDs if specified
      if (options.urlIds && options.urlIds.length > 0) {
        urls = urls.filter(u => options.urlIds?.includes(u.id) || options.urlIds?.includes(u.url));
      }

      // Return just the filtered URLs array for export
      // The route will handle formatting
      return urls;
    } catch (error) {
      console.error('Error exporting data:', error);
      return [];
    }
  }

  async importData(data: any, format: 'json' | 'csv' | 'txt'): Promise<any> {
    await this.ensureInitialized();

    let successful = 0;
    let failed = 0;
    const errors: any[] = [];

    // Process each URL
    for (const item of data) {
      try {
        // Add URL with tags
        const result = await this.addUrl(item.url, item.tags || []);

        if (result.success) {
          successful++;

          // Update authority if provided
          if (item.authority !== undefined && item.authority !== null) {
            await this.updateUrl(item.url, { authority: item.authority });
          }

          // Update other metadata if provided
          if (item.metadata || item.status) {
            await this.updateUrl(item.url, {
              metadata: item.metadata,
              status: item.status
            });
          }
        } else {
          failed++;
          errors.push({
            url: item.url,
            error: result.error?.message || 'Failed to add URL'
          });
        }
      } catch (error) {
        failed++;
        errors.push({
          url: item.url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return {
      total: data.length,
      successful,
      failed,
      errors
    };
  }

  // Queue Management Methods
  async startQueueProcessing(): Promise<void> {
    await this.ensureInitialized();

    if (this.isQueueProcessing) {
      throw new Error('Queue processing is already running');
    }

    this.isQueueProcessing = true;
    this.emit('queue:started');

    // Start processing pending URLs at regular intervals
    this.queueInterval = setInterval(async () => {
      await this.processNextInQueue();
    }, 5000); // Process next item every 5 seconds
  }

  async stopQueueProcessing(): Promise<void> {
    await this.ensureInitialized();

    if (!this.isQueueProcessing) {
      throw new Error('Queue processing is not running');
    }

    this.isQueueProcessing = false;
    if (this.queueInterval) {
      clearInterval(this.queueInterval);
      this.queueInterval = null;
    }
    this.emit('queue:stopped');
  }

  async clearCompletedFromQueue(): Promise<number> {
    await this.ensureInitialized();

    let clearedCount = 0;
    for (const [id, item] of this.processingItems) {
      if (item.status === 'completed') {
        this.processingItems.delete(id);
        clearedCount++;
      }
    }

    this.emit('queue:cleared', { count: clearedCount });
    return clearedCount;
  }

  private async processNextInQueue(): Promise<void> {
    if (!this.isQueueProcessing) {
      return;
    }

    try {
      // Get pending URLs from repository
      const urlRepository = this.orchestrator.getUrlRepository();
      if (!urlRepository) {
        return;
      }

      const pendingUrls = await urlRepository.list({ status: 'pending' });
      if (pendingUrls.length === 0) {
        return;
      }

      // Process the first pending URL
      const urlToProcess = pendingUrls[0];

      // Add to processing items
      this.processingItems.set(urlToProcess.url, {
        id: urlToProcess.url,
        url: urlToProcess.url,
        status: 'processing',
        startedAt: new Date().toISOString()
      });

      this.emit('queue:processing', { url: urlToProcess.url });

      try {
        // Process the URL
        const result = await this.processUrl(urlToProcess.url);

        // Update processing item status
        const item = this.processingItems.get(urlToProcess.url);
        if (item) {
          item.status = result.success ? 'completed' : 'failed';
          item.completedAt = new Date().toISOString();
          if (!result.success) {
            // Ensure error is always a string
            if (typeof result.error === 'object' && result.error !== null) {
              item.error = (result.error as any).message || JSON.stringify(result.error);
            } else {
              item.error = String(result.error || 'Processing failed');
            }
          }
        }

        this.emit('queue:processed', { url: urlToProcess.url, result });
      } catch (error) {
        // Update processing item with error
        const item = this.processingItems.get(urlToProcess.url);
        if (item) {
          item.status = 'failed';
          item.completedAt = new Date().toISOString();
          item.error = error instanceof Error ? error.message : 'Unknown error';
        }

        this.emit('queue:error', { url: urlToProcess.url, error });
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  // Get current queue status
  async getQueueStatus(): Promise<any> {
    await this.ensureInitialized();

    const queueArray = Array.from(this.processingItems.values());

    // Ensure queue is always a valid array
    const queue = Array.isArray(queueArray) ? queueArray : [];

    return {
      isProcessing: this.isQueueProcessing,
      queue: queue,
      stats: {
        pending: queue.filter(i => i?.status === 'pending').length,
        processing: queue.filter(i => i?.status === 'processing').length,
        completed: queue.filter(i => i?.status === 'completed').length,
        failed: queue.filter(i => i?.status === 'failed').length
      }
    };
  }

  // Cleanup
  async cleanup(): Promise<void> {
    // Stop queue processing if running
    if (this.isQueueProcessing) {
      await this.stopQueueProcessing();
    }

    // Cleanup resources if needed
    this.removeAllListeners();
  }
}