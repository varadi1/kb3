/**
 * Registry for content processors
 * Single Responsibility: Manages and coordinates multiple processors
 * Open/Closed Principle: Easy to add new processors
 * Dependency Inversion: Depends on IContentProcessor abstraction
 */

import {
  IContentProcessor,
  ProcessingOptions,
  ProcessedContent
} from '../interfaces/IContentProcessor';
import { ContentType } from '../interfaces/IUrlDetector';

export class ProcessorRegistry implements IContentProcessor {
  private readonly processors: IContentProcessor[];
  private readonly fallbackProcessor?: IContentProcessor;

  constructor(processors: IContentProcessor[] = [], fallbackProcessor?: IContentProcessor) {
    this.processors = [...processors];
    this.fallbackProcessor = fallbackProcessor;
  }

  /**
   * Checks if any processor can handle the content type
   * @param contentType The content type to check
   * @returns true if at least one processor can handle it
   */
  canProcess(contentType: ContentType): boolean {
    return this.processors.some(processor => processor.canProcess(contentType)) ||
           (this.fallbackProcessor?.canProcess(contentType) ?? false);
  }

  /**
   * Adds a new processor to the registry
   * @param processor The processor to add
   */
  addProcessor(processor: IContentProcessor): void {
    this.processors.push(processor);
  }

  /**
   * Removes a processor from the registry
   * @param processor The processor to remove
   */
  removeProcessor(processor: IContentProcessor): boolean {
    const index = this.processors.indexOf(processor);
    if (index !== -1) {
      this.processors.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Processes content using the best available processor
   * @param content The content to process
   * @param contentType The type of content
   * @param options Processing options
   * @returns Promise resolving to processed content
   */
  async process(
    content: Buffer | string,
    contentType: ContentType,
    options: ProcessingOptions = {}
  ): Promise<ProcessedContent> {
    const capableProcessors = this.processors.filter(processor =>
      processor.canProcess(contentType)
    );

    if (capableProcessors.length === 0) {
      if (this.fallbackProcessor && this.fallbackProcessor.canProcess(contentType)) {
        return await this.fallbackProcessor.process(content, contentType, options);
      }
      throw new Error(`No processor can handle content type: ${contentType}`);
    }

    // Try processors in order until one succeeds
    let lastError: Error | null = null;

    for (const processor of capableProcessors) {
      try {
        return await processor.process(content, contentType, options);
      } catch (error: any) {
        lastError = error;
        console.warn(`Processor ${processor.constructor.name} failed for ${contentType}:`, error.message);
        continue;
      }
    }

    // If all specific processors failed, try fallback
    if (this.fallbackProcessor && this.fallbackProcessor.canProcess(contentType)) {
      try {
        return await this.fallbackProcessor.process(content, contentType, options);
      } catch (error: any) {
        console.warn(`Fallback processor failed for ${contentType}:`, error.message);
      }
    }

    throw new Error(`All processors failed for ${contentType}. Last error: ${lastError?.message}`);
  }

  /**
   * Attempts to process using all capable processors and returns results
   * @param content The content to process
   * @param contentType The type of content
   * @param options Processing options
   * @returns Promise resolving to array of processing attempts
   */
  async processAll(
    content: Buffer | string,
    contentType: ContentType,
    options: ProcessingOptions = {}
  ): Promise<ProcessingAttempt[]> {
    const capableProcessors = this.processors.filter(processor =>
      processor.canProcess(contentType)
    );

    const attempts: ProcessingAttempt[] = [];

    for (const processor of capableProcessors) {
      const startTime = Date.now();
      try {
        const result = await processor.process(content, contentType, options);
        attempts.push({
          processor: processor.constructor.name,
          success: true,
          result,
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        attempts.push({
          processor: processor.constructor.name,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    }

    // Try fallback processor if available
    if (this.fallbackProcessor && this.fallbackProcessor.canProcess(contentType)) {
      const startTime = Date.now();
      try {
        const result = await this.fallbackProcessor.process(content, contentType, options);
        attempts.push({
          processor: `${this.fallbackProcessor.constructor.name} (fallback)`,
          success: true,
          result,
          duration: Date.now() - startTime
        });
      } catch (error: any) {
        attempts.push({
          processor: `${this.fallbackProcessor.constructor.name} (fallback)`,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      }
    }

    return attempts.sort((a, b) => {
      // Sort successful attempts first, then by duration
      if (a.success !== b.success) {
        return a.success ? -1 : 1;
      }
      return a.duration - b.duration;
    });
  }

  /**
   * Gets the best processing result from multiple attempts
   * @param content The content to process
   * @param contentType The type of content
   * @param options Processing options
   * @returns Promise resolving to the best processing result
   */
  async processBest(
    content: Buffer | string,
    contentType: ContentType,
    options: ProcessingOptions = {}
  ): Promise<ProcessedContent> {
    const attempts = await this.processAll(content, contentType, options);
    const successfulAttempts = attempts.filter(a => a.success && a.result);

    if (successfulAttempts.length === 0) {
      throw new Error(`No processor could successfully handle content type: ${contentType}`);
    }

    // Return the result from the fastest successful processor
    return successfulAttempts[0].result!;
  }

  /**
   * Gets information about registered processors
   * @returns Array of processor information
   */
  getProcessorInfo(): ProcessorInfo[] {
    const info = this.processors.map(processor => ({
      name: processor.constructor.name,
      supportedTypes: processor.getSupportedTypes(),
      maxTextLength: (processor as any).getMaxTextLength?.() || 'unknown'
    }));

    if (this.fallbackProcessor) {
      info.push({
        name: `${this.fallbackProcessor.constructor.name} (fallback)`,
        supportedTypes: this.fallbackProcessor.getSupportedTypes(),
        maxTextLength: (this.fallbackProcessor as any).getMaxTextLength?.() || 'unknown'
      });
    }

    return info;
  }

  /**
   * Gets all supported content types across all processors
   * @returns Array of supported content types
   */
  getSupportedTypes(): ContentType[] {
    const types = new Set<ContentType>();

    for (const processor of this.processors) {
      for (const type of processor.getSupportedTypes()) {
        types.add(type);
      }
    }

    if (this.fallbackProcessor) {
      for (const type of this.fallbackProcessor.getSupportedTypes()) {
        types.add(type);
      }
    }

    return Array.from(types);
  }

  /**
   * Finds processors that can handle a specific content type
   * @param contentType The content type to check
   * @returns Array of capable processors
   */
  getProcessorsForType(contentType: ContentType): string[] {
    const capableProcessors = this.processors
      .filter(processor => processor.canProcess(contentType))
      .map(processor => processor.constructor.name);

    if (this.fallbackProcessor && this.fallbackProcessor.canProcess(contentType)) {
      capableProcessors.push(`${this.fallbackProcessor.constructor.name} (fallback)`);
    }

    return capableProcessors;
  }

  /**
   * Gets count of registered processors
   * @returns Number of registered processors
   */
  getProcessorCount(): number {
    return this.processors.length + (this.fallbackProcessor ? 1 : 0);
  }

  /**
   * Sets a fallback processor
   * @param processor The fallback processor
   */
  setFallbackProcessor(processor: IContentProcessor): void {
    (this as any).fallbackProcessor = processor;
  }

  /**
   * Clears all registered processors
   */
  clear(): void {
    this.processors.length = 0;
  }

  /**
   * Tests processing capabilities for a content type
   * @param contentType The content type to test
   * @returns Processing capability information
   */
  testCapabilities(contentType: ContentType): ProcessingCapabilities {
    const capableProcessors = this.getProcessorsForType(contentType);

    return {
      contentType,
      isSupported: capableProcessors.length > 0,
      processorCount: capableProcessors.length,
      processors: capableProcessors,
      hasFallback: this.fallbackProcessor?.canProcess(contentType) ?? false
    };
  }
}

export interface ProcessingAttempt {
  processor: string;
  success: boolean;
  result?: ProcessedContent;
  error?: string;
  duration: number;
}

export interface ProcessorInfo {
  name: string;
  supportedTypes: ContentType[];
  maxTextLength: number | string;
}

export interface ProcessingCapabilities {
  contentType: ContentType;
  isSupported: boolean;
  processorCount: number;
  processors: string[];
  hasFallback: boolean;
}