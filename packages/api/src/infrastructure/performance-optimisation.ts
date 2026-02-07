// =============================================================================
// Performance Optimisation Service
// =============================================================================
// As the Scholarly platform scales from pilot schools to thousands of
// concurrent readers, raw functionality isn't enough — the system needs to
// be fast. This service implements the three pillars of platform performance:
// intelligent caching (so we don't recompute what we already know), query
// optimisation (so the database does less work per request), and CDN
// configuration (so assets arrive at the speed of light, not the speed
// of a round-trip to the origin server).
//
// Think of it as the difference between a library where you have to walk
// to the back warehouse for every book (no caching) versus one where
// popular books are displayed right at the entrance (cache), the catalogue
// is indexed by multiple attributes (query optimisation), and there are
// branch libraries in every neighbourhood (CDN).
//
// File: infrastructure/performance-optimisation.ts
// Sprint: 8 | Backlog: DE-009 | Lines: ~480
// =============================================================================

import { Result } from '../shared/result';

// === Types ===

export type CacheStrategy = 'write_through' | 'write_behind' | 'read_through' | 'cache_aside';
export type CacheTier = 'l1_memory' | 'l2_redis' | 'l3_cdn';
export type EvictionPolicy = 'lru' | 'lfu' | 'ttl' | 'adaptive';

export interface CacheConfig {
  key: string;
  strategy: CacheStrategy;
  tiers: CacheTier[];
  ttlSeconds: number;
  maxEntries?: number;
  evictionPolicy: EvictionPolicy;
  warmOnStartup: boolean;
  invalidateOn: string[];
  tags: string[];
}

export interface CacheEntry<T = unknown> {
  key: string;
  value: T;
  tier: CacheTier;
  createdAt: number;
  expiresAt: number;
  accessCount: number;
  lastAccessedAt: number;
  sizeBytes: number;
  tags: string[];
}

export interface CacheMetrics {
  tier: CacheTier;
  totalEntries: number;
  hitCount: number;
  missCount: number;
  hitRate: number;
  evictionCount: number;
  totalSizeBytes: number;
  avgResponseMs: number;
}

export interface QueryOptimisation {
  id: string;
  queryPattern: string;
  table: string;
  indexRecommendation: IndexRecommendation;
  estimatedImpact: { currentMs: number; projectedMs: number; improvement: string };
  applied: boolean;
}

export interface IndexRecommendation {
  type: 'btree' | 'hash' | 'gin' | 'gist' | 'composite';
  columns: string[];
  includeColumns?: string[];
  where?: string;
  createStatement: string;
}

export interface CDNConfig {
  provider: 'cloudflare' | 'cloudfront' | 'fastly';
  origins: CDNOrigin[];
  cacheRules: CDNCacheRule[];
  securityConfig: CDNSecurityConfig;
}

export interface CDNOrigin {
  name: string;
  type: 'api' | 'assets' | 'media';
  url: string;
  healthCheckPath: string;
  weight: number;
}

export interface CDNCacheRule {
  pathPattern: string;
  cacheTtlSeconds: number;
  browserTtlSeconds: number;
  cacheKeyIncludes: string[];
  bypassConditions: string[];
  compressionEnabled: boolean;
  staleWhileRevalidate: boolean;
  staleIfError: boolean;
}

export interface CDNSecurityConfig {
  wafEnabled: boolean;
  ddosProtection: boolean;
  botManagement: boolean;
  rateLimiting: { enabled: boolean; requestsPerSecond: number };
  geoRestrictions?: { allowedCountries?: string[]; blockedCountries?: string[] };
}

export interface PerformanceBudget {
  metric: string;
  target: number;
  unit: string;
  current?: number;
  withinBudget?: boolean;
}

// === Multi-Tier Cache Manager ===

export class CacheManager {
  private readonly l1Cache = new Map<string, CacheEntry>();
  private readonly l1Metrics: CacheMetrics = {
    tier: 'l1_memory', totalEntries: 0, hitCount: 0, missCount: 0,
    hitRate: 0, evictionCount: 0, totalSizeBytes: 0, avgResponseMs: 0,
  };
  private readonly l2Metrics: CacheMetrics = {
    tier: 'l2_redis', totalEntries: 0, hitCount: 0, missCount: 0,
    hitRate: 0, evictionCount: 0, totalSizeBytes: 0, avgResponseMs: 0,
  };

  private readonly configs: Map<string, CacheConfig> = new Map();
  private readonly MAX_L1_ENTRIES = 10_000;
  private readonly MAX_L1_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

  constructor() {
    this.registerDefaultCacheConfigs();
  }

  /** Get a value from the cache, checking tiers in order */
  async get<T>(key: string): Promise<CacheEntry<T> | null> {
    const startTime = Date.now();

    // L1: In-memory
    const l1Entry = this.l1Cache.get(key);
    if (l1Entry && l1Entry.expiresAt > Date.now()) {
      l1Entry.accessCount++;
      l1Entry.lastAccessedAt = Date.now();
      this.l1Metrics.hitCount++;
      this.updateHitRate(this.l1Metrics);
      this.l1Metrics.avgResponseMs = this.rollingAvg(this.l1Metrics.avgResponseMs, Date.now() - startTime);
      return l1Entry as CacheEntry<T>;
    }

    if (l1Entry) {
      // Expired — remove
      this.l1Cache.delete(key);
      this.l1Metrics.totalEntries--;
    }

    this.l1Metrics.missCount++;
    this.updateHitRate(this.l1Metrics);

    // L2: Redis (simulated — in production this would call Redis)
    this.l2Metrics.missCount++;
    this.updateHitRate(this.l2Metrics);

    return null;
  }

  /** Set a value in the cache */
  async set<T>(key: string, value: T, configKey?: string): Promise<void> {
    const config = configKey ? this.configs.get(configKey) : this.getConfigForKey(key);
    const ttl = config?.ttlSeconds || 300;
    const tags = config?.tags || [];

    const sizeEstimate = JSON.stringify(value).length * 2; // Rough byte estimate

    // Evict if necessary
    if (this.l1Cache.size >= this.MAX_L1_ENTRIES || this.l1Metrics.totalSizeBytes + sizeEstimate > this.MAX_L1_SIZE_BYTES) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key, value, tier: 'l1_memory',
      createdAt: Date.now(), expiresAt: Date.now() + ttl * 1000,
      accessCount: 0, lastAccessedAt: Date.now(), sizeBytes: sizeEstimate, tags,
    };

    this.l1Cache.set(key, entry);
    this.l1Metrics.totalEntries = this.l1Cache.size;
    this.l1Metrics.totalSizeBytes += sizeEstimate;
  }

  /** Invalidate cache entries by key pattern or tag */
  async invalidate(pattern: string): Promise<number> {
    let count = 0;
    for (const [key, entry] of this.l1Cache) {
      if (key.includes(pattern) || entry.tags.some(t => t === pattern)) {
        this.l1Cache.delete(key);
        this.l1Metrics.totalSizeBytes -= entry.sizeBytes;
        count++;
      }
    }
    this.l1Metrics.totalEntries = this.l1Cache.size;
    return count;
  }

  /** Invalidate by NATS event (e.g., when a book is published, invalidate library cache) */
  async invalidateOnEvent(eventType: string): Promise<number> {
    let totalInvalidated = 0;
    for (const config of this.configs.values()) {
      if (config.invalidateOn.includes(eventType)) {
        totalInvalidated += await this.invalidate(config.key);
      }
    }
    return totalInvalidated;
  }

  /** Get cache metrics for all tiers */
  getMetrics(): CacheMetrics[] {
    return [this.l1Metrics, this.l2Metrics];
  }

  private evictLRU(): void {
    let oldest: { key: string; lastAccessed: number } | null = null;
    for (const [key, entry] of this.l1Cache) {
      if (!oldest || entry.lastAccessedAt < oldest.lastAccessed) {
        oldest = { key, lastAccessed: entry.lastAccessedAt };
      }
    }
    if (oldest) {
      const entry = this.l1Cache.get(oldest.key);
      if (entry) this.l1Metrics.totalSizeBytes -= entry.sizeBytes;
      this.l1Cache.delete(oldest.key);
      this.l1Metrics.evictionCount++;
    }
  }

  private updateHitRate(metrics: CacheMetrics): void {
    const total = metrics.hitCount + metrics.missCount;
    metrics.hitRate = total > 0 ? Math.round((metrics.hitCount / total) * 10000) / 100 : 0;
  }

  private rollingAvg(current: number, newValue: number): number {
    return current === 0 ? newValue : Math.round((current * 0.9 + newValue * 0.1) * 100) / 100;
  }

  private getConfigForKey(key: string): CacheConfig | undefined {
    for (const config of this.configs.values()) {
      if (key.startsWith(config.key)) return config;
    }
    return undefined;
  }

  private registerDefaultCacheConfigs(): void {
    const configs: CacheConfig[] = [
      {
        key: 'library:search', strategy: 'cache_aside', tiers: ['l1_memory', 'l2_redis'],
        ttlSeconds: 300, maxEntries: 1000, evictionPolicy: 'lru', warmOnStartup: false,
        invalidateOn: ['story.published', 'story.archived'], tags: ['library'],
      },
      {
        key: 'library:recommend', strategy: 'cache_aside', tiers: ['l1_memory'],
        ttlSeconds: 600, maxEntries: 5000, evictionPolicy: 'lru', warmOnStartup: false,
        invalidateOn: ['library.book.read', 'story.published'], tags: ['library', 'personalisation'],
      },
      {
        key: 'storybook:detail', strategy: 'read_through', tiers: ['l1_memory', 'l2_redis', 'l3_cdn'],
        ttlSeconds: 3600, maxEntries: 10000, evictionPolicy: 'lfu', warmOnStartup: true,
        invalidateOn: ['story.updated', 'story.archived'], tags: ['storybook'],
      },
      {
        key: 'gpc:taught', strategy: 'cache_aside', tiers: ['l1_memory'],
        ttlSeconds: 900, maxEntries: 50000, evictionPolicy: 'lru', warmOnStartup: false,
        invalidateOn: ['learner.gpc.updated'], tags: ['phonics', 'learner'],
      },
      {
        key: 'character:sheet', strategy: 'read_through', tiers: ['l1_memory', 'l2_redis'],
        ttlSeconds: 7200, maxEntries: 5000, evictionPolicy: 'lfu', warmOnStartup: false,
        invalidateOn: ['character.updated'], tags: ['character', 'illustration'],
      },
      {
        key: 'creator:profile', strategy: 'cache_aside', tiers: ['l1_memory'],
        ttlSeconds: 600, maxEntries: 10000, evictionPolicy: 'lru', warmOnStartup: false,
        invalidateOn: ['creator.updated', 'creator.tier_promoted'], tags: ['marketplace'],
      },
      {
        key: 'analytics:book', strategy: 'write_behind', tiers: ['l1_memory', 'l2_redis'],
        ttlSeconds: 300, maxEntries: 10000, evictionPolicy: 'lru', warmOnStartup: false,
        invalidateOn: ['library.book.read'], tags: ['analytics'],
      },
    ];

    for (const config of configs) {
      this.configs.set(config.key, config);
    }
  }
}

// === Query Optimisation Analyser ===

export class QueryOptimiser {
  private readonly optimisations: QueryOptimisation[] = [];

  constructor() {
    this.registerRecommendedIndices();
  }

  getRecommendations(): QueryOptimisation[] { return this.optimisations; }
  getApplied(): QueryOptimisation[] { return this.optimisations.filter(o => o.applied); }
  getPending(): QueryOptimisation[] { return this.optimisations.filter(o => !o.applied); }

  generateMigrationSQL(): string {
    return this.optimisations
      .filter(o => !o.applied)
      .map(o => `-- ${o.id}: ${o.queryPattern}\n-- Impact: ${o.estimatedImpact.currentMs}ms → ${o.estimatedImpact.projectedMs}ms (${o.estimatedImpact.improvement})\n${o.indexRecommendation.createStatement};`)
      .join('\n\n');
  }

  private registerRecommendedIndices(): void {
    this.optimisations.push(
      {
        id: 'IDX-001', queryPattern: 'Library search by phase + status', table: 'storybooks',
        indexRecommendation: {
          type: 'composite', columns: ['tenant_id', 'phase', 'status'], includeColumns: ['title', 'decodability_score'],
          createStatement: 'CREATE INDEX CONCURRENTLY idx_storybooks_library_search ON storybooks (tenant_id, phase, status) INCLUDE (title, decodability_score)',
        },
        estimatedImpact: { currentMs: 120, projectedMs: 8, improvement: '93% reduction' }, applied: false,
      },
      {
        id: 'IDX-002', queryPattern: 'Learner GPC lookup', table: 'phonics_gpc_reference',
        indexRecommendation: {
          type: 'composite', columns: ['phase', 'introduction_order'],
          createStatement: 'CREATE INDEX CONCURRENTLY idx_gpc_phase_order ON phonics_gpc_reference (phase, introduction_order)',
        },
        estimatedImpact: { currentMs: 45, projectedMs: 2, improvement: '96% reduction' }, applied: false,
      },
      {
        id: 'IDX-003', queryPattern: 'Storybook analytics aggregation', table: 'storybook_analytics',
        indexRecommendation: {
          type: 'composite', columns: ['storybook_id', 'created_at'],
          createStatement: 'CREATE INDEX CONCURRENTLY idx_analytics_book_time ON storybook_analytics (storybook_id, created_at DESC)',
        },
        estimatedImpact: { currentMs: 200, projectedMs: 15, improvement: '92% reduction' }, applied: false,
      },
      {
        id: 'IDX-004', queryPattern: 'Creator marketplace leaderboard', table: 'creator_profiles',
        indexRecommendation: {
          type: 'composite', columns: ['tenant_id', 'tier'], includeColumns: ['total_reads', 'average_rating', 'published_books'],
          createStatement: 'CREATE INDEX CONCURRENTLY idx_creators_leaderboard ON creator_profiles (tenant_id, tier) INCLUDE (total_reads, average_rating, published_books)',
        },
        estimatedImpact: { currentMs: 80, projectedMs: 5, improvement: '94% reduction' }, applied: false,
      },
      {
        id: 'IDX-005', queryPattern: 'Review pipeline queue', table: 'storybook_reviews',
        indexRecommendation: {
          type: 'composite', columns: ['status', 'stage', 'created_at'],
          createStatement: 'CREATE INDEX CONCURRENTLY idx_reviews_pipeline ON storybook_reviews (status, stage, created_at ASC)',
        },
        estimatedImpact: { currentMs: 65, projectedMs: 4, improvement: '94% reduction' }, applied: false,
      },
      {
        id: 'IDX-006', queryPattern: 'Device storybook sync lookup', table: 'device_storybooks',
        indexRecommendation: {
          type: 'composite', columns: ['device_id', 'storybook_id'],
          createStatement: 'CREATE INDEX CONCURRENTLY idx_device_books ON device_storybooks (device_id, storybook_id)',
        },
        estimatedImpact: { currentMs: 30, projectedMs: 1, improvement: '97% reduction' }, applied: false,
      },
      {
        id: 'IDX-007', queryPattern: 'Content bounty search', table: 'content_bounties',
        indexRecommendation: {
          type: 'gin', columns: ['tags'],
          createStatement: 'CREATE INDEX CONCURRENTLY idx_bounties_tags ON content_bounties USING gin (tags)',
        },
        estimatedImpact: { currentMs: 90, projectedMs: 6, improvement: '93% reduction' }, applied: false,
      },
    );
  }
}

// === CDN Configuration Generator ===

export class CDNConfigGenerator {
  generateCloudflareConfig(): CDNConfig {
    return {
      provider: 'cloudflare',
      origins: [
        { name: 'api', type: 'api', url: 'https://api.scholarly.app', healthCheckPath: '/health', weight: 100 },
        { name: 'assets', type: 'assets', url: 'https://assets.scholarly.app', healthCheckPath: '/health', weight: 100 },
        { name: 'media', type: 'media', url: 'https://media.scholarly.app', healthCheckPath: '/health', weight: 100 },
      ],
      cacheRules: [
        {
          pathPattern: '/v1/library/search*', cacheTtlSeconds: 300, browserTtlSeconds: 60,
          cacheKeyIncludes: ['phase', 'theme', 'artStyle', 'language', 'page', 'limit'],
          bypassConditions: ['Authorization header present with unique user token'],
          compressionEnabled: true, staleWhileRevalidate: true, staleIfError: true,
        },
        {
          pathPattern: '/v1/stories/*/pages/*/illustration', cacheTtlSeconds: 86400, browserTtlSeconds: 604800,
          cacheKeyIncludes: ['story_id', 'page_number'],
          bypassConditions: [],
          compressionEnabled: false, staleWhileRevalidate: true, staleIfError: true,
        },
        {
          pathPattern: '/v1/stories/*/pages/*/audio', cacheTtlSeconds: 86400, browserTtlSeconds: 604800,
          cacheKeyIncludes: ['story_id', 'page_number'],
          bypassConditions: [],
          compressionEnabled: false, staleWhileRevalidate: true, staleIfError: true,
        },
        {
          pathPattern: '/v1/schemas/*', cacheTtlSeconds: 3600, browserTtlSeconds: 3600,
          cacheKeyIncludes: [],
          bypassConditions: [],
          compressionEnabled: true, staleWhileRevalidate: true, staleIfError: true,
        },
        {
          pathPattern: '/v1/stories/generate', cacheTtlSeconds: 0, browserTtlSeconds: 0,
          cacheKeyIncludes: [], bypassConditions: ['Always bypass — generation is unique'],
          compressionEnabled: true, staleWhileRevalidate: false, staleIfError: false,
        },
      ],
      securityConfig: {
        wafEnabled: true, ddosProtection: true, botManagement: true,
        rateLimiting: { enabled: true, requestsPerSecond: 100 },
      },
    };
  }
}

// === Performance Budget Tracker ===

export class PerformanceBudgetTracker {
  private readonly budgets: PerformanceBudget[] = [
    { metric: 'API p50 latency', target: 100, unit: 'ms' },
    { metric: 'API p95 latency', target: 500, unit: 'ms' },
    { metric: 'API p99 latency', target: 2000, unit: 'ms' },
    { metric: 'Story generation time', target: 30000, unit: 'ms' },
    { metric: 'Illustration generation time', target: 60000, unit: 'ms' },
    { metric: 'Library search response', target: 200, unit: 'ms' },
    { metric: 'Cache hit rate (L1)', target: 80, unit: '%' },
    { metric: 'Cache hit rate (L2)', target: 95, unit: '%' },
    { metric: 'Time to First Byte (reader)', target: 400, unit: 'ms' },
    { metric: 'Time to Interactive (reader)', target: 3000, unit: 'ms' },
    { metric: 'Largest Contentful Paint', target: 2500, unit: 'ms' },
    { metric: 'Cumulative Layout Shift', target: 0.1, unit: 'score' },
    { metric: 'Service Worker cache hit rate', target: 90, unit: '%' },
    { metric: 'Offline read capability', target: 100, unit: '%' },
  ];

  getBudgets(): PerformanceBudget[] { return this.budgets; }

  updateMetric(metric: string, current: number): Result<PerformanceBudget> {
    const budget = this.budgets.find(b => b.metric === metric);
    if (!budget) return { success: false, error: `Unknown metric: ${metric}` };
    budget.current = current;
    budget.withinBudget = current <= budget.target;
    return { success: true, data: budget };
  }

  getViolations(): PerformanceBudget[] {
    return this.budgets.filter(b => b.current !== undefined && !b.withinBudget);
  }
}

// === Orchestrator ===

export class PerformanceOptimisationService {
  public readonly cache: CacheManager;
  public readonly queryOptimiser: QueryOptimiser;
  public readonly cdn: CDNConfigGenerator;
  public readonly budgetTracker: PerformanceBudgetTracker;

  constructor() {
    this.cache = new CacheManager();
    this.queryOptimiser = new QueryOptimiser();
    this.cdn = new CDNConfigGenerator();
    this.budgetTracker = new PerformanceBudgetTracker();
  }

  /** Get a comprehensive performance report */
  getPerformanceReport(): Record<string, unknown> {
    return {
      cache: this.cache.getMetrics(),
      indices: {
        total: this.queryOptimiser.getRecommendations().length,
        applied: this.queryOptimiser.getApplied().length,
        pending: this.queryOptimiser.getPending().length,
        pendingMigrationSQL: this.queryOptimiser.generateMigrationSQL(),
      },
      budgets: {
        total: this.budgetTracker.getBudgets().length,
        violations: this.budgetTracker.getViolations(),
      },
      cdnConfig: this.cdn.generateCloudflareConfig(),
    };
  }
}

export default PerformanceOptimisationService;
