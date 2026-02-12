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
} from '@/types/golden-path';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';
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

  // BKT Competencies
  async getCompetencies(): Promise<{ competencies: BKTCompetency[] }> {
    if (this.demoMode) return { competencies: demoCompetencies };
    return this.request('GET', '/competencies');
  }

  // ZPD Ranges
  async getZPDRanges(): Promise<{ ranges: ZPDRange[] }> {
    if (this.demoMode) return { ranges: demoZPDRanges };
    return this.request('GET', '/zpd');
  }

  // Fatigue Assessment
  async getFatigueAssessment(): Promise<{ assessment: FatigueAssessment }> {
    if (this.demoMode) return { assessment: demoFatigue };
    return this.request('GET', '/fatigue');
  }

  // Interest Clusters
  async getInterestClusters(): Promise<{ clusters: InterestCluster[] }> {
    if (this.demoMode) return { clusters: demoInterestClusters };
    return this.request('GET', '/interests');
  }

  // Curiosity Signals
  async getCuriositySignals(): Promise<{ signals: CuriositySignal[] }> {
    if (this.demoMode) return { signals: demoCuriositySignals };
    return this.request('GET', '/curiosity/signals');
  }

  // Optimization
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
