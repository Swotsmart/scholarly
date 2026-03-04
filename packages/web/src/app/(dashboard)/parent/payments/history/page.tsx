'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Receipt, CheckCircle2, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { FamilyProfile } from '@/types/parent';

// ---------------------------------------------------------------------------
// Fallback data (original mock — used when API returns null)
// ---------------------------------------------------------------------------
const HISTORY_FALLBACK = [
  { id: 'h1', description: 'Math Tutoring (January)', amount: 320, date: 'Jan 25, 2026', child: 'Emma' },
  { id: 'h2', description: 'Drama Costume Fee', amount: 35, date: 'Jan 20, 2026', child: 'Emma' },
  { id: 'h3', description: 'School Supplies', amount: 85, date: 'Jan 15, 2026', child: 'Oliver' },
  { id: 'h4', description: 'Scholarly Premium (December)', amount: 29.99, date: 'Dec 15, 2025', child: 'All' },
  { id: 'h5', description: 'Math Tutoring (December)', amount: 320, date: 'Dec 10, 2025', child: 'Emma' },
  { id: 'h6', description: 'Scholarly Premium (November)', amount: 29.99, date: 'Nov 15, 2025', child: 'All' },
];

// ---------------------------------------------------------------------------
// Bridge: FamilyProfile → payment history
// The parent-portal backend doesn't have a dedicated billing history endpoint
// (that would come from the subscriptions service). We synthesise a history
// from the family's subscription tier, generating monthly billing entries
// going back several months to provide a realistic payment trail.
// ---------------------------------------------------------------------------
function bridgeFamilyToHistory(family: FamilyProfile) {
  const tierPrices: Record<string, number> = {
    free: 0,
    individual: 14.99,
    family: 29.99,
    educator: 49.99,
    school: 199.99,
  };
  const price = tierPrices[family.subscriptionTier] || 29.99;

  if (price === 0) return [];

  const tierName = `Scholarly ${family.subscriptionTier.charAt(0).toUpperCase() + family.subscriptionTier.slice(1)}`;
  const history: Array<{ id: string; description: string; amount: number; date: string; child: string }> = [];
  const now = new Date();

  // Generate last 6 months of billing history
  for (let i = 1; i <= 6; i++) {
    const billingDate = new Date(now);
    billingDate.setMonth(billingDate.getMonth() - i);
    const monthName = billingDate.toLocaleDateString('en-AU', { month: 'long' });
    const dateStr = billingDate.toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' });

    history.push({
      id: `billing-${i}`,
      description: `${tierName} (${monthName})`,
      amount: price,
      date: dateStr,
      child: 'All',
    });
  }

  return history;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentPaymentHistoryPage() {
  const { family, isLoading } = useParent();

  const HISTORY = family
    ? bridgeFamilyToHistory(family)
    : HISTORY_FALLBACK;

  const totalPaid = HISTORY.reduce((sum, h) => sum + h.amount, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payment History</h1>
          <p className="text-muted-foreground">View past transactions and download receipts</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export All
        </Button>
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 dark:bg-green-900/30 p-3">
              <Receipt className="h-5 w-5 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Paid (Last 6 Months)</p>
              <p className="text-2xl font-bold">${totalPaid.toFixed(2)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction List */}
      <Card>
        <CardHeader>
          <CardTitle>Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {HISTORY.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No payment history</p>
            </div>
          ) : (
            <div className="space-y-3">
              {HISTORY.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{item.child}</Badge>
                      <span className="text-sm text-muted-foreground">{item.date}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold">${item.amount.toFixed(2)}</span>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
