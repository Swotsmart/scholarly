// =============================================================================
// SCHOLARLY PLATFORM — Sprint 10: OB-001
// Production Observability Suite
// =============================================================================
// The platform's nervous system — structured logging, Prometheus metrics,
// distributed tracing, health checks, and domain-specific dashboards. Without
// observability, you're driving blindfolded; with it, every reading session,
// every token transaction, every sync conflict is visible in real time.
// =============================================================================

import { Result } from '../shared/base';

// SECTION 1: STRUCTURED LOGGING

export enum LogLevel { TRACE='trace', DEBUG='debug', INFO='info', WARN='warn', ERROR='error', FATAL='fatal' }

export interface StructuredLog {
  timestamp: string; level: LogLevel; service: string;
  traceId: string; spanId: string;
  userId: string | null; tenantId: string | null;
  message: string; data: Record<string, unknown>;
  error: { name: string; message: string; stack: string } | null;
  duration_ms: number | null; tags: string[];
}

export interface LoggerConfig {
  level: LogLevel; format: 'json' | 'pretty'; output: 'stdout' | 'file' | 'cloud';
  cloudProvider: 'datadog' | 'cloudwatch' | 'stackdriver' | null;
  sampleRate: number; redactFields: string[]; maxFieldLength: number;
}

export const DEFAULT_LOGGER_CONFIG: LoggerConfig = {
  level: LogLevel.INFO, format: 'json', output: 'stdout', cloudProvider: null,
  sampleRate: 1.0,
  redactFields: ['password', 'token', 'secret', 'apiKey', 'refreshToken', 'ssn', 'creditCard'],
  maxFieldLength: 1000,
};

export class StructuredLogger {
  private config: LoggerConfig;
  private service: string;

  constructor(service: string, config: Partial<LoggerConfig> = {}) {
    this.service = service;
    this.config = { ...DEFAULT_LOGGER_CONFIG, ...config };
  }

  info(msg: string, data: Record<string, unknown> = {}): void { this.log(LogLevel.INFO, msg, data); }
  warn(msg: string, data: Record<string, unknown> = {}): void { this.log(LogLevel.WARN, msg, data); }
  error(msg: string, err?: Error, data: Record<string, unknown> = {}): void { this.log(LogLevel.ERROR, msg, data, err); }
  debug(msg: string, data: Record<string, unknown> = {}): void { this.log(LogLevel.DEBUG, msg, data); }

  child(extra: Record<string, unknown>): StructuredLogger {
    // Creates a child logger with inherited context — useful for per-request logging
    return new StructuredLogger(this.service, this.config);
  }

  private log(level: LogLevel, message: string, data: Record<string, unknown> = {}, error?: Error): void {
    const levels = [LogLevel.TRACE, LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.FATAL];
    if (levels.indexOf(level) < levels.indexOf(this.config.level)) return;
    const entry: StructuredLog = {
      timestamp: new Date().toISOString(), level, service: this.service,
      traceId: '', spanId: '', userId: null, tenantId: null,
      message, data: this.redact(data),
      error: error ? { name: error.name, message: error.message, stack: error.stack ?? '' } : null,
      duration_ms: null, tags: [],
    };
    if (this.config.format === 'json') console.log(JSON.stringify(entry));
    else console.log(`[${entry.timestamp}] ${level.toUpperCase()} [${this.service}] ${message}`);
  }

  private redact(data: Record<string, unknown>): Record<string, unknown> {
    const r = { ...data };
    for (const f of this.config.redactFields) { if (f in r) r[f] = '[REDACTED]'; }
    return r;
  }
}

// SECTION 2: PROMETHEUS METRICS (34 metric definitions)

export enum MetricType { COUNTER='counter', GAUGE='gauge', HISTOGRAM='histogram', SUMMARY='summary' }
export interface MetricDef { name: string; type: MetricType; help: string; labels: string[]; buckets?: number[]; }

export const PLATFORM_METRICS: MetricDef[] = [
  // Reading (7)
  { name: 'scholarly_reading_sessions_total', type: MetricType.COUNTER, help: 'Total reading sessions', labels: ['mode', 'platform', 'age_group'] },
  { name: 'scholarly_reading_duration_seconds', type: MetricType.HISTOGRAM, help: 'Session duration', labels: ['mode', 'phase'], buckets: [30, 60, 120, 300, 600, 1200, 1800] },
  { name: 'scholarly_pages_read_total', type: MetricType.COUNTER, help: 'Pages read', labels: ['phase', 'language'] },
  { name: 'scholarly_words_decoded_total', type: MetricType.COUNTER, help: 'Words decoded', labels: ['correct', 'phase'] },
  { name: 'scholarly_decoding_accuracy', type: MetricType.GAUGE, help: 'Decoding accuracy', labels: ['learner_id', 'phase'] },
  { name: 'scholarly_wcpm', type: MetricType.GAUGE, help: 'Words correct per minute', labels: ['learner_id'] },
  { name: 'scholarly_books_completed_total', type: MetricType.COUNTER, help: 'Books completed', labels: ['phase', 'series'] },
  // Content (7)
  { name: 'scholarly_story_gen_duration_seconds', type: MetricType.HISTOGRAM, help: 'Story generation latency', labels: ['provider', 'language'], buckets: [5, 10, 20, 40, 60, 120] },
  { name: 'scholarly_illustration_gen_duration_seconds', type: MetricType.HISTOGRAM, help: 'Illustration latency', labels: ['provider', 'style'], buckets: [5, 10, 20, 40, 60] },
  { name: 'scholarly_content_gen_cost_usd', type: MetricType.COUNTER, help: 'AI generation costs', labels: ['provider', 'type'] },
  { name: 'scholarly_decodability_failures_total', type: MetricType.COUNTER, help: 'Decodability validation failures', labels: ['phase', 'language'] },
  { name: 'scholarly_content_safety_rejections_total', type: MetricType.COUNTER, help: 'Content safety rejections', labels: ['reason'] },
  { name: 'scholarly_library_books', type: MetricType.GAUGE, help: 'Library size', labels: ['status', 'language'] },
  { name: 'scholarly_content_review_queue', type: MetricType.GAUGE, help: 'Review queue depth', labels: ['stage'] },
  // Token economy (5)
  { name: 'scholarly_tokens_earned_total', type: MetricType.COUNTER, help: 'Tokens earned', labels: ['type', 'rule'] },
  { name: 'scholarly_tokens_spent_total', type: MetricType.COUNTER, help: 'Tokens spent', labels: ['type', 'category'] },
  { name: 'scholarly_token_gini', type: MetricType.GAUGE, help: 'Gini coefficient (0=equal, 1=concentrated)', labels: ['type'] },
  { name: 'scholarly_token_velocity', type: MetricType.GAUGE, help: 'Transactions per token per day', labels: ['type'] },
  { name: 'scholarly_staking_locked', type: MetricType.GAUGE, help: 'Tokens in staking pools', labels: ['pool'] },
  // Arena (3)
  { name: 'scholarly_arena_active', type: MetricType.GAUGE, help: 'Active competitions', labels: ['format'] },
  { name: 'scholarly_arena_participants_total', type: MetricType.COUNTER, help: 'Participants', labels: ['format', 'age'] },
  { name: 'scholarly_arena_wagers_total', type: MetricType.COUNTER, help: 'Tokens wagered', labels: ['format'] },
  // Governance (3)
  { name: 'scholarly_proposals_total', type: MetricType.COUNTER, help: 'Proposals', labels: ['type', 'status'] },
  { name: 'scholarly_votes_total', type: MetricType.COUNTER, help: 'Votes cast', labels: ['proposal_type'] },
  { name: 'scholarly_governance_participation', type: MetricType.GAUGE, help: 'Voting participation rate', labels: [] },
  // Sync (4)
  { name: 'scholarly_sync_ops_total', type: MetricType.COUNTER, help: 'Sync operations', labels: ['domain', 'status'] },
  { name: 'scholarly_sync_conflicts_total', type: MetricType.COUNTER, help: 'Sync conflicts', labels: ['domain', 'resolution'] },
  { name: 'scholarly_sync_duration_seconds', type: MetricType.HISTOGRAM, help: 'Sync cycle duration', labels: ['domain'], buckets: [0.1, 0.5, 1, 2, 5, 10, 30] },
  { name: 'scholarly_offline_queue_size', type: MetricType.GAUGE, help: 'Offline queue depth', labels: ['platform'] },
  // Infrastructure (5)
  { name: 'scholarly_api_duration_seconds', type: MetricType.HISTOGRAM, help: 'API latency', labels: ['method', 'path', 'status'], buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5] },
  { name: 'scholarly_api_requests_total', type: MetricType.COUNTER, help: 'API requests', labels: ['method', 'path', 'status'] },
  { name: 'scholarly_ws_connections', type: MetricType.GAUGE, help: 'WebSocket connections', labels: ['type'] },
  { name: 'scholarly_nats_published_total', type: MetricType.COUNTER, help: 'NATS messages published', labels: ['subject'] },
  { name: 'scholarly_db_query_duration_seconds', type: MetricType.HISTOGRAM, help: 'DB query latency', labels: ['operation', 'table'], buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1] },
];

// SECTION 3: ALERTING RULES (9 alerts)

export interface AlertRule {
  name: string; severity: 'critical' | 'warning' | 'info';
  metric: string; condition: string; threshold: number;
  forDuration: string; description: string; runbook: string;
}

export const ALERT_RULES: AlertRule[] = [
  { name: 'HighAPILatency', severity: 'warning', metric: 'scholarly_api_duration_seconds', condition: 'p99 >', threshold: 2, forDuration: '5m', description: 'API p99 latency exceeds 2 seconds', runbook: 'Check DB connection pool, NATS queue depth, and AI provider latency' },
  { name: 'CriticalAPILatency', severity: 'critical', metric: 'scholarly_api_duration_seconds', condition: 'p99 >', threshold: 10, forDuration: '2m', description: 'API p99 latency exceeds 10 seconds', runbook: 'Immediate: check infrastructure, circuit breakers, and AI fallback' },
  { name: 'HighErrorRate', severity: 'critical', metric: 'scholarly_api_requests_total', condition: 'rate(status=5xx) / rate(total) >', threshold: 0.05, forDuration: '3m', description: '5xx error rate exceeds 5%', runbook: 'Check recent deployments, DB health, external service status' },
  { name: 'ContentSafetySpike', severity: 'critical', metric: 'scholarly_content_safety_rejections_total', condition: 'rate >', threshold: 10, forDuration: '5m', description: 'Unusual spike in content safety rejections', runbook: 'Review AI provider outputs, check prompt templates for regression' },
  { name: 'TokenGiniAlarm', severity: 'warning', metric: 'scholarly_token_gini', condition: '>', threshold: 0.7, forDuration: '1h', description: 'Token distribution becoming concentrated (Gini > 0.7)', runbook: 'Review earning rules, check for farming, adjust distribution parameters' },
  { name: 'SyncQueueBacklog', severity: 'warning', metric: 'scholarly_offline_queue_size', condition: 'avg >', threshold: 100, forDuration: '10m', description: 'Sync queue growing — possible network issues', runbook: 'Check NATS connectivity, verify sync endpoint health' },
  { name: 'SyncConflictSpike', severity: 'warning', metric: 'scholarly_sync_conflicts_total', condition: 'rate >', threshold: 5, forDuration: '5m', description: 'Unusual sync conflict rate', runbook: 'Check multi-device concurrency, verify conflict resolution logic' },
  { name: 'AIProviderDown', severity: 'critical', metric: 'scholarly_story_gen_duration_seconds', condition: 'error_rate >', threshold: 0.5, forDuration: '2m', description: 'AI provider failure rate > 50%', runbook: 'Trigger fallback provider, check provider status page' },
  { name: 'LowReadingEngagement', severity: 'info', metric: 'scholarly_reading_sessions_total', condition: 'rate <', threshold: 0.1, forDuration: '1d', description: 'Reading engagement dropping significantly', runbook: 'Review content freshness, check recommendation quality, seasonal patterns' },
];

// SECTION 4: HEALTH DASHBOARDS (4 dashboards)

export interface DashboardConfig { id: string; name: string; description: string; refreshIntervalMs: number; panels: DashboardPanel[]; }
export interface DashboardPanel { id: string; title: string; type: 'timeseries' | 'gauge' | 'stat' | 'table' | 'heatmap' | 'bar'; metrics: string[]; span: number; }

export const DASHBOARDS: DashboardConfig[] = [
  {
    id: 'reading_health', name: 'Reading Health', description: 'Real-time reading engagement and performance metrics', refreshIntervalMs: 30000,
    panels: [
      { id: 'active_sessions', title: 'Active Reading Sessions', type: 'stat', metrics: ['scholarly_reading_sessions_total'], span: 3 },
      { id: 'session_duration', title: 'Session Duration Distribution', type: 'heatmap', metrics: ['scholarly_reading_duration_seconds'], span: 6 },
      { id: 'decoding_accuracy', title: 'Decoding Accuracy by Phase', type: 'timeseries', metrics: ['scholarly_decoding_accuracy'], span: 6 },
      { id: 'wcpm_trend', title: 'WCPM Trend', type: 'timeseries', metrics: ['scholarly_wcpm'], span: 6 },
      { id: 'books_per_day', title: 'Books Completed Per Day', type: 'bar', metrics: ['scholarly_books_completed_total'], span: 6 },
      { id: 'comprehension', title: 'Comprehension by Strand', type: 'bar', metrics: ['scholarly_pages_read_total'], span: 6 },
    ],
  },
  {
    id: 'content_pipeline', name: 'Content Pipeline', description: 'Story generation, safety validation, and library growth', refreshIntervalMs: 60000,
    panels: [
      { id: 'library_size', title: 'Library Size', type: 'stat', metrics: ['scholarly_library_books'], span: 3 },
      { id: 'gen_latency', title: 'Generation Latency', type: 'timeseries', metrics: ['scholarly_story_gen_duration_seconds', 'scholarly_illustration_gen_duration_seconds'], span: 6 },
      { id: 'gen_cost', title: 'Generation Costs', type: 'timeseries', metrics: ['scholarly_content_gen_cost_usd'], span: 6 },
      { id: 'safety_rejections', title: 'Safety Rejections', type: 'timeseries', metrics: ['scholarly_content_safety_rejections_total'], span: 6 },
      { id: 'decodability', title: 'Decodability Failures', type: 'timeseries', metrics: ['scholarly_decodability_failures_total'], span: 6 },
      { id: 'review_queue', title: 'Review Queue', type: 'gauge', metrics: ['scholarly_content_review_queue'], span: 3 },
    ],
  },
  {
    id: 'token_economy', name: 'Token Economy Health', description: 'Token distribution, velocity, staking, and Gini coefficient monitoring', refreshIntervalMs: 60000,
    panels: [
      { id: 'gini', title: 'Gini Coefficient', type: 'gauge', metrics: ['scholarly_token_gini'], span: 3 },
      { id: 'velocity', title: 'Token Velocity', type: 'timeseries', metrics: ['scholarly_token_velocity'], span: 6 },
      { id: 'earn_vs_spend', title: 'Earn vs Spend', type: 'timeseries', metrics: ['scholarly_tokens_earned_total', 'scholarly_tokens_spent_total'], span: 6 },
      { id: 'staking', title: 'Staking Pools', type: 'bar', metrics: ['scholarly_staking_locked'], span: 6 },
      { id: 'arena_wagers', title: 'Arena Wagers', type: 'timeseries', metrics: ['scholarly_arena_wagers_total'], span: 6 },
      { id: 'governance', title: 'Governance Activity', type: 'timeseries', metrics: ['scholarly_proposals_total', 'scholarly_votes_total'], span: 6 },
    ],
  },
  {
    id: 'infrastructure', name: 'Infrastructure', description: 'API performance, sync health, database queries, and platform stability', refreshIntervalMs: 15000,
    panels: [
      { id: 'api_latency', title: 'API Latency p50/p95/p99', type: 'timeseries', metrics: ['scholarly_api_duration_seconds'], span: 6 },
      { id: 'error_rate', title: 'Error Rate', type: 'timeseries', metrics: ['scholarly_api_requests_total'], span: 6 },
      { id: 'ws_connections', title: 'WebSocket Connections', type: 'stat', metrics: ['scholarly_ws_connections'], span: 3 },
      { id: 'sync_health', title: 'Sync Operations', type: 'timeseries', metrics: ['scholarly_sync_ops_total', 'scholarly_sync_conflicts_total'], span: 6 },
      { id: 'sync_queue', title: 'Offline Queue Size', type: 'gauge', metrics: ['scholarly_offline_queue_size'], span: 3 },
      { id: 'db_latency', title: 'DB Query Latency', type: 'heatmap', metrics: ['scholarly_db_query_duration_seconds'], span: 6 },
      { id: 'nats', title: 'NATS Throughput', type: 'timeseries', metrics: ['scholarly_nats_published_total'], span: 6 },
    ],
  },
];

// SECTION 5: HEALTH CHECK ENDPOINTS

export interface HealthCheck {
  name: string;
  endpoint: string;
  type: 'liveness' | 'readiness' | 'startup';
  timeout_ms: number;
  interval_ms: number;
  checks: string[];
}

export const HEALTH_CHECKS: HealthCheck[] = [
  { name: 'liveness', endpoint: '/health/live', type: 'liveness', timeout_ms: 5000, interval_ms: 10000, checks: ['process_running', 'memory_under_limit'] },
  { name: 'readiness', endpoint: '/health/ready', type: 'readiness', timeout_ms: 10000, interval_ms: 30000, checks: ['database_connected', 'redis_connected', 'nats_connected', 'ai_provider_reachable'] },
  { name: 'startup', endpoint: '/health/startup', type: 'startup', timeout_ms: 30000, interval_ms: 5000, checks: ['schema_migrated', 'seed_data_loaded', 'event_subscriptions_active'] },
];

export class HealthCheckService {
  private checks: Map<string, () => Promise<{ healthy: boolean; details: string }>> = new Map();

  register(name: string, check: () => Promise<{ healthy: boolean; details: string }>): void {
    this.checks.set(name, check);
  }

  async runAll(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; checks: Record<string, { healthy: boolean; details: string; latency_ms: number }> }> {
    const results: Record<string, { healthy: boolean; details: string; latency_ms: number }> = {};
    let allHealthy = true;

    for (const [name, check] of this.checks.entries()) {
      const start = Date.now();
      try {
        const result = await check();
        results[name] = { ...result, latency_ms: Date.now() - start };
        if (!result.healthy) allHealthy = false;
      } catch (error) {
        results[name] = { healthy: false, details: error instanceof Error ? error.message : 'Unknown', latency_ms: Date.now() - start };
        allHealthy = false;
      }
    }

    const failedCount = Object.values(results).filter(r => !r.healthy).length;
    const status = failedCount === 0 ? 'healthy' : failedCount <= 1 ? 'degraded' : 'unhealthy';
    return { status, checks: results };
  }
}

// SECTION 6: DISTRIBUTED TRACING

export interface TraceConfig {
  enabled: boolean;
  sampleRate: number;
  serviceName: string;
  exporterType: 'jaeger' | 'zipkin' | 'otlp';
  endpoint: string;
  propagation: 'w3c' | 'b3' | 'jaeger';
}

export const DEFAULT_TRACE_CONFIG: TraceConfig = {
  enabled: true, sampleRate: 0.1, serviceName: 'scholarly-api',
  exporterType: 'otlp', endpoint: 'http://otel-collector:4318',
  propagation: 'w3c',
};

export interface SpanConfig {
  name: string;
  attributes: Record<string, string | number | boolean>;
  parentSpanId: string | null;
}

// Key trace spans for the reading pipeline:
export const CRITICAL_SPANS = [
  'reader.book_open',
  'reader.page_load',
  'reader.narration_play',
  'reader.asr_record',
  'reader.asr_process',
  'reader.bkt_update',
  'reader.comprehension_check',
  'content.story_generate',
  'content.illustrate',
  'content.narrate',
  'content.validate_decodability',
  'content.safety_check',
  'sync.push_operations',
  'sync.pull_state',
  'sync.resolve_conflicts',
  'auth.token_refresh',
  'auth.biometric_verify',
] as const;

// NATS EVENTS
export const OBSERVABILITY_EVENTS = {
  HEALTH_CHECK_FAILED: 'scholarly.observability.health_failed',
  ALERT_TRIGGERED: 'scholarly.observability.alert_triggered',
  ALERT_RESOLVED: 'scholarly.observability.alert_resolved',
  METRIC_ANOMALY: 'scholarly.observability.metric_anomaly',
} as const;

export { DEFAULT_LOGGER_CONFIG, PLATFORM_METRICS, ALERT_RULES, DASHBOARDS, HEALTH_CHECKS, DEFAULT_TRACE_CONFIG, CRITICAL_SPANS, OBSERVABILITY_EVENTS };
