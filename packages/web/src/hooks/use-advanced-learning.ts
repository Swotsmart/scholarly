/**
 * Advanced Learning Hooks
 *
 * Per-section hooks that each fetch only the data their page needs.
 * Follows the same pattern as use-admin.ts (useCallback + Promise.allSettled).
 *
 * Hooks:
 *   useAdvancedLearningHub  — hub overview page (1 request)
 *   useEduscrum             — EduScrum page     (5 requests)
 *   usePbl                  — PBL page          (1 request)
 *   useIndustry             — Industry page     (4 requests)
 *   useWorkExperience       — Work Experience   (5 requests)
 */

import { useCallback, useEffect, useState } from 'react';
import {
  advancedLearningApi,
  type AdvancedLearningHubData,
  type EduscrumData,
  type EduScrumTask,
  type EduScrumSprint,
  type EduScrumTeamMember,
  type EduScrumAISuggestion,
  type EduScrumRetroItems,
  type PblData,
  type PblProject,
  type IndustryData,
  type IndustryOpportunity,
  type IndustryApplication,
  type IndustryPlacement,
  type IndustryPartner,
  type WorkExperienceData,
  type WorkOpportunity,
  type WorkApplication,
  type WorkDocument,
  type WorkLogbookEntry,
  type WorkSupervisorFeedback,
  type WorkSupervisor,
} from '@/lib/advanced-learning-api';

/* eslint-disable @typescript-eslint/no-explicit-any */

// =============================================================================
// useAdvancedLearningHub
// =============================================================================

export function useAdvancedLearningHub() {
  const [hub, setHub] = useState<AdvancedLearningHubData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const results = await Promise.allSettled([advancedLearningApi.hub.getOverview()]);

    const errors = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r) => (r.reason instanceof Error ? r.reason.message : String(r.reason)));
    if (errors.length > 0) setError(errors.join('; '));

    setHub(results[0].status === 'fulfilled' ? results[0].value : null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { hub, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useEduscrum
// =============================================================================

export function useEduscrum() {
  const [eduscrum, setEduscrum] = useState<EduscrumData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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

    const tasks = results[0].status === 'fulfilled' ? (results[0].value as { tasks: any[] }).tasks : [];
    const sprint = results[1].status === 'fulfilled' ? (results[1].value as { sprint: any }).sprint : null;
    const members = results[2].status === 'fulfilled' ? (results[2].value as { members: any[] }).members : [];
    const suggestions = results[3].status === 'fulfilled' ? (results[3].value as { suggestions: any[] }).suggestions : [];
    const retroItems = results[4].status === 'fulfilled' ? (results[4].value as { retroItems: any }).retroItems : null;

    setEduscrum({ tasks, sprint, burndown: [], teamMembers: members, aiSuggestions: suggestions, retroItems, standupPrompts: [] });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const results = await Promise.allSettled([
          // 0: Hub overview
          advancedLearningApi.hub.getOverview(),
          // 1: EduScrum tasks
          advancedLearningApi.eduscrum.getTasks(),
          // 2: EduScrum sprint
          advancedLearningApi.eduscrum.getSprint(),
          // 3: EduScrum team
          advancedLearningApi.eduscrum.getTeam(),
          // 4: EduScrum AI suggestions
          advancedLearningApi.eduscrum.getAISuggestions(),
          // 5: EduScrum retro
          advancedLearningApi.eduscrum.getRetroItems(),
          // 6: PBL projects
          advancedLearningApi.pbl.getProjects(),
          // 7: Industry opportunities
          advancedLearningApi.industry.getOpportunities(),
          // 8: Industry applications
          advancedLearningApi.industry.getApplications(),
          // 9: Industry active placement
          advancedLearningApi.industry.getActivePlacement(),
          // 10: Industry partners
          advancedLearningApi.industry.getPartners(),
          // 11: Work experience opportunities
          advancedLearningApi.workExperience.getOpportunities(),
          // 12: Work experience applications
          advancedLearningApi.workExperience.getApplications(),
          // 13: Work experience documents
          advancedLearningApi.workExperience.getDocuments(),
          // 14: Work experience logbook
          advancedLearningApi.workExperience.getLogbook(),
          // 15: Work experience supervisor
          advancedLearningApi.workExperience.getSupervisorFeedback(),
        ]);

        const val = <T,>(index: number): T | null =>
          results[index].status === 'fulfilled' ? (results[index] as PromiseFulfilledResult<T>).value : null;

        // Hub
        const hubData = val<AdvancedLearningHubData>(0);

        // EduScrum
        const eduscrumTasks = val<{ tasks: EduScrumTask[] }>(1);
        const eduscrumSprint = val<{ sprint: EduScrumSprint | null }>(2);
        const eduscrumTeam = val<{ members: EduScrumTeamMember[] }>(3);
        const eduscrumAI = val<{ suggestions: EduScrumAISuggestion[] }>(4);
        const eduscrumRetro = val<{ retroItems: EduScrumRetroItems | null }>(5);

        // PBL
        const pblProjects = val<{ projects: PblProject[] }>(6);

        // Industry
        const industryOpps = val<{ opportunities: IndustryOpportunity[] }>(7);
        const industryApps = val<{ applications: IndustryApplication[] }>(8);
        const industryPlacement = val<{ placement: IndustryPlacement | null }>(9);
        const industryPartners = val<{ partners: IndustryPartner[] }>(10);

        // Work Experience
        const weOpps = val<{ opportunities: WorkOpportunity[] }>(11);
        const weApps = val<{ applications: WorkApplication[] }>(12);
        const weDocs = val<{ documents: WorkDocument[] }>(13);
        const weLog = val<{ entries: WorkLogbookEntry[] }>(14);
        const weSupervisor = val<{ feedback: WorkSupervisorFeedback[]; supervisor: WorkSupervisor | null }>(15);

        setData({
          hub: hubData,
          eduscrum: {
            tasks: eduscrumTasks?.tasks ?? [],
            sprint: eduscrumSprint?.sprint ?? null,
            burndown: [],
            teamMembers: eduscrumTeam?.members ?? [],
            aiSuggestions: eduscrumAI?.suggestions ?? [],
            retroItems: eduscrumRetro?.retroItems ?? null,
            standupPrompts: [],
          },
          pbl: {
            project: pblProjects?.projects?.[0] ?? null,
            phases: [],
            teamMembers: [],
            milestones: [],
            artifacts: [],
            exhibition: null,
            assessmentRubric: null,
          },
          industry: {
            opportunities: industryOpps?.opportunities ?? [],
            applications: industryApps?.applications ?? [],
            activePlacement: industryPlacement?.placement ?? null,
            partnerCompanies: industryPartners?.partners ?? [],
          },
          workExperience: {
            opportunities: weOpps?.opportunities ?? [],
            applications: weApps?.applications ?? [],
            documents: weDocs?.documents ?? [],
            logbook: weLog?.entries ?? [],
            supervisorFeedback: weSupervisor?.feedback ?? [],
            supervisorDetails: weSupervisor?.supervisor ?? null,
          },
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load advanced learning data');
      } finally {
        setIsLoading(false);
      }
    }

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

    const projects = results[0].status === 'fulfilled' ? (results[0].value as { projects: any[] }).projects : [];

    setPbl({ project: projects[0] ?? null, phases: [], teamMembers: [], milestones: [], artifacts: [], exhibition: null, assessmentRubric: null });
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

    setIndustry({
      opportunities: results[0].status === 'fulfilled' ? (results[0].value as { opportunities: any[] }).opportunities : [],
      applications: results[1].status === 'fulfilled' ? (results[1].value as { applications: any[] }).applications : [],
      activePlacement: results[2].status === 'fulfilled' ? (results[2].value as { placement: any }).placement : null,
      partnerCompanies: results[3].status === 'fulfilled' ? (results[3].value as { partners: any[] }).partners : [],
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { industry, isLoading, error, refetch: fetchData };
}

// =============================================================================
// useWorkExperience
// =============================================================================

export function useWorkExperience() {
  const [workExperience, setWorkExperience] = useState<WorkExperienceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

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

    const supervisor = results[4].status === 'fulfilled' ? (results[4].value as { feedback: any[]; supervisor: any }) : null;

    setWorkExperience({
      opportunities: results[0].status === 'fulfilled' ? (results[0].value as { opportunities: any[] }).opportunities : [],
      applications: results[1].status === 'fulfilled' ? (results[1].value as { applications: any[] }).applications : [],
      documents: results[2].status === 'fulfilled' ? (results[2].value as { documents: any[] }).documents : [],
      logbook: results[3].status === 'fulfilled' ? (results[3].value as { entries: any[] }).entries : [],
      supervisorFeedback: supervisor?.feedback ?? [],
      supervisorDetails: supervisor?.supervisor ?? null,
    });
    setIsLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { workExperience, isLoading, error, refetch: fetchData };
}

/* eslint-enable @typescript-eslint/no-explicit-any */
