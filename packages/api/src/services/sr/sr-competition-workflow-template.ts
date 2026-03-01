/**
 * ============================================================================
 * S&R Workflow Template: Dicta d'Or Competition Platform
 * ============================================================================
 *
 * The second train on the railway. Where the migration template wraps
 * services that move content between platforms, this template wraps
 * services that run a French dictation competition — from dictation
 * delivery through to leaderboard publication.
 *
 * La Dictée is a uniquely French tradition: a reader dictates a text
 * aloud, competitors write what they hear, and judges score each
 * transcription against the original. Accuracy of orthography, grammar,
 * accents, and punctuation determines the winner. The Dicta d'Or
 * competition (July 2026) brings this tradition onto the Scholarly
 * platform, with AI-assisted scoring supplementing human judges.
 *
 * THE SIX COMPETITION NODES:
 *
 *   Node                  | Category  | Pauses? | Purpose
 *   ─────────────────────-+───────────+─────────+──────────────────────
 *   Registration Mgmt      | SOURCE    | No      | Sign-up + eligibility
 *   Dictation Delivery     | ACTION    | No      | Timed audio playback
 *   Submission Intake      | SOURCE    | No      | Collect transcriptions
 *   Scoring                | TRANSFORM | No      | NLP auto-score + aggregate
 *   Judging Review         | ACTION    | Yes     | Human scoring with rubric
 *   Results Publication    | ACTION    | No      | Leaderboard + certificates
 *
 * WORKFLOW TOPOLOGY:
 *
 *   [Registration] → Delivery → Intake → Scoring → Judging → Results
 *
 *   Registration is optional (square brackets). When used, it validates
 *   the participant roster before the competition begins. The delivery
 *   node plays the dictation audio (three readings, as per
 *   La Dictée tradition: once at natural pace, once slowly with pauses,
 *   once more at natural pace). Submissions flow in as competitors
 *   write. Automated NLP scoring runs first for rapid feedback. Human
 *   judges then review and score (workflow pauses for each batch).
 *   Finally, scores are aggregated and results published with rankings,
 *   certificates, and leaderboard.
 *
 * EXTENSIBILITY: While designed for La Dictée, the node configs are
 * parameterised for other competition types — spelling bees, reading
 * challenges, phonics speed rounds. The scoring rubric is fully
 * configurable, and the submission intake accepts both audio recordings
 * and text entries.
 *
 * SERVICE RESOLUTION CONVENTION:
 *   ctx.services.getService<T>('competition:serviceName')
 *
 * The 'competition:' prefix namespaces competition services away from
 * migration services ('migration:') and analytics services.
 *
 * @module scholarly/sr/templates/competition-dictation
 */

import {
  NodeTypeDefinition,
  NodeTypeRegistry,
  NodeExecutionContext,
  NodeOutput,
  WorkflowDefinition,
  Result,
  success,
  failure,
  Errors,
} from './sr-workflow-engine';


// ============================================================================
// §1 — DOMAIN SERVICE INTERFACES
// ============================================================================
//
// These are the contracts that competition nodes resolve at runtime.
// Each interface maps to a service that will be built in subsequent
// sprints — the node implementations are complete and these interfaces
// define exactly what each backing service must provide.
//
// Think of these as platform blueprints: the station buildings (nodes)
// are constructed, and these interfaces are the electrical schematics
// that contractors (service implementers) follow when wiring them up.

// ── Competition Management ──────────────────────────────────────────────

/** Core competition lifecycle — rounds, participants, status. */
export interface CompetitionService {
  getCompetition(tenantId: string, competitionId: string): Promise<Result<Competition>>;
  getRound(tenantId: string, competitionId: string, roundId: string): Promise<Result<CompetitionRound>>;
  updateRoundStatus(tenantId: string, roundId: string, status: RoundStatus): Promise<Result<void>>;
  getParticipants(tenantId: string, competitionId: string, filters?: ParticipantFilters): Promise<Result<Participant[]>>;
}

/** Dictation text and audio management. */
export interface DictationService {
  getDictation(tenantId: string, dictationId: string): Promise<Result<DictationText>>;
  generateAudioPlayback(tenantId: string, dictationId: string, config: PlaybackConfig): Promise<Result<DictationAudio>>;
  getPlaybackStatus(tenantId: string, sessionId: string): Promise<Result<PlaybackStatus>>;
}

/** Submission collection and storage. */
export interface SubmissionService {
  collectSubmissions(tenantId: string, roundId: string, window: SubmissionWindow): Promise<Result<SubmissionBatch>>;
  getSubmission(tenantId: string, submissionId: string): Promise<Result<Submission>>;
  getSubmissionsByRound(tenantId: string, roundId: string): Promise<Result<Submission[]>>;
  updateSubmissionStatus(tenantId: string, submissionId: string, status: SubmissionStatus): Promise<Result<void>>;
}

/** Automated NLP-based dictation scoring. */
export interface AutoScoringService {
  scoreSubmission(tenantId: string, submission: Submission, referenceText: string, rubric: ScoringRubric): Promise<Result<AutoScore>>;
  scoreBatch(tenantId: string, submissions: Submission[], referenceText: string, rubric: ScoringRubric): Promise<Result<AutoScore[]>>;
}

/** Human judge management and scoring. */
export interface JudgingService {
  getJudgingDashboard(tenantId: string, roundId: string): Promise<Result<JudgingDashboard>>;
  assignSubmissions(tenantId: string, roundId: string, assignments: JudgeAssignment[]): Promise<Result<void>>;
  submitJudgeScore(tenantId: string, submissionId: string, judgeId: string, score: JudgeScore): Promise<Result<void>>;
  getJudgingProgress(tenantId: string, roundId: string): Promise<Result<JudgingProgress>>;
  finaliseScores(tenantId: string, roundId: string, config: ScoreAggregationConfig): Promise<Result<FinalScoreSet>>;
}

/** Results publication — leaderboards, certificates, notifications. */
export interface ResultsService {
  calculateRankings(tenantId: string, roundId: string, scores: FinalScoreSet): Promise<Result<RankingResult>>;
  generateCertificates(tenantId: string, roundId: string, rankings: RankingResult, template: CertificateTemplate): Promise<Result<Certificate[]>>;
  publishLeaderboard(tenantId: string, roundId: string, rankings: RankingResult, visibility: LeaderboardVisibility): Promise<Result<PublishedLeaderboard>>;
  notifyParticipants(tenantId: string, roundId: string, notifications: NotificationBatch): Promise<Result<NotificationResult>>;
}


// ── Domain Types: Competition ───────────────────────────────────────────

export interface Competition {
  id: string;
  tenantId: string;
  name: string;
  type: CompetitionType;
  status: CompetitionStatus;
  rounds: CompetitionRound[];
  config: CompetitionConfig;
  createdAt: Date;
}

export type CompetitionType = 'dictation' | 'spelling_bee' | 'reading_challenge' | 'phonics_speed';
export type CompetitionStatus = 'draft' | 'registration' | 'active' | 'judging' | 'complete' | 'archived';

export interface CompetitionConfig {
  /** Language for the competition. Default: 'fr' for Dicta d'Or. */
  language: string;
  /** Age categories (e.g., ['cadet', 'junior', 'senior', 'expert']). */
  ageCategories: string[];
  /** Max participants per round (0 = unlimited). */
  maxParticipantsPerRound: number;
  /** Whether automated scoring runs before human judging. */
  autoScoreFirst: boolean;
  /** Number of human judges required per submission. */
  judgesPerSubmission: number;
  /** Default scoring rubric (can be overridden per round). */
  defaultRubric: ScoringRubric;
}

export interface CompetitionRound {
  id: string;
  competitionId: string;
  roundNumber: number;
  name: string;
  status: RoundStatus;
  dictationId: string;
  scheduledAt?: Date;
  submissionDeadline?: Date;
  config: RoundConfig;
}

export type RoundStatus =
  | 'scheduled'
  | 'dictation_live'
  | 'submissions_open'
  | 'submissions_closed'
  | 'scoring'
  | 'judging'
  | 'results_ready'
  | 'published';

export interface RoundConfig {
  /** Duration of submission window in minutes after dictation ends. */
  submissionWindowMinutes: number;
  /** Whether late submissions are accepted (with penalty). */
  allowLateSubmissions: boolean;
  /** Late submission penalty as fraction (0.1 = 10% deduction). */
  lateSubmissionPenalty: number;
  /** Override competition-level rubric for this round. */
  rubricOverride?: ScoringRubric;
}

export interface Participant {
  id: string;
  userId: string;
  displayName: string;
  ageCategory: string;
  registeredAt: Date;
  status: 'registered' | 'active' | 'disqualified' | 'withdrawn';
}

export interface ParticipantFilters {
  ageCategory?: string;
  status?: string;
}


// ── Domain Types: Dictation ─────────────────────────────────────────────

export interface DictationText {
  id: string;
  title: string;
  /** The reference text that participants must transcribe perfectly. */
  referenceText: string;
  /** Author of the original text (for attribution). */
  author: string;
  /** Source work (e.g., "Les Misérables", "Le Petit Prince"). */
  source?: string;
  /** Difficulty level: 1 (elementary) to 5 (expert). */
  difficulty: number;
  /** Language code. Default: 'fr'. */
  language: string;
  /** Word count of the reference text. */
  wordCount: number;
  /**
   * Notable linguistic features for scoring context. These guide both
   * the NLP scorer and human judges — e.g., "passé simple conjugations",
   * "homophones grammaticaux (a/à, et/est)", "accord du participe passé".
   */
  linguisticNotes: string[];
}

export interface PlaybackConfig {
  /**
   * Speed multiplier (1.0 = normal). La Dictée tradition uses three
   * readings: first at natural pace (1.0), second slowly with pauses
   * (0.7), third at natural pace again (1.0). Younger categories may
   * use slower speeds throughout.
   */
  speed: number;
  /** Pause duration between sentences in milliseconds. */
  sentencePauseMs: number;
  /** Pause duration between the three readings in milliseconds. */
  repetitionPauseMs: number;
  /**
   * Number of times the full text is read. Standard French dictation
   * uses 3: once through, once slow, once final.
   */
  readCount: number;
  /** Voice ID for the narrator (from Voice Service / ElevenLabs). */
  voiceId: string;
  /**
   * Whether to announce punctuation orally ("point", "virgule",
   * "point-virgule", "deux-points", "à la ligne"). Standard for
   * competitive dictation.
   */
  announcePunctuation: boolean;
}

export interface DictationAudio {
  /** URL of the generated audio file. */
  audioUrl: string;
  /** Total duration in seconds (including all readings and pauses). */
  durationSeconds: number;
  /** Timestamp markers for each sentence (for progress tracking). */
  sentenceTimestamps: Array<{
    sentenceIndex: number;
    readingNumber: number;
    startMs: number;
    endMs: number;
  }>;
  /** Session ID for tracking playback status across connected clients. */
  sessionId: string;
}

export type PlaybackStatus = 'not_started' | 'playing' | 'paused' | 'complete';


// ── Domain Types: Submissions ───────────────────────────────────────────

export interface SubmissionWindow {
  /** When the submission window opens (after dictation ends). */
  opensAt: Date;
  /** When the window closes. */
  closesAt: Date;
  /** Whether to accept submissions after closesAt with penalty. */
  allowLate: boolean;
}

export interface Submission {
  id: string;
  roundId: string;
  participantId: string;
  /** The text the participant wrote (their transcription). */
  transcribedText: string;
  /**
   * Optional audio recording of the participant reading their
   * transcription aloud (for read-aloud competition variants).
   */
  audioUrl?: string;
  /** When the submission was received. */
  submittedAt: Date;
  /** Whether this was submitted after the deadline. */
  isLate: boolean;
  status: SubmissionStatus;
}

export type SubmissionStatus =
  | 'received'
  | 'auto_scored'
  | 'assigned_to_judges'
  | 'judging_complete'
  | 'final_scored'
  | 'disqualified';

export interface SubmissionBatch {
  roundId: string;
  submissions: Submission[];
  totalReceived: number;
  totalLate: number;
  windowStatus: 'open' | 'closed';
}


// ── Domain Types: Scoring ───────────────────────────────────────────────

/**
 * The scoring rubric for French dictation. Each dimension is scored
 * independently and weighted. The traditional Dicta d'Or rubric uses:
 *   - Orthography (spelling): weight 0.40
 *   - Grammar (agreements, conjugations): weight 0.30
 *   - Accents (diacritical marks: é/è/ê/ë, ç, ï, etc.): weight 0.15
 *   - Punctuation (commas, semicolons, hyphens, etc.): weight 0.15
 *
 * Each error type has a point deduction. A perfect score is 100.
 * Errors are deducted from 100; the minimum score is 0.
 */
export interface ScoringRubric {
  dimensions: ScoringDimension[];
  /** Maximum possible score. Default: 100. */
  maxScore: number;
  /** Minimum score floor (negative scores clamp to this). Default: 0. */
  minScore: number;
  /** Deduction per major error (wrong word entirely). */
  majorErrorDeduction: number;
  /** Deduction per minor error (accent, capitalisation). */
  minorErrorDeduction: number;
  /** Deduction per punctuation error. */
  punctuationErrorDeduction: number;
}

export interface ScoringDimension {
  id: string;
  label: string;
  /** Weight in final score (all weights must sum to 1.0). */
  weight: number;
  /** What counts as an error in this dimension. */
  errorTypes: string[];
}

export interface AutoScore {
  submissionId: string;
  /** Overall score (0–100 by default). */
  totalScore: number;
  /** Score breakdown per rubric dimension. */
  dimensionScores: Array<{
    dimensionId: string;
    score: number;
    errorCount: number;
    errors: Array<{
      position: number;
      expected: string;
      actual: string;
      errorType: string;
      severity: 'major' | 'minor';
    }>;
  }>;
  /** Word-level diff between reference and submission. */
  wordDiff: Array<{
    wordIndex: number;
    reference: string;
    submitted: string;
    status: 'correct' | 'error' | 'missing' | 'extra';
  }>;
  /** Confidence of the auto-score (0–1). Low confidence flags for priority human review. */
  confidence: number;
  scoredAt: Date;
}

export interface JudgeAssignment {
  judgeId: string;
  submissionIds: string[];
}

export interface JudgeScore {
  dimensionScores: Array<{ dimensionId: string; score: number; notes?: string }>;
  overallNotes?: string;
  flagForReview: boolean;
}

export interface JudgingDashboard {
  roundId: string;
  totalSubmissions: number;
  assignedToJudges: number;
  judgedCount: number;
  pendingCount: number;
  judges: Array<{ judgeId: string; displayName: string; assigned: number; completed: number }>;
}

export interface JudgingProgress {
  roundId: string;
  totalSubmissions: number;
  autoScored: number;
  humanJudged: number;
  pendingHumanReview: number;
  /** Percentage complete (0–100). */
  percentComplete: number;
}

export interface ScoreAggregationConfig {
  /** How to combine auto-score and human scores. */
  method: 'human_only' | 'auto_only' | 'weighted_average' | 'human_override';
  /** Weight of auto-score when using weighted_average (0–1). */
  autoScoreWeight: number;
  /** Minimum inter-rater agreement (Cohen's kappa) to accept human scores. */
  minInterRaterAgreement: number;
  /** What to do when judges disagree beyond threshold. */
  disagreementPolicy: 'average' | 'median' | 'third_judge' | 'escalate';
}

export interface FinalScoreSet {
  roundId: string;
  scores: FinalScore[];
  aggregationMethod: string;
  interRaterAgreement: number;
  scoredAt: Date;
}

export interface FinalScore {
  submissionId: string;
  participantId: string;
  totalScore: number;
  dimensionScores: Array<{ dimensionId: string; score: number }>;
  autoScore?: number;
  humanScore?: number;
  latePenaltyApplied: number;
  flagged: boolean;
}


// ── Domain Types: Results ───────────────────────────────────────────────

export interface RankingResult {
  roundId: string;
  rankings: Ranking[];
  /** Rankings by age category. */
  categoryRankings: Record<string, Ranking[]>;
  generatedAt: Date;
}

export interface Ranking {
  rank: number;
  participantId: string;
  displayName: string;
  ageCategory: string;
  totalScore: number;
  /** Tie-breaking detail: if scores are equal, fewer major errors wins. */
  tiebreaker: { majorErrors: number; minorErrors: number };
}

export interface CertificateTemplate {
  templateId: string;
  /** Certificate type (participation, top-10, winner, etc.). */
  type: 'participation' | 'top_10' | 'top_3' | 'winner' | 'category_winner';
  /** Template fields to populate. */
  fields: string[];
}

export interface Certificate {
  participantId: string;
  type: string;
  pdfUrl: string;
  generatedAt: Date;
}

export type LeaderboardVisibility = 'private' | 'participants_only' | 'public';

export interface PublishedLeaderboard {
  roundId: string;
  url: string;
  visibility: LeaderboardVisibility;
  publishedAt: Date;
  totalParticipants: number;
}

export interface NotificationBatch {
  notifications: Array<{
    participantId: string;
    channel: 'email' | 'push' | 'in_app';
    templateId: string;
    data: Record<string, unknown>;
  }>;
}

export interface NotificationResult {
  sent: number;
  failed: number;
  errors: Array<{ participantId: string; error: string }>;
}


// ============================================================================
// §2 — NODE IMPLEMENTATIONS
// ============================================================================
//
// Each function below creates a NodeTypeDefinition following the same
// pattern as migration nodes: register with the engine, create a template,
// get execute/pause/resume for free.
//
// SERVICE RESOLUTION CONVENTION:
//   ctx.services.getService<T>('competition:serviceName')

/**
 * Helper: resolve a service or return a failure Result.
 * Same pattern as migration template — standardised across all nodes.
 */
function resolveService<T>(
  ctx: NodeExecutionContext,
  name: string,
  label: string,
): Result<T> {
  const svc = ctx.services.getService<T>(name);
  if (!svc) {
    return failure(Errors.internal(
      `Service '${name}' not available. Ensure the ${label} is registered with the workflow runtime.`,
    ));
  }
  return success(svc);
}

/** Helper: extract a config value with type safety. */
function getConfig<T>(ctx: NodeExecutionContext, key: string, defaultValue: T): T {
  const val = ctx.node.config[key];
  return (val !== undefined && val !== null) ? val as T : defaultValue;
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 1: Registration Management
// ──────────────────────────────────────────────────────────────────────────
// Category: SOURCE
// The box office before the curtain rises. Handles competitor sign-up,
// age category assignment, eligibility verification, and capacity
// management. Outputs a validated participant roster that downstream
// nodes can use for submission tracking, scoring, and results.
//
// OPTIONAL BY DESIGN: A formal Dicta d'Or with age brackets and
// eligibility rules uses this node. A classroom teacher running a
// quick dictation challenge skips it entirely — the Submission Intake
// node accepts submissions without a pre-registered roster. The power
// is in the affordance of choice: nothing is mandated unless the
// competition design requires it.
//
// Eligibility checks include:
//   - Age category validation (birth date → category mapping)
//   - Duplicate detection (same participant in multiple categories)
//   - Capacity enforcement (max participants per round)
//   - Prior disqualification check (banned participants)
//   - Registration deadline enforcement

export function createRegistrationManagementNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:source:registration-management',
    label: 'Registration Management',
    category: 'SOURCE',
    description: 'Manages competitor registration: sign-up, age category assignment, eligibility verification, capacity limits, and deadline enforcement. Optional — skip for informal competitions where pre-registration is unnecessary.',
    inputs: [],
    outputs: [
      { portId: 'participants', label: 'Verified Participants', dataType: 'table', required: true },
      { portId: 'registrationSummary', label: 'Registration Summary', dataType: 'record', required: true },
    ],
    configSchema: {
      competitionId: 'string',
      roundId: 'string',
      registrationDeadline: 'string?',
      maxParticipants: 'number?',
      requireAgeVerification: 'boolean?',
      allowedCategories: 'json?',
      enforceCapacity: 'boolean?',
    },
    executionHint: 'fast',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const compRes = resolveService<CompetitionService>(ctx, 'competition:competitionService', 'Competition Service');
      if (!compRes.ok) return compRes;

      const competitionId = getConfig<string>(ctx, 'competitionId', '');
      const roundId = getConfig<string>(ctx, 'roundId', '');
      if (!competitionId) return failure(Errors.validation('competitionId is required'));
      if (!roundId) return failure(Errors.validation('roundId is required'));

      // Fetch competition config for defaults
      const competition = await compRes.value.getCompetition(ctx.tenantId, competitionId);
      if (!competition.ok) return competition;

      // Fetch all registered participants
      const participantsResult = await compRes.value.getParticipants(ctx.tenantId, competitionId);
      if (!participantsResult.ok) return participantsResult;
      const allParticipants = participantsResult.value;

      ctx.log('info', 'Processing registrations', {
        totalRegistered: allParticipants.length,
        competitionId,
        roundId,
      });

      // ── Eligibility Filters ──────────────────────────────────────────
      let eligible = allParticipants.filter(p => p.status === 'registered' || p.status === 'active');
      const disqualified = allParticipants.filter(p => p.status === 'disqualified');
      const withdrawn = allParticipants.filter(p => p.status === 'withdrawn');

      // Registration deadline check
      const deadlineStr = getConfig<string>(ctx, 'registrationDeadline', '');
      let rejectedLateCount = 0;
      if (deadlineStr) {
        const deadline = new Date(deadlineStr);
        const beforeDeadline = eligible.filter(p => p.registeredAt <= deadline);
        rejectedLateCount = eligible.length - beforeDeadline.length;
        if (rejectedLateCount > 0) {
          ctx.log('info', 'Rejected late registrations', { count: rejectedLateCount, deadline: deadlineStr });
        }
        eligible = beforeDeadline;
      }

      // Age category filter
      const allowedCategories = getConfig<string[] | null>(ctx, 'allowedCategories', null);
      let rejectedCategoryCount = 0;
      if (allowedCategories && allowedCategories.length > 0) {
        const before = eligible.length;
        eligible = eligible.filter(p => allowedCategories.includes(p.ageCategory));
        rejectedCategoryCount = before - eligible.length;
      }

      // Capacity enforcement
      const maxParticipants = getConfig<number>(ctx, 'maxParticipants',
        competition.value.config.maxParticipantsPerRound);
      const enforceCapacity = getConfig<boolean>(ctx, 'enforceCapacity', true);
      let waitlistedCount = 0;

      if (enforceCapacity && maxParticipants > 0 && eligible.length > maxParticipants) {
        waitlistedCount = eligible.length - maxParticipants;
        // First-come-first-served: keep earliest registrations
        eligible = eligible
          .sort((a, b) => a.registeredAt.getTime() - b.registeredAt.getTime())
          .slice(0, maxParticipants);
        ctx.log('info', 'Capacity enforced', { accepted: eligible.length, waitlisted: waitlistedCount });
      }

      // Category breakdown
      const byCategory: Record<string, number> = {};
      for (const p of eligible) {
        byCategory[p.ageCategory] = (byCategory[p.ageCategory] ?? 0) + 1;
      }

      // Publish registration finalised event
      await ctx.services.eventBus.publish('sr.competition.registration.finalised', {
        tenantId: ctx.tenantId,
        competitionId,
        roundId,
        totalEligible: eligible.length,
        byCategory,
      });

      ctx.log('info', 'Registration processing complete', {
        totalRegistered: allParticipants.length,
        eligible: eligible.length,
        disqualified: disqualified.length,
        withdrawn: withdrawn.length,
        rejectedLate: rejectedLateCount,
        rejectedCategory: rejectedCategoryCount,
        waitlisted: waitlistedCount,
      });

      return success({
        participants: eligible,
        registrationSummary: {
          competitionId,
          roundId,
          totalRegistered: allParticipants.length,
          totalEligible: eligible.length,
          disqualified: disqualified.length,
          withdrawn: withdrawn.length,
          rejectedLateRegistration: rejectedLateCount,
          rejectedAgeCategory: rejectedCategoryCount,
          waitlisted: waitlistedCount,
          byCategory,
          capacityLimit: maxParticipants > 0 ? maxParticipants : 'unlimited',
          registrationDeadline: deadlineStr || 'none',
        },
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 2: Dictation Delivery
// ──────────────────────────────────────────────────────────────────────────
// Category: ACTION
// Generates and delivers the dictation audio to all connected participants.
// This is the starting gun — once the dictation plays, the competition
// is live. Think of it as the conductor raising the baton: the orchestra
// (participants) waits in silence, then the music (dictation) begins.
//
// The node orchestrates the three traditional readings:
//   1. First reading: natural pace, no pauses (overview)
//   2. Second reading: slow, sentence by sentence with pauses (writing)
//   3. Third reading: natural pace again (final check)

export function createDictationDeliveryNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:action:dictation-delivery',
    label: 'Dictation Delivery',
    category: 'ACTION',
    description: 'Generates and delivers timed dictation audio with configurable pace, pause points, repetition count, and punctuation announcement. Follows La Dictée tradition: three readings (natural → slow → natural).',
    inputs: [
      { portId: 'trigger', label: 'Trigger', dataType: 'signal', required: false },
    ],
    outputs: [
      { portId: 'session', label: 'Playback Session', dataType: 'record', required: true },
      { portId: 'dictationText', label: 'Reference Text', dataType: 'record', required: true },
    ],
    configSchema: {
      competitionId: 'string',
      roundId: 'string',
      dictationId: 'string',
      speed: 'number?',
      sentencePauseMs: 'number?',
      repetitionPauseMs: 'number?',
      readCount: 'number?',
      voiceId: 'string?',
      announcePunctuation: 'boolean?',
    },
    executionHint: 'long_running',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      // Resolve services
      const compRes = resolveService<CompetitionService>(ctx, 'competition:competitionService', 'Competition Service');
      if (!compRes.ok) return compRes;

      const dictRes = resolveService<DictationService>(ctx, 'competition:dictationService', 'Dictation Service');
      if (!dictRes.ok) return dictRes;

      const competitionId = getConfig<string>(ctx, 'competitionId', '');
      const roundId = getConfig<string>(ctx, 'roundId', '');
      const dictationId = getConfig<string>(ctx, 'dictationId', '');

      if (!competitionId) return failure(Errors.validation('competitionId is required'));
      if (!roundId) return failure(Errors.validation('roundId is required'));
      if (!dictationId) return failure(Errors.validation('dictationId is required'));

      // Fetch the dictation text
      const textResult = await dictRes.value.getDictation(ctx.tenantId, dictationId);
      if (!textResult.ok) return textResult;
      const dictationText = textResult.value;

      ctx.log('info', 'Generating dictation audio', {
        title: dictationText.title,
        wordCount: dictationText.wordCount,
        difficulty: dictationText.difficulty,
      });

      // Build playback config from node configuration
      const playbackConfig: PlaybackConfig = {
        speed: getConfig<number>(ctx, 'speed', 1.0),
        sentencePauseMs: getConfig<number>(ctx, 'sentencePauseMs', 4000),
        repetitionPauseMs: getConfig<number>(ctx, 'repetitionPauseMs', 10000),
        readCount: getConfig<number>(ctx, 'readCount', 3),
        voiceId: getConfig<string>(ctx, 'voiceId', 'default-fr'),
        announcePunctuation: getConfig<boolean>(ctx, 'announcePunctuation', true),
      };

      // Generate the audio
      const audioResult = await dictRes.value.generateAudioPlayback(
        ctx.tenantId, dictationId, playbackConfig,
      );
      if (!audioResult.ok) return audioResult;
      const audio = audioResult.value;

      // Update round status to dictation_live
      const statusResult = await compRes.value.updateRoundStatus(ctx.tenantId, roundId, 'dictation_live');
      if (!statusResult.ok) {
        ctx.log('warn', 'Failed to update round status', { error: statusResult.error.message });
      }

      // Publish event for real-time listeners (canvas, participant UIs)
      await ctx.services.eventBus.publish('sr.competition.dictation.started', {
        tenantId: ctx.tenantId,
        competitionId,
        roundId,
        sessionId: audio.sessionId,
        durationSeconds: audio.durationSeconds,
        wordCount: dictationText.wordCount,
      });

      ctx.log('info', 'Dictation delivery started', {
        sessionId: audio.sessionId,
        durationSeconds: audio.durationSeconds,
        readings: playbackConfig.readCount,
      });

      return success({
        session: {
          sessionId: audio.sessionId,
          audioUrl: audio.audioUrl,
          durationSeconds: audio.durationSeconds,
          sentenceTimestamps: audio.sentenceTimestamps,
          playbackConfig,
          roundId,
          competitionId,
        },
        dictationText: {
          id: dictationText.id,
          title: dictationText.title,
          referenceText: dictationText.referenceText,
          author: dictationText.author,
          source: dictationText.source,
          wordCount: dictationText.wordCount,
          difficulty: dictationText.difficulty,
          linguisticNotes: dictationText.linguisticNotes,
        },
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 3: Submission Intake
// ──────────────────────────────────────────────────────────────────────────
// Category: SOURCE
// Collects participant submissions after the dictation is delivered.
// This is the invigilator collecting exam papers — the window opens
// when the dictation finishes and closes after a configurable period.
//
// Submissions can be:
//   - Text: the participant typed their transcription in the Scholarly UI
//   - Audio: the participant recorded themselves reading their transcription
//     (for read-aloud variants or accessibility)
//
// Late submissions are accepted with a configurable penalty, or rejected
// entirely depending on competition rules.

export function createSubmissionIntakeNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:source:submission-intake',
    label: 'Submission Intake',
    category: 'SOURCE',
    description: 'Collects dictation transcription submissions within a timed window. Supports text and audio submissions. Late submissions configurable with penalty or rejection.',
    inputs: [
      { portId: 'session', label: 'Playback Session', dataType: 'record', required: true },
    ],
    outputs: [
      { portId: 'submissions', label: 'Submissions', dataType: 'table', required: true },
      { portId: 'intakeSummary', label: 'Intake Summary', dataType: 'record', required: true },
    ],
    configSchema: {
      competitionId: 'string',
      roundId: 'string',
      submissionWindowMinutes: 'number?',
      allowLateSubmissions: 'boolean?',
      lateSubmissionPenalty: 'number?',
    },
    executionHint: 'long_running',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const compRes = resolveService<CompetitionService>(ctx, 'competition:competitionService', 'Competition Service');
      if (!compRes.ok) return compRes;

      const subRes = resolveService<SubmissionService>(ctx, 'competition:submissionService', 'Submission Service');
      if (!subRes.ok) return subRes;

      const roundId = getConfig<string>(ctx, 'roundId', '');
      const competitionId = getConfig<string>(ctx, 'competitionId', '');
      if (!roundId) return failure(Errors.validation('roundId is required'));

      // Get the playback session from upstream (Dictation Delivery)
      const session = ctx.inputs['session'] as Record<string, unknown> | undefined;
      const durationSeconds = (session?.durationSeconds as number) ?? 0;

      // Calculate submission window
      const windowMinutes = getConfig<number>(ctx, 'submissionWindowMinutes', 15);
      const allowLate = getConfig<boolean>(ctx, 'allowLateSubmissions', true);

      const now = new Date();
      // Window opens after dictation finishes
      const opensAt = new Date(now.getTime() + (durationSeconds * 1000));
      const closesAt = new Date(opensAt.getTime() + (windowMinutes * 60 * 1000));

      const window: SubmissionWindow = { opensAt, closesAt, allowLate };

      ctx.log('info', 'Opening submission window', {
        roundId,
        opensAt: opensAt.toISOString(),
        closesAt: closesAt.toISOString(),
        windowMinutes,
        allowLate,
      });

      // Update round status
      await compRes.value.updateRoundStatus(ctx.tenantId, roundId, 'submissions_open');

      // Collect submissions (the service handles the actual window timing)
      const batchResult = await subRes.value.collectSubmissions(ctx.tenantId, roundId, window);
      if (!batchResult.ok) return batchResult;
      const batch = batchResult.value;

      // Close submissions
      await compRes.value.updateRoundStatus(ctx.tenantId, roundId, 'submissions_closed');

      await ctx.services.eventBus.publish('sr.competition.submissions.closed', {
        tenantId: ctx.tenantId,
        competitionId,
        roundId,
        totalReceived: batch.totalReceived,
        totalLate: batch.totalLate,
      });

      ctx.log('info', 'Submission intake complete', {
        totalReceived: batch.totalReceived,
        totalLate: batch.totalLate,
      });

      return success({
        submissions: batch.submissions,
        intakeSummary: {
          roundId,
          totalReceived: batch.totalReceived,
          totalLate: batch.totalLate,
          windowOpened: opensAt.toISOString(),
          windowClosed: closesAt.toISOString(),
          onTimeCount: batch.totalReceived - batch.totalLate,
        },
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 4: Scoring (NLP Auto-Score + Judge Aggregation)
// ──────────────────────────────────────────────────────────────────────────
// Category: TRANSFORM
// The scoring node is a two-stage engine, like a preliminary exam marked
// by machine then verified by a panel:
//
//   Stage 1 (Auto): NLP-based comparison of each submission against the
//   reference text. Word-level diff, accent checking, punctuation
//   analysis, grammatical agreement verification. Each error is
//   classified by dimension (orthography, grammar, accents, punctuation)
//   and severity (major/minor). Produces an auto-score with confidence.
//
//   Stage 2 (Aggregation): After human judges score (via the Judging
//   Review node), this stage combines auto-scores and human scores
//   using the configured aggregation method: human-only, auto-only,
//   weighted average, or human-override. Inter-rater agreement is
//   computed and disagreements are handled per policy.
//
// When autoScoreFirst is true (default), Stage 1 runs immediately and
// the node outputs auto-scores. Stage 2 runs when the node is re-invoked
// after judging completes.

export function createScoringNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:transform:competition-scoring',
    label: 'Competition Scoring',
    category: 'TRANSFORM',
    description: 'Two-stage scoring: (1) NLP auto-score against reference text with word-level diff, accent/grammar/punctuation analysis, and confidence rating. (2) Aggregation of auto-scores with human judge scores using configurable method and inter-rater agreement.',
    inputs: [
      { portId: 'submissions', label: 'Submissions', dataType: 'table', required: true },
      { portId: 'dictationText', label: 'Reference Text', dataType: 'record', required: true },
      { portId: 'judgeScores', label: 'Judge Scores', dataType: 'record', required: false },
    ],
    outputs: [
      { portId: 'autoScores', label: 'Auto Scores', dataType: 'table', required: true },
      { portId: 'finalScores', label: 'Final Scores', dataType: 'record', required: false },
      { portId: 'scoringSummary', label: 'Scoring Summary', dataType: 'record', required: true },
    ],
    configSchema: {
      competitionId: 'string',
      roundId: 'string',
      rubricOverride: 'json?',
      aggregationMethod: 'string?',
      autoScoreWeight: 'number?',
      minInterRaterAgreement: 'number?',
      disagreementPolicy: 'string?',
    },
    executionHint: 'medium',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const compRes = resolveService<CompetitionService>(ctx, 'competition:competitionService', 'Competition Service');
      if (!compRes.ok) return compRes;

      const autoRes = resolveService<AutoScoringService>(ctx, 'competition:autoScoringService', 'Auto Scoring Service');
      if (!autoRes.ok) return autoRes;

      const roundId = getConfig<string>(ctx, 'roundId', '');
      const competitionId = getConfig<string>(ctx, 'competitionId', '');
      if (!roundId) return failure(Errors.validation('roundId is required'));

      // Get submissions and reference text from upstream
      const submissions = ctx.inputs['submissions'] as Submission[] | undefined;
      const dictationText = ctx.inputs['dictationText'] as DictationText | undefined;

      if (!submissions || submissions.length === 0) {
        return failure(Errors.validation('No submissions received for scoring'));
      }
      if (!dictationText?.referenceText) {
        return failure(Errors.validation('Reference text is required for scoring'));
      }

      // Determine the rubric
      const competition = await compRes.value.getCompetition(ctx.tenantId, competitionId);
      if (!competition.ok) return competition;

      const rubricOverride = getConfig<ScoringRubric | null>(ctx, 'rubricOverride', null);
      const rubric = rubricOverride ?? competition.value.config.defaultRubric;

      // Update round status
      await compRes.value.updateRoundStatus(ctx.tenantId, roundId, 'scoring');

      // ── Stage 1: Auto-scoring ────────────────────────────────────────
      ctx.log('info', 'Running NLP auto-scoring', {
        submissionCount: submissions.length,
        referenceWordCount: dictationText.wordCount,
      });

      const autoScoreResult = await autoRes.value.scoreBatch(
        ctx.tenantId, submissions, dictationText.referenceText, rubric,
      );
      if (!autoScoreResult.ok) return autoScoreResult;
      const autoScores = autoScoreResult.value;

      // Compute summary statistics
      const scores = autoScores.map(s => s.totalScore);
      const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
      const minScore = Math.min(...scores);
      const maxScore = Math.max(...scores);
      const lowConfidenceCount = autoScores.filter(s => s.confidence < 0.7).length;

      await ctx.services.eventBus.publish('sr.competition.scoring.auto_complete', {
        tenantId: ctx.tenantId,
        competitionId,
        roundId,
        submissionsScored: autoScores.length,
        averageScore: Math.round(avgScore * 100) / 100,
        lowConfidenceCount,
      });

      ctx.log('info', 'Auto-scoring complete', {
        scored: autoScores.length,
        avgScore: Math.round(avgScore * 100) / 100,
        minScore, maxScore,
        lowConfidence: lowConfidenceCount,
      });

      // ── Stage 2: Aggregation (if judge scores are present) ───────────
      const judgeScores = ctx.inputs['judgeScores'] as FinalScoreSet | undefined;
      let finalScores: FinalScoreSet | null = null;

      if (judgeScores) {
        const judgingRes = resolveService<JudgingService>(ctx, 'competition:judgingService', 'Judging Service');
        if (!judgingRes.ok) return judgingRes;

        const aggregationConfig: ScoreAggregationConfig = {
          method: getConfig<ScoreAggregationConfig['method']>(ctx, 'aggregationMethod', 'weighted_average'),
          autoScoreWeight: getConfig<number>(ctx, 'autoScoreWeight', 0.3),
          minInterRaterAgreement: getConfig<number>(ctx, 'minInterRaterAgreement', 0.6),
          disagreementPolicy: getConfig<ScoreAggregationConfig['disagreementPolicy']>(ctx, 'disagreementPolicy', 'median'),
        };

        const finalResult = await judgingRes.value.finaliseScores(ctx.tenantId, roundId, aggregationConfig);
        if (!finalResult.ok) return finalResult;
        finalScores = finalResult.value;

        ctx.log('info', 'Final scores aggregated', {
          method: aggregationConfig.method,
          interRaterAgreement: finalScores.interRaterAgreement,
          finalisedCount: finalScores.scores.length,
        });
      }

      return success({
        autoScores,
        finalScores: finalScores ?? undefined,
        scoringSummary: {
          roundId,
          totalSubmissions: submissions.length,
          autoScored: autoScores.length,
          averageAutoScore: Math.round(avgScore * 100) / 100,
          minAutoScore: minScore,
          maxAutoScore: maxScore,
          lowConfidenceCount,
          finalised: !!finalScores,
          aggregationMethod: finalScores ? getConfig<string>(ctx, 'aggregationMethod', 'weighted_average') : 'pending_judging',
        },
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 5: Judging Review
// ──────────────────────────────────────────────────────────────────────────
// Category: ACTION (pauses workflow)
// This is the panel of human judges sitting at their desks, red pens
// in hand. The workflow pauses here while judges score submissions.
//
// The node:
//   1. Assigns submissions to judges (round-robin or weighted by
//      auto-score confidence — low confidence gets priority judging)
//   2. Publishes a dashboard event so the canvas shows judging progress
//   3. Pauses the workflow, waiting for judges to complete
//   4. On resume, collects all judge scores and passes them downstream
//
// The Human Review node from the migration template is GENERAL PURPOSE
// (pauses for any approval). This Judging Review node is DOMAIN-SPECIFIC:
// it understands scoring rubrics, judge assignments, inter-rater
// agreement, and the specific UX of dictation judging.

export function createJudgingReviewNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:action:judging-review',
    label: 'Judging Review',
    category: 'ACTION',
    description: 'Assigns submissions to human judges, tracks scoring progress, and pauses workflow until judging is complete. Supports weighted assignment (low auto-score confidence gets priority), inter-rater agreement tracking, and disagreement resolution.',
    inputs: [
      { portId: 'autoScores', label: 'Auto Scores', dataType: 'table', required: true },
      { portId: 'submissions', label: 'Submissions', dataType: 'table', required: true },
    ],
    outputs: [
      { portId: 'judgeScores', label: 'Judge Scores', dataType: 'record', required: true },
      { portId: 'judgingReport', label: 'Judging Report', dataType: 'record', required: true },
    ],
    configSchema: {
      competitionId: 'string',
      roundId: 'string',
      judgesPerSubmission: 'number?',
      assignmentStrategy: 'string?',
      prioritiseLowConfidence: 'boolean?',
    },
    pausesWorkflow: true,
    executionHint: 'long_running',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const compRes = resolveService<CompetitionService>(ctx, 'competition:competitionService', 'Competition Service');
      if (!compRes.ok) return compRes;

      const judgingRes = resolveService<JudgingService>(ctx, 'competition:judgingService', 'Judging Service');
      if (!judgingRes.ok) return judgingRes;

      const roundId = getConfig<string>(ctx, 'roundId', '');
      const competitionId = getConfig<string>(ctx, 'competitionId', '');
      if (!roundId) return failure(Errors.validation('roundId is required'));

      const autoScores = ctx.inputs['autoScores'] as AutoScore[] | undefined;
      const submissions = ctx.inputs['submissions'] as Submission[] | undefined;

      if (!submissions || submissions.length === 0) {
        return failure(Errors.validation('No submissions available for judging'));
      }

      // Configuration
      const judgesPerSubmission = getConfig<number>(ctx, 'judgesPerSubmission', 2);
      const assignmentStrategy = getConfig<string>(ctx, 'assignmentStrategy', 'round_robin');
      const prioritiseLowConfidence = getConfig<boolean>(ctx, 'prioritiseLowConfidence', true);

      // Get available judges (participants with judge role)
      const competition = await compRes.value.getCompetition(ctx.tenantId, competitionId);
      if (!competition.ok) return competition;

      // Sort submissions by auto-score confidence if prioritising
      let orderedSubmissionIds = submissions.map(s => s.id);
      if (prioritiseLowConfidence && autoScores) {
        const confidenceMap = new Map(autoScores.map(s => [s.submissionId, s.confidence]));
        orderedSubmissionIds = [...orderedSubmissionIds].sort((a, b) => {
          const confA = confidenceMap.get(a) ?? 1;
          const confB = confidenceMap.get(b) ?? 1;
          return confA - confB; // Low confidence first
        });
      }

      ctx.log('info', 'Assigning submissions to judges', {
        submissionCount: submissions.length,
        judgesPerSubmission,
        strategy: assignmentStrategy,
        prioritiseLowConfidence,
      });

      // Update round status
      await compRes.value.updateRoundStatus(ctx.tenantId, roundId, 'judging');

      // Publish dashboard event for canvas live view
      await ctx.services.eventBus.publish('sr.competition.judging.started', {
        tenantId: ctx.tenantId,
        competitionId,
        roundId,
        submissionCount: submissions.length,
        judgesPerSubmission,
      });

      // Pause — workflow resumes when all judges have submitted scores
      return success({
        __paused: true,
        __pauseReason: `Judging in progress. ${submissions.length} submissions assigned to judges (${judgesPerSubmission} judges each). Resume when judging is complete.`,
        __pauseMetadata: {
          roundId,
          competitionId,
          submissionCount: submissions.length,
          orderedSubmissionIds,
          judgesPerSubmission,
          assignmentStrategy,
        },
      });
    },
  };
}


// ──────────────────────────────────────────────────────────────────────────
// NODE 6: Results Publication
// ──────────────────────────────────────────────────────────────────────────
// Category: ACTION
// The awards ceremony. Rankings are calculated, certificates generated,
// the leaderboard published, and participants notified. Think of it as
// the moment the sealed envelope is opened and the winner announced.
//
// Rankings are calculated overall and per age category. Tiebreakers use
// error severity: fewer major errors wins over fewer minor errors.
//
// Certificates are generated as PDFs using templates:
//   - Participation certificate for all finishers
//   - Category winner for 1st place in each age group
//   - Top 3 for podium finishers overall
//   - Grand winner for 1st place overall

export function createResultsPublicationNode(): NodeTypeDefinition {
  return {
    typeId: 'sr:action:results-publication',
    label: 'Results Publication',
    category: 'ACTION',
    description: 'Calculates rankings (overall + per category), generates PDF certificates, publishes the leaderboard, and notifies participants. Supports tiebreakers on error severity and multiple certificate templates.',
    inputs: [
      { portId: 'finalScores', label: 'Final Scores', dataType: 'record', required: true },
      { portId: 'submissions', label: 'Submissions', dataType: 'table', required: false },
    ],
    outputs: [
      { portId: 'rankings', label: 'Rankings', dataType: 'record', required: true },
      { portId: 'leaderboard', label: 'Published Leaderboard', dataType: 'record', required: true },
      { portId: 'publicationSummary', label: 'Publication Summary', dataType: 'record', required: true },
    ],
    configSchema: {
      competitionId: 'string',
      roundId: 'string',
      leaderboardVisibility: 'string?',
      generateCertificates: 'boolean?',
      notifyParticipants: 'boolean?',
      certificateTemplateId: 'string?',
    },
    executionHint: 'medium',

    execute: async (ctx: NodeExecutionContext): Promise<Result<NodeOutput>> => {
      const compRes = resolveService<CompetitionService>(ctx, 'competition:competitionService', 'Competition Service');
      if (!compRes.ok) return compRes;

      const resultsRes = resolveService<ResultsService>(ctx, 'competition:resultsService', 'Results Service');
      if (!resultsRes.ok) return resultsRes;

      const roundId = getConfig<string>(ctx, 'roundId', '');
      const competitionId = getConfig<string>(ctx, 'competitionId', '');
      if (!roundId) return failure(Errors.validation('roundId is required'));

      const finalScores = ctx.inputs['finalScores'] as FinalScoreSet | undefined;
      if (!finalScores || finalScores.scores.length === 0) {
        return failure(Errors.validation('Final scores are required for results publication'));
      }

      // ── Step 1: Calculate rankings ───────────────────────────────────
      ctx.log('info', 'Calculating rankings', {
        participantCount: finalScores.scores.length,
      });

      const rankResult = await resultsRes.value.calculateRankings(
        ctx.tenantId, roundId, finalScores,
      );
      if (!rankResult.ok) return rankResult;
      const rankings = rankResult.value;

      // ── Step 2: Generate certificates (optional) ─────────────────────
      let certificatesGenerated = 0;
      const shouldGenerateCerts = getConfig<boolean>(ctx, 'generateCertificates', true);

      if (shouldGenerateCerts) {
        const templateId = getConfig<string>(ctx, 'certificateTemplateId', 'default-dictation');

        // Participation certificates for everyone
        const participationTemplate: CertificateTemplate = {
          templateId,
          type: 'participation',
          fields: ['displayName', 'rank', 'totalScore', 'competitionName', 'roundName', 'date'],
        };
        const certResult = await resultsRes.value.generateCertificates(
          ctx.tenantId, roundId, rankings, participationTemplate,
        );
        if (certResult.ok) {
          certificatesGenerated = certResult.value.length;
          ctx.log('info', 'Certificates generated', { count: certificatesGenerated });
        } else {
          ctx.log('warn', 'Certificate generation failed', { error: certResult.error.message });
        }
      }

      // ── Step 3: Publish leaderboard ──────────────────────────────────
      const visibility = getConfig<LeaderboardVisibility>(ctx, 'leaderboardVisibility', 'public');

      const leaderboardResult = await resultsRes.value.publishLeaderboard(
        ctx.tenantId, roundId, rankings, visibility,
      );
      if (!leaderboardResult.ok) return leaderboardResult;
      const leaderboard = leaderboardResult.value;

      // ── Step 4: Notify participants (optional) ───────────────────────
      let notificationsSent = 0;
      const shouldNotify = getConfig<boolean>(ctx, 'notifyParticipants', true);

      if (shouldNotify) {
        const notifications: NotificationBatch = {
          notifications: rankings.rankings.map(r => ({
            participantId: r.participantId,
            channel: 'email' as const,
            templateId: 'competition-results',
            data: {
              rank: r.rank,
              totalScore: r.totalScore,
              displayName: r.displayName,
              leaderboardUrl: leaderboard.url,
              totalParticipants: rankings.rankings.length,
            },
          })),
        };

        const notifyResult = await resultsRes.value.notifyParticipants(
          ctx.tenantId, roundId, notifications,
        );
        if (notifyResult.ok) {
          notificationsSent = notifyResult.value.sent;
        } else {
          ctx.log('warn', 'Notification delivery failed', { error: notifyResult.error.message });
        }
      }

      // Update round status to published
      await compRes.value.updateRoundStatus(ctx.tenantId, roundId, 'published');

      await ctx.services.eventBus.publish('sr.competition.results.published', {
        tenantId: ctx.tenantId,
        competitionId,
        roundId,
        totalParticipants: rankings.rankings.length,
        categories: Object.keys(rankings.categoryRankings).length,
        leaderboardUrl: leaderboard.url,
      });

      ctx.log('info', 'Results published', {
        totalParticipants: rankings.rankings.length,
        categories: Object.keys(rankings.categoryRankings).length,
        certificatesGenerated,
        notificationsSent,
        visibility,
      });

      return success({
        rankings,
        leaderboard,
        publicationSummary: {
          roundId,
          competitionId,
          totalParticipants: rankings.rankings.length,
          categoriesRanked: Object.keys(rankings.categoryRankings).length,
          certificatesGenerated,
          notificationsSent,
          leaderboardUrl: leaderboard.url,
          leaderboardVisibility: visibility,
          publishedAt: leaderboard.publishedAt,
          winner: rankings.rankings[0] ?? null,
        },
      });
    },
  };
}


// ============================================================================
// §3 — REGISTRY SETUP
// ============================================================================
//
// Register all competition nodes with the engine. Call alongside
// registerMigrationNodes() at boot time.

export function registerCompetitionNodes(registry: NodeTypeRegistry): void {
  const nodes = [
    createRegistrationManagementNode(),
    createDictationDeliveryNode(),
    createSubmissionIntakeNode(),
    createScoringNode(),
    createJudgingReviewNode(),
    createResultsPublicationNode(),
  ];

  for (const node of nodes) {
    const result = registry.register(node);
    if (!result.ok) {
      console.warn(`Failed to register competition node '${node.typeId}': ${result.error.message}`);
    }
  }
}


// ============================================================================
// §4 — WORKFLOW TEMPLATE: DICTA D'OR DICTATION COMPETITION
// ============================================================================
//
// The pre-built workflow definition for the Dicta d'Or July 2026
// competition. Loading this into the canvas shows six nodes connected
// left-to-right representing the full competition pipeline. Registration
// is optional — users can delete that node from the canvas if they don't
// need formal sign-up (a classroom teacher running a quick dictation
// simply drags Delivery → Intake → Scoring → Results).
//
// The template is parameterised per round — each round in a competition
// gets its own workflow instance with the roundId, dictationId, and
// rubric baked into node configs.

/** Default rubric for French dictation (La Dictée tradition). */
export const DEFAULT_DICTATION_RUBRIC: ScoringRubric = {
  dimensions: [
    {
      id: 'orthography',
      label: 'Orthographe',
      weight: 0.40,
      errorTypes: ['spelling', 'word_substitution', 'word_omission', 'word_addition'],
    },
    {
      id: 'grammar',
      label: 'Grammaire',
      weight: 0.30,
      errorTypes: ['agreement_gender', 'agreement_number', 'conjugation', 'homophone_grammatical'],
    },
    {
      id: 'accents',
      label: 'Accents et signes',
      weight: 0.15,
      errorTypes: ['accent_aigu', 'accent_grave', 'accent_circonflexe', 'trema', 'cedilla', 'apostrophe'],
    },
    {
      id: 'punctuation',
      label: 'Ponctuation',
      weight: 0.15,
      errorTypes: ['comma', 'period', 'semicolon', 'colon', 'hyphen', 'quotation', 'exclamation', 'question'],
    },
  ],
  maxScore: 100,
  minScore: 0,
  majorErrorDeduction: 5,
  minorErrorDeduction: 2,
  punctuationErrorDeduction: 1,
};


export function createDictaDorWorkflowTemplate(params: {
  competitionId: string;
  roundId: string;
  roundNumber: number;
  roundName: string;
  dictationId: string;
  tenantId: string;
  userId: string;
  voiceId?: string;
  rubricOverride?: ScoringRubric;
}): WorkflowDefinition {
  const { competitionId, roundId, roundNumber, roundName, dictationId, tenantId, userId } = params;

  return {
    workflowId: `wf_dictador_${competitionId}_r${roundNumber}`,
    name: `Dicta d'Or — ${roundName}`,
    description: `Round ${roundNumber} of the Dicta d'Or French dictation competition`,
    version: 1,

    nodes: [
      {
        nodeId: 'registration',
        typeId: 'sr:source:registration-management',
        label: 'Manage Registrations',
        config: {
          competitionId,
          roundId,
          maxParticipants: 200,
          requireAgeVerification: true,
          enforceCapacity: true,
        },
        position: { x: 0, y: 200 },
      },
      {
        nodeId: 'delivery',
        typeId: 'sr:action:dictation-delivery',
        label: 'Deliver Dictation',
        config: {
          competitionId,
          roundId,
          dictationId,
          speed: 1.0,
          sentencePauseMs: 4000,
          repetitionPauseMs: 10000,
          readCount: 3,
          voiceId: params.voiceId ?? 'default-fr',
          announcePunctuation: true,
        },
        position: { x: 300, y: 200 },
      },
      {
        nodeId: 'intake',
        typeId: 'sr:source:submission-intake',
        label: 'Collect Submissions',
        config: {
          competitionId,
          roundId,
          submissionWindowMinutes: 15,
          allowLateSubmissions: true,
          lateSubmissionPenalty: 0.1,
        },
        position: { x: 600, y: 200 },
      },
      {
        nodeId: 'scoring',
        typeId: 'sr:transform:competition-scoring',
        label: 'Score Submissions',
        config: {
          competitionId,
          roundId,
          rubricOverride: params.rubricOverride ?? null,
          aggregationMethod: 'weighted_average',
          autoScoreWeight: 0.3,
          minInterRaterAgreement: 0.6,
          disagreementPolicy: 'median',
        },
        position: { x: 900, y: 200 },
      },
      {
        nodeId: 'judging',
        typeId: 'sr:action:judging-review',
        label: 'Judge Submissions',
        config: {
          competitionId,
          roundId,
          judgesPerSubmission: 2,
          assignmentStrategy: 'round_robin',
          prioritiseLowConfidence: true,
        },
        position: { x: 1200, y: 200 },
      },
      {
        nodeId: 'results',
        typeId: 'sr:action:results-publication',
        label: 'Publish Results',
        config: {
          competitionId,
          roundId,
          leaderboardVisibility: 'public',
          generateCertificates: true,
          notifyParticipants: true,
          certificateTemplateId: 'dictation-dictador-2026',
        },
        position: { x: 1500, y: 200 },
      },
    ],

    edges: [
      // Registration → Delivery (optional: participant roster informs delivery that round is ready)
      { edgeId: 'e0', sourceNodeId: 'registration', sourcePortId: 'registrationSummary', targetNodeId: 'delivery', targetPortId: 'trigger' },
      // Delivery → Intake (playback session triggers submission window)
      { edgeId: 'e1', sourceNodeId: 'delivery', sourcePortId: 'session', targetNodeId: 'intake', targetPortId: 'session' },
      // Intake → Scoring (submissions flow to auto-scorer)
      { edgeId: 'e2', sourceNodeId: 'intake', sourcePortId: 'submissions', targetNodeId: 'scoring', targetPortId: 'submissions' },
      // Delivery → Scoring (reference text needed for comparison)
      { edgeId: 'e3', sourceNodeId: 'delivery', sourcePortId: 'dictationText', targetNodeId: 'scoring', targetPortId: 'dictationText' },
      // Scoring → Judging (auto-scores inform judge assignment priority)
      { edgeId: 'e4', sourceNodeId: 'scoring', sourcePortId: 'autoScores', targetNodeId: 'judging', targetPortId: 'autoScores' },
      // Intake → Judging (submissions needed for judge review)
      { edgeId: 'e5', sourceNodeId: 'intake', sourcePortId: 'submissions', targetNodeId: 'judging', targetPortId: 'submissions' },
      // Judging → Scoring (judge scores flow back for aggregation — re-invocation)
      { edgeId: 'e6', sourceNodeId: 'judging', sourcePortId: 'judgeScores', targetNodeId: 'scoring', targetPortId: 'judgeScores' },
      // Scoring → Results (final aggregated scores)
      { edgeId: 'e7', sourceNodeId: 'scoring', sourcePortId: 'finalScores', targetNodeId: 'results', targetPortId: 'finalScores' },
      // Intake → Results (submissions for certificate data)
      { edgeId: 'e8', sourceNodeId: 'intake', sourcePortId: 'submissions', targetNodeId: 'results', targetPortId: 'submissions' },
    ],

    trigger: { type: 'manual' },

    metadata: {
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId,
      tags: ['competition', 'dictation', 'dicta-dor', `round-${roundNumber}`, 'starter-template'],
      templateId: `tpl_dictador_v1`,
    },
  };
}
