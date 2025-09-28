/**
 * Open/Closed Principle: Extends base orchestrator without modifying it
 * Single Responsibility: Adds original file tracking to the orchestration process
 */

import { KnowledgeBaseOrchestrator } from './KnowledgeBaseOrchestrator';
import { IOriginalFileRepository, OriginalFileInfo } from '../interfaces/IOriginalFileRepository';
import { IUrlDetector } from '../interfaces/IUrlDetector';
import { IContentFetcher } from '../interfaces/IContentFetcher';
import { IContentProcessor } from '../interfaces/IContentProcessor';
import { IFileStorage } from '../interfaces/IFileStorage';
import { IKnowledgeStore } from '../interfaces/IKnowledgeStore';
import { IUrlRepository } from '../interfaces/IUrlRepository';
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
import { ProcessingOptions } from '../interfaces/IContentProcessor';
import * as crypto from 'crypto';

export class KnowledgeBaseOrchestratorWithFileTracking extends KnowledgeBaseOrchestrator {
  private originalFileRepository: IOriginalFileRepository;

  constructor(
    urlDetector: IUrlDetector,
    contentFetcher: IContentFetcher,
    contentProcessor: IContentProcessor,
    knowledgeStore: IKnowledgeStore,
    fileStorage: IFileStorage,
    urlRepository: IUrlRepository | undefined,
    contentChangeDetector: IContentChangeDetector | undefined,
    originalFileRepository: IOriginalFileRepository
  ) {
    super(
      urlDetector,
      contentFetcher,
      contentProcessor,
      knowledgeStore,
      fileStorage,
      urlRepository,
      contentChangeDetector
    );
    this.originalFileRepository = originalFileRepository;
  }

  /**
   * Override processUrl to add file tracking
   */
  async processUrl(
    url: string,
    options: ProcessingOptions = {}
  ): Promise<any> {
    // Call the parent processUrl method
    const result = await super.processUrl(url, options);

    // If processing was successful and we have a storage path, track the original file
    if (result.success && result.storagePath) {
      try {
        // Get the fetched content metadata from the result
        const fetchedContent = result.metadata?.fetchedContent || {};

        // Calculate checksum if we have content
        const content = fetchedContent.content;
        const checksum = content
          ? crypto.createHash('sha256').update(
              Buffer.isBuffer(content) ? content : Buffer.from(content)
            ).digest('hex')
          : 'unknown';

        const fileInfo: OriginalFileInfo = {
          url,
          filePath: result.storagePath,
          mimeType: fetchedContent.mimeType || result.contentType || 'unknown',
          size: fetchedContent.size || 0,
          checksum,
          scraperUsed: result.metadata?.scraperUsed,
          metadata: {
            headers: fetchedContent.headers,
            scraperConfig: result.metadata?.scraperConfig,
            scraperMetadata: result.metadata?.scraperMetadata,
            fetchedAt: new Date().toISOString(),
            processingResult: {
              entryId: result.entryId,
              contentType: result.contentType
            }
          }
        };

        const fileId = await this.originalFileRepository.recordOriginalFile(fileInfo);

        // Add the original file ID to the result metadata
        result.metadata = {
          ...result.metadata,
          originalFileId: fileId
        };
      } catch (error) {
        // Log error but don't fail the entire process
        console.error('Failed to track original file:', error);
        result.metadata = {
          ...result.metadata,
          originalFileTrackingError: error
        };
      }
    }

    return result;
  }

  /**
   * Get the original file repository for direct access
   */
  getOriginalFileRepository(): IOriginalFileRepository {
    return this.originalFileRepository;
  }
}