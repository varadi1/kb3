/**
 * Unit tests for SqlProcessedFileRepository
 * Tests database operations for processed file tracking
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { SqlProcessedFileRepository } from '../../../src/storage/SqlProcessedFileRepository';
import {
  ProcessedFileInfo,
  ProcessedFileStatus,
  ProcessingType,
  ListProcessedFilesOptions
} from '../../../src/interfaces/IProcessedFileRepository';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

describe('SqlProcessedFileRepository', () => {
  let repository: SqlProcessedFileRepository;
  let tempDir: string;
  let dbPath: string;

  beforeEach(async () => {
    // Create temporary directory for test database
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'processed-repo-test-'));
    dbPath = path.join(tempDir, 'processed_test.db');
    repository = new SqlProcessedFileRepository(dbPath);
    await repository.initialize();
  });

  afterEach(async () => {
    await repository.close();
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Database Initialization', () => {
    test('should create database and tables', async () => {
      // Database should be created
      const dbExists = await fs.access(dbPath).then(() => true).catch(() => false);
      expect(dbExists).toBe(true);

      // Should be able to record a file (tables exist)
      const fileInfo: ProcessedFileInfo = {
        url: 'https://example.com',
        filePath: '/test/path.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'abc123',
        processingType: ProcessingType.CLEANED
      };

      const id = await repository.recordProcessedFile(fileInfo);
      expect(id).toBeDefined();
    });

    test('should handle re-initialization gracefully', async () => {
      // Close and reinitialize
      await repository.close();
      repository = new SqlProcessedFileRepository(dbPath);
      await repository.initialize();

      // Should work normally
      const files = await repository.listProcessedFiles();
      expect(Array.isArray(files)).toBe(true);
    });
  });

  describe('Recording Processed Files', () => {
    test('should record file with all metadata', async () => {
      const fileInfo: ProcessedFileInfo = {
        originalFileId: 'original_123',
        url: 'https://example.com/test',
        filePath: '/data/processed/file.txt',
        mimeType: 'text/plain',
        size: 1024,
        checksum: 'sha256_hash',
        processingType: ProcessingType.CLEANED,
        cleanersUsed: ['sanitize-html', 'xss'],
        cleaningConfig: { removeScripts: true },
        metadata: { custom: 'value' }
      };

      const id = await repository.recordProcessedFile(fileInfo);

      expect(id).toMatch(/^processed_\d+_[a-f0-9]+$/);

      // Retrieve and verify
      const retrieved = await repository.getProcessedFile(id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.originalFileId).toBe('original_123');
      expect(retrieved?.cleanersUsed).toEqual(['sanitize-html', 'xss']);
      expect(retrieved?.cleaningConfig).toEqual({ removeScripts: true });
      expect(retrieved?.metadata).toEqual({ custom: 'value' });
    });

    test('should generate unique IDs', async () => {
      const ids = new Set<string>();

      for (let i = 0; i < 10; i++) {
        const fileInfo: ProcessedFileInfo = {
          url: `https://example.com/file${i}`,
          filePath: `/data/file${i}.txt`,
          mimeType: 'text/plain',
          size: 100,
          checksum: `hash${i}`,
          processingType: ProcessingType.CLEANED
        };

        const id = await repository.recordProcessedFile(fileInfo);
        ids.add(id);
      }

      expect(ids.size).toBe(10);
    });

    test('should handle duplicate file paths', async () => {
      const fileInfo: ProcessedFileInfo = {
        url: 'https://example.com',
        filePath: '/data/duplicate.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'abc123',
        processingType: ProcessingType.CLEANED
      };

      const id1 = await repository.recordProcessedFile(fileInfo);
      const id2 = await repository.recordProcessedFile(fileInfo);

      // Should return same ID for duplicate path
      expect(id2).toBe(id1);
    });
  });

  describe('Retrieving Processed Files', () => {
    test('should retrieve by ID', async () => {
      const fileInfo: ProcessedFileInfo = {
        url: 'https://example.com',
        filePath: '/data/test.txt',
        mimeType: 'text/plain',
        size: 500,
        checksum: 'xyz789',
        processingType: ProcessingType.NORMALIZED
      };

      const id = await repository.recordProcessedFile(fileInfo);
      const retrieved = await repository.getProcessedFile(id);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(id);
      expect(retrieved?.processingType).toBe(ProcessingType.NORMALIZED);
      expect(retrieved?.size).toBe(500);
    });

    test('should update accessed_at timestamp', async () => {
      const fileInfo: ProcessedFileInfo = {
        url: 'https://example.com',
        filePath: '/data/test.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'abc',
        processingType: ProcessingType.CLEANED
      };

      const id = await repository.recordProcessedFile(fileInfo);

      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 10));

      const retrieved = await repository.getProcessedFile(id);
      expect(retrieved?.accessedAt).toBeDefined();
      expect(retrieved?.accessedAt?.getTime()).toBeGreaterThan(retrieved?.createdAt.getTime()!);
    });

    test('should return null for non-existent ID', async () => {
      const retrieved = await repository.getProcessedFile('non_existent_id');
      expect(retrieved).toBeNull();
    });
  });

  describe('Querying by Relationships', () => {
    test('should get files by original file ID', async () => {
      const originalId = 'original_456';

      // Create multiple processed versions
      for (let i = 0; i < 3; i++) {
        await repository.recordProcessedFile({
          originalFileId: originalId,
          url: 'https://example.com',
          filePath: `/data/version${i}.txt`,
          mimeType: 'text/plain',
          size: 100 + i,
          checksum: `hash${i}`,
          processingType: i === 0 ? ProcessingType.CLEANED : ProcessingType.NORMALIZED
        });
      }

      const files = await repository.getProcessedFilesByOriginal(originalId);
      expect(files).toHaveLength(3);
      expect(files.every(f => f.originalFileId === originalId)).toBe(true);
    });

    test('should get files by URL', async () => {
      const url = 'https://example.com/document';

      // Create multiple files for same URL
      for (let i = 0; i < 2; i++) {
        await repository.recordProcessedFile({
          url,
          filePath: `/data/doc${i}.txt`,
          mimeType: 'text/plain',
          size: 200,
          checksum: `doc${i}`,
          processingType: ProcessingType.CLEANED
        });
      }

      const files = await repository.getProcessedFilesByUrl(url);
      expect(files).toHaveLength(2);
      expect(files.every(f => f.url === url)).toBe(true);
    });
  });

  describe('Listing with Filters', () => {
    beforeEach(async () => {
      // Seed test data
      const testData = [
        {
          url: 'https://site1.com',
          processingType: ProcessingType.CLEANED,
          cleanersUsed: ['voca'],
          status: ProcessedFileStatus.ACTIVE
        },
        {
          url: 'https://site2.com',
          processingType: ProcessingType.NORMALIZED,
          status: ProcessedFileStatus.ACTIVE
        },
        {
          url: 'https://site1.com',
          processingType: ProcessingType.CLEANED,
          cleanersUsed: ['xss', 'voca'],
          status: ProcessedFileStatus.ARCHIVED
        }
      ];

      for (let i = 0; i < testData.length; i++) {
        await repository.recordProcessedFile({
          url: testData[i].url,
          filePath: `/data/file${i}.txt`,
          mimeType: 'text/plain',
          size: 100,
          checksum: `hash${i}`,
          processingType: testData[i].processingType,
          cleanersUsed: testData[i].cleanersUsed
        });

        if (testData[i].status === ProcessedFileStatus.ARCHIVED) {
          // Update status for the last one
          const files = await repository.listProcessedFiles();
          await repository.updateFileStatus(files[files.length - 1].id, ProcessedFileStatus.ARCHIVED);
        }
      }
    });

    test('should filter by processing type', async () => {
      const options: ListProcessedFilesOptions = {
        processingType: ProcessingType.CLEANED
      };

      const files = await repository.listProcessedFiles(options);
      expect(files).toHaveLength(2);
      expect(files.every(f => f.processingType === ProcessingType.CLEANED)).toBe(true);
    });

    test('should filter by status', async () => {
      const options: ListProcessedFilesOptions = {
        status: ProcessedFileStatus.ACTIVE
      };

      const files = await repository.listProcessedFiles(options);
      expect(files).toHaveLength(2);
      expect(files.every(f => f.status === ProcessedFileStatus.ACTIVE)).toBe(true);
    });

    test('should filter by cleaners used', async () => {
      const options: ListProcessedFilesOptions = {
        cleanersUsed: ['voca']
      };

      const files = await repository.listProcessedFiles(options);
      expect(files).toHaveLength(2);
      files.forEach(file => {
        expect(file.cleanersUsed).toContain('voca');
      });
    });

    test('should support pagination', async () => {
      const page1 = await repository.listProcessedFiles({
        limit: 2,
        offset: 0,
        sortBy: 'createdAt',
        sortOrder: 'asc'
      });

      const page2 = await repository.listProcessedFiles({
        limit: 2,
        offset: 2,
        sortBy: 'createdAt',
        sortOrder: 'asc'
      });

      expect(page1).toHaveLength(2);
      expect(page2).toHaveLength(1);
      expect(page1[0].id).not.toBe(page2[0]?.id);
    });
  });

  describe('Updating Status', () => {
    test('should update file status', async () => {
      const id = await repository.recordProcessedFile({
        url: 'https://example.com',
        filePath: '/data/test.txt',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'abc',
        processingType: ProcessingType.CLEANED
      });

      // Initially should be ACTIVE
      let file = await repository.getProcessedFile(id);
      expect(file?.status).toBe(ProcessedFileStatus.ACTIVE);

      // Wait a bit to ensure updatedAt will be different
      await new Promise(resolve => setTimeout(resolve, 10));

      // Update to ARCHIVED
      const updated = await repository.updateFileStatus(id, ProcessedFileStatus.ARCHIVED);
      expect(updated).toBe(true);

      // Verify update
      file = await repository.getProcessedFile(id);
      expect(file?.status).toBe(ProcessedFileStatus.ARCHIVED);
      expect(file?.updatedAt.getTime()).toBeGreaterThan(file?.createdAt.getTime()!);
    });

    test('should return false for non-existent file', async () => {
      const updated = await repository.updateFileStatus('non_existent', ProcessedFileStatus.DELETED);
      expect(updated).toBe(false);
    });
  });

  describe('Statistics', () => {
    test('should calculate statistics correctly', async () => {
      // Create test data
      await repository.recordProcessedFile({
        url: 'https://example.com/1',
        filePath: '/data/1.txt',
        mimeType: 'text/plain',
        size: 1000,
        checksum: '1',
        processingType: ProcessingType.CLEANED,
        cleanersUsed: ['voca', 'xss'],
        originalFileId: 'orig1'
      });

      await repository.recordProcessedFile({
        url: 'https://example.com/2',
        filePath: '/data/2.txt',
        mimeType: 'text/html',
        size: 2000,
        checksum: '2',
        processingType: ProcessingType.CLEANED,
        cleanersUsed: ['voca'],
        originalFileId: 'orig1'
      });

      await repository.recordProcessedFile({
        url: 'https://example.com/3',
        filePath: '/data/3.txt',
        mimeType: 'text/plain',
        size: 3000,
        checksum: '3',
        processingType: ProcessingType.NORMALIZED,
        originalFileId: 'orig2'
      });

      const stats = await repository.getStatistics();

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(6000);
      expect(stats.averageFileSize).toBe(2000);
      expect(stats.filesByProcessingType[ProcessingType.CLEANED]).toBe(2);
      expect(stats.filesByProcessingType[ProcessingType.NORMALIZED]).toBe(1);
      expect(stats.filesByMimeType['text/plain']).toBe(2);
      expect(stats.filesByMimeType['text/html']).toBe(1);
      expect(stats.cleanerUsageCount['voca']).toBe(2);
      expect(stats.cleanerUsageCount['xss']).toBe(1);
      expect(stats.originalFilesWithProcessed).toBe(2);
      expect(stats.averageProcessedPerOriginal).toBe(1.5);
    });

    test('should handle empty database', async () => {
      const stats = await repository.getStatistics();

      expect(stats.totalFiles).toBe(0);
      expect(stats.totalSize).toBe(0);
      expect(stats.averageFileSize).toBe(0);
      expect(stats.originalFilesWithProcessed).toBe(0);
      expect(stats.averageProcessedPerOriginal).toBe(0);
    });
  });
});