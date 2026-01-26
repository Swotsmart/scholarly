'use client';

/**
 * Ed-Fi ODS/API Sync Management
 * Manage Ed-Fi district connections, sync jobs, and conflict resolution
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Database,
  ArrowLeft,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Loader2,
  Settings,
  GitPullRequest,
  Server,
  FileText,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { EdFiConnection, EdFiSyncJob, EdFiConflict } from '@/types/interoperability';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockConnections: EdFiConnection[] = [
  {
    id: 'edfi-1',
    districtName: 'Sydney Metro ISD',
    baseUrl: 'https://api.sydneymetro.edu.au/edfi/v5.3',
    apiVersion: '5.3',
    status: 'connected',
    lastSync: '2026-01-26T07:00:00Z',
    syncDirection: 'bidirectional',
  },
  {
    id: 'edfi-2',
    districtName: 'Melbourne Region',
    baseUrl: 'https://api.melbregion.edu.au/edfi/v5.3',
    apiVersion: '5.3',
    status: 'connected',
    lastSync: '2026-01-26T06:30:00Z',
    syncDirection: 'inbound',
  },
  {
    id: 'edfi-3',
    districtName: 'Brisbane South',
    baseUrl: 'https://api.brisbanesouth.edu.au/edfi/v5.2',
    apiVersion: '5.2',
    status: 'error',
    lastSync: '2026-01-25T22:00:00Z',
    syncDirection: 'outbound',
  },
];

const mockSyncJobs: EdFiSyncJob[] = [
  {
    id: 'efsj-1',
    connectionId: 'edfi-1',
    direction: 'inbound',
    resourceType: 'Students',
    status: 'completed',
    recordsProcessed: 12450,
    recordsTotal: 12450,
    conflicts: 0,
    startedAt: '2026-01-26T07:00:00Z',
  },
  {
    id: 'efsj-2',
    connectionId: 'edfi-1',
    direction: 'outbound',
    resourceType: 'Grades',
    status: 'completed',
    recordsProcessed: 34200,
    recordsTotal: 34200,
    conflicts: 1,
    startedAt: '2026-01-26T07:05:00Z',
  },
  {
    id: 'efsj-3',
    connectionId: 'edfi-1',
    direction: 'inbound',
    resourceType: 'Staff',
    status: 'completed',
    recordsProcessed: 890,
    recordsTotal: 890,
    conflicts: 0,
    startedAt: '2026-01-26T07:08:00Z',
  },
  {
    id: 'efsj-4',
    connectionId: 'edfi-2',
    direction: 'inbound',
    resourceType: 'Students',
    status: 'completed',
    recordsProcessed: 8900,
    recordsTotal: 8900,
    conflicts: 0,
    startedAt: '2026-01-26T06:30:00Z',
  },
  {
    id: 'efsj-5',
    connectionId: 'edfi-2',
    direction: 'inbound',
    resourceType: 'Enrollments',
    status: 'completed',
    recordsProcessed: 15600,
    recordsTotal: 15600,
    conflicts: 1,
    startedAt: '2026-01-26T06:35:00Z',
  },
  {
    id: 'efsj-6',
    connectionId: 'edfi-2',
    direction: 'inbound',
    resourceType: 'Sections',
    status: 'running',
    recordsProcessed: 1200,
    recordsTotal: 3400,
    conflicts: 0,
    startedAt: '2026-01-26T06:40:00Z',
  },
  {
    id: 'efsj-7',
    connectionId: 'edfi-3',
    direction: 'outbound',
    resourceType: 'Students',
    status: 'failed',
    recordsProcessed: 4500,
    recordsTotal: 9800,
    conflicts: 0,
    startedAt: '2026-01-25T22:00:00Z',
  },
  {
    id: 'efsj-8',
    connectionId: 'edfi-3',
    direction: 'outbound',
    resourceType: 'Assessments',
    status: 'pending',
    recordsProcessed: 0,
    recordsTotal: 5200,
    conflicts: 0,
    startedAt: '2026-01-25T22:10:00Z',
  },
];

const mockConflicts: EdFiConflict[] = [
  {
    id: 'efc-1',
    jobId: 'efsj-2',
    resourceType: 'StudentGrade',
    fieldName: 'letterGradeEarned',
    localValue: 'A',
    remoteValue: 'A-',
    status: 'unresolved',
    createdAt: '2026-01-26T07:06:12Z',
  },
  {
    id: 'efc-2',
    jobId: 'efsj-5',
    resourceType: 'StudentEnrollment',
    fieldName: 'entryDate',
    localValue: '2026-01-15',
    remoteValue: '2026-01-20',
    status: 'unresolved',
    createdAt: '2026-01-26T06:36:45Z',
  },
];

const stats = [
  { label: 'Districts', value: '3', icon: Server, color: 'blue' },
  { label: 'Records', value: '89,234', icon: Database, color: 'green' },
  { label: 'Last Sync', value: '1h ago', icon: Clock, color: 'purple' },
  { label: 'Conflicts', value: '2', icon: AlertTriangle, color: 'red' },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
};

function getDistrictName(connectionId: string): string {
  const conn = mockConnections.find((c) => c.id === connectionId);
  return conn?.districtName ?? 'Unknown';
}

function getDirectionIcon(direction: string) {
  switch (direction) {
    case 'bidirectional':
      return <ArrowDownUp className="h-3 w-3 mr-1" />;
    case 'inbound':
      return <ArrowDown className="h-3 w-3 mr-1" />;
    case 'outbound':
      return <ArrowUp className="h-3 w-3 mr-1" />;
    default:
      return null;
  }
}

function getConnectionStatusBadge(status: string) {
  switch (status) {
    case 'connected':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Connected
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge variant="secondary">
          <XCircle className="h-3 w-3 mr-1" />
          Disconnected
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getJobStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Completed
        </Badge>
      );
    case 'running':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Running
        </Badge>
      );
    case 'failed':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    case 'pending':
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function EdFiPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/interoperability">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="heading-2">Ed-Fi ODS/API</h1>
          <p className="text-muted-foreground">
            Manage Ed-Fi district connections, data synchronization, and conflict resolution
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Zap className="h-4 w-4 mr-2" />
            Start Sync
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Connection
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg ${colors.bg} p-3`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* District Connections */}
      <div>
        <h2 className="text-lg font-semibold mb-4">District Connections</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {mockConnections.map((conn) => (
            <Card key={conn.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`rounded-lg ${conn.status === 'error' ? 'bg-red-500/10' : 'bg-blue-500/10'} p-3`}>
                      <Server className={`h-6 w-6 ${conn.status === 'error' ? 'text-red-500' : 'text-blue-500'}`} />
                    </div>
                    <div>
                      <CardTitle className="text-base">{conn.districtName}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {conn.baseUrl}
                      </CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    {getConnectionStatusBadge(conn.status)}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">API Version</span>
                    <Badge variant="outline">v{conn.apiVersion}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Direction</span>
                    <Badge variant="outline">
                      {getDirectionIcon(conn.syncDirection)}
                      {conn.syncDirection}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Sync</span>
                    <span className="text-muted-foreground">
                      {new Date(conn.lastSync).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button className="flex-1" variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Sync
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sync Jobs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sync Jobs
          </CardTitle>
          <CardDescription>Recent synchronization jobs across all district connections</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">District</th>
                  <th className="px-4 py-3 text-left font-medium">Direction</th>
                  <th className="px-4 py-3 text-left font-medium">Resource Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Progress</th>
                  <th className="px-4 py-3 text-left font-medium">Conflicts</th>
                  <th className="px-4 py-3 text-left font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockSyncJobs.map((job) => {
                  const progressPercent =
                    job.recordsTotal > 0
                      ? Math.round((job.recordsProcessed / job.recordsTotal) * 100)
                      : 0;
                  return (
                    <tr key={job.id} className="hover:bg-muted/50">
                      <td className="px-4 py-3 font-medium">
                        {getDistrictName(job.connectionId)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline">
                          {getDirectionIcon(job.direction)}
                          {job.direction}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{job.resourceType}</Badge>
                      </td>
                      <td className="px-4 py-3">{getJobStatusBadge(job.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 min-w-[160px]">
                          <Progress value={progressPercent} className="h-1.5 flex-1" />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {job.recordsProcessed.toLocaleString()} / {job.recordsTotal.toLocaleString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {job.conflicts > 0 ? (
                          <span className="text-amber-600 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            {job.conflicts}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">0</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(job.startedAt).toLocaleTimeString('en-AU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Conflict Resolution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GitPullRequest className="h-5 w-5 text-amber-500" />
            Conflict Resolution
          </CardTitle>
          <CardDescription>
            {mockConflicts.length} unresolved conflict{mockConflicts.length !== 1 ? 's' : ''} require attention
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {mockConflicts.map((conflict) => (
            <div
              key={conflict.id}
              className="border rounded-lg p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold">{conflict.resourceType}</span>
                  <Badge variant="outline">{conflict.fieldName}</Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(conflict.createdAt).toLocaleString('en-AU', {
                    day: 'numeric',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Local
                    </Badge>
                    <span className="text-xs text-muted-foreground">Scholarly</span>
                  </div>
                  <p className="font-mono text-sm font-semibold">{conflict.localValue}</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      Remote
                    </Badge>
                    <span className="text-xs text-muted-foreground">Ed-Fi ODS</span>
                  </div>
                  <p className="font-mono text-sm font-semibold">{conflict.remoteValue}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" size="sm">
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Keep Local
                </Button>
                <Button variant="outline" size="sm">
                  <ArrowDown className="h-4 w-4 mr-1" />
                  Keep Remote
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
