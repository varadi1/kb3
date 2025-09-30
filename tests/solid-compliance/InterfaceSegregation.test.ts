/**
 * Tests for Interface Segregation Principle compliance
 * Verifies that interfaces are small and focused, and clients don't depend
 * on interfaces they don't use
 */

import {
  IUrlDetector,
  IContentFetcher,
  IContentProcessor,
  IKnowledgeStore
} from '../../src/interfaces';

import { ExtensionBasedDetector } from '../../src/detectors/ExtensionBasedDetector';
import { HttpFetcher } from '../../src/fetchers/HttpFetcher';
import { TextProcessor } from '../../src/processors/TextProcessor';
import { UnifiedSqlStorage } from '../../src/storage/UnifiedSqlStorage';
import { LocalFileStorage } from '../../src/storage/LocalFileStorage';
import { KnowledgeBaseOrchestrator } from '../../src/orchestrator/KnowledgeBaseOrchestrator';

describe('Interface Segregation Principle Compliance', () => {
  describe('Interface Size and Focus', () => {
    test('IUrlDetector should have focused, minimal interface', () => {
      const detector = new ExtensionBasedDetector();

      // Should only have detection-related methods
      expect(typeof detector.canHandle).toBe('function');
      expect(typeof detector.detect).toBe('function');

      // Should not have methods from other concerns
      expect((detector as any).fetch).toBeUndefined();
      expect((detector as any).process).toBeUndefined();
      expect((detector as any).store).toBeUndefined();
      expect((detector as any).search).toBeUndefined();
    });

    test('IContentFetcher should have focused, minimal interface', () => {
      const fetcher = new HttpFetcher();

      // Should only have fetching-related methods
      expect(typeof fetcher.canFetch).toBe('function');
      expect(typeof fetcher.fetch).toBe('function');

      // Should not have methods from other concerns
      expect((fetcher as any).detect).toBeUndefined();
      expect((fetcher as any).process).toBeUndefined();
      expect((fetcher as any).store).toBeUndefined();
      expect((fetcher as any).search).toBeUndefined();
    });

    test('IContentProcessor should have focused, minimal interface', () => {
      const processor = new TextProcessor();

      // Should only have processing-related methods
      expect(typeof processor.getSupportedTypes).toBe('function');
      expect(typeof processor.canProcess).toBe('function');
      expect(typeof processor.process).toBe('function');

      // Should not have methods from other concerns
      expect((processor as any).detect).toBeUndefined();
      expect((processor as any).fetch).toBeUndefined();
      expect((processor as any).store).toBeUndefined();
      expect((processor as any).search).toBeUndefined();
    });

    test('IKnowledgeStore should have focused, minimal interface', async () => {
      const storage = new UnifiedSqlStorage({
        dbPath: ':memory:'
      });
      await storage.initialize();
      const store = storage.getRepositories().knowledgeStore;

      // Should only have storage/retrieval methods
      expect(typeof store.store).toBe('function');
      expect(typeof store.retrieve).toBe('function');
      expect(typeof store.update).toBe('function');
      expect(typeof store.delete).toBe('function');
      expect(typeof store.search).toBe('function');
      expect(typeof store.getStats).toBe('function');

      // Should not have methods from other concerns
      expect((store as any).detect).toBeUndefined();
      expect((store as any).fetch).toBeUndefined();
      expect((store as any).process).toBeUndefined();

      await storage.close();
    });

    test('IFileStorage should have focused, minimal interface', () => {
      const storage = new LocalFileStorage('./test-storage');

      // Should only have file operations
      expect(typeof storage.store).toBe('function');
      expect(typeof storage.retrieve).toBe('function');
      expect(typeof storage.exists).toBe('function');
      expect(typeof storage.delete).toBe('function');
      expect(typeof storage.getMetadata).toBe('function');
      expect(typeof storage.list).toBe('function');
      expect(typeof storage.getStats).toBe('function');

      // Should not have methods from other concerns
      expect((storage as any).detect).toBeUndefined();
      expect((storage as any).fetch).toBeUndefined();
      expect((storage as any).process).toBeUndefined();
      expect((storage as any).search).toBeUndefined();
    });
  });

  describe('Client Dependencies', () => {
    test('URL detector clients should only depend on detection interface', () => {
      // Mock client that only needs detection capability
      class UrlTypeChecker {
        constructor(private detector: IUrlDetector) {}

        async checkType(url: string) {
          if (this.detector.canHandle(url)) {
            return await this.detector.detect(url);
          }
          return null;
        }

        // Should not need to know about other interfaces
        // This client doesn't need fetch, process, or store capabilities
      }

      const detector = new ExtensionBasedDetector();
      const checker = new UrlTypeChecker(detector);

      expect(checker).toBeDefined();

      // Client should only use detector methods
      expect(typeof (checker as any).detector.canHandle).toBe('function');
      expect(typeof (checker as any).detector.detect).toBe('function');
    });

    test('Content fetcher clients should only depend on fetching interface', () => {
      // Mock client that only needs fetching capability
      class ContentDownloader {
        constructor(private fetcher: IContentFetcher) {}

        async download(url: string) {
          if (this.fetcher.canFetch(url)) {
            return await this.fetcher.fetch(url);
          }
          throw new Error('Cannot handle URL');
        }

        // Should not need to know about detection, processing, or storage
      }

      const fetcher = new HttpFetcher();
      const downloader = new ContentDownloader(fetcher);

      expect(downloader).toBeDefined();

      // Client should only use fetcher methods
      expect(typeof (downloader as any).fetcher.canFetch).toBe('function');
      expect(typeof (downloader as any).fetcher.fetch).toBe('function');
    });

    test('Content processor clients should only depend on processing interface', () => {
      // Mock client that only needs processing capability
      class TextExtractor {
        constructor(private processor: IContentProcessor) {}

        async extract(content: Buffer, contentType: any) {
          if (this.processor.canProcess(contentType)) {
            const result = await this.processor.process(content, contentType);
            return result.text;
          }
          return '';
        }

        getSupportedTypes() {
          return this.processor.getSupportedTypes();
        }

        // Should not need detection, fetching, or storage capabilities
      }

      const processor = new TextProcessor();
      const extractor = new TextExtractor(processor);

      expect(extractor).toBeDefined();

      // Client should only use processor methods
      expect(typeof (extractor as any).processor.canProcess).toBe('function');
      expect(typeof (extractor as any).processor.process).toBe('function');
      expect(typeof (extractor as any).processor.getSupportedTypes).toBe('function');
    });
  });

  describe('Interface Composition', () => {
    test('complex components should compose multiple focused interfaces', async () => {
      // The orchestrator should compose all interfaces without violating ISP
      const detector = new ExtensionBasedDetector();
      const fetcher = new HttpFetcher();
      const processor = new TextProcessor();
      const unifiedStorage = new UnifiedSqlStorage({
        dbPath: ':memory:'
      });
      await unifiedStorage.initialize();
      const knowledgeStore = unifiedStorage.getRepositories().knowledgeStore;
      const fileStorage = new LocalFileStorage('./test-storage');

      const orchestrator = new KnowledgeBaseOrchestrator(
        detector,
        fetcher,
        processor,
        knowledgeStore,
        fileStorage
      );

      // Orchestrator should have its own focused interface
      expect(typeof orchestrator.processUrl).toBe('function');
      expect(typeof orchestrator.processUrls).toBe('function');
      expect(typeof orchestrator.getStatus).toBe('function');

      // But should not expose methods from composed interfaces directly
      expect((orchestrator as any).canHandle).toBeUndefined();
      expect((orchestrator as any).fetch).toBeUndefined();
      expect((orchestrator as any).process).toBeUndefined();
      expect((orchestrator as any).store).toBeUndefined();

      await unifiedStorage.close();
    });
  });

  describe('Optional Interface Methods', () => {
    test('interfaces should not force implementation of unused methods', () => {
      // Create minimal implementations that only implement required methods
      class MinimalDetector implements IUrlDetector {
        canHandle(url: string): boolean {
          return url.endsWith('.txt');
        }

        async detect(_url: string) {
          return {
            type: 'txt' as any,
            mimeType: 'text/plain',
            metadata: {},
            confidence: 1.0
          };
        }
      }

      class MinimalFetcher implements IContentFetcher {
        canFetch(url: string): boolean {
          return url.startsWith('test://');
        }

        async fetch(url: string) {
          return {
            content: Buffer.from('test content'),
            mimeType: 'text/plain',
            size: 12,
            headers: {},
            url,
            metadata: {}
          };
        }
      }

      const detector = new MinimalDetector();
      const fetcher = new MinimalFetcher();

      // Should work without needing to implement unused methods
      expect(detector.canHandle('test.txt')).toBe(true);
      expect(fetcher.canFetch('test://example')).toBe(true);
    });
  });

  describe('Interface Segregation in Practice', () => {
    test('components should not be forced to depend on unused interfaces', () => {
      // Test that a component needing only detection doesn't need other interfaces
      class TypeBasedRouter {
        constructor(private detector: IUrlDetector) {}

        async route(url: string): Promise<string> {
          if (this.detector.canHandle(url)) {
            const classification = await this.detector.detect(url);
            return `route-${classification.type}`;
          }
          return 'route-unknown';
        }
      }

      // This component should work with just the detection interface
      const detector = new ExtensionBasedDetector();
      const router = new TypeBasedRouter(detector);

      expect(router).toBeDefined();

      // Router doesn't need other interfaces - ISP compliance
      expect((router as any).fetcher).toBeUndefined();
      expect((router as any).processor).toBeUndefined();
      expect((router as any).storage).toBeUndefined();
    });

    test('specialized clients should use specific interface subsets', async () => {
      // Mock a search-only client
      class SearchOnlyClient {
        constructor(private store: IKnowledgeStore) {}

        async findDocuments(query: string) {
          return await this.store.search({ query });
        }

        async getStatistics() {
          return await this.store.getStats();
        }

        // This client doesn't use store/update/delete methods
        // It only needs read operations from IKnowledgeStore
      }

      const unifiedStorage = new UnifiedSqlStorage({
        dbPath: ':memory:'
      });
      await unifiedStorage.initialize();
      const store = unifiedStorage.getRepositories().knowledgeStore;
      const searchClient = new SearchOnlyClient(store);

      // Client should work with just search functionality
      const results = await searchClient.findDocuments('test');
      const stats = await searchClient.getStatistics();

      expect(Array.isArray(results)).toBe(true);
      expect(typeof stats.totalEntries).toBe('number');

      // Client shouldn't expose unused operations
      expect((searchClient as any).storeEntry).toBeUndefined();
      expect((searchClient as any).update).toBeUndefined();
      expect((searchClient as any).delete).toBeUndefined();

      await unifiedStorage.close();
    });
  });

  describe('Interface Evolution', () => {
    test('interfaces should be stable and not require frequent changes', () => {
      // Test that adding new implementations doesn't require interface changes
      class CustomDetector implements IUrlDetector {
        canHandle(url: string): boolean {
          return url.includes('custom');
        }

        async detect(_url: string) {
          // New implementation with additional logic
          const customMetadata = {
            isCustom: true,
            processingHints: ['use-special-processor']
          };

          return {
            type: 'custom' as any,
            mimeType: 'application/custom',
            metadata: customMetadata,
            confidence: 0.95
          };
        }
      }

      const detector = new CustomDetector();

      // Should work with existing interface without modifications
      expect(detector.canHandle('custom-url')).toBe(true);

      // Interface remains stable
      expect(typeof detector.canHandle).toBe('function');
      expect(typeof detector.detect).toBe('function');
    });
  });
});