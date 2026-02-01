/**
 * Gradebook Module - Type Definitions
 * 
 * Extends the Intelligence Mesh with comprehensive gradebook capabilities.
 * Translates continuous assessment evidence into meaningful achievement
 * records that track growth over time.
 * 
 * ## The Granny Explanation
 * 
 * Think of the old-fashioned report card: a single letter grade that tells
 * you almost nothing about what a child actually knows. "B+ in Mathematics"
 * - but can they do fractions? Are they great at geometry but struggling
 * with algebra?
 * 
 * This Gradebook is different. It's like a living story of a child's learning:
 * 
 * 1. **Standards-Based Tracking**: Instead of averaging all scores together,
 *    we track mastery of each specific skill. You know *exactly* what they've
 *    got and what they need.
 * 
 * 2. **Growth Focus**: We don't just show where they are - we show how far
 *    they've come. A student who started at 20% and reached 70% shows more
 *    growth than one who stayed at 80%.
 * 
 * 3. **Multiple Perspectives**: Grades from tests, projects, presentations,
 *    and daily work. One bad test day doesn't define them.
 * 
 * 4. **AI-Powered Reports**: The system writes draft report card narratives
 *    based on all the evidence - teachers review and personalize, saving
 *    hours of writing time.
 * 
 * @module IntelligenceMesh/Gradebook
 * @version 1.5.0
 */

import { MeshBaseEntity } from '../shared/mesh-types';

// ============================================================================
// ENUMS
// ============================================================================

export enum GradingSystem {
  LETTER = 'letter',
  PERCENTAGE = 'percentage',
  NUMERIC_SCALE = 'numeric_scale',
  STANDARDS_BASED = 'standards_based',
  PASS_FAIL = 'pass_fail',
  CUSTOM = 'custom'
}

export enum AchievementLevel {
  NOT_ASSESSED = 'not_assessed',
  BEGINNING = 'beginning',
  DEVELOPING = 'developing',
  APPROACHING = 'approaching',
  MEETING = 'meeting',
  EXCEEDING = 'exceeding'
}

export enum CalculationMethod {
  MEAN = 'mean',
  WEIGHTED_RECENT = 'weighted_recent',
  MODE = 'mode',
  HIGHEST_CONSISTENT = 'highest_consistent',
  MANUAL = 'manual',
  DECAYING_AVERAGE = 'decaying_average'
}

export enum ReportStatus {
  DRAFT = 'draft',
  TEACHER_COMPLETE = 'teacher_complete',
  COORDINATOR_REVIEW = 'coordinator_review',
  PRINCIPAL_REVIEW = 'principal_review',
  APPROVED = 'approved',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

export enum NarrativeStatus {
  PENDING = 'pending',
  AI_DRAFT = 'ai_draft',
  TEACHER_EDITED = 'teacher_edited',
  APPROVED = 'approved'
}

// ============================================================================
// GRADING POLICY
// ============================================================================

export interface GradingPolicy extends MeshBaseEntity {
  schoolId: string;
  name: string;
  description?: string;
  gradingSystem: GradingSystem;
  gradeScale: GradeScaleEntry[];
  calculationMethod: CalculationMethod;
  minimumAssessmentsRequired: number;
  excludeLowestScores?: number;
  categoryWeights: CategoryWeight[];
  lateWorkPolicy: LateWorkPolicy;
  missingWorkPolicy: MissingWorkPolicy;
  roundingMethod: 'up' | 'down' | 'nearest' | 'none';
  roundingPrecision: number;
  showPercentages: boolean;
  showPointsEarned: boolean;
  showWeights: boolean;
  standardsBasedSettings?: StandardsBasedSettings;
  isActive: boolean;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

export interface GradeScaleEntry {
  grade: string;
  label?: string;
  minPercentage: number;
  maxPercentage: number;
  gpaValue?: number;
  color?: string;
}

export interface CategoryWeight {
  category: string;
  weight: number;
  minimumItems?: number;
}

export interface LateWorkPolicy {
  maxPenalty: number;
  penaltyPerDay: number;
  gracePeriodDays: number;
  affectsGrade: boolean;
}

export interface MissingWorkPolicy {
  defaultScore: number | 'zero' | 'incomplete';
  affectsGrade: boolean;
  notificationDays: number;
}

export interface StandardsBasedSettings {
  achievementLevels: {
    level: AchievementLevel;
    label: string;
    description: string;
    minMastery: number;
  }[];
  requireAllStandards: boolean;
  mostRecentEvidence: number;
}

// ============================================================================
// GRADEBOOK
// ============================================================================

export interface Gradebook extends MeshBaseEntity {
  schoolId: string;
  classId: string;
  className: string;
  subject: string;
  teacherId: string;
  teacherName: string;
  periodId: string;
  periodName: string;
  periodStart: Date;
  periodEnd: Date;
  gradingPolicyId: string;
  categories: GradebookCategory[];
  studentIds: string[];
  isLocked: boolean;
  lockedAt?: Date;
  lockedBy?: string;
  statistics?: GradebookStatistics;
}

export interface GradebookCategory {
  id: string;
  name: string;
  weight: number;
  dropLowest?: number;
  isExtraCredit: boolean;
  items: GradebookItem[];
}

export interface GradebookStatistics {
  classAverage: number;
  classMedian: number;
  standardDeviation: number;
  gradeDistribution: { grade: string; count: number }[];
  lastUpdated: Date;
}

// ============================================================================
// GRADEBOOK ITEM
// ============================================================================

export interface GradebookItem extends MeshBaseEntity {
  gradebookId: string;
  categoryId: string;
  title: string;
  description?: string;
  sourceType: 'assessment' | 'assignment' | 'manual';
  sourceId?: string;
  maxPoints: number;
  curriculumCodes?: string[];
  learningObjectives?: string[];
  assignedDate?: Date;
  dueDate?: Date;
  isExtraCredit: boolean;
  countsTowardFinal: boolean;
  showToStudents: boolean;
  showToParents: boolean;
  scores: StudentScore[];
  statistics?: ItemStatistics;
}

export interface ItemStatistics {
  mean: number;
  median: number;
  min: number;
  max: number;
  submissionRate: number;
}

// ============================================================================
// STUDENT SCORE
// ============================================================================

export interface StudentScore {
  studentId: string;
  studentName: string;
  score: number | null;
  maxPoints: number;
  percentage?: number;
  status: ScoreStatus;
  submittedAt?: Date;
  isLate: boolean;
  latePenalty?: number;
  originalScore?: number;
  feedback?: string;
  privateNote?: string;
  achievementLevel?: AchievementLevel;
  masteryEstimate?: number;
  attemptId?: string;
  scoreHistory?: ScoreHistoryEntry[];
}

export type ScoreStatus = 'not_submitted' | 'submitted' | 'graded' | 'excused' | 'missing' | 'incomplete' | 'late';

export interface ScoreHistoryEntry {
  score: number;
  changedAt: Date;
  changedBy: string;
  reason?: string;
}

// ============================================================================
// STUDENT GRADE SUMMARY
// ============================================================================

export interface StudentGradeSummary extends MeshBaseEntity {
  studentId: string;
  studentName: string;
  gradebookId: string;
  currentGrade: string;
  currentPercentage: number;
  gpaValue?: number;
  categoryGrades: CategoryGrade[];
  standardsMastery?: StandardMasteryItem[];
  gradeTrend: GradeTrendPoint[];
  missingAssignments: MissingAssignment[];
  lateAssignments: LateAssignment[];
  classRank?: number;
  percentile?: number;
  comparedToClassAverage: number;
  projectedFinalGrade?: string;
  whatIfAnalysis?: WhatIfScenario[];
  lastUpdated: Date;
}

export interface CategoryGrade {
  categoryId: string;
  categoryName: string;
  weight: number;
  percentage: number;
  grade: string;
  itemsComplete: number;
  itemsTotal: number;
}

export interface StandardMasteryItem {
  curriculumCode: string;
  description: string;
  achievementLevel: AchievementLevel;
  masteryPercentage: number;
  evidenceCount: number;
  trend: 'improving' | 'stable' | 'declining';
}

export interface GradeTrendPoint {
  date: Date;
  percentage: number;
  grade: string;
}

export interface MissingAssignment {
  itemId: string;
  title: string;
  dueDate: Date;
  maxPoints: number;
}

export interface LateAssignment {
  itemId: string;
  title: string;
  daysLate: number;
  penalty: number;
}

export interface WhatIfScenario {
  scenario: string;
  projectedGrade: string;
  projectedPercentage: number;
}

// ============================================================================
// REPORT CARD
// ============================================================================

export interface ReportCardTemplate extends MeshBaseEntity {
  schoolId: string;
  name: string;
  description?: string;
  yearLevels: string[];
  sections: ReportCardSection[];
  narrativeSettings: NarrativeSettings;
  headerContent?: string;
  footerContent?: string;
  includeAttendanceSummary: boolean;
  includeGoals: boolean;
  includeEffortGrades: boolean;
  isActive: boolean;
}

export interface ReportCardSection {
  id: string;
  title: string;
  order: number;
  type: 'subject_grades' | 'standards_mastery' | 'narrative' | 'attendance' | 'effort' | 'goals' | 'custom';
  subjects?: string[];
  curriculumAreas?: string[];
  customFields?: CustomField[];
}

export interface CustomField {
  fieldId: string;
  label: string;
  type: 'text' | 'rating' | 'scale' | 'checkbox';
  options?: string[];
}

export interface NarrativeSettings {
  required: boolean;
  minWords?: number;
  maxWords?: number;
  aiAssistEnabled: boolean;
  promptGuidelines?: string;
}

export interface ReportCard extends MeshBaseEntity {
  studentId: string;
  studentName: string;
  periodId: string;
  periodName: string;
  yearLevel: string;
  templateId: string;
  status: ReportStatus;
  workflow: WorkflowEntry[];
  subjectGrades: SubjectGrade[];
  standardsMastery?: StandardMasteryRecord[];
  effortGrades?: EffortGrade[];
  narratives: ReportNarrative[];
  attendanceSummary?: AttendanceSummary;
  goals?: StudentGoal[];
  parentComment?: string;
  studentReflection?: string;
  publishedAt?: Date;
  viewedByParentAt?: Date;
  downloadedAt?: Date;
  teacherSignature?: Signature;
  coordinatorSignature?: Signature;
  principalSignature?: Signature;
}

export interface WorkflowEntry {
  status: string;
  assignedTo?: string;
  updatedAt: Date;
  updatedBy: string;
  comments?: string;
}

export interface SubjectGrade {
  subject: string;
  teacherId: string;
  teacherName: string;
  grade: string;
  percentage?: number;
  gpaValue?: number;
  achievementLevel?: AchievementLevel;
  classAverage?: number;
  classRank?: number;
  standardsBreakdown?: { standard: string; level: AchievementLevel }[];
  effortRating?: string;
  comment?: string;
}

export interface StandardMasteryRecord {
  curriculumCode: string;
  description: string;
  achievementLevel: AchievementLevel;
  teacher?: string;
}

export interface EffortGrade {
  area: string;
  rating: string;
}

export interface AttendanceSummary {
  daysAbsent: number;
  daysLate: number;
  totalDays: number;
  attendanceRate: number;
}

export interface StudentGoal {
  goalText: string;
  setBy: 'teacher' | 'student' | 'parent';
  status: 'active' | 'achieved' | 'revised';
}

export interface Signature {
  signedBy: string;
  signedAt: Date;
}

export interface ReportNarrative {
  id: string;
  subject?: string;
  teacherId?: string;
  content: string;
  status: NarrativeStatus;
  aiDraft?: string;
  aiGeneratedAt?: Date;
  teacherEdits?: NarrativeEdit[];
  approvedAt?: Date;
  approvedBy?: string;
  wordCount: number;
}

export interface NarrativeEdit {
  editedAt: Date;
  editedBy: string;
  previousContent: string;
}

// ============================================================================
// TRANSCRIPT
// ============================================================================

export interface AcademicTranscript extends MeshBaseEntity {
  studentId: string;
  studentName: string;
  dateOfBirth: Date;
  studentNumber: string;
  schoolId: string;
  schoolName: string;
  schoolAddress: string;
  periodFrom: Date;
  periodTo: Date;
  yearSummaries: YearSummary[];
  cumulativeGPA?: number;
  totalCredits?: number;
  isOfficial: boolean;
  issuedAt?: Date;
  issuedBy?: string;
  certificateNumber?: string;
  verificationCode?: string;
  pdfUrl?: string;
  generatedAt?: Date;
}

export interface YearSummary {
  year: string;
  yearLevel: string;
  period: string;
  subjects: { subject: string; grade: string; credits?: number }[];
  gpa?: number;
  comments?: string;
}
