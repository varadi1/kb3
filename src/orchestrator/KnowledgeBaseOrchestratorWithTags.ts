/**
 * Enhanced orchestrator with tag support for batch operations
 * Open/Closed: Extends KnowledgeBaseOrchestrator without modifying it
 * Single Responsibility: Adds tag-based batch processing capabilities
 */

import { KnowledgeBaseOrchestrator } from './KnowledgeBaseOrchestrator';
import { SqlUrlRepositoryWithTags, UrlMetadataWithTags } from '../storage/SqlUrlRepositoryWithTags';
import { IUrlDetector } from '../interfaces/IUrlDetector';
import { IContentFetcher } from '../interfaces/IContentFetcher';
import { IContentProcessor } from '../interfaces/IContentProcessor';
import { IKnowledgeStore } from '../interfaces/IKnowledgeStore';
import { IFileStorage } from '../interfaces/IFileStorage';
import { IContentChangeDetector } from '../interfaces/IContentChangeDetector';
import { ProcessingOptions, ProcessingResult } from '../interfaces/IOrchestrator';
import { ITag } from '../interfaces/ITag';
import { ErrorHandler } from '../utils/ErrorHandler';

export interface ProcessingOptionsWithTags extends ProcessingOptions {
  tags?: string[];
}

export interface UrlWithTags {
  url: string;
  tags?: string[];
  metadata?: UrlMetadataWithTags;
}

export interface BatchProcessingByTagOptions extends ProcessingOptions {
  includeChildTags?: boolean;
  requireAllTags?: boolean;
}

export class KnowledgeBaseOrchestratorWithTags extends KnowledgeBaseOrchestrator {
  private urlRepositoryWithTags?: SqlUrlRepositoryWithTags;

  constructor(
    urlDetector: IUrlDetector,
    contentFetcher: IContentFetcher,
    contentProcessor: IContentProcessor,
    knowledgeStore: IKnowledgeStore,
    fileStorage: IFileStorage,
    urlRepository?: SqlUrlRepositoryWithTags,
    contentChangeDetector?: IContentChangeDetector
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

    this.urlRepositoryWithTags = urlRepository;
  }

  /**
   * Process a single URL with optional tags
   */
  async processUrlWithTags(
    url: string,
    options: ProcessingOptionsWithTags = {}
  ): Promise<ProcessingResult> {
    try {
      // If tags are provided and URL repository supports tags
      if (options.tags && options.tags.length > 0 && this.urlRepositoryWithTags) {
        // Ensure repository is initialized
        if (!(this.urlRepositoryWithTags as any).tagManager) {
          await this.urlRepositoryWithTags.initializeWithTags();
        }

        // Register URL with tags before processing
        const metadata: UrlMetadataWithTags = {
          tags: options.tags,
          processingStarted: new Date()
        };

        await this.urlRepositoryWithTags.registerWithTags(url, metadata);
      }

      // Process the URL using parent method
      const result = await this.processUrl(url, options);

      // Add tags to result metadata if available
      if (this.urlRepositoryWithTags && result.success) {
        const tags = await this.urlRepositoryWithTags.getUrlTags(url);
        result.metadata = {
          ...result.metadata,
          tags: tags.map(t => t.name)
        };
      }

      return result;
    } catch (error) {
      throw ErrorHandler.createError(
        'PROCESS_URL_WITH_TAGS_ERROR',
        'Failed to process URL with tags',
        { url, options, error }
      );
    }
  }

  /**
   * Process multiple URLs with tags
   */
  async processUrlsWithTags(
    urlsWithTags: UrlWithTags[],
    globalOptions: ProcessingOptions = {}
  ): Promise<ProcessingResult[]> {
    const results: ProcessingResult[] = [];
    const concurrencyLimit = globalOptions.concurrency || 5;

    // Process URLs in batches
    for (let i = 0; i < urlsWithTags.length; i += concurrencyLimit) {
      const batch = urlsWithTags.slice(i, i + concurrencyLimit);

      const batchPromises = batch.map(item => {
        const options: ProcessingOptionsWithTags = {
          ...globalOptions,
          tags: item.tags
        };
        return this.processUrlWithTags(item.url, options);
      });

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
                code: 'PROCESSING_ERROR' as any,
                message: result.reason?.message || 'Processing failed',
                stage: 'UNKNOWN' as any
              },
              metadata: {},
              processingTime: 0
            });
          }
        }
      } catch (error) {
        console.error('Batch processing error:', error);
      }
    }

    return results;
  }

  /**
   * Process all URLs with specific tags
   */
  async processUrlsByTags(
    tagNames: string[],
    options: BatchProcessingByTagOptions = {}
  ): Promise<ProcessingResult[]> {
    if (!this.urlRepositoryWithTags) {
      throw ErrorHandler.createError(
        'NO_TAG_SUPPORT',
        'URL repository does not support tags',
        {}
      );
    }

    try {
      // Get all URLs with the specified tags
      const urlRecords = await this.urlRepositoryWithTags.getUrlsByTags(
        tagNames,
        options.requireAllTags || false
      );

      // If including child tags, get URLs with child tags too
      if (options.includeChildTags) {
        const tagManager = this.urlRepositoryWithTags.getTagManager();
        const allTagNames = new Set(tagNames);

        // Get child tags for each specified tag
        for (const tagName of tagNames) {
          const tag = await tagManager.getTagByName(tagName);
          if (tag) {
            const childTags = await tagManager.getChildTags(tag.id, true);
            childTags.forEach(child => allTagNames.add(child.name));
          }
        }

        // Get URLs with expanded tag list if different
        if (allTagNames.size > tagNames.length) {
          const expandedUrlRecords = await this.urlRepositoryWithTags.getUrlsByTags(
            Array.from(allTagNames),
            options.requireAllTags || false
          );

          // Merge and deduplicate URLs
          const urlMap = new Map(urlRecords.map(r => [r.url, r]));
          expandedUrlRecords.forEach(r => urlMap.set(r.url, r));
          urlRecords.length = 0;
          urlRecords.push(...urlMap.values());
        }
      }

      // Process the URLs
      const results = await this.processUrls(
        urlRecords.map(r => r.url),
        options
      );

      // Add tag information to results
      results.forEach((result, index) => {
        if (urlRecords[index] && urlRecords[index].tags) {
          result.metadata = {
            ...result.metadata,
            tags: urlRecords[index].tags!.map(t => t.name)
          };
        }
      });

      return results;
    } catch (error) {
      throw ErrorHandler.createError(
        'PROCESS_BY_TAGS_ERROR',
        'Failed to process URLs by tags',
        { tagNames, options, error }
      );
    }
  }

  /**
   * Add tags to a URL
   */
  async addTagsToUrl(url: string, tagNames: string[]): Promise<boolean> {
    if (!this.urlRepositoryWithTags) {
      throw ErrorHandler.createError(
        'NO_TAG_SUPPORT',
        'URL repository does not support tags',
        {}
      );
    }

    return await this.urlRepositoryWithTags.addTagsToUrl(url, tagNames);
  }

  /**
   * Remove tags from a URL
   */
  async removeTagsFromUrl(url: string, tagNames: string[]): Promise<boolean> {
    if (!this.urlRepositoryWithTags) {
      throw ErrorHandler.createError(
        'NO_TAG_SUPPORT',
        'URL repository does not support tags',
        {}
      );
    }

    return await this.urlRepositoryWithTags.removeTagsFromUrl(url, tagNames);
  }

  /**
   * Get all tags for a URL
   */
  async getUrlTags(url: string): Promise<ITag[]> {
    if (!this.urlRepositoryWithTags) {
      return [];
    }

    return await this.urlRepositoryWithTags.getUrlTags(url);
  }

  /**
   * Create a new tag
   */
  async createTag(name: string, parentName?: string, description?: string): Promise<ITag> {
    if (!this.urlRepositoryWithTags) {
      throw ErrorHandler.createError(
        'NO_TAG_SUPPORT',
        'URL repository does not support tags',
        {}
      );
    }

    const tagManager = this.urlRepositoryWithTags.getTagManager();

    let parentId: string | undefined;
    if (parentName) {
      const parent = await tagManager.getTagByName(parentName);
      if (!parent) {
        throw ErrorHandler.createError(
          'PARENT_TAG_NOT_FOUND',
          'Parent tag does not exist',
          { parentName }
        );
      }
      parentId = parent.id;
    }

    return await tagManager.createTag({
      name,
      parentId,
      description
    });
  }

  /**
   * List all tags
   */
  async listTags(): Promise<ITag[]> {
    if (!this.urlRepositoryWithTags) {
      return [];
    }

    const tagManager = this.urlRepositoryWithTags.getTagManager();
    return await tagManager.listTags();
  }

  /**
   * Delete a tag
   */
  async deleteTag(tagName: string, deleteChildren: boolean = false): Promise<boolean> {
    if (!this.urlRepositoryWithTags) {
      throw ErrorHandler.createError(
        'NO_TAG_SUPPORT',
        'URL repository does not support tags',
        {}
      );
    }

    const tagManager = this.urlRepositoryWithTags.getTagManager();
    const tag = await tagManager.getTagByName(tagName);

    if (!tag) {
      throw ErrorHandler.createError(
        'TAG_NOT_FOUND',
        'Tag does not exist',
        { tagName }
      );
    }

    return await tagManager.deleteTag(tag.id, deleteChildren);
  }

  /**
   * Get tag hierarchy
   */
  async getTagHierarchy(tagName: string): Promise<ITag[]> {
    if (!this.urlRepositoryWithTags) {
      return [];
    }

    const tagManager = this.urlRepositoryWithTags.getTagManager();
    const tag = await tagManager.getTagByName(tagName);

    if (!tag) {
      return [];
    }

    return await tagManager.getTagPath(tag.id);
  }
}