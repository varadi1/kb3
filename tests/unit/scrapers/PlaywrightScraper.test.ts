/**
 * Unit tests for PlaywrightScraper
 */

import { PlaywrightScraper } from '../../../src/scrapers/PlaywrightScraper';
import { ScraperOptions } from '../../../src/interfaces/IScraper';
import { PlaywrightParameters } from '../../../src/interfaces/IScraperParameters';

// Mock playwright module
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn().mockResolvedValue({
      newPage: jest.fn().mockResolvedValue({
        goto: jest.fn().mockResolvedValue({
          status: jest.fn().mockReturnValue(200),
          headers: jest.fn().mockReturnValue({})
        }),
        content: jest.fn().mockResolvedValue('<html><body>Test content</body></html>'),
        title: jest.fn().mockResolvedValue('Test Page'),
        url: jest.fn().mockReturnValue('https://example.com'),
        evaluate: jest.fn().mockResolvedValue('Test content'),
        waitForSelector: jest.fn().mockResolvedValue(true),
        waitForFunction: jest.fn().mockResolvedValue(true),
        waitForTimeout: jest.fn().mockResolvedValue(undefined),
        click: jest.fn().mockResolvedValue(undefined),
        screenshot: jest.fn().mockResolvedValue(Buffer.from('mock screenshot')),
        pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf')),
        setViewport: jest.fn().mockResolvedValue(undefined),
        setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
        context: jest.fn().mockReturnValue({
          addCookies: jest.fn().mockResolvedValue(undefined)
        }),
        close: jest.fn().mockResolvedValue(undefined)
      }),
      close: jest.fn().mockResolvedValue(undefined),
      newContext: jest.fn().mockResolvedValue({
        newPage: jest.fn().mockResolvedValue({
          goto: jest.fn().mockResolvedValue({
            status: jest.fn().mockReturnValue(200),
            headers: jest.fn().mockReturnValue({})
          }),
          content: jest.fn().mockResolvedValue('<html><body>Test content</body></html>'),
          title: jest.fn().mockResolvedValue('Test Page'),
          url: jest.fn().mockReturnValue('https://example.com'),
          evaluate: jest.fn().mockResolvedValue('Test content'),
          waitForSelector: jest.fn().mockResolvedValue(true),
          waitForFunction: jest.fn().mockResolvedValue(true),
          waitForTimeout: jest.fn().mockResolvedValue(undefined),
          click: jest.fn().mockResolvedValue(undefined),
          screenshot: jest.fn().mockResolvedValue(Buffer.from('mock screenshot')),
          pdf: jest.fn().mockResolvedValue(Buffer.from('mock pdf')),
          setViewport: jest.fn().mockResolvedValue(undefined),
          setExtraHTTPHeaders: jest.fn().mockResolvedValue(undefined),
          context: jest.fn().mockReturnValue({
            addCookies: jest.fn().mockResolvedValue(undefined)
          }),
          close: jest.fn().mockResolvedValue(undefined)
        }),
        close: jest.fn().mockResolvedValue(undefined)
      })
    })
  }
}));

describe('PlaywrightScraper', () => {
  let scraper: PlaywrightScraper;

  beforeEach(() => {
    scraper = new PlaywrightScraper();
  });

  afterEach(async () => {
    // Clean up any resources
    if ('cleanup' in scraper) {
      await (scraper as any).cleanup();
    }
  });

  describe('Basic Functionality', () => {
    test('should have correct name', () => {
      expect(scraper.getName()).toBe('playwright');
    });

    test('should have correct features', () => {
      const features = scraper.getFeatures();
      expect(features.javascript).toBe(true);
      expect(features.cookies).toBe(true);
      expect(features.proxy).toBe(true);
      expect(features.screenshot).toBe(true);
      expect(features.pdfGeneration).toBe(true);
      expect(features.multiPage).toBe(true);
    });

    test('should handle HTTP URLs', () => {
      expect(scraper.canHandle('http://example.com')).toBe(true);
      expect(scraper.canHandle('https://example.com')).toBe(true);
    });

    test('should not handle non-HTTP URLs', () => {
      expect(scraper.canHandle('file:///path/to/file')).toBe(false);
      expect(scraper.canHandle('ftp://example.com')).toBe(false);
      expect(scraper.canHandle('invalid-url')).toBe(false);
    });
  });

  describe('Parameter Management', () => {
    test('should set and get parameters', () => {
      const params: PlaywrightParameters = {
        headless: false,
        viewport: { width: 1920, height: 1080 },
        timeout: 60000
      };

      scraper.setParameters(params);
      const retrieved = scraper.getParameters();

      expect(retrieved).toEqual(params);
    });

    test('should merge parameters with defaults', async () => {
      const params: PlaywrightParameters = {
        headless: false,
        screenshot: true
      };

      scraper.setParameters(params);

      // Mock scrape to test parameter merging
      const options: ScraperOptions = {
        timeout: 5000
      };

      const result = await scraper.scrape('https://example.com', options);

      expect(result.scraperName).toBe('playwright');
      expect(result.url).toBe('https://example.com');
    });
  });

  describe('Screenshot Options', () => {
    test('should handle boolean screenshot option', async () => {
      const params: PlaywrightParameters = {
        screenshot: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.screenshot).toBeDefined();
    });

    test('should handle detailed screenshot options', async () => {
      const params: PlaywrightParameters = {
        screenshot: {
          fullPage: true,
          type: 'png',
          omitBackground: true
        }
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.screenshot).toBeDefined();
    });
  });

  describe('PDF Generation', () => {
    test('should handle boolean PDF option', async () => {
      const params: PlaywrightParameters = {
        pdf: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.pdf).toBeDefined();
    });

    test('should handle detailed PDF options', async () => {
      const params: PlaywrightParameters = {
        pdf: {
          format: 'A4',
          landscape: true,
          printBackground: true,
          margin: {
            top: '1cm',
            bottom: '1cm',
            left: '1cm',
            right: '1cm'
          }
        }
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.pdf).toBeDefined();
    });
  });

  describe('Advanced Parameters', () => {
    test('should handle proxy configuration', async () => {
      const params: PlaywrightParameters = {
        proxy: {
          server: 'http://proxy.example.com:8080',
          username: 'user',
          password: 'pass',
          bypass: ['localhost', '127.0.0.1']
        }
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('playwright');
    });

    test('should handle viewport configuration', async () => {
      const params: PlaywrightParameters = {
        viewport: {
          width: 1920,
          height: 1080
        },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.viewport).toEqual({
        width: 1920,
        height: 1080
      });
    });

    test('should handle geolocation', async () => {
      const params: PlaywrightParameters = {
        geolocation: {
          latitude: 37.7749,
          longitude: -122.4194,
          accuracy: 100
        },
        permissions: ['geolocation']
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('playwright');
    });

    test('should handle cookies', async () => {
      const params: PlaywrightParameters = {
        cookies: [
          {
            name: 'session',
            value: 'abc123',
            domain: '.example.com',
            path: '/',
            secure: true,
            httpOnly: true
          }
        ]
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('playwright');
    });
  });

  describe('Navigation Options', () => {
    test('should handle waitUntil options', async () => {
      const waitOptions: Array<'load' | 'domcontentloaded' | 'networkidle' | 'commit'> =
        ['load', 'domcontentloaded', 'networkidle', 'commit'];

      for (const waitUntil of waitOptions) {
        const params: PlaywrightParameters = {
          waitUntil
        };

        scraper.setParameters(params);
        const result = await scraper.scrape('https://example.com');

        expect(result.metadata?.scraperMetadata?.waitUntil).toBe(waitUntil);
      }
    });

    test('should handle wait for selector', async () => {
      const params: PlaywrightParameters = {
        waitForSelector: '#content',
        waitForFunction: 'window.loaded === true'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('playwright');
    });

    test('should handle scroll and click', async () => {
      const params: PlaywrightParameters = {
        scrollToBottom: true,
        clickSelectors: ['#load-more', '.expand-content']
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('playwright');
    });
  });

  describe('Batch Processing', () => {
    test('should process multiple URLs', async () => {
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3'
      ];

      const results = await scraper.scrapeBatch(urls);

      expect(results).toHaveLength(3);
      expect(results[0].url).toBe(urls[0]);
      expect(results[1].url).toBe(urls[1]);
      expect(results[2].url).toBe(urls[2]);
    });

    test('should handle batch with parameters', async () => {
      const params: PlaywrightParameters = {
        headless: true,
        screenshot: true
      };

      scraper.setParameters(params);

      const urls = ['https://example.com/1', 'https://example.com/2'];
      const results = await scraper.scrapeBatch(urls);

      expect(results).toHaveLength(2);
      results.forEach(result => {
        expect(result.metadata?.screenshot).toBeDefined();
      });
    });

    test('should adjust batch size based on parameters', () => {
      // Test with slow mode
      const slowParams: PlaywrightParameters = {
        slowMo: 1000
      };
      scraper.setParameters(slowParams);

      const batchSize = (scraper as any).getBatchSize({
        scraperSpecific: slowParams
      });
      expect(batchSize).toBe(2); // Reduced for slow mode

      // Test without slow mode
      scraper.setParameters({});
      const normalBatchSize = (scraper as any).getBatchSize({});
      expect(normalBatchSize).toBe(10); // Normal concurrency
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid URLs', async () => {
      const result = await scraper.scrape('invalid-url').catch(err => err);
      expect(result).toBeInstanceOf(Error);
    });

    test('should create error result for failed URLs', () => {
      const error = new Error('Test error');
      const result = (scraper as any).createErrorResult('https://example.com', error);

      expect(result.url).toBe('https://example.com');
      expect(result.metadata?.error).toBe('Test error');
      expect(result.content.length).toBe(0);
    });
  });

  describe('Mock Implementation', () => {
    test('should use mock when Playwright not installed', async () => {
      const mock = (scraper as any).getMockPlaywright();
      expect(mock).toBeDefined();
      expect(mock.chromium).toBeDefined();
      expect(mock.chromium.launch).toBeDefined();

      const browser = await mock.chromium.launch();
      const context = await browser.newContext();
      const page = await context.newPage();

      const response = await page.goto('https://example.com');
      expect(response.status()).toBe(200);

      const content = await page.content();
      expect(content).toContain('Mock content');
    });
  });
});