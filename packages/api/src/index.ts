/**
 * Scholarly API Server
 * RESTful API for the Unified Learning Nexus
 */

import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import 'express-async-errors';
import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { prisma } from '@scholarly/database';
import { logger } from './lib/logger';

// Hardening middleware
import { correlationIdMiddleware } from './middleware/request-id';
import { healthRouter } from './middleware/health';
import { metricsMiddleware, metricsRouter } from './middleware/metrics';
import { swaggerRouter } from './middleware/swagger';
import { auditMiddleware } from './middleware/audit';

// Routes
import { authRouter } from './routes/auth';
import { usersRouter } from './routes/users';
import { tutorsRouter } from './routes/tutors';
import { bookingsRouter } from './routes/bookings';
import { sessionsRouter } from './routes/sessions';
import { curriculumRouter } from './routes/curriculum';
import { contentRouter } from './routes/content';
import { homeschoolRouter } from './routes/homeschool';
import { microSchoolRouter } from './routes/micro-school';
import { reliefRouter } from './routes/relief';
import { dashboardRouter } from './routes/dashboard';
import { aiBuddyRouter } from './routes/ai-buddy';
import { portfolioRouter } from './routes/portfolio';
import { standardsComplianceRouter } from './routes/standards-compliance';
import { analyticsRouter } from './routes/analytics';
import { dataLakeRouter } from './routes/data-lake';
import { mlPipelineRouter } from './routes/ml-pipeline';
import { designPitchRouter } from './routes/design-pitch-ai';
import { showcasePortfolioRouter } from './routes/showcase-portfolio';
import { earlyYearsRouter, earlyYearsTtsRouter } from './routes/early-years';
import { linguaFlowRouter } from './routes/linguaflow';
import { interoperabilityRouter } from './routes/interoperability';
import { goldenPathRouter } from './routes/golden-path';
import { ssiRouter } from './routes/ssi';
import { advancedLearningRouter } from './routes/advanced-learning';
import { governanceRouter } from './routes/governance';
import { marketplaceRouter } from './routes/marketplace';
import { subscriptionsRouter } from './routes/subscriptions';
import { identityRouter } from './routes/identity';
import { createPaymentRouter } from './routes/payment';
import { hostingRouter } from './routes/hosting';
import { verificationRouter } from './routes/verification';
import voiceIntelligenceRouter from './routes/voice-intelligence';
import knowledgeWorkspaceRouter from './routes/knowledge-workspace';
import { googleDriveRouter } from './routes/google-drive';
import oneDriveRouter from './routes/onedrive';

// Sprint Module Routes (Sprints 1-18)
import { storybookRouter } from './routes/storybook';
import { arenaRouter } from './routes/arena';
import { developerPortalRouter } from './routes/developer-portal';
import { aiEngineRouter } from './routes/ai-engine';
import { complianceRouter } from './routes/compliance';
import { parentPortalRouter } from './routes/parent-portal';
import { collaborationRouter } from './routes/collaboration';
import { tutorOnboardingRouter } from './routes/tutor-onboarding';

// S&R Canvas
import { mountSRRoutes } from './routes/sr.routes';
import {
  NodeTypeRegistry,
  WorkflowRunner,
} from './services/sr/sr-workflow-engine';
import {
  PrismaWorkflowStore,
  PrismaRunStore,
  PersistentEventBus,
} from './services/sr/sr-prisma-stores';
import { registerMigrationNodes } from './services/sr/sr-migration-workflow-template';
import { registerCompetitionNodes } from './services/sr/sr-competition-workflow-template';

// Middleware
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';

// Service initialization
import { initializeHostingServices } from './lib/hosting-init';
import { initializeTutorOnboarding } from './services/tutor-onboarding/bootstrap';
import { initializeKeys } from './config/keys';

const app: Application = express();
const PORT = process.env.PORT || 3001;

// Trust proxy when behind a reverse proxy (Azure Container Apps, nginx, etc.)
app.set('trust proxy', 1);

// Correlation ID — must be first for tracing
app.use(correlationIdMiddleware);

// Metrics collection
app.use(metricsMiddleware);

// Global middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use((_req, res, next) => {
  res.setTimeout(30000, () => {
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Health & monitoring endpoints (unauthenticated)
app.use(healthRouter);

// Internal monitoring protection for production
const internalMonitoringAuth: express.RequestHandler = (req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction) {
    return next();
  }

  const internalKey = process.env.INTERNAL_API_KEY;
  if (!internalKey) {
    return res.status(404).end();
  }

  const providedKey = req.header('x-internal-api-key');
  if (providedKey && providedKey === internalKey) {
    return next();
  }

  return res.status(401).json({ error: 'Unauthorized' });
};

app.use(internalMonitoringAuth, metricsRouter);

// API documentation (protected in production)
app.use('/api/docs', internalMonitoringAuth, swaggerRouter);

// Audit middleware — captures mutations for compliance
app.use(auditMiddleware);

// Auth rate limiter: only applies to login/register, NOT to /me or /refresh
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later' },
  // Only count POST requests to login/register
  skip: (req) => !['login', 'register'].some(path => req.path.endsWith(`/${path}`)),
});

// API version prefix
const api = express.Router();

// Public routes
api.use('/auth', authRateLimiter, authRouter);
api.use('/early-years', earlyYearsTtsRouter); // Public TTS for phonics audio

// Protected routes
api.use('/users', authMiddleware, usersRouter);
api.use('/tutors', authMiddleware, tutorsRouter);
api.use('/bookings', authMiddleware, bookingsRouter);
api.use('/sessions', authMiddleware, sessionsRouter);
api.use('/curriculum', authMiddleware, curriculumRouter);
api.use('/content', authMiddleware, contentRouter);
api.use('/homeschool', authMiddleware, homeschoolRouter);
api.use('/micro-schools', authMiddleware, microSchoolRouter);
api.use('/relief', authMiddleware, reliefRouter);
api.use('/dashboard', authMiddleware, dashboardRouter);
api.use('/ai-buddy', authMiddleware, aiBuddyRouter);
api.use('/portfolio', authMiddleware, portfolioRouter);
api.use('/standards', authMiddleware, standardsComplianceRouter);
api.use('/analytics', authMiddleware, analyticsRouter);
api.use('/data-lake', authMiddleware, dataLakeRouter);
api.use('/ml', authMiddleware, mlPipelineRouter);
api.use('/design-pitch', authMiddleware, designPitchRouter);
api.use('/showcase', showcasePortfolioRouter); // Has both public and protected routes
api.use('/early-years', authMiddleware, earlyYearsRouter);
api.use('/linguaflow', authMiddleware, linguaFlowRouter);
api.use('/interoperability', authMiddleware, interoperabilityRouter);
api.use('/golden-path', authMiddleware, goldenPathRouter);
api.use('/ssi', authMiddleware, ssiRouter);
api.use('/advanced-learning', authMiddleware, advancedLearningRouter);
api.use('/governance', authMiddleware, governanceRouter);
api.use('/marketplace', authMiddleware, marketplaceRouter);
api.use('/subscriptions', authMiddleware, subscriptionsRouter);
api.use('/identity', authMiddleware, identityRouter);
api.use('/payment', authMiddleware, createPaymentRouter());
api.use('/hosting', hostingRouter); // Has both public and protected routes
api.use('/verification', verificationRouter); // Has both public (webhooks) and protected routes
api.use('/voice', voiceIntelligenceRouter); // Voice Intelligence with TTS, STT, agents
api.use('/workspace', knowledgeWorkspaceRouter); // Knowledge Workspace (AFFiNE) integration
api.use('/integrations/google-drive', googleDriveRouter); // Google Drive Integration (has webhook route that's public)
api.use('/integrations/onedrive', oneDriveRouter); // OneDrive/SharePoint Integration

// Sprint Module Routes (Sprints 1-18)
api.use('/storybook', authMiddleware, storybookRouter);       // Storybook engine, generation, review, marketplace
api.use('/arena', authMiddleware, arenaRouter);                // Competitions, tournaments, teams, tokens, bounties
api.use('/developer', authMiddleware, developerPortalRouter);  // Developer portal, SDK, webhooks, LMS, studio
api.use('/ai-engine', authMiddleware, aiEngineRouter);         // AI providers, tutor, BKT, ML personalisation
api.use('/compliance', authMiddleware, complianceRouter);      // Data retention, experiments, security, monitoring
api.use('/parent', authMiddleware, parentPortalRouter);        // Parent mobile app, child progress, family
api.use('/collaboration', authMiddleware, collaborationRouter); // Collaborative stories, lesson plans, resources
api.use('/onboarding', authMiddleware, tutorOnboardingRouter);  // 7-step tutor onboarding pipeline

app.use('/api/v1', api);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
  logger.warn({ method: req.method, path: req.path, ip: req.ip }, '404 Not Found');
  res.status(404).json({
    error: 'Not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

// Start server
let server: ReturnType<typeof app.listen>;

async function start() {
  try {
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected');

    // Initialize JWT keys
    await initializeKeys();
    logger.info('JWT keys initialized');

    // Initialize hosting services
    initializeHostingServices();

    // Initialize tutor onboarding service
    initializeTutorOnboarding();

    // ── S&R Canvas ─────────────────────────────────────────────
    const srRegistry = new NodeTypeRegistry();
    registerMigrationNodes(srRegistry);
    registerCompetitionNodes(srRegistry);

    const srEventBus = new PersistentEventBus();
    const srWorkflowStore = new PrismaWorkflowStore();
    const srRunStore = new PrismaRunStore();

    const srServices: import('./services/sr/sr-workflow-engine').WorkflowServices = {
      eventBus: srEventBus,
      dataLake: {
        writeToStaging: async () => ({ ok: true as const, value: { written: 0 } }),
        readFromStaging: async () => ({ ok: true as const, value: [] }),
        runQualityChecks: async () => [],
      },
      cache: {
        get: async () => null,
        set: async () => {},
      },
      getService: () => null,
    };

    const srRunner = new WorkflowRunner({
      registry: srRegistry,
      services: srServices,
      eventBus: srEventBus,
      runStore: srRunStore,
    });

    const { wsManager: srWsManager } = mountSRRoutes(app, {
      registry: srRegistry,
      runner: srRunner,
      workflowStore: srWorkflowStore,
      runStore: srRunStore,
      eventBus: srEventBus,
    });

    logger.info('S&R Canvas routes mounted at /api/v1/sr/*');

    server = app.listen(PORT, () => {
      logger.info({ port: PORT }, `Scholarly API Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error({ err: error instanceof Error ? error : undefined }, 'Failed to start server');
    process.exit(1);
  }
}

// Graceful shutdown with 30-second timeout
let isShuttingDown = false;

async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, 'Shutdown signal received, beginning graceful shutdown...');

  // Stop accepting new connections
  server.close(async () => {
    logger.info('HTTP server closed, cleaning up resources...');

    try {
      // Close Redis connections (rate limiter)
      const { closeRateLimitRedis } = await import('./middleware/rate-limit');
      await closeRateLimitRedis().catch(() => {});

      // Disconnect database
      await prisma.$disconnect().catch(() => {});

      // Flush any pending metrics/telemetry
      logger.info('All resources cleaned up, exiting.');
      process.exit(0);
    } catch (error) {
      logger.error({ err: error }, 'Error during cleanup');
      process.exit(1);
    }
  });

  // Force exit after 30s if graceful shutdown hangs
  setTimeout(() => {
    logger.error('Graceful shutdown timed out after 30s, forcing exit');
    process.exit(1);
  }, 30000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions and unhandled rejections
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'Uncaught exception — shutting down');
  shutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error({ err: reason }, 'Unhandled rejection');
});

start();

export { app };
