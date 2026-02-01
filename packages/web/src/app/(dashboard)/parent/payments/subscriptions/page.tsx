'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, CheckCircle2, Settings } from 'lucide-react';

const SUBSCRIPTIONS = [
  {
    id: 's1',
    name: 'Scholarly Premium Family',
    description: 'Full access for up to 4 children',
    price: 29.99,
    period: 'month',
    nextBilling: 'Feb 15, 2026',
    status: 'active',
    features: ['Unlimited courses', 'AI Tutoring', 'Progress tracking', 'Priority support'],
  },
  {
    id: 's2',
    name: 'Math Tutoring Package',
    description: 'Weekly sessions with Dr. Sarah Chen',
    price: 299,
    period: 'month',
    nextBilling: 'Feb 20, 2026',
    status: 'active',
    features: ['4 sessions/month', 'Homework help', 'Practice materials'],
  },
];

export default function ParentSubscriptionsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground">Manage your active subscriptions</p>
        </div>
        <Button>Browse Plans</Button>
      </div>

      <div className="space-y-4">
        {SUBSCRIPTIONS.map((sub) => (
          <Card key={sub.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {sub.name}
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">{sub.description}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${sub.price}</p>
                  <p className="text-sm text-muted-foreground">per {sub.period}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Calendar className="h-4 w-4" />
                <span>Next billing: {sub.nextBilling}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {sub.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-1" />
                  Manage
                </Button>
                <Button variant="ghost" size="sm" className="text-destructive">
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
