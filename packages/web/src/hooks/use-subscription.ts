/**
 * useSubscription Hook
 *
 * Fetches subscription data for the current user:
 *   - Available plans
 *   - Active subscriptions (with members, entitlements)
 *   - Entitlements (feature gates and usage limits)
 *   - Invoices (billing history)
 *   - Analytics (admin only, opt-in)
 *
 * Usage:
 *   const { plans, subscription, entitlements, isLoading } = useSubscription();
 *   const canUseEduscrum = entitlements?.entitlements.find(e => e.key === 'eduscrum')?.granted;
 */

import { useState, useEffect, useCallback } from 'react';
import { subscriptionApi } from '@/lib/subscriptions-api';
import type {
  SubscriptionPlan,
  Subscription,
  EntitlementsResult,
  Invoice,
  SubscriptionAnalytics,
} from '@/types/subscriptions';

export interface SubscriptionState {
  plans: SubscriptionPlan[] | null;
  subscriptions: Subscription[] | null;
  /** Convenience: the first (primary) active subscription */
  subscription: Subscription | null;
  entitlements: EntitlementsResult | null;
  invoices: Invoice[] | null;
  analytics: SubscriptionAnalytics | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useSubscription(options?: {
  /** Fetch analytics (admin view). Default false. */
  fetchAnalytics?: boolean;
  /** Fetch invoices. Default true. */
  fetchInvoices?: boolean;
  /** Analytics period. Default 'last_30_days'. */
  analyticsPeriod?: string;
}): SubscriptionState {
  const [plans, setPlans] = useState<SubscriptionPlan[] | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[] | null>(null);
  const [entitlements, setEntitlements] = useState<EntitlementsResult | null>(null);
  const [invoices, setInvoices] = useState<Invoice[] | null>(null);
  const [analytics, setAnalytics] = useState<SubscriptionAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchAnalytics = false, fetchInvoices = true, analyticsPeriod = 'last_30_days' } = options ?? {};

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetches: Promise<{ key: string; data: unknown }>[] = [
        subscriptionApi.getPlans().then(r => ({ key: 'plans', data: r.plans })),
        subscriptionApi.getMySubscriptions().then(r => ({ key: 'subs', data: r.subscriptions })),
        subscriptionApi.getEntitlements().then(r => ({ key: 'ent', data: r })),
      ];

      // Invoices need a subscription ID — we'll fetch after we have subs
      if (fetchAnalytics) {
        fetches.push(
          subscriptionApi.getAnalytics(analyticsPeriod).then(r => ({ key: 'analytics', data: r.analytics })),
        );
      }

      const results = await Promise.allSettled(fetches);
      const errors: string[] = [];
      let activeSubs: Subscription[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { key, data } = result.value;
          switch (key) {
            case 'plans': setPlans(data as SubscriptionPlan[]); break;
            case 'subs': activeSubs = data as Subscription[]; setSubscriptions(activeSubs); break;
            case 'ent': setEntitlements(data as EntitlementsResult); break;
            case 'analytics': setAnalytics(data as SubscriptionAnalytics); break;
          }
        } else {
          errors.push(String(result.reason));
        }
      }

      // Fetch invoices for the primary subscription
      if (fetchInvoices && activeSubs.length > 0) {
        try {
          const inv = await subscriptionApi.getInvoices(activeSubs[0].id);
          setInvoices(inv.invoices);
        } catch (e) {
          errors.push(`Invoices: ${e}`);
        }
      }

      if (errors.length > 0) setError(errors.join('; '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAnalytics, fetchInvoices, analyticsPeriod]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return {
    plans, subscriptions,
    subscription: subscriptions?.[0] ?? null,
    entitlements, invoices, analytics,
    isLoading, error, refresh: fetchData,
  };
}
