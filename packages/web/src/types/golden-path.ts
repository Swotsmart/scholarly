/**
 * Golden Path Type Definitions
 * Adaptive learning path with BKT mastery, ZPD analysis, and curiosity-driven exploration
 */

// =============================================================================
// BKT (Bayesian Knowledge Tracing) TYPES
// =============================================================================

export interface BKTCompetency {
  id: string;
  name: string;
  domain: string;
  pKnown: number; // 0-1 probability of mastery
  pLearn: number;
  pGuess: number;
  pSlip: number;
  observations: number;
  lastUpdated: string;
}

// =============================================================================
// ZPD (Zone of Proximal Development) TYPES
// =============================================================================

export interface ZPDRange {
  domain: string;
  lowerBound: number;
  upperBound: number;
  currentLevel: number;
  optimalDifficulty: number;
}

// =============================================================================
// FATIGUE ASSESSMENT TYPES
// =============================================================================

export interface FatigueAssessment {
  score: number; // 0-100
  level: 'low' | 'moderate' | 'high' | 'critical';
  factors: { name: string; value: number }[];
  recommendation: string;
}

// =============================================================================
// CURIOSITY & INTEREST TYPES
// =============================================================================

export interface InterestCluster {
  id: string;
  name: string;
  topics: string[];
  strength: number; // 0-100
  emerging: boolean;
  signalCount: number;
}

export interface CuriositySignal {
  id: string;
  type: string;
  topic: string;
  timestamp: string;
  strength: number;
}

// =============================================================================
// ADAPTATION ENGINE TYPES
// =============================================================================

export interface AdaptationProfile {
  learnerId: string;
  competencyStates: BKTCompetency[];
  overallMastery: number;
  lastAssessment: string;
  adaptationStrategy: string;
}

export interface OptimalDifficulty {
  learnerId: string;
  domain: string;
  targetDifficulty: number;
  confidenceInterval: { low: number; high: number };
  basedOnObservations: number;
}

export interface AdaptationRule {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  isActive: boolean;
  priority: number;
}

export interface AdaptationEvent {
  id: string;
  learnerId: string;
  ruleId: string;
  ruleName: string;
  action: string;
  outcome: string;
  timestamp: string;
}

// =============================================================================
// CURIOSITY ENGINE TYPES
// =============================================================================

export interface CuriosityProfile {
  learnerId: string;
  overallCuriosity: number;
  explorationBreadth: number;
  explorationDepth: number;
  dominantInterests: string[];
  lastUpdated: string;
}

export interface EmergingInterest {
  id: string;
  topic: string;
  signalCount: number;
  firstSeen: string;
  lastSeen: string;
  growthRate: number;
  relatedClusters: string[];
}

export interface ContentSuggestion {
  id: string;
  title: string;
  type: string;
  relevanceScore: number;
  matchedInterests: string[];
  difficulty: number;
  estimatedDuration: string;
}

// =============================================================================
// OPTIMIZATION TYPES
// =============================================================================

export interface OptimizationObjective {
  name: string;
  weight: number;
  score: number;
}

export interface ObjectiveWeightsConfig {
  learnerId: string;
  weights: OptimizationObjective[];
  lastModified: string;
  source: 'default' | 'teacher' | 'ai' | 'parent';
}

export interface OptimizationResult {
  learnerId: string;
  selectedPath: LearningPath;
  alternativePaths: LearningPath[];
  confidence: number;
  generatedAt: string;
}

export interface OptimizationEvent {
  id: string;
  learnerId: string;
  action: string;
  previousWeights: OptimizationObjective[];
  newWeights: OptimizationObjective[];
  outcome: string;
  timestamp: string;
}

export interface LearningPath {
  id: string;
  name: string;
  objectives: OptimizationObjective[];
  totalScore: number;
  estimatedDuration: string;
  steps: { name: string; difficulty: number; mastery: number }[];
}
