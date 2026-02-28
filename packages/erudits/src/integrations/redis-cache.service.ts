/**
 * ============================================================================
 * Redis Cache — Production Integration
 * ============================================================================
 *
 * Implements the Cache interface using Redis (via ioredis). This is the
 * platform's short-term memory: recently fetched resources, computed
 * recommendations, session data, and rate-limiting counters all live here.
 *
 * The key namespace strategy uses colons for hierarchy:
 *   erudits:resource:{id}          — Cached resource entity
 *   erudits:search:{hash}          — Cached search results
 *   erudits:session:{sessionId}    — User session data
 *   erudits:rate:{ip}:{endpoint}   — Rate limiting counter
 *
 * invalidatePattern() uses Redis SCAN (not KEYS) to safely handle
 * pattern-based cache busting without blocking the server — critical
 * when a resource update needs to bust all cached search results.
 *
 * ## Environment Variables
 *   REDIS_URL     — Redis connection string (e.g., 'redis://localhost:6379')
 *   REDIS_PREFIX  — Key prefix for namespace isolation (default: 'erudits')
 *
 * @module erudits/integrations/redis-cache
 * @version 1.0.0
 */

import type { Cache } from '../types/erudits.types';

// ── Redis SDK Type Stubs ──

interface RedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<string>;
  del(...keys: string[]): Promise<number>;
  incr(key: string): Promise<number>;
  expire(key: string, seconds: number): Promise<number>;
  ttl(key: string): Promise<number>;
  scanStream(options: { match: string; count: number }): AsyncIterable<string[]>;
  pipeline(): RedisPipeline;
  quit(): Promise<string>;
}

interface RedisPipeline {
  del(...keys: string[]): RedisPipeline;
  exec(): Promise<Array<[Error | null, unknown]>>;
}

// ── Implementation ──

export class RedisCacheImpl implements Cache {
  constructor(
    private readonly redis: RedisClient,
    private readonly prefix: string = 'erudits',
  ) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.redis.get(this.prefixKey(key));
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      // Cache misses should not crash the application.
      // Log the error and return null — the caller will fetch from DB.
      console.error(`[RedisCache] GET error for ${key}:`, (err as Error).message);
      return null;
    }
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    try {
      const serialised = JSON.stringify(value);
      if (ttlSeconds && ttlSeconds > 0) {
        await this.redis.set(this.prefixKey(key), serialised, 'EX', ttlSeconds);
      } else {
        await this.redis.set(this.prefixKey(key), serialised);
      }
    } catch (err) {
      console.error(`[RedisCache] SET error for ${key}:`, (err as Error).message);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(this.prefixKey(key));
    } catch (err) {
      console.error(`[RedisCache] DEL error for ${key}:`, (err as Error).message);
    }
  }

  /**
   * Invalidate all keys matching a glob pattern.
   *
   * Uses SCAN instead of KEYS to avoid blocking Redis on large keyspaces.
   * Deletes in batches of 100 via pipelining for efficiency.
   *
   * Example: invalidatePattern('resource:*') clears all cached resources.
   */
  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const fullPattern = this.prefixKey(pattern);
      const stream = this.redis.scanStream({ match: fullPattern, count: 100 });
      const pipeline = this.redis.pipeline();
      let count = 0;

      for await (const keys of stream) {
        if (keys.length > 0) {
          pipeline.del(...keys);
          count += keys.length;
        }
      }

      if (count > 0) {
        await pipeline.exec();
      }
    } catch (err) {
      console.error(`[RedisCache] Pattern invalidation error:`, (err as Error).message);
    }
  }

  /**
   * Atomic increment with optional TTL.
   *
   * Redis INCR is atomic — two concurrent requests both hitting INCR will
   * return sequential values (e.g., 29, 30), never the same value. This
   * makes it ideal for rate limiting where the get-then-set pattern has
   * a TOCTOU race condition.
   *
   * TTL is only set when the key is first created (i.e., when INCR returns 1).
   * This ensures the window doesn't reset mid-count.
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const prefixed = this.prefixKey(key);
      const value = await this.redis.incr(prefixed);

      // Only set TTL on first increment (key creation)
      if (value === 1 && ttlSeconds && ttlSeconds > 0) {
        await this.redis.expire(prefixed, ttlSeconds);
      }

      return value;
    } catch (err) {
      console.error(`[RedisCache] INCR error for ${key}:`, (err as Error).message);
      return 0; // Fail open — don't block requests on cache errors
    }
  }

  private prefixKey(key: string): string {
    return `${this.prefix}:${key}`;
  }
}

// ── Factory ──

export function createRedisCache(
  redis: RedisClient,
  prefix?: string,
): RedisCacheImpl {
  return new RedisCacheImpl(redis, prefix);
}
