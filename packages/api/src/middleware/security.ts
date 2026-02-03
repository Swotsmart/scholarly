/**
 * Scholarly Security Middleware
 *
 * Enhanced security middleware for the BFF layer.
 * Includes request validation, security headers, and webhook verification.
 *
 * @module SecurityMiddleware
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import crypto from 'crypto';
import { log } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

export interface SecurityConfig {
  maxRequestSize: string;
  allowedContentTypes: string[];
  trustedProxies: string[];
  stripeWebhookSecret?: string;
  stripeWebhookIps?: string[];
  enableRequestId: boolean;
  enableSecurityHeaders: boolean;
  csrfProtection: boolean;
  rateLimitEnabled: boolean;
}

export interface RequestWithId extends Request {
  requestId?: string;
  startTime?: number;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: SecurityConfig = {
  maxRequestSize: '10mb',
  allowedContentTypes: [
    'application/json',
    'application/x-www-form-urlencoded',
    'multipart/form-data',
    'text/plain',
  ],
  trustedProxies: ['loopback', 'linklocal', 'uniquelocal'],
  enableRequestId: true,
  enableSecurityHeaders: true,
  csrfProtection: true,
  rateLimitEnabled: true,
};

// Stripe webhook IP ranges (as of 2024)
// See: https://stripe.com/docs/ips
const STRIPE_WEBHOOK_IPS = [
  '3.18.12.63',
  '3.130.192.231',
  '13.235.14.237',
  '13.235.122.149',
  '18.211.135.69',
  '35.154.171.200',
  '52.15.183.38',
  '54.88.130.119',
  '54.88.130.237',
  '54.187.174.169',
  '54.187.205.235',
  '54.187.216.72',
];

// ============================================================================
// REQUEST ID MIDDLEWARE
// ============================================================================

/**
 * Adds a unique request ID to each request for tracing
 */
export function requestIdMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const reqWithId = req as RequestWithId;
    // Use existing ID from header or generate new one
    const requestId = req.headers['x-request-id'] as string ||
                      req.headers['x-correlation-id'] as string ||
                      generateRequestId();

    reqWithId.requestId = requestId;
    reqWithId.startTime = Date.now();

    // Set response headers
    res.setHeader('X-Request-Id', requestId);

    // Add to response locals for logging
    res.locals.requestId = requestId;

    next();
  };
}

function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${crypto.randomBytes(8).toString('hex')}`;
}

// ============================================================================
// SECURITY HEADERS MIDDLEWARE
// ============================================================================

/**
 * Adds security headers to all responses
 */
export function securityHeadersMiddleware(): RequestHandler {
  return (_req: Request, res: Response, next: NextFunction) => {
    // Prevent clickjacking
    res.setHeader('X-Frame-Options', 'DENY');

    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // Enable XSS filter
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Enforce HTTPS
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

    // Control referrer information
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Restrict browser features
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

    // Prevent DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');

    // Disable caching for API responses
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    // Remove server identification
    res.removeHeader('X-Powered-By');

    next();
  };
}

// ============================================================================
// CONTENT TYPE VALIDATION MIDDLEWARE
// ============================================================================

/**
 * Validates Content-Type header for requests with bodies
 */
export function contentTypeValidationMiddleware(
  allowedTypes: string[] = DEFAULT_CONFIG.allowedContentTypes
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Skip for requests without body
    if (['GET', 'HEAD', 'OPTIONS', 'DELETE'].includes(req.method)) {
      return next();
    }

    const contentType = req.headers['content-type'];

    if (!contentType) {
      log.warn('Request missing Content-Type header', {
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: 'Content-Type header is required',
      });
    }

    // Extract base content type (without charset, boundary, etc.)
    const baseType = contentType.split(';')[0].trim().toLowerCase();

    if (!allowedTypes.some(allowed => baseType.includes(allowed.toLowerCase()))) {
      log.warn('Invalid Content-Type', {
        contentType,
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      return res.status(415).json({
        error: 'Unsupported Media Type',
        message: `Content-Type '${baseType}' is not supported`,
        allowedTypes,
      });
    }

    next();
  };
}

// ============================================================================
// REQUEST SIZE LIMIT MIDDLEWARE
// ============================================================================

/**
 * Enforces maximum request body size
 */
export function requestSizeLimitMiddleware(maxSize: string = '10mb'): RequestHandler {
  const maxBytes = parseSize(maxSize);

  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);

    if (contentLength > maxBytes) {
      log.warn('Request body too large', {
        contentLength,
        maxBytes,
        method: req.method,
        path: req.path,
        ip: req.ip,
      });
      return res.status(413).json({
        error: 'Payload Too Large',
        message: `Request body exceeds maximum size of ${maxSize}`,
        maxSize,
      });
    }

    next();
  };
}

function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(b|kb|mb|gb)?$/);
  if (!match) throw new Error(`Invalid size format: ${size}`);

  const value = parseFloat(match[1]);
  const unit = match[2] || 'b';

  return Math.floor(value * units[unit]);
}

// ============================================================================
// STRIPE WEBHOOK SECURITY
// ============================================================================

/**
 * Verifies Stripe webhook signatures
 */
export function stripeWebhookMiddleware(webhookSecret?: string): RequestHandler {
  const secret = webhookSecret || process.env.STRIPE_WEBHOOK_SECRET;

  return (req: Request, res: Response, next: NextFunction) => {
    if (!secret) {
      log.error('Stripe webhook secret not configured');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Webhook verification not configured',
      });
    }

    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      log.warn('Missing Stripe signature', { ip: req.ip, path: req.path });
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing webhook signature',
      });
    }

    // Get raw body for signature verification
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody;

    if (!rawBody) {
      log.error('Raw body not available for Stripe webhook verification');
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Unable to verify webhook signature',
      });
    }

    try {
      // Parse Stripe signature header
      const elements = signature.split(',').reduce((acc, element) => {
        const [key, value] = element.split('=');
        acc[key] = value;
        return acc;
      }, {} as Record<string, string>);

      const timestamp = elements['t'];
      const v1Signature = elements['v1'];

      if (!timestamp || !v1Signature) {
        throw new Error('Invalid signature format');
      }

      // Check timestamp is within tolerance (5 minutes)
      const webhookTimestamp = parseInt(timestamp, 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      const tolerance = 300; // 5 minutes

      if (Math.abs(currentTimestamp - webhookTimestamp) > tolerance) {
        log.warn('Stripe webhook timestamp out of tolerance', {
          webhookTimestamp,
          currentTimestamp,
          diff: currentTimestamp - webhookTimestamp,
        });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Webhook timestamp out of tolerance',
        });
      }

      // Compute expected signature
      const signedPayload = `${timestamp}.${rawBody.toString('utf8')}`;
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(signedPayload)
        .digest('hex');

      // Constant-time comparison to prevent timing attacks
      if (!crypto.timingSafeEqual(
        Buffer.from(v1Signature),
        Buffer.from(expectedSignature)
      )) {
        log.warn('Stripe webhook signature mismatch', { ip: req.ip });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid webhook signature',
        });
      }

      // Attach timestamp to request for use in handler
      (req as unknown as { stripeTimestamp: number }).stripeTimestamp = webhookTimestamp;

      next();
    } catch (error) {
      log.error('Stripe webhook verification failed', error as Error);
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Webhook signature verification failed',
      });
    }
  };
}

/**
 * IP allowlist for Stripe webhooks
 */
export function stripeIpAllowlistMiddleware(
  allowedIps: string[] = STRIPE_WEBHOOK_IPS
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    // Get real IP (considering proxies)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = forwardedFor
      ? (Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor.split(',')[0]).trim()
      : req.ip || req.socket.remoteAddress;

    if (!ip) {
      log.warn('Unable to determine client IP for Stripe webhook');
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Unable to verify request origin',
      });
    }

    // In development, allow all IPs
    if (process.env.NODE_ENV === 'development') {
      return next();
    }

    if (!allowedIps.includes(ip)) {
      log.warn('Stripe webhook from unauthorized IP', { ip, path: req.path });
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request from unauthorized IP address',
      });
    }

    next();
  };
}

// ============================================================================
// REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Logs requests and responses with timing information
 */
export function requestLoggingMiddleware(): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const reqWithId = req as RequestWithId;
    const startTime = reqWithId.startTime || Date.now();

    // Log request
    log.info('Incoming request', {
      requestId: reqWithId.requestId,
      method: req.method,
      path: req.path,
      query: Object.keys(req.query).length > 0 ? req.query : undefined,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      contentLength: req.headers['content-length'],
    });

    // Capture response finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const level = res.statusCode >= 400 ? 'warn' : 'info';

      log[level]('Request completed', {
        requestId: reqWithId.requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        contentLength: res.getHeader('content-length'),
      });
    });

    next();
  };
}

// ============================================================================
// INPUT SANITIZATION
// ============================================================================

/**
 * Sanitizes common attack patterns from request inputs
 */
export function inputSanitizationMiddleware(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query) as typeof req.query;
    }

    // Sanitize body (if JSON)
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize params
    if (req.params) {
      req.params = sanitizeObject(req.params) as Record<string, string>;
    }

    next();
  };
}

function sanitizeObject(obj: unknown): unknown {
  if (typeof obj !== 'object' || obj === null) {
    return sanitizeValue(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip keys that might be prototype pollution attempts
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    sanitized[key] = sanitizeObject(value);
  }

  return sanitized;
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }

  // Remove null bytes
  let sanitized = value.replace(/\0/g, '');

  // Trim excessive whitespace
  sanitized = sanitized.trim();

  // Limit string length (prevent DoS)
  const maxLength = 10000;
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

// ============================================================================
// COMBINED SECURITY MIDDLEWARE
// ============================================================================

/**
 * Returns an array of all security middleware configured with defaults
 */
export function createSecurityMiddleware(config: Partial<SecurityConfig> = {}): RequestHandler[] {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const middleware: RequestHandler[] = [];

  if (finalConfig.enableRequestId) {
    middleware.push(requestIdMiddleware());
  }

  if (finalConfig.enableSecurityHeaders) {
    middleware.push(securityHeadersMiddleware());
  }

  middleware.push(requestSizeLimitMiddleware(finalConfig.maxRequestSize));
  middleware.push(contentTypeValidationMiddleware(finalConfig.allowedContentTypes));
  middleware.push(inputSanitizationMiddleware());
  middleware.push(requestLoggingMiddleware());

  return middleware;
}

/**
 * Middleware specifically for webhook endpoints
 */
export function createWebhookMiddleware(type: 'stripe'): RequestHandler[] {
  switch (type) {
    case 'stripe':
      return [
        requestIdMiddleware(),
        securityHeadersMiddleware(),
        stripeIpAllowlistMiddleware(),
        stripeWebhookMiddleware(),
        requestLoggingMiddleware(),
      ];
    default:
      throw new Error(`Unknown webhook type: ${type}`);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  DEFAULT_CONFIG,
  STRIPE_WEBHOOK_IPS,
};
