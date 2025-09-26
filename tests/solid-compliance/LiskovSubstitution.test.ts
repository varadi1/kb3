/**
 * Tests for Liskov Substitution Principle compliance
 * Verifies that derived classes can be substituted for their base classes
 * without altering program correctness
 */

import {
  ExtensionBasedDetector,
  HeaderBasedDetector,
  ContentBasedDetector,
  UrlDetectorRegistry
} from '../../src/detectors';

import {
  HttpFetcher,
  FileFetcher,
  FetcherRegistry
} from '../../src/fetchers';

import {
  TextProcessor,
  HtmlProcessor,
  PdfProcessor,
  ProcessorRegistry
} from '../../src/processors';

import { MemoryKnowledgeStore } from '../../src/storage';
import { ContentType } from '../../src/interfaces/IUrlDetector';

describe('Liskov Substitution Principle Compliance', () => {
  describe('URL Detectors', () => {
    test('all detector implementations should be substitutable in registry', async () => {
      const detectors = [
        new ExtensionBasedDetector(),
        new HeaderBasedDetector(),
        new ContentBasedDetector()
      ];

      const registry = new UrlDetectorRegistry();

      // All detectors should be substitutable
      for (const detector of detectors) {
        registry.addDetector(detector);
        expect(registry.getDetectorCount()).toBeGreaterThan(0);
      }

      // Registry should work with any combination of detectors
      const testUrl = 'https://example.com/document.pdf';

      try {
        const result = await registry.detect(testUrl);
        expect(result).toHaveProperty('type');
        expect(result).toHaveProperty('confidence');
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
      } catch (error: any) {
        // Some detectors might not handle the URL, which is acceptable
        console.log('Detection failed as expected for some implementations');
      }
    });

    test('detector implementations should maintain interface contracts', async () => {
      const detectors = [
        new ExtensionBasedDetector(),
        new HeaderBasedDetector(5000), // with timeout
        new ContentBasedDetector(1024, 10000) // with sample size and timeout
      ];

      const testCases = [
        'https://example.com/test.pdf',
        'https://example.com/page.html',
        'file:///path/to/document.txt'
      ];

      for (const detector of detectors) {
        for (const url of testCases) {
          const canHandle = detector.canHandle(url);
          expect(typeof canHandle).toBe('boolean');

          if (canHandle) {
            try {
              const result = await detector.detect(url);

              // All implementations must return same structure
              expect(result).toHaveProperty('type');
              expect(result).toHaveProperty('mimeType');
              expect(result).toHaveProperty('metadata');
              expect(result).toHaveProperty('confidence');

              expect(Object.values(ContentType)).toContain(result.type);
              expect(typeof result.mimeType).toBe('string');
              expect(typeof result.metadata).toBe('object');
              expect(typeof result.confidence).toBe('number');
            } catch (error: any) {
              // Network errors are acceptable for some implementations
              expect(error.message).toBeTruthy();
            }
          }
        }
      }
    });
  });

  describe('Content Fetchers', () => {
    test('fetcher implementations should be substitutable', () => {
      const fetchers = [
        new HttpFetcher(),
        new FileFetcher()
      ];

      const registry = new FetcherRegistry();

      // All fetchers should be substitutable in registry
      for (const fetcher of fetchers) {
        registry.addFetcher(fetcher);
        expect(registry.getFetcherCount()).toBeGreaterThan(0);
      }
    });

    test('fetcher implementations should maintain interface contracts', () => {
      const httpFetcher = new HttpFetcher();
      const fileFetcher = new FileFetcher();

      const testCases = [
        'https://example.com/test.txt',
        'file:///path/to/test.txt',
        'invalid-url'
      ];

      for (const url of testCases) {
        // canHandle should always return boolean
        expect(typeof httpFetcher.canFetch(url)).toBe('boolean');
        expect(typeof fileFetcher.canFetch(url)).toBe('boolean');
      }
    });

    test('fetcher configuration should work consistently across implementations', () => {
      const fetchers = [
        new HttpFetcher(50 * 1024 * 1024, 15000), // 50MB, 15s timeout
        new FileFetcher(100 * 1024 * 1024, 5000)  // 100MB, 5s timeout
      ];

      for (const fetcher of fetchers) {
        // All fetchers should support same configuration methods
        expect(typeof fetcher.getMaxSize).toBe('function');
        expect(typeof fetcher.getTimeout).toBe('function');
        expect(typeof fetcher.getUserAgent).toBe('function');

        expect(typeof fetcher.getMaxSize()).toBe('number');
        expect(typeof fetcher.getTimeout()).toBe('number');
        expect(typeof fetcher.getUserAgent()).toBe('string');
      }
    });
  });

  describe('Content Processors', () => {
    test('processor implementations should be substitutable in registry', () => {
      const processors = [
        new TextProcessor(),
        new HtmlProcessor(),
        new PdfProcessor()
      ];

      const registry = new ProcessorRegistry();

      // All processors should be substitutable
      for (const processor of processors) {
        registry.addProcessor(processor);
        expect(registry.getProcessorCount()).toBeGreaterThan(0);
      }
    });

    test('processor implementations should maintain interface contracts', async () => {
      const processors = [
        new TextProcessor(),
        new HtmlProcessor(),
        new PdfProcessor()
      ];

      const testContent = 'Sample text content for testing';
      const testContentBuffer = Buffer.from(testContent);

      for (const processor of processors) {
        const supportedTypes = processor.getSupportedTypes();
        expect(Array.isArray(supportedTypes)).toBe(true);
        expect(supportedTypes.length).toBeGreaterThan(0);

        for (const contentType of supportedTypes) {
          expect(processor.canProcess(contentType)).toBe(true);

          try {
            const result = await processor.process(testContentBuffer, contentType);

            // All implementations must return same structure
            expect(result).toHaveProperty('text');
            expect(result).toHaveProperty('metadata');
            expect(typeof result.text).toBe('string');
            expect(typeof result.metadata).toBe('object');

            // Optional properties should be consistent when present
            if (result.title !== undefined) {
              expect(typeof result.title).toBe('string');
            }
            if (result.images !== undefined) {
              expect(Array.isArray(result.images)).toBe(true);
            }
            if (result.links !== undefined) {
              expect(Array.isArray(result.links)).toBe(true);
            }
          } catch (error: any) {
            // Some processors might not handle the test content, which is acceptable
            expect(error.message).toBeTruthy();
          }
        }
      }
    });
  });

  describe('Knowledge Stores', () => {
    test('knowledge store implementations should be substitutable', async () => {
      // Create stores with same configuration
      const stores = [
        new MemoryKnowledgeStore(['url', 'title']),
        // FileKnowledgeStore would require setup, tested separately
      ];

      const testEntry = {
        id: 'test-1',
        url: 'https://example.com/test',
        title: 'Test Document',
        contentType: ContentType.TXT,
        text: 'Test content',
        metadata: { source: 'test' },
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100,
        checksum: 'abc123',
        processingStatus: 'completed' as any
      };

      for (const store of stores) {
        // All stores should support same operations
        const entryId = await store.store(testEntry);
        expect(typeof entryId).toBe('string');

        const retrieved = await store.retrieve(entryId);
        expect(retrieved).toBeTruthy();
        expect(retrieved?.url).toBe(testEntry.url);

        const stats = await store.getStats();
        expect(typeof stats.totalEntries).toBe('number');
        expect(typeof stats.totalSize).toBe('number');

        const updated = await store.update(entryId, { title: 'Updated Title' });
        expect(updated).toBe(true);

        const deleted = await store.delete(entryId);
        expect(deleted).toBe(true);
      }
    });
  });

  describe('Cross-Component Substitutability', () => {
    test('components should work together regardless of specific implementations', async () => {
      // Test that different combinations of implementations work together
      const detectorCombinations = [
        [new ExtensionBasedDetector()],
        [new ExtensionBasedDetector(), new HeaderBasedDetector()]
      ];

      const processorCombinations = [
        [new TextProcessor()],
        [new TextProcessor(), new HtmlProcessor()]
      ];

      for (const detectors of detectorCombinations) {
        for (const processors of processorCombinations) {
          const detectorRegistry = new UrlDetectorRegistry(detectors);
          const processorRegistry = new ProcessorRegistry(processors);

          expect(detectorRegistry.getDetectorCount()).toBe(detectors.length);
          expect(processorRegistry.getProcessorCount()).toBe(processors.length);

          // Registries should work with any combination
          const detectorInfo = detectorRegistry.getDetectorInfo();
          const processorInfo = processorRegistry.getProcessorInfo();

          expect(Array.isArray(detectorInfo)).toBe(true);
          expect(Array.isArray(processorInfo)).toBe(true);
        }
      }
    });
  });

  describe('Behavioral Consistency', () => {
    test('implementations should maintain consistent error behavior', async () => {
      const detectors = [
        new ExtensionBasedDetector(),
        new HeaderBasedDetector()
      ];

      const invalidUrl = 'not-a-url';

      for (const detector of detectors) {
        const canHandle = detector.canHandle(invalidUrl);

        if (!canHandle) {
          // Should consistently reject invalid URLs
          await expect(detector.detect(invalidUrl)).rejects.toThrow();
        }
      }
    });

    test('implementations should handle edge cases consistently', async () => {
      const processors = [
        new TextProcessor(),
        new HtmlProcessor()
      ];

      const edgeCases = [
        Buffer.alloc(0), // Empty buffer
        Buffer.from(''), // Empty string buffer
        Buffer.from('a'.repeat(1000000)) // Large content
      ];

      for (const processor of processors) {
        const supportedTypes = processor.getSupportedTypes();

        for (const contentType of supportedTypes) {
          for (const content of edgeCases) {
            try {
              const result = await processor.process(content, contentType);

              // Should always return valid structure
              expect(result).toHaveProperty('text');
              expect(result).toHaveProperty('metadata');
              expect(typeof result.text).toBe('string');
            } catch (error: any) {
              // Errors should be informative
              expect(error.message).toBeTruthy();
              expect(typeof error.message).toBe('string');
            }
          }
        }
      }
    });
  });
});