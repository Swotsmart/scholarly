/**
 * Site Password Protection Routes
 *
 * Manages password-based access gating for the platform or specific routes.
 * Platform admins can set platform-wide rules; school admins can set tenant-scoped rules.
 */

import { Router } from 'express';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import rateLimit from 'express-rate-limit';
import { prisma } from '@scholarly/database';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { log } from '../lib/logger';

export const siteProtectionRouter: Router = Router();

const SITE_PROTECTION_SECRET = process.env.SITE_PROTECTION_SECRET || 'dev-site-protection-secret-change-me';
const BCRYPT_ROUNDS = 12;
const TOKEN_EXPIRY_HOURS = 24;

// ==========================================================================
// Validation Schemas
// ==========================================================================

const createProtectionSchema = z.object({
  scope: z.enum(['site', 'route_pattern']),
  routePattern: z.string().min(1).optional(),
  password: z.string().min(4).max(100),
  hint: z.string().max(200).optional(),
  bypassRoles: z.array(z.string()).default([]),
  expiresAt: z.string().datetime().optional(),
  tenantId: z.string().optional(),
});

const updateProtectionSchema = z.object({
  scope: z.enum(['site', 'route_pattern']).optional(),
  routePattern: z.string().min(1).optional(),
  password: z.string().min(4).max(100).optional(),
  hint: z.string().max(200).nullable().optional(),
  bypassRoles: z.array(z.string()).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  isActive: z.boolean().optional(),
});

const verifySchema = z.object({
  protectionId: z.string().min(1),
  password: z.string().min(1),
});

// ==========================================================================
// HMAC Token helpers (Edge Runtime compatible — no JWT)
// ==========================================================================

function createProtectionToken(pids: string[]): string {
  const exp = Math.floor(Date.now() / 1000) + TOKEN_EXPIRY_HOURS * 3600;
  const payload = JSON.stringify({ pids, exp });
  const payloadB64 = Buffer.from(payload).toString('base64url');
  const sig = crypto
    .createHmac('sha256', SITE_PROTECTION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${sig}`;
}

// ==========================================================================
// Rate limiter for verify endpoint
// ==========================================================================

const verifyRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many password attempts, please try again later' },
});

// ==========================================================================
// Public routes
// ==========================================================================

/**
 * POST /api/v1/site-protection/verify
 * Check a password against a specific protection rule and return a signed token.
 */
siteProtectionRouter.post('/verify', verifyRateLimiter, async (req, res) => {
  const { protectionId, password } = verifySchema.parse(req.body);

  const protection = await prisma.sitePasswordProtection.findUnique({
    where: { id: protectionId },
  });

  if (!protection || !protection.isActive) {
    return res.status(404).json({ success: false, error: 'Protection rule not found' });
  }

  // Check expiry
  if (protection.expiresAt && protection.expiresAt < new Date()) {
    return res.status(410).json({ success: false, error: 'Protection rule has expired' });
  }

  const valid = await bcrypt.compare(password, protection.passwordHash);
  if (!valid) {
    return res.status(401).json({ success: false, error: 'Incorrect password' });
  }

  const token = createProtectionToken([protectionId]);

  res.json({
    success: true,
    data: { token, expiresIn: TOKEN_EXPIRY_HOURS * 3600 },
  });
});

/**
 * GET /api/v1/site-protection/active
 * Return active protection rules (no hashes) for the middleware to consume.
 */
siteProtectionRouter.get('/active', async (_req, res) => {
  const now = new Date();

  const rules = await prisma.sitePasswordProtection.findMany({
    where: {
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: now } },
      ],
    },
    select: {
      id: true,
      tenantId: true,
      scope: true,
      routePattern: true,
      hint: true,
      bypassRoles: true,
      expiresAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: rules });
});

// ==========================================================================
// Protected routes (platform_admin / school_admin)
// ==========================================================================

/**
 * GET /api/v1/site-protection/config
 * List active protection rules for the current user's tenant.
 */
siteProtectionRouter.get(
  '/config',
  authMiddleware,
  requireRoles('platform_admin', 'school_admin'),
  async (req, res) => {
    const user = req.user!;
    const isPlatformAdmin = (user as any).roles?.includes('platform_admin');

    const rules = await prisma.sitePasswordProtection.findMany({
      where: isPlatformAdmin
        ? {} // platform admins see all rules
        : { tenantId: (user as any).tenantId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        tenantId: true,
        scope: true,
        routePattern: true,
        hint: true,
        bypassRoles: true,
        isActive: true,
        expiresAt: true,
        createdBy: true,
        updatedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ success: true, data: rules });
  }
);

/**
 * POST /api/v1/site-protection/config
 * Create a new protection rule.
 */
siteProtectionRouter.post(
  '/config',
  authMiddleware,
  requireRoles('platform_admin', 'school_admin'),
  async (req, res) => {
    const user = req.user!;
    const isPlatformAdmin = (user as any).roles?.includes('platform_admin');
    const data = createProtectionSchema.parse(req.body);

    // Only platform admins can create platform-wide (tenantId=null) rules
    const tenantId = data.tenantId || (user as any).tenantId;
    if (!tenantId && !isPlatformAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Only platform admins can create platform-wide protection rules',
      });
    }

    // Validate route_pattern scope has a pattern
    if (data.scope === 'route_pattern' && !data.routePattern) {
      return res.status(400).json({
        success: false,
        error: 'Route pattern is required for route_pattern scope',
      });
    }

    const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

    const rule = await prisma.sitePasswordProtection.create({
      data: {
        tenantId: isPlatformAdmin && !data.tenantId ? null : tenantId,
        scope: data.scope,
        routePattern: data.scope === 'route_pattern' ? data.routePattern : null,
        passwordHash,
        hint: data.hint,
        bypassRoles: data.bypassRoles,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        createdBy: user.id,
      },
      select: {
        id: true,
        tenantId: true,
        scope: true,
        routePattern: true,
        hint: true,
        bypassRoles: true,
        isActive: true,
        expiresAt: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    log.info(`Site protection rule created: ${rule.id} by ${user.id}`);
    res.status(201).json({ success: true, data: rule });
  }
);

/**
 * PUT /api/v1/site-protection/config/:id
 * Update an existing protection rule.
 */
siteProtectionRouter.put(
  '/config/:id',
  authMiddleware,
  requireRoles('platform_admin', 'school_admin'),
  async (req, res) => {
    const user = req.user!;
    const isPlatformAdmin = (user as any).roles?.includes('platform_admin');
    const { id } = req.params;
    const data = updateProtectionSchema.parse(req.body);

    const existing = await prisma.sitePasswordProtection.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Protection rule not found' });
    }

    // Non-platform admins can only update their own tenant's rules
    if (!isPlatformAdmin && existing.tenantId !== (user as any).tenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    const updateData: Record<string, unknown> = {
      updatedBy: user.id,
    };

    if (data.scope !== undefined) updateData.scope = data.scope;
    if (data.routePattern !== undefined) updateData.routePattern = data.routePattern;
    if (data.hint !== undefined) updateData.hint = data.hint;
    if (data.bypassRoles !== undefined) updateData.bypassRoles = data.bypassRoles;
    if (data.expiresAt !== undefined) {
      updateData.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
    }
    if (data.isActive !== undefined) updateData.isActive = data.isActive;

    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    }

    const rule = await prisma.sitePasswordProtection.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        tenantId: true,
        scope: true,
        routePattern: true,
        hint: true,
        bypassRoles: true,
        isActive: true,
        expiresAt: true,
        createdBy: true,
        updatedBy: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    log.info(`Site protection rule updated: ${rule.id} by ${user.id}`);
    res.json({ success: true, data: rule });
  }
);

/**
 * DELETE /api/v1/site-protection/config/:id
 * Soft-deactivate a protection rule.
 */
siteProtectionRouter.delete(
  '/config/:id',
  authMiddleware,
  requireRoles('platform_admin', 'school_admin'),
  async (req, res) => {
    const user = req.user!;
    const isPlatformAdmin = (user as any).roles?.includes('platform_admin');
    const { id } = req.params;

    const existing = await prisma.sitePasswordProtection.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ success: false, error: 'Protection rule not found' });
    }

    if (!isPlatformAdmin && existing.tenantId !== (user as any).tenantId) {
      return res.status(403).json({ success: false, error: 'Forbidden' });
    }

    await prisma.sitePasswordProtection.update({
      where: { id },
      data: { isActive: false, updatedBy: user.id },
    });

    log.info(`Site protection rule deactivated: ${id} by ${user.id}`);
    res.json({ success: true });
  }
);
