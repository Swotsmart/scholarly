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
//   Phase 5 plan — "Analytics dashboard for product team: 2-3 days —
//                    Internal dashboard showing menu composition heatmaps,
//                    promotion rates, decay rates, and seed acceptance rates"
//
// Integration points:
//   - menu-analytics.service.ts: queryAnalytics, getMenuComposition
//   - admin-push.service.ts: getActivePushes (for push impact view)
// =============================================================================

import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

/* Recharts v2 has incomplete TypeScript generics — prop casts below are intentional */

import { cn } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';

import type {
  MenuAnalyticsDaily,
  AnalyticsQuery,
  MenuCompositionSnapshot,
  UsageSource,
} from '@/services/menu-analytics.service';

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

/** Shape of a task entry inside MenuCompositionSnapshot.tasks */
interface CompositionTaskEntry {
  taskRef: string;
  presenceRate: number;
  avgPosition: number;
  seedCount: number;
  activeCount: number;
  overflowCount: number;
  pushedCount: number;
}

/** Shape of a heatmap cell for the composition view */
interface HeatmapCell {
  taskRef: string;
  taskLabel: string;
  presenceRate: number;
  activeCount: number;
  overflowCount: number;
  pushedCount: number;
  avgPosition: number;
  intensity: number;
}

// =============================================================================
// RATE HELPERS
// =============================================================================
// Compute rates from count fields. The service type defines promotionRate,
// decayRate, restoreRate as pre-computed fields, but the Prisma model only
// stores counts. These helpers ensure the dashboard works correctly regardless
// of whether the data source pre-computes rates or not.
// =============================================================================

function computePromotionRate(s: MenuAnalyticsDaily): number {
  if (s.promotionRate > 0) return s.promotionRate;
  const denom = s.promotionCount + s.dismissalCount;
  return denom > 0 ? s.promotionCount / denom : 0;
}

function computeDecayRate(s: MenuAnalyticsDaily): number {
  if (s.decayRate > 0) return s.decayRate;
  const denom = s.overflowCount + s.restoreCount;
  return denom > 0 ? s.overflowCount / denom : 0;
}

function computeRestoreRate(s: MenuAnalyticsDaily): number {
  if (s.restoreRate > 0) return s.restoreRate;
  return s.overflowCount > 0 ? s.restoreCount / s.overflowCount : 0;
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
  // -- Filter state --

  const [selectedRole, setSelectedRole] = useState('');
  const [selectedTask, setSelectedTask] = useState('');
  const [dateRange, setDateRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [activeView, setActiveView] = useState<'overview' | 'composition' | 'trends'>('overview');

  // -- Data state --

  const [summaries, setSummaries] = useState<MenuAnalyticsDaily[]>([]);
  const [composition, setComposition] = useState<MenuCompositionSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -- Compute date range --

  const { startDate, endDate } = useMemo(() => {
    const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
    return { startDate: daysAgoString(days), endDate: todayString() };
  }, [dateRange]);

  // -- Fetch data when filters change --

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

        // Also fetch composition for the composition view
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

  // -- Compute KPIs --

  const kpis = useMemo((): KpiSummary => {
    if (summaries.length === 0) {
      return {
        totalUses: 0,
        uniqueUsers: 0,
        avgPromotionRate: 0,
        avgDecayRate: 0,
        avgRestoreRate: 0,
        topTask: '\u2014',
        topTaskUses: 0,
      };
    }

    const totalUses = summaries.reduce((sum: number, s: MenuAnalyticsDaily) => sum + s.totalUses, 0);
    const uniqueUsers = new Set(
      summaries.flatMap((s: MenuAnalyticsDaily) => Array.from({ length: s.uniqueUsers }, (_: unknown, i: number) => `${s.roleId}-${s.taskRef}-${i}`)),
    ).size;

    const promotionRates = summaries.map((s: MenuAnalyticsDaily) => computePromotionRate(s)).filter((r: number) => r > 0);
    const avgPromotionRate = promotionRates.length > 0
      ? Math.round((promotionRates.reduce((a: number, b: number) => a + b, 0) / promotionRates.length) * 100) / 100
      : 0;

    const decayRates = summaries.map((s: MenuAnalyticsDaily) => computeDecayRate(s)).filter((r: number) => r > 0);
    const avgDecayRate = decayRates.length > 0
      ? Math.round((decayRates.reduce((a: number, b: number) => a + b, 0) / decayRates.length) * 100) / 100
      : 0;

    const restoreRates = summaries.map((s: MenuAnalyticsDaily) => computeRestoreRate(s)).filter((r: number) => r > 0);
    const avgRestoreRate = restoreRates.length > 0
      ? Math.round((restoreRates.reduce((a: number, b: number) => a + b, 0) / restoreRates.length) * 100) / 100
      : 0;

    // Group by task to find top task
    const taskUses = new Map<string, number>();
    for (const s of summaries) {
      taskUses.set(s.taskRef, (taskUses.get(s.taskRef) ?? 0) + s.totalUses);
    }

    let topTask = '\u2014';
    let topTaskUses = 0;
    const taskUsesEntries = Array.from(taskUses.entries());
    for (const [ref, uses] of taskUsesEntries) {
      if (uses > topTaskUses) {
        topTask = tasks.find((t: { ref: string; label: string }) => t.ref === ref)?.label ?? ref;
        topTaskUses = uses;
      }
    }

    return { totalUses, uniqueUsers, avgPromotionRate, avgDecayRate, avgRestoreRate, topTask, topTaskUses };
  }, [summaries, tasks]);

  // -- Compute task rows for the detailed table --

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

    const groupedEntries = Array.from(grouped.entries());
    for (const [taskRef, entries] of groupedEntries) {
      const totalUses = entries.reduce((sum: number, e: MenuAnalyticsDaily) => sum + e.totalUses, 0);
      const uniqueUsers = Math.max(...entries.map((e: MenuAnalyticsDaily) => e.uniqueUsers));

      const promotionRates = entries.map((e: MenuAnalyticsDaily) => computePromotionRate(e)).filter((r: number) => r > 0);
      const promotionRate = promotionRates.length > 0
        ? Math.round((promotionRates.reduce((a: number, b: number) => a + b, 0) / promotionRates.length) * 100)
        : 0;

      const decayRates = entries.map((e: MenuAnalyticsDaily) => computeDecayRate(e)).filter((r: number) => r > 0);
      const decayRate = decayRates.length > 0
        ? Math.round((decayRates.reduce((a: number, b: number) => a + b, 0) / decayRates.length) * 100)
        : 0;

      const restoreRates = entries.map((e: MenuAnalyticsDaily) => computeRestoreRate(e)).filter((r: number) => r > 0);
      const restoreRate = restoreRates.length > 0
        ? Math.round((restoreRates.reduce((a: number, b: number) => a + b, 0) / restoreRates.length) * 100)
        : 0;

      const positions = entries.filter((e: MenuAnalyticsDaily) => e.avgPosition >= 0).map((e: MenuAnalyticsDaily) => e.avgPosition);
      const avgPosition = positions.length > 0
        ? Math.round((positions.reduce((a: number, b: number) => a + b, 0) / positions.length) * 10) / 10
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

  // -- Heatmap data (for composition view) --

  const heatmapData = useMemo(() => {
    if (!composition) return [];

    return composition.tasks
      .sort((a: CompositionTaskEntry, b: CompositionTaskEntry) => b.presenceRate - a.presenceRate)
      .map((task: CompositionTaskEntry) => ({
        taskRef: task.taskRef,
        taskLabel: tasks.find((t: { ref: string; label: string }) => t.ref === task.taskRef)?.label ?? task.taskRef,
        presenceRate: task.presenceRate,
        activeCount: task.activeCount,
        overflowCount: task.overflowCount,
        pushedCount: task.pushedCount,
        avgPosition: task.avgPosition,
        // Heatmap colour intensity based on presence rate
        intensity: Math.round(task.presenceRate * 100),
      }));
  }, [composition, tasks]);

  // -- Chart data for the trends area chart --

  const trendChartData = useMemo(() => {
    const byDate = new Map<string, { date: string; uses: number; users: number; promotions: number; decays: number }>();

    for (const s of summaries) {
      const existing = byDate.get(s.date);
      if (existing) {
        existing.uses += s.totalUses;
        existing.users += s.uniqueUsers;
        existing.promotions += s.promotionCount;
        existing.decays += s.decayStartCount + s.overflowCount;
      } else {
        byDate.set(s.date, {
          date: s.date,
          uses: s.totalUses,
          users: s.uniqueUsers,
          promotions: s.promotionCount,
          decays: s.decayStartCount + s.overflowCount,
        });
      }
    }

    return Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  }, [summaries]);

  // -- Render --

  return (
    <div className="space-y-6" role="region" aria-label="Menu Analytics Dashboard">
      <PageHeader
        title="Menu Analytics"
        description="Self-composing interface performance across the user population"
        actions={
          <div className="flex items-center gap-3">
            <Select
              value={selectedRole || 'all'}
              onValueChange={(val: string) => setSelectedRole(val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {roles.map(r => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedTask || 'all'}
              onValueChange={(val: string) => setSelectedTask(val === 'all' ? '' : val)}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Tasks" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tasks</SelectItem>
                {tasks.map(t => (
                  <SelectItem key={t.ref} value={t.ref}>
                    {t.label} ({t.ref})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center rounded-md border border-input">
              {(['7d', '30d', '90d'] as const).map(range => (
                <Button
                  key={range}
                  variant={dateRange === range ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setDateRange(range)}
                  type="button"
                  className={cn(
                    'rounded-none first:rounded-l-md last:rounded-r-md',
                    dateRange !== range && 'text-muted-foreground',
                  )}
                >
                  {range === '7d' ? '7 Days' : range === '30d' ? '30 Days' : '90 Days'}
                </Button>
              ))}
            </div>
          </div>
        }
      />

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-6" role="status" aria-live="polite">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-6 space-y-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-[300px] w-full" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Analytics</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDateRange(dateRange)}
            >
              Try Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main View Tabs */}
      {!isLoading && !error && (
        <Tabs
          value={activeView}
          onValueChange={(val: string) => setActiveView(val as 'overview' | 'composition' | 'trends')}
        >
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="composition">Menu Composition</TabsTrigger>
            <TabsTrigger value="trends">Task Details</TabsTrigger>
          </TabsList>

          {/* ---- OVERVIEW VIEW ---- */}
          <TabsContent value="overview" className="space-y-6">
            {/* KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <StatsCard
                label="Total Uses"
                value={kpis.totalUses.toLocaleString()}
                icon={Activity}
                variant="primary"
                subtitle={`${kpis.uniqueUsers} unique users`}
              />
              <StatsCard
                label="Promotion Rate"
                value={`${Math.round(kpis.avgPromotionRate * 100)}%`}
                icon={TrendingUp}
                variant="success"
                subtitle="Seeds accepted vs dismissed"
              />
              <StatsCard
                label="Decay Rate"
                value={`${Math.round(kpis.avgDecayRate * 100)}%`}
                icon={TrendingDown}
                variant="warning"
                subtitle="Items reaching overflow"
              />
              <StatsCard
                label="Restore Rate"
                value={`${Math.round(kpis.avgRestoreRate * 100)}%`}
                icon={ArrowUpRight}
                variant="primary"
                subtitle="Overflow items restored"
              />
              <StatsCard
                label="Top Task"
                value={kpis.topTask}
                icon={BarChart3}
                variant="primary"
                subtitle={`${kpis.topTaskUses.toLocaleString()} uses`}
              />
            </div>

            {/* Usage Trends Area Chart */}
            {trendChartData.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usage Trends</CardTitle>
                  <CardDescription>Daily uses and user counts over the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={trendChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis
                          dataKey="date"
                          {...{ tick: { fontSize: 12 }, tickFormatter: (val: string) => val.slice(5) } as any}
                          className="text-muted-foreground"
                        />
                        <YAxis {...{ tick: { fontSize: 12 } } as any} className="text-muted-foreground" />
                        <Tooltip
                          {...{
                            contentStyle: {
                              backgroundColor: 'hsl(var(--card))',
                              border: '1px solid hsl(var(--border))',
                              borderRadius: '8px',
                              fontSize: '12px',
                            },
                          } as any}
                        />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="uses"
                          name="Total Uses"
                          stroke="hsl(var(--chart-1))"
                          fill="hsl(var(--chart-1))"
                          fillOpacity={0.2}
                        />
                        <Area
                          type="monotone"
                          dataKey="users"
                          name="Unique Users"
                          stroke="hsl(var(--chart-2))"
                          fill="hsl(var(--chart-2))"
                          fillOpacity={0.2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Task Breakdown Table */}
            {taskRows.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Task Breakdown</CardTitle>
                  <CardDescription>Detailed per-task analytics for the selected period</CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead className="text-right">Users</TableHead>
                        <TableHead className="text-right">Uses</TableHead>
                        <TableHead className="text-right">Promotion %</TableHead>
                        <TableHead className="text-right">Decay %</TableHead>
                        <TableHead className="text-right">Restore %</TableHead>
                        <TableHead className="text-right">Avg Pos</TableHead>
                        <TableHead>Top Source</TableHead>
                        <TableHead>Trend</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taskRows.slice(0, 20).map((row: TaskAnalyticsRow) => (
                        <TableRow key={row.taskRef}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{row.taskLabel}</span>
                              <span className="text-xs text-muted-foreground">{row.taskRef}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">{row.uniqueUsers}</TableCell>
                          <TableCell className="text-right">{row.totalUses}</TableCell>
                          <TableCell className="text-right">{row.promotionRate}%</TableCell>
                          <TableCell className="text-right">{row.decayRate}%</TableCell>
                          <TableCell className="text-right">{row.restoreRate}%</TableCell>
                          <TableCell className="text-right">
                            {row.avgPosition >= 0 ? row.avgPosition : '\u2014'}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{row.topSource}</Badge>
                          </TableCell>
                          <TableCell>
                            {row.trend === 'up' && (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-emerald-500">
                                <ArrowUpRight className="h-4 w-4" />
                                Up
                              </span>
                            )}
                            {row.trend === 'down' && (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-red-500">
                                <ArrowDownRight className="h-4 w-4" />
                                Down
                              </span>
                            )}
                            {row.trend === 'stable' && (
                              <span className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground">
                                <Minus className="h-4 w-4" />
                                Stable
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ---- COMPOSITION VIEW ---- */}
          <TabsContent value="composition" className="space-y-6">
            {!selectedRole ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Users className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    Select a role to view menu composition.
                  </p>
                </CardContent>
              </Card>
            ) : heatmapData.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <BarChart3 className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No composition data available for this role and date.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div>
                  <h3 className="text-lg font-semibold tracking-tight">
                    Menu Composition: {roles.find(r => r.value === selectedRole)?.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {composition?.totalUsers ?? 0} users with this role
                  </p>
                </div>

                {/* Heatmap Grid */}
                <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                  {heatmapData.map((cell: HeatmapCell) => (
                    <Card
                      key={cell.taskRef}
                      className="relative overflow-hidden"
                      title={`${cell.taskLabel}: ${cell.intensity}% of users have this in their menu`}
                    >
                      {/* Background intensity overlay using inline style */}
                      <div
                        className="absolute inset-0 bg-primary"
                        style={{ opacity: cell.intensity / 100 * 0.15 }}
                      />
                      <CardContent className="relative p-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate">{cell.taskLabel}</span>
                          <Badge variant="outline" className="ml-2 shrink-0">
                            {cell.intensity}%
                          </Badge>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {cell.activeCount} active &middot; {cell.overflowCount} overflow
                          {cell.pushedCount > 0 && ` \u00b7 ${cell.pushedCount} pushed`}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Composition Bar Chart */}
                {heatmapData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Presence Rate by Task</CardTitle>
                      <CardDescription>
                        Percentage of users with each task in their menu
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={heatmapData.slice(0, 15)}
                            {...{ layout: 'vertical' } as any}
                            margin={{ left: 120 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              {...{ type: 'number', tick: { fontSize: 12 }, domain: [0, 100] } as any}
                              className="text-muted-foreground"
                            />
                            <YAxis
                              {...{ type: 'category', dataKey: 'taskLabel', tick: { fontSize: 12 }, width: 110 } as any}
                              className="text-muted-foreground"
                            />
                            <Tooltip
                              {...{
                                contentStyle: {
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                },
                                formatter: (value: number) => [`${value}%`, 'Presence Rate'],
                              } as any}
                            />
                            <Bar
                              dataKey="intensity"
                              name="Presence Rate"
                              fill="hsl(var(--chart-3))"
                              radius={[0, 4, 4, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}
          </TabsContent>

          {/* ---- TRENDS VIEW ---- */}
          <TabsContent value="trends" className="space-y-6">
            {summaries.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm text-muted-foreground">
                    No data available for the selected filters and date range.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Promotions vs Decays Chart */}
                {trendChartData.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Promotions vs Decays</CardTitle>
                      <CardDescription>
                        Daily promotion and decay counts over the selected period
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={trendChartData}>
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                              dataKey="date"
                              {...{ tick: { fontSize: 12 }, tickFormatter: (val: string) => val.slice(5) } as any}
                              className="text-muted-foreground"
                            />
                            <YAxis {...{ tick: { fontSize: 12 } } as any} className="text-muted-foreground" />
                            <Tooltip
                              {...{
                                contentStyle: {
                                  backgroundColor: 'hsl(var(--card))',
                                  border: '1px solid hsl(var(--border))',
                                  borderRadius: '8px',
                                  fontSize: '12px',
                                },
                              } as any}
                            />
                            <Legend />
                            <Bar
                              dataKey="promotions"
                              name="Promotions"
                              fill="hsl(var(--chart-4))"
                              radius={[4, 4, 0, 0]}
                            />
                            <Bar
                              dataKey="decays"
                              name="Decays"
                              fill="hsl(var(--chart-5))"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Daily Trends Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Daily Trends</CardTitle>
                    <CardDescription>Raw daily summaries for the selected filters</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Task</TableHead>
                          <TableHead className="text-right">Users</TableHead>
                          <TableHead className="text-right">Uses</TableHead>
                          <TableHead className="text-right">Avg Duration</TableHead>
                          <TableHead className="text-right">Promotions</TableHead>
                          <TableHead className="text-right">Decays</TableHead>
                          <TableHead className="text-right">Restores</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {summaries
                          .sort((a: MenuAnalyticsDaily, b: MenuAnalyticsDaily) => b.date.localeCompare(a.date))
                          .slice(0, 50)
                          .map((s: MenuAnalyticsDaily, index: number) => (
                            <TableRow key={`${s.roleId}-${s.taskRef}-${s.date}-${index}`}>
                              <TableCell className="font-mono text-sm">{s.date}</TableCell>
                              <TableCell>{s.roleId}</TableCell>
                              <TableCell>
                                {tasks.find((t: { ref: string; label: string }) => t.ref === s.taskRef)?.label ?? s.taskRef}
                              </TableCell>
                              <TableCell className="text-right">{s.uniqueUsers}</TableCell>
                              <TableCell className="text-right">{s.totalUses}</TableCell>
                              <TableCell className="text-right">
                                {s.avgDurationMs > 0
                                  ? `${Math.round(s.avgDurationMs / 1000)}s`
                                  : '\u2014'
                                }
                              </TableCell>
                              <TableCell className="text-right">{s.promotionCount}</TableCell>
                              <TableCell className="text-right">
                                {s.decayStartCount + s.overflowCount}
                              </TableCell>
                              <TableCell className="text-right">{s.restoreCount}</TableCell>
                            </TableRow>
                          ))
                        }
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
