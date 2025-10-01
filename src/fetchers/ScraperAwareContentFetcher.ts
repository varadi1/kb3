/**
 * Content fetcher that integrates with the scraping system
 * Decorator Pattern: Enhances existing fetcher with scraper selection
 * Single Responsibility: Bridges ContentFetcher interface with Scraper system
 */

import { IContentFetcher, FetchedContent, FetchOptions } from '../interfaces/IContentFetcher';
import { ScraperSelector } from '../scrapers/ScraperSelector';
import { ScraperRegistry } from '../scrapers/ScraperRegistry';
import { HttpScraper } from '../scrapers/HttpScraper';
import { IScraper, ScraperOptions } from '../interfaces/IScraper';
import { ScraperParameterManager } from '../scrapers/ScraperParameterManager';
import { IParameterManager } from '../interfaces/IScraperParameters';
import { IRateLimiter } from '../interfaces/IRateLimiter';
import { IErrorCollector } from '../interfaces/IErrorCollector';
import { DomainRateLimiter } from '../scrapers/DomainRateLimiter';
import { ScrapingErrorCollector } from '../scrapers/ScrapingErrorCollector';
import type {
  ScraperConfiguration,
  BatchScraperConfiguration
} from '../interfaces/IScraperParameters';

export class ScraperAwareContentFetcher implements IContentFetcher {
  private readonly scraperSelector: ScraperSelector;
  private readonly scraperRegistry: ScraperRegistry;
  private readonly fallbackFetcher: IContentFetcher;
  private readonly parameterManager: IParameterManager;
  private readonly rateLimiter: IRateLimiter;
  private readonly errorCollector: IErrorCollector;

  constructor(
    fallbackFetcher: IContentFetcher,
    scraperSelector?: ScraperSelector,
    scraperRegistry?: ScraperRegistry,
    parameterManager?: IParameterManager,
    rateLimiter?: IRateLimiter,
    errorCollector?: IErrorCollector
  ) {
    this.fallbackFetcher = fallbackFetcher;
    this.scraperRegistry = scraperRegistry || ScraperRegistry.getInstance();
    this.scraperSelector = scraperSelector || new ScraperSelector(this.scraperRegistry);
    this.parameterManager = parameterManager || new ScraperParameterManager();
    this.rateLimiter = rateLimiter || new DomainRateLimiter();
    this.errorCollector = errorCollector || new ScrapingErrorCollector();

    // Ensure HttpScraper is registered as default
    this.ensureDefaultScraper();
  }

  async fetch(url: string, options?: FetchOptions): Promise<FetchedContent> {
    // Prefer per-URL configured scraper if specified
    let scraper = null as IScraper | null;
    const urlParams = this.parameterManager.getParameters(url) as any;
    if (urlParams?.scraperType) {
      const forced = this.scraperRegistry.get(urlParams.scraperType);
      if (forced && forced.canHandle(url)) {
        scraper = forced;
      }
    }

    // Otherwise, select appropriate scraper by rules/registry
    if (!scraper) {
      scraper = this.scraperSelector.selectScraper(url);
    }

    if (!scraper) {
      // No scraper could handle this URL
      // Get diagnostic information for error message
      const registeredScrapers = this.scraperRegistry.getNames();
      const defaultScraper = this.scraperRegistry.getDefault();

      throw new Error(
        `No scraper available to handle URL: ${url}\n` +
        `Registered scrapers: ${registeredScrapers.length > 0 ? registeredScrapers.join(', ') : 'NONE'}\n` +
        `Default scraper: ${defaultScraper ? defaultScraper.getName() : 'NONE'}\n` +
        `This indicates a system configuration issue. Ensure at least HttpScraper is registered.`
      );
    }

    // Apply URL-specific parameters if configured
    this.applyUrlParameters(scraper, url);

    // Use selected scraper with rate limiting and error collection
    return this.fetchWithScraper(scraper, url, options);
  }

  async fetchBatch(urls: string[], options?: FetchOptions): Promise<FetchedContent[]> {
    // Group URLs by scraper for efficient batch processing
    const scraperGroups = this.scraperSelector.groupUrlsByScaper(urls);
    const results: FetchedContent[] = [];
    const processedUrls = new Set<string>();

    // Process each scraper's batch
    for (const [scraper, scraperUrls] of scraperGroups) {
      const scraperOptions = this.adaptOptions(options);
      const scrapedContents = await scraper.scrapeBatch(scraperUrls, scraperOptions);

      for (const scrapedContent of scrapedContents) {
        results.push(this.convertToFetchedContent(scrapedContent));
        processedUrls.add(scrapedContent.url);
      }
    }

    // Process remaining URLs with fallback fetcher
    const remainingUrls = urls.filter(url => !processedUrls.has(url));
    if (remainingUrls.length > 0) {
      // Check if fallback fetcher has batch support
      if ('fetchBatch' in this.fallbackFetcher) {
        const fallbackResults = await (this.fallbackFetcher as any).fetchBatch(
          remainingUrls,
          options
        );
        results.push(...fallbackResults);
      } else {
        // Fallback to sequential processing
        for (const url of remainingUrls) {
          results.push(await this.fallbackFetcher.fetch(url, options));
        }
      }
    }

    return results;
  }

  canFetch(url: string): boolean {
    // Check if any scraper can handle it
    const scraper = this.scraperSelector.selectScraper(url);
    if (scraper) {
      return true;
    }

    // Check fallback fetcher
    return this.fallbackFetcher.canFetch(url);
  }

  /**
   * Gets the scraper selector for configuration
   */
  getScraperSelector(): ScraperSelector {
    return this.scraperSelector;
  }

  /**
   * Gets the scraper registry for adding new scrapers
   */
  getScraperRegistry(): ScraperRegistry {
    return this.scraperRegistry;
  }

  /**
   * Gets the parameter manager for configuring scraper parameters
   */
  getParameterManager(): IParameterManager {
    return this.parameterManager;
  }

  /**
   * Sets parameters for a specific URL
   */
  async setUrlParameters(url: string, config: ScraperConfiguration): Promise<void> {
    const setParams = (this.parameterManager as any).setParameters(url, config);
    if (setParams instanceof Promise) {
      await setParams;
    }
  }

  /**
   * Sets parameters for multiple URLs in batch
   */
  setBatchParameters(batch: BatchScraperConfiguration): void {
    this.parameterManager.setBatchParameters(batch);
  }

  /**
   * Gets parameters for a specific URL
   */
  getUrlParameters(url: string): ScraperConfiguration | null {
    return this.parameterManager.getParameters(url);
  }

  /**
   * Clears parameters for a URL or all URLs
   */
  clearParameters(url?: string): void {
    this.parameterManager.clearParameters(url);
  }

  /**
   * Sets rate limiting interval for a specific domain
   * @param domain The domain to configure
   * @param intervalMs Minimum interval between requests in milliseconds
   */
  setDomainRateLimit(domain: string, intervalMs: number): void {
    this.rateLimiter.setDomainInterval(domain, intervalMs);
  }

  /**
   * Gets the current rate limiter for external configuration
   */
  getRateLimiter(): IRateLimiter {
    return this.rateLimiter;
  }

  /**
   * Gets the error collector for accessing scraping issues
   */
  getErrorCollector(): IErrorCollector {
    return this.errorCollector;
  }

  /**
   * Gets all scraping issues for a URL
   * @param url The URL to get issues for
   * @returns The scraping issues
   */
  getScrapingIssues(url: string): any {
    return this.errorCollector.getIssues(url);
  }

  /**
   * Clears scraping issues for a URL or all URLs
   * @param url The URL to clear issues for, or undefined for all
   */
  clearScrapingIssues(url?: string): void {
    this.errorCollector.clearIssues(url);
  }

  private async fetchWithScraper(
    scraper: IScraper,
    url: string,
    options?: FetchOptions
  ): Promise<FetchedContent> {
    const domain = DomainRateLimiter.extractDomain(url);
    const scraperOptions = this.adaptOptions(options, url);
    const errorContext = scraperOptions.errorContext || url;
    let waitedMs = 0;

    try {
      // Apply rate limiting unless explicitly skipped
      if (!scraperOptions.skipRateLimit) {
        const startWait = Date.now();
        await this.rateLimiter.waitForDomain(domain);
        waitedMs = Date.now() - startWait;

        if (waitedMs > 0 && scraperOptions.collectErrors !== false) {
          this.errorCollector.recordWarning(
            errorContext,
            `Rate limited: waited ${waitedMs}ms for domain ${domain}`,
            { domain, waitedMs }
          );
        }
      }

      // Record the request
      this.rateLimiter.recordRequest(domain);

      // Scrape the content
      const scrapedContent = await scraper.scrape(url, scraperOptions);

      // Add rate limit info to metadata if we waited
      if (waitedMs > 0) {
        scrapedContent.metadata = scrapedContent.metadata || {};
        scrapedContent.metadata.rateLimitInfo = {
          waitedMs,
          domain,
          requestNumber: (this.rateLimiter as DomainRateLimiter).getStats(domain).requestCount
        };
      }

      // Add collected errors/warnings to metadata
      if (scraperOptions.collectErrors !== false) {
        const issues = this.errorCollector.getIssues(errorContext);
        if (issues.summary.errorCount > 0 || issues.summary.warningCount > 0) {
          scrapedContent.metadata = scrapedContent.metadata || {};
          scrapedContent.metadata.scrapingIssues = {
            errors: issues.errors.map(e => ({
              timestamp: e.timestamp,
              message: e.message,
              severity: e.severity,
              stack: e.stack
            })),
            warnings: issues.warnings.map(w => ({
              timestamp: w.timestamp,
              message: w.message,
              severity: w.severity
            })),
            summary: issues.summary
          };
        }
      }

      return this.convertToFetchedContent(scrapedContent);
    } catch (error) {
      // Record the error
      if (scraperOptions.collectErrors !== false) {
        this.errorCollector.recordError(
          errorContext,
          error instanceof Error ? error : String(error),
          { scraper: scraper.getName(), url, domain }
        );
      }
      throw error;
    }
  }

  /**
   * Applies URL-specific parameters to a scraper
   */
  private applyUrlParameters(scraper: IScraper, url: string): void {
    const config = this.parameterManager.getParameters(url);
    if (config && scraper.setParameters) {
      scraper.setParameters(config.parameters);
    }
  }

  private convertToFetchedContent(scrapedContent: any): FetchedContent {
    return {
      url: scrapedContent.url,
      content: scrapedContent.content,
      mimeType: scrapedContent.mimeType,
      size: scrapedContent.content.length,
      headers: scrapedContent.metadata?.headers || {},
      metadata: {
        statusCode: scrapedContent.metadata?.statusCode,
        headers: scrapedContent.metadata?.headers,
        etag: scrapedContent.metadata?.headers?.etag,
        lastModified: scrapedContent.metadata?.headers?.['last-modified'],
        contentLength: scrapedContent.content.length,
        redirectChain: scrapedContent.metadata?.redirectChain,
        scraperUsed: scrapedContent.scraperName,
        scraperConfig: scrapedContent.metadata?.scraperConfig,
        scraperMetadata: scrapedContent.metadata?.scraperMetadata
      }
    };
  }

  private adaptOptions(options?: FetchOptions, url?: string): ScraperOptions {
    const base: ScraperOptions = options ? {
      timeout: options.timeout,
      headers: options.headers,
      userAgent: options.userAgent
    } : {};

    // Add URL-specific parameters if available
    if (url) {
      const config = this.parameterManager.getParameters(url);
      if (config) {
        base.scraperSpecific = config.parameters;
      }
    }

    return base;
  }

  /**
   * Ensures a default scraper is available (HttpScraper)
   * Follows Single Responsibility: Only ensures basic scraping capability
   * Critical for system stability - HttpScraper must always be available
   */
  private ensureDefaultScraper(): void {
    // Always ensure HttpScraper is registered
    if (!this.scraperRegistry.has('http')) {
      try {
        const httpScraper = new HttpScraper(this.fallbackFetcher);
        this.scraperRegistry.register('http', httpScraper);
      } catch (error) {
        console.error('CRITICAL: Failed to register HttpScraper:', error);
        throw new Error('Cannot initialize scraper system: HttpScraper registration failed');
      }
    }

    // Ensure a default scraper is set
    const defaultScraper = this.scraperRegistry.getDefault();
    if (!defaultScraper) {
      // Set HttpScraper as default if no default is configured
      if (this.scraperRegistry.has('http')) {
        this.scraperRegistry.setDefault('http');
      } else {
        throw new Error('CRITICAL: No default scraper available and HttpScraper registration failed');
      }
    }
  }
}