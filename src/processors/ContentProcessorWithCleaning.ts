/**
 * Content Processor with Text Cleaning Integration
 * Decorator Pattern: Wraps existing processor with cleaning capabilities
 * Single Responsibility: Adds text cleaning to content processing
 */

import {
  IContentProcessor,
  ProcessingOptions,
  ProcessedContent,
  CleaningMetadata
} from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';
import { TextFormat, IChainResult } from '../interfaces/ITextCleaner';
import { TextCleaningOrchestrator } from '../cleaners/TextCleaningOrchestrator';
import { TextCleanerRegistry } from '../cleaners/TextCleanerRegistry';
import { TextCleanerConfigManager } from '../cleaners/TextCleanerConfigManager';
import { IFileStorage } from '../interfaces/IFileStorage';
import { ProcessingType } from '../interfaces/IProcessedFileRepository';

export interface ProcessingOptionsWithCleaning extends ProcessingOptions {
  textCleaning?: {
    enabled: boolean;
    cleanerNames?: string[]; // Specific cleaners to use
    autoSelect?: boolean; // Auto-select cleaners based on content type
    url?: string; // URL for per-URL configuration
    storeMetadata?: boolean; // Store cleaning metadata
    preserveOriginal?: boolean; // Keep original text in metadata
    format?: TextFormat; // Override format detection
    saveCleanedFile?: boolean; // Save cleaned content as a separate file
    originalFileId?: string; // Reference to the original file
  };
}

export interface ProcessedContentWithCleaning extends ProcessedContent {
  cleaningResult?: IChainResult;
  originalText?: string;
  cleanedFilePath?: string; // Path to the saved cleaned file
  processedFileId?: string; // ID of the processed file record
}

export class ContentProcessorWithCleaning implements IContentProcessor {
  private baseProcessor: IContentProcessor;
  private cleaningOrchestrator: TextCleaningOrchestrator;
  private processedFileStorage?: IFileStorage;

  constructor(
    baseProcessor: IContentProcessor,
    orchestrator?: TextCleaningOrchestrator,
    processedFileStorage?: IFileStorage
  ) {
    this.baseProcessor = baseProcessor;
    this.processedFileStorage = processedFileStorage;

    if (!orchestrator) {
      // Initialize with default configuration
      const registry = TextCleanerRegistry.getInstance();
      registry.initializeDefaultCleaners();
      const configManager = new TextCleanerConfigManager();
      orchestrator = new TextCleaningOrchestrator(registry, configManager);
    }

    this.cleaningOrchestrator = orchestrator;
  }

  /**
   * Get supported content types (delegates to base processor)
   */
  getSupportedTypes(): ContentType[] {
    return this.baseProcessor.getSupportedTypes();
  }

  /**
   * Check if can process content type (delegates to base processor)
   */
  canProcess(contentType: ContentType): boolean {
    return this.baseProcessor.canProcess(contentType);
  }

  /**
   * Process content with optional text cleaning
   */
  async process(
    content: Buffer | string,
    contentType: ContentType,
    options?: ProcessingOptionsWithCleaning
  ): Promise<ProcessedContentWithCleaning> {
    // First, process with base processor
    const baseResult = await this.baseProcessor.process(content, contentType, options);

    // Check if text cleaning is enabled
    if (!options?.textCleaning?.enabled) {
      return baseResult;
    }

    // Determine text format based on content type
    const textFormat = this.mapContentTypeToTextFormat(contentType, options.textCleaning.format);

    // Store original text if requested
    const result: ProcessedContentWithCleaning = { ...baseResult };
    if (options.textCleaning.preserveOriginal) {
      result.originalText = baseResult.text;
    }

    try {
      let cleaningResult: IChainResult;

      if (options.textCleaning.cleanerNames && options.textCleaning.cleanerNames.length > 0) {
        // Use specific cleaners
        cleaningResult = await this.cleaningOrchestrator.cleanWithCleaners(
          baseResult.text,
          options.textCleaning.cleanerNames,
          textFormat,
          options.textCleaning.url
        );
      } else if (options.textCleaning.autoSelect !== false) {
        // Auto-select cleaners based on format
        cleaningResult = await this.cleaningOrchestrator.cleanAuto(
          baseResult.text,
          textFormat,
          options.textCleaning.url
        );
      } else {
        // No cleaning specified, return base result
        return result;
      }

      // Update result with cleaned text
      result.text = cleaningResult.finalText;

      // Add cleaning metadata if requested
      if (options.textCleaning.storeMetadata) {
        result.cleaningResult = cleaningResult;

        // Add cleaning info to metadata
        result.metadata = {
          ...result.metadata,
          textCleaning: {
            cleanersUsed: cleaningResult.cleanerResults.map(r => r.metadata.cleanerName),
            totalProcessingTime: cleaningResult.totalProcessingTime,
            originalLength: baseResult.text.length,
            cleanedLength: cleaningResult.finalText.length,
            compressionRatio: (1 - cleaningResult.finalText.length / baseResult.text.length).toFixed(2),
            warnings: cleaningResult.cleanerResults
              .flatMap(r => r.warnings || [])
              .filter((w, i, arr) => arr.indexOf(w) === i) // Unique warnings
          }
        };
      }

      // Always populate cleaningMetadata for standardized access
      const cleaningMetadata: CleaningMetadata = {
        cleanersUsed: cleaningResult.cleanerResults.map(r => r.metadata.cleanerName),
        cleaningConfig: {
          format: textFormat,
          autoSelected: options.textCleaning.autoSelect,
          preservedOriginal: options.textCleaning.preserveOriginal,
          url: options.textCleaning.url
        },
        statistics: {
          originalLength: baseResult.text.length,
          cleanedLength: cleaningResult.finalText.length,
          compressionRatio: (1 - cleaningResult.finalText.length / baseResult.text.length).toFixed(2),
          processingTimeMs: cleaningResult.totalProcessingTime
        },
        warnings: cleaningResult.cleanerResults
          .flatMap(r => r.warnings || [])
          .filter((w, i, arr) => arr.indexOf(w) === i)
      };

      result.cleaningMetadata = cleaningMetadata;

      // Save cleaned file if requested and storage is available
      if (options.textCleaning.saveCleanedFile && this.processedFileStorage) {
        try {
          const cleanedContent = Buffer.from(result.text, 'utf8');
          const filename = `cleaned_${Date.now()}.txt`;

          const storagePath = await this.processedFileStorage.store(
            cleanedContent,
            filename,
            {
              metadata: {
                url: options.textCleaning.url || 'unknown',
                mimeType: 'text/plain',
                originalFileId: options.textCleaning.originalFileId,
                processingType: ProcessingType.CLEANED,
                cleanersUsed: cleaningResult.cleanerResults.map(r => r.metadata.cleanerName),
                cleaningConfig: {
                  format: textFormat,
                  autoSelected: options.textCleaning.autoSelect,
                  preservedOriginal: options.textCleaning.preserveOriginal
                },
                contentType: contentType,
                originalLength: baseResult.text.length,
                cleanedLength: result.text.length
              }
            }
          );

          result.cleanedFilePath = storagePath;

          // Extract processed file ID from metadata if available
          const metadata = await this.processedFileStorage.getMetadata(storagePath);
          if (metadata?.metadata?.processedFileId) {
            result.processedFileId = metadata.metadata.processedFileId;
          }

          // Add file paths to cleaningMetadata
          if (result.cleaningMetadata) {
            result.cleaningMetadata.cleanedFilePath = storagePath;
            result.cleaningMetadata.processedFileId = result.processedFileId;
          }

          console.log(`Cleaned content saved to: ${storagePath}`);
        } catch (error) {
          console.error('Failed to save cleaned file:', error);
          result.metadata = {
            ...result.metadata,
            fileSaveError: error instanceof Error ? error.message : 'Unknown error'
          };
        }
      }

      console.log(`Text cleaning applied: ${baseResult.text.length} -> ${result.text.length} characters`);
    } catch (error) {
      console.error('Text cleaning failed, using uncleaned text:', error);

      // Add error to metadata
      result.metadata = {
        ...result.metadata,
        textCleaningError: error instanceof Error ? error.message : 'Unknown error'
      };
    }

    return result;
  }

  /**
   * Map content type to text format
   */
  private mapContentTypeToTextFormat(contentType: ContentType, override?: TextFormat): TextFormat {
    if (override) {
      return override;
    }

    switch (contentType) {
      case ContentType.HTML:
      case ContentType.WEBPAGE:
        return TextFormat.HTML;

      case ContentType.MARKDOWN:
        return TextFormat.MARKDOWN;

      case ContentType.JSON:
      case ContentType.XML:
        return TextFormat.PLAIN_TEXT;

      case ContentType.PDF:
      case ContentType.DOC:
      case ContentType.DOCX:
      case ContentType.TEXT:
      case ContentType.RTF:
        return TextFormat.PLAIN_TEXT;

      default:
        return TextFormat.MIXED;
    }
  }

  /**
   * Configure cleaners for a specific URL
   */
  async configureCleanersForUrl(
    url: string,
    cleanerConfigs: Map<string, any>
  ): Promise<void> {
    await this.cleaningOrchestrator.configureForUrl(url, cleanerConfigs);
  }

  /**
   * Batch configure cleaners for multiple URLs
   */
  async batchConfigureCleaners(
    urls: string[],
    cleanerName: string,
    config: any
  ): Promise<void> {
    await this.cleaningOrchestrator.batchConfigureUrls(urls, cleanerName, config);
  }

  /**
   * Get cleaning configuration for a URL
   */
  async getUrlCleaningConfig(url: string): Promise<Map<string, any>> {
    return await this.cleaningOrchestrator.getUrlConfiguration(url);
  }

  /**
   * Apply configuration template to URLs matching pattern
   */
  async applyCleaningTemplate(
    urlPattern: string | RegExp,
    cleanerName: string,
    config: any
  ): Promise<number> {
    return await this.cleaningOrchestrator.applyConfigurationTemplate(urlPattern, cleanerName, config);
  }

  /**
   * Get statistics about text cleaning
   */
  getCleaningStats(): any {
    return this.cleaningOrchestrator.getStats();
  }

  /**
   * Export cleaning configurations
   */
  exportCleaningConfigurations(): any {
    return this.cleaningOrchestrator.exportConfigurations();
  }
}