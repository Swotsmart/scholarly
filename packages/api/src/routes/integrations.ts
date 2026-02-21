/**
 * Integrations Routes — Canva, Google Classroom, and provider connections
 *
 * Exposes the existing IntegrationsService methods (Canva design creation,
 * Google Classroom sync, OAuth connections) to the frontend.
 */

import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

export const integrationsRouter: Router = Router();

// ============================================================================
// CONNECTIONS — List/disconnect provider connections
// ============================================================================

integrationsRouter.get('/connections', async (req, res) => {
  // TODO: Wire to IntegrationsService.listConnections(tenantId, userId)
  const connections = [
    { provider: 'gmail', connected: false },
    { provider: 'outlook', connected: false },
    { provider: 'canva', connected: false },
    { provider: 'google-classroom', connected: false },
  ];

  res.json({ success: true, data: { connections } });
});

integrationsRouter.get('/:provider/auth-url', async (req, res) => {
  const { provider } = req.params;

  // TODO: Wire to IntegrationsService.getAuthorizationUrl(tenantId, userId, provider)
  logger.info({ provider }, 'Integration auth URL requested');

  res.json({
    success: true,
    data: { url: `https://auth.example.com/${provider}/authorize` },
  });
});

integrationsRouter.delete('/:provider/connection', async (req, res) => {
  const { provider } = req.params;

  // TODO: Wire to IntegrationsService.disconnectProvider(tenantId, userId, provider)
  logger.info({ provider }, 'Integration disconnection requested');

  res.json({ success: true, data: null });
});

// ============================================================================
// CANVA — Design creation and template search
// ============================================================================

integrationsRouter.get('/canva/connection', async (req, res) => {
  // TODO: Wire to IntegrationsService.getCanvaConnection(tenantId, userId)
  res.json({
    success: true,
    data: { connected: false, user: null },
  });
});

integrationsRouter.get('/canva/templates', async (req, res) => {
  const { query, designType } = req.query;

  // TODO: Wire to IntegrationsService.canvaSearchTemplates(tenantId, userId, query, designType)
  logger.info({ query, designType }, 'Canva template search requested');

  res.json({
    success: true,
    data: { templates: [] },
  });
});

const createDesignSchema = z.object({
  templateId: z.string().optional(),
  designType: z.string(),
  title: z.string(),
});

integrationsRouter.post('/canva/designs', async (req, res) => {
  const data = createDesignSchema.parse(req.body);

  // TODO: Wire to IntegrationsService.canvaCreateDesign(tenantId, userId, data)
  logger.info({ designType: data.designType, title: data.title }, 'Canva design creation requested');

  res.json({
    success: true,
    data: {
      designUrl: 'https://www.canva.com/design/placeholder',
      designId: `design_${Date.now()}`,
    },
  });
});

// ============================================================================
// GOOGLE CLASSROOM
// ============================================================================

integrationsRouter.get('/google-classroom/courses', async (req, res) => {
  // TODO: Wire to IntegrationsService.googleClassroomListCourses(tenantId, userId)
  res.json({ success: true, data: { courses: [] } });
});

integrationsRouter.post('/google-classroom/courses/:courseId/sync', async (req, res) => {
  const { courseId } = req.params;

  // TODO: Wire to IntegrationsService.googleClassroomSyncCourse(tenantId, userId, courseId)
  logger.info({ courseId }, 'Google Classroom sync requested');

  res.json({
    success: true,
    data: { syncJob: { id: `sync_${Date.now()}`, status: 'queued', courseId } },
  });
});

const createAssignmentSchema = z.object({
  title: z.string(),
  description: z.string(),
  dueDate: z.string().optional(),
});

integrationsRouter.post('/google-classroom/courses/:courseId/assignments', async (req, res) => {
  const { courseId } = req.params;
  const data = createAssignmentSchema.parse(req.body);

  // TODO: Wire to IntegrationsService.googleClassroomCreateAssignment(tenantId, userId, courseId, data)
  logger.info({ courseId, title: data.title }, 'Google Classroom assignment creation requested');

  res.json({
    success: true,
    data: { assignment: { id: `assignment_${Date.now()}`, courseId, ...data } },
  });
});
