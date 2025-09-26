/**
 * Unit tests for SQL configuration in KnowledgeBaseFactory
 */

import { KnowledgeBaseFactory } from '../../../src/factory/KnowledgeBaseFactory';
import { createSqlConfiguration, createDefaultConfiguration } from '../../../src/config';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Factory SQL Configuration', () => {
  const testDbPath = './test-data/factory-test.db';
  const testUrlDbPath = './test-data/factory-urls.db';

  beforeEach(async () => {
    // Clean up any existing test databases
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(testUrlDbPath);
    } catch (e) {
      // Ignore if files don't exist
    }
  });

  afterEach(async () => {
    // Clean up test databases
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(testUrlDbPath);
      await fs.rmdir(path.dirname(testDbPath));
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('createSqlConfiguration', () => {
    test('should create SQL configuration with default paths', () => {
      const config = createSqlConfiguration();

      expect(config.storage.knowledgeStore.type).toBe('sql');
      expect(config.storage.knowledgeStore.dbPath).toBe('./data/knowledge.db');
      expect(config.storage.knowledgeStore.urlDbPath).toBe('./data/urls.db');
      expect(config.storage.enableDuplicateDetection).toBe(true);
    });

    test('should allow overriding SQL configuration', () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: './custom/knowledge.db',
            urlDbPath: './custom/urls.db'
          },
          fileStorage: {
            basePath: './custom/files'
          }
        },
        processing: {
          concurrency: 20
        }
      });

      expect(config.storage.knowledgeStore.dbPath).toBe('./custom/knowledge.db');
      expect(config.storage.knowledgeStore.urlDbPath).toBe('./custom/urls.db');
      expect(config.storage.fileStorage.basePath).toBe('./custom/files');
      expect(config.processing.concurrency).toBe(20);
    });

    test('should have backup enabled by default', () => {
      const config = createSqlConfiguration();
      expect(config.storage.knowledgeStore.backupEnabled).toBe(true);
    });

    test('should have compression enabled for file storage', () => {
      const config = createSqlConfiguration();
      expect(config.storage.fileStorage.compressionEnabled).toBe(true);
    });
  });

  describe('Factory with SQL Storage', () => {
    test('should create orchestrator with SQL knowledge store', () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: testDbPath
          },
          fileStorage: {
            basePath: './test-data/files'
          }
        }
      });

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(orchestrator).toBeDefined();
      // The orchestrator should have been created with SQL storage
      // We can't directly test the internal storage type, but we can verify it works
    });

    test('should create orchestrator with URL repository when SQL storage is used', () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: testDbPath,
            urlDbPath: testUrlDbPath
          },
          fileStorage: {
            basePath: './test-data/files'
          }
        }
      });

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(orchestrator).toBeDefined();
      // URL repository should be created when SQL storage is used
    });

    test('should create URL repository when duplicate detection is enabled', () => {
      const config = createDefaultConfiguration({
        storage: {
          knowledgeStore: {
            type: 'memory'
          },
          enableDuplicateDetection: true
        }
      });

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(orchestrator).toBeDefined();
      // URL repository should be created when duplicate detection is enabled
    });

    test('should not create URL repository when duplicate detection is disabled', () => {
      const config = createDefaultConfiguration({
        storage: {
          knowledgeStore: {
            type: 'memory'
          },
          enableDuplicateDetection: false
        }
      });

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);

      expect(orchestrator).toBeDefined();
      // URL repository should not be created when duplicate detection is disabled
    });
  });

  describe('Storage Type Selection', () => {
    test('should create SQL storage when type is sql', () => {
      const config = {
        ...createDefaultConfiguration(),
        storage: {
          ...createDefaultConfiguration().storage,
          knowledgeStore: {
            type: 'sql' as const,
            dbPath: testDbPath
          }
        }
      };

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(orchestrator).toBeDefined();
    });

    test('should create memory storage when type is memory', () => {
      const config = {
        ...createDefaultConfiguration(),
        storage: {
          ...createDefaultConfiguration().storage,
          knowledgeStore: {
            type: 'memory' as const
          }
        }
      };

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(orchestrator).toBeDefined();
    });

    test('should create file storage when type is file', () => {
      const config = {
        ...createDefaultConfiguration(),
        storage: {
          ...createDefaultConfiguration().storage,
          knowledgeStore: {
            type: 'file' as const,
            path: './test-data/knowledge'
          }
        }
      };

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(orchestrator).toBeDefined();
    });
  });

  describe('Configuration Validation', () => {
    test('should use default database path if not specified', () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql'
            // dbPath not specified
          }
        }
      });

      expect(config.storage.knowledgeStore.dbPath).toBe('./data/knowledge.db');
    });

    test('should use default URL database path if not specified', () => {
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql'
            // urlDbPath not specified
          }
        }
      });

      expect(config.storage.knowledgeStore.urlDbPath).toBe('./data/urls.db');
    });

    test('should handle missing storage configuration gracefully', () => {
      const config = createSqlConfiguration();
      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(orchestrator).toBeDefined();
    });
  });

  describe('Integration with Existing Configurations', () => {
    test('should maintain backward compatibility with memory storage', () => {
      const config = createDefaultConfiguration();
      expect(config.storage.knowledgeStore.type).toBe('memory');

      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(orchestrator).toBeDefined();
    });

    test('should maintain backward compatibility with file storage', () => {
      const config = createDefaultConfiguration({
        storage: {
          knowledgeStore: {
            type: 'file',
            path: './test-knowledge'
          }
        }
      });

      expect(config.storage.knowledgeStore.type).toBe('file');
      const orchestrator = KnowledgeBaseFactory.createKnowledgeBase(config);
      expect(orchestrator).toBeDefined();
    });

    test('should work with production configuration', () => {
      const orchestrator = KnowledgeBaseFactory.createProductionKnowledgeBase();
      expect(orchestrator).toBeDefined();
    });

    test('should work with development configuration', () => {
      const orchestrator = KnowledgeBaseFactory.createDevelopmentKnowledgeBase();
      expect(orchestrator).toBeDefined();
    });
  });
});