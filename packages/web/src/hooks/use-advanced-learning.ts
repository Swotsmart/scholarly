/**
 * Advanced Learning Hooks
 *
 * Per-section hooks for advanced learning data. Each hook fetches only the
 * data needed for its corresponding page, preventing unnecessary API calls.
 *
 * - useAdvancedLearningHub   → Hub overview page
 * - useEduscrum              → EduScrum page
 * - usePbl                   → PBL page
 * - useIndustry              → Industry Experience page
 * - useWorkExperience        → Work Experience page
 *
 * The combined useAdvancedLearning hook is retained for backward compatibility
 * but delegates to the section hooks under the hood.
 */

import { useCallback, useEffect, useState } from 'react';
import {
  advancedLearningApi,
  type AdvancedLearningHubData,
  type EduscrumData,
  type PblData,
  type IndustryData,
  type WorkExperienceData,
  type EduScrumTask,
  type Sprint,
  type TeamMember,
  type AiSuggestion,
  type RetroItems,
  type PblProject,
  type IndustryOpportunity,
  type IndustryApplication,
  type IndustryPlacement,
  type PartnerCompany,
  type WorkOpportunity,
  type WorkApplication,
  type WorkDocument,
  type LogbookEntry,
  type SupervisorFeedback,
  type SupervisorDetails,
} from '@/lib/advanced-learning-api';

export interface AdvancedLearningData {
  hub: AdvancedLearningHubData | null;
  eduscrum: EduscrumData | null;
  pbl: PblData | null;
  industry: IndustryData | null;
  workExperience: WorkExperienceData | null;
}

// ---------------------------------------------------------------------------
// useAdvancedLearningHub — fetches hub overview only
// ---------------------------------------------------------------------------
export function useAdvancedLearningHub() {
  const [data, setData] = useState<AdvancedLearningHubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await advancedLearningApi.hub.getOverview();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load hub data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useEduscrum — fetches EduScrum section data only
// ---------------------------------------------------------------------------
export function useEduscrum() {
  const [data, setData] = useState<EduscrumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        advancedLearningApi.eduscrum.getTasks(),
        advancedLearningApi.eduscrum.getSprint(),
        advancedLearningApi.eduscrum.getTeam(),
        advancedLearningApi.eduscrum.getAISuggestions(),
        advancedLearningApi.eduscrum.getRetroItems(),
      ]);

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (errors.length > 0) setError(errors.join('; '));

      const tasks = results[0].status === 'fulfilled' ? results[0].value.tasks : [] as EduScrumTask[];
      const sprint = results[1].status === 'fulfilled' ? results[1].value.sprint : null as Sprint | null;
      const teamMembers = results[2].status === 'fulfilled' ? results[2].value.members : [] as TeamMember[];
      const aiSuggestions = results[3].status === 'fulfilled' ? results[3].value.suggestions : [] as AiSuggestion[];
      const retroItems = results[4].status === 'fulfilled' ? results[4].value.retroItems : null as RetroItems | null;

      setData({ tasks, sprint, burndown: [], teamMembers, aiSuggestions, retroItems, standupPrompts: [] });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// usePbl — fetches PBL section data only
// ---------------------------------------------------------------------------
export function usePbl() {
  const [data, setData] = useState<PblData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const projectsResult = await advancedLearningApi.pbl.getProjects();
      const firstProject = projectsResult.projects[0] as PblProject | undefined;

      setData({
        project: firstProject ?? null,
        phases: [],
        teamMembers: [],
        milestones: [],
        artifacts: [],
        exhibition: null,
        assessmentRubric: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load PBL data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useIndustry — fetches Industry Experience section data only
// ---------------------------------------------------------------------------
export function useIndustry() {
  const [data, setData] = useState<IndustryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        advancedLearningApi.industry.getOpportunities(),
        advancedLearningApi.industry.getApplications(),
        advancedLearningApi.industry.getActivePlacement(),
        advancedLearningApi.industry.getPartners(),
      ]);

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (errors.length > 0) setError(errors.join('; '));

      setData({
        opportunities: results[0].status === 'fulfilled' ? results[0].value.opportunities : [] as IndustryOpportunity[],
        applications: results[1].status === 'fulfilled' ? results[1].value.applications : [] as IndustryApplication[],
        activePlacement: results[2].status === 'fulfilled' ? results[2].value.placement : null as IndustryPlacement | null,
        partnerCompanies: results[3].status === 'fulfilled' ? results[3].value.partners : [] as PartnerCompany[],
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useWorkExperience — fetches Work Experience section data only
// ---------------------------------------------------------------------------
export function useWorkExperience() {
  const [data, setData] = useState<WorkExperienceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const results = await Promise.allSettled([
        advancedLearningApi.workExperience.getOpportunities(),
        advancedLearningApi.workExperience.getApplications(),
        advancedLearningApi.workExperience.getDocuments(),
        advancedLearningApi.workExperience.getLogbook(),
        advancedLearningApi.workExperience.getSupervisorFeedback(),
      ]);

      const errors = results
        .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
        .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
      if (errors.length > 0) setError(errors.join('; '));

      setData({
        opportunities: results[0].status === 'fulfilled' ? results[0].value.opportunities : [] as WorkOpportunity[],
        applications: results[1].status === 'fulfilled' ? results[1].value.applications : [] as WorkApplication[],
        documents: results[2].status === 'fulfilled' ? results[2].value.documents : [] as WorkDocument[],
        logbook: results[3].status === 'fulfilled' ? results[3].value.entries : [] as LogbookEntry[],
        supervisorFeedback: results[4].status === 'fulfilled' ? results[4].value.feedback : [] as SupervisorFeedback[],
        supervisorDetails: results[4].status === 'fulfilled' ? results[4].value.supervisor : null as SupervisorDetails | null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  return { data, isLoading, error, refetch: fetchData };
}

// ---------------------------------------------------------------------------
// useAdvancedLearning — combined hook retained for backward compatibility
// Prefer the per-section hooks (useEduscrum, usePbl, etc.) for new usage.
// ---------------------------------------------------------------------------
export function useAdvancedLearning() {
  const hub = useAdvancedLearningHub();
  const eduscrum = useEduscrum();
  const pbl = usePbl();
  const industry = useIndustry();
  const workExperience = useWorkExperience();

  const isLoading = hub.isLoading || eduscrum.isLoading || pbl.isLoading || industry.isLoading || workExperience.isLoading;
  const errors = [hub.error, eduscrum.error, pbl.error, industry.error, workExperience.error].filter(Boolean);

  const data: AdvancedLearningData = {
    hub: hub.data,
    eduscrum: eduscrum.data,
    pbl: pbl.data,
    industry: industry.data,
    workExperience: workExperience.data,
  };

  return { data, isLoading, error: errors.length > 0 ? errors.join('; ') : null };
}
