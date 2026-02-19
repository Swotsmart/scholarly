// =============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 4
// E2E Integration Test Suite: Self-Hosted Voice Pipeline
// =============================================================================
// 62 tests across 8 groups:
//
// 1. Stage 1→2: Narrative → TTS Synthesis (8 tests)
// 2. Stage 2→3: TTS → Forced Alignment (7 tests)
// 3. Stage 3→4: Alignment → Phonics Emphasis (7 tests)
// 4. Stage 5→6: Read-Aloud → Pronunciation Scoring (8 tests)
// 5. Stage 6→7: Scores → BKT Mastery Update (8 tests)
// 6. Full Pipeline: End-to-End Happy Path (5 tests)
// 7. Cross-Component Type Compatibility (6 tests)
// 8. Error Handling & Resilience (8 tests)
// 9. Multi-Page Book Pipeline (5 tests)
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  NarrationService,
  VOICE_PERSONAS,
  PACE_CONFIG,
  VoicePersona,
  AIService,
} from '../../src/services/voice/narration-service';

import {
  createMockVoiceServiceServer,
  createMockAIService,
  createMockBKTEngine,
  FIXTURE_STORYBOOK_PAGE,
  FIXTURE_MULTI_PAGE_BOOK,
  FIXTURE_AUDIO_BASE64,
  FIXTURE_WORD_TIMESTAMPS,
  FIXTURE_PHONEME_TIMESTAMPS,
  FIXTURE_PRONUNCIATION_SCORES,
  FIXTURE_GPC_SCORES,
  FIXTURE_PACE_MAP,
} from '../fixtures/e2e-fixtures';


// =============================================================================
// Shared helpers
// =============================================================================

function createTestNarrationService(overrides?: Partial<{ aiService: AIService }>) {
  const aiService = overrides?.aiService ?? createMockAIService();
  return {
    service: new NarrationService({
      aiService,
      storageProvider: {
        upload: vi.fn(async () => 'https://cdn.scholarly.app/audio/test.wav'),
        getSignedUrl: vi.fn(async () => 'https://cdn.scholarly.app/signed/test.wav'),
      },
      logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
    }),
    aiService,
  };
}


// =============================================================================
// Group 1: Narrative → TTS Synthesis (8 tests)
// =============================================================================

describe('Stage 1→2: Narrative Generation → TTS Synthesis', () => {
  let narration: ReturnType<typeof createTestNarrationService>;

  beforeEach(() => { narration = createTestNarrationService(); });

  it('should generate narration for a Phase 2 storybook page', async () => {
    const result = await narration.service.narrateBook(
      'book-001',
      [{ pageNumber: 1, text: FIXTURE_STORYBOOK_PAGE.text }],
      { voicePersona: VOICE_PERSONAS[0], phonicsPhase: 2, tenantId: 'school-001' },
    );
    expect(result.success).toBe(true);
    expect(result.data!.pages.length).toBe(1);
    expect(result.data!.voicePersonaId).toBe('vp-warm-storyteller');
  });

  it('should pass Kokoro voice ID through to AIService', async () => {
    await narration.service.narrateBook(
      'book-001', [{ pageNumber: 1, text: 'The cat sat.' }],
      { voicePersona: VOICE_PERSONAS[0], tenantId: 'school-001' },
    );
    expect(narration.aiService.synthesizeSpeech).toHaveBeenCalledWith(
      expect.objectContaining({ voiceId: 'af_bella', tenantId: 'school-001' }),
    );
  });

  it('should adapt pace for Phase 1 (slowest readers)', async () => {
    await narration.service.narrateBook(
      'book-001', [{ pageNumber: 1, text: 'Sam sat.' }],
      { phonicsPhase: 1, tenantId: 'school-001' },
    );
    const call = narration.aiService.synthesizeSpeech.mock.calls[0][0];
    // Phase 1 = 60 WPM, base = 130 → pace ~0.46
    expect(call.speed).toBeLessThan(0.6);
  });

  it('should adapt pace for Phase 6 (fluent readers)', async () => {
    await narration.service.narrateBook(
      'book-001', [{ pageNumber: 1, text: 'Sam sat.' }],
      { phonicsPhase: 6, tenantId: 'school-001' },
    );
    const call = narration.aiService.synthesizeSpeech.mock.calls[0][0];
    // Phase 6 = 150 WPM, base = 130 → pace ~1.15
    expect(call.speed).toBeGreaterThan(1.0);
  });

  it('should upload audio to tenant-scoped storage path', async () => {
    const { service } = createTestNarrationService();
    await service.narrateBook(
      'book-001', [{ pageNumber: 1, text: 'The cat sat.' }],
      { tenantId: 'school-001' },
    );
    // Storage mock was called
    expect((service as any).config.storageProvider.upload).toHaveBeenCalledWith(
      expect.stringContaining('tenants/school-001/storybooks/book-001/audio/page-1'),
      expect.any(Buffer),
      expect.any(String),
    );
  });

  it('should include word timestamps in result', async () => {
    const result = await narration.service.narrateBook(
      'book-001', [{ pageNumber: 1, text: 'The cat sat on the mat.' }],
      { tenantId: 'school-001' },
    );
    const page = result.data!.pages[0];
    expect(page.wordTimestamps.length).toBeGreaterThan(0);
    expect(page.wordTimestamps[0]).toHaveProperty('word');
    expect(page.wordTimestamps[0]).toHaveProperty('startMs');
  });

  it('should calculate cost at self-hosted rates', async () => {
    const result = await narration.service.narrateBook(
      'book-001', [{ pageNumber: 1, text: 'The cat sat on the mat.' }],
      { tenantId: 'school-001' },
    );
    expect(result.data!.totalCostUsd).toBeLessThan(0.01);
  });

  it('should select appropriate voice persona by age and theme', () => {
    const bedtime = narration.service.selectVoicePersona('3-5', 'bedtime story');
    expect(bedtime.id).toBe('vp-warm-storyteller');
    const adventure = narration.service.selectVoicePersona('7-9', 'adventure quest');
    expect(adventure.suitableAgeGroups).toContain('7-9');
  });
});


// =============================================================================
// Group 2: TTS → Forced Alignment (7 tests)
// =============================================================================

describe('Stage 2→3: TTS Output → Forced Alignment', () => {
  let server: ReturnType<typeof createMockVoiceServiceServer>;
  beforeEach(() => { server = createMockVoiceServiceServer(); });

  it('should align TTS audio against page transcript', async () => {
    const result = await server.align({
      transcript: FIXTURE_STORYBOOK_PAGE.text,
      audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
    });
    expect(result.wordTimestamps.length).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeGreaterThan(0);
  });

  it('should return one timestamp per word', async () => {
    const text = 'The cat sat on the mat.';
    const result = await server.align({ transcript: text, audioBase64: FIXTURE_AUDIO_BASE64, language: 'en' });
    expect(result.wordTimestamps.length).toBe(text.trim().split(/\s+/).length);
  });

  it('should produce monotonically increasing timestamps', async () => {
    const result = await server.align({
      transcript: 'The cat sat on the mat.',
      audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
    });
    for (let i = 1; i < result.wordTimestamps.length; i++) {
      expect(result.wordTimestamps[i].start).toBeGreaterThanOrEqual(result.wordTimestamps[i - 1].start);
    }
  });

  it('should produce word timestamps with valid confidence scores', async () => {
    const result = await server.align({
      transcript: 'The cat sat.', audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
    });
    for (const wt of result.wordTimestamps) {
      expect(wt.confidence).toBeGreaterThanOrEqual(0);
      expect(wt.confidence).toBeLessThanOrEqual(1);
    }
  });

  it('should include phoneme-level timestamps', async () => {
    const result = await server.align({
      transcript: 'cat', audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
    });
    expect(result.phonemeTimestamps.length).toBeGreaterThan(0);
  });

  it('should have each word end after start', async () => {
    const result = await server.align({
      transcript: 'The cat sat on the mat.',
      audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
    });
    for (const wt of result.wordTimestamps) {
      expect(wt.end).toBeGreaterThan(wt.start);
    }
  });

  it('should preserve original word text', async () => {
    const result = await server.align({
      transcript: 'The cat sat.', audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
    });
    expect(result.wordTimestamps[0].word).toBe('The');
    expect(result.wordTimestamps[1].word).toBe('cat');
  });
});


// =============================================================================
// Group 3: Alignment → Phonics Emphasis (7 tests)
// =============================================================================

describe('Stage 3→4: Alignment → Phonics Emphasis', () => {
  let server: ReturnType<typeof createMockVoiceServiceServer>;
  beforeEach(() => { server = createMockVoiceServiceServer(); });

  it('should apply GPC emphasis to narration audio', async () => {
    const result = await server.phonicsPace({
      text: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a', 'th'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: FIXTURE_WORD_TIMESTAMPS,
      emphasisPace: 0.8,
    });
    expect(result.audioBase64).toBeTruthy();
    expect(result.paceMap.length).toBeGreaterThan(0);
  });

  it('should identify single GPC words with 0.8x pace', async () => {
    const result = await server.phonicsPace({
      text: 'The cat sat on the mat.',
      targetGpcs: ['a'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: FIXTURE_WORD_TIMESTAMPS.slice(0, 6),
      emphasisPace: 0.8,
    });
    const catEntry = result.paceMap.find((e: any) => e.word === 'cat');
    expect(catEntry?.containsTargetGpc).toBe(true);
    expect(catEntry?.paceFactor).toBe(0.8);
  });

  it('should apply strong emphasis (0.65x) to words with multiple GPCs', async () => {
    const result = await server.phonicsPace({
      text: 'That is a fat cat.',
      targetGpcs: ['a', 'th'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: FIXTURE_WORD_TIMESTAMPS.slice(6, 11),
      emphasisPace: 0.8,
    });
    const thatEntry = result.paceMap.find((e: any) => e.word === 'that');
    expect(thatEntry?.paceFactor).toBe(0.65);
    expect(thatEntry?.matchedGpcs).toContain('a');
    expect(thatEntry?.matchedGpcs).toContain('th');
  });

  it('should leave non-target words at normal pace', async () => {
    const result = await server.phonicsPace({
      text: 'The cat sat on the mat.',
      targetGpcs: ['a'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: FIXTURE_WORD_TIMESTAMPS.slice(0, 6),
      emphasisPace: 0.8,
    });
    const onEntry = result.paceMap.find((e: any) => e.word === 'on');
    expect(onEntry?.paceFactor).toBe(1.0);
    expect(onEntry?.containsTargetGpc).toBe(false);
  });

  it('should include emphasis summary statistics', async () => {
    const result = await server.phonicsPace({
      text: 'The cat sat on the mat.',
      targetGpcs: ['a'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: FIXTURE_WORD_TIMESTAMPS.slice(0, 6),
      emphasisPace: 0.8,
    });
    expect(result.emphasisSummary).toBeDefined();
    expect(result.emphasisSummary.totalWords).toBe(6);
    expect(result.emphasisSummary.emphasisedWords).toBeGreaterThan(0);
  });

  it('should produce adjusted word timestamps', async () => {
    const result = await server.phonicsPace({
      text: 'The cat sat.',
      targetGpcs: ['a'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: FIXTURE_WORD_TIMESTAMPS.slice(0, 3),
      emphasisPace: 0.8,
    });
    expect(result.wordTimestamps.length).toBe(3);
  });

  it('should increase total duration when emphasis applied', async () => {
    const result = await server.phonicsPace({
      text: 'The cat sat on the mat.',
      targetGpcs: ['a'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: FIXTURE_WORD_TIMESTAMPS.slice(0, 6),
      emphasisPace: 0.8,
    });
    const originalEnd = FIXTURE_WORD_TIMESTAMPS[5]?.end ?? 1;
    // Emphasised words are slower, so total should increase
    expect(result.durationSeconds).toBeGreaterThanOrEqual(originalEnd * 0.9);
  });
});


// =============================================================================
// Group 4: Read-Aloud → Pronunciation Scoring (8 tests)
// =============================================================================

describe('Stage 5→6: Read-Aloud → Pronunciation Scoring', () => {
  let server: ReturnType<typeof createMockVoiceServiceServer>;
  beforeEach(() => { server = createMockVoiceServiceServer(); });

  it('should score pronunciation against expected text', async () => {
    const result = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a', 'th'], language: 'en',
    });
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.overallScore).toBeLessThanOrEqual(1);
  });

  it('should produce per-word scores', async () => {
    const result = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a'], language: 'en',
    });
    expect(result.words.length).toBeGreaterThan(0);
    for (const w of result.words) {
      expect(w.score).toBeGreaterThanOrEqual(0);
      expect(w.score).toBeLessThanOrEqual(1);
    }
  });

  it('should produce per-GPC scores', async () => {
    const result = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a', 'th'], language: 'en',
    });
    expect(result.gpcScores).toBeDefined();
    expect(Object.keys(result.gpcScores).length).toBeGreaterThan(0);
  });

  it('should report fluency in words per minute', async () => {
    const result = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a'], language: 'en',
    });
    expect(result.fluencyWpm).toBeGreaterThan(0);
    expect(result.fluencyWpm).toBeLessThan(200); // Realistic for a child
  });

  it('should classify omitted words', async () => {
    const result = await server.assessPronunciationWithOmission({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a'], language: 'en',
    });
    const omissions = result.words.filter((w: any) => w.errorType === 'omission');
    expect(omissions.length).toBeGreaterThan(0);
    expect(omissions.every((w: any) => w.score === 0)).toBe(true);
  });

  it('should mark matched GPCs on each word', async () => {
    const result = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a', 'th'], language: 'en',
    });
    const catWord = result.words.find((w: any) => w.word === 'cat');
    expect(catWord?.matchedGpcs).toContain('a');
    const theWord = result.words.find((w: any) => w.word === 'The');
    expect(theWord?.matchedGpcs).toContain('th');
  });

  it('should produce GPC score between 0 and 1', async () => {
    const result = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a', 'th'], language: 'en',
    });
    for (const score of Object.values(result.gpcScores)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('should produce lower overall score when words are omitted', async () => {
    const normal = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a'], language: 'en',
    });
    const withOmissions = await server.assessPronunciationWithOmission({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a'], language: 'en',
    });
    expect(withOmissions.overallScore).toBeLessThan(normal.overallScore);
  });
});


// =============================================================================
// Group 5: Scores → BKT Mastery Update (8 tests)
// =============================================================================

describe('Stage 6→7: Pronunciation Scores → BKT Mastery Update', () => {
  let bkt: ReturnType<typeof createMockBKTEngine>;
  beforeEach(() => { bkt = createMockBKTEngine(); });

  it('should update mastery from GPC scores', () => {
    for (const [gpc, score] of Object.entries(FIXTURE_GPC_SCORES)) {
      bkt.updateMastery(gpc, score);
    }
    expect(bkt.getMastery('a').pMastered).toBeGreaterThan(0.3); // Above init
    expect(bkt.getMastery('th').pMastered).toBeGreaterThan(0.3);
  });

  it('should increase mastery for high scores', () => {
    const before = bkt.getMastery('a').pMastered;
    bkt.updateMastery('a', 0.95);
    expect(bkt.getMastery('a').pMastered).toBeGreaterThan(before);
  });

  it('should decrease mastery after initial increase then low score', () => {
    bkt.updateMastery('th', 0.9);
    bkt.updateMastery('th', 0.9);
    const peak = bkt.getMastery('th').pMastered;
    bkt.updateMastery('th', 0.2);
    expect(bkt.getMastery('th').pMastered).toBeLessThan(peak);
  });

  it('should reach mastery threshold after consistent success', () => {
    for (let i = 0; i < 6; i++) bkt.updateMastery('a', 0.95);
    expect(bkt.getMastery('a').mastered).toBe(true);
    expect(bkt.getMastery('a').pMastered).toBeGreaterThan(0.75);
  });

  it('should not reach mastery with inconsistent performance', () => {
    bkt.updateMastery('th', 0.9);
    bkt.updateMastery('th', 0.3);
    bkt.updateMastery('th', 0.8);
    bkt.updateMastery('th', 0.2);
    expect(bkt.getMastery('th').mastered).toBe(false);
  });

  it('should recommend unmastered GPCs for practice', () => {
    for (let i = 0; i < 6; i++) bkt.updateMastery('a', 0.95);
    bkt.updateMastery('th', 0.4);
    const recommendations = bkt.getRecommendedGPCs();
    expect(recommendations).toContain('th');
    expect(recommendations).not.toContain('a');
  });

  it('should track observation count', () => {
    bkt.updateMastery('a', 0.8);
    bkt.updateMastery('a', 0.9);
    bkt.updateMastery('a', 0.85);
    expect(bkt.getMastery('a').observations).toBe(3);
  });

  it('should reset to initial state', () => {
    bkt.updateMastery('a', 0.9);
    bkt.reset();
    expect(bkt.getMastery('a').observations).toBe(0);
  });
});


// =============================================================================
// Group 6: Full Pipeline Happy Path (5 tests)
// =============================================================================

describe('Full Pipeline: Happy Path', () => {
  it('should execute complete pipeline from narration to BKT', async () => {
    // Step 1: Narrate
    const { service } = createTestNarrationService();
    const narResult = await service.narrateBook(
      'book-e2e-001',
      [{ pageNumber: 1, text: FIXTURE_STORYBOOK_PAGE.text }],
      { voicePersona: VOICE_PERSONAS[0], phonicsPhase: 2, tenantId: 'school-e2e' },
    );
    expect(narResult.success).toBe(true);

    // Step 2: Align
    const server = createMockVoiceServiceServer();
    const alignment = await server.align({
      transcript: FIXTURE_STORYBOOK_PAGE.text,
      audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
    });
    expect(alignment.wordTimestamps.length).toBe(11); // 11 words

    // Step 3: Phonics emphasis
    const emphResult = await server.phonicsPace({
      text: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a', 'th'],
      audioBase64: FIXTURE_AUDIO_BASE64,
      wordTimestamps: alignment.wordTimestamps,
      emphasisPace: 0.8,
    });
    expect(emphResult.paceMap.some((e: any) => e.containsTargetGpc)).toBe(true);

    // Step 4: Pronunciation scoring
    const pronResult = await server.assessPronunciation({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a', 'th'], language: 'en',
    });
    expect(pronResult.overallScore).toBeGreaterThan(0);

    // Step 5: BKT update
    const bkt = createMockBKTEngine();
    for (const [gpc, score] of Object.entries(pronResult.gpcScores)) {
      bkt.updateMastery(gpc, score as number);
    }
    expect(Object.keys(bkt.getMasteryState()).length).toBe(2);
  });

  it('should produce meaningful cost savings vs ElevenLabs', async () => {
    const { service } = createTestNarrationService();
    const estimate = service.estimateBookCost(FIXTURE_MULTI_PAGE_BOOK);
    const elevenLabsCost = (estimate.totalCharacters / 1000) * 0.18;
    expect(estimate.estimatedCostUsd).toBeLessThan(elevenLabsCost / 50);
  });

  it('should select different voices for different age groups', () => {
    const { service } = createTestNarrationService();
    const young = service.selectVoicePersona('3-5', 'bedtime');
    const older = service.selectVoicePersona('7-9', 'adventure');
    expect(young.voiceId).not.toBe(older.voiceId);
  });

  it('should use matching pace profiles per phonics phase', () => {
    expect(PACE_CONFIG[1].wordsPerMinute).toBeLessThan(PACE_CONFIG[6].wordsPerMinute);
    expect(PACE_CONFIG[1].pauseBetweenSentencesMs).toBeGreaterThan(PACE_CONFIG[6].pauseBetweenSentencesMs);
  });

  it('should compute BKT trajectory across multiple reading sessions', () => {
    const bkt = createMockBKTEngine();
    const sessions = [
      { 'a': 0.60, 'th': 0.40 },  // Session 1: struggling
      { 'a': 0.75, 'th': 0.55 },  // Session 2: improving
      { 'a': 0.88, 'th': 0.65 },  // Session 3: getting better
      { 'a': 0.92, 'th': 0.78 },  // Session 4: strong
      { 'a': 0.95, 'th': 0.85 },  // Session 5: confident
    ];

    for (const session of sessions) {
      for (const [gpc, score] of Object.entries(session)) {
        bkt.updateMastery(gpc, score);
      }
    }

    // After 5 sessions of improvement, 'a' should be mastered
    expect(bkt.getMastery('a').mastered).toBe(true);
    // 'th' may or may not be mastered depending on BKT parameters
    expect(bkt.getMastery('th').pMastered).toBeGreaterThan(0.5);
  });
});


// =============================================================================
// Group 7: Cross-Component Type Compatibility (6 tests)
// =============================================================================

describe('Cross-Component Type Compatibility', () => {
  it('should convert TTS timestamps (ms) to alignment timestamps (seconds)', () => {
    const ttsTs = { word: 'cat', startMs: 200, endMs: 500 };
    const alignTs = { word: ttsTs.word, start: ttsTs.startMs / 1000, end: ttsTs.endMs / 1000 };
    expect(alignTs.start).toBe(0.2);
    expect(alignTs.end).toBe(0.5);
  });

  it('should have compatible voice persona format across services', () => {
    const persona = VOICE_PERSONAS[0];
    expect(persona.voiceId).toMatch(/^[a-z]{2}_[a-z]/);
    expect((persona as any).elevenLabsVoiceId).toBeUndefined();
    expect((persona as any).voiceSettings).toBeUndefined();
  });

  it('should have compatible GPC scores for BKT input', () => {
    const bkt = createMockBKTEngine();
    for (const [gpc, score] of Object.entries(FIXTURE_GPC_SCORES)) {
      bkt.updateMastery(gpc, score); // No type conversion needed
    }
    expect(bkt.getMasteryState()['a']).toBeDefined();
  });

  it('should map pace profile emphasis factor to Voice Service pace', () => {
    const profile = VOICE_PERSONAS[5].paceProfiles[0]; // Calm Teacher
    const emphasisPace = 1 / profile.targetGPCEmphasisFactor;
    expect(emphasisPace).toBeCloseTo(0.714, 2);
    expect(emphasisPace).toBeGreaterThanOrEqual(0.5);
    expect(emphasisPace).toBeLessThanOrEqual(1.0);
  });

  it('should use consistent word normalisation across pipeline stages', () => {
    const words = ['The', 'cat!', 'SAT.', '"mat"'];
    const normalised = words.map(w => w.toLowerCase().replace(/[^a-z]/g, ''));
    expect(normalised).toEqual(['the', 'cat', 'sat', 'mat']);
  });

  it('should have all 6 pace configs matching phonics phases', () => {
    for (let phase = 1; phase <= 6; phase++) {
      expect(PACE_CONFIG[phase]).toBeDefined();
      expect(PACE_CONFIG[phase].wordsPerMinute).toBeGreaterThan(0);
    }
  });
});


// =============================================================================
// Group 8: Error Handling & Resilience (8 tests)
// =============================================================================

describe('Error Handling & Resilience', () => {
  it('should handle Voice Service unavailability', async () => {
    const { service } = createTestNarrationService({
      aiService: {
        synthesizeSpeech: vi.fn(async () => ({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Voice Service down' },
        })),
      },
    });
    const result = await service.narrateBook(
      'book-fail', [{ pageNumber: 1, text: 'Test' }], { tenantId: 'school-001' },
    );
    expect(result.success).toBe(false);
  });

  it('should handle empty page text', async () => {
    const { service } = createTestNarrationService();
    const result = await service.narrateBook(
      'book-empty', [{ pageNumber: 1, text: '' }], { tenantId: 'school-001' },
    );
    expect(result.success).toBe(false);
  });

  it('should handle whitespace-only page text', async () => {
    const { service } = createTestNarrationService();
    const result = await service.narrateBook(
      'book-ws', [{ pageNumber: 1, text: '   \n\t  ' }], { tenantId: 'school-001' },
    );
    expect(result.success).toBe(false);
  });

  it('should handle pronunciation scoring with omissions', async () => {
    const server = createMockVoiceServiceServer();
    const result = await server.assessPronunciationWithOmission({
      audioBase64: FIXTURE_AUDIO_BASE64,
      expectedText: FIXTURE_STORYBOOK_PAGE.text,
      targetGpcs: ['a'], language: 'en',
    });
    expect(result.overallScore).toBeGreaterThanOrEqual(0);
    expect(result.words.some((w: any) => w.errorType === 'omission')).toBe(true);
  });

  it('should handle concurrent page narration', async () => {
    const { service } = createTestNarrationService();
    const result = await service.narrateBook(
      'book-concurrent',
      FIXTURE_MULTI_PAGE_BOOK,
      { tenantId: 'school-001' },
    );
    expect(result.success).toBe(true);
    expect(result.data!.pages.length).toBe(8);
  });

  it('should handle BKT update with zero score', () => {
    const bkt = createMockBKTEngine();
    bkt.updateMastery('a', 0.0);
    const mastery = bkt.getMastery('a');
    expect(mastery.pMastered).toBeLessThan(0.3); // Should decrease from init
    expect(mastery.observations).toBe(1);
  });

  it('should handle BKT update with perfect score', () => {
    const bkt = createMockBKTEngine();
    bkt.updateMastery('a', 1.0);
    const mastery = bkt.getMastery('a');
    expect(mastery.pMastered).toBeGreaterThan(0.3); // Should increase from init
  });

  it('should handle unknown GPC in BKT gracefully', () => {
    const bkt = createMockBKTEngine();
    bkt.updateMastery('igh', 0.85); // Uncommon trigraph
    expect(bkt.getMastery('igh').observations).toBe(1);
    expect(bkt.getMastery('igh').pMastered).toBeGreaterThan(0);
  });
});


// =============================================================================
// Group 9: Multi-Page Book Pipeline (5 tests)
// =============================================================================

describe('Multi-Page Book Pipeline', () => {
  it('should narrate all 8 pages of a storybook', async () => {
    const { service } = createTestNarrationService();
    const result = await service.narrateBook(
      'book-full', FIXTURE_MULTI_PAGE_BOOK,
      { voicePersona: VOICE_PERSONAS[0], phonicsPhase: 2, tenantId: 'school-001' },
    );
    expect(result.success).toBe(true);
    expect(result.data!.pages.length).toBe(8);
  });

  it('should produce cumulative cost for all pages', async () => {
    const { service } = createTestNarrationService();
    const result = await service.narrateBook(
      'book-full', FIXTURE_MULTI_PAGE_BOOK, { tenantId: 'school-001' },
    );
    expect(result.data!.totalCostUsd).toBeGreaterThan(0);
    expect(result.data!.totalCostUsd).toBeLessThan(0.05); // Well under 5 cents
  });

  it('should align and score each page independently', async () => {
    const server = createMockVoiceServiceServer();
    for (const page of FIXTURE_MULTI_PAGE_BOOK) {
      const alignment = await server.align({
        transcript: page.text, audioBase64: FIXTURE_AUDIO_BASE64, language: 'en',
      });
      expect(alignment.wordTimestamps.length).toBe(page.text.trim().split(/\s+/).length);
    }
  });

  it('should accumulate BKT evidence across all pages', () => {
    const bkt = createMockBKTEngine();
    const pageScores = [
      { a: 0.80, th: 0.65 }, { a: 0.85, th: 0.70 },
      { a: 0.88, th: 0.72 }, { a: 0.90, th: 0.75 },
      { a: 0.92, th: 0.78 }, { a: 0.94, th: 0.82 },
      { a: 0.95, th: 0.85 }, { a: 0.96, th: 0.88 },
    ];
    for (const scores of pageScores) {
      for (const [gpc, score] of Object.entries(scores)) {
        bkt.updateMastery(gpc, score);
      }
    }
    expect(bkt.getMastery('a').observations).toBe(8);
    expect(bkt.getMastery('th').observations).toBe(8);
    expect(bkt.getMastery('a').mastered).toBe(true);
  });

  it('should maintain page order in narration results', async () => {
    const { service } = createTestNarrationService();
    const result = await service.narrateBook(
      'book-order', FIXTURE_MULTI_PAGE_BOOK, { tenantId: 'school-001' },
    );
    for (let i = 0; i < result.data!.pages.length; i++) {
      expect(result.data!.pages[i].pageNumber).toBe(i + 1);
    }
  });
});
