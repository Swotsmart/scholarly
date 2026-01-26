'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

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

interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  apps: string;
  status: 'completed' | 'pending' | 'processing';
  method: string;
}

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

const REVENUE_DATA = [
  { month: 'Aug', revenue: 1820 },
  { month: 'Sep', revenue: 2340 },
  { month: 'Oct', revenue: 2890 },
  { month: 'Nov', revenue: 3150 },
  { month: 'Dec', revenue: 3780 },
  { month: 'Jan', revenue: 4210 },
];

const PAYOUTS: PayoutRecord[] = [
  { id: 'po-1', date: '15 Jan 2026', amount: 3780, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-2', date: '15 Dec 2025', amount: 3150, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-3', date: '15 Nov 2025', amount: 2890, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-4', date: '15 Oct 2025', amount: 2340, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-5', date: '15 Sep 2025', amount: 1820, apps: 'VocabMaster Pro', status: 'completed', method: 'Bank Transfer' },
];

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

const STATS = [
  { label: 'Total Apps', value: String(DEVELOPER.appsPublished), icon: Store, color: 'blue' },
  { label: 'Total Installs', value: DEVELOPER.totalInstalls.toLocaleString(), icon: Download, color: 'green' },
  { label: 'Revenue (EDU)', value: DEVELOPER.totalRevenue.toLocaleString(), icon: Coins, color: 'amber' },
  { label: 'Average Rating', value: String(DEVELOPER.averageRating), icon: Star, color: 'purple' },
];

export default function DeveloperDashboardPage() {
  const [activeTab, setActiveTab] = useState('apps');

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
            <h1 className="heading-2">Developer Dashboard</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Manage your apps, track performance, and handle payouts
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

      {/* Developer Registration Status */}
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
        <TabsList>
          <TabsTrigger value="apps">My Apps</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        {/* My Apps */}
        <TabsContent value="apps" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Published Apps</CardTitle>
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
        </TabsContent>

        {/* Revenue */}
        <TabsContent value="revenue" className="space-y-4">
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
              <div className="h-[350px]">
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

          {/* Revenue Breakdown by App */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue by App</CardTitle>
              <CardDescription>Earnings breakdown across your published applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {DEVELOPER_APPS.filter((a) => a.status === 'published').map((app) => {
                  const percentage = Math.round(
                    (app.revenue / DEVELOPER.totalRevenue) * 100
                  );
                  return (
                    <div key={app.id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`${app.color} h-6 w-6 rounded flex items-center justify-center text-white text-xs font-bold`}>
                            {app.letter}
                          </div>
                          <span className="font-medium">{app.name}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-muted-foreground">{percentage}%</span>
                          <span className="font-medium">{app.revenue.toLocaleString()} EDU</span>
                        </div>
                      </div>
                      <div className="h-2 w-full rounded-full bg-secondary">
                        <div
                          className={`h-full rounded-full ${app.color}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts */}
        <TabsContent value="payouts" className="space-y-4">
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
                <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                  15 Feb 2026
                </p>
                <p className="text-sm text-muted-foreground">Next Payout Date</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
