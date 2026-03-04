'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Calendar, CheckCircle2, Settings, Loader2, Users } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { FamilyProfile } from '@/types/parent';

// ---------------------------------------------------------------------------
// Fallback data (original mock — used when API returns null)
// ---------------------------------------------------------------------------
const SUBSCRIPTIONS_FALLBACK = [
  {
    id: 's1',
    name: 'Scholarly Premium Family',
    description: 'Full access for up to 4 children',
    price: 29.99,
    period: 'month',
    nextBilling: 'Feb 15, 2026',
    features: ['Unlimited learning sessions', 'All phonics phases', 'Progress analytics', 'Up to 4 children', 'Offline access'],
    status: 'active',
    childrenUsing: 3,
    maxChildren: 4,
  },
];

// ---------------------------------------------------------------------------
// Bridge: FamilyProfile → subscription display
// ---------------------------------------------------------------------------
function bridgeFamilyToSubscription(family: FamilyProfile) {
  const tierDetails: Record<string, { name: string; price: number; description: string; maxChildren: number; features: string[] }> = {
    free: {
      name: 'Scholarly Free',
      price: 0,
      description: 'Basic access with limited sessions',
      maxChildren: 1,
      features: ['5 sessions per week', 'Phase 1 phonics', 'Basic progress tracking'],
    },
    individual: {
      name: 'Scholarly Individual',
      price: 14.99,
      description: 'Full access for one child',
      maxChildren: 1,
      features: ['Unlimited learning sessions', 'All phonics phases', 'Progress analytics', 'Offline access'],
    },
    family: {
      name: 'Scholarly Family',
      price: 29.99,
      description: 'Full access for up to 4 children',
      maxChildren: 4,
      features: ['Unlimited learning sessions', 'All phonics phases', 'Progress analytics', 'Up to 4 children', 'Offline access', 'Family dashboard'],
    },
    educator: {
      name: 'Scholarly Educator',
      price: 49.99,
      description: 'Classroom tools and analytics',
      maxChildren: 30,
      features: ['Unlimited learning sessions', 'All phonics phases', 'Advanced analytics', 'Classroom management', 'Curriculum alignment reports', 'Up to 30 learners'],
    },
    school: {
      name: 'Scholarly School',
      price: 199.99,
      description: 'School-wide deployment',
      maxChildren: 500,
      features: ['Unlimited everything', 'Admin dashboard', 'LMS integration', 'Priority support', 'Custom branding'],
    },
  };

  const details = tierDetails[family.subscriptionTier] || tierDetails.family;

  return [{
    id: `sub-${family.familyId}`,
    name: details.name,
    description: details.description,
    price: details.price,
    period: 'month',
    nextBilling: family.subscriptionExpiresAt
      ? new Date(family.subscriptionExpiresAt).toLocaleDateString('en-AU', { month: 'short', day: 'numeric', year: 'numeric' })
      : 'N/A',
    features: details.features,
    status: family.subscriptionStatus,
    childrenUsing: family.children.length,
    maxChildren: details.maxChildren,
  }];
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentSubscriptionsPage() {
  const { family, isLoading } = useParent();

  const SUBSCRIPTIONS = family
    ? bridgeFamilyToSubscription(family)
    : SUBSCRIPTIONS_FALLBACK;

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
        <h1 className="text-2xl font-semibold tracking-tight">Subscriptions</h1>
        <p className="text-muted-foreground">Manage your Scholarly subscription</p>
      </div>

      {SUBSCRIPTIONS.map((sub) => (
        <Card key={sub.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-primary" />
                <div>
                  <span>{sub.name}</span>
                  <p className="text-sm font-normal text-muted-foreground">{sub.description}</p>
                </div>
              </div>
              <Badge className={
                sub.status === 'active'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                  : sub.status === 'trialing'
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
              }>
                {sub.status === 'active' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                {sub.status.charAt(0).toUpperCase() + sub.status.slice(1)}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pricing */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">${sub.price.toFixed(2)}</span>
              <span className="text-muted-foreground">/{sub.period}</span>
            </div>

            {/* Children usage */}
            <div className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{sub.childrenUsing} of {sub.maxChildren} children using this plan</span>
            </div>

            {/* Next billing */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Next billing: {sub.nextBilling}</span>
            </div>

            {/* Features */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Plan Features</h4>
              <ul className="space-y-1">
                {sub.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline">
                <Settings className="h-4 w-4 mr-2" />
                Manage Plan
              </Button>
              <Button variant="outline">Change Plan</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
