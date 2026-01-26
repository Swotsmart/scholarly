/**
 * LinguaFlow Routes
 *
 * API routes for the language learning module:
 * - Profile management with CEFR levels
 * - Vocabulary learning with SM-2 spaced repetition
 * - AI conversation practice
 * - Heritage speaker pathways
 * - IB curriculum alignment (PYP, MYP, DP)
 * - Offline learning support
 */

import { Router } from 'express';
import { z } from 'zod';
import { linguaFlowService } from '../services/linguaflow.service';
import { ApiError } from '../middleware/error-handler';

export const linguaFlowRouter: Router = Router();

// =============================================================================
// VALIDATION SCHEMAS
// =============================================================================

const targetLanguages = ['fr', 'zh', 'id', 'es', 'it', 'de'] as const;
const cefrLevels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
const cefrSkills = ['reading', 'writing', 'listening', 'speaking'] as const;
const ibPrograms = ['PYP', 'MYP', 'DP', 'none'] as const;

const createProfileSchema = z.object({
  targetLanguage: z.enum(targetLanguages),
  nativeLanguage: z.string().default('en'),
  additionalLanguages: z.array(z.string()).optional(),
  isHeritageSpeaker: z.boolean().optional().default(false),
  curriculumFramework: z.string().optional(),
  yearLevel: z.string().optional(),
  ibProgramme: z.enum(ibPrograms).optional(),
});

const updateCefrLevelSchema = z.object({
  skill: z.enum(cefrSkills),
  level: z.enum(cefrLevels),
});

const createHeritagePathwaySchema = z.object({
  oralProficiency: z.enum(cefrLevels),
  literacyLevel: z.enum(cefrLevels),
  academicRegisterLevel: z.enum(cefrLevels),
  dialectFeatures: z.array(z.string()).optional(),
});

const addVocabularySchema = z.object({
  wordId: z.string().min(1),
  word: z.string().min(1).max(200),
  translation: z.string().min(1).max(200),
  cefrLevel: z.enum(cefrLevels).optional(),
  partOfSpeech: z.string().optional(),
  exampleSentence: z.string().max(500).optional(),
  audioUrl: z.string().url().optional(),
});

const reviewVocabularySchema = z.object({
  vocabularyId: z.string().min(1),
  quality: z.number().int().min(0).max(5), // SM-2 quality rating
});

const reviewSessionSchema = z.object({
  reviews: z.array(z.object({
    vocabularyId: z.string().min(1),
    quality: z.number().int().min(0).max(5),
  })).min(1),
});

const startConversationSchema = z.object({
  mode: z.string().min(1).max(100),
  aiRole: z.string().optional(),
  aiPersona: z.string().optional(),
  scenarioId: z.string().optional(),
  scenarioTitle: z.string().max(200).optional(),
  targetVocabulary: z.array(z.string()).optional(),
  targetStructures: z.array(z.string()).optional(),
  isHeritageVariant: z.boolean().optional(),
});

const addConversationMessageSchema = z.object({
  content: z.string().min(1).max(2000),
  role: z.enum(['user', 'assistant']),
});

const endConversationSchema = z.object({
  selfFluencyRating: z.number().int().min(1).max(5).optional(),
  selfConfidenceRating: z.number().int().min(1).max(5).optional(),
});

const alignIbCriteriaSchema = z.object({
  criterion: z.enum(['A', 'B', 'C', 'D']),
  score: z.number().int().min(0).max(8),
  assessmentId: z.string().optional(),
  notes: z.string().max(500).optional(),
});

const createOfflinePackageSchema = z.object({
  packageType: z.enum(['vocabulary', 'conversation', 'mixed']),
  itemCount: z.number().int().min(10).max(200).optional().default(50),
  includePronunciation: z.boolean().optional().default(true),
});

const syncOfflineProgressSchema = z.object({
  packageId: z.string().min(1),
  completedItems: z.array(z.object({
    itemId: z.string(),
    quality: z.number().int().min(0).max(5),
    completedAt: z.string().transform((val) => new Date(val)),
  })),
  totalTimeSpent: z.number().int().min(0),
});

// =============================================================================
// PROFILE ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles
 * Create a new language learning profile
 */
linguaFlowRouter.post('/profiles', async (req, res) => {
  const { tenantId, user } = req;
  const data = createProfileSchema.parse(req.body);

  const result = await linguaFlowService.createProfile(tenantId!, user!.id, {
    targetLanguage: data.targetLanguage,
    nativeLanguage: data.nativeLanguage || 'en',
    additionalLanguages: data.additionalLanguages,
    isHeritageSpeaker: data.isHeritageSpeaker,
    curriculumFramework: data.curriculumFramework,
    yearLevel: data.yearLevel,
    ibProgramme: data.ibProgramme,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ profile: result.data });
});

/**
 * GET /api/v1/linguaflow/profiles/:profileId
 * Get profile dashboard with comprehensive stats
 */
linguaFlowRouter.get('/profiles/:profileId', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;

  const result = await linguaFlowService.getProfileDashboard(tenantId!, profileId);

  if (!result.success) {
    throw new ApiError(404, result.error.message);
  }

  res.json({ dashboard: result.data });
});

/**
 * GET /api/v1/linguaflow/profiles
 * Get all profiles for current user
 */
linguaFlowRouter.get('/profiles', async (req, res) => {
  const { tenantId, user } = req;

  const result = await linguaFlowService.getProfilesByUser(tenantId!, user!.id);

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ profiles: result.data });
});

// =============================================================================
// HERITAGE SPEAKER ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/heritage-pathway
 * Create heritage speaker pathway assessment
 */
linguaFlowRouter.post('/profiles/:profileId/heritage-pathway', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = createHeritagePathwaySchema.parse(req.body);

  const result = await linguaFlowService.createHeritagePathway(tenantId!, profileId, {
    oralProficiency: data.oralProficiency,
    literacyLevel: data.literacyLevel,
    academicRegisterLevel: data.academicRegisterLevel,
    dialectFeatures: data.dialectFeatures,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ pathway: result.data });
});

// =============================================================================
// VOCABULARY ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/vocabulary
 * Add a new vocabulary word
 */
linguaFlowRouter.post('/profiles/:profileId/vocabulary', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = addVocabularySchema.parse(req.body);

  const result = await linguaFlowService.addVocabulary(tenantId!, profileId, {
    wordId: data.wordId,
    word: data.word,
    translation: data.translation,
    cefrLevel: data.cefrLevel,
    partOfSpeech: data.partOfSpeech,
    exampleSentence: data.exampleSentence,
    audioUrl: data.audioUrl,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ vocabulary: result.data });
});

/**
 * GET /api/v1/linguaflow/profiles/:profileId/vocabulary/review
 * Get vocabulary items due for review (SM-2 algorithm)
 */
linguaFlowRouter.get('/profiles/:profileId/vocabulary/review', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const { limit = '20' } = req.query;

  const result = await linguaFlowService.getVocabularyForReview(
    tenantId!,
    profileId,
    parseInt(limit as string)
  );

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ vocabulary: result.data, count: result.data.length });
});

/**
 * POST /api/v1/linguaflow/profiles/:profileId/vocabulary/review
 * Submit a single vocabulary review (SM-2 algorithm)
 */
linguaFlowRouter.post('/profiles/:profileId/vocabulary/review', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = reviewVocabularySchema.parse(req.body);

  const result = await linguaFlowService.reviewVocabulary(
    tenantId!,
    profileId,
    data.vocabularyId,
    data.quality
  );

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ progress: result.data });
});

/**
 * POST /api/v1/linguaflow/profiles/:profileId/vocabulary/review-session
 * Complete a batch vocabulary review session
 */
linguaFlowRouter.post('/profiles/:profileId/vocabulary/review-session', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = reviewSessionSchema.parse(req.body);

  const result = await linguaFlowService.completeReviewSession(
    tenantId!,
    profileId,
    data.reviews.map(r => ({ vocabularyId: r.vocabularyId, quality: r.quality }))
  );

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ session: result.data });
});

// =============================================================================
// CONVERSATION ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/conversations
 * Start a new AI conversation practice session
 */
linguaFlowRouter.post('/profiles/:profileId/conversations', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = startConversationSchema.parse(req.body);

  const result = await linguaFlowService.startConversation(tenantId!, profileId, {
    mode: data.mode,
    aiRole: data.aiRole,
    aiPersona: data.aiPersona,
    scenarioId: data.scenarioId,
    scenarioTitle: data.scenarioTitle,
    targetVocabulary: data.targetVocabulary,
    targetStructures: data.targetStructures,
    isHeritageVariant: data.isHeritageVariant,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ conversation: result.data });
});

/**
 * POST /api/v1/linguaflow/conversations/:conversationId/messages
 * Add a message to an ongoing conversation
 */
linguaFlowRouter.post('/conversations/:conversationId/messages', async (req, res) => {
  const { conversationId } = req.params;
  const data = addConversationMessageSchema.parse(req.body);

  const result = await linguaFlowService.addConversationMessage(conversationId, {
    role: data.role,
    content: data.content,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ message: result.data });
});

/**
 * POST /api/v1/linguaflow/conversations/:conversationId/end
 * End a conversation and get summary
 */
linguaFlowRouter.post('/conversations/:conversationId/end', async (req, res) => {
  const { tenantId } = req;
  const { conversationId } = req.params;
  const data = endConversationSchema.parse(req.body);

  const result = await linguaFlowService.endConversation(tenantId!, conversationId, data);

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ conversation: result.data });
});

// =============================================================================
// IB CURRICULUM ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/ib-criteria
 * Record an IB criteria score
 */
linguaFlowRouter.post('/profiles/:profileId/ib-criteria', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = alignIbCriteriaSchema.parse(req.body);

  const result = await linguaFlowService.updateIbCriteria(
    tenantId!,
    profileId,
    data.criterion,
    data.score,
    data.notes
  );

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json(result.data);
});

/**
 * GET /api/v1/linguaflow/myp-cefr/:phase
 * Get expected CEFR levels for an MYP phase
 */
linguaFlowRouter.get('/myp-cefr/:phase', async (req, res) => {
  const phase = parseInt(req.params.phase, 10);

  if (isNaN(phase) || phase < 1 || phase > 6) {
    throw new ApiError(400, 'Phase must be between 1 and 6');
  }

  // MYP Phase to CEFR mapping
  const mypCefrMapping: Record<number, { minimum: string; target: string; stretch: string }> = {
    1: { minimum: 'A1', target: 'A2', stretch: 'B1' },
    2: { minimum: 'A2', target: 'B1', stretch: 'B1' },
    3: { minimum: 'A2', target: 'B1', stretch: 'B2' },
    4: { minimum: 'B1', target: 'B1', stretch: 'B2' },
    5: { minimum: 'B1', target: 'B2', stretch: 'C1' },
    6: { minimum: 'B2', target: 'B2', stretch: 'C1' },
  };

  res.json({
    phase,
    expectedCefrLevels: mypCefrMapping[phase],
  });
});

/**
 * GET /api/v1/linguaflow/languages
 * Get supported target languages
 */
linguaFlowRouter.get('/languages', async (_req, res) => {
  const languages = [
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'zh', name: 'Mandarin Chinese', nativeName: '普通话' },
    { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
  ];

  res.json({ languages });
});

// =============================================================================
// OFFLINE SUPPORT ROUTES
// =============================================================================

/**
 * POST /api/v1/linguaflow/profiles/:profileId/offline-packages
 * Create an offline learning package
 */
linguaFlowRouter.post('/profiles/:profileId/offline-packages', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = createOfflinePackageSchema.parse(req.body);

  const result = await linguaFlowService.createOfflinePackage(tenantId!, profileId, {
    packageType: data.packageType,
    vocabularyCount: data.itemCount,
  });

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.status(201).json({ package: result.data });
});

/**
 * POST /api/v1/linguaflow/profiles/:profileId/sync
 * Sync offline progress back to server
 */
linguaFlowRouter.post('/profiles/:profileId/sync', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;
  const data = syncOfflineProgressSchema.parse(req.body);

  const result = await linguaFlowService.syncOfflineProgress(
    tenantId!,
    profileId,
    data.packageId,
    { completedItems: data.completedItems, totalTimeSpent: data.totalTimeSpent },
    data.completedItems.length
  );

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ sync: result.data });
});

// =============================================================================
// ACHIEVEMENT ROUTES
// =============================================================================

/**
 * GET /api/v1/linguaflow/profiles/:profileId/achievements
 * Get all achievements for a profile
 */
linguaFlowRouter.get('/profiles/:profileId/achievements', async (req, res) => {
  const { tenantId } = req;
  const { profileId } = req.params;

  const result = await linguaFlowService.getAchievements(tenantId!, profileId);

  if (!result.success) {
    throw new ApiError(400, result.error.message);
  }

  res.json({ achievements: result.data });
});
