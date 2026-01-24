/**
 * CSRF Protection Middleware
 *
 * Uses double-submit cookie pattern:
 * 1. Server sets a random CSRF token in a cookie
 * 2. Client includes the token in a header (X-CSRF-Token) or body (_csrf)
 * 3. Server validates that cookie token matches header/body token
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { log } from '../lib/logger';
import { ScholarlyApiError } from '../errors/scholarly-error';

// CSRF token configuration
const CSRF_COOKIE_NAME = 'csrf_token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_BODY_FIELD = '_csrf';
const TOKEN_LENGTH = 32;
const TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Methods that should be protected
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Paths that should skip CSRF (webhooks, etc.)
const SKIP_PATHS = [
  '/api/v1/webhooks/',
  '/api/v1/auth/refresh', // Uses httpOnly refresh token
];

// Generate a cryptographically secure CSRF token
function generateToken(): string {
  return crypto.randomBytes(TOKEN_LENGTH).toString('hex');
}

// Parse token from cookie
function getTokenFromCookie(req: Request): string | null {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`${CSRF_COOKIE_NAME}=([^;]+)`));
  return match ? match[1] : null;
}

// Parse token from request (header or body)
function getTokenFromRequest(req: Request): string | null {
  // Check header first
  const headerToken = req.headers[CSRF_HEADER_NAME] as string;
  if (headerToken) return headerToken;

  // Check body
  const bodyToken = req.body?.[CSRF_BODY_FIELD];
  if (bodyToken) return bodyToken;

  return null;
}

// Validate origin header
function validateOrigin(req: Request): boolean {
  const origin = req.headers.origin;
  const referer = req.headers.referer;

  // Allow if no origin (same-origin requests)
  if (!origin && !referer) return true;

  const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',');

  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed.trim()))) {
    return true;
  }

  if (referer && allowedOrigins.some(allowed => referer.startsWith(allowed.trim()))) {
    return true;
  }

  return false;
}

/**
 * Set CSRF token cookie on response
 */
export function setCsrfToken(req: Request, res: Response): string {
  const token = generateToken();

  res.cookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be readable by JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: TOKEN_EXPIRY_MS,
    path: '/',
  });

  // Also set in response header for SPA convenience
  res.setHeader('X-CSRF-Token', token);

  return token;
}

/**
 * CSRF protection middleware
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  // Skip for safe methods
  if (!PROTECTED_METHODS.includes(req.method)) {
    return next();
  }

  // Skip for excluded paths
  if (SKIP_PATHS.some(path => req.path.startsWith(path))) {
    return next();
  }

  // Validate origin first
  if (!validateOrigin(req)) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
               req.socket.remoteAddress || 'unknown';
    const origin = req.headers.origin || req.headers.referer || 'unknown';

    log.security.csrfFailed(ip, origin);

    const error = new ScholarlyApiError('AUTH_008', {
      reason: 'Invalid origin',
    });
    res.status(error.statusCode).json(error.toResponse((req as any).id || 'unknown'));
    return;
  }

  // Get tokens
  const cookieToken = getTokenFromCookie(req);
  const requestToken = getTokenFromRequest(req);

  // Both must be present
  if (!cookieToken || !requestToken) {
    const error = new ScholarlyApiError('AUTH_008', {
      reason: 'Missing CSRF token',
    });
    res.status(error.statusCode).json(error.toResponse((req as any).id || 'unknown'));
    return;
  }

  // Tokens must match
  if (!crypto.timingSafeEqual(Buffer.from(cookieToken), Buffer.from(requestToken))) {
    const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
               req.socket.remoteAddress || 'unknown';

    log.security.csrfFailed(ip, 'token_mismatch');

    const error = new ScholarlyApiError('AUTH_008', {
      reason: 'CSRF token mismatch',
    });
    res.status(error.statusCode).json(error.toResponse((req as any).id || 'unknown'));
    return;
  }

  // Token valid, continue
  next();
}

/**
 * Middleware to generate initial CSRF token
 * Should be called on initial page load or auth endpoints
 */
export function generateCsrfToken(req: Request, res: Response, next: NextFunction): void {
  // Only generate if not already present
  const existingToken = getTokenFromCookie(req);
  if (!existingToken) {
    setCsrfToken(req, res);
  }
  next();
}

/**
 * Route handler to get a new CSRF token
 * GET /api/v1/csrf-token
 */
export function csrfTokenEndpoint(req: Request, res: Response): void {
  const token = setCsrfToken(req, res);
  res.json({ csrfToken: token });
}
