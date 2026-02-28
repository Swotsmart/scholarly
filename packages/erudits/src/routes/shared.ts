/**
 * ============================================================================
 * Route Infrastructure — Shared Middleware & Helpers
 * ============================================================================
 *
 * Express middleware types and response utilities used by all route files.
 * The actual Express dependency is minimal — we define our own Request/Response
 * shapes so routes compile without installing Express during dev.
 *
 * @module erudits/routes/shared
 */

import type { Result } from '../types/erudits.types';

// ============================================================================
// EXPRESS-LIKE TYPES (avoids hard dependency during compilation)
// ============================================================================

export interface RouteRequest {
  params: Record<string, string>;
  query: Record<string, string | string[] | undefined>;
  body: Record<string, unknown>;
  user?: AuthenticatedUser | undefined;
  tenantId?: string | undefined;
}

export interface RouteResponse {
  status(code: number): RouteResponse;
  json(data: unknown): void;
  send(data?: unknown): void;
}

export type NextFunction = (err?: unknown) => void;
export type RouteHandler = (req: RouteRequest, res: RouteResponse, next: NextFunction) => Promise<void>;

// ============================================================================
// AUTHENTICATION
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  tenantId: string;
  roles: string[];
}

/**
 * Extracts the authenticated user from the request.
 * In production, this is populated by JWT middleware upstream.
 * Routes call this and get a clean user object or throw 401.
 */
export function requireAuth(req: RouteRequest): AuthenticatedUser {
  if (!req.user) {
    throw new HttpError(401, 'Authentication required');
  }
  return req.user;
}

export function requireTenantId(req: RouteRequest): string {
  const tenantId = req.tenantId || req.user?.tenantId;
  if (!tenantId) {
    throw new HttpError(400, 'Tenant ID required');
  }
  return tenantId;
}

/** Extract a required route parameter, throwing 400 if missing. */
export function requireParam(req: RouteRequest, name: string): string {
  const value = req.params[name];
  if (!value) throw new HttpError(400, `Missing required route parameter: ${name}`);
  return value;
}

/**
 * Require the user to have at least one of the specified roles.
 */
export function requireRole(user: AuthenticatedUser, ...roles: string[]): void {
  const hasRole = roles.some(r => user.roles.includes(r));
  if (!hasRole) {
    throw new HttpError(403, `Requires one of: ${roles.join(', ')}`);
  }
}

// ============================================================================
// HTTP ERROR
// ============================================================================

export class HttpError extends Error {
  constructor(public readonly statusCode: number, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

// ============================================================================
// RESULT → HTTP RESPONSE
// ============================================================================

/**
 * Convert a Result<T> from a service call into an HTTP response.
 * Success → 200 (or custom code) with JSON body.
 * Failure → appropriate HTTP status with error message.
 */
export function sendResult<T>(res: RouteResponse, result: Result<T>, successCode = 200): void {
  if (result.success) {
    if (successCode === 204) {
      res.status(204).send();
    } else {
      res.status(successCode).json({ data: result.data });
    }
  } else {
    const statusCode = mapErrorToStatus(result.error.code);
    res.status(statusCode).json({
      error: {
        code: result.error.code,
        message: result.error.message,
        details: result.error.details,
      },
    });
  }
}

function mapErrorToStatus(code: string): number {
  switch (code) {
    case 'NOT_FOUND': return 404;
    case 'VALIDATION_ERROR': return 422;
    case 'UNAUTHORIZED': return 401;
    case 'FORBIDDEN': return 403;
    case 'CONFLICT': return 409;
    case 'RATE_LIMITED': return 429;
    default: return 500;
  }
}

// ============================================================================
// PAGINATION HELPER
// ============================================================================

/**
 * Extract pagination params from query string.
 */
export function parsePagination(query: Record<string, string | string[] | undefined>): {
  page: number;
  pageSize: number;
} {
  const page = Math.max(1, parseInt(String(query.page ?? '1'), 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(String(query.pageSize ?? '20'), 10) || 20));
  return { page, pageSize };
}

// ============================================================================
// ASYNC HANDLER WRAPPER
// ============================================================================

/**
 * Wraps an async route handler so thrown errors get passed to Express's
 * error handler instead of crashing the process.
 */
export function asyncHandler(fn: RouteHandler): RouteHandler {
  return async (req, res, next) => {
    try {
      await fn(req, res, next);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.statusCode).json({ error: { message: err.message } });
      } else {
        next(err);
      }
    }
  };
}
