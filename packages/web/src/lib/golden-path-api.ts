/**
 * Golden Path API Client
 * Handles all API interactions for adaptive learning paths
 */

import type {
  BKTCompetency,
  ZPDRange,
  FatigueAssessment,
  InterestCluster,
  CuriositySignal,
  OptimizationObjective,
  LearningPath,
  AdaptationProfile,
  OptimalDifficulty,
  AdaptationRule,
  AdaptationEvent,
  CuriosityProfile,
  EmergingInterest,
  ContentSuggestion,
  ObjectiveWeightsConfig,
  OptimizationResult,
  OptimizationEvent,
} from '@/types/golden-path';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoCompetencies: BKTCompetency[] = [
  {
    id: 'comp-1',
    name: 'Algebraic Expressions',
    domain: 'Mathematics',
    pKnown: 0.85,
    pLearn: 0.12,
    pGuess: 0.08,
    pSlip: 0.05,
    observations: 42,
    lastUpdated: '2024-02-10T14:00:00Z',
  },
  {
    id: 'comp-2',
    name: 'Cell Biology',
    domain: 'Science',
    pKnown: 0.72,
    pLearn: 0.15,
    pGuess: 0.1,
    pSlip: 0.06,
    observations: 38,
    lastUpdated: '2024-02-09T16:30:00Z',
  },
  {
    id: 'comp-3',
    name: 'Essay Structure',
    domain: 'English',
    pKnown: 0.68,
    pLearn: 0.18,
    pGuess: 0.12,
    pSlip: 0.07,
    observations: 25,
    lastUpdated: '2024-02-08T10:15:00Z',
  },
  {
    id: 'comp-4',
    name: 'Chemical Bonding',
    domain: 'Science',
    pKnown: 0.55,
    pLearn: 0.2,
    pGuess: 0.15,
    pSlip: 0.1,
    observations: 30,
    lastUpdated: '2024-02-10T09:00:00Z',
  },
  {
    id: 'comp-5',
    name: 'Statistical Analysis',
    domain: 'Mathematics',
    pKnown: 0.78,
    pLearn: 0.14,
    pGuess: 0.09,
    pSlip: 0.04,
    observations: 35,
    lastUpdated: '2024-02-09T11:20:00Z',
  },
  {
    id: 'comp-6',
    name: 'Historical Analysis',
    domain: 'Humanities',
    pKnown: 0.62,
    pLearn: 0.16,
    pGuess: 0.11,
    pSlip: 0.08,
    observations: 22,
    lastUpdated: '2024-02-07T15:45:00Z',
  },
];

const demoZPDRanges: ZPDRange[] = [
  {
    domain: 'Mathematics',
    lowerBound: 0.6,
    upperBound: 0.85,
    currentLevel: 0.75,
    optimalDifficulty: 0.78,
  },
  {
    domain: 'Science',
    lowerBound: 0.5,
    upperBound: 0.78,
    currentLevel: 0.64,
    optimalDifficulty: 0.7,
  },
  {
    domain: 'English',
    lowerBound: 0.55,
    upperBound: 0.8,
    currentLevel: 0.68,
    optimalDifficulty: 0.73,
  },
];

const demoFatigue: FatigueAssessment = {
  score: 28,
  level: 'low',
  factors: [
    { name: 'Accuracy Decline', value: 15 },
    { name: 'Response Time', value: 22 },
    { name: 'Hint Usage', value: 35 },
    { name: 'Session Duration', value: 40 },
  ],
  recommendation: 'Learner is performing well. Consider introducing more challenging material.',
};

const demoInterestClusters: InterestCluster[] = [
  {
    id: 'cluster-1',
    name: 'Space Exploration',
    topics: ['Astrophysics', 'Mars Missions', 'Orbital Mechanics', 'Telescope Design'],
    strength: 92,
    emerging: false,
    signalCount: 34,
  },
  {
    id: 'cluster-2',
    name: 'Environmental Science',
    topics: ['Climate Change', 'Renewable Energy', 'Ecosystems', 'Conservation'],
    strength: 78,
    emerging: false,
    signalCount: 28,
  },
  {
    id: 'cluster-3',
    name: 'Creative Writing',
    topics: ['Poetry', 'Fiction', 'Narrative Techniques', 'World Building'],
    strength: 65,
    emerging: true,
    signalCount: 15,
  },
  {
    id: 'cluster-4',
    name: 'Robotics & AI',
    topics: ['Machine Learning', 'Arduino', 'Sensor Networks', 'Automation'],
    strength: 88,
    emerging: false,
    signalCount: 31,
  },
  {
    id: 'cluster-5',
    name: 'Ancient History',
    topics: ['Egyptian Civilization', 'Roman Empire', 'Archaeological Methods'],
    strength: 45,
    emerging: true,
    signalCount: 9,
  },
  {
    id: 'cluster-6',
    name: 'Music Theory',
    topics: ['Composition', 'Harmony', 'Rhythm Analysis'],
    strength: 52,
    emerging: true,
    signalCount: 11,
  },
];

const demoCuriositySignals: CuriositySignal[] = [
  { id: 'sig-1', type: 'search', topic: 'Black hole formation', timestamp: '2024-02-10T14:30:00Z', strength: 95 },
  { id: 'sig-2', type: 'deep-read', topic: 'Photosynthesis mechanisms', timestamp: '2024-02-10T13:15:00Z', strength: 82 },
  { id: 'sig-3', type: 'question', topic: 'Quantum computing basics', timestamp: '2024-02-10T12:00:00Z', strength: 88 },
  { id: 'sig-4', type: 'exploration', topic: 'Medieval architecture', timestamp: '2024-02-10T11:30:00Z', strength: 60 },
  { id: 'sig-5', type: 'revisit', topic: 'DNA replication process', timestamp: '2024-02-10T10:45:00Z', strength: 75 },
  { id: 'sig-6', type: 'search', topic: 'Climate feedback loops', timestamp: '2024-02-10T09:20:00Z', strength: 90 },
  { id: 'sig-7', type: 'deep-read', topic: 'Shakespeare sonnets', timestamp: '2024-02-09T16:00:00Z', strength: 55 },
  { id: 'sig-8', type: 'question', topic: 'Neural network layers', timestamp: '2024-02-09T14:30:00Z', strength: 85 },
];

const demoObjectives: OptimizationObjective[] = [
  { name: 'Mastery', weight: 0.25, score: 78 },
  { name: 'Engagement', weight: 0.2, score: 85 },
  { name: 'Efficiency', weight: 0.15, score: 72 },
  { name: 'Curiosity', weight: 0.15, score: 88 },
  { name: 'Well-being', weight: 0.1, score: 92 },
  { name: 'Breadth', weight: 0.08, score: 65 },
  { name: 'Depth', weight: 0.07, score: 80 },
];

const demoLearningPaths: LearningPath[] = [
  {
    id: 'path-1',
    name: 'Balanced Growth Path',
    objectives: demoObjectives,
    totalScore: 82,
    estimatedDuration: '6 weeks',
    steps: [
      { name: 'Algebraic Foundations Review', difficulty: 0.6, mastery: 0.85 },
      { name: 'Cell Biology Deep Dive', difficulty: 0.7, mastery: 0.72 },
      { name: 'Essay Writing Workshop', difficulty: 0.65, mastery: 0.68 },
      { name: 'Chemical Bonding Lab', difficulty: 0.75, mastery: 0.55 },
      { name: 'Statistical Methods Project', difficulty: 0.7, mastery: 0.78 },
    ],
  },
  {
    id: 'path-2',
    name: 'Curiosity-Driven Path',
    objectives: [
      { name: 'Mastery', weight: 0.15, score: 70 },
      { name: 'Engagement', weight: 0.25, score: 92 },
      { name: 'Efficiency', weight: 0.1, score: 65 },
      { name: 'Curiosity', weight: 0.25, score: 95 },
      { name: 'Well-being', weight: 0.1, score: 88 },
      { name: 'Breadth', weight: 0.1, score: 82 },
      { name: 'Depth', weight: 0.05, score: 75 },
    ],
    totalScore: 84,
    estimatedDuration: '8 weeks',
    steps: [
      { name: 'Space Physics Exploration', difficulty: 0.7, mastery: 0.45 },
      { name: 'Environmental Data Analysis', difficulty: 0.65, mastery: 0.6 },
      { name: 'Creative Narrative Project', difficulty: 0.55, mastery: 0.5 },
      { name: 'Robotics Prototyping', difficulty: 0.8, mastery: 0.4 },
      { name: 'Historical Research Paper', difficulty: 0.6, mastery: 0.35 },
    ],
  },
];

// =============================================================================
// DEMO DATA — Adaptation, Curiosity, Optimizer engine types
// =============================================================================

const demoAdaptationProfile: AdaptationProfile = {
  learnerId: 'learner-001',
  competencyStates: demoCompetencies,
  overallMastery: 0.7,
  lastAssessment: '2024-02-10T14:00:00Z',
  adaptationStrategy: 'balanced',
};

const demoOptimalDifficulty: OptimalDifficulty = {
  learnerId: 'learner-001',
  domain: 'Mathematics',
  targetDifficulty: 0.78,
  confidenceInterval: { low: 0.72, high: 0.84 },
  basedOnObservations: 42,
};

const demoAdaptationRules: AdaptationRule[] = [
  { id: 'rule-1', name: 'Mastery Threshold', description: 'Advance when pKnown > 0.85', condition: 'pKnown > 0.85', action: 'increase_difficulty', isActive: true, priority: 1 },
  { id: 'rule-2', name: 'Fatigue Guard', description: 'Reduce load when fatigue > 70', condition: 'fatigue.score > 70', action: 'reduce_difficulty', isActive: true, priority: 2 },
  { id: 'rule-3', name: 'Curiosity Boost', description: 'Insert interest topic when engagement drops', condition: 'engagement < 0.5', action: 'inject_interest_topic', isActive: true, priority: 3 },
];

const demoAdaptationHistory: AdaptationEvent[] = [
  { id: 'evt-1', learnerId: 'learner-001', ruleId: 'rule-1', ruleName: 'Mastery Threshold', action: 'increase_difficulty', outcome: 'Advanced to Year 8 algebra', timestamp: '2024-02-10T14:00:00Z' },
  { id: 'evt-2', learnerId: 'learner-001', ruleId: 'rule-3', ruleName: 'Curiosity Boost', action: 'inject_interest_topic', outcome: 'Inserted space physics module', timestamp: '2024-02-09T10:30:00Z' },
  { id: 'evt-3', learnerId: 'learner-001', ruleId: 'rule-2', ruleName: 'Fatigue Guard', action: 'reduce_difficulty', outcome: 'Switched to revision mode', timestamp: '2024-02-08T15:45:00Z' },
];

const demoCuriosityProfile: CuriosityProfile = {
  learnerId: 'learner-001',
  overallCuriosity: 82,
  explorationBreadth: 75,
  explorationDepth: 88,
  dominantInterests: ['Space Exploration', 'Robotics & AI', 'Environmental Science'],
  lastUpdated: '2024-02-10T14:30:00Z',
};

const demoEmergingInterests: EmergingInterest[] = [
  { id: 'ei-1', topic: 'Quantum Computing', signalCount: 5, firstSeen: '2024-02-05T10:00:00Z', lastSeen: '2024-02-10T12:00:00Z', growthRate: 0.85, relatedClusters: ['Robotics & AI'] },
  { id: 'ei-2', topic: 'Marine Biology', signalCount: 3, firstSeen: '2024-02-07T09:00:00Z', lastSeen: '2024-02-10T11:00:00Z', growthRate: 0.6, relatedClusters: ['Environmental Science'] },
];

const demoContentSuggestions: ContentSuggestion[] = [
  { id: 'cs-1', title: 'Introduction to Orbital Mechanics', type: 'interactive', relevanceScore: 95, matchedInterests: ['Space Exploration'], difficulty: 0.7, estimatedDuration: '45 min' },
  { id: 'cs-2', title: 'Build a Simple Robot Arm', type: 'project', relevanceScore: 90, matchedInterests: ['Robotics & AI'], difficulty: 0.65, estimatedDuration: '2 hours' },
  { id: 'cs-3', title: 'Climate Data Analysis with Python', type: 'lesson', relevanceScore: 85, matchedInterests: ['Environmental Science'], difficulty: 0.75, estimatedDuration: '1 hour' },
];

const demoObjectiveWeights: ObjectiveWeightsConfig = {
  learnerId: 'learner-001',
  weights: demoObjectives,
  lastModified: '2024-02-10T08:00:00Z',
  source: 'ai',
};

const demoOptimizationResult: OptimizationResult = {
  learnerId: 'learner-001',
  selectedPath: demoLearningPaths[0],
  alternativePaths: [demoLearningPaths[1]],
  confidence: 0.87,
  generatedAt: '2024-02-10T14:00:00Z',
};

const demoOptimizationHistory: OptimizationEvent[] = [
  { id: 'opt-1', learnerId: 'learner-001', action: 'rebalance', previousWeights: demoObjectives, newWeights: demoObjectives, outcome: 'Shifted focus toward mastery', timestamp: '2024-02-10T08:00:00Z' },
  { id: 'opt-2', learnerId: 'learner-001', action: 'curiosity_boost', previousWeights: demoObjectives, newWeights: demoObjectives, outcome: 'Increased curiosity weight', timestamp: '2024-02-09T08:00:00Z' },
];

// =============================================================================
// API CLIENT
// =============================================================================

class GoldenPathApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor() {
    this.baseUrl = `${API_BASE}/golden-path`;
    this.demoMode = DEMO_MODE;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ── Adaptation Engine ──

  async getAdaptationProfile(learnerId: string): Promise<AdaptationProfile> {
    if (this.demoMode) return { ...demoAdaptationProfile, learnerId };
    return this.request('GET', `/adaptation/${learnerId}/profile`);
  }

  async getZPDRange(learnerId: string, domain: string): Promise<ZPDRange> {
    if (this.demoMode) return demoZPDRanges.find(z => z.domain === domain) ?? demoZPDRanges[0];
    return this.request('GET', `/adaptation/${learnerId}/zpd?domain=${encodeURIComponent(domain)}`);
  }

  async getOptimalDifficulty(learnerId: string): Promise<OptimalDifficulty> {
    if (this.demoMode) return { ...demoOptimalDifficulty, learnerId };
    return this.request('GET', `/adaptation/${learnerId}/difficulty`);
  }

  async getAdaptationRules(options?: { isActive?: boolean }): Promise<AdaptationRule[]> {
    if (this.demoMode) {
      const rules = options?.isActive ? demoAdaptationRules.filter(r => r.isActive) : demoAdaptationRules;
      return rules;
    }
    const qs = options?.isActive != null ? `?isActive=${options.isActive}` : '';
    return this.request('GET', `/adaptation/rules${qs}`);
  }

  async getAdaptationHistory(learnerId: string, options?: { limit?: number }): Promise<AdaptationEvent[]> {
    if (this.demoMode) return demoAdaptationHistory.slice(0, options?.limit ?? 20);
    const qs = options?.limit ? `?limit=${options.limit}` : '';
    return this.request('GET', `/adaptation/${learnerId}/history${qs}`);
  }

  async getFatigueAssessment(learnerId: string, sessionId?: string): Promise<FatigueAssessment> {
    if (this.demoMode) return demoFatigue;
    const qs = sessionId ? `?sessionId=${sessionId}` : '';
    return this.request('GET', `/adaptation/${learnerId}/fatigue${qs}`);
  }

  // ── Curiosity Engine ──

  async getCuriosityProfile(learnerId: string): Promise<CuriosityProfile> {
    if (this.demoMode) return { ...demoCuriosityProfile, learnerId };
    return this.request('GET', `/curiosity/${learnerId}/profile`);
  }

  async getInterestClusters(learnerId: string): Promise<InterestCluster[]> {
    if (this.demoMode) return demoInterestClusters;
    return this.request('GET', `/curiosity/${learnerId}/clusters`);
  }

  async getEmergingInterests(learnerId: string): Promise<EmergingInterest[]> {
    if (this.demoMode) return demoEmergingInterests;
    return this.request('GET', `/curiosity/${learnerId}/emerging`);
  }

  async getContentSuggestions(learnerId: string, options?: { limit?: number }): Promise<ContentSuggestion[]> {
    if (this.demoMode) return demoContentSuggestions.slice(0, options?.limit ?? 5);
    const qs = options?.limit ? `?limit=${options.limit}` : '';
    return this.request('GET', `/curiosity/${learnerId}/suggestions${qs}`);
  }

  // ── Multi-Objective Optimizer ──

  async getObjectiveWeights(learnerId: string): Promise<ObjectiveWeightsConfig> {
    if (this.demoMode) return { ...demoObjectiveWeights, learnerId };
    return this.request('GET', `/optimization/${learnerId}/weights`);
  }

  async getOptimizationHistory(learnerId: string, options?: { limit?: number }): Promise<OptimizationEvent[]> {
    if (this.demoMode) return demoOptimizationHistory.slice(0, options?.limit ?? 10);
    const qs = options?.limit ? `?limit=${options.limit}` : '';
    return this.request('GET', `/optimization/${learnerId}/history${qs}`);
  }

  async optimizePath(learnerId: string): Promise<OptimizationResult> {
    if (this.demoMode) return { ...demoOptimizationResult, learnerId };
    return this.request('POST', `/optimization/${learnerId}/optimize`);
  }

  // ── Legacy methods (used by existing golden-path pages) ──

  async getCompetencies(): Promise<{ competencies: BKTCompetency[] }> {
    if (this.demoMode) return { competencies: demoCompetencies };
    return this.request('GET', '/competencies');
  }

  async getZPDRanges(): Promise<{ ranges: ZPDRange[] }> {
    if (this.demoMode) return { ranges: demoZPDRanges };
    return this.request('GET', '/zpd');
  }

  async getCuriositySignals(): Promise<{ signals: CuriositySignal[] }> {
    if (this.demoMode) return { signals: demoCuriositySignals };
    return this.request('GET', '/curiosity/signals');
  }

  async getObjectives(): Promise<{ objectives: OptimizationObjective[] }> {
    if (this.demoMode) return { objectives: demoObjectives };
    return this.request('GET', '/optimization/objectives');
  }

  async getLearningPaths(): Promise<{ paths: LearningPath[] }> {
    if (this.demoMode) return { paths: demoLearningPaths };
    return this.request('GET', '/optimization/paths');
  }

  async runSimulation(weights: Record<string, number>): Promise<{ paths: LearningPath[] }> {
    if (this.demoMode) return { paths: demoLearningPaths };
    return this.request('POST', '/optimization/simulate', { weights });
  }
}

export const goldenPathApi = new GoldenPathApiClient();
