jest.mock('../../src/services/kb3Service');

import request from 'supertest';
import { app, httpServer } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';

describe('API Integration Tests', () => {
  let kb3Service: KB3Service;

  beforeAll(() => {
    kb3Service = KB3Service.getInstance();
  });

  afterAll(async () => {
    httpServer.close();
    await kb3Service.cleanup();
  });

  describe('Health Check', () => {
    it('GET /health should return healthy status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'healthy');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('URL Routes', () => {
    describe('GET /api/urls', () => {
      it('should return paginated URLs', async () => {
        const response = await request(app)
          .get('/api/urls')
          .query({ limit: 10, offset: 0 });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
      });

      it('should filter URLs by status', async () => {
        const response = await request(app)
          .get('/api/urls')
          .query({ status: 'completed' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });

      it('should filter URLs by tags', async () => {
        const response = await request(app)
          .get('/api/urls')
          .query({ tags: 'documentation,api' });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/urls', () => {
      it('should add a single URL', async () => {
        const response = await request(app)
          .post('/api/urls')
          .send({
            url: 'https://example.com',
            tags: ['test']
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
      });

      it('should validate URL format', async () => {
        const response = await request(app)
          .post('/api/urls')
          .send({
            url: 'not-a-valid-url'
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });

    describe('POST /api/urls/batch', () => {
      it('should add multiple URLs', async () => {
        const response = await request(app)
          .post('/api/urls/batch')
          .send({
            urls: [
              { url: 'https://example1.com', tags: ['test'] },
              { url: 'https://example2.com', tags: ['api'] }
            ]
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveLength(2);
        expect(response.body).toHaveProperty('summary');
      });

      it('should validate batch size', async () => {
        const urls = Array(101).fill({ url: 'https://example.com' });
        const response = await request(app)
          .post('/api/urls/batch')
          .send({ urls });

        expect(response.status).toBe(400);
      });
    });

    describe('PUT /api/urls/:id', () => {
      it('should update URL metadata', async () => {
        const response = await request(app)
          .put('/api/urls/test-id')
          .send({
            metadata: { custom: 'value' },
            priority: 50
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('DELETE /api/urls/:id', () => {
      it('should delete a URL', async () => {
        const response = await request(app)
          .delete('/api/urls/test-id');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Tag Routes', () => {
    describe('GET /api/tags', () => {
      it('should return hierarchical tags', async () => {
        const response = await request(app).get('/api/tags');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('total');
      });
    });

    describe('POST /api/tags', () => {
      it('should create a new tag', async () => {
        const response = await request(app)
          .post('/api/tags')
          .send({
            name: 'new-tag',
            description: 'Test tag',
            color: '#FF0000'
          });

        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('name', 'new-tag');
      });

      it('should validate tag name', async () => {
        const response = await request(app)
          .post('/api/tags')
          .send({
            name: ''
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('errors');
      });
    });
  });

  describe('Processing Routes', () => {
    describe('POST /api/process/url/:id', () => {
      it('should process a single URL', async () => {
        const response = await request(app)
          .post('/api/process/url/test-url')
          .send({
            scraperType: 'http',
            cleaners: ['sanitizehtml']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });

    describe('POST /api/process/batch', () => {
      it('should batch process URLs', async () => {
        const response = await request(app)
          .post('/api/process/batch')
          .send({
            urls: ['https://example1.com', 'https://example2.com'],
            options: {
              scraperType: 'http'
            }
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body).toHaveProperty('summary');
      });
    });

    describe('GET /api/process/queue', () => {
      it('should return queue status', async () => {
        const response = await request(app).get('/api/process/queue');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('queue');
      });
    });
  });

  describe('Configuration Routes', () => {
    describe('GET /api/config/scrapers', () => {
      it('should return available scrapers', async () => {
        const response = await request(app).get('/api/config/scrapers');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('config');
      });
    });

    describe('GET /api/config/cleaners', () => {
      it('should return available cleaners', async () => {
        const response = await request(app).get('/api/config/cleaners');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
      });
    });

    describe('GET /api/config/templates', () => {
      it('should return configuration templates', async () => {
        const response = await request(app).get('/api/config/templates');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeInstanceOf(Array);
        expect(response.body.data[0]).toHaveProperty('id');
        expect(response.body.data[0]).toHaveProperty('name');
        expect(response.body.data[0]).toHaveProperty('scraperType');
      });
    });
  });

  describe('Content Routes', () => {
    describe('GET /api/content/:id/metadata', () => {
      it('should return content metadata', async () => {
        const response = await request(app).get('/api/content/test-id/metadata');

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data).toHaveProperty('url');
        expect(response.body.data).toHaveProperty('status');
      });
    });

    describe('POST /api/content/:id/reprocess', () => {
      it('should reprocess content', async () => {
        const response = await request(app)
          .post('/api/content/test-id/reprocess')
          .send({
            cleaners: ['voca', 'readability']
          });

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
      });
    });
  });

  describe('Export/Import Routes', () => {
    describe('POST /api/export', () => {
      it('should export data in JSON format', async () => {
        const response = await request(app)
          .post('/api/export')
          .send({
            format: 'json',
            includeContent: false
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
      });

      it('should export data in CSV format', async () => {
        const response = await request(app)
          .post('/api/export')
          .send({
            format: 'csv'
          });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
      });
    });

    describe('GET /api/export/templates', () => {
      it('should download JSON template', async () => {
        const response = await request(app)
          .get('/api/export/templates')
          .query({ format: 'json' });

        expect(response.status).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 routes', async () => {
      const response = await request(app).get('/api/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('message', 'Route not found');
    });

    it('should handle invalid JSON', async () => {
      const response = await request(app)
        .post('/api/urls')
        .set('Content-Type', 'application/json')
        .send('invalid json');

      expect(response.status).toBe(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limits', async () => {
      const requests = Array(101).fill(null).map(() =>
        request(app).get('/api/urls')
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);

      expect(rateLimited).toBe(true);
    });
  });
});