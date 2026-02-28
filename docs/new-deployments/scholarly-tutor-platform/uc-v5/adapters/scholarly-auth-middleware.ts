/**
 * Scholarly Unified Communications 4.0 — Auth Middleware
 *
 * This middleware is the front door security guard for all UC endpoints.
 * Every incoming request passes through here before reaching any plugin
 * route handler. The guard checks for a valid Scholarly JWT token in the
 * Authorization header, decodes it, extracts the tenant and user info,
 * and stamps the request with a `scholarlyUser` object that plugins can
 * access via `ctx.getAuthenticatedUser(req)`.
 *
 * The middleware is configurable:
 * - Public paths (like /health) bypass authentication entirely
 * - When authConfig is not provided, the middleware is a no-op (v3.3 compat)
 * - In 'strict' tenant isolation, missing tenantId in the token = rejection
 *
 * Token format expected (Scholarly JWT payload):
 * {
 *   sub: "user-abc123",          // userId
 *   tid: "tenant-xyz789",        // tenantId
 *   role: "teacher",             // user role
 *   name: "Jane Smith",          // display name (optional)
 *   email: "jane@school.edu",    // email (optional)
 *   iss: "scholarly-auth",       // issuer
 *   aud: "scholarly-api",        // audience
 *   iat: 1709038800,             // issued at
 *   exp: 1709125200              // expiry
 * }
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import type { ScholarlyAuthConfig, TenantIsolationMode } from '../config';
import type { AuthenticatedUser } from '../core/plugin-interface';
import { createLogger } from '../utils/logger';

// Extend Express Request to carry the authenticated user
declare global {
  namespace Express {
    interface Request {
      scholarlyUser?: AuthenticatedUser;
    }
  }
}

const logger = createLogger('ScholarlyAuth');

/**
 * Creates Express middleware that validates Scholarly JWT tokens.
 *
 * Returns a no-op middleware when authConfig is null/undefined,
 * preserving full backward compatibility with v3.3 standalone usage.
 */
export function createScholarlyAuthMiddleware(
  authConfig: ScholarlyAuthConfig | undefined,
  tenantIsolation: TenantIsolationMode = 'none'
): RequestHandler {
  // No auth config = no-op middleware (v3.3 compatibility)
  if (!authConfig) {
    return (_req: Request, _res: Response, next: NextFunction) => next();
  }

  const {
    jwtSecret,
    jwtAlgorithm = 'HS256',
    jwtIssuer,
    jwtAudience,
    publicPaths = [],
  } = authConfig;

  // Pre-compile public path patterns for fast matching
  const publicPathSet = new Set(publicPaths);

  return (req: Request, res: Response, next: NextFunction) => {
    // Check if this path is public (bypasses auth)
    const relativePath = req.path;
    if (isPublicPath(relativePath, publicPathSet)) {
      return next();
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        error: 'Authentication required',
        code: 'AUTH_MISSING',
        message: 'No Authorization header provided. Include a Bearer token.',
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
      return res.status(401).json({
        error: 'Invalid authentication format',
        code: 'AUTH_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>',
      });
    }

    const token = parts[1];

    try {
      // Build verification options
      const verifyOptions: jwt.VerifyOptions = {
        algorithms: [jwtAlgorithm as jwt.Algorithm],
      };
      if (jwtIssuer) verifyOptions.issuer = jwtIssuer;
      if (jwtAudience) verifyOptions.audience = jwtAudience;

      // Verify and decode the token
      const decoded = jwt.verify(token, jwtSecret, verifyOptions) as Record<string, unknown>;

      // Extract standard claims
      const userId = (decoded.sub || decoded.userId || decoded.user_id) as string;
      const tenantId = (decoded.tid || decoded.tenantId || decoded.tenant_id || decoded.org_id) as string;
      const role = (decoded.role || (Array.isArray(decoded.roles) ? decoded.roles[0] : undefined) || 'user') as string;
      const name = (decoded.name || decoded.display_name) as string | undefined;
      const email = decoded.email as string | undefined;

      // Validate required fields
      if (!userId) {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'AUTH_NO_USER',
          message: 'Token is missing user identifier (sub or userId claim).',
        });
      }

      // In strict mode, tenantId is mandatory
      if (tenantIsolation === 'strict' && !tenantId) {
        return res.status(403).json({
          error: 'Tenant identification required',
          code: 'AUTH_NO_TENANT',
          message: 'Token is missing tenant identifier. Multi-tenant isolation is enforced.',
        });
      }

      // Attach the authenticated user to the request
      const user: AuthenticatedUser = {
        userId,
        tenantId: tenantId || '__default__',
        role,
        name,
        email,
        claims: decoded,
      };

      req.scholarlyUser = user;
      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          error: 'Token expired',
          code: 'AUTH_EXPIRED',
          message: 'Your authentication token has expired. Please sign in again.',
        });
      }

      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          error: 'Invalid token',
          code: 'AUTH_INVALID',
          message: 'The provided token is invalid or has been tampered with.',
        });
      }

      logger.error(`Auth middleware error: ${error}`);
      return res.status(500).json({
        error: 'Authentication error',
        code: 'AUTH_ERROR',
        message: 'An unexpected error occurred during authentication.',
      });
    }
  };
}

/**
 * Check if a request path is in the public paths list.
 * Supports exact matches and prefix matching (paths ending with *).
 */
function isPublicPath(path: string, publicPaths: Set<string>): boolean {
  // Common public paths always bypass auth
  if (path === '/health' || path === '/plugins' || path === '/bus/subscriptions') {
    return true;
  }

  // Exact match
  if (publicPaths.has(path)) return true;

  // Prefix match: '/webhooks/*' matches '/webhooks/twilio'
  for (const publicPath of publicPaths) {
    if (publicPath.endsWith('*') && path.startsWith(publicPath.slice(0, -1))) {
      return true;
    }
  }

  return false;
}

/**
 * Utility: Extract the authenticated user from a request.
 * Convenience function for use outside of plugin contexts.
 */
export function getAuthUser(req: Request): AuthenticatedUser | null {
  return req.scholarlyUser ?? null;
}

/**
 * Utility: Create a role-checking middleware.
 * Usage: router.post('/admin-only', requireRole('admin'), handler);
 */
export function requireRole(...roles: string[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.scholarlyUser;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required', code: 'AUTH_MISSING' });
    }
    if (!roles.includes(user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'AUTH_FORBIDDEN',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }
    next();
  };
}

export default createScholarlyAuthMiddleware;
