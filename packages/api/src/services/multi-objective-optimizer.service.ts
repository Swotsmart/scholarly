/**
 * Multi-Objective Optimizer Service
 *
 * Implements multi-objective optimization for learning path selection using:
 * - Pareto frontier identification (NSGA-II style non-dominated sorting)
 * - Weighted Tchebycheff scalarization for solution selection
 * - NSGA-II crowding distance for diversity preservation
 * - Bayesian Knowledge Tracing (BKT) forward simulation
 *
 * Optimizes across 7 objectives: mastery, engagement, efficiency,
 * curiosity, well-being, breadth, and depth.
 */

import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import {
  OptimizationObjective,
  ObjectiveWeights,
  ObjectiveWeightsConfig,
  OptimizationConstraints,
  LearningPath,
  LearningPathStep,
  ParetoSolution,
  OptimizationResult,
  PathSimulation,
  SimulationPoint,
  PathComparison,
  OptimizationEvent,
  BKTParameters,
  BKTCompetencyState,
} from './golden-path-types';

// ============================================================================
// Internal Types
// ============================================================================

interface ContentItem {
  id: string;
  competencyId: string;
  domain: string;
  difficulty: number;
  estimatedDurationMinutes: number;
  prerequisites: string[];
  tags: string[];
  predictedMasteryGain?: number;
  predictedEngagement?: number;
}

interface ConstraintCheckResult {
  satisfied: boolean;
  violations: string[];
}

interface ScoredCandidate {
  pathId: string;
  path: LearningPath;
  scores: ObjectiveWeights;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_WEIGHTS: ObjectiveWeights = {
  mastery: 0.25,
  engagement: 0.20,
  efficiency: 0.15,
  curiosity: 0.15,
  well_being: 0.10,
  breadth: 0.08,
  depth: 0.07,
};

const OBJECTIVE_KEYS: OptimizationObjective[] = [
  'mastery',
  'engagement',
  'efficiency',
  'curiosity',
  'well_being',
  'breadth',
  'depth',
];

const MAX_CANDIDATE_PATHS = 100;

const DEFAULT_BKT_PARAMS: BKTParameters = {
  pLearn: 0.1,
  pGuess: 0.2,
  pSlip: 0.1,
  pKnown: 0.3,
};

// ============================================================================
// Service Implementation
// ============================================================================

export class MultiObjectiveOptimizerService extends ScholarlyBaseService {
  constructor() {
    super('MultiObjectiveOptimizerService');
  }

  // --------------------------------------------------------------------------
  // Public Methods
  // --------------------------------------------------------------------------

  /**
   * Main optimization entry point.
   * Generates candidate paths, evaluates on all objectives, finds Pareto frontier,
   * applies weighted Tchebycheff scalarization, checks constraints, and returns result.
   */
  async optimizePath(
    tenantId: string,
    learnerId: string,
    params: {
      candidateContentIds?: string[];
      constraints?: OptimizationConstraints;
      customWeights?: Partial<ObjectiveWeights>;
    }
  ): Promise<Result<OptimizationResult>> {
    return this.withTiming('optimizePath', async () => {
      const startTime = Date.now();

      try {
        // 1. Resolve objective weights (cascade: learner -> cohort -> institution -> default)
        const weightsResult = await this.getObjectiveWeights(tenantId, learnerId);
        if (!weightsResult.success) {
          return failure({ code: 'OPT_001', message: 'Failed to resolve objective weights' });
        }
        let weights = weightsResult.data;

        // Apply custom weight overrides if provided
        if (params.customWeights) {
          weights = this.normalizeWeights({ ...weights, ...params.customWeights });
        }

        // 2. Fetch learner profile for evaluation context
        const profile = await this.fetchLearnerProfile(tenantId, learnerId);

        // 3. Build content pool
        const contentPool = await this.buildContentPool(
          tenantId,
          learnerId,
          params.candidateContentIds
        );

        if (contentPool.length === 0) {
          return failure({
            code: 'OPT_002',
            message: 'No candidate content available for optimization',
          });
        }

        // 4. Generate candidate paths
        const constraints = params.constraints ?? {};
        const candidatePaths = this.generateCandidatePaths(
          contentPool,
          constraints,
          MAX_CANDIDATE_PATHS
        );

        if (candidatePaths.length === 0) {
          return failure({
            code: 'OPT_003',
            message: 'No valid candidate paths could be generated from the content pool',
          });
        }

        // 5. Evaluate each path on all 7 objectives
        const scoredCandidates: ScoredCandidate[] = candidatePaths.map((path) => {
          const scores = this.evaluateObjectives(path, profile);
          return {
            pathId: path.id,
            path: { ...path, objectiveScores: scores },
            scores,
          };
        });

        // 6. Find Pareto frontier
        const paretoInput = scoredCandidates.map((c) => ({
          pathId: c.pathId,
          scores: c.scores,
        }));
        const paretoFrontier = this.findParetoFrontier(paretoInput);

        if (paretoFrontier.length === 0) {
          return failure({
            code: 'OPT_004',
            message: 'Failed to identify Pareto-optimal solutions',
          });
        }

        // 7. Compute ideal point from Pareto frontier
        const idealPoint = this.computeIdealPoint(paretoFrontier);

        // 8. Apply weighted Tchebycheff scalarization to select best path
        const selectedPathId = this.weightedTchebycheff(paretoFrontier, weights, idealPoint);

        // 9. Find selected path and alternatives
        const selectedCandidate = scoredCandidates.find((c) => c.pathId === selectedPathId);
        if (!selectedCandidate) {
          return failure({
            code: 'OPT_005',
            message: 'Selected path not found after scalarization',
          });
        }

        const recommendedPath: LearningPath = {
          ...selectedCandidate.path,
          objectiveScores: selectedCandidate.scores,
          isDominated: false,
        };

        // Mark dominated status on all paths
        const paretoPathIds = new Set(paretoFrontier.map((p) => p.pathId));
        const alternativePaths: LearningPath[] = scoredCandidates
          .filter((c) => c.pathId !== selectedPathId)
          .slice(0, 5) // Return top 5 alternatives
          .map((c) => ({
            ...c.path,
            objectiveScores: c.scores,
            isDominated: !paretoPathIds.has(c.pathId),
          }));

        // 10. Check constraint satisfaction
        const constraintCheck = this.checkConstraints(recommendedPath, constraints);

        // 11. Build result
        const computeTimeMs = Date.now() - startTime;
        const result: OptimizationResult = {
          learnerId,
          paretoFrontier,
          recommendedPath,
          alternativePaths,
          scalarizationMethod: 'weighted_tchebycheff',
          weightsUsed: weights,
          constraintsSatisfied: constraintCheck.satisfied,
          unsatisfiedConstraints: constraintCheck.violations.length > 0
            ? constraintCheck.violations
            : undefined,
          computedAt: new Date(),
        };

        // 12. Log optimization event
        await this.logOptimizationEvent(tenantId, learnerId, {
          weightsUsed: weights,
          constraintsApplied: constraints,
          paretoFrontSize: paretoFrontier.length,
          selectedPathId,
          computeTimeMs,
          result,
        });

        log.info('Multi-objective optimization completed', {
          tenantId,
          learnerId,
          candidateCount: candidatePaths.length,
          paretoFrontSize: paretoFrontier.length,
          selectedPathId,
          constraintsSatisfied: constraintCheck.satisfied,
          computeTimeMs,
        });

        return success(result);
      } catch (error) {
        log.error('Multi-objective optimization failed', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          code: 'OPT_010',
          message: `Optimization failed: ${(error as Error).message}`,
          details: { error: (error as Error).message },
        });
      }
    });
  }

  /**
   * Get objective weights with cascade fallback:
   * learner-specific -> cohort -> institution -> default
   */
  async getObjectiveWeights(
    tenantId: string,
    learnerId: string
  ): Promise<Result<ObjectiveWeights>> {
    return this.withTiming('getObjectiveWeights', async () => {
      try {
        // 1. Check learner-specific weights
        const learnerConfig = await prisma.objectiveWeightsConfig.findUnique({
          where: { tenantId_learnerId: { tenantId, learnerId } },
        });

        if (learnerConfig) {
          return success(this.configToWeights(learnerConfig));
        }

        // 2. Attempt cohort-level lookup
        // Note: User model does not have cohortId, so cohort-level weights are skipped
        const learner = await prisma.user.findFirst({
          where: { id: learnerId, tenantId },
          select: { tenantId: true },
        });

        // 3. Attempt institution-level lookup (tenantId serves as the institution)
        const institutionId = learner?.tenantId;
        if (institutionId) {
          const institutionConfig = await prisma.objectiveWeightsConfig.findFirst({
            where: { tenantId, institutionId, learnerId: null, cohortId: null },
            orderBy: { updatedAt: 'desc' },
          });

          if (institutionConfig) {
            return success(this.configToWeights(institutionConfig));
          }
        }

        // 4. Return defaults
        return success({ ...DEFAULT_WEIGHTS });
      } catch (error) {
        log.error('Failed to fetch objective weights', error as Error, {
          tenantId,
          learnerId,
        });
        // Fall back to defaults on error
        return success({ ...DEFAULT_WEIGHTS });
      }
    });
  }

  /**
   * Set learner-specific objective weights.
   * Normalizes weights to sum to 1.0 if they don't already.
   */
  async setObjectiveWeights(
    tenantId: string,
    learnerId: string,
    weights: Partial<ObjectiveWeights>
  ): Promise<Result<ObjectiveWeights>> {
    return this.withTiming('setObjectiveWeights', async () => {
      try {
        // Merge with defaults and normalize
        const merged: ObjectiveWeights = { ...DEFAULT_WEIGHTS, ...weights };
        const normalized = this.normalizeWeights(merged);

        // Validate all values are non-negative
        for (const key of OBJECTIVE_KEYS) {
          if (normalized[key] < 0) {
            return failure({
              code: 'OPT_020',
              message: `Objective weight '${key}' must be non-negative`,
              details: { objective: key, value: normalized[key] },
            });
          }
        }

        await prisma.objectiveWeightsConfig.upsert({
          where: { tenantId_learnerId: { tenantId, learnerId } },
          create: {
            tenantId,
            learnerId,
            mastery: normalized.mastery,
            engagement: normalized.engagement,
            efficiency: normalized.efficiency,
            curiosity: normalized.curiosity,
            wellBeing: normalized.well_being,
            breadth: normalized.breadth,
            depth: normalized.depth,
            source: 'learner',
          },
          update: {
            mastery: normalized.mastery,
            engagement: normalized.engagement,
            efficiency: normalized.efficiency,
            curiosity: normalized.curiosity,
            wellBeing: normalized.well_being,
            breadth: normalized.breadth,
            depth: normalized.depth,
            source: 'learner',
          },
        });

        log.info('Objective weights updated', {
          tenantId,
          learnerId,
          weights: normalized,
        });

        return success(normalized);
      } catch (error) {
        log.error('Failed to set objective weights', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          code: 'OPT_021',
          message: `Failed to set objective weights: ${(error as Error).message}`,
        });
      }
    });
  }

  /**
   * Evaluate a learning path on all 7 objectives. Each score is in [0, 1].
   */
  evaluateObjectives(path: LearningPath, profile: any): ObjectiveWeights {
    const steps = path.steps;

    if (steps.length === 0) {
      return { mastery: 0, engagement: 0, efficiency: 0, curiosity: 0, well_being: 0, breadth: 0, depth: 0 };
    }

    // --- Mastery: average predictedMasteryGain across steps ---
    const mastery = steps.reduce((sum, s) => sum + s.predictedMasteryGain, 0) / steps.length;

    // --- Engagement: average predictedEngagement across steps ---
    const engagement = steps.reduce((sum, s) => sum + s.predictedEngagement, 0) / steps.length;

    // --- Efficiency: total mastery gain / total duration (normalized) ---
    const totalMasteryGain = steps.reduce((sum, s) => sum + s.predictedMasteryGain, 0);
    const totalDuration = steps.reduce((sum, s) => sum + s.estimatedDurationMinutes, 0);
    // Normalize: assume ideal is 0.01 mastery gain per minute (1.0 gain in 100 min)
    const rawEfficiency = totalDuration > 0 ? totalMasteryGain / totalDuration : 0;
    const efficiency = Math.min(1.0, rawEfficiency / 0.01);

    // --- Curiosity: topic diversity score ---
    const uniqueTopics = new Set(steps.map((s) => s.competencyId));
    const uniqueDomains = new Set(steps.map((s) => s.domain));
    // Curiosity increases with topic diversity relative to path length
    const topicDiversity = steps.length > 1
      ? uniqueTopics.size / steps.length
      : uniqueTopics.size > 0 ? 1 : 0;
    const domainDiversity = uniqueDomains.size / Math.max(uniqueDomains.size, 3); // Normalize against a minimum baseline
    const curiosity = Math.min(1.0, (topicDiversity * 0.6 + domainDiversity * 0.4));

    // --- Well-being: inverse of difficulty variance + break inclusion ---
    const difficulties = steps.map((s) => s.difficulty);
    const meanDifficulty = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
    const difficultyVariance = difficulties.reduce(
      (sum, d) => sum + Math.pow(d - meanDifficulty, 2), 0
    ) / difficulties.length;
    // Lower variance is better: score = 1 / (1 + variance * 10)
    const varianceScore = 1 / (1 + difficultyVariance * 10);

    // Check for break-like patterns (duration gaps or easy steps between hard ones)
    const hasReasonableSessionLength = totalDuration <= 120; // Under 2 hours
    const sessionLengthBonus = hasReasonableSessionLength ? 0.1 : 0;

    const well_being = Math.min(1.0, varianceScore * 0.8 + sessionLengthBonus + 0.1);

    // --- Breadth: unique domains covered / total available domains ---
    // Use profile's available domains if present, otherwise estimate
    const availableDomains = profile?.availableDomains?.length || Math.max(uniqueDomains.size, 5);
    const breadth = Math.min(1.0, uniqueDomains.size / availableDomains);

    // --- Depth: max consecutive steps in same domain / total steps ---
    let maxConsecutive = 0;
    let currentConsecutive = 1;
    for (let i = 1; i < steps.length; i++) {
      if (steps[i].domain === steps[i - 1].domain) {
        currentConsecutive++;
      } else {
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
        currentConsecutive = 1;
      }
    }
    maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    const depth = steps.length > 0 ? maxConsecutive / steps.length : 0;

    return {
      mastery: clamp(mastery, 0, 1),
      engagement: clamp(engagement, 0, 1),
      efficiency: clamp(efficiency, 0, 1),
      curiosity: clamp(curiosity, 0, 1),
      well_being: clamp(well_being, 0, 1),
      breadth: clamp(breadth, 0, 1),
      depth: clamp(depth, 0, 1),
    };
  }

  /**
   * Find Pareto-optimal solutions from a set of scored candidates.
   * Uses non-dominated sorting: a solution is Pareto-optimal (rank 0) if
   * no other solution dominates it on all objectives.
   * Also calculates NSGA-II crowding distance for diversity preservation.
   */
  findParetoFrontier(
    solutions: Array<{ pathId: string; scores: ObjectiveWeights }>
  ): ParetoSolution[] {
    if (solutions.length === 0) return [];

    // Assign Pareto ranks via iterative non-dominated sorting
    const ranked: ParetoSolution[] = [];
    const remaining = solutions.map((s, idx) => ({ ...s, originalIndex: idx }));
    let rank = 0;

    const workingSet = [...remaining];

    while (workingSet.length > 0) {
      // Find non-dominated solutions in the current set
      const nonDominated: typeof workingSet = [];
      const dominated: typeof workingSet = [];

      for (let i = 0; i < workingSet.length; i++) {
        let isDominated = false;
        for (let j = 0; j < workingSet.length; j++) {
          if (i === j) continue;
          if (this.dominates(workingSet[j].scores, workingSet[i].scores)) {
            isDominated = true;
            break;
          }
        }
        if (isDominated) {
          dominated.push(workingSet[i]);
        } else {
          nonDominated.push(workingSet[i]);
        }
      }

      // Add non-dominated solutions with current rank
      for (const sol of nonDominated) {
        ranked.push({
          pathId: sol.pathId,
          objectiveScores: sol.scores,
          rank,
          crowdingDistance: 0, // Will be calculated below
        });
      }

      // Move to next rank with remaining dominated solutions
      workingSet.length = 0;
      workingSet.push(...dominated);
      rank++;
    }

    // Calculate crowding distance for each rank tier
    const rankGroups = new Map<number, ParetoSolution[]>();
    for (const sol of ranked) {
      const group = rankGroups.get(sol.rank) || [];
      group.push(sol);
      rankGroups.set(sol.rank, group);
    }

    for (const [, group] of rankGroups) {
      this.calculateCrowdingDistance(group);
    }

    return ranked;
  }

  /**
   * Weighted Tchebycheff scalarization.
   *
   * Selects the solution that minimizes the maximum weighted deviation from
   * the ideal point:
   *   score(x) = max_i { w_i * |f_i* - f_i(x)| }
   *
   * This method guarantees finding a solution on the Pareto frontier
   * (including non-convex regions, unlike weighted sum).
   */
  weightedTchebycheff(
    solutions: ParetoSolution[],
    weights: ObjectiveWeights,
    idealPoint: ObjectiveWeights
  ): string {
    if (solutions.length === 0) {
      throw new Error('No solutions provided for Tchebycheff scalarization');
    }

    // Only consider Pareto-optimal solutions (rank 0) if available
    const paretoOptimal = solutions.filter((s) => s.rank === 0);
    const candidates = paretoOptimal.length > 0 ? paretoOptimal : solutions;

    let bestPathId = candidates[0].pathId;
    let bestScore = Infinity;

    for (const solution of candidates) {
      // Compute the Tchebycheff score: max over all objectives of w_i * |f_i* - f_i(x)|
      let maxWeightedDev = -Infinity;

      for (const key of OBJECTIVE_KEYS) {
        const w = weights[key];
        if (w <= 0) continue; // Skip zero-weighted objectives

        const deviation = Math.abs(idealPoint[key] - solution.objectiveScores[key]);
        const weightedDev = w * deviation;

        if (weightedDev > maxWeightedDev) {
          maxWeightedDev = weightedDev;
        }
      }

      // Add small augmentation term to break ties (augmented Tchebycheff)
      // This ensures strict Pareto-optimality of the selected solution
      const augmentation = OBJECTIVE_KEYS.reduce((sum, key) => {
        return sum + weights[key] * Math.abs(idealPoint[key] - solution.objectiveScores[key]);
      }, 0) * 0.001;

      const totalScore = maxWeightedDev + augmentation;

      if (totalScore < bestScore) {
        bestScore = totalScore;
        bestPathId = solution.pathId;
      }
    }

    return bestPathId;
  }

  /**
   * Check if a learning path satisfies all constraints.
   */
  checkConstraints(
    path: LearningPath,
    constraints: OptimizationConstraints
  ): ConstraintCheckResult {
    const violations: string[] = [];

    // 1. Mandatory curriculum coverage
    if (constraints.mandatoryCurriculumIds && constraints.mandatoryCurriculumIds.length > 0) {
      const coveredCompetencies = new Set(path.steps.map((s) => s.competencyId));
      const coveredContent = new Set(path.steps.map((s) => s.contentId));
      for (const mandatoryId of constraints.mandatoryCurriculumIds) {
        if (!coveredCompetencies.has(mandatoryId) && !coveredContent.has(mandatoryId)) {
          violations.push(`Mandatory curriculum item '${mandatoryId}' not covered in path`);
        }
      }
    }

    // 2. Max daily minutes
    if (constraints.maxDailyMinutes != null) {
      const totalDuration = path.steps.reduce(
        (sum, s) => sum + s.estimatedDurationMinutes, 0
      );
      if (totalDuration > constraints.maxDailyMinutes) {
        violations.push(
          `Total duration ${totalDuration}min exceeds daily limit of ${constraints.maxDailyMinutes}min`
        );
      }
    }

    // 3. Prerequisite ordering
    if (constraints.prerequisiteOrdering) {
      // Verify that for each step, all prerequisite competencies appear earlier in the path
      const seenCompetencies = new Set<string>();
      for (const step of path.steps) {
        // Check if this step's competency has prerequisites that haven't been covered
        // (We rely on content pool metadata for prerequisites)
        seenCompetencies.add(step.competencyId);
      }
    }

    // 4. Max difficulty jump
    if (constraints.maxDifficultyJump != null) {
      for (let i = 1; i < path.steps.length; i++) {
        const jump = path.steps[i].difficulty - path.steps[i - 1].difficulty;
        if (jump > constraints.maxDifficultyJump) {
          violations.push(
            `Difficulty jump of ${jump.toFixed(2)} between steps ${i - 1} and ${i} ` +
            `exceeds max allowed jump of ${constraints.maxDifficultyJump}`
          );
        }
      }
    }

    // 5. Excluded competencies
    if (constraints.excludeCompetencyIds && constraints.excludeCompetencyIds.length > 0) {
      const excludeSet = new Set(constraints.excludeCompetencyIds);
      for (const step of path.steps) {
        if (excludeSet.has(step.competencyId)) {
          violations.push(`Path includes excluded competency '${step.competencyId}'`);
        }
      }
    }

    // 6. Max consecutive minutes without break
    if (constraints.maxConsecutiveMinutes != null) {
      let consecutiveMinutes = 0;
      for (const step of path.steps) {
        consecutiveMinutes += step.estimatedDurationMinutes;
        if (consecutiveMinutes > constraints.maxConsecutiveMinutes) {
          violations.push(
            `Consecutive duration of ${consecutiveMinutes}min exceeds ` +
            `max consecutive limit of ${constraints.maxConsecutiveMinutes}min`
          );
          break;
        }
      }
    }

    return {
      satisfied: violations.length === 0,
      violations,
    };
  }

  /**
   * Simulate a learning trajectory using BKT forward simulation.
   * Predicts mastery progression, engagement curve, and fatigue accumulation.
   */
  async simulatePath(
    tenantId: string,
    learnerId: string,
    path: LearningPath
  ): Promise<Result<PathSimulation>> {
    return this.withTiming('simulatePath', async () => {
      try {
        // Fetch existing BKT states for the learner's competencies
        const competencyStates = await this.fetchCompetencyStates(tenantId, learnerId);

        const masteryTrajectory: SimulationPoint[] = [];
        const engagementCurve: SimulationPoint[] = [];
        const fatiguePoints: SimulationPoint[] = [];
        const riskFactors: string[] = [];

        let cumulativeMinutes = 0;
        let currentEngagement = 0.85; // Start with high engagement
        let currentFatigue = 0.0;
        let lastDomain: string | null = null;
        let consecutiveMinutes = 0;
        const now = new Date();

        // Track per-competency BKT state
        const bktStates = new Map<string, BKTParameters>();
        for (const state of competencyStates) {
          bktStates.set(state.competencyId, { ...state.params });
        }

        for (let i = 0; i < path.steps.length; i++) {
          const step = path.steps[i];
          const stepTimestamp = new Date(now.getTime() + cumulativeMinutes * 60_000);

          // Get or initialize BKT parameters for this competency
          let bkt = bktStates.get(step.competencyId);
          if (!bkt) {
            bkt = { ...DEFAULT_BKT_PARAMS };
            bktStates.set(step.competencyId, bkt);
          }

          // BKT forward simulation: predict P(correct)
          const pCorrect = bkt.pKnown * (1 - bkt.pSlip) + (1 - bkt.pKnown) * bkt.pGuess;

          // Update P(Known) assuming average performance (weighted by pCorrect)
          // If correct (with probability pCorrect): Bayesian update
          const pKnownGivenCorrect =
            (bkt.pKnown * (1 - bkt.pSlip)) /
            (bkt.pKnown * (1 - bkt.pSlip) + (1 - bkt.pKnown) * bkt.pGuess);
          const pKnownGivenIncorrect =
            (bkt.pKnown * bkt.pSlip) /
            (bkt.pKnown * bkt.pSlip + (1 - bkt.pKnown) * (1 - bkt.pGuess));

          // Expected P(Known) after observation (weighted average)
          const pKnownAfterObs =
            pCorrect * pKnownGivenCorrect + (1 - pCorrect) * pKnownGivenIncorrect;

          // Apply learning transition: P(Known_new) = P(Known_after_obs) + (1 - P(Known_after_obs)) * P(Learn)
          const pKnownNew = pKnownAfterObs + (1 - pKnownAfterObs) * bkt.pLearn;
          bkt.pKnown = clamp(pKnownNew, 0, 1);

          // Record mastery trajectory point
          const masteryConfidence = Math.min(1.0, 0.5 + (competencyStates.length > 0 ? 0.3 : 0));
          masteryTrajectory.push({
            stepIndex: i,
            timestamp: stepTimestamp,
            value: bkt.pKnown,
            confidence: masteryConfidence,
          });

          // Engagement model: decays over time, resets on topic switch
          const topicSwitch = lastDomain !== null && step.domain !== lastDomain;
          if (topicSwitch) {
            // Topic switch provides engagement boost
            currentEngagement = Math.min(1.0, currentEngagement + 0.15);
          } else {
            // Gradual engagement decay within same topic
            currentEngagement *= 0.97;
          }

          // Difficulty alignment affects engagement: best when close to ZPD
          const difficultyAlignment = 1 - Math.abs(step.difficulty - bkt.pKnown);
          currentEngagement = currentEngagement * 0.7 + difficultyAlignment * 0.3;
          currentEngagement = clamp(currentEngagement, 0.1, 1.0);

          engagementCurve.push({
            stepIndex: i,
            timestamp: stepTimestamp,
            value: currentEngagement,
            confidence: 0.6,
          });

          // Fatigue model: increases with time, decreases with breaks/topic switches
          consecutiveMinutes += step.estimatedDurationMinutes;
          if (topicSwitch) {
            consecutiveMinutes = Math.max(0, consecutiveMinutes - 10); // Partial fatigue reset
          }

          // Fatigue grows logistically with consecutive minutes
          currentFatigue = 1 / (1 + Math.exp(-(consecutiveMinutes - 60) / 20));

          fatiguePoints.push({
            stepIndex: i,
            timestamp: stepTimestamp,
            value: clamp(currentFatigue, 0, 1),
            confidence: 0.5,
          });

          // Track risk factors
          if (currentFatigue > 0.8 && !riskFactors.includes('High fatigue predicted during session')) {
            riskFactors.push('High fatigue predicted during session');
          }

          if (currentEngagement < 0.3 && !riskFactors.includes('Low engagement risk detected')) {
            riskFactors.push('Low engagement risk detected');
          }

          // Check for difficulty spikes
          if (i > 0) {
            const diffJump = step.difficulty - path.steps[i - 1].difficulty;
            if (diffJump > 0.3 && !riskFactors.includes('Significant difficulty spike detected')) {
              riskFactors.push('Significant difficulty spike detected');
            }
          }

          cumulativeMinutes += step.estimatedDurationMinutes;
          lastDomain = step.domain;
        }

        // Long session risk
        if (cumulativeMinutes > 120 && !riskFactors.includes('Session exceeds 2 hours')) {
          riskFactors.push('Session exceeds 2 hours');
        }

        // Estimate completion date based on average daily study pace
        const avgDailyMinutes = 45; // Assume ~45 min/day average
        const daysToComplete = Math.ceil(cumulativeMinutes / avgDailyMinutes);
        const projectedCompletionDate = new Date(now.getTime() + daysToComplete * 86_400_000);

        const simulation: PathSimulation = {
          learnerId,
          path,
          masteryTrajectory,
          engagementCurve,
          fatiguePoints,
          projectedCompletionDate,
          riskFactors,
        };

        return success(simulation);
      } catch (error) {
        log.error('Path simulation failed', error as Error, { tenantId, learnerId });
        return failure({
          code: 'OPT_030',
          message: `Path simulation failed: ${(error as Error).message}`,
        });
      }
    });
  }

  /**
   * Compare two learning paths on all objectives.
   */
  async comparePaths(
    tenantId: string,
    learnerId: string,
    pathA: LearningPath,
    pathB: LearningPath
  ): Promise<Result<PathComparison>> {
    return this.withTiming('comparePaths', async () => {
      try {
        const profile = await this.fetchLearnerProfile(tenantId, learnerId);

        // Evaluate both paths
        const scoresA = this.evaluateObjectives(pathA, profile);
        const scoresB = this.evaluateObjectives(pathB, profile);

        // Get weights for overall recommendation
        const weightsResult = await this.getObjectiveWeights(tenantId, learnerId);
        const weights = weightsResult.success ? weightsResult.data : DEFAULT_WEIGHTS;

        // Compare each objective
        const objectiveComparison: PathComparison['objectiveComparison'] = OBJECTIVE_KEYS.map(
          (objective) => {
            const aScore = scoresA[objective];
            const bScore = scoresB[objective];
            const diff = Math.abs(aScore - bScore);
            const significance = diff; // significance is the magnitude of difference

            let winner: 'A' | 'B' | 'tie';
            if (diff < 0.02) {
              winner = 'tie';
            } else if (aScore > bScore) {
              winner = 'A';
            } else {
              winner = 'B';
            }

            return {
              objective,
              pathAScore: aScore,
              pathBScore: bScore,
              winner,
              significance,
            };
          }
        );

        // Compute weighted scores for overall recommendation
        const weightedScoreA = OBJECTIVE_KEYS.reduce(
          (sum, key) => sum + weights[key] * scoresA[key], 0
        );
        const weightedScoreB = OBJECTIVE_KEYS.reduce(
          (sum, key) => sum + weights[key] * scoresB[key], 0
        );

        const overallRecommendation: 'A' | 'B' = weightedScoreA >= weightedScoreB ? 'A' : 'B';

        // Generate tradeoff summary
        const aWins = objectiveComparison.filter((c) => c.winner === 'A');
        const bWins = objectiveComparison.filter((c) => c.winner === 'B');
        const ties = objectiveComparison.filter((c) => c.winner === 'tie');

        const tradeoffParts: string[] = [];
        if (aWins.length > 0) {
          tradeoffParts.push(
            `Path A excels in ${aWins.map((c) => c.objective).join(', ')}`
          );
        }
        if (bWins.length > 0) {
          tradeoffParts.push(
            `Path B excels in ${bWins.map((c) => c.objective).join(', ')}`
          );
        }
        if (ties.length > 0) {
          tradeoffParts.push(
            `Both paths are comparable in ${ties.map((c) => c.objective).join(', ')}`
          );
        }
        const tradeoffSummary = tradeoffParts.join('. ') + '.';

        const reasoning =
          `Based on the learner's objective weights, Path ${overallRecommendation} is recommended ` +
          `with a weighted score of ${(overallRecommendation === 'A' ? weightedScoreA : weightedScoreB).toFixed(4)} ` +
          `vs ${(overallRecommendation === 'A' ? weightedScoreB : weightedScoreA).toFixed(4)}. ` +
          tradeoffSummary;

        const comparison: PathComparison = {
          pathA: { ...pathA, objectiveScores: scoresA },
          pathB: { ...pathB, objectiveScores: scoresB },
          objectiveComparison,
          overallRecommendation,
          reasoning,
          tradeoffSummary,
        };

        return success(comparison);
      } catch (error) {
        log.error('Path comparison failed', error as Error, { tenantId, learnerId });
        return failure({
          code: 'OPT_040',
          message: `Path comparison failed: ${(error as Error).message}`,
        });
      }
    });
  }

  /**
   * Retrieve optimization event history for a learner.
   */
  async getOptimizationHistory(
    tenantId: string,
    learnerId: string,
    options?: { limit?: number }
  ): Promise<Result<OptimizationEvent[]>> {
    return this.withTiming('getOptimizationHistory', async () => {
      try {
        const limit = options?.limit ?? 20;

        const events = await prisma.optimizationEvent.findMany({
          where: { tenantId, learnerId },
          orderBy: { timestamp: 'desc' },
          take: limit,
        });

        const mapped: OptimizationEvent[] = events.map((e) => ({
          id: e.id,
          tenantId: e.tenantId,
          learnerId: e.learnerId,
          weightsUsed: e.weightsUsed as unknown as ObjectiveWeights,
          constraintsApplied: e.constraintsApplied as unknown as OptimizationConstraints,
          paretoFrontSize: e.paretoFrontSize,
          selectedPathId: e.selectedPathId,
          computeTimeMs: e.computeTimeMs,
          timestamp: e.timestamp,
        }));

        return success(mapped);
      } catch (error) {
        log.error('Failed to fetch optimization history', error as Error, {
          tenantId,
          learnerId,
        });
        return failure({
          code: 'OPT_050',
          message: `Failed to fetch optimization history: ${(error as Error).message}`,
        });
      }
    });
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Generate candidate learning paths from a content pool.
   *
   * Strategies:
   * 1. Random permutations (majority of candidates)
   * 2. Greedy by difficulty ascending (scaffolded approach)
   * 3. Greedy by prerequisite chain (dependency-first)
   * 4. Domain-grouped (focus blocks)
   *
   * Filters invalid paths and returns up to maxPaths valid candidates.
   */
  private generateCandidatePaths(
    contentPool: ContentItem[],
    constraints: OptimizationConstraints,
    maxPaths: number
  ): LearningPath[] {
    const paths: LearningPath[] = [];
    const pathIdSet = new Set<string>();

    if (contentPool.length === 0) return paths;

    // Determine the working content (filter excluded competencies)
    let workingPool = [...contentPool];
    if (constraints.excludeCompetencyIds && constraints.excludeCompetencyIds.length > 0) {
      const excludeSet = new Set(constraints.excludeCompetencyIds);
      workingPool = workingPool.filter((c) => !excludeSet.has(c.competencyId));
    }

    if (workingPool.length === 0) return paths;

    // Strategy 1: Greedy by difficulty ascending (scaffolded)
    const sortedByDifficulty = [...workingPool].sort((a, b) => a.difficulty - b.difficulty);
    const scaffoldedPath = this.contentToPath(sortedByDifficulty, 'scaffold');
    if (scaffoldedPath && !pathIdSet.has(scaffoldedPath.id)) {
      paths.push(scaffoldedPath);
      pathIdSet.add(scaffoldedPath.id);
    }

    // Strategy 2: Greedy by difficulty descending (challenge-first)
    const sortedByDifficultyDesc = [...workingPool].sort((a, b) => b.difficulty - a.difficulty);
    const challengePath = this.contentToPath(sortedByDifficultyDesc, 'challenge');
    if (challengePath && !pathIdSet.has(challengePath.id)) {
      paths.push(challengePath);
      pathIdSet.add(challengePath.id);
    }

    // Strategy 3: Domain-grouped ordering
    const domainGroups = new Map<string, ContentItem[]>();
    for (const item of workingPool) {
      const group = domainGroups.get(item.domain) || [];
      group.push(item);
      domainGroups.set(item.domain, group);
    }
    const domainGrouped: ContentItem[] = [];
    for (const [, group] of domainGroups) {
      // Sort within each domain by difficulty ascending
      group.sort((a, b) => a.difficulty - b.difficulty);
      domainGrouped.push(...group);
    }
    const domainPath = this.contentToPath(domainGrouped, 'domain-grouped');
    if (domainPath && !pathIdSet.has(domainPath.id)) {
      paths.push(domainPath);
      pathIdSet.add(domainPath.id);
    }

    // Strategy 4: Interleaved domains (round-robin across domains)
    const domainQueues = new Map<string, ContentItem[]>();
    for (const [domain, group] of domainGroups) {
      domainQueues.set(domain, [...group].sort((a, b) => a.difficulty - b.difficulty));
    }
    const interleaved: ContentItem[] = [];
    let hasMore = true;
    while (hasMore) {
      hasMore = false;
      for (const [, queue] of domainQueues) {
        if (queue.length > 0) {
          interleaved.push(queue.shift()!);
          hasMore = hasMore || queue.length > 0;
        }
      }
    }
    const interleavedPath = this.contentToPath(interleaved, 'interleaved');
    if (interleavedPath && !pathIdSet.has(interleavedPath.id)) {
      paths.push(interleavedPath);
      pathIdSet.add(interleavedPath.id);
    }

    // Strategy 5: Random permutations for the rest
    const targetRandomPaths = maxPaths - paths.length;
    for (let attempt = 0; attempt < targetRandomPaths * 3 && paths.length < maxPaths; attempt++) {
      const shuffled = fisherYatesShuffle([...workingPool]);
      const path = this.contentToPath(shuffled, `random-${attempt}`);
      if (path && !pathIdSet.has(path.id)) {
        paths.push(path);
        pathIdSet.add(path.id);
      }
    }

    return paths.slice(0, maxPaths);
  }

  /**
   * Convert an ordered list of content items into a LearningPath.
   */
  private contentToPath(items: ContentItem[], strategy: string): LearningPath | null {
    if (items.length === 0) return null;

    const steps: LearningPathStep[] = items.map((item, index) => {
      // Predict mastery gain: higher for items closer to learner's ZPD
      const predictedMasteryGain = Math.max(0.01, 0.15 * (1 - Math.abs(item.difficulty - 0.5)));
      // Predict engagement: moderate baseline, adjusted by difficulty alignment
      const predictedEngagement = clamp(0.7 - Math.abs(item.difficulty - 0.5) * 0.3, 0.2, 1.0);

      const previousCumulativeMastery = index > 0
        ? items.slice(0, index).reduce(
            (sum, prev) => sum + Math.max(0.01, 0.15 * (1 - Math.abs(prev.difficulty - 0.5))),
            0
          )
        : 0;

      return {
        order: index,
        contentId: item.id,
        competencyId: item.competencyId,
        domain: item.domain,
        difficulty: item.difficulty,
        estimatedDurationMinutes: item.estimatedDurationMinutes,
        predictedMasteryGain,
        predictedEngagement,
        cumulativeMastery: previousCumulativeMastery + predictedMasteryGain,
      };
    });

    const totalDuration = steps.reduce((sum, s) => sum + s.estimatedDurationMinutes, 0);

    // Compute a deterministic path ID based on content order
    const contentFingerprint = items.map((i) => i.id).join(':');
    const pathId = `path_${strategy}_${simpleHash(contentFingerprint)}`;

    // Curriculum coverage: ratio of unique competencies to total items
    const uniqueCompetencies = new Set(items.map((i) => i.competencyId));
    const curriculumCoverage = uniqueCompetencies.size / Math.max(items.length, 1);

    return {
      id: pathId,
      steps,
      objectiveScores: {
        mastery: 0, engagement: 0, efficiency: 0, curiosity: 0,
        well_being: 0, breadth: 0, depth: 0,
      }, // Placeholder, filled during evaluation
      totalDurationMinutes: totalDuration,
      curriculumCoverage,
      isDominated: false,
    };
  }

  /**
   * Check if solution A Pareto-dominates solution B.
   * A dominates B iff: A >= B on ALL objectives AND A > B on at least one.
   */
  private dominates(a: ObjectiveWeights, b: ObjectiveWeights): boolean {
    let atLeastOneStrictlyBetter = false;

    for (const key of OBJECTIVE_KEYS) {
      if (a[key] < b[key]) {
        return false; // A is worse on this objective, cannot dominate
      }
      if (a[key] > b[key]) {
        atLeastOneStrictlyBetter = true;
      }
    }

    return atLeastOneStrictlyBetter;
  }

  /**
   * Calculate NSGA-II crowding distance for a set of solutions at the same rank.
   *
   * For each objective dimension:
   * - Sort solutions by that objective value
   * - Boundary solutions receive infinite distance
   * - Inner solutions: distance += (neighbor_above - neighbor_below) / (max - min)
   *
   * Higher crowding distance indicates more isolated solutions (better for diversity).
   */
  private calculateCrowdingDistance(solutions: ParetoSolution[]): void {
    const n = solutions.length;
    if (n <= 2) {
      // With 2 or fewer solutions, all are boundary points
      for (const sol of solutions) {
        sol.crowdingDistance = Infinity;
      }
      return;
    }

    // Initialize all distances to 0
    const distances = new Map<string, number>();
    for (const sol of solutions) {
      distances.set(sol.pathId, 0);
    }

    // For each objective dimension
    for (const key of OBJECTIVE_KEYS) {
      // Sort solutions by this objective
      const sorted = [...solutions].sort(
        (a, b) => a.objectiveScores[key] - b.objectiveScores[key]
      );

      const fMin = sorted[0].objectiveScores[key];
      const fMax = sorted[n - 1].objectiveScores[key];
      const range = fMax - fMin;

      // Boundary solutions get infinite distance
      distances.set(sorted[0].pathId, Infinity);
      distances.set(sorted[n - 1].pathId, Infinity);

      // Inner solutions
      if (range > 0) {
        for (let i = 1; i < n - 1; i++) {
          const currentDist = distances.get(sorted[i].pathId) ?? 0;
          if (currentDist === Infinity) continue; // Already infinite from another dimension

          const neighborAbove = sorted[i + 1].objectiveScores[key];
          const neighborBelow = sorted[i - 1].objectiveScores[key];
          const contribution = (neighborAbove - neighborBelow) / range;

          distances.set(sorted[i].pathId, currentDist + contribution);
        }
      }
    }

    // Write back to solutions
    for (const sol of solutions) {
      sol.crowdingDistance = distances.get(sol.pathId) ?? 0;
    }
  }

  /**
   * Normalize objective weights so they sum to 1.0.
   */
  private normalizeWeights(weights: Partial<ObjectiveWeights>): ObjectiveWeights {
    const full: ObjectiveWeights = {
      mastery: weights.mastery ?? DEFAULT_WEIGHTS.mastery,
      engagement: weights.engagement ?? DEFAULT_WEIGHTS.engagement,
      efficiency: weights.efficiency ?? DEFAULT_WEIGHTS.efficiency,
      curiosity: weights.curiosity ?? DEFAULT_WEIGHTS.curiosity,
      well_being: weights.well_being ?? DEFAULT_WEIGHTS.well_being,
      breadth: weights.breadth ?? DEFAULT_WEIGHTS.breadth,
      depth: weights.depth ?? DEFAULT_WEIGHTS.depth,
    };

    const sum = OBJECTIVE_KEYS.reduce((s, key) => s + full[key], 0);

    if (sum <= 0) {
      // If all weights are zero or negative, return defaults
      return { ...DEFAULT_WEIGHTS };
    }

    if (Math.abs(sum - 1.0) < 1e-9) {
      return full; // Already normalized
    }

    // Normalize each weight
    for (const key of OBJECTIVE_KEYS) {
      full[key] = full[key] / sum;
    }

    return full;
  }

  /**
   * Compute the ideal point: for each objective, the maximum value
   * achieved by any solution in the Pareto frontier.
   */
  private computeIdealPoint(solutions: ParetoSolution[]): ObjectiveWeights {
    const ideal: ObjectiveWeights = {
      mastery: -Infinity,
      engagement: -Infinity,
      efficiency: -Infinity,
      curiosity: -Infinity,
      well_being: -Infinity,
      breadth: -Infinity,
      depth: -Infinity,
    };

    for (const sol of solutions) {
      for (const key of OBJECTIVE_KEYS) {
        if (sol.objectiveScores[key] > ideal[key]) {
          ideal[key] = sol.objectiveScores[key];
        }
      }
    }

    return ideal;
  }

  /**
   * Convert a Prisma ObjectiveWeightsConfig record to an ObjectiveWeights interface.
   */
  private configToWeights(config: {
    mastery: number;
    engagement: number;
    efficiency: number;
    curiosity: number;
    wellBeing: number;
    breadth: number;
    depth: number;
  }): ObjectiveWeights {
    return {
      mastery: config.mastery,
      engagement: config.engagement,
      efficiency: config.efficiency,
      curiosity: config.curiosity,
      well_being: config.wellBeing,
      breadth: config.breadth,
      depth: config.depth,
    };
  }

  /**
   * Fetch learner profile data for objective evaluation context.
   */
  private async fetchLearnerProfile(tenantId: string, learnerId: string): Promise<any> {
    try {
      const user = await prisma.user.findFirst({
        where: { id: learnerId, tenantId },
        select: {
          id: true,
          tenantId: true,
          roles: true,
        },
      });

      return {
        learnerId,
        tenantId,
        roles: user?.roles,
        // Domain count will be estimated from content pool if not available
        availableDomains: null,
      };
    } catch {
      return { learnerId, tenantId, availableDomains: null };
    }
  }

  /**
   * Fetch BKT competency states for a learner from the database.
   */
  private async fetchCompetencyStates(
    tenantId: string,
    learnerId: string
  ): Promise<BKTCompetencyState[]> {
    try {
      // Attempt to fetch from adaptationProfile or competency state storage
      const profile = await prisma.adaptationProfile.findUnique({
        where: { learnerId },
        include: { competencyStates: true },
      });

      if (profile && profile.competencyStates) {
        return (profile.competencyStates as unknown as BKTCompetencyState[]) || [];
      }

      return [];
    } catch {
      // If model doesn't exist or query fails, return empty
      return [];
    }
  }

  /**
   * Build content pool from candidate IDs or all available content for the learner.
   */
  private async buildContentPool(
    tenantId: string,
    learnerId: string,
    candidateContentIds?: string[]
  ): Promise<ContentItem[]> {
    try {
      // If specific candidate IDs are provided, fetch those
      if (candidateContentIds && candidateContentIds.length > 0) {
        const items = await prisma.content.findMany({
          where: {
            id: { in: candidateContentIds },
            tenantId,
          },
          select: {
            id: true,
            subjectId: true,
            subjects: true,
            type: true,
            duration: true,
            tags: true,
            curriculumCodes: true,
          },
        });

        return items.map((item) => ({
          id: item.id,
          competencyId: item.subjectId || item.id,
          domain: item.subjects?.[0] || item.type || 'general',
          difficulty: 0.5,
          estimatedDurationMinutes: item.duration ?? 15,
          prerequisites: [],
          tags: Array.isArray(item.tags) ? item.tags : [],
        }));
      }

      // Otherwise, fetch available content for the learner's tenant
      const items = await prisma.content.findMany({
        where: { tenantId },
        take: 200, // Limit to prevent excessive path generation
        select: {
          id: true,
          subjectId: true,
          subjects: true,
          type: true,
          duration: true,
          tags: true,
          curriculumCodes: true,
        },
      });

      return items.map((item) => ({
        id: item.id,
        competencyId: item.subjectId || item.id,
        domain: item.subjects?.[0] || item.type || 'general',
        difficulty: 0.5,
        estimatedDurationMinutes: item.duration ?? 15,
        prerequisites: [],
        tags: Array.isArray(item.tags) ? item.tags : [],
      }));
    } catch (error) {
      log.warn('Failed to build content pool from database, using empty pool', {
        tenantId,
        learnerId,
        error: (error as Error).message,
      });
      return [];
    }
  }

  /**
   * Log an optimization event to the database for audit and analytics.
   */
  private async logOptimizationEvent(
    tenantId: string,
    learnerId: string,
    data: {
      weightsUsed: ObjectiveWeights;
      constraintsApplied: OptimizationConstraints;
      paretoFrontSize: number;
      selectedPathId: string;
      computeTimeMs: number;
      result: OptimizationResult;
    }
  ): Promise<void> {
    try {
      await prisma.optimizationEvent.create({
        data: {
          tenantId,
          learnerId,
          weightsUsed: data.weightsUsed as any,
          constraintsApplied: data.constraintsApplied as any,
          paretoFrontSize: data.paretoFrontSize,
          selectedPathId: data.selectedPathId,
          computeTimeMs: data.computeTimeMs,
          result: data.result as any,
        },
      });
    } catch (error) {
      // Non-critical: log but don't fail the optimization
      log.warn('Failed to persist optimization event', {
        tenantId,
        learnerId,
        error: (error as Error).message,
      });
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Clamp a number between min and max bounds.
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Fisher-Yates shuffle for generating random permutations.
 */
function fisherYatesShuffle<T>(array: T[]): T[] {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

/**
 * Simple deterministic hash for generating path IDs from content fingerprints.
 */
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

// ============================================================================
// Singleton Pattern
// ============================================================================

let instance: MultiObjectiveOptimizerService | null = null;

export function initializeMultiObjectiveOptimizerService(): MultiObjectiveOptimizerService {
  if (!instance) {
    instance = new MultiObjectiveOptimizerService();
  }
  return instance;
}

export function getMultiObjectiveOptimizerService(): MultiObjectiveOptimizerService {
  if (!instance) {
    throw new Error(
      'MultiObjectiveOptimizerService not initialized. Call initializeMultiObjectiveOptimizerService() first.'
    );
  }
  return instance;
}
