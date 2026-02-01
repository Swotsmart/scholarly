/**
 * Authentication Middleware
 *
 * Verifies JWT tokens using RS256 asymmetric keys.
 * Extracts user info and tenant context.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '@scholarly/database';
import { authService, TokenPayload } from '../services/auth.service';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { log } from '../lib/logger';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        tenantId: string;
        email: string;
        roles: string[];
        jurisdiction: string;
        walletAddress?: string;
      };
      tenantId?: string;
      tokenPayload?: TokenPayload;
    }
  }
}

/**
 * Main authentication middleware
 * Validates JWT and attaches user to request
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const requestId = (req as any).id || 'unknown';

  // Development mode: allow demo access
  if (process.env.NODE_ENV === 'development' && process.env.ALLOW_DEMO_AUTH === 'true') {
    const demoResult = await handleDemoAuth(req);
    if (demoResult) {
      return next();
    }
  }

  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = ScholarlyApiError.tokenInvalid({ reason: 'Missing or invalid Authorization header' });
    res.status(error.statusCode).json(error.toResponse(requestId));
    return;
  }

  const token = authHeader.slice(7);

  // Verify the JWT token
  const result = await authService.verifyToken(token, 'access');

  if (!result.success) {
    const failedResult = result as { success: false; error: { code: string; details?: Record<string, unknown> } };
    const error = new ScholarlyApiError(failedResult.error.code as any, failedResult.error.details);
    res.status(error.statusCode).json(error.toResponse(requestId));
    return;
  }

  const payload = result.data;

  // Fetch full user data (could cache this)
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        tenantId: true,
        email: true,
        roles: true,
        jurisdiction: true,
        status: true,
        walletAddress: true,
      },
    });

    if (!user) {
      const error = ScholarlyApiError.userNotFound(payload.sub);
      res.status(error.statusCode).json(error.toResponse(requestId));
      return;
    }

    // Check user status
    if (user.status === 'suspended') {
      const error = new ScholarlyApiError('AUTH_006', { reason: 'Account suspended' });
      res.status(error.statusCode).json(error.toResponse(requestId));
      return;
    }

    if (user.status === 'deleted') {
      const error = new ScholarlyApiError('USER_006');
      res.status(error.statusCode).json(error.toResponse(requestId));
      return;
    }

    // Attach user and tenant to request
    req.user = {
      id: user.id,
      tenantId: user.tenantId,
      email: user.email,
      roles: user.roles,
      jurisdiction: user.jurisdiction,
      walletAddress: user.walletAddress || undefined,
    };
    req.tenantId = user.tenantId;
    req.tokenPayload = payload;

    next();
  } catch (error) {
    log.error('Auth middleware database error', error as Error);
    const apiError = ScholarlyApiError.databaseError(error as Error);
    res.status(apiError.statusCode).json(apiError.toResponse(requestId));
  }
}

/**
 * Optional auth middleware
 * Allows request through even without auth, but attaches user if present
 */
export async function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // No auth, continue without user
    return next();
  }

  // Try to authenticate, but don't fail if token is invalid
  const token = authHeader.slice(7);
  const result = await authService.verifyToken(token, 'access');

  if (result.success) {
    try {
      const user = await prisma.user.findUnique({
        where: { id: result.data.sub },
        select: {
          id: true,
          tenantId: true,
          email: true,
          roles: true,
          jurisdiction: true,
          walletAddress: true,
        },
      });

      if (user) {
        req.user = {
          id: user.id,
          tenantId: user.tenantId,
          email: user.email,
          roles: user.roles,
          jurisdiction: user.jurisdiction,
          walletAddress: user.walletAddress || undefined,
        };
        req.tenantId = user.tenantId;
        req.tokenPayload = result.data;
      }
    } catch {
      // Ignore errors, proceed without user
    }
  }

  next();
}

/**
 * Role-based access control middleware
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).id || 'unknown';

    if (!req.user) {
      const error = ScholarlyApiError.tokenInvalid({ reason: 'User not authenticated' });
      res.status(error.statusCode).json(error.toResponse(requestId));
      return;
    }

    const hasRole = roles.some(role => req.user!.roles.includes(role));
    if (!hasRole) {
      const error = ScholarlyApiError.insufficientPermissions({
        required: roles,
        actual: req.user.roles,
      });
      res.status(error.statusCode).json(error.toResponse(requestId));
      return;
    }

    next();
  };
}

/**
 * Require specific permission (more granular than roles)
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const requestId = (req as any).id || 'unknown';

    if (!req.user) {
      const error = ScholarlyApiError.tokenInvalid({ reason: 'User not authenticated' });
      res.status(error.statusCode).json(error.toResponse(requestId));
      return;
    }

    // Platform admin has all permissions
    if (req.user.roles.includes('platform_admin')) {
      return next();
    }

    // Check permission mapping (would be more sophisticated in production)
    const rolePermissions: Record<string, string[]> = {
      tutor: ['view_bookings', 'manage_own_sessions', 'view_content'],
      learner: ['view_tutors', 'create_bookings', 'view_content'],
      parent: ['view_tutors', 'manage_child_bookings', 'view_content'],
      content_creator: ['create_content', 'manage_own_content', 'view_content'],
    };

    const userPermissions = new Set<string>();
    for (const role of req.user.roles) {
      const perms = rolePermissions[role] || [];
      perms.forEach(p => userPermissions.add(p));
    }

    if (!userPermissions.has(permission)) {
      const error = ScholarlyApiError.insufficientPermissions({
        required: [permission],
        actual: Array.from(userPermissions),
      });
      res.status(error.statusCode).json(error.toResponse(requestId));
      return;
    }

    next();
  };
}

/**
 * Require wallet connection
 */
export function requireWallet(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req as any).id || 'unknown';

  if (!req.user) {
    const error = ScholarlyApiError.tokenInvalid({ reason: 'User not authenticated' });
    res.status(error.statusCode).json(error.toResponse(requestId));
    return;
  }

  if (!req.user.walletAddress) {
    const error = ScholarlyApiError.walletNotConnected(req.user.id);
    res.status(error.statusCode).json(error.toResponse(requestId));
    return;
  }

  next();
}

/**
 * Handle demo authentication for development
 */
async function handleDemoAuth(req: Request): Promise<boolean> {
  const demoUserId = req.headers['x-demo-user-id'] as string;
  const demoTenantId = req.headers['x-demo-tenant-id'] as string;

  if (demoUserId && demoTenantId) {
    const user = await prisma.user.findUnique({
      where: { id: demoUserId },
      select: {
        id: true,
        tenantId: true,
        email: true,
        roles: true,
        jurisdiction: true,
        walletAddress: true,
      },
    });

    if (user && user.tenantId === demoTenantId) {
      req.user = {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles: user.roles,
        jurisdiction: user.jurisdiction,
        walletAddress: user.walletAddress || undefined,
      };
      req.tenantId = user.tenantId;
      return true;
    }
  }

  // Try default demo tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'scholarly-demo' },
  });

  if (tenant) {
    const adminUser = await prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        email: 'admin@scholarly.app',
      },
      select: {
        id: true,
        tenantId: true,
        email: true,
        roles: true,
        jurisdiction: true,
        walletAddress: true,
      },
    });

    if (adminUser) {
      req.user = {
        id: adminUser.id,
        tenantId: adminUser.tenantId,
        email: adminUser.email,
        roles: adminUser.roles,
        jurisdiction: adminUser.jurisdiction,
        walletAddress: adminUser.walletAddress || undefined,
      };
      req.tenantId = adminUser.tenantId;
      return true;
    }
  }

  return false;
}

// Alias for backward compatibility
export const authenticateUser = authMiddleware;
