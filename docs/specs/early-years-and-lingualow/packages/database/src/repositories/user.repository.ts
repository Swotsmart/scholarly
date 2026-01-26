/**
 * User Repository
 * 
 * Handles user data access including:
 * - CRUD operations
 * - Authentication support
 * - Refresh token management
 * - Login tracking and lockout
 * 
 * @module @scholarly/database/repositories
 */

import { Prisma, User, RefreshToken } from '@prisma/client';
import { prisma, TransactionClient, withDatabase } from '../client.js';
import { TenantScopedRepository } from './base.repository.js';
import { Result, success, failure, NotFoundError } from '@scholarly/shared';
import bcrypt from 'bcryptjs';

// =============================================================================
// USER REPOSITORY
// =============================================================================

export class UserRepository extends TenantScopedRepository<
  User,
  Prisma.UserCreateInput,
  Prisma.UserUpdateInput,
  Prisma.UserWhereUniqueInput,
  Prisma.UserWhereInput,
  Prisma.UserOrderByWithRelationInput
> {
  protected entityName = 'User';

  protected getDelegate(tx?: TransactionClient) {
    const client = tx || prisma;
    return client.user;
  }

  protected buildUniqueWhere(id: string): Prisma.UserWhereUniqueInput {
    return { id };
  }

  // ===========================================================================
  // LOOKUP METHODS
  // ===========================================================================

  /**
   * Find user by email within tenant
   */
  async findByEmail(email: string): Promise<Result<User | null>> {
    return withDatabase(async () => {
      const user = await prisma.user.findFirst({
        where: {
          email: email.toLowerCase(),
          deletedAt: null,
        },
      });
      return success(user);
    }, 'User.findByEmail');
  }

  /**
   * Find user by email within specific tenant
   */
  async findByEmailInTenant(
    tenantId: string,
    email: string
  ): Promise<Result<User | null>> {
    return withDatabase(async () => {
      const user = await prisma.user.findFirst({
        where: {
          tenantId,
          email: email.toLowerCase(),
          deletedAt: null,
        },
      });
      return success(user);
    }, 'User.findByEmailInTenant');
  }

  // ===========================================================================
  // LOGIN TRACKING
  // ===========================================================================

  /**
   * Update last login timestamp and reset failed attempts
   */
  async updateLastLogin(id: string): Promise<Result<User>> {
    return this.update(id, {
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    });
  }

  /**
   * Record a failed login attempt
   * Locks account after 5 failed attempts for 15 minutes
   */
  async recordFailedLogin(id: string): Promise<Result<User>> {
    return withDatabase(async () => {
      const user = await prisma.user.update({
        where: { id },
        data: {
          failedLoginAttempts: { increment: 1 },
        },
      });

      // Lock account after 5 failed attempts
      if (user.failedLoginAttempts >= 5 && !user.lockedUntil) {
        const lockedUntil = new Date();
        lockedUntil.setMinutes(lockedUntil.getMinutes() + 15);
        
        return success(await prisma.user.update({
          where: { id },
          data: { lockedUntil },
        }));
      }

      return success(user);
    }, 'User.recordFailedLogin');
  }

  /**
   * Check if user account is locked
   */
  async isLocked(id: string): Promise<boolean> {
    const result = await this.findById(id);
    if (!result.success) return false;
    
    const user = result.data;
    if (!user.lockedUntil) return false;
    
    return user.lockedUntil > new Date();
  }

  // ===========================================================================
  // REFRESH TOKEN MANAGEMENT
  // ===========================================================================

  /**
   * Store a refresh token for a session
   */
  async storeRefreshToken(
    userId: string,
    sessionId: string,
    tokenHash: string
  ): Promise<Result<RefreshToken>> {
    return withDatabase(async () => {
      // Calculate expiry (7 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const token = await prisma.refreshToken.create({
        data: {
          userId,
          sessionId,
          tokenHash,
          expiresAt,
        },
      });

      return success(token);
    }, 'User.storeRefreshToken');
  }

  /**
   * Verify a refresh token against stored hash
   */
  async verifyRefreshToken(
    userId: string,
    sessionId: string,
    token: string
  ): Promise<boolean> {
    const result = await withDatabase(async () => {
      const stored = await prisma.refreshToken.findUnique({
        where: {
          userId_sessionId: { userId, sessionId },
        },
      });

      if (!stored) return success(false);
      if (stored.revokedAt) return success(false);
      if (stored.expiresAt < new Date()) return success(false);

      // Verify token against hash
      const isValid = await bcrypt.compare(token, stored.tokenHash);
      return success(isValid);
    }, 'User.verifyRefreshToken');

    return result.success && result.data;
  }

  /**
   * Invalidate a specific refresh token
   */
  async invalidateRefreshToken(
    userId: string,
    sessionId: string
  ): Promise<Result<void>> {
    return withDatabase(async () => {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          sessionId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return success(undefined);
    }, 'User.invalidateRefreshToken');
  }

  /**
   * Invalidate all refresh tokens for a user (logout from all devices)
   */
  async invalidateAllSessions(userId: string): Promise<Result<void>> {
    return withDatabase(async () => {
      await prisma.refreshToken.updateMany({
        where: {
          userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      return success(undefined);
    }, 'User.invalidateAllSessions');
  }

  /**
   * Clean up expired refresh tokens
   */
  async cleanupExpiredTokens(): Promise<Result<number>> {
    return withDatabase(async () => {
      const result = await prisma.refreshToken.deleteMany({
        where: {
          OR: [
            { expiresAt: { lt: new Date() } },
            { revokedAt: { not: null } },
          ],
        },
      });

      return success(result.count);
    }, 'User.cleanupExpiredTokens');
  }

  // ===========================================================================
  // PASSWORD MANAGEMENT
  // ===========================================================================

  /**
   * Verify email address
   */
  async verifyEmail(id: string): Promise<Result<User>> {
    return this.update(id, {
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });
  }

  /**
   * Update password (assumes hash is already computed)
   */
  async updatePassword(id: string, passwordHash: string): Promise<Result<User>> {
    return this.update(id, {
      passwordHash,
      passwordChangedAt: new Date(),
    });
  }
}

// =============================================================================
// SINGLETON EXPORT
// =============================================================================

export const userRepository = new UserRepository();
