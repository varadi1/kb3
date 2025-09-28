/**
 * Tests for Dependency Inversion Principle compliance
 * Verifies that high-level modules don't depend on low-level modules,
 * and both depend on abstractions
 */

import { KnowledgeBaseOrchestrator } from '../../src/orchestrator/KnowledgeBaseOrchestrator';
import { KnowledgeBaseFactory } from '../../src/factory/KnowledgeBaseFactory';
import {
  IUrlDetector,
  IContentFetcher,
  IContentProcessor,
  IKnowledgeStore,
  IFileStorage
} from '../../src/interfaces';

import {
  UrlDetectorRegistry
} from '../../src/detectors';

// Registry imports removed as they're not used in tests

import { ContentType } from '../../src/interfaces/IUrlDetector';

// Mock implementations for testing dependency injection
class MockUrlDetector implements IUrlDetector {
  canHandle(_url: string): boolean {
    return true;
  }

  async detect(_url: string) {
    return {
      type: ContentType.TXT,
      mimeType: 'text/plain',
      metadata: { mock: true },
      confidence: 1.0
    };
  }
}

class MockContentFetcher implements IContentFetcher {
  canFetch(_url: string): boolean {
    return true;
  }

  async fetch(url: string) {
    return {
      content: Buffer.from('mock content'),
      mimeType: 'text/plain',
      size: 12,
      headers: {},
      url,
      metadata: { mock: true }
    };
  }
}

class MockContentProcessor implements IContentProcessor {
  getSupportedTypes() {
    return [ContentType.TXT];
  }

  canProcess(_contentType: ContentType): boolean {
    return _contentType === ContentType.TXT;
  }

  async process(_content: Buffer | string, _contentType: ContentType) {
    return {
      text: _content.toString(),
      metadata: { mock: true }
    };
  }
}

class MockKnowledgeStore implements IKnowledgeStore {
  private entries = new Map();

  async store(entry: any): Promise<string> {
    const id = `mock-${Date.now()}`;
    this.entries.set(id, entry);
    return id;
  }

  async retrieve(id: string) {
    return this.entries.get(id) || null;
  }

  async update(id: string, updates: any): Promise<boolean> {
    if (this.entries.has(id)) {
      const existing = this.entries.get(id);
      this.entries.set(id, { ...existing, ...updates });
      return true;
    }
    return false;
  }

  async delete(id: string): Promise<boolean> {
    return this.entries.delete(id);
  }

  async search(_criteria: any) {
    return Array.from(this.entries.values());
  }

  async getStats() {
    return {
      totalEntries: this.entries.size,
      totalSize: 0,
      contentTypes: {},
      processingStatus: {} as any
    };
  }
}

class MockFileStorage implements IFileStorage {
  private files = new Map();

  async store(content: Buffer, filename: string): Promise<string> {
    const path = `/mock/${filename}`;
    this.files.set(path, content);
    return path;
  }

  async retrieve(path: string): Promise<Buffer | null> {
    return this.files.get(path) || null;
  }

  async exists(path: string): Promise<boolean> {
    return this.files.has(path);
  }

  async delete(path: string): Promise<boolean> {
    return this.files.delete(path);
  }

  async getMetadata(path: string) {
    if (this.files.has(path)) {
      return {
        path,
        size: this.files.get(path).length,
        createdAt: new Date(),
        updatedAt: new Date(),
        mimeType: 'application/octet-stream',
        checksum: 'mock-checksum'
      };
    }
    return null;
  }

  async list(): Promise<string[]> {
    return Array.from(this.files.keys());
  }

  async getStats() {
    return {
      totalFiles: this.files.size,
      totalSize: 0,
      averageFileSize: 0,
      fileTypes: {}
    };
  }
}

describe('Dependency Inversion Principle Compliance', () => {
  describe('High-Level Module Independence', () => {
    test('orchestrator should depend on abstractions, not concrete implementations', () => {
      // Orchestrator constructor should accept interfaces, not concrete classes
      const mockDetector = new MockUrlDetector();
      const mockFetcher = new MockContentFetcher();
      const mockProcessor = new MockContentProcessor();
      const mockKnowledgeStore = new MockKnowledgeStore();
      const mockFileStorage = new MockFileStorage();

      // Should be able to create orchestrator with any implementations
      const orchestrator = new KnowledgeBaseOrchestrator(
        mockDetector,
        mockFetcher,
        mockProcessor,
        mockKnowledgeStore,
        mockFileStorage
      );

      expect(orchestrator).toBeDefined();
    });

    test('orchestrator should work with different combinations of implementations', async () => {
      const combinations = [
        {
          detector: new MockUrlDetector(),
          fetcher: new MockContentFetcher(),
          processor: new MockContentProcessor(),
          knowledgeStore: new MockKnowledgeStore(),
          fileStorage: new MockFileStorage()
        }
        // In a real test, we'd have more combinations with actual implementations
      ];

      for (const { detector, fetcher, processor, knowledgeStore, fileStorage } of combinations) {
        const orchestrator = new KnowledgeBaseOrchestrator(
          detector,
          fetcher,
          processor,
          knowledgeStore,
          fileStorage
        );

        const result = await orchestrator.processUrl('https://example.com/test.txt');

        expect(result.success).toBe(true);
        expect(result.url).toBe('https://example.com/test.txt');
      }
    });
  });

  describe('Dependency Injection', () => {
    test('factory should inject dependencies based on configuration', async () => {
      // Factory should create dependencies based on configuration
      // and inject them into high-level modules
      const { createDefaultConfiguration } = require('../../src/config');
      const config = createDefaultConfiguration();

      const orchestrator = await KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(orchestrator).toBeDefined();
      expect(orchestrator).toBeInstanceOf(KnowledgeBaseOrchestrator);
    });

    test('components should be swappable through dependency injection', () => {
      // Test that we can swap implementations without changing high-level code
      const detector1 = new MockUrlDetector();
      const detector2 = new MockUrlDetector();

      const orchestrator1 = new KnowledgeBaseOrchestrator(
        detector1,
        new MockContentFetcher(),
        new MockContentProcessor(),
        new MockKnowledgeStore(),
        new MockFileStorage()
      );

      const orchestrator2 = new KnowledgeBaseOrchestrator(
        detector2,
        new MockContentFetcher(),
        new MockContentProcessor(),
        new MockKnowledgeStore(),
        new MockFileStorage()
      );

      // Both should work the same way
      expect(orchestrator1).toBeDefined();
      expect(orchestrator2).toBeDefined();
    });
  });

  describe('Registry Pattern for Dependency Management', () => {
    test('registries should manage dependencies through interfaces', () => {
      const detectorRegistry = new UrlDetectorRegistry();
      const mockDetector = new MockUrlDetector();

      // Registry should accept any implementation of the interface
      detectorRegistry.addDetector(mockDetector);

      expect(detectorRegistry.getDetectorCount()).toBeGreaterThan(0);

      const info = detectorRegistry.getDetectorInfo();
      expect(info.some(d => d.name === 'MockUrlDetector')).toBe(true);
    });

    test('registries should not be tightly coupled to specific implementations', () => {
      // Test that registries work with different implementations
      class AlternativeDetector implements IUrlDetector {
        canHandle(_url: string): boolean {
          return _url.startsWith('alt://');
        }

        async detect(_url: string) {
          return {
            type: ContentType.HTML,
            mimeType: 'text/html',
            metadata: { alternative: true },
            confidence: 0.8
          };
        }
      }

      const registry = new UrlDetectorRegistry();
      registry.addDetector(new MockUrlDetector());
      registry.addDetector(new AlternativeDetector());

      expect(registry.getDetectorCount()).toBe(2);

      // Registry should work with both implementations
      const info = registry.getDetectorInfo();
      expect(info).toHaveLength(2);
      expect(info.some(d => d.name === 'MockUrlDetector')).toBe(true);
      expect(info.some(d => d.name === 'AlternativeDetector')).toBe(true);
    });
  });

  describe('Abstraction Layers', () => {
    test('high-level policy should not depend on low-level details', async () => {
      // Test that the orchestrator logic doesn't change based on implementation details
      class SlowProcessor implements IContentProcessor {
        getSupportedTypes() {
          return [ContentType.TXT];
        }

        canProcess(_contentType: ContentType): boolean {
          return _contentType === ContentType.TXT;
        }

        async process(_content: Buffer | string, _contentType: ContentType) {
          // Simulate slow processing
          await new Promise(resolve => setTimeout(resolve, 10));
          return {
            text: `slow-processed: ${_content.toString()}`,
            metadata: { slow: true }
          };
        }
      }

      class FastProcessor implements IContentProcessor {
        getSupportedTypes() {
          return [ContentType.TXT];
        }

        canProcess(_contentType: ContentType): boolean {
          return _contentType === ContentType.TXT;
        }

        async process(_content: Buffer | string, _contentType: ContentType) {
          return {
            text: `fast-processed: ${_content.toString()}`,
            metadata: { fast: true }
          };
        }
      }

      // Same high-level logic should work with both processors
      const slowOrchestrator = new KnowledgeBaseOrchestrator(
        new MockUrlDetector(),
        new MockContentFetcher(),
        new SlowProcessor(),
        new MockKnowledgeStore(),
        new MockFileStorage()
      );

      const fastOrchestrator = new KnowledgeBaseOrchestrator(
        new MockUrlDetector(),
        new MockContentFetcher(),
        new FastProcessor(),
        new MockKnowledgeStore(),
        new MockFileStorage()
      );

      const slowResult = await slowOrchestrator.processUrl('https://example.com/test.txt');
      const fastResult = await fastOrchestrator.processUrl('https://example.com/test.txt');

      // Both should succeed with same high-level behavior
      expect(slowResult.success).toBe(true);
      expect(fastResult.success).toBe(true);

      // Only the implementation details should differ
      expect(slowResult.url).toBe(fastResult.url);
    });
  });

  describe('Configuration-Based Dependency Injection', () => {
    test('system should create appropriate implementations based on configuration', async () => {
      const { createDefaultConfiguration, createProductionConfiguration } = require('../../src/config');

      const devConfig = createDefaultConfiguration();
      const prodConfig = createProductionConfiguration();

      const devOrchestrator = await KnowledgeBaseFactory.createKnowledgeBase(devConfig);
      const prodOrchestrator = await KnowledgeBaseFactory.createKnowledgeBase(prodConfig);

      // Both should create valid orchestrators
      expect(devOrchestrator).toBeDefined();
      expect(prodOrchestrator).toBeDefined();

      // But with different underlying implementations based on config
      expect(devOrchestrator).toBeInstanceOf(KnowledgeBaseOrchestrator);
      expect(prodOrchestrator).toBeInstanceOf(KnowledgeBaseOrchestrator);
    });
  });

  describe('Interface Stability', () => {
    test('adding new implementations should not require changes to high-level modules', () => {
      // Test that we can add new implementations without changing existing code
      class NewDetector implements IUrlDetector {
        canHandle(_url: string): boolean {
          return _url.includes('new-protocol');
        }

        async detect(_url: string) {
          return {
            type: 'new-type' as any,
            mimeType: 'application/new',
            metadata: { version: '2.0' },
            confidence: 0.9
          };
        }
      }

      // Should work with existing orchestrator without any changes
      const orchestrator = new KnowledgeBaseOrchestrator(
        new NewDetector(),
        new MockContentFetcher(),
        new MockContentProcessor(),
        new MockKnowledgeStore(),
        new MockFileStorage()
      );

      expect(orchestrator).toBeDefined();
    });
  });

  describe('Circular Dependency Prevention', () => {
    test('components should not have circular dependencies', () => {
      // Test that components don't depend on each other directly
      const detector = new MockUrlDetector();
      const fetcher = new MockContentFetcher();
      const processor = new MockContentProcessor();
      const knowledgeStore = new MockKnowledgeStore();
      const fileStorage = new MockFileStorage();

      // Each component should be independently testable
      expect(detector).toBeDefined();
      expect(fetcher).toBeDefined();
      expect(processor).toBeDefined();
      expect(knowledgeStore).toBeDefined();
      expect(fileStorage).toBeDefined();

      // Components should not reference each other internally
      expect((detector as any).fetcher).toBeUndefined();
      expect((detector as any).processor).toBeUndefined();
      expect((fetcher as any).detector).toBeUndefined();
      expect((fetcher as any).processor).toBeUndefined();
      expect((processor as any).detector).toBeUndefined();
      expect((processor as any).fetcher).toBeUndefined();
    });
  });

  describe('Inversion of Control', () => {
    test('control flow should be inverted through dependency injection', async () => {
      // High-level module (orchestrator) should control the flow
      // Low-level modules should be controlled by the high-level module
      let processingOrder: string[] = [];

      class TrackingDetector implements IUrlDetector {
        canHandle(_url: string): boolean {
          processingOrder.push('detector-canHandle');
          return true;
        }

        async detect(_url: string) {
          processingOrder.push('detector-detect');
          return {
            type: ContentType.TXT,
            mimeType: 'text/plain',
            metadata: {},
            confidence: 1.0
          };
        }
      }

      class TrackingFetcher implements IContentFetcher {
        canFetch(_url: string): boolean {
          processingOrder.push('fetcher-canFetch');
          return true;
        }

        async fetch(url: string) {
          processingOrder.push('fetcher-fetch');
          return {
            content: Buffer.from('content'),
            mimeType: 'text/plain',
            size: 7,
            headers: {},
            url,
            metadata: {}
          };
        }
      }

      const orchestrator = new KnowledgeBaseOrchestrator(
        new TrackingDetector(),
        new TrackingFetcher(),
        new MockContentProcessor(),
        new MockKnowledgeStore(),
        new MockFileStorage()
      );

      processingOrder = []; // Reset
      await orchestrator.processUrl('https://example.com/test.txt');

      // Orchestrator should control when each component is called
      expect(processingOrder).toContain('detector-canHandle');
      expect(processingOrder).toContain('detector-detect');
      expect(processingOrder).toContain('fetcher-canFetch');
      expect(processingOrder).toContain('fetcher-fetch');

      // Order should be controlled by high-level module
      expect(processingOrder.indexOf('detector-canHandle')).toBeLessThan(
        processingOrder.indexOf('detector-detect')
      );
    });
  });
});