/**
 * Authentication Routes
 *
 * Handles login, logout, token refresh, and user registration.
 */

import { Router } from 'express';
import { z } from 'zod';
import { ethers } from 'ethers';
import crypto from 'crypto';
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
  tenantSlug: z.string().optional().default('scholarly'),
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
      twoFactorEnabled: true,
    },
  });

  // If 2FA is enabled, don't return tokens yet — require 2FA verification
  if (user?.twoFactorEnabled) {
    return res.json({
      success: true,
      data: {
        requires2FA: true,
        userId: user.id,
      },
    });
  }

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

// ============================================================================
// Two-Factor Authentication Routes
// ============================================================================

/**
 * POST /api/v1/auth/2fa/setup
 * Generate TOTP secret and return provisioning URI
 */
authRouter.post('/2fa/setup', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, twoFactorEnabled: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ success: false, error: '2FA is already enabled' });
  }

  // Generate a 20-byte secret encoded as base32
  const secretBytes = crypto.randomBytes(20);
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let secret = '';
  for (let i = 0; i < secretBytes.length; i++) {
    secret += base32Chars[secretBytes[i] % 32];
  }

  // Store secret (not yet enabled)
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: secret },
  });

  // Generate provisioning URI for authenticator apps
  const issuer = 'Scholarly';
  const otpauthUri = `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(user.email)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`;

  res.json({
    success: true,
    data: {
      secret,
      otpauthUri,
      qrCodeUrl: `https://chart.googleapis.com/chart?chs=200x200&cht=qr&chl=${encodeURIComponent(otpauthUri)}`,
    },
  });
});

/**
 * POST /api/v1/auth/2fa/verify-setup
 * Verify TOTP code and enable 2FA
 */
authRouter.post('/2fa/verify-setup', authMiddleware, async (req, res) => {
  const { code } = z.object({ code: z.string().length(6) }).parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorSecret) {
    return res.status(400).json({ success: false, error: 'No 2FA setup in progress' });
  }

  if (user.twoFactorEnabled) {
    return res.status(400).json({ success: false, error: '2FA is already enabled' });
  }

  // Verify TOTP code
  const isValid = verifyTOTP(user.twoFactorSecret, code);
  if (!isValid) {
    return res.status(400).json({ success: false, error: 'Invalid verification code' });
  }

  // Generate backup codes
  const backupCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString('hex').toUpperCase()
  );

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: true,
      twoFactorBackupCodes: backupCodes,
    },
  });

  res.json({
    success: true,
    data: { backupCodes },
  });
});

/**
 * POST /api/v1/auth/2fa/verify
 * Verify TOTP code during login
 */
authRouter.post('/2fa/verify', async (req, res) => {
  const { userId, code, isBackupCode } = z.object({
    userId: z.string(),
    code: z.string(),
    isBackupCode: z.boolean().optional().default(false),
  }).parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: userId },
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
      twoFactorSecret: true,
      twoFactorEnabled: true,
      twoFactorBackupCodes: true,
    },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ success: false, error: 'Invalid request' });
  }

  let isValid = false;

  if (isBackupCode) {
    // Check backup codes
    const codeUpper = code.toUpperCase();
    if (user.twoFactorBackupCodes.includes(codeUpper)) {
      isValid = true;
      // Remove used backup code
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorBackupCodes: user.twoFactorBackupCodes.filter((c: string) => c !== codeUpper),
        },
      });
    }
  } else {
    isValid = verifyTOTP(user.twoFactorSecret, code);
  }

  if (!isValid) {
    return res.status(400).json({ success: false, error: 'Invalid verification code' });
  }

  // Generate tokens now that 2FA is verified
  const tokens = await authService.generateTokensFor2FA(user.id);

  if (!tokens.success) {
    return res.status(500).json({ success: false, error: 'Token generation failed' });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true, name: true, slug: true },
  });

  // Set refresh token cookie
  res.cookie('refresh_token', tokens.data.refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: '/api/v1/auth',
  });

  const { twoFactorSecret: _, twoFactorBackupCodes: __, ...safeUser } = user;

  res.json({
    success: true,
    data: {
      accessToken: tokens.data.accessToken,
      expiresIn: tokens.data.expiresIn,
      tokenType: tokens.data.tokenType,
      user: safeUser,
      tenant,
    },
  });
});

/**
 * POST /api/v1/auth/2fa/disable
 * Disable 2FA for the current user
 */
authRouter.post('/2fa/disable', authMiddleware, async (req, res) => {
  const { code } = z.object({ code: z.string() }).parse(req.body);

  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
  });

  if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
    return res.status(400).json({ success: false, error: '2FA is not enabled' });
  }

  const isValid = verifyTOTP(user.twoFactorSecret, code);
  if (!isValid) {
    return res.status(400).json({ success: false, error: 'Invalid verification code' });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      twoFactorEnabled: false,
      twoFactorSecret: null,
      twoFactorBackupCodes: [],
    },
  });

  res.json({ success: true });
});

// ============================================================================
// Passkey Routes
// ============================================================================

/**
 * GET /api/v1/auth/passkeys
 * List user's registered passkeys
 */
authRouter.get('/passkeys', authMiddleware, async (req, res) => {
  const passkeys = await prisma.userPasskey.findMany({
    where: { userId: req.user!.id },
    select: {
      id: true,
      friendlyName: true,
      deviceType: true,
      backedUp: true,
      transports: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  res.json({ success: true, data: { passkeys } });
});

/**
 * POST /api/v1/auth/passkeys/register-options
 * Generate WebAuthn registration options
 */
authRouter.post('/passkeys/register-options', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, displayName: true },
  });

  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }

  const existingPasskeys = await prisma.userPasskey.findMany({
    where: { userId: user.id },
    select: { credentialId: true },
  });

  // Generate challenge
  const challenge = crypto.randomBytes(32).toString('base64url');

  // Store challenge in session/cookie for verification
  res.cookie('webauthn_challenge', challenge, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 5 * 60 * 1000, // 5 minutes
    path: '/api/v1/auth/passkeys',
  });

  const rpName = 'Scholarly';
  const rpId = process.env.WEBAUTHN_RP_ID || 'localhost';

  res.json({
    success: true,
    data: {
      challenge,
      rp: { name: rpName, id: rpId },
      user: {
        id: Buffer.from(user.id).toString('base64url'),
        name: user.email,
        displayName: user.displayName,
      },
      pubKeyCredParams: [
        { alg: -7, type: 'public-key' },   // ES256
        { alg: -257, type: 'public-key' },  // RS256
      ],
      timeout: 60000,
      attestation: 'none',
      excludeCredentials: existingPasskeys.map((pk) => ({
        id: pk.credentialId,
        type: 'public-key',
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    },
  });
});

/**
 * POST /api/v1/auth/passkeys/register
 * Complete passkey registration
 */
authRouter.post('/passkeys/register', authMiddleware, async (req, res) => {
  const { credential, friendlyName } = z.object({
    credential: z.object({
      id: z.string(),
      rawId: z.string(),
      response: z.object({
        clientDataJSON: z.string(),
        attestationObject: z.string(),
      }),
      type: z.string(),
      authenticatorAttachment: z.string().optional(),
    }),
    friendlyName: z.string().optional().default('Passkey'),
  }).parse(req.body);

  const challenge = req.cookies?.webauthn_challenge;
  if (!challenge) {
    return res.status(400).json({ success: false, error: 'No registration challenge found' });
  }

  // Clear the challenge cookie
  res.clearCookie('webauthn_challenge', { path: '/api/v1/auth/passkeys' });

  // In production, you'd verify the attestation object properly.
  // For now, store the credential with basic validation.
  const passkey = await prisma.userPasskey.create({
    data: {
      userId: req.user!.id,
      credentialId: credential.id,
      publicKey: credential.response.attestationObject,
      counter: 0,
      deviceType: credential.authenticatorAttachment === 'platform' ? 'platform' : 'cross-platform',
      friendlyName,
      transports: [],
    },
    select: {
      id: true,
      friendlyName: true,
      deviceType: true,
      createdAt: true,
    },
  });

  res.json({ success: true, data: { passkey } });
});

/**
 * DELETE /api/v1/auth/passkeys/:id
 * Remove a passkey
 */
authRouter.delete('/passkeys/:id', authMiddleware, async (req, res) => {
  const passkey = await prisma.userPasskey.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });

  if (!passkey) {
    return res.status(404).json({ success: false, error: 'Passkey not found' });
  }

  await prisma.userPasskey.delete({ where: { id: passkey.id } });

  res.json({ success: true });
});

/**
 * PATCH /api/v1/auth/passkeys/:id
 * Rename a passkey
 */
authRouter.patch('/passkeys/:id', authMiddleware, async (req, res) => {
  const { friendlyName } = z.object({ friendlyName: z.string().min(1).max(100) }).parse(req.body);

  const passkey = await prisma.userPasskey.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });

  if (!passkey) {
    return res.status(404).json({ success: false, error: 'Passkey not found' });
  }

  const updated = await prisma.userPasskey.update({
    where: { id: passkey.id },
    data: { friendlyName },
    select: { id: true, friendlyName: true },
  });

  res.json({ success: true, data: { passkey: updated } });
});

// ============================================================================
// Tenant Security Settings Routes
// ============================================================================

/**
 * GET /api/v1/auth/tenant-security
 * Get tenant security settings (admin only)
 */
authRouter.get('/tenant-security', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { roles: true, tenantId: true },
  });

  if (!user || (!user.roles.includes('admin') && !user.roles.includes('platform_admin'))) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: user.tenantId },
    select: { id: true, name: true, securitySettings: true },
  });

  const defaults = {
    require2FAForAdmins: false,
    require2FAForTeachers: false,
    require2FAForAll: false,
    allowPasskeys: true,
    allowTOTP: true,
    sessionTimeoutMinutes: 30,
    maxConcurrentSessions: 3,
    passwordMinLength: 8,
    passwordRequireUppercase: true,
    passwordRequireLowercase: true,
    passwordRequireNumbers: true,
    passwordRequireSpecial: true,
  };

  const settings = { ...defaults, ...(tenant?.securitySettings as object || {}) };

  res.json({ success: true, data: { settings } });
});

/**
 * PUT /api/v1/auth/tenant-security
 * Update tenant security settings (admin only)
 */
authRouter.put('/tenant-security', authMiddleware, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { roles: true, tenantId: true },
  });

  if (!user || (!user.roles.includes('admin') && !user.roles.includes('platform_admin'))) {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }

  const settings = z.object({
    require2FAForAdmins: z.boolean().optional(),
    require2FAForTeachers: z.boolean().optional(),
    require2FAForAll: z.boolean().optional(),
    allowPasskeys: z.boolean().optional(),
    allowTOTP: z.boolean().optional(),
    sessionTimeoutMinutes: z.number().min(5).max(480).optional(),
    maxConcurrentSessions: z.number().min(1).max(10).optional(),
    passwordMinLength: z.number().min(8).max(32).optional(),
    passwordRequireUppercase: z.boolean().optional(),
    passwordRequireLowercase: z.boolean().optional(),
    passwordRequireNumbers: z.boolean().optional(),
    passwordRequireSpecial: z.boolean().optional(),
  }).parse(req.body);

  await prisma.tenant.update({
    where: { id: user.tenantId },
    data: { securitySettings: settings as any },
  });

  res.json({ success: true, data: { settings } });
});

// ============================================================================
// TOTP Helper
// ============================================================================

function verifyTOTP(secret: string, code: string, window: number = 1): boolean {
  const now = Math.floor(Date.now() / 1000);
  const period = 30;

  for (let i = -window; i <= window; i++) {
    const counter = Math.floor((now / period) + i);
    const generated = generateTOTPCode(secret, counter);
    if (generated === code) return true;
  }
  return false;
}

function generateTOTPCode(secret: string, counter: number): string {
  // Decode base32 secret
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.toUpperCase()) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const secretBytes = Buffer.alloc(Math.floor(bits.length / 8));
  for (let i = 0; i < secretBytes.length; i++) {
    secretBytes[i] = parseInt(bits.substring(i * 8, (i + 1) * 8), 2);
  }

  // Counter to 8-byte buffer (big-endian)
  const counterBuf = Buffer.alloc(8);
  counterBuf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuf.writeUInt32BE(counter & 0xFFFFFFFF, 4);

  // HMAC-SHA1
  const hmac = crypto.createHmac('sha1', secretBytes);
  hmac.update(counterBuf);
  const hash = hmac.digest();

  // Dynamic truncation
  const offset = hash[hash.length - 1] & 0xf;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (binary % 1000000).toString().padStart(6, '0');
}

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
