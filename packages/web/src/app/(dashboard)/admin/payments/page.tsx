'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CreditCard,
  Search,
  Download,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Receipt,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';

const recentTransactions = [
  {
    id: 'TXN-001',
    user: 'David Smith',
    email: 'david@example.com',
    amount: 49.99,
    type: 'subscription',
    status: 'completed',
    date: '2 hours ago',
  },
  {
    id: 'TXN-002',
    user: 'Sarah Chen',
    email: 'sarah@example.com',
    amount: 75.00,
    type: 'tutoring',
    status: 'completed',
    date: '5 hours ago',
  },
  {
    id: 'TXN-003',
    user: 'Emma Taylor',
    email: 'emma@example.com',
    amount: 49.99,
    type: 'subscription',
    status: 'pending',
    date: '1 day ago',
  },
  {
    id: 'TXN-004',
    user: 'James Wilson',
    email: 'james@example.com',
    amount: 25.00,
    type: 'refund',
    status: 'completed',
    date: '2 days ago',
  },
];

const payoutQueue = [
  { tutor: 'Sarah Chen', amount: 450.00, sessions: 6, status: 'pending' },
  { tutor: 'Michael Brown', amount: 375.00, sessions: 5, status: 'pending' },
  { tutor: 'Lisa Wang', amount: 225.00, sessions: 3, status: 'processing' },
];

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Payments & Billing
          </h1>
          <p className="text-muted-foreground">
            Manage transactions, subscriptions, and payouts
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Process Payouts
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">Revenue (MTD)</span>
              </div>
              <Badge variant="secondary" className="text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12%
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">$24,580</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Subscriptions</span>
            </div>
            <div className="mt-2 text-2xl font-bold">1,247</div>
            <p className="text-xs text-emerald-600 mt-1">+23 this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Receipt className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Transactions</span>
            </div>
            <div className="mt-2 text-2xl font-bold">892</div>
            <p className="text-xs text-muted-foreground mt-1">This month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-500" />
                <span className="text-sm text-muted-foreground">Refunds</span>
              </div>
              <Badge variant="secondary" className="text-red-600">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                3%
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">$1,240</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search transactions..." className="pl-10" />
      </div>

      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          <TabsTrigger value="payouts">Tutor Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <CardTitle>Recent Transactions</CardTitle>
              <CardDescription>All payment activity across the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentTransactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      {txn.status === 'completed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : txn.status === 'pending' ? (
                        <Clock className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{txn.user}</span>
                          <Badge variant="outline">{txn.id}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{txn.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant="secondary">{txn.type}</Badge>
                      <div className="text-right">
                        <p className={`font-bold ${txn.type === 'refund' ? 'text-red-600' : ''}`}>
                          {txn.type === 'refund' ? '-' : ''}${txn.amount.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">{txn.date}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 text-center">
                <Button variant="outline">View All Transactions</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subscriptions">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Overview</CardTitle>
              <CardDescription>Active subscriptions by plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { plan: 'Basic', price: 9.99, subscribers: 456, color: 'bg-blue-500' },
                  { plan: 'Pro', price: 29.99, subscribers: 623, color: 'bg-purple-500' },
                  { plan: 'Family', price: 49.99, subscribers: 168, color: 'bg-green-500' },
                ].map((plan) => (
                  <div key={plan.plan} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className={`h-3 w-3 rounded-full ${plan.color}`} />
                      <div>
                        <p className="font-medium">{plan.plan} Plan</p>
                        <p className="text-sm text-muted-foreground">${plan.price}/month</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{plan.subscribers}</p>
                      <p className="text-sm text-muted-foreground">subscribers</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardHeader>
              <CardTitle>Pending Tutor Payouts</CardTitle>
              <CardDescription>Process earnings for verified tutors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payoutQueue.map((payout) => (
                  <div key={payout.tutor} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{payout.tutor}</p>
                      <p className="text-sm text-muted-foreground">{payout.sessions} sessions completed</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <Badge variant={payout.status === 'processing' ? 'default' : 'secondary'}>
                        {payout.status}
                      </Badge>
                      <div className="text-right">
                        <p className="text-xl font-bold">${payout.amount.toFixed(2)}</p>
                      </div>
                      <Button size="sm" disabled={payout.status === 'processing'}>
                        Process
                      </Button>
                    </div>
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
