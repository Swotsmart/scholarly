'use client';

/**
 * Integrations Hub
 * Connect with education platforms, manage OAuth, sync status, and field mappings
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
  Settings,
  Plus,
  Search,
  Grid3X3,
  List,
  ExternalLink,
  Key,
  Zap,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared';

// ---------------------------------------------------------------------------
// Types & Mock Data
// ---------------------------------------------------------------------------

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: 'standards' | 'sis' | 'lms' | 'assessment' | 'analytics';
  status: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSync?: string;
  recordCount?: number;
  errorCount?: number;
  href?: string;
}

interface MarketplaceApp {
  id: string;
  name: string;
  vendor: string;
  description: string;
  icon: React.ElementType;
  color: string;
  category: string;
  rating: number;
  installs: string;
  isInstalled: boolean;
}

interface FieldMapping {
  id: string;
  sourceName: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  status: 'active' | 'inactive' | 'error';
}

interface SyncLog {
  id: string;
  integrationName: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error';
  recordsProcessed: number;
  duration: string;
  message?: string;
}

const connectedIntegrations: Integration[] = [
  {
    id: 'lti',
    name: 'LTI Advantage 1.3',
    description: 'Launch external tools with grade passback',
    icon: LinkIcon,
    color: 'blue',
    category: 'standards',
    status: 'connected',
    lastSync: '5 min ago',
    recordCount: 47,
    href: '/interoperability/lti',
  },
  {
    id: 'oneroster',
    name: 'OneRoster 1.2',
    description: 'Roster sync for users and classes',
    icon: Users,
    color: 'green',
    category: 'standards',
    status: 'connected',
    lastSync: '2h ago',
    recordCount: 15432,
    href: '/interoperability/oneroster',
  },
  {
    id: 'case',
    name: 'CASE Network',
    description: 'Competency and standards exchange',
    icon: Shapes,
    color: 'purple',
    category: 'standards',
    status: 'connected',
    lastSync: '1d ago',
    recordCount: 2340,
    href: '/interoperability/case',
  },
  {
    id: 'badges',
    name: 'Open Badges 3.0',
    description: 'Digital credentials and CLR',
    icon: Award,
    color: 'amber',
    category: 'standards',
    status: 'connected',
    lastSync: '30 min ago',
    recordCount: 312,
    href: '/interoperability/badges',
  },
  {
    id: 'edfi',
    name: 'Ed-Fi ODS/API',
    description: 'District data interoperability',
    icon: Database,
    color: 'red',
    category: 'standards',
    status: 'error',
    lastSync: '4h ago',
    recordCount: 89234,
    errorCount: 2,
    href: '/interoperability/edfi',
  },
];

const marketplaceApps: MarketplaceApp[] = [
  {
    id: 'app-1',
    name: 'TASS.web',
    vendor: 'TASS Software',
    description: 'Complete school administration and SIS integration',
    icon: Database,
    color: 'blue',
    category: 'SIS',
    rating: 4.8,
    installs: '500+',
    isInstalled: true,
  },
  {
    id: 'app-2',
    name: 'Synergetic',
    vendor: 'Community Brands',
    description: 'Student management and administration platform',
    icon: Users,
    color: 'green',
    category: 'SIS',
    rating: 4.6,
    installs: '300+',
    isInstalled: false,
  },
  {
    id: 'app-3',
    name: 'Compass School Manager',
    vendor: 'Compass Education',
    description: 'Learning management and parent communication',
    icon: Shapes,
    color: 'purple',
    category: 'LMS',
    rating: 4.7,
    installs: '800+',
    isInstalled: true,
  },
  {
    id: 'app-4',
    name: 'Canvas LMS',
    vendor: 'Instructure',
    description: 'Learning management system with LTI support',
    icon: LinkIcon,
    color: 'red',
    category: 'LMS',
    rating: 4.9,
    installs: '1000+',
    isInstalled: true,
  },
  {
    id: 'app-5',
    name: 'ACER PAT',
    vendor: 'ACER',
    description: 'Progressive Achievement Tests integration',
    icon: Award,
    color: 'amber',
    category: 'Assessment',
    rating: 4.5,
    installs: '400+',
    isInstalled: false,
  },
  {
    id: 'app-6',
    name: 'NAPLAN Online',
    vendor: 'ACARA',
    description: 'National assessment data import',
    icon: Database,
    color: 'teal',
    category: 'Assessment',
    rating: 4.3,
    installs: '600+',
    isInstalled: false,
  },
];

const fieldMappings: FieldMapping[] = [
  { id: 'fm-1', sourceName: 'TASS.web', sourceField: 'student.StudentCode', targetField: 'student.externalId', status: 'active' },
  { id: 'fm-2', sourceName: 'TASS.web', sourceField: 'student.Firstname', targetField: 'student.firstName', status: 'active' },
  { id: 'fm-3', sourceName: 'TASS.web', sourceField: 'student.Surname', targetField: 'student.lastName', status: 'active' },
  { id: 'fm-4', sourceName: 'TASS.web', sourceField: 'student.YearLevel', targetField: 'student.yearLevel', transformation: 'YEAR_LEVEL_MAP', status: 'active' },
  { id: 'fm-5', sourceName: 'OneRoster', sourceField: 'users.givenName', targetField: 'student.firstName', status: 'active' },
  { id: 'fm-6', sourceName: 'OneRoster', sourceField: 'users.familyName', targetField: 'student.lastName', status: 'active' },
  { id: 'fm-7', sourceName: 'Canvas', sourceField: 'course.name', targetField: 'class.name', status: 'error' },
];

const syncLogs: SyncLog[] = [
  { id: 'sl-1', integrationName: 'TASS.web', timestamp: '2026-01-29T08:00:00Z', status: 'success', recordsProcessed: 2450, duration: '2m 34s' },
  { id: 'sl-2', integrationName: 'OneRoster', timestamp: '2026-01-29T06:00:00Z', status: 'success', recordsProcessed: 4120, duration: '3m 12s' },
  { id: 'sl-3', integrationName: 'Canvas LMS', timestamp: '2026-01-29T05:30:00Z', status: 'warning', recordsProcessed: 1890, duration: '1m 45s', message: '3 records skipped due to missing data' },
  { id: 'sl-4', integrationName: 'Ed-Fi', timestamp: '2026-01-29T04:00:00Z', status: 'error', recordsProcessed: 1200, duration: '45s', message: 'Connection timeout after 45 seconds' },
  { id: 'sl-5', integrationName: 'TASS.web', timestamp: '2026-01-28T20:00:00Z', status: 'success', recordsProcessed: 2448, duration: '2m 28s' },
];

const colorMap: Record<string, { bg: string; text: string; icon: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500', icon: 'text-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500', icon: 'text-green-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500', icon: 'text-purple-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: 'text-amber-500' },
  red: { bg: 'bg-red-500/10', text: 'text-red-500', icon: 'text-red-500' },
  teal: { bg: 'bg-teal-500/10', text: 'text-teal-500', icon: 'text-teal-500' },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function InteroperabilityHubPage() {
  const [activeTab, setActiveTab] = useState('connected');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredApps = marketplaceApps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    app.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSyncStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integrations Hub</h1>
          <p className="text-muted-foreground">
            Connect with education platforms, SIS, LMS, and data standards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync All
          </Button>
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Integration
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
              <p className="text-2xl font-bold">{connectedIntegrations.length}</p>
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
              <p className="text-2xl font-bold">107,365</p>
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
              <p className="text-2xl font-bold">5 min</p>
              <p className="text-sm text-muted-foreground">Last Sync Activity</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-red-500/10 p-3">
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">2</p>
              <p className="text-sm text-muted-foreground">Errors to Resolve</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="connected">Connected</TabsTrigger>
          <TabsTrigger value="marketplace">App Marketplace</TabsTrigger>
          <TabsTrigger value="sync">Sync Status</TabsTrigger>
          <TabsTrigger value="mappings">Field Mappings</TabsTrigger>
        </TabsList>

        {/* Connected Integrations Tab */}
        <TabsContent value="connected" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-3">
            {connectedIntegrations.map((integration) => {
              const colors = colorMap[integration.color];
              const Icon = integration.icon;
              return (
                <Card key={integration.id} className="relative overflow-hidden">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className={`rounded-lg ${colors.bg} p-3`}>
                        <Icon className={`h-6 w-6 ${colors.icon}`} />
                      </div>
                      <StatusBadge
                        status={integration.status}
                        showDot
                      />
                    </div>
                    <CardTitle className="text-lg mt-3">{integration.name}</CardTitle>
                    <CardDescription>{integration.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Last Sync</span>
                        <span className="font-medium">{integration.lastSync}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Records</span>
                        <span className="font-semibold">{integration.recordCount?.toLocaleString()}</span>
                      </div>
                      {integration.errorCount && integration.errorCount > 0 && (
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Errors</span>
                          <span className="text-red-600 font-semibold">{integration.errorCount}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button asChild className="flex-1" variant="outline" size="sm">
                        <Link href={integration.href || '#'}>
                          <Settings className="h-4 w-4 mr-2" />
                          Configure
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* App Marketplace Tab */}
        <TabsContent value="marketplace" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search apps..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                />
              </div>
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredApps.map((app) => {
                const colors = colorMap[app.color] || colorMap.blue;
                const Icon = app.icon;
                return (
                  <Card key={app.id} className="relative">
                    {app.isInstalled && (
                      <div className="absolute top-3 right-3">
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          Installed
                        </Badge>
                      </div>
                    )}
                    <CardHeader className="pb-3">
                      <div className={`rounded-lg ${colors.bg} p-3 w-fit`}>
                        <Icon className={`h-6 w-6 ${colors.icon}`} />
                      </div>
                      <CardTitle className="text-lg mt-3">{app.name}</CardTitle>
                      <CardDescription className="text-xs">{app.vendor}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {app.description}
                      </p>
                      <div className="flex items-center justify-between text-sm mb-4">
                        <Badge variant="outline">{app.category}</Badge>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <span>{app.rating}</span>
                          <span>|</span>
                          <span>{app.installs}</span>
                        </div>
                      </div>
                      <Button
                        className="w-full"
                        variant={app.isInstalled ? 'outline' : 'default'}
                        size="sm"
                      >
                        {app.isInstalled ? (
                          <>
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </>
                        ) : (
                          <>
                            <Key className="h-4 w-4 mr-2" />
                            Connect with OAuth
                          </>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">App</th>
                        <th className="px-4 py-3 text-left font-medium">Vendor</th>
                        <th className="px-4 py-3 text-left font-medium">Category</th>
                        <th className="px-4 py-3 text-left font-medium">Rating</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredApps.map((app) => {
                        const colors = colorMap[app.color] || colorMap.blue;
                        const Icon = app.icon;
                        return (
                          <tr key={app.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`rounded-lg ${colors.bg} p-2`}>
                                  <Icon className={`h-4 w-4 ${colors.icon}`} />
                                </div>
                                <span className="font-medium">{app.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{app.vendor}</td>
                            <td className="px-4 py-3">
                              <Badge variant="outline">{app.category}</Badge>
                            </td>
                            <td className="px-4 py-3">{app.rating}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={app.isInstalled ? 'connected' : 'disconnected'} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="outline" size="sm">
                                {app.isInstalled ? 'Configure' : 'Connect'}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Sync Status Tab */}
        <TabsContent value="sync" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Sync History
              </CardTitle>
              <CardDescription>
                Recent synchronization activity across all integrations
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Integration</th>
                      <th className="px-4 py-3 text-left font-medium">Timestamp</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Records</th>
                      <th className="px-4 py-3 text-left font-medium">Duration</th>
                      <th className="px-4 py-3 text-left font-medium">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {syncLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{log.integrationName}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(log.timestamp).toLocaleString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {getSyncStatusIcon(log.status)}
                            <span className={
                              log.status === 'success' ? 'text-green-600' :
                              log.status === 'warning' ? 'text-amber-600' : 'text-red-600'
                            }>
                              {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">{log.recordsProcessed.toLocaleString()}</td>
                        <td className="px-4 py-3">{log.duration}</td>
                        <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                          {log.message || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Field Mappings Tab */}
        <TabsContent value="mappings" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Configure how fields map between external systems and Scholarly
            </p>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Mapping
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Source</th>
                      <th className="px-4 py-3 text-left font-medium">Source Field</th>
                      <th className="px-4 py-3 text-center font-medium">Mapping</th>
                      <th className="px-4 py-3 text-left font-medium">Target Field</th>
                      <th className="px-4 py-3 text-left font-medium">Transformation</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fieldMappings.map((mapping) => (
                      <tr key={mapping.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3 font-medium">{mapping.sourceName}</td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {mapping.sourceField}
                          </code>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <ArrowRight className="h-4 w-4 text-muted-foreground inline" />
                        </td>
                        <td className="px-4 py-3">
                          <code className="rounded bg-muted px-2 py-1 text-xs">
                            {mapping.targetField}
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
                          <StatusBadge status={mapping.status} showDot />
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
        </TabsContent>
      </Tabs>

      {/* Health Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Integration Health
          </CardTitle>
          <CardDescription>
            Overall health metrics across all connections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { label: 'Overall Uptime', value: 99.8 },
              { label: 'Sync Success Rate', value: 97.2 },
              { label: 'Data Freshness', value: 98.5 },
              { label: 'Mapping Accuracy', value: 99.1 },
            ].map((metric) => (
              <div key={metric.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{metric.label}</span>
                  <span className="font-semibold">{metric.value}%</span>
                </div>
                <Progress value={metric.value} className="h-2" />
              </div>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4 rounded-lg border p-4">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">All core integrations are operational</p>
              <p className="text-xs text-muted-foreground">
                Last health check completed at {new Date().toLocaleString('en-AU')}. Next check in 55 minutes.
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
