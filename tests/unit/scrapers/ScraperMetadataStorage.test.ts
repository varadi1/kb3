/**
 * Tests for scraper metadata storage in database
 */

import { KnowledgeBaseOrchestrator } from '../../../src/orchestrator/KnowledgeBaseOrchestrator';
import { ScraperAwareContentFetcher } from '../../../src/fetchers/ScraperAwareContentFetcher';
import { HttpScraper } from '../../../src/scrapers/HttpScraper';
import { ScraperRegistry } from '../../../src/scrapers/ScraperRegistry';
import { ScraperSelector } from '../../../src/scrapers/ScraperSelector';
import { ContentType } from '../../../src/interfaces/IUrlDetector';

// Mock implementations
class MockUrlDetector {
  async detect(url: string) {
    return {
      url,
      type: ContentType.HTML,
      confidence: 1.0
    };
  }
  canDetect() { return true; }
  canHandle() { return true; }
}

class MockContentProcessor {
  canProcess() { return true; }
  async process(content: any) {
    return {
      text: typeof content === 'string' ? content : content.toString(),
      title: 'Test Title',
      metadata: {}
    };
  }
}

class MockKnowledgeStore {
  public storedEntries: any[] = [];

  async store(entry: any) {
    this.storedEntries.push(entry);
    return 'test-entry-id';
  }
  async get() { return null; }
  async search() { return []; }
  async update() { return true; }
  async delete() { return true; }
  async exists() { return false; }
  async list() { return []; }
}

class MockFileStorage {
  public storedFiles: any[] = [];

  async store(content: Buffer, filename: string, options: any) {
    this.storedFiles.push({
      content,
      filename,
      metadata: options?.metadata
    });
    return `/test/storage/${filename}`;
  }
  async get() { return Buffer.from('test'); }
  async exists() { return false; }
  async delete() { return true; }
  async list() { return []; }
}

class MockUrlRepository {
  public registeredUrls: any[] = [];
  public statusUpdates: any[] = [];

  async exists() { return false; }

  async register(url: string, metadata?: any) {
    this.registeredUrls.push({ url, metadata });
    return 'test-url-id';
  }

  async updateStatus(id: string, status: any, error?: string) {
    this.statusUpdates.push({ id, status, error });
    return true;
  }

  async getUrlInfo() { return null; }
  async getByHash() { return null; }
  async list() { return []; }
  async updateHash() { return true; }
}

class MockHttpFetcher {
  async fetch(url: string) {
    return {
      url,
      content: Buffer.from('test content'),
      mimeType: 'text/html',
      size: 12,
      headers: { 'content-type': 'text/html' },
      metadata: {
        statusCode: 200,
        headers: { 'content-type': 'text/html' }
      }
    };
  }
  canFetch() { return true; }
}

describe('Scraper Metadata Storage', () => {
  let orchestrator: KnowledgeBaseOrchestrator;
  let mockKnowledgeStore: MockKnowledgeStore;
  let mockFileStorage: MockFileStorage;
  let mockUrlRepository: MockUrlRepository;
  let scraperRegistry: ScraperRegistry;
  let scraperSelector: ScraperSelector;

  beforeEach(() => {
    // Reset registry
    ScraperRegistry.reset();
    scraperRegistry = ScraperRegistry.getInstance();
    scraperSelector = new ScraperSelector(scraperRegistry);

    // Create mocks
    mockKnowledgeStore = new MockKnowledgeStore();
    mockFileStorage = new MockFileStorage();
    mockUrlRepository = new MockUrlRepository();

    // Register scrapers
    const httpScraper = new HttpScraper(new MockHttpFetcher() as any);
    scraperRegistry.register('http', httpScraper);
    scraperRegistry.setDefault('http');

    // Create scraper-aware fetcher
    const mockHttpFetcher = new MockHttpFetcher();
    const scraperAwareFetcher = new ScraperAwareContentFetcher(
      mockHttpFetcher as any,
      scraperSelector,
      scraperRegistry
    );

    // Create orchestrator with scraper-aware fetcher
    orchestrator = new KnowledgeBaseOrchestrator(
      new MockUrlDetector() as any,
      scraperAwareFetcher as any,
      new MockContentProcessor() as any,
      mockKnowledgeStore as any,
      mockFileStorage as any,
      mockUrlRepository as any
    );
  });

  describe('URL Repository Metadata', () => {
    it('should store scraper name in URL repository metadata', async () => {
      const url = 'https://example.com/test';

      await orchestrator.processUrl(url);

      // Check URL repository received scraper metadata
      expect(mockUrlRepository.registeredUrls).toHaveLength(1);
      const registeredUrl = mockUrlRepository.registeredUrls[0];

      expect(registeredUrl.metadata).toBeDefined();
      expect(registeredUrl.metadata.scraperUsed).toBe('http');
    });

    it('should include fetch metadata along with scraper info', async () => {
      const url = 'https://example.com/test';

      await orchestrator.processUrl(url);

      const registeredUrl = mockUrlRepository.registeredUrls[0];

      expect(registeredUrl.metadata.fetchMetadata).toBeDefined();
      expect(registeredUrl.metadata.fetchMetadata.statusCode).toBe(200);
      expect(registeredUrl.metadata.fetchMetadata.headers).toBeDefined();
    });
  });

  describe('Knowledge Entry Metadata', () => {
    it('should store scraper name in knowledge entry metadata', async () => {
      const url = 'https://example.com/test';

      await orchestrator.processUrl(url);

      // Check knowledge store received scraper metadata
      expect(mockKnowledgeStore.storedEntries).toHaveLength(1);
      const knowledgeEntry = mockKnowledgeStore.storedEntries[0];

      expect(knowledgeEntry.metadata).toBeDefined();
      expect(knowledgeEntry.metadata.scraperUsed).toBe('http');
    });

    it('should preserve existing metadata while adding scraper info', async () => {
      const url = 'https://example.com/test';

      await orchestrator.processUrl(url, { extractMetadata: true });

      const knowledgeEntry = mockKnowledgeStore.storedEntries[0];

      // Check both scraper info and other metadata exist
      expect(knowledgeEntry.metadata.scraperUsed).toBe('http');
      expect(knowledgeEntry.metadata.processingOptions).toBeDefined();
      expect(knowledgeEntry.metadata.classification).toBeDefined();
    });
  });

  describe('File Storage Metadata', () => {
    it('should store scraper name in file storage metadata', async () => {
      const url = 'https://example.com/test';

      await orchestrator.processUrl(url);

      // Check file storage received scraper metadata
      expect(mockFileStorage.storedFiles).toHaveLength(1);
      const storedFile = mockFileStorage.storedFiles[0];

      expect(storedFile.metadata).toBeDefined();
      expect(storedFile.metadata.scraperUsed).toBe('http');
    });

    it('should include all relevant metadata in file storage', async () => {
      const url = 'https://example.com/test';

      await orchestrator.processUrl(url);

      const storedFile = mockFileStorage.storedFiles[0];

      expect(storedFile.metadata.url).toBe(url);
      expect(storedFile.metadata.mimeType).toBe('text/html');
      expect(storedFile.metadata.scraperUsed).toBe('http');
      expect(storedFile.metadata.headers).toBeDefined();
    });
  });

  describe('Processing Result Metadata', () => {
    it('should include scraper name in processing result', async () => {
      const url = 'https://example.com/test';

      const result = await orchestrator.processUrl(url);

      expect(result.success).toBe(true);
      expect(result.metadata).toBeDefined();
      expect(result.metadata.scraperUsed).toBe('http');
    });
  });

  describe('Multiple Scrapers', () => {
    beforeEach(() => {
      // Add a rule for specific URL pattern
      scraperSelector.addRule({
        pattern: 'special.com',
        scraperName: 'http',
        priority: 10
      });
    });

    it('should store the correct scraper name based on URL', async () => {
      const url = 'https://special.com/test';

      await orchestrator.processUrl(url);

      // Verify scraper name is stored correctly in all locations
      expect(mockUrlRepository.registeredUrls[0].metadata.scraperUsed).toBe('http');
      expect(mockKnowledgeStore.storedEntries[0].metadata.scraperUsed).toBe('http');
      expect(mockFileStorage.storedFiles[0].metadata.scraperUsed).toBe('http');
    });
  });
});