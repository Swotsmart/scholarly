/**
 * Marketplace React Hooks
 * Follows the use-golden-path.ts pattern with progressive loading.
 */

import { useState, useEffect, useCallback } from 'react';
import { marketplaceApi } from '@/lib/marketplace-api';
import type {
  MarketplaceApp,
  AppDetail,
  DeveloperProfile,
  DeveloperApp,
  DeveloperStats,
  ApiKeyRecord,
  ApiKeyCreateResult,
  WebhookConfig,
  UsageDataPoint,
  RevenueDataPoint,
  PayoutRecord,
  FeatureRequest,
  Bounty,
  MarketplaceCategory,
  MarketplaceStats,
  AppRecommendation,
} from '@/types/marketplace';

// =============================================================================
// Generic hook helper
// =============================================================================

function useAsyncData<T>(
  fetcher: () => Promise<T>,
  deps: unknown[] = [],
) {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { data, isLoading, error, refresh, setData };
}

// =============================================================================
// Marketplace Apps
// =============================================================================

export function useMarketplaceApps(query?: string, category?: string) {
  const { data, isLoading, error, refresh } = useAsyncData(
    () => marketplaceApi.apps.search({ query, category }),
    [query, category],
  );

  return {
    apps: data?.apps ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refresh,
  };
}

export function useMarketplaceStats() {
  return useAsyncData(() => marketplaceApi.apps.getStats(), []);
}

export function useMarketplaceCategories() {
  return useAsyncData(() => marketplaceApi.apps.getCategories(), []);
}

export function useAppRecommendations() {
  const { data, isLoading, error, refresh } = useAsyncData(
    () => marketplaceApi.ai.recommendations(),
    [],
  );
  return { recommendations: data ?? [], isLoading, error, refresh };
}

// =============================================================================
// App Detail
// =============================================================================

export function useAppDetail(id: string | null) {
  const { data, isLoading, error, refresh } = useAsyncData(
    async () => {
      if (!id) return null;
      return marketplaceApi.apps.getById(id);
    },
    [id],
  );

  const install = useCallback(async () => {
    if (!id) return;
    await marketplaceApi.apps.install(id);
    refresh();
  }, [id, refresh]);

  const uninstall = useCallback(async () => {
    if (!id) return;
    await marketplaceApi.apps.uninstall(id);
    refresh();
  }, [id, refresh]);

  const submitReview = useCallback(async (rating: number, title: string, content: string) => {
    if (!id) return;
    await marketplaceApi.apps.submitReview(id, { rating, title, content });
    refresh();
  }, [id, refresh]);

  return {
    app: data,
    isLoading,
    error,
    refresh,
    install,
    uninstall,
    submitReview,
  };
}

// =============================================================================
// Developer Portal
// =============================================================================

export function useDeveloperPortal() {
  const [profile, setProfile] = useState<DeveloperProfile | null>(null);
  const [stats, setStats] = useState<DeveloperStats | null>(null);
  const [apps, setApps] = useState<DeveloperApp[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [profileResult, appsResult] = await Promise.allSettled([
        marketplaceApi.developer.getProfile(),
        marketplaceApi.developer.getApps(),
      ]);

      if (profileResult.status === 'fulfilled') {
        setProfile(profileResult.value.profile);
        setStats(profileResult.value.stats);
      }
      if (appsResult.status === 'fulfilled') {
        setApps(appsResult.value);
      }

      const errors: string[] = [];
      if (profileResult.status === 'rejected') errors.push(String(profileResult.reason));
      if (appsResult.status === 'rejected') errors.push(String(appsResult.reason));
      if (errors.length > 0) setError(errors.join('; '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load developer data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return { profile, stats, apps, isLoading, error, refresh };
}

// =============================================================================
// API Keys
// =============================================================================

export function useDeveloperApiKeys() {
  const { data, isLoading, error, refresh, setData } = useAsyncData(
    () => marketplaceApi.apiKeys.list(),
    [],
  );

  const createKey = useCallback(async (name: string, permissions: string[]): Promise<ApiKeyCreateResult> => {
    const result = await marketplaceApi.apiKeys.create(name, permissions);
    refresh();
    return result;
  }, [refresh]);

  const revokeKey = useCallback(async (id: string) => {
    await marketplaceApi.apiKeys.revoke(id);
    // Optimistic update
    if (data) {
      setData(data.map(k => k.id === id ? { ...k, status: 'revoked' as const } : k));
    }
  }, [data, setData, refresh]);

  return {
    keys: data ?? [],
    isLoading,
    error,
    refresh,
    createKey,
    revokeKey,
  };
}

// =============================================================================
// Webhooks
// =============================================================================

export function useDeveloperWebhooks() {
  const { data, isLoading, error, refresh, setData } = useAsyncData(
    () => marketplaceApi.webhooks.list(),
    [],
  );

  const createWebhook = useCallback(async (url: string, events: string[]) => {
    const webhook = await marketplaceApi.webhooks.create(url, events);
    refresh();
    return webhook;
  }, [refresh]);

  const deleteWebhook = useCallback(async (id: string) => {
    await marketplaceApi.webhooks.delete(id);
    if (data) {
      setData(data.filter(w => w.id !== id));
    }
  }, [data, setData]);

  const testWebhook = useCallback(async (id: string) => {
    return marketplaceApi.webhooks.test(id);
  }, []);

  return {
    webhooks: data ?? [],
    isLoading,
    error,
    refresh,
    createWebhook,
    deleteWebhook,
    testWebhook,
  };
}

// =============================================================================
// Analytics
// =============================================================================

export function useDeveloperAnalytics(period?: string) {
  const [usage, setUsage] = useState<UsageDataPoint[]>([]);
  const [revenue, setRevenue] = useState<RevenueDataPoint[]>([]);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [u, r, p] = await Promise.allSettled([
        marketplaceApi.analytics.usage(period),
        marketplaceApi.analytics.revenue(period),
        marketplaceApi.analytics.payouts(),
      ]);

      if (u.status === 'fulfilled') setUsage(u.value);
      if (r.status === 'fulfilled') setRevenue(r.value);
      if (p.status === 'fulfilled') setPayouts(p.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [period]);

  useEffect(() => { refresh(); }, [refresh]);

  return { usage, revenue, payouts, isLoading, error, refresh };
}

// =============================================================================
// Community
// =============================================================================

export function useCommunityRequests() {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [bounties, setBounties] = useState<Bounty[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [r, b] = await Promise.allSettled([
        marketplaceApi.community.listRequests(),
        marketplaceApi.community.listBounties(),
      ]);

      if (r.status === 'fulfilled') setRequests(r.value);
      if (b.status === 'fulfilled') setBounties(b.value);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load community data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createRequest = useCallback(async (data: { title: string; description: string; category: string; fundingGoal: number }) => {
    await marketplaceApi.community.createRequest(data);
    refresh();
  }, [refresh]);

  const pledge = useCallback(async (requestId: string, amount: number) => {
    await marketplaceApi.community.pledge(requestId, amount);
    refresh();
  }, [refresh]);

  const claimBounty = useCallback(async (bountyId: string, proposal: string) => {
    await marketplaceApi.community.claimBounty(bountyId, proposal);
    refresh();
  }, [refresh]);

  return { requests, bounties, isLoading, error, refresh, createRequest, pledge, claimBounty };
}
