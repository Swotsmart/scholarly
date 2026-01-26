'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  DollarSign,
  PieChart as PieChartIcon,
  FileText,
  Clock,
  CheckCircle2,
  Download,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from 'recharts';

const TREASURY_BALANCE = {
  total: 1850000,
  available: 1245000,
  allocated: 425000,
  reserved: 180000,
  monthlyIncome: 124000,
  monthlyExpense: 87000,
};

const ALLOCATION_DATA = [
  { name: 'Curriculum Development', value: 35, amount: 647500, color: 'hsl(var(--primary))' },
  { name: 'Infrastructure', value: 25, amount: 462500, color: 'hsl(210, 70%, 50%)' },
  { name: 'Community Grants', value: 20, amount: 370000, color: 'hsl(150, 60%, 45%)' },
  { name: 'Operations', value: 15, amount: 277500, color: 'hsl(40, 80%, 50%)' },
  { name: 'Reserve', value: 5, amount: 92500, color: 'hsl(280, 60%, 50%)' },
];

const RECENT_TRANSACTIONS = [
  {
    id: 'tx-001',
    date: '27 Jan 2026',
    type: 'allocation' as const,
    description: 'Indigenous Language Curriculum Development Grant',
    amount: -50000,
    status: 'completed' as const,
    proposal: 'PROP-001',
  },
  {
    id: 'tx-002',
    date: '25 Jan 2026',
    type: 'income' as const,
    description: 'Platform Subscription Revenue (January)',
    amount: 85000,
    status: 'completed' as const,
    proposal: null,
  },
  {
    id: 'tx-003',
    date: '24 Jan 2026',
    type: 'allocation' as const,
    description: 'Validator Rewards Distribution (Q1 Adjustment)',
    amount: -32000,
    status: 'completed' as const,
    proposal: 'PROP-003',
  },
  {
    id: 'tx-004',
    date: '22 Jan 2026',
    type: 'income' as const,
    description: 'Staking Fee Revenue',
    amount: 18500,
    status: 'completed' as const,
    proposal: null,
  },
  {
    id: 'tx-005',
    date: '20 Jan 2026',
    type: 'expense' as const,
    description: 'Cloud Infrastructure Costs (January)',
    amount: -24500,
    status: 'completed' as const,
    proposal: null,
  },
  {
    id: 'tx-006',
    date: '18 Jan 2026',
    type: 'income' as const,
    description: 'NFT Credential Minting Fees',
    amount: 12300,
    status: 'completed' as const,
    proposal: null,
  },
  {
    id: 'tx-007',
    date: '15 Jan 2026',
    type: 'allocation' as const,
    description: 'Community Grants Programme - Rural Educators',
    amount: -25000,
    status: 'completed' as const,
    proposal: 'PROP-007',
  },
  {
    id: 'tx-008',
    date: '12 Jan 2026',
    type: 'income' as const,
    description: 'Tutoring Platform Commission',
    amount: 8200,
    status: 'completed' as const,
    proposal: null,
  },
];

const PENDING_ALLOCATIONS = [
  {
    id: 'pa-001',
    proposal: 'PROP-001',
    title: 'Indigenous Language Curriculum Fund',
    amount: 50000,
    status: 'awaiting_execution',
    approvedDate: '24 Jan 2026',
  },
  {
    id: 'pa-002',
    proposal: 'PROP-002',
    title: 'Mandarin Immersion Module Development',
    amount: 35000,
    status: 'voting',
    approvedDate: null,
  },
];

const REVENUE_STREAMS = [
  { name: 'Platform Subscriptions', monthly: 85000, trend: 12.5, percentage: 68.5 },
  { name: 'Staking Fees', monthly: 18500, trend: 8.2, percentage: 14.9 },
  { name: 'NFT Minting Fees', monthly: 12300, trend: 24.1, percentage: 9.9 },
  { name: 'Tutoring Commissions', monthly: 8200, trend: 5.7, percentage: 6.6 },
];

function getTransactionBadge(type: string) {
  switch (type) {
    case 'income':
      return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Income</Badge>;
    case 'allocation':
      return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Allocation</Badge>;
    case 'expense':
      return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Expense</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

export default function TreasuryPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/governance" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="heading-2">Treasury</h1>
          </div>
          <p className="text-muted-foreground">
            View and manage the DAO treasury allocations and finances
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="md:col-span-2 lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-emerald-500/10 p-4">
                <Wallet className="h-8 w-8 text-emerald-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Treasury Balance</p>
                <p className="text-4xl font-bold">{TREASURY_BALANCE.total.toLocaleString()}</p>
                <p className="text-sm font-medium text-muted-foreground">EDU-Nexus Tokens</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(TREASURY_BALANCE.monthlyIncome / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">Monthly Income</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-red-500/10 p-3">
              <TrendingDown className="h-6 w-6 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{(TREASURY_BALANCE.monthlyExpense / 1000).toFixed(0)}K</p>
              <p className="text-sm text-muted-foreground">Monthly Expense</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Allocation Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              Treasury Allocation
            </CardTitle>
            <CardDescription>Current fund distribution across categories</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ALLOCATION_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={110}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {ALLOCATION_DATA.map((entry, index) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    formatter={(value: string) => (
                      <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '12px' }}>{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {ALLOCATION_DATA.map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.amount.toLocaleString()} EDU ({item.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Revenue Streams */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Revenue Streams
            </CardTitle>
            <CardDescription>Monthly income by source</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {REVENUE_STREAMS.map((stream) => (
              <div key={stream.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{stream.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{stream.monthly.toLocaleString()} EDU</span>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                      <ArrowUpRight className="h-3 w-3 mr-0.5" />
                      {stream.trend}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 rounded-full overflow-hidden bg-muted">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${stream.percentage}%`,
                      backgroundColor: 'hsl(var(--primary))',
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground text-right">{stream.percentage}% of total revenue</p>
              </div>
            ))}

            <div className="border-t pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold">Total Monthly Revenue</span>
                <span className="font-bold">{REVENUE_STREAMS.reduce((sum, s) => sum + s.monthly, 0).toLocaleString()} EDU</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Allocations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Pending Allocations
          </CardTitle>
          <CardDescription>Fund allocations from approved or in-progress proposals</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {PENDING_ALLOCATIONS.map((allocation) => (
              <div key={allocation.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-4">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <FileText className="h-4 w-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{allocation.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {allocation.proposal} - {allocation.approvedDate ? `Approved ${allocation.approvedDate}` : 'Voting in progress'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{allocation.amount.toLocaleString()} EDU</span>
                  {allocation.status === 'awaiting_execution' ? (
                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Awaiting Execution
                    </Badge>
                  ) : (
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      Voting
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Latest treasury transactions and movements</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Date</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Description</th>
                  <th className="px-4 py-3 text-right font-medium">Amount (EDU)</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {RECENT_TRANSACTIONS.map((tx) => (
                  <tr key={tx.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{tx.date}</td>
                    <td className="px-4 py-3">{getTransactionBadge(tx.type)}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium">{tx.description}</p>
                        {tx.proposal && (
                          <p className="text-xs text-muted-foreground">{tx.proposal}</p>
                        )}
                      </div>
                    </td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${tx.amount > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        {tx.status}
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
