/**
 * Scholarly Hosting - Express Application
 * 
 * Production-ready Express server with all middleware and routes configured.
 * 
 * @module ScholarlyHosting
 * @version 1.0.0
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { Pool } from 'pg';

import { createDefaultProviderRouter } from './routes/provider.routes';
import { createDefaultAgentApiRouter } from './routes/agent.routes';
import { createDefaultOfferingRouter } from './routes/offering.routes';
import { initializePool, logger } from './infrastructure';

// ============================================================================
// TYPES
// ============================================================================

export interface AppConfig {
  port: number;
  env: 'development' | 'production' | 'test';
  database: {
    connectionString?: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    password?: string;
    maxConnections?: number;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
  trustProxy: boolean;
}

interface AuthenticatedRequest extends Request {
  tenantId?: string;
  providerId?: string;
  userId?: string;
  isAdmin?: boolean;
}

// ============================================================================
// DEFAULT CONFIG
// ============================================================================

const defaultConfig: AppConfig = {
  port: parseInt(process.env['PORT'] ?? '3000'),
  env: (process.env['NODE_ENV'] as AppConfig['env']) ?? 'development',
  database: {
    connectionString: process.env['DATABASE_URL'],
    host: process.env['DB_HOST'] ?? 'localhost',
    port: parseInt(process.env['DB_PORT'] ?? '5432'),
    database: process.env['DB_NAME'] ?? 'scholarly_hosting',
    user: process.env['DB_USER'] ?? 'postgres',
    password: process.env['DB_PASSWORD'],
    maxConnections: parseInt(process.env['DB_MAX_CONNECTIONS'] ?? '20')
  },
  cors: {
    origin: process.env['CORS_ORIGIN']?.split(',') ?? ['http://localhost:3000'],
    credentials: true
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  },
  trustProxy: process.env['TRUST_PROXY'] === 'true'
};

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Authentication middleware - extracts tenant/user from JWT
 * In production, integrate with your auth provider (Auth0, Clerk, etc.)
 */
function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  // For development/testing, extract from headers
  const tenantId = req.headers['x-tenant-id'] as string;
  const providerId = req.headers['x-provider-id'] as string;
  const userId = req.headers['x-user-id'] as string;
  const isAdmin = req.headers['x-admin'] === 'true';

  if (tenantId) req.tenantId = tenantId;
  if (providerId) req.providerId = providerId;
  if (userId) req.userId = userId;
  req.isAdmin = isAdmin;

  // In production, verify JWT here:
  // const token = req.headers.authorization?.replace('Bearer ', '');
  // const decoded = verifyJWT(token);
  // req.tenantId = decoded.tenantId;
  // req.userId = decoded.userId;

  next();
}

/**
 * Request logging middleware
 */
function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    }, 'Request completed');
  });

  next();
}

/**
 * Error handling middleware
 */
function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  logger.error({ err, path: req.path, method: req.method }, 'Unhandled error');

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env['NODE_ENV'] === 'production'
        ? 'An unexpected error occurred'
        : err.message
    }
  });
}

/**
 * 404 handler
 */
function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
}

// ============================================================================
// APPLICATION FACTORY
// ============================================================================

export function createApp(config: Partial<AppConfig> = {}): Application {
  const finalConfig = { ...defaultConfig, ...config };
  const app = express();

  // Trust proxy if behind load balancer
  if (finalConfig.trustProxy) {
    app.set('trust proxy', 1);
  }

  // Security middleware
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.scholar.ly']
      }
    },
    crossOriginEmbedderPolicy: false
  }));

  // CORS
  app.use(cors({
    origin: finalConfig.cors.origin,
    credentials: finalConfig.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Provider-Id', 'X-User-Id', 'X-Agent-Id']
  }));

  // Compression
  app.use(compression());

  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Request logging
  if (finalConfig.env !== 'test') {
    app.use(morgan('combined'));
    app.use(requestLogger);
  }

  // Rate limiting
  const limiter = rateLimit({
    windowMs: finalConfig.rateLimit.windowMs,
    max: finalConfig.rateLimit.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many requests, please try again later'
      }
    }
  });
  app.use(limiter);

  // Health check (no auth required)
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Readiness check
  app.get('/ready', async (req, res) => {
    try {
      // Check database connection
      const pool = initializePool(finalConfig.database);
      await pool.query('SELECT 1');
      res.json({ status: 'ready', database: 'connected' });
    } catch (error) {
      res.status(503).json({ status: 'not ready', database: 'disconnected' });
    }
  });

  // Authentication middleware for protected routes
  app.use('/api', authMiddleware);

  // API Routes
  app.use('/api/hosting/providers', createDefaultProviderRouter());
  app.use('/api/hosting/offerings', createDefaultOfferingRouter());
  app.use('/api/agent', createDefaultAgentApiRouter());

  // Domain resolution endpoint (for reverse proxy)
  app.get('/api/internal/resolve/:domain', async (req, res) => {
    try {
      const { PostgresProviderRepository } = require('./repositories/provider.repository');
      const repo = new PostgresProviderRepository();
      const provider = await repo.findByDomain(req.params.domain);

      if (!provider) {
        return res.status(404).json({ found: false });
      }

      res.json({
        found: true,
        providerId: provider.id,
        tenantId: provider.tenantId,
        status: provider.status
      });
    } catch (error) {
      logger.error({ error, domain: req.params.domain }, 'Domain resolution failed');
      res.status(500).json({ found: false, error: 'Resolution failed' });
    }
  });

  // 404 handler
  app.use(notFoundHandler);

  // Error handler
  app.use(errorHandler);

  return app;
}

// ============================================================================
// SERVER STARTUP
// ============================================================================

export async function startServer(config: Partial<AppConfig> = {}): Promise<void> {
  const finalConfig = { ...defaultConfig, ...config };

  // Initialize database pool
  initializePool(finalConfig.database);

  // Create and start app
  const app = createApp(finalConfig);

  app.listen(finalConfig.port, () => {
    logger.info({
      port: finalConfig.port,
      env: finalConfig.env,
      database: finalConfig.database.host
    }, 'Scholarly Hosting server started');

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 Scholarly Hosting Server                             ║
║                                                           ║
║   Port:     ${String(finalConfig.port).padEnd(45)}║
║   Env:      ${finalConfig.env.padEnd(45)}║
║   Database: ${(finalConfig.database.host ?? 'localhost').padEnd(45)}║
║                                                           ║
║   Endpoints:                                              ║
║   • GET  /health                                          ║
║   • GET  /ready                                           ║
║   • POST /api/hosting/providers                           ║
║   • GET  /api/hosting/providers/:id                       ║
║   • POST /api/agent/search/providers                      ║
║   • GET  /api/agent/providers/:id                         ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export { createApp, startServer };
export * from './types';
export * from './services';
export * from './repositories';
export * from './routes';
export * from './infrastructure';
