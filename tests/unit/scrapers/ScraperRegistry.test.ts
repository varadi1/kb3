/**
 * Unit tests for ScraperRegistry
 */

import { ScraperRegistry } from '../../../src/scrapers/ScraperRegistry';
import { ScraperOptions, ScrapedContent } from '../../../src/interfaces/IScraper';
import { BaseScraper } from '../../../src/scrapers/BaseScraper';

class MockScraper extends BaseScraper {
  constructor(name: string) {
    super(name);
  }

  async scrape(url: string, _options?: ScraperOptions): Promise<ScrapedContent> {
    return {
      url,
      content: Buffer.from(`Mock scraped content from ${this.name}`),
      mimeType: 'text/html',
      metadata: {},
      scraperName: this.name,
      timestamp: new Date()
    };
  }
}

describe('ScraperRegistry', () => {
  let registry: ScraperRegistry;

  beforeEach(() => {
    ScraperRegistry.reset();
    registry = ScraperRegistry.getInstance();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = ScraperRegistry.getInstance();
      const instance2 = ScraperRegistry.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should reset properly', () => {
      registry.register('test', new MockScraper('test'));
      expect(registry.has('test')).toBe(true);

      ScraperRegistry.reset();
      registry = ScraperRegistry.getInstance();
      expect(registry.has('test')).toBe(false);
    });
  });

  describe('Registration', () => {
    it('should register a scraper', () => {
      const scraper = new MockScraper('test-scraper');
      registry.register('test', scraper);

      expect(registry.has('test')).toBe(true);
      expect(registry.get('test')).toBe(scraper);
    });

    it('should throw when registering duplicate name', () => {
      const scraper1 = new MockScraper('scraper1');
      const scraper2 = new MockScraper('scraper2');

      registry.register('test', scraper1);
      expect(() => registry.register('test', scraper2)).toThrow(
        "Scraper with name 'test' is already registered"
      );
    });

    it('should unregister a scraper', () => {
      const scraper = new MockScraper('test-scraper');
      registry.register('test', scraper);
      registry.unregister('test');

      expect(registry.has('test')).toBe(false);
      expect(registry.get('test')).toBeUndefined();
    });
  });

  describe('Default Scraper', () => {
    it('should set and get default scraper', () => {
      const scraper = new MockScraper('default-scraper');
      registry.register('default', scraper);
      registry.setDefault('default');

      expect(registry.getDefault()).toBe(scraper);
    });

    it('should throw when setting non-existent scraper as default', () => {
      expect(() => registry.setDefault('non-existent')).toThrow(
        "Cannot set default: scraper 'non-existent' is not registered"
      );
    });

    it('should clear default when unregistering default scraper', () => {
      const scraper = new MockScraper('default-scraper');
      registry.register('default', scraper);
      registry.setDefault('default');
      registry.unregister('default');

      expect(registry.getDefault()).toBeUndefined();
    });
  });

  describe('Retrieval', () => {
    it('should get all scrapers', () => {
      const scraper1 = new MockScraper('scraper1');
      const scraper2 = new MockScraper('scraper2');

      registry.register('test1', scraper1);
      registry.register('test2', scraper2);

      const all = registry.getAll();
      expect(all).toHaveLength(2);
      expect(all.find(([name]) => name === 'test1')?.[1]).toBe(scraper1);
      expect(all.find(([name]) => name === 'test2')?.[1]).toBe(scraper2);
    });

    it('should get all scraper names', () => {
      registry.register('test1', new MockScraper('scraper1'));
      registry.register('test2', new MockScraper('scraper2'));

      const names = registry.getNames();
      expect(names).toEqual(['test1', 'test2']);
    });
  });

  describe('Clear', () => {
    it('should clear all scrapers', () => {
      registry.register('test1', new MockScraper('scraper1'));
      registry.register('test2', new MockScraper('scraper2'));
      registry.setDefault('test1');

      registry.clear();

      expect(registry.getAll()).toHaveLength(0);
      expect(registry.getDefault()).toBeUndefined();
    });
  });
});