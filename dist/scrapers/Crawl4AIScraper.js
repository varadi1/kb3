"use strict";
/**
 * Crawl4AI scraper implementation with full parameter support
 * Single Responsibility: AI-powered web crawling with Crawl4AI
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Crawl4AIScraper = void 0;
const BaseScraper_1 = require("./BaseScraper");
const IScraper_1 = require("../interfaces/IScraper");
const PythonBridge_1 = require("./PythonBridge");
const path = __importStar(require("path"));
class Crawl4AIScraper extends BaseScraper_1.BaseScraper {
    pythonBridge;
    wrapperPath;
    sessionCache = new Map();
    constructor() {
        super(IScraper_1.ScraperType.CRAWL4AI, {
            javascript: true,
            cookies: true,
            proxy: true,
            screenshot: true,
            pdfGeneration: false,
            multiPage: true
        });
        this.pythonBridge = new PythonBridge_1.PythonBridge();
        this.wrapperPath = path.join(__dirname, 'python_wrappers', 'crawl4ai_wrapper.py');
    }
    async scrape(url, options) {
        // Check if URL can be handled first
        if (!this.canHandle(url)) {
            throw new Error(`Invalid URL: ${url}`);
        }
        this.validateOptions(options);
        const mergedOptions = this.mergeOptions(options);
        const params = this.extractCrawl4AIParams(mergedOptions);
        const startTime = Date.now();
        try {
            // Prepare configuration for Python wrapper
            const crawlerConfig = this.buildCrawlerConfig(params);
            const crawlConfig = this.buildCrawlConfig(params);
            const pythonConfig = {
                url,
                crawler_config: crawlerConfig,
                crawl_config: crawlConfig
            };
            // Execute crawl via Python bridge
            const pythonResult = await this.pythonBridge.execute(this.wrapperPath, [pythonConfig], {
                timeout: params.timeout || 60000
            });
            if (!pythonResult.success) {
                throw new Error(pythonResult.error || 'Python execution failed');
            }
            const result = pythonResult.data;
            if (!result.success) {
                throw new Error(result.error || 'Crawl4AI crawling failed');
            }
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
        }
        catch (error) {
            throw new Error(`Crawl4AI scraping failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    extractCrawl4AIParams(options) {
        const defaults = {
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
            return { ...defaults, ...options.scraperSpecific };
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
    buildCrawlerConfig(params) {
        return {
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
    }
    buildCrawlConfig(params) {
        const config = {
            // Basic configuration
            js_execution: params.jsExecution,
            wait_for: params.waitFor,
            screenshot: params.screenshot,
            bypass_cache: params.bypassCache,
            headers: params.headers,
            user_agent: params.userAgent,
            page_timeout: params.pageTimeout || params.timeout,
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
            delay_before_return_html: params.delayAfter,
            // Cache mode
            cache_mode: this.mapCacheMode(params.cacheMode),
            // Session
            session_id: params.sessionId,
            // Advanced features
            magic: params.magic
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
        return config;
    }
    buildExtractionStrategy(strategy) {
        const strategies = {
            'cosine': { type: 'cosine' },
            'llm': { type: 'llm', provider: 'openai', model: 'gpt-3.5-turbo' },
            'regex': { type: 'regex' }
        };
        return strategies[strategy] || strategies['cosine'];
    }
    buildChunkingStrategy(strategy) {
        const config = {
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
    buildContentFilter(filter) {
        const config = {
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
    mapCacheMode(mode) {
        const modeMap = {
            'enabled': 'enabled',
            'disabled': 'disabled',
            'bypass': 'bypass',
            'write_only': 'write_only',
            'read_only': 'read_only'
        };
        return modeMap[mode || 'enabled'] || 'enabled';
    }
    async processContent(result, params) {
        let content;
        // Choose the best content format based on parameters
        if (result.extracted_content && params.extractionStrategy) {
            content = result.extracted_content;
        }
        else if (result.markdown && params.onlyMainContent) {
            content = result.markdown;
        }
        else if (result.fit_markdown) {
            content = result.fit_markdown;
        }
        else if (result.cleaned_html) {
            content = result.cleaned_html;
        }
        else if (result.fit_html) {
            content = result.fit_html;
        }
        else {
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
    buildMetadata(result, params, startTime) {
        const loadTime = Date.now() - startTime;
        const metadata = {
            title: result.metadata?.title || result.metadata?.page_title || '',
            statusCode: result.status_code || 200,
            loadTime,
            scraperConfig: params,
            scraperMetadata: {
                sessionId: result.session_id || params.sessionId,
                extractionStrategy: params.extractionStrategy,
                linkCount: (result.links?.internal?.length || 0) + (result.links?.external?.length || 0),
                imageCount: result.images?.length || 0,
                videoCount: result.media?.videos?.length || 0,
                audioCount: result.media?.audios?.length || 0,
                cacheMode: params.cacheMode,
                jsExecution: params.jsExecution,
                magic: params.magic,
                crawlDepth: params.maxDepth || 1,
                responseHeaders: result.response_headers
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
                author: result.metadata.author,
                pageTitle: result.metadata.page_title
            };
        }
        // Add links and media if requested
        if ((params.extractionStrategy === 'llm' || params.magic) && metadata.scraperMetadata) {
            metadata.scraperMetadata.links = {
                internal: result.links?.internal || [],
                external: result.links?.external || []
            };
            metadata.scraperMetadata.images = result.images || [];
            metadata.scraperMetadata.media = result.media || { videos: [], audios: [] };
        }
        return metadata;
    }
    canHandle(url) {
        // Crawl4AI is excellent for content extraction and multi-page crawling
        return super.canHandle(url);
    }
    /**
     * Optimized batch scraping for Crawl4AI
     */
    async scrapeBatch(urls, options) {
        const mergedOptions = this.mergeOptions(options);
        const params = this.extractCrawl4AIParams(mergedOptions);
        const results = [];
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
                    }
                    catch (error) {
                        results.push(this.createErrorResult(url, error));
                    }
                }
            }
            else {
                // For single-page crawling, process in parallel
                const batchSize = this.getBatchSize(mergedOptions);
                for (let i = 0; i < urls.length; i += batchSize) {
                    const batch = urls.slice(i, i + batchSize);
                    const batchPromises = batch.map(url => this.scrapeWithErrorHandling(url, mergedOptions));
                    const batchResults = await Promise.allSettled(batchPromises);
                    for (const result of batchResults) {
                        if (result.status === 'fulfilled') {
                            results.push(result.value);
                        }
                        else {
                            results.push(this.createErrorResult(urls[results.length], result.reason));
                        }
                    }
                }
            }
        }
        finally {
            // Python bridge handles cleanup automatically
        }
        return results;
    }
    getBatchSize(options) {
        const params = options.scraperSpecific;
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
    async cleanupSession(sessionId) {
        this.sessionCache.delete(sessionId);
    }
    /**
     * Clean up all resources
     */
    async cleanup() {
        // Clean up session cache
        this.sessionCache.clear();
    }
}
exports.Crawl4AIScraper = Crawl4AIScraper;
//# sourceMappingURL=Crawl4AIScraper.js.map