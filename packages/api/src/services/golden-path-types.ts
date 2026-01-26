/**
 * Golden Path Enhancement Type Definitions
 *
 * Types for:
 * - Bayesian Knowledge Tracing (BKT) parameters and mastery estimation
 * - Zone of Proximal Development (ZPD) calculation
 * - Fatigue detection and well-being signals
 * - Curiosity-driven data layer (signals, clusters, emerging interests)
 * - Multi-objective optimization (Pareto frontier, Tchebycheff scalarization)
 */

// ============================================================================
// BAYESIAN KNOWLEDGE TRACING (BKT)
// ============================================================================

export interface BKTParameters {
  pLearn: number;   // P(Learn)  - probability of learning on each opportunity (0-1)
  pGuess: number;   // P(Guess)  - probability of correct answer despite not knowing (0-1)
  pSlip: number;    // P(Slip)   - probability of wrong answer despite knowing (0-1)
  pKnown: number;   // P(Known)  - current mastery probability (0-1)
}

export interface BKTCompetencyState {
  competencyId: string;
  domain: string;
  params: BKTParameters;
  observations: number;
  lastObservationAt: Date;
  masteryHistory: MasterySnapshot[];
}

export interface MasterySnapshot {
  timestamp: Date;
  pKnown: number;
  wasCorrect: boolean;
  responseTimeMs?: number;
  difficulty?: number;
}

export interface MasteryEstimate {
  competencyId: string;
  domain: string;
  pKnown: number;
  confidence: number;
  totalObservations: number;
  trend: 'improving' | 'stable' | 'declining';
  lastUpdated: Date;
}

// ============================================================================
// ADAPTATION SIGNALS & PROFILES
// ============================================================================

export type SignalType =
  | 'accuracy'
  | 'response_time'
  | 'engagement'
  | 'hint_usage'
  | 'skip_rate'
  | 'retry_count'
  | 'time_on_task'
  | 'help_seeking'
  | 'error_pattern';

export interface AdaptationSignal {
  type: SignalType;
  value: number;
  timestamp: Date;
  context?: {
    competencyId?: string;
    domain?: string;
    contentId?: string;
    sessionId?: string;
    difficulty?: number;
  };
}

export interface EMAState {
  accuracy: number;
  responseTime: number;
  engagement: number;
  hintUsage: number;
  skipRate: number;
  lastUpdated: Date;
}

export interface AdaptationProfile {
  id: string;
  tenantId: string;
  learnerId: string;
  competencyStates: BKTCompetencyState[];
  emaState: EMAState;
  currentDifficulty: number;
  targetSuccessRate: number;
  sessionCount: number;
  totalTimeMinutes: number;
  lastSessionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ZONE OF PROXIMAL DEVELOPMENT (ZPD)
// ============================================================================

export interface ZPDRange {
  domain: string;
  lowerBound: number;  // Mastery level below which tasks are too easy
  upperBound: number;  // Mastery level above which tasks are too hard
  optimalDifficulty: number;
  competencies: ZPDCompetency[];
}

export interface ZPDCompetency {
  competencyId: string;
  name: string;
  pKnown: number;
  zone: 'mastered' | 'zpd' | 'beyond_reach';
  recommendedActions: string[];
}

// ============================================================================
// FATIGUE DETECTION
// ============================================================================

export interface FatigueAssessment {
  learnerId: string;
  sessionId: string;
  overallScore: number;  // 0-100, higher = more fatigued
  components: {
    accuracyDecline: number;    // 0-100
    responseTimeIncrease: number; // 0-100
    hintUsageIncrease: number;    // 0-100
    sessionDuration: number;      // 0-100
    errorBurstiness: number;      // 0-100
  };
  recommendation: FatigueRecommendation;
  assessedAt: Date;
}

export type FatigueRecommendation =
  | 'continue'
  | 'reduce_difficulty'
  | 'switch_topic'
  | 'take_break'
  | 'end_session';

// ============================================================================
// DECISION GATES & ADAPTATION RULES
// ============================================================================

export interface DecisionGateInput {
  learnerId: string;
  currentCompetencyId?: string;
  currentDomain?: string;
  sessionId?: string;
  candidateSteps: CandidateStep[];
}

export interface CandidateStep {
  id: string;
  competencyId: string;
  domain: string;
  contentId: string;
  difficulty: number;
  estimatedDurationMinutes: number;
  prerequisites: string[];
  tags: string[];
}

export interface ScoredStep extends CandidateStep {
  score: number;
  components: {
    masteryGain: number;
    engagementProbability: number;
    timeEfficiency: number;
    prerequisiteCoverage: number;
    curiosityAlignment: number;
  };
  reasoning: string;
}

export type AdaptationRuleOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'between';
export type AdaptationRuleLogic = 'AND' | 'OR';
export type AdaptationRuleScope = 'global' | 'domain' | 'competency';

export interface AdaptationRuleCondition {
  signal: SignalType | 'mastery' | 'fatigue' | 'session_duration' | 'streak';
  operator: AdaptationRuleOperator;
  value: number;
  secondaryValue?: number; // For 'between' operator
}

export interface AdaptationRule {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  scope: AdaptationRuleScope;
  scopeId?: string; // domain or competency ID when scoped
  priority: number;
  conditions: AdaptationRuleCondition[];
  conditionLogic: AdaptationRuleLogic;
  action: AdaptationRuleAction;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type AdaptationRuleAction =
  | { type: 'adjust_difficulty'; delta: number }
  | { type: 'switch_domain'; targetDomain: string }
  | { type: 'suggest_break'; durationMinutes: number }
  | { type: 'reduce_load'; factor: number }
  | { type: 'boost_scaffolding'; level: 'light' | 'medium' | 'heavy' }
  | { type: 'trigger_review'; competencyIds: string[] }
  | { type: 'notify_teacher'; message: string }
  | { type: 'custom'; handler: string; params: Record<string, unknown> };

export interface AdaptationEvent {
  id: string;
  tenantId: string;
  learnerId: string;
  ruleId?: string;
  triggerSignals: AdaptationSignal[];
  action: AdaptationRuleAction;
  outcome?: string;
  timestamp: Date;
}

// ============================================================================
// CURIOSITY-DRIVEN DATA LAYER
// ============================================================================

export type CuriositySignalType =
  | 'voluntary_exploration'
  | 'question_asking'
  | 'topic_deep_dive'
  | 'return_visit'
  | 'content_sharing'
  | 'tangential_pursuit'
  | 'dwell_anomaly';

export interface CuriositySignal {
  id: string;
  tenantId: string;
  learnerId: string;
  signalType: CuriositySignalType;
  topicId: string;
  topicName: string;
  domain: string;
  strength: number;  // 0-1 signal strength
  context: {
    sessionId: string;
    contentId?: string;
    sourceUrl?: string;
    dwellTimeMs?: number;
    referringTopicId?: string;
    searchQuery?: string;
  };
  recordedAt: Date;
}

export interface InterestCluster {
  id: string;
  topics: string[];
  topicNames: string[];
  strength: number;  // 0-1 cluster cohesion
  signalCount: number;
  domains: string[];
  lastActivityAt: Date;
  emergingScore: number;  // 0-1 how rapidly this cluster is growing
}

export interface CuriosityProfile {
  learnerId: string;
  overallScore: number;  // 0-100 composite curiosity score
  components: {
    signalCount: number;
    breadth: number;      // 0-100 topic diversity
    depth: number;        // 0-100 topic depth (return visits, deep dives)
    questionFrequency: number; // 0-100
    explorationRate: number;   // 0-100
  };
  clusters: InterestCluster[];
  emergingInterests: EmergingInterest[];
  recentSignals: CuriositySignal[];
  lastUpdated: Date;
}

export interface EmergingInterest {
  topicId: string;
  topicName: string;
  domain: string;
  acceleration: number;  // ratio of recent to historical signal rate
  signalTrend: number[];  // daily signal counts for visualization
  confidence: number;     // 0-1
  firstSeenAt: Date;
  detectedAt: Date;
}

export interface ContentSuggestion {
  contentId: string;
  title: string;
  domain: string;
  topics: string[];
  relevanceScore: number;    // 0-1
  curiosityAlignment: number; // 0-1
  peerPopularity: number;    // 0-1
  crossCurricular: boolean;
  reasoning: string;
}

export interface CuriosityTrigger {
  contentId: string;
  title: string;
  domain: string;
  triggerScore: number;  // 0-1 likelihood of sparking curiosity
  learnerSimilarity: number; // 0-1 similarity to requesting learner
  historicalSignals: number; // total curiosity signals generated
}

// ============================================================================
// MULTI-OBJECTIVE OPTIMIZATION
// ============================================================================

export type OptimizationObjective =
  | 'mastery'
  | 'engagement'
  | 'efficiency'
  | 'curiosity'
  | 'well_being'
  | 'breadth'
  | 'depth';

export interface ObjectiveWeights {
  mastery: number;
  engagement: number;
  efficiency: number;
  curiosity: number;
  well_being: number;
  breadth: number;
  depth: number;
}

export interface ObjectiveWeightsConfig {
  id: string;
  tenantId: string;
  learnerId?: string;
  cohortId?: string;
  institutionId?: string;
  weights: ObjectiveWeights;
  source: 'learner' | 'cohort' | 'institution' | 'default';
  createdAt: Date;
  updatedAt: Date;
}

export interface OptimizationConstraints {
  mandatoryCurriculumIds?: string[];
  maxDailyMinutes?: number;
  prerequisiteOrdering?: boolean;
  maxDifficultyJump?: number;
  excludeCompetencyIds?: string[];
  preferredDomains?: string[];
  avoidDomains?: string[];
  minBreakMinutes?: number;
  maxConsecutiveMinutes?: number;
}

export interface LearningPath {
  id: string;
  steps: LearningPathStep[];
  objectiveScores: ObjectiveWeights;
  totalDurationMinutes: number;
  curriculumCoverage: number;  // 0-1
  isDominated: boolean;
}

export interface LearningPathStep {
  order: number;
  contentId: string;
  competencyId: string;
  domain: string;
  difficulty: number;
  estimatedDurationMinutes: number;
  predictedMasteryGain: number;
  predictedEngagement: number;
  cumulativeMastery: number;
}

export interface ParetoSolution {
  pathId: string;
  objectiveScores: ObjectiveWeights;
  rank: number;  // 0 = Pareto-optimal front
  crowdingDistance: number;
}

export interface OptimizationResult {
  learnerId: string;
  paretoFrontier: ParetoSolution[];
  recommendedPath: LearningPath;
  alternativePaths: LearningPath[];
  scalarizationMethod: 'weighted_tchebycheff' | 'weighted_sum' | 'epsilon_constraint';
  weightsUsed: ObjectiveWeights;
  constraintsSatisfied: boolean;
  unsatisfiedConstraints?: string[];
  computedAt: Date;
}

export interface PathSimulation {
  learnerId: string;
  path: LearningPath;
  masteryTrajectory: SimulationPoint[];
  engagementCurve: SimulationPoint[];
  fatiguePoints: SimulationPoint[];
  projectedCompletionDate?: Date;
  riskFactors: string[];
}

export interface SimulationPoint {
  stepIndex: number;
  timestamp: Date;
  value: number;
  confidence: number;
}

export interface PathComparison {
  pathA: LearningPath;
  pathB: LearningPath;
  objectiveComparison: Array<{
    objective: OptimizationObjective;
    pathAScore: number;
    pathBScore: number;
    winner: 'A' | 'B' | 'tie';
    significance: number;
  }>;
  overallRecommendation: 'A' | 'B';
  reasoning: string;
  tradeoffSummary: string;
}

export interface OptimizationEvent {
  id: string;
  tenantId: string;
  learnerId: string;
  weightsUsed: ObjectiveWeights;
  constraintsApplied: OptimizationConstraints;
  paretoFrontSize: number;
  selectedPathId: string;
  computeTimeMs: number;
  timestamp: Date;
}
