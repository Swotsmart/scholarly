/**
 * Booking Types for Tutor Booking Service
 */

import { SessionType } from './users';

export interface Booking {
  id: string;
  tenantId: string;
  tutorId: string;
  learnerIds: string[];
  bookedByUserId: string;

  // Schedule
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;

  // Session Details
  sessionType: SessionType;
  subjectId: string;
  subjectName: string;
  topicsNeedingHelp: string[];
  curriculumCodes?: string[];
  learnerNotes?: string;

  // Group Session
  isGroupSession: boolean;
  openToOthers: boolean;
  maxGroupSize: number;

  // Pricing
  pricing: BookingPricing;

  // Status
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'expired';
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: Date;

  // Payment
  paymentStatus: 'pending' | 'paid' | 'refunded' | 'failed';
  paymentId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface BookingPricing {
  baseRate: number;
  duration: number; // minutes
  groupDiscount: number;
  subtotal: number;
  platformFee: number;
  total: number;
  currency: string;
  tutorEarnings: number;
  tokenRewards: number;
}

export interface TutorMatchRequest {
  learnerId: string;
  subjectId: string;
  topicsNeedingHelp: string[];
  sessionType: SessionType;
  preferredTimes?: PreferredTimeSlot[];
  jurisdiction: string;
  maxHourlyRate?: number;
  useLISInsights: boolean;
  preferredLanguages?: string[];
  specialNeeds?: string[];
}

export interface PreferredTimeSlot {
  date: Date;
  startTime: string;
  endTime: string;
}

export interface TutorMatch {
  tutorId: string;
  tutorName: string;
  tutorAvatarUrl?: string;
  matchScore: number;
  matchReasons: string[];
  matchBreakdown: {
    subjectMatch: number;
    styleMatch: number;
    trustMatch: number;
    priceMatch: number;
    availabilityMatch: number;
  };
  availableSlots: PreferredTimeSlot[];
  estimatedPrice: number;
  rating: number;
  reviewCount: number;
  totalSessions: number;
}

export interface BookingRequest {
  tutorId: string;
  learnerIds: string[];
  scheduledStart: Date;
  duration: number;
  sessionType: SessionType;
  subjectId: string;
  topicsNeedingHelp: string[];
  curriculumCodes?: string[];
  learnerNotes?: string;
  openToOthers?: boolean;
  maxGroupSize?: number;
}
