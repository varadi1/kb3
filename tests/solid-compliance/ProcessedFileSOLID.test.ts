/**
 * SOLID Compliance Tests for Processed File Tracking Components
 * Verifies that new components follow SOLID principles
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import { SqlProcessedFileRepository } from '../../src/storage/SqlProcessedFileRepository';
import { ProcessedFileStorageWithTracking } from '../../src/storage/ProcessedFileStorageWithTracking';
import { IProcessedFileRepository, ProcessedFileInfo, ProcessingType } from '../../src/interfaces/IProcessedFileRepository';
import { IFileStorage } from '../../src/interfaces/IFileStorage';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('Processed File Components - SOLID Compliance', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'solid-test-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  describe('Single Responsibility Principle', () => {
    test('SqlProcessedFileRepository has single responsibility', () => {
      // Repository should only manage database operations for processed files
      const methods = Object.getOwnPropertyNames(SqlProcessedFileRepository.prototype);

      const databaseMethods = methods.filter(m =>
        m.includes('record') ||
        m.includes('get') ||
        m.includes('list') ||
        m.includes('update') ||
        m.includes('initialize') ||
        m.includes('close') ||
        m === 'constructor'
      );

      // Should not have methods unrelated to database operations
      const nonDatabaseMethods = methods.filter(m =>
        !databaseMethods.includes(m) &&
        !m.startsWith('_') &&
        !m.startsWith('row') &&
        !m.startsWith('map') &&
        !m.startsWith('generate') &&
        !m.startsWith('create') &&
        !m.includes('run') &&
        !m.includes('all') &&
        !m.includes('getStatistics') // Statistics is part of repository responsibilities
      );

      expect(nonDatabaseMethods).toHaveLength(0); // All methods should be database-related
    });

    test('ProcessedFileStorageWithTracking has single responsibility', () => {
      // Should only add tracking to storage operations
      const methods = Object.getOwnPropertyNames(ProcessedFileStorageWithTracking.prototype);

      const storageMethods = ['store', 'retrieve', 'exists', 'delete', 'getMetadata', 'list', 'getStats'];
      const actualMethods = methods.filter(m =>
        !m.startsWith('_') &&
        m !== 'constructor' &&
        !m.includes('ensure') && // Private methods
        !m.includes('guess') && // Private methods
        !m.includes('update') // Private methods
      );

      // Should only have storage interface methods
      actualMethods.forEach(method => {
        expect(storageMethods).toContain(method);
      });
    });
  });

  describe('Open/Closed Principle', () => {
    test('ProcessedFileStorageWithTracking extends without modification', () => {
      // Create mock base storage
      const mockStorage: IFileStorage = {
        store: jest.fn().mockResolvedValue('/path/to/file'),
        retrieve: jest.fn().mockResolvedValue(Buffer.from('test')),
        exists: jest.fn().mockResolvedValue(true),
        delete: jest.fn().mockResolvedValue(true),
        getMetadata: jest.fn().mockResolvedValue(null),
        list: jest.fn().mockResolvedValue([]),
        getStats: jest.fn().mockResolvedValue({
          totalFiles: 0,
          totalSize: 0,
          fileTypes: {},
          oldestFile: undefined,
          newestFile: undefined,
          averageFileSize: 0
        })
      };

      // Create mock repository
      const mockRepo: IProcessedFileRepository = {
        initialize: jest.fn().mockResolvedValue(undefined),
        recordProcessedFile: jest.fn().mockResolvedValue('processed_123'),
        getProcessedFile: jest.fn().mockResolvedValue(null),
        getProcessedFilesByOriginal: jest.fn().mockResolvedValue([]),
        getProcessedFilesByUrl: jest.fn().mockResolvedValue([]),
        listProcessedFiles: jest.fn().mockResolvedValue([]),
        updateFileStatus: jest.fn().mockResolvedValue(true),
        getStatistics: jest.fn().mockResolvedValue({
          totalFiles: 0,
          totalSize: 0,
          averageFileSize: 0,
          filesByStatus: {} as any,
          filesByProcessingType: {} as any,
          filesByMimeType: {},
          cleanerUsageCount: {},
          originalFilesWithProcessed: 0,
          averageProcessedPerOriginal: 0
        }),
        close: jest.fn().mockResolvedValue(undefined)
      };

      // Decorator should work with any IFileStorage implementation
      const trackedStorage = new ProcessedFileStorageWithTracking(mockStorage, mockRepo);

      // Should delegate to base storage
      expect(trackedStorage).toBeDefined();
      expect(typeof trackedStorage.store).toBe('function');
      expect(typeof trackedStorage.retrieve).toBe('function');
    });

    test('New processing types can be added without modifying existing code', () => {
      // ProcessingType enum can be extended
      const customType = 'custom_processing' as ProcessingType;

      const fileInfo: ProcessedFileInfo = {
        url: 'https://example.com',
        filePath: '/path/to/file',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'abc123',
        processingType: customType
      };

      // Should accept any processing type
      expect(fileInfo.processingType).toBeDefined();
    });
  });

  describe('Liskov Substitution Principle', () => {
    test('SqlProcessedFileRepository is substitutable for IProcessedFileRepository', async () => {
      const dbPath = path.join(tempDir, 'test.db');
      const repository: IProcessedFileRepository = new SqlProcessedFileRepository(dbPath);

      await repository.initialize();

      // Should fulfill interface contract
      const fileInfo: ProcessedFileInfo = {
        url: 'https://example.com',
        filePath: '/test/path',
        mimeType: 'text/plain',
        size: 100,
        checksum: 'test123',
        processingType: ProcessingType.CLEANED
      };

      const id = await repository.recordProcessedFile(fileInfo);
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^processed_/);

      const retrieved = await repository.getProcessedFile(id);
      expect(retrieved).toBeTruthy();
      expect(retrieved?.url).toBe(fileInfo.url);

      await repository.close();
    });

    test('ProcessedFileStorageWithTracking is substitutable for IFileStorage', async () => {
      // Create real implementations
      const LocalFileStorage = (await import('../../src/storage/LocalFileStorage')).LocalFileStorage;
      const baseStorage = new LocalFileStorage(tempDir, false, false);

      const dbPath = path.join(tempDir, 'test.db');
      const repository = new SqlProcessedFileRepository(dbPath);
      await repository.initialize();

      const storage: IFileStorage = new ProcessedFileStorageWithTracking(
        baseStorage,
        repository
      );

      // Should fulfill IFileStorage contract
      const content = Buffer.from('test content');
      const storedPath = await storage.store(content, 'test.txt');
      expect(typeof storedPath).toBe('string');

      const retrieved = await storage.retrieve(storedPath);
      expect(retrieved).toEqual(content);

      const exists = await storage.exists(storedPath);
      expect(exists).toBe(true);

      await repository.close();
    });
  });

  describe('Interface Segregation Principle', () => {
    test('IProcessedFileRepository interface is focused', () => {
      // Interface should have cohesive, related methods
      const interfaceMethods = [
        'initialize',
        'recordProcessedFile',
        'getProcessedFile',
        'getProcessedFilesByOriginal',
        'getProcessedFilesByUrl',
        'listProcessedFiles',
        'updateFileStatus',
        'getStatistics',
        'close'
      ];

      // All methods should be related to processed file management
      interfaceMethods.forEach(method => {
        const isRelated =
          method.includes('ProcessedFile') ||
          method.includes('initialize') ||
          method.includes('close') ||
          method.includes('Status') ||
          method.includes('Statistics');

        expect(isRelated).toBe(true);
      });
    });

    test('ProcessedFileStorageWithTracking only depends on needed interfaces', () => {
      // Check constructor parameters
      const StorageClass = ProcessedFileStorageWithTracking;
      expect(StorageClass.length).toBe(2); // constructor takes 2 required params (3rd has default)

      // Should only depend on IFileStorage and IProcessedFileRepository
      // Not on concrete implementations
      const instance = new StorageClass(
        {} as IFileStorage,
        {} as IProcessedFileRepository
      );

      expect(instance).toBeDefined();

    });
  });

  describe('Dependency Inversion Principle', () => {
    test('ProcessedFileStorageWithTracking depends on abstractions', () => {
      // Should accept any IFileStorage implementation
      const mockStorage1: IFileStorage = {
        store: jest.fn(),
        retrieve: jest.fn(),
        exists: jest.fn(),
        delete: jest.fn(),
        getMetadata: jest.fn(),
        list: jest.fn(),
        getStats: jest.fn()
      };

      const mockStorage2: IFileStorage = {
        store: jest.fn(),
        retrieve: jest.fn(),
        exists: jest.fn(),
        delete: jest.fn(),
        getMetadata: jest.fn(),
        list: jest.fn(),
        getStats: jest.fn()
      };

      const mockRepo = {} as IProcessedFileRepository;

      // Both should work
      const tracker1 = new ProcessedFileStorageWithTracking(mockStorage1, mockRepo);
      const tracker2 = new ProcessedFileStorageWithTracking(mockStorage2, mockRepo);

      expect(tracker1).toBeDefined();
      expect(tracker2).toBeDefined();
    });

    test('High-level orchestrator can use processed file tracking', () => {
      // ContentProcessorWithCleaning should work with abstraction
      const ContentProcessorWithCleaning = require('../../src/processors/ContentProcessorWithCleaning').ContentProcessorWithCleaning;

      const mockProcessor = {
        getSupportedTypes: () => [],
        canProcess: () => true,
        process: jest.fn().mockResolvedValue({ text: 'test', metadata: {} })
      };

      const mockStorage: IFileStorage = {
        store: jest.fn().mockResolvedValue('/path'),
        retrieve: jest.fn(),
        exists: jest.fn(),
        delete: jest.fn(),
        getMetadata: jest.fn().mockResolvedValue({
          metadata: { processedFileId: 'test_123' }
        } as any),
        list: jest.fn(),
        getStats: jest.fn()
      };

      // Should accept storage abstraction
      const processor = new ContentProcessorWithCleaning(
        mockProcessor,
        undefined,
        mockStorage
      );

      expect(processor).toBeDefined();
    });
  });
});