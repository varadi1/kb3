import request from 'supertest';
import { app, httpServer, cleanupWebSocket } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';

jest.mock('../../src/services/kb3Service');

describe('Export/Import and Content Routes Integration Tests', () => {
  let kb3Service: jest.Mocked<KB3Service>;
  let originalAddUrl: any;
  let originalUpdateUrl: any;
  let originalExportData: any;
  let originalImportData: any;

  beforeAll(() => {
    kb3Service = KB3Service.getInstance() as jest.Mocked<KB3Service>;
    // Store original implementations
    originalAddUrl = kb3Service.addUrl;
    originalUpdateUrl = kb3Service.updateUrl;
    originalExportData = kb3Service.exportData;
    originalImportData = kb3Service.importData;
  });

  afterAll(async () => {
    cleanupWebSocket();
    httpServer.close();
    await kb3Service.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
    // Restore original implementations
    kb3Service.addUrl = originalAddUrl;
    kb3Service.updateUrl = originalUpdateUrl;
    kb3Service.exportData = originalExportData;
    kb3Service.importData = originalImportData;
  });

  describe('POST /api/export', () => {
    const mockUrls = [
      {
        id: 'url1',
        url: 'https://example1.com',
        tags: ['docs', 'api'],
        status: 'completed',
        authority: 3,
        metadata: { title: 'Example 1' },
        processedAt: '2024-01-01T00:00:00Z'
      },
      {
        id: 'url2',
        url: 'https://example2.com',
        tags: ['tutorial'],
        status: 'pending',
        authority: 1,
        metadata: {},
        processedAt: null
      }
    ];

    it('should export data in JSON format', async () => {
      jest.spyOn(kb3Service, 'exportData').mockResolvedValue(mockUrls);

      const response = await request(app)
        .post('/api/export')
        .send({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('content');
      expect(response.body.data).toHaveProperty('count', 2);

      // Verify JSON structure
      const content = JSON.parse(response.body.data.content);
      expect(content).toHaveLength(2);
      expect(content[0]).toHaveProperty('url', 'https://example1.com');
      expect(content[0]).toHaveProperty('authority', 3);
    });

    it('should export data in CSV format', async () => {
      jest.spyOn(kb3Service, 'exportData').mockResolvedValue(mockUrls);

      const response = await request(app)
        .post('/api/export')
        .send({ format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toContain('url,tags,status,authority');
      expect(response.body.data.content).toContain('https://example1.com');
      expect(response.body.data.content).toContain('"docs,api"'); // CSV escaped
    });

    it('should export data in plain text format', async () => {
      jest.spyOn(kb3Service, 'exportData').mockResolvedValue(mockUrls);

      const response = await request(app)
        .post('/api/export')
        .send({ format: 'txt' });

      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe(
        'https://example1.com\nhttps://example2.com'
      );
    });

    it('should export only selected URLs', async () => {
      kb3Service.exportData = jest.fn().mockResolvedValue([mockUrls[0]]);

      const response = await request(app)
        .post('/api/export')
        .send({
          format: 'json',
          urlIds: ['url1']
        });

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(1);

      const content = JSON.parse(response.body.data.content);
      expect(content).toHaveLength(1);
      expect(content[0].id).toBe('url1');
    });

    it('should include authority in all export formats', async () => {
      kb3Service.exportData = jest.fn().mockResolvedValue([
        {
          ...mockUrls[0],
          authority: 5 // High authority
        }
      ]);

      // Test JSON
      let response = await request(app)
        .post('/api/export')
        .send({ format: 'json' });

      let content = JSON.parse(response.body.data.content);
      expect(content[0].authority).toBe(5);

      // Test CSV
      response = await request(app)
        .post('/api/export')
        .send({ format: 'csv' });

      expect(response.body.data.content).toContain(',5'); // Authority column
    });

    it('should handle empty export', async () => {
      kb3Service.exportData = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .post('/api/export')
        .send({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(0);
      expect(JSON.parse(response.body.data.content)).toEqual([]);
    });

    it('should validate export format', async () => {
      const response = await request(app)
        .post('/api/export')
        .send({ format: 'xml' }); // Invalid format

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/export/import', () => {
    it('should import URLs from JSON', async () => {
      const importData = JSON.stringify([
        {
          url: 'https://new1.com',
          tags: ['imported', 'test'],
          authority: 2,
          metadata: { source: 'import' }
        },
        {
          url: 'https://new2.com',
          tags: [],
          authority: 0
        }
      ]);

      kb3Service.importData = jest.fn().mockResolvedValue({
        total: 2,
        successful: 2,
        failed: 0,
        errors: []
      });
      kb3Service.addUrl = jest.fn().mockResolvedValue({ success: true, id: 'new-id' });

      const response = await request(app)
        .post('/api/export/import')
        .send({
          content: importData,
          format: 'json'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          total: 2,
          successful: 2,
          failed: 0,
          errors: []
        }
      });

      // Verify importData was called
      expect(kb3Service.importData).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ url: 'https://new1.com' }),
          expect.objectContaining({ url: 'https://new2.com' })
        ]),
        'json'
      );
    });

    it('should import URLs from CSV', async () => {
      const csvContent = `url,tags,authority,notes
https://csv1.com,"tag1,tag2",3,"Important document"
https://csv2.com,"",1,""
https://csv3.com,"single",0,"Another note"`;

      kb3Service.importData = jest.fn().mockResolvedValue({
        total: 3,
        successful: 3,
        failed: 0,
        errors: []
      });

      const response = await request(app)
        .post('/api/export/import')
        .send({
          content: csvContent,
          format: 'csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.successful).toBe(3);

      // Verify importData was called
      expect(kb3Service.importData).toHaveBeenCalled();
    });

    it('should import URLs from plain text', async () => {
      const txtContent = `https://txt1.com
https://txt2.com
# This is a comment
https://txt3.com

https://txt4.com`;

      kb3Service.importData = jest.fn().mockResolvedValue({
        total: 4,
        successful: 4,
        failed: 0,
        errors: []
      });

      const response = await request(app)
        .post('/api/export/import')
        .send({
          content: txtContent,
          format: 'txt'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(4); // Comments and empty lines ignored
      expect(kb3Service.importData).toHaveBeenCalled();
    });

    it('should handle import with authority preservation', async () => {
      const importData = JSON.stringify([
        { url: 'https://high-priority.com', authority: 5 },
        { url: 'https://low-priority.com', authority: 1 }
      ]);

      jest.spyOn(kb3Service, 'addUrl').mockResolvedValue({ id: 'imported' });
      jest.spyOn(kb3Service, 'updateUrl').mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/export/import')
        .send({
          content: importData,
          format: 'json',
          preserveAuthority: true
        });

      expect(response.status).toBe(200);

      // URLs should be added then authority updated
      expect(kb3Service.addUrl).toHaveBeenCalledTimes(2);
      // Authority should be set after import
      expect(kb3Service.updateUrl).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ authority: 5 })
      );
    });

    it('should validate imported URLs', async () => {
      const invalidData = JSON.stringify([
        { url: 'not-a-url' },
        { url: 'https://valid.com' },
        { url: '' }
      ]);

      jest.spyOn(kb3Service, 'addUrl')
        .mockRejectedValueOnce(new Error('Invalid URL'))  // for 'not-a-url'
        .mockResolvedValueOnce({ id: 'valid-id' })        // for 'https://valid.com'
        .mockRejectedValueOnce(new Error('Invalid URL')); // for ''

      const response = await request(app)
        .post('/api/export/import')
        .send({
          content: invalidData,
          format: 'json'
        });

      expect(response.status).toBe(207); // Multi-status
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.successful).toBe(1);
      expect(response.body.data.failed).toBe(2);
      expect(response.body.data.errors).toHaveLength(2);
    });

    it('should handle duplicate URLs', async () => {
      const duplicateData = JSON.stringify([
        { url: 'https://existing.com' },
        { url: 'https://existing.com' }
      ]);

      jest.spyOn(kb3Service, 'addUrl')
        .mockResolvedValueOnce({ id: 'first' })
        .mockRejectedValueOnce(new Error('URL already exists'));

      const response = await request(app)
        .post('/api/export/import')
        .send({
          content: duplicateData,
          format: 'json',
          skipDuplicates: true
        });

      expect(response.status).toBe(207); // Status 207 when there are failures
      expect(response.body.data.successful).toBe(1);
      expect(response.body.data.failed).toBe(1);
    });
  });

  describe('POST /api/export/validate', () => {
    it('should validate JSON format', async () => {
      const validJson = JSON.stringify([
        { url: 'https://valid.com', tags: [] }
      ]);

      const response = await request(app)
        .post('/api/export/validate')
        .send({
          content: validJson,
          format: 'json'
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          valid: true,
          errors: [],
          warnings: [],
          stats: {
            totalUrls: 1,
            validUrls: 1,
            invalidUrls: 0
          }
        }
      });
    });

    it('should detect invalid JSON', async () => {
      const invalidJson = '{ invalid json [}';

      const response = await request(app)
        .post('/api/export/validate')
        .send({
          content: invalidJson,
          format: 'json'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors).toContain('Invalid JSON format');
    });

    it('should validate CSV headers', async () => {
      const csvWithWrongHeaders = `wrongheader,anotherwrong
https://example.com,value`;

      const response = await request(app)
        .post('/api/export/validate')
        .send({
          content: csvWithWrongHeaders,
          format: 'csv'
        });

      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(false);
      expect(response.body.data.errors[0]).toContain('Missing required header');
    });
  });

  describe('Content Routes', () => {
    describe('GET /api/content/:id/original', () => {
      it('should return original content', async () => {
        const mockContent = 'Original HTML content with <script>alert("xss")</script>';

        kb3Service.getOriginalContent = jest.fn().mockResolvedValue({
          content: Buffer.from(mockContent),
          mimeType: 'text/html',
          size: mockContent.length
        });

        const response = await request(app)
          .get('/api/content/test-url-123/original');

        expect(response.status).toBe(200);
        expect(response.text).toBe(mockContent);
        expect(response.headers['content-type']).toContain('text/html');
      });

      it('should handle missing content', async () => {
        kb3Service.getOriginalContent = jest.fn().mockResolvedValue(null);

        const response = await request(app)
          .get('/api/content/non-existent/original');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('message', 'Original content not found');
      });
    });

    describe('GET /api/content/:id/cleaned', () => {
      it('should return cleaned content', async () => {
        const mockCleaned = 'Sanitized and cleaned text content';

        kb3Service.getCleanedContent = jest.fn().mockResolvedValue({
          content: mockCleaned,
          cleaners: ['sanitize-html', 'readability'],
          cleanedAt: new Date().toISOString()
        });

        const response = await request(app)
          .get('/api/content/test-url-123/cleaned');

        expect(response.status).toBe(200);
        expect(response.text).toBe(mockCleaned);
      });
    });

    describe('GET /api/content/:id/metadata', () => {
      it('should return processing metadata', async () => {
        const mockMetadata = {
          scraperUsed: 'playwright',
          cleanersUsed: ['sanitize-html', 'xss'],
          processingTime: 1250,
          statistics: {
            originalSize: 50000,
            cleanedSize: 15000,
            reduction: 70
          },
          authority: 3,
          processedAt: '2024-01-01T12:00:00Z'
        };

        kb3Service.getContentMetadata = jest.fn().mockResolvedValue(mockMetadata);

        const response = await request(app)
          .get('/api/content/test-url-123/metadata');

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
          success: true,
          data: mockMetadata
        });
        expect(response.body.data).toHaveProperty('authority', 3);
      });
    });

    describe('POST /api/content/:id/reprocess', () => {
      it('should reprocess content with new settings', async () => {
        const reprocessOptions = {
          scraperType: 'crawl4ai',
          cleaners: ['readability', 'voca'],
          extractMetadata: true
        };

        kb3Service.reprocessUrl = jest.fn().mockResolvedValue({
          success: true,
          content: 'Reprocessed content',
          metadata: { updated: true }
        });

        const response = await request(app)
          .post('/api/content/test-url-123/reprocess')
          .send(reprocessOptions);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(kb3Service.reprocessUrl).toHaveBeenCalledWith(
          'test-url-123',
          reprocessOptions
        );
      });
    });

    describe('GET /api/content/:id/download', () => {
      it('should download content as file', async () => {
        const mockContent = 'Downloadable content';

        kb3Service.getCleanedContent = jest.fn().mockResolvedValue({
          content: mockContent
        });

        const response = await request(app)
          .get('/api/content/test-url-123/download')
          .query({ type: 'cleaned' });

        expect(response.status).toBe(200);
        expect(response.headers['content-disposition']).toContain('attachment');
        expect(response.headers['content-disposition']).toContain('test-url-123');
        expect(response.text).toBe(mockContent);
      });

      it('should download original content when specified', async () => {
        const mockOriginal = '<html><body>Original HTML</body></html>';

        kb3Service.getOriginalContent = jest.fn().mockResolvedValue({
          content: Buffer.from(mockOriginal)
        });

        const response = await request(app)
          .get('/api/content/test-url-123/download')
          .query({ type: 'original' });

        expect(response.status).toBe(200);
        expect(response.text).toBe(mockOriginal);
      });
    });

    describe('POST /api/content/:id/compare', () => {
      it('should compare original and cleaned content', async () => {
        kb3Service.getOriginalContent = jest.fn().mockResolvedValue({
          content: Buffer.from('<html>Original with <script>bad</script></html>')
        });

        kb3Service.getCleanedContent = jest.fn().mockResolvedValue({
          content: 'Original with'
        });

        const response = await request(app)
          .post('/api/content/test-url-123/compare')
          .send({});

        expect(response.status).toBe(200);
        expect(response.body.data).toHaveProperty('original');
        expect(response.body.data).toHaveProperty('cleaned');
        expect(response.body.data).toHaveProperty('statistics');
        expect(response.body.data.statistics).toHaveProperty('reduction');
      });
    });
  });

  describe('GET /api/export/templates', () => {
    it('should provide export format templates', async () => {
      const response = await request(app)
        .get('/api/export/templates');

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('json');
      expect(response.body.data).toHaveProperty('csv');
      expect(response.body.data).toHaveProperty('txt');

      // Templates should show authority field
      expect(response.body.data.json).toContain('authority');
      expect(response.body.data.csv).toContain('authority');
    });
  });

  describe('Large Data Handling', () => {
    it('should handle large exports efficiently', async () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: `url${i}`,
        url: `https://example${i}.com`,
        tags: [`tag${i % 10}`],
        authority: i % 6,
        status: 'completed'
      }));

      kb3Service.exportData = jest.fn().mockResolvedValue(largeDataset);

      const response = await request(app)
        .post('/api/export')
        .send({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(10000);
    });

    it('should handle large imports in chunks', async () => {
      const largeImport = Array.from({ length: 1000 }, (_, i) => ({
        url: `https://import${i}.com`,
        tags: [],
        authority: 0
      }));

      jest.spyOn(kb3Service, 'addUrl').mockResolvedValue({ id: 'imported' });

      const response = await request(app)
        .post('/api/export/import')
        .send({
          content: JSON.stringify(largeImport),
          format: 'json',
          chunkSize: 100
        });

      expect(response.status).toBe(200);
      expect(response.body.data.total).toBe(1000);
      // Should be called for each URL
      expect(kb3Service.addUrl).toHaveBeenCalledTimes(1000);
    });
  });
});