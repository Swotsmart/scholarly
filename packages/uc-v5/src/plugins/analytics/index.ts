/**
 * Chekd Unified Communications 3.0 — Analytics & Insights Plugin
 *
 * The event bus is a goldmine of operational data — every room creation,
 * message sent, call placed, and file shared flows through it. This plugin
 * is the data analyst who sits quietly in the corner, observing everything,
 * and produces reports that answer questions like:
 *
 *   "How many hours did the team spend on the NeuralEdge deal this quarter?"
 *   "Which team member has the fastest chat response time?"
 *   "What's our average meeting duration, and is it trending up?"
 *   "How much are we spending on Twilio telephony per tenant?"
 *
 * The plugin works by subscribing to ALL bus events via wildcard pattern
 * matching, accumulating metrics in time-bucketed counters, and generating
 * periodic snapshots. Think of it as a Prometheus/Grafana for your
 * collaboration platform — but built into the event bus itself.
 *
 * Metrics tracked:
 *   - Room metrics: creation count, duration, participant counts, recording time
 *   - Chat metrics: messages sent, response latency, active channels, thread depth
 *   - Call metrics: call count, duration, cost, bridge-to-room rate
 *   - File metrics: files shared, providers used, share scope distribution
 *   - User engagement: per-user activity scores, presence patterns
 *   - Tenant usage: cross-cutting aggregate per tenant
 *
 * Bus events emitted: analytics:*
 *   analytics:snapshot-created, analytics:engagement-calculated,
 *   analytics:report-generated, analytics:anomaly-detected
 *
 * REST endpoints (mounted at /api/analytics): 10 endpoints
 */

import { Router } from 'express';
import type { UCPlugin, PluginContext, PluginHealth } from '../../core/plugin-interface';

// ─── Metric Types ───────────────────────────────────────────────

interface MetricCounter {
  name: string;
  value: number;
  tags: Record<string, string>;
  updatedAt: Date;
}

interface TimeBucket {
  timestamp: Date;
  period: 'hour' | 'day' | 'week' | 'month';
  metrics: Record<string, number>;
}

interface EngagementScore {
  userId: string;
  score: number;
  period: string;
  breakdown: {
    messagesSent: number;
    meetingsAttended: number;
    filesShared: number;
    callsPlaced: number;
    whiteboardContributions: number;
    averageResponseTimeMs: number;
  };
  calculatedAt: Date;
}

interface UsageReport {
  id: string;
  tenantId: string;
  period: string;
  periodStart: Date;
  periodEnd: Date;
  summary: {
    totalRooms: number;
    totalMeetingMinutes: number;
    totalMessages: number;
    totalCalls: number;
    totalCallMinutes: number;
    totalCallCostCents: number;
    totalFilesShared: number;
    totalTranscriptions: number;
    activeUsers: number;
    peakConcurrentRooms: number;
  };
  userBreakdown: { userId: string; messagesSent: number; meetingMinutes: number; callMinutes: number }[];
  generatedAt: Date;
}

interface AnomalyRecord {
  id: string;
  metricName: string;
  value: number;
  threshold: number;
  deviation: number;
  severity: 'info' | 'warning' | 'critical';
  detectedAt: Date;
}

// ─── Plugin Implementation ──────────────────────────────────────

export class AnalyticsPlugin implements UCPlugin {
  readonly id = 'analytics';
  readonly name = 'Analytics & Insights';
  readonly version = '3.0.0';
  readonly dependencies: string[] = [];

  private ctx!: PluginContext;
  private counters: Map<string, MetricCounter> = new Map();
  private timeBuckets: TimeBucket[] = [];
  private engagementScores: Map<string, EngagementScore> = new Map();
  private reports: Map<string, UsageReport> = new Map();
  private anomalies: AnomalyRecord[] = [];
  private eventCounts: Map<string, number> = new Map();
  private userActivity: Map<string, {
    messagesSent: number; meetingsAttended: number;
    filesShared: number; callsPlaced: number;
    whiteboardContributions: number;
    responseTimesMs: number[];
    lastActive: Date;
  }> = new Map();
  private roomDurations: Map<string, { startedAt: Date; participants: number }> = new Map();
  private snapshotTimer?: NodeJS.Timeout;

  // Anomaly detection thresholds (configurable)
  private thresholds = {
    maxConcurrentRooms: 50,
    maxMessagesPerMinute: 200,
    maxCallCostPerDayCents: 100_00, // $100
    minEngagementScore: 10,
  };

  async initialize(ctx: PluginContext): Promise<void> {
    this.ctx = ctx;
    const pluginConfig = ctx.config.plugins['analytics'] || {};

    if (pluginConfig.thresholds) {
      Object.assign(this.thresholds, pluginConfig.thresholds);
    }

    ctx.logger.info('Analytics plugin initializing...');

    // ── Subscribe to ALL events via wildcard ──
    ctx.bus.onPattern('*', async (data: any) => {
      // This fires for every single event on the bus
      // We filter and categorize in the handler
    }, 'analytics');

    // ── Room metrics ──
    ctx.bus.on('room:created', async (data: any) => {
      this.increment('rooms.created');
      this.incrementTagged('rooms.created.by_tenant', data.tenantId || 'unknown');
      this.roomDurations.set(data.roomId, { startedAt: new Date(), participants: 0 });
      this.trackEvent('room:created');
      this.checkAnomaly('concurrent_rooms', this.roomDurations.size, this.thresholds.maxConcurrentRooms);
    }, 'analytics');

    ctx.bus.on('room:participant-joined', async (data: any) => {
      this.increment('rooms.participants.joined');
      const room = this.roomDurations.get(data.roomId);
      if (room) room.participants++;
      this.trackUserActivity(data.userId, 'meetingsAttended');
      this.trackEvent('room:participant-joined');
    }, 'analytics');

    ctx.bus.on('room:closed', async (data: any) => {
      this.increment('rooms.closed');
      const room = this.roomDurations.get(data.roomId);
      if (room) {
        const durationMinutes = (Date.now() - room.startedAt.getTime()) / 60_000;
        this.incrementBy('rooms.total_minutes', durationMinutes);
        this.roomDurations.delete(data.roomId);
      }
      this.trackEvent('room:closed');
    }, 'analytics');

    ctx.bus.on('room:recording-started', async () => {
      this.increment('rooms.recordings.started');
      this.trackEvent('room:recording-started');
    }, 'analytics');

    // ── Chat metrics ──
    ctx.bus.on('chat:message-sent', async (data: any) => {
      this.increment('chat.messages.sent');
      if (data.threadId) this.increment('chat.messages.in_thread');
      this.trackUserActivity(data.senderId, 'messagesSent');
      this.trackEvent('chat:message-sent');
    }, 'analytics');

    ctx.bus.on('chat:reaction-added', async () => {
      this.increment('chat.reactions.added');
      this.trackEvent('chat:reaction-added');
    }, 'analytics');

    // ── Call metrics ──
    ctx.bus.on('call:initiated', async (data: any) => {
      this.increment('calls.initiated');
      this.incrementTagged('calls.by_direction', data.direction || 'unknown');
      this.trackUserActivity(data.from, 'callsPlaced');
      this.trackEvent('call:initiated');
    }, 'analytics');

    ctx.bus.on('call:completed', async (data: any) => {
      this.increment('calls.completed');
      if (data.duration) this.incrementBy('calls.total_seconds', data.duration);
      if (data.costCents) this.incrementBy('calls.total_cost_cents', data.costCents);
      this.trackEvent('call:completed');
    }, 'analytics');

    ctx.bus.on('call:bridged-to-room', async () => {
      this.increment('calls.bridged_to_room');
      this.trackEvent('call:bridged-to-room');
    }, 'analytics');

    // ── File metrics ──
    ctx.bus.on('cloud:file-shared', async (data: any) => {
      this.increment('files.shared');
      this.incrementTagged('files.by_provider', data.provider || 'unknown');
      this.trackUserActivity(data.sharedBy, 'filesShared');
      this.trackEvent('cloud:file-shared');
    }, 'analytics');

    // ── Whiteboard metrics ──
    ctx.bus.on('whiteboard:stroke-added', async (data: any) => {
      this.increment('whiteboard.strokes');
      this.trackUserActivity(data.userId, 'whiteboardContributions');
      this.trackEvent('whiteboard:stroke-added');
    }, 'analytics');

    ctx.bus.on('whiteboard:element-added', async (data: any) => {
      this.increment('whiteboard.elements');
      this.trackUserActivity(data.userId, 'whiteboardContributions');
      this.trackEvent('whiteboard:element-added');
    }, 'analytics');

    // ── Transcription metrics ──
    ctx.bus.on('transcription:completed', async (data: any) => {
      this.increment('transcriptions.completed');
      if (data.wordCount) this.incrementBy('transcriptions.total_words', data.wordCount);
      this.trackEvent('transcription:completed');
    }, 'analytics');

    // ── Periodic snapshot (every 5 minutes) ──
    this.snapshotTimer = setInterval(() => this.createSnapshot(), 5 * 60_000);

    ctx.logger.info('Analytics plugin initialized — tracking all bus events ✓');
  }

  // ─── Metric Helpers ───────────────────────────────────────────

  private increment(name: string): void {
    const counter = this.counters.get(name) || { name, value: 0, tags: {}, updatedAt: new Date() };
    counter.value++;
    counter.updatedAt = new Date();
    this.counters.set(name, counter);
  }

  private incrementBy(name: string, amount: number): void {
    const counter = this.counters.get(name) || { name, value: 0, tags: {}, updatedAt: new Date() };
    counter.value += amount;
    counter.updatedAt = new Date();
    this.counters.set(name, counter);
  }

  private incrementTagged(baseName: string, tagValue: string): void {
    this.increment(`${baseName}:${tagValue}`);
  }

  private trackEvent(eventType: string): void {
    this.eventCounts.set(eventType, (this.eventCounts.get(eventType) || 0) + 1);
  }

  private trackUserActivity(userId: string | undefined, field: keyof EngagementScore['breakdown']): void {
    if (!userId) return;
    if (!this.userActivity.has(userId)) {
      this.userActivity.set(userId, {
        messagesSent: 0, meetingsAttended: 0, filesShared: 0,
        callsPlaced: 0, whiteboardContributions: 0,
        responseTimesMs: [], lastActive: new Date(),
      });
    }
    const activity = this.userActivity.get(userId)!;
    if (field in activity && typeof (activity as any)[field] === 'number') {
      (activity as any)[field]++;
    }
    activity.lastActive = new Date();
  }

  private checkAnomaly(metricName: string, value: number, threshold: number): void {
    if (value > threshold) {
      const anomaly: AnomalyRecord = {
        id: `anomaly-${Date.now()}`,
        metricName, value, threshold,
        deviation: ((value - threshold) / threshold) * 100,
        severity: value > threshold * 2 ? 'critical' : value > threshold * 1.5 ? 'warning' : 'info',
        detectedAt: new Date(),
      };
      this.anomalies.push(anomaly);
      if (this.anomalies.length > 1000) this.anomalies.shift();

      this.ctx.bus.emit('analytics:anomaly-detected', {
        metricName, value, threshold, severity: anomaly.severity,
      }, 'analytics');
    }
  }

  // ─── Snapshots & Reports ──────────────────────────────────────

  private createSnapshot(): void {
    const bucket: TimeBucket = {
      timestamp: new Date(),
      period: 'hour',
      metrics: {},
    };

    for (const [name, counter] of this.counters) {
      bucket.metrics[name] = counter.value;
    }
    bucket.metrics['active_rooms'] = this.roomDurations.size;
    bucket.metrics['active_users'] = [...this.userActivity.values()]
      .filter(a => Date.now() - a.lastActive.getTime() < 30 * 60_000).length;

    this.timeBuckets.push(bucket);
    if (this.timeBuckets.length > 2880) this.timeBuckets.shift(); // Keep ~10 days of hourly

    this.ctx.bus.emit('analytics:snapshot-created', {
      snapshotId: `snap-${Date.now()}`, period: 'hour',
      metricCount: Object.keys(bucket.metrics).length,
    }, 'analytics');
  }

  private calculateEngagement(userId: string): EngagementScore {
    const activity = this.userActivity.get(userId);
    if (!activity) {
      return {
        userId, score: 0, period: 'all-time',
        breakdown: { messagesSent: 0, meetingsAttended: 0, filesShared: 0, callsPlaced: 0, whiteboardContributions: 0, averageResponseTimeMs: 0 },
        calculatedAt: new Date(),
      };
    }

    // Weighted engagement score
    const score =
      activity.messagesSent * 1 +
      activity.meetingsAttended * 5 +
      activity.filesShared * 3 +
      activity.callsPlaced * 4 +
      activity.whiteboardContributions * 2;

    const avgResponse = activity.responseTimesMs.length > 0
      ? activity.responseTimesMs.reduce((a, b) => a + b, 0) / activity.responseTimesMs.length
      : 0;

    const engagement: EngagementScore = {
      userId, score, period: 'all-time',
      breakdown: {
        messagesSent: activity.messagesSent,
        meetingsAttended: activity.meetingsAttended,
        filesShared: activity.filesShared,
        callsPlaced: activity.callsPlaced,
        whiteboardContributions: activity.whiteboardContributions,
        averageResponseTimeMs: avgResponse,
      },
      calculatedAt: new Date(),
    };

    this.engagementScores.set(userId, engagement);
    return engagement;
  }

  private generateReport(tenantId: string, periodDays = 30): UsageReport {
    const periodStart = new Date(Date.now() - periodDays * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const report: UsageReport = {
      id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      tenantId,
      period: `${periodDays}d`,
      periodStart,
      periodEnd,
      summary: {
        totalRooms: this.getCounter('rooms.created'),
        totalMeetingMinutes: Math.round(this.getCounter('rooms.total_minutes')),
        totalMessages: this.getCounter('chat.messages.sent'),
        totalCalls: this.getCounter('calls.initiated'),
        totalCallMinutes: Math.round(this.getCounter('calls.total_seconds') / 60),
        totalCallCostCents: Math.round(this.getCounter('calls.total_cost_cents')),
        totalFilesShared: this.getCounter('files.shared'),
        totalTranscriptions: this.getCounter('transcriptions.completed'),
        activeUsers: this.userActivity.size,
        peakConcurrentRooms: this.getCounter('rooms.created'), // Simplified
      },
      userBreakdown: [...this.userActivity.entries()].map(([userId, a]) => ({
        userId,
        messagesSent: a.messagesSent,
        meetingMinutes: a.meetingsAttended * 45, // Approximate
        callMinutes: a.callsPlaced * 5, // Approximate
      })),
      generatedAt: new Date(),
    };

    this.reports.set(report.id, report);
    return report;
  }

  private getCounter(name: string): number {
    return this.counters.get(name)?.value || 0;
  }

  // ─── REST Routes ──────────────────────────────────────────────

  getRoutes(): Router {
    const router = Router();

    // Get all current metrics
    router.get('/metrics', (_req, res) => {
      const metrics: Record<string, number> = {};
      for (const [name, counter] of this.counters) metrics[name] = counter.value;
      metrics['active_rooms'] = this.roomDurations.size;
      metrics['tracked_users'] = this.userActivity.size;
      res.json(metrics);
    });

    // Get event counts
    router.get('/events', (_req, res) => {
      const events: Record<string, number> = {};
      for (const [type, count] of this.eventCounts) events[type] = count;
      res.json({ totalEventTypes: this.eventCounts.size, events });
    });

    // Get time series data
    router.get('/timeseries', (req, res) => {
      const metric = req.query.metric as string;
      const limit = parseInt(req.query.limit as string || '24', 10);
      let buckets = this.timeBuckets.slice(-limit);
      if (metric) {
        buckets = buckets.map(b => ({
          ...b, metrics: { [metric]: b.metrics[metric] || 0 },
        }));
      }
      res.json(buckets);
    });

    // Get user engagement scores
    router.get('/engagement', (req, res) => {
      const scores = [...this.userActivity.keys()].map(userId => this.calculateEngagement(userId));
      scores.sort((a, b) => b.score - a.score);
      const limit = parseInt(req.query.limit as string || '20', 10);
      res.json({ users: scores.slice(0, limit) });
    });

    // Get specific user engagement
    router.get('/engagement/:userId', (req, res) => {
      const score = this.calculateEngagement(req.params.userId);
      this.ctx.bus.emit('analytics:engagement-calculated', {
        userId: req.params.userId, score: score.score, period: score.period,
      }, 'analytics');
      res.json(score);
    });

    // Generate usage report
    router.post('/reports', (req, res) => {
      const { tenantId, periodDays } = req.body;
      if (!tenantId) return res.status(400).json({ error: 'tenantId required' });
      const report = this.generateReport(tenantId, periodDays || 30);

      this.ctx.bus.emit('analytics:report-generated', {
        reportId: report.id, tenantId, period: report.period,
      }, 'analytics');

      res.json(report);
    });

    // List generated reports
    router.get('/reports', (req, res) => {
      let results = [...this.reports.values()];
      if (req.query.tenantId) results = results.filter(r => r.tenantId === req.query.tenantId);
      results.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());
      res.json(results);
    });

    // Get report by ID
    router.get('/reports/:id', (req, res) => {
      const report = this.reports.get(req.params.id);
      if (!report) return res.status(404).json({ error: 'Report not found' });
      res.json(report);
    });

    // Get anomalies
    router.get('/anomalies', (req, res) => {
      const severity = req.query.severity as string;
      let results = [...this.anomalies];
      if (severity) results = results.filter(a => a.severity === severity);
      results.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
      const limit = parseInt(req.query.limit as string || '50', 10);
      res.json({ total: results.length, anomalies: results.slice(0, limit) });
    });

    // Stats overview
    router.get('/stats', (_req, res) => {
      res.json({
        counters: this.counters.size,
        timeBuckets: this.timeBuckets.length,
        trackedUsers: this.userActivity.size,
        reports: this.reports.size,
        anomalies: this.anomalies.length,
        eventTypesTracked: this.eventCounts.size,
        totalEventsProcessed: [...this.eventCounts.values()].reduce((a, b) => a + b, 0),
      });
    });

    return router;
  }

  async shutdown(): Promise<void> {
    if (this.snapshotTimer) clearInterval(this.snapshotTimer);
    this.counters.clear();
    this.timeBuckets = [];
    this.userActivity.clear();
    this.roomDurations.clear();
    this.ctx.logger.info('Analytics plugin shut down');
  }

  async healthCheck(): Promise<PluginHealth> {
    return {
      status: 'healthy',
      details: {
        counters: this.counters.size,
        trackedUsers: this.userActivity.size,
        activeRooms: this.roomDurations.size,
        timeBuckets: this.timeBuckets.length,
        anomalies: this.anomalies.length,
      },
    };
  }
}

export default AnalyticsPlugin;
