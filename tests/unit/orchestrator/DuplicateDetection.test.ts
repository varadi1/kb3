/**
 * Unit tests for duplicate detection functionality in KnowledgeBaseOrchestrator
 */

import { KnowledgeBaseOrchestrator } from '../../../src/orchestrator/KnowledgeBaseOrchestrator';
import { SqlUrlRepository } from '../../../src/storage/SqlUrlRepository';
import { UrlStatus } from '../../../src/interfaces/IUrlRepository';
import { ErrorCode } from '../../../src/interfaces/IOrchestrator';
import { ContentType } from '../../../src/interfaces/IUrlDetector';

// Mock dependencies
const mockUrlDetector = {
  canHandle: jest.fn().mockReturnValue(true),
  detect: jest.fn().mockResolvedValue({
    type: ContentType.PDF,
    confidence: 0.9,
    category: 'document'
  })
};

const mockContentFetcher = {
  canFetch: jest.fn().mockReturnValue(true),
  fetch: jest.fn().mockResolvedValue({
    content: Buffer.from('test content'),
    mimeType: 'application/pdf',
    size: 1000,
    headers: {}
  })
};

const mockContentProcessor = {
  canProcess: jest.fn().mockReturnValue(true),
  getSupportedTypes: jest.fn().mockReturnValue([ContentType.PDF]),
  process: jest.fn().mockResolvedValue({
    text: 'processed text',
    title: 'Test Document',
    metadata: {}
  })
};

const mockKnowledgeStore = {
  store: jest.fn().mockResolvedValue('entry-123'),
  retrieve: jest.fn(),
  search: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  getStats: jest.fn()
};

const mockFileStorage = {
  store: jest.fn().mockResolvedValue('/data/files/test.pdf'),
  retrieve: jest.fn(),
  exists: jest.fn(),
  delete: jest.fn(),
  list: jest.fn(),
  getMetadata: jest.fn()
};

describe('Orchestrator Duplicate Detection', () => {
  let orchestrator: KnowledgeBaseOrchestrator;
  let urlRepository: SqlUrlRepository;
  let mockContentChangeDetector: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a mock URL repository
    urlRepository = {
      exists: jest.fn().mockResolvedValue(false),
      register: jest.fn().mockResolvedValue('url-123'),
      updateStatus: jest.fn().mockResolvedValue(true),
      getUrlInfo: jest.fn().mockResolvedValue(null),
      getByHash: jest.fn().mockResolvedValue(null),
      list: jest.fn().mockResolvedValue([]),
      remove: jest.fn().mockResolvedValue(true),
      updateHash: jest.fn().mockResolvedValue(true)
    } as any;

    // Create mock content change detector
    mockContentChangeDetector = {
      hasContentChanged: jest.fn().mockResolvedValue({
        hasChanged: true,
        currentHash: 'hash123'
      }),
      recordContentProcessed: jest.fn().mockResolvedValue(undefined),
      getLastKnownHash: jest.fn().mockResolvedValue(null),
      clearHistory: jest.fn().mockResolvedValue(undefined)
    };

    orchestrator = new KnowledgeBaseOrchestrator(
      mockUrlDetector as any,
      mockContentFetcher as any,
      mockContentProcessor as any,
      mockKnowledgeStore as any,
      mockFileStorage as any,
      urlRepository,
      mockContentChangeDetector
    );
  });

  describe('Content Change Detection', () => {
    test('should skip reprocessing when content has not changed', async () => {
      const url = 'https://example.com/document.pdf';
      const previousHash = 'hash123';
      const currentHash = 'hash123'; // Same hash

      // Mock content hasn't changed
      mockContentChangeDetector.hasContentChanged.mockResolvedValue({
        hasChanged: false,
        currentHash,
        previousHash,
        lastChecked: new Date()
      });

      const result = await orchestrator.processUrl(url);

      expect(result.success).toBe(true);
      expect(result.metadata?.skipped).toBe(true);
      expect(result.metadata?.reason).toBe('Content unchanged');
      expect(mockContentChangeDetector.hasContentChanged).toHaveBeenCalledWith(
        url,
        expect.any(String),
        expect.any(Object)
      );

      // Should fetch content to check hash but not process
      expect(mockContentFetcher.fetch).toHaveBeenCalled();
      expect(mockContentProcessor.process).not.toHaveBeenCalled();
    });

    test('should process new URLs normally', async () => {
      const url = 'https://example.com/new-document.pdf';

      // Mock that content is new (changed/first time)
      mockContentChangeDetector.hasContentChanged.mockResolvedValue({
        hasChanged: true,
        currentHash: 'newhash'
      });

      // Mock that URL doesn't exist
      (urlRepository.exists as jest.Mock).mockResolvedValue(false);

      const result = await orchestrator.processUrl(url);

      expect(result.success).toBe(true);
      expect(result.entryId).toBe('entry-123');
      expect(urlRepository.register).toHaveBeenCalledWith(url, expect.any(Object));
      expect(urlRepository.updateStatus).toHaveBeenCalledWith('url-123', UrlStatus.PROCESSING);
      expect(urlRepository.updateStatus).toHaveBeenCalledWith('url-123', UrlStatus.COMPLETED);
    });

    test('should allow force reprocessing when content unchanged', async () => {
      const url = 'https://example.com/document.pdf';

      // Even with forceReprocess, content change detector shouldn't be consulted
      // or it should be bypassed
      (urlRepository.exists as jest.Mock).mockResolvedValue(true);
      (urlRepository.getUrlInfo as jest.Mock).mockResolvedValue({
        id: 'url-123',
        url,
        status: UrlStatus.COMPLETED,
        firstSeen: new Date(),
        lastChecked: new Date(),
        processCount: 1
      });

      const result = await orchestrator.processUrl(url, { forceReprocess: true });

      expect(result.success).toBe(true);
      expect(result.entryId).toBe('entry-123');

      // Should proceed with processing despite duplicate
      expect(mockContentFetcher.fetch).toHaveBeenCalled();
      expect(mockContentProcessor.process).toHaveBeenCalled();
    });
  });

  describe('Content Hash Duplicate Detection', () => {
    test('should detect duplicate content by hash', async () => {
      const url1 = 'https://site1.com/doc.pdf';
      const url2 = 'https://site2.com/same-doc.pdf';
      const contentHash = 'sha256:abcdef123456';

      // First URL - process normally
      (urlRepository.exists as jest.Mock).mockResolvedValue(false);
      (urlRepository.getByHash as jest.Mock).mockResolvedValue(null);

      const result1 = await orchestrator.processUrl(url1);
      expect(result1.success).toBe(true);

      // Second URL - same content hash
      (urlRepository.exists as jest.Mock).mockResolvedValue(false);
      (urlRepository.getByHash as jest.Mock).mockResolvedValue({
        id: 'url-123',
        url: url1,
        contentHash,
        status: UrlStatus.COMPLETED,
        firstSeen: new Date(),
        lastChecked: new Date(),
        processCount: 1
      });

      // Mock to return same content (same hash)
      mockContentFetcher.fetch.mockResolvedValue({
        content: Buffer.from('test content'), // Same content as before
        mimeType: 'application/pdf',
        size: 1000,
        headers: {}
      });

      const result2 = await orchestrator.processUrl(url2);

      expect(result2.success).toBe(false);
      expect(result2.error?.code).toBe(ErrorCode.DUPLICATE_CONTENT);
      expect(result2.metadata.duplicateContent).toBe(true);
      expect(result2.metadata.originalUrl).toBe(url1);
    });

    test('should update URL repository with content hash', async () => {
      const url = 'https://example.com/document.pdf';
      const content = Buffer.from('unique content');

      mockContentFetcher.fetch.mockResolvedValue({
        content,
        mimeType: 'application/pdf',
        size: content.length,
        headers: {}
      });

      (urlRepository.exists as jest.Mock).mockResolvedValue(false);
      (urlRepository.getByHash as jest.Mock).mockResolvedValue(null);

      await orchestrator.processUrl(url);

      // Should update hash after processing content
      expect(urlRepository.updateHash).toHaveBeenCalledWith(
        'url-123',
        expect.stringMatching(/^[a-f0-9]{64}$/) // SHA-256 hash
      );
    });
  });

  describe('URL Repository Integration', () => {
    test('should handle content change detection errors gracefully', async () => {
      const url = 'https://example.com/document.pdf';

      // Mock change detector error - should fallback to processing
      mockContentChangeDetector.hasContentChanged.mockRejectedValue(
        new Error('Database connection failed')
      );

      // Should still process despite change detection error
      const result = await orchestrator.processUrl(url);

      expect(result.success).toBe(true);
      expect(result.entryId).toBe('entry-123');

      // Processing should continue despite change detection error
      expect(mockContentFetcher.fetch).toHaveBeenCalled();
      expect(mockContentProcessor.process).toHaveBeenCalled();
    });

    test('should work without URL repository', async () => {
      // Create orchestrator without URL repository
      const orchestratorNoRepo = new KnowledgeBaseOrchestrator(
        mockUrlDetector as any,
        mockContentFetcher as any,
        mockContentProcessor as any,
        mockKnowledgeStore as any,
        mockFileStorage as any
      );

      const url = 'https://example.com/document.pdf';
      const result = await orchestratorNoRepo.processUrl(url);

      expect(result.success).toBe(true);
      expect(result.entryId).toBe('entry-123');

      // Should process normally without duplicate detection
      expect(mockContentFetcher.fetch).toHaveBeenCalled();
      expect(mockContentProcessor.process).toHaveBeenCalled();
    });

    test('should track processing stages in URL repository', async () => {
      const url = 'https://example.com/document.pdf';

      // Content is new
      mockContentChangeDetector.hasContentChanged.mockResolvedValue({
        hasChanged: true,
        currentHash: 'newhash'
      });

      (urlRepository.exists as jest.Mock).mockResolvedValue(false);

      await orchestrator.processUrl(url);

      // Should update status through processing stages
      const statusCalls = (urlRepository.updateStatus as jest.Mock).mock.calls;
      expect(statusCalls).toContainEqual(['url-123', UrlStatus.PROCESSING]);
      expect(statusCalls).toContainEqual(['url-123', UrlStatus.COMPLETED]);
    });

    test('should mark URL as failed on processing error', async () => {
      const url = 'https://example.com/document.pdf';
      const error = new Error('Processing failed');

      // Content is new
      mockContentChangeDetector.hasContentChanged.mockResolvedValue({
        hasChanged: true,
        currentHash: 'somehash'
      });

      (urlRepository.exists as jest.Mock).mockResolvedValue(false);
      mockContentProcessor.process.mockRejectedValue(error);

      const result = await orchestrator.processUrl(url);

      expect(result.success).toBe(false);
      expect(urlRepository.updateStatus).toHaveBeenCalledWith(
        'url-123',
        UrlStatus.FAILED,
        expect.stringContaining('Processing failed')
      );
    });
  });

  describe('Batch Processing with Content Changes', () => {
    test('should handle content changes in batch processing', async () => {
      const urls = [
        'https://example.com/doc1.pdf',
        'https://example.com/doc2.pdf',
        'https://example.com/doc1.pdf', // Same URL - check if content changed
        'https://example.com/doc3.pdf'
      ];

      // Reset mocks for clean test
      jest.clearAllMocks();

      // Mock content change detection for each URL
      mockContentChangeDetector.hasContentChanged
        .mockResolvedValueOnce({ hasChanged: true, currentHash: 'hash1' })  // doc1 - new content
        .mockResolvedValueOnce({ hasChanged: true, currentHash: 'hash2' })  // doc2 - new content
        .mockResolvedValueOnce({ hasChanged: false, currentHash: 'hash1', previousHash: 'hash1' }) // doc1 - unchanged
        .mockResolvedValueOnce({ hasChanged: true, currentHash: 'hash3' });  // doc3 - new content

      // Mock URL exists checks
      (urlRepository.exists as jest.Mock)
        .mockResolvedValueOnce(false) // doc1 - first time
        .mockResolvedValueOnce(false) // doc2 - first time
        .mockResolvedValueOnce(true)  // doc1 - exists
        .mockResolvedValueOnce(false); // doc3 - first time

      (urlRepository.getUrlInfo as jest.Mock).mockResolvedValue({
        id: 'url-123',
        url: urls[0],
        contentHash: 'hash1',
        status: UrlStatus.COMPLETED,
        firstSeen: new Date(),
        lastChecked: new Date(),
        processCount: 1
      });

      // Mock getByHash to return null (no duplicate content)
      (urlRepository.getByHash as jest.Mock).mockResolvedValue(null);

      // Mock successful processing for all
      mockKnowledgeStore.store.mockResolvedValue('entry-123');
      mockContentFetcher.fetch.mockResolvedValue({
        content: Buffer.from('test content'),
        mimeType: 'application/pdf',
        size: 1000,
        headers: {}
      });
      mockContentProcessor.process.mockResolvedValue({
        text: 'processed text',
        title: 'Test Document',
        metadata: {}
      });

      const results = await orchestrator.processUrls(urls);

      expect(results).toHaveLength(4);
      expect(results[0].success).toBe(true);  // doc1 - processed
      expect(results[1].success).toBe(true);  // doc2 - processed
      expect(results[2].success).toBe(true);  // doc1 - skipped (unchanged)
      expect(results[2].metadata?.skipped).toBe(true);
      expect(results[2].metadata?.reason).toBe('Content unchanged');
      expect(results[3].success).toBe(true);  // doc3 - processed
    });
  });
});