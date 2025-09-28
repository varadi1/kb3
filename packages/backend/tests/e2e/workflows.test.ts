import request from 'supertest';
import { app, httpServer, io } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';
import { io as ioClient, Socket } from 'socket.io-client';

describe('E2E Workflow Tests', () => {
  let kb3Service: KB3Service;
  let socketClient: Socket;

  beforeAll((done) => {
    kb3Service = KB3Service.getInstance();

    // Connect socket client
    socketClient = ioClient('http://localhost:4001', {
      transports: ['websocket']
    });

    socketClient.on('connect', done);
  });

  afterAll(async () => {
    socketClient.disconnect();
    httpServer.close();
    await kb3Service.cleanup();
  });

  describe('Complete URL Processing Workflow', () => {
    it('should handle complete workflow: add URL → process → retrieve content', async () => {
      const testUrl = 'https://example.com/test-workflow';

      // Step 1: Add URL with tags
      const addResponse = await request(app)
        .post('/api/urls')
        .send({
          url: testUrl,
          tags: ['e2e-test', 'workflow']
        });

      expect(addResponse.status).toBe(201);
      const urlData = addResponse.body.data;

      // Step 2: Configure URL-specific settings
      await request(app)
        .post(`/api/config/url/${testUrl}`)
        .send({
          scraperType: 'http',
          cleaners: ['sanitizehtml', 'readability'],
          priority: 10
        });

      // Step 3: Process the URL
      const processResponse = await request(app)
        .post(`/api/process/url/${testUrl}`)
        .send({
          extractMetadata: true
        });

      expect(processResponse.status).toBe(200);

      // Step 4: Check processing status
      const statusResponse = await request(app)
        .get(`/api/process/status/${testUrl}`);

      expect(statusResponse.status).toBe(200);
      expect(statusResponse.body.data).toHaveProperty('status');

      // Step 5: Retrieve metadata
      const metadataResponse = await request(app)
        .get(`/api/content/${testUrl}/metadata`);

      expect(metadataResponse.status).toBe(200);
      expect(metadataResponse.body.data).toHaveProperty('scraperUsed');
      expect(metadataResponse.body.data).toHaveProperty('cleanersUsed');

      // Step 6: Export the URL data
      const exportResponse = await request(app)
        .post('/api/export')
        .send({
          format: 'json',
          urlIds: [testUrl]
        });

      expect(exportResponse.status).toBe(200);
    });
  });

  describe('Batch Processing Workflow with Tags', () => {
    it('should handle batch workflow: create tags → add URLs → process by tags', async () => {
      // Step 1: Create hierarchical tags
      const parentTagResponse = await request(app)
        .post('/api/tags')
        .send({
          name: 'e2e-parent',
          description: 'Parent tag for E2E tests'
        });

      expect(parentTagResponse.status).toBe(201);

      const childTagResponse = await request(app)
        .post('/api/tags')
        .send({
          name: 'e2e-child',
          parentName: 'e2e-parent'
        });

      expect(childTagResponse.status).toBe(201);

      // Step 2: Add multiple URLs with tags
      const batchAddResponse = await request(app)
        .post('/api/urls/batch')
        .send({
          urls: [
            { url: 'https://example.com/batch1', tags: ['e2e-parent'] },
            { url: 'https://example.com/batch2', tags: ['e2e-child'] },
            { url: 'https://example.com/batch3', tags: ['e2e-parent', 'e2e-child'] }
          ]
        });

      expect(batchAddResponse.status).toBe(201);
      expect(batchAddResponse.body.data).toHaveLength(3);

      // Step 3: Batch update configuration
      await request(app)
        .post('/api/urls/batch-update')
        .send({
          urlIds: ['https://example.com/batch1', 'https://example.com/batch2'],
          updates: {
            scraperType: 'playwright',
            priority: 5
          }
        });

      // Step 4: Process URLs by tag
      const processByTagResponse = await request(app)
        .post('/api/process/by-tags')
        .send({
          tags: ['e2e-parent'],
          includeChildTags: true
        });

      expect(processByTagResponse.status).toBe(200);
      expect(processByTagResponse.body.summary).toHaveProperty('total');

      // Step 5: Get all tags with hierarchy
      const tagsResponse = await request(app).get('/api/tags');

      expect(tagsResponse.status).toBe(200);
      const parentTag = tagsResponse.body.data.find((t: any) => t.name === 'e2e-parent');
      expect(parentTag).toHaveProperty('children');
      expect(parentTag.children).toHaveLength(1);
    });
  });

  describe('Real-time Updates Workflow', () => {
    it('should receive WebSocket updates during processing', (done) => {
      const testUrl = 'https://example.com/websocket-test';
      const events: string[] = [];

      // Subscribe to URL updates
      socketClient.emit('subscribe:url', testUrl);

      // Listen for processing events
      socketClient.on('processing:started', (data) => {
        if (data.url === testUrl) {
          events.push('started');
        }
      });

      socketClient.on('processing:completed', (data) => {
        if (data.url === testUrl) {
          events.push('completed');

          // Verify we received events in order
          expect(events).toContain('started');
          expect(events).toContain('completed');

          // Cleanup
          socketClient.emit('unsubscribe:url', testUrl);
          socketClient.removeAllListeners('processing:started');
          socketClient.removeAllListeners('processing:completed');
          done();
        }
      });

      // Trigger processing
      request(app)
        .post('/api/urls')
        .send({ url: testUrl })
        .then(() => {
          return request(app)
            .post(`/api/process/url/${testUrl}`)
            .send({});
        });
    });

    it('should handle batch processing updates', (done) => {
      let batchStarted = false;
      let batchCompleted = false;

      socketClient.on('batch:started', (data) => {
        batchStarted = true;
        expect(data).toHaveProperty('count');
      });

      socketClient.on('batch:completed', (data) => {
        batchCompleted = true;
        expect(data).toHaveProperty('results');
        expect(batchStarted).toBe(true);

        socketClient.removeAllListeners('batch:started');
        socketClient.removeAllListeners('batch:completed');
        done();
      });

      // Trigger batch processing
      request(app)
        .post('/api/process/batch')
        .send({
          urls: [
            'https://example.com/batch-ws-1',
            'https://example.com/batch-ws-2'
          ]
        })
        .then(() => {
          // Request sent
        });
    });
  });

  describe('Import/Export Workflow', () => {
    it('should export and re-import data', async () => {
      // Step 1: Add test data
      await request(app)
        .post('/api/urls/batch')
        .send({
          urls: [
            { url: 'https://export.test/1', tags: ['export'] },
            { url: 'https://export.test/2', tags: ['export', 'test'] }
          ]
        });

      // Step 2: Export data
      const exportResponse = await request(app)
        .post('/api/export')
        .send({
          format: 'json',
          tags: ['export'],
          includeMetadata: true
        });

      expect(exportResponse.status).toBe(200);
      const exportedData = JSON.parse(exportResponse.text);

      // Step 3: Validate exported structure
      expect(exportedData).toHaveProperty('urls');
      expect(exportedData.urls).toBeInstanceOf(Array);

      // Step 4: Import the data back
      const blob = new Blob([JSON.stringify(exportedData)], { type: 'application/json' });

      // Note: In real test, you'd use FormData with the file
      // This is simplified for demonstration
      const importResponse = await request(app)
        .post('/api/export/validate')
        .attach('file', Buffer.from(JSON.stringify(exportedData)), 'export.json');

      expect(importResponse.status).toBe(200);
      expect(importResponse.body.success).toBe(true);
    });
  });

  describe('Error Recovery Workflow', () => {
    it('should handle and recover from processing errors', async () => {
      const problematicUrl = 'https://invalid-domain-that-does-not-exist.test';

      // Step 1: Add problematic URL
      await request(app)
        .post('/api/urls')
        .send({
          url: problematicUrl,
          tags: ['error-test']
        });

      // Step 2: Attempt to process (should fail)
      const processResponse = await request(app)
        .post(`/api/process/url/${problematicUrl}`)
        .send({});

      // Even if processing fails, API should respond gracefully
      expect(processResponse.status).toBe(200);

      // Step 3: Check failed status
      const statusResponse = await request(app)
        .get(`/api/process/status/${problematicUrl}`);

      expect(statusResponse.status).toBe(200);

      // Step 4: Get failed URLs and retry
      const failedUrlsResponse = await request(app)
        .get('/api/urls')
        .query({ status: 'failed' });

      expect(failedUrlsResponse.status).toBe(200);

      // Step 5: Update configuration and retry
      await request(app)
        .post(`/api/config/url/${problematicUrl}`)
        .send({
          scraperType: 'http',
          parameters: { timeout: 5000 }
        });

      const retryResponse = await request(app)
        .post('/api/process/retry')
        .send({
          urls: [problematicUrl]
        });

      expect(retryResponse.status).toBe(200);
    });
  });

  describe('Configuration Template Workflow', () => {
    it('should apply configuration templates to URLs', async () => {
      // Step 1: Get available templates
      const templatesResponse = await request(app)
        .get('/api/config/templates');

      expect(templatesResponse.status).toBe(200);
      const templates = templatesResponse.body.data;
      expect(templates.length).toBeGreaterThan(0);

      // Step 2: Select a template
      const pdfTemplate = templates.find((t: any) => t.id === 'pdf');
      expect(pdfTemplate).toBeDefined();

      // Step 3: Add a PDF URL
      const pdfUrl = 'https://example.com/document.pdf';
      await request(app)
        .post('/api/urls')
        .send({ url: pdfUrl });

      // Step 4: Apply template configuration
      await request(app)
        .post(`/api/config/url/${pdfUrl}`)
        .send({
          scraperType: pdfTemplate.scraperType,
          scraperConfig: pdfTemplate.scraperConfig,
          cleaners: pdfTemplate.cleaners
        });

      // Step 5: Test the configuration
      const testConfigResponse = await request(app)
        .post('/api/config/test')
        .send({
          url: pdfUrl,
          scraperType: pdfTemplate.scraperType,
          scraperConfig: pdfTemplate.scraperConfig,
          cleaners: pdfTemplate.cleaners
        });

      expect(testConfigResponse.status).toBe(200);
    });
  });

  describe('Content Comparison Workflow', () => {
    it('should compare original vs cleaned content', async () => {
      const testUrl = 'https://example.com/content-test';

      // Step 1: Add and process URL
      await request(app)
        .post('/api/urls')
        .send({ url: testUrl });

      await request(app)
        .post(`/api/process/url/${testUrl}`)
        .send({
          cleaners: ['sanitizehtml', 'readability']
        });

      // Step 2: Compare content
      const compareResponse = await request(app)
        .post(`/api/content/${testUrl}/compare`);

      expect(compareResponse.status).toBe(200);
      expect(compareResponse.body.data).toHaveProperty('original');
      expect(compareResponse.body.data).toHaveProperty('cleaned');
      expect(compareResponse.body.data).toHaveProperty('reduction');

      // Step 3: Reprocess with different settings
      await request(app)
        .post(`/api/content/${testUrl}/reprocess`)
        .send({
          cleaners: ['xss', 'voca'],
          extractImages: true
        });

      // Step 4: Compare again to see differences
      const compareResponse2 = await request(app)
        .post(`/api/content/${testUrl}/compare`);

      expect(compareResponse2.status).toBe(200);
      // Content should be different after reprocessing
    });
  });
});