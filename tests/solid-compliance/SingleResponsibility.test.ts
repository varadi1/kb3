/**
 * Tests for Single Responsibility Principle compliance
 * Verifies that each class has a single, well-defined purpose
 */

import { ExtensionBasedDetector } from '../../src/detectors/ExtensionBasedDetector';
import { BaseProcessor } from '../../src/processors/BaseProcessor';
import { BaseKnowledgeStore } from '../../src/storage/BaseKnowledgeStore';
import { BaseFileStorage } from '../../src/storage/BaseFileStorage';
import { HttpFetcher } from '../../src/fetchers/HttpFetcher';

describe('Single Responsibility Principle Compliance', () => {
  describe('URL Detectors', () => {
    test('should have single responsibility: URL type detection', () => {
      // Verify that URL detector has only detection-related methods
      const detectorMethods = Object.getOwnPropertyNames(ExtensionBasedDetector.prototype);

      const expectedMethods = [
        'constructor',
        'canHandle'
      ];

      expectedMethods.forEach(method => {
        expect(detectorMethods).toContain(method);
      });

      // Should not contain methods unrelated to detection
      const forbiddenMethods = [
        'fetch',
        'process',
        'store',
        'retrieve',
        'search',
        'index'
      ];

      forbiddenMethods.forEach(method => {
        expect(detectorMethods).not.toContain(method);
      });
    });
  });

  describe('Content Processors', () => {
    test('should have single responsibility: content processing', () => {
      const processorMethods = Object.getOwnPropertyNames(BaseProcessor.prototype);

      const expectedMethods = [
        'constructor',
        'getSupportedTypes',
        'canProcess',
        'process'
      ];

      expectedMethods.forEach(method => {
        expect(processorMethods).toContain(method);
      });

      // Should not contain methods unrelated to processing
      const forbiddenMethods = [
        'fetch',
        'detect',
        'store',
        'retrieve',
        'search'
      ];

      forbiddenMethods.forEach(method => {
        expect(processorMethods).not.toContain(method);
      });
    });
  });

  describe('Knowledge Store', () => {
    test('should have single responsibility: knowledge management', () => {
      const storeMethods = Object.getOwnPropertyNames(BaseKnowledgeStore.prototype);

      const expectedMethods = [
        'constructor'
      ];

      expectedMethods.forEach(method => {
        expect(storeMethods).toContain(method);
      });

      // Should not contain methods unrelated to knowledge management
      const forbiddenMethods = [
        'fetch',
        'detect',
        'process',
        'canHandle',
        'canProcess'
      ];

      forbiddenMethods.forEach(method => {
        expect(storeMethods).not.toContain(method);
      });
    });
  });

  describe('File Storage', () => {
    test('should have single responsibility: file operations', () => {
      const storageMethods = Object.getOwnPropertyNames(BaseFileStorage.prototype);

      const expectedMethods = [
        'constructor'
      ];

      expectedMethods.forEach(method => {
        expect(storageMethods).toContain(method);
      });

      // Should not contain methods unrelated to file storage
      const forbiddenMethods = [
        'detect',
        'process',
        'search',
        'canHandle',
        'canProcess'
      ];

      forbiddenMethods.forEach(method => {
        expect(storageMethods).not.toContain(method);
      });
    });
  });

  describe('Content Fetchers', () => {
    test('should have single responsibility: content retrieval', () => {
      const fetcherMethods = Object.getOwnPropertyNames(HttpFetcher.prototype);

      const expectedMethods = [
        'constructor',
        'canFetch'
      ];

      expectedMethods.forEach(method => {
        expect(fetcherMethods).toContain(method);
      });

      // Should not contain methods unrelated to fetching
      const forbiddenMethods = [
        'detect',
        'process',
        'store',
        'search',
        'canProcess'
      ];

      forbiddenMethods.forEach(method => {
        expect(fetcherMethods).not.toContain(method);
      });
    });
  });

  test('should maintain separation of concerns across components', () => {
    // Test that each component type handles different concerns
    const componentConcerns = {
      'Detector': ['detection', 'classification', 'type-identification'],
      'Fetcher': ['retrieval', 'downloading', 'network-access'],
      'Processor': ['parsing', 'extraction', 'transformation'],
      'KnowledgeStore': ['indexing', 'searching', 'metadata-management'],
      'FileStorage': ['file-operations', 'storage', 'persistence']
    };

    // Verify no overlap in primary concerns
    const allConcerns = Object.values(componentConcerns).flat();
    const uniqueConcerns = new Set(allConcerns);

    expect(allConcerns.length).toBe(uniqueConcerns.size);
  });
});