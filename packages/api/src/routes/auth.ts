/**
 * Authentication Routes
 *
 * Handles login, logout, token refresh, and user registration.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import { prisma } from '@scholarly/database';
import { authService } from '../services/auth.service';
import { ScholarlyApiError } from '../errors/scholarly-error';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { generateCsrfToken, csrfTokenEndpoint } from '../middleware/csrf';
import { log } from '../lib/logger';

export const authRouter: Router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  tenantSlug: z.string().optional(),
});

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  displayName: z.string().min(2).max(100),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  tenantSlug: z.string().optional().default('scholarly-demo'),
  role: z.enum(['learner', 'parent', 'tutor']).default('learner'),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ============================================================================
// Routes
// ============================================================================

/**
 * POST /api/v1/auth/login
 * Authenticate user and return tokens
 */
authRouter.post('/login', generateCsrfToken, async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const { email, password, tenantSlug } = loginSchema.parse(req.body);

  // Get tenant ID from slug
  let tenantId: string | undefined;
  if (tenantSlug) {
    const tenant = await prisma.tenant.findUnique({
      where: { slug: tenantSlug },
      select: { id: true },
    });
    tenantId = tenant?.id;
  }

  // Authenticate
  const result = await authService.login({ email, password, tenantId });

  if (!result.success) {
    const failedResult = result as { success: false; error: { code: string; details?: Record<string, unknown> } };
    const error = new ScholarlyApiError(failedResult.error.code as any, failedResult.error.details);
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  const tokens = result.data;

  // Set refresh token as httpOnly cookie
  res.cookie('refresh_token', tokens.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/api/v1/auth',
  });

  // Get user details for response
  const user = await prisma.user.findFirst({
    where: { email: email.toLowerCase(), ...(tenantId && { tenantId }) },
    select: {
      id: true,
      tenantId: true,
      email: true,
      displayName: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      roles: true,
      jurisdiction: true,
      trustScore: true,
      tokenBalance: true,
      walletAddress: true,
    },
  });

  const tenant = await prisma.tenant.findUnique({
    where: { id: user!.tenantId },
    select: { id: true, name: true, slug: true },
  });

  res.json({
    success: true,
    data: {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
      tokenType: tokens.tokenType,
      user,
      tenant,
    },
  });
});

/**
 * POST /api/v1/auth/register
 * Register a new user
 */
authRouter.post('/register', async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const data = registerSchema.parse(req.body);

  // Get tenant
  const tenant = await prisma.tenant.findUnique({
    where: { slug: data.tenantSlug },
  });

  if (!tenant) {
    const error = new ScholarlyApiError('USER_007', { tenantSlug: data.tenantSlug });
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { tenantId_email: { tenantId: tenant.id, email: data.email.toLowerCase() } },
  });

  if (existingUser) {
    const error = ScholarlyApiError.emailAlreadyRegistered(data.email);
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  // Hash password
  const passwordHash = await authService.hashPassword(data.password);

  // Create user
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: data.email.toLowerCase(),
      passwordHash,
      displayName: data.displayName,
      firstName: data.firstName,
      lastName: data.lastName,
      roles: [data.role],
      status: 'active',
    },
    select: {
      id: true,
      tenantId: true,
      email: true,
      displayName: true,
      firstName: true,
      lastName: true,
      roles: true,
    },
  });

  log.auth.loginSuccess(user.id, user.tenantId, req.ip || 'unknown');

  // Generate tokens
  const tokens = await authService.login({
    email: data.email,
    password: data.password,
    tenantId: tenant.id,
  });

  if (!tokens.success) {
    // This shouldn't happen, but handle it
    const error = ScholarlyApiError.internalError();
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  // Set refresh token cookie
  res.cookie('refresh_token', tokens.data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  res.status(201).json({
    success: true,
    data: {
      accessToken: tokens.data.accessToken,
      expiresIn: tokens.data.expiresIn,
      tokenType: tokens.data.tokenType,
      user,
      tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug },
    },
  });
});

/**
 * POST /api/v1/auth/refresh
 * Refresh access token using refresh token
 */
authRouter.post('/refresh', async (req, res) => {
  const requestId = (req as any).id || 'unknown';

  // Get refresh token from cookie or body
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

  if (!refreshToken) {
    const error = ScholarlyApiError.refreshTokenInvalid({ reason: 'No refresh token provided' });
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  const result = await authService.refreshAccessToken(refreshToken);

  if (!result.success) {
    // Clear invalid cookie
    res.clearCookie('refresh_token', { path: '/api/v1/auth' });
    const failedResult = result as { success: false; error: { code: string; details?: Record<string, unknown> } };
    const error = new ScholarlyApiError(failedResult.error.code as any, failedResult.error.details);
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  // Set new refresh token cookie
  res.cookie('refresh_token', result.data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  res.json({
    success: true,
    data: {
      accessToken: result.data.accessToken,
      expiresIn: result.data.expiresIn,
      tokenType: result.data.tokenType,
    },
  });
});

/**
 * POST /api/v1/auth/logout
 * Logout user and revoke refresh token
 */
authRouter.post('/logout', async (req, res) => {
  const refreshToken = req.cookies?.refresh_token || req.body?.refreshToken;

  if (refreshToken) {
    await authService.logout(refreshToken);
  }

  res.clearCookie('refresh_token', { path: '/api/v1/auth' });

  res.json({ success: true });
});

/**
 * POST /api/v1/auth/logout-all
 * Logout from all devices
 */
authRouter.post('/logout-all', authMiddleware, async (req, res) => {
  const userId = req.user!.id;
  await authService.logoutAll(userId);

  res.clearCookie('refresh_token', { path: '/api/v1/auth' });

  res.json({ success: true });
});

/**
 * GET /api/v1/auth/me
 * Get current authenticated user
 */
authRouter.get('/me', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      learnerProfile: true,
      parentProfile: true,
      tutorProfile: {
        include: {
          subjects: true,
          qualifications: true,
          safeguardingChecks: { where: { status: 'valid' } },
        },
      },
      creatorProfile: true,
      tenant: { select: { id: true, name: true, slug: true } },
    },
  });

  if (!user) {
    const error = ScholarlyApiError.userNotFound(req.user!.id);
    return res.status(error.statusCode).json(error.toResponse((req as any).id || 'unknown'));
  }

  res.json({ success: true, data: { user } });
});

/**
 * GET /api/v1/auth/csrf-token
 * Get CSRF token for forms
 */
authRouter.get('/csrf-token', csrfTokenEndpoint);

/**
 * GET /api/v1/auth/demo-users
 * List demo users (development only)
 */
authRouter.get('/demo-users', async (_req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'Not found' });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { slug: 'scholarly-demo' },
  });

  if (!tenant) {
    return res.json({ users: [], tenantId: null });
  }

  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
    select: {
      id: true,
      email: true,
      displayName: true,
      roles: true,
      avatarUrl: true,
    },
    take: 10,
  });

  res.json({ users, tenantId: tenant.id });
});

/**
 * POST /api/v1/auth/connect-wallet
 * Connect user's blockchain wallet
 */
authRouter.post('/connect-wallet', authMiddleware, async (req, res) => {
  const requestId = (req as any).id || 'unknown';
  const { walletAddress, signature, message } = req.body;

  // Validate required fields
  if (!walletAddress || !signature || !message) {
    return res.status(400).json({
      success: false,
      error: { message: 'walletAddress, signature, and message are required' },
    });
  }

  // Verify signature to prove wallet ownership
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);

    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Wallet signature verification failed' },
      });
    }
  } catch (err) {
    log.warn('Wallet signature verification error', { walletAddress, error: (err as Error).message });
    return res.status(400).json({
      success: false,
      error: { message: 'Wallet signature verification failed' },
    });
  }

  // Check if wallet is already connected to another user
  const existingWallet = await prisma.user.findUnique({
    where: { walletAddress },
    select: { id: true },
  });

  if (existingWallet && existingWallet.id !== req.user!.id) {
    const error = new ScholarlyApiError('USER_009', { walletAddress });
    return res.status(error.statusCode).json(error.toResponse(requestId));
  }

  // Update user with wallet
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      walletAddress,
      walletVerifiedAt: new Date(),
    },
    select: {
      id: true,
      walletAddress: true,
      walletVerifiedAt: true,
    },
  });

  res.json({ success: true, data: { user } });
});

/**
 * POST /api/v1/auth/disconnect-wallet
 * Disconnect user's blockchain wallet
 */
authRouter.post('/disconnect-wallet', authMiddleware, async (req, res) => {
  await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      walletAddress: null,
      walletVerifiedAt: null,
    },
  });

  res.json({ success: true });
});
