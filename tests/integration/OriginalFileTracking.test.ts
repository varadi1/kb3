/**
 * Integration tests for original file tracking functionality
 * Tests that original files are properly tracked in the database
 */

import { KnowledgeBaseFactoryWithFileTracking } from '../../src/factory/KnowledgeBaseFactoryWithFileTracking';
import { createSqlConfiguration } from '../../src/config/Configuration';
import { FileStatus } from '../../src/interfaces/IOriginalFileRepository';
import * as path from 'path';
import * as fs from 'fs/promises';

describe('Original File Tracking', () => {
  const testDir = path.join(process.cwd(), 'test-data', 'file-tracking-test');
  const testFileDir = path.join(testDir, 'test-files');
  // Use unique content with timestamp to avoid duplicate detection issues
  const timestamp = Date.now();
  const testContent = `<html><body><h1>Test Document ${timestamp}</h1><p>This is unique test content for file tracking test run at ${timestamp}.</p></body></html>`;

  beforeEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Directory might not exist, that's okay
    }
    await fs.mkdir(testDir, { recursive: true });
    await fs.mkdir(testFileDir, { recursive: true });

    // Also ensure the data directory is clean
    const dataDir = path.join(testDir, 'files');
    await fs.mkdir(dataDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('File Recording', () => {
    it('should track original files when processing local files', async () => {
      // Create a test HTML file
      const testFile = path.join(testFileDir, 'test.html');
      await fs.writeFile(testFile, testContent);

      // Create configuration with test paths
      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: path.join(testDir, 'knowledge.db')
          },
          urlRepositoryPath: path.join(testDir, 'urls.db'),
          fileStorage: {
            basePath: path.join(testDir, 'files')
          },
          fileStore: {
            path: path.join(testDir, 'files')
          },
          originalFileStore: {
            type: 'sql',
            path: path.join(testDir, 'original_files.db')
          },
          enableDuplicateDetection: false
        }
      });

      // Create knowledge base with file tracking
      const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);
      expect(kb.getOriginalFileRepository()).toBeDefined();

      // Process the local file URL
      const fileUrl = `file://${testFile}`;
      const result = await kb.processUrl(fileUrl);
      expect(result.success).toBe(true);

      // Wait a moment for tracking to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      // Verify file was tracked in the repository
      const trackedFiles = await kb.getOriginalFileRepository().getOriginalFilesByUrl(fileUrl);
      expect(trackedFiles.length).toBeGreaterThan(0);
      const fileRecord = trackedFiles[0];

      expect(fileRecord).toBeDefined();
      expect(fileRecord?.url).toBe(fileUrl);
      expect(fileRecord?.mimeType).toBe('text/html');
      expect(fileRecord?.status).toBe(FileStatus.ACTIVE);
      expect(fileRecord?.downloadUrl).toContain('/api/files/original/');
      expect(fileRecord?.filePath).toBeDefined();
    });

    it('should retrieve original files by URL with multiple files', async () => {
      // Create test files with unique content
      const ts = Date.now();
      const files = [
        { name: 'doc1.html', content: `<html>Unique Content 1 - ${ts}</html>` },
        { name: 'doc2.html', content: `<html>Unique Content 2 - ${ts}</html>` },
        { name: 'doc3.txt', content: `Text content - ${ts}` }
      ];

      for (const file of files) {
        await fs.writeFile(path.join(testFileDir, file.name), file.content);
      }

      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: path.join(testDir, 'knowledge.db')
          },
          urlRepositoryPath: path.join(testDir, 'urls.db'),
          fileStorage: {
            basePath: path.join(testDir, 'files')
          },
          fileStore: {
            path: path.join(testDir, 'files')
          },
          originalFileStore: {
            type: 'sql',
            path: path.join(testDir, 'original_files.db')
          }
        }
      });

      const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);

      // Process all files
      const urls = files.map(f => `file://${path.join(testFileDir, f.name)}`);
      for (const url of urls) {
        await kb.processUrl(url);
      }

      // Wait for tracking
      await new Promise(resolve => setTimeout(resolve, 100));

      // Test retrieving files by URL
      const doc1Files = await kb.getOriginalFileRepository().getOriginalFilesByUrl(urls[0]);
      expect(doc1Files).toHaveLength(1);
      expect(doc1Files[0].url).toBe(urls[0]);
      expect(doc1Files[0].mimeType).toBe('text/html');

      const doc3Files = await kb.getOriginalFileRepository().getOriginalFilesByUrl(urls[2]);
      expect(doc3Files).toHaveLength(1);
      expect(doc3Files[0].mimeType).toBe('text/plain');
    });

    it('should list all original files with filtering', async () => {
      // Create test files with different types and unique content
      const ts = Date.now();
      const files = [
        { name: 'test1.html', content: `<html>Test 1 - ${ts}</html>` },
        { name: 'test2.txt', content: `Test 2 - ${ts}` },
        { name: 'test3.html', content: `<html>Test 3 - ${ts}</html>` }
      ];

      for (const file of files) {
        await fs.writeFile(path.join(testFileDir, file.name), file.content);
      }

      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: path.join(testDir, 'knowledge.db')
          },
          urlRepositoryPath: path.join(testDir, 'urls.db'),
          fileStorage: {
            basePath: path.join(testDir, 'files')
          },
          fileStore: {
            path: path.join(testDir, 'files')
          },
          originalFileStore: {
            type: 'sql',
            path: path.join(testDir, 'original_files.db')
          }
        }
      });

      const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);

      // Process all files
      for (const file of files) {
        const url = `file://${path.join(testFileDir, file.name)}`;
        await kb.processUrl(url);
      }

      // Wait for tracking
      await new Promise(resolve => setTimeout(resolve, 100));

      // List all files
      const allFiles = await kb.getOriginalFileRepository().listOriginalFiles();
      expect(allFiles).toHaveLength(3);

      // Filter by MIME type
      const htmlFiles = await kb.getOriginalFileRepository().listOriginalFiles({
        mimeType: 'text/html'
      });
      expect(htmlFiles).toHaveLength(2);

      const textFiles = await kb.getOriginalFileRepository().listOriginalFiles({
        mimeType: 'text/plain'
      });
      expect(textFiles).toHaveLength(1);
    });

    it('should track file statistics', async () => {
      // Create test files with known sizes and unique patterns
      const ts = Date.now();
      const prefix = `${ts}-`;
      const files = [
        { name: 'file1.html', content: prefix + 'a'.repeat(1000 - prefix.length) },  // exactly 1000 bytes
        { name: 'file2.txt', content: prefix + 'b'.repeat(5000 - prefix.length) },   // exactly 5000 bytes
        { name: 'file3.html', content: prefix + 'c'.repeat(2000 - prefix.length) }   // exactly 2000 bytes
      ];

      for (const file of files) {
        await fs.writeFile(path.join(testFileDir, file.name), file.content);
      }

      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: path.join(testDir, 'knowledge.db')
          },
          urlRepositoryPath: path.join(testDir, 'urls.db'),
          fileStorage: {
            basePath: path.join(testDir, 'files')
          },
          fileStore: {
            path: path.join(testDir, 'files')
          },
          originalFileStore: {
            type: 'sql',
            path: path.join(testDir, 'original_files.db')
          }
        }
      });

      const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);

      // Process all files
      for (const file of files) {
        const url = `file://${path.join(testFileDir, file.name)}`;
        await kb.processUrl(url);
      }

      // Wait for tracking
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get statistics
      const stats = await kb.getOriginalFileRepository().getStatistics();

      expect(stats.totalFiles).toBe(3);
      expect(stats.totalSize).toBe(8000);
      expect(stats.averageFileSize).toBeCloseTo(2666.67, 1);
      expect(stats.filesByMimeType['text/html']).toBe(2);
      expect(stats.filesByMimeType['text/plain']).toBe(1);
      expect(stats.filesByStatus[FileStatus.ACTIVE]).toBe(3);
    });

    it('should update file status', async () => {
      // Create a test file with unique content
      const testFile = path.join(testFileDir, 'status-test.html');
      const uniqueContent = `<html><body><h1>Status Test ${Date.now()}</h1><p>Testing file status update at ${Date.now()}</p></body></html>`;
      await fs.writeFile(testFile, uniqueContent);

      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: path.join(testDir, 'knowledge.db')
          },
          urlRepositoryPath: path.join(testDir, 'urls.db'),
          fileStorage: {
            basePath: path.join(testDir, 'files')
          },
          fileStore: {
            path: path.join(testDir, 'files')
          },
          originalFileStore: {
            type: 'sql',
            path: path.join(testDir, 'original_files.db')
          }
        }
      });

      const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);

      // Process the file
      const fileUrl = `file://${testFile}`;
      const result = await kb.processUrl(fileUrl);
      expect(result.success).toBe(true);

      // Wait for tracking
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the file that was tracked
      const trackedFiles = await kb.getOriginalFileRepository().getOriginalFilesByUrl(fileUrl);
      expect(trackedFiles.length).toBeGreaterThan(0);
      const originalFileId = trackedFiles[0].id;

      // Verify initial status
      let fileRecord = await kb.getOriginalFileRepository().getOriginalFile(originalFileId);
      expect(fileRecord?.status).toBe(FileStatus.ACTIVE);

      // Update status to archived
      const updated = await kb.getOriginalFileRepository().updateFileStatus(
        originalFileId,
        FileStatus.ARCHIVED
      );
      expect(updated).toBe(true);

      // Verify status was updated
      fileRecord = await kb.getOriginalFileRepository().getOriginalFile(originalFileId);
      expect(fileRecord?.status).toBe(FileStatus.ARCHIVED);
    });

    it('should track accessed_at timestamp', async () => {
      // Create a test file with unique content
      const testFile = path.join(testFileDir, 'access-test.html');
      const uniqueContent = `<html><body><h1>Access Test ${Date.now()}</h1><p>Testing accessed_at timestamp at ${Date.now()}</p></body></html>`;
      await fs.writeFile(testFile, uniqueContent);

      const config = createSqlConfiguration({
        storage: {
          knowledgeStore: {
            type: 'sql',
            dbPath: path.join(testDir, 'knowledge.db')
          },
          urlRepositoryPath: path.join(testDir, 'urls.db'),
          fileStorage: {
            basePath: path.join(testDir, 'files')
          },
          fileStore: {
            path: path.join(testDir, 'files')
          },
          originalFileStore: {
            type: 'sql',
            path: path.join(testDir, 'original_files.db')
          }
        }
      });

      const kb = await KnowledgeBaseFactoryWithFileTracking.createKnowledgeBaseWithFileTracking(config);

      // Process the file
      const fileUrl = `file://${testFile}`;
      const result = await kb.processUrl(fileUrl);
      expect(result.success).toBe(true);

      // Wait for tracking
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the file that was tracked
      const trackedFiles = await kb.getOriginalFileRepository().getOriginalFilesByUrl(fileUrl);
      expect(trackedFiles.length).toBeGreaterThan(0);
      const originalFileId = trackedFiles[0].id;

      // Wait a bit to ensure time difference
      await new Promise(resolve => setTimeout(resolve, 10));

      // Access the file (this should update accessed_at)
      const fileRecord = await kb.getOriginalFileRepository().getOriginalFile(originalFileId);

      expect(fileRecord?.accessedAt).toBeDefined();
      expect(fileRecord?.accessedAt).toBeInstanceOf(Date);
      expect(fileRecord?.accessedAt?.getTime()).toBeGreaterThan(fileRecord?.createdAt.getTime() || 0);
    });
  });
});