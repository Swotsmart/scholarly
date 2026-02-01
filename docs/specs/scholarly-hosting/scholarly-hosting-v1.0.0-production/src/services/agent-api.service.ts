/**
 * Educational Agent API Service
 * 
 * The interface through which AI agents discover educational providers,
 * verify quality, and help parents/students find the best educational fit.
 * 
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import {
  EducationalProvider,
  EducationalOffering,
  EducationalQualityProfile,
  VerifiedOutcome,
  ProviderSearchRequest,
  ProviderSearchResult,
  ProviderSummary,
  ProviderCompareRequest,
  ProviderCompareResult,
  ComparisonMatrix,
  ComparisonRow,
  ComparisonValue,
  AIRecommendation,
  EducationalTrustSummary,
  SearchFacets,
  FacetValue,
  ProviderType,
  YearLevel,
  VerificationLevel,
  AggregateRating,
  EducationalAgentConfig,
  RateLimitConfig,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  AgentAuthenticationError
} from '../types';

import {
  getPool,
  publishEvent,
  logger,
  validators,
  verifyApiKey
} from '../infrastructure';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentAuthResult {
  authenticated: boolean;
  providerId: string;
  agentId: string;
  capabilities: string[];
  rateLimit: RateLimitStatus;
}

export interface RateLimitStatus {
  remaining: number;
  limit: number;
  resetAt: Date;
}

export interface OfferingSearchRequest {
  query: string;
  providerId?: string;
  filters: {
    types?: string[];
    yearLevels?: YearLevel[];
    subjectAreas?: string[];
    deliveryModes?: string[];
    priceMax?: number;
    availability?: 'available' | 'waitlist' | 'any';
  };
  limit: number;
  offset: number;
}

export interface OfferingSearchResult {
  offerings: OfferingSummary[];
  totalCount: number;
  facets: SearchFacets;
}

export interface OfferingSummary {
  id: string;
  providerId: string;
  providerName: string;
  type: string;
  name: string;
  shortDescription: string;
  yearLevels: YearLevel[];
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

export interface AvailabilityCheckRequest {
  offeringId: string;
  preferredDate?: Date;
  studentCount?: number;
}

export interface AvailabilityCheckResult {
  offeringId: string;
  available: boolean;
  spotsTotal: number | null;
  spotsAvailable: number | null;
  waitlistSize: number | null;
  nextAvailableDate: Date | null;
  enrollmentDeadline: Date | null;
}

export interface EnquirySubmission {
  providerId: string;
  offeringId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  studentName?: string;
  studentAge?: number;
  studentYearLevel?: YearLevel;
  enquiryType: 'general' | 'enrollment' | 'tour' | 'pricing' | 'availability';
  message: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EducationalAgentApiService {
  private rateLimitCache: Map<string, { count: number; resetAt: Date }> = new Map();

  constructor(
    private readonly providerRepository: {
      findById(id: string): Promise<EducationalProvider | null>;
      findAll(filters: any): Promise<{ providers: EducationalProvider[]; total: number }>;
    },
    private readonly qualityRepository: {
      findByProviderId(providerId: string): Promise<EducationalQualityProfile | null>;
    },
    private readonly offeringRepository: {
      findById(id: string): Promise<EducationalOffering | null>;
      findByProviderId(providerId: string): Promise<EducationalOffering[]>;
      search(filters: any): Promise<{ offerings: EducationalOffering[]; total: number }>;
    }
  ) {}

  /**
   * Authenticate an agent and return their capabilities.
   */
  async authenticateAgent(
    providerId: string,
    apiKey: string,
    agentId: string
  ): Promise<Result<AgentAuthResult>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(apiKey, 'apiKey');
      validators.nonEmptyString(agentId, 'agentId');

      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
      }

      const { agentConfig } = provider;

      if (!agentConfig.apiEnabled) {
        return failure(new AgentAuthenticationError(agentId));
      }

      if (!agentConfig.apiKey || !verifyApiKey(apiKey, agentConfig.apiKey)) {
        await publishEvent('agent.authenticated', providerId, { agentId, success: false });
        return failure(new AgentAuthenticationError(agentId));
      }

      const rateLimitStatus = this.checkRateLimit(providerId, agentId, agentConfig.rateLimit);
      if (rateLimitStatus.remaining <= 0) {
        return failure(new ValidationError(
          `Rate limit exceeded. Resets at ${rateLimitStatus.resetAt.toISOString()}`,
          'rateLimit'
        ));
      }

      const capabilities = this.buildCapabilitiesList(agentConfig.capabilities);

      await publishEvent('agent.authenticated', providerId, { agentId, success: true, capabilities });
      logger.info({ providerId, agentId }, 'Agent authenticated');

      return success({
        authenticated: true,
        providerId,
        agentId,
        capabilities,
        rateLimit: rateLimitStatus
      });

    } catch (error) {
      logger.error({ error, providerId, agentId }, 'Agent authentication failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Search educational providers.
   * AI agents use this to find schools/tutors matching criteria.
   */
  async searchProviders(request: ProviderSearchRequest): Promise<Result<ProviderSearchResult>> {
    try {
      validators.nonEmptyString(request.query, 'query');

      // Build database query from search request
      const dbFilters = this.buildProviderDbFilters(request);
      
      const { providers, total } = await this.providerRepository.findAll(dbFilters);

      // Convert to summaries
      const summaries: ProviderSummary[] = await Promise.all(
        providers.map(p => this.buildProviderSummary(p, request.filters.location))
      );

      // Sort by relevance/quality
      summaries.sort((a, b) => {
        if (request.sort === 'quality_score_desc') return b.qualityScore - a.qualityScore;
        if (request.sort === 'rating_desc') return (b.aggregateRating?.average ?? 0) - (a.aggregateRating?.average ?? 0);
        if (request.sort === 'distance_asc' && a.location && b.location) {
          return (a.location.distanceKm ?? Infinity) - (b.location.distanceKm ?? Infinity);
        }
        // Default: relevance (quality score)
        return b.qualityScore - a.qualityScore;
      });

      // Build facets
      const facets = await this.buildSearchFacets(providers);

      // Build trust summary
      const trustSummary = this.buildTrustSummary(providers);

      await publishEvent('agent.search_performed', 'system', {
        query: request.query,
        resultCount: total,
        filters: request.filters
      });

      return success({
        providers: summaries,
        totalCount: total,
        facets,
        trustSummary
      });

    } catch (error) {
      logger.error({ error, request }, 'Provider search failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Search educational offerings.
   */
  async searchOfferings(request: OfferingSearchRequest): Promise<Result<OfferingSearchResult>> {
    try {
      validators.nonEmptyString(request.query, 'query');

      const { offerings, total } = await this.offeringRepository.search({
        query: request.query,
        providerId: request.providerId,
        ...request.filters,
        limit: request.limit,
        offset: request.offset
      });

      const summaries: OfferingSummary[] = await Promise.all(
        offerings.map(o => this.buildOfferingSummary(o))
      );

      const facets = this.buildOfferingFacets(offerings);

      return success({
        offerings: summaries,
        totalCount: total,
        facets
      });

    } catch (error) {
      logger.error({ error, request }, 'Offering search failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get provider details.
   */
  async getProviderDetails(providerId: string): Promise<Result<EducationalProvider>> {
    try {
      validators.providerId(providerId);

      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
      }

      return success(provider);
    } catch (error) {
      logger.error({ error, providerId }, 'Get provider details failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get quality profile for a provider.
   */
  async getQualityProfile(providerId: string): Promise<Result<EducationalQualityProfile>> {
    try {
      validators.providerId(providerId);

      const profile = await this.qualityRepository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      return success(profile);
    } catch (error) {
      logger.error({ error, providerId }, 'Get quality profile failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get verified outcomes for a provider.
   */
  async getVerifiedOutcomes(providerId: string): Promise<Result<VerifiedOutcome[]>> {
    try {
      validators.providerId(providerId);

      const profile = await this.qualityRepository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      // Return only valid, high-confidence outcomes
      const validOutcomes = profile.verifiedOutcomes.filter(o =>
        o.confidenceLevel >= 0.5 &&
        (!o.validUntil || o.validUntil > new Date())
      );

      return success(validOutcomes);
    } catch (error) {
      logger.error({ error, providerId }, 'Get verified outcomes failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Compare providers side-by-side.
   */
  async compareProviders(request: ProviderCompareRequest): Promise<Result<ProviderCompareResult>> {
    try {
      if (request.providerIds.length < 2) {
        return failure(new ValidationError('At least 2 providers required for comparison', 'providerIds'));
      }
      if (request.providerIds.length > 5) {
        return failure(new ValidationError('Maximum 5 providers for comparison', 'providerIds'));
      }

      // Fetch all providers
      const providers: EducationalProvider[] = [];
      for (const id of request.providerIds) {
        const provider = await this.providerRepository.findById(id);
        if (!provider) {
          return failure(new NotFoundError('Provider', id));
        }
        providers.push(provider);
      }

      // Build comparison matrix
      const comparisonMatrix = await this.buildComparisonMatrix(providers, request.criteria);

      // Generate AI recommendation if user context provided
      let recommendation: AIRecommendation | null = null;
      if (request.userContext) {
        recommendation = await this.generateRecommendation(providers, request.userContext);
      }

      // Build trust summary
      const trustSummary = this.buildTrustSummary(providers);

      await publishEvent('agent.comparison_requested', 'system', {
        providerIds: request.providerIds,
        criteria: request.criteria
      });

      return success({
        providers,
        comparisonMatrix,
        recommendation,
        trustSummary
      });

    } catch (error) {
      logger.error({ error, request }, 'Provider comparison failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Check availability for an offering.
   */
  async checkAvailability(request: AvailabilityCheckRequest): Promise<Result<AvailabilityCheckResult>> {
    try {
      validators.nonEmptyString(request.offeringId, 'offeringId');

      const offering = await this.offeringRepository.findById(request.offeringId);
      if (!offering) {
        return failure(new NotFoundError('Offering', request.offeringId));
      }

      const { availability } = offering;

      return success({
        offeringId: request.offeringId,
        available: availability.status === 'available' || availability.status === 'limited',
        spotsTotal: availability.spotsTotal,
        spotsAvailable: availability.spotsAvailable,
        waitlistSize: availability.waitlistSize,
        nextAvailableDate: availability.nextAvailableDate,
        enrollmentDeadline: offering.schedule?.enrollmentDeadline ?? null
      });

    } catch (error) {
      logger.error({ error, request }, 'Availability check failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Submit an enquiry to a provider.
   */
  async submitEnquiry(submission: EnquirySubmission, agentId: string): Promise<Result<{ enquiryId: string }>> {
    try {
      validators.providerId(submission.providerId);
      validators.email(submission.contactEmail);
      validators.nonEmptyString(submission.contactName, 'contactName');
      validators.nonEmptyString(submission.message, 'message');

      const provider = await this.providerRepository.findById(submission.providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', submission.providerId));
      }

      // Create enquiry in database
      const pool = getPool();
      const enquiryId = `enq_${Date.now()}`;

      await pool.query(
        `INSERT INTO enquiries (
          id, provider_id, offering_id, contact_name, contact_email, contact_phone,
          student_name, student_age, student_year_level, enquiry_type, message,
          source, agent_id, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())`,
        [
          enquiryId,
          submission.providerId,
          submission.offeringId ?? null,
          submission.contactName,
          submission.contactEmail,
          submission.contactPhone ?? null,
          submission.studentName ?? null,
          submission.studentAge ?? null,
          submission.studentYearLevel ?? null,
          submission.enquiryType,
          submission.message,
          'agent_api',
          agentId,
          'new'
        ]
      );

      await publishEvent('enquiry.received', submission.providerId, {
        enquiryId,
        type: submission.enquiryType,
        agentId
      });

      logger.info({ enquiryId, providerId: submission.providerId }, 'Enquiry submitted');
      return success({ enquiryId });

    } catch (error) {
      logger.error({ error, submission }, 'Enquiry submission failed');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate Schema.org JSON-LD for a provider.
   */
  generateProviderJsonLd(provider: EducationalProvider): Record<string, unknown> {
    return {
      '@context': 'https://schema.org',
      '@type': provider.type === 'school' ? 'School' : 'EducationalOrganization',
      'name': provider.displayName,
      'description': provider.description,
      'url': `https://${provider.primaryDomain}`,
      'logo': provider.logoUrl,
      'address': provider.locations[0] ? {
        '@type': 'PostalAddress',
        'streetAddress': provider.locations[0].address.streetAddress,
        'addressLocality': provider.locations[0].address.addressLocality,
        'addressRegion': provider.locations[0].address.addressRegion,
        'postalCode': provider.locations[0].address.postalCode,
        'addressCountry': provider.locations[0].address.addressCountry
      } : null,
      'aggregateRating': provider.qualityProfile.aggregateRating ? {
        '@type': 'AggregateRating',
        'ratingValue': provider.qualityProfile.aggregateRating.average,
        'reviewCount': provider.qualityProfile.aggregateRating.count,
        'bestRating': 5,
        'worstRating': 1
      } : null,
      'additionalProperty': [
        {
          '@type': 'PropertyValue',
          'name': 'scholarlyQualityScore',
          'value': provider.qualityProfile.overallScore
        },
        {
          '@type': 'PropertyValue',
          'name': 'scholarlyVerificationLevel',
          'value': provider.qualityProfile.verificationLevel
        },
        {
          '@type': 'PropertyValue',
          'name': 'scholarlyMemberSince',
          'value': provider.qualityProfile.memberSince.toISOString()
        }
      ]
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private checkRateLimit(providerId: string, agentId: string, config: RateLimitConfig): RateLimitStatus {
    const key = `${providerId}:${agentId}`;
    const now = new Date();
    const entry = this.rateLimitCache.get(key);

    if (!entry || entry.resetAt < now) {
      const resetAt = new Date(now.getTime() + 60000);
      this.rateLimitCache.set(key, { count: 1, resetAt });
      return { remaining: config.requestsPerMinute - 1, limit: config.requestsPerMinute, resetAt };
    }

    entry.count++;
    return {
      remaining: Math.max(0, config.requestsPerMinute - entry.count),
      limit: config.requestsPerMinute,
      resetAt: entry.resetAt
    };
  }

  private buildCapabilitiesList(capabilities: Record<string, boolean>): string[] {
    return Object.entries(capabilities)
      .filter(([, enabled]) => enabled)
      .map(([name]) => name);
  }

  private buildProviderDbFilters(request: ProviderSearchRequest): any {
    return {
      query: request.query,
      types: request.filters.types,
      yearLevels: request.filters.yearLevels,
      minQualityScore: request.filters.minQualityScore,
      verificationLevels: request.filters.verificationLevels,
      location: request.filters.location,
      limit: request.limit,
      offset: request.offset
    };
  }

  private async buildProviderSummary(
    provider: EducationalProvider,
    locationFilter?: { latitude: number; longitude: number; radiusKm: number } | null
  ): Promise<ProviderSummary> {
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
      .filter(o => o.percentile && o.percentile >= 75)
      .slice(0, 3)
      .map(o => `${o.metric}: ${o.percentile}th percentile`);

    // Get accreditation badges
    const accreditationBadges = provider.qualityProfile.accreditations
      .filter(a => a.status === 'active')
      .slice(0, 3)
      .map(a => a.body);

    // Get year levels from offerings (simplified)
    const yearLevels: YearLevel[] = []; // Would query offerings in production

    return {
      id: provider.id,
      type: provider.type,
      displayName: provider.displayName,
      tagline: provider.tagline,
      logoUrl: provider.logoUrl,
      primaryDomain: provider.primaryDomain,
      location: provider.locations[0] ? {
        suburb: provider.locations[0].address.addressLocality,
        state: provider.locations[0].address.addressRegion,
        distanceKm
      } : null,
      qualityScore: provider.qualityProfile.overallScore,
      verificationLevel: provider.qualityProfile.verificationLevel,
      aggregateRating: provider.qualityProfile.aggregateRating,
      yearLevels,
      subjectAreas: [],
      highlightedOutcomes,
      accreditationBadges
    };
  }

  private async buildOfferingSummary(offering: EducationalOffering): Promise<OfferingSummary> {
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
        currency: offering.pricing.currency
      },
      availability: {
        status: offering.availability.status,
        spotsAvailable: offering.availability.spotsAvailable
      },
      qualitySignals: {
        providerQualityScore: offering.qualitySignals.providerQualityScore,
        averageRating: offering.qualitySignals.averageRating,
        reviewCount: offering.qualitySignals.reviewCount
      }
    };
  }

  private async buildSearchFacets(providers: EducationalProvider[]): Promise<SearchFacets> {
    const types = this.countFacetValues(providers, p => p.type);
    const verificationLevels = this.countFacetValues(providers, p => p.qualityProfile.verificationLevel);

    return {
      types: types.map(([value, count]) => ({ value, count, label: this.formatProviderType(value) })),
      yearLevels: [],
      subjectAreas: [],
      accreditations: [],
      verificationLevels: verificationLevels.map(([value, count]) => ({
        value,
        count,
        label: this.formatVerificationLevel(value)
      })),
      priceRanges: []
    };
  }

  private buildOfferingFacets(offerings: EducationalOffering[]): SearchFacets {
    const types = this.countFacetValues(offerings, o => o.type);

    return {
      types: types.map(([value, count]) => ({ value, count, label: value })),
      yearLevels: [],
      subjectAreas: [],
      accreditations: [],
      verificationLevels: [],
      priceRanges: []
    };
  }

  private countFacetValues<T>(items: T[], getter: (item: T) => string): [string, number][] {
    const counts = new Map<string, number>();
    for (const item of items) {
      const value = getter(item);
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }

  private buildTrustSummary(providers: EducationalProvider[]): EducationalTrustSummary {
    if (providers.length === 0) {
      return {
        totalProviders: 0,
        verifiedProviders: 0,
        averageQualityScore: 0,
        outcomesVerifiedCount: 0,
        platformStatement: 'No providers found.'
      };
    }

    const verifiedProviders = providers.filter(p =>
      p.qualityProfile.verificationLevel !== 'unverified' &&
      p.qualityProfile.verificationLevel !== 'email_verified'
    ).length;

    const avgQualityScore = providers.reduce((sum, p) => sum + p.qualityProfile.overallScore, 0) / providers.length;

    const outcomesVerifiedCount = providers.filter(p =>
      p.qualityProfile.verifiedOutcomes.length > 0
    ).length;

    return {
      totalProviders: providers.length,
      verifiedProviders,
      averageQualityScore: Math.round(avgQualityScore),
      outcomesVerifiedCount,
      platformStatement: `${verifiedProviders} of ${providers.length} providers are Scholarly Verified with an average quality score of ${Math.round(avgQualityScore)}.`
    };
  }

  private async buildComparisonMatrix(
    providers: EducationalProvider[],
    criteria: { category: string; metrics: string[] }[]
  ): Promise<ComparisonMatrix> {
    const rows: ComparisonRow[] = [];

    for (const criterion of criteria) {
      for (const metric of criterion.metrics) {
        const values = providers.map(p => this.getComparisonValue(p, criterion.category, metric));
        
        // Determine best value
        const numericValues = values.filter(v => typeof v.value === 'number').map(v => v.value as number);
        const bestValue = Math.max(...numericValues);
        
        values.forEach(v => {
          if (typeof v.value === 'number' && v.value === bestValue) {
            v.isBest = true;
          }
        });

        rows.push({
          criterion: metric,
          category: criterion.category,
          values
        });
      }
    }

    return {
      criteria: criteria.flatMap(c => c.metrics),
      rows
    };
  }

  private getComparisonValue(
    provider: EducationalProvider,
    category: string,
    metric: string
  ): ComparisonValue {
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
        const outcome = provider.qualityProfile.verifiedOutcomes.find(o => o.metric.includes(metric));
        if (outcome) {
          value = outcome.percentile ?? outcome.value;
          displayValue = outcome.percentile ? `${outcome.percentile}th percentile` : `${outcome.value}`;
          score = typeof value === 'number' ? value : null;
        }
        break;
      
      case 'staff':
        const staff = provider.qualityProfile.staffQualifications;
        if (staff) {
          if (metric === 'studentTeacherRatio') {
            value = staff.studentTeacherRatio;
            displayValue = `${value}:1`;
            score = 100 - (value * 3); // Lower is better
          } else if (metric === 'qualifiedTeachers') {
            const pct = staff.teachingStaff > 0 ? (staff.qualifiedTeachers / staff.teachingStaff) * 100 : 0;
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
      isBest: false
    };
  }

  private async generateRecommendation(
    providers: EducationalProvider[],
    userContext: { studentAge?: number | null; yearLevel?: YearLevel | null; learningNeeds?: string[]; priorities?: string[] }
  ): Promise<AIRecommendation> {
    // Score each provider based on user context
    const scores = providers.map(p => {
      let score = p.qualityProfile.overallScore;

      // Boost for matching priorities
      if (userContext.priorities?.includes('academic') && p.qualityProfile.verifiedOutcomes.length > 0) {
        score += 10;
      }
      if (userContext.priorities?.includes('wellbeing')) {
        const wellbeingOutcome = p.qualityProfile.verifiedOutcomes.find(o => o.type === 'wellbeing_score');
        if (wellbeingOutcome && wellbeingOutcome.percentile && wellbeingOutcome.percentile >= 70) {
          score += 15;
        }
      }
      if (userContext.priorities?.includes('small_class') && p.qualityProfile.staffQualifications) {
        if (p.qualityProfile.staffQualifications.studentTeacherRatio <= 15) {
          score += 10;
        }
      }

      // Boost for verification
      if (p.qualityProfile.verificationLevel === 'premium_verified') score += 10;
      else if (p.qualityProfile.verificationLevel === 'outcomes_verified') score += 5;

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
      alternatives: alternatives.slice(0, 2).map(a => ({
        providerId: a.provider.id,
        reason: this.generateAlternativeReason(a.provider, recommended.provider)
      }))
    };
  }

  private generateReasoningText(provider: EducationalProvider, userContext: any): string {
    const reasons: string[] = [];

    if (provider.qualityProfile.overallScore >= 80) {
      reasons.push(`high quality score of ${provider.qualityProfile.overallScore}/100`);
    }

    if (provider.qualityProfile.verifiedOutcomes.length > 0) {
      reasons.push('verified academic outcomes');
    }

    if (provider.qualityProfile.verificationLevel === 'premium_verified') {
      reasons.push('premium verification status');
    }

    if (provider.qualityProfile.aggregateRating && provider.qualityProfile.aggregateRating.average >= 4.5) {
      reasons.push(`excellent reviews (${provider.qualityProfile.aggregateRating.average}/5)`);
    }

    return `${provider.displayName} is recommended based on ${reasons.join(', ')}.`;
  }

  private generateConsiderations(provider: EducationalProvider): string[] {
    const considerations: string[] = [];

    if (provider.qualityProfile.dataCompleteness < 0.7) {
      considerations.push('Some profile information is incomplete - consider requesting more details');
    }

    if (provider.qualityProfile.aggregateRating && provider.qualityProfile.aggregateRating.count < 10) {
      considerations.push('Limited number of reviews available');
    }

    if (provider.qualityProfile.verificationLevel === 'unverified' || provider.qualityProfile.verificationLevel === 'email_verified') {
      considerations.push('Provider has not completed full verification');
    }

    return considerations;
  }

  private generateAlternativeReason(alternative: EducationalProvider, recommended: EducationalProvider): string {
    if (alternative.qualityProfile.staffQualifications &&
        recommended.qualityProfile.staffQualifications &&
        alternative.qualityProfile.staffQualifications.studentTeacherRatio < recommended.qualityProfile.staffQualifications.studentTeacherRatio) {
      return 'Smaller class sizes';
    }

    if (alternative.qualityProfile.aggregateRating &&
        recommended.qualityProfile.aggregateRating &&
        alternative.qualityProfile.aggregateRating.average > recommended.qualityProfile.aggregateRating.average) {
      return 'Higher parent ratings';
    }

    return 'Alternative option with different strengths';
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
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
      online_academy: 'Online Academy'
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
      premium_verified: 'Premium Verified'
    };
    return labels[level] ?? level;
  }
}
