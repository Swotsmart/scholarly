/**
 * Advanced Learning API Client
 *
 * Namespaced client for the advanced-learning backend routes.
 * Covers: PBL, Industry Experience, PD Hub.
 *
 * API mount: /api/v1/advanced-learning (see packages/api/src/index.ts)
 *
 * Implemented backend routes (all return { success: true, data: {...} } envelopes):
 *   GET  /advanced-learning/pbl/projects
 *   GET  /advanced-learning/industry-experience/opportunities
 *   GET  /advanced-learning/pd-hub/courses
 *   POST /advanced-learning/pd-hub/courses/:id/enroll
 *
 * Sections without backend routes yet (hub, eduscrum, work-experience) have
 * no client methods; their page hooks return null so pages fall back to their
 * own FALLBACK_* constants.
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
// BASE REQUEST HELPERS
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

/** Unwraps the { success, data } envelope used by all advanced-learning routes. */
async function requestData<T>(method: string, path: string, body?: unknown): Promise<T> {
  const envelope = await request<{ success: boolean; data: T }>(method, path, body);
  return envelope.data;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// =============================================================================
// SHARED TYPES
// =============================================================================

// -- Hub (no backend endpoint; type kept for page contract) -------------------

export interface AdvancedLearningHubData {
  stats: { activeSessions: number; completedReviews: number; industryPlacements: number; pdCoursesEnrolled: number } | null;
  recentActivity: Array<{ action: string; module: string; time: string }>;
}

// -- EduScrum (no backend endpoints; types kept for page contract) ------------

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
  color?: string;
  icon?: React.ComponentType<{ className?: string }>;
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

// -- PBL (GET /pbl/projects is implemented) -----------------------------------

export interface PblProject {
  id: string;
  title: string;
  drivingQuestion: string;
  /** Backend PBLProject required fields */
  description: string;
  subjectAreas: string[];
  gradeLevel: string[];
  estimatedDuration: { value: number; unit: 'days' | 'weeks' | 'months' };
  status: 'draft' | 'published' | 'archived';
  /** Optional UI projection fields derived from backend data */
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

export interface PblData {
  project: PblProject | null;
  phases: PblPhase[];
  teamMembers: PblTeamMember[];
  milestones: PblMilestone[];
  artifacts: PblArtifact[];
  exhibition: PblExhibition | null;
  assessmentRubric: PblAssessmentRubric | null;
}

// -- Industry Experience (GET /industry-experience/opportunities implemented) -

export interface IndustryOpportunity {
  id: string;
  description: string;
  status?: string;
  applicationDeadline?: string;
  // API shape (structured)
  partnerId?: string;
  partnerName?: string;
  title?: string;
  experienceType?: string;
  skillsRequired?: string[];
  qualificationsRequired?: string[];
  gradeLevel?: string[];
  duration?: string | { value: number; unit: string };
  schedule?: { type: string; hoursPerWeek?: number };
  location?: string | { city: string; state: string; country: string; address?: string; isRemoteAvailable: boolean };
  isRemote?: boolean;
  compensation?: { type: string; amount?: number; currency?: string; creditValue?: number };
  totalPositions?: number;
  filledPositions?: number;
  learningOutcomes?: string[];
  // Fallback/display shape (flat)
  company?: string;
  role?: string;
  sector?: string;
  educationLevel?: string;
  skills?: string[];
  companyLogo?: string;
  salary?: string;
  spots?: number;
  applicants?: number;
}

export interface IndustryApplication {
  id: string;
  status: string;
  // API shape
  opportunityId?: string;
  applicantId?: string;
  applicantType?: string;
  applicantName?: string;
  submittedAt?: string;
  // Fallback/display shape
  company?: string;
  role?: string;
  appliedDate?: string;
  nextStep?: string;
}

export interface IndustryPlacement {
  id: string;
  role: string;
  startDate: string;
  endDate?: string;
  status?: string;
  // API shape
  partnerId?: string;
  partnerName?: string;
  // Fallback/display shape
  company?: string;
  supervisor?: string;
  supervisorRole?: string;
  hoursLogged?: number;
  totalHours?: number;
  location?: string;
  learningObjectives?: Array<{ name: string; progress: number; status: string }>;
  weeklyReflections?: number;
  supervisorRating?: number;
}

export interface IndustryPartner {
  id: string;
  name: string;
  industry: string;
  sector: string;
}

export interface IndustryData {
  opportunities: IndustryOpportunity[];
  applications: IndustryApplication[];
  activePlacement: IndustryPlacement | null;
  partnerCompanies: IndustryPartner[];
}

// -- Work Experience (no backend endpoints; types kept for page contract) -----

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

export interface WorkExperienceData {
  opportunities: WorkOpportunity[];
  applications: WorkApplication[];
  documents: WorkDocument[];
  logbook: WorkLogbookEntry[];
  supervisorFeedback: WorkSupervisorFeedback[];
  supervisorDetails: WorkSupervisor | null;
}

// -- PD Hub (GET /pd-hub/courses and POST enroll implemented) -----------------

export interface PdCourse {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  category: string;
  /** Backend fields from PDCourse */
  topics: string[];
  estimatedHours: number;
  experienceLevel?: string;
  format?: string;
  status?: string;
  enrollmentCount?: number;
  averageRating?: number;
  /** Legacy/UI view-model fields; kept optional for backward compatibility */
  topic?: string;
  duration?: string;
}

export interface PdEnrollment {
  id: string;
  educatorId: string;
  educatorName: string;
  courseId: string;
  courseName: string;
  status: string;
  overallProgress: number;
  enrolledAt: string;
}

// =============================================================================
// NAMESPACED API CLIENT
// =============================================================================

export const advancedLearningApi = {

  // -- PBL (Project-Based Learning) -------------------------------------------
  // GET /pbl/projects → { success: true, data: { projects: PBLProject[] } }
  pbl: {
    async getProjects(params?: { subjectArea?: string; gradeLevel?: string }): Promise<{ projects: PblProject[] }> {
      if (DEMO_MODE) return { projects: [] };
      return requestData('GET', `/advanced-learning/pbl/projects${qs({ subjectArea: params?.subjectArea, gradeLevel: params?.gradeLevel })}`);
    },
  },

  // -- Industry Experience ----------------------------------------------------
  // GET /industry-experience/opportunities → { success: true, data: { opportunities: IndustryOpportunity[] } }
  industry: {
    async getOpportunities(params?: { experienceType?: string; industry?: string }): Promise<{ opportunities: IndustryOpportunity[] }> {
      if (DEMO_MODE) return { opportunities: [] };
      return requestData('GET', `/advanced-learning/industry-experience/opportunities${qs({ experienceType: params?.experienceType, industry: params?.industry })}`);
    },
  },

  // -- PD Hub -----------------------------------------------------------------
  // GET  /pd-hub/courses            → { success: true, data: { courses: PDCourse[] } }
  // POST /pd-hub/courses/:id/enroll → { success: true, data: { enrollment: PDEnrollment } }
  pdHub: {
    async getCourses(params?: { category?: string; topic?: string }): Promise<{ courses: PdCourse[] }> {
      if (DEMO_MODE) return { courses: [] };
      return requestData('GET', `/advanced-learning/pd-hub/courses${qs({ category: params?.category, topic: params?.topic })}`);
    },
    async enroll(courseId: string, educatorName: string): Promise<{ enrollment: PdEnrollment | null }> {
      if (DEMO_MODE) return { enrollment: null };
      return requestData('POST', `/advanced-learning/pd-hub/courses/${courseId}/enroll`, { educatorName });
    },
  },
};
