/**
 * KB3 API Server
 * Provides REST API endpoints for the KB3 Knowledge Base System
 * Follows SOLID principles and maintains clean architecture
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import * as path from 'path';
import dotenv from 'dotenv';

// Import route modules
import urlRoutes from './routes/urls';
import tagRoutes from './routes/tags';
import scraperRoutes from './routes/scrapers';
import cleanerRoutes from './routes/cleaners';
import processingRoutes from './routes/processing';
import fileRoutes from './routes/files';
import importExportRoutes from './routes/import-export';
import configRoutes from './routes/config';

// Load environment variables
dotenv.config();

class ApiServer {
  private app: Application;
  private server: any;
  private io: SocketIOServer;
  private port: number;

  constructor(port: number = 3001) {
    this.port = port;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
      }
    });

    this.configureMiddleware();
    this.configureRoutes();
    this.configureErrorHandling();
    this.configureSocketIO();
  }

  private configureMiddleware(): void {
    // Security middleware
    this.app.use(helmet());

    // CORS configuration
    this.app.use(cors({
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '50mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '50mb' }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
      next();
    });

    // Make io accessible in routes
    this.app.set('io', this.io);
  }

  private configureRoutes(): void {
    // Health check endpoint
    this.app.get('/api/health', (req: Request, res: Response) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      });
    });

    // API Routes
    this.app.use('/api/urls', urlRoutes);
    this.app.use('/api/tags', tagRoutes);
    this.app.use('/api/scrapers', scraperRoutes);
    this.app.use('/api/cleaners', cleanerRoutes);
    this.app.use('/api/processing', processingRoutes);
    this.app.use('/api/files', fileRoutes);
    this.app.use('/api/import-export', importExportRoutes);
    this.app.use('/api/config', configRoutes);

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      res.status(404).json({
        error: 'Not Found',
        message: `Route ${req.originalUrl} not found`,
        timestamp: new Date().toISOString()
      });
    });
  }

  private configureSocketIO(): void {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      socket.on('subscribe:processing', (data) => {
        socket.join('processing-updates');
        console.log(`Client ${socket.id} subscribed to processing updates`);
      });

      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
      });
    });
  }

  private configureErrorHandling(): void {
    // Global error handler
    this.app.use((err: any, req: Request, res: Response, next: NextFunction) => {
      console.error('Error:', err);

      const status = err.status || 500;
      const message = err.message || 'Internal Server Error';

      res.status(status).json({
        error: {
          message,
          status,
          timestamp: new Date().toISOString(),
          ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
        }
      });
    });
  }

  public start(): void {
    this.server.listen(this.port, () => {
      console.log(`KB3 API Server running on http://localhost:${this.port}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
    });
  }
}

// Start the server
const server = new ApiServer(parseInt(process.env.PORT || '3001'));
server.start();

export default server;