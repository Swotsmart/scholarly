/**
 * Quality Profile Repository - PostgreSQL Implementation
 * 
 * Production-ready repository for managing educational quality profiles.
 * 
 * @module ScholarlyHosting/Repositories
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import {
  EducationalQualityProfile,
  QualityScoreBreakdown,
  VerifiedOutcome,
  Accreditation,
  StaffQualificationSummary,
  ComplianceRecord,
  VerificationLevel,
  RegistrationStatus,
  RegistrationDetails,
  AggregateRating,
  NotFoundError
} from '../types';
import { getPool, generateId, logger } from '../infrastructure';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface QualityProfileRepository {
  findByProviderId(providerId: string): Promise<EducationalQualityProfile | null>;
  update(providerId: string, updates: Partial<EducationalQualityProfile>): Promise<EducationalQualityProfile>;
  addOutcome(providerId: string, outcome: Omit<VerifiedOutcome, 'id'>): Promise<VerifiedOutcome>;
  updateOutcome(providerId: string, outcomeId: string, updates: Partial<VerifiedOutcome>): Promise<VerifiedOutcome>;
  deleteOutcome(providerId: string, outcomeId: string): Promise<void>;
  addAccreditation(providerId: string, accreditation: Omit<Accreditation, 'id'>): Promise<Accreditation>;
  updateAccreditation(providerId: string, accreditationId: string, updates: Partial<Accreditation>): Promise<Accreditation>;
  deleteAccreditation(providerId: string, accreditationId: string): Promise<void>;
  addComplianceRecord(providerId: string, record: Omit<ComplianceRecord, 'id'>): Promise<ComplianceRecord>;
  updateComplianceRecord(providerId: string, recordId: string, updates: Partial<ComplianceRecord>): Promise<ComplianceRecord>;
  deleteComplianceRecord(providerId: string, recordId: string): Promise<void>;
}

// ============================================================================
// POSTGRESQL IMPLEMENTATION
// ============================================================================

export class PostgresQualityProfileRepository implements QualityProfileRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  async findByProviderId(providerId: string): Promise<EducationalQualityProfile | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM quality_profiles WHERE provider_id = $1`,
        [providerId]
      );

      if (result.rows.length === 0) return null;

      const row = result.rows[0];
      return this.loadFullProfile(client, row);
    } finally {
      client.release();
    }
  }

  async update(providerId: string, updates: Partial<EducationalQualityProfile>): Promise<EducationalQualityProfile> {
    const client = await this.pool.connect();
    try {
      // First find the profile
      const profileResult = await client.query(
        `SELECT id FROM quality_profiles WHERE provider_id = $1`,
        [providerId]
      );

      if (profileResult.rows.length === 0) {
        throw new NotFoundError('QualityProfile', providerId);
      }

      const profileId = profileResult.rows[0].id;

      const setClauses: string[] = ['updated_at = NOW()'];
      const params: any[] = [profileId];
      let paramIndex = 2;

      const directFields: Record<string, string> = {
        overallScore: 'overall_score',
        registrationStatus: 'registration_status',
        verificationLevel: 'verification_level',
        complianceStatus: 'compliance_status',
        confidenceLevel: 'confidence_level',
        dataCompleteness: 'data_completeness',
        lastVerificationDate: 'last_verification_date',
        nextVerificationDue: 'next_verification_due'
      };

      const jsonFields = ['scoreBreakdown', 'registrationDetails', 'aggregateRating', 'staffQualifications'];

      for (const [key, value] of Object.entries(updates)) {
        if (key in directFields && value !== undefined) {
          setClauses.push(`${directFields[key]} = $${paramIndex++}`);
          params.push(value);
        } else if (jsonFields.includes(key) && value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${dbField} = $${paramIndex++}`);
          params.push(value ? JSON.stringify(value) : null);
        }
      }

      await client.query(
        `UPDATE quality_profiles SET ${setClauses.join(', ')} WHERE id = $1`,
        params
      );

      const updated = await this.findByProviderId(providerId);
      if (!updated) throw new Error('Failed to load updated profile');

      logger.info({ providerId, fields: Object.keys(updates) }, 'Quality profile updated');
      return updated;
    } finally {
      client.release();
    }
  }

  async addOutcome(providerId: string, outcome: Omit<VerifiedOutcome, 'id'>): Promise<VerifiedOutcome> {
    const client = await this.pool.connect();
    try {
      const profileResult = await client.query(
        `SELECT id FROM quality_profiles WHERE provider_id = $1`,
        [providerId]
      );

      if (profileResult.rows.length === 0) {
        throw new NotFoundError('QualityProfile', providerId);
      }

      const profileId = profileResult.rows[0].id;
      const outcomeId = generateId();

      await client.query(
        `INSERT INTO verified_outcomes (
          id, quality_profile_id, type, metric, value, unit, comparison_basis,
          comparison_value, percentile, year, cohort_size, verified_at, verified_by,
          data_source, confidence_level, valid_from, valid_until, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
        [
          outcomeId,
          profileId,
          outcome.type,
          outcome.metric,
          outcome.value,
          outcome.unit,
          outcome.comparisonBasis,
          outcome.comparisonValue,
          outcome.percentile,
          outcome.year,
          outcome.cohortSize,
          outcome.verifiedAt,
          outcome.verifiedBy,
          outcome.dataSource,
          outcome.confidenceLevel,
          outcome.validFrom,
          outcome.validUntil
        ]
      );

      logger.info({ providerId, outcomeId, type: outcome.type }, 'Outcome added');
      return { id: outcomeId, ...outcome };
    } finally {
      client.release();
    }
  }

  async updateOutcome(providerId: string, outcomeId: string, updates: Partial<VerifiedOutcome>): Promise<VerifiedOutcome> {
    const client = await this.pool.connect();
    try {
      const profileResult = await client.query(
        `SELECT qp.id FROM quality_profiles qp
         JOIN verified_outcomes vo ON vo.quality_profile_id = qp.id
         WHERE qp.provider_id = $1 AND vo.id = $2`,
        [providerId, outcomeId]
      );

      if (profileResult.rows.length === 0) {
        throw new NotFoundError('Outcome', outcomeId);
      }

      const setClauses: string[] = [];
      const params: any[] = [outcomeId];
      let paramIndex = 2;

      const fieldMappings: Record<string, string> = {
        value: 'value',
        percentile: 'percentile',
        confidenceLevel: 'confidence_level',
        validUntil: 'valid_until'
      };

      for (const [key, value] of Object.entries(updates)) {
        if (key in fieldMappings && value !== undefined) {
          setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
          params.push(value);
        }
      }

      if (setClauses.length === 0) {
        const result = await client.query(`SELECT * FROM verified_outcomes WHERE id = $1`, [outcomeId]);
        return this.mapRowToOutcome(result.rows[0]);
      }

      const result = await client.query(
        `UPDATE verified_outcomes SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );

      return this.mapRowToOutcome(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteOutcome(providerId: string, outcomeId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM verified_outcomes vo
       USING quality_profiles qp
       WHERE vo.quality_profile_id = qp.id AND qp.provider_id = $1 AND vo.id = $2`,
      [providerId, outcomeId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Outcome', outcomeId);
    }
  }

  async addAccreditation(providerId: string, accreditation: Omit<Accreditation, 'id'>): Promise<Accreditation> {
    const client = await this.pool.connect();
    try {
      const profileResult = await client.query(
        `SELECT id FROM quality_profiles WHERE provider_id = $1`,
        [providerId]
      );

      if (profileResult.rows.length === 0) {
        throw new NotFoundError('QualityProfile', providerId);
      }

      const profileId = profileResult.rows[0].id;
      const accreditationId = generateId();

      await client.query(
        `INSERT INTO accreditations (
          id, quality_profile_id, body, type, level, issued_at, expires_at,
          verification_url, status, verified_by_scholarly, verified_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          accreditationId,
          profileId,
          accreditation.body,
          accreditation.type,
          accreditation.level,
          accreditation.issuedAt,
          accreditation.expiresAt,
          accreditation.verificationUrl,
          accreditation.status,
          accreditation.verifiedByScholarly,
          accreditation.verifiedAt
        ]
      );

      logger.info({ providerId, accreditationId, body: accreditation.body }, 'Accreditation added');
      return { id: accreditationId, ...accreditation };
    } finally {
      client.release();
    }
  }

  async updateAccreditation(providerId: string, accreditationId: string, updates: Partial<Accreditation>): Promise<Accreditation> {
    const client = await this.pool.connect();
    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: any[] = [accreditationId];
      let paramIndex = 2;

      const fieldMappings: Record<string, string> = {
        status: 'status',
        verifiedByScholarly: 'verified_by_scholarly',
        verifiedAt: 'verified_at',
        expiresAt: 'expires_at'
      };

      for (const [key, value] of Object.entries(updates)) {
        if (key in fieldMappings && value !== undefined) {
          setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
          params.push(value);
        }
      }

      const result = await client.query(
        `UPDATE accreditations SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Accreditation', accreditationId);
      }

      return this.mapRowToAccreditation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  async deleteAccreditation(providerId: string, accreditationId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM accreditations a
       USING quality_profiles qp
       WHERE a.quality_profile_id = qp.id AND qp.provider_id = $1 AND a.id = $2`,
      [providerId, accreditationId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Accreditation', accreditationId);
    }
  }

  async addComplianceRecord(providerId: string, record: Omit<ComplianceRecord, 'id'>): Promise<ComplianceRecord> {
    const client = await this.pool.connect();
    try {
      const profileResult = await client.query(
        `SELECT id FROM quality_profiles WHERE provider_id = $1`,
        [providerId]
      );

      if (profileResult.rows.length === 0) {
        throw new NotFoundError('QualityProfile', providerId);
      }

      const profileId = profileResult.rows[0].id;
      const recordId = generateId();

      await client.query(
        `INSERT INTO compliance_records (
          id, quality_profile_id, type, status, issued_by, issued_at,
          expires_at, notes, document_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          recordId,
          profileId,
          record.type,
          record.status,
          record.issuedBy,
          record.issuedAt,
          record.expiresAt,
          record.notes,
          record.documentUrl
        ]
      );

      logger.info({ providerId, recordId, type: record.type }, 'Compliance record added');
      return { id: recordId, ...record };
    } finally {
      client.release();
    }
  }

  async updateComplianceRecord(providerId: string, recordId: string, updates: Partial<ComplianceRecord>): Promise<ComplianceRecord> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [recordId];
    let paramIndex = 2;

    const fieldMappings: Record<string, string> = {
      status: 'status',
      expiresAt: 'expires_at',
      notes: 'notes',
      documentUrl: 'document_url'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key in fieldMappings && value !== undefined) {
        setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
        params.push(value);
      }
    }

    const result = await this.pool.query(
      `UPDATE compliance_records SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('ComplianceRecord', recordId);
    }

    return this.mapRowToComplianceRecord(result.rows[0]);
  }

  async deleteComplianceRecord(providerId: string, recordId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM compliance_records cr
       USING quality_profiles qp
       WHERE cr.quality_profile_id = qp.id AND qp.provider_id = $1 AND cr.id = $2`,
      [providerId, recordId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('ComplianceRecord', recordId);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async loadFullProfile(client: PoolClient, row: any): Promise<EducationalQualityProfile> {
    const profileId = row.id;

    const [accreditations, outcomes, compliance] = await Promise.all([
      client.query(`SELECT * FROM accreditations WHERE quality_profile_id = $1 ORDER BY issued_at DESC`, [profileId]),
      client.query(`SELECT * FROM verified_outcomes WHERE quality_profile_id = $1 ORDER BY year DESC, verified_at DESC`, [profileId]),
      client.query(`SELECT * FROM compliance_records WHERE quality_profile_id = $1 ORDER BY issued_at DESC`, [profileId])
    ]);

    return {
      providerId: row.provider_id,
      overallScore: row.overall_score,
      scoreBreakdown: row.score_breakdown,
      registrationStatus: row.registration_status,
      registrationDetails: row.registration_details,
      accreditations: accreditations.rows.map(r => this.mapRowToAccreditation(r)),
      verifiedOutcomes: outcomes.rows.map(r => this.mapRowToOutcome(r)),
      aggregateRating: row.aggregate_rating,
      staffQualifications: row.staff_qualifications,
      complianceRecords: compliance.rows.map(r => this.mapRowToComplianceRecord(r)),
      complianceStatus: row.compliance_status,
      verificationLevel: row.verification_level,
      memberSince: row.member_since,
      lastVerificationDate: row.last_verification_date,
      nextVerificationDue: row.next_verification_due,
      confidenceLevel: row.confidence_level,
      dataCompleteness: row.data_completeness
    };
  }

  private mapRowToOutcome(row: any): VerifiedOutcome {
    return {
      id: row.id,
      type: row.type,
      metric: row.metric,
      value: parseFloat(row.value),
      unit: row.unit,
      comparisonBasis: row.comparison_basis,
      comparisonValue: row.comparison_value ? parseFloat(row.comparison_value) : null,
      percentile: row.percentile,
      year: row.year,
      cohortSize: row.cohort_size,
      verifiedAt: row.verified_at,
      verifiedBy: row.verified_by,
      dataSource: row.data_source,
      confidenceLevel: parseFloat(row.confidence_level),
      validFrom: row.valid_from,
      validUntil: row.valid_until
    };
  }

  private mapRowToAccreditation(row: any): Accreditation {
    return {
      id: row.id,
      body: row.body,
      type: row.type,
      level: row.level,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      verificationUrl: row.verification_url,
      status: row.status,
      verifiedByScholarly: row.verified_by_scholarly,
      verifiedAt: row.verified_at
    };
  }

  private mapRowToComplianceRecord(row: any): ComplianceRecord {
    return {
      id: row.id,
      type: row.type,
      status: row.status,
      issuedBy: row.issued_by,
      issuedAt: row.issued_at,
      expiresAt: row.expires_at,
      notes: row.notes,
      documentUrl: row.document_url
    };
  }
}
