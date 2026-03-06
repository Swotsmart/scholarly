/**
 * useML Hook — Production
 *
 * Fetches core ML pipeline data in parallel using Promise.allSettled for
 * independent failure isolation. If one data source fails, others
 * continue loading — a user can still see model details even
 * if the predictions endpoint is temporarily down.
 *
 * Data fetched:
 *   /api/v1/ml/models         — all registered ML models
 *   /api/v1/ml/predictions    — recent prediction results across all models
 *   /api/v1/ml/training-jobs  — active and completed training jobs (pipeline status)
 */

import { useCallback, useEffect, useState } from 'react';
import { getModels, getPredictions, getTrainingJobs } from '@/lib/ml-api';
import type { MLModel, PredictionResult, TrainingJob } from '@/types/ml';

interface MLData {
  /** All registered ML models */
  models: MLModel[];
  /** Recent prediction results */
  predictions: PredictionResult[];
  /** Training jobs (active + completed — represents pipeline status) */
  trainingJobs: TrainingJob[];
}

export function useML(config?: { category?: string }) {
  const [data, setData] = useState<MLData>({
    models: [],
    predictions: [],
    trainingJobs: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const category = config?.category;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getModels(),
      getPredictions(category),
      getTrainingJobs(),
    ]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    setData({
      models: results[0].status === 'fulfilled' ? results[0].value : [],
      predictions: results[1].status === 'fulfilled' ? results[1].value : [],
      trainingJobs: results[2].status === 'fulfilled' ? results[2].value : [],
    });
    setIsLoading(false);
  }, [category]);

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
