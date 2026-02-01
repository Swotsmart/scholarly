'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Receipt, CheckCircle2 } from 'lucide-react';

const HISTORY = [
  { id: 'h1', description: 'Math Tutoring (January)', amount: 320, date: 'Jan 25, 2026', child: 'Emma' },
  { id: 'h2', description: 'Drama Costume Fee', amount: 35, date: 'Jan 20, 2026', child: 'Emma' },
  { id: 'h3', description: 'School Supplies', amount: 85, date: 'Jan 15, 2026', child: 'Oliver' },
  { id: 'h4', description: 'Scholarly Premium (December)', amount: 29.99, date: 'Dec 15, 2025', child: 'All' },
  { id: 'h5', description: 'Math Tutoring (December)', amount: 320, date: 'Dec 10, 2025', child: 'Emma' },
  { id: 'h6', description: 'Scholarly Premium (November)', amount: 29.99, date: 'Nov 15, 2025', child: 'All' },
];

export default function ParentPaymentHistoryPage() {
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Transactions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {HISTORY.map((item) => (
              <div key={item.id} className="flex items-center justify-between py-3 border-b last:border-0">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-green-100 p-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">{item.description}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm text-muted-foreground">{item.date}</span>
                      <Badge variant="outline">{item.child}</Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-medium">${item.amount.toFixed(2)}</span>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
