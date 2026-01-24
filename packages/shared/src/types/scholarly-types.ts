/**
 * Scholarly - Shared Types & Infrastructure
 *
 * Scholarly is Chekd's education vertical: a comprehensive platform connecting
 * learners with tutors, enabling homeschool communities, supporting micro-schools,
 * and creating a marketplace for educational content.
 *
 * ## The Granny Explanation
 *
 * Imagine a village where everyone helps everyone learn:
 * - Parents who are good at maths help neighbour kids with homework
 * - University students earn pocket money tutoring high schoolers
 * - Kids who understand something help other kids who don't yet
 * - Teachers share their best lesson plans so others don't reinvent the wheel
 * - Small groups of families teach their kids together
 *
 * Scholarly is that village, but online. It connects people who can teach
 * with people who want to learn, tracks who's actually helpful (trust!),
 * and makes sure everyone is safe (verified teachers, parent approvals).
 *
 * The magic is that it knows what each learner needs (from LIS - the brain)
 * and can suggest: "Your child is struggling with fractions. Here are three
 * tutors nearby who are great at explaining fractions to kids this age."
 *
 * ## Architecture
 *
 * Scholarly follows the same production patterns as LIS:
 * - Multi-tenant isolation (tenant_id everywhere)
 * - Repository pattern (database abstraction)
 * - Event-driven (NATS integration)
 * - Result type (explicit error handling)
 *
 * ## Token Integration
 *
 * Uses $CHKD as base currency with "Scholar Points" display in education context.
 * - Tutors earn tokens for sessions
 * - Content creators earn tokens for sales
 * - Peer tutors earn tokens for helping
 * - Parents can tip exceptional tutors
 *
 * @module Scholarly
 */

// ============================================================================
// RESULT TYPE (Same pattern as LIS)
// ============================================================================

export type Result<T, E = ScholarlyError> =
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

export class ScholarlyError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, any>
  ) {
    super(message);
    this.name = 'ScholarlyError';
  }
}

export class ValidationError extends ScholarlyError {
  constructor(message: string, details?: Record<string, any>) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends ScholarlyError {
  constructor(entity: string, id: string) {
    super('NOT_FOUND', `${entity} not found: ${id}`, { entity, id });
    this.name = 'NotFoundError';
  }
}

export class AuthorizationError extends ScholarlyError {
  constructor(message: string, details?: Record<string, any>) {
    super('AUTHORIZATION_ERROR', message, details);
    this.name = 'AuthorizationError';
  }
}

export class SafeguardingError extends ScholarlyError {
  constructor(message: string, details?: Record<string, any>) {
    super('SAFEGUARDING_ERROR', message, details);
    this.name = 'SafeguardingError';
  }
}

export class ComplianceError extends ScholarlyError {
  constructor(message: string, jurisdiction: string, details?: Record<string, any>) {
    super('COMPLIANCE_ERROR', message, { ...details, jurisdiction });
    this.name = 'ComplianceError';
  }
}

// ============================================================================
// GEOGRAPHIC & COMPLIANCE TYPES
// ============================================================================

/**
 * Supported jurisdictions for Scholarly
 * Each has different safeguarding and educational compliance requirements
 */
export enum Jurisdiction {
  // Australia - State-based education regulations
  AU_NSW = 'AU_NSW',
  AU_VIC = 'AU_VIC',
  AU_QLD = 'AU_QLD',
  AU_WA = 'AU_WA',
  AU_SA = 'AU_SA',
  AU_TAS = 'AU_TAS',
  AU_ACT = 'AU_ACT',
  AU_NT = 'AU_NT',

  // United Kingdom
  UK_ENGLAND = 'UK_ENGLAND',
  UK_SCOTLAND = 'UK_SCOTLAND',
  UK_WALES = 'UK_WALES',
  UK_NI = 'UK_NI',

  // Canada - Province-based
  CA_ON = 'CA_ON',
  CA_BC = 'CA_BC',
  CA_AB = 'CA_AB',
  CA_QC = 'CA_QC',

  // China - Special requirements
  CN = 'CN'
}

/**
 * Safeguarding check types by jurisdiction
 */
export interface SafeguardingCheck {
  type: 'WWCC' | 'DBS' | 'VSC' | 'PVG' | 'CPIC' | 'NATIONAL';
  jurisdiction: Jurisdiction;
  checkNumber: string;
  verifiedAt: Date;
  expiresAt?: Date;
  status: 'valid' | 'pending' | 'expired' | 'revoked';
  verificationMethod: 'manual' | 'api' | 'document';
}

/**
 * Jurisdiction-specific requirements
 */
export interface JurisdictionRequirements {
  jurisdiction: Jurisdiction;
  safeguardingCheckRequired: boolean;
  safeguardingCheckType: SafeguardingCheck['type'];
  parentalConsentAge: number;
  mandatoryReporting: boolean;
  curriculumFramework: string;
  homeschoolRegistrationRequired: boolean;
  microSchoolMinStudents?: number;
  microSchoolMaxStudents?: number;
}

export const JURISDICTION_REQUIREMENTS: Record<Jurisdiction, JurisdictionRequirements> = {
  [Jurisdiction.AU_NSW]: {
    jurisdiction: Jurisdiction.AU_NSW,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.AU_VIC]: {
    jurisdiction: Jurisdiction.AU_VIC,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.AU_QLD]: {
    jurisdiction: Jurisdiction.AU_QLD,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.AU_WA]: {
    jurisdiction: Jurisdiction.AU_WA,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.AU_SA]: {
    jurisdiction: Jurisdiction.AU_SA,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.AU_TAS]: {
    jurisdiction: Jurisdiction.AU_TAS,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.AU_ACT]: {
    jurisdiction: Jurisdiction.AU_ACT,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.AU_NT]: {
    jurisdiction: Jurisdiction.AU_NT,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'WWCC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'ACARA',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.UK_ENGLAND]: {
    jurisdiction: Jurisdiction.UK_ENGLAND,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'DBS',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'National Curriculum',
    homeschoolRegistrationRequired: false
  },
  [Jurisdiction.UK_SCOTLAND]: {
    jurisdiction: Jurisdiction.UK_SCOTLAND,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'PVG',
    parentalConsentAge: 16,
    mandatoryReporting: true,
    curriculumFramework: 'Curriculum for Excellence',
    homeschoolRegistrationRequired: false
  },
  [Jurisdiction.UK_WALES]: {
    jurisdiction: Jurisdiction.UK_WALES,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'DBS',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Curriculum for Wales',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.UK_NI]: {
    jurisdiction: Jurisdiction.UK_NI,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'DBS',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Northern Ireland Curriculum',
    homeschoolRegistrationRequired: false
  },
  [Jurisdiction.CA_ON]: {
    jurisdiction: Jurisdiction.CA_ON,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'VSC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Ontario Curriculum',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.CA_BC]: {
    jurisdiction: Jurisdiction.CA_BC,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'CPIC',
    parentalConsentAge: 19,
    mandatoryReporting: true,
    curriculumFramework: 'BC Curriculum',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.CA_AB]: {
    jurisdiction: Jurisdiction.CA_AB,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'CPIC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Alberta Programs of Study',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.CA_QC]: {
    jurisdiction: Jurisdiction.CA_QC,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'CPIC',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'Quebec Education Program',
    homeschoolRegistrationRequired: true
  },
  [Jurisdiction.CN]: {
    jurisdiction: Jurisdiction.CN,
    safeguardingCheckRequired: true,
    safeguardingCheckType: 'NATIONAL',
    parentalConsentAge: 18,
    mandatoryReporting: true,
    curriculumFramework: 'National Curriculum Standards',
    homeschoolRegistrationRequired: false // Complex regulations
  }
};

// ============================================================================
// USER TYPES
// ============================================================================

/**
 * Types of users in Scholarly
 */
export enum UserRole {
  LEARNER = 'learner',
  PARENT = 'parent',
  TUTOR_PROFESSIONAL = 'tutor_professional',
  TUTOR_UNIVERSITY = 'tutor_university',
  TUTOR_PEER = 'tutor_peer',
  CONTENT_CREATOR = 'content_creator',
  SCHOOL_ADMIN = 'school_admin',
  HOMESCHOOL_PARENT = 'homeschool_parent',
  PLATFORM_ADMIN = 'platform_admin'
}

/**
 * Base user profile for Scholarly
 */
export interface ScholarlyUser {
  id: string;
  tenantId: string;
  userId: string; // Links to Chekd user
  roles: UserRole[];
  jurisdiction: Jurisdiction;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  createdAt: Date;
  updatedAt: Date;

  // Verification status
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;

  // Trust integration from Chekd
  trustScore: number;

  // Token balance (Scholar Points display of $CHKD)
  tokenBalance: number;
}

/**
 * Learner profile (student)
 */
export interface LearnerUser extends ScholarlyUser {
  roles: [UserRole.LEARNER];
  dateOfBirth: Date;
  yearLevel: string;
  parentIds: string[];
  learningPreferences?: LearningPreferences;
  subjects: SubjectInterest[];

  // Privacy controls
  lisProfileSharing: LISProfileSharing;
}

/**
 * How much of their LIS profile a learner shares with tutors
 */
export interface LISProfileSharing {
  shareStrengths: boolean;
  shareWeaknesses: boolean;
  shareAffectiveState: boolean;
  shareGoals: boolean;
  shareProgress: boolean;
  customMessage?: string; // "I learn best when..."
}

/**
 * Subject areas of interest
 */
export interface SubjectInterest {
  subjectId: string;
  subjectName: string;
  currentLevel: string;
  needsHelp: boolean;
  canHelpOthers: boolean;
}

/**
 * Parent profile
 */
export interface ParentUser extends ScholarlyUser {
  roles: [UserRole.PARENT] | [UserRole.PARENT, UserRole.HOMESCHOOL_PARENT];
  childIds: string[];
  notificationPreferences: NotificationPreferences;
  paymentMethodOnFile: boolean;
  monthlyBudget?: number;
  approvedTutorIds: string[]; // Pre-approved tutors
}

/**
 * Tutor profile
 */
export interface TutorUser extends ScholarlyUser {
  roles: [UserRole.TUTOR_PROFESSIONAL] | [UserRole.TUTOR_UNIVERSITY] | [UserRole.TUTOR_PEER];
  tutorType: 'professional' | 'university' | 'peer';

  // Qualifications
  qualifications: Qualification[];
  safeguardingChecks: SafeguardingCheck[];

  // Teaching profile
  subjects: TutorSubject[];
  yearLevelsTeaching: string[];
  teachingStyle: TeachingStyle;
  languages: string[];

  // Availability
  availability: AvailabilitySchedule;
  sessionTypes: SessionType[];
  maxStudentsPerGroup: number;

  // Pricing
  pricing: TutorPricing;

  // Performance metrics
  metrics: TutorMetrics;

  // Profile completeness for matching
  profileCompleteness: number;
}

export interface Qualification {
  id: string;
  type: 'degree' | 'certificate' | 'license' | 'experience' | 'recommendation';
  title: string;
  institution?: string;
  dateObtained?: Date;
  verified: boolean;
  verificationMethod?: string;
  documentUrl?: string;
}

export interface TutorSubject {
  subjectId: string;
  subjectName: string;
  yearLevels: string[];
  confidenceLevel: number; // 1-5
  specializations: string[];
  examBoardsKnown?: string[];
}

export interface TeachingStyle {
  approach: 'structured' | 'flexible' | 'socratic' | 'project_based' | 'mixed';
  pacePreference: 'patient' | 'moderate' | 'challenging';
  usesVisuals: boolean;
  usesGames: boolean;
  assignsHomework: boolean;
  providesMaterials: boolean;
  keywords: string[]; // For AI matching
}

export interface AvailabilitySchedule {
  timezone: string;
  regularSlots: WeeklySlot[];
  blockedDates: DateRange[];
  advanceBookingDays: number;
  minimumNoticeHours: number;
}

export interface WeeklySlot {
  dayOfWeek: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  startTime: string; // "09:00"
  endTime: string; // "17:00"
  sessionTypes: SessionType[];
}

export interface DateRange {
  start: Date;
  end: Date;
  reason?: string;
}

export enum SessionType {
  ONLINE_VIDEO = 'online_video',
  IN_PERSON_TUTOR_LOCATION = 'in_person_tutor_location',
  IN_PERSON_STUDENT_LOCATION = 'in_person_student_location',
  IN_PERSON_NEUTRAL = 'in_person_neutral',
  HYBRID = 'hybrid'
}

export interface TutorPricing {
  currency: 'AUD' | 'GBP' | 'CAD' | 'CNY';

  // Base rates
  hourlyRate1to1: number;
  hourlyRateGroup: number;
  groupDiscountPerStudent: number; // Percentage reduction per additional student

  // Package options the tutor offers
  packagesOffered: PricingPackage[];

  // Platform commission (set by platform, tutor accepts)
  commissionRate: number;
}

export interface PricingPackage {
  id: string;
  name: string;
  description: string;
  sessionCount: number;
  validityDays: number;
  totalPrice: number;
  savingsPercent: number;
}

export interface TutorMetrics {
  totalSessions: number;
  totalHours: number;
  uniqueStudents: number;
  repeatBookingRate: number;
  averageRating: number;
  ratingCount: number;
  responseTimeMinutes: number;
  cancellationRate: number;
  noShowRate: number;

  // Outcome metrics (from LIS integration)
  averageStudentImprovement: number;
  goalAchievementRate: number;
}

// ============================================================================
// SESSION TYPES
// ============================================================================

export interface TutoringSession {
  id: string;
  tenantId: string;
  tutorId: string;
  learnerIds: string[];
  parentIds: string[];

  // Schedule
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart?: Date;
  actualEnd?: Date;
  timezone: string;

  // Type
  sessionType: SessionType;
  isGroupSession: boolean;

  // Location
  location?: SessionLocation;
  videoRoomUrl?: string;

  // Subject
  subjectId: string;
  subjectName: string;
  topicsFocus: string[];

  // Status
  status: SessionStatus;

  // Booking info
  bookingId: string;
  packageId?: string;

  // Session content
  preworkAssigned?: string;
  sessionNotes?: string;
  homeworkAssigned?: string;
  resourcesShared: string[];

  // Post-session
  tutorFeedback?: SessionFeedback;
  learnerFeedback?: SessionFeedback;
  parentFeedback?: SessionFeedback;

  // LIS integration
  lisSessionReport?: LISSessionReport;

  // Billing
  billingStatus: 'pending' | 'charged' | 'refunded' | 'disputed';
  amountCharged: number;
  tutorEarnings: number;
  platformCommission: number;
  tokenRewards: number;
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED_BY_TUTOR = 'cancelled_by_tutor',
  CANCELLED_BY_LEARNER = 'cancelled_by_learner',
  CANCELLED_BY_PARENT = 'cancelled_by_parent',
  NO_SHOW_TUTOR = 'no_show_tutor',
  NO_SHOW_LEARNER = 'no_show_learner',
  RESCHEDULED = 'rescheduled'
}

export interface SessionLocation {
  type: 'tutor_home' | 'student_home' | 'library' | 'cafe' | 'school' | 'community_center' | 'other';
  address: string;
  coordinates?: { lat: number; lng: number };
  accessInstructions?: string;
  parkingInfo?: string;
}

export interface SessionFeedback {
  rating: 1 | 2 | 3 | 4 | 5;
  comment?: string;
  topicsWellCovered: string[];
  topicsNeedMoreWork: string[];
  wouldRecommend: boolean;
  privateNoteToTutor?: string; // Not shared with platform
  submittedAt: Date;
}

export interface LISSessionReport {
  competenciesAddressed: string[];
  masteryChanges: { competencyId: string; before: number; after: number }[];
  affectiveStatesDuring: string[];
  engagementLevel: number;
  recommendedNextTopics: string[];
  generatedAt: Date;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface NotificationPreferences {
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    inApp: boolean;
  };
  categories: {
    bookingConfirmations: boolean;
    sessionReminders: boolean;
    sessionFeedback: boolean;
    paymentReceipts: boolean;
    progressReports: boolean;
    newTutorMatches: boolean;
    communityUpdates: boolean;
    marketplaceDeals: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  reminderLeadTime: number; // minutes before session
}

// ============================================================================
// LEARNING PREFERENCES (For matching)
// ============================================================================

export interface LearningPreferences {
  preferredSessionLength: number; // minutes
  preferredTimeOfDay: 'morning' | 'afternoon' | 'evening' | 'flexible';
  preferredDays: number[]; // 0-6
  learningPace: 'slow_and_thorough' | 'moderate' | 'fast_paced';
  prefersTutorGender?: 'male' | 'female' | 'no_preference';
  prefersHomework: boolean;
  prefersGames: boolean;
  attentionSpan: 'short' | 'medium' | 'long';
  bestMotivators: ('praise' | 'challenges' | 'rewards' | 'progress_tracking' | 'peer_comparison')[];
}

// ============================================================================
// INFRASTRUCTURE INTERFACES
// ============================================================================

export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

export interface EventBus {
  publish(topic: string, event: ScholarlyEvent): Promise<void>;
  subscribe(topic: string, handler: (event: ScholarlyEvent) => Promise<void>): Promise<void>;
}

export interface ScholarlyEvent {
  id: string;
  type: string;
  tenantId: string;
  timestamp: Date;
  payload: Record<string, any>;
  metadata?: Record<string, any>;
}

export interface Cache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidatePattern(pattern: string): Promise<void>;
}

export interface ScholarlyConfig {
  environment: 'development' | 'staging' | 'production';
  defaultJurisdiction: Jurisdiction;
  commissionRate: number;
  tokenRewardRate: number;
  sessionDefaults: {
    duration: number;
    reminderMinutes: number;
    cancellationWindowHours: number;
  };
  safeguarding: {
    requireChecksForAllTutors: boolean;
    checkExpiryWarningDays: number;
  };
}

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export const Validator = {
  tenantId(tenantId: string): void {
    if (!tenantId || tenantId.trim() === '') {
      throw new ValidationError('tenantId is required');
    }
  },

  userId(userId: string): void {
    if (!userId || userId.trim() === '') {
      throw new ValidationError('userId is required');
    }
  },

  required(value: any, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
  },

  positiveNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive number`);
    }
  },

  email(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError('Invalid email format');
    }
  },

  jurisdiction(jurisdiction: string): void {
    if (!Object.values(Jurisdiction).includes(jurisdiction as Jurisdiction)) {
      throw new ValidationError(`Invalid jurisdiction: ${jurisdiction}`);
    }
  },

  dateInFuture(date: Date, fieldName: string): void {
    if (date <= new Date()) {
      throw new ValidationError(`${fieldName} must be in the future`);
    }
  }
};

// ============================================================================
// BASE SERVICE CLASS
// ============================================================================

export abstract class ScholarlyBaseService {
  protected readonly serviceName: string;
  protected readonly logger: Logger;
  protected readonly eventBus: EventBus;
  protected readonly cache: Cache;
  protected readonly config: ScholarlyConfig;

  constructor(
    serviceName: string,
    deps: { eventBus: EventBus; cache: Cache; config: ScholarlyConfig }
  ) {
    this.serviceName = serviceName;
    this.eventBus = deps.eventBus;
    this.cache = deps.cache;
    this.config = deps.config;
    this.logger = this.createLogger();
  }

  private createLogger(): Logger {
    const serviceName = this.serviceName;
    return {
      debug: (msg, ctx) => console.debug(`[${serviceName}] ${msg}`, ctx),
      info: (msg, ctx) => console.info(`[${serviceName}] ${msg}`, ctx),
      warn: (msg, ctx) => console.warn(`[${serviceName}] ${msg}`, ctx),
      error: (msg, err, ctx) => console.error(`[${serviceName}] ${msg}`, err, ctx)
    };
  }

  protected async withTiming<T>(
    operation: string,
    tenantId: string,
    fn: () => Promise<T>,
    context?: Record<string, any>
  ): Promise<Result<T>> {
    const start = Date.now();
    try {
      const result = await fn();
      this.logger.debug(`${operation} completed`, {
        tenantId,
        duration: Date.now() - start,
        ...context
      });
      return success(result);
    } catch (error) {
      this.logger.error(`${operation} failed`, error as Error, { tenantId, ...context });
      if (error instanceof ScholarlyError) {
        return failure(error);
      }
      return failure(new ScholarlyError('INTERNAL_ERROR', (error as Error).message));
    }
  }

  protected async publishEvent(
    type: string,
    tenantId: string,
    payload: Record<string, any>
  ): Promise<void> {
    const event: ScholarlyEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      tenantId,
      timestamp: new Date(),
      payload
    };
    await this.eventBus.publish(type, event);
  }

  protected cacheKey(tenantId: string, key: string): string {
    return `scholarly:${tenantId}:${key}`;
  }

  protected async invalidateCache(tenantId: string, pattern: string): Promise<void> {
    await this.cache.invalidatePattern(this.cacheKey(tenantId, pattern));
  }

  protected generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// MODULE VERSION
// ============================================================================

export const SCHOLARLY_VERSION = '1.0.0';
export const SCHOLARLY_MODULES = [
  'tutor-booking',
  'homeschool-hub',
  'micro-school',
  'content-marketplace',
  'curriculum-curator',
  'scheduling',
  'relief-marketplace',
  'trust-verification',
  'token-economy'
];
