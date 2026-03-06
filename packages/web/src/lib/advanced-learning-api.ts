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

// -- EduScrum -----------------------------------------------------------------

export interface EduScrumTask {
  id: string;
  title: string;
  description: string;
  estimate: number;
  assignee: string;
  status: string;
  labels: string[];
  dueDate: string;
}

export interface EduScrumSprint {
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  totalPoints: number;
  completedPoints: number;
  daysRemaining: number;
  velocity: number;
  teamSize: number;
}

export interface EduScrumBurndownPoint {
  day: string;
  ideal: number;
  actual: number;
}

export interface EduScrumTeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  tasksCompleted: number;
  pointsCompleted: number;
}

export interface EduScrumAISuggestion {
  type: string;
  title: string;
  message: string;
  color: string;
}

export interface EduScrumRetroItem {
  id: string;
  text: string;
  votes: number;
}

export interface EduScrumRetroAction {
  id: string;
  text: string;
  owner: string;
  status: string;
}

export interface EduScrumRetroItems {
  wentWell: EduScrumRetroItem[];
  improve: EduScrumRetroItem[];
  actions: EduScrumRetroAction[];
}

export interface EduScrumStandupPrompt {
  id: string;
  question: string;
}

export interface EduscrumData {
  tasks: EduScrumTask[];
  sprint: EduScrumSprint | null;
  burndown: EduScrumBurndownPoint[];
  teamMembers: EduScrumTeamMember[];
  aiSuggestions: EduScrumAISuggestion[];
  retroItems: EduScrumRetroItems | null;
  standupPrompts: EduScrumStandupPrompt[];
}

// -- PBL ----------------------------------------------------------------------

export interface PblProject {
  id: string;
  title: string;
  drivingQuestion: string;
  /**
   * Backend PBLProject fields
   */
  description: string;
  subjectAreas: string[];
  gradeLevel: string[];
  estimatedDuration: {
    value: number;
    unit: string;
  };
  /**
   * Optional UI projection fields derived from backend data
   */
  subject?: string;
  currentPhase?: string;
  milestoneProgress?: number;
  startDate?: string;
  endDate?: string;
  daysRemaining?: number;
  teacher?: string;
}

export interface PblPhase {
  id: string;
  label: string;
  color: string;
  description: string;
}

export interface PblTeamMember {
  id: string;
  name: string;
  role: string;
  avatar: string;
  tasksCompleted: number;
  totalTasks: number;
  lastActive: string;
}

export interface PblMilestone {
  id: string;
  title: string;
  dueDate: string;
  status: string;
}

export interface PblArtifact {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
}

export interface PblExhibition {
  id: string;
  date: string;
  location: string;
  status: string;
}

export interface PblAssessmentCriterion {
  name: string;
  description: string;
  maxScore: number;
}

export interface PblAssessmentRubric {
  id: string;
  criteria: PblAssessmentCriterion[];
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
  teamMembers: PblTeamMember[];
  milestones: PblMilestone[];
  artifacts: PblArtifact[];
  exhibition: PblExhibition | null;
  assessmentRubric: PblAssessmentRubric | null;
}

// -- Industry Experience ------------------------------------------------------

export interface IndustryOpportunity {
  id: string;
  company: string;
  role: string;
  sector: string;
  location: string;
  duration: string;
  educationLevel: string;
  skills: string[];
  applicationDeadline: string;
  description: string;
}

export interface IndustryApplication {
  id: string;
  company: string;
  role: string;
  appliedDate: string;
  status: string;
}

export interface IndustryPlacement {
  id: string;
  company: string;
  role: string;
  supervisor: string;
  startDate: string;
  endDate: string;
  hoursLogged: number;
  totalHours: number;
}

export interface IndustryPartner {
  name: string;
  sector: string;
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
  partnerCompanies: IndustryPartner[];
}

// -- Work Experience ----------------------------------------------------------

export interface WorkOpportunity {
  id: string;
  company: string;
  role: string;
  sector: string;
  location: string;
  duration: string;
  educationLevel: string;
  skills: string[];
  applicationDeadline: string;
  description: string;
}

export interface WorkApplication {
  id: string;
  company: string;
  role: string;
  appliedDate: string;
  status: string;
}

export interface WorkDocument {
  id: string;
  name: string;
  type: string;
  uploadedDate: string;
  size: string;
  status: string;
}

export interface WorkLogbookEntry {
  id: string;
  date: string;
  hours: number;
  activities: string;
  skills: string[];
  supervisorSigned: boolean;
  reflection: string;
}

export interface WorkSupervisorFeedback {
  id: string;
  date: string;
  supervisor: string;
  rating: number;
  strengths: string;
  areas: string;
}

export interface WorkSupervisor {
  id: string;
  name: string;
  role: string;
  company: string;
  email: string;
  phone?: string;
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
  logbook: WorkLogbookEntry[];
  supervisorFeedback: WorkSupervisorFeedback[];
  supervisorDetails: WorkSupervisor | null;
}

// -- PD Hub -------------------------------------------------------------------

export interface PdCourse {
  id: string;
  title: string;
  category: string;
  /**
   * Backend fields from PDCourse
   */
  topics?: string[];
  estimatedHours?: number;
  /**
   * Legacy/UI view-model fields; kept optional for backward compatibility.
   */
  topic?: string;
  duration?: string;
  description: string;
}

export interface PdEnrollment {
  id: string;
  courseId: string;
  educatorName: string;
  enrolledAt: string;
  status: string;
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
    async getSprint(): Promise<{ sprint: EduScrumSprint | null }> {
      if (DEMO_MODE) return { sprint: null };
      return request('GET', '/advanced-learning/eduscrum/sprint');
    },
    async getTeam(): Promise<{ members: EduScrumTeamMember[] }> {
      if (DEMO_MODE) return { members: [] };
      return request('GET', '/advanced-learning/eduscrum/team');
    },
    async getAISuggestions(): Promise<{ suggestions: EduScrumAISuggestion[] }> {
      if (DEMO_MODE) return { suggestions: [] };
      return request('GET', '/advanced-learning/eduscrum/ai-suggestions');
    },
    async getRetroItems(): Promise<{ retroItems: EduScrumRetroItems | null }> {
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
    async getTeam(projectId: string): Promise<{ members: PblTeamMember[] }> {
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
    async getExhibition(projectId: string): Promise<{ exhibition: PblExhibition | null }> {
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
    async getPartners(): Promise<{ partners: IndustryPartner[] }> {
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
    async getLogbook(): Promise<{ entries: WorkLogbookEntry[] }> {
      if (DEMO_MODE) return { entries: [] };
      return request('GET', '/advanced-learning/work-experience/logbook');
    },
    async getSupervisorFeedback(): Promise<{ feedback: WorkSupervisorFeedback[]; supervisor: WorkSupervisor | null }> {
      if (DEMO_MODE) return { feedback: [], supervisor: null };
      return request('GET', '/advanced-learning/work-experience/supervisor');
    },
  },

  // -- PD Hub -----------------------------------------------------------------
  pdHub: {
    async getCourses(params?: { category?: string; topic?: string }): Promise<{ courses: PdCourse[] }> {
      if (DEMO_MODE) return { courses: [] };
      return request('GET', `/advanced-learning/pd-hub/courses${qs({ category: params?.category, topic: params?.topic })}`);
    },
    async enroll(courseId: string, educatorName: string): Promise<{ enrollment: PdEnrollment | null }> {
      if (DEMO_MODE) return { enrollment: null };
      return request('POST', `/advanced-learning/pd-hub/courses/${courseId}/enroll`, { educatorName });
    },
  },
};
