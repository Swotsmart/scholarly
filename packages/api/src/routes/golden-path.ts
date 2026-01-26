/**
 * Golden Path Routes
 *
 * API endpoints for the Golden Path learning system:
 * - Adaptation Engine (BKT mastery, ZPD, fatigue, decision gates)
 * - Curiosity Engine (interest clusters, curiosity triggers, signals)
 * - Multi-Objective Optimizer (path optimization, simulation, comparison)
 */

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { log } from '../lib/logger';
import { isFailure } from '../services/base.service';
import { getAdaptationEngineService } from '../services/adaptation-engine.service';
import { getCuriosityEngineService } from '../services/curiosity-engine.service';
import { getMultiObjectiveOptimizerService } from '../services/multi-objective-optimizer.service';

export const goldenPathRouter: Router = Router();

// All routes require authentication
goldenPathRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

// -- Adaptation Engine Schemas --

const adaptationSignalsSchema = z.object({
  signals: z.array(z.object({
    type: z.string(),
    value: z.number(),
    timestamp: z.string().optional(),
    context: z.object({
      competencyId: z.string().optional(),
      domain: z.string().optional(),
      contentId: z.string().optional(),
      sessionId: z.string().optional(),
      difficulty: z.number().optional(),
    }).optional(),
  })),
});

const candidateStepSchema = z.object({
  id: z.string(),
  competencyId: z.string(),
  domain: z.string(),
  contentId: z.string(),
  difficulty: z.number(),
  estimatedDurationMinutes: z.number(),
  prerequisites: z.array(z.string()),
  tags: z.array(z.string()),
});

const decisionGateSchema = z.object({
  currentCompetencyId: z.string().optional(),
  currentDomain: z.string().optional(),
  sessionId: z.string().optional(),
  candidateSteps: z.array(candidateStepSchema),
});

const scoreStepsSchema = z.object({
  candidates: z.array(candidateStepSchema),
});

const createRuleSchema = z.object({
  name: z.string(),
  description: z.string(),
  scope: z.string(),
  scopeId: z.string().optional(),
  priority: z.number(),
  conditions: z.record(z.unknown()),
  conditionLogic: z.string(),
  action: z.record(z.unknown()),
  isActive: z.boolean().optional(),
});

const updateRuleSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  scope: z.string().optional(),
  scopeId: z.string().optional(),
  priority: z.number().optional(),
  conditions: z.record(z.unknown()).optional(),
  conditionLogic: z.string().optional(),
  action: z.record(z.unknown()).optional(),
  isActive: z.boolean().optional(),
});

// -- Curiosity Engine Schemas --

const curiositySignalSchema = z.object({
  signalType: z.string(),
  topicId: z.string(),
  topicName: z.string(),
  domain: z.string(),
  strength: z.number().optional(),
  context: z.object({
    sessionId: z.string(),
    contentId: z.string().optional(),
    dwellTimeMs: z.number().optional(),
    referringTopicId: z.string().optional(),
    searchQuery: z.string().optional(),
  }),
});

const curiosityTriggersSchema = z.object({
  domain: z.string().optional(),
  limit: z.number().optional(),
});

// -- Multi-Objective Optimizer Schemas --

const learningPathStepSchema = z.object({
  order: z.number(),
  contentId: z.string(),
  competencyId: z.string(),
  domain: z.string(),
  difficulty: z.number(),
  estimatedDurationMinutes: z.number(),
});

const learningPathSchema = z.object({
  steps: z.array(learningPathStepSchema),
});

const constraintsSchema = z.object({
  mandatoryCurriculumIds: z.array(z.string()).optional(),
  maxDailyMinutes: z.number().optional(),
  prerequisiteOrdering: z.boolean().optional(),
  maxDifficultyJump: z.number().optional(),
  excludeCompetencyIds: z.array(z.string()).optional(),
  preferredDomains: z.array(z.string()).optional(),
});

const weightsSchema = z.object({
  mastery: z.number().optional(),
  engagement: z.number().optional(),
  efficiency: z.number().optional(),
  curiosity: z.number().optional(),
  well_being: z.number().optional(),
  breadth: z.number().optional(),
  depth: z.number().optional(),
});

const optimizePathSchema = z.object({
  candidateContentIds: z.array(z.string()).optional(),
  constraints: constraintsSchema.optional(),
  customWeights: weightsSchema.optional(),
});

const simulatePathSchema = z.object({
  path: learningPathSchema,
});

const comparePathsSchema = z.object({
  pathA: learningPathSchema,
  pathB: learningPathSchema,
});

// ============================================================================
// Adaptation Engine Routes
// ============================================================================

/**
 * GET /adaptation/profile/:learnerId
 * Get adaptation profile for a learner
 */
goldenPathRouter.get('/adaptation/profile/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  log.info('Getting adaptation profile', { tenantId, learnerId });

  const service = getAdaptationEngineService();
  const result = await service.getProfile(tenantId, learnerId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /adaptation/profile/:learnerId/signals
 * Update adaptation profile with new signals
 */
goldenPathRouter.post('/adaptation/profile/:learnerId/signals', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = adaptationSignalsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Updating adaptation profile with signals', { tenantId, learnerId, signalCount: parsed.data.signals.length });

  const service = getAdaptationEngineService();
  const result = await service.updateWithSignals(tenantId, learnerId, parsed.data.signals as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /adaptation/mastery/:learnerId/:competencyId
 * Get BKT mastery estimate for a learner and competency
 */
goldenPathRouter.get('/adaptation/mastery/:learnerId/:competencyId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId, competencyId } = req.params;

  log.info('Getting BKT mastery estimate', { tenantId, learnerId, competencyId });

  const service = getAdaptationEngineService();
  const result = await service.getMasteryEstimate(tenantId, learnerId, competencyId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /adaptation/zpd/:learnerId/:domain
 * Get Zone of Proximal Development range
 */
goldenPathRouter.get('/adaptation/zpd/:learnerId/:domain', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId, domain } = req.params;

  log.info('Getting ZPD range', { tenantId, learnerId, domain });

  const service = getAdaptationEngineService();
  const result = await service.calculateZPD(tenantId, learnerId, domain);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /adaptation/difficulty/:learnerId
 * Get optimal difficulty level for a learner
 */
goldenPathRouter.get('/adaptation/difficulty/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  log.info('Getting optimal difficulty', { tenantId, learnerId });

  const service = getAdaptationEngineService();
  const result = await service.getOptimalDifficulty(tenantId, learnerId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /adaptation/fatigue/:learnerId/:sessionId
 * Get fatigue assessment for a learner session
 */
goldenPathRouter.get('/adaptation/fatigue/:learnerId/:sessionId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId, sessionId } = req.params;

  log.info('Getting fatigue assessment', { tenantId, learnerId, sessionId });

  const service = getAdaptationEngineService();
  const result = await service.assessFatigue(tenantId, learnerId, sessionId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /adaptation/gate/:learnerId
 * Evaluate a decision gate for next learning step
 */
goldenPathRouter.post('/adaptation/gate/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = decisionGateSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Evaluating decision gate', { tenantId, learnerId, candidateCount: parsed.data.candidateSteps.length });

  const service = getAdaptationEngineService();
  const result = await service.evaluateDecisionGate(tenantId, learnerId, parsed.data as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /adaptation/score-steps/:learnerId
 * Score candidate next steps for a learner
 */
goldenPathRouter.post('/adaptation/score-steps/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = scoreStepsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Scoring next steps', { tenantId, learnerId, candidateCount: parsed.data.candidates.length });

  const service = getAdaptationEngineService();
  const result = await service.scoreNextSteps(tenantId, learnerId, parsed.data.candidates as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /adaptation/rules
 * List adaptation rules
 */
goldenPathRouter.get('/adaptation/rules', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const scope = req.query.scope as string | undefined;
  const isActive = req.query.isActive !== undefined
    ? req.query.isActive === 'true'
    : undefined;

  log.info('Listing adaptation rules', { tenantId, scope, isActive });

  const service = getAdaptationEngineService();
  const result = await service.getRules(tenantId, { scope, isActive });

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /adaptation/rules
 * Create a new adaptation rule
 */
goldenPathRouter.post('/adaptation/rules', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const parsed = createRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Creating adaptation rule', { tenantId, ruleName: parsed.data.name });

  const service = getAdaptationEngineService();
  const result = await service.createRule(tenantId, parsed.data as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

/**
 * PUT /adaptation/rules/:ruleId
 * Update an existing adaptation rule
 */
goldenPathRouter.put('/adaptation/rules/:ruleId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { ruleId } = req.params;

  const parsed = updateRuleSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Updating adaptation rule', { tenantId, ruleId });

  const service = getAdaptationEngineService();
  const result = await service.updateRule(tenantId, ruleId, parsed.data as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /adaptation/history/:learnerId
 * Get adaptation event log for a learner
 */
goldenPathRouter.get('/adaptation/history/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const since = req.query.since ? new Date(req.query.since as string) : undefined;

  log.info('Getting adaptation history', { tenantId, learnerId, limit, since });

  const service = getAdaptationEngineService();
  const result = await service.getAdaptationHistory(tenantId, learnerId, { limit, since });

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

// ============================================================================
// Curiosity Engine Routes
// ============================================================================

/**
 * POST /curiosity/signal/:learnerId
 * Record a curiosity signal for a learner
 */
goldenPathRouter.post('/curiosity/signal/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = curiositySignalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Recording curiosity signal', { tenantId, learnerId, signalType: parsed.data.signalType });

  const service = getCuriosityEngineService();
  const result = await service.recordSignal(tenantId, learnerId, parsed.data as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

/**
 * GET /curiosity/profile/:learnerId
 * Get curiosity profile for a learner
 */
goldenPathRouter.get('/curiosity/profile/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  log.info('Getting curiosity profile', { tenantId, learnerId });

  const service = getCuriosityEngineService();
  const result = await service.getCuriosityProfile(tenantId, learnerId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /curiosity/clusters/:learnerId
 * Get interest clusters for a learner
 */
goldenPathRouter.get('/curiosity/clusters/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  log.info('Getting interest clusters', { tenantId, learnerId });

  const service = getCuriosityEngineService();
  const result = await service.getInterestClusters(tenantId, learnerId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /curiosity/triggers/:learnerId
 * Find curiosity triggers for a learner
 */
goldenPathRouter.post('/curiosity/triggers/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = curiosityTriggersSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Finding curiosity triggers', { tenantId, learnerId, domain: parsed.data.domain });

  const service = getCuriosityEngineService();
  const result = await service.findCuriosityTriggers(tenantId, learnerId, parsed.data as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /curiosity/score/:learnerId
 * Get curiosity score for a learner
 */
goldenPathRouter.get('/curiosity/score/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  log.info('Getting curiosity score', { tenantId, learnerId });

  const service = getCuriosityEngineService();
  const result = await service.getCuriosityScore(tenantId, learnerId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /curiosity/suggestions/:learnerId
 * Get content suggestions based on curiosity profile
 */
goldenPathRouter.get('/curiosity/suggestions/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const domain = req.query.domain as string | undefined;

  log.info('Getting curiosity-based content suggestions', { tenantId, learnerId, limit, domain });

  const service = getCuriosityEngineService();
  const result = await service.getContentSuggestions(tenantId, learnerId, { limit, domain });

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /curiosity/emerging/:learnerId
 * Get emerging interests for a learner
 */
goldenPathRouter.get('/curiosity/emerging/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  log.info('Getting emerging interests', { tenantId, learnerId });

  const service = getCuriosityEngineService();
  const result = await service.getEmergingInterests(tenantId, learnerId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

// ============================================================================
// Multi-Objective Optimization Routes
// ============================================================================

/**
 * POST /optimize/:learnerId
 * Optimize learning path for a learner
 */
goldenPathRouter.post('/optimize/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = optimizePathSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Optimizing learning path', { tenantId, learnerId });

  const service = getMultiObjectiveOptimizerService();
  const result = await service.optimizePath(tenantId, learnerId, parsed.data as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /optimize/weights/:learnerId
 * Get objective weights for a learner
 */
goldenPathRouter.get('/optimize/weights/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  log.info('Getting objective weights', { tenantId, learnerId });

  const service = getMultiObjectiveOptimizerService();
  const result = await service.getObjectiveWeights(tenantId, learnerId);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * PUT /optimize/weights/:learnerId
 * Set objective weights for a learner
 */
goldenPathRouter.put('/optimize/weights/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = weightsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Setting objective weights', { tenantId, learnerId });

  const service = getMultiObjectiveOptimizerService();
  const result = await service.setObjectiveWeights(tenantId, learnerId, parsed.data as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /optimize/simulate/:learnerId
 * Simulate a learning path for a learner
 */
goldenPathRouter.post('/optimize/simulate/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = simulatePathSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Simulating learning path', { tenantId, learnerId, stepCount: parsed.data.path.steps.length });

  const service = getMultiObjectiveOptimizerService();
  const result = await service.simulatePath(tenantId, learnerId, parsed.data.path as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /optimize/compare/:learnerId
 * Compare two learning paths for a learner
 */
goldenPathRouter.post('/optimize/compare/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const parsed = comparePathsSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Comparing learning paths', { tenantId, learnerId });

  const service = getMultiObjectiveOptimizerService();
  const result = await service.comparePaths(tenantId, learnerId, parsed.data.pathA as any, parsed.data.pathB as any);

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /optimize/history/:learnerId
 * Get optimization history for a learner
 */
goldenPathRouter.get('/optimize/history/:learnerId', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  log.info('Getting optimization history', { tenantId, learnerId, limit });

  const service = getMultiObjectiveOptimizerService();
  const result = await service.getOptimizationHistory(tenantId, learnerId, { limit });

  if (isFailure(result)) {
    const status = result.error.code.includes('NOT_FOUND') ? 404 : 400;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});
