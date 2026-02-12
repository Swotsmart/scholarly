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
import { prisma } from '@scholarly/database';

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

// Middleware
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';

// Service initialization
import { initializeHostingServices } from './lib/hosting-init';
import { initializeKeys } from './config/keys';

const app: Application = express();
const PORT = process.env.PORT || 3002;

// Global middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(morgan('dev'));

// Health check
app.get('/health', async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'healthy', timestamp: new Date().toISOString() });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: 'Database connection failed' });
  }
});

// API version prefix
const api = express.Router();

// Public routes
api.use('/auth', authRouter);
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

app.use('/api/v1', api);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start server
async function start() {
  try {
    console.log('Connecting to database...');
    await prisma.$connect();
    console.log('Database connected');

    // Initialize JWT keys
    await initializeKeys();
    console.log('JWT keys initialized');

    // Initialize hosting services
    initializeHostingServices();

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎓 Scholarly API Server                                 ║
║   The Unified Learning Nexus                              ║
║                                                           ║
║   Server running on http://localhost:${PORT}                ║
║   API Docs: http://localhost:${PORT}/api/v1                 ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

start();

export { app };
