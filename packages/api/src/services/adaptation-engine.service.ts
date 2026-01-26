/**
 * Adaptation Engine Service
 *
 * Real-time adaptive learning engine implementing Bayesian Knowledge Tracing (BKT)
 * for mastery estimation, Zone of Proximal Development (ZPD) calculation,
 * fatigue detection, decision gate evaluation, and next-step scoring.
 *
 * Core algorithms:
 * - BKT: probabilistic mastery estimation via Bayesian updates
 * - EMA: exponential moving average for smoothing real-time signals
 * - ZPD: Vygotsky-inspired difficulty targeting
 * - Multi-signal fatigue detection
 * - Rule-based decision gates with AND/OR logic
 */

import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import type {
  BKTParameters,
  BKTCompetencyState,
  MasterySnapshot,
  MasteryEstimate,
  AdaptationSignal,
  SignalType,
  EMAState,
  AdaptationProfile,
  ZPDRange,
  ZPDCompetency,
  FatigueAssessment,
  FatigueRecommendation,
  DecisionGateInput,
  CandidateStep,
  ScoredStep,
  AdaptationRule,
  AdaptationRuleCondition,
  AdaptationRuleAction,
  AdaptationRuleOperator,
  AdaptationEvent,
} from './golden-path-types';

// ============================================================================
// Constants
// ============================================================================

/** EMA smoothing factor (higher = more weight on recent observations) */
const EMA_ALPHA = 0.3;

/** Target success rate range for optimal difficulty calibration */
const TARGET_SUCCESS_LOW = 0.75;
const TARGET_SUCCESS_HIGH = 0.85;

/** Difficulty adjustment step when outside target success range */
const DIFFICULTY_STEP = 0.05;

/** Difficulty bounds */
const DIFFICULTY_MIN = 0.1;
const DIFFICULTY_MAX = 1.0;

/** ZPD classification thresholds */
const ZPD_MASTERED_THRESHOLD = 0.8;
const ZPD_BEYOND_REACH_THRESHOLD = 0.3;
const ZPD_OPTIMAL_LOW = 0.4;
const ZPD_OPTIMAL_HIGH = 0.7;

/** Fatigue component weights */
const FATIGUE_WEIGHTS = {
  accuracyDecline: 0.3,
  responseTimeIncrease: 0.25,
  hintUsageIncrease: 0.2,
  sessionDuration: 0.15,
  errorBurstiness: 0.1,
};

/** Fatigue threshold for session duration scoring (minutes) */
const FATIGUE_MAX_DURATION_MINUTES = 90;

/** Next-step scoring weights */
const STEP_SCORE_WEIGHTS = {
  masteryGain: 0.3,
  engagementProbability: 0.25,
  timeEfficiency: 0.2,
  prerequisiteCoverage: 0.15,
  curiosityAlignment: 0.1,
};

/** Default BKT parameters for newly encountered competencies */
const DEFAULT_BKT_PARAMS: BKTParameters = {
  pLearn: 0.1,
  pGuess: 0.2,
  pSlip: 0.1,
  pKnown: 0.5,
};

/** Number of recent observations used to compute mastery trend */
const TREND_WINDOW = 10;

// ============================================================================
// Adaptation Engine Service
// ============================================================================

export class AdaptationEngineService extends ScholarlyBaseService {
  constructor() {
    super('AdaptationEngineService');
  }

  // ==========================================================================
  // Profile Management
  // ==========================================================================

  /**
   * Get or create an adaptation profile for a learner.
   * If the profile does not exist it is created with sensible defaults.
   */
  async getProfile(tenantId: string, learnerId: string): Promise<Result<AdaptationProfile>> {
    return this.withTiming('getProfile', async () => {
      try {
        const existing = await prisma.adaptationProfile.findUnique({
          where: { learnerId },
          include: { competencyStates: true },
        });

        if (existing && existing.tenantId !== tenantId) {
          return failure({
            code: 'ADAPT_002',
            message: 'Learner profile belongs to a different tenant',
            details: { learnerId, tenantId },
          });
        }

        if (existing) {
          return success(this.mapProfileFromDb(existing));
        }

        // Create new profile with defaults
        const created = await prisma.adaptationProfile.create({
          data: {
            tenantId,
            learnerId,
            emaAccuracy: 0.5,
            emaResponseTime: 5000,
            emaEngagement: 0.5,
            emaHintUsage: 0,
            emaSkipRate: 0,
            currentDifficulty: 0.5,
            targetSuccessRate: 0.8,
            sessionCount: 0,
            totalTimeMinutes: 0,
          },
          include: { competencyStates: true },
        });

        log.info('Created new adaptation profile', { tenantId, learnerId, profileId: created.id });

        return success(this.mapProfileFromDb(created));
      } catch (error) {
        log.error('Failed to get or create adaptation profile', error as Error, { tenantId, learnerId });
        return failure({
          code: 'ADAPT_001',
          message: 'Failed to retrieve adaptation profile',
          details: { tenantId, learnerId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Signal Processing
  // ==========================================================================

  /**
   * Process a batch of adaptation signals for a learner.
   *
   * For each signal:
   *   1. Update the EMA state using alpha=0.3
   *   2. For accuracy signals with a competencyId context: run a BKT update
   *   3. Adjust currentDifficulty to keep accuracy in the 75-85% sweet spot
   */
  async updateWithSignals(
    tenantId: string,
    learnerId: string,
    signals: AdaptationSignal[],
  ): Promise<Result<AdaptationProfile>> {
    return this.withTiming('updateWithSignals', async () => {
      try {
        if (!signals || signals.length === 0) {
          return failure({
            code: 'ADAPT_010',
            message: 'No signals provided',
            details: { tenantId, learnerId },
          });
        }

        // Fetch or create profile
        const profileResult = await this.getProfile(tenantId, learnerId);
        if (!profileResult.success) {
          return profileResult;
        }

        const profile = profileResult.data;

        // Process signals sequentially to maintain causal ordering
        for (const signal of signals) {
          // Update EMA for the corresponding signal type
          this.applyEmaUpdate(profile.emaState, signal);

          // BKT update for accuracy signals tied to a specific competency
          if (signal.type === 'accuracy' && signal.context?.competencyId) {
            const competencyId = signal.context.competencyId;
            const domain = signal.context.domain || 'general';
            const wasCorrect = signal.value >= 0.5;
            const responseTimeMs = signal.context?.sessionId
              ? undefined
              : undefined; // response time comes from response_time signals

            let compState = profile.competencyStates.find(
              (cs) => cs.competencyId === competencyId,
            );

            if (!compState) {
              // Initialize a new competency state
              compState = {
                competencyId,
                domain,
                params: { ...DEFAULT_BKT_PARAMS },
                observations: 0,
                lastObservationAt: new Date(),
                masteryHistory: [],
              };
              profile.competencyStates.push(compState);
            }

            this.updateBKT(compState, wasCorrect, responseTimeMs);
          }
        }

        // Adjust difficulty based on current EMA accuracy
        profile.currentDifficulty = this.adjustDifficulty(
          profile.currentDifficulty,
          profile.emaState.accuracy,
        );

        // Persist profile and competency states
        await this.persistProfile(profile);

        log.debug('Processed adaptation signals', {
          tenantId,
          learnerId,
          signalCount: signals.length,
          newDifficulty: profile.currentDifficulty,
          emaAccuracy: profile.emaState.accuracy,
        });

        return success(profile);
      } catch (error) {
        log.error('Failed to process adaptation signals', error as Error, {
          tenantId,
          learnerId,
          signalCount: signals.length,
        });
        return failure({
          code: 'ADAPT_011',
          message: 'Failed to process adaptation signals',
          details: { tenantId, learnerId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Bayesian Knowledge Tracing
  // ==========================================================================

  /**
   * Perform a single BKT update step on a competency state.
   *
   * Standard BKT update equations:
   *
   *   Prior: L = P(Known)
   *
   *   If correct:
   *     P(Known|correct) = L * (1 - P(Slip))
   *                        / (L * (1 - P(Slip)) + (1 - L) * P(Guess))
   *
   *   If incorrect:
   *     P(Known|incorrect) = L * P(Slip)
   *                          / (L * P(Slip) + (1 - L) * (1 - P(Guess)))
   *
   *   Learning transition:
   *     P(Known_new) = P(Known|obs) + (1 - P(Known|obs)) * P(Learn)
   *
   * Returns the updated competency state (mutated in place for efficiency).
   */
  updateBKT(
    competencyState: BKTCompetencyState,
    wasCorrect: boolean,
    responseTimeMs?: number,
  ): BKTCompetencyState {
    const { pLearn, pGuess, pSlip, pKnown } = competencyState.params;

    // --- Posterior update ---
    let pKnownPosterior: number;

    if (wasCorrect) {
      const numerator = pKnown * (1 - pSlip);
      const denominator = pKnown * (1 - pSlip) + (1 - pKnown) * pGuess;
      pKnownPosterior = denominator > 0 ? numerator / denominator : pKnown;
    } else {
      const numerator = pKnown * pSlip;
      const denominator = pKnown * pSlip + (1 - pKnown) * (1 - pGuess);
      pKnownPosterior = denominator > 0 ? numerator / denominator : pKnown;
    }

    // --- Learning transition ---
    const pKnownNew = pKnownPosterior + (1 - pKnownPosterior) * pLearn;

    // Clamp to valid probability range
    competencyState.params.pKnown = Math.max(0, Math.min(1, pKnownNew));

    // Record snapshot
    const snapshot: MasterySnapshot = {
      timestamp: new Date(),
      pKnown: competencyState.params.pKnown,
      wasCorrect,
      responseTimeMs,
    };
    competencyState.masteryHistory.push(snapshot);

    // Update observation metadata
    competencyState.observations += 1;
    competencyState.lastObservationAt = new Date();

    return competencyState;
  }

  // ==========================================================================
  // Mastery Estimation
  // ==========================================================================

  /**
   * Get the current BKT mastery estimate for a specific competency.
   * Includes a trend indicator derived from the last TREND_WINDOW observations.
   */
  async getMasteryEstimate(
    tenantId: string,
    learnerId: string,
    competencyId: string,
  ): Promise<Result<MasteryEstimate>> {
    return this.withTiming('getMasteryEstimate', async () => {
      try {
        const profileResult = await this.getProfile(tenantId, learnerId);
        if (!profileResult.success) {
          return failure((profileResult as any).error);
        }

        const profile = profileResult.data;
        const compState = profile.competencyStates.find(
          (cs) => cs.competencyId === competencyId,
        );

        if (!compState) {
          return failure({
            code: 'ADAPT_020',
            message: 'No mastery data found for competency',
            details: { tenantId, learnerId, competencyId },
          });
        }

        const trend = this.calculateTrend(compState.masteryHistory);

        // Confidence is based on observation count — more observations = higher confidence
        // Uses a logistic-style growth capped at 1.0
        const confidence = Math.min(1, 1 - Math.exp(-compState.observations / 10));

        const estimate: MasteryEstimate = {
          competencyId: compState.competencyId,
          domain: compState.domain,
          pKnown: compState.params.pKnown,
          confidence,
          totalObservations: compState.observations,
          trend,
          lastUpdated: compState.lastObservationAt,
        };

        return success(estimate);
      } catch (error) {
        log.error('Failed to get mastery estimate', error as Error, {
          tenantId,
          learnerId,
          competencyId,
        });
        return failure({
          code: 'ADAPT_021',
          message: 'Failed to retrieve mastery estimate',
          details: { tenantId, learnerId, competencyId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Zone of Proximal Development (ZPD)
  // ==========================================================================

  /**
   * Calculate the Zone of Proximal Development for a learner within a domain.
   *
   * - Lower bound: highest difficulty level where pKnown > 0.8  (mastered)
   * - Upper bound: lowest difficulty level where pKnown < 0.3   (beyond reach)
   * - Optimal:     target pKnown range 0.4-0.7                  (ZPD sweet spot)
   * - Each competency is classified as mastered / zpd / beyond_reach
   */
  async calculateZPD(
    tenantId: string,
    learnerId: string,
    domain: string,
  ): Promise<Result<ZPDRange>> {
    return this.withTiming('calculateZPD', async () => {
      try {
        const profileResult = await this.getProfile(tenantId, learnerId);
        if (!profileResult.success) {
          return failure((profileResult as any).error);
        }

        const profile = profileResult.data;

        // Filter competency states for the requested domain
        const domainStates = profile.competencyStates.filter(
          (cs) => cs.domain === domain,
        );

        if (domainStates.length === 0) {
          return failure({
            code: 'ADAPT_030',
            message: 'No competency data available for domain',
            details: { tenantId, learnerId, domain },
          });
        }

        // Sort by pKnown ascending (weakest first)
        const sorted = [...domainStates].sort(
          (a, b) => a.params.pKnown - b.params.pKnown,
        );

        // Classify competencies and determine bounds
        const competencies: ZPDCompetency[] = [];
        let lowerBound = 0;
        let upperBound = 1;

        for (const cs of sorted) {
          const pk = cs.params.pKnown;
          let zone: 'mastered' | 'zpd' | 'beyond_reach';
          const recommendedActions: string[] = [];

          if (pk > ZPD_MASTERED_THRESHOLD) {
            zone = 'mastered';
            recommendedActions.push('Use as scaffold for new topics');
            recommendedActions.push('Introduce extension challenges');
          } else if (pk < ZPD_BEYOND_REACH_THRESHOLD) {
            zone = 'beyond_reach';
            recommendedActions.push('Build prerequisite knowledge first');
            recommendedActions.push('Provide heavy scaffolding if attempted');
          } else {
            zone = 'zpd';
            if (pk < ZPD_OPTIMAL_LOW) {
              recommendedActions.push('Provide moderate scaffolding');
              recommendedActions.push('Use worked examples');
            } else if (pk > ZPD_OPTIMAL_HIGH) {
              recommendedActions.push('Reduce scaffolding');
              recommendedActions.push('Introduce independent practice');
            } else {
              recommendedActions.push('Optimal challenge level - maintain');
              recommendedActions.push('Encourage productive struggle');
            }
          }

          competencies.push({
            competencyId: cs.competencyId,
            name: cs.competencyId, // Name resolution deferred to caller
            pKnown: pk,
            zone,
            recommendedActions,
          });
        }

        // Lower bound: highest pKnown among mastered competencies
        const mastered = sorted.filter((cs) => cs.params.pKnown > ZPD_MASTERED_THRESHOLD);
        if (mastered.length > 0) {
          lowerBound = mastered[mastered.length - 1].params.pKnown;
        }

        // Upper bound: lowest pKnown among beyond-reach competencies
        const beyondReach = sorted.filter((cs) => cs.params.pKnown < ZPD_BEYOND_REACH_THRESHOLD);
        if (beyondReach.length > 0) {
          upperBound = beyondReach[0].params.pKnown;
        }

        // Optimal difficulty: midpoint of ZPD range
        const zpdCompetencies = sorted.filter(
          (cs) =>
            cs.params.pKnown >= ZPD_BEYOND_REACH_THRESHOLD &&
            cs.params.pKnown <= ZPD_MASTERED_THRESHOLD,
        );
        const optimalDifficulty =
          zpdCompetencies.length > 0
            ? zpdCompetencies.reduce((sum, cs) => sum + cs.params.pKnown, 0) /
              zpdCompetencies.length
            : (lowerBound + upperBound) / 2;

        const zpdRange: ZPDRange = {
          domain,
          lowerBound,
          upperBound,
          optimalDifficulty,
          competencies,
        };

        return success(zpdRange);
      } catch (error) {
        log.error('Failed to calculate ZPD', error as Error, {
          tenantId,
          learnerId,
          domain,
        });
        return failure({
          code: 'ADAPT_031',
          message: 'Failed to calculate zone of proximal development',
          details: { tenantId, learnerId, domain, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Optimal Difficulty
  // ==========================================================================

  /**
   * Calculate the optimal difficulty for a learner targeting a 75-85% success rate.
   *
   * Uses the EMA accuracy to adjust:
   *   - If accuracy > 0.85 (too easy)   -> increase difficulty by 0.05
   *   - If accuracy < 0.75 (too hard)   -> decrease difficulty by 0.05
   *   - Otherwise                       -> maintain current difficulty
   *
   * Result is clamped to [0.1, 1.0].
   */
  async getOptimalDifficulty(
    tenantId: string,
    learnerId: string,
  ): Promise<Result<number>> {
    return this.withTiming('getOptimalDifficulty', async () => {
      try {
        const profileResult = await this.getProfile(tenantId, learnerId);
        if (!profileResult.success) {
          return failure((profileResult as any).error);
        }

        const profile = profileResult.data;
        const optimal = this.adjustDifficulty(
          profile.currentDifficulty,
          profile.emaState.accuracy,
        );

        return success(optimal);
      } catch (error) {
        log.error('Failed to calculate optimal difficulty', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          code: 'ADAPT_040',
          message: 'Failed to calculate optimal difficulty',
          details: { tenantId, learnerId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Fatigue Detection
  // ==========================================================================

  /**
   * Assess learner fatigue for a given session.
   *
   * Components (each scored 0-100):
   *   1. Accuracy decline:       first-half vs second-half accuracy
   *   2. Response time increase:  first-half vs second-half response time
   *   3. Hint usage increase:     first-half vs second-half hint request frequency
   *   4. Session duration:        linear 0-100 over 0-90 minutes
   *   5. Error burstiness:        clusters of consecutive errors
   *
   * Composite score: weighted average with predefined weights.
   *
   * Recommendation thresholds:
   *   < 30  -> continue
   *   30-50 -> reduce_difficulty
   *   50-70 -> switch_topic
   *   70-85 -> take_break
   *   > 85  -> end_session
   */
  async assessFatigue(
    tenantId: string,
    learnerId: string,
    sessionId: string,
  ): Promise<Result<FatigueAssessment>> {
    return this.withTiming('assessFatigue', async () => {
      try {
        // Fetch adaptation events for this session to extract signals
        const events = await prisma.adaptationEvent.findMany({
          where: {
            tenantId,
            learnerId,
          },
          orderBy: { timestamp: 'asc' },
        });

        // Collect all signals from events that belong to this session
        const sessionSignals: AdaptationSignal[] = [];
        for (const evt of events) {
          const signals = evt.triggerSignals as unknown as AdaptationSignal[];
          if (Array.isArray(signals)) {
            for (const sig of signals) {
              if (sig.context?.sessionId === sessionId) {
                sessionSignals.push(sig);
              }
            }
          }
        }

        // Sort signals chronologically
        sessionSignals.sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

        // Compute fatigue components
        const accuracyDecline = this.computeAccuracyDecline(sessionSignals);
        const responseTimeIncrease = this.computeResponseTimeIncrease(sessionSignals);
        const hintUsageIncrease = this.computeHintUsageIncrease(sessionSignals);
        const sessionDuration = this.computeSessionDurationScore(sessionSignals);
        const errorBurstiness = this.computeErrorBurstiness(sessionSignals);

        // Composite score (weighted average)
        const overallScore =
          FATIGUE_WEIGHTS.accuracyDecline * accuracyDecline +
          FATIGUE_WEIGHTS.responseTimeIncrease * responseTimeIncrease +
          FATIGUE_WEIGHTS.hintUsageIncrease * hintUsageIncrease +
          FATIGUE_WEIGHTS.sessionDuration * sessionDuration +
          FATIGUE_WEIGHTS.errorBurstiness * errorBurstiness;

        const recommendation = this.fatigueRecommendation(overallScore);

        const assessment: FatigueAssessment = {
          learnerId,
          sessionId,
          overallScore: Math.round(overallScore * 100) / 100,
          components: {
            accuracyDecline: Math.round(accuracyDecline * 100) / 100,
            responseTimeIncrease: Math.round(responseTimeIncrease * 100) / 100,
            hintUsageIncrease: Math.round(hintUsageIncrease * 100) / 100,
            sessionDuration: Math.round(sessionDuration * 100) / 100,
            errorBurstiness: Math.round(errorBurstiness * 100) / 100,
          },
          recommendation,
          assessedAt: new Date(),
        };

        log.debug('Fatigue assessment completed', {
          tenantId,
          learnerId,
          sessionId,
          overallScore: assessment.overallScore,
          recommendation,
        });

        return success(assessment);
      } catch (error) {
        log.error('Failed to assess fatigue', error as Error, {
          tenantId,
          learnerId,
          sessionId,
        });
        return failure({
          code: 'ADAPT_050',
          message: 'Failed to assess fatigue',
          details: { tenantId, learnerId, sessionId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Decision Gate Evaluation
  // ==========================================================================

  /**
   * Evaluate decision gate rules for the current learner state.
   *
   * Fetches active adaptation rules sorted by priority, evaluates each rule's
   * conditions against the learner's current signals and profile, and returns
   * the first triggered rule's action (or null if none triggered).
   */
  async evaluateDecisionGate(
    tenantId: string,
    learnerId: string,
    input: DecisionGateInput,
  ): Promise<Result<{ triggeredRule: AdaptationRule | null; action: AdaptationRuleAction | null }>> {
    return this.withTiming('evaluateDecisionGate', async () => {
      try {
        const profileResult = await this.getProfile(tenantId, learnerId);
        if (!profileResult.success) {
          return failure((profileResult as any).error);
        }

        const profile = profileResult.data;

        // Fetch active rules for this tenant, sorted by priority (ascending = highest priority first)
        const dbRules = await prisma.adaptationRule.findMany({
          where: {
            tenantId,
            isActive: true,
          },
          orderBy: { priority: 'asc' },
        });

        const rules: AdaptationRule[] = dbRules.map((r) => this.mapRuleFromDb(r));

        // Evaluate rules in priority order; return first match
        for (const rule of rules) {
          // Scope filtering
          if (rule.scope === 'domain' && rule.scopeId && input.currentDomain !== rule.scopeId) {
            continue;
          }
          if (
            rule.scope === 'competency' &&
            rule.scopeId &&
            input.currentCompetencyId !== rule.scopeId
          ) {
            continue;
          }

          const triggered = this.evaluateConditions(
            rule.conditions,
            rule.conditionLogic,
            profile,
          );

          if (triggered) {
            // Log the adaptation event
            await prisma.adaptationEvent.create({
              data: {
                tenantId,
                profileId: profile.id,
                learnerId,
                ruleId: rule.id,
                triggerSignals: [] as unknown as any,
                action: rule.action as unknown as any,
                timestamp: new Date(),
              },
            });

            log.info('Decision gate triggered', {
              tenantId,
              learnerId,
              ruleId: rule.id,
              ruleName: rule.name,
              actionType: rule.action.type,
            });

            return success({ triggeredRule: rule, action: rule.action });
          }
        }

        return success({ triggeredRule: null, action: null });
      } catch (error) {
        log.error('Failed to evaluate decision gate', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          code: 'ADAPT_060',
          message: 'Failed to evaluate decision gate',
          details: { tenantId, learnerId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Next-Step Scoring
  // ==========================================================================

  /**
   * Score candidate next steps using multi-factor evaluation.
   *
   * For each candidate step the following component scores are computed:
   *   1. masteryGain:            estimated BKT pKnown increase (simulate correct + incorrect)
   *   2. engagementProbability:  based on EMA engagement and difficulty match
   *   3. timeEfficiency:         estimated mastery gain per minute
   *   4. prerequisiteCoverage:   fraction of prerequisites already mastered
   *   5. curiosityAlignment:     placeholder 0.5 (to be enhanced by curiosity engine)
   *
   * Composite score is a weighted sum. Results are sorted descending by score.
   */
  async scoreNextSteps(
    tenantId: string,
    learnerId: string,
    candidates: CandidateStep[],
  ): Promise<Result<ScoredStep[]>> {
    return this.withTiming('scoreNextSteps', async () => {
      try {
        if (!candidates || candidates.length === 0) {
          return success([]);
        }

        const profileResult = await this.getProfile(tenantId, learnerId);
        if (!profileResult.success) {
          return failure((profileResult as any).error);
        }

        const profile = profileResult.data;

        // Build a lookup map of mastered competencies
        const masteryMap = new Map<string, number>();
        for (const cs of profile.competencyStates) {
          masteryMap.set(cs.competencyId, cs.params.pKnown);
        }

        const scoredSteps: ScoredStep[] = candidates.map((candidate) => {
          // --- 1. Mastery gain estimation ---
          // Simulate BKT updates: one correct and one incorrect observation
          const currentPKnown = masteryMap.get(candidate.competencyId) ?? DEFAULT_BKT_PARAMS.pKnown;
          const simParams: BKTParameters = {
            ...DEFAULT_BKT_PARAMS,
            pKnown: currentPKnown,
          };

          // Simulate correct answer
          const pKnownAfterCorrect = this.simulateBKTUpdate(simParams, true);
          // Simulate incorrect answer
          const pKnownAfterIncorrect = this.simulateBKTUpdate(simParams, false);

          // Expected gain: weighted by current accuracy estimate
          const expectedAccuracy = profile.emaState.accuracy;
          const expectedPKnown =
            expectedAccuracy * pKnownAfterCorrect +
            (1 - expectedAccuracy) * pKnownAfterIncorrect;
          const masteryGain = Math.max(0, expectedPKnown - currentPKnown);

          // --- 2. Engagement probability ---
          // Higher when difficulty is near optimal and engagement EMA is high
          const difficultyMatch =
            1 - Math.abs(candidate.difficulty - profile.currentDifficulty);
          const engagementProbability =
            0.5 * Math.max(0, Math.min(1, difficultyMatch)) +
            0.5 * profile.emaState.engagement;

          // --- 3. Time efficiency ---
          // Mastery gain per minute (normalized to 0-1)
          const gainPerMinute =
            candidate.estimatedDurationMinutes > 0
              ? masteryGain / candidate.estimatedDurationMinutes
              : 0;
          // Normalize: assume max realistic gain/min ~ 0.1
          const timeEfficiency = Math.min(1, gainPerMinute / 0.1);

          // --- 4. Prerequisite coverage ---
          let prerequisiteCoverage = 1;
          if (candidate.prerequisites.length > 0) {
            const masteredPrereqs = candidate.prerequisites.filter(
              (prereqId) => (masteryMap.get(prereqId) ?? 0) > ZPD_MASTERED_THRESHOLD,
            ).length;
            prerequisiteCoverage = masteredPrereqs / candidate.prerequisites.length;
          }

          // --- 5. Curiosity alignment ---
          // Placeholder; future integration with curiosity engine
          const curiosityAlignment = 0.5;

          // --- Composite score ---
          const score =
            STEP_SCORE_WEIGHTS.masteryGain * masteryGain +
            STEP_SCORE_WEIGHTS.engagementProbability * engagementProbability +
            STEP_SCORE_WEIGHTS.timeEfficiency * timeEfficiency +
            STEP_SCORE_WEIGHTS.prerequisiteCoverage * prerequisiteCoverage +
            STEP_SCORE_WEIGHTS.curiosityAlignment * curiosityAlignment;

          // Build reasoning summary
          const reasoningParts: string[] = [];
          if (masteryGain > 0.05) {
            reasoningParts.push(`High mastery gain potential (+${(masteryGain * 100).toFixed(1)}%)`);
          }
          if (prerequisiteCoverage < 1) {
            reasoningParts.push(
              `Missing ${Math.round((1 - prerequisiteCoverage) * candidate.prerequisites.length)} prerequisites`,
            );
          }
          if (difficultyMatch > 0.8) {
            reasoningParts.push('Difficulty well-matched to learner level');
          }
          if (engagementProbability > 0.7) {
            reasoningParts.push('High engagement predicted');
          }

          const reasoning =
            reasoningParts.length > 0
              ? reasoningParts.join('; ')
              : 'Standard recommendation';

          return {
            ...candidate,
            score: Math.round(score * 10000) / 10000,
            components: {
              masteryGain: Math.round(masteryGain * 10000) / 10000,
              engagementProbability: Math.round(engagementProbability * 10000) / 10000,
              timeEfficiency: Math.round(timeEfficiency * 10000) / 10000,
              prerequisiteCoverage: Math.round(prerequisiteCoverage * 10000) / 10000,
              curiosityAlignment,
            },
            reasoning,
          };
        });

        // Sort by composite score descending
        scoredSteps.sort((a, b) => b.score - a.score);

        return success(scoredSteps);
      } catch (error) {
        log.error('Failed to score next steps', error as Error, {
          tenantId,
          learnerId,
          candidateCount: candidates.length,
        });
        return failure({
          code: 'ADAPT_070',
          message: 'Failed to score candidate next steps',
          details: { tenantId, learnerId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Adaptation Rule Management
  // ==========================================================================

  /**
   * List adaptation rules for a tenant with optional scope/active filtering.
   */
  async getRules(
    tenantId: string,
    options?: { scope?: string; isActive?: boolean },
  ): Promise<Result<AdaptationRule[]>> {
    return this.withTiming('getRules', async () => {
      try {
        const where: Record<string, unknown> = { tenantId };
        if (options?.scope !== undefined) {
          where.scope = options.scope;
        }
        if (options?.isActive !== undefined) {
          where.isActive = options.isActive;
        }

        const dbRules = await prisma.adaptationRule.findMany({
          where,
          orderBy: { priority: 'asc' },
        });

        const rules = dbRules.map((r) => this.mapRuleFromDb(r));

        return success(rules);
      } catch (error) {
        log.error('Failed to fetch adaptation rules', error as Error, { tenantId });
        return failure({
          code: 'ADAPT_080',
          message: 'Failed to fetch adaptation rules',
          details: { tenantId, error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Create a new adaptation rule.
   */
  async createRule(
    tenantId: string,
    rule: Omit<AdaptationRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>,
  ): Promise<Result<AdaptationRule>> {
    return this.withTiming('createRule', async () => {
      try {
        const dbRule = await prisma.adaptationRule.create({
          data: {
            tenantId,
            name: rule.name,
            description: rule.description,
            scope: rule.scope,
            scopeId: rule.scopeId,
            priority: rule.priority,
            conditions: rule.conditions as unknown as any,
            conditionLogic: rule.conditionLogic,
            action: rule.action as unknown as any,
            isActive: rule.isActive,
          },
        });

        log.info('Created adaptation rule', {
          tenantId,
          ruleId: dbRule.id,
          ruleName: dbRule.name,
        });

        return success(this.mapRuleFromDb(dbRule));
      } catch (error) {
        log.error('Failed to create adaptation rule', error as Error, { tenantId });
        return failure({
          code: 'ADAPT_081',
          message: 'Failed to create adaptation rule',
          details: { tenantId, error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Update an existing adaptation rule.
   */
  async updateRule(
    tenantId: string,
    ruleId: string,
    updates: Partial<Omit<AdaptationRule, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>>,
  ): Promise<Result<AdaptationRule>> {
    return this.withTiming('updateRule', async () => {
      try {
        // Verify rule belongs to tenant
        const existing = await prisma.adaptationRule.findFirst({
          where: { id: ruleId, tenantId },
        });

        if (!existing) {
          return failure({
            code: 'ADAPT_082',
            message: 'Adaptation rule not found',
            details: { tenantId, ruleId },
          });
        }

        const updateData: Record<string, unknown> = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.scope !== undefined) updateData.scope = updates.scope;
        if (updates.scopeId !== undefined) updateData.scopeId = updates.scopeId;
        if (updates.priority !== undefined) updateData.priority = updates.priority;
        if (updates.conditions !== undefined) updateData.conditions = updates.conditions as unknown as any;
        if (updates.conditionLogic !== undefined) updateData.conditionLogic = updates.conditionLogic;
        if (updates.action !== undefined) updateData.action = updates.action as unknown as any;
        if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

        const dbRule = await prisma.adaptationRule.update({
          where: { id: ruleId },
          data: updateData,
        });

        log.info('Updated adaptation rule', {
          tenantId,
          ruleId,
          updatedFields: Object.keys(updateData),
        });

        return success(this.mapRuleFromDb(dbRule));
      } catch (error) {
        log.error('Failed to update adaptation rule', error as Error, { tenantId, ruleId });
        return failure({
          code: 'ADAPT_083',
          message: 'Failed to update adaptation rule',
          details: { tenantId, ruleId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Adaptation History
  // ==========================================================================

  /**
   * Retrieve adaptation event history for a learner.
   */
  async getAdaptationHistory(
    tenantId: string,
    learnerId: string,
    options?: { limit?: number; since?: Date },
  ): Promise<Result<AdaptationEvent[]>> {
    return this.withTiming('getAdaptationHistory', async () => {
      try {
        const where: Record<string, unknown> = { tenantId, learnerId };
        if (options?.since) {
          where.timestamp = { gte: options.since };
        }

        const dbEvents = await prisma.adaptationEvent.findMany({
          where,
          orderBy: { timestamp: 'desc' },
          take: options?.limit ?? 50,
        });

        const events: AdaptationEvent[] = dbEvents.map((evt) => ({
          id: evt.id,
          tenantId: evt.tenantId,
          learnerId: evt.learnerId,
          ruleId: evt.ruleId ?? undefined,
          triggerSignals: evt.triggerSignals as unknown as AdaptationSignal[],
          action: evt.action as unknown as AdaptationRuleAction,
          outcome: evt.outcome ?? undefined,
          timestamp: evt.timestamp,
        }));

        return success(events);
      } catch (error) {
        log.error('Failed to fetch adaptation history', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          code: 'ADAPT_090',
          message: 'Failed to fetch adaptation history',
          details: { tenantId, learnerId, error: (error as Error).message },
        });
      }
    });
  }

  // ==========================================================================
  // Private Helpers — Condition Evaluation
  // ==========================================================================

  /**
   * Evaluate a set of conditions against a learner profile using AND/OR logic.
   */
  private evaluateConditions(
    conditions: AdaptationRuleCondition[],
    logic: 'AND' | 'OR',
    profile: AdaptationProfile,
  ): boolean {
    if (conditions.length === 0) {
      return true;
    }

    if (logic === 'AND') {
      return conditions.every((cond) => this.evaluateCondition(cond, profile));
    }

    // OR logic
    return conditions.some((cond) => this.evaluateCondition(cond, profile));
  }

  /**
   * Evaluate a single adaptation rule condition against a learner profile.
   *
   * Signal type mapping to profile fields:
   *   accuracy       -> emaState.accuracy
   *   response_time  -> emaState.responseTime
   *   engagement     -> emaState.engagement
   *   hint_usage     -> emaState.hintUsage
   *   skip_rate      -> emaState.skipRate
   *   mastery        -> average pKnown across all competency states
   *   fatigue        -> computed on-the-fly from EMA state
   *   session_duration -> totalTimeMinutes
   *   streak         -> sessionCount (continuous session proxy)
   */
  private evaluateCondition(
    condition: AdaptationRuleCondition,
    profile: AdaptationProfile,
  ): boolean {
    let currentValue: number;

    switch (condition.signal) {
      case 'accuracy':
        currentValue = profile.emaState.accuracy;
        break;
      case 'response_time':
        currentValue = profile.emaState.responseTime;
        break;
      case 'engagement':
        currentValue = profile.emaState.engagement;
        break;
      case 'hint_usage':
        currentValue = profile.emaState.hintUsage;
        break;
      case 'skip_rate':
        currentValue = profile.emaState.skipRate;
        break;
      case 'time_on_task':
        currentValue = profile.totalTimeMinutes;
        break;
      case 'retry_count':
        // Use session count as proxy
        currentValue = profile.sessionCount;
        break;
      case 'help_seeking':
        currentValue = profile.emaState.hintUsage;
        break;
      case 'error_pattern':
        // Use inverse of accuracy as proxy for error pattern severity
        currentValue = 1 - profile.emaState.accuracy;
        break;
      case 'mastery': {
        // Average pKnown across all competency states
        if (profile.competencyStates.length === 0) {
          currentValue = 0.5;
        } else {
          const totalPKnown = profile.competencyStates.reduce(
            (sum, cs) => sum + cs.params.pKnown,
            0,
          );
          currentValue = totalPKnown / profile.competencyStates.length;
        }
        break;
      }
      case 'fatigue': {
        // On-the-fly fatigue estimate from EMA state:
        // Combine accuracy decline proxy, hint usage, and skip rate
        const accuracyFatigue = Math.max(0, (0.5 - profile.emaState.accuracy) * 200); // 0 at 0.5+, 100 at 0
        const hintFatigue = Math.min(100, profile.emaState.hintUsage * 100);
        const skipFatigue = Math.min(100, profile.emaState.skipRate * 100);
        const durationFatigue = Math.min(
          100,
          (profile.totalTimeMinutes / FATIGUE_MAX_DURATION_MINUTES) * 100,
        );
        currentValue =
          FATIGUE_WEIGHTS.accuracyDecline * accuracyFatigue +
          FATIGUE_WEIGHTS.hintUsageIncrease * hintFatigue +
          FATIGUE_WEIGHTS.sessionDuration * durationFatigue +
          FATIGUE_WEIGHTS.responseTimeIncrease * skipFatigue +
          FATIGUE_WEIGHTS.errorBurstiness * accuracyFatigue;
        break;
      }
      case 'session_duration':
        currentValue = profile.totalTimeMinutes;
        break;
      case 'streak':
        currentValue = profile.sessionCount;
        break;
      default:
        // Unknown signal type; condition does not match
        return false;
    }

    return this.applyOperator(condition.operator, currentValue, condition.value, condition.secondaryValue);
  }

  /**
   * Apply a comparison operator.
   */
  private applyOperator(
    operator: AdaptationRuleOperator,
    currentValue: number,
    threshold: number,
    secondaryThreshold?: number,
  ): boolean {
    switch (operator) {
      case 'gt':
        return currentValue > threshold;
      case 'gte':
        return currentValue >= threshold;
      case 'lt':
        return currentValue < threshold;
      case 'lte':
        return currentValue <= threshold;
      case 'eq':
        return Math.abs(currentValue - threshold) < 1e-9;
      case 'neq':
        return Math.abs(currentValue - threshold) >= 1e-9;
      case 'between':
        return (
          secondaryThreshold !== undefined &&
          currentValue >= threshold &&
          currentValue <= secondaryThreshold
        );
      default:
        return false;
    }
  }

  // ==========================================================================
  // Private Helpers — EMA & Difficulty
  // ==========================================================================

  /**
   * Apply an exponential moving average update for a signal.
   * EMA formula: ema_new = alpha * newValue + (1 - alpha) * ema_old
   */
  private applyEmaUpdate(emaState: EMAState, signal: AdaptationSignal): void {
    const alpha = EMA_ALPHA;

    switch (signal.type) {
      case 'accuracy':
        emaState.accuracy = alpha * signal.value + (1 - alpha) * emaState.accuracy;
        break;
      case 'response_time':
        emaState.responseTime = alpha * signal.value + (1 - alpha) * emaState.responseTime;
        break;
      case 'engagement':
        emaState.engagement = alpha * signal.value + (1 - alpha) * emaState.engagement;
        break;
      case 'hint_usage':
        emaState.hintUsage = alpha * signal.value + (1 - alpha) * emaState.hintUsage;
        break;
      case 'skip_rate':
        emaState.skipRate = alpha * signal.value + (1 - alpha) * emaState.skipRate;
        break;
      default:
        // Other signal types do not have a dedicated EMA slot; skip silently
        break;
    }

    emaState.lastUpdated = new Date();
  }

  /**
   * Adjust difficulty to keep accuracy in the target 75-85% range.
   * Returns the clamped new difficulty.
   */
  private adjustDifficulty(currentDifficulty: number, emaAccuracy: number): number {
    let newDifficulty = currentDifficulty;

    if (emaAccuracy > TARGET_SUCCESS_HIGH) {
      newDifficulty += DIFFICULTY_STEP;
    } else if (emaAccuracy < TARGET_SUCCESS_LOW) {
      newDifficulty -= DIFFICULTY_STEP;
    }

    return Math.max(DIFFICULTY_MIN, Math.min(DIFFICULTY_MAX, newDifficulty));
  }

  // ==========================================================================
  // Private Helpers — BKT Simulation
  // ==========================================================================

  /**
   * Simulate a single BKT update step without mutating state.
   * Returns the new pKnown after one observation.
   */
  private simulateBKTUpdate(params: BKTParameters, wasCorrect: boolean): number {
    const { pLearn, pGuess, pSlip, pKnown } = params;

    let posterior: number;
    if (wasCorrect) {
      const num = pKnown * (1 - pSlip);
      const den = pKnown * (1 - pSlip) + (1 - pKnown) * pGuess;
      posterior = den > 0 ? num / den : pKnown;
    } else {
      const num = pKnown * pSlip;
      const den = pKnown * pSlip + (1 - pKnown) * (1 - pGuess);
      posterior = den > 0 ? num / den : pKnown;
    }

    return posterior + (1 - posterior) * pLearn;
  }

  // ==========================================================================
  // Private Helpers — Trend Calculation
  // ==========================================================================

  /**
   * Calculate mastery trend from the last TREND_WINDOW observations.
   *
   * Uses simple linear regression on pKnown values to determine slope:
   *   - slope > +0.01  -> improving
   *   - slope < -0.01  -> declining
   *   - otherwise      -> stable
   */
  private calculateTrend(
    history: MasterySnapshot[],
  ): 'improving' | 'stable' | 'declining' {
    if (history.length < 2) {
      return 'stable';
    }

    const recent = history.slice(-TREND_WINDOW);
    const n = recent.length;

    // Simple linear regression: y = a + b*x, where x is index, y is pKnown
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumX2 = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += recent[i].pKnown;
      sumXY += i * recent[i].pKnown;
      sumX2 += i * i;
    }

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) {
      return 'stable';
    }

    const slope = (n * sumXY - sumX * sumY) / denominator;

    if (slope > 0.01) return 'improving';
    if (slope < -0.01) return 'declining';
    return 'stable';
  }

  // ==========================================================================
  // Private Helpers — Fatigue Components
  // ==========================================================================

  /**
   * Compare first-half vs second-half accuracy, normalized to 0-100.
   * A positive score means accuracy declined.
   */
  private computeAccuracyDecline(signals: AdaptationSignal[]): number {
    const accuracySignals = signals.filter((s) => s.type === 'accuracy');
    if (accuracySignals.length < 4) return 0;

    const mid = Math.floor(accuracySignals.length / 2);
    const firstHalf = accuracySignals.slice(0, mid);
    const secondHalf = accuracySignals.slice(mid);

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.value, 0) / secondHalf.length;

    // Decline: first - second, normalized to 0-100
    // Max expected decline is about 0.5 (50% to 0%)
    const decline = Math.max(0, firstAvg - secondAvg);
    return Math.min(100, (decline / 0.5) * 100);
  }

  /**
   * Compare first-half vs second-half response times, normalized to 0-100.
   * A positive score means response times increased.
   */
  private computeResponseTimeIncrease(signals: AdaptationSignal[]): number {
    const rtSignals = signals.filter((s) => s.type === 'response_time');
    if (rtSignals.length < 4) return 0;

    const mid = Math.floor(rtSignals.length / 2);
    const firstHalf = rtSignals.slice(0, mid);
    const secondHalf = rtSignals.slice(mid);

    const firstAvg = firstHalf.reduce((sum, s) => sum + s.value, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, s) => sum + s.value, 0) / secondHalf.length;

    if (firstAvg <= 0) return 0;

    // Increase ratio: (secondAvg / firstAvg) - 1, capped at 1.0 (100% increase)
    const increaseRatio = Math.max(0, (secondAvg / firstAvg) - 1);
    return Math.min(100, increaseRatio * 100);
  }

  /**
   * Compare first-half vs second-half hint request frequency, normalized to 0-100.
   */
  private computeHintUsageIncrease(signals: AdaptationSignal[]): number {
    const hintSignals = signals.filter((s) => s.type === 'hint_usage');
    if (hintSignals.length < 2) return 0;

    const allSignals = signals;
    if (allSignals.length < 4) return 0;

    const mid = Math.floor(allSignals.length / 2);
    const firstHalfTotal = allSignals.slice(0, mid).length;
    const secondHalfTotal = allSignals.slice(mid).length;

    const firstHalfHints = hintSignals.filter((_, i) => {
      const signalIndex = allSignals.indexOf(hintSignals[i]);
      return signalIndex < mid;
    }).length;
    const secondHalfHints = hintSignals.length - firstHalfHints;

    // Hint frequency: hints per signal
    const firstFreq = firstHalfTotal > 0 ? firstHalfHints / firstHalfTotal : 0;
    const secondFreq = secondHalfTotal > 0 ? secondHalfHints / secondHalfTotal : 0;

    // Increase in frequency, normalized to 0-100
    const increase = Math.max(0, secondFreq - firstFreq);
    return Math.min(100, (increase / 0.5) * 100);
  }

  /**
   * Session duration fatigue score: linear scale from 0 at 0 min to 100 at 90+ min.
   */
  private computeSessionDurationScore(signals: AdaptationSignal[]): number {
    if (signals.length < 2) return 0;

    const first = new Date(signals[0].timestamp).getTime();
    const last = new Date(signals[signals.length - 1].timestamp).getTime();
    const durationMinutes = (last - first) / (1000 * 60);

    return Math.min(100, (durationMinutes / FATIGUE_MAX_DURATION_MINUTES) * 100);
  }

  /**
   * Detect clusters of consecutive errors (burstiness).
   *
   * Counts runs of consecutive incorrect answers. Longer bursts contribute
   * more to the score. Normalized to 0-100.
   */
  private computeErrorBurstiness(signals: AdaptationSignal[]): number {
    const accuracySignals = signals.filter((s) => s.type === 'accuracy');
    if (accuracySignals.length < 3) return 0;

    let maxBurst = 0;
    let currentBurst = 0;
    let totalBurstLength = 0;
    let burstCount = 0;

    for (const sig of accuracySignals) {
      if (sig.value < 0.5) {
        // Incorrect
        currentBurst++;
        if (currentBurst > maxBurst) {
          maxBurst = currentBurst;
        }
      } else {
        if (currentBurst >= 2) {
          totalBurstLength += currentBurst;
          burstCount++;
        }
        currentBurst = 0;
      }
    }

    // Handle trailing burst
    if (currentBurst >= 2) {
      totalBurstLength += currentBurst;
      burstCount++;
    }

    // Score: combines max burst length and total burst frequency
    // Max burst of 5+ is fully fatigued, scale linearly
    const maxBurstScore = Math.min(100, (maxBurst / 5) * 100);

    // Burst frequency: percentage of signals in bursts
    const burstFrequencyScore =
      accuracySignals.length > 0
        ? Math.min(100, (totalBurstLength / accuracySignals.length) * 200)
        : 0;

    return 0.6 * maxBurstScore + 0.4 * burstFrequencyScore;
  }

  /**
   * Map a composite fatigue score to a recommendation.
   */
  private fatigueRecommendation(score: number): FatigueRecommendation {
    if (score > 85) return 'end_session';
    if (score > 70) return 'take_break';
    if (score > 50) return 'switch_topic';
    if (score > 30) return 'reduce_difficulty';
    return 'continue';
  }

  // ==========================================================================
  // Private Helpers — Data Mapping & Persistence
  // ==========================================================================

  /**
   * Map a database AdaptationProfile row (with included competencyStates)
   * to the service-layer AdaptationProfile type.
   */
  private mapProfileFromDb(dbProfile: any): AdaptationProfile {
    const competencyStates: BKTCompetencyState[] = (dbProfile.competencyStates || []).map(
      (cs: any) => ({
        competencyId: cs.competencyId,
        domain: cs.domain,
        params: {
          pLearn: cs.pLearn,
          pGuess: cs.pGuess,
          pSlip: cs.pSlip,
          pKnown: cs.pKnown,
        },
        observations: cs.observations,
        lastObservationAt: cs.lastObservationAt ?? new Date(),
        masteryHistory: (cs.masteryHistory as unknown as MasterySnapshot[]) || [],
      }),
    );

    return {
      id: dbProfile.id,
      tenantId: dbProfile.tenantId,
      learnerId: dbProfile.learnerId,
      competencyStates,
      emaState: {
        accuracy: dbProfile.emaAccuracy,
        responseTime: dbProfile.emaResponseTime,
        engagement: dbProfile.emaEngagement,
        hintUsage: dbProfile.emaHintUsage,
        skipRate: dbProfile.emaSkipRate,
        lastUpdated: dbProfile.updatedAt,
      },
      currentDifficulty: dbProfile.currentDifficulty,
      targetSuccessRate: dbProfile.targetSuccessRate,
      sessionCount: dbProfile.sessionCount,
      totalTimeMinutes: dbProfile.totalTimeMinutes,
      lastSessionAt: dbProfile.lastSessionAt ?? undefined,
      createdAt: dbProfile.createdAt,
      updatedAt: dbProfile.updatedAt,
    };
  }

  /**
   * Map a database AdaptationRule row to the service-layer type.
   */
  private mapRuleFromDb(dbRule: any): AdaptationRule {
    return {
      id: dbRule.id,
      tenantId: dbRule.tenantId,
      name: dbRule.name,
      description: dbRule.description,
      scope: dbRule.scope as AdaptationRule['scope'],
      scopeId: dbRule.scopeId ?? undefined,
      priority: dbRule.priority,
      conditions: dbRule.conditions as unknown as AdaptationRuleCondition[],
      conditionLogic: dbRule.conditionLogic as 'AND' | 'OR',
      action: dbRule.action as unknown as AdaptationRuleAction,
      isActive: dbRule.isActive,
      createdAt: dbRule.createdAt,
      updatedAt: dbRule.updatedAt,
    };
  }

  /**
   * Persist the in-memory profile state back to the database.
   * Updates the profile fields, upserts competency states, and prunes
   * mastery history to prevent unbounded growth.
   */
  private async persistProfile(profile: AdaptationProfile): Promise<void> {
    const MAX_MASTERY_HISTORY = 500;

    // Update the main profile record
    await prisma.adaptationProfile.update({
      where: { id: profile.id },
      data: {
        emaAccuracy: profile.emaState.accuracy,
        emaResponseTime: profile.emaState.responseTime,
        emaEngagement: profile.emaState.engagement,
        emaHintUsage: profile.emaState.hintUsage,
        emaSkipRate: profile.emaState.skipRate,
        currentDifficulty: profile.currentDifficulty,
        targetSuccessRate: profile.targetSuccessRate,
        sessionCount: profile.sessionCount,
        totalTimeMinutes: profile.totalTimeMinutes,
        lastSessionAt: profile.lastSessionAt,
      },
    });

    // Upsert each competency state
    for (const cs of profile.competencyStates) {
      // Trim mastery history to prevent unbounded storage growth
      const trimmedHistory =
        cs.masteryHistory.length > MAX_MASTERY_HISTORY
          ? cs.masteryHistory.slice(-MAX_MASTERY_HISTORY)
          : cs.masteryHistory;

      await prisma.bKTCompetencyState.upsert({
        where: {
          profileId_competencyId: {
            profileId: profile.id,
            competencyId: cs.competencyId,
          },
        },
        create: {
          profileId: profile.id,
          competencyId: cs.competencyId,
          domain: cs.domain,
          pLearn: cs.params.pLearn,
          pGuess: cs.params.pGuess,
          pSlip: cs.params.pSlip,
          pKnown: cs.params.pKnown,
          observations: cs.observations,
          lastObservationAt: cs.lastObservationAt,
          masteryHistory: trimmedHistory as unknown as any,
        },
        update: {
          domain: cs.domain,
          pLearn: cs.params.pLearn,
          pGuess: cs.params.pGuess,
          pSlip: cs.params.pSlip,
          pKnown: cs.params.pKnown,
          observations: cs.observations,
          lastObservationAt: cs.lastObservationAt,
          masteryHistory: trimmedHistory as unknown as any,
        },
      });
    }
  }
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: AdaptationEngineService | null = null;

export function initializeAdaptationEngineService(): AdaptationEngineService {
  if (!instance) {
    instance = new AdaptationEngineService();
    log.info('AdaptationEngineService initialized');
  }
  return instance;
}

export function getAdaptationEngineService(): AdaptationEngineService {
  if (!instance) {
    throw new Error(
      'AdaptationEngineService not initialized. Call initializeAdaptationEngineService() first.',
    );
  }
  return instance;
}
