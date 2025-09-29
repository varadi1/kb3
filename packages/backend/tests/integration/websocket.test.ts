import { io, Socket } from 'socket.io-client';
import { app, httpServer, cleanupWebSocket } from '../../src/index';
import { KB3Service } from '../../src/services/kb3Service';

jest.mock('../../src/services/kb3Service');

describe('WebSocket Integration Tests', () => {
  let clientSocket: Socket;
  let kb3Service: jest.Mocked<KB3Service>;
  const serverUrl = 'http://localhost:4000';

  // Increase timeout for WebSocket tests
  jest.setTimeout(10000);

  beforeAll((done) => {
    kb3Service = KB3Service.getInstance() as jest.Mocked<KB3Service>;

    // Check if server is already listening
    if (httpServer.listening) {
      done();
    } else {
      // Start server if not already listening
      httpServer.listen(4000, () => {
        done();
      });
    }
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    cleanupWebSocket();
    httpServer.close();
    await kb3Service.cleanup();
  });

  beforeEach((done) => {
    // Create a new client socket for each test
    clientSocket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: false
    });

    clientSocket.on('connect', () => {
      done();
    });

    clientSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      done(error);
    });
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    jest.clearAllMocks();
  });

  describe('Connection Events', () => {
    it('should establish WebSocket connection', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should receive welcome message on connection', (done) => {
      clientSocket.on('welcome', (data) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('timestamp');
        expect(data.message).toContain('Connected to KB3');
        done();
      });
    });

    it('should handle disconnect gracefully', (done) => {
      clientSocket.on('disconnect', (reason) => {
        expect(reason).toBeDefined();
        done();
      });

      clientSocket.disconnect();
    });
  });

  describe('URL Processing Events', () => {
    it('should emit processing started event', (done) => {
      const urlId = 'test-url-123';

      clientSocket.on('processing:started', (data) => {
        expect(data).toEqual({
          urlId,
          status: 'processing',
          timestamp: expect.any(String)
        });
        done();
      });

      // Simulate KB3 service emitting event
      kb3Service.emit('processing:started', {
        urlId,
        status: 'processing',
        timestamp: new Date().toISOString()
      });
    });

    it('should emit processing progress events', (done) => {
      const urlId = 'test-url-456';
      const progressUpdates: any[] = [];

      clientSocket.on('processing:progress', (data) => {
        progressUpdates.push(data);

        if (progressUpdates.length === 3) {
          expect(progressUpdates[0].progress).toBe(25);
          expect(progressUpdates[1].progress).toBe(50);
          expect(progressUpdates[2].progress).toBe(75);
          done();
        }
      });

      // Simulate progress updates
      [25, 50, 75].forEach((progress, index) => {
        setTimeout(() => {
          kb3Service.emit('processing:progress', {
            urlId,
            progress,
            message: `Processing step ${index + 1}`,
            timestamp: new Date().toISOString()
          });
        }, index * 10);
      });
    });

    it('should emit processing completed event', (done) => {
      const urlId = 'test-url-789';

      clientSocket.on('processing:completed', (data) => {
        expect(data).toEqual({
          urlId,
          status: 'completed',
          result: expect.objectContaining({
            content: expect.any(String),
            metadata: expect.any(Object)
          }),
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('processing:completed', {
        urlId,
        status: 'completed',
        result: {
          content: 'Processed content',
          metadata: { title: 'Test Page' }
        },
        timestamp: new Date().toISOString()
      });
    });

    it('should emit processing failed event', (done) => {
      const urlId = 'test-url-fail';

      clientSocket.on('processing:failed', (data) => {
        expect(data).toEqual({
          urlId,
          status: 'failed',
          error: 'Network timeout',
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('processing:failed', {
        urlId,
        status: 'failed',
        error: 'Network timeout',
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Batch Processing Events', () => {
    it('should emit batch started event', (done) => {
      const jobId = 'batch-job-123';
      const urls = ['url1', 'url2', 'url3'];

      clientSocket.on('batch:started', (data) => {
        expect(data).toEqual({
          jobId,
          urls,
          totalCount: 3,
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('batch:started', {
        jobId,
        urls,
        totalCount: 3,
        timestamp: new Date().toISOString()
      });
    });

    it('should emit batch progress with authority consideration', (done) => {
      const jobId = 'batch-job-456';

      clientSocket.on('batch:progress', (data) => {
        expect(data).toEqual({
          jobId,
          completed: 2,
          total: 5,
          currentUrl: 'high-priority-url',
          currentAuthority: 5,
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('batch:progress', {
        jobId,
        completed: 2,
        total: 5,
        currentUrl: 'high-priority-url',
        currentAuthority: 5,
        timestamp: new Date().toISOString()
      });
    });

    it('should emit batch completed event', (done) => {
      const jobId = 'batch-job-789';

      clientSocket.on('batch:completed', (data) => {
        expect(data).toEqual({
          jobId,
          successful: 8,
          failed: 2,
          total: 10,
          duration: expect.any(Number),
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('batch:completed', {
        jobId,
        successful: 8,
        failed: 2,
        total: 10,
        duration: 5432,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Configuration Change Events', () => {
    it('should emit config updated event', (done) => {
      clientSocket.on('config:updated', (data) => {
        expect(data).toEqual({
          type: 'scrapers',
          changes: expect.any(Object),
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('config:updated', {
        type: 'scrapers',
        changes: {
          added: ['playwright'],
          removed: ['http'],
          modified: []
        },
        timestamp: new Date().toISOString()
      });
    });

    it('should emit URL config changed event', (done) => {
      const urlId = 'config-url-123';

      clientSocket.on('url:config:changed', (data) => {
        expect(data).toEqual({
          urlId,
          scraperType: 'crawl4ai',
          cleaners: ['readability'],
          priority: 20,
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('url:config:changed', {
        urlId,
        scraperType: 'crawl4ai',
        cleaners: ['readability'],
        priority: 20,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Tag Events', () => {
    it('should emit tag created event', (done) => {
      clientSocket.on('tag:created', (data) => {
        expect(data).toEqual({
          id: 1,
          name: 'new-tag',
          parentId: null,
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('tag:created', {
        id: 1,
        name: 'new-tag',
        parentId: null,
        timestamp: new Date().toISOString()
      });
    });

    it('should emit tag assigned event', (done) => {
      clientSocket.on('tag:assigned', (data) => {
        expect(data).toEqual({
          urlIds: ['url1', 'url2'],
          tags: ['tag1', 'tag2'],
          operation: 'add',
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('tag:assigned', {
        urlIds: ['url1', 'url2'],
        tags: ['tag1', 'tag2'],
        operation: 'add',
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Authority Events', () => {
    it('should emit authority changed event', (done) => {
      clientSocket.on('authority:changed', (data) => {
        expect(data).toEqual({
          urlId: 'auth-url-123',
          oldAuthority: 2,
          newAuthority: 5,
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('authority:changed', {
        urlId: 'auth-url-123',
        oldAuthority: 2,
        newAuthority: 5,
        timestamp: new Date().toISOString()
      });
    });

    it('should emit batch authority update event', (done) => {
      clientSocket.on('authority:batch:updated', (data) => {
        expect(data).toEqual({
          urlIds: ['url1', 'url2', 'url3'],
          newAuthority: 4,
          count: 3,
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('authority:batch:updated', {
        urlIds: ['url1', 'url2', 'url3'],
        newAuthority: 4,
        count: 3,
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Error Events', () => {
    it('should emit error event with details', (done) => {
      clientSocket.on('error:occurred', (data) => {
        expect(data).toEqual({
          type: 'processing',
          message: 'Failed to fetch URL',
          urlId: 'error-url',
          details: expect.any(Object),
          timestamp: expect.any(String)
        });
        done();
      });

      kb3Service.emit('error:occurred', {
        type: 'processing',
        message: 'Failed to fetch URL',
        urlId: 'error-url',
        details: { code: 'ETIMEDOUT' },
        timestamp: new Date().toISOString()
      });
    });
  });

  describe('Room-based Events', () => {
    it('should join URL-specific room', (done) => {
      const urlId = 'room-url-123';

      clientSocket.emit('join:url', { urlId }, (response: any) => {
        expect(response.success).toBe(true);
        expect(response.room).toBe(`url:${urlId}`);
        done();
      });
    });

    it('should leave URL-specific room', (done) => {
      const urlId = 'room-url-456';

      // First join
      clientSocket.emit('join:url', { urlId }, () => {
        // Then leave
        clientSocket.emit('leave:url', { urlId }, (response: any) => {
          expect(response.success).toBe(true);
          done();
        });
      });
    });

    it('should receive events only for joined rooms', (done) => {
      const joinedUrl = 'joined-url';
      const notJoinedUrl = 'not-joined-url';
      const receivedEvents: string[] = [];

      clientSocket.on('url:update', (data) => {
        receivedEvents.push(data.urlId);
      });

      // Join only one room
      clientSocket.emit('join:url', { urlId: joinedUrl }, () => {
        // Emit events for both URLs
        kb3Service.emit('url:update', { urlId: joinedUrl, data: 'update1' });
        kb3Service.emit('url:update', { urlId: notJoinedUrl, data: 'update2' });

        setTimeout(() => {
          expect(receivedEvents).toContain(joinedUrl);
          expect(receivedEvents).not.toContain(notJoinedUrl);
          done();
        }, 100);
      });
    });
  });

  describe('Client Commands', () => {
    it('should handle get:stats command', (done) => {
      kb3Service.getStats = jest.fn().mockResolvedValue({
        totalUrls: 100,
        processedUrls: 75,
        failedUrls: 5,
        processing: 2,
        queue: 18
      });

      clientSocket.emit('get:stats', {}, (response: any) => {
        expect(response.success).toBe(true);
        expect(response.data).toEqual({
          totalUrls: 100,
          processedUrls: 75,
          failedUrls: 5,
          processing: 2,
          queue: 18
        });
        done();
      });
    });

    it('should handle process:url command', (done) => {
      const urlId = 'command-url-123';

      kb3Service.processUrl = jest.fn().mockResolvedValue({
        success: true,
        jobId: 'job-123'
      });

      clientSocket.emit('process:url', { urlId }, (response: any) => {
        expect(response.success).toBe(true);
        expect(response.jobId).toBe('job-123');
        expect(kb3Service.processUrl).toHaveBeenCalledWith(urlId, undefined);
        done();
      });
    });

    it('should handle process:url with authority priority', (done) => {
      const urlId = 'priority-url';
      const options = {
        respectAuthority: true,
        scraperType: 'playwright'
      };

      kb3Service.processUrl = jest.fn().mockResolvedValue({
        success: true,
        jobId: 'priority-job'
      });

      clientSocket.emit('process:url', { urlId, options }, (response: any) => {
        expect(response.success).toBe(true);
        expect(kb3Service.processUrl).toHaveBeenCalledWith(urlId, options);
        done();
      });
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast to all connected clients', (done) => {
      const secondClient = io(serverUrl, {
        transports: ['websocket'],
        reconnection: false
      });

      let receivedCount = 0;
      const expectedMessage = { announcement: 'System update' };

      const checkDone = () => {
        receivedCount++;
        if (receivedCount === 2) {
          secondClient.disconnect();
          done();
        }
      };

      clientSocket.on('broadcast:message', (data) => {
        expect(data).toEqual(expectedMessage);
        checkDone();
      });

      secondClient.on('connect', () => {
        secondClient.on('broadcast:message', (data) => {
          expect(data).toEqual(expectedMessage);
          checkDone();
        });

        // Emit broadcast from service
        kb3Service.emit('broadcast:message', expectedMessage);
      });
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid event emissions', (done) => {
      const events: any[] = [];

      clientSocket.on('rapid:event', (data) => {
        events.push(data);
      });

      // Send 100 rapid events
      for (let i = 0; i < 100; i++) {
        kb3Service.emit('rapid:event', { index: i });
      }

      setTimeout(() => {
        expect(events.length).toBe(100);
        expect(events[99].index).toBe(99);
        done();
      }, 500);
    });
  });

  describe('Concurrent Connections', () => {
    it('should handle multiple concurrent connections', (done) => {
      const clients: Socket[] = [];
      const connectionCount = 10;
      let connectedCount = 0;

      for (let i = 0; i < connectionCount; i++) {
        const client = io(serverUrl, {
          transports: ['websocket'],
          reconnection: false
        });

        client.on('connect', () => {
          connectedCount++;
          if (connectedCount === connectionCount) {
            // All connected, clean up
            clients.forEach(c => c.disconnect());
            done();
          }
        });

        clients.push(client);
      }
    });
  });
});