/**
 * Unit tests for SqlConfigurationPersistence
 * Tests SOLID compliance and persistence functionality
 */

import { SqlConfigurationPersistence } from '../../src/storage/SqlConfigurationPersistence';
import { IUrlRepository, UrlRecord, UrlStatus, UrlMetadata } from '../../src/interfaces/IUrlRepository';
import { UrlConfiguration } from '../../src/interfaces/IConfigurationPersistence';

// Mock URL Repository for testing
class MockUrlRepository implements IUrlRepository {
  private urls: Map<string, UrlRecord> = new Map();
  private idCounter = 1;

  async exists(url: string): Promise<boolean> {
    for (const record of this.urls.values()) {
      if (record.url === url) return true;
    }
    return false;
  }

  async register(url: string, metadata?: UrlMetadata): Promise<string> {
    // Check if URL already exists
    for (const [id, record] of this.urls.entries()) {
      if (record.url === url) {
        // Update existing record's metadata
        record.metadata = { ...record.metadata, ...metadata };
        return id;
      }
    }

    // Create new record
    const id = `url-${this.idCounter++}`;
    const record: UrlRecord = {
      id,
      url,
      normalizedUrl: url.toLowerCase(),
      status: UrlStatus.PENDING,
      firstSeen: new Date(),
      lastChecked: new Date(),
      processCount: 0,
      metadata
    };
    this.urls.set(id, record);
    return id;
  }

  async updateStatus(id: string, status: UrlStatus, error?: string): Promise<boolean> {
    const record = this.urls.get(id);
    if (record) {
      record.status = status;
      if (error) record.errorMessage = error;
      return true;
    }
    return false;
  }

  async getUrlInfo(url: string): Promise<UrlRecord | null> {
    for (const record of this.urls.values()) {
      if (record.url === url) return record;
    }
    return null;
  }

  async getByHash(hash: string): Promise<UrlRecord | null> {
    for (const record of this.urls.values()) {
      if (record.contentHash === hash) return record;
    }
    return null;
  }

  async list(_filter?: any): Promise<UrlRecord[]> {
    return Array.from(this.urls.values());
  }

  async remove(id: string): Promise<boolean> {
    return this.urls.delete(id);
  }

  async updateHash(id: string, contentHash: string): Promise<boolean> {
    const record = this.urls.get(id);
    if (record) {
      record.contentHash = contentHash;
      return true;
    }
    return false;
  }
}

describe('SqlConfigurationPersistence', () => {
  let persistence: SqlConfigurationPersistence;
  let mockRepository: MockUrlRepository;

  beforeEach(() => {
    mockRepository = new MockUrlRepository();
    persistence = new SqlConfigurationPersistence(mockRepository);
  });

  describe('SOLID Principles Compliance', () => {
    test('Should follow Single Responsibility Principle', () => {
      // SqlConfigurationPersistence only handles configuration persistence
      expect(persistence).toHaveProperty('saveUrlConfig');
      expect(persistence).toHaveProperty('getUrlConfig');
      expect(persistence).toHaveProperty('removeUrlConfig');
      // Does not have unrelated methods
      expect(persistence).not.toHaveProperty('fetchUrl');
      expect(persistence).not.toHaveProperty('processContent');
    });

    test('Should follow Dependency Inversion Principle', () => {
      // Depends on IUrlRepository interface, not concrete implementation
      expect(() => new SqlConfigurationPersistence(null as any)).toThrow();
      expect(() => new SqlConfigurationPersistence(mockRepository)).not.toThrow();
    });
  });

  describe('saveUrlConfig', () => {
    test('Should save configuration for new URL', async () => {
      const config: UrlConfiguration = {
        scraperConfig: {
          scraperType: 'playwright',
          parameters: { headless: true }
        },
        priority: 10
      };

      const result = await persistence.saveUrlConfig('https://example.com', config);
      expect(result).toBe(true);

      // Verify saved in repository
      const urlInfo = await mockRepository.getUrlInfo('https://example.com');
      expect(urlInfo).toBeTruthy();
      expect(urlInfo?.metadata).toHaveProperty('urlConfig');
    });

    test('Should update configuration for existing URL', async () => {
      const url = 'https://example.com';

      // Save initial config
      const config1: UrlConfiguration = {
        scraperConfig: {
          scraperType: 'http',
          parameters: {}
        }
      };
      await persistence.saveUrlConfig(url, config1);

      // Update config
      const config2: UrlConfiguration = {
        scraperConfig: {
          scraperType: 'playwright',
          parameters: { headless: true }
        },
        priority: 20
      };
      const result = await persistence.saveUrlConfig(url, config2);
      expect(result).toBe(true);

      // Verify updated
      const retrieved = await persistence.getUrlConfig(url);
      expect(retrieved?.scraperConfig?.scraperType).toBe('playwright');
      expect(retrieved?.priority).toBe(20);
    });

    test('Should preserve existing metadata when saving config', async () => {
      const url = 'https://example.com';

      // Register URL with existing metadata
      await mockRepository.register(url, {
        contentType: 'text/html',
        customField: 'value'
      });

      // Save config
      const config: UrlConfiguration = {
        scraperConfig: {
          scraperType: 'http',
          parameters: {}
        }
      };
      await persistence.saveUrlConfig(url, config);

      // Verify existing metadata preserved
      const urlInfo = await mockRepository.getUrlInfo(url);
      expect(urlInfo?.metadata?.contentType).toBe('text/html');
      expect(urlInfo?.metadata?.customField).toBe('value');
      expect(urlInfo?.metadata?.urlConfig).toBeTruthy();
    });
  });

  describe('getUrlConfig', () => {
    test('Should retrieve saved configuration', async () => {
      const url = 'https://example.com';
      const config: UrlConfiguration = {
        scraperConfig: {
          scraperType: 'crawl4ai',
          parameters: { maxDepth: 2 }
        },
        cleanerConfigs: [
          { type: 'sanitizehtml', enabled: true },
          { type: 'readability', enabled: true }
        ]
      };

      await persistence.saveUrlConfig(url, config);
      const retrieved = await persistence.getUrlConfig(url);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.scraperConfig?.scraperType).toBe('crawl4ai');
      expect(retrieved?.scraperConfig?.parameters).toEqual({ maxDepth: 2 });
      expect(retrieved?.cleanerConfigs).toHaveLength(2);
    });

    test('Should return null for non-existent URL', async () => {
      const result = await persistence.getUrlConfig('https://nonexistent.com');
      expect(result).toBeNull();
    });

    test('Should return null for URL without config', async () => {
      await mockRepository.register('https://example.com', {});
      const result = await persistence.getUrlConfig('https://example.com');
      expect(result).toBeNull();
    });
  });

  describe('removeUrlConfig', () => {
    test('Should remove configuration', async () => {
      const url = 'https://example.com';
      const config: UrlConfiguration = {
        scraperConfig: {
          scraperType: 'http',
          parameters: {}
        }
      };

      await persistence.saveUrlConfig(url, config);
      const removed = await persistence.removeUrlConfig(url);
      expect(removed).toBe(true);

      const retrieved = await persistence.getUrlConfig(url);
      expect(retrieved).toBeNull();
    });

    test('Should preserve other metadata when removing config', async () => {
      const url = 'https://example.com';

      // Register with metadata
      await mockRepository.register(url, {
        contentType: 'text/html',
        customField: 'value'
      });

      // Save and then remove config
      await persistence.saveUrlConfig(url, {
        scraperConfig: { scraperType: 'http', parameters: {} }
      });
      await persistence.removeUrlConfig(url);

      // Verify other metadata preserved
      const urlInfo = await mockRepository.getUrlInfo(url);
      expect(urlInfo?.metadata?.contentType).toBe('text/html');
      expect(urlInfo?.metadata?.customField).toBe('value');
      expect(urlInfo?.metadata?.urlConfig).toBeUndefined();
    });
  });

  describe('listConfiguredUrls', () => {
    test('Should list all URLs with configurations', async () => {
      // Save configs for multiple URLs
      await persistence.saveUrlConfig('https://example1.com', {
        scraperConfig: { scraperType: 'http', parameters: {} }
      });
      await persistence.saveUrlConfig('https://example2.com', {
        scraperConfig: { scraperType: 'playwright', parameters: {} }
      });

      // Register URL without config
      await mockRepository.register('https://example3.com', {});

      const configured = await persistence.listConfiguredUrls();
      expect(configured).toHaveLength(2);
      expect(configured).toContain('https://example1.com');
      expect(configured).toContain('https://example2.com');
      expect(configured).not.toContain('https://example3.com');
    });
  });

  describe('batchSaveConfigs', () => {
    test('Should save multiple configurations', async () => {
      const configs = new Map<string, UrlConfiguration>([
        ['https://example1.com', {
          scraperConfig: { scraperType: 'http', parameters: {} }
        }],
        ['https://example2.com', {
          scraperConfig: { scraperType: 'playwright', parameters: { headless: true } }
        }],
        ['https://example3.com', {
          scraperConfig: { scraperType: 'crawl4ai', parameters: {} }
        }]
      ]);

      const result = await persistence.batchSaveConfigs(configs);
      expect(result).toBe(true);

      // Verify all saved
      for (const [url, config] of configs.entries()) {
        const retrieved = await persistence.getUrlConfig(url);
        expect(retrieved?.scraperConfig?.scraperType).toBe(config.scraperConfig?.scraperType);
      }
    });
  });

  describe('clearAllConfigs', () => {
    test('Should clear all configurations', async () => {
      // Save multiple configs
      await persistence.saveUrlConfig('https://example1.com', {
        scraperConfig: { scraperType: 'http', parameters: {} }
      });
      await persistence.saveUrlConfig('https://example2.com', {
        scraperConfig: { scraperType: 'playwright', parameters: {} }
      });

      const cleared = await persistence.clearAllConfigs();
      expect(cleared).toBe(true);

      // Verify all cleared
      const config1 = await persistence.getUrlConfig('https://example1.com');
      const config2 = await persistence.getUrlConfig('https://example2.com');
      expect(config1).toBeNull();
      expect(config2).toBeNull();
    });
  });
});