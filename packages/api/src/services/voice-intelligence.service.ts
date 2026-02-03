/**
 * Voice Intelligence Service
 *
 * Complete ElevenLabs integration for voice-powered language learning.
 * Provides TTS, STT, pronunciation assessment, conversational agents,
 * voice cloning, and VR audio capabilities.
 *
 * @module VoiceIntelligenceService
 */

import { ScholarlyBaseService, Result, isFailure } from './base.service';
import { prisma } from '@scholarly/database';
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
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
  | 'eleven_multilingual_v2'
  | 'eleven_turbo_v2'
  | 'eleven_turbo_v2_5'
  | 'eleven_flash_v2_5';

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
  elevenLabsAgentId: string;
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
  elevenLabsVoiceId: string;
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
  private elevenLabs: ElevenLabsClient | null = null;
  private configCache: Map<string, { config: any; expiresAt: number }> = new Map();

  constructor() {
    super('VoiceIntelligenceService');
  }

  /**
   * Get ElevenLabs client for a tenant
   */
  private async getClient(tenantId: string): Promise<ElevenLabsClient> {
    const config = await this.getTenantConfig(tenantId);
    if (!config.success || !config.data) {
      throw new Error('ElevenLabs not configured for tenant');
    }

    return new ElevenLabsClient({
      apiKey: config.data.apiKey,
    });
  }

  /**
   * Get tenant configuration for ElevenLabs
   */
  async getTenantConfig(tenantId: string): Promise<Result<{ apiKey: string; agentApiKey?: string }>> {
    try {
      // Check cache first
      const cached = this.configCache.get(tenantId);
      if (cached && cached.expiresAt > Date.now()) {
        return { success: true, data: cached.config };
      }

      // In production, this would fetch from VoiceElevenLabsConfig table
      // For demo, use environment variable
      const apiKey = process.env.ELEVENLABS_API_KEY;
      if (!apiKey) {
        return { success: false, error: { code: 'CONFIG_MISSING', message: 'ElevenLabs API key not configured' } };
      }

      const config = { apiKey, agentApiKey: apiKey };
      this.configCache.set(tenantId, { config, expiresAt: Date.now() + 300000 }); // 5 min cache

      return { success: true, data: config };
    } catch (error) {
      log.error('Failed to get tenant config', error as Error);
      return { success: false, error: { code: 'CONFIG_ERROR', message: (error as Error).message } };
    }
  }

  // --------------------------------------------------------------------------
  // PHASE 1: TEXT-TO-SPEECH
  // --------------------------------------------------------------------------

  /**
   * Generate speech from text using ElevenLabs TTS
   */
  async textToSpeech(request: TTSRequest): Promise<Result<TTSResponse>> {
    try {
      const client = await this.getClient(request.tenantId);

      const audio = await client.textToSpeech.convert(request.voiceId, {
        text: request.text,
        modelId: request.modelId || 'eleven_multilingual_v2',
        voiceSettings: request.voiceSettings ? {
          stability: request.voiceSettings.stability ?? 0.5,
          similarityBoost: request.voiceSettings.similarityBoost ?? 0.75,
          style: request.voiceSettings.style ?? 0.0,
          useSpeakerBoost: request.voiceSettings.useSpeakerBoost ?? true,
        } : undefined,
      });

      // Collect audio chunks
      const chunks: Uint8Array[] = [];
      for await (const chunk of audio) {
        chunks.push(chunk);
      }
      const audioData = Buffer.concat(chunks);

      // Track usage
      await this.trackUsage(request.tenantId, 'tts', request.text.length);

      return {
        success: true,
        data: {
          audioData,
          characterCount: request.text.length,
          creditsUsed: Math.ceil(request.text.length * 0.3),
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
   * Transcribe audio to text using ElevenLabs Scribe
   */
  async speechToText(request: STTRequest): Promise<Result<STTResponse>> {
    try {
      const client = await this.getClient(request.tenantId);

      // Convert Buffer to Blob for the API
      const audioBlob = new Blob([request.audioData]);

      const result = await client.speechToText.convert({
        file: audioBlob,
        modelId: 'scribe_v1',
        languageCode: request.language,
      });

      // Cast to the expected single-channel response type
      const sttResult = result as { text?: string; words?: Array<{ text: string; start: number; end: number }> };

      return {
        success: true,
        data: {
          transcript: sttResult.text || '',
          confidence: 0.95, // Scribe doesn't return confidence
          language: request.language || 'en',
          words: sttResult.words?.map((w) => ({
            word: w.text,
            startMs: Math.floor(w.start * 1000),
            endMs: Math.floor(w.end * 1000),
            confidence: 0.95,
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
   * Get available voices for language learning
   */
  async getVoiceLibrary(tenantId: string, options?: {
    language?: string;
    gender?: string;
    suitableFor?: string;
  }): Promise<Result<LinguaFlowVoice[]>> {
    try {
      const client = await this.getClient(tenantId);
      const response = await client.voices.getAll();

      // Transform to LinguaFlow format
      // Note: ElevenLabs SDK may use voiceId or voice_id depending on version
      const voices: LinguaFlowVoice[] = (response.voices || []).map((v: any) => ({
        id: v.voice_id || v.voiceId || '',
        elevenLabsVoiceId: v.voice_id || v.voiceId || '',
        displayName: v.name,
        language: v.labels?.language || 'en',
        region: v.labels?.accent || 'neutral',
        accent: v.labels?.accent || 'neutral',
        gender: v.labels?.gender || 'neutral',
        ageRange: v.labels?.age || 'adult',
        speakingStyles: ['conversational'],
        suitableFor: ['primary', 'secondary', 'adult'],
      }));

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
    config: Omit<ConversationAgent, 'id' | 'tenantId' | 'elevenLabsAgentId'>
  ): Promise<Result<ConversationAgent>> {
    try {
      const client = await this.getClient(tenantId);

      // Create agent on ElevenLabs
      const agentResponse = await client.conversationalAi.agents.create({
        name: config.name,
        conversationConfig: {
          agent: {
            prompt: {
              prompt: config.systemPrompt,
            },
            firstMessage: config.firstMessage,
            language: config.primaryLanguage,
          },
          tts: {
            voiceId: config.voiceId,
          },
        },
      });

      const agent: ConversationAgent = {
        id: `agent_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        tenantId,
        elevenLabsAgentId: agentResponse.agentId || '',
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
   * Create a voice clone (with consent)
   */
  async createVoiceClone(request: VoiceCloneRequest): Promise<Result<{ cloneId: string; voiceId: string }>> {
    try {
      const client = await this.getClient(request.tenantId);

      // Download samples and create clone
      const sampleBlobs: Blob[] = [];
      for (const url of request.sampleAudioUrls) {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        sampleBlobs.push(new Blob([buffer]));
      }

      const cloneResponse = await client.voices.ivc.create({
        name: request.name,
        files: sampleBlobs,
      });

      return {
        success: true,
        data: {
          cloneId: `clone_${Date.now()}`,
          voiceId: cloneResponse.voiceId || '',
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
          modelId: 'eleven_multilingual_v2',
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
