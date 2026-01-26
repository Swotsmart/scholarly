/**
 * Interoperability Routes
 *
 * API endpoints for 1EdTech + Ed-Fi education data standards:
 * - LTI Advantage (OIDC, AGS, NRPS, Deep Linking)
 * - OneRoster (Users, Orgs, Classes, Enrollments, CSV Bulk)
 * - CASE Network (Competency Frameworks, Items, Associations)
 * - CLR / Open Badges (Achievement Definitions, Assertions, Verification)
 * - Ed-Fi (Connections, Sync, Conflict Resolution, Field Mappings)
 */

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { log } from '../lib/logger';

import { getLTIAdvantageService } from '../services/lti-advantage.service';
import { getOneRosterService } from '../services/oneroster.service';
import { getCASENetworkService } from '../services/case-network.service';
import { getCLROpenBadgesService } from '../services/clr-openbadges.service';
import { getEdFiIntegrationService } from '../services/edfi-integration.service';

import type { DeepLinkContentItem, AGSScore, CASEAssociationType, EdFiResourceType, EdFiSyncDirection } from '../services/one-edtech-types';
import { isFailure } from '../services/base.service';

export const interoperabilityRouter: Router = Router();

// All routes require authentication
interoperabilityRouter.use(authMiddleware);

// ============================================================================
// Helper: Error Response
// ============================================================================

function errorStatus(code: string): number {
  if (code.includes('NOT_FOUND') || code.includes('_001')) return 404;
  if (code.includes('SERVER') || code.includes('INTERNAL')) return 500;
  return 400;
}

// ============================================================================
// LTI Advantage Validation Schemas
// ============================================================================

const registerPlatformSchema = z.object({
  name: z.string(),
  issuer: z.string(),
  clientId: z.string(),
  deploymentId: z.string(),
  oidcAuthUrl: z.string(),
  tokenUrl: z.string(),
  jwksUrl: z.string(),
  scopes: z.array(z.string()).optional(),
});

const registerToolSchema = z.object({
  platformId: z.string(),
  name: z.string(),
  launchUrl: z.string(),
  loginUrl: z.string(),
  redirectUrls: z.array(z.string()),
  deepLinkUrl: z.string().optional(),
  customParameters: z.record(z.string()).optional(),
  scopes: z.array(z.string()).optional(),
});

const oidcLoginSchema = z.object({
  iss: z.string(),
  login_hint: z.string(),
  target_link_uri: z.string(),
  lti_message_hint: z.string().optional(),
  lti_deployment_id: z.string().optional(),
  client_id: z.string().optional(),
});

const oidcCallbackSchema = z.object({
  state: z.string(),
  id_token: z.string(),
});

const deepLinkResponseSchema = z.object({
  platformId: z.string(),
  contentItems: z.array(z.record(z.unknown())),
  data: z.string().optional(),
});

const createLineItemSchema = z.object({
  platformId: z.string(),
  label: z.string(),
  scoreMaximum: z.number(),
  resourceId: z.string().optional(),
  tag: z.string().optional(),
});

const submitScoreSchema = z.object({
  userId: z.string(),
  scoreGiven: z.number().optional(),
  scoreMaximum: z.number().optional(),
  comment: z.string().optional(),
  activityProgress: z.enum(['Initialized', 'Started', 'InProgress', 'Submitted', 'Completed']),
  gradingProgress: z.enum(['FullyGraded', 'Pending', 'PendingManual', 'Failed', 'NotReady']),
});

// ============================================================================
// OneRoster Validation Schemas
// ============================================================================

const registerConnectionSchema = z.object({
  name: z.string(),
  baseUrl: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  tokenUrl: z.string(),
  scope: z.string().optional(),
});

const bulkImportSchema = z.object({
  connectionId: z.string(),
  resourceType: z.enum(['orgs', 'users', 'classes', 'enrollments', 'courses', 'academicSessions']),
  csvData: z.string(),
});

const triggerSyncSchema = z.object({
  connectionId: z.string(),
  resourceTypes: z.array(z.enum(['orgs', 'users', 'classes', 'enrollments', 'courses', 'academicSessions'])).optional(),
});

// ============================================================================
// CASE Network Validation Schemas
// ============================================================================

const importFrameworkSchema = z.object({
  document: z.object({
    identifier: z.string(),
    title: z.string(),
    description: z.string().optional(),
    creator: z.string().optional(),
    publisher: z.string().optional(),
    subject: z.string().optional(),
    language: z.string().optional(),
    version: z.string().optional(),
    adoptionStatus: z.string().optional(),
    statusStartDate: z.string().optional(),
    statusEndDate: z.string().optional(),
  }),
  items: z.array(z.object({
    identifier: z.string(),
    fullStatement: z.string(),
    humanCodingScheme: z.string().optional(),
    abbreviatedStatement: z.string().optional(),
    conceptKeywords: z.array(z.string()).optional(),
    notes: z.string().optional(),
    itemType: z.string().optional(),
    educationLevel: z.array(z.string()).optional(),
    language: z.string().optional(),
  })),
  associations: z.array(z.object({
    identifier: z.string(),
    originNodeId: z.string(),
    destinationNodeId: z.string(),
    associationType: z.string(),
    sequenceNumber: z.number().optional(),
  })),
  sourceUrl: z.string().optional(),
});

const createAssociationSchema = z.object({
  originItemId: z.string(),
  destinationItemId: z.string(),
  associationType: z.enum([
    'exactMatchOf',
    'isRelatedTo',
    'isPartOf',
    'replacedBy',
    'precedes',
    'isPeerOf',
    'hasSkillLevel',
    'isChildOf',
  ]),
  frameworkId: z.string().optional(),
  sequenceNumber: z.number().optional(),
});

// ============================================================================
// CLR / Open Badges Validation Schemas
// ============================================================================

const createAchievementDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
  achievementType: z.string(),
  criteriaType: z.enum(['narrative', 'id_based']),
  criteriaNarrative: z.string().optional(),
  criteriaId: z.string().optional(),
  image: z.string().optional(),
  alignment: z.array(z.object({
    targetName: z.string(),
    targetUrl: z.string(),
    targetDescription: z.string().optional(),
    targetFramework: z.string().optional(),
    targetCode: z.string().optional(),
  })).optional(),
  tags: z.array(z.string()).optional(),
  evidenceRequired: z.boolean().optional(),
});

const issueBadgeSchema = z.object({
  achievementDefinitionId: z.string(),
  recipientId: z.string(),
  recipientEmail: z.string().email().optional(),
  issuerId: z.string(),
  verificationType: z.enum(['HostedBadge', 'SignedBadge']),
  evidence: z.array(z.object({
    name: z.string().optional(),
    description: z.string().optional(),
    url: z.string().optional(),
    narrative: z.string().optional(),
    genre: z.string().optional(),
  })).optional(),
  results: z.array(z.object({
    resultDescription: z.string(),
    value: z.string().optional(),
    status: z.string().optional(),
  })).optional(),
  expiresAt: z.string().datetime().optional(),
});

const revokeBadgeSchema = z.object({
  reason: z.string(),
});

const assembleCLRSchema = z.object({
  achievementIds: z.array(z.string()).optional(),
  includeRevoked: z.boolean().optional(),
});

// ============================================================================
// Ed-Fi Validation Schemas
// ============================================================================

const registerEdFiConnectionSchema = z.object({
  name: z.string(),
  districtName: z.string(),
  baseUrl: z.string(),
  oauthUrl: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
  schoolYear: z.number(),
  namespace: z.string(),
  apiVersion: z.string().optional(),
  pageSize: z.number().optional(),
  rateLimitPerMinute: z.number().optional(),
  syncDirection: z.enum(['inbound', 'outbound', 'bidirectional']).optional(),
  enabledResources: z.array(z.string()).optional(),
});

const startSyncSchema = z.object({
  connectionId: z.string(),
  direction: z.enum(['inbound', 'outbound', 'bidirectional']),
  resourceTypes: z.array(z.string()).optional(),
});

const resolveConflictSchema = z.object({
  resolution: z.enum(['scholarly_wins', 'edfi_wins', 'manual_merge']),
  mergedData: z.record(z.unknown()).optional(),
  resolvedBy: z.string().optional(),
});

const setFieldMappingsSchema = z.object({
  connectionId: z.string(),
  mappings: z.array(z.object({
    resourceType: z.string(),
    scholarlyField: z.string(),
    edfiField: z.string(),
    direction: z.string(),
    transform: z.string().optional(),
    transformConfig: z.record(z.unknown()).optional(),
    isRequired: z.boolean().optional(),
    defaultValue: z.string().optional(),
  })),
});

// ============================================================================
// LTI Advantage Routes
// ============================================================================

/**
 * POST /lti/platforms
 * Register an LTI platform
 */
interoperabilityRouter.post('/lti/platforms', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = registerPlatformSchema.parse(req.body);

    const ltiService = getLTIAdvantageService();
    const result = await ltiService.registerPlatform(tenantId, data as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('LTI platform registered', { tenantId, platformName: data.name });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /lti/tools
 * Register an LTI tool
 */
interoperabilityRouter.post('/lti/tools', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = registerToolSchema.parse(req.body);

    const ltiService = getLTIAdvantageService();
    const { platformId, ...toolData } = data;
    const result = await ltiService.registerTool(tenantId, platformId, toolData as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('LTI tool registered', { tenantId, toolName: data.name });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /lti/launch
 * OIDC login initiation
 */
interoperabilityRouter.post('/lti/launch', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = oidcLoginSchema.parse(req.body);

    const ltiService = getLTIAdvantageService();
    const result = await ltiService.initiateOIDCLogin(tenantId, data as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('LTI OIDC login initiated', { tenantId, iss: data.iss });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /lti/callback
 * OIDC callback handler
 */
interoperabilityRouter.post('/lti/callback', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = oidcCallbackSchema.parse(req.body);

    const ltiService = getLTIAdvantageService();
    const result = await ltiService.validateOIDCCallback(tenantId, data.state, data.id_token);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('LTI OIDC callback processed', { tenantId });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /lti/deep-link
 * Deep link response
 */
interoperabilityRouter.post('/lti/deep-link', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = deepLinkResponseSchema.parse(req.body);

    const ltiService = getLTIAdvantageService();
    const result = await ltiService.createDeepLinkResponse(
      tenantId,
      data.platformId,
      data.contentItems as unknown as DeepLinkContentItem[],
      data.data,
    );

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('LTI deep link response created', { tenantId, platformId: data.platformId });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /lti/ags/:contextId/lineitems
 * List line items for a context
 */
interoperabilityRouter.get('/lti/ags/:contextId/lineitems', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { contextId } = req.params;
  const platformId = req.query.platformId as string;

  if (!platformId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'platformId query parameter is required' } });
  }

  const ltiService = getLTIAdvantageService();
  const result = await ltiService.getLineItems(tenantId, platformId, contextId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /lti/ags/:contextId/lineitems
 * Create a line item
 */
interoperabilityRouter.post('/lti/ags/:contextId/lineitems', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { contextId } = req.params;

  try {
    const data = createLineItemSchema.parse(req.body);

    const ltiService = getLTIAdvantageService();
    const result = await ltiService.createLineItem(tenantId, data.platformId, contextId, {
      label: data.label,
      scoreMaximum: data.scoreMaximum,
      resourceId: data.resourceId,
      tag: data.tag,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('LTI line item created', { tenantId, contextId, label: data.label });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /lti/ags/:lineItemId/scores
 * Submit a score
 */
interoperabilityRouter.post('/lti/ags/:lineItemId/scores', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { lineItemId } = req.params;

  try {
    const data = submitScoreSchema.parse(req.body);

    const ltiService = getLTIAdvantageService();
    const score: AGSScore = {
      userId: data.userId,
      scoreGiven: data.scoreGiven,
      scoreMaximum: data.scoreMaximum,
      comment: data.comment,
      activityProgress: data.activityProgress,
      gradingProgress: data.gradingProgress,
      timestamp: new Date().toISOString(),
    };
    const result = await ltiService.submitScore(tenantId, lineItemId, score);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('LTI score submitted', { tenantId, lineItemId, userId: data.userId });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /lti/ags/:lineItemId/results
 * Get results for a line item
 */
interoperabilityRouter.get('/lti/ags/:lineItemId/results', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { lineItemId } = req.params;

  const ltiService = getLTIAdvantageService();
  const result = await ltiService.getResults(tenantId, lineItemId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /lti/nrps/:contextId/memberships
 * Names and Role Provisioning Service query
 */
interoperabilityRouter.get('/lti/nrps/:contextId/memberships', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { contextId } = req.params;
  const platformId = req.query.platformId as string;
  const role = req.query.role as string | undefined;

  if (!platformId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'platformId query parameter is required' } });
  }

  const ltiService = getLTIAdvantageService();
  const result = await ltiService.getContextMemberships(tenantId, platformId, contextId, role);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

// ============================================================================
// OneRoster Routes
// ============================================================================

/**
 * GET /oneroster/orgs
 * List organizations
 */
interoperabilityRouter.get('/oneroster/orgs', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string;
  const sort = req.query.sort as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  if (!connectionId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'connectionId query parameter is required' } });
  }

  const oneRosterService = getOneRosterService();
  const result = await oneRosterService.getOrgs(tenantId, connectionId, { sort, limit, offset });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /oneroster/users
 * List users
 */
interoperabilityRouter.get('/oneroster/users', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string;
  const sort = req.query.sort as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  if (!connectionId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'connectionId query parameter is required' } });
  }

  const oneRosterService = getOneRosterService();
  const result = await oneRosterService.getUsers(tenantId, connectionId, { sort, limit, offset });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /oneroster/classes
 * List classes
 */
interoperabilityRouter.get('/oneroster/classes', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string;
  const sort = req.query.sort as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  if (!connectionId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'connectionId query parameter is required' } });
  }

  const oneRosterService = getOneRosterService();
  const result = await oneRosterService.getClasses(tenantId, connectionId, { sort, limit, offset });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /oneroster/enrollments
 * List enrollments
 */
interoperabilityRouter.get('/oneroster/enrollments', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string;
  const sort = req.query.sort as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  if (!connectionId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'connectionId query parameter is required' } });
  }

  const oneRosterService = getOneRosterService();
  const result = await oneRosterService.getEnrollments(tenantId, connectionId, { sort, limit, offset });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /oneroster/connections
 * Register OneRoster connection
 */
interoperabilityRouter.post('/oneroster/connections', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = registerConnectionSchema.parse(req.body);

    const oneRosterService = getOneRosterService();
    const result = await oneRosterService.registerConnection(tenantId, data as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('OneRoster connection registered', { tenantId, connectionName: data.name });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /oneroster/bulk/import
 * CSV bulk import
 */
interoperabilityRouter.post('/oneroster/bulk/import', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = bulkImportSchema.parse(req.body);

    const oneRosterService = getOneRosterService();
    const result = await oneRosterService.bulkImportCSV(tenantId, data.connectionId, data.resourceType, data.csvData);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('OneRoster CSV import completed', { tenantId, connectionId: data.connectionId, resourceType: data.resourceType });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /oneroster/bulk/export
 * CSV bulk export
 */
interoperabilityRouter.get('/oneroster/bulk/export', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string;
  const resourceType = req.query.resourceType as string;

  if (!connectionId || !resourceType) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'connectionId and resourceType query parameters are required' } });
  }

  const oneRosterService = getOneRosterService();
  const result = await oneRosterService.bulkExportCSV(tenantId, connectionId, resourceType);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /oneroster/sync
 * Trigger delta sync
 */
interoperabilityRouter.post('/oneroster/sync', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = triggerSyncSchema.parse(req.body);

    const oneRosterService = getOneRosterService();
    const result = await oneRosterService.triggerDeltaSync(tenantId, data.connectionId, data.resourceTypes);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('OneRoster delta sync triggered', { tenantId, connectionId: data.connectionId });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

// ============================================================================
// CASE Network Routes
// ============================================================================

/**
 * GET /case/frameworks
 * List competency frameworks
 */
interoperabilityRouter.get('/case/frameworks', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const status = req.query.status as string | undefined;
  const subject = req.query.subject as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  const caseService = getCASENetworkService();
  const result = await caseService.listFrameworks(tenantId, { status, subject, limit, offset });

  if (isFailure(result)) {
    const statusCode = errorStatus(result.error.code);
    return res.status(statusCode).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /case/frameworks/:id
 * Get a single competency framework
 */
interoperabilityRouter.get('/case/frameworks/:id', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const caseService = getCASENetworkService();
  const result = await caseService.getFramework(tenantId, id);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /case/frameworks/:id/items
 * Get framework items
 */
interoperabilityRouter.get('/case/frameworks/:id/items', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const itemType = req.query.itemType as string | undefined;
  const educationLevel = req.query.educationLevel as string | undefined;
  const parentId = req.query.parentId as string | undefined;

  const caseService = getCASENetworkService();
  const result = await caseService.getFrameworkItems(tenantId, id, { itemType, educationLevel, parentId });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /case/frameworks/import
 * Import a competency framework
 */
interoperabilityRouter.post('/case/frameworks/import', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = importFrameworkSchema.parse(req.body);

    const caseService = getCASENetworkService();
    const result = await caseService.importFramework(tenantId, data as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('CASE framework imported', { tenantId, itemCount: data.items.length });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /case/items/:id/associations
 * Get item associations
 */
interoperabilityRouter.get('/case/items/:id/associations', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;
  const associationType = req.query.associationType as CASEAssociationType | undefined;

  const caseService = getCASENetworkService();
  const result = await caseService.getItemAssociations(tenantId, id, associationType);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /case/associations
 * Create an association between items
 */
interoperabilityRouter.post('/case/associations', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = createAssociationSchema.parse(req.body);

    const caseService = getCASENetworkService();
    const result = await caseService.createAssociation(tenantId, {
      originItemId: data.originItemId,
      destinationItemId: data.destinationItemId,
      associationType: data.associationType as CASEAssociationType,
      frameworkId: data.frameworkId,
      sequenceNumber: data.sequenceNumber,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('CASE association created', { tenantId, originItemId: data.originItemId, destinationItemId: data.destinationItemId });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /case/search
 * Search CASE items
 */
interoperabilityRouter.get('/case/search', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const q = req.query.q as string;
  const frameworkId = req.query.frameworkId as string | undefined;
  const itemType = req.query.itemType as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  if (!q) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'q query parameter is required' } });
  }

  const caseService = getCASENetworkService();
  const result = await caseService.searchItems(tenantId, q, { frameworkId, itemType, limit });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

// ============================================================================
// CLR / Open Badges Routes
// ============================================================================

/**
 * POST /badges/definitions
 * Create an achievement definition
 */
interoperabilityRouter.post('/badges/definitions', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = createAchievementDefinitionSchema.parse(req.body);

    const clrService = getCLROpenBadgesService();
    const result = await clrService.createAchievementDefinition(tenantId, data as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Achievement definition created', { tenantId, name: data.name, type: data.achievementType });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /badges/definitions
 * List achievement definitions
 */
interoperabilityRouter.get('/badges/definitions', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const type = req.query.type as string | undefined;
  const tags = req.query.tags as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;
  const offset = req.query.offset ? parseInt(req.query.offset as string) : undefined;

  const clrService = getCLROpenBadgesService();
  const result = await clrService.listAchievementDefinitions(tenantId, {
    type,
    tags: tags ? tags.split(',') : undefined,
    limit,
    offset,
  });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /badges/definitions/:id
 * Get a single achievement definition
 */
interoperabilityRouter.get('/badges/definitions/:id', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const clrService = getCLROpenBadgesService();
  const result = await clrService.getAchievementDefinition(tenantId, id);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /badges/issue
 * Issue a badge / credential assertion
 */
interoperabilityRouter.post('/badges/issue', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = issueBadgeSchema.parse(req.body);

    const clrService = getCLROpenBadgesService();
    const result = await clrService.issueBadge(tenantId, {
      achievementDefinitionId: data.achievementDefinitionId,
      recipientId: data.recipientId,
      recipientEmail: data.recipientEmail,
      issuerId: data.issuerId,
      verificationType: data.verificationType,
      evidence: data.evidence as any,
      results: data.results as any,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Badge issued', { tenantId, achievementId: data.achievementDefinitionId, recipientId: data.recipientId });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /badges/verify/:assertionId
 * Verify a badge assertion
 */
interoperabilityRouter.get('/badges/verify/:assertionId', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { assertionId } = req.params;

  const clrService = getCLROpenBadgesService();
  const result = await clrService.verifyBadge(tenantId, assertionId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /badges/revoke/:assertionId
 * Revoke a badge assertion
 */
interoperabilityRouter.post('/badges/revoke/:assertionId', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { assertionId } = req.params;

  try {
    const data = revokeBadgeSchema.parse(req.body);

    const clrService = getCLROpenBadgesService();
    const result = await clrService.revokeBadge(tenantId, assertionId, data.reason);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Badge revoked', { tenantId, assertionId, reason: data.reason });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /clr/assemble/:learnerId
 * Assemble a Comprehensive Learner Record
 */
interoperabilityRouter.post('/clr/assemble/:learnerId', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  try {
    const data = assembleCLRSchema.parse(req.body);

    const clrService = getCLROpenBadgesService();
    const result = await clrService.assembleCLR(tenantId, learnerId, data);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('CLR assembled', { tenantId, learnerId });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /badges/learner/:learnerId
 * Get a learner's achievements
 */
interoperabilityRouter.get('/badges/learner/:learnerId', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { learnerId } = req.params;

  const clrService = getCLROpenBadgesService();
  const result = await clrService.getLearnersAchievements(tenantId, learnerId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /badges/revocations
 * Get revocation list
 */
interoperabilityRouter.get('/badges/revocations', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  const clrService = getCLROpenBadgesService();
  const result = await clrService.getRevocationList(tenantId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /badges/blockchain/:assertionId
 * Bridge badge assertion to blockchain
 */
interoperabilityRouter.post('/badges/blockchain/:assertionId', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { assertionId } = req.params;

  const clrService = getCLROpenBadgesService();
  const result = await clrService.bridgeToBlockchain(tenantId, assertionId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  log.info('Badge bridged to blockchain', { tenantId, assertionId });

  res.status(200).json(result.data);
});

// ============================================================================
// Ed-Fi Integration Routes
// ============================================================================

/**
 * POST /edfi/connections
 * Register an Ed-Fi ODS connection
 */
interoperabilityRouter.post('/edfi/connections', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = registerEdFiConnectionSchema.parse(req.body);

    const edfiService = getEdFiIntegrationService();
    const result = await edfiService.registerConnection(tenantId, data as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Ed-Fi connection registered', { tenantId, connectionName: data.name, districtName: data.districtName });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /edfi/connections
 * List Ed-Fi connections
 */
interoperabilityRouter.get('/edfi/connections', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  const edfiService = getEdFiIntegrationService();
  const result = await edfiService.listConnections(tenantId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /edfi/connections/:id
 * Get a single Ed-Fi connection
 */
interoperabilityRouter.get('/edfi/connections/:id', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const edfiService = getEdFiIntegrationService();
  const result = await edfiService.getConnection(tenantId, id);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /edfi/sync/start
 * Start an Ed-Fi sync job
 */
interoperabilityRouter.post('/edfi/sync/start', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = startSyncSchema.parse(req.body);

    const edfiService = getEdFiIntegrationService();
    const result = await edfiService.startSyncJob(tenantId, data.connectionId, {
      direction: data.direction as EdFiSyncDirection,
      resourceTypes: data.resourceTypes as EdFiResourceType[] | undefined,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Ed-Fi sync started', { tenantId, connectionId: data.connectionId, direction: data.direction });

    res.status(201).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /edfi/sync/jobs
 * List sync jobs
 */
interoperabilityRouter.get('/edfi/sync/jobs', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string | undefined;
  const status = req.query.status as string | undefined;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : undefined;

  const edfiService = getEdFiIntegrationService();
  const result = await edfiService.getSyncJobs(tenantId, connectionId, { status, limit });

  if (isFailure(result)) {
    const statusCode = errorStatus(result.error.code);
    return res.status(statusCode).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * GET /edfi/sync/jobs/:id
 * Get sync job status
 */
interoperabilityRouter.get('/edfi/sync/jobs/:id', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const edfiService = getEdFiIntegrationService();
  const result = await edfiService.getSyncJobStatus(tenantId, id);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /edfi/sync/jobs/:id/retry
 * Retry a failed sync job
 */
interoperabilityRouter.post('/edfi/sync/jobs/:id/retry', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  const edfiService = getEdFiIntegrationService();
  const result = await edfiService.retryFailedJob(tenantId, id);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  log.info('Ed-Fi sync job retried', { tenantId, jobId: id });

  res.status(200).json(result.data);
});

/**
 * GET /edfi/sync/conflicts
 * List sync conflicts
 */
interoperabilityRouter.get('/edfi/sync/conflicts', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string | undefined;
  const status = req.query.status as string | undefined;

  const edfiService = getEdFiIntegrationService();
  const result = await edfiService.getConflicts(tenantId, connectionId, status);

  if (isFailure(result)) {
    const statusCode = errorStatus(result.error.code);
    return res.status(statusCode).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /edfi/sync/conflicts/:id/resolve
 * Resolve a sync conflict
 */
interoperabilityRouter.post('/edfi/sync/conflicts/:id/resolve', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const { id } = req.params;

  try {
    const data = resolveConflictSchema.parse(req.body);

    const edfiService = getEdFiIntegrationService();
    const result = await edfiService.resolveConflict(
      tenantId,
      id,
      data.resolution,
      data.mergedData as Record<string, unknown> | undefined,
      data.resolvedBy,
    );

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Ed-Fi sync conflict resolved', { tenantId, conflictId: id, resolution: data.resolution });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /edfi/mappings
 * Get field mappings
 */
interoperabilityRouter.get('/edfi/mappings', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;
  const connectionId = req.query.connectionId as string;
  const resourceType = req.query.resourceType as EdFiResourceType | undefined;

  if (!connectionId) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'connectionId query parameter is required' } });
  }

  const edfiService = getEdFiIntegrationService();
  const result = await edfiService.getFieldMappings(tenantId, connectionId, resourceType);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.status(200).json(result.data);
});

/**
 * POST /edfi/mappings
 * Set field mappings
 */
interoperabilityRouter.post('/edfi/mappings', authMiddleware, async (req, res) => {
  const tenantId = req.user!.tenantId;

  try {
    const data = setFieldMappingsSchema.parse(req.body);

    const edfiService = getEdFiIntegrationService();
    const result = await edfiService.setFieldMappings(tenantId, data.connectionId, data.mappings as any);

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Ed-Fi field mappings updated', { tenantId, connectionId: data.connectionId, mappingCount: data.mappings.length });

    res.status(200).json(result.data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});
