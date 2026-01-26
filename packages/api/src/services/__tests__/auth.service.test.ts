/**
 * Auth Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService, authService } from '../auth.service';
import { createTestUser, createTestTenant } from '../../test/factories/user.factory';
import { prisma } from '@scholarly/database';

// Mock dependencies
vi.mock('../../config/keys', () => ({
  getSigningKey: vi.fn(() => ({
    kid: 'test-key-id',
    publicKey: 'test-public-key',
    privateKey: 'test-private-key',
    algorithm: 'RS256',
    createdAt: new Date(),
  })),
  getKeyById: vi.fn((kid: string) => {
    if (kid === 'test-key-id') {
      return {
        kid: 'test-key-id',
        publicKey: 'test-public-key',
        privateKey: 'test-private-key',
        algorithm: 'RS256',
        createdAt: new Date(),
      };
    }
    return undefined;
  }),
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn((password: string, hash: string) =>
      password === 'correct-password'
    ),
    hash: vi.fn((password: string) => `hashed_${password}`),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(() => 'mock-access-token'),
    verify: vi.fn((token: string) => {
      if (token === 'valid-token') {
        return {
          sub: 'user-123',
          email: 'test@example.com',
          tenantId: 'tenant-123',
          roles: ['learner'],
          type: 'access',
          iat: Date.now() / 1000,
          exp: Date.now() / 1000 + 900,
        };
      }
      throw new Error('Invalid token');
    }),
    decode: vi.fn((token: string) => ({
      header: { kid: 'test-key-id', alg: 'RS256' },
      payload: {
        sub: 'user-123',
        email: 'test@example.com',
        type: 'access',
      },
    })),
  },
}));

describe('AuthService', () => {
  const tenant = createTestTenant({ id: 'tenant-123' });
  const user = createTestUser({
    id: 'user-123',
    tenantId: tenant.id,
    email: 'test@example.com',
    passwordHash: 'hashed_correct-password',
    status: 'active',
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens for valid credentials', async () => {
      // Arrange
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...user,
        tenant,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue(user as any);
      vi.mocked(prisma.refreshToken.create).mockResolvedValue({
        id: 'refresh-token-id',
        tokenFamily: 'family-123',
        userId: user.id,
        hashedToken: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        replacedBy: null,
        createdAt: new Date(),
      } as any);

      // Act
      const result = await authService.login({
        email: 'test@example.com',
        password: 'correct-password',
        tenantId: tenant.id,
      });

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.accessToken).toBeDefined();
        expect(result.data.refreshToken).toBeDefined();
        expect(result.data.tokenType).toBe('Bearer');
        expect(result.data.expiresIn).toBe(900);
      }
    });

    it('should return failure for invalid credentials', async () => {
      // Arrange
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...user,
        tenant,
      } as any);

      // Act
      const result = await authService.login({
        email: 'test@example.com',
        password: 'wrong-password',
        tenantId: tenant.id,
      });

      // Assert
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('AUTH_001');
      }
    });

    it('should return failure for non-existent user', async () => {
      // Arrange
      vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

      // Act
      const result = await authService.login({
        email: 'nonexistent@example.com',
        password: 'any-password',
        tenantId: tenant.id,
      });

      // Assert
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('AUTH_001');
      }
    });

    it('should return failure for suspended user', async () => {
      // Arrange
      const suspendedUser = { ...user, status: 'suspended' };
      vi.mocked(prisma.user.findFirst).mockResolvedValue({
        ...suspendedUser,
        tenant,
      } as any);

      // Act
      const result = await authService.login({
        email: 'test@example.com',
        password: 'correct-password',
        tenantId: tenant.id,
      });

      // Assert
      expect(result.success).toBe(false);
      if (result.success === false) {
        expect(result.error.code).toBe('AUTH_006');
      }
    });
  });

  describe('verifyToken', () => {
    it('should verify a valid access token', async () => {
      // Act
      const result = await authService.verifyToken('valid-token', 'access');

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sub).toBe('user-123');
        expect(result.data.email).toBe('test@example.com');
        expect(result.data.type).toBe('access');
      }
    });

    it('should fail for invalid token', async () => {
      // Act
      const result = await authService.verifyToken('invalid-token', 'access');

      // Assert
      expect(result.success).toBe(false);
    });
  });

  describe('logout', () => {
    it('should revoke refresh token', async () => {
      // Arrange
      vi.mocked(prisma.refreshToken.findUnique).mockResolvedValue({
        id: 'refresh-token-id',
        tokenFamily: 'family-123',
        userId: user.id,
        hashedToken: 'hashed-token',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        revokedAt: null,
        replacedBy: null,
        createdAt: new Date(),
      } as any);
      vi.mocked(prisma.refreshToken.update).mockResolvedValue({} as any);

      // Act
      const result = await authService.logout('some-refresh-token');

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.refreshToken.update).toHaveBeenCalled();
    });
  });

  describe('logoutAll', () => {
    it('should revoke all refresh tokens for user', async () => {
      // Arrange
      vi.mocked(prisma.refreshToken.updateMany).mockResolvedValue({ count: 3 });

      // Act
      const result = await authService.logoutAll('user-123');

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          revokedAt: null,
        },
        data: expect.objectContaining({
          revokedAt: expect.any(Date),
        }),
      });
    });
  });

  describe('hashPassword', () => {
    it('should hash a password', async () => {
      // Act
      const hash = await authService.hashPassword('my-password');

      // Assert
      expect(hash).toBe('hashed_my-password');
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      // Act
      const isValid = await authService.verifyPassword('correct-password', 'hashed');

      // Assert
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      // Act
      const isValid = await authService.verifyPassword('wrong-password', 'hashed');

      // Assert
      expect(isValid).toBe(false);
    });
  });
});
