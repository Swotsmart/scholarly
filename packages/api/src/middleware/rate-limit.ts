/**
 * Rate Limiting Middleware
 *
 * Tiered rate limits:
 * - Auth endpoints: 5 req/min (prevent brute force)
 * - API general: 100 req/min
 * - Search: 30 req/min
 * - Webhooks: 1000 req/min
 */

import rateLimit, { RateLimitRequestHandler } from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient, RedisClientType } from 'redis';
import { Request, Response } from 'express';
import { log } from '../lib/logger';
import { ScholarlyApiError } from '../errors/scholarly-error';

// Redis client for distributed rate limiting
let redisClient: RedisClientType | null = null;

async function getRedisClient(): Promise<RedisClientType | null> {
  if (!process.env.RATE_LIMIT_REDIS_URL) {
    return null;
  }

  if (!redisClient) {
    redisClient = createClient({
      url: process.env.RATE_LIMIT_REDIS_URL,
    });

    redisClient.on('error', (err) => {
      log.error('Redis rate limit client error', err);
    });

    await redisClient.connect();
  }

  return redisClient;
}

// Get store (Redis or memory-based)
async function getStore(prefix: string) {
  const client = await getRedisClient();

  if (client) {
    return new RedisStore({
      sendCommand: (...args: string[]) => client.sendCommand(args) as any,
      prefix: `scholarly:ratelimit:${prefix}:`,
    });
  }

  return undefined; // Use default memory store
}

// Key generator - uses user ID if authenticated, IP otherwise
function keyGenerator(req: Request): string {
  const user = (req as any).user;
  if (user?.id) {
    return `user:${user.id}`;
  }
  // Use forwarded IP or direct IP
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
             req.socket.remoteAddress ||
             'unknown';
  return `ip:${ip}`;
}

// Skip rate limiting for internal/trusted requests
function skip(req: Request): boolean {
  // Skip for health checks
  if (req.path === '/health') return true;

  // Skip for internal requests (if you have internal API keys)
  const internalKey = req.headers['x-internal-api-key'];
  if (internalKey === process.env.INTERNAL_API_KEY) return true;

  return false;
}

// Handler when rate limit is exceeded
function handler(req: Request, res: Response): void {
  const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] ||
             req.socket.remoteAddress || 'unknown';

  log.security.rateLimitExceeded(ip, req.path);

  const error = ScholarlyApiError.rateLimitExceeded({
    retryAfter: res.getHeader('Retry-After'),
    limit: res.getHeader('X-RateLimit-Limit'),
  });

  res.status(error.statusCode).json(
    error.toResponse((req as any).id || 'unknown')
  );
}

// ============ Rate Limiters ============

/**
 * Strict rate limit for auth endpoints
 * 5 requests per minute per IP
 */
export async function createAuthRateLimiter(): Promise<RateLimitRequestHandler> {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
    handler,
    store: await getStore('auth'),
    message: 'Too many authentication attempts, please try again later',
  });
}

/**
 * General API rate limit
 * 100 requests per minute per user/IP
 */
export async function createApiRateLimiter(): Promise<RateLimitRequestHandler> {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
    handler,
    store: await getStore('api'),
    message: 'Too many requests, please slow down',
  });
}

/**
 * Search endpoint rate limit
 * 30 requests per minute (prevents expensive queries)
 */
export async function createSearchRateLimiter(): Promise<RateLimitRequestHandler> {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 30,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
    handler,
    store: await getStore('search'),
    message: 'Too many search requests, please try again later',
  });
}

/**
 * Webhook endpoint rate limit
 * 1000 requests per minute (for high-throughput webhooks)
 */
export async function createWebhookRateLimiter(): Promise<RateLimitRequestHandler> {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      // Use webhook source identifier
      return req.headers['x-webhook-source']?.toString() || keyGenerator(req);
    },
    skip,
    handler,
    store: await getStore('webhook'),
    message: 'Webhook rate limit exceeded',
  });
}

/**
 * Blockchain transaction rate limit
 * 10 requests per minute (prevent transaction spam)
 */
export async function createBlockchainRateLimiter(): Promise<RateLimitRequestHandler> {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator,
    skip,
    handler,
    store: await getStore('blockchain'),
    message: 'Too many blockchain transactions, please wait',
  });
}

// ============ Default Export ============

// Create all rate limiters (call during app initialization)
export async function initializeRateLimiters() {
  return {
    auth: await createAuthRateLimiter(),
    api: await createApiRateLimiter(),
    search: await createSearchRateLimiter(),
    webhook: await createWebhookRateLimiter(),
    blockchain: await createBlockchainRateLimiter(),
  };
}

// Cleanup function for graceful shutdown
export async function closeRateLimitRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
  }
}
