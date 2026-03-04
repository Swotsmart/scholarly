/**
 * useParent Hook — Production
 *
 * Fetches core parent data in parallel using Promise.allSettled for
 * independent failure isolation. If one data source fails, others
 * continue loading — a parent can still see their daily digest even
 * if the family profile endpoint is temporarily down.
 *
 * Data fetched (from real backend endpoints):
 *   /api/v1/parent/family-profile   — family profile with all children + progress
 *   /api/v1/parent/daily-digest     — today's learning activity across all children
 *
 * The hook returns three shapes that pages destructure differently:
 *   { family, isLoading }    — most pages (progress, payments, portfolio)
 *   { familyData, isLoading } — messaging pages (alias for family)
 *   { digest, isLoading }    — calendar page (daily digest view)
 *
 * Backend routes:
 *   parent-portal.ts — /family-profile, /daily-digest, /:learnerId/progress,
 *                       /:learnerId/activity-feed, /:learnerId/home-activities,
 *                       /notifications (PUT)
 */

import { useEffect, useState } from 'react';
import { parentApi } from '@/lib/parent-api';
import type { FamilyProfile, DailyDigest } from '@/types/parent';

interface ParentData {
  /** Full family profile with children, progress, preferences */
  family: FamilyProfile | null;
  /** Alias for family — used by messaging pages */
  familyData: FamilyProfile | null;
  /** Today's learning digest across all children */
  digest: DailyDigest | null;
}

export function useParent() {
  const [data, setData] = useState<ParentData>({ family: null, familyData: null, digest: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchParentData() {
      setIsLoading(true);
      setError(null);
      const results = await Promise.allSettled([
        parentApi.family.getProfile(),
        parentApi.family.getDailyDigest(),
      ]);

      const family = results[0].status === 'fulfilled' ? results[0].value : null;
      const digest = results[1].status === 'fulfilled' ? results[1].value : null;

      // Collect rejected reasons into error state
      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map(r => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (errors.length > 0) setError(errors.join('; '));

      setData({
        family,
        familyData: family, // alias for messaging pages
        digest,
      });
      setIsLoading(false);
    }
    fetchParentData();
  }, []);

  return {
    ...data,
    isLoading,
    error,
  };
}
