/**
 * Scholarly Unified Communications 4.0 — Configuration
 *
 * Extended from v3.3 to include Scholarly-specific integration fields.
 * The config now carries connection handles for Prisma and NATS, plus
 * authentication settings that tie UC endpoints into Scholarly's JWT
 * token infrastructure. Think of this as the wiring diagram that tells
 * the UC platform how to plug into the Scholarly power grid.
 *
 * Backward compatible: all new fields are optional. A bare
 * `new UnifiedCommsPlatform({})` still works with in-memory storage
 * and no NATS bridge — exactly as v3.3 behaved.
 */

// ─── Scholarly Auth Configuration ────────────────────────────────

export interface ScholarlyAuthConfig {
  /** JWT verification secret or public key. */
  jwtSecret: string;
  /** JWT algorithm. Default: 'HS256'. */
  jwtAlgorithm?: 'HS256' | 'RS256' | 'ES256';
  /** JWT issuer to validate. Tokens with different `iss` are rejected. */
  jwtIssuer?: string;
  /** JWT audience to validate. Tokens without this `aud` are rejected. */
  jwtAudience?: string;
  /** Paths that bypass authentication entirely (health checks, webhooks). */
  publicPaths?: string[];
}

// ─── Tenant Isolation Mode ───────────────────────────────────────

/**
 * Controls how aggressively the platform enforces tenant boundaries.
 * - 'strict': Every storage operation is scoped to tenantId. Missing tenantId = rejection.
 * - 'permissive': TenantId tracked but not enforced. For single-tenant or dev.
 * - 'none': No tenant awareness. Equivalent to v3.3 behaviour.
 */
export type TenantIsolationMode = 'strict' | 'permissive' | 'none';

// ─── NATS Bridge Configuration ───────────────────────────────────

export interface NatsBridgeConfig {
  /** NATS server URL(s). Supports comma-separated for clustering. */
  url: string;
  /** Subject prefix for UC events. Default: 'scholarly.uc'. */
  subjectPrefix?: string;
  /** Filter which event prefixes to bridge. Empty = all. */
  eventFilter?: string[];
  /** Subscribe to external NATS events and re-emit on local bus. Default: true. */
  bidirectional?: boolean;
  /** NATS credentials for authenticated connections. */
  credentials?: { user?: string; pass?: string; token?: string };
}

// ─── Platform Configuration ──────────────────────────────────────

export interface PlatformConfig {
  /** HTTP port for REST API */
  port: number;
  /** WebSocket port for signaling */
  wsPort: number;
  /** JWT secret for token verification (legacy — prefer authConfig) */
  jwtSecret: string;
  /** Node environment */
  nodeEnv: 'development' | 'production' | 'test';
  /** Logging level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** CORS allowed origins (empty = all) */
  corsOrigins: string[];
  /** Plugin-specific config overrides (keyed by plugin id) */
  plugins: Record<string, Record<string, unknown>>;

  // ─── Scholarly Integration (v4.0) ────────────────────────────

  /** Prisma Client instance. When provided, plugins persist through the database. */
  prismaClient?: unknown;
  /** NATS connection config. When provided, EventBus events mirror to NATS. */
  natsConfig?: NatsBridgeConfig;
  /** Scholarly JWT auth config. When provided, all plugin routes require valid tokens. */
  authConfig?: ScholarlyAuthConfig;
  /** Multi-tenant isolation mode. Default: 'none'. */
  tenantIsolation?: TenantIsolationMode;
}

export const DEFAULT_CONFIG: PlatformConfig = {
  port: parseInt(process.env.PORT || '3100', 10),
  wsPort: parseInt(process.env.WS_PORT || '3101', 10),
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  nodeEnv: (process.env.NODE_ENV as PlatformConfig['nodeEnv']) || 'development',
  logLevel: (process.env.LOG_LEVEL as PlatformConfig['logLevel']) || 'info',
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : [],
  plugins: {},
  tenantIsolation: 'none',
};

export function mergeConfig(overrides: Partial<PlatformConfig>): PlatformConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    plugins: { ...DEFAULT_CONFIG.plugins, ...overrides.plugins },
  };
}
