/**
 * Interface for batch processing with per-URL configurations
 * Single Responsibility: Defines contract for batch processing options
 */

import { ProcessingOptions } from './IKnowledgeStore';
import { ScraperOptions } from './IScraper';

/**
 * Configuration for individual URL in batch processing
 */
export interface UrlProcessingConfig {
  url: string;
  options?: ProcessingOptions;
  scraperOptions?: ScraperOptions;
  rateLimitMs?: number; // Per-URL rate limit override
  errorContext?: string; // Custom error context for this URL
  skipRateLimit?: boolean; // Skip rate limiting for this specific URL
  priority?: number; // Processing priority (higher = process first)
}

/**
 * Options for batch processing with individual URL configurations
 */
export interface BatchProcessingOptions {
  // Global options applied to all URLs
  globalOptions?: ProcessingOptions;

  // Global scraper options
  globalScraperOptions?: ScraperOptions;

  // Individual URL configurations
  urlConfigs?: UrlProcessingConfig[];

  // Batch processing settings
  concurrency?: number; // Number of URLs to process in parallel
  continueOnError?: boolean; // Continue processing even if some URLs fail

  // Rate limiting settings for the batch
  batchRateLimitMs?: number; // Minimum time between any two requests in the batch
  respectDomainLimits?: boolean; // Whether to respect per-domain rate limits (default: true)

  // Error collection settings
  collectAllErrors?: boolean; // Collect errors from all URLs in the batch
  errorSummaryFormat?: 'detailed' | 'summary' | 'none';
}

/**
 * Result of batch processing with detailed information
 */
export interface BatchProcessingResult {
  successful: Array<{
    url: string;
    result: any;
    processingTime: number;
    rateLimitWaitTime?: number;
  }>;

  failed: Array<{
    url: string;
    error: Error;
    errorContext?: string;
    attempts?: number;
  }>;

  summary: {
    total: number;
    succeeded: number;
    failed: number;
    totalProcessingTime: number;
    totalRateLimitWaitTime: number;
    averageProcessingTime: number;
    domains: Map<string, {
      count: number;
      waitTime: number;
    }>;
  };

  // Aggregated scraping issues from all URLs
  scrapingIssues?: {
    totalErrors: number;
    totalWarnings: number;
    criticalErrors: number;
    byUrl: Map<string, {
      errors: number;
      warnings: number;
      critical: number;
    }>;
  };
}

/**
 * Interface for batch processing with rate limiting
 */
export interface IBatchProcessor {
  /**
   * Process URLs with individual configurations
   */
  processBatch(configs: UrlProcessingConfig[], options?: BatchProcessingOptions): Promise<BatchProcessingResult>;

  /**
   * Process URLs with same options but individual rate limits
   */
  processBatchWithRateLimits(
    urls: string[],
    rateLimits: Map<string, number>,
    options?: ProcessingOptions
  ): Promise<BatchProcessingResult>;

  /**
   * Set domain rate limits for batch processing
   */
  setDomainRateLimitsForBatch(domainLimits: Map<string, number>): void;

  /**
   * Get batch processing statistics
   */
  getBatchStatistics(): BatchProcessingResult['summary'];
}