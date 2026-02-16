// ============================================================================
// SCHOLARLY PLATFORM — Sprint 24, Path B
// Monitoring, Alerting & Observability
// ============================================================================
//
// Sprints 19–23 built the railway — the track (database), the stations
// (API gateway), the signalling system (NATS), and the timetable (CI/CD).
// Sprint 24 Path B installs the control room: the wall of screens showing
// every train's position, speed, and health in real time. Without this
// control room, the railway runs blind — the first indication of trouble
// is angry passengers, not a warning light on a dashboard.
//
// The observability stack follows the "three pillars" model:
//
//   1. METRICS (Grafana dashboards)
//      What is happening right now? API latency percentiles, database query
//      performance, cache hit ratios, content generation costs, user engagement.
//      Five dashboards cover the full operational picture.
//
//   2. LOGS (Structured logging pipeline)
//      What happened in the past? Every request carries a correlation ID from
//      API Gateway through NATS events to database queries, creating a traceable
//      thread through the entire system. Like a detective following breadcrumbs
//      through a crime scene — except the "crime" is a slow API response.
//
//   3. ALERTS (PagerDuty integration)
//      When should humans intervene? Critical alerts (API P95 > 2s, error rate
//      > 5%, database pool > 80%) page the on-call engineer. Warning alerts
//      (generation cost > $2/book, auth failure > 10%) create Slack notifications.
//      The distinction: critical means "the house is on fire," warning means
//      "the smoke detector battery is low."
//
// Plus a fourth domain-specific pillar:
//
//   4. COST TRACKING (AI provider spend dashboard)
//      How much is the AI spending? Real-time Claude, GPT Image, and ElevenLabs
//      cost tracking with budget alerts. Per-book cost breakdown enables pricing
//      decisions and identifies generation configurations that are cost outliers.
//
// Consumes from prior sprints:
//   - Staging environment from Sprint 23 (B23-001) — deploy monitoring into
//   - ECS service from Sprint 23 (B23-002) — container metrics source
//   - API Gateway from Sprint 21 (B21-002) — request metrics source
//   - NATS from Sprint 22 (B22-001) — event throughput metrics
//   - RDS from Sprint 19 (B19-002) — database performance metrics
//   - Redis from Sprint 19 (B19-003) — cache metrics
//   - CloudFront from Sprint 20 (B20-002) — CDN metrics
//   - AI provider cost data from Sprints 19-21 (narrative, illustration, audio)
//
// Produces for future sprints:
//   - Sprint 25 consumes dashboards for load test analysis
//   - Sprint 26 uses alerts for beta launch health monitoring
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ============================================================================
// Section 1: Dashboard Definitions
// ============================================================================
// Grafana dashboards are defined as code (JSON models) that can be
// provisioned via Terraform. Each dashboard targets a specific audience
// and operational concern. Think of them as different views of the same
// railway: the driver sees speed and signals, the dispatcher sees train
// positions and schedules, the finance team sees ticket revenue and costs.

export interface GrafanaDashboard {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly tags: string[];
  readonly refresh: string;            // Auto-refresh interval
  readonly timeRange: string;          // Default time window
  readonly panels: DashboardPanel[];
  readonly variables: DashboardVariable[];
}

export interface DashboardPanel {
  readonly id: number;
  readonly title: string;
  readonly type: 'timeseries' | 'stat' | 'gauge' | 'table' | 'heatmap' | 'barchart' | 'piechart' | 'logs';
  readonly description: string;
  readonly gridPos: { x: number; y: number; w: number; h: number };
  readonly targets: PanelTarget[];
  readonly thresholds?: PanelThreshold[];
  readonly unit?: string;
}

export interface PanelTarget {
  readonly datasource: 'prometheus' | 'cloudwatch' | 'elasticsearch' | 'postgres';
  readonly expr?: string;              // PromQL for Prometheus
  readonly namespace?: string;         // CloudWatch namespace
  readonly metricName?: string;        // CloudWatch metric
  readonly dimensions?: Record<string, string>;
  readonly query?: string;             // SQL or Elasticsearch query
  readonly legendFormat?: string;
  readonly refId: string;
}

export interface PanelThreshold {
  readonly value: number;
  readonly color: 'green' | 'yellow' | 'orange' | 'red';
  readonly label?: string;
}

export interface DashboardVariable {
  readonly name: string;
  readonly type: 'query' | 'custom' | 'interval';
  readonly options?: string[];
  readonly query?: string;
  readonly default?: string;
}

// ── Dashboard 1: API Performance ────────────────────────────
// The driver's dashboard — shows real-time API health at a glance.
// Consumed by Sprint 25 during load testing to validate P95 targets.

export const API_PERFORMANCE_DASHBOARD: GrafanaDashboard = {
  id: 'scholarly-api-performance',
  title: 'API Performance',
  description: 'Real-time API latency, throughput, and error rates. P50/P95/P99 latency by endpoint, request volume, and 4xx/5xx breakdown.',
  tags: ['api', 'performance', 'sla'],
  refresh: '10s',
  timeRange: '1h',
  variables: [
    { name: 'environment', type: 'custom', options: ['staging', 'production'], default: 'staging' },
    { name: 'endpoint', type: 'query', query: 'label_values(http_request_duration_seconds_bucket, handler)' },
  ],
  panels: [
    {
      id: 1, title: 'Request Rate', type: 'timeseries',
      description: 'Total HTTP requests per second across all endpoints',
      gridPos: { x: 0, y: 0, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(rate(http_requests_total{environment="$environment"}[5m]))',
        legendFormat: 'Total RPS',
      }],
    },
    {
      id: 2, title: 'Error Rate', type: 'stat',
      description: 'Percentage of 5xx responses in the last 5 minutes',
      gridPos: { x: 12, y: 0, w: 6, h: 4 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(rate(http_requests_total{environment="$environment",status=~"5.."}[5m])) / sum(rate(http_requests_total{environment="$environment"}[5m])) * 100',
        legendFormat: 'Error %',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 1, color: 'yellow' },
        { value: 5, color: 'red', label: 'CRITICAL' },
      ],
      unit: 'percent',
    },
    {
      id: 3, title: 'P95 Latency by Endpoint', type: 'timeseries',
      description: 'Response time at the 95th percentile — the "worst case for most users"',
      gridPos: { x: 0, y: 8, w: 24, h: 10 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{environment="$environment",handler=~"$endpoint"}[5m])) by (le, handler))',
        legendFormat: '{{handler}} P95',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 0.2, color: 'yellow', label: 'Target: 200ms' },
        { value: 2, color: 'red', label: 'SLA breach: 2s' },
      ],
      unit: 's',
    },
    {
      id: 4, title: 'Latency Heatmap', type: 'heatmap',
      description: 'Distribution of response times — reveals bimodal patterns or long tails',
      gridPos: { x: 0, y: 18, w: 24, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(increase(http_request_duration_seconds_bucket{environment="$environment"}[1m])) by (le)',
      }],
    },
    {
      id: 5, title: 'Active Connections', type: 'gauge',
      description: 'Current active HTTP connections to the API',
      gridPos: { x: 12, y: 4, w: 6, h: 4 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(http_connections_active{environment="$environment"})',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 500, color: 'yellow' },
        { value: 1000, color: 'red' },
      ],
    },
    {
      id: 6, title: 'Status Code Breakdown', type: 'piechart',
      description: 'Distribution of HTTP status codes',
      gridPos: { x: 18, y: 0, w: 6, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(increase(http_requests_total{environment="$environment"}[1h])) by (status)',
        legendFormat: 'HTTP {{status}}',
      }],
    },
  ],
};

// ── Dashboard 2: Database Health ────────────────────────────
// The engine room dashboard — database is the beating heart.

export const DATABASE_HEALTH_DASHBOARD: GrafanaDashboard = {
  id: 'scholarly-database-health',
  title: 'Database Health',
  description: 'RDS PostgreSQL performance: query latency, connection pool utilisation, replication lag, storage, and slow query analysis.',
  tags: ['database', 'rds', 'postgresql'],
  refresh: '30s',
  timeRange: '6h',
  variables: [
    { name: 'environment', type: 'custom', options: ['staging', 'production'], default: 'staging' },
  ],
  panels: [
    {
      id: 1, title: 'Query Latency (P95)', type: 'timeseries',
      description: 'Database query execution time at the 95th percentile',
      gridPos: { x: 0, y: 0, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'histogram_quantile(0.95, sum(rate(db_query_duration_seconds_bucket{environment="$environment"}[5m])) by (le, query_type))',
        legendFormat: '{{query_type}} P95',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 0.1, color: 'yellow', label: 'Warning: 100ms' },
        { value: 0.5, color: 'red', label: 'Critical: 500ms' },
      ],
      unit: 's',
    },
    {
      id: 2, title: 'Connection Pool', type: 'gauge',
      description: 'Active connections vs pool maximum — exceeding 80% triggers an alert',
      gridPos: { x: 12, y: 0, w: 6, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: '(sum(db_pool_active_connections{environment="$environment"}) / sum(db_pool_max_connections{environment="$environment"})) * 100',
        legendFormat: 'Pool Usage',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 60, color: 'yellow' },
        { value: 80, color: 'red', label: 'CRITICAL: 80%' },
      ],
      unit: 'percent',
    },
    {
      id: 3, title: 'Queries per Second', type: 'timeseries',
      description: 'Query throughput by type (SELECT, INSERT, UPDATE, DELETE)',
      gridPos: { x: 0, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(rate(db_queries_total{environment="$environment"}[5m])) by (query_type)',
        legendFormat: '{{query_type}}',
      }],
    },
    {
      id: 4, title: 'Slow Queries (>100ms)', type: 'table',
      description: 'Recent queries exceeding the 100ms threshold',
      gridPos: { x: 0, y: 16, w: 24, h: 8 },
      targets: [{
        datasource: 'postgres', refId: 'A',
        query: "SELECT query, calls, mean_exec_time, total_exec_time FROM pg_stat_statements WHERE mean_exec_time > 100 ORDER BY mean_exec_time DESC LIMIT 20",
      }],
    },
    {
      id: 5, title: 'Storage Usage', type: 'timeseries',
      description: 'Database disk usage trending — alerts at 85%',
      gridPos: { x: 12, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'cloudwatch', refId: 'A',
        namespace: 'AWS/RDS',
        metricName: 'FreeStorageSpace',
        dimensions: { DBInstanceIdentifier: 'scholarly-$environment' },
        legendFormat: 'Free Storage',
      }],
    },
    {
      id: 6, title: 'Replication Lag', type: 'stat',
      description: 'Read replica lag behind primary (production only)',
      gridPos: { x: 18, y: 0, w: 6, h: 8 },
      targets: [{
        datasource: 'cloudwatch', refId: 'A',
        namespace: 'AWS/RDS',
        metricName: 'ReplicaLag',
        dimensions: { DBInstanceIdentifier: 'scholarly-$environment-replica' },
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 5, color: 'yellow' },
        { value: 30, color: 'red' },
      ],
      unit: 's',
    },
  ],
};

// ── Dashboard 3: Content Generation ─────────────────────────
// The factory floor dashboard — how the AI production line is performing.

export const CONTENT_GENERATION_DASHBOARD: GrafanaDashboard = {
  id: 'scholarly-content-generation',
  title: 'Content Generation',
  description: 'Storybook generation pipeline performance: success rates, generation times, queue depth, and cost per stage.',
  tags: ['content', 'generation', 'ai', 'pipeline'],
  refresh: '30s',
  timeRange: '24h',
  variables: [
    { name: 'environment', type: 'custom', options: ['staging', 'production'], default: 'staging' },
    { name: 'stage', type: 'custom', options: ['narrative', 'illustration', 'narration', 'validation'] },
  ],
  panels: [
    {
      id: 1, title: 'Pipeline Success Rate', type: 'stat',
      description: 'Percentage of storybooks completing the full pipeline (narrative + illustration + audio)',
      gridPos: { x: 0, y: 0, w: 6, h: 6 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: '(sum(rate(storybook_pipeline_completed_total{environment="$environment"}[1h])) / sum(rate(storybook_pipeline_started_total{environment="$environment"}[1h]))) * 100',
      }],
      thresholds: [
        { value: 0, color: 'red' },
        { value: 80, color: 'yellow' },
        { value: 95, color: 'green' },
      ],
      unit: 'percent',
    },
    {
      id: 2, title: 'Generation Time by Stage', type: 'timeseries',
      description: 'Time to complete each pipeline stage',
      gridPos: { x: 6, y: 0, w: 18, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'histogram_quantile(0.95, sum(rate(storybook_stage_duration_seconds_bucket{environment="$environment"}[15m])) by (le, stage))',
        legendFormat: '{{stage}} P95',
      }],
      unit: 's',
    },
    {
      id: 3, title: 'Queue Depth', type: 'timeseries',
      description: 'Stories waiting in each pipeline stage',
      gridPos: { x: 0, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(storybook_queue_depth{environment="$environment"}) by (stage)',
        legendFormat: '{{stage}} queue',
      }],
    },
    {
      id: 4, title: 'Cost per Book', type: 'timeseries',
      description: 'Average API cost to generate one complete storybook',
      gridPos: { x: 12, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(rate(ai_provider_cost_total{environment="$environment"}[1h])) by (provider) / sum(rate(storybook_pipeline_completed_total{environment="$environment"}[1h]))',
        legendFormat: '{{provider}}',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 1.5, color: 'yellow', label: 'Budget target: $1.53' },
        { value: 2, color: 'red', label: 'Cost alert: $2' },
      ],
      unit: 'currencyUSD',
    },
    {
      id: 5, title: 'Decodability Scores', type: 'heatmap',
      description: 'Distribution of decodability scores for generated stories',
      gridPos: { x: 0, y: 16, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(increase(storybook_decodability_score_bucket{environment="$environment"}[1h])) by (le)',
      }],
    },
    {
      id: 6, title: 'Regeneration Rate', type: 'stat',
      description: 'Stories that failed decodability and were regenerated',
      gridPos: { x: 12, y: 16, w: 6, h: 4 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(rate(storybook_regeneration_total{environment="$environment"}[1h])) / sum(rate(storybook_pipeline_started_total{environment="$environment"}[1h])) * 100',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 15, color: 'yellow' },
        { value: 30, color: 'red' },
      ],
      unit: 'percent',
    },
  ],
};

// ── Dashboard 4: User Engagement ────────────────────────────
// The passenger satisfaction dashboard — are children reading?

export const USER_ENGAGEMENT_DASHBOARD: GrafanaDashboard = {
  id: 'scholarly-user-engagement',
  title: 'User Engagement',
  description: 'Reading activity: active readers, books read, completion rates, WCPM progress, and session durations.',
  tags: ['users', 'engagement', 'reading', 'analytics'],
  refresh: '1m',
  timeRange: '7d',
  variables: [
    { name: 'environment', type: 'custom', options: ['staging', 'production'], default: 'staging' },
    { name: 'phonicsPhase', type: 'custom', options: ['1', '2', '3', '4', '5', '6', 'all'], default: 'all' },
  ],
  panels: [
    {
      id: 1, title: 'Daily Active Readers', type: 'timeseries',
      description: 'Unique learners who completed at least one reading session per day',
      gridPos: { x: 0, y: 0, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(reading_session_unique_learners{environment="$environment",period="daily"})',
        legendFormat: 'Active Readers',
      }],
    },
    {
      id: 2, title: 'Books Read Today', type: 'stat',
      description: 'Total book completions in the current day',
      gridPos: { x: 12, y: 0, w: 6, h: 4 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(increase(reading_session_completed_total{environment="$environment"}[24h]))',
      }],
    },
    {
      id: 3, title: 'Completion Rate', type: 'gauge',
      description: 'Percentage of started reading sessions that reach the final page',
      gridPos: { x: 18, y: 0, w: 6, h: 4 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: '(sum(rate(reading_session_completed_total{environment="$environment"}[24h])) / sum(rate(reading_session_started_total{environment="$environment"}[24h]))) * 100',
      }],
      thresholds: [
        { value: 0, color: 'red' },
        { value: 60, color: 'yellow' },
        { value: 80, color: 'green' },
      ],
      unit: 'percent',
    },
    {
      id: 4, title: 'Average WCPM by Phase', type: 'barchart',
      description: 'Words Correct Per Minute by phonics phase — key reading fluency metric',
      gridPos: { x: 0, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'avg(reading_session_wcpm{environment="$environment"}) by (phonics_phase)',
        legendFormat: 'Phase {{phonics_phase}}',
      }],
    },
    {
      id: 5, title: 'Session Duration Distribution', type: 'heatmap',
      description: 'How long reading sessions last — helps identify engagement patterns',
      gridPos: { x: 12, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(increase(reading_session_duration_seconds_bucket{environment="$environment"}[6h])) by (le)',
      }],
    },
    {
      id: 6, title: 'Re-read Rate', type: 'stat',
      description: 'Percentage of books read more than once — a sign of genuine engagement',
      gridPos: { x: 12, y: 4, w: 6, h: 4 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: '(sum(reading_session_reread_total{environment="$environment"}) / sum(reading_session_completed_total{environment="$environment"})) * 100',
      }],
      thresholds: [
        { value: 0, color: 'yellow' },
        { value: 20, color: 'green', label: 'Healthy re-read rate' },
      ],
      unit: 'percent',
    },
  ],
};

// ── Dashboard 5: AI Provider Cost Tracking ──────────────────
// The finance dashboard — the one the CFO checks daily.

export const COST_TRACKING_DASHBOARD: GrafanaDashboard = {
  id: 'scholarly-cost-tracking',
  title: 'AI Provider Cost Tracking',
  description: 'Real-time spend across Claude (narrative), GPT Image (illustrations), and ElevenLabs (narration). Budget alerts and per-book cost breakdown.',
  tags: ['cost', 'ai', 'budget', 'finance'],
  refresh: '5m',
  timeRange: '30d',
  variables: [
    { name: 'environment', type: 'custom', options: ['staging', 'production'], default: 'production' },
    { name: 'provider', type: 'custom', options: ['claude', 'gpt-image', 'elevenlabs', 'all'], default: 'all' },
  ],
  panels: [
    {
      id: 1, title: 'Monthly Spend by Provider', type: 'timeseries',
      description: 'Cumulative spend this month across all AI providers',
      gridPos: { x: 0, y: 0, w: 16, h: 8 },
      targets: [
        { datasource: 'prometheus', refId: 'A', expr: 'sum(increase(ai_provider_cost_total{environment="$environment",provider="claude"}[30d]))', legendFormat: 'Claude (Narrative)' },
        { datasource: 'prometheus', refId: 'B', expr: 'sum(increase(ai_provider_cost_total{environment="$environment",provider="gpt-image"}[30d]))', legendFormat: 'GPT Image (Illustration)' },
        { datasource: 'prometheus', refId: 'C', expr: 'sum(increase(ai_provider_cost_total{environment="$environment",provider="elevenlabs"}[30d]))', legendFormat: 'ElevenLabs (Narration)' },
      ],
      unit: 'currencyUSD',
    },
    {
      id: 2, title: 'Budget Utilisation', type: 'gauge',
      description: 'Percentage of monthly AI budget consumed',
      gridPos: { x: 16, y: 0, w: 8, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: '(sum(increase(ai_provider_cost_total{environment="$environment"}[30d])) / ai_monthly_budget{environment="$environment"}) * 100',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 80, color: 'yellow', label: 'Budget warning: 80%' },
        { value: 100, color: 'red', label: 'Budget exceeded' },
      ],
      unit: 'percent',
    },
    {
      id: 3, title: 'Cost per Book Trend', type: 'timeseries',
      description: 'Average total cost per generated storybook over time',
      gridPos: { x: 0, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(rate(ai_provider_cost_total{environment="$environment"}[6h])) / sum(rate(storybook_pipeline_completed_total{environment="$environment"}[6h]))',
        legendFormat: 'Avg Cost/Book',
      }],
      thresholds: [
        { value: 0, color: 'green' },
        { value: 1.53, color: 'yellow', label: 'Target max: $1.53' },
        { value: 2, color: 'red', label: 'Alert threshold: $2' },
      ],
      unit: 'currencyUSD',
    },
    {
      id: 4, title: 'Cost Breakdown per Book', type: 'piechart',
      description: 'Average proportion of cost by pipeline stage',
      gridPos: { x: 12, y: 8, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(increase(ai_provider_cost_total{environment="$environment"}[7d])) by (stage)',
        legendFormat: '{{stage}}',
      }],
      unit: 'currencyUSD',
    },
    {
      id: 5, title: 'Token Usage (Claude)', type: 'timeseries',
      description: 'Claude API token consumption — input vs output',
      gridPos: { x: 0, y: 16, w: 12, h: 8 },
      targets: [
        { datasource: 'prometheus', refId: 'A', expr: 'sum(rate(claude_tokens_total{environment="$environment",type="input"}[1h]))', legendFormat: 'Input Tokens/hr' },
        { datasource: 'prometheus', refId: 'B', expr: 'sum(rate(claude_tokens_total{environment="$environment",type="output"}[1h]))', legendFormat: 'Output Tokens/hr' },
      ],
    },
    {
      id: 6, title: 'Daily Cost Forecast', type: 'stat',
      description: 'Projected daily spend based on current rate',
      gridPos: { x: 12, y: 16, w: 12, h: 8 },
      targets: [{
        datasource: 'prometheus', refId: 'A',
        expr: 'sum(rate(ai_provider_cost_total{environment="$environment"}[1h])) * 24',
        legendFormat: 'Projected Daily',
      }],
      unit: 'currencyUSD',
    },
  ],
};

export const ALL_DASHBOARDS: GrafanaDashboard[] = [
  API_PERFORMANCE_DASHBOARD,
  DATABASE_HEALTH_DASHBOARD,
  CONTENT_GENERATION_DASHBOARD,
  USER_ENGAGEMENT_DASHBOARD,
  COST_TRACKING_DASHBOARD,
];

// ============================================================================
// Section 2: Alert Rules
// ============================================================================
// Alerts are the smoke detectors of the platform. Critical alerts are
// the fire alarms — loud, immediate, someone must respond right now.
// Warning alerts are the CO detectors — concerning, not yet emergency,
// but something that needs attention before it becomes one.

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertChannel = 'pagerduty' | 'slack' | 'email';

export interface AlertRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: AlertSeverity;
  readonly channels: AlertChannel[];
  readonly expr: string;               // PromQL or CloudWatch expression
  readonly for: string;                // Duration threshold must be exceeded
  readonly labels: Record<string, string>;
  readonly annotations: {
    readonly summary: string;
    readonly description: string;
    readonly runbook?: string;
  };
}

export const ALERT_RULES: AlertRule[] = [
  // ── Critical Alerts (page on-call) ──────────────────────
  {
    id: 'scholarly-api-p95-latency',
    name: 'API P95 Latency > 2s',
    description: 'The 95th percentile response time exceeds 2 seconds — most users experience degraded performance',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
    expr: 'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le)) > 2',
    for: '5m',
    labels: { team: 'platform', component: 'api' },
    annotations: {
      summary: 'API P95 latency exceeds 2s SLA',
      description: 'P95 latency is {{ $value | humanizeDuration }}. Check for slow database queries, upstream provider timeouts, or resource exhaustion.',
      runbook: 'https://runbooks.scholarly.app/api-latency',
    },
  },
  {
    id: 'scholarly-error-rate',
    name: 'API Error Rate > 5%',
    description: 'More than 5% of requests returning 5xx — systemic failure',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
    expr: '(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100 > 5',
    for: '3m',
    labels: { team: 'platform', component: 'api' },
    annotations: {
      summary: 'API error rate exceeds 5%',
      description: 'Error rate is {{ $value | printf "%.1f" }}%. Check ECS task health, database connectivity, and recent deployments.',
      runbook: 'https://runbooks.scholarly.app/error-rate',
    },
  },
  {
    id: 'scholarly-db-pool-exhaustion',
    name: 'Database Connection Pool > 80%',
    description: 'Connection pool approaching exhaustion — new requests will start queuing',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
    expr: '(sum(db_pool_active_connections) / sum(db_pool_max_connections)) * 100 > 80',
    for: '5m',
    labels: { team: 'platform', component: 'database' },
    annotations: {
      summary: 'Database connection pool at {{ $value | printf "%.0f" }}%',
      description: 'Approaching pool exhaustion. Check for connection leaks, long-running transactions, or scale connection pool size.',
      runbook: 'https://runbooks.scholarly.app/db-pool',
    },
  },
  {
    id: 'scholarly-disk-usage',
    name: 'Disk Usage > 85%',
    description: 'Storage is running out — database writes will fail',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
    expr: '(1 - (node_filesystem_avail_bytes / node_filesystem_size_bytes)) * 100 > 85',
    for: '10m',
    labels: { team: 'platform', component: 'storage' },
    annotations: {
      summary: 'Disk usage at {{ $value | printf "%.0f" }}%',
      description: 'Increase storage allocation or clean up temporary files.',
      runbook: 'https://runbooks.scholarly.app/disk-usage',
    },
  },
  {
    id: 'scholarly-nats-consumer-lag',
    name: 'NATS Consumer Lag > 10,000',
    description: 'Event processing is falling behind — downstream services degraded',
    severity: 'critical',
    channels: ['pagerduty', 'slack'],
    expr: 'sum(nats_consumer_num_pending) by (stream, consumer) > 10000',
    for: '5m',
    labels: { team: 'platform', component: 'messaging' },
    annotations: {
      summary: 'NATS consumer {{ $labels.consumer }} on stream {{ $labels.stream }} has {{ $value }} pending messages',
      description: 'Check consumer health, increase consumers, or investigate processing errors.',
      runbook: 'https://runbooks.scholarly.app/nats-lag',
    },
  },

  // ── Warning Alerts (Slack notification) ─────────────────
  {
    id: 'scholarly-generation-cost',
    name: 'Generation Cost per Book > $2',
    description: 'Individual book generation costs exceed budget target — check prompt length, retries, or image count',
    severity: 'warning',
    channels: ['slack'],
    expr: '(sum(rate(ai_provider_cost_total[1h])) / sum(rate(storybook_pipeline_completed_total[1h]))) > 2',
    for: '30m',
    labels: { team: 'content', component: 'generation' },
    annotations: {
      summary: 'Average generation cost is ${{ $value | printf "%.2f" }}/book (target: $1.53)',
      description: 'Review generation parameters, retry rates, and prompt token usage.',
    },
  },
  {
    id: 'scholarly-auth-failure-rate',
    name: 'Auth Failure Rate > 10%',
    description: 'High authentication failure rate — possible brute force attack or misconfiguration',
    severity: 'warning',
    channels: ['slack'],
    expr: '(sum(rate(auth_failures_total[5m])) / sum(rate(auth_attempts_total[5m]))) * 100 > 10',
    for: '10m',
    labels: { team: 'security', component: 'auth' },
    annotations: {
      summary: 'Auth failure rate at {{ $value | printf "%.0f" }}%',
      description: 'Check for credential stuffing, expired tokens, or Auth0 configuration issues.',
    },
  },
  {
    id: 'scholarly-budget-80',
    name: 'AI Budget > 80%',
    description: 'Monthly AI spend has reached 80% of allocation',
    severity: 'warning',
    channels: ['slack', 'email'],
    expr: '(sum(increase(ai_provider_cost_total[30d])) / ai_monthly_budget) * 100 > 80',
    for: '1h',
    labels: { team: 'finance', component: 'cost' },
    annotations: {
      summary: 'AI spend at {{ $value | printf "%.0f" }}% of monthly budget',
      description: 'Review generation volumes and consider throttling non-essential generation.',
    },
  },
  {
    id: 'scholarly-budget-100',
    name: 'AI Budget Exceeded',
    description: 'Monthly AI spend has exceeded the allocated budget',
    severity: 'critical',
    channels: ['pagerduty', 'slack', 'email'],
    expr: '(sum(increase(ai_provider_cost_total[30d])) / ai_monthly_budget) * 100 > 100',
    for: '15m',
    labels: { team: 'finance', component: 'cost' },
    annotations: {
      summary: 'AI budget exceeded: {{ $value | printf "%.0f" }}% of allocation',
      description: 'Immediate action required. Consider pausing non-critical generation or increasing budget allocation.',
      runbook: 'https://runbooks.scholarly.app/budget-exceeded',
    },
  },
  {
    id: 'scholarly-cdn-miss-rate',
    name: 'CDN Cache Miss Rate > 20%',
    description: 'CloudFront is missing cache too often — origin load increasing',
    severity: 'warning',
    channels: ['slack'],
    expr: '(1 - (sum(rate(cloudfront_cache_hits_total[1h])) / sum(rate(cloudfront_requests_total[1h])))) * 100 > 20',
    for: '30m',
    labels: { team: 'platform', component: 'cdn' },
    annotations: {
      summary: 'CDN cache miss rate at {{ $value | printf "%.0f" }}% (target: <5%)',
      description: 'Check cache headers on S3 objects, CloudFront behaviours, or surge in new content.',
    },
  },
  {
    id: 'scholarly-decodability-failures',
    name: 'Decodability Failure Rate > 20%',
    description: 'More than 20% of generated stories fail decodability validation — prompt engineering issue',
    severity: 'warning',
    channels: ['slack'],
    expr: '(sum(rate(storybook_regeneration_total[1h])) / sum(rate(storybook_pipeline_started_total[1h]))) * 100 > 20',
    for: '1h',
    labels: { team: 'content', component: 'generation' },
    annotations: {
      summary: 'Decodability failure rate at {{ $value | printf "%.0f" }}%',
      description: 'Review narrative generation prompts, target GPC sets, and Claude model version.',
    },
  },
];

// ============================================================================
// Section 3: Structured Logging Pipeline
// ============================================================================
// The correlation ID is the thread that connects every log entry across
// the entire request lifecycle. It's generated at the API Gateway (or by
// the first service to handle the request) and propagated through every
// service call, NATS event, and database query. When debugging a slow
// request, you search by correlation ID and see the complete story:
// "API Gateway received request → Auth middleware validated JWT → Story
// service queried database (took 150ms) → Published NATS event → Response
// sent (total 180ms)." Without correlation IDs, you're searching for a
// specific grain of sand on the beach.

export interface LogEntry {
  readonly timestamp: string;
  readonly level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  readonly service: string;
  readonly message: string;
  readonly correlationId: string;
  readonly requestId?: string;
  readonly userId?: string;
  readonly tenantId?: string;
  readonly sessionId?: string;
  readonly traceId?: string;
  readonly spanId?: string;
  readonly duration_ms?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface LogPipelineConfig {
  readonly environment: string;
  readonly logGroupPrefix: string;
  readonly retentionDays: number;
  readonly enableInsights: boolean;        // CloudWatch Insights
  readonly enableElasticsearch: boolean;   // Ship to ES for advanced search
  readonly elasticsearchEndpoint?: string;
  readonly sensitiveFields: string[];      // Fields to redact in logs
}

export const DEFAULT_LOG_PIPELINE_CONFIG: LogPipelineConfig = {
  environment: 'staging',
  logGroupPrefix: '/scholarly/staging',
  retentionDays: 30,
  enableInsights: true,
  enableElasticsearch: false,            // Enable in production
  sensitiveFields: ['password', 'token', 'apiKey', 'authorization', 'cookie', 'ssn'],
};

export class StructuredLogService extends ScholarlyBaseService {
  private readonly config: LogPipelineConfig;
  private readonly sensitiveFieldSet: Set<string>;

  constructor(config: LogPipelineConfig = DEFAULT_LOG_PIPELINE_CONFIG) {
    super(null as any, 'StructuredLogService');
    this.config = config;
    this.sensitiveFieldSet = new Set(config.sensitiveFields.map(f => f.toLowerCase()));
  }

  /** Create a structured log entry with automatic correlation ID propagation */
  createEntry(params: {
    level: LogEntry['level'];
    message: string;
    correlationId: string;
    service: string;
    metadata?: Record<string, unknown>;
    duration_ms?: number;
    userId?: string;
    tenantId?: string;
  }): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: params.level,
      service: params.service,
      message: params.message,
      correlationId: params.correlationId,
      userId: params.userId,
      tenantId: params.tenantId,
      duration_ms: params.duration_ms,
      metadata: params.metadata ? this.redactSensitive(params.metadata) : undefined,
    };
  }

  /** Redact sensitive fields from metadata before logging */
  private redactSensitive(metadata: Record<string, unknown>): Record<string, unknown> {
    const redacted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(metadata)) {
      if (this.sensitiveFieldSet.has(key.toLowerCase())) {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        redacted[key] = this.redactSensitive(value as Record<string, unknown>);
      } else {
        redacted[key] = value;
      }
    }
    return redacted;
  }

  /** Generate CloudWatch Insights query for correlation ID tracing */
  generateCorrelationQuery(correlationId: string): string {
    return `fields @timestamp, @message, level, service, duration_ms
| filter correlationId = "${correlationId}"
| sort @timestamp asc
| limit 200`;
  }

  /** Generate CloudWatch Insights query for slow requests */
  generateSlowRequestQuery(thresholdMs: number): string {
    return `fields @timestamp, correlationId, service, message, duration_ms
| filter duration_ms > ${thresholdMs}
| sort duration_ms desc
| limit 50`;
  }

  /** Generate CloudWatch Insights query for error analysis */
  generateErrorAnalysisQuery(): string {
    return `fields @timestamp, correlationId, service, message, level
| filter level = "error" or level = "fatal"
| stats count() by service, message
| sort count desc
| limit 20`;
  }

  /** Generate Terraform for the logging pipeline */
  generateLogPipelineTerraform(): Result<string> {
    try {
      const tf = `# ============================================================
# Structured Logging Pipeline — ${this.config.environment}
# ============================================================
# CloudWatch log groups per service with JSON structured logging.
# Optional shipping to Elasticsearch for advanced querying.
# ============================================================

# ── Log Groups ────────────────────────────────────────────────

resource "aws_cloudwatch_log_group" "api" {
  name              = "${this.config.logGroupPrefix}/api"
  retention_in_days = ${this.config.retentionDays}
  tags = { Service = "api" }
}

resource "aws_cloudwatch_log_group" "storybook" {
  name              = "${this.config.logGroupPrefix}/storybook"
  retention_in_days = ${this.config.retentionDays}
  tags = { Service = "storybook" }
}

resource "aws_cloudwatch_log_group" "auth" {
  name              = "${this.config.logGroupPrefix}/auth"
  retention_in_days = ${this.config.retentionDays}
  tags = { Service = "auth" }
}

resource "aws_cloudwatch_log_group" "nats" {
  name              = "${this.config.logGroupPrefix}/nats"
  retention_in_days = ${this.config.retentionDays}
  tags = { Service = "nats" }
}

resource "aws_cloudwatch_log_group" "worker" {
  name              = "${this.config.logGroupPrefix}/worker"
  retention_in_days = ${this.config.retentionDays}
  tags = { Service = "worker" }
}

# ── Metric Filters ───────────────────────────────────────────
# Extract custom metrics from log entries for dashboard panels

resource "aws_cloudwatch_log_metric_filter" "api_errors" {
  name           = "scholarly-api-errors-${this.config.environment}"
  pattern        = '{ $.level = "error" }'
  log_group_name = aws_cloudwatch_log_group.api.name

  metric_transformation {
    name          = "ApiErrors"
    namespace     = "Scholarly/${this.config.environment}"
    value         = "1"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "slow_queries" {
  name           = "scholarly-slow-queries-${this.config.environment}"
  pattern        = '{ $.duration_ms > 500 && $.service = "database" }'
  log_group_name = aws_cloudwatch_log_group.api.name

  metric_transformation {
    name          = "SlowQueries"
    namespace     = "Scholarly/${this.config.environment}"
    value         = "$.duration_ms"
    default_value = "0"
  }
}

resource "aws_cloudwatch_log_metric_filter" "generation_cost" {
  name           = "scholarly-generation-cost-${this.config.environment}"
  pattern        = '{ $.service = "storybook" && $.metadata.cost > 0 }'
  log_group_name = aws_cloudwatch_log_group.storybook.name

  metric_transformation {
    name          = "GenerationCost"
    namespace     = "Scholarly/${this.config.environment}"
    value         = "$.metadata.cost"
    default_value = "0"
  }
}

# ── CloudWatch Insights ─────────────────────────────────────
${this.config.enableInsights ? `
resource "aws_cloudwatch_query_definition" "correlation_trace" {
  name            = "scholarly-correlation-trace"
  log_group_names = [
    aws_cloudwatch_log_group.api.name,
    aws_cloudwatch_log_group.storybook.name,
    aws_cloudwatch_log_group.auth.name,
    aws_cloudwatch_log_group.nats.name,
    aws_cloudwatch_log_group.worker.name,
  ]
  query_string = <<-EOF
    fields @timestamp, service, message, duration_ms, correlationId
    | filter correlationId = "$correlationId"
    | sort @timestamp asc
    | limit 200
  EOF
}

resource "aws_cloudwatch_query_definition" "error_analysis" {
  name            = "scholarly-error-analysis"
  log_group_names = [aws_cloudwatch_log_group.api.name]
  query_string = <<-EOF
    fields @timestamp, correlationId, service, message
    | filter level = "error" or level = "fatal"
    | stats count() by service, message
    | sort count desc
    | limit 20
  EOF
}
` : '# CloudWatch Insights disabled'}
`;

      return ok(tf);
    } catch (error) {
      return fail(`Log pipeline Terraform generation failed: ${error}`, 'LOG_PIPELINE_FAILED');
    }
  }
}

// ============================================================================
// Section 4: Grafana Provisioning Terraform
// ============================================================================
// Grafana dashboards are provisioned via Terraform to ensure they're
// version-controlled, reproducible, and consistent across environments.

export class GrafanaProvisioningGenerator extends ScholarlyBaseService {
  constructor() {
    super(null as any, 'GrafanaProvisioningGenerator');
  }

  generateTerraform(
    dashboards: GrafanaDashboard[],
    alertRules: AlertRule[],
    environment: string
  ): Result<Map<string, string>> {
    try {
      const files = new Map<string, string>();

      files.set('grafana-datasources.tf', this.generateDatasources(environment));
      files.set('grafana-dashboards.tf', this.generateDashboardProvisioning(dashboards, environment));
      files.set('grafana-alerts.tf', this.generateAlertProvisioning(alertRules, environment));
      files.set('grafana-notification-channels.tf', this.generateNotificationChannels(environment));

      this.log('info', 'Grafana provisioning generated', {
        environment, files: files.size,
        dashboards: dashboards.length,
        alertRules: alertRules.length,
      });

      return ok(files);
    } catch (error) {
      return fail(`Grafana provisioning generation failed: ${error}`, 'GRAFANA_GEN_FAILED');
    }
  }

  private generateDatasources(environment: string): string {
    return `# ============================================================
# Grafana Data Sources — ${environment}
# ============================================================

resource "grafana_data_source" "prometheus" {
  type = "prometheus"
  name = "Prometheus"
  url  = "http://prometheus.scholarly.${environment}.local:9090"
  is_default = true
  json_data_encoded = jsonencode({
    httpMethod = "POST"
    timeInterval = "15s"
  })
}

resource "grafana_data_source" "cloudwatch" {
  type = "cloudwatch"
  name = "CloudWatch"
  json_data_encoded = jsonencode({
    defaultRegion = "ap-southeast-2"
    authType      = "default"
  })
}

resource "grafana_data_source" "postgres" {
  type = "postgres"
  name = "PostgreSQL"
  url  = module.rds.endpoint
  json_data_encoded = jsonencode({
    sslmode = "require"
    maxOpenConns = 5
  })
  secure_json_data_encoded = jsonencode({
    password = var.db_grafana_password
  })
}
`;
  }

  private generateDashboardProvisioning(dashboards: GrafanaDashboard[], environment: string): string {
    const dashboardBlocks = dashboards.map(d => `
resource "grafana_dashboard" "${d.id.replace(/-/g, '_')}" {
  config_json = jsonencode({
    title       = "${d.title}"
    description = "${d.description}"
    tags        = ${JSON.stringify(d.tags)}
    refresh     = "${d.refresh}"
    time        = { from = "now-${d.timeRange}", to = "now" }
    panels      = ${JSON.stringify(d.panels.map(p => ({
      id: p.id, title: p.title, type: p.type, description: p.description,
      gridPos: p.gridPos,
      targets: p.targets.map(t => ({
        datasource: { type: t.datasource }, expr: t.expr || '',
        legendFormat: t.legendFormat || '', refId: t.refId,
      })),
      fieldConfig: p.thresholds ? {
        defaults: { thresholds: { steps: p.thresholds.map(t => ({ value: t.value, color: t.color })) } }
      } : undefined,
    })), null, 2)}
    templating  = { list: ${JSON.stringify(d.variables.map(v => ({
      name: v.name, type: v.type,
      options: v.options?.map(o => ({ text: o, value: o })),
      current: v.default ? { text: v.default, value: v.default } : undefined,
    })))} }
  })
  folder = grafana_folder.scholarly.id
}
`).join('\n');

    return `# ============================================================
# Grafana Dashboards — ${environment}
# ============================================================

resource "grafana_folder" "scholarly" {
  title = "Scholarly - ${environment}"
}

${dashboardBlocks}
`;
  }

  private generateAlertProvisioning(alertRules: AlertRule[], environment: string): string {
    const ruleBlocks = alertRules.map(r => `
resource "grafana_rule_group" "${r.id.replace(/-/g, '_')}" {
  org_id           = 1
  name             = "${r.name}"
  folder_uid       = grafana_folder.scholarly.uid
  interval_seconds = 60

  rule {
    name      = "${r.name}"
    condition = "A"

    data {
      ref_id = "A"
      datasource_uid = grafana_data_source.prometheus.uid
      model = jsonencode({
        expr = "${r.expr.replace(/"/g, '\\"')}"
        intervalMs = 60000
      })
    }

    for = "${r.for}"
    labels = ${JSON.stringify(r.labels)}
    annotations = ${JSON.stringify(r.annotations)}
  }
}
`).join('\n');

    return `# ============================================================
# Grafana Alert Rules — ${environment}
# ============================================================

${ruleBlocks}
`;
  }

  private generateNotificationChannels(environment: string): string {
    return `# ============================================================
# Notification Channels — ${environment}
# ============================================================

resource "grafana_contact_point" "pagerduty" {
  name = "PagerDuty - Scholarly ${environment}"
  pagerduty {
    integration_key = var.pagerduty_integration_key
    severity        = "critical"
  }
}

resource "grafana_contact_point" "slack" {
  name = "Slack - Scholarly Alerts"
  slack {
    url     = var.slack_alert_webhook_url
    channel = "#scholarly-alerts"
    title   = "{{ .CommonLabels.alertname }}"
    text    = "{{ .CommonAnnotations.summary }}"
  }
}

resource "grafana_contact_point" "email" {
  name = "Email - Scholarly Ops"
  email {
    addresses = [var.ops_email]
  }
}

resource "grafana_notification_policy" "scholarly" {
  contact_point = grafana_contact_point.slack.name

  group_by    = ["alertname", "component"]
  group_wait  = "30s"
  group_interval = "5m"
  repeat_interval = "4h"

  policy {
    matcher { label = "severity"; match = "="; value = "critical" }
    contact_point = grafana_contact_point.pagerduty.name
    continue = true
  }

  policy {
    matcher { label = "severity"; match = "="; value = "warning" }
    contact_point = grafana_contact_point.slack.name
  }
}
`;
  }
}

// ============================================================================
// Section 5: Prometheus Metrics Definition
// ============================================================================
// These are the custom metrics that the Scholarly application exposes
// on its /metrics endpoint. Prometheus scrapes this endpoint every 15
// seconds and stores the time series data that powers the dashboards.

export interface MetricDefinition {
  readonly name: string;
  readonly type: 'counter' | 'histogram' | 'gauge' | 'summary';
  readonly help: string;
  readonly labels: string[];
  readonly buckets?: number[];       // For histograms
}

export const SCHOLARLY_METRICS: MetricDefinition[] = [
  // HTTP metrics
  { name: 'http_requests_total', type: 'counter', help: 'Total HTTP requests', labels: ['method', 'handler', 'status', 'environment'] },
  { name: 'http_request_duration_seconds', type: 'histogram', help: 'HTTP request latency', labels: ['method', 'handler', 'environment'], buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10] },
  { name: 'http_connections_active', type: 'gauge', help: 'Active HTTP connections', labels: ['environment'] },

  // Database metrics
  { name: 'db_queries_total', type: 'counter', help: 'Total database queries', labels: ['query_type', 'table', 'environment'] },
  { name: 'db_query_duration_seconds', type: 'histogram', help: 'Database query latency', labels: ['query_type', 'environment'], buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1] },
  { name: 'db_pool_active_connections', type: 'gauge', help: 'Active database connections', labels: ['environment'] },
  { name: 'db_pool_max_connections', type: 'gauge', help: 'Maximum database connections', labels: ['environment'] },

  // Cache metrics
  { name: 'cache_hits_total', type: 'counter', help: 'Cache hits', labels: ['cache_type', 'environment'] },
  { name: 'cache_misses_total', type: 'counter', help: 'Cache misses', labels: ['cache_type', 'environment'] },

  // Storybook pipeline metrics
  { name: 'storybook_pipeline_started_total', type: 'counter', help: 'Storybook generation pipelines started', labels: ['environment'] },
  { name: 'storybook_pipeline_completed_total', type: 'counter', help: 'Storybook generation pipelines completed', labels: ['environment', 'status'] },
  { name: 'storybook_stage_duration_seconds', type: 'histogram', help: 'Duration of each pipeline stage', labels: ['stage', 'environment'], buckets: [1, 5, 10, 30, 60, 120, 300] },
  { name: 'storybook_queue_depth', type: 'gauge', help: 'Stories waiting in pipeline stage', labels: ['stage', 'environment'] },
  { name: 'storybook_regeneration_total', type: 'counter', help: 'Stories regenerated due to validation failure', labels: ['reason', 'environment'] },
  { name: 'storybook_decodability_score', type: 'histogram', help: 'Decodability scores of generated stories', labels: ['environment'], buckets: [0.5, 0.6, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0] },

  // AI provider metrics
  { name: 'ai_provider_cost_total', type: 'counter', help: 'Cumulative AI provider cost in USD', labels: ['provider', 'stage', 'environment'] },
  { name: 'ai_monthly_budget', type: 'gauge', help: 'Monthly AI budget allocation in USD', labels: ['environment'] },
  { name: 'claude_tokens_total', type: 'counter', help: 'Claude API tokens consumed', labels: ['type', 'environment'] },

  // Reading session metrics
  { name: 'reading_session_started_total', type: 'counter', help: 'Reading sessions started', labels: ['mode', 'environment'] },
  { name: 'reading_session_completed_total', type: 'counter', help: 'Reading sessions completed', labels: ['mode', 'environment'] },
  { name: 'reading_session_duration_seconds', type: 'histogram', help: 'Reading session duration', labels: ['mode', 'environment'], buckets: [30, 60, 120, 300, 600, 900, 1800] },
  { name: 'reading_session_wcpm', type: 'histogram', help: 'Words Correct Per Minute', labels: ['phonics_phase', 'environment'], buckets: [10, 20, 30, 50, 70, 90, 120, 150, 200] },
  { name: 'reading_session_unique_learners', type: 'gauge', help: 'Unique learners with reading sessions', labels: ['period', 'environment'] },
  { name: 'reading_session_reread_total', type: 'counter', help: 'Books read more than once', labels: ['environment'] },

  // Auth metrics
  { name: 'auth_attempts_total', type: 'counter', help: 'Authentication attempts', labels: ['method', 'environment'] },
  { name: 'auth_failures_total', type: 'counter', help: 'Authentication failures', labels: ['reason', 'environment'] },

  // CDN metrics
  { name: 'cloudfront_requests_total', type: 'counter', help: 'CloudFront total requests', labels: ['environment'] },
  { name: 'cloudfront_cache_hits_total', type: 'counter', help: 'CloudFront cache hits', labels: ['environment'] },

  // NATS metrics
  { name: 'nats_consumer_num_pending', type: 'gauge', help: 'NATS pending messages per consumer', labels: ['stream', 'consumer'] },
];
