/**
 * useTeacher Hook — Production
 *
 * Fetches core teacher data AND AI intelligence in parallel.
 * Every teacher page gets both raw data and AI insights — the intelligence
 * layer is not optional, it's integral to the LIS.
 *
 * Data fetched (all from real backend endpoints):
 *   /api/v1/dashboard/summary       — user profile, token balance, trust score
 *   /api/v1/dashboard/quick-stats   — tenant-wide stats (tutors, content, bookings, families)
 *   /api/v1/analytics/teacher/dashboard — teacher-specific analytics (performance, attendance, engagement, trends)
 *   /api/v1/sessions?upcoming=true  — upcoming sessions for this teacher
 *   /api/v1/ai-engine/ml/at-risk + /bkt/mastery — AI insights (at-risk detection, mastery gaps)
 *
 * Backend routes:
 *   dashboard.ts  — /summary, /quick-stats
 *   analytics.ts  — /teacher/dashboard
 *   sessions.ts   — GET / (upcoming)
 *   ai-engine.ts  — /ml/at-risk, /bkt/mastery, /ml/recommendations
 *   ai-buddy.ts   — /message (Ask Issy)
 */

import { useEffect, useState } from 'react';
import { teacherApi } from '@/lib/teacher-api';
import type {
  TeacherDashboardSummary,
  TeacherAnalyticsDashboard,
  Session,
  AIInsight,
} from '@/types/teacher';

/** Tenant-wide quick stats from /dashboard/quick-stats */
interface PlatformQuickStats {
  stats: {
    activeTutors: number;
    publishedContent: number;
    todayBookings: number;
    activeFamilies: number;
  };
}

interface TeacherData {
  summary: TeacherDashboardSummary | null;
  platformStats: PlatformQuickStats | null;
  analytics: TeacherAnalyticsDashboard | null;
  upcomingSessions: Session[];
  /** AI-generated insights — always present, may be empty if AI layer is unavailable */
  insights: AIInsight[];
}

export function useTeacher(context?: { studentIds?: string[]; classId?: string; page?: string }) {
  const [data, setData] = useState<TeacherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeacherData() {
      setIsLoading(true);
      setError(null);
      try {
        const results = await Promise.allSettled([
          teacherApi.dashboard.getSummary(),
          teacherApi.dashboard.getQuickStats(),
          teacherApi.analytics.getTeacherDashboard(),
          teacherApi.sessions.list({ upcoming: true }),
          teacherApi.ai.generatePageInsights({
            page: context?.page || 'dashboard',
            studentIds: context?.studentIds,
            classId: context?.classId,
          }),
        ]);

        setData({
          summary: results[0].status === 'fulfilled' ? results[0].value : null,
          platformStats: results[1].status === 'fulfilled' ? results[1].value as unknown as PlatformQuickStats : null,
          analytics: results[2].status === 'fulfilled' ? results[2].value : null,
          upcomingSessions: results[3].status === 'fulfilled' ? results[3].value.sessions : [],
          insights: results[4].status === 'fulfilled' ? results[4].value : [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load teacher data');
      } finally {
        setIsLoading(false);
      }
    }
    fetchTeacherData();
  }, [context?.page, context?.classId]);

  return { data, isLoading, error };
}
