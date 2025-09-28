/**
 * Interface for batch processing with per-URL configurations
 * Single Responsibility: Defines contract for batch processing options
 */
import { ProcessingOptions } from './IContentProcessor';
import { ScraperOptions } from './IScraper';
/**
 * Configuration for individual URL in batch processing
 */
export interface UrlProcessingConfig {
    url: string;
    options?: ProcessingOptions;
    scraperOptions?: ScraperOptions;
    rateLimitMs?: number;
    errorContext?: string;
    skipRateLimit?: boolean;
    priority?: number;
}
/**
 * Options for batch processing with individual URL configurations
 */
export interface BatchProcessingOptions {
    globalOptions?: ProcessingOptions;
    globalScraperOptions?: ScraperOptions;
    urlConfigs?: UrlProcessingConfig[];
    concurrency?: number;
    continueOnError?: boolean;
    batchRateLimitMs?: number;
    respectDomainLimits?: boolean;
    collectAllErrors?: boolean;
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
    processBatchWithRateLimits(urls: string[], rateLimits: Map<string, number>, options?: ProcessingOptions): Promise<BatchProcessingResult>;
    /**
     * Set domain rate limits for batch processing
     */
    setDomainRateLimitsForBatch(domainLimits: Map<string, number>): void;
    /**
     * Get batch processing statistics
     */
    getBatchStatistics(): BatchProcessingResult['summary'];
}
//# sourceMappingURL=IBatchProcessingOptions.d.ts.map