/**
 * Hosting Quality Service
 *
 * Manages quality scores, outcome verification, and compliance for educational providers.
 * This is the core of Scholarly's trust moat - verified educational outcomes.
 *
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import { Result, success, failure } from './base.service';

import {
  HostingEducationalQualityProfile,
  HostingQualityScoreBreakdown,
  HostingVerifiedOutcome,
  HostingOutcomeType,
  HostingAccreditation,
  HostingStaffQualificationSummary,
  HostingComplianceRecord,
  HostingVerificationLevel,
  HostingAggregateRating,
  HostingProviderType,
} from './hosting-types';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface HostingQualityProfileRepository {
  findByProviderId(
    providerId: string
  ): Promise<HostingEducationalQualityProfile | null>;
  update(
    providerId: string,
    updates: Partial<HostingEducationalQualityProfile>
  ): Promise<HostingEducationalQualityProfile>;
  addOutcome(
    providerId: string,
    outcome: Omit<HostingVerifiedOutcome, 'id'>
  ): Promise<HostingVerifiedOutcome>;
  addAccreditation(
    providerId: string,
    accreditation: Omit<HostingAccreditation, 'id'>
  ): Promise<HostingAccreditation>;
  updateAccreditation(
    providerId: string,
    accreditationId: string,
    updates: Partial<HostingAccreditation>
  ): Promise<HostingAccreditation>;
  addComplianceRecord(
    providerId: string,
    record: Omit<HostingComplianceRecord, 'id'>
  ): Promise<HostingComplianceRecord>;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface HostingOutcomeSubmission {
  type: HostingOutcomeType;
  metric: string;
  value: number;
  unit?: string;
  comparisonBasis: string;
  comparisonValue?: number;
  year: number;
  cohortSize?: number;
  dataSource: string;
  supportingDocumentUrl?: string;
}

export interface HostingAccreditationSubmission {
  body: string;
  type: string;
  level?: string;
  issuedAt: Date;
  expiresAt?: Date;
  verificationUrl?: string;
  documentUrl?: string;
}

export interface HostingStaffQualificationsUpdate {
  totalStaff: number;
  teachingStaff: number;
  qualifiedTeachers: number;
  advancedDegrees?: number;
  averageExperienceYears?: number;
  studentTeacherRatio?: number;
  specialistStaff?: { area: string; count: number }[];
}

export interface HostingRegistrationSubmission {
  registrationNumber: string;
  registrationBody: string;
  registeredAt: Date;
  expiresAt?: Date;
  verificationUrl?: string;
  sector: 'government' | 'catholic' | 'independent';
  schoolType?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

function getQualityWeightsForType(
  type: HostingProviderType
): HostingQualityScoreBreakdown['weights'] {
  const defaultWeights = {
    registration: 0.2,
    accreditation: 0.15,
    outcomes: 0.25,
    reviews: 0.15,
    staffQualifications: 0.15,
    compliance: 0.05,
    engagement: 0.05,
  };

  switch (type) {
    case 'school':
      return {
        ...defaultWeights,
        registration: 0.25,
        outcomes: 0.3,
        staffQualifications: 0.15,
      };
    case 'solo_tutor':
      return {
        ...defaultWeights,
        registration: 0.1,
        reviews: 0.3,
        outcomes: 0.2,
      };
    case 'homeschool_coop':
      return {
        ...defaultWeights,
        registration: 0.05,
        engagement: 0.2,
        reviews: 0.25,
      };
    default:
      return defaultWeights;
  }
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
  positiveNumber(value: number, field: string): void {
    if (typeof value !== 'number' || value <= 0 || isNaN(value)) {
      throw new Error(`${field} must be a positive number`);
    }
  },
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class HostingQualityService {
  constructor(
    private readonly repository: HostingQualityProfileRepository,
    private readonly providerRepository: {
      findById(id: string): Promise<{ type: HostingProviderType } | null>;
    }
  ) {}

  /**
   * Get quality profile for a provider.
   */
  async getQualityProfile(
    providerId: string
  ): Promise<Result<HostingEducationalQualityProfile>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      return success(profile);
    } catch (error) {
      log.error('Failed to get quality profile', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Calculate and update quality score for a provider.
   */
  async calculateQualityScore(
    providerId: string
  ): Promise<Result<HostingQualityScoreBreakdown>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      const weights = getQualityWeightsForType(provider.type);

      // Calculate component scores
      const components = {
        registration: this.scoreRegistration(profile),
        accreditation: this.scoreAccreditations(profile.accreditations),
        outcomes: this.scoreOutcomes(profile.verifiedOutcomes),
        reviews: this.scoreReviews(profile.aggregateRating),
        staffQualifications: this.scoreStaff(profile.staffQualifications),
        compliance: this.scoreCompliance(profile.complianceRecords),
        engagement: this.scoreEngagement(profile),
      };

      // Calculate weighted overall score
      const overall = Object.entries(components).reduce(
        (sum, [key, score]) =>
          sum + score * (weights[key as keyof typeof weights] ?? 0),
        0
      );

      const scoreBreakdown: HostingQualityScoreBreakdown = {
        ...components,
        weights,
      };

      // Update profile
      const confidenceLevel = this.calculateConfidence(profile);
      const dataCompleteness = this.calculateDataCompleteness(profile);

      await this.repository.update(providerId, {
        overallScore: Math.round(overall),
        scoreBreakdown,
        confidenceLevel,
        dataCompleteness,
      });

      log.info('Quality score calculated', {
        providerId,
        overallScore: Math.round(overall),
      });

      return success(scoreBreakdown);
    } catch (error) {
      log.error('Failed to calculate quality score', error as Error, {
        providerId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Submit an outcome for verification.
   */
  async submitOutcome(
    providerId: string,
    submission: HostingOutcomeSubmission
  ): Promise<Result<HostingVerifiedOutcome>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(submission.metric, 'metric');
      validators.nonEmptyString(submission.dataSource, 'dataSource');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      // Calculate percentile if comparison value provided
      let percentile: number | null = null;
      if (submission.comparisonValue !== undefined) {
        percentile = this.calculatePercentile(
          submission.value,
          submission.comparisonValue,
          submission.type
        );
      }

      // Determine confidence level based on data source
      const confidenceLevel = this.determineOutcomeConfidence(
        submission.dataSource
      );

      const outcome: Omit<HostingVerifiedOutcome, 'id'> = {
        type: submission.type,
        metric: submission.metric,
        value: submission.value,
        unit: submission.unit ?? null,
        comparisonBasis: submission.comparisonBasis,
        comparisonValue: submission.comparisonValue ?? null,
        percentile,
        year: submission.year,
        cohortSize: submission.cohortSize ?? null,
        verifiedAt: new Date(),
        verifiedBy: this.determineVerifier(submission.dataSource),
        dataSource: submission.dataSource,
        confidenceLevel,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year validity
      };

      const verified = await this.repository.addOutcome(providerId, outcome);

      // Recalculate quality score
      await this.calculateQualityScore(providerId);

      log.info('Outcome verified', {
        providerId,
        outcomeId: verified.id,
        type: verified.type,
      });

      return success(verified);
    } catch (error) {
      log.error('Failed to submit outcome', error as Error, {
        providerId,
        submission,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Add an accreditation.
   */
  async addAccreditation(
    providerId: string,
    submission: HostingAccreditationSubmission
  ): Promise<Result<HostingAccreditation>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(submission.body, 'body');
      validators.nonEmptyString(submission.type, 'type');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      // Check for duplicate
      const existing = profile.accreditations.find(
        (a) => a.body === submission.body && a.type === submission.type
      );
      if (existing) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: 'Accreditation already exists',
          details: { body: submission.body, type: submission.type },
        });
      }

      const accreditation: Omit<HostingAccreditation, 'id'> = {
        body: submission.body,
        type: submission.type,
        level: submission.level ?? null,
        issuedAt: submission.issuedAt,
        expiresAt: submission.expiresAt ?? null,
        verificationUrl: submission.verificationUrl ?? null,
        status: 'pending',
        verifiedByScholarly: false,
        verifiedAt: null,
      };

      const added = await this.repository.addAccreditation(
        providerId,
        accreditation
      );

      // Recalculate quality score
      await this.calculateQualityScore(providerId);

      log.info('Accreditation added', {
        providerId,
        accreditationId: added.id,
      });

      return success(added);
    } catch (error) {
      log.error('Failed to add accreditation', error as Error, {
        providerId,
        submission,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Verify an accreditation (internal use).
   */
  async verifyAccreditation(
    providerId: string,
    accreditationId: string
  ): Promise<Result<HostingAccreditation>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      const accreditation = profile.accreditations.find(
        (a) => a.id === accreditationId
      );
      if (!accreditation) {
        return failure({
          code: 'NOT_FOUND',
          message: `Accreditation not found: ${accreditationId}`,
          details: { accreditationId },
        });
      }

      const updated = await this.repository.updateAccreditation(
        providerId,
        accreditationId,
        {
          status: 'active',
          verifiedByScholarly: true,
          verifiedAt: new Date(),
        }
      );

      await this.calculateQualityScore(providerId);

      log.info('Accreditation verified', { providerId, accreditationId });
      return success(updated);
    } catch (error) {
      log.error('Failed to verify accreditation', error as Error, {
        providerId,
        accreditationId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update staff qualifications.
   */
  async updateStaffQualifications(
    providerId: string,
    update: HostingStaffQualificationsUpdate
  ): Promise<Result<HostingStaffQualificationSummary>> {
    try {
      validators.providerId(providerId);
      validators.positiveNumber(update.totalStaff, 'totalStaff');
      validators.positiveNumber(update.teachingStaff, 'teachingStaff');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      const staffQualifications: HostingStaffQualificationSummary = {
        totalStaff: update.totalStaff,
        teachingStaff: update.teachingStaff,
        qualifiedTeachers: update.qualifiedTeachers,
        advancedDegrees: update.advancedDegrees ?? 0,
        averageExperienceYears: update.averageExperienceYears ?? 0,
        studentTeacherRatio: update.studentTeacherRatio ?? 0,
        specialistStaff: update.specialistStaff ?? [],
        lastUpdated: new Date(),
        verifiedByScholarly: false,
      };

      await this.repository.update(providerId, { staffQualifications });
      await this.calculateQualityScore(providerId);

      log.info('Staff qualifications updated', { providerId });
      return success(staffQualifications);
    } catch (error) {
      log.error('Failed to update staff qualifications', error as Error, {
        providerId,
        update,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Submit registration details for verification.
   */
  async submitRegistration(
    providerId: string,
    submission: HostingRegistrationSubmission
  ): Promise<Result<HostingEducationalQualityProfile>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(
        submission.registrationNumber,
        'registrationNumber'
      );
      validators.nonEmptyString(submission.registrationBody, 'registrationBody');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      const updated = await this.repository.update(providerId, {
        registrationStatus: 'pending_registration',
        registrationDetails: {
          registrationNumber: submission.registrationNumber,
          registrationBody: submission.registrationBody,
          registeredAt: submission.registeredAt,
          expiresAt: submission.expiresAt ?? null,
          verificationUrl: submission.verificationUrl ?? null,
          sector: submission.sector,
          schoolType: submission.schoolType ?? null,
        },
      });

      await this.calculateQualityScore(providerId);

      log.info('Registration submitted', { providerId });
      return success(updated);
    } catch (error) {
      log.error('Failed to submit registration', error as Error, {
        providerId,
        submission,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Verify registration (internal use - would integrate with government APIs).
   */
  async verifyRegistration(
    providerId: string
  ): Promise<Result<HostingEducationalQualityProfile>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      if (!profile.registrationDetails) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: 'No registration details submitted',
          details: { field: 'registrationDetails' },
        });
      }

      // In production, this would verify against government APIs
      const updated = await this.repository.update(providerId, {
        registrationStatus: 'registered',
        verificationLevel: this.upgradeVerificationLevel(
          profile.verificationLevel,
          'registration_verified'
        ),
        lastVerificationDate: new Date(),
      });

      await this.calculateQualityScore(providerId);

      log.info('Registration verified', { providerId });
      return success(updated);
    } catch (error) {
      log.error('Failed to verify registration', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Add a compliance record.
   */
  async addComplianceRecord(
    providerId: string,
    record: Omit<HostingComplianceRecord, 'id'>
  ): Promise<Result<HostingComplianceRecord>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      const added = await this.repository.addComplianceRecord(providerId, record);

      // Update overall compliance status
      await this.updateComplianceStatus(providerId);
      await this.calculateQualityScore(providerId);

      log.info('Compliance record added', {
        providerId,
        recordId: added.id,
      });

      return success(added);
    } catch (error) {
      log.error('Failed to add compliance record', error as Error, {
        providerId,
        record,
      });
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

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure({
          code: 'NOT_FOUND',
          message: `Quality profile not found for provider: ${providerId}`,
          details: { providerId },
        });
      }

      // Filter to only valid, verified outcomes
      const validOutcomes = profile.verifiedOutcomes.filter(
        (o) =>
          o.confidenceLevel >= 0.5 &&
          (!o.validUntil || o.validUntil > new Date())
      );

      return success(validOutcomes);
    } catch (error) {
      log.error('Failed to get verified outcomes', error as Error, {
        providerId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // SCORING METHODS
  // ===========================================================================

  private scoreRegistration(profile: HostingEducationalQualityProfile): number {
    switch (profile.registrationStatus) {
      case 'accredited':
        return 100;
      case 'registered':
        return 80;
      case 'pending_registration':
        return 40;
      case 'exempt':
        return 60;
      case 'unregistered':
        return 0;
      default:
        return 0;
    }
  }

  private scoreAccreditations(accreditations: HostingAccreditation[]): number {
    if (accreditations.length === 0) return 0;

    const activeAccreditations = accreditations.filter(
      (a) => a.status === 'active'
    );
    if (activeAccreditations.length === 0) return 10;

    // Premium accreditations worth more
    const premiumBodies = ['IB World School', 'CRICOS', 'NESA', 'VRQA'];
    const hasPremium = activeAccreditations.some((a) =>
      premiumBodies.includes(a.body)
    );

    const verifiedCount = activeAccreditations.filter(
      (a) => a.verifiedByScholarly
    ).length;

    let score = Math.min(activeAccreditations.length * 20, 60);
    if (hasPremium) score += 20;
    if (verifiedCount > 0) score += 20;

    return Math.min(score, 100);
  }

  private scoreOutcomes(outcomes: HostingVerifiedOutcome[]): number {
    if (outcomes.length === 0) return 0;

    const validOutcomes = outcomes.filter(
      (o) =>
        o.confidenceLevel >= 0.5 && (!o.validUntil || o.validUntil > new Date())
    );

    if (validOutcomes.length === 0) return 10;

    // Score based on percentiles
    const percentiles = validOutcomes
      .filter((o) => o.percentile !== null)
      .map((o) => o.percentile!);

    if (percentiles.length === 0) {
      return Math.min(validOutcomes.length * 15, 50);
    }

    const avgPercentile =
      percentiles.reduce((a, b) => a + b, 0) / percentiles.length;

    // Convert percentile to score (50th percentile = 50 points, 90th = 90 points)
    let score = avgPercentile;

    // Bonus for multiple verified outcomes
    score += Math.min(validOutcomes.length * 5, 20);

    // Bonus for high confidence
    const avgConfidence =
      validOutcomes.reduce((a, b) => a + b.confidenceLevel, 0) /
      validOutcomes.length;
    if (avgConfidence >= 0.8) score += 10;

    return Math.min(Math.round(score), 100);
  }

  private scoreReviews(aggregateRating: HostingAggregateRating | null): number {
    if (!aggregateRating) return 0;
    if (aggregateRating.count === 0) return 0;

    // Base score from average rating (1-5 scale to 0-100)
    let score = (aggregateRating.average - 1) * 25;

    // Bonus for review count
    if (aggregateRating.count >= 50) score += 15;
    else if (aggregateRating.count >= 20) score += 10;
    else if (aggregateRating.count >= 10) score += 5;

    // Bonus for recommendation rate
    if (aggregateRating.recommendationRate >= 90) score += 10;
    else if (aggregateRating.recommendationRate >= 80) score += 5;

    return Math.min(Math.round(score), 100);
  }

  private scoreStaff(
    staff: HostingStaffQualificationSummary | null
  ): number {
    if (!staff) return 0;

    let score = 0;

    // Qualified teachers percentage
    if (staff.teachingStaff > 0) {
      const qualifiedPct = (staff.qualifiedTeachers / staff.teachingStaff) * 100;
      score += Math.min(qualifiedPct * 0.4, 40);
    }

    // Student-teacher ratio (lower is better)
    if (staff.studentTeacherRatio > 0) {
      if (staff.studentTeacherRatio <= 10) score += 25;
      else if (staff.studentTeacherRatio <= 15) score += 20;
      else if (staff.studentTeacherRatio <= 20) score += 15;
      else if (staff.studentTeacherRatio <= 25) score += 10;
      else score += 5;
    }

    // Average experience
    if (staff.averageExperienceYears >= 10) score += 15;
    else if (staff.averageExperienceYears >= 5) score += 10;
    else if (staff.averageExperienceYears >= 2) score += 5;

    // Advanced degrees
    if (staff.teachingStaff > 0) {
      const advancedPct = (staff.advancedDegrees / staff.teachingStaff) * 100;
      score += Math.min(advancedPct * 0.2, 20);
    }

    return Math.min(Math.round(score), 100);
  }

  private scoreCompliance(records: HostingComplianceRecord[]): number {
    if (records.length === 0) return 50; // Neutral if not assessed

    const activeRecords = records.filter(
      (r) => !r.expiresAt || r.expiresAt > new Date()
    );

    if (activeRecords.length === 0) return 30;

    const compliantCount = activeRecords.filter(
      (r) => r.status === 'compliant'
    ).length;
    const nonCompliantCount = activeRecords.filter(
      (r) => r.status === 'non_compliant'
    ).length;

    if (nonCompliantCount > 0)
      return Math.max(0, 50 - nonCompliantCount * 25);

    const compliancePct = (compliantCount / activeRecords.length) * 100;
    return Math.min(Math.round(compliancePct), 100);
  }

  private scoreEngagement(
    profile: HostingEducationalQualityProfile
  ): number {
    let score = 30; // Base score for being on platform

    // Verification level bonuses
    switch (profile.verificationLevel) {
      case 'premium_verified':
        score += 40;
        break;
      case 'outcomes_verified':
        score += 30;
        break;
      case 'registration_verified':
        score += 20;
        break;
      case 'identity_verified':
        score += 15;
        break;
      case 'email_verified':
        score += 10;
        break;
    }

    // Data completeness bonus
    score += Math.round(profile.dataCompleteness * 30);

    return Math.min(score, 100);
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private calculatePercentile(
    value: number,
    comparisonValue: number,
    type: HostingOutcomeType
  ): number {
    // Determine if higher is better
    const higherIsBetter = !['attendance_rate'].includes(type);

    if (higherIsBetter) {
      if (value >= comparisonValue * 1.2) return 90;
      if (value >= comparisonValue * 1.1) return 80;
      if (value >= comparisonValue) return 60;
      if (value >= comparisonValue * 0.9) return 40;
      return 20;
    } else {
      if (value <= comparisonValue * 0.8) return 90;
      if (value <= comparisonValue * 0.9) return 80;
      if (value <= comparisonValue) return 60;
      if (value <= comparisonValue * 1.1) return 40;
      return 20;
    }
  }

  private determineOutcomeConfidence(dataSource: string): number {
    const highConfidenceSources = ['myschool', 'naplan', 'government', 'acara'];
    const mediumConfidenceSources = ['standardised_test', 'external_assessment'];

    const sourceLower = dataSource.toLowerCase();

    if (highConfidenceSources.some((s) => sourceLower.includes(s))) return 0.95;
    if (mediumConfidenceSources.some((s) => sourceLower.includes(s)))
      return 0.75;
    return 0.5;
  }

  private determineVerifier(dataSource: string): string {
    const sourceLower = dataSource.toLowerCase();

    if (sourceLower.includes('myschool') || sourceLower.includes('acara'))
      return 'myschool';
    if (sourceLower.includes('naplan')) return 'naplan';
    if (sourceLower.includes('government')) return 'government';
    return 'scholarly';
  }

  private calculateConfidence(
    profile: HostingEducationalQualityProfile
  ): number {
    let confidence = 0.2; // Base confidence

    if (
      profile.registrationStatus === 'registered' ||
      profile.registrationStatus === 'accredited'
    ) {
      confidence += 0.2;
    }

    if (profile.verifiedOutcomes.length > 0) {
      const avgOutcomeConfidence =
        profile.verifiedOutcomes.reduce((a, b) => a + b.confidenceLevel, 0) /
        profile.verifiedOutcomes.length;
      confidence += avgOutcomeConfidence * 0.3;
    }

    if (profile.aggregateRating && profile.aggregateRating.count >= 10) {
      confidence += 0.15;
    }

    if (profile.staffQualifications?.verifiedByScholarly) {
      confidence += 0.15;
    }

    return Math.min(confidence, 1);
  }

  private calculateDataCompleteness(
    profile: HostingEducationalQualityProfile
  ): number {
    const fields = [
      profile.registrationDetails !== null,
      profile.accreditations.length > 0,
      profile.verifiedOutcomes.length > 0,
      profile.aggregateRating !== null,
      profile.staffQualifications !== null,
      profile.complianceRecords.length > 0,
    ];

    return fields.filter(Boolean).length / fields.length;
  }

  private upgradeVerificationLevel(
    current: HostingVerificationLevel,
    achieved: string
  ): HostingVerificationLevel {
    const levels: HostingVerificationLevel[] = [
      'unverified',
      'email_verified',
      'identity_verified',
      'registration_verified',
      'outcomes_verified',
      'premium_verified',
    ];

    const currentIndex = levels.indexOf(current);

    switch (achieved) {
      case 'email_verified':
        return levels[Math.max(currentIndex, 1)];
      case 'identity_verified':
        return levels[Math.max(currentIndex, 2)];
      case 'registration_verified':
        return levels[Math.max(currentIndex, 3)];
      case 'outcomes_verified':
        return levels[Math.max(currentIndex, 4)];
      case 'premium_verified':
        return 'premium_verified';
      default:
        return current;
    }
  }

  private async updateComplianceStatus(providerId: string): Promise<void> {
    const profile = await this.repository.findByProviderId(providerId);
    if (!profile) return;

    const activeRecords = profile.complianceRecords.filter(
      (r) => !r.expiresAt || r.expiresAt > new Date()
    );

    let status: 'compliant' | 'minor_issues' | 'major_issues' | 'not_assessed';

    if (activeRecords.length === 0) {
      status = 'not_assessed';
    } else {
      const nonCompliantCount = activeRecords.filter(
        (r) => r.status === 'non_compliant'
      ).length;
      const pendingCount = activeRecords.filter(
        (r) => r.status === 'pending'
      ).length;

      if (nonCompliantCount >= 2) status = 'major_issues';
      else if (nonCompliantCount === 1 || pendingCount >= 2)
        status = 'minor_issues';
      else status = 'compliant';
    }

    await this.repository.update(providerId, { complianceStatus: status });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let serviceInstance: HostingQualityService | null = null;

export function initializeHostingQualityService(
  repository: HostingQualityProfileRepository,
  providerRepository: {
    findById(id: string): Promise<{ type: HostingProviderType } | null>;
  }
): HostingQualityService {
  serviceInstance = new HostingQualityService(repository, providerRepository);
  return serviceInstance;
}

export function getHostingQualityService(): HostingQualityService {
  if (!serviceInstance) {
    throw new Error('HostingQualityService not initialized');
  }
  return serviceInstance;
}
