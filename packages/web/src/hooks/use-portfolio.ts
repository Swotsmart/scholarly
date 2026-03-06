/**
 * usePortfolio Hook — Production
 *
 * Fetches core portfolio data in parallel using Promise.allSettled for
 * independent failure isolation. If one data source fails, others
 * continue loading — a student can still view their goals even
 * if the artifacts endpoint is temporarily down.
 *
 * Data fetched:
 *   /api/v1/portfolio/artifacts  — all portfolio artifacts (documents, code, media)
 *   /api/v1/portfolio/goals      — learning goals with milestones
 *   /api/v1/portfolio/journeys   — learning journeys with timeline events
 */

import { useCallback, useEffect, useState } from 'react';
import { portfolioApi } from '@/lib/portfolio-api';
import type { Artifact, LearningGoal, LearningJourney } from '@/types/portfolio';

interface PortfolioData {
  /** All portfolio artifacts */
  artifacts: Artifact[];
  /** Learning goals with progress and milestones */
  goals: LearningGoal[];
  /** Learning journeys with timeline milestones */
  journeys: LearningJourney[];
}

export function usePortfolio() {
  const [data, setData] = useState<PortfolioData>({
    artifacts: [],
    goals: [],
    journeys: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      portfolioApi.getArtifacts(),
      portfolioApi.getGoals(),
      portfolioApi.getJourneys(),
    ]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    setData({
      artifacts: results[0].status === 'fulfilled' ? results[0].value.artifacts : [],
      goals: results[1].status === 'fulfilled' ? results[1].value.goals : [],
      journeys: results[2].status === 'fulfilled' ? results[2].value.journeys : [],
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
