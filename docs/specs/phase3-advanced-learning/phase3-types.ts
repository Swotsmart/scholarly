/**
 * Phase 3: Advanced Learning Features - Type Definitions
 * 
 * Comprehensive types for:
 * - Video Coaching System (Edthena-style)
 * - Peer Review System (AI-enhanced comparative feedback)
 * - Industry Experience Module (WBL, apprenticeships, externships)
 * - Professional Development Hub (on-demand PD, ISTE U style)
 * - Project-Based Learning Framework (Gold Standard PBL, pitching)
 * 
 * @module Phase3Types
 */

import { 
  Jurisdiction, 
  SafeguardingCheck,
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  EventBus,
  Cache,
  ScholarlyConfig,
  Validator
} from './types';

// ============================================================================
// VIDEO COACHING SYSTEM TYPES
// ============================================================================

/**
 * A recorded lesson or teaching episode for coaching purposes
 */
export interface VideoRecording {
  id: string;
  tenantId: string;
  
  /** Educator who recorded the lesson */
  educatorId: string;
  educatorName: string;
  
  /** Recording metadata */
  title: string;
  description?: string;
  recordedAt: Date;
  duration: number; // seconds
  
  /** Video storage */
  videoUrl: string;
  thumbnailUrl?: string;
  transcriptUrl?: string;
  transcript?: VideoTranscript;
  
  /** Context */
  subjectArea: string;
  gradeLevel: string;
  lessonTopic: string;
  learningObjectives: string[];
  
  /** Teaching standards being addressed */
  standardsAddressed: StandardReference[];
  
  /** Sharing configuration */
  visibility: VideoVisibility;
  sharedWith: VideoShare[];
  
  /** Review status */
  reviewStatus: 'pending_review' | 'under_review' | 'reviewed' | 'archived';
  reviewCycles: ReviewCycle[];
  
  /** AI analysis */
  aiAnalysis?: VideoAIAnalysis;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

export type VideoVisibility = 'private' | 'mentor_only' | 'peer_group' | 'institution' | 'public';

export interface VideoShare {
  userId: string;
  userName: string;
  role: 'mentor' | 'peer' | 'supervisor' | 'viewer';
  sharedAt: Date;
  canComment: boolean;
  canRate: boolean;
}

export interface VideoTranscript {
  id: string;
  videoId: string;
  segments: TranscriptSegment[];
  language: string;
  generatedAt: Date;
  confidence: number;
}

export interface TranscriptSegment {
  startTime: number; // seconds
  endTime: number;
  text: string;
  speaker?: string;
  confidence: number;
}

export interface StandardReference {
  frameworkId: string; // e.g., 'AITSL', 'ISTE', 'Danielson'
  standardCode: string;
  standardTitle: string;
  domain?: string;
}

/**
 * A complete review cycle for a video
 */
export interface ReviewCycle {
  id: string;
  videoId: string;
  cycleNumber: number;
  
  /** Who is reviewing */
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'mentor' | 'peer' | 'supervisor' | 'self';
  
  /** Review content */
  comments: TimeStampedComment[];
  overallFeedback?: OverallFeedback;
  
  /** Self-reflection (if educator completed) */
  selfReflection?: SelfReflection;
  
  /** Status */
  status: 'in_progress' | 'completed' | 'acknowledged';
  startedAt: Date;
  completedAt?: Date;
  acknowledgedAt?: Date;
}

/**
 * A comment anchored to a specific timestamp in the video
 */
export interface TimeStampedComment {
  id: string;
  reviewCycleId: string;
  
  /** Timestamp anchor */
  startTime: number; // seconds into video
  endTime?: number; // optional end for ranges
  
  /** Comment content */
  content: string;
  commentType: CommentType;
  
  /** Standard tagging */
  taggedStandards?: StandardReference[];
  
  /** Sentiment/tone */
  sentiment: 'positive' | 'constructive' | 'neutral' | 'question';
  
  /** Threading */
  parentCommentId?: string;
  replies: TimeStampedComment[];
  
  /** Author */
  authorId: string;
  authorName: string;
  authorRole: 'mentor' | 'peer' | 'supervisor' | 'self' | 'ai';
  
  /** Timestamps */
  createdAt: Date;
  editedAt?: Date;
}

export type CommentType = 
  | 'praise'           // Positive reinforcement
  | 'suggestion'       // Constructive suggestion
  | 'question'         // Clarifying question
  | 'observation'      // Neutral observation
  | 'standard_link'    // Link to teaching standard
  | 'resource'         // Suggested resource
  | 'reflection_prompt'; // Prompt for self-reflection

export interface OverallFeedback {
  summary: string;
  strengths: string[];
  areasForGrowth: string[];
  actionItems: ActionItem[];
  overallRating?: number; // 1-5
  standardsRatings?: StandardRating[];
}

export interface ActionItem {
  id: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
}

export interface StandardRating {
  standard: StandardReference;
  rating: 1 | 2 | 3 | 4 | 5;
  evidence: string;
}

export interface SelfReflection {
  whatWentWell: string[];
  whatToImprove: string[];
  questionsForMentor: string[];
  actionCommitments: string[];
  completedAt: Date;
}

/**
 * AI-generated analysis of teaching video
 */
export interface VideoAIAnalysis {
  videoId: string;
  analyzedAt: Date;
  
  /** Talk time analysis */
  talkTimeAnalysis: {
    teacherTalkPercent: number;
    studentTalkPercent: number;
    silencePercent: number;
    questioningPercent: number;
  };
  
  /** Question analysis */
  questionAnalysis: {
    totalQuestions: number;
    openEndedPercent: number;
    waitTimeAverage: number; // seconds
    bloomsDistribution: Record<string, number>;
  };
  
  /** Engagement indicators */
  engagementIndicators: {
    paceVariation: number; // 0-1
    movementLevel: string;
    studentInteractionFrequency: number;
    positiveReinforcement: number;
  };
  
  /** Standards alignment */
  detectedStandards: StandardReference[];
  
  /** Key moments */
  keyMoments: {
    timestamp: number;
    type: 'highlight' | 'opportunity' | 'question';
    description: string;
    confidence: number;
  }[];
  
  /** AI suggestions */
  suggestions: {
    area: string;
    suggestion: string;
    rationale: string;
    resources?: string[];
  }[];
}

// ============================================================================
// PEER REVIEW SYSTEM TYPES
// ============================================================================

/**
 * A peer review assignment/session
 */
export interface PeerReviewSession {
  id: string;
  tenantId: string;
  
  /** Assignment context */
  assignmentId: string;
  assignmentTitle: string;
  courseId?: string;
  courseName?: string;
  
  /** Configuration */
  config: PeerReviewConfig;
  
  /** Timeline */
  submissionDeadline: Date;
  reviewDeadline: Date;
  feedbackReleaseDate?: Date;
  
  /** Status */
  status: PeerReviewSessionStatus;
  
  /** Submissions and assignments */
  submissions: PeerSubmission[];
  reviewAssignments: ReviewAssignment[];
  
  /** Statistics */
  stats: PeerReviewStats;
  
  /** Timestamps */
  createdAt: Date;
  createdBy: string;
  updatedAt: Date;
}

export type PeerReviewSessionStatus = 
  | 'draft'
  | 'collecting_submissions'
  | 'assigning_reviewers'
  | 'review_in_progress'
  | 'calibrating'
  | 'feedback_released'
  | 'closed';

export interface PeerReviewConfig {
  /** Anonymous or attributed */
  anonymousSubmissions: boolean;
  anonymousReviews: boolean;
  
  /** Review structure */
  reviewsPerSubmission: number; // How many reviewers per submission
  submissionsPerReviewer: number; // How many submissions each student reviews
  
  /** Rubric */
  rubric: ReviewRubric;
  
  /** Comparative reviewing (PeerStudio model) */
  enableComparativeReview: boolean;
  comparativeConfig?: ComparativeReviewConfig;
  
  /** AI assistance */
  enableAIGuidance: boolean;
  enableAIQualityCheck: boolean;
  
  /** Calibration */
  enableCalibration: boolean;
  calibrationSubmissions?: string[]; // Pre-scored submissions for calibration
  
  /** Self-review */
  requireSelfReview: boolean;
  
  /** Minimum feedback length */
  minimumFeedbackWords: number;
}

export interface ReviewRubric {
  id: string;
  name: string;
  description?: string;
  
  criteria: RubricCriterion[];
  
  /** Total points possible */
  totalPoints: number;
  
  /** Custom prompts for reviewers */
  reviewerPrompts: string[];
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number; // Percentage weight
  maxPoints: number;
  
  levels: RubricLevel[];
}

export interface RubricLevel {
  score: number;
  label: string; // e.g., "Exemplary", "Proficient", "Developing", "Beginning"
  description: string;
}

export interface ComparativeReviewConfig {
  /** Number of submissions to compare */
  comparisonsPerReview: number; // Typically 2-3
  
  /** Comparison prompts */
  comparisonPrompts: string[];
  
  /** Require ranking */
  requireRanking: boolean;
}

export interface PeerSubmission {
  id: string;
  sessionId: string;
  
  /** Author (may be anonymous to reviewers) */
  authorId: string;
  authorName?: string; // Only populated if not anonymous
  
  /** Submission content */
  content: SubmissionContent;
  
  /** Self-review */
  selfReview?: PeerReview;
  
  /** Received reviews */
  receivedReviews: PeerReview[];
  
  /** Aggregated feedback */
  aggregatedScore?: number;
  aggregatedFeedback?: AggregatedFeedback;
  
  /** Status */
  submittedAt: Date;
  status: 'submitted' | 'under_review' | 'reviewed' | 'feedback_released';
}

export interface SubmissionContent {
  type: 'text' | 'file' | 'url' | 'multimedia';
  
  /** For text submissions */
  text?: string;
  
  /** For file submissions */
  files?: {
    name: string;
    url: string;
    type: string;
    size: number;
  }[];
  
  /** For URL submissions */
  url?: string;
  
  /** For multimedia */
  mediaUrls?: string[];
}

export interface ReviewAssignment {
  id: string;
  sessionId: string;
  
  /** Reviewer */
  reviewerId: string;
  reviewerName?: string;
  
  /** Assigned submissions to review */
  assignedSubmissions: {
    submissionId: string;
    comparisonSubmissionIds?: string[]; // For comparative review
    status: 'pending' | 'in_progress' | 'completed';
    dueDate: Date;
  }[];
  
  /** Completion stats */
  completedCount: number;
  totalAssigned: number;
}

export interface PeerReview {
  id: string;
  submissionId: string;
  
  /** Reviewer */
  reviewerId: string;
  reviewerName?: string;
  isSelfReview: boolean;
  
  /** Rubric scores */
  criteriaScores: {
    criterionId: string;
    score: number;
    comment?: string;
  }[];
  
  /** Overall feedback */
  overallFeedback: string;
  strengthsIdentified: string[];
  suggestionsForImprovement: string[];
  
  /** Comparative review data */
  comparativeData?: {
    comparedSubmissionIds: string[];
    ranking?: number[];
    comparativeNotes: string;
  };
  
  /** AI assistance used */
  aiGuidanceUsed: boolean;
  aiSuggestions?: string[];
  
  /** Quality metrics */
  qualityScore?: number; // 0-100, AI-assessed quality of the review
  wordCount: number;
  
  /** Timestamps */
  startedAt: Date;
  completedAt?: Date;
}

export interface AggregatedFeedback {
  averageScore: number;
  scoreDistribution: number[];
  
  /** Consensus analysis */
  criteriaConsensus: {
    criterionId: string;
    averageScore: number;
    variance: number;
    commonThemes: string[];
  }[];
  
  /** Synthesized feedback */
  strengthsSummary: string[];
  improvementSummary: string[];
  
  /** Outlier detection */
  outlierReviews?: string[]; // Review IDs that diverge significantly
}

export interface PeerReviewStats {
  totalSubmissions: number;
  totalReviews: number;
  completedReviews: number;
  averageReviewQuality: number;
  averageSubmissionScore: number;
  reviewerParticipationRate: number;
}

// ============================================================================
// INDUSTRY EXPERIENCE MODULE TYPES
// ============================================================================

/**
 * Industry partner organization
 */
export interface IndustryPartner {
  id: string;
  tenantId: string;
  
  /** Organization details */
  name: string;
  description: string;
  industry: string;
  sector: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  
  /** Contact */
  primaryContact: ContactInfo;
  secondaryContacts: ContactInfo[];
  
  /** Location */
  locations: PartnerLocation[];
  
  /** Partnership details */
  partnershipStatus: 'prospective' | 'active' | 'paused' | 'terminated';
  partnershipStartDate?: Date;
  partnershipTier: 'bronze' | 'silver' | 'gold' | 'platinum';
  
  /** Capabilities */
  offeredExperienceTypes: ExperienceType[];
  skillsOffered: string[];
  industriesRepresented: string[];
  
  /** Safeguarding */
  safeguardingVerified: boolean;
  safeguardingVerifiedAt?: Date;
  insuranceVerified: boolean;
  
  /** Ratings */
  averageRating?: number;
  totalPlacements: number;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

export interface ContactInfo {
  name: string;
  role: string;
  email: string;
  phone?: string;
  preferredContactMethod: 'email' | 'phone' | 'platform';
}

export interface PartnerLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  coordinates?: { lat: number; lng: number };
  isRemoteAvailable: boolean;
}

export type ExperienceType = 
  | 'apprenticeship'
  | 'traineeship'
  | 'internship_paid'
  | 'internship_unpaid'
  | 'work_placement'
  | 'industry_project'
  | 'job_shadow'
  | 'mentorship'
  | 'site_visit'
  | 'guest_lecture'
  | 'teacher_externship';

/**
 * An industry experience opportunity
 */
export interface IndustryOpportunity {
  id: string;
  tenantId: string;
  partnerId: string;
  partnerName: string;
  
  /** Opportunity details */
  title: string;
  description: string;
  experienceType: ExperienceType;
  
  /** Requirements */
  skillsRequired: string[];
  qualificationsRequired: string[];
  minimumAge?: number;
  gradeLevel?: string[];
  
  /** Duration and schedule */
  duration: {
    value: number;
    unit: 'hours' | 'days' | 'weeks' | 'months';
  };
  schedule: {
    type: 'full_time' | 'part_time' | 'flexible' | 'block';
    hoursPerWeek?: number;
    daysOfWeek?: string[];
    startDate?: Date;
    endDate?: Date;
  };
  
  /** Location */
  location: PartnerLocation;
  isRemote: boolean;
  isHybrid: boolean;
  
  /** Compensation */
  compensation: {
    type: 'paid' | 'unpaid' | 'stipend' | 'school_credit';
    amount?: number;
    currency?: string;
    creditValue?: number;
  };
  
  /** Positions */
  totalPositions: number;
  filledPositions: number;
  
  /** Application */
  applicationDeadline?: Date;
  applicationRequirements: string[];
  
  /** Mentor */
  mentorId?: string;
  mentorName?: string;
  
  /** Status */
  status: 'draft' | 'published' | 'accepting_applications' | 'closed' | 'in_progress' | 'completed';
  
  /** Curriculum integration */
  alignedCurriculumCodes?: string[];
  learningOutcomes: string[];
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * An application to an industry experience
 */
export interface ExperienceApplication {
  id: string;
  tenantId: string;
  opportunityId: string;
  
  /** Applicant */
  applicantId: string;
  applicantType: 'student' | 'educator';
  applicantName: string;
  applicantEmail: string;
  
  /** Application content */
  coverLetter?: string;
  resumeUrl?: string;
  portfolioUrl?: string;
  additionalDocuments?: { name: string; url: string }[];
  responses: { questionId: string; response: string }[];
  
  /** Status */
  status: ApplicationStatus;
  statusHistory: { status: ApplicationStatus; timestamp: Date; note?: string }[];
  
  /** Interview */
  interviewScheduled?: Date;
  interviewNotes?: string;
  
  /** Recommendation */
  aiMatchScore?: number;
  aiMatchRationale?: string;
  
  /** Timestamps */
  submittedAt: Date;
  updatedAt: Date;
}

export type ApplicationStatus = 
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'shortlisted'
  | 'interview_scheduled'
  | 'interviewed'
  | 'offered'
  | 'accepted'
  | 'declined'
  | 'withdrawn'
  | 'rejected';

/**
 * An active industry experience placement
 */
export interface ExperiencePlacement {
  id: string;
  tenantId: string;
  opportunityId: string;
  applicationId: string;
  
  /** Participants */
  participantId: string;
  participantType: 'student' | 'educator';
  participantName: string;
  
  mentorId: string;
  mentorName: string;
  
  supervisorId?: string; // School/institution supervisor
  supervisorName?: string;
  
  /** Partner */
  partnerId: string;
  partnerName: string;
  
  /** Schedule */
  startDate: Date;
  endDate: Date;
  actualHours: number;
  targetHours: number;
  
  /** Progress tracking */
  learningPlan: LearningPlan;
  progressLogs: ProgressLog[];
  milestones: Milestone[];
  
  /** Evaluations */
  mentorEvaluations: MentorEvaluation[];
  selfReflections: SelfReflection[];
  
  /** Status */
  status: PlacementStatus;
  
  /** Credential issuance */
  credentialIssued: boolean;
  credentialId?: string;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export type PlacementStatus = 
  | 'pending_start'
  | 'active'
  | 'paused'
  | 'completed_pending_evaluation'
  | 'completed'
  | 'terminated_early';

export interface LearningPlan {
  objectives: string[];
  skills: string[];
  activities: PlannedActivity[];
  assessmentCriteria: string[];
}

export interface PlannedActivity {
  id: string;
  title: string;
  description: string;
  targetDate?: Date;
  completed: boolean;
  completedAt?: Date;
  evidence?: string;
}

export interface ProgressLog {
  id: string;
  date: Date;
  hoursLogged: number;
  activitiesCompleted: string[];
  skillsDeveloped: string[];
  reflections: string;
  mentorFeedback?: string;
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  targetDate: Date;
  status: 'pending' | 'in_progress' | 'completed' | 'missed';
  completedAt?: Date;
  evidence?: string;
}

export interface MentorEvaluation {
  id: string;
  evaluatorId: string;
  evaluatorName: string;
  evaluatorRole: 'industry_mentor' | 'school_supervisor';
  
  /** Ratings */
  overallRating: 1 | 2 | 3 | 4 | 5;
  skillRatings: { skill: string; rating: 1 | 2 | 3 | 4 | 5 }[];
  
  /** Feedback */
  strengths: string[];
  areasForImprovement: string[];
  recommendationForCredential: boolean;
  additionalComments?: string;
  
  /** Timestamps */
  completedAt: Date;
}

// ============================================================================
// PROFESSIONAL DEVELOPMENT HUB TYPES
// ============================================================================

/**
 * A professional development course/module
 */
export interface PDCourse {
  id: string;
  tenantId: string;
  
  /** Course details */
  title: string;
  description: string;
  shortDescription: string;
  thumbnailUrl?: string;
  
  /** Categorization */
  category: PDCategory;
  topics: string[];
  targetAudience: ('teacher' | 'administrator' | 'counselor' | 'support_staff')[];
  experienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'all_levels';
  
  /** Structure */
  format: 'self_paced' | 'instructor_led' | 'cohort_based' | 'blended';
  modules: PDModule[];
  
  /** Duration */
  estimatedHours: number;
  pdCredits?: number;
  
  /** Prerequisites */
  prerequisites: string[];
  prerequisiteCourseIds?: string[];
  
  /** Standards alignment */
  alignedStandards: StandardReference[];
  
  /** Instructors */
  instructors: CourseInstructor[];
  
  /** Pricing */
  pricing: {
    type: 'free' | 'paid' | 'subscription';
    amount?: number;
    currency?: string;
  };
  
  /** Credential */
  credentialOffered: boolean;
  credentialType?: string;
  
  /** Status and stats */
  status: 'draft' | 'published' | 'archived';
  enrollmentCount: number;
  completionRate: number;
  averageRating: number;
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type PDCategory = 
  | 'ai_literacy'
  | 'data_literacy'
  | 'pedagogical_strategies'
  | 'assessment'
  | 'differentiation'
  | 'classroom_management'
  | 'technology_integration'
  | 'social_emotional_learning'
  | 'curriculum_design'
  | 'leadership'
  | 'compliance'
  | 'wellbeing'
  | 'subject_specific';

export interface PDModule {
  id: string;
  courseId: string;
  
  /** Module details */
  title: string;
  description: string;
  order: number;
  
  /** Content */
  content: ModuleContent[];
  
  /** Assessment */
  assessment?: ModuleAssessment;
  
  /** Duration */
  estimatedMinutes: number;
  
  /** Prerequisites */
  prerequisiteModuleIds?: string[];
}

export interface ModuleContent {
  id: string;
  type: 'video' | 'text' | 'interactive' | 'resource' | 'discussion' | 'reflection';
  title: string;
  content: string; // URL for video/resource, HTML for text, config for interactive
  duration?: number; // minutes
  order: number;
  required: boolean;
}

export interface ModuleAssessment {
  type: 'quiz' | 'reflection' | 'project' | 'peer_review' | 'implementation';
  passingScore?: number;
  questions?: AssessmentQuestion[];
  prompt?: string;
  rubric?: ReviewRubric;
}

export interface AssessmentQuestion {
  id: string;
  type: 'multiple_choice' | 'multiple_select' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points: number;
}

export interface CourseInstructor {
  id: string;
  name: string;
  title: string;
  bio: string;
  avatarUrl?: string;
  credentials: string[];
}

/**
 * Educator's PD enrollment and progress
 */
export interface PDEnrollment {
  id: string;
  tenantId: string;
  
  /** Learner */
  educatorId: string;
  educatorName: string;
  
  /** Course */
  courseId: string;
  courseName: string;
  
  /** Progress */
  status: 'enrolled' | 'in_progress' | 'completed' | 'dropped';
  progress: {
    moduleId: string;
    contentProgress: { contentId: string; completed: boolean; completedAt?: Date }[];
    assessmentScore?: number;
    assessmentCompletedAt?: Date;
  }[];
  
  /** Overall */
  overallProgress: number; // 0-100
  
  /** Completion */
  completedAt?: Date;
  credentialId?: string;
  
  /** Feedback */
  courseRating?: number;
  courseFeedback?: string;
  
  /** Timestamps */
  enrolledAt: Date;
  lastAccessedAt: Date;
}

// ============================================================================
// PROJECT-BASED LEARNING TYPES
// ============================================================================

/**
 * A PBL project definition
 */
export interface PBLProject {
  id: string;
  tenantId: string;
  
  /** Project details */
  title: string;
  drivingQuestion: string; // The challenging question or problem
  description: string;
  
  /** Gold Standard PBL elements */
  challengingProblem: string;
  sustainedInquiry: InquiryPlan;
  authenticity: AuthenticityElements;
  studentVoiceAndChoice: VoiceAndChoiceOptions;
  reflection: ReflectionPlan;
  critiqueAndRevision: CritiqueRevisionPlan;
  publicProduct: PublicProductPlan;
  
  /** Curriculum alignment */
  alignedStandards: StandardReference[];
  subjectAreas: string[];
  gradeLevel: string[];
  
  /** Duration */
  estimatedDuration: {
    value: number;
    unit: 'days' | 'weeks' | 'months';
  };
  
  /** Team configuration */
  teamSize: { min: number; max: number };
  allowIndividual: boolean;
  
  /** Milestones */
  milestones: ProjectMilestone[];
  
  /** Resources */
  resources: ProjectResource[];
  
  /** Assessment */
  assessmentPlan: PBLAssessmentPlan;
  
  /** Status */
  status: 'draft' | 'published' | 'archived';
  
  /** Creator */
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InquiryPlan {
  initialQuestions: string[];
  researchAreas: string[];
  expertConnections?: string[];
  fieldworkOpportunities?: string[];
}

export interface AuthenticityElements {
  realWorldContext: string;
  audienceDescription: string;
  impactStatement: string;
  industryConnections?: string[];
}

export interface VoiceAndChoiceOptions {
  topicChoice: boolean;
  methodChoice: boolean;
  productChoice: boolean;
  teamChoice: boolean;
  constraints: string[];
}

export interface ReflectionPlan {
  checkpoints: { timing: string; prompts: string[] }[];
  journalingRequired: boolean;
  portfolioRequired: boolean;
}

export interface CritiqueRevisionPlan {
  peerReviewRounds: number;
  expertReviewIncluded: boolean;
  revisionExpectations: string;
  protocols: string[]; // e.g., "Tuning Protocol", "Gallery Walk"
}

export interface PublicProductPlan {
  productType: 'presentation' | 'exhibition' | 'publication' | 'performance' | 'prototype' | 'service' | 'other';
  productDescription: string;
  audience: string;
  venue?: string;
  exhibitionDate?: Date;
}

export interface ProjectMilestone {
  id: string;
  title: string;
  description: string;
  dueDate: Date;
  deliverables: string[];
  assessmentWeight: number;
}

export interface ProjectResource {
  id: string;
  title: string;
  description?: string;
  type: 'document' | 'video' | 'website' | 'tool' | 'template' | 'rubric';
  url: string;
  required: boolean;
}

export interface PBLAssessmentPlan {
  formativeAssessments: {
    type: 'checkpoint' | 'reflection' | 'peer_feedback' | 'self_assessment';
    timing: string;
    weight: number;
  }[];
  summativeAssessment: {
    rubric: ReviewRubric;
    pitchRequired: boolean;
    pitchRubric?: PitchRubric;
    portfolioRequired: boolean;
  };
}

/**
 * A pitch assessment rubric
 */
export interface PitchRubric {
  id: string;
  name: string;
  criteria: PitchCriterion[];
  totalPoints: number;
}

export interface PitchCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  levels: RubricLevel[];
  category: 'content' | 'delivery' | 'visuals' | 'q_and_a';
}

/**
 * A student/team's PBL project instance
 */
export interface PBLProjectInstance {
  id: string;
  tenantId: string;
  projectId: string;
  projectTitle: string;
  
  /** Team or individual */
  isTeam: boolean;
  teamId?: string;
  participantIds: string[];
  participantNames: string[];
  
  /** Facilitator */
  facilitatorId: string;
  facilitatorName: string;
  
  /** Customization */
  customDrivingQuestion?: string;
  chosenTopic?: string;
  chosenProductType?: string;
  
  /** Timeline */
  startDate: Date;
  targetEndDate: Date;
  actualEndDate?: Date;
  
  /** Progress */
  currentPhase: 'launch' | 'build_knowledge' | 'develop_and_critique' | 'present';
  milestoneProgress: {
    milestoneId: string;
    status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
    submissionUrl?: string;
    submittedAt?: Date;
    feedback?: string;
    score?: number;
  }[];
  
  /** Reflection journal */
  reflections: ProjectReflection[];
  
  /** Peer reviews */
  peerReviews: PeerReview[];
  
  /** Final pitch */
  pitch?: PitchSubmission;
  
  /** Final assessment */
  finalAssessment?: {
    rubricScores: { criterionId: string; score: number; feedback: string }[];
    totalScore: number;
    grade?: string;
    overallFeedback: string;
    assessedBy: string;
    assessedAt: Date;
  };
  
  /** Credential */
  credentialIssued: boolean;
  credentialId?: string;
  
  /** Status */
  status: 'active' | 'completed' | 'abandoned';
  
  /** Timestamps */
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectReflection {
  id: string;
  date: Date;
  prompt: string;
  response: string;
  authorId: string;
  authorName: string;
}

export interface PitchSubmission {
  id: string;
  projectInstanceId: string;
  
  /** Submission */
  presentationType: 'live' | 'recorded';
  recordingUrl?: string;
  slidesUrl?: string;
  supportingMaterials?: { name: string; url: string }[];
  
  /** Schedule (for live) */
  scheduledTime?: Date;
  duration: number; // minutes
  
  /** Audience */
  audienceType: 'class' | 'panel' | 'public' | 'industry';
  panelMembers?: { name: string; role: string }[];
  
  /** AI Practice */
  aiPracticeSessions: {
    sessionId: string;
    date: Date;
    feedback: string;
    scores: { criterion: string; score: number }[];
  }[];
  
  /** Assessment */
  assessments: PitchAssessment[];
  
  /** Status */
  status: 'preparing' | 'scheduled' | 'delivered' | 'assessed';
  submittedAt?: Date;
  deliveredAt?: Date;
}

export interface PitchAssessment {
  id: string;
  assessorId: string;
  assessorName: string;
  assessorType: 'teacher' | 'peer' | 'industry' | 'ai';
  
  rubricScores: { criterionId: string; score: number; comment?: string }[];
  totalScore: number;
  
  strengths: string[];
  improvements: string[];
  questions: string[];
  
  assessedAt: Date;
}

// ============================================================================
// SHARED TYPES
// ============================================================================

export interface AIFeedbackConfig {
  enabled: boolean;
  provideSuggestions: boolean;
  checkQuality: boolean;
  detectBias: boolean;
  enforceMinimumLength: boolean;
  minimumWords: number;
}

export interface CredentialIssuanceRequest {
  recipientId: string;
  recipientDid: string;
  credentialType: string;
  achievementData: Record<string, any>;
  issuedBy: string;
  evidence?: string[];
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const PHASE3_TYPES_VERSION = '1.0.0';
