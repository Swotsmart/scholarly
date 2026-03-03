/**
 * Teacher Module Type Definitions
 * Used by teacher-api.ts, use-teacher.ts, and all 33 teacher pages.
 *
 * Types mirror the backend API response shapes from:
 *   dashboard.ts, sessions.ts, curriculum.ts, analytics.ts,
 *   relief.ts, content.ts, ml-pipeline.ts, collaboration.ts,
 *   standards-compliance.ts, ai-engine.ts, ai-buddy.ts
 */

// =============================================================================
// SHARED
// =============================================================================

export interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// =============================================================================
// DASHBOARD
// =============================================================================

export interface TeacherDashboardSummary {
  user: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl: string | null;
    roles: string[];
    trustScore: number;
  };
  tokenBalance: number;
  trustScore: number;
}

export interface ActivityItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface ActivityFeedResponse {
  activities: ActivityItem[];
  pagination: Pagination;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationsResponse {
  notifications: Notification[];
  pagination: Pagination;
}

export interface QuickStats {
  stats: {
    activeTutors: number;
    publishedContent: number;
    todayBookings: number;
    activeFamilies: number;
  };
}

// =============================================================================
// SESSIONS
// =============================================================================

export interface SessionParticipant {
  learnerProfile: {
    id: string;
    user: {
      id: string;
      displayName: string;
      avatarUrl: string | null;
    };
  };
}

export interface Session {
  id: string;
  status: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  participants: SessionParticipant[];
  subject?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionListResponse {
  sessions: Session[];
  pagination: Pagination;
}

export interface SessionFeedback {
  rating: number;
  comment: string;
  tags?: string[];
}

// =============================================================================
// CURRICULUM
// =============================================================================

export interface CurriculumStandard {
  id: string;
  code: string;
  name: string;
  title?: string;
  description: string;
  subject: string;
  yearLevel: string;
  strand?: string;
  subStrand?: string;
}

export interface CurriculumStructure {
  subjects: { name: string; yearLevels: string[] }[];
  strands: Record<string, string[]>;
}

export interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  yearLevel: string;
  duration: number;
  objectives: string[];
  activities: { name: string; duration: number; description: string }[];
  resources: string[];
  assessment: string;
  standards: string[];
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface LessonPlanListResponse {
  lessonPlans: LessonPlan[];
  pagination: Pagination;
}

export interface GenerateLessonInput {
  subject: string;
  yearLevel: string;
  topic?: string;
  duration?: number;
  objectives?: string[];
  standards?: string[];
  differentiation?: boolean;
}

export interface AlignmentResult {
  contentId: string;
  alignedStandards: { code: string; name: string; coverage: number }[];
  overallAlignment: number;
}

// =============================================================================
// ANALYTICS
// =============================================================================

export interface ClassBreakdown {
  classId: string;
  className: string;
  studentCount: number;
  averageScore: number;
  attendanceRate: number;
  engagementScore: number;
}

export interface TeacherAnalyticsDashboard {
  data: {
    overview: {
      totalStudents: number;
      averagePerformance: number;
      attendanceRate: number;
      engagementScore: number;
    };
    classBreakdown: ClassBreakdown[];
    trends: {
      date: string;
      performance: number;
      attendance: number;
      engagement: number;
    }[];
  };
}

export interface DashboardFilters {
  dateRange?: string;
  classId?: string;
  subject?: string;
}

export interface AnalyticsReport {
  id: string;
  title: string;
  type: string;
  status: string;
  filters: DashboardFilters;
  generatedAt: string | null;
  downloadUrl: string | null;
  createdAt: string;
}

export interface AnalyticsReportListResponse {
  reports: AnalyticsReport[];
  pagination: Pagination;
}

// =============================================================================
// SCHEDULING / RELIEF
// =============================================================================

export interface ReliefTeacher {
  id: string;
  displayName: string;
  email: string;
  subjects: string[];
  yearLevels: string[];
  availability: string;
  rating: number;
}

export interface ReliefTeacherListResponse {
  teachers: ReliefTeacher[];
  pagination: Pagination;
}

export interface TeacherAbsence {
  id: string;
  teacherId: string;
  teacherName: string;
  startDate: string;
  endDate: string;
  reason: string;
  status: string;
  reliefAssigned: boolean;
  createdAt: string;
}

export interface AbsenceListResponse {
  absences: TeacherAbsence[];
  pagination: Pagination;
}

export interface CreateAbsenceInput {
  startDate: string;
  endDate: string;
  reason: string;
  notes?: string;
  classIds?: string[];
}

export interface ReliefPool {
  id: string;
  name: string;
  schoolId: string;
  teacherCount: number;
  teachers?: { id: string; displayName: string }[];
  capacity?: number;
  subjects: string[];
}

export interface ReliefPrediction {
  date: string;
  predictedAbsences: number;
  confidence: number;
  factors: string[];
}

// =============================================================================
// CONTENT
// =============================================================================

export interface ContentItem {
  id: string;
  title: string;
  type: string;
  subject: string;
  status: string;
  description: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface ContentListResponse {
  items: ContentItem[];
  pagination: Pagination;
}

export interface CreateContentInput {
  title: string;
  type: string;
  subject: string;
  description: string;
  content: unknown;
  standards?: string[];
}

export interface ContentReview {
  id: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ContentReviewsResponse {
  reviews: ContentReview[];
  pagination: Pagination;
}

// =============================================================================
// ML PIPELINE
// =============================================================================

export interface MLModel {
  id: string;
  name: string;
  type: string;
  status: string;
  accuracy: number;
  version: string;
  lastTrained: string | null;
  createdAt: string;
}

export interface MLModelListResponse {
  models: MLModel[];
  pagination: Pagination;
}

export interface StudentRiskPrediction {
  studentId: string;
  riskLevel: string;
  riskScore: number;
  confidence: number;
  factors: string[];
  riskFactors?: string[];
  recommendations: string[];
}

export interface PerformancePrediction {
  entityId: string;
  predicted: number;
  confidence: number;
  trend: string;
  factors: string[];
}

export interface TrainingJob {
  id: string;
  modelId: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
  metrics?: Record<string, number>;
}

// =============================================================================
// COLLABORATION
// =============================================================================

export interface CollaborativeStory {
  id: string;
  title: string;
  theme: string;
  participants: string[];
  status: string;
  createdAt: string;
}

export interface CollaborativeLessonPlan {
  id: string;
  title: string;
  subject: string;
  contributors: string[];
  status: string;
  createdAt: string;
}

export interface SharedResource {
  id: string;
  title: string;
  type: string;
  subject: string;
  sharedBy: string;
  downloads: number;
  rating: number;
  createdAt: string;
}

export interface SharedResourcesResponse {
  resources: SharedResource[];
  pagination: Pagination;
}

// =============================================================================
// STANDARDS COMPLIANCE
// =============================================================================

export interface ComplianceAuditResult {
  scope: string;
  overallCompliance: number;
  standards: { code: string; name: string; compliance: number; gaps: string[] }[];
  recommendations: string[];
  auditedAt: string;
}

export interface AITSLAssessment {
  teacherId: string;
  overallRating: string;
  standards: { code: string; name: string; rating: string; evidence: string[] }[];
  recommendations: string[];
  assessedAt: string;
}

export interface CurriculumAlignmentResult {
  content: string;
  alignedCodes: { code: string; name: string; relevance: number }[];
  overallAlignment: number;
  suggestions: string[];
}

// =============================================================================
// AI ENGINE — BKT, ML, WELLBEING
// =============================================================================

export interface SkillMastery {
  competencyId: string;
  pKnown: number;
  pLearn: number;
  pGuess: number;
  pSlip: number;
  totalAttempts: number;
  lastAttemptAt: string;
}

export interface LearnerMasteryProfile {
  learnerId: string;
  skills: SkillMastery[];
  lastUpdated: string;
}

export interface LearnerFeatureVector {
  learnerId: string;
  features: Record<string, number>;
  extractedAt: string;
}

export interface LearnerRecommendations {
  learnerId: string;
  recommendations: {
    type: string;
    title: string;
    description: string;
    priority: number;
    contentId?: string;
  }[];
}

export interface AtRiskLearner {
  learnerId: string;
  confidence: number;
  prediction: Record<string, unknown>;
  createdAt: string;
}

export interface BKTPrediction {
  competencyId: string;
  currentPKnown: number;
  predictedPKnown: number;
  sessionsToMastery: number;
}

export interface SpacedRepetitionItem {
  competencyId: string;
  nextReviewDate: string;
  interval: number;
  easeFactor: number;
}

export interface LearnerPredictions {
  learnerId: string;
  predictions: BKTPrediction[];
  spacedRepetition: SpacedRepetitionItem[];
}

export interface WellbeingCheck {
  learnerId: string;
  sessionDuration: number;
  engagementLevel: number;
  needsBreak: boolean;
  recommendation: string | null;
  checkedAt: string;
}

// =============================================================================
// AI BUDDY (ASK ISSY)
// =============================================================================

export interface AIBuddySendResponse {
  message: {
    id: string;
    role: string;
    content: string;
  };
  conversationId: string;
}

export interface AIBuddyConversation {
  id: string;
  title: string;
  lastMessageAt: string;
  messageCount: number;
}

// =============================================================================
// AI INSIGHTS (client-side synthesised)
// =============================================================================

export interface AIInsight {
  id: string;
  type: 'alert' | 'recommendation' | 'celebration' | 'suggestion';
  severity: 'critical' | 'warning' | 'info' | 'positive';
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  relatedStudentIds?: string[];
  source: string;
  confidence: number;
  createdAt: string;
}
