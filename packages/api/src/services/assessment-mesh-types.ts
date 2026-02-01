/**
 * Assessment Module - Type Definitions
 *
 * Extends the Intelligence Mesh with comprehensive assessment capabilities.
 * Implements the "dual-mode" assessment engine aligned with Constructive
 * Alignment principles: formative assessments encourage AI, summative
 * assessments enforce integrity.
 *
 * ## The Granny Explanation
 *
 * Remember when report cards came four times a year? You'd find out little
 * Timmy was struggling with fractions... three months after the problem started.
 * By then, he's so far behind that catching up feels impossible.
 *
 * This Assessment module is like having a wise teacher sitting with Timmy every
 * single day, noticing the moment he gets confused about fractions:
 *
 * 1. **Continuous Checking**: Little quizzes and activities that feel like games
 *    but actually track understanding in real-time
 *
 * 2. **Smart Analysis**: AI that spots patterns - "Timmy understands adding
 *    fractions but gets confused when denominators are different"
 *
 * 3. **Instant Feedback**: Both to Timmy ("Try this hint!") and his teacher
 *    ("Timmy needs help with unlike denominators")
 *
 * 4. **Connected Learning**: When Timmy masters something, it automatically
 *    updates his learning profile and suggests what to tackle next
 *
 * @module IntelligenceMesh/Assessment
 * @version 1.5.0
 */

import { MeshBaseEntity, MeshStudent } from './mesh-types';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Assessment purpose determines how it's used and how AI can assist
 */
export enum AssessmentPurpose {
  /** Quick check of understanding - AI encouraged */
  DIAGNOSTIC = 'diagnostic',
  /** Ongoing learning checks - AI can assist */
  FORMATIVE = 'formative',
  /** Formal evaluation - AI policies vary */
  SUMMATIVE = 'summative',
  /** Benchmark/standardised testing - No AI */
  BENCHMARK = 'benchmark',
  /** Self-reflection activities - AI can guide */
  REFLECTIVE = 'reflective',
  /** Peer evaluation component */
  PEER_REVIEW = 'peer_review'
}

/**
 * How responses are evaluated
 */
export enum AssessmentFormat {
  /** Multiple choice, true/false - Auto-marked */
  OBJECTIVE = 'objective',
  /** Short answer with defined correct answers - AI can assist marking */
  CONSTRUCTED_SHORT = 'constructed_short',
  /** Extended writing - AI first-pass + teacher review */
  CONSTRUCTED_EXTENDED = 'constructed_extended',
  /** Hands-on task - Rubric-based */
  PERFORMANCE = 'performance',
  /** Long-term project - Multiple checkpoints */
  PROJECT = 'project',
  /** Oral presentation - Rubric-based */
  PRESENTATION = 'presentation',
  /** Student portfolio - Holistic review */
  PORTFOLIO = 'portfolio',
  /** Observation checklist */
  OBSERVATION = 'observation',
  /** Mixed format assessment */
  MIXED = 'mixed'
}

/**
 * Question types for objective/constructed assessments
 */
export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  MULTIPLE_SELECT = 'multiple_select',
  TRUE_FALSE = 'true_false',
  MATCHING = 'matching',
  ORDERING = 'ordering',
  FILL_BLANK = 'fill_blank',
  SHORT_ANSWER = 'short_answer',
  EXTENDED_RESPONSE = 'extended_response',
  ESSAY = 'essay',
  NUMERIC = 'numeric',
  FILE_UPLOAD = 'file_upload',
  AUDIO_RESPONSE = 'audio_response',
  VIDEO_RESPONSE = 'video_response',
  CODE = 'code',
  DRAWING = 'drawing',
  HOTSPOT = 'hotspot',
  DRAG_DROP = 'drag_drop'
}

/**
 * Assessment attempt status
 */
export enum AttemptStatus {
  NOT_STARTED = 'not_started',
  IN_PROGRESS = 'in_progress',
  PAUSED = 'paused',
  SUBMITTED = 'submitted',
  AUTO_SUBMITTED = 'auto_submitted',
  MARKING = 'marking',
  AI_MARKED = 'ai_marked',
  TEACHER_REVIEWED = 'teacher_reviewed',
  RETURNED = 'returned',
  RESUBMIT_REQUESTED = 'resubmit_requested',
  VOIDED = 'voided'
}

/**
 * AI policy for assessments
 */
export enum AIPolicy {
  /** AI tools are encouraged and part of learning */
  ENCOURAGED = 'encouraged',
  /** AI can be used for research but not writing */
  RESEARCH_ONLY = 'research_only',
  /** AI can check spelling/grammar only */
  GRAMMAR_ONLY = 'grammar_only',
  /** No AI tools allowed */
  PROHIBITED = 'prohibited',
  /** Must cite any AI usage */
  CITE_REQUIRED = 'cite_required'
}

/**
 * Accommodation types for diverse learners
 */
export enum AccommodationType {
  EXTENDED_TIME = 'extended_time',
  EXTRA_BREAKS = 'extra_breaks',
  SEPARATE_ROOM = 'separate_room',
  READER = 'reader',
  SCRIBE = 'scribe',
  ASSISTIVE_TECHNOLOGY = 'assistive_technology',
  LARGE_PRINT = 'large_print',
  AUDIO_QUESTIONS = 'audio_questions',
  SIMPLIFIED_LANGUAGE = 'simplified_language',
  BILINGUAL_DICTIONARY = 'bilingual_dictionary',
  CALCULATOR = 'calculator',
  REFERENCE_SHEET = 'reference_sheet',
  REST_BREAKS = 'rest_breaks',
  REDUCED_DISTRACTIONS = 'reduced_distractions'
}

/**
 * Rubric scoring method
 */
export enum ScoringMethod {
  /** Points per criterion */
  ANALYTIC = 'analytic',
  /** Overall impression score */
  HOLISTIC = 'holistic',
  /** Yes/No checklist */
  CHECKLIST = 'checklist',
  /** Achieve/Not yet achievement-based */
  STANDARDS_BASED = 'standards_based',
  /** Single trait focus */
  PRIMARY_TRAIT = 'primary_trait'
}

/**
 * Peer review status
 */
export enum PeerReviewStatus {
  PENDING_ASSIGNMENT = 'pending_assignment',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  CALIBRATION_NEEDED = 'calibration_needed',
  COMPLETE = 'complete'
}

// ============================================================================
// ASSESSMENT DEFINITION
// ============================================================================

/**
 * Assessment Definition
 * The blueprint for an assessment - what gets tested, how, and policies
 */
export interface AssessmentDefinition extends MeshBaseEntity {
  schoolId: string;
  code: string;

  title: string;
  description: string;
  purpose: AssessmentPurpose;
  format: AssessmentFormat;

  yearLevels: string[];
  subjects: string[];
  curriculumCodes: string[];
  learningObjectives: string[];

  totalMarks: number;
  passingMarks?: number;
  weightInGradebook?: number;

  duration?: number;
  availableFrom?: Date;
  availableTo?: Date;
  lateSubmissionPolicy?: {
    allowed: boolean;
    penaltyPerDay?: number;
    maxLateDays?: number;
  };

  sections?: AssessmentSection[];
  questionBank?: QuestionBankReference;
  rubricId?: string;

  aiPolicy: AIPolicy;
  aiPolicyExplanation?: string;
  integritySettings: IntegritySettings;

  allowedAccommodations: AccommodationType[];

  peerReviewSettings?: PeerReviewSettings;

  moderationRequired: boolean;
  moderators?: string[];

  status: 'draft' | 'published' | 'archived';
  publishedAt?: Date;
  publishedBy?: string;

  version: number;
  previousVersionId?: string;
}

export interface IntegritySettings {
  plagiarismCheckEnabled: boolean;
  aiDetectionEnabled: boolean;
  processReplayEnabled: boolean;
  lockdownBrowserRequired: boolean;
  webcamProctoring: boolean;
  shuffleQuestions: boolean;
  shuffleAnswers: boolean;
  oneQuestionAtATime: boolean;
  preventBackNavigation: boolean;
}

export interface PeerReviewSettings {
  enabled: boolean;
  reviewsRequired: number;
  anonymous: boolean;
  rubricId?: string;
  calibrationRequired: boolean;
  dueDate?: Date;
}

export interface AssessmentSection {
  id: string;
  title: string;
  instructions?: string;
  order: number;
  questions: AssessmentQuestion[];
  marks: number;
  timeLimit?: number;
  shuffleQuestions: boolean;
}

export interface AssessmentQuestion {
  id: string;
  sectionId: string;
  order: number;

  type: QuestionType;
  stem: string;
  stemMedia?: MediaAttachment[];

  options?: QuestionOption[];
  correctAnswer?: any;

  expectedLength?: 'short' | 'medium' | 'long';
  wordLimit?: { min?: number; max?: number };
  modelAnswer?: string;
  markingGuide?: string;

  codeSettings?: CodeQuestionSettings;

  marks: number;
  partialCredit: boolean;

  curriculumCodes?: string[];
  bloomsLevel?: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  difficulty?: 'easy' | 'medium' | 'hard';

  aiMarkingEnabled: boolean;
  aiMarkingPrompt?: string;

  hints?: string[];
  feedbackIfCorrect?: string;
  feedbackIfIncorrect?: string;
  feedbackByOption?: Record<string, string>;
}

export interface MediaAttachment {
  type: 'image' | 'audio' | 'video' | 'document';
  url: string;
  altText?: string;
}

export interface QuestionOption {
  id: string;
  text: string;
  media?: { type: 'image' | 'audio'; url: string };
  isCorrect: boolean;
  partialCredit?: number;
  feedbackIfSelected?: string;
}

export interface CodeQuestionSettings {
  language: string;
  starterCode?: string;
  testCases?: { input: string; expectedOutput: string; visible: boolean }[];
}

export interface QuestionBankReference {
  bankId: string;
  selectionMode: 'all' | 'random' | 'tagged';
  count?: number;
  tags?: string[];
  difficultyMix?: { easy: number; medium: number; hard: number };
}

// ============================================================================
// RUBRIC
// ============================================================================

export interface RubricDefinition extends MeshBaseEntity {
  schoolId: string;
  title: string;
  description?: string;
  scoringMethod: ScoringMethod;
  criteria: RubricCriterion[];
  maxScore: number;
  gradeBoundaries?: GradeBoundary[];
  isShared: boolean;
  sharedWith?: string[];
}

export interface RubricCriterion {
  id: string;
  name: string;
  description?: string;
  order: number;
  weight: number;
  levels: RubricLevel[];
  aiDescriptors?: string[];
}

export interface RubricLevel {
  id: string;
  name: string;
  description: string;
  score: number;
  indicators: string[];
}

export interface GradeBoundary {
  grade: string;
  minScore: number;
  description?: string;
}

// ============================================================================
// ASSESSMENT ATTEMPT
// ============================================================================

export interface AssessmentAttempt extends MeshBaseEntity {
  assessmentId: string;
  studentId: string;
  studentName: string;

  status: AttemptStatus;
  attemptNumber: number;

  startedAt?: Date;
  lastActivityAt?: Date;
  submittedAt?: Date;

  accommodations: AccommodationType[];
  timeExtension?: number;
  adjustedDuration?: number;

  responses: QuestionResponse[];

  submissionMethod?: 'manual' | 'auto_time' | 'auto_late';
  lateSubmission: boolean;
  latePenalty?: number;

  questionsAnswered: number;
  totalQuestions: number;
  sectionsComplete: string[];

  processData?: ProcessData;
  integrityFlags?: IntegrityFlag[];

  score?: number;
  percentageScore?: number;
  adjustedScore?: number;
  masteryEstimate?: number;

  overallFeedback?: string;
  teacherComments?: string;

  markedAt?: Date;
  markedBy?: string;
  reviewedAt?: Date;
  reviewedBy?: string;

  appealStatus?: 'none' | 'submitted' | 'under_review' | 'resolved';
  appealReason?: string;
  appealResolution?: string;
}

export interface ProcessData {
  keystrokeLogs?: string;
  timePerQuestion: Record<string, number>;
  navigationHistory: { questionId: string; timestamp: Date }[];
  pasteEvents?: { questionId: string; timestamp: Date; content?: string }[];
}

export interface IntegrityFlag {
  type: 'tab_switch' | 'copy_paste' | 'external_content' | 'suspicious_timing' | 'ai_detected';
  timestamp: Date;
  details?: string;
  severity: 'info' | 'warning' | 'critical';
}

export interface QuestionResponse {
  questionId: string;
  sectionId: string;

  response: any;
  responseText?: string;
  responseFiles?: ResponseFile[];

  startedAt?: Date;
  answeredAt?: Date;
  timeSpent?: number;

  flaggedForReview: boolean;
  skipped: boolean;

  score?: number;
  maxScore: number;

  aiScore?: number;
  aiConfidence?: number;
  aiFeedback?: string;
  aiMarkingOverridden?: boolean;

  teacherScore?: number;
  teacherFeedback?: string;

  rubricScores?: RubricScore[];
}

export interface ResponseFile {
  fileId: string;
  fileName: string;
  fileType: string;
  uploadedAt: Date;
}

export interface RubricScore {
  criterionId: string;
  levelId: string;
  score: number;
  comment?: string;
}

// ============================================================================
// PEER REVIEW
// ============================================================================

export interface PeerReviewAssignment extends MeshBaseEntity {
  assessmentId: string;
  attemptId: string;

  reviewerId: string;
  reviewerName: string;
  authorId: string;

  status: PeerReviewStatus;

  rubricScores?: RubricScore[];
  overallFeedback?: string;
  strengths?: string[];
  improvements?: string[];

  feedbackQuality?: FeedbackQuality;

  aiSuggestedFeedback?: string[];
  aiUsedForFeedback: boolean;

  assignedAt: Date;
  dueAt: Date;
  startedAt?: Date;
  submittedAt?: Date;

  calibrationStatus?: 'passed' | 'needs_calibration' | 'failed';
  calibrationAttempts?: number;
}

export interface FeedbackQuality {
  specificity: number;
  constructiveness: number;
  completeness: number;
  overallQuality: number;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface AssessmentAnalytics extends MeshBaseEntity {
  assessmentId: string;
  classId?: string;
  generatedAt: Date;

  participation: ParticipationStats;
  scoreDistribution: ScoreDistribution;
  gradeDistribution: GradeDistributionItem[];
  questionAnalysis: QuestionAnalysisItem[];
  curriculumInsights: CurriculumInsight[];
  comparison?: ComparisonData;
  concerns: AnalyticsConcern[];
  recommendations: AnalyticsRecommendation[];
}

export interface ParticipationStats {
  totalStudents: number;
  started: number;
  submitted: number;
  notStarted: number;
  inProgress: number;
}

export interface ScoreDistribution {
  mean: number;
  median: number;
  standardDeviation: number;
  min: number;
  max: number;
  quartiles: { q1: number; q2: number; q3: number };
  histogram: { range: string; count: number }[];
}

export interface GradeDistributionItem {
  grade: string;
  count: number;
  percentage: number;
}

export interface QuestionAnalysisItem {
  questionId: string;
  questionText: string;
  correctRate: number;
  partialRate: number;
  averageScore: number;
  discriminationIndex: number;
  optionDistribution?: OptionDistributionItem[];
  commonErrors?: string[];
  averageTime: number;
  aiInsights?: string[];
}

export interface OptionDistributionItem {
  optionId: string;
  optionText: string;
  selectedCount: number;
  selectedPercentage: number;
  isCorrect: boolean;
}

export interface CurriculumInsight {
  curriculumCode: string;
  masteryRate: number;
  commonMisconceptions: string[];
  recommendedRemediation: string[];
}

export interface ComparisonData {
  schoolAverage?: number;
  districtAverage?: number;
  previousYearAverage?: number;
  previousAssessmentChange?: number;
}

export interface AnalyticsConcern {
  type: 'low_participation' | 'low_scores' | 'high_variance' | 'integrity_issues' | 'question_issues';
  description: string;
  severity: 'info' | 'warning' | 'critical';
  affectedStudents?: number;
}

export interface AnalyticsRecommendation {
  target: 'class' | 'individuals' | 'assessment';
  recommendation: string;
  priority: 'high' | 'medium' | 'low';
}

// ============================================================================
// STUDENT PROFILE
// ============================================================================

export interface StudentAssessmentProfile extends MeshBaseEntity {
  studentId: string;

  overallStats: {
    totalAssessments: number;
    averageScore: number;
    averageMastery: number;
    trend: 'improving' | 'stable' | 'declining';
    trendPeriod: { from: Date; to: Date };
  };

  subjectPerformance: SubjectPerformanceItem[];
  formatPerformance: FormatPerformanceItem[];
  learningPatterns: LearningPatterns;
  recentAttempts: RecentAttemptSummary[];
  curriculumMastery: CurriculumMasteryItem[];
  recommendations: ProfileRecommendation[];

  lastUpdated: Date;
}

export interface SubjectPerformanceItem {
  subject: string;
  assessmentCount: number;
  averageScore: number;
  mastery: number;
  trend: 'improving' | 'stable' | 'declining';
  strengths: string[];
  weaknesses: string[];
}

export interface FormatPerformanceItem {
  format: AssessmentFormat;
  averageScore: number;
  comfort: 'high' | 'medium' | 'low';
}

export interface LearningPatterns {
  bestTimeOfDay?: 'morning' | 'afternoon';
  optimalSessionLength?: number;
  responseToFeedback: 'highly_responsive' | 'moderately_responsive' | 'needs_support';
  testAnxietyIndicators?: string[];
}

export interface RecentAttemptSummary {
  assessmentId: string;
  title: string;
  date: Date;
  score: number;
  mastery: number;
  feedback?: string;
}

export interface CurriculumMasteryItem {
  curriculumCode: string;
  description: string;
  mastery: number;
  lastAssessed: Date;
  trend: 'improving' | 'stable' | 'declining';
}

export interface ProfileRecommendation {
  area: string;
  recommendation: string;
  resources?: string[];
  priority: 'high' | 'medium' | 'low';
}
