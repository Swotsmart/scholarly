'use client';

// =============================================================================
// MENU ANALYTICS DASHBOARD
// =============================================================================
// The internal dashboard for the product team. Shows how the self-composing
// interface is performing across the entire user population — which tasks
// are thriving, which are decaying, how seeds are being received, and
// whether institutional pushes are driving adoption.
//
// Think of this as mission control for menu intelligence. The heatmap
// shows the "weather" across roles. The trend charts show the "seasons."
// The composition view shows the "terrain." Together they give the
// product team the visibility they need to tune the seed engine, adjust
// decay thresholds, and measure the impact of new features.
//
// Specification references:
//   Phase 5 plan — "Analytics dashboard for product team: 2–3 days —
//                    Internal dashboard showing menu composition heatmaps,
//                    promotion rates, decay rates, and seed acceptance rates"
//
// Integration points:
//   - menu-analytics.service.ts: queryAnalytics, getMenuComposition
//   - admin-push.service.ts: getActivePushes (for push impact view)
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import type {
  MenuAnalyticsDaily,
  AnalyticsQuery,
  MenuCompositionSnapshot,
  UsageSource,
} from './menu-analytics.service';

// =============================================================================
// TYPES
// =============================================================================

export interface AnalyticsDashboardProps {
  /** Fetch analytics summaries for a given query. */
  onQueryAnalytics: (query: AnalyticsQuery) => Promise<MenuAnalyticsDaily[]>;

  /** Fetch menu composition snapshot. */
  onGetComposition: (roleId: string, date: string) => Promise<MenuCompositionSnapshot | null>;

  /** Available roles for the role filter. */
  roles: Array<{ value: string; label: string }>;

  /** Available tasks for the task filter (from registry). */
  tasks: Array<{ ref: string; label: string; category: string }>;
}

/**
 * Summary card data for the top-level KPIs.
 */
interface KpiSummary {
  totalUses: number;
  uniqueUsers: number;
  avgPromotionRate: number;
  avgDecayRate: number;
  avgRestoreRate: number;
  topTask: string;
  topTaskUses: number;
}

/**
 * Per-task row in the detailed analytics table.
 */
interface TaskAnalyticsRow {
  taskRef: string;
  taskLabel: string;
  uniqueUsers: number;
  totalUses: number;
  promotionRate: number;
  decayRate: number;
  restoreRate: number;
  avgPosition: number;
  topSource: UsageSource;
  trend: 'up' | 'down' | 'stable';
}

// =============================================================================
// DATE HELPERS
// =============================================================================

function todayString(): string {
  return new Date().toISOString().split('T')[0]!;
}

function daysAgoString(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0]!;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AnalyticsDashboard({
  onQueryAnalytics,
  onGetComposition,
  roles,
  tasks,
}: AnalyticsDashboardProps) {
  // ── Filter state ──

  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeView, setActiveView] = useState<'overview' | 'composition' | 'trends'>('overview');

  // ── Data state ──

  const [summaries, setSummaries] = useState<MenuAnalyticsDaily[]>([]);
  const [composition, setComposition] = useState<MenuCompositionSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Compute date range ──

  const { startDate, endDate } = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return { startDate: daysAgoString(days), endDate: todayString() };
  }, [dateRange]);

  // ── Fetch data when filters change ──

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const query: AnalyticsQuery = {
          startDate,
          endDate,
          ...(selectedRole && { roleId: selectedRole }),
          ...(selectedTask && { taskRef: selectedTask }),
        };

        const data = await onQueryAnalytics(query);
        if (!cancelled) setSummaries(data);

        // Also fetch composition for the overview
        if (activeView === 'composition' && selectedRole) {
          const comp = await onGetComposition(selectedRole, todayString());
          if (!cancelled) setComposition(comp);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load analytics.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    fetchData();

    return () => { cancelled = true; };
  }, [startDate, endDate, selectedRole, selectedTask, activeView, onQueryAnalytics, onGetComposition]);

  // ── Compute KPIs ──

  const kpis = useMemo((): KpiSummary => {
    if (summaries.length === 0) {
      return {
        totalUses: 0,
        uniqueUsers: 0,
        avgPromotionRate: 0,
        avgDecayRate: 0,
        avgRestoreRate: 0,
        topTask: '—',
        topTaskUses: 0,
      };
    }

    const totalUses = summaries.reduce((sum, s) => sum + s.totalUses, 0);
    const uniqueUsers = new Set(
      summaries.flatMap(s => Array.from({ length: s.uniqueUsers }, (_, i) => `${s.roleId}-${s.taskRef}-${i}`)),
    ).size;

    const promotionRates = summaries.filter(s => s.promotionRate > 0).map(s => s.promotionRate);
    const avgPromotionRate = promotionRates.length > 0
      ? Math.round((promotionRates.reduce((a, b) => a + b, 0) / promotionRates.length) * 100) / 100
      : 0;

    const decayRates = summaries.filter(s => s.decayRate > 0).map(s => s.decayRate);
    const avgDecayRate = decayRates.length > 0
      ? Math.round((decayRates.reduce((a, b) => a + b, 0) / decayRates.length) * 100) / 100
      : 0;

    const restoreRates = summaries.filter(s => s.restoreRate > 0).map(s => s.restoreRate);
    const avgRestoreRate = restoreRates.length > 0
      ? Math.round((restoreRates.reduce((a, b) => a + b, 0) / restoreRates.length) * 100) / 100
      : 0;

    // Group by task to find top task
    const taskUses = new Map<string, number>();
    for (const s of summaries) {
      taskUses.set(s.taskRef, (taskUses.get(s.taskRef) ?? 0) + s.totalUses);
    }

    let topTask = '—';
    let topTaskUses = 0;
    for (const [ref, uses] of taskUses) {
      if (uses > topTaskUses) {
        topTask = tasks.find(t => t.ref === ref)?.label ?? ref;
        topTaskUses = uses;
      }
    }

    return { totalUses, uniqueUsers, avgPromotionRate, avgDecayRate, avgRestoreRate, topTask, topTaskUses };
  }, [summaries, tasks]);

  // ── Compute task rows for the detailed table ──

  const taskRows = useMemo((): TaskAnalyticsRow[] => {
    // Group summaries by taskRef
    const grouped = new Map<string, MenuAnalyticsDaily[]>();
    for (const s of summaries) {
      const existing = grouped.get(s.taskRef);
      if (existing) {
        existing.push(s);
      } else {
        grouped.set(s.taskRef, [s]);
      }
    }

    const rows: TaskAnalyticsRow[] = [];

    for (const [taskRef, entries] of grouped) {
      const totalUses = entries.reduce((sum, e) => sum + e.totalUses, 0);
      const uniqueUsers = Math.max(...entries.map(e => e.uniqueUsers));

      const promotionRates = entries.filter(e => e.promotionRate > 0).map(e => e.promotionRate);
      const promotionRate = promotionRates.length > 0
        ? Math.round((promotionRates.reduce((a, b) => a + b, 0) / promotionRates.length) * 100)
        : 0;

      const decayRates = entries.filter(e => e.decayRate > 0).map(e => e.decayRate);
      const decayRate = decayRates.length > 0
        ? Math.round((decayRates.reduce((a, b) => a + b, 0) / decayRates.length) * 100)
        : 0;

      const restoreRates = entries.filter(e => e.restoreRate > 0).map(e => e.restoreRate);
      const restoreRate = restoreRates.length > 0
        ? Math.round((restoreRates.reduce((a, b) => a + b, 0) / restoreRates.length) * 100)
        : 0;

      const positions = entries.filter(e => e.avgPosition >= 0).map(e => e.avgPosition);
      const avgPosition = positions.length > 0
        ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
        : -1;

      // Find top source across all entries
      const sourceTotals: Record<string, number> = {};
      for (const entry of entries) {
        for (const [source, count] of Object.entries(entry.sourceDistribution)) {
          sourceTotals[source] = (sourceTotals[source] ?? 0) + count;
        }
      }
      const topSource = Object.entries(sourceTotals)
        .sort(([, a], [, b]) => b - a)[0]?.[0] as UsageSource ?? 'navigation';

      // Determine trend from first half vs second half of entries
      const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date));
      const mid = Math.floor(sorted.length / 2);
      const firstHalf = sorted.slice(0, mid);
      const secondHalf = sorted.slice(mid);

      const firstAvg = firstHalf.length > 0
        ? firstHalf.reduce((sum, e) => sum + e.totalUses, 0) / firstHalf.length
        : 0;
      const secondAvg = secondHalf.length > 0
        ? secondHalf.reduce((sum, e) => sum + e.totalUses, 0) / secondHalf.length
        : 0;

      const trend: 'up' | 'down' | 'stable' =
        secondAvg > firstAvg * 1.1 ? 'up' :
        secondAvg < firstAvg * 0.9 ? 'down' :
        'stable';

      rows.push({
        taskRef,
        taskLabel: tasks.find(t => t.ref === taskRef)?.label ?? taskRef,
        uniqueUsers,
        totalUses,
        promotionRate,
        decayRate,
        restoreRate,
        avgPosition,
        topSource,
        trend,
      });
    }

    // Sort by total uses (descending)
    return rows.sort((a, b) => b.totalUses - a.totalUses);
  }, [summaries, tasks]);

  // ── Heatmap data (for composition view) ──

  const heatmapData = useMemo(() => {
    if (!composition) return [];

    return composition.tasks
      .sort((a, b) => b.presenceRate - a.presenceRate)
      .map(task => ({
        taskRef: task.taskRef,
        taskLabel: tasks.find(t => t.ref === task.taskRef)?.label ?? task.taskRef,
        presenceRate: task.presenceRate,
        activeCount: task.activeCount,
        overflowCount: task.overflowCount,
        pushedCount: task.pushedCount,
        avgPosition: task.avgPosition,
        // Heatmap colour intensity based on presence rate
        intensity: Math.round(task.presenceRate * 100),
      }));
  }, [composition, tasks]);

  // ── Render ──

  return (
    <div className="analytics-dashboard" role="region" aria-label="Menu Analytics Dashboard">
      <h2 className="analytics-dashboard__title">Menu Analytics</h2>

      {/* Filters */}
      <div className="analytics-dashboard__filters">
        <div className="analytics-dashboard__filter-group">
          <label htmlFor="analytics-role">Role</label>
          <select
            id="analytics-role"
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
          >
            <option value="">All Roles</option>
            {roles.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        <div className="analytics-dashboard__filter-group">
          <label htmlFor="analytics-task">Task</label>
          <select
            id="analytics-task"
            value={selectedTask}
            onChange={e => setSelectedTask(e.target.value)}
          >
            <option value="">All Tasks</option>
            {tasks.map(t => (
              <option key={t.ref} value={t.ref}>{t.label} ({t.ref})</option>
            ))}
          </select>
        </div>

        <div className="analytics-dashboard__filter-group">
          <label>Period</label>
          <div className="analytics-dashboard__date-buttons">
            {(['7d', '30d', '90d'] as const).map(range => (
              <button
                key={range}
                className={`analytics-dashboard__date-button ${
                  dateRange === range ? 'analytics-dashboard__date-button--active' : ''
                }`}
                onClick={() => setDateRange(range)}
                type="button"
              >
                {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View tabs */}
      <div className="analytics-dashboard__view-tabs" role="tablist">
        {(['overview', 'composition', 'trends'] as const).map(view => (
          <button
            key={view}
            role="tab"
            aria-selected={activeView === view}
            className={`analytics-dashboard__view-tab ${
              activeView === view ? 'analytics-dashboard__view-tab--active' : ''
            }`}
            onClick={() => setActiveView(view)}
            type="button"
          >
            {view === 'overview' && 'Overview'}
            {view === 'composition' && 'Menu Composition'}
            {view === 'trends' && 'Task Details'}
          </button>
        ))}
      </div>

      {/* Loading / Error */}
      {isLoading && (
        <div className="analytics-dashboard__loading" role="status" aria-live="polite">
          Loading analytics...
        </div>
      )}

      {error && (
        <div className="analytics-dashboard__error" role="alert">
          {error}
        </div>
      )}

      {/* ── OVERVIEW VIEW ── */}
      {activeView === 'overview' && !isLoading && (
        <div className="analytics-dashboard__overview">
          {/* KPI Cards */}
          <div className="analytics-dashboard__kpi-grid">
            <KpiCard
              label="Total Uses"
              value={kpis.totalUses.toLocaleString()}
              detail={`${kpis.uniqueUsers} unique users`}
            />
            <KpiCard
              label="Promotion Rate"
              value={`${Math.round(kpis.avgPromotionRate * 100)}%`}
              detail="Seeds accepted vs dismissed"
            />
            <KpiCard
              label="Decay Rate"
              value={`${Math.round(kpis.avgDecayRate * 100)}%`}
              detail="Items reaching overflow"
            />
            <KpiCard
              label="Restore Rate"
              value={`${Math.round(kpis.avgRestoreRate * 100)}%`}
              detail="Overflow items restored"
            />
            <KpiCard
              label="Top Task"
              value={kpis.topTask}
              detail={`${kpis.topTaskUses.toLocaleString()} uses`}
            />
          </div>

          {/* Summary table */}
          {taskRows.length > 0 && (
            <div className="analytics-dashboard__table-container">
              <h3 className="analytics-dashboard__section-title">Task Breakdown</h3>
              <table className="analytics-dashboard__table" role="table">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col">Users</th>
                    <th scope="col">Uses</th>
                    <th scope="col">Promotion %</th>
                    <th scope="col">Decay %</th>
                    <th scope="col">Restore %</th>
                    <th scope="col">Avg Pos</th>
                    <th scope="col">Top Source</th>
                    <th scope="col">Trend</th>
                  </tr>
                </thead>
                <tbody>
                  {taskRows.slice(0, 20).map(row => (
                    <tr key={row.taskRef}>
                      <td>
                        <span className="analytics-dashboard__task-label">
                          {row.taskLabel}
                        </span>
                        <span className="analytics-dashboard__task-ref">
                          {row.taskRef}
                        </span>
                      </td>
                      <td>{row.uniqueUsers}</td>
                      <td>{row.totalUses}</td>
                      <td>{row.promotionRate}%</td>
                      <td>{row.decayRate}%</td>
                      <td>{row.restoreRate}%</td>
                      <td>{row.avgPosition >= 0 ? row.avgPosition : '—'}</td>
                      <td>{row.topSource}</td>
                      <td>
                        <span className={`analytics-dashboard__trend analytics-dashboard__trend--${row.trend}`}>
                          {row.trend === 'up' ? '↑' : row.trend === 'down' ? '↓' : '→'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── COMPOSITION VIEW ── */}
      {activeView === 'composition' && !isLoading && (
        <div className="analytics-dashboard__composition">
          {!selectedRole ? (
            <p className="analytics-dashboard__hint">
              Select a role to view menu composition.
            </p>
          ) : heatmapData.length === 0 ? (
            <p className="analytics-dashboard__empty">
              No composition data available for this role and date.
            </p>
          ) : (
            <>
              <h3 className="analytics-dashboard__section-title">
                Menu Composition: {roles.find(r => r.value === selectedRole)?.label}
              </h3>
              <p className="analytics-dashboard__subtitle">
                {composition?.totalUsers ?? 0} users with this role
              </p>

              {/* Heatmap grid */}
              <div className="analytics-dashboard__heatmap">
                {heatmapData.map(cell => (
                  <div
                    key={cell.taskRef}
                    className="analytics-dashboard__heatmap-cell"
                    style={{
                      '--intensity': `${cell.intensity}%`,
                    } as React.CSSProperties}
                    title={`${cell.taskLabel}: ${cell.intensity}% of users have this in their menu`}
                  >
                    <span className="analytics-dashboard__heatmap-label">
                      {cell.taskLabel}
                    </span>
                    <span className="analytics-dashboard__heatmap-value">
                      {cell.intensity}%
                    </span>
                    <span className="analytics-dashboard__heatmap-detail">
                      {cell.activeCount} active · {cell.overflowCount} overflow
                      {cell.pushedCount > 0 && ` · ${cell.pushedCount} pushed`}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── TRENDS VIEW ── */}
      {activeView === 'trends' && !isLoading && (
        <div className="analytics-dashboard__trends">
          <h3 className="analytics-dashboard__section-title">Daily Trends</h3>

          {summaries.length === 0 ? (
            <p className="analytics-dashboard__empty">
              No data available for the selected filters and date range.
            </p>
          ) : (
            <div className="analytics-dashboard__trend-table-container">
              <table className="analytics-dashboard__table" role="table">
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Role</th>
                    <th scope="col">Task</th>
                    <th scope="col">Users</th>
                    <th scope="col">Uses</th>
                    <th scope="col">Avg Duration</th>
                    <th scope="col">Promotions</th>
                    <th scope="col">Decays</th>
                    <th scope="col">Restores</th>
                  </tr>
                </thead>
                <tbody>
                  {summaries
                    .sort((a, b) => b.date.localeCompare(a.date))
                    .slice(0, 50)
                    .map((s, index) => (
                      <tr key={`${s.roleId}-${s.taskRef}-${s.date}-${index}`}>
                        <td>{s.date}</td>
                        <td>{s.roleId}</td>
                        <td>{tasks.find(t => t.ref === s.taskRef)?.label ?? s.taskRef}</td>
                        <td>{s.uniqueUsers}</td>
                        <td>{s.totalUses}</td>
                        <td>
                          {s.avgDurationMs > 0
                            ? `${Math.round(s.avgDurationMs / 1000)}s`
                            : '—'
                          }
                        </td>
                        <td>{s.promotionCount}</td>
                        <td>{s.decayStartCount + s.overflowCount}</td>
                        <td>{s.restoreCount}</td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// KPI CARD COMPONENT
// =============================================================================

interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
}

function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <div className="analytics-dashboard__kpi-card">
      <dt className="analytics-dashboard__kpi-label">{label}</dt>
      <dd className="analytics-dashboard__kpi-value">{value}</dd>
      <dd className="analytics-dashboard__kpi-detail">{detail}</dd>
    </div>
  );
}
