/**
 * Teacher Module API Client — Production
 *
 * Namespaced client covering 11 backend route files, ~55 endpoints.
 * Follows existing ApiClient pattern: class-based, credentials: 'include'.
 *
 * All methods call real backend endpoints mounted in packages/api/src/index.ts.
 * No DEMO_MODE, no fallback data, no mocks.
 *
 * Route mount paths (from index.ts):
 *   /api/v1/dashboard     → dashboard.ts (4 endpoints)
 *   /api/v1/sessions      → sessions.ts (5 endpoints)
 *   /api/v1/curriculum     → curriculum.ts (6 endpoints)
 *   /api/v1/analytics      → analytics.ts (teacher-specific, 5+ endpoints)
 *   /api/v1/relief         → relief.ts (9 endpoints)
 *   /api/v1/content        → content.ts (7 endpoints)
 *   /api/v1/ml             → ml-pipeline.ts (10+ endpoints)
 *   /api/v1/collaboration  → collaboration.ts (10 endpoints)
 *   /api/v1/standards      → standards-compliance.ts (8 endpoints)
 *   /api/v1/ai-engine      → ai-engine.ts (15+ endpoints)
 *   /api/v1/ai-buddy       → ai-buddy.ts (7 endpoints)
 */

import type {
  TeacherDashboardSummary, ActivityFeedResponse, NotificationsResponse, QuickStats,
  Session, SessionListResponse, SessionFeedback,
  CurriculumStandard, CurriculumStructure, LessonPlan, LessonPlanListResponse, GenerateLessonInput, AlignmentResult,
  TeacherAnalyticsDashboard, AnalyticsReportListResponse, AnalyticsReport, DashboardFilters,
  ReliefTeacherListResponse, AbsenceListResponse, CreateAbsenceInput, TeacherAbsence, ReliefPool, ReliefPrediction,
  ContentItem, ContentListResponse, CreateContentInput, ContentReviewsResponse,
  MLModel, MLModelListResponse, StudentRiskPrediction, PerformancePrediction, TrainingJob,
  CollaborativeStory, CollaborativeLessonPlan, SharedResourcesResponse,
  ComplianceAuditResult, AITSLAssessment, CurriculumAlignmentResult,
  LearnerMasteryProfile, LearnerFeatureVector, LearnerRecommendations,
  AtRiskLearner, WellbeingCheck, LearnerPredictions,
  AIBuddySendResponse, AIBuddyConversation, AIInsight,
  Pagination,
} from '@/types/teacher';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const V1 = `${API_BASE}/api/v1`;

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
// NAMESPACED API CLIENT
// =============================================================================

export const teacherApi = {

  // ── Dashboard (4 endpoints) ── mount: /api/v1/dashboard ──
  dashboard: {
    async getSummary(): Promise<TeacherDashboardSummary> {
      return request('GET', '/dashboard/summary');
    },
    async getActivity(page = 1): Promise<ActivityFeedResponse> {
      return request('GET', `/dashboard/activity?page=${page}`);
    },
    async getNotifications(page = 1): Promise<NotificationsResponse> {
      // Backend returns `inAppStatus: 'read' | 'unread'` (Prisma field).
      // The teacher Notification type uses `read: boolean` — normalise here
      // so every consumer works correctly without knowing about the backend schema.
      const raw = await request<{ notifications: Array<Record<string, unknown>>; unreadCount: number; pagination: unknown }>('GET', `/dashboard/notifications?page=${page}`);
      return {
        ...raw,
        notifications: (raw.notifications ?? []).map((n) => ({
          ...n,
          read: n.inAppStatus === 'read' || n.read === true,
        })),
      } as unknown as NotificationsResponse;
    },
    async getQuickStats(): Promise<QuickStats> {
      return request('GET', '/dashboard/quick-stats');
    },
  },

  // ── Sessions (5 endpoints) ── mount: /api/v1/sessions ──
  sessions: {
    async list(params?: { status?: string; upcoming?: boolean; page?: number }): Promise<SessionListResponse> {
      return request('GET', `/sessions${qs({ status: params?.status, upcoming: params?.upcoming ? 'true' : undefined, page: params?.page })}`);
    },
    async get(id: string): Promise<{ session: Session }> {
      return request('GET', `/sessions/${id}`);
    },
    async start(id: string): Promise<{ session: Session }> {
      return request('POST', `/sessions/${id}/start`);
    },
    async complete(id: string): Promise<{ session: Session }> {
      return request('POST', `/sessions/${id}/complete`);
    },
    async submitFeedback(id: string, feedback: SessionFeedback): Promise<void> {
      return request('POST', `/sessions/${id}/feedback`, feedback);
    },
  },

  // ── Curriculum (6 endpoints) ── mount: /api/v1/curriculum ──
  curriculum: {
    async getStandards(params?: { subject?: string; yearLevel?: string }): Promise<{ standards: CurriculumStandard[] }> {
      return request('GET', `/curriculum/standards${qs({ subject: params?.subject, yearLevel: params?.yearLevel })}`);
    },
    async getStandard(idOrCode: string): Promise<{ standard: CurriculumStandard }> {
      return request('GET', `/curriculum/standards/${idOrCode}`);
    },
    async getStructure(): Promise<CurriculumStructure> {
      return request('GET', '/curriculum/structure');
    },
    async getLessonPlans(params?: { subject?: string; yearLevel?: string; page?: number }): Promise<LessonPlanListResponse> {
      return request('GET', `/curriculum/lesson-plans${qs({ subject: params?.subject, yearLevel: params?.yearLevel, page: params?.page })}`);
    },
    async generateLessonPlan(input: GenerateLessonInput): Promise<{ lessonPlan: LessonPlan }> {
      return request('POST', '/curriculum/lesson-plans/generate', input);
    },
    async alignContent(contentId: string, curriculumCodes: string[]): Promise<AlignmentResult> {
      return request('POST', '/curriculum/align', { contentId, curriculumCodes });
    },
  },

  // ── Analytics (5+ endpoints) ── mount: /api/v1/analytics ──
  analytics: {
    async getTeacherDashboard(filters?: DashboardFilters): Promise<TeacherAnalyticsDashboard> {
      return request('GET', `/analytics/teacher/dashboard${qs({ dateRange: filters?.dateRange, classId: filters?.classId, subject: filters?.subject })}`);
    },
    async getReports(page = 1): Promise<AnalyticsReportListResponse> {
      return request('GET', `/analytics/reports?page=${page}`);
    },
    async createReport(params: { title: string; type: string; filters: DashboardFilters }): Promise<{ report: AnalyticsReport }> {
      return request('POST', '/analytics/reports', params);
    },
    async generateReport(reportId: string): Promise<{ report: AnalyticsReport }> {
      return request('POST', `/analytics/reports/${reportId}/generate`);
    },
  },

  // ── Scheduling / Relief (9 endpoints) ── mount: /api/v1/relief ──
  scheduling: {
    async getReliefTeachers(params?: { subject?: string; yearLevel?: string; page?: number }): Promise<ReliefTeacherListResponse> {
      return request('GET', `/relief/teachers${qs({ subject: params?.subject, yearLevel: params?.yearLevel, page: params?.page })}`);
    },
    async getReliefTeacher(id: string): Promise<{ teacher: unknown }> {
      return request('GET', `/relief/teachers/${id}`);
    },
    async getAbsences(params?: { schoolId?: string; status?: string; page?: number }): Promise<AbsenceListResponse> {
      return request('GET', `/relief/absences${qs({ schoolId: params?.schoolId, status: params?.status, page: params?.page })}`);
    },
    async createAbsence(input: CreateAbsenceInput): Promise<{ absence: TeacherAbsence }> {
      return request('POST', '/relief/absences', input);
    },
    async requestRelief(absenceId: string, options: { preferredTeacherIds?: string[] }): Promise<void> {
      return request('POST', `/relief/absences/${absenceId}/request-relief`, options);
    },
    async acceptAssignment(assignmentId: string): Promise<void> {
      return request('POST', `/relief/assignments/${assignmentId}/accept`);
    },
    async getPools(schoolId?: string): Promise<{ pools: ReliefPool[] }> {
      return request('GET', `/relief/pools${qs({ schoolId })}`);
    },
    async getPredictions(startDate: string, endDate?: string): Promise<{ predictions: ReliefPrediction[] }> {
      return request('GET', `/relief/predictions${qs({ startDate, endDate })}`);
    },
  },

  // ── Content (7 endpoints) ── mount: /api/v1/content ──
  content: {
    async list(params?: { type?: string; subject?: string; page?: number }): Promise<ContentListResponse> {
      return request('GET', `/content${qs({ type: params?.type, subject: params?.subject, page: params?.page })}`);
    },
    async get(id: string): Promise<{ content: ContentItem }> {
      return request('GET', `/content/${id}`);
    },
    async create(input: CreateContentInput): Promise<{ content: ContentItem }> {
      return request('POST', '/content', input);
    },
    async publish(id: string): Promise<{ content: ContentItem }> {
      return request('POST', `/content/${id}/publish`);
    },
    async getReviews(id: string, page = 1): Promise<ContentReviewsResponse> {
      return request('GET', `/content/${id}/reviews?page=${page}`);
    },
    async submitReview(id: string, review: { rating: number; comment: string }): Promise<void> {
      return request('POST', `/content/${id}/reviews`, review);
    },
  },

  // ── ML Pipeline (10+ endpoints) ── mount: /api/v1/ml ──
  // NOTE: Mounted at /ml NOT /ml-pipeline (see index.ts line ~170)
  ml: {
    async getModels(page = 1): Promise<MLModelListResponse> {
      return request('GET', `/ml/models?page=${page}`);
    },
    async getModel(id: string): Promise<{ model: MLModel }> {
      return request('GET', `/ml/models/${id}`);
    },
    async trainModel(id: string): Promise<{ job: TrainingJob }> {
      return request('POST', `/ml/models/${id}/train`);
    },
    async getStudentRisk(studentId: string): Promise<StudentRiskPrediction> {
      return request('GET', `/ml/predictions/student-risk/${studentId}`);
    },
    async getPerformancePrediction(entityId: string): Promise<PerformancePrediction> {
      return request('GET', `/ml/predictions/performance/${entityId}`);
    },
  },

  // ── Collaboration (10 endpoints) ── mount: /api/v1/collaboration ──
  collab: {
    async getStories(page = 1): Promise<{ stories: CollaborativeStory[]; pagination: Pagination }> {
      return request('GET', `/collaboration/stories?page=${page}`);
    },
    async createStory(input: { title: string; theme: string }): Promise<{ story: CollaborativeStory }> {
      return request('POST', '/collaboration/stories', input);
    },
    async getLessonPlans(page = 1): Promise<{ lessonPlans: CollaborativeLessonPlan[]; pagination: Pagination }> {
      return request('GET', `/collaboration/lesson-plans?page=${page}`);
    },
    async getResources(params?: { subject?: string; page?: number }): Promise<SharedResourcesResponse> {
      return request('GET', `/collaboration/resources${qs({ subject: params?.subject, page: params?.page })}`);
    },
    async shareResource(input: { title: string; type: string; content: unknown }): Promise<void> {
      return request('POST', '/collaboration/resources', input);
    },
  },

  // ── Standards Compliance (8 endpoints) ── mount: /api/v1/standards ──
  // NOTE: Mounted at /standards NOT /standards-compliance (see index.ts line ~165)
  standards: {
    async runAudit(params: { scope: string; standards: string[] }): Promise<ComplianceAuditResult> {
      return request('POST', '/standards/audit', params);
    },
    async alignACARA(params: { content: string; yearLevel: string; subject: string }): Promise<CurriculumAlignmentResult> {
      return request('POST', '/standards/acara/align', params);
    },
    async assessAITSL(params: { teacherId: string; evidence: string[] }): Promise<AITSLAssessment> {
      return request('POST', '/standards/aitsl/assess', params);
    },
    async getACARACodes(params?: { subject?: string; yearLevel?: string }): Promise<{ codes: CurriculumStandard[] }> {
      return request('GET', `/standards/acara/codes${qs({ subject: params?.subject, yearLevel: params?.yearLevel })}`);
    },
  },

  // ── AI Intelligence (ai-engine.ts + ai-buddy.ts) ──
  // mount: /api/v1/ai-engine and /api/v1/ai-buddy
  //
  // This namespace is the soul of AI-assisted teaching. Every teacher page
  // calls at least one method here to surface intelligent insights alongside
  // raw data. The LIS orchestrates BKT mastery, ML personalisation,
  // at-risk detection, wellbeing monitoring, and conversational AI.
  ai: {
    /** BKT mastery profile for a learner */
    async getLearnerMastery(learnerId: string): Promise<{ success: boolean; data: LearnerMasteryProfile }> {
      return request('GET', `/ai-engine/bkt/mastery/${learnerId}`);
    },

    /** ML feature vector — multi-dimensional learner state */
    async getLearnerFeatures(learnerId: string): Promise<{ success: boolean; data: LearnerFeatureVector }> {
      return request('GET', `/ai-engine/ml/features/${learnerId}`);
    },

    /** AI-generated recommendations for a learner */
    async getLearnerRecommendations(learnerId: string): Promise<{ success: boolean; data: LearnerRecommendations }> {
      return request('GET', `/ai-engine/ml/recommendations/${learnerId}`);
    },

    /** At-risk learners across the class — proactive early intervention */
    async getAtRiskLearners(): Promise<{ success: boolean; data: { atRiskLearners: AtRiskLearner[]; total: number } }> {
      return request('GET', '/ai-engine/ml/at-risk');
    },

    /** BKT predictions + spaced repetition schedule */
    async getLearnerPredictions(learnerId: string): Promise<{ success: boolean; data: LearnerPredictions }> {
      return request('GET', `/ai-engine/bkt/predictions/${learnerId}`);
    },

    /** Wellbeing check — is this learner okay right now? */
    async checkWellbeing(learnerId: string): Promise<{ success: boolean; data: WellbeingCheck }> {
      return request('GET', `/ai-engine/wellbeing/check/${learnerId}`);
    },

    /** Send a message to Ask Issy */
    async askIssy(message: string, context?: { conversationId?: string; learnerId?: string }): Promise<{ success: boolean; data: AIBuddySendResponse }> {
      return request('POST', '/ai-buddy/message', { message, context });
    },

    /** Get Ask Issy conversation history */
    async getConversations(): Promise<{ success: boolean; data: AIBuddyConversation[] }> {
      return request('GET', '/ai-buddy/conversations');
    },

    /**
     * Generate contextual AI insights for a teacher page.
     *
     * Client-side synthesis: combines data from multiple AI endpoints
     * into actionable insights. Each teacher page calls this with its
     * context to get relevant AI recommendations displayed inline.
     */
    async generatePageInsights(context: {
      page: string;
      studentIds?: string[];
      classId?: string;
      subject?: string;
    }): Promise<AIInsight[]> {
      const insights: AIInsight[] = [];

      try {
        // Fetch at-risk learners (relevant to most teacher pages)
        const atRisk = await teacherApi.ai.getAtRiskLearners();
        if (atRisk.success && atRisk.data.atRiskLearners.length > 0) {
          for (const learner of atRisk.data.atRiskLearners.slice(0, 3)) {
            const prediction = learner.prediction as Record<string, unknown>;
            const factors = (prediction.riskFactors as string[]) || [];
            insights.push({
              id: `at-risk-${learner.learnerId}`,
              type: 'alert',
              severity: (prediction.severity as string) === 'high' ? 'critical' : 'warning',
              title: `Student needs attention`,
              description: `Risk factors: ${factors.join(', ')}. AI confidence: ${Math.round(learner.confidence * 100)}%.`,
              actionLabel: 'View Profile',
              actionHref: `/teacher/students/${learner.learnerId}`,
              relatedStudentIds: [learner.learnerId],
              source: 'ml-at-risk',
              confidence: learner.confidence,
              createdAt: learner.createdAt,
            });
          }
        }

        // Fetch mastery insights for specific students if provided
        if (context.studentIds && context.studentIds.length > 0) {
          for (const studentId of context.studentIds.slice(0, 3)) {
            try {
              const mastery = await teacherApi.ai.getLearnerMastery(studentId);
              if (mastery.success) {
                const struggling = mastery.data.skills.filter(s => s.pKnown < 0.6);
                if (struggling.length > 0) {
                  insights.push({
                    id: `mastery-gap-${studentId}`,
                    type: 'recommendation',
                    severity: 'info',
                    title: `Mastery gaps detected`,
                    description: `${struggling.length} skill${struggling.length > 1 ? 's' : ''} below 60% mastery: ${struggling.map(s => s.competencyId).join(', ')}. Consider targeted remediation.`,
                    actionLabel: 'Generate Activity',
                    relatedStudentIds: [studentId],
                    source: 'bkt-mastery',
                    confidence: 0.9,
                    createdAt: new Date().toISOString(),
                  });
                }

                const mastered = mastery.data.skills.filter(s => s.pKnown >= 0.9);
                if (mastered.length >= 3) {
                  insights.push({
                    id: `mastery-win-${studentId}`,
                    type: 'celebration',
                    severity: 'positive',
                    title: `Strong progress!`,
                    description: `${mastered.length} skills at 90%+ mastery. This learner may be ready to advance to the next difficulty level.`,
                    relatedStudentIds: [studentId],
                    source: 'bkt-mastery',
                    confidence: 0.95,
                    createdAt: new Date().toISOString(),
                  });
                }
              }
            } catch { /* Individual student fetch failures shouldn't break the whole insights flow */ }
          }
        }
      } catch { /* Insights are supplementary — never block the page */ }

      return insights;
    },
  },
};
