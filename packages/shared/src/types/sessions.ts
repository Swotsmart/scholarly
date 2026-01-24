/**
 * Session Types for Tutoring
 */

import { SessionType } from './users';

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
  RESCHEDULED = 'rescheduled',
}

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
  curriculumCodes?: string[];

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

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
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
  privateNoteToTutor?: string;
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
