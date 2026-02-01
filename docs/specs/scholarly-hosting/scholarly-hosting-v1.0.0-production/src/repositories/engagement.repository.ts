/**
 * Enquiry & Review Repository - PostgreSQL Implementation
 * 
 * Production-ready repository for managing enquiries, reviews, and tour bookings.
 * 
 * @module ScholarlyHosting/Repositories
 * @version 1.0.0
 */

import { Pool } from 'pg';
import {
  Enquiry,
  TourBooking,
  ProviderReview,
  NotFoundError
} from '../types';
import { getPool, generateId, logger } from '../infrastructure';

// ============================================================================
// ENQUIRY REPOSITORY
// ============================================================================

export interface EnquiryRepository {
  findById(enquiryId: string): Promise<Enquiry | null>;
  findByProviderId(providerId: string, status?: string[]): Promise<Enquiry[]>;
  create(enquiry: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt'>): Promise<Enquiry>;
  update(enquiryId: string, updates: Partial<Enquiry>): Promise<Enquiry>;
  delete(enquiryId: string): Promise<void>;
}

export class PostgresEnquiryRepository implements EnquiryRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  async findById(enquiryId: string): Promise<Enquiry | null> {
    const result = await this.pool.query(
      `SELECT * FROM enquiries WHERE id = $1`,
      [enquiryId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToEnquiry(result.rows[0]);
  }

  async findByProviderId(providerId: string, status?: string[]): Promise<Enquiry[]> {
    let query = `SELECT * FROM enquiries WHERE provider_id = $1`;
    const params: any[] = [providerId];

    if (status && status.length > 0) {
      query += ` AND status = ANY($2)`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToEnquiry(row));
  }

  async create(enquiry: Omit<Enquiry, 'id' | 'createdAt' | 'updatedAt'>): Promise<Enquiry> {
    const enquiryId = generateId();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO enquiries (
        id, provider_id, offering_id, contact_name, contact_email, contact_phone,
        preferred_contact, student_name, student_age, student_year_level,
        enquiry_type, message, source, agent_id, status, responded_at,
        response_time, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
      [
        enquiryId,
        enquiry.providerId,
        enquiry.offeringId,
        enquiry.contactName,
        enquiry.contactEmail,
        enquiry.contactPhone,
        enquiry.preferredContact,
        enquiry.studentName,
        enquiry.studentAge,
        enquiry.studentYearLevel,
        enquiry.enquiryType,
        enquiry.message,
        enquiry.source,
        enquiry.agentId,
        enquiry.status,
        enquiry.respondedAt,
        enquiry.responseTime,
        now,
        now
      ]
    );

    logger.info({ enquiryId, providerId: enquiry.providerId }, 'Enquiry created');
    return { id: enquiryId, ...enquiry, createdAt: now, updatedAt: now };
  }

  async update(enquiryId: string, updates: Partial<Enquiry>): Promise<Enquiry> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [enquiryId];
    let paramIndex = 2;

    const fieldMappings: Record<string, string> = {
      status: 'status',
      respondedAt: 'responded_at',
      responseTime: 'response_time'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key in fieldMappings && value !== undefined) {
        setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
        params.push(value);
      }
    }

    const result = await this.pool.query(
      `UPDATE enquiries SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Enquiry', enquiryId);
    }

    return this.mapRowToEnquiry(result.rows[0]);
  }

  async delete(enquiryId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM enquiries WHERE id = $1`,
      [enquiryId]
    );
    if (result.rowCount === 0) {
      throw new NotFoundError('Enquiry', enquiryId);
    }
  }

  private mapRowToEnquiry(row: any): Enquiry {
    return {
      id: row.id,
      providerId: row.provider_id,
      offeringId: row.offering_id,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      preferredContact: row.preferred_contact,
      studentName: row.student_name,
      studentAge: row.student_age,
      studentYearLevel: row.student_year_level,
      enquiryType: row.enquiry_type,
      message: row.message,
      source: row.source,
      agentId: row.agent_id,
      status: row.status,
      respondedAt: row.responded_at,
      responseTime: row.response_time,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// ============================================================================
// TOUR BOOKING REPOSITORY
// ============================================================================

export interface TourBookingRepository {
  findById(bookingId: string): Promise<TourBooking | null>;
  findByProviderId(providerId: string, status?: string[]): Promise<TourBooking[]>;
  findUpcoming(providerId: string): Promise<TourBooking[]>;
  create(booking: Omit<TourBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<TourBooking>;
  update(bookingId: string, updates: Partial<TourBooking>): Promise<TourBooking>;
  delete(bookingId: string): Promise<void>;
}

export class PostgresTourBookingRepository implements TourBookingRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  async findById(bookingId: string): Promise<TourBooking | null> {
    const result = await this.pool.query(
      `SELECT * FROM tour_bookings WHERE id = $1`,
      [bookingId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToBooking(result.rows[0]);
  }

  async findByProviderId(providerId: string, status?: string[]): Promise<TourBooking[]> {
    let query = `SELECT * FROM tour_bookings WHERE provider_id = $1`;
    const params: any[] = [providerId];

    if (status && status.length > 0) {
      query += ` AND status = ANY($2)`;
      params.push(status);
    }

    query += ` ORDER BY scheduled_at ASC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToBooking(row));
  }

  async findUpcoming(providerId: string): Promise<TourBooking[]> {
    const result = await this.pool.query(
      `SELECT * FROM tour_bookings 
       WHERE provider_id = $1 AND scheduled_at >= NOW() AND status IN ('pending', 'confirmed')
       ORDER BY scheduled_at ASC`,
      [providerId]
    );
    return result.rows.map(row => this.mapRowToBooking(row));
  }

  async create(booking: Omit<TourBooking, 'id' | 'createdAt' | 'updatedAt'>): Promise<TourBooking> {
    const bookingId = generateId();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO tour_bookings (
        id, provider_id, location_id, contact_name, contact_email, contact_phone,
        scheduled_at, duration, tour_type, attendee_count, student_names,
        status, confirmed_at, special_requests, provider_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        bookingId,
        booking.providerId,
        booking.locationId,
        booking.contactName,
        booking.contactEmail,
        booking.contactPhone,
        booking.scheduledAt,
        booking.duration,
        booking.tourType,
        booking.attendeeCount,
        booking.studentNames,
        booking.status,
        booking.confirmedAt,
        booking.specialRequests,
        booking.providerNotes,
        now,
        now
      ]
    );

    logger.info({ bookingId, providerId: booking.providerId }, 'Tour booking created');
    return { id: bookingId, ...booking, createdAt: now, updatedAt: now };
  }

  async update(bookingId: string, updates: Partial<TourBooking>): Promise<TourBooking> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [bookingId];
    let paramIndex = 2;

    const fieldMappings: Record<string, string> = {
      status: 'status',
      confirmedAt: 'confirmed_at',
      scheduledAt: 'scheduled_at',
      providerNotes: 'provider_notes'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key in fieldMappings && value !== undefined) {
        setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
        params.push(value);
      }
    }

    const result = await this.pool.query(
      `UPDATE tour_bookings SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('TourBooking', bookingId);
    }

    return this.mapRowToBooking(result.rows[0]);
  }

  async delete(bookingId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM tour_bookings WHERE id = $1`,
      [bookingId]
    );
    if (result.rowCount === 0) {
      throw new NotFoundError('TourBooking', bookingId);
    }
  }

  private mapRowToBooking(row: any): TourBooking {
    return {
      id: row.id,
      providerId: row.provider_id,
      locationId: row.location_id,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      contactPhone: row.contact_phone,
      scheduledAt: row.scheduled_at,
      duration: row.duration,
      tourType: row.tour_type,
      attendeeCount: row.attendee_count,
      studentNames: row.student_names,
      status: row.status,
      confirmedAt: row.confirmed_at,
      specialRequests: row.special_requests,
      providerNotes: row.provider_notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// ============================================================================
// REVIEW REPOSITORY
// ============================================================================

export interface ReviewRepository {
  findById(reviewId: string): Promise<ProviderReview | null>;
  findByProviderId(providerId: string, status?: string[]): Promise<ProviderReview[]>;
  getAggregateRating(providerId: string): Promise<{ average: number; count: number; distribution: Record<string, number> } | null>;
  create(review: Omit<ProviderReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderReview>;
  update(reviewId: string, updates: Partial<ProviderReview>): Promise<ProviderReview>;
  delete(reviewId: string): Promise<void>;
}

export class PostgresReviewRepository implements ReviewRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  async findById(reviewId: string): Promise<ProviderReview | null> {
    const result = await this.pool.query(
      `SELECT * FROM provider_reviews WHERE id = $1`,
      [reviewId]
    );
    if (result.rows.length === 0) return null;
    return this.mapRowToReview(result.rows[0]);
  }

  async findByProviderId(providerId: string, status?: string[]): Promise<ProviderReview[]> {
    let query = `SELECT * FROM provider_reviews WHERE provider_id = $1`;
    const params: any[] = [providerId];

    if (status && status.length > 0) {
      query += ` AND status = ANY($2)`;
      params.push(status);
    } else {
      query += ` AND status = 'published'`;
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToReview(row));
  }

  async getAggregateRating(providerId: string): Promise<{ average: number; count: number; distribution: Record<string, number> } | null> {
    const result = await this.pool.query(
      `SELECT 
        AVG(overall_rating) as average,
        COUNT(*) as count,
        COUNT(*) FILTER (WHERE overall_rating = 1) as star1,
        COUNT(*) FILTER (WHERE overall_rating = 2) as star2,
        COUNT(*) FILTER (WHERE overall_rating = 3) as star3,
        COUNT(*) FILTER (WHERE overall_rating = 4) as star4,
        COUNT(*) FILTER (WHERE overall_rating = 5) as star5
       FROM provider_reviews 
       WHERE provider_id = $1 AND status = 'published'`,
      [providerId]
    );

    const row = result.rows[0];
    if (!row || parseInt(row.count) === 0) return null;

    return {
      average: parseFloat(row.average),
      count: parseInt(row.count),
      distribution: {
        star1: parseInt(row.star1),
        star2: parseInt(row.star2),
        star3: parseInt(row.star3),
        star4: parseInt(row.star4),
        star5: parseInt(row.star5)
      }
    };
  }

  async create(review: Omit<ProviderReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderReview> {
    const reviewId = generateId();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO provider_reviews (
        id, provider_id, author_type, author_name, is_verified,
        overall_rating, category_ratings, title, content, would_recommend,
        helpful_count, provider_response, provider_responded_at,
        status, moderated_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        reviewId,
        review.providerId,
        review.authorType,
        review.authorName,
        review.isVerified,
        review.overallRating,
        JSON.stringify(review.categoryRatings),
        review.title,
        review.content,
        review.wouldRecommend,
        review.helpfulCount,
        review.providerResponse,
        review.providerRespondedAt,
        review.status,
        review.moderatedAt,
        now,
        now
      ]
    );

    logger.info({ reviewId, providerId: review.providerId }, 'Review created');
    return { id: reviewId, ...review, createdAt: now, updatedAt: now };
  }

  async update(reviewId: string, updates: Partial<ProviderReview>): Promise<ProviderReview> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [reviewId];
    let paramIndex = 2;

    const fieldMappings: Record<string, string> = {
      status: 'status',
      moderatedAt: 'moderated_at',
      helpfulCount: 'helpful_count',
      providerResponse: 'provider_response',
      providerRespondedAt: 'provider_responded_at'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key in fieldMappings && value !== undefined) {
        setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
        params.push(value);
      }
    }

    const result = await this.pool.query(
      `UPDATE provider_reviews SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Review', reviewId);
    }

    return this.mapRowToReview(result.rows[0]);
  }

  async delete(reviewId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM provider_reviews WHERE id = $1`,
      [reviewId]
    );
    if (result.rowCount === 0) {
      throw new NotFoundError('Review', reviewId);
    }
  }

  private mapRowToReview(row: any): ProviderReview {
    return {
      id: row.id,
      providerId: row.provider_id,
      authorType: row.author_type,
      authorName: row.author_name,
      isVerified: row.is_verified,
      overallRating: row.overall_rating,
      categoryRatings: row.category_ratings,
      title: row.title,
      content: row.content,
      wouldRecommend: row.would_recommend,
      helpfulCount: row.helpful_count,
      providerResponse: row.provider_response,
      providerRespondedAt: row.provider_responded_at,
      status: row.status,
      moderatedAt: row.moderated_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
