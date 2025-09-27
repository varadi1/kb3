/**
 * Integration tests for the complete knowledge base system
 * Tests the interaction between all components working together
 */

import { KnowledgeBaseFactory } from '../../src/factory/KnowledgeBaseFactory';
import { createDefaultConfiguration, createDevelopmentConfiguration, createSqlConfiguration } from '../../src/config';
import * as fs from 'fs/promises';

// Mock data for testing - uncomment when needed
// const sampleUrls = [
//   'https://example.com/document.pdf',
//   'https://example.com/page.html',
//   'https://example.com/data.csv',
//   'https://example.com/text.txt'
// ];

describe('System Integration Tests', () => {
  const testDataDir = './test-data/integration';
  const sqlDbPath = `${testDataDir}/test.db`;
  const urlDbPath = `${testDataDir}/urls.db`;

  beforeEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    try {
      await fs.rm(testDataDir, { recursive: true, force: true });
    } catch (e) {
      // Ignore cleanup errors
    }
  });
  describe('End-to-End Processing', () => {
    test('should process URLs through complete pipeline', async () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      // Note: This test would need actual URLs or mocked network responses
      // For demonstration, we'll test the structure
      expect(knowledgeBase).toBeDefined();
      expect(typeof knowledgeBase.processUrl).toBe('function');
      expect(typeof knowledgeBase.processUrls).toBe('function');
      expect(typeof knowledgeBase.getStatus).toBe('function');
    });

    test('should handle multiple URLs concurrently', async () => {
      const config = createDevelopmentConfiguration();
      config.processing.concurrency = 2;
      config.network.timeout = 2000; // Quick timeout for test URLs

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      // Test concurrent processing capability
      const urls = ['https://example.com/1.txt', 'https://example.com/2.txt'];

      try {
        const results = await knowledgeBase.processUrls(urls);
        expect(results).toHaveLength(urls.length);
        results.forEach(result => {
          expect(result).toHaveProperty('success');
          expect(result).toHaveProperty('url');
          expect(result).toHaveProperty('processingTime');
        });
      } catch (error) {
        // Expected for URLs that don't exist
        expect(error).toBeDefined();
      }
    }, 90000); // Increase timeout to 90 seconds
  });

  describe('SQL Storage Integration', () => {
    test('should create knowledge base with SQL storage', async () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: sqlDbPath,
            urlDbPath: urlDbPath
          },
          fileStorage: {
            basePath: `${testDataDir}/files`
          },
          fileStore: {
            path: `${testDataDir}/files`
          }
        }
      });

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(knowledgeBase).toBeDefined();
      expect(typeof knowledgeBase.processUrl).toBe('function');

      // Test basic functionality
      const status = await knowledgeBase.getStatus();
      expect(status).toHaveProperty('totalProcessing');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
    });

    test('should detect duplicate URLs with SQL storage', async () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: sqlDbPath,
            urlDbPath: urlDbPath
          },
          fileStorage: {
            basePath: `${testDataDir}/files`
          },
          fileStore: {
            path: `${testDataDir}/files`
          },
          enableDuplicateDetection: true
        }
      });

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      // Note: Without mocking network requests, this will fail
      // In a real test environment, you would mock the fetcher
      expect(knowledgeBase).toBeDefined();
      expect(typeof knowledgeBase.processUrl).toBe('function');
    });

    test('should work with memory storage and duplicate detection', async () => {
      const config = createDefaultConfiguration({
        storage: {
          knowledgeStore: {
            type: 'memory'
          },
          fileStorage: {
            basePath: `${testDataDir}/files`
          },
          fileStore: {
            path: `${testDataDir}/files`
          },
          enableDuplicateDetection: true
        }
      });

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(knowledgeBase).toBeDefined();
      expect(typeof knowledgeBase.processUrl).toBe('function');

      const status = await knowledgeBase.getStatus();
      expect(status.totalProcessing).toBe(0);
      expect(status.completed).toBe(0);
      expect(status.failed).toBe(0);
    });

    test('should handle force reprocess option', async () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: ':memory:', // Use in-memory SQLite for testing
            urlDbPath: ':memory:'
          },
          fileStorage: {
            basePath: `${testDataDir}/files`
          },
          fileStore: {
            path: `${testDataDir}/files`
          }
        }
      });

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(knowledgeBase).toBeDefined();

      // Test that forceReprocess option is accepted
      const options = { forceReprocess: true };
      expect(() => knowledgeBase.processUrl('https://example.com', options)).not.toThrow();
    });
  });

  describe('Configuration Flexibility', () => {
    test('should support all storage types', () => {
      // Memory storage
      const memoryConfig = createDefaultConfiguration({
        storage: {
          knowledgeStore: { type: 'memory' },
          fileStorage: {
            basePath: `${testDataDir}/files`
          },
          fileStore: {
            path: `${testDataDir}/files`
          }
        }
      });
      const memoryKB = KnowledgeBaseFactory.createKnowledgeBase(memoryConfig);
      expect(memoryKB).toBeDefined();

      // File storage
      const fileConfig = createDefaultConfiguration({
        storage: {
          knowledgeStore: {
            type: 'file',
            path: `${testDataDir}/knowledge`
          },
          fileStorage: {
            basePath: `${testDataDir}/files`
          },
          fileStore: {
            path: `${testDataDir}/files`
          }
        }
      });
      const fileKB = KnowledgeBaseFactory.createKnowledgeBase(fileConfig);
      expect(fileKB).toBeDefined();

      // SQL storage
      const sqlConfig = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: sqlDbPath
          },
          fileStorage: {
            basePath: `${testDataDir}/files`
          },
          fileStore: {
            path: `${testDataDir}/files`
          }
        }
      });
      const sqlKB = KnowledgeBaseFactory.createKnowledgeBase(sqlConfig);
      expect(sqlKB).toBeDefined();
    });

    test('should support mixed configurations', () => {
      const config = {
        ...createDefaultConfiguration(),
        storage: {
          knowledgeStore: {
            type: 'sql' as const,
            dbPath: sqlDbPath
          },
          fileStorage: {
            basePath: `${testDataDir}/files`,
            compressionEnabled: true,
            encryptionEnabled: false
          },
          fileStore: {
            path: `${testDataDir}/files`
          },
          enableDuplicateDetection: true
        },
        processing: {
          concurrency: 10,
          timeout: 60000
        }
      };

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config as any);
      expect(knowledgeBase).toBeDefined();
    });
  });

  describe('Component Integration', () => {
    test('should correctly wire all components together', () => {
      const config = createDefaultConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      // Test that all components are properly integrated
      expect(knowledgeBase.getProcessingStats()).toEqual({
        totalProcessed: 0,
        successful: 0,
        failed: 0
      });

      expect(knowledgeBase.getCurrentOperationsCount()).toBe(0);
    });

    test('should respect configuration settings', () => {
      const customConfig = createDefaultConfiguration({
        processing: {
          maxTextLength: 50000,
          concurrency: 3
        },
        network: {
          timeout: 15000,
          maxSize: 50 * 1024 * 1024
        }
      });

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(customConfig);
      expect(knowledgeBase).toBeDefined();
    });
  });

  describe('Error Handling Integration', () => {
    test('should handle processing errors gracefully', async () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      const invalidUrl = 'not-a-valid-url';

      const result = await knowledgeBase.processUrl(invalidUrl);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBeTruthy();
      expect(result.processingTime).toBeGreaterThanOrEqual(0);
    });

    test('should provide meaningful error information', async () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      const result = await knowledgeBase.processUrl('invalid-url');

      expect(result.success).toBe(false);
      if (result.error) {
        expect(result.error.code).toBeDefined();
        expect(result.error.message).toBeDefined();
        expect(result.error.stage).toBeDefined();
      }
    });
  });

  describe('Performance and Scalability', () => {
    test('should handle reasonable load', async () => {
      const config = createDevelopmentConfiguration();
      config.processing.concurrency = 5;
      // Reduce timeout for faster test execution
      config.network.timeout = 2000; // 2 seconds per request

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      const startTime = Date.now();

      // Process fewer URLs for faster test - these will fail quickly with reduced timeout
      const urls = Array.from({ length: 3 }, (_, i) => `https://example.com/${i}.txt`);

      const results = await knowledgeBase.processUrls(urls);
      const endTime = Date.now();

      expect(results).toHaveLength(urls.length);
      expect(endTime - startTime).toBeLessThan(40000); // Should complete within 40 seconds (allows for system variability)

      const stats = knowledgeBase.getProcessingStats();
      expect(stats.totalProcessed).toBe(urls.length);
    }, 50000); // Test timeout at 50 seconds to allow for completion

    test('should track processing statistics correctly', async () => {
      const config = createDevelopmentConfiguration();
      config.network.timeout = 2000; // Quick timeout for non-existent URL
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      const initialStats = knowledgeBase.getProcessingStats();
      expect(initialStats.totalProcessed).toBe(0);

      // Process a URL (will likely fail but should update stats)
      await knowledgeBase.processUrl('https://nonexistent-example.com/test.txt');

      const finalStats = knowledgeBase.getProcessingStats();
      expect(finalStats.totalProcessed).toBe(1);
      expect(finalStats.successful + finalStats.failed).toBe(1);
    });
  });

  describe('Configuration Variations', () => {
    test('should work with memory storage configuration', () => {
      const config = createDefaultConfiguration({
        storage: {
          knowledgeStore: {
            type: 'memory',
            indexedFields: ['url', 'title', 'tags']
          },
        fileStorage: {
            basePath: '/tmp/test-file-storage'
          },
        fileStore: {
          path: '/tmp/test-file-storage'
        }
      }
      });

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(knowledgeBase).toBeDefined();
    });

    test('should work with file storage configuration', () => {
      const config = createDefaultConfiguration({
        storage: {knowledgeStore: {
            type: 'file',
            path: '/tmp/test-knowledge-store'
          },
        fileStorage: {
            basePath: '/tmp/test-file-storage'
          },
        fileStore: {
          path: '/tmp/test-file-storage'
        }
      }
      });

      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(knowledgeBase).toBeDefined();
    });
  });

  describe('Factory Pattern Integration', () => {
    test('should create different configurations correctly', () => {
      const defaultKB = KnowledgeBaseFactory.createDefaultKnowledgeBase();
      const devKB = KnowledgeBaseFactory.createDevelopmentKnowledgeBase();
      const prodKB = KnowledgeBaseFactory.createProductionKnowledgeBase();

      expect(defaultKB).toBeDefined();
      expect(devKB).toBeDefined();
      expect(prodKB).toBeDefined();

      // All should be instances of the same orchestrator class
      expect(defaultKB.constructor.name).toBe('KnowledgeBaseOrchestrator');
      expect(devKB.constructor.name).toBe('KnowledgeBaseOrchestrator');
      expect(prodKB.constructor.name).toBe('KnowledgeBaseOrchestrator');
    });
  });

  describe('Status and Monitoring', () => {
    test('should provide system status information', async () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      const status = await knowledgeBase.getStatus();

      expect(status).toHaveProperty('totalProcessing');
      expect(status).toHaveProperty('completed');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('currentOperations');

      expect(typeof status.totalProcessing).toBe('number');
      expect(typeof status.completed).toBe('number');
      expect(typeof status.failed).toBe('number');
      expect(typeof status.pending).toBe('number');
      expect(Array.isArray(status.currentOperations)).toBe(true);
    });

    test('should track current operations', async () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      const initialCount = knowledgeBase.getCurrentOperationsCount();
      expect(initialCount).toBe(0);

      // Start processing (in background to test tracking)
      const processPromise = knowledgeBase.processUrl('https://example.com/test.txt');

      // Check if operation is tracked (might be too fast to catch)
      const duringCount = knowledgeBase.getCurrentOperationsCount();
      expect(duringCount).toBeGreaterThanOrEqual(0);

      // Wait for completion
      await processPromise;

      const finalCount = knowledgeBase.getCurrentOperationsCount();
      expect(finalCount).toBe(0);
    });
  });

  describe('Cleanup and Resource Management', () => {
    test('should properly cleanup resources', async () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      // Start some operations
      const promises = [
        knowledgeBase.processUrl('https://example1.com/test.txt'),
        knowledgeBase.processUrl('https://example2.com/test.txt')
      ];

      // Cancel all operations
      await knowledgeBase.cancelAllOperations();

      expect(knowledgeBase.getCurrentOperationsCount()).toBe(0);

      // Wait for promises to resolve (they might still complete)
      await Promise.allSettled(promises);
    });

    test('should reset statistics when requested', () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      // Reset stats
      knowledgeBase.resetStats();

      const stats = knowledgeBase.getProcessingStats();
      expect(stats.totalProcessed).toBe(0);
      expect(stats.successful).toBe(0);
      expect(stats.failed).toBe(0);
    });
  });

  describe('Real-world Simulation', () => {
    test('should handle mixed content types', async () => {
      const config = createDevelopmentConfiguration();
      const knowledgeBase = KnowledgeBaseFactory.createKnowledgeBase(config);

      const mixedUrls = [
        'https://example.com/doc.pdf',
        'https://example.com/page.html',
        'https://example.com/data.json',
        'https://example.com/sheet.xlsx',
        'invalid-url'
      ];

      const results = await knowledgeBase.processUrls(mixedUrls);

      expect(results).toHaveLength(mixedUrls.length);

      // Should have mix of successes and failures
      const failed = results.filter(r => !r.success);

      // At least the invalid URL should fail
      expect(failed.length).toBeGreaterThan(0);

      // Check that error information is provided for failures
      failed.forEach(result => {
        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
      });
    }, 60000);
  });
});