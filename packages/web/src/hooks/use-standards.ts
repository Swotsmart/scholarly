/**
 * useStandards Hook — Production
 *
 * Fetches core standards compliance data in parallel using Promise.allSettled
 * for independent failure isolation. If one data source fails, others
 * continue loading — a user can still view frameworks even
 * if the audits endpoint is temporarily down.
 *
 * Data fetched:
 *   /api/v1/standards/frameworks — all compliance frameworks with scores
 *   /api/v1/standards/audits     — all audit records
 *   Compliance status is derived from frameworks data
 */

import { useCallback, useEffect, useState } from 'react';
import { getFrameworks, getAudits } from '@/lib/standards-api';
import type { ComplianceFramework, ComplianceAudit } from '@/types/standards';

interface ComplianceStatus {
  overallScore: number;
  totalFrameworks: number;
  compliantCount: number;
  partialCount: number;
  nonCompliantCount: number;
}

interface StandardsData {
  /** All compliance frameworks */
  frameworks: ComplianceFramework[];
  /** All audit records */
  audits: ComplianceAudit[];
  /** Aggregated compliance status */
  complianceStatus: ComplianceStatus | null;
}

function computeComplianceStatus(frameworks: ComplianceFramework[]): ComplianceStatus {
  const total = frameworks.length;
  if (total === 0) {
    return { overallScore: 0, totalFrameworks: 0, compliantCount: 0, partialCount: 0, nonCompliantCount: 0 };
  }
  const overallScore = Math.round(frameworks.reduce((sum, f) => sum + f.complianceScore, 0) / total);
  return {
    overallScore,
    totalFrameworks: total,
    compliantCount: frameworks.filter((f) => f.status === 'compliant').length,
    partialCount: frameworks.filter((f) => f.status === 'partial').length,
    nonCompliantCount: frameworks.filter((f) => f.status !== 'compliant' && f.status !== 'partial').length,
  };
}

export function useStandards() {
  const [data, setData] = useState<StandardsData>({
    frameworks: [],
    audits: [],
    complianceStatus: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      getFrameworks(),
      getAudits(),
    ]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    const frameworks = results[0].status === 'fulfilled' ? results[0].value : [];
    const audits = results[1].status === 'fulfilled' ? results[1].value : [];

    setData({
      frameworks,
      audits,
      complianceStatus: computeComplianceStatus(frameworks),
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
