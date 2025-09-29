/**
 * Smoke Tests - Critical Path Verification
 *
 * These tests verify that the most critical user journeys work end-to-end.
 * They should run quickly and catch major breaking changes.
 */

jest.mock('../../src/services/kb3Service');

import request from 'supertest';
import { app, httpServer, cleanupWebSocket } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';

describe('Smoke Tests - Critical Paths', () => {
  let kb3Service: KB3Service;

  beforeAll(() => {
    kb3Service = KB3Service.getInstance();
  });

  afterAll(async () => {
    cleanupWebSocket();
    httpServer.close();
    await kb3Service.cleanup();
  });

  describe('🚨 Critical Path: System Health', () => {
    it('API server is running and healthy', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
    }, 5000); // 5 second timeout for smoke tests
  });

  describe('🚨 Critical Path: Add and Process URL', () => {
    it('Can add a URL and initiate processing', async () => {
      const testUrl = 'https://httpbin.org/html';

      // Add URL
      const addResponse = await request(app)
        .post('/api/urls')
        .send({ url: testUrl });

      expect(addResponse.status).toBe(201);
      expect(addResponse.body.success).toBe(true);

      // Process URL
      const processResponse = await request(app)
        .post(`/api/process/url/${encodeURIComponent(testUrl)}`)
        .send({});

      expect(processResponse.status).toBe(200);
      expect(processResponse.body.success).toBe(true);
    }, 10000);
  });

  describe('🚨 Critical Path: Tag Management', () => {
    it('Can create and retrieve tags', async () => {
      // Create tag
      const createResponse = await request(app)
        .post('/api/tags')
        .send({ name: 'smoke-test-tag' });

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);

      // Get all tags
      const getResponse = await request(app).get('/api/tags');

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data).toBeInstanceOf(Array);
    }, 5000);
  });

  describe('🚨 Critical Path: Configuration Access', () => {
    it('Can retrieve scrapers and cleaners configuration', async () => {
      // Get scrapers
      const scrapersResponse = await request(app).get('/api/config/scrapers');

      expect(scrapersResponse.status).toBe(200);
      expect(scrapersResponse.body.success).toBe(true);
      expect(scrapersResponse.body.data).toBeInstanceOf(Array);
      expect(scrapersResponse.body.data.length).toBeGreaterThan(0);

      // Get cleaners
      const cleanersResponse = await request(app).get('/api/config/cleaners');

      expect(cleanersResponse.status).toBe(200);
      expect(cleanersResponse.body.success).toBe(true);
      expect(cleanersResponse.body.data).toBeInstanceOf(Array);
      expect(cleanersResponse.body.data.length).toBeGreaterThan(0);
    }, 5000);
  });

  describe('🚨 Critical Path: Batch Operations', () => {
    it('Can add multiple URLs in batch', async () => {
      const response = await request(app)
        .post('/api/urls/batch')
        .send({
          urls: [
            { url: 'https://example.com/smoke1', tags: ['smoke'] },
            { url: 'https://example.com/smoke2', tags: ['smoke'] }
          ]
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
    }, 5000);
  });

  describe('🚨 Critical Path: Export Functionality', () => {
    it('Can export data in JSON format', async () => {
      const response = await request(app)
        .post('/api/export')
        .send({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    }, 5000);

    it('Can download export templates', async () => {
      const response = await request(app)
        .get('/api/export/templates')
        .query({ format: 'json' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('application/json');
    }, 5000);
  });

  describe('🚨 Critical Path: URL List and Search', () => {
    it('Can retrieve and filter URLs', async () => {
      // Get all URLs
      const allUrlsResponse = await request(app)
        .get('/api/urls');

      expect(allUrlsResponse.status).toBe(200);
      expect(allUrlsResponse.body.success).toBe(true);

      // Filter by status
      const filteredResponse = await request(app)
        .get('/api/urls')
        .query({ status: 'completed', limit: 10 });

      expect(filteredResponse.status).toBe(200);
      expect(filteredResponse.body.success).toBe(true);
      expect(filteredResponse.body).toHaveProperty('pagination');
    }, 5000);
  });

  describe('🚨 Critical Path: Processing Queue', () => {
    it('Can get processing queue status', async () => {
      const response = await request(app).get('/api/process/queue');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('queue');
    }, 5000);
  });

  describe('🚨 Critical Path: Content Metadata', () => {
    it('Can retrieve content metadata', async () => {
      const response = await request(app)
        .get('/api/content/test-id/metadata');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('url');
      expect(response.body.data).toHaveProperty('status');
    }, 5000);
  });

  describe('🚨 Critical Path: Error Handling', () => {
    it('Handles invalid routes gracefully', async () => {
      const response = await request(app).get('/api/invalid-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error.message).toBe('Route not found');
    }, 5000);

    it('Validates input data', async () => {
      const response = await request(app)
        .post('/api/urls')
        .send({ url: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    }, 5000);
  });
});

// Separate minimal smoke test suite for CI/CD
describe('Minimal Smoke Tests (CI/CD)', () => {
  it('System is alive and can perform basic operation', async () => {
    // 1. Health check
    const healthResponse = await request(app).get('/health');
    expect(healthResponse.status).toBe(200);

    // 2. Can add a URL
    const addResponse = await request(app)
      .post('/api/urls')
      .send({ url: 'https://example.com/ci-smoke-test' });
    expect(addResponse.status).toBe(201);

    // 3. Can retrieve URLs
    const getResponse = await request(app).get('/api/urls');
    expect(getResponse.status).toBe(200);

    // Total time for minimal smoke should be < 3 seconds
  }, 3000);
});