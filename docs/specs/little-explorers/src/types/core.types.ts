/**
 * Little Explorers - Core Domain Types
 * 
 * Comprehensive type definitions for the Early Years Education platform.
 * These types form the foundation of all data structures and ensure
 * type safety across the entire application.
 * 
 * @module LittleExplorers/Types/Core
 * @version 1.0.0
 */

// ============================================================================
// RESULT TYPE (Consistent with Scholarly patterns)
// ============================================================================

export type Result<T, E = LittleExplorersError> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T, never> {
  return { success: true, data };
}

export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class LittleExplorersError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'LittleExplorersError';
    Object.setPrototypeOf(this, LittleExplorersError.prototype);
  }
}

export class ValidationError extends LittleExplorersError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends LittleExplorersError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} not found: ${id}`, { entity, id });
    this.name = 'NotFoundError';
  }
}

export class AuthorizationError extends LittleExplorersError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('AUTHORIZATION_ERROR', message, details);
    this.name = 'AuthorizationError';
  }
}

export class ConsentRequiredError extends LittleExplorersError {
  constructor(
    public readonly childId: string,
    public readonly consentType: ConsentType,
    message?: string
  ) {
    super('CONSENT_REQUIRED', message || `Parental consent required: ${consentType}`, { childId, consentType });
    this.name = 'ConsentRequiredError';
  }
}

export class QuietHoursError extends LittleExplorersError {
  constructor(
    public readonly recipientId: string,
    public readonly resumesAt: Date
  ) {
    super('QUIET_HOURS', `Recipient has quiet hours enabled until ${resumesAt.toISOString()}`, { recipientId, resumesAt: resumesAt.toISOString() });
    this.name = 'QuietHoursError';
  }
}

export class ContentModerationError extends LittleExplorersError {
  constructor(
    public readonly contentId: string,
    public readonly reason: string,
    public readonly flags: string[]
  ) {
    super('CONTENT_MODERATION', `Content flagged for moderation: ${reason}`, { contentId, flags });
    this.name = 'ContentModerationError';
  }
}

export class SafeguardingError extends LittleExplorersError {
  constructor(message: string, public readonly severity: 'low' | 'medium' | 'high' | 'critical') {
    super('SAFEGUARDING_ALERT', message, { severity });
    this.name = 'SafeguardingError';
  }
}

// ============================================================================
// ENUMS - CORE DOMAINS
// ============================================================================

/**
 * Age groups for early years education
 */
export enum AgeGroup {
  TODDLER = 'toddler',           // 2-3 years
  NURSERY = 'nursery',           // 3-4 years
  PRE_K = 'pre_k',               // 4-5 years
  KINDERGARTEN = 'kindergarten', // 5-6 years (US) / Prep (AU)
  YEAR_1 = 'year_1',             // 6-7 years
  YEAR_2 = 'year_2'              // 7-8 years
}

/**
 * Supported jurisdictions
 */
export enum Jurisdiction {
  AU_NSW = 'AU_NSW', AU_VIC = 'AU_VIC', AU_QLD = 'AU_QLD', AU_WA = 'AU_WA',
  AU_SA = 'AU_SA', AU_TAS = 'AU_TAS', AU_ACT = 'AU_ACT', AU_NT = 'AU_NT',
  UK_ENGLAND = 'UK_ENGLAND', UK_SCOTLAND = 'UK_SCOTLAND', UK_WALES = 'UK_WALES',
  US_GENERIC = 'US_GENERIC', NZ = 'NZ', SG = 'SG', HK = 'HK'
}

/**
 * Types of consent that may be required
 */
export enum ConsentType {
  PHOTO_VIDEO = 'photo_video',
  PORTFOLIO_SHARING = 'portfolio_sharing',
  CLASS_STORY = 'class_story',
  SCHOOL_STORY = 'school_story',
  EXTERNAL_SHARING = 'external_sharing',
  AI_ANALYSIS = 'ai_analysis',
  LOCATION_EXCURSION = 'location_excursion',
  MEDICAL_INFO = 'medical_info',
  EMERGENCY_CONTACT = 'emergency_contact',
  THIRD_PARTY_APPS = 'third_party_apps'
}

/**
 * User roles in the system
 */
export enum UserRole {
  STUDENT = 'student',
  PARENT = 'parent',
  GUARDIAN = 'guardian',
  TEACHER = 'teacher',
  TEACHING_ASSISTANT = 'teaching_assistant',
  SPECIALIST = 'specialist',       // Music, PE, Art teachers
  SCHOOL_ADMIN = 'school_admin',
  PRINCIPAL = 'principal',
  DISTRICT_ADMIN = 'district_admin',
  PLATFORM_ADMIN = 'platform_admin'
}

/**
 * Subscription tiers
 */
export enum SubscriptionTier {
  FREE = 'free',
  CLASSROOM = 'classroom',
  SCHOOL = 'school',
  SCHOOL_PLUS = 'school_plus',
  DISTRICT = 'district',
  ENTERPRISE = 'enterprise'
}

// ============================================================================
// SCHOOL & CLASSROOM STRUCTURES
// ============================================================================

/**
 * School entity - the top-level organizational unit
 */
export interface School {
  id: string;
  tenantId: string;
  
  // Identity
  name: string;
  shortName?: string;
  type: SchoolType;
  jurisdiction: Jurisdiction;
  
  // Contact Information
  address: Address;
  phone: string;
  email: string;
  website?: string;
  
  // Operational
  timezone: string;
  academicYearStart: number;  // Month (1-12)
  termStructure: TermStructure;
  operatingHours: OperatingHours;
  
  // Branding
  branding: SchoolBranding;
  
  // Configuration
  settings: SchoolSettings;
  
  // Subscription & Features
  subscription: Subscription;
  
  // Statistics (denormalized for performance)
  stats: SchoolStats;
  
  // Compliance
  compliance: ComplianceInfo;
  
  // AI Configuration
  aiConfig: SchoolAIConfig;
  
  // Audit
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

export type SchoolType = 
  | 'early_learning_centre'
  | 'childcare'
  | 'preschool'
  | 'primary_school'
  | 'combined_k12'
  | 'montessori'
  | 'waldorf'
  | 'special_education';

export interface Address {
  line1: string;
  line2?: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface TermStructure {
  type: 'semester' | 'trimester' | 'quarter' | 'term';
  terms: Term[];
}

export interface Term {
  id: string;
  name: string;
  startDate: string;  // ISO date
  endDate: string;
  holidays: Holiday[];
}

export interface Holiday {
  name: string;
  startDate: string;
  endDate: string;
  type: 'public' | 'school' | 'professional_development';
}

export interface OperatingHours {
  standard: DayHours[];
  beforeSchoolCare?: { start: string; end: string };
  afterSchoolCare?: { start: string; end: string };
}

export interface DayHours {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6;  // 0 = Sunday
  open: boolean;
  start?: string;  // "08:30"
  end?: string;    // "15:30"
}

export interface SchoolBranding {
  logoUrl?: string;
  iconUrl?: string;
  primaryColour: string;
  secondaryColour: string;
  accentColour?: string;
  mascotName?: string;
  mascotImageUrl?: string;
  tagline?: string;
}

export interface SchoolSettings {
  behaviour: BehaviourSettings;
  communication: CommunicationSettings;
  portfolio: PortfolioSettings;
  attendance: AttendanceSettings;
  safety: SafetySettings;
  privacy: PrivacySettings;
}

export interface BehaviourSettings {
  skillsLibrary: BehaviourSkill[];
  allowCustomSkills: boolean;
  maxCustomSkillsPerClass: number;
  enableNegativePoints: boolean;
  negativePointsVisibleToParents: boolean;
  enableSchoolWidePoints: boolean;
  schoolWideLocations: string[];
  pointResetSchedule: 'never' | 'daily' | 'weekly' | 'term' | 'year';
  celebrationThresholds: CelebrationThreshold[];
  enableAIPointSuggestions: boolean;
  aiSuggestionFrequency: 'always' | 'hourly' | 'session';
}

export interface BehaviourSkill {
  id: string;
  name: string;
  emoji: string;
  category: SkillCategory;
  defaultPoints: number;
  description: string;
  pbisAlignment?: string;
  ageAppropriate: AgeGroup[];
  aiKeywords: string[];  // For AI to detect behaviour
  isNegative: boolean;
  isActive: boolean;
  sortOrder: number;
}

export type SkillCategory = 
  | 'core_values'
  | 'social_emotional'
  | 'academic'
  | 'self_regulation'
  | 'physical'
  | 'creative'
  | 'custom';

export interface CelebrationThreshold {
  points: number;
  celebration: string;
  emoji: string;
  notification: boolean;
  certificateTemplate?: string;
}

export interface CommunicationSettings {
  defaultQuietHoursStart: string;
  defaultQuietHoursEnd: string;
  allowParentToParentMessaging: boolean;
  requireMessageApproval: boolean;
  autoTranslate: boolean;
  supportedLanguages: string[];
  maxAttachmentsPerMessage: number;
  maxMessageLength: number;
  enableReadReceipts: boolean;
  enableTypingIndicators: boolean;
  emergencyBypassQuietHours: boolean;
  aiDraftSuggestions: boolean;
  aiToneAnalysis: boolean;
}

export interface PortfolioSettings {
  requireApprovalBeforeParentView: boolean;
  allowStudentUploads: boolean;
  maxMediaPerDay: number;
  mediaQualityCompression: 'none' | 'light' | 'medium' | 'heavy';
  retentionPeriodYears: number;
  enableAITagging: boolean;
  enableAIHighlights: boolean;
  enableAIProgressNarratives: boolean;
  curriculumTaggingFramework?: string;
}

export interface AttendanceSettings {
  trackingMethod: 'manual' | 'qr_code' | 'facial_recognition' | 'parent_checkin';
  lateThresholdMinutes: number;
  absenceNotificationDelay: number;  // Minutes after start
  requireAbsenceReason: boolean;
  enableAIPrediction: boolean;
  unexplainedAbsenceAlertDays: number;
}

export interface SafetySettings {
  enableSafetyMonitoring: boolean;
  keywordScanningEnabled: boolean;
  customKeywords: string[];
  alertRecipients: string[];
  photoFacialBlurNonConsented: boolean;
  locationTrackingExcursions: boolean;
  emergencyContactsRequired: number;
  medicalInfoRequired: boolean;
  enableAISafeguarding: boolean;
}

export interface PrivacySettings {
  dataRetentionYears: number;
  allowDataExport: boolean;
  anonymizeInactiveAfterYears: number;
  consentRequired: ConsentType[];
  defaultConsentState: boolean;
  gdprCompliant: boolean;
  coppaCompliant: boolean;
  ferpaCompliant: boolean;
}

export interface Subscription {
  tier: SubscriptionTier;
  status: 'active' | 'trial' | 'past_due' | 'cancelled' | 'suspended';
  startDate: Date;
  endDate: Date;
  trialEndsAt?: Date;
  features: string[];
  limits: SubscriptionLimits;
  billing?: BillingInfo;
}

export interface SubscriptionLimits {
  maxClasses: number;
  maxStudentsPerClass: number;
  maxTeachers: number;
  maxStorageGB: number;
  maxAIRequestsPerMonth: number;
  maxTranslationsPerMonth: number;
}

export interface BillingInfo {
  customerId: string;
  subscriptionId: string;
  provider: 'stripe' | 'scholarly_internal';
  nextBillingDate: Date;
  amount: number;
  currency: string;
}

export interface SchoolStats {
  totalClasses: number;
  totalActiveStudents: number;
  totalTeachers: number;
  totalParentAccounts: number;
  pointsAwardedAllTime: number;
  pointsAwardedThisTerm: number;
  storiesPostedAllTime: number;
  storiesPostedThisWeek: number;
  messagesThisWeek: number;
  portfolioItemsTotal: number;
  averageParentEngagement: number;  // 0-100
  lastCalculated: Date;
}

export interface ComplianceInfo {
  registrationNumber?: string;
  registrationAuthority?: string;
  registrationExpiry?: Date;
  qualityRating?: string;
  lastInspection?: Date;
  nextInspectionDue?: Date;
  certifications: Certification[];
  policies: PolicyDocument[];
}

export interface Certification {
  name: string;
  issuedBy: string;
  issuedDate: Date;
  expiryDate?: Date;
  documentUrl?: string;
}

export interface PolicyDocument {
  name: string;
  type: string;
  version: string;
  effectiveDate: Date;
  documentUrl: string;
  acknowledgementRequired: boolean;
}

export interface SchoolAIConfig {
  enableAI: boolean;
  provider: 'anthropic' | 'openai' | 'scholarly_internal';
  features: {
    behaviourSuggestions: boolean;
    portfolioNarratives: boolean;
    communicationDrafts: boolean;
    attendancePrediction: boolean;
    progressAnalysis: boolean;
    safeguardingAlerts: boolean;
    parentEngagementInsights: boolean;
    curriculumAlignment: boolean;
  };
  customPromptContext?: string;
  dataUsageConsent: boolean;
  retainAIInteractions: boolean;
}

export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived' | 'deleted';

// ============================================================================
// CLASSROOM TYPES
// ============================================================================

/**
 * Classroom - where learning happens
 */
export interface Classroom {
  id: string;
  tenantId: string;
  schoolId: string;
  
  // Identity
  name: string;
  displayName: string;
  grade: AgeGroup;
  academicYear: number;
  
  // Theme (for student engagement)
  theme: ClassroomTheme;
  
  // People
  teachers: ClassroomTeacher[];
  students: ClassroomStudent[];
  
  // Configuration
  settings: ClassroomSettings;
  
  // Behaviour system
  skills: string[];  // Skill IDs (combines school defaults + custom)
  customSkills: BehaviourSkill[];
  
  // Class code for parent joining
  classCode: string;
  classCodeExpiry?: Date;
  
  // Statistics
  stats: ClassroomStats;
  
  // AI-generated insights
  aiInsights?: ClassroomAIInsights;
  
  // Status
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface ClassroomTheme {
  name: string;
  backgroundUrl?: string;
  iconUrl?: string;
  mascotName?: string;
  mascotImageUrl?: string;
  primaryColour: string;
  celebrationAnimation: string;
}

export interface ClassroomTeacher {
  userId: string;
  role: 'lead' | 'assistant' | 'specialist' | 'relief';
  subjects?: string[];
  startDate: Date;
  endDate?: Date;
}

export interface ClassroomStudent {
  studentId: string;
  enrolledDate: Date;
  withdrawnDate?: Date;
  status: 'enrolled' | 'withdrawn' | 'transferred';
}

export interface ClassroomSettings {
  // Story settings
  classStoryEnabled: boolean;
  parentCanComment: boolean;
  parentCanLike: boolean;
  
  // Points
  pointsGoalDaily?: number;
  pointsGoalWeekly?: number;
  showLeaderboard: boolean;
  leaderboardType: 'individual' | 'table_groups' | 'none';
  
  // Student experience
  studentViewEnabled: boolean;
  studentCanViewOwnPoints: boolean;
  studentCanViewClassPoints: boolean;
  
  // Groups
  tableGroups: TableGroup[];
  
  // Schedule
  schedule: ClassSchedule;
}

export interface TableGroup {
  id: string;
  name: string;
  colour: string;
  emoji: string;
  memberIds: string[];
}

export interface ClassSchedule {
  periods: SchedulePeriod[];
  specialDays: SpecialDay[];
}

export interface SchedulePeriod {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: number[];
  type: 'learning' | 'break' | 'transition' | 'special';
  subject?: string;
}

export interface SpecialDay {
  date: string;
  name: string;
  modifiedSchedule?: SchedulePeriod[];
}

export interface ClassroomStats {
  totalPoints: number;
  pointsToday: number;
  pointsThisWeek: number;
  storiesThisWeek: number;
  portfolioItemsThisWeek: number;
  attendanceRate: number;
  parentEngagementRate: number;
  lastUpdated: Date;
}

export interface ClassroomAIInsights {
  summary: string;
  highlights: string[];
  concerns: string[];
  recommendations: string[];
  engagementTrend: 'improving' | 'stable' | 'declining';
  topAchievers: { studentId: string; reason: string }[];
  needingSupport: { studentId: string; reason: string }[];
  generatedAt: Date;
  validUntil: Date;
}

// ============================================================================
// STUDENT TYPES
// ============================================================================

/**
 * Student - the young learner
 */
export interface Student {
  id: string;
  tenantId: string;
  schoolId: string;
  
  // Identity (minimal PII)
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: Date;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  // Avatar (gamification)
  avatar: StudentAvatar;
  
  // Family connections
  familyConnections: FamilyConnection[];
  
  // Current enrollment
  currentClassroomId?: string;
  enrollmentHistory: EnrollmentRecord[];
  
  // Learning profile
  learningProfile: StudentLearningProfile;
  
  // Medical & emergency
  medicalInfo?: MedicalInfo;
  emergencyContacts: EmergencyContact[];
  
  // Consents
  consents: ConsentRecord[];
  
  // Behaviour & Progress
  behaviourSummary: BehaviourSummary;
  
  // Student login (for portfolio access)
  studentLogin?: StudentLogin;
  
  // LIS Integration (Scholarly ecosystem)
  lisProfileId?: string;
  lisIntegrationEnabled: boolean;
  
  // Status
  status: EntityStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentAvatar {
  type: 'monster' | 'animal' | 'robot' | 'custom';
  baseId: string;
  customizations: AvatarCustomization[];
  unlockedItems: string[];
  currentLevel: number;
  experiencePoints: number;
  nextLevelAt: number;
}

export interface AvatarCustomization {
  slot: 'body' | 'eyes' | 'mouth' | 'accessory' | 'background' | 'effect';
  itemId: string;
  unlockedAt: Date;
}

export interface FamilyConnection {
  userId: string;
  relationship: 'mother' | 'father' | 'guardian' | 'grandparent' | 'other';
  isPrimary: boolean;
  canPickup: boolean;
  canReceiveReports: boolean;
  canAccessPortfolio: boolean;
  canMessage: boolean;
}

export interface EnrollmentRecord {
  classroomId: string;
  classroomName: string;
  academicYear: number;
  term?: string;
  startDate: Date;
  endDate?: Date;
  exitReason?: string;
}

export interface StudentLearningProfile {
  // Learning preferences
  learningStyle?: 'visual' | 'auditory' | 'kinesthetic' | 'reading_writing' | 'mixed';
  attentionSpan: 'short' | 'moderate' | 'long';
  bestTimeOfDay: 'morning' | 'midday' | 'afternoon';
  
  // Strengths & challenges
  interests: string[];
  strengths: string[];
  challenges: string[];
  
  // Support needs
  supportNeeds?: SupportNeed[];
  
  // Goals (AI-suggested or teacher-set)
  currentGoals: LearningGoal[];
  
  // AI analysis
  aiProfile?: StudentAIProfile;
}

export interface SupportNeed {
  type: 'learning' | 'physical' | 'behavioural' | 'emotional' | 'speech' | 'other';
  description: string;
  strategies: string[];
  externalSupport?: string;
  documentUrl?: string;
}

export interface LearningGoal {
  id: string;
  area: string;
  goal: string;
  strategies: string[];
  progress: number;  // 0-100
  startDate: Date;
  targetDate?: Date;
  completedDate?: Date;
  aiGenerated: boolean;
}

export interface StudentAIProfile {
  engagementPattern: string;
  optimalChallengeLevel: string;
  motivators: string[];
  preferredFeedbackStyle: string;
  socialDynamics: string;
  predictedChallenges: string[];
  recommendedStrategies: string[];
  lastAnalyzed: Date;
}

export interface MedicalInfo {
  allergies: Allergy[];
  conditions: MedicalCondition[];
  medications: Medication[];
  dietaryRequirements: string[];
  doctorName?: string;
  doctorPhone?: string;
  hospitalPreference?: string;
  additionalNotes?: string;
}

export interface Allergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe' | 'life_threatening';
  reaction: string;
  treatment: string;
  actionPlanUrl?: string;
}

export interface MedicalCondition {
  condition: string;
  details: string;
  managementPlan?: string;
  actionPlanUrl?: string;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  administeredBy: 'self' | 'staff' | 'parent_only';
  storageRequirements?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  alternatePhone?: string;
  priority: number;
  canPickup: boolean;
  notes?: string;
}

export interface ConsentRecord {
  type: ConsentType;
  granted: boolean;
  grantedBy: string;
  grantedAt: Date;
  expiresAt?: Date;
  notes?: string;
}

export interface BehaviourSummary {
  totalPointsAllTime: number;
  totalPointsThisTerm: number;
  totalPointsThisWeek: number;
  currentStreak: number;  // Days with positive points
  longestStreak: number;
  skillBreakdown: { skillId: string; count: number }[];
  weeklyTrend: 'improving' | 'stable' | 'declining';
  lastPointAwarded?: Date;
}

export interface StudentLogin {
  type: 'qr_code' | 'text_code' | 'picture_password';
  code: string;
  pictureSequence?: string[];
  lastAccessed?: Date;
  deviceHistory: { deviceId: string; lastUsed: Date }[];
}

// ============================================================================
// PARENT/GUARDIAN TYPES
// ============================================================================

/**
 * Parent - the family connection
 */
export interface Parent {
  id: string;
  tenantId: string;
  userId: string;  // Links to auth system
  
  // Identity
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  preferredLanguage: string;
  
  // Connected children
  children: ParentChildConnection[];
  
  // Communication preferences
  communicationPrefs: ParentCommunicationPrefs;
  
  // Engagement tracking
  engagement: ParentEngagement;
  
  // Premium features (if subscribed)
  premiumSubscription?: ParentPremiumSubscription;
  
  // App settings
  appSettings: ParentAppSettings;
  
  // Status
  status: EntityStatus;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParentChildConnection {
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

export interface ParentCommunicationPrefs {
  enablePushNotifications: boolean;
  enableEmailNotifications: boolean;
  enableSmsNotifications: boolean;
  
  // Notification categories
  notifyOnPoints: boolean;
  notifyOnStories: boolean;
  notifyOnPortfolio: boolean;
  notifyOnMessages: boolean;
  notifyOnReports: boolean;
  notifyOnEvents: boolean;
  notifyOnAttendance: boolean;
  notifyOnEmergency: boolean;
  
  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
  quietHoursTimezone: string;
  
  // Digest preferences
  dailyDigestEnabled: boolean;
  dailyDigestTime: string;
  weeklyReportEnabled: boolean;
  weeklyReportDay: number;
}

export interface ParentEngagement {
  lastViewedStory?: Date;
  lastViewedPortfolio?: Date;
  lastSentMessage?: Date;
  lastReadMessage?: Date;
  
  // Metrics
  storyViewsThisWeek: number;
  likesThisWeek: number;
  commentsThisWeek: number;
  messagesThisWeek: number;
  portfolioViewsThisWeek: number;
  
  // Engagement score (AI calculated)
  engagementScore: number;
  engagementTrend: 'increasing' | 'stable' | 'decreasing';
  
  // AI insights
  aiRecommendations?: string[];
}

export interface ParentPremiumSubscription {
  tier: 'plus' | 'premium';
  status: 'active' | 'cancelled' | 'past_due';
  startDate: Date;
  endDate: Date;
  features: {
    enhancedReports: boolean;
    memoriesAlbum: boolean;
    homePoints: boolean;
    magicBooks: boolean;
    homeworkHelper: boolean;
    adFree: boolean;
  };
}

export interface ParentAppSettings {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  autoPlayVideos: boolean;
  downloadOverWifiOnly: boolean;
  enableBiometricLogin: boolean;
}

// ============================================================================
// TEACHER TYPES
// ============================================================================

/**
 * Teacher - the educator
 */
export interface Teacher {
  id: string;
  tenantId: string;
  userId: string;
  schoolId: string;
  
  // Identity
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  phone?: string;
  
  // Profile
  bio?: string;
  photoUrl?: string;
  qualifications: string[];
  specializations: string[];
  
  // Assignment
  classrooms: TeacherClassroomAssignment[];
  role: UserRole;
  
  // Safeguarding
  safeguardingCheck: SafeguardingCheck;
  
  // Preferences
  preferences: TeacherPreferences;
  
  // AI Assistant settings
  aiAssistantSettings: TeacherAISettings;
  
  // Statistics
  stats: TeacherStats;
  
  // Status
  status: EntityStatus;
  lastActiveAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherClassroomAssignment {
  classroomId: string;
  classroomName: string;
  role: 'lead' | 'assistant' | 'specialist' | 'relief';
  subjects?: string[];
  startDate: Date;
  endDate?: Date;
}

export interface SafeguardingCheck {
  type: 'WWCC' | 'DBS' | 'PVG' | 'FBI' | 'NATIONAL';
  checkNumber: string;
  status: 'valid' | 'pending' | 'expired' | 'revoked';
  issuedDate: Date;
  expiryDate?: Date;
  verifiedAt: Date;
  verifiedBy: string;
  documentUrl?: string;
}

export interface TeacherPreferences {
  defaultPointsToAward: number;
  quickAwardSkills: string[];  // Frequently used skill IDs
  notificationSounds: boolean;
  hapticFeedback: boolean;
  showPointsAnimation: boolean;
  autoSaveStoryDrafts: boolean;
  defaultStoryVisibility: 'class' | 'school' | 'private';
}

export interface TeacherAISettings {
  enableAISuggestions: boolean;
  enableAIDrafts: boolean;
  enableAIInsights: boolean;
  suggestionFrequency: 'always' | 'hourly' | 'daily';
  draftTone: 'professional' | 'warm' | 'casual';
  autoAcceptSimpleSuggestions: boolean;
}

export interface TeacherStats {
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

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const Validator = {
  tenantId(tenantId: string): void {
    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      throw new ValidationError('tenantId is required');
    }
  },

  entityId(id: string, fieldName: string = 'id'): void {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
  },

  required<T>(value: T | null | undefined, fieldName: string): asserts value is T {
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
  },

  email(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError('Invalid email format');
    }
  },

  phone(value: string): void {
    const phoneRegex = /^\+?[\d\s-()]{8,20}$/;
    if (!phoneRegex.test(value)) {
      throw new ValidationError('Invalid phone format');
    }
  },

  positiveNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || value <= 0 || !Number.isFinite(value)) {
      throw new ValidationError(`${fieldName} must be a positive number`);
    }
  },

  nonNegativeNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || value < 0 || !Number.isFinite(value)) {
      throw new ValidationError(`${fieldName} must be a non-negative number`);
    }
  },

  dateInPast(date: Date, fieldName: string): void {
    if (date >= new Date()) {
      throw new ValidationError(`${fieldName} must be in the past`);
    }
  },

  dateInFuture(date: Date, fieldName: string): void {
    if (date <= new Date()) {
      throw new ValidationError(`${fieldName} must be in the future`);
    }
  },

  ageGroup(value: string): void {
    if (!Object.values(AgeGroup).includes(value as AgeGroup)) {
      throw new ValidationError(`Invalid age group: ${value}`);
    }
  },

  maxLength(value: string, max: number, fieldName: string): void {
    if (value.length > max) {
      throw new ValidationError(`${fieldName} must be at most ${max} characters`);
    }
  },

  minLength(value: string, min: number, fieldName: string): void {
    if (value.length < min) {
      throw new ValidationError(`${fieldName} must be at least ${min} characters`);
    }
  },

  arrayNotEmpty<T>(value: T[], fieldName: string): void {
    if (!Array.isArray(value) || value.length === 0) {
      throw new ValidationError(`${fieldName} must not be empty`);
    }
  },

  isValidTime(value: string, fieldName: string): void {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid time in HH:MM format`);
    }
  },

  isValidDate(value: string, fieldName: string): void {
    const date = new Date(value);
    if (isNaN(date.getTime())) {
      throw new ValidationError(`${fieldName} must be a valid date`);
    }
  }
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type WithTimestamps<T> = T & {
  createdAt: Date;
  updatedAt: Date;
};

export type WithAudit<T> = T & {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
};

export type Paginated<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasMore: boolean;
};

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DateRange {
  start: Date;
  end: Date;
}

// ============================================================================
// ID GENERATION
// ============================================================================

export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}${random}`;
}

export function generateClassCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export function generateStudentCode(): string {
  const chars = '0123456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}
