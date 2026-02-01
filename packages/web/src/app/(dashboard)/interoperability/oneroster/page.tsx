'use client';

/**
 * OneRoster 1.2 Sync Management
 * SIS selection, field mapping, sync scheduling, and sync history with error logs
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
  Calendar,
  Play,
  Pause,
  Trash2,
  Zap,
  Filter,
  Download,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared';
import type { OneRosterConnection, OneRosterSyncJob } from '@/types/interoperability';

// ---------------------------------------------------------------------------
// Types & Mock Data
// ---------------------------------------------------------------------------

interface SISProvider {
  id: string;
  name: string;
  logo?: string;
  description: string;
  status: 'available' | 'connected' | 'coming-soon';
}

interface FieldMapping {
  id: string;
  scholarlyField: string;
  onerosterField: string;
  transformation?: string;
  isRequired: boolean;
  status: 'mapped' | 'unmapped' | 'error';
}

interface SyncSchedule {
  id: string;
  name: string;
  frequency: 'hourly' | 'daily' | 'weekly' | 'manual';
  time?: string;
  dayOfWeek?: string;
  resourceTypes: string[];
  isEnabled: boolean;
  lastRun?: string;
  nextRun?: string;
}

interface SyncLogEntry {
  id: string;
  connectionId: string;
  connectionName: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  resourceType: string;
  recordsProcessed: number;
  recordsTotal: number;
  errors: number;
  duration: string;
  errorDetails?: string[];
}

const sisProviders: SISProvider[] = [
  { id: 'tass', name: 'TASS.web', description: 'Complete school administration and student management', status: 'connected' },
  { id: 'synergetic', name: 'Synergetic', description: 'Student management for independent schools', status: 'available' },
  { id: 'compass', name: 'Compass School Manager', description: 'Learning management and administration', status: 'available' },
  { id: 'sentral', name: 'Sentral', description: 'School management and reporting platform', status: 'available' },
  { id: 'daymap', name: 'Daymap', description: 'Timetabling and student management', status: 'coming-soon' },
  { id: 'edumate', name: 'Edumate', description: 'School management for Catholic schools', status: 'coming-soon' },
];

const mockConnections: OneRosterConnection[] = [
  {
    id: 'or-1',
    name: 'TASS.web Production',
    baseUrl: 'https://api.tass.com.au/oneroster/v1p2',
    syncDirection: 'bidirectional',
    status: 'connected',
    lastSync: '2026-01-29T06:00:00Z',
    recordCount: 8721,
  },
  {
    id: 'or-2',
    name: 'Compass Test Environment',
    baseUrl: 'https://api.compass.education/oneroster/v1p2',
    syncDirection: 'inbound',
    status: 'connected',
    lastSync: '2026-01-29T05:30:00Z',
    recordCount: 6711,
  },
];

const fieldMappings: FieldMapping[] = [
  { id: 'fm-1', scholarlyField: 'student.firstName', onerosterField: 'users.givenName', isRequired: true, status: 'mapped' },
  { id: 'fm-2', scholarlyField: 'student.lastName', onerosterField: 'users.familyName', isRequired: true, status: 'mapped' },
  { id: 'fm-3', scholarlyField: 'student.email', onerosterField: 'users.email', isRequired: true, status: 'mapped' },
  { id: 'fm-4', scholarlyField: 'student.yearLevel', onerosterField: 'users.grades', transformation: 'YEAR_LEVEL_TRANSFORM', isRequired: true, status: 'mapped' },
  { id: 'fm-5', scholarlyField: 'student.dateOfBirth', onerosterField: 'users.birthDate', transformation: 'DATE_FORMAT_ISO', isRequired: false, status: 'mapped' },
  { id: 'fm-6', scholarlyField: 'class.name', onerosterField: 'classes.title', isRequired: true, status: 'mapped' },
  { id: 'fm-7', scholarlyField: 'class.code', onerosterField: 'classes.classCode', isRequired: true, status: 'mapped' },
  { id: 'fm-8', scholarlyField: 'enrollment.role', onerosterField: 'enrollments.role', transformation: 'ROLE_MAPPING', isRequired: true, status: 'mapped' },
  { id: 'fm-9', scholarlyField: 'org.name', onerosterField: 'orgs.name', isRequired: true, status: 'mapped' },
  { id: 'fm-10', scholarlyField: 'student.homeGroup', onerosterField: 'users.metadata.homeGroup', isRequired: false, status: 'unmapped' },
];

const syncSchedules: SyncSchedule[] = [
  {
    id: 'sched-1',
    name: 'Nightly Full Sync',
    frequency: 'daily',
    time: '02:00',
    resourceTypes: ['Users', 'Classes', 'Enrollments', 'Orgs'],
    isEnabled: true,
    lastRun: '2026-01-29T02:00:00Z',
    nextRun: '2026-01-30T02:00:00Z',
  },
  {
    id: 'sched-2',
    name: 'Hourly Delta Sync',
    frequency: 'hourly',
    resourceTypes: ['Users', 'Enrollments'],
    isEnabled: true,
    lastRun: '2026-01-29T08:00:00Z',
    nextRun: '2026-01-29T09:00:00Z',
  },
  {
    id: 'sched-3',
    name: 'Weekly Organizations',
    frequency: 'weekly',
    time: '03:00',
    dayOfWeek: 'Sunday',
    resourceTypes: ['Orgs', 'AcademicSessions'],
    isEnabled: false,
  },
];

const syncLogs: SyncLogEntry[] = [
  {
    id: 'log-1',
    connectionId: 'or-1',
    connectionName: 'TASS.web Production',
    timestamp: '2026-01-29T08:00:00Z',
    status: 'success',
    resourceType: 'Users',
    recordsProcessed: 2450,
    recordsTotal: 2450,
    errors: 0,
    duration: '2m 34s',
  },
  {
    id: 'log-2',
    connectionId: 'or-1',
    connectionName: 'TASS.web Production',
    timestamp: '2026-01-29T08:03:00Z',
    status: 'warning',
    resourceType: 'Enrollments',
    recordsProcessed: 4117,
    recordsTotal: 4120,
    errors: 3,
    duration: '3m 12s',
    errorDetails: [
      'Row 1234: Missing class reference for enrollment ENR-5678',
      'Row 2345: Invalid role value "StudentHelper" - defaulting to "student"',
      'Row 3456: Duplicate enrollment detected and skipped',
    ],
  },
  {
    id: 'log-3',
    connectionId: 'or-1',
    connectionName: 'TASS.web Production',
    timestamp: '2026-01-29T08:07:00Z',
    status: 'success',
    resourceType: 'Classes',
    recordsProcessed: 312,
    recordsTotal: 312,
    errors: 0,
    duration: '45s',
  },
  {
    id: 'log-4',
    connectionId: 'or-2',
    connectionName: 'Compass Test Environment',
    timestamp: '2026-01-29T05:30:00Z',
    status: 'error',
    resourceType: 'Users',
    recordsProcessed: 1200,
    recordsTotal: 3400,
    errors: 5,
    duration: '1m 15s',
    errorDetails: [
      'Connection timeout after 75 seconds',
      'API rate limit exceeded - retry after 60 seconds',
      'Invalid OAuth token - please re-authenticate',
    ],
  },
  {
    id: 'log-5',
    connectionId: 'or-1',
    connectionName: 'TASS.web Production',
    timestamp: '2026-01-29T02:00:00Z',
    status: 'success',
    resourceType: 'Orgs',
    recordsProcessed: 45,
    recordsTotal: 45,
    errors: 0,
    duration: '12s',
  },
];

const stats = [
  { label: 'Connections', value: '2', icon: Users, color: 'blue' },
  { label: 'Total Records', value: '15,432', icon: Database, color: 'green' },
  { label: 'Last Sync', value: '1h ago', icon: Clock, color: 'purple' },
  { label: 'Sync Errors', value: '8', icon: AlertTriangle, color: 'red' },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
};

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

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function OneRosterPage() {
  const [activeTab, setActiveTab] = useState('connections');
  const [selectedSIS, setSelectedSIS] = useState('tass');
  const [selectedConnection, setSelectedConnection] = useState<string>('or-1');
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

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
          <h1 className="text-2xl font-semibold tracking-tight">OneRoster 1.2 Sync</h1>
          <p className="text-muted-foreground">
            Manage roster synchronization for users, classes, enrollments, and organizations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export Logs
          </Button>
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="connections">SIS Selection</TabsTrigger>
          <TabsTrigger value="mappings">Field Mapping</TabsTrigger>
          <TabsTrigger value="schedule">Sync Schedule</TabsTrigger>
          <TabsTrigger value="logs">Sync Logs</TabsTrigger>
        </TabsList>

        {/* SIS Selection Tab */}
        <TabsContent value="connections" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Student Information System</CardTitle>
              <CardDescription>
                Choose your SIS provider to configure OneRoster synchronization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sisProviders.map((provider) => (
                  <div
                    key={provider.id}
                    className={`relative rounded-lg border p-4 cursor-pointer transition-all ${
                      selectedSIS === provider.id
                        ? 'border-primary ring-2 ring-primary'
                        : 'hover:border-muted-foreground/50'
                    } ${provider.status === 'coming-soon' ? 'opacity-60' : ''}`}
                    onClick={() => provider.status !== 'coming-soon' && setSelectedSIS(provider.id)}
                  >
                    {provider.status === 'connected' && (
                      <div className="absolute top-2 right-2">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Connected
                        </Badge>
                      </div>
                    )}
                    {provider.status === 'coming-soon' && (
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary">Coming Soon</Badge>
                      </div>
                    )}
                    <div className="flex items-center gap-3 mb-2">
                      <div className="rounded-lg bg-blue-500/10 p-2">
                        <Database className="h-5 w-5 text-blue-500" />
                      </div>
                      <h4 className="font-semibold">{provider.name}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{provider.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Active Connections */}
          <Card>
            <CardHeader>
              <CardTitle>Active Connections</CardTitle>
              <CardDescription>
                Currently configured OneRoster endpoints
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockConnections.map((conn) => (
                  <div
                    key={conn.id}
                    className={`flex items-center justify-between rounded-lg border p-4 ${
                      selectedConnection === conn.id ? 'border-primary bg-muted/30' : ''
                    }`}
                    onClick={() => setSelectedConnection(conn.id)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-green-500/10 p-3">
                        <Users className="h-6 w-6 text-green-500" />
                      </div>
                      <div>
                        <h4 className="font-semibold">{conn.name}</h4>
                        <p className="text-sm text-muted-foreground font-mono">{conn.baseUrl}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        <p className="font-medium">{conn.recordCount.toLocaleString()} records</p>
                        <p className="text-muted-foreground">
                          Last sync: {new Date(conn.lastSync).toLocaleString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                      <Badge variant="outline">
                        {getDirectionIcon(conn.syncDirection)}
                        {conn.syncDirection}
                      </Badge>
                      <StatusBadge status={conn.status} showDot />
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Now
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mapping Tab */}
        <TabsContent value="mappings" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Configure how Scholarly fields map to OneRoster resource attributes
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Zap className="h-4 w-4 mr-2" />
                Add Transformation
              </Button>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Mapping
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Scholarly Field</th>
                      <th className="px-4 py-3 text-center font-medium">Mapping</th>
                      <th className="px-4 py-3 text-left font-medium">OneRoster Field</th>
                      <th className="px-4 py-3 text-left font-medium">Transformation</th>
                      <th className="px-4 py-3 text-left font-medium">Required</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fieldMappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {mapping.scholarlyField}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ArrowDownUp className="h-4 w-4 text-muted-foreground inline" />
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {mapping.onerosterField}
                          </code>
                        </td>
                        <td className="px-4 py-3">
                          {mapping.transformation ? (
                            <Badge variant="outline" className="text-xs">
                              <Zap className="h-3 w-3 mr-1" />
                              {mapping.transformation}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">Direct</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {mapping.isRequired ? (
                            <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Required
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Optional</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge
                            status={mapping.status === 'mapped' ? 'active' : mapping.status === 'unmapped' ? 'pending' : 'error'}
                            label={mapping.status === 'mapped' ? 'Mapped' : mapping.status === 'unmapped' ? 'Unmapped' : 'Error'}
                            showDot
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Transformation Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Transformation Rules
              </CardTitle>
              <CardDescription>
                Custom data transformation rules applied during sync
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { name: 'YEAR_LEVEL_TRANSFORM', description: 'Converts grade levels (e.g., "Year 7" to "07")', usedIn: 2 },
                  { name: 'DATE_FORMAT_ISO', description: 'Converts dates to ISO 8601 format', usedIn: 3 },
                  { name: 'ROLE_MAPPING', description: 'Maps enrollment roles to Scholarly equivalents', usedIn: 1 },
                ].map((rule) => (
                  <div key={rule.name} className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">{rule.name}</Badge>
                        <span className="text-xs text-muted-foreground">Used in {rule.usedIn} mappings</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{rule.description}</p>
                    </div>
                    <Button variant="ghost" size="sm">
                      <Settings className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Schedule Tab */}
        <TabsContent value="schedule" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Configure automated sync schedules for each connection
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>

          <div className="space-y-4">
            {syncSchedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className={`rounded-lg p-3 ${schedule.isEnabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                        <Calendar className={`h-6 w-6 ${schedule.isEnabled ? 'text-green-500' : 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">{schedule.name}</h4>
                          <StatusBadge status={schedule.isEnabled ? 'active' : 'inactive'} showDot />
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {schedule.frequency === 'hourly' && 'Runs every hour'}
                          {schedule.frequency === 'daily' && `Runs daily at ${schedule.time}`}
                          {schedule.frequency === 'weekly' && `Runs every ${schedule.dayOfWeek} at ${schedule.time}`}
                          {schedule.frequency === 'manual' && 'Manual trigger only'}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                          {schedule.resourceTypes.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right text-sm">
                        {schedule.lastRun && (
                          <p className="text-muted-foreground">
                            Last: {new Date(schedule.lastRun).toLocaleString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                        {schedule.nextRun && (
                          <p className="text-muted-foreground">
                            Next: {new Date(schedule.nextRun).toLocaleString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm">
                          {schedule.isEnabled ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Schedule Form */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Schedule</CardTitle>
              <CardDescription>
                Set up automated sync at specified intervals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sched-name">Schedule Name</Label>
                    <Input id="sched-name" placeholder="e.g., Morning Full Sync" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sched-freq">Frequency</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select frequency" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hourly">Hourly</SelectItem>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="manual">Manual Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="sched-time">Time (for daily/weekly)</Label>
                    <Input id="sched-time" type="time" defaultValue="02:00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Resource Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Users', 'Classes', 'Enrollments', 'Orgs', 'AcademicSessions'].map((type) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className="cursor-pointer hover:bg-muted"
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Create Schedule</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sync Logs Tab */}
        <TabsContent value="logs" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by connection" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Connections</SelectItem>
                  {mockConnections.map((conn) => (
                    <SelectItem key={conn.id} value={conn.id}>{conn.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Sync History
              </CardTitle>
              <CardDescription>
                Recent synchronization jobs and their results
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y">
                {syncLogs.map((log) => (
                  <div key={log.id}>
                    <div
                      className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 cursor-pointer"
                      onClick={() => setExpandedLog(expandedLog === log.id ? null : log.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          log.status === 'success' ? 'bg-green-500/10' :
                          log.status === 'warning' ? 'bg-amber-500/10' : 'bg-red-500/10'
                        }`}>
                          {log.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                          {log.status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                          {log.status === 'error' && <XCircle className="h-4 w-4 text-red-500" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{log.connectionName}</span>
                            <Badge variant="outline">{log.resourceType}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {new Date(log.timestamp).toLocaleString('en-AU', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right text-sm">
                          <p>
                            {log.recordsProcessed.toLocaleString()} / {log.recordsTotal.toLocaleString()} records
                          </p>
                          <p className="text-muted-foreground">{log.duration}</p>
                        </div>
                        {log.errors > 0 && (
                          <Badge variant="destructive">{log.errors} errors</Badge>
                        )}
                        <StatusBadge
                          status={log.status === 'success' ? 'completed' : log.status === 'warning' ? 'warning' : 'failed'}
                        />
                      </div>
                    </div>

                    {/* Error Details Expansion */}
                    {expandedLog === log.id && log.errorDetails && (
                      <div className="px-4 py-3 bg-muted/30 border-t">
                        <h5 className="font-medium text-sm mb-2">Error Details</h5>
                        <ul className="space-y-1">
                          {log.errorDetails.map((error, idx) => (
                            <li key={idx} className="text-sm text-red-600 dark:text-red-400">
                              {error}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
