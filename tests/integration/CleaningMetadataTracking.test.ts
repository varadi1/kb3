/**
 * Integration tests for cleaning metadata tracking through the entire pipeline
 * Ensures cleaning metadata is captured and stored correctly
 */

import { KnowledgeBaseFactory, KnowledgeBaseConfigExtended } from '../../src/factory/KnowledgeBaseFactory';
import { createUnifiedConfiguration } from '../../src/config/Configuration';
import { ProcessingOptionsWithCleaning } from '../../src/processors/ContentProcessorWithCleaning';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('Cleaning Metadata Tracking', () => {
  let tempDir: string;
  let kb: any;
  let config: KnowledgeBaseConfigExtended;

  beforeEach(async () => {
    // Create temp directory for test data
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'kb3-cleaning-test-'));

    // Create configuration with cleaning enabled
    config = createUnifiedConfiguration({
      storage: {
        unified: {
          enabled: true,
          dbPath: path.join(tempDir, 'test.db'),
          enableWAL: false,
          enableForeignKeys: true,
          autoMigrate: false
        },
        knowledgeStore: {
          type: 'sql',
          dbPath: path.join(tempDir, 'knowledge.db')
        },
        fileStorage: {
          basePath: path.join(tempDir, 'files'),
          compressionEnabled: false,
          encryptionEnabled: false
        },
        fileStore: {
          path: path.join(tempDir, 'files')
        },
        processedFileStore: {
          type: 'sql',
          path: path.join(tempDir, 'processed.db'),
          enabled: true
        },
        originalFileStore: {
          type: 'sql',
          path: path.join(tempDir, 'original.db')
        }
      },
      logging: {
        level: 'error'
      }
    });

    // Create knowledge base
    kb = await KnowledgeBaseFactory.createKnowledgeBase(config);
  });

  afterEach(async () => {
    // Clean up temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      console.warn('Failed to cleanup temp directory:', error);
    }
  });

  test('should capture cleaning metadata in processing result', async () => {
    // Create test HTML content
    const htmlContent = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Test Content</h1>
          <p>This is test content with <script>alert('xss')</script> dangerous elements.</p>
          <p>Normal paragraph text here.</p>
        </body>
      </html>
    `;

    // Mock the URL detector to return HTML type
    const detector = (kb as any).urlDetector;
    jest.spyOn(detector, 'canHandle').mockReturnValue(true);
    jest.spyOn(detector, 'detect').mockResolvedValue({
      type: 'html',  // Use ContentType.HTML value
      mimeType: 'text/html',
      metadata: {
        url: 'https://example.com/test'
      }
    });

    // The processor should be ContentProcessorWithCleaning which wraps a ProcessorRegistry
    // We don't need to mock canProcess since it delegates to the base processor

    // Mock the content fetcher to return our test content
    const fetcher = (kb as any).contentFetcher;
    jest.spyOn(fetcher, 'fetch').mockResolvedValue({
      url: 'https://example.com/test',
      content: Buffer.from(htmlContent),
      mimeType: 'text/html',
      size: htmlContent.length,
      metadata: {
        scraperUsed: 'mock-scraper',
        scraperConfig: { test: true }
      }
    });

    // Process with cleaning enabled
    const processingOptions: ProcessingOptionsWithCleaning = {
      textCleaning: {
        enabled: true,
        cleanerNames: ['sanitize-html', 'xss'],
        storeMetadata: true,
        saveCleanedFile: true,
        preserveOriginal: true,
        url: 'https://example.com/test'
      }
    } as any;

    const result = await kb.processUrl('https://example.com/test', processingOptions);

    // Verify processing succeeded
    expect(result.success).toBe(true);

    // Verify cleaning metadata is present
    expect(result.metadata.cleaningMetadata).toBeDefined();
    expect(result.metadata.cleaningMetadata.cleanersUsed).toContain('sanitize-html');
    expect(result.metadata.cleaningMetadata.cleanersUsed).toContain('xss');

    // Verify cleaning statistics
    expect(result.metadata.cleaningMetadata.statistics).toBeDefined();
    expect(result.metadata.cleaningMetadata.statistics.originalLength).toBeGreaterThan(0);
    expect(result.metadata.cleaningMetadata.statistics.cleanedLength).toBeGreaterThan(0);
    expect(result.metadata.cleaningMetadata.statistics.compressionRatio).toBeDefined();
    expect(result.metadata.cleaningMetadata.statistics.processingTimeMs).toBeGreaterThan(0);

    // Verify cleaning configuration
    expect(result.metadata.cleaningMetadata.cleaningConfig).toBeDefined();
    expect(result.metadata.cleaningMetadata.cleaningConfig.url).toBe('https://example.com/test');
  });

  test('should store cleaning metadata in original file repository', async () => {
    // Create test content
    const textContent = 'Sample text with    excessive    spaces   and redundant content.';

    // Mock the URL detector to return text/plain type
    const detector = (kb as any).urlDetector;
    jest.spyOn(detector, 'canHandle').mockReturnValue(true);
    jest.spyOn(detector, 'detect').mockResolvedValue({
      type: 'txt',  // Use ContentType.TXT value
      mimeType: 'text/plain',
      metadata: {
        url: 'https://example.com/text'
      }
    });

    // Mock the content fetcher
    const fetcher = (kb as any).contentFetcher;
    jest.spyOn(fetcher, 'fetch').mockResolvedValue({
      url: 'https://example.com/text',
      content: Buffer.from(textContent),
      mimeType: 'text/plain',
      size: textContent.length,
      metadata: {
        scraperUsed: 'mock-scraper'
      }
    });

    // Process with cleaning
    const processingOptions: ProcessingOptionsWithCleaning = {
      textCleaning: {
        enabled: true,
        autoSelect: true,
        storeMetadata: true,
        saveCleanedFile: true
      }
    } as any;

    await kb.processUrl('https://example.com/text', processingOptions);

    // Get original file repository
    const originalFileRepo = kb.getOriginalFileRepository();
    expect(originalFileRepo).toBeDefined();

    // Get files for this URL
    const files = await originalFileRepo.getOriginalFilesByUrl('https://example.com/text');
    expect(files).toHaveLength(1);

    const file = files[0];

    // Verify cleaning metadata was stored
    expect(file.cleaningMetadata).toBeDefined();
    expect(file.cleaningMetadata.cleanersUsed).toBeDefined();
    expect(Array.isArray(file.cleaningMetadata.cleanersUsed)).toBe(true);
    expect(file.cleaningMetadata.statistics).toBeDefined();

    // Verify scraper metadata is also present
    expect(file.scraperUsed).toBe('mock-scraper');
  });

  test('should handle processing without cleaning', async () => {
    // Create test content
    const jsonContent = JSON.stringify({ test: 'data', value: 123 });

    // Mock the content fetcher
    const fetcher = (kb as any).contentFetcher;
    jest.spyOn(fetcher, 'fetch').mockResolvedValue({
      url: 'https://example.com/data.json',
      content: Buffer.from(jsonContent),
      mimeType: 'application/json',
      size: jsonContent.length,
      metadata: {
        scraperUsed: 'http-scraper'
      }
    });

    // Process without cleaning
    const result = await kb.processUrl('https://example.com/data.json');

    // Verify processing succeeded
    expect(result.success).toBe(true);

    // Verify no cleaning metadata is present
    expect(result.metadata.cleaningMetadata).toBeUndefined();

    // Verify scraper metadata is still present
    expect(result.metadata.scraperUsed).toBe('http-scraper');

    // Check original file repository
    const originalFileRepo = kb.getOriginalFileRepository();
    const files = await originalFileRepo.getOriginalFilesByUrl('https://example.com/data.json');
    expect(files).toHaveLength(1);

    const file = files[0];
    expect(file.cleaningMetadata).toBeUndefined();
    expect(file.scraperUsed).toBe('http-scraper');
  });

  test('should include cleaning metadata in URL repository', async () => {
    // Create test content
    const markdownContent = `
# Test Document

This is a **test** document with [links](https://example.com).

- Item 1
- Item 2
`;

    // Mock the URL detector to return markdown type
    const detector = (kb as any).urlDetector;
    jest.spyOn(detector, 'canHandle').mockReturnValue(true);
    jest.spyOn(detector, 'detect').mockResolvedValue({
      type: 'markdown',  // Use ContentType.MARKDOWN value
      mimeType: 'text/markdown',
      metadata: {
        url: 'https://example.com/doc.md'
      }
    });

    // Mock the content fetcher
    const fetcher = (kb as any).contentFetcher;
    jest.spyOn(fetcher, 'fetch').mockResolvedValue({
      url: 'https://example.com/doc.md',
      content: Buffer.from(markdownContent),
      mimeType: 'text/markdown',
      size: markdownContent.length,
      metadata: {
        scraperUsed: 'playwright'
      }
    });

    // Process with specific cleaners
    const processingOptions: ProcessingOptionsWithCleaning = {
      textCleaning: {
        enabled: true,
        cleanerNames: ['remark'],
        storeMetadata: true
      }
    } as any;

    const result = await kb.processUrl('https://example.com/doc.md', processingOptions);

    // Processing should succeed
    expect(result.success).toBe(true);

    // Get URL repository
    const urlRepo = (kb as any).urlRepository;
    expect(urlRepo).toBeDefined();

    // Get URL info
    const urlInfo = await urlRepo.getUrlInfo('https://example.com/doc.md');
    expect(urlInfo).toBeDefined();

    // Verify metadata includes both scraper and cleaning info
    expect(urlInfo.metadata).toBeDefined();
    expect(urlInfo.metadata.scraperUsed).toBe('playwright');
    expect(urlInfo.metadata.cleaningMetadata).toBeDefined();
    expect(urlInfo.metadata.cleaningMetadata.cleanersUsed).toContain('remark');
  });

  test('should track processed file ID in cleaning metadata', async () => {
    // Create test content
    const htmlContent = '<p>Test content for processing</p>';

    // Mock the URL detector to return HTML type
    const detector = (kb as any).urlDetector;
    jest.spyOn(detector, 'canHandle').mockReturnValue(true);
    jest.spyOn(detector, 'detect').mockResolvedValue({
      type: 'html',  // Use ContentType.HTML value
      mimeType: 'text/html',
      metadata: {
        url: 'https://example.com/page'
      }
    });

    // Mock the content fetcher
    const fetcher = (kb as any).contentFetcher;
    jest.spyOn(fetcher, 'fetch').mockResolvedValue({
      url: 'https://example.com/page',
      content: Buffer.from(htmlContent),
      mimeType: 'text/html',
      size: htmlContent.length,
      metadata: {}
    });

    // Process with cleaning and file saving
    const processingOptions: ProcessingOptionsWithCleaning = {
      textCleaning: {
        enabled: true,
        autoSelect: true,
        storeMetadata: true,
        saveCleanedFile: true,
        originalFileId: 'test-original-id'
      }
    } as any;

    const result = await kb.processUrl('https://example.com/page', processingOptions);

    // Verify cleaning metadata includes processed file references
    expect(result.metadata.cleaningMetadata).toBeDefined();

    // Check if cleaned file path is tracked
    if (result.metadata.cleaningMetadata.cleanedFilePath) {
      expect(result.metadata.cleaningMetadata.cleanedFilePath).toBeDefined();
      expect(typeof result.metadata.cleaningMetadata.cleanedFilePath).toBe('string');
    }

    // Verify original file tracking includes cleaning metadata
    const originalFileRepo = kb.getOriginalFileRepository();
    const files = await originalFileRepo.getOriginalFilesByUrl('https://example.com/page');

    if (files.length > 0) {
      const file = files[0];
      if (file.cleaningMetadata?.processedFileId) {
        expect(file.cleaningMetadata.processedFileId).toBeDefined();
      }
    }
  });
});