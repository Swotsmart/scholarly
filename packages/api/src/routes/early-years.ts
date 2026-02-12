/**
 * Early Years Routes (Little Explorers)
 *
 * API routes for ages 3-7 education module:
 * - Family management
 * - Child enrollment and management
 * - Picture password authentication
 * - Learning sessions with SSP phonics and CPA numeracy
 * - Progress tracking with gamification
 */

import { Router } from 'express';
import { z } from 'zod';
import { earlyYearsCoreService } from '../services/early-years-core.service';
import { ApiError } from '../middleware/error-handler';

// =============================================================================
// PHONICS TTS (ElevenLabs)
// =============================================================================

const PHONICS_VOICES: Record<string, { voiceId: string; stability: number; similarityBoost: number; style: number; useSpeakerBoost: boolean }> = {
  pip:    { voiceId: 'cgSgspJ2msm6clMCkdW9', stability: 0.6, similarityBoost: 0.7, style: 0.5, useSpeakerBoost: true },   // Jessica - Playful, Bright, Warm
  sarah:  { voiceId: 'EXAVITQu4vr4xnSDxMaL', stability: 0.7, similarityBoost: 0.8, style: 0.4, useSpeakerBoost: true },   // Sarah - Mature, Reassuring, Confident
  alex:   { voiceId: 'TX3LPaxmHKxFdv7VOQHJ', stability: 0.55, similarityBoost: 0.75, style: 0.6, useSpeakerBoost: true },  // Liam - Energetic, Social Media Creator
  willow: { voiceId: 'Xb7hH8MSUJpSbSDYk0k2', stability: 0.75, similarityBoost: 0.85, style: 0.3, useSpeakerBoost: false }, // Alice - Clear, Engaging Educator
};

const phonicsTtsSchema = z.object({
  text: z.string().min(1).max(500),
  voicePersona: z.enum(['pip', 'sarah', 'alex', 'willow']).default('pip'),
});

export const earlyYearsRouter: Router = Router();

/** Public TTS router — mounted without auth for frontend phonics audio */
export const earlyYearsTtsRouter: Router = Router();

earlyYearsTtsRouter.post('/tts', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'TTS service unavailable' });
  }

  const data = phonicsTtsSchema.parse(req.body);
  const voice = PHONICS_VOICES[data.voicePersona];

  try {
    const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js');
    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(voice.voiceId, {
      text: data.text,
      modelId: 'eleven_turbo_v2_5',
      voiceSettings: {
        stability: voice.stability,
        similarityBoost: voice.similarityBoost,
        style: voice.style,
        useSpeakerBoost: voice.useSpeakerBoost,
      },
    });

    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(audioBuffer);
  } catch (error) {
    console.error('Phonics TTS failed:', error);
    res.status(503).json({ error: 'TTS generation failed' });
  }
});

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const createFamilySchema = z.object({
  familyName: z.string().min(1).max(100).optional(),
  primaryLanguage: z.string().optional().default('en'),
  homeLanguages: z.array(z.string()).optional().default([]),
  timezone: z.string().optional().default('Australia/Sydney'),
  dataProcessingConsent: z.boolean(),
});

const enrollChildSchema = z.object({
  firstName: z.string().min(1).max(50),
  preferredName: z.string().max(50).optional(),
  dateOfBirth: z.string().transform((val) => new Date(val)),
  avatarId: z.string().optional(),
});

const setupPicturePasswordSchema = z.object({
  imageSequence: z.array(z.string()).min(3).max(6),
});

const verifyPicturePasswordSchema = z.object({
  imageSequence: z.array(z.string()).min(3).max(6),
});

const startSessionSchema = z.object({
  world: z.enum(['phonics_forest', 'number_land', 'story_garden', 'creative_cove']),
  mentor: z.enum(['ollie_owl', 'penny_penguin', 'leo_lion', 'bella_butterfly']),
  sessionType: z.enum(['learning', 'practice', 'assessment', 'free_play']).optional().default('learning'),
});

const recordActivitySchema = z.object({
  activityType: z.string().min(1),
  targetContent: z.array(z.string()).optional().default([]),
  difficulty: z.number().int().min(1).max(5).optional().default(1),
  score: z.number().min(0).max(1),
  durationSeconds: z.number().int().min(0),
  attempts: z.number().int().min(1).optional().default(1),
  hintsUsed: z.number().int().min(0).optional().default(0),
  errorsCommitted: z.number().int().min(0).optional().default(0),
  responseData: z.record(z.unknown()).optional().default({}),
});

const endSessionSchema = z.object({
  completedNaturally: z.boolean().optional().default(true),
  childMoodRating: z.number().int().min(1).max(5).optional(),
  parentNotes: z.string().max(1000).optional(),
});

// =============================================================================
// FAMILY ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/families
 * Create a new family account
 */
earlyYearsRouter.post('/families', async (req, res) => {
  const { tenantId, user } = req;
  const data = createFamilySchema.parse(req.body);

  const result = await earlyYearsCoreService.createFamily(tenantId!, user!.id, {
    ...data,
    dataProcessingConsent: data.dataProcessingConsent,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ family: result.data });
});

/**
 * GET /api/v1/early-years/families/me
 * Get the current user's family
 */
earlyYearsRouter.get('/families/me', async (req, res) => {
  const { tenantId, user } = req;

  // First get the family ID for this user
  const familyResult = await earlyYearsCoreService.getFamilyByUser(tenantId!, user!.id);
  if (!familyResult.success) {
    throw new ApiError(404, familyResult.error!.message);
  }

  // Then get the full family details
  const result = await earlyYearsCoreService.getFamily(tenantId!, familyResult.data!.familyId);

  if (!result.success) {
    throw new ApiError(404, result.error!.message);
  }

  res.json(result.data);
});

/**
 * GET /api/v1/early-years/families/:familyId
 * Get a specific family's details
 */
earlyYearsRouter.get('/families/:familyId', async (req, res) => {
  const { tenantId } = req;
  const { familyId } = req.params;

  const result = await earlyYearsCoreService.getFamily(tenantId!, familyId);

  if (!result.success) {
    throw new ApiError(404, result.error.message);
  }

  res.json({ family: result.data });
});

// =============================================================================
// CHILD ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/families/:familyId/children
 * Enroll a new child in a family
 */
earlyYearsRouter.post('/families/:familyId/children', async (req, res) => {
  const { tenantId } = req;
  const { familyId } = req.params;
  const data = enrollChildSchema.parse(req.body);

  const result = await earlyYearsCoreService.enrollChild(tenantId!, familyId, {
    firstName: data.firstName,
    dateOfBirth: data.dateOfBirth,
    preferredName: data.preferredName,
    avatarId: data.avatarId,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ child: result.data });
});

/**
 * GET /api/v1/early-years/children/:childId
 * Get a child's dashboard (progress, stats, recommendations)
 */
earlyYearsRouter.get('/children/:childId', async (req, res) => {
  const { tenantId } = req;
  const { childId } = req.params;

  const result = await earlyYearsCoreService.getChildDashboard(tenantId!, childId);

  if (!result.success) {
    throw new ApiError(404, result.error.message);
  }

  res.json({ dashboard: result.data });
});

// =============================================================================
// PICTURE PASSWORD ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/children/:childId/picture-password
 * Set up picture password for a child
 */
earlyYearsRouter.post('/children/:childId/picture-password', async (req, res) => {
  const { tenantId } = req;
  const { childId } = req.params;
  const data = setupPicturePasswordSchema.parse(req.body);

  const result = await earlyYearsCoreService.setupPicturePassword(tenantId!, childId, data.imageSequence);

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json(result.data);
});

/**
 * POST /api/v1/early-years/children/:childId/picture-password/verify
 * Verify a child's picture password
 */
earlyYearsRouter.post('/children/:childId/picture-password/verify', async (req, res) => {
  const { tenantId } = req;
  const { childId } = req.params;
  const data = verifyPicturePasswordSchema.parse(req.body);

  const result = await earlyYearsCoreService.verifyPicturePassword(tenantId!, childId, data.imageSequence);

  if (!result.success) {
    throw new ApiError(401, result.error.message);
  }

  res.json(result.data);
});

// =============================================================================
// SESSION ROUTES
// =============================================================================

/**
 * POST /api/v1/early-years/children/:childId/sessions
 * Start a new learning session for a child
 */
earlyYearsRouter.post('/children/:childId/sessions', async (req, res) => {
  const { tenantId } = req;
  const { childId } = req.params;
  const data = startSessionSchema.parse(req.body);

  const result = await earlyYearsCoreService.startSession(tenantId!, childId, data);

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ session: result.data });
});

/**
 * POST /api/v1/early-years/sessions/:sessionId/activities
 * Record an activity within a session
 */
earlyYearsRouter.post('/sessions/:sessionId/activities', async (req, res) => {
  const { tenantId } = req;
  const { sessionId } = req.params;
  const data = recordActivitySchema.parse(req.body);

  const result = await earlyYearsCoreService.recordActivity(tenantId!, sessionId, {
    activityType: data.activityType,
    targetContent: data.targetContent || [],
    difficulty: data.difficulty,
    score: data.score,
    durationSeconds: data.durationSeconds,
    attempts: data.attempts,
    hintsUsed: data.hintsUsed,
    errorsCommitted: data.errorsCommitted,
    responseData: data.responseData,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ activity: result.data });
});

/**
 * POST /api/v1/early-years/sessions/:sessionId/end
 * End a learning session
 */
earlyYearsRouter.post('/sessions/:sessionId/end', async (req, res) => {
  const { tenantId } = req;
  const { sessionId } = req.params;
  const data = endSessionSchema.parse(req.body);

  const result = await earlyYearsCoreService.endSession(tenantId!, sessionId, data);

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ session: result.data });
});

// =============================================================================
// PROGRESS ROUTES
// =============================================================================

/**
 * GET /api/v1/early-years/children/:childId/phonics
 * Get detailed phonics progress for a child
 */
earlyYearsRouter.get('/children/:childId/phonics', async (req, res) => {
  const { tenantId } = req;
  const { childId } = req.params;

  const result = await earlyYearsCoreService.getPhonicsProgress(tenantId!, childId);

  if (!result.success) {
    throw new ApiError(404, result.error.message);
  }

  res.json({ phonicsProgress: result.data });
});

/**
 * POST /api/v1/early-years/children/:childId/phonics/advance
 * Advance a child to the next phonics phase (SSP)
 */
earlyYearsRouter.post('/children/:childId/phonics/advance', async (req, res) => {
  const { tenantId } = req;
  const { childId } = req.params;

  const result = await earlyYearsCoreService.advancePhonicsPhase(tenantId!, childId);

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ phonicsProgress: result.data });
});

/**
 * GET /api/v1/early-years/phonics-phases
 * Get all phonics phases (SSP curriculum)
 */
earlyYearsRouter.get('/phonics-phases', async (_req, res) => {
  // Return the 6 phases of Systematic Synthetic Phonics
  const phases = [
    {
      phase: 1,
      name: 'Environmental Sounds & Phonological Awareness',
      description: 'General sound discrimination, rhyme, rhythm, and alliteration',
      graphemes: [],
    },
    {
      phase: 2,
      name: 'Initial Letter Sounds',
      description: 'Learn 19 letters with their most common sounds',
      graphemes: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k', 'ck', 'e', 'u', 'r', 'h', 'b', 'f'],
    },
    {
      phase: 3,
      name: 'Remaining Letters & Digraphs',
      description: 'Complete alphabet plus digraphs and trigraphs',
      graphemes: ['j', 'v', 'w', 'x', 'y', 'z', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee', 'igh', 'oa', 'oo', 'ar', 'or', 'ur', 'ow', 'oi', 'ear', 'air', 'ure', 'er'],
    },
    {
      phase: 4,
      name: 'Consonant Blends',
      description: 'Adjacent consonants with no new graphemes',
      graphemes: ['CVCC', 'CCVC', 'CCVCC', 'CCCVC'],
    },
    {
      phase: 5,
      name: 'Alternative Spellings',
      description: 'New graphemes and alternative pronunciations',
      graphemes: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au', 'a-e', 'e-e', 'i-e', 'o-e', 'u-e'],
    },
    {
      phase: 6,
      name: 'Spelling Patterns & Fluency',
      description: 'Prefixes, suffixes, and spelling conventions',
      graphemes: ['-ed', '-ing', '-er', '-est', '-ful', '-ly', '-ment', '-ness', 'un-', 'dis-', 're-', 'pre-'],
    },
  ];

  res.json({ phases });
});

// =============================================================================
// TEXT-TO-SPEECH (ElevenLabs)
// =============================================================================

/**
 * POST /api/v1/early-years/tts
 * Generate child-friendly speech for phonics activities.
 * Returns audio/mpeg binary. Defaults to "Playful Pip" voice.
 * Returns 503 if ELEVENLABS_API_KEY is not configured (frontend falls back to browser TTS).
 */
earlyYearsRouter.post('/tts', async (req, res) => {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'TTS service unavailable' });
  }

  const data = phonicsTtsSchema.parse(req.body);
  const voice = PHONICS_VOICES[data.voicePersona];

  try {
    // Dynamic import to avoid issues if elevenlabs package isn't installed
    const { ElevenLabsClient } = await import('@elevenlabs/elevenlabs-js');
    const client = new ElevenLabsClient({ apiKey });

    const audioStream = await client.textToSpeech.convert(voice.voiceId, {
      text: data.text,
      modelId: 'eleven_turbo_v2_5', // Lowest latency for instant feedback
      voiceSettings: {
        stability: voice.stability,
        similarityBoost: voice.similarityBoost,
        style: voice.style,
        useSpeakerBoost: voice.useSpeakerBoost,
      },
    });

    // Collect audio chunks
    const chunks: Uint8Array[] = [];
    for await (const chunk of audioStream) {
      chunks.push(chunk);
    }
    const audioBuffer = Buffer.concat(chunks);

    res.set('Content-Type', 'audio/mpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(audioBuffer);
  } catch (error) {
    console.error('Phonics TTS failed:', error);
    res.status(503).json({ error: 'TTS generation failed' });
  }
});
