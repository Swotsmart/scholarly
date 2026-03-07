'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  CheckCircle2,
  Store,
  Download,
  Coins,
  Star,
  Plus,
  ExternalLink,
  Shield,
  FileCode,
  BarChart3,
  Clock,
  ArrowUpRight,
  Key,
  Webhook,
  Activity,
  Eye,
  EyeOff,
  Copy,
  Check,
  Trash2,
  RefreshCw,
  Settings,
  AlertTriangle,
  ChevronRight,
  PlayCircle,
  Code2,
  BookOpen,
  Zap,
  Globe,
  Lock,
  Calendar,
  Loader2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import {
  useDeveloperPortal,
  useDeveloperApiKeys,
  useDeveloperWebhooks,
  useDeveloperAnalytics,
} from '@/hooks/use-marketplace';
import { marketplaceApi } from '@/lib/marketplace-api';
import { marketplaceTelemetry } from '@/lib/marketplace-telemetry';
import { KycGate } from '@/components/verification/kyc-gate';
import type { ApiKeyCreateResult } from '@/types/marketplace';

// Webhook events reference
const WEBHOOK_EVENTS = [
  { id: 'app.installed', name: 'App Installed', description: 'Triggered when a user installs your app' },
  { id: 'app.uninstalled', name: 'App Uninstalled', description: 'Triggered when a user uninstalls your app' },
  { id: 'subscription.created', name: 'Subscription Created', description: 'Triggered when a new subscription is created' },
  { id: 'subscription.cancelled', name: 'Subscription Cancelled', description: 'Triggered when a subscription is cancelled' },
  { id: 'subscription.renewed', name: 'Subscription Renewed', description: 'Triggered when a subscription auto-renews' },
  { id: 'usage.milestone', name: 'Usage Milestone', description: 'Triggered when usage hits certain milestones' },
  { id: 'review.created', name: 'Review Created', description: 'Triggered when a user leaves a review' },
  { id: 'payout.processed', name: 'Payout Processed', description: 'Triggered when a payout is processed' },
];

// API documentation links
const API_DOCS = [
  { title: 'Getting Started', description: 'Quick start guide for the Scholarly API', icon: PlayCircle, href: '#' },
  { title: 'Authentication', description: 'OAuth 2.0 and API key authentication', icon: Lock, href: '#' },
  { title: 'REST API Reference', description: 'Complete REST API documentation', icon: Code2, href: '#' },
  { title: 'Webhooks Guide', description: 'Setting up and handling webhooks', icon: Webhook, href: '#' },
  { title: 'SDK Libraries', description: 'Official SDKs for JavaScript, Python, and more', icon: BookOpen, href: '#' },
  { title: 'Rate Limits', description: 'Understanding API rate limits', icon: Zap, href: '#' },
];

// Status configs
const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
  in_review: { label: 'In Review', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  published: { label: 'Published', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const PAYOUT_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  completed: { label: 'Completed', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  pending: { label: 'Pending', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  processing: { label: 'Processing', className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
};

const WEBHOOK_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  disabled: { label: 'Disabled', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  suspended: { label: 'Suspended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

export default function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [showNewKeyResult, setShowNewKeyResult] = useState<ApiKeyCreateResult | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('7d');
  const [creatingKey, setCreatingKey] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);

  // Data hooks
  const { profile, stats, apps, isLoading: portalLoading } = useDeveloperPortal();
  const { keys, createKey, revokeKey } = useDeveloperApiKeys();
  const { webhooks, createWebhook, deleteWebhook, testWebhook } = useDeveloperWebhooks();
  const { usage, revenue, payouts, isLoading: analyticsLoading } = useDeveloperAnalytics(analyticsPeriod);

  // Track tab changes
  const handleTabChange = useCallback((tab: string) => {
    marketplaceTelemetry.trackDeveloperTab(tab);
    setActiveTab(tab);
  }, []);

  const handleCopyKey = (keyId: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleCreateKey = useCallback(async () => {
    if (!newKeyName.trim()) return;
    setCreatingKey(true);
    try {
      const result = await createKey(newKeyName, newKeyPermissions);
      setShowApiKeyDialog(false);
      setShowNewKeyResult(result);
      setNewKeyName('');
      setNewKeyPermissions(['read']);
    } finally {
      setCreatingKey(false);
    }
  }, [newKeyName, newKeyPermissions, createKey]);

  const handleCreateWebhook = useCallback(async () => {
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0) return;
    setCreatingWebhook(true);
    try {
      await createWebhook(newWebhookUrl, newWebhookEvents);
      setShowWebhookDialog(false);
      setNewWebhookUrl('');
      setNewWebhookEvents([]);
    } finally {
      setCreatingWebhook(false);
    }
  }, [newWebhookUrl, newWebhookEvents, createWebhook]);

  // Derived stats
  const devStats = stats ? [
    { label: 'Total Apps', value: String(stats.appsPublished), icon: Store, color: 'blue' },
    { label: 'Total Installs', value: stats.totalInstalls.toLocaleString(), icon: Download, color: 'green' },
    { label: 'Revenue (EDU)', value: stats.totalRevenue.toLocaleString(), icon: Coins, color: 'amber' },
    { label: 'Average Rating', value: String(stats.averageRating), icon: Star, color: 'purple' },
  ] : [
    { label: 'Total Apps', value: '0', icon: Store, color: 'blue' },
    { label: 'Total Installs', value: '0', icon: Download, color: 'green' },
    { label: 'Revenue (EDU)', value: '0', icon: Coins, color: 'amber' },
    { label: 'Average Rating', value: '0', icon: Star, color: 'purple' },
  ];

  // Usage summary
  const totalRequests = usage.reduce((sum, d) => sum + d.requests, 0);
  const totalErrors = usage.reduce((sum, d) => sum + d.errors, 0);
  const successRate = totalRequests > 0 ? ((1 - totalErrors / totalRequests) * 100).toFixed(2) : '0';

  if (portalLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-24" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="heading-2">Developer Portal</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Manage your apps, API keys, webhooks, and revenue
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="https://docs.scholarly.edu.au/developer" target="_blank">
              <FileCode className="mr-2 h-4 w-4" />
              API Docs
              <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create New App
          </Button>
        </div>
      </div>

      {/* Developer Verification Status */}
      <Card className="border-green-200 dark:border-green-800">
        <CardContent className="flex items-center justify-between p-6">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 dark:bg-green-900/30 p-3">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{profile?.name ?? 'Developer'}</h3>
                {profile?.verified && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {profile?.verified && (
                  <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    Verified Developer
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {profile?.verifiedDate && <>Verified since {profile.verifiedDate} &middot; </>}
                Member since {profile?.memberSince ?? 'N/A'} &middot; {profile?.email ?? ''}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Settings className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {devStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-500`} />
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
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="api-docs">API Docs</TabsTrigger>
          <TabsTrigger value="api-keys">API Keys</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="space-y-6">
          {/* My Apps */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">My Apps</CardTitle>
                  <CardDescription>Manage and monitor your marketplace applications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {apps.length === 0 ? (
                <div className="text-center py-8">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium">No apps yet</p>
                  <p className="text-sm text-muted-foreground">Create your first app to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">App</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                        <th className="px-4 py-3 text-left font-medium">Version</th>
                        <th className="px-4 py-3 text-right font-medium">Installs</th>
                        <th className="px-4 py-3 text-right font-medium">Rating</th>
                        <th className="px-4 py-3 text-right font-medium">Revenue (EDU)</th>
                        <th className="px-4 py-3 text-left font-medium">Last Updated</th>
                        <th className="px-4 py-3 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {apps.map((app) => {
                        const statusConfig = STATUS_CONFIG[app.status] ?? STATUS_CONFIG.draft;
                        return (
                          <tr key={app.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className={`${app.color} h-8 w-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0`}>
                                  {app.letter}
                                </div>
                                <span className="font-medium">{app.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <Badge className={statusConfig.className}>
                                {statusConfig.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 font-mono text-xs">{app.version}</td>
                            <td className="px-4 py-3 text-right">{app.installs.toLocaleString()}</td>
                            <td className="px-4 py-3 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                                <span>{app.rating}</span>
                                <span className="text-muted-foreground">({app.reviewCount})</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-medium">
                              {app.revenue.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-sm text-muted-foreground">
                              {app.lastUpdated}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <Button variant="ghost" size="sm" asChild>
                                <Link href={`/marketplace/apps/${app.id}`}>
                                  View
                                  <ExternalLink className="ml-1 h-3 w-3" />
                                </Link>
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Revenue
                  </CardTitle>
                  <CardDescription>EDU token earnings over the past 6 months</CardDescription>
                </div>
                {revenue.length >= 2 && (
                  <div className="flex items-center gap-2 text-sm">
                    <ArrowUpRight className="h-4 w-4 text-green-500" />
                    <span className="text-green-600 dark:text-green-400 font-medium">
                      {revenue.length >= 2
                        ? `${(((revenue[revenue.length - 1].revenue - revenue[revenue.length - 2].revenue) / revenue[revenue.length - 2].revenue) * 100).toFixed(1)}% this month`
                        : ''}
                    </span>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="month"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => `${val.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} EDU`, 'Revenue']}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="hsl(var(--primary))"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Docs Tab */}
        <TabsContent value="api-docs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Interactive API Documentation</CardTitle>
              <CardDescription>
                Explore our comprehensive API documentation to integrate with Scholarly
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {API_DOCS.map((doc) => {
                  const Icon = doc.icon;
                  return (
                    <Card key={doc.title} className="transition-shadow hover:shadow-md cursor-pointer">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-lg bg-primary/10 p-2">
                            <Icon className="h-5 w-5 text-primary" />
                          </div>
                          <div className="space-y-1">
                            <h4 className="font-medium">{doc.title}</h4>
                            <p className="text-sm text-muted-foreground">{doc.description}</p>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="mt-3 w-full" asChild>
                          <Link href={doc.href}>
                            View Documentation
                            <ChevronRight className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Start */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Start Example</CardTitle>
              <CardDescription>Get started with the Scholarly API in minutes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg bg-muted p-4 font-mono text-sm overflow-x-auto">
                <pre className="text-muted-foreground">
{`// Install the SDK
npm install @scholarly/sdk

// Initialize the client
import { Scholarly } from '@scholarly/sdk';

const client = new Scholarly({
  apiKey: process.env.SCHOLARLY_API_KEY,
});

// Fetch user data
const user = await client.users.get('user_123');
console.log(user);`}
                </pre>
              </div>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" size="sm">
                  <Copy className="mr-2 h-3 w-3" />
                  Copy Code
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="#">
                    <PlayCircle className="mr-2 h-3 w-3" />
                    Run in Playground
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-6">
          <KycGate feature="API key management">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">API Keys</CardTitle>
                  <CardDescription>Manage your API keys for authenticating requests</CardDescription>
                </div>
                <Button onClick={() => setShowApiKeyDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Key
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {keys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium">No API keys</p>
                  <p className="text-sm text-muted-foreground">Create your first API key to start making requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {keys.map((key) => (
                    <div
                      key={key.id}
                      className={`p-4 rounded-lg border ${
                        key.status === 'revoked' ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{key.name}</span>
                            <Badge
                              className={
                                key.status === 'active'
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                              }
                            >
                              {key.status === 'active' ? 'Active' : 'Revoked'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-sm bg-muted px-2 py-1 rounded">
                              {key.prefix}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleCopyKey(key.id, key.prefix)}
                            >
                              {copiedKey === key.id ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <Copy className="h-3 w-3" />
                              )}
                            </Button>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                            <span>Created: {key.createdAt}</span>
                            {key.lastUsedAt && <span>Last used: {key.lastUsedAt}</span>}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            {key.permissions.map((perm) => (
                              <Badge key={perm} variant="outline" className="text-xs">
                                {perm}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {key.status === 'active' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => revokeKey(key.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Security Notice */}
          <Card className="border-amber-200 dark:border-amber-800">
            <CardContent className="flex items-start gap-4 p-6">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium">Security Best Practices</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Never expose your API keys in client-side code or public repositories.
                  Use environment variables and rotate keys regularly. Consider using
                  scoped keys with minimal permissions for specific use cases.
                </p>
              </div>
            </CardContent>
          </Card>
          </KycGate>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
          <KycGate feature="Webhook configuration">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Webhook Endpoints</CardTitle>
                  <CardDescription>Configure webhooks to receive real-time event notifications</CardDescription>
                </div>
                <Button onClick={() => setShowWebhookDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Endpoint
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8">
                  <Webhook className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium">No webhooks configured</p>
                  <p className="text-sm text-muted-foreground">Add an endpoint to start receiving event notifications.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {webhooks.map((webhook) => {
                    const statusConfig = WEBHOOK_STATUS_CONFIG[webhook.status] ?? WEBHOOK_STATUS_CONFIG.active;
                    return (
                      <div key={webhook.id} className="p-4 rounded-lg border">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-muted-foreground" />
                              <code className="text-sm font-medium">{webhook.url}</code>
                              <Badge className={statusConfig.className}>
                                {statusConfig.label}
                              </Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {webhook.events.map((event) => (
                                <Badge key={event} variant="outline" className="text-xs">
                                  {event}
                                </Badge>
                              ))}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              {webhook.lastDeliveredAt && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Last triggered: {webhook.lastDeliveredAt}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                {webhook.deliveryCount} deliveries
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => testWebhook(webhook.id)}
                            >
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                              onClick={() => deleteWebhook(webhook.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Available Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Available Events</CardTitle>
              <CardDescription>Subscribe to these events to receive webhook notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.id} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2">
                      <Webhook className="h-4 w-4 text-primary" />
                      <code className="text-sm font-medium">{event.id}</code>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </KycGate>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          {/* Usage Metrics */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    API Usage Metrics
                  </CardTitle>
                  <CardDescription>Track your API usage over the selected period</CardDescription>
                </div>
                <Select value={analyticsPeriod} onValueChange={setAnalyticsPeriod}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="24h">Last 24h</SelectItem>
                    <SelectItem value="7d">Last 7 days</SelectItem>
                    <SelectItem value="30d">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usage}>
                    <defs>
                      <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="date"
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      className="text-xs"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--card-foreground))',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="requests"
                      stroke="hsl(var(--primary))"
                      fillOpacity={1}
                      fill="url(#colorRequests)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Usage Stats Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-primary">{totalRequests.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Requests</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">{successRate}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{totalErrors.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Errors</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">145ms</p>
                <p className="text-sm text-muted-foreground">Avg. Response Time</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          <KycGate feature="Payouts and revenue management">
          {/* Payout Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-primary">
                  {payouts.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Paid Out (EDU)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {revenue.length > 0 ? revenue[revenue.length - 1].revenue.toLocaleString() : '0'}
                </p>
                <p className="text-sm text-muted-foreground">Current Month Revenue</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                    15 Feb 2026
                  </p>
                </div>
                <p className="text-sm text-muted-foreground">Next Payout Date</p>
              </CardContent>
            </Card>
          </div>

          {/* Payout History */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Payout History</CardTitle>
                  <CardDescription>Monthly payouts processed on the 15th of each month</CardDescription>
                </div>
                <Button variant="outline" size="sm">
                  <Coins className="mr-2 h-4 w-4" />
                  Request Payout
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {payouts.length === 0 ? (
                <div className="text-center py-8">
                  <Coins className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                  <p className="text-lg font-medium">No payouts yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">Date</th>
                        <th className="px-4 py-3 text-right font-medium">Amount (EDU)</th>
                        <th className="px-4 py-3 text-left font-medium">Apps</th>
                        <th className="px-4 py-3 text-left font-medium">Method</th>
                        <th className="px-4 py-3 text-left font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {payouts.map((payout) => {
                        const payoutStatus = PAYOUT_STATUS_CONFIG[payout.status] ?? PAYOUT_STATUS_CONFIG.completed;
                        return (
                          <tr key={payout.id} className="hover:bg-muted/50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                {payout.date}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {payout.amount.toLocaleString()}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">{payout.apps}</td>
                            <td className="px-4 py-3 text-muted-foreground">{payout.method}</td>
                            <td className="px-4 py-3">
                              <Badge className={payoutStatus.className}>
                                {payoutStatus.label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payout Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue Sharing Settings</CardTitle>
              <CardDescription>Configure your payout preferences and bank details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Payout Method</Label>
                    <p className="text-sm text-muted-foreground mt-1">Bank Transfer (AU)</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Bank Account</Label>
                    <p className="text-sm text-muted-foreground mt-1">**** **** **** 4521</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Revenue Share</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile?.revenueShare ? `${profile.revenueShare}% Developer / ${100 - profile.revenueShare}% Platform` : '70% Developer / 30% Platform'}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Minimum Payout</Label>
                    <p className="text-sm text-muted-foreground mt-1">100 EDU</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Tax Information</Label>
                    <p className="text-sm text-muted-foreground mt-1">ABN: 12 345 678 901 (Verified)</p>
                  </div>
                  <Button variant="outline" className="mt-2">
                    <Settings className="mr-2 h-4 w-4" />
                    Update Settings
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          </KycGate>
        </TabsContent>
      </Tabs>

      {/* Create API Key Dialog */}
      <Dialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New API Key</DialogTitle>
            <DialogDescription>
              Generate a new API key for authenticating your requests
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="key-name">Key Name</Label>
              <Input
                id="key-name"
                placeholder="e.g., Production Key"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <div className="flex gap-2">
                {['read', 'write', 'delete'].map((perm) => (
                  <Badge
                    key={perm}
                    variant={newKeyPermissions.includes(perm) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      if (newKeyPermissions.includes(perm)) {
                        setNewKeyPermissions(newKeyPermissions.filter((p) => p !== perm));
                      } else {
                        setNewKeyPermissions([...newKeyPermissions, perm]);
                      }
                    }}
                  >
                    {perm}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApiKeyDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateKey} disabled={creatingKey || !newKeyName.trim()}>
              {creatingKey && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Key Result Dialog */}
      <Dialog open={!!showNewKeyResult} onOpenChange={() => setShowNewKeyResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. You won&apos;t be able to see it again.
            </DialogDescription>
          </DialogHeader>
          {showNewKeyResult && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Key Name</Label>
                <p className="text-sm font-medium">{showNewKeyResult.name}</p>
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex items-center gap-2">
                  <code className="text-sm bg-muted px-3 py-2 rounded flex-1 break-all">
                    {showNewKeyResult.key}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyKey('new-key', showNewKeyResult.key)}
                  >
                    {copiedKey === 'new-key' ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 p-3">
                <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Make sure to copy your API key now. You won&apos;t be able to see it again.
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowNewKeyResult(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Webhook Dialog */}
      <Dialog open={showWebhookDialog} onOpenChange={setShowWebhookDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure a URL to receive webhook notifications
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="webhook-url">Endpoint URL</Label>
              <Input
                id="webhook-url"
                placeholder="https://your-server.com/webhooks"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Events to Subscribe</Label>
              <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {WEBHOOK_EVENTS.map((event) => (
                  <Badge
                    key={event.id}
                    variant={newWebhookEvents.includes(event.id) ? 'default' : 'outline'}
                    className="cursor-pointer justify-start"
                    onClick={() => {
                      if (newWebhookEvents.includes(event.id)) {
                        setNewWebhookEvents(newWebhookEvents.filter((e) => e !== event.id));
                      } else {
                        setNewWebhookEvents([...newWebhookEvents, event.id]);
                      }
                    }}
                  >
                    {event.id}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWebhookDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateWebhook}
              disabled={creatingWebhook || !newWebhookUrl.trim() || newWebhookEvents.length === 0}
            >
              {creatingWebhook && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Add Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
