/**
 * Scholarly API Server
 * RESTful API for the Unified Learning Nexus
 */

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
import { designPitchAIRouter } from './routes/design-pitch-ai';
import { showcasePortfolioRouter } from './routes/showcase-portfolio';

// Middleware
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';

const app: Application = express();
const PORT = process.env.PORT || 3001;

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
api.use('/design-pitch', authMiddleware, designPitchAIRouter);
api.use('/showcase', showcasePortfolioRouter); // Has both public and protected routes

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
