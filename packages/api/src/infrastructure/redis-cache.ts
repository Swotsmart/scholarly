/**
 * Scholarly Platform — Redis Cache with Cluster Support
 * ======================================================
 *
 * REM-004: The current cache is an in-memory Map that lives and dies with
 * the process. This module replaces it with a production Redis client
 * featuring cluster mode, pattern-based invalidation, distributed locking,
 * and an in-memory implementation for testing.
 *
 * @module infrastructure/redis-cache
 * @version 1.0.0
 */

import Redis, { Cluster, RedisOptions, ClusterOptions } from 'ioredis';
import { Logger } from 'pino';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
  incr(key: string): Promise<number>;
  setNx(key: string, value: string, ttlSeconds: number): Promise<boolean>;
  isHealthy(): Promise<boolean>;
  mget<T>(...keys: string[]): Promise<(T | null)[]>;
  mset(entries: Array<{ key: string; value: unknown; ttlSeconds?: number }>): Promise<void>;
  disconnect(): Promise<void>;
}

export interface RedisCacheConfig {
  url: string;
  clusterMode: boolean;
  maxRetries: number;
  retryDelayMs: number;
  keyPrefix: string;
  defaultTtlSeconds: number;
  logger: Logger;
}

// ============================================================================
// SECTION 2: REDIS CACHE IMPLEMENTATION
// ============================================================================

export class RedisCache implements Cache {
  private client: Redis | Cluster;
  private readonly config: RedisCacheConfig;
  private readonly logger: Logger;
  private connected = false;

  constructor(config: RedisCacheConfig) {
    this.config = config;
    this.logger = config.logger.child({ module: 'RedisCache' });

    if (config.clusterMode) {
      this.client = this.createClusterClient();
    } else {
      this.client = this.createSingleClient();
    }

    this.setupEventHandlers();
  }

  private createSingleClient(): Redis {
    const parsed = new URL(this.config.url);
    const options: RedisOptions = {
      host: parsed.hostname,
      port: parseInt(parsed.port, 10) || 6379,
      password: parsed.password || undefined,
      db: parseInt(parsed.pathname?.slice(1), 10) || 0,
      keyPrefix: this.config.keyPrefix,
      retryStrategy: (times: number) => {
        if (times > this.config.maxRetries) {
          this.logger.error({ retryCount: times }, 'Redis max retries exceeded');
          return null;
        }
        const delay = Math.min(this.config.retryDelayMs * Math.pow(2, times - 1), 30000);
        this.logger.warn({ retryCount: times, delayMs: delay }, 'Redis retrying...');
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      connectTimeout: 10000,
      lazyConnect: false,
      tls: parsed.protocol === 'rediss:' ? {} : undefined,
    };
    return new Redis(options);
  }

  private createClusterClient(): Cluster {
    const parsed = new URL(this.config.url);
    const options: ClusterOptions = {
      redisOptions: {
        password: parsed.password || undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
      },
      clusterRetryStrategy: (times: number) => {
        if (times > this.config.maxRetries) return null;
        return Math.min(this.config.retryDelayMs * Math.pow(2, times - 1), 30000);
      },
      enableReadyCheck: true,
      scaleReads: 'slave',
      keyPrefix: this.config.keyPrefix,
    };
    return new Redis.Cluster(
      [{ host: parsed.hostname, port: parseInt(parsed.port, 10) || 6379 }],
      options,
    );
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => { this.connected = true; this.logger.info('Redis connected'); });
    this.client.on('ready', () => { this.connected = true; this.logger.info('Redis ready'); });
    this.client.on('error', (err: Error) => { this.logger.error({ err }, 'Redis error'); });
    this.client.on('close', () => { this.connected = false; this.logger.warn('Redis closed'); });
    this.client.on('reconnecting', (ms: number) => { this.logger.info({ delayMs: ms }, 'Redis reconnecting'); });
    this.client.on('end', () => { this.connected = false; this.logger.info('Redis ended'); });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const raw = await this.client.get(key);
      if (raw === null) return null;
      return JSON.parse(raw) as T;
    } catch (err) {
      this.logger.warn({ err, key }, 'Cache get failed');
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    const ttl = ttlSeconds ?? this.config.defaultTtlSeconds;
    const serialized = JSON.stringify(value);
    try {
      if (ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }
    } catch (err) {
      this.logger.warn({ err, key }, 'Cache set failed');
    }
  }

  async del(key: string): Promise<void> {
    try { await this.client.del(key); } catch (err) { this.logger.warn({ err, key }, 'Cache del failed'); }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      if (this.config.clusterMode && this.client instanceof Cluster) {
        const nodes = this.client.nodes('master');
        for (const node of nodes) { await this.scanAndDelete(node, pattern); }
      } else {
        await this.scanAndDelete(this.client as Redis, pattern);
      }
    } catch (err) {
      this.logger.warn({ err, pattern }, 'Cache invalidatePattern failed');
    }
  }

  private async scanAndDelete(client: Redis, pattern: string): Promise<void> {
    let cursor = '0';
    const fullPattern = `${this.config.keyPrefix}${pattern}`;
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', fullPattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        const strippedKeys = keys.map((k) => k.replace(this.config.keyPrefix, ''));
        if (strippedKeys.length > 0) { await (this.client as Redis).del(...strippedKeys); }
      }
    } while (cursor !== '0');
  }

  async incr(key: string): Promise<number> {
    try { return await this.client.incr(key); } catch (err) { this.logger.warn({ err, key }, 'Cache incr failed'); return 0; }
  }

  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    try {
      const result = await (this.client as Redis).set(key, value, 'EX', ttlSeconds, 'NX');
      return result === 'OK';
    } catch (err) { this.logger.warn({ err, key }, 'Cache setNx failed'); return false; }
  }

  async mget<T>(...keys: string[]): Promise<(T | null)[]> {
    try {
      const results = await this.client.mget(...keys);
      return results.map((raw) => { if (raw === null) return null; try { return JSON.parse(raw) as T; } catch { return null; } });
    } catch (err) { this.logger.warn({ err }, 'Cache mget failed'); return keys.map(() => null); }
  }

  async mset(entries: Array<{ key: string; value: unknown; ttlSeconds?: number }>): Promise<void> {
    try {
      const pipeline = (this.client as Redis).pipeline();
      for (const entry of entries) {
        const serialized = JSON.stringify(entry.value);
        const ttl = entry.ttlSeconds ?? this.config.defaultTtlSeconds;
        if (ttl > 0) { pipeline.setex(entry.key, ttl, serialized); } else { pipeline.set(entry.key, serialized); }
      }
      await pipeline.exec();
    } catch (err) { this.logger.warn({ err }, 'Cache mset failed'); }
  }

  async isHealthy(): Promise<boolean> {
    try { const result = await this.client.ping(); return result === 'PONG'; } catch { return false; }
  }

  async disconnect(): Promise<void> {
    try { await this.client.quit(); this.connected = false; this.logger.info('Redis disconnected'); }
    catch (err) { this.logger.warn({ err }, 'Error during Redis disconnect'); this.client.disconnect(); }
  }

  /** Distributed lock acquisition using SET NX pattern. */
  async acquireLock(lockKey: string, ttlSeconds: number = 30): Promise<(() => Promise<void>) | null> {
    const lockValue = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const fullKey = `lock:${lockKey}`;
    const acquired = await this.setNx(fullKey, lockValue, ttlSeconds);
    if (!acquired) return null;
    return async () => {
      const currentValue = await (this.client as Redis).get(`${this.config.keyPrefix}${fullKey}`);
      if (currentValue === lockValue) { await this.del(fullKey); }
    };
  }
}

// ============================================================================
// SECTION 3: IN-MEMORY CACHE (FOR TESTING)
// ============================================================================

export class InMemoryCache implements Cache {
  private store = new Map<string, { value: unknown; expiresAt: number }>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt > 0 && Date.now() > entry.expiresAt) { this.store.delete(key); return null; }
    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.store.set(key, { value, expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
  }

  async del(key: string): Promise<void> { this.store.delete(key); }

  async invalidatePattern(pattern: string): Promise<void> {
    const prefix = pattern.replace('*', '');
    for (const key of this.store.keys()) { if (key.startsWith(prefix)) { this.store.delete(key); } }
  }

  async incr(key: string): Promise<number> { const c = await this.get<number>(key); const n = (c ?? 0) + 1; await this.set(key, n); return n; }
  async setNx(key: string, value: string, ttlSeconds: number): Promise<boolean> { if (this.store.has(key)) return false; await this.set(key, value, ttlSeconds); return true; }
  async mget<T>(...keys: string[]): Promise<(T | null)[]> { return Promise.all(keys.map((k) => this.get<T>(k))); }
  async mset(entries: Array<{ key: string; value: unknown; ttlSeconds?: number }>): Promise<void> { for (const e of entries) { await this.set(e.key, e.value, e.ttlSeconds); } }
  async isHealthy(): Promise<boolean> { return true; }
  async disconnect(): Promise<void> { this.store.clear(); }
  reset(): void { this.store.clear(); }
  size(): number { return this.store.size; }
}
