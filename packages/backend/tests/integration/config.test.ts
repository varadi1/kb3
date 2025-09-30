import request from 'supertest';
import { app, httpServer, cleanupWebSocket } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';

jest.mock('../../src/services/kb3Service');

describe('Configuration Routes Integration Tests', () => {
  let kb3Service: jest.Mocked<KB3Service>;

  beforeAll(() => {
    kb3Service = KB3Service.getInstance() as jest.Mocked<KB3Service>;
  });

  afterAll(async () => {
    cleanupWebSocket();
    httpServer.close();
    await kb3Service.cleanup();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/config/scrapers', () => {
    it('should return available scrapers', async () => {
      // Setup mock response - mock the actual method used by the route
      kb3Service.getScraperConfigs = jest.fn().mockResolvedValue([
        { type: 'http', enabled: true, priority: 10, parameters: {} },
        { type: 'playwright', enabled: true, priority: 15, parameters: {} },
        { type: 'crawl4ai', enabled: true, priority: 20, parameters: {} },
        { type: 'docling', enabled: true, priority: 25, parameters: {} },
        { type: 'deep-doctection', enabled: true, priority: 30, parameters: {} }
      ]);

      const response = await request(app).get('/api/config/scrapers');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: [
          { type: 'http', enabled: true, priority: 10, parameters: {} },
          { type: 'playwright', enabled: true, priority: 15, parameters: {} },
          { type: 'crawl4ai', enabled: true, priority: 20, parameters: {} },
          { type: 'docling', enabled: true, priority: 25, parameters: {} },
          { type: 'deep-doctection', enabled: true, priority: 30, parameters: {} }
        ]
      });
    });

    it('should handle errors gracefully', async () => {
      kb3Service.getScraperConfigs = jest.fn().mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app).get('/api/config/scrapers');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/config/cleaners', () => {
    it('should return available cleaners', async () => {
      // Mock the actual method used by the route
      kb3Service.getCleanerConfigs = jest.fn().mockResolvedValue([
        { type: 'sanitizehtml', enabled: true, order: 0, parameters: {} },
        { type: 'xss', enabled: true, order: 1, parameters: {} },
        { type: 'voca', enabled: false, order: 2, parameters: {} },
        { type: 'remark', enabled: false, order: 3, parameters: {} },
        { type: 'readability', enabled: true, order: 4, parameters: {} }
      ]);

      const response = await request(app).get('/api/config/cleaners');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: [
          { type: 'sanitizehtml', enabled: true, order: 0, parameters: {} },
          { type: 'xss', enabled: true, order: 1, parameters: {} },
          { type: 'voca', enabled: false, order: 2, parameters: {} },
          { type: 'remark', enabled: false, order: 3, parameters: {} },
          { type: 'readability', enabled: true, order: 4, parameters: {} }
        ]
      });
    });
  });

  describe('POST /api/config/url/:id', () => {
    it('should update URL-specific configuration', async () => {
      const urlId = 'test-url-123';
      const config = {
        scraperConfig: {
          type: 'playwright',
          enabled: true,
          priority: 20,
          parameters: {
            headless: true,
            viewport: { width: 1920, height: 1080 }
          }
        },
        cleanerConfigs: [
          { type: 'sanitize-html', enabled: true, order: 1, parameters: {} },
          { type: 'readability', enabled: true, order: 2, parameters: {} }
        ]
      };

      kb3Service.setUrlParameters = jest.fn().mockResolvedValue(undefined);
      kb3Service.setUrlCleaners = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/config/url/${urlId}`)
        .send(config);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        message: 'URL configuration updated'
      });

      // Verify the service was called with correct parameters
      expect(kb3Service.setUrlParameters).toHaveBeenCalledWith(
        urlId,
        expect.objectContaining({
          scraperType: 'playwright',
          parameters: config.scraperConfig.parameters
        })
      );
    });

    it('should validate URL ID format', async () => {
      const response = await request(app)
        .post('/api/config/url/invalid..path')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle partial updates', async () => {
      const urlId = 'test-url-456';
      const config = {
        scraperConfig: {
          type: 'http',
          enabled: true,
          priority: 10,
          parameters: {}
        }
      };

      kb3Service.setUrlParameters = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/config/url/${urlId}`)
        .send(config);

      expect(response.status).toBe(200);
      expect(kb3Service.setUrlParameters).toHaveBeenCalled();
      expect(kb3Service.setUrlCleaners).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/config/templates', () => {
    it('should return configuration templates', async () => {
      const mockTemplates = [
        {
          id: 'template-1',
          name: 'PDF Processing',
          description: 'Optimized for PDF documents',
          scraperConfigs: [
            { type: 'docling', enabled: true, priority: 30, parameters: {} }
          ],
          cleanerConfigs: [
            { type: 'sanitize-html', enabled: true, order: 1, parameters: {} }
          ]
        },
        {
          id: 'template-2',
          name: 'SPA Websites',
          description: 'For JavaScript-heavy sites',
          scraperConfigs: [
            { type: 'playwright', enabled: true, priority: 20, parameters: {} }
          ],
          cleanerConfigs: [
            { type: 'readability', enabled: true, order: 1, parameters: {} }
          ]
        }
      ];

      kb3Service.getConfigTemplates = jest.fn().mockReturnValue(mockTemplates);

      const response = await request(app).get('/api/config/templates');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: mockTemplates
      });
    });
  });

  describe('POST /api/config/templates', () => {
    it('should create a new template', async () => {
      const newTemplate = {
        name: 'Custom Template',
        description: 'My custom configuration',
        scraperConfigs: [
          { type: 'http', enabled: true, priority: 10, parameters: {} }
        ],
        cleanerConfigs: [
          { type: 'voca', enabled: true, order: 1, parameters: {} }
        ]
      };

      kb3Service.saveConfigTemplate = jest.fn().mockResolvedValue({
        id: 'template-new',
        ...newTemplate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      const response = await request(app)
        .post('/api/config/templates')
        .send(newTemplate);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('name', newTemplate.name);
    });

    it('should validate template data', async () => {
      const invalidTemplate = {
        // Missing required fields
        scraperConfigs: []
      };

      const response = await request(app)
        .post('/api/config/templates')
        .send(invalidTemplate);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });
  });

  describe('POST /api/config/test', () => {
    it('should test configuration on a URL', async () => {
      const testConfig = {
        url: 'https://example.com',
        scraperConfig: {
          type: 'http',
          parameters: {}
        },
        cleaners: ['sanitize-html'],
        cleanerConfigs: {
          'sanitize-html': { parameters: {} }
        }
      };

      kb3Service.processUrl = jest.fn().mockResolvedValue({
        success: true,
        scraperResult: {
          content: 'Sample content',
          metadata: { title: 'Example' }
        },
        cleanerResults: [
          {
            type: 'sanitize-html',
            output: 'Cleaned content',
            statistics: { removed: 5, preserved: 100 }
          }
        ],
        processingTime: 250
      });

      const response = await request(app)
        .post('/api/config/test')
        .send(testConfig);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('scraperResult');
      expect(response.body.data).toHaveProperty('cleanerResults');
      expect(response.body.data).toHaveProperty('processingTime');
    });

    it('should handle test failures', async () => {
      const testConfig = {
        url: 'https://invalid-site.example',
        scraperConfig: { type: 'http', parameters: {} }
      };

      kb3Service.processUrl = jest.fn().mockRejectedValue(
        new Error('Failed to fetch URL')
      );

      const response = await request(app)
        .post('/api/config/test')
        .send(testConfig);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing service methods gracefully', async () => {
      // Simulate missing method
      delete kb3Service.getAvailableScrapers;

      const response = await request(app).get('/api/config/scrapers');

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle concurrent configuration updates', async () => {
      const urlId = 'concurrent-test';
      const config1 = {
        scraperConfig: { type: 'http', enabled: true, priority: 10, parameters: {} }
      };
      const config2 = {
        scraperConfig: { type: 'playwright', enabled: true, priority: 20, parameters: {} }
      };

      kb3Service.setUrlParameters = jest.fn()
        .mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      // Send concurrent requests
      const [response1, response2] = await Promise.all([
        request(app).post(`/api/config/url/${urlId}`).send(config1),
        request(app).post(`/api/config/url/${urlId}`).send(config2)
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(kb3Service.setUrlParameters).toHaveBeenCalledTimes(2);
    });
  });
});