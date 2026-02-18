'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, DashboardSummary } from '@/lib/api';
import { useAuthStore } from '@/stores/auth-store';

interface DashboardDataState {
  data: DashboardSummary | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useDashboardData(): DashboardDataState {
  const { isAuthenticated, accessToken } = useAuthStore();
  const [data, setData] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const response = await api.dashboard.getSummary();

    if (response.success) {
      setData(response.data);
    } else {
      setError(response.error);
    }

    setIsLoading(false);
  }, [isAuthenticated]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, isLoading, error, refetch: fetchData };
}
