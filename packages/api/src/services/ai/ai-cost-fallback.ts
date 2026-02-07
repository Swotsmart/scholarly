// =============================================================================
// SCHOLARLY PLATFORM — AI Cost Tracking & Provider Fallback
// Sprint 3 | AI-010 + AI-011 | ai-cost-fallback.ts
// =============================================================================
// AI-010: Cost tracking dashboard service that aggregates AI spend per
// tenant, per capability, per model with configurable budget alerts.
// AI-011: Provider fallback chain with automatic failover using circuit
// breaker state from Sprint 1's provider registry.
// =============================================================================

// ---------------------------------------------------------------------------
// Section 1: Type Definitions
// ---------------------------------------------------------------------------

/** Granularity for cost aggregation */
export type TimeGranularity = 'hour' | 'day' | 'week' | 'month';

/** A single AI operation cost record */
export interface AICostRecord {
  id: string;
  tenantId: string;
  capability: string; // 'text_completion' | 'assessment' | 'vision' | 'embedding' | etc.
  provider: string;   // 'claude' | 'openai' | 'gemini'
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  latencyMs: number;
  cached: boolean;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/** Aggregated cost summary */
export interface CostSummary {
  tenantId: string;
  period: { start: string; end: string; granularity: TimeGranularity };
  totalCostUsd: number;
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  cacheSavingsUsd: number;
  byProvider: Record<string, { costUsd: number; requests: number; avgLatencyMs: number }>;
  byCapability: Record<string, { costUsd: number; requests: number }>;
  byModel: Record<string, { costUsd: number; requests: number; inputTokens: number; outputTokens: number }>;
}

/** Budget configuration per tenant */
export interface BudgetConfig {
  tenantId: string;
  dailyLimitUsd: number;
  monthlyLimitUsd: number;
  alertThresholds: number[]; // e.g. [0.5, 0.8, 0.95] — alert at 50%, 80%, 95%
  hardLimitAction: 'block' | 'throttle' | 'alert_only';
  perCapabilityLimits?: Record<string, number>; // Monthly limit per capability
}

/** Budget alert */
export interface BudgetAlert {
  tenantId: string;
  alertType: 'threshold' | 'daily_limit' | 'monthly_limit' | 'capability_limit';
  threshold: number;
  currentSpend: number;
  limitUsd: number;
  percentUsed: number;
  capability?: string;
  timestamp: string;
}

/** Cost trend data point */
export interface CostTrendPoint {
  timestamp: string;
  costUsd: number;
  requests: number;
  avgCostPerRequest: number;
}

// Dependency interfaces
export interface ICostRepository {
  recordCost(record: AICostRecord): Promise<void>;
  queryCosts(filter: CostQueryFilter): Promise<AICostRecord[]>;
  getAggregate(tenantId: string, period: { start: string; end: string }, groupBy: string[]): Promise<CostSummary>;
  getDailySpend(tenantId: string, date: string): Promise<number>;
  getMonthlySpend(tenantId: string, month: string): Promise<number>;
  getCapabilitySpend(tenantId: string, capability: string, month: string): Promise<number>;
}

export interface CostQueryFilter {
  tenantId?: string;
  provider?: string;
  capability?: string;
  model?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface IEventPublisher {
  publish(subject: string, data: unknown): Promise<void>;
}

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
}

export interface ILogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}

// ---------------------------------------------------------------------------
// Section 2: AI Cost Tracker (AI-010)
// ---------------------------------------------------------------------------

/**
 * Records, aggregates, and monitors AI API costs across the platform.
 * Think of it as the platform's financial controller for AI spending —
 * it tracks every penny spent on AI APIs, knows which tenants and
 * capabilities are driving costs, and sounds the alarm when budgets
 * are being approached.
 */
export class AICostTracker {
  private readonly repository: ICostRepository;
  private readonly budgets: Map<string, BudgetConfig> = new Map();
  private readonly eventPublisher?: IEventPublisher;
  private readonly cache?: ICacheProvider;
  private readonly logger: ILogger;

  // In-memory spend accumulators for fast budget checks
  // Flushed to persistent storage periodically
  private dailySpendAccumulator: Map<string, number> = new Map();
  private monthlySpendAccumulator: Map<string, number> = new Map();
  private lastFlushTime: number = Date.now();
  private readonly FLUSH_INTERVAL_MS = 60_000; // Flush every minute

  constructor(config: {
    repository: ICostRepository;
    eventPublisher?: IEventPublisher;
    cache?: ICacheProvider;
    logger: ILogger;
  }) {
    this.repository = config.repository;
    this.eventPublisher = config.eventPublisher;
    this.cache = config.cache;
    this.logger = config.logger;
  }

  /**
   * Record a single AI operation cost. Called by the AI abstraction layer
   * after every API call.
   */
  async recordCost(record: AICostRecord): Promise<{
    allowed: boolean;
    warning?: BudgetAlert;
  }> {
    // Persist the record
    await this.repository.recordCost(record);

    // Update in-memory accumulators
    const dateKey = `${record.tenantId}:${new Date(record.timestamp).toISOString().split('T')[0]}`;
    const monthKey = `${record.tenantId}:${new Date(record.timestamp).toISOString().substring(0, 7)}`;

    this.dailySpendAccumulator.set(
      dateKey,
      (this.dailySpendAccumulator.get(dateKey) ?? 0) + record.costUsd
    );
    this.monthlySpendAccumulator.set(
      monthKey,
      (this.monthlySpendAccumulator.get(monthKey) ?? 0) + record.costUsd
    );

    // Check budgets
    const budget = this.budgets.get(record.tenantId);
    if (budget) {
      return this.checkBudget(record.tenantId, budget, record.capability);
    }

    return { allowed: true };
  }

  /**
   * Set budget configuration for a tenant.
   */
  setBudget(config: BudgetConfig): void {
    this.budgets.set(config.tenantId, config);
    this.logger.info('Budget configured', {
      tenantId: config.tenantId,
      dailyLimit: config.dailyLimitUsd,
      monthlyLimit: config.monthlyLimitUsd,
    });
  }

  /**
   * Get cost summary for a tenant over a time period.
   */
  async getCostSummary(
    tenantId: string,
    period: { start: string; end: string },
    granularity: TimeGranularity = 'day'
  ): Promise<CostSummary> {
    // Check cache first
    const cacheKey = `cost_summary:${tenantId}:${period.start}:${period.end}:${granularity}`;
    if (this.cache) {
      const cached = await this.cache.get<CostSummary>(cacheKey);
      if (cached) return cached;
    }

    const summary = await this.repository.getAggregate(
      tenantId,
      period,
      ['provider', 'capability', 'model']
    );
    summary.period.granularity = granularity;

    // Cache for 5 minutes
    if (this.cache) {
      await this.cache.set(cacheKey, summary, 300);
    }

    return summary;
  }

  /**
   * Get cost trend over time for dashboard charts.
   */
  async getCostTrend(
    tenantId: string,
    period: { start: string; end: string },
    granularity: TimeGranularity = 'day'
  ): Promise<CostTrendPoint[]> {
    const records = await this.repository.queryCosts({
      tenantId,
      startDate: period.start,
      endDate: period.end,
    });

    // Group by time bucket
    const buckets: Map<string, { cost: number; requests: number }> = new Map();

    for (const record of records) {
      const bucketKey = this.getBucketKey(record.timestamp, granularity);
      const existing = buckets.get(bucketKey) ?? { cost: 0, requests: 0 };
      existing.cost += record.costUsd;
      existing.requests += 1;
      buckets.set(bucketKey, existing);
    }

    return Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        costUsd: Number(data.cost.toFixed(4)),
        requests: data.requests,
        avgCostPerRequest: data.requests > 0
          ? Number((data.cost / data.requests).toFixed(6))
          : 0,
      }))
      .sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /**
   * Get real-time spend for a tenant (today and this month).
   */
  async getCurrentSpend(tenantId: string): Promise<{
    todayUsd: number;
    monthUsd: number;
    dailyBudget?: number;
    monthlyBudget?: number;
    dailyPercentUsed: number;
    monthlyPercentUsed: number;
  }> {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);

    const todayKey = `${tenantId}:${today}`;
    const monthKey = `${tenantId}:${month}`;

    // Use accumulator for fast lookup, fall back to DB
    let todayUsd = this.dailySpendAccumulator.get(todayKey) ?? 0;
    let monthUsd = this.monthlySpendAccumulator.get(monthKey) ?? 0;

    if (todayUsd === 0) {
      todayUsd = await this.repository.getDailySpend(tenantId, today);
      this.dailySpendAccumulator.set(todayKey, todayUsd);
    }
    if (monthUsd === 0) {
      monthUsd = await this.repository.getMonthlySpend(tenantId, month);
      this.monthlySpendAccumulator.set(monthKey, monthUsd);
    }

    const budget = this.budgets.get(tenantId);

    return {
      todayUsd,
      monthUsd,
      dailyBudget: budget?.dailyLimitUsd,
      monthlyBudget: budget?.monthlyLimitUsd,
      dailyPercentUsed: budget
        ? (todayUsd / budget.dailyLimitUsd) * 100
        : 0,
      monthlyPercentUsed: budget
        ? (monthUsd / budget.monthlyLimitUsd) * 100
        : 0,
    };
  }

  /**
   * Get top cost drivers for a tenant — which capabilities/models
   * are consuming the most budget.
   */
  async getTopCostDrivers(
    tenantId: string,
    month?: string
  ): Promise<Array<{
    driver: string;
    category: 'capability' | 'model' | 'provider';
    costUsd: number;
    percentage: number;
    requestCount: number;
  }>> {
    const targetMonth = month ?? new Date().toISOString().substring(0, 7);
    const startDate = `${targetMonth}-01`;
    const endDate = `${targetMonth}-31`;

    const summary = await this.getCostSummary(tenantId, {
      start: startDate,
      end: endDate,
    });

    const drivers: Array<{
      driver: string;
      category: 'capability' | 'model' | 'provider';
      costUsd: number;
      percentage: number;
      requestCount: number;
    }> = [];

    const total = summary.totalCostUsd || 1; // Avoid division by zero

    for (const [cap, data] of Object.entries(summary.byCapability)) {
      drivers.push({
        driver: cap,
        category: 'capability',
        costUsd: data.costUsd,
        percentage: (data.costUsd / total) * 100,
        requestCount: data.requests,
      });
    }

    for (const [model, data] of Object.entries(summary.byModel)) {
      drivers.push({
        driver: model,
        category: 'model',
        costUsd: data.costUsd,
        percentage: (data.costUsd / total) * 100,
        requestCount: data.requests,
      });
    }

    return drivers.sort((a, b) => b.costUsd - a.costUsd);
  }

  // --- Private helpers ---

  private async checkBudget(
    tenantId: string,
    budget: BudgetConfig,
    capability: string
  ): Promise<{ allowed: boolean; warning?: BudgetAlert }> {
    const today = new Date().toISOString().split('T')[0];
    const month = new Date().toISOString().substring(0, 7);

    const dailySpend = this.dailySpendAccumulator.get(`${tenantId}:${today}`) ?? 0;
    const monthlySpend = this.monthlySpendAccumulator.get(`${tenantId}:${month}`) ?? 0;

    // Check daily limit
    if (dailySpend >= budget.dailyLimitUsd) {
      const alert: BudgetAlert = {
        tenantId,
        alertType: 'daily_limit',
        threshold: 1.0,
        currentSpend: dailySpend,
        limitUsd: budget.dailyLimitUsd,
        percentUsed: 100,
        timestamp: new Date().toISOString(),
      };
      await this.emitAlert(alert);

      if (budget.hardLimitAction === 'block') {
        return { allowed: false, warning: alert };
      }
      return { allowed: true, warning: alert };
    }

    // Check monthly limit
    if (monthlySpend >= budget.monthlyLimitUsd) {
      const alert: BudgetAlert = {
        tenantId,
        alertType: 'monthly_limit',
        threshold: 1.0,
        currentSpend: monthlySpend,
        limitUsd: budget.monthlyLimitUsd,
        percentUsed: 100,
        timestamp: new Date().toISOString(),
      };
      await this.emitAlert(alert);

      if (budget.hardLimitAction === 'block') {
        return { allowed: false, warning: alert };
      }
      return { allowed: true, warning: alert };
    }

    // Check per-capability limits
    if (budget.perCapabilityLimits && budget.perCapabilityLimits[capability]) {
      const capSpend = await this.repository.getCapabilitySpend(tenantId, capability, month);
      const capLimit = budget.perCapabilityLimits[capability];
      if (capSpend >= capLimit) {
        const alert: BudgetAlert = {
          tenantId,
          alertType: 'capability_limit',
          threshold: 1.0,
          currentSpend: capSpend,
          limitUsd: capLimit,
          percentUsed: 100,
          capability,
          timestamp: new Date().toISOString(),
        };
        await this.emitAlert(alert);
        return { allowed: budget.hardLimitAction !== 'block', warning: alert };
      }
    }

    // Check threshold alerts (monthly)
    const monthlyPercent = monthlySpend / budget.monthlyLimitUsd;
    for (const threshold of budget.alertThresholds) {
      if (monthlyPercent >= threshold && monthlyPercent < threshold + 0.05) {
        // Only alert once per threshold (within 5% window)
        const alert: BudgetAlert = {
          tenantId,
          alertType: 'threshold',
          threshold,
          currentSpend: monthlySpend,
          limitUsd: budget.monthlyLimitUsd,
          percentUsed: monthlyPercent * 100,
          timestamp: new Date().toISOString(),
        };
        await this.emitAlert(alert);
        return { allowed: true, warning: alert };
      }
    }

    return { allowed: true };
  }

  private async emitAlert(alert: BudgetAlert): Promise<void> {
    this.logger.warn('AI budget alert', {
      tenantId: alert.tenantId,
      alertType: alert.alertType,
      percentUsed: alert.percentUsed.toFixed(1),
      currentSpend: alert.currentSpend.toFixed(4),
      limitUsd: alert.limitUsd,
    });

    if (this.eventPublisher) {
      await this.eventPublisher.publish('ai.budget.alert', alert);
    }
  }

  private getBucketKey(timestamp: string, granularity: TimeGranularity): string {
    const date = new Date(timestamp);
    switch (granularity) {
      case 'hour':
        return date.toISOString().substring(0, 13) + ':00:00Z';
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week': {
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        return weekStart.toISOString().split('T')[0];
      }
      case 'month':
        return date.toISOString().substring(0, 7);
    }
  }
}

// ---------------------------------------------------------------------------
// Section 3: Provider Fallback Chain (AI-011)
// ---------------------------------------------------------------------------

/** Circuit breaker states — mirrors Sprint 1's ProviderRegistry */
export type CircuitState = 'closed' | 'open' | 'half_open';

/** Provider health record */
export interface ProviderHealth {
  providerId: string;
  circuitState: CircuitState;
  failureCount: number;
  successCount: number;
  lastFailureTime?: string;
  lastSuccessTime?: string;
  averageLatencyMs: number;
  errorRate: number; // 0.0–1.0
}

/** Fallback chain configuration */
export interface FallbackChainConfig {
  /** Primary provider for each capability */
  primaryProviders: Record<string, string>;
  /** Ordered fallback chain per capability */
  fallbackChains: Record<string, string[]>;
  /** Circuit breaker thresholds */
  circuitBreaker: {
    failureThreshold: number;     // Failures before opening circuit
    resetTimeoutMs: number;       // Time before half-open attempt
    halfOpenMaxRequests: number;  // Requests allowed in half-open state
  };
  /** Maximum retry attempts across the entire chain */
  maxChainRetries: number;
  /** Timeout per provider attempt (ms) */
  perProviderTimeoutMs: number;
}

export const DEFAULT_FALLBACK_CONFIG: FallbackChainConfig = {
  primaryProviders: {
    text_completion: 'claude',
    assessment: 'claude',
    vision: 'openai',
    embedding: 'gemini',       // Cheapest embeddings
    structured_output: 'claude',
    image_generation: 'openai',
    safety: 'claude',
    speech_recognition: 'openai',
  },
  fallbackChains: {
    text_completion: ['claude', 'openai', 'gemini'],
    assessment: ['claude', 'openai', 'gemini'],
    vision: ['openai', 'claude', 'gemini'],
    embedding: ['gemini', 'openai'],
    structured_output: ['claude', 'openai', 'gemini'],
    image_generation: ['openai', 'stable_diffusion'],
    safety: ['claude', 'openai'],
    speech_recognition: ['openai'],
  },
  circuitBreaker: {
    failureThreshold: 5,
    resetTimeoutMs: 30_000,
    halfOpenMaxRequests: 2,
  },
  maxChainRetries: 3,
  perProviderTimeoutMs: 30_000,
};

/** Represents a callable AI provider */
export interface IFallbackProvider {
  readonly providerId: string;
  execute<T>(request: unknown): Promise<T>;
  supports(capability: string): boolean;
}

/**
 * Manages automatic failover between AI providers when the primary
 * is degraded or unavailable. Uses circuit breakers to avoid hammering
 * a failing provider, and routes to the next healthy provider in the
 * fallback chain.
 *
 * Think of it like a power grid's backup system: if the primary generator
 * fails, the system instantly switches to the next available generator
 * without the customer experiencing a blackout. The failed generator
 * is taken offline (circuit open), periodically tested (half-open),
 * and restored when healthy (circuit closed).
 */
export class ProviderFallbackChain {
  private readonly config: FallbackChainConfig;
  private readonly providers: Map<string, IFallbackProvider> = new Map();
  private readonly healthRecords: Map<string, ProviderHealth> = new Map();
  private readonly halfOpenRequests: Map<string, number> = new Map();
  private readonly logger: ILogger;
  private readonly costTracker?: AICostTracker;

  constructor(config: FallbackChainConfig, logger: ILogger, costTracker?: AICostTracker) {
    this.config = config;
    this.logger = logger;
    this.costTracker = costTracker;
  }

  /**
   * Register a provider in the fallback chain.
   */
  registerProvider(provider: IFallbackProvider): void {
    this.providers.set(provider.providerId, provider);
    this.healthRecords.set(provider.providerId, {
      providerId: provider.providerId,
      circuitState: 'closed',
      failureCount: 0,
      successCount: 0,
      averageLatencyMs: 0,
      errorRate: 0,
    });
    this.logger.info('Provider registered in fallback chain', {
      providerId: provider.providerId,
    });
  }

  /**
   * Execute a request through the fallback chain. Tries providers in
   * order until one succeeds or all have been exhausted.
   */
  async execute<T>(
    capability: string,
    request: unknown,
    options?: { preferredProvider?: string; tenantId?: string }
  ): Promise<{ result: T; providerId: string; latencyMs: number; wasFallback: boolean }> {
    // Build the provider chain for this capability
    const chain = this.buildChain(capability, options?.preferredProvider);

    if (chain.length === 0) {
      throw new Error(`No providers available for capability: ${capability}`);
    }

    let lastError: Error | null = null;

    for (let i = 0; i < Math.min(chain.length, this.config.maxChainRetries); i++) {
      const providerId = chain[i];
      const provider = this.providers.get(providerId);
      const health = this.healthRecords.get(providerId);

      if (!provider || !health) continue;

      // Check circuit breaker state
      if (!this.isProviderAvailable(providerId)) {
        this.logger.debug('Provider circuit open, skipping', { providerId, capability });
        continue;
      }

      // Track half-open requests
      if (health.circuitState === 'half_open') {
        const currentHalfOpen = this.halfOpenRequests.get(providerId) ?? 0;
        if (currentHalfOpen >= this.config.circuitBreaker.halfOpenMaxRequests) {
          continue;
        }
        this.halfOpenRequests.set(providerId, currentHalfOpen + 1);
      }

      const startTime = Date.now();

      try {
        // Execute with timeout
        const result = await this.executeWithTimeout<T>(
          provider,
          request,
          this.config.perProviderTimeoutMs
        );

        const latencyMs = Date.now() - startTime;

        // Record success
        this.recordSuccess(providerId, latencyMs);

        return {
          result,
          providerId,
          latencyMs,
          wasFallback: i > 0,
        };
      } catch (error) {
        const latencyMs = Date.now() - startTime;
        lastError = error instanceof Error ? error : new Error(String(error));

        this.logger.warn('Provider failed, trying next in chain', {
          providerId,
          capability,
          error: lastError.message,
          latencyMs,
          remainingProviders: chain.length - i - 1,
        });

        // Record failure
        this.recordFailure(providerId);
      }
    }

    throw new Error(
      `All providers failed for capability "${capability}". ` +
      `Chain: [${chain.join(' → ')}]. Last error: ${lastError?.message}`
    );
  }

  /**
   * Get the health status of all providers.
   */
  getHealthStatus(): ProviderHealth[] {
    return Array.from(this.healthRecords.values());
  }

  /**
   * Get the health status of a specific provider.
   */
  getProviderHealth(providerId: string): ProviderHealth | undefined {
    return this.healthRecords.get(providerId);
  }

  /**
   * Manually reset a provider's circuit breaker (e.g., after fixing an issue).
   */
  resetCircuit(providerId: string): void {
    const health = this.healthRecords.get(providerId);
    if (health) {
      health.circuitState = 'closed';
      health.failureCount = 0;
      health.errorRate = 0;
      this.halfOpenRequests.set(providerId, 0);
      this.logger.info('Circuit breaker manually reset', { providerId });
    }
  }

  /**
   * Get the current fallback chain for a capability (respecting circuit states).
   */
  getActiveChain(capability: string): string[] {
    return this.buildChain(capability).filter(id => this.isProviderAvailable(id));
  }

  // --- Private helpers ---

  private buildChain(capability: string, preferredProvider?: string): string[] {
    const configured = this.config.fallbackChains[capability] ?? [];

    if (preferredProvider && !configured.includes(preferredProvider)) {
      return [preferredProvider, ...configured];
    }

    if (preferredProvider) {
      // Move preferred to front
      const reordered = [preferredProvider, ...configured.filter(id => id !== preferredProvider)];
      return reordered;
    }

    return [...configured];
  }

  private isProviderAvailable(providerId: string): boolean {
    const health = this.healthRecords.get(providerId);
    if (!health) return false;

    if (health.circuitState === 'closed') return true;

    if (health.circuitState === 'open') {
      // Check if reset timeout has elapsed
      if (health.lastFailureTime) {
        const elapsed = Date.now() - new Date(health.lastFailureTime).getTime();
        if (elapsed >= this.config.circuitBreaker.resetTimeoutMs) {
          // Transition to half-open
          health.circuitState = 'half_open';
          this.halfOpenRequests.set(providerId, 0);
          this.logger.info('Circuit breaker transitioning to half-open', { providerId });
          return true;
        }
      }
      return false;
    }

    // half_open — allow limited requests
    return true;
  }

  private recordSuccess(providerId: string, latencyMs: number): void {
    const health = this.healthRecords.get(providerId);
    if (!health) return;

    health.successCount++;
    health.lastSuccessTime = new Date().toISOString();

    // Update running average latency
    const totalRequests = health.successCount + health.failureCount;
    health.averageLatencyMs = (
      (health.averageLatencyMs * (totalRequests - 1)) + latencyMs
    ) / totalRequests;

    // Update error rate (sliding window approximation)
    health.errorRate = health.failureCount / totalRequests;

    // If half-open and succeeding, close the circuit
    if (health.circuitState === 'half_open') {
      health.circuitState = 'closed';
      health.failureCount = 0;
      this.halfOpenRequests.set(providerId, 0);
      this.logger.info('Circuit breaker closed after recovery', { providerId });
    }
  }

  private recordFailure(providerId: string): void {
    const health = this.healthRecords.get(providerId);
    if (!health) return;

    health.failureCount++;
    health.lastFailureTime = new Date().toISOString();

    const totalRequests = health.successCount + health.failureCount;
    health.errorRate = health.failureCount / totalRequests;

    // If half-open and failing, re-open the circuit
    if (health.circuitState === 'half_open') {
      health.circuitState = 'open';
      this.logger.warn('Circuit breaker re-opened after half-open failure', { providerId });
      return;
    }

    // Check if failure threshold exceeded
    if (health.failureCount >= this.config.circuitBreaker.failureThreshold) {
      health.circuitState = 'open';
      this.logger.warn('Circuit breaker opened', {
        providerId,
        failureCount: health.failureCount,
        threshold: this.config.circuitBreaker.failureThreshold,
      });
    }
  }

  private async executeWithTimeout<T>(
    provider: IFallbackProvider,
    request: unknown,
    timeoutMs: number
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Provider ${provider.providerId} timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      provider.execute<T>(request)
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

// ---------------------------------------------------------------------------
// Section 4: In-Memory Cost Repository (for testing / single-instance)
// ---------------------------------------------------------------------------

/**
 * Simple in-memory implementation of ICostRepository.
 * Production deployments should use the Prisma-based repository.
 */
export class InMemoryCostRepository implements ICostRepository {
  private records: AICostRecord[] = [];

  async recordCost(record: AICostRecord): Promise<void> {
    this.records.push(record);
  }

  async queryCosts(filter: CostQueryFilter): Promise<AICostRecord[]> {
    let filtered = [...this.records];

    if (filter.tenantId) filtered = filtered.filter(r => r.tenantId === filter.tenantId);
    if (filter.provider) filtered = filtered.filter(r => r.provider === filter.provider);
    if (filter.capability) filtered = filtered.filter(r => r.capability === filter.capability);
    if (filter.model) filtered = filtered.filter(r => r.model === filter.model);
    if (filter.startDate) filtered = filtered.filter(r => r.timestamp >= filter.startDate!);
    if (filter.endDate) filtered = filtered.filter(r => r.timestamp <= filter.endDate!);
    if (filter.limit) filtered = filtered.slice(0, filter.limit);

    return filtered;
  }

  async getAggregate(
    tenantId: string,
    period: { start: string; end: string },
    _groupBy: string[]
  ): Promise<CostSummary> {
    const records = await this.queryCosts({
      tenantId,
      startDate: period.start,
      endDate: period.end,
    });

    const byProvider: CostSummary['byProvider'] = {};
    const byCapability: CostSummary['byCapability'] = {};
    const byModel: CostSummary['byModel'] = {};
    let totalCost = 0;
    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    let cacheSavings = 0;

    for (const r of records) {
      totalCost += r.costUsd;
      totalInputTokens += r.inputTokens;
      totalOutputTokens += r.outputTokens;
      if (r.cached) cacheSavings += r.costUsd;

      if (!byProvider[r.provider]) byProvider[r.provider] = { costUsd: 0, requests: 0, avgLatencyMs: 0 };
      byProvider[r.provider].costUsd += r.costUsd;
      byProvider[r.provider].requests += 1;
      byProvider[r.provider].avgLatencyMs = (byProvider[r.provider].avgLatencyMs + r.latencyMs) / 2;

      if (!byCapability[r.capability]) byCapability[r.capability] = { costUsd: 0, requests: 0 };
      byCapability[r.capability].costUsd += r.costUsd;
      byCapability[r.capability].requests += 1;

      if (!byModel[r.model]) byModel[r.model] = { costUsd: 0, requests: 0, inputTokens: 0, outputTokens: 0 };
      byModel[r.model].costUsd += r.costUsd;
      byModel[r.model].requests += 1;
      byModel[r.model].inputTokens += r.inputTokens;
      byModel[r.model].outputTokens += r.outputTokens;
    }

    return {
      tenantId,
      period: { start: period.start, end: period.end, granularity: 'day' },
      totalCostUsd: totalCost,
      totalRequests: records.length,
      totalInputTokens,
      totalOutputTokens,
      cacheSavingsUsd: cacheSavings,
      byProvider,
      byCapability,
      byModel,
    };
  }

  async getDailySpend(tenantId: string, date: string): Promise<number> {
    return this.records
      .filter(r => r.tenantId === tenantId && r.timestamp.startsWith(date))
      .reduce((sum, r) => sum + r.costUsd, 0);
  }

  async getMonthlySpend(tenantId: string, month: string): Promise<number> {
    return this.records
      .filter(r => r.tenantId === tenantId && r.timestamp.startsWith(month))
      .reduce((sum, r) => sum + r.costUsd, 0);
  }

  async getCapabilitySpend(tenantId: string, capability: string, month: string): Promise<number> {
    return this.records
      .filter(r => r.tenantId === tenantId && r.capability === capability && r.timestamp.startsWith(month))
      .reduce((sum, r) => sum + r.costUsd, 0);
  }
}
