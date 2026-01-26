/**
 * Scholarly Platform - Express Application
 * 
 * Main Express application setup with:
 * - Middleware configuration
 * - Route mounting
 * - Health check endpoints
 * - Prometheus metrics
 * 
 * @module @scholarly/api
 */

import express, { Application, Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import { collectDefaultMetrics, Registry, Counter, Histogram } from 'prom-client';

import {
  requestContext,
  createRequestLogger,
  createAuthMiddleware,
  createRateLimiter,
  rateLimit,
  securityHeaders,
  errorHandler,
  notFoundHandler,
  corsOptions,
  MiddlewareConfig,
} from './middleware/index.js';

import { authRouter } from './routes/auth.routes.js';
import { earlyYearsRouter } from './routes/early-years.routes.js';
import { linguaFlowRouter } from './routes/linguaflow.routes.js';

// =============================================================================
// METRICS
// =============================================================================

const register = new Registry();

// Default Node.js metrics
collectDefaultMetrics({ register });

// Custom metrics
const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [register],
});

const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  registers: [register],
});

// =============================================================================
// APPLICATION FACTORY
// =============================================================================

export interface AppConfig extends MiddlewareConfig {
  enableMetrics: boolean;
  trustProxy: boolean;
}

export function createApp(config: AppConfig): Application {
  const app = express();
  
  // Trust proxy (for rate limiting, IP detection behind load balancer)
  if (config.trustProxy) {
    app.set('trust proxy', 1);
  }
  
  // ==========================================================================
  // PRE-ROUTE MIDDLEWARE
  // ==========================================================================
  
  // Security headers (Helmet)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  }));
  
  // Additional security headers
  app.use(securityHeaders);
  
  // CORS
  app.use(cors(corsOptions));
  
  // Compression
  app.use(compression());
  
  // Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  
  // Request context (correlation ID, timing)
  app.use(requestContext);
  
  // Request logging
  app.use(createRequestLogger({ level: config.logLevel }));
  
  // Initialize rate limiter
  createRateLimiter(config);
  
  // ==========================================================================
  // HEALTH & METRICS ENDPOINTS (No auth required)
  // ==========================================================================
  
  /**
   * Health check endpoint
   * Returns 200 if the service is running
   */
  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
    });
  });
  
  /**
   * Readiness check endpoint
   * Returns 200 if the service is ready to accept requests
   * This should check database connectivity, etc.
   */
  app.get('/ready', async (req: Request, res: Response) => {
    try {
      // In production, add checks for:
      // - Database connectivity
      // - Redis connectivity
      // - External service dependencies
      
      res.json({
        status: 'ready',
        timestamp: new Date().toISOString(),
        checks: {
          database: 'ok',
          redis: 'ok',
        },
      });
    } catch (error) {
      res.status(503).json({
        status: 'not_ready',
        timestamp: new Date().toISOString(),
        error: (error as Error).message,
      });
    }
  });
  
  /**
   * Prometheus metrics endpoint
   */
  if (config.enableMetrics) {
    app.get('/metrics', async (req: Request, res: Response) => {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    });
  }
  
  // ==========================================================================
  // METRICS COLLECTION MIDDLEWARE
  // ==========================================================================
  
  if (config.enableMetrics) {
    app.use((req, res, next) => {
      const start = Date.now();
      
      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const path = req.route?.path || req.path;
        
        httpRequestsTotal.inc({
          method: req.method,
          path,
          status: res.statusCode,
        });
        
        httpRequestDuration.observe({
          method: req.method,
          path,
          status: res.statusCode,
        }, duration);
      });
      
      next();
    });
  }
  
  // ==========================================================================
  // API ROUTES
  // ==========================================================================
  
  // Create auth middleware for protected routes
  const authMiddleware = createAuthMiddleware(config);
  
  // Public routes (no auth required)
  app.use('/api/v1/auth', authRouter);
  
  // Protected routes (auth required)
  app.use('/api/v1/early-years', authMiddleware, rateLimit, earlyYearsRouter);
  app.use('/api/v1/linguaflow', authMiddleware, rateLimit, linguaFlowRouter);
  
  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================
  
  // 404 handler
  app.use(notFoundHandler);
  
  // Global error handler
  app.use(errorHandler);
  
  return app;
}

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export function getDefaultConfig(): AppConfig {
  return {
    jwtSecret: process.env.JWT_SECRET || 'development-secret-change-in-production',
    jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    redisUrl: process.env.REDIS_URL,
    rateLimitPoints: parseInt(process.env.RATE_LIMIT_POINTS || '100', 10),
    rateLimitDuration: parseInt(process.env.RATE_LIMIT_DURATION || '60', 10),
    logLevel: process.env.LOG_LEVEL || 'info',
    enableMetrics: process.env.ENABLE_METRICS !== 'false',
    trustProxy: process.env.TRUST_PROXY === 'true',
  };
}
