/**
 * Unit tests for PersistentParameterManager
 * Tests decorator pattern implementation and persistence
 */

import { PersistentParameterManager } from '../../src/scrapers/PersistentParameterManager';
import { ScraperParameterManager } from '../../src/scrapers/ScraperParameterManager';
import { IConfigurationPersistence, UrlConfiguration } from '../../src/interfaces/IConfigurationPersistence';
import { ScraperConfiguration, BatchScraperConfiguration } from '../../src/interfaces/IScraperParameters';

// Mock Configuration Persistence
class MockConfigurationPersistence implements IConfigurationPersistence {
  private configs: Map<string, UrlConfiguration> = new Map();

  async saveUrlConfig(url: string, config: UrlConfiguration): Promise<boolean> {
    this.configs.set(url, config);
    return true;
  }

  async getUrlConfig(url: string): Promise<UrlConfiguration | null> {
    return this.configs.get(url) || null;
  }

  async removeUrlConfig(url: string): Promise<boolean> {
    return this.configs.delete(url);
  }

  async listConfiguredUrls(): Promise<string[]> {
    return Array.from(this.configs.keys());
  }

  async batchSaveConfigs(configs: Map<string, UrlConfiguration>): Promise<boolean> {
    for (const [url, config] of configs.entries()) {
      this.configs.set(url, config);
    }
    return true;
  }

  async clearAllConfigs(): Promise<boolean> {
    this.configs.clear();
    return true;
  }
}

describe('PersistentParameterManager', () => {
  let manager: PersistentParameterManager;
  let mockPersistence: MockConfigurationPersistence;
  let baseManager: ScraperParameterManager;

  beforeEach(() => {
    mockPersistence = new MockConfigurationPersistence();
    baseManager = new ScraperParameterManager();
    // Don't pass baseManager so it creates its own with validators
    manager = new PersistentParameterManager(mockPersistence, undefined, 1000); // 1 second cache
  });

  describe('SOLID Principles Compliance', () => {
    test('Should follow Open/Closed Principle (Decorator Pattern)', () => {
      // Extends functionality without modifying ScraperParameterManager
      expect(manager).toHaveProperty('setParameters');
      expect(manager).toHaveProperty('getParameters');
      expect(manager).toHaveProperty('validateParameters');

      // Original manager is unmodified
      expect(baseManager.setParameters).toBeDefined();
      expect(baseManager.getParameters).toBeDefined();
    });

    test('Should follow Liskov Substitution Principle', () => {
      // PersistentParameterManager can substitute IParameterManager
      expect(manager.validateParameters).toBeDefined();
      expect(manager.normalizeParameters).toBeDefined();
      expect(manager.getDefaultParameters).toBeDefined();
      expect(manager.getSupportedParameters).toBeDefined();
    });
  });

  describe('setParameters', () => {
    test('Should persist configuration when setting parameters', async () => {
      const config: ScraperConfiguration = {
        scraperType: 'playwright',
        parameters: { headless: true, timeout: 30000 }
      };

      await manager.setParameters('https://example.com', config);

      // Verify persisted
      const saved = await mockPersistence.getUrlConfig('https://example.com');
      expect(saved?.scraperConfig?.scraperType).toBe('playwright');
      expect(saved?.scraperConfig?.parameters).toEqual({ headless: true, timeout: 30000 });
    });

    test('Should update cache when setting parameters', async () => {
      const config: ScraperConfiguration = {
        scraperType: 'http',
        parameters: {}
      };

      await manager.setParameters('https://example.com', config);

      // Should retrieve from cache (not persistence) on immediate get
      const retrieved = manager.getParameters('https://example.com');
      expect(retrieved?.scraperType).toBe('http');
    });

    test('Should validate parameters before persisting', async () => {
      const invalidConfig: ScraperConfiguration = {
        scraperType: 'http' as any, // Using 'as any' to simulate invalid scraper type
        parameters: { invalidParam: true } as any
      };

      // Should throw validation error
      await expect(manager.setParameters('https://example.com', invalidConfig))
        .rejects.toThrow();
    });
  });

  describe('getParameters', () => {
    test('Should retrieve from cache first', async () => {
      const config: ScraperConfiguration = {
        scraperType: 'crawl4ai',
        parameters: { maxDepth: 2 }
      };

      await manager.setParameters('https://example.com', config);

      // Clear persistence to verify cache is used
      await mockPersistence.clearAllConfigs();

      // Should still retrieve from cache
      const retrieved = manager.getParameters('https://example.com');
      expect(retrieved?.scraperType).toBe('crawl4ai');
    });

    test('Should load from persistence when not in cache', async () => {
      // Save directly to persistence
      await mockPersistence.saveUrlConfig('https://example.com', {
        scraperConfig: {
          scraperType: 'docling',
          parameters: { ocr: false } as any
        },
        lastModified: new Date()
      });

      // Force preload to populate cache from persistence
      await manager.preloadConfigurations();

      // Retrieve through manager
      const retrieved = manager.getParameters('https://example.com');
      expect(retrieved?.scraperType).toBe('docling');
      expect(retrieved?.parameters).toEqual({ ocr: false });
    });

    test('Should return null for non-configured URL', async () => {
      const result = manager.getParameters('https://not-configured.com');
      expect(result).toBeNull();
    });

    test('Should expire cache after timeout', async () => {
      const config: ScraperConfiguration = {
        scraperType: 'http',
        parameters: {}
      };

      await manager.setParameters('https://example.com', config);

      // Wait for cache to expire (1 second + buffer)
      await new Promise(resolve => setTimeout(resolve, 1200));

      // Clear persistence
      await mockPersistence.clearAllConfigs();

      // Should return null as cache expired and persistence is empty
      const result = manager.getParameters('https://example.com');
      expect(result).toBeNull();
    });
  });

  describe('setBatchParameters', () => {
    test('Should persist batch configurations', async () => {
      const batch: BatchScraperConfiguration = {
        urls: ['https://example1.com', 'https://example2.com', 'https://example3.com'],
        configuration: {
          scraperType: 'playwright',
          parameters: { headless: true }
        }
      };

      await manager.setBatchParameters(batch);

      // Verify all persisted
      for (const url of batch.urls) {
        const config = await mockPersistence.getUrlConfig(url);
        expect(config?.scraperConfig?.scraperType).toBe('playwright');
      }
    });
  });

  describe('clearParameters', () => {
    test('Should clear from persistence and cache', async () => {
      const url = 'https://example.com';
      const config: ScraperConfiguration = {
        scraperType: 'http',
        parameters: {}
      };

      await manager.setParameters(url, config);
      await manager.clearParameters(url);

      // Should be cleared from both
      const fromManager = manager.getParameters(url);
      const fromPersistence = await mockPersistence.getUrlConfig(url);

      expect(fromManager).toBeNull();
      expect(fromPersistence).toBeNull();
    });
  });

  describe('clearAllParameters', () => {
    test('Should clear all configurations', async () => {
      // Set multiple configs
      await manager.setParameters('https://example1.com', {
        scraperType: 'http',
        parameters: {}
      });
      await manager.setParameters('https://example2.com', {
        scraperType: 'playwright',
        parameters: {}
      });

      await manager.clearAllParameters();

      // Verify all cleared
      const urls = await manager.getConfiguredUrls();
      expect(urls).toHaveLength(0);
    });
  });

  describe('getConfiguredUrls', () => {
    test('Should return all URLs with configurations', async () => {
      await manager.setParameters('https://example1.com', {
        scraperType: 'http',
        parameters: {}
      });
      await manager.setParameters('https://example2.com', {
        scraperType: 'playwright',
        parameters: {}
      });

      const urls = await manager.getConfiguredUrls();
      expect(urls).toHaveLength(2);
      expect(urls).toContain('https://example1.com');
      expect(urls).toContain('https://example2.com');
    });
  });

  describe('preloadConfigurations', () => {
    test('Should preload all configurations into memory', async () => {
      // Save configs directly to persistence
      await mockPersistence.saveUrlConfig('https://example1.com', {
        scraperConfig: { scraperType: 'http', parameters: {} }
      });
      await mockPersistence.saveUrlConfig('https://example2.com', {
        scraperConfig: { scraperType: 'playwright', parameters: { headless: true } }
      });

      // Create new manager and preload
      const newManager = new PersistentParameterManager(mockPersistence);
      await newManager.preloadConfigurations();

      // Clear persistence to verify loaded into memory
      await mockPersistence.clearAllConfigs();

      // Should still retrieve from memory
      const config1 = await newManager.getParameters('https://example1.com');
      const config2 = await newManager.getParameters('https://example2.com');

      expect(config1?.scraperType).toBe('http');
      expect(config2?.scraperType).toBe('playwright');
    });
  });

  describe('cleanupCache', () => {
    test('Should remove expired cache entries', async () => {
      // Set with short cache timeout
      const shortCacheManager = new PersistentParameterManager(mockPersistence, undefined, 100);

      await shortCacheManager.setParameters('https://example1.com', {
        scraperType: 'http',
        parameters: {}
      });

      // Wait for expiry
      await new Promise(resolve => setTimeout(resolve, 150));

      // Clean up
      shortCacheManager.cleanupCache();

      // Clear persistence
      await mockPersistence.clearAllConfigs();

      // Should return null as cache was cleaned and persistence is empty
      const result = shortCacheManager.getParameters('https://example1.com');
      expect(result).toBeNull();
    });
  });
});