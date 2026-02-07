/**
 * Scholarly Platform — JWT Authentication Middleware
 * ===================================================
 *
 * REM-001: The current authentication reads user identity from request
 * headers — which means any client can claim to be any user by setting
 * the right header. This is like a nightclub that lets everyone in who
 * says "I'm on the list" without checking IDs. This module replaces that
 * honour system with proper JWT-based authentication using RS256 (RSA
 * asymmetric signatures).
 *
 * ## Why RS256 over HS256?
 *
 * HS256 uses a shared secret: anyone who can verify tokens can also create
 * them. In a microservices architecture, every service that needs to verify
 * tokens would need the secret, creating multiple points of compromise.
 *
 * RS256 uses an asymmetric key pair: the private key (held only by the auth
 * service) signs tokens; the public key (distributed freely) verifies them.
 * A compromised public key can verify tokens but never forge new ones.
 * This is the difference between giving every employee a master key versus
 * giving them a key that only opens their own door.
 *
 * ## Token Architecture
 *
 * - **Access Token**: Short-lived (1 hour), carries user claims, used for
 *   API authentication. Stored in memory on the client.
 * - **Refresh Token**: Long-lived (7 days), stored in httpOnly cookie,
 *   used only to obtain new access tokens. Rotated on every use.
 * - **Token Family**: Refresh tokens are linked in families. If a refresh
 *   token is reused (indicating theft), the entire family is invalidated.
 *
 * @module infrastructure/auth-middleware
 * @version 1.0.0
 */

import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt, { JwtPayload, Algorithm } from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { Logger } from 'pino';
import { logAuditEvent, AuditLogEntry } from './logger';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

/** User roles within the Scholarly platform. */
export type UserRole = 'admin' | 'teacher' | 'parent' | 'tutor' | 'creator' | 'learner' | 'homeschool_parent';

/** Subscription plans that affect rate limits and feature access. */
export type SubscriptionPlan = 'free' | 'basic' | 'premium' | 'school' | 'enterprise';

/** Creator tiers that affect content SDK rate limits. */
export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum';

/**
 * The decoded JWT payload. This is the "ID card" that every authenticated
 * request carries. It tells the system who the user is, what tenant they
 * belong to, what role they have, and what plan they're on.
 */
export interface AuthPayload {
  /** Unique user identifier. */
  sub: string;
  /** Tenant the user belongs to (multi-tenant isolation key). */
  tenantId: string;
  /** User's role within the platform. */
  role: UserRole;
  /** User's subscription plan (affects rate limits). */
  plan: SubscriptionPlan;
  /** User's email address. */
  email: string;
  /** User's display name. */
  name: string;
  /** Token issuer (should match config). */
  iss: string;
  /** Token audience (should match config). */
  aud: string;
  /** Token issued-at timestamp (seconds since epoch). */
  iat: number;
  /** Token expiration timestamp (seconds since epoch). */
  exp: number;
  /** Unique token ID for revocation tracking. */
  jti: string;
  /** Token family ID for refresh token rotation. */
  family?: string;
}

/**
 * Creator context loaded from the database for Content SDK requests.
 * This is NOT in the JWT (too volatile); it's loaded on-demand for
 * endpoints that need creator-specific rate limits or permissions.
 */
export interface CreatorContext {
  creatorId: string;
  tier: CreatorTier;
  isVerified: boolean;
  publishedCount: number;
  engagementScore: number;
}

/**
 * Extends Express Request to include authentication context.
 */
declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
      creator?: CreatorContext;
      requestId?: string;
    }
  }
}

/**
 * Configuration for the authentication middleware.
 */
export interface AuthConfig {
  /** RSA public key for RS256 verification (PEM format). */
  publicKey: string;
  /** RSA private key for RS256 signing (PEM format). Used only by the token issuer. */
  privateKey: string;
  /** JWT algorithm. RS256 required in production. */
  algorithm: Algorithm;
  /** Expected token issuer. */
  issuer: string;
  /** Expected token audience. */
  audience: string;
  /** Access token TTL in seconds. */
  accessTokenExpirySeconds: number;
  /** Refresh token TTL in seconds. */
  refreshTokenExpirySeconds: number;
  /** Routes that don't require authentication. */
  publicRoutes: string[];
  /** Logger instance. */
  logger: Logger;
}

/**
 * Interface for the token blacklist store. In production, this is
 * backed by Redis with TTL matching the token's remaining lifetime.
 */
export interface TokenBlacklistStore {
  /** Check if a token ID (jti) has been revoked. */
  isRevoked(jti: string): Promise<boolean>;
  /** Revoke a token by its ID, with a TTL that matches its remaining validity. */
  revoke(jti: string, ttlSeconds: number): Promise<void>;
  /** Revoke all tokens in a family (used when refresh token reuse is detected). */
  revokeFamily(familyId: string, ttlSeconds: number): Promise<void>;
  /** Check if a token family has been revoked. */
  isFamilyRevoked(familyId: string): Promise<boolean>;
}

/**
 * Interface for looking up creator profiles from the database.
 */
export interface CreatorProfileStore {
  findByUserAndTenant(userId: string, tenantId: string): Promise<CreatorContext | null>;
}

// ============================================================================
// SECTION 2: TOKEN SERVICE
// ============================================================================

/**
 * The TokenService is responsible for creating and verifying JWTs.
 * It's the bouncer at the door — it issues wristbands (access tokens)
 * and checks them when people come back for another drink.
 */
export class TokenService {
  private readonly config: AuthConfig;
  private readonly blacklist: TokenBlacklistStore;
  private readonly logger: Logger;

  constructor(config: AuthConfig, blacklist: TokenBlacklistStore) {
    this.config = config;
    this.blacklist = blacklist;
    this.logger = config.logger.child({ module: 'TokenService' });
  }

  /**
   * Signs a new access token for the given user.
   */
  signAccessToken(payload: {
    userId: string;
    tenantId: string;
    role: UserRole;
    plan: SubscriptionPlan;
    email: string;
    name: string;
  }): string {
    const jti = randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload: Omit<AuthPayload, 'iss' | 'aud'> = {
      sub: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      plan: payload.plan,
      email: payload.email,
      name: payload.name,
      iat: now,
      exp: now + this.config.accessTokenExpirySeconds,
      jti,
    };

    return jwt.sign(tokenPayload, this.config.privateKey, {
      algorithm: this.config.algorithm,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  /**
   * Signs a new refresh token. Refresh tokens belong to a "family" —
   * a chain of tokens where each new refresh token invalidates its
   * predecessor. If a refresh token from an already-rotated family
   * is presented, the entire family is invalidated (theft detection).
   */
  signRefreshToken(payload: {
    userId: string;
    tenantId: string;
    role: UserRole;
    plan: SubscriptionPlan;
    email: string;
    name: string;
    familyId?: string;
  }): string {
    const jti = randomUUID();
    const familyId = payload.familyId ?? randomUUID();
    const now = Math.floor(Date.now() / 1000);

    const tokenPayload: Omit<AuthPayload, 'iss' | 'aud'> = {
      sub: payload.userId,
      tenantId: payload.tenantId,
      role: payload.role,
      plan: payload.plan,
      email: payload.email,
      name: payload.name,
      iat: now,
      exp: now + this.config.refreshTokenExpirySeconds,
      jti,
      family: familyId,
    };

    return jwt.sign(tokenPayload, this.config.privateKey, {
      algorithm: this.config.algorithm,
      issuer: this.config.issuer,
      audience: this.config.audience,
    });
  }

  /**
   * Verifies and decodes an access token. Checks:
   * 1. Signature validity (RSA verification)
   * 2. Expiration
   * 3. Issuer and audience claims
   * 4. Token blacklist (for revoked tokens)
   */
  async verifyAccessToken(token: string): Promise<AuthPayload> {
    let decoded: AuthPayload;
    try {
      decoded = jwt.verify(token, this.config.publicKey, {
        algorithms: [this.config.algorithm],
        issuer: this.config.issuer,
        audience: this.config.audience,
      }) as AuthPayload;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Token expired');
      }
      if (err instanceof jwt.JsonWebTokenError) {
        throw new AuthenticationError(`Invalid token: ${err.message}`);
      }
      throw new AuthenticationError('Token verification failed');
    }

    // Check blacklist
    if (decoded.jti && await this.blacklist.isRevoked(decoded.jti)) {
      throw new AuthenticationError('Token has been revoked');
    }

    return decoded;
  }

  /**
   * Verifies a refresh token and implements rotation detection.
   * If the token's family has been revoked (indicating a previous
   * token in the chain was reused after rotation), this throws
   * and the caller should invalidate all sessions for the user.
   */
  async verifyRefreshToken(token: string): Promise<AuthPayload> {
    const decoded = await this.verifyAccessToken(token);

    if (decoded.family) {
      const familyRevoked = await this.blacklist.isFamilyRevoked(decoded.family);
      if (familyRevoked) {
        this.logger.warn({
          userId: decoded.sub,
          tenantId: decoded.tenantId,
          familyId: decoded.family,
        }, 'Refresh token reuse detected — possible token theft');
        throw new AuthenticationError('Refresh token family revoked — possible token theft');
      }
    }

    return decoded;
  }

  /**
   * Rotates a refresh token: verifies the old one, revokes it,
   * and issues a new one in the same family. Returns both new
   * access and refresh tokens.
   */
  async rotateRefreshToken(oldRefreshToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
    payload: AuthPayload;
  }> {
    const decoded = await this.verifyRefreshToken(oldRefreshToken);

    // Revoke the old refresh token
    const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
    if (decoded.jti && remainingTtl > 0) {
      await this.blacklist.revoke(decoded.jti, remainingTtl);
    }

    const userPayload = {
      userId: decoded.sub,
      tenantId: decoded.tenantId,
      role: decoded.role,
      plan: decoded.plan,
      email: decoded.email,
      name: decoded.name,
    };

    const accessToken = this.signAccessToken(userPayload);
    const refreshToken = this.signRefreshToken({
      ...userPayload,
      familyId: decoded.family,
    });

    return {
      accessToken,
      refreshToken,
      payload: decoded,
    };
  }

  /**
   * Revokes all tokens for a user (e.g., on password change or
   * suspicious activity). This revokes by family IDs, so all
   * active refresh token chains are invalidated.
   */
  async revokeAllForUser(userId: string, familyIds: string[]): Promise<void> {
    for (const familyId of familyIds) {
      await this.blacklist.revokeFamily(familyId, this.config.refreshTokenExpirySeconds);
    }
    this.logger.info({ userId, familyCount: familyIds.length }, 'All token families revoked for user');
  }
}

// ============================================================================
// SECTION 3: AUTHENTICATION ERROR
// ============================================================================

export class AuthenticationError extends Error {
  public readonly statusCode = 401;
  public readonly code = 'AUTHENTICATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  public readonly statusCode = 403;
  public readonly code = 'AUTHORIZATION_ERROR';

  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// ============================================================================
// SECTION 4: REDIS-BACKED TOKEN BLACKLIST
// ============================================================================

/**
 * Redis-backed implementation of the token blacklist. Each revoked token
 * is stored as a key with a TTL matching the token's remaining validity.
 * Once the token would have expired naturally, the Redis key self-destructs.
 *
 * This is vastly more efficient than a database table of revoked tokens —
 * Redis is sub-millisecond for key lookups, and expired entries are garbage
 * collected automatically.
 */
export class RedisTokenBlacklist implements TokenBlacklistStore {
  private readonly redis: RedisClientInterface;
  private readonly prefix: string;

  constructor(redis: RedisClientInterface, prefix: string = 'scholarly:auth:blacklist:') {
    this.redis = redis;
    this.prefix = prefix;
  }

  async isRevoked(jti: string): Promise<boolean> {
    const result = await this.redis.get(`${this.prefix}token:${jti}`);
    return result !== null;
  }

  async revoke(jti: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`${this.prefix}token:${jti}`, ttlSeconds, 'revoked');
  }

  async revokeFamily(familyId: string, ttlSeconds: number): Promise<void> {
    await this.redis.setex(`${this.prefix}family:${familyId}`, ttlSeconds, 'revoked');
  }

  async isFamilyRevoked(familyId: string): Promise<boolean> {
    const result = await this.redis.get(`${this.prefix}family:${familyId}`);
    return result !== null;
  }
}

/**
 * Minimal Redis client interface — compatible with ioredis.
 * We define our own interface so we're not tightly coupled to a specific
 * Redis client library.
 */
export interface RedisClientInterface {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<string>;
  del(key: string | string[]): Promise<number>;
  exists(key: string | string[]): Promise<number>;
}

// ============================================================================
// SECTION 5: AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * Express middleware that verifies the JWT bearer token on every request.
 *
 * For public routes (health checks, login, registration), authentication
 * is skipped. For all other routes, a valid JWT must be present in the
 * Authorization header as a Bearer token.
 *
 * On successful verification, the decoded payload is attached to req.auth
 * and a request-scoped logger is created with the user's context.
 */
export function createAuthMiddleware(
  tokenService: TokenService,
  config: AuthConfig,
): RequestHandler {
  const logger = config.logger.child({ module: 'AuthMiddleware' });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Assign request ID
    req.requestId = (req.headers['x-request-id'] as string) ?? randomUUID();
    res.setHeader('x-request-id', req.requestId);

    // Check if route is public
    const isPublic = config.publicRoutes.some((pattern) => {
      const regex = new RegExp(
        '^' + pattern.replace(/:\w+/g, '[^/]+').replace(/\*/g, '.*') + '$',
      );
      return regex.test(req.path);
    });

    if (isPublic) {
      return next();
    }

    // Extract token
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authorization header with Bearer token is required',
        },
      });
      return;
    }

    const token = authHeader.slice(7);

    try {
      const payload = await tokenService.verifyAccessToken(token);
      req.auth = payload;

      // Log the authentication (at debug level to avoid noise)
      logger.debug({
        userId: payload.sub,
        tenantId: payload.tenantId,
        role: payload.role,
        path: req.path,
        method: req.method,
      }, 'Request authenticated');

      next();
    } catch (err) {
      if (err instanceof AuthenticationError) {
        logAuditEvent(logger, {
          category: 'auth',
          action: 'token_verification_failed',
          actor: {
            userId: 'unknown',
            role: 'unknown',
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
          },
          target: {
            type: 'api',
            id: req.path,
            tenantId: 'unknown',
          },
          outcome: 'failure',
          metadata: { error: err.message },
        });

        res.status(401).json({
          success: false,
          error: {
            code: err.code,
            message: err.message,
          },
        });
        return;
      }

      logger.error({ err, path: req.path }, 'Unexpected auth error');
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Authentication service error',
        },
      });
    }
  };
}

// ============================================================================
// SECTION 6: TENANT ISOLATION MIDDLEWARE
// ============================================================================

/**
 * Ensures that every authenticated request is scoped to a specific tenant.
 * This is the multi-tenancy enforcement point — no request can access
 * data outside its tenant boundary.
 *
 * Think of this as the apartment building's key card system: your card
 * opens the lobby and your own floor, but not anyone else's floor.
 */
export function createTenantIsolationMiddleware(logger: Logger): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (req.auth?.tenantId) {
      // Ensure any tenantId in the request body or params matches the JWT
      const bodyTenantId = req.body?.tenantId;
      const paramTenantId = req.params?.tenantId;

      if (bodyTenantId && bodyTenantId !== req.auth.tenantId) {
        logger.warn({
          userId: req.auth.sub,
          jwtTenantId: req.auth.tenantId,
          requestTenantId: bodyTenantId,
        }, 'Tenant mismatch in request body');

        // Silently override to prevent cross-tenant access
        req.body.tenantId = req.auth.tenantId;
      }

      if (paramTenantId && paramTenantId !== req.auth.tenantId) {
        // Admin can access other tenants; normal users cannot
        if (req.auth.role !== 'admin') {
          logger.warn({
            userId: req.auth.sub,
            jwtTenantId: req.auth.tenantId,
            requestTenantId: paramTenantId,
          }, 'Cross-tenant access attempt denied');

          // Override param
          req.params.tenantId = req.auth.tenantId;
        }
      }
    }

    next();
  };
}

// ============================================================================
// SECTION 7: ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================================================

/**
 * Role-based access control (RBAC) middleware factory.
 * Returns a middleware that only allows requests from users with
 * one of the specified roles.
 *
 * Usage:
 *   router.post('/admin/users', requireRoles('admin'), adminController.createUser);
 *   router.get('/reports', requireRoles('admin', 'teacher'), reportController.list);
 */
export function requireRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: {
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!allowedRoles.includes(req.auth.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_ROLE',
          message: `This action requires one of the following roles: ${allowedRoles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Middleware that requires the requesting user to either be the resource
 * owner or have an admin role. Used for user-specific endpoints.
 *
 * Usage:
 *   router.get('/users/:userId/profile', requireOwnerOrAdmin('userId'), profileController.get);
 */
export function requireOwnerOrAdmin(userIdParam: string = 'userId'): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.auth) {
      res.status(401).json({
        success: false,
        error: { code: 'NOT_AUTHENTICATED', message: 'Authentication required' },
      });
      return;
    }

    const targetUserId = req.params[userIdParam];
    const isOwner = req.auth.sub === targetUserId;
    const isAdmin = req.auth.role === 'admin';

    if (!isOwner && !isAdmin) {
      res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You can only access your own resources',
        },
      });
      return;
    }

    next();
  };
}

// ============================================================================
// SECTION 8: CREATOR CONTEXT MIDDLEWARE
// ============================================================================

/**
 * Middleware that loads creator profile information for Content SDK
 * endpoints. This enriches the request with tier-specific data used
 * for rate limiting and feature gating.
 */
export function createCreatorContextMiddleware(
  creatorStore: CreatorProfileStore,
  logger: Logger,
): RequestHandler {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.auth) {
      return next();
    }

    try {
      const creator = await creatorStore.findByUserAndTenant(req.auth.sub, req.auth.tenantId);
      if (creator) {
        req.creator = creator;
      }
    } catch (err) {
      // Non-fatal: if we can't load the creator profile, we proceed
      // without it and the user gets default rate limits
      logger.warn({ err, userId: req.auth.sub }, 'Failed to load creator profile');
    }

    next();
  };
}

// ============================================================================
// SECTION 9: AUTH ROUTES
// ============================================================================

/**
 * Creates the authentication route handlers for login, refresh, and logout.
 * These are registered as public routes in the auth middleware.
 */
export interface AuthRoutesDeps {
  tokenService: TokenService;
  logger: Logger;
  /** Finds user by email and verifies password. Returns null if invalid. */
  verifyCredentials: (email: string, password: string) => Promise<{
    userId: string;
    tenantId: string;
    role: UserRole;
    plan: SubscriptionPlan;
    email: string;
    name: string;
  } | null>;
}

export function createAuthRoutes(deps: AuthRoutesDeps) {
  const { tokenService, logger, verifyCredentials } = deps;

  return {
    /**
     * POST /auth/login — Authenticates a user and returns tokens.
     */
    async login(req: Request, res: Response): Promise<void> {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_REQUEST', message: 'Email and password are required' },
        });
        return;
      }

      const user = await verifyCredentials(email, password);
      if (!user) {
        logAuditEvent(logger, {
          category: 'auth',
          action: 'login_failed',
          actor: { userId: 'unknown', role: 'unknown', ipAddress: req.ip },
          target: { type: 'auth', id: email, tenantId: 'unknown' },
          outcome: 'failure',
          metadata: { reason: 'invalid_credentials' },
        });

        res.status(401).json({
          success: false,
          error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' },
        });
        return;
      }

      const accessToken = tokenService.signAccessToken(user);
      const refreshToken = tokenService.signRefreshToken(user);

      logAuditEvent(logger, {
        category: 'auth',
        action: 'login_success',
        actor: { userId: user.userId, role: user.role, ipAddress: req.ip },
        target: { type: 'auth', id: user.email, tenantId: user.tenantId },
        outcome: 'success',
      });

      // Set refresh token as httpOnly cookie
      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/api/v1/auth/refresh',
      });

      res.json({
        success: true,
        data: {
          accessToken,
          expiresIn: 3600,
          user: {
            id: user.userId,
            email: user.email,
            name: user.name,
            role: user.role,
            plan: user.plan,
            tenantId: user.tenantId,
          },
        },
      });
    },

    /**
     * POST /auth/refresh — Rotates the refresh token and issues a new access token.
     */
    async refresh(req: Request, res: Response): Promise<void> {
      const refreshToken = req.cookies?.refreshToken ?? req.body?.refreshToken;

      if (!refreshToken) {
        res.status(401).json({
          success: false,
          error: { code: 'MISSING_REFRESH_TOKEN', message: 'Refresh token is required' },
        });
        return;
      }

      try {
        const result = await tokenService.rotateRefreshToken(refreshToken);

        // Set new refresh token cookie
        res.cookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 7 * 24 * 60 * 60 * 1000,
          path: '/api/v1/auth/refresh',
        });

        res.json({
          success: true,
          data: {
            accessToken: result.accessToken,
            expiresIn: 3600,
          },
        });
      } catch (err) {
        if (err instanceof AuthenticationError) {
          // Clear the compromised refresh token
          res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

          res.status(401).json({
            success: false,
            error: { code: 'INVALID_REFRESH_TOKEN', message: err.message },
          });
          return;
        }
        throw err;
      }
    },

    /**
     * POST /auth/logout — Revokes the current refresh token.
     */
    async logout(req: Request, res: Response): Promise<void> {
      const refreshToken = req.cookies?.refreshToken;

      if (refreshToken) {
        try {
          const decoded = jwt.decode(refreshToken) as AuthPayload | null;
          if (decoded?.jti) {
            const remainingTtl = decoded.exp - Math.floor(Date.now() / 1000);
            if (remainingTtl > 0) {
              await tokenService['blacklist'].revoke(decoded.jti, remainingTtl);
            }
          }
        } catch {
          // If the token is already invalid, that's fine — it's being revoked anyway
        }
      }

      res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

      logAuditEvent(logger, {
        category: 'auth',
        action: 'logout',
        actor: {
          userId: req.auth?.sub ?? 'unknown',
          role: req.auth?.role ?? 'unknown',
          ipAddress: req.ip,
        },
        target: {
          type: 'auth',
          id: req.auth?.email ?? 'unknown',
          tenantId: req.auth?.tenantId ?? 'unknown',
        },
        outcome: 'success',
      });

      res.json({ success: true, data: { message: 'Logged out successfully' } });
    },
  };
}
