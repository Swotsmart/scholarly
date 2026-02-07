// =============================================================================
// SCHOLARLY PLATFORM — Audio Narration Service
// Sprint 3 | SB-004 | audio-narration.ts
// =============================================================================
// Produces professional narration for every storybook page with word-level
// timestamps that power karaoke-style highlighting in the interactive reader.
// Integrates with ElevenLabs for TTS and the existing ASR pipeline for
// read-aloud pronunciation assessment.
// =============================================================================

// ---------------------------------------------------------------------------
// Section 1: Type Definitions
// ---------------------------------------------------------------------------

/** A single word's timing within the narration audio */
export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  /** Character offset in the page text (for highlighting sync) */
  charStart: number;
  charEnd: number;
  /** Phoneme-level timing for pronunciation assessment */
  phonemes?: Array<{
    phoneme: string;
    startMs: number;
    endMs: number;
  }>;
}

/** Audio narration for a single storybook page */
export interface PageNarration {
  pageNumber: number;
  audioUrl: string;
  audioDurationMs: number;
  audioFormat: 'mp3' | 'wav' | 'opus';
  sampleRate: number;
  wordTimestamps: WordTimestamp[];
  /** Sentences for pause-point detection in reading mode */
  sentenceBoundaries: Array<{
    sentenceIndex: number;
    startMs: number;
    endMs: number;
    text: string;
  }>;
}

/** Complete narration for a storybook */
export interface StorybookNarration {
  storybookId: string;
  voiceId: string;
  voiceName: string;
  totalDurationMs: number;
  pages: PageNarration[];
  metadata: {
    model: string;
    totalCostUsd: number;
    generatedAt: string;
    paceMultiplier: number;
  };
}

/** Voice persona configuration for a story series */
export interface VoicePersona {
  personaId: string;
  name: string;
  description: string;
  elevenLabsVoiceId: string;
  characteristics: {
    gender: 'male' | 'female' | 'neutral';
    ageRange: 'child' | 'young_adult' | 'adult' | 'elderly';
    accent: string;
    tone: string;
    warmth: number; // 0.0–1.0
    clarity: number; // 0.0–1.0
  };
  /** Optimal for age groups */
  targetAgeGroups: string[];
  /** Settings overrides for ElevenLabs */
  voiceSettings: {
    stability: number; // 0.0–1.0
    similarityBoost: number; // 0.0–1.0
    style: number; // 0.0–1.0
    useSpeakerBoost: boolean;
  };
}

/** Default voice personas — curated for children's storybook narration */
export const DEFAULT_VOICE_PERSONAS: VoicePersona[] = [
  {
    personaId: 'storytime_sarah',
    name: 'Storytime Sarah',
    description: 'Warm, nurturing narrator voice perfect for bedtime stories and early readers',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL', // Example — replace with actual
    characteristics: {
      gender: 'female', ageRange: 'adult', accent: 'neutral_english',
      tone: 'warm and encouraging', warmth: 0.9, clarity: 0.85,
    },
    targetAgeGroups: ['3-5', '5-7'],
    voiceSettings: { stability: 0.7, similarityBoost: 0.8, style: 0.4, useSpeakerBoost: true },
  },
  {
    personaId: 'adventure_alex',
    name: 'Adventure Alex',
    description: 'Energetic, expressive narrator for adventure and action stories',
    elevenLabsVoiceId: 'TX3LPaxmHKxFdv7VOQHJ', // Example
    characteristics: {
      gender: 'male', ageRange: 'young_adult', accent: 'neutral_english',
      tone: 'energetic and expressive', warmth: 0.7, clarity: 0.9,
    },
    targetAgeGroups: ['5-7', '7-9'],
    voiceSettings: { stability: 0.55, similarityBoost: 0.75, style: 0.6, useSpeakerBoost: true },
  },
  {
    personaId: 'wise_willow',
    name: 'Wise Willow',
    description: 'Gentle, wise narrator for nature stories and information texts',
    elevenLabsVoiceId: 'pNInz6obpgDQGcFmaJgB', // Example
    characteristics: {
      gender: 'neutral', ageRange: 'elderly', accent: 'neutral_english',
      tone: 'gentle and wise', warmth: 0.85, clarity: 0.8,
    },
    targetAgeGroups: ['5-7', '7-9'],
    voiceSettings: { stability: 0.75, similarityBoost: 0.85, style: 0.3, useSpeakerBoost: false },
  },
  {
    personaId: 'playful_pip',
    name: 'Playful Pip',
    description: 'Bright, playful child-like narrator for phonics practice and rhyming stories',
    elevenLabsVoiceId: 'jBpfAFnyjnqEE8Hn6TQn', // Example
    characteristics: {
      gender: 'female', ageRange: 'child', accent: 'neutral_english',
      tone: 'playful and bright', warmth: 0.8, clarity: 0.95,
    },
    targetAgeGroups: ['3-5'],
    voiceSettings: { stability: 0.6, similarityBoost: 0.7, style: 0.5, useSpeakerBoost: true },
  },
];

/** Reading pace configuration per phonics phase */
export const PACE_CONFIG: Record<number, { wordsPerMinute: number; pauseBetweenSentencesMs: number; pauseBetweenPagesMs: number }> = {
  1: { wordsPerMinute: 60, pauseBetweenSentencesMs: 800, pauseBetweenPagesMs: 1500 },
  2: { wordsPerMinute: 75, pauseBetweenSentencesMs: 700, pauseBetweenPagesMs: 1200 },
  3: { wordsPerMinute: 90, pauseBetweenSentencesMs: 600, pauseBetweenPagesMs: 1000 },
  4: { wordsPerMinute: 110, pauseBetweenSentencesMs: 500, pauseBetweenPagesMs: 800 },
  5: { wordsPerMinute: 130, pauseBetweenSentencesMs: 400, pauseBetweenPagesMs: 700 },
  6: { wordsPerMinute: 150, pauseBetweenSentencesMs: 350, pauseBetweenPagesMs: 600 },
};

/** Narration service configuration */
export interface NarrationServiceConfig {
  elevenLabsApiKey: string;
  elevenLabsBaseUrl?: string;
  defaultModel?: string;
  storageProvider: IStorageProvider;
  cacheProvider?: ICacheProvider;
  eventPublisher?: IEventPublisher;
  logger: ILogger;
  maxConcurrentPages?: number;
}

// Dependency interfaces (from Sprint 1)
export interface IStorageProvider {
  upload(key: string, data: Buffer, contentType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

export interface ICacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlSeconds: number): Promise<void>;
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

// ---------------------------------------------------------------------------
// Section 2: ElevenLabs TTS Client
// ---------------------------------------------------------------------------

/**
 * Low-level client for the ElevenLabs Text-to-Speech API.
 * Handles authentication, model selection, voice settings, and
 * importantly, word-level timestamp extraction via the
 * "with_timestamps" endpoint.
 */
export class ElevenLabsTTSClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly defaultModel: string;
  private readonly logger: ILogger;

  // ElevenLabs model pricing (per 1,000 characters)
  private readonly MODEL_PRICING: Record<string, number> = {
    'eleven_multilingual_v2': 0.18,    // $0.18/1k chars
    'eleven_turbo_v2_5': 0.075,        // $0.075/1k chars (faster, cheaper)
    'eleven_monolingual_v1': 0.18,     // Legacy
    'eleven_flash_v2_5': 0.0375,       // Lowest cost
  };

  constructor(config: {
    apiKey: string;
    baseUrl?: string;
    defaultModel?: string;
    logger: ILogger;
  }) {
    if (!config.apiKey) {
      throw new Error('ElevenLabsTTSClient: API key is required');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl ?? 'https://api.elevenlabs.io/v1';
    this.defaultModel = config.defaultModel ?? 'eleven_turbo_v2_5';
    this.logger = config.logger;
  }

  /**
   * Generate speech with word-level timestamps.
   * Uses the /text-to-speech/{voice_id}/with-timestamps endpoint
   * which returns both audio and alignment data.
   */
  async generateWithTimestamps(
    text: string,
    voiceId: string,
    settings: VoicePersona['voiceSettings'],
    options?: {
      model?: string;
      outputFormat?: 'mp3_44100_128' | 'mp3_22050_32' | 'pcm_16000' | 'pcm_24000';
      paceMultiplier?: number;
    }
  ): Promise<{
    audioBuffer: Buffer;
    timestamps: Array<{ word: string; startMs: number; endMs: number }>;
    characterCount: number;
    model: string;
    costUsd: number;
  }> {
    const model = options?.model ?? this.defaultModel;
    const outputFormat = options?.outputFormat ?? 'mp3_44100_128';
    const startTime = Date.now();

    // Apply pace multiplier via SSML-like speed control
    // ElevenLabs doesn't support SSML directly, so we use the
    // speech rate parameter in voice settings
    const adjustedSettings = { ...settings };
    if (options?.paceMultiplier && options.paceMultiplier !== 1.0) {
      // Stability affects speech rate — lower stability = more varied/faster
      // We nudge stability to approximate pace changes
      const paceAdjust = (1.0 - options.paceMultiplier) * 0.15;
      adjustedSettings.stability = Math.max(0.1, Math.min(1.0, settings.stability + paceAdjust));
    }

    const requestBody = {
      text,
      model_id: model,
      voice_settings: {
        stability: adjustedSettings.stability,
        similarity_boost: adjustedSettings.similarityBoost,
        style: adjustedSettings.style,
        use_speaker_boost: adjustedSettings.useSpeakerBoost,
      },
      output_format: outputFormat,
    };

    try {
      const response = await fetch(
        `${this.baseUrl}/text-to-speech/${voiceId}/with-timestamps`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'xi-api-key': this.apiKey,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`ElevenLabs TTS error ${response.status}: ${errorBody}`);
      }

      const data = await response.json() as {
        audio_base64: string;
        alignment: {
          characters: string[];
          character_start_times_seconds: number[];
          character_end_times_seconds: number[];
        };
      };

      const audioBuffer = Buffer.from(data.audio_base64, 'base64');

      // Convert character-level alignment to word-level timestamps
      const timestamps = this.alignCharactersToWords(
        text,
        data.alignment.characters,
        data.alignment.character_start_times_seconds,
        data.alignment.character_end_times_seconds
      );

      const characterCount = text.length;
      const costPerThousand = this.MODEL_PRICING[model] ?? 0.18;
      const costUsd = (characterCount / 1000) * costPerThousand;

      const durationMs = Date.now() - startTime;
      this.logger.info('ElevenLabs TTS complete', {
        voiceId,
        model,
        characterCount,
        wordCount: timestamps.length,
        durationMs,
        costUsd: costUsd.toFixed(4),
      });

      return { audioBuffer, timestamps, characterCount, model, costUsd };
    } catch (error) {
      this.logger.error('ElevenLabs TTS failed', {
        voiceId,
        model,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Simple TTS without timestamps — for preview or low-priority use.
   */
  async generateSimple(
    text: string,
    voiceId: string,
    settings: VoicePersona['voiceSettings'],
    model?: string
  ): Promise<{ audioBuffer: Buffer; characterCount: number; costUsd: number }> {
    const usedModel = model ?? this.defaultModel;

    const response = await fetch(
      `${this.baseUrl}/text-to-speech/${voiceId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': this.apiKey,
          'Accept': 'audio/mpeg',
        },
        body: JSON.stringify({
          text,
          model_id: usedModel,
          voice_settings: {
            stability: settings.stability,
            similarity_boost: settings.similarityBoost,
            style: settings.style,
            use_speaker_boost: settings.useSpeakerBoost,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`ElevenLabs TTS error: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);
    const characterCount = text.length;
    const costPerThousand = this.MODEL_PRICING[usedModel] ?? 0.18;
    const costUsd = (characterCount / 1000) * costPerThousand;

    return { audioBuffer, characterCount, costUsd };
  }

  /**
   * Lists available voices from ElevenLabs account.
   */
  async listVoices(): Promise<Array<{ voice_id: string; name: string; category: string }>> {
    const response = await fetch(`${this.baseUrl}/voices`, {
      headers: { 'xi-api-key': this.apiKey },
    });

    if (!response.ok) {
      throw new Error(`ElevenLabs voices list error: ${response.status}`);
    }

    const data = await response.json() as {
      voices: Array<{ voice_id: string; name: string; category: string }>;
    };

    return data.voices;
  }

  /**
   * Health check — verifies API key validity and service availability.
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/user/subscription`, {
        headers: { 'xi-api-key': this.apiKey },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Converts ElevenLabs' character-level alignment to word-level timestamps.
   *
   * ElevenLabs returns timing for each character. We need word-level timing
   * for the karaoke highlighting. This method groups characters into words
   * by walking through the original text and matching against the alignment
   * characters, handling whitespace boundaries.
   */
  private alignCharactersToWords(
    originalText: string,
    characters: string[],
    startTimes: number[],
    endTimes: number[]
  ): Array<{ word: string; startMs: number; endMs: number }> {
    const words: Array<{ word: string; startMs: number; endMs: number }> = [];

    // Simple tokenisation — split on whitespace, track character positions
    const wordRegex = /\S+/g;
    let match: RegExpExecArray | null;

    // Build a character-to-time index from alignment data
    // Characters array from ElevenLabs may not map 1:1 with input characters
    // (punctuation, spaces may be handled differently)
    let alignIdx = 0;

    while ((match = wordRegex.exec(originalText)) !== null) {
      const word = match[0];
      const charStart = match.index;

      // Find the alignment index for this word's start
      // Skip any alignment characters that correspond to whitespace
      while (alignIdx < characters.length && characters[alignIdx].trim() === '') {
        alignIdx++;
      }

      if (alignIdx >= characters.length) break;

      const wordStartMs = Math.round(startTimes[alignIdx] * 1000);

      // Advance through the word's characters
      const wordLength = word.length;
      let lastValidIdx = alignIdx;
      for (let i = 0; i < wordLength && alignIdx < characters.length; i++) {
        lastValidIdx = alignIdx;
        alignIdx++;
      }

      const wordEndMs = Math.round(endTimes[lastValidIdx] * 1000);

      words.push({
        word: word.replace(/[.,!?;:'"()\[\]{}]/g, ''), // Clean punctuation for matching
        startMs: wordStartMs,
        endMs: wordEndMs,
      });
    }

    return words;
  }

  /**
   * Estimates cost for a given text length and model.
   */
  estimateCost(characterCount: number, model?: string): number {
    const usedModel = model ?? this.defaultModel;
    const costPerThousand = this.MODEL_PRICING[usedModel] ?? 0.18;
    return (characterCount / 1000) * costPerThousand;
  }
}

// ---------------------------------------------------------------------------
// Section 3: Narration Service Orchestrator
// ---------------------------------------------------------------------------

/**
 * Orchestrates narration generation for complete storybooks. Handles
 * voice persona selection, pace adaptation based on phonics phase,
 * word timestamp alignment with page text positions, sentence boundary
 * detection, and audio storage.
 *
 * Think of this as the recording studio director: they choose the voice
 * actor (persona), set the reading pace (phase-adapted speed), run the
 * recording session (TTS generation), sync the script to the tape
 * (timestamp alignment), and deliver the final master (stored audio files).
 */
export class NarrationService {
  private readonly ttsClient: ElevenLabsTTSClient;
  private readonly config: NarrationServiceConfig;
  private readonly logger: ILogger;

  constructor(config: NarrationServiceConfig) {
    this.config = config;
    this.logger = config.logger;
    this.ttsClient = new ElevenLabsTTSClient({
      apiKey: config.elevenLabsApiKey,
      baseUrl: config.elevenLabsBaseUrl,
      defaultModel: config.defaultModel,
      logger: config.logger,
    });
  }

  /**
   * Generate narration for an entire storybook.
   */
  async narrateBook(
    storybookId: string,
    pages: Array<{ pageNumber: number; text: string }>,
    options: {
      voicePersona?: VoicePersona;
      phonicsPhase?: number;
      paceMultiplier?: number;
      model?: string;
      outputFormat?: 'mp3_44100_128' | 'mp3_22050_32';
    }
  ): Promise<StorybookNarration> {
    const persona = options.voicePersona ?? DEFAULT_VOICE_PERSONAS[0];
    const phase = options.phonicsPhase ?? 3;
    const paceConfig = PACE_CONFIG[phase] ?? PACE_CONFIG[3];

    // Calculate pace multiplier from phase config and custom override
    const targetWPM = paceConfig.wordsPerMinute;
    const baseWPM = 130; // ElevenLabs' default speaking rate is ~130 WPM
    const paceMultiplier = options.paceMultiplier ?? (targetWPM / baseWPM);

    this.logger.info('Starting storybook narration', {
      storybookId,
      pageCount: pages.length,
      voice: persona.name,
      phase,
      targetWPM,
      paceMultiplier: paceMultiplier.toFixed(2),
    });

    const pageNarrations: PageNarration[] = [];
    let totalCost = 0;
    let totalDuration = 0;

    // Process pages sequentially to maintain consistent voice state
    // (ElevenLabs voice consistency is better with sequential requests)
    for (const page of pages) {
      if (!page.text.trim()) {
        this.logger.debug('Skipping empty page', { pageNumber: page.pageNumber });
        continue;
      }

      try {
        const narration = await this.narratePage(
          storybookId,
          page.pageNumber,
          page.text,
          persona,
          {
            paceMultiplier,
            model: options.model,
            outputFormat: options.outputFormat,
          }
        );

        pageNarrations.push(narration);
        totalDuration += narration.audioDurationMs;

        // Extract cost from cached metadata (we track it during generation)
        const pageCost = this.ttsClient.estimateCost(page.text.length, options.model);
        totalCost += pageCost;
      } catch (error) {
        this.logger.error('Page narration failed', {
          storybookId,
          pageNumber: page.pageNumber,
          error: error instanceof Error ? error.message : String(error),
        });
        // Continue with remaining pages rather than failing entire book
      }
    }

    const result: StorybookNarration = {
      storybookId,
      voiceId: persona.elevenLabsVoiceId,
      voiceName: persona.name,
      totalDurationMs: totalDuration,
      pages: pageNarrations,
      metadata: {
        model: options.model ?? this.config.defaultModel ?? 'eleven_turbo_v2_5',
        totalCostUsd: totalCost,
        generatedAt: new Date().toISOString(),
        paceMultiplier,
      },
    };

    this.logger.info('Storybook narration complete', {
      storybookId,
      pageCount: pageNarrations.length,
      totalDurationMs: totalDuration,
      totalCost: totalCost.toFixed(4),
    });

    if (this.config.eventPublisher) {
      await this.config.eventPublisher.publish('storybook.narrated', {
        storybookId,
        pageCount: pageNarrations.length,
        totalDurationMs: totalDuration,
        totalCostUsd: totalCost,
        voicePersona: persona.personaId,
      });
    }

    return result;
  }

  /**
   * Generate narration for a single page with full timestamp alignment.
   */
  async narratePage(
    storybookId: string,
    pageNumber: number,
    text: string,
    persona: VoicePersona,
    options: {
      paceMultiplier?: number;
      model?: string;
      outputFormat?: 'mp3_44100_128' | 'mp3_22050_32';
    }
  ): Promise<PageNarration> {
    // Check cache first
    if (this.config.cacheProvider) {
      const cacheKey = this.buildCacheKey(storybookId, pageNumber, persona.personaId, text);
      const cached = await this.config.cacheProvider.get<PageNarration>(cacheKey);
      if (cached) {
        this.logger.debug('Narration cache hit', { storybookId, pageNumber });
        return cached;
      }
    }

    // Generate TTS with timestamps
    const result = await this.ttsClient.generateWithTimestamps(
      text,
      persona.elevenLabsVoiceId,
      persona.voiceSettings,
      {
        model: options.model,
        outputFormat: options.outputFormat === 'mp3_22050_32' ? 'mp3_22050_32' : 'mp3_44100_128',
        paceMultiplier: options.paceMultiplier,
      }
    );

    // Upload audio to storage
    const storageKey = `storybooks/${storybookId}/audio/page_${pageNumber}_${persona.personaId}.mp3`;
    const audioUrl = await this.config.storageProvider.upload(
      storageKey,
      result.audioBuffer,
      'audio/mpeg'
    );

    // Build word timestamps with character offsets
    const wordTimestamps = this.buildWordTimestamps(text, result.timestamps);

    // Detect sentence boundaries
    const sentenceBoundaries = this.detectSentenceBoundaries(text, wordTimestamps);

    // Estimate duration from last timestamp
    const lastTimestamp = result.timestamps[result.timestamps.length - 1];
    const audioDurationMs = lastTimestamp ? lastTimestamp.endMs : 0;

    const narration: PageNarration = {
      pageNumber,
      audioUrl,
      audioDurationMs,
      audioFormat: 'mp3',
      sampleRate: options.outputFormat === 'mp3_22050_32' ? 22050 : 44100,
      wordTimestamps,
      sentenceBoundaries,
    };

    // Cache the result
    if (this.config.cacheProvider) {
      const cacheKey = this.buildCacheKey(storybookId, pageNumber, persona.personaId, text);
      await this.config.cacheProvider.set(cacheKey, narration, 86400); // 24h TTL
    }

    return narration;
  }

  /**
   * Select the best voice persona for a given storybook based on
   * the target age group and story theme.
   */
  selectVoicePersona(
    ageGroup: string,
    storyTheme?: string,
    availablePersonas?: VoicePersona[]
  ): VoicePersona {
    const personas = availablePersonas ?? DEFAULT_VOICE_PERSONAS;

    // Filter by target age group
    const ageMatches = personas.filter(p =>
      p.targetAgeGroups.includes(ageGroup)
    );

    if (ageMatches.length === 0) {
      return personas[0]; // Fallback to first available
    }

    // If theme suggests adventure/action, prefer energetic voice
    if (storyTheme) {
      const themeLC = storyTheme.toLowerCase();
      if (themeLC.includes('adventure') || themeLC.includes('quest') || themeLC.includes('action')) {
        const adventureVoice = ageMatches.find(p =>
          p.characteristics.tone.includes('energetic') || p.characteristics.tone.includes('expressive')
        );
        if (adventureVoice) return adventureVoice;
      }

      if (themeLC.includes('nature') || themeLC.includes('animal') || themeLC.includes('garden')) {
        const natureVoice = ageMatches.find(p =>
          p.characteristics.tone.includes('gentle') || p.characteristics.tone.includes('wise')
        );
        if (natureVoice) return natureVoice;
      }

      if (themeLC.includes('bedtime') || themeLC.includes('sleep') || themeLC.includes('dream')) {
        const calmVoice = ageMatches.find(p =>
          p.characteristics.warmth >= 0.85
        );
        if (calmVoice) return calmVoice;
      }
    }

    // Default: highest warmth × clarity score for children's content
    return ageMatches.reduce((best, current) => {
      const bestScore = best.characteristics.warmth * best.characteristics.clarity;
      const currentScore = current.characteristics.warmth * current.characteristics.clarity;
      return currentScore > bestScore ? current : best;
    });
  }

  /**
   * Estimate narration cost for a storybook before generation.
   */
  estimateBookCost(
    pages: Array<{ text: string }>,
    model?: string
  ): { totalCharacters: number; estimatedCostUsd: number } {
    const totalCharacters = pages.reduce((sum, p) => sum + p.text.length, 0);
    const estimatedCostUsd = this.ttsClient.estimateCost(totalCharacters, model);
    return { totalCharacters, estimatedCostUsd };
  }

  /**
   * Health check for the ElevenLabs service.
   */
  async healthCheck(): Promise<boolean> {
    return this.ttsClient.healthCheck();
  }

  // --- Private helpers ---

  /**
   * Maps TTS word timestamps back to character positions in the original
   * page text. This is critical for the reader component to highlight
   * the correct word at the correct time.
   */
  private buildWordTimestamps(
    originalText: string,
    ttsTimestamps: Array<{ word: string; startMs: number; endMs: number }>
  ): WordTimestamp[] {
    const wordTimestamps: WordTimestamp[] = [];
    let searchStart = 0;

    for (const ts of ttsTimestamps) {
      // Find this word in the original text, starting from where we last matched
      // This handles repeated words correctly by tracking position
      const cleanWord = ts.word.toLowerCase();
      const textLC = originalText.toLowerCase();

      // Search for the word (with or without surrounding punctuation)
      let foundIndex = -1;
      for (let i = searchStart; i < originalText.length; i++) {
        // Try to match the word at this position
        const remaining = textLC.substring(i);
        const wordMatch = remaining.match(/^[^a-z]*([a-z']+)/);
        if (wordMatch && wordMatch[1] === cleanWord) {
          foundIndex = i + (wordMatch.index ?? 0) + wordMatch[0].indexOf(wordMatch[1]);
          break;
        }
      }

      if (foundIndex === -1) {
        // Fallback: use approximate position
        foundIndex = searchStart;
      }

      wordTimestamps.push({
        word: ts.word,
        startMs: ts.startMs,
        endMs: ts.endMs,
        charStart: foundIndex,
        charEnd: foundIndex + ts.word.length,
      });

      searchStart = foundIndex + ts.word.length;
    }

    return wordTimestamps;
  }

  /**
   * Detects sentence boundaries within the page text and maps them
   * to audio time ranges. This powers the reader's "pause at sentence
   * end" feature, which gives children time to process what they've read.
   */
  private detectSentenceBoundaries(
    text: string,
    wordTimestamps: WordTimestamp[]
  ): PageNarration['sentenceBoundaries'] {
    const boundaries: PageNarration['sentenceBoundaries'] = [];

    // Split text into sentences using common delimiters
    const sentenceRegex = /[^.!?]+[.!?]+/g;
    let sentenceMatch: RegExpExecArray | null;
    let sentenceIndex = 0;

    while ((sentenceMatch = sentenceRegex.exec(text)) !== null) {
      const sentenceText = sentenceMatch[0].trim();
      const sentenceStart = sentenceMatch.index;
      const sentenceEnd = sentenceStart + sentenceMatch[0].length;

      // Find word timestamps that fall within this sentence's character range
      const sentenceWords = wordTimestamps.filter(
        wt => wt.charStart >= sentenceStart && wt.charEnd <= sentenceEnd
      );

      if (sentenceWords.length > 0) {
        boundaries.push({
          sentenceIndex,
          startMs: sentenceWords[0].startMs,
          endMs: sentenceWords[sentenceWords.length - 1].endMs,
          text: sentenceText,
        });
      }

      sentenceIndex++;
    }

    // Handle text without sentence-ending punctuation
    if (boundaries.length === 0 && wordTimestamps.length > 0) {
      boundaries.push({
        sentenceIndex: 0,
        startMs: wordTimestamps[0].startMs,
        endMs: wordTimestamps[wordTimestamps.length - 1].endMs,
        text: text.trim(),
      });
    }

    return boundaries;
  }

  private buildCacheKey(
    storybookId: string,
    pageNumber: number,
    personaId: string,
    text: string
  ): string {
    // Simple hash of text for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0; // Convert to 32-bit integer
    }
    return `narration:${storybookId}:${pageNumber}:${personaId}:${Math.abs(hash).toString(36)}`;
  }
}

// ---------------------------------------------------------------------------
// Section 4: Read-Aloud Assessment Integration
// ---------------------------------------------------------------------------

/**
 * Bridges the narration service with the ASR (Automatic Speech Recognition)
 * pipeline from the Phonics Tool. When a child reads aloud, this compares
 * their spoken words against the expected text and provides word-level
 * accuracy feedback.
 *
 * Think of it as a gentle, patient reading tutor who follows along with
 * their finger on the text while the child reads, noting which words
 * were read correctly, which were stumbled on, and which were skipped.
 */
export interface ReadAloudAssessment {
  pageNumber: number;
  /** Overall accuracy: correct words / total words */
  accuracy: number;
  /** Words correct per minute */
  wcpm: number;
  /** Total reading time in ms */
  readingTimeMs: number;
  /** Per-word assessment */
  words: Array<{
    expected: string;
    spoken: string;
    correct: boolean;
    /** Type of error if incorrect */
    errorType?: 'substitution' | 'omission' | 'insertion' | 'mispronunciation';
    /** The GPCs involved in this word (for mastery feedback) */
    gpcs?: string[];
    /** Confidence of the ASR transcription */
    confidence: number;
  }>;
  /** GPCs that need reinforcement based on errors */
  gpcReinforcement: Array<{
    gpc: string;
    errorCount: number;
    totalOccurrences: number;
  }>;
}

/**
 * Compares ASR transcription against expected text to produce
 * a read-aloud assessment. Uses Levenshtein alignment to handle
 * insertions, omissions, and substitutions.
 */
export class ReadAloudAssessor {
  private readonly logger: ILogger;

  constructor(logger: ILogger) {
    this.logger = logger;
  }

  /**
   * Assess a read-aloud attempt by comparing spoken words against expected text.
   */
  assess(
    expectedText: string,
    spokenWords: Array<{ word: string; confidence: number; timestampMs: number }>,
    readingTimeMs: number,
    wordGPCMap?: Map<string, string[]>
  ): ReadAloudAssessment {
    const expectedWordList = this.tokenize(expectedText);
    const spokenWordList = spokenWords.map(w => w.word.toLowerCase().replace(/[^a-z']/g, ''));

    // Align expected and spoken using edit distance
    const alignment = this.alignWords(
      expectedWordList.map(w => w.toLowerCase()),
      spokenWordList
    );

    const wordAssessments: ReadAloudAssessment['words'] = [];
    const gpcErrors: Map<string, { errors: number; total: number }> = new Map();
    let correctCount = 0;

    for (const entry of alignment) {
      const gpcs = wordGPCMap?.get(entry.expected ?? '') ?? [];

      // Track GPC occurrences
      for (const gpc of gpcs) {
        const existing = gpcErrors.get(gpc) ?? { errors: 0, total: 0 };
        existing.total++;
        if (!entry.correct) existing.errors++;
        gpcErrors.set(gpc, existing);
      }

      if (entry.correct) correctCount++;

      const spokenWordData = spokenWords.find(
        sw => sw.word.toLowerCase().replace(/[^a-z']/g, '') === entry.spoken
      );

      wordAssessments.push({
        expected: entry.expected ?? '',
        spoken: entry.spoken ?? '',
        correct: entry.correct,
        errorType: entry.errorType,
        gpcs: gpcs.length > 0 ? gpcs : undefined,
        confidence: spokenWordData?.confidence ?? 0,
      });
    }

    const totalWords = expectedWordList.length;
    const accuracy = totalWords > 0 ? correctCount / totalWords : 0;
    const readingTimeMinutes = readingTimeMs / 60000;
    const wcpm = readingTimeMinutes > 0 ? Math.round(correctCount / readingTimeMinutes) : 0;

    const gpcReinforcement: ReadAloudAssessment['gpcReinforcement'] = [];
    for (const [gpc, counts] of gpcErrors) {
      if (counts.errors > 0) {
        gpcReinforcement.push({
          gpc,
          errorCount: counts.errors,
          totalOccurrences: counts.total,
        });
      }
    }

    // Sort by error rate (highest first) for priority reinforcement
    gpcReinforcement.sort((a, b) =>
      (b.errorCount / b.totalOccurrences) - (a.errorCount / a.totalOccurrences)
    );

    this.logger.info('Read-aloud assessment complete', {
      totalWords,
      correctCount,
      accuracy: accuracy.toFixed(2),
      wcpm,
      gpcsNeedingReinforcement: gpcReinforcement.length,
    });

    return {
      pageNumber: 0, // Set by caller
      accuracy,
      wcpm,
      readingTimeMs,
      words: wordAssessments,
      gpcReinforcement,
    };
  }

  private tokenize(text: string): string[] {
    return text.split(/\s+/).filter(w => w.length > 0).map(w =>
      w.replace(/[^a-zA-Z']/g, '')
    ).filter(w => w.length > 0);
  }

  /**
   * Aligns expected and spoken word sequences using a modified
   * Levenshtein distance algorithm that classifies edit operations.
   */
  private alignWords(
    expected: string[],
    spoken: string[]
  ): Array<{
    expected?: string;
    spoken?: string;
    correct: boolean;
    errorType?: 'substitution' | 'omission' | 'insertion' | 'mispronunciation';
  }> {
    const m = expected.length;
    const n = spoken.length;

    // Build DP matrix
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (expected[i - 1] === spoken[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(
            dp[i - 1][j],     // deletion (omission)
            dp[i][j - 1],     // insertion
            dp[i - 1][j - 1]  // substitution
          );
        }
      }
    }

    // Backtrack to find alignment
    const alignment: Array<{
      expected?: string;
      spoken?: string;
      correct: boolean;
      errorType?: 'substitution' | 'omission' | 'insertion' | 'mispronunciation';
    }> = [];

    let i = m, j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && expected[i - 1] === spoken[j - 1]) {
        alignment.unshift({ expected: expected[i - 1], spoken: spoken[j - 1], correct: true });
        i--; j--;
      } else if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + 1) {
        // Substitution — check if it's a mispronunciation (similar sounding)
        const isMispronunciation = this.isSimilarPronunciation(expected[i - 1], spoken[j - 1]);
        alignment.unshift({
          expected: expected[i - 1],
          spoken: spoken[j - 1],
          correct: false,
          errorType: isMispronunciation ? 'mispronunciation' : 'substitution',
        });
        i--; j--;
      } else if (j > 0 && (i === 0 || dp[i][j] === dp[i][j - 1] + 1)) {
        alignment.unshift({
          spoken: spoken[j - 1],
          correct: false,
          errorType: 'insertion',
        });
        j--;
      } else {
        alignment.unshift({
          expected: expected[i - 1],
          correct: false,
          errorType: 'omission',
        });
        i--;
      }
    }

    return alignment;
  }

  /**
   * Heuristic check for whether two words might be similar-sounding
   * (mispronunciation vs substitution). Uses simple phonetic similarity.
   */
  private isSimilarPronunciation(expected: string, spoken: string): boolean {
    // If words share >60% of characters, likely a mispronunciation
    const longer = Math.max(expected.length, spoken.length);
    if (longer === 0) return false;

    let common = 0;
    const expectedChars = new Set(expected.split(''));
    for (const char of spoken) {
      if (expectedChars.has(char)) common++;
    }

    return (common / longer) > 0.6;
  }
}

// ---------------------------------------------------------------------------
// Section 5: Factory
// ---------------------------------------------------------------------------

export function createNarrationService(config: NarrationServiceConfig): NarrationService {
  return new NarrationService(config);
}

export function createReadAloudAssessor(logger: ILogger): ReadAloudAssessor {
  return new ReadAloudAssessor(logger);
}
