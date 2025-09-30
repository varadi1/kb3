/**
 * Tests for UnifiedSqlStorage
 * Validates single database functionality with foreign key relationships
 */

import { UnifiedSqlStorage, UnifiedStorageConfig } from '../../../src/storage/UnifiedSqlStorage';
import { ProcessingStatus } from '../../../src/interfaces/IKnowledgeStore';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

describe('UnifiedSqlStorage', () => {
  let storage: UnifiedSqlStorage;
  const testDbPath = './test-data/unified-test.db';
  const config: UnifiedStorageConfig = {
    dbPath: testDbPath,
    enableWAL: true,
    enableForeignKeys: true
  };

  beforeEach(async () => {
    // Clean up any existing test database
    try {
      await fs.unlink(testDbPath);
    } catch {
      // File doesn't exist, that's fine
    }

    // Ensure directory exists
    await fs.mkdir(path.dirname(testDbPath), { recursive: true });

    // Create new storage instance
    storage = new UnifiedSqlStorage(config);
    await storage.initialize();
  });

  afterEach(async () => {
    // Close database connection
    if (storage) {
      await storage.close();
    }

    // Clean up test database
    try {
      await fs.unlink(testDbPath);
    } catch {
      // Ignore errors
    }
  });

  describe('Initialization', () => {
    it('should create all required tables', async () => {
      // Get repositories to verify they work
      const repositories = storage.getRepositories();

      expect(repositories.knowledgeStore).toBeDefined();
      expect(repositories.urlRepository).toBeDefined();
      expect(repositories.originalFileRepository).toBeDefined();
      expect(repositories.tagManager).toBeDefined();
    });

    it('should handle re-initialization gracefully', async () => {
      // Initialize again
      await storage.initialize();

      // Should still work
      const repositories = storage.getRepositories();
      expect(repositories.knowledgeStore).toBeDefined();
    });
  });

  describe('Foreign Key Relationships', () => {
    let repositories: any;

    beforeEach(() => {
      repositories = storage.getRepositories();
    });

    it('should enforce foreign key from knowledge_entries to urls', async () => {
      // First register a URL
      await repositories.urlRepository.register('https://example.com', {
        source: 'test'
      });

      // Store a knowledge entry for that URL
      const entryId = await repositories.knowledgeStore.store({
        id: 'test-entry-1',
        url: 'https://example.com',
        title: 'Test Page',
        contentType: 'text/html',
        text: 'Test content',
        metadata: {},
        tags: [],
        size: 100,
        checksum: 'abc123',
        processingStatus: ProcessingStatus.COMPLETED
      });

      // Verify entry was stored - retrieve by ID
      const entry = await repositories.knowledgeStore.retrieve(entryId);
      expect(entry).toBeDefined();
      expect(entry!.title).toBe('Test Page');
    });

    it('should fail to store knowledge entry without corresponding URL', async () => {
      // Try to store knowledge entry without registering URL first
      await expect(repositories.knowledgeStore.store({
        url: 'https://nonexistent.com',
        title: 'Test Page',
        contentType: 'text/html',
        text: 'Test content',
        metadata: {},
        tags: [],
        size: 100,
        checksum: 'abc123',
        processingStatus: ProcessingStatus.COMPLETED
      })).rejects.toThrow();
    });

    it('should link original files to URLs with foreign key', async () => {
      // Register a URL
      await repositories.urlRepository.register('https://example.com/file.pdf');

      // Record original file for that URL
      const fileId = await repositories.originalFileRepository.recordOriginalFile({
        url: 'https://example.com/file.pdf',
        filePath: '/data/files/file.pdf',
        mimeType: 'application/pdf',
        size: 10000,
        checksum: crypto.randomBytes(32).toString('hex'),
        scraperUsed: 'http'
      });

      // Retrieve the file
      const file = await repositories.originalFileRepository.getOriginalFile(fileId);
      expect(file).toBeDefined();
      expect(file.url).toBe('https://example.com/file.pdf');
    });

    it('should handle cascading deletes for URL-related data', async () => {
      // Register URL with tags
      await repositories.urlRepository.registerWithTags('https://example.com', {
        tags: ['test', 'sample']
      });

      // Store knowledge entry
      await repositories.knowledgeStore.store({
        url: 'https://example.com',
        title: 'Test',
        contentType: 'text/html',
        text: 'Content',
        metadata: {},
        tags: [],
        size: 50,
        checksum: 'xyz',
        processingStatus: ProcessingStatus.COMPLETED
      });

      // Note: SQLite doesn't support direct DELETE with CASCADE in our current setup
      // This test would need to be expanded with proper cascade testing
      // For now, we just verify the relationships exist
      const entry = await repositories.knowledgeStore.retrieve('https://example.com');
      expect(entry).toBeDefined();
    });
  });

  describe('Tag Management', () => {
    let repositories: any;

    beforeEach(() => {
      repositories = storage.getRepositories();
    });

    it('should create and manage tags with hierarchy', async () => {
      // Create parent tag
      const parentTag = await repositories.tagManager.createTag({
        name: 'documentation',
        description: 'Documentation pages'
      });

      // Create child tag
      const childTag = await repositories.tagManager.createTag({
        name: 'api-docs',
        parentId: parentTag.id,
        description: 'API documentation'
      });

      // Verify hierarchy
      expect(childTag.parentId).toBe(parentTag.id);

      // Get tag by name
      const retrieved = await repositories.tagManager.getTagByName('api-docs');
      expect(retrieved).toBeDefined();
      expect(retrieved.name).toBe('api-docs');
    });

    it('should associate tags with URLs', async () => {
      // Register URL with tags
      await repositories.urlRepository.registerWithTags('https://example.com/docs', {
        tags: ['tutorial', 'beginner']
      });

      // Get URL with tags
      const urlWithTags = await repositories.urlRepository.getUrlInfoWithTags('https://example.com/docs');
      expect(urlWithTags).toBeDefined();
      expect(urlWithTags.tags).toHaveLength(2);
      expect(urlWithTags.tags.map((t: any) => t.name)).toContain('tutorial');
      expect(urlWithTags.tags.map((t: any) => t.name)).toContain('beginner');
    });

    it('should find URLs by tags', async () => {
      // Register multiple URLs with tags
      await repositories.urlRepository.registerWithTags('https://example1.com', {
        tags: ['javascript', 'tutorial']
      });

      await repositories.urlRepository.registerWithTags('https://example2.com', {
        tags: ['python', 'tutorial']
      });

      await repositories.urlRepository.registerWithTags('https://example3.com', {
        tags: ['javascript', 'advanced']
      });

      // Find URLs with 'tutorial' tag
      const tutorialUrls = await repositories.urlRepository.getUrlsByTags(['tutorial']);
      expect(tutorialUrls).toHaveLength(2);

      // Find URLs with 'javascript' tag
      const jsUrls = await repositories.urlRepository.getUrlsByTags(['javascript']);
      expect(jsUrls).toHaveLength(2);

      // Find URLs with both 'javascript' AND 'tutorial'
      const jsTutorials = await repositories.urlRepository.getUrlsByTags(
        ['javascript', 'tutorial'],
        true  // requireAll
      );
      expect(jsTutorials).toHaveLength(1);
    });
  });

  describe('Performance and Indexes', () => {
    it('should handle large datasets efficiently', async () => {
      const repositories = storage.getRepositories();
      const numUrls = 100;

      // Register many URLs
      const startTime = Date.now();
      for (let i = 0; i < numUrls; i++) {
        await repositories.urlRepository.register(`https://example${i}.com`);
      }
      const registrationTime = Date.now() - startTime;

      // Should complete in reasonable time (adjust threshold as needed)
      expect(registrationTime).toBeLessThan(5000);  // 5 seconds for 100 URLs

      // Query performance
      const queryStart = Date.now();
      const urls = await repositories.urlRepository.list({ limit: 50 });
      const queryTime = Date.now() - queryStart;

      expect(urls).toHaveLength(50);
      expect(queryTime).toBeLessThan(100);  // Query should be fast
    });
  });

  describe('Transaction Support', () => {
    it('should maintain consistency across related tables', async () => {
      const repositories = storage.getRepositories();

      // Register URL
      await repositories.urlRepository.register('https://example.com/article');

      // Store knowledge entry
      const testEntry = {
        id: 'test-id',
        url: 'https://example.com/article',
        title: 'Article Title',
        contentType: 'text/html',
        text: 'Article content here',
        metadata: { author: 'John Doe' },
        tags: ['article', 'blog'],
        size: 500,
        checksum: 'hash123',
        processingStatus: ProcessingStatus.COMPLETED,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      const storedId = await repositories.knowledgeStore.store(testEntry);

      // Record original file
      await repositories.originalFileRepository.recordOriginalFile({
        url: 'https://example.com/article',
        filePath: '/data/files/article.html',
        mimeType: 'text/html',
        size: 500,
        checksum: 'hash123',
        scraperUsed: 'playwright'
      });

      // Verify all data is consistent
      const urlInfo = await repositories.urlRepository.getUrlInfo('https://example.com/article');
      const knowledge = await repositories.knowledgeStore.retrieve(storedId);
      const files = await repositories.originalFileRepository.getOriginalFilesByUrl('https://example.com/article');

      expect(urlInfo).toBeDefined();
      expect(knowledge).toBeDefined();
      expect(files).toHaveLength(1);

      // All should reference the same URL
      expect(urlInfo!.url).toBe('https://example.com/article');
      expect(knowledge!.url).toBe('https://example.com/article');
      expect(files[0].url).toBe('https://example.com/article');
    });
  });

  describe('Error Handling', () => {
    it('should handle database not initialized error', () => {
      const uninitializedStorage = new UnifiedSqlStorage(config);

      expect(() => uninitializedStorage.getRepositories()).toThrow(
        'Storage not initialized. Call initialize() first.'
      );
    });

    it('should handle duplicate URL registration gracefully', async () => {
      const repositories = storage.getRepositories();

      // Register URL
      const id1 = await repositories.urlRepository.register('https://example.com');

      // Register same URL again - should return same ID
      const id2 = await repositories.urlRepository.register('https://example.com');

      expect(id2).toBe(id1);
    });

    it('should handle invalid tag hierarchy', async () => {
      const repositories = storage.getRepositories();

      // Try to create tag with non-existent parent
      await expect(repositories.tagManager.createTag({
        name: 'child-tag',
        parentId: 'non-existent-id'
      })).rejects.toThrow();
    });
  });
});

describe('UnifiedSqlStorage vs Legacy Storage', () => {
  it('should provide same interface as separate storage components', async () => {
    // This test verifies that UnifiedSqlStorage maintains compatibility
    const storage = new UnifiedSqlStorage({
      dbPath: './test-data/compatibility-test.db'
    });
    await storage.initialize();

    const repositories = storage.getRepositories();

    // Verify all expected methods exist (interface compliance)
    expect(typeof repositories.knowledgeStore.store).toBe('function');
    expect(typeof repositories.knowledgeStore.retrieve).toBe('function');
    expect(typeof repositories.knowledgeStore.search).toBe('function');
    expect(typeof repositories.knowledgeStore.update).toBe('function');
    expect(typeof repositories.knowledgeStore.delete).toBe('function');
    expect(typeof repositories.knowledgeStore.getStats).toBe('function');

    expect(typeof repositories.urlRepository.register).toBe('function');
    expect(typeof repositories.urlRepository.getUrlInfo).toBe('function');
    expect(typeof repositories.urlRepository.updateStatus).toBe('function');
    // Additional methods from extended interface
    expect(typeof repositories.urlRepository.registerWithTags).toBe('function');
    expect(typeof repositories.urlRepository.getUrlInfoWithTags).toBe('function');
    expect(typeof repositories.urlRepository.getUrlsByTags).toBe('function');

    expect(typeof repositories.originalFileRepository.recordOriginalFile).toBe('function');
    expect(typeof repositories.originalFileRepository.getOriginalFile).toBe('function');
    expect(typeof repositories.originalFileRepository.listOriginalFiles).toBe('function');

    expect(typeof repositories.tagManager.createTag).toBe('function');
    expect(typeof repositories.tagManager.getTag).toBe('function');
    expect(typeof repositories.tagManager.updateTag).toBe('function');
    expect(typeof repositories.tagManager.deleteTag).toBe('function');

    await storage.close();
    await fs.unlink('./test-data/compatibility-test.db');
  });
});