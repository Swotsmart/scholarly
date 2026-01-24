/**
 * User Types for Scholarly Platform
 */

import { Jurisdiction, SafeguardingCheck } from './jurisdiction';

export enum UserRole {
  LEARNER = 'learner',
  PARENT = 'parent',
  TUTOR_PROFESSIONAL = 'tutor_professional',
  TUTOR_UNIVERSITY = 'tutor_university',
  TUTOR_PEER = 'tutor_peer',
  CONTENT_CREATOR = 'content_creator',
  SCHOOL_ADMIN = 'school_admin',
  HOMESCHOOL_PARENT = 'homeschool_parent',
  MICRO_SCHOOL_ADMIN = 'micro_school_admin',
  RELIEF_TEACHER = 'relief_teacher',
  PLATFORM_ADMIN = 'platform_admin',
}

export interface BaseUser {
  id: string;
  tenantId: string;
  externalUserId?: string; // Links to Chekd user or external auth
  roles: UserRole[];
  jurisdiction: Jurisdiction;

  // Profile
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  avatarUrl?: string;
  bio?: string;

  // Verification status
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;

  // Trust integration from Chekd
  trustScore: number;

  // Token balance (Scholar Points display of $CHKD)
  tokenBalance: number;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt?: Date;

  // Status
  status: 'active' | 'inactive' | 'suspended' | 'pending_verification';
}

export interface LearnerProfile {
  userId: string;
  dateOfBirth: Date;
  yearLevel: string;
  parentIds: string[];
  learningPreferences?: LearningPreferences;
  subjects: SubjectInterest[];
  specialNeeds?: string[];

  // Privacy controls
  lisProfileSharing: LISProfileSharing;

  // LIS Integration
  lisProfileId?: string;
  lisIntegrationEnabled: boolean;
}

export interface LISProfileSharing {
  shareStrengths: boolean;
  shareWeaknesses: boolean;
  shareAffectiveState: boolean;
  shareGoals: boolean;
  shareProgress: boolean;
  customMessage?: string;
}

export interface SubjectInterest {
  subjectId: string;
  subjectName: string;
  currentLevel: string;
  needsHelp: boolean;
  canHelpOthers: boolean;
}

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

export interface ParentProfile {
  userId: string;
  childIds: string[];
  notificationPreferences: NotificationPreferences;
  paymentMethodOnFile: boolean;
  monthlyBudget?: number;
  approvedTutorIds: string[];
  isHomeschoolParent: boolean;
}

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
    complianceAlerts: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
    timezone: string;
  };
  reminderLeadTime: number; // minutes before session
}

export interface TutorProfile {
  userId: string;
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

  // Verification status
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
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
  curriculumCodes?: string[];
}

export interface TeachingStyle {
  approach: 'structured' | 'flexible' | 'socratic' | 'project_based' | 'mixed';
  pacePreference: 'patient' | 'moderate' | 'challenging';
  usesVisuals: boolean;
  usesGames: boolean;
  assignsHomework: boolean;
  providesMaterials: boolean;
  keywords: string[];
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
  HYBRID = 'hybrid',
}

export interface TutorPricing {
  currency: 'AUD' | 'GBP' | 'CAD' | 'CNY';

  // Base rates
  hourlyRate1to1: number;
  hourlyRateGroup: number;
  groupDiscountPerStudent: number;

  // Package options
  packagesOffered: PricingPackage[];

  // Platform commission
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

export type TutorUser = BaseUser & { tutorProfile: TutorProfile };
export type LearnerUser = BaseUser & { learnerProfile: LearnerProfile };
export type ParentUser = BaseUser & { parentProfile: ParentProfile };
