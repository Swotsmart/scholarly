import type React from 'react';

/**
 * Advanced Learning API Client
 *
 * Namespaced client for the advanced-learning backend routes.
 * Covers: EduScrum, PBL, Industry Experience, Work Experience, PD Hub.
 *
 * API mount: /api/v1/advanced-learning (see packages/api/src/index.ts)
 *
 * Includes DEMO_MODE fallback: when enabled, methods return empty/default
 * responses so the UI renders with fallback data from the pages themselves.
 */

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const NORMALIZED_API_BASE = API_BASE.replace(/\/+$/, '');
// NEXT_PUBLIC_API_URL may already include /api/v1 (production) or not (local dev)
const V1 = NORMALIZED_API_BASE.endsWith('/api/v1') ? NORMALIZED_API_BASE : `${NORMALIZED_API_BASE}/api/v1`;

// =============================================================================
// BASE REQUEST HELPER
// =============================================================================

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${V1}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).message || `${method} ${path} failed (${response.status})`);
  }
  return response.json();
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// =============================================================================
// SHARED TYPES (lightweight — pages own their own display types)
// =============================================================================

export interface AdvancedLearningHubData {
  stats: { activeSessions: number; completedReviews: number; industryPlacements: number; pdCoursesEnrolled: number } | null;
  recentActivity: Array<{ action: string; module: string; time: string }>;
}

// EduScrum types
export interface EduScrumTask { id: string; title: string; status: string; priority?: string; points?: number; assigneeId?: string }
export interface Sprint { id: string; name: string; goal?: string; startDate?: string; endDate?: string; velocity?: number }
export interface BurndownPoint { day: string | number; planned: number; actual: number }
export interface TeamMember { id: string; name: string; role?: string; avatar?: string }
export interface AiSuggestion { id: string; text: string; type?: string; priority?: string }
export interface RetroItems { wentWell: Array<{ id: string; text: string }>; improve: Array<{ id: string; text: string }>; actions: Array<{ id: string; text: string }> }

export interface EduscrumData {
  tasks: EduScrumTask[];
  sprint: Sprint | null;
  burndown: BurndownPoint[];
  teamMembers: TeamMember[];
  aiSuggestions: AiSuggestion[];
  retroItems: RetroItems | null;
  standupPrompts: string[];
}

// PBL types
export interface PblProject { id: string; title: string; phase?: string; status?: string; subjectArea?: string; gradeLevel?: string }
export interface PblPhase { id: string; name: string; status?: string; order?: number }
export interface PblMilestone { id: string; title: string; dueDate?: string; status?: string }
export interface PblArtifact { id: string; name: string; type?: string; url?: string }
export interface Exhibition { id: string; date: string; title?: string; location?: string; description?: string }
export interface AssessmentRubric { id: string; title: string; criteria?: Array<{ name: string; weight?: number }> }

export interface PblData {
  project: PblProject | null;
  phases: PblPhase[];
  teamMembers: TeamMember[];
  milestones: PblMilestone[];
  artifacts: PblArtifact[];
  exhibition: Exhibition | null;
  assessmentRubric: AssessmentRubric | null;
}

// Industry Experience types
export interface IndustryOpportunity { id: string; title: string; company?: string; type?: string; industry?: string; duration?: string }
export interface IndustryApplication { id: string; opportunityId: string; status?: string; appliedDate?: string }
export interface IndustryPlacement { id: string; company: string; startDate?: string; endDate?: string; supervisor?: string }
export interface PartnerCompany { id: string; name: string; industry?: string; logo?: string; website?: string }

export interface IndustryData {
  opportunities: IndustryOpportunity[];
  applications: IndustryApplication[];
  activePlacement: IndustryPlacement | null;
  partnerCompanies: PartnerCompany[];
}

// Work Experience types
export interface WorkOpportunity { id: string; title: string; company?: string; duration?: string; location?: string }
export interface WorkApplication { id: string; opportunityId: string; status?: string; appliedDate?: string }
export interface WorkDocument { id: string; name: string; type?: string; url?: string; uploadedDate?: string }
export interface LogbookEntry { id: string; date: string; summary?: string; hours?: number; tasks?: string[] }
export interface SupervisorFeedback { id: string; date: string; comments?: string; rating?: number }
export interface SupervisorDetails { id: string; name: string; role?: string; email?: string; company?: string }

export interface WorkExperienceData {
  opportunities: WorkOpportunity[];
  applications: WorkApplication[];
  documents: WorkDocument[];
  logbook: LogbookEntry[];
  supervisorFeedback: SupervisorFeedback[];
  supervisorDetails: SupervisorDetails | null;
}

// =============================================================================
// NAMESPACED API CLIENT
// =============================================================================

export const advancedLearningApi = {

  // -- Hub overview -----------------------------------------------------------
  hub: {
    async getOverview(): Promise<AdvancedLearningHubData> {
      if (DEMO_MODE) return { stats: null, recentActivity: [] };
      return request('GET', '/advanced-learning/overview');
    },
  },

  // -- EduScrum ---------------------------------------------------------------
  eduscrum: {
    async getTasks(): Promise<{ tasks: EduScrumTask[] }> {
      if (DEMO_MODE) return { tasks: [] };
      return request('GET', '/advanced-learning/eduscrum/tasks');
    },
    async getSprint(): Promise<{ sprint: Sprint | null }> {
      if (DEMO_MODE) return { sprint: null };
      return request('GET', '/advanced-learning/eduscrum/sprint');
    },
    async getTeam(): Promise<{ members: TeamMember[] }> {
      if (DEMO_MODE) return { members: [] };
      return request('GET', '/advanced-learning/eduscrum/team');
    },
    async getAISuggestions(): Promise<{ suggestions: AiSuggestion[] }> {
      if (DEMO_MODE) return { suggestions: [] };
      return request('GET', '/advanced-learning/eduscrum/ai-suggestions');
    },
    async getRetroItems(): Promise<{ retroItems: RetroItems | null }> {
      if (DEMO_MODE) return { retroItems: null };
      return request('GET', '/advanced-learning/eduscrum/retro');
    },
  },

  // -- PBL (Project-Based Learning) -------------------------------------------
  pbl: {
    async getProjects(params?: { subjectArea?: string; gradeLevel?: string }): Promise<{ projects: PblProject[] }> {
      if (DEMO_MODE) return { projects: [] };
      return request('GET', `/advanced-learning/pbl/projects${qs({ subjectArea: params?.subjectArea, gradeLevel: params?.gradeLevel })}`);
    },
    async getProject(id: string): Promise<{ project: PblProject | null }> {
      if (DEMO_MODE) return { project: null };
      return request('GET', `/advanced-learning/pbl/projects/${id}`);
    },
    async getTeam(projectId: string): Promise<{ members: TeamMember[] }> {
      if (DEMO_MODE) return { members: [] };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/team`);
    },
    async getMilestones(projectId: string): Promise<{ milestones: PblMilestone[] }> {
      if (DEMO_MODE) return { milestones: [] };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/milestones`);
    },
    async getArtifacts(projectId: string): Promise<{ artifacts: PblArtifact[] }> {
      if (DEMO_MODE) return { artifacts: [] };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/artifacts`);
    },
    async getExhibition(projectId: string): Promise<{ exhibition: Exhibition | null }> {
      if (DEMO_MODE) return { exhibition: null };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/exhibition`);
    },
  },

  // -- Industry Experience ----------------------------------------------------
  industry: {
    async getOpportunities(params?: { experienceType?: string; industry?: string }): Promise<{ opportunities: IndustryOpportunity[] }> {
      if (DEMO_MODE) return { opportunities: [] };
      return request('GET', `/advanced-learning/industry-experience/opportunities${qs({ experienceType: params?.experienceType, industry: params?.industry })}`);
    },
    async getApplications(): Promise<{ applications: IndustryApplication[] }> {
      if (DEMO_MODE) return { applications: [] };
      return request('GET', '/advanced-learning/industry-experience/applications');
    },
    async getActivePlacement(): Promise<{ placement: IndustryPlacement | null }> {
      if (DEMO_MODE) return { placement: null };
      return request('GET', '/advanced-learning/industry-experience/placement');
    },
    async getPartners(): Promise<{ partners: PartnerCompany[] }> {
      if (DEMO_MODE) return { partners: [] };
      return request('GET', '/advanced-learning/industry-experience/partners');
    },
  },

  // -- Work Experience --------------------------------------------------------
  workExperience: {
    async getOpportunities(params?: { search?: string }): Promise<{ opportunities: WorkOpportunity[] }> {
      if (DEMO_MODE) return { opportunities: [] };
      return request('GET', `/advanced-learning/work-experience/opportunities${qs({ search: params?.search })}`);
    },
    async getApplications(): Promise<{ applications: WorkApplication[] }> {
      if (DEMO_MODE) return { applications: [] };
      return request('GET', '/advanced-learning/work-experience/applications');
    },
    async getDocuments(): Promise<{ documents: WorkDocument[] }> {
      if (DEMO_MODE) return { documents: [] };
      return request('GET', '/advanced-learning/work-experience/documents');
    },
    async getLogbook(): Promise<{ entries: LogbookEntry[] }> {
      if (DEMO_MODE) return { entries: [] };
      return request('GET', '/advanced-learning/work-experience/logbook');
    },
    async getSupervisorFeedback(): Promise<{ feedback: SupervisorFeedback[]; supervisor: SupervisorDetails | null }> {
      if (DEMO_MODE) return { feedback: [], supervisor: null };
      return request('GET', '/advanced-learning/work-experience/supervisor');
    },
  },

  // -- PD Hub -----------------------------------------------------------------
  pdHub: {
    async getCourses(params?: { category?: string; topic?: string }): Promise<{ courses: Array<{ id: string; title: string; category?: string; topic?: string }> }> {
      if (DEMO_MODE) return { courses: [] };
      return request('GET', `/advanced-learning/pd-hub/courses${qs({ category: params?.category, topic: params?.topic })}`);
    },
    async enroll(courseId: string, educatorName: string): Promise<{ enrollment: { id: string; courseId: string; educatorName: string } | null }> {
      if (DEMO_MODE) return { enrollment: null };
      return request('POST', `/advanced-learning/pd-hub/courses/${courseId}/enroll`, { educatorName });
    },
  },
};
