/**
 * Scholarly Platform - Authentication Routes
 * 
 * Handles user authentication:
 * - Registration
 * - Login
 * - Token refresh
 * - Password management
 * - Logout
 * 
 * @module @scholarly/api/routes/auth
 */

import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

import { userRepository } from '@scholarly/database';
import {
  userRegistrationSchema,
  userLoginSchema,
  refreshTokenSchema,
  changePasswordSchema,
} from '@scholarly/validation';
import {
  success,
  failure,
  ValidationError,
  AuthenticationError,
  ConflictError,
  timingSafeEqual,
} from '@scholarly/shared';

import {
  validateBody,
  asyncHandler,
  sendSuccess,
  sendCreated,
  createAuthMiddleware,
  createCustomRateLimiter,
  AuthenticatedRequest,
  JWTPayload,
  MiddlewareConfig,
} from '../middleware/index.js';

// =============================================================================
// ROUTER
// =============================================================================

export const authRouter = Router();

// =============================================================================
// CONFIGURATION
// =============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';
const JWT_ACCESS_EXPIRES_IN = process.env.JWT_ACCESS_EXPIRES_IN || '15m';
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
const BCRYPT_ROUNDS = 12;

// Stricter rate limiting for auth endpoints
const authRateLimiter = createCustomRateLimiter(10, 60); // 10 requests per minute

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function generateTokens(user: {
  id: string;
  tenantId: string;
  roles: string[];
  permissions: string[];
}): { accessToken: string; refreshToken: string; sessionId: string } {
  const sessionId = uuidv4();
  
  const accessPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    tenantId: user.tenantId,
    roles: user.roles,
    permissions: user.permissions,
    sessionId,
    tokenType: 'access',
  };
  
  const refreshPayload: Omit<JWTPayload, 'iat' | 'exp'> = {
    userId: user.id,
    tenantId: user.tenantId,
    roles: user.roles,
    permissions: user.permissions,
    sessionId,
    tokenType: 'refresh',
  };
  
  const accessToken = jwt.sign(accessPayload, JWT_SECRET, {
    expiresIn: JWT_ACCESS_EXPIRES_IN,
  });
  
  const refreshToken = jwt.sign(refreshPayload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });
  
  return { accessToken, refreshToken, sessionId };
}

function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 900; // Default 15 minutes
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  
  return value * (multipliers[unit] || 60);
}

// =============================================================================
// ROUTES
// =============================================================================

/**
 * POST /api/v1/auth/register
 * 
 * Register a new user account
 */
authRouter.post(
  '/register',
  authRateLimiter,
  validateBody(userRegistrationSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password, firstName, lastName, phone, timezone, locale } = req.body;
    
    // Check if email already exists
    const existingResult = await userRepository.findByEmail(email);
    if (existingResult.success && existingResult.data) {
      throw new ConflictError('An account with this email already exists');
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    
    // Generate tenant ID for new user (in multi-tenant setup, this might come from elsewhere)
    const tenantId = uuidv4();
    
    // Create user
    const createResult = await userRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      phone,
      timezone,
      locale,
      tenantId,
      roles: ['user'],
      permissions: ['read:own', 'write:own'],
      status: 'active',
    });
    
    if (!createResult.success) {
      throw createResult.error;
    }
    
    const user = createResult.data;
    
    // Generate tokens
    const { accessToken, refreshToken, sessionId } = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions,
    });
    
    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await userRepository.storeRefreshToken(user.id, sessionId, refreshTokenHash);
    
    sendCreated(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: parseExpiresIn(JWT_ACCESS_EXPIRES_IN),
      },
    });
  })
);

/**
 * POST /api/v1/auth/login
 * 
 * Authenticate user and return tokens
 */
authRouter.post(
  '/login',
  authRateLimiter,
  validateBody(userLoginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;
    
    // Find user by email
    const userResult = await userRepository.findByEmail(email.toLowerCase());
    
    if (!userResult.success || !userResult.data) {
      // Use constant-time comparison to prevent timing attacks
      await bcrypt.compare(password, '$2a$12$dummy.hash.for.timing.attack.prevention');
      throw new AuthenticationError('Invalid email or password');
    }
    
    const user = userResult.data;
    
    // Check if account is active
    if (user.status !== 'active') {
      throw new AuthenticationError('Account is not active');
    }
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!passwordValid) {
      // Record failed attempt
      await userRepository.recordFailedLogin(user.id);
      throw new AuthenticationError('Invalid email or password');
    }
    
    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingMinutes = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / (1000 * 60)
      );
      throw new AuthenticationError(
        `Account is locked. Try again in ${remainingMinutes} minutes.`
      );
    }
    
    // Generate tokens
    const { accessToken, refreshToken, sessionId } = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions,
    });
    
    // Store refresh token hash
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await userRepository.storeRefreshToken(user.id, sessionId, refreshTokenHash);
    
    // Update last login
    await userRepository.update(user.id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
    
    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        tenantId: user.tenantId,
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: parseExpiresIn(JWT_ACCESS_EXPIRES_IN),
      },
    });
  })
);

/**
 * POST /api/v1/auth/refresh
 * 
 * Refresh access token using refresh token
 * Implements refresh token rotation for security
 */
authRouter.post(
  '/refresh',
  authRateLimiter,
  validateBody(refreshTokenSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const { refreshToken } = req.body;
    
    // Verify refresh token
    let payload: JWTPayload;
    try {
      payload = jwt.verify(refreshToken, JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new AuthenticationError('Invalid refresh token');
    }
    
    // Ensure it's a refresh token
    if (payload.tokenType !== 'refresh') {
      throw new AuthenticationError('Invalid token type');
    }
    
    // Find user
    const userResult = await userRepository.findById(payload.userId);
    if (!userResult.success || !userResult.data) {
      throw new AuthenticationError('User not found');
    }
    
    const user = userResult.data;
    
    // Verify refresh token is valid (check against stored hash)
    const isValid = await userRepository.verifyRefreshToken(
      user.id,
      payload.sessionId,
      refreshToken
    );
    
    if (!isValid) {
      // Possible token reuse attack - invalidate all sessions
      await userRepository.invalidateAllSessions(user.id);
      throw new AuthenticationError('Invalid refresh token');
    }
    
    // Generate new tokens (rotation)
    const { accessToken, refreshToken: newRefreshToken, sessionId } = generateTokens({
      id: user.id,
      tenantId: user.tenantId,
      roles: user.roles,
      permissions: user.permissions,
    });
    
    // Invalidate old refresh token and store new one
    await userRepository.invalidateRefreshToken(user.id, payload.sessionId);
    const newRefreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
    await userRepository.storeRefreshToken(user.id, sessionId, newRefreshTokenHash);
    
    sendSuccess(res, {
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: parseExpiresIn(JWT_ACCESS_EXPIRES_IN),
      },
    });
  })
);

/**
 * POST /api/v1/auth/logout
 * 
 * Invalidate current session
 */
authRouter.post(
  '/logout',
  createAuthMiddleware({
    jwtSecret: JWT_SECRET,
    jwtAccessExpiresIn: JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
    rateLimitPoints: 100,
    rateLimitDuration: 60,
    logLevel: 'info',
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { userId, sessionId } = authReq.user;
    
    // Invalidate the session
    await userRepository.invalidateRefreshToken(userId, sessionId);
    
    sendSuccess(res, { message: 'Logged out successfully' });
  })
);

/**
 * POST /api/v1/auth/logout-all
 * 
 * Invalidate all sessions for the user
 */
authRouter.post(
  '/logout-all',
  createAuthMiddleware({
    jwtSecret: JWT_SECRET,
    jwtAccessExpiresIn: JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
    rateLimitPoints: 100,
    rateLimitDuration: 60,
    logLevel: 'info',
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq.user;
    
    // Invalidate all sessions
    await userRepository.invalidateAllSessions(userId);
    
    sendSuccess(res, { message: 'All sessions have been logged out' });
  })
);

/**
 * POST /api/v1/auth/change-password
 * 
 * Change password for authenticated user
 */
authRouter.post(
  '/change-password',
  authRateLimiter,
  createAuthMiddleware({
    jwtSecret: JWT_SECRET,
    jwtAccessExpiresIn: JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
    rateLimitPoints: 100,
    rateLimitDuration: 60,
    logLevel: 'info',
  }),
  validateBody(changePasswordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq.user;
    const { currentPassword, newPassword } = req.body;
    
    // Get user
    const userResult = await userRepository.findById(userId);
    if (!userResult.success || !userResult.data) {
      throw new AuthenticationError('User not found');
    }
    
    const user = userResult.data;
    
    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      throw new ValidationError('Current password is incorrect');
    }
    
    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    
    // Update password
    await userRepository.update(userId, {
      passwordHash: newPasswordHash,
      passwordChangedAt: new Date(),
    });
    
    // Invalidate all other sessions (security measure)
    await userRepository.invalidateAllSessions(userId);
    
    sendSuccess(res, { message: 'Password changed successfully. Please log in again.' });
  })
);

/**
 * GET /api/v1/auth/me
 * 
 * Get current user profile
 */
authRouter.get(
  '/me',
  createAuthMiddleware({
    jwtSecret: JWT_SECRET,
    jwtAccessExpiresIn: JWT_ACCESS_EXPIRES_IN,
    jwtRefreshExpiresIn: JWT_REFRESH_EXPIRES_IN,
    rateLimitPoints: 100,
    rateLimitDuration: 60,
    logLevel: 'info',
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    const { userId } = authReq.user;
    
    const userResult = await userRepository.findById(userId);
    if (!userResult.success || !userResult.data) {
      throw new AuthenticationError('User not found');
    }
    
    const user = userResult.data;
    
    sendSuccess(res, {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        tenantId: user.tenantId,
        timezone: user.timezone,
        locale: user.locale,
        avatarUrl: user.avatarUrl,
        roles: user.roles,
        permissions: user.permissions,
        status: user.status,
        lastLoginAt: user.lastLoginAt,
        createdAt: user.createdAt,
      },
    });
  })
);
