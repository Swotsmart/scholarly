'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Download, CheckCircle2, AlertCircle, Clock, DollarSign } from 'lucide-react';

const PAYMENTS = [
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
    description: 'Drama Costume Fee',
    amount: 35,
    paidDate: 'Jan 20, 2026',
    status: 'paid',
    child: 'Emma',
  },
  {
    id: 'p5',
    description: 'School Supplies',
    amount: 85,
    paidDate: 'Jan 15, 2026',
    status: 'paid',
    child: 'Oliver',
  },
];

const SUBSCRIPTIONS = [
  {
    id: 's1',
    name: 'Scholarly Premium',
    price: 29.99,
    period: 'month',
    nextBilling: 'Feb 15, 2026',
    status: 'active',
  },
  {
    id: 's2',
    name: 'Math Tutoring Package',
    price: 299,
    period: 'month',
    nextBilling: 'Feb 20, 2026',
    status: 'active',
  },
];

export default function ParentPaymentsPage() {
  const pendingPayments = PAYMENTS.filter(p => p.status === 'pending');
  const paidPayments = PAYMENTS.filter(p => p.status === 'paid');
  const pendingTotal = pendingPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">Manage payments and subscriptions</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export History
        </Button>
      </div>

      {/* Outstanding Balance */}
      {pendingTotal > 0 && (
        <Card className="border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/20">
          <CardContent className="flex items-center justify-between p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-amber-100 p-3">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="font-medium">Outstanding Balance</p>
                <p className="text-3xl font-bold text-amber-600">${pendingTotal.toLocaleString()}</p>
              </div>
            </div>
            <Button>Pay Now</Button>
          </CardContent>
        </Card>
      )}

      {/* Pending Payments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-amber-500" />
            Pending Payments
          </CardTitle>
          <CardDescription>Payments awaiting completion</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {pendingPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{payment.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{payment.child}</Badge>
                  <span className="text-sm text-muted-foreground">Due: {payment.dueDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-lg font-bold">${payment.amount}</span>
                <Button size="sm">Pay</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Active Subscriptions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {SUBSCRIPTIONS.map((sub) => (
            <div key={sub.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{sub.name}</p>
                <p className="text-sm text-muted-foreground">Next billing: {sub.nextBilling}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-bold">${sub.price}/{sub.period}</p>
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </div>
                <Button variant="outline" size="sm">Manage</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {paidPayments.map((payment) => (
            <div key={payment.id} className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">{payment.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">{payment.child}</Badge>
                  <span className="text-sm text-muted-foreground">Paid: {payment.paidDate}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="font-medium">${payment.amount}</span>
                <Badge className="bg-green-100 text-green-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Paid
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
