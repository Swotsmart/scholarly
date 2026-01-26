/**
 * Scholarly Virtual Language Immersion Service
 *
 * Manages immersive language learning experiences across 2D, 3D, AR, VR, and WebXR.
 *
 * @module VirtualLanguageImmersionService
 */

import { ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

import {
  ImmersionTier, DeviceCapabilities, ImmersionLanguage, ImmersionCEFRLevel,
  ImmersionScenario, ScenarioCategory, Scene, AICharacter, CharacterMood,
  ImmersionSession, ImmersionResult, ConversationTurn, ImmersionPronunciationAttempt,
  LanguageExchangeSession, ExchangeParticipant, ExchangeFeedback,
  SpeechConfig, TTSConfig
} from './phase4-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface ImmersionScenarioRepository {
  findById(tenantId: string, id: string): Promise<ImmersionScenario | null>;
  findByLanguage(tenantId: string, language: ImmersionLanguage, limit?: number, offset?: number): Promise<ImmersionScenario[]>;
  findByCategory(tenantId: string, category: ScenarioCategory, limit?: number): Promise<ImmersionScenario[]>;
  findByLevel(tenantId: string, level: ImmersionCEFRLevel, language?: ImmersionLanguage): Promise<ImmersionScenario[]>;
  findByTier(tenantId: string, tier: ImmersionTier, limit?: number): Promise<ImmersionScenario[]>;
  search(tenantId: string, query: string, filters?: Partial<{ language: ImmersionLanguage; level: ImmersionCEFRLevel }>): Promise<ImmersionScenario[]>;
  create(tenantId: string, scenario: Omit<ImmersionScenario, 'id' | 'createdAt' | 'updatedAt'>): Promise<ImmersionScenario>;
  update(tenantId: string, id: string, updates: Partial<ImmersionScenario>): Promise<ImmersionScenario>;
  incrementCompletionCount(tenantId: string, id: string): Promise<void>;
}

export interface ImmersionSessionRepository {
  findById(tenantId: string, id: string): Promise<ImmersionSession | null>;
  findByLearner(tenantId: string, learnerId: string, status?: string): Promise<ImmersionSession[]>;
  findActiveByLearner(tenantId: string, learnerId: string): Promise<ImmersionSession | null>;
  create(tenantId: string, session: Omit<ImmersionSession, 'id'>): Promise<ImmersionSession>;
  update(tenantId: string, id: string, updates: Partial<ImmersionSession>): Promise<ImmersionSession>;
}

export interface ImmersionResultRepository {
  findByLearner(tenantId: string, learnerId: string, limit?: number): Promise<ImmersionResult[]>;
  create(tenantId: string, result: Omit<ImmersionResult, 'id'>): Promise<ImmersionResult>;
  getLearnerProgress(tenantId: string, learnerId: string, language: ImmersionLanguage): Promise<{
    totalSessions: number; averageScore: number; vocabularyLearned: number; hoursSpent: number;
  }>;
}

export interface LanguageExchangeRepository {
  findById(tenantId: string, id: string): Promise<LanguageExchangeSession | null>;
  findAvailableMatches(tenantId: string, userId: string, nativeLanguage: ImmersionLanguage, learningLanguage: ImmersionLanguage): Promise<ExchangeParticipant[]>;
  create(tenantId: string, session: Omit<LanguageExchangeSession, 'id'>): Promise<LanguageExchangeSession>;
  update(tenantId: string, id: string, updates: Partial<LanguageExchangeSession>): Promise<LanguageExchangeSession>;
}

export interface VocabularyProgressRepository {
  getMasteredCount(tenantId: string, learnerId: string, language: ImmersionLanguage): Promise<number>;
  upsert(tenantId: string, learnerId: string, vocabularyId: string, masteryLevel: number): Promise<void>;
}

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

export interface SpeechRecognitionProvider {
  transcribe(audioData: ArrayBuffer, config: SpeechConfig): Promise<{ text: string; confidence: number }>;
  assessPronunciation(audioData: ArrayBuffer, expectedText: string, language: ImmersionLanguage): Promise<{
    overallScore: number; fluencyScore: number; prosodyScore: number;
    phonemeScores: { phoneme: string; score: number; feedback: string }[];
    feedback: string;
  }>;
}

export interface TextToSpeechProvider {
  synthesize(text: string, config: TTSConfig): Promise<ArrayBuffer>;
}

export interface AIConversationProvider {
  generateResponse(
    systemPrompt: string, conversationHistory: ConversationTurn[], learnerInput: string,
    context: { character: AICharacter; scenario: ImmersionScenario; currentScene: Scene; learnerLevel: ImmersionCEFRLevel }
  ): Promise<{
    text: string; intent: string; emotion: CharacterMood; shouldCorrect: boolean;
    correction?: { original: string; corrected: string; explanation: string };
  }>;
  generateFeedback(sessionData: ImmersionSession, conversationHistory: ConversationTurn[]): Promise<{
    summary: string; strengths: string[]; areasToImprove: string[]; recommendedScenarios: string[];
  }>;
}

export interface CredentialProvider {
  issueLanguageCredential(tenantId: string, learnerId: string, language: ImmersionLanguage, level: ImmersionCEFRLevel, evidence: any[]): Promise<string>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class VirtualLanguageImmersionService extends ScholarlyBaseService {
  constructor(
    deps: ServiceDependencies & Record<string, unknown>,
    private readonly repos: {
      scenarioRepo: ImmersionScenarioRepository;
      sessionRepo: ImmersionSessionRepository;
      resultRepo: ImmersionResultRepository;
      exchangeRepo: LanguageExchangeRepository;
      vocabularyRepo: VocabularyProgressRepository;
    },
    private readonly providers: {
      speechRecognition: SpeechRecognitionProvider;
      tts: TextToSpeechProvider;
      aiConversation: AIConversationProvider;
      credentials: CredentialProvider;
    }
  ) {
    super('VirtualLanguageImmersionService', deps);
  }

  // ==========================================================================
  // DEVICE CAPABILITY DETECTION
  // ==========================================================================

  async detectDeviceCapabilities(tenantId: string, clientCapabilities: Partial<DeviceCapabilities>): Promise<Result<DeviceCapabilities>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }

    return this.withTiming('detectDeviceCapabilities', async () => {
      const capabilities: DeviceCapabilities = {
        hasWebGL: clientCapabilities.hasWebGL ?? false,
        hasWebGL2: clientCapabilities.hasWebGL2 ?? false,
        hasWebGPU: clientCapabilities.hasWebGPU ?? false,
        hasWebXR: clientCapabilities.hasWebXR ?? false,
        xrSessionModes: clientCapabilities.xrSessionModes ?? [],
        hasSpeechRecognition: clientCapabilities.hasSpeechRecognition ?? false,
        hasSpeechSynthesis: clientCapabilities.hasSpeechSynthesis ?? false,
        supportedVoices: clientCapabilities.supportedVoices ?? [],
        hasGamepad: clientCapabilities.hasGamepad ?? false,
        hasTouchscreen: clientCapabilities.hasTouchscreen ?? false,
        hasGyroscope: clientCapabilities.hasGyroscope ?? false,
        estimatedPerformanceTier: clientCapabilities.estimatedPerformanceTier ?? 'medium',
        recommendedTier: ImmersionTier.TIER_2D,
        availableTiers: [ImmersionTier.TIER_2D]
      };

      const availableTiers: ImmersionTier[] = [ImmersionTier.TIER_2D];
      if (capabilities.hasWebGL) availableTiers.push(ImmersionTier.TIER_3D);
      if (capabilities.hasWebXR && capabilities.xrSessionModes.includes('immersive-ar')) availableTiers.push(ImmersionTier.TIER_AR);
      if (capabilities.hasWebXR && capabilities.xrSessionModes.includes('immersive-vr')) {
        availableTiers.push(ImmersionTier.TIER_VR);
        availableTiers.push(ImmersionTier.TIER_MR);
      }

      capabilities.availableTiers = availableTiers;
      capabilities.recommendedTier = availableTiers.includes(ImmersionTier.TIER_VR) ? ImmersionTier.TIER_VR
        : availableTiers.includes(ImmersionTier.TIER_AR) ? ImmersionTier.TIER_AR
        : availableTiers.includes(ImmersionTier.TIER_3D) ? ImmersionTier.TIER_3D : ImmersionTier.TIER_2D;

      return success(capabilities);
    });
  }

  // ==========================================================================
  // SCENARIO MANAGEMENT
  // ==========================================================================

  async browseScenarios(
    tenantId: string,
    options: { language?: ImmersionLanguage; level?: ImmersionCEFRLevel; category?: ScenarioCategory; tier?: ImmersionTier; query?: string; limit?: number } = {}
  ): Promise<Result<{ scenarios: ImmersionScenario[]; total: number }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }

    return this.withTiming('browseScenarios', async () => {
      const { limit = 20 } = options;
      let scenarios: ImmersionScenario[];

      if (options.query) {
        scenarios = await this.repos.scenarioRepo.search(tenantId, options.query, { language: options.language, level: options.level });
      } else if (options.tier) {
        scenarios = await this.repos.scenarioRepo.findByTier(tenantId, options.tier, limit);
      } else if (options.language) {
        scenarios = await this.repos.scenarioRepo.findByLanguage(tenantId, options.language, limit);
      } else if (options.category) {
        scenarios = await this.repos.scenarioRepo.findByCategory(tenantId, options.category, limit);
      } else {
        scenarios = await this.repos.scenarioRepo.findByLanguage(tenantId, ImmersionLanguage.SPANISH, limit);
      }

      return success({ scenarios, total: scenarios.length });
    });
  }

  async getRecommendedScenarios(tenantId: string, userId: string, language: ImmersionLanguage, limit: number = 5): Promise<Result<ImmersionScenario[]>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!userId) {
      return failure(new ValidationError('userId is required'));
    }

    return this.withTiming('getRecommendedScenarios', async () => {
      const progress = await this.repos.resultRepo.getLearnerProgress(tenantId, userId, language);

      let level: ImmersionCEFRLevel;
      if (progress.averageScore >= 85 && progress.totalSessions >= 10) level = ImmersionCEFRLevel.B2;
      else if (progress.averageScore >= 70 && progress.totalSessions >= 5) level = ImmersionCEFRLevel.B1;
      else if (progress.averageScore >= 50) level = ImmersionCEFRLevel.A2;
      else level = ImmersionCEFRLevel.A1;

      const scenarios = await this.repos.scenarioRepo.findByLevel(tenantId, level, language);
      return success(scenarios.slice(0, limit));
    });
  }

  async getScenario(tenantId: string, scenarioId: string): Promise<Result<ImmersionScenario>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!scenarioId) {
      return failure(new ValidationError('scenarioId is required'));
    }

    return this.withTiming('getScenario', async () => {
      const scenario = await this.repos.scenarioRepo.findById(tenantId, scenarioId);
      if (!scenario) throw new NotFoundError('Scenario', scenarioId);
      return success(scenario);
    });
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  async startSession(
    tenantId: string,
    data: { learnerId: string; scenarioId: string; tier: ImmersionTier; deviceCapabilities: DeviceCapabilities }
  ): Promise<Result<ImmersionSession>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.learnerId) {
      return failure(new ValidationError('learnerId is required'));
    }
    if (!data.scenarioId) {
      return failure(new ValidationError('scenarioId is required'));
    }

    return this.withTiming('startSession', async () => {
      const existing = await this.repos.sessionRepo.findActiveByLearner(tenantId, data.learnerId);
      if (existing) await this.repos.sessionRepo.update(tenantId, existing.id, { status: 'abandoned' });

      const scenario = await this.repos.scenarioRepo.findById(tenantId, data.scenarioId);
      if (!scenario) throw new NotFoundError('Scenario', data.scenarioId);
      if (!scenario.supportedTiers.includes(data.tier)) throw new ValidationError(`Tier not supported: ${data.tier}`);

      const session = await this.repos.sessionRepo.create(tenantId, {
        tenantId,
        learnerId: data.learnerId,
        scenarioId: data.scenarioId,
        currentSceneId: scenario.scenes[0]?.id || '',
        currentNodeId: scenario.scenes[0]?.dialogueTree[0]?.id || '',
        activeTier: data.tier,
        deviceInfo: data.deviceCapabilities,
        startedAt: new Date(),
        lastActivityAt: new Date(),
        completedScenes: [],
        currentScore: 0,
        hintsUsed: 0,
        errorsCount: 0,
        conversationHistory: [],
        status: 'active',
        pronunciationAttempts: [],
        vocabularyExposed: [],
        vocabularyMastered: []
      });

      await this.publishEvent('scholarly.immersion.session_started', tenantId, {
        sessionId: session.id, learnerId: data.learnerId, scenarioId: data.scenarioId, tier: data.tier
      });

      return success(session);
    });
  }

  async processLearnerSpeech(
    tenantId: string,
    data: { sessionId: string; audioData: ArrayBuffer; expectedText?: string }
  ): Promise<Result<{
    transcription: string;
    pronunciationScore?: number;
    aiResponse: { text: string; audioUrl?: string; emotion: CharacterMood; correction?: any };
    updatedSession: ImmersionSession;
  }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.sessionId) {
      return failure(new ValidationError('sessionId is required'));
    }

    return this.withTiming('processLearnerSpeech', async () => {
      const session = await this.repos.sessionRepo.findById(tenantId, data.sessionId);
      if (!session) throw new NotFoundError('Session', data.sessionId);
      if (session.status !== 'active') throw new ValidationError('Session not active');

      const scenario = await this.repos.scenarioRepo.findById(tenantId, session.scenarioId);
      if (!scenario) throw new NotFoundError('Scenario', session.scenarioId);

      const currentScene = scenario.scenes.find(s => s.id === session.currentSceneId)!;
      const currentCharacter = scenario.characters[0];

      // Transcribe speech
      const speechConfig: SpeechConfig = {
        language: scenario.targetLanguage,
        continuous: false,
        interimResults: false,
        maxAlternatives: 3,
        pronunciationAssessment: { enabled: !!data.expectedText, granularity: 'word', scoringSystem: 'percentage' },
        noiseSuppressionEnabled: true,
        silenceThresholdMs: 1500
      };

      const transcription = await this.providers.speechRecognition.transcribe(data.audioData, speechConfig);

      // Assess pronunciation if expected
      let pronunciationScore: number | undefined;
      if (data.expectedText) {
        const assessment = await this.providers.speechRecognition.assessPronunciation(data.audioData, data.expectedText, scenario.targetLanguage);
        pronunciationScore = assessment.overallScore;

        session.pronunciationAttempts.push({
          id: this.generateId(),
          timestamp: new Date(),
          targetText: data.expectedText,
          targetPhonemes: '',
          audioUrl: '',
          transcribedText: transcription.text,
          detectedPhonemes: '',
          overallScore: assessment.overallScore,
          phonemeScores: assessment.phonemeScores,
          fluencyScore: assessment.fluencyScore,
          prosodyScore: assessment.prosodyScore,
          feedback: assessment.feedback
        });
      }

      // Add learner turn
      session.conversationHistory.push({
        timestamp: new Date(),
        speaker: 'learner',
        text: transcription.text,
        transcribedText: transcription.text,
        pronunciationScore
      });

      // Generate AI response
      const systemPrompt = `You are ${currentCharacter.name}, a ${currentCharacter.role}. Personality: ${currentCharacter.personality}. Respond in ${scenario.targetLanguage} at ${scenario.cefrLevel} level.`;
      const aiResponse = await this.providers.aiConversation.generateResponse(
        systemPrompt, session.conversationHistory, transcription.text,
        { character: currentCharacter, scenario, currentScene, learnerLevel: scenario.cefrLevel }
      );

      // Generate TTS
      const ttsConfig: TTSConfig = {
        language: scenario.targetLanguage,
        voiceId: currentCharacter.voiceId,
        pitch: 1.0,
        rate: currentCharacter.speakingSpeed,
        volume: 1.0,
        ssmlEnabled: true,
        cacheEnabled: true,
        cacheExpiryHours: 24
      };
      const audioBuffer = await this.providers.tts.synthesize(aiResponse.text, ttsConfig);

      // Add AI turn
      session.conversationHistory.push({
        timestamp: new Date(),
        speaker: 'character',
        characterId: currentCharacter.id,
        text: aiResponse.text,
        sentiment: aiResponse.emotion,
        intent: aiResponse.intent
      });

      // Update session
      const scoreUpdate = aiResponse.shouldCorrect ? -5 : 10;
      const updatedSession = await this.repos.sessionRepo.update(tenantId, data.sessionId, {
        currentScore: Math.max(0, Math.min(100, session.currentScore + scoreUpdate)),
        errorsCount: aiResponse.shouldCorrect ? session.errorsCount + 1 : session.errorsCount,
        conversationHistory: session.conversationHistory,
        pronunciationAttempts: session.pronunciationAttempts,
        lastActivityAt: new Date()
      });

      return success({
        transcription: transcription.text,
        pronunciationScore,
        aiResponse: {
          text: aiResponse.text,
          audioUrl: `data:audio/mp3;base64,${Buffer.from(audioBuffer).toString('base64')}`,
          emotion: aiResponse.emotion,
          correction: aiResponse.correction
        },
        updatedSession
      });
    });
  }

  async useHint(tenantId: string, sessionId: string, hintLevel: number): Promise<Result<{ hint: string; penaltyApplied: number; updatedSession: ImmersionSession }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!sessionId) {
      return failure(new ValidationError('sessionId is required'));
    }

    return this.withTiming('useHint', async () => {
      const session = await this.repos.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('Session', sessionId);

      const scenario = await this.repos.scenarioRepo.findById(tenantId, session.scenarioId);
      if (!scenario) throw new NotFoundError('Scenario', session.scenarioId);

      const currentScene = scenario.scenes.find(s => s.id === session.currentSceneId);
      const currentNode = currentScene?.dialogueTree.find(n => n.id === session.currentNodeId);
      const hint = currentNode?.hints.find(h => h.level === hintLevel);
      if (!hint) throw new NotFoundError('Hint', `level ${hintLevel}`);

      const updatedSession = await this.repos.sessionRepo.update(tenantId, sessionId, {
        hintsUsed: session.hintsUsed + 1,
        currentScore: Math.max(0, session.currentScore - hint.penaltyPercent),
        lastActivityAt: new Date()
      });

      return success({ hint: hint.content, penaltyApplied: hint.penaltyPercent, updatedSession });
    });
  }

  async completeSession(tenantId: string, sessionId: string): Promise<Result<ImmersionResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!sessionId) {
      return failure(new ValidationError('sessionId is required'));
    }

    return this.withTiming('completeSession', async () => {
      const session = await this.repos.sessionRepo.findById(tenantId, sessionId);
      if (!session) throw new NotFoundError('Session', sessionId);

      const scenario = await this.repos.scenarioRepo.findById(tenantId, session.scenarioId);
      if (!scenario) throw new NotFoundError('Scenario', session.scenarioId);

      const feedback = await this.providers.aiConversation.generateFeedback(session, session.conversationHistory);

      const pronunciationScores = session.pronunciationAttempts.map(a => a.overallScore);
      const avgPronunciation = pronunciationScores.length > 0
        ? pronunciationScores.reduce((a, b) => a + b, 0) / pronunciationScores.length : 0;

      const totalDuration = Math.floor((Date.now() - session.startedAt.getTime()) / 1000);

      const result = await this.repos.resultRepo.create(tenantId, {
        sessionId,
        learnerId: session.learnerId,
        scenarioId: session.scenarioId,
        completedAt: new Date(),
        totalDuration,
        tier: session.activeTier,
        overallScore: session.currentScore,
        objectiveScores: scenario.learningObjectives.map(obj => ({ objectiveId: obj.id, score: session.currentScore, feedback: feedback.summary })),
        vocabularyScore: Math.min(100, session.vocabularyMastered.length * 10),
        grammarScore: session.currentScore,
        pronunciationScore: avgPronunciation,
        listeningScore: session.currentScore,
        culturalScore: session.currentScore,
        fluencyScore: avgPronunciation * 0.8,
        vocabularyLearned: scenario.vocabularyFocus.filter(v => session.vocabularyMastered.includes(v.id)),
        grammarPracticed: scenario.grammarFocus,
        hintsUsed: session.hintsUsed,
        errorsCount: session.errorsCount,
        selfCorrections: 0,
        recommendedNextScenarios: feedback.recommendedScenarios,
        practiceAreas: feedback.areasToImprove
      });

      await this.repos.sessionRepo.update(tenantId, sessionId, { status: 'completed' });
      await this.repos.scenarioRepo.incrementCompletionCount(tenantId, session.scenarioId);

      // Issue credential if earned
      if (result.overallScore >= 80) {
        const progress = await this.repos.resultRepo.getLearnerProgress(tenantId, session.learnerId, scenario.targetLanguage);
        if (progress.totalSessions >= 5 && progress.averageScore >= 75) {
          const credentialId = await this.providers.credentials.issueLanguageCredential(
            tenantId, session.learnerId, scenario.targetLanguage, scenario.cefrLevel,
            [{ scenarioId: session.scenarioId, score: result.overallScore, completedAt: new Date() }]
          );
          result.credentialIssued = true;
          result.credentialId = credentialId;
        }
      }

      await this.publishEvent('scholarly.immersion.session_completed', tenantId, {
        sessionId, learnerId: session.learnerId, overallScore: result.overallScore
      });

      return success(result);
    });
  }

  // ==========================================================================
  // LANGUAGE EXCHANGE
  // ==========================================================================

  async findExchangePartners(
    tenantId: string,
    data: { userId: string; nativeLanguage: ImmersionLanguage; learningLanguage: ImmersionLanguage }
  ): Promise<Result<ExchangeParticipant[]>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.userId) {
      return failure(new ValidationError('userId is required'));
    }

    return this.withTiming('findExchangePartners', async () => {
      const partners = await this.repos.exchangeRepo.findAvailableMatches(tenantId, data.userId, data.nativeLanguage, data.learningLanguage);
      return success(partners);
    });
  }

  async scheduleExchangeSession(
    tenantId: string,
    data: {
      participants: { userId: string; nativeLanguage: ImmersionLanguage; learningLanguage: ImmersionLanguage; cefrLevel: ImmersionCEFRLevel }[];
      scheduledAt: Date;
      duration: number;
      tier: ImmersionTier;
    }
  ): Promise<Result<LanguageExchangeSession>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (data.participants.length < 2) {
      return failure(new ValidationError('Need at least 2 participants'));
    }

    return this.withTiming('scheduleExchangeSession', async () => {
      const participants: ExchangeParticipant[] = data.participants.map(p => ({
        userId: p.userId,
        nativeLanguage: p.nativeLanguage,
        learningLanguage: p.learningLanguage,
        cefrLevel: p.cefrLevel,
        connectionStatus: 'disconnected',
        speakingTime: 0,
        correctionsReceived: 0,
        correctionsGiven: 0
      }));

      const session = await this.repos.exchangeRepo.create(tenantId, {
        tenantId,
        participants,
        language1: data.participants[0].nativeLanguage,
        language2: data.participants[1].nativeLanguage,
        structure: {
          totalDuration: data.duration,
          phases: [
            { name: 'Phase 1', language: data.participants[0].nativeLanguage, duration: data.duration / 2, activity: 'free_conversation' },
            { name: 'Phase 2', language: data.participants[1].nativeLanguage, duration: data.duration / 2, activity: 'free_conversation' }
          ],
          turnTakingEnforced: false
        },
        tier: data.tier,
        scheduledAt: data.scheduledAt,
        duration: data.duration,
        status: 'scheduled',
        isRecorded: false,
        aiModeratorEnabled: true
      });

      await this.publishEvent('scholarly.immersion.exchange_scheduled', tenantId, { sessionId: session.id });
      return success(session);
    });
  }

  // ==========================================================================
  // PROGRESS & ANALYTICS
  // ==========================================================================

  async getLearnerProgress(
    tenantId: string,
    learnerId: string,
    language: ImmersionLanguage
  ): Promise<Result<{
    totalSessions: number;
    averageScore: number;
    vocabularyLearned: number;
    hoursSpent: number;
    currentLevel: ImmersionCEFRLevel;
    recentResults: ImmersionResult[];
    skillBreakdown: Record<string, number>;
  }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!learnerId) {
      return failure(new ValidationError('learnerId is required'));
    }

    return this.withTiming('getLearnerProgress', async () => {
      const progress = await this.repos.resultRepo.getLearnerProgress(tenantId, learnerId, language);
      const recentResults = await this.repos.resultRepo.findByLearner(tenantId, learnerId, 10);
      const vocabularyMastered = await this.repos.vocabularyRepo.getMasteredCount(tenantId, learnerId, language);

      let currentLevel: ImmersionCEFRLevel;
      if (progress.averageScore >= 85 && progress.totalSessions >= 20) currentLevel = ImmersionCEFRLevel.B2;
      else if (progress.averageScore >= 70 && progress.totalSessions >= 10) currentLevel = ImmersionCEFRLevel.B1;
      else if (progress.averageScore >= 50 && progress.totalSessions >= 5) currentLevel = ImmersionCEFRLevel.A2;
      else currentLevel = ImmersionCEFRLevel.A1;

      const skillBreakdown: Record<string, number> = { vocabulary: 0, grammar: 0, pronunciation: 0, listening: 0, cultural: 0, fluency: 0 };
      if (recentResults.length > 0) {
        for (const result of recentResults) {
          skillBreakdown.vocabulary += result.vocabularyScore;
          skillBreakdown.grammar += result.grammarScore;
          skillBreakdown.pronunciation += result.pronunciationScore;
          skillBreakdown.listening += result.listeningScore;
          skillBreakdown.cultural += result.culturalScore;
          skillBreakdown.fluency += result.fluencyScore;
        }
        for (const skill of Object.keys(skillBreakdown)) {
          skillBreakdown[skill] = Math.round(skillBreakdown[skill] / recentResults.length);
        }
      }

      return success({ ...progress, vocabularyLearned: vocabularyMastered, currentLevel, recentResults, skillBreakdown });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: VirtualLanguageImmersionService | null = null;

export function initializeLanguageImmersionService(deps?: any): VirtualLanguageImmersionService {
  if (!instance) {
    instance = new VirtualLanguageImmersionService(deps, deps?.repos || {}, deps?.providers || {});
    log.info('VirtualLanguageImmersionService initialized');
  }
  return instance;
}

export function getLanguageImmersionService(): VirtualLanguageImmersionService {
  if (!instance) {
    throw new Error('VirtualLanguageImmersionService not initialized. Call initializeLanguageImmersionService() first.');
  }
  return instance;
}
