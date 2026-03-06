'use client';

/**
 * Menu Analytics Page
 * Internal dashboard showing menu composition heatmaps, promotion rates,
 * decay rates, and seed acceptance rates across the user population.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Activity,
  Layers,
  Sprout,
  ArrowUpRight,
} from 'lucide-react';
import { AnalyticsDashboard } from '@/components/analytics-dashboard';
import { getAllTasks } from '@/config/menu-registry';
import type { AnalyticsQuery, MenuAnalyticsDaily, MenuCompositionSnapshot } from '@/services/menu-analytics.service';

// Available roles for filtering
const ROLES = [
  { value: 'learner', label: 'Learner' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'parent', label: 'Parent' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'admin', label: 'Admin' },
];

// Build task list from registry for the task filter
function getTaskOptions() {
  try {
    const tasks = getAllTasks();
    return tasks.map((t) => ({
      ref: t.ref,
      label: t.name,
      category: t.cluster,
    }));
  } catch {
    return [];
  }
}

const FALLBACK_SUMMARY = {
  totalEvents: 24580,
  activeUsers: 1247,
  avgItemsPerMenu: 8.3,
  seedAcceptanceRate: 72,
  promotionRate: 45,
  decayRate: 12,
  topTasks: [
    { name: 'Dashboard', uses: 4521 },
    { name: 'Gradebook', uses: 3890 },
    { name: 'Attendance', uses: 2456 },
    { name: 'Calendar', uses: 2100 },
    { name: 'Reports', uses: 1890 },
  ],
  roleBreakdown: [
    { role: 'Teacher', users: 456, avgItems: 9.2 },
    { role: 'Learner', users: 623, avgItems: 6.8 },
    { role: 'Parent', users: 168, avgItems: 5.4 },
  ],
};

// Stub query handler -- in production, calls the API
async function handleQueryAnalytics(query: AnalyticsQuery): Promise<MenuAnalyticsDaily[]> {
  console.log('Querying analytics:', query);
  return [];
}

// Stub composition handler -- in production, calls the API
async function handleGetComposition(
  roleId: string,
  date: string
): Promise<MenuCompositionSnapshot | null> {
  console.log('Getting composition:', roleId, date);
  return null;
}

export default function MenuAnalyticsPage() {
  const summary = FALLBACK_SUMMARY;


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Menu Analytics
        </h1>
        <p className="text-muted-foreground">
          Self-composing menu intelligence -- usage patterns, promotion rates, and seed acceptance
        </p>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Events</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{summary.totalEvents.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Active Users</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{summary.activeUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">With menu activity</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Sprout className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Seed Acceptance</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{summary.seedAcceptanceRate}%</div>
            <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="h-3 w-3" /> +4% vs last month
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Avg Items/Menu</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{summary.avgItemsPerMenu}</div>
            <p className="text-xs text-muted-foreground mt-1">Across all roles</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="heatmap">Heatmap Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Rates */}
            <Card>
              <CardHeader>
                <CardTitle>Composition Rates</CardTitle>
                <CardDescription>How menu items move through lifecycle stages</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="font-medium">Promotion Rate</p>
                        <p className="text-sm text-muted-foreground">Seed to permanent</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{summary.promotionRate}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-medium">Decay Rate</p>
                        <p className="text-sm text-muted-foreground">Unused items removed</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{summary.decayRate}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <Sprout className="h-5 w-5 text-emerald-500" />
                      <div>
                        <p className="font-medium">Seed Acceptance</p>
                        <p className="text-sm text-muted-foreground">New items adopted</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{summary.seedAcceptanceRate}%</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Top Tasks */}
            <Card>
              <CardHeader>
                <CardTitle>Top Tasks</CardTitle>
                <CardDescription>Most accessed menu items across all users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {summary.topTasks.map((task, i) => (
                    <div key={task.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                          {i + 1}
                        </span>
                        <span className="font-medium">{task.name}</span>
                      </div>
                      <Badge variant="secondary">{task.uses.toLocaleString()} uses</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Role Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Role Breakdown</CardTitle>
              <CardDescription>Menu composition statistics by user role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {summary.roleBreakdown.map((role) => (
                  <div key={role.role} className="p-4 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-primary" />
                      <h4 className="font-semibold">{role.role}</h4>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Active users</span>
                      <span className="font-medium">{role.users}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="text-muted-foreground">Avg items</span>
                      <span className="font-medium">{role.avgItems}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="heatmap">
          <AnalyticsDashboard
            onQueryAnalytics={handleQueryAnalytics}
            onGetComposition={handleGetComposition}
            roles={ROLES}
            tasks={getTaskOptions()}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
