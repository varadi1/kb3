import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import rateLimit from 'express-rate-limit';
import * as dotenv from 'dotenv';
import { KB3Service } from './services/kb3Service';
import { setupWebSocket } from './websocket/socketHandler';
import urlRoutes from './routes/urls';
import tagRoutes from './routes/tags';
import processingRoutes from './routes/processing';
import configRoutes from './routes/config';
import contentRoutes from './routes/content';
import exportRoutes from './routes/export';

dotenv.config();

const app: Express = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
  }
});

const PORT = process.env.PORT || 4000;

// Initialize KB3 Service
const kb3Service = KB3Service.getInstance();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API Routes
app.use('/api/urls', urlRoutes);
app.use('/api/tags', tagRoutes);
app.use('/api/process', processingRoutes);
app.use('/api/config', configRoutes);
app.use('/api/content', contentRoutes);
app.use('/api/export', exportRoutes);

// WebSocket Setup
setupWebSocket(io, kb3Service);

// Error handling middleware
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);

  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: {
      message,
      status,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      status: 404,
      path: req.path
    }
  });
});

// Server startup - only when running directly, not when imported for tests
if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════╗
║     KB3 Backend API Server             ║
╠════════════════════════════════════════╣
║  Status: Running                       ║
║  Port: ${PORT}                            ║
║  Environment: ${process.env.NODE_ENV || 'development'}           ║
║  API: http://localhost:${PORT}/api       ║
║  Health: http://localhost:${PORT}/health ║
╚════════════════════════════════════════╝
    `);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    kb3Service.cleanup().then(() => {
      process.exit(0);
    });
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, shutting down gracefully...');
  httpServer.close(() => {
    console.log('Server closed');
    kb3Service.cleanup().then(() => {
      process.exit(0);
    });
  });
});

export { app, httpServer, io };