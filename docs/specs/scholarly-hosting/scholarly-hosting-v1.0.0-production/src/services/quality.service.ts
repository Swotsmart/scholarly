/**
 * Educational Quality Service
 * 
 * Manages quality scores, outcome verification, and compliance for educational providers.
 * This is the core of Scholarly's trust moat - verified educational outcomes.
 * 
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import {
  EducationalQualityProfile,
  QualityScoreBreakdown,
  VerifiedOutcome,
  OutcomeType,
  Accreditation,
  StaffQualificationSummary,
  ComplianceRecord,
  VerificationLevel,
  RegistrationStatus,
  AggregateRating,
  ProviderType,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError
} from '../types';

import {
  getPool,
  publishEvent,
  logger,
  validators,
  generateId,
  getQualityWeightsForType
} from '../infrastructure';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface QualityProfileRepository {
  findByProviderId(providerId: string): Promise<EducationalQualityProfile | null>;
  update(providerId: string, updates: Partial<EducationalQualityProfile>): Promise<EducationalQualityProfile>;
  addOutcome(providerId: string, outcome: Omit<VerifiedOutcome, 'id'>): Promise<VerifiedOutcome>;
  addAccreditation(providerId: string, accreditation: Omit<Accreditation, 'id'>): Promise<Accreditation>;
  updateAccreditation(providerId: string, accreditationId: string, updates: Partial<Accreditation>): Promise<Accreditation>;
  addComplianceRecord(providerId: string, record: Omit<ComplianceRecord, 'id'>): Promise<ComplianceRecord>;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface OutcomeSubmission {
  type: OutcomeType;
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

export interface AccreditationSubmission {
  body: string;
  type: string;
  level?: string;
  issuedAt: Date;
  expiresAt?: Date;
  verificationUrl?: string;
  documentUrl?: string;
}

export interface StaffQualificationsUpdate {
  totalStaff: number;
  teachingStaff: number;
  qualifiedTeachers: number;
  advancedDegrees?: number;
  averageExperienceYears?: number;
  studentTeacherRatio?: number;
  specialistStaff?: { area: string; count: number }[];
}

export interface RegistrationSubmission {
  registrationNumber: string;
  registrationBody: string;
  registeredAt: Date;
  expiresAt?: Date;
  verificationUrl?: string;
  sector: 'government' | 'catholic' | 'independent';
  schoolType?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EducationalQualityService {
  constructor(
    private readonly repository: QualityProfileRepository,
    private readonly providerRepository: { findById(id: string): Promise<{ type: ProviderType } | null> }
  ) {}

  /**
   * Get quality profile for a provider.
   */
  async getQualityProfile(providerId: string): Promise<Result<EducationalQualityProfile>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      return success(profile);
    } catch (error) {
      logger.error({ error, providerId }, 'Failed to get quality profile');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Calculate and update quality score for a provider.
   */
  async calculateQualityScore(providerId: string): Promise<Result<QualityScoreBreakdown>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      const provider = await this.providerRepository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
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
        engagement: this.scoreEngagement(profile)
      };

      // Calculate weighted overall score
      const overall = Object.entries(components).reduce(
        (sum, [key, score]) => sum + score * (weights[key] ?? 0),
        0
      );

      const scoreBreakdown: QualityScoreBreakdown = {
        ...components,
        weights
      };

      // Update profile
      const confidenceLevel = this.calculateConfidence(profile);
      const dataCompleteness = this.calculateDataCompleteness(profile);

      await this.repository.update(providerId, {
        overallScore: Math.round(overall),
        scoreBreakdown,
        confidenceLevel,
        dataCompleteness
      });

      await publishEvent('quality.score_updated', providerId, {
        overallScore: Math.round(overall),
        breakdown: scoreBreakdown
      });

      logger.info({ providerId, overallScore: Math.round(overall) }, 'Quality score calculated');
      return success(scoreBreakdown);

    } catch (error) {
      logger.error({ error, providerId }, 'Failed to calculate quality score');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Submit an outcome for verification.
   */
  async submitOutcome(providerId: string, submission: OutcomeSubmission): Promise<Result<VerifiedOutcome>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(submission.metric, 'metric');
      validators.nonEmptyString(submission.dataSource, 'dataSource');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      // Calculate percentile if comparison value provided
      let percentile: number | null = null;
      if (submission.comparisonValue !== undefined) {
        percentile = this.calculatePercentile(submission.value, submission.comparisonValue, submission.type);
      }

      // Determine confidence level based on data source
      const confidenceLevel = this.determineOutcomeConfidence(submission.dataSource);

      const outcome: Omit<VerifiedOutcome, 'id'> = {
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
        validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year validity
      };

      const verified = await this.repository.addOutcome(providerId, outcome);

      await publishEvent('quality.outcome_verified', providerId, {
        outcomeId: verified.id,
        type: verified.type,
        metric: verified.metric,
        value: verified.value,
        percentile: verified.percentile
      });

      // Recalculate quality score
      await this.calculateQualityScore(providerId);

      logger.info({ providerId, outcomeId: verified.id, type: verified.type }, 'Outcome verified');
      return success(verified);

    } catch (error) {
      logger.error({ error, providerId, submission }, 'Failed to submit outcome');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Add an accreditation.
   */
  async addAccreditation(providerId: string, submission: AccreditationSubmission): Promise<Result<Accreditation>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(submission.body, 'body');
      validators.nonEmptyString(submission.type, 'type');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      // Check for duplicate
      const existing = profile.accreditations.find(
        a => a.body === submission.body && a.type === submission.type
      );
      if (existing) {
        return failure(new ValidationError('Accreditation already exists', 'body'));
      }

      const accreditation: Omit<Accreditation, 'id'> = {
        body: submission.body,
        type: submission.type,
        level: submission.level ?? null,
        issuedAt: submission.issuedAt,
        expiresAt: submission.expiresAt ?? null,
        verificationUrl: submission.verificationUrl ?? null,
        status: 'pending',
        verifiedByScholarly: false,
        verifiedAt: null
      };

      const added = await this.repository.addAccreditation(providerId, accreditation);

      await publishEvent('quality.accreditation_added', providerId, {
        accreditationId: added.id,
        body: added.body,
        type: added.type
      });

      // Recalculate quality score
      await this.calculateQualityScore(providerId);

      logger.info({ providerId, accreditationId: added.id }, 'Accreditation added');
      return success(added);

    } catch (error) {
      logger.error({ error, providerId, submission }, 'Failed to add accreditation');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Verify an accreditation (internal use).
   */
  async verifyAccreditation(providerId: string, accreditationId: string): Promise<Result<Accreditation>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      const accreditation = profile.accreditations.find(a => a.id === accreditationId);
      if (!accreditation) {
        return failure(new NotFoundError('Accreditation', accreditationId));
      }

      const updated = await this.repository.updateAccreditation(providerId, accreditationId, {
        status: 'active',
        verifiedByScholarly: true,
        verifiedAt: new Date()
      });

      await this.calculateQualityScore(providerId);

      logger.info({ providerId, accreditationId }, 'Accreditation verified');
      return success(updated);

    } catch (error) {
      logger.error({ error, providerId, accreditationId }, 'Failed to verify accreditation');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update staff qualifications.
   */
  async updateStaffQualifications(providerId: string, update: StaffQualificationsUpdate): Promise<Result<StaffQualificationSummary>> {
    try {
      validators.providerId(providerId);
      validators.positiveNumber(update.totalStaff, 'totalStaff');
      validators.positiveNumber(update.teachingStaff, 'teachingStaff');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      const staffQualifications: StaffQualificationSummary = {
        totalStaff: update.totalStaff,
        teachingStaff: update.teachingStaff,
        qualifiedTeachers: update.qualifiedTeachers,
        advancedDegrees: update.advancedDegrees ?? 0,
        averageExperienceYears: update.averageExperienceYears ?? 0,
        studentTeacherRatio: update.studentTeacherRatio ?? 0,
        specialistStaff: update.specialistStaff ?? [],
        lastUpdated: new Date(),
        verifiedByScholarly: false
      };

      await this.repository.update(providerId, { staffQualifications });
      await this.calculateQualityScore(providerId);

      logger.info({ providerId }, 'Staff qualifications updated');
      return success(staffQualifications);

    } catch (error) {
      logger.error({ error, providerId, update }, 'Failed to update staff qualifications');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Submit registration details for verification.
   */
  async submitRegistration(providerId: string, submission: RegistrationSubmission): Promise<Result<EducationalQualityProfile>> {
    try {
      validators.providerId(providerId);
      validators.nonEmptyString(submission.registrationNumber, 'registrationNumber');
      validators.nonEmptyString(submission.registrationBody, 'registrationBody');

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
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
          schoolType: submission.schoolType ?? null
        }
      });

      await this.calculateQualityScore(providerId);

      logger.info({ providerId }, 'Registration submitted');
      return success(updated);

    } catch (error) {
      logger.error({ error, providerId, submission }, 'Failed to submit registration');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Verify registration (internal use - would integrate with government APIs).
   */
  async verifyRegistration(providerId: string): Promise<Result<EducationalQualityProfile>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      if (!profile.registrationDetails) {
        return failure(new ValidationError('No registration details submitted', 'registrationDetails'));
      }

      // In production, this would verify against government APIs
      const updated = await this.repository.update(providerId, {
        registrationStatus: 'registered',
        verificationLevel: this.upgradeVerificationLevel(profile.verificationLevel, 'registration_verified'),
        lastVerificationDate: new Date()
      });

      await publishEvent('provider.verified', providerId, {
        verificationType: 'registration',
        verificationLevel: updated.verificationLevel
      });

      await this.calculateQualityScore(providerId);

      logger.info({ providerId }, 'Registration verified');
      return success(updated);

    } catch (error) {
      logger.error({ error, providerId }, 'Failed to verify registration');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Add a compliance record.
   */
  async addComplianceRecord(providerId: string, record: Omit<ComplianceRecord, 'id'>): Promise<Result<ComplianceRecord>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      const added = await this.repository.addComplianceRecord(providerId, record);

      await publishEvent('quality.compliance_updated', providerId, {
        recordId: added.id,
        type: added.type,
        status: added.status
      });

      // Update overall compliance status
      await this.updateComplianceStatus(providerId);
      await this.calculateQualityScore(providerId);

      logger.info({ providerId, recordId: added.id }, 'Compliance record added');
      return success(added);

    } catch (error) {
      logger.error({ error, providerId, record }, 'Failed to add compliance record');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get verified outcomes for a provider.
   */
  async getVerifiedOutcomes(providerId: string): Promise<Result<VerifiedOutcome[]>> {
    try {
      validators.providerId(providerId);

      const profile = await this.repository.findByProviderId(providerId);
      if (!profile) {
        return failure(new NotFoundError('QualityProfile', providerId));
      }

      // Filter to only valid, verified outcomes
      const validOutcomes = profile.verifiedOutcomes.filter(o => 
        o.confidenceLevel >= 0.5 &&
        (!o.validUntil || o.validUntil > new Date())
      );

      return success(validOutcomes);

    } catch (error) {
      logger.error({ error, providerId }, 'Failed to get verified outcomes');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ===========================================================================
  // SCORING METHODS
  // ===========================================================================

  private scoreRegistration(profile: EducationalQualityProfile): number {
    switch (profile.registrationStatus) {
      case 'accredited': return 100;
      case 'registered': return 80;
      case 'pending_registration': return 40;
      case 'exempt': return 60;
      case 'unregistered': return 0;
      default: return 0;
    }
  }

  private scoreAccreditations(accreditations: Accreditation[]): number {
    if (accreditations.length === 0) return 0;

    const activeAccreditations = accreditations.filter(a => a.status === 'active');
    if (activeAccreditations.length === 0) return 10;

    // Premium accreditations worth more
    const premiumBodies = ['IB World School', 'CRICOS', 'NESA', 'VRQA'];
    const hasPremium = activeAccreditations.some(a => premiumBodies.includes(a.body));
    
    const verifiedCount = activeAccreditations.filter(a => a.verifiedByScholarly).length;
    
    let score = Math.min(activeAccreditations.length * 20, 60);
    if (hasPremium) score += 20;
    if (verifiedCount > 0) score += 20;

    return Math.min(score, 100);
  }

  private scoreOutcomes(outcomes: VerifiedOutcome[]): number {
    if (outcomes.length === 0) return 0;

    const validOutcomes = outcomes.filter(o => 
      o.confidenceLevel >= 0.5 &&
      (!o.validUntil || o.validUntil > new Date())
    );

    if (validOutcomes.length === 0) return 10;

    // Score based on percentiles
    const percentiles = validOutcomes
      .filter(o => o.percentile !== null)
      .map(o => o.percentile!);

    if (percentiles.length === 0) {
      return Math.min(validOutcomes.length * 15, 50);
    }

    const avgPercentile = percentiles.reduce((a, b) => a + b, 0) / percentiles.length;
    
    // Convert percentile to score (50th percentile = 50 points, 90th = 90 points)
    let score = avgPercentile;
    
    // Bonus for multiple verified outcomes
    score += Math.min(validOutcomes.length * 5, 20);

    // Bonus for high confidence
    const avgConfidence = validOutcomes.reduce((a, b) => a + b.confidenceLevel, 0) / validOutcomes.length;
    if (avgConfidence >= 0.8) score += 10;

    return Math.min(Math.round(score), 100);
  }

  private scoreReviews(aggregateRating: AggregateRating | null): number {
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

  private scoreStaff(staff: StaffQualificationSummary | null): number {
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

  private scoreCompliance(records: ComplianceRecord[]): number {
    if (records.length === 0) return 50; // Neutral if not assessed

    const activeRecords = records.filter(r => 
      !r.expiresAt || r.expiresAt > new Date()
    );

    if (activeRecords.length === 0) return 30;

    const compliantCount = activeRecords.filter(r => r.status === 'compliant').length;
    const nonCompliantCount = activeRecords.filter(r => r.status === 'non_compliant').length;

    if (nonCompliantCount > 0) return Math.max(0, 50 - (nonCompliantCount * 25));

    const compliancePct = (compliantCount / activeRecords.length) * 100;
    return Math.min(Math.round(compliancePct), 100);
  }

  private scoreEngagement(profile: EducationalQualityProfile): number {
    let score = 30; // Base score for being on platform

    // Verification level bonuses
    switch (profile.verificationLevel) {
      case 'premium_verified': score += 40; break;
      case 'outcomes_verified': score += 30; break;
      case 'registration_verified': score += 20; break;
      case 'identity_verified': score += 15; break;
      case 'email_verified': score += 10; break;
    }

    // Data completeness bonus
    score += Math.round(profile.dataCompleteness * 30);

    return Math.min(score, 100);
  }

  // ===========================================================================
  // HELPER METHODS
  // ===========================================================================

  private calculatePercentile(value: number, comparisonValue: number, type: OutcomeType): number {
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

    if (highConfidenceSources.some(s => sourceLower.includes(s))) return 0.95;
    if (mediumConfidenceSources.some(s => sourceLower.includes(s))) return 0.75;
    return 0.5;
  }

  private determineVerifier(dataSource: string): string {
    const sourceLower = dataSource.toLowerCase();
    
    if (sourceLower.includes('myschool') || sourceLower.includes('acara')) return 'myschool';
    if (sourceLower.includes('naplan')) return 'naplan';
    if (sourceLower.includes('government')) return 'government';
    return 'scholarly';
  }

  private calculateConfidence(profile: EducationalQualityProfile): number {
    let confidence = 0.2; // Base confidence

    if (profile.registrationStatus === 'registered' || profile.registrationStatus === 'accredited') {
      confidence += 0.2;
    }

    if (profile.verifiedOutcomes.length > 0) {
      const avgOutcomeConfidence = profile.verifiedOutcomes.reduce((a, b) => a + b.confidenceLevel, 0) / profile.verifiedOutcomes.length;
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

  private calculateDataCompleteness(profile: EducationalQualityProfile): number {
    const fields = [
      profile.registrationDetails !== null,
      profile.accreditations.length > 0,
      profile.verifiedOutcomes.length > 0,
      profile.aggregateRating !== null,
      profile.staffQualifications !== null,
      profile.complianceRecords.length > 0
    ];

    return fields.filter(Boolean).length / fields.length;
  }

  private upgradeVerificationLevel(current: VerificationLevel, achieved: string): VerificationLevel {
    const levels: VerificationLevel[] = [
      'unverified',
      'email_verified',
      'identity_verified',
      'registration_verified',
      'outcomes_verified',
      'premium_verified'
    ];

    const currentIndex = levels.indexOf(current);
    
    switch (achieved) {
      case 'email_verified': return levels[Math.max(currentIndex, 1)];
      case 'identity_verified': return levels[Math.max(currentIndex, 2)];
      case 'registration_verified': return levels[Math.max(currentIndex, 3)];
      case 'outcomes_verified': return levels[Math.max(currentIndex, 4)];
      case 'premium_verified': return 'premium_verified';
      default: return current;
    }
  }

  private async updateComplianceStatus(providerId: string): Promise<void> {
    const profile = await this.repository.findByProviderId(providerId);
    if (!profile) return;

    const activeRecords = profile.complianceRecords.filter(r => 
      !r.expiresAt || r.expiresAt > new Date()
    );

    let status: 'compliant' | 'minor_issues' | 'major_issues' | 'not_assessed';

    if (activeRecords.length === 0) {
      status = 'not_assessed';
    } else {
      const nonCompliantCount = activeRecords.filter(r => r.status === 'non_compliant').length;
      const pendingCount = activeRecords.filter(r => r.status === 'pending').length;

      if (nonCompliantCount >= 2) status = 'major_issues';
      else if (nonCompliantCount === 1 || pendingCount >= 2) status = 'minor_issues';
      else status = 'compliant';
    }

    await this.repository.update(providerId, { complianceStatus: status });
  }
}
