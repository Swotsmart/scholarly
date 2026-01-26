/**
 * Authentication Service
 *
 * Handles:
 * - User authentication (login, logout)
 * - JWT token generation with RS256
 * - Refresh token rotation
 * - Session management
 */

import jwt, { JwtPayload, SignOptions, VerifyOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '@scholarly/database';
import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { getSigningKey, getKeyById } from '../config/keys';
import { log } from '../lib/logger';
import { ScholarlyApiError } from '../errors/scholarly-error';

// Token configuration
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export interface TokenPayload extends JwtPayload {
  sub: string;      // User ID
  email: string;
  tenantId: string;
  roles: string[];
  type: 'access' | 'refresh';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface UserCredentials {
  email: string;
  password: string;
  tenantId?: string;
}

export interface RefreshTokenData {
  id: string;
  tokenFamily: string;
  userId: string;
  hashedToken: string;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedBy: string | null;
}

export class AuthService extends ScholarlyBaseService {
  constructor() {
    super('AuthService');
  }

  // ============ Authentication ============

  /**
   * Authenticate user with email and password
   */
  async login(credentials: UserCredentials): Promise<Result<AuthTokens>> {
    return this.withTiming('login', async () => {
      const { email, password, tenantId } = credentials;

      // Find user
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          ...(tenantId && { tenantId }),
        },
        include: {
          tenant: true,
        },
      });

      if (!user) {
        log.auth.loginFailed(email, 'user_not_found', 'unknown');
        return failure({
          code: 'AUTH_001',
          message: 'Invalid credentials',
        });
      }

      // Check account status
      if (user.status === 'suspended') {
        log.auth.loginFailed(email, 'account_suspended', 'unknown');
        return failure({
          code: 'AUTH_006',
          message: 'Account locked',
          details: { reason: 'Account has been suspended' },
        });
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.passwordHash || '');
      if (!passwordValid) {
        log.auth.loginFailed(email, 'invalid_password', 'unknown');
        return failure({
          code: 'AUTH_001',
          message: 'Invalid credentials',
        });
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Update last login
      await prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      });

      log.auth.loginSuccess(user.id, user.tenantId, 'unknown');

      return success(tokens);
    });
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(refreshToken: string): Promise<Result<AuthTokens>> {
    return this.withTiming('refreshAccessToken', async () => {
      // Verify the refresh token
      const payload = await this.verifyToken(refreshToken, 'refresh');
      if (!payload.success) {
        return failure({ code: 'AUTH_003', message: 'Invalid refresh token' });
      }

      const tokenData = payload.data;

      // Hash the token to find in database
      const hashedToken = this.hashToken(refreshToken);

      // Find the stored refresh token
      const storedToken = await prisma.refreshToken.findUnique({
        where: { hashedToken },
        include: { user: true },
      });

      if (!storedToken) {
        log.auth.loginFailed(tokenData.email, 'refresh_token_not_found', 'unknown');
        return failure({
          code: 'AUTH_004',
          message: 'Refresh token invalid',
        });
      }

      // Check if token has been revoked
      if (storedToken.revokedAt) {
        // Token reuse detected - revoke entire family
        await this.revokeTokenFamily(storedToken.tokenFamily);

        log.security.suspiciousActivity(
          storedToken.userId,
          'refresh_token_reuse',
          { tokenFamily: storedToken.tokenFamily }
        );

        return failure({
          code: 'AUTH_005',
          message: 'Refresh token reused - potential theft detected',
        });
      }

      // Check if token has expired
      if (storedToken.expiresAt < new Date()) {
        return failure({
          code: 'AUTH_002',
          message: 'Refresh token expired',
        });
      }

      // Generate new tokens (rotation)
      const newTokens = await this.generateTokens(storedToken.user, storedToken.tokenFamily);

      // Revoke the old refresh token (mark as rotated)
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: {
          revokedAt: new Date(),
          replacedBy: newTokens.refreshToken.substring(0, 20) + '...', // Store partial for audit
        },
      });

      log.auth.tokenRefreshed(storedToken.userId);

      return success(newTokens);
    });
  }

  /**
   * Logout - revoke refresh token
   */
  async logout(refreshToken: string): Promise<Result<void>> {
    return this.withTiming('logout', async () => {
      const hashedToken = this.hashToken(refreshToken);

      const token = await prisma.refreshToken.findUnique({
        where: { hashedToken },
      });

      if (token && !token.revokedAt) {
        await prisma.refreshToken.update({
          where: { id: token.id },
          data: { revokedAt: new Date() },
        });

        log.auth.logout(token.userId);
      }

      return success(undefined);
    });
  }

  /**
   * Logout from all devices - revoke all refresh tokens for user
   */
  async logoutAll(userId: string): Promise<Result<void>> {
    return this.withTiming('logoutAll', async () => {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });

      log.auth.tokenRevoked(userId, 'logout_all_devices');

      return success(undefined);
    });
  }

  // ============ Token Generation ============

  /**
   * Generate access and refresh tokens
   */
  private async generateTokens(
    user: { id: string; email: string; tenantId: string; roles: string[] },
    existingFamily?: string
  ): Promise<AuthTokens> {
    const keyPair = getSigningKey();

    // Access token payload
    const accessPayload: Omit<TokenPayload, 'iat' | 'exp'> = {
      sub: user.id,
      email: user.email,
      tenantId: user.tenantId,
      roles: user.roles,
      type: 'access',
    };

    // Sign access token
    const signOptions: SignOptions = {
      algorithm: 'RS256',
      expiresIn: ACCESS_TOKEN_EXPIRY,
      issuer: 'scholarly-api',
      audience: 'scholarly-app',
      keyid: keyPair.kid,
    };

    const accessToken = jwt.sign(accessPayload, keyPair.privateKey, signOptions);

    // Generate refresh token (opaque token, not JWT)
    const refreshToken = crypto.randomBytes(64).toString('base64url');

    // Store refresh token hash in database
    const tokenFamily = existingFamily || crypto.randomUUID();
    const hashedToken = this.hashToken(refreshToken);

    await prisma.refreshToken.create({
      data: {
        tokenFamily,
        userId: user.id,
        hashedToken,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
      tokenType: 'Bearer',
    };
  }

  /**
   * Verify a JWT token
   */
  async verifyToken(
    token: string,
    expectedType: 'access' | 'refresh' = 'access'
  ): Promise<Result<TokenPayload>> {
    try {
      // Decode header to get key ID
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        return failure({
          code: 'AUTH_003',
          message: 'Invalid token format',
        });
      }

      const kid = decoded.header.kid;
      if (!kid) {
        return failure({
          code: 'AUTH_003',
          message: 'Token missing key ID',
        });
      }

      // Get the public key
      const keyPair = getKeyById(kid);
      if (!keyPair) {
        return failure({
          code: 'AUTH_003',
          message: 'Unknown signing key',
        });
      }

      // Verify token
      const verifyOptions: VerifyOptions = {
        algorithms: ['RS256'],
        issuer: 'scholarly-api',
        audience: 'scholarly-app',
      };

      const payload = jwt.verify(token, keyPair.publicKey, verifyOptions) as TokenPayload;

      // Validate token type
      if (payload.type !== expectedType) {
        return failure({
          code: 'AUTH_003',
          message: `Expected ${expectedType} token, got ${payload.type}`,
        });
      }

      return success(payload);
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return failure({
          code: 'AUTH_002',
          message: 'Token expired',
        });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return failure({
          code: 'AUTH_003',
          message: 'Token invalid',
          details: { error: error.message },
        });
      }
      throw error;
    }
  }

  // ============ Password Management ============

  /**
   * Hash a password
   */
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  /**
   * Verify a password
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // ============ Private Helpers ============

  /**
   * Hash a token for storage
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Revoke all tokens in a family (used when token reuse is detected)
   */
  private async revokeTokenFamily(tokenFamily: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: {
        tokenFamily,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    log.auth.tokenRevoked('family', `Token family revoked: ${tokenFamily}`);
  }
}

// Singleton instance
export const authService = new AuthService();
