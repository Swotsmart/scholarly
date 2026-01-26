/**
 * Language Learning Service - Main Implementation
 * 
 * Integrates with existing Scholarly infrastructure:
 * 1. AI Buddy Extension - Language tutor personas
 * 2. AI Content Studio - Exercise generation
 * 3. Data Lake - SRS tracking, conversation logs
 * 4. ML Pipeline - Proficiency prediction
 * 5. Analytics - CEFR dashboards
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  EventBus,
  Cache,
  ScholarlyConfig
} from '@scholarly/shared/types/scholarly-types';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';

// Import existing services
import { AIIntegrationService, getAIService } from './ai-integration.service';
import { AIBuddyService, getAIBuddyService } from './ai-buddy.service';
import { AIContentStudioService, getAIContentStudioService } from './ai-content-studio.service';
import { DataLakeService, getDataLakeService } from './data-lake.service';
import { MLPipelineService, getMLPipelineService } from './ml-pipeline.service';
import { AnalyticsReportingService, getAnalyticsService } from './analytics-reporting.service';

// Import types and personas
import {
  LanguageCode, CEFRLevel, SkillType,
  LanguageLearner, CreateLanguageLearnerInput,
  LanguageConversation, ConversationMessage,
  SRSCard, SRSReview, SRSStatistics,
  LanguageExercise, ConversationSummary,
  ProficiencyPrediction, PlacementTestResult,
  LanguageDashboardData,
  LANGUAGE_CONFIG, CEFR_LEVELS
} from './language-learning-types';

import { CONVERSATION_PERSONAS, getPersonaById } from './language-learning-personas';

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class LanguageLearningService extends ScholarlyBaseService {
  private aiService: AIIntegrationService;
  private aiBuddyService: AIBuddyService;
  private contentStudioService: AIContentStudioService;
  private dataLakeService: DataLakeService;
  private mlPipelineService: MLPipelineService;
  private analyticsService: AnalyticsReportingService;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
  }) {
    super('LanguageLearningService', deps);
    
    this.aiService = getAIService();
    this.aiBuddyService = getAIBuddyService();
    this.contentStudioService = getAIContentStudioService();
    this.dataLakeService = getDataLakeService();
    this.mlPipelineService = getMLPipelineService();
    this.analyticsService = getAnalyticsService();
  }

  // ==========================================================================
  // LEARNER MANAGEMENT
  // ==========================================================================

  async createLearner(
    tenantId: string,
    input: CreateLanguageLearnerInput
  ): Promise<Result<LanguageLearner>> {
    try {
      const languageConfig = LANGUAGE_CONFIG[input.targetLanguage];
      const initialCEFR: CEFRLevel = input.isHeritageSpeaker ? 'A2' : 'A1';
      
      const learner: LanguageLearner = {
        id: this.generateId('lang'),
        tenantId,
        userId: input.userId,
        targetLanguage: input.targetLanguage,
        nativeLanguage: input.nativeLanguage,
        additionalLanguages: input.additionalLanguages || [],
        overallCEFR: initialCEFR,
        skillLevels: {
          reading: initialCEFR,
          writing: initialCEFR,
          listening: initialCEFR,
          speaking: initialCEFR,
        },
        targetCEFR: input.targetCEFR || 'B2',
        ibMYPPhase: input.ibMYPPhase,
        isHeritageSpeaker: input.isHeritageSpeaker || false,
        heritageProfile: input.heritageProfile,
        preferredPersonaId: CONVERSATION_PERSONAS[input.targetLanguage][0].id,
        voiceSpeed: 'normal',
        showRomanization: input.targetLanguage === 'zh' || input.targetLanguage === 'ja',
        preferredTopics: [],
        vocabularyMastered: 0,
        vocabularyInProgress: 0,
        conversationMinutes: 0,
        lessonsCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        totalXP: 0,
        srsCardsTotal: 0,
        srsDueToday: 0,
        srsAverageRetention: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prisma.languageLearner.create({ data: learner as any });

      // INTEGRATION 3: Data Lake - Log creation
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'learner.created',
        userId: input.userId,
        timestamp: new Date(),
        data: {
          learnerId: learner.id,
          targetLanguage: input.targetLanguage,
          isHeritageSpeaker: input.isHeritageSpeaker,
          initialCEFR,
        },
      });

      await this.publishEvent('language.learner.created', tenantId, {
        learnerId: learner.id,
        targetLanguage: input.targetLanguage,
      });

      log.info('Created language learner', { learnerId: learner.id, language: input.targetLanguage });
      return success(learner);
    } catch (error) {
      log.error('Failed to create language learner', { error });
      return failure(error as Error);
    }
  }

  async getLearner(tenantId: string, learnerId: string): Promise<Result<LanguageLearner>> {
    try {
      const learner = await prisma.languageLearner.findFirst({
        where: { id: learnerId, tenantId },
      });
      if (!learner) {
        return failure(new NotFoundError('LanguageLearner', learnerId));
      }
      return success(learner as unknown as LanguageLearner);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 1: AI CONVERSATION PARTNER
  // ==========================================================================

  async startConversation(
    tenantId: string,
    learnerId: string,
    personaId: string,
    options?: { topic?: string; scenario?: string; grammarFocus?: string[] }
  ): Promise<Result<LanguageConversation>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) return failure(learnerResult.error);
      const learner = learnerResult.data;

      const persona = getPersonaById(personaId);
      if (!persona) {
        return failure(new NotFoundError('ConversationPersona', personaId));
      }

      const systemPrompt = this.buildConversationSystemPrompt(persona, learner, options);
      const conversationId = this.generateId('conv');

      const conversation: LanguageConversation = {
        id: conversationId,
        tenantId,
        learnerId,
        personaId,
        language: learner.targetLanguage,
        messages: [],
        context: {
          cefrLevel: learner.overallCEFR,
          topic: options?.topic,
          scenario: options?.scenario,
          grammarFocus: options?.grammarFocus,
        },
        metrics: {
          messageCount: 0,
          wordsProduced: 0,
          errorsDetected: 0,
          correctionsMade: 0,
          newVocabularyIntroduced: [],
        },
        startedAt: new Date(),
      };

      // Generate opening message
      const openingPrompt = options?.scenario
        ? `Start a conversation for: ${options.scenario}. Greet the learner.`
        : `Greet the learner warmly as ${persona.name} and start a friendly conversation.`;

      const aiResponse = await this.aiService.complete({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: openingPrompt },
        ],
        maxTokens: 300,
        temperature: 0.8,
      });

      if (aiResponse.success) {
        conversation.messages.push({
          id: this.generateId('msg'),
          role: 'assistant',
          content: aiResponse.data.content,
          timestamp: new Date(),
        });
        conversation.metrics.messageCount = 1;
      }

      await this.saveConversation(tenantId, conversation);

      // INTEGRATION 3: Data Lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'conversation.started',
        userId: learner.userId,
        timestamp: new Date(),
        data: { conversationId, personaId, language: learner.targetLanguage, cefrLevel: learner.overallCEFR },
      });

      return success(conversation);
    } catch (error) {
      log.error('Failed to start conversation', { error });
      return failure(error as Error);
    }
  }

  async sendMessage(
    tenantId: string,
    conversationId: string,
    userMessage: string
  ): Promise<Result<ConversationMessage>> {
    try {
      const conversation = await this.getConversationById(tenantId, conversationId);
      if (!conversation) {
        return failure(new NotFoundError('Conversation', conversationId));
      }

      const learnerResult = await this.getLearner(tenantId, conversation.learnerId);
      if (!learnerResult.success) return failure(learnerResult.error);
      const learner = learnerResult.data;

      const persona = getPersonaById(conversation.personaId)!;

      // Add user message
      const userMsg: ConversationMessage = {
        id: this.generateId('msg'),
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
      };
      conversation.messages.push(userMsg);

      // Build AI messages
      const systemPrompt = this.buildConversationSystemPrompt(persona, learner, conversation.context);
      const messages = this.buildMessageHistory(conversation, systemPrompt);

      // Get AI response
      const aiResponse = await this.aiService.complete({
        messages,
        maxTokens: 400,
        temperature: 0.8,
      });

      if (!aiResponse.success) {
        return failure(new Error('AI response failed'));
      }

      const assistantMsg: ConversationMessage = {
        id: this.generateId('msg'),
        role: 'assistant',
        content: aiResponse.data.content,
        timestamp: new Date(),
      };

      conversation.messages.push(assistantMsg);
      conversation.metrics.messageCount += 2;
      conversation.metrics.wordsProduced += userMessage.split(/\s+/).length;

      await this.saveConversation(tenantId, conversation);

      // INTEGRATION 3: Data Lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'conversation.message',
        userId: learner.userId,
        timestamp: new Date(),
        data: {
          conversationId,
          messageCount: conversation.metrics.messageCount,
          wordsProduced: userMessage.split(/\s+/).length,
        },
      });

      return success(assistantMsg);
    } catch (error) {
      log.error('Failed to send message', { error });
      return failure(error as Error);
    }
  }

  async endConversation(tenantId: string, conversationId: string): Promise<Result<ConversationSummary>> {
    try {
      const conversation = await this.getConversationById(tenantId, conversationId);
      if (!conversation) {
        return failure(new NotFoundError('Conversation', conversationId));
      }

      conversation.endedAt = new Date();
      conversation.durationMinutes = Math.round(
        (conversation.endedAt.getTime() - conversation.startedAt.getTime()) / 60000
      );

      // Update learner stats
      await prisma.languageLearner.update({
        where: { id: conversation.learnerId },
        data: {
          conversationMinutes: { increment: conversation.durationMinutes || 0 },
          lastSessionAt: new Date(),
        },
      });

      const summary: ConversationSummary = {
        conversationId: conversation.id,
        durationMinutes: conversation.durationMinutes || 0,
        messageCount: conversation.metrics.messageCount,
        wordsProduced: conversation.metrics.wordsProduced,
        newVocabulary: conversation.metrics.newVocabularyIntroduced,
        errorsDetected: conversation.metrics.errorsDetected,
        correctionsMade: conversation.metrics.correctionsMade,
        topicsDiscussed: [conversation.context.topic || 'General'],
        strengths: [],
        areasToImprove: [],
        suggestedFollowUp: [],
      };

      // INTEGRATION 3: Data Lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'conversation.ended',
        userId: conversation.learnerId,
        timestamp: new Date(),
        data: {
          conversationId,
          durationMinutes: conversation.durationMinutes,
          messageCount: conversation.metrics.messageCount,
          wordsProduced: conversation.metrics.wordsProduced,
        },
      });

      return success(summary);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 2: AI CONTENT STUDIO - EXERCISES
  // ==========================================================================

  async generateExercises(
    tenantId: string,
    learnerId: string,
    options: { skill: SkillType; count?: number; grammarTopics?: string[] }
  ): Promise<Result<LanguageExercise[]>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) return failure(learnerResult.error);
      const learner = learnerResult.data;

      const cefrLevel = learner.skillLevels[options.skill];
      const cefrDef = CEFR_LEVELS[cefrLevel];
      const langConfig = LANGUAGE_CONFIG[learner.targetLanguage];

      const prompt = `Generate ${options.count || 5} ${options.skill} exercises for ${langConfig.name} learners at CEFR ${cefrLevel}.

LEARNER: Native ${learner.nativeLanguage}, level ${cefrLevel} (${cefrDef.name})
${learner.isHeritageSpeaker ? 'Heritage speaker: Focus on literacy and formal register' : ''}
${options.grammarTopics ? `Focus grammar: ${options.grammarTopics.join(', ')}` : ''}

Return JSON:
{
  "exercises": [
    {
      "type": "fill_blank|multiple_choice|translation|comprehension",
      "instructions": "English instructions",
      "content": { "text": "Target language content", "options": [] },
      "answer": "Correct answer",
      "explanation": "Explanation",
      "difficulty": 1-5,
      "skills": ["skills tested"]
    }
  ]
}`;

      const response = await this.aiService.complete({
        messages: [
          { role: 'system', content: `You are an expert ${langConfig.name} teacher creating CEFR-aligned exercises.` },
          { role: 'user', content: prompt },
        ],
        jsonMode: true,
        maxTokens: 2000,
      });

      if (!response.success) {
        return failure(new Error('Failed to generate exercises'));
      }

      const parsed = JSON.parse(response.data.content);
      const exercises: LanguageExercise[] = parsed.exercises.map((e: any) => ({
        id: this.generateId('ex'),
        ...e,
        language: learner.targetLanguage,
        cefrLevel,
        skill: options.skill,
        generatedFor: learnerId,
        generatedAt: new Date(),
      }));

      // INTEGRATION 3: Data Lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'exercises.generated',
        userId: learner.userId,
        timestamp: new Date(),
        data: { skill: options.skill, cefrLevel, count: exercises.length, language: learner.targetLanguage },
      });

      return success(exercises);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 3: DATA LAKE - SRS TRACKING
  // ==========================================================================

  async createSRSCard(
    tenantId: string,
    learnerId: string,
    card: { cardType: SRSCard['cardType']; front: string; back: string; context?: string }
  ): Promise<Result<SRSCard>> {
    try {
      const newCard: SRSCard = {
        id: this.generateId('srs'),
        learnerId,
        tenantId,
        cardType: card.cardType,
        front: card.front,
        back: card.back,
        context: card.context,
        box: 1,
        easeFactor: 2.5,
        interval: 1,
        dueDate: new Date(),
        reviewCount: 0,
        correctCount: 0,
        incorrectCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await prisma.sRSCard.create({ data: newCard as any });

      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'srs.card_created',
        userId: learnerId,
        timestamp: new Date(),
        data: { cardId: newCard.id, cardType: card.cardType },
      });

      return success(newCard);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async recordSRSReview(
    tenantId: string,
    cardId: string,
    responseQuality: 0 | 1 | 2 | 3 | 4 | 5,
    responseTimeMs: number
  ): Promise<Result<SRSCard>> {
    try {
      const card = await prisma.sRSCard.findFirst({
        where: { id: cardId, tenantId },
      }) as unknown as SRSCard;

      if (!card) {
        return failure(new NotFoundError('SRSCard', cardId));
      }

      const previousState = { box: card.box, interval: card.interval, easeFactor: card.easeFactor };
      const newState = this.calculateSM2(card, responseQuality);

      const updatedData = {
        box: newState.box,
        easeFactor: newState.easeFactor,
        interval: newState.interval,
        dueDate: new Date(Date.now() + newState.interval * 24 * 60 * 60 * 1000),
        lastReviewedAt: new Date(),
        reviewCount: card.reviewCount + 1,
        correctCount: responseQuality >= 3 ? card.correctCount + 1 : card.correctCount,
        incorrectCount: responseQuality < 3 ? card.incorrectCount + 1 : card.incorrectCount,
        updatedAt: new Date(),
      };

      await prisma.sRSCard.update({ where: { id: cardId }, data: updatedData as any });

      // Record review
      const review: SRSReview = {
        id: this.generateId('review'),
        cardId,
        learnerId: card.learnerId,
        tenantId,
        reviewedAt: new Date(),
        responseQuality,
        responseTimeMs,
        previousBox: previousState.box,
        previousInterval: previousState.interval,
        previousEaseFactor: previousState.easeFactor,
        newBox: newState.box,
        newInterval: newState.interval,
        newEaseFactor: newState.easeFactor,
      };

      await prisma.sRSReview.create({ data: review as any });

      // Data Lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'srs.review_completed',
        userId: card.learnerId,
        timestamp: new Date(),
        data: {
          cardId,
          responseQuality,
          responseTimeMs,
          previousBox: previousState.box,
          newBox: newState.box,
          correct: responseQuality >= 3,
        },
      });

      return success({ ...card, ...updatedData } as SRSCard);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async getDueCards(tenantId: string, learnerId: string, limit: number = 20): Promise<Result<SRSCard[]>> {
    try {
      const cards = await prisma.sRSCard.findMany({
        where: {
          learnerId,
          tenantId,
          dueDate: { lte: new Date() },
        },
        orderBy: [{ box: 'asc' }, { dueDate: 'asc' }],
        take: limit,
      });
      return success(cards as unknown as SRSCard[]);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async getSRSStatistics(tenantId: string, learnerId: string): Promise<Result<SRSStatistics>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) return failure(learnerResult.error);
      const learner = learnerResult.data;

      const cards = await prisma.sRSCard.findMany({
        where: { learnerId, tenantId },
      }) as unknown as SRSCard[];

      const now = new Date();
      const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

      const cardsByBox: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      let dueToday = 0, dueThisWeek = 0, overdue = 0;
      let totalCorrect = 0, totalReviews = 0, totalEaseFactor = 0;

      for (const card of cards) {
        cardsByBox[card.box] = (cardsByBox[card.box] || 0) + 1;
        if (card.dueDate <= now) dueToday++;
        else if (card.dueDate <= weekFromNow) dueThisWeek++;
        if (card.dueDate < new Date(now.setHours(0, 0, 0, 0))) overdue++;
        totalCorrect += card.correctCount;
        totalReviews += card.reviewCount;
        totalEaseFactor += card.easeFactor;
      }

      const stats: SRSStatistics = {
        learnerId,
        language: learner.targetLanguage,
        totalCards: cards.length,
        cardsByBox,
        dueToday,
        dueThisWeek,
        overdue,
        retentionRate: totalReviews > 0 ? (totalCorrect / totalReviews) * 100 : 0,
        averageEaseFactor: cards.length > 0 ? totalEaseFactor / cards.length : 2.5,
        averageResponseTimeMs: 0,
        currentStreak: learner.currentStreak,
        longestStreak: learner.longestStreak,
        lastReviewDate: learner.lastSessionAt,
        cardsLearnedToday: 0,
        cardsReviewedToday: 0,
        newCardsAvailable: 0,
      };

      return success(stats);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 4: ML PIPELINE - PROFICIENCY PREDICTION
  // ==========================================================================

  async predictProficiency(tenantId: string, learnerId: string): Promise<Result<ProficiencyPrediction>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) return failure(learnerResult.error);
      const learner = learnerResult.data;

      // Build features
      const features = {
        currentCEFR: this.cefrToNumeric(learner.overallCEFR),
        vocabularyMastered: learner.vocabularyMastered,
        conversationMinutes: learner.conversationMinutes,
        lessonsCompleted: learner.lessonsCompleted,
        srsRetention: learner.srsAverageRetention,
        currentStreak: learner.currentStreak,
        totalXP: learner.totalXP,
        languageDifficulty: LANGUAGE_CONFIG[learner.targetLanguage].difficultyForEnglishSpeakers,
        isHeritageSpeaker: learner.isHeritageSpeaker ? 1 : 0,
      };

      // Get ML prediction
      const mlResult = await this.mlPipelineService.predictPerformance(tenantId, learnerId, 'language_proficiency');

      const nextLevel = this.getNextCEFRLevel(learner.overallCEFR);
      const hoursToNext = nextLevel ? this.estimateHoursToLevel(learner.overallCEFR, nextLevel, features) : null;

      const prediction: ProficiencyPrediction = {
        learnerId,
        language: learner.targetLanguage,
        currentProficiency: {
          overall: learner.overallCEFR,
          reading: learner.skillLevels.reading,
          writing: learner.skillLevels.writing,
          listening: learner.skillLevels.listening,
          speaking: learner.skillLevels.speaking,
        },
        predictedProgress: {
          thirtyDays: learner.overallCEFR,
          ninetyDays: this.predictProgressIn(learner, 90),
          oneYear: this.predictProgressIn(learner, 365),
        },
        estimatedHoursToNextLevel: hoursToNext,
        strengths: this.identifyStrengths(learner),
        areasForImprovement: this.identifyWeaknesses(learner),
        recommendations: this.generateRecommendations(learner, features),
        confidence: mlResult.success ? mlResult.data.confidence : 0.7,
        assessedAt: new Date(),
      };

      // Data Lake
      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'ml.proficiency_predicted',
        userId: learner.userId,
        timestamp: new Date(),
        data: {
          learnerId,
          language: learner.targetLanguage,
          currentCEFR: learner.overallCEFR,
          estimatedHoursToNext: hoursToNext,
        },
      });

      return success(prediction);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async conductPlacementTest(tenantId: string, learnerId: string, language: LanguageCode): Promise<Result<PlacementTestResult>> {
    try {
      // Simplified placement - would be adaptive in production
      const result: PlacementTestResult = {
        id: this.generateId('placement'),
        learnerId,
        language,
        recommendedCEFR: 'A2',
        skillBreakdown: { reading: 'A2', writing: 'A1', listening: 'A2', speaking: 'A1' },
        confidence: 0.85,
        strengths: ['vocabulary_recognition', 'reading_comprehension'],
        weaknesses: ['verb_conjugation', 'written_expression'],
        recommendedStartingPoint: { unit: 'Unit 3: Present Tense Mastery', focus: ['verb_conjugation'] },
        completedAt: new Date(),
      };

      await prisma.languageLearner.update({
        where: { id: learnerId },
        data: {
          overallCEFR: result.recommendedCEFR,
          skillLevels: result.skillBreakdown,
          lastPlacementTestAt: new Date(),
        },
      });

      await this.dataLakeService.ingestEvent({
        tenantId,
        source: 'language_learning',
        eventType: 'placement_test.completed',
        userId: learnerId,
        timestamp: new Date(),
        data: { placementId: result.id, language, recommendedCEFR: result.recommendedCEFR },
      });

      return success(result);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INTEGRATION 5: ANALYTICS - DASHBOARDS
  // ==========================================================================

  async getLearnerDashboard(tenantId: string, learnerId: string): Promise<Result<LanguageDashboardData>> {
    try {
      const learnerResult = await this.getLearner(tenantId, learnerId);
      if (!learnerResult.success) return failure(learnerResult.error);
      const learner = learnerResult.data;

      const cefrDef = CEFR_LEVELS[learner.overallCEFR];
      const srsStatsResult = await this.getSRSStatistics(tenantId, learnerId);

      const dashboard: LanguageDashboardData = {
        learner: {
          id: learnerId,
          language: learner.targetLanguage,
          languageName: LANGUAGE_CONFIG[learner.targetLanguage].name,
        },
        cefrProgress: {
          currentLevel: learner.overallCEFR,
          currentLevelName: cefrDef.name,
          targetLevel: learner.targetCEFR,
          skillBreakdown: learner.skillLevels,
          progressToNextLevel: this.calculateProgressToNext(learner),
          canDoStatements: cefrDef.canDoStatements,
        },
        weeklyStats: {
          minutesPracticed: 120,
          conversationMinutes: 45,
          exercisesCompleted: 15,
          cardsReviewed: 80,
          newVocabulary: 25,
          currentStreak: learner.currentStreak,
        },
        srsOverview: srsStatsResult.success ? {
          dueToday: srsStatsResult.data.dueToday,
          overdue: srsStatsResult.data.overdue,
          retention: srsStatsResult.data.retentionRate,
          totalCards: srsStatsResult.data.totalCards,
        } : null,
        recentConversations: [],
        achievements: [
          { id: '1', name: 'First Conversation', earnedAt: new Date() },
          { id: '2', name: '100 Words Learned', earnedAt: new Date() },
        ],
        recommendations: [
          'Practice conversation for 10 minutes today',
          `Review ${learner.srsDueToday} vocabulary cards`,
          'Complete a listening exercise',
        ],
      };

      await this.analyticsService.trackDashboardView({
        tenantId,
        dashboardType: 'language_learner',
        userId: learnerId,
        viewedAt: new Date(),
      });

      return success(dashboard);
    } catch (error) {
      return failure(error as Error);
    }
  }

  async registerDashboardWidgets(tenantId: string): Promise<Result<void>> {
    try {
      const widgets = [
        { id: 'language_cefr_radar', name: 'CEFR Skill Breakdown', type: 'scatter_plot' as const },
        { id: 'language_vocabulary_progress', name: 'Vocabulary Growth', type: 'area_chart' as const },
        { id: 'language_srs_due', name: 'Cards Due for Review', type: 'metric_card' as const },
        { id: 'language_conversation_time', name: 'Conversation Practice', type: 'gauge' as const },
        { id: 'language_level_progress', name: 'Progress to Next Level', type: 'funnel' as const },
      ];

      for (const widget of widgets) {
        await this.analyticsService.registerWidget({
          tenantId,
          widgetId: widget.id,
          name: widget.name,
          type: widget.type,
          personaTypes: ['student'],
          dataSource: { type: 'query', query: widget.id },
        });
      }

      return success(undefined);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private buildConversationSystemPrompt(persona: any, learner: LanguageLearner, options?: any): string {
    let prompt = persona.systemPrompt.replace('{cefr_level}', learner.overallCEFR);
    if (learner.isHeritageSpeaker) {
      prompt += '\n\nHERITAGE SPEAKER: Focus on literacy, formal register, and academic language.';
    }
    if (options?.topic) prompt += `\n\nTOPIC: ${options.topic}`;
    if (options?.grammarFocus) prompt += `\n\nGRAMMAR FOCUS: ${options.grammarFocus.join(', ')}`;
    return prompt;
  }

  private buildMessageHistory(conversation: LanguageConversation, systemPrompt: string) {
    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];
    for (const msg of conversation.messages.slice(-10)) {
      if (msg.role !== 'system') {
        messages.push({ role: msg.role as 'user' | 'assistant', content: msg.content });
      }
    }
    return messages;
  }

  private calculateSM2(card: SRSCard, quality: number) {
    let easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    let interval = card.interval;
    let box = card.box;

    if (quality < 3) {
      box = 1;
      interval = 1;
    } else {
      if (box < 6) box++;
      interval = card.reviewCount === 0 ? 1 : card.reviewCount === 1 ? 6 : Math.round(card.interval * easeFactor);
    }

    return { box, easeFactor, interval };
  }

  private cefrToNumeric(level: CEFRLevel): number {
    return { A1: 1, A2: 2, B1: 3, B2: 4, C1: 5, C2: 6 }[level];
  }

  private getNextCEFRLevel(current: CEFRLevel): CEFRLevel | null {
    const order: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const idx = order.indexOf(current);
    return idx < 5 ? order[idx + 1] : null;
  }

  private estimateHoursToLevel(current: CEFRLevel, next: CEFRLevel, features: any): number {
    const base = CEFR_LEVELS[next].hoursToAchieve - CEFR_LEVELS[current].hoursToAchieve;
    const heritageFactor = features.isHeritageSpeaker ? 0.7 : 1.0;
    return Math.round(base * heritageFactor);
  }

  private predictProgressIn(learner: LanguageLearner, days: number): CEFRLevel {
    // Simplified - would use ML in production
    return learner.overallCEFR;
  }

  private identifyStrengths(learner: LanguageLearner): string[] {
    const avg = this.cefrToNumeric(learner.overallCEFR);
    return Object.entries(learner.skillLevels)
      .filter(([, level]) => this.cefrToNumeric(level) >= avg)
      .map(([skill]) => skill);
  }

  private identifyWeaknesses(learner: LanguageLearner): string[] {
    const avg = this.cefrToNumeric(learner.overallCEFR);
    return Object.entries(learner.skillLevels)
      .filter(([, level]) => this.cefrToNumeric(level) < avg)
      .map(([skill]) => skill);
  }

  private generateRecommendations(learner: LanguageLearner, features: any): string[] {
    const recs = [];
    if (learner.conversationMinutes < 60) recs.push('Increase conversation practice');
    if (learner.srsAverageRetention < 80) recs.push('Review vocabulary cards more consistently');
    if (learner.currentStreak < 3) recs.push('Build a daily practice habit');
    return recs;
  }

  private calculateProgressToNext(learner: LanguageLearner): number {
    return 45; // Percentage - would calculate based on actual progress
  }

  private async saveConversation(tenantId: string, conversation: LanguageConversation): Promise<void> {
    await prisma.languageConversation.upsert({
      where: { id: conversation.id },
      create: conversation as any,
      update: {
        messages: conversation.messages as any,
        metrics: conversation.metrics as any,
        endedAt: conversation.endedAt,
        durationMinutes: conversation.durationMinutes,
      },
    });
  }

  private async getConversationById(tenantId: string, id: string): Promise<LanguageConversation | null> {
    const conv = await prisma.languageConversation.findFirst({ where: { id, tenantId } });
    return conv as unknown as LanguageConversation | null;
  }
}

// ============================================================================
// SERVICE INITIALIZATION
// ============================================================================

let languageLearningServiceInstance: LanguageLearningService | null = null;

export function initializeLanguageLearningService(deps: {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
}): LanguageLearningService {
  languageLearningServiceInstance = new LanguageLearningService(deps);
  return languageLearningServiceInstance;
}

export function getLanguageLearningService(): LanguageLearningService {
  if (!languageLearningServiceInstance) {
    throw new Error('LanguageLearningService not initialized');
  }
  return languageLearningServiceInstance;
}

export { LanguageLearningService as default };
