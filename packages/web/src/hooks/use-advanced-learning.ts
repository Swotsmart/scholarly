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
  type EduscrumTask,
  type EduscrumSprint,
  type EduscrumTeamMember,
  type EduscrumRetroItem,
  type PblData,
  type PblProject,
  type IndustryData,
  type IndustryOpportunity,
  type IndustryApplication,
  type IndustryPlacement,
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
    fetchData();
  }, [fetchData]);

  return { eduscrum, isLoading, error, refetch: fetchData };
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
