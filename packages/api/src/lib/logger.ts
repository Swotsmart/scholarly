/**
 * Structured Logging with Pino
 */

import pino from 'pino';
import { pinoHttp, Options as PinoHttpOptions } from 'pino-http';
import { Request, Response } from 'express';

// Log levels
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';

// Environment-based configuration
const isDev = process.env.NODE_ENV !== 'production';
const logLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || (isDev ? 'debug' : 'info');

// Create the base logger
export const logger = pino({
  level: logLevel,
  formatters: {
    level: (label) => ({ level: label }),
    bindings: (bindings) => ({
      pid: bindings.pid,
      host: bindings.hostname,
    }),
  },
  base: {
    service: 'scholarly-api',
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Pretty print in development
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});

// HTTP request logging middleware
const httpLoggerOptions: PinoHttpOptions = {
  logger,
  genReqId: (req) => {
    return (req.headers['x-request-id'] as string) || crypto.randomUUID();
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} ${res.statusCode}`;
  },
  customErrorMessage: (req, res, err) => {
    return `${req.method} ${req.url} ${res.statusCode} - ${err.message}`;
  },
  customProps: (req: Request) => ({
    tenantId: (req as any).tenantId,
    userId: (req as any).user?.id,
    userAgent: req.headers['user-agent'],
  }),
  // Don't log health checks in production
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  // Redact sensitive data
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'req.body.password',
      'req.body.token',
      'req.body.refreshToken',
      'res.headers["set-cookie"]',
    ],
    remove: true,
  },
};

export const requestLogger = pinoHttp(httpLoggerOptions);

// Child logger factory for services
export function createServiceLogger(serviceName: string) {
  return logger.child({ service: serviceName });
}

// Structured log helpers
export const log = {
  // General logging
  info: (message: string, data?: Record<string, unknown>) =>
    logger.info(data, message),

  warn: (message: string, data?: Record<string, unknown>) =>
    logger.warn(data, message),

  error: (message: string, error?: Error, data?: Record<string, unknown>) =>
    logger.error({ err: error, ...data }, message),

  debug: (message: string, data?: Record<string, unknown>) =>
    logger.debug(data, message),

  // Domain-specific logging
  auth: {
    loginSuccess: (userId: string, tenantId: string, ip: string) =>
      logger.info({ event: 'auth.login.success', userId, tenantId, ip }, 'User logged in'),

    loginFailed: (email: string, reason: string, ip: string) =>
      logger.warn({ event: 'auth.login.failed', email, reason, ip }, 'Login attempt failed'),

    tokenRefreshed: (userId: string) =>
      logger.info({ event: 'auth.token.refreshed', userId }, 'Token refreshed'),

    tokenRevoked: (userId: string, reason: string) =>
      logger.info({ event: 'auth.token.revoked', userId, reason }, 'Token revoked'),

    logout: (userId: string) =>
      logger.info({ event: 'auth.logout', userId }, 'User logged out'),
  },

  booking: {
    created: (bookingId: string, learnerId: string, tutorId: string) =>
      logger.info({ event: 'booking.created', bookingId, learnerId, tutorId }, 'Booking created'),

    confirmed: (bookingId: string) =>
      logger.info({ event: 'booking.confirmed', bookingId }, 'Booking confirmed'),

    cancelled: (bookingId: string, reason: string) =>
      logger.info({ event: 'booking.cancelled', bookingId, reason }, 'Booking cancelled'),

    completed: (bookingId: string, sessionId: string) =>
      logger.info({ event: 'booking.completed', bookingId, sessionId }, 'Booking completed'),
  },

  blockchain: {
    txSubmitted: (txHash: string, type: string, userId: string) =>
      logger.info({ event: 'blockchain.tx.submitted', txHash, type, userId }, 'Transaction submitted'),

    txConfirmed: (txHash: string, blockNumber: number) =>
      logger.info({ event: 'blockchain.tx.confirmed', txHash, blockNumber }, 'Transaction confirmed'),

    txFailed: (txHash: string, error: string) =>
      logger.error({ event: 'blockchain.tx.failed', txHash, error }, 'Transaction failed'),

    escrowCreated: (escrowId: string, bookingId: string, amount: string) =>
      logger.info({ event: 'blockchain.escrow.created', escrowId, bookingId, amount }, 'Escrow created'),

    escrowReleased: (escrowId: string, tutorAmount: string, feeAmount: string) =>
      logger.info({ event: 'blockchain.escrow.released', escrowId, tutorAmount, feeAmount }, 'Escrow released'),

    credentialIssued: (tokenId: string, recipient: string, type: string) =>
      logger.info({ event: 'blockchain.credential.issued', tokenId, recipient, type }, 'Credential NFT issued'),
  },

  security: {
    rateLimitExceeded: (ip: string, endpoint: string) =>
      logger.warn({ event: 'security.rateLimit.exceeded', ip, endpoint }, 'Rate limit exceeded'),

    suspiciousActivity: (userId: string, activity: string, details: Record<string, unknown>) =>
      logger.warn({ event: 'security.suspicious', userId, activity, ...details }, 'Suspicious activity detected'),

    csrfFailed: (ip: string, origin: string) =>
      logger.warn({ event: 'security.csrf.failed', ip, origin }, 'CSRF validation failed'),
  },

  performance: {
    slowQuery: (query: string, durationMs: number) =>
      logger.warn({ event: 'performance.slowQuery', query, durationMs }, 'Slow database query'),

    slowRequest: (method: string, path: string, durationMs: number) =>
      logger.warn({ event: 'performance.slowRequest', method, path, durationMs }, 'Slow request'),

    cacheHit: (key: string) =>
      logger.debug({ event: 'performance.cache.hit', key }, 'Cache hit'),

    cacheMiss: (key: string) =>
      logger.debug({ event: 'performance.cache.miss', key }, 'Cache miss'),
  },
};

export default logger;
