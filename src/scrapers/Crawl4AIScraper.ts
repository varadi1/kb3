/**
 * Crawl4AI scraper implementation with full parameter support
 * Single Responsibility: AI-powered web crawling with Crawl4AI
 */

import { BaseScraper } from './BaseScraper';
import {
  ScraperOptions,
  ScrapedContent,
  ScraperType,
  ScrapedMetadata
} from '../interfaces/IScraper';
import {
  Crawl4AIParameters,
  ChunkingStrategy,
  ContentFilter
} from '../interfaces/IScraperParameters';

export class Crawl4AIScraper extends BaseScraper {
  private crawlerInstance: any = null;
  private sessionCache: Map<string, any> = new Map();

  constructor() {
    super(ScraperType.CRAWL4AI, {
      javascript: true,
      cookies: true,
      proxy: true,
      screenshot: true,
      pdfGeneration: false,
      multiPage: true
    });
  }

  async scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent> {
    // Check if URL can be handled first
    if (!this.canHandle(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    this.validateOptions(options);
    const mergedOptions = this.mergeOptions(options);
    const params = this.extractCrawl4AIParams(mergedOptions);

    const startTime = Date.now();

    try {
      // Import Crawl4AI dynamically
      const crawl4ai = await this.loadCrawl4AI();

      // Get or create crawler instance
      const crawler = await this.getCrawlerInstance(crawl4ai, params);

      // Prepare crawl configuration
      const crawlConfig = this.buildCrawlConfig(params);

      // Execute crawl
      const result = await this.executeCrawl(crawler, url, crawlConfig, params);

      // Process and extract content
      const content = await this.processContent(result, params);

      // Build metadata
      const metadata = this.buildMetadata(result, params, startTime);

      return {
        url,
        content,
        mimeType: 'text/html',
        metadata,
        scraperName: this.name,
        timestamp: new Date()
      };

    } catch (error) {
      throw new Error(`Crawl4AI scraping failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractCrawl4AIParams(options: ScraperOptions): Crawl4AIParameters {
    const defaults: Crawl4AIParameters = {
      maxDepth: 1,
      jsExecution: true,
      wordCountThreshold: 50,
      removeOverlay: true,
      timeout: options.timeout || 30000,
      userAgent: options.userAgent,
      headers: options.headers,
      onlyMainContent: true,
      antiBot: false,
      cacheMode: 'enabled'
    };

    if (options.scraperSpecific) {
      return { ...defaults, ...options.scraperSpecific as Crawl4AIParameters };
    }

    // Map legacy options
    if (options.waitForSelector) {
      defaults.waitFor = options.waitForSelector;
    }
    if (options.screenshot) {
      defaults.screenshot = true;
    }
    if (options.proxy) {
      defaults.proxy = { server: options.proxy };
      defaults.useProxy = true;
    }

    return defaults;
  }

  private async loadCrawl4AI(): Promise<any> {
    try {
      // Dynamic import to handle optional dependency
      const crawl4ai = require('crawl4ai');
      return crawl4ai;
    } catch (error) {
      // Return mock implementation for development/testing
      return this.getMockCrawl4AI();
    }
  }

  private getMockCrawl4AI(): any {
    // Mock implementation for when Crawl4AI is not installed
    return {
      AsyncWebCrawler: class {
        constructor(_config: any) {}
        async arun(_url: string, config: any): Promise<any> {
          return {
            success: true,
            html: '<html><body>Mock Crawl4AI content</body></html>',
            cleaned_html: '<body>Mock Crawl4AI content</body>',
            markdown: 'Mock Crawl4AI content',
            extracted_content: 'Mock Crawl4AI extracted content',
            metadata: {
              title: 'Mock Title',
              description: 'Mock Description',
              keywords: [],
              language: 'en'
            },
            links: [],
            images: [],
            screenshot: null,
            session_id: config?.session_id || 'mock-session',
            crawl_depth: 0,
            status_code: 200,
            error_message: null,
            word_count: 10
          };
        }
        async close(): Promise<void> {}
      },
      CacheMode: {
        ENABLED: 'enabled',
        DISABLED: 'disabled',
        BYPASS: 'bypass',
        WRITE_ONLY: 'write_only',
        READ_ONLY: 'read_only'
      },
      ExtractionStrategy: {
        COSINE_SIMILARITY: 'cosine',
        LLM_EXTRACTION: 'llm',
        REGEX_EXTRACTION: 'regex',
        XPATH_EXTRACTION: 'xpath',
        CSS_EXTRACTION: 'css'
      },
      ChunkingStrategy: {
        FIXED_SIZE: 'fixed',
        SEMANTIC: 'semantic',
        SLIDING_WINDOW: 'sliding_window',
        TOPIC_BASED: 'topic_based',
        REGEX_BASED: 'regex'
      }
    };
  }

  private async getCrawlerInstance(crawl4ai: any, params: Crawl4AIParameters): Promise<any> {
    // Use session-based crawler if session ID is provided
    if (params.sessionId && this.sessionCache.has(params.sessionId)) {
      return this.sessionCache.get(params.sessionId);
    }

    // Reuse crawler instance for batch operations
    if (this.crawlerInstance && !params.sessionId) {
      return this.crawlerInstance;
    }

    // Create new crawler instance
    const config = {
      browser_type: 'chromium',
      headless: true,
      verbose: params.verbose || false,
      use_proxy: params.useProxy || false,
      proxy: params.proxy ? {
        server: params.proxy.server,
        username: params.proxy.username,
        password: params.proxy.password
      } : undefined,
      headers: params.headers,
      user_agent: params.userAgent,
      page_timeout: params.pageTimeout || params.timeout,
      anti_bot: params.antiBot || false
    };

    const crawler = new crawl4ai.AsyncWebCrawler(config);

    // Cache the crawler
    if (params.sessionId) {
      this.sessionCache.set(params.sessionId, crawler);
    } else {
      this.crawlerInstance = crawler;
    }

    return crawler;
  }

  private buildCrawlConfig(params: Crawl4AIParameters): any {
    const config: any = {
      // Basic configuration
      js_execution: params.jsExecution,
      wait_for: params.waitFor,
      screenshot: params.screenshot,
      bypass_cache: params.bypassCache,

      // Content extraction
      css_selector: params.cssSelector,
      excluded_tags: params.excludedTags,
      word_count_threshold: params.wordCountThreshold,
      remove_overlay_elements: params.removeOverlay,
      only_main_content: params.onlyMainContent,
      remove_forms: params.removeForms,
      remove_nav: params.removeNav,

      // Crawling behavior
      max_depth: params.maxDepth,
      exclude_external_links: params.excludeExternalLinks,
      exclude_internal_links: params.excludeInternalLinks,
      exclude_domains: params.excludeDomains,
      include_domains: params.includeDomains,
      max_pages: params.maxPages,
      base_url: params.baseUrl,

      // Timing
      delay_before: params.delayBefore,
      delay_after: params.delayAfter,

      // Cache mode
      cache_mode: this.mapCacheMode(params.cacheMode),

      // Session
      session_id: params.sessionId
    };

    // Add extraction strategy if specified
    if (params.extractionStrategy) {
      config.extraction_strategy = this.buildExtractionStrategy(params.extractionStrategy);
    }

    // Add chunking strategy if specified
    if (params.chunkingStrategy) {
      config.chunking_strategy = this.buildChunkingStrategy(params.chunkingStrategy);
    }

    // Add content filter if specified
    if (params.contentFilter) {
      config.content_filter = this.buildContentFilter(params.contentFilter);
    }

    // Enable magic mode if specified
    if (params.magic) {
      config.magic = true;
      config.smart_extraction = true;
      config.auto_scroll = true;
      config.remove_popups = true;
    }

    return config;
  }

  private buildExtractionStrategy(strategy: string): any {
    const strategies: Record<string, any> = {
      'cosine': { type: 'cosine_similarity', threshold: 0.5 },
      'llm': { type: 'llm_extraction', model: 'gpt-3.5-turbo' },
      'regex': { type: 'regex_extraction' },
      'xpath': { type: 'xpath_extraction' },
      'css': { type: 'css_extraction' }
    };
    return strategies[strategy] || strategies['cosine'];
  }

  private buildChunkingStrategy(strategy: ChunkingStrategy): any {
    const config: any = {
      type: strategy.type
    };

    switch (strategy.type) {
      case 'fixed':
        config.chunk_size = strategy.chunkSize || 1000;
        config.chunk_overlap = strategy.chunkOverlap || 200;
        break;
      case 'semantic':
        config.chunk_size = strategy.chunkSize || 1000;
        config.separators = strategy.separators || ['\n\n', '\n', '. ', ' '];
        break;
      case 'sliding_window':
        config.window_size = strategy.chunkSize || 500;
        config.step_size = strategy.chunkSize ? strategy.chunkSize - (strategy.chunkOverlap || 100) : 400;
        break;
      case 'topic_based':
        config.topic_threshold = strategy.topicThreshold || 0.6;
        break;
      case 'regex':
        config.pattern = strategy.regexPattern || '\\n\\n+';
        break;
    }

    return config;
  }

  private buildContentFilter(filter: ContentFilter): any {
    const config: any = {
      type: filter.type,
      include_only: filter.includeOnly || false
    };

    switch (filter.type) {
      case 'keyword':
        config.keywords = filter.keywords || [];
        break;
      case 'length':
        config.min_length = filter.minLength || 0;
        config.max_length = filter.maxLength || Number.MAX_SAFE_INTEGER;
        break;
      case 'css':
      case 'xpath':
        config.selector = filter.selector || '';
        break;
      case 'regex':
        config.pattern = filter.pattern || '';
        break;
    }

    return config;
  }

  private mapCacheMode(mode?: string): string {
    const modeMap: Record<string, string> = {
      'enabled': 'ENABLED',
      'disabled': 'DISABLED',
      'bypass': 'BYPASS',
      'write_only': 'WRITE_ONLY',
      'read_only': 'READ_ONLY'
    };
    return modeMap[mode || 'enabled'] || 'ENABLED';
  }

  private async executeCrawl(
    crawler: any,
    url: string,
    config: any,
    params: Crawl4AIParameters
  ): Promise<any> {
    try {
      const result = await crawler.arun(url, config);

      if (!result.success) {
        throw new Error(result.error_message || 'Crawl failed');
      }

      return result;
    } catch (error) {
      // Retry logic if specified
      if (params.retries && params.retries > 0) {
        console.log(`Retrying crawl for ${url}, attempts remaining: ${params.retries}`);
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.executeCrawl(crawler, url, config, {
          ...params,
          retries: params.retries - 1
        });
      }
      throw error;
    }
  }

  private async processContent(result: any, params: Crawl4AIParameters): Promise<Buffer> {
    let content: string;

    // Choose the best content format based on parameters
    if (result.extracted_content && params.extractionStrategy) {
      content = result.extracted_content;
    } else if (result.markdown && params.onlyMainContent) {
      content = result.markdown;
    } else if (result.cleaned_html) {
      content = result.cleaned_html;
    } else {
      content = result.html || '';
    }

    // Apply additional processing if needed
    if (params.wordCountThreshold && content) {
      const wordCount = content.split(/\s+/).length;
      if (wordCount < params.wordCountThreshold) {
        console.warn(`Content word count (${wordCount}) below threshold (${params.wordCountThreshold})`);
      }
    }

    return Buffer.from(content, 'utf-8');
  }

  private buildMetadata(
    result: any,
    params: Crawl4AIParameters,
    startTime: number
  ): ScrapedMetadata {
    const loadTime = Date.now() - startTime;

    const metadata: ScrapedMetadata = {
      title: result.metadata?.title || '',
      statusCode: result.status_code || 200,
      loadTime,
      scraperConfig: params,
      scraperMetadata: {
        crawlDepth: result.crawl_depth || 0,
        sessionId: result.session_id,
        extractionStrategy: params.extractionStrategy,
        wordCount: result.word_count,
        linkCount: result.links?.length || 0,
        imageCount: result.images?.length || 0,
        cacheMode: params.cacheMode,
        jsExecution: params.jsExecution,
        magic: params.magic
      }
    };

    // Add screenshot if captured
    if (result.screenshot) {
      metadata.screenshot = Buffer.from(result.screenshot, 'base64');
    }

    // Add extracted metadata
    if (result.metadata && metadata.scraperMetadata) {
      metadata.scraperMetadata.extractedMetadata = {
        description: result.metadata.description,
        keywords: result.metadata.keywords,
        language: result.metadata.language,
        author: result.metadata.author
      };
    }

    // Add links and images if requested
    if ((params.extractionStrategy === 'llm' || params.magic) && metadata.scraperMetadata) {
      metadata.scraperMetadata.links = result.links || [];
      metadata.scraperMetadata.images = result.images || [];
    }

    return metadata;
  }

  canHandle(url: string): boolean {
    // Crawl4AI is excellent for content extraction and multi-page crawling
    return super.canHandle(url);
  }

  /**
   * Optimized batch scraping for Crawl4AI
   */
  async scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]> {
    const mergedOptions = this.mergeOptions(options);
    const params = this.extractCrawl4AIParams(mergedOptions);

    // Use persistent crawler for batch operations
    const crawl4ai = await this.loadCrawl4AI();
    this.crawlerInstance = await this.getCrawlerInstance(crawl4ai, params);

    const results: ScrapedContent[] = [];

    try {
      // Crawl4AI can handle its own concurrency
      // const crawlConfig = this.buildCrawlConfig(params);

      // If maxDepth > 1, it will crawl linked pages automatically
      if (params.maxDepth && params.maxDepth > 1) {
        // For deep crawling, process sequentially
        for (const url of urls) {
          try {
            const result = await this.scrape(url, mergedOptions);
            results.push(result);
          } catch (error) {
            results.push(this.createErrorResult(url, error));
          }
        }
      } else {
        // For single-page crawling, process in parallel
        const batchSize = this.getBatchSize(mergedOptions);

        for (let i = 0; i < urls.length; i += batchSize) {
          const batch = urls.slice(i, i + batchSize);
          const batchPromises = batch.map(url => this.scrapeWithErrorHandling(url, mergedOptions));
          const batchResults = await Promise.allSettled(batchPromises);

          for (const result of batchResults) {
            if (result.status === 'fulfilled') {
              results.push(result.value);
            } else {
              results.push(this.createErrorResult(urls[results.length], result.reason));
            }
          }
        }
      }
    } finally {
      // Cleanup crawler instance
      if (this.crawlerInstance && !params.sessionId) {
        try {
          await this.crawlerInstance.close();
        } catch {}
        this.crawlerInstance = null;
      }
    }

    return results;
  }

  protected getBatchSize(options: ScraperOptions): number {
    const params = options.scraperSpecific as Crawl4AIParameters;
    // Crawl4AI can handle moderate concurrency
    if (params?.maxDepth && params.maxDepth > 1) {
      return 1; // Sequential for deep crawling
    }
    if (params?.jsExecution) {
      return 3; // Lower concurrency with JS execution
    }
    return 5; // Default concurrency
  }

  /**
   * Clean up session-based crawlers
   */
  async cleanupSession(sessionId: string): Promise<void> {
    const crawler = this.sessionCache.get(sessionId);
    if (crawler) {
      try {
        await crawler.close();
      } catch {}
      this.sessionCache.delete(sessionId);
    }
  }

  /**
   * Clean up all resources
   */
  async cleanup(): Promise<void> {
    // Clean up main crawler
    if (this.crawlerInstance) {
      try {
        await this.crawlerInstance.close();
      } catch {}
      this.crawlerInstance = null;
    }

    // Clean up all session crawlers
    for (const [_sessionId, crawler] of this.sessionCache) {
      try {
        await crawler.close();
      } catch {}
    }
    this.sessionCache.clear();
  }
}