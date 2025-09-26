/**
 * Integration tests for SQL storage and duplicate detection
 */

import { SqlKnowledgeStore } from '../../src/storage/SqlKnowledgeStore';
import { SqlUrlRepository } from '../../src/storage/SqlUrlRepository';
import { KnowledgeEntry, ProcessingStatus } from '../../src/interfaces/IKnowledgeStore';
import { UrlStatus } from '../../src/interfaces/IUrlRepository';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('SQL Storage Integration', () => {
  const testDbPath = './test-data/test-knowledge.db';
  const testUrlDbPath = './test-data/test-urls.db';
  let knowledgeStore: SqlKnowledgeStore;
  let urlRepository: SqlUrlRepository;

  beforeEach(async () => {
    // Clean up any existing test databases
    try {
      await fs.unlink(testDbPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }
    try {
      await fs.unlink(testUrlDbPath);
    } catch (e) {
      // Ignore if file doesn't exist
    }

    // Create new instances
    knowledgeStore = new SqlKnowledgeStore(testDbPath);
    urlRepository = new SqlUrlRepository(testUrlDbPath);
  });

  afterEach(async () => {
    // Close connections
    await knowledgeStore.close();
    await urlRepository.close();
  });

  afterAll(async () => {
    // Clean up test databases
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(testUrlDbPath);
      await fs.rmdir(path.dirname(testDbPath));
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('SqlKnowledgeStore', () => {
    test('should store and retrieve knowledge entries', async () => {
      const entry: KnowledgeEntry = {
        id: 'test-entry-1',
        url: 'https://example.com/doc1.pdf',
        title: 'Test Document',
        contentType: 'pdf',
        text: 'This is test content',
        metadata: { author: 'Test Author' },
        tags: ['test', 'pdf'],
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100,
        checksum: 'abc123',
        processingStatus: ProcessingStatus.COMPLETED
      };

      const storedId = await knowledgeStore.store(entry);
      expect(storedId).toBe('test-entry-1');

      const retrieved = await knowledgeStore.retrieve('test-entry-1');
      expect(retrieved).toBeTruthy();
      expect(retrieved?.url).toBe('https://example.com/doc1.pdf');
      expect(retrieved?.title).toBe('Test Document');
    });

    test('should handle duplicate URL with same checksum', async () => {
      const entry1: KnowledgeEntry = {
        id: 'test-entry-1',
        url: 'https://example.com/doc.pdf',
        title: 'Document V1',
        contentType: 'pdf',
        text: 'Content version 1',
        metadata: {},
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100,
        checksum: 'hash123',
        processingStatus: ProcessingStatus.COMPLETED
      };

      await knowledgeStore.store(entry1);

      // Try to store same URL with same checksum
      const entry2 = { ...entry1, id: 'test-entry-2', title: 'Document V2' };
      const storedId = await knowledgeStore.store(entry2);

      // Should update the existing entry
      expect(storedId).toBe('test-entry-1');

      const retrieved = await knowledgeStore.retrieve('test-entry-1');
      expect(retrieved?.title).toBe('Document V2');
    });

    test('should search entries by criteria', async () => {
      // Store multiple entries
      const entries: KnowledgeEntry[] = [
        {
          id: '1',
          url: 'https://example.com/doc1.pdf',
          title: 'Important Document',
          contentType: 'pdf',
          text: 'Important content about testing',
          metadata: {},
          tags: ['important', 'testing'],
          createdAt: new Date(),
          updatedAt: new Date(),
          size: 100,
          checksum: 'hash1',
          processingStatus: ProcessingStatus.COMPLETED
        },
        {
          id: '2',
          url: 'https://example.com/doc2.html',
          title: 'Web Page',
          contentType: 'html',
          text: 'Web page content',
          metadata: {},
          tags: ['web'],
          createdAt: new Date(),
          updatedAt: new Date(),
          size: 200,
          checksum: 'hash2',
          processingStatus: ProcessingStatus.COMPLETED
        }
      ];

      for (const entry of entries) {
        await knowledgeStore.store(entry);
      }

      // Search by query
      const results1 = await knowledgeStore.search({ query: 'testing' });
      expect(results1).toHaveLength(1);
      expect(results1[0].id).toBe('1');

      // Search by content type
      const results2 = await knowledgeStore.search({ contentType: 'html' });
      expect(results2).toHaveLength(1);
      expect(results2[0].id).toBe('2');

      // Search by tags
      const results3 = await knowledgeStore.search({ tags: ['important'] });
      expect(results3).toHaveLength(1);
      expect(results3[0].id).toBe('1');
    });

    test('should get store statistics', async () => {
      const entries: KnowledgeEntry[] = [
        {
          id: '1',
          url: 'https://example.com/1',
          title: 'Doc 1',
          contentType: 'pdf',
          text: 'Content 1',
          metadata: {},
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          size: 100,
          checksum: 'hash1',
          processingStatus: ProcessingStatus.COMPLETED
        },
        {
          id: '2',
          url: 'https://example.com/2',
          title: 'Doc 2',
          contentType: 'html',
          text: 'Content 2',
          metadata: {},
          tags: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          size: 200,
          checksum: 'hash2',
          processingStatus: ProcessingStatus.FAILED,
          errorMessage: 'Test error'
        }
      ];

      for (const entry of entries) {
        await knowledgeStore.store(entry);
      }

      const stats = await knowledgeStore.getStats();
      expect(stats.totalEntries).toBe(2);
      expect(stats.totalSize).toBe(300);
      expect(stats.contentTypes['pdf']).toBe(1);
      expect(stats.contentTypes['html']).toBe(1);
      expect(stats.processingStatus[ProcessingStatus.COMPLETED]).toBe(1);
      expect(stats.processingStatus[ProcessingStatus.FAILED]).toBe(1);
    });
  });

  describe('SqlUrlRepository', () => {
    test('should register and track URLs', async () => {
      const url = 'https://example.com/document.pdf';

      const exists1 = await urlRepository.exists(url);
      expect(exists1).toBe(false);

      const id = await urlRepository.register(url, {
        contentType: 'application/pdf'
      });
      expect(id).toBeTruthy();

      const exists2 = await urlRepository.exists(url);
      expect(exists2).toBe(true);

      const info = await urlRepository.getUrlInfo(url);
      expect(info).toBeTruthy();
      expect(info?.url).toBe(url);
      expect(info?.status).toBe(UrlStatus.PENDING);
      expect(info?.processCount).toBe(1);
    });

    test('should update URL status', async () => {
      const url = 'https://example.com/test.html';
      const id = await urlRepository.register(url);

      await urlRepository.updateStatus(id, UrlStatus.PROCESSING);
      let info = await urlRepository.getUrlInfo(url);
      expect(info?.status).toBe(UrlStatus.PROCESSING);

      await urlRepository.updateStatus(id, UrlStatus.COMPLETED);
      info = await urlRepository.getUrlInfo(url);
      expect(info?.status).toBe(UrlStatus.COMPLETED);

      await urlRepository.updateStatus(id, UrlStatus.FAILED, 'Network error');
      info = await urlRepository.getUrlInfo(url);
      expect(info?.status).toBe(UrlStatus.FAILED);
      expect(info?.errorMessage).toBe('Network error');
    });

    test('should track content hashes for duplicate detection', async () => {
      const url1 = 'https://example.com/doc1.pdf';
      const url2 = 'https://example.com/doc2.pdf';
      const contentHash = 'sha256:abcdef123456';

      const id1 = await urlRepository.register(url1);
      await urlRepository.updateHash(id1, contentHash);

      const existingByHash = await urlRepository.getByHash(contentHash);
      expect(existingByHash).toBeTruthy();
      expect(existingByHash?.url).toBe(url1);

      const hashExists = await urlRepository.hashExists(contentHash);
      expect(hashExists).toBe(true);

      // Register another URL with different hash
      const id2 = await urlRepository.register(url2);
      await urlRepository.updateHash(id2, 'sha256:different');

      const records = await urlRepository.list();
      expect(records).toHaveLength(2);
    });

    test('should normalize URLs for comparison', async () => {
      // These should be treated as the same URL
      const url1 = 'https://example.com/path?b=2&a=1#fragment';
      const url2 = 'https://EXAMPLE.COM/path?a=1&b=2';

      const id1 = await urlRepository.register(url1);
      const exists = await urlRepository.exists(url2);
      expect(exists).toBe(true);

      const info = await urlRepository.getUrlInfo(url2);
      expect(info?.id).toBe(id1);
    });

    test('should list URLs with filtering', async () => {
      // Register multiple URLs
      const urls = [
        { url: 'https://example.com/1', status: UrlStatus.COMPLETED },
        { url: 'https://example.com/2', status: UrlStatus.FAILED },
        { url: 'https://example.com/3', status: UrlStatus.COMPLETED }
      ];

      for (const { url, status } of urls) {
        const id = await urlRepository.register(url);
        await urlRepository.updateStatus(id, status);
      }

      // Filter by status
      const completed = await urlRepository.list({
        status: UrlStatus.COMPLETED
      });
      expect(completed).toHaveLength(2);

      const failed = await urlRepository.list({
        status: UrlStatus.FAILED
      });
      expect(failed).toHaveLength(1);

      // List all with limit
      const limited = await urlRepository.list({ limit: 2 });
      expect(limited).toHaveLength(2);
    });
  });

  describe('Duplicate Detection Integration', () => {
    test('should prevent processing duplicate URLs', async () => {
      const url = 'https://example.com/duplicate.pdf';

      // First registration
      const id1 = await urlRepository.register(url);
      await urlRepository.updateStatus(id1, UrlStatus.COMPLETED);

      // Try to register again - this should increment process count
      const id2 = await urlRepository.register(url);
      expect(id2).toBe(id1); // Should return same ID

      const exists = await urlRepository.exists(url);
      expect(exists).toBe(true);

      const info = await urlRepository.getUrlInfo(url);
      expect(info?.processCount).toBe(2); // Should increment process count
    });

    test('should detect duplicate content by hash', async () => {
      const url1 = 'https://site1.com/doc.pdf';
      const url2 = 'https://site2.com/same-doc.pdf';
      const contentHash = 'sha256:identical-content';

      // Process first URL
      const id1 = await urlRepository.register(url1);
      await urlRepository.updateHash(id1, contentHash);
      await urlRepository.updateStatus(id1, UrlStatus.COMPLETED);

      // Check if content already exists before processing second URL
      const duplicateContent = await urlRepository.getByHash(contentHash);
      expect(duplicateContent).toBeTruthy();
      expect(duplicateContent?.url).toBe(url1);

      // Register second URL but mark as skipped
      const id2 = await urlRepository.register(url2);
      await urlRepository.updateStatus(id2, UrlStatus.SKIPPED, 'Duplicate content');

      const info2 = await urlRepository.getUrlInfo(url2);
      expect(info2?.status).toBe(UrlStatus.SKIPPED);
      expect(info2?.errorMessage).toContain('Duplicate content');
    });
  });
});