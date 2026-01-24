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
 * @module TutorBookingService
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  Validator,
  EventBus,
  Cache,
  ScholarlyConfig,
  TutorUser,
  LearnerUser,
  TutoringSession,
  SessionStatus,
  SessionType,
  SessionFeedback,
  TutorPricing,
  SafeguardingCheck,
  Jurisdiction,
  JURISDICTION_REQUIREMENTS
} from '@scholarly/shared/types/scholarly-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface TutorRepository {
  findById(tenantId: string, id: string): Promise<TutorUser | null>;
  findBySubject(tenantId: string, subjectId: string, filters?: TutorSearchFilters): Promise<TutorUser[]>;
  findAvailable(tenantId: string, dateTime: Date, duration: number): Promise<TutorUser[]>;
  save(tenantId: string, tutor: TutorUser): Promise<TutorUser>;
  update(tenantId: string, id: string, updates: Partial<TutorUser>): Promise<TutorUser>;
}

export interface TutorSearchFilters {
  subjectIds?: string[];
  yearLevels?: string[];
  sessionTypes?: SessionType[];
  jurisdiction?: Jurisdiction;
  minRating?: number;
  maxHourlyRate?: number;
  languages?: string[];
}

export interface LearnerRepository {
  findById(tenantId: string, id: string): Promise<LearnerUser | null>;
  findByParent(tenantId: string, parentId: string): Promise<LearnerUser[]>;
  save(tenantId: string, learner: LearnerUser): Promise<LearnerUser>;
}

export interface SessionRepository {
  findById(tenantId: string, id: string): Promise<TutoringSession | null>;
  findByTutor(tenantId: string, tutorId: string, dateRange?: { start: Date; end: Date }): Promise<TutoringSession[]>;
  findByLearner(tenantId: string, learnerId: string): Promise<TutoringSession[]>;
  findUpcoming(tenantId: string, userId: string, limit?: number): Promise<TutoringSession[]>;
  save(tenantId: string, session: TutoringSession): Promise<TutoringSession>;
  update(tenantId: string, id: string, updates: Partial<TutoringSession>): Promise<TutoringSession>;
}

export interface BookingRepository {
  findById(tenantId: string, id: string): Promise<Booking | null>;
  findByUser(tenantId: string, userId: string, status?: string): Promise<Booking[]>;
  save(tenantId: string, booking: Booking): Promise<Booking>;
  update(tenantId: string, id: string, updates: Partial<Booking>): Promise<Booking>;
}

// ============================================================================
// BOOKING & MATCHING TYPES
// ============================================================================

export interface Booking {
  id: string;
  tenantId: string;
  tutorId: string;
  learnerIds: string[];
  bookedByUserId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  sessionType: SessionType;
  subjectId: string;
  subjectName?: string;
  topicsNeedingHelp: string[];
  learnerNotes?: string;
  isGroupSession: boolean;
  openToOthers: boolean;
  maxGroupSize: number;
  pricing: BookingPricing;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: Date;
}

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
  tutor: TutorUser;
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

export class TutorBookingService extends ScholarlyBaseService {
  private readonly tutorRepo: TutorRepository;
  private readonly learnerRepo: LearnerRepository;
  private readonly sessionRepo: SessionRepository;
  private readonly bookingRepo: BookingRepository;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    tutorRepo: TutorRepository;
    learnerRepo: LearnerRepository;
    sessionRepo: SessionRepository;
    bookingRepo: BookingRepository;
  }) {
    super('TutorBookingService', deps);
    this.tutorRepo = deps.tutorRepo;
    this.learnerRepo = deps.learnerRepo;
    this.sessionRepo = deps.sessionRepo;
    this.bookingRepo = deps.bookingRepo;
  }

  // --------------------------------------------------------------------------
  // TUTOR SEARCH & MATCHING
  // --------------------------------------------------------------------------

  /**
   * Find tutors matching a learner's needs using AI scoring
   */
  async findTutors(
    tenantId: string,
    request: TutorMatchRequest
  ): Promise<Result<{ tutors: TutorMatch[]; totalCount: number }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(request.learnerId);
      Validator.required(request.subjectId, 'subjectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'findTutors',
      tenantId,
      async () => {
        const learner = await this.learnerRepo.findById(tenantId, request.learnerId);
        if (!learner) throw new NotFoundError('Learner', request.learnerId);

        const tutors = await this.tutorRepo.findBySubject(tenantId, request.subjectId, {
          sessionTypes: [request.sessionType],
          jurisdiction: request.jurisdiction,
          maxHourlyRate: request.maxHourlyRate
        });

        // Filter by safeguarding and score
        const matches: TutorMatch[] = [];
        for (const tutor of tutors) {
          if (!this.verifySafeguarding(tutor, request.jurisdiction)) continue;
          const match = this.calculateMatch(tutor, learner, request);
          if (match.matchScore >= 50) matches.push(match);
        }

        matches.sort((a, b) => b.matchScore - a.matchScore);

        await this.publishEvent('scholarly.tutor.search_completed', tenantId, {
          learnerId: request.learnerId,
          subjectId: request.subjectId,
          resultsCount: matches.length
        });

        return { tutors: matches.slice(0, 20), totalCount: matches.length };
      },
      { learnerId: request.learnerId }
    );
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
    try {
      Validator.tenantId(tenantId);
      Validator.userId(learnerId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'getProactiveSuggestions',
      tenantId,
      async () => {
        // Would integrate with LIS - for now return structure
        return {
          areasNeedingSupport: ['Fractions', 'Word problems'],
          schoolTeacherNote:
            `We've noticed some challenges with fractions and word problems. ` +
            `Consider discussing with their classroom teacher for additional school support.`,
          marketplaceSuggestion:
            `If school support isn't sufficient, our tutor marketplace ` +
            `has specialists in these areas who can provide one-on-one help.`
        };
      },
      { learnerId }
    );
  }

  // --------------------------------------------------------------------------
  // BOOKING MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Create a booking request
   */
  async createBooking(
    tenantId: string,
    bookedByUserId: string,
    request: {
      tutorId: string;
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
  ): Promise<Result<{ booking: Booking; session: TutoringSession }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(bookedByUserId);
      Validator.userId(request.tutorId);
      Validator.dateInFuture(request.scheduledStart, 'scheduledStart');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'createBooking',
      tenantId,
      async () => {
        const tutor = await this.tutorRepo.findById(tenantId, request.tutorId);
        if (!tutor) throw new NotFoundError('Tutor', request.tutorId);

        // Verify availability
        const isAvailable = await this.checkAvailability(
          tenantId,
          request.tutorId,
          request.scheduledStart,
          request.duration
        );
        if (!isAvailable) throw new ValidationError('Tutor not available at requested time');

        // Calculate pricing
        const pricing = this.calculatePricing(
          tutor.pricing,
          request.duration,
          request.learnerIds.length
        );

        const booking: Booking = {
          id: this.generateId('booking'),
          tenantId,
          tutorId: request.tutorId,
          learnerIds: request.learnerIds,
          bookedByUserId,
          scheduledStart: request.scheduledStart,
          scheduledEnd: new Date(request.scheduledStart.getTime() + request.duration * 60000),
          sessionType: request.sessionType,
          subjectId: request.subjectId,
          topicsNeedingHelp: request.topicsNeedingHelp,
          learnerNotes: request.learnerNotes,
          isGroupSession: request.learnerIds.length > 1,
          openToOthers: request.openToOthers || false,
          maxGroupSize: request.maxGroupSize || 1,
          pricing,
          status: 'pending',
          createdAt: new Date()
        };

        const savedBooking = await this.bookingRepo.save(tenantId, booking);
        const session = await this.createSession(tenantId, savedBooking, tutor);

        await this.publishEvent('scholarly.booking.created', tenantId, {
          bookingId: savedBooking.id,
          tutorId: request.tutorId,
          scheduledStart: request.scheduledStart
        });

        return { booking: savedBooking, session };
      },
      { bookedByUserId, tutorId: request.tutorId }
    );
  }

  /**
   * Get bookings for a user
   */
  async getBookings(
    tenantId: string,
    userId: string,
    status?: string
  ): Promise<Result<Booking[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'getBookings',
      tenantId,
      async () => {
        return await this.bookingRepo.findByUser(tenantId, userId, status);
      },
      { userId }
    );
  }

  /**
   * Confirm a booking (tutor action)
   */
  async confirmBooking(
    tenantId: string,
    bookingId: string,
    tutorId: string
  ): Promise<Result<Booking>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(bookingId, 'bookingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'confirmBooking',
      tenantId,
      async () => {
        const booking = await this.bookingRepo.findById(tenantId, bookingId);
        if (!booking) throw new NotFoundError('Booking', bookingId);
        if (booking.tutorId !== tutorId)
          throw new AuthorizationError('Only assigned tutor can confirm');

        booking.status = 'confirmed';
        const updated = await this.bookingRepo.update(tenantId, bookingId, booking);

        await this.publishEvent('scholarly.booking.confirmed', tenantId, { bookingId, tutorId });
        return updated;
      },
      { bookingId }
    );
  }

  /**
   * Cancel a booking
   */
  async cancelBooking(
    tenantId: string,
    bookingId: string,
    userId: string,
    reason: string
  ): Promise<Result<Booking>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(bookingId, 'bookingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'cancelBooking',
      tenantId,
      async () => {
        const booking = await this.bookingRepo.findById(tenantId, bookingId);
        if (!booking) throw new NotFoundError('Booking', bookingId);

        booking.status = 'cancelled';
        const updated = await this.bookingRepo.update(tenantId, bookingId, booking);

        const refundAmount = this.calculateRefund(booking);
        await this.publishEvent('scholarly.booking.cancelled', tenantId, {
          bookingId,
          userId,
          reason,
          refundAmount
        });
        return updated;
      },
      { bookingId }
    );
  }

  // --------------------------------------------------------------------------
  // SESSION MANAGEMENT
  // --------------------------------------------------------------------------

  async getUpcomingSessions(
    tenantId: string,
    userId: string,
    limit = 10
  ): Promise<Result<TutoringSession[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
    } catch (e) {
      return failure(e as ValidationError);
    }
    return this.withTiming(
      'getUpcomingSessions',
      tenantId,
      async () => {
        return await this.sessionRepo.findUpcoming(tenantId, userId, limit);
      },
      { userId }
    );
  }

  async startSession(tenantId: string, sessionId: string): Promise<Result<TutoringSession>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'startSession',
      tenantId,
      async () => {
        const session = await this.sessionRepo.findById(tenantId, sessionId);
        if (!session) throw new NotFoundError('Session', sessionId);
        session.status = SessionStatus.IN_PROGRESS;
        session.actualStart = new Date();
        return await this.sessionRepo.update(tenantId, sessionId, session);
      },
      { sessionId }
    );
  }

  async completeSession(
    tenantId: string,
    sessionId: string,
    data: {
      sessionNotes?: string;
      homeworkAssigned?: string;
    }
  ): Promise<Result<{ session: TutoringSession; tutorEarnings: number; tokenRewards: number }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'completeSession',
      tenantId,
      async () => {
        const session = await this.sessionRepo.findById(tenantId, sessionId);
        if (!session) throw new NotFoundError('Session', sessionId);

        session.status = SessionStatus.COMPLETED;
        session.actualEnd = new Date();
        session.sessionNotes = data.sessionNotes;
        session.homeworkAssigned = data.homeworkAssigned;
        session.billingStatus = 'charged';

        const tokenRewards = Math.round(session.tutorEarnings * 0.01);
        const updated = await this.sessionRepo.update(tenantId, sessionId, session);

        await this.publishEvent('scholarly.session.completed', tenantId, {
          sessionId,
          tutorEarnings: session.tutorEarnings
        });
        return { session: updated, tutorEarnings: session.tutorEarnings, tokenRewards };
      },
      { sessionId }
    );
  }

  async submitFeedback(
    tenantId: string,
    sessionId: string,
    userId: string,
    feedback: SessionFeedback
  ): Promise<Result<TutoringSession>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'submitFeedback',
      tenantId,
      async () => {
        const session = await this.sessionRepo.findById(tenantId, sessionId);
        if (!session) throw new NotFoundError('Session', sessionId);

        if (userId === session.tutorId) session.tutorFeedback = feedback;
        else if (session.learnerIds.includes(userId)) session.learnerFeedback = feedback;
        else if (session.parentIds.includes(userId)) session.parentFeedback = feedback;
        else throw new AuthorizationError('User not in session');

        const updated = await this.sessionRepo.update(tenantId, sessionId, session);
        if (userId !== session.tutorId)
          await this.updateTutorRating(tenantId, session.tutorId, feedback.rating);
        return updated;
      },
      { sessionId }
    );
  }

  // --------------------------------------------------------------------------
  // AI PROFILE BUILDER
  // --------------------------------------------------------------------------

  async startProfileBuilder(
    tenantId: string,
    tutorId: string
  ): Promise<Result<ProfileBuilderSession>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(tutorId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'startProfileBuilder',
      tenantId,
      async () => ({
        id: this.generateId('profile_builder'),
        tutorId,
        currentStep: 0,
        totalSteps: PROFILE_QUESTIONS.length,
        responses: []
      }),
      { tutorId }
    );
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(sessionId, 'sessionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming(
      'answerProfileQuestion',
      tenantId,
      async () => {
        // In production would load session from DB
        const keywords = this.extractKeywords(answer);
        const currentStep = 1; // Would track actual step

        const isComplete = currentStep >= PROFILE_QUESTIONS.length;
        const nextQuestion = isComplete ? undefined : PROFILE_QUESTIONS[currentStep];
        const suggestedBio = isComplete ? this.generateBio(keywords) : undefined;

        return { nextQuestion, isComplete, suggestedBio };
      },
      { sessionId }
    );
  }

  // --------------------------------------------------------------------------
  // PRIVATE METHODS
  // --------------------------------------------------------------------------

  private verifySafeguarding(tutor: TutorUser, jurisdiction: Jurisdiction): boolean {
    const req = JURISDICTION_REQUIREMENTS[jurisdiction];
    if (!req.safeguardingCheckRequired) return true;
    return tutor.safeguardingChecks.some(
      (c) =>
        c.type === req.safeguardingCheckType &&
        c.status === 'valid' &&
        (!c.expiresAt || c.expiresAt > new Date())
    );
  }

  private calculateMatch(
    tutor: TutorUser,
    learner: LearnerUser,
    request: TutorMatchRequest
  ): TutorMatch {
    const subjectMatch =
      tutor.subjects.find((s) => s.subjectId === request.subjectId)?.confidenceLevel || 0;
    const styleMatch = learner.learningPreferences ? 75 : 70;
    const trustMatch = Math.min(100, tutor.trustScore);
    const priceMatch = request.maxHourlyRate
      ? tutor.pricing.hourlyRate1to1 <= request.maxHourlyRate
        ? 100
        : 50
      : 80;

    const matchScore = Math.round(
      subjectMatch * 0.35 + styleMatch * 0.25 + trustMatch * 0.25 + priceMatch * 0.15
    );

    const matchReasons: string[] = [];
    if (subjectMatch >= 80) matchReasons.push('Expert in subject');
    if (trustMatch >= 90) matchReasons.push('Highly trusted');
    if (priceMatch === 100) matchReasons.push('Within budget');

    return {
      tutor,
      matchScore,
      matchReasons,
      matchBreakdown: { subjectMatch: subjectMatch * 20, styleMatch, trustMatch, priceMatch },
      availableSlots: [],
      estimatedPrice: tutor.pricing.hourlyRate1to1
    };
  }

  private async checkAvailability(
    tenantId: string,
    tutorId: string,
    start: Date,
    duration: number
  ): Promise<boolean> {
    const end = new Date(start.getTime() + duration * 60000);
    const sessions = await this.sessionRepo.findByTutor(tenantId, tutorId, { start, end });
    return sessions.length === 0;
  }

  private calculatePricing(
    tutorPricing: TutorPricing,
    duration: number,
    studentCount: number
  ): BookingPricing {
    const hours = duration / 60;
    const baseRate =
      studentCount === 1 ? tutorPricing.hourlyRate1to1 : tutorPricing.hourlyRateGroup;
    const subtotal = baseRate * hours;
    const groupDiscount = studentCount > 1 ? subtotal * 0.1 * (studentCount - 1) : 0;
    const discounted = subtotal - groupDiscount;
    const platformFee = discounted * tutorPricing.commissionRate;
    return {
      baseRate,
      duration,
      groupDiscount,
      subtotal: discounted,
      platformFee,
      total: discounted,
      currency: tutorPricing.currency,
      tutorEarnings: discounted - platformFee
    };
  }

  private async createSession(
    tenantId: string,
    booking: Booking,
    tutor: TutorUser
  ): Promise<TutoringSession> {
    const session: TutoringSession = {
      id: this.generateId('session'),
      tenantId,
      tutorId: booking.tutorId,
      learnerIds: booking.learnerIds,
      parentIds: [],
      scheduledStart: booking.scheduledStart,
      scheduledEnd: booking.scheduledEnd,
      timezone: tutor.availability.timezone,
      sessionType: booking.sessionType,
      isGroupSession: booking.isGroupSession,
      subjectId: booking.subjectId,
      subjectName: tutor.subjects.find((s) => s.subjectId === booking.subjectId)?.subjectName || '',
      topicsFocus: booking.topicsNeedingHelp,
      status: SessionStatus.SCHEDULED,
      bookingId: booking.id,
      resourcesShared: [],
      billingStatus: 'pending',
      amountCharged: booking.pricing.total,
      tutorEarnings: booking.pricing.tutorEarnings,
      platformCommission: booking.pricing.platformFee,
      tokenRewards: 0
    };
    return await this.sessionRepo.save(tenantId, session);
  }

  private calculateRefund(booking: Booking): number {
    const hoursUntil = (booking.scheduledStart.getTime() - Date.now()) / 3600000;
    if (hoursUntil >= 24) return booking.pricing.total;
    if (hoursUntil >= 4) return booking.pricing.total * 0.5;
    return 0;
  }

  private async updateTutorRating(
    tenantId: string,
    tutorId: string,
    rating: number
  ): Promise<void> {
    const tutor = await this.tutorRepo.findById(tenantId, tutorId);
    if (!tutor) return;
    const m = tutor.metrics;
    m.averageRating = (m.averageRating * m.ratingCount + rating) / (m.ratingCount + 1);
    m.ratingCount++;
    await this.tutorRepo.update(tenantId, tutorId, { metrics: m });
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
