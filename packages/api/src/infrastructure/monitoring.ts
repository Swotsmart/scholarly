// =============================================================================
// SCHOLARLY PLATFORM — Sprint 7: LR-006
// Observability & Monitoring Dashboard
// =============================================================================
// The instrument panel of the Scholarly aircraft: altimeter (request rates),
// fuel gauge (API credit balance), engine temperature (error rates), and
// black box (structured logs). Wires Prometheus metrics, Sentry error
// tracking, and structured logging into every Sprint 1-6 component.
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Metric Definitions
// =============================================================================

export enum MetricType { COUNTER = 'counter', GAUGE = 'gauge', HISTOGRAM = 'histogram', SUMMARY = 'summary' }

export interface MetricDefinition {
  name: string; type: MetricType; help: string; labels: string[]; buckets?: number[];
}

export const SCHOLARLY_METRICS: MetricDefinition[] = [
  // --- API Request Metrics ---
  { name: 'scholarly_http_requests_total', type: MetricType.COUNTER, help: 'Total HTTP requests by method, path, and status', labels: ['method', 'path', 'status_code', 'tenant_id'] },
  { name: 'scholarly_http_request_duration_seconds', type: MetricType.HISTOGRAM, help: 'HTTP request duration in seconds', labels: ['method', 'path', 'tenant_id'], buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] },
  { name: 'scholarly_http_request_size_bytes', type: MetricType.HISTOGRAM, help: 'HTTP request body size in bytes', labels: ['method', 'path'], buckets: [100, 1000, 10000, 100000, 1000000] },

  // --- AI Provider Metrics ---
  { name: 'scholarly_ai_requests_total', type: MetricType.COUNTER, help: 'Total AI provider requests', labels: ['provider', 'capability', 'model', 'status', 'tenant_id'] },
  { name: 'scholarly_ai_request_duration_seconds', type: MetricType.HISTOGRAM, help: 'AI request duration', labels: ['provider', 'capability', 'model'], buckets: [0.5, 1, 2, 5, 10, 20, 30, 60, 120] },
  { name: 'scholarly_ai_tokens_used_total', type: MetricType.COUNTER, help: 'Total tokens consumed', labels: ['provider', 'model', 'direction', 'tenant_id'] },
  { name: 'scholarly_ai_cost_usd_total', type: MetricType.COUNTER, help: 'Total AI API cost in USD', labels: ['provider', 'capability', 'model', 'tenant_id'] },
  { name: 'scholarly_ai_cost_budget_remaining_usd', type: MetricType.GAUGE, help: 'Remaining AI budget per tenant', labels: ['tenant_id'] },
  { name: 'scholarly_ai_circuit_breaker_state', type: MetricType.GAUGE, help: 'Circuit breaker state (0=closed, 1=half-open, 2=open)', labels: ['provider'] },
  { name: 'scholarly_ai_fallback_total', type: MetricType.COUNTER, help: 'AI provider fallback events', labels: ['from_provider', 'to_provider', 'capability'] },

  // --- Storybook Generation Metrics ---
  { name: 'scholarly_storybook_generation_total', type: MetricType.COUNTER, help: 'Total storybook generation attempts', labels: ['stage', 'status', 'tenant_id'] },
  { name: 'scholarly_storybook_generation_duration_seconds', type: MetricType.HISTOGRAM, help: 'Generation duration by stage', labels: ['stage'], buckets: [1, 5, 10, 30, 60, 120, 300, 600] },
  { name: 'scholarly_storybook_decodability_score', type: MetricType.HISTOGRAM, help: 'Decodability score distribution', labels: ['phase', 'tenant_id'], buckets: [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0] },
  { name: 'scholarly_storybook_generation_cost_usd', type: MetricType.HISTOGRAM, help: 'Per-book generation cost', labels: ['tenant_id'], buckets: [0.25, 0.5, 0.75, 1.0, 1.5, 2.0, 3.0, 5.0] },

  // --- Library & Reading Metrics ---
  { name: 'scholarly_library_books_total', type: MetricType.GAUGE, help: 'Total books by status and phase', labels: ['status', 'phase', 'tenant_id'] },
  { name: 'scholarly_library_reads_total', type: MetricType.COUNTER, help: 'Total book reads', labels: ['mode', 'phase', 'tenant_id'] },
  { name: 'scholarly_library_reading_accuracy', type: MetricType.HISTOGRAM, help: 'Reading accuracy distribution', labels: ['phase', 'tenant_id'], buckets: [0.3, 0.4, 0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0] },
  { name: 'scholarly_library_wcpm', type: MetricType.HISTOGRAM, help: 'Words correct per minute distribution', labels: ['phase', 'tenant_id'], buckets: [10, 20, 30, 40, 50, 60, 80, 100, 120, 150] },
  { name: 'scholarly_library_active_readers', type: MetricType.GAUGE, help: 'Currently active readers', labels: ['tenant_id'] },

  // --- Review Pipeline ---
  { name: 'scholarly_review_pipeline_total', type: MetricType.COUNTER, help: 'Total reviews by stage and outcome', labels: ['stage', 'outcome', 'tenant_id'] },
  { name: 'scholarly_review_pipeline_duration_seconds', type: MetricType.HISTOGRAM, help: 'Time per review stage', labels: ['stage'], buckets: [1, 5, 30, 60, 300, 3600, 86400] },

  // --- Marketplace ---
  { name: 'scholarly_creator_registrations_total', type: MetricType.COUNTER, help: 'Total creator registrations', labels: ['tier', 'tenant_id'] },
  { name: 'scholarly_creator_earnings_usd_total', type: MetricType.COUNTER, help: 'Total creator earnings', labels: ['tier', 'tenant_id'] },
  { name: 'scholarly_bounties_active', type: MetricType.GAUGE, help: 'Active content bounties', labels: ['tenant_id'] },

  // --- Arena ---
  { name: 'scholarly_arena_competitions_active', type: MetricType.GAUGE, help: 'Active Arena competitions', labels: ['format', 'tenant_id'] },
  { name: 'scholarly_arena_scores_total', type: MetricType.COUNTER, help: 'Total Arena scoring events', labels: ['format', 'tenant_id'] },
  { name: 'scholarly_arena_points_distributed', type: MetricType.COUNTER, help: 'Total Arena points distributed', labels: ['format', 'team_type', 'tenant_id'] },

  // --- Infrastructure ---
  { name: 'scholarly_nats_messages_published_total', type: MetricType.COUNTER, help: 'NATS messages published', labels: ['stream', 'subject'] },
  { name: 'scholarly_nats_messages_consumed_total', type: MetricType.COUNTER, help: 'NATS messages consumed', labels: ['stream', 'consumer_group', 'status'] },
  { name: 'scholarly_nats_consumer_lag', type: MetricType.GAUGE, help: 'NATS consumer lag', labels: ['stream', 'consumer_group'] },
  { name: 'scholarly_db_query_duration_seconds', type: MetricType.HISTOGRAM, help: 'Database query duration', labels: ['operation', 'table'], buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5] },
  { name: 'scholarly_db_connections_active', type: MetricType.GAUGE, help: 'Active database connections', labels: ['pool'] },
  { name: 'scholarly_cache_hits_total', type: MetricType.COUNTER, help: 'Cache hits and misses', labels: ['cache_name', 'result'] },
  { name: 'scholarly_device_sync_operations_total', type: MetricType.COUNTER, help: 'Device sync operations', labels: ['status', 'direction'] },
];

// =============================================================================
// Section 2: Metrics Collector
// =============================================================================

export class MetricsCollector {
  private counters: Map<string, Map<string, number>> = new Map();
  private gauges: Map<string, Map<string, number>> = new Map();
  private histograms: Map<string, Map<string, number[]>> = new Map();
  private readonly definitions: Map<string, MetricDefinition>;

  constructor() {
    this.definitions = new Map(SCHOLARLY_METRICS.map(m => [m.name, m]));
    for (const metric of SCHOLARLY_METRICS) {
      switch (metric.type) {
        case MetricType.COUNTER: this.counters.set(metric.name, new Map()); break;
        case MetricType.GAUGE: this.gauges.set(metric.name, new Map()); break;
        case MetricType.HISTOGRAM: this.histograms.set(metric.name, new Map()); break;
      }
    }
  }

  increment(name: string, labels: Record<string, string>, value: number = 1): void {
    const key = this.labelKey(labels);
    const counter = this.counters.get(name);
    if (counter) counter.set(key, (counter.get(key) || 0) + value);
  }

  setGauge(name: string, labels: Record<string, string>, value: number): void {
    const gauge = this.gauges.get(name);
    if (gauge) gauge.set(this.labelKey(labels), value);
  }

  observe(name: string, labels: Record<string, string>, value: number): void {
    const key = this.labelKey(labels);
    const histogram = this.histograms.get(name);
    if (histogram) {
      const values = histogram.get(key) || [];
      values.push(value);
      histogram.set(key, values);
    }
  }

  toPrometheusFormat(): string {
    const lines: string[] = [];
    for (const [name, def] of this.definitions) {
      lines.push(`# HELP ${name} ${def.help}`);
      lines.push(`# TYPE ${name} ${def.type}`);
      switch (def.type) {
        case MetricType.COUNTER: {
          const counter = this.counters.get(name);
          if (counter) for (const [key, value] of counter) lines.push(`${name}{${key}} ${value}`);
          break;
        }
        case MetricType.GAUGE: {
          const gauge = this.gauges.get(name);
          if (gauge) for (const [key, value] of gauge) lines.push(`${name}{${key}} ${value}`);
          break;
        }
        case MetricType.HISTOGRAM: {
          const histogram = this.histograms.get(name);
          if (histogram) {
            for (const [key, values] of histogram) {
              if (values.length === 0) continue;
              const buckets = def.buckets || [0.01, 0.05, 0.1, 0.5, 1, 5, 10];
              for (const bucket of buckets) lines.push(`${name}_bucket{${key},le="${bucket}"} ${values.filter(v => v <= bucket).length}`);
              lines.push(`${name}_bucket{${key},le="+Inf"} ${values.length}`);
              lines.push(`${name}_sum{${key}} ${values.reduce((a, b) => a + b, 0)}`);
              lines.push(`${name}_count{${key}} ${values.length}`);
            }
          }
          break;
        }
      }
    }
    return lines.join('\n');
  }

  private labelKey(labels: Record<string, string>): string {
    return Object.entries(labels).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${k}="${v}"`).join(',');
  }
}

// =============================================================================
// Section 3: Alert Rules
// =============================================================================

export interface AlertRule {
  name: string; severity: 'critical' | 'warning' | 'info'; condition: string;
  forDuration: string; description: string; runbook: string; channels: string[];
}

export const SCHOLARLY_ALERTS: AlertRule[] = [
  { name: 'HighErrorRate', severity: 'critical', condition: 'rate(scholarly_http_requests_total{status_code=~"5.."}[5m]) / rate(scholarly_http_requests_total[5m]) > 0.05', forDuration: '5m', description: 'More than 5% of requests returning 5xx errors', runbook: 'Check Sentry for error patterns. Verify DB connectivity. Check AI provider status.', channels: ['pagerduty', 'slack-alerts'] },
  { name: 'AIProviderAllDown', severity: 'critical', condition: 'sum(scholarly_ai_circuit_breaker_state) == count(scholarly_ai_circuit_breaker_state) * 2', forDuration: '2m', description: 'All AI providers have open circuit breakers', runbook: 'Check provider status pages. Verify API keys. Check network. Enable self-hosted fallback.', channels: ['pagerduty', 'slack-alerts'] },
  { name: 'DatabaseConnectionExhausted', severity: 'critical', condition: 'scholarly_db_connections_active > 80', forDuration: '3m', description: 'DB connection pool nearing exhaustion (>80/100)', runbook: 'Check for connection leaks. Verify slow query log. Consider increasing pool size.', channels: ['pagerduty', 'slack-alerts'] },
  { name: 'HighAICost', severity: 'warning', condition: 'increase(scholarly_ai_cost_usd_total[1h]) > 50', forDuration: '1h', description: 'AI API costs exceeded $50 in the last hour', runbook: 'Review generation requests. Check for runaway loops. Verify rate limits.', channels: ['slack-alerts'] },
  { name: 'LowDecodabilityScores', severity: 'warning', condition: 'histogram_quantile(0.5, scholarly_storybook_decodability_score) < 0.80', forDuration: '30m', description: 'Median decodability below 80%', runbook: 'Review prompt templates. Check GPC reference data. Test narrative generator manually.', channels: ['slack-alerts'] },
  { name: 'NATSConsumerLag', severity: 'warning', condition: 'scholarly_nats_consumer_lag > 1000', forDuration: '10m', description: 'NATS consumer falling behind (>1000 pending)', runbook: 'Check consumer health. Scale consumer instances. Review processing time.', channels: ['slack-alerts'] },
  { name: 'HighLatencyReading', severity: 'warning', condition: 'histogram_quantile(0.95, scholarly_http_request_duration_seconds{path=~"/api/v1/library.*"}) > 2', forDuration: '10m', description: 'P95 library API latency > 2 seconds', runbook: 'Check DB query plans. Verify Redis cache hit rate. Review N+1 queries.', channels: ['slack-alerts'] },
  { name: 'NewBookPublished', severity: 'info', condition: 'increase(scholarly_library_books_total{status="PUBLISHED"}[1h]) > 0', forDuration: '0m', description: 'New storybook published', runbook: 'Informational. Verify book appears correctly.', channels: ['slack-info'] },
  { name: 'ArenaCompetitionStarted', severity: 'info', condition: 'increase(scholarly_arena_competitions_active[1h]) > 0', forDuration: '0m', description: 'New Arena competition activated', runbook: 'Verify leaderboard. Check event flow.', channels: ['slack-info'] },
];

// =============================================================================
// Section 4: Dashboard Definitions
// =============================================================================

export interface DashboardPanel {
  title: string; description: string; type: 'graph' | 'stat' | 'table' | 'heatmap';
  query: string; unit: string; thresholds?: { value: number; color: string }[];
}

export interface Dashboard { name: string; description: string; panels: DashboardPanel[]; }

export const SCHOLARLY_DASHBOARDS: Dashboard[] = [
  {
    name: 'Platform Overview',
    description: 'High-level health and activity metrics',
    panels: [
      { title: 'Request Rate', description: 'HTTP req/s', type: 'graph', query: 'rate(scholarly_http_requests_total[5m])', unit: 'req/s' },
      { title: 'Error Rate', description: '5xx percentage', type: 'stat', query: 'rate(scholarly_http_requests_total{status_code=~"5.."}[5m]) / rate(scholarly_http_requests_total[5m]) * 100', unit: '%', thresholds: [{ value: 1, color: 'yellow' }, { value: 5, color: 'red' }] },
      { title: 'P95 Latency', description: '95th pctile response time', type: 'graph', query: 'histogram_quantile(0.95, scholarly_http_request_duration_seconds)', unit: 's' },
      { title: 'Active Readers', description: 'Currently reading', type: 'stat', query: 'sum(scholarly_library_active_readers)', unit: '' },
      { title: 'DB Connections', description: 'Active pool connections', type: 'stat', query: 'scholarly_db_connections_active', unit: '', thresholds: [{ value: 60, color: 'yellow' }, { value: 80, color: 'red' }] },
    ],
  },
  {
    name: 'AI Operations',
    description: 'AI provider health, costs, and generation metrics',
    panels: [
      { title: 'AI Cost/Hour', description: 'Hourly API spend', type: 'graph', query: 'increase(scholarly_ai_cost_usd_total[1h])', unit: 'USD' },
      { title: 'Circuit Breakers', description: 'Provider health', type: 'table', query: 'scholarly_ai_circuit_breaker_state', unit: '' },
      { title: 'Generation Success', description: 'Storybook generation %', type: 'stat', query: 'rate(scholarly_storybook_generation_total{status="success"}[1h]) / rate(scholarly_storybook_generation_total[1h]) * 100', unit: '%' },
      { title: 'Avg Decodability', description: 'Median decodability', type: 'stat', query: 'histogram_quantile(0.5, scholarly_storybook_decodability_score)', unit: '' },
      { title: 'Fallbacks/Hour', description: 'Provider fallback rate', type: 'graph', query: 'rate(scholarly_ai_fallback_total[1h])', unit: '/h' },
    ],
  },
  {
    name: 'Reading Activity',
    description: 'Library engagement and learner progress',
    panels: [
      { title: 'Books Read/Hour', description: 'Reading rate', type: 'graph', query: 'rate(scholarly_library_reads_total[1h])', unit: '/h' },
      { title: 'Accuracy Heatmap', description: 'Distribution', type: 'heatmap', query: 'scholarly_library_reading_accuracy', unit: '' },
      { title: 'WCPM Heatmap', description: 'Fluency', type: 'heatmap', query: 'scholarly_library_wcpm', unit: 'WCPM' },
      { title: 'Library Size', description: 'Published books', type: 'stat', query: 'sum(scholarly_library_books_total{status="PUBLISHED"})', unit: 'books' },
    ],
  },
  {
    name: 'Infrastructure',
    description: 'NATS, database, and caching metrics',
    panels: [
      { title: 'NATS Rate', description: 'Messages/s', type: 'graph', query: 'rate(scholarly_nats_messages_published_total[5m])', unit: 'msg/s' },
      { title: 'Consumer Lag', description: 'Pending messages', type: 'table', query: 'scholarly_nats_consumer_lag', unit: 'msgs' },
      { title: 'DB P95', description: 'Query latency', type: 'graph', query: 'histogram_quantile(0.95, scholarly_db_query_duration_seconds)', unit: 's' },
      { title: 'Cache Hit Rate', description: 'Redis effectiveness', type: 'stat', query: 'rate(scholarly_cache_hits_total{result="hit"}[5m]) / rate(scholarly_cache_hits_total[5m]) * 100', unit: '%' },
    ],
  },
];

// =============================================================================
// Section 5: Sentry Configuration
// =============================================================================

export interface SentryConfig {
  dsn: string; environment: string; release: string;
  tracesSampleRate: number; profilesSampleRate: number;
  ignoreErrors: string[]; tags: Record<string, string>;
}

export const SCHOLARLY_SENTRY_CONFIG: SentryConfig = {
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.APP_ENV || 'development',
  release: `scholarly@${process.env.APP_VERSION || '1.0.0'}`,
  tracesSampleRate: 0.1,
  profilesSampleRate: 0.05,
  ignoreErrors: [
    'ResizeObserver loop limit exceeded',
    'Network request failed',
    'AbortError',
  ],
  tags: { platform: 'scholarly', component: 'storybook-engine' },
};

// =============================================================================
// Section 6: Health Check System
// =============================================================================

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  version: string;
  uptime: number;
  checks: ComponentHealth[];
}

export interface ComponentHealth {
  name: string;
  status: 'up' | 'degraded' | 'down';
  latencyMs: number;
  message: string;
  lastChecked: Date;
}

export class HealthCheckService {
  private readonly startTime = Date.now();
  private readonly checkers: Map<string, () => Promise<ComponentHealth>> = new Map();

  registerCheck(name: string, checker: () => Promise<ComponentHealth>): void {
    this.checkers.set(name, checker);
  }

  async check(): Promise<HealthCheckResult> {
    const checks: ComponentHealth[] = [];

    for (const [name, checker] of this.checkers) {
      try {
        const result = await Promise.race([
          checker(),
          this.timeout(5000, name),
        ]);
        checks.push(result);
      } catch (error) {
        checks.push({
          name, status: 'down', latencyMs: 5000,
          message: `Health check failed: ${error}`, lastChecked: new Date(),
        });
      }
    }

    const hasDown = checks.some(c => c.status === 'down');
    const hasDegraded = checks.some(c => c.status === 'degraded');

    return {
      status: hasDown ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
      timestamp: new Date(),
      version: process.env.APP_VERSION || '1.0.0',
      uptime: Date.now() - this.startTime,
      checks,
    };
  }

  private timeout(ms: number, name: string): Promise<ComponentHealth> {
    return new Promise((_, reject) => setTimeout(() => reject(new Error(`${name} timeout`)), ms));
  }

  // Pre-built checkers for common components
  static createDatabaseChecker(db: { execute(sql: string): Promise<unknown> }): () => Promise<ComponentHealth> {
    return async () => {
      const start = Date.now();
      try {
        await db.execute('SELECT 1');
        return { name: 'database', status: 'up', latencyMs: Date.now() - start, message: 'Connected', lastChecked: new Date() };
      } catch (error) {
        return { name: 'database', status: 'down', latencyMs: Date.now() - start, message: String(error), lastChecked: new Date() };
      }
    };
  }

  static createRedisChecker(redis: { ping(): Promise<string> }): () => Promise<ComponentHealth> {
    return async () => {
      const start = Date.now();
      try {
        const pong = await redis.ping();
        return { name: 'redis', status: pong === 'PONG' ? 'up' : 'degraded', latencyMs: Date.now() - start, message: pong, lastChecked: new Date() };
      } catch (error) {
        return { name: 'redis', status: 'down', latencyMs: Date.now() - start, message: String(error), lastChecked: new Date() };
      }
    };
  }

  static createNatsChecker(nats: { status: string }): () => Promise<ComponentHealth> {
    return async () => {
      const status = nats.status === 'connected' ? 'up' : nats.status === 'reconnecting' ? 'degraded' : 'down';
      return { name: 'nats', status, latencyMs: 0, message: nats.status, lastChecked: new Date() };
    };
  }
}

// =============================================================================
// Section 7: Structured Logger
// =============================================================================

export enum LogLevel { DEBUG = 0, INFO = 1, WARN = 2, ERROR = 3, FATAL = 4 }

export interface LogEntry {
  timestamp: string; level: string; message: string; service: string;
  traceId?: string; spanId?: string; tenantId?: string;
  userId?: string; duration?: number; error?: string;
  metadata?: Record<string, unknown>;
}

export class StructuredLogger {
  constructor(
    private readonly service: string,
    private readonly minLevel: LogLevel = LogLevel.INFO
  ) {}

  debug(message: string, metadata?: Record<string, unknown>): void { this.log(LogLevel.DEBUG, message, metadata); }
  info(message: string, metadata?: Record<string, unknown>): void { this.log(LogLevel.INFO, message, metadata); }
  warn(message: string, metadata?: Record<string, unknown>): void { this.log(LogLevel.WARN, message, metadata); }
  error(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, { ...metadata, error: error?.message, stack: error?.stack });
  }
  fatal(message: string, error?: Error, metadata?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, { ...metadata, error: error?.message, stack: error?.stack });
  }

  child(overrides: Record<string, unknown>): StructuredLogger {
    const child = new StructuredLogger(this.service, this.minLevel);
    (child as any).defaultMetadata = overrides;
    return child;
  }

  private log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (level < this.minLevel) return;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      service: this.service,
      ...((this as any).defaultMetadata || {}),
      ...(metadata || {}),
    };
    const output = JSON.stringify(entry);
    if (level >= LogLevel.ERROR) { console.error(output); } else { console.log(output); }
  }
}

// =============================================================================
// Section 8: Middleware Factory
// =============================================================================
// Express middleware that auto-instruments every request with metrics,
// structured logging, and Sentry tracing.

export class ObservabilityMiddleware {
  constructor(
    private readonly metrics: MetricsCollector,
    private readonly logger: StructuredLogger
  ) {}

  requestMetrics() {
    return (req: any, res: any, next: any) => {
      const start = Date.now();
      const path = this.normalizePath(req.path);

      res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const labels = { method: req.method, path, status_code: String(res.statusCode), tenant_id: req.tenantId || 'unknown' };

        this.metrics.increment('scholarly_http_requests_total', labels);
        this.metrics.observe('scholarly_http_request_duration_seconds', { method: req.method, path, tenant_id: labels.tenant_id }, duration);

        if (req.headers['content-length']) {
          this.metrics.observe('scholarly_http_request_size_bytes', { method: req.method, path }, parseInt(req.headers['content-length']));
        }

        this.logger.info(`${req.method} ${path} ${res.statusCode}`, { duration, statusCode: res.statusCode, tenantId: labels.tenant_id });
      });

      next();
    };
  }

  healthEndpoint(healthService: HealthCheckService) {
    return async (_req: any, res: any) => {
      const health = await healthService.check();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    };
  }

  metricsEndpoint() {
    return (_req: any, res: any) => {
      res.set('Content-Type', 'text/plain');
      res.send(this.metrics.toPrometheusFormat());
    };
  }

  private normalizePath(path: string): string {
    // Replace UUIDs and IDs with :id to prevent metric cardinality explosion
    return path
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id')
      .replace(/\/[0-9]+\b/g, '/:id')
      .replace(/seed-\d+/g, ':bookId');
  }
}

// Line count: ~370
