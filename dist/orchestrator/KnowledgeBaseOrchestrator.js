"use strict";
/**
 * Main orchestrator for the knowledge base system
 * Single Responsibility: Coordinates the entire processing pipeline
 * Dependency Inversion: Depends on abstractions, not concrete implementations
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
exports.KnowledgeBaseOrchestrator = void 0;
const IOrchestrator_1 = require("../interfaces/IOrchestrator");
const IUrlRepository_1 = require("../interfaces/IUrlRepository");
const crypto = __importStar(require("crypto"));
class KnowledgeBaseOrchestrator {
    urlDetector;
    contentFetcher;
    contentProcessor;
    knowledgeStore;
    fileStorage;
    urlRepository;
    contentChangeDetector;
    // Processing state tracking
    currentOperations = new Map();
    processingStats = {
        totalProcessed: 0,
        successful: 0,
        failed: 0
    };
    constructor(urlDetector, contentFetcher, contentProcessor, knowledgeStore, fileStorage, urlRepository, contentChangeDetector) {
        this.urlDetector = urlDetector;
        this.contentFetcher = contentFetcher;
        this.contentProcessor = contentProcessor;
        this.knowledgeStore = knowledgeStore;
        this.fileStorage = fileStorage;
        this.urlRepository = urlRepository;
        this.contentChangeDetector = contentChangeDetector;
    }
    async processUrl(url, options = {}) {
        const startTime = Date.now();
        const operationId = this.generateOperationId(url);
        let urlRecordId = null;
        try {
            // Start processing
            this.startOperation(url, operationId, IOrchestrator_1.ProcessingStage.DETECTING);
            // Stage 1: URL Detection
            const classification = await this.detectUrl(url, operationId);
            // Stage 2: Content Fetching
            this.updateOperationStage(operationId, IOrchestrator_1.ProcessingStage.FETCHING);
            const fetchedContent = await this.fetchContent(url, operationId);
            // Calculate content hash
            const contentHash = this.calculateContentHash(fetchedContent.content);
            // Check for content changes if change detector is available
            if (this.contentChangeDetector && !options.forceReprocess) {
                try {
                    const changeResult = await this.contentChangeDetector.hasContentChanged(url, contentHash, {
                        etag: fetchedContent.metadata?.etag,
                        lastModified: fetchedContent.metadata?.lastModified,
                        contentLength: fetchedContent.metadata?.contentLength
                    });
                    if (!changeResult.hasChanged && changeResult.previousHash) {
                        // Content hasn't changed, skip reprocessing
                        this.completeOperation(operationId);
                        this.processingStats.successful++;
                        return {
                            success: true,
                            url,
                            metadata: {
                                skipped: true,
                                reason: 'Content unchanged',
                                contentHash,
                                previousHash: changeResult.previousHash,
                                lastChecked: changeResult.lastChecked
                            },
                            processingTime: Date.now() - startTime
                        };
                    }
                }
                catch (error) {
                    // If change detection fails, continue processing normally
                    // This ensures the system remains available even if change detection has issues
                    console.warn('Content change detection failed, processing anyway:', error);
                }
            }
            // Register/update URL in repository if available
            if (this.urlRepository) {
                const urlExists = await this.urlRepository.exists(url);
                if (urlExists) {
                    const urlInfo = await this.urlRepository.getUrlInfo(url);
                    urlRecordId = urlInfo?.id || null;
                    if (urlRecordId) {
                        await this.urlRepository.updateStatus(urlRecordId, IUrlRepository_1.UrlStatus.PROCESSING);
                    }
                }
                else {
                    // Include scraper information in metadata when registering URL
                    urlRecordId = await this.urlRepository.register(url, {
                        processingStarted: new Date(),
                        scraperUsed: fetchedContent.metadata?.scraperUsed,
                        scraperConfig: fetchedContent.metadata?.scraperConfig,
                        scraperMetadata: fetchedContent.metadata?.scraperMetadata,
                        fetchMetadata: {
                            statusCode: fetchedContent.metadata?.statusCode,
                            headers: fetchedContent.metadata?.headers,
                            contentLength: fetchedContent.metadata?.contentLength
                        }
                    });
                    await this.urlRepository.updateStatus(urlRecordId, IUrlRepository_1.UrlStatus.PROCESSING);
                }
            }
            // Stage 3: Content Processing
            this.updateOperationStage(operationId, IOrchestrator_1.ProcessingStage.PROCESSING);
            const processedContent = await this.processContent(fetchedContent, classification, options, operationId);
            // Check for duplicate content by hash (different URL, same content)
            if (this.urlRepository && !options.forceReprocess) {
                const existingByHash = await this.urlRepository.getByHash(contentHash);
                if (existingByHash && existingByHash.url !== url && existingByHash.status === IUrlRepository_1.UrlStatus.COMPLETED) {
                    // Content already exists with different URL
                    if (urlRecordId) {
                        await this.urlRepository.updateStatus(urlRecordId, IUrlRepository_1.UrlStatus.SKIPPED, 'Duplicate content detected');
                    }
                    return {
                        success: false,
                        url,
                        error: {
                            code: IOrchestrator_1.ErrorCode.DUPLICATE_CONTENT,
                            message: `Content already exists from URL: ${existingByHash.url}`,
                            stage: IOrchestrator_1.ProcessingStage.PROCESSING
                        },
                        metadata: {
                            duplicateContent: true,
                            originalUrl: existingByHash.url,
                            contentHash
                        },
                        processingTime: Date.now() - startTime
                    };
                }
                // Update URL record with content hash
                if (urlRecordId) {
                    await this.urlRepository.updateHash(urlRecordId, contentHash);
                }
            }
            // Record content as processed if change detector is available
            if (this.contentChangeDetector) {
                try {
                    await this.contentChangeDetector.recordContentProcessed(url, contentHash, {
                        etag: fetchedContent.metadata?.etag,
                        lastModified: fetchedContent.metadata?.lastModified
                    });
                }
                catch (error) {
                    // Non-critical error - just log and continue
                    console.warn('Failed to record content as processed:', error);
                }
            }
            // Stage 4: File Storage
            this.updateOperationStage(operationId, IOrchestrator_1.ProcessingStage.STORING);
            const storagePath = await this.storeFile(fetchedContent, url, operationId);
            // Update URL repository with final scraper metadata, rate limit info, and scraping issues
            if (urlRecordId && this.urlRepository) {
                const completeMetadata = {
                    scraperUsed: fetchedContent.metadata?.scraperUsed,
                    scraperConfig: fetchedContent.metadata?.scraperConfig,
                    scraperMetadata: fetchedContent.metadata?.scraperMetadata,
                    // Add rate limiting information
                    rateLimitInfo: fetchedContent.metadata?.rateLimitInfo,
                    // Add scraping issues (errors and warnings)
                    scrapingIssues: fetchedContent.metadata?.scrapingIssues
                };
                // Store complete metadata in the database
                const existingInfo = await this.urlRepository.getUrlInfo(url);
                if (existingInfo) {
                    const updatedMetadata = {
                        ...existingInfo.metadata,
                        ...completeMetadata
                    };
                    // Update metadata by re-registering with updated data
                    await this.urlRepository.register(url, updatedMetadata);
                }
            }
            // Stage 5: Knowledge Indexing
            this.updateOperationStage(operationId, IOrchestrator_1.ProcessingStage.INDEXING);
            // Add scraper metadata to processedContent before indexing
            processedContent.metadata = {
                ...processedContent.metadata,
                scraperUsed: fetchedContent.metadata?.scraperUsed
            };
            const entryId = await this.indexKnowledge(url, processedContent, classification, storagePath, options, operationId);
            // Complete operation
            this.completeOperation(operationId);
            this.processingStats.successful++;
            // Update URL repository status
            if (this.urlRepository && urlRecordId) {
                await this.urlRepository.updateStatus(urlRecordId, IUrlRepository_1.UrlStatus.COMPLETED);
            }
            const result = {
                success: true,
                entryId,
                url,
                contentType: classification.type,
                metadata: {
                    ...processedContent.metadata,
                    classification,
                    contentHash,
                    storagePath,
                    processingStages: this.getCompletedStages(),
                    scraperUsed: fetchedContent.metadata?.scraperUsed,
                    scraperConfig: fetchedContent.metadata?.scraperConfig,
                    rateLimitInfo: fetchedContent.metadata?.rateLimitInfo,
                    scrapingIssues: fetchedContent.metadata?.scrapingIssues
                },
                processingTime: Date.now() - startTime,
                storagePath
            };
            this.processingStats.totalProcessed++;
            return result;
        }
        catch (error) {
            this.processingStats.failed++;
            this.processingStats.totalProcessed++;
            const processingError = this.createProcessingError(error, operationId);
            this.failOperation(operationId, processingError);
            // Update URL repository status
            if (this.urlRepository && urlRecordId) {
                await this.urlRepository.updateStatus(urlRecordId, IUrlRepository_1.UrlStatus.FAILED, processingError.message);
            }
            return {
                success: false,
                url,
                error: processingError,
                metadata: {
                    failedAt: this.getCurrentStage(operationId)
                },
                processingTime: Date.now() - startTime
            };
        }
    }
    async processUrls(urls, options = {}) {
        const results = [];
        const concurrencyLimit = 5; // Process up to 5 URLs concurrently
        // Process URLs in batches
        for (let i = 0; i < urls.length; i += concurrencyLimit) {
            const batch = urls.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(url => this.processUrl(url, options));
            try {
                const batchResults = await Promise.allSettled(batchPromises);
                for (const result of batchResults) {
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    }
                    else {
                        // Create error result for rejected promise
                        results.push({
                            success: false,
                            url: 'unknown',
                            error: {
                                code: IOrchestrator_1.ErrorCode.UNKNOWN_ERROR,
                                message: result.reason?.message || 'Unknown error',
                                stage: IOrchestrator_1.ProcessingStage.DETECTING
                            },
                            metadata: {},
                            processingTime: 0
                        });
                    }
                }
            }
            catch (error) {
                // This shouldn't happen with Promise.allSettled, but handle just in case
                console.error('Unexpected error in batch processing:', error);
            }
        }
        return results;
    }
    /**
     * Process URLs with individual rate limit configurations
     * @param urlConfigs Array of URL configurations with individual settings
     * @param globalOptions Global options applied to all URLs
     */
    async processUrlsWithConfigs(urlConfigs, globalOptions = {}) {
        const results = [];
        const concurrencyLimit = globalOptions.concurrency || 5;
        // Set up per-URL rate limits if contentFetcher supports it
        if (this.contentFetcher && 'setDomainRateLimit' in this.contentFetcher) {
            const fetcher = this.contentFetcher;
            // Apply individual rate limits for each URL's domain
            for (const config of urlConfigs) {
                if (config.rateLimitMs !== undefined) {
                    try {
                        const url = new URL(config.url);
                        fetcher.setDomainRateLimit(url.hostname, config.rateLimitMs);
                    }
                    catch (e) {
                        console.warn(`Invalid URL for rate limit configuration: ${config.url}`);
                    }
                }
            }
        }
        // Process URLs in batches with their individual configurations
        for (let i = 0; i < urlConfigs.length; i += concurrencyLimit) {
            const batch = urlConfigs.slice(i, i + concurrencyLimit);
            const batchPromises = batch.map(config => {
                // Merge global options with URL-specific options
                const mergedOptions = {
                    ...globalOptions,
                    ...config.processingOptions,
                    scraperSpecific: {
                        ...globalOptions.scraperSpecific,
                        ...config.scraperOptions,
                        rateLimitMs: config.rateLimitMs,
                        errorContext: config.url
                    }
                };
                return this.processUrl(config.url, mergedOptions);
            });
            try {
                const batchResults = await Promise.allSettled(batchPromises);
                for (let j = 0; j < batchResults.length; j++) {
                    const result = batchResults[j];
                    const config = batch[j];
                    if (result.status === 'fulfilled') {
                        results.push(result.value);
                    }
                    else {
                        // Create error result with proper URL
                        results.push({
                            success: false,
                            url: config.url,
                            error: {
                                code: IOrchestrator_1.ErrorCode.UNKNOWN_ERROR,
                                message: result.reason?.message || 'Unknown error',
                                stage: IOrchestrator_1.ProcessingStage.DETECTING
                            },
                            metadata: {
                                rateLimitMs: config.rateLimitMs,
                                failureReason: 'Processing failed'
                            },
                            processingTime: 0
                        });
                    }
                }
            }
            catch (error) {
                console.error('Unexpected error in batch processing with configs:', error);
            }
        }
        // Collect and summarize all scraping issues
        if (this.contentFetcher && 'getErrorCollector' in this.contentFetcher) {
            const fetcher = this.contentFetcher;
            const errorCollector = fetcher.getErrorCollector();
            const allIssues = errorCollector.exportIssues();
            // Add summary to results metadata
            for (const result of results) {
                const issues = allIssues.get(result.url);
                if (issues) {
                    result.metadata = result.metadata || {};
                    result.metadata.batchScrapingIssues = {
                        errors: issues.summary.errorCount,
                        warnings: issues.summary.warningCount,
                        critical: issues.summary.criticalErrors
                    };
                }
            }
        }
        return results;
    }
    async reprocessEntry(entryId, options = {}) {
        const entry = await this.knowledgeStore.retrieve(entryId);
        if (!entry) {
            throw new Error(`Knowledge entry not found: ${entryId}`);
        }
        return await this.processUrl(entry.url, options);
    }
    async getStatus() {
        return {
            totalProcessing: this.currentOperations.size,
            completed: this.processingStats.successful,
            failed: this.processingStats.failed,
            pending: 0, // We don't queue operations in this implementation
            currentOperations: Array.from(this.currentOperations.values())
        };
    }
    async detectUrl(url, _operationId) {
        try {
            if (!this.urlDetector.canHandle(url)) {
                throw new Error(`URL detector cannot handle URL: ${url}`);
            }
            return await this.urlDetector.detect(url);
        }
        catch (error) {
            throw this.enhanceError(error, IOrchestrator_1.ErrorCode.UNSUPPORTED_TYPE, IOrchestrator_1.ProcessingStage.DETECTING);
        }
    }
    async fetchContent(url, _operationId) {
        try {
            if (!this.contentFetcher.canFetch(url)) {
                throw new Error(`Content fetcher cannot handle URL: ${url}`);
            }
            return await this.contentFetcher.fetch(url);
        }
        catch (error) {
            const errorCode = this.mapFetchErrorToCode(error);
            throw this.enhanceError(error, errorCode, IOrchestrator_1.ProcessingStage.FETCHING);
        }
    }
    async processContent(fetchedContent, classification, options, _operationId) {
        try {
            if (!this.contentProcessor.canProcess(classification.type)) {
                throw new Error(`Content processor cannot handle type: ${classification.type}`);
            }
            return await this.contentProcessor.process(fetchedContent.content, classification.type, options);
        }
        catch (error) {
            throw this.enhanceError(error, IOrchestrator_1.ErrorCode.PROCESSING_FAILED, IOrchestrator_1.ProcessingStage.PROCESSING);
        }
    }
    async storeFile(fetchedContent, url, _operationId) {
        try {
            const filename = this.generateFilename(url, fetchedContent.mimeType);
            const content = Buffer.isBuffer(fetchedContent.content)
                ? fetchedContent.content
                : Buffer.from(fetchedContent.content);
            return await this.fileStorage.store(content, filename, {
                metadata: {
                    url,
                    mimeType: fetchedContent.mimeType,
                    originalSize: fetchedContent.size,
                    fetchedAt: new Date(),
                    headers: fetchedContent.headers,
                    scraperUsed: fetchedContent.metadata?.scraperUsed
                }
            });
        }
        catch (error) {
            throw this.enhanceError(error, IOrchestrator_1.ErrorCode.STORAGE_FAILED, IOrchestrator_1.ProcessingStage.STORING);
        }
    }
    async indexKnowledge(url, processedContent, classification, storagePath, options, _operationId) {
        try {
            const entry = {
                id: this.generateEntryId(url), // Generate unique ID
                url,
                title: processedContent.title || this.extractTitleFromUrl(url),
                contentType: classification.type,
                text: processedContent.text,
                metadata: {
                    ...processedContent.metadata,
                    classification,
                    storagePath,
                    processingOptions: options
                },
                tags: this.extractTags(processedContent, classification),
                createdAt: new Date(),
                updatedAt: new Date(),
                size: Buffer.byteLength(processedContent.text, 'utf8'),
                checksum: '', // Will be calculated by store
                processingStatus: 'completed'
            };
            return await this.knowledgeStore.store(entry);
        }
        catch (error) {
            throw this.enhanceError(error, IOrchestrator_1.ErrorCode.STORAGE_FAILED, IOrchestrator_1.ProcessingStage.INDEXING);
        }
    }
    generateEntryId(url) {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        const urlHash = Buffer.from(url).toString('base64').substring(0, 8);
        return `entry_${timestamp}_${random}_${urlHash}`;
    }
    generateOperationId(url) {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${this.hashUrl(url)}`;
    }
    hashUrl(url) {
        // Simple hash function for URL
        let hash = 0;
        for (let i = 0; i < url.length; i++) {
            const char = url.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }
    calculateContentHash(content) {
        const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
        return crypto.createHash('sha256').update(buffer).digest('hex');
    }
    startOperation(url, operationId, stage) {
        this.currentOperations.set(operationId, {
            url,
            stage,
            startedAt: new Date(),
            progress: 0
        });
    }
    updateOperationStage(operationId, stage) {
        const operation = this.currentOperations.get(operationId);
        if (operation) {
            operation.stage = stage;
            operation.progress = this.calculateProgress(stage);
        }
    }
    completeOperation(operationId) {
        this.currentOperations.delete(operationId);
    }
    failOperation(operationId, _error) {
        this.currentOperations.delete(operationId);
    }
    getCurrentStage(operationId) {
        const operation = this.currentOperations.get(operationId);
        return operation?.stage || IOrchestrator_1.ProcessingStage.DETECTING;
    }
    calculateProgress(stage) {
        const stageProgress = {
            [IOrchestrator_1.ProcessingStage.DETECTING]: 20,
            [IOrchestrator_1.ProcessingStage.FETCHING]: 40,
            [IOrchestrator_1.ProcessingStage.PROCESSING]: 60,
            [IOrchestrator_1.ProcessingStage.STORING]: 80,
            [IOrchestrator_1.ProcessingStage.INDEXING]: 100
        };
        return stageProgress[stage] || 0;
    }
    getCompletedStages() {
        return [
            IOrchestrator_1.ProcessingStage.DETECTING,
            IOrchestrator_1.ProcessingStage.FETCHING,
            IOrchestrator_1.ProcessingStage.PROCESSING,
            IOrchestrator_1.ProcessingStage.STORING,
            IOrchestrator_1.ProcessingStage.INDEXING
        ];
    }
    createProcessingError(error, operationId) {
        const stage = this.getCurrentStage(operationId);
        if (error.code && Object.values(IOrchestrator_1.ErrorCode).includes(error.code)) {
            return {
                code: error.code,
                message: error.message,
                details: error.details,
                stage
            };
        }
        return {
            code: IOrchestrator_1.ErrorCode.UNKNOWN_ERROR,
            message: error.message || 'Unknown error occurred',
            details: error,
            stage
        };
    }
    enhanceError(originalError, code, stage) {
        const enhanced = new Error(originalError.message);
        enhanced.code = code;
        enhanced.stage = stage;
        enhanced.details = originalError;
        return enhanced;
    }
    mapFetchErrorToCode(error) {
        const message = error.message?.toLowerCase() || '';
        if (message.includes('timeout'))
            return IOrchestrator_1.ErrorCode.TIMEOUT;
        if (message.includes('not found') || message.includes('404'))
            return IOrchestrator_1.ErrorCode.FETCH_FAILED;
        if (message.includes('access denied') || message.includes('403'))
            return IOrchestrator_1.ErrorCode.ACCESS_DENIED;
        if (message.includes('rate limit') || message.includes('429'))
            return IOrchestrator_1.ErrorCode.RATE_LIMITED;
        return IOrchestrator_1.ErrorCode.FETCH_FAILED;
    }
    generateFilename(url, mimeType) {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname;
            const filename = pathname.split('/').pop() || 'content';
            // If filename has no extension, add one based on MIME type
            if (!filename.includes('.')) {
                const extension = this.getExtensionFromMimeType(mimeType);
                return `${filename}${extension}`;
            }
            return filename;
        }
        catch {
            // Invalid URL, generate generic filename
            const extension = this.getExtensionFromMimeType(mimeType);
            const timestamp = Date.now();
            return `content_${timestamp}${extension}`;
        }
    }
    getExtensionFromMimeType(mimeType) {
        const mimeToExt = {
            'application/pdf': '.pdf',
            'text/html': '.html',
            'text/plain': '.txt',
            'application/json': '.json',
            'application/xml': '.xml',
            'text/csv': '.csv',
            'image/png': '.png',
            'image/jpeg': '.jpg',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
        };
        return mimeToExt[mimeType] || '.dat';
    }
    extractTitleFromUrl(url) {
        try {
            const parsedUrl = new URL(url);
            const pathname = parsedUrl.pathname;
            const segments = pathname.split('/').filter(s => s.length > 0);
            if (segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                // Remove extension and decode URI component
                const title = decodeURIComponent(lastSegment.replace(/\.[^.]*$/, ''));
                return title.replace(/[-_]/g, ' ').trim();
            }
            return parsedUrl.hostname;
        }
        catch {
            return 'Unknown Document';
        }
    }
    extractTags(processedContent, classification) {
        const tags = new Set();
        // Add content type as tag
        tags.add(classification.type);
        // Extract tags from metadata
        if (processedContent.metadata?.tags) {
            processedContent.metadata.tags.forEach((tag) => tags.add(tag));
        }
        // Add domain as tag if available
        if (classification.metadata?.domain) {
            tags.add(classification.metadata.domain);
        }
        // Add MIME type category as tag
        if (classification.mimeType) {
            const category = classification.mimeType.split('/')[0];
            tags.add(category);
        }
        return Array.from(tags);
    }
    /**
     * Gets processing statistics
     * @returns Processing statistics
     */
    getProcessingStats() {
        return { ...this.processingStats };
    }
    /**
     * Resets processing statistics
     */
    resetStats() {
        this.processingStats = {
            totalProcessed: 0,
            successful: 0,
            failed: 0
        };
    }
    /**
     * Gets current operations count
     * @returns Number of currently processing operations
     */
    getCurrentOperationsCount() {
        return this.currentOperations.size;
    }
    /**
     * Cancels all current operations (graceful shutdown)
     */
    async cancelAllOperations() {
        this.currentOperations.clear();
    }
}
exports.KnowledgeBaseOrchestrator = KnowledgeBaseOrchestrator;
//# sourceMappingURL=KnowledgeBaseOrchestrator.js.map