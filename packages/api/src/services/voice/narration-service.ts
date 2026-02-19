// =============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 3
// NarrationService (Post-ElevenLabs Removal)
// =============================================================================
//
// This is the rewritten NarrationService. The public interface is unchanged —
// narrateBook(), narratePage(), selectVoicePersona(), estimateBookCost() all
// have the same signatures. What changed is the plumbing underneath:
//
// BEFORE (Sprint 21):
//   NarrationService → ElevenLabsTTSClient → api.elevenlabs.io
//   - Direct coupling to ElevenLabs API
//   - $0.18/1000 chars pricing
//   - ElevenLabs voice IDs hardcoded in persona definitions
//   - SSML-based voice settings (stability, similarityBoost, style)
//
// AFTER (Sprint 30):
//   NarrationService → AIService → RoutingEngine → ScholarlyVoiceAdapter → Voice Service
//   - Provider-agnostic via AIPAL
//   - ~$0.002/1000 chars (90x cheaper)
//   - Kokoro voice IDs in persona definitions
//   - Pace/pitch/warmth controls via Voice Service
//
// The consuming code (Storybook Engine, interactive reader, content SDK)
// calls the same methods and gets the same return types. The $15k/month
// ElevenLabs bill simply disappears.
//
// Dependencies:
//   Sprint 1:  AIService (AIPAL facade)
//   Sprint 30 Wk1: ScholarlyVoiceAdapter (ISpeechProvider implementation)
//   Sprint 30 Wk1: VOICE_PERSONA_MAPPINGS (Kokoro voice definitions)
// =============================================================================

import { Result, ok, fail, ScholarlyError } from '../ai/shared/base';

// ==========================================================================
// Section 1: Type Definitions (ElevenLabs-specific types REMOVED)
// ==========================================================================

/**
 * Voice persona — now uses Kokoro voice IDs instead of ElevenLabs IDs.
 *
 * REMOVED: elevenLabsVoiceId, voiceSettings (stability/similarityBoost/
 * style/useSpeakerBoost), ssmlDefaults. These were ElevenLabs-specific
 * parameters with no equivalent in the self-hosted stack.
 *
 * ADDED: voiceId (Kokoro ID), paceDefault, pitchDefault, warmthDefault.
 * These map to the Voice Service's audio processing controls.
 */
export interface VoicePersona {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  /** Kokoro voice ID (e.g., 'af_bella') or clone reference ('clone:prof_123') */
  readonly voiceId: string;
  /** Default pace multiplier (0.5–2.0, 1.0 = normal) */
  readonly paceDefault: number;
  /** Default pitch shift in semitones (-6 to +6) */
  readonly pitchDefault: number;
  /** Default warmth EQ (-6 to +6, positive = warmer) */
  readonly warmthDefault: number;
  readonly suitableAgeGroups: string[];
  readonly suitableThemes: string[];
  readonly seriesAssignments: string[];
  readonly paceProfiles: PaceProfile[];
}

export interface PaceProfile {
  readonly name: string;
  readonly wordsPerMinute: number;
  readonly pauseBetweenSentencesMs: number;
  readonly pauseBetweenParagraphsMs: number;
  readonly pauseOnPageTurnMs: number;
  readonly emphasiseTargetGPCWords: boolean;
  readonly targetGPCEmphasisFactor: number;
  readonly suitablePhases: number[];
  readonly suitableWCPMBands: [number, number];
}

export interface NarrationRequest {
  readonly storybookId: string;
  readonly tenantId: string;
  readonly pages: PageNarrationRequest[];
  readonly voicePersonaId?: string;
  readonly paceProfileName?: string;
  readonly seriesId?: string;
  readonly targetGPCs?: string[];
}

export interface PageNarrationRequest {
  readonly pageNumber: number;
  readonly text: string;
  readonly targetGPCs?: string[];
}

export interface PageNarration {
  readonly pageNumber: number;
  readonly audioUrl: string;
  readonly durationMs: number;
  readonly wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>;
  readonly characterCount: number;
  readonly costUsd: number;
}

export interface StorybookNarration {
  readonly storybookId: string;
  readonly voicePersonaId: string;
  readonly pages: PageNarration[];
  readonly totalDurationMs: number;
  readonly totalCharacters: number;
  readonly totalCostUsd: number;
}

// ==========================================================================
// Section 2: Voice Persona Library (Kokoro Voice IDs)
// ==========================================================================

/**
 * Voice persona definitions — now using Kokoro voice IDs from the
 * Sprint 30 Week 1 VOICE_PERSONA_MAPPINGS.
 *
 * Each persona was re-cast from its ElevenLabs voice actor to a Kokoro
 * equivalent selected by matching vocal characteristics (gender, warmth,
 * energy, accent) to the persona's target audience and story themes.
 */
export const VOICE_PERSONAS: readonly VoicePersona[] = [
  {
    id: 'vp-warm-storyteller',
    name: 'Warm Storyteller',
    description: 'Gentle, warm narrator for bedtime stories and early readers (ages 3–6)',
    voiceId: 'af_bella',
    paceDefault: 1.0,
    pitchDefault: 0.0,
    warmthDefault: 2.0,
    suitableAgeGroups: ['3-5', '5-7'],
    suitableThemes: ['bedtime', 'family', 'nature', 'feelings'],
    seriesAssignments: [],
    paceProfiles: [
      {
        name: 'early-reader',
        wordsPerMinute: 60,
        pauseBetweenSentencesMs: 800,
        pauseBetweenParagraphsMs: 1200,
        pauseOnPageTurnMs: 1500,
        emphasiseTargetGPCWords: true,
        targetGPCEmphasisFactor: 1.3,
        suitablePhases: [1, 2],
        suitableWCPMBands: [20, 50],
      },
    ],
  },
  {
    id: 'vp-wonder-guide',
    name: 'Wonder Guide',
    description: 'Clear, measured narrator for science and exploration stories (ages 5–8)',
    voiceId: 'am_adam',
    paceDefault: 1.0,
    pitchDefault: 0.0,
    warmthDefault: 0.0,
    suitableAgeGroups: ['5-7', '7-9'],
    suitableThemes: ['science', 'space', 'nature', 'discovery'],
    seriesAssignments: [],
    paceProfiles: [
      {
        name: 'explorer',
        wordsPerMinute: 90,
        pauseBetweenSentencesMs: 600,
        pauseBetweenParagraphsMs: 900,
        pauseOnPageTurnMs: 1000,
        emphasiseTargetGPCWords: true,
        targetGPCEmphasisFactor: 1.2,
        suitablePhases: [3, 4],
        suitableWCPMBands: [50, 90],
      },
    ],
  },
  {
    id: 'vp-cheerful-chef',
    name: 'Cheerful Chef',
    description: 'Bright, playful narrator for cumulative tales and food stories (ages 4–8)',
    voiceId: 'am_puck',
    paceDefault: 1.05,
    pitchDefault: 0.5,
    warmthDefault: 1.0,
    suitableAgeGroups: ['3-5', '5-7', '7-9'],
    suitableThemes: ['food', 'cooking', 'cumulative', 'rhyming'],
    seriesAssignments: [],
    paceProfiles: [
      {
        name: 'playful',
        wordsPerMinute: 100,
        pauseBetweenSentencesMs: 500,
        pauseBetweenParagraphsMs: 800,
        pauseOnPageTurnMs: 900,
        emphasiseTargetGPCWords: true,
        targetGPCEmphasisFactor: 1.25,
        suitablePhases: [2, 3, 4],
        suitableWCPMBands: [40, 100],
      },
    ],
  },
  {
    id: 'vp-adventure-narrator',
    name: 'Adventure Narrator',
    description: 'Energetic, dramatic narrator for adventure and mystery (ages 6–9)',
    voiceId: 'am_fenrir',
    paceDefault: 1.1,
    pitchDefault: 0.0,
    warmthDefault: -1.0,
    suitableAgeGroups: ['5-7', '7-9'],
    suitableThemes: ['adventure', 'mystery', 'robots', 'pirates', 'dragons'],
    seriesAssignments: [],
    paceProfiles: [
      {
        name: 'action',
        wordsPerMinute: 120,
        pauseBetweenSentencesMs: 400,
        pauseBetweenParagraphsMs: 700,
        pauseOnPageTurnMs: 800,
        emphasiseTargetGPCWords: true,
        targetGPCEmphasisFactor: 1.15,
        suitablePhases: [4, 5, 6],
        suitableWCPMBands: [80, 140],
      },
    ],
  },
  {
    id: 'vp-aussie-mate',
    name: 'Aussie Mate',
    description: 'Warm British English narrator for Australian-themed content (ages 4–8)',
    voiceId: 'bf_alice',
    paceDefault: 1.0,
    pitchDefault: 0.0,
    warmthDefault: 1.5,
    suitableAgeGroups: ['3-5', '5-7', '7-9'],
    suitableThemes: ['australian-animals', 'outback', 'beach', 'bush'],
    seriesAssignments: [],
    paceProfiles: [
      {
        name: 'aussie-standard',
        wordsPerMinute: 85,
        pauseBetweenSentencesMs: 650,
        pauseBetweenParagraphsMs: 1000,
        pauseOnPageTurnMs: 1100,
        emphasiseTargetGPCWords: true,
        targetGPCEmphasisFactor: 1.25,
        suitablePhases: [2, 3, 4, 5],
        suitableWCPMBands: [40, 110],
      },
    ],
  },
  {
    id: 'vp-calm-teacher',
    name: 'Calm Teacher',
    description: 'Patient, clear narrator for phonics-heavy content (ages 3–7)',
    voiceId: 'af_sarah',
    paceDefault: 0.9,
    pitchDefault: 0.0,
    warmthDefault: 1.0,
    suitableAgeGroups: ['3-5', '5-7'],
    suitableThemes: ['phonics', 'letters', 'sounds', 'learning'],
    seriesAssignments: [],
    paceProfiles: [
      {
        name: 'phonics-focus',
        wordsPerMinute: 55,
        pauseBetweenSentencesMs: 900,
        pauseBetweenParagraphsMs: 1400,
        pauseOnPageTurnMs: 1600,
        emphasiseTargetGPCWords: true,
        targetGPCEmphasisFactor: 1.4,
        suitablePhases: [1, 2, 3],
        suitableWCPMBands: [15, 50],
      },
    ],
  },
] as const;


// ==========================================================================
// Section 3: Pace Configuration (unchanged from Sprint 21)
// ==========================================================================

export const PACE_CONFIG: Record<number, {
  wordsPerMinute: number;
  pauseBetweenSentencesMs: number;
  pauseBetweenPagesMs: number;
}> = {
  1: { wordsPerMinute: 60, pauseBetweenSentencesMs: 800, pauseBetweenPagesMs: 1500 },
  2: { wordsPerMinute: 75, pauseBetweenSentencesMs: 700, pauseBetweenPagesMs: 1200 },
  3: { wordsPerMinute: 90, pauseBetweenSentencesMs: 600, pauseBetweenPagesMs: 1000 },
  4: { wordsPerMinute: 110, pauseBetweenSentencesMs: 500, pauseBetweenPagesMs: 800 },
  5: { wordsPerMinute: 130, pauseBetweenSentencesMs: 400, pauseBetweenPagesMs: 700 },
  6: { wordsPerMinute: 150, pauseBetweenSentencesMs: 350, pauseBetweenPagesMs: 600 },
};


// ==========================================================================
// Section 4: AIService Interface (from AIPAL)
// ==========================================================================

export interface AIService {
  synthesizeSpeech(request: {
    text: string;
    voiceId: string;
    tenantId: string;
    tier?: 'critical' | 'standard' | 'economy';
    speed?: number;
    wordTimestamps?: boolean;
  }): Promise<{
    success: boolean;
    data?: {
      audioBase64: string;
      audioMimeType: string;
      durationMs: number;
      wordTimestamps?: Array<{ word: string; startMs: number; endMs: number }>;
    };
    error?: ScholarlyError;
    usage?: { costUsd: number };
  }>;
}

export interface IStorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export interface IEventPublisher {
  publish(subject: string, data: unknown): Promise<void>;
}

export interface ILogger {
  info(msg: string, data?: Record<string, unknown>): void;
  warn(msg: string, data?: Record<string, unknown>): void;
  error(msg: string, data?: Record<string, unknown>): void;
  debug(msg: string, data?: Record<string, unknown>): void;
}

// ==========================================================================
// Section 5: NarrationServiceConfig (ElevenLabs fields REMOVED)
// ==========================================================================

/**
 * BEFORE (Sprint 21):
 *   elevenLabsApiKey: string;       ← REMOVED
 *   elevenLabsBaseUrl?: string;     ← REMOVED
 *   defaultModel?: string;          ← REMOVED (ElevenLabs model strings)
 *
 * AFTER (Sprint 30):
 *   aiService: AIService;           ← NEW (AIPAL facade)
 */
export interface NarrationServiceConfig {
  /** AIPAL facade — routes to ScholarlyVoiceAdapter → Voice Service */
  aiService: AIService;
  storageProvider: IStorageProvider;
  eventPublisher?: IEventPublisher;
  logger: ILogger;
  maxConcurrentPages?: number;
}


// ==========================================================================
// Section 6: NarrationService (Rewritten)
// ==========================================================================

export class NarrationService {
  private readonly aiService: AIService;
  private readonly config: NarrationServiceConfig;
  private readonly logger: ILogger;

  constructor(config: NarrationServiceConfig) {
    this.config = config;
    this.logger = config.logger;
    this.aiService = config.aiService;
  }

  /**
   * Generate narration for an entire storybook.
   * Public API unchanged from Sprint 21.
   */
  async narrateBook(
    storybookId: string,
    pages: Array<{ pageNumber: number; text: string }>,
    options: {
      voicePersona?: VoicePersona;
      phonicsPhase?: number;
      paceMultiplier?: number;
      tenantId?: string;
    } = {},
  ): Promise<Result<StorybookNarration>> {
    const persona = options.voicePersona ?? VOICE_PERSONAS[0];
    const phase = options.phonicsPhase ?? 3;
    const paceConfig = PACE_CONFIG[phase] ?? PACE_CONFIG[3];
    const tenantId = options.tenantId ?? 'default';

    const targetWPM = paceConfig.wordsPerMinute;
    const baseWPM = 130;
    const paceMultiplier = options.paceMultiplier ?? (targetWPM / baseWPM);

    const pageNarrations: PageNarration[] = [];
    let totalCost = 0;
    let totalDuration = 0;
    let totalChars = 0;

    const concurrency = this.config.maxConcurrentPages ?? 3;
    const batches = this.chunk(pages, concurrency);

    for (const batch of batches) {
      const results = await Promise.all(
        batch.map(page => this.narratePage(
          storybookId, page, persona, paceMultiplier, tenantId,
        )),
      );

      for (const result of results) {
        if (!result.success) {
          return fail(result.error);
        }
        pageNarrations.push(result.data);
        totalCost += result.data.costUsd;
        totalDuration += result.data.durationMs;
        totalChars += result.data.characterCount;
      }
    }

    return ok({
      storybookId,
      voicePersonaId: persona.id,
      pages: pageNarrations,
      totalDurationMs: totalDuration,
      totalCharacters: totalChars,
      totalCostUsd: totalCost,
    });
  }

  /**
   * Generate narration for a single page.
   *
   * BEFORE: this.ttsClient.generateWithTimestamps(text, voiceId, settings)
   * AFTER:  this.aiService.synthesizeSpeech({ text, voiceId, speed })
   */
  async narratePage(
    storybookId: string,
    page: { pageNumber: number; text: string },
    persona: VoicePersona,
    paceMultiplier: number,
    tenantId: string,
  ): Promise<Result<PageNarration>> {
    const text = page.text.trim();
    if (!text) {
      return fail({ code: 'EMPTY_PAGE', message: `Page ${page.pageNumber} has no text` });
    }

    try {
      const result = await this.aiService.synthesizeSpeech({
        text,
        voiceId: persona.voiceId,
        tenantId,
        tier: 'standard',
        speed: paceMultiplier * persona.paceDefault,
        wordTimestamps: true,
      });

      if (!result.success || !result.data) {
        return fail({
          code: 'NARRATION_FAILED',
          message: `TTS synthesis failed for page ${page.pageNumber}: ${result.error?.message}`,
        });
      }

      // Upload audio to storage
      const audioBuffer = Buffer.from(result.data.audioBase64, 'base64');
      const storagePath = `tenants/${tenantId}/storybooks/${storybookId}/audio/page-${page.pageNumber}.wav`;
      const audioUrl = await this.config.storageProvider.upload(
        storagePath, audioBuffer, result.data.audioMimeType,
      );

      const narration: PageNarration = {
        pageNumber: page.pageNumber,
        audioUrl,
        durationMs: result.data.durationMs,
        wordTimestamps: result.data.wordTimestamps ?? [],
        characterCount: text.length,
        costUsd: result.usage?.costUsd ?? 0,
      };

      // Publish event
      if (this.config.eventPublisher) {
        await this.config.eventPublisher.publish('storybook.page.narrated', {
          storybookId,
          pageNumber: page.pageNumber,
          voicePersonaId: persona.id,
          voiceId: persona.voiceId,
          durationMs: narration.durationMs,
          characterCount: narration.characterCount,
          costUsd: narration.costUsd,
        });
      }

      return ok(narration);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Narration failed', {
        storybookId, pageNumber: page.pageNumber, error: message,
      });
      return fail({ code: 'NARRATION_ERROR', message });
    }
  }

  /**
   * Select the best voice persona for an age group and theme.
   * Logic unchanged from Sprint 21.
   */
  selectVoicePersona(ageGroup: string, theme: string): VoicePersona {
    const candidates = VOICE_PERSONAS.filter(p =>
      p.suitableAgeGroups.includes(ageGroup),
    );

    if (candidates.length === 0) return VOICE_PERSONAS[0];

    const themeMatch = candidates.find(p =>
      p.suitableThemes.some(t => theme.toLowerCase().includes(t)),
    );

    return themeMatch ?? candidates[0];
  }

  /**
   * Estimate the cost for narrating a book.
   *
   * BEFORE: ElevenLabs pricing ($0.18/1000 chars for multilingual_v2)
   * AFTER:  Self-hosted pricing ($0.002/1000 chars amortised GPU)
   */
  estimateBookCost(
    pages: Array<{ text: string }>,
  ): { totalCharacters: number; estimatedCostUsd: number } {
    const totalCharacters = pages.reduce((sum, p) => sum + p.text.length, 0);
    const costPerThousandChars = 0.002; // Self-hosted amortised GPU cost
    const estimatedCostUsd = (totalCharacters / 1000) * costPerThousandChars;
    return {
      totalCharacters,
      estimatedCostUsd: Math.round(estimatedCostUsd * 1000000) / 1000000,
    };
  }

  private chunk<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

// ==========================================================================
// Section 7: Factory (updated)
// ==========================================================================

export function createNarrationService(config: NarrationServiceConfig): NarrationService {
  return new NarrationService(config);
}
