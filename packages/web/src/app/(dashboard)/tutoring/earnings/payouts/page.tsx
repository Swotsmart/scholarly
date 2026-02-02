'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DollarSign,
  Download,
  CreditCard,
  CheckCircle2,
  Clock,
  Building,
  Calendar,
} from 'lucide-react';

const payouts = [
  { id: 'PAY-2024-012', amount: 2850.00, date: 'Feb 1, 2026', status: 'completed', method: 'Bank Transfer' },
  { id: 'PAY-2024-011', amount: 3120.00, date: 'Jan 15, 2026', status: 'completed', method: 'Bank Transfer' },
  { id: 'PAY-2024-010', amount: 2680.00, date: 'Jan 1, 2026', status: 'completed', method: 'Bank Transfer' },
  { id: 'PAY-2024-009', amount: 2450.00, date: 'Dec 15, 2025', status: 'completed', method: 'Bank Transfer' },
  { id: 'PAY-2024-008', amount: 2890.00, date: 'Dec 1, 2025', status: 'completed', method: 'Bank Transfer' },
];

export default function PayoutsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <CreditCard className="h-8 w-8" />
            Payouts
          </h1>
          <p className="text-muted-foreground">
            Manage your payout history and settings
          </p>
        </div>
        <Button>
          <DollarSign className="mr-2 h-4 w-4" />
          Request Payout
        </Button>
      </div>

      {/* Payout Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Available Balance</span>
            </div>
            <div className="mt-2 text-2xl font-bold">$892.50</div>
            <p className="text-xs text-muted-foreground mt-1">12 sessions pending</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Processing</span>
            </div>
            <div className="mt-2 text-2xl font-bold">$0.00</div>
            <p className="text-xs text-muted-foreground mt-1">No pending payouts</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Next Payout</span>
            </div>
            <div className="mt-2 text-2xl font-bold">Feb 15</div>
            <p className="text-xs text-muted-foreground mt-1">Automatic bi-weekly</p>
          </CardContent>
        </Card>
      </div>

      {/* Payout Method */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Method</CardTitle>
          <CardDescription>Your connected bank account for payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50 border-green-200">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white">
                <Building className="h-6 w-6 text-gray-600" />
              </div>
              <div>
                <p className="font-medium">Commonwealth Bank</p>
                <p className="text-sm text-muted-foreground">Account ending in ****4521</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-green-500">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Verified
              </Badge>
              <Button variant="outline" size="sm">Change</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>All your past payouts</CardDescription>
          </div>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Download All
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {payouts.map((payout) => (
              <div key={payout.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{payout.id}</p>
                      <Badge variant="secondary">{payout.method}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{payout.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-lg font-bold">${payout.amount.toFixed(2)}</span>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Payout Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Payout Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Payout Frequency</p>
              <p className="text-sm text-muted-foreground">How often you receive payouts</p>
            </div>
            <select className="p-2 rounded border">
              <option>Bi-weekly (1st & 15th)</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Minimum Payout</p>
              <p className="text-sm text-muted-foreground">Minimum balance required for payout</p>
            </div>
            <select className="p-2 rounded border">
              <option>$50</option>
              <option>$100</option>
              <option>$250</option>
              <option>No minimum</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
