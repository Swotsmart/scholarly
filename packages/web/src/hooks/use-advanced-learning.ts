/**
 * Advanced Learning Hooks
 *
 * Per-section hooks that each fetch only the data their page needs.
 * Follows the same pattern as use-admin.ts (useCallback + Promise.allSettled).
 *
 * Hooks with live API calls:
 *   usePbl       — GET /advanced-learning/pbl/projects
 *   useIndustry  — GET /advanced-learning/industry-experience/opportunities
 *
 * Placeholder hooks (no backend routes implemented yet; pages use FALLBACK_* constants):
 *   useAdvancedLearningHub
 *   useEduscrum
 *   useWorkExperience
 */

import { useCallback, useEffect, useState } from 'react';
import {
  advancedLearningApi,
  type AdvancedLearningHubData,
  type EduscrumData,
  type PblData,
  type PblProject,
  type IndustryData,
  type IndustryOpportunity,
  type WorkExperienceData,
} from '@/lib/advanced-learning-api';

// =============================================================================
// useAdvancedLearningHub — no backend endpoint; pages use their own fallbacks
// =============================================================================

export function useAdvancedLearningHub(): {
  hub: AdvancedLearningHubData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  return { hub: null, isLoading: false, error: null, refetch: async () => {} };
}

// =============================================================================
// useEduscrum — no backend endpoint; pages use their own fallbacks
// =============================================================================

export function useEduscrum(): {
  eduscrum: EduscrumData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  return { eduscrum: null, isLoading: false, error: null, refetch: async () => {} };
}

// =============================================================================
// usePbl
// =============================================================================

export function usePbl() {
  const [pbl, setPbl] = useState<PblData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([advancedLearningApi.pbl.getProjects()]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    const projects: PblProject[] =
      results[0].status === 'fulfilled' ? results[0].value.projects : [];

    setPbl({
      project: projects[0] ?? null,
      phases: [],
      teamMembers: [],
      milestones: [],
      artifacts: [],
      exhibition: null,
      assessmentRubric: null,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { pbl, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useIndustry
// =============================================================================

export function useIndustry() {
  const [industry, setIndustry] = useState<IndustryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([advancedLearningApi.industry.getOpportunities()]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    const opportunities: IndustryOpportunity[] =
      results[0].status === 'fulfilled' ? results[0].value.opportunities : [];

    setIndustry({
      opportunities,
      applications: [],
      activePlacement: null,
      partnerCompanies: [],
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { industry, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useWorkExperience — no backend endpoint; pages use their own fallbacks
// =============================================================================

export function useWorkExperience(): {
  workExperience: WorkExperienceData | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  return { workExperience: null, isLoading: false, error: null, refetch: async () => {} };
}
