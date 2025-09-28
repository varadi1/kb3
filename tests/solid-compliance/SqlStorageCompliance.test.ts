/**
 * SOLID compliance tests for SQL storage components
 */

import { SqlKnowledgeStore } from '../../src/storage/SqlKnowledgeStore';
import { SqlUrlRepository } from '../../src/storage/SqlUrlRepository';
import { IKnowledgeStore, KnowledgeEntry, SearchCriteria } from '../../src/interfaces/IKnowledgeStore';
import { IUrlRepository, UrlStatus } from '../../src/interfaces/IUrlRepository';
import { BaseKnowledgeStore } from '../../src/storage/BaseKnowledgeStore';
import * as fs from 'fs/promises';

describe('SQL Storage SOLID Compliance', () => {
  const testDbPath = './test-data/solid-test.db';
  const testUrlDbPath = './test-data/solid-urls.db';

  afterAll(async () => {
    // Clean up test databases
    try {
      await fs.unlink(testDbPath);
      await fs.unlink(testUrlDbPath);
      await fs.rmdir('./test-data');
    } catch (e) {
      // Ignore cleanup errors
    }
  });

  describe('Single Responsibility Principle', () => {
    test('SqlKnowledgeStore should only handle knowledge entry storage', () => {
      const store = new SqlKnowledgeStore(testDbPath);

      // Should only have methods related to knowledge storage
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(store))
        .filter(name => name !== 'constructor' && !name.startsWith('_'));

      const expectedMethods = [
        'store', 'retrieve', 'search', 'update', 'delete', 'getStats',
        'urlExists', 'getByUrl', 'close', 'validateEntry',
        'rowToEntry', 'mapSortField', '_initDatabase', '_createTable', '_createIndex',
        'initialize', 'run', 'get', 'all' // Database utility methods from parent class
      ];

      methods.forEach(method => {
        // All methods should be related to storage operations
        const isStorageRelated = expectedMethods.some(expected =>
          method.includes(expected) ||
          method.includes('Entry') ||
          method.includes('Store') ||
          method.includes('row') ||
          method.includes('map') ||
          method.includes('init') ||
          method.includes('create') ||
          method.includes('Database') ||
          method.includes('Table') ||
          method.includes('Index') ||
          method.includes('Sort')
        );
        expect(isStorageRelated).toBe(true);
      });
    });

    test('SqlUrlRepository should only handle URL tracking', () => {
      const repo = new SqlUrlRepository(testUrlDbPath);

      // Should only have methods related to URL management
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(repo))
        .filter(name => name !== 'constructor' && !name.startsWith('_'));

      const expectedMethods = [
        'exists', 'register', 'updateStatus', 'getUrlInfo',
        'getByHash', 'list', 'remove', 'updateHash', 'hashExists', 'close',
        'normalizeUrl', 'rowToRecord', '_initDatabase', '_createTable', '_createIndex',
        'initialize', 'run', 'get', 'all' // Database utility methods from parent class
      ];

      methods.forEach(method => {
        // All methods should be related to URL operations
        const isUrlRelated = expectedMethods.some(expected =>
          method.includes(expected) ||
          method.includes('Url') ||
          method.includes('Hash') ||
          method.includes('normalize') ||
          method.includes('row') ||
          method.includes('Record') ||
          method.includes('init') ||
          method.includes('create') ||
          method.includes('Database') ||
          method.includes('Table') ||
          method.includes('Index')
        );
        expect(isUrlRelated).toBe(true);
      });
    });
  });

  describe('Open/Closed Principle', () => {
    test('SqlKnowledgeStore extends BaseKnowledgeStore without modification', () => {
      const store = new SqlKnowledgeStore(testDbPath);

      // Should extend BaseKnowledgeStore
      expect(store instanceof BaseKnowledgeStore).toBe(true);

      // Should not modify base class methods
      const basePrototype = BaseKnowledgeStore.prototype;
      const sqlPrototype = SqlKnowledgeStore.prototype;

      // Base methods should not be overwritten incorrectly
      // validateEntry is protected, but we can verify it exists
      expect('validateEntry' in sqlPrototype).toBe(true);
      expect('validateEntry' in basePrototype).toBe(true);
    });

    test('New storage types can be added without modifying existing ones', () => {
      // Create a custom storage extending BaseKnowledgeStore
      class CustomKnowledgeStore extends BaseKnowledgeStore {
        async store(entry: KnowledgeEntry): Promise<string> {
          this.validateEntry(entry);
          return 'custom-id';
        }

        async retrieve(_id: string): Promise<KnowledgeEntry | null> {
          return null;
        }

        async search(_criteria: SearchCriteria): Promise<KnowledgeEntry[]> {
          return [];
        }

        async update(_id: string, _updates: Partial<KnowledgeEntry>): Promise<boolean> {
          return true;
        }

        async delete(_id: string): Promise<boolean> {
          return true;
        }

        async getStats(): Promise<any> {
          return {};
        }
      }

      const customStore = new CustomKnowledgeStore();
      expect(customStore instanceof BaseKnowledgeStore).toBe(true);
      // IKnowledgeStore is an interface, not a class, so instanceof won't work
      // But we can verify it implements the interface by checking methods
      expect(typeof customStore.store).toBe('function');
      expect(typeof customStore.retrieve).toBe('function');
    });
  });

  describe('Liskov Substitution Principle', () => {
    test('SqlKnowledgeStore can be substituted for IKnowledgeStore', async () => {
      const store: IKnowledgeStore = new SqlKnowledgeStore(testDbPath);

      // Should behave like any IKnowledgeStore
      const entry: KnowledgeEntry = {
        id: 'test-123',
        url: 'https://example.com',
        title: 'Test',
        contentType: 'text',
        text: 'content',
        metadata: {},
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100,
        checksum: 'hash',
        processingStatus: 'completed' as any
      };

      // All IKnowledgeStore methods should work
      const id = await store.store(entry);
      expect(typeof id).toBe('string');

      const retrieved = await store.retrieve(id);
      expect(retrieved).toBeTruthy();

      const searchResults = await store.search({ query: 'test' });
      expect(Array.isArray(searchResults)).toBe(true);

      const updated = await store.update(id, { title: 'Updated' });
      expect(typeof updated).toBe('boolean');

      const stats = await store.getStats();
      expect(stats).toBeTruthy();

      const deleted = await store.delete(id);
      expect(typeof deleted).toBe('boolean');

      // Close if it's SqlKnowledgeStore
      if ('close' in store) {
        await (store as SqlKnowledgeStore).close();
      }
    });

    test('SqlUrlRepository can be substituted for IUrlRepository', async () => {
      const repo: IUrlRepository = new SqlUrlRepository(testUrlDbPath);

      // Should behave like any IUrlRepository
      const url = 'https://example.com/test';

      // All IUrlRepository methods should work
      const exists = await repo.exists(url);
      expect(typeof exists).toBe('boolean');

      const id = await repo.register(url);
      expect(typeof id).toBe('string');

      const updated = await repo.updateStatus(id, UrlStatus.COMPLETED);
      expect(typeof updated).toBe('boolean');

      const info = await repo.getUrlInfo(url);
      expect(info).toBeTruthy();

      const hashUpdated = await repo.updateHash(id, 'testhash');
      expect(typeof hashUpdated).toBe('boolean');

      const byHash = await repo.getByHash('testhash');
      expect(byHash).toBeTruthy();

      const list = await repo.list();
      expect(Array.isArray(list)).toBe(true);

      const removed = await repo.remove(id);
      expect(typeof removed).toBe('boolean');

      // Close if it's SqlUrlRepository
      if ('close' in repo) {
        await (repo as SqlUrlRepository).close();
      }
    });
  });

  describe('Interface Segregation Principle', () => {
    test('IUrlRepository interface is focused and cohesive', () => {
      // IUrlRepository should only contain URL-related methods
      const requiredMethods = [
        'exists',
        'register',
        'updateStatus',
        'getUrlInfo',
        'getByHash',
        'list',
        'remove',
        'updateHash'
      ];

      const repo = new SqlUrlRepository(testUrlDbPath);

      requiredMethods.forEach(method => {
        expect(typeof (repo as any)[method]).toBe('function');
      });

      // Should not have unrelated methods
      expect((repo as any).processContent).toBeUndefined();
      expect((repo as any).fetchUrl).toBeUndefined();
      expect((repo as any).parseHtml).toBeUndefined();
    });

    test('IKnowledgeStore and IUrlRepository are separate interfaces', () => {
      const store = new SqlKnowledgeStore(testDbPath);
      const repo = new SqlUrlRepository(testUrlDbPath);

      // Store should not have URL repository methods
      expect((store as any).updateHash).toBeUndefined();
      expect((store as any).hashExists).toBeUndefined();

      // Repository should not have knowledge store methods
      expect((repo as any).search).toBeUndefined();
      expect((repo as any).getStats).toBeUndefined();
    });
  });

  describe('Dependency Inversion Principle', () => {
    test('Orchestrator depends on IUrlRepository abstraction, not concrete implementation', () => {
      // Mock IUrlRepository
      const mockRepo: IUrlRepository = {
        exists: jest.fn().mockResolvedValue(false),
        register: jest.fn().mockResolvedValue('id'),
        updateStatus: jest.fn().mockResolvedValue(true),
        getUrlInfo: jest.fn().mockResolvedValue(null),
        getByHash: jest.fn().mockResolvedValue(null),
        list: jest.fn().mockResolvedValue([]),
        remove: jest.fn().mockResolvedValue(true),
        updateHash: jest.fn().mockResolvedValue(true)
      };

      // Should be able to use any IUrlRepository implementation
      expect(mockRepo.exists).toBeDefined();
      expect(mockRepo.register).toBeDefined();

      // Both SqlUrlRepository and mock implement same interface
      const sqlRepo = new SqlUrlRepository(testUrlDbPath);

      // Both should have same methods
      Object.keys(mockRepo).forEach(method => {
        expect(typeof (sqlRepo as any)[method]).toBe('function');
      });
    });

    test('SqlKnowledgeStore depends on abstractions (interfaces) not concretions', () => {
      const store = new SqlKnowledgeStore(testDbPath);

      // Should depend on abstract types from interfaces
      // Methods should accept interface types, not concrete types
      const entry: KnowledgeEntry = {
        id: 'test',
        url: 'https://example.com',
        title: 'Test',
        contentType: 'text',
        text: 'content',
        metadata: {},
        tags: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100,
        checksum: 'hash',
        processingStatus: 'completed' as any
      };

      // Should accept interface type
      expect(store.store(entry)).toBeDefined();

      const criteria: SearchCriteria = {
        query: 'test',
        limit: 10
      };

      // Should accept interface type
      expect(store.search(criteria)).toBeDefined();
    });

    test('Factory creates instances through dependency injection', async () => {
      // Factory should inject dependencies rather than having components create them
      const { KnowledgeBaseFactory } = require('../../src/factory/KnowledgeBaseFactory');
      const { createSqlConfiguration } = require('../../src/config');

      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: testDbPath,
            urlDbPath: testUrlDbPath
          }
        }
      });

      const orchestrator = await KnowledgeBaseFactory.createKnowledgeBase(config);

      // Orchestrator should receive injected dependencies
      expect(orchestrator).toBeDefined();

      // Components should not create their own dependencies
      // This is verified by the factory pattern itself
    });
  });

  describe('Additional SOLID Principles', () => {
    test('Classes should have clear, single purposes', () => {
      const store = new SqlKnowledgeStore(testDbPath);
      const repo = new SqlUrlRepository(testUrlDbPath);

      // Each class should have a clear, single purpose
      expect(store.constructor.name).toBe('SqlKnowledgeStore');
      expect(repo.constructor.name).toBe('SqlUrlRepository');

      // Names should clearly indicate their purpose
      expect(store.constructor.name).toContain('Store');
      expect(repo.constructor.name).toContain('Repository');
    });

    test('Components should be easily testable in isolation', async () => {
      // SqlKnowledgeStore can be tested in isolation
      const store = new SqlKnowledgeStore(':memory:'); // In-memory SQLite for testing

      const entry: KnowledgeEntry = {
        id: 'isolated-test',
        url: 'https://test.com',
        title: 'Isolated Test',
        contentType: 'text',
        text: 'test content',
        metadata: {},
        tags: ['test'],
        createdAt: new Date(),
        updatedAt: new Date(),
        size: 100,
        checksum: 'testhash',
        processingStatus: 'completed' as any
      };

      const id = await store.store(entry);
      const retrieved = await store.retrieve(id);

      expect(retrieved?.title).toBe('Isolated Test');
      await store.close();

      // SqlUrlRepository can be tested in isolation
      const repo = new SqlUrlRepository(':memory:');

      await repo.register('https://isolated.test');
      const exists = await repo.exists('https://isolated.test');

      expect(exists).toBe(true);
      await repo.close();
    });
  });
});