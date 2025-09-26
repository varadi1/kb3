/**
 * Main orchestrator for the knowledge base system
 * Single Responsibility: Coordinates the entire processing pipeline
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */

import {
  IOrchestrator,
  ProcessingOptions,
  ProcessingResult,
  ProcessingStatus,
  CurrentOperation,
  ProcessingStage,
  ProcessingError,
  ErrorCode
} from '../interfaces/IOrchestrator';
import { IUrlDetector, UrlClassification } from '../interfaces/IUrlDetector';
import { IContentFetcher, FetchedContent } from '../interfaces/IContentFetcher';
import { IContentProcessor, ProcessedContent } from '../interfaces/IContentProcessor';
import { IKnowledgeStore, KnowledgeEntry } from '../interfaces/IKnowledgeStore';
import { IFileStorage } from '../interfaces/IFileStorage';

export class KnowledgeBaseOrchestrator implements IOrchestrator {
  private readonly urlDetector: IUrlDetector;
  private readonly contentFetcher: IContentFetcher;
  private readonly contentProcessor: IContentProcessor;
  private readonly knowledgeStore: IKnowledgeStore;
  private readonly fileStorage: IFileStorage;

  // Processing state tracking
  private readonly currentOperations: Map<string, CurrentOperation> = new Map();
  private processingStats = {
    totalProcessed: 0,
    successful: 0,
    failed: 0
  };

  constructor(
    urlDetector: IUrlDetector,
    contentFetcher: IContentFetcher,
    contentProcessor: IContentProcessor,
    knowledgeStore: IKnowledgeStore,
    fileStorage: IFileStorage
  ) {
    this.urlDetector = urlDetector;
    this.contentFetcher = contentFetcher;
    this.contentProcessor = contentProcessor;
    this.knowledgeStore = knowledgeStore;
    this.fileStorage = fileStorage;
  }

  async processUrl(url: string, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const startTime = Date.now();
    const operationId = this.generateOperationId(url);

    try {
      this.startOperation(url, operationId, ProcessingStage.DETECTING);

      // Stage 1: URL Detection
      const classification = await this.detectUrl(url, operationId);

      // Stage 2: Content Fetching
      this.updateOperationStage(operationId, ProcessingStage.FETCHING);
      const fetchedContent = await this.fetchContent(url, operationId);

      // Stage 3: Content Processing
      this.updateOperationStage(operationId, ProcessingStage.PROCESSING);
      const processedContent = await this.processContent(
        fetchedContent,
        classification,
        options,
        operationId
      );

      // Stage 4: File Storage
      this.updateOperationStage(operationId, ProcessingStage.STORING);
      const storagePath = await this.storeFile(fetchedContent, url, operationId);

      // Stage 5: Knowledge Indexing
      this.updateOperationStage(operationId, ProcessingStage.INDEXING);
      const entryId = await this.indexKnowledge(
        url,
        processedContent,
        classification,
        storagePath,
        options,
        operationId
      );

      // Complete operation
      this.completeOperation(operationId);
      this.processingStats.successful++;

      const result: ProcessingResult = {
        success: true,
        entryId,
        url,
        contentType: classification.type,
        metadata: {
          ...processedContent.metadata,
          classification,
          storagePath,
          processingStages: this.getCompletedStages()
        },
        processingTime: Date.now() - startTime,
        storagePath
      };

      this.processingStats.totalProcessed++;
      return result;

    } catch (error) {
      this.processingStats.failed++;
      this.processingStats.totalProcessed++;

      const processingError = this.createProcessingError(error, operationId);
      this.failOperation(operationId, processingError);

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

  async processUrls(urls: string[], options: ProcessingOptions = {}): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
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
          } else {
            // Create error result for rejected promise
            results.push({
              success: false,
              url: 'unknown',
              error: {
                code: ErrorCode.UNKNOWN_ERROR,
                message: result.reason?.message || 'Unknown error',
                stage: ProcessingStage.DETECTING
              },
              metadata: {},
              processingTime: 0
            });
          }
        }
      } catch (error) {
        // This shouldn't happen with Promise.allSettled, but handle just in case
        console.error('Unexpected error in batch processing:', error);
      }
    }

    return results;
  }

  async reprocessEntry(entryId: string, options: ProcessingOptions = {}): Promise<ProcessingResult> {
    const entry = await this.knowledgeStore.retrieve(entryId);
    if (!entry) {
      throw new Error(`Knowledge entry not found: ${entryId}`);
    }

    return await this.processUrl(entry.url, options);
  }

  async getStatus(): Promise<ProcessingStatus> {
    return {
      totalProcessing: this.currentOperations.size,
      completed: this.processingStats.successful,
      failed: this.processingStats.failed,
      pending: 0, // We don't queue operations in this implementation
      currentOperations: Array.from(this.currentOperations.values())
    };
  }

  private async detectUrl(url: string, _operationId: string): Promise<UrlClassification> {
    try {
      if (!this.urlDetector.canHandle(url)) {
        throw new Error(`URL detector cannot handle URL: ${url}`);
      }

      return await this.urlDetector.detect(url);
    } catch (error) {
      throw this.enhanceError(error, ErrorCode.UNSUPPORTED_TYPE, ProcessingStage.DETECTING);
    }
  }

  private async fetchContent(url: string, _operationId: string): Promise<FetchedContent> {
    try {
      if (!this.contentFetcher.canFetch(url)) {
        throw new Error(`Content fetcher cannot handle URL: ${url}`);
      }

      return await this.contentFetcher.fetch(url);
    } catch (error) {
      const errorCode = this.mapFetchErrorToCode(error);
      throw this.enhanceError(error, errorCode, ProcessingStage.FETCHING);
    }
  }

  private async processContent(
    fetchedContent: FetchedContent,
    classification: UrlClassification,
    options: ProcessingOptions,
    _operationId: string
  ): Promise<ProcessedContent> {
    try {
      if (!this.contentProcessor.canProcess(classification.type)) {
        throw new Error(`Content processor cannot handle type: ${classification.type}`);
      }

      return await this.contentProcessor.process(
        fetchedContent.content,
        classification.type,
        options
      );
    } catch (error) {
      throw this.enhanceError(error, ErrorCode.PROCESSING_FAILED, ProcessingStage.PROCESSING);
    }
  }

  private async storeFile(
    fetchedContent: FetchedContent,
    url: string,
    _operationId: string
  ): Promise<string> {
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
          headers: fetchedContent.headers
        }
      });
    } catch (error) {
      throw this.enhanceError(error, ErrorCode.STORAGE_FAILED, ProcessingStage.STORING);
    }
  }

  private async indexKnowledge(
    url: string,
    processedContent: ProcessedContent,
    classification: UrlClassification,
    storagePath: string,
    options: ProcessingOptions,
    _operationId: string
  ): Promise<string> {
    try {
      const entry: KnowledgeEntry = {
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
        processingStatus: 'completed' as any
      };

      return await this.knowledgeStore.store(entry);
    } catch (error) {
      throw this.enhanceError(error, ErrorCode.STORAGE_FAILED, ProcessingStage.INDEXING);
    }
  }

  private generateEntryId(url: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const urlHash = Buffer.from(url).toString('base64').substring(0, 8);
    return `entry_${timestamp}_${random}_${urlHash}`;
  }

  private generateOperationId(url: string): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${this.hashUrl(url)}`;
  }

  private hashUrl(url: string): string {
    // Simple hash function for URL
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      const char = url.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private startOperation(url: string, operationId: string, stage: ProcessingStage): void {
    this.currentOperations.set(operationId, {
      url,
      stage,
      startedAt: new Date(),
      progress: 0
    });
  }

  private updateOperationStage(operationId: string, stage: ProcessingStage): void {
    const operation = this.currentOperations.get(operationId);
    if (operation) {
      operation.stage = stage;
      operation.progress = this.calculateProgress(stage);
    }
  }

  private completeOperation(operationId: string): void {
    this.currentOperations.delete(operationId);
  }

  private failOperation(operationId: string, _error: ProcessingError): void {
    this.currentOperations.delete(operationId);
  }

  private getCurrentStage(operationId: string): ProcessingStage {
    const operation = this.currentOperations.get(operationId);
    return operation?.stage || ProcessingStage.DETECTING;
  }

  private calculateProgress(stage: ProcessingStage): number {
    const stageProgress = {
      [ProcessingStage.DETECTING]: 20,
      [ProcessingStage.FETCHING]: 40,
      [ProcessingStage.PROCESSING]: 60,
      [ProcessingStage.STORING]: 80,
      [ProcessingStage.INDEXING]: 100
    };

    return stageProgress[stage] || 0;
  }

  private getCompletedStages(): ProcessingStage[] {
    return [
      ProcessingStage.DETECTING,
      ProcessingStage.FETCHING,
      ProcessingStage.PROCESSING,
      ProcessingStage.STORING,
      ProcessingStage.INDEXING
    ];
  }

  private createProcessingError(error: any, operationId: string): ProcessingError {
    const stage = this.getCurrentStage(operationId);

    if (error.code && Object.values(ErrorCode).includes(error.code)) {
      return {
        code: error.code,
        message: error.message,
        details: error.details,
        stage
      };
    }

    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message || 'Unknown error occurred',
      details: error,
      stage
    };
  }

  private enhanceError(originalError: any, code: ErrorCode, stage: ProcessingStage): Error {
    const enhanced = new Error(originalError.message);
    (enhanced as any).code = code;
    (enhanced as any).stage = stage;
    (enhanced as any).details = originalError;
    return enhanced;
  }

  private mapFetchErrorToCode(error: any): ErrorCode {
    const message = error.message?.toLowerCase() || '';

    if (message.includes('timeout')) return ErrorCode.TIMEOUT;
    if (message.includes('not found') || message.includes('404')) return ErrorCode.FETCH_FAILED;
    if (message.includes('access denied') || message.includes('403')) return ErrorCode.ACCESS_DENIED;
    if (message.includes('rate limit') || message.includes('429')) return ErrorCode.RATE_LIMITED;

    return ErrorCode.FETCH_FAILED;
  }

  private generateFilename(url: string, mimeType: string): string {
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
    } catch {
      // Invalid URL, generate generic filename
      const extension = this.getExtensionFromMimeType(mimeType);
      const timestamp = Date.now();
      return `content_${timestamp}${extension}`;
    }
  }

  private getExtensionFromMimeType(mimeType: string): string {
    const mimeToExt: Record<string, string> = {
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

  private extractTitleFromUrl(url: string): string {
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
    } catch {
      return 'Unknown Document';
    }
  }

  private extractTags(processedContent: ProcessedContent, classification: UrlClassification): string[] {
    const tags: Set<string> = new Set();

    // Add content type as tag
    tags.add(classification.type);

    // Extract tags from metadata
    if (processedContent.metadata?.tags) {
      processedContent.metadata.tags.forEach((tag: string) => tags.add(tag));
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
  getProcessingStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  /**
   * Resets processing statistics
   */
  resetStats(): void {
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
  getCurrentOperationsCount(): number {
    return this.currentOperations.size;
  }

  /**
   * Cancels all current operations (graceful shutdown)
   */
  async cancelAllOperations(): Promise<void> {
    this.currentOperations.clear();
  }
}

export interface ProcessingStats {
  totalProcessed: number;
  successful: number;
  failed: number;
}