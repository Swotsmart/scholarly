/**
 * AI Engine Routes
 *
 * API endpoints for AI abstraction layer, provider management,
 * AI tutor conversations, BKT mastery tracking, and ML personalisation.
 * Sprints: 1, 2, 3, 13, 14, 15
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '@scholarly/database';
import { authMiddleware } from '../middleware/auth';

export const aiEngineRouter: Router = Router();
aiEngineRouter.use(authMiddleware);

// ============================================================================
// AI Provider Management
// ============================================================================

const PROVIDER_DEFINITIONS = [
  {
    id: 'openai',
    name: 'OpenAI',
    capabilities: ['text_generation', 'image_generation'],
    envVar: 'OPENAI_API_KEY',
  },
  {
    id: 'claude',
    name: 'Anthropic Claude',
    capabilities: ['text_generation', 'analysis'],
    envVar: 'ANTHROPIC_API_KEY',
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    capabilities: ['text_generation', 'multimodal'],
    envVar: 'GOOGLE_AI_API_KEY',
  },
  {
    id: 'elevenlabs',
    name: 'ElevenLabs',
    capabilities: ['voice_synthesis'],
    envVar: 'ELEVENLABS_API_KEY',
  },
] as const;

/**
 * GET /providers
 * Check which AI provider API keys are configured in environment variables.
 */
aiEngineRouter.get('/providers', async (_req: Request, res: Response) => {
  try {
    const providers = PROVIDER_DEFINITIONS.map((provider) => ({
      id: provider.id,
      name: provider.name,
      capabilities: [...provider.capabilities],
      status: process.env[provider.envVar] ? 'configured' : 'not_configured',
    }));

    res.json({
      success: true,
      data: { providers },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve provider list', details: String(error) },
    });
  }
});

/**
 * GET /providers/:providerId/health
 * Check whether a specific provider's API key is configured.
 */
aiEngineRouter.get('/providers/:providerId/health', async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;

    const provider = PROVIDER_DEFINITIONS.find((p) => p.id === providerId);
    if (!provider) {
      res.status(404).json({
        success: false,
        error: { message: `Provider '${providerId}' not found` },
      });
      return;
    }

    const isConfigured = !!process.env[provider.envVar];

    res.json({
      success: true,
      data: {
        providerId: provider.id,
        name: provider.name,
        status: isConfigured ? 'configured' : 'not_configured',
        lastChecked: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to check provider health', details: String(error) },
    });
  }
});

// ============================================================================
// AI Tutor Conversation Engine
// ============================================================================

const startConversationSchema = z.object({
  sessionId: z.string().optional(),
  learnerId: z.string().optional(),
  storybookId: z.string().optional(),
  scaffoldingLevel: z.enum(['Independent', 'Guided', 'Supported', 'Modelled']).default('Guided'),
  title: z.string().optional(),
});

/**
 * POST /tutor/conversations
 * Create a new AI tutor conversation.
 */
aiEngineRouter.post('/tutor/conversations', async (req: Request, res: Response) => {
  try {
    const parsed = startConversationSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid request body', details: parsed.error.flatten() },
      });
      return;
    }

    const params = parsed.data;
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    const title =
      params.title ||
      `Tutor session – ${new Date().toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const conversation = await prisma.aIBuddyConversation.create({
      data: {
        tenantId,
        userId,
        role: 'tutor',
        title,
        messages: [],
        context: {
          sessionId: params.sessionId || null,
          learnerId: params.learnerId || null,
          storybookId: params.storybookId || null,
          scaffoldingLevel: params.scaffoldingLevel,
        },
        status: 'active',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        conversationId: conversation.id,
        title: conversation.title,
        status: conversation.status,
        context: conversation.context,
        createdAt: conversation.createdAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create conversation', details: String(error) },
    });
  }
});

const turnSchema = z.object({
  message: z.string().min(1),
  type: z.enum(['text', 'audio', 'image']).default('text'),
});

/**
 * POST /tutor/conversations/:conversationId/turns
 * Append a user turn to an existing conversation.
 * AI response generation is handled asynchronously; this endpoint stores the user turn.
 */
aiEngineRouter.post('/tutor/conversations/:conversationId/turns', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const parsed = turnSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: { message: 'Invalid request body', details: parsed.error.flatten() },
      });
      return;
    }

    const { message, type } = parsed.data;
    const userId = req.user!.id;

    const conversation = await prisma.aIBuddyConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: { message: `Conversation '${conversationId}' not found` },
      });
      return;
    }

    if (conversation.userId !== userId) {
      res.status(403).json({
        success: false,
        error: { message: 'You do not have access to this conversation' },
      });
      return;
    }

    const existingMessages = Array.isArray(conversation.messages) ? conversation.messages : [];
    const newMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString(),
      type,
    };
    const updatedMessages = [...(existingMessages as Record<string, unknown>[]), newMessage];

    const updated = await prisma.aIBuddyConversation.update({
      where: { id: conversationId },
      data: {
        messages: updatedMessages,
        lastMessageAt: new Date(),
      },
    });

    res.json({
      success: true,
      data: {
        conversationId: updated.id,
        turnIndex: updatedMessages.length - 1,
        userMessage: newMessage,
        note: 'AI response generation is processed asynchronously.',
        lastMessageAt: updated.lastMessageAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add turn to conversation', details: String(error) },
    });
  }
});

/**
 * GET /tutor/conversations/:conversationId
 * Retrieve a full conversation by ID.
 */
aiEngineRouter.get('/tutor/conversations/:conversationId', async (req: Request, res: Response) => {
  try {
    const { conversationId } = req.params;

    const conversation = await prisma.aIBuddyConversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      res.status(404).json({
        success: false,
        error: { message: `Conversation '${conversationId}' not found` },
      });
      return;
    }

    res.json({
      success: true,
      data: {
        conversationId: conversation.id,
        tenantId: conversation.tenantId,
        userId: conversation.userId,
        role: conversation.role,
        title: conversation.title,
        messages: conversation.messages,
        context: conversation.context,
        status: conversation.status,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
        lastMessageAt: conversation.lastMessageAt.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve conversation', details: String(error) },
    });
  }
});

/**
 * GET /tutor/comprehension-profile/:learnerId
 * Build a comprehension profile by querying BKTCompetencyState for the learner,
 * grouped by domain with average pKnown per domain.
 */
aiEngineRouter.get('/tutor/comprehension-profile/:learnerId', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;

    const profile = await prisma.adaptationProfile.findUnique({
      where: { learnerId },
      include: {
        competencyStates: true,
      },
    });

    if (!profile) {
      // Return empty profile rather than 404 - the learner may not have started yet
      res.json({
        success: true,
        data: {
          learnerId,
          domains: {},
          totalCompetencies: 0,
        },
      });
      return;
    }

    // Group competency states by domain and calculate average pKnown
    const domainMap: Record<string, { totalPKnown: number; count: number }> = {};
    for (const state of profile.competencyStates) {
      if (!domainMap[state.domain]) {
        domainMap[state.domain] = { totalPKnown: 0, count: 0 };
      }
      domainMap[state.domain].totalPKnown += state.pKnown;
      domainMap[state.domain].count += 1;
    }

    const domains: Record<string, number> = {};
    for (const [domain, { totalPKnown, count }] of Object.entries(domainMap)) {
      domains[domain] = Math.round((totalPKnown / count) * 1000) / 1000;
    }

    res.json({
      success: true,
      data: {
        learnerId,
        domains,
        totalCompetencies: profile.competencyStates.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to build comprehension profile', details: String(error) },
    });
  }
});

// ============================================================================
// BKT Mastery Tracking (v2)
// ============================================================================

/**
 * GET /bkt/mastery/:learnerId
 * Retrieve BKT mastery data for a learner including all competency states.
 */
aiEngineRouter.get('/bkt/mastery/:learnerId', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;

    const profile = await prisma.adaptationProfile.findUnique({
      where: { learnerId },
      include: {
        competencyStates: {
          orderBy: { domain: 'asc' },
        },
      },
    });

    if (!profile) {
      res.status(404).json({
        success: false,
        error: { message: `No mastery profile found for learner '${learnerId}'` },
      });
      return;
    }

    const skills = profile.competencyStates.map((state) => ({
      competencyId: state.competencyId,
      domain: state.domain,
      pLearn: state.pLearn,
      pGuess: state.pGuess,
      pSlip: state.pSlip,
      pKnown: state.pKnown,
      observations: state.observations,
      lastObservationAt: state.lastObservationAt?.toISOString() || null,
      masteryHistory: state.masteryHistory,
    }));

    const overallMastery =
      skills.length > 0
        ? Math.round((skills.reduce((sum, s) => sum + s.pKnown, 0) / skills.length) * 1000) / 1000
        : 0;

    res.json({
      success: true,
      data: {
        learnerId,
        profileId: profile.id,
        overallMastery,
        skillCount: skills.length,
        sessionCount: profile.sessionCount,
        totalTimeMinutes: profile.totalTimeMinutes,
        currentDifficulty: profile.currentDifficulty,
        targetSuccessRate: profile.targetSuccessRate,
        lastSessionAt: profile.lastSessionAt?.toISOString() || null,
        skills,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve mastery data', details: String(error) },
    });
  }
});

/**
 * GET /bkt/prerequisite-graph
 * Build a topology of competencies that exist for the tenant.
 * Nodes are derived from BKTCompetencyState records. Edges are empty
 * (prerequisite relationships come from curriculum data, not BKT state).
 */
aiEngineRouter.get('/bkt/prerequisite-graph', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Find all adaptation profiles for the tenant, then get distinct competency states
    const profiles = await prisma.adaptationProfile.findMany({
      where: { tenantId },
      select: { id: true },
    });

    const profileIds = profiles.map((p) => p.id);

    let nodes: { competencyId: string; domain: string; avgPKnown: number; learnerCount: number }[] = [];

    if (profileIds.length > 0) {
      const competencyStates = await prisma.bKTCompetencyState.findMany({
        where: { profileId: { in: profileIds } },
        select: {
          competencyId: true,
          domain: true,
          pKnown: true,
        },
      });

      // Aggregate by competencyId
      const competencyMap: Record<string, { domain: string; totalPKnown: number; count: number }> = {};
      for (const state of competencyStates) {
        if (!competencyMap[state.competencyId]) {
          competencyMap[state.competencyId] = { domain: state.domain, totalPKnown: 0, count: 0 };
        }
        competencyMap[state.competencyId].totalPKnown += state.pKnown;
        competencyMap[state.competencyId].count += 1;
      }

      nodes = Object.entries(competencyMap).map(([competencyId, { domain, totalPKnown, count }]) => ({
        competencyId,
        domain,
        avgPKnown: Math.round((totalPKnown / count) * 1000) / 1000,
        learnerCount: count,
      }));
    }

    res.json({
      success: true,
      data: {
        nodes,
        edges: [],
        totalCompetencies: nodes.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to build prerequisite graph', details: String(error) },
    });
  }
});

/**
 * GET /bkt/predictions/:learnerId
 * Retrieve ML predictions for mastery/proficiency plus spaced repetition schedule
 * from BKTCompetencyState ordered by lastObservationAt (items due for review).
 */
aiEngineRouter.get('/bkt/predictions/:learnerId', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;

    // Fetch mastery/proficiency predictions
    const predictions = await prisma.mLPrediction.findMany({
      where: {
        learnerId,
        predictionType: { in: ['mastery', 'proficiency'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    // Build spaced repetition schedule from BKT competency states
    // Items with oldest lastObservationAt are due for review first
    const profile = await prisma.adaptationProfile.findUnique({
      where: { learnerId },
      include: {
        competencyStates: {
          orderBy: { lastObservationAt: 'asc' },
        },
      },
    });

    const spacedRepetitionSchedule = (profile?.competencyStates || []).map((state) => ({
      competencyId: state.competencyId,
      domain: state.domain,
      pKnown: state.pKnown,
      observations: state.observations,
      lastObservationAt: state.lastObservationAt?.toISOString() || null,
      dueForReview: !state.lastObservationAt || state.pKnown < 0.8,
    }));

    res.json({
      success: true,
      data: {
        learnerId,
        predictions: predictions.map((p) => ({
          id: p.id,
          modelId: p.modelId,
          modelVersion: p.modelVersion,
          predictionType: p.predictionType,
          prediction: p.prediction,
          confidence: p.confidence,
          createdAt: p.createdAt.toISOString(),
          expiresAt: p.expiresAt?.toISOString() || null,
        })),
        spacedRepetitionSchedule,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve predictions', details: String(error) },
    });
  }
});

// ============================================================================
// ML Personalisation
// ============================================================================

/**
 * GET /ml/features/:learnerId
 * Build a multi-dimensional feature vector by querying mastery, reading behaviour,
 * curiosity preferences, and adaptation profile signals.
 */
aiEngineRouter.get('/ml/features/:learnerId', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;

    // 1. Mastery features from BKTCompetencyState (avg pKnown per domain)
    const adaptationProfile = await prisma.adaptationProfile.findUnique({
      where: { learnerId },
      include: {
        competencyStates: true,
      },
    });

    const masteryByDomain: Record<string, { total: number; count: number }> = {};
    if (adaptationProfile) {
      for (const state of adaptationProfile.competencyStates) {
        if (!masteryByDomain[state.domain]) {
          masteryByDomain[state.domain] = { total: 0, count: 0 };
        }
        masteryByDomain[state.domain].total += state.pKnown;
        masteryByDomain[state.domain].count += 1;
      }
    }

    const mastery = Object.entries(masteryByDomain).map(([domain, { total, count }]) => ({
      domain,
      avgPKnown: Math.round((total / count) * 1000) / 1000,
      competencyCount: count,
    }));

    // 2. Reading behaviour from EarlyYearsSession
    // Note: EarlyYearsSession uses childId, which maps to learnerId in this context
    const sessions = await prisma.earlyYearsSession.findMany({
      where: { childId: learnerId },
      select: {
        durationMinutes: true,
        starsEarned: true,
        averageFocusScore: true,
      },
    });

    const totalSessions = sessions.length;
    const avgDuration =
      totalSessions > 0
        ? Math.round((sessions.reduce((sum, s) => sum + s.durationMinutes, 0) / totalSessions) * 100) / 100
        : 0;
    const avgFocus =
      totalSessions > 0
        ? Math.round(
            (sessions.filter((s) => s.averageFocusScore != null).reduce((sum, s) => sum + (s.averageFocusScore || 0), 0) /
              Math.max(1, sessions.filter((s) => s.averageFocusScore != null).length)) *
              1000,
          ) / 1000
        : 0;

    const readingBehaviour = {
      totalSessions,
      avgDurationMinutes: avgDuration,
      avgFocusScore: avgFocus,
    };

    // 3. Curiosity preferences from CuriosityProfileCache
    const curiosityProfile = await prisma.curiosityProfileCache.findUnique({
      where: { learnerId },
    });

    const preferences = curiosityProfile
      ? {
          overallScore: curiosityProfile.overallScore,
          breadthScore: curiosityProfile.breadthScore,
          depthScore: curiosityProfile.depthScore,
          questionFrequency: curiosityProfile.questionFrequency,
          explorationRate: curiosityProfile.explorationRate,
          signalCount: curiosityProfile.signalCount,
        }
      : {
          overallScore: 0,
          breadthScore: 0,
          depthScore: 0,
          questionFrequency: 0,
          explorationRate: 0,
          signalCount: 0,
        };

    // 4. Temporal/affective signals from AdaptationProfile (EMA values)
    const temporal = adaptationProfile
      ? {
          emaAccuracy: adaptationProfile.emaAccuracy,
          emaResponseTime: adaptationProfile.emaResponseTime,
          emaEngagement: adaptationProfile.emaEngagement,
          emaHintUsage: adaptationProfile.emaHintUsage,
          emaSkipRate: adaptationProfile.emaSkipRate,
          currentDifficulty: adaptationProfile.currentDifficulty,
          targetSuccessRate: adaptationProfile.targetSuccessRate,
          sessionCount: adaptationProfile.sessionCount,
          totalTimeMinutes: adaptationProfile.totalTimeMinutes,
        }
      : {
          emaAccuracy: 0.5,
          emaResponseTime: 5000,
          emaEngagement: 0.5,
          emaHintUsage: 0,
          emaSkipRate: 0,
          currentDifficulty: 0.5,
          targetSuccessRate: 0.8,
          sessionCount: 0,
          totalTimeMinutes: 0,
        };

    // Count dimensions
    const dimensions =
      mastery.length + // one per domain
      3 + // readingBehaviour: totalSessions, avgDuration, avgFocus
      6 + // preferences: 6 fields
      9; // temporal: 9 fields

    res.json({
      success: true,
      data: {
        learnerId,
        featureVector: {
          mastery,
          readingBehaviour,
          preferences,
          temporal,
        },
        dimensions,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to build feature vector', details: String(error) },
    });
  }
});

/**
 * GET /ml/recommendations/:learnerId
 * Retrieve ML-generated recommendations for a learner plus curiosity context.
 */
aiEngineRouter.get('/ml/recommendations/:learnerId', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;

    const recommendations = await prisma.mLPrediction.findMany({
      where: {
        learnerId,
        predictionType: 'recommendation',
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    const curiosityProfile = await prisma.curiosityProfileCache.findUnique({
      where: { learnerId },
    });

    res.json({
      success: true,
      data: {
        learnerId,
        recommendations: recommendations.map((r) => ({
          id: r.id,
          modelId: r.modelId,
          modelVersion: r.modelVersion,
          prediction: r.prediction,
          confidence: r.confidence,
          createdAt: r.createdAt.toISOString(),
          expiresAt: r.expiresAt?.toISOString() || null,
        })),
        curiosityContext: curiosityProfile
          ? {
              overallScore: curiosityProfile.overallScore,
              clusters: curiosityProfile.clusters,
              emergingInterests: curiosityProfile.emergingInterests,
            }
          : null,
        total: recommendations.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve recommendations', details: String(error) },
    });
  }
});

/**
 * GET /ml/at-risk
 * Retrieve learners flagged as at-risk by ML predictions (confidence > 0.7).
 */
aiEngineRouter.get('/ml/at-risk', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const atRiskPredictions = await prisma.mLPrediction.findMany({
      where: {
        tenantId,
        predictionType: 'at_risk',
        confidence: { gt: 0.7 },
      },
      orderBy: { confidence: 'desc' },
    });

    const atRiskLearners = atRiskPredictions.map((p) => ({
      learnerId: p.learnerId,
      modelId: p.modelId,
      modelVersion: p.modelVersion,
      prediction: p.prediction,
      confidence: p.confidence,
      createdAt: p.createdAt.toISOString(),
      expiresAt: p.expiresAt?.toISOString() || null,
    }));

    res.json({
      success: true,
      data: {
        atRiskLearners,
        total: atRiskLearners.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve at-risk learners', details: String(error) },
    });
  }
});

// ============================================================================
// AI Cost & Fallback Management
// ============================================================================

/**
 * GET /cost/summary
 * Summarise AI-related costs for the current month from AuditLog entries
 * where action contains 'ai_'. Extracts cost from metadata JSON.
 */
aiEngineRouter.get('/cost/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    // Calculate start of current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const aiLogs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        action: { startsWith: 'ai_' },
        timestamp: { gte: monthStart },
      },
      select: {
        action: true,
        metadata: true,
      },
    });

    // Aggregate cost by provider from metadata
    const byProvider: Record<string, number> = {};
    let totalCostUsd = 0;

    for (const log of aiLogs) {
      const metadata = log.metadata as Record<string, unknown> | null;
      if (metadata) {
        const cost = typeof metadata.cost === 'number' ? metadata.cost : 0;
        const provider = typeof metadata.provider === 'string' ? metadata.provider : 'unknown';

        totalCostUsd += cost;
        byProvider[provider] = (byProvider[provider] || 0) + cost;
      }
    }

    res.json({
      success: true,
      data: {
        period: 'current_month',
        monthStart: monthStart.toISOString(),
        totalCostUsd: Math.round(totalCostUsd * 10000) / 10000,
        byProvider,
        totalAiOperations: aiLogs.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve cost summary', details: String(error) },
    });
  }
});

/**
 * GET /cost/usage
 * Break down AI usage by type (text tokens, image count, audio minutes, speech minutes)
 * from AuditLog metadata.
 */
aiEngineRouter.get('/cost/usage', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const aiLogs = await prisma.auditLog.findMany({
      where: {
        tenantId,
        action: { startsWith: 'ai_' },
        timestamp: { gte: monthStart },
      },
      select: {
        action: true,
        metadata: true,
      },
    });

    let textGenerationTokens = 0;
    let imageGenerationCount = 0;
    let audioNarrationMinutes = 0;
    let speechRecognitionMinutes = 0;

    for (const log of aiLogs) {
      const metadata = log.metadata as Record<string, unknown> | null;
      if (!metadata) continue;

      const tokens = typeof metadata.tokens === 'number' ? metadata.tokens : 0;
      const images = typeof metadata.imageCount === 'number' ? metadata.imageCount : 0;
      const audioMinutes = typeof metadata.audioMinutes === 'number' ? metadata.audioMinutes : 0;
      const speechMinutes = typeof metadata.speechMinutes === 'number' ? metadata.speechMinutes : 0;

      textGenerationTokens += tokens;
      imageGenerationCount += images;
      audioNarrationMinutes += audioMinutes;
      speechRecognitionMinutes += speechMinutes;
    }

    res.json({
      success: true,
      data: {
        period: 'current_month',
        monthStart: monthStart.toISOString(),
        textGenerationTokens,
        imageGenerationCount,
        audioNarrationMinutes: Math.round(audioNarrationMinutes * 100) / 100,
        speechRecognitionMinutes: Math.round(speechRecognitionMinutes * 100) / 100,
        totalOperations: aiLogs.length,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to retrieve usage data', details: String(error) },
    });
  }
});

// ============================================================================
// Wellbeing & Safety
// ============================================================================

/**
 * GET /wellbeing/check/:learnerId
 * Assess learner wellbeing by checking today's session duration and recent
 * curiosity signal engagement.
 */
aiEngineRouter.get('/wellbeing/check/:learnerId', async (req: Request, res: Response) => {
  try {
    const { learnerId } = req.params;

    // Get today's start (midnight UTC)
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Query today's sessions for this learner (childId = learnerId in EarlyYearsSession)
    const todaySessions = await prisma.earlyYearsSession.findMany({
      where: {
        childId: learnerId,
        startedAt: { gte: todayStart },
      },
      select: {
        durationMinutes: true,
      },
    });

    const totalDurationMinutes = todaySessions.reduce((sum, s) => sum + s.durationMinutes, 0);
    const breakRecommended = totalDurationMinutes > 60;

    // Check recent curiosity signals in the last hour for engagement level
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const recentSignals = await prisma.curiositySignal.count({
      where: {
        learnerId,
        recordedAt: { gte: oneHourAgo },
      },
    });

    let engagementLevel: 'low' | 'normal' | 'high';
    if (recentSignals === 0) {
      engagementLevel = 'low';
    } else if (recentSignals <= 10) {
      engagementLevel = 'normal';
    } else {
      engagementLevel = 'high';
    }

    let status: 'healthy' | 'caution' | 'break_needed';
    if (breakRecommended) {
      status = 'break_needed';
    } else if (totalDurationMinutes > 45) {
      status = 'caution';
    } else {
      status = 'healthy';
    }

    res.json({
      success: true,
      data: {
        learnerId,
        status,
        sessionDurationMinutes: totalDurationMinutes,
        sessionCount: todaySessions.length,
        breakRecommended,
        engagementLevel,
        recentSignalCount: recentSignals,
        checkedAt: now.toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: { message: 'Failed to check wellbeing status', details: String(error) },
    });
  }
});
