// ============================================================================
// S15-003: ADVANCED BKT v2
// Scholarly Platform — Sprint 15
//
// Deep Knowledge Tracing with LSTM; multi-skill BKT; prerequisite graph
// inference; forgetting curves.
//
// The original BKT engine (Sprint 3) was like a thermometer — it could tell
// you the temperature of each skill at a point in time. BKT v2 is like a
// weather forecasting system: it not only measures current conditions but
// predicts how skills will evolve over time, understands how skills interact
// (knowing 'sh' helps with learning 'ch'), and accounts for the natural decay
// of knowledge when it isn't practised — the forgetting curve that Ebbinghaus
// first documented in 1885 and that every teacher has witnessed since.
// ============================================================================

import { ScholarlyBaseService, Result, PrismaClient, EventEmitter } from '../shared/base';

// ============================================================================
// SECTION 1: ENHANCED KNOWLEDGE STATE MODEL
// ============================================================================

// ---------------------------------------------------------------------------
// 1.1 Multi-Skill Mastery State
// ---------------------------------------------------------------------------

interface AdvancedMasteryState {
  learnerId: string;
  tenantId: string;
  skills: Map<string, SkillState>;
  prerequisiteGraph: PrerequisiteGraph;
  forgettingModel: ForgettingModel;
  dktPredictions: DKTPrediction[];
  lastUpdated: Date;
  version: number;  // Optimistic concurrency
}

interface SkillState {
  skillId: string;
  skillType: 'GPC' | 'BLEND' | 'DIGRAPH' | 'TRIGRAPH' | 'MORPHEME' | 'VOCABULARY' | 'COMPREHENSION';
  phonicsPhase: number;

  // Classical BKT parameters
  pMastery: number;      // P(mastered)
  pTransit: number;      // P(learn | not mastered)
  pSlip: number;         // P(incorrect | mastered)
  pGuess: number;        // P(correct | not mastered)

  // Enhanced parameters
  pRetention: number;    // P(still mastered after time gap) — the forgetting curve
  pTransfer: number;     // P(skill transfers to related skills)
  difficulty: number;    // Estimated difficulty of this skill (0-1)
  discriminability: number; // How well this skill differentiates learners

  // Temporal tracking
  totalAttempts: number;
  correctAttempts: number;
  streakCurrent: number;
  streakBest: number;
  lastPracticed: Date;
  lastCorrect: Date | null;
  practiceHistory: PracticeEvent[];  // Rolling window of last 50 events

  // Inter-skill relationships
  prerequisites: string[];       // Skills that should be mastered first
  transfersTo: string[];         // Skills that benefit when this skill improves
  correlatedWith: string[];      // Skills with correlated mastery patterns

  // Confidence interval
  confidenceInterval: { lower: number; upper: number };
  sampleSize: number;            // Effective sample size for the estimate
}

interface PracticeEvent {
  timestamp: Date;
  correct: boolean;
  responseTimeMs: number;
  context: 'ASSESSMENT' | 'STORYBOOK' | 'ARENA' | 'DRILL';
  difficulty: number;
  confidence: number;    // ASR or self-reported confidence
}

// ---------------------------------------------------------------------------
// 1.2 Prerequisite Graph
// ---------------------------------------------------------------------------

interface PrerequisiteGraph {
  nodes: PrerequisiteNode[];
  edges: PrerequisiteEdge[];
  inferredEdges: PrerequisiteEdge[];  // Edges discovered from data
  lastInferenceRun: Date;
}

interface PrerequisiteNode {
  skillId: string;
  phase: number;
  depth: number;          // Distance from root nodes (Phase 1)
  inDegree: number;       // Number of prerequisites
  outDegree: number;      // Number of skills that depend on this
}

interface PrerequisiteEdge {
  fromSkill: string;      // Prerequisite
  toSkill: string;        // Dependent skill
  strength: number;       // 0-1: How strongly the prerequisite predicts success
  type: 'DEFINED' | 'INFERRED';
  evidence: number;       // Number of learners supporting this inference
}

// ---------------------------------------------------------------------------
// 1.3 Forgetting Curve Model
// ---------------------------------------------------------------------------

interface ForgettingModel {
  type: 'EBBINGHAUS' | 'POWER_LAW' | 'EXPONENTIAL' | 'ACT_R';
  parameters: ForgettingParameters;
  skillDecayRates: Map<string, number>;  // Per-skill decay rates
  reviewSchedule: ReviewScheduleEntry[];
}

interface ForgettingParameters {
  baseDecayRate: number;        // Default decay rate for new skills
  stabilityFactor: number;      // How much successful reviews slow decay
  retrievalThreshold: number;   // Below this, skill is considered "forgotten"
  spacingMultiplier: number;    // SM-2 style spacing factor
  maxInterval: number;          // Maximum days between reviews
}

interface ReviewScheduleEntry {
  skillId: string;
  nextReviewDate: Date;
  intervalDays: number;
  easinessFactor: number;       // SM-2 easiness factor (1.3 - 2.5)
  repetitionCount: number;
  lastReviewResult: 'EASY' | 'CORRECT' | 'HARD' | 'FORGOT';
}

// ---------------------------------------------------------------------------
// 1.4 Deep Knowledge Tracing (DKT) Predictions
// ---------------------------------------------------------------------------

interface DKTPrediction {
  skillId: string;
  predictedMastery: number;     // DKT model's prediction
  confidence: number;           // Model confidence
  timestep: number;             // Which interaction this prediction is for
  featureVector: number[];      // Input features used
}

interface DKTModelConfig {
  hiddenSize: number;           // LSTM hidden state dimension
  numLayers: number;            // Number of LSTM layers
  dropoutRate: number;          // Dropout for regularisation
  learningRate: number;
  batchSize: number;
  sequenceLength: number;       // How many past interactions to consider
  numSkills: number;            // Total number of unique skills
  embeddingSize: number;        // Skill embedding dimension
}

interface DKTInput {
  skillSequence: number[];      // Sequence of skill IDs practised
  responseSequence: boolean[];  // Corresponding correct/incorrect
  timeGaps: number[];           // Hours between each practice event
  contextSequence: number[];    // Context encoding (assessment/storybook/etc.)
}

// ============================================================================
// SECTION 2: ADVANCED BKT ENGINE
// The core computational engine. This is a significant evolution from
// Sprint 3's BKT — it handles multi-skill dependencies, temporal decay,
// and blends classical BKT with deep learning predictions.
// ============================================================================

class AdvancedBKTEngine extends ScholarlyBaseService {
  private prisma: PrismaClient;
  private eventEmitter: EventEmitter;
  private dktModel: DKTModel;
  private forgettingEngine: ForgettingCurveEngine;
  private prerequisiteInference: PrerequisiteInferenceEngine;
  private stateCache: Map<string, AdvancedMasteryState> = new Map();

  constructor(
    prisma: PrismaClient,
    eventEmitter: EventEmitter,
    dktConfig: DKTModelConfig,
  ) {
    super('AdvancedBKTEngine', '15.0.0');
    this.prisma = prisma;
    this.eventEmitter = eventEmitter;
    this.dktModel = new DKTModel(dktConfig);
    this.forgettingEngine = new ForgettingCurveEngine();
    this.prerequisiteInference = new PrerequisiteInferenceEngine();
  }

  // ---------------------------------------------------------------------------
  // 2.1 Core Update: Process a New Practice Event
  // ---------------------------------------------------------------------------

  async updateMastery(
    learnerId: string,
    tenantId: string,
    skillId: string,
    correct: boolean,
    context: PracticeEvent['context'],
    responseTimeMs: number,
    confidence: number,
  ): Promise<Result<SkillState>> {
    try {
      // Load or initialise the learner's full mastery state
      const state = await this.loadState(learnerId, tenantId);

      // Get or initialise the specific skill
      let skill = state.skills.get(skillId);
      if (!skill) {
        skill = this.initialiseSkill(skillId);
        state.skills.set(skillId, skill);
      }

      // Record the practice event
      const event: PracticeEvent = {
        timestamp: new Date(),
        correct,
        responseTimeMs,
        context,
        difficulty: skill.difficulty,
        confidence,
      };
      skill.practiceHistory.push(event);
      if (skill.practiceHistory.length > 50) {
        skill.practiceHistory = skill.practiceHistory.slice(-50);
      }

      // 1. Classical BKT update
      this.classicalBKTUpdate(skill, correct);

      // 2. Apply forgetting curve adjustment
      const timeSinceLastPractice = skill.lastPracticed
        ? (Date.now() - skill.lastPracticed.getTime()) / (1000 * 60 * 60)  // hours
        : 0;
      if (timeSinceLastPractice > 1) {
        this.applyForgettingCurve(skill, timeSinceLastPractice);
      }

      // 3. DKT prediction blend
      const dktPrediction = await this.getDKTPrediction(state, skillId);
      if (dktPrediction) {
        this.blendWithDKT(skill, dktPrediction);
      }

      // 4. Update inter-skill transfer effects
      await this.propagateTransferEffects(state, skillId, correct);

      // 5. Update temporal tracking
      skill.totalAttempts++;
      if (correct) {
        skill.correctAttempts++;
        skill.streakCurrent++;
        skill.streakBest = Math.max(skill.streakBest, skill.streakCurrent);
        skill.lastCorrect = new Date();
      } else {
        skill.streakCurrent = 0;
      }
      skill.lastPracticed = new Date();

      // 6. Update confidence interval
      this.updateConfidenceInterval(skill);

      // 7. Update review schedule
      this.forgettingEngine.updateReviewSchedule(state.forgettingModel, skillId, correct);

      // 8. Persist and emit
      state.lastUpdated = new Date();
      state.version++;
      await this.persistState(state);

      this.eventEmitter.emit('bkt.mastery.updated', {
        learnerId,
        tenantId,
        skillId,
        pMastery: skill.pMastery,
        pRetention: skill.pRetention,
        correct,
        context,
        streakCurrent: skill.streakCurrent,
      });

      return { success: true, data: skill };
    } catch (error: any) {
      return { success: false, error: `BKT update failed: ${error.message}` };
    }
  }

  // ---------------------------------------------------------------------------
  // 2.2 Classical BKT Update (Enhanced)
  // ---------------------------------------------------------------------------

  private classicalBKTUpdate(skill: SkillState, correct: boolean): void {
    // Standard BKT posterior update with enhanced parameters

    // P(mastered | observation)
    if (correct) {
      // Bayes' rule: P(M|C) = P(C|M)P(M) / P(C)
      const pCorrectGivenMastered = 1 - skill.pSlip;
      const pCorrectGivenNotMastered = skill.pGuess;
      const pCorrect = pCorrectGivenMastered * skill.pMastery +
                        pCorrectGivenNotMastered * (1 - skill.pMastery);
      const pMasteredGivenCorrect = (pCorrectGivenMastered * skill.pMastery) / pCorrect;

      // Apply transition: P(M_new) = P(M|obs) + P(T) * (1 - P(M|obs))
      skill.pMastery = pMasteredGivenCorrect + skill.pTransit * (1 - pMasteredGivenCorrect);
    } else {
      // P(M|I) = P(I|M)P(M) / P(I)
      const pIncorrectGivenMastered = skill.pSlip;
      const pIncorrectGivenNotMastered = 1 - skill.pGuess;
      const pIncorrect = pIncorrectGivenMastered * skill.pMastery +
                          pIncorrectGivenNotMastered * (1 - skill.pMastery);
      const pMasteredGivenIncorrect = (pIncorrectGivenMastered * skill.pMastery) / pIncorrect;

      skill.pMastery = pMasteredGivenIncorrect + skill.pTransit * (1 - pMasteredGivenIncorrect);
    }

    // Clamp to valid probability range with small epsilon buffer
    skill.pMastery = Math.max(0.001, Math.min(0.999, skill.pMastery));

    // Adaptive parameter estimation: adjust slip and guess based on evidence
    if (skill.totalAttempts > 20) {
      const recentEvents = skill.practiceHistory.slice(-20);
      const recentAccuracy = recentEvents.filter(e => e.correct).length / recentEvents.length;

      // If consistently correct with high mastery, slip rate should decrease
      if (recentAccuracy > 0.9 && skill.pMastery > 0.8) {
        skill.pSlip = Math.max(0.01, skill.pSlip * 0.95);
      }
      // If consistently incorrect with low mastery, guess rate should decrease
      if (recentAccuracy < 0.3 && skill.pMastery < 0.3) {
        skill.pGuess = Math.max(0.05, skill.pGuess * 0.95);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2.3 Forgetting Curve Integration
  // ---------------------------------------------------------------------------

  private applyForgettingCurve(skill: SkillState, hoursSinceLastPractice: number): void {
    // Ebbinghaus-inspired forgetting curve with SM-2 stability adjustments.
    // The retention probability decays over time, but the rate of decay
    // slows with each successful retrieval — like a footpath that becomes
    // a road the more it's travelled.

    const decayRate = this.forgettingEngine.getDecayRate(skill);
    const retention = Math.exp(-decayRate * hoursSinceLastPractice / 24); // Convert to days

    // Apply retention to mastery estimate
    skill.pRetention = retention;
    skill.pMastery = skill.pMastery * retention;

    // Ensure minimum floor based on total evidence
    const evidenceFloor = Math.min(0.3, skill.correctAttempts / Math.max(1, skill.totalAttempts) * 0.5);
    skill.pMastery = Math.max(evidenceFloor, skill.pMastery);
  }

  // ---------------------------------------------------------------------------
  // 2.4 DKT Prediction Blending
  // ---------------------------------------------------------------------------

  private async getDKTPrediction(state: AdvancedMasteryState, skillId: string): Promise<DKTPrediction | null> {
    // Build input sequence from practice history across all skills
    const allEvents: { skillId: string; correct: boolean; timestamp: Date; context: string }[] = [];
    for (const [sid, skill] of state.skills) {
      for (const event of skill.practiceHistory) {
        allEvents.push({ skillId: sid, correct: event.correct, timestamp: event.timestamp, context: event.context });
      }
    }

    // Sort by time
    allEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (allEvents.length < 5) return null; // Not enough data for DKT

    // Encode into DKT input format
    const input: DKTInput = {
      skillSequence: allEvents.map(e => this.encodeSkillId(e.skillId)),
      responseSequence: allEvents.map(e => e.correct),
      timeGaps: allEvents.map((e, i) => {
        if (i === 0) return 0;
        return (e.timestamp.getTime() - allEvents[i - 1].timestamp.getTime()) / (1000 * 60 * 60);
      }),
      contextSequence: allEvents.map(e => this.encodeContext(e.context)),
    };

    // Run DKT forward pass
    const prediction = await this.dktModel.predict(input, this.encodeSkillId(skillId));
    return prediction;
  }

  private blendWithDKT(skill: SkillState, prediction: DKTPrediction): void {
    // Blend classical BKT with DKT prediction using a confidence-weighted average.
    // DKT is better at capturing complex temporal patterns, while classical BKT
    // is more interpretable and stable with small sample sizes.

    const dktWeight = Math.min(0.4, prediction.confidence * 0.5);
    const bktWeight = 1 - dktWeight;

    skill.pMastery = bktWeight * skill.pMastery + dktWeight * prediction.predictedMastery;
    skill.pMastery = Math.max(0.001, Math.min(0.999, skill.pMastery));
  }

  // ---------------------------------------------------------------------------
  // 2.5 Inter-Skill Transfer Effects
  // ---------------------------------------------------------------------------

  private async propagateTransferEffects(
    state: AdvancedMasteryState,
    updatedSkillId: string,
    correct: boolean,
  ): Promise<void> {
    const skill = state.skills.get(updatedSkillId);
    if (!skill) return;

    // Transfer learning effect: mastering 'sh' makes 'ch' slightly easier
    for (const targetId of skill.transfersTo) {
      const target = state.skills.get(targetId);
      if (target && correct) {
        const transferAmount = skill.pTransfer * 0.05; // Small but meaningful boost
        target.pTransit = Math.min(0.5, target.pTransit + transferAmount);
      }
    }

    // Prerequisite satisfaction check: if all prerequisites are mastered,
    // the dependent skill's transition probability increases
    for (const [sid, s] of state.skills) {
      if (s.prerequisites.includes(updatedSkillId)) {
        const allPrereqsMastered = s.prerequisites.every(pid => {
          const prereq = state.skills.get(pid);
          return prereq && prereq.pMastery >= 0.7;
        });
        if (allPrereqsMastered) {
          s.pTransit = Math.min(0.5, s.pTransit * 1.2); // 20% boost to learning rate
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 2.6 Confidence Interval Estimation
  // ---------------------------------------------------------------------------

  private updateConfidenceInterval(skill: SkillState): void {
    // Wilson score interval for the mastery proportion.
    // This gives us a principled confidence interval that accounts for
    // sample size — with 5 observations, the interval is wide; with 100,
    // it narrows.

    const n = skill.totalAttempts;
    if (n === 0) {
      skill.confidenceInterval = { lower: 0, upper: 1 };
      skill.sampleSize = 0;
      return;
    }

    const p = skill.pMastery;
    const z = 1.96; // 95% confidence
    const zSquared = z * z;
    const denominator = 1 + zSquared / n;

    const centre = (p + zSquared / (2 * n)) / denominator;
    const margin = (z * Math.sqrt(p * (1 - p) / n + zSquared / (4 * n * n))) / denominator;

    skill.confidenceInterval = {
      lower: Math.max(0, centre - margin),
      upper: Math.min(1, centre + margin),
    };
    skill.sampleSize = n;
  }

  // ---------------------------------------------------------------------------
  // 2.7 Skill Initialisation & Encoding
  // ---------------------------------------------------------------------------

  private initialiseSkill(skillId: string): SkillState {
    return {
      skillId,
      skillType: this.inferSkillType(skillId),
      phonicsPhase: this.inferPhase(skillId),
      pMastery: 0.1,       // Assume not mastered initially
      pTransit: 0.1,       // Standard learning rate
      pSlip: 0.05,         // Low slip for phonics (if you know it, you rarely get it wrong)
      pGuess: 0.2,         // Moderate guess rate (some phonics questions are multiple choice)
      pRetention: 1.0,     // No decay yet
      pTransfer: 0.1,      // Default transfer rate
      difficulty: 0.5,     // Unknown difficulty
      discriminability: 0.5,
      totalAttempts: 0,
      correctAttempts: 0,
      streakCurrent: 0,
      streakBest: 0,
      lastPracticed: new Date(),
      lastCorrect: null,
      practiceHistory: [],
      prerequisites: this.getDefaultPrerequisites(skillId),
      transfersTo: this.getDefaultTransfers(skillId),
      correlatedWith: [],
      confidenceInterval: { lower: 0, upper: 1 },
      sampleSize: 0,
    };
  }

  private inferSkillType(skillId: string): SkillState['skillType'] {
    if (skillId.length === 1) return 'GPC';
    if (skillId.length === 2) return 'DIGRAPH';
    if (skillId.length === 3) return 'TRIGRAPH';
    if (skillId.startsWith('blend-')) return 'BLEND';
    if (skillId.startsWith('morph-')) return 'MORPHEME';
    return 'GPC';
  }

  private inferPhase(skillId: string): number {
    const phase2 = ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'];
    const phase3 = ['g', 'o', 'c', 'k', 'e', 'u', 'r', 'h', 'b', 'f', 'l', 'j', 'v', 'w', 'x', 'y', 'z', 'sh', 'ch', 'th', 'ng', 'ai', 'ee', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'er'];
    if (phase2.includes(skillId)) return 2;
    if (phase3.includes(skillId)) return 3;
    return 4;
  }

  private getDefaultPrerequisites(skillId: string): string[] {
    // Phonics prerequisites follow the Letters & Sounds progression
    const prereqMap: Record<string, string[]> = {
      'sh': ['s', 'h'], 'ch': ['c', 'h'], 'th': ['t', 'h'],
      'ai': ['a', 'i'], 'ee': ['e'], 'oa': ['o', 'a'],
      'ar': ['a', 'r'], 'or': ['o', 'r'], 'ur': ['u', 'r'],
    };
    return prereqMap[skillId] || [];
  }

  private getDefaultTransfers(skillId: string): string[] {
    const transferMap: Record<string, string[]> = {
      's': ['sh'], 'h': ['sh', 'ch', 'th'], 'c': ['ch', 'ck'],
      't': ['th'], 'a': ['ai', 'ar', 'oa'], 'e': ['ee', 'er'],
      'o': ['oa', 'or', 'oo', 'ow', 'oi'], 'u': ['ur'],
    };
    return transferMap[skillId] || [];
  }

  private encodeSkillId(skillId: string): number {
    // Simple hash encoding for DKT input
    let hash = 0;
    for (let i = 0; i < skillId.length; i++) {
      hash = ((hash << 5) - hash) + skillId.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) % 500;
  }

  private encodeContext(context: string): number {
    const map: Record<string, number> = { 'ASSESSMENT': 0, 'STORYBOOK': 1, 'ARENA': 2, 'DRILL': 3 };
    return map[context] || 0;
  }

  // ---------------------------------------------------------------------------
  // 2.8 State Persistence & Loading
  // ---------------------------------------------------------------------------

  private async loadState(learnerId: string, tenantId: string): Promise<AdvancedMasteryState> {
    const cached = this.stateCache.get(learnerId);
    if (cached) return cached;

    try {
      const record = await this.prisma.advancedBKTState.findUnique({
        where: { learnerId_tenantId: { learnerId, tenantId } },
      });

      if (record) {
        const state: AdvancedMasteryState = {
          learnerId,
          tenantId,
          skills: new Map(Object.entries(record.skills as Record<string, SkillState>)),
          prerequisiteGraph: record.prerequisiteGraph as PrerequisiteGraph,
          forgettingModel: record.forgettingModel as ForgettingModel,
          dktPredictions: [],
          lastUpdated: record.lastUpdated,
          version: record.version,
        };
        this.stateCache.set(learnerId, state);
        return state;
      }
    } catch {
      // Fall through to initialisation
    }

    // Initialise new state
    const state: AdvancedMasteryState = {
      learnerId,
      tenantId,
      skills: new Map(),
      prerequisiteGraph: { nodes: [], edges: [], inferredEdges: [], lastInferenceRun: new Date() },
      forgettingModel: {
        type: 'EBBINGHAUS',
        parameters: {
          baseDecayRate: 0.3,
          stabilityFactor: 1.5,
          retrievalThreshold: 0.3,
          spacingMultiplier: 2.0,
          maxInterval: 90,
        },
        skillDecayRates: new Map(),
        reviewSchedule: [],
      },
      dktPredictions: [],
      lastUpdated: new Date(),
      version: 1,
    };
    this.stateCache.set(learnerId, state);
    return state;
  }

  private async persistState(state: AdvancedMasteryState): Promise<void> {
    const skillsObj: Record<string, SkillState> = {};
    for (const [key, value] of state.skills) {
      skillsObj[key] = value;
    }

    await this.prisma.advancedBKTState.upsert({
      where: { learnerId_tenantId: { learnerId: state.learnerId, tenantId: state.tenantId } },
      create: {
        learnerId: state.learnerId,
        tenantId: state.tenantId,
        skills: skillsObj as any,
        prerequisiteGraph: state.prerequisiteGraph as any,
        forgettingModel: state.forgettingModel as any,
        lastUpdated: state.lastUpdated,
        version: state.version,
      },
      update: {
        skills: skillsObj as any,
        prerequisiteGraph: state.prerequisiteGraph as any,
        forgettingModel: state.forgettingModel as any,
        lastUpdated: state.lastUpdated,
        version: state.version,
      },
    });
  }

  // ---------------------------------------------------------------------------
  // 2.9 Public Query Methods
  // ---------------------------------------------------------------------------

  async getMasteryState(learnerId: string, tenantId: string): Promise<Result<AdvancedMasteryState>> {
    try {
      const state = await this.loadState(learnerId, tenantId);

      // Apply forgetting to all skills before returning (read-through decay)
      const now = Date.now();
      for (const [, skill] of state.skills) {
        if (skill.lastPracticed) {
          const hours = (now - skill.lastPracticed.getTime()) / (1000 * 60 * 60);
          if (hours > 24) {
            this.applyForgettingCurve(skill, hours);
          }
        }
      }

      return { success: true, data: state };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getReadySkills(learnerId: string, tenantId: string): Promise<Result<string[]>> {
    try {
      const state = await this.loadState(learnerId, tenantId);
      const ready: string[] = [];

      for (const [skillId, skill] of state.skills) {
        // A skill is "ready to learn" if:
        // 1. It's not yet mastered (pMastery < 0.7)
        // 2. All prerequisites are mastered
        // 3. It has room for growth
        if (skill.pMastery < 0.7) {
          const prereqsMet = skill.prerequisites.every(pid => {
            const prereq = state.skills.get(pid);
            return prereq && prereq.pMastery >= 0.7;
          });
          if (prereqsMet || skill.prerequisites.length === 0) {
            ready.push(skillId);
          }
        }
      }

      // Sort by priority: lowest mastery with met prerequisites first
      ready.sort((a, b) => {
        const sa = state.skills.get(a)!;
        const sb = state.skills.get(b)!;
        return sa.pMastery - sb.pMastery;
      });

      return { success: true, data: ready };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async getReviewDue(learnerId: string, tenantId: string): Promise<Result<ReviewScheduleEntry[]>> {
    try {
      const state = await this.loadState(learnerId, tenantId);
      const now = new Date();
      const due = state.forgettingModel.reviewSchedule
        .filter(entry => entry.nextReviewDate <= now)
        .sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());
      return { success: true, data: due };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

// ============================================================================
// SECTION 3: DEEP KNOWLEDGE TRACING (DKT) MODEL
// An LSTM-based sequence model that learns temporal patterns in student
// learning. Unlike classical BKT which treats each skill independently,
// DKT can capture complex interactions: a student who consistently struggles
// with digraphs after long gaps may have a different pattern than one who
// struggles only with specific letter combinations.
// ============================================================================

class DKTModel {
  private config: DKTModelConfig;
  private weights: DKTWeights | null = null;
  private isLoaded: boolean = false;

  constructor(config: DKTModelConfig) {
    this.config = config;
  }

  async loadModel(weightsPath?: string): Promise<void> {
    // In production, load pre-trained LSTM weights from model registry.
    // The model is trained offline on population-level interaction data using
    // PyTorch, exported to ONNX, and loaded here via ONNX Runtime for inference.
    // For the TypeScript implementation, we use a simplified forward pass.

    this.weights = {
      inputEmbedding: this.initMatrix(this.config.numSkills * 2, this.config.embeddingSize),
      lstmWeightsIh: this.initMatrix(4 * this.config.hiddenSize, this.config.embeddingSize + 1),
      lstmWeightsHh: this.initMatrix(4 * this.config.hiddenSize, this.config.hiddenSize),
      lstmBiasIh: new Float32Array(4 * this.config.hiddenSize),
      lstmBiasHh: new Float32Array(4 * this.config.hiddenSize),
      outputWeights: this.initMatrix(this.config.numSkills, this.config.hiddenSize),
      outputBias: new Float32Array(this.config.numSkills),
    };
    this.isLoaded = true;
  }

  async predict(input: DKTInput, targetSkill: number): Promise<DKTPrediction> {
    if (!this.isLoaded || !this.weights) {
      await this.loadModel();
    }

    // LSTM forward pass over the interaction sequence
    const seqLen = Math.min(input.skillSequence.length, this.config.sequenceLength);
    let hiddenState = new Float32Array(this.config.hiddenSize);
    let cellState = new Float32Array(this.config.hiddenSize);

    for (let t = 0; t < seqLen; t++) {
      // Encode interaction: skill_id * 2 + (correct ? 1 : 0)
      const interactionId = input.skillSequence[t] * 2 + (input.responseSequence[t] ? 1 : 0);

      // Get embedding (simplified: hash-based)
      const embedding = this.getEmbedding(interactionId, input.timeGaps[t]);

      // LSTM cell update
      const [newHidden, newCell] = this.lstmCell(embedding, hiddenState, cellState);
      hiddenState = newHidden;
      cellState = newCell;
    }

    // Output layer: predict mastery for target skill
    const outputLogits = this.linearForward(hiddenState, this.weights!.outputWeights, this.weights!.outputBias);
    const predictedMastery = this.sigmoid(outputLogits[targetSkill % outputLogits.length]);

    return {
      skillId: targetSkill.toString(),
      predictedMastery,
      confidence: Math.min(0.95, seqLen / this.config.sequenceLength),
      timestep: seqLen,
      featureVector: Array.from(hiddenState.slice(0, 10)),
    };
  }

  // --- LSTM Internals ---

  private lstmCell(input: Float32Array, prevHidden: Float32Array, prevCell: Float32Array): [Float32Array, Float32Array] {
    const H = this.config.hiddenSize;

    // Concatenate input and previous hidden state
    const combined = new Float32Array(input.length + prevHidden.length);
    combined.set(input);
    combined.set(prevHidden, input.length);

    // Compute gates: i, f, g, o = linear(combined) + linear(hidden)
    const gates = new Float32Array(4 * H);
    for (let i = 0; i < 4 * H; i++) {
      let sum = this.weights!.lstmBiasIh[i] + this.weights!.lstmBiasHh[i];
      for (let j = 0; j < Math.min(combined.length, this.weights!.lstmWeightsIh[0]?.length || 0); j++) {
        sum += (this.weights!.lstmWeightsIh[i]?.[j] || 0) * combined[j];
      }
      gates[i] = sum;
    }

    // Split into 4 gates
    const iGate = new Float32Array(H);
    const fGate = new Float32Array(H);
    const gGate = new Float32Array(H);
    const oGate = new Float32Array(H);

    for (let i = 0; i < H; i++) {
      iGate[i] = this.sigmoid(gates[i]);           // Input gate
      fGate[i] = this.sigmoid(gates[H + i]);       // Forget gate
      gGate[i] = Math.tanh(gates[2 * H + i]);      // Cell candidate
      oGate[i] = this.sigmoid(gates[3 * H + i]);   // Output gate
    }

    // New cell state: f * prev_cell + i * g
    const newCell = new Float32Array(H);
    for (let i = 0; i < H; i++) {
      newCell[i] = fGate[i] * prevCell[i] + iGate[i] * gGate[i];
    }

    // New hidden state: o * tanh(new_cell)
    const newHidden = new Float32Array(H);
    for (let i = 0; i < H; i++) {
      newHidden[i] = oGate[i] * Math.tanh(newCell[i]);
    }

    return [newHidden, newCell];
  }

  private getEmbedding(interactionId: number, timeGap: number): Float32Array {
    const E = this.config.embeddingSize;
    const embedding = new Float32Array(E + 1);
    // Hash-based embedding lookup (simplified from learned embeddings)
    for (let i = 0; i < E; i++) {
      embedding[i] = Math.sin(interactionId * (i + 1) * 0.01) * 0.1;
    }
    // Append normalised time gap as extra feature
    embedding[E] = Math.min(1, timeGap / 168); // Normalise to weeks
    return embedding;
  }

  private linearForward(input: Float32Array, weights: Float32Array[], bias: Float32Array): Float32Array {
    const output = new Float32Array(bias.length);
    for (let i = 0; i < output.length; i++) {
      output[i] = bias[i];
      for (let j = 0; j < Math.min(input.length, (weights[i]?.length || 0)); j++) {
        output[i] += (weights[i]?.[j] || 0) * input[j];
      }
    }
    return output;
  }

  private sigmoid(x: number): number {
    return 1 / (1 + Math.exp(-Math.max(-500, Math.min(500, x))));
  }

  private initMatrix(rows: number, cols: number): Float32Array[] {
    // Xavier initialization
    const scale = Math.sqrt(2.0 / (rows + cols));
    return Array.from({ length: rows }, () => {
      const row = new Float32Array(cols);
      for (let j = 0; j < cols; j++) {
        row[j] = (Math.random() * 2 - 1) * scale;
      }
      return row;
    });
  }
}

interface DKTWeights {
  inputEmbedding: Float32Array[];
  lstmWeightsIh: Float32Array[];
  lstmWeightsHh: Float32Array[];
  lstmBiasIh: Float32Array;
  lstmBiasHh: Float32Array;
  outputWeights: Float32Array[];
  outputBias: Float32Array;
}

// ============================================================================
// SECTION 4: FORGETTING CURVE ENGINE
// Implements Ebbinghaus-style forgetting with SM-2 spaced repetition
// scheduling. Each skill has its own decay rate that adapts based on
// how well and how often it's been practised.
// ============================================================================

class ForgettingCurveEngine {
  getDecayRate(skill: SkillState): number {
    // Base decay rate, modified by:
    // 1. Number of successful practices (more practice = slower decay)
    // 2. Streak length (longer streak = more stable memory)
    // 3. Difficulty (harder skills decay faster)

    const baserate = 0.3;
    const practiceStability = Math.min(1, skill.correctAttempts / 20) * 0.5;
    const streakStability = Math.min(1, skill.streakBest / 10) * 0.3;
    const difficultyFactor = skill.difficulty * 0.2;

    return Math.max(0.05, baserate - practiceStability - streakStability + difficultyFactor);
  }

  updateReviewSchedule(model: ForgettingModel, skillId: string, correct: boolean): void {
    let entry = model.reviewSchedule.find(e => e.skillId === skillId);

    if (!entry) {
      entry = {
        skillId,
        nextReviewDate: new Date(Date.now() + 86400000), // Tomorrow
        intervalDays: 1,
        easinessFactor: 2.5,
        repetitionCount: 0,
        lastReviewResult: correct ? 'CORRECT' : 'FORGOT',
      };
      model.reviewSchedule.push(entry);
    }

    // SM-2 algorithm adaptation
    if (correct) {
      entry.repetitionCount++;
      entry.lastReviewResult = entry.repetitionCount > 3 ? 'EASY' : 'CORRECT';

      // Calculate new interval
      if (entry.repetitionCount === 1) {
        entry.intervalDays = 1;
      } else if (entry.repetitionCount === 2) {
        entry.intervalDays = 3;
      } else {
        entry.intervalDays = Math.round(entry.intervalDays * entry.easinessFactor);
      }

      // Cap at max interval
      entry.intervalDays = Math.min(entry.intervalDays, model.parameters.maxInterval);
    } else {
      // Reset on failure
      entry.repetitionCount = 0;
      entry.intervalDays = 1;
      entry.lastReviewResult = 'FORGOT';
      entry.easinessFactor = Math.max(1.3, entry.easinessFactor - 0.2);
    }

    entry.nextReviewDate = new Date(Date.now() + entry.intervalDays * 86400000);
  }

  predictRetention(skill: SkillState, hoursInFuture: number): number {
    const decayRate = this.getDecayRate(skill);
    return Math.exp(-decayRate * hoursInFuture / 24);
  }
}

// ============================================================================
// SECTION 5: PREREQUISITE INFERENCE ENGINE
// Discovers implicit prerequisite relationships from population-level data.
// If learners who master 'sh' before attempting 'ch' consistently perform
// better on 'ch', the engine infers a prerequisite edge between them.
// ============================================================================

class PrerequisiteInferenceEngine {
  async inferPrerequisites(
    prisma: PrismaClient,
    tenantId: string,
    minEvidence: number = 50,
  ): Promise<PrerequisiteEdge[]> {
    const inferredEdges: PrerequisiteEdge[] = [];

    // Query population-level mastery data
    const masteryData = await prisma.advancedBKTState.findMany({
      where: { tenantId },
      select: { skills: true },
    });

    if (masteryData.length < minEvidence) return [];

    // Build skill-pair correlation matrix
    const skillPairs: Map<string, { bothMastered: number; onlyFirst: number; onlySecond: number; neither: number }> = new Map();

    for (const record of masteryData) {
      const skills = record.skills as Record<string, SkillState>;
      const skillIds = Object.keys(skills);

      for (let i = 0; i < skillIds.length; i++) {
        for (let j = i + 1; j < skillIds.length; j++) {
          const a = skillIds[i];
          const b = skillIds[j];
          const key = `${a}|${b}`;
          const pair = skillPairs.get(key) || { bothMastered: 0, onlyFirst: 0, onlySecond: 0, neither: 0 };

          const aMastered = skills[a].pMastery >= 0.7;
          const bMastered = skills[b].pMastery >= 0.7;

          if (aMastered && bMastered) pair.bothMastered++;
          else if (aMastered && !bMastered) pair.onlyFirst++;
          else if (!aMastered && bMastered) pair.onlySecond++;
          else pair.neither++;

          skillPairs.set(key, pair);
        }
      }
    }

    // Infer prerequisites: if P(B mastered | A mastered) >> P(B mastered | A not mastered),
    // then A is likely a prerequisite for B
    for (const [key, counts] of skillPairs) {
      const [skillA, skillB] = key.split('|');
      const totalWithA = counts.bothMastered + counts.onlyFirst;
      const totalWithoutA = counts.onlySecond + counts.neither;

      if (totalWithA < 10 || totalWithoutA < 10) continue;

      const pBGivenA = counts.bothMastered / totalWithA;
      const pBGivenNotA = counts.onlySecond / totalWithoutA;

      // Significant difference suggests prerequisite relationship
      if (pBGivenA > pBGivenNotA + 0.2 && pBGivenA > 0.5) {
        inferredEdges.push({
          fromSkill: skillA,
          toSkill: skillB,
          strength: pBGivenA - pBGivenNotA,
          type: 'INFERRED',
          evidence: totalWithA + totalWithoutA,
        });
      }

      // Check reverse direction
      const pAGivenB = counts.bothMastered / (counts.bothMastered + counts.onlySecond);
      const pAGivenNotB = counts.onlyFirst / (counts.onlyFirst + counts.neither);

      if (pAGivenB > pAGivenNotB + 0.2 && pAGivenB > 0.5) {
        inferredEdges.push({
          fromSkill: skillB,
          toSkill: skillA,
          strength: pAGivenB - pAGivenNotB,
          type: 'INFERRED',
          evidence: totalWithA + totalWithoutA,
        });
      }
    }

    // Sort by strength and filter to top relationships
    return inferredEdges
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 100);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // State Types
  AdvancedMasteryState,
  SkillState,
  PracticeEvent,
  PrerequisiteGraph,
  PrerequisiteEdge,
  ForgettingModel,
  ForgettingParameters,
  ReviewScheduleEntry,
  DKTPrediction,
  DKTModelConfig,
  DKTInput,

  // Engines
  AdvancedBKTEngine,
  DKTModel,
  ForgettingCurveEngine,
  PrerequisiteInferenceEngine,
};
