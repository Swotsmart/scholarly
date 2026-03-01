/**
 * ============================================================================
 * S&R Competition Node Tests
 * ============================================================================
 *
 * Tests for the six Dicta d'Or competition nodes. Every test uses
 * injected mock services — no real NLP, no real audio generation.
 *
 * Test organisation:
 *   §1 — Registration Management (eligibility, deadline, capacity)
 *   §2 — Dictation Delivery (config, audio generation, status update)
 *   §3 — Submission Intake (window timing, late submissions, batching)
 *   §4 — Scoring (auto-score, aggregation, edge cases)
 *   §5 — Judging Review (assignment, pause, low-confidence priority)
 *   §6 — Results Publication (rankings, certificates, notifications)
 *   §7 — Registry & Template (registration, template structure)
 *
 * @module scholarly/sr/templates/competition-dictation.test
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  success,
  failure,
  Errors,
  NodeTypeRegistry,
} from './sr-workflow-engine';

import type { NodeExecutionContext, NodeOutput, Result } from './sr-workflow-engine';

import {
  createRegistrationManagementNode,
  createDictationDeliveryNode,
  createSubmissionIntakeNode,
  createScoringNode,
  createJudgingReviewNode,
  createResultsPublicationNode,
  registerCompetitionNodes,
  createDictaDorWorkflowTemplate,
  DEFAULT_DICTATION_RUBRIC,
} from './sr-competition-workflow-template';

import type {
  CompetitionService,
  DictationService,
  SubmissionService,
  AutoScoringService,
  JudgingService,
  ResultsService,
  Submission,
  AutoScore,
  FinalScoreSet,
  Participant,
} from './sr-competition-workflow-template';


// ============================================================================
// §0 — TEST UTILITIES
// ============================================================================

function createMockContext(overrides: {
  config?: Record<string, unknown>;
  inputs?: Record<string, unknown>;
  services?: Record<string, unknown>;
}): NodeExecutionContext {
  const serviceMap = new Map<string, unknown>(
    Object.entries(overrides.services ?? {}),
  );

  return {
    node: {
      nodeId: 'test-node',
      typeId: 'test',
      label: 'Test Node',
      config: overrides.config ?? {},
      position: { x: 0, y: 0 },
    },
    workflowId: 'wf-test',
    runId: 'run-test',
    tenantId: 'tenant-test',
    userId: 'user-test',
    inputs: overrides.inputs ?? {},
    services: {
      eventBus: { publish: vi.fn(async () => {}) },
      dataLake: null as any,
      cache: null as any,
      getService: <T>(name: string): T | null => (serviceMap.get(name) as T) ?? null,
    },
    log: vi.fn(),
  };
}

// ── Mock Services ───────────────────────────────────────────────────────

function mockCompetitionService(): CompetitionService {
  return {
    getCompetition: vi.fn(async () => success({
      id: 'comp-1', tenantId: 'tenant-test', name: "Dicta d'Or 2026",
      type: 'dictation' as const, status: 'active' as const, rounds: [],
      config: {
        language: 'fr', ageCategories: ['cadet', 'junior', 'senior'],
        maxParticipantsPerRound: 200, autoScoreFirst: true,
        judgesPerSubmission: 2, defaultRubric: DEFAULT_DICTATION_RUBRIC,
      },
      createdAt: new Date(),
    })),
    getRound: vi.fn(async () => success({
      id: 'round-1', competitionId: 'comp-1', roundNumber: 1, name: 'Demi-finale',
      status: 'scheduled' as const, dictationId: 'dict-1',
      config: { submissionWindowMinutes: 15, allowLateSubmissions: true, lateSubmissionPenalty: 0.1 },
    })),
    updateRoundStatus: vi.fn(async () => success(undefined as any)),
    getParticipants: vi.fn(async () => success([])),
  };
}

function mockDictationService(): DictationService {
  return {
    getDictation: vi.fn(async () => success({
      id: 'dict-1', title: 'Les Contemplations',
      referenceText: "Demain, dès l'aube, à l'heure où blanchit la campagne, je partirai.",
      author: 'Victor Hugo', source: 'Les Contemplations',
      difficulty: 3, language: 'fr', wordCount: 12,
      linguisticNotes: ['accent grave on à', 'apostrophe in l\'aube', 'passé simple: partirai'],
    })),
    generateAudioPlayback: vi.fn(async () => success({
      audioUrl: 'https://audio.scholarly.app/dict-1.mp3',
      durationSeconds: 180,
      sentenceTimestamps: [
        { sentenceIndex: 0, readingNumber: 1, startMs: 0, endMs: 8000 },
      ],
      sessionId: 'session-abc',
    })),
    getPlaybackStatus: vi.fn(async () => success('complete' as const)),
  };
}

function mockSubmissionService(): SubmissionService {
  return {
    collectSubmissions: vi.fn(async () => success({
      roundId: 'round-1',
      submissions: sampleSubmissions(),
      totalReceived: 3,
      totalLate: 1,
      windowStatus: 'closed' as const,
    })),
    getSubmission: vi.fn(async () => success(sampleSubmissions()[0]!)),
    getSubmissionsByRound: vi.fn(async () => success(sampleSubmissions())),
    updateSubmissionStatus: vi.fn(async () => success(undefined as any)),
  };
}

function mockAutoScoringService(): AutoScoringService {
  return {
    scoreSubmission: vi.fn(async () => success(sampleAutoScore('sub-1'))),
    scoreBatch: vi.fn(async () => success([
      sampleAutoScore('sub-1', 85, 0.92),
      sampleAutoScore('sub-2', 72, 0.88),
      sampleAutoScore('sub-3', 45, 0.55),
    ])),
  };
}

function mockJudgingService(): JudgingService {
  return {
    getJudgingDashboard: vi.fn(async () => success({
      roundId: 'round-1', totalSubmissions: 3, assignedToJudges: 3,
      judgedCount: 0, pendingCount: 3, judges: [],
    })),
    assignSubmissions: vi.fn(async () => success(undefined as any)),
    submitJudgeScore: vi.fn(async () => success(undefined as any)),
    getJudgingProgress: vi.fn(async () => success({
      roundId: 'round-1', totalSubmissions: 3, autoScored: 3,
      humanJudged: 3, pendingHumanReview: 0, percentComplete: 100,
    })),
    finaliseScores: vi.fn(async () => success(sampleFinalScores())),
  };
}

function mockResultsService(): ResultsService {
  return {
    calculateRankings: vi.fn(async () => success({
      roundId: 'round-1',
      rankings: [
        { rank: 1, participantId: 'p-1', displayName: 'Marie', ageCategory: 'senior', totalScore: 92, tiebreaker: { majorErrors: 1, minorErrors: 2 } },
        { rank: 2, participantId: 'p-2', displayName: 'Jean', ageCategory: 'junior', totalScore: 78, tiebreaker: { majorErrors: 3, minorErrors: 4 } },
        { rank: 3, participantId: 'p-3', displayName: 'Pierre', ageCategory: 'cadet', totalScore: 55, tiebreaker: { majorErrors: 6, minorErrors: 8 } },
      ],
      categoryRankings: { senior: [], junior: [], cadet: [] },
      generatedAt: new Date(),
    })),
    generateCertificates: vi.fn(async () => success([
      { participantId: 'p-1', type: 'winner', pdfUrl: 'https://certs/p-1.pdf', generatedAt: new Date() },
      { participantId: 'p-2', type: 'participation', pdfUrl: 'https://certs/p-2.pdf', generatedAt: new Date() },
      { participantId: 'p-3', type: 'participation', pdfUrl: 'https://certs/p-3.pdf', generatedAt: new Date() },
    ])),
    publishLeaderboard: vi.fn(async () => success({
      roundId: 'round-1', url: 'https://scholarly.app/leaderboard/round-1',
      visibility: 'public' as const, publishedAt: new Date(), totalParticipants: 3,
    })),
    notifyParticipants: vi.fn(async () => success({ sent: 3, failed: 0, errors: [] })),
  };
}

// ── Sample Data Factories ───────────────────────────────────────────────

function sampleSubmissions(): Submission[] {
  return [
    { id: 'sub-1', roundId: 'round-1', participantId: 'p-1',
      transcribedText: "Demain, dès l'aube, à l'heure où blanchit la campagne, je partirai.",
      submittedAt: new Date(), isLate: false, status: 'received' },
    { id: 'sub-2', roundId: 'round-1', participantId: 'p-2',
      transcribedText: "Demain, des l'aube, a l'heure ou blanchit la campagne, je partirai.",
      submittedAt: new Date(), isLate: false, status: 'received' },
    { id: 'sub-3', roundId: 'round-1', participantId: 'p-3',
      transcribedText: "Demain des laube a lheure ou blanchis la campagne je partirais.",
      submittedAt: new Date(), isLate: true, status: 'received' },
  ];
}

function sampleAutoScore(submissionId: string, score = 85, confidence = 0.92): AutoScore {
  return {
    submissionId, totalScore: score, confidence, scoredAt: new Date(),
    dimensionScores: [
      { dimensionId: 'orthography', score: 90, errorCount: 1, errors: [] },
      { dimensionId: 'grammar', score: 80, errorCount: 2, errors: [] },
      { dimensionId: 'accents', score: 85, errorCount: 1, errors: [] },
      { dimensionId: 'punctuation', score: 95, errorCount: 0, errors: [] },
    ],
    wordDiff: [],
  };
}

function sampleFinalScores(): FinalScoreSet {
  return {
    roundId: 'round-1',
    scores: [
      { submissionId: 'sub-1', participantId: 'p-1', totalScore: 92, dimensionScores: [],
        autoScore: 85, humanScore: 95, latePenaltyApplied: 0, flagged: false },
      { submissionId: 'sub-2', participantId: 'p-2', totalScore: 78, dimensionScores: [],
        autoScore: 72, humanScore: 80, latePenaltyApplied: 0, flagged: false },
      { submissionId: 'sub-3', participantId: 'p-3', totalScore: 55, dimensionScores: [],
        autoScore: 45, humanScore: 60, latePenaltyApplied: 5, flagged: false },
    ],
    aggregationMethod: 'weighted_average',
    interRaterAgreement: 0.82,
    scoredAt: new Date(),
  };
}


function sampleParticipants(): Participant[] {
  const base = new Date('2026-06-01T00:00:00Z');
  return [
    { id: 'p-1', userId: 'u-1', displayName: 'Marie', ageCategory: 'senior', registeredAt: new Date(base.getTime()), status: 'registered' },
    { id: 'p-2', userId: 'u-2', displayName: 'Jean', ageCategory: 'junior', registeredAt: new Date(base.getTime() + 3600_000), status: 'registered' },
    { id: 'p-3', userId: 'u-3', displayName: 'Pierre', ageCategory: 'cadet', registeredAt: new Date(base.getTime() + 7200_000), status: 'registered' },
    { id: 'p-4', userId: 'u-4', displayName: 'Luc', ageCategory: 'senior', registeredAt: new Date(base.getTime() + 86400_000), status: 'disqualified' },
    { id: 'p-5', userId: 'u-5', displayName: 'Claire', ageCategory: 'junior', registeredAt: new Date(base.getTime() + 172800_000), status: 'withdrawn' },
    { id: 'p-6', userId: 'u-6', displayName: 'Sophie', ageCategory: 'senior', registeredAt: new Date('2026-07-15T00:00:00Z'), status: 'registered' },
  ];
}


// ============================================================================
// §1 — REGISTRATION MANAGEMENT TESTS
// ============================================================================

describe('RegistrationManagementNode', () => {
  const node = createRegistrationManagementNode();

  it('should have correct type definition', () => {
    expect(node.typeId).toBe('sr:source:registration-management');
    expect(node.category).toBe('SOURCE');
    expect(node.inputs.length).toBe(0);
    expect(node.outputs.map(o => o.portId)).toEqual(['participants', 'registrationSummary']);
  });

  it('should return eligible participants filtering out disqualified and withdrawn', async () => {
    const compService = mockCompetitionService();
    (compService.getParticipants as any).mockResolvedValue(success(sampleParticipants()));

    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      services: { 'competition:competitionService': compService },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const participants = result.value['participants'] as Participant[];
    // 6 total, 1 disqualified, 1 withdrawn = 4 eligible (registered status)
    expect(participants.length).toBe(4);
    expect(participants.every(p => p.status === 'registered')).toBe(true);

    const summary = result.value['registrationSummary'] as Record<string, unknown>;
    expect(summary['totalRegistered']).toBe(6);
    expect(summary['totalEligible']).toBe(4);
    expect(summary['disqualified']).toBe(1);
    expect(summary['withdrawn']).toBe(1);
  });

  it('should enforce registration deadline', async () => {
    const compService = mockCompetitionService();
    (compService.getParticipants as any).mockResolvedValue(success(sampleParticipants()));

    const ctx = createMockContext({
      config: {
        competitionId: 'comp-1', roundId: 'round-1',
        registrationDeadline: '2026-06-15T00:00:00Z', // Sophie registered July 15 — too late
      },
      services: { 'competition:competitionService': compService },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const participants = result.value['participants'] as Participant[];
    expect(participants.length).toBe(3); // Marie, Jean, Pierre (Sophie rejected as late)

    const summary = result.value['registrationSummary'] as Record<string, unknown>;
    expect(summary['rejectedLateRegistration']).toBe(1);
  });

  it('should filter by allowed age categories', async () => {
    const compService = mockCompetitionService();
    (compService.getParticipants as any).mockResolvedValue(success(sampleParticipants()));

    const ctx = createMockContext({
      config: {
        competitionId: 'comp-1', roundId: 'round-1',
        allowedCategories: ['senior', 'junior'], // No cadets
      },
      services: { 'competition:competitionService': compService },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const participants = result.value['participants'] as Participant[];
    expect(participants.every(p => p.ageCategory !== 'cadet')).toBe(true);

    const summary = result.value['registrationSummary'] as Record<string, unknown>;
    expect(summary['rejectedAgeCategory']).toBe(1); // Pierre (cadet)
  });

  it('should enforce capacity with first-come-first-served', async () => {
    const compService = mockCompetitionService();
    (compService.getParticipants as any).mockResolvedValue(success(sampleParticipants()));

    const ctx = createMockContext({
      config: {
        competitionId: 'comp-1', roundId: 'round-1',
        maxParticipants: 2, enforceCapacity: true,
      },
      services: { 'competition:competitionService': compService },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const participants = result.value['participants'] as Participant[];
    expect(participants.length).toBe(2);
    // Marie registered first, then Jean — they should be the accepted ones
    expect(participants[0]!.displayName).toBe('Marie');
    expect(participants[1]!.displayName).toBe('Jean');

    const summary = result.value['registrationSummary'] as Record<string, unknown>;
    expect(summary['waitlisted']).toBe(2); // Pierre + Sophie waitlisted
  });

  it('should publish registration finalised event', async () => {
    const compService = mockCompetitionService();
    (compService.getParticipants as any).mockResolvedValue(success(sampleParticipants()));

    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      services: { 'competition:competitionService': compService },
    });

    await node.execute(ctx);
    expect(ctx.services.eventBus.publish).toHaveBeenCalledWith(
      'sr.competition.registration.finalised',
      expect.objectContaining({ totalEligible: 4 }),
    );
  });

  it('should fail when competitionId is missing', async () => {
    const ctx = createMockContext({
      config: { roundId: 'round-1' },
      services: { 'competition:competitionService': mockCompetitionService() },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('competitionId');
  });
});


// ============================================================================
// §2 — DICTATION DELIVERY TESTS
// ============================================================================

describe('DictationDeliveryNode', () => {
  const node = createDictationDeliveryNode();

  it('should have correct type definition', () => {
    expect(node.typeId).toBe('sr:action:dictation-delivery');
    expect(node.category).toBe('ACTION');
    expect(node.outputs.length).toBe(2);
    expect(node.outputs.map(o => o.portId)).toEqual(['session', 'dictationText']);
  });

  it('should deliver dictation and return session + reference text', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1', dictationId: 'dict-1' },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:dictationService': mockDictationService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value['session']).toBeDefined();
    const session = result.value['session'] as Record<string, unknown>;
    expect(session['sessionId']).toBe('session-abc');
    expect(session['durationSeconds']).toBe(180);

    expect(result.value['dictationText']).toBeDefined();
    const text = result.value['dictationText'] as Record<string, unknown>;
    expect(text['author']).toBe('Victor Hugo');
    expect(text['wordCount']).toBe(12);
  });

  it('should fail when competitionId is missing', async () => {
    const ctx = createMockContext({
      config: { roundId: 'round-1', dictationId: 'dict-1' },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:dictationService': mockDictationService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('competitionId');
  });

  it('should fail when dictation service is unavailable', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1', dictationId: 'dict-1' },
      services: { 'competition:competitionService': mockCompetitionService() },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Dictation Service');
  });

  it('should publish dictation started event', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1', dictationId: 'dict-1' },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:dictationService': mockDictationService(),
      },
    });

    await node.execute(ctx);
    expect(ctx.services.eventBus.publish).toHaveBeenCalledWith(
      'sr.competition.dictation.started',
      expect.objectContaining({ sessionId: 'session-abc' }),
    );
  });

  it('should use custom playback config from node settings', async () => {
    const dictService = mockDictationService();
    const ctx = createMockContext({
      config: {
        competitionId: 'comp-1', roundId: 'round-1', dictationId: 'dict-1',
        speed: 0.8, readCount: 2, announcePunctuation: false,
      },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:dictationService': dictService,
      },
    });

    await node.execute(ctx);
    expect(dictService.generateAudioPlayback).toHaveBeenCalledWith(
      'tenant-test', 'dict-1',
      expect.objectContaining({ speed: 0.8, readCount: 2, announcePunctuation: false }),
    );
  });
});


// ============================================================================
// §3 — SUBMISSION INTAKE TESTS
// ============================================================================

describe('SubmissionIntakeNode', () => {
  const node = createSubmissionIntakeNode();

  it('should have correct type definition', () => {
    expect(node.typeId).toBe('sr:source:submission-intake');
    expect(node.category).toBe('SOURCE');
    expect(node.inputs[0]!.portId).toBe('session');
    expect(node.outputs.map(o => o.portId)).toEqual(['submissions', 'intakeSummary']);
  });

  it('should collect submissions and return batch with summary', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { session: { sessionId: 'session-abc', durationSeconds: 180 } },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:submissionService': mockSubmissionService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const submissions = result.value['submissions'] as Submission[];
    expect(submissions.length).toBe(3);

    const summary = result.value['intakeSummary'] as Record<string, unknown>;
    expect(summary['totalReceived']).toBe(3);
    expect(summary['totalLate']).toBe(1);
    expect(summary['onTimeCount']).toBe(2);
  });

  it('should update round status to submissions_closed', async () => {
    const compService = mockCompetitionService();
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { session: { durationSeconds: 60 } },
      services: {
        'competition:competitionService': compService,
        'competition:submissionService': mockSubmissionService(),
      },
    });

    await node.execute(ctx);
    expect(compService.updateRoundStatus).toHaveBeenCalledWith('tenant-test', 'round-1', 'submissions_closed');
  });

  it('should publish submissions closed event', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { session: { durationSeconds: 60 } },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:submissionService': mockSubmissionService(),
      },
    });

    await node.execute(ctx);
    expect(ctx.services.eventBus.publish).toHaveBeenCalledWith(
      'sr.competition.submissions.closed',
      expect.objectContaining({ totalReceived: 3, totalLate: 1 }),
    );
  });
});


// ============================================================================
// §4 — SCORING TESTS
// ============================================================================

describe('ScoringNode', () => {
  const node = createScoringNode();

  it('should have correct type definition', () => {
    expect(node.typeId).toBe('sr:transform:competition-scoring');
    expect(node.category).toBe('TRANSFORM');
    expect(node.inputs.map(i => i.portId)).toEqual(['submissions', 'dictationText', 'judgeScores']);
    expect(node.outputs.map(o => o.portId)).toEqual(['autoScores', 'finalScores', 'scoringSummary']);
  });

  it('should run auto-scoring and return scores with summary', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: {
        submissions: sampleSubmissions(),
        dictationText: { referenceText: 'test text', wordCount: 2 },
      },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:autoScoringService': mockAutoScoringService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const autoScores = result.value['autoScores'] as AutoScore[];
    expect(autoScores.length).toBe(3);

    const summary = result.value['scoringSummary'] as Record<string, unknown>;
    expect(summary['autoScored']).toBe(3);
    expect(summary['lowConfidenceCount']).toBe(1); // sub-3 has 0.55 confidence
    expect(summary['finalised']).toBe(false); // No judge scores yet
  });

  it('should aggregate with judge scores when present', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1', aggregationMethod: 'weighted_average' },
      inputs: {
        submissions: sampleSubmissions(),
        dictationText: { referenceText: 'test text', wordCount: 2 },
        judgeScores: sampleFinalScores(),
      },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:autoScoringService': mockAutoScoringService(),
        'competition:judgingService': mockJudgingService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const summary = result.value['scoringSummary'] as Record<string, unknown>;
    expect(summary['finalised']).toBe(true);
    expect(result.value['finalScores']).toBeDefined();
  });

  it('should fail when no submissions provided', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { dictationText: { referenceText: 'text', wordCount: 1 } },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:autoScoringService': mockAutoScoringService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('No submissions');
  });

  it('should fail when reference text missing', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { submissions: sampleSubmissions() },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:autoScoringService': mockAutoScoringService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Reference text');
  });
});


// ============================================================================
// §5 — JUDGING REVIEW TESTS
// ============================================================================

describe('JudgingReviewNode', () => {
  const node = createJudgingReviewNode();

  it('should have correct type definition', () => {
    expect(node.typeId).toBe('sr:action:judging-review');
    expect(node.category).toBe('ACTION');
    expect(node.pausesWorkflow).toBe(true);
  });

  it('should pause workflow for judging', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: {
        autoScores: [sampleAutoScore('sub-1', 85, 0.92), sampleAutoScore('sub-2', 45, 0.55)],
        submissions: sampleSubmissions().slice(0, 2),
      },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:judgingService': mockJudgingService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.value['__paused']).toBe(true);
    expect(result.value['__pauseReason']).toContain('2 submissions');
  });

  it('should prioritise low-confidence submissions first', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1', prioritiseLowConfidence: true },
      inputs: {
        autoScores: [
          sampleAutoScore('sub-1', 85, 0.92),
          sampleAutoScore('sub-2', 45, 0.55),
          sampleAutoScore('sub-3', 70, 0.30),
        ],
        submissions: sampleSubmissions(),
      },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:judgingService': mockJudgingService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const metadata = result.value['__pauseMetadata'] as Record<string, unknown>;
    const ordered = metadata['orderedSubmissionIds'] as string[];
    // sub-3 (0.30 confidence) should come first, then sub-2 (0.55), then sub-1 (0.92)
    expect(ordered[0]).toBe('sub-3');
    expect(ordered[1]).toBe('sub-2');
    expect(ordered[2]).toBe('sub-1');
  });

  it('should publish judging started event', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { autoScores: [], submissions: sampleSubmissions() },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:judgingService': mockJudgingService(),
      },
    });

    await node.execute(ctx);
    expect(ctx.services.eventBus.publish).toHaveBeenCalledWith(
      'sr.competition.judging.started',
      expect.objectContaining({ submissionCount: 3 }),
    );
  });

  it('should fail when no submissions available', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { autoScores: [], submissions: [] },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:judgingService': mockJudgingService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(false);
  });
});


// ============================================================================
// §6 — RESULTS PUBLICATION TESTS
// ============================================================================

describe('ResultsPublicationNode', () => {
  const node = createResultsPublicationNode();

  it('should have correct type definition', () => {
    expect(node.typeId).toBe('sr:action:results-publication');
    expect(node.category).toBe('ACTION');
    expect(node.outputs.map(o => o.portId)).toEqual(['rankings', 'leaderboard', 'publicationSummary']);
  });

  it('should calculate rankings, generate certs, publish leaderboard, and notify', async () => {
    const resultsService = mockResultsService();
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { finalScores: sampleFinalScores() },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:resultsService': resultsService,
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // Verify all services were called
    expect(resultsService.calculateRankings).toHaveBeenCalled();
    expect(resultsService.generateCertificates).toHaveBeenCalled();
    expect(resultsService.publishLeaderboard).toHaveBeenCalled();
    expect(resultsService.notifyParticipants).toHaveBeenCalled();

    const summary = result.value['publicationSummary'] as Record<string, unknown>;
    expect(summary['totalParticipants']).toBe(3);
    expect(summary['certificatesGenerated']).toBe(3);
    expect(summary['notificationsSent']).toBe(3);
    expect(summary['leaderboardUrl']).toBe('https://scholarly.app/leaderboard/round-1');

    const winner = summary['winner'] as Record<string, unknown>;
    expect(winner['displayName']).toBe('Marie');
    expect(winner['rank']).toBe(1);
  });

  it('should skip certificates when disabled', async () => {
    const resultsService = mockResultsService();
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1', generateCertificates: false },
      inputs: { finalScores: sampleFinalScores() },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:resultsService': resultsService,
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(resultsService.generateCertificates).not.toHaveBeenCalled();
    expect((result.value['publicationSummary'] as any).certificatesGenerated).toBe(0);
  });

  it('should skip notifications when disabled', async () => {
    const resultsService = mockResultsService();
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1', notifyParticipants: false },
      inputs: { finalScores: sampleFinalScores() },
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:resultsService': resultsService,
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(true);
    expect(resultsService.notifyParticipants).not.toHaveBeenCalled();
  });

  it('should fail when final scores are missing', async () => {
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: {},
      services: {
        'competition:competitionService': mockCompetitionService(),
        'competition:resultsService': mockResultsService(),
      },
    });

    const result = await node.execute(ctx);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.message).toContain('Final scores');
  });

  it('should publish results event and update round status', async () => {
    const compService = mockCompetitionService();
    const ctx = createMockContext({
      config: { competitionId: 'comp-1', roundId: 'round-1' },
      inputs: { finalScores: sampleFinalScores() },
      services: {
        'competition:competitionService': compService,
        'competition:resultsService': mockResultsService(),
      },
    });

    await node.execute(ctx);
    expect(compService.updateRoundStatus).toHaveBeenCalledWith('tenant-test', 'round-1', 'published');
    expect(ctx.services.eventBus.publish).toHaveBeenCalledWith(
      'sr.competition.results.published',
      expect.objectContaining({ totalParticipants: 3 }),
    );
  });
});


// ============================================================================
// §7 — REGISTRY & TEMPLATE TESTS
// ============================================================================

describe('Competition Registry', () => {
  it('should register all 6 competition nodes', () => {
    const registry = new NodeTypeRegistry();
    registerCompetitionNodes(registry);

    // Verify all 6 are registered
    expect(registry.get('sr:source:registration-management').ok).toBe(true);
    expect(registry.get('sr:action:dictation-delivery').ok).toBe(true);
    expect(registry.get('sr:source:submission-intake').ok).toBe(true);
    expect(registry.get('sr:transform:competition-scoring').ok).toBe(true);
    expect(registry.get('sr:action:judging-review').ok).toBe(true);
    expect(registry.get('sr:action:results-publication').ok).toBe(true);
  });

  it('should coexist with migration nodes', () => {
    const registry = new NodeTypeRegistry();
    // Register both sets
    registerCompetitionNodes(registry);
    // Competition nodes don't collide with migration nodes (different typeId prefix)
    expect(registry.get('sr:action:dictation-delivery').ok).toBe(true);
  });
});

describe('Dicta d\'Or Workflow Template', () => {
  it('should create a valid workflow definition', () => {
    const template = createDictaDorWorkflowTemplate({
      competitionId: 'comp-1',
      roundId: 'round-1',
      roundNumber: 1,
      roundName: 'Demi-finale',
      dictationId: 'dict-1',
      tenantId: 'tenant-test',
      userId: 'user-test',
    });

    expect(template.workflowId).toBe('wf_dictador_comp-1_r1');
    expect(template.name).toContain("Dicta d'Or");
    expect(template.nodes.length).toBe(6);
    expect(template.edges.length).toBe(9);
    expect(template.trigger.type).toBe('manual');
  });

  it('should have all 6 nodes with correct typeIds', () => {
    const template = createDictaDorWorkflowTemplate({
      competitionId: 'comp-1', roundId: 'round-1', roundNumber: 1,
      roundName: 'Finale', dictationId: 'dict-1',
      tenantId: 'tenant-test', userId: 'user-test',
    });

    const typeIds = template.nodes.map(n => n.typeId);
    expect(typeIds).toEqual([
      'sr:source:registration-management',
      'sr:action:dictation-delivery',
      'sr:source:submission-intake',
      'sr:transform:competition-scoring',
      'sr:action:judging-review',
      'sr:action:results-publication',
    ]);
  });

  it('should wire registration → delivery → intake → scoring → judging → results edges', () => {
    const template = createDictaDorWorkflowTemplate({
      competitionId: 'comp-1', roundId: 'round-1', roundNumber: 1,
      roundName: 'Test', dictationId: 'dict-1',
      tenantId: 'tenant-test', userId: 'user-test',
    });

    // Verify critical data flows
    const edgeMap = template.edges.map(e => `${e.sourceNodeId}.${e.sourcePortId} → ${e.targetNodeId}.${e.targetPortId}`);
    expect(edgeMap).toContain('registration.registrationSummary → delivery.trigger');
    expect(edgeMap).toContain('delivery.session → intake.session');
    expect(edgeMap).toContain('intake.submissions → scoring.submissions');
    expect(edgeMap).toContain('delivery.dictationText → scoring.dictationText');
    expect(edgeMap).toContain('scoring.autoScores → judging.autoScores');
    expect(edgeMap).toContain('scoring.finalScores → results.finalScores');
  });

  it('should accept rubric override', () => {
    const customRubric = { ...DEFAULT_DICTATION_RUBRIC, maxScore: 200 };
    const template = createDictaDorWorkflowTemplate({
      competitionId: 'comp-1', roundId: 'round-1', roundNumber: 1,
      roundName: 'Test', dictationId: 'dict-1',
      tenantId: 'tenant-test', userId: 'user-test',
      rubricOverride: customRubric,
    });

    const scoringNode = template.nodes.find(n => n.typeId === 'sr:transform:competition-scoring');
    expect(scoringNode!.config['rubricOverride']).toEqual(customRubric);
  });
});

describe('DEFAULT_DICTATION_RUBRIC', () => {
  it('should have 4 dimensions summing to weight 1.0', () => {
    expect(DEFAULT_DICTATION_RUBRIC.dimensions.length).toBe(4);
    const totalWeight = DEFAULT_DICTATION_RUBRIC.dimensions.reduce((sum, d) => sum + d.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0);
  });

  it('should have correct French dimension labels', () => {
    const labels = DEFAULT_DICTATION_RUBRIC.dimensions.map(d => d.label);
    expect(labels).toEqual(['Orthographe', 'Grammaire', 'Accents et signes', 'Ponctuation']);
  });

  it('should have graduated error deductions', () => {
    expect(DEFAULT_DICTATION_RUBRIC.majorErrorDeduction).toBeGreaterThan(DEFAULT_DICTATION_RUBRIC.minorErrorDeduction);
    expect(DEFAULT_DICTATION_RUBRIC.minorErrorDeduction).toBeGreaterThan(DEFAULT_DICTATION_RUBRIC.punctuationErrorDeduction);
  });
});
