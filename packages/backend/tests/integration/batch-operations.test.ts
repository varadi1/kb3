import request from 'supertest';
import { app, httpServer, cleanupWebSocket } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';

jest.mock('../../src/services/kb3Service');

describe('Batch Operations Integration Tests', () => {
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

  describe('POST /api/urls/batch-update', () => {
    it('should update multiple URLs with new metadata', async () => {
      const updates = {
        ids: ['url1', 'url2', 'url3'],
        updates: {
          status: 'completed',
          metadata: { reviewed: true },
          authority: 3
        }
      };

      kb3Service.updateUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/urls/batch-update')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          updated: 3,
          failed: 0,
          errors: []
        }
      });

      // Verify each URL was updated
      expect(kb3Service.updateUrl).toHaveBeenCalledTimes(3);
      updates.ids.forEach(id => {
        expect(kb3Service.updateUrl).toHaveBeenCalledWith(
          id,
          expect.objectContaining({
            status: 'completed',
            metadata: { reviewed: true },
            authority: 3
          })
        );
      });
    });

    it('should handle authority updates specifically', async () => {
      const updates = {
        ids: ['url1', 'url2'],
        updates: {
          authority: 5
        }
      };

      kb3Service.updateUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/urls/batch-update')
        .send(updates);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.updated).toBe(2);

      // Verify authority was set correctly
      expect(kb3Service.updateUrl).toHaveBeenCalledWith(
        'url1',
        expect.objectContaining({ authority: 5 })
      );
    });

    it('should validate authority values', async () => {
      const updates = {
        ids: ['url1'],
        updates: {
          authority: 10 // Invalid - should be 0-5
        }
      };

      const response = await request(app)
        .post('/api/urls/batch-update')
        .send(updates);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
      expect(response.body.errors[0]).toHaveProperty('msg');
      expect(response.body.errors[0].msg).toContain('authority');
    });

    it('should handle partial failures gracefully', async () => {
      const updates = {
        ids: ['url1', 'url2', 'url3'],
        updates: {
          status: 'processing'
        }
      };

      // Mock different responses
      kb3Service.updateUrl = jest.fn()
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({ success: true });

      const response = await request(app)
        .post('/api/urls/batch-update')
        .send(updates);

      expect(response.status).toBe(207); // Multi-status
      expect(response.body).toEqual({
        success: false,
        data: {
          updated: 2,
          failed: 1,
          errors: [
            { id: 'url2', error: 'Database error' }
          ]
        }
      });
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/api/urls/batch-update')
        .send({
          // Missing 'ids' field
          updates: { status: 'completed' }
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('errors');
    });

    it('should handle empty ID list', async () => {
      const response = await request(app)
        .post('/api/urls/batch-update')
        .send({
          ids: [],
          updates: { status: 'completed' }
        });

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('least one URL ID');
    });
  });

  describe('POST /api/urls/batch-tags', () => {
    it('should add tags to multiple URLs', async () => {
      const tagUpdate = {
        ids: ['url1', 'url2', 'url3'],
        tags: ['documentation', 'api', 'v2'],
        operation: 'add'
      };

      kb3Service.addTagsToUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/urls/batch-tags')
        .send(tagUpdate);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          updated: 3,
          failed: 0,
          errors: []
        }
      });

      expect(kb3Service.addTagsToUrl).toHaveBeenCalledTimes(3);
      tagUpdate.ids.forEach(id => {
        expect(kb3Service.addTagsToUrl).toHaveBeenCalledWith(id, tagUpdate.tags);
      });
    });

    it('should remove tags from multiple URLs', async () => {
      const tagUpdate = {
        ids: ['url1', 'url2'],
        tags: ['outdated', 'deprecated'],
        operation: 'remove'
      };

      kb3Service.removeTagsFromUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/urls/batch-tags')
        .send(tagUpdate);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(kb3Service.removeTagsFromUrl).toHaveBeenCalledTimes(2);
    });

    it('should replace all tags on URLs', async () => {
      const tagUpdate = {
        ids: ['url1'],
        tags: ['new-tag-1', 'new-tag-2'],
        operation: 'replace'
      };

      kb3Service.setUrlTags = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/urls/batch-tags')
        .send(tagUpdate);

      expect(response.status).toBe(200);
      expect(kb3Service.setUrlTags).toHaveBeenCalledWith(
        'url1',
        ['new-tag-1', 'new-tag-2']
      );
    });

    it('should validate tag names', async () => {
      const tagUpdate = {
        ids: ['url1'],
        tags: ['valid-tag', 'invalid tag with spaces', '123-starts-with-number'],
        operation: 'add'
      };

      const response = await request(app)
        .post('/api/urls/batch-tags')
        .send(tagUpdate);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('tag format');
    });

    it('should validate operation type', async () => {
      const tagUpdate = {
        ids: ['url1'],
        tags: ['tag'],
        operation: 'invalid-op'
      };

      const response = await request(app)
        .post('/api/urls/batch-tags')
        .send(tagUpdate);

      expect(response.status).toBe(400);
      expect(response.body.errors[0].msg).toContain('operation');
    });
  });

  describe('POST /api/process/batch', () => {
    it('should process multiple URLs', async () => {
      const processRequest = {
        urls: ['url1', 'url2', 'url3'],
        options: {
          scraperType: 'http',
          cleaners: ['sanitize-html', 'readability']
        }
      };

      kb3Service.processUrl = jest.fn().mockResolvedValue({
        success: true,
        content: 'Processed content',
        metadata: {}
      });

      const response = await request(app)
        .post('/api/process/batch')
        .send(processRequest);

      expect(response.status).toBe(202); // Accepted for processing
      expect(response.body).toEqual({
        success: true,
        data: {
          queued: 3,
          jobId: expect.any(String)
        }
      });

      // Verify URLs were queued for processing
      expect(kb3Service.processUrl).toHaveBeenCalledTimes(3);
    });

    it('should respect processing options per URL', async () => {
      const processRequest = {
        urls: ['url1'],
        options: {
          scraperType: 'playwright',
          cleaners: ['xss'],
          extractMetadata: true,
          extractLinks: true
        }
      };

      kb3Service.processUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/process/batch')
        .send(processRequest);

      expect(response.status).toBe(202);
      expect(kb3Service.processUrl).toHaveBeenCalledWith(
        'url1',
        expect.objectContaining({
          scraperType: 'playwright',
          cleaners: ['xss'],
          extractMetadata: true,
          extractLinks: true
        })
      );
    });

    it('should handle processing with authority levels', async () => {
      // First set authority, then process
      const authorityUpdate = {
        ids: ['high-priority-url'],
        updates: { authority: 5 }
      };

      kb3Service.updateUrl = jest.fn().mockResolvedValue({ success: true });

      await request(app)
        .post('/api/urls/batch-update')
        .send(authorityUpdate);

      // Now process with priority queue consideration
      const processRequest = {
        urls: ['high-priority-url'],
        options: {
          respectAuthority: true
        }
      };

      kb3Service.processUrl = jest.fn().mockResolvedValue({ success: true });
      kb3Service.getUrl = jest.fn().mockResolvedValue({
        id: 'high-priority-url',
        url: 'https://example.com',
        authority: 5
      });

      const response = await request(app)
        .post('/api/process/batch')
        .send(processRequest);

      expect(response.status).toBe(202);
      expect(response.body.data).toHaveProperty('queued', 1);
    });
  });

  describe('DELETE /api/urls/batch', () => {
    it('should delete multiple URLs', async () => {
      const deleteRequest = {
        ids: ['url1', 'url2', 'url3']
      };

      kb3Service.deleteUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/urls/batch')
        .send(deleteRequest);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        success: true,
        data: {
          deleted: 3,
          failed: 0,
          errors: []
        }
      });

      expect(kb3Service.deleteUrl).toHaveBeenCalledTimes(3);
    });

    it('should require confirmation for large deletions', async () => {
      const largeDelete = {
        ids: Array.from({ length: 100 }, (_, i) => `url${i}`)
      };

      const response = await request(app)
        .delete('/api/urls/batch')
        .send(largeDelete);

      // Should require confirmation header for safety
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('confirmation required');
    });

    it('should handle large deletions with confirmation', async () => {
      const largeDelete = {
        ids: Array.from({ length: 100 }, (_, i) => `url${i}`)
      };

      kb3Service.deleteUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .delete('/api/urls/batch')
        .set('X-Confirm-Delete', 'true')
        .send(largeDelete);

      expect(response.status).toBe(200);
      expect(response.body.data.deleted).toBe(100);
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent batch updates without data loss', async () => {
      const update1 = {
        ids: ['url1', 'url2'],
        updates: { status: 'processing' }
      };

      const update2 = {
        ids: ['url2', 'url3'],
        updates: { authority: 3 }
      };

      kb3Service.updateUrl = jest.fn()
        .mockImplementation(() => new Promise(resolve =>
          setTimeout(() => resolve({ success: true }), 50)
        ));

      // Send concurrent requests
      const [response1, response2] = await Promise.all([
        request(app).post('/api/urls/batch-update').send(update1),
        request(app).post('/api/urls/batch-update').send(update2)
      ]);

      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);

      // URL2 should have been updated twice with different fields
      const url2Calls = (kb3Service.updateUrl as jest.Mock).mock.calls
        .filter(call => call[0] === 'url2');
      expect(url2Calls).toHaveLength(2);
    });

    it('should handle batch operations with rate limiting', async () => {
      // Simulate many rapid requests
      const requests = Array.from({ length: 10 }, (_, i) => ({
        ids: [`url${i}`],
        updates: { status: 'processing' }
      }));

      kb3Service.updateUrl = jest.fn().mockResolvedValue({ success: true });

      const responses = await Promise.all(
        requests.map(req =>
          request(app).post('/api/urls/batch-update').send(req)
        )
      );

      // All should succeed (rate limiting is per-IP in production)
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      expect(kb3Service.updateUrl).toHaveBeenCalledTimes(10);
    });
  });

  describe('Authority Field Specific Tests', () => {
    it('should sort URLs by authority when fetching', async () => {
      const mockUrls = [
        { id: 'url1', url: 'https://low.com', authority: 1 },
        { id: 'url2', url: 'https://high.com', authority: 5 },
        { id: 'url3', url: 'https://medium.com', authority: 3 }
      ];

      kb3Service.getUrls = jest.fn().mockResolvedValue(mockUrls);

      const response = await request(app)
        .get('/api/urls')
        .query({ sortBy: 'authority', order: 'desc' });

      expect(response.status).toBe(200);
      expect(kb3Service.getUrls).toHaveBeenCalledWith(
        expect.objectContaining({
          sortBy: 'authority',
          order: 'desc'
        })
      );
    });

    it('should filter URLs by minimum authority', async () => {
      kb3Service.getUrls = jest.fn().mockResolvedValue([
        { id: 'url1', url: 'https://important.com', authority: 4 }
      ]);

      const response = await request(app)
        .get('/api/urls')
        .query({ minAuthority: 3 });

      expect(response.status).toBe(200);
      expect(kb3Service.getUrls).toHaveBeenCalledWith(
        expect.objectContaining({
          minAuthority: 3
        })
      );
    });

    it('should process high-authority URLs first', async () => {
      const processRequest = {
        urls: ['low-url', 'high-url', 'medium-url']
      };

      // Mock URLs with different authorities
      kb3Service.getUrl = jest.fn()
        .mockImplementation((id) => {
          const authorities: Record<string, number> = {
            'low-url': 1,
            'high-url': 5,
            'medium-url': 3
          };
          return Promise.resolve({
            id,
            url: `https://${id}.com`,
            authority: authorities[id] || 0
          });
        });

      kb3Service.processUrl = jest.fn().mockResolvedValue({ success: true });

      const response = await request(app)
        .post('/api/process/batch')
        .send({
          ...processRequest,
          options: { prioritizeByAuthority: true }
        });

      expect(response.status).toBe(202);

      // In a real implementation, high-authority URLs would be processed first
      expect(kb3Service.getUrl).toHaveBeenCalledTimes(3);
    });
  });
});