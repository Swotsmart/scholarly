/**
 * useAdmin Hooks -- Production
 *
 * Fetches core admin data in parallel using Promise.allSettled for
 * independent failure isolation. If one data source fails, others
 * continue loading -- an admin can still see system health even
 * if the user list endpoint is temporarily down.
 *
 * Data fetched:
 *   /api/v1/admin/stats     -- platform-wide statistics (users, sessions, storage, uptime)
 *   /api/v1/admin/users     -- all platform users
 *   /api/v1/admin/health    -- system health (CPU, memory, DB connections, response time)
 *   /api/v1/admin/activity  -- recent admin activities
 */

import { useCallback, useEffect, useState } from 'react';
import { adminApi } from '@/lib/admin-api';
import type {
  AdminUser,
  PlatformStats,
  PlatformHealth,
  AdminActivity,
  ReliefTeacher,
  RoomInventory,
  SchedulingConstraint,
  SystemReport,
  FeatureFlag,
  IntegrationService,
} from '@/types/admin';

interface AdminData {
  /** Platform-wide statistics */
  stats: PlatformStats | null;
  /** All platform users */
  users: AdminUser[];
  /** System health metrics */
  health: PlatformHealth | null;
  /** Recent admin activity log */
  recentActivity: AdminActivity[];
}

export function useAdmin() {
  const [data, setData] = useState<AdminData>({
    stats: null,
    users: [],
    health: null,
    recentActivity: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      adminApi.getStats(),
      adminApi.getUsers(),
      adminApi.getHealth(),
      adminApi.getRecentActivity(),
    ]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    setData({
      stats: results[0].status === 'fulfilled' ? results[0].value : null,
      users: results[1].status === 'fulfilled' ? results[1].value : [],
      health: results[2].status === 'fulfilled' ? results[2].value : null,
      recentActivity: results[3].status === 'fulfilled' ? results[3].value : [],
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// ---------------------------------------------------------------------------
// useAdminReliefTeachers
// ---------------------------------------------------------------------------
export function useAdminReliefTeachers() {
  const [data, setData] = useState<ReliefTeacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getReliefTeachers();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load relief teachers');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useAdminRooms
// ---------------------------------------------------------------------------
export function useAdminRooms() {
  const [data, setData] = useState<RoomInventory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getRooms();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rooms');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useAdminConstraints
// ---------------------------------------------------------------------------
export function useAdminConstraints() {
  const [data, setData] = useState<SchedulingConstraint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getConstraints();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load constraints');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useAdminReports
// ---------------------------------------------------------------------------
export function useAdminReports() {
  const [data, setData] = useState<SystemReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getReports();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load reports');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useAdminFeatureFlags
// ---------------------------------------------------------------------------
export function useAdminFeatureFlags() {
  const [data, setData] = useState<FeatureFlag[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getFeatureFlags();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load feature flags');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useAdminIntegrations
// ---------------------------------------------------------------------------
export function useAdminIntegrations() {
  const [data, setData] = useState<IntegrationService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await adminApi.getIntegrations();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}
