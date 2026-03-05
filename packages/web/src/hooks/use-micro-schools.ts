/**
 * useMicroSchools Hook — Production
 *
 * Fetches core micro-schools data in parallel using Promise.allSettled for
 * independent failure isolation. If one data source fails, others
 * continue loading — a parent can still browse schools even
 * if the applications endpoint is temporarily down.
 *
 * Data fetched (from static exports in micro-schools-api.ts):
 *   microSchools   — all registered micro-schools with details
 *   applications   — user's micro-school applications
 *   enrollment stats are derived from the schools list
 */

import { useCallback, useEffect, useState } from 'react';
import {
  microSchools as allSchools,
  applications as allApplications,
  type MicroSchool,
  type MicroSchoolApplication,
} from '@/lib/micro-schools-api';

interface EnrollmentStats {
  totalSchools: number;
  totalStudents: number;
  totalTeachers: number;
  acceptingCount: number;
  waitlistedCount: number;
  fullCount: number;
}

interface MicroSchoolsData {
  /** All registered micro-schools */
  schools: MicroSchool[];
  /** User's applications to micro-schools */
  applications: MicroSchoolApplication[];
  /** Aggregated enrollment statistics */
  enrollmentStats: EnrollmentStats | null;
}

function computeEnrollmentStats(schools: MicroSchool[]): EnrollmentStats {
  return {
    totalSchools: schools.length,
    totalStudents: schools.reduce((sum, s) => sum + s.studentCount, 0),
    totalTeachers: schools.reduce((sum, s) => sum + s.teacherCount, 0),
    acceptingCount: schools.filter((s) => s.status === 'accepting').length,
    waitlistedCount: schools.filter((s) => s.status === 'waitlisted').length,
    fullCount: schools.filter((s) => s.status === 'full').length,
  };
}

export function useMicroSchools(config?: { state?: string }) {
  const [data, setData] = useState<MicroSchoolsData>({
    schools: [],
    applications: [],
    enrollmentStats: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const stateFilter = config?.state;

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // micro-schools-api uses static exports, wrap in promises for consistency
      const results = await Promise.allSettled([
        Promise.resolve(stateFilter ? allSchools.filter((s) => s.state === stateFilter) : allSchools),
        Promise.resolve(allApplications),
      ]);

      const schools = results[0].status === 'fulfilled' ? results[0].value : [];
      const apps = results[1].status === 'fulfilled' ? results[1].value : [];

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (errors.length > 0) setError(errors.join('; '));

      setData({
        schools,
        applications: apps,
        enrollmentStats: computeEnrollmentStats(schools),
      });
    } finally {
      setIsLoading(false);
    }
  }, [stateFilter]);

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
