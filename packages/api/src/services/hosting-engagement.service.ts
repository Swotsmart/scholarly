/**
 * Hosting Engagement Service
 *
 * Manages enquiries, tour bookings, and reviews for educational providers.
 * This service handles the parent/student engagement lifecycle.
 *
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import { Result, success, failure } from './base.service';

import {
  HostingEnquiry,
  HostingTourBooking,
  HostingProviderReview,
  HostingCategoryRating,
  HostingYearLevel,
  HostingAggregateRating,
} from './hosting-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface HostingEnquiryRepository {
  findById(enquiryId: string): Promise<HostingEnquiry | null>;
  findByProviderId(
    providerId: string,
    status?: string[]
  ): Promise<HostingEnquiry[]>;
  create(
    enquiry: Omit<HostingEnquiry, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<HostingEnquiry>;
  update(
    enquiryId: string,
    updates: Partial<HostingEnquiry>
  ): Promise<HostingEnquiry>;
  delete(enquiryId: string): Promise<void>;
}

export interface HostingTourBookingRepository {
  findById(bookingId: string): Promise<HostingTourBooking | null>;
  findByProviderId(
    providerId: string,
    status?: string[]
  ): Promise<HostingTourBooking[]>;
  findUpcoming(providerId: string): Promise<HostingTourBooking[]>;
  create(
    booking: Omit<HostingTourBooking, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<HostingTourBooking>;
  update(
    bookingId: string,
    updates: Partial<HostingTourBooking>
  ): Promise<HostingTourBooking>;
  delete(bookingId: string): Promise<void>;
}

export interface HostingReviewRepository {
  findById(reviewId: string): Promise<HostingProviderReview | null>;
  findByProviderId(
    providerId: string,
    status?: string[]
  ): Promise<HostingProviderReview[]>;
  getAggregateRating(providerId: string): Promise<{
    average: number;
    count: number;
    distribution: Record<string, number>;
  } | null>;
  create(
    review: Omit<HostingProviderReview, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<HostingProviderReview>;
  update(
    reviewId: string,
    updates: Partial<HostingProviderReview>
  ): Promise<HostingProviderReview>;
  delete(reviewId: string): Promise<void>;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface HostingCreateEnquiryInput {
  providerId: string;
  offeringId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContact?: 'email' | 'phone';
  studentName?: string;
  studentAge?: number;
  studentYearLevel?: HostingYearLevel;
  enquiryType: 'general' | 'enrollment' | 'tour' | 'pricing' | 'availability';
  message: string;
  source?: 'website' | 'agent_api' | 'referral' | 'other';
  agentId?: string;
}

export interface HostingCreateTourBookingInput {
  providerId: string;
  locationId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  scheduledAt: Date;
  duration?: number;
  tourType: 'in_person' | 'virtual';
  attendeeCount: number;
  studentNames?: string[];
  specialRequests?: string;
}

export interface HostingCreateReviewInput {
  providerId: string;
  authorType: 'parent' | 'student' | 'staff' | 'alumni';
  authorName?: string;
  overallRating: number;
  categoryRatings?: HostingCategoryRating[];
  title?: string;
  content: string;
  wouldRecommend: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

const validators = {
  providerId(value: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Invalid providerId');
    }
  },
  nonEmptyString(value: string, field: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${field} is required and must be a non-empty string`);
    }
  },
  email(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Invalid email format');
    }
  },
  rating(value: number): void {
    if (typeof value !== 'number' || value < 1 || value > 5) {
      throw new Error('Rating must be between 1 and 5');
    }
  },
  futureDate(value: Date): void {
    if (!(value instanceof Date) || value <= new Date()) {
      throw new Error('Date must be in the future');
    }
  },
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class HostingEngagementService {
  constructor(
    private readonly enquiryRepository: HostingEnquiryRepository,
    private readonly tourRepository: HostingTourBookingRepository,
    private readonly reviewRepository: HostingReviewRepository,
    private readonly qualityRepository?: {
      update(
        providerId: string,
        updates: { aggregateRating: HostingAggregateRating }
      ): Promise<void>;
    }
  ) {}

  // ===========================================================================
  // ENQUIRY METHODS
  // ===========================================================================

  /**
   * Create a new enquiry.
   */
  async createEnquiry(
    input: HostingCreateEnquiryInput
  ): Promise<Result<HostingEnquiry>> {
    try {
      validators.providerId(input.providerId);
      validators.nonEmptyString(input.contactName, 'contactName');
      validators.email(input.contactEmail);
      validators.nonEmptyString(input.message, 'message');

      const enquiry = await this.enquiryRepository.create({
        providerId: input.providerId,
        offeringId: input.offeringId ?? null,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        preferredContact: input.preferredContact ?? 'email',
        studentName: input.studentName ?? null,
        studentAge: input.studentAge ?? null,
        studentYearLevel: input.studentYearLevel ?? null,
        enquiryType: input.enquiryType,
        message: input.message,
        source: input.source ?? 'website',
        agentId: input.agentId ?? null,
        status: 'new',
        respondedAt: null,
        responseTime: null,
      });

      log.info('Enquiry created', {
        enquiryId: enquiry.id,
        providerId: input.providerId,
        type: input.enquiryType,
      });

      return success(enquiry);
    } catch (error) {
      log.error('Failed to create enquiry', error as Error, { input });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get enquiry by ID.
   */
  async getEnquiry(enquiryId: string): Promise<Result<HostingEnquiry>> {
    try {
      const enquiry = await this.enquiryRepository.findById(enquiryId);
      if (!enquiry) {
        return failure({
          code: 'NOT_FOUND',
          message: `Enquiry not found: ${enquiryId}`,
          details: { enquiryId },
        });
      }
      return success(enquiry);
    } catch (error) {
      log.error('Failed to get enquiry', error as Error, { enquiryId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get enquiries for a provider.
   */
  async getProviderEnquiries(
    providerId: string,
    status?: string[]
  ): Promise<Result<HostingEnquiry[]>> {
    try {
      validators.providerId(providerId);
      const enquiries = await this.enquiryRepository.findByProviderId(
        providerId,
        status
      );
      return success(enquiries);
    } catch (error) {
      log.error('Failed to get provider enquiries', error as Error, {
        providerId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Mark enquiry as responded.
   */
  async markEnquiryResponded(
    enquiryId: string
  ): Promise<Result<HostingEnquiry>> {
    try {
      const enquiry = await this.enquiryRepository.findById(enquiryId);
      if (!enquiry) {
        return failure({
          code: 'NOT_FOUND',
          message: `Enquiry not found: ${enquiryId}`,
          details: { enquiryId },
        });
      }

      const respondedAt = new Date();
      const responseTime = Math.round(
        (respondedAt.getTime() - enquiry.createdAt.getTime()) / 60000
      ); // Minutes

      const updated = await this.enquiryRepository.update(enquiryId, {
        status: 'contacted',
        respondedAt,
        responseTime,
      });

      log.info('Enquiry marked as responded', {
        enquiryId,
        responseTime,
      });

      return success(updated);
    } catch (error) {
      log.error('Failed to mark enquiry responded', error as Error, {
        enquiryId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update enquiry status.
   */
  async updateEnquiryStatus(
    enquiryId: string,
    status: 'new' | 'contacted' | 'in_progress' | 'converted' | 'closed'
  ): Promise<Result<HostingEnquiry>> {
    try {
      const enquiry = await this.enquiryRepository.findById(enquiryId);
      if (!enquiry) {
        return failure({
          code: 'NOT_FOUND',
          message: `Enquiry not found: ${enquiryId}`,
          details: { enquiryId },
        });
      }

      const updated = await this.enquiryRepository.update(enquiryId, { status });

      log.info('Enquiry status updated', { enquiryId, status });
      return success(updated);
    } catch (error) {
      log.error('Failed to update enquiry status', error as Error, {
        enquiryId,
        status,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // TOUR BOOKING METHODS
  // ===========================================================================

  /**
   * Create a tour booking.
   */
  async createTourBooking(
    input: HostingCreateTourBookingInput
  ): Promise<Result<HostingTourBooking>> {
    try {
      validators.providerId(input.providerId);
      validators.nonEmptyString(input.contactName, 'contactName');
      validators.email(input.contactEmail);
      validators.futureDate(input.scheduledAt);

      const booking = await this.tourRepository.create({
        providerId: input.providerId,
        locationId: input.locationId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        contactPhone: input.contactPhone ?? null,
        scheduledAt: input.scheduledAt,
        duration: input.duration ?? 60,
        tourType: input.tourType,
        attendeeCount: input.attendeeCount,
        studentNames: input.studentNames ?? [],
        status: 'pending',
        confirmedAt: null,
        specialRequests: input.specialRequests ?? null,
        providerNotes: null,
      });

      log.info('Tour booking created', {
        bookingId: booking.id,
        providerId: input.providerId,
        scheduledAt: input.scheduledAt,
      });

      return success(booking);
    } catch (error) {
      log.error('Failed to create tour booking', error as Error, { input });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get tour booking by ID.
   */
  async getTourBooking(
    bookingId: string
  ): Promise<Result<HostingTourBooking>> {
    try {
      const booking = await this.tourRepository.findById(bookingId);
      if (!booking) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tour booking not found: ${bookingId}`,
          details: { bookingId },
        });
      }
      return success(booking);
    } catch (error) {
      log.error('Failed to get tour booking', error as Error, { bookingId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get upcoming tours for a provider.
   */
  async getUpcomingTours(
    providerId: string
  ): Promise<Result<HostingTourBooking[]>> {
    try {
      validators.providerId(providerId);
      const tours = await this.tourRepository.findUpcoming(providerId);
      return success(tours);
    } catch (error) {
      log.error('Failed to get upcoming tours', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Confirm a tour booking.
   */
  async confirmTourBooking(
    bookingId: string
  ): Promise<Result<HostingTourBooking>> {
    try {
      const booking = await this.tourRepository.findById(bookingId);
      if (!booking) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tour booking not found: ${bookingId}`,
          details: { bookingId },
        });
      }

      if (booking.status !== 'pending') {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Cannot confirm booking with status '${booking.status}'`,
          details: { status: booking.status },
        });
      }

      const updated = await this.tourRepository.update(bookingId, {
        status: 'confirmed',
        confirmedAt: new Date(),
      });

      log.info('Tour booking confirmed', { bookingId });
      return success(updated);
    } catch (error) {
      log.error('Failed to confirm tour booking', error as Error, { bookingId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Cancel a tour booking.
   */
  async cancelTourBooking(
    bookingId: string
  ): Promise<Result<HostingTourBooking>> {
    try {
      const booking = await this.tourRepository.findById(bookingId);
      if (!booking) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tour booking not found: ${bookingId}`,
          details: { bookingId },
        });
      }

      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Cannot cancel booking with status '${booking.status}'`,
          details: { status: booking.status },
        });
      }

      const updated = await this.tourRepository.update(bookingId, {
        status: 'cancelled',
      });

      log.info('Tour booking cancelled', { bookingId });
      return success(updated);
    } catch (error) {
      log.error('Failed to cancel tour booking', error as Error, { bookingId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Reschedule a tour booking.
   */
  async rescheduleTourBooking(
    bookingId: string,
    newScheduledAt: Date
  ): Promise<Result<HostingTourBooking>> {
    try {
      validators.futureDate(newScheduledAt);

      const booking = await this.tourRepository.findById(bookingId);
      if (!booking) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tour booking not found: ${bookingId}`,
          details: { bookingId },
        });
      }

      if (booking.status === 'completed' || booking.status === 'cancelled') {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Cannot reschedule booking with status '${booking.status}'`,
          details: { status: booking.status },
        });
      }

      const updated = await this.tourRepository.update(bookingId, {
        scheduledAt: newScheduledAt,
        status: 'pending', // Reset to pending after reschedule
        confirmedAt: null,
      });

      log.info('Tour booking rescheduled', {
        bookingId,
        newScheduledAt,
      });
      return success(updated);
    } catch (error) {
      log.error('Failed to reschedule tour booking', error as Error, {
        bookingId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Mark tour as completed.
   */
  async completeTourBooking(
    bookingId: string,
    providerNotes?: string
  ): Promise<Result<HostingTourBooking>> {
    try {
      const booking = await this.tourRepository.findById(bookingId);
      if (!booking) {
        return failure({
          code: 'NOT_FOUND',
          message: `Tour booking not found: ${bookingId}`,
          details: { bookingId },
        });
      }

      const updated = await this.tourRepository.update(bookingId, {
        status: 'completed',
        providerNotes: providerNotes ?? booking.providerNotes,
      });

      log.info('Tour booking completed', { bookingId });
      return success(updated);
    } catch (error) {
      log.error('Failed to complete tour booking', error as Error, {
        bookingId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // REVIEW METHODS
  // ===========================================================================

  /**
   * Create a review.
   */
  async createReview(
    input: HostingCreateReviewInput
  ): Promise<Result<HostingProviderReview>> {
    try {
      validators.providerId(input.providerId);
      validators.rating(input.overallRating);
      validators.nonEmptyString(input.content, 'content');

      const review = await this.reviewRepository.create({
        providerId: input.providerId,
        authorType: input.authorType,
        authorName: input.authorName ?? null,
        isVerified: false, // Reviews need verification
        overallRating: input.overallRating,
        categoryRatings: input.categoryRatings ?? [],
        title: input.title ?? null,
        content: input.content,
        wouldRecommend: input.wouldRecommend,
        helpfulCount: 0,
        providerResponse: null,
        providerRespondedAt: null,
        status: 'pending', // Requires moderation
        moderatedAt: null,
      });

      log.info('Review created', {
        reviewId: review.id,
        providerId: input.providerId,
        rating: input.overallRating,
      });

      return success(review);
    } catch (error) {
      log.error('Failed to create review', error as Error, { input });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get review by ID.
   */
  async getReview(reviewId: string): Promise<Result<HostingProviderReview>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return failure({
          code: 'NOT_FOUND',
          message: `Review not found: ${reviewId}`,
          details: { reviewId },
        });
      }
      return success(review);
    } catch (error) {
      log.error('Failed to get review', error as Error, { reviewId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get published reviews for a provider.
   */
  async getProviderReviews(
    providerId: string
  ): Promise<Result<HostingProviderReview[]>> {
    try {
      validators.providerId(providerId);
      const reviews = await this.reviewRepository.findByProviderId(providerId, [
        'published',
      ]);
      return success(reviews);
    } catch (error) {
      log.error('Failed to get provider reviews', error as Error, {
        providerId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Publish a review (after moderation).
   */
  async publishReview(
    reviewId: string
  ): Promise<Result<HostingProviderReview>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return failure({
          code: 'NOT_FOUND',
          message: `Review not found: ${reviewId}`,
          details: { reviewId },
        });
      }

      const updated = await this.reviewRepository.update(reviewId, {
        status: 'published',
        moderatedAt: new Date(),
      });

      // Update aggregate rating
      await this.updateAggregateRating(review.providerId);

      log.info('Review published', { reviewId });
      return success(updated);
    } catch (error) {
      log.error('Failed to publish review', error as Error, { reviewId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Add provider response to a review.
   */
  async addProviderResponse(
    reviewId: string,
    response: string
  ): Promise<Result<HostingProviderReview>> {
    try {
      validators.nonEmptyString(response, 'response');

      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return failure({
          code: 'NOT_FOUND',
          message: `Review not found: ${reviewId}`,
          details: { reviewId },
        });
      }

      const updated = await this.reviewRepository.update(reviewId, {
        providerResponse: response,
        providerRespondedAt: new Date(),
      });

      log.info('Provider response added', { reviewId });
      return success(updated);
    } catch (error) {
      log.error('Failed to add provider response', error as Error, { reviewId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Mark review as helpful.
   */
  async markReviewHelpful(
    reviewId: string
  ): Promise<Result<HostingProviderReview>> {
    try {
      const review = await this.reviewRepository.findById(reviewId);
      if (!review) {
        return failure({
          code: 'NOT_FOUND',
          message: `Review not found: ${reviewId}`,
          details: { reviewId },
        });
      }

      const updated = await this.reviewRepository.update(reviewId, {
        helpfulCount: review.helpfulCount + 1,
      });

      return success(updated);
    } catch (error) {
      log.error('Failed to mark review helpful', error as Error, { reviewId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get aggregate rating for a provider.
   */
  async getAggregateRating(
    providerId: string
  ): Promise<
    Result<{
      average: number;
      count: number;
      distribution: Record<string, number>;
    } | null>
  > {
    try {
      validators.providerId(providerId);
      const rating = await this.reviewRepository.getAggregateRating(providerId);
      return success(rating);
    } catch (error) {
      log.error('Failed to get aggregate rating', error as Error, {
        providerId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // ANALYTICS METHODS
  // ===========================================================================

  /**
   * Get engagement metrics for a provider.
   */
  async getEngagementMetrics(
    providerId: string,
    _startDate?: Date,
    _endDate?: Date
  ): Promise<
    Result<{
      enquiries: {
        total: number;
        new: number;
        converted: number;
        avgResponseTimeMinutes: number | null;
      };
      tours: {
        total: number;
        completed: number;
        cancelled: number;
        noShow: number;
      };
      reviews: {
        total: number;
        averageRating: number | null;
        recommendationRate: number | null;
      };
    }>
  > {
    try {
      validators.providerId(providerId);

      // Get enquiries
      const allEnquiries = await this.enquiryRepository.findByProviderId(
        providerId
      );

      const newEnquiries = allEnquiries.filter((e) => e.status === 'new');
      const convertedEnquiries = allEnquiries.filter(
        (e) => e.status === 'converted'
      );
      const responseTimes = allEnquiries
        .filter((e) => e.responseTime !== null)
        .map((e) => e.responseTime!);
      const avgResponseTime =
        responseTimes.length > 0
          ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          : null;

      // Get tours
      const allTours = await this.tourRepository.findByProviderId(providerId);
      const completedTours = allTours.filter((t) => t.status === 'completed');
      const cancelledTours = allTours.filter((t) => t.status === 'cancelled');
      const noShowTours = allTours.filter((t) => t.status === 'no_show');

      // Get reviews
      const allReviews = await this.reviewRepository.findByProviderId(
        providerId,
        ['published']
      );
      const avgRating =
        allReviews.length > 0
          ? allReviews.reduce((sum, r) => sum + r.overallRating, 0) /
            allReviews.length
          : null;
      const recommendCount = allReviews.filter((r) => r.wouldRecommend).length;
      const recommendationRate =
        allReviews.length > 0 ? (recommendCount / allReviews.length) * 100 : null;

      return success({
        enquiries: {
          total: allEnquiries.length,
          new: newEnquiries.length,
          converted: convertedEnquiries.length,
          avgResponseTimeMinutes: avgResponseTime
            ? Math.round(avgResponseTime)
            : null,
        },
        tours: {
          total: allTours.length,
          completed: completedTours.length,
          cancelled: cancelledTours.length,
          noShow: noShowTours.length,
        },
        reviews: {
          total: allReviews.length,
          averageRating: avgRating ? Math.round(avgRating * 10) / 10 : null,
          recommendationRate: recommendationRate
            ? Math.round(recommendationRate)
            : null,
        },
      });
    } catch (error) {
      log.error('Failed to get engagement metrics', error as Error, {
        providerId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async updateAggregateRating(providerId: string): Promise<void> {
    const aggregateData =
      await this.reviewRepository.getAggregateRating(providerId);
    if (!aggregateData || !this.qualityRepository) return;

    const reviews = await this.reviewRepository.findByProviderId(providerId, [
      'published',
    ]);
    const recommendCount = reviews.filter((r) => r.wouldRecommend).length;
    const recommendationRate =
      reviews.length > 0 ? (recommendCount / reviews.length) * 100 : 0;

    const aggregateRating: HostingAggregateRating = {
      average: Math.round(aggregateData.average * 10) / 10,
      count: aggregateData.count,
      distribution: {
        star1: aggregateData.distribution['star1'] ?? 0,
        star2: aggregateData.distribution['star2'] ?? 0,
        star3: aggregateData.distribution['star3'] ?? 0,
        star4: aggregateData.distribution['star4'] ?? 0,
        star5: aggregateData.distribution['star5'] ?? 0,
      },
      recommendationRate,
      responseRate: null, // Would calculate from provider responses
    };

    await this.qualityRepository.update(providerId, { aggregateRating });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let serviceInstance: HostingEngagementService | null = null;

export function initializeHostingEngagementService(
  enquiryRepository: HostingEnquiryRepository,
  tourRepository: HostingTourBookingRepository,
  reviewRepository: HostingReviewRepository,
  qualityRepository?: {
    update(
      providerId: string,
      updates: { aggregateRating: HostingAggregateRating }
    ): Promise<void>;
  }
): HostingEngagementService {
  serviceInstance = new HostingEngagementService(
    enquiryRepository,
    tourRepository,
    reviewRepository,
    qualityRepository
  );
  return serviceInstance;
}

export function getHostingEngagementService(): HostingEngagementService {
  if (!serviceInstance) {
    throw new Error('HostingEngagementService not initialized');
  }
  return serviceInstance;
}
