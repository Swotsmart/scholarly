/**
 * useGoldenPath Hook
 *
 * Fetches Golden Path data across all three engines for a given learner:
 *   - Adaptation Engine: profile, ZPD, fatigue, rules, history
 *   - Curiosity Engine: profile, clusters, emerging interests, suggestions
 *   - Optimizer: weights, optimization result, history
 *
 * Designed for progressive integration: returns null for each data slice
 * until loaded, so existing pages can fall back to their hardcoded data.
 *
 * Usage:
 *   const { adaptation, curiosity, optimizer, isLoading, error } = useGoldenPath('learner-001');
 *   // Each sub-object is null until its fetch completes
 *   const mastery = adaptation?.profile?.competencyStates ?? localMasteryData;
 */

import { useState, useEffect, useCallback } from 'react';
import { goldenPathApi } from '@/lib/golden-path-api';
import type {
  AdaptationProfile,
  ZPDRange,
  FatigueAssessment,
  OptimalDifficulty,
  AdaptationRule,
  AdaptationEvent,
  CuriosityProfile,
  InterestCluster,
  EmergingInterest,
  ContentSuggestion,
  ObjectiveWeightsConfig,
  OptimizationResult,
  OptimizationEvent,
} from '@/types/golden-path';

// =============================================================================
// TYPES
// =============================================================================

export interface AdaptationData {
  profile: AdaptationProfile;
  zpd: ZPDRange | null;
  fatigue: FatigueAssessment | null;
  optimalDifficulty: OptimalDifficulty | null;
  rules: AdaptationRule[];
  history: AdaptationEvent[];
}

export interface CuriosityData {
  profile: CuriosityProfile;
  clusters: InterestCluster[];
  emergingInterests: EmergingInterest[];
  suggestions: ContentSuggestion[];
}

export interface OptimizerData {
  weights: ObjectiveWeightsConfig;
  result: OptimizationResult | null;
  history: OptimizationEvent[];
}

export interface GoldenPathState {
  adaptation: AdaptationData | null;
  curiosity: CuriosityData | null;
  optimizer: OptimizerData | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

export function useGoldenPath(
  learnerId: string,
  options?: {
    /** Default ZPD domain to fetch. Defaults to 'Mathematics'. */
    zpdDomain?: string;
    /** Session ID for fatigue assessment. If omitted, fatigue is skipped. */
    sessionId?: string;
    /** Number of adaptation history events. Default 20. */
    historyLimit?: number;
    /** Number of content suggestions. Default 5. */
    suggestionsLimit?: number;
    /** Whether to auto-run optimization on load. Default false. */
    autoOptimize?: boolean;
  }
): GoldenPathState {
  const [adaptation, setAdaptation] = useState<AdaptationData | null>(null);
  const [curiosity, setCuriosity] = useState<CuriosityData | null>(null);
  const [optimizer, setOptimizer] = useState<OptimizerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    zpdDomain = 'Mathematics',
    sessionId,
    historyLimit = 20,
    suggestionsLimit = 5,
    autoOptimize = false,
  } = options ?? {};

  const fetchData = useCallback(async () => {
    if (!learnerId) return;

    setIsLoading(true);
    setError(null);

    try {
      // Fetch all three engines in parallel — each engine's fetches are also
      // parallel within themselves. Think of it as three parallel conveyor belts,
      // each carrying multiple items simultaneously.
      const [adaptationResult, curiosityResult, optimizerResult] = await Promise.allSettled([
        // ── Adaptation Engine ──
        (async (): Promise<AdaptationData> => {
          const [profile, zpd, optDiff, rules, history, fatigue] = await Promise.allSettled([
            goldenPathApi.getAdaptationProfile(learnerId),
            goldenPathApi.getZPDRange(learnerId, zpdDomain),
            goldenPathApi.getOptimalDifficulty(learnerId),
            goldenPathApi.getAdaptationRules({ isActive: true }),
            goldenPathApi.getAdaptationHistory(learnerId, { limit: historyLimit }),
            sessionId ? goldenPathApi.getFatigueAssessment(learnerId, sessionId) : Promise.resolve(null),
          ]);

          return {
            profile: profile.status === 'fulfilled' ? profile.value : ({} as AdaptationProfile),
            zpd: zpd.status === 'fulfilled' ? zpd.value : null,
            optimalDifficulty: optDiff.status === 'fulfilled' ? optDiff.value : null,
            rules: rules.status === 'fulfilled' ? rules.value : [],
            history: history.status === 'fulfilled' ? history.value : [],
            fatigue: fatigue.status === 'fulfilled' ? fatigue.value : null,
          };
        })(),

        // ── Curiosity Engine ──
        (async (): Promise<CuriosityData> => {
          const [profile, clusters, emerging, suggestions] = await Promise.allSettled([
            goldenPathApi.getCuriosityProfile(learnerId),
            goldenPathApi.getInterestClusters(learnerId),
            goldenPathApi.getEmergingInterests(learnerId),
            goldenPathApi.getContentSuggestions(learnerId, { limit: suggestionsLimit }),
          ]);

          return {
            profile: profile.status === 'fulfilled' ? profile.value : ({} as CuriosityProfile),
            clusters: clusters.status === 'fulfilled' ? clusters.value : [],
            emergingInterests: emerging.status === 'fulfilled' ? emerging.value : [],
            suggestions: suggestions.status === 'fulfilled' ? suggestions.value : [],
          };
        })(),

        // ── Multi-Objective Optimizer ──
        (async (): Promise<OptimizerData> => {
          const [weights, history, result] = await Promise.allSettled([
            goldenPathApi.getObjectiveWeights(learnerId),
            goldenPathApi.getOptimizationHistory(learnerId, { limit: 10 }),
            autoOptimize ? goldenPathApi.optimizePath(learnerId) : Promise.resolve(null),
          ]);

          return {
            weights: weights.status === 'fulfilled' ? weights.value : ({} as ObjectiveWeightsConfig),
            history: history.status === 'fulfilled' ? history.value : [],
            result: result.status === 'fulfilled' ? result.value : null,
          };
        })(),
      ]);

      // Set results — each engine independently, so partial failures don't
      // block the others. If the curiosity engine is down, adaptation and
      // optimizer data still renders.
      if (adaptationResult.status === 'fulfilled') {
        setAdaptation(adaptationResult.value);
      }
      if (curiosityResult.status === 'fulfilled') {
        setCuriosity(curiosityResult.value);
      }
      if (optimizerResult.status === 'fulfilled') {
        setOptimizer(optimizerResult.value);
      }

      // Report errors but don't block rendering
      const errors: string[] = [];
      if (adaptationResult.status === 'rejected') errors.push(`Adaptation: ${adaptationResult.reason}`);
      if (curiosityResult.status === 'rejected') errors.push(`Curiosity: ${curiosityResult.reason}`);
      if (optimizerResult.status === 'rejected') errors.push(`Optimizer: ${optimizerResult.reason}`);
      if (errors.length > 0) setError(errors.join('; '));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load Golden Path data');
    } finally {
      setIsLoading(false);
    }
  }, [learnerId, zpdDomain, sessionId, historyLimit, suggestionsLimit, autoOptimize]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    adaptation,
    curiosity,
    optimizer,
    isLoading,
    error,
    refresh: fetchData,
  };
}
