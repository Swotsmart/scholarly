/**
 * Little Explorers - Behaviour System Types
 * 
 * The Behaviour Point System is the heart of Little Explorers' engagement model.
 * It provides real-time positive reinforcement, tracks student progress, and
 * creates a motivating environment for young learners.
 * 
 * ## AI Integration
 * 
 * The system uses AI to:
 * - Suggest appropriate points based on observed behaviours
 * - Detect patterns in student behaviour over time
 * - Generate insights for teachers about class dynamics
 * - Predict students who may need additional support
 * - Auto-generate celebration messages
 * 
 * @module LittleExplorers/Types/Behaviour
 */

import {
  Result, success, failure,
  ValidationError, NotFoundError, LittleExplorersError,
  AgeGroup, EntityStatus, Paginated, PaginationOptions, DateRange,
  generateId, Validator
} from './core.types';

// ============================================================================
// EXPLORER POINT SYSTEM
// ============================================================================

/**
 * A single point award to a student
 */
export interface ExplorerPoint {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  
  // Recipient
  studentId: string;
  studentName: string;  // Denormalized for display
  
  // Award details
  skillId: string;
  skillName: string;  // Denormalized
  skillEmoji: string; // Denormalized
  points: number;
  isPositive: boolean;
  
  // Context
  context?: PointContext;
  
  // AI involvement
  aiGenerated: boolean;
  aiSuggestionId?: string;
  aiConfidence?: number;
  
  // Who awarded
  awardedBy: string;
  awardedByName: string;
  awardedByRole: 'teacher' | 'assistant' | 'specialist' | 'school_admin' | 'ai';
  
  // Location (for school-wide points)
  location?: 'classroom' | 'playground' | 'cafeteria' | 'library' | 'assembly' | 'excursion' | 'other';
  customLocation?: string;
  
  // Notification status
  parentNotified: boolean;
  parentNotifiedAt?: Date;
  parentViewed: boolean;
  parentViewedAt?: Date;
  
  // Reactions
  reactions: PointReaction[];
  
  // Timestamps
  awardedAt: Date;
  createdAt: Date;
}

/**
 * Context for why a point was awarded
 */
export interface PointContext {
  description?: string;
  linkedActivityId?: string;
  linkedPortfolioItemId?: string;
  linkedAttendanceId?: string;
  tags: string[];
  
  // AI-extracted context
  aiExtractedBehaviours?: string[];
  aiSentiment?: 'very_positive' | 'positive' | 'neutral' | 'needs_attention';
}

/**
 * Parent/student reaction to a point
 */
export interface PointReaction {
  userId: string;
  type: 'like' | 'love' | 'celebrate' | 'proud';
  reactedAt: Date;
}

// ============================================================================
// GROUP AWARDS
// ============================================================================

/**
 * Points awarded to a group of students
 */
export interface GroupAward {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  
  // Group type
  groupType: 'table_group' | 'custom_group' | 'whole_class' | 'selected_students';
  groupId?: string;  // For table groups
  groupName: string;
  
  // Students included
  studentIds: string[];
  
  // Award details
  skillId: string;
  skillName: string;
  skillEmoji: string;
  pointsPerStudent: number;
  totalPoints: number;
  isPositive: boolean;
  
  // Context
  reason?: string;
  context?: PointContext;
  
  // AI involvement
  aiGenerated: boolean;
  aiSuggestionId?: string;
  
  // Who awarded
  awardedBy: string;
  awardedByName: string;
  
  // Timestamps
  awardedAt: Date;
  createdAt: Date;
}

// ============================================================================
// BEHAVIOUR SKILLS CONFIGURATION
// ============================================================================

/**
 * Categories for organizing skills
 */
export enum SkillCategory {
  CORE_VALUES = 'core_values',
  SOCIAL_EMOTIONAL = 'social_emotional',
  ACADEMIC = 'academic',
  SELF_REGULATION = 'self_regulation',
  PHYSICAL = 'physical',
  CREATIVE = 'creative',
  COLLABORATION = 'collaboration',
  INDEPENDENCE = 'independence',
  CUSTOM = 'custom'
}

/**
 * A behaviour skill that can be awarded
 */
export interface BehaviourSkill {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId?: string;  // null = school-wide
  
  // Display
  name: string;
  emoji: string;
  description: string;
  
  // Classification
  category: SkillCategory;
  isPositive: boolean;
  
  // Points configuration
  defaultPoints: number;
  minPoints: number;
  maxPoints: number;
  
  // Age appropriateness
  ageGroups: AgeGroup[];
  
  // PBIS alignment
  pbisAlignment?: {
    tier: 1 | 2 | 3;
    expectation: string;
    setting?: string;
  };
  
  // AI configuration
  aiConfig: SkillAIConfig;
  
  // Usage
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  lastUsed?: Date;
  
  // Origin
  isSystem: boolean;
  isCustom: boolean;
  createdBy?: string;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * AI configuration for skill detection and suggestions
 */
export interface SkillAIConfig {
  // Keywords that trigger AI suggestions
  triggerKeywords: string[];
  
  // Phrases the AI looks for in observations
  observationPhrases: string[];
  
  // Context clues
  contextIndicators: string[];
  
  // Time-based patterns
  typicalTimes?: string[];  // "morning", "after_recess", etc.
  
  // Frequency expectations
  expectedFrequency: 'rare' | 'occasional' | 'regular' | 'frequent';
  
  // Related skills (for AI to suggest alternatives)
  relatedSkillIds: string[];
  
  // Auto-suggest threshold
  autoSuggestConfidence: number;  // 0-1
}

// ============================================================================
// DEFAULT SKILLS LIBRARY
// ============================================================================

export const DEFAULT_BEHAVIOUR_SKILLS: Omit<BehaviourSkill, 'id' | 'tenantId' | 'schoolId' | 'createdAt' | 'updatedAt'>[] = [
  // Core Values
  {
    name: 'Kind Hearts',
    emoji: '💖',
    description: 'Showed kindness to others',
    category: SkillCategory.CORE_VALUES,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [AgeGroup.TODDLER, AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['kind', 'nice', 'caring', 'thoughtful', 'considerate', 'gentle'],
      observationPhrases: ['helped a friend', 'shared with', 'comforted', 'included someone', 'said something nice'],
      contextIndicators: ['social interaction', 'helping', 'empathy'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8
    },
    isActive: true,
    sortOrder: 1,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Helping Hands',
    emoji: '🤝',
    description: 'Helped someone without being asked',
    category: SkillCategory.SOCIAL_EMOTIONAL,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['help', 'assist', 'support', 'volunteer'],
      observationPhrases: ['helped without asking', 'offered to help', 'assisted classmate', 'cleaned up'],
      contextIndicators: ['initiative', 'unprompted', 'helpful'],
      expectedFrequency: 'regular',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.85
    },
    isActive: true,
    sortOrder: 2,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Super Listener',
    emoji: '👂',
    description: 'Listened carefully and followed instructions',
    category: SkillCategory.SELF_REGULATION,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: [AgeGroup.TODDLER, AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['listen', 'attention', 'focus', 'follow instructions', 'paying attention'],
      observationPhrases: ['listened carefully', 'followed directions', 'paid attention', 'first time listening'],
      contextIndicators: ['carpet time', 'instructions', 'group activity'],
      typicalTimes: ['morning', 'after_transitions'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.75
    },
    isActive: true,
    sortOrder: 3,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Hard Worker',
    emoji: '💪',
    description: 'Worked hard and tried their best',
    category: SkillCategory.ACADEMIC,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['effort', 'try', 'persevere', 'work hard', 'persist', 'determination'],
      observationPhrases: ['tried really hard', 'kept going', 'didn\'t give up', 'put in effort', 'worked diligently'],
      contextIndicators: ['challenging task', 'learning activity', 'persistence'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8
    },
    isActive: true,
    sortOrder: 4,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Teamwork Star',
    emoji: '⭐',
    description: 'Worked well with others as a team',
    category: SkillCategory.COLLABORATION,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['team', 'together', 'cooperate', 'collaborate', 'share'],
      observationPhrases: ['worked together', 'cooperated with group', 'shared ideas', 'took turns'],
      contextIndicators: ['group work', 'team activity', 'collaborative'],
      expectedFrequency: 'regular',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8
    },
    isActive: true,
    sortOrder: 5,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Respectful',
    emoji: '🙏',
    description: 'Showed respect for others and belongings',
    category: SkillCategory.CORE_VALUES,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: [AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['respect', 'polite', 'manners', 'careful', 'considerate'],
      observationPhrases: ['said please and thank you', 'treated carefully', 'showed respect', 'used manners'],
      contextIndicators: ['materials', 'classroom', 'interactions'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.75
    },
    isActive: true,
    sortOrder: 6,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Brave Learner',
    emoji: '🦁',
    description: 'Tried something new or challenging',
    category: SkillCategory.INDEPENDENCE,
    isPositive: true,
    defaultPoints: 2,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [AgeGroup.TODDLER, AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['brave', 'try new', 'challenge', 'courage', 'risk'],
      observationPhrases: ['tried something new', 'faced a fear', 'stepped out of comfort zone', 'took a risk'],
      contextIndicators: ['new activity', 'challenging', 'first time'],
      expectedFrequency: 'occasional',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.85
    },
    isActive: true,
    sortOrder: 7,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Creative Mind',
    emoji: '🎨',
    description: 'Showed creativity and imagination',
    category: SkillCategory.CREATIVE,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [AgeGroup.TODDLER, AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['creative', 'imagine', 'invent', 'original', 'artistic'],
      observationPhrases: ['made something creative', 'used imagination', 'thought of a new way', 'creative solution'],
      contextIndicators: ['art', 'building', 'problem solving', 'play'],
      expectedFrequency: 'regular',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.75
    },
    isActive: true,
    sortOrder: 8,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Problem Solver',
    emoji: '🧩',
    description: 'Solved a problem independently',
    category: SkillCategory.ACADEMIC,
    isPositive: true,
    defaultPoints: 2,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['solve', 'figure out', 'work out', 'solution', 'think'],
      observationPhrases: ['solved independently', 'figured it out', 'found a solution', 'worked through'],
      contextIndicators: ['challenge', 'puzzle', 'conflict resolution'],
      expectedFrequency: 'occasional',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8
    },
    isActive: true,
    sortOrder: 9,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Tidy Up Champion',
    emoji: '🧹',
    description: 'Cleaned up without being asked',
    category: SkillCategory.INDEPENDENCE,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: [AgeGroup.TODDLER, AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['tidy', 'clean', 'pack away', 'organize'],
      observationPhrases: ['tidied up', 'cleaned without asking', 'packed away', 'kept area clean'],
      contextIndicators: ['transition', 'end of activity', 'independent'],
      typicalTimes: ['before_lunch', 'end_of_day', 'after_activity'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.85
    },
    isActive: true,
    sortOrder: 10,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Safe Choices',
    emoji: '🛡️',
    description: 'Made safe choices for self and others',
    category: SkillCategory.SELF_REGULATION,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: [AgeGroup.TODDLER, AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['safe', 'careful', 'cautious', 'sensible'],
      observationPhrases: ['made a safe choice', 'being careful', 'keeping others safe', 'walking feet'],
      contextIndicators: ['playground', 'transitions', 'physical activity'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8
    },
    isActive: true,
    sortOrder: 11,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  {
    name: 'Sharing Star',
    emoji: '🤗',
    description: 'Shared toys or materials with others',
    category: SkillCategory.SOCIAL_EMOTIONAL,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: [AgeGroup.TODDLER, AgeGroup.NURSERY, AgeGroup.PRE_K, AgeGroup.KINDERGARTEN],
    aiConfig: {
      triggerKeywords: ['share', 'turn', 'give', 'offer'],
      observationPhrases: ['shared toys', 'took turns', 'offered to share', 'let friend use'],
      contextIndicators: ['play time', 'resources', 'materials'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.85
    },
    isActive: true,
    sortOrder: 12,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  },
  // Constructive feedback (negative points - optional)
  {
    name: 'Needs Reminder',
    emoji: '💭',
    description: 'Needed a reminder about expectations',
    category: SkillCategory.SELF_REGULATION,
    isPositive: false,
    defaultPoints: -1,
    minPoints: -1,
    maxPoints: -1,
    ageGroups: [AgeGroup.PRE_K, AgeGroup.KINDERGARTEN, AgeGroup.YEAR_1, AgeGroup.YEAR_2],
    aiConfig: {
      triggerKeywords: ['reminder', 'redirect', 'refocus'],
      observationPhrases: ['needed reminder', 'required redirection', 'off task'],
      contextIndicators: ['distraction', 'behaviour', 'attention'],
      expectedFrequency: 'occasional',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.7
    },
    isActive: false,  // Off by default
    sortOrder: 100,
    usageCount: 0,
    isSystem: true,
    isCustom: false
  }
];

// ============================================================================
// AI POINT SUGGESTIONS
// ============================================================================

/**
 * AI-generated suggestion for awarding points
 */
export interface AIPointSuggestion {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  
  // AI analysis
  observationSource: 'teacher_note' | 'activity_completion' | 'attendance' | 'pattern_detection' | 'real_time';
  observationText?: string;
  
  // Suggested award
  suggestedStudentIds: string[];
  suggestedSkillId: string;
  suggestedSkillName: string;
  suggestedPoints: number;
  
  // AI reasoning
  reasoning: string;
  confidence: number;  // 0-1
  detectedBehaviours: string[];
  
  // Alternative suggestions
  alternatives: {
    skillId: string;
    skillName: string;
    confidence: number;
  }[];
  
  // Status
  status: 'pending' | 'accepted' | 'modified' | 'rejected' | 'expired';
  acceptedBy?: string;
  acceptedAt?: Date;
  modifiedAward?: {
    studentIds: string[];
    skillId: string;
    points: number;
  };
  rejectionReason?: string;
  
  // Timestamps
  suggestedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// BEHAVIOUR ANALYTICS & INSIGHTS
// ============================================================================

/**
 * Student behaviour analytics
 */
export interface StudentBehaviourAnalytics {
  studentId: string;
  studentName: string;
  period: DateRange;
  
  // Summary stats
  totalPoints: number;
  positivePoints: number;
  constructivePoints: number;
  pointsChange: number;  // vs previous period
  
  // Skill breakdown
  skillBreakdown: {
    skillId: string;
    skillName: string;
    skillEmoji: string;
    count: number;
    totalPoints: number;
    percentage: number;
  }[];
  
  // Time patterns
  timePatterns: {
    dayOfWeek: { [day: string]: number };
    timeOfDay: { [hour: string]: number };
    peakTime: string;
  };
  
  // Trends
  dailyTrend: { date: string; points: number }[];
  weeklyTrend: { week: string; points: number; average: number }[];
  
  // Comparisons
  classAverage: number;
  classRank?: number;  // Only if leaderboard enabled
  percentile: number;
  
  // AI insights
  aiInsights: StudentBehaviourInsights;
  
  // Generated
  generatedAt: Date;
}

/**
 * AI-generated behaviour insights for a student
 */
export interface StudentBehaviourInsights {
  summary: string;
  strengths: string[];
  growthAreas: string[];
  patterns: string[];
  recommendations: string[];
  teacherTips: string[];
  parentMessage: string;
  celebrationSuggestions: string[];
  trend: 'excelling' | 'improving' | 'stable' | 'needs_support';
  confidenceLevel: number;
  generatedAt: Date;
}

/**
 * Classroom behaviour analytics
 */
export interface ClassroomBehaviourAnalytics {
  classroomId: string;
  classroomName: string;
  period: DateRange;
  
  // Summary
  totalPoints: number;
  averagePointsPerStudent: number;
  totalAwards: number;
  
  // Skill usage
  skillUsage: {
    skillId: string;
    skillName: string;
    skillEmoji: string;
    count: number;
    percentage: number;
  }[];
  
  // Student distribution
  studentDistribution: {
    studentId: string;
    studentName: string;
    points: number;
    percentOfTotal: number;
  }[];
  
  // Group performance (if table groups enabled)
  groupPerformance?: {
    groupId: string;
    groupName: string;
    totalPoints: number;
    averagePerStudent: number;
  }[];
  
  // Time patterns
  peakAwardingTimes: string[];
  quietPeriods: string[];
  
  // AI insights
  aiInsights: ClassroomBehaviourInsights;
  
  generatedAt: Date;
}

/**
 * AI-generated insights for classroom behaviour
 */
export interface ClassroomBehaviourInsights {
  overallSummary: string;
  classStrengths: string[];
  focusAreas: string[];
  dynamicsObservations: string[];
  
  // Student-specific insights
  topPerformers: { studentId: string; reason: string }[];
  needingSupport: { studentId: string; reason: string; suggestions: string[] }[];
  
  // Actionable recommendations
  immediateActions: string[];
  weeklyGoals: string[];
  
  // Patterns
  positivePatterns: string[];
  concerningPatterns: string[];
  
  // Predictions
  predictedChallenges: string[];
  
  generatedAt: Date;
}

// ============================================================================
// CELEBRATION & MILESTONES
// ============================================================================

/**
 * Celebration triggered by reaching a milestone
 */
export interface Celebration {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  
  // Milestone
  milestoneType: 'points_threshold' | 'streak' | 'skill_mastery' | 'improvement' | 'custom';
  milestoneValue: number;
  milestoneName: string;
  
  // Display
  title: string;
  message: string;
  emoji: string;
  animationType: 'confetti' | 'stars' | 'fireworks' | 'balloons' | 'custom';
  
  // Certificate
  certificateGenerated: boolean;
  certificateUrl?: string;
  
  // Notification
  parentNotified: boolean;
  classAnnounced: boolean;
  
  // AI generated content
  aiGeneratedMessage?: string;
  
  // Timestamps
  achievedAt: Date;
  createdAt: Date;
}

/**
 * Streak tracking for consistent positive behaviour
 */
export interface BehaviourStreak {
  studentId: string;
  classroomId: string;
  
  // Current streak
  currentStreak: number;
  currentStreakStart: Date;
  
  // Best streak
  longestStreak: number;
  longestStreakStart: Date;
  longestStreakEnd: Date;
  
  // Streak type
  streakType: 'daily_positive' | 'weekly_goal' | 'skill_specific';
  skillId?: string;  // For skill-specific streaks
  
  // Last activity
  lastPointDate: Date;
  
  // Milestones achieved
  milestonesAchieved: number[];
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface ExplorerPointRepository {
  // Core operations
  findById(tenantId: string, id: string): Promise<ExplorerPoint | null>;
  findByStudent(tenantId: string, studentId: string, options?: {
    dateRange?: DateRange;
    limit?: number;
    offset?: number;
  }): Promise<ExplorerPoint[]>;
  findByClassroom(tenantId: string, classroomId: string, options?: {
    dateRange?: DateRange;
    limit?: number;
    offset?: number;
  }): Promise<ExplorerPoint[]>;
  
  // Create
  create(point: Omit<ExplorerPoint, 'id' | 'createdAt'>): Promise<ExplorerPoint>;
  createBatch(points: Omit<ExplorerPoint, 'id' | 'createdAt'>[]): Promise<ExplorerPoint[]>;
  
  // Update
  addReaction(tenantId: string, pointId: string, reaction: PointReaction): Promise<ExplorerPoint>;
  markParentNotified(tenantId: string, pointId: string): Promise<void>;
  markParentViewed(tenantId: string, pointId: string): Promise<void>;
  
  // Aggregations
  sumByStudent(tenantId: string, studentId: string, dateRange?: DateRange): Promise<number>;
  sumByClassroom(tenantId: string, classroomId: string, dateRange?: DateRange): Promise<number>;
  countBySkill(tenantId: string, classroomId: string, dateRange?: DateRange): Promise<Map<string, number>>;
  
  // Analytics
  getStudentAnalytics(tenantId: string, studentId: string, dateRange: DateRange): Promise<StudentBehaviourAnalytics>;
  getClassroomAnalytics(tenantId: string, classroomId: string, dateRange: DateRange): Promise<ClassroomBehaviourAnalytics>;
}

export interface BehaviourSkillRepository {
  findById(tenantId: string, id: string): Promise<BehaviourSkill | null>;
  findBySchool(tenantId: string, schoolId: string, activeOnly?: boolean): Promise<BehaviourSkill[]>;
  findByClassroom(tenantId: string, classroomId: string, activeOnly?: boolean): Promise<BehaviourSkill[]>;
  create(skill: Omit<BehaviourSkill, 'id' | 'createdAt' | 'updatedAt'>): Promise<BehaviourSkill>;
  update(tenantId: string, id: string, updates: Partial<BehaviourSkill>): Promise<BehaviourSkill>;
  incrementUsage(tenantId: string, id: string): Promise<void>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface AIPointSuggestionRepository {
  findById(tenantId: string, id: string): Promise<AIPointSuggestion | null>;
  findPendingByClassroom(tenantId: string, classroomId: string): Promise<AIPointSuggestion[]>;
  create(suggestion: Omit<AIPointSuggestion, 'id'>): Promise<AIPointSuggestion>;
  updateStatus(tenantId: string, id: string, status: AIPointSuggestion['status'], details?: {
    acceptedBy?: string;
    modifiedAward?: AIPointSuggestion['modifiedAward'];
    rejectionReason?: string;
  }): Promise<AIPointSuggestion>;
  expireOld(tenantId: string, before: Date): Promise<number>;
}

export interface CelebrationRepository {
  findById(tenantId: string, id: string): Promise<Celebration | null>;
  findByStudent(tenantId: string, studentId: string): Promise<Celebration[]>;
  findByClassroom(tenantId: string, classroomId: string, dateRange?: DateRange): Promise<Celebration[]>;
  create(celebration: Omit<Celebration, 'id' | 'createdAt'>): Promise<Celebration>;
  markParentNotified(tenantId: string, id: string): Promise<void>;
  markClassAnnounced(tenantId: string, id: string): Promise<void>;
}

export interface BehaviourStreakRepository {
  findByStudent(tenantId: string, studentId: string): Promise<BehaviourStreak | null>;
  upsert(streak: BehaviourStreak): Promise<BehaviourStreak>;
  getClassroomStreaks(tenantId: string, classroomId: string): Promise<BehaviourStreak[]>;
}

// ============================================================================
// INPUT/OUTPUT TYPES FOR SERVICE OPERATIONS
// ============================================================================

export interface AwardPointInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  awardedBy: string;
  
  // Single or multiple students
  studentIds: string[];
  
  // Award details
  skillId: string;
  points?: number;  // Uses skill default if not provided
  
  // Context
  description?: string;
  tags?: string[];
  linkedActivityId?: string;
  linkedPortfolioItemId?: string;
  
  // Location (for school-wide)
  location?: ExplorerPoint['location'];
  customLocation?: string;
  
  // AI tracking
  fromAISuggestion?: string;
}

export interface AwardPointOutput {
  points: ExplorerPoint[];
  groupAward?: GroupAward;
  celebrationsTriggered: Celebration[];
  streaksUpdated: { studentId: string; newStreak: number }[];
  parentNotifications: { studentId: string; parentIds: string[] }[];
}

export interface GetPointsInput {
  tenantId: string;
  classroomId?: string;
  studentId?: string;
  dateRange?: DateRange;
  skillIds?: string[];
  includeNegative?: boolean;
  pagination?: PaginationOptions;
}

export interface GenerateAISuggestionsInput {
  tenantId: string;
  classroomId: string;
  trigger: 'periodic' | 'observation' | 'activity_completed' | 'manual';
  observationText?: string;
  activityId?: string;
  studentIds?: string[];
}
