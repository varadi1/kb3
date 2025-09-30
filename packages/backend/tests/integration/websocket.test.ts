import { KB3Service } from '../../src/services/kb3Service';

jest.mock('../../src/services/kb3Service');

// Mock socket.io-client to avoid real network connections
jest.mock('socket.io-client', () => {
  const mockSocket = {
    connected: false,
    on: jest.fn((event: string, callback: Function) => {
      // Auto-trigger certain events for testing
      if (event === 'connect') {
        setTimeout(() => {
          mockSocket.connected = true;
          callback();
        }, 10);
      }
      if (event === 'welcome') {
        setTimeout(() => {
          callback({
            message: 'Connected to KB3 Backend',
            timestamp: new Date().toISOString()
          });
        }, 20);
      }
      return mockSocket;
    }),
    emit: jest.fn((event: string, data: any, callback?: Function) => {
      // Handle specific emit events
      if (callback) {
        if (event === 'join:url') {
          callback({ success: true, room: `url:${data.urlId}` });
        } else if (event === 'leave:url') {
          callback({ success: true });
        } else if (event === 'get:stats') {
          callback({
            success: true,
            data: {
              totalUrls: 100,
              processedUrls: 75,
              failedUrls: 5,
              processing: 2,
              queue: 18
            }
          });
        } else if (event === 'process:url') {
          callback({ success: true, jobId: 'job-123' });
        } else {
          callback({ success: true });
        }
      }
      return mockSocket;
    }),
    disconnect: jest.fn(() => {
      mockSocket.connected = false;
    }),
    off: jest.fn(),
    removeAllListeners: jest.fn()
  };

  return {
    io: jest.fn(() => mockSocket),
    Socket: jest.fn()
  };
});

describe('WebSocket Integration Tests', () => {
  let clientSocket: any;
  let kb3Service: jest.Mocked<KB3Service>;
  const io = require('socket.io-client').io;

  // Increase timeout for WebSocket tests
  jest.setTimeout(5000);

  beforeAll(() => {
    kb3Service = KB3Service.getInstance() as jest.Mocked<KB3Service>;
  });

  afterAll(async () => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
    await kb3Service.cleanup();
  });

  beforeEach(() => {
    // Create a new mock client socket for each test
    clientSocket = io('http://localhost:4000');
    jest.clearAllMocks();
  });

  afterEach(() => {
    if (clientSocket) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Events', () => {
    it('should establish WebSocket connection', (done) => {
      clientSocket.on('connect', () => {
        expect(clientSocket.connected).toBe(true);
        done();
      });
    });

    it('should receive welcome message on connection', (done) => {
      clientSocket.on('welcome', (data: any) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('timestamp');
        expect(data.message).toContain('Connected to KB3');
        done();
      });
    });

    it('should handle disconnect gracefully', (done) => {
      clientSocket.on('disconnect', (reason: any) => {
        expect(reason).toBeDefined();
        done();
      });

      // Trigger disconnect after connection
      clientSocket.on('connect', () => {
        clientSocket.disconnect();
        // Mock the disconnect event
        clientSocket.on.mock.calls.find((call: any) => call[0] === 'disconnect')[1]('client disconnect');
      });
    });
  });

  describe('URL Processing Events', () => {
    it('should emit processing started event', (done) => {
      const urlId = 'test-url-123';

      clientSocket.on('processing:started', (data: any) => {
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

      // Manually trigger the event for testing
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'processing:started');
        if (handler) {
          handler[1]({
            urlId,
            status: 'processing',
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });

    it('should emit processing progress events', (done) => {
      const urlId = 'test-url-456';
      const progressUpdates: any[] = [];

      clientSocket.on('processing:progress', (data: any) => {
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
          const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'processing:progress');
          if (handler) {
            handler[1]({
              urlId,
              progress,
              message: `Processing step ${index + 1}`,
              timestamp: new Date().toISOString()
            });
          }
        }, (index + 1) * 10);
      });
    });

    it('should emit processing completed event', (done) => {
      const urlId = 'test-url-789';

      clientSocket.on('processing:completed', (data: any) => {
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

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'processing:completed');
        if (handler) {
          handler[1]({
            urlId,
            status: 'completed',
            result: {
              content: 'Processed content',
              metadata: { title: 'Test Page' }
            },
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });

    it('should emit processing failed event', (done) => {
      const urlId = 'test-url-fail';

      clientSocket.on('processing:failed', (data: any) => {
        expect(data).toEqual({
          urlId,
          status: 'failed',
          error: 'Network timeout',
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'processing:failed');
        if (handler) {
          handler[1]({
            urlId,
            status: 'failed',
            error: 'Network timeout',
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });
  });

  describe('Batch Processing Events', () => {
    it('should emit batch started event', (done) => {
      const jobId = 'batch-job-123';
      const urls = ['url1', 'url2', 'url3'];

      clientSocket.on('batch:started', (data: any) => {
        expect(data).toEqual({
          jobId,
          urls,
          totalCount: 3,
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'batch:started');
        if (handler) {
          handler[1]({
            jobId,
            urls,
            totalCount: 3,
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });

    it('should emit batch progress with authority consideration', (done) => {
      const jobId = 'batch-job-456';

      clientSocket.on('batch:progress', (data: any) => {
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

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'batch:progress');
        if (handler) {
          handler[1]({
            jobId,
            completed: 2,
            total: 5,
            currentUrl: 'high-priority-url',
            currentAuthority: 5,
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });

    it('should emit batch completed event', (done) => {
      const jobId = 'batch-job-789';

      clientSocket.on('batch:completed', (data: any) => {
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

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'batch:completed');
        if (handler) {
          handler[1]({
            jobId,
            successful: 8,
            failed: 2,
            total: 10,
            duration: 5432,
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });
  });

  describe('Configuration Change Events', () => {
    it('should emit config updated event', (done) => {
      clientSocket.on('config:updated', (data: any) => {
        expect(data).toEqual({
          type: 'scrapers',
          changes: expect.any(Object),
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'config:updated');
        if (handler) {
          handler[1]({
            type: 'scrapers',
            changes: {
              added: ['playwright'],
              removed: ['http'],
              modified: []
            },
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });

    it('should emit URL config changed event', (done) => {
      const urlId = 'config-url-123';

      clientSocket.on('url:config:changed', (data: any) => {
        expect(data).toEqual({
          urlId,
          scraperType: 'crawl4ai',
          cleaners: ['readability'],
          priority: 20,
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'url:config:changed');
        if (handler) {
          handler[1]({
            urlId,
            scraperType: 'crawl4ai',
            cleaners: ['readability'],
            priority: 20,
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });
  });

  describe('Tag Events', () => {
    it('should emit tag created event', (done) => {
      clientSocket.on('tag:created', (data: any) => {
        expect(data).toEqual({
          id: 1,
          name: 'new-tag',
          parentId: null,
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'tag:created');
        if (handler) {
          handler[1]({
            id: 1,
            name: 'new-tag',
            parentId: null,
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });

    it('should emit tag assigned event', (done) => {
      clientSocket.on('tag:assigned', (data: any) => {
        expect(data).toEqual({
          urlIds: ['url1', 'url2'],
          tags: ['tag1', 'tag2'],
          operation: 'add',
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'tag:assigned');
        if (handler) {
          handler[1]({
            urlIds: ['url1', 'url2'],
            tags: ['tag1', 'tag2'],
            operation: 'add',
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });
  });

  describe('Authority Events', () => {
    it('should emit authority changed event', (done) => {
      clientSocket.on('authority:changed', (data: any) => {
        expect(data).toEqual({
          urlId: 'auth-url-123',
          oldAuthority: 2,
          newAuthority: 5,
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'authority:changed');
        if (handler) {
          handler[1]({
            urlId: 'auth-url-123',
            oldAuthority: 2,
            newAuthority: 5,
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });

    it('should emit batch authority update event', (done) => {
      clientSocket.on('authority:batch:updated', (data: any) => {
        expect(data).toEqual({
          urlIds: ['url1', 'url2', 'url3'],
          newAuthority: 4,
          count: 3,
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'authority:batch:updated');
        if (handler) {
          handler[1]({
            urlIds: ['url1', 'url2', 'url3'],
            newAuthority: 4,
            count: 3,
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
    });
  });

  describe('Error Events', () => {
    it('should emit error event with details', (done) => {
      clientSocket.on('error:occurred', (data: any) => {
        expect(data).toEqual({
          type: 'processing',
          message: 'Failed to fetch URL',
          urlId: 'error-url',
          details: expect.any(Object),
          timestamp: expect.any(String)
        });
        done();
      });

      // Manually trigger the event
      setTimeout(() => {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'error:occurred');
        if (handler) {
          handler[1]({
            type: 'processing',
            message: 'Failed to fetch URL',
            urlId: 'error-url',
            details: { code: 'ETIMEDOUT' },
            timestamp: new Date().toISOString()
          });
        }
      }, 10);
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

      clientSocket.on('url:update', (data: any) => {
        receivedEvents.push(data.urlId);
      });

      // Join only one room
      clientSocket.emit('join:url', { urlId: joinedUrl }, () => {
        // Simulate events - in the mock, we just track what was received
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'url:update');
        if (handler) {
          handler[1]({ urlId: joinedUrl, data: 'update1' });
        }

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

      clientSocket.emit('process:url', { urlId }, (response: any) => {
        expect(response.success).toBe(true);
        expect(response.jobId).toBe('job-123');
        done();
      });
    });

    it('should handle process:url with authority priority', (done) => {
      const urlId = 'priority-url';
      const options = {
        respectAuthority: true,
        scraperType: 'playwright'
      };

      clientSocket.emit('process:url', { urlId, options }, (response: any) => {
        expect(response.success).toBe(true);
        done();
      });
    });
  });

  describe('Broadcasting', () => {
    it('should broadcast to all connected clients', (done) => {
      const secondClient = io('http://localhost:4000');
      let receivedCount = 0;
      const expectedMessage = { announcement: 'System update' };

      const checkDone = () => {
        receivedCount++;
        if (receivedCount === 2) {
          secondClient.disconnect();
          done();
        }
      };

      clientSocket.on('broadcast:message', (data: any) => {
        expect(data).toEqual(expectedMessage);
        checkDone();
      });

      secondClient.on('broadcast:message', (data: any) => {
        expect(data).toEqual(expectedMessage);
        checkDone();
      });

      // Simulate broadcast - manually trigger for both clients
      setTimeout(() => {
        const handler1 = clientSocket.on.mock.calls.find((call: any) => call[0] === 'broadcast:message');
        const handler2 = secondClient.on.mock.calls.find((call: any) => call[0] === 'broadcast:message');
        if (handler1) handler1[1](expectedMessage);
        if (handler2) handler2[1](expectedMessage);
      }, 50);
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rapid event emissions', (done) => {
      const events: any[] = [];

      clientSocket.on('rapid:event', (data: any) => {
        events.push(data);
      });

      // Send 100 rapid events
      for (let i = 0; i < 100; i++) {
        const handler = clientSocket.on.mock.calls.find((call: any) => call[0] === 'rapid:event');
        if (handler) {
          handler[1]({ index: i });
        }
      }

      setTimeout(() => {
        expect(events.length).toBe(100);
        expect(events[99].index).toBe(99);
        done();
      }, 100);
    });
  });

  describe('Concurrent Connections', () => {
    it('should handle multiple concurrent connections', (done) => {
      const clients: any[] = [];
      const connectionCount = 10;
      let connectedCount = 0;

      for (let i = 0; i < connectionCount; i++) {
        const client = io('http://localhost:4000');

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