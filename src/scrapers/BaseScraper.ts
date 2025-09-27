/**
 * Base implementation for scrapers
 * Open/Closed Principle: Base class for extension
 * Template Method Pattern: Provides common functionality
 */

import {
  IScraper,
  ScraperOptions,
  ScrapedContent,
  ScraperFeatures
} from '../interfaces/IScraper';
import type { ScraperSpecificParameters as ScraperParams } from '../interfaces/IScraperParameters';

export abstract class BaseScraper implements IScraper {
  protected readonly name: string;
  protected readonly features: ScraperFeatures;
  protected parameters: ScraperParams | null = null;

  constructor(name: string, features?: Partial<ScraperFeatures>) {
    this.name = name;
    this.features = {
      javascript: false,
      cookies: false,
      proxy: false,
      screenshot: false,
      pdfGeneration: false,
      multiPage: false,
      ...features
    };
  }

  getName(): string {
    return this.name;
  }

  getFeatures(): ScraperFeatures {
    return { ...this.features };
  }

  canHandle(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  abstract scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent>;

  /**
   * Sets scraper-specific parameters
   */
  setParameters(params: ScraperParams): void {
    this.parameters = params;
  }

  /**
   * Gets current scraper parameters
   */
  getParameters(): ScraperParams | null {
    return this.parameters;
  }

  /**
   * Merges options with stored parameters
   */
  protected mergeOptions(options?: ScraperOptions): ScraperOptions {
    if (!options) {
      options = {};
    }

    // If we have stored parameters, merge them with options
    if (this.parameters) {
      options.scraperSpecific = {
        ...this.parameters,
        ...options.scraperSpecific
      };
    }

    return options;
  }

  /**
   * Default batch implementation - can be overridden for optimized batch processing
   */
  async scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]> {
    const results: ScrapedContent[] = [];
    const mergedOptions = this.mergeOptions(options);
    const batchSize = this.getBatchSize(mergedOptions);

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const batchPromises = batch.map(url => this.scrapeWithErrorHandling(url, mergedOptions));
      const batchResults = await Promise.allSettled(batchPromises);

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          // Create error result
          results.push(this.createErrorResult(urls[results.length], result.reason));
        }
      }
    }

    return results;
  }

  /**
   * Determines batch size based on scraper capabilities and configuration
   */
  protected getBatchSize(_options: ScraperOptions): number {
    // Override in specific scrapers if they support different batch sizes
    return 5; // Default concurrent batch size
  }

  protected async scrapeWithErrorHandling(
    url: string,
    options?: ScraperOptions
  ): Promise<ScrapedContent> {
    try {
      return await this.scrape(url, options);
    } catch (error) {
      return this.createErrorResult(url, error);
    }
  }

  protected createErrorResult(url: string, error: any): ScrapedContent {
    return {
      url,
      content: Buffer.from(''),
      mimeType: 'text/plain',
      metadata: {
        error: error?.message || 'Unknown error occurred',
        scraperConfig: this.parameters || undefined
      },
      scraperName: this.name,
      timestamp: new Date()
    };
  }

  protected validateOptions(options?: ScraperOptions): void {
    if (!options) return;

    if (options.timeout && options.timeout < 0) {
      throw new Error('Timeout must be non-negative');
    }

    if (options.retries && options.retries < 0) {
      throw new Error('Retries must be non-negative');
    }
  }
}