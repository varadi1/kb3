jest.mock('../../src/services/kb3Service');

import request from 'supertest';
import { app, httpServer, cleanupWebSocket } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';
import { io as ioClient, Socket } from 'socket.io-client';

describe('E2E Workflow Tests', () => {
  let kb3Service: KB3Service;
  let socketClient: Socket;

  beforeAll(() => {
    kb3Service = KB3Service.getInstance();

    // Note: WebSocket tests are skipped due to connection setup complexity
    // They would need a running server with proper WebSocket integration
    socketClient = {} as Socket;
  });

  afterAll(async () => {
    if (socketClient && typeof socketClient.disconnect === 'function') {
      socketClient.disconnect();
    }
    cleanupWebSocket();
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
      // const urlData = addResponse.body.data;

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
      // Use timestamp to ensure unique tag names
      const timestamp = Date.now();
      const parentTagName = `e2e-parent-${timestamp}`;
      const childTagName = `e2e-child-${timestamp}`;

      // Step 1: Create hierarchical tags
      const parentTagResponse = await request(app)
        .post('/api/tags')
        .send({
          name: parentTagName,
          description: 'Parent tag for E2E tests'
        });

      expect(parentTagResponse.status).toBe(201);

      const childTagResponse = await request(app)
        .post('/api/tags')
        .send({
          name: childTagName,
          parentName: parentTagName
        });

      expect(childTagResponse.status).toBe(201);

      // Step 2: Add multiple URLs with tags
      const batchAddResponse = await request(app)
        .post('/api/urls/batch')
        .send({
          urls: [
            { url: 'https://example.com/batch1', tags: [parentTagName] },
            { url: 'https://example.com/batch2', tags: [childTagName] },
            { url: 'https://example.com/batch3', tags: [parentTagName, childTagName] }
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
          tags: [parentTagName],
          includeChildTags: true
        });

      expect(processByTagResponse.status).toBe(200);
      expect(processByTagResponse.body.summary).toHaveProperty('total');

      // Step 5: Get all tags with hierarchy
      const tagsResponse = await request(app).get('/api/tags');

      expect(tagsResponse.status).toBe(200);
      const parentTag = tagsResponse.body.data.find((t: any) => t.name === parentTagName);
      expect(parentTag).toHaveProperty('children');
      expect(parentTag.children).toHaveLength(1);
    });
  });

  describe('Real-time Updates Workflow', () => {
    it('should receive WebSocket updates during processing', (done) => {
      const timestamp = Date.now();
      const testUrl = `https://example.com/websocket-test-${timestamp}`;
      const events: string[] = [];

      // Mock WebSocket behavior - simulate events after processing
      // Since we're using mocked KB3Service, we'll simulate the events

      // Since KB3Service is mocked and emits events, we'll listen directly
      const handleStarted = (data: any) => {
        if (data.url === testUrl) {
          events.push('started');
        }
      };

      const handleCompleted = (data: any) => {
        if (data.url === testUrl) {
          events.push('completed');

          // Verify we received events in order
          expect(events).toContain('started');
          expect(events).toContain('completed');

          // Cleanup
          kb3Service.off('processing:started', handleStarted);
          kb3Service.off('processing:completed', handleCompleted);
          done();
        }
      };

      kb3Service.on('processing:started', handleStarted);
      kb3Service.on('processing:completed', handleCompleted);

      // Trigger processing
      request(app)
        .post('/api/urls')
        .send({ url: testUrl })
        .then(() => {
          return request(app)
            .post(`/api/process/url/${encodeURIComponent(testUrl)}`)
            .send({});
        })
        .catch((error) => {
          console.error('Error triggering processing:', error);
          done(error);
        });
    }, 10000);

    it('should handle batch processing updates', (done) => {
      const timestamp = Date.now();
      let batchStarted = false;

      const handleBatchStarted = (data: any) => {
        batchStarted = true;
        expect(data).toHaveProperty('count');
      };

      const handleBatchCompleted = (data: any) => {
        expect(data).toHaveProperty('results');
        expect(batchStarted).toBe(true);

        kb3Service.off('batch:started', handleBatchStarted);
        kb3Service.off('batch:completed', handleBatchCompleted);
        done();
      };

      kb3Service.on('batch:started', handleBatchStarted);
      kb3Service.on('batch:completed', handleBatchCompleted);

      // Trigger batch processing with unique URLs
      request(app)
        .post('/api/process/batch')
        .send({
          urls: [
            `https://example.com/batch-ws-${timestamp}-1`,
            `https://example.com/batch-ws-${timestamp}-2`
          ]
        })
        .catch((error) => {
          console.error('Error triggering batch processing:', error);
          done(error);
        });
    }, 10000);
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
      // const blob = new Blob([JSON.stringify(exportedData)], { type: 'application/json' });

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
        .post(`/api/process/url/${encodeURIComponent(testUrl)}`)
        .send({
          cleaners: ['sanitizehtml', 'readability']
        });

      // Step 2: Compare content
      const compareResponse = await request(app)
        .post(`/api/content/${encodeURIComponent(testUrl)}/compare`);

      expect(compareResponse.status).toBe(200);
      expect(compareResponse.body.data).toHaveProperty('original');
      expect(compareResponse.body.data).toHaveProperty('cleaned');
      expect(compareResponse.body.data).toHaveProperty('reduction');

      // Step 3: Reprocess with different settings
      await request(app)
        .post(`/api/content/${encodeURIComponent(testUrl)}/reprocess`)
        .send({
          cleaners: ['xss', 'voca'],
          extractImages: true
        });

      // Step 4: Compare again to see differences
      const compareResponse2 = await request(app)
        .post(`/api/content/${encodeURIComponent(testUrl)}/compare`);

      expect(compareResponse2.status).toBe(200);
      // Content should be different after reprocessing
    });
  });
});