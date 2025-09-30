/**
 * Tests for Open/Closed Principle compliance
 * Verifies that classes are open for extension but closed for modification
 */

import { UrlDetectorRegistry, ExtensionBasedDetector } from '../../src/detectors';
import { FetcherRegistry, HttpFetcher } from '../../src/fetchers';
import { ProcessorRegistry, TextProcessor } from '../../src/processors';
import { MemoryKnowledgeStore } from '../../src/storage';
import { ContentType } from '../../src/interfaces/IUrlDetector';

// Mock implementations for testing extensibility
class TestUrlDetector extends ExtensionBasedDetector {
  canHandle(url: string): boolean {
    return url.includes('test');
  }

  async detect(_url: string) {
    return {
      type: ContentType.TXT,
      mimeType: 'text/plain',
      metadata: { test: true },
      confidence: 1.0
    };
  }
}

class TestProcessor extends TextProcessor {
  getSupportedTypes() {
    return [ContentType.TXT, 'test' as any];
  }

  async process(content: Buffer | string, contentType: ContentType, options: any) {
    const result = await super.process(content, contentType, options);
    return {
      ...result,
      metadata: { ...result.metadata, enhanced: true }
    };
  }
}

describe('Open/Closed Principle Compliance', () => {
  describe('URL Detector Registry', () => {
    test('should allow adding new detectors without modifying existing code', () => {
      const registry = new UrlDetectorRegistry();
      const originalDetectorCount = registry.getDetectorCount();

      // Add new detector - extension without modification
      const testDetector = new TestUrlDetector();
      registry.addDetector(testDetector);

      expect(registry.getDetectorCount()).toBe(originalDetectorCount + 1);

      // Verify new detector is used
      const detectorInfo = registry.getDetectorInfo();
      expect(detectorInfo.some(info => info.name === 'TestUrlDetector')).toBe(true);
    });

    test('should support custom detection logic through extension', async () => {
      const registry = new UrlDetectorRegistry();
      const testDetector = new TestUrlDetector();
      registry.addDetector(testDetector);

      const result = await registry.detect('https://test.example.com');

      expect(result.metadata.test).toBe(true);
      expect(result.type).toBe(ContentType.TXT);
    });
  });

  describe('Content Fetcher Registry', () => {
    test('should allow adding new fetchers without modifying existing code', () => {
      const registry = new FetcherRegistry();
      const originalFetcherCount = registry.getFetcherCount();

      // Add new fetcher
      const httpFetcher = new HttpFetcher();
      registry.addFetcher(httpFetcher);

      expect(registry.getFetcherCount()).toBe(originalFetcherCount + 1);
    });

    test('should support custom retry configuration through extension', () => {
      const registry = new FetcherRegistry();

      // Extend retry behavior without modifying base classes
      registry.setRetryConfig({
        maxRetries: 5,
        retryDelay: 2000,
        backoffFactor: 1.5,
        retryOn: ['CUSTOM_ERROR']
      });

      const config = registry.getRetryConfig();
      expect(config.maxRetries).toBe(5);
      expect(config.retryDelay).toBe(2000);
      expect(config.retryOn).toContain('CUSTOM_ERROR');
    });
  });

  describe('Content Processor Registry', () => {
    test('should allow adding new processors without modifying existing code', () => {
      const registry = new ProcessorRegistry();
      const originalProcessorCount = registry.getProcessorCount();

      // Add new processor - extension without modification
      const testProcessor = new TestProcessor();
      registry.addProcessor(testProcessor);

      expect(registry.getProcessorCount()).toBe(originalProcessorCount + 1);
    });

    test('should support enhanced processing through extension', async () => {
      const registry = new ProcessorRegistry();
      const testProcessor = new TestProcessor();
      registry.addProcessor(testProcessor);

      const result = await registry.process('test content', ContentType.TXT);

      expect(result.metadata.enhanced).toBe(true);
    });

    test('should allow fallback processor configuration', () => {
      const registry = new ProcessorRegistry();
      const fallbackProcessor = new TextProcessor();

      // Extend behavior by setting fallback
      registry.setFallbackProcessor(fallbackProcessor);

      const info = registry.getProcessorInfo();
      expect(info.some(p => p.name.includes('fallback'))).toBe(true);
    });
  });

  describe('Knowledge Store Extension', () => {
    test('should allow custom indexing without modifying base class', () => {
      // Use MemoryKnowledgeStore which extends BaseKnowledgeStore and has indexing methods
      const store = new MemoryKnowledgeStore();

      // Extend indexing behavior
      store.addIndexedField('customField');
      store.addIndexedField('metadata.category');

      const indexedFields = store.getIndexedFields();
      expect(indexedFields.has('customField')).toBe(true);
      expect(indexedFields.has('metadata.category')).toBe(true);
    });

    test('should support custom validation through inheritance', async () => {
      class ValidatingKnowledgeStore extends MemoryKnowledgeStore {
        async store(entry: any) {
          // Custom validation without modifying base class
          if (!entry.metadata?.validated) {
            throw new Error('Entry must be validated');
          }
          return super.store(entry);
        }
      }

      const store = new ValidatingKnowledgeStore();

      const validEntry = {
        id: '1',
        url: 'https://test.com',
        title: 'Test',
        contentType: ContentType.TXT,
        text: 'content',
        metadata: { validated: true },
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100,
        checksum: 'abc123',
        processingStatus: 'completed' as any
      };

      // Should work with validated entry
      expect(await store.store(validEntry)).toBeTruthy();

      // Should fail with unvalidated entry
      const invalidEntry = { ...validEntry, metadata: {} };
      await expect(store.store(invalidEntry)).rejects.toThrow('Entry must be validated');
    });
  });

  describe('System Extension Points', () => {
    test('should support plugin-like architecture', () => {
      // Test that the system can be extended through composition
      class CustomKnowledgeBaseExtension {
        constructor(
          private detectorRegistry: UrlDetectorRegistry,
          private processorRegistry: ProcessorRegistry
        ) {}

        addCustomSupport() {
          // Add custom detector
          this.detectorRegistry.addDetector(new TestUrlDetector());

          // Add custom processor
          this.processorRegistry.addProcessor(new TestProcessor());
        }

        getCapabilities() {
          return {
            detectors: this.detectorRegistry.getDetectorInfo(),
            processors: this.processorRegistry.getProcessorInfo()
          };
        }
      }

      const detectorRegistry = new UrlDetectorRegistry();
      const processorRegistry = new ProcessorRegistry();

      const extension = new CustomKnowledgeBaseExtension(detectorRegistry, processorRegistry);
      const beforeCapabilities = extension.getCapabilities();

      extension.addCustomSupport();

      const afterCapabilities = extension.getCapabilities();

      expect(afterCapabilities.detectors.length).toBeGreaterThan(beforeCapabilities.detectors.length);
      expect(afterCapabilities.processors.length).toBeGreaterThan(beforeCapabilities.processors.length);
    });
  });

  test('should maintain interface contracts when extending', async () => {
    // Test that extensions maintain the same interface contracts
    const baseDetector = new ExtensionBasedDetector();
    const customDetector = new TestUrlDetector();

    // Both should implement the same interface
    expect(typeof baseDetector.canHandle).toBe('function');
    expect(typeof customDetector.canHandle).toBe('function');

    expect(typeof baseDetector.detect).toBe('function');
    expect(typeof customDetector.detect).toBe('function');

    // Custom detector should be substitutable for base detector
    const testUrl = 'https://test.example.com';

    if (customDetector.canHandle(testUrl)) {
      const result = await customDetector.detect(testUrl);

      // Should return same structure as base implementation
      expect(result).toHaveProperty('type');
      expect(result).toHaveProperty('mimeType');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('confidence');
    }
  });
});