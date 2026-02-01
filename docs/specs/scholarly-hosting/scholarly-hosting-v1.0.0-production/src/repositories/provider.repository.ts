/**
 * Educational Provider Repository - PostgreSQL Implementation
 * 
 * Production-ready repository for managing educational providers in PostgreSQL.
 * 
 * @module ScholarlyHosting/Repositories
 * @version 1.0.0
 */

import { Pool, PoolClient } from 'pg';
import {
  EducationalProvider,
  ProviderType,
  ProviderStatus,
  ProviderTheme,
  ProviderLocation,
  ProviderDomain,
  ProviderFeatures,
  EducationalSEOConfig,
  EducationalAgentConfig,
  EducationalQualityProfile,
  DomainType,
  DomainStatus,
  SSLStatus,
  VerificationLevel,
  ContactInfo,
  ServiceArea,
  LISIdentifiers,
  NotFoundError
} from '../types';
import { getPool, generateId, logger } from '../infrastructure';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface EducationalProviderRepository {
  findById(providerId: string): Promise<EducationalProvider | null>;
  findByTenantId(tenantId: string): Promise<EducationalProvider | null>;
  findByDomain(domain: string): Promise<EducationalProvider | null>;
  findAll(filters: ProviderFilters): Promise<{ providers: EducationalProvider[]; total: number }>;
  create(provider: Omit<EducationalProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<EducationalProvider>;
  update(providerId: string, updates: Partial<EducationalProvider>): Promise<EducationalProvider>;
  delete(providerId: string): Promise<void>;
  
  // Domain methods
  addDomain(providerId: string, domain: Omit<ProviderDomain, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderDomain>;
  updateDomain(providerId: string, domainId: string, updates: Partial<ProviderDomain>): Promise<ProviderDomain>;
  deleteDomain(providerId: string, domainId: string): Promise<void>;
  findDomainByName(domain: string): Promise<(ProviderDomain & { providerId: string }) | null>;
  
  // Location methods
  addLocation(providerId: string, location: Omit<ProviderLocation, 'id'>): Promise<ProviderLocation>;
  updateLocation(providerId: string, locationId: string, updates: Partial<ProviderLocation>): Promise<ProviderLocation>;
  deleteLocation(providerId: string, locationId: string): Promise<void>;
}

export interface ProviderFilters {
  types?: ProviderType[];
  status?: ProviderStatus[];
  verificationLevels?: VerificationLevel[];
  minQualityScore?: number;
  query?: string;
  location?: { latitude: number; longitude: number; radiusKm: number };
  limit?: number;
  offset?: number;
}

// ============================================================================
// POSTGRESQL IMPLEMENTATION
// ============================================================================

export class PostgresProviderRepository implements EducationalProviderRepository {
  private pool: Pool;

  constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  async findById(providerId: string): Promise<EducationalProvider | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM educational_providers WHERE id = $1`,
        [providerId]
      );

      if (result.rows.length === 0) return null;

      const provider = this.mapRowToProvider(result.rows[0]);
      
      // Load related data
      provider.locations = await this.loadLocations(client, providerId);
      provider.domains = await this.loadDomains(client, providerId);
      provider.qualityProfile = await this.loadQualityProfile(client, providerId);

      return provider;
    } finally {
      client.release();
    }
  }

  async findByTenantId(tenantId: string): Promise<EducationalProvider | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT * FROM educational_providers WHERE tenant_id = $1`,
        [tenantId]
      );

      if (result.rows.length === 0) return null;

      const provider = this.mapRowToProvider(result.rows[0]);
      provider.locations = await this.loadLocations(client, provider.id);
      provider.domains = await this.loadDomains(client, provider.id);
      provider.qualityProfile = await this.loadQualityProfile(client, provider.id);

      return provider;
    } finally {
      client.release();
    }
  }

  async findByDomain(domain: string): Promise<EducationalProvider | null> {
    const client = await this.pool.connect();
    try {
      const result = await client.query(
        `SELECT ep.* FROM educational_providers ep
         JOIN provider_domains pd ON ep.id = pd.provider_id
         WHERE pd.domain = $1 AND pd.status = 'verified'`,
        [domain.toLowerCase()]
      );

      if (result.rows.length === 0) return null;

      const provider = this.mapRowToProvider(result.rows[0]);
      provider.locations = await this.loadLocations(client, provider.id);
      provider.domains = await this.loadDomains(client, provider.id);
      provider.qualityProfile = await this.loadQualityProfile(client, provider.id);

      return provider;
    } finally {
      client.release();
    }
  }

  async findAll(filters: ProviderFilters): Promise<{ providers: EducationalProvider[]; total: number }> {
    const client = await this.pool.connect();
    try {
      const conditions: string[] = ['1=1'];
      const params: any[] = [];
      let paramIndex = 1;

      if (filters.types && filters.types.length > 0) {
        conditions.push(`ep.type = ANY($${paramIndex++})`);
        params.push(filters.types);
      }

      if (filters.status && filters.status.length > 0) {
        conditions.push(`ep.status = ANY($${paramIndex++})`);
        params.push(filters.status);
      }

      if (filters.verificationLevels && filters.verificationLevels.length > 0) {
        conditions.push(`qp.verification_level = ANY($${paramIndex++})`);
        params.push(filters.verificationLevels);
      }

      if (filters.minQualityScore !== undefined) {
        conditions.push(`qp.overall_score >= $${paramIndex++}`);
        params.push(filters.minQualityScore);
      }

      if (filters.query) {
        conditions.push(`(ep.display_name ILIKE $${paramIndex} OR ep.description ILIKE $${paramIndex})`);
        params.push(`%${filters.query}%`);
        paramIndex++;
      }

      if (filters.location) {
        // Haversine distance calculation in SQL
        conditions.push(`
          (6371 * acos(
            cos(radians($${paramIndex})) * cos(radians(pl.latitude)) *
            cos(radians(pl.longitude) - radians($${paramIndex + 1})) +
            sin(radians($${paramIndex})) * sin(radians(pl.latitude))
          )) <= $${paramIndex + 2}
        `);
        params.push(filters.location.latitude, filters.location.longitude, filters.location.radiusKm);
        paramIndex += 3;
      }

      const whereClause = conditions.join(' AND ');

      // Count query
      const countResult = await client.query(
        `SELECT COUNT(DISTINCT ep.id) as total
         FROM educational_providers ep
         LEFT JOIN quality_profiles qp ON ep.id = qp.provider_id
         LEFT JOIN provider_locations pl ON ep.id = pl.provider_id AND pl.is_primary = true
         WHERE ${whereClause}`,
        params
      );

      const total = parseInt(countResult.rows[0].total, 10);

      // Data query with pagination
      const limit = filters.limit ?? 20;
      const offset = filters.offset ?? 0;

      const dataResult = await client.query(
        `SELECT DISTINCT ep.*
         FROM educational_providers ep
         LEFT JOIN quality_profiles qp ON ep.id = qp.provider_id
         LEFT JOIN provider_locations pl ON ep.id = pl.provider_id AND pl.is_primary = true
         WHERE ${whereClause}
         ORDER BY qp.overall_score DESC NULLS LAST, ep.display_name ASC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, limit, offset]
      );

      const providers: EducationalProvider[] = [];
      for (const row of dataResult.rows) {
        const provider = this.mapRowToProvider(row);
        provider.locations = await this.loadLocations(client, provider.id);
        provider.domains = await this.loadDomains(client, provider.id);
        provider.qualityProfile = await this.loadQualityProfile(client, provider.id);
        providers.push(provider);
      }

      return { providers, total };
    } finally {
      client.release();
    }
  }

  async create(provider: Omit<EducationalProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<EducationalProvider> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const providerId = generateId();
      const now = new Date();

      // Insert provider
      await client.query(
        `INSERT INTO educational_providers (
          id, tenant_id, type, display_name, legal_name, description, tagline,
          logo_url, favicon_url, theme, primary_domain, primary_contact,
          service_area, features, seo_config, agent_config, lis_identifiers,
          scholarly_tenant_id, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
        [
          providerId,
          provider.tenantId,
          provider.type,
          provider.displayName,
          provider.legalName,
          provider.description,
          provider.tagline,
          provider.logoUrl,
          provider.faviconUrl,
          JSON.stringify(provider.theme),
          provider.primaryDomain,
          JSON.stringify(provider.primaryContact),
          provider.serviceArea ? JSON.stringify(provider.serviceArea) : null,
          JSON.stringify(provider.features),
          JSON.stringify(provider.seoConfig),
          JSON.stringify(provider.agentConfig),
          provider.lisIdentifiers ? JSON.stringify(provider.lisIdentifiers) : null,
          provider.scholarlyTenantId,
          provider.status,
          now,
          now
        ]
      );

      // Insert locations
      for (const location of provider.locations) {
        await this.insertLocation(client, providerId, location);
      }

      // Insert domains
      for (const domain of provider.domains) {
        await this.insertDomain(client, providerId, domain);
      }

      // Insert quality profile
      await this.insertQualityProfile(client, providerId, provider.qualityProfile);

      await client.query('COMMIT');

      const created = await this.findById(providerId);
      if (!created) throw new Error('Failed to create provider');

      logger.info({ providerId }, 'Provider created in database');
      return created;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error, tenantId: provider.tenantId }, 'Failed to create provider');
      throw error;
    } finally {
      client.release();
    }
  }

  async update(providerId: string, updates: Partial<EducationalProvider>): Promise<EducationalProvider> {
    const client = await this.pool.connect();
    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: any[] = [providerId];
      let paramIndex = 2;

      const fieldMappings: Record<string, string> = {
        displayName: 'display_name',
        legalName: 'legal_name',
        description: 'description',
        tagline: 'tagline',
        logoUrl: 'logo_url',
        faviconUrl: 'favicon_url',
        primaryDomain: 'primary_domain',
        status: 'status'
      };

      const jsonFields = ['theme', 'primaryContact', 'serviceArea', 'features', 'seoConfig', 'agentConfig', 'lisIdentifiers'];

      for (const [key, value] of Object.entries(updates)) {
        if (key in fieldMappings && value !== undefined) {
          setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
          params.push(value);
        } else if (jsonFields.includes(key) && value !== undefined) {
          const dbField = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          setClauses.push(`${dbField} = $${paramIndex++}`);
          params.push(JSON.stringify(value));
        }
      }

      if (setClauses.length === 1) {
        // Only updated_at, no actual changes
        const existing = await this.findById(providerId);
        if (!existing) throw new NotFoundError('Provider', providerId);
        return existing;
      }

      const result = await client.query(
        `UPDATE educational_providers SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Provider', providerId);
      }

      const updated = await this.findById(providerId);
      if (!updated) throw new Error('Failed to load updated provider');

      logger.info({ providerId, fields: Object.keys(updates) }, 'Provider updated');
      return updated;
    } finally {
      client.release();
    }
  }

  async delete(providerId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM educational_providers WHERE id = $1`,
      [providerId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Provider', providerId);
    }

    logger.info({ providerId }, 'Provider deleted');
  }

  // ===========================================================================
  // DOMAIN METHODS
  // ===========================================================================

  async addDomain(providerId: string, domain: Omit<ProviderDomain, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderDomain> {
    const domainId = generateId();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO provider_domains (
        id, provider_id, domain, type, status, ssl_status,
        ssl_expires_at, verification_token, verified_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        domainId,
        providerId,
        domain.domain.toLowerCase(),
        domain.type,
        domain.status,
        domain.sslStatus,
        domain.sslExpiresAt,
        domain.verificationToken,
        domain.verifiedAt,
        now,
        now
      ]
    );

    return {
      id: domainId,
      providerId,
      ...domain,
      domain: domain.domain.toLowerCase(),
      createdAt: now,
      updatedAt: now
    };
  }

  async updateDomain(providerId: string, domainId: string, updates: Partial<ProviderDomain>): Promise<ProviderDomain> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [providerId, domainId];
    let paramIndex = 3;

    const fieldMappings: Record<string, string> = {
      status: 'status',
      sslStatus: 'ssl_status',
      sslExpiresAt: 'ssl_expires_at',
      verifiedAt: 'verified_at'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (key in fieldMappings && value !== undefined) {
        setClauses.push(`${fieldMappings[key]} = $${paramIndex++}`);
        params.push(value);
      }
    }

    const result = await this.pool.query(
      `UPDATE provider_domains SET ${setClauses.join(', ')}
       WHERE provider_id = $1 AND id = $2 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Domain', domainId);
    }

    return this.mapRowToDomain(result.rows[0]);
  }

  async deleteDomain(providerId: string, domainId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM provider_domains WHERE provider_id = $1 AND id = $2`,
      [providerId, domainId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Domain', domainId);
    }
  }

  async findDomainByName(domain: string): Promise<(ProviderDomain & { providerId: string }) | null> {
    const result = await this.pool.query(
      `SELECT * FROM provider_domains WHERE domain = $1`,
      [domain.toLowerCase()]
    );

    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
      ...this.mapRowToDomain(row),
      providerId: row.provider_id
    };
  }

  // ===========================================================================
  // LOCATION METHODS
  // ===========================================================================

  async addLocation(providerId: string, location: Omit<ProviderLocation, 'id'>): Promise<ProviderLocation> {
    const locationId = generateId();
    const now = new Date();

    await this.pool.query(
      `INSERT INTO provider_locations (
        id, provider_id, name, is_primary, street_address, address_locality,
        address_region, postal_code, address_country, latitude, longitude,
        phone, email, timezone, operating_hours, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        locationId,
        providerId,
        location.name,
        location.isPrimary,
        location.address.streetAddress,
        location.address.addressLocality,
        location.address.addressRegion,
        location.address.postalCode,
        location.address.addressCountry,
        location.coordinates?.latitude ?? null,
        location.coordinates?.longitude ?? null,
        location.phone,
        location.email,
        location.timezone,
        location.operatingHours ? JSON.stringify(location.operatingHours) : null,
        now,
        now
      ]
    );

    return { id: locationId, ...location };
  }

  async updateLocation(providerId: string, locationId: string, updates: Partial<ProviderLocation>): Promise<ProviderLocation> {
    const setClauses: string[] = ['updated_at = NOW()'];
    const params: any[] = [providerId, locationId];
    let paramIndex = 3;

    if (updates.name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      params.push(updates.name);
    }
    if (updates.isPrimary !== undefined) {
      setClauses.push(`is_primary = $${paramIndex++}`);
      params.push(updates.isPrimary);
    }
    if (updates.phone !== undefined) {
      setClauses.push(`phone = $${paramIndex++}`);
      params.push(updates.phone);
    }
    if (updates.email !== undefined) {
      setClauses.push(`email = $${paramIndex++}`);
      params.push(updates.email);
    }
    if (updates.address) {
      setClauses.push(`street_address = $${paramIndex++}`);
      params.push(updates.address.streetAddress);
      setClauses.push(`address_locality = $${paramIndex++}`);
      params.push(updates.address.addressLocality);
      setClauses.push(`address_region = $${paramIndex++}`);
      params.push(updates.address.addressRegion);
      setClauses.push(`postal_code = $${paramIndex++}`);
      params.push(updates.address.postalCode);
      setClauses.push(`address_country = $${paramIndex++}`);
      params.push(updates.address.addressCountry);
    }
    if (updates.coordinates !== undefined) {
      setClauses.push(`latitude = $${paramIndex++}`);
      params.push(updates.coordinates?.latitude ?? null);
      setClauses.push(`longitude = $${paramIndex++}`);
      params.push(updates.coordinates?.longitude ?? null);
    }

    const result = await this.pool.query(
      `UPDATE provider_locations SET ${setClauses.join(', ')}
       WHERE provider_id = $1 AND id = $2 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('Location', locationId);
    }

    return this.mapRowToLocation(result.rows[0]);
  }

  async deleteLocation(providerId: string, locationId: string): Promise<void> {
    const result = await this.pool.query(
      `DELETE FROM provider_locations WHERE provider_id = $1 AND id = $2`,
      [providerId, locationId]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('Location', locationId);
    }
  }

  // ===========================================================================
  // PRIVATE HELPERS
  // ===========================================================================

  private async loadLocations(client: PoolClient, providerId: string): Promise<ProviderLocation[]> {
    const result = await client.query(
      `SELECT * FROM provider_locations WHERE provider_id = $1 ORDER BY is_primary DESC, name ASC`,
      [providerId]
    );
    return result.rows.map(row => this.mapRowToLocation(row));
  }

  private async loadDomains(client: PoolClient, providerId: string): Promise<ProviderDomain[]> {
    const result = await client.query(
      `SELECT * FROM provider_domains WHERE provider_id = $1 ORDER BY created_at ASC`,
      [providerId]
    );
    return result.rows.map(row => this.mapRowToDomain(row));
  }

  private async loadQualityProfile(client: PoolClient, providerId: string): Promise<EducationalQualityProfile> {
    const result = await client.query(
      `SELECT * FROM quality_profiles WHERE provider_id = $1`,
      [providerId]
    );

    if (result.rows.length === 0) {
      // Return default profile
      return this.getDefaultQualityProfile(providerId);
    }

    const row = result.rows[0];

    // Load related data
    const accreditations = await client.query(
      `SELECT * FROM accreditations WHERE quality_profile_id = $1`,
      [row.id]
    );

    const outcomes = await client.query(
      `SELECT * FROM verified_outcomes WHERE quality_profile_id = $1`,
      [row.id]
    );

    const compliance = await client.query(
      `SELECT * FROM compliance_records WHERE quality_profile_id = $1`,
      [row.id]
    );

    return {
      providerId: row.provider_id,
      overallScore: row.overall_score,
      scoreBreakdown: row.score_breakdown,
      registrationStatus: row.registration_status,
      registrationDetails: row.registration_details,
      accreditations: accreditations.rows.map(r => ({
        id: r.id,
        body: r.body,
        type: r.type,
        level: r.level,
        issuedAt: r.issued_at,
        expiresAt: r.expires_at,
        verificationUrl: r.verification_url,
        status: r.status,
        verifiedByScholarly: r.verified_by_scholarly,
        verifiedAt: r.verified_at
      })),
      verifiedOutcomes: outcomes.rows.map(r => ({
        id: r.id,
        type: r.type,
        metric: r.metric,
        value: r.value,
        unit: r.unit,
        comparisonBasis: r.comparison_basis,
        comparisonValue: r.comparison_value,
        percentile: r.percentile,
        year: r.year,
        cohortSize: r.cohort_size,
        verifiedAt: r.verified_at,
        verifiedBy: r.verified_by,
        dataSource: r.data_source,
        confidenceLevel: r.confidence_level,
        validFrom: r.valid_from,
        validUntil: r.valid_until
      })),
      aggregateRating: row.aggregate_rating,
      staffQualifications: row.staff_qualifications,
      complianceRecords: compliance.rows.map(r => ({
        id: r.id,
        type: r.type,
        status: r.status,
        issuedBy: r.issued_by,
        issuedAt: r.issued_at,
        expiresAt: r.expires_at,
        notes: r.notes,
        documentUrl: r.document_url
      })),
      complianceStatus: row.compliance_status,
      verificationLevel: row.verification_level,
      memberSince: row.member_since,
      lastVerificationDate: row.last_verification_date,
      nextVerificationDue: row.next_verification_due,
      confidenceLevel: row.confidence_level,
      dataCompleteness: row.data_completeness
    };
  }

  private async insertLocation(client: PoolClient, providerId: string, location: ProviderLocation): Promise<void> {
    await client.query(
      `INSERT INTO provider_locations (
        id, provider_id, name, is_primary, street_address, address_locality,
        address_region, postal_code, address_country, latitude, longitude,
        phone, email, timezone, operating_hours, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
      [
        location.id || generateId(),
        providerId,
        location.name,
        location.isPrimary,
        location.address.streetAddress,
        location.address.addressLocality,
        location.address.addressRegion,
        location.address.postalCode,
        location.address.addressCountry,
        location.coordinates?.latitude ?? null,
        location.coordinates?.longitude ?? null,
        location.phone,
        location.email,
        location.timezone,
        location.operatingHours ? JSON.stringify(location.operatingHours) : null
      ]
    );
  }

  private async insertDomain(client: PoolClient, providerId: string, domain: ProviderDomain): Promise<void> {
    await client.query(
      `INSERT INTO provider_domains (
        id, provider_id, domain, type, status, ssl_status,
        ssl_expires_at, verification_token, verified_at, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
      [
        domain.id || generateId(),
        providerId,
        domain.domain.toLowerCase(),
        domain.type,
        domain.status,
        domain.sslStatus,
        domain.sslExpiresAt,
        domain.verificationToken,
        domain.verifiedAt
      ]
    );
  }

  private async insertQualityProfile(client: PoolClient, providerId: string, profile: EducationalQualityProfile): Promise<void> {
    const profileId = generateId();

    await client.query(
      `INSERT INTO quality_profiles (
        id, provider_id, overall_score, score_breakdown, registration_status,
        registration_details, verification_level, member_since, last_verification_date,
        next_verification_due, compliance_status, confidence_level, data_completeness,
        aggregate_rating, staff_qualifications, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`,
      [
        profileId,
        providerId,
        profile.overallScore,
        JSON.stringify(profile.scoreBreakdown),
        profile.registrationStatus,
        profile.registrationDetails ? JSON.stringify(profile.registrationDetails) : null,
        profile.verificationLevel,
        profile.memberSince,
        profile.lastVerificationDate,
        profile.nextVerificationDue,
        profile.complianceStatus,
        profile.confidenceLevel,
        profile.dataCompleteness,
        profile.aggregateRating ? JSON.stringify(profile.aggregateRating) : null,
        profile.staffQualifications ? JSON.stringify(profile.staffQualifications) : null
      ]
    );

    // Insert accreditations
    for (const accred of profile.accreditations) {
      await client.query(
        `INSERT INTO accreditations (
          id, quality_profile_id, body, type, level, issued_at, expires_at,
          verification_url, status, verified_by_scholarly, verified_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())`,
        [
          accred.id || generateId(),
          profileId,
          accred.body,
          accred.type,
          accred.level,
          accred.issuedAt,
          accred.expiresAt,
          accred.verificationUrl,
          accred.status,
          accred.verifiedByScholarly,
          accred.verifiedAt
        ]
      );
    }

    // Insert outcomes
    for (const outcome of profile.verifiedOutcomes) {
      await client.query(
        `INSERT INTO verified_outcomes (
          id, quality_profile_id, type, metric, value, unit, comparison_basis,
          comparison_value, percentile, year, cohort_size, verified_at, verified_by,
          data_source, confidence_level, valid_from, valid_until, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())`,
        [
          outcome.id || generateId(),
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
    }

    // Insert compliance records
    for (const record of profile.complianceRecords) {
      await client.query(
        `INSERT INTO compliance_records (
          id, quality_profile_id, type, status, issued_by, issued_at,
          expires_at, notes, document_url, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())`,
        [
          record.id || generateId(),
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
    }
  }

  private mapRowToProvider(row: any): EducationalProvider {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      type: row.type as ProviderType,
      displayName: row.display_name,
      legalName: row.legal_name,
      description: row.description,
      tagline: row.tagline,
      logoUrl: row.logo_url,
      faviconUrl: row.favicon_url,
      theme: row.theme as ProviderTheme,
      locations: [],
      serviceArea: row.service_area as ServiceArea | null,
      primaryContact: row.primary_contact as ContactInfo,
      domains: [],
      primaryDomain: row.primary_domain,
      qualityProfile: this.getDefaultQualityProfile(row.id),
      features: row.features as ProviderFeatures,
      seoConfig: row.seo_config as EducationalSEOConfig,
      agentConfig: row.agent_config as EducationalAgentConfig,
      lisIdentifiers: row.lis_identifiers as LISIdentifiers | null,
      scholarlyTenantId: row.scholarly_tenant_id,
      status: row.status as ProviderStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private mapRowToLocation(row: any): ProviderLocation {
    return {
      id: row.id,
      name: row.name,
      isPrimary: row.is_primary,
      address: {
        streetAddress: row.street_address,
        addressLocality: row.address_locality,
        addressRegion: row.address_region,
        postalCode: row.postal_code,
        addressCountry: row.address_country
      },
      coordinates: row.latitude && row.longitude
        ? { latitude: row.latitude, longitude: row.longitude }
        : null,
      phone: row.phone,
      email: row.email,
      timezone: row.timezone,
      operatingHours: row.operating_hours
    };
  }

  private mapRowToDomain(row: any): ProviderDomain {
    return {
      id: row.id,
      providerId: row.provider_id,
      domain: row.domain,
      type: row.type as DomainType,
      status: row.status as DomainStatus,
      sslStatus: row.ssl_status as SSLStatus,
      sslExpiresAt: row.ssl_expires_at,
      verificationToken: row.verification_token,
      verifiedAt: row.verified_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private getDefaultQualityProfile(providerId: string): EducationalQualityProfile {
    return {
      providerId,
      overallScore: 50,
      scoreBreakdown: {
        registration: 0,
        accreditation: 0,
        outcomes: 0,
        reviews: 0,
        staffQualifications: 0,
        compliance: 50,
        engagement: 30,
        weights: {
          registration: 0.20,
          accreditation: 0.15,
          outcomes: 0.25,
          reviews: 0.15,
          staffQualifications: 0.15,
          compliance: 0.05,
          engagement: 0.05
        }
      },
      registrationStatus: 'unregistered',
      registrationDetails: null,
      accreditations: [],
      verifiedOutcomes: [],
      aggregateRating: null,
      staffQualifications: null,
      complianceRecords: [],
      complianceStatus: 'not_assessed',
      verificationLevel: 'unverified',
      memberSince: new Date(),
      lastVerificationDate: null,
      nextVerificationDue: null,
      confidenceLevel: 0.2,
      dataCompleteness: 0.1
    };
  }
}
