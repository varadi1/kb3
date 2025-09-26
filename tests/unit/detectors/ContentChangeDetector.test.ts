/**
 * Unit tests for ContentChangeDetector
 * Verifies content change detection logic and SOLID compliance
 */

import { ContentChangeDetector } from '../../../src/detectors/ContentChangeDetector';
import { IUrlRepository, UrlRecord, UrlStatus } from '../../../src/interfaces/IUrlRepository';

describe('ContentChangeDetector', () => {
  let detector: ContentChangeDetector;
  let mockUrlRepository: jest.Mocked<IUrlRepository>;

  beforeEach(() => {
    // Create mock URL repository
    mockUrlRepository = {
      exists: jest.fn(),
      register: jest.fn(),
      updateStatus: jest.fn(),
      getUrlInfo: jest.fn(),
      getByHash: jest.fn(),
      list: jest.fn(),
      remove: jest.fn(),
      updateHash: jest.fn()
    } as jest.Mocked<IUrlRepository>;

    detector = new ContentChangeDetector(mockUrlRepository);
  });

  describe('hasContentChanged', () => {
    test('should detect new content (never seen before)', async () => {
      const url = 'https://example.com/test';
      const currentHash = 'hash123';

      mockUrlRepository.getUrlInfo.mockResolvedValue(null);

      const result = await detector.hasContentChanged(url, currentHash);

      expect(result.hasChanged).toBe(true);
      expect(result.currentHash).toBe(currentHash);
      expect(result.previousHash).toBeUndefined();
    });

    test('should detect unchanged content', async () => {
      const url = 'https://example.com/test';
      const currentHash = 'hash123';
      const lastChecked = new Date('2024-01-01');

      const existingRecord: UrlRecord = {
        id: 'url-1',
        url,
        normalizedUrl: url,
        contentHash: currentHash, // Same hash
        status: UrlStatus.COMPLETED,
        firstSeen: new Date('2023-12-01'),
        lastChecked,
        processCount: 1
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(existingRecord);

      const result = await detector.hasContentChanged(url, currentHash);

      expect(result.hasChanged).toBe(false);
      expect(result.currentHash).toBe(currentHash);
      expect(result.previousHash).toBe(currentHash);
      expect(result.lastChecked).toEqual(lastChecked);
    });

    test('should detect changed content', async () => {
      const url = 'https://example.com/test';
      const oldHash = 'hash123';
      const newHash = 'hash456';
      const lastChecked = new Date('2024-01-01');

      const existingRecord: UrlRecord = {
        id: 'url-1',
        url,
        normalizedUrl: url,
        contentHash: oldHash,
        status: UrlStatus.COMPLETED,
        firstSeen: new Date('2023-12-01'),
        lastChecked,
        processCount: 1
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(existingRecord);

      const result = await detector.hasContentChanged(url, newHash);

      expect(result.hasChanged).toBe(true);
      expect(result.currentHash).toBe(newHash);
      expect(result.previousHash).toBe(oldHash);
      expect(result.lastChecked).toEqual(lastChecked);
    });

    test('should handle URL without content hash', async () => {
      const url = 'https://example.com/test';
      const currentHash = 'hash123';

      const existingRecord: UrlRecord = {
        id: 'url-1',
        url,
        normalizedUrl: url,
        contentHash: undefined, // No hash yet
        status: UrlStatus.PENDING,
        firstSeen: new Date('2023-12-01'),
        lastChecked: new Date('2024-01-01'),
        processCount: 0
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(existingRecord);

      const result = await detector.hasContentChanged(url, currentHash);

      expect(result.hasChanged).toBe(true);
      expect(result.currentHash).toBe(currentHash);
      expect(result.previousHash).toBeUndefined();
    });

    test('should include metadata in result', async () => {
      const url = 'https://example.com/test';
      const currentHash = 'hash123';
      const metadata = {
        etag: 'W/"123-abc"',
        lastModified: '2024-01-15',
        contentLength: 1234
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(null);

      const result = await detector.hasContentChanged(url, currentHash, metadata);

      expect(result.metadata).toEqual(metadata);
    });
  });

  describe('recordContentProcessed', () => {
    test('should update existing URL with new hash', async () => {
      const url = 'https://example.com/test';
      const contentHash = 'hash789';

      const existingRecord: UrlRecord = {
        id: 'url-1',
        url,
        normalizedUrl: url,
        contentHash: 'oldhash',
        status: UrlStatus.COMPLETED,
        firstSeen: new Date('2023-12-01'),
        lastChecked: new Date('2024-01-01'),
        processCount: 1
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(existingRecord);
      mockUrlRepository.updateHash.mockResolvedValue(true);

      await detector.recordContentProcessed(url, contentHash);

      expect(mockUrlRepository.updateHash).toHaveBeenCalledWith('url-1', contentHash);
    });

    test('should register new URL with hash', async () => {
      const url = 'https://example.com/test';
      const contentHash = 'hash789';
      const metadata = { source: 'test' };

      mockUrlRepository.getUrlInfo.mockResolvedValue(null);
      mockUrlRepository.register.mockResolvedValue('new-url-1');

      await detector.recordContentProcessed(url, contentHash, metadata);

      expect(mockUrlRepository.register).toHaveBeenCalledWith(url, {
        contentHash,
        ...metadata
      });
    });
  });

  describe('getLastKnownHash', () => {
    test('should return hash for existing URL', async () => {
      const url = 'https://example.com/test';
      const expectedHash = 'hash123';

      const existingRecord: UrlRecord = {
        id: 'url-1',
        url,
        normalizedUrl: url,
        contentHash: expectedHash,
        status: UrlStatus.COMPLETED,
        firstSeen: new Date('2023-12-01'),
        lastChecked: new Date('2024-01-01'),
        processCount: 1
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(existingRecord);

      const hash = await detector.getLastKnownHash(url);

      expect(hash).toBe(expectedHash);
    });

    test('should return null for non-existent URL', async () => {
      const url = 'https://example.com/test';

      mockUrlRepository.getUrlInfo.mockResolvedValue(null);

      const hash = await detector.getLastKnownHash(url);

      expect(hash).toBeNull();
    });

    test('should return null for URL without hash', async () => {
      const url = 'https://example.com/test';

      const existingRecord: UrlRecord = {
        id: 'url-1',
        url,
        normalizedUrl: url,
        contentHash: undefined,
        status: UrlStatus.PENDING,
        firstSeen: new Date('2023-12-01'),
        lastChecked: new Date('2024-01-01'),
        processCount: 0
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(existingRecord);

      const hash = await detector.getLastKnownHash(url);

      expect(hash).toBeNull();
    });
  });

  describe('clearHistory', () => {
    test('should remove existing URL record', async () => {
      const url = 'https://example.com/test';

      const existingRecord: UrlRecord = {
        id: 'url-1',
        url,
        normalizedUrl: url,
        contentHash: 'hash123',
        status: UrlStatus.COMPLETED,
        firstSeen: new Date('2023-12-01'),
        lastChecked: new Date('2024-01-01'),
        processCount: 1
      };

      mockUrlRepository.getUrlInfo.mockResolvedValue(existingRecord);
      mockUrlRepository.remove.mockResolvedValue(true);

      await detector.clearHistory(url);

      expect(mockUrlRepository.remove).toHaveBeenCalledWith('url-1');
    });

    test('should handle non-existent URL gracefully', async () => {
      const url = 'https://example.com/test';

      mockUrlRepository.getUrlInfo.mockResolvedValue(null);

      await detector.clearHistory(url);

      expect(mockUrlRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('SOLID Compliance', () => {
    test('follows Single Responsibility Principle', () => {
      // ContentChangeDetector has only one responsibility: detecting content changes
      const methods = Object.getOwnPropertyNames(ContentChangeDetector.prototype)
        .filter(name => name !== 'constructor');

      const expectedMethods = [
        'hasContentChanged',
        'recordContentProcessed',
        'getLastKnownHash',
        'clearHistory'
      ];

      expect(methods).toEqual(expect.arrayContaining(expectedMethods));

      // All methods relate to content change detection
      methods.forEach(method => {
        expect(method).toMatch(/content|hash|history/i);
      });
    });

    test('follows Dependency Inversion Principle', () => {
      // Depends on IUrlRepository abstraction, not concrete implementation
      expect(detector).toHaveProperty('urlRepository');

      // Works with any IUrlRepository implementation
      const alternativeMock: IUrlRepository = {
        exists: jest.fn().mockResolvedValue(false),
        register: jest.fn().mockResolvedValue('id'),
        updateStatus: jest.fn().mockResolvedValue(true),
        getUrlInfo: jest.fn().mockResolvedValue(null),
        getByHash: jest.fn().mockResolvedValue(null),
        list: jest.fn().mockResolvedValue([]),
        remove: jest.fn().mockResolvedValue(true),
        updateHash: jest.fn().mockResolvedValue(true)
      };

      const alternativeDetector = new ContentChangeDetector(alternativeMock);
      expect(alternativeDetector).toBeDefined();
    });

    test('follows Open/Closed Principle', () => {
      // Can extend behavior without modifying the class
      class ExtendedChangeDetector extends ContentChangeDetector {
        async hasContentChangedWithThreshold(
          url: string,
          currentHash: string,
          _threshold: number
        ): Promise<boolean> {
          const result = await this.hasContentChanged(url, currentHash);
          // Additional logic without modifying base class
          // Could use threshold for similarity comparison in real implementation
          return result.hasChanged;
        }
      }

      const extendedDetector = new ExtendedChangeDetector(mockUrlRepository);
      expect(extendedDetector).toBeDefined();
    });
  });
});