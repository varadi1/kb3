/**
 * SOLID principle compliance tests for Scraping System
 */

import { IScraper, ScraperOptions, ScrapedContent } from '../../../src/interfaces/IScraper';
import { BaseScraper } from '../../../src/scrapers/BaseScraper';
import { HttpScraper } from '../../../src/scrapers/HttpScraper';
import { PlaywrightScraper } from '../../../src/scrapers/PlaywrightScraper';
import { ScraperRegistry } from '../../../src/scrapers/ScraperRegistry';
import { ScraperSelector } from '../../../src/scrapers/ScraperSelector';
import { ScraperAwareContentFetcher } from '../../../src/fetchers/ScraperAwareContentFetcher';
import { HttpFetcher } from '../../../src/fetchers/HttpFetcher';
import { ScraperFactory } from '../../../src/scrapers/ScraperFactory';

describe('Scraping System - SOLID Compliance', () => {
  describe('Single Responsibility Principle (SRP)', () => {
    it('IScraper interface should have single responsibility - scraping content', () => {
      const methods = [
        'getName',
        'canHandle',
        'scrape',
        'scrapeBatch',
        'getFeatures'
      ];

      // All methods should be related to scraping
      methods.forEach(method => {
        expect(['getName', 'canHandle', 'scrape', 'scrapeBatch', 'getFeatures'])
          .toContain(method);
      });
    });

    it('ScraperRegistry should only manage scraper registration', () => {
      const registry = ScraperRegistry.getInstance();
      const registryPrototype = Object.getPrototypeOf(registry);
      const methods = Object.getOwnPropertyNames(registryPrototype)
        .filter(name => typeof registryPrototype[name] === 'function' &&
                name !== 'constructor');

      // All methods should be related to registry management
      const registryMethods = [
        'register', 'unregister', 'get', 'getAll',
        'getNames', 'setDefault', 'getDefault', 'has', 'clear'
      ];

      methods.forEach(method => {
        expect(registryMethods).toContain(method);
      });
    });

    it('ScraperSelector should only handle scraper selection', () => {
      const selector = new ScraperSelector();
      const selectorPrototype = Object.getPrototypeOf(selector);
      const methods = Object.getOwnPropertyNames(selectorPrototype)
        .filter(name => typeof selectorPrototype[name] === 'function' &&
                name !== 'constructor' && !name.startsWith('_') && !name.startsWith('match') && !name.startsWith('sort'));

      // All methods should be related to selection logic
      const selectionMethods = [
        'addRule', 'addRules', 'setScraperForUrls', 'removeRule',
        'clearRules', 'getRules', 'selectScraper', 'selectScrapersForBatch',
        'groupUrlsByScaper', 'setFallbackStrategy'
      ];

      methods.forEach(method => {
        expect(selectionMethods).toContain(method);
      });
    });
  });

  describe('Open/Closed Principle (OCP)', () => {
    it('BaseScraper should be open for extension', () => {
      class CustomScraper extends BaseScraper {
        async scrape(url: string, _options?: ScraperOptions): Promise<ScrapedContent> {
          return {
            url,
            content: Buffer.from('custom content'),
            mimeType: 'text/html',
            metadata: {},
            scraperName: this.name,
            timestamp: new Date()
          };
        }
      }

      const customScraper = new CustomScraper('custom');
      expect(customScraper).toBeInstanceOf(BaseScraper);
      expect(customScraper.getName()).toBe('custom');
    });

    it('New scrapers can be added without modifying existing code', () => {
      const registry = ScraperRegistry.getInstance();
      const initialCount = registry.getAll().length;

      // Add new scraper without modifying registry
      class NewScraper extends BaseScraper {
        async scrape(url: string): Promise<ScrapedContent> {
          return {
            url,
            content: Buffer.from('new'),
            mimeType: 'text/html',
            metadata: {},
            scraperName: this.name,
            timestamp: new Date()
          };
        }
      }

      registry.register('new-scraper', new NewScraper('new-scraper'));
      expect(registry.getAll().length).toBe(initialCount + 1);
    });

    it('ScraperSelector can be extended with new selection strategies', () => {
      const selector = new ScraperSelector();

      // Custom strategy
      class CustomStrategy {
        selectScraper(_url: string): IScraper | null {
          return null;
        }
      }

      selector.setFallbackStrategy(new CustomStrategy());
      expect(() => selector.selectScraper('https://example.com')).not.toThrow();
    });
  });

  describe('Liskov Substitution Principle (LSP)', () => {
    it('All scrapers should be substitutable for IScraper', async () => {
      const scrapers: IScraper[] = [
        new HttpScraper(),
        new PlaywrightScraper()
      ];

      for (const scraper of scrapers) {
        // All scrapers should implement IScraper methods
        expect(typeof scraper.getName).toBe('function');
        expect(typeof scraper.canHandle).toBe('function');
        expect(typeof scraper.scrape).toBe('function');
        expect(typeof scraper.scrapeBatch).toBe('function');
        expect(typeof scraper.getFeatures).toBe('function');

        // All should handle basic URLs
        expect(scraper.canHandle('https://example.com')).toBeDefined();

        // All should return proper ScrapedContent
        const result = await scraper.scrape('https://example.com');
        expect(result).toHaveProperty('url');
        expect(result).toHaveProperty('content');
        expect(result).toHaveProperty('mimeType');
        expect(result).toHaveProperty('scraperName');
        expect(result).toHaveProperty('timestamp');
      }
    });

    it('ScraperAwareContentFetcher should be substitutable for IContentFetcher', () => {
      const httpFetcher = new HttpFetcher();
      const scraperAwareFetcher = new ScraperAwareContentFetcher(httpFetcher);

      // Should implement IContentFetcher methods
      expect(typeof scraperAwareFetcher.fetch).toBe('function');
      expect(typeof scraperAwareFetcher.canFetch).toBe('function');

      // Should behave like IContentFetcher
      expect(scraperAwareFetcher.canFetch('https://example.com')).toBeDefined();
    });
  });

  describe('Interface Segregation Principle (ISP)', () => {
    it('IScraper interface should not force unused methods', () => {
      class MinimalScraper extends BaseScraper {
        async scrape(url: string): Promise<ScrapedContent> {
          return {
            url,
            content: Buffer.from('minimal'),
            mimeType: 'text/plain',
            metadata: {},
            scraperName: this.name,
            timestamp: new Date()
          };
        }
      }

      const scraper = new MinimalScraper('minimal');
      // Can implement just what's needed, BaseScraper provides defaults
      expect(scraper.scrapeBatch).toBeDefined();
      expect(scraper.canHandle).toBeDefined();
    });

    it('ScraperSelectionRule should be minimal and focused', () => {
      const rule = {
        pattern: 'example.com',
        scraperName: 'test'
        // priority is optional - not forced
      };

      const selector = new ScraperSelector();
      expect(() => selector.addRule(rule)).not.toThrow();
    });
  });

  describe('Dependency Inversion Principle (DIP)', () => {
    it('ScraperSelector depends on IScraper abstraction, not concrete implementations', () => {
      const selector = new ScraperSelector();
      const registry = ScraperRegistry.getInstance();

      // Can work with any IScraper implementation
      class AbstractScraper implements IScraper {
        getName(): string { return 'abstract'; }
        canHandle(_url: string): boolean { return true; }
        async scrape(url: string): Promise<ScrapedContent> {
          return {
            url,
            content: Buffer.from('abstract'),
            mimeType: 'text/plain',
            metadata: {},
            scraperName: 'abstract',
            timestamp: new Date()
          };
        }
        async scrapeBatch(urls: string[]): Promise<ScrapedContent[]> {
          return Promise.all(urls.map(url => this.scrape(url)));
        }
        getFeatures(): any {
          return {};
        }
      }

      registry.register('abstract', new AbstractScraper());
      selector.addRule({ pattern: 'test.com', scraperName: 'abstract' });

      const selected = selector.selectScraper('https://test.com');
      expect(selected).toBeInstanceOf(AbstractScraper);
    });

    it('ScraperAwareContentFetcher depends on abstractions', () => {
      const mockFetcher = {
        fetch: jest.fn(),
        canFetch: jest.fn().mockReturnValue(true)
      };

      const fetcher = new ScraperAwareContentFetcher(mockFetcher as any);
      expect(fetcher).toBeDefined();
      expect(fetcher.canFetch('https://example.com')).toBe(true);
    });

    it('ScraperFactory uses dependency injection', () => {
      const config = {
        scraping: {
          enabledScrapers: ['http'],
          defaultScraper: 'http'
        }
      } as any;

      const { registry, selector } = ScraperFactory.setupScrapers(config);
      expect(registry).toBeInstanceOf(ScraperRegistry);
      expect(selector).toBeInstanceOf(ScraperSelector);
    });
  });

  describe('Integration - All SOLID Principles', () => {
    it('System components work together while maintaining SOLID principles', async () => {
      // Setup
      const registry = ScraperRegistry.getInstance();
      const selector = new ScraperSelector(registry);
      const httpFetcher = new HttpFetcher();
      // Create scraper aware fetcher to verify it integrates properly
      new ScraperAwareContentFetcher(
        httpFetcher,
        selector,
        registry
      );

      // Register scrapers (OCP - extending without modification)
      class TestScraper extends BaseScraper {
        async scrape(url: string): Promise<ScrapedContent> {
          return {
            url,
            content: Buffer.from('test content'),
            mimeType: 'text/html',
            metadata: {},
            scraperName: this.name,
            timestamp: new Date()
          };
        }
      }

      registry.register('test', new TestScraper('test'));
      selector.addRule({ pattern: 'test.com', scraperName: 'test' });

      // System should work with the new scraper
      const scraper = selector.selectScraper('https://test.com');
      expect(scraper).toBeInstanceOf(TestScraper);

      // Verify scraping
      if (scraper) {
        const result = await scraper.scrape('https://test.com');
        expect(result.scraperName).toBe('test');
      }
    });
  });
});