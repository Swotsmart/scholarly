/**
 * Little Explorers - Portfolio System Types
 * 
 * The Portfolio System captures and showcases student work, creating a
 * rich digital record of their learning journey. It supports:
 * 
 * - Media capture (photos, videos, audio, drawings)
 * - Activity assignments and responses
 * - Teacher observations and notes
 * - Milestone tracking
 * - Parent sharing with approval workflows
 * - Curriculum alignment and tagging
 * 
 * ## AI Integration
 * 
 * The system uses AI to:
 * - Auto-tag content with curriculum codes
 * - Generate captions and descriptions
 * - Detect developmental milestones
 * - Create progress narratives
 * - Suggest portfolio highlights for reports
 * - Identify patterns across student work
 * 
 * @module LittleExplorers/Types/Portfolio
 */

import {
  Result, success, failure,
  ValidationError, NotFoundError, ConsentRequiredError,
  AgeGroup, EntityStatus, Paginated, PaginationOptions, DateRange,
  generateId, Validator, ConsentType
} from './core.types';
import { LearningConnection } from './communication.types';

// ============================================================================
// PORTFOLIO ITEM TYPES
// ============================================================================

/**
 * A single item in a student's portfolio
 */
export interface PortfolioItem {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  
  // Content
  type: PortfolioItemType;
  title: string;
  description?: string;
  content: PortfolioContent;
  
  // Context
  context: PortfolioContext;
  
  // Curriculum alignment
  curriculumTags: CurriculumTag[];
  developmentalAreas: DevelopmentalArea[];
  
  // AI analysis
  aiAnalysis?: PortfolioItemAIAnalysis;
  
  // Approval workflow
  approvalStatus: 'pending' | 'approved' | 'needs_review' | 'private';
  approvedBy?: string;
  approvedAt?: Date;
  reviewNotes?: string;
  
  // Visibility
  visibleToParent: boolean;
  sharedToStory: boolean;
  storyPostId?: string;
  
  // Highlighting
  isHighlight: boolean;
  highlightReason?: string;
  highlightedBy?: string;
  
  // Created by
  createdBy: string;
  createdByRole: 'teacher' | 'assistant' | 'student' | 'ai';
  
  // Parent engagement
  parentViewed: boolean;
  parentViewedAt?: Date;
  parentReaction?: PortfolioReaction;
  parentComment?: string;
  
  // Status
  status: EntityStatus;
  
  // Timestamps
  capturedAt: Date;  // When the work was done
  createdAt: Date;   // When it was added to portfolio
  updatedAt: Date;
}

export type PortfolioItemType = 
  | 'photo'
  | 'video'
  | 'audio'
  | 'drawing'
  | 'writing'
  | 'document'
  | 'activity_response'
  | 'observation'
  | 'milestone'
  | 'assessment';

/**
 * Content of a portfolio item
 */
export interface PortfolioContent {
  // Media
  media?: PortfolioMedia[];
  
  // Text content (for writing, observations)
  text?: string;
  formattedText?: string;
  
  // Drawing
  drawingData?: {
    dataUrl: string;  // Base64 or URL
    canvasWidth: number;
    canvasHeight: number;
    backgroundColor: string;
    strokes?: any[];  // For replay capability
  };
  
  // Document
  document?: {
    url: string;
    name: string;
    type: string;
    size: number;
    pageCount?: number;
    thumbnailUrl?: string;
  };
  
  // Activity response
  activityResponse?: {
    activityId: string;
    activityTitle: string;
    responseType: 'text' | 'drawing' | 'photo' | 'video' | 'audio' | 'choice';
    response: any;
    completedAt: Date;
  };
  
  // Assessment data
  assessmentData?: {
    assessmentType: string;
    criteria: { name: string; level: string; notes?: string }[];
    overallLevel?: string;
    teacherNotes?: string;
  };
}

/**
 * Media file in portfolio
 */
export interface PortfolioMedia {
  id: string;
  type: 'photo' | 'video' | 'audio';
  
  // URLs
  url: string;
  thumbnailUrl?: string;
  
  // Metadata
  width?: number;
  height?: number;
  duration?: number;  // Seconds for video/audio
  fileSize: number;
  mimeType: string;
  
  // Processing
  processingStatus: 'pending' | 'processing' | 'ready' | 'failed';
  
  // AI caption
  aiCaption?: string;
  aiTags?: string[];
  
  // Transcription (for audio/video)
  transcription?: string;
  
  // Uploaded
  uploadedAt: Date;
}

/**
 * Context for a portfolio item
 */
export interface PortfolioContext {
  // When/where
  activityType?: string;
  activityName?: string;
  location?: 'classroom' | 'playground' | 'art_room' | 'library' | 'excursion' | 'home' | 'other';
  customLocation?: string;
  
  // Who was involved
  involvedStudentIds?: string[];  // For group work
  involvedTeacherIds?: string[];
  
  // Teacher observation
  teacherObservation?: string;
  
  // Prompts used
  prompt?: string;
  
  // Linked items
  linkedPortfolioItems?: string[];
  linkedBehaviourPoints?: string[];
}

/**
 * Curriculum tag for a portfolio item
 */
export interface CurriculumTag {
  framework: CurriculumFramework;
  code: string;
  description: string;
  area: string;
  aiConfidence?: number;
  manuallyAdded: boolean;
}

export type CurriculumFramework = 
  | 'EYLF'           // Australian Early Years Learning Framework
  | 'NQS'            // National Quality Standard (Australia)
  | 'ACARA_F'        // Australian Curriculum Foundation
  | 'EYFS'           // Early Years Foundation Stage (UK)
  | 'CCSS_K'         // Common Core State Standards Kindergarten (US)
  | 'HEAD_START'     // Head Start Early Learning Outcomes (US)
  | 'TE_WHARIKI'     // Te Whāriki (New Zealand)
  | 'CUSTOM';

/**
 * Developmental areas for tracking
 */
export type DevelopmentalArea =
  | 'physical_gross_motor'
  | 'physical_fine_motor'
  | 'cognitive_problem_solving'
  | 'cognitive_memory'
  | 'cognitive_attention'
  | 'language_receptive'
  | 'language_expressive'
  | 'language_literacy'
  | 'social_emotional_self'
  | 'social_emotional_relationships'
  | 'social_emotional_regulation'
  | 'creative_arts'
  | 'creative_imagination'
  | 'numeracy'
  | 'scientific_thinking';

/**
 * AI analysis of a portfolio item
 */
export interface PortfolioItemAIAnalysis {
  // Content analysis
  description: string;
  detectedElements: string[];
  
  // Curriculum alignment
  suggestedCurriculumTags: CurriculumTag[];
  suggestedDevelopmentalAreas: DevelopmentalArea[];
  
  // Developmental observations
  developmentalObservations: string[];
  skillsDemonstrated: string[];
  
  // Progress indicators
  progressIndicators?: {
    area: string;
    indicator: string;
    confidence: number;
  }[];
  
  // Quality assessment
  qualityScore: number;
  suggestedImprovements?: string[];
  
  // Highlight recommendation
  recommendAsHighlight: boolean;
  highlightReason?: string;
  
  // Similar items
  similarItemIds?: string[];
  
  analyzedAt: Date;
}

/**
 * Parent reaction to portfolio item
 */
export interface PortfolioReaction {
  type: 'love' | 'proud' | 'amazing' | 'wow';
  emoji: string;
  reactedAt: Date;
}

// ============================================================================
// ACTIVITY TYPES
// ============================================================================

/**
 * An activity that students can respond to
 */
export interface PortfolioActivity {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId?: string;  // null = school library
  
  // Details
  title: string;
  description: string;
  instructions?: string;
  
  // Type
  type: ActivityType;
  responseTypes: ActivityResponseType[];
  
  // Content
  content: ActivityContent;
  
  // Target
  targetAgeGroups: AgeGroup[];
  targetStudentIds?: string[];  // null = whole class
  
  // Curriculum
  curriculumTags: CurriculumTag[];
  developmentalAreas: DevelopmentalArea[];
  
  // Timing
  dueDate?: Date;
  estimatedMinutes?: number;
  
  // Settings
  settings: ActivitySettings;
  
  // AI configuration
  aiConfig?: ActivityAIConfig;
  
  // Responses
  responseCount: number;
  completedCount: number;
  
  // Status
  status: 'draft' | 'active' | 'closed' | 'archived';
  
  // Created by
  createdBy: string;
  createdByName: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type ActivityType =
  | 'creative'      // Open-ended creative response
  | 'question'      // Answer a question
  | 'reflection'    // Reflect on learning
  | 'show_tell'     // Show and tell
  | 'challenge'     // Complete a challenge
  | 'journal'       // Journal entry
  | 'reading_log'   // Reading response
  | 'assessment';   // Formal assessment

export type ActivityResponseType = 
  | 'text'
  | 'drawing'
  | 'photo'
  | 'video'
  | 'audio'
  | 'choice'
  | 'checklist';

/**
 * Content of an activity
 */
export interface ActivityContent {
  // Prompt/question
  prompt: string;
  
  // Supporting media
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    thumbnailUrl?: string;
  }[];
  
  // For choice activities
  choices?: {
    id: string;
    text: string;
    imageUrl?: string;
    isCorrect?: boolean;
  }[];
  
  // For checklist activities
  checklistItems?: {
    id: string;
    text: string;
    required: boolean;
  }[];
  
  // Template/starter (for drawing)
  drawingTemplate?: {
    backgroundUrl?: string;
    starterElements?: any[];
  };
  
  // Word bank (for writing)
  wordBank?: string[];
  
  // Example (teacher demo)
  exampleResponse?: {
    type: ActivityResponseType;
    content: any;
  };
}

/**
 * Settings for an activity
 */
export interface ActivitySettings {
  allowMultipleSubmissions: boolean;
  allowRevisions: boolean;
  requireApproval: boolean;
  autoShareToParent: boolean;
  autoShareToStory: boolean;
  
  // Response settings
  minResponseLength?: number;
  maxResponseLength?: number;
  maxMediaItems?: number;
  
  // Drawing settings
  drawingColors?: string[];
  drawingTools?: ('pen' | 'brush' | 'eraser' | 'fill' | 'shapes' | 'stickers')[];
  
  // Feedback
  showCorrectAnswers?: boolean;
  provideFeedback: boolean;
  
  // Gamification
  awardPointsOnCompletion: boolean;
  pointsSkillId?: string;
  pointsAmount?: number;
}

/**
 * AI configuration for activity
 */
export interface ActivityAIConfig {
  autoGenerateFeedback: boolean;
  autoTagCurriculum: boolean;
  autoDetectMilestones: boolean;
  feedbackTone: 'encouraging' | 'instructional' | 'celebratory';
  feedbackLanguageLevel: 'child' | 'parent';
}

/**
 * A student's response to an activity
 */
export interface ActivityResponse {
  id: string;
  tenantId: string;
  activityId: string;
  studentId: string;
  
  // Response content
  responseType: ActivityResponseType;
  content: ActivityResponseContent;
  
  // For choice/checklist
  selectedChoices?: string[];
  checkedItems?: string[];
  
  // Completion
  completionStatus: 'in_progress' | 'submitted' | 'needs_revision' | 'completed';
  
  // Teacher feedback
  teacherFeedback?: {
    text: string;
    rating?: number;
    givenBy: string;
    givenAt: Date;
  };
  
  // AI feedback
  aiFeedback?: {
    text: string;
    suggestions?: string[];
    detectedMilestones?: string[];
    generatedAt: Date;
  };
  
  // Points awarded
  pointsAwarded: boolean;
  pointId?: string;
  
  // Portfolio link
  portfolioItemId?: string;
  
  // Timestamps
  startedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Content of an activity response
 */
export interface ActivityResponseContent {
  // Text response
  text?: string;
  
  // Drawing response
  drawing?: {
    dataUrl: string;
    canvasData?: any;
  };
  
  // Media response
  media?: PortfolioMedia[];
  
  // Audio response
  audio?: {
    url: string;
    duration: number;
    transcription?: string;
  };
}

// ============================================================================
// OBSERVATION & MILESTONE TYPES
// ============================================================================

/**
 * A teacher observation (not tied to specific work)
 */
export interface TeacherObservation {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  
  // Who
  studentIds: string[];
  
  // What
  observation: string;
  
  // Context
  context: {
    activityType?: string;
    location?: string;
    groupSize?: 'individual' | 'small_group' | 'whole_class';
    duration?: string;
  };
  
  // Classification
  type: ObservationType;
  developmentalAreas: DevelopmentalArea[];
  curriculumTags: CurriculumTag[];
  
  // AI enhancement
  aiEnhanced: boolean;
  aiSuggestions?: {
    additionalTags: CurriculumTag[];
    relatedMilestones: string[];
    followUpSuggestions: string[];
  };
  
  // Media
  media?: PortfolioMedia[];
  
  // Status
  convertedToPortfolioItem: boolean;
  portfolioItemId?: string;
  
  // Created by
  observedBy: string;
  observedByName: string;
  
  // Timestamps
  observedAt: Date;
  createdAt: Date;
}

export type ObservationType =
  | 'anecdotal'
  | 'running_record'
  | 'learning_story'
  | 'checklist'
  | 'time_sample'
  | 'event_sample'
  | 'quick_note';

/**
 * A developmental milestone
 */
export interface DevelopmentalMilestone {
  id: string;
  framework: CurriculumFramework;
  
  // Details
  name: string;
  description: string;
  indicators: string[];
  
  // Classification
  area: DevelopmentalArea;
  ageRange: {
    minMonths: number;
    maxMonths: number;
  };
  
  // Prerequisites
  prerequisiteMilestones?: string[];
  
  // Next steps
  nextMilestones?: string[];
  
  // Teaching strategies
  supportStrategies: string[];
  
  // Active
  isActive: boolean;
}

/**
 * A student's milestone achievement
 */
export interface StudentMilestone {
  id: string;
  tenantId: string;
  studentId: string;
  milestoneId: string;
  
  // Status
  status: 'not_started' | 'emerging' | 'developing' | 'achieved';
  
  // Evidence
  evidenceItems: {
    portfolioItemId: string;
    relevance: string;
    addedAt: Date;
  }[];
  
  // Notes
  teacherNotes?: string;
  
  // AI detection
  aiDetected: boolean;
  aiConfidence?: number;
  
  // Dates
  firstObservedAt?: Date;
  achievedAt?: Date;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// PROGRESS & REPORTING TYPES
// ============================================================================

/**
 * Student progress summary
 */
export interface StudentProgressSummary {
  studentId: string;
  studentName: string;
  period: DateRange;
  
  // Portfolio stats
  portfolioStats: {
    totalItems: number;
    itemsByType: { [type: string]: number };
    highlights: number;
    parentViews: number;
    parentReactions: number;
  };
  
  // Activity stats
  activityStats: {
    assigned: number;
    completed: number;
    completionRate: number;
  };
  
  // Developmental progress
  developmentalProgress: {
    area: DevelopmentalArea;
    milestonesAchieved: number;
    milestonesTotal: number;
    trend: 'ahead' | 'on_track' | 'needs_support';
  }[];
  
  // Curriculum coverage
  curriculumCoverage: {
    framework: CurriculumFramework;
    area: string;
    tagCount: number;
    percentage: number;
  }[];
  
  // Behaviour integration
  behaviourSummary?: {
    totalPoints: number;
    topSkills: string[];
    trend: string;
  };
  
  // AI narrative
  aiNarrative?: ProgressNarrative;
  
  // Generated
  generatedAt: Date;
}

/**
 * AI-generated progress narrative
 */
export interface ProgressNarrative {
  // For teachers
  teacherSummary: string;
  keyObservations: string[];
  areasOfStrength: string[];
  areasForGrowth: string[];
  suggestedNextSteps: string[];
  
  // For parents (different tone/language)
  parentSummary: string;
  parentHighlights: string[];
  parentSuggestions: string[];
  
  // For reports
  formalNarrative: string;
  
  // Metadata
  basedOnItemCount: number;
  confidenceLevel: number;
  generatedAt: Date;
}

/**
 * Portfolio report for sharing with parents
 */
export interface PortfolioReport {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  
  // Report details
  title: string;
  period: DateRange;
  type: 'weekly' | 'monthly' | 'term' | 'semester' | 'annual' | 'custom';
  
  // Content
  summary: string;
  highlights: PortfolioItem[];
  progressSummary: StudentProgressSummary;
  
  // Teacher comments
  teacherComments: string;
  goalsForNextPeriod: string[];
  
  // AI generated
  aiGenerated: boolean;
  aiNarrative?: ProgressNarrative;
  
  // Sharing
  sharedWithParent: boolean;
  sharedAt?: Date;
  parentViewed: boolean;
  parentViewedAt?: Date;
  
  // PDF generation
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  
  // Created by
  createdBy: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// STUDENT LOGIN & PORTFOLIO ACCESS
// ============================================================================

/**
 * Student's portfolio view configuration
 */
export interface StudentPortfolioAccess {
  studentId: string;
  
  // Login method
  loginMethod: 'qr_code' | 'text_code' | 'picture_password' | 'parent_device';
  loginCode?: string;
  picturePassword?: string[];  // IDs of pictures in sequence
  
  // Access permissions
  canViewOwnPortfolio: boolean;
  canAddPhotos: boolean;
  canAddDrawings: boolean;
  canAddVoiceRecordings: boolean;
  canRespondToActivities: boolean;
  canViewClassStory: boolean;
  canViewOwnPoints: boolean;
  
  // Session
  currentSessionId?: string;
  lastAccessedAt?: Date;
  accessHistory: {
    deviceId: string;
    accessedAt: Date;
    duration: number;
  }[];
  
  // Parental controls
  maxSessionMinutes: number;
  allowedHours?: { start: string; end: string };
}

/**
 * Student portfolio session
 */
export interface StudentPortfolioSession {
  id: string;
  studentId: string;
  
  // Device
  deviceId: string;
  deviceType: 'tablet' | 'phone' | 'computer';
  
  // Activity
  startedAt: Date;
  endedAt?: Date;
  duration: number;
  
  // Actions
  itemsViewed: string[];
  itemsCreated: string[];
  activitiesCompleted: string[];
  pointsEarned: number;
  
  // Status
  status: 'active' | 'ended' | 'timed_out';
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface PortfolioItemRepository {
  findById(tenantId: string, id: string): Promise<PortfolioItem | null>;
  findByStudent(tenantId: string, studentId: string, options?: {
    types?: PortfolioItemType[];
    dateRange?: DateRange;
    highlightsOnly?: boolean;
    pagination?: PaginationOptions;
  }): Promise<Paginated<PortfolioItem>>;
  findByClassroom(tenantId: string, classroomId: string, options?: {
    dateRange?: DateRange;
    pendingApprovalOnly?: boolean;
    pagination?: PaginationOptions;
  }): Promise<Paginated<PortfolioItem>>;
  
  create(item: Omit<PortfolioItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<PortfolioItem>;
  update(tenantId: string, id: string, updates: Partial<PortfolioItem>): Promise<PortfolioItem>;
  delete(tenantId: string, id: string): Promise<void>;
  
  approve(tenantId: string, id: string, approvedBy: string): Promise<PortfolioItem>;
  addParentReaction(tenantId: string, id: string, reaction: PortfolioReaction): Promise<void>;
  markParentViewed(tenantId: string, id: string): Promise<void>;
  setHighlight(tenantId: string, id: string, isHighlight: boolean, reason?: string): Promise<void>;
  
  getStudentProgress(tenantId: string, studentId: string, period: DateRange): Promise<StudentProgressSummary>;
}

export interface PortfolioActivityRepository {
  findById(tenantId: string, id: string): Promise<PortfolioActivity | null>;
  findByClassroom(tenantId: string, classroomId: string, options?: {
    status?: PortfolioActivity['status'];
    pagination?: PaginationOptions;
  }): Promise<Paginated<PortfolioActivity>>;
  findActiveForStudent(tenantId: string, studentId: string): Promise<PortfolioActivity[]>;
  
  create(activity: Omit<PortfolioActivity, 'id' | 'createdAt' | 'updatedAt' | 'responseCount' | 'completedCount'>): Promise<PortfolioActivity>;
  update(tenantId: string, id: string, updates: Partial<PortfolioActivity>): Promise<PortfolioActivity>;
  
  incrementResponseCount(tenantId: string, id: string): Promise<void>;
  incrementCompletedCount(tenantId: string, id: string): Promise<void>;
}

export interface ActivityResponseRepository {
  findById(tenantId: string, id: string): Promise<ActivityResponse | null>;
  findByActivity(tenantId: string, activityId: string): Promise<ActivityResponse[]>;
  findByStudent(tenantId: string, studentId: string, options?: {
    activityId?: string;
    status?: ActivityResponse['completionStatus'];
  }): Promise<ActivityResponse[]>;
  
  create(response: Omit<ActivityResponse, 'id' | 'createdAt' | 'updatedAt'>): Promise<ActivityResponse>;
  update(tenantId: string, id: string, updates: Partial<ActivityResponse>): Promise<ActivityResponse>;
  
  addTeacherFeedback(tenantId: string, id: string, feedback: ActivityResponse['teacherFeedback']): Promise<void>;
  addAIFeedback(tenantId: string, id: string, feedback: ActivityResponse['aiFeedback']): Promise<void>;
}

export interface TeacherObservationRepository {
  findById(tenantId: string, id: string): Promise<TeacherObservation | null>;
  findByStudent(tenantId: string, studentId: string, dateRange?: DateRange): Promise<TeacherObservation[]>;
  findByClassroom(tenantId: string, classroomId: string, dateRange?: DateRange): Promise<TeacherObservation[]>;
  
  create(observation: Omit<TeacherObservation, 'id' | 'createdAt'>): Promise<TeacherObservation>;
  update(tenantId: string, id: string, updates: Partial<TeacherObservation>): Promise<TeacherObservation>;
  
  convertToPortfolioItem(tenantId: string, id: string, portfolioItemId: string): Promise<void>;
}

export interface StudentMilestoneRepository {
  findByStudent(tenantId: string, studentId: string): Promise<StudentMilestone[]>;
  findByMilestone(tenantId: string, milestoneId: string, classroomId: string): Promise<StudentMilestone[]>;
  
  create(milestone: Omit<StudentMilestone, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentMilestone>;
  update(tenantId: string, id: string, updates: Partial<StudentMilestone>): Promise<StudentMilestone>;
  
  addEvidence(tenantId: string, id: string, evidence: StudentMilestone['evidenceItems'][0]): Promise<void>;
  updateStatus(tenantId: string, id: string, status: StudentMilestone['status']): Promise<void>;
}

export interface PortfolioReportRepository {
  findById(tenantId: string, id: string): Promise<PortfolioReport | null>;
  findByStudent(tenantId: string, studentId: string): Promise<PortfolioReport[]>;
  findByClassroom(tenantId: string, classroomId: string, options?: {
    type?: PortfolioReport['type'];
    period?: DateRange;
  }): Promise<PortfolioReport[]>;
  
  create(report: Omit<PortfolioReport, 'id' | 'createdAt' | 'updatedAt'>): Promise<PortfolioReport>;
  update(tenantId: string, id: string, updates: Partial<PortfolioReport>): Promise<PortfolioReport>;
  
  markShared(tenantId: string, id: string): Promise<void>;
  markParentViewed(tenantId: string, id: string): Promise<void>;
  setPdfUrl(tenantId: string, id: string, url: string): Promise<void>;
}

// ============================================================================
// INPUT/OUTPUT TYPES
// ============================================================================

export interface AddPortfolioItemInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  createdBy: string;
  
  type: PortfolioItemType;
  title: string;
  description?: string;
  
  // Content (one of these)
  media?: Omit<PortfolioMedia, 'id' | 'uploadedAt'>[];
  text?: string;
  drawingData?: PortfolioContent['drawingData'];
  document?: PortfolioContent['document'];
  
  // Context
  context?: Partial<PortfolioContext>;
  capturedAt?: Date;
  
  // Options
  autoApprove?: boolean;
  shareToStory?: boolean;
  setAsHighlight?: boolean;
  
  // AI options
  analyzeContent?: boolean;
  suggestCurriculumTags?: boolean;
}

export interface CreateActivityInput {
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  createdBy: string;
  
  title: string;
  description: string;
  instructions?: string;
  
  type: ActivityType;
  responseTypes: ActivityResponseType[];
  content: ActivityContent;
  
  targetAgeGroups: AgeGroup[];
  targetStudentIds?: string[];
  
  curriculumTags?: CurriculumTag[];
  developmentalAreas?: DevelopmentalArea[];
  
  dueDate?: Date;
  estimatedMinutes?: number;
  
  settings?: Partial<ActivitySettings>;
  aiConfig?: ActivityAIConfig;
  
  publishImmediately?: boolean;
}

export interface SubmitActivityResponseInput {
  tenantId: string;
  activityId: string;
  studentId: string;
  
  responseType: ActivityResponseType;
  content: Partial<ActivityResponseContent>;
  selectedChoices?: string[];
  checkedItems?: string[];
  
  submitAsFinal?: boolean;
  
  // AI options
  generateFeedback?: boolean;
}

export interface RecordObservationInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  observedBy: string;
  
  studentIds: string[];
  observation: string;
  type: ObservationType;
  
  context?: Partial<TeacherObservation['context']>;
  developmentalAreas?: DevelopmentalArea[];
  
  media?: Omit<PortfolioMedia, 'id' | 'uploadedAt'>[];
  
  // AI options
  enhanceWithAI?: boolean;
  createPortfolioItem?: boolean;
}

export interface GenerateProgressReportInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  createdBy: string;
  
  period: DateRange;
  type: PortfolioReport['type'];
  
  includeHighlights?: boolean;
  includeBehaviour?: boolean;
  includeAttendance?: boolean;
  
  teacherComments?: string;
  goalsForNextPeriod?: string[];
  
  // AI options
  generateNarrative?: boolean;
  narrativeTone?: 'formal' | 'warm' | 'celebratory';
  
  shareWithParent?: boolean;
  generatePdf?: boolean;
}
