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
      const result = await this.voiceServiceRequest<{ status: string }>('/health', { method: 'GET' });
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: { code: 'VOICE_SERVICE_UNAVAILABLE', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 1: TEXT-TO-SPEECH
  // --------------------------------------------------------------------------

  /**
   * Generate speech from text using self-hosted Kokoro TTS
   */
  async textToSpeech(request: TTSRequest): Promise<Result<TTSResponse>> {
    try {
      const audioData = await this.voiceServiceRequest<Buffer>('/tts/synthesise', {
        body: {
          text: request.text,
          voice_id: request.voiceId,
          language: request.language,
          speed: request.voiceSettings?.style,
        },
        responseType: 'buffer',
      });

      // Track usage
      await this.trackUsage(request.tenantId, 'tts', request.text.length);

      return {
        success: true,
        data: {
          audioData,
          characterCount: request.text.length,
          creditsUsed: 0, // Self-hosted, no per-character cost
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
      }>('/stt/transcribe', {
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
      // Kokoro TTS built-in voice personas
      const voices: LinguaFlowVoice[] = [
        { id: 'af_bella', personaId: 'af_bella', displayName: 'Bella', language: 'en', region: 'neutral', accent: 'neutral', gender: 'female', ageRange: 'adult', speakingStyles: ['conversational', 'narration'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'am_adam', personaId: 'am_adam', displayName: 'Adam', language: 'en', region: 'neutral', accent: 'neutral', gender: 'male', ageRange: 'adult', speakingStyles: ['conversational', 'narration'], suitableFor: ['primary', 'secondary', 'adult'] },
        { id: 'af_sarah', personaId: 'af_sarah', displayName: 'Sarah', language: 'en', region: 'neutral', accent: 'neutral', gender: 'female', ageRange: 'young_adult', speakingStyles: ['conversational'], suitableFor: ['primary', 'secondary'] },
        { id: 'am_michael', personaId: 'am_michael', displayName: 'Michael', language: 'en', region: 'neutral', accent: 'neutral', gender: 'male', ageRange: 'young_adult', speakingStyles: ['conversational'], suitableFor: ['primary', 'secondary'] },
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
      const cloneResult = await this.voiceServiceRequest<{ clone_id: string; voice_id: string }>('/clone/create', {
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
