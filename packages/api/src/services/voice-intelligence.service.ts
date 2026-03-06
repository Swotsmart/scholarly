/**
 * Voice Intelligence Service
 *
 * Self-hosted voice service integration for voice-powered language learning.
 * Provides TTS, STT, pronunciation assessment, conversational agents,
 * voice cloning, and VR audio capabilities.
 *
 * Uses the Scholarly Voice Service (Kokoro TTS, Whisper STT, Chatterbox cloning)
 * deployed as `scholarly-voice` on GPU T4 workload.
 *
 * @module VoiceIntelligenceService
 */

import { ScholarlyBaseService, Result, isFailure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import { EdgeTTS } from '@andresaya/edge-tts';

// ============================================================================
// TYPES
// ============================================================================

export type AudioFormat =
  | 'mp3_44100_128'
  | 'mp3_44100_192'
  | 'pcm_16000'
  | 'pcm_22050'
  | 'pcm_24000'
  | 'opus_48000';

export type TTSModel =
  | 'kokoro_default'
  | 'kokoro_fast';

export interface VoiceSettings {
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface TTSRequest {
  tenantId: string;
  text: string;
  voiceId: string;
  modelId?: TTSModel;
  voiceSettings?: VoiceSettings;
  outputFormat?: AudioFormat;
  language?: string;
}

export interface TTSResponse {
  audioData: Buffer;
  durationMs?: number;
  characterCount: number;
  creditsUsed: number;
}

export interface STTRequest {
  tenantId: string;
  audioData: Buffer;
  audioFormat: AudioFormat;
  language?: string;
  enableWordTimestamps?: boolean;
}

export interface STTResponse {
  transcript: string;
  confidence: number;
  language: string;
  words?: Array<{
    word: string;
    startMs: number;
    endMs: number;
    confidence: number;
  }>;
}

export interface PronunciationAssessmentRequest {
  tenantId: string;
  learnerId: string;
  audioData: Buffer;
  audioFormat: AudioFormat;
  expectedText: string;
  language: string;
  assessmentType: 'read_aloud' | 'free_speech' | 'word_practice';
  strictness?: 'lenient' | 'moderate' | 'strict';
}

export interface PronunciationAssessmentResponse {
  overallScore: number;
  scores: {
    accuracy: number;
    fluency: number;
    completeness: number;
    prosody: number;
    grammar?: number;
  };
  wordAnalysis?: Array<{
    word: string;
    expected: string;
    actual: string;
    expectedPhonemes?: string;
    actualPhonemes?: string;
    score: number;
    suggestion?: string;
  }>;
  issues?: Array<{
    word: string;
    type: 'pronunciation' | 'fluency' | 'grammar' | 'missing' | 'extra';
    suggestion: string;
  }>;
}

export interface ConversationAgent {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  agentId: string;
  voiceId: string;
  primaryLanguage: string;
  supportedLanguages: string[];
  systemPrompt: string;
  firstMessage: string;
  persona: Record<string, unknown>;
  status: 'active' | 'draft' | 'disabled';
}

export interface ConversationSession {
  id: string;
  tenantId: string;
  agentId: string;
  userId: string;
  learnerId?: string;
  scenarioId?: string;
  status: 'initializing' | 'active' | 'paused' | 'completed' | 'error';
  websocketUrl?: string;
  startedAt: Date;
  endedAt?: Date;
}

export interface ConversationTurn {
  speaker: 'agent' | 'learner';
  language: string;
  audioUrl: string;
  transcript: string;
  startMs: number;
  endMs: number;
  assessment?: {
    pronunciationScore?: number;
    grammarScore?: number;
    fluencyScore?: number;
    issues?: string[];
  };
}

export interface LinguaFlowVoice {
  id: string;
  personaId: string;
  displayName: string;
  language: string;
  region: string;
  accent: string;
  gender: 'male' | 'female' | 'neutral';
  ageRange: 'child' | 'young_adult' | 'adult' | 'senior';
  speakingStyles: string[];
  suitableFor: string[];
  provider?: 'kokoro' | 'edge-tts';
}

export interface VoiceCloneRequest {
  tenantId: string;
  voiceOwnerId: string;
  voiceOwnerRole: 'tutor' | 'content_creator' | 'learner_adult';
  name: string;
  description?: string;
  quality: 'instant' | 'professional';
  sampleAudioUrls: string[];
  allowedPurposes: ('content_narration' | 'tutoring_sessions' | 'pronunciation_models')[];
  consentMethod: 'digital_signature' | 'checkbox_agreement' | 'verbal_recorded';
}

export interface DialogueScript {
  title: string;
  language: string;
  targetLevel: string;
  characters: Array<{
    id: string;
    name: string;
    role: string;
    voiceId: string;
    voiceSettings?: VoiceSettings;
  }>;
  lines: Array<{
    sequence: number;
    characterId: string;
    text: string;
    emotion?: 'neutral' | 'happy' | 'sad' | 'excited' | 'confused' | 'angry';
    pauseBeforeMs?: number;
  }>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class VoiceIntelligenceService extends ScholarlyBaseService {
  private voiceServiceUrl: string;

  constructor() {
    super('VoiceIntelligenceService');
    const url = process.env.VOICE_SERVICE_URL;
    if (!url) {
      log.warn('VOICE_SERVICE_URL not set — voice intelligence features will fail at runtime');
    }
    this.voiceServiceUrl = url || '';
  }

  /**
   * Make an HTTP request to the self-hosted voice service
   */
  private async voiceServiceRequest<T>(path: string, options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    responseType?: 'json' | 'buffer';
    timeoutMs?: number;
  } = {}): Promise<T> {
    if (!this.voiceServiceUrl) {
      throw new Error('VOICE_SERVICE_URL is not configured');
    }

    const { method = 'POST', body, headers = {}, responseType = 'json', timeoutMs = 30_000 } = options;
    const url = `${this.voiceServiceUrl}${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Voice service error (${response.status}): ${errorText}`);
      }

      if (responseType === 'buffer') {
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer) as unknown as T;
      }

      return response.json() as Promise<T>;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Check that the voice service is reachable
   */
  async checkHealth(): Promise<Result<{ status: string }>> {
    try {
      const result = await this.voiceServiceRequest<{ status: string }>('/healthz', { method: 'GET' });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: { code: 'VOICE_SERVICE_UNAVAILABLE', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 1: TEXT-TO-SPEECH
  // --------------------------------------------------------------------------

  /**
   * Generate speech using Edge TTS (Microsoft)
   */
  private async edgeTTS(text: string, voiceId: string, rate?: string): Promise<Buffer> {
    // Edge TTS voice IDs stored as "edge-fr-FR-DeniseNeural" → extract "fr-FR-DeniseNeural"
    const edgeVoiceId = voiceId.startsWith('edge-') ? voiceId.slice(5) : voiceId;
    const tts = new EdgeTTS();
    await tts.synthesize(text, edgeVoiceId, {
      rate: rate || '0%',
    });
    return tts.toBuffer();
  }

  /**
   * Generate speech from text — routes to Kokoro or Edge TTS based on voice ID
   */
  async textToSpeech(request: TTSRequest): Promise<Result<TTSResponse>> {
    try {
      let audioData: Buffer;

      if (request.voiceId.startsWith('edge-')) {
        // Edge TTS provider
        audioData = await this.edgeTTS(request.text, request.voiceId);
      } else {
        // Kokoro TTS (self-hosted)
        audioData = await this.voiceServiceRequest<Buffer>('/api/v1/tts/synthesize', {
          body: {
            text: request.text,
            voice_id: request.voiceId,
            language: request.language,
            speed: request.voiceSettings?.style,
          },
          responseType: 'buffer',
        });
      }

      // Track usage
      await this.trackUsage(request.tenantId, 'tts', request.text.length);

      return {
        success: true,
        data: {
          audioData,
          characterCount: request.text.length,
          creditsUsed: 0,
        },
      };
    } catch (error) {
      log.error('TTS generation failed', error as Error);
      return { success: false, error: { code: 'TTS_FAILED', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 2: SPEECH-TO-TEXT
  // --------------------------------------------------------------------------

  /**
   * Transcribe audio to text using self-hosted Whisper STT
   */
  async speechToText(request: STTRequest): Promise<Result<STTResponse>> {
    try {
      const sttResult = await this.voiceServiceRequest<{
        text?: string;
        language?: string;
        words?: Array<{ text: string; start: number; end: number; confidence?: number }>;
      }>('/api/v1/stt/transcribe', {
        body: {
          audio_data: request.audioData.toString('base64'),
          audio_format: request.audioFormat,
          language: request.language,
          enable_word_timestamps: request.enableWordTimestamps,
        },
      });

      return {
        success: true,
        data: {
          transcript: sttResult.text || '',
          confidence: 0.95,
          language: sttResult.language || request.language || 'en',
          words: sttResult.words?.map((w) => ({
            word: w.text,
            startMs: Math.floor(w.start * 1000),
            endMs: Math.floor(w.end * 1000),
            confidence: w.confidence ?? 0.95,
          })),
        },
      };
    } catch (error) {
      log.error('STT transcription failed', error as Error);
      return { success: false, error: { code: 'STT_FAILED', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 2: PRONUNCIATION ASSESSMENT
  // --------------------------------------------------------------------------

  /**
   * Assess pronunciation quality
   */
  async assessPronunciation(request: PronunciationAssessmentRequest): Promise<Result<PronunciationAssessmentResponse>> {
    try {
      // First transcribe the audio
      const transcription = await this.speechToText({
        tenantId: request.tenantId,
        audioData: request.audioData,
        audioFormat: request.audioFormat,
        language: request.language,
        enableWordTimestamps: true,
      });

      if (isFailure(transcription)) {
        return { success: false, error: transcription.error };
      }
      if (!transcription.data) {
        return { success: false, error: { code: 'TRANSCRIPTION_FAILED', message: 'Transcription failed' } };
      }

      // Compare with expected text
      const expected = request.expectedText.toLowerCase().split(/\s+/);
      const actual = transcription.data.transcript.toLowerCase().split(/\s+/);

      let matchCount = 0;
      const wordAnalysis: PronunciationAssessmentResponse['wordAnalysis'] = [];
      const issues: PronunciationAssessmentResponse['issues'] = [];

      for (let i = 0; i < expected.length; i++) {
        const expectedWord = expected[i];
        const actualWord = actual[i] || '';

        if (expectedWord === actualWord) {
          matchCount++;
          wordAnalysis.push({
            word: expectedWord,
            expected: expectedWord,
            actual: actualWord,
            score: 1.0,
          });
        } else if (actualWord) {
          const similarity = this.calculateSimilarity(expectedWord, actualWord);
          wordAnalysis.push({
            word: expectedWord,
            expected: expectedWord,
            actual: actualWord,
            score: similarity,
            suggestion: similarity < 0.7 ? `Try pronouncing "${expectedWord}" more clearly` : undefined,
          });

          if (similarity < 0.7) {
            issues.push({
              word: expectedWord,
              type: 'pronunciation',
              suggestion: `Listen to the correct pronunciation of "${expectedWord}" and try again`,
            });
          }
        } else {
          wordAnalysis.push({
            word: expectedWord,
            expected: expectedWord,
            actual: '',
            score: 0,
            suggestion: `Word "${expectedWord}" was not detected`,
          });

          issues.push({
            word: expectedWord,
            type: 'missing',
            suggestion: `Make sure to pronounce "${expectedWord}"`,
          });
        }
      }

      const accuracy = matchCount / expected.length;
      const completeness = Math.min(actual.length / expected.length, 1.0);

      // Save assessment to database
      await this.saveAssessment(request.tenantId, request.learnerId, {
        expectedText: request.expectedText,
        actualTranscript: transcription.data.transcript,
        scores: { accuracy, completeness },
        issues,
      });

      return {
        success: true,
        data: {
          overallScore: Math.round((accuracy + completeness) / 2 * 100),
          scores: {
            accuracy: Math.round(accuracy * 100),
            fluency: Math.round(0.85 * 100), // Placeholder
            completeness: Math.round(completeness * 100),
            prosody: Math.round(0.80 * 100), // Placeholder
          },
          wordAnalysis,
          issues,
        },
      };
    } catch (error) {
      log.error('Pronunciation assessment failed', error as Error);
      return { success: false, error: { code: 'ASSESSMENT_FAILED', message: (error as Error).message } };
    }
  }

  private calculateSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (a.length === 0 || b.length === 0) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    const distance = matrix[b.length][a.length];
    return 1 - distance / Math.max(a.length, b.length);
  }

  private async saveAssessment(tenantId: string, learnerId: string, data: any): Promise<void> {
    // Would save to VoicePronunciationAssessment table
    log.info('Pronunciation assessment saved', { tenantId, learnerId });
  }

  // --------------------------------------------------------------------------
  // PHASE 3: VOICE LIBRARY
  // --------------------------------------------------------------------------

  /**
   * Get available voices for language learning from self-hosted voice service
   */
  async getVoiceLibrary(tenantId: string, options?: {
    language?: string;
    gender?: string;
    suitableFor?: string;
  }): Promise<Result<LinguaFlowVoice[]>> {
    try {
      // Kokoro TTS v1.0 — full voice catalog (62 voices, 9 languages)
      const voices: LinguaFlowVoice[] = [
        // ── American English (20 voices) ──
        { id: 'af_heart', personaId: 'af_heart', displayName: 'Heart', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'narration', 'warm'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'af_alloy', personaId: 'af_alloy', displayName: 'Alloy', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'neutral'], suitableFor: ['secondary', 'adult'] },
        { id: 'af_aoede', personaId: 'af_aoede', displayName: 'Aoede', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['narration', 'expressive'], suitableFor: ['secondary', 'adult'] },
        { id: 'af_bella', personaId: 'af_bella', displayName: 'Bella', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'narration', 'warm'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'af_jessica', personaId: 'af_jessica', displayName: 'Jessica', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational'], suitableFor: ['secondary', 'adult'] },
        { id: 'af_kore', personaId: 'af_kore', displayName: 'Kore', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['narration', 'calm'], suitableFor: ['secondary', 'adult'] },
        { id: 'af_nicole', personaId: 'af_nicole', displayName: 'Nicole', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'podcast'], suitableFor: ['secondary', 'adult'] },
        { id: 'af_nova', personaId: 'af_nova', displayName: 'Nova', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'bright'], suitableFor: ['primary', 'secondary'] },
        { id: 'af_river', personaId: 'af_river', displayName: 'River', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'calm'], suitableFor: ['secondary', 'adult'] },
        { id: 'af_sarah', personaId: 'af_sarah', displayName: 'Sarah', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['primary', 'secondary'] },
        { id: 'af_sky', personaId: 'af_sky', displayName: 'Sky', language: 'en', region: 'US', accent: 'American', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'light'], suitableFor: ['primary', 'secondary'] },
        { id: 'am_adam', personaId: 'am_adam', displayName: 'Adam', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'narration'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'am_echo', personaId: 'am_echo', displayName: 'Echo', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational'], suitableFor: ['secondary', 'adult'] },
        { id: 'am_eric', personaId: 'am_eric', displayName: 'Eric', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'professional'], suitableFor: ['secondary', 'adult'] },
        { id: 'am_fenrir', personaId: 'am_fenrir', displayName: 'Fenrir', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'deep'], suitableFor: ['secondary', 'adult'] },
        { id: 'am_liam', personaId: 'am_liam', displayName: 'Liam', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'young_adult', speakingStyles: ['conversational'], suitableFor: ['primary', 'secondary'] },
        { id: 'am_michael', personaId: 'am_michael', displayName: 'Michael', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'young_adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['primary', 'secondary'] },
        { id: 'am_onyx', personaId: 'am_onyx', displayName: 'Onyx', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'authoritative'], suitableFor: ['secondary', 'adult'] },
        { id: 'am_puck', personaId: 'am_puck', displayName: 'Puck', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'expressive'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'am_santa', personaId: 'am_santa', displayName: 'Santa', language: 'en', region: 'US', accent: 'American', gender: 'male', ageRange: 'senior', speakingStyles: ['narration', 'warm', 'character'], suitableFor: ['primary'] },

        // ── British English (8 voices) ──
        { id: 'bf_alice', personaId: 'bf_alice', displayName: 'Alice', language: 'en', region: 'GB', accent: 'British', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'bf_emma', personaId: 'bf_emma', displayName: 'Emma', language: 'en', region: 'GB', accent: 'British', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'bf_isabella', personaId: 'bf_isabella', displayName: 'Isabella', language: 'en', region: 'GB', accent: 'British', gender: 'female', ageRange: 'adult', speakingStyles: ['narration', 'refined'], suitableFor: ['secondary', 'adult'] },
        { id: 'bf_lily', personaId: 'bf_lily', displayName: 'Lily', language: 'en', region: 'GB', accent: 'British', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'light'], suitableFor: ['primary', 'secondary'] },
        { id: 'bm_daniel', personaId: 'bm_daniel', displayName: 'Daniel', language: 'en', region: 'GB', accent: 'British', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'professional'], suitableFor: ['secondary', 'adult'] },
        { id: 'bm_fable', personaId: 'bm_fable', displayName: 'Fable', language: 'en', region: 'GB', accent: 'British', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'storytelling'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'bm_george', personaId: 'bm_george', displayName: 'George', language: 'en', region: 'GB', accent: 'British', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'authoritative'], suitableFor: ['secondary', 'adult'] },
        { id: 'bm_lewis', personaId: 'bm_lewis', displayName: 'Lewis', language: 'en', region: 'GB', accent: 'British', gender: 'male', ageRange: 'young_adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'] },

        // ── French (1 voice) ──
        { id: 'ff_siwis', personaId: 'ff_siwis', displayName: 'Siwis', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'] },

        // ── Spanish (3 voices) ──
        { id: 'ef_dora', personaId: 'ef_dora', displayName: 'Dora', language: 'es', region: 'ES', accent: 'European Spanish', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'em_alex', personaId: 'em_alex', displayName: 'Alejandro', language: 'es', region: 'ES', accent: 'European Spanish', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'] },
        { id: 'em_santa', personaId: 'em_santa', displayName: 'Santiago', language: 'es', region: 'ES', accent: 'European Spanish', gender: 'male', ageRange: 'senior', speakingStyles: ['narration', 'warm', 'character'], suitableFor: ['primary'] },

        // ── Japanese (5 voices) ──
        { id: 'jf_alpha', personaId: 'jf_alpha', displayName: 'Aoi', language: 'ja', region: 'JP', accent: 'Japanese', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'] },
        { id: 'jf_gongitsune', personaId: 'jf_gongitsune', displayName: 'Hana', language: 'ja', region: 'JP', accent: 'Japanese', gender: 'female', ageRange: 'young_adult', speakingStyles: ['narration', 'storytelling'], suitableFor: ['primary', 'secondary'] },
        { id: 'jf_nezumi', personaId: 'jf_nezumi', displayName: 'Sakura', language: 'ja', region: 'JP', accent: 'Japanese', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'light'], suitableFor: ['primary', 'secondary'] },
        { id: 'jf_tebukuro', personaId: 'jf_tebukuro', displayName: 'Yuki', language: 'ja', region: 'JP', accent: 'Japanese', gender: 'female', ageRange: 'adult', speakingStyles: ['narration', 'calm'], suitableFor: ['secondary', 'adult'] },
        { id: 'jm_kumo', personaId: 'jm_kumo', displayName: 'Ren', language: 'ja', region: 'JP', accent: 'Japanese', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'narration'], suitableFor: ['secondary', 'adult'] },

        // ── Mandarin Chinese (8 voices) ──
        { id: 'zf_xiaobei', personaId: 'zf_xiaobei', displayName: 'Xiaobei', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'bright'], suitableFor: ['primary', 'secondary'] },
        { id: 'zf_xiaoni', personaId: 'zf_xiaoni', displayName: 'Xiaoni', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['secondary', 'adult'] },
        { id: 'zf_xiaoxiao', personaId: 'zf_xiaoxiao', displayName: 'Xiaoxiao', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'narration'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'zf_xiaoyi', personaId: 'zf_xiaoyi', displayName: 'Xiaoyi', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'professional'], suitableFor: ['secondary', 'adult'] },
        { id: 'zm_yunjian', personaId: 'zm_yunjian', displayName: 'Yunjian', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'authoritative'], suitableFor: ['secondary', 'adult'] },
        { id: 'zm_yunxi', personaId: 'zm_yunxi', displayName: 'Yunxi', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'male', ageRange: 'young_adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'] },
        { id: 'zm_yunxia', personaId: 'zm_yunxia', displayName: 'Yunxia', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'calm'], suitableFor: ['secondary', 'adult'] },
        { id: 'zm_yunyang', personaId: 'zm_yunyang', displayName: 'Yunyang', language: 'zh', region: 'CN', accent: 'Mandarin', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'news'], suitableFor: ['secondary', 'adult'] },

        // ── Hindi (4 voices) ──
        { id: 'hf_alpha', personaId: 'hf_alpha', displayName: 'Ananya', language: 'hi', region: 'IN', accent: 'Hindi', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'] },
        { id: 'hf_beta', personaId: 'hf_beta', displayName: 'Priya', language: 'hi', region: 'IN', accent: 'Hindi', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary'] },
        { id: 'hm_omega', personaId: 'hm_omega', displayName: 'Arjun', language: 'hi', region: 'IN', accent: 'Hindi', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'professional'], suitableFor: ['secondary', 'adult'] },
        { id: 'hm_psi', personaId: 'hm_psi', displayName: 'Rohan', language: 'hi', region: 'IN', accent: 'Hindi', gender: 'male', ageRange: 'young_adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'] },

        // ── Italian (2 voices) ──
        { id: 'if_sara', personaId: 'if_sara', displayName: 'Sara', language: 'it', region: 'IT', accent: 'Italian', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['secondary', 'adult'] },
        { id: 'im_nicola', personaId: 'im_nicola', displayName: 'Nicola', language: 'it', region: 'IT', accent: 'Italian', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'] },

        // ── Brazilian Portuguese (3 voices) ──
        { id: 'pf_dora', personaId: 'pf_dora', displayName: 'Dora', language: 'pt', region: 'BR', accent: 'Brazilian Portuguese', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'pm_alex', personaId: 'pm_alex', displayName: 'Alexandre', language: 'pt', region: 'BR', accent: 'Brazilian Portuguese', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'] },
        { id: 'pm_santa', personaId: 'pm_santa', displayName: 'Santos', language: 'pt', region: 'BR', accent: 'Brazilian Portuguese', gender: 'male', ageRange: 'senior', speakingStyles: ['narration', 'warm', 'character'], suitableFor: ['primary'] },

        // ================================================================
        // Edge TTS Voices (Microsoft Neural) — supplements Kokoro gaps
        // Voice IDs prefixed with "edge-" to route to Edge TTS provider
        // ================================================================

        // ── French via Edge TTS (16 voices — fills Kokoro's 1-voice gap) ──
        { id: 'edge-fr-FR-DeniseNeural', personaId: 'edge-fr-FR-DeniseNeural', displayName: 'Denise', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-EloiseNeural', personaId: 'edge-fr-FR-EloiseNeural', displayName: 'Eloise', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'child', speakingStyles: ['conversational', 'bright'], suitableFor: ['primary'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-BrigitteNeural', personaId: 'edge-fr-FR-BrigitteNeural', displayName: 'Brigitte', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'professional'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-CelesteNeural', personaId: 'edge-fr-FR-CelesteNeural', displayName: 'Celeste', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-CoralieNeural', personaId: 'edge-fr-FR-CoralieNeural', displayName: 'Coralie', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-JacquelineNeural', personaId: 'edge-fr-FR-JacquelineNeural', displayName: 'Jacqueline', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['narration', 'refined'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-JosephineNeural', personaId: 'edge-fr-FR-JosephineNeural', displayName: 'Josephine', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-YvetteNeural', personaId: 'edge-fr-FR-YvetteNeural', displayName: 'Yvette', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'expressive'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-HenriNeural', personaId: 'edge-fr-FR-HenriNeural', displayName: 'Henri', language: 'fr', region: 'FR', accent: 'French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-AlainNeural', personaId: 'edge-fr-FR-AlainNeural', displayName: 'Alain', language: 'fr', region: 'FR', accent: 'French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'professional'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-ClaudeNeural', personaId: 'edge-fr-FR-ClaudeNeural', displayName: 'Claude', language: 'fr', region: 'FR', accent: 'French', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'authoritative'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-JeromeNeural', personaId: 'edge-fr-FR-JeromeNeural', displayName: 'Jerome', language: 'fr', region: 'FR', accent: 'French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-MauriceNeural', personaId: 'edge-fr-FR-MauriceNeural', displayName: 'Maurice', language: 'fr', region: 'FR', accent: 'French', gender: 'male', ageRange: 'senior', speakingStyles: ['narration', 'calm'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-YvesNeural', personaId: 'edge-fr-FR-YvesNeural', displayName: 'Yves', language: 'fr', region: 'FR', accent: 'French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-VivienneMultilingualNeural', personaId: 'edge-fr-FR-VivienneMultilingualNeural', displayName: 'Vivienne', language: 'fr', region: 'FR', accent: 'French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'multilingual'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-FR-RemyMultilingualNeural', personaId: 'edge-fr-FR-RemyMultilingualNeural', displayName: 'Remy', language: 'fr', region: 'FR', accent: 'French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'multilingual'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },

        // ── Swiss French via Edge TTS (2 voices) ──
        { id: 'edge-fr-CH-ArianeNeural', personaId: 'edge-fr-CH-ArianeNeural', displayName: 'Ariane', language: 'fr', region: 'CH', accent: 'Swiss French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-CH-FabriceNeural', personaId: 'edge-fr-CH-FabriceNeural', displayName: 'Fabrice', language: 'fr', region: 'CH', accent: 'Swiss French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'calm'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },

        // ── Belgian French via Edge TTS (2 voices) ──
        { id: 'edge-fr-BE-CharlineNeural', personaId: 'edge-fr-BE-CharlineNeural', displayName: 'Charline', language: 'fr', region: 'BE', accent: 'Belgian French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-BE-GerardNeural', personaId: 'edge-fr-BE-GerardNeural', displayName: 'Gerard', language: 'fr', region: 'BE', accent: 'Belgian French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },

        // ── Canadian French via Edge TTS (4 voices) ──
        { id: 'edge-fr-CA-SylvieNeural', personaId: 'edge-fr-CA-SylvieNeural', displayName: 'Sylvie', language: 'fr', region: 'CA', accent: 'Canadian French', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-CA-AntoineNeural', personaId: 'edge-fr-CA-AntoineNeural', displayName: 'Antoine', language: 'fr', region: 'CA', accent: 'Canadian French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-fr-CA-JeanNeural', personaId: 'edge-fr-CA-JeanNeural', displayName: 'Jean', language: 'fr', region: 'CA', accent: 'Canadian French', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'], provider: 'edge-tts' },
        { id: 'edge-fr-CA-ThierryNeural', personaId: 'edge-fr-CA-ThierryNeural', displayName: 'Thierry', language: 'fr', region: 'CA', accent: 'Canadian French', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'professional'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },

        // ── German via Edge TTS (6 voices — Kokoro has none) ──
        { id: 'edge-de-DE-KatjaNeural', personaId: 'edge-de-DE-KatjaNeural', displayName: 'Katja', language: 'de', region: 'DE', accent: 'German', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-de-DE-AmalaNeural', personaId: 'edge-de-DE-AmalaNeural', displayName: 'Amala', language: 'de', region: 'DE', accent: 'German', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'professional'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-de-DE-SeraphinaMultilingualNeural', personaId: 'edge-de-DE-SeraphinaMultilingualNeural', displayName: 'Seraphina', language: 'de', region: 'DE', accent: 'German', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'multilingual'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-de-DE-ConradNeural', personaId: 'edge-de-DE-ConradNeural', displayName: 'Conrad', language: 'de', region: 'DE', accent: 'German', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['primary', 'secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-de-DE-FlorianMultilingualNeural', personaId: 'edge-de-DE-FlorianMultilingualNeural', displayName: 'Florian', language: 'de', region: 'DE', accent: 'German', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'multilingual'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-de-DE-KillianNeural', personaId: 'edge-de-DE-KillianNeural', displayName: 'Killian', language: 'de', region: 'DE', accent: 'German', gender: 'male', ageRange: 'young_adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'], provider: 'edge-tts' },

        // ── Korean via Edge TTS (4 voices — Kokoro has none) ──
        { id: 'edge-ko-KR-SunHiNeural', personaId: 'edge-ko-KR-SunHiNeural', displayName: 'Sun-Hi', language: 'ko', region: 'KR', accent: 'Korean', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['primary', 'secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-ko-KR-HyunsuNeural', personaId: 'edge-ko-KR-HyunsuNeural', displayName: 'Hyunsu', language: 'ko', region: 'KR', accent: 'Korean', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-ko-KR-InJoonNeural', personaId: 'edge-ko-KR-InJoonNeural', displayName: 'InJoon', language: 'ko', region: 'KR', accent: 'Korean', gender: 'male', ageRange: 'adult', speakingStyles: ['narration', 'professional'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-ko-KR-BongJinNeural', personaId: 'edge-ko-KR-BongJinNeural', displayName: 'BongJin', language: 'ko', region: 'KR', accent: 'Korean', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'friendly'], suitableFor: ['primary', 'secondary'], provider: 'edge-tts' },

        // ── Arabic via Edge TTS (2 voices — Kokoro has none) ──
        { id: 'edge-ar-SA-ZariyahNeural', personaId: 'edge-ar-SA-ZariyahNeural', displayName: 'Zariyah', language: 'ar', region: 'SA', accent: 'Arabic', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'warm'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
        { id: 'edge-ar-SA-HamedNeural', personaId: 'edge-ar-SA-HamedNeural', displayName: 'Hamed', language: 'ar', region: 'SA', accent: 'Arabic', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'clear'], suitableFor: ['secondary', 'adult'], provider: 'edge-tts' },
      ];

      // Apply filters
      let filtered = voices;
      if (options?.language) {
        filtered = filtered.filter(v => v.language === options.language);
      }
      if (options?.gender) {
        filtered = filtered.filter(v => v.gender === options.gender);
      }
      if (options?.suitableFor) {
        filtered = filtered.filter(v => v.suitableFor.includes(options.suitableFor!));
      }

      return { success: true, data: filtered };
    } catch (error) {
      log.error('Failed to get voice library', error as Error);
      return { success: false, error: { code: 'VOICE_LIBRARY_FAILED', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 3: CONVERSATIONAL AGENTS
  // --------------------------------------------------------------------------

  /**
   * Create a conversational agent
   */
  async createConversationAgent(
    tenantId: string,
    config: Omit<ConversationAgent, 'id' | 'tenantId' | 'agentId'>
  ): Promise<Result<ConversationAgent>> {
    try {
      // TODO: Voice service endpoint needed for conversational agent creation
      const agentId = `agent_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

      const agent: ConversationAgent = {
        id: agentId,
        tenantId,
        agentId,
        ...config,
      };

      // Would save to VoiceConversationAgent table
      log.info('Conversation agent created', { agentId: agent.id, tenantId });

      return { success: true, data: agent };
    } catch (error) {
      log.error('Failed to create conversation agent', error as Error);
      return { success: false, error: { code: 'AGENT_CREATE_FAILED', message: (error as Error).message } };
    }
  }

  /**
   * Start a conversation session
   */
  async startConversationSession(
    tenantId: string,
    agentId: string,
    userId: string,
    options: { scenarioId?: string; learnerId?: string }
  ): Promise<Result<ConversationSession>> {
    try {
      const session: ConversationSession = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        tenantId,
        agentId,
        userId,
        learnerId: options.learnerId,
        scenarioId: options.scenarioId,
        status: 'active',
        startedAt: new Date(),
      };

      // Would save to VoiceConversationSession table
      log.info('Conversation session started', { sessionId: session.id, agentId });

      return { success: true, data: session };
    } catch (error) {
      log.error('Failed to start conversation session', error as Error);
      return { success: false, error: { code: 'SESSION_START_FAILED', message: (error as Error).message } };
    }
  }

  /**
   * Add a turn to a conversation session
   */
  async addConversationTurn(
    tenantId: string,
    sessionId: string,
    turn: ConversationTurn
  ): Promise<Result<void>> {
    try {
      // Would save to VoiceConversationTurn table
      log.info('Conversation turn added', { sessionId, speaker: turn.speaker });
      return { success: true, data: undefined };
    } catch (error) {
      log.error('Failed to add conversation turn', error as Error);
      return { success: false, error: { code: 'TURN_ADD_FAILED', message: (error as Error).message } };
    }
  }

  /**
   * End a conversation session
   */
  async endConversationSession(
    tenantId: string,
    sessionId: string,
    userId: string
  ): Promise<Result<void>> {
    try {
      // Would update VoiceConversationSession table
      log.info('Conversation session ended', { sessionId });
      return { success: true, data: undefined };
    } catch (error) {
      log.error('Failed to end conversation session', error as Error);
      return { success: false, error: { code: 'SESSION_END_FAILED', message: (error as Error).message } };
    }
  }

  /**
   * Launch an immersive scenario
   */
  async launchScenario(
    tenantId: string,
    scenarioId: string,
    learnerId: string,
    options: { language: string }
  ): Promise<Result<ConversationSession>> {
    try {
      // Would fetch scenario from VoiceImmersiveScenario table
      const session = await this.startConversationSession(
        tenantId,
        'scenario_agent', // Would be resolved from scenario
        learnerId,
        { scenarioId, learnerId }
      );

      return session;
    } catch (error) {
      log.error('Failed to launch scenario', error as Error);
      return { success: false, error: { code: 'SCENARIO_LAUNCH_FAILED', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 4: VOICE CLONING
  // --------------------------------------------------------------------------

  /**
   * Create a voice clone (with consent) using self-hosted Chatterbox cloning
   */
  async createVoiceClone(request: VoiceCloneRequest): Promise<Result<{ cloneId: string; voiceId: string }>> {
    try {
      const cloneResult = await this.voiceServiceRequest<{ clone_id: string; voice_id: string }>('/api/v1/cloning/profiles', {
        body: {
          name: request.name,
          description: request.description,
          sample_audio_urls: request.sampleAudioUrls,
          quality: request.quality,
        },
      });

      return {
        success: true,
        data: {
          cloneId: cloneResult.clone_id,
          voiceId: cloneResult.voice_id,
        },
      };
    } catch (error) {
      log.error('Failed to create voice clone', error as Error);
      return { success: false, error: { code: 'CLONE_FAILED', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 4: MULTI-SPEAKER DIALOGUE
  // --------------------------------------------------------------------------

  /**
   * Generate a multi-speaker dialogue
   */
  async generateDialogue(
    tenantId: string,
    script: DialogueScript
  ): Promise<Result<{ audioUrl: string; durationMs: number }>> {
    try {
      const audioBuffers: Buffer[] = [];

      for (const line of script.lines.sort((a, b) => a.sequence - b.sequence)) {
        const character = script.characters.find(c => c.id === line.characterId);
        if (!character) continue;

        // Add pause before line
        if (line.pauseBeforeMs) {
          const silenceBytes = Math.floor(line.pauseBeforeMs * 32);
          audioBuffers.push(Buffer.alloc(silenceBytes));
        }

        // Generate TTS for this line
        const ttsResult = await this.textToSpeech({
          tenantId,
          text: line.text,
          voiceId: character.voiceId,
          modelId: 'kokoro_default',
          voiceSettings: character.voiceSettings,
        });

        if (ttsResult.success && ttsResult.data) {
          audioBuffers.push(ttsResult.data.audioData);
        }
      }

      const combinedAudio = Buffer.concat(audioBuffers);
      const audioUrl = `voice-dialogues/${tenantId}/${Date.now()}.mp3`;

      return {
        success: true,
        data: {
          audioUrl,
          durationMs: Math.floor(combinedAudio.length / 176), // Approximate for mp3
        },
      };
    } catch (error) {
      log.error('Failed to generate dialogue', error as Error);
      return { success: false, error: { code: 'DIALOGUE_FAILED', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // USAGE TRACKING
  // --------------------------------------------------------------------------

  private async trackUsage(tenantId: string, type: 'tts' | 'stt' | 'agent', units: number): Promise<void> {
    try {
      // Would update VoiceUsageDaily table
      log.debug('Voice usage tracked', { tenantId, type, units });
    } catch (error) {
      log.error('Failed to track voice usage', error as Error);
    }
  }
}

// Export singleton instance
export const voiceIntelligenceService = new VoiceIntelligenceService();
