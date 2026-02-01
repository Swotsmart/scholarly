/**
 * Hosting Agent API Service
 *
 * The interface through which AI agents discover educational providers,
 * verify quality, and help parents/students find the best educational fit.
 *
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import { Result, success, failure } from './base.service';

import {
  HostingEducationalProvider,
  HostingEducationalOffering,
  HostingEducationalQualityProfile,
  HostingVerifiedOutcome,
  HostingProviderSearchRequest,
  HostingProviderSearchResult,
  HostingProviderSummary,
  HostingProviderCompareRequest,
  HostingProviderCompareResult,
  HostingComparisonMatrix,
  HostingComparisonRow,
  HostingComparisonValue,
  HostingAIRecommendation,
  HostingEducationalTrustSummary,
  HostingSearchFacets,
  HostingYearLevel,
  HostingRateLimitConfig,
  HostingEducationalAgentCapabilities,
} from './hosting-types';

// ============================================================================
// TYPES
// ============================================================================

export interface HostingAgentAuthResult {
  authenticated: boolean;
  providerId: string;
  agentId: string;
  capabilities: string[];
  rateLimit: HostingRateLimitStatus;
}

export interface HostingRateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
}

export interface HostingOfferingSearchRequest {
  query: string;
  providerId?: string;
  filters: {
    types?: string[];
    yearLevels?: HostingYearLevel[];
    subjectAreas?: string[];
    deliveryModes?: string[];
    priceMax?: number;
    availability?: 'available' | 'waitlist' | 'any';
  };
  limit: number;
  offset: number;
}

export interface HostingOfferingSearchResult {
  offerings: HostingOfferingSummary[];
  totalCount: number;
  facets: HostingSearchFacets;
}

export interface HostingOfferingSummary {
  id: string;
  providerId: string;
  providerName: string;
  type: string;
  name: string;
  shortDescription: string;
  yearLevels: HostingYearLevel[];
  subjectAreas: string[];
  deliveryModes: string[];
  pricing: {
    type: string;
    amount: number | null;
    currency: string;
  };
  availability: {
    status: string;
    spotsAvailable: number | null;
  };
  qualitySignals: {
    providerQualityScore: number;
    averageRating: number | null;
    reviewCount: number;
  };
}

export interface HostingAvailabilityCheckRequest {
  offeringId: string;
  preferredDate?: Date;
  studentCount?: number;
}

export interface HostingAvailabilityCheckResult {
  offeringId: string;
  available: boolean;
  spotsTotal: number | null;
  spotsAvailable: number | null;
  waitlistSize: number | null;
  nextAvailableDate: Date | null;
  enrollmentDeadline: Date | null;
}

export interface HostingEnquirySubmission {
  providerId: string;
  offeringId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  studentName?: string;
  studentAge?: number;
  studentYearLevel?: HostingYearLevel;
  enquiryType: 'general' | 'enrollment' | 'tour' | 'pricing' | 'availability';
  message: string;
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface HostingAgentProviderRepository {
  findById(id: string): Promise<HostingEducationalProvider | null>;
  findAll(filters: Record<string, unknown>): Promise<{
    providers: HostingEducationalProvider[];
    total: number;
  }>;
}

export interface HostingAgentQualityRepository {
  findByProviderId(
    providerId: string
  ): Promise<HostingEducationalQualityProfile | null>;
}

export interface HostingAgentOfferingRepository {
  findById(id: string): Promise<HostingEducationalOffering | null>;
  findByProviderId(providerId: string): Promise<HostingEducationalOffering[]>;
  search(filters: Record<string, unknown>): Promise<{
    offerings: HostingEducationalOffering[];
    total: number;
  }>;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function verifyApiKey(providedKey: string, storedHash: string): boolean {
  // In production, use proper hash comparison (bcrypt.compare or similar)
  return providedKey === storedHash;
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
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class HostingAgentApiService {
  private rateLimitCache: Map<string, { count: number; resetAt: Date }> =
    new Map();

  constructor(
    private readonly providerRepository: HostingAgentProviderRepository,
    private readonly qualityRepository: HostingAgentQualityRepository,
    private readonly offeringRepository: HostingAgentOfferingRepository
  ) {}

  /**
   * Authenticate an agent and return their capabilities.
   */
  async authenticateAgent(
    providerId: string,
    apiKey: string,
    agentId: string
  ): Promise<Result<HostingAgentAuthResult>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(apiKey, 'apiKey');
      validators.nonEmptyString(agentId, 'agentId');

      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      const { agentConfig } = provider;

      if (!agentConfig.apiEnabled) {
        return failure({
          code: 'AGENT_AUTH_ERROR',
          message: `Agent authentication failed: ${agentId}`,
          details: { agentId },
        });
      }

      if (!agentConfig.apiKey || !verifyApiKey(apiKey, agentConfig.apiKey)) {
        return failure({
          code: 'AGENT_AUTH_ERROR',
          message: `Agent authentication failed: ${agentId}`,
          details: { agentId },
        });
      }

      const rateLimitStatus = this.checkRateLimit(
        providerId,
        agentId,
        agentConfig.rateLimit
      );
      if (rateLimitStatus.remaining <= 0) {
        return failure({
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Resets at ${rateLimitStatus.resetAt.toISOString()}`,
          details: { resetAt: rateLimitStatus.resetAt },
        });
      }

      const capabilities = this.buildCapabilitiesList(agentConfig.capabilities);

      log.info('Agent authenticated', { providerId, agentId });

      return success({
        authenticated: true,
        providerId,
        agentId,
        capabilities,
        rateLimit: rateLimitStatus,
      });
    } catch (error) {
      log.error('Agent authentication failed', error as Error, {
        providerId,
        agentId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Search educational providers.
   * AI agents use this to find schools/tutors matching criteria.
   */
  async searchProviders(
    request: HostingProviderSearchRequest
  ): Promise<Result<HostingProviderSearchResult>> {
    try {
      validators.nonEmptyString(request.query, 'query');

      // Build database query from search request
      const dbFilters = this.buildProviderDbFilters(request);

      const { providers, total } =
        await this.providerRepository.findAll(dbFilters);

      // Convert to summaries
      const summaries: HostingProviderSummary[] = await Promise.all(
        providers.map((p) =>
          this.buildProviderSummary(p, request.filters.location)
        )
      );

      // Sort by relevance/quality
      summaries.sort((a, b) => {
        if (request.sort === 'quality_score_desc')
          return b.qualityScore - a.qualityScore;
        if (request.sort === 'rating_desc')
          return (
            (b.aggregateRating?.average ?? 0) -
            (a.aggregateRating?.average ?? 0)
          );
        if (request.sort === 'distance_asc' && a.location && b.location) {
          return (
            (a.location.distanceKm ?? Infinity) -
            (b.location.distanceKm ?? Infinity)
          );
        }
        // Default: relevance (quality score)
        return b.qualityScore - a.qualityScore;
      });

      // Build facets
      const facets = await this.buildSearchFacets(providers);

      // Build trust summary
      const trustSummary = this.buildTrustSummary(providers);

      return success({
        providers: summaries,
        totalCount: total,
        facets,
        trustSummary,
      });
    } catch (error) {
      log.error('Provider search failed', error as Error, { request });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Search educational offerings.
   */
  async searchOfferings(
    request: HostingOfferingSearchRequest
  ): Promise<Result<HostingOfferingSearchResult>> {
    try {
      validators.nonEmptyString(request.query, 'query');

      const { offerings, total } = await this.offeringRepository.search({
        query: request.query,
        providerId: request.providerId,
        ...request.filters,
        limit: request.limit,
        offset: request.offset,
      });

      const summaries: HostingOfferingSummary[] = await Promise.all(
        offerings.map((o) => this.buildOfferingSummary(o))
      );

      const facets = this.buildOfferingFacets(offerings);

      return success({
        offerings: summaries,
        totalCount: total,
        facets,
      });
    } catch (error) {
      log.error('Offering search failed', error as Error, { request });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get provider details.
   */
  async getProviderDetails(
    providerId: string
  ): Promise<Result<HostingEducationalProvider>> {
    try {
      validators.providerId(providerId);

      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      return success(provider);
    } catch (error) {
      log.error('Get provider details failed', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get quality profile for a provider.
   */
  async getQualityProfile(
    providerId: string
  ): Promise<Result<HostingEducationalQualityProfile>> {
    try {
      validators.providerId(providerId);

      const profile = await this.qualityRepository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found: ${providerId}`,
          details: { providerId },
        });
      }

      return success(profile);
    } catch (error) {
      log.error('Get quality profile failed', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get verified outcomes for a provider.
   */
  async getVerifiedOutcomes(
    providerId: string
  ): Promise<Result<HostingVerifiedOutcome[]>> {
    try {
      validators.providerId(providerId);

      const profile = await this.qualityRepository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found: ${providerId}`,
          details: { providerId },
        });
      }

      // Return only valid, high-confidence outcomes
      const validOutcomes = profile.verifiedOutcomes.filter(
        (o) =>
          o.confidenceLevel >= 0.5 &&
          (!o.validUntil || o.validUntil > new Date())
      );

      return success(validOutcomes);
    } catch (error) {
      log.error('Get verified outcomes failed', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Compare providers side-by-side.
   */
  async compareProviders(
    request: HostingProviderCompareRequest
  ): Promise<Result<HostingProviderCompareResult>> {
    try {
      if (request.providerIds.length < 2) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: 'At least 2 providers required for comparison',
          details: { providerIds: request.providerIds },
        });
      }
      if (request.providerIds.length > 5) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: 'Maximum 5 providers for comparison',
          details: { providerIds: request.providerIds },
        });
      }

      // Fetch all providers
      const providers: HostingEducationalProvider[] = [];
      for (const id of request.providerIds) {
        const provider = await this.providerRepository.findById(id);
        if (!provider) {
          return failure({
            code: 'NOT_FOUND',
            message: `Provider not found: ${id}`,
            details: { providerId: id },
          });
        }
        providers.push(provider);
      }

      // Build comparison matrix
      const comparisonMatrix = await this.buildComparisonMatrix(
        providers,
        request.criteria
      );

      // Generate AI recommendation if user context provided
      let recommendation: HostingAIRecommendation | null = null;
      if (request.userContext) {
        recommendation = await this.generateRecommendation(
          providers,
          request.userContext
        );
      }

      // Build trust summary
      const trustSummary = this.buildTrustSummary(providers);

      return success({
        providers,
        comparisonMatrix,
        recommendation,
        trustSummary,
      });
    } catch (error) {
      log.error('Provider comparison failed', error as Error, { request });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Check availability for an offering.
   */
  async checkAvailability(
    request: HostingAvailabilityCheckRequest
  ): Promise<Result<HostingAvailabilityCheckResult>> {
    try {
      validators.nonEmptyString(request.offeringId, 'offeringId');

      const offering = await this.offeringRepository.findById(
        request.offeringId
      );
      if (!offering) {
        return failure({
          code: 'NOT_FOUND',
          message: `Offering not found: ${request.offeringId}`,
          details: { offeringId: request.offeringId },
        });
      }

      const { availability } = offering;

      return success({
        offeringId: request.offeringId,
        available:
          availability.status === 'available' ||
          availability.status === 'limited',
        spotsTotal: availability.spotsTotal,
        spotsAvailable: availability.spotsAvailable,
        waitlistSize: availability.waitlistSize,
        nextAvailableDate: availability.nextAvailableDate,
        enrollmentDeadline: offering.schedule?.enrollmentDeadline ?? null,
      });
    } catch (error) {
      log.error('Availability check failed', error as Error, { request });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate Schema.org JSON-LD for a provider.
   */
  generateProviderJsonLd(
    provider: HostingEducationalProvider
  ): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': provider.type === 'school' ? 'School' : 'EducationalOrganization',
      name: provider.displayName,
      description: provider.description,
      url: `https://${provider.primaryDomain}`,
      logo: provider.logoUrl,
      address: provider.locations[0]
        ? {
            '@type': 'PostalAddress',
            streetAddress: provider.locations[0].address.streetAddress,
            addressLocality: provider.locations[0].address.addressLocality,
            addressRegion: provider.locations[0].address.addressRegion,
            postalCode: provider.locations[0].address.postalCode,
            addressCountry: provider.locations[0].address.addressCountry,
          }
        : null,
      aggregateRating: provider.qualityProfile.aggregateRating
        ? {
            '@type': 'AggregateRating',
            ratingValue: provider.qualityProfile.aggregateRating.average,
            reviewCount: provider.qualityProfile.aggregateRating.count,
            bestRating: 5,
            worstRating: 1,
          }
        : null,
      additionalProperty: [
        {
          '@type': 'PropertyValue',
          name: 'scholarlyQualityScore',
          value: provider.qualityProfile.overallScore,
        },
        {
          '@type': 'PropertyValue',
          name: 'scholarlyVerificationLevel',
          value: provider.qualityProfile.verificationLevel,
        },
        {
          '@type': 'PropertyValue',
          name: 'scholarlyMemberSince',
          value: provider.qualityProfile.memberSince.toISOString(),
        },
      ],
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private checkRateLimit(
    providerId: string,
    agentId: string,
    config: HostingRateLimitConfig
  ): HostingRateLimitStatus {
    const key = `${providerId}:${agentId}`;
    const now = new Date();
    const entry = this.rateLimitCache.get(key);

    if (!entry || entry.resetAt < now) {
      const resetAt = new Date(now.getTime() + 60000);
      this.rateLimitCache.set(key, { count: 1, resetAt });
      return {
        remaining: config.requestsPerMinute - 1,
        limit: config.requestsPerMinute,
        resetAt,
      };
    }

    entry.count++;
    return {
      remaining: Math.max(0, config.requestsPerMinute - entry.count),
      limit: config.requestsPerMinute,
      resetAt: entry.resetAt,
    };
  }

  private buildCapabilitiesList(
    capabilities: HostingEducationalAgentCapabilities
  ): string[] {
    return Object.entries(capabilities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
  }

  private buildProviderDbFilters(
    request: HostingProviderSearchRequest
  ): Record<string, unknown> {
    return {
      query: request.query,
      types: request.filters.types,
      yearLevels: request.filters.yearLevels,
      minQualityScore: request.filters.minQualityScore,
      verificationLevels: request.filters.verificationLevels,
      location: request.filters.location,
      limit: request.limit,
      offset: request.offset,
    };
  }

  private async buildProviderSummary(
    provider: HostingEducationalProvider,
    locationFilter?: {
      latitude: number;
      longitude: number;
      radiusKm: number;
    } | null
  ): Promise<HostingProviderSummary> {
    // Calculate distance if location filter provided
    let distanceKm: number | null = null;
    if (locationFilter && provider.locations[0]?.coordinates) {
      distanceKm = this.calculateDistance(
        locationFilter.latitude,
        locationFilter.longitude,
        provider.locations[0].coordinates.latitude,
        provider.locations[0].coordinates.longitude
      );
    }

    // Get highlighted outcomes
    const highlightedOutcomes = provider.qualityProfile.verifiedOutcomes
      .filter((o) => o.percentile && o.percentile >= 75)
      .slice(0, 3)
      .map((o) => `${o.metric}: ${o.percentile}th percentile`);

    // Get accreditation badges
    const accreditationBadges = provider.qualityProfile.accreditations
      .filter((a) => a.status === 'active')
      .slice(0, 3)
      .map((a) => a.body);

    // Get year levels from offerings (simplified)
    const yearLevels: HostingYearLevel[] = [];

    return {
      id: provider.id,
      type: provider.type,
      displayName: provider.displayName,
      tagline: provider.tagline,
      logoUrl: provider.logoUrl,
      primaryDomain: provider.primaryDomain,
      location: provider.locations[0]
        ? {
            suburb: provider.locations[0].address.addressLocality,
            state: provider.locations[0].address.addressRegion,
            distanceKm,
          }
        : null,
      qualityScore: provider.qualityProfile.overallScore,
      verificationLevel: provider.qualityProfile.verificationLevel,
      aggregateRating: provider.qualityProfile.aggregateRating,
      yearLevels,
      subjectAreas: [],
      highlightedOutcomes,
      accreditationBadges,
    };
  }

  private async buildOfferingSummary(
    offering: HostingEducationalOffering
  ): Promise<HostingOfferingSummary> {
    const provider = await this.providerRepository.findById(offering.providerId);

    return {
      id: offering.id,
      providerId: offering.providerId,
      providerName: provider?.displayName ?? 'Unknown',
      type: offering.type,
      name: offering.name,
      shortDescription: offering.shortDescription,
      yearLevels: offering.yearLevels,
      subjectAreas: offering.subjectAreas,
      deliveryModes: offering.deliveryModes,
      pricing: {
        type: offering.pricing.type,
        amount: offering.pricing.amount,
        currency: offering.pricing.currency,
      },
      availability: {
        status: offering.availability.status,
        spotsAvailable: offering.availability.spotsAvailable,
      },
      qualitySignals: {
        providerQualityScore: offering.qualitySignals.providerQualityScore,
        averageRating: offering.qualitySignals.averageRating,
        reviewCount: offering.qualitySignals.reviewCount,
      },
    };
  }

  private async buildSearchFacets(
    providers: HostingEducationalProvider[]
  ): Promise<HostingSearchFacets> {
    const types = this.countFacetValues(providers, (p) => p.type);
    const verificationLevels = this.countFacetValues(
      providers,
      (p) => p.qualityProfile.verificationLevel
    );

    return {
      types: types.map(([value, count]) => ({
        value,
        count,
        label: this.formatProviderType(value),
      })),
      yearLevels: [],
      subjectAreas: [],
      accreditations: [],
      verificationLevels: verificationLevels.map(([value, count]) => ({
        value,
        count,
        label: this.formatVerificationLevel(value),
      })),
      priceRanges: [],
    };
  }

  private buildOfferingFacets(
    offerings: HostingEducationalOffering[]
  ): HostingSearchFacets {
    const types = this.countFacetValues(offerings, (o) => o.type);

    return {
      types: types.map(([value, count]) => ({ value, count, label: value })),
      yearLevels: [],
      subjectAreas: [],
      accreditations: [],
      verificationLevels: [],
      priceRanges: [],
    };
  }

  private countFacetValues<T>(
    items: T[],
    getter: (item: T) => string
  ): [string, number][] {
    const counts = new Map<string, number>();
    for (const item of items) {
      const value = getter(item);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }

  private buildTrustSummary(
    providers: HostingEducationalProvider[]
  ): HostingEducationalTrustSummary {
    if (providers.length === 0) {
      return {
        totalProviders: 0,
        verifiedProviders: 0,
        averageQualityScore: 0,
        outcomesVerifiedCount: 0,
        platformStatement: 'No providers found.',
      };
    }

    const verifiedProviders = providers.filter(
      (p) =>
        p.qualityProfile.verificationLevel !== 'unverified' &&
        p.qualityProfile.verificationLevel !== 'email_verified'
    ).length;

    const avgQualityScore =
      providers.reduce((sum, p) => sum + p.qualityProfile.overallScore, 0) /
      providers.length;

    const outcomesVerifiedCount = providers.filter(
      (p) => p.qualityProfile.verifiedOutcomes.length > 0
    ).length;

    return {
      totalProviders: providers.length,
      verifiedProviders,
      averageQualityScore: Math.round(avgQualityScore),
      outcomesVerifiedCount,
      platformStatement: `${verifiedProviders} of ${providers.length} providers are Scholarly Verified with an average quality score of ${Math.round(avgQualityScore)}.`,
    };
  }

  private async buildComparisonMatrix(
    providers: HostingEducationalProvider[],
    criteria: { category: string; metrics: string[] }[]
  ): Promise<HostingComparisonMatrix> {
    const rows: HostingComparisonRow[] = [];

    for (const criterion of criteria) {
      for (const metric of criterion.metrics) {
        const values = providers.map((p) =>
          this.getComparisonValue(p, criterion.category, metric)
        );

        // Determine best value
        const numericValues = values
          .filter((v) => typeof v.value === 'number')
          .map((v) => v.value as number);
        const bestValue = Math.max(...numericValues);

        values.forEach((v) => {
          if (typeof v.value === 'number' && v.value === bestValue) {
            v.isBest = true;
          }
        });

        rows.push({
          criterion: metric,
          category: criterion.category,
          values,
        });
      }
    }

    return {
      criteria: criteria.flatMap((c) => c.metrics),
      rows,
    };
  }

  private getComparisonValue(
    provider: HostingEducationalProvider,
    category: string,
    metric: string
  ): HostingComparisonValue {
    let value: string | number | null = null;
    let displayValue = 'N/A';
    let score: number | null = null;

    switch (category) {
      case 'quality':
        if (metric === 'overallScore') {
          value = provider.qualityProfile.overallScore;
          displayValue = `${value}/100`;
          score = value;
        } else if (metric === 'verificationLevel') {
          value = provider.qualityProfile.verificationLevel;
          displayValue = this.formatVerificationLevel(value);
        }
        break;

      case 'outcomes':
        const outcome = provider.qualityProfile.verifiedOutcomes.find((o) =>
          o.metric.includes(metric)
        );
        if (outcome) {
          value = outcome.percentile ?? outcome.value;
          displayValue = outcome.percentile
            ? `${outcome.percentile}th percentile`
            : `${outcome.value}`;
          score = typeof value === 'number' ? value : null;
        }
        break;

      case 'staff':
        const staff = provider.qualityProfile.staffQualifications;
        if (staff) {
          if (metric === 'studentTeacherRatio') {
            value = staff.studentTeacherRatio;
            displayValue = `${value}:1`;
            score = 100 - value * 3; // Lower is better
          } else if (metric === 'qualifiedTeachers') {
            const pct =
              staff.teachingStaff > 0
                ? (staff.qualifiedTeachers / staff.teachingStaff) * 100
                : 0;
            value = pct;
            displayValue = `${Math.round(pct)}%`;
            score = pct;
          }
        }
        break;

      case 'pricing':
        // Would need to query offerings for pricing comparison
        break;

      case 'location':
        if (metric === 'suburb' && provider.locations[0]) {
          value = provider.locations[0].address.addressLocality;
          displayValue = value;
        }
        break;
    }

    return {
      providerId: provider.id,
      value,
      displayValue,
      score,
      isBest: false,
    };
  }

  private async generateRecommendation(
    providers: HostingEducationalProvider[],
    userContext: {
      studentAge?: number | null;
      yearLevel?: HostingYearLevel | null;
      learningNeeds?: string[];
      priorities?: string[];
    }
  ): Promise<HostingAIRecommendation> {
    // Score each provider based on user context
    const scores = providers.map((p) => {
      let score = p.qualityProfile.overallScore;

      // Boost for matching priorities
      if (
        userContext.priorities?.includes('academic') &&
        p.qualityProfile.verifiedOutcomes.length > 0
      ) {
        score += 10;
      }
      if (userContext.priorities?.includes('wellbeing')) {
        const wellbeingOutcome = p.qualityProfile.verifiedOutcomes.find(
          (o) => o.type === 'wellbeing_score'
        );
        if (
          wellbeingOutcome &&
          wellbeingOutcome.percentile &&
          wellbeingOutcome.percentile >= 70
        ) {
          score += 15;
        }
      }
      if (
        userContext.priorities?.includes('small_class') &&
        p.qualityProfile.staffQualifications
      ) {
        if (p.qualityProfile.staffQualifications.studentTeacherRatio <= 15) {
          score += 10;
        }
      }

      // Boost for verification
      if (p.qualityProfile.verificationLevel === 'premium_verified') score += 10;
      else if (p.qualityProfile.verificationLevel === 'outcomes_verified')
        score += 5;

      return { provider: p, score };
    });

    scores.sort((a, b) => b.score - a.score);
    const recommended = scores[0];
    const alternatives = scores.slice(1);

    return {
      recommendedProviderId: recommended.provider.id,
      confidence: Math.min(0.95, recommended.score / 100),
      reasoning: this.generateReasoningText(recommended.provider, userContext),
      considerations: this.generateConsiderations(recommended.provider),
      alternatives: alternatives.slice(0, 2).map((a) => ({
        providerId: a.provider.id,
        reason: this.generateAlternativeReason(
          a.provider,
          recommended.provider
        ),
      })),
    };
  }

  private generateReasoningText(
    provider: HostingEducationalProvider,
    _userContext: Record<string, unknown>
  ): string {
    const reasons: string[] = [];

    if (provider.qualityProfile.overallScore >= 80) {
      reasons.push(
        `high quality score of ${provider.qualityProfile.overallScore}/100`
      );
    }

    if (provider.qualityProfile.verifiedOutcomes.length > 0) {
      reasons.push('verified academic outcomes');
    }

    if (provider.qualityProfile.verificationLevel === 'premium_verified') {
      reasons.push('premium verification status');
    }

    if (
      provider.qualityProfile.aggregateRating &&
      provider.qualityProfile.aggregateRating.average >= 4.5
    ) {
      reasons.push(
        `excellent reviews (${provider.qualityProfile.aggregateRating.average}/5)`
      );
    }

    return `${provider.displayName} is recommended based on ${reasons.join(', ')}.`;
  }

  private generateConsiderations(
    provider: HostingEducationalProvider
  ): string[] {
    const considerations: string[] = [];

    if (provider.qualityProfile.dataCompleteness < 0.7) {
      considerations.push(
        'Some profile information is incomplete - consider requesting more details'
      );
    }

    if (
      provider.qualityProfile.aggregateRating &&
      provider.qualityProfile.aggregateRating.count < 10
    ) {
      considerations.push('Limited number of reviews available');
    }

    if (
      provider.qualityProfile.verificationLevel === 'unverified' ||
      provider.qualityProfile.verificationLevel === 'email_verified'
    ) {
      considerations.push('Provider has not completed full verification');
    }

    return considerations;
  }

  private generateAlternativeReason(
    alternative: HostingEducationalProvider,
    recommended: HostingEducationalProvider
  ): string {
    if (
      alternative.qualityProfile.staffQualifications &&
      recommended.qualityProfile.staffQualifications &&
      alternative.qualityProfile.staffQualifications.studentTeacherRatio <
        recommended.qualityProfile.staffQualifications.studentTeacherRatio
    ) {
      return 'Smaller class sizes';
    }

    if (
      alternative.qualityProfile.aggregateRating &&
      recommended.qualityProfile.aggregateRating &&
      alternative.qualityProfile.aggregateRating.average >
        recommended.qualityProfile.aggregateRating.average
    ) {
      return 'Higher parent ratings';
    }

    return 'Alternative option with different strengths';
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private formatProviderType(type: string): string {
    const labels: Record<string, string> = {
      school: 'School',
      micro_school: 'Micro School',
      tutoring_centre: 'Tutoring Centre',
      solo_tutor: 'Tutor',
      homeschool_coop: 'Homeschool Co-op',
      curriculum_provider: 'Curriculum Provider',
      enrichment: 'Enrichment Program',
      online_academy: 'Online Academy',
    };
    return labels[type] ?? type;
  }

  private formatVerificationLevel(level: string): string {
    const labels: Record<string, string> = {
      unverified: 'Unverified',
      email_verified: 'Email Verified',
      identity_verified: 'Identity Verified',
      registration_verified: 'Registration Verified',
      outcomes_verified: 'Outcomes Verified',
      premium_verified: 'Premium Verified',
    };
    return labels[level] ?? level;
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let serviceInstance: HostingAgentApiService | null = null;

export function initializeHostingAgentApiService(
  providerRepository: HostingAgentProviderRepository,
  qualityRepository: HostingAgentQualityRepository,
  offeringRepository: HostingAgentOfferingRepository
): HostingAgentApiService {
  serviceInstance = new HostingAgentApiService(
    providerRepository,
    qualityRepository,
    offeringRepository
  );
  return serviceInstance;
}

export function getHostingAgentApiService(): HostingAgentApiService {
  if (!serviceInstance) {
    throw new Error('HostingAgentApiService not initialized');
  }
  return serviceInstance;
}
