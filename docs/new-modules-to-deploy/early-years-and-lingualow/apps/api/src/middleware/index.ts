/**
 * Scholarly Platform - Middleware Stack
 * 
 * Production-grade Express middleware for:
 * - JWT authentication with refresh token rotation
 * - Request validation with Zod
 * - Rate limiting (Redis-backed)
 * - Error handling with structured responses
 * - Request logging with correlation IDs
 * - Security headers
 * 
 * @module @scholarly/api/middleware
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ZodType } from 'zod';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { RateLimiterRedis, RateLimiterMemory, RateLimiterAbstract } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import pino from 'pino';
import pinoHttp from 'pino-http';

import {
  ScholarlyError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  RateLimitError,
  RequestContext,
} from '@scholarly/shared';

// =============================================================================
// TYPES
// =============================================================================

export interface JWTPayload {
  userId: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  tokenType: 'access' | 'refresh';
  iat: number;
  exp: number;
}

export interface AuthenticatedRequest extends Request {
  context: RequestContext;
  user: JWTPayload;
}

export interface MiddlewareConfig {
  jwtSecret: string;
  jwtAccessExpiresIn: string;
  jwtRefreshExpiresIn: string;
  redisUrl?: string;
  rateLimitPoints: number;
  rateLimitDuration: number;
  logLevel: string;
}

// =============================================================================
// LOGGER
// =============================================================================

const createLogger = (level: string) => pino({
  level,
  transport: process.env.NODE_ENV === 'development'
    ? { target: 'pino-pretty', options: { colorize: true } }
    : undefined,
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

let logger = createLogger('info');

export const createRequestLogger = (config: { level: string }) => {
  logger = createLogger(config.level);
  
  return pinoHttp({
    logger,
    genReqId: (req) => (req as AuthenticatedRequest).context?.requestId || uuidv4(),
    customProps: (req) => ({
      tenantId: (req as AuthenticatedRequest).context?.tenantId,
      userId: (req as AuthenticatedRequest).context?.userId,
    }),
    autoLogging: {
      ignore: (req) => req.url === '/health' || req.url === '/ready',
    },
  });
};

export { logger };

// =============================================================================
// REQUEST CONTEXT
// =============================================================================

export const requestContext: RequestHandler = (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  
  res.setHeader('x-request-id', requestId);
  
  authReq.context = {
    requestId,
    tenantId: '',
    roles: [],
    permissions: [],
    startTime: Date.now(),
  };
  
  next();
};

// =============================================================================
// AUTHENTICATION
// =============================================================================

export const createAuthMiddleware = (config: MiddlewareConfig) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;
    
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError('Missing or invalid authorization header');
      }
      
      const token = authHeader.substring(7);
      const payload = jwt.verify(token, config.jwtSecret) as JWTPayload;
      
      if (payload.tokenType !== 'access') {
        throw new AuthenticationError('Invalid token type');
      }
      
      authReq.user = payload;
      authReq.context = {
        ...authReq.context,
        tenantId: payload.tenantId,
        userId: payload.userId,
        roles: payload.roles,
        permissions: payload.permissions,
        sessionId: payload.sessionId,
      };
      
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        next(new AuthenticationError('Token has expired'));
      } else if (error instanceof jwt.JsonWebTokenError) {
        next(new AuthenticationError('Invalid token'));
      } else {
        next(error);
      }
    }
  };
};

export const createOptionalAuthMiddleware = (config: MiddlewareConfig) => {
  const authMiddleware = createAuthMiddleware(config);
  
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.headers.authorization) {
      return next();
    }
    
    await authMiddleware(req, res, (err) => {
      if (err instanceof AuthenticationError) {
        return next();
      }
      next(err);
    });
  };
};

// =============================================================================
// AUTHORIZATION
// =============================================================================

export const requireRoles = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    const hasRole = roles.some(role => authReq.user.roles.includes(role));
    
    if (!hasRole) {
      return next(new AuthorizationError(`Required role: ${roles.join(' or ')}`));
    }
    
    next();
  };
};

export const requirePermissions = (...permissions: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    
    if (!authReq.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    const missing = permissions.filter(p => !authReq.user.permissions.includes(p));
    
    if (missing.length > 0) {
      return next(new AuthorizationError(`Missing permissions: ${missing.join(', ')}`));
    }
    
    next();
  };
};

export const requireTenantMatch = (param: string = 'tenantId'): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const requestedTenantId = req.params[param] || req.body?.tenantId;
    
    if (!authReq.user) {
      return next(new AuthenticationError('Authentication required'));
    }
    
    if (requestedTenantId && requestedTenantId !== authReq.user.tenantId) {
      return next(new AuthorizationError('Access denied to this tenant'));
    }
    
    next();
  };
};

// =============================================================================
// VALIDATION
// =============================================================================

export const validateBody = <T>(schema: ZodType<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    
    if (!result.success) {
      const fields = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError('Validation failed', fields));
    }
    
    req.body = result.data;
    next();
  };
};

export const validateQuery = <T>(schema: ZodType<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    
    if (!result.success) {
      const fields = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError('Invalid query parameters', fields));
    }
    
    (req as any).validatedQuery = result.data;
    next();
  };
};

export const validateParams = <T>(schema: ZodType<T>): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    
    if (!result.success) {
      const fields = result.error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message,
      }));
      return next(new ValidationError('Invalid path parameters', fields));
    }
    
    (req as any).validatedParams = result.data;
    next();
  };
};

// =============================================================================
// RATE LIMITING
// =============================================================================

let rateLimiter: RateLimiterAbstract;

export const createRateLimiter = (config: MiddlewareConfig) => {
  if (config.redisUrl) {
    const redisClient = new Redis(config.redisUrl);
    rateLimiter = new RateLimiterRedis({
      storeClient: redisClient,
      keyPrefix: 'rl:',
      points: config.rateLimitPoints,
      duration: config.rateLimitDuration,
    });
  } else {
    rateLimiter = new RateLimiterMemory({
      points: config.rateLimitPoints,
      duration: config.rateLimitDuration,
    });
  }
  
  return rateLimiter;
};

export const rateLimit: RequestHandler = async (req, res, next) => {
  if (!rateLimiter) {
    return next();
  }
  
  const authReq = req as AuthenticatedRequest;
  const key = authReq.user?.userId || req.ip || 'anonymous';
  
  try {
    const result = await rateLimiter.consume(key);
    
    res.setHeader('X-RateLimit-Limit', rateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
    res.setHeader('X-RateLimit-Reset', new Date(Date.now() + result.msBeforeNext).toISOString());
    
    next();
  } catch (rateLimiterRes: any) {
    const retryAfter = Math.ceil(rateLimiterRes.msBeforeNext / 1000);
    res.setHeader('Retry-After', retryAfter);
    res.setHeader('X-RateLimit-Limit', rateLimiter.points);
    res.setHeader('X-RateLimit-Remaining', 0);
    
    next(new RateLimitError(retryAfter));
  }
};

export const createCustomRateLimiter = (points: number, duration: number) => {
  const limiter = new RateLimiterMemory({ points, duration });
  
  return async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    const key = authReq.user?.userId || req.ip || 'anonymous';
    
    try {
      await limiter.consume(key);
      next();
    } catch {
      next(new RateLimitError(duration));
    }
  };
};

// =============================================================================
// ERROR HANDLING
// =============================================================================

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    fields?: Array<{ field: string; message: string }>;
    requestId?: string;
    timestamp: string;
  };
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authReq = req as AuthenticatedRequest;
  const requestId = authReq.context?.requestId;
  
  // Log error
  logger.error({
    err,
    requestId,
    method: req.method,
    url: req.url,
    userId: authReq.context?.userId,
    tenantId: authReq.context?.tenantId,
  }, 'Request error');
  
  // Build response
  let statusCode = 500;
  let errorResponse: ErrorResponse;
  
  if (err instanceof ScholarlyError) {
    statusCode = err.statusCode;
    errorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
        requestId,
        timestamp: err.timestamp.toISOString(),
      },
    };
    
    if (err instanceof ValidationError && err.fields) {
      errorResponse.error.fields = err.fields;
    }
  } else {
    // Generic error - don't expose internals in production
    const message = process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred'
      : err.message;
    
    errorResponse = {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message,
        requestId,
        timestamp: new Date().toISOString(),
      },
    };
  }
  
  res.status(statusCode).json(errorResponse);
};

export const notFoundHandler: RequestHandler = (req, res, next) => {
  next(new ScholarlyError('NOT_FOUND', `Route not found: ${req.method} ${req.path}`, 404));
};

// =============================================================================
// SECURITY
// =============================================================================

export const securityHeaders: RequestHandler = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS filter
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Strict transport security (if HTTPS)
  if (req.secure || req.headers['x-forwarded-proto'] === 'https') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  // Remove X-Powered-By
  res.removeHeader('X-Powered-By');
  
  next();
};

// =============================================================================
// TENANT CONTEXT
// =============================================================================

export const extractTenantFromHeader: RequestHandler = (req, res, next) => {
  const authReq = req as AuthenticatedRequest;
  const tenantId = req.headers['x-tenant-id'] as string;
  
  if (tenantId && authReq.context) {
    authReq.context.tenantId = tenantId;
  }
  
  next();
};

// =============================================================================
// CORS CONFIGURATION
// =============================================================================

export const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'];
    
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Tenant-ID'],
  exposedHeaders: ['X-Request-ID', 'X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
  maxAge: 86400,
};

// =============================================================================
// ASYNC HANDLER WRAPPER
// =============================================================================

type AsyncRequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<any>;

export const asyncHandler = (fn: AsyncRequestHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// =============================================================================
// RESPONSE HELPERS
// =============================================================================

export interface SuccessResponse<T> {
  success: true;
  data: T;
  meta?: {
    requestId?: string;
    timestamp: string;
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasMore: boolean;
    };
  };
}

export const sendSuccess = <T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  meta?: Partial<SuccessResponse<T>['meta']>
): void => {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    meta: {
      ...meta,
      timestamp: new Date().toISOString(),
    },
  };
  
  res.status(statusCode).json(response);
};

export const sendCreated = <T>(res: Response, data: T, meta?: Partial<SuccessResponse<T>['meta']>): void => {
  sendSuccess(res, data, 201, meta);
};

export const sendNoContent = (res: Response): void => {
  res.status(204).send();
};
