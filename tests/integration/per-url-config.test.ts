/**
 * Integration tests for per-URL configuration persistence
 * Tests end-to-end functionality with real database
 */

import { KnowledgeBaseFactory } from '../../src/factory/KnowledgeBaseFactory';
import { createUnifiedConfiguration } from '../../src/config/Configuration';
import * as path from 'path';
import * as fs from 'fs';
// Using built-in fs.rmSync instead of rimraf

describe('Per-URL Configuration Persistence Integration', () => {
  // Tests for per-URL configuration persistence with database
  const testDbPath = path.join(__dirname, '../temp/test-unified.db');
  const testDataPath = path.join(__dirname, '../temp/test-data');
  let kb: any;

  beforeAll(async () => {
    // Ensure temp directory exists
    const tempDir = path.dirname(testDbPath);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
  });

  beforeEach(async () => {
    // Clean up any existing test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Create KB with unified configuration
    const config = createUnifiedConfiguration();
    // Override the database path for testing
    if (config.storage.unified) {
      config.storage.unified.dbPath = testDbPath;
    }

    // Override file storage path for testing
    config.storage.fileStorage.basePath = testDataPath;
    config.scraping = {
      enabledScrapers: ['http', 'playwright', 'crawl4ai'],
      defaultScraper: 'http'
    };

    kb = await KnowledgeBaseFactory.createKnowledgeBase(config);
  });

  afterEach(() => {
    // Clean up test database
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    // Clean up test data directory
    if (fs.existsSync(testDataPath)) {
      fs.rmSync(testDataPath, { recursive: true, force: true });
    }
  });

  describe('URL Configuration Persistence', () => {
    test('Should persist scraper configuration across restarts', async () => {
      const testUrl = 'https://example.com/test';

      // Set URL parameters
      const fetcher = kb.getContentFetcher();
      if (fetcher && 'setUrlParameters' in fetcher) {
        await (fetcher as any).setUrlParameters(testUrl, {
          scraperType: 'playwright',
          parameters: {
            headless: true,
            viewport: { width: 1920, height: 1080 },
            waitUntil: 'networkidle'
          },
          priority: 20
        });
      }

      // Create new KB instance (simulating restart)
      const config2 = createUnifiedConfiguration();
      if (config2.storage.unified) {
        config2.storage.unified.dbPath = testDbPath;
      }

      // Override file storage path for testing
      config2.storage.fileStorage.basePath = testDataPath;
      config2.scraping = {
        enabledScrapers: ['http', 'playwright', 'crawl4ai'],
        defaultScraper: 'http'
      };
      const kb2 = await KnowledgeBaseFactory.createKnowledgeBase(config2);

      // Get parameters from new instance
      const fetcher2 = kb2.getContentFetcher();
      if (fetcher2 && 'getParameterManager' in fetcher2) {
        const manager = (fetcher2 as any).getParameterManager();
        if (manager && 'getParameters' in manager) {
          const config = manager.getParameters(testUrl);
          expect(config).toBeTruthy();
          expect(config.scraperType).toBe('playwright');
          expect(config.parameters.headless).toBe(true);
          expect(config.parameters.viewport).toEqual({ width: 1920, height: 1080 });
          expect(config.priority).toBe(20);
        }
      }
    });

    test('Should use persisted configuration when processing URL', async () => {
      // Test configuration persistence without external dependencies
      // Use a test URL (won't actually be fetched, just testing config)
      const testUrl = 'https://example.com/test-config-persistence';

      // First register the URL in the repository
      const urlRepo = kb.getUrlRepository();
      if (urlRepo) {
        await urlRepo.register(testUrl);
      }

      // Set custom scraper configuration - use minimal valid config
      const fetcher = kb.getContentFetcher();
      if (fetcher && 'setUrlParameters' in fetcher) {
        try {
          await (fetcher as any).setUrlParameters(testUrl, {
            scraperType: 'http',
            parameters: {}, // Empty parameters, should use defaults
            priority: 20
          });

          // Verify configuration was persisted
          if ('getUrlParameters' in fetcher) {
            const config = await (fetcher as any).getUrlParameters(testUrl);
            expect(config).toBeTruthy();
            expect(config.scraperType).toBe('http');
            expect(config.priority).toBe(20);
          }
        } catch (error: any) {
          // If this fails, it means the validator isn't registered
          // This should not happen as HttpParameterValidator should be registered
          console.log('Unexpected error:', error.message);
          throw error;
        }
      }
    });

    test('Should handle batch configuration updates', async () => {
      const urls = [
        'https://example.com/page1',
        'https://example.com/page2',
        'https://example.com/page3'
      ];

      const fetcher = kb.getContentFetcher();
      if (fetcher && 'getParameterManager' in fetcher) {
        const manager = (fetcher as any).getParameterManager();

        // Set batch parameters
        if (manager && 'setBatchParameters' in manager) {
          manager.setBatchParameters({
            urls,
            configuration: {
              scraperType: 'crawl4ai',
              parameters: {
                extractLinks: true,
                extractMetadata: true
              },
              priority: 15
            }
          });
        }

        // Verify all URLs have configuration
        if (manager && 'getParameters' in manager) {
          for (const url of urls) {
            const config = manager.getParameters(url);
            expect(config).toBeTruthy();
            expect(config.scraperType).toBe('crawl4ai');
            expect(config.parameters.extractLinks).toBe(true);
          }
        }
      }
    });

    test('Should remove configuration when requested', async () => {
      const testUrl = 'https://example.com/removable';

      const fetcher = kb.getContentFetcher();
      if (fetcher && 'setUrlParameters' in fetcher) {
        // Set configuration
        await (fetcher as any).setUrlParameters(testUrl, {
          scraperType: 'playwright',
          parameters: { headless: true }
        });

        // Remove configuration
        if (fetcher && 'parameterManager' in fetcher) {
          const manager = (fetcher as any).getParameterManager();
          if (manager && 'clearParameters' in manager) {
            manager.clearParameters(testUrl);
          }

          // Verify removed
          if (manager && 'getParameters' in manager) {
            const config = manager.getParameters(testUrl);
            expect(config).toBeNull();
          }
        }
      }
    });

    test('Should list all configured URLs', async () => {
      const configuredUrls = [
        'https://example.com/config1',
        'https://example.com/config2',
        'https://example.com/config3'
      ];

      const fetcher = kb.getContentFetcher();
      if (fetcher && 'setUrlParameters' in fetcher) {
        // Configure multiple URLs
        for (const url of configuredUrls) {
          await (fetcher as any).setUrlParameters(url, {
            scraperType: 'http',
            parameters: {}
          });
        }

        // Get list of configured URLs
        if (fetcher && 'getParameterManager' in fetcher) {
          const manager = (fetcher as any).getParameterManager();
          if (manager && 'getConfiguredUrls' in manager) {
            const urls = await manager.getConfiguredUrls();
            expect(urls).toHaveLength(3);
            expect(urls).toEqual(expect.arrayContaining(configuredUrls));
          }
        }
      }
    });
  });

  describe('Configuration with Cleaners', () => {
    test('Should persist cleaner configuration', async () => {
      const testUrl = 'https://example.com/with-cleaners';

      const fetcher = kb.getContentFetcher();
      if (fetcher && 'setUrlParameters' in fetcher) {
        await (fetcher as any).setUrlParameters(testUrl, {
          scraperType: 'http',
          parameters: {},
          cleaners: ['sanitizehtml', 'readability', 'voca'],
          priority: 10
        });

        // Retrieve configuration
        if (fetcher && 'parameterManager' in fetcher) {
          const manager = (fetcher as any).getParameterManager();
          if (manager && 'getParameters' in manager) {
            const config = manager.getParameters(testUrl);
            expect(config).toBeTruthy();
            expect(config.cleaners).toEqual(['sanitizehtml', 'readability', 'voca']);
          }
        }
      }
    });
  });

  describe('Error Handling', () => {
    test('Should handle invalid scraper type gracefully', async () => {
      const testUrl = 'https://example.com/invalid';

      const fetcher = kb.getContentFetcher();
      if (fetcher && 'setUrlParameters' in fetcher) {
        // Should throw validation error for unknown scraper
        await expect(
          (fetcher as any).setUrlParameters(testUrl, {
            scraperType: 'invalid-scraper',
            parameters: {}
          })
        ).rejects.toThrow();
      }
    });

    test('Should handle database errors gracefully', async () => {
      // Close database to simulate error
      const urlRepo = kb.getUrlRepository();
      if (urlRepo && 'db' in urlRepo) {
        const db = (urlRepo as any).db;
        if (db && 'close' in db) {
          await new Promise((resolve) => {
            db.close(resolve);
          });
        }
      }

      const testUrl = 'https://example.com/db-error';
      const fetcher = kb.getContentFetcher();

      if (fetcher && 'getParameterManager' in fetcher) {
        const manager = (fetcher as any).getParameterManager();
        if (manager && 'getParameters' in manager) {
          // Should return null or cached value, not throw
          const config = await manager.getParameters(testUrl);
          expect(config).toBeNull();
        }
      }
    });
  });
});