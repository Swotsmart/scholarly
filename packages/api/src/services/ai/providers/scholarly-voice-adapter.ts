// ============================================================================
// SCHOLARLY PLATFORM — Sprint 30, Week 1
// AIPAL Voice Service Adapter
// ============================================================================
//
// The bridge connecting Scholarly's TypeScript platform to the self-hosted
// Python Voice Service built in Sprint 29. Previously this socket in the
// AIPAL ProviderRegistry was occupied by the ElevenLabsAdapter — a
// commercial API integration costing schools $15,000/month with limited
// control over pace, pitch, and tone.
//
// This adapter replaces it entirely. The cost drops to ~$300/month. The
// control improves dramatically. And every consuming service sees the
// identical ISpeechProvider interface, so zero business logic changes.
//
// Architecture:
//   NarrationService ──┐
//   ReadAloudAssessor ─┤──▶ AIService ──▶ RoutingEngine ──▶ This Adapter
//   VoiceIntelligence ─┘                                       │ HTTP
//                                                    Voice Service (Python)
//                                                    ├─ Kokoro TTS (48 voices)
//                                                    ├─ Chatterbox (cloning)
//                                                    ├─ Whisper STT
//                                                    └─ Audio Processing
//
// Dependencies:
//   Sprint 1:  capability-interfaces.ts (ISpeechProvider, AIResult)
//   Sprint 1:  provider-registry.ts (ProviderRegistry, RoutingEngine)
//   Sprint 29: Voice Service REST API (28 endpoints)
// ============================================================================

import {
  Result, ok, fail,
  ScholarlyError, ValidationError, ServiceUnavailableError, ProviderError,
  Logger, Cache,
} from '../shared/base';

// ============================================================================
// Section 1: AIPAL Interface Types
// ============================================================================
// Reproduced from capability-interfaces.ts (Sprint 1) for self-containment.
// In production, imported from '@scholarly/ai-abstraction/capability-interfaces'.

export type ProviderId = string;
export type CostTier = 'critical' | 'standard' | 'economy';

export interface AIRequestOptions {
  tenantId: string;
  tier?: CostTier;
  preferredProvider?: ProviderId;
  metadata?: Record<string, unknown>;
}

export interface AIUsageMetadata {
  providerId: ProviderId;
  model: string;
  durationMs: number;
  costUsd: number;
  cached: boolean;
}

export interface AIResult<T> {
  success: boolean;
  data?: T;
  error?: ScholarlyError;
  usage?: AIUsageMetadata;
}

export interface TranscriptionRequest extends AIRequestOptions {
  audioUrl?: string;
  audioBase64?: string;
  audioMimeType?: string;
  language?: string;
  wordTimestamps?: boolean;
}

export interface TranscriptionWord {
  word: string;
  startMs: number;
  endMs: number;
  confidence: number;
}

export interface TranscriptionResponse {
  text: string;
  language: string;
  words: TranscriptionWord[];
  durationMs: number;
}

export interface PronunciationAssessmentRequest extends AIRequestOptions {
  audioBase64: string;
  audioMimeType: string;
  referenceText: string;
  language?: string;
}

export interface PronunciationAssessmentResponse {
  overallScore: number;
  accuracyScore: number;
  fluencyScore: number;
  completenessScore: number;
  words: Array<{
    word: string;
    accuracyScore: number;
    errorType: 'none' | 'omission' | 'insertion' | 'mispronunciation';
  }>;
}

export interface TextToSpeechRequest extends AIRequestOptions {
  text: string;
  voiceId: string;
  speed?: number;
  outputFormat?: 'mp3' | 'wav' | 'ogg';
  wordTimestamps?: boolean;
}

export interface TextToSpeechResponse {
  audioBase64: string;
  audioMimeType: string;
  durationMs: number;
  wordTimestamps?: Array<{ word: string; startMs: number; endMs: number }>;
}

export interface ISpeechProvider {
  readonly providerId: ProviderId;
  readonly capabilities: ['speech'];
  transcribe(request: TranscriptionRequest): Promise<AIResult<TranscriptionResponse>>;
  assessPronunciation(request: PronunciationAssessmentRequest): Promise<AIResult<PronunciationAssessmentResponse>>;
  synthesize(request: TextToSpeechRequest): Promise<AIResult<TextToSpeechResponse>>;
}


// ============================================================================
// Section 2: Voice Persona Mapping
// ============================================================================
// The six voice personas from Sprint 21 previously referenced ElevenLabs
// voice IDs. This mapping translates them to Kokoro voice IDs.
//
// Think of it as recasting voice actors for a show: the characters stay
// the same, but the performers change. Each was selected by matching vocal
// characteristics (gender, warmth, energy, accent) to the persona's target
// age group and story themes.

export interface VoicePersonaMapping {
  personaId: string;
  name: string;
  legacyElevenLabsId: string;
  kokoroVoiceId: string;
  mappingRationale: string;
  characteristics: {
    gender: 'female' | 'male' | 'neutral';
    style: 'warm' | 'calm' | 'bright' | 'energetic' | 'neutral';
    language: string;
  };
}

export const VOICE_PERSONA_MAPPINGS: readonly VoicePersonaMapping[] = [
  {
    personaId: 'vp-warm-storyteller',
    name: 'Warm Storyteller',
    legacyElevenLabsId: 'EXAVITQu4vr4xnSDxMaL',
    kokoroVoiceId: 'af_bella',
    mappingRationale:
      'Bella is warm and gentle — ideal for bedtime stories and early readers (ages 3-6). ' +
      'Her voice has the soft, encouraging quality that makes young children feel safe.',
    characteristics: { gender: 'female', style: 'warm', language: 'en-us' },
  },
  {
    personaId: 'vp-wonder-guide',
    name: 'Wonder Guide',
    legacyElevenLabsId: 'pNInz6obpgDQGcFmaJgB',
    kokoroVoiceId: 'am_adam',
    mappingRationale:
      'Adam has a clear, measured delivery conveying awe without overwhelm — perfect ' +
      'for science and exploration stories (ages 5-8).',
    characteristics: { gender: 'male', style: 'neutral', language: 'en-us' },
  },
  {
    personaId: 'vp-cheerful-chef',
    name: 'Cheerful Chef',
    legacyElevenLabsId: 'TxGEqnHWrfWFTfGW9XjX',
    kokoroVoiceId: 'am_puck',
    mappingRationale:
      'Puck has bright, playful energy — exactly what cumulative tales and food ' +
      'stories need for the Cheerful Chef persona (ages 4-8).',
    characteristics: { gender: 'male', style: 'bright', language: 'en-us' },
  },
  {
    personaId: 'vp-adventure-narrator',
    name: 'Adventure Narrator',
    legacyElevenLabsId: 'VR6AewLTigWG4xSOukaG',
    kokoroVoiceId: 'am_fenrir',
    mappingRationale:
      'Fenrir has energetic, confident delivery handling dramatic tension — ' +
      'suitable for adventure, mystery, and robot stories (ages 6-9).',
    characteristics: { gender: 'male', style: 'energetic', language: 'en-us' },
  },
  {
    personaId: 'vp-aussie-mate',
    name: 'Aussie Mate',
    legacyElevenLabsId: 'SOYHLrjzK2X1ezoPC6cr',
    kokoroVoiceId: 'bf_alice',
    mappingRationale:
      'Alice (British English) is the closest available accent to Australian English ' +
      'in the Kokoro catalogue. British English shares more phonological features ' +
      'with AusE than AmE. Mapping updates transparently when Kokoro adds an AU voice.',
    characteristics: { gender: 'female', style: 'warm', language: 'en-gb' },
  },
  {
    personaId: 'vp-calm-teacher',
    name: 'Calm Teacher',
    legacyElevenLabsId: 'jBpfAIoJLzRDGnqrqeaQ',
    kokoroVoiceId: 'af_sarah',
    mappingRationale:
      'Sarah has exceptionally clear pronunciation with a patient, measured pace — ' +
      'the defining characteristics for phonics-heavy content (ages 3-7).',
    characteristics: { gender: 'female', style: 'neutral', language: 'en-us' },
  },
] as const;

/**
 * Resolve a voice ID for the Voice Service.
 *
 * Handles four input formats:
 * - Clone reference ('clone:prof_123') → pass through
 * - Kokoro voice ID ('af_bella') → pass through
 * - Persona ID ('vp-warm-storyteller') → resolve to Kokoro ID
 * - Legacy ElevenLabs ID ('EXAVITQu4vr4xnSDxMaL') → resolve to Kokoro ID
 *
 * This is the single translation point between old ElevenLabs-centric
 * voice references and new Kokoro-native IDs.
 */
export function resolveVoiceId(inputVoiceId: string): string {
  if (inputVoiceId.startsWith('clone:')) return inputVoiceId;

  const kokoroPattern = /^[a-z]{2}_[a-z]/;
  if (kokoroPattern.test(inputVoiceId)) return inputVoiceId;

  const byPersona = VOICE_PERSONA_MAPPINGS.find(m => m.personaId === inputVoiceId);
  if (byPersona) return byPersona.kokoroVoiceId;

  const byLegacy = VOICE_PERSONA_MAPPINGS.find(m => m.legacyElevenLabsId === inputVoiceId);
  if (byLegacy) return byLegacy.kokoroVoiceId;

  // Unknown — pass through; Voice Service will validate
  return inputVoiceId;
}


// ============================================================================
// Section 3: Voice Service HTTP Client
// ============================================================================
// Low-level HTTP client for the Voice Service REST API. Handles connection
// management, retries, circuit breaker, caching, and health checks.

export interface VoiceServiceClientConfig {
  baseUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  logger: Logger;
  cache?: Cache;
  cacheTtlSeconds?: number;
}

export class VoiceServiceClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly logger: Logger;
  private readonly cache?: Cache;
  private readonly cacheTtlSeconds: number;

  private consecutiveFailures = 0;
  private circuitOpen = false;
  private circuitResetAt?: Date;
  private static readonly FAILURE_THRESHOLD = 5;
  private static readonly CIRCUIT_RESET_MS = 30_000;

  private lastHealthCheck?: { healthy: boolean; checkedAt: number };
  private static readonly HEALTH_CACHE_MS = 10_000;

  constructor(config: VoiceServiceClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.timeoutMs = config.timeoutMs ?? 30_000;
    this.maxRetries = config.maxRetries ?? 2;
    this.logger = config.logger.child({ module: 'VoiceServiceClient' });
    this.cache = config.cache;
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 3600;
  }

  // ─── TTS ────────────────────────────────────────────────────────────

  async synthesize(params: {
    text: string;
    voiceId: string;
    language?: string;
    pace?: number;
    pitch?: number;
    warmth?: number;
    outputFormat?: string;
  }): Promise<Result<{
    audioBase64: string;
    audioMimeType: string;
    durationMs: number;
    wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>;
    computeSeconds: number;
  }>> {
    if (this.cache) {
      const cacheKey = `tts:${params.voiceId}:${this.hashText(params.text)}`;
      type CachedTts = {
        audioBase64: string; audioMimeType: string; durationMs: number;
        wordTimestamps: Array<{ word: string; startMs: number; endMs: number }>;
        computeSeconds: number;
      };
      const cached = await this.cache.get<CachedTts>(cacheKey);
      if (cached) {
        this.logger.debug('TTS cache hit', { voiceId: params.voiceId, textLen: params.text.length });
        return ok(cached);
      }
    }

    const result = await this.post<{
      audio_data_base64: string;
      sample_rate: number;
      duration_seconds: number;
      word_timestamps: Array<{ word: string; start: number; end: number; confidence?: number }>;
      provider_id: string;
      compute_seconds: number;
    }>('/api/v1/tts/synthesize', {
      text: params.text,
      voice_id: params.voiceId,
      language: params.language ?? 'en-us',
      pace: params.pace ?? 1.0,
      pitch: params.pitch ?? 0.0,
      warmth: params.warmth ?? 0.0,
      output_format: params.outputFormat ?? 'wav',
    });

    if (!result.success) return result as Result<never>;

    const mapped = {
      audioBase64: result.data.audio_data_base64,
      audioMimeType: 'audio/wav',
      durationMs: Math.round(result.data.duration_seconds * 1000),
      wordTimestamps: (result.data.word_timestamps ?? []).map(wt => ({
        word: wt.word,
        startMs: Math.round(wt.start * 1000),
        endMs: Math.round(wt.end * 1000),
      })),
      computeSeconds: result.data.compute_seconds,
    };

    if (this.cache) {
      const cacheKey = `tts:${params.voiceId}:${this.hashText(params.text)}`;
      await this.cache.set(cacheKey, mapped, this.cacheTtlSeconds).catch(() => {});
    }

    return ok(mapped);
  }

  async listVoices(language?: string): Promise<Result<Array<{
    voiceId: string; name: string; language: string; gender: string;
    style: string; providerId: string; isCloned: boolean;
  }>>> {
    const qs = language ? `?language=${encodeURIComponent(language)}` : '';
    return this.get(`/api/v1/tts/voices${qs}`);
  }

  // ─── STT ────────────────────────────────────────────────────────────

  async transcribe(params: {
    audioBase64: string;
    audioMimeType: string;
    language?: string;
    wordTimestamps?: boolean;
  }): Promise<Result<{
    text: string; language: string;
    words: Array<{ word: string; startMs: number; endMs: number; confidence: number }>;
    durationMs: number;
  }>> {
    const result = await this.post<{
      text: string; language: string;
      segments: Array<{
        text: string; start: number; end: number;
        words?: Array<{ word: string; start: number; end: number; probability: number }>;
      }>;
      duration_seconds: number;
    }>('/api/v1/stt/transcribe', {
      audio_base64: params.audioBase64,
      audio_mime_type: params.audioMimeType,
      language: params.language,
      word_timestamps: params.wordTimestamps ?? true,
    });

    if (!result.success) return result as Result<never>;

    const words: Array<{ word: string; startMs: number; endMs: number; confidence: number }> = [];
    for (const seg of result.data.segments) {
      for (const w of seg.words ?? []) {
        words.push({
          word: w.word.trim(),
          startMs: Math.round(w.start * 1000),
          endMs: Math.round(w.end * 1000),
          confidence: w.probability,
        });
      }
    }

    return ok({
      text: result.data.text,
      language: result.data.language,
      words,
      durationMs: Math.round(result.data.duration_seconds * 1000),
    });
  }

  async assessPronunciation(params: {
    audioBase64: string;
    audioMimeType: string;
    referenceText: string;
    language?: string;
  }): Promise<Result<{
    overallScore: number; accuracyScore: number;
    fluencyScore: number; completenessScore: number;
    words: Array<{
      word: string; accuracyScore: number;
      errorType: 'none' | 'omission' | 'insertion' | 'mispronunciation';
    }>;
  }>> {
    const result = await this.post<{
      overall_score: number; accuracy_score: number;
      fluency_score: number; completeness_score: number;
      word_scores: Array<{
        word: string; expected: string; score: number; error_type: string;
      }>;
    }>('/api/v1/stt/assess-pronunciation', {
      audio_base64: params.audioBase64,
      audio_mime_type: params.audioMimeType,
      reference_text: params.referenceText,
      language: params.language ?? 'en-us',
    });

    if (!result.success) return result as Result<never>;

    return ok({
      overallScore: result.data.overall_score,
      accuracyScore: result.data.accuracy_score,
      fluencyScore: result.data.fluency_score,
      completenessScore: result.data.completeness_score,
      words: (result.data.word_scores ?? []).map(ws => ({
        word: ws.expected || ws.word,
        accuracyScore: ws.score,
        errorType: this.mapErrorType(ws.error_type),
      })),
    });
  }

  // ─── Health ─────────────────────────────────────────────────────────

  async isHealthy(): Promise<boolean> {
    const now = Date.now();
    if (this.lastHealthCheck && (now - this.lastHealthCheck.checkedAt) < VoiceServiceClient.HEALTH_CACHE_MS) {
      return this.lastHealthCheck.healthy;
    }
    try {
      const response = await fetch(`${this.baseUrl}/healthz`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      const healthy = response.ok;
      this.lastHealthCheck = { healthy, checkedAt: now };
      return healthy;
    } catch {
      this.lastHealthCheck = { healthy: false, checkedAt: now };
      return false;
    }
  }

  // ─── HTTP Primitives ────────────────────────────────────────────────

  private async post<T>(path: string, body: Record<string, unknown>): Promise<Result<T>> {
    if (this.isCircuitOpen()) {
      return fail(new ServiceUnavailableError(
        'Voice Service circuit breaker is open',
        { resetAt: this.circuitResetAt?.toISOString() },
      ));
    }

    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}${path}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (!response.ok) {
          const errorBody = await response.text().catch(() => 'Unknown error');
          if (response.status >= 500) {
            lastError = new Error(`Voice Service ${response.status}: ${errorBody}`);
            this.logger.warn('Voice Service error, retrying', { path, status: response.status, attempt });
            continue;
          }
          this.recordSuccess(); // 4xx is not a service failure
          return fail(new ProviderError(
            `Voice Service rejected request: ${response.status}`,
            { status: response.status, body: errorBody },
          ));
        }

        const data = await response.json() as T;
        this.recordSuccess();
        return ok(data);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < this.maxRetries) {
          this.logger.warn('Voice Service failed, retrying', { path, attempt, error: lastError.message });
          await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));
        }
      }
    }

    this.recordFailure();
    return fail(new ServiceUnavailableError(
      `Voice Service unavailable after ${this.maxRetries + 1} attempts: ${lastError?.message}`,
    ));
  }

  private async get<T>(path: string): Promise<Result<T>> {
    if (this.isCircuitOpen()) {
      return fail(new ServiceUnavailableError('Voice Service circuit breaker is open'));
    }
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: 'GET',
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (!response.ok) {
        const errorBody = await response.text().catch(() => 'Unknown');
        return fail(new ProviderError(`Voice Service GET ${path}: ${response.status}`, { body: errorBody }));
      }
      const data = await response.json() as T;
      this.recordSuccess();
      return ok(data);
    } catch (error) {
      this.recordFailure();
      return fail(new ServiceUnavailableError(
        `Voice Service GET ${path}: ${error instanceof Error ? error.message : String(error)}`,
      ));
    }
  }

  // ─── Circuit Breaker ────────────────────────────────────────────────

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.circuitOpen) {
      this.circuitOpen = false;
      this.circuitResetAt = undefined;
      this.logger.info('Voice Service circuit breaker CLOSED');
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= VoiceServiceClient.FAILURE_THRESHOLD && !this.circuitOpen) {
      this.circuitOpen = true;
      this.circuitResetAt = new Date(Date.now() + VoiceServiceClient.CIRCUIT_RESET_MS);
      this.logger.warn('Circuit breaker OPEN', {
        failures: this.consecutiveFailures,
        resetsAt: this.circuitResetAt.toISOString(),
      });
    }
  }

  private isCircuitOpen(): boolean {
    if (!this.circuitOpen) return false;
    if (this.circuitResetAt && new Date() >= this.circuitResetAt) {
      this.circuitOpen = false;
      this.logger.info('Voice Service circuit breaker HALF-OPEN');
      return false;
    }
    return true;
  }

  private mapErrorType(raw: string): 'none' | 'omission' | 'insertion' | 'mispronunciation' {
    const n = raw.toLowerCase();
    if (n === 'correct' || n === 'none') return 'none';
    if (n === 'omission' || n === 'deletion') return 'omission';
    if (n === 'insertion') return 'insertion';
    return 'mispronunciation';
  }

  private hashText(text: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return hash.toString(36);
  }

  getCircuitState(): { open: boolean; consecutiveFailures: number; resetAt?: string } {
    return {
      open: this.circuitOpen,
      consecutiveFailures: this.consecutiveFailures,
      resetAt: this.circuitResetAt?.toISOString(),
    };
  }
}


// ============================================================================
// Section 4: ScholarlyVoiceAdapter — ISpeechProvider Implementation
// ============================================================================
// Registered in the ProviderRegistry at priority 1, replacing the former
// ElevenLabsAdapter (priority 10). Every consuming service sees the
// identical ISpeechProvider interface.

export interface ScholarlyVoiceAdapterConfig {
  voiceServiceUrl: string;
  timeoutMs?: number;
  logger: Logger;
  cache?: Cache;
  /** Cost per 1000 chars TTS — amortised GPU compute (default: $0.002) */
  costPerThousandChars?: number;
  /** Cost per second STT — amortised GPU compute (default: $0.001) */
  costPerSecondStt?: number;
}

/**
 * ScholarlyVoiceAdapter — The AIPAL provider for self-hosted voice.
 *
 * Cost model: Instead of ElevenLabs' per-character API pricing ($0.18/1000
 * chars), costs are amortised GPU compute. A T4 instance costs ~$252/month
 * regardless of volume. For cost attribution we estimate a nominal
 * per-request cost based on GPU utilisation.
 *
 * A school district with 5,000 learners:
 * - ElevenLabs: ~$15,000/month
 * - Self-hosted: ~$300/month
 * That's the reason this adapter exists.
 */
export class ScholarlyVoiceAdapter implements ISpeechProvider {
  readonly providerId: ProviderId = 'scholarly-voice';
  readonly capabilities = ['speech'] as const;

  private readonly client: VoiceServiceClient;
  private readonly logger: Logger;
  private readonly costPerThousandChars: number;
  private readonly costPerSecondStt: number;

  constructor(config: ScholarlyVoiceAdapterConfig) {
    this.logger = config.logger.child({ module: 'ScholarlyVoiceAdapter' });
    this.costPerThousandChars = config.costPerThousandChars ?? 0.002;
    this.costPerSecondStt = config.costPerSecondStt ?? 0.001;

    this.client = new VoiceServiceClient({
      baseUrl: config.voiceServiceUrl,
      timeoutMs: config.timeoutMs ?? 30_000,
      maxRetries: 2,
      logger: config.logger,
      cache: config.cache,
      cacheTtlSeconds: 3600,
    });
  }

  // ─── ISpeechProvider.synthesize ─────────────────────────────────────

  async synthesize(request: TextToSpeechRequest): Promise<AIResult<TextToSpeechResponse>> {
    const startTime = Date.now();

    if (!request.text || request.text.trim().length === 0) {
      return { success: false, error: new ValidationError('Text is required for synthesis') };
    }

    const resolvedVoiceId = resolveVoiceId(request.voiceId);

    this.logger.info('Synthesising speech', {
      tenantId: request.tenantId,
      voiceId: resolvedVoiceId,
      originalVoiceId: request.voiceId !== resolvedVoiceId ? request.voiceId : undefined,
      textLength: request.text.length,
    });

    const result = await this.client.synthesize({
      text: request.text,
      voiceId: resolvedVoiceId,
      pace: request.speed ?? 1.0,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        usage: this.buildUsage('synthesize-failed', Date.now() - startTime, 0, false),
      };
    }

    const costUsd = (request.text.length / 1000) * this.costPerThousandChars;

    return {
      success: true,
      data: {
        audioBase64: result.data.audioBase64,
        audioMimeType: result.data.audioMimeType,
        durationMs: result.data.durationMs,
        wordTimestamps: request.wordTimestamps !== false ? result.data.wordTimestamps : undefined,
      },
      usage: this.buildUsage('kokoro-tts', Date.now() - startTime, costUsd, false),
    };
  }

  // ─── ISpeechProvider.transcribe ─────────────────────────────────────

  async transcribe(request: TranscriptionRequest): Promise<AIResult<TranscriptionResponse>> {
    const startTime = Date.now();

    if (!request.audioBase64 && !request.audioUrl) {
      return { success: false, error: new ValidationError('Either audioBase64 or audioUrl required') };
    }

    let audioBase64 = request.audioBase64 ?? '';
    let audioMimeType = request.audioMimeType ?? 'audio/wav';

    if (!audioBase64 && request.audioUrl) {
      try {
        const response = await fetch(request.audioUrl, { signal: AbortSignal.timeout(15_000) });
        if (!response.ok) {
          return { success: false, error: new ProviderError(`Failed to fetch audio: ${response.status}`) };
        }
        const buffer = await response.arrayBuffer();
        audioBase64 = Buffer.from(buffer).toString('base64');
        audioMimeType = response.headers.get('content-type') ?? 'audio/wav';
      } catch (error) {
        return { success: false, error: new ProviderError(`Audio fetch failed: ${error}`) };
      }
    }

    this.logger.info('Transcribing audio', {
      tenantId: request.tenantId,
      language: request.language,
      audioLength: audioBase64.length,
    });

    const result = await this.client.transcribe({
      audioBase64,
      audioMimeType,
      language: request.language,
      wordTimestamps: request.wordTimestamps ?? true,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        usage: this.buildUsage('transcribe-failed', Date.now() - startTime, 0, false),
      };
    }

    const durationSec = result.data.durationMs / 1000;
    const costUsd = durationSec * this.costPerSecondStt;

    return {
      success: true,
      data: {
        text: result.data.text,
        language: result.data.language,
        words: result.data.words,
        durationMs: result.data.durationMs,
      },
      usage: this.buildUsage('whisper-stt', Date.now() - startTime, costUsd, false),
    };
  }

  // ─── ISpeechProvider.assessPronunciation ─────────────────────────────

  async assessPronunciation(
    request: PronunciationAssessmentRequest,
  ): Promise<AIResult<PronunciationAssessmentResponse>> {
    const startTime = Date.now();

    if (!request.audioBase64 || !request.referenceText) {
      return { success: false, error: new ValidationError('audioBase64 and referenceText required') };
    }

    this.logger.info('Assessing pronunciation', {
      tenantId: request.tenantId,
      referenceLength: request.referenceText.length,
      language: request.language,
    });

    const result = await this.client.assessPronunciation({
      audioBase64: request.audioBase64,
      audioMimeType: request.audioMimeType,
      referenceText: request.referenceText,
      language: request.language,
    });

    if (!result.success) {
      return {
        success: false,
        error: result.error,
        usage: this.buildUsage('pronunciation-failed', Date.now() - startTime, 0, false),
      };
    }

    const costUsd = 0.005; // Flat estimate for typical read-aloud (~5 seconds)

    return {
      success: true,
      data: result.data,
      usage: this.buildUsage('whisper-pronunciation', Date.now() - startTime, costUsd, false),
    };
  }

  // ─── Health & Monitoring ────────────────────────────────────────────

  async checkHealth(): Promise<boolean> {
    return this.client.isHealthy();
  }

  getStatus(): {
    providerId: string;
    healthy: boolean;
    circuitState: { open: boolean; consecutiveFailures: number; resetAt?: string };
  } {
    const circuit = this.client.getCircuitState();
    return { providerId: this.providerId, healthy: !circuit.open, circuitState: circuit };
  }

  // ─── Internals ──────────────────────────────────────────────────────

  private buildUsage(model: string, durationMs: number, costUsd: number, cached: boolean): AIUsageMetadata {
    return { providerId: this.providerId, model, durationMs, costUsd, cached };
  }
}


// ============================================================================
// Section 5: Provider Registration Factory
// ============================================================================
// Wires the ScholarlyVoiceAdapter into the AIPAL ProviderRegistry,
// replacing the ElevenLabsAdapter registration. Called from server startup.

export interface ProviderRegistrationConfig {
  id: ProviderId;
  displayName: string;
  capabilities: string[];
  instance: ISpeechProvider;
  priorities: Record<string, number>;
  eligibleTiers: CostTier[];
  enabled: boolean;
}

/**
 * Create the ProviderRegistry registration for ScholarlyVoiceAdapter.
 *
 * Priority 1 (highest). ElevenLabs was at priority 10. Now the self-hosted
 * service is the sole voice provider. If it's down, the circuit breaker
 * opens and returns a clear error rather than silently falling back to
 * a $15k/month commercial API.
 */
export function createVoiceProviderRegistration(
  config: ScholarlyVoiceAdapterConfig,
): ProviderRegistrationConfig {
  const adapter = new ScholarlyVoiceAdapter(config);

  return {
    id: 'scholarly-voice' as ProviderId,
    displayName: 'Scholarly Voice Service (Self-Hosted)',
    capabilities: ['speech'],
    instance: adapter,
    priorities: { speech: 1 },
    eligibleTiers: ['critical', 'standard', 'economy'],
    enabled: true,
  };
}


// ============================================================================
// Section 6: Voice ID Migration SQL Generator
// ============================================================================
// One-time migration to update all voice references in the database from
// ElevenLabs voice IDs to Kokoro voice IDs. Used in Week 3 ElevenLabs
// removal. Data-only migration — no schema changes needed.

export function generateVoiceMigrationSql(): string[] {
  const sql: string[] = [];

  sql.push('-- Voice ID Migration: ElevenLabs → Kokoro (Self-Hosted)');
  sql.push('-- Generated by Sprint 30 Week 1 AIPAL Voice Adapter');
  sql.push('BEGIN;');
  sql.push('');

  for (const m of VOICE_PERSONA_MAPPINGS) {
    sql.push(`-- ${m.name}: ${m.legacyElevenLabsId} → ${m.kokoroVoiceId}`);
    sql.push(
      `UPDATE "VoicePersona" SET "voiceId" = '${m.kokoroVoiceId}', ` +
      `"provider" = 'scholarly-voice', "updatedAt" = NOW() ` +
      `WHERE "voiceId" = '${m.legacyElevenLabsId}';`,
    );
  }

  sql.push('');
  sql.push('-- Migrate narration configs');
  for (const m of VOICE_PERSONA_MAPPINGS) {
    sql.push(
      `UPDATE "StoryNarrationConfig" SET "voiceId" = '${m.kokoroVoiceId}', ` +
      `"updatedAt" = NOW() WHERE "voiceId" = '${m.legacyElevenLabsId}';`,
    );
  }

  sql.push('');
  sql.push('-- Migrate storybook page narration references');
  for (const m of VOICE_PERSONA_MAPPINGS) {
    sql.push(
      `UPDATE "StorybookPage" SET "narratorVoiceId" = '${m.kokoroVoiceId}' ` +
      `WHERE "narratorVoiceId" = '${m.legacyElevenLabsId}';`,
    );
  }

  sql.push('');
  sql.push('COMMIT;');
  return sql;
}


// ============================================================================
// Section 7: Narration Service Migration Checklist
// ============================================================================
// The NarrationService (audio-narration.ts, 1,138 lines, Sprint 21)
// currently instantiates ElevenLabsTTSClient directly. This checklist
// documents the surgical changes needed to route through AIPAL instead.
//
// BEFORE:
//   const ttsClient = new ElevenLabsTTSClient({ apiKey, baseUrl, ... });
//   const result = await ttsClient.synthesize(text, voiceId, options);
//
// AFTER:
//   const result = await this.aiService.synthesizeSpeech({
//     text, voiceId, tenantId, tier: 'standard', wordTimestamps: true,
//   });
//
// The AIService routes through RoutingEngine → ScholarlyVoiceAdapter →
// Voice Service. NarrationService never knows which backend produced
// the audio. That's the abstraction working as designed.

export const NARRATION_SERVICE_MIGRATION_CHECKLIST = [
  'Replace ElevenLabsTTSClient with AIService dependency injection',
  'Remove elevenLabsApiKey, elevenLabsBaseUrl from NarrationServiceConfig',
  'Remove ElevenLabs model constants (FLASH_V2_5, TURBO_V2_5, etc.)',
  'Remove voiceSettings (stability, similarityBoost, style, useSpeakerBoost)',
  'Replace ttsClient.synthesize() with aiService.synthesizeSpeech()',
  'Update VoicePersona type: remove elevenLabsVoiceId, add kokoroVoiceId',
  'Update voice persona library entries with Kokoro voice IDs',
  'Remove ElevenLabs cost estimation logic (adapter tracks costs)',
  'Remove ElevenLabs word timestamp extraction (adapter handles it)',
  'Verify pace adaptation works (speed param maps to pace in Voice Service)',
  'Run data migration SQL to update voice references in database',
  'Delete ElevenLabsTTSClient class and related imports',
] as const;
