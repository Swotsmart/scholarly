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
// OPTIMIZATION TYPES
// =============================================================================

export interface OptimizationObjective {
  name: string;
  weight: number;
  score: number;
}

export interface LearningPath {
  id: string;
  name: string;
  objectives: OptimizationObjective[];
  totalScore: number;
  estimatedDuration: string;
  steps: { name: string; difficulty: number; mastery: number }[];
}
