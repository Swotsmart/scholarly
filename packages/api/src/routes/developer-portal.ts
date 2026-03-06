/**
 * Developer Portal Routes
 *
 * API endpoints for the developer portal, SDK documentation,
 * webhooks, LMS integration, CLI tools, and studio.
 * Sprints: 3, 4, 8, 9, 14, 16
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@scholarly/database';
import { authMiddleware } from '../middleware/auth';

export const developerPortalRouter: Router = Router();
developerPortalRouter.use(authMiddleware);

// ============================================================================
// Shared Schemas
// ============================================================================

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ============================================================================
// Static API Documentation Reference
// ============================================================================

const API_DOCUMENTATION: Record<string, {
  category: string;
  description: string;
  endpoints: Array<{
    path: string;
    method: string;
    description: string;
    parameters?: Array<{ name: string; type: string; required: boolean; description: string }>;
    responses?: Record<string, string>;
  }>;
}> = {
  stories: {
    category: 'Stories',
    description: 'AI-powered storybook creation, generation, and management',
    endpoints: [
      {
        path: '/api/v1/storybook/generate',
        method: 'POST',
        description: 'Generate a new AI-powered story with decodable text',
        parameters: [
          { name: 'title', type: 'string', required: true, description: 'Story title' },
          { name: 'phase', type: 'number', required: true, description: 'Phonics phase (1-6)' },
          { name: 'targetGPCs', type: 'string[]', required: false, description: 'Target grapheme-phoneme correspondences' },
          { name: 'theme', type: 'string', required: false, description: 'Story theme' },
          { name: 'pageCount', type: 'number', required: false, description: 'Number of pages (4-32)' },
        ],
        responses: { '201': 'Story created', '400': 'Validation error', '401': 'Unauthorized' },
      },
      {
        path: '/api/v1/storybook/illustrate',
        method: 'POST',
        description: 'Generate illustrations for a story',
        parameters: [
          { name: 'storyId', type: 'string', required: true, description: 'Story to illustrate' },
          { name: 'artStyle', type: 'string', required: false, description: 'Art style (default: watercolour)' },
        ],
        responses: { '200': 'Illustrations queued', '404': 'Story not found' },
      },
      {
        path: '/api/v1/storybook/narrate',
        method: 'POST',
        description: 'Generate audio narration for a story',
        parameters: [
          { name: 'storyId', type: 'string', required: true, description: 'Story to narrate' },
          { name: 'voiceId', type: 'string', required: false, description: 'Voice preset ID' },
          { name: 'speed', type: 'number', required: false, description: 'Playback speed (0.5-2.0)' },
        ],
        responses: { '200': 'Narration queued', '404': 'Story not found' },
      },
    ],
  },
  library: {
    category: 'Library',
    description: 'Browse and search the story library',
    endpoints: [
      {
        path: '/api/v1/storybook/library',
        method: 'GET',
        description: 'Search and browse the story library',
        parameters: [
          { name: 'query', type: 'string', required: false, description: 'Search query' },
          { name: 'phase', type: 'number', required: false, description: 'Filter by phonics phase' },
          { name: 'page', type: 'number', required: false, description: 'Page number' },
          { name: 'limit', type: 'number', required: false, description: 'Items per page' },
        ],
        responses: { '200': 'Library results' },
      },
      {
        path: '/api/v1/storybook/library/recommendations',
        method: 'GET',
        description: 'Get personalised story recommendations',
        responses: { '200': 'Recommended stories' },
      },
    ],
  },
  arena: {
    category: 'Arena',
    description: 'Competitions, tournaments, and gamification',
    endpoints: [
      {
        path: '/api/v1/arena/competitions',
        method: 'GET',
        description: 'List active and upcoming competitions',
        responses: { '200': 'Competition list' },
      },
      {
        path: '/api/v1/arena/tournaments',
        method: 'GET',
        description: 'List active tournaments',
        responses: { '200': 'Tournament list' },
      },
      {
        path: '/api/v1/arena/teams',
        method: 'GET',
        description: 'List teams and team details',
        responses: { '200': 'Team list' },
      },
    ],
  },
  tokens: {
    category: 'Tokens',
    description: 'Token economy, balances, and transactions',
    endpoints: [
      {
        path: '/api/v1/arena/tokens/balance',
        method: 'GET',
        description: 'Get current token balance for all token types',
        responses: { '200': 'Token balances' },
      },
      {
        path: '/api/v1/arena/tokens/transactions',
        method: 'GET',
        description: 'Get token transaction history',
        responses: { '200': 'Transaction history' },
      },
    ],
  },
  webhooks: {
    category: 'Webhooks',
    description: 'Webhook subscription management for event notifications',
    endpoints: [
      {
        path: '/api/v1/developer/webhooks',
        method: 'POST',
        description: 'Register a new webhook subscription',
        parameters: [
          { name: 'url', type: 'string', required: true, description: 'Webhook delivery URL' },
          { name: 'events', type: 'string[]', required: true, description: 'Event types to subscribe to' },
          { name: 'secret', type: 'string', required: false, description: 'Webhook signing secret (auto-generated if omitted)' },
        ],
        responses: { '201': 'Webhook created', '400': 'Validation error' },
      },
      {
        path: '/api/v1/developer/webhooks',
        method: 'GET',
        description: 'List all webhook subscriptions',
        responses: { '200': 'Webhook list' },
      },
      {
        path: '/api/v1/developer/webhooks/:webhookId',
        method: 'DELETE',
        description: 'Disable a webhook subscription',
        responses: { '200': 'Webhook disabled', '404': 'Not found', '403': 'Forbidden' },
      },
    ],
  },
  lms: {
    category: 'LMS Integration',
    description: 'Connect to Learning Management Systems via LTI and OneRoster',
    endpoints: [
      {
        path: '/api/v1/developer/lms/connect',
        method: 'POST',
        description: 'Connect an LMS platform',
        parameters: [
          { name: 'platform', type: 'string', required: true, description: 'Platform type (google_classroom, canvas, moodle, blackboard, schoology)' },
          { name: 'credentials', type: 'object', required: true, description: 'Platform-specific credentials' },
        ],
        responses: { '201': 'Connection created', '400': 'Validation error' },
      },
      {
        path: '/api/v1/developer/lms/connections',
        method: 'GET',
        description: 'List all LMS connections for the tenant',
        responses: { '200': 'Connection list' },
      },
      {
        path: '/api/v1/developer/lms/:connectionId/sync',
        method: 'POST',
        description: 'Trigger a data sync for an LMS connection',
        responses: { '200': 'Sync initiated', '404': 'Connection not found' },
      },
    ],
  },
  studio: {
    category: 'Studio Portal',
    description: 'Design studio for creating and managing projects',
    endpoints: [
      {
        path: '/api/v1/developer/studio/projects',
        method: 'GET',
        description: 'List studio projects',
        responses: { '200': 'Project list' },
      },
      {
        path: '/api/v1/developer/studio/projects',
        method: 'POST',
        description: 'Create a new studio project',
        parameters: [
          { name: 'name', type: 'string', required: true, description: 'Project name' },
          { name: 'description', type: 'string', required: false, description: 'Project description' },
        ],
        responses: { '201': 'Project created', '400': 'Validation error' },
      },
      {
        path: '/api/v1/developer/studio/:projectId/pages',
        method: 'GET',
        description: 'Get pages for a studio project',
        responses: { '200': 'Page list', '404': 'Project not found' },
      },
      {
        path: '/api/v1/developer/studio/:projectId/validate',
        method: 'POST',
        description: 'Validate a studio project for publishing readiness',
        responses: { '200': 'Validation results', '404': 'Project not found' },
      },
    ],
  },
  developer: {
    category: 'Developer Account',
    description: 'Developer account management and tier information',
    endpoints: [
      {
        path: '/api/v1/developer/tier',
        method: 'GET',
        description: 'Get current developer tier and available tiers',
        responses: { '200': 'Tier information' },
      },
    ],
  },
};

// ============================================================================
// Developer Tier Definitions (static reference)
// ============================================================================

const TIER_DEFINITIONS = [
  {
    name: 'Explorer',
    apiCallsPerDay: 100,
    webhooksLimit: 2,
    features: ['basic-api', 'library-access'],
    revenueShareMin: 0,
    revenueShareMax: 0.6,
  },
  {
    name: 'Builder',
    apiCallsPerDay: 1_000,
    webhooksLimit: 10,
    features: ['basic-api', 'webhooks', 'library-access', 'story-generation'],
    revenueShareMin: 0.6,
    revenueShareMax: 0.7,
  },
  {
    name: 'Professional',
    apiCallsPerDay: 10_000,
    webhooksLimit: 50,
    features: ['basic-api', 'webhooks', 'studio', 'analytics', 'library-access', 'story-generation', 'lms-integration'],
    revenueShareMin: 0.7,
    revenueShareMax: 0.8,
  },
  {
    name: 'Enterprise',
    apiCallsPerDay: -1,
    webhooksLimit: -1,
    features: ['all'],
    revenueShareMin: 0.8,
    revenueShareMax: 0.9,
  },
];

// ============================================================================
// API Documentation
// ============================================================================

developerPortalRouter.get('/api-docs', async (_req: Request, res: Response) => {
  try {
    const categories = Object.entries(API_DOCUMENTATION).map(([key, doc]) => ({
      key,
      category: doc.category,
      description: doc.description,
      endpointCount: doc.endpoints.length,
    }));

    const totalEndpoints = Object.values(API_DOCUMENTATION).reduce(
      (sum, doc) => sum + doc.endpoints.length,
      0
    );

    res.json({
      success: true,
      data: {
        version: '1.0.0',
        categories,
        totalEndpoints,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve API documentation' });
  }
});

developerPortalRouter.get('/api-docs/:endpoint', async (req: Request, res: Response) => {
  try {
    const endpointKey = req.params.endpoint;
    const doc = API_DOCUMENTATION[endpointKey];

    if (!doc) {
      res.status(404).json({
        success: false,
        error: `Documentation not found for endpoint category: ${endpointKey}`,
        availableCategories: Object.keys(API_DOCUMENTATION),
      });
      return;
    }

    res.json({
      success: true,
      data: {
        key: endpointKey,
        category: doc.category,
        description: doc.description,
        endpoints: doc.endpoints,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve endpoint documentation' });
  }
});

// ============================================================================
// Webhooks
// ============================================================================

const registerWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum([
    'story.created', 'story.published', 'story.updated',
    'review.started', 'review.completed', 'review.rejected',
    'marketplace.sale', 'marketplace.refund',
    'competition.started', 'competition.completed',
    'bounty.created', 'bounty.awarded',
    'token.earned', 'token.redeemed',
  ])).min(1),
  secret: z.string().optional(),
  headers: z.record(z.string()).optional(),
});

developerPortalRouter.post('/webhooks', async (req: Request, res: Response) => {
  try {
    const parsed = registerWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { url, events, secret, headers } = parsed.data;
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    const webhook = await prisma.webhookSubscription.create({
      data: {
        tenantId: req.user!.tenantId,
        developerId: req.user!.id,
        url,
        secret: webhookSecret,
        events: events as unknown as any,
        status: 'active',
        headers: headers ? (headers as unknown as any) : undefined,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: webhook.id,
        url: webhook.url,
        secret: webhookSecret,
        events: webhook.events,
        status: webhook.status,
        headers: webhook.headers,
        createdAt: webhook.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create webhook subscription' });
  }
});

developerPortalRouter.get('/webhooks', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [webhooks, total] = await Promise.all([
      prisma.webhookSubscription.findMany({
        where: {
          developerId: req.user!.id,
          tenantId: req.user!.tenantId,
        },
        include: {
          _count: {
            select: { deliveries: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.webhookSubscription.count({
        where: {
          developerId: req.user!.id,
          tenantId: req.user!.tenantId,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        webhooks: webhooks.map((wh) => ({
          id: wh.id,
          url: wh.url,
          events: wh.events,
          status: wh.status,
          failureCount: wh.failureCount,
          lastDeliveredAt: wh.lastDeliveredAt,
          deliveryCount: wh._count.deliveries,
          createdAt: wh.createdAt,
          updatedAt: wh.updatedAt,
        })),
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve webhook subscriptions' });
  }
});

developerPortalRouter.delete('/webhooks/:webhookId', async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;

    const webhook = await prisma.webhookSubscription.findUnique({
      where: { id: webhookId },
    });

    if (!webhook) {
      res.status(404).json({
        success: false,
        error: `Webhook subscription not found: ${webhookId}`,
      });
      return;
    }

    if (webhook.developerId !== req.user!.id) {
      res.status(403).json({
        success: false,
        error: 'You do not have permission to delete this webhook subscription',
      });
      return;
    }

    const updated = await prisma.webhookSubscription.update({
      where: { id: webhookId },
      data: { status: 'disabled' },
    });

    res.json({
      success: true,
      data: {
        id: updated.id,
        status: updated.status,
        updatedAt: updated.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to disable webhook subscription' });
  }
});

// ============================================================================
// SDK & Tutorials
// ============================================================================

developerPortalRouter.get('/tutorials', async (req: Request, res: Response) => {
  try {
    const tutorials = await prisma.content.findMany({
      where: {
        tenantId: req.user!.tenantId,
        type: 'tutorial',
        status: 'published',
        deletedAt: null,
      },
      select: {
        id: true,
        tags: true,
      },
    });

    // Group by first tag to create categories with counts
    const categoryMap = new Map<string, number>();
    for (const tutorial of tutorials) {
      const category = tutorial.tags.length > 0 ? tutorial.tags[0] : 'uncategorized';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    }

    const categories = Array.from(categoryMap.entries()).map(([name, tutorialCount]) => ({
      id: name.toLowerCase().replace(/\s+/g, '-'),
      name,
      tutorialCount,
    }));

    res.json({
      success: true,
      data: {
        categories,
        totalTutorials: tutorials.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve tutorial categories' });
  }
});

developerPortalRouter.get('/tutorials/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [tutorials, total] = await Promise.all([
      prisma.content.findMany({
        where: {
          tenantId: req.user!.tenantId,
          type: 'tutorial',
          status: 'published',
          deletedAt: null,
          tags: { has: category },
        },
        select: {
          id: true,
          title: true,
          description: true,
          tags: true,
          thumbnailUrl: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.content.count({
        where: {
          tenantId: req.user!.tenantId,
          type: 'tutorial',
          status: 'published',
          deletedAt: null,
          tags: { has: category },
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        category,
        tutorials,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve tutorials' });
  }
});

// ============================================================================
// Templates
// ============================================================================

developerPortalRouter.get('/templates', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [templates, total] = await Promise.all([
      prisma.content.findMany({
        where: {
          tenantId: req.user!.tenantId,
          type: 'template',
          status: 'published',
          deletedAt: null,
        },
        select: {
          id: true,
          title: true,
          description: true,
          tags: true,
          thumbnailUrl: true,
          qualityScore: true,
          downloadCount: true,
          averageRating: true,
          reviewCount: true,
          createdAt: true,
          updatedAt: true,
          creator: {
            select: {
              id: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.content.count({
        where: {
          tenantId: req.user!.tenantId,
          type: 'template',
          status: 'published',
          deletedAt: null,
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        templates,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve templates' });
  }
});

// ============================================================================
// LMS Integration
// ============================================================================

const LTI_PLATFORMS = ['google_classroom', 'canvas', 'moodle'] as const;
const ONEROSTER_PLATFORMS = ['blackboard', 'schoology'] as const;

const connectLmsSchema = z.object({
  platform: z.enum([...LTI_PLATFORMS, ...ONEROSTER_PLATFORMS]),
  credentials: z.record(z.string()),
});

developerPortalRouter.post('/lms/connect', async (req: Request, res: Response) => {
  try {
    const parsed = connectLmsSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { platform, credentials } = parsed.data;
    const tenantId = req.user!.tenantId;
    const isLti = (LTI_PLATFORMS as readonly string[]).includes(platform);

    if (isLti) {
      // Validate LTI-specific required fields
      const requiredFields = ['name', 'issuer', 'clientId', 'deploymentId', 'oidcAuthUrl', 'tokenUrl', 'jwksUrl'];
      const missingFields = requiredFields.filter((f) => !credentials[f]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required LTI credentials: ${missingFields.join(', ')}`,
        });
        return;
      }

      const ltiPlatform = await prisma.lTIPlatform.create({
        data: {
          tenantId,
          name: credentials.name,
          issuer: credentials.issuer,
          clientId: credentials.clientId,
          deploymentId: credentials.deploymentId,
          oidcAuthUrl: credentials.oidcAuthUrl,
          tokenUrl: credentials.tokenUrl,
          jwksUrl: credentials.jwksUrl,
          status: 'active',
          metadata: { platform, connectedBy: req.user!.id },
        },
      });

      res.status(201).json({
        success: true,
        data: {
          connectionId: ltiPlatform.id,
          type: 'lti',
          platform,
          status: ltiPlatform.status,
          createdAt: ltiPlatform.createdAt,
        },
      });
    } else {
      // OneRoster connection
      const requiredFields = ['name', 'baseUrl', 'clientId', 'clientSecret', 'tokenUrl'];
      const missingFields = requiredFields.filter((f) => !credentials[f]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          error: `Missing required OneRoster credentials: ${missingFields.join(', ')}`,
        });
        return;
      }

      const oneRosterConnection = await prisma.oneRosterConnection.create({
        data: {
          tenantId,
          name: credentials.name,
          baseUrl: credentials.baseUrl,
          clientId: credentials.clientId,
          clientSecret: credentials.clientSecret,
          tokenUrl: credentials.tokenUrl,
          scope: credentials.scope || undefined,
          syncStatus: 'idle',
        },
      });

      res.status(201).json({
        success: true,
        data: {
          connectionId: oneRosterConnection.id,
          type: 'oneroster',
          platform,
          status: 'connected',
          createdAt: oneRosterConnection.createdAt,
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create LMS connection' });
  }
});

developerPortalRouter.get('/lms/connections', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;

    const [ltiPlatforms, oneRosterConnections] = await Promise.all([
      prisma.lTIPlatform.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          issuer: true,
          clientId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.oneRosterConnection.findMany({
        where: { tenantId },
        select: {
          id: true,
          name: true,
          baseUrl: true,
          syncStatus: true,
          lastSyncAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const connections = [
      ...ltiPlatforms.map((lti) => ({
        id: lti.id,
        type: 'lti' as const,
        name: lti.name,
        status: lti.status,
        details: {
          issuer: lti.issuer,
          clientId: lti.clientId,
        },
        createdAt: lti.createdAt,
        updatedAt: lti.updatedAt,
      })),
      ...oneRosterConnections.map((or) => ({
        id: or.id,
        type: 'oneroster' as const,
        name: or.name,
        status: or.syncStatus,
        details: {
          baseUrl: or.baseUrl,
          lastSyncAt: or.lastSyncAt,
        },
        createdAt: or.createdAt,
        updatedAt: or.updatedAt,
      })),
    ].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    res.json({
      success: true,
      data: {
        connections,
        total: connections.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve LMS connections' });
  }
});

developerPortalRouter.post('/lms/:connectionId/sync', async (req: Request, res: Response) => {
  try {
    const { connectionId } = req.params;
    const tenantId = req.user!.tenantId;

    // Try to find the connection in LTIPlatform first
    const ltiPlatform = await prisma.lTIPlatform.findFirst({
      where: { id: connectionId, tenantId },
    });

    if (ltiPlatform) {
      // For LTI platforms, create an audit log entry for the sync request
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: req.user!.id,
          userEmail: req.user!.email,
          action: 'sync',
          entityType: 'LTIPlatform',
          entityId: connectionId,
          metadata: {
            platformName: ltiPlatform.name,
            requestedAt: new Date().toISOString(),
          },
          sensitivity: 'normal',
        },
      });

      res.json({
        success: true,
        data: {
          connectionId,
          type: 'lti',
          syncStatus: 'requested',
          message: 'LTI sync request has been logged. LTI platforms sync on-demand via launch events.',
        },
      });
      return;
    }

    // Try OneRoster
    const oneRosterConnection = await prisma.oneRosterConnection.findFirst({
      where: { id: connectionId, tenantId },
    });

    if (oneRosterConnection) {
      const resourceType = (req.body.resourceType as string) || 'users';
      const direction = (req.body.direction as string) || 'inbound';

      const syncJob = await prisma.oneRosterSyncJob.create({
        data: {
          tenantId,
          connectionId: oneRosterConnection.id,
          resourceType,
          direction,
          status: 'pending',
        },
      });

      // Update the connection sync status
      await prisma.oneRosterConnection.update({
        where: { id: connectionId },
        data: { syncStatus: 'syncing' },
      });

      res.json({
        success: true,
        data: {
          connectionId,
          type: 'oneroster',
          syncJobId: syncJob.id,
          resourceType,
          direction,
          status: syncJob.status,
        },
      });
      return;
    }

    // Connection not found in either table
    res.status(404).json({
      success: false,
      error: `LMS connection not found: ${connectionId}`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to initiate LMS sync' });
  }
});

// ============================================================================
// Studio Portal
// ============================================================================

developerPortalRouter.get('/studio/projects', async (req: Request, res: Response) => {
  try {
    const { page, limit } = paginationSchema.parse(req.query);
    const skip = (page - 1) * limit;

    const [projects, total] = await Promise.all([
      prisma.artifact.findMany({
        where: {
          tenantId: req.user!.tenantId,
          userId: req.user!.id,
          type: 'studio-project',
        },
        select: {
          id: true,
          title: true,
          description: true,
          content: true,
          metadata: true,
          tags: true,
          status: true,
          visibility: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.artifact.count({
        where: {
          tenantId: req.user!.tenantId,
          userId: req.user!.id,
          type: 'studio-project',
        },
      }),
    ]);

    res.json({
      success: true,
      data: {
        projects,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve studio projects' });
  }
});

const createProjectSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string()).optional(),
});

developerPortalRouter.post('/studio/projects', async (req: Request, res: Response) => {
  try {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
      return;
    }

    const { name, description, tags } = parsed.data;
    const userId = req.user!.id;
    const tenantId = req.user!.tenantId;

    // Find the user's portfolio
    const portfolio = await prisma.portfolio.findFirst({
      where: { userId, tenantId },
    });

    if (!portfolio) {
      res.status(400).json({
        success: false,
        error: 'Create a portfolio first before creating studio projects',
      });
      return;
    }

    const artifact = await prisma.artifact.create({
      data: {
        portfolioId: portfolio.id,
        tenantId,
        userId,
        title: name,
        description: description || null,
        type: 'studio-project',
        content: { pages: [] },
        metadata: {},
        tags: tags || [],
        status: 'draft',
        visibility: 'private',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: artifact.id,
        title: artifact.title,
        description: artifact.description,
        type: artifact.type,
        content: artifact.content,
        tags: artifact.tags,
        status: artifact.status,
        createdAt: artifact.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create studio project' });
  }
});

developerPortalRouter.get('/studio/:projectId/pages', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const artifact = await prisma.artifact.findFirst({
      where: {
        id: projectId,
        type: 'studio-project',
        tenantId: req.user!.tenantId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        updatedAt: true,
      },
    });

    if (!artifact) {
      res.status(404).json({
        success: false,
        error: `Studio project not found: ${projectId}`,
      });
      return;
    }

    const content = artifact.content as { pages?: unknown[] } | null;
    const pages = content?.pages || [];

    res.json({
      success: true,
      data: {
        projectId: artifact.id,
        title: artifact.title,
        pages,
        pageCount: pages.length,
        status: artifact.status,
        updatedAt: artifact.updatedAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve project pages' });
  }
});

developerPortalRouter.post('/studio/:projectId/validate', async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;

    const artifact = await prisma.artifact.findFirst({
      where: {
        id: projectId,
        type: 'studio-project',
        tenantId: req.user!.tenantId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        metadata: true,
        tags: true,
        status: true,
      },
    });

    if (!artifact) {
      res.status(404).json({
        success: false,
        error: `Studio project not found: ${projectId}`,
      });
      return;
    }

    // Validate the project content
    const issues: Array<{ severity: string; message: string; field: string }> = [];
    const content = artifact.content as { pages?: Array<{ title?: string; content?: string; type?: string }> } | null;

    // Check that pages array exists
    if (!content || !Array.isArray(content.pages)) {
      issues.push({
        severity: 'error',
        message: 'Project content must contain a pages array',
        field: 'content.pages',
      });
    } else {
      // Check each page for required fields
      content.pages.forEach((page, index) => {
        if (!page.title) {
          issues.push({
            severity: 'error',
            message: `Page ${index + 1} is missing a title`,
            field: `content.pages[${index}].title`,
          });
        }
        if (!page.content && !page.type) {
          issues.push({
            severity: 'warning',
            message: `Page ${index + 1} has no content or type defined`,
            field: `content.pages[${index}]`,
          });
        }
      });

      // Check minimum page count
      if (content.pages.length === 0) {
        issues.push({
          severity: 'warning',
          message: 'Project has no pages',
          field: 'content.pages',
        });
      }
    }

    // Check that the project has a title
    if (!artifact.title || artifact.title.trim().length === 0) {
      issues.push({
        severity: 'error',
        message: 'Project must have a title',
        field: 'title',
      });
    }

    // Check tags for discoverability
    if (!artifact.tags || artifact.tags.length === 0) {
      issues.push({
        severity: 'warning',
        message: 'Adding tags improves discoverability',
        field: 'tags',
      });
    }

    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const valid = errorCount === 0;
    const pageCount = content?.pages?.length || 0;

    // Calculate a readiness score (0-1)
    // Start at 1.0, deduct 0.2 per error, 0.05 per warning
    const decodabilityScore = Math.max(
      0,
      1.0 - errorCount * 0.2 - warningCount * 0.05
    );

    res.json({
      success: true,
      data: {
        projectId: artifact.id,
        valid,
        decodabilityScore: Math.round(decodabilityScore * 100) / 100,
        pageCount,
        issues,
        summary: {
          errors: errorCount,
          warnings: warningCount,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to validate studio project' });
  }
});

// ============================================================================
// API Keys
// ============================================================================

const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  permissions: z.array(z.enum(['read', 'write', 'delete'])).min(1),
});

developerPortalRouter.post('/api-keys', async (req: Request, res: Response) => {
  try {
    const parsed = createApiKeySchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: 'Validation failed', details: parsed.error.flatten() });
      return;
    }

    const { name, permissions } = parsed.data;
    const tenantId = req.user!.tenantId;
    const developerId = req.user!.id;

    // Generate a secure API key
    const keyBytes = crypto.randomBytes(32);
    const fullKey = `sk_prod_${keyBytes.toString('hex')}`;
    const prefix = `sk_prod_...${keyBytes.toString('hex').slice(-4)}`;
    const keyHash = crypto.createHash('sha256').update(fullKey).digest('hex');

    const apiKey = await prisma.developerApiKey.create({
      data: {
        tenantId,
        developerId,
        name,
        prefix,
        keyHash,
        permissions,
        status: 'active',
      },
    });

    res.status(201).json({
      success: true,
      data: {
        id: apiKey.id,
        name: apiKey.name,
        prefix: apiKey.prefix,
        key: fullKey, // Only returned once on creation
        permissions: apiKey.permissions,
        createdAt: apiKey.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to create API key' });
  }
});

developerPortalRouter.get('/api-keys', async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const developerId = req.user!.id;

    const keys = await prisma.developerApiKey.findMany({
      where: { tenantId, developerId },
      select: {
        id: true,
        name: true,
        prefix: true,
        permissions: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      success: true,
      data: keys.map(k => ({
        ...k,
        lastUsedAt: k.lastUsedAt?.toISOString() || null,
        expiresAt: k.expiresAt?.toISOString() || null,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve API keys' });
  }
});

developerPortalRouter.delete('/api-keys/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenantId = req.user!.tenantId;
    const developerId = req.user!.id;

    const key = await prisma.developerApiKey.findFirst({
      where: { id, tenantId, developerId },
    });

    if (!key) {
      res.status(404).json({ success: false, error: 'API key not found' });
      return;
    }

    await prisma.developerApiKey.update({
      where: { id },
      data: { status: 'revoked' },
    });

    res.json({ success: true, data: { id, status: 'revoked' } });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to revoke API key' });
  }
});

// ============================================================================
// Webhook Test
// ============================================================================

developerPortalRouter.post('/webhooks/:webhookId/test', async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    const tenantId = req.user!.tenantId;

    const webhook = await prisma.webhookSubscription.findFirst({
      where: { id: webhookId, tenantId, developerId: req.user!.id },
    });

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    // Send test payload
    const testPayload = {
      event: 'test.ping',
      timestamp: new Date().toISOString(),
      data: { message: 'This is a test webhook delivery from Scholarly' },
    };

    const signature = crypto.createHmac('sha256', webhook.secret).update(JSON.stringify(testPayload)).digest('hex');
    const start = Date.now();

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Scholarly-Signature': `sha256=${signature}`,
          'X-Scholarly-Event': 'test.ping',
        },
        body: JSON.stringify(testPayload),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const responseTime = Date.now() - start;

      // Record delivery
      await prisma.webhookDelivery.create({
        data: {
          subscriptionId: webhookId,
          eventType: 'test.ping',
          payload: testPayload,
          statusCode: response.status,
          success: response.ok,
          attempt: 1,
        },
      });

      res.json({
        success: true,
        data: {
          success: response.ok,
          statusCode: response.status,
          responseTime,
        },
      });
    } catch (fetchErr) {
      const responseTime = Date.now() - start;
      res.json({
        success: true,
        data: {
          success: false,
          statusCode: null,
          responseTime,
          error: fetchErr instanceof Error ? fetchErr.message : 'Connection failed',
        },
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to test webhook' });
  }
});

// ============================================================================
// Webhook Deliveries
// ============================================================================

developerPortalRouter.get('/webhooks/:webhookId/deliveries', async (req: Request, res: Response) => {
  try {
    const { webhookId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const webhook = await prisma.webhookSubscription.findFirst({
      where: { id: webhookId, developerId: req.user!.id, tenantId: req.user!.tenantId },
    });

    if (!webhook) {
      res.status(404).json({ success: false, error: 'Webhook not found' });
      return;
    }

    const deliveries = await prisma.webhookDelivery.findMany({
      where: { subscriptionId: webhookId },
      select: {
        id: true,
        eventType: true,
        statusCode: true,
        success: true,
        attempt: true,
        deliveredAt: true,
      },
      orderBy: { deliveredAt: 'desc' },
      take: limit,
    });

    res.json({ success: true, data: deliveries });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve webhook deliveries' });
  }
});

// ============================================================================
// Analytics
// ============================================================================

developerPortalRouter.get('/analytics/usage', async (req: Request, res: Response) => {
  try {
    const period = (req.query.period as string) || '7d';
    const days = period === '30d' ? 30 : period === '90d' ? 90 : 7;
    const since = new Date(Date.now() - days * 86400000);

    // Aggregate from webhook deliveries as a proxy for API usage
    const deliveries = await prisma.webhookDelivery.findMany({
      where: {
        subscription: {
          developerId: req.user!.id,
          tenantId: req.user!.tenantId,
        },
        deliveredAt: { gte: since },
      },
      select: {
        deliveredAt: true,
        success: true,
      },
      orderBy: { deliveredAt: 'asc' },
    });

    // Group by day
    const dayMap = new Map<string, { requests: number; errors: number }>();
    for (const d of deliveries) {
      const key = d.deliveredAt.toISOString().slice(0, 10);
      const entry = dayMap.get(key) || { requests: 0, errors: 0 };
      entry.requests++;
      if (!d.success) entry.errors++;
      dayMap.set(key, entry);
    }

    const data = Array.from(dayMap.entries()).map(([date, stats]) => ({
      date,
      requests: stats.requests,
      errors: stats.errors,
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve usage analytics' });
  }
});

developerPortalRouter.get('/analytics/revenue', async (req: Request, res: Response) => {
  try {
    // Return developer earnings aggregated by month
    const account = await prisma.developerAccount.findUnique({
      where: { userId: req.user!.id },
      select: { totalEarnings: true },
    });

    // Generate placeholder monthly data based on total earnings
    const total = Number(account?.totalEarnings || 0);
    const months = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec', 'Jan'];
    const data = months.map((month, i) => ({
      month,
      revenue: Math.round((total / 7) * (0.5 + i * 0.15)),
    }));

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve revenue analytics' });
  }
});

developerPortalRouter.get('/analytics/payouts', async (req: Request, res: Response) => {
  try {
    // Placeholder — return empty until payment integration is complete
    res.json({ success: true, data: [] });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve payouts' });
  }
});

// ============================================================================
// AI Code Snippet Generation
// ============================================================================

developerPortalRouter.post('/ai/generate-snippet', async (req: Request, res: Response) => {
  try {
    const { endpointPath, method, language } = req.body;

    if (!endpointPath || !method || !language) {
      res.status(400).json({ success: false, error: 'endpointPath, method, and language are required' });
      return;
    }

    const baseUrl = 'https://scholarly-api.bravefield-dce0abaf.australiaeast.azurecontainerapps.io/api/v1';

    const snippets: Record<string, string> = {
      typescript: `const response = await fetch('${baseUrl}${endpointPath}', {\n  method: '${method}',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer YOUR_API_KEY',\n  },\n});\n\nconst data = await response.json();\nconsole.log(data);`,
      python: `import requests\n\nresponse = requests.${method.toLowerCase()}(\n    '${baseUrl}${endpointPath}',\n    headers={'Authorization': 'Bearer YOUR_API_KEY'},\n)\n\ndata = response.json()\nprint(data)`,
      curl: `curl -X ${method} '${baseUrl}${endpointPath}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer YOUR_API_KEY'`,
    };

    res.json({
      success: true,
      data: {
        language,
        code: snippets[language] || snippets.typescript,
        endpoint: endpointPath,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to generate code snippet' });
  }
});

// ============================================================================
// AI Documentation Search
// ============================================================================

developerPortalRouter.post('/ai/search-docs', async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ success: false, error: 'query is required' });
      return;
    }

    const q = query.toLowerCase();
    const results: Array<{ category: string; endpoint: object; relevance: number }> = [];

    for (const [_key, doc] of Object.entries(API_DOCUMENTATION)) {
      for (const endpoint of doc.endpoints) {
        const text = `${doc.category} ${doc.description} ${endpoint.description} ${endpoint.path}`.toLowerCase();
        if (text.includes(q)) {
          results.push({
            category: doc.category,
            endpoint,
            relevance: text.split(q).length - 1,
          });
        }
      }
    }

    results.sort((a, b) => b.relevance - a.relevance);

    res.json({ success: true, data: results.slice(0, 10) });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to search documentation' });
  }
});

// ============================================================================
// Developer Tiers
// ============================================================================

developerPortalRouter.get('/tier', async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;

    const account = await prisma.developerAccount.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        accountType: true,
        verificationStatus: true,
        revenueShare: true,
        status: true,
        totalEarnings: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: { apps: true },
        },
      },
    });

    // Determine the current tier based on account data
    let currentTier = 'Explorer';
    if (account) {
      const earnings = Number(account.totalEarnings);
      const appCount = account._count.apps;

      if (account.accountType === 'enterprise' || earnings >= 100_000) {
        currentTier = 'Enterprise';
      } else if (appCount >= 3 || earnings >= 10_000) {
        currentTier = 'Professional';
      } else if (appCount >= 1 || earnings >= 1_000) {
        currentTier = 'Builder';
      }
    }

    const tierDefinition = TIER_DEFINITIONS.find((t) => t.name === currentTier)!;

    res.json({
      success: true,
      data: {
        currentTier,
        tierDetails: tierDefinition,
        account: account
          ? {
              id: account.id,
              name: account.name,
              accountType: account.accountType,
              verificationStatus: account.verificationStatus,
              revenueShare: account.revenueShare,
              status: account.status,
              totalEarnings: account.totalEarnings.toString(),
              appCount: account._count.apps,
              createdAt: account.createdAt,
              updatedAt: account.updatedAt,
            }
          : null,
        tiers: TIER_DEFINITIONS,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to retrieve developer tier information' });
  }
});
