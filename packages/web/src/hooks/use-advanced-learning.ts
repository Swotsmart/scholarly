/**
 * useAdvancedLearning Hook
 *
 * Fetches advanced learning data in parallel using Promise.allSettled.
 * Each page section gets its own data key; pages use fallback constants
 * when API data is unavailable.
 *
 * Follows the same pattern as use-teacher.ts.
 */

import { useEffect, useState } from 'react';
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
} from '@/lib/advanced-learning-api';

export type { AdvancedLearningHubData, EduscrumData, PblData, IndustryData, WorkExperienceData };

export type AdvancedLearningSection = 'hub' | 'eduscrum' | 'pbl' | 'industry' | 'workExperience';

export interface AdvancedLearningData {
  hub: AdvancedLearningHubData | null;
  eduscrum: EduscrumData | null;
  pbl: PblData | null;
  industry: IndustryData | null;
  workExperience: WorkExperienceData | null;
}

/**
 * @param sections — optional list of sections to fetch. Defaults to all.
 *   Pages should pass only what they need, e.g. `useAdvancedLearning(['eduscrum'])`
 */
export function useAdvancedLearning(sections?: AdvancedLearningSection[]) {
  const [data, setData] = useState<AdvancedLearningData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sectionKey = sections ? sections.sort().join(',') : 'all';

  useEffect(() => {
    const need = (s: AdvancedLearningSection) => !sections || sections.includes(s);

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        // Only fetch sections the caller requested
        const [hubRes, eduscrumRes, pblRes, industryRes, weRes] = await Promise.allSettled([
          need('hub') ? advancedLearningApi.hub.getOverview() : Promise.resolve(null),
          need('eduscrum') ? Promise.allSettled([
            advancedLearningApi.eduscrum.getTasks(),
            advancedLearningApi.eduscrum.getSprint(),
            advancedLearningApi.eduscrum.getTeam(),
            advancedLearningApi.eduscrum.getAISuggestions(),
            advancedLearningApi.eduscrum.getRetroItems(),
          ]) : Promise.resolve(null),
          need('pbl') ? advancedLearningApi.pbl.getProjects() : Promise.resolve(null),
          need('industry') ? Promise.allSettled([
            advancedLearningApi.industry.getOpportunities(),
            advancedLearningApi.industry.getApplications(),
            advancedLearningApi.industry.getActivePlacement(),
            advancedLearningApi.industry.getPartners(),
          ]) : Promise.resolve(null),
          need('workExperience') ? Promise.allSettled([
            advancedLearningApi.workExperience.getOpportunities(),
            advancedLearningApi.workExperience.getApplications(),
            advancedLearningApi.workExperience.getDocuments(),
            advancedLearningApi.workExperience.getLogbook(),
            advancedLearningApi.workExperience.getSupervisorFeedback(),
          ]) : Promise.resolve(null),
        ]);

        const val = <T,>(r: PromiseSettledResult<T>): T | null =>
          r.status === 'fulfilled' ? r.value : null;

        // Hub
        const hubData = val(hubRes) as AdvancedLearningHubData | null;

        // EduScrum
        let eduscrum: EduscrumData | null = null;
        const esRaw = val(eduscrumRes) as PromiseSettledResult<unknown>[] | null;
        if (esRaw) {
          const v = <T,>(i: number): T | null => esRaw[i]?.status === 'fulfilled' ? (esRaw[i] as PromiseFulfilledResult<T>).value : null;
          eduscrum = {
            tasks: (v<{ tasks: EduscrumTask[] }>(0))?.tasks ?? [],
            sprint: (v<{ sprint: EduscrumSprint }>(1))?.sprint ?? null,
            burndown: [],
            teamMembers: (v<{ members: EduscrumTeamMember[] }>(2))?.members ?? [],
            aiSuggestions: (v<{ suggestions: Array<{ id: string; suggestion: string; type: string; priority?: string }> }>(3))?.suggestions ?? [],
            retroItems: (v<{ retroItems: { wentWell: EduscrumRetroItem[]; improve: EduscrumRetroItem[]; actions: EduscrumRetroItem[] } }>(4))?.retroItems ?? null,
            standupPrompts: [],
          };
        }

        // PBL
        let pbl: PblData | null = null;
        const pblRaw = val(pblRes) as { projects: PblProject[] } | null;
        if (pblRaw) {
          pbl = {
            project: pblRaw.projects?.[0] ?? null,
            phases: [], teamMembers: [], milestones: [], artifacts: [],
            exhibition: null, assessmentRubric: null,
          };
        }

        // Industry
        let industry: IndustryData | null = null;
        const indRaw = val(industryRes) as PromiseSettledResult<unknown>[] | null;
        if (indRaw) {
          const v = <T,>(i: number): T | null => indRaw[i]?.status === 'fulfilled' ? (indRaw[i] as PromiseFulfilledResult<T>).value : null;
          industry = {
            opportunities: (v<{ opportunities: IndustryOpportunity[] }>(0))?.opportunities ?? [],
            applications: (v<{ applications: IndustryApplication[] }>(1))?.applications ?? [],
            activePlacement: (v<{ placement: IndustryPlacement }>(2))?.placement ?? null,
            partnerCompanies: (v<{ partners: Array<{ name: string; sector: string }> }>(3))?.partners ?? [],
          };
        }

        // Work Experience
        let workExperience: WorkExperienceData | null = null;
        const weRaw = val(weRes) as PromiseSettledResult<unknown>[] | null;
        if (weRaw) {
          const v = <T,>(i: number): T | null => weRaw[i]?.status === 'fulfilled' ? (weRaw[i] as PromiseFulfilledResult<T>).value : null;
          workExperience = {
            opportunities: (v<{ opportunities: IndustryOpportunity[] }>(0))?.opportunities ?? [],
            applications: (v<{ applications: IndustryApplication[] }>(1))?.applications ?? [],
            documents: (v<{ documents: WorkExperienceData['documents'] }>(2))?.documents ?? [],
            logbook: (v<{ entries: WorkExperienceData['logbook'] }>(3))?.entries ?? [],
            supervisorFeedback: (v<{ feedback: WorkExperienceData['supervisorFeedback'] }>(4))?.feedback ?? [],
            supervisorDetails: null,
          };
        }

        setData({ hub: hubData, eduscrum, pbl, industry, workExperience });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load advanced learning data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionKey]);

  return { data, isLoading, error };
}
