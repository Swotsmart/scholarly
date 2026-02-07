// =============================================================================
// SCHOLARLY PLATFORM — Sprint 13: S13-002
// A/B Testing Framework
// Feature Flag-Driven Experimentation with Statistical Significance
// =============================================================================
//
// If data retention (S13-001) is the archivist, A/B testing is the scientist.
// It's the structured way to answer "does this change actually make things
// better?" without relying on gut feeling, anecdote, or the HiPPO (Highest
// Paid Person's Opinion). For an educational platform, the stakes are real:
// a worse reading experience doesn't just reduce engagement metrics — it
// affects a child's literacy development.
//
// This framework implements a full experimentation lifecycle: hypothesis
// definition, variant assignment, metric collection, statistical analysis,
// and decision support. Think of it as a clinical trial for product features
// — you wouldn't prescribe a new medication without a controlled trial, and
// you shouldn't ship a new reading experience without controlled evidence.
//
// Key design decisions:
// - Feature flag integration: Experiments piggyback on the existing Sprint 1
//   feature flag system (FeatureFlag model). This means the same flag that
//   controls beta rollout can also power an experiment, avoiding duplicate
//   infrastructure.
// - Sticky assignment: Once a user is assigned to a variant, they stay there
//   for the experiment's duration. Switching variants mid-experiment is like
//   moving patients between treatment groups — it ruins the data.
// - Child safety consideration: Experiments involving educational content or
//   difficulty levels require elevated approval. We never A/B test in ways
//   that could disadvantage a learner's educational outcomes.
// - Bayesian stopping rules: Rather than fixed sample sizes, we use sequential
//   analysis that can declare a winner early or stop a losing experiment
//   before it causes harm — like an adaptive clinical trial.
//
// Integration points:
// - Sprint 1: Feature flags (experiment flag creation and management)
// - Sprint 6: Observability metrics (experiment metric collection)
// - Sprint 12: Public beta programme (experiment cohort alignment)
// =============================================================================

import { PrismaClient } from '@prisma/client';
import { Result, ok, fail, ScholarlyBaseService } from '../shared/base';

// =============================================================================
// Section 1: Experiment Definitions
// =============================================================================

enum ExperimentStatus {
  DRAFT = 'draft',
  REVIEW = 'review',           // Awaiting approval (required for educational experiments)
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',      // Winner declared
  STOPPED = 'stopped',          // Stopped early (harm detected or inconclusive)
  ARCHIVED = 'archived',
}

enum ExperimentCategory {
  UI_UX = 'ui_ux',                    // Visual changes, layout experiments
  CONTENT = 'content',                 // Story presentation, illustration styles
  DIFFICULTY = 'difficulty',           // Phonics difficulty calibration (elevated approval)
  ENGAGEMENT = 'engagement',           // Gamification, rewards, streaks
  ONBOARDING = 'onboarding',          // Signup flow, teacher wizard
  PERFORMANCE = 'performance',         // Technical optimisations (caching, loading)
  NOTIFICATION = 'notification',       // Push/email timing, content
  PRICING = 'pricing',                // Subscription tiers, trial lengths
}

enum MetricType {
  CONTINUOUS = 'continuous',    // Numeric values (reading time, WCPM, session duration)
  BINARY = 'binary',           // Yes/no outcomes (completed book, earned badge)
  COUNT = 'count',             // Event counts (books read, sessions started)
  REVENUE = 'revenue',         // Financial metrics (subscription conversion)
}

// SafetyClassification — How much scrutiny an experiment needs before launch
enum SafetyClassification {
  LOW = 'low',                  // UI tweaks, button colours — auto-approve
  MEDIUM = 'medium',            // Engagement mechanics — peer review
  HIGH = 'high',                // Difficulty/content changes — educational review board
  CRITICAL = 'critical',        // Pricing, assessment algorithms — leadership approval
}

interface ExperimentDefinition {
  id: string;
  name: string;
  hypothesis: string;           // "Changing X will cause Y because Z"
  category: ExperimentCategory;
  safetyClassification: SafetyClassification;
  status: ExperimentStatus;
  featureFlagId: string;        // Links to Sprint 1 FeatureFlag
  variants: ExperimentVariant[];
  primaryMetric: MetricDefinition;
  secondaryMetrics: MetricDefinition[];
  guardrailMetrics: GuardrailMetric[];  // Metrics that trigger auto-stop if degraded
  targetSampleSize: number;
  minimumDetectableEffect: number;  // Smallest improvement worth detecting (e.g., 0.05 = 5%)
  significanceLevel: number;     // Alpha — typically 0.05
  power: number;                 // 1 - beta — typically 0.80
  trafficPercentage: number;     // What % of eligible users enter the experiment
  startDate?: Date;
  endDate?: Date;
  maxDurationDays: number;
  createdBy: string;
  approvedBy?: string;
  tenantId?: string;            // null = platform-wide experiment
  eligibilityCriteria: EligibilityCriteria;
  results?: ExperimentResults;
}

interface ExperimentVariant {
  id: string;
  name: string;                 // e.g., 'control', 'variant_a', 'variant_b'
  description: string;
  weight: number;               // Traffic allocation weight (0-1, all variants sum to 1)
  isControl: boolean;
  featureFlagValue: string;     // The value the feature flag resolves to for this variant
  config: Record<string, unknown>;  // Variant-specific configuration
}

interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  type: MetricType;
  eventName: string;            // Analytics event to collect (ties to Sprint 6 observability)
  aggregation: 'mean' | 'median' | 'sum' | 'proportion' | 'percentile_95';
  direction: 'higher_is_better' | 'lower_is_better';
  minimumSamplePerVariant: number;
}

interface GuardrailMetric {
  metric: MetricDefinition;
  threshold: number;            // If metric degrades below this, auto-pause
  comparisonType: 'absolute' | 'relative_to_control';
  description: string;          // Human-readable explanation of what this guards
}

interface EligibilityCriteria {
  minAge?: number;
  maxAge?: number;
  phonicsPhases?: number[];     // Only include learners in these phases
  roles?: string[];             // 'learner', 'teacher', 'parent'
  cohorts?: string[];           // From Sprint 12 beta cohorts
  excludeExperiments?: string[];// Prevent overlapping experiments
  tenantIds?: string[];         // Limit to specific tenants
}

// =============================================================================
// Section 2: Statistical Analysis Engine
// =============================================================================

// The statistical engine is the impartial judge — it doesn't care about
// anyone's opinion, only what the data says. It implements both frequentist
// (z-test for proportions, t-test for means) and Bayesian (Beta-Binomial
// for conversion, Normal-Normal for continuous) analysis, giving experiment
// owners multiple lenses on the same data.

interface VariantStats {
  variantId: string;
  sampleSize: number;
  mean: number;
  variance: number;
  standardDeviation: number;
  confidenceInterval: { lower: number; upper: number };
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
}

interface StatisticalTestResult {
  testType: 'z_test' | 't_test' | 'chi_squared' | 'bayesian_ab';
  pValue: number;
  confidenceLevel: number;
  effectSize: number;                    // Cohen's d or risk difference
  relativeEffect: number;               // % change vs control
  confidenceInterval: { lower: number; upper: number };
  isSignificant: boolean;
  powerAchieved: number;
  recommendation: 'ship_variant' | 'keep_control' | 'continue_testing' | 'stop_experiment';
  explanation: string;                   // Human-readable interpretation
}

interface BayesianResult {
  probabilityBeatControl: number;       // P(variant > control)
  expectedLoss: number;                 // Expected loss if we ship the wrong variant
  credibleInterval: { lower: number; upper: number };
  posteriorMean: number;
  posteriorVariance: number;
  recommendation: 'ship_variant' | 'keep_control' | 'continue_testing';
}

class StatisticalEngine {
  // Z-test for proportions (binary metrics like conversion rates)
  static zTestForProportions(
    controlSuccesses: number, controlTotal: number,
    variantSuccesses: number, variantTotal: number,
    alpha: number = 0.05
  ): StatisticalTestResult {
    const p1 = controlSuccesses / controlTotal;
    const p2 = variantSuccesses / variantTotal;
    const pooled = (controlSuccesses + variantSuccesses) / (controlTotal + variantTotal);
    const se = Math.sqrt(pooled * (1 - pooled) * (1 / controlTotal + 1 / variantTotal));

    const z = se > 0 ? (p2 - p1) / se : 0;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    const effectSize = p2 - p1;
    const relativeEffect = p1 > 0 ? (p2 - p1) / p1 : 0;
    const isSignificant = pValue < alpha;

    const zCritical = this.normalInverse(1 - alpha / 2);
    const ciSe = Math.sqrt(p2 * (1 - p2) / variantTotal + p1 * (1 - p1) / controlTotal);

    return {
      testType: 'z_test',
      pValue,
      confidenceLevel: 1 - alpha,
      effectSize,
      relativeEffect,
      confidenceInterval: {
        lower: effectSize - zCritical * ciSe,
        upper: effectSize + zCritical * ciSe,
      },
      isSignificant,
      powerAchieved: this.calculatePower(effectSize, se, alpha, controlTotal + variantTotal),
      recommendation: this.getRecommendation(isSignificant, effectSize, pValue),
      explanation: this.formatExplanation('z_test', p1, p2, pValue, isSignificant, relativeEffect),
    };
  }

  // Welch's t-test for continuous metrics (means comparison)
  static welchTTest(
    controlMean: number, controlVariance: number, controlN: number,
    variantMean: number, variantVariance: number, variantN: number,
    alpha: number = 0.05
  ): StatisticalTestResult {
    const se = Math.sqrt(controlVariance / controlN + variantVariance / variantN);
    const t = se > 0 ? (variantMean - controlMean) / se : 0;

    // Welch-Satterthwaite degrees of freedom
    const num = Math.pow(controlVariance / controlN + variantVariance / variantN, 2);
    const den = Math.pow(controlVariance / controlN, 2) / (controlN - 1) +
                Math.pow(variantVariance / variantN, 2) / (variantN - 1);
    const df = den > 0 ? num / den : 1;

    // Approximate p-value using normal distribution for large samples
    const pValue = 2 * (1 - this.normalCDF(Math.abs(t)));
    const effectSize = se > 0 ? (variantMean - controlMean) / Math.sqrt((controlVariance + variantVariance) / 2) : 0;
    const relativeEffect = controlMean !== 0 ? (variantMean - controlMean) / controlMean : 0;
    const isSignificant = pValue < alpha;

    const tCritical = this.normalInverse(1 - alpha / 2); // Approximation for large n
    const diff = variantMean - controlMean;

    return {
      testType: 't_test',
      pValue,
      confidenceLevel: 1 - alpha,
      effectSize,
      relativeEffect,
      confidenceInterval: {
        lower: diff - tCritical * se,
        upper: diff + tCritical * se,
      },
      isSignificant,
      powerAchieved: this.calculatePower(diff, se, alpha, controlN + variantN),
      recommendation: this.getRecommendation(isSignificant, diff, pValue),
      explanation: this.formatExplanation('t_test', controlMean, variantMean, pValue, isSignificant, relativeEffect),
    };
  }

  // Bayesian A/B for binary metrics — Beta-Binomial conjugate model
  // This is like asking "given what we've seen so far, how confident are we
  // that the variant is actually better?" rather than the frequentist "if
  // they were the same, how surprised would we be by this data?"
  static bayesianBinaryAB(
    controlSuccesses: number, controlTotal: number,
    variantSuccesses: number, variantTotal: number,
    priorAlpha: number = 1, priorBeta: number = 1  // Uniform prior
  ): BayesianResult {
    // Posterior distributions: Beta(alpha + successes, beta + failures)
    const controlAlpha = priorAlpha + controlSuccesses;
    const controlBeta = priorBeta + (controlTotal - controlSuccesses);
    const variantAlpha = priorAlpha + variantSuccesses;
    const variantBeta = priorBeta + (variantTotal - variantSuccesses);

    // P(variant > control) via Monte Carlo simulation
    const simulations = 10000;
    let variantWins = 0;
    let totalLoss = 0;

    for (let i = 0; i < simulations; i++) {
      const controlSample = this.betaSample(controlAlpha, controlBeta);
      const variantSample = this.betaSample(variantAlpha, variantBeta);
      if (variantSample > controlSample) variantWins++;
      totalLoss += Math.max(0, controlSample - variantSample);
    }

    const probabilityBeatControl = variantWins / simulations;
    const expectedLoss = totalLoss / simulations;

    const posteriorMean = variantAlpha / (variantAlpha + variantBeta);
    const posteriorVariance = (variantAlpha * variantBeta) /
      (Math.pow(variantAlpha + variantBeta, 2) * (variantAlpha + variantBeta + 1));

    // 95% credible interval
    const ci = this.betaQuantile(variantAlpha, variantBeta);

    return {
      probabilityBeatControl,
      expectedLoss,
      credibleInterval: ci,
      posteriorMean,
      posteriorVariance,
      recommendation: probabilityBeatControl > 0.95 ? 'ship_variant'
        : probabilityBeatControl < 0.05 ? 'keep_control'
        : 'continue_testing',
    };
  }

  // Sequential analysis — Can we stop early?
  static sequentialCheck(
    currentPValue: number,
    currentSampleSize: number,
    targetSampleSize: number,
    alpha: number = 0.05,
    interimChecks: number = 5
  ): { canStop: boolean; adjustedAlpha: number; reason: string } {
    // O'Brien-Fleming spending function — conservative early, liberal late
    const infoFraction = currentSampleSize / targetSampleSize;
    const adjustedAlpha = alpha * Math.pow(infoFraction, 2); // Penalise early stopping

    if (currentPValue < adjustedAlpha) {
      return {
        canStop: true,
        adjustedAlpha,
        reason: `Significant at adjusted alpha ${adjustedAlpha.toFixed(4)} (info fraction: ${(infoFraction * 100).toFixed(0)}%)`,
      };
    }

    // Futility check — is it hopeless?
    if (infoFraction > 0.5 && currentPValue > 0.5) {
      return {
        canStop: true,
        adjustedAlpha,
        reason: `Futility: p=${currentPValue.toFixed(3)} at ${(infoFraction * 100).toFixed(0)}% of target sample — unlikely to reach significance`,
      };
    }

    return { canStop: false, adjustedAlpha, reason: 'Continue collecting data' };
  }

  // ---- Statistical Helper Functions ----

  private static normalCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  private static normalInverse(p: number): number {
    // Rational approximation (Abramowitz & Stegun)
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    const t = p < 0.5 ? Math.sqrt(-2 * Math.log(p)) : Math.sqrt(-2 * Math.log(1 - p));
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    const result = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
    return p < 0.5 ? -result : result;
  }

  private static betaSample(alpha: number, beta: number): number {
    // Gamma sampling to generate Beta samples
    const gammaA = this.gammaSample(alpha);
    const gammaB = this.gammaSample(beta);
    return gammaA / (gammaA + gammaB);
  }

  private static gammaSample(shape: number): number {
    // Marsaglia and Tsang's method for shape >= 1
    if (shape < 1) {
      return this.gammaSample(shape + 1) * Math.pow(Math.random(), 1 / shape);
    }
    const d = shape - 1 / 3;
    const c = 1 / Math.sqrt(9 * d);
    while (true) {
      let x: number, v: number;
      do {
        x = this.normalSample();
        v = 1 + c * x;
      } while (v <= 0);
      v = v * v * v;
      const u = Math.random();
      if (u < 1 - 0.0331 * (x * x) * (x * x)) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  }

  private static normalSample(): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private static betaQuantile(alpha: number, beta: number): { lower: number; upper: number } {
    // Monte Carlo quantile estimation for 95% credible interval
    const samples: number[] = [];
    for (let i = 0; i < 10000; i++) {
      samples.push(this.betaSample(alpha, beta));
    }
    samples.sort((a, b) => a - b);
    return { lower: samples[250], upper: samples[9750] };
  }

  private static calculatePower(effectSize: number, se: number, alpha: number, n: number): number {
    if (se === 0) return 1;
    const zAlpha = this.normalInverse(1 - alpha / 2);
    const zBeta = Math.abs(effectSize) / se - zAlpha;
    return this.normalCDF(zBeta);
  }

  private static getRecommendation(
    isSignificant: boolean, effectSize: number, pValue: number
  ): 'ship_variant' | 'keep_control' | 'continue_testing' | 'stop_experiment' {
    if (isSignificant && effectSize > 0) return 'ship_variant';
    if (isSignificant && effectSize < 0) return 'keep_control';
    if (pValue > 0.5) return 'stop_experiment';
    return 'continue_testing';
  }

  private static formatExplanation(
    testType: string, controlValue: number, variantValue: number,
    pValue: number, isSignificant: boolean, relativeEffect: number
  ): string {
    const direction = variantValue > controlValue ? 'increase' : 'decrease';
    const pct = (Math.abs(relativeEffect) * 100).toFixed(1);
    const sig = isSignificant ? 'statistically significant' : 'not statistically significant';

    return `The variant shows a ${pct}% ${direction} compared to control ` +
      `(${controlValue.toFixed(4)} → ${variantValue.toFixed(4)}). ` +
      `This result is ${sig} (p=${pValue.toFixed(4)}).`;
  }
}

// =============================================================================
// Section 3: Experiment Assignment Service
// =============================================================================

// The assignment service is the randomisation engine — it decides which users
// see which variant. Like a clinical trial coordinator, it must be fair,
// consistent (same user always sees same variant), and respect eligibility.

class ExperimentAssignmentService extends ScholarlyBaseService {
  private experiments: Map<string, ExperimentDefinition>;
  private assignments: Map<string, Map<string, string>>; // experimentId -> userId -> variantId

  constructor(prisma: PrismaClient) {
    super(prisma, 'ExperimentAssignmentService');
    this.experiments = new Map();
    this.assignments = new Map();
  }

  // Register an experiment
  async createExperiment(definition: ExperimentDefinition): Promise<Result<ExperimentDefinition>> {
    // Validate variant weights sum to 1
    const weightSum = definition.variants.reduce((sum, v) => sum + v.weight, 0);
    if (Math.abs(weightSum - 1.0) > 0.001) {
      return fail(`Variant weights must sum to 1.0, got ${weightSum}`, 'INVALID_WEIGHTS');
    }

    // Ensure exactly one control variant
    const controls = definition.variants.filter(v => v.isControl);
    if (controls.length !== 1) {
      return fail(`Exactly one control variant required, found ${controls.length}`, 'INVALID_CONTROL');
    }

    // Safety classification determines required approval level
    if (definition.safetyClassification === SafetyClassification.HIGH ||
        definition.safetyClassification === SafetyClassification.CRITICAL) {
      definition.status = ExperimentStatus.REVIEW;
      this.log('info', 'Experiment requires elevated approval', {
        id: definition.id, safety: definition.safetyClassification,
      });
    }

    this.experiments.set(definition.id, definition);
    this.assignments.set(definition.id, new Map());

    // Create corresponding feature flag
    this.emit('featureflag.create', {
      id: definition.featureFlagId,
      name: `experiment_${definition.id}`,
      type: 'experiment',
      variants: definition.variants.map(v => v.featureFlagValue),
    });

    this.log('info', 'Experiment created', { id: definition.id, name: definition.name });
    return ok(definition);
  }

  // Assign a user to a variant (sticky assignment)
  async assignUser(experimentId: string, userId: string, userContext: UserContext): Promise<Result<ExperimentVariant>> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return fail('Experiment not found', 'NOT_FOUND');
    if (experiment.status !== ExperimentStatus.RUNNING) {
      return fail(`Experiment is ${experiment.status}, not running`, 'NOT_RUNNING');
    }

    // Check for existing assignment (sticky)
    const existingAssignment = this.assignments.get(experimentId)?.get(userId);
    if (existingAssignment) {
      const variant = experiment.variants.find(v => v.id === existingAssignment);
      if (variant) return ok(variant);
    }

    // Check eligibility
    const eligible = this.checkEligibility(experiment.eligibilityCriteria, userContext);
    if (!eligible) return fail('User not eligible for experiment', 'NOT_ELIGIBLE');

    // Traffic allocation — only a percentage of eligible users enter
    const hash = this.deterministicHash(`${experimentId}:${userId}:traffic`);
    if (hash > experiment.trafficPercentage / 100) {
      return fail('User not in experiment traffic allocation', 'NOT_IN_TRAFFIC');
    }

    // Variant assignment using deterministic hashing
    const variantHash = this.deterministicHash(`${experimentId}:${userId}:variant`);
    let cumWeight = 0;
    let assignedVariant: ExperimentVariant | undefined;

    for (const variant of experiment.variants) {
      cumWeight += variant.weight;
      if (variantHash <= cumWeight) {
        assignedVariant = variant;
        break;
      }
    }

    if (!assignedVariant) assignedVariant = experiment.variants[experiment.variants.length - 1];

    // Store sticky assignment
    this.assignments.get(experimentId)!.set(userId, assignedVariant.id);

    // Persist to database for cross-device consistency
    await this.persistAssignment(experimentId, userId, assignedVariant.id);

    this.emit('experiment.user.assigned', {
      experimentId, userId, variantId: assignedVariant.id, variantName: assignedVariant.name,
    });

    return ok(assignedVariant);
  }

  // Deterministic hash — same input always produces same output (0-1 range)
  // This ensures cross-device consistency without database lookups for most assignments
  private deterministicHash(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) / 2147483647; // Normalise to 0-1
  }

  private checkEligibility(criteria: EligibilityCriteria, context: UserContext): boolean {
    if (criteria.roles && !criteria.roles.includes(context.role)) return false;
    if (criteria.minAge && context.age && context.age < criteria.minAge) return false;
    if (criteria.maxAge && context.age && context.age > criteria.maxAge) return false;
    if (criteria.phonicsPhases && context.phonicsPhase &&
        !criteria.phonicsPhases.includes(context.phonicsPhase)) return false;
    if (criteria.tenantIds && !criteria.tenantIds.includes(context.tenantId)) return false;
    if (criteria.cohorts && context.cohort && !criteria.cohorts.includes(context.cohort)) return false;
    return true;
  }

  private async persistAssignment(experimentId: string, userId: string, variantId: string): Promise<void> {
    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "ExperimentAssignment" ("id", "experimentId", "userId", "variantId", "assignedAt")
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT ("experimentId", "userId") DO NOTHING`,
        `assign_${experimentId}_${userId}`, experimentId, userId, variantId
      );
    } catch (error) {
      this.log('warn', 'Failed to persist assignment', { experimentId, userId, error: String(error) });
    }
  }

  // -------------------------------------------------------------------------
  // Metric Collection & Analysis
  // -------------------------------------------------------------------------

  async recordMetricEvent(
    experimentId: string, userId: string, metricId: string, value: number
  ): Promise<Result<void>> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return fail('Experiment not found', 'NOT_FOUND');

    const variantId = this.assignments.get(experimentId)?.get(userId);
    if (!variantId) return fail('User not assigned to experiment', 'NOT_ASSIGNED');

    try {
      await this.prisma.$executeRawUnsafe(
        `INSERT INTO "ExperimentMetricEvent" ("id", "experimentId", "variantId", "userId", "metricId", "value", "recordedAt")
         VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
        `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        experimentId, variantId, userId, metricId, value
      );
      return ok(undefined);
    } catch (error) {
      return fail(`Failed to record metric: ${error}`, 'RECORD_FAILED');
    }
  }

  async analyseExperiment(experimentId: string): Promise<Result<ExperimentResults>> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return fail('Experiment not found', 'NOT_FOUND');

    const variantResults: Map<string, VariantAnalysis> = new Map();
    const control = experiment.variants.find(v => v.isControl)!;

    // Collect stats for each variant
    for (const variant of experiment.variants) {
      const stats = await this.collectVariantStats(experimentId, variant.id, experiment.primaryMetric);
      const secondaryStats = new Map<string, VariantStats>();

      for (const metric of experiment.secondaryMetrics) {
        const s = await this.collectVariantStats(experimentId, variant.id, metric);
        secondaryStats.set(metric.id, s);
      }

      variantResults.set(variant.id, {
        variant,
        primaryStats: stats,
        secondaryStats,
        sampleSize: stats.sampleSize,
      });
    }

    // Run statistical tests: each variant vs control
    const comparisons: VariantComparison[] = [];
    const controlAnalysis = variantResults.get(control.id)!;

    for (const [variantId, analysis] of variantResults) {
      if (variantId === control.id) continue;

      let frequentistResult: StatisticalTestResult;
      let bayesianResult: BayesianResult | undefined;

      if (experiment.primaryMetric.type === MetricType.BINARY) {
        frequentistResult = StatisticalEngine.zTestForProportions(
          Math.round(controlAnalysis.primaryStats.mean * controlAnalysis.primaryStats.sampleSize),
          controlAnalysis.primaryStats.sampleSize,
          Math.round(analysis.primaryStats.mean * analysis.primaryStats.sampleSize),
          analysis.primaryStats.sampleSize,
          experiment.significanceLevel
        );
        bayesianResult = StatisticalEngine.bayesianBinaryAB(
          Math.round(controlAnalysis.primaryStats.mean * controlAnalysis.primaryStats.sampleSize),
          controlAnalysis.primaryStats.sampleSize,
          Math.round(analysis.primaryStats.mean * analysis.primaryStats.sampleSize),
          analysis.primaryStats.sampleSize
        );
      } else {
        frequentistResult = StatisticalEngine.welchTTest(
          controlAnalysis.primaryStats.mean, controlAnalysis.primaryStats.variance, controlAnalysis.primaryStats.sampleSize,
          analysis.primaryStats.mean, analysis.primaryStats.variance, analysis.primaryStats.sampleSize,
          experiment.significanceLevel
        );
      }

      // Sequential analysis — can we stop early?
      const totalSample = controlAnalysis.primaryStats.sampleSize + analysis.primaryStats.sampleSize;
      const sequentialResult = StatisticalEngine.sequentialCheck(
        frequentistResult.pValue, totalSample, experiment.targetSampleSize * 2, experiment.significanceLevel
      );

      comparisons.push({
        variantId,
        variantName: analysis.variant.name,
        frequentist: frequentistResult,
        bayesian: bayesianResult,
        sequential: sequentialResult,
      });
    }

    // Check guardrail metrics
    const guardrailViolations = await this.checkGuardrails(experiment, variantResults, controlAnalysis);

    // Determine overall recommendation
    const overallRecommendation = this.determineRecommendation(comparisons, guardrailViolations);

    const results: ExperimentResults = {
      experimentId,
      analysedAt: new Date(),
      totalParticipants: Array.from(variantResults.values()).reduce((sum, v) => sum + v.sampleSize, 0),
      variantResults: Object.fromEntries(variantResults),
      comparisons,
      guardrailViolations,
      overallRecommendation,
      canStopEarly: comparisons.some(c => c.sequential.canStop),
    };

    // Update experiment with results
    experiment.results = results;

    this.log('info', 'Experiment analysis complete', {
      experimentId,
      totalParticipants: results.totalParticipants,
      recommendation: overallRecommendation,
    });

    return ok(results);
  }

  private async collectVariantStats(
    experimentId: string, variantId: string, metric: MetricDefinition
  ): Promise<VariantStats> {
    try {
      const result = await this.prisma.$queryRawUnsafe<[{
        count: bigint; avg: number; variance: number;
        p5: number; p25: number; p50: number; p75: number; p95: number;
      }]>(
        `SELECT COUNT(*) as count, AVG(value) as avg, VARIANCE(value) as variance,
         PERCENTILE_CONT(0.05) WITHIN GROUP (ORDER BY value) as p5,
         PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY value) as p25,
         PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY value) as p50,
         PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY value) as p75,
         PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95
         FROM "ExperimentMetricEvent"
         WHERE "experimentId" = $1 AND "variantId" = $2 AND "metricId" = $3`,
        experimentId, variantId, metric.id
      );

      const r = result[0];
      const n = Number(r.count);
      const mean = r.avg || 0;
      const variance = r.variance || 0;
      const stdDev = Math.sqrt(variance);
      const se = n > 0 ? stdDev / Math.sqrt(n) : 0;
      const zCritical = 1.96; // 95% CI

      return {
        variantId,
        sampleSize: n,
        mean,
        variance,
        standardDeviation: stdDev,
        confidenceInterval: { lower: mean - zCritical * se, upper: mean + zCritical * se },
        percentiles: { p5: r.p5 || 0, p25: r.p25 || 0, p50: r.p50 || 0, p75: r.p75 || 0, p95: r.p95 || 0 },
      };
    } catch {
      return {
        variantId, sampleSize: 0, mean: 0, variance: 0, standardDeviation: 0,
        confidenceInterval: { lower: 0, upper: 0 },
        percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
      };
    }
  }

  private async checkGuardrails(
    experiment: ExperimentDefinition,
    variantResults: Map<string, VariantAnalysis>,
    controlAnalysis: VariantAnalysis
  ): Promise<GuardrailViolation[]> {
    const violations: GuardrailViolation[] = [];

    for (const guardrail of experiment.guardrailMetrics) {
      for (const [variantId, analysis] of variantResults) {
        if (variantId === experiment.variants.find(v => v.isControl)?.id) continue;

        const variantStats = await this.collectVariantStats(
          experiment.id, variantId, guardrail.metric
        );

        let violated = false;
        if (guardrail.comparisonType === 'absolute') {
          violated = guardrail.metric.direction === 'higher_is_better'
            ? variantStats.mean < guardrail.threshold
            : variantStats.mean > guardrail.threshold;
        } else {
          const controlStats = await this.collectVariantStats(
            experiment.id, controlAnalysis.variant.id, guardrail.metric
          );
          const relativeChange = controlStats.mean !== 0
            ? (variantStats.mean - controlStats.mean) / controlStats.mean
            : 0;
          violated = Math.abs(relativeChange) > guardrail.threshold;
        }

        if (violated) {
          violations.push({
            metricId: guardrail.metric.id,
            metricName: guardrail.metric.name,
            variantId,
            currentValue: variantStats.mean,
            threshold: guardrail.threshold,
            description: guardrail.description,
          });
        }
      }
    }

    // Auto-pause if guardrails violated
    if (violations.length > 0) {
      const experiment_ = this.experiments.get(experiment.id);
      if (experiment_) {
        experiment_.status = ExperimentStatus.PAUSED;
        this.emit('experiment.guardrail.violated', { experimentId: experiment.id, violations });
        this.log('warn', 'Experiment auto-paused due to guardrail violation', {
          experimentId: experiment.id, violationCount: violations.length,
        });
      }
    }

    return violations;
  }

  private determineRecommendation(
    comparisons: VariantComparison[],
    guardrailViolations: GuardrailViolation[]
  ): string {
    if (guardrailViolations.length > 0) {
      return 'STOP: Guardrail metrics violated — investigate before proceeding';
    }

    const significant = comparisons.filter(c => c.frequentist.isSignificant);
    if (significant.length === 0) return 'CONTINUE: No significant results yet';

    const winners = significant.filter(c => c.frequentist.recommendation === 'ship_variant');
    if (winners.length > 0) {
      const best = winners.sort((a, b) => b.frequentist.effectSize - a.frequentist.effectSize)[0];
      return `SHIP: ${best.variantName} shows significant improvement (${(best.frequentist.relativeEffect * 100).toFixed(1)}%)`;
    }

    const losers = significant.filter(c => c.frequentist.recommendation === 'keep_control');
    if (losers.length === significant.length) {
      return 'KEEP CONTROL: All variants performed worse than control';
    }

    return 'CONTINUE: Mixed results — collect more data';
  }

  // -------------------------------------------------------------------------
  // Experiment Lifecycle Management
  // -------------------------------------------------------------------------

  async startExperiment(experimentId: string): Promise<Result<void>> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return fail('Experiment not found', 'NOT_FOUND');

    if (experiment.safetyClassification !== SafetyClassification.LOW && !experiment.approvedBy) {
      return fail('Experiment requires approval before starting', 'APPROVAL_REQUIRED');
    }

    experiment.status = ExperimentStatus.RUNNING;
    experiment.startDate = new Date();
    this.emit('experiment.started', { experimentId, name: experiment.name });
    return ok(undefined);
  }

  async stopExperiment(experimentId: string, reason: string): Promise<Result<void>> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return fail('Experiment not found', 'NOT_FOUND');

    experiment.status = ExperimentStatus.STOPPED;
    experiment.endDate = new Date();
    this.emit('experiment.stopped', { experimentId, reason });
    return ok(undefined);
  }

  async completeExperiment(experimentId: string, winningVariantId: string): Promise<Result<void>> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return fail('Experiment not found', 'NOT_FOUND');

    const winner = experiment.variants.find(v => v.id === winningVariantId);
    if (!winner) return fail('Winning variant not found', 'VARIANT_NOT_FOUND');

    experiment.status = ExperimentStatus.COMPLETED;
    experiment.endDate = new Date();

    // Update feature flag to serve winning variant to 100%
    this.emit('featureflag.update', {
      id: experiment.featureFlagId,
      value: winner.featureFlagValue,
      percentage: 100,
    });

    this.emit('experiment.completed', { experimentId, winningVariantId, variantName: winner.name });
    return ok(undefined);
  }

  // -------------------------------------------------------------------------
  // Dashboard Queries
  // -------------------------------------------------------------------------

  async listExperiments(status?: ExperimentStatus): Promise<ExperimentDefinition[]> {
    const experiments = Array.from(this.experiments.values());
    return status ? experiments.filter(e => e.status === status) : experiments;
  }

  async getExperimentSummary(experimentId: string): Promise<Result<ExperimentSummary>> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) return fail('Experiment not found', 'NOT_FOUND');

    const totalAssignments = this.assignments.get(experimentId)?.size || 0;
    const variantCounts: Record<string, number> = {};

    for (const variant of experiment.variants) {
      let count = 0;
      for (const [, variantId] of this.assignments.get(experimentId) || new Map()) {
        if (variantId === variant.id) count++;
      }
      variantCounts[variant.name] = count;
    }

    const daysRunning = experiment.startDate
      ? Math.floor((Date.now() - experiment.startDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return ok({
      id: experiment.id,
      name: experiment.name,
      status: experiment.status,
      category: experiment.category,
      hypothesis: experiment.hypothesis,
      totalParticipants: totalAssignments,
      variantCounts,
      daysRunning,
      targetSampleSize: experiment.targetSampleSize,
      percentComplete: Math.min(100, Math.round((totalAssignments / experiment.targetSampleSize) * 100)),
      results: experiment.results,
    });
  }
}

// =============================================================================
// Section 4: Type Definitions
// =============================================================================

interface UserContext {
  userId: string;
  tenantId: string;
  role: string;
  age?: number;
  phonicsPhase?: number;
  cohort?: string;
}

interface VariantAnalysis {
  variant: ExperimentVariant;
  primaryStats: VariantStats;
  secondaryStats: Map<string, VariantStats>;
  sampleSize: number;
}

interface VariantComparison {
  variantId: string;
  variantName: string;
  frequentist: StatisticalTestResult;
  bayesian?: BayesianResult;
  sequential: { canStop: boolean; adjustedAlpha: number; reason: string };
}

interface GuardrailViolation {
  metricId: string;
  metricName: string;
  variantId: string;
  currentValue: number;
  threshold: number;
  description: string;
}

interface ExperimentResults {
  experimentId: string;
  analysedAt: Date;
  totalParticipants: number;
  variantResults: Record<string, VariantAnalysis>;
  comparisons: VariantComparison[];
  guardrailViolations: GuardrailViolation[];
  overallRecommendation: string;
  canStopEarly: boolean;
}

interface ExperimentSummary {
  id: string;
  name: string;
  status: ExperimentStatus;
  category: ExperimentCategory;
  hypothesis: string;
  totalParticipants: number;
  variantCounts: Record<string, number>;
  daysRunning: number;
  targetSampleSize: number;
  percentComplete: number;
  results?: ExperimentResults;
}

// =============================================================================
// Section 5: Express Routes
// =============================================================================

function createExperimentRoutes(service: ExperimentAssignmentService) {
  return {
    // POST /api/v1/experiments
    create: async (req: any, res: any) => {
      const result = await service.createExperiment(req.body);
      if (!result.success) return res.status(400).json(result);
      return res.status(201).json(result.data);
    },

    // POST /api/v1/experiments/:id/start
    start: async (req: any, res: any) => {
      const result = await service.startExperiment(req.params.id);
      if (!result.success) return res.status(400).json(result);
      return res.json({ started: true });
    },

    // POST /api/v1/experiments/:id/assign
    assign: async (req: any, res: any) => {
      const { userId, ...context } = req.body;
      const result = await service.assignUser(req.params.id, userId, context);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },

    // POST /api/v1/experiments/:id/metrics
    recordMetric: async (req: any, res: any) => {
      const { userId, metricId, value } = req.body;
      const result = await service.recordMetricEvent(req.params.id, userId, metricId, value);
      if (!result.success) return res.status(400).json(result);
      return res.json({ recorded: true });
    },

    // GET /api/v1/experiments/:id/analysis
    analyse: async (req: any, res: any) => {
      const result = await service.analyseExperiment(req.params.id);
      if (!result.success) return res.status(400).json(result);
      return res.json(result.data);
    },

    // GET /api/v1/experiments/:id/summary
    summary: async (req: any, res: any) => {
      const result = await service.getExperimentSummary(req.params.id);
      if (!result.success) return res.status(404).json(result);
      return res.json(result.data);
    },

    // GET /api/v1/experiments
    list: async (req: any, res: any) => {
      const status = req.query.status as ExperimentStatus | undefined;
      const experiments = await service.listExperiments(status);
      return res.json({ experiments, total: experiments.length });
    },

    // POST /api/v1/experiments/:id/stop
    stop: async (req: any, res: any) => {
      const result = await service.stopExperiment(req.params.id, req.body.reason);
      if (!result.success) return res.status(400).json(result);
      return res.json({ stopped: true });
    },

    // POST /api/v1/experiments/:id/complete
    complete: async (req: any, res: any) => {
      const result = await service.completeExperiment(req.params.id, req.body.winningVariantId);
      if (!result.success) return res.status(400).json(result);
      return res.json({ completed: true });
    },
  };
}

export {
  ExperimentAssignmentService,
  StatisticalEngine,
  ExperimentDefinition,
  ExperimentVariant,
  ExperimentStatus,
  ExperimentCategory,
  SafetyClassification,
  MetricType,
  ExperimentResults,
  StatisticalTestResult,
  BayesianResult,
  createExperimentRoutes,
};
