/**
 * Admin Communications Routes — Provider configuration for Email, SMS, WhatsApp
 *
 * Admin-only routes for managing tenant-level communication provider
 * credentials and testing message delivery.
 */

import { Router } from 'express';
import { z } from 'zod';
import { logger } from '../lib/logger';

export const adminCommunicationsRouter: Router = Router();

// ============================================================================
// CONFIGURATION
// ============================================================================

adminCommunicationsRouter.get('/config', async (req, res) => {
  const { tenantId } = req;

  // TODO: Wire to TenantIntegrationConfig model
  // For now, return default/empty config
  res.json({
    success: true,
    data: {
      config: {
        tenantId,
        emailProvider: null,
        emailConfigured: false,
        smsProvider: null,
        smsConfigured: false,
        whatsappProvider: null,
        whatsappConfigured: false,
        templates: [],
      },
    },
  });
});

const updateConfigSchema = z.object({
  emailProvider: z.enum(['gmail', 'outlook', 'zimbra']).optional().nullable(),
  emailCredentials: z.record(z.string()).optional(),
  smsProvider: z.enum(['twilio', 'vonage']).optional().nullable(),
  smsCredentials: z.record(z.string()).optional(),
  whatsappProvider: z.enum(['twilio-whatsapp', 'meta-cloud']).optional().nullable(),
  whatsappCredentials: z.record(z.string()).optional(),
});

adminCommunicationsRouter.put('/config', async (req, res) => {
  const { tenantId } = req;
  const data = updateConfigSchema.parse(req.body);

  // TODO: Wire to TenantIntegrationConfig upsert
  logger.info({ tenantId, providers: {
    email: data.emailProvider,
    sms: data.smsProvider,
    whatsapp: data.whatsappProvider,
  }}, 'Communications config update requested');

  res.json({
    success: true,
    data: { config: { tenantId, ...data } },
  });
});

// ============================================================================
// TEST SENDS
// ============================================================================

const testEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string(),
  body: z.string(),
});

adminCommunicationsRouter.post('/test-email', async (req, res) => {
  const data = testEmailSchema.parse(req.body);

  // TODO: Wire to NotificationService or IntegrationsService
  logger.info({ to: data.to }, 'Test email send requested');

  res.json({
    success: true,
    data: { success: true, messageId: `test_email_${Date.now()}` },
  });
});

const testSmsSchema = z.object({
  to: z.string().min(8),
  message: z.string(),
});

adminCommunicationsRouter.post('/test-sms', async (req, res) => {
  const data = testSmsSchema.parse(req.body);

  // TODO: Wire to ISmsProvider
  logger.info({ to: data.to }, 'Test SMS send requested');

  res.json({
    success: true,
    data: { success: true, messageId: `test_sms_${Date.now()}` },
  });
});

const testWhatsappSchema = z.object({
  to: z.string().min(8),
  message: z.string(),
});

adminCommunicationsRouter.post('/test-whatsapp', async (req, res) => {
  const data = testWhatsappSchema.parse(req.body);

  // TODO: Wire to IWhatsAppProvider
  logger.info({ to: data.to }, 'Test WhatsApp send requested');

  res.json({
    success: true,
    data: { success: true, messageId: `test_whatsapp_${Date.now()}` },
  });
});
