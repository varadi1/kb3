import { KB3Service } from '../../../src/services/kb3Service';
import { EventEmitter } from 'events';

describe('KB3Service Unit Tests', () => {
  let service: KB3Service;

  beforeEach(() => {
    // Clear singleton instance
    (KB3Service as any).instance = undefined;
    service = KB3Service.getInstance();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = KB3Service.getInstance();
      const instance2 = KB3Service.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should maintain state across getInstance calls', () => {
      const instance1 = KB3Service.getInstance();
      // Simulate some state change
      instance1.emit('test-event', { data: 'test' });

      const instance2 = KB3Service.getInstance();
      expect(instance2.listenerCount('test-event')).toBe(0);
      expect(instance1).toBe(instance2);
    });
  });

  describe('EventEmitter Integration', () => {
    it('should extend EventEmitter', () => {
      expect(service).toBeInstanceOf(EventEmitter);
    });

    it('should emit processing events', async () => {
      const mockListener = jest.fn();
      service.on('processing:started', mockListener);

      // Trigger an event that would cause processing:started
      await service.processUrl('https://example.com');

      expect(mockListener).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://example.com'
        })
      );
    });

    it('should emit batch processing events', async () => {
      const startListener = jest.fn();
      const completeListener = jest.fn();

      service.on('batch:started', startListener);
      service.on('batch:completed', completeListener);

      await service.processUrls(['https://example1.com', 'https://example2.com']);

      expect(startListener).toHaveBeenCalledWith(
        expect.objectContaining({
          count: 2
        })
      );
    });
  });

  describe('URL Management', () => {
    it('should add a single URL', async () => {
      const result = await service.addUrl('https://example.com');

      expect(result).toHaveProperty('url', 'https://example.com');
      expect(result).toHaveProperty('success');
    });

    it('should add a URL with tags', async () => {
      const result = await service.addUrl('https://example.com', ['test', 'documentation']);

      expect(result).toHaveProperty('url', 'https://example.com');
    });

    it('should add multiple URLs', async () => {
      const urls = [
        { url: 'https://example1.com', tags: ['test'] },
        { url: 'https://example2.com', tags: ['documentation'] }
      ];

      const results = await service.addUrls(urls);

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('url', 'https://example1.com');
      expect(results[1]).toHaveProperty('url', 'https://example2.com');
    });

    it('should set URL parameters', async () => {
      await expect(
        service.setUrlParameters('https://example.com', {
          scraperType: 'playwright',
          priority: 10
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Tag Management', () => {
    it('should create a tag', async () => {
      const tag = await service.createTag('test-tag');

      expect(tag).toHaveProperty('name', 'test-tag');
      expect(tag).toHaveProperty('id');
    });

    it('should create a tag with parent', async () => {
      await service.createTag('parent-tag');
      const childTag = await service.createTag('child-tag', 'parent-tag');

      expect(childTag).toHaveProperty('name', 'child-tag');
    });

    it('should get all tags', async () => {
      await service.createTag('tag1');
      await service.createTag('tag2');

      const tags = await service.getTags();
      expect(tags).toBeInstanceOf(Array);
    });

    it('should add tags to URL', async () => {
      const success = await service.addTagsToUrl('https://example.com', ['tag1', 'tag2']);
      expect(success).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should return available scrapers', () => {
      const scrapers = service.getAvailableScrapers();

      expect(scrapers).toContain('http');
      expect(scrapers).toContain('playwright');
      expect(scrapers).toContain('crawl4ai');
      expect(scrapers).toContain('docling');
      expect(scrapers).toContain('deepdoctection');
    });

    it('should return available cleaners', () => {
      const cleaners = service.getAvailableCleaners();

      expect(cleaners).toContain('sanitizehtml');
      expect(cleaners).toContain('xss');
      expect(cleaners).toContain('voca');
      expect(cleaners).toContain('remark');
      expect(cleaners).toContain('readability');
    });

    it('should return scraper configuration', () => {
      const config = service.getScraperConfig('playwright');

      expect(config).toHaveProperty('headless');
      expect(config).toHaveProperty('viewport');
      expect(config).toHaveProperty('waitUntil');
    });

    it('should return cleaner configuration', () => {
      const config = service.getCleanerConfig('sanitizehtml');

      expect(config).toHaveProperty('allowedTags');
      expect(config).toHaveProperty('allowedAttributes');
    });
  });

  describe('Processing', () => {
    it('should process a single URL', async () => {
      const result = await service.processUrl('https://example.com');

      expect(result).toHaveProperty('url', 'https://example.com');
      expect(result).toHaveProperty('success');
    });

    it('should process URLs with options', async () => {
      const result = await service.processUrl('https://example.com', {
        scraperType: 'playwright',
        cleaners: ['sanitizehtml', 'readability']
      });

      expect(result).toHaveProperty('url', 'https://example.com');
    });

    it('should process multiple URLs', async () => {
      const urls = ['https://example1.com', 'https://example2.com'];
      const results = await service.processUrls(urls);

      expect(results).toHaveLength(2);
    });

    it('should process URLs by tags', async () => {
      await service.createTag('test-tag');
      await service.addUrl('https://example.com', ['test-tag']);

      const results = await service.processUrlsByTags(['test-tag']);
      expect(results).toBeInstanceOf(Array);
    });
  });

  describe('Content Access', () => {
    it('should handle missing original content gracefully', async () => {
      const content = await service.getOriginalContent('non-existent-id');
      expect(content).toBeNull();
    });

    it('should handle missing cleaned content gracefully', async () => {
      const content = await service.getCleanedContent('non-existent-id');
      expect(content).toBeNull();
    });
  });

  describe('Statistics', () => {
    it('should return statistics object', async () => {
      const stats = await service.getStatistics();

      expect(stats).toHaveProperty('totalUrls');
      expect(stats).toHaveProperty('processedUrls');
      expect(stats).toHaveProperty('failedUrls');
      expect(stats).toHaveProperty('tags');
    });
  });

  describe('Export/Import', () => {
    it('should export data in JSON format', async () => {
      const data = await service.exportData({
        format: 'json',
        includeContent: false
      });

      expect(data).toBeInstanceOf(Object);
    });

    it('should import data', async () => {
      const testData = {
        urls: [
          { url: 'https://example.com', tags: ['test'] }
        ]
      };

      const result = await service.importData(testData, 'json');
      expect(result).toHaveProperty('success', true);
    });
  });

  describe('Error Handling', () => {
    it('should handle orchestrator errors gracefully', async () => {
      // Force an error by passing invalid data
      await expect(
        service.processUrl('')
      ).rejects.toThrow();
    });

    it('should emit error events', async () => {
      const errorListener = jest.fn();
      service.on('processing:failed', errorListener);

      try {
        await service.processUrl('invalid-url');
      } catch (e) {
        // Expected to fail
      }

      expect(errorListener).toHaveBeenCalled();
    });
  });

  describe('Cleanup', () => {
    it('should remove all listeners on cleanup', () => {
      service.on('test-event', () => {});
      service.on('another-event', () => {});

      expect(service.listenerCount('test-event')).toBe(1);
      expect(service.listenerCount('another-event')).toBe(1);

      service.cleanup();

      expect(service.listenerCount('test-event')).toBe(0);
      expect(service.listenerCount('another-event')).toBe(0);
    });
  });
});