import { Server as SocketIOServer, Socket } from 'socket.io';
import { KB3Service } from '../services/kb3Service';

interface ClientData {
  subscribedUrls: Set<string>;
  subscribedTags: Set<string>;
}

export function setupWebSocket(io: SocketIOServer, kb3Service: KB3Service): () => void {
  const clients = new Map<string, ClientData>();

  // Setup KB3 event forwarding
  kb3Service.on('processing:started', (data) => {
    io.emit('processing:started', data);
  });

  kb3Service.on('processing:progress', (data) => {
    io.emit('processing:progress', data);
  });

  kb3Service.on('processing:completed', (data) => {
    io.emit('processing:completed', data);
  });

  kb3Service.on('processing:failed', (data) => {
    io.emit('processing:failed', data);
  });

  kb3Service.on('batch:started', (data) => {
    io.emit('batch:started', data);
  });

  kb3Service.on('batch:completed', (data) => {
    io.emit('batch:completed', data);
  });

  kb3Service.on('url:added', (data) => {
    io.emit('url:added', data);
  });

  kb3Service.on('urls:added', (data) => {
    io.emit('urls:added', data);
  });

  kb3Service.on('url:tagged', (data) => {
    io.emit('url:tagged', data);
  });

  kb3Service.on('tag:created', (data) => {
    io.emit('tag:created', data);
  });

  kb3Service.on('tag:updated', (data) => {
    io.emit('tag:updated', data);
  });

  kb3Service.on('tag:deleted', (data) => {
    io.emit('tag:deleted', data);
  });

  kb3Service.on('config:updated', (data) => {
    io.emit('config:updated', data);
  });

  // Handle client connections
  io.on('connection', (socket: Socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Initialize client data
    clients.set(socket.id, {
      subscribedUrls: new Set(),
      subscribedTags: new Set()
    });

    // Handle URL subscriptions
    socket.on('subscribe:url', (url: string) => {
      const clientData = clients.get(socket.id);
      if (clientData) {
        clientData.subscribedUrls.add(url);
        socket.join(`url:${url}`);
        console.log(`Client ${socket.id} subscribed to URL: ${url}`);
      }
    });

    socket.on('unsubscribe:url', (url: string) => {
      const clientData = clients.get(socket.id);
      if (clientData) {
        clientData.subscribedUrls.delete(url);
        socket.leave(`url:${url}`);
        console.log(`Client ${socket.id} unsubscribed from URL: ${url}`);
      }
    });

    // Handle tag subscriptions
    socket.on('subscribe:tag', (tag: string) => {
      const clientData = clients.get(socket.id);
      if (clientData) {
        clientData.subscribedTags.add(tag);
        socket.join(`tag:${tag}`);
        console.log(`Client ${socket.id} subscribed to tag: ${tag}`);
      }
    });

    socket.on('unsubscribe:tag', (tag: string) => {
      const clientData = clients.get(socket.id);
      if (clientData) {
        clientData.subscribedTags.delete(tag);
        socket.leave(`tag:${tag}`);
        console.log(`Client ${socket.id} unsubscribed from tag: ${tag}`);
      }
    });

    // Handle processing control
    socket.on('cancel:processing', async (data: { url: string }) => {
      try {
        // Implementation would need to be added to KB3Service
        socket.emit('processing:cancelled', { url: data.url });
      } catch (error: any) {
        socket.emit('error', {
          message: `Failed to cancel processing: ${error.message}`
        });
      }
    });

    // Handle queue status requests
    socket.on('queue:status', async () => {
      try {
        const status = await kb3Service.getStatistics();
        socket.emit('queue:status:response', status);
      } catch (error: any) {
        socket.emit('error', {
          message: `Failed to get queue status: ${error.message}`
        });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
      clients.delete(socket.id);
    });

    // Send initial connection acknowledgment
    socket.emit('connected', {
      id: socket.id,
      timestamp: new Date().toISOString()
    });
  });

  // Periodic status broadcast - store reference for cleanup
  const statsInterval = setInterval(async () => {
    try {
      const stats = await kb3Service.getStatistics();
      io.emit('stats:update', stats);
    } catch (error) {
      console.error('Failed to broadcast statistics:', error);
    }
  }, 30000); // Every 30 seconds

  console.log('WebSocket server initialized');

  // Return cleanup function
  return () => {
    clearInterval(statsInterval);
    kb3Service.removeAllListeners();
    io.removeAllListeners();
  };
}