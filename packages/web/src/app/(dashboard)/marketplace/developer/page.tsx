'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
} from 'recharts';

// Developer info
const DEVELOPER = {
  name: 'EduTech Solutions',
  email: 'dev@edutechsolutions.com.au',
  verified: true,
  verifiedDate: '14 Sep 2025',
  memberSince: 'March 2024',
  appsPublished: 3,
  totalInstalls: 9653,
  totalRevenue: 28470,
  averageRating: 4.6,
};

// Developer apps
interface DeveloperApp {
  id: string;
  name: string;
  status: 'draft' | 'in_review' | 'published' | 'suspended';
  version: string;
  installs: number;
  rating: number;
  reviewCount: number;
  revenue: number;
  lastUpdated: string;
  color: string;
  letter: string;
}

const DEVELOPER_APPS: DeveloperApp[] = [
  {
    id: 'vocabmaster-pro',
    name: 'VocabMaster Pro',
    status: 'published',
    version: '3.2.1',
    installs: 5420,
    rating: 4.8,
    reviewCount: 342,
    revenue: 18250,
    lastUpdated: '15 Jan 2026',
    color: 'bg-blue-500',
    letter: 'V',
  },
  {
    id: 'grammar-guru',
    name: 'Grammar Guru',
    status: 'published',
    version: '2.0.4',
    installs: 3246,
    rating: 4.5,
    reviewCount: 189,
    revenue: 8720,
    lastUpdated: '8 Jan 2026',
    color: 'bg-purple-500',
    letter: 'G',
  },
  {
    id: 'spelling-sprint',
    name: 'Spelling Sprint',
    status: 'in_review',
    version: '1.0.0',
    installs: 987,
    rating: 4.4,
    reviewCount: 56,
    revenue: 1500,
    lastUpdated: '20 Jan 2026',
    color: 'bg-emerald-500',
    letter: 'S',
  },
];

// API Keys
interface ApiKey {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsed: string;
  permissions: string[];
  status: 'active' | 'revoked';
}

const API_KEYS: ApiKey[] = [
  {
    id: 'key-1',
    name: 'Production Key',
    prefix: 'sk_prod_...a4f2',
    createdAt: '10 Jan 2026',
    lastUsed: '29 Jan 2026',
    permissions: ['read', 'write', 'delete'],
    status: 'active',
  },
  {
    id: 'key-2',
    name: 'Development Key',
    prefix: 'sk_dev_...b8c1',
    createdAt: '5 Jan 2026',
    lastUsed: '28 Jan 2026',
    permissions: ['read', 'write'],
    status: 'active',
  },
  {
    id: 'key-3',
    name: 'Testing Key',
    prefix: 'sk_test_...d3e9',
    createdAt: '1 Jan 2026',
    lastUsed: '15 Jan 2026',
    permissions: ['read'],
    status: 'revoked',
  },
];

// Webhooks
interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'paused' | 'failed';
  lastTriggered: string;
  successRate: number;
  secret: string;
}

const WEBHOOKS: WebhookConfig[] = [
  {
    id: 'wh-1',
    url: 'https://api.edutechsolutions.com.au/webhooks/scholarly',
    events: ['app.installed', 'app.uninstalled', 'subscription.created', 'subscription.cancelled'],
    status: 'active',
    lastTriggered: '29 Jan 2026, 14:32',
    successRate: 99.8,
    secret: 'whsec_a1b2c3d4e5f6...',
  },
  {
    id: 'wh-2',
    url: 'https://api.edutechsolutions.com.au/webhooks/analytics',
    events: ['usage.milestone', 'review.created'],
    status: 'active',
    lastTriggered: '28 Jan 2026, 09:15',
    successRate: 100,
    secret: 'whsec_g7h8i9j0k1l2...',
  },
];

// Revenue data
const REVENUE_DATA = [
  { month: 'Aug', revenue: 1820 },
  { month: 'Sep', revenue: 2340 },
  { month: 'Oct', revenue: 2890 },
  { month: 'Nov', revenue: 3150 },
  { month: 'Dec', revenue: 3780 },
  { month: 'Jan', revenue: 4210 },
];

// Usage metrics
const USAGE_DATA = [
  { date: '23 Jan', requests: 12450, errors: 23 },
  { date: '24 Jan', requests: 14200, errors: 18 },
  { date: '25 Jan', requests: 13800, errors: 31 },
  { date: '26 Jan', requests: 15600, errors: 12 },
  { date: '27 Jan', requests: 16200, errors: 15 },
  { date: '28 Jan', requests: 17800, errors: 8 },
  { date: '29 Jan', requests: 18400, errors: 5 },
];

// Payouts
interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  apps: string;
  status: 'completed' | 'pending' | 'processing';
  method: string;
}

const PAYOUTS: PayoutRecord[] = [
  { id: 'po-1', date: '15 Jan 2026', amount: 3780, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-2', date: '15 Dec 2025', amount: 3150, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-3', date: '15 Nov 2025', amount: 2890, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-4', date: '15 Oct 2025', amount: 2340, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-5', date: '15 Sep 2025', amount: 1820, apps: 'VocabMaster Pro', status: 'completed', method: 'Bank Transfer' },
];

// Webhook events
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

// API Documentation links
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
  paused: { label: 'Paused', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
};

const STATS = [
  { label: 'Total Apps', value: String(DEVELOPER.appsPublished), icon: Store, color: 'blue' },
  { label: 'Total Installs', value: DEVELOPER.totalInstalls.toLocaleString(), icon: Download, color: 'green' },
  { label: 'Revenue (EDU)', value: DEVELOPER.totalRevenue.toLocaleString(), icon: Coins, color: 'amber' },
  { label: 'Average Rating', value: String(DEVELOPER.averageRating), icon: Star, color: 'purple' },
];

export default function DeveloperPortalPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read']);
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);

  const handleCopyKey = (keyId: string, keyValue: string) => {
    navigator.clipboard.writeText(keyValue);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2000);
  };

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
                <h3 className="font-semibold text-lg">{DEVELOPER.name}</h3>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                  Verified Developer
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Verified since {DEVELOPER.verifiedDate} &middot; Member since {DEVELOPER.memberSince} &middot; {DEVELOPER.email}
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
        {STATS.map((stat) => {
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
      <Tabs value={activeTab} onValueChange={setActiveTab}>
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
                    {DEVELOPER_APPS.map((app) => {
                      const statusConfig = STATUS_CONFIG[app.status];
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
                <div className="flex items-center gap-2 text-sm">
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">+11.4% this month</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={REVENUE_DATA}>
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
              <div className="space-y-4">
                {API_KEYS.map((key) => (
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
                            {showKey === key.id ? 'sk_prod_abc123def456ghi789...' : key.prefix}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowKey(showKey === key.id ? null : key.id)}
                          >
                            {showKey === key.id ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
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
                          <span>Last used: {key.lastUsed}</span>
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
                          <>
                            <Button variant="ghost" size="sm">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" className="text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks" className="space-y-6">
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
              <div className="space-y-4">
                {WEBHOOKS.map((webhook) => {
                  const statusConfig = WEBHOOK_STATUS_CONFIG[webhook.status];
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
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Last triggered: {webhook.lastTriggered}
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              Success rate: {webhook.successRate}%
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <Settings className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
                  <CardDescription>Track your API usage over the past 7 days</CardDescription>
                </div>
                <Select defaultValue="7d">
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
                  <AreaChart data={USAGE_DATA}>
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
                <p className="text-3xl font-bold text-primary">108,450</p>
                <p className="text-sm text-muted-foreground">Total Requests (7d)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">99.89%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">112</p>
                <p className="text-sm text-muted-foreground">Errors (7d)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">145ms</p>
                <p className="text-sm text-muted-foreground">Avg. Response Time</p>
              </CardContent>
            </Card>
          </div>

          {/* Error Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Error Breakdown</CardTitle>
              <CardDescription>Distribution of API errors by type</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { code: '429', name: 'Rate Limited', count: 52, percentage: 46 },
                  { code: '401', name: 'Unauthorized', count: 31, percentage: 28 },
                  { code: '400', name: 'Bad Request', count: 18, percentage: 16 },
                  { code: '500', name: 'Server Error', count: 11, percentage: 10 },
                ].map((error) => (
                  <div key={error.code} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{error.code}</Badge>
                        <span className="font-medium">{error.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-muted-foreground">{error.percentage}%</span>
                        <span className="font-medium">{error.count} errors</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full bg-destructive/60"
                        style={{ width: `${error.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-6">
          {/* Payout Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-primary">
                  {PAYOUTS.reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </p>
                <p className="text-sm text-muted-foreground">Total Paid Out (EDU)</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center space-y-2">
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  4,210
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
                    {PAYOUTS.map((payout) => {
                      const payoutStatus = PAYOUT_STATUS_CONFIG[payout.status];
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
                    <p className="text-sm text-muted-foreground mt-1">70% Developer / 30% Platform</p>
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
            <Button onClick={() => setShowApiKeyDialog(false)}>
              Create Key
            </Button>
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
            <Button onClick={() => setShowWebhookDialog(false)}>
              Add Endpoint
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
