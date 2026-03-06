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

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AdvancedLearningHubData {
  stats: { activeSessions: number; completedReviews: number; industryPlacements: number; pdCoursesEnrolled: number } | null;
  recentActivity: Array<{ action: string; module: string; time: string }>;
}

export interface EduscrumData {
  tasks: any[];
  sprint: any | null;
  burndown: any[];
  teamMembers: any[];
  aiSuggestions: any[];
  retroItems: { wentWell: any[]; improve: any[]; actions: any[] } | null;
  standupPrompts: any[];
}

export interface PblData {
  project: any | null;
  phases: any[];
  teamMembers: any[];
  milestones: any[];
  artifacts: any[];
  exhibition: any | null;
  assessmentRubric: any | null;
}

export interface IndustryData {
  opportunities: any[];
  applications: any[];
  activePlacement: any | null;
  partnerCompanies: any[];
}

export interface WorkExperienceData {
  opportunities: any[];
  applications: any[];
  documents: any[];
  logbook: any[];
  supervisorFeedback: any[];
  supervisorDetails: any | null;
}

/* eslint-enable @typescript-eslint/no-explicit-any */

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
    async getTasks(): Promise<{ tasks: any[] }> {
      if (DEMO_MODE) return { tasks: [] };
      return request('GET', '/advanced-learning/eduscrum/tasks');
    },
    async getSprint(): Promise<{ sprint: any }> {
      if (DEMO_MODE) return { sprint: null };
      return request('GET', '/advanced-learning/eduscrum/sprint');
    },
    async getTeam(): Promise<{ members: any[] }> {
      if (DEMO_MODE) return { members: [] };
      return request('GET', '/advanced-learning/eduscrum/team');
    },
    async getAISuggestions(): Promise<{ suggestions: any[] }> {
      if (DEMO_MODE) return { suggestions: [] };
      return request('GET', '/advanced-learning/eduscrum/ai-suggestions');
    },
    async getRetroItems(): Promise<{ retroItems: any }> {
      if (DEMO_MODE) return { retroItems: null };
      return request('GET', '/advanced-learning/eduscrum/retro');
    },
  },

  // -- PBL (Project-Based Learning) -------------------------------------------
  pbl: {
    async getProjects(params?: { subjectArea?: string; gradeLevel?: string }): Promise<{ projects: any[] }> {
      if (DEMO_MODE) return { projects: [] };
      return request('GET', `/advanced-learning/pbl/projects${qs({ subjectArea: params?.subjectArea, gradeLevel: params?.gradeLevel })}`);
    },
    async getProject(id: string): Promise<{ project: any }> {
      if (DEMO_MODE) return { project: null };
      return request('GET', `/advanced-learning/pbl/projects/${id}`);
    },
    async getTeam(projectId: string): Promise<{ members: any[] }> {
      if (DEMO_MODE) return { members: [] };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/team`);
    },
    async getMilestones(projectId: string): Promise<{ milestones: any[] }> {
      if (DEMO_MODE) return { milestones: [] };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/milestones`);
    },
    async getArtifacts(projectId: string): Promise<{ artifacts: any[] }> {
      if (DEMO_MODE) return { artifacts: [] };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/artifacts`);
    },
    async getExhibition(projectId: string): Promise<{ exhibition: any }> {
      if (DEMO_MODE) return { exhibition: null };
      return request('GET', `/advanced-learning/pbl/projects/${projectId}/exhibition`);
    },
  },

  // -- Industry Experience ----------------------------------------------------
  industry: {
    async getOpportunities(params?: { experienceType?: string; industry?: string }): Promise<{ opportunities: any[] }> {
      if (DEMO_MODE) return { opportunities: [] };
      return request('GET', `/advanced-learning/industry-experience/opportunities${qs({ experienceType: params?.experienceType, industry: params?.industry })}`);
    },
    async getApplications(): Promise<{ applications: any[] }> {
      if (DEMO_MODE) return { applications: [] };
      return request('GET', '/advanced-learning/industry-experience/applications');
    },
    async getActivePlacement(): Promise<{ placement: any }> {
      if (DEMO_MODE) return { placement: null };
      return request('GET', '/advanced-learning/industry-experience/placement');
    },
    async getPartners(): Promise<{ partners: any[] }> {
      if (DEMO_MODE) return { partners: [] };
      return request('GET', '/advanced-learning/industry-experience/partners');
    },
  },

  // -- Work Experience --------------------------------------------------------
  workExperience: {
    async getOpportunities(params?: { search?: string }): Promise<{ opportunities: any[] }> {
      if (DEMO_MODE) return { opportunities: [] };
      return request('GET', `/advanced-learning/work-experience/opportunities${qs({ search: params?.search })}`);
    },
    async getApplications(): Promise<{ applications: any[] }> {
      if (DEMO_MODE) return { applications: [] };
      return request('GET', '/advanced-learning/work-experience/applications');
    },
    async getDocuments(): Promise<{ documents: any[] }> {
      if (DEMO_MODE) return { documents: [] };
      return request('GET', '/advanced-learning/work-experience/documents');
    },
    async getLogbook(): Promise<{ entries: any[] }> {
      if (DEMO_MODE) return { entries: [] };
      return request('GET', '/advanced-learning/work-experience/logbook');
    },
    async getSupervisorFeedback(): Promise<{ feedback: any[]; supervisor: any }> {
      if (DEMO_MODE) return { feedback: [], supervisor: null };
      return request('GET', '/advanced-learning/work-experience/supervisor');
    },
  },

  // -- PD Hub -----------------------------------------------------------------
  pdHub: {
    async getCourses(params?: { category?: string; topic?: string }): Promise<{ courses: any[] }> {
      if (DEMO_MODE) return { courses: [] };
      return request('GET', `/advanced-learning/pd-hub/courses${qs({ category: params?.category, topic: params?.topic })}`);
    },
    async enroll(courseId: string, educatorName: string): Promise<{ enrollment: any }> {
      if (DEMO_MODE) return { enrollment: null };
      return request('POST', `/advanced-learning/pd-hub/courses/${courseId}/enroll`, { educatorName });
    },
  },
};
