/**
 * Scholarly Payment Service - Application Entry Point
 * 
 * This is the main entry point for the payment service application.
 * It sets up the Express server, middleware, routes, and starts listening.
 * 
 * @module ScholarlyPayment
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createPaymentRouter } from './routes';
import { 
  logger, 
  initializePool, 
  closeConnections,
  getConfig, 
  setConfig 
} from './infrastructure';

// ============================================================================
// APPLICATION SETUP
// ============================================================================

export function createApp(): Application {
  const app = express();

  // Security middleware
  app.use(helmet());
  
  // CORS
  app.use(cors({
    origin: process.env['CORS_ORIGIN'] || '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-Request-ID']
  }));

  // Compression
  app.use(compression());

  // Body parsing - raw for webhooks, JSON for everything else
  app.use('/api/payment/webhooks/stripe', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Request logging
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestId = req.headers['x-request-id'] || `req_${Date.now()}`;
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info('Request completed', {
        method: req.method,
        path: req.path,
        status: res.statusCode,
        duration,
        requestId
      });
    });

    next();
  });

  // Health check
  app.get('/health', (req: Request, res: Response) => {
    res.json({ 
      status: 'healthy',
      service: 'scholarly-payment',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Readiness check
  app.get('/ready', async (req: Request, res: Response) => {
    try {
      // Check database connection
      const pool = initializePool();
      await pool.query('SELECT 1');
      
      res.json({ 
        status: 'ready',
        checks: {
          database: 'connected'
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'not ready',
        checks: {
          database: 'disconnected'
        }
      });
    }
  });

  // API routes
  app.use('/api/payment', createPaymentRouter());

  // 404 handler
  app.use((req: Request, res: Response) => {
    res.status(404).json({ 
      error: 'Not Found',
      path: req.path
    });
  });

  // Error handler
  app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    logger.error('Unhandled error', err, {
      method: req.method,
      path: req.path
    });

    res.status(500).json({
      error: 'Internal Server Error',
      message: process.env['NODE_ENV'] === 'development' ? err.message : undefined
    });
  });

  return app;
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function start(): Promise<void> {
  const port = parseInt(process.env['PORT'] || '3001');
  
  // Initialize database
  logger.info('Initializing database connection...');
  initializePool();

  // Create and start app
  const app = createApp();
  
  const server = app.listen(port, () => {
    logger.info(`Scholarly Payment Service started`, {
      port,
      environment: process.env['NODE_ENV'] || 'development',
      nodeVersion: process.version
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    
    server.close(async () => {
      logger.info('HTTP server closed');
      
      await closeConnections();
      logger.info('Database connections closed');
      
      process.exit(0);
    });

    // Force close after 30 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

// Start if running directly
if (require.main === module) {
  start().catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
  });
}

export { start, createApp };
