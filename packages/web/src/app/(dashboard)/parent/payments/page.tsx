'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, CheckCircle2, AlertCircle, Clock, DollarSign, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { FamilyProfile } from '@/types/parent';

// ---------------------------------------------------------------------------
// Fallback data (original mock — used when API returns null)
// ---------------------------------------------------------------------------
const PAYMENTS_FALLBACK = [
  {
    id: 'p1',
    description: 'Term 1 Tuition Fee',
    amount: 2500,
    dueDate: 'Feb 15, 2026',
    status: 'pending',
    child: 'All',
  },
  {
    id: 'p2',
    description: 'Excursion Fee - Museum Visit',
    amount: 45,
    dueDate: 'Feb 5, 2026',
    status: 'pending',
    child: 'Emma',
  },
  {
    id: 'p3',
    description: 'Math Tutoring (January)',
    amount: 320,
    paidDate: 'Jan 25, 2026',
    status: 'paid',
    child: 'Emma',
  },
  {
    id: 'p4',
    description: 'Science Lab Materials',
    amount: 65,
    paidDate: 'Jan 20, 2026',
    status: 'paid',
    child: 'Oliver',
  },
];

const SUBSCRIPTIONS_FALLBACK = [
  {
    id: 's1',
    name: 'Scholarly Premium Family',
    price: 29.99,
    period: 'month',
    nextBilling: 'Feb 15, 2026',
    status: 'active',
  },
];

// ---------------------------------------------------------------------------
// Bridge: FamilyProfile → payment display
// The parent-portal backend provides subscription details in the family
// profile. We translate the subscription tier/status/expiry into payment
// items and subscription summary cards.
// ---------------------------------------------------------------------------
function bridgeFamilyToPayments(family: FamilyProfile) {
  const payments: Array<{
    id: string;
    description: string;
    amount: number;
    dueDate?: string;
    paidDate?: string;
    status: string;
    child: string;
  }> = [];

  // Current subscription as a "paid" item
  if (family.subscriptionStatus === 'active' || family.subscriptionStatus === 'trialing') {
    const tierPrices: Record<string, number> = {
      free: 0,
      individual: 14.99,
      family: 29.99,
      educator: 49.99,
      school: 199.99,
    };
    const price = tierPrices[family.subscriptionTier] || 29.99;

    if (price > 0) {
      const lastMonth = new Date();
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      payments.push({
        id: 'sub-current',
        description: `Scholarly ${family.subscriptionTier.charAt(0).toUpperCase() + family.subscriptionTier.slice(1)} Plan`,
        amount: price,
        paidDate: lastMonth.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
        status: 'paid',
        child: 'All',
      });

      // Upcoming subscription renewal
      if (family.subscriptionExpiresAt) {
        payments.push({
          id: 'sub-upcoming',
          description: `Scholarly ${family.subscriptionTier.charAt(0).toUpperCase() + family.subscriptionTier.slice(1)} Plan Renewal`,
          amount: price,
          dueDate: new Date(family.subscriptionExpiresAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' }),
          status: 'pending',
          child: 'All',
        });
      }
    }
  }

  return payments;
}

function bridgeFamilyToSubscriptions(family: FamilyProfile) {
  const tierPrices: Record<string, number> = {
    free: 0,
    individual: 14.99,
    family: 29.99,
    educator: 49.99,
    school: 199.99,
  };
  const price = tierPrices[family.subscriptionTier] || 29.99;

  return [{
    id: `sub-${family.familyId}`,
    name: `Scholarly ${family.subscriptionTier.charAt(0).toUpperCase() + family.subscriptionTier.slice(1)}`,
    price,
    period: 'month',
    nextBilling: family.subscriptionExpiresAt
      ? new Date(family.subscriptionExpiresAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A',
    status: family.subscriptionStatus,
  }];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
        </Badge>
      );
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
          <Clock className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    case 'overdue':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="h-3 w-3 mr-1" /> Overdue
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentPaymentsPage() {
  const { family, isLoading } = useParent();

  const PAYMENTS = family
    ? bridgeFamilyToPayments(family)
    : PAYMENTS_FALLBACK;

  const SUBSCRIPTIONS = family
    ? bridgeFamilyToSubscriptions(family)
    : SUBSCRIPTIONS_FALLBACK;

  const pending = PAYMENTS.filter((p) => p.status === 'pending');
  const paid = PAYMENTS.filter((p) => p.status === 'paid');
  const totalPending = pending.reduce((sum, p) => sum + p.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-muted-foreground">Manage payments, subscriptions, and billing</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-amber-100 dark:bg-amber-900/30 p-3">
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">${totalPending.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-3">
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Paid This Month</p>
                <p className="text-2xl font-bold">${paid.reduce((sum, p) => sum + p.amount, 0).toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-100 dark:bg-blue-900/30 p-3">
                <CreditCard className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active Subscription</p>
                <p className="text-2xl font-bold">{SUBSCRIPTIONS[0]?.name || 'None'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Payments */}
      {pending.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {pending.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{payment.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{payment.child}</Badge>
                    <span className="text-sm text-muted-foreground">Due: {payment.dueDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">${payment.amount.toFixed(2)}</span>
                  {getStatusBadge(payment.status)}
                  <Button size="sm">Pay Now</Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Recent Payments */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Payments</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paid.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No recent payments</p>
          ) : (
            paid.map((payment) => (
              <div key={payment.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{payment.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">{payment.child}</Badge>
                    <span className="text-sm text-muted-foreground">{payment.paidDate}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold">${payment.amount.toFixed(2)}</span>
                  {getStatusBadge(payment.status)}
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
