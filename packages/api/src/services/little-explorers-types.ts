/**
 * Little Explorers - Type Definitions
 *
 * Combined type definitions for the Early Years Education platform (ages 3-7).
 * This module provides comprehensive types for:
 * - Core domain entities (Student, Classroom, Teacher, Parent)
 * - Behaviour system (Explorer Points, skills, celebrations)
 * - Communication system (Class Story, messaging, events, alerts)
 * - Portfolio system (items, activities, observations, milestones)
 * - AI integration (suggestions, insights, analysis)
 *
 * @module LittleExplorers/Types
 */

// Base service type helpers for compatibility (define locally to avoid circular dependencies)
export interface DateRange {
  start: Date;
  end: Date;
}

export interface PaginationOptions {
  limit?: number;
  offset?: number;
  cursor?: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  cursor?: string;
}

// ============================================================================
// ENUMS
// ============================================================================

export enum LittleExplorersAgeGroup {
  TODDLER = 'toddler',
  NURSERY = 'nursery',
  PRE_K = 'pre_k',
  KINDERGARTEN = 'kindergarten',
  YEAR_1 = 'year_1',
  YEAR_2 = 'year_2',
}

export enum LittleExplorersJurisdiction {
  AU_NSW = 'AU_NSW',
  AU_VIC = 'AU_VIC',
  AU_QLD = 'AU_QLD',
  AU_WA = 'AU_WA',
  AU_SA = 'AU_SA',
  AU_TAS = 'AU_TAS',
  AU_ACT = 'AU_ACT',
  AU_NT = 'AU_NT',
  UK_ENGLAND = 'UK_ENGLAND',
  UK_SCOTLAND = 'UK_SCOTLAND',
  UK_WALES = 'UK_WALES',
  US_GENERIC = 'US_GENERIC',
  NZ = 'NZ',
  SG = 'SG',
  HK = 'HK',
}

export enum LittleExplorersConsentType {
  PHOTO_VIDEO = 'photo_video',
  PORTFOLIO_SHARING = 'portfolio_sharing',
  CLASS_STORY = 'class_story',
  SCHOOL_STORY = 'school_story',
  EXTERNAL_SHARING = 'external_sharing',
  AI_ANALYSIS = 'ai_analysis',
  LOCATION_EXCURSION = 'location_excursion',
  MEDICAL_INFO = 'medical_info',
  EMERGENCY_CONTACT = 'emergency_contact',
  THIRD_PARTY_APPS = 'third_party_apps',
}

export enum LittleExplorersUserRole {
  STUDENT = 'student',
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  TEACHER = 'teacher',
  TEACHING_ASSISTANT = 'teaching_assistant',
  SPECIALIST = 'specialist',
  SCHOOL_ADMIN = 'school_admin',
  PRINCIPAL = 'principal',
  DISTRICT_ADMIN = 'district_admin',
  PLATFORM_ADMIN = 'platform_admin',
}

export enum LittleExplorersSkillCategory {
  CORE_VALUES = 'core_values',
  SOCIAL_EMOTIONAL = 'social_emotional',
  ACADEMIC = 'academic',
  SELF_REGULATION = 'self_regulation',
  PHYSICAL = 'physical',
  CREATIVE = 'creative',
  COLLABORATION = 'collaboration',
  INDEPENDENCE = 'independence',
  CUSTOM = 'custom',
}

export type LittleExplorersEntityStatus =
  | 'active'
  | 'inactive'
  | 'pending'
  | 'archived'
  | 'deleted';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface LittleExplorersStudent {
  id: string;
  tenantId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  avatar: LittleExplorersStudentAvatar;
  familyConnections: LittleExplorersFamilyConnection[];
  currentClassroomId?: string;
  learningProfile: LittleExplorersLearningProfile;
  consents: LittleExplorersConsentRecord[];
  behaviourSummary: LittleExplorersBehaviourSummary;
  status: LittleExplorersEntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LittleExplorersStudentAvatar {
  type: 'monster' | 'animal' | 'robot' | 'custom';
  baseId: string;
  currentLevel: number;
  experiencePoints: number;
  nextLevelAt: number;
  unlockedItems: string[];
}

export interface LittleExplorersFamilyConnection {
  userId: string;
  relationship: 'mother' | 'father' | 'guardian' | 'grandparent' | 'other';
  isPrimary: boolean;
  canPickup: boolean;
  canReceiveReports: boolean;
  canAccessPortfolio: boolean;
  canMessage: boolean;
}

export interface LittleExplorersLearningProfile {
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
  attentionSpan: 'short' | 'moderate' | 'long';
  bestTimeOfDay: 'morning' | 'midday' | 'afternoon';
  interests: string[];
  strengths: string[];
  challenges: string[];
  supportNeeds?: LittleExplorersSupportNeed[];
  currentGoals: LittleExplorersLearningGoal[];
}

export interface LittleExplorersSupportNeed {
  type: 'learning' | 'physical' | 'behavioural' | 'emotional' | 'speech' | 'other';
  description: string;
  strategies: string[];
  externalSupport?: string;
}

export interface LittleExplorersLearningGoal {
  id: string;
  area: string;
  goal: string;
  strategies: string[];
  progress: number;
  startDate: Date;
  targetDate?: Date;
  completedDate?: Date;
  aiGenerated: boolean;
}

export interface LittleExplorersConsentRecord {
  type: LittleExplorersConsentType | 'photo_consent';
  granted: boolean;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  notes?: string;
  // Service compatibility property
  status?: 'granted' | 'denied' | 'pending';
}

export interface LittleExplorersBehaviourSummary {
  totalPointsAllTime: number;
  totalPointsThisTerm: number;
  totalPointsThisWeek: number;
  currentStreak: number;
  longestStreak: number;
  skillBreakdown: { skillId: string; count: number }[];
  weeklyTrend: 'improving' | 'stable' | 'declining';
  lastPointAwarded?: Date;
}

export interface LittleExplorersClassroom {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  displayName: string;
  grade: LittleExplorersAgeGroup;
  academicYear: number;
  theme: LittleExplorersClassroomTheme;
  teachers: LittleExplorersClassroomTeacher[];
  students: LittleExplorersClassroomStudent[];
  settings: LittleExplorersClassroomSettings;
  skills: string[];
  customSkills: LittleExplorersBehaviourSkill[];
  classCode: string;
  classCodeExpiry?: Date;
  stats: LittleExplorersClassroomStats;
  status: LittleExplorersEntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface LittleExplorersClassroomTheme {
  name: string;
  backgroundUrl?: string;
  iconUrl?: string;
  mascotName?: string;
  mascotImageUrl?: string;
  primaryColour: string;
  celebrationAnimation: string;
}

export interface LittleExplorersClassroomTeacher {
  userId: string;
  role: 'lead' | 'assistant' | 'specialist' | 'relief';
  subjects?: string[];
  startDate: Date;
  endDate?: Date;
}

export interface LittleExplorersClassroomStudent {
  studentId: string;
  enrolledDate: Date;
  withdrawnDate?: Date;
  status: 'enrolled' | 'withdrawn' | 'transferred';
}

export interface LittleExplorersClassroomSettings {
  classStoryEnabled: boolean;
  parentCanComment: boolean;
  parentCanLike: boolean;
  pointsGoalDaily?: number;
  pointsGoalWeekly?: number;
  showLeaderboard: boolean;
  leaderboardType: 'individual' | 'table_groups' | 'none';
  studentViewEnabled: boolean;
  studentCanViewOwnPoints: boolean;
  studentCanViewClassPoints: boolean;
  tableGroups: LittleExplorersTableGroup[];
}

export interface LittleExplorersTableGroup {
  id: string;
  name: string;
  colour: string;
  emoji: string;
  memberIds: string[];
}

export interface LittleExplorersClassroomStats {
  totalPoints: number;
  pointsToday: number;
  pointsThisWeek: number;
  storiesThisWeek: number;
  portfolioItemsThisWeek: number;
  attendanceRate: number;
  parentEngagementRate: number;
  lastUpdated: Date;
}

export interface LittleExplorersTeacher {
  id: string;
  tenantId: string;
  userId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  bio?: string;
  photoUrl?: string;
  qualifications: string[];
  specializations: string[];
  classrooms: LittleExplorersTeacherClassroomAssignment[];
  role: LittleExplorersUserRole;
  preferences: LittleExplorersTeacherPreferences;
  aiAssistantSettings: LittleExplorersTeacherAISettings;
  stats: LittleExplorersTeacherStats;
  status: LittleExplorersEntityStatus;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility property
  profileImageUrl?: string;
}

export interface LittleExplorersTeacherClassroomAssignment {
  classroomId: string;
  classroomName: string;
  role: 'lead' | 'assistant' | 'specialist' | 'relief';
  subjects?: string[];
  startDate: Date;
  endDate?: Date;
}

export interface LittleExplorersTeacherPreferences {
  defaultPointsToAward: number;
  quickAwardSkills: string[];
  notificationSounds: boolean;
  hapticFeedback: boolean;
  showPointsAnimation: boolean;
  autoSaveStoryDrafts: boolean;
  defaultStoryVisibility: 'class' | 'school' | 'private';
}

export interface LittleExplorersTeacherAISettings {
  enableAISuggestions: boolean;
  enableAIDrafts: boolean;
  enableAIInsights: boolean;
  suggestionFrequency: 'always' | 'hourly' | 'daily';
  draftTone: 'professional' | 'warm' | 'casual';
  autoAcceptSimpleSuggestions: boolean;
}

export interface LittleExplorersTeacherStats {
  pointsAwardedTotal: number;
  pointsAwardedThisWeek: number;
  storiesPostedTotal: number;
  storiesPostedThisWeek: number;
  messagesThisWeek: number;
  portfolioItemsAddedThisWeek: number;
  parentEngagementRate: number;
  aiSuggestionsAccepted: number;
  aiSuggestionsRejected: number;
  lastUpdated: Date;
}

export interface LittleExplorersParent {
  id: string;
  tenantId: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferredLanguage: string;
  children: LittleExplorersParentChildConnection[];
  communicationPrefs: LittleExplorersParentCommunicationPrefs;
  engagement: LittleExplorersParentEngagement;
  status: LittleExplorersEntityStatus;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility property
  childrenIds?: string[];
}

export interface LittleExplorersParentChildConnection {
  studentId: string;
  studentName: string;
  classroomId: string;
  classroomName: string;
  schoolId: string;
  schoolName: string;
  relationship: string;
  connectedAt: Date;
  accessLevel: 'full' | 'view_only' | 'emergency_only';
}

export interface LittleExplorersParentCommunicationPrefs {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  notifyOnPoints: boolean;
  notifyOnStories: boolean;
  notifyOnPortfolio: boolean;
  notifyOnMessages: boolean;
  notifyOnReports: boolean;
  notifyOnEvents: boolean;
  notifyOnAttendance: boolean;
  notifyOnEmergency: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number;
}

export interface LittleExplorersParentEngagement {
  lastViewedStory?: Date;
  lastViewedPortfolio?: Date;
  lastSentMessage?: Date;
  lastReadMessage?: Date;
  storyViewsThisWeek: number;
  likesThisWeek: number;
  commentsThisWeek: number;
  messagesThisWeek: number;
  portfolioViewsThisWeek: number;
  engagementScore: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  aiRecommendations?: string[];
}

// ============================================================================
// BEHAVIOUR SYSTEM TYPES
// ============================================================================

export interface LittleExplorersExplorerPoint {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  studentName: string;
  skillId: string;
  skillName: string;
  skillEmoji: string;
  points: number;
  isPositive: boolean;
  context?: LittleExplorersPointContext;
  aiGenerated: boolean;
  aiSuggestionId?: string;
  aiConfidence?: number;
  awardedBy: string;
  awardedByName: string;
  awardedByRole: 'teacher' | 'assistant' | 'specialist' | 'school_admin' | 'ai';
  location?:
    | 'classroom'
    | 'playground'
    | 'cafeteria'
    | 'library'
    | 'assembly'
    | 'excursion'
    | 'other';
  customLocation?: string;
  parentNotified: boolean;
  parentNotifiedAt?: Date;
  parentViewed: boolean;
  parentViewedAt?: Date;
  reactions: LittleExplorersPointReaction[];
  awardedAt: Date;
  createdAt: Date;
}

export interface LittleExplorersPointContext {
  description?: string;
  linkedActivityId?: string;
  linkedPortfolioItemId?: string;
  linkedAttendanceId?: string;
  tags: string[];
  aiExtractedBehaviours?: string[];
  aiSentiment?: 'very_positive' | 'positive' | 'neutral' | 'needs_attention';
}

export interface LittleExplorersPointReaction {
  userId: string;
  type: 'like' | 'love' | 'celebrate' | 'proud';
  reactedAt: Date;
}

export interface LittleExplorersGroupAward {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  groupType: 'table_group' | 'custom_group' | 'whole_class' | 'selected_students';
  groupId?: string;
  groupName: string;
  studentIds: string[];
  skillId: string;
  skillName: string;
  skillEmoji: string;
  pointsPerStudent: number;
  totalPoints: number;
  isPositive: boolean;
  reason?: string;
  context?: LittleExplorersPointContext;
  aiGenerated: boolean;
  aiSuggestionId?: string;
  awardedBy: string;
  awardedByName: string;
  awardedAt: Date;
  createdAt: Date;
}

export interface LittleExplorersBehaviourSkill {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  name: string;
  emoji: string;
  description: string;
  category: LittleExplorersSkillCategory;
  isPositive: boolean;
  defaultPoints: number;
  minPoints: number;
  maxPoints: number;
  ageGroups: LittleExplorersAgeGroup[];
  pbisAlignment?: {
    tier: 1 | 2 | 3;
    expectation: string;
    setting?: string;
  };
  aiConfig: LittleExplorersSkillAIConfig;
  isActive: boolean;
  sortOrder: number;
  usageCount: number;
  lastUsed?: Date;
  isSystem: boolean;
  isCustom: boolean;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LittleExplorersSkillAIConfig {
  triggerKeywords: string[];
  observationPhrases: string[];
  contextIndicators: string[];
  typicalTimes?: string[];
  expectedFrequency: 'rare' | 'occasional' | 'regular' | 'frequent';
  relatedSkillIds: string[];
  autoSuggestConfidence: number;
}

export interface LittleExplorersAIPointSuggestion {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  observationSource:
    | 'teacher_note'
    | 'activity_completion'
    | 'attendance'
    | 'pattern_detection'
    | 'real_time';
  observationText?: string;
  suggestedStudentIds: string[];
  suggestedSkillId: string;
  suggestedSkillName: string;
  suggestedPoints: number;
  reasoning: string;
  confidence: number;
  detectedBehaviours: string[];
  alternatives: {
    skillId: string;
    skillName: string;
    confidence: number;
  }[];
  status: 'pending' | 'accepted' | 'modified' | 'rejected' | 'expired';
  acceptedBy?: string;
  acceptedAt?: Date;
  modifiedAward?: {
    studentIds: string[];
    skillId: string;
    points: number;
  };
  rejectionReason?: string;
  suggestedAt: Date;
  expiresAt: Date;
}

export interface LittleExplorersStudentBehaviourAnalytics {
  studentId: string;
  studentName: string;
  period: DateRange;
  totalPoints: number;
  positivePoints: number;
  constructivePoints: number;
  pointsChange: number;
  skillBreakdown: {
    skillId: string;
    skillName: string;
    skillEmoji: string;
    count: number;
    totalPoints: number;
    percentage: number;
  }[];
  timePatterns: {
    dayOfWeek: { [day: string]: number };
    timeOfDay: { [hour: string]: number };
    peakTime: string;
  };
  dailyTrend: { date: string; points: number }[];
  weeklyTrend: { week: string; points: number; average: number }[];
  classAverage: number;
  classRank?: number;
  percentile: number;
  aiInsights: LittleExplorersStudentBehaviourInsights;
  generatedAt: Date;
}

export interface LittleExplorersStudentBehaviourInsights {
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

export interface LittleExplorersClassroomBehaviourAnalytics {
  classroomId: string;
  classroomName: string;
  period: DateRange;
  totalPoints: number;
  averagePointsPerStudent: number;
  totalAwards: number;
  skillUsage: {
    skillId: string;
    skillName: string;
    skillEmoji: string;
    count: number;
    percentage: number;
  }[];
  studentDistribution: {
    studentId: string;
    studentName: string;
    points: number;
    percentOfTotal: number;
  }[];
  groupPerformance?: {
    groupId: string;
    groupName: string;
    totalPoints: number;
    averagePerStudent: number;
  }[];
  peakAwardingTimes: string[];
  quietPeriods: string[];
  aiInsights: LittleExplorersClassroomBehaviourInsights;
  generatedAt: Date;
}

export interface LittleExplorersClassroomBehaviourInsights {
  overallSummary: string;
  classStrengths: string[];
  focusAreas: string[];
  dynamicsObservations: string[];
  topPerformers: { studentId: string; reason: string }[];
  needingSupport: { studentId: string; reason: string; suggestions: string[] }[];
  immediateActions: string[];
  weeklyGoals: string[];
  positivePatterns: string[];
  concerningPatterns: string[];
  predictedChallenges: string[];
  generatedAt: Date;
}

export interface LittleExplorersCelebration {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  milestoneType: 'points_threshold' | 'streak' | 'skill_mastery' | 'improvement' | 'custom';
  milestoneValue: number;
  milestoneName: string;
  title: string;
  message: string;
  emoji: string;
  animationType: 'confetti' | 'stars' | 'fireworks' | 'balloons' | 'custom';
  certificateGenerated: boolean;
  certificateUrl?: string;
  parentNotified: boolean;
  classAnnounced: boolean;
  aiGeneratedMessage?: string;
  achievedAt: Date;
  createdAt: Date;
}

export interface LittleExplorersBehaviourStreak {
  studentId: string;
  classroomId: string;
  currentStreak: number;
  currentStreakStart: Date;
  longestStreak: number;
  longestStreakStart: Date;
  longestStreakEnd: Date;
  streakType: 'daily_positive' | 'weekly_goal' | 'skill_specific';
  skillId?: string;
  lastPointDate: Date;
  milestonesAchieved: number[];
}

// ============================================================================
// COMMUNICATION SYSTEM TYPES
// ============================================================================

export interface LittleExplorersStoryPost {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  authorId: string;
  authorName: string;
  authorRole: 'teacher' | 'assistant' | 'specialist' | 'school_admin';
  authorAvatarUrl?: string;
  content: LittleExplorersStoryContent;
  visibility: 'class' | 'school' | 'selected_parents' | 'parents_only' | 'public' | 'tagged_parents_only';
  visibleToParentIds?: string[];
  taggedStudentIds: string[];
  learningConnections?: LittleExplorersLearningConnection[];
  aiGenerated: boolean;
  aiCaptionSuggestion?: string;
  aiContentAnalysis?: LittleExplorersContentAnalysis;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'removed';
  moderationNotes?: string;
  moderatedBy?: string;
  moderatedAt?: Date;
  engagement: LittleExplorersStoryEngagement;
  scheduledFor?: Date;
  publishedAt?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'archived' | 'deleted';
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility properties
  type?: 'text' | 'photo' | 'video' | 'album' | 'document' | 'announcement' | 'celebration' | 'update' | 'milestone';
  title?: string;
  text?: string;
  originalText?: string;
  mediaItems?: LittleExplorersStoryMedia[];
  createdBy?: string;
  createdByName?: string;
  createdByAvatar?: string;
  likes?: { parentId: string; emoji: string; likedAt: Date }[];
  comments?: LittleExplorersStoryComment[];
  viewCount?: number;
  uniqueViewerIds?: string[];
  safeguardingCleared?: boolean;
  isPinned?: boolean;
}

// Note: Main LittleExplorersStoryComment interface is defined later in the file
// This simplified version is for backwards compatibility

export interface LittleExplorersStoryContent {
  type: 'text' | 'photo' | 'video' | 'album' | 'document' | 'announcement';
  text?: string;
  formattedText?: string;
  media?: LittleExplorersStoryMedia[];
  document?: {
    url: string;
    name: string;
    type: string;
    size: number;
  };
  announcementType?: 'general' | 'event' | 'reminder' | 'celebration' | 'important';
  announcementPriority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface LittleExplorersStoryMedia {
  id: string;
  type: 'photo' | 'video';
  url: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  duration?: number;
  processingStatus: 'uploading' | 'processing' | 'ready' | 'failed';
  aiCaption?: string;
  aiTags?: string[];
  allFacesConsented: boolean;
  nonConsentedFacesBlurred: boolean;
}

export interface LittleExplorersLearningConnection {
  type: 'curriculum_code' | 'learning_area' | 'skill' | 'topic';
  code?: string;
  name: string;
  framework?: string;
}

export interface LittleExplorersContentAnalysis {
  sentiment: 'very_positive' | 'positive' | 'neutral' | 'negative' | 'concerning';
  themes: string[];
  suggestedTags: string[];
  safeguardingFlags: string[];
  qualityScore: number;
  readabilityLevel: string;
  suggestedImprovements?: string[];
  analyzedAt: Date;
}

export interface LittleExplorersStoryEngagement {
  viewCount?: number;
  uniqueViewers?: string[];
  likes?: LittleExplorersStoryReaction[] | undefined[];
  hearts?: LittleExplorersStoryReaction[];
  celebrates?: LittleExplorersStoryReaction[];
  comments?: LittleExplorersStoryComment[] | undefined[];
  commentCount?: number;
  parentViewPercentage?: number;
  firstViewedAt?: Date;
  lastViewedAt?: Date;
}

export interface LittleExplorersStoryReaction {
  userId: string;
  userName: string;
  type: 'like' | 'heart' | 'celebrate';
  reactedAt: Date;
}

export interface LittleExplorersStoryComment {
  id: string;
  userId?: string;
  userName?: string;
  userRole?: 'teacher' | 'parent';
  content: string;
  moderationStatus?: 'approved' | 'pending' | 'hidden';
  parentCommentId?: string;
  replies?: LittleExplorersStoryComment[];
  createdAt: Date;
  editedAt?: Date;
  // Service compatibility properties
  parentId?: string;
  parentName?: string;
  isApproved?: boolean;
}

export interface LittleExplorersConversation {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  participants: LittleExplorersConversationParticipant[];
  relatedStudentId?: string;
  relatedStudentName?: string;
  subject?: string;
  lastMessageAt: Date;
  lastMessagePreview?: string;
  lastMessageBy?: string;
  unreadCounts: { [participantId: string]: number };
  status: 'active' | 'archived' | 'closed';
  aiSummary?: string;
  aiSentiment?: 'positive' | 'neutral' | 'concerning';
  aiActionItems?: string[];
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility properties
  studentId?: string;
  type?: 'direct' | 'group';
}

export interface LittleExplorersConversationParticipant {
  userId: string;
  name: string;
  role: 'teacher' | 'parent' | 'admin';
  avatarUrl?: string;
  notificationsEnabled?: boolean;
  lastReadAt?: Date;
  leftAt?: Date;
  // Service compatibility properties
  unreadCount?: number;
  isMuted?: boolean;
  mutedUntil?: Date;
}

export interface LittleExplorersMessage {
  id: string;
  tenantId: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'teacher' | 'parent' | 'admin' | 'system';
  content: LittleExplorersMessageContent | string;
  originalLanguage?: string;
  translations?: { [languageCode: string]: string };
  translationRequested?: boolean;
  aiDrafted?: boolean;
  aiSuggestionId?: string;
  aiToneAnalysis?: {
    tone: 'professional' | 'warm' | 'urgent' | 'concerning';
    sentiment: number;
    suggestions?: string[];
  };
  moderationStatus?: 'approved' | 'flagged' | 'blocked';
  moderationFlags?: string[];
  deliveryStatus?: LittleExplorersDeliveryStatus;
  readBy?: { userId: string; readAt: Date }[];
  status?: 'sent' | 'edited' | 'deleted';
  editedAt?: Date;
  deletedAt?: Date;
  sentAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
  // Service compatibility properties
  replyToMessageId?: string;
  safeguardingFlags?: string[];
}

export interface LittleExplorersMessageContent {
  type: 'text' | 'image' | 'document' | 'voice' | 'system';
  text?: string;
  imageUrl?: string;
  imageThumbnailUrl?: string;
  documentUrl?: string;
  documentName?: string;
  documentType?: string;
  documentSize?: number;
  voiceUrl?: string;
  voiceDuration?: number;
  voiceTranscription?: string;
  systemAction?:
    | 'conversation_started'
    | 'participant_added'
    | 'participant_left'
    | 'subject_changed';
}

export interface LittleExplorersDeliveryStatus {
  status: 'sending' | 'sent' | 'delivered' | 'failed';
  sentAt?: Date;
  deliveredAt?: Date;
  failureReason?: string;
  pushSent: boolean;
  pushDelivered: boolean;
  emailSent: boolean;
  emailDelivered: boolean;
  smsSent: boolean;
  smsDelivered: boolean;
}

export interface LittleExplorersCalendarEvent {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  title: string;
  description?: string;
  type: LittleExplorersEventType;
  startDate: Date;
  endDate: Date;
  allDay: boolean;
  timezone: string;
  recurring: boolean;
  recurrenceRule?: LittleExplorersRecurrenceRule;
  location?: LittleExplorersEventLocation | string;
  visibility: 'class' | 'school' | 'public';
  rsvpEnabled: boolean;
  rsvpDeadline?: Date;
  rsvpResponses?: LittleExplorersEventRSVP[];
  reminders: LittleExplorersEventReminder[];
  attachments: LittleExplorersEventAttachment[];
  createdBy: string;
  createdByName: string;
  status: 'scheduled' | 'cancelled' | 'completed';
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility properties
  startTime?: Date;
  endTime?: Date;
  isAllDay?: boolean;
  timeZone?: string;
  requiresRsvp?: boolean;
  maxAttendees?: number;
  rsvps?: LittleExplorersEventRSVP[];
  remindersSent?: { reminderType: string; sentAt: Date }[];
}

export type LittleExplorersEventType =
  | 'general'
  | 'parent_teacher_conference'
  | 'excursion'
  | 'performance'
  | 'celebration'
  | 'professional_development'
  | 'public_holiday'
  | 'school_holiday'
  | 'assembly'
  | 'sports_day'
  | 'photo_day'
  | 'deadline'
  | 'other';

export interface LittleExplorersRecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: Date;
  occurrences?: number;
}

export interface LittleExplorersEventLocation {
  type: 'in_school' | 'external' | 'online';
  name: string;
  address?: string;
  coordinates?: { lat: number; lng: number };
  onlineLink?: string;
  onlinePlatform?: string;
}

export interface LittleExplorersEventRSVP {
  userId: string;
  userName: string;
  studentIds: string[];
  response: 'attending' | 'not_attending' | 'maybe';
  respondedAt: Date;
  notes?: string;
  // Service compatibility properties
  parentId?: string;
  parentName?: string;
}

export interface LittleExplorersEventReminder {
  id: string;
  timing: number;
  channels: ('push' | 'email' | 'sms')[];
  sent: boolean;
  sentAt?: Date;
}

export interface LittleExplorersEventAttachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface LittleExplorersEmergencyAlert {
  id: string;
  tenantId: string;
  schoolId: string;
  scope: 'school' | 'district' | 'classroom';
  targetClassroomIds?: string[];
  type: LittleExplorersEmergencyType;
  title: string;
  message: string;
  instructions?: string[];
  severity: 'information' | 'warning' | 'critical' | 'emergency' | 'info' | 'urgent';
  channels: ('push' | 'sms' | 'email' | 'voice_call')[];
  deliveryStats: {
    totalRecipients: number;
    delivered: number;
    failed: number;
    acknowledged: number;
  };
  requiresAcknowledgement: boolean;
  acknowledgements: {
    userId: string;
    acknowledgedAt: Date;
    method: 'app' | 'sms_reply' | 'email_link';
  }[];
  status: 'draft' | 'sending' | 'sent' | 'cancelled' | 'active' | 'resolved';
  createdBy: string;
  createdByName: string;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility properties
  classroomIds?: string[];
  requiresAcknowledgment?: boolean;
  acknowledgments?: {
    userId: string;
    acknowledgedAt: Date;
    method: 'app' | 'sms' | 'call';
  }[];
}

export type LittleExplorersEmergencyType =
  | 'lockdown'
  | 'evacuation'
  | 'shelter_in_place'
  | 'weather_alert'
  | 'early_dismissal'
  | 'delayed_opening'
  | 'closure'
  | 'medical_emergency'
  | 'security_alert'
  | 'general_emergency'
  | 'test';

export interface LittleExplorersNotification {
  id: string;
  tenantId: string;
  recipientId: string;
  recipientType: 'parent' | 'teacher' | 'admin';
  type: LittleExplorersNotificationType;
  title: string;
  body: string;
  imageUrl?: string;
  actionType?:
    | 'open_story'
    | 'open_message'
    | 'open_portfolio'
    | 'open_event'
    | 'open_report'
    | 'external_link';
  actionData?: Record<string, string>;
  channels: ('push' | 'email' | 'sms' | 'in_app')[];
  deliveryStatus: {
    push?: { sent: boolean; delivered: boolean; opened: boolean };
    email?: { sent: boolean; delivered: boolean; opened: boolean };
    sms?: { sent: boolean; delivered: boolean };
    inApp?: { displayed: boolean; dismissed: boolean };
  };
  read: boolean;
  readAt?: Date;
  dismissed: boolean;
  dismissedAt?: Date;
  sentAt: Date;
  createdAt: Date;
}

export type LittleExplorersNotificationType =
  | 'point_awarded'
  | 'celebration_achieved'
  | 'story_posted'
  | 'message_received'
  | 'portfolio_item_added'
  | 'event_reminder'
  | 'event_created'
  | 'attendance_alert'
  | 'report_available'
  | 'emergency_alert'
  | 'system';

export const LITTLE_EXPLORERS_SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol' },
  { code: 'zh', name: 'Chinese (Simplified)', nativeName: '中文(简体)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '中文(繁體)' },
  { code: 'vi', name: 'Vietnamese', nativeName: 'Tieng Viet' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' },
  { code: 'tl', name: 'Filipino', nativeName: 'Filipino' },
  { code: 'fr', name: 'French', nativeName: 'Francais' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Portugues' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский' },
  { code: 'el', name: 'Greek', nativeName: 'Ελληνικά' },
  { code: 'tr', name: 'Turkish', nativeName: 'Turkce' },
  { code: 'th', name: 'Thai', nativeName: 'ไทย' },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu' },
] as const;

export type LittleExplorersSupportedLanguageCode =
  (typeof LITTLE_EXPLORERS_SUPPORTED_LANGUAGES)[number]['code'];

// ============================================================================
// PORTFOLIO SYSTEM TYPES
// ============================================================================

export interface LittleExplorersPortfolioItem {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  type: LittleExplorersPortfolioItemType;
  title: string;
  description?: string;
  content: LittleExplorersPortfolioContent;
  context?: LittleExplorersPortfolioContext;
  curriculumTags: LittleExplorersCurriculumTag[];
  developmentalAreas: LittleExplorersDevelopmentalArea[] | string[];
  aiAnalysis?: LittleExplorersPortfolioItemAIAnalysis;
  approvalStatus: 'pending' | 'approved' | 'needs_review' | 'private';
  approvedBy?: string;
  approvedAt?: Date;
  reviewNotes?: string;
  visibleToParent: boolean;
  sharedToStory: boolean;
  storyPostId?: string;
  isHighlight: boolean;
  highlightReason?: string;
  highlightedBy?: string;
  createdBy: string;
  createdByRole: 'teacher' | 'assistant' | 'student' | 'ai';
  parentViewed: boolean;
  parentViewedAt?: Date;
  parentReaction?: LittleExplorersPortfolioReaction;
  parentComment?: string;
  status?: LittleExplorersEntityStatus;
  capturedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility property
  parentReactions?: LittleExplorersPortfolioReaction[];
}

export type LittleExplorersPortfolioItemType =
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

export interface LittleExplorersPortfolioContent {
  media?: LittleExplorersPortfolioMedia[];
  text?: string;
  formattedText?: string;
  drawingData?: {
    dataUrl: string;
    canvasWidth: number;
    canvasHeight: number;
    backgroundColor: string;
    strokes?: unknown[];
  };
  document?: {
    url: string;
    name: string;
    type: string;
    size: number;
    pageCount?: number;
    thumbnailUrl?: string;
  };
  activityResponse?: {
    activityId: string;
    activityTitle: string;
    responseType: 'text' | 'drawing' | 'photo' | 'video' | 'audio' | 'choice';
    response: unknown;
    completedAt: Date;
  };
  assessmentData?: {
    assessmentType: string;
    criteria: { name: string; level: string; notes?: string }[];
    overallLevel?: string;
    teacherNotes?: string;
  };
  // Service compatibility property
  mediaUrls?: string[];
}

export interface LittleExplorersPortfolioMedia {
  id?: string;
  type: 'photo' | 'video' | 'audio' | 'image';
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number;
  fileSize?: number;
  mimeType?: string;
  processingStatus?: 'pending' | 'processing' | 'ready' | 'failed';
  aiCaption?: string;
  aiTags?: string[];
  transcription?: string;
  uploadedAt?: Date;
}

export interface LittleExplorersPortfolioContext {
  activityType?: string;
  activityName?: string;
  location?:
    | 'classroom'
    | 'playground'
    | 'art_room'
    | 'library'
    | 'excursion'
    | 'home'
    | 'other';
  customLocation?: string;
  involvedStudentIds?: string[];
  involvedTeacherIds?: string[];
  teacherObservation?: string;
  prompt?: string;
  linkedPortfolioItems?: string[];
  linkedBehaviourPoints?: string[];
  // Service compatibility properties
  groupSize?: 'individual' | 'small_group' | 'whole_class' | number;
  duration?: string | number;
}

export interface LittleExplorersCurriculumTag {
  framework: LittleExplorersCurriculumFramework;
  code: string;
  description: string;
  area: string;
  aiConfidence?: number;
  manuallyAdded: boolean;
}

export type LittleExplorersCurriculumFramework =
  | 'EYLF'
  | 'NQS'
  | 'ACARA_F'
  | 'EYFS'
  | 'CCSS_K'
  | 'HEAD_START'
  | 'TE_WHARIKI'
  | 'CUSTOM';

export type LittleExplorersDevelopmentalArea =
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
  | 'scientific_thinking'
  | 'creative_visual_arts'
  | string;

export interface LittleExplorersPortfolioItemAIAnalysis {
  description: string;
  detectedElements: string[];
  suggestedCurriculumTags: LittleExplorersCurriculumTag[];
  suggestedDevelopmentalAreas: LittleExplorersDevelopmentalArea[];
  developmentalObservations: string[];
  skillsDemonstrated: string[];
  progressIndicators?: {
    area: string;
    indicator: string;
    confidence: number;
  }[];
  qualityScore: number;
  suggestedImprovements?: string[];
  recommendAsHighlight: boolean;
  highlightReason?: string;
  similarItemIds?: string[];
  analyzedAt: Date;
  // Service compatibility properties
  curriculumConfidence?: number;
  highlightRecommendation?: boolean;
  potentialMilestones?: string[] | { milestoneId: string; confidence: number; evidence: string }[];
  developmentalConfidence?: number;
  qualityNotes?: string[] | string;
}

export interface LittleExplorersPortfolioReaction {
  type: 'love' | 'proud' | 'amazing' | 'wow' | 'comment';
  emoji?: string;
  reactedAt?: Date;
  // Service compatibility properties
  parentId?: string;
  parentName?: string;
  comment?: string;
  createdAt?: Date;
}

export interface LittleExplorersPortfolioActivity {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId?: string;
  title: string;
  description: string;
  instructions?: string;
  type: LittleExplorersActivityType;
  responseTypes: LittleExplorersActivityResponseType[];
  content: LittleExplorersActivityContent;
  targetAgeGroups: LittleExplorersAgeGroup[] | string[];
  targetStudentIds?: string[];
  curriculumTags: LittleExplorersCurriculumTag[];
  developmentalAreas: LittleExplorersDevelopmentalArea[];
  dueDate?: Date;
  estimatedMinutes?: number;
  settings: LittleExplorersActivitySettings;
  aiConfig?: LittleExplorersActivityAIConfig;
  responseCount: number;
  completedCount: number;
  status: 'draft' | 'active' | 'closed' | 'archived';
  createdBy: string;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export type LittleExplorersActivityType =
  | 'creative'
  | 'question'
  | 'reflection'
  | 'show_tell'
  | 'challenge'
  | 'journal'
  | 'reading_log'
  | 'assessment';

export type LittleExplorersActivityResponseType =
  | 'text'
  | 'drawing'
  | 'photo'
  | 'video'
  | 'audio'
  | 'choice'
  | 'checklist';

export interface LittleExplorersActivityContent {
  prompt: string;
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    thumbnailUrl?: string;
  }[];
  choices?: {
    id: string;
    text: string;
    imageUrl?: string;
    isCorrect?: boolean;
  }[];
  checklistItems?: {
    id: string;
    text: string;
    required: boolean;
  }[];
  drawingTemplate?: {
    backgroundUrl?: string;
    starterElements?: unknown[];
  };
  wordBank?: string[];
  exampleResponse?: {
    type: LittleExplorersActivityResponseType;
    content: unknown;
  };
}

export interface LittleExplorersActivitySettings {
  allowMultipleSubmissions?: boolean;
  allowRevisions?: boolean;
  requireApproval?: boolean;
  autoShareToParent?: boolean;
  autoShareToStory?: boolean;
  minResponseLength?: number;
  maxResponseLength?: number;
  maxMediaItems?: number;
  drawingColors?: string[];
  drawingTools?: ('pen' | 'brush' | 'eraser' | 'fill' | 'shapes' | 'stickers')[];
  showCorrectAnswers?: boolean;
  provideFeedback?: boolean;
  awardPointsOnCompletion?: boolean;
  pointsSkillId?: string;
  pointsAmount?: number;
  // Service compatibility properties
  allowMultipleAttempts?: boolean;
  showFeedbackImmediately?: boolean;
  requireTeacherReview?: boolean;
  addToPortfolio?: boolean;
  parentCanView?: boolean;
  studentCanRetry?: boolean;
}

export interface LittleExplorersActivityAIConfig {
  autoGenerateFeedback: boolean;
  autoTagCurriculum: boolean;
  autoDetectMilestones: boolean;
  feedbackTone: 'encouraging' | 'instructional' | 'celebratory';
  feedbackLanguageLevel: 'child' | 'parent';
  // Service compatibility properties
  enableAutoFeedback?: boolean;
}

export interface LittleExplorersActivityResponse {
  id: string;
  tenantId: string;
  activityId: string;
  studentId: string;
  responseType: LittleExplorersActivityResponseType;
  content: LittleExplorersActivityResponseContent;
  selectedChoices?: string[];
  checkedItems?: string[];
  completionStatus: 'in_progress' | 'submitted' | 'needs_revision' | 'completed';
  teacherFeedback?: {
    text?: string;
    rating?: number;
    givenBy: string;
    givenAt: Date;
    teacherId?: string;
    teacherName?: string;
    comment?: string;
    stamp?: string;
    voiceNoteUrl?: string;
  };
  aiFeedback?: {
    text?: string;
    suggestions?: string[];
    detectedMilestones?: string[];
    generatedAt?: Date;
    feedback?: string;
    strengths?: string[];
    improvements?: string[];
    nextSteps?: string[];
    encouragement?: string;
    detectedSkills?: string[];
  };
  pointsAwarded: boolean;
  pointId?: string;
  portfolioItemId?: string;
  startedAt: Date;
  submittedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LittleExplorersActivityResponseContent {
  text?: string;
  drawing?: {
    dataUrl: string;
    canvasData?: unknown;
  } | unknown;
  media?: LittleExplorersPortfolioMedia[];
  audio?: {
    url: string;
    duration?: number;
    transcription?: string;
  };
  // Service compatibility properties
  responseText?: string;
  photo?: { url: string } | unknown;
  video?: { url: string } | unknown;
  choice?: string | string[];
  checklist?: unknown;
  type?: LittleExplorersActivityResponseType;
}

export interface LittleExplorersTeacherObservation {
  id: string;
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentIds: string[];
  observation: string;
  context?: {
    activityType?: string;
    location?: string;
    groupSize?: 'individual' | 'small_group' | 'whole_class' | number;
    duration?: string | number;
  };
  type: LittleExplorersObservationType;
  developmentalAreas: LittleExplorersDevelopmentalArea[];
  curriculumTags: LittleExplorersCurriculumTag[];
  aiEnhanced: boolean;
  aiSuggestions?: {
    additionalTags?: LittleExplorersCurriculumTag[];
    relatedMilestones?: string[];
    followUpSuggestions?: string[];
    enhancedText?: string;
    suggestedDevelopmentalAreas?: LittleExplorersDevelopmentalArea[];
    suggestedCurriculumTags?: LittleExplorersCurriculumTag[];
    detectedSkills?: string[];
    nextStepsSuggestions?: string[];
  };
  media?: LittleExplorersPortfolioMedia[];
  convertedToPortfolioItem: boolean;
  portfolioItemId?: string;
  observedBy: string;
  observedByName: string;
  observedAt: Date;
  createdAt: Date;
}

export type LittleExplorersObservationType =
  | 'anecdotal'
  | 'running_record'
  | 'learning_story'
  | 'checklist'
  | 'time_sample'
  | 'event_sample'
  | 'quick_note';

export interface LittleExplorersDevelopmentalMilestone {
  id: string;
  framework: LittleExplorersCurriculumFramework;
  name: string;
  description: string;
  indicators: string[];
  area: LittleExplorersDevelopmentalArea;
  ageRange: {
    minMonths: number;
    maxMonths: number;
  };
  prerequisiteMilestones?: string[];
  nextMilestones?: string[];
  supportStrategies: string[];
  isActive: boolean;
}

export interface LittleExplorersStudentMilestone {
  id: string;
  tenantId: string;
  studentId: string;
  milestoneId: string;
  status: 'not_started' | 'emerging' | 'developing' | 'achieved' | 'in_progress' | 'exceeded';
  evidenceItems: {
    portfolioItemId: string;
    relevance?: string;
    addedAt: Date;
  }[];
  teacherNotes?: string;
  aiDetected: boolean;
  aiConfidence?: number;
  firstObservedAt?: Date;
  achievedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LittleExplorersStudentProgressSummary {
  studentId: string;
  studentName: string;
  period: DateRange;
  portfolioStats: {
    totalItems: number;
    itemsByType: { [type: string]: number };
    highlights: number;
    parentViews: number;
    parentReactions: number;
  };
  activityStats: {
    assigned: number;
    completed: number;
    completionRate: number;
  };
  developmentalProgress: {
    area: LittleExplorersDevelopmentalArea;
    milestonesAchieved: number;
    milestonesTotal: number;
    trend: 'ahead' | 'on_track' | 'needs_support';
  }[];
  curriculumCoverage: {
    framework: LittleExplorersCurriculumFramework;
    area: string;
    tagCount: number;
    percentage: number;
  }[];
  behaviourSummary?: {
    totalPoints: number;
    topSkills: string[];
    trend: string;
  };
  aiNarrative?: LittleExplorersProgressNarrative;
  generatedAt: Date;
}

export interface LittleExplorersProgressNarrative {
  teacherSummary: string;
  keyObservations: string[];
  areasOfStrength: string[];
  areasForGrowth: string[];
  suggestedNextSteps: string[];
  parentSummary: string;
  parentHighlights: string[];
  parentSuggestions: string[];
  formalNarrative: string;
  basedOnItemCount: number;
  confidenceLevel: number;
  generatedAt: Date;
}

export interface LittleExplorersPortfolioReport {
  id: string;
  tenantId: string;
  schoolId?: string;
  classroomId?: string;
  studentId: string;
  title?: string;
  period: DateRange | string;
  dateRange?: DateRange;
  type?: 'weekly' | 'monthly' | 'term' | 'semester' | 'annual' | 'custom';
  summary?: string;
  highlights?: LittleExplorersPortfolioItem[] | { itemId: string; title: string; description?: string; capturedAt: Date }[];
  progressSummary?: LittleExplorersStudentProgressSummary;
  teacherComments?: string;
  goalsForNextPeriod?: string[];
  aiGenerated?: boolean;
  aiNarrative?: LittleExplorersProgressNarrative;
  sharedWithParent?: boolean;
  sharedAt?: Date;
  parentViewed?: boolean;
  parentViewedAt?: Date;
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
  // Service compatibility properties
  narrative?: LittleExplorersProgressNarrative | string;
  milestonesSummary?: {
    achieved: number;
    inProgress: number;
    total?: number;
    details?: { milestoneId: string; status: LittleExplorersMilestoneStatus; achievedAt?: Date }[] | unknown;
  };
  generatedAt?: Date;
  generatedBy?: string;
  status?: 'draft' | 'final' | 'published';
}

export interface LittleExplorersStudentPortfolioAccess {
  studentId: string;
  loginMethod?: 'qr_code' | 'text_code' | 'picture_password' | 'parent_device';
  loginCode?: string;
  pictureSequence?: string[];
  canViewOwnPortfolio?: boolean;
  canAddPhotos?: boolean;
  canAddDrawings?: boolean;
  canAddVoiceRecordings?: boolean;
  canRespondToActivities?: boolean;
  canViewClassStory?: boolean;
  canViewOwnPoints?: boolean;
  currentSessionId?: string;
  lastAccessedAt?: Date;
  accessHistory?: {
    deviceId: string;
    accessedAt: Date;
    duration: number;
  }[];
  maxSessionMinutes?: number;
  allowedHours?: { start: string; end: string };
  // Service compatibility properties
  loginType?: LittleExplorersPortfolioLoginType;
  isActive?: boolean;
  qrCodeUrl?: string;
  pictureOptions?: string[];
  lastLogin?: Date;
  createdAt?: Date;
}

// ============================================================================
// AI TYPES
// ============================================================================

export interface LittleExplorersAIProviderConfig {
  provider: 'anthropic' | 'openai' | 'azure_openai' | 'scholarly_internal';
  models: {
    reasoning: string;
    generation: string;
    embedding: string;
    moderation: string;
    vision: string;
  };
  rateLimits: {
    requestsPerMinute: number;
    tokensPerMinute: number;
    requestsPerDay: number;
  };
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
  customInstructions?: string;
  schoolContext?: string;
  logInteractions: boolean;
  retainLogsForDays: number;
}

export interface LittleExplorersAIContext {
  school?: {
    id: string;
    name: string;
    type: string;
    jurisdiction: string;
    educationalPhilosophy?: string;
    customInstructions?: string;
  };
  classroom?: {
    id: string;
    name: string;
    grade: LittleExplorersAgeGroup;
    studentCount: number;
    teacherNames: string[];
    currentTheme?: string;
  };
  student?: {
    id: string;
    firstName: string;
    age: number;
    grade: LittleExplorersAgeGroup | 'kindergarten';
    learningStyle?: string;
    interests?: string[];
    supportNeeds?: string[];
    recentBehaviour?: string;
    recentProgress?: string;
  };
  parent?: {
    id: string;
    firstName: string;
    preferredLanguage: string;
    communicationStyle?: string;
    engagementLevel?: string;
  };
  teacher?: {
    id?: string;
    firstName: string;
    lastName?: string;
    preferredTone?: string;
    role?: string;
    specializations?: string[];
  };
  timeContext: {
    currentTime: Date;
    dayOfWeek: string;
    periodOfDay: 'morning' | 'midday' | 'afternoon';
    termWeek?: number;
    specialEvent?: string;
  };
  recentInteractions?: {
    type: string;
    summary: string;
    timestamp: Date;
  }[];
}

export type LittleExplorersAIPromptCategory =
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

export interface LittleExplorersAIInteractionLog {
  id: string;
  tenantId: string;
  requestType: LittleExplorersAIPromptCategory;
  requestTimestamp: Date;
  inputSummary: string;
  inputTokens: number;
  responseTimestamp: Date;
  outputSummary: string;
  outputTokens: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  model: string;
  cost?: number;
  userId?: string;
  classroomId?: string;
  studentId?: string;
  feedback?: {
    helpful: boolean;
    edited: boolean;
    rejected: boolean;
    comments?: string;
  };
}

export interface LittleExplorersAIUsageStats {
  tenantId: string;
  period: { start: Date; end: Date };
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCost: number;
  byCategory: {
    category: LittleExplorersAIPromptCategory;
    count: number;
    tokens: number;
    cost: number;
  }[];
  successRate: number;
  averageLatencyMs: number;
  feedbackPositiveRate: number;
  limitWarnings: string[];
}

// ============================================================================
// SERVICE INPUT/OUTPUT TYPES
// ============================================================================

export interface LittleExplorersAwardPointInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  awardedBy: string;
  studentIds: string[];
  skillId: string;
  points?: number;
  description?: string;
  tags?: string[];
  linkedActivityId?: string;
  linkedPortfolioItemId?: string;
  location?: LittleExplorersExplorerPoint['location'];
  customLocation?: string;
  fromAISuggestion?: string;
}

export interface LittleExplorersAwardPointOutput {
  points: LittleExplorersExplorerPoint[];
  groupAward?: LittleExplorersGroupAward;
  celebrationsTriggered: LittleExplorersCelebration[];
  streaksUpdated: { studentId: string; newStreak: number }[];
  parentNotifications: { studentId: string; parentIds: string[] }[];
}

export interface LittleExplorersCreateStoryPostInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  authorId: string;
  content: LittleExplorersStoryContent;
  visibility?: LittleExplorersStoryPost['visibility'];
  taggedStudentIds?: string[];
  learningConnections?: LittleExplorersLearningConnection[];
  scheduledFor?: Date;
  generateCaption?: boolean;
  analyzeContent?: boolean;
}

export interface LittleExplorersSendMessageInput {
  tenantId: string;
  schoolId?: string;
  conversationId?: string;
  senderId: string;
  senderRole?: 'teacher' | 'parent' | 'admin';
  classroomId?: string;
  studentId?: string;
  recipientIds?: string[];
  newConversation?: {
    classroomId: string;
    participantIds: string[];
    relatedStudentId?: string;
    subject?: string;
  };
  content: LittleExplorersMessageContent | string;
  useDraft?: string;
  translateTo?: string[];
  analyzeToggle?: boolean;
}

export interface LittleExplorersAddPortfolioItemInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  createdBy: string;
  type: LittleExplorersPortfolioItemType;
  title: string;
  description?: string;
  media?: Omit<LittleExplorersPortfolioMedia, 'id' | 'uploadedAt'>[];
  text?: string;
  drawingData?: LittleExplorersPortfolioContent['drawingData'];
  document?: LittleExplorersPortfolioContent['document'];
  context?: Partial<LittleExplorersPortfolioContext>;
  capturedAt?: Date;
  autoApprove?: boolean;
  shareToStory?: boolean;
  setAsHighlight?: boolean;
  analyzeContent?: boolean;
  suggestCurriculumTags?: boolean;
}

export interface LittleExplorersGenerateProgressReportInput {
  tenantId: string;
  schoolId: string;
  classroomId: string;
  studentId: string;
  createdBy: string;
  period: DateRange;
  type: LittleExplorersPortfolioReport['type'];
  includeHighlights?: boolean;
  includeBehaviour?: boolean;
  includeAttendance?: boolean;
  teacherComments?: string;
  goalsForNextPeriod?: string[];
  generateNarrative?: boolean;
  narrativeTone?: 'formal' | 'warm' | 'celebratory';
  shareWithParent?: boolean;
  generatePdf?: boolean;
}

// ============================================================================
// DEFAULT BEHAVIOUR SKILLS
// ============================================================================

export const LITTLE_EXPLORERS_DEFAULT_SKILLS: Omit<
  LittleExplorersBehaviourSkill,
  'id' | 'tenantId' | 'schoolId' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Kind Hearts',
    emoji: '💖',
    description: 'Showed kindness to others',
    category: LittleExplorersSkillCategory.CORE_VALUES,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: Object.values(LittleExplorersAgeGroup),
    aiConfig: {
      triggerKeywords: ['kind', 'nice', 'caring', 'thoughtful', 'considerate', 'gentle'],
      observationPhrases: [
        'helped a friend',
        'shared with',
        'comforted',
        'included someone',
        'said something nice',
      ],
      contextIndicators: ['social interaction', 'helping', 'empathy'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8,
    },
    isActive: true,
    sortOrder: 1,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Helping Hands',
    emoji: '🤝',
    description: 'Helped someone without being asked',
    category: LittleExplorersSkillCategory.SOCIAL_EMOTIONAL,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [
      LittleExplorersAgeGroup.NURSERY,
      LittleExplorersAgeGroup.PRE_K,
      LittleExplorersAgeGroup.KINDERGARTEN,
      LittleExplorersAgeGroup.YEAR_1,
      LittleExplorersAgeGroup.YEAR_2,
    ],
    aiConfig: {
      triggerKeywords: ['help', 'assist', 'support', 'volunteer'],
      observationPhrases: [
        'helped without asking',
        'offered to help',
        'assisted classmate',
        'cleaned up',
      ],
      contextIndicators: ['initiative', 'unprompted', 'helpful'],
      expectedFrequency: 'regular',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.85,
    },
    isActive: true,
    sortOrder: 2,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Super Listener',
    emoji: '👂',
    description: 'Listened carefully and followed instructions',
    category: LittleExplorersSkillCategory.SELF_REGULATION,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: Object.values(LittleExplorersAgeGroup),
    aiConfig: {
      triggerKeywords: ['listen', 'attention', 'focus', 'follow instructions', 'paying attention'],
      observationPhrases: [
        'listened carefully',
        'followed directions',
        'paid attention',
        'first time listening',
      ],
      contextIndicators: ['carpet time', 'instructions', 'group activity'],
      typicalTimes: ['morning', 'after_transitions'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.75,
    },
    isActive: true,
    sortOrder: 3,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Hard Worker',
    emoji: '💪',
    description: 'Worked hard and tried their best',
    category: LittleExplorersSkillCategory.ACADEMIC,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [
      LittleExplorersAgeGroup.NURSERY,
      LittleExplorersAgeGroup.PRE_K,
      LittleExplorersAgeGroup.KINDERGARTEN,
      LittleExplorersAgeGroup.YEAR_1,
      LittleExplorersAgeGroup.YEAR_2,
    ],
    aiConfig: {
      triggerKeywords: ['effort', 'try', 'persevere', 'work hard', 'persist', 'determination'],
      observationPhrases: [
        'tried really hard',
        'kept going',
        "didn't give up",
        'put in effort',
        'worked diligently',
      ],
      contextIndicators: ['challenging task', 'learning activity', 'persistence'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8,
    },
    isActive: true,
    sortOrder: 4,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Teamwork Star',
    emoji: '⭐',
    description: 'Worked well with others as a team',
    category: LittleExplorersSkillCategory.COLLABORATION,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [
      LittleExplorersAgeGroup.PRE_K,
      LittleExplorersAgeGroup.KINDERGARTEN,
      LittleExplorersAgeGroup.YEAR_1,
      LittleExplorersAgeGroup.YEAR_2,
    ],
    aiConfig: {
      triggerKeywords: ['team', 'together', 'cooperate', 'collaborate', 'share'],
      observationPhrases: [
        'worked together',
        'cooperated with group',
        'shared ideas',
        'took turns',
      ],
      contextIndicators: ['group work', 'team activity', 'collaborative'],
      expectedFrequency: 'regular',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8,
    },
    isActive: true,
    sortOrder: 5,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Brave Learner',
    emoji: '🦁',
    description: 'Tried something new or challenging',
    category: LittleExplorersSkillCategory.INDEPENDENCE,
    isPositive: true,
    defaultPoints: 2,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: Object.values(LittleExplorersAgeGroup),
    aiConfig: {
      triggerKeywords: ['brave', 'try new', 'challenge', 'courage', 'risk'],
      observationPhrases: [
        'tried something new',
        'faced a fear',
        'stepped out of comfort zone',
        'took a risk',
      ],
      contextIndicators: ['new activity', 'challenging', 'first time'],
      expectedFrequency: 'occasional',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.85,
    },
    isActive: true,
    sortOrder: 6,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Creative Mind',
    emoji: '🎨',
    description: 'Showed creativity and imagination',
    category: LittleExplorersSkillCategory.CREATIVE,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: Object.values(LittleExplorersAgeGroup),
    aiConfig: {
      triggerKeywords: ['creative', 'imagine', 'invent', 'original', 'artistic'],
      observationPhrases: [
        'made something creative',
        'used imagination',
        'thought of a new way',
        'creative solution',
      ],
      contextIndicators: ['art', 'building', 'problem solving', 'play'],
      expectedFrequency: 'regular',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.75,
    },
    isActive: true,
    sortOrder: 7,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Problem Solver',
    emoji: '🧩',
    description: 'Solved a problem independently',
    category: LittleExplorersSkillCategory.ACADEMIC,
    isPositive: true,
    defaultPoints: 2,
    minPoints: 1,
    maxPoints: 3,
    ageGroups: [
      LittleExplorersAgeGroup.PRE_K,
      LittleExplorersAgeGroup.KINDERGARTEN,
      LittleExplorersAgeGroup.YEAR_1,
      LittleExplorersAgeGroup.YEAR_2,
    ],
    aiConfig: {
      triggerKeywords: ['solve', 'figure out', 'work out', 'solution', 'think'],
      observationPhrases: [
        'solved independently',
        'figured it out',
        'found a solution',
        'worked through',
      ],
      contextIndicators: ['challenge', 'puzzle', 'conflict resolution'],
      expectedFrequency: 'occasional',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8,
    },
    isActive: true,
    sortOrder: 8,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Tidy Up Champion',
    emoji: '🧹',
    description: 'Cleaned up without being asked',
    category: LittleExplorersSkillCategory.INDEPENDENCE,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: Object.values(LittleExplorersAgeGroup),
    aiConfig: {
      triggerKeywords: ['tidy', 'clean', 'pack away', 'organize'],
      observationPhrases: [
        'tidied up',
        'cleaned without asking',
        'packed away',
        'kept area clean',
      ],
      contextIndicators: ['transition', 'end of activity', 'independent'],
      typicalTimes: ['before_lunch', 'end_of_day', 'after_activity'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.85,
    },
    isActive: true,
    sortOrder: 9,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
  {
    name: 'Safe Choices',
    emoji: '🛡️',
    description: 'Made safe choices for self and others',
    category: LittleExplorersSkillCategory.SELF_REGULATION,
    isPositive: true,
    defaultPoints: 1,
    minPoints: 1,
    maxPoints: 2,
    ageGroups: Object.values(LittleExplorersAgeGroup),
    aiConfig: {
      triggerKeywords: ['safe', 'careful', 'cautious', 'sensible'],
      observationPhrases: [
        'made a safe choice',
        'being careful',
        'keeping others safe',
        'walking feet',
      ],
      contextIndicators: ['playground', 'transitions', 'physical activity'],
      expectedFrequency: 'frequent',
      relatedSkillIds: [],
      autoSuggestConfidence: 0.8,
    },
    isActive: true,
    sortOrder: 10,
    usageCount: 0,
    isSystem: true,
    isCustom: false,
  },
];

// ============================================================================
// TYPE ALIASES FOR SERVICE COMPATIBILITY
// ============================================================================

// Portfolio service compatibility
export type LittleExplorersActivity = LittleExplorersPortfolioActivity;
export type LittleExplorersMilestoneStatus = 'not_started' | 'in_progress' | 'achieved' | 'exceeded' | 'emerging' | 'developing';
export type LittleExplorersProgressReport = LittleExplorersPortfolioReport;
export type LittleExplorersStudentAccess = LittleExplorersStudentPortfolioAccess;
export type LittleExplorersPortfolioLoginType = 'qr_code' | 'text_code' | 'picture_password' | 'parent_device';


// ============================================================================
// ID GENERATION HELPERS
// ============================================================================

export function generateLittleExplorersId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}${random}`;
}

export function generateLittleExplorersClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateLittleExplorersStudentCode(): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
