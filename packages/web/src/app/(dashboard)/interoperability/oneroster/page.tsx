'use client';

/**
 * OneRoster 1.2 Sync Management
 * Manage roster synchronization connections, jobs, and field mappings
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  RefreshCw,
  ArrowLeft,
  Plus,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Database,
  FileText,
  Loader2,
  Settings,
  MapPin,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { OneRosterConnection, OneRosterSyncJob } from '@/types/interoperability';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockConnections: OneRosterConnection[] = [
  {
    id: 'or-1',
    name: 'NSW Department of Education',
    baseUrl: 'https://api.det.nsw.edu.au/oneroster/v1p2',
    syncDirection: 'bidirectional',
    status: 'connected',
    lastSync: '2026-01-26T06:00:00Z',
    recordCount: 8721,
  },
  {
    id: 'or-2',
    name: 'Victoria Department of Education',
    baseUrl: 'https://api.education.vic.gov.au/oneroster/v1p2',
    syncDirection: 'inbound',
    status: 'connected',
    lastSync: '2026-01-26T05:30:00Z',
    recordCount: 6711,
  },
];

const mockSyncJobs: OneRosterSyncJob[] = [
  {
    id: 'orsj-1',
    connectionId: 'or-1',
    status: 'completed',
    resourceType: 'Users',
    recordsProcessed: 2450,
    recordsTotal: 2450,
    startedAt: '2026-01-26T06:00:00Z',
    completedAt: '2026-01-26T06:02:34Z',
    errors: 0,
  },
  {
    id: 'orsj-2',
    connectionId: 'or-1',
    status: 'completed',
    resourceType: 'Enrollments',
    recordsProcessed: 4120,
    recordsTotal: 4120,
    startedAt: '2026-01-26T06:03:00Z',
    completedAt: '2026-01-26T06:06:12Z',
    errors: 2,
  },
  {
    id: 'orsj-3',
    connectionId: 'or-1',
    status: 'completed',
    resourceType: 'Classes',
    recordsProcessed: 312,
    recordsTotal: 312,
    startedAt: '2026-01-26T06:07:00Z',
    completedAt: '2026-01-26T06:07:45Z',
    errors: 0,
  },
  {
    id: 'orsj-4',
    connectionId: 'or-2',
    status: 'completed',
    resourceType: 'Users',
    recordsProcessed: 1890,
    recordsTotal: 1890,
    startedAt: '2026-01-26T05:30:00Z',
    completedAt: '2026-01-26T05:32:10Z',
    errors: 1,
  },
  {
    id: 'orsj-5',
    connectionId: 'or-2',
    status: 'failed',
    resourceType: 'Enrollments',
    recordsProcessed: 1200,
    recordsTotal: 3400,
    startedAt: '2026-01-26T05:33:00Z',
    errors: 3,
  },
  {
    id: 'orsj-6',
    connectionId: 'or-2',
    status: 'completed',
    resourceType: 'Orgs',
    recordsProcessed: 45,
    recordsTotal: 45,
    startedAt: '2026-01-26T05:35:00Z',
    completedAt: '2026-01-26T05:35:12Z',
    errors: 0,
  },
];

const fieldMappings = [
  { scholarly: 'student.firstName', oneroster: 'users.givenName', mapped: true },
  { scholarly: 'student.lastName', oneroster: 'users.familyName', mapped: true },
  { scholarly: 'student.email', oneroster: 'users.email', mapped: true },
  { scholarly: 'student.yearLevel', oneroster: 'users.grades', mapped: true },
  { scholarly: 'class.name', oneroster: 'classes.title', mapped: true },
  { scholarly: 'class.code', oneroster: 'classes.classCode', mapped: true },
  { scholarly: 'enrollment.role', oneroster: 'enrollments.role', mapped: true },
  { scholarly: 'org.name', oneroster: 'orgs.name', mapped: true },
];

const stats = [
  { label: 'Connections', value: '2', icon: Users, color: 'blue' },
  { label: 'Records', value: '15,432', icon: Database, color: 'green' },
  { label: 'Last Sync', value: '2h ago', icon: Clock, color: 'purple' },
  { label: 'Sync Errors', value: '3', icon: AlertTriangle, color: 'red' },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
};

function getConnectionName(connectionId: string): string {
  const conn = mockConnections.find((c) => c.id === connectionId);
  return conn?.name ?? 'Unknown';
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

function getStatusBadge(status: string) {
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

export default function OneRosterPage() {
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
          <h1 className="heading-2">OneRoster 1.2</h1>
          <p className="text-muted-foreground">
            Manage roster synchronization for users, classes, enrollments, and organizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Sync Settings
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

      {/* Connections */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Connections</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {mockConnections.map((conn) => (
            <Card key={conn.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <Users className="h-6 w-6 text-green-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{conn.name}</CardTitle>
                      <CardDescription className="font-mono text-xs mt-1">
                        {conn.baseUrl}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Direction</span>
                    <Badge variant="outline">
                      {getDirectionIcon(conn.syncDirection)}
                      {conn.syncDirection}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Records</span>
                    <span className="font-semibold">{conn.recordCount.toLocaleString()}</span>
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
                <Button className="w-full" variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync Now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Sync History
          </CardTitle>
          <CardDescription>Recent synchronization jobs and their results</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Job ID</th>
                  <th className="px-4 py-3 text-left font-medium">Connection</th>
                  <th className="px-4 py-3 text-left font-medium">Resource Type</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Records</th>
                  <th className="px-4 py-3 text-left font-medium">Errors</th>
                  <th className="px-4 py-3 text-left font-medium">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mockSyncJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-mono text-xs">{job.id}</td>
                    <td className="px-4 py-3">{getConnectionName(job.connectionId)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{job.resourceType}</Badge>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(job.status)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span>
                          {job.recordsProcessed.toLocaleString()} / {job.recordsTotal.toLocaleString()}
                        </span>
                        {job.status === 'running' && (
                          <Progress
                            value={(job.recordsProcessed / job.recordsTotal) * 100}
                            className="h-1.5 w-16"
                          />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {job.errors > 0 ? (
                        <span className="text-red-600 font-medium">{job.errors}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(job.startedAt).toLocaleTimeString('en-AU', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Field Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Field Mappings
          </CardTitle>
          <CardDescription>
            How Scholarly fields map to OneRoster resource attributes
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Scholarly Field</th>
                  <th className="px-4 py-3 text-center font-medium">Mapping</th>
                  <th className="px-4 py-3 text-left font-medium">OneRoster Field</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {fieldMappings.map((mapping) => (
                  <tr key={mapping.scholarly} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {mapping.scholarly}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <ArrowDownUp className="h-4 w-4 text-muted-foreground inline" />
                    </td>
                    <td className="px-4 py-3">
                      <code className="rounded bg-muted px-2 py-1 text-xs">
                        {mapping.oneroster}
                      </code>
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Mapped
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
