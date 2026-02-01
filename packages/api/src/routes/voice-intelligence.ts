/**
 * Voice Intelligence API Routes
 *
 * REST endpoints for the Voice Intelligence Service including
 * TTS, STT, pronunciation assessment, conversation agents, voice cloning,
 * and multi-speaker dialogue generation.
 *
 * @module VoiceIntelligenceRoutes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware, requireRoles } from '../middleware/auth';
import { voiceIntelligenceService } from '../services/voice-intelligence.service';
import { voiceWebSocketServer } from '../services/voice-intelligence-websocket.service';

const router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const TTSRequestSchema = z.object({
  text: z.string().min(1).max(10000),
  voiceId: z.string().min(1),
  modelId: z.enum([
    'eleven_multilingual_v2',
    'eleven_turbo_v2',
    'eleven_turbo_v2_5',
    'eleven_flash_v2_5',
  ]).optional(),
  voiceSettings: z.object({
    stability: z.number().min(0).max(1).optional(),
    similarityBoost: z.number().min(0).max(1).optional(),
    style: z.number().min(0).max(1).optional(),
    useSpeakerBoost: z.boolean().optional(),
  }).optional(),
  outputFormat: z.enum([
    'mp3_44100_128',
    'mp3_44100_192',
    'pcm_16000',
    'pcm_22050',
    'pcm_24000',
    'opus_48000',
  ]).optional(),
  language: z.string().optional(),
});

const PronunciationAssessmentSchema = z.object({
  learnerId: z.string().min(1),
  expectedText: z.string().min(1).max(5000),
  language: z.string().min(2).max(10),
  assessmentType: z.enum(['read_aloud', 'free_speech', 'word_practice']),
  strictness: z.enum(['lenient', 'moderate', 'strict']).optional(),
});

const CreateAgentSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(1000).optional(),
  voiceId: z.string().min(1),
  primaryLanguage: z.string().min(2).max(10),
  supportedLanguages: z.array(z.string()).default([]),
  systemPrompt: z.string().min(1).max(10000),
  firstMessage: z.string().min(1).max(1000),
  persona: z.record(z.unknown()).default({}),
});

const StartSessionSchema = z.object({
  agentId: z.string().min(1),
  scenarioId: z.string().optional(),
  learnerId: z.string().optional(),
});

const VoiceCloneSchema = z.object({
  voiceOwnerId: z.string().min(1),
  voiceOwnerRole: z.enum(['tutor', 'content_creator', 'learner_adult']),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  quality: z.enum(['instant', 'professional']),
  sampleAudioUrls: z.array(z.string().url()).min(1).max(25),
  allowedPurposes: z.array(z.enum([
    'content_narration',
    'tutoring_sessions',
    'pronunciation_models',
  ])).min(1),
  consentMethod: z.enum(['digital_signature', 'checkbox_agreement', 'verbal_recorded']),
});

const DialogueScriptSchema = z.object({
  title: z.string().min(1).max(200),
  language: z.string().min(2).max(10),
  targetLevel: z.string().min(1),
  characters: z.array(z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    role: z.string().min(1),
    voiceId: z.string().min(1),
    voiceSettings: z.object({
      stability: z.number().min(0).max(1).optional(),
      similarityBoost: z.number().min(0).max(1).optional(),
      style: z.number().min(0).max(1).optional(),
    }).optional(),
  })).min(1).max(10),
  lines: z.array(z.object({
    sequence: z.number().int().positive(),
    characterId: z.string().min(1),
    text: z.string().min(1).max(5000),
    emotion: z.enum(['neutral', 'happy', 'sad', 'excited', 'confused', 'angry']).optional(),
    pauseBeforeMs: z.number().int().min(0).max(10000).optional(),
  })).min(1).max(200),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const getTenantId = (req: Request): string => {
  return req.tenantId || req.headers['x-tenant-id'] as string || '';
};

const handleError = (res: Response, error: any, requestId: string): void => {
  if (error.name === 'ZodError') {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: error.errors.map((e: any) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
      requestId,
    });
    return;
  }

  res.status(500).json({
    success: false,
    error: error.message || 'Internal server error',
    requestId,
  });
};

// ============================================================================
// TEXT-TO-SPEECH ROUTES
// ============================================================================

/**
 * POST /voice/tts
 * Generate speech from text
 */
router.post('/tts', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const body = TTSRequestSchema.parse(req.body);

    const result = await voiceIntelligenceService.textToSpeech({
      tenantId,
      ...body,
    });

    if (result.success && result.data) {
      res.set('Content-Type', 'audio/mpeg');
      res.set('X-Character-Count', result.data.characterCount.toString());
      res.set('X-Credits-Used', result.data.creditsUsed.toString());
      res.send(result.data.audioData);
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// SPEECH-TO-TEXT ROUTES
// ============================================================================

/**
 * POST /voice/stt
 * Transcribe audio to text
 */
router.post('/stt', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);

    // Audio data should be in request body as base64 or buffer
    const audioData = req.body.audio
      ? Buffer.from(req.body.audio, 'base64')
      : req.body;

    const result = await voiceIntelligenceService.speechToText({
      tenantId,
      audioData,
      audioFormat: req.body.audioFormat || 'mp3_44100_128',
      language: req.body.language,
      enableWordTimestamps: req.body.enableWordTimestamps,
    });

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// PRONUNCIATION ASSESSMENT ROUTES
// ============================================================================

/**
 * POST /voice/pronunciation/assess
 * Assess pronunciation quality
 */
router.post('/pronunciation/assess', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const body = PronunciationAssessmentSchema.parse(req.body);

    const audioData = req.body.audio
      ? Buffer.from(req.body.audio, 'base64')
      : Buffer.alloc(0);

    const result = await voiceIntelligenceService.assessPronunciation({
      tenantId,
      learnerId: body.learnerId,
      audioData,
      audioFormat: req.body.audioFormat || 'mp3_44100_128',
      expectedText: body.expectedText,
      language: body.language,
      assessmentType: body.assessmentType,
      strictness: body.strictness,
    });

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// VOICE LIBRARY ROUTES
// ============================================================================

/**
 * GET /voice/voices
 * Get available voices
 */
router.get('/voices', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);

    const result = await voiceIntelligenceService.getVoiceLibrary(tenantId, {
      language: req.query.language as string,
      gender: req.query.gender as string,
      suitableFor: req.query.suitableFor as string,
    });

    if (result.success) {
      res.json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// CONVERSATION AGENT ROUTES
// ============================================================================

/**
 * POST /voice/agents
 * Create a conversation agent
 */
router.post('/agents', authMiddleware, requireRoles('platform_admin', 'content_creator'), async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const body = CreateAgentSchema.parse(req.body);

    const result = await voiceIntelligenceService.createConversationAgent(tenantId, {
      name: body.name,
      description: body.description,
      voiceId: body.voiceId,
      primaryLanguage: body.primaryLanguage,
      supportedLanguages: body.supportedLanguages,
      systemPrompt: body.systemPrompt,
      firstMessage: body.firstMessage,
      persona: body.persona,
      status: 'draft',
    });

    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * POST /voice/sessions
 * Start a conversation session
 */
router.post('/sessions', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id || '';
    const body = StartSessionSchema.parse(req.body);

    const result = await voiceIntelligenceService.startConversationSession(
      tenantId,
      body.agentId,
      userId,
      { scenarioId: body.scenarioId, learnerId: body.learnerId }
    );

    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

/**
 * DELETE /voice/sessions/:sessionId
 * End a conversation session
 */
router.delete('/sessions/:sessionId', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const userId = req.user?.id || '';

    const result = await voiceIntelligenceService.endConversationSession(
      tenantId,
      req.params.sessionId,
      userId
    );

    if (result.success) {
      res.json({ success: true, message: 'Session ended' });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// VOICE CLONING ROUTES
// ============================================================================

/**
 * POST /voice/clones
 * Create a voice clone
 */
router.post('/clones', authMiddleware, requireRoles('platform_admin', 'tutor', 'content_creator'), async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const body = VoiceCloneSchema.parse(req.body);

    const result = await voiceIntelligenceService.createVoiceClone({
      tenantId,
      ...body,
    });

    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// MULTI-SPEAKER DIALOGUE ROUTES
// ============================================================================

/**
 * POST /voice/dialogues
 * Generate a multi-speaker dialogue
 */
router.post('/dialogues', authMiddleware, async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const tenantId = getTenantId(req);
    const body = DialogueScriptSchema.parse(req.body);

    const result = await voiceIntelligenceService.generateDialogue(tenantId, body);

    if (result.success) {
      res.status(201).json({ success: true, data: result.data });
    } else {
      res.status(400).json({
        success: false,
        error: result.error?.message,
        requestId,
      });
    }
  } catch (error) {
    handleError(res, error, requestId);
  }
});

// ============================================================================
// WEBSOCKET STATS ROUTE
// ============================================================================

/**
 * GET /voice/ws/stats
 * Get WebSocket server statistics
 */
router.get('/ws/stats', authMiddleware, requireRoles('platform_admin'), async (req: Request, res: Response) => {
  const requestId = (req as any).id || 'unknown';
  try {
    const stats = voiceWebSocketServer.getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    handleError(res, error, requestId);
  }
});

export default router;
