// =============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 4
// E2E Test Fixtures: Realistic Mock Data for Voice Pipeline
// =============================================================================
//
// These fixtures simulate the real data that flows through the seven stages
// of the voice pipeline. Each fixture is modelled on actual Scholarly content:
// Phase 2 phonics, 'a' and 'th' as target GPCs, age 5–7 learner profile.
//
// The fixtures are designed to be internally consistent — the word timestamps
// match the text, the phoneme scores match the GPCs in the words, and the
// BKT parameters produce plausible mastery trajectories.
// =============================================================================

import { vi } from 'vitest';

// =============================================================================
// Section 1: Storybook Content Fixtures
// =============================================================================

export const FIXTURE_STORYBOOK_PAGE = {
  bookId: 'book-e2e-001',
  pageNumber: 1,
  text: 'The cat sat on the mat. That is a fat cat.',
  phonicsPhase: 2,
  targetGPCs: ['a', 'th'],
  taughtGPCSet: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'e', 'th'],
  decodabilityScore: 0.92,
  wcpmBand: [30, 60] as [number, number],
  ageGroup: '5-7',
  theme: 'animals',
};

export const FIXTURE_MULTI_PAGE_BOOK = [
  { pageNumber: 1, text: 'The cat sat on the mat.' },
  { pageNumber: 2, text: 'That is a fat cat.' },
  { pageNumber: 3, text: 'The cat had a nap on the mat.' },
  { pageNumber: 4, text: 'Then the cat ran and ran.' },
  { pageNumber: 5, text: 'The cat sat on a hat!' },
  { pageNumber: 6, text: 'That made the man mad.' },
  { pageNumber: 7, text: 'The cat hid in a pan.' },
  { pageNumber: 8, text: 'The man and the cat had a pat.' },
];


// =============================================================================
// Section 2: Audio Fixtures
// =============================================================================

// Minimal valid WAV header + 0.5s of silence at 16kHz mono 16-bit
function generateMinimalWav(): string {
  const sampleRate = 16000;
  const duration = 0.5;
  const numSamples = Math.floor(sampleRate * duration);
  const dataSize = numSamples * 2;
  const buffer = Buffer.alloc(44 + dataSize);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);   // PCM
  buffer.writeUInt16LE(1, 22);   // mono
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataSize, 40);
  // Silence (zeros already in buffer)

  return buffer.toString('base64');
}

export const FIXTURE_AUDIO_BASE64 = generateMinimalWav();


// =============================================================================
// Section 3: Word Timestamp Fixtures
// =============================================================================

function generateWordTimestamps(text: string, startTime = 0.0, wordDuration = 0.25, gap = 0.05) {
  const words = text.trim().split(/\s+/);
  let current = startTime;
  return words.map(word => {
    const ts = {
      word: word.replace(/[.!?,;:]/g, ''),
      start: Math.round(current * 1000) / 1000,
      end: Math.round((current + wordDuration) * 1000) / 1000,
      confidence: 0.85 + Math.random() * 0.15,
    };
    current += wordDuration + gap;
    return ts;
  });
}

export const FIXTURE_WORD_TIMESTAMPS = generateWordTimestamps(FIXTURE_STORYBOOK_PAGE.text);

export const FIXTURE_MULTI_PAGE_TIMESTAMPS = FIXTURE_MULTI_PAGE_BOOK.map(
  page => generateWordTimestamps(page.text),
);


// =============================================================================
// Section 4: Phoneme Timestamp Fixtures
// =============================================================================

export const FIXTURE_PHONEME_TIMESTAMPS = [
  // "The" → /ð/ /ə/
  { phoneme: 'ð', start: 0.0, end: 0.08, score: 0.78 },
  { phoneme: 'ə', start: 0.08, end: 0.15, score: 0.85 },
  // "cat" → /k/ /æ/ /t/
  { phoneme: 'k', start: 0.30, end: 0.38, score: 0.92 },
  { phoneme: 'æ', start: 0.38, end: 0.48, score: 0.88 },
  { phoneme: 't', start: 0.48, end: 0.55, score: 0.91 },
  // "sat" → /s/ /æ/ /t/
  { phoneme: 's', start: 0.60, end: 0.68, score: 0.94 },
  { phoneme: 'æ', start: 0.68, end: 0.78, score: 0.82 },
  { phoneme: 't', start: 0.78, end: 0.85, score: 0.90 },
  // "on" → /ɒ/ /n/
  { phoneme: 'ɒ', start: 0.90, end: 0.98, score: 0.87 },
  { phoneme: 'n', start: 0.98, end: 1.05, score: 0.93 },
  // "the" → /ð/ /ə/
  { phoneme: 'ð', start: 1.10, end: 1.18, score: 0.72 },
  { phoneme: 'ə', start: 1.18, end: 1.25, score: 0.88 },
  // "mat" → /m/ /æ/ /t/
  { phoneme: 'm', start: 1.30, end: 1.38, score: 0.95 },
  { phoneme: 'æ', start: 1.38, end: 1.48, score: 0.86 },
  { phoneme: 't', start: 1.48, end: 1.55, score: 0.89 },
  // "That" → /ð/ /æ/ /t/
  { phoneme: 'ð', start: 1.80, end: 1.88, score: 0.68 },
  { phoneme: 'æ', start: 1.88, end: 1.98, score: 0.84 },
  { phoneme: 't', start: 1.98, end: 2.05, score: 0.91 },
  // "is" → /ɪ/ /z/
  { phoneme: 'ɪ', start: 2.10, end: 2.18, score: 0.90 },
  { phoneme: 'z', start: 2.18, end: 2.25, score: 0.88 },
  // "a" → /ə/
  { phoneme: 'ə', start: 2.30, end: 2.38, score: 0.92 },
  // "fat" → /f/ /æ/ /t/
  { phoneme: 'f', start: 2.40, end: 2.48, score: 0.93 },
  { phoneme: 'æ', start: 2.48, end: 2.58, score: 0.87 },
  { phoneme: 't', start: 2.58, end: 2.65, score: 0.90 },
  // "cat" → /k/ /æ/ /t/
  { phoneme: 'k', start: 2.70, end: 2.78, score: 0.91 },
  { phoneme: 'æ', start: 2.78, end: 2.88, score: 0.85 },
  { phoneme: 't', start: 2.88, end: 2.95, score: 0.89 },
];


// =============================================================================
// Section 5: Pronunciation Scoring Fixtures
// =============================================================================

export const FIXTURE_PRONUNCIATION_SCORES = {
  overallScore: 0.83,
  fluencyWpm: 42,
  durationSeconds: 3.2,
  words: [
    { word: 'The', expected: 'The', score: 0.78, errorType: null, matchedGpcs: ['th'] },
    { word: 'cat', expected: 'cat', score: 0.88, errorType: null, matchedGpcs: ['a'] },
    { word: 'sat', expected: 'sat', score: 0.85, errorType: null, matchedGpcs: ['a'] },
    { word: 'on', expected: 'on', score: 0.90, errorType: null, matchedGpcs: [] },
    { word: 'the', expected: 'the', score: 0.72, errorType: null, matchedGpcs: ['th'] },
    { word: 'mat', expected: 'mat', score: 0.86, errorType: null, matchedGpcs: ['a'] },
    { word: 'That', expected: 'That', score: 0.68, errorType: null, matchedGpcs: ['th', 'a'] },
    { word: 'is', expected: 'is', score: 0.91, errorType: null, matchedGpcs: [] },
    { word: 'a', expected: 'a', score: 0.92, errorType: null, matchedGpcs: ['a'] },
    { word: 'fat', expected: 'fat', score: 0.87, errorType: null, matchedGpcs: ['a'] },
    { word: 'cat', expected: 'cat', score: 0.85, errorType: null, matchedGpcs: ['a'] },
  ],
  gpcScores: {
    'a': 0.86,  // Average of cat(0.88) + sat(0.85) + mat(0.86) + That(0.68) + a(0.92) + fat(0.87) + cat(0.85)
    'th': 0.73, // Average of The(0.78) + the(0.72) + That(0.68)
  },
};

export const FIXTURE_PRONUNCIATION_WITH_OMISSION = {
  ...FIXTURE_PRONUNCIATION_SCORES,
  overallScore: 0.65,
  words: [
    { word: 'The', expected: 'The', score: 0.78, errorType: null, matchedGpcs: ['th'] },
    { word: 'cat', expected: 'cat', score: 0.88, errorType: null, matchedGpcs: ['a'] },
    { word: '', expected: 'sat', score: 0.0, errorType: 'omission', matchedGpcs: ['a'] },
    { word: 'on', expected: 'on', score: 0.90, errorType: null, matchedGpcs: [] },
    { word: 'the', expected: 'the', score: 0.72, errorType: null, matchedGpcs: ['th'] },
    { word: '', expected: 'mat', score: 0.0, errorType: 'omission', matchedGpcs: ['a'] },
    { word: 'That', expected: 'That', score: 0.68, errorType: null, matchedGpcs: ['th', 'a'] },
    { word: 'is', expected: 'is', score: 0.91, errorType: null, matchedGpcs: [] },
    { word: 'a', expected: 'a', score: 0.92, errorType: null, matchedGpcs: ['a'] },
    { word: 'fat', expected: 'fat', score: 0.87, errorType: null, matchedGpcs: ['a'] },
    { word: 'cat', expected: 'cat', score: 0.85, errorType: null, matchedGpcs: ['a'] },
  ],
};

export const FIXTURE_GPC_SCORES: Record<string, number> = {
  'a': 0.86,
  'th': 0.73,
};


// =============================================================================
// Section 6: Pace Map Fixtures
// =============================================================================

export const FIXTURE_PACE_MAP = FIXTURE_WORD_TIMESTAMPS.map(wt => {
  const targetGpcs = FIXTURE_STORYBOOK_PAGE.targetGPCs;
  const wordLower = wt.word.toLowerCase();
  const matchedGpcs: string[] = [];

  if (wordLower.includes('th')) matchedGpcs.push('th');
  if (/[aeiou]/.test(wordLower) && targetGpcs.includes('a') &&
      ['cat', 'sat', 'mat', 'that', 'fat', 'a'].includes(wordLower)) {
    matchedGpcs.push('a');
  }

  const containsTargetGpc = matchedGpcs.length > 0;
  const paceFactor = matchedGpcs.length >= 2 ? 0.65 : containsTargetGpc ? 0.8 : 1.0;

  return {
    word: wt.word,
    originalStart: wt.start,
    originalEnd: wt.end,
    adjustedStart: wt.start,
    adjustedEnd: wt.end * (1 / paceFactor),
    paceFactor,
    containsTargetGpc,
    matchedGpcs,
  };
});


// =============================================================================
// Section 7: Mock Service Factories
// =============================================================================

/**
 * Creates a mock Voice Service server that simulates the REST API endpoints.
 * Returns methods matching the Voice Service's route handlers.
 */
export function createMockVoiceServiceServer() {
  return {
    /** POST /api/v1/stt/align */
    align: vi.fn(async (request: {
      transcript: string;
      audioBase64: string;
      language: string;
    }) => ({
      wordTimestamps: generateWordTimestamps(request.transcript),
      phonemeTimestamps: FIXTURE_PHONEME_TIMESTAMPS,
      durationSeconds: request.transcript.split(/\s+/).length * 0.3,
      language: request.language,
    })),

    /** POST /api/v1/studio/phonics-pace */
    phonicsPace: vi.fn(async (request: {
      text: string;
      targetGpcs: string[];
      audioBase64: string;
      wordTimestamps: Array<{ word: string; start: number; end: number }>;
      emphasisPace: number;
    }) => {
      const words = request.text.trim().split(/\s+/);
      const paceMap = words.map((word, i) => {
        const wl = word.toLowerCase().replace(/[^a-z]/g, '');
        const matched: string[] = [];
        for (const gpc of request.targetGpcs) {
          if (gpc.length === 1 && ['cat', 'sat', 'mat', 'that', 'fat', 'a', 'had', 'nap', 'ran', 'hat', 'man', 'mad', 'pan', 'pat'].includes(wl) && gpc === 'a') matched.push(gpc);
          if (gpc === 'th' && wl.startsWith('th')) matched.push(gpc);
        }
        const containsTargetGpc = matched.length > 0;
        const pf = matched.length >= 2 ? 0.65 : containsTargetGpc ? request.emphasisPace : 1.0;
        const ts = request.wordTimestamps[i] ?? { start: i * 0.3, end: (i + 1) * 0.3 };
        return {
          word: wl,
          paceFactor: pf,
          containsTargetGpc,
          matchedGpcs: matched,
          originalStart: ts.start,
          originalEnd: ts.end,
        };
      });

      const durationFactor = paceMap.reduce((sum, e) => sum + (1 / e.paceFactor), 0) / paceMap.length;
      const originalDuration = (request.wordTimestamps[request.wordTimestamps.length - 1]?.end ?? 1) || 1;

      return {
        audioBase64: request.audioBase64,
        durationSeconds: originalDuration * durationFactor,
        paceMap,
        wordTimestamps: paceMap.map((e, i) => ({
          word: e.word,
          start: i * 0.3,
          end: (i * 0.3) + (0.25 / e.paceFactor),
        })),
        emphasisSummary: {
          totalWords: words.length,
          emphasisedWords: paceMap.filter(e => e.containsTargetGpc).length,
          durationIncrease: ((durationFactor - 1) * 100).toFixed(1) + '%',
        },
      };
    }),

    /** POST /api/v1/stt/assess-pronunciation/enhanced */
    assessPronunciation: vi.fn(async (_request: {
      audioBase64: string;
      expectedText: string;
      targetGpcs: string[];
      language: string;
    }) => ({
      ...FIXTURE_PRONUNCIATION_SCORES,
    })),

    /** Variant with omissions */
    assessPronunciationWithOmission: vi.fn(async (_request: {
      audioBase64: string;
      expectedText: string;
      targetGpcs: string[];
      language: string;
    }) => ({
      ...FIXTURE_PRONUNCIATION_WITH_OMISSION,
    })),
  };
}


/**
 * Creates a mock AIService that simulates the AIPAL facade.
 * Responds with realistic TTS synthesis results.
 */
export function createMockAIService() {
  return {
    synthesizeSpeech: vi.fn(async (request: {
      text: string;
      voiceId: string;
      tenantId: string;
      tier?: string;
      speed?: number;
      wordTimestamps?: boolean;
    }) => ({
      success: true,
      data: {
        audioBase64: FIXTURE_AUDIO_BASE64,
        audioMimeType: 'audio/wav',
        durationMs: Math.round(request.text.length * 25),
        wordTimestamps: request.wordTimestamps
          ? generateWordTimestamps(request.text).map(wt => ({
              word: wt.word,
              startMs: Math.round(wt.start * 1000),
              endMs: Math.round(wt.end * 1000),
            }))
          : undefined,
      },
      usage: { costUsd: (request.text.length / 1000) * 0.002 },
    })),
  };
}


/**
 * Creates a mock BKT engine with standard parameters for Phase 2 phonics.
 *
 * BKT Parameters:
 *   pInit  = 0.30  (30% initial mastery probability)
 *   pLearn = 0.10  (10% chance of learning per opportunity)
 *   pSlip  = 0.10  (10% chance of slip: knows but gets wrong)
 *   pGuess = 0.20  (20% chance of guess: doesn't know but gets right)
 *
 * These are standard BKT parameters for phonics — slightly easier learning
 * rate than general knowledge because GPC mapping is a concrete skill.
 */
export function createMockBKTEngine() {
  const state: Record<string, { pMastered: number; observations: number; mastered: boolean }> = {};

  const pLearn = 0.10;
  const pSlip = 0.10;
  const pGuess = 0.20;
  const pInit = 0.30;
  const masteryThreshold = 0.75;

  return {
    updateMastery(gpc: string, score: number) {
      if (!state[gpc]) {
        state[gpc] = { pMastered: pInit, observations: 0, mastered: false };
      }

      const entry = state[gpc];
      const isCorrect = score >= 0.6;

      // BKT posterior update
      const pCorrectGivenMastered = 1 - pSlip;
      const pCorrectGivenUnmastered = pGuess;
      const pCorrect = entry.pMastered * pCorrectGivenMastered +
                        (1 - entry.pMastered) * pCorrectGivenUnmastered;

      let pMasteredPosterior: number;
      if (isCorrect) {
        pMasteredPosterior = (entry.pMastered * pCorrectGivenMastered) / pCorrect;
      } else {
        const pIncorrect = 1 - pCorrect;
        pMasteredPosterior = (entry.pMastered * pSlip) / pIncorrect;
      }

      // Learning transition
      entry.pMastered = pMasteredPosterior + (1 - pMasteredPosterior) * pLearn;
      entry.observations += 1;
      entry.mastered = entry.pMastered >= masteryThreshold;
    },

    getMastery(gpc: string) {
      return state[gpc] ?? { pMastered: pInit, observations: 0, mastered: false };
    },

    getMasteryState() {
      return { ...state };
    },

    getRecommendedGPCs(): string[] {
      return Object.entries(state)
        .filter(([_, s]) => !s.mastered)
        .sort((a, b) => a[1].pMastered - b[1].pMastered)
        .map(([gpc]) => gpc);
    },

    getMasteredGPCs(): string[] {
      return Object.entries(state)
        .filter(([_, s]) => s.mastered)
        .map(([gpc]) => gpc);
    },

    reset() {
      for (const key of Object.keys(state)) {
        delete state[key];
      }
    },
  };
}
