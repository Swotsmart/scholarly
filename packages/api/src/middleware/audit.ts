/**
 * Audit Logging Middleware
 *
 * Captures sensitive operations to the AuditLog table for compliance tracking.
 * Integrates with GDPR requirements and security monitoring.
 */

import { Request, Response, NextFunction } from 'express';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';

// Extend Express Request for audit context
declare global {
  namespace Express {
    interface Request {
      auditContext?: {
        action: string;
        entityType: string;
        entityId: string;
        changes?: Record<string, unknown>;
        sensitivity?: 'normal' | 'sensitive' | 'critical';
        metadata?: Record<string, unknown>;
      };
    }
  }
}

/**
 * Sensitivity levels for audit logging
 */
export type AuditSensitivity = 'normal' | 'sensitive' | 'critical';

/**
 * Audit action categories
 */
export const AuditActions = {
  // Auth actions
  LOGIN: 'auth.login',
  LOGOUT: 'auth.logout',
  LOGIN_FAILED: 'auth.login_failed',
  PASSWORD_CHANGE: 'auth.password_change',
  PASSWORD_RESET: 'auth.password_reset',
  TOKEN_REFRESH: 'auth.token_refresh',

  // User actions
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_SUSPEND: 'user.suspend',
  USER_REACTIVATE: 'user.reactivate',

  // Content actions
  CONTENT_CREATE: 'content.create',
  CONTENT_UPDATE: 'content.update',
  CONTENT_DELETE: 'content.delete',
  CONTENT_PUBLISH: 'content.publish',
  CONTENT_PURCHASE: 'content.purchase',

  // Booking actions
  BOOKING_CREATE: 'booking.create',
  BOOKING_UPDATE: 'booking.update',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_COMPLETE: 'booking.complete',

  // Tutor actions
  TUTOR_VERIFY: 'tutor.verify',
  TUTOR_SUSPEND: 'tutor.suspend',
  TUTOR_AVAILABILITY_UPDATE: 'tutor.availability_update',
  TUTOR_PRICING_UPDATE: 'tutor.pricing_update',

  // Admin actions
  ADMIN_CONFIG_CHANGE: 'admin.config_change',
  ADMIN_FEATURE_FLAG: 'admin.feature_flag',
  ADMIN_USER_IMPERSONATE: 'admin.user_impersonate',

  // Data access actions
  DATA_EXPORT: 'data.export',
  DATA_BULK_UPDATE: 'data.bulk_update',
  DATA_PURGE: 'data.purge',

  // Security actions
  SECURITY_PERMISSION_GRANT: 'security.permission_grant',
  SECURITY_PERMISSION_REVOKE: 'security.permission_revoke',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
} as const;

/**
 * Entity types for audit logging
 */
export const AuditEntityTypes = {
  USER: 'User',
  TENANT: 'Tenant',
  CONTENT: 'Content',
  BOOKING: 'Booking',
  TUTOR_PROFILE: 'TutorProfile',
  LEARNER_PROFILE: 'LearnerProfile',
  SESSION: 'TutoringSession',
  CREDENTIAL: 'CredentialNFT',
  TRANSACTION: 'TokenTransaction',
  FEATURE_FLAG: 'FeatureFlag',
  CONFIGURATION: 'TenantConfiguration',
} as const;

/**
 * Create audit log entry
 */
export async function createAuditLog(params: {
  tenantId: string;
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  entityType: string;
  entityId: string;
  changes?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  sensitivity?: AuditSensitivity;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        tenantId: params.tenantId,
        userId: params.userId,
        userEmail: params.userEmail,
        userRole: params.userRole,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        changes: params.changes,
        metadata: params.metadata,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        requestId: params.requestId,
        sensitivity: params.sensitivity || 'normal',
      },
    });
  } catch (error) {
    // Log but don't fail the request if audit logging fails
    log.error('Failed to create audit log', error as Error, {
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
    });
  }
}

/**
 * Helper to get client IP from request
 */
function getClientIp(req: Request): string | undefined {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress;
}

/**
 * Audit middleware that captures the response and logs after completion
 */
export function auditMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Store original end function
  const originalEnd = res.end;
  const originalJson = res.json;
  let responseBody: unknown;

  // Capture response body
  res.json = function (body: unknown) {
    responseBody = body;
    return originalJson.call(this, body);
  };

  // Override end to log after response
  (res.end as any) = function (this: Response, ...args: unknown[]) {
    // Only log if audit context was set
    if (req.auditContext && req.user && req.tenantId) {
      // Don't block response - log asynchronously
      setImmediate(async () => {
        const success = res.statusCode >= 200 && res.statusCode < 400;

        await createAuditLog({
          tenantId: req.tenantId!,
          userId: req.user!.id,
          userEmail: req.user!.email,
          userRole: req.user!.roles?.[0],
          action: req.auditContext!.action,
          entityType: req.auditContext!.entityType,
          entityId: req.auditContext!.entityId,
          changes: req.auditContext!.changes,
          metadata: {
            ...req.auditContext!.metadata,
            success,
            statusCode: res.statusCode,
            method: req.method,
            path: req.path,
          },
          ipAddress: getClientIp(req),
          userAgent: req.headers['user-agent'],
          requestId: (req as any).id,
          sensitivity: req.auditContext!.sensitivity,
        });
      });
    }

    return originalEnd.apply(this, args as Parameters<typeof originalEnd>);
  };

  next();
}

/**
 * Helper to set audit context on a request
 */
export function setAuditContext(
  req: Request,
  action: string,
  entityType: string,
  entityId: string,
  options?: {
    changes?: Record<string, unknown>;
    sensitivity?: AuditSensitivity;
    metadata?: Record<string, unknown>;
  }
): void {
  req.auditContext = {
    action,
    entityType,
    entityId,
    changes: options?.changes,
    sensitivity: options?.sensitivity,
    metadata: options?.metadata,
  };
}

/**
 * Query audit logs with filtering
 */
export async function queryAuditLogs(params: {
  tenantId: string;
  filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    sensitivity?: AuditSensitivity;
    startDate?: Date;
    endDate?: Date;
  };
  page?: number;
  pageSize?: number;
}) {
  const { tenantId, filters, page = 1, pageSize = 50 } = params;

  const where: any = { tenantId };

  if (filters?.userId) where.userId = filters.userId;
  if (filters?.action) where.action = { contains: filters.action };
  if (filters?.entityType) where.entityType = filters.entityType;
  if (filters?.entityId) where.entityId = filters.entityId;
  if (filters?.sensitivity) where.sensitivity = filters.sensitivity;
  if (filters?.startDate || filters?.endDate) {
    where.timestamp = {};
    if (filters.startDate) where.timestamp.gte = filters.startDate;
    if (filters.endDate) where.timestamp.lte = filters.endDate;
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return {
    data: logs,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}

/**
 * Get audit summary for compliance reporting
 */
export async function getAuditSummary(params: {
  tenantId: string;
  startDate: Date;
  endDate: Date;
}) {
  const { tenantId, startDate, endDate } = params;

  const [
    totalActions,
    actionsByType,
    sensitiveActions,
    userActivity,
  ] = await Promise.all([
    // Total actions count
    prisma.auditLog.count({
      where: {
        tenantId,
        timestamp: { gte: startDate, lte: endDate },
      },
    }),

    // Actions grouped by type
    prisma.auditLog.groupBy({
      by: ['action'],
      where: {
        tenantId,
        timestamp: { gte: startDate, lte: endDate },
      },
      _count: { action: true },
      orderBy: { _count: { action: 'desc' } },
      take: 20,
    }),

    // Sensitive/critical actions
    prisma.auditLog.count({
      where: {
        tenantId,
        timestamp: { gte: startDate, lte: endDate },
        sensitivity: { in: ['sensitive', 'critical'] },
      },
    }),

    // Most active users
    prisma.auditLog.groupBy({
      by: ['userId', 'userEmail'],
      where: {
        tenantId,
        timestamp: { gte: startDate, lte: endDate },
        userId: { not: null },
      },
      _count: { userId: true },
      orderBy: { _count: { userId: 'desc' } },
      take: 10,
    }),
  ]);

  return {
    period: { startDate, endDate },
    totalActions,
    actionsByType: actionsByType.map(a => ({
      action: a.action,
      count: a._count.action,
    })),
    sensitiveActions,
    topUsers: userActivity.map(u => ({
      userId: u.userId,
      email: u.userEmail,
      actionCount: u._count.userId,
    })),
  };
}
