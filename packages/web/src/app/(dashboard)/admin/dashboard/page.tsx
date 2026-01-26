'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Activity,
  HardDrive,
  Clock,
  UserPlus,
  FileBarChart,
  Settings,
  ScrollText,
  Cpu,
  Database,
  MemoryStick,
  ArrowRight,
} from 'lucide-react';

const stats = [
  { label: 'Total Users', value: '1,247', icon: Users, color: 'blue' },
  { label: 'Active Sessions', value: '89', icon: Activity, color: 'green' },
  { label: 'Storage Used', value: '45.2 GB', icon: HardDrive, color: 'purple' },
  { label: 'Uptime', value: '99.97%', icon: Clock, color: 'orange' },
];

const healthMetrics = [
  { label: 'CPU Usage', value: 34, color: 'bg-green-500' },
  { label: 'Memory Usage', value: 62, color: 'bg-yellow-500' },
  { label: 'Database Connections', value: 45, max: 100, color: 'bg-blue-500' },
];

const recentActivity = [
  { id: 'a1', action: 'User Registered', description: 'New learner account created for Sophie Taylor', user: 'System', timestamp: '9:12 AM', type: 'user' },
  { id: 'a2', action: 'Config Updated', description: 'Maintenance window scheduled for 28 Jan 02:00-04:00 AEST', user: 'Jack Williams', timestamp: '8:45 AM', type: 'config' },
  { id: 'a3', action: 'Report Generated', description: 'Term 1 enrolment summary exported', user: 'Charlotte Nguyen', timestamp: '8:30 AM', type: 'report' },
  { id: 'a4', action: 'User Suspended', description: 'Account suspended for Thomas Brown (policy violation)', user: 'Jack Williams', timestamp: '7:15 AM', type: 'user' },
  { id: 'a5', action: 'Feature Flag Toggled', description: 'AI Buddy chat enabled for Year 11-12 learners', user: 'Jack Williams', timestamp: 'Yesterday 4:50 PM', type: 'config' },
];

const quickActions = [
  { label: 'Manage Users', href: '/admin/users', icon: Users, description: 'View and manage platform accounts' },
  { label: 'Generate Report', href: '/admin/reports', icon: FileBarChart, description: 'Create system and compliance reports' },
  { label: 'System Config', href: '/admin/settings', icon: Settings, description: 'Platform settings and feature flags' },
  { label: 'View Logs', href: '/admin/reports', icon: ScrollText, description: 'Audit logs and system activity' },
];

function getActivityBadgeVariant(type: string) {
  switch (type) {
    case 'user':
      return 'default' as const;
    case 'config':
      return 'secondary' as const;
    case 'report':
      return 'outline' as const;
    default:
      return 'secondary' as const;
  }
}

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Platform overview and system health for Scholarly Australia
          </p>
        </div>
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
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Platform Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-green-500" />
              Platform Health
            </CardTitle>
            <CardDescription>Real-time system performance metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {healthMetrics.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{metric.label}</span>
                  <span className="text-muted-foreground">
                    {metric.max ? `${metric.value}/${metric.max}` : `${metric.value}%`}
                  </span>
                </div>
                <Progress
                  value={metric.max ? (metric.value / metric.max) * 100 : metric.value}
                  className="h-2"
                />
              </div>
            ))}
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Avg Response Time</p>
                  <p className="text-xs text-muted-foreground">Last 24 hours</p>
                </div>
              </div>
              <Badge variant="secondary">142ms</Badge>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <MemoryStick className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Cache Hit Rate</p>
                  <p className="text-xs text-muted-foreground">Redis cluster</p>
                </div>
              </div>
              <Badge variant="secondary">97.3%</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Admin Activity</CardTitle>
                <CardDescription>Latest platform administration events</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/admin/reports">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start justify-between rounded-lg border p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <Badge variant={getActivityBadgeVariant(activity.type)} className="text-xs">
                      {activity.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activity.user} &middot; {activity.timestamp}
                  </p>
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
    </div>
  );
}
