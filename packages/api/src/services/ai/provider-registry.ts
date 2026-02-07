/**
 * Scholarly Platform — AI Provider Registry & Routing Engine
 * ===========================================================
 *
 * AI-002 / AI-003: If the capability interfaces are the job descriptions,
 * then the ProviderRegistry is the employee roster and the RoutingEngine
 * is the dispatcher who assigns work to the right person.
 *
 * The ProviderRegistry maintains a live map of all configured AI providers,
 * their capabilities, their health status, and their cost profiles. The
 * RoutingEngine uses this registry to make intelligent routing decisions
 * for every AI request.
 *
 * ## Routing Strategy
 *
 * Requests are routed using a priority-based selection algorithm:
 *
 * 1. **Capability filter**: Only providers that implement the requested
 *    capability are considered.
 *
 * 2. **Tier filter**: The request's cost tier (critical/standard/economy)
 *    maps to a set of eligible providers. Critical requests go to premium
 *    providers; economy requests go to self-hosted models.
 *
 * 3. **Health filter**: Unhealthy providers are excluded. A provider is
 *    marked unhealthy after consecutive failures, with automatic recovery
 *    checks using an exponential backoff circuit breaker.
 *
 * 4. **Priority selection**: Among eligible providers, the one with the
 *    highest priority (lowest priority number) is selected.
 *
 * 5. **Fallback cascade**: If the primary provider fails, the request
 *    cascades to the next eligible provider. This continues until the
 *    request succeeds or all providers are exhausted.
 *
 * @module ai-abstraction/provider-registry
 * @version 1.0.0
 */

import { Logger } from 'pino';
import {
  ProviderId,
  CostTier,
  CapabilityName,
  CapabilityProviderMap,
  AIResult,
  AIUsageMetadata,
  AIRequestOptions,
} from './capability-interfaces';
import { Cache } from '../infrastructure/redis-cache';
import { logAIOperation, AIOperationLogEntry } from '../infrastructure/logger';

// ============================================================================
// SECTION 1: PROVIDER REGISTRATION
// ============================================================================

/**
 * A registered provider with its metadata, health status, and cost profile.
 */
export interface RegisteredProvider {
  /** The unique provider identifier. */
  id: ProviderId;
  /** Human-readable name. */
  displayName: string;
  /** Which capabilities this provider implements. */
  capabilities: CapabilityName[];
  /** The actual provider implementation (typed at retrieval time). */
  instance: unknown;
  /** Priority per capability (lower = higher priority). */
  priorities: Partial<Record<CapabilityName, number>>;
  /** Which cost tiers this provider is eligible for. */
  eligibleTiers: CostTier[];
  /** Health status. */
  health: ProviderHealth;
  /** Cost per 1K tokens (input/output) for budget tracking. */
  costPer1kTokens: {
    input: number;
    output: number;
  };
  /** Whether this provider is enabled. */
  enabled: boolean;
}

export interface ProviderHealth {
  healthy: boolean;
  lastCheckAt: Date;
  consecutiveFailures: number;
  lastFailureAt?: Date;
  lastSuccessAt?: Date;
  /** Circuit breaker state. */
  circuitState: 'closed' | 'open' | 'half-open';
  /** When the circuit will transition from open to half-open. */
  circuitResetAt?: Date;
  /** Latency percentiles in ms. */
  latencyP50Ms?: number;
  latencyP95Ms?: number;
  latencyP99Ms?: number;
}

// ============================================================================
// SECTION 2: PROVIDER REGISTRY
// ============================================================================

export class ProviderRegistry {
  private providers = new Map<ProviderId, RegisteredProvider>();
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger.child({ module: 'ProviderRegistry' });
  }

  /**
   * Registers an AI provider with the registry.
   */
  register(config: {
    id: ProviderId;
    displayName: string;
    capabilities: CapabilityName[];
    instance: unknown;
    priorities?: Partial<Record<CapabilityName, number>>;
    eligibleTiers?: CostTier[];
    costPer1kTokens?: { input: number; output: number };
    enabled?: boolean;
  }): void {
    const provider: RegisteredProvider = {
      id: config.id,
      displayName: config.displayName,
      capabilities: config.capabilities,
      instance: config.instance,
      priorities: config.priorities ?? {},
      eligibleTiers: config.eligibleTiers ?? ['critical', 'standard', 'economy'],
      health: {
        healthy: true,
        lastCheckAt: new Date(),
        consecutiveFailures: 0,
        circuitState: 'closed',
      },
      costPer1kTokens: config.costPer1kTokens ?? { input: 0, output: 0 },
      enabled: config.enabled ?? true,
    };

    this.providers.set(config.id, provider);
    this.logger.info({
      providerId: config.id,
      capabilities: config.capabilities,
      tiers: provider.eligibleTiers,
    }, `Registered AI provider: ${config.displayName}`);
  }

  /**
   * Deregisters a provider.
   */
  deregister(id: ProviderId): void {
    this.providers.delete(id);
    this.logger.info({ providerId: id }, 'Deregistered AI provider');
  }

  /**
   * Gets a specific provider by ID.
   */
  getProvider(id: ProviderId): RegisteredProvider | undefined {
    return this.providers.get(id);
  }

  /**
   * Gets all providers that implement a given capability,
   * optionally filtered by cost tier and health status.
   */
  getProvidersForCapability(
    capability: CapabilityName,
    options?: { tier?: CostTier; healthyOnly?: boolean },
  ): RegisteredProvider[] {
    const { tier, healthyOnly = true } = options ?? {};

    return Array.from(this.providers.values())
      .filter((p) => p.enabled)
      .filter((p) => p.capabilities.includes(capability))
      .filter((p) => !tier || p.eligibleTiers.includes(tier))
      .filter((p) => !healthyOnly || this.isProviderAvailable(p))
      .sort((a, b) => {
        const aPriority = a.priorities[capability] ?? 100;
        const bPriority = b.priorities[capability] ?? 100;
        return aPriority - bPriority;
      });
  }

  /**
   * Records a successful operation for health tracking.
   */
  recordSuccess(id: ProviderId, durationMs: number): void {
    const provider = this.providers.get(id);
    if (!provider) return;

    provider.health.healthy = true;
    provider.health.consecutiveFailures = 0;
    provider.health.lastSuccessAt = new Date();
    provider.health.lastCheckAt = new Date();
    provider.health.circuitState = 'closed';

    // Update latency tracking (simple exponential moving average)
    if (provider.health.latencyP50Ms === undefined) {
      provider.health.latencyP50Ms = durationMs;
      provider.health.latencyP95Ms = durationMs;
      provider.health.latencyP99Ms = durationMs;
    } else {
      const alpha = 0.1;
      provider.health.latencyP50Ms = provider.health.latencyP50Ms * (1 - alpha) + durationMs * alpha;
    }
  }

  /**
   * Records a failed operation for health tracking.
   * Implements circuit breaker pattern.
   */
  recordFailure(id: ProviderId, error: Error): void {
    const provider = this.providers.get(id);
    if (!provider) return;

    provider.health.consecutiveFailures += 1;
    provider.health.lastFailureAt = new Date();
    provider.health.lastCheckAt = new Date();

    // Circuit breaker thresholds
    const OPEN_THRESHOLD = 5; // Open circuit after 5 consecutive failures
    const RESET_DELAY_MS = 30_000; // Try again after 30 seconds

    if (provider.health.consecutiveFailures >= OPEN_THRESHOLD) {
      provider.health.healthy = false;
      provider.health.circuitState = 'open';
      provider.health.circuitResetAt = new Date(Date.now() + RESET_DELAY_MS);

      this.logger.warn({
        providerId: id,
        consecutiveFailures: provider.health.consecutiveFailures,
        resetAt: provider.health.circuitResetAt,
      }, `Circuit opened for provider ${provider.displayName}`);
    }
  }

  /**
   * Checks if a provider is available (healthy or circuit in half-open state).
   */
  private isProviderAvailable(provider: RegisteredProvider): boolean {
    if (provider.health.circuitState === 'closed') return true;

    if (provider.health.circuitState === 'open' && provider.health.circuitResetAt) {
      if (new Date() >= provider.health.circuitResetAt) {
        // Transition to half-open: allow one request through
        provider.health.circuitState = 'half-open';
        return true;
      }
      return false;
    }

    return provider.health.circuitState === 'half-open';
  }

  /**
   * Returns a summary of all providers for monitoring dashboards.
   */
  getStatus(): Array<{
    id: ProviderId;
    name: string;
    capabilities: CapabilityName[];
    healthy: boolean;
    circuitState: string;
    consecutiveFailures: number;
    latencyP50Ms?: number;
    enabled: boolean;
  }> {
    return Array.from(this.providers.values()).map((p) => ({
      id: p.id,
      name: p.displayName,
      capabilities: p.capabilities,
      healthy: p.health.healthy,
      circuitState: p.health.circuitState,
      consecutiveFailures: p.health.consecutiveFailures,
      latencyP50Ms: p.health.latencyP50Ms,
      enabled: p.enabled,
    }));
  }
}

// ============================================================================
// SECTION 3: ROUTING ENGINE
// ============================================================================

export interface RoutingEngineConfig {
  logger: Logger;
  cache: Cache;
  registry: ProviderRegistry;
  /** Default cost tier when not specified in the request. */
  defaultTier: CostTier;
  /** Maximum number of fallback attempts. */
  maxFallbackAttempts: number;
}

/**
 * The RoutingEngine is the dispatcher that assigns AI work to the right
 * provider. It implements the priority-based selection with fallback
 * cascade, caching, and cost tracking.
 */
export class RoutingEngine {
  private readonly config: RoutingEngineConfig;
  private readonly logger: Logger;

  constructor(config: RoutingEngineConfig) {
    this.config = config;
    this.logger = config.logger.child({ module: 'RoutingEngine' });
  }

  /**
   * Routes a request to the best available provider for the given capability.
   *
   * @param capability - The capability needed (e.g., 'text-completion')
   * @param operation - The operation name for logging (e.g., 'complete')
   * @param request - The request options (includes tier, preferred provider)
   * @param execute - A function that calls the provider with the given instance
   * @returns The result from the first successful provider
   */
  async route<C extends CapabilityName, R>(
    capability: C,
    operation: string,
    request: AIRequestOptions,
    execute: (provider: CapabilityProviderMap[C]) => Promise<AIResult<R>>,
  ): Promise<AIResult<R>> {
    const tier = request.tier ?? this.config.defaultTier;
    const { registry, cache } = this.config;

    // Step 1: Check cache
    if (request.cacheKey) {
      const cached = await cache.get<AIResult<R>>(request.cacheKey);
      if (cached) {
        this.logger.debug({ cacheKey: request.cacheKey, capability }, 'AI response served from cache');
        cached.usage.cached = true;
        return cached;
      }
    }

    // Step 2: Get eligible providers
    let providers: RegisteredProvider[];

    if (request.preferredProvider) {
      const preferred = registry.getProvider(request.preferredProvider);
      if (preferred && preferred.capabilities.includes(capability) && preferred.enabled) {
        providers = [preferred];
      } else {
        providers = registry.getProvidersForCapability(capability, { tier, healthyOnly: true });
      }
    } else {
      providers = registry.getProvidersForCapability(capability, { tier, healthyOnly: true });
    }

    if (providers.length === 0) {
      this.logger.error({ capability, tier }, 'No eligible providers available');
      return {
        success: false,
        error: {
          code: 'NO_PROVIDER_AVAILABLE',
          message: `No healthy provider available for capability '${capability}' at tier '${tier}'`,
          retryable: true,
        },
        usage: this.emptyUsage(tier),
      };
    }

    // Step 3: Try providers in priority order with fallback cascade
    const maxAttempts = Math.min(providers.length, this.config.maxFallbackAttempts);
    let lastError: AIResult<R> | undefined;

    for (let i = 0; i < maxAttempts; i++) {
      const provider = providers[i];
      const startTime = Date.now();

      try {
        this.logger.debug({
          capability,
          operation,
          providerId: provider.id,
          tier,
          attempt: i + 1,
        }, 'Routing AI request');

        const result = await execute(provider.instance as CapabilityProviderMap[C]);
        const durationMs = Date.now() - startTime;

        // Record success
        registry.recordSuccess(provider.id, durationMs);

        // Log operation
        logAIOperation(this.logger, {
          provider: provider.id,
          model: result.usage?.model ?? 'unknown',
          operation: capability as AIOperationLogEntry['operation'],
          tenantId: request.tenantId,
          userId: request.userId,
          inputTokens: result.usage?.inputTokens ?? 0,
          outputTokens: result.usage?.outputTokens ?? 0,
          costUsd: result.usage?.costUsd ?? 0,
          durationMs,
          cached: false,
          tier,
          success: result.success,
        });

        if (result.success) {
          // Cache successful responses
          if (request.cacheKey && request.cacheTtlSeconds) {
            await cache.set(request.cacheKey, result, request.cacheTtlSeconds);
          }
          return result;
        }

        // Provider returned a logical error (not a transport error)
        if (result.error && !result.error.retryable) {
          return result;
        }

        lastError = result;
      } catch (err) {
        const durationMs = Date.now() - startTime;

        // Record failure (transport/connection error)
        registry.recordFailure(provider.id, err as Error);

        this.logger.warn({
          err,
          capability,
          providerId: provider.id,
          attempt: i + 1,
          durationMs,
        }, `Provider ${provider.displayName} failed, trying next...`);

        lastError = {
          success: false,
          error: {
            code: 'PROVIDER_ERROR',
            message: (err as Error).message,
            provider: provider.id,
            retryable: true,
          },
          usage: {
            provider: provider.id,
            model: 'unknown',
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            costUsd: 0,
            durationMs,
            cached: false,
            tier,
          },
        };
      }
    }

    // All providers exhausted
    this.logger.error({
      capability,
      tier,
      attempts: maxAttempts,
    }, 'All providers exhausted for request');

    return lastError ?? {
      success: false,
      error: {
        code: 'ALL_PROVIDERS_FAILED',
        message: `All ${maxAttempts} provider(s) failed for capability '${capability}'`,
        retryable: true,
      },
      usage: this.emptyUsage(tier),
    };
  }

  private emptyUsage(tier: CostTier): AIUsageMetadata {
    return {
      provider: 'anthropic',
      model: 'none',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      costUsd: 0,
      durationMs: 0,
      cached: false,
      tier,
    };
  }
}

// ============================================================================
// SECTION 4: AI SERVICE FACADE
// ============================================================================

/**
 * The AIService is the high-level facade that application services use.
 * It provides clean, capability-specific methods that hide the routing,
 * caching, and fallback complexity behind a simple interface.
 *
 * Usage:
 *   const result = await aiService.complete({
 *     systemPrompt: 'You are a phonics tutor...',
 *     userPrompt: 'Generate a story about a fox...',
 *     tenantId: 'tenant_123',
 *     tier: 'standard',
 *   });
 */
export class AIService {
  private readonly engine: RoutingEngine;

  constructor(engine: RoutingEngine) {
    this.engine = engine;
  }

  async complete(request: import('./capability-interfaces').TextCompletionRequest) {
    return this.engine.route('text-completion', 'complete', request, (provider) =>
      (provider as import('./capability-interfaces').ITextCompletionProvider).complete(request),
    );
  }

  async assess(request: import('./capability-interfaces').AssessmentRequest) {
    return this.engine.route('assessment', 'assess', request, (provider) =>
      (provider as import('./capability-interfaces').IAssessmentProvider).assess(request),
    );
  }

  async checkSafety(request: import('./capability-interfaces').ContentSafetyRequest) {
    return this.engine.route('content-safety', 'checkSafety', request, (provider) =>
      (provider as import('./capability-interfaces').IContentSafetyProvider).checkSafety(request),
    );
  }

  async analyzeImage(request: import('./capability-interfaces').VisionRequest) {
    return this.engine.route('vision', 'analyzeImage', request, (provider) =>
      (provider as import('./capability-interfaces').IVisionProvider).analyzeImage(request),
    );
  }

  async embed(request: import('./capability-interfaces').EmbeddingRequest) {
    return this.engine.route('embedding', 'embed', request, (provider) =>
      (provider as import('./capability-interfaces').IEmbeddingProvider).embed(request),
    );
  }

  async transcribe(request: import('./capability-interfaces').TranscriptionRequest) {
    return this.engine.route('speech', 'transcribe', request, (provider) =>
      (provider as import('./capability-interfaces').ISpeechProvider).transcribe(request),
    );
  }

  async synthesizeSpeech(request: import('./capability-interfaces').TextToSpeechRequest) {
    return this.engine.route('speech', 'synthesize', request, (provider) =>
      (provider as import('./capability-interfaces').ISpeechProvider).synthesize(request),
    );
  }

  async translate(request: import('./capability-interfaces').TranslationRequest) {
    return this.engine.route('translation', 'translate', request, (provider) =>
      (provider as import('./capability-interfaces').ITranslationProvider).translate(request),
    );
  }

  async generateStructured(request: import('./capability-interfaces').StructuredOutputRequest) {
    return this.engine.route('structured-output', 'generate', request, (provider) =>
      (provider as import('./capability-interfaces').IStructuredOutputProvider).generate(request),
    );
  }

  async generateImage(request: import('./capability-interfaces').ImageGenerationRequest) {
    return this.engine.route('image-generation', 'generate', request, (provider) =>
      (provider as import('./capability-interfaces').IImageGenerationProvider).generate(request),
    );
  }
}
