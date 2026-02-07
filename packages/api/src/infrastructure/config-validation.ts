/**
 * Scholarly Platform — Fail-Fast Configuration Validation
 * ========================================================
 *
 * REM-007: Every production system needs a preflight checklist. An aircraft
 * doesn't taxi to the runway with an empty fuel gauge and hope for the best;
 * it verifies every critical system before the engines spool up. This module
 * is Scholarly's preflight checklist — it validates every required configuration
 * value, every service connection string, and every API key before the
 * application starts accepting traffic.
 *
 * The key insight is that a loud, immediate crash at startup is infinitely
 * preferable to a silent, delayed failure at 3am when a learner tries to
 * read their first storybook. Fail fast, fail loud, fail before anyone
 * is watching.
 *
 * ## Design Principles
 *
 * 1. **Schema-driven**: Configuration shape is defined via Zod schemas,
 *    giving us both runtime validation and TypeScript type inference.
 *
 * 2. **Environment-aware**: Different environments (development, staging,
 *    production) have different requirements. Development can use defaults
 *    and self-signed certs; production demands real credentials.
 *
 * 3. **Descriptive errors**: When validation fails, the error message tells
 *    the operator exactly which variable is missing and what it should look
 *    like — not just "config invalid".
 *
 * 4. **Connection verification**: For critical infrastructure (database,
 *    Redis, NATS), we don't just check that the URL is syntactically valid;
 *    we actually open a connection and verify the service is reachable.
 *
 * @module infrastructure/config-validation
 * @version 1.0.0
 */

import { z } from 'zod';

// ============================================================================
// SECTION 1: ENVIRONMENT ENUM & BASE TYPES
// ============================================================================

export const Environment = z.enum(['development', 'staging', 'production']);
export type Environment = z.infer<typeof Environment>;

/**
 * Validation result for a single configuration check.
 * We use a discriminated union rather than exceptions so that we can
 * accumulate all failures before reporting — showing the operator every
 * problem at once rather than making them fix-and-restart in a loop.
 */
export type ConfigCheckResult =
  | { ok: true; name: string }
  | { ok: false; name: string; error: string; hint?: string };

// ============================================================================
// SECTION 2: CONFIGURATION SCHEMAS
// ============================================================================

/**
 * Database configuration. PostgreSQL is the only supported database.
 * The connection string must be a valid postgresql:// URL.
 */
const DatabaseConfigSchema = z.object({
  url: z
    .string()
    .url('DATABASE_URL must be a valid URL')
    .refine(
      (url) => url.startsWith('postgresql://') || url.startsWith('postgres://'),
      'DATABASE_URL must use postgresql:// or postgres:// protocol',
    ),
  maxConnections: z.coerce.number().int().min(1).max(100).default(20),
  connectionTimeoutMs: z.coerce.number().int().min(1000).max(30000).default(5000),
  idleTimeoutMs: z.coerce.number().int().min(1000).max(60000).default(10000),
  statementTimeoutMs: z.coerce.number().int().min(1000).max(120000).default(30000),
});

/**
 * Redis configuration. Supports both single-node and cluster modes.
 */
const RedisConfigSchema = z.object({
  url: z
    .string()
    .url('REDIS_URL must be a valid URL')
    .refine(
      (url) => url.startsWith('redis://') || url.startsWith('rediss://'),
      'REDIS_URL must use redis:// or rediss:// protocol',
    ),
  clusterMode: z.coerce.boolean().default(false),
  maxRetries: z.coerce.number().int().min(0).max(10).default(3),
  retryDelayMs: z.coerce.number().int().min(100).max(5000).default(500),
  keyPrefix: z.string().default('scholarly:'),
  defaultTtlSeconds: z.coerce.number().int().min(60).max(86400).default(3600),
});

/**
 * NATS configuration. JetStream is required for durable event delivery.
 */
const NatsConfigSchema = z.object({
  url: z
    .string()
    .refine(
      (url) => url.startsWith('nats://') || url.startsWith('tls://'),
      'NATS_URL must use nats:// or tls:// protocol',
    ),
  clusterName: z.string().default('scholarly-cluster'),
  maxReconnectAttempts: z.coerce.number().int().min(-1).max(100).default(10),
  reconnectTimeWaitMs: z.coerce.number().int().min(100).max(10000).default(2000),
  jetStreamEnabled: z.coerce.boolean().default(true),
  jetStreamDomain: z.string().optional(),
});

/**
 * JWT authentication configuration. RS256 is mandatory in production;
 * HS256 is permitted in development for convenience.
 */
const AuthConfigSchema = z.object({
  algorithm: z.enum(['RS256', 'HS256']).default('RS256'),
  publicKey: z.string().min(1, 'JWT_PUBLIC_KEY is required'),
  privateKey: z.string().min(1, 'JWT_PRIVATE_KEY is required'),
  issuer: z.string().default('scholarly-platform'),
  audience: z.string().default('scholarly-api'),
  accessTokenExpirySeconds: z.coerce.number().int().min(60).max(86400).default(3600),
  refreshTokenExpirySeconds: z.coerce.number().int().min(3600).max(2592000).default(604800),
});

/**
 * Stripe payment configuration. Both the secret key and webhook secret
 * are required for the payment pipeline to function.
 */
const StripeConfigSchema = z.object({
  secretKey: z
    .string()
    .refine(
      (key) => key.startsWith('sk_test_') || key.startsWith('sk_live_'),
      'STRIPE_SECRET_KEY must start with sk_test_ or sk_live_',
    ),
  webhookSecret: z
    .string()
    .refine(
      (secret) => secret.startsWith('whsec_'),
      'STRIPE_WEBHOOK_SECRET must start with whsec_',
    ),
  connectEnabled: z.coerce.boolean().default(true),
  currency: z.string().length(3).default('aud'),
  taxBehavior: z.enum(['exclusive', 'inclusive', 'unspecified']).default('inclusive'),
});

/**
 * Xero accounting configuration.
 */
const XeroConfigSchema = z.object({
  clientId: z.string().min(1, 'XERO_CLIENT_ID is required'),
  clientSecret: z.string().min(1, 'XERO_CLIENT_SECRET is required'),
  redirectUri: z.string().url('XERO_REDIRECT_URI must be a valid URL'),
  scopes: z.string().default('openid profile email accounting.transactions accounting.contacts'),
  tenantId: z.string().optional(),
});

/**
 * AI provider configuration. Each provider is optional — the routing
 * engine will only attempt to use providers that have valid credentials.
 */
const AIProvidersConfigSchema = z.object({
  anthropic: z.object({
    apiKey: z.string().min(1, 'ANTHROPIC_API_KEY is required for Claude provider'),
    defaultModel: z.string().default('claude-sonnet-4-5-20250514'),
    maxRetries: z.coerce.number().int().min(0).max(5).default(3),
    timeoutMs: z.coerce.number().int().min(5000).max(120000).default(60000),
  }).optional(),
  openai: z.object({
    apiKey: z.string().min(1, 'OPENAI_API_KEY is required for OpenAI provider'),
    defaultModel: z.string().default('gpt-4o'),
    organizationId: z.string().optional(),
    maxRetries: z.coerce.number().int().min(0).max(5).default(3),
    timeoutMs: z.coerce.number().int().min(5000).max(120000).default(60000),
  }).optional(),
  google: z.object({
    apiKey: z.string().min(1, 'GOOGLE_AI_API_KEY is required for Gemini provider'),
    defaultModel: z.string().default('gemini-2.0-flash'),
    maxRetries: z.coerce.number().int().min(0).max(5).default(3),
  }).optional(),
  azure: z.object({
    endpoint: z.string().url('AZURE_OPENAI_ENDPOINT must be a valid URL'),
    apiKey: z.string().min(1, 'AZURE_OPENAI_API_KEY is required'),
    apiVersion: z.string().default('2024-12-01-preview'),
    deploymentName: z.string().min(1),
  }).optional(),
  mistral: z.object({
    apiKey: z.string().min(1, 'MISTRAL_API_KEY is required for Mistral provider'),
    defaultModel: z.string().default('mistral-large-latest'),
  }).optional(),
  elevenlabs: z.object({
    apiKey: z.string().min(1, 'ELEVENLABS_API_KEY is required for speech services'),
    defaultVoiceId: z.string().optional(),
    maxConcurrentRequests: z.coerce.number().int().min(1).max(20).default(5),
  }).optional(),
  selfHosted: z.object({
    llamaEndpoint: z.string().url().optional(),
    whisperEndpoint: z.string().url().optional(),
    embeddingEndpoint: z.string().url().optional(),
  }).optional(),
});

/**
 * ElevenLabs voice intelligence configuration (separate from AI providers
 * because this covers the real-time WebSocket voice pipeline).
 */
const VoiceIntelligenceConfigSchema = z.object({
  enabled: z.coerce.boolean().default(true),
  apiKey: z.string().min(1).optional(),
  agentId: z.string().optional(),
  maxConcurrentSessions: z.coerce.number().int().min(1).max(100).default(20),
  sessionTimeoutMs: z.coerce.number().int().min(30000).max(600000).default(300000),
});

/**
 * Logging configuration.
 */
const LoggingConfigSchema = z.object({
  level: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  format: z.enum(['json', 'pretty']).default('json'),
  redactPaths: z.array(z.string()).default([
    'req.headers.authorization',
    'req.headers.cookie',
    '*.password',
    '*.secret',
    '*.apiKey',
    '*.token',
  ]),
});

/**
 * Observability configuration.
 */
const ObservabilityConfigSchema = z.object({
  metrics: z.object({
    enabled: z.coerce.boolean().default(true),
    port: z.coerce.number().int().min(1024).max(65535).default(9090),
    path: z.string().default('/metrics'),
  }),
  tracing: z.object({
    enabled: z.coerce.boolean().default(false),
    endpoint: z.string().url().optional(),
    serviceName: z.string().default('scholarly-api'),
    sampleRate: z.coerce.number().min(0).max(1).default(0.1),
  }),
  sentry: z.object({
    enabled: z.coerce.boolean().default(false),
    dsn: z.string().url().optional(),
    environment: z.string().optional(),
    sampleRate: z.coerce.number().min(0).max(1).default(1.0),
    tracesSampleRate: z.coerce.number().min(0).max(1).default(0.1),
  }),
});

/**
 * Server configuration.
 */
const ServerConfigSchema = z.object({
  port: z.coerce.number().int().min(1024).max(65535).default(3000),
  host: z.string().default('0.0.0.0'),
  corsOrigins: z.array(z.string()).default(['http://localhost:3001']),
  trustProxy: z.coerce.boolean().default(false),
  bodyLimitBytes: z.coerce.number().int().default(10 * 1024 * 1024),
  rateLimitWindowMs: z.coerce.number().int().default(60000),
  rateLimitMaxRequests: z.coerce.number().int().default(100),
  gracefulShutdownTimeoutMs: z.coerce.number().int().default(30000),
});

/**
 * The complete platform configuration schema — the union of all subsystems.
 */
export const PlatformConfigSchema = z.object({
  environment: Environment,
  server: ServerConfigSchema,
  database: DatabaseConfigSchema,
  redis: RedisConfigSchema,
  nats: NatsConfigSchema,
  auth: AuthConfigSchema,
  stripe: StripeConfigSchema,
  xero: XeroConfigSchema.optional(),
  aiProviders: AIProvidersConfigSchema,
  voiceIntelligence: VoiceIntelligenceConfigSchema,
  logging: LoggingConfigSchema,
  observability: ObservabilityConfigSchema,
});

export type PlatformConfig = z.infer<typeof PlatformConfigSchema>;

// ============================================================================
// SECTION 3: ENVIRONMENT VARIABLE MAPPING
// ============================================================================

/**
 * Maps environment variables to the configuration schema. This is the single
 * source of truth for which env vars drive which config values. The mapping
 * uses a flat env var namespace (conventional for Docker/K8s) and nests
 * them into the structured config object.
 */
export function loadConfigFromEnvironment(env: Record<string, string | undefined> = process.env): Record<string, unknown> {
  return {
    environment: env.NODE_ENV ?? 'development',
    server: {
      port: env.PORT ?? env.SERVER_PORT,
      host: env.HOST ?? env.SERVER_HOST,
      corsOrigins: env.CORS_ORIGINS?.split(',').map((s) => s.trim()),
      trustProxy: env.TRUST_PROXY,
      bodyLimitBytes: env.BODY_LIMIT_BYTES,
      rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
      rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
      gracefulShutdownTimeoutMs: env.GRACEFUL_SHUTDOWN_TIMEOUT_MS,
    },
    database: {
      url: env.DATABASE_URL,
      maxConnections: env.DB_MAX_CONNECTIONS,
      connectionTimeoutMs: env.DB_CONNECTION_TIMEOUT_MS,
      idleTimeoutMs: env.DB_IDLE_TIMEOUT_MS,
      statementTimeoutMs: env.DB_STATEMENT_TIMEOUT_MS,
    },
    redis: {
      url: env.REDIS_URL,
      clusterMode: env.REDIS_CLUSTER_MODE,
      maxRetries: env.REDIS_MAX_RETRIES,
      retryDelayMs: env.REDIS_RETRY_DELAY_MS,
      keyPrefix: env.REDIS_KEY_PREFIX,
      defaultTtlSeconds: env.REDIS_DEFAULT_TTL_SECONDS,
    },
    nats: {
      url: env.NATS_URL,
      clusterName: env.NATS_CLUSTER_NAME,
      maxReconnectAttempts: env.NATS_MAX_RECONNECT_ATTEMPTS,
      reconnectTimeWaitMs: env.NATS_RECONNECT_TIME_WAIT_MS,
      jetStreamEnabled: env.NATS_JETSTREAM_ENABLED,
      jetStreamDomain: env.NATS_JETSTREAM_DOMAIN,
    },
    auth: {
      algorithm: env.JWT_ALGORITHM,
      publicKey: env.JWT_PUBLIC_KEY,
      privateKey: env.JWT_PRIVATE_KEY,
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      accessTokenExpirySeconds: env.JWT_ACCESS_TOKEN_EXPIRY_SECONDS,
      refreshTokenExpirySeconds: env.JWT_REFRESH_TOKEN_EXPIRY_SECONDS,
    },
    stripe: {
      secretKey: env.STRIPE_SECRET_KEY,
      webhookSecret: env.STRIPE_WEBHOOK_SECRET,
      connectEnabled: env.STRIPE_CONNECT_ENABLED,
      currency: env.STRIPE_CURRENCY,
      taxBehavior: env.STRIPE_TAX_BEHAVIOR,
    },
    xero: env.XERO_CLIENT_ID
      ? {
          clientId: env.XERO_CLIENT_ID,
          clientSecret: env.XERO_CLIENT_SECRET,
          redirectUri: env.XERO_REDIRECT_URI,
          scopes: env.XERO_SCOPES,
          tenantId: env.XERO_TENANT_ID,
        }
      : undefined,
    aiProviders: {
      anthropic: env.ANTHROPIC_API_KEY
        ? {
            apiKey: env.ANTHROPIC_API_KEY,
            defaultModel: env.ANTHROPIC_DEFAULT_MODEL,
            maxRetries: env.ANTHROPIC_MAX_RETRIES,
            timeoutMs: env.ANTHROPIC_TIMEOUT_MS,
          }
        : undefined,
      openai: env.OPENAI_API_KEY
        ? {
            apiKey: env.OPENAI_API_KEY,
            defaultModel: env.OPENAI_DEFAULT_MODEL,
            organizationId: env.OPENAI_ORGANIZATION_ID,
            maxRetries: env.OPENAI_MAX_RETRIES,
            timeoutMs: env.OPENAI_TIMEOUT_MS,
          }
        : undefined,
      google: env.GOOGLE_AI_API_KEY
        ? {
            apiKey: env.GOOGLE_AI_API_KEY,
            defaultModel: env.GOOGLE_AI_DEFAULT_MODEL,
            maxRetries: env.GOOGLE_AI_MAX_RETRIES,
          }
        : undefined,
      azure: env.AZURE_OPENAI_ENDPOINT
        ? {
            endpoint: env.AZURE_OPENAI_ENDPOINT,
            apiKey: env.AZURE_OPENAI_API_KEY ?? '',
            apiVersion: env.AZURE_OPENAI_API_VERSION,
            deploymentName: env.AZURE_OPENAI_DEPLOYMENT_NAME ?? '',
          }
        : undefined,
      mistral: env.MISTRAL_API_KEY
        ? {
            apiKey: env.MISTRAL_API_KEY,
            defaultModel: env.MISTRAL_DEFAULT_MODEL,
          }
        : undefined,
      elevenlabs: env.ELEVENLABS_API_KEY
        ? {
            apiKey: env.ELEVENLABS_API_KEY,
            defaultVoiceId: env.ELEVENLABS_DEFAULT_VOICE_ID,
            maxConcurrentRequests: env.ELEVENLABS_MAX_CONCURRENT_REQUESTS,
          }
        : undefined,
      selfHosted: {
        llamaEndpoint: env.LLAMA_ENDPOINT,
        whisperEndpoint: env.WHISPER_ENDPOINT,
        embeddingEndpoint: env.EMBEDDING_ENDPOINT,
      },
    },
    voiceIntelligence: {
      enabled: env.VOICE_INTELLIGENCE_ENABLED,
      apiKey: env.ELEVENLABS_API_KEY,
      agentId: env.VOICE_INTELLIGENCE_AGENT_ID,
      maxConcurrentSessions: env.VOICE_INTELLIGENCE_MAX_SESSIONS,
      sessionTimeoutMs: env.VOICE_INTELLIGENCE_SESSION_TIMEOUT_MS,
    },
    logging: {
      level: env.LOG_LEVEL,
      format: env.LOG_FORMAT,
      redactPaths: env.LOG_REDACT_PATHS?.split(',').map((s) => s.trim()),
    },
    observability: {
      metrics: {
        enabled: env.METRICS_ENABLED,
        port: env.METRICS_PORT,
        path: env.METRICS_PATH,
      },
      tracing: {
        enabled: env.TRACING_ENABLED,
        endpoint: env.TRACING_ENDPOINT,
        serviceName: env.TRACING_SERVICE_NAME,
        sampleRate: env.TRACING_SAMPLE_RATE,
      },
      sentry: {
        enabled: env.SENTRY_ENABLED,
        dsn: env.SENTRY_DSN,
        environment: env.SENTRY_ENVIRONMENT,
        sampleRate: env.SENTRY_SAMPLE_RATE,
        tracesSampleRate: env.SENTRY_TRACES_SAMPLE_RATE,
      },
    },
  };
}

// ============================================================================
// SECTION 4: DEEP CLEAN — REMOVE UNDEFINED VALUES
// ============================================================================

/**
 * Recursively removes undefined values from a configuration object.
 * Zod's default values only apply when a key is missing entirely, not
 * when it's present but undefined. This function ensures that env vars
 * that aren't set don't override Zod defaults with undefined.
 */
function deepClean(obj: Record<string, unknown>): Record<string, unknown> {
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      const sub = deepClean(value as Record<string, unknown>);
      if (Object.keys(sub).length > 0) {
        cleaned[key] = sub;
      }
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ============================================================================
// SECTION 5: CONNECTION VERIFICATION
// ============================================================================

/**
 * Verifies that a TCP connection can be established to the given host:port.
 * Uses a raw socket with a timeout — we don't need to speak the protocol,
 * just confirm the port is open and accepting connections.
 */
async function verifyTcpConnection(
  name: string,
  url: string,
  timeoutMs: number = 5000,
): Promise<ConfigCheckResult> {
  const net = await import('net');
  const parsedUrl = new URL(url);
  const host = parsedUrl.hostname;
  const port = parseInt(parsedUrl.port, 10);

  if (!host || isNaN(port)) {
    return { ok: false, name, error: `Cannot parse host:port from ${url}` };
  }

  return new Promise<ConfigCheckResult>((resolve) => {
    const socket = new net.Socket();
    const timer = setTimeout(() => {
      socket.destroy();
      resolve({
        ok: false,
        name,
        error: `Connection to ${host}:${port} timed out after ${timeoutMs}ms`,
        hint: `Ensure ${name} is running and accessible at ${host}:${port}`,
      });
    }, timeoutMs);

    socket.connect(port, host, () => {
      clearTimeout(timer);
      socket.destroy();
      resolve({ ok: true, name });
    });

    socket.on('error', (err: Error) => {
      clearTimeout(timer);
      socket.destroy();
      resolve({
        ok: false,
        name,
        error: `Connection to ${host}:${port} failed: ${err.message}`,
        hint: `Ensure ${name} is running and accessible at ${host}:${port}`,
      });
    });
  });
}

// ============================================================================
// SECTION 6: ENVIRONMENT-SPECIFIC RULES
// ============================================================================

/**
 * Production has stricter requirements than development. This function
 * applies environment-specific validation rules that go beyond what the
 * Zod schema can express.
 */
function validateEnvironmentRules(config: PlatformConfig): ConfigCheckResult[] {
  const results: ConfigCheckResult[] = [];

  if (config.environment === 'production') {
    // RS256 is mandatory in production
    if (config.auth.algorithm !== 'RS256') {
      results.push({
        ok: false,
        name: 'auth.algorithm',
        error: 'Production requires RS256 algorithm for JWT signing',
        hint: 'Generate an RSA key pair and set JWT_ALGORITHM=RS256',
      });
    }

    // At least one AI provider must be configured
    const hasAnyProvider =
      config.aiProviders.anthropic ||
      config.aiProviders.openai ||
      config.aiProviders.google ||
      config.aiProviders.azure ||
      config.aiProviders.mistral;
    if (!hasAnyProvider) {
      results.push({
        ok: false,
        name: 'aiProviders',
        error: 'Production requires at least one AI provider to be configured',
        hint: 'Set ANTHROPIC_API_KEY or OPENAI_API_KEY',
      });
    }

    // Sentry should be enabled in production
    if (!config.observability.sentry.enabled) {
      results.push({
        ok: false,
        name: 'observability.sentry',
        error: 'Production requires Sentry for error tracking',
        hint: 'Set SENTRY_ENABLED=true and SENTRY_DSN=<your DSN>',
      });
    }

    // Trust proxy should be enabled behind a load balancer
    if (!config.server.trustProxy) {
      results.push({
        ok: false,
        name: 'server.trustProxy',
        error: 'Production should enable trust proxy when behind a load balancer',
        hint: 'Set TRUST_PROXY=true',
      });
    }
  }

  if (config.environment === 'staging' || config.environment === 'production') {
    // Stripe must have real keys
    if (config.stripe.secretKey.startsWith('sk_test_') && config.environment === 'production') {
      results.push({
        ok: false,
        name: 'stripe.secretKey',
        error: 'Production must not use Stripe test keys',
        hint: 'Set STRIPE_SECRET_KEY to a live key (sk_live_...)',
      });
    }
  }

  return results;
}

// ============================================================================
// SECTION 7: MAIN VALIDATION FUNCTION
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  config: PlatformConfig | null;
  errors: ConfigCheckResult[];
  warnings: ConfigCheckResult[];
  connectionChecks: ConfigCheckResult[];
}

/**
 * The main entry point: validates all configuration, checks connections,
 * applies environment-specific rules, and returns a comprehensive result.
 *
 * @param options.skipConnectionChecks - Skip TCP connection verification
 *        (useful in unit tests or CI where services aren't running)
 * @param options.env - Override environment variables (useful for testing)
 */
export async function validatePlatformConfig(options: {
  skipConnectionChecks?: boolean;
  env?: Record<string, string | undefined>;
} = {}): Promise<ValidationResult> {
  const { skipConnectionChecks = false, env } = options;

  // Phase 1: Load and clean environment variables
  const rawConfig = loadConfigFromEnvironment(env);
  const cleanedConfig = deepClean(rawConfig);

  // Phase 2: Schema validation with Zod
  const parseResult = PlatformConfigSchema.safeParse(cleanedConfig);

  if (!parseResult.success) {
    const errors: ConfigCheckResult[] = parseResult.error.issues.map((issue) => ({
      ok: false as const,
      name: issue.path.join('.'),
      error: issue.message,
      hint: `Check the environment variable mapping for ${issue.path.join('.')}`,
    }));

    return {
      valid: false,
      config: null,
      errors,
      warnings: [],
      connectionChecks: [],
    };
  }

  const config = parseResult.data;

  // Phase 3: Environment-specific rules
  const ruleResults = validateEnvironmentRules(config);
  const ruleErrors = ruleResults.filter((r) => !r.ok);

  // Phase 4: Connection verification (unless skipped)
  const connectionChecks: ConfigCheckResult[] = [];

  if (!skipConnectionChecks) {
    // Database
    connectionChecks.push(
      await verifyTcpConnection('PostgreSQL', config.database.url),
    );

    // Redis
    connectionChecks.push(
      await verifyTcpConnection('Redis', config.redis.url),
    );

    // NATS
    connectionChecks.push(
      await verifyTcpConnection('NATS', config.nats.url),
    );
  }

  const connectionErrors = connectionChecks.filter((r) => !r.ok);

  // Phase 5: Warnings (non-fatal but worth logging)
  const warnings: ConfigCheckResult[] = [];

  if (!config.aiProviders.anthropic && !config.aiProviders.openai) {
    warnings.push({
      ok: false,
      name: 'aiProviders',
      error: 'No premium AI provider configured (Anthropic or OpenAI)',
      hint: 'AI features will be limited without a premium provider',
    });
  }

  if (!config.xero) {
    warnings.push({
      ok: false,
      name: 'xero',
      error: 'Xero accounting integration is not configured',
      hint: 'Invoice synchronisation will be unavailable',
    });
  }

  if (!config.aiProviders.elevenlabs) {
    warnings.push({
      ok: false,
      name: 'aiProviders.elevenlabs',
      error: 'ElevenLabs is not configured',
      hint: 'Voice narration and pronunciation assessment will be unavailable',
    });
  }

  // Combine all errors
  const allErrors = [...ruleErrors, ...connectionErrors];

  return {
    valid: allErrors.length === 0,
    config: allErrors.length === 0 ? config : null,
    errors: allErrors,
    warnings,
    connectionChecks,
  };
}

// ============================================================================
// SECTION 8: STARTUP INTEGRATION
// ============================================================================

/**
 * The fail-fast startup guard. Call this as the very first thing in
 * the application bootstrap. If validation fails, it logs every error
 * with clear formatting and exits with code 1.
 *
 * Usage:
 *   const config = await bootstrapConfig();
 *   // Only reached if ALL checks pass
 *   const app = createApp(config);
 *
 * Think of this as the moment the pilot reviews the preflight checklist
 * before starting the engines. If any item is red, the flight doesn't depart.
 */
export async function bootstrapConfig(options?: {
  skipConnectionChecks?: boolean;
  env?: Record<string, string | undefined>;
  logger?: { error: (msg: string) => void; warn: (msg: string) => void; info: (msg: string) => void };
}): Promise<PlatformConfig> {
  const logger = options?.logger ?? {
    error: (msg: string) => console.error(msg),
    warn: (msg: string) => console.warn(msg),
    info: (msg: string) => console.log(msg),
  };

  logger.info('╔════════════════════════════════════════════════════════════╗');
  logger.info('║         SCHOLARLY PLATFORM — PREFLIGHT CHECK              ║');
  logger.info('╚════════════════════════════════════════════════════════════╝');

  const result = await validatePlatformConfig({
    skipConnectionChecks: options?.skipConnectionChecks,
    env: options?.env,
  });

  // Report connection checks
  for (const check of result.connectionChecks) {
    if (check.ok) {
      logger.info(`  ✓ ${check.name} — connected`);
    } else {
      logger.error(`  ✗ ${check.name} — ${check.error}`);
      if ('hint' in check && check.hint) {
        logger.error(`    → ${check.hint}`);
      }
    }
  }

  // Report warnings
  for (const warning of result.warnings) {
    if (!warning.ok) {
      logger.warn(`  ⚠ ${warning.name}: ${warning.error}`);
      if (warning.hint) {
        logger.warn(`    → ${warning.hint}`);
      }
    }
  }

  // Report errors
  if (result.errors.length > 0) {
    logger.error('');
    logger.error('╔════════════════════════════════════════════════════════════╗');
    logger.error('║  PREFLIGHT FAILED — The following issues must be resolved ║');
    logger.error('╚════════════════════════════════════════════════════════════╝');
    logger.error('');

    for (const error of result.errors) {
      logger.error(`  ✗ ${error.name}: ${error.error}`);
      if ('hint' in error && error.hint) {
        logger.error(`    → ${error.hint}`);
      }
    }

    logger.error('');
    logger.error(`  ${result.errors.length} error(s) found. Application cannot start.`);
    logger.error('');

    process.exit(1);
  }

  if (!result.config) {
    logger.error('  Configuration parsed but result is null — this should not happen.');
    process.exit(1);
  }

  const providerCount = [
    result.config.aiProviders.anthropic,
    result.config.aiProviders.openai,
    result.config.aiProviders.google,
    result.config.aiProviders.azure,
    result.config.aiProviders.mistral,
  ].filter(Boolean).length;

  logger.info('');
  logger.info(`  ✓ Configuration valid (${result.config.environment} mode)`);
  logger.info(`  ✓ ${providerCount} AI provider(s) configured`);
  logger.info(`  ✓ Preflight complete — all systems go`);
  logger.info('');

  return result.config;
}
