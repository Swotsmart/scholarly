'use client';

/**
 * Admin Dashboard Page
 * Platform overview with KPIs, trend charts, alerts, and system health
 * Updated to follow UI/UX Design System v2.0
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { PageHeader, StatsCard, StatusBadge } from '@/components/shared';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Users,
  Activity,
  GraduationCap,
  Clock,
  UserPlus,
  FileBarChart,
  Settings,
  ScrollText,
  Cpu,
  Database,
  MemoryStick,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  Shield,
  UserCheck,
  AlertCircle,
  RefreshCw,
  Zap,
  Server,
  Wifi,
  HardDrive,
  BookOpen,
  Target,
  Percent,
  ChevronRight,
  Bell,
  ExternalLink,
} from 'lucide-react';

// KPI Stats
const kpiStats = [
  {
    label: 'Total Enrollment',
    value: '2,847',
    icon: GraduationCap,
    variant: 'primary' as const,
    change: 8.2,
    subtitle: '+234 this term',
  },
  {
    label: 'Daily Attendance',
    value: '94.2%',
    icon: UserCheck,
    variant: 'success' as const,
    change: 1.5,
    subtitle: 'Today',
  },
  {
    label: 'Engagement Score',
    value: '78%',
    icon: Target,
    variant: 'primary' as const,
    change: 4.3,
    subtitle: 'Platform-wide',
  },
  {
    label: 'Compliance Score',
    value: '96%',
    icon: Shield,
    variant: 'success' as const,
    change: 2.1,
    subtitle: 'All frameworks',
  },
];

// Trend data (week-over-week comparison)
const trendData = {
  enrollment: [
    { week: 'W1', current: 2613, previous: 2480 },
    { week: 'W2', current: 2672, previous: 2523 },
    { week: 'W3', current: 2745, previous: 2589 },
    { week: 'W4', current: 2847, previous: 2658 },
  ],
  attendance: [
    { week: 'W1', current: 92.1, previous: 91.5 },
    { week: 'W2', current: 93.4, previous: 92.0 },
    { week: 'W3', current: 94.8, previous: 92.8 },
    { week: 'W4', current: 94.2, previous: 93.1 },
  ],
  engagement: [
    { week: 'W1', current: 71, previous: 68 },
    { week: 'W2', current: 74, previous: 70 },
    { week: 'W3', current: 76, previous: 72 },
    { week: 'W4', current: 78, previous: 74 },
  ],
};

// Critical alerts
const criticalAlerts = [
  {
    id: 'alert1',
    type: 'critical' as const,
    title: 'Storage capacity warning',
    description: 'Data lake storage at 87% capacity. Consider archiving old data or expanding.',
    timestamp: '10 min ago',
    actionLabel: 'View Storage',
    actionHref: '/admin/settings',
  },
  {
    id: 'alert2',
    type: 'warning' as const,
    title: 'NAPLAN sync incomplete',
    description: '15 student records failed to sync with ACARA portal. Manual review required.',
    timestamp: '25 min ago',
    actionLabel: 'Review Records',
    actionHref: '/interoperability/edfi',
  },
  {
    id: 'alert3',
    type: 'info' as const,
    title: 'Scheduled maintenance',
    description: 'Platform maintenance scheduled for Sunday 02:00-04:00 AEST.',
    timestamp: '1 hour ago',
    actionLabel: 'View Details',
    actionHref: '/admin/settings',
  },
];

// Staff overview
const staffMetrics = {
  totalTeachers: 74,
  presentToday: 68,
  onLeave: 4,
  reliefNeeded: 2,
  averageWorkload: 'Moderate',
  departments: [
    { name: 'Mathematics', staff: 12, coverage: 100 },
    { name: 'English', staff: 10, coverage: 90 },
    { name: 'Science', staff: 14, coverage: 100 },
    { name: 'Humanities', staff: 8, coverage: 88 },
    { name: 'Languages', staff: 6, coverage: 100 },
    { name: 'Creative Arts', staff: 8, coverage: 75 },
  ],
};

// Relief needs
const reliefRequests = [
  { id: 'r1', teacher: 'Dr. Sarah Chen', date: 'Today', periods: [2, 3], reason: 'PD Day', status: 'covered' as const },
  { id: 'r2', teacher: 'James Liu', date: 'Today', periods: [4, 5, 6], reason: 'Sick Leave', status: 'partial' as const },
  { id: 'r3', teacher: 'Emily Watson', date: 'Tomorrow', periods: [1, 2, 3, 4], reason: 'Personal Leave', status: 'pending' as const },
];

// Student metrics
const studentMetrics = {
  atRiskCount: 23,
  atRiskChange: -3,
  performanceDistribution: [
    { level: 'Exceeding', count: 412, percentage: 14.5, color: 'bg-green-500' },
    { level: 'Meeting', count: 1789, percentage: 62.8, color: 'bg-blue-500' },
    { level: 'Approaching', count: 498, percentage: 17.5, color: 'bg-amber-500' },
    { level: 'Below', count: 148, percentage: 5.2, color: 'bg-red-500' },
  ],
  recentFlags: [
    { student: 'James C.', issue: 'Attendance below 80%', class: 'Year 10', severity: 'high' as const },
    { student: 'Sophie W.', issue: 'Assignment completion low', class: 'Year 11', severity: 'medium' as const },
    { student: 'Michael B.', issue: 'Engagement declining', class: 'Year 9', severity: 'medium' as const },
  ],
};

// Compliance status (traffic light)
const complianceStatus: Array<{ framework: string; status: 'green' | 'amber' | 'red'; score: number; lastAudit: string }> = [
  { framework: 'Australian Curriculum', status: 'green', score: 98, lastAudit: '15 Jan 2026' },
  { framework: 'ACARA Reporting', status: 'green', score: 100, lastAudit: '20 Jan 2026' },
  { framework: 'NAPLAN Alignment', status: 'green', score: 95, lastAudit: '18 Jan 2026' },
  { framework: 'Privacy (APPs)', status: 'green', score: 100, lastAudit: '22 Jan 2026' },
  { framework: 'ESOS Compliance', status: 'amber', score: 87, lastAudit: '10 Jan 2026' },
  { framework: 'Accessibility (WCAG)', status: 'green', score: 94, lastAudit: '12 Jan 2026' },
];

// Quick actions
const quickActions = [
  { label: 'Run Report', href: '/admin/reports', icon: FileBarChart, description: 'Generate analytics report' },
  { label: 'Manage Users', href: '/admin/users', icon: Users, description: 'User administration' },
  { label: 'Configure Settings', href: '/admin/settings', icon: Settings, description: 'Platform configuration' },
  { label: 'View Audit Logs', href: '/admin/reports', icon: ScrollText, description: 'System activity logs' },
];

// System health
const systemHealth = {
  overall: 'healthy' as const,
  uptime: '99.97%',
  metrics: [
    { label: 'CPU Usage', value: 34, status: 'healthy' as const },
    { label: 'Memory Usage', value: 62, status: 'healthy' as const },
    { label: 'Database Load', value: 45, status: 'healthy' as const },
    { label: 'API Latency', value: 142, unit: 'ms', status: 'healthy' as const },
  ],
  integrations: [
    { name: 'Google Workspace', status: 'connected' as const, lastSync: '5 min ago' },
    { name: 'Microsoft 365', status: 'connected' as const, lastSync: '8 min ago' },
    { name: 'Canvas LMS', status: 'disconnected' as const, lastSync: '2 days ago' },
    { name: 'NAPLAN Portal', status: 'syncing' as const, lastSync: 'In progress' },
  ],
  storage: {
    used: 45.2,
    total: 100,
    percentage: 45,
  },
};

function getAlertIcon(type: 'critical' | 'warning' | 'info') {
  switch (type) {
    case 'critical':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="h-5 w-5 text-amber-500" />;
    case 'info':
      return <AlertCircle className="h-5 w-5 text-blue-500" />;
  }
}

function getAlertBorderColor(type: 'critical' | 'warning' | 'info') {
  switch (type) {
    case 'critical':
      return 'border-l-red-500';
    case 'warning':
      return 'border-l-amber-500';
    case 'info':
      return 'border-l-blue-500';
  }
}

function getComplianceColor(status: 'green' | 'amber' | 'red') {
  switch (status) {
    case 'green':
      return 'bg-green-500';
    case 'amber':
      return 'bg-amber-500';
    case 'red':
      return 'bg-red-500';
  }
}

function getReliefStatusBadge(status: 'covered' | 'partial' | 'pending') {
  switch (status) {
    case 'covered':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Covered</Badge>;
    case 'partial':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Partial</Badge>;
    case 'pending':
      return <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">Pending</Badge>;
  }
}

export default function AdminDashboardPage() {
  const [trendMetric, setTrendMetric] = useState<'enrollment' | 'attendance' | 'engagement'>('enrollment');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Dashboard"
        description="Platform overview and system health for Scholarly Australia"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/admin/reports">
                <FileBarChart className="mr-2 h-4 w-4" />
                Reports
              </Link>
            </Button>
            <Button asChild>
              <Link href="/admin/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpiStats.map((stat) => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            variant={stat.variant}
            change={stat.change}
            subtitle={stat.subtitle}
          />
        ))}
      </div>

      {/* Critical Alerts */}
      {criticalAlerts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                <CardTitle>Alerts Requiring Attention</CardTitle>
              </div>
              <Badge variant="secondary">{criticalAlerts.length} active</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {criticalAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-4 rounded-lg border border-l-4 p-4 ${getAlertBorderColor(alert.type)}`}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <span className="text-xs text-muted-foreground">{alert.timestamp}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">{alert.description}</p>
                </div>
                <Button size="sm" variant="outline" asChild>
                  <Link href={alert.actionHref}>
                    {alert.actionLabel}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Trend Charts & Staff Overview */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Trend Charts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Week-over-Week Trends
                </CardTitle>
                <CardDescription>Compare current vs previous period</CardDescription>
              </div>
            </div>
            <Tabs value={trendMetric} onValueChange={(v) => setTrendMetric(v as typeof trendMetric)} className="mt-2">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
                <TabsTrigger value="attendance">Attendance</TabsTrigger>
                <TabsTrigger value="engagement">Engagement</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trendData[trendMetric].map((week, idx) => {
                const change = ((week.current - week.previous) / week.previous) * 100;
                const isPositive = change >= 0;
                return (
                  <div key={week.week} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{week.week}</span>
                      <div className="flex items-center gap-4">
                        <span className="text-muted-foreground">
                          {trendMetric === 'enrollment' ? week.current.toLocaleString() : `${week.current}%`}
                        </span>
                        <span className={`flex items-center text-xs ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                          {isPositive ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {isPositive ? '+' : ''}{change.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 h-2">
                      <div
                        className="bg-blue-500 rounded-l"
                        style={{ width: `${(week.current / Math.max(...trendData[trendMetric].map(w => w.current))) * 100}%` }}
                      />
                      <div
                        className="bg-gray-300 dark:bg-gray-700 rounded-r"
                        style={{ width: `${((Math.max(...trendData[trendMetric].map(w => w.current)) - week.current) / Math.max(...trendData[trendMetric].map(w => w.current))) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-4 pt-4 border-t text-xs">
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 bg-blue-500 rounded" />
                <span>Current Period</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-4 bg-gray-300 dark:bg-gray-700 rounded" />
                <span>Previous Period</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-purple-500" />
                  Staff Overview
                </CardTitle>
                <CardDescription>Attendance, relief needs, and workload</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/scheduling/relief">Manage Relief</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Staff attendance summary */}
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-green-600">{staffMetrics.presentToday}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-amber-600">{staffMetrics.onLeave}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold text-red-600">{staffMetrics.reliefNeeded}</p>
                <p className="text-xs text-muted-foreground">Relief Needed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <p className="text-2xl font-bold">{staffMetrics.totalTeachers}</p>
                <p className="text-xs text-muted-foreground">Total Staff</p>
              </div>
            </div>

            {/* Relief requests */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Relief Requests</p>
              {reliefRequests.map((request) => (
                <div key={request.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">{request.teacher}</p>
                      <p className="text-xs text-muted-foreground">
                        {request.date} - Periods {request.periods.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{request.reason}</span>
                    {getReliefStatusBadge(request.status)}
                  </div>
                </div>
              ))}
            </div>

            {/* Department coverage */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Department Coverage</p>
              <div className="grid grid-cols-2 gap-2">
                {staffMetrics.departments.slice(0, 4).map((dept) => (
                  <div key={dept.name} className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
                    <span>{dept.name}</span>
                    <span className={dept.coverage === 100 ? 'text-green-600' : 'text-amber-600'}>
                      {dept.coverage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student Metrics & Compliance */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Student Metrics */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-blue-500" />
                  Student Metrics
                </CardTitle>
                <CardDescription>Performance distribution and at-risk students</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/teacher/students/at-risk">View At-Risk</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* At-risk summary */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div>
                  <p className="text-2xl font-bold">{studentMetrics.atRiskCount}</p>
                  <p className="text-sm text-muted-foreground">At-risk students</p>
                </div>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <TrendingDown className="h-4 w-4" />
                <span className="text-sm font-medium">{studentMetrics.atRiskChange} this week</span>
              </div>
            </div>

            {/* Performance distribution */}
            <div className="space-y-3">
              <p className="text-sm font-medium">Performance Distribution</p>
              <div className="flex h-4 rounded-full overflow-hidden">
                {studentMetrics.performanceDistribution.map((level) => (
                  <div
                    key={level.level}
                    className={level.color}
                    style={{ width: `${level.percentage}%` }}
                    title={`${level.level}: ${level.count} students (${level.percentage}%)`}
                  />
                ))}
              </div>
              <div className="grid grid-cols-4 gap-2 text-xs">
                {studentMetrics.performanceDistribution.map((level) => (
                  <div key={level.level} className="text-center">
                    <div className={`h-2 w-2 rounded-full ${level.color} mx-auto mb-1`} />
                    <p className="font-medium">{level.count}</p>
                    <p className="text-muted-foreground">{level.level}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent flags */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Recent Flags</p>
              {studentMetrics.recentFlags.map((flag, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{flag.student}</p>
                    <p className="text-xs text-muted-foreground">{flag.issue}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{flag.class}</span>
                    <Badge variant={flag.severity === 'high' ? 'destructive' : 'secondary'}>
                      {flag.severity}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Compliance Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-green-500" />
                  Compliance Status
                </CardTitle>
                <CardDescription>Framework compliance across all standards</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/reports">Full Report</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {complianceStatus.map((item) => (
              <div
                key={item.framework}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className={`h-3 w-3 rounded-full ${getComplianceColor(item.status)}`} />
                  <div>
                    <p className="text-sm font-medium">{item.framework}</p>
                    <p className="text-xs text-muted-foreground">Last audit: {item.lastAudit}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-medium ${
                    item.score >= 95 ? 'text-green-600' : item.score >= 80 ? 'text-amber-600' : 'text-red-600'
                  }`}>
                    {item.score}%
                  </span>
                  {item.status === 'green' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                  {item.status === 'amber' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  {item.status === 'red' && <XCircle className="h-4 w-4 text-red-500" />}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common administration tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.label} href={action.href}>
                  <div className="flex flex-col items-center gap-3 rounded-lg border p-6 text-center hover:bg-muted/50 transition-colors cursor-pointer">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{action.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{action.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* System Health */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-green-500" />
                System Health
              </CardTitle>
              <CardDescription>Integration status and platform performance</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status="active" label="All Systems Operational" showDot />
              <Button variant="ghost" size="sm">
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Performance metrics */}
            <div className="space-y-4">
              <p className="text-sm font-medium">Performance Metrics</p>
              {systemHealth.metrics.map((metric) => (
                <div key={metric.label} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{metric.label}</span>
                    <span className="text-muted-foreground">
                      {metric.value}{metric.unit || '%'}
                    </span>
                  </div>
                  <Progress
                    value={metric.unit ? Math.min((metric.value / 500) * 100, 100) : metric.value}
                    className="h-2"
                  />
                </div>
              ))}
              <div className="flex items-center justify-between rounded-lg border p-3 mt-4">
                <div className="flex items-center gap-3">
                  <HardDrive className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Storage</p>
                    <p className="text-xs text-muted-foreground">
                      {systemHealth.storage.used} GB / {systemHealth.storage.total} GB
                    </p>
                  </div>
                </div>
                <Badge variant="secondary">{systemHealth.storage.percentage}%</Badge>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Uptime</p>
                    <p className="text-xs text-muted-foreground">Last 30 days</p>
                  </div>
                </div>
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  {systemHealth.uptime}
                </Badge>
              </div>
            </div>

            {/* Integration status */}
            <div className="space-y-4">
              <p className="text-sm font-medium">Integration Status</p>
              {systemHealth.integrations.map((integration) => (
                <div key={integration.name} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <div className={`h-2 w-2 rounded-full ${
                      integration.status === 'connected' ? 'bg-green-500' :
                      integration.status === 'syncing' ? 'bg-blue-500 animate-pulse' :
                      'bg-red-500'
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{integration.name}</p>
                      <p className="text-xs text-muted-foreground">Last sync: {integration.lastSync}</p>
                    </div>
                  </div>
                  <StatusBadge status={integration.status} />
                </div>
              ))}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/settings">
                  Manage Integrations
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
