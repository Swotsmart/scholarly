/**
 * Trust Service
 *
 * Reputation and trust scoring service that aggregates signals from:
 * - Identity verification status
 * - Credential verification status
 * - Platform activity and history
 * - Transaction history
 * - Reviews and ratings
 * - Behavioral signals
 *
 * Produces a composite trust score used for:
 * - Platform feature access
 * - Transaction limits
 * - Priority matching (tutors, relief teachers)
 * - Risk-based decisioning
 *
 * @version 1.0.0
 */

import {
  Identity,
  BusinessIdentity,
  KycLevel,
  Credential,
  CredentialStatus,
  TrustScore,
  TrustComponent,
  TrustComponentScore,
  RiskAssessment,
  RiskLevel,
  RiskCategory,
  RiskFlag,
  IdentityRepository,
  CalculateTrustScoreInput,
  AssessRiskInput,
} from './identity-engine-types';

import { Result, success, failure, IdentityNotFoundError } from './identity-engine.service';

// ============================================================================
// INTERFACES
// ============================================================================

export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

export interface EventBus {
  publish(topic: string, tenantId: string, payload: Record<string, any>): Promise<void>;
}

/**
 * Platform data provider interface
 * Each platform implements this to provide activity data
 */
export interface PlatformDataProvider {
  /** Get transaction history for a user */
  getTransactionHistory(tenantId: string, userId: string): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    disputedTransactions: number;
    totalValue: number;
  }>;

  /** Get review/rating data for a user */
  getReviewData(tenantId: string, userId: string): Promise<{
    averageRating: number;
    totalReviews: number;
    positiveReviews: number;
    negativeReviews: number;
  }>;

  /** Get activity metrics for a user */
  getActivityMetrics(tenantId: string, userId: string): Promise<{
    accountAge: number; // days
    lastActiveAt: Date;
    responseRate: number; // percentage
    completionRate: number; // percentage
    cancellationRate: number; // percentage
  }>;

  /** Get endorsements/badges for a user */
  getEndorsements(tenantId: string, userId: string): Promise<{
    endorsementCount: number;
    badgeCount: number;
    featuredStatus: boolean;
  }>;
}

export interface TrustServiceConfig {
  /** Platform identifier */
  platformId: string;

  /** Cache TTL for trust scores (seconds) */
  scoreCacheTtlSeconds: number;

  /** Component weights (must sum to 100) */
  componentWeights: Record<TrustComponent, number>;

  /** Thresholds for trust tiers */
  tierThresholds: {
    basic: number;
    verified: number;
    trusted: number;
    highlyTrusted: number;
  };

  /** Risk thresholds */
  riskThresholds: {
    low: number;
    medium: number;
    high: number;
    veryHigh: number;
  };
}

const DEFAULT_CONFIG: TrustServiceConfig = {
  platformId: 'platform',
  scoreCacheTtlSeconds: 3600, // 1 hour
  componentWeights: {
    [TrustComponent.IDENTITY_VERIFICATION]: 20,
    [TrustComponent.CREDENTIAL_VERIFICATION]: 15,
    [TrustComponent.PLATFORM_HISTORY]: 10,
    [TrustComponent.TRANSACTION_HISTORY]: 15,
    [TrustComponent.REVIEW_SCORE]: 15,
    [TrustComponent.RESPONSE_RATE]: 5,
    [TrustComponent.COMPLETION_RATE]: 5,
    [TrustComponent.DISPUTE_HISTORY]: 5,
    [TrustComponent.TENURE]: 5,
    [TrustComponent.ACTIVITY_LEVEL]: 3,
    [TrustComponent.ENDORSEMENTS]: 2,
    [TrustComponent.COMMUNITY_STANDING]: 0
  },
  tierThresholds: {
    basic: 20,
    verified: 40,
    trusted: 60,
    highlyTrusted: 80
  },
  riskThresholds: {
    low: 20,
    medium: 40,
    high: 60,
    veryHigh: 80
  }
};

// ============================================================================
// SERVICE
// ============================================================================

export class TrustService {
  private config: TrustServiceConfig;

  constructor(
    private repo: IdentityRepository,
    private platformData: PlatformDataProvider,
    private eventBus: EventBus,
    private logger: Logger,
    config?: Partial<TrustServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // TRUST SCORE CALCULATION
  // ==========================================================================

  /**
   * Calculate trust score for an identity
   */
  async calculateTrustScore(
    tenantId: string,
    identityId: string,
    input: CalculateTrustScoreInput = {}
  ): Promise<Result<TrustScore>> {
    try {
      this.logger.info('Calculating trust score', { tenantId, identityId });

      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      // Check cache unless force recalculate
      if (!input.forceRecalculate && identity.trustScore) {
        const cacheAge = Date.now() - identity.trustScore.calculatedAt.getTime();
        if (cacheAge < this.config.scoreCacheTtlSeconds * 1000) {
          return success(identity.trustScore);
        }
      }

      // Get weights (custom or default)
      const weights = { ...this.config.componentWeights, ...input.customWeights };

      // Determine which components to calculate
      const components = input.components || Object.values(TrustComponent);

      // Calculate each component
      const componentScores: TrustComponentScore[] = [];
      const positiveFactors: string[] = [];
      const negativeFactors: string[] = [];
      const recommendations: string[] = [];

      for (const component of components) {
        const weight = weights[component] || 0;
        if (weight === 0) continue;

        const result = await this.calculateComponent(
          tenantId,
          identity,
          component,
          input.includePlatformData !== false
        );

        componentScores.push({
          component,
          score: result.score,
          weight,
          dataPoints: result.dataPoints,
          lastUpdated: new Date()
        });

        positiveFactors.push(...result.positiveFactors);
        negativeFactors.push(...result.negativeFactors);
        recommendations.push(...result.recommendations);
      }

      // Calculate overall score (weighted average)
      const totalWeight = componentScores.reduce((sum, c) => sum + c.weight, 0);
      const weightedSum = componentScores.reduce((sum, c) => sum + (c.score * c.weight), 0);
      const overall = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

      // Determine tier
      const tier = this.getTierForScore(overall);

      // Create trust score
      const trustScore: TrustScore = {
        overall,
        tier,
        components: componentScores,
        positiveFactors: [...new Set(positiveFactors)],
        negativeFactors: [...new Set(negativeFactors)],
        recommendations: [...new Set(recommendations)],
        calculatedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.scoreCacheTtlSeconds * 1000)
      };

      // Store the score
      await this.repo.updateTrustScore(identityId, trustScore);

      // Emit event if score changed significantly
      if (identity.trustScore && Math.abs(identity.trustScore.overall - overall) >= 10) {
        await this.publishEvent('trust.score_changed', tenantId, {
          identityId,
          previousScore: identity.trustScore.overall,
          newScore: overall,
          previousTier: identity.trustScore.tier,
          newTier: tier
        });
      }

      this.logger.info('Trust score calculated', { identityId, overall, tier });
      return success(trustScore);
    } catch (error) {
      this.logger.error('Failed to calculate trust score', error as Error, { tenantId, identityId });
      return failure(error as Error);
    }
  }

  /**
   * Calculate a single trust component
   */
  private async calculateComponent(
    tenantId: string,
    identity: Identity,
    component: TrustComponent,
    includePlatformData: boolean
  ): Promise<{
    score: number;
    dataPoints: number;
    positiveFactors: string[];
    negativeFactors: string[];
    recommendations: string[];
  }> {
    const positiveFactors: string[] = [];
    const negativeFactors: string[] = [];
    const recommendations: string[] = [];
    let score = 0;
    let dataPoints = 0;

    switch (component) {
      case TrustComponent.IDENTITY_VERIFICATION: {
        // Score based on KYC level
        const kycScores: Record<KycLevel, number> = {
          [KycLevel.NONE]: 0,
          [KycLevel.BASIC]: 40,
          [KycLevel.STANDARD]: 70,
          [KycLevel.ENHANCED]: 90,
          [KycLevel.BUSINESS]: 100
        };
        score = kycScores[identity.kycLevel];
        dataPoints = 1;

        if (identity.kycLevel >= KycLevel.STANDARD) {
          positiveFactors.push('Government ID verified');
        }
        if (identity.kycLevel >= KycLevel.ENHANCED) {
          positiveFactors.push('Enhanced verification complete');
        }
        if (identity.kycLevel < KycLevel.STANDARD) {
          recommendations.push('Complete identity verification to increase trust');
        }
        break;
      }

      case TrustComponent.CREDENTIAL_VERIFICATION: {
        const validCredentials = identity.credentials.filter(c => c.status === CredentialStatus.VALID);
        const totalCredentials = identity.credentials.length;

        if (totalCredentials === 0) {
          score = 0;
          recommendations.push('Add professional credentials to build trust');
        } else {
          score = Math.round((validCredentials.length / totalCredentials) * 100);
          dataPoints = totalCredentials;

          if (validCredentials.length > 0) {
            positiveFactors.push(`${validCredentials.length} verified credential(s)`);
          }

          const expiredCredentials = identity.credentials.filter(c => c.status === CredentialStatus.EXPIRED);
          if (expiredCredentials.length > 0) {
            negativeFactors.push(`${expiredCredentials.length} expired credential(s)`);
            recommendations.push('Renew expired credentials');
          }
        }
        break;
      }

      case TrustComponent.TRANSACTION_HISTORY: {
        if (!includePlatformData) {
          score = 50; // Neutral if no platform data
          break;
        }

        const txHistory = await this.platformData.getTransactionHistory(tenantId, identity.userId);
        dataPoints = txHistory.totalTransactions;

        if (txHistory.totalTransactions === 0) {
          score = 50; // Neutral for new users
          recommendations.push('Complete transactions to build trust history');
        } else {
          const successRate = txHistory.successfulTransactions / txHistory.totalTransactions;
          score = Math.round(successRate * 100);

          if (successRate >= 0.95) {
            positiveFactors.push('Excellent transaction success rate');
          } else if (successRate < 0.8) {
            negativeFactors.push('Below average transaction success rate');
          }
        }
        break;
      }

      case TrustComponent.REVIEW_SCORE: {
        if (!includePlatformData) {
          score = 50;
          break;
        }

        const reviews = await this.platformData.getReviewData(tenantId, identity.userId);
        dataPoints = reviews.totalReviews;

        if (reviews.totalReviews === 0) {
          score = 50;
          recommendations.push('Encourage clients to leave reviews');
        } else {
          // Convert 5-star rating to 0-100 score
          score = Math.round((reviews.averageRating / 5) * 100);

          if (reviews.averageRating >= 4.5) {
            positiveFactors.push(`Excellent rating (${reviews.averageRating.toFixed(1)} stars)`);
          } else if (reviews.averageRating < 3.5) {
            negativeFactors.push('Below average rating');
            recommendations.push('Focus on improving service quality');
          }
        }
        break;
      }

      case TrustComponent.RESPONSE_RATE: {
        if (!includePlatformData) {
          score = 50;
          break;
        }

        const metrics = await this.platformData.getActivityMetrics(tenantId, identity.userId);
        score = Math.round(metrics.responseRate);
        dataPoints = 1;

        if (metrics.responseRate >= 90) {
          positiveFactors.push('Excellent response rate');
        } else if (metrics.responseRate < 50) {
          negativeFactors.push('Low response rate');
          recommendations.push('Respond to inquiries promptly');
        }
        break;
      }

      case TrustComponent.COMPLETION_RATE: {
        if (!includePlatformData) {
          score = 50;
          break;
        }

        const metrics = await this.platformData.getActivityMetrics(tenantId, identity.userId);
        score = Math.round(metrics.completionRate);
        dataPoints = 1;

        if (metrics.completionRate >= 95) {
          positiveFactors.push('Excellent completion rate');
        } else if (metrics.completionRate < 80) {
          negativeFactors.push('High cancellation/non-completion rate');
        }
        break;
      }

      case TrustComponent.DISPUTE_HISTORY: {
        if (!includePlatformData) {
          score = 100; // No disputes is good
          break;
        }

        const txHistory = await this.platformData.getTransactionHistory(tenantId, identity.userId);

        if (txHistory.totalTransactions === 0) {
          score = 100; // No history = no disputes
        } else {
          const disputeRate = txHistory.disputedTransactions / txHistory.totalTransactions;
          score = Math.round((1 - disputeRate) * 100);
          dataPoints = txHistory.disputedTransactions;

          if (disputeRate > 0.05) {
            negativeFactors.push('Higher than average dispute rate');
          }
          if (txHistory.disputedTransactions === 0) {
            positiveFactors.push('No disputes on record');
          }
        }
        break;
      }

      case TrustComponent.TENURE: {
        if (!includePlatformData) {
          score = 50;
          break;
        }

        const metrics = await this.platformData.getActivityMetrics(tenantId, identity.userId);
        const tenureDays = metrics.accountAge;
        dataPoints = 1;

        // Score based on account age (max score at 2 years)
        score = Math.min(100, Math.round((tenureDays / 730) * 100));

        if (tenureDays >= 365) {
          positiveFactors.push('Long-standing member');
        } else if (tenureDays < 30) {
          recommendations.push('Build trust over time with consistent activity');
        }
        break;
      }

      case TrustComponent.ACTIVITY_LEVEL: {
        if (!includePlatformData) {
          score = 50;
          break;
        }

        const metrics = await this.platformData.getActivityMetrics(tenantId, identity.userId);
        dataPoints = 1;

        // Score based on recency of activity
        const daysSinceActive = Math.floor(
          (Date.now() - metrics.lastActiveAt.getTime()) / (24 * 60 * 60 * 1000)
        );

        if (daysSinceActive <= 7) {
          score = 100;
          positiveFactors.push('Recently active');
        } else if (daysSinceActive <= 30) {
          score = 75;
        } else if (daysSinceActive <= 90) {
          score = 50;
        } else {
          score = 25;
          negativeFactors.push('Inactive account');
        }
        break;
      }

      case TrustComponent.ENDORSEMENTS: {
        if (!includePlatformData) {
          score = 0;
          break;
        }

        const endorsements = await this.platformData.getEndorsements(tenantId, identity.userId);
        dataPoints = endorsements.endorsementCount + endorsements.badgeCount;

        // Score based on endorsements and badges
        score = Math.min(100, (endorsements.endorsementCount * 10) + (endorsements.badgeCount * 20));

        if (endorsements.featuredStatus) {
          score = 100;
          positiveFactors.push('Featured community member');
        }
        if (endorsements.badgeCount > 0) {
          positiveFactors.push(`${endorsements.badgeCount} badge(s) earned`);
        }
        break;
      }

      case TrustComponent.COMMUNITY_STANDING: {
        // This would be calculated from community moderation data
        score = 50; // Neutral default
        break;
      }
    }

    return { score, dataPoints, positiveFactors, negativeFactors, recommendations };
  }

  /**
   * Get tier for a given score
   */
  private getTierForScore(score: number): TrustScore['tier'] {
    const { tierThresholds } = this.config;

    if (score >= tierThresholds.highlyTrusted) return 'highly_trusted';
    if (score >= tierThresholds.trusted) return 'trusted';
    if (score >= tierThresholds.verified) return 'verified';
    if (score >= tierThresholds.basic) return 'basic';
    return 'untrusted';
  }

  // ==========================================================================
  // RISK ASSESSMENT
  // ==========================================================================

  /**
   * Assess risk for an identity
   */
  async assessRisk(
    tenantId: string,
    identityId: string,
    input: AssessRiskInput = {}
  ): Promise<Result<RiskAssessment>> {
    try {
      this.logger.info('Assessing risk', { tenantId, identityId });

      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      // Check cache unless force reassess
      if (!input.forceReassess && identity.riskAssessment) {
        const cacheAge = Date.now() - identity.riskAssessment.assessedAt.getTime();
        if (cacheAge < this.config.scoreCacheTtlSeconds * 1000) {
          return success(identity.riskAssessment);
        }
      }

      const categories: RiskCategory[] = [];
      const flags: RiskFlag[] = [];
      let totalRiskScore = 0;
      let categoryCount = 0;

      // Identity Risk
      const identityRisk = this.assessIdentityRisk(identity);
      categories.push(identityRisk);
      totalRiskScore += identityRisk.score;
      categoryCount++;

      // Compliance Risk
      const complianceRisk = this.assessComplianceRisk(identity);
      categories.push(complianceRisk);
      totalRiskScore += complianceRisk.score;
      categoryCount++;

      // Behavioral Risk (from platform data)
      const behavioralRisk = await this.assessBehavioralRisk(tenantId, identity);
      categories.push(behavioralRisk);
      totalRiskScore += behavioralRisk.score;
      categoryCount++;

      // Collect risk flags
      for (const category of categories) {
        if (category.level === RiskLevel.HIGH || category.level === RiskLevel.VERY_HIGH) {
          flags.push({
            code: `${category.category.toUpperCase()}_RISK`,
            description: `High risk in ${category.category} category`,
            severity: category.level === RiskLevel.VERY_HIGH ? 'critical' : 'high',
            source: 'risk_assessment',
            detectedAt: new Date()
          });
        }
      }

      // Calculate overall score and level
      const overallScore = Math.round(totalRiskScore / categoryCount);
      const overallLevel = this.getRiskLevelForScore(overallScore);

      // Determine required actions
      const requiredActions: string[] = [];
      const restrictions: string[] = [];

      if (overallLevel === RiskLevel.HIGH || overallLevel === RiskLevel.VERY_HIGH) {
        requiredActions.push('Manual review required');
        restrictions.push('Limited transaction amounts');
      }
      if (overallLevel === RiskLevel.BLOCKED) {
        requiredActions.push('Account requires investigation');
        restrictions.push('All transactions blocked');
      }

      const assessment: RiskAssessment = {
        level: overallLevel,
        score: overallScore,
        categories,
        flags,
        requiredActions: requiredActions.length > 0 ? requiredActions : undefined,
        restrictions: restrictions.length > 0 ? restrictions : undefined,
        assessedAt: new Date(),
        validUntil: new Date(Date.now() + this.config.scoreCacheTtlSeconds * 1000),
        assessedBy: 'system'
      };

      // Store the assessment
      await this.repo.updateRiskAssessment(identityId, assessment);

      // Emit event if risk level is concerning
      if (overallLevel === RiskLevel.HIGH || overallLevel === RiskLevel.VERY_HIGH || overallLevel === RiskLevel.BLOCKED) {
        await this.publishEvent('trust.high_risk_detected', tenantId, {
          identityId,
          riskLevel: overallLevel,
          riskScore: overallScore,
          flags: flags.map(f => f.code)
        });
      }

      this.logger.info('Risk assessed', { identityId, level: overallLevel, score: overallScore });
      return success(assessment);
    } catch (error) {
      this.logger.error('Failed to assess risk', error as Error, { tenantId, identityId });
      return failure(error as Error);
    }
  }

  /**
   * Assess identity-related risk
   */
  private assessIdentityRisk(identity: Identity): RiskCategory {
    let score = 0;
    const factors: string[] = [];

    // Unverified identity is risky
    if (identity.kycLevel === KycLevel.NONE) {
      score += 50;
      factors.push('Identity not verified');
    } else if (identity.kycLevel === KycLevel.BASIC) {
      score += 30;
      factors.push('Only basic verification');
    }

    // Suspended or failed status
    if (identity.status === 'suspended') {
      score += 40;
      factors.push('Account suspended');
    } else if (identity.status === 'failed') {
      score += 30;
      factors.push('Previous verification failed');
    }

    // Expired credentials
    const expiredCredentials = identity.credentials.filter(c => c.status === CredentialStatus.EXPIRED);
    if (expiredCredentials.length > 0) {
      score += expiredCredentials.length * 10;
      factors.push(`${expiredCredentials.length} expired credentials`);
    }

    return {
      category: 'identity',
      level: this.getRiskLevelForScore(score),
      score: Math.min(100, score),
      factors
    };
  }

  /**
   * Assess compliance-related risk
   */
  private assessComplianceRisk(identity: Identity): RiskCategory {
    let score = 0;
    const factors: string[] = [];

    // Check for required credentials
    const hasWWCC = identity.credentials.some(
      c => c.type.toString().startsWith('wwcc') && c.status === CredentialStatus.VALID
    );

    // If user has educator-type activity but no WWCC, that's a risk
    // (This would be enhanced with actual activity data)

    // Revoked credentials are a major red flag
    const revokedCredentials = identity.credentials.filter(c => c.status === CredentialStatus.REVOKED);
    if (revokedCredentials.length > 0) {
      score += 80;
      factors.push('Credentials revoked by issuing authority');
    }

    return {
      category: 'compliance',
      level: this.getRiskLevelForScore(score),
      score: Math.min(100, score),
      factors
    };
  }

  /**
   * Assess behavioral risk from platform data
   */
  private async assessBehavioralRisk(tenantId: string, identity: Identity): Promise<RiskCategory> {
    let score = 0;
    const factors: string[] = [];

    try {
      const txHistory = await this.platformData.getTransactionHistory(tenantId, identity.userId);
      const metrics = await this.platformData.getActivityMetrics(tenantId, identity.userId);

      // High dispute rate
      if (txHistory.totalTransactions > 0) {
        const disputeRate = txHistory.disputedTransactions / txHistory.totalTransactions;
        if (disputeRate > 0.1) {
          score += 40;
          factors.push('High dispute rate');
        } else if (disputeRate > 0.05) {
          score += 20;
          factors.push('Elevated dispute rate');
        }
      }

      // High cancellation rate
      if (metrics.cancellationRate > 0.2) {
        score += 20;
        factors.push('High cancellation rate');
      }

      // Very new account with high activity (potential fraud pattern)
      if (metrics.accountAge < 7 && txHistory.totalTransactions > 10) {
        score += 30;
        factors.push('Unusual activity for new account');
      }

    } catch (error) {
      // If we can't get platform data, assign medium risk
      score = 30;
      factors.push('Unable to assess platform history');
    }

    return {
      category: 'behavioral',
      level: this.getRiskLevelForScore(score),
      score: Math.min(100, score),
      factors
    };
  }

  /**
   * Get risk level for a given score
   */
  private getRiskLevelForScore(score: number): RiskLevel {
    const { riskThresholds } = this.config;

    if (score >= 90) return RiskLevel.BLOCKED;
    if (score >= riskThresholds.veryHigh) return RiskLevel.VERY_HIGH;
    if (score >= riskThresholds.high) return RiskLevel.HIGH;
    if (score >= riskThresholds.medium) return RiskLevel.MEDIUM;
    if (score >= riskThresholds.low) return RiskLevel.LOW;
    return RiskLevel.VERY_LOW;
  }

  // ==========================================================================
  // TRUST QUERIES
  // ==========================================================================

  /**
   * Get trust score for an identity (from cache or calculate)
   */
  async getTrustScore(
    tenantId: string,
    identityId: string
  ): Promise<Result<TrustScore | null>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      // Check if we have a valid cached score
      if (identity.trustScore && identity.trustScore.expiresAt > new Date()) {
        return success(identity.trustScore);
      }

      // Calculate new score
      return this.calculateTrustScore(tenantId, identityId);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get risk assessment for an identity (from cache or calculate)
   */
  async getRiskAssessment(
    tenantId: string,
    identityId: string
  ): Promise<Result<RiskAssessment | null>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      // Check if we have a valid cached assessment
      if (identity.riskAssessment && identity.riskAssessment.validUntil > new Date()) {
        return success(identity.riskAssessment);
      }

      // Calculate new assessment
      return this.assessRisk(tenantId, identityId);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Check if identity meets minimum trust requirements
   */
  async meetsTrustRequirements(
    tenantId: string,
    identityId: string,
    minimumScore?: number,
    minimumTier?: TrustScore['tier'],
    maxRiskLevel?: RiskLevel
  ): Promise<Result<{ meets: boolean; reasons: string[] }>> {
    try {
      const trustResult = await this.getTrustScore(tenantId, identityId);
      if (!trustResult.success || !trustResult.data) {
        return success({ meets: false, reasons: ['Unable to calculate trust score'] });
      }

      const riskResult = await this.getRiskAssessment(tenantId, identityId);

      const reasons: string[] = [];
      let meets = true;

      // Check minimum score
      if (minimumScore !== undefined && trustResult.data.overall < minimumScore) {
        meets = false;
        reasons.push(`Trust score ${trustResult.data.overall} below minimum ${minimumScore}`);
      }

      // Check minimum tier
      if (minimumTier !== undefined) {
        const tierOrder = ['untrusted', 'basic', 'verified', 'trusted', 'highly_trusted'];
        const currentTierIndex = tierOrder.indexOf(trustResult.data.tier);
        const requiredTierIndex = tierOrder.indexOf(minimumTier);

        if (currentTierIndex < requiredTierIndex) {
          meets = false;
          reasons.push(`Trust tier '${trustResult.data.tier}' below required '${minimumTier}'`);
        }
      }

      // Check maximum risk level
      if (maxRiskLevel !== undefined && riskResult.success && riskResult.data) {
        const riskOrder = ['very_low', 'low', 'medium', 'high', 'very_high', 'blocked'];
        const currentRiskIndex = riskOrder.indexOf(riskResult.data.level);
        const maxRiskIndex = riskOrder.indexOf(maxRiskLevel);

        if (currentRiskIndex > maxRiskIndex) {
          meets = false;
          reasons.push(`Risk level '${riskResult.data.level}' exceeds maximum '${maxRiskLevel}'`);
        }
      }

      return success({ meets, reasons });
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private async publishEvent(
    type: string,
    tenantId: string,
    data: Record<string, any>
  ): Promise<void> {
    await this.eventBus.publish(type, tenantId, {
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}

let trustServiceInstance: TrustService | null = null;

export function initializeTrustService(
  repo: IdentityRepository,
  platformData: PlatformDataProvider,
  eventBus: EventBus,
  logger: Logger,
  config?: Partial<TrustServiceConfig>
): TrustService {
  trustServiceInstance = new TrustService(repo, platformData, eventBus, logger, config);
  return trustServiceInstance;
}

export function getTrustService(): TrustService {
  if (!trustServiceInstance) {
    throw new Error('TrustService not initialized. Call initializeTrustService first.');
  }
  return trustServiceInstance;
}
