/**
 * Integration tests for processed file tracking system
 * Tests the complete flow from content processing to file tracking
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { SqlProcessedFileRepository } from '../../src/storage/SqlProcessedFileRepository';
import { ProcessedFileStorageWithTracking } from '../../src/storage/ProcessedFileStorageWithTracking';
import { LocalFileStorage } from '../../src/storage/LocalFileStorage';
import { ContentProcessorWithCleaning } from '../../src/processors/ContentProcessorWithCleaning';
import { HtmlProcessor } from '../../src/processors/HtmlProcessor';
import { ContentType } from '../../src/interfaces/IUrlDetector';
import { ProcessingType, ProcessedFileStatus } from '../../src/interfaces/IProcessedFileRepository';

describe('ProcessedFileTracking Integration', () => {
  let tempDir: string;
  let processedRepo: SqlProcessedFileRepository;
  let processedStorage: ProcessedFileStorageWithTracking;
  let processor: ContentProcessorWithCleaning;

  beforeEach(async () => {
    // Create temp directory for test data
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'processed-test-'));
    const dbPath = path.join(tempDir, 'processed.db');
    const storagePath = path.join(tempDir, 'files');

    // Initialize repository
    processedRepo = new SqlProcessedFileRepository(dbPath);
    await processedRepo.initialize();

    // Initialize storage with tracking
    const baseStorage = new LocalFileStorage(storagePath, false, false);
    processedStorage = new ProcessedFileStorageWithTracking(
      baseStorage,
      processedRepo
    );

    // Initialize processor with cleaning - use HtmlProcessor for HTML content
    const htmlProcessor = new HtmlProcessor();
    processor = new ContentProcessorWithCleaning(
      htmlProcessor,
      undefined,
      processedStorage
    );
  });

  afterEach(async () => {
    // Clean up
    await processedRepo.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  test('should track processed file when saving cleaned content', async () => {
    const content = Buffer.from('This is test content with <script>alert("xss")</script> some issues.');
    const url = 'https://example.com/test.html';

    const result = await processor.process(
      content,
      ContentType.HTML,
      {
        textCleaning: {
          enabled: true,
          saveCleanedFile: true,
          url,
          cleanerNames: ['xss'],
          originalFileId: 'original_123'
        }
      }
    );

    // Verify cleaned file was saved
    expect(result.cleanedFilePath).toBeDefined();
    expect(result.processedFileId).toBeDefined();

    // Verify file exists on disk
    const fileExists = await processedStorage.exists(result.cleanedFilePath!);
    expect(fileExists).toBe(true);

    // Verify tracking in repository
    const processedFiles = await processedRepo.getProcessedFilesByUrl(url);
    expect(processedFiles).toHaveLength(1);
    expect(processedFiles[0].processingType).toBe(ProcessingType.CLEANED);
    expect(processedFiles[0].originalFileId).toBe('original_123');
  });

  test('should link processed files to original files', async () => {
    const content = Buffer.from('Test content for linking');
    const originalFileId = 'original_456';
    const url = 'https://example.com/doc.txt';

    // Save processed file
    await processedStorage.store(
      content,
      'processed.txt',
      {
        metadata: {
          url,
          originalFileId,
          processingType: ProcessingType.CLEANED,
          cleanersUsed: ['voca'],
          mimeType: 'text/plain'
        }
      }
    );

    // Verify linkage
    const processedFiles = await processedRepo.getProcessedFilesByOriginal(originalFileId);
    expect(processedFiles).toHaveLength(1);
    expect(processedFiles[0].originalFileId).toBe(originalFileId);
    expect(processedFiles[0].url).toBe(url);
  });

  test('should handle multiple processing types for same original', async () => {
    const originalFileId = 'original_789';
    const url = 'https://example.com/multi.txt';

    // Save cleaned version
    await processedStorage.store(
      Buffer.from('Cleaned content'),
      'cleaned.txt',
      {
        metadata: {
          url,
          originalFileId,
          processingType: ProcessingType.CLEANED,
          mimeType: 'text/plain'
        }
      }
    );

    // Save normalized version
    await processedStorage.store(
      Buffer.from('Normalized content'),
      'normalized.txt',
      {
        metadata: {
          url,
          originalFileId,
          processingType: ProcessingType.NORMALIZED,
          mimeType: 'text/plain'
        }
      }
    );

    // Verify both are tracked
    const processedFiles = await processedRepo.getProcessedFilesByOriginal(originalFileId);
    expect(processedFiles).toHaveLength(2);

    const types = processedFiles.map(f => f.processingType).sort();
    expect(types).toEqual([ProcessingType.CLEANED, ProcessingType.NORMALIZED]);
  });

  test('should generate unique IDs for processed files', async () => {
    const ids: string[] = [];

    for (let i = 0; i < 5; i++) {
      const storagePath = await processedStorage.store(
        Buffer.from(`Content ${i}`),
        `file${i}.txt`,
        {
          metadata: {
            url: `https://example.com/file${i}`,
            processingType: ProcessingType.CLEANED,
            mimeType: 'text/plain'
          }
        }
      );

      const metadata = await processedStorage.getMetadata(storagePath);
      if (metadata?.metadata?.processedFileId) {
        ids.push(metadata.metadata.processedFileId);
      }
    }

    // All IDs should be unique
    const uniqueIds = [...new Set(ids)];
    expect(uniqueIds).toHaveLength(5);

    // All should start with 'processed_'
    ids.forEach(id => {
      expect(id).toMatch(/^processed_\d+_[a-f0-9]+$/);
    });
  });

  test('should track cleaning metadata', async () => {
    const content = Buffer.from('Test content');
    const cleanersUsed = ['sanitize-html', 'xss', 'voca'];
    const cleaningConfig = {
      preserveLinks: true,
      removeScripts: true
    };

    await processedStorage.store(
      content,
      'cleaned.txt',
      {
        metadata: {
          url: 'https://example.com',
          processingType: ProcessingType.CLEANED,
          cleanersUsed,
          cleaningConfig,
          mimeType: 'text/plain'
        }
      }
    );

    const files = await processedRepo.listProcessedFiles({
      cleanersUsed: ['voca']
    });

    expect(files).toHaveLength(1);
    expect(files[0].cleanersUsed).toEqual(cleanersUsed);
    expect(files[0].cleaningConfig).toEqual(cleaningConfig);
  });

  test('should update file status correctly', async () => {
    const storagePath = await processedStorage.store(
      Buffer.from('Test'),
      'test.txt',
      {
        metadata: {
          url: 'https://example.com',
          processingType: ProcessingType.CLEANED,
          mimeType: 'text/plain'
        }
      }
    );

    const metadata = await processedStorage.getMetadata(storagePath);
    const fileId = metadata?.metadata?.processedFileId;

    expect(fileId).toBeDefined();

    // Update status
    await processedRepo.updateFileStatus(fileId!, ProcessedFileStatus.ARCHIVED);

    // Verify update
    const file = await processedRepo.getProcessedFile(fileId!);
    expect(file?.status).toBe(ProcessedFileStatus.ARCHIVED);
  });

  test('should collect statistics correctly', async () => {
    // Create multiple files
    for (let i = 0; i < 3; i++) {
      await processedStorage.store(
        Buffer.from(`Content ${i}`),
        `file${i}.txt`,
        {
          metadata: {
            url: `https://example.com/file${i}`,
            processingType: i === 0 ? ProcessingType.CLEANED : ProcessingType.NORMALIZED,
            cleanersUsed: i === 0 ? ['voca'] : undefined,
            mimeType: 'text/plain',
            originalFileId: i < 2 ? 'original_1' : 'original_2'
          }
        }
      );
    }

    const stats = await processedRepo.getStatistics();

    expect(stats.totalFiles).toBe(3);
    expect(stats.filesByProcessingType[ProcessingType.CLEANED]).toBe(1);
    expect(stats.filesByProcessingType[ProcessingType.NORMALIZED]).toBe(2);
    expect(stats.cleanerUsageCount['voca']).toBe(1);
    expect(stats.originalFilesWithProcessed).toBe(2);
    expect(stats.averageProcessedPerOriginal).toBe(1.5);
  });
});