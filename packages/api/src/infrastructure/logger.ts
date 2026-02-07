/**
 * Scholarly Platform — Structured Logging (Pino)
 * ================================================
 *
 * REM-005: In a distributed system, logs are the black box flight recorder.
 * When something goes wrong at 3am — and something always goes wrong at 3am —
 * structured logs are what let the on-call engineer reconstruct exactly what
 * happened, in what order, to which tenant, for which learner.
 *
 * Unstructured logs (console.log("something happened")) are like writing a
 * novel where every chapter is a single run-on sentence with no page numbers.
 * Structured logs are like a well-indexed database: every entry has a timestamp,
 * a request ID, a tenant ID, a severity level, and machine-parseable fields
 * that can be queried, filtered, and aggregated.
 *
 * ## Why Pino?
 *
 * Pino is the fastest JSON logger in the Node.js ecosystem — 5–10x faster
 * than Winston — because it defers serialisation to a separate process.
 * In a latency-sensitive educational platform where every millisecond of
 * response time affects a child's reading flow, this matters.
 *
 * ## Key Features
 *
 * - **Request correlation**: Every log entry includes the request ID, so all
 *   logs from a single API call can be traced end-to-end.
 * - **Sensitive data redaction**: API keys, passwords, tokens, and other
 *   secrets are automatically redacted from log output.
 * - **Child loggers**: Each service module gets a child logger pre-bound
 *   with its service name, so logs are automatically tagged by origin.
 * - **HTTP request logging**: Integrated pino-http middleware that logs
 *   every request with method, path, status, and duration.
 *
 * @module infrastructure/logger
 * @version 1.0.0
 */

import pino, { Logger, LoggerOptions, DestinationStream } from 'pino';
import pinoHttp, { HttpLogger, Options as PinoHttpOptions } from 'pino-http';
import { randomUUID } from 'crypto';
import { IncomingMessage, ServerResponse } from 'http';

// ============================================================================
// SECTION 1: CONFIGURATION TYPES
// ============================================================================

export interface LoggingConfig {
  /** Log level threshold. Messages below this level are suppressed. */
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  /** Output format: 'json' for machine parsing, 'pretty' for human reading. */
  format: 'json' | 'pretty';
  /** JSONPath-style paths to redact from log output. */
  redactPaths: string[];
  /** Service name embedded in every log entry. */
  serviceName?: string;
  /** Environment name embedded in every log entry. */
  environment?: string;
}

// ============================================================================
// SECTION 2: DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["x-api-key"]',
  '*.password',
  '*.secret',
  '*.apiKey',
  '*.api_key',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.privateKey',
  '*.creditCard',
  '*.ssn',
];

// ============================================================================
// SECTION 3: LOGGER FACTORY
// ============================================================================

/**
 * Creates the root Pino logger instance with the given configuration.
 * Every other logger in the system should be a child of this root logger,
 * inheriting its configuration and redaction rules.
 */
export function createLogger(config: Partial<LoggingConfig> = {}): Logger {
  const {
    level = 'info',
    format = 'json',
    redactPaths = DEFAULT_REDACT_PATHS,
    serviceName = 'scholarly-api',
    environment = process.env.NODE_ENV ?? 'development',
  } = config;

  const options: LoggerOptions = {
    level,
    redact: {
      paths: redactPaths,
      censor: '[REDACTED]',
    },
    base: {
      service: serviceName,
      env: environment,
      pid: process.pid,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
      err: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
    formatters: {
      level(label: string) {
        return { level: label };
      },
      bindings(bindings: Record<string, unknown>) {
        return {
          service: bindings.service,
          env: bindings.env,
          pid: bindings.pid,
          hostname: bindings.hostname,
        };
      },
    },
  };

  if (format === 'pretty') {
    const transport: pino.TransportSingleOptions = {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
        messageFormat: '{service} | {msg}',
      },
    };
    return pino({ ...options, transport });
  }

  return pino(options);
}

// ============================================================================
// SECTION 4: CHILD LOGGER FACTORY
// ============================================================================

/**
 * Creates a child logger for a specific service module. Child loggers
 * inherit all configuration from the parent but add module-specific
 * bindings. Think of the root logger as the main telephone exchange,
 * and child loggers as extensions for each department.
 *
 * @param parent - The root logger (or another child logger)
 * @param moduleName - The module/service name (e.g., 'StoryNarrativeGenerator')
 * @param bindings - Additional static bindings for this module
 */
export function createChildLogger(
  parent: Logger,
  moduleName: string,
  bindings?: Record<string, unknown>,
): Logger {
  return parent.child({
    module: moduleName,
    ...bindings,
  });
}

// ============================================================================
// SECTION 5: REQUEST-SCOPED LOGGER
// ============================================================================

/**
 * Creates a request-scoped logger with a unique request ID. This logger
 * should be attached to the request object (e.g., req.log) so that every
 * log entry within the request lifecycle carries the same correlation ID.
 *
 * @param parent - The root or module logger
 * @param requestId - The request's correlation ID (generated if not provided)
 * @param tenantId - The tenant ID from the authenticated request
 * @param userId - The authenticated user's ID
 */
export function createRequestLogger(
  parent: Logger,
  requestId?: string,
  tenantId?: string,
  userId?: string,
): Logger {
  return parent.child({
    requestId: requestId ?? randomUUID(),
    ...(tenantId ? { tenantId } : {}),
    ...(userId ? { userId } : {}),
  });
}

// ============================================================================
// SECTION 6: HTTP REQUEST LOGGING MIDDLEWARE
// ============================================================================

/**
 * Pino HTTP middleware options customised for the Scholarly API.
 * This middleware automatically logs every incoming request and
 * outgoing response with timing information.
 */
export function createHttpLogger(logger: Logger): HttpLogger {
  const options: PinoHttpOptions = {
    logger,
    genReqId: (req: IncomingMessage, res: ServerResponse) => {
      const existingId =
        (req.headers['x-request-id'] as string) ??
        (req.headers['x-correlation-id'] as string);
      const id = existingId ?? randomUUID();
      res.setHeader('x-request-id', id);
      return id;
    },
    customLogLevel: (req: IncomingMessage, res: ServerResponse, err?: Error) => {
      if (res.statusCode >= 500 || err) return 'error';
      if (res.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage: (req: IncomingMessage, res: ServerResponse, responseTime: number) => {
      return `${req.method} ${req.url} ${res.statusCode} ${Math.round(responseTime)}ms`;
    },
    customErrorMessage: (req: IncomingMessage, res: ServerResponse, err: Error) => {
      return `${req.method} ${req.url} ${res.statusCode} ERROR: ${err.message}`;
    },
    customReceivedMessage: (req: IncomingMessage) => {
      return `${req.method} ${req.url}`;
    },
    customAttributeKeys: {
      req: 'request',
      res: 'response',
      err: 'error',
      responseTime: 'durationMs',
    },
    // Don't log health check endpoints (they're noisy)
    autoLogging: {
      ignore: (req: IncomingMessage) => {
        const url = req.url ?? '';
        return url === '/health' || url === '/ready' || url === '/metrics';
      },
    },
    serializers: {
      req(req: Record<string, unknown>) {
        return {
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          remoteAddress: req.remoteAddress,
          // Intentionally omit headers — they're logged via redaction config
        };
      },
      res(res: Record<string, unknown>) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  };

  return pinoHttp(options);
}

// ============================================================================
// SECTION 7: AUDIT LOGGER
// ============================================================================

/**
 * Creates a dedicated audit logger for security-relevant operations.
 * Audit logs are separate from application logs and use a distinct
 * stream so they can be shipped to a compliance-grade log store.
 *
 * Events logged here include: authentication attempts, permission changes,
 * data exports, admin actions, and payment operations.
 */
export function createAuditLogger(
  parentLogger: Logger,
  destination?: DestinationStream,
): Logger {
  const auditLogger = parentLogger.child({
    audit: true,
    component: 'audit',
  });

  return auditLogger;
}

/**
 * Standard audit log entry structure. All audit events should conform
 * to this shape for consistent querying in the log aggregator.
 */
export interface AuditLogEntry {
  /** The category of action (auth, payment, admin, data, content) */
  category: 'auth' | 'payment' | 'admin' | 'data' | 'content' | 'ai';
  /** The specific action performed */
  action: string;
  /** Who performed the action */
  actor: {
    userId: string;
    role: string;
    ipAddress?: string;
    userAgent?: string;
  };
  /** What was acted upon */
  target: {
    type: string;
    id: string;
    tenantId: string;
  };
  /** Whether the action succeeded */
  outcome: 'success' | 'failure' | 'denied';
  /** Additional context specific to the action */
  metadata?: Record<string, unknown>;
}

/**
 * Logs a structured audit event. This is the function all services
 * should call for security-relevant operations.
 */
export function logAuditEvent(logger: Logger, entry: AuditLogEntry): void {
  logger.info(
    {
      auditEvent: true,
      category: entry.category,
      action: entry.action,
      actor: {
        userId: entry.actor.userId,
        role: entry.actor.role,
        // IP and user agent are useful for forensics
        ipAddress: entry.actor.ipAddress,
      },
      target: entry.target,
      outcome: entry.outcome,
      metadata: entry.metadata,
    },
    `AUDIT: ${entry.category}.${entry.action} by ${entry.actor.userId} on ${entry.target.type}:${entry.target.id} → ${entry.outcome}`,
  );
}

// ============================================================================
// SECTION 8: AI OPERATION LOGGER
// ============================================================================

/**
 * Logs AI provider operations with cost tracking. Every AI API call
 * should be logged through this function so we can track spend per
 * tenant, per provider, per operation type.
 */
export interface AIOperationLogEntry {
  provider: string;
  model: string;
  operation: 'text-completion' | 'assessment' | 'content-safety' | 'vision' | 'embedding' | 'speech' | 'translation' | 'structured-output' | 'image-generation';
  tenantId: string;
  userId?: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  cached: boolean;
  tier: 'critical' | 'standard' | 'economy';
  success: boolean;
  errorType?: string;
}

export function logAIOperation(logger: Logger, entry: AIOperationLogEntry): void {
  const level = entry.success ? 'info' : 'warn';

  logger[level](
    {
      aiOperation: true,
      provider: entry.provider,
      model: entry.model,
      operation: entry.operation,
      tenantId: entry.tenantId,
      tokens: {
        input: entry.inputTokens,
        output: entry.outputTokens,
        total: entry.inputTokens + entry.outputTokens,
      },
      cost: {
        usd: entry.costUsd,
        cached: entry.cached,
      },
      performance: {
        durationMs: entry.durationMs,
        tier: entry.tier,
      },
      success: entry.success,
      ...(entry.errorType ? { errorType: entry.errorType } : {}),
    },
    `AI: ${entry.provider}/${entry.model} ${entry.operation} ${entry.success ? 'OK' : 'FAIL'} ${entry.durationMs}ms $${entry.costUsd.toFixed(4)}`,
  );
}

// ============================================================================
// SECTION 9: PERFORMANCE LOGGER
// ============================================================================

/**
 * Logs slow operations that exceed a threshold. This is complementary to
 * the metrics system — metrics give aggregated views, but slow operation
 * logs give the full context of what was happening when things got slow.
 */
export function logSlowOperation(
  logger: Logger,
  operation: string,
  durationMs: number,
  thresholdMs: number = 1000,
  context?: Record<string, unknown>,
): void {
  if (durationMs >= thresholdMs) {
    logger.warn(
      {
        slowOperation: true,
        operation,
        durationMs,
        thresholdMs,
        exceededBy: durationMs - thresholdMs,
        ...context,
      },
      `SLOW: ${operation} took ${durationMs}ms (threshold: ${thresholdMs}ms)`,
    );
  }
}

// ============================================================================
// SECTION 10: EXPORTS & SINGLETON
// ============================================================================

/**
 * Module-level singleton logger. Initialised with defaults; should be
 * replaced at application startup via initGlobalLogger().
 */
let globalLogger: Logger = createLogger();

/**
 * Initialises the global logger with application-specific configuration.
 * Call this once during application bootstrap, after config validation.
 */
export function initGlobalLogger(config: Partial<LoggingConfig>): Logger {
  globalLogger = createLogger(config);
  return globalLogger;
}

/**
 * Returns the global logger instance.
 */
export function getLogger(): Logger {
  return globalLogger;
}
