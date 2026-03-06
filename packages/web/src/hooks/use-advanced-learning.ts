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

export interface AdvancedLearningData {
  hub: AdvancedLearningHubData | null;
  eduscrum: EduscrumData | null;
  pbl: PblData | null;
  industry: IndustryData | null;
  workExperience: WorkExperienceData | null;
}

export function useAdvancedLearning() {
  const [data, setData] = useState<AdvancedLearningData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

    fetchData();
  }, []);

  return { data, isLoading, error };
}
