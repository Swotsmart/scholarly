/**
 * Smart Tutor Booking Service
 *
 * Connects learners with tutors using AI matching based on learning needs,
 * teaching styles, availability, and trust scores.
 *
 * ## The Granny Explanation
 *
 * Like having a wise friend who knows everyone who can teach and everyone
 * who needs to learn. They introduce the right people: "Sarah's struggling
 * with fractions? Meet James - he explains maths using baking recipes!"
 *
 * ## Schema Integration
 *
 * Uses the enhanced schema with:
 * - TutorAvailabilitySlot (extracted from JSON)
 * - TutorPricingTier (extracted from JSON)
 * - Subject reference table for data integrity
 *
 * @module TutorBookingService
 */

import { prisma, Prisma } from '@scholarly/database';
import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { log } from '../lib/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

// Jurisdiction types
export type Jurisdiction = 'AU_NSW' | 'AU_VIC' | 'AU_QLD' | 'AU_WA' | 'AU_SA' | 'AU_TAS' | 'AU_NT' | 'AU_ACT' | 'NZ';

export type SessionType = 'one_on_one' | 'small_group' | 'large_group' | 'workshop';

export const JURISDICTION_REQUIREMENTS: Record<Jurisdiction, {
  safeguardingCheckRequired: boolean;
  safeguardingCheckType: string;
  minimumAge: number;
}> = {
  AU_NSW: { safeguardingCheckRequired: true, safeguardingCheckType: 'wwcc_nsw', minimumAge: 18 },
  AU_VIC: { safeguardingCheckRequired: true, safeguardingCheckType: 'wwcc_vic', minimumAge: 18 },
  AU_QLD: { safeguardingCheckRequired: true, safeguardingCheckType: 'blue_card', minimumAge: 18 },
  AU_WA: { safeguardingCheckRequired: true, safeguardingCheckType: 'wwcc_wa', minimumAge: 18 },
  AU_SA: { safeguardingCheckRequired: true, safeguardingCheckType: 'wwcc_sa', minimumAge: 18 },
  AU_TAS: { safeguardingCheckRequired: true, safeguardingCheckType: 'wwcc_tas', minimumAge: 18 },
  AU_NT: { safeguardingCheckRequired: true, safeguardingCheckType: 'ochre_card', minimumAge: 18 },
  AU_ACT: { safeguardingCheckRequired: true, safeguardingCheckType: 'wwvp_act', minimumAge: 18 },
  NZ: { safeguardingCheckRequired: true, safeguardingCheckType: 'police_vet', minimumAge: 18 },
};

export interface TutorSearchFilters {
  subjectIds?: string[];
  yearLevels?: string[];
  sessionTypes?: SessionType[];
  jurisdiction?: Jurisdiction;
  minRating?: number;
  maxHourlyRate?: number;
  languages?: string[];
}

// ============================================================================
// BOOKING & MATCHING TYPES
// ============================================================================

// Get types from Prisma
export type TutorProfileWithRelations = Prisma.TutorProfileGetPayload<{
  include: {
    user: true;
    subjects: { include: { subject: true } };
    availabilitySlots: true;
    pricingTiers: true;
    safeguardingChecks: true;
  };
}>;

export type LearnerProfileWithRelations = Prisma.LearnerProfileGetPayload<{
  include: {
    user: true;
    subjects: { include: { subject: true } };
  };
}>;

export type BookingWithRelations = Prisma.BookingGetPayload<{
  include: {
    tutor: { include: { user: true } };
    subject: true;
    session: true;
  };
}>;

export type SessionWithRelations = Prisma.TutoringSessionGetPayload<{
  include: {
    tutorProfile: { include: { user: true } };
    subject: true;
    participants: { include: { learnerProfile: { include: { user: true } } } };
  };
}>;

export interface BookingPricing {
  baseRate: number;
  duration: number;
  groupDiscount: number;
  subtotal: number;
  platformFee: number;
  total: number;
  currency: string;
  tutorEarnings: number;
}

export interface TutorMatchRequest {
  learnerId: string;
  subjectId: string;
  topicsNeedingHelp: string[];
  sessionType: SessionType;
  preferredTimes?: { date: Date; startTime: string; endTime: string }[];
  jurisdiction: Jurisdiction;
  maxHourlyRate?: number;
  useLISInsights: boolean;
}

export interface TutorMatch {
  tutor: TutorProfileWithRelations;
  matchScore: number;
  matchReasons: string[];
  matchBreakdown: {
    subjectMatch: number;
    styleMatch: number;
    trustMatch: number;
    priceMatch: number;
  };
  availableSlots: { date: Date; startTime: string; endTime: string }[];
  estimatedPrice: number;
}

export interface TimeSlot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
}

export interface ProfileBuilderSession {
  id: string;
  tutorId: string;
  currentStep: number;
  totalSteps: number;
  responses: { questionId: string; answer: string; keywords: string[] }[];
  suggestedBio?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

let tutorBookingServiceInstance: TutorBookingService | null = null;

export class TutorBookingService extends ScholarlyBaseService {
  constructor() {
    super('TutorBookingService');
  }

  // --------------------------------------------------------------------------
  // TUTOR SEARCH & MATCHING
  // --------------------------------------------------------------------------

  /**
   * Find tutors matching a learner's needs using AI scoring
   * Uses TutorAvailabilitySlot and TutorPricingTier models
   */
  async findTutors(
    tenantId: string,
    request: TutorMatchRequest
  ): Promise<Result<{ tutors: TutorMatch[]; totalCount: number }>> {
    return this.withTiming('findTutors', async () => {
      // Validate learner exists
      const learner = await prisma.learnerProfile.findFirst({
        where: {
          id: request.learnerId,
          user: { tenantId },
        },
        include: {
          user: true,
          subjects: { include: { subject: true } },
        },
      });

      if (!learner) {
        return failure({
          code: 'NOT_FOUND',
          message: `Learner ${request.learnerId} not found`,
        });
      }

      // Find tutors who teach this subject using TutorSubject relation
      const tutors = await prisma.tutorProfile.findMany({
        where: {
          user: { tenantId },
          verificationStatus: 'verified',
          deletedAt: null,
          subjects: {
            some: {
              subjectId: request.subjectId,
            },
          },
          sessionTypes: { has: request.sessionType },
          // Filter by max hourly rate using TutorPricingTier
          ...(request.maxHourlyRate && {
            pricingTiers: {
              some: {
                baseRate: { lte: request.maxHourlyRate },
                isActive: true,
              },
            },
          }),
        },
        include: {
          user: true,
          subjects: { include: { subject: true } },
          availabilitySlots: true,
          pricingTiers: { where: { isActive: true } },
          safeguardingChecks: true,
        },
      });

      // Filter by safeguarding and score
      const matches: TutorMatch[] = [];
      for (const tutor of tutors) {
        if (!this.verifySafeguarding(tutor, request.jurisdiction)) continue;
        const match = this.calculateMatch(tutor, learner, request);
        if (match.matchScore >= 50) matches.push(match);
      }

      matches.sort((a, b) => b.matchScore - a.matchScore);

      log.info('Tutor search completed', {
        tenantId,
        learnerId: request.learnerId,
        subjectId: request.subjectId,
        resultsCount: matches.length,
      });

      return success({ tutors: matches.slice(0, 20), totalCount: matches.length });
    });
  }

  /**
   * Get proactive suggestions based on LIS insights (doesn't recommend specific tutors)
   */
  async getProactiveSuggestions(
    tenantId: string,
    learnerId: string
  ): Promise<
    Result<{
      areasNeedingSupport: string[];
      schoolTeacherNote: string;
      marketplaceSuggestion: string;
    }>
  > {
    return this.withTiming('getProactiveSuggestions', async () => {
      // Check learner exists
      const learner = await prisma.learnerProfile.findFirst({
        where: {
          id: learnerId,
          user: { tenantId },
        },
        include: {
          subjects: {
            where: { needsHelp: true },
            include: { subject: true },
          },
        },
      });

      if (!learner) {
        return failure({
          code: 'NOT_FOUND',
          message: `Learner ${learnerId} not found`,
        });
      }

      // Get areas needing support from learner's subjects
      const areasNeedingSupport = learner.subjects
        .filter((s) => s.needsHelp)
        .map((s) => s.subject.name);

      // Would integrate with LIS in production
      return success({
        areasNeedingSupport: areasNeedingSupport.length > 0 ? areasNeedingSupport : ['Fractions', 'Word problems'],
        schoolTeacherNote:
          `We've noticed some challenges with ${areasNeedingSupport.join(', ') || 'certain topics'}. ` +
          `Consider discussing with their classroom teacher for additional school support.`,
        marketplaceSuggestion:
          `If school support isn't sufficient, our tutor marketplace ` +
          `has specialists in these areas who can provide one-on-one help.`,
      });
    });
  }

  // --------------------------------------------------------------------------
  // BOOKING MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Create a booking request
   * Uses TutorPricingTier for pricing and TutorAvailabilitySlot for availability
   */
  async createBooking(
    tenantId: string,
    bookedByUserId: string,
    request: {
      tutorProfileId: string;
      learnerIds: string[];
      scheduledStart: Date;
      duration: number;
      sessionType: SessionType;
      subjectId: string;
      topicsNeedingHelp: string[];
      learnerNotes?: string;
      openToOthers?: boolean;
      maxGroupSize?: number;
    }
  ): Promise<Result<{ booking: BookingWithRelations; session: SessionWithRelations }>> {
    return this.withTiming('createBooking', async () => {
      // Validate scheduled start is in future
      if (request.scheduledStart <= new Date()) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: 'Scheduled start must be in the future',
        });
      }

      // Get tutor with pricing tiers and availability
      const tutor = await prisma.tutorProfile.findFirst({
        where: {
          id: request.tutorProfileId,
          user: { tenantId },
          deletedAt: null,
        },
        include: {
          user: true,
          subjects: { include: { subject: true } },
          availabilitySlots: true,
          pricingTiers: { where: { isActive: true } },
          safeguardingChecks: true,
        },
      });

      if (!tutor) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tutor ${request.tutorProfileId} not found`,
        });
      }

      // Verify availability using TutorAvailabilitySlot
      const isAvailable = await this.checkAvailabilityFromSlots(
        tutor.availabilitySlots,
        request.scheduledStart,
        request.duration
      );
      if (!isAvailable) {
        return failure({
          code: 'TUTOR_UNAVAILABLE',
          message: 'Tutor not available at requested time',
        });
      }

      // Check for existing bookings at this time
      const conflictingBooking = await prisma.booking.findFirst({
        where: {
          tutorId: request.tutorProfileId,
          status: { in: ['pending', 'confirmed'] },
          OR: [
            {
              scheduledStart: { lte: request.scheduledStart },
              scheduledEnd: { gt: request.scheduledStart },
            },
            {
              scheduledStart: {
                lt: new Date(request.scheduledStart.getTime() + request.duration * 60000),
              },
              scheduledEnd: {
                gte: new Date(request.scheduledStart.getTime() + request.duration * 60000),
              },
            },
          ],
        },
      });

      if (conflictingBooking) {
        return failure({
          code: 'TIME_CONFLICT',
          message: 'Tutor already has a booking at this time',
        });
      }

      // Calculate pricing using TutorPricingTier
      const pricing = this.calculatePricingFromTiers(
        tutor.pricingTiers,
        request.sessionType,
        request.duration,
        request.learnerIds.length
      );

      // Get timezone from tutor's availability slots
      const timezone = tutor.availabilitySlots[0]?.timezone || 'Australia/Sydney';

      // Create booking with transaction
      const result = await prisma.$transaction(async (tx) => {
        const booking = await tx.booking.create({
          data: {
            tenantId,
            tutorId: request.tutorProfileId,
            bookedByUserId,
            learnerIds: request.learnerIds,
            scheduledStart: request.scheduledStart,
            scheduledEnd: new Date(request.scheduledStart.getTime() + request.duration * 60000),
            timezone,
            sessionType: request.sessionType,
            subjectId: request.subjectId,
            topicsNeedingHelp: request.topicsNeedingHelp,
            learnerNotes: request.learnerNotes,
            isGroupSession: request.learnerIds.length > 1,
            openToOthers: request.openToOthers || false,
            maxGroupSize: request.maxGroupSize || 1,
            pricing: pricing as unknown as Prisma.InputJsonValue,
            status: 'pending',
          },
          include: {
            tutor: { include: { user: true } },
            subject: true,
            session: true,
          },
        });

        // Create session
        const session = await tx.tutoringSession.create({
          data: {
            tenantId,
            bookingId: booking.id,
            tutorProfileId: request.tutorProfileId,
            tutorUserId: tutor.userId,
            scheduledStart: request.scheduledStart,
            scheduledEnd: new Date(request.scheduledStart.getTime() + request.duration * 60000),
            timezone,
            sessionType: request.sessionType,
            isGroupSession: request.learnerIds.length > 1,
            subjectId: request.subjectId,
            topicsFocus: request.topicsNeedingHelp,
            status: 'scheduled',
            amountCharged: pricing.total,
            tutorEarnings: pricing.tutorEarnings,
            platformCommission: pricing.platformFee,
          },
          include: {
            tutorProfile: { include: { user: true } },
            subject: true,
            participants: { include: { learnerProfile: { include: { user: true } } } },
          },
        });

        // Create session participants
        for (const learnerId of request.learnerIds) {
          await tx.sessionParticipant.create({
            data: {
              sessionId: session.id,
              learnerProfileId: learnerId,
              attended: false,
            },
          });
        }

        return { booking, session };
      });

      log.info('Booking created', {
        bookingId: result.booking.id,
        tutorId: request.tutorProfileId,
        scheduledStart: request.scheduledStart,
      });

      return success(result);
    });
  }

  /**
   * Get bookings for a user
   */
  async getBookings(
    tenantId: string,
    userId: string,
    status?: string
  ): Promise<Result<BookingWithRelations[]>> {
    return this.withTiming('getBookings', async () => {
      const bookings = await prisma.booking.findMany({
        where: {
          tenantId,
          OR: [
            { bookedByUserId: userId },
            { tutor: { userId } },
            { learnerIds: { has: userId } },
          ],
          ...(status && { status }),
        },
        include: {
          tutor: { include: { user: true } },
          subject: true,
          session: true,
        },
        orderBy: { scheduledStart: 'asc' },
      });

      return success(bookings);
    });
  }

  /**
   * Confirm a booking (tutor action)
   */
  async confirmBooking(
    tenantId: string,
    bookingId: string,
    tutorUserId: string
  ): Promise<Result<BookingWithRelations>> {
    return this.withTiming('confirmBooking', async () => {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          tenantId,
        },
        include: {
          tutor: { include: { user: true } },
          subject: true,
          session: true,
        },
      });

      if (!booking) {
        return failure({
          code: 'NOT_FOUND',
          message: `Booking ${bookingId} not found`,
        });
      }

      if (booking.tutor.userId !== tutorUserId) {
        return failure({
          code: 'UNAUTHORIZED',
          message: 'Only assigned tutor can confirm booking',
        });
      }

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: { status: 'confirmed' },
        include: {
          tutor: { include: { user: true } },
          subject: true,
          session: true,
        },
      });

      // Update session status too
      if (booking.session) {
        await prisma.tutoringSession.update({
          where: { id: booking.session.id },
          data: { status: 'confirmed' },
        });
      }

      log.info('Booking confirmed', { bookingId, tutorUserId });

      return success(updated);
    });
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    tenantId: string,
    bookingId: string,
    userId: string,
    reason: string
  ): Promise<Result<{ booking: BookingWithRelations; refundAmount: number }>> {
    return this.withTiming('cancelBooking', async () => {
      const booking = await prisma.booking.findFirst({
        where: {
          id: bookingId,
          tenantId,
        },
        include: {
          tutor: { include: { user: true } },
          subject: true,
          session: true,
        },
      });

      if (!booking) {
        return failure({
          code: 'NOT_FOUND',
          message: `Booking ${bookingId} not found`,
        });
      }

      // Calculate refund based on cancellation timing
      const refundAmount = this.calculateRefundAmount(booking);

      const updated = await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'cancelled',
          cancellationReason: reason,
          cancelledBy: userId,
          cancelledAt: new Date(),
        },
        include: {
          tutor: { include: { user: true } },
          subject: true,
          session: true,
        },
      });

      // Update session status
      if (booking.session) {
        await prisma.tutoringSession.update({
          where: { id: booking.session.id },
          data: { status: 'cancelled' },
        });
      }

      log.info('Booking cancelled', { bookingId, userId, reason, refundAmount });

      return success({ booking: updated, refundAmount });
    });
  }

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  async getUpcomingSessions(
    tenantId: string,
    userId: string,
    limit = 10
  ): Promise<Result<SessionWithRelations[]>> {
    return this.withTiming('getUpcomingSessions', async () => {
      const sessions = await prisma.tutoringSession.findMany({
        where: {
          tenantId,
          scheduledStart: { gt: new Date() },
          status: { in: ['scheduled', 'confirmed'] },
          OR: [
            { tutorUserId: userId },
            { participants: { some: { learnerProfile: { userId } } } },
          ],
        },
        include: {
          tutorProfile: { include: { user: true } },
          subject: true,
          participants: { include: { learnerProfile: { include: { user: true } } } },
        },
        orderBy: { scheduledStart: 'asc' },
        take: limit,
      });

      return success(sessions);
    });
  }

  async startSession(
    tenantId: string,
    sessionId: string
  ): Promise<Result<SessionWithRelations>> {
    return this.withTiming('startSession', async () => {
      const session = await prisma.tutoringSession.findFirst({
        where: {
          id: sessionId,
          tenantId,
        },
      });

      if (!session) {
        return failure({
          code: 'NOT_FOUND',
          message: `Session ${sessionId} not found`,
        });
      }

      const updated = await prisma.tutoringSession.update({
        where: { id: sessionId },
        data: {
          status: 'in_progress',
          actualStart: new Date(),
        },
        include: {
          tutorProfile: { include: { user: true } },
          subject: true,
          participants: { include: { learnerProfile: { include: { user: true } } } },
        },
      });

      // Update participant attendance
      await prisma.sessionParticipant.updateMany({
        where: { sessionId },
        data: { attended: true },
      });

      log.info('Session started', { sessionId });

      return success(updated);
    });
  }

  async completeSession(
    tenantId: string,
    sessionId: string,
    data: {
      sessionNotes?: string;
      homeworkAssigned?: string;
    }
  ): Promise<Result<{ session: SessionWithRelations; tutorEarnings: number; tokenRewards: number }>> {
    return this.withTiming('completeSession', async () => {
      const session = await prisma.tutoringSession.findFirst({
        where: {
          id: sessionId,
          tenantId,
        },
      });

      if (!session) {
        return failure({
          code: 'NOT_FOUND',
          message: `Session ${sessionId} not found`,
        });
      }

      const tokenRewards = Math.round(session.tutorEarnings * 0.01);

      const updated = await prisma.tutoringSession.update({
        where: { id: sessionId },
        data: {
          status: 'completed',
          actualEnd: new Date(),
          sessionNotes: data.sessionNotes,
          homeworkAssigned: data.homeworkAssigned,
          billingStatus: 'charged',
          tokenRewards,
        },
        include: {
          tutorProfile: { include: { user: true } },
          subject: true,
          participants: { include: { learnerProfile: { include: { user: true } } } },
        },
      });

      // Update booking status
      await prisma.booking.update({
        where: { id: session.bookingId },
        data: { status: 'completed' },
      });

      log.info('Session completed', { sessionId, tutorEarnings: session.tutorEarnings });

      return success({
        session: updated,
        tutorEarnings: session.tutorEarnings,
        tokenRewards,
      });
    });
  }

  async submitFeedback(
    tenantId: string,
    sessionId: string,
    userId: string,
    feedback: { rating: number; comment?: string; wouldRecommend?: boolean }
  ): Promise<Result<SessionWithRelations>> {
    return this.withTiming('submitFeedback', async () => {
      const session = await prisma.tutoringSession.findFirst({
        where: {
          id: sessionId,
          tenantId,
        },
        include: {
          tutorProfile: true,
          participants: { include: { learnerProfile: true } },
          booking: true,
        },
      });

      if (!session) {
        return failure({
          code: 'NOT_FOUND',
          message: `Session ${sessionId} not found`,
        });
      }

      // Determine role of user
      const isTutor = session.tutorUserId === userId;
      const isLearner = session.participants.some((p) => p.learnerProfile.userId === userId);
      const isParent = session.booking?.learnerIds.includes(userId) && !isLearner;

      if (!isTutor && !isLearner && !isParent) {
        return failure({
          code: 'UNAUTHORIZED',
          message: 'User not part of this session',
        });
      }

      // Update appropriate feedback field
      const updateData: Prisma.TutoringSessionUpdateInput = {};
      if (isTutor) {
        updateData.tutorFeedback = feedback as unknown as Prisma.InputJsonValue;
      } else if (isLearner) {
        updateData.learnerFeedback = feedback as unknown as Prisma.InputJsonValue;
      } else {
        updateData.parentFeedback = feedback as unknown as Prisma.InputJsonValue;
      }

      const updated = await prisma.tutoringSession.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          tutorProfile: { include: { user: true } },
          subject: true,
          participants: { include: { learnerProfile: { include: { user: true } } } },
        },
      });

      // Update tutor rating if feedback from learner/parent
      if (!isTutor) {
        await this.updateTutorRating(session.tutorProfileId, feedback.rating);
      }

      return success(updated);
    });
  }

  // --------------------------------------------------------------------------
  // AI PROFILE BUILDER
  // --------------------------------------------------------------------------

  async startProfileBuilder(
    tenantId: string,
    tutorProfileId: string
  ): Promise<Result<ProfileBuilderSession>> {
    return this.withTiming('startProfileBuilder', async () => {
      // Verify tutor exists
      const tutor = await prisma.tutorProfile.findFirst({
        where: {
          id: tutorProfileId,
          user: { tenantId },
        },
      });

      if (!tutor) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tutor profile ${tutorProfileId} not found`,
        });
      }

      return success({
        id: this.generateId('profile_builder'),
        tutorId: tutorProfileId,
        currentStep: 0,
        totalSteps: PROFILE_QUESTIONS.length,
        responses: [],
      });
    });
  }

  async answerProfileQuestion(
    tenantId: string,
    sessionId: string,
    answer: string
  ): Promise<
    Result<{
      nextQuestion?: { id: string; question: string; helpText: string };
      isComplete: boolean;
      suggestedBio?: string;
    }>
  > {
    return this.withTiming('answerProfileQuestion', async () => {
      // In production would load session from cache/DB
      const keywords = this.extractKeywords(answer);
      const currentStep = 1; // Would track actual step

      const isComplete = currentStep >= PROFILE_QUESTIONS.length;
      const nextQuestion = isComplete ? undefined : PROFILE_QUESTIONS[currentStep];
      const suggestedBio = isComplete ? this.generateBio(keywords) : undefined;

      return success({ nextQuestion, isComplete, suggestedBio });
    });
  }

  // --------------------------------------------------------------------------
  // AVAILABILITY MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get tutor's available time slots
   */
  async getTutorAvailability(
    tenantId: string,
    tutorProfileId: string
  ): Promise<Result<TimeSlot[]>> {
    return this.withTiming('getTutorAvailability', async () => {
      const slots = await prisma.tutorAvailabilitySlot.findMany({
        where: {
          profileId: tutorProfileId,
          profile: { user: { tenantId } },
          isRecurring: true,
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
      });

      return success(
        slots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          timezone: s.timezone,
        }))
      );
    });
  }

  /**
   * Update tutor's availability slots
   */
  async updateTutorAvailability(
    tenantId: string,
    tutorProfileId: string,
    slots: TimeSlot[]
  ): Promise<Result<TimeSlot[]>> {
    return this.withTiming('updateTutorAvailability', async () => {
      // Verify tutor exists
      const tutor = await prisma.tutorProfile.findFirst({
        where: {
          id: tutorProfileId,
          user: { tenantId },
        },
      });

      if (!tutor) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tutor profile ${tutorProfileId} not found`,
        });
      }

      // Delete existing recurring slots
      await prisma.tutorAvailabilitySlot.deleteMany({
        where: {
          profileId: tutorProfileId,
          isRecurring: true,
        },
      });

      // Create new slots
      const created = await prisma.tutorAvailabilitySlot.createMany({
        data: slots.map((s) => ({
          profileId: tutorProfileId,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          timezone: s.timezone,
          isRecurring: true,
        })),
      });

      log.info('Tutor availability updated', {
        tutorProfileId,
        slotsCount: created.count,
      });

      return success(slots);
    });
  }

  // --------------------------------------------------------------------------
  // PRICING MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get tutor's pricing tiers
   */
  async getTutorPricing(
    tenantId: string,
    tutorProfileId: string
  ): Promise<Result<Prisma.TutorPricingTierGetPayload<{}>[]>> {
    return this.withTiming('getTutorPricing', async () => {
      const tiers = await prisma.tutorPricingTier.findMany({
        where: {
          profileId: tutorProfileId,
          profile: { user: { tenantId } },
          isActive: true,
        },
        orderBy: [{ sessionType: 'asc' }, { duration: 'asc' }],
      });

      return success(tiers);
    });
  }

  /**
   * Update or create a pricing tier
   */
  async upsertPricingTier(
    tenantId: string,
    tutorProfileId: string,
    tier: {
      sessionType: string;
      duration: number;
      baseRate: number;
      currency?: string;
      groupDiscount?: number;
      maxGroupSize?: number;
      introRate?: number;
    }
  ): Promise<Result<Prisma.TutorPricingTierGetPayload<{}>>> {
    return this.withTiming('upsertPricingTier', async () => {
      // Verify tutor exists
      const tutor = await prisma.tutorProfile.findFirst({
        where: {
          id: tutorProfileId,
          user: { tenantId },
        },
      });

      if (!tutor) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tutor profile ${tutorProfileId} not found`,
        });
      }

      const result = await prisma.tutorPricingTier.upsert({
        where: {
          profileId_sessionType_duration: {
            profileId: tutorProfileId,
            sessionType: tier.sessionType,
            duration: tier.duration,
          },
        },
        create: {
          profileId: tutorProfileId,
          sessionType: tier.sessionType,
          duration: tier.duration,
          baseRate: tier.baseRate,
          currency: tier.currency || 'AUD',
          groupDiscount: tier.groupDiscount || 0,
          maxGroupSize: tier.maxGroupSize || 1,
          introRate: tier.introRate,
          isActive: true,
        },
        update: {
          baseRate: tier.baseRate,
          currency: tier.currency,
          groupDiscount: tier.groupDiscount,
          maxGroupSize: tier.maxGroupSize,
          introRate: tier.introRate,
          isActive: true,
        },
      });

      log.info('Pricing tier upserted', {
        tutorProfileId,
        sessionType: tier.sessionType,
        duration: tier.duration,
      });

      return success(result);
    });
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  /**
   * Verify tutor has valid safeguarding checks for jurisdiction
   */
  private verifySafeguarding(
    tutor: TutorProfileWithRelations,
    jurisdiction: Jurisdiction
  ): boolean {
    const req = JURISDICTION_REQUIREMENTS[jurisdiction];
    if (!req.safeguardingCheckRequired) return true;
    return tutor.safeguardingChecks.some(
      (c) =>
        c.type === req.safeguardingCheckType &&
        c.status === 'valid' &&
        (!c.expiresAt || c.expiresAt > new Date())
    );
  }

  /**
   * Calculate match score between tutor and learner
   */
  private calculateMatch(
    tutor: TutorProfileWithRelations,
    learner: LearnerProfileWithRelations,
    request: TutorMatchRequest
  ): TutorMatch {
    // Get subject match from TutorSubject relation
    const tutorSubject = tutor.subjects.find((s) => s.subjectId === request.subjectId);
    const subjectMatch = (tutorSubject?.confidenceLevel || 0) * 20; // 1-5 scale to 0-100

    // Style match (would use more sophisticated AI in production)
    const styleMatch = learner.learningPace ? 75 : 70;

    // Trust score from user
    const trustMatch = Math.min(100, tutor.user.trustScore);

    // Price match using TutorPricingTier
    const pricing = tutor.pricingTiers.find((p) => p.sessionType === request.sessionType);
    const priceMatch = request.maxHourlyRate && pricing
      ? pricing.baseRate <= request.maxHourlyRate ? 100 : 50
      : 80;

    const matchScore = Math.round(
      subjectMatch * 0.35 + styleMatch * 0.25 + trustMatch * 0.25 + priceMatch * 0.15
    );

    const matchReasons: string[] = [];
    if (subjectMatch >= 80) matchReasons.push('Expert in subject');
    if (trustMatch >= 90) matchReasons.push('Highly trusted');
    if (priceMatch === 100) matchReasons.push('Within budget');

    // Build available slots from TutorAvailabilitySlot
    const availableSlots = tutor.availabilitySlots.map((slot) => ({
      date: this.getNextDateForDayOfWeek(slot.dayOfWeek),
      startTime: slot.startTime,
      endTime: slot.endTime,
    }));

    return {
      tutor,
      matchScore,
      matchReasons,
      matchBreakdown: { subjectMatch, styleMatch, trustMatch, priceMatch },
      availableSlots,
      estimatedPrice: pricing?.baseRate || 50,
    };
  }

  /**
   * Check availability using TutorAvailabilitySlot model
   */
  private checkAvailabilityFromSlots(
    slots: Prisma.TutorAvailabilitySlotGetPayload<{}>[],
    start: Date,
    duration: number
  ): boolean {
    const dayOfWeek = start.getDay();
    const startTime = start.toTimeString().slice(0, 5); // "HH:MM"
    const endTime = new Date(start.getTime() + duration * 60000)
      .toTimeString()
      .slice(0, 5);

    // Check if requested time falls within any availability slot
    return slots.some(
      (slot) =>
        slot.dayOfWeek === dayOfWeek &&
        slot.startTime <= startTime &&
        slot.endTime >= endTime
    );
  }

  /**
   * Calculate pricing using TutorPricingTier model
   */
  private calculatePricingFromTiers(
    tiers: Prisma.TutorPricingTierGetPayload<{}>[],
    sessionType: string,
    duration: number,
    studentCount: number
  ): BookingPricing {
    // Find matching tier
    const tier = tiers.find(
      (t) => t.sessionType === sessionType && t.duration === duration
    ) || tiers.find(
      (t) => t.sessionType === sessionType
    ) || tiers[0];

    if (!tier) {
      // Default pricing if no tiers found
      return {
        baseRate: 50,
        duration,
        groupDiscount: 0,
        subtotal: 50 * (duration / 60),
        platformFee: 5 * (duration / 60),
        total: 50 * (duration / 60),
        currency: 'AUD',
        tutorEarnings: 45 * (duration / 60),
      };
    }

    const hours = duration / 60;
    const baseRate = tier.baseRate;
    const subtotal = baseRate * hours;

    // Apply group discount
    const groupDiscount = studentCount > 1
      ? subtotal * tier.groupDiscount * (studentCount - 1)
      : 0;
    const discounted = subtotal - groupDiscount;

    // Platform fee is 10% by default
    const platformFeeRate = 0.10;
    const platformFee = discounted * platformFeeRate;

    return {
      baseRate,
      duration,
      groupDiscount,
      subtotal: discounted,
      platformFee,
      total: discounted,
      currency: tier.currency,
      tutorEarnings: discounted - platformFee,
    };
  }

  /**
   * Calculate refund amount based on cancellation timing
   */
  private calculateRefundAmount(booking: BookingWithRelations): number {
    const pricing = booking.pricing as unknown as BookingPricing;
    const hoursUntil = (booking.scheduledStart.getTime() - Date.now()) / 3600000;
    if (hoursUntil >= 24) return pricing.total;
    if (hoursUntil >= 4) return pricing.total * 0.5;
    return 0;
  }

  /**
   * Update tutor's rating after feedback
   */
  private async updateTutorRating(
    tutorProfileId: string,
    rating: number
  ): Promise<void> {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
    });

    if (!tutor) return;

    const metrics = tutor.metrics as { averageRating?: number; ratingCount?: number } || {};
    const currentAvg = metrics.averageRating || 0;
    const currentCount = metrics.ratingCount || 0;

    const newAvg = (currentAvg * currentCount + rating) / (currentCount + 1);
    const newCount = currentCount + 1;

    await prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: {
        metrics: {
          ...metrics,
          averageRating: newAvg,
          ratingCount: newCount,
        },
      },
    });
  }

  /**
   * Get next date for a given day of week
   */
  private getNextDateForDayOfWeek(dayOfWeek: number): Date {
    const today = new Date();
    const currentDay = today.getDay();
    const daysUntil = (dayOfWeek - currentDay + 7) % 7 || 7;
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + daysUntil);
    return nextDate;
  }

  private extractKeywords(text: string): string[] {
    const stops = ['i', 'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'to', 'for'];
    return text
      .toLowerCase()
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stops.includes(w))
      .slice(0, 10);
  }

  private generateBio(keywords: string[]): string {
    return (
      `Passionate educator specializing in ${keywords.slice(0, 3).join(', ')}. ` +
      `Focused on making learning engaging and accessible for every student.`
    );
  }
}

// ============================================================================
// Service Initialization
// ============================================================================

export function initializeTutorBookingService(): TutorBookingService {
  if (!tutorBookingServiceInstance) {
    tutorBookingServiceInstance = new TutorBookingService();
  }
  return tutorBookingServiceInstance;
}

export function getTutorBookingService(): TutorBookingService {
  if (!tutorBookingServiceInstance) {
    throw new Error('TutorBookingService not initialized. Call initializeTutorBookingService() first.');
  }
  return tutorBookingServiceInstance;
}

const PROFILE_QUESTIONS = [
  {
    id: 'pb_1',
    question: 'What subjects do you teach and what makes you passionate about them?',
    helpText: 'Share your enthusiasm!'
  },
  {
    id: 'pb_2',
    question: 'How would you describe your teaching style?',
    helpText: 'Patient? Energetic? Hands-on?'
  },
  {
    id: 'pb_3',
    question: 'What age groups do you work best with?',
    helpText: 'Primary, secondary, adult?'
  },
  {
    id: 'pb_4',
    question: 'Describe a teaching moment you are proud of',
    helpText: 'A specific example helps parents'
  },
  {
    id: 'pb_5',
    question: 'How do you handle students who are struggling?',
    helpText: 'Parents want to know you can handle difficulty'
  }
];
