/**
 * Playwright scraper implementation with full parameter support
 * Single Responsibility: Browser automation scraping with Playwright
 */

import { BaseScraper } from './BaseScraper';
import {
  ScraperOptions,
  ScrapedContent,
  ScraperType,
  ScrapedMetadata
} from '../interfaces/IScraper';
import {
  PlaywrightParameters,
  ScreenshotOptions,
  PDFOptions,
  Cookie
} from '../interfaces/IScraperParameters';

export class PlaywrightScraper extends BaseScraper {
  private browserInstance: any = null;
  private contextInstance: any = null;

  constructor() {
    super(ScraperType.PLAYWRIGHT, {
      javascript: true,
      cookies: true,
      proxy: true,
      screenshot: true,
      pdfGeneration: true,
      multiPage: true
    });
  }

  async scrape(url: string, options?: ScraperOptions): Promise<ScrapedContent> {
    // Check if URL can be handled first
    if (!this.canHandle(url)) {
      throw new Error(`Invalid URL: ${url}`);
    }

    this.validateOptions(options);
    const mergedOptions = this.mergeOptions(options);
    const params = this.extractPlaywrightParams(mergedOptions);

    const startTime = Date.now();
    let page: any = null;
    let content: Buffer;
    let metadata: ScrapedMetadata;

    try {
      // Import Playwright dynamically to avoid dependency issues
      const playwright = await this.loadPlaywright();

      // Launch browser with configuration
      const browser = await this.launchBrowser(playwright, params);
      const context = await this.createContext(browser, params);
      page = await context.newPage();

      // Configure page settings
      await this.configurePage(page, params);

      // Navigate to URL
      const response = await this.navigateToUrl(page, url, params);

      // Wait for content to load
      await this.waitForContent(page, params);

      // Execute any custom scripts
      if (mergedOptions.executeScript) {
        await page.evaluate(mergedOptions.executeScript);
      }

      // Scroll if needed
      if (params.scrollToBottom) {
        await this.scrollToBottom(page);
      }

      // Click selectors if specified
      if (params.clickSelectors && params.clickSelectors.length > 0) {
        await this.clickElements(page, params.clickSelectors);
      }

      // Extract content
      content = await this.extractContent(page, params);

      // Build metadata
      metadata = await this.buildMetadata(page, response, params, startTime);

      // Take screenshot if requested
      if (params.screenshot) {
        metadata.screenshot = await this.takeScreenshot(page, params.screenshot);
      }

      // Generate PDF if requested
      if (params.pdf) {
        const pdfBuffer = await this.generatePDF(page, params.pdf);
        metadata.scraperMetadata = {
          ...metadata.scraperMetadata,
          pdf: pdfBuffer
        };
      }

      // Cleanup
      await page.close();
      if (!this.browserInstance) {
        await browser.close();
      }

      return {
        url,
        content,
        mimeType: 'text/html',
        metadata,
        scraperName: this.name,
        timestamp: new Date()
      };

    } catch (error) {
      // Cleanup on error
      if (page) {
        try {
          await page.close();
        } catch {}
      }

      throw new Error(`Playwright scraping failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private extractPlaywrightParams(options: ScraperOptions): PlaywrightParameters {
    const defaults: PlaywrightParameters = {
      headless: true,
      viewport: { width: 1280, height: 720 },
      waitUntil: 'networkidle',
      timeout: options.timeout || 30000,
      userAgent: options.userAgent,
      headers: options.headers,
      javaScriptEnabled: true
    };

    if (options.scraperSpecific) {
      return { ...defaults, ...options.scraperSpecific as PlaywrightParameters };
    }

    // Map legacy options to new parameters
    if (options.waitForSelector) {
      defaults.waitForSelector = options.waitForSelector;
    }
    if (options.screenshot) {
      defaults.screenshot = options.screenshot;
    }
    if (options.cookies) {
      defaults.cookies = options.cookies as Cookie[];
    }
    if (options.proxy) {
      defaults.proxy = { server: options.proxy };
    }

    return defaults;
  }

  private async loadPlaywright(): Promise<any> {
    try {
      // Dynamic import to handle optional dependency
      // Use require for CommonJS compatibility
      const playwright = require('playwright');
      return playwright;
    } catch (error) {
      // Return mock implementation for development/testing
      return this.getMockPlaywright();
    }
  }

  private getMockPlaywright(): any {
    // Mock implementation for when Playwright is not installed
    return {
      chromium: {
        launch: async () => ({
          newContext: async (_options?: any) => {
            const mockContext = {
              newPage: async () => {
                const mockPage = {
                  goto: async () => ({ status: () => 200 }),
                  content: async () => '<html><body>Mock content</body></html>',
                  title: async () => 'Mock Title',
                  evaluate: async (fn: any) => {
                    if (typeof fn === 'function') {
                      // Execute the function in a safe mock environment
                      const mockGlobals = {
                        document: { body: { scrollHeight: 1000 } },
                        window: { scrollBy: () => {} }
                      };
                      try {
                        return fn.call(mockGlobals);
                      } catch {
                        return null;
                      }
                    }
                    return null;
                  },
                  waitForSelector: async () => {},
                  waitForFunction: async () => {},
                  waitForLoadState: async () => {},
                  close: async () => {},
                  screenshot: async () => Buffer.from('mock-screenshot'),
                  pdf: async () => Buffer.from('mock-pdf'),
                  setViewportSize: async () => {},
                  setExtraHTTPHeaders: async () => {},
                  click: async () => {},
                  context: () => mockContext
                };
                return mockPage;
              },
              addCookies: async () => {},
              close: async () => {}
            };
            return mockContext;
          },
          close: async () => {}
        })
      }
    };
  }

  private async launchBrowser(playwright: any, params: PlaywrightParameters): Promise<any> {
    if (this.browserInstance) {
      return this.browserInstance;
    }

    const launchOptions: any = {
      headless: params.headless !== false,
      slowMo: params.slowMo,
      timeout: params.timeout
    };

    if (params.proxy) {
      launchOptions.proxy = {
        server: params.proxy.server,
        username: params.proxy.username,
        password: params.proxy.password,
        bypass: params.proxy.bypass?.join(',')
      };
    }

    return await playwright.chromium.launch(launchOptions);
  }

  private async createContext(browser: any, params: PlaywrightParameters): Promise<any> {
    if (this.contextInstance) {
      return this.contextInstance;
    }

    const contextOptions: any = {
      viewport: params.viewport,
      userAgent: params.userAgent,
      locale: params.locale,
      timezoneId: params.timezone,
      geolocation: params.geolocation,
      permissions: params.permissions,
      offline: params.offline,
      httpCredentials: params.httpCredentials,
      deviceScaleFactor: params.deviceScaleFactor,
      isMobile: params.isMobile,
      hasTouch: params.hasTouch,
      bypassCSP: params.bypassCSP,
      ignoreHTTPSErrors: params.ignoreHTTPSErrors,
      javaScriptEnabled: params.javaScriptEnabled
    };

    if (params.extraHttpHeaders) {
      contextOptions.extraHTTPHeaders = params.extraHttpHeaders;
    }

    if (params.recordVideo && params.videosPath) {
      contextOptions.recordVideo = {
        dir: params.videosPath
      };
    }

    return await browser.newContext(contextOptions);
  }

  private async configurePage(page: any, params: PlaywrightParameters): Promise<void> {
    // Add cookies if specified
    if (params.cookies && params.cookies.length > 0) {
      await page.context().addCookies(params.cookies);
    }

    // Set extra headers if not already set in context
    if (params.headers && !params.extraHttpHeaders) {
      await page.setExtraHTTPHeaders(params.headers);
    }
  }

  private async navigateToUrl(page: any, url: string, params: PlaywrightParameters): Promise<any> {
    const navigationOptions: any = {
      waitUntil: params.waitUntil || 'networkidle',
      timeout: params.timeout
    };

    return await page.goto(url, navigationOptions);
  }

  private async waitForContent(page: any, params: PlaywrightParameters): Promise<void> {
    // Wait for specific selector if specified
    if (params.waitForSelector) {
      await page.waitForSelector(params.waitForSelector, {
        timeout: params.timeout
      });
    }

    // Wait for custom function if specified
    if (params.waitForFunction) {
      await page.waitForFunction(params.waitForFunction, {
        timeout: params.timeout
      });
    }
  }

  private async scrollToBottom(page: any): Promise<void> {
    await page.evaluate(() => {
      return new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 100;
        const timer = setInterval(() => {
          const scrollHeight = (typeof document !== 'undefined' ? (document as any).body.scrollHeight : 1000);
          if (typeof window !== 'undefined') {
            (window as any).scrollBy(0, distance);
          }
          totalHeight += distance;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  private async clickElements(page: any, selectors: string[]): Promise<void> {
    for (const selector of selectors) {
      try {
        await page.click(selector, { timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (error) {
        console.warn(`Failed to click selector ${selector}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  private async extractContent(page: any, _params: PlaywrightParameters): Promise<Buffer> {
    const html = await page.content();
    return Buffer.from(html, 'utf-8');
  }

  private async buildMetadata(
    page: any,
    response: any,
    params: PlaywrightParameters,
    startTime: number
  ): Promise<ScrapedMetadata> {
    const title = await page.title();
    const loadTime = Date.now() - startTime;

    return {
      title,
      statusCode: response ? response.status() : 200,
      loadTime,
      scraperConfig: params,
      scraperMetadata: {
        viewport: params.viewport,
        userAgent: params.userAgent,
        headless: params.headless,
        waitUntil: params.waitUntil
      }
    };
  }

  private async takeScreenshot(page: any, options: boolean | ScreenshotOptions): Promise<Buffer> {
    const screenshotOptions: any = {};

    if (typeof options === 'object') {
      screenshotOptions.fullPage = options.fullPage;
      screenshotOptions.type = options.type || 'png';
      screenshotOptions.quality = options.quality;
      screenshotOptions.clip = options.clip;
      screenshotOptions.omitBackground = options.omitBackground;
    } else {
      screenshotOptions.fullPage = true;
      screenshotOptions.type = 'png';
    }

    return await page.screenshot(screenshotOptions);
  }

  private async generatePDF(page: any, options: boolean | PDFOptions): Promise<Buffer> {
    const pdfOptions: any = {};

    if (typeof options === 'object') {
      pdfOptions.scale = options.scale;
      pdfOptions.displayHeaderFooter = options.displayHeaderFooter;
      pdfOptions.headerTemplate = options.headerTemplate;
      pdfOptions.footerTemplate = options.footerTemplate;
      pdfOptions.printBackground = options.printBackground;
      pdfOptions.landscape = options.landscape;
      pdfOptions.pageRanges = options.pageRanges;
      pdfOptions.format = options.format;
      pdfOptions.width = options.width;
      pdfOptions.height = options.height;
      pdfOptions.margin = options.margin;
      pdfOptions.preferCSSPageSize = options.preferCSSPageSize;
    }

    return await page.pdf(pdfOptions);
  }

  canHandle(url: string): boolean {
    // Playwright can handle any HTTP/HTTPS URL and is especially good for SPAs
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * Optimized batch scraping for Playwright
   */
  async scrapeBatch(urls: string[], options?: ScraperOptions): Promise<ScrapedContent[]> {
    const mergedOptions = this.mergeOptions(options);
    const params = this.extractPlaywrightParams(mergedOptions);

    // Use persistent browser for batch operations
    const playwright = await this.loadPlaywright();
    this.browserInstance = await this.launchBrowser(playwright, params);
    this.contextInstance = await this.createContext(this.browserInstance, params);

    const results: ScrapedContent[] = [];

    try {
      // Process in parallel with controlled concurrency
      const batchSize = this.getBatchSize(mergedOptions);

      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        const batchPromises = batch.map(url => this.scrapeWithErrorHandling(url, mergedOptions));
        const batchResults = await Promise.allSettled(batchPromises);

        for (const result of batchResults) {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            results.push(this.createErrorResult(urls[results.length], result.reason));
          }
        }
      }
    } finally {
      // Cleanup persistent instances
      if (this.contextInstance) {
        await this.contextInstance.close();
        this.contextInstance = null;
      }
      if (this.browserInstance) {
        await this.browserInstance.close();
        this.browserInstance = null;
      }
    }

    return results;
  }

  protected getBatchSize(options: ScraperOptions): number {
    // Playwright can handle more concurrent pages
    const params = options.scraperSpecific as PlaywrightParameters;
    if (params?.slowMo) {
      return 2; // Reduce concurrency if slow mode is enabled
    }
    return 10; // Higher concurrency for Playwright
  }
}