/**
 * Unit tests for ScraperSelector
 */

import { ScraperSelector, ScraperSelectionRule, DomainBasedSelectionStrategy } from '../../../src/scrapers/ScraperSelector';
import { ScraperRegistry } from '../../../src/scrapers/ScraperRegistry';
import { BaseScraper } from '../../../src/scrapers/BaseScraper';
import { ScraperOptions, ScrapedContent } from '../../../src/interfaces/IScraper';

class MockScraper extends BaseScraper {
  private readonly canHandlePatterns: string[];

  constructor(name: string, canHandlePatterns: string[] = []) {
    super(name);
    this.canHandlePatterns = canHandlePatterns;
  }

  canHandle(url: string): boolean {
    if (this.canHandlePatterns.length === 0) {
      return super.canHandle(url);
    }
    return this.canHandlePatterns.some(pattern => url.includes(pattern));
  }

  async scrape(url: string, _options?: ScraperOptions): Promise<ScrapedContent> {
    return {
      url,
      content: Buffer.from(`${this.name} content`),
      mimeType: 'text/html',
      metadata: {},
      scraperName: this.name,
      timestamp: new Date()
    };
  }
}

describe('ScraperSelector', () => {
  let selector: ScraperSelector;
  let registry: ScraperRegistry;

  beforeEach(() => {
    ScraperRegistry.reset();
    registry = ScraperRegistry.getInstance();
    selector = new ScraperSelector(registry);
  });

  describe('Rule Management', () => {
    it('should add a selection rule', () => {
      const rule: ScraperSelectionRule = {
        pattern: 'example.com',
        scraperName: 'test-scraper'
      };

      selector.addRule(rule);
      expect(selector.getRules()).toContainEqual({
        ...rule,
        priority: 0
      });
    });

    it('should add multiple rules in batch', () => {
      const rules: ScraperSelectionRule[] = [
        { pattern: 'example1.com', scraperName: 'scraper1' },
        { pattern: 'example2.com', scraperName: 'scraper2' }
      ];

      selector.addRules(rules);
      expect(selector.getRules()).toHaveLength(2);
    });

    it('should set scraper for batch of URLs', () => {
      const urls = ['https://site1.com', 'https://site2.com', 'https://site3.com'];
      selector.setScraperForUrls(urls, 'batch-scraper', 10);

      const rules = selector.getRules();
      expect(rules).toHaveLength(3);
      expect(rules[0]).toMatchObject({
        pattern: urls[0],
        scraperName: 'batch-scraper',
        priority: 10
      });
    });

    it('should sort rules by priority', () => {
      selector.addRule({ pattern: 'low', scraperName: 'low-scraper', priority: 1 });
      selector.addRule({ pattern: 'high', scraperName: 'high-scraper', priority: 10 });
      selector.addRule({ pattern: 'medium', scraperName: 'medium-scraper', priority: 5 });

      const rules = selector.getRules();
      expect(rules[0].priority).toBe(10);
      expect(rules[1].priority).toBe(5);
      expect(rules[2].priority).toBe(1);
    });

    it('should remove a rule by pattern', () => {
      selector.addRule({ pattern: 'example.com', scraperName: 'test' });
      selector.removeRule('example.com');

      expect(selector.getRules()).toHaveLength(0);
    });

    it('should clear all rules', () => {
      selector.addRule({ pattern: 'example1.com', scraperName: 'test1' });
      selector.addRule({ pattern: 'example2.com', scraperName: 'test2' });
      selector.clearRules();

      expect(selector.getRules()).toHaveLength(0);
    });
  });

  describe('Scraper Selection', () => {
    beforeEach(() => {
      registry.register('general', new MockScraper('general'));
      registry.register('api', new MockScraper('api', ['api.']));
      registry.register('docs', new MockScraper('docs', ['docs.', '/documentation']));
    });

    it('should select scraper based on exact match rule', () => {
      selector.addRule({
        pattern: 'https://example.com',
        scraperName: 'general'
      });

      const scraper = selector.selectScraper('https://example.com');
      expect(scraper?.getName()).toBe('general');
    });

    it('should select scraper based on wildcard pattern', () => {
      selector.addRule({
        pattern: '*.example.com/*',
        scraperName: 'general'
      });

      const scraper = selector.selectScraper('https://api.example.com/v1/users');
      expect(scraper?.getName()).toBe('general');
    });

    it('should select scraper based on regex pattern', () => {
      selector.addRule({
        pattern: /^https:\/\/.*\.example\.com/,
        scraperName: 'general'
      });

      const scraper = selector.selectScraper('https://api.example.com');
      expect(scraper?.getName()).toBe('general');
    });

    it('should respect priority when multiple rules match', () => {
      // Register scrapers that can handle all URLs for this test
      registry.register('low-priority', new MockScraper('low-priority'));
      registry.register('high-priority', new MockScraper('high-priority'));

      selector.addRule({ pattern: 'example.com', scraperName: 'low-priority', priority: 1 });
      selector.addRule({ pattern: 'example.com', scraperName: 'high-priority', priority: 10 });

      const scraper = selector.selectScraper('https://example.com');
      expect(scraper?.getName()).toBe('high-priority');
    });

    it('should fallback to default scraper', () => {
      registry.setDefault('general');
      const scraper = selector.selectScraper('https://unknown.com');
      expect(scraper?.getName()).toBe('general');
    });

    it('should find any scraper that can handle URL', () => {
      // The api scraper only handles URLs with 'api.' in them
      const scraper = selector.selectScraper('https://api.example.com');
      expect(scraper).not.toBeNull();
      // Since no rules are defined, it will pick the first scraper that can handle the URL
      // The 'general' scraper can handle all http/https URLs
      expect(['general', 'api']).toContain(scraper?.getName());
    });

    it('should return null when no scraper can handle URL', () => {
      const scraper = selector.selectScraper('ftp://example.com');
      expect(scraper).toBeNull();
    });
  });

  describe('Batch Selection', () => {
    beforeEach(() => {
      registry.register('scraper1', new MockScraper('scraper1'));
      registry.register('scraper2', new MockScraper('scraper2'));
      selector.addRule({ pattern: 'site1.com', scraperName: 'scraper1' });
      selector.addRule({ pattern: 'site2.com', scraperName: 'scraper2' });
    });

    it('should select scrapers for batch of URLs', () => {
      const urls = [
        'https://site1.com/page1',
        'https://site2.com/page2',
        'ftp://unknown.com'  // Use ftp:// to ensure no scraper can handle it
      ];

      const result = selector.selectScrapersForBatch(urls);

      expect(result.get(urls[0])?.getName()).toBe('scraper1');
      expect(result.get(urls[1])?.getName()).toBe('scraper2');
      expect(result.get(urls[2])).toBeNull();
    });

    it('should group URLs by scraper', () => {
      const urls = [
        'https://site1.com/page1',
        'https://site1.com/page2',
        'https://site2.com/page1',
        'https://site2.com/page2'
      ];

      const groups = selector.groupUrlsByScaper(urls);

      expect(groups.size).toBe(2);

      const scraper1Urls = Array.from(groups.entries())
        .find(([scraper]) => scraper.getName() === 'scraper1')?.[1];
      expect(scraper1Urls).toEqual([
        'https://site1.com/page1',
        'https://site1.com/page2'
      ]);
    });
  });

  describe('Fallback Strategy', () => {
    it('should use fallback strategy when no rules match', () => {
      const strategy = new DomainBasedSelectionStrategy(registry);
      registry.register('example-scraper', new MockScraper('example-scraper'));
      strategy.setDomainScraper('example.com', 'example-scraper');

      selector.setFallbackStrategy(strategy);

      const scraper = selector.selectScraper('https://example.com/page');
      expect(scraper?.getName()).toBe('example-scraper');
    });
  });
});

describe('DomainBasedSelectionStrategy', () => {
  let strategy: DomainBasedSelectionStrategy;
  let registry: ScraperRegistry;

  beforeEach(() => {
    ScraperRegistry.reset();
    registry = ScraperRegistry.getInstance();
    strategy = new DomainBasedSelectionStrategy(registry);
  });

  it('should select scraper based on domain', () => {
    registry.register('example-scraper', new MockScraper('example-scraper'));
    strategy.setDomainScraper('example.com', 'example-scraper');

    const scraper = strategy.selectScraper('https://example.com/page');
    expect(scraper?.getName()).toBe('example-scraper');
  });

  it('should return null for unknown domain', () => {
    const scraper = strategy.selectScraper('https://unknown.com/page');
    expect(scraper).toBeNull();
  });

  it('should handle invalid URLs gracefully', () => {
    const scraper = strategy.selectScraper('not-a-url');
    expect(scraper).toBeNull();
  });
});