/**
 * Interface Segregation Principle: Focused interface for content processing
 * Single Responsibility Principle: Only responsible for content processing
 */

import { ContentType } from './IUrlDetector';

export interface IContentProcessor {
  /**
   * Gets the content types this processor can handle
   * @returns Array of supported content types
   */
  getSupportedTypes(): ContentType[];

  /**
   * Determines if this processor can handle the given content type
   * @param contentType The content type to check
   * @returns true if this processor can handle the content type
   */
  canProcess(contentType: ContentType): boolean;

  /**
   * Processes the content and extracts meaningful data
   * @param content The content to process
   * @param contentType The type of content
   * @param options Optional processing configuration
   * @returns Promise resolving to processed content
   */
  process(
    content: Buffer | string,
    contentType: ContentType,
    options?: ProcessingOptions
  ): Promise<ProcessedContent>;
}

export interface ProcessingOptions {
  extractImages?: boolean;
  extractLinks?: boolean;
  extractMetadata?: boolean;
  maxTextLength?: number;
  preserveFormatting?: boolean;
  forceReprocess?: boolean;
  concurrency?: number;
  continueOnError?: boolean;
  scraperSpecific?: {
    collectErrors?: boolean;
    timeout?: number;
    [key: string]: any;
  };
}

export interface ProcessedContent {
  text: string;
  title?: string;
  metadata: Record<string, any>;
  images?: ExtractedImage[];
  links?: ExtractedLink[];
  tables?: ExtractedTable[];
  structure?: ContentStructure;
  cleaningMetadata?: CleaningMetadata;
}

export interface CleaningMetadata {
  cleanersUsed: string[];
  cleaningConfig?: {
    format?: string;
    autoSelected?: boolean;
    preservedOriginal?: boolean;
    url?: string;
  };
  statistics: {
    originalLength: number;
    cleanedLength: number;
    compressionRatio: string;
    processingTimeMs: number;
  };
  warnings?: string[];
  cleanedFilePath?: string;
  processedFileId?: string;
}

export interface ExtractedImage {
  src: string;
  alt?: string;
  caption?: string;
  size?: { width: number; height: number };
}

export interface ExtractedLink {
  url: string;
  text: string;
  title?: string;
}

export interface ExtractedTable {
  headers: string[];
  rows: string[][];
  caption?: string;
}

export interface ContentStructure {
  headings: Heading[];
  sections: Section[];
}

export interface Heading {
  level: number;
  text: string;
  id?: string;
}

export interface Section {
  title: string;
  content: string;
  subsections?: Section[];
}