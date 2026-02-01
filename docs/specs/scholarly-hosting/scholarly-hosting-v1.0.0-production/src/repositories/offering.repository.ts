/**
 * Educational Offering Repository - PostgreSQL Implementation
 * 
 * Production-ready repository for managing educational offerings.
 * 
 * @module ScholarlyHosting/Repositories
 * @version 1.0.0
 */

import { Pool } from 'pg';
import {
  EducationalOffering,
  OfferingType,
  OfferingStatus,
  DeliveryMode,
  YearLevel,
  NotFoundError
} from '../types';
import { getPool, generateId, logger } from '../infrastructure';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface OfferingRepository {
  findById(offeringId: string): Promise<EducationalOffering | null>;
  findByProviderId(providerId: string, status?: OfferingStatus[]): Promise<EducationalOffering[]>;
  search(filters: OfferingFilters): Promise<{ offerings: EducationalOffering[]; total: number }>;
  create(offering: Omit<EducationalOffering, 'id' | 'createdAt' | 'updatedAt'>): Promise<EducationalOffering>;
  update(offeringId: string, updates: Partial<EducationalOffering>): Promise<EducationalOffering>;
  delete(offeringId: string): Promise<void>;
  publish(offeringId: string): Promise<EducationalOffering>;
  archive(offeringId: string): Promise<EducationalOffering>;
}

export interface OfferingFilters {
  query?: string;
  providerId?: string;
  types?: OfferingType[];
  yearLevels?: YearLevel[];
  subjectAreas?: string[];
  deliveryModes?: DeliveryMode[];
  priceMax?: number;
  availability?: 'available' | 'waitlist' | 'any';
  status?: OfferingStatus[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// POSTGRESQL IMPLEMENTATION
// ============================================================================

export class PostgresOfferingRepository implements OfferingRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  async findById(offeringId: string): Promise<EducationalOffering | null> {
    const result = await this.pool.query(
      `SELECT * FROM educational_offerings WHERE id = $1`,
      [offeringId]
    );

    if (result.rows.length === 0) return null;
    return this.mapRowToOffering(result.rows[0]);
  }

  async findByProviderId(providerId: string, status?: OfferingStatus[]): Promise<EducationalOffering[]> {
    let query = `SELECT * FROM educational_offerings WHERE provider_id = $1`;
    const params: any[] = [providerId];

    if (status && status.length > 0) {
      query += ` AND status = ANY($2)`;
      params.push(status);
    }

    query += ` ORDER BY name ASC`;

    const result = await this.pool.query(query, params);
    return result.rows.map(row => this.mapRowToOffering(row));
  }

  async search(filters: OfferingFilters): Promise<{ offerings: EducationalOffering[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];
    let paramIndex = 1;

    // Default to published only
    if (!filters.status || filters.status.length === 0) {
      conditions.push(`status = 'published'`);
    } else {
      conditions.push(`status = ANY($${paramIndex++})`);
      params.push(filters.status);
    }

    if (filters.providerId) {
      conditions.push(`provider_id = $${paramIndex++}`);
      params.push(filters.providerId);
    }

    if (filters.query) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR short_description ILIKE $${paramIndex})`);
      params.push(`%${filters.query}%`);
      paramIndex++;
    }

    if (filters.types && filters.types.length > 0) {
      conditions.push(`type = ANY($${paramIndex++})`);
      params.push(filters.types);
    }

    if (filters.yearLevels && filters.yearLevels.length > 0) {
      conditions.push(`year_levels && $${paramIndex++}`);
      params.push(filters.yearLevels);
    }

    if (filters.subjectAreas && filters.subjectAreas.length > 0) {
      conditions.push(`subject_areas && $${paramIndex++}`);
      params.push(filters.subjectAreas);
    }

    if (filters.deliveryModes && filters.deliveryModes.length > 0) {
      conditions.push(`delivery_modes && $${paramIndex++}`);
      params.push(filters.deliveryModes);
    }

    if (filters.priceMax !== undefined) {
      conditions.push(`(pricing->>'amount')::numeric <= $${paramIndex++}`);
      params.push(filters.priceMax);
    }

    if (filters.availability && filters.availability !== 'any') {
      if (filters.availability === 'available') {
        conditions.push(`availability->>'status' IN ('available', 'limited')`);
      } else if (filters.availability === 'waitlist') {
        conditions.push(`availability->>'status' = 'waitlist'`);
      }
    }

    const whereClause = conditions.join(' AND ');

    // Count query
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM educational_offerings WHERE ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total, 10);

    // Data query
    const limit = filters.limit ?? 20;
    const offset = filters.offset ?? 0;

    const dataResult = await this.pool.query(
      `SELECT * FROM educational_offerings 
       WHERE ${whereClause}
       ORDER BY (quality_signals->>'providerQualityScore')::numeric DESC NULLS LAST, name ASC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return {
      offerings: dataResult.rows.map(row => this.mapRowToOffering(row)),
      total
    };
  }

  async create(offering: Omit<EducationalOffering, 'id' | 'createdAt' | 'updatedAt'>): Promise<EducationalOffering> {
    const offeringId = generateId();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO educational_offerings (
        id, provider_id, type, name, description, short_description,
        subject_areas, year_levels, cefr_levels, curriculum_alignment,
        learning_outcomes, prerequisites, delivery_modes, duration, schedule,
        availability, pricing, quality_signals, natural_language_summary,
        parent_friendly_summary, agent_context, images, videos, virtual_tour_url,
        categories, tags, status, published_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )`,
      [
        offeringId,
        offering.providerId,
        offering.type,
        offering.name,
        offering.description,
        offering.shortDescription,
        offering.subjectAreas,
        offering.yearLevels,
        offering.cefrLevels ?? [],
        JSON.stringify(offering.curriculumAlignment),
        offering.learningOutcomes,
        offering.prerequisites,
        offering.deliveryModes,
        JSON.stringify(offering.duration),
        offering.schedule ? JSON.stringify(offering.schedule) : null,
        JSON.stringify(offering.availability),
        JSON.stringify(offering.pricing),
        JSON.stringify(offering.qualitySignals),
        offering.naturalLanguageSummary,
        offering.parentFriendlySummary,
        offering.agentContext,
        JSON.stringify(offering.images),
        JSON.stringify(offering.videos),
        offering.virtualTourUrl,
        offering.categories,
        offering.tags,
        offering.status,
        offering.publishedAt,
        now,
        now
      ]
    );

    logger.info({ offeringId, providerId: offering.providerId, type: offering.type }, 'Offering created');

    const created = await this.findById(offeringId);
    if (!created) throw new Error('Failed to create offering');
    return created;
  }

  async update(offeringId: string, updates: Partial<EducationalOffering>): Promise<EducationalOffering> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [offeringId];
    let paramIndex = 2;

    const directFields: Record<string, string> = {
      name: 'name',
      description: 'description',
      shortDescription: 'short_description',
      naturalLanguageSummary: 'natural_language_summary',
      parentFriendlySummary: 'parent_friendly_summary',
      agentContext: 'agent_context',
      virtualTourUrl: 'virtual_tour_url',
      status: 'status',
      publishedAt: 'published_at'
    };

    const arrayFields = ['subjectAreas', 'yearLevels', 'cefrLevels', 'learningOutcomes', 'prerequisites', 'deliveryModes', 'categories', 'tags'];
    const jsonFields = ['curriculumAlignment', 'duration', 'schedule', 'availability', 'pricing', 'qualitySignals', 'images', 'videos'];

    for (const [key, value] of Object.entries(updates)) {
      if (key in directFields && value !== undefined) {
        setClauses.push(`${directFields[key]} = $${paramIndex++}`);
        params.push(value);
      } else if (arrayFields.includes(key) && value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClauses.push(`${dbField} = $${paramIndex++}`);
        params.push(value);
      } else if (jsonFields.includes(key) && value !== undefined) {
        const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        setClauses.push(`${dbField} = $${paramIndex++}`);
        params.push(JSON.stringify(value));
      }
    }

    const result = await this.pool.query(
      `UPDATE educational_offerings SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Offering', offeringId);
    }

    logger.info({ offeringId, fields: Object.keys(updates) }, 'Offering updated');
    return this.mapRowToOffering(result.rows[0]);
  }

  async delete(offeringId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM educational_offerings WHERE id = $1`,
      [offeringId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Offering', offeringId);
    }

    logger.info({ offeringId }, 'Offering deleted');
  }

  async publish(offeringId: string): Promise<EducationalOffering> {
    return this.update(offeringId, {
      status: 'published',
      publishedAt: new Date()
    });
  }

  async archive(offeringId: string): Promise<EducationalOffering> {
    return this.update(offeringId, {
      status: 'archived'
    });
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private mapRowToOffering(row: any): EducationalOffering {
    return {
      id: row.id,
      providerId: row.provider_id,
      type: row.type as OfferingType,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
      subjectAreas: row.subject_areas,
      yearLevels: row.year_levels as YearLevel[],
      cefrLevels: row.cefr_levels,
      curriculumAlignment: row.curriculum_alignment,
      learningOutcomes: row.learning_outcomes,
      prerequisites: row.prerequisites,
      deliveryModes: row.delivery_modes as DeliveryMode[],
      duration: row.duration,
      schedule: row.schedule,
      availability: row.availability,
      pricing: row.pricing,
      qualitySignals: row.quality_signals,
      naturalLanguageSummary: row.natural_language_summary,
      parentFriendlySummary: row.parent_friendly_summary,
      agentContext: row.agent_context,
      images: row.images,
      videos: row.videos,
      virtualTourUrl: row.virtual_tour_url,
      categories: row.categories,
      tags: row.tags,
      status: row.status as OfferingStatus,
      publishedAt: row.published_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
