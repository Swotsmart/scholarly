/**
 * Scholarly Platform — AI Response Cache
 * AI-009: Exact-match caching for AI provider responses.
 * @module ai-abstraction/ai-cache
 * @version 1.0.0
 */

import { Logger } from 'pino';

// ============================================================================
// TYPES
// ============================================================================

export type Result<T> = { success: true; data: T } | { success: false; error: { code: string; message: string; details?: unknown } };
export type CacheableCapability = 'contentSafety' | 'embedding' | 'structuredOutput' | 'assessment' | 'textCompletion';

export interface CacheConfig {
  enabled: boolean;
  defaultTtlSeconds: Partial<Record<CacheableCapability, number>>;
  maxEntries: number;
  maxResponseSize: number;
  alwaysCacheCapabilities: CacheableCapability[];
}

export interface CachedResponse {
  data: unknown;
  usage: { inputTokens: number; outputTokens: number; costUsd: number; provider: string; model: string };
  cachedAt: number;
  expiresAt: number;
  hitCount: number;
}

export interface CacheStats {
  totalEntries: number;
  totalSizeBytes: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  costSaved: number;
}

export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<boolean>;
  invalidatePattern(pattern: string): Promise<number>;
}

// ============================================================================
// CACHE KEY GENERATION
// ============================================================================

export function generateCacheKey(capability: CacheableCapability, provider: string, request: Record<string, unknown>): string {
  const keyComponents: Record<string, unknown> = { capability, provider };

  switch (capability) {
    case 'textCompletion':
      keyComponents.prompt = request.prompt;
      keyComponents.systemPrompt = request.systemPrompt;
      keyComponents.temperature = request.temperature;
      keyComponents.maxTokens = request.maxTokens;
      keyComponents.costTier = request.costTier;
      break;
    case 'contentSafety':
      keyComponents.content = request.content;
      keyComponents.ageRange = request.ageRange;
      break;
    case 'embedding':
      keyComponents.texts = request.texts;
      keyComponents.dimensions = request.dimensions;
      break;
    case 'structuredOutput':
      keyComponents.prompt = request.prompt;
      keyComponents.schema = request.schema;
      keyComponents.temperature = request.temperature;
      break;
    case 'assessment':
      keyComponents.studentResponse = request.studentResponse;
      keyComponents.assessmentCriteria = request.assessmentCriteria;
      keyComponents.rubric = request.rubric;
      break;
  }

  const serialised = JSON.stringify(keyComponents, Object.keys(keyComponents).sort());
  return `ai:cache:${capability}:${provider}:${fnv1a(serialised)}`;
}

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

// ============================================================================
// IN-MEMORY LRU CACHE (L1)
// ============================================================================

interface CacheEntry {
  key: string;
  response: CachedResponse;
  sizeBytes: number;
  lastAccessedAt: number;
}

export class InMemoryLRUCache {
  private entries: Map<string, CacheEntry> = new Map();
  private totalSizeBytes = 0;
  private stats = { hitCount: 0, missCount: 0, evictionCount: 0, costSaved: 0 };

  constructor(private maxEntries: number, private maxSizeBytes: number = 100 * 1024 * 1024) {}

  get(key: string): CachedResponse | null {
    const entry = this.entries.get(key);
    if (!entry) { this.stats.missCount++; return null; }
    if (Date.now() > entry.response.expiresAt) {
      this.entries.delete(key);
      this.totalSizeBytes -= entry.sizeBytes;
      this.stats.missCount++;
      return null;
    }
    entry.lastAccessedAt = Date.now();
    entry.response.hitCount++;
    this.stats.hitCount++;
    this.stats.costSaved += entry.response.usage.costUsd;
    // Move to end (most recent)
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry.response;
  }

  set(key: string, response: CachedResponse): void {
    const sizeBytes = JSON.stringify(response.data).length * 2;
    if (sizeBytes > this.maxSizeBytes * 0.1) return;

    const existing = this.entries.get(key);
    if (existing) { this.totalSizeBytes -= existing.sizeBytes; this.entries.delete(key); }

    while ((this.entries.size >= this.maxEntries || this.totalSizeBytes + sizeBytes > this.maxSizeBytes) && this.entries.size > 0) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        const evicted = this.entries.get(oldestKey);
        if (evicted) this.totalSizeBytes -= evicted.sizeBytes;
        this.entries.delete(oldestKey);
        this.stats.evictionCount++;
      }
    }

    this.entries.set(key, { key, response, sizeBytes, lastAccessedAt: Date.now() });
    this.totalSizeBytes += sizeBytes;
  }

  delete(key: string): boolean {
    const entry = this.entries.get(key);
    if (!entry) return false;
    this.totalSizeBytes -= entry.sizeBytes;
    this.entries.delete(key);
    return true;
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const [key, entry] of this.entries) {
      if (key.startsWith(prefix)) { this.totalSizeBytes -= entry.sizeBytes; this.entries.delete(key); count++; }
    }
    return count;
  }

  getStats(): CacheStats {
    const total = this.stats.hitCount + this.stats.missCount;
    return { totalEntries: this.entries.size, totalSizeBytes: this.totalSizeBytes, ...this.stats, hitRate: total > 0 ? this.stats.hitCount / total : 0 };
  }

  clear(): void { this.entries.clear(); this.totalSizeBytes = 0; }
}

// ============================================================================
// AI CACHE SERVICE
// ============================================================================

const DEFAULT_TTL: Record<CacheableCapability, number> = {
  contentSafety: 3600,
  embedding: 86400,
  structuredOutput: 1800,
  assessment: 900,
  textCompletion: 600,
};

export class AICacheService {
  private l1Cache: InMemoryLRUCache;
  private config: CacheConfig;

  constructor(config: Partial<CacheConfig>, private l2Cache: ICache | null, private logger: Logger) {
    this.config = {
      enabled: config.enabled ?? true,
      defaultTtlSeconds: { ...DEFAULT_TTL, ...config.defaultTtlSeconds },
      maxEntries: config.maxEntries ?? 10000,
      maxResponseSize: config.maxResponseSize ?? 1024 * 1024,
      alwaysCacheCapabilities: config.alwaysCacheCapabilities ?? ['contentSafety', 'embedding'],
    };
    this.l1Cache = new InMemoryLRUCache(this.config.maxEntries);
    this.logger.info({ enabled: this.config.enabled, l2Available: !!l2Cache }, 'AI Cache Service initialised');
  }

  /** Check if a cached response exists. L1 first, then L2. */
  async get(capability: CacheableCapability, provider: string, request: Record<string, unknown>): Promise<CachedResponse | null> {
    if (!this.config.enabled) return null;
    if (!this.shouldCache(capability, request)) return null;

    const key = generateCacheKey(capability, provider, request);

    // L1 check
    const l1Result = this.l1Cache.get(key);
    if (l1Result) {
      this.logger.debug({ capability, provider, cache: 'l1' }, 'AI cache hit');
      return l1Result;
    }

    // L2 check
    if (this.l2Cache) {
      try {
        const l2Result = await this.l2Cache.get<CachedResponse>(key);
        if (l2Result && Date.now() < l2Result.expiresAt) {
          // Promote to L1
          this.l1Cache.set(key, l2Result);
          this.logger.debug({ capability, provider, cache: 'l2' }, 'AI cache hit (promoted to L1)');
          return l2Result;
        }
      } catch (err) {
        this.logger.warn({ err, key }, 'L2 cache read error');
      }
    }

    return null;
  }

  /** Store a response in both L1 and L2 caches. */
  async set(
    capability: CacheableCapability,
    provider: string,
    request: Record<string, unknown>,
    data: unknown,
    usage: CachedResponse['usage']
  ): Promise<void> {
    if (!this.config.enabled) return;
    if (!this.shouldCache(capability, request)) return;

    const key = generateCacheKey(capability, provider, request);
    const ttlSeconds = this.config.defaultTtlSeconds[capability] || 600;

    const cached: CachedResponse = {
      data,
      usage,
      cachedAt: Date.now(),
      expiresAt: Date.now() + (ttlSeconds * 1000),
      hitCount: 0,
    };

    // Check response size
    const size = JSON.stringify(data).length;
    if (size > this.config.maxResponseSize) {
      this.logger.debug({ capability, size, max: this.config.maxResponseSize }, 'Response too large to cache');
      return;
    }

    // L1
    this.l1Cache.set(key, cached);

    // L2
    if (this.l2Cache) {
      try {
        await this.l2Cache.set(key, cached, ttlSeconds);
      } catch (err) {
        this.logger.warn({ err, key }, 'L2 cache write error');
      }
    }

    this.logger.debug({ capability, provider, ttlSeconds, sizeBytes: size }, 'AI response cached');
  }

  /** Invalidate all cached entries for a capability */
  async invalidateCapability(capability: CacheableCapability): Promise<number> {
    const prefix = `ai:cache:${capability}:`;
    const l1Count = this.l1Cache.invalidateByPrefix(prefix);

    let l2Count = 0;
    if (this.l2Cache) {
      try {
        l2Count = await this.l2Cache.invalidatePattern(`${prefix}*`);
      } catch { /* silent */ }
    }

    this.logger.info({ capability, l1Count, l2Count }, 'AI cache invalidated');
    return l1Count + l2Count;
  }

  /** Determine if a request should be cached */
  private shouldCache(capability: CacheableCapability, request: Record<string, unknown>): boolean {
    // Always-cache capabilities bypass temperature check
    if (this.config.alwaysCacheCapabilities.includes(capability)) return true;

    // For other capabilities, only cache deterministic requests (temp=0)
    const temperature = request.temperature as number | undefined;
    return temperature === 0 || temperature === undefined;
  }

  getStats(): CacheStats { return this.l1Cache.getStats(); }
  clear(): void { this.l1Cache.clear(); }
}
