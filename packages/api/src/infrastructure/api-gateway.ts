// =============================================================================
// SCHOLARLY PLATFORM — Sprint 7: LR-007
// API Gateway & Rate Limiting
// =============================================================================
// The bouncer at the front door of every Scholarly API endpoint. Handles
// authentication verification, tenant isolation, rate limiting (per-tenant
// and per-creator-tier), request validation, and circuit breaking for
// downstream services. Think of it as airport security: check your ticket
// (JWT), verify your identity (tenant), ensure you're not carrying
// prohibited items (request validation), and manage the flow of passengers
// (rate limiting) so the plane doesn't get overcrowded.
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Gateway Configuration
// =============================================================================

export interface GatewayConfig {
  port: number;
  basePath: string;
  cors: CorsConfig;
  rateLimiting: RateLimitConfig;
  authentication: AuthConfig;
  requestLimits: RequestLimitConfig;
  circuitBreaker: CircuitBreakerConfig;
  tenantIsolation: TenantIsolationConfig;
}

export interface CorsConfig {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  exposedHeaders: string[];
  maxAge: number;
  credentials: boolean;
}

export interface RateLimitConfig {
  global: { windowMs: number; maxRequests: number };
  perTenant: { windowMs: number; maxRequests: number };
  perUser: { windowMs: number; maxRequests: number };
  perCreatorTier: Record<string, { rpm: number; dailyLimit: number }>;
  endpoints: EndpointRateLimit[];
}

export interface EndpointRateLimit {
  path: string;
  method: string;
  windowMs: number;
  maxRequests: number;
  costWeight: number;  // Some endpoints cost more (e.g., generation)
}

export interface AuthConfig {
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  tokenExpiry: string;
  refreshTokenExpiry: string;
  apiKeyHeader: string;
  allowedApiKeyPrefixes: string[];
}

export interface RequestLimitConfig {
  maxBodySize: string;
  maxUrlLength: number;
  maxHeaderSize: number;
  timeout: number;
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests: number;
  monitoredServices: string[];
}

export interface TenantIsolationConfig {
  headerName: string;
  enforceOnAllRoutes: boolean;
  publicRoutes: string[];
}

// =============================================================================
// Section 2: Default Configuration
// =============================================================================

export const DEFAULT_GATEWAY_CONFIG: GatewayConfig = {
  port: 3000,
  basePath: '/api/v1',
  cors: {
    allowedOrigins: [
      'https://scholarly.app',
      'https://dev.scholarly.app',
      'https://staging.scholarly.app',
      'http://localhost:3000',
      'http://localhost:19006', // Expo dev server
    ],
    allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Request-Id', 'X-API-Key'],
    exposedHeaders: ['X-Request-Id', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400,
    credentials: true,
  },
  rateLimiting: {
    global: { windowMs: 60_000, maxRequests: 1000 },
    perTenant: { windowMs: 60_000, maxRequests: 500 },
    perUser: { windowMs: 60_000, maxRequests: 100 },
    perCreatorTier: {
      BRONZE: { rpm: 30, dailyLimit: 500 },
      SILVER: { rpm: 60, dailyLimit: 2000 },
      GOLD: { rpm: 120, dailyLimit: 10000 },
      PLATINUM: { rpm: 180, dailyLimit: 50000 },
    },
    endpoints: [
      { path: '/stories/generate', method: 'POST', windowMs: 60_000, maxRequests: 5, costWeight: 10 },
      { path: '/stories/:id/illustrate', method: 'POST', windowMs: 60_000, maxRequests: 3, costWeight: 15 },
      { path: '/stories/:id/narrate', method: 'POST', windowMs: 60_000, maxRequests: 5, costWeight: 8 },
      { path: '/stories/:id/validate', method: 'POST', windowMs: 60_000, maxRequests: 20, costWeight: 2 },
      { path: '/stories/:id/submit', method: 'POST', windowMs: 3600_000, maxRequests: 10, costWeight: 1 },
      { path: '/library/search', method: 'GET', windowMs: 60_000, maxRequests: 60, costWeight: 1 },
      { path: '/library/recommend', method: 'GET', windowMs: 60_000, maxRequests: 30, costWeight: 2 },
      { path: '/characters', method: 'POST', windowMs: 60_000, maxRequests: 10, costWeight: 3 },
    ],
  },
  authentication: {
    jwtSecret: process.env.JWT_SECRET || '',
    jwtIssuer: 'scholarly.app',
    jwtAudience: 'scholarly-api',
    tokenExpiry: '1h',
    refreshTokenExpiry: '30d',
    apiKeyHeader: 'X-API-Key',
    allowedApiKeyPrefixes: ['sk_live_', 'sk_test_'],
  },
  requestLimits: {
    maxBodySize: '10mb',
    maxUrlLength: 2048,
    maxHeaderSize: 8192,
    timeout: 30000,
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30000,
    halfOpenRequests: 3,
    monitoredServices: ['database', 'redis', 'nats', 'ai-provider'],
  },
  tenantIsolation: {
    headerName: 'X-Tenant-Id',
    enforceOnAllRoutes: true,
    publicRoutes: ['/health', '/metrics', '/auth/login', '/auth/register', '/auth/refresh'],
  },
};

// =============================================================================
// Section 3: Rate Limiter
// =============================================================================

export interface RateLimitEntry {
  key: string;
  count: number;
  windowStart: number;
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfterMs: number;
}

export class RateLimiter {
  private readonly windows: Map<string, RateLimitEntry> = new Map();

  constructor(private readonly store?: RedisStore) {}

  async check(key: string, windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    if (this.store) {
      return this.checkDistributed(key, windowMs, maxRequests);
    }
    return this.checkLocal(key, windowMs, maxRequests);
  }

  private checkLocal(key: string, windowMs: number, maxRequests: number): RateLimitResult {
    const now = Date.now();
    let entry = this.windows.get(key);

    if (!entry || now - entry.windowStart >= windowMs) {
      entry = { key, count: 0, windowStart: now, windowMs, maxRequests };
      this.windows.set(key, entry);
    }

    entry.count++;
    const remaining = Math.max(0, maxRequests - entry.count);
    const resetAt = new Date(entry.windowStart + windowMs);

    return {
      allowed: entry.count <= maxRequests,
      remaining,
      resetAt,
      retryAfterMs: entry.count > maxRequests ? entry.windowStart + windowMs - now : 0,
    };
  }

  private async checkDistributed(key: string, windowMs: number, maxRequests: number): Promise<RateLimitResult> {
    // Redis-based sliding window rate limiting
    const now = Date.now();
    const windowKey = `ratelimit:${key}`;

    try {
      const count = await this.store!.incrementAndExpire(windowKey, windowMs);
      const remaining = Math.max(0, maxRequests - count);

      return {
        allowed: count <= maxRequests,
        remaining,
        resetAt: new Date(now + windowMs),
        retryAfterMs: count > maxRequests ? windowMs : 0,
      };
    } catch {
      // Fallback to local on Redis failure (fail-open for availability)
      return this.checkLocal(key, windowMs, maxRequests);
    }
  }

  // Cleanup expired windows (for local mode)
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.windows) {
      if (now - entry.windowStart >= entry.windowMs * 2) {
        this.windows.delete(key);
      }
    }
  }
}

// =============================================================================
// Section 4: Request Validator
// =============================================================================

export interface ValidationRule {
  path: string;
  method: string;
  body?: SchemaDefinition;
  query?: SchemaDefinition;
  params?: SchemaDefinition;
}

export interface SchemaDefinition {
  required: string[];
  properties: Record<string, { type: string; minLength?: number; maxLength?: number; minimum?: number; maximum?: number; enum?: string[]; pattern?: string }>;
}

export const API_VALIDATION_RULES: ValidationRule[] = [
  {
    path: '/stories/generate',
    method: 'POST',
    body: {
      required: ['phase', 'targetGpcs', 'taughtGpcSet', 'theme', 'pageCount'],
      properties: {
        phase: { type: 'string', enum: ['PHASE_2', 'PHASE_3', 'PHASE_4', 'PHASE_5', 'PHASE_6'] },
        targetGpcs: { type: 'array', minLength: 1 },
        taughtGpcSet: { type: 'array', minLength: 1 },
        theme: { type: 'string', minLength: 3, maxLength: 500 },
        pageCount: { type: 'number', minimum: 4, maximum: 24 },
        ageMin: { type: 'number', minimum: 3, maximum: 12 },
        ageMax: { type: 'number', minimum: 3, maximum: 12 },
        artStyle: { type: 'string', enum: ['watercolour', 'flat_vector', 'soft_3d', 'crayon', 'papercraft', 'pencil_sketch', 'digital_painting', 'collage', 'pixel_art', 'ink_wash', 'pastel', 'oil_painting'] },
        vocabularyTier: { type: 'string', enum: ['TIER_1', 'TIER_2', 'TIER_3'] },
      },
    },
  },
  {
    path: '/stories/:id/submit',
    method: 'POST',
    body: {
      required: [],
      properties: {
        notes: { type: 'string', maxLength: 2000 },
        targetBountyId: { type: 'string' },
      },
    },
  },
  {
    path: '/library/search',
    method: 'GET',
    query: {
      required: [],
      properties: {
        phase: { type: 'string', enum: ['PHASE_2', 'PHASE_3', 'PHASE_4', 'PHASE_5', 'PHASE_6'] },
        theme: { type: 'string', maxLength: 100 },
        artStyle: { type: 'string' },
        minDecodability: { type: 'number', minimum: 0, maximum: 1 },
        page: { type: 'number', minimum: 1 },
        limit: { type: 'number', minimum: 1, maximum: 100 },
      },
    },
  },
  {
    path: '/characters',
    method: 'POST',
    body: {
      required: ['name', 'description', 'visualDescription'],
      properties: {
        name: { type: 'string', minLength: 1, maxLength: 100 },
        description: { type: 'string', minLength: 10, maxLength: 2000 },
        visualDescription: { type: 'string', minLength: 10, maxLength: 2000 },
        personalityTraits: { type: 'array' },
        ageRange: { type: 'string', pattern: '^\\d+-\\d+$' },
      },
    },
  },
];

export class RequestValidator {
  private readonly rules: Map<string, ValidationRule>;

  constructor(rules: ValidationRule[]) {
    this.rules = new Map(rules.map(r => [`${r.method}:${r.path}`, r]));
  }

  validate(method: string, path: string, body?: unknown, query?: unknown): Result<void> {
    const normalizedPath = this.normalizePath(path);
    const rule = this.rules.get(`${method}:${normalizedPath}`);

    if (!rule) return Result.ok(undefined); // No rule = no validation needed

    const errors: string[] = [];

    if (rule.body && body) {
      errors.push(...this.validateSchema(body as Record<string, unknown>, rule.body, 'body'));
    }

    if (rule.query && query) {
      errors.push(...this.validateSchema(query as Record<string, unknown>, rule.query, 'query'));
    }

    if (errors.length > 0) {
      return Result.fail(`Validation failed: ${errors.join('; ')}`);
    }

    return Result.ok(undefined);
  }

  private validateSchema(data: Record<string, unknown>, schema: SchemaDefinition, location: string): string[] {
    const errors: string[] = [];

    // Check required fields
    for (const field of schema.required) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        errors.push(`${location}.${field} is required`);
      }
    }

    // Check property constraints
    for (const [field, constraints] of Object.entries(schema.properties)) {
      const value = data[field];
      if (value === undefined) continue;

      if (constraints.type === 'string' && typeof value === 'string') {
        if (constraints.minLength && value.length < constraints.minLength) {
          errors.push(`${location}.${field} must be at least ${constraints.minLength} characters`);
        }
        if (constraints.maxLength && value.length > constraints.maxLength) {
          errors.push(`${location}.${field} must be at most ${constraints.maxLength} characters`);
        }
        if (constraints.enum && !constraints.enum.includes(value)) {
          errors.push(`${location}.${field} must be one of: ${constraints.enum.join(', ')}`);
        }
        if (constraints.pattern && !new RegExp(constraints.pattern).test(value)) {
          errors.push(`${location}.${field} does not match required pattern`);
        }
      }

      if (constraints.type === 'number' && typeof value === 'number') {
        if (constraints.minimum !== undefined && value < constraints.minimum) {
          errors.push(`${location}.${field} must be >= ${constraints.minimum}`);
        }
        if (constraints.maximum !== undefined && value > constraints.maximum) {
          errors.push(`${location}.${field} must be <= ${constraints.maximum}`);
        }
      }

      if (constraints.type === 'array' && Array.isArray(value)) {
        if (constraints.minLength && value.length < constraints.minLength) {
          errors.push(`${location}.${field} must have at least ${constraints.minLength} items`);
        }
      }
    }

    return errors;
  }

  private normalizePath(path: string): string {
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/[0-9]+\b/g, '/:id');
  }
}

// =============================================================================
// Section 5: Gateway Router
// =============================================================================

export interface RouteDefinition {
  method: string;
  path: string;
  handler: string;
  middleware: string[];
  rateLimit?: { windowMs: number; maxRequests: number };
  requiredRoles?: string[];
  description: string;
}

export const SCHOLARLY_ROUTES: RouteDefinition[] = [
  // Storybook CRUD
  { method: 'POST', path: '/stories/generate', handler: 'StorybookController.generate', middleware: ['auth', 'rateLimit', 'validate'], rateLimit: { windowMs: 60000, maxRequests: 5 }, description: 'Generate a new storybook' },
  { method: 'POST', path: '/stories/:id/illustrate', handler: 'StorybookController.illustrate', middleware: ['auth', 'rateLimit', 'validate'], rateLimit: { windowMs: 60000, maxRequests: 3 }, description: 'Generate illustrations' },
  { method: 'POST', path: '/stories/:id/narrate', handler: 'StorybookController.narrate', middleware: ['auth', 'rateLimit'], rateLimit: { windowMs: 60000, maxRequests: 5 }, description: 'Generate narration' },
  { method: 'POST', path: '/stories/:id/validate', handler: 'StorybookController.validate', middleware: ['auth', 'rateLimit'], description: 'Validate decodability' },
  { method: 'POST', path: '/stories/:id/submit', handler: 'StorybookController.submit', middleware: ['auth', 'rateLimit', 'validate'], description: 'Submit to review' },
  { method: 'GET', path: '/stories/:id/analytics', handler: 'StorybookController.analytics', middleware: ['auth'], description: 'Get reading analytics' },

  // Library
  { method: 'GET', path: '/library/search', handler: 'LibraryController.search', middleware: ['auth', 'validate'], description: 'Search library' },
  { method: 'GET', path: '/library/recommend', handler: 'LibraryController.recommend', middleware: ['auth'], description: 'Get recommendations' },

  // Characters
  { method: 'POST', path: '/characters', handler: 'CharacterController.create', middleware: ['auth', 'rateLimit', 'validate'], description: 'Create character' },
  { method: 'GET', path: '/gpcs/taught/:learnerId', handler: 'GPCController.getTaughtSet', middleware: ['auth'], description: 'Get taught GPC set' },

  // Reviews
  { method: 'POST', path: '/stories/:id/review', handler: 'ReviewController.submit', middleware: ['auth', 'rateLimit'], requiredRoles: ['educator', 'admin'], description: 'Submit review' },

  // Schema
  { method: 'GET', path: '/schemas/storybook', handler: 'SchemaController.getStorybook', middleware: [], description: 'Get storybook schema' },

  // Health & Observability (public)
  { method: 'GET', path: '/health', handler: 'HealthController.check', middleware: [], description: 'Health check' },
  { method: 'GET', path: '/metrics', handler: 'MetricsController.prometheus', middleware: [], description: 'Prometheus metrics' },
];

// =============================================================================
// Section 6: Service Interfaces
// =============================================================================

export interface RedisStore {
  incrementAndExpire(key: string, ttlMs: number): Promise<number>;
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlMs?: number): Promise<void>;
}

// Line count: ~370
