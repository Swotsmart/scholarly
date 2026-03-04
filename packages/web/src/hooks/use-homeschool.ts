/**
 * useHomeschool Hook
 *
 * Fetches Homeschool Hub data for the current user:
 *   - Family profile (with children, compliance, AI insights)
 *   - Co-ops (paginated, with member counts)
 *   - Excursions (upcoming, paginated)
 *   - Family matches (compatible families for co-op formation)
 *
 * Designed for progressive integration: each data slice starts as null
 * so existing pages can fall back to their hardcoded data.
 *
 * Usage:
 *   const { family, coops, excursions, matches, isLoading } = useHomeschool();
 *   const displayChildren = family?.children ?? legacyChildren;
 */

import { useState, useEffect, useCallback } from 'react';
import { homeschoolApi } from '@/lib/homeschool-api';
import type {
  HomeschoolFamily,
  HomeschoolCoop,
  Excursion,
  FamilyMatch,
  PaginationInfo,
} from '@/types/homeschool';

// =============================================================================
// TYPES
// =============================================================================

export interface HomeschoolState {
  family: HomeschoolFamily | null;
  coops: { items: HomeschoolCoop[]; pagination: PaginationInfo } | null;
  excursions: { items: Excursion[]; pagination: PaginationInfo } | null;
  matches: FamilyMatch[] | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useHomeschool(options?: {
  /** Whether to fetch family matches. Default true. */
  fetchMatches?: boolean;
  /** Co-op status filter. Default 'active'. */
  coopStatus?: string;
  /** Whether to only fetch upcoming excursions. Default true. */
  upcomingExcursions?: boolean;
  /** Page size for paginated results. Default 20. */
  pageSize?: number;
}): HomeschoolState {
  const [family, setFamily] = useState<HomeschoolFamily | null>(null);
  const [coops, setCoops] = useState<{ items: HomeschoolCoop[]; pagination: PaginationInfo } | null>(null);
  const [excursions, setExcursions] = useState<{ items: Excursion[]; pagination: PaginationInfo } | null>(null);
  const [matches, setMatches] = useState<FamilyMatch[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchMatches = true,
    coopStatus = 'active',
    upcomingExcursions = true,
    pageSize = 20,
  } = options ?? {};

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch everything in parallel. The family profile is the anchor —
      // like the foundation of a house, everything else builds on knowing
      // who the family is. But we don't block other fetches on it.
      const [familyResult, coopsResult, excursionsResult, matchesResult] = await Promise.allSettled([
        homeschoolApi.getFamily(),
        homeschoolApi.getCoops({ status: coopStatus, pageSize }),
        homeschoolApi.getExcursions({ upcoming: upcomingExcursions, pageSize }),
        fetchMatches ? homeschoolApi.searchFamilies() : Promise.resolve({ matches: [] }),
      ]);

      if (familyResult.status === 'fulfilled') {
        setFamily(familyResult.value.family);
      }

      if (coopsResult.status === 'fulfilled') {
        setCoops({
          items: coopsResult.value.coops,
          pagination: coopsResult.value.pagination,
        });
      }

      if (excursionsResult.status === 'fulfilled') {
        setExcursions({
          items: excursionsResult.value.excursions,
          pagination: excursionsResult.value.pagination,
        });
      }

      if (matchesResult.status === 'fulfilled') {
        setMatches(matchesResult.value.matches);
      }

      // Collect errors without blocking render
      const errors: string[] = [];
      if (familyResult.status === 'rejected') errors.push(`Family: ${familyResult.reason}`);
      if (coopsResult.status === 'rejected') errors.push(`Co-ops: ${coopsResult.reason}`);
      if (excursionsResult.status === 'rejected') errors.push(`Excursions: ${excursionsResult.reason}`);
      if (matchesResult.status === 'rejected') errors.push(`Matches: ${matchesResult.reason}`);
      if (errors.length > 0) setError(errors.join('; '));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load homeschool data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchMatches, coopStatus, upcomingExcursions, pageSize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    family,
    coops,
    excursions,
    matches,
    isLoading,
    error,
    refresh: fetchData,
  };
}
