'use strict';

// =============================================================================
// MENU ANALYTICS SERVICE
// =============================================================================
// The analytics engine for the self-composing interface. Every meaningful
// menu interaction generates a MenuUsageEvent; these are aggregated daily
// into MenuAnalyticsDaily summaries that power the analytics dashboard.
//
// Think of this as the platform's nervous system for menu intelligence.
// Individual events are nerve impulses (fast, granular, short-lived —
// retained 90 days). Daily summaries are memories (compressed, long-lived,
// showing patterns over time). Together they answer questions like:
//   - "Do teachers actually use the Gradebook after we pushed it?"
//   - "Which items decay fastest for learners?"
//   - "What's the seed acceptance rate for homeschool parents?"
//
// Specification references:
//   Section 17.2 — MenuUsageEvent + MenuAnalyticsDaily Prisma models
//   Phase 5 plan — "MenuAnalyticsDaily aggregation: 2 days —
//                    Daily job aggregating MenuUsageEvents into analytics
//                    summaries per role, per task"
//
// Architecture:
//   - Event recording: fire-and-forget from client → API → this service
//   - Aggregation job: daily cron that processes events into summaries
//   - Query layer: structured queries for the analytics dashboard
//   - Result<T> pattern for explicit error handling
//   - Repository abstraction for testability
// =============================================================================

// =============================================================================
// TYPES — Prisma model equivalents
// =============================================================================

/**
 * The source of a menu usage event. Tracks HOW the user accessed
 * the task, which informs UI optimisation decisions.
 */
export type UsageSource =
  | 'navigation'    // Clicked on the sidebar menu item
  | 'cmdK'          // Found via command palette (Cmd+K)
  | 'notification'  // Clicked a notification or toast
  | 'seed'          // Clicked a seed suggestion
  | 'push'          // First use of a pushed item
  | 'overflow'      // Restored or navigated from overflow drawer
  | 'deeplink'      // Direct URL or deep link
  | 'onboarding';   // Onboarding step completion

/**
 * The type of menu lifecycle event. Distinguishes between usage
 * (interaction with a task) and lifecycle transitions (state changes).
 */
export type EventType =
  | 'use'            // User interacted with a task
  | 'promote'        // Task promoted from seed/non-menu to active
  | 'dismiss'        // User dismissed a seed suggestion
  | 'decay_start'    // Task entered DECAYING state
  | 'overflow'       // Task entered OVERFLOW state
  | 'restore'        // Task restored from overflow to active
  | 'pin'            // User pinned a task
  | 'unpin'          // User unpinned a task
  | 'push_received'  // Institutional push applied
  | 'push_revoked'   // Institutional push revoked
  | 'push_expired'   // Institutional push expired
  | 'reorder';       // User reordered menu items

/**
 * Maps to the MenuUsageEvent Prisma model (Section 17.2).
 * Individual events retained for 90 days, then aggregated.
 */
export interface MenuUsageEvent {
  /** Unique event identifier. */
  id: string;

  /** The user who generated this event. */
  userId: string;

  /** The user's role at the time of the event. */
  roleId: string;

  /** The task reference from the taxonomy. */
  taskRef: string;

  /** What happened. */
  eventType: EventType;

  /** When the event occurred. */
  timestamp: string;

  /** How long the user spent on the task (ms). Null for lifecycle events. */
  durationMs: number | null;

  /** How the user accessed the task. Null for lifecycle events. */
  source: UsageSource | null;

  /** The institution ID (null for non-institutional users). */
  institutionId: string | null;

  /** Additional context (e.g., seed score at time of promotion). */
  metadata: Record<string, unknown> | null;
}

/**
 * Input for recording a new event. The service fills in id and timestamp.
 */
export interface RecordEventInput {
  userId: string;
  roleId: string;
  taskRef: string;
  eventType: EventType;
  durationMs?: number | null;
  source?: UsageSource | null;
  institutionId?: string | null;
  metadata?: Record<string, unknown> | null;
}

/**
 * Maps to the MenuAnalyticsDaily Prisma model (Section 17.2).
 * Aggregated daily summaries for product insights.
 */
export interface MenuAnalyticsDaily {
  /** Unique identifier. */
  id: string;

  /** The role this summary is for. */
  roleId: string;

  /** The task this summary covers. */
  taskRef: string;

  /** The date of this summary (YYYY-MM-DD). */
  date: string;

  /** The institution ID (null for platform-wide aggregation). */
  institutionId: string | null;

  // ── Usage metrics ──

  /** Number of unique users who interacted with this task. */
  uniqueUsers: number;

  /** Total number of use events. */
  totalUses: number;

  /** Average time spent per use (ms). */
  avgDurationMs: number;

  /** Average position in the user's menu (lower = higher up). */
  avgPosition: number;

  // ── Lifecycle metrics ──

  /** How many users had this task promoted (seed/non-menu → active). */
  promotionCount: number;

  /** How many users dismissed this as a seed. */
  dismissalCount: number;

  /** How many users had this task enter DECAYING state. */
  decayStartCount: number;

  /** How many users had this task enter OVERFLOW state. */
  overflowCount: number;

  /** How many users restored this task from overflow. */
  restoreCount: number;

  /** How many users pinned this task. */
  pinCount: number;

  /** How many users unpinned this task. */
  unpinCount: number;

  // ── Source distribution ──

  /** Breakdown of how users accessed this task. */
  sourceDistribution: Record<UsageSource, number>;

  // ── Derived rates ──

  /**
   * Promotion rate: promotions / (promotions + dismissals).
   * Measures how often seed suggestions are accepted.
   */
  promotionRate: number;

  /**
   * Decay rate: overflow transitions / active items.
   * Measures how often items go unused long enough to decay out.
   */
  decayRate: number;

  /**
   * Restore rate: restores / overflow transitions.
   * Measures how often users retrieve items from overflow.
   */
  restoreRate: number;
}

/**
 * Query parameters for fetching analytics data.
 */
export interface AnalyticsQuery {
  /** Filter by role. */
  roleId?: string;

  /** Filter by task reference. */
  taskRef?: string;

  /** Filter by institution. */
  institutionId?: string;

  /** Start date (inclusive, YYYY-MM-DD). */
  startDate: string;

  /** End date (inclusive, YYYY-MM-DD). */
  endDate: string;
}

/**
 * A snapshot of menu composition across a user population.
 * Shows which tasks appear in menus and at what frequency.
 */
export interface MenuCompositionSnapshot {
  /** The role this snapshot covers. */
  roleId: string;

  /** When this snapshot was generated. */
  generatedAt: string;

  /** Total users with this role. */
  totalUsers: number;

  /** Per-task breakdown. */
  tasks: Array<{
    taskRef: string;
    /** What percentage of users have this task in their menu. */
    presenceRate: number;
    /** Average position across users who have it. */
    avgPosition: number;
    /** How many users have it as a seed suggestion. */
    seedCount: number;
    /** How many users have it actively in their menu. */
    activeCount: number;
    /** How many users have it in overflow. */
    overflowCount: number;
    /** How many users have it pushed by their institution. */
    pushedCount: number;
  }>;
}

// =============================================================================
// RESULT TYPE
// =============================================================================

export type AnalyticsResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// =============================================================================
// REPOSITORY INTERFACE
// =============================================================================

export interface AnalyticsRepository {
  /** Record a new usage event. */
  recordEvent(event: MenuUsageEvent): Promise<void>;

  /** Batch-record events (for efficiency during aggregation). */
  recordEvents(events: MenuUsageEvent[]): Promise<void>;

  /** Get events for aggregation (within a date range). */
  getEventsForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<MenuUsageEvent[]>;

  /** Delete events older than the retention period (90 days). */
  deleteEventsOlderThan(cutoffDate: string): Promise<number>;

  /** Save a daily analytics summary. */
  saveDailySummary(summary: MenuAnalyticsDaily): Promise<void>;

  /** Save multiple daily summaries (batch). */
  saveDailySummaries(summaries: MenuAnalyticsDaily[]): Promise<void>;

  /** Query daily analytics summaries. */
  queryDailySummaries(query: AnalyticsQuery): Promise<MenuAnalyticsDaily[]>;

  /** Get the most recent aggregation date (to know where to resume). */
  getLastAggregationDate(): Promise<string | null>;
}

// =============================================================================
// MENU ANALYTICS SERVICE
// =============================================================================

export class MenuAnalyticsService {
  constructor(
    private readonly repository: AnalyticsRepository,
    private readonly generateId: () => string = () =>
      `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  ) {}

  // ── EVENT RECORDING ──────────────────────────────────────────────────

  /**
   * Record a single menu usage event. This is the fire-and-forget
   * entry point called from the client API layer.
   *
   * Events are intentionally lightweight — validation is minimal
   * to avoid adding latency to user interactions.
   */
  async recordEvent(input: RecordEventInput): Promise<AnalyticsResult<{ eventId: string }>> {
    if (!input.userId || !input.roleId || !input.taskRef || !input.eventType) {
      return {
        success: false,
        error: 'Missing required fields: userId, roleId, taskRef, eventType.',
      };
    }

    try {
      const event: MenuUsageEvent = {
        id: this.generateId(),
        userId: input.userId,
        roleId: input.roleId,
        taskRef: input.taskRef,
        eventType: input.eventType,
        timestamp: new Date().toISOString(),
        durationMs: input.durationMs ?? null,
        source: input.source ?? null,
        institutionId: input.institutionId ?? null,
        metadata: input.metadata ?? null,
      };

      await this.repository.recordEvent(event);

      return { success: true, data: { eventId: event.id } };
    } catch (err) {
      return {
        success: false,
        error: `Failed to record event: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Record multiple events in a single batch. Used for bulk imports
   * or when processing a queue of deferred events.
   */
  async recordEvents(inputs: RecordEventInput[]): Promise<AnalyticsResult<{ recordedCount: number }>> {
    try {
      const events: MenuUsageEvent[] = inputs
        .filter(i => i.userId && i.roleId && i.taskRef && i.eventType)
        .map(input => ({
          id: this.generateId(),
          userId: input.userId,
          roleId: input.roleId,
          taskRef: input.taskRef,
          eventType: input.eventType,
          timestamp: new Date().toISOString(),
          durationMs: input.durationMs ?? null,
          source: input.source ?? null,
          institutionId: input.institutionId ?? null,
          metadata: input.metadata ?? null,
        }));

      if (events.length === 0) {
        return { success: true, data: { recordedCount: 0 } };
      }

      await this.repository.recordEvents(events);

      return { success: true, data: { recordedCount: events.length } };
    } catch (err) {
      return {
        success: false,
        error: `Failed to record batch: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ── DAILY AGGREGATION ────────────────────────────────────────────────

  /**
   * The daily aggregation job. Processes all events for a given date
   * and produces MenuAnalyticsDaily summaries grouped by role and task.
   *
   * This is the core analytics pipeline:
   *   1. Fetch all events for the target date
   *   2. Group by (roleId, taskRef)
   *   3. Compute metrics per group
   *   4. Calculate derived rates
   *   5. Save summaries
   *
   * Designed to be idempotent — running it twice for the same date
   * overwrites the previous summary (last-write-wins).
   */
  async runDailyAggregation(
    targetDate: string,
  ): Promise<AnalyticsResult<{ summaryCount: number; eventCount: number }>> {
    try {
      // Compute the date range for the target day (00:00:00 to 23:59:59)
      const startDate = `${targetDate}T00:00:00.000Z`;
      const endDate = `${targetDate}T23:59:59.999Z`;

      const events = await this.repository.getEventsForDateRange(startDate, endDate);

      if (events.length === 0) {
        return { success: true, data: { summaryCount: 0, eventCount: 0 } };
      }

      // ── Group events by (roleId, taskRef) ──

      const groups = new Map<string, MenuUsageEvent[]>();

      for (const event of events) {
        const key = `${event.roleId}::${event.taskRef}`;
        const existing = groups.get(key);
        if (existing) {
          existing.push(event);
        } else {
          groups.set(key, [event]);
        }
      }

      // ── Compute summaries per group ──

      const summaries: MenuAnalyticsDaily[] = [];

      for (const [key, groupEvents] of groups) {
        const [roleId, taskRef] = key.split('::') as [string, string];

        const summary = this.computeSummary(
          roleId,
          taskRef,
          targetDate,
          groupEvents,
        );

        summaries.push(summary);
      }

      // ── Persist ──

      await this.repository.saveDailySummaries(summaries);

      return {
        success: true,
        data: { summaryCount: summaries.length, eventCount: events.length },
      };
    } catch (err) {
      return {
        success: false,
        error: `Aggregation failed for ${targetDate}: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Backfill aggregations for a range of dates. Useful after
   * the aggregation job was down or for initial setup.
   */
  async backfillAggregations(
    startDate: string,
    endDate: string,
  ): Promise<AnalyticsResult<{ daysProcessed: number; totalSummaries: number }>> {
    try {
      const start = new Date(startDate);
      const end = new Date(endDate);
      let daysProcessed = 0;
      let totalSummaries = 0;

      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().split('T')[0]!;
        const result = await this.runDailyAggregation(dateStr);

        if (result.success) {
          totalSummaries += result.data.summaryCount;
        }

        daysProcessed++;
        current.setDate(current.getDate() + 1);
      }

      return { success: true, data: { daysProcessed, totalSummaries } };
    } catch (err) {
      return {
        success: false,
        error: `Backfill failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ── COMPUTE SUMMARY ──────────────────────────────────────────────────

  /**
   * Computes a single daily analytics summary for a (role, task) pair.
   */
  private computeSummary(
    roleId: string,
    taskRef: string,
    date: string,
    events: MenuUsageEvent[],
  ): MenuAnalyticsDaily {
    // ── Unique users ──

    const uniqueUserIds = new Set(events.map(e => e.userId));

    // ── Usage metrics ──

    const useEvents = events.filter(e => e.eventType === 'use');
    const totalUses = useEvents.length;

    const durations = useEvents
      .map(e => e.durationMs)
      .filter((d): d is number => d !== null && d > 0);

    const avgDurationMs = durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;

    // ── Lifecycle counts ──

    const countByType = (type: EventType) =>
      events.filter(e => e.eventType === type).length;

    const promotionCount = countByType('promote');
    const dismissalCount = countByType('dismiss');
    const decayStartCount = countByType('decay_start');
    const overflowCount = countByType('overflow');
    const restoreCount = countByType('restore');
    const pinCount = countByType('pin');
    const unpinCount = countByType('unpin');

    // ── Source distribution ──

    const sourceDistribution: Record<UsageSource, number> = {
      navigation: 0,
      cmdK: 0,
      notification: 0,
      seed: 0,
      push: 0,
      overflow: 0,
      deeplink: 0,
      onboarding: 0,
    };

    for (const event of useEvents) {
      if (event.source && event.source in sourceDistribution) {
        sourceDistribution[event.source]++;
      }
    }

    // ── Derived rates ──

    const promotionDenominator = promotionCount + dismissalCount;
    const promotionRate = promotionDenominator > 0
      ? Math.round((promotionCount / promotionDenominator) * 100) / 100
      : 0;

    // Decay rate uses decayStart as numerator and active items as
    // denominator. Since we don't have the total active count in
    // events alone, we use overflow as a proxy: overflow / (overflow + restores).
    const decayDenominator = overflowCount + restoreCount;
    const decayRate = decayDenominator > 0
      ? Math.round((overflowCount / decayDenominator) * 100) / 100
      : 0;

    const restoreRate = overflowCount > 0
      ? Math.round((restoreCount / overflowCount) * 100) / 100
      : 0;

    // ── Average position ──
    // Position is extracted from metadata if present
    const positions = events
      .map(e => e.metadata?.position as number | undefined)
      .filter((p): p is number => typeof p === 'number');

    const avgPosition = positions.length > 0
      ? Math.round((positions.reduce((sum, p) => sum + p, 0) / positions.length) * 10) / 10
      : -1;

    // ── Institution ID (take the most common one, or null) ──
    const instIds = events
      .map(e => e.institutionId)
      .filter((id): id is string => id !== null);

    const institutionId = instIds.length > 0
      ? this.mostCommon(instIds)
      : null;

    return {
      id: this.generateId(),
      roleId,
      taskRef,
      date,
      institutionId,
      uniqueUsers: uniqueUserIds.size,
      totalUses,
      avgDurationMs,
      avgPosition,
      promotionCount,
      dismissalCount,
      decayStartCount,
      overflowCount,
      restoreCount,
      pinCount,
      unpinCount,
      sourceDistribution,
      promotionRate,
      decayRate,
      restoreRate,
    };
  }

  /**
   * Returns the most common element in an array.
   */
  private mostCommon(arr: string[]): string {
    const counts = new Map<string, number>();
    let maxCount = 0;
    let maxVal = arr[0]!;

    for (const val of arr) {
      const count = (counts.get(val) ?? 0) + 1;
      counts.set(val, count);
      if (count > maxCount) {
        maxCount = count;
        maxVal = val;
      }
    }

    return maxVal;
  }

  // ── QUERY LAYER ──────────────────────────────────────────────────────

  /**
   * Query aggregated analytics for the dashboard.
   */
  async queryAnalytics(
    query: AnalyticsQuery,
  ): Promise<AnalyticsResult<MenuAnalyticsDaily[]>> {
    try {
      const summaries = await this.repository.queryDailySummaries(query);
      return { success: true, data: summaries };
    } catch (err) {
      return {
        success: false,
        error: `Query failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  /**
   * Get a menu composition snapshot: what tasks appear in menus for
   * a given role, and at what frequency? This powers the heatmap
   * visualisation in the analytics dashboard.
   */
  async getMenuComposition(
    roleId: string,
    date: string,
  ): Promise<AnalyticsResult<MenuCompositionSnapshot>> {
    try {
      const summaries = await this.repository.queryDailySummaries({
        roleId,
        startDate: date,
        endDate: date,
      });

      if (summaries.length === 0) {
        return {
          success: true,
          data: {
            roleId,
            generatedAt: new Date().toISOString(),
            totalUsers: 0,
            tasks: [],
          },
        };
      }

      // Estimate total users from the maximum unique users across tasks
      const totalUsers = Math.max(...summaries.map(s => s.uniqueUsers), 1);

      const tasks = summaries.map(s => ({
        taskRef: s.taskRef,
        presenceRate: Math.round((s.uniqueUsers / totalUsers) * 100) / 100,
        avgPosition: s.avgPosition,
        seedCount: 0, // Would need seed-specific query
        activeCount: s.uniqueUsers,
        overflowCount: s.overflowCount,
        pushedCount: 0, // Would cross-reference with push service
      }));

      return {
        success: true,
        data: {
          roleId,
          generatedAt: new Date().toISOString(),
          totalUsers,
          tasks,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `Composition query failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  // ── RETENTION CLEANUP ────────────────────────────────────────────────

  /**
   * Delete events older than the retention period (90 days per spec).
   * Should be run daily after aggregation to keep the events table lean.
   */
  async cleanupOldEvents(
    retentionDays: number = 90,
  ): Promise<AnalyticsResult<{ deletedCount: number }>> {
    try {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - retentionDays);
      const cutoffIso = cutoff.toISOString();

      const deletedCount = await this.repository.deleteEventsOlderThan(cutoffIso);

      return { success: true, data: { deletedCount } };
    } catch (err) {
      return {
        success: false,
        error: `Cleanup failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }
}

// =============================================================================
// IN-MEMORY REPOSITORY (for testing)
// =============================================================================

export class InMemoryAnalyticsRepository implements AnalyticsRepository {
  public events: MenuUsageEvent[] = [];
  public summaries: MenuAnalyticsDaily[] = [];

  async recordEvent(event: MenuUsageEvent): Promise<void> {
    this.events.push({ ...event });
  }

  async recordEvents(events: MenuUsageEvent[]): Promise<void> {
    this.events.push(...events.map(e => ({ ...e })));
  }

  async getEventsForDateRange(
    startDate: string,
    endDate: string,
  ): Promise<MenuUsageEvent[]> {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();

    return this.events.filter(e => {
      const t = new Date(e.timestamp).getTime();
      return t >= start && t <= end;
    });
  }

  async deleteEventsOlderThan(cutoffDate: string): Promise<number> {
    const cutoff = new Date(cutoffDate).getTime();
    const before = this.events.length;
    this.events = this.events.filter(
      e => new Date(e.timestamp).getTime() >= cutoff,
    );
    return before - this.events.length;
  }

  async saveDailySummary(summary: MenuAnalyticsDaily): Promise<void> {
    // Upsert: replace existing summary for same (role, task, date)
    this.summaries = this.summaries.filter(
      s => !(s.roleId === summary.roleId && s.taskRef === summary.taskRef && s.date === summary.date),
    );
    this.summaries.push({ ...summary });
  }

  async saveDailySummaries(summaries: MenuAnalyticsDaily[]): Promise<void> {
    for (const s of summaries) {
      await this.saveDailySummary(s);
    }
  }

  async queryDailySummaries(query: AnalyticsQuery): Promise<MenuAnalyticsDaily[]> {
    return this.summaries.filter(s => {
      if (query.roleId && s.roleId !== query.roleId) return false;
      if (query.taskRef && s.taskRef !== query.taskRef) return false;
      if (query.institutionId && s.institutionId !== query.institutionId) return false;
      if (s.date < query.startDate || s.date > query.endDate) return false;
      return true;
    });
  }

  async getLastAggregationDate(): Promise<string | null> {
    if (this.summaries.length === 0) return null;
    const sorted = [...this.summaries].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0]!.date;
  }

  clear(): void {
    this.events = [];
    this.summaries = [];
  }
}
