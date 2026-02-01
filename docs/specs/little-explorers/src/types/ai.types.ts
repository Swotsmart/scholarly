/**
 * Little Explorers - AI Engine Types
 * 
 * The AI Engine is the "brain" of Little Explorers, designed to significantly
 * reduce cognitive load for teachers while creating engaging, personalized
 * experiences for young learners. It operates across all modules:
 * 
 * ## Teacher Cognitive Load Reduction
 * 
 * - Auto-suggests behaviour points based on observations
 * - Drafts parent communications with appropriate tone
 * - Tags portfolio items with curriculum codes
 * - Generates progress narratives and reports
 * - Predicts students needing attention
 * - Creates weekly summaries and insights
 * 
 * ## Student Engagement Enhancement
 * 
 * - Personalizes avatar rewards and celebrations
 * - Adapts activity difficulty
 * - Generates encouraging feedback
 * - Creates personalized learning paths
 * 
 * ## Safety & Compliance
 * 
 * - Monitors content for safeguarding concerns
 * - Detects sentiment issues in communications
 * - Flags potential wellbeing concerns
 * - Ensures content appropriateness
 * 
 * @module LittleExplorers/Types/AI
 */

import {
  AgeGroup, DevelopmentalArea, EntityStatus,
  Student, Classroom, Teacher, Parent
} from './core.types';
import {
  BehaviourSkill, ExplorerPoint, AIPointSuggestion,
  StudentBehaviourInsights, ClassroomBehaviourInsights
} from './behaviour.types';
import {
  StoryPost, Message, ContentAnalysis, AIMessageDraft,
  GeneratedDraft, DraftContext
} from './communication.types';
import {
  PortfolioItem, CurriculumTag, ProgressNarrative,
  DevelopmentalMilestone, ActivityResponse
} from './portfolio.types';

// ============================================================================
// AI PROVIDER CONFIGURATION
// ============================================================================

/**
 * AI Provider settings
 */
export interface AIProviderConfig {
  provider: 'anthropic' | 'openai' | 'azure_openai' | 'scholarly_internal';
  
  // Model selection
  models: {
    reasoning: string;      // For complex analysis
    generation: string;     // For content generation
    embedding: string;      // For similarity search
    moderation: string;     // For safety checks
    vision: string;         // For image analysis
  };
  
  // Rate limits
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
  };
  
  // Features enabled
  features: {
    behaviourSuggestions: boolean;
    communicationDrafts: boolean;
    portfolioAnalysis: boolean;
    progressNarratives: boolean;
    safeguardingMonitor: boolean;
    curriculumTagging: boolean;
    translationEnhancement: boolean;
    studentInsights: boolean;
    teacherAssistant: boolean;
    parentEngagement: boolean;
  };
  
  // Customization
  customInstructions?: string;
  schoolContext?: string;
  
  // Logging
  logInteractions: boolean;
  retainLogsForDays: number;
}

// ============================================================================
// AI CONTEXT & PROMPTS
// ============================================================================

/**
 * Context passed to AI for all operations
 */
export interface AIContext {
  // School context
  school: {
    id: string;
    name: string;
    type: string;
    jurisdiction: string;
    educationalPhilosophy?: string;
    customInstructions?: string;
  };
  
  // Classroom context
  classroom?: {
    id: string;
    name: string;
    grade: AgeGroup;
    studentCount: number;
    teacherNames: string[];
    currentTheme?: string;
  };
  
  // Student context (when applicable)
  student?: {
    id: string;
    firstName: string;
    age: number;
    grade: AgeGroup;
    learningStyle?: string;
    interests?: string[];
    supportNeeds?: string[];
    recentBehaviour?: string;
    recentProgress?: string;
  };
  
  // Parent context (when applicable)
  parent?: {
    id: string;
    firstName: string;
    preferredLanguage: string;
    communicationStyle?: string;
    engagementLevel?: string;
  };
  
  // Teacher context (when applicable)
  teacher?: {
    id: string;
    firstName: string;
    preferredTone: string;
    specializations?: string[];
  };
  
  // Time context
  timeContext: {
    currentTime: Date;
    dayOfWeek: string;
    periodOfDay: 'morning' | 'midday' | 'afternoon';
    termWeek?: number;
    specialEvent?: string;
  };
  
  // Recent interactions (for continuity)
  recentInteractions?: {
    type: string;
    summary: string;
    timestamp: Date;
  }[];
}

/**
 * AI prompt template
 */
export interface AIPromptTemplate {
  id: string;
  name: string;
  category: AIPromptCategory;
  
  // Template
  systemPrompt: string;
  userPromptTemplate: string;
  
  // Parameters
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'array' | 'object';
    required: boolean;
    description: string;
    default?: any;
  }[];
  
  // Output format
  outputFormat: 'text' | 'json' | 'structured';
  outputSchema?: Record<string, any>;
  
  // Settings
  temperature: number;
  maxTokens: number;
  
  // Versioning
  version: string;
  isActive: boolean;
}

export type AIPromptCategory =
  | 'behaviour_suggestion'
  | 'behaviour_insight'
  | 'communication_draft'
  | 'communication_analysis'
  | 'portfolio_analysis'
  | 'portfolio_caption'
  | 'curriculum_tagging'
  | 'progress_narrative'
  | 'activity_feedback'
  | 'milestone_detection'
  | 'safeguarding_check'
  | 'translation_enhancement'
  | 'teacher_assistant'
  | 'parent_engagement'
  | 'celebration_message';

// ============================================================================
// AI BEHAVIOUR ANALYSIS
// ============================================================================

/**
 * Input for generating behaviour point suggestions
 */
export interface BehaviourSuggestionInput {
  tenantId: string;
  classroomId: string;
  
  // Trigger
  trigger: BehaviourSuggestionTrigger;
  
  // Context
  context: AIContext;
  
  // Observation (if applicable)
  observation?: {
    text: string;
    studentIds?: string[];
    activityType?: string;
    location?: string;
  };
  
  // Recent points (for context)
  recentPoints?: {
    studentId: string;
    skillId: string;
    timestamp: Date;
  }[];
  
  // Available skills
  availableSkills: BehaviourSkill[];
  
  // Settings
  maxSuggestions?: number;
  minConfidence?: number;
}

export type BehaviourSuggestionTrigger =
  | 'teacher_observation'
  | 'activity_completed'
  | 'periodic_check'
  | 'transition_moment'
  | 'pattern_detected'
  | 'manual_request';

/**
 * Output from behaviour suggestion AI
 */
export interface BehaviourSuggestionOutput {
  suggestions: AIPointSuggestion[];
  reasoning: string;
  patterns?: string[];
  alerts?: string[];
  processingTime: number;
}

/**
 * Input for generating student behaviour insights
 */
export interface StudentInsightInput {
  tenantId: string;
  studentId: string;
  
  // Context
  context: AIContext;
  
  // Data
  behaviourHistory: ExplorerPoint[];
  portfolioHighlights?: PortfolioItem[];
  attendanceData?: { present: number; absent: number; late: number };
  
  // Period
  periodDays: number;
  
  // Comparison data
  classAverages?: {
    totalPoints: number;
    skillBreakdown: Record<string, number>;
  };
}

/**
 * Output from student insight AI
 */
export interface StudentInsightOutput {
  insights: StudentBehaviourInsights;
  parentMessage: string;
  teacherRecommendations: string[];
  celebrationOpportunities: string[];
  concernFlags: string[];
  confidence: number;
  processingTime: number;
}

/**
 * Input for generating classroom insights
 */
export interface ClassroomInsightInput {
  tenantId: string;
  classroomId: string;
  
  // Context
  context: AIContext;
  
  // Data
  allStudentPoints: Map<string, ExplorerPoint[]>;
  groupData?: {
    groupId: string;
    groupName: string;
    memberIds: string[];
    totalPoints: number;
  }[];
  
  // Period
  periodDays: number;
}

/**
 * Output from classroom insight AI
 */
export interface ClassroomInsightOutput {
  insights: ClassroomBehaviourInsights;
  weeklyDigest: string;
  actionItems: string[];
  celebrations: { studentId: string; reason: string }[];
  concerns: { studentId: string; reason: string; urgency: 'low' | 'medium' | 'high' }[];
  processingTime: number;
}

// ============================================================================
// AI COMMUNICATION ASSISTANCE
// ============================================================================

/**
 * Input for generating message drafts
 */
export interface MessageDraftInput {
  tenantId: string;
  teacherId: string;
  
  // Context
  context: AIContext;
  
  // Draft context
  draftContext: DraftContext;
  
  // Conversation history (if reply)
  conversationHistory?: {
    role: 'teacher' | 'parent';
    content: string;
    timestamp: Date;
  }[];
  
  // Student data (if about a student)
  studentData?: {
    recentPoints: ExplorerPoint[];
    recentPortfolio: PortfolioItem[];
    recentMilestones: string[];
  };
  
  // Settings
  numberOfDrafts: number;
  maxLength: number;
}

/**
 * Output from message draft AI
 */
export interface MessageDraftOutput {
  drafts: GeneratedDraft[];
  suggestedSubject?: string;
  toneAnalysis: {
    professional: number;
    warm: number;
    urgent: number;
  };
  keyPointsCovered: string[];
  processingTime: number;
}

/**
 * Input for analyzing message content
 */
export interface MessageAnalysisInput {
  tenantId: string;
  messageContent: string;
  senderRole: 'teacher' | 'parent';
  context: AIContext;
}

/**
 * Output from message analysis AI
 */
export interface MessageAnalysisOutput {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'concerning';
  sentimentScore: number;
  tone: string;
  keyTopics: string[];
  actionItemsDetected: string[];
  safeguardingFlags: string[];
  suggestedResponseTone: string;
  urgency: 'low' | 'normal' | 'high';
  processingTime: number;
}

/**
 * Input for content caption generation
 */
export interface CaptionGenerationInput {
  tenantId: string;
  
  // Content
  contentType: 'photo' | 'video' | 'activity';
  contentUrl?: string;
  contentDescription?: string;
  
  // Context
  context: AIContext;
  
  // Tagged students
  taggedStudentNames?: string[];
  
  // Settings
  tone: 'celebratory' | 'informative' | 'playful' | 'educational';
  maxLength: number;
  includeEmoji: boolean;
  includeLearningConnection: boolean;
}

/**
 * Output from caption generation AI
 */
export interface CaptionGenerationOutput {
  caption: string;
  alternativeCaptions: string[];
  suggestedEmoji: string[];
  detectedActivities: string[];
  learningConnections: string[];
  processingTime: number;
}

// ============================================================================
// AI PORTFOLIO ANALYSIS
// ============================================================================

/**
 * Input for portfolio item analysis
 */
export interface PortfolioAnalysisInput {
  tenantId: string;
  
  // Item
  itemType: string;
  content: {
    mediaUrls?: string[];
    text?: string;
    drawingData?: string;
  };
  
  // Context
  context: AIContext;
  
  // Existing data
  existingTags?: CurriculumTag[];
  teacherObservation?: string;
  
  // Settings
  curriculumFrameworks: string[];
  developmentalAreasToTrack: DevelopmentalArea[];
}

/**
 * Output from portfolio analysis AI
 */
export interface PortfolioAnalysisOutput {
  description: string;
  detectedElements: string[];
  
  // Curriculum
  suggestedCurriculumTags: CurriculumTag[];
  curriculumConfidence: number;
  
  // Development
  developmentalObservations: string[];
  suggestedDevelopmentalAreas: DevelopmentalArea[];
  developmentalConfidence: number;
  
  // Skills
  skillsDemonstrated: string[];
  
  // Quality
  qualityScore: number;
  qualityNotes: string;
  
  // Highlight
  highlightRecommendation: boolean;
  highlightReason?: string;
  
  // Milestone detection
  potentialMilestones: {
    milestoneId: string;
    milestoneName: string;
    confidence: number;
    evidence: string;
  }[];
  
  processingTime: number;
}

/**
 * Input for progress narrative generation
 */
export interface ProgressNarrativeInput {
  tenantId: string;
  studentId: string;
  
  // Context
  context: AIContext;
  
  // Data
  portfolioItems: PortfolioItem[];
  behaviourSummary: {
    totalPoints: number;
    topSkills: string[];
    trend: string;
  };
  milestones: {
    achieved: string[];
    inProgress: string[];
  };
  attendanceSummary?: {
    rate: number;
    trend: string;
  };
  
  // Period
  periodStart: Date;
  periodEnd: Date;
  
  // Settings
  audience: 'teacher' | 'parent' | 'formal_report';
  tone: 'formal' | 'warm' | 'celebratory';
  maxLength: number;
  focusAreas?: string[];
}

/**
 * Output from progress narrative AI
 */
export interface ProgressNarrativeOutput {
  narrative: ProgressNarrative;
  keyHighlights: string[];
  suggestedGoals: string[];
  parentTalkingPoints: string[];
  processingTime: number;
}

// ============================================================================
// AI ACTIVITY & FEEDBACK
// ============================================================================

/**
 * Input for generating activity feedback
 */
export interface ActivityFeedbackInput {
  tenantId: string;
  
  // Activity
  activity: {
    title: string;
    instructions: string;
    type: string;
  };
  
  // Response
  response: {
    type: string;
    content: any;
  };
  
  // Context
  context: AIContext;
  
  // Settings
  feedbackType: 'encouraging' | 'instructional' | 'celebratory';
  audienceAge: number;
  includeNextSteps: boolean;
}

/**
 * Output from activity feedback AI
 */
export interface ActivityFeedbackOutput {
  feedback: string;
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
  encouragement: string;
  detectedSkills: string[];
  processingTime: number;
}

// ============================================================================
// AI SAFEGUARDING
// ============================================================================

/**
 * Input for safeguarding content check
 */
export interface SafeguardingCheckInput {
  tenantId: string;
  
  // Content
  contentType: 'text' | 'image' | 'video';
  content: string;  // Text or URL
  
  // Context
  context: {
    source: 'message' | 'story' | 'portfolio' | 'observation';
    authorRole: string;
    relatedStudentIds?: string[];
  };
  
  // Keywords to monitor
  customKeywords?: string[];
}

/**
 * Output from safeguarding check AI
 */
export interface SafeguardingCheckOutput {
  safe: boolean;
  severity: 'none' | 'low' | 'medium' | 'high' | 'critical';
  
  flags: {
    type: string;
    description: string;
    confidence: number;
  }[];
  
  recommendedAction: 'none' | 'flag_for_review' | 'block' | 'alert_admin';
  
  explanation: string;
  processingTime: number;
}

// ============================================================================
// AI ENGAGEMENT & CELEBRATION
// ============================================================================

/**
 * Input for generating celebration content
 */
export interface CelebrationContentInput {
  tenantId: string;
  studentId: string;
  
  // Achievement
  achievementType: 'milestone' | 'points' | 'streak' | 'improvement' | 'activity';
  achievementDetails: string;
  
  // Context
  context: AIContext;
  
  // Settings
  tone: 'exciting' | 'proud' | 'warm';
  includeEmoji: boolean;
  forDisplay: 'student' | 'parent' | 'class';
}

/**
 * Output from celebration content AI
 */
export interface CelebrationContentOutput {
  title: string;
  message: string;
  emoji: string;
  encouragement: string;
  sharableText: string;  // For parent sharing
  suggestedNextChallenge?: string;
  processingTime: number;
}

/**
 * Input for personalized learning recommendations
 */
export interface LearningRecommendationInput {
  tenantId: string;
  studentId: string;
  
  // Context
  context: AIContext;
  
  // Student data
  learningProfile: {
    strengths: string[];
    challenges: string[];
    interests: string[];
    recentActivities: string[];
  };
  
  // Goals
  currentGoals: string[];
  
  // Settings
  recommendationType: 'activity' | 'resource' | 'strategy';
  count: number;
}

/**
 * Output from learning recommendation AI
 */
export interface LearningRecommendationOutput {
  recommendations: {
    type: string;
    title: string;
    description: string;
    rationale: string;
    difficulty: 'easy' | 'moderate' | 'challenging';
    estimatedMinutes: number;
    alignedGoals: string[];
  }[];
  personalizationNotes: string;
  processingTime: number;
}

// ============================================================================
// AI SERVICE INTERFACE
// ============================================================================

/**
 * Core AI service interface
 */
export interface AIService {
  // Configuration
  configure(config: Partial<AIProviderConfig>): void;
  getConfig(): AIProviderConfig;
  
  // Behaviour
  generateBehaviourSuggestions(input: BehaviourSuggestionInput): Promise<BehaviourSuggestionOutput>;
  generateStudentInsights(input: StudentInsightInput): Promise<StudentInsightOutput>;
  generateClassroomInsights(input: ClassroomInsightInput): Promise<ClassroomInsightOutput>;
  
  // Communication
  generateMessageDrafts(input: MessageDraftInput): Promise<MessageDraftOutput>;
  analyzeMessage(input: MessageAnalysisInput): Promise<MessageAnalysisOutput>;
  generateCaption(input: CaptionGenerationInput): Promise<CaptionGenerationOutput>;
  
  // Portfolio
  analyzePortfolioItem(input: PortfolioAnalysisInput): Promise<PortfolioAnalysisOutput>;
  generateProgressNarrative(input: ProgressNarrativeInput): Promise<ProgressNarrativeOutput>;
  
  // Activity
  generateActivityFeedback(input: ActivityFeedbackInput): Promise<ActivityFeedbackOutput>;
  
  // Safety
  checkSafeguarding(input: SafeguardingCheckInput): Promise<SafeguardingCheckOutput>;
  
  // Engagement
  generateCelebrationContent(input: CelebrationContentInput): Promise<CelebrationContentOutput>;
  generateLearningRecommendations(input: LearningRecommendationInput): Promise<LearningRecommendationOutput>;
  
  // Translation enhancement
  enhanceTranslation(text: string, sourceLang: string, targetLang: string, context: string): Promise<string>;
  
  // Batch operations
  batchProcess<I, O>(inputs: I[], processor: (input: I) => Promise<O>, concurrency?: number): Promise<O[]>;
}

// ============================================================================
// AI INTERACTION LOGGING
// ============================================================================

/**
 * Log of an AI interaction
 */
export interface AIInteractionLog {
  id: string;
  tenantId: string;
  
  // Request
  requestType: AIPromptCategory;
  requestTimestamp: Date;
  inputSummary: string;
  inputTokens: number;
  
  // Response
  responseTimestamp: Date;
  outputSummary: string;
  outputTokens: number;
  
  // Performance
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  
  // Usage
  model: string;
  cost?: number;
  
  // Context
  userId?: string;
  classroomId?: string;
  studentId?: string;
  
  // Feedback
  feedback?: {
    helpful: boolean;
    edited: boolean;
    rejected: boolean;
    comments?: string;
  };
}

/**
 * AI usage statistics
 */
export interface AIUsageStats {
  tenantId: string;
  period: { start: Date; end: Date };
  
  // Totals
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  
  // By category
  byCategory: {
    category: AIPromptCategory;
    count: number;
    tokens: number;
    cost: number;
  }[];
  
  // Quality
  successRate: number;
  averageLatencyMs: number;
  feedbackPositiveRate: number;
  
  // Limits
  limitWarnings: string[];
}
