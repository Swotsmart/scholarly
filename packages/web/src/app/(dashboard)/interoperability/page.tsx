'use client';

/**
 * Interoperability Hub
 * Connect with education platforms using 1EdTech and Ed-Fi standards
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Link as LinkIcon,
  Users,
  Shapes,
  Award,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Clock,
  Activity,
  RefreshCw,
  Shield,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const platformCards = [
  {
    id: 'lti',
    title: 'LTI Advantage 1.3',
    description: 'Launch and integrate external learning tools with full grade passback support',
    icon: LinkIcon,
    color: 'blue',
    href: '/interoperability/lti',
    stats: [
      { label: 'Platforms Connected', value: '3' },
      { label: 'Tools Registered', value: '12' },
    ],
    status: 'active' as const,
    statusLabel: 'All Systems Active',
  },
  {
    id: 'oneroster',
    title: 'OneRoster 1.2',
    description: 'Roster synchronization for users, classes, enrollments, and organizations',
    icon: Users,
    color: 'green',
    href: '/interoperability/oneroster',
    stats: [
      { label: 'Connections', value: '2' },
      { label: 'Records Synced', value: '15,432' },
    ],
    status: 'synced' as const,
    statusLabel: 'Last sync 2h ago',
  },
  {
    id: 'case',
    title: 'CASE Network',
    description: 'Competency and Academic Standards Exchange for curriculum alignment',
    icon: Shapes,
    color: 'purple',
    href: '/interoperability/case',
    stats: [
      { label: 'Frameworks Imported', value: '8' },
      { label: 'Items Mapped', value: '2,340' },
    ],
    status: 'active' as const,
    statusLabel: 'Fully Mapped',
  },
  {
    id: 'badges',
    title: 'Open Badges / CLR',
    description: 'Issue, verify, and manage Open Badges 3.0 and Comprehensive Learner Records',
    icon: Award,
    color: 'amber',
    href: '/interoperability/badges',
    stats: [
      { label: 'Badge Definitions', value: '45' },
      { label: 'Badges Issued', value: '312' },
      { label: 'CLR Assembled', value: '8' },
    ],
    status: 'active' as const,
    statusLabel: 'Issuing Active',
  },
  {
    id: 'edfi',
    title: 'Ed-Fi ODS/API',
    description: 'Bidirectional sync with Ed-Fi Operational Data Store for district interoperability',
    icon: Database,
    color: 'red',
    href: '/interoperability/edfi',
    stats: [
      { label: 'District Connections', value: '3' },
      { label: 'Records Synced', value: '89,234' },
      { label: 'Conflicts Pending', value: '2' },
    ],
    status: 'warning' as const,
    statusLabel: '2 conflicts pending',
  },
];

const healthMetrics = [
  { label: 'Overall Uptime', value: 99.8, color: 'green' },
  { label: 'Sync Success Rate', value: 97.2, color: 'green' },
  { label: 'API Response Time', value: 45, unit: 'ms', color: 'blue' },
  { label: 'Data Freshness', value: 98.5, color: 'green' },
];

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: 'text-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', icon: 'text-green-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', icon: 'text-purple-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: 'text-amber-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500', icon: 'text-red-500' },
};

export default function InteroperabilityHubPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Interoperability Hub</h1>
          <p className="text-muted-foreground">
            Connect with education platforms using 1EdTech and Ed-Fi standards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
          <Button size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Security Settings
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Activity className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">5</p>
              <p className="text-sm text-muted-foreground">Active Integrations</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">104,666</p>
              <p className="text-sm text-muted-foreground">Total Records Synced</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Clock className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">1h ago</p>
              <p className="text-sm text-muted-foreground">Last Sync Activity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <AlertCircle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">Pending Conflicts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Platform Cards - First Row (3 columns) */}
      <div className="grid gap-4 lg:grid-cols-3">
        {platformCards.slice(0, 3).map((platform) => {
          const colors = colorMap[platform.color];
          const Icon = platform.icon;
          return (
            <Card key={platform.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg ${colors.bg} p-3`}>
                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                  </div>
                  <Badge
                    variant={platform.status === 'warning' ? 'destructive' : 'default'}
                    className={
                      platform.status === 'active' || platform.status === 'synced'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : ''
                    }
                  >
                    {platform.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {platform.status === 'synced' && <Clock className="h-3 w-3 mr-1" />}
                    {platform.status === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {platform.statusLabel}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{platform.title}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {platform.stats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{stat.label}</span>
                      <span className="font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full" variant="outline">
                  <Link href={platform.href}>
                    Manage
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Platform Cards - Second Row (2 columns) */}
      <div className="grid gap-4 lg:grid-cols-2">
        {platformCards.slice(3).map((platform) => {
          const colors = colorMap[platform.color];
          const Icon = platform.icon;
          return (
            <Card key={platform.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className={`rounded-lg ${colors.bg} p-3`}>
                    <Icon className={`h-6 w-6 ${colors.icon}`} />
                  </div>
                  <Badge
                    variant={platform.status === 'warning' ? 'destructive' : 'default'}
                    className={
                      platform.status === 'active' || platform.status === 'synced'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : ''
                    }
                  >
                    {platform.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                    {platform.status === 'synced' && <Clock className="h-3 w-3 mr-1" />}
                    {platform.status === 'warning' && <AlertCircle className="h-3 w-3 mr-1" />}
                    {platform.statusLabel}
                  </Badge>
                </div>
                <CardTitle className="text-lg mt-3">{platform.title}</CardTitle>
                <CardDescription>{platform.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {platform.stats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{stat.label}</span>
                      <span className="font-semibold">{stat.value}</span>
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full" variant="outline">
                  <Link href={platform.href}>
                    Manage
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Sync Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sync Health Summary
          </CardTitle>
          <CardDescription>
            Overall health metrics across all interoperability connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {healthMetrics.map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-semibold">
                    {metric.value}{metric.unit ? metric.unit : '%'}
                  </span>
                </div>
                <Progress
                  value={metric.unit ? Math.min(metric.value / 2, 100) : metric.value}
                  className="h-2"
                />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4 rounded-lg border p-4">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">All core integrations are operational</p>
              <p className="text-xs text-muted-foreground">
                Last full health check completed at 2026-01-26T08:00:00Z. Next scheduled check in 55 minutes.
              </p>
            </div>
            <Button variant="outline" size="sm">
              Run Health Check
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
