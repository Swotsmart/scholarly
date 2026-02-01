/**
 * Voice Intelligence API — Completion Routes
 * 
 * Additional Express routes that complement the base voice-intelligence_api.ts
 * to expose the Phase 3 and Phase 4 completion features. These routes follow
 * the exact same patterns: Zod validation, tenant extraction from auth context,
 * consistent error response formatting, and RESTful resource naming.
 * 
 * ## Route Groups
 * 
 * | Prefix                  | Phase | Feature                    |
 * |-------------------------|-------|----------------------------|
 * | /reviews                | 3     | Tutor oversight            |
 * | /tutor-dashboard        | 3     | Tutor analytics            |
 * | /flags                  | 3     | Session flagging           |
 * | /clones                 | 4     | Voice cloning              |
 * | /clones/consent         | 4     | Clone consent management   |
 * | /dialogues              | 4     | Multi-speaker dialogue     |
 * | /vr-sessions            | 4     | VR voice integration       |
 * | /content-audio          | 4     | Marketplace audio tools    |
 * | /ws/stats               | Infra | WebSocket server stats     |
 * 
 * @module VoiceIntelligenceAPICompletion
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { VoiceIntelligenceService } from './voice-intelligence_service';
import { VoiceWebSocketServer } from './voice-intelligence_websocket';
import {
  submitSessionReview,
  getSessionReviews,
  getTutorDashboard,
  flagSession,
  enrichSessionWithBuddyContext,
  initiateVoiceClone,
  revokeVoiceCloneConsent,
  generateDialogue,
  createVRVoiceSession,
  updateVRCharacterPosition,
  generateContentAudio,
  SessionReviewRepository,
  VoiceCloneConsentRepository,
  VoiceCloneRepository,
  DialogueScriptRepository,
  GeneratedDialogueRepository,
  VRSessionRepository,
  ContentAudioRepository,
  AIBuddyServiceInterface,
  SessionFlagType,
  VoiceClonePurpose,
  ContentAudioType,
  VREnvironmentType,
} from './voice-intelligence_completion';
import { Logger, EventBus } from '../shared/types';

// =============================================================================
// ZOD VALIDATION SCHEMAS
// =============================================================================

const TurnAnnotationSchema = z.object({
  turnId: z.string().min(1),
  turnSequence: z.number().int().positive(),
  type: z.enum(['correction', 'praise', 'suggestion', 'concern', 'note']),
  text: z.string().min(1).max(2000),
  targetText: z.string().optional(),
  startOffset: z.number().int().nonnegative().optional(),
  endOffset: z.number().int().nonnegative().optional(),
});

const SessionFlagSchema = z.object({
  type: z.enum([
    'inappropriate_content', 'learner_distress', 'technical_issue',
    'assessment_disagreement', 'safeguarding_concern', 'curriculum_misalignment',
    'agent_behaviour', 'positive_highlight',
  ]),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  description: z.string().min(1).max(2000),
  turnId: z.string().optional(),
  requiresEscalation: z.boolean().default(false),
});

const TutorRecommendationSchema = z.object({
  type: z.enum(['practice', 'resource', 'session_topic', 'difficulty_adjustment', 'human_session']),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  priority: z.enum(['suggested', 'recommended', 'important']),
  resourceId: z.string().optional(),
  resourceType: z.string().optional(),
});

const SubmitReviewSchema = z.object({
  sessionId: z.string().min(1),
  reviewerId: z.string().min(1),
  reviewerRole: z.enum(['tutor', 'supervisor', 'curriculum_lead']),
  overallRating: z.number().int().min(1).max(5),
  ratings: z.object({
    agentAppropriateness: z.number().int().min(1).max(5),
    learnerEngagement: z.number().int().min(1).max(5),
    learningOutcomes: z.number().int().min(1).max(5),
    pronunciationAccuracy: z.number().int().min(1).max(5),
    conversationFlow: z.number().int().min(1).max(5),
  }),
  feedback: z.string().min(1).max(10000),
  annotations: z.array(TurnAnnotationSchema).default([]),
  flags: z.array(SessionFlagSchema).default([]),
  recommendations: z.array(TutorRecommendationSchema).default([]),
  assessmentOverride: z.object({
    pronunciationScore: z.number().min(0).max(100).optional(),
    grammarScore: z.number().min(0).max(100).optional(),
    fluencyScore: z.number().min(0).max(100).optional(),
    reason: z.string().min(1),
  }).optional(),
});

const CreateVoiceCloneSchema = z.object({
  voiceOwnerId: z.string().min(1),
  voiceOwnerRole: z.enum(['tutor', 'content_creator', 'learner_adult']),
  name: z.string().min(1).max(100),
  description: z.string().max(500).default(''),
  quality: z.enum(['instant', 'professional']),
  sampleAudioUrls: z.array(z.string().url()).min(1).max(25),
  allowedPurposes: z.array(z.enum([
    'content_narration', 'tutoring_sessions', 'pronunciation_models',
    'greeting_messages', 'course_materials',
  ])).min(1),
  consentMethod: z.enum(['digital_signature', 'checkbox_agreement', 'verbal_recorded']),
  consentText: z.string().optional(),
});

const DialogueCharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  role: z.string().min(1),
  voiceId: z.string().min(1),
  voiceSettings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    speakingRate: z.number().min(0.5).max(2.0).optional(),
  }).optional(),
  personality: z.string().optional(),
  accentRegion: z.string().optional(),
  ageGroup: z.string().optional(),
});

const DialogueLineSchema = z.object({
  sequence: z.number().int().positive(),
  characterId: z.string().min(1),
  text: z.string().min(1).max(5000),
  emotion: z.enum(['neutral', 'happy', 'sad', 'excited', 'confused', 'angry', 'thoughtful']).optional(),
  pauseBeforeMs: z.number().int().min(0).max(10000).optional(),
  pronunciationHints: z.record(z.string()).optional(),
  translation: z.string().optional(),
});

const GenerateDialogueSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(''),
  language: z.string().min(2).max(10),
  targetLevel: z.string().min(1),
  characters: z.array(DialogueCharacterSchema).min(1).max(10),
  lines: z.array(DialogueLineSchema).min(1).max(200),
  curriculumCodes: z.array(z.string()).optional(),
  teachingNotes: z.string().optional(),
});

const CreateVRSessionSchema = z.object({
  learnerId: z.string().min(1),
  scenarioId: z.string().min(1),
  environmentType: z.enum([
    'cafe', 'market', 'classroom', 'airport', 'hotel',
    'restaurant', 'office', 'street', 'home', 'custom',
  ]),
  deviceCapabilities: z.object({
    hasPositionalTracking: z.boolean(),
    hasHandTracking: z.boolean(),
    hasSpatialAudio: z.boolean(),
    maxAudioSources: z.number().int().positive(),
    supportedAudioFormats: z.array(z.string()),
    platform: z.enum(['quest', 'pico', 'vive', 'index', 'webxr_browser', 'unknown']),
  }),
  spatialAudioOverrides: z.object({
    hrtfProfile: z.enum(['default', 'custom']).optional(),
    distanceModel: z.enum(['linear', 'inverse', 'exponential']).optional(),
    maxDistance: z.number().positive().optional(),
    refDistance: z.number().positive().optional(),
    rolloffFactor: z.number().positive().optional(),
  }).optional(),
});

const ContentAudioSchema = z.object({
  contentId: z.string().min(1),
  creatorId: z.string().min(1),
  type: z.enum([
    'narration', 'vocabulary_list', 'dialogue',
    'pronunciation_guide', 'audio_quiz', 'story_narration',
  ]),
  language: z.string().min(2).max(10),
  voiceId: z.string().optional(),
  voicePreferences: z.object({
    gender: z.enum(['male', 'female', 'neutral']).optional(),
    ageGroup: z.enum(['child', 'young_adult', 'adult', 'elder']).optional(),
    accent: z.string().optional(),
  }).optional(),
  content: z.object({
    text: z.string().optional(),
    vocabulary: z.array(z.object({
      word: z.string(),
      translation: z.string().optional(),
      exampleSentence: z.string().optional(),
      phonetic: z.string().optional(),
    })).optional(),
    quizQuestions: z.array(z.object({
      question: z.string(),
      pauseForAnswerMs: z.number().int().min(1000).max(30000),
      answer: z.string(),
      explanation: z.string().optional(),
    })).optional(),
  }),
  outputFormat: z.string().optional(),
  publishToMarketplace: z.boolean().default(false),
});

// =============================================================================
// ROUTE FACTORY
// =============================================================================

export interface CompletionRouteDependencies {
  service: VoiceIntelligenceService;
  wsServer?: VoiceWebSocketServer;
  reviewRepo: SessionReviewRepository;
  consentRepo: VoiceCloneConsentRepository;
  cloneRepo: VoiceCloneRepository;
  scriptRepo: DialogueScriptRepository;
  dialogueRepo: GeneratedDialogueRepository;
  vrRepo: VRSessionRepository;
  contentAudioRepo: ContentAudioRepository;
  aiBuddyService?: AIBuddyServiceInterface;
  elevenLabsApi: any; // ElevenLabsAPIInterface
  logger: Logger;
  eventBus: EventBus;
}

/**
 * Create completion API routes.
 * 
 * These routes are designed to be mounted alongside the base routes:
 * ```ts
 * const baseRoutes = createVoiceIntelligenceRoutes(service);
 * const completionRoutes = createCompletionRoutes(deps);
 * app.use('/api/v1/voice', baseRoutes);
 * app.use('/api/v1/voice', completionRoutes);
 * ```
 */
export function createCompletionRoutes(deps: CompletionRouteDependencies): Router {
  const router = Router();
  const {
    service, wsServer, reviewRepo, consentRepo, cloneRepo,
    scriptRepo, dialogueRepo, vrRepo, contentAudioRepo,
    aiBuddyService, elevenLabsApi, logger, eventBus,
  } = deps;

  // Helper to extract tenant ID from authenticated request
  const getTenantId = (req: Request): string => {
    return (req as any).tenantId || req.headers['x-tenant-id'] as string;
  };

  // ---------------------------------------------------------------------------
  // TUTOR OVERSIGHT (Phase 3)
  // ---------------------------------------------------------------------------

  /**
   * POST /reviews — Submit a session review
   */
  router.post('/reviews', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const body = SubmitReviewSchema.parse(req.body);

      const result = await submitSessionReview(
        service, tenantId,
        { ...body, status: 'submitted' } as any,
        reviewRepo, eventBus, logger
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /reviews/:sessionId — Get reviews for a session
   */
  router.get('/reviews/:sessionId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const result = await getSessionReviews(tenantId, req.params.sessionId, reviewRepo);

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(404).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /tutor-dashboard/:tutorId — Get tutor oversight dashboard
   */
  router.get('/tutor-dashboard/:tutorId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const period = (req.query.period as string) || 'week';
      if (!['week', 'month', 'quarter'].includes(period)) {
        res.status(400).json({ success: false, error: 'Invalid period' });
        return;
      }

      const result = await getTutorDashboard(
        tenantId, req.params.tutorId, period as any, reviewRepo, logger
      );

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * POST /flags — Flag a session for review
   */
  router.post('/flags', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const body = z.object({
        sessionId: z.string().min(1),
        reviewerId: z.string().min(1),
        flag: SessionFlagSchema,
      }).parse(req.body);

      const result = await flagSession(
        tenantId, body.sessionId, body.reviewerId,
        body.flag as any, reviewRepo, eventBus, logger
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // AI BUDDY CONTEXT (Phase 3)
  // ---------------------------------------------------------------------------

  /**
   * GET /buddy-context/:learnerId — Get AI Buddy context for a learner
   */
  router.get('/buddy-context/:learnerId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      if (!aiBuddyService) {
        res.status(503).json({ success: false, error: 'AI Buddy service not configured' });
        return;
      }

      const result = await enrichSessionWithBuddyContext(
        tenantId, req.params.learnerId,
        req.query.sessionId as string || '',
        aiBuddyService, logger
      );

      if (result.success) {
        res.json({ success: true, data: result.data });
      } else {
        res.status(500).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // VOICE CLONING (Phase 4)
  // ---------------------------------------------------------------------------

  /**
   * POST /clones — Initiate voice clone creation
   */
  router.post('/clones', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const body = CreateVoiceCloneSchema.parse(req.body);

      const result = await initiateVoiceClone(
        { ...body, tenantId },
        consentRepo, cloneRepo, elevenLabsApi, eventBus, logger
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * DELETE /clones/consent/:consentId — Revoke voice clone consent
   */
  router.delete('/clones/consent/:consentId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const reason = req.body?.reason || 'User requested revocation';

      const result = await revokeVoiceCloneConsent(
        tenantId, req.params.consentId, reason,
        consentRepo, cloneRepo, elevenLabsApi, eventBus, logger
      );

      if (result.success) {
        res.json({ success: true, message: 'Consent revoked and clones deleted' });
      } else {
        res.status(400).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /clones/owner/:ownerId — List clones for a voice owner
   */
  router.get('/clones/owner/:ownerId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const clones = await cloneRepo.findByOwner(tenantId, req.params.ownerId);
      res.json({ success: true, data: clones });
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // MULTI-SPEAKER DIALOGUE (Phase 4)
  // ---------------------------------------------------------------------------

  /**
   * POST /dialogues — Generate a multi-speaker dialogue
   */
  router.post('/dialogues', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const body = GenerateDialogueSchema.parse(req.body);

      const script = {
        ...body,
        id: `script_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
        tenantId,
        createdBy: (req as any).userId || 'system',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await generateDialogue(
        tenantId, script as any,
        elevenLabsApi, scriptRepo, dialogueRepo, eventBus, logger
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /dialogues/:dialogueId — Get generated dialogue details
   */
  router.get('/dialogues/:dialogueId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const dialogue = await dialogueRepo.findById(tenantId, req.params.dialogueId);

      if (dialogue) {
        res.json({ success: true, data: dialogue });
      } else {
        res.status(404).json({ success: false, error: 'Dialogue not found' });
      }
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // VR INTEGRATION (Phase 4)
  // ---------------------------------------------------------------------------

  /**
   * POST /vr-sessions — Create a VR voice session
   */
  router.post('/vr-sessions', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const body = CreateVRSessionSchema.parse(req.body);

      const result = await createVRVoiceSession(
        { ...body, tenantId } as any,
        service, vrRepo, eventBus, logger
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * PATCH /vr-sessions/:vrSessionId/characters/:characterId/position
   * Update a character's 3D position in a VR session
   */
  router.patch(
    '/vr-sessions/:vrSessionId/characters/:characterId/position',
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const tenantId = getTenantId(req);
        const { position, rotation } = z.object({
          position: z.object({
            x: z.number(), y: z.number(), z: z.number(),
          }),
          rotation: z.object({
            pitch: z.number(), yaw: z.number(), roll: z.number(),
          }).optional(),
        }).parse(req.body);

        const result = await updateVRCharacterPosition(
          tenantId, req.params.vrSessionId, req.params.characterId,
          position, rotation, vrRepo, logger
        );

        if (result.success) {
          res.json({ success: true, data: result.data });
        } else {
          res.status(400).json({ success: false, error: result.error?.message });
        }
      } catch (error) {
        next(error);
      }
    }
  );

  // ---------------------------------------------------------------------------
  // CONTENT MARKETPLACE AUDIO (Phase 4)
  // ---------------------------------------------------------------------------

  /**
   * POST /content-audio — Generate audio for marketplace content
   */
  router.post('/content-audio', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const body = ContentAudioSchema.parse(req.body);

      const result = await generateContentAudio(
        { ...body, tenantId } as any,
        elevenLabsApi, contentAudioRepo, eventBus, logger
      );

      if (result.success) {
        res.status(201).json({ success: true, data: result.data });
      } else {
        res.status(400).json({ success: false, error: result.error?.message });
      }
    } catch (error) {
      next(error);
    }
  });

  /**
   * GET /content-audio/:contentId — Get audio files for a content item
   */
  router.get('/content-audio/:contentId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = getTenantId(req);
      const audioFiles = await contentAudioRepo.findByContent(tenantId, req.params.contentId);
      res.json({ success: true, data: audioFiles });
    } catch (error) {
      next(error);
    }
  });

  // ---------------------------------------------------------------------------
  // WEBSOCKET STATS (Infrastructure)
  // ---------------------------------------------------------------------------

  /**
   * GET /ws/stats — WebSocket server statistics for monitoring
   */
  router.get('/ws/stats', (req: Request, res: Response) => {
    if (wsServer) {
      res.json({ success: true, data: wsServer.getStats() });
    } else {
      res.status(503).json({ success: false, error: 'WebSocket server not initialised' });
    }
  });

  // ---------------------------------------------------------------------------
  // ERROR HANDLER
  // ---------------------------------------------------------------------------

  router.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    if (err.name === 'ZodError') {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: err.errors.map((e: any) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
      return;
    }

    logger.error('Unhandled API error in completion routes', err);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  });

  return router;
}

export { createCompletionRoutes as default };
