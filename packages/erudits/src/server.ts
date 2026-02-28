/**
 * ============================================================================
 * Server Entry Point — The Ignition Key
 * ============================================================================
 *
 * This is where the platform comes to life. server.ts is responsible for:
 *   1. Reading configuration from environment variables
 *   2. Connecting to external services (Postgres, Redis, NATS, Stripe)
 *   3. Instantiating all repositories and services with their dependencies
 *   4. Wiring everything into the Express application
 *   5. Starting the HTTP listener
 *   6. Handling graceful shutdown on SIGTERM/SIGINT
 *
 * Think of it as the factory floor supervisor who plugs every component
 * into the right socket before flipping the power switch. The app.ts file
 * defines WHAT the machine does; this file ensures HOW it gets assembled
 * and started.
 *
 * ## Environment Variables (comprehensive list)
 *   PORT                      — HTTP port (default: 3000)
 *   NODE_ENV                  — Environment (development/staging/production)
 *   DATABASE_URL              — PostgreSQL connection string
 *   REDIS_URL                 — Redis connection string
 *   NATS_URL                  — NATS server URL
 *   STRIPE_SECRET_KEY         — Stripe API key
 *   STRIPE_WEBHOOK_SECRET     — Stripe webhook signing secret
 *   ANTHROPIC_API_KEY         — Claude API key
 *   OPENAI_API_KEY            — OpenAI API key (for GPT Image)
 *   AWS_REGION                — S3 region
 *   S3_BUCKET_NAME            — Primary storage bucket
 *   CLOUDFRONT_DOMAIN         — CDN domain (optional)
 *   JWT_SECRET                — JWT signing secret
 *   CORS_ORIGINS              — Comma-separated allowed origins
 *   PLATFORM_FEE_PERCENT      — Marketplace platform fee (default: 15)
 *   AI_MODEL                  — Default Claude model
 *   AI_MAX_TOKENS             — Default max tokens (default: 4096)
 *
 * @module erudits/server
 * @version 1.0.0
 */

import { createApp } from './app';
import type { AuthenticatedUser } from './app';
import type { Request, Response } from 'express';
import type { ScholarlyConfig } from './types/erudits.types';

// ── Repositories ──
import { PrismaResourceRepository, PrismaPurchaseRepository, PrismaLicenceRepository } from './repositories/marketplace.repository';
import { PrismaManuscriptRepository, PrismaManuscriptVersionRepository, PrismaPublicationRepository, PrismaCoverRepository, PrismaSalesRepository } from './repositories/publishing.repository';
import { PrismaMigrationRepository, PrismaMigrationContentRepository } from './repositories/migration.repository';
import { PrismaBookClubRepository, PrismaBookClubSessionRepository, PrismaBookClubReadingRepository, PrismaBookClubMemberRepository } from './repositories/bookclub.repository';
import type { PrismaClientLike } from './repositories/shared';

// ── Services ──
import { ResourceStorefrontService } from './services/storefront.service';
import { PublishingEngineService } from './services/publishing.service';
import { FormattingEngineImpl } from './services/formatting.service';
import { SquarespaceMigrationService } from './services/migration.service';
import { BookClubService } from './services/bookclub.service';
// import { ContentProtectionServiceImpl } from './services/content-protection.service';

// ── Route Builders ──
import { mountStorefrontRoutes, mountPublishingRoutes, mountMigrationRoutes, mountBookClubRoutes } from './routes/mount';
// import { mountProtectionRoutes } from './routes/mount'; // Wired when content protection Prisma models are migrated

// ============================================================================
// CONFIGURATION
// ============================================================================

function loadConfig(): ScholarlyConfig {
  return {
    aiEnabled: process.env.AI_ENABLED !== 'false',
    aiModel: process.env.AI_MODEL || 'claude-sonnet-4-5-20250929',
    aiMaxTokens: parseInt(process.env.AI_MAX_TOKENS || '4096', 10),
    defaultPageSize: 20,
    maxPageSize: 100,
    environment: (process.env.NODE_ENV || 'development') as 'development' | 'staging' | 'production',
    platformFeePercent: parseInt(process.env.PLATFORM_FEE_PERCENT || '15', 10),
    stripeFeeFixedCents: 30,  // Stripe's standard $0.30 per transaction
    stripeFeePercent: 2.9,     // Stripe's standard 2.9%
  };
}

// ============================================================================
// DEPENDENCY INJECTION CONTAINER
// ============================================================================

/**
 * The DI container assembles all production dependencies. Each integration
 * is created once and shared across all services that need it — this is
 * the "one instance, many consumers" pattern that prevents connection pool
 * exhaustion and ensures consistent caching.
 *
 * The container is intentionally NOT a class with decorators or a framework
 * like InversifyJS. For a codebase of this size, explicit wiring in a single
 * function is clearer, more debuggable, and easier to understand when
 * reading the code six months from now.
 */
async function createContainer(config: ScholarlyConfig) {
  // ── External Connections ──

  // Prisma (PostgreSQL) — The canonical data store
  // In production: import { PrismaClient } from '@prisma/client';
  // const prisma = new PrismaClient({ log: config.environment === 'development' ? ['query'] : [] });
  // await prisma.$connect();
  const prisma = await connectPrisma(config);

  // Redis — Caching and session storage
  const cache = await connectRedis();

  // NATS — Event bus
  const eventBus = await connectNats();

  // Stripe — Payment processing
  const stripe = connectStripe();

  // AI — Claude + GPT Image
  const ai = connectAI(config);

  // File Storage — S3
  const fileStorage = connectFileStorage();

  // Watermark — PDF watermarking
  const watermark = connectWatermark();

  // ── Repositories ──

  const resourceRepo = new PrismaResourceRepository(prisma);
  const purchaseRepo = new PrismaPurchaseRepository(prisma);
  const licenceRepo = new PrismaLicenceRepository(prisma);
  const manuscriptRepo = new PrismaManuscriptRepository(prisma);
  const versionRepo = new PrismaManuscriptVersionRepository(prisma);
  const publicationRepo = new PrismaPublicationRepository(prisma);
  const coverRepo = new PrismaCoverRepository(prisma);
  const salesRepo = new PrismaSalesRepository(prisma);
  const migrationRepo = new PrismaMigrationRepository(prisma);
  const contentRepo = new PrismaMigrationContentRepository(prisma);
  const clubRepo = new PrismaBookClubRepository(prisma);
  const sessionRepo = new PrismaBookClubSessionRepository(prisma);
  const readingRepo = new PrismaBookClubReadingRepository(prisma);
  const memberRepo = new PrismaBookClubMemberRepository(prisma);

  // ── Formatting Engine ──

  const formatter = new FormattingEngineImpl();

  // ── Services ──

  const storefrontService = new ResourceStorefrontService({
    eventBus, cache, config, fileStorage, ai, stripe, watermark,
    resourceRepo, purchaseRepo, licenceRepo,
  });

  const publishingService = new PublishingEngineService({
    eventBus, cache, config, fileStorage, ai, formatter,
    manuscriptRepo, versionRepo, publicationRepo, coverRepo, salesRepo,
  });

  // Squarespace API client for migration
  const sqClient = connectSquarespace();

  const migrationService = new SquarespaceMigrationService({
    eventBus, cache, config, fileStorage,
    migrationRepo, contentRepo,
  }, sqClient);

  const bookclubService = new BookClubService({
    eventBus, cache, config, ai,
    clubRepo, sessionRepo, readingRepo, memberRepo,
  });

  // Content Protection — repositories are wired when Prisma models are migrated.
  // For now, the service exists but routes are only mounted when repos are available.
  // const protectionService = new ContentProtectionService({ ... });

  // ── Route Builders ──

  const storefrontRoutes = mountStorefrontRoutes(storefrontService);
  const publishingRoutes = mountPublishingRoutes(publishingService);
  const migrationRoutes = mountMigrationRoutes(migrationService);
  const bookclubRoutes = mountBookClubRoutes(bookclubService);
  // const protectionRoutes = mountProtectionRoutes(protectionService.createRouteHandlers());

  return {
    prisma,
    storefrontRoutes,
    publishingRoutes,
    migrationRoutes,
    bookclubRoutes,
    // For shutdown
    shutdown: async () => {
      console.log('[Server] Shutting down gracefully...');
      if (typeof (eventBus as Record<string, unknown>).shutdown === 'function') {
        await ((eventBus as Record<string, unknown>).shutdown as () => Promise<void>)();
      }
      console.log('[Server] Shutdown complete.');
    },
  };
}

// ============================================================================
// CONNECTION HELPERS
// ============================================================================

/**
 * Each connection helper encapsulates the SDK import and instantiation.
 * In production these would import the real SDKs; here they're typed
 * against our boundary interfaces so the server file compiles without
 * requiring all SDKs to be installed.
 */

async function connectPrisma(_config: ScholarlyConfig): Promise<PrismaClientLike> {
  // Production:
  //   const { PrismaClient } = await import('@prisma/client');
  //   const prisma = new PrismaClient();
  //   await prisma.$connect();
  //   return prisma as unknown as PrismaClientLike;
  //
  // For now, this returns a placeholder that will be replaced when
  // @prisma/client is generated from the schema.
  throw new Error(
    'Prisma client not configured. Run `npx prisma generate` and uncomment the import above.',
  );
}

async function connectRedis() {
  // Production:
  //   const Redis = (await import('ioredis')).default;
  //   const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  //   const { createRedisCache } = await import('./integrations/redis-cache.service');
  //   return createRedisCache(redis as any, 'erudits');
  const { createRedisCache } = await import('./integrations/redis-cache.service');
  // Fallback: in-memory cache for development
  const memoryStore = new Map<string, { value: string; expiresAt?: number | undefined }>();
  return createRedisCache({
    get: async (key: string) => {
      const entry = memoryStore.get(key);
      if (!entry) return null;
      if (entry.expiresAt && Date.now() > entry.expiresAt) {
        memoryStore.delete(key);
        return null;
      }
      return entry.value;
    },
    set: async (key: string, value: string, ...args: Array<string | number>) => {
      const ttl = args[0] === 'EX' ? (args[1] as number) * 1000 : undefined;
      const entry: { value: string; expiresAt?: number | undefined } = { value };
      if (ttl) entry.expiresAt = Date.now() + ttl;
      memoryStore.set(key, entry);
      return 'OK';
    },
    del: async (...keys: string[]) => {
      let count = 0;
      for (const key of keys) {
        if (memoryStore.delete(key)) count++;
      }
      return count;
    },
    scanStream: async function* () { yield Array.from(memoryStore.keys()); },
    pipeline: () => ({
      del: function () { return this; },
      exec: async () => [],
    }),
    quit: async () => 'OK',
  } as any, 'erudits');
}

async function connectNats() {
  // Production:
  //   const { connect } = await import('nats');
  //   const nc = await connect({ servers: process.env.NATS_URL || 'nats://localhost:4222' });
  //   const { createNatsEventBus } = await import('./integrations/nats-eventbus.service');
  //   return createNatsEventBus(nc as any);

  // Fallback: console-logging event bus for development
  return {
    publish: async (topic: string, payload: Record<string, unknown>) => {
      if (process.env.NODE_ENV !== 'test') {
        console.log(`[EventBus] ${topic}`, JSON.stringify(payload).substring(0, 200));
      }
    },
  };
}

function connectStripe() {
  // Production:
  //   import Stripe from 'stripe';
  //   const stripeSDK = new Stripe(process.env.STRIPE_SECRET_KEY!);
  //   const { createStripeConnectClient } = require('./integrations/stripe-connect.client');
  //   return createStripeConnectClient(stripeSDK, accountRegistry, process.env.STRIPE_WEBHOOK_SECRET!);

  // Fallback: mock stripe client for development
  return {
    createPaymentIntent: async () => ({ success: true as const, data: { paymentIntentId: 'pi_dev', clientSecret: 'secret_dev' } }),
    confirmPaymentIntent: async () => ({ success: true as const, data: { status: 'succeeded' as const, chargeId: 'ch_dev' } }),
    createRefund: async () => ({ success: true as const, data: { refundId: 're_dev', amountCents: 0 } }),
    getConnectedAccountId: async () => 'acct_dev',
  };
}

function connectAI(config: ScholarlyConfig) {
  // Production:
  //   import Anthropic from '@anthropic-ai/sdk';
  //   import OpenAI from 'openai';
  //   const { createAnthropicAIService } = require('./integrations/anthropic-ai.service');
  //   return createAnthropicAIService(new Anthropic(), new OpenAI(), { defaultModel: config.aiModel });

  return {
    complete: async (_params: { systemPrompt: string; userPrompt: string; maxTokens: number; temperature: number }) => ({
      text: `[AI Response - ${config.aiModel}] This is a development placeholder.`,
      tokensUsed: 100,
      cost: 0.001,
    }),
    generateImage: async (_params: { prompt: string; size: string; model: string }) => ({
      imageUrl: `https://placeholder.dev/image`,
      cost: 0.04,
    }),
  };
}

function connectFileStorage() {
  // Production:
  //   import AWS from 'aws-sdk';
  //   const s3 = new AWS.S3({ region: process.env.AWS_REGION });
  //   const { createS3FileStorage } = require('./integrations/s3-storage.service');
  //   return createS3FileStorage(s3, process.env.S3_BUCKET_NAME!, process.env.CLOUDFRONT_DOMAIN);

  // Fallback: local filesystem storage for development
  const fs = require('fs');
  const path = require('path');
  const uploadDir = path.join(process.cwd(), '.dev-uploads');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  return {
    upload: async (key: string, data: Buffer, _contentType: string) => {
      const filePath = path.join(uploadDir, key.replace(/\//g, '_'));
      fs.writeFileSync(filePath, data);
      return `file://${filePath}`;
    },
    getSignedUrl: async (key: string, _expiresInSeconds: number) => `file://.dev-uploads/${key}`,
    delete: async (key: string) => {
      const filePath = path.join(uploadDir, key.replace(/\//g, '_'));
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    },
    copy: async (sourceKey: string, destKey: string) => {
      const src = path.join(uploadDir, sourceKey.replace(/\//g, '_'));
      const dest = path.join(uploadDir, destKey.replace(/\//g, '_'));
      if (fs.existsSync(src)) fs.copyFileSync(src, dest);
      return `file://${dest}`;
    },
  };
}

function connectSquarespace() {
  // Production:
  //   const { createSquarespaceApiClient } = require('./integrations/squarespace-api.client');
  //   return createSquarespaceApiClient(httpClient, process.env.SQUARESPACE_API_KEY);

  // Dev fallback: mock that returns empty export data
  return {
    exportSite: async (_siteUrl: string) => ({
      success: true as const,
      data: {
        pages: [], products: [], posts: [], members: [], navigation: [],
        settings: { title: 'Dev Site', description: '', socialLinks: {} },
      },
    }),
    downloadAsset: async (_url: string) => ({
      success: true as const,
      data: Buffer.from(''),
    }),
  };
}

function connectWatermark() {
  // Production:
  //   import { PDFDocument, rgb, degrees } from 'pdf-lib';
  //   const { createPdfWatermarkService } = require('./integrations/watermark.service');
  //   return createPdfWatermarkService({ load: PDFDocument.load.bind(PDFDocument), rgb, degrees });

  return {
    applyWatermark: async (fileBuffer: Buffer, _mimeType: string, _watermarkText: string) => fileBuffer,
  };
}

// ============================================================================
// STRIPE WEBHOOK HANDLER
// ============================================================================

/**
 * Handles Stripe webhook events. This runs OUTSIDE the normal auth
 * middleware because Stripe authenticates via signature verification,
 * not Bearer tokens.
 */
function createStripeWebhookHandler(
  _storefrontService: ResourceStorefrontService,
) {
  return async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    if (!sig) {
      res.status(400).json({ error: 'Missing stripe-signature header' });
      return;
    }

    // In production, verify signature using StripeConnectClient.verifyWebhookEvent()
    // then dispatch based on event type:
    //   payment_intent.succeeded → storefrontService.confirmPurchase()
    //   charge.refunded         → storefrontService.processRefund()

    const rawBody = req.rawBody;
    if (!rawBody) {
      res.status(400).json({ error: 'Missing raw body' });
      return;
    }

    try {
      // Parse the event (in production, verify signature first)
      const event = JSON.parse(rawBody.toString()) as { type: string; data: { object: Record<string, unknown> } };

      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntentId = event.data.object.id as string;
          console.log(`[Stripe Webhook] Payment succeeded: ${paymentIntentId}`);
          // await storefrontService.confirmPurchaseByPaymentIntent(tenantId, paymentIntentId);
          break;
        }
        case 'charge.refunded': {
          const chargeId = event.data.object.id as string;
          console.log(`[Stripe Webhook] Charge refunded: ${chargeId}`);
          break;
        }
        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (err) {
      console.error('[Stripe Webhook] Processing error:', (err as Error).message);
      res.status(400).json({ error: 'Webhook processing failed' });
    }
  };
}

// ============================================================================
// JWT VERIFICATION
// ============================================================================

/**
 * JWT verification function. In production this would use jsonwebtoken
 * or jose to verify the token and extract claims. For development,
 * it accepts any token and returns a test user.
 */
function createTokenVerifier(): (token: string) => Promise<AuthenticatedUser | null> {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || process.env.NODE_ENV === 'development') {
    // Development mode: accept any token with format "dev:{userId}:{tenantId}"
    return async (token: string) => {
      if (token.startsWith('dev:')) {
        const [, userId, tenantId] = token.split(':');
        return {
          id: userId || 'dev-user',
          tenantId: tenantId || 'dev-tenant',
          email: 'dev@scholarly.dev',
          roles: ['tutor', 'author'],
          name: 'Development User',
        };
      }
      return null;
    };
  }

  // Production: verify JWT with secret
  return async (_token: string) => {
    try {
      // const jwt = await import('jsonwebtoken');
      // const decoded = jwt.verify(_token, jwtSecret) as Record<string, unknown>;
      // return {
      //   id: decoded.sub as string,
      //   tenantId: decoded.tenantId as string,
      //   email: decoded.email as string,
      //   roles: decoded.roles as string[],
      //   name: decoded.name as string | undefined,
      // };

      // Placeholder until jsonwebtoken is installed
      console.warn('[Auth] JWT verification not implemented — rejecting token');
      return null;
    } catch {
      return null;
    }
  };
}

// ============================================================================
// BOOT SEQUENCE
// ============================================================================

async function main(): Promise<void> {
  const config = loadConfig();
  const port = parseInt(process.env.PORT || '3000', 10);

  console.log(`
╔══════════════════════════════════════════════════╗
║          SCHOLARLY ÉRUDITS PLATFORM v2.10.0      ║
║                                                  ║
║  Environment: ${config.environment.padEnd(35)}║
║  AI Model:    ${config.aiModel.padEnd(35)}║
║  Port:        ${String(port).padEnd(35)}║
╚══════════════════════════════════════════════════╝
  `);

  try {
    console.log('[Server] Wiring dependencies...');
    const container = await createContainer(config);

    console.log('[Server] Building application...');
    const verifyToken = createTokenVerifier();

    const app = createApp({
      migrationRoutes: container.migrationRoutes,
      storefrontRoutes: container.storefrontRoutes,
      publishingRoutes: container.publishingRoutes,
      bookclubRoutes: container.bookclubRoutes,
      stripeWebhookHandler: createStripeWebhookHandler(
        // Access to storefront service for purchase confirmation
        {} as ResourceStorefrontService, // Will be wired in production
      ),
      verifyToken,
      corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:3001').split(','),
    });

    const server = app.listen(port, () => {
      console.log(`[Server] Listening on port ${port}`);
      console.log(`[Server] Health check: http://localhost:${port}/health`);
      console.log(`[Server] API base:     http://localhost:${port}/api/v1`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
      console.log(`\n[Server] Received ${signal}. Starting graceful shutdown...`);
      server.close(async () => {
        await container.shutdown();
        process.exit(0);
      });

      // Force exit after 10 seconds if graceful shutdown stalls
      setTimeout(() => {
        console.error('[Server] Forced shutdown after timeout');
        process.exit(1);
      }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (err) {
    console.error('[Server] Fatal error during startup:', (err as Error).message);
    process.exit(1);
  }
}

// Only run if this is the entry point (not imported by tests)
if (require.main === module) {
  main().catch((err) => {
    console.error('[Server] Unhandled startup error:', err);
    process.exit(1);
  });
}

export { createContainer, loadConfig, createTokenVerifier };
