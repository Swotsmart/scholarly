/**
 * Scholarly Platform — Observability Layer
 * =========================================
 *
 * REM-011: Prometheus metrics collection
 * REM-012: Sentry error tracking integration
 *
 * Prometheus is the sensory network — measuring vital signs. Sentry is
 * the pain receptor — firing when something goes wrong with full context.
 *
 * @module infrastructure/observability
 * @version 1.0.0
 */

import { Logger } from 'pino';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

export type MetricType = 'counter' | 'histogram' | 'gauge';
export type Labels = Record<string, string>;
export type SentrySeverity = 'fatal' | 'error' | 'warning' | 'info' | 'debug';

export interface MetricDefinition {
  name: string;
  help: string;
  type: MetricType;
  labelNames: string[];
  buckets?: number[];
}

export interface SentryConfig {
  dsn: string;
  environment: string;
  release?: string;
  tracesSampleRate: number;
  profilesSampleRate: number;
  globalTags?: Record<string, string>;
  ignorePatterns?: RegExp[];
}

export interface SentryUserContext {
  id: string;
  tenantId: string;
  role?: string;
  email?: string;
}

export interface SentryBreadcrumb {
  category: string;
  message: string;
  level: SentrySeverity;
  timestamp: number;
  data?: Record<string, unknown>;
}

// ============================================================================
// SECTION 2: COUNTER
// ============================================================================

/**
 * Counter: A monotonically increasing value — like an odometer.
 * Only goes up. Prometheus computes rates by taking the derivative.
 */
export class Counter {
  private values: Map<string, number> = new Map();

  constructor(public readonly definition: MetricDefinition) {}

  inc(labels: Labels = {}, value: number = 1): void {
    if (value < 0) throw new Error('Counter cannot be decremented');
    const key = labelKey(this.definition.labelNames, labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  get(labels: Labels = {}): number {
    return this.values.get(labelKey(this.definition.labelNames, labels)) || 0;
  }

  expose(): string {
    const lines: string[] = [
      `# HELP ${this.definition.name} ${this.definition.help}`,
      `# TYPE ${this.definition.name} counter`,
    ];
    for (const [key, value] of this.values) {
      const labelStr = key ? `{${key}}` : '';
      lines.push(`${this.definition.name}${labelStr} ${value}`);
    }
    return lines.join('\n');
  }

  reset(): void { this.values.clear(); }
}

// ============================================================================
// SECTION 3: GAUGE
// ============================================================================

/**
 * Gauge: A value that can go up and down — like a thermometer.
 * Represents a current measurement (active connections, memory, queue depth).
 */
export class Gauge {
  private values: Map<string, number> = new Map();

  constructor(public readonly definition: MetricDefinition) {}

  set(labels: Labels, value: number): void {
    this.values.set(labelKey(this.definition.labelNames, labels), value);
  }

  inc(labels: Labels = {}, value: number = 1): void {
    const key = labelKey(this.definition.labelNames, labels);
    this.values.set(key, (this.values.get(key) || 0) + value);
  }

  dec(labels: Labels = {}, value: number = 1): void {
    const key = labelKey(this.definition.labelNames, labels);
    this.values.set(key, (this.values.get(key) || 0) - value);
  }

  get(labels: Labels = {}): number {
    return this.values.get(labelKey(this.definition.labelNames, labels)) || 0;
  }

  expose(): string {
    const lines: string[] = [
      `# HELP ${this.definition.name} ${this.definition.help}`,
      `# TYPE ${this.definition.name} gauge`,
    ];
    for (const [key, value] of this.values) {
      const labelStr = key ? `{${key}}` : '';
      lines.push(`${this.definition.name}${labelStr} ${value}`);
    }
    return lines.join('\n');
  }

  reset(): void { this.values.clear(); }
}

// ============================================================================
// SECTION 4: HISTOGRAM
// ============================================================================

/**
 * Histogram: Distribution of observed values across configurable buckets.
 * Like sorting bins — each observation falls into a bucket based on its value.
 */
export class Histogram {
  static readonly DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

  private observations: Map<string, {
    sum: number;
    count: number;
    buckets: Map<number, number>;
  }> = new Map();

  private bucketBoundaries: number[];

  constructor(public readonly definition: MetricDefinition) {
    this.bucketBoundaries = definition.buckets || Histogram.DEFAULT_BUCKETS;
  }

  observe(labels: Labels, value: number): void {
    const key = labelKey(this.definition.labelNames, labels);
    let data = this.observations.get(key);

    if (!data) {
      data = {
        sum: 0,
        count: 0,
        buckets: new Map(this.bucketBoundaries.map(b => [b, 0])),
      };
      this.observations.set(key, data);
    }

    data.sum += value;
    data.count++;

    for (const boundary of this.bucketBoundaries) {
      if (value <= boundary) {
        data.buckets.set(boundary, (data.buckets.get(boundary) || 0) + 1);
      }
    }
  }

  /**
   * Start a timer — returns a function that records elapsed time.
   *   const stop = histogram.startTimer({ method: 'GET' });
   *   await doWork();
   *   stop(); // Records elapsed seconds
   */
  startTimer(labels: Labels): () => number {
    const start = process.hrtime.bigint();
    return () => {
      const elapsed = Number(process.hrtime.bigint() - start) / 1e9;
      this.observe(labels, elapsed);
      return elapsed;
    };
  }

  expose(): string {
    const lines: string[] = [
      `# HELP ${this.definition.name} ${this.definition.help}`,
      `# TYPE ${this.definition.name} histogram`,
    ];

    for (const [key, data] of this.observations) {
      const prefix = key ? `${key},` : '';
      for (const [boundary, count] of data.buckets) {
        lines.push(`${this.definition.name}_bucket{${prefix}le="${boundary}"} ${count}`);
      }
      lines.push(`${this.definition.name}_bucket{${prefix}le="+Inf"} ${data.count}`);
      lines.push(`${this.definition.name}_sum{${key || ''}} ${data.sum}`);
      lines.push(`${this.definition.name}_count{${key || ''}} ${data.count}`);
    }

    return lines.join('\n');
  }

  reset(): void { this.observations.clear(); }
}

// ============================================================================
// SECTION 5: METRICS REGISTRY
// ============================================================================

/**
 * MetricsRegistry: Central collection point for all application metrics.
 * Owns every Counter, Gauge, and Histogram, and provides the /metrics
 * endpoint handler for Prometheus scraping.
 */
export class MetricsRegistry {
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();

  constructor(private prefix: string = 'scholarly') {}

  registerCounter(name: string, help: string, labelNames: string[] = []): Counter {
    const fullName = `${this.prefix}_${name}`;
    if (this.counters.has(fullName)) return this.counters.get(fullName)!;
    const counter = new Counter({ name: fullName, help, type: 'counter', labelNames });
    this.counters.set(fullName, counter);
    return counter;
  }

  registerGauge(name: string, help: string, labelNames: string[] = []): Gauge {
    const fullName = `${this.prefix}_${name}`;
    if (this.gauges.has(fullName)) return this.gauges.get(fullName)!;
    const gauge = new Gauge({ name: fullName, help, type: 'gauge', labelNames });
    this.gauges.set(fullName, gauge);
    return gauge;
  }

  registerHistogram(name: string, help: string, labelNames: string[] = [], buckets?: number[]): Histogram {
    const fullName = `${this.prefix}_${name}`;
    if (this.histograms.has(fullName)) return this.histograms.get(fullName)!;
    const histogram = new Histogram({ name: fullName, help, type: 'histogram', labelNames, buckets });
    this.histograms.set(fullName, histogram);
    return histogram;
  }

  getCounter(name: string): Counter | undefined { return this.counters.get(`${this.prefix}_${name}`); }
  getGauge(name: string): Gauge | undefined { return this.gauges.get(`${this.prefix}_${name}`); }
  getHistogram(name: string): Histogram | undefined { return this.histograms.get(`${this.prefix}_${name}`); }

  /** Generate Prometheus text exposition format */
  expose(): string {
    const sections: string[] = [];
    for (const c of this.counters.values()) sections.push(c.expose());
    for (const g of this.gauges.values()) sections.push(g.expose());
    for (const h of this.histograms.values()) sections.push(h.expose());
    return sections.join('\n\n') + '\n';
  }

  /** Express middleware handler for /metrics endpoint */
  metricsHandler(): (req: unknown, res: { setHeader: (k: string, v: string) => void; end: (body: string) => void }) => void {
    return (_req, res) => {
      res.setHeader('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
      res.end(this.expose());
    };
  }

  resetAll(): void {
    for (const c of this.counters.values()) c.reset();
    for (const g of this.gauges.values()) g.reset();
    for (const h of this.histograms.values()) h.reset();
  }
}

// ============================================================================
// SECTION 6: STANDARD METRICS
// ============================================================================

export interface StandardMetrics {
  httpRequestsTotal: Counter;
  httpRequestDuration: Histogram;
  httpRequestSize: Histogram;
  httpResponseSize: Histogram;
  httpActiveConnections: Gauge;
  aiRequestsTotal: Counter;
  aiRequestDuration: Histogram;
  aiTokensUsed: Counter;
  aiCostTotal: Counter;
  aiProviderHealth: Gauge;
  aiCacheHits: Counter;
  aiCacheMisses: Counter;
  eventsPublished: Counter;
  eventsConsumed: Counter;
  eventsFailed: Counter;
  eventProcessingDuration: Histogram;
  eventQueueDepth: Gauge;
  authAttemptsTotal: Counter;
  authFailuresTotal: Counter;
  activeSessionsGauge: Gauge;
  tokenRefreshTotal: Counter;
  paymentsTotal: Counter;
  paymentAmountTotal: Counter;
  paymentFailuresTotal: Counter;
  subscriptionChanges: Counter;
  notificationsSent: Counter;
  notificationsFailed: Counter;
  notificationDeliveryDuration: Histogram;
  storybooksGenerated: Counter;
  storybookGenerationDuration: Histogram;
  storybookReadSessions: Counter;
  storybookCompletionRate: Histogram;
  dbQueryDuration: Histogram;
  dbConnectionPoolSize: Gauge;
  dbConnectionPoolActive: Gauge;
  cacheHits: Counter;
  cacheMisses: Counter;
  cacheEvictions: Counter;
  processUptime: Gauge;
  processMemoryBytes: Gauge;
  processEventLoopLag: Histogram;
}

export function registerStandardMetrics(registry: MetricsRegistry): StandardMetrics {
  return {
    httpRequestsTotal: registry.registerCounter('http_requests_total', 'Total HTTP requests', ['method', 'path', 'status']),
    httpRequestDuration: registry.registerHistogram('http_request_duration_seconds', 'HTTP request duration', ['method', 'path', 'status'], [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]),
    httpRequestSize: registry.registerHistogram('http_request_size_bytes', 'HTTP request body size', ['method', 'path'], [100, 1000, 10000, 100000, 1000000]),
    httpResponseSize: registry.registerHistogram('http_response_size_bytes', 'HTTP response body size', ['method', 'path'], [100, 1000, 10000, 100000, 1000000]),
    httpActiveConnections: registry.registerGauge('http_active_connections', 'Active HTTP connections', ['server']),
    aiRequestsTotal: registry.registerCounter('ai_requests_total', 'Total AI provider requests', ['provider', 'capability', 'model', 'tier', 'tenant']),
    aiRequestDuration: registry.registerHistogram('ai_request_duration_seconds', 'AI request latency', ['provider', 'capability', 'model'], [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60]),
    aiTokensUsed: registry.registerCounter('ai_tokens_used_total', 'Total AI tokens consumed', ['provider', 'model', 'direction', 'tenant']),
    aiCostTotal: registry.registerCounter('ai_cost_usd_total', 'Total AI costs in USD', ['provider', 'model', 'capability', 'tenant']),
    aiProviderHealth: registry.registerGauge('ai_provider_health', 'AI provider health (1=healthy, 0=unhealthy)', ['provider']),
    aiCacheHits: registry.registerCounter('ai_cache_hits_total', 'AI response cache hits', ['capability']),
    aiCacheMisses: registry.registerCounter('ai_cache_misses_total', 'AI response cache misses', ['capability']),
    eventsPublished: registry.registerCounter('events_published_total', 'Events published to NATS', ['stream', 'subject']),
    eventsConsumed: registry.registerCounter('events_consumed_total', 'Events consumed from NATS', ['stream', 'subject', 'consumer']),
    eventsFailed: registry.registerCounter('events_failed_total', 'Events that failed processing', ['stream', 'subject', 'reason']),
    eventProcessingDuration: registry.registerHistogram('event_processing_duration_seconds', 'Event handler processing time', ['stream', 'subject'], [0.01, 0.05, 0.1, 0.5, 1, 5, 30]),
    eventQueueDepth: registry.registerGauge('event_queue_depth', 'Pending messages in queue', ['stream', 'consumer']),
    authAttemptsTotal: registry.registerCounter('auth_attempts_total', 'Authentication attempts', ['method', 'result']),
    authFailuresTotal: registry.registerCounter('auth_failures_total', 'Failed auth attempts', ['method', 'reason']),
    activeSessionsGauge: registry.registerGauge('auth_active_sessions', 'Active sessions', ['tenant']),
    tokenRefreshTotal: registry.registerCounter('auth_token_refresh_total', 'Token refreshes', ['result']),
    paymentsTotal: registry.registerCounter('payments_total', 'Payment transactions', ['type', 'status', 'currency']),
    paymentAmountTotal: registry.registerCounter('payment_amount_total', 'Payment amounts in cents', ['currency']),
    paymentFailuresTotal: registry.registerCounter('payment_failures_total', 'Failed payments', ['type', 'reason']),
    subscriptionChanges: registry.registerCounter('subscription_changes_total', 'Subscription lifecycle events', ['action', 'plan']),
    notificationsSent: registry.registerCounter('notifications_sent_total', 'Notifications sent', ['channel', 'type', 'status']),
    notificationsFailed: registry.registerCounter('notifications_failed_total', 'Failed notifications', ['channel', 'type', 'reason']),
    notificationDeliveryDuration: registry.registerHistogram('notification_delivery_duration_seconds', 'Notification delivery latency', ['channel'], [0.1, 0.5, 1, 5, 10, 30]),
    storybooksGenerated: registry.registerCounter('storybooks_generated_total', 'Storybooks generated', ['phase', 'art_style', 'source']),
    storybookGenerationDuration: registry.registerHistogram('storybook_generation_duration_seconds', 'Storybook generation time', ['phase', 'page_count'], [5, 10, 30, 60, 120, 300]),
    storybookReadSessions: registry.registerCounter('storybook_read_sessions_total', 'Storybook read sessions', ['mode', 'phase']),
    storybookCompletionRate: registry.registerHistogram('storybook_completion_rate', 'Completion rate per session (0-1)', ['phase'], [0.1, 0.25, 0.5, 0.75, 0.9, 1.0]),
    dbQueryDuration: registry.registerHistogram('db_query_duration_seconds', 'Database query latency', ['operation', 'table'], [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5, 1]),
    dbConnectionPoolSize: registry.registerGauge('db_connection_pool_size', 'Total DB pool size', ['pool']),
    dbConnectionPoolActive: registry.registerGauge('db_connection_pool_active', 'Active DB connections', ['pool']),
    cacheHits: registry.registerCounter('cache_hits_total', 'Cache hits', ['cache']),
    cacheMisses: registry.registerCounter('cache_misses_total', 'Cache misses', ['cache']),
    cacheEvictions: registry.registerCounter('cache_evictions_total', 'Cache evictions', ['cache', 'reason']),
    processUptime: registry.registerGauge('process_uptime_seconds', 'Process uptime'),
    processMemoryBytes: registry.registerGauge('process_memory_bytes', 'Process memory', ['type']),
    processEventLoopLag: registry.registerHistogram('process_event_loop_lag_seconds', 'Event loop lag', [], [0.001, 0.01, 0.05, 0.1, 0.5, 1]),
  };
}

// ============================================================================
// SECTION 7: HTTP METRICS MIDDLEWARE
// ============================================================================

export function createHttpMetricsMiddleware(metrics: StandardMetrics) {
  return (
    req: { method: string; path: string; headers: Record<string, string | string[] | undefined> },
    res: { statusCode: number; on: (event: string, cb: () => void) => void; getHeader: (name: string) => string | number | string[] | undefined },
    next: () => void
  ): void => {
    const stopTimer = metrics.httpRequestDuration.startTimer({
      method: req.method,
      path: normalisePath(req.path),
    });

    metrics.httpActiveConnections.inc({ server: 'main' });

    const contentLength = parseInt(req.headers['content-length'] as string || '0', 10);
    if (contentLength > 0) {
      metrics.httpRequestSize.observe({ method: req.method, path: normalisePath(req.path) }, contentLength);
    }

    res.on('finish', () => {
      const status = String(res.statusCode);
      const path = normalisePath(req.path);

      stopTimer();
      metrics.httpRequestsTotal.inc({ method: req.method, path, status });

      const resSize = parseInt(String(res.getHeader('content-length') || '0'), 10);
      if (resSize > 0) {
        metrics.httpResponseSize.observe({ method: req.method, path }, resSize);
      }

      metrics.httpActiveConnections.dec({ server: 'main' });
    });

    next();
  };
}

/**
 * Normalise URL paths to prevent high-cardinality label explosion.
 * Replaces UUIDs, numeric IDs, and variable segments with :id.
 */
function normalisePath(path: string): string {
  return path
    .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\/[a-z0-9_]{10,}/g, '/:id')
    .replace(/\/+$/, '') || '/';
}

// ============================================================================
// SECTION 8: SENTRY CLIENT
// ============================================================================

/**
 * SentryClient wraps Sentry SDK operations with lazy loading.
 *
 * The Sentry dependency (~400KB) is dynamically imported only when
 * error tracking is enabled. In testing, InMemorySentryClient captures
 * events for assertion without any network calls.
 */
export class SentryClient {
  private initialised = false;
  private breadcrumbs: SentryBreadcrumb[] = [];
  private maxBreadcrumbs = 100;
  private capturedEvents: Array<{
    level: SentrySeverity;
    message: string;
    error?: Error;
    tags: Record<string, string>;
    extra: Record<string, unknown>;
    user?: SentryUserContext;
    breadcrumbs: SentryBreadcrumb[];
    timestamp: Date;
  }> = [];

  private sdk: unknown = null;

  constructor(
    private config: SentryConfig,
    private logger: Logger
  ) {}

  async init(): Promise<void> {
    if (this.initialised) return;

    try {
      const Sentry = await import('@sentry/node').catch(() => null);

      if (Sentry && Sentry.init) {
        Sentry.init({
          dsn: this.config.dsn,
          environment: this.config.environment,
          release: this.config.release,
          tracesSampleRate: this.config.tracesSampleRate,
          profilesSampleRate: this.config.profilesSampleRate,
        });

        if (this.config.globalTags && Sentry.setTags) {
          Sentry.setTags(this.config.globalTags);
        }

        this.sdk = Sentry;
        this.logger.info({ dsn: maskDsn(this.config.dsn), environment: this.config.environment }, 'Sentry initialised');
      } else {
        this.logger.warn('Sentry SDK not available — using fallback capture');
      }

      this.initialised = true;
    } catch (err) {
      this.logger.error({ err }, 'Failed to initialise Sentry');
      this.initialised = true;
    }
  }

  captureException(
    error: Error,
    context?: { tags?: Record<string, string>; extra?: Record<string, unknown>; user?: SentryUserContext; level?: SentrySeverity }
  ): string {
    const eventId = generateEventId();

    this.capturedEvents.push({
      level: context?.level || 'error',
      message: error.message,
      error,
      tags: { ...this.config.globalTags, ...context?.tags },
      extra: context?.extra || {},
      user: context?.user,
      breadcrumbs: [...this.breadcrumbs],
      timestamp: new Date(),
    });

    if (this.capturedEvents.length > 1000) {
      this.capturedEvents = this.capturedEvents.slice(-500);
    }

    if (this.sdk) {
      try {
        const Sentry = this.sdk as { captureException: (err: Error, ctx?: unknown) => string; withScope: (cb: (scope: unknown) => void) => void };
        Sentry.withScope((scope: { setLevel: (l: string) => void; setTags: (t: Record<string, string>) => void; setExtras: (e: Record<string, unknown>) => void; setUser: (u: unknown) => void }) => {
          if (context?.level) scope.setLevel(context.level);
          if (context?.tags) scope.setTags(context.tags);
          if (context?.extra) scope.setExtras(context.extra);
          if (context?.user) scope.setUser(context.user);
          Sentry.captureException(error);
        });
      } catch (sentryErr) {
        this.logger.error({ sentryErr }, 'Failed to send to Sentry');
      }
    }

    this.logger.error({ eventId, error: error.message, stack: error.stack, ...context?.tags }, `Captured: ${error.message}`);
    return eventId;
  }

  captureMessage(message: string, level: SentrySeverity = 'info', context?: { tags?: Record<string, string>; extra?: Record<string, unknown>; user?: SentryUserContext }): string {
    const eventId = generateEventId();

    this.capturedEvents.push({
      level,
      message,
      tags: { ...this.config.globalTags, ...context?.tags },
      extra: context?.extra || {},
      user: context?.user,
      breadcrumbs: [...this.breadcrumbs],
      timestamp: new Date(),
    });

    if (this.sdk) {
      try {
        const Sentry = this.sdk as { captureMessage: (msg: string, level: string) => string };
        Sentry.captureMessage(message, level);
      } catch { /* silent */ }
    }

    const logLevel = level === 'fatal' || level === 'error' ? 'error' : level === 'warning' ? 'warn' : 'info';
    this.logger[logLevel]({ eventId, ...context?.tags }, message);
    return eventId;
  }

  addBreadcrumb(breadcrumb: Omit<SentryBreadcrumb, 'timestamp'>): void {
    const entry: SentryBreadcrumb = { ...breadcrumb, timestamp: Date.now() / 1000 };
    this.breadcrumbs.push(entry);
    if (this.breadcrumbs.length > this.maxBreadcrumbs) this.breadcrumbs.shift();

    if (this.sdk) {
      try {
        (this.sdk as { addBreadcrumb: (b: unknown) => void }).addBreadcrumb(entry);
      } catch { /* silent */ }
    }
  }

  setUser(user: SentryUserContext | null): void {
    if (this.sdk) {
      try { (this.sdk as { setUser: (u: unknown) => void }).setUser(user); } catch { /* silent */ }
    }
  }

  getCapturedEvents() { return [...this.capturedEvents]; }
  clearBreadcrumbs(): void { this.breadcrumbs = []; }
}

// ============================================================================
// SECTION 9: PINO-SENTRY BRIDGE
// ============================================================================

/**
 * Creates a Pino log handler that forwards error-level logs to Sentry.
 * Bridges existing Pino infrastructure (REM-005) with Sentry automatically.
 *
 *   Pino level 60 (fatal) → Sentry fatal
 *   Pino level 50 (error) → Sentry error
 *   Pino level 40 (warn)  → Sentry warning (optional)
 */
export function createPinoSentryBridge(
  sentry: SentryClient,
  options: { captureWarnings?: boolean } = {}
): (logEntry: { level: number; msg: string; err?: { message: string; stack?: string }; [key: string]: unknown }) => void {
  const minLevel = options.captureWarnings ? 40 : 50;

  return (logEntry) => {
    if (logEntry.level < minLevel) return;

    const level: SentrySeverity = logEntry.level >= 60 ? 'fatal' : logEntry.level >= 50 ? 'error' : 'warning';
    const { level: _l, msg, err, time: _t, pid: _p, hostname: _h, tenantId, userId, requestId, ...extra } = logEntry;

    const tags: Record<string, string> = {};
    if (tenantId) tags.tenantId = String(tenantId);
    if (requestId) tags.requestId = String(requestId);

    const user: SentryUserContext | undefined = userId
      ? { id: String(userId), tenantId: String(tenantId || ''), role: String(extra.role || '') }
      : undefined;

    if (err && typeof err === 'object' && 'message' in err) {
      const error = new Error(err.message);
      if (err.stack) error.stack = err.stack;
      sentry.captureException(error, { tags, extra, user, level });
    } else {
      sentry.captureMessage(msg, level, { tags, extra, user });
    }
  };
}

// ============================================================================
// SECTION 10: SYSTEM METRICS COLLECTOR
// ============================================================================

/**
 * Periodically collects system-level metrics (memory, uptime, event loop lag).
 * Like the platform's health monitor — checking pulse at regular intervals.
 */
export class SystemMetricsCollector {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private lastCheck: bigint = process.hrtime.bigint();

  constructor(
    private metrics: StandardMetrics,
    private intervalMs: number = 15000
  ) {}

  start(): void {
    if (this.intervalHandle) return;
    this.collect();
    this.intervalHandle = setInterval(() => this.collect(), this.intervalMs);
    if (this.intervalHandle.unref) this.intervalHandle.unref();
  }

  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }

  private collect(): void {
    this.metrics.processUptime.set({}, process.uptime());

    const mem = process.memoryUsage();
    this.metrics.processMemoryBytes.set({ type: 'rss' }, mem.rss);
    this.metrics.processMemoryBytes.set({ type: 'heap_total' }, mem.heapTotal);
    this.metrics.processMemoryBytes.set({ type: 'heap_used' }, mem.heapUsed);
    this.metrics.processMemoryBytes.set({ type: 'external' }, mem.external);
    if (mem.arrayBuffers) {
      this.metrics.processMemoryBytes.set({ type: 'array_buffers' }, mem.arrayBuffers);
    }

    const now = process.hrtime.bigint();
    const lag = Number(now - this.lastCheck) / 1e9 - (this.intervalMs / 1000);
    this.lastCheck = now;
    if (lag > 0) {
      this.metrics.processEventLoopLag.observe({}, lag);
    }
  }
}

// ============================================================================
// SECTION 11: AI METRICS HELPER
// ============================================================================

/**
 * Helper for recording AI operation metrics in a consistent way.
 * Wraps an AI provider call with automatic timing, token tracking,
 * and cost attribution.
 */
export class AIMetricsHelper {
  constructor(private metrics: StandardMetrics) {}

  /**
   * Record a completed AI operation.
   * Call this after every AI provider request.
   */
  recordOperation(params: {
    provider: string;
    capability: string;
    model: string;
    tier: string;
    tenantId: string;
    durationMs: number;
    inputTokens: number;
    outputTokens: number;
    costUsd: number;
    success: boolean;
  }): void {
    const { provider, capability, model, tier, tenantId, durationMs, inputTokens, outputTokens, costUsd, success } = params;

    this.metrics.aiRequestsTotal.inc({ provider, capability, model, tier, tenant: tenantId });
    this.metrics.aiRequestDuration.observe({ provider, capability, model }, durationMs / 1000);
    this.metrics.aiTokensUsed.inc({ provider, model, direction: 'input', tenant: tenantId }, inputTokens);
    this.metrics.aiTokensUsed.inc({ provider, model, direction: 'output', tenant: tenantId }, outputTokens);
    this.metrics.aiCostTotal.inc({ provider, model, capability, tenant: tenantId }, costUsd);

    if (!success) {
      // Provider health degrades on failure
      this.metrics.aiProviderHealth.set({ provider }, 0);
    }
  }

  /** Record a cache hit/miss for AI responses */
  recordCacheResult(capability: string, hit: boolean): void {
    if (hit) {
      this.metrics.aiCacheHits.inc({ capability });
    } else {
      this.metrics.aiCacheMisses.inc({ capability });
    }
  }

  /** Update provider health status */
  setProviderHealth(provider: string, healthy: boolean): void {
    this.metrics.aiProviderHealth.set({ provider }, healthy ? 1 : 0);
  }
}

// ============================================================================
// SECTION 12: UTILITIES
// ============================================================================

function labelKey(labelNames: string[], labels: Labels): string {
  return labelNames
    .map(name => `${name}="${escapeLabelValue(labels[name] || '')}"`)
    .filter(s => !s.endsWith('=""'))
    .join(',');
}

function escapeLabelValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
}

function maskDsn(dsn: string): string {
  try {
    const url = new URL(dsn);
    return `${url.protocol}//${url.username.substring(0, 4)}***@${url.host}${url.pathname}`;
  } catch {
    return '***';
  }
}

function generateEventId(): string {
  return Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}
