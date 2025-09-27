/**
 * Unit tests for Crawl4AIScraper
 */

import { Crawl4AIScraper } from '../../../src/scrapers/Crawl4AIScraper';
import {
  Crawl4AIParameters,
  ChunkingStrategy,
  ContentFilter
} from '../../../src/interfaces/IScraperParameters';

describe('Crawl4AIScraper', () => {
  let scraper: Crawl4AIScraper;

  beforeEach(() => {
    scraper = new Crawl4AIScraper();
  });

  afterEach(async () => {
    // Clean up any resources
    await scraper.cleanup();
  });

  describe('Basic Functionality', () => {
    test('should have correct name', () => {
      expect(scraper.getName()).toBe('crawl4ai');
    });

    test('should have correct features', () => {
      const features = scraper.getFeatures();
      expect(features.javascript).toBe(true);
      expect(features.cookies).toBe(true);
      expect(features.proxy).toBe(true);
      expect(features.screenshot).toBe(true);
      expect(features.pdfGeneration).toBe(false);
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
      const params: Crawl4AIParameters = {
        maxDepth: 3,
        jsExecution: true,
        wordCountThreshold: 100
      };

      scraper.setParameters(params);
      const retrieved = scraper.getParameters();

      expect(retrieved).toEqual(params);
    });

    test('should merge parameters with defaults', async () => {
      const params: Crawl4AIParameters = {
        maxDepth: 2,
        screenshot: true
      };

      scraper.setParameters(params);

      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
      expect(result.metadata?.scraperMetadata?.crawlDepth).toBeDefined();
    });
  });

  describe('Extraction Strategies', () => {
    test('should handle cosine similarity extraction', async () => {
      const params: Crawl4AIParameters = {
        extractionStrategy: 'cosine'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.extractionStrategy).toBe('cosine');
    });

    test('should handle LLM extraction', async () => {
      const params: Crawl4AIParameters = {
        extractionStrategy: 'llm'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.extractionStrategy).toBe('llm');
      expect(result.metadata?.scraperMetadata?.links).toBeDefined();
      expect(result.metadata?.scraperMetadata?.images).toBeDefined();
    });

    test('should handle regex extraction', async () => {
      const params: Crawl4AIParameters = {
        extractionStrategy: 'regex'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.extractionStrategy).toBe('regex');
    });

    test('should handle CSS extraction', async () => {
      const params: Crawl4AIParameters = {
        extractionStrategy: 'css',
        cssSelector: '.content'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.extractionStrategy).toBe('css');
    });

    test('should handle XPath extraction', async () => {
      const params: Crawl4AIParameters = {
        extractionStrategy: 'xpath'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.extractionStrategy).toBe('xpath');
    });
  });

  describe('Chunking Strategies', () => {
    test('should handle fixed chunking', async () => {
      const chunkingStrategy: ChunkingStrategy = {
        type: 'fixed',
        chunkSize: 1000,
        chunkOverlap: 200
      };

      const params: Crawl4AIParameters = {
        chunkingStrategy
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });

    test('should handle semantic chunking', async () => {
      const chunkingStrategy: ChunkingStrategy = {
        type: 'semantic',
        chunkSize: 1000,
        separators: ['\n\n', '\n', '. ', ' ']
      };

      const params: Crawl4AIParameters = {
        chunkingStrategy
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });

    test('should handle sliding window chunking', async () => {
      const chunkingStrategy: ChunkingStrategy = {
        type: 'sliding_window',
        chunkSize: 500,
        chunkOverlap: 100
      };

      const params: Crawl4AIParameters = {
        chunkingStrategy
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });

    test('should handle topic-based chunking', async () => {
      const chunkingStrategy: ChunkingStrategy = {
        type: 'topic_based',
        topicThreshold: 0.6
      };

      const params: Crawl4AIParameters = {
        chunkingStrategy
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });

    test('should handle regex chunking', async () => {
      const chunkingStrategy: ChunkingStrategy = {
        type: 'regex',
        regexPattern: '\\n\\n+'
      };

      const params: Crawl4AIParameters = {
        chunkingStrategy
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });
  });

  describe('Content Filtering', () => {
    test('should handle keyword filtering', async () => {
      const contentFilter: ContentFilter = {
        type: 'keyword',
        keywords: ['important', 'critical'],
        includeOnly: true
      };

      const params: Crawl4AIParameters = {
        contentFilter
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });

    test('should handle length filtering', async () => {
      const contentFilter: ContentFilter = {
        type: 'length',
        minLength: 100,
        maxLength: 10000
      };

      const params: Crawl4AIParameters = {
        contentFilter
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });

    test('should handle CSS selector filtering', async () => {
      const contentFilter: ContentFilter = {
        type: 'css',
        selector: '.main-content'
      };

      const params: Crawl4AIParameters = {
        contentFilter
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });
  });

  describe('Magic Mode', () => {
    test('should enable all features in magic mode', async () => {
      const params: Crawl4AIParameters = {
        magic: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.magic).toBe(true);
      expect(result.metadata?.scraperMetadata?.links).toBeDefined();
      expect(result.metadata?.scraperMetadata?.images).toBeDefined();
    });
  });

  describe('Cache Modes', () => {
    test('should handle different cache modes', async () => {
      const cacheModes: Array<'enabled' | 'disabled' | 'bypass' | 'write_only' | 'read_only'> = [
        'enabled', 'disabled', 'bypass', 'write_only', 'read_only'
      ];

      for (const mode of cacheModes) {
        const params: Crawl4AIParameters = {
          cacheMode: mode
        };

        scraper.setParameters(params);
        const result = await scraper.scrape('https://example.com');

        expect(result.metadata?.scraperMetadata?.cacheMode).toBe(mode);
      }
    });
  });

  describe('Session Management', () => {
    test('should handle session-based crawling', async () => {
      const params: Crawl4AIParameters = {
        sessionId: 'test-session-123'
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.sessionId).toBe('test-session-123');
    });

    test('should clean up session crawlers', async () => {
      const params: Crawl4AIParameters = {
        sessionId: 'cleanup-test'
      };

      scraper.setParameters(params);
      await scraper.scrape('https://example.com');

      await scraper.cleanupSession('cleanup-test');

      // Session should be cleaned up
      const params2: Crawl4AIParameters = {
        sessionId: 'cleanup-test'
      };

      scraper.setParameters(params2);
      const result = await scraper.scrape('https://example.com');
      expect(result.scraperName).toBe('crawl4ai');
    });
  });

  describe('Multi-Page Crawling', () => {
    test('should handle deep crawling', async () => {
      const params: Crawl4AIParameters = {
        maxDepth: 3,
        maxPages: 10,
        excludeExternalLinks: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.metadata?.scraperMetadata?.crawlDepth).toBeDefined();
    });

    test('should handle domain filtering', async () => {
      const params: Crawl4AIParameters = {
        excludeDomains: ['ads.example.com', 'tracking.example.com'],
        includeDomains: ['example.com', 'docs.example.com']
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });
  });

  describe('Content Processing', () => {
    test('should handle content exclusions', async () => {
      const params: Crawl4AIParameters = {
        excludedTags: ['script', 'style', 'nav'],
        removeForms: true,
        removeNav: true,
        removeOverlay: true
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });

    test('should handle word count threshold', async () => {
      const params: Crawl4AIParameters = {
        wordCountThreshold: 100
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
    });
  });

  describe('Anti-Bot Features', () => {
    test('should handle anti-bot settings', async () => {
      const params: Crawl4AIParameters = {
        antiBot: true,
        delayBefore: 2000,
        delayAfter: 1000
      };

      scraper.setParameters(params);
      const result = await scraper.scrape('https://example.com');

      expect(result.scraperName).toBe('crawl4ai');
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

    test('should adjust batch size for deep crawling', () => {
      const deepParams: Crawl4AIParameters = {
        maxDepth: 3
      };
      scraper.setParameters(deepParams);

      const batchSize = (scraper as any).getBatchSize({
        scraperSpecific: deepParams
      });
      expect(batchSize).toBe(1); // Sequential for deep crawling

      // Test with JS execution
      const jsParams: Crawl4AIParameters = {
        jsExecution: true,
        maxDepth: 1
      };
      scraper.setParameters(jsParams);

      const jsBatchSize = (scraper as any).getBatchSize({
        scraperSpecific: jsParams
      });
      expect(jsBatchSize).toBe(3); // Lower concurrency with JS

      // Test normal mode
      scraper.setParameters({});
      const normalBatchSize = (scraper as any).getBatchSize({});
      expect(normalBatchSize).toBe(5); // Normal concurrency
    });
  });

  describe('Error Handling', () => {
    test('should handle crawl failures', async () => {
      const result = await scraper.scrape('invalid-url').catch(err => err);
      expect(result).toBeInstanceOf(Error);
    });

    test('should retry on failure', async () => {
      const params: Crawl4AIParameters = {
        retries: 2
      };

      scraper.setParameters(params);

      // This would normally retry
      const result = await scraper.scrape('https://example.com');
      expect(result.scraperName).toBe('crawl4ai');
    });
  });

  describe('Mock Implementation', () => {
    test('should use mock when Crawl4AI not installed', async () => {
      const mock = (scraper as any).getMockCrawl4AI();
      expect(mock).toBeDefined();
      expect(mock.AsyncWebCrawler).toBeDefined();

      const crawler = new mock.AsyncWebCrawler({});
      const result = await crawler.arun('https://example.com', {});

      expect(result.success).toBe(true);
      expect(result.html).toContain('Mock Crawl4AI content');
      expect(result.metadata.title).toBe('Mock Title');
    });

    test('should have correct mock enums', () => {
      const mock = (scraper as any).getMockCrawl4AI();

      expect(mock.CacheMode.ENABLED).toBe('enabled');
      expect(mock.ExtractionStrategy.COSINE_SIMILARITY).toBe('cosine');
      expect(mock.ChunkingStrategy.FIXED_SIZE).toBe('fixed');
    });
  });

  describe('Cleanup', () => {
    test('should clean up all resources', async () => {
      // Create multiple sessions and crawlers
      const params1: Crawl4AIParameters = { sessionId: 'session1' };
      const params2: Crawl4AIParameters = { sessionId: 'session2' };

      scraper.setParameters(params1);
      await scraper.scrape('https://example.com');

      scraper.setParameters(params2);
      await scraper.scrape('https://example.com');

      // Clean up all resources
      await scraper.cleanup();

      // Scraper should still work after cleanup
      const result = await scraper.scrape('https://example.com');
      expect(result.scraperName).toBe('crawl4ai');
    });
  });
});