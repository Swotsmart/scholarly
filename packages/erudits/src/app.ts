/**
 * ============================================================================
 * Express Application — The Front Door
 * ============================================================================
 *
 * This is where all the routes, middleware, and error handling converge into
 * a single Express application. Think of app.ts as the building's lobby:
 * every request walks in through the front door, gets checked by security
 * (auth middleware), directed to the right floor (route groups), and shown
 * out with a properly formatted response.
 *
 * The application is configured but NOT started here — that happens in
 * server.ts, which handles the Prisma client, DI wiring, and process
 * lifecycle. This separation means the app can be imported by supertest
 * in integration tests without actually starting a listener.
 *
 * ## Route Map
 *   /api/v1/migration/*     → Squarespace migration endpoints
 *   /api/v1/storefront/*    → Resource marketplace endpoints
 *   /api/v1/publishing/*    → Manuscript & publishing endpoints
 *   /api/v1/bookclub/*      → Book club management endpoints
 *   /api/v1/webhooks/stripe → Stripe webhook handler (raw body)
 *   /health                 → Health check (no auth)
 *
 * @module erudits/app
 * @version 1.0.0
 */

import express, { Request, Response, NextFunction, Router } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';

import type { ServiceError } from './types/erudits.types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * The authenticated request shape. After the auth middleware runs,
 * req.user is guaranteed to contain the authenticated user's details.
 */
export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
  name?: string | undefined;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser | undefined;
      rawBody?: Buffer;  // For Stripe webhook signature verification
    }
  }
}

/**
 * Route group factory type. Each domain exports a function that accepts
 * its service and returns an array of Express route handlers.
 * The app.ts file doesn't need to know the internals of any domain —
 * it just mounts whatever the factory returns.
 */
export type RouteFactory = () => Router;

// ============================================================================
// APPLICATION FACTORY
// ============================================================================

export interface AppDependencies {
  /** Route group factories — each returns a Router with its endpoints. */
  migrationRoutes: Router;
  storefrontRoutes: Router;
  publishingRoutes: Router;
  bookclubRoutes: Router;

  /** Stripe webhook handler needs raw body + separate auth. */
  stripeWebhookHandler: (req: Request, res: Response) => Promise<void>;

  /** JWT verification function. Returns null if invalid. */
  verifyToken: (token: string) => Promise<AuthenticatedUser | null>;

  /** Allowed CORS origins. */
  corsOrigins: string[];
}

export function createApp(deps: AppDependencies): express.Application {
  const app = express();

  // ── Global Middleware ──

  // Security headers — helmet is the bouncer that adds CSP, HSTS, etc.
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'", 'https://api.stripe.com'],
      },
    },
  }));

  // CORS — allow the web frontend and mobile apps to talk to us
  app.use(cors({
    origin: deps.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    maxAge: 86400, // 24 hours preflight cache
  }));

  // Compression — gzip responses for bandwidth savings
  app.use(compression());

  // ── Stripe Webhook Route (BEFORE json parser — needs raw body) ──
  app.post(
    '/api/v1/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    (req: Request, _res: Response, next: NextFunction) => {
      req.rawBody = req.body as Buffer;
      next();
    },
    async (req: Request, res: Response) => {
      try {
        await deps.stripeWebhookHandler(req, res);
      } catch (err) {
        console.error('[Stripe Webhook] Unhandled error:', (err as Error).message);
        res.status(500).json({ error: 'Webhook processing failed' });
      }
    },
  );

  // ── JSON Body Parser (after Stripe webhook to preserve raw body) ──
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // ── Request Logging ──
  app.use((req: Request, _res: Response, next: NextFunction) => {
    const start = Date.now();
    const originalEnd = _res.end;

    _res.end = function (this: Response, ...args: unknown[]) {
      const duration = Date.now() - start;
      console.log(
        `[${new Date().toISOString()}] ${req.method} ${req.path} → ${_res.statusCode} (${duration}ms)`,
      );
      return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
    } as typeof _res.end;

    next();
  });

  // ── Health Check (no auth) ──
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      version: process.env.APP_VERSION || '2.4.0',
      timestamp: new Date().toISOString(),
    });
  });

  // ── Authentication Middleware for /api/* ──
  app.use('/api', createAuthMiddleware(deps.verifyToken));

  // ── API Route Groups ──
  app.use('/api/v1/migration', deps.migrationRoutes);
  app.use('/api/v1/storefront', deps.storefrontRoutes);
  app.use('/api/v1/publishing', deps.publishingRoutes);
  app.use('/api/v1/bookclub', deps.bookclubRoutes);

  // ── 404 Handler ──
  app.use((_req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route not found: ${_req.method} ${_req.path}`,
      },
    });
  });

  // ── Global Error Handler ──
  app.use(globalErrorHandler);

  return app;
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

/**
 * JWT authentication middleware. Extracts the Bearer token from the
 * Authorization header, verifies it, and populates req.user.
 *
 * The actual JWT verification is injected — in production it calls
 * the Scholarly auth service; in tests it can be a mock that always
 * returns a test user.
 */
function createAuthMiddleware(
  verifyToken: (token: string) => Promise<AuthenticatedUser | null>,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or invalid Authorization header',
        },
      });
      return;
    }

    const token = authHeader.substring(7); // Strip 'Bearer '

    try {
      const user = await verifyToken(token);
      if (!user) {
        res.status(401).json({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Invalid or expired token',
          },
        });
        return;
      }

      req.user = user;

      // Also check X-Tenant-ID header if present (admin multi-tenant access)
      const tenantHeader = req.headers['x-tenant-id'] as string | undefined;
      if (tenantHeader && user.roles.includes('platform_admin')) {
        req.user = { ...user, tenantId: tenantHeader };
      }

      next();
    } catch (err) {
      console.error('[Auth] Token verification error:', (err as Error).message);
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Token verification failed',
        },
      });
    }
  };
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

/**
 * Global error handler. Catches anything that slips past the route-level
 * asyncHandler() wrappers. Formats errors consistently and never leaks
 * stack traces to the client in production.
 */
function globalErrorHandler(
  err: Error & Partial<ServiceError>,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  console.error('[Error]', err.message, err.stack);

  const statusCode = err.httpStatus || 500;
  const errorCode = err.code || 'INTERNAL_ERROR';
  const message = statusCode === 500 && process.env.NODE_ENV === 'production'
    ? 'An unexpected error occurred'
    : err.message;

  res.status(statusCode).json({
    error: {
      code: errorCode,
      message,
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
  });
}
