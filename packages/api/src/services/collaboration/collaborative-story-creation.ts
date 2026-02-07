// =============================================================================
// SCHOLARLY PLATFORM — Sprint 11: S11-003
// Collaborative Story Creation
// =============================================================================
// If the Storybook Engine is a printing press that produces individual stories,
// the Collaborative Story Creation module is a writers' room where multiple
// authors — children, classmates, even their teacher — contribute to a shared
// narrative in real-time. It's the literary equivalent of a jazz ensemble:
// each musician brings their own skills, but the magic happens when they listen
// to each other and build on what came before.
//
// Architecture:
//   SessionManager → TurnEngine → ContributionValidator → NarrativeMerger → ArenaScorer
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: COLLABORATION SESSION TYPES
// =============================================================================

export interface CollaborationSession {
  sessionId: string;
  tenantId: string;
  type: CollaborationType;
  state: CollaborationState;
  participants: Participant[];
  story: CollaborativeStory;
  turnConfig: TurnConfig;
  turnState: TurnState;
  phonicsConstraints: CollaborativePhonicsConstraints;
  arenaContext?: ArenaCollaborationContext;
  timing: SessionTiming;
  channel: ChannelConfig;
  createdAt: Date;
  lastActivityAt: Date;
}

export type CollaborationType =
  | 'classroom' | 'study_group' | 'arena_team'
  | 'student_vs_teacher' | 'parent_child' | 'buddy_reading';

export type CollaborationState =
  | 'LOBBY' | 'BRIEFING' | 'ACTIVE' | 'REVIEWING'
  | 'VOTING' | 'SCORING' | 'COMPLETE' | 'ABANDONED';

export interface Participant {
  userId: string;
  displayName: string;
  role: ParticipantRole;
  phonicsPhase: number;
  relevantMasteryProfile: Record<string, number>;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  contributionCount: number;
  score?: number;
  isActiveTurn: boolean;
  joinedAt: Date;
}

export type ParticipantRole =
  | 'author' | 'illustrator' | 'narrator'
  | 'editor' | 'facilitator' | 'spectator';

export interface SessionTiming {
  lobbyTimeout: number;
  totalTimeLimit: number;
  warningAt: number[];
}

export interface ChannelConfig {
  type: 'websocket' | 'polling';
  fallback: 'polling' | 'none';
  reconnectAttempts: number;
  reconnectInterval: number;
}

// =============================================================================
// SECTION 2: TURN MANAGEMENT
// =============================================================================

export interface TurnConfig {
  mode: TurnMode;
  turnDuration: number;
  minContributionWords: number;
  maxContributionWords: number;
  facilitatorCanSkip: boolean;
  canPass: boolean;
  maxConsecutivePasses: number;
  gracePeriod: number;
  rounds: number;
}

export type TurnMode = 'round_robin' | 'popcorn' | 'free_form';

export interface TurnState {
  currentRound: number;
  activeParticipantIndex: number;
  turnStartedAt: Date | null;
  secondsRemaining: number;
  turnHistory: TurnRecord[];
  participantOrder: string[];
  passedThisRound: Set<string>;
}

export interface TurnRecord {
  participantId: string;
  startedAt: Date;
  endedAt: Date;
  endReason: 'submitted' | 'timeout' | 'passed' | 'skipped';
  contributionId?: string;
  wordCount: number;
}

export const DEFAULT_TURN_CONFIG: TurnConfig = {
  mode: 'round_robin',
  turnDuration: 120,
  minContributionWords: 5,
  maxContributionWords: 50,
  facilitatorCanSkip: true,
  canPass: true,
  maxConsecutivePasses: 2,
  gracePeriod: 15,
  rounds: 3,
};

// =============================================================================
// SECTION 3: COLLABORATIVE STORY STRUCTURE
// =============================================================================

export interface CollaborativeStory {
  storyId: string;
  title: string;
  prompt: StoryPrompt;
  contributions: StoryContribution[];
  totalWordCount: number;
  currentDecodability: number;
  targetDecodability: number;
  status: 'in_progress' | 'review' | 'finalised' | 'published';
  coherenceScore: number;
  themes: string[];
  targetPhase: number;
  illustrationSuggestions: IllustrationSuggestion[];
}

export interface StoryPrompt {
  text: string;
  targetGpcs: string[];
  suggestedCharacters: string[];
  setting: string;
  genre: 'adventure' | 'mystery' | 'comedy' | 'fantasy' | 'everyday' | 'information';
  vocabularyTier: 'tier_1' | 'tier_2' | 'mixed';
  source: 'ai_generated' | 'facilitator_authored' | 'bounty_template';
}

export interface StoryContribution {
  contributionId: string;
  authorId: string;
  authorDisplayName: string;
  text: string;
  wordCount: number;
  decodability: number;
  nonDecodableWords: string[];
  gpcsIntroduced: string[];
  timestamp: Date;
  turnNumber: number;
  roundNumber: number;
  validationStatus: 'valid' | 'revised' | 'rejected';
  revisions: ContributionRevision[];
  reactions: PeerReaction[];
  coherenceAssessment: CoherenceAssessment;
  scoring?: ContributionScore;
}

export interface ContributionRevision {
  originalText: string;
  revisedText: string;
  reason: 'decodability' | 'safety' | 'coherence' | 'self_edit';
  timestamp: Date;
}

export interface PeerReaction {
  userId: string;
  emoji: string;
  timestamp: Date;
}

export interface CoherenceAssessment {
  flowScore: number;
  characterConsistency: boolean;
  plotAdvancement: boolean;
  toneConsistency: number;
  suggestedTransition?: string;
}

export interface IllustrationSuggestion {
  contributionId: string;
  sceneDescription: string;
  artStyle: string;
  suggestedBy: string;
  votes: number;
}

// =============================================================================
// SECTION 4: CONTRIBUTION VALIDATION
// =============================================================================

export interface ContributionValidationResult {
  valid: boolean;
  decodability: DecodabilityCheck;
  safety: SafetyCheck;
  coherence: CoherenceCheck;
  wordAnalysis: WordAnalysisItem[];
  suggestions: WordSuggestion[];
  feedbackMessage: string;
  revisionRequired: boolean;
}

export interface DecodabilityCheck {
  score: number;
  meetsThreshold: boolean;
  nonDecodableWords: string[];
  decodableCount: number;
  totalCount: number;
}

export interface SafetyCheck {
  passed: boolean;
  flags: string[];
  score: number;
}

export interface CoherenceCheck {
  flowScore: number;
  characterConsistency: boolean;
  narrativeSense: boolean;
  suggestions: string[];
}

export interface WordAnalysisItem {
  word: string;
  position: number;
  decodable: boolean;
  gpcDecomposition: string[];
  isTargetGpc: boolean;
  frequencyTier: 'tier_1' | 'tier_2' | 'tier_3';
}

export interface WordSuggestion {
  originalWord: string;
  alternatives: string[];
  reasons: string[];
}

// =============================================================================
// SECTION 5: ARENA SCORING
// =============================================================================

export interface ArenaCollaborationContext {
  matchId: string;
  teamId: string;
  opposingTeamIds: string[];
  format: ArenaCollaborationFormat;
  scoringRubric: CollaborationScoringRubric;
  timeLimit: number;
  aiAssistanceAllowed: boolean;
  handicaps: Record<string, number>;
}

export type ArenaCollaborationFormat =
  | 'team_vs_team' | 'class_vs_class' | 'students_vs_teacher'
  | 'relay_race' | 'quality_match';

export interface CollaborationScoringRubric {
  individualWeights: {
    decodability: number;
    vocabulary: number;
    creativity: number;
    gpcCoverage: number;
  };
  teamWeights: {
    coherence: number;
    characterConsistency: number;
    engagement: number;
    collaborationQuality: number;
  };
  teamVsIndividualBalance: number;
  bonuses: ScoringBonus[];
}

export interface ScoringBonus {
  name: string;
  condition: string;
  multiplier: number;
  conditionType: 'all_participated' | 'no_non_decodable' | 'used_all_target_gpcs' | 'peer_reactions_high' | 'under_time_limit';
}

export const DEFAULT_SCORING_RUBRIC: CollaborationScoringRubric = {
  individualWeights: { decodability: 0.3, vocabulary: 0.2, creativity: 0.3, gpcCoverage: 0.2 },
  teamWeights: { coherence: 0.35, characterConsistency: 0.2, engagement: 0.3, collaborationQuality: 0.15 },
  teamVsIndividualBalance: 0.5,
  bonuses: [
    { name: 'Full Participation', condition: 'Every team member contributed', multiplier: 1.15, conditionType: 'all_participated' },
    { name: 'Perfect Decodability', condition: 'Zero non-decodable words', multiplier: 1.2, conditionType: 'no_non_decodable' },
    { name: 'GPC Sweep', condition: 'Every target GPC appears', multiplier: 1.1, conditionType: 'used_all_target_gpcs' },
    { name: 'Crowd Favourite', condition: 'High peer reactions', multiplier: 1.1, conditionType: 'peer_reactions_high' },
  ],
};

export interface ContributionScore {
  individual: { decodability: number; vocabulary: number; creativity: number; gpcCoverage: number; total: number };
  xpEarned: number;
}

export interface TeamScore {
  teamId: string;
  teamDimensions: { coherence: number; characterConsistency: number; engagement: number; collaborationQuality: number; total: number };
  individualTotal: number;
  combinedScore: number;
  bonusesApplied: string[];
  finalScore: number;
  rank: number;
  totalXpEarned: number;
}

// =============================================================================
// SECTION 6: PHONICS CONSTRAINTS
// =============================================================================

export interface CollaborativePhonicsConstraints {
  targetPhase: number;
  targetGpcs: string[];
  taughtGpcSet: string[];
  minimumDecodability: number;
  vocabularyTier: 'tier_1' | 'tier_2' | 'mixed';
  maxNonDecodablePerContribution: number;
  allowHighFrequencyExceptions: boolean;
  highFrequencyExceptions: string[];
}

export const DEFAULT_PHONICS_CONSTRAINTS: CollaborativePhonicsConstraints = {
  targetPhase: 3,
  targetGpcs: ['ai', 'ee', 'igh', 'oa', 'oo'],
  taughtGpcSet: [],
  minimumDecodability: 0.8,
  vocabularyTier: 'tier_1',
  maxNonDecodablePerContribution: 3,
  allowHighFrequencyExceptions: true,
  highFrequencyExceptions: ['the', 'said', 'was', 'is', 'are', 'were', 'have', 'come', 'some', 'one'],
};

// =============================================================================
// SECTION 7: COLLABORATIVE SESSION SERVICE
// =============================================================================

export class CollaborativeSessionService {
  async createSession(
    tenantId: string,
    type: CollaborationType,
    prompt: StoryPrompt,
    phonicsConstraints: CollaborativePhonicsConstraints,
    turnConfig: TurnConfig = DEFAULT_TURN_CONFIG,
    arenaContext?: ArenaCollaborationContext,
  ): Promise<Result<CollaborationSession>> {
    const sessionId = `collab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session: CollaborationSession = {
      sessionId, tenantId, type, state: 'LOBBY',
      participants: [],
      story: {
        storyId: `story_${sessionId}`, title: '', prompt,
        contributions: [], totalWordCount: 0, currentDecodability: 1.0,
        targetDecodability: phonicsConstraints.minimumDecodability,
        status: 'in_progress', coherenceScore: 1.0,
        themes: [prompt.genre], targetPhase: phonicsConstraints.targetPhase,
        illustrationSuggestions: [],
      },
      turnConfig,
      turnState: {
        currentRound: 0, activeParticipantIndex: -1,
        turnStartedAt: null, secondsRemaining: turnConfig.turnDuration,
        turnHistory: [], participantOrder: [], passedThisRound: new Set(),
      },
      phonicsConstraints, arenaContext,
      timing: { lobbyTimeout: 300, totalTimeLimit: arenaContext?.timeLimit ?? 1200, warningAt: [60, 30, 10] },
      channel: { type: 'websocket', fallback: 'polling', reconnectAttempts: 5, reconnectInterval: 2000 },
      createdAt: new Date(), lastActivityAt: new Date(),
    };
    return { success: true, data: session };
  }

  async addParticipant(
    session: CollaborationSession, userId: string, displayName: string,
    role: ParticipantRole, phonicsPhase: number, masteryProfile: Record<string, number>,
  ): Promise<Result<Participant>> {
    if (session.state !== 'LOBBY') {
      return { success: false, error: { code: 'SESSION_NOT_IN_LOBBY', message: 'Cannot join after session start.' } };
    }
    const participant: Participant = {
      userId, displayName, role, phonicsPhase,
      relevantMasteryProfile: masteryProfile,
      connectionStatus: 'connected', contributionCount: 0,
      isActiveTurn: false, joinedAt: new Date(),
    };
    session.participants.push(participant);
    session.turnState.participantOrder.push(userId);
    return { success: true, data: participant };
  }

  async startSession(session: CollaborationSession): Promise<Result<void>> {
    const authors = session.participants.filter(p => p.role === 'author');
    if (authors.length < 2) {
      return { success: false, error: { code: 'NOT_ENOUGH_AUTHORS', message: 'Need at least 2 authors.' } };
    }
    session.state = 'ACTIVE';
    session.turnState.currentRound = 1;
    session.turnState.activeParticipantIndex = 0;
    session.turnState.turnStartedAt = new Date();
    session.turnState.secondsRemaining = session.turnConfig.turnDuration;
    const firstId = session.turnState.participantOrder[0];
    const first = session.participants.find(p => p.userId === firstId);
    if (first) first.isActiveTurn = true;
    return { success: true, data: undefined };
  }

  async submitContribution(
    session: CollaborationSession, authorId: string, text: string,
  ): Promise<Result<StoryContribution>> {
    const activeId = session.turnState.participantOrder[session.turnState.activeParticipantIndex];
    if (authorId !== activeId && session.turnConfig.mode !== 'free_form') {
      return { success: false, error: { code: 'NOT_YOUR_TURN', message: 'Wait for your turn.' } };
    }
    const words = text.trim().split(/\s+/);
    if (words.length < session.turnConfig.minContributionWords) {
      return { success: false, error: { code: 'TOO_SHORT', message: `Write at least ${session.turnConfig.minContributionWords} words.` } };
    }
    if (words.length > session.turnConfig.maxContributionWords) {
      return { success: false, error: { code: 'TOO_LONG', message: `Maximum ${session.turnConfig.maxContributionWords} words.` } };
    }

    const contribution: StoryContribution = {
      contributionId: `contrib_${Date.now()}`,
      authorId,
      authorDisplayName: session.participants.find(p => p.userId === authorId)?.displayName ?? 'Unknown',
      text: text.trim(), wordCount: words.length,
      decodability: 0, nonDecodableWords: [], gpcsIntroduced: [],
      timestamp: new Date(),
      turnNumber: session.turnState.turnHistory.length + 1,
      roundNumber: session.turnState.currentRound,
      validationStatus: 'valid', revisions: [], reactions: [],
      coherenceAssessment: { flowScore: 0.8, characterConsistency: true, plotAdvancement: true, toneConsistency: 0.85 },
    };

    session.story.contributions.push(contribution);
    session.story.totalWordCount += words.length;
    session.lastActivityAt = new Date();

    const participant = session.participants.find(p => p.userId === authorId);
    if (participant) participant.contributionCount++;

    session.turnState.turnHistory.push({
      participantId: authorId,
      startedAt: session.turnState.turnStartedAt ?? new Date(),
      endedAt: new Date(), endReason: 'submitted',
      contributionId: contribution.contributionId, wordCount: words.length,
    });

    this.advanceTurn(session);
    return { success: true, data: contribution };
  }

  async computeScores(session: CollaborationSession): Promise<Result<TeamScore>> {
    if (!session.arenaContext) {
      return { success: false, error: { code: 'NOT_ARENA', message: 'Scoring only for Arena sessions.' } };
    }
    const rubric = session.arenaContext.scoringRubric;

    // Individual scoring
    let individualTotal = 0;
    for (const contrib of session.story.contributions) {
      const indScore = contrib.decodability * rubric.individualWeights.decodability
        + 0.7 * rubric.individualWeights.vocabulary
        + (contrib.reactions.length / Math.max(session.participants.length - 1, 1)) * rubric.individualWeights.creativity
        + (contrib.gpcsIntroduced.length / Math.max(session.phonicsConstraints.targetGpcs.length, 1)) * rubric.individualWeights.gpcCoverage;
      contrib.scoring = {
        individual: {
          decodability: contrib.decodability * rubric.individualWeights.decodability,
          vocabulary: 0.7 * rubric.individualWeights.vocabulary,
          creativity: (contrib.reactions.length / Math.max(session.participants.length - 1, 1)) * rubric.individualWeights.creativity,
          gpcCoverage: (contrib.gpcsIntroduced.length / Math.max(session.phonicsConstraints.targetGpcs.length, 1)) * rubric.individualWeights.gpcCoverage,
          total: indScore,
        },
        xpEarned: Math.round(indScore * 100),
      };
      individualTotal += indScore;
    }
    individualTotal = session.story.contributions.length > 0 ? individualTotal / session.story.contributions.length : 0;

    // Team scoring
    const teamDims = {
      coherence: session.story.coherenceScore * rubric.teamWeights.coherence,
      characterConsistency: 0.8 * rubric.teamWeights.characterConsistency,
      engagement: Math.min(1, session.story.totalWordCount / 200) * rubric.teamWeights.engagement,
      collaborationQuality: this.computeCollaborationQuality(session) * rubric.teamWeights.collaborationQuality,
      total: 0,
    };
    teamDims.total = teamDims.coherence + teamDims.characterConsistency + teamDims.engagement + teamDims.collaborationQuality;

    const combined = individualTotal * (1 - rubric.teamVsIndividualBalance) + teamDims.total * rubric.teamVsIndividualBalance;

    // Bonuses
    const bonusesApplied: string[] = [];
    let multiplier = 1.0;
    for (const bonus of rubric.bonuses) {
      if (this.checkBonus(bonus, session)) {
        bonusesApplied.push(bonus.name);
        multiplier *= bonus.multiplier;
      }
    }

    const finalScore = combined * multiplier;
    const totalXp = Math.round(finalScore * 500);

    return {
      success: true,
      data: {
        teamId: session.arenaContext.teamId,
        teamDimensions: teamDims,
        individualTotal,
        combinedScore: combined,
        bonusesApplied,
        finalScore,
        rank: 0, // Set by Arena match coordinator
        totalXpEarned: totalXp,
      },
    };
  }

  private advanceTurn(session: CollaborationSession): void {
    const currentId = session.turnState.participantOrder[session.turnState.activeParticipantIndex];
    const current = session.participants.find(p => p.userId === currentId);
    if (current) current.isActiveTurn = false;

    const authors = session.turnState.participantOrder.filter(id =>
      session.participants.find(p => p.userId === id && p.role === 'author')
    );
    const currentIdx = authors.indexOf(currentId);
    const nextIdx = (currentIdx + 1) % authors.length;

    if (nextIdx === 0) {
      session.turnState.currentRound++;
      session.turnState.passedThisRound.clear();
      if (session.turnConfig.rounds > 0 && session.turnState.currentRound > session.turnConfig.rounds) {
        session.state = 'REVIEWING';
        return;
      }
    }

    const nextId = authors[nextIdx];
    session.turnState.activeParticipantIndex = session.turnState.participantOrder.indexOf(nextId);
    session.turnState.turnStartedAt = new Date();
    session.turnState.secondsRemaining = session.turnConfig.turnDuration;
    const next = session.participants.find(p => p.userId === nextId);
    if (next) next.isActiveTurn = true;
  }

  private computeCollaborationQuality(session: CollaborationSession): number {
    const authors = session.participants.filter(p => p.role === 'author');
    if (authors.length === 0) return 0;
    const contributed = authors.filter(a => a.contributionCount > 0).length;
    const participationRate = contributed / authors.length;
    const counts = authors.map(a => a.contributionCount);
    const maxCount = Math.max(...counts);
    const minCount = Math.min(...counts);
    const evenness = maxCount > 0 ? minCount / maxCount : 1;
    return (participationRate * 0.6 + evenness * 0.4);
  }

  private checkBonus(bonus: ScoringBonus, session: CollaborationSession): boolean {
    switch (bonus.conditionType) {
      case 'all_participated':
        return session.participants.filter(p => p.role === 'author').every(p => p.contributionCount > 0);
      case 'no_non_decodable':
        return session.story.contributions.every(c => c.nonDecodableWords.length === 0);
      case 'used_all_target_gpcs': {
        const allGpcs = new Set(session.story.contributions.flatMap(c => c.gpcsIntroduced));
        return session.phonicsConstraints.targetGpcs.every(g => allGpcs.has(g));
      }
      case 'peer_reactions_high': {
        const totalReactions = session.story.contributions.reduce((s, c) => s + c.reactions.length, 0);
        const avgReactions = session.story.contributions.length > 0 ? totalReactions / session.story.contributions.length : 0;
        return avgReactions >= 3;
      }
      default:
        return false;
    }
  }
}

// =============================================================================
// SECTION 8: NATS EVENTS
// =============================================================================

export const COLLABORATION_EVENTS = {
  SESSION_CREATED: 'scholarly.collab.session_created',
  PARTICIPANT_JOINED: 'scholarly.collab.participant_joined',
  SESSION_STARTED: 'scholarly.collab.session_started',
  TURN_STARTED: 'scholarly.collab.turn_started',
  CONTRIBUTION_SUBMITTED: 'scholarly.collab.contribution_submitted',
  CONTRIBUTION_VALIDATED: 'scholarly.collab.contribution_validated',
  PEER_REACTION: 'scholarly.collab.peer_reaction',
  ROUND_COMPLETED: 'scholarly.collab.round_completed',
  SESSION_REVIEWING: 'scholarly.collab.session_reviewing',
  SCORES_COMPUTED: 'scholarly.collab.scores_computed',
  SESSION_COMPLETED: 'scholarly.collab.session_completed',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================
export {
  CollaborativeSessionService,
  DEFAULT_TURN_CONFIG,
  DEFAULT_SCORING_RUBRIC,
  DEFAULT_PHONICS_CONSTRAINTS,
  COLLABORATION_EVENTS,
};
