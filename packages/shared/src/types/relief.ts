/**
 * Relief Marketplace Types
 */

import { Jurisdiction, SafeguardingCheck } from './jurisdiction';

export interface ReliefTeacher {
  id: string;
  tenantId: string;
  userId: string;

  // Profile
  name: string;
  email: string;
  phone: string;
  avatarUrl?: string;

  // Location
  location: {
    suburb: string;
    postcode: string;
    coordinates?: { lat: number; lng: number };
    travelRadiusKm: number;
  };

  // Qualifications
  qualifications: TeacherQualification[];
  teachingRegistration: TeachingRegistrationInfo;
  safeguardingCheck: SafeguardingCheck;

  // Teaching Profile
  subjects: string[];
  yearLevels: string[];
  specializations: string[];

  // Availability
  availability: ReliefAvailability;
  preferredSchools: string[];
  excludedSchools: string[];

  // Performance
  metrics: ReliefTeacherMetrics;
  tier: 'standard' | 'silver' | 'gold' | 'platinum';

  // AI Profile
  aiProfile: ReliefTeacherAIProfile;

  // Status
  status: 'available' | 'unavailable' | 'suspended' | 'pending_verification';
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherQualification {
  type: string;
  title: string;
  institution: string;
  dateObtained: Date;
  verified: boolean;
  documentUrl?: string;
}

export interface TeachingRegistrationInfo {
  authority: string;
  registrationNumber: string;
  status: 'provisional' | 'full' | 'expired' | 'suspended';
  expiryDate: Date;
  verified: boolean;
  verifiedAt?: Date;
}

export interface ReliefAvailability {
  timezone: string;
  regularAvailability: WeeklyAvailability[];
  blockedDates: BlockedDate[];
  noticePreference: 'any' | 'day_before' | 'week_before';
  maxDaysPerWeek?: number;
}

export interface WeeklyAvailability {
  dayOfWeek: number;
  available: boolean;
  startTime?: string;
  endTime?: string;
}

export interface BlockedDate {
  date: Date;
  reason?: string;
}

export interface ReliefTeacherMetrics {
  totalBookings: number;
  completedBookings: number;
  cancellationRate: number;
  noShowRate: number;
  averageRating: number;
  ratingCount: number;
  responseTimeMinutes: number;
  acceptanceRate: number;
  schoolsSatisfied: number;
  repeatBookingRate: number;
}

export interface ReliefTeacherAIProfile {
  reliabilityScore: number;
  qualityScore: number;
  responsePattern: 'fast' | 'moderate' | 'slow';
  bestMatchSchoolTypes: string[];
  predictedAvailability: PredictedAvailability[];
  riskFactors: string[];
  lastAnalyzed: Date;
}

export interface PredictedAvailability {
  date: Date;
  probability: number;
  confidence: number;
}

// ============================================================================
// ABSENCE TYPES
// ============================================================================

export interface TeacherAbsence {
  id: string;
  tenantId: string;
  schoolId: string;
  teacherId: string;
  teacherName: string;

  // Absence Details
  date: Date;
  startTime: string;
  endTime: string;
  isFullDay: boolean;
  reason: AbsenceReason;
  notes?: string;

  // Coverage Requirements
  coverageRequired: CoverageRequirement[];

  // Status
  status: 'reported' | 'seeking_relief' | 'covered' | 'partially_covered' | 'uncovered' | 'cancelled';

  // Relief Assignment
  reliefAssignments: ReliefAssignment[];

  // Notifications
  notificationsSent: NotificationRecord[];

  // Prediction
  wasPredicted: boolean;
  predictionConfidence?: number;

  reportedAt: Date;
  reportedBy: string;
  updatedAt: Date;
}

export type AbsenceReason =
  | 'sick_leave'
  | 'personal_leave'
  | 'professional_development'
  | 'school_business'
  | 'jury_duty'
  | 'bereavement'
  | 'parental_leave'
  | 'other';

export interface CoverageRequirement {
  id: string;
  period: number;
  periodName: string;
  startTime: string;
  endTime: string;
  classId: string;
  className: string;
  yearLevel: string;
  subject: string;
  room: string;
  lessonPlan?: string;
  specialInstructions?: string;
  status: 'pending' | 'assigned' | 'covered';
  assignedReliefId?: string;
}

export interface ReliefAssignment {
  id: string;
  reliefTeacherId: string;
  reliefTeacherName: string;
  coverageRequirementIds: string[];
  status: 'offered' | 'accepted' | 'declined' | 'confirmed' | 'completed' | 'cancelled';
  offeredAt: Date;
  respondedAt?: Date;
  confirmedAt?: Date;
  completedAt?: Date;
  rating?: number;
  feedback?: string;
}

export interface NotificationRecord {
  id: string;
  recipientId: string;
  recipientType: 'relief_teacher' | 'school_admin' | 'system';
  channel: 'email' | 'sms' | 'push' | 'in_app';
  type: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  sentAt: Date;
  deliveredAt?: Date;
  readAt?: Date;
}

// ============================================================================
// PREDICTION TYPES
// ============================================================================

export interface AbsencePrediction {
  id: string;
  tenantId: string;
  schoolId: string;
  date: Date;

  // Predictions
  predictedAbsences: IndividualPrediction[];
  totalPredicted: number;
  confidence: number;

  // Factors
  factors: PredictionFactor[];

  // Recommendations
  recommendations: PredictionRecommendation[];

  generatedAt: Date;
}

export interface IndividualPrediction {
  teacherId: string;
  teacherName: string;
  probability: number;
  confidence: number;
  factors: string[];
}

export interface PredictionFactor {
  type: string;
  description: string;
  impact: number;
  source: string;
}

export interface PredictionRecommendation {
  type: 'pre_alert' | 'pool_expansion' | 'scheduling_adjustment' | 'other';
  priority: 'low' | 'medium' | 'high';
  description: string;
  action?: string;
}

// ============================================================================
// POOL MANAGEMENT TYPES
// ============================================================================

export interface ReliefPool {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;

  // Members
  members: PoolMember[];

  // Configuration
  config: PoolConfig;

  // Autonomous Actions
  autonomousActions: AutonomousActionConfig;

  // Statistics
  statistics: PoolStatistics;

  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

export interface PoolMember {
  reliefTeacherId: string;
  joinedAt: Date;
  tier: 'standard' | 'silver' | 'gold' | 'platinum';
  priority: number;
  lastBookedAt?: Date;
  schoolRating?: number;
}

export interface PoolConfig {
  autoAcceptThreshold: number;
  notificationStrategy: 'fast' | 'quality' | 'balanced';
  maxNotificationsPerRequest: number;
  notificationBatchDelay: number;
  requireConfirmation: boolean;
}

export interface AutonomousActionConfig {
  enabled: boolean;
  autoPromote: boolean;
  autoDemote: boolean;
  autoRemoveInactive: boolean;
  autoRecruit: boolean;
  promotionThreshold: number;
  demotionThreshold: number;
  inactivityDays: number;
}

export interface PoolStatistics {
  totalMembers: number;
  activeMembersLast30Days: number;
  averageResponseTime: number;
  fillRate: number;
  averageRating: number;
  membersByTier: { [tier: string]: number };
}

// ============================================================================
// BOOKING TYPES
// ============================================================================

export interface ReliefBookingRequest {
  absenceId: string;
  coverageRequirementIds: string[];
  strategy: 'fast' | 'quality' | 'balanced';
  maxNotifications?: number;
  deadline?: Date;
}

export interface ReliefBooking {
  id: string;
  tenantId: string;
  schoolId: string;
  absenceId: string;
  reliefTeacherId: string;

  // Details
  date: Date;
  periods: BookedPeriod[];
  totalHours: number;

  // Payment
  hourlyRate: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'processed' | 'paid';

  // Status
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';

  // Feedback
  schoolRating?: number;
  schoolFeedback?: string;
  teacherRating?: number;
  teacherFeedback?: string;

  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface BookedPeriod {
  period: number;
  startTime: string;
  endTime: string;
  classId: string;
  className: string;
  subject: string;
  room: string;
}
