import {
  KnowledgeBaseFactory,
  createSqlConfiguration,
  ProcessingResult,
  ITag,
  ScraperSystemValidator,
  ErrorCode,
  ProcessingStage,
  UrlStatus
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
  private globalConfigPersistence!: SqlGlobalConfigPersistence;
  private isQueueProcessing: boolean = false;
  private queueInterval: NodeJS.Timeout | null = null;
  private processingItems: Map<string, any> = new Map(); // Track items being processed
  private queuedUrls: Set<string> = new Set(); // Prevent duplicate queue picks

  // Consistent path to unified DB used across service
  private readonly dbPath: string = path.join(process.cwd(), 'data', 'unified.db');
  // Persistent parameter storage (scraper_parameters)
  private parameterStorage: any;

  private constructor() {
    super();

    // Initialize with SQL configuration (unified storage)
    this.config = createSqlConfiguration({
      storage: {
        unified: {
          enabled: true,
          dbPath: this.dbPath,
          enableWAL: true,
          enableForeignKeys: true,
          autoMigrate: true
        },
        fileStorage: {
          basePath: path.join(process.cwd(), 'data', 'files')
        },
        processedFileStore: {
          enabled: true,
          type: 'sql'
        }
      },
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
          defaultIntervalMs: 500  // 2 requests per second
        }
      }
    });

    // Store initialization promise
    this.initialized = this.initialize();
  }

  private async initialize(): Promise<void> {
    // Initialize global config persistence using unified DB
    this.globalConfigPersistence = new SqlGlobalConfigPersistence(this.dbPath);

    // Initialize parameter storage service (uses same DB)
    const { ParameterStorageService } = await import('./parameterStorageService');
    this.parameterStorage = new ParameterStorageService(this.dbPath);
    await this.parameterStorage.initialize();

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

    // Validate scraper system is properly configured
    this.validateScraperSystem();

    this.setupEventHandlers();

    // Reset any lingering 'processing' statuses from unclean shutdowns
    await this.resetStuckProcessingStatuses();
  }

  /**
   * Validates that the scraper system is properly configured
   * Ensures SOLID compliance: Dependency Inversion Principle
   * @throws Error if scraper system is not ready
   */
  private validateScraperSystem(): void {
    try {
      const validator = new ScraperSystemValidator();
      const result = validator.validate();

      if (!result.isValid) {
        console.error('Scraper system validation failed:');
        console.error(validator.getDiagnostics());
        throw new Error('Scraper system is not properly configured. Check logs for details.');
      }

      // Log warnings if any
      if (result.warnings.length > 0) {
        console.warn('Scraper system warnings:', result.warnings);
      }

      // Log successful validation in debug mode
      if (result.diagnostics.totalScrapers > 0) {
        console.log(`[KB3Service] Scraper system validated: ${result.diagnostics.totalScrapers} scrapers available`);
        console.log(`[KB3Service] Default scraper: ${result.diagnostics.defaultScraper}`);
        console.log(`[KB3Service] Registered scrapers: ${result.diagnostics.registeredScrapers.join(', ')}`);
      }
    } catch (error) {
      // Re-throw with additional context
      throw new Error(`KB3Service initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
        urls.map(async (u: any) => {
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

      // Derive processedAt from lastChecked when status is completed
      const withProcessedAt = filtered.map(u => ({
        ...u,
        processedAt: (u.status === 'completed' || u.status === 'skipped') ? (u.lastChecked || null) : null
      }));

      // Apply pagination
      const offset = options?.offset || 0;
      const limit = options?.limit || withProcessedAt.length;
      return withProcessedAt.slice(offset, offset + limit);
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
          code: ErrorCode.DUPLICATE_URL,
          message: `URL already exists with status: ${urlInfo?.status}`,
          stage: ProcessingStage.DETECTING
        },
        metadata: { existingUrl: urlInfo },
        processingTime: 0
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
      status: UrlStatus.PENDING,
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
        status: UrlStatus.PENDING,
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
            code: ErrorCode.PROCESSING_FAILED,
            message: error instanceof Error ? error.message : 'Failed to add URL',
            stage: ProcessingStage.DETECTING
          },
          metadata: {},
          processingTime: 0
        } as ProcessingResult);
      }
    }

    this.emit('urls:added', { count: urls.length, results });
    return results;
  }

  async processUrl(
    urlOrId: string,
    options?: ProcessingOptions
  ): Promise<ProcessingResult> {
    await this.ensureInitialized();

    // CRITICAL FIX: Resolve UUID to actual URL if needed
    const urls = await this.resolveUrlsFromIds([urlOrId]);
    if (urls.length === 0) {
      const error = {
        code: ErrorCode.INVALID_URL,
        message: `Could not resolve ID to URL: ${urlOrId}`,
        stage: ProcessingStage.DETECTING
      };
      this.emit('processing:failed', { url: urlOrId, error: error.message });
      return {
        success: false,
        url: urlOrId,
        error,
        metadata: {},
        processingTime: 0
      } as ProcessingResult;
    }

    const url = urls[0];
    console.log(`[KB3Service] Processing URL: ${url} (from ID: ${urlOrId})`);

    this.emit('processing:started', { url });

    try {
      // Merge options with per-URL configured cleaners so they are actually applied
      let mergedOptions = { ...(options || {}) } as any;
      try {
        const params = await this.getUrlParameters(url);
        if (params?.cleaners && params.cleaners.length > 0) {
          const normalize = (n: string) => (n === 'sanitizehtml' ? 'sanitize-html' : n === 'stringjs' ? 'string-js' : n);
          mergedOptions.textCleaning = {
            ...(mergedOptions.textCleaning || {}),
            cleanerNames: params.cleaners.map(normalize),
            url,
            autoSelect: false,
            storeMetadata: true,
            saveCleanedFile: true
          } as any;
        }
      } catch {}

      const result = await this.orchestrator.processUrl(url, mergedOptions);

      // Update URL in local cache
      const existingUrl = this.urlStore.get(url) || { url, tags: [] };
      this.urlStore.set(url, {
        ...existingUrl,
        url,
        status: result.success ? UrlStatus.COMPLETED : UrlStatus.FAILED,
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
        status: UrlStatus.FAILED,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      this.emit('processing:failed', {
        url,
        error: error instanceof Error ? error.message : String(error || 'Processing failed')
      });
      throw error;
    }
  }

  async processUrls(
    urlsOrIds: string[],
    options?: ProcessingOptions
  ): Promise<ProcessingResult[]> {
    await this.ensureInitialized();

    // CRITICAL FIX: Resolve UUIDs to actual URLs
    console.log(`[KB3Service] Processing batch of ${urlsOrIds.length} items (may include UUIDs)`);
    const urls = await this.resolveUrlsFromIds(urlsOrIds);
    console.log(`[KB3Service] Resolved to ${urls.length} valid URLs`);

    if (urls.length === 0) {
      console.error('[KB3Service] No valid URLs found after resolution');
      return urlsOrIds.map(id => ({
        success: false,
        url: id,
        error: {
          code: ErrorCode.INVALID_URL,
          message: `Could not resolve ID to URL: ${id}`,
          stage: ProcessingStage.DETECTING
        },
        metadata: {},
        processingTime: 0
      } as ProcessingResult));
    }

    this.emit('batch:started', { count: urls.length });

    // Process URLs one by one with status updates
    const results: ProcessingResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const startTime = Date.now();

      try {
        // Emit processing started event
        this.emit('processing:started', {
          url,
          progress: Math.floor((i / urls.length) * 100),
          index: i + 1,
          total: urls.length
        });

        // Update URL status to 'processing'
        await this.updateUrlStatus(url, UrlStatus.PROCESSING);

        // Process single URL
        console.log(`[KB3Service] Processing URL ${i + 1}/${urls.length}: ${url.substring(0, 80)}...`);
        const result = await this.orchestrator.processUrl(url, options);

        // Calculate processing time
        result.processingTime = Date.now() - startTime;

        // Update URL status based on result
        const finalStatus = result.success ? UrlStatus.COMPLETED : UrlStatus.FAILED;
        await this.updateUrlStatus(url, finalStatus, result.metadata, result.error);

        // Store URL in local cache
        const existingUrl = this.urlStore.get(url) || { url, tags: [] };
        this.urlStore.set(url, {
          ...existingUrl,
          url,
          status: finalStatus,
          metadata: result.metadata,
          processedAt: new Date()
        });

        results.push(result);

        // Emit completion event
        if (result.success) {
          this.emit('processing:completed', {
            url,
            success: true,
            status: 'completed',
            progress: Math.floor(((i + 1) / urls.length) * 100),
            index: i + 1,
            total: urls.length,
            duration: result.processingTime
          });
        } else {
          this.emit('processing:failed', {
            url,
            success: false,
            status: 'failed',
            error: result.error,
            progress: Math.floor(((i + 1) / urls.length) * 100),
            index: i + 1,
            total: urls.length,
            duration: result.processingTime
          });
        }

        // Emit progress update
        this.emit('processing:progress', {
          url,
          progress: Math.floor(((i + 1) / urls.length) * 100),
          completed: i + 1,
          total: urls.length,
          stage: result.success ? 'completed' : 'failed'
        });

      } catch (error: any) {
        console.error(`[KB3Service] Error processing URL ${url}:`, error);

        const processingTime = Date.now() - startTime;
        const errorResult: ProcessingResult = {
          success: false,
          url,
          error: {
            code: error?.code || 'PROCESSING_ERROR',
            message: error?.message || 'Unknown error during processing',
            stage: error?.stage || 'PROCESSING'
          },
          metadata: {},
          processingTime
        };

        // Update URL status to failed
        await this.updateUrlStatus(url, UrlStatus.FAILED, undefined, errorResult.error);

        results.push(errorResult);

        // Emit failure event
        this.emit('processing:failed', {
          url,
          success: false,
          status: 'failed',
          error: errorResult.error,
          progress: Math.floor(((i + 1) / urls.length) * 100),
          index: i + 1,
          total: urls.length,
          duration: processingTime
        });
      }
    }

    this.emit('batch:completed', { count: urls.length, results });
    return results;
  }

  /**
   * Helper method to update URL status in the database
   */
  private async updateUrlStatus(
    url: string,
    status: UrlStatus,
    metadata?: any,
    error?: any
  ): Promise<void> {
    try {
      // Get URL repository from orchestrator
      const urlRepository = this.orchestrator.getUrlRepository();
      if (!urlRepository) {
        throw new Error('URL repository not available');
      }

      // Get URL info to find the ID
      const urlInfo = await urlRepository.getUrlInfo(url);
      if (!urlInfo) {
        console.error(`[KB3Service] URL not found in repository: ${url}`);
        return;
      }

      // Update status using the repository method with the correct ID
      await urlRepository.updateStatus(
        urlInfo.id,
        status,
        error ? (error.message || JSON.stringify(error)) : undefined
      );

      // Update metadata if provided
      if (metadata) {
        await urlRepository.updateMetadata(urlInfo.id, metadata);
      }

      console.log(`[KB3Service] Updated status for URL ${url} (ID: ${urlInfo.id}) to ${status}`);
    } catch (error) {
      console.error(`[KB3Service] Failed to update URL status for ${url}:`, error);
    }
  }

  async setUrlParameters(url: string, parameters: UrlParameters): Promise<void> {
    await this.ensureInitialized();

    // Persist via parameter storage (scraper_parameters in unified DB)
    try {
      await this.parameterStorage.saveParameters(url, {
        scraperType: parameters.scraperType || 'default',
        parameters: parameters.parameters || {},
        priority: parameters.priority || 10,
        enabled: true
      });
    } catch (err) {
      console.error('[KB3Service] Failed to save scraper parameters:', err);
    }

    // Persist configured cleaners alongside URL metadata (since parameter storage doesn't store cleaners)
    try {
      if (parameters.cleaners && parameters.cleaners.length > 0) {
        const repo = this.orchestrator.getUrlRepository?.();
        if (repo) {
          const info = await repo.getUrlInfo(url);
          if (info?.id) {
            await repo.updateMetadata(info.id, {
              configuredCleaners: parameters.cleaners
            });
          }
        }
      }
    } catch (metaErr) {
      console.warn('[KB3Service] Failed to persist configured cleaners into URL metadata:', metaErr);
    }

    // Also set in fetcher for immediate effect
    try {
      const fetcher = (this.orchestrator as any).contentFetcher;
      if (fetcher && 'setUrlParameters' in fetcher) {
        await (fetcher as any).setUrlParameters(url, parameters as any);
      }
    } catch (error) {
      console.warn('Failed to update fetcher with parameters:', error);
    }

    this.emit('config:updated', { url, parameters });
  }

  async getUrlParameters(url: string): Promise<UrlParameters | null> {
    await this.ensureInitialized();

    try {
      // Load from parameter storage first
      const stored = await this.parameterStorage.getParameters(url).catch(() => null);
      let scraperType: string | undefined;
      let parameters: Record<string, any> | undefined;
      let priority: number | undefined;
      if (stored) {
        scraperType = stored.scraperType;
        parameters = stored.parameters;
        priority = stored.priority;
      }

      // Attempt to discover cleaners from URL metadata (if stored)
      let cleaners: string[] = [];
      try {
        const repo = this.orchestrator.getUrlRepository?.();
        const info = repo ? await repo.getUrlInfo(url) : null;
        const used = (info as any)?.metadata?.cleaningMetadata?.cleanersUsed;
        const configured = (info as any)?.metadata?.configuredCleaners || (info as any)?.metadata?.cleaners;
        if (Array.isArray(configured) && configured.length > 0) {
          cleaners = configured;
        } else if (Array.isArray(used)) {
          cleaners = used;
        }
      } catch {}

      if (!scraperType && !parameters && cleaners.length === 0) {
        return null;
      }

      return {
        scraperType: scraperType || 'default',
        parameters: parameters || {},
        cleaners,
        priority: priority || 10
      };
    } catch (error) {
      console.error('Error reading parameters:', error);
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

  async updateTag(id: string, updates: Partial<ITag>): Promise<boolean> {
    await this.ensureInitialized();
    try {
      // Get the tag manager from the orchestrator
      const tagManager = this.orchestrator.getTagManager();
      if (!tagManager) {
        console.error('Tag manager not available');
        return false;
      }

      // Update the tag using the tag manager
      await tagManager.updateTag(id, updates);
      this.emit('tag:updated', { id, updates });
      return true;
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

  /**
   * Resolve multiple IDs to URLs in batch
   * Handles both UUIDs and URL strings
   * @param ids - Array of UUIDs or URL strings
   * @returns Array of actual URL strings
   */
  async resolveUrlsFromIds(ids: string[]): Promise<string[]> {
    await this.ensureInitialized();
    const urls = await this.getUrls();

    return ids.map(id => {
      // If it's already a valid URL, return as-is
      if (id.startsWith('http://') || id.startsWith('https://')) {
        return id;
      }

      // Otherwise, treat as UUID and resolve
      const urlObj = urls.find(u => u.id === id);
      if (!urlObj) {
        console.warn(`[KB3Service] Could not resolve ID to URL: ${id}`);
        return null;
      }
      return urlObj.url;
    }).filter((url): url is string => url !== null);
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
        const statusMapping: { [key: string]: UrlStatus } = {
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

  async removeTagsFromUrlById(id: string, tagNames: string[]): Promise<boolean> {
    const url = await this.getUrlById(id);
    if (!url) {
      throw new Error(`URL not found with id: ${id}`);
    }
    return this.removeTagsFromUrl(url, tagNames);
  }

  async setUrlTags(url: string, tagNames: string[]): Promise<boolean> {
    await this.ensureInitialized();
    // Replace all existing tags with the new set of tags
    // This is a combination of removing all existing tags and adding new ones
    // TODO: Implement in orchestrator
    this.emit('url:tags-replaced', { url, tags: tagNames });
    return true;
  }

  async setUrlTagsById(id: string, tagNames: string[]): Promise<boolean> {
    const url = await this.getUrlById(id);
    if (!url) {
      throw new Error(`URL not found with id: ${id}`);
    }
    return this.setUrlTags(url, tagNames);
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

  // Resolve an input that can be a UUID or a full URL into a URL string
  private async resolveToUrl(idOrUrl: string): Promise<string | null> {
    if (idOrUrl.startsWith('http://') || idOrUrl.startsWith('https://')) {
      return idOrUrl;
    }
    // Try to resolve UUID to URL
    try {
      const url = await this.getUrlById(idOrUrl);
      if (url) return url;
    } catch {}
    return null;
  }

  // Try to locate an original file from the LocalFileStorage path when DB tracking isn't present
  private async findOriginalFromLocalStorage(url: string): Promise<Buffer | null> {
    const fs = await import('fs/promises');
    const path = await import('path');
    try {
      const basePath = path.join(process.cwd(), 'data', 'files');
      let candidates: { path: string; mtime: number }[] = [];
      const entries = await fs.readdir(basePath).catch(() => [] as string[]);
      for (const file of entries) {
        if (file.endsWith('.meta.json')) continue;
        const filePath = path.join(basePath, file);
        const metaPath = `${filePath}.meta.json`;
        try {
          const metaRaw = await fs.readFile(metaPath, 'utf8');
          const meta = JSON.parse(metaRaw);
          const metaUrl = meta?.metadata?.url || meta?.metadata?.sourceUrl;
          if (metaUrl === url) {
            const stat = await fs.stat(filePath);
            candidates.push({ path: filePath, mtime: stat.mtimeMs });
          }
        } catch {
          // ignore invalid metadata
        }
      }
      if (candidates.length === 0) return null;
      candidates.sort((a, b) => b.mtime - a.mtime);
      return await fs.readFile(candidates[0].path);
    } catch {
      return null;
    }
  }

  // Content Access
  async getOriginalContent(idOrUrl: string): Promise<Buffer | null> {
    await this.ensureInitialized();
    try {
      const url = await this.resolveToUrl(idOrUrl);
      if (!url) {
        console.warn('[KB3Service] Could not resolve to URL:', idOrUrl);
        return null;
      }

      const originalRepo = this.orchestrator.getOriginalFileRepository();
      if (originalRepo) {
        const files = await originalRepo.getOriginalFilesByUrl(url);
        if (files && files.length > 0) {
          const latest = files[0];
          const fs = await import('fs/promises');
          return await fs.readFile(latest.filePath);
        }
      }

      // Fallback: scan LocalFileStorage basePath
      const fallback = await this.findOriginalFromLocalStorage(url);
      if (fallback) return fallback;

      // Last-resort fallback: fetch the content live using the configured fetcher
      try {
        const fetcher = (this.orchestrator as any)?.contentFetcher;
        if (fetcher && typeof fetcher.fetch === 'function') {
          const fetched = await fetcher.fetch(url, { maxSize: 100 * 1024 * 1024, timeout: 30000 });
          if (fetched?.content) {
            return Buffer.isBuffer(fetched.content)
              ? fetched.content
              : Buffer.from(fetched.content);
          }
        }
      } catch (e) {
        console.warn('[KB3Service] Live fetch fallback failed:', e);
      }

      return null;
    } catch (error) {
      console.error('Error getting original content:', error);
      return null;
    }
  }

  async getCleanedContent(idOrUrl: string): Promise<string | null> {
    await this.ensureInitialized();
    try {
      const url = await this.resolveToUrl(idOrUrl);
      if (!url) return null;

      // 1) Try processed_files database (preferred)
      try {
        const sqlite3 = require('sqlite3');
        const p = require('path');
        const pdbPath = p.join(process.cwd(), 'data', 'processed_files.db');
        const pdb = new sqlite3.Database(pdbPath);
        const row: any = await new Promise((resolve) => {
          pdb.get(
            "SELECT file_path FROM processed_files WHERE url = ? AND processing_type = 'cleaned' ORDER BY created_at DESC LIMIT 1",
            [url],
            (err: any, r: any) => {
              pdb.close();
              resolve(err ? null : r);
            }
          );
        });
        if (row?.file_path) {
          const fs = await import('fs/promises');
          const buf = await fs.readFile(row.file_path);
          return buf.toString('utf-8');
        }
      } catch {}

      // 2) Legacy metadata location
      try {
        const urlRepository = this.orchestrator.getUrlRepository();
        const info = urlRepository ? await urlRepository.getUrlInfo(url) : null;
        const cleanedPath = (info as any)?.metadata?.cleaningMetadata?.cleanedFilePath;
        if (cleanedPath) {
          const fs = await import('fs/promises');
          const buf = await fs.readFile(cleanedPath);
          return buf.toString('utf-8');
        }
      } catch {}

      // 3) Fallback to knowledge_entries text
      try {
        const sqlite3 = require('sqlite3');
        const db = new sqlite3.Database(this.dbPath);
        const text: string | null = await new Promise((resolve) => {
          db.get(
            "SELECT text FROM knowledge_entries WHERE url = ? ORDER BY created_at DESC LIMIT 1",
            [url],
            (err: any, row: any) => {
              db.close();
              if (err || !row) resolve(null); else resolve(row.text);
            }
          );
        });
        return text || null;
      } catch {}

      return null;
    } catch (error) {
      console.error('Error getting cleaned content:', error);
      return null;
    }
  }

  // Return basic metadata for a URL's content (original + cleaned if available)
  async getContentMetadata(idOrUrl: string): Promise<any> {
    await this.ensureInitialized();
    try {
      const url = await this.resolveToUrl(idOrUrl);
      if (!url) return null;

      const originalRepo = this.orchestrator.getOriginalFileRepository();
      const urlRepository = this.orchestrator.getUrlRepository();

      const files = originalRepo ? await originalRepo.getOriginalFilesByUrl(url) : [];
      const latest = files && files.length > 0 ? files[0] : null;

      const info = urlRepository ? await urlRepository.getUrlInfo(url) : null;
      const cleanedPath = (info as any)?.metadata?.cleaningMetadata?.cleanedFilePath;

      return {
        url,
        original: latest
          ? {
              id: latest.id,
              path: latest.filePath,
              size: latest.size,
              mimeType: latest.mimeType,
              createdAt: latest.createdAt
            }
          : null,
        cleaned: cleanedPath || null
      };
    } catch (error) {
      console.error('Error getting content metadata:', error);
      return null;
    }
  }

  // Reprocess a URL (id or URL) with optional options
  async reprocessUrl(idOrUrl: string, options?: any): Promise<any> {
    await this.ensureInitialized();
    const urls = await this.resolveUrlsFromIds([idOrUrl]);
    if (urls.length === 0) {
      throw new Error(`Could not resolve ID to URL: ${idOrUrl}`);
    }
    return this.orchestrator.processUrl(urls[0], options);
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
        processedUrls: processingStats.successful || urls.filter((u: any) => u.status === 'completed').length,
        failedUrls: processingStats.failed || urls.filter((u: any) => u.status === 'failed').length,
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

    // If something is currently processing, let it finish before picking another
    if (this.processingItems.size > 0) {
      return;
    }

    try {
      // Get pending URLs from repository
      const urlRepository = this.orchestrator.getUrlRepository();
      if (!urlRepository) {
        return;
      }

      // CRITICAL FIX: Use UrlStatus enum, not string
      const pendingUrls = await urlRepository.list({ status: UrlStatus.PENDING });
      if (pendingUrls.length === 0) {
        return;
      }

      // Skip if URL is already queued (extra safety)
      const urlToProcess = pendingUrls.find(u => !this.queuedUrls.has(u.url));
      if (!urlToProcess) {
        return; // Nothing new to process
      }

      // Mark as queued
      this.queuedUrls.add(urlToProcess.url);

      // Preemptively mark URL as processing in the database so the next tick won't pick it again
      try {
        const repo = this.orchestrator.getUrlRepository?.();
        console.log('[KB3Service] Got repository:', !!repo);
        if (repo) {
          const info = await repo.getUrlInfo(urlToProcess.url);
          console.log('[KB3Service] URL info for', urlToProcess.url, ':', info ? `ID=${info.id}, Status=${info.status}` : 'Not found');
          if (info?.id) {
            console.log('[KB3Service] Calling updateStatus with ID:', info.id, 'Status:', UrlStatus.PROCESSING);
            await repo.updateStatus(info.id, UrlStatus.PROCESSING);
            console.log('[KB3Service] Successfully marked URL as processing');
          } else {
            console.error('[KB3Service] No ID found for URL:', urlToProcess.url);
          }
        } else {
          console.error('[KB3Service] Repository not available');
        }
      } catch (e) {
        console.warn('[KB3Service] Could not pre-mark URL as processing:', urlToProcess.url, e);
      }

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

        // Remove from maps/sets after completion
        this.processingItems.delete(urlToProcess.url);
        this.queuedUrls.delete(urlToProcess.url);
      } catch (error) {
        // Update processing item with error
        const item = this.processingItems.get(urlToProcess.url);
        if (item) {
          item.status = 'failed';
          item.completedAt = new Date().toISOString();
          item.error = error instanceof Error ? error.message : 'Unknown error';
        }

        this.emit('queue:error', { url: urlToProcess.url, error });
      } finally {
        // Ensure URL is unblocked even if error occurs
        this.queuedUrls.delete(urlToProcess.url);
      }
    } catch (error) {
      console.error('Error processing queue:', error);
    }
  }

  // Get current queue status
  async getQueueStatus(): Promise<any> {
    await this.ensureInitialized();

    // Get URL repository to fetch actual counts from database
    const urlRepository = this.orchestrator.getUrlRepository();
    
    // Get counts from database by querying each status separately (more efficient)
    let pendingCount = 0;
    let processingCount = 0;
    let completedCount = 0;
    let failedCount = 0;
    
    if (urlRepository) {
      try {
        // Query each status separately with limit 0 to just get counts
        const [pending, processing, completed, failed] = await Promise.all([
          urlRepository.list({ status: UrlStatus.PENDING }),
          urlRepository.list({ status: UrlStatus.PROCESSING }),
          urlRepository.list({ status: UrlStatus.COMPLETED }),
          urlRepository.list({ status: UrlStatus.FAILED })
        ]);
        
        pendingCount = pending.length;
        processingCount = processing.length;
        completedCount = completed.length;
        failedCount = failed.length;
      } catch (error) {
        console.error('[KB3Service] Error getting URL counts:', error);
      }
    }

    // Get current processing items for the queue display
    const queueArray = Array.from(this.processingItems.values());
    const activeQueue = Array.isArray(queueArray) ? queueArray : [];

    return {
      isProcessing: this.isQueueProcessing,
      queue: activeQueue,
      stats: {
        pending: pendingCount,
        processing: processingCount,
        completed: completedCount,
        failed: failedCount
      }
    };
  }

  private async resetStuckProcessingStatuses(): Promise<void> {
    try {
      const repo = this.orchestrator.getUrlRepository?.();
      if (!repo) return;
      const stuck = await repo.list({ status: UrlStatus.PROCESSING });
      for (const u of stuck) {
        await repo.updateStatus(u.id, UrlStatus.PENDING, 'Reset after unclean shutdown');
      }
      if (stuck.length > 0) {
        console.log(`[KB3Service] Reset ${stuck.length} stuck processing URL(s) to pending`);
      }
    } catch (e) {
      console.warn('[KB3Service] Failed to reset stuck statuses:', e);
    }
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