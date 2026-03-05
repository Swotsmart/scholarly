/**
 * Health Check Endpoints
 *
 * Provides liveness, readiness, and detailed health probes
 * for container orchestration and monitoring.
 *
 * - /live  — Is the process alive? (always 200 unless crashed)
 * - /ready — Is the service ready to accept traffic? (checks dependencies)
 * - /health — Detailed health with latency metrics
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@scholarly/database';
import { logger } from '../lib/logger';

const healthRouter = Router();

// Cached Redis client for health checks (avoids creating a new connection per request)
let redisClient: any = null;
let redisClientReady = false;

async function getRedisClient() {
  if (redisClient && redisClientReady) return redisClient;
  if (redisClient) {
    // Client exists but not ready — wait for it or return null
    return null;
  }
  if (!process.env.REDIS_URL) return null;
  try {
    const { createClient } = await import('redis');
    const client = createClient({ url: process.env.REDIS_URL });
    client.on('error', () => { redisClientReady = false; });
    client.on('ready', () => { redisClientReady = true; });
    await client.connect();
    redisClient = client;
    redisClientReady = true;
    return redisClient;
  } catch {
    redisClient = null;
    redisClientReady = false;
    return null;
  }
}

interface DependencyHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  details?: Record<string, unknown>;
}

async function checkDatabase(): Promise<DependencyHealth> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      details: { error: (error as Error).message },
    };
  }
}

async function checkRedis(): Promise<DependencyHealth> {
  if (!process.env.REDIS_URL) {
    return { status: 'healthy', latencyMs: 0, details: { note: 'Redis not configured' } };
  }
  const start = Date.now();
  try {
    const client = await getRedisClient();
    if (!client) {
      return { status: 'unhealthy', latencyMs: Date.now() - start, details: { error: 'Failed to create Redis client' } };
    }
    await client.ping();
    return { status: 'healthy', latencyMs: Date.now() - start };
  } catch (error) {
    // Reset cached client on failure so it reconnects on next check
    redisClient = null;
    redisClientReady = false;
    return {
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      details: { error: (error as Error).message },
    };
  }
}

/**
 * GET /live — Liveness probe
 * Returns 200 if process is alive
 */
healthRouter.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

/**
 * GET /ready — Readiness probe
 * Returns 200 only if all critical dependencies are healthy
 */
healthRouter.get('/ready', async (_req: Request, res: Response) => {
  const db = await checkDatabase();

  if (db.status === 'unhealthy') {
    return res.status(503).json({
      status: 'not_ready',
      timestamp: new Date().toISOString(),
      dependencies: { database: db },
    });
  }

  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString(),
    dependencies: { database: db },
  });
});

/**
 * GET /health — Detailed health with latency metrics
 * Returns full dependency status with timing information
 */
healthRouter.get('/health', async (_req: Request, res: Response) => {
  const [db, redis] = await Promise.all([
    checkDatabase(),
    checkRedis(),
  ]);

  const overallStatus = [db, redis].some(d => d.status === 'unhealthy')
    ? 'unhealthy'
    : [db, redis].some(d => d.status === 'degraded')
      ? 'degraded'
      : 'healthy';

  const statusCode = overallStatus === 'unhealthy' ? 503 : 200;

  res.status(statusCode).json({
    status: overallStatus,
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      database: db,
      redis,
    },
  });
});

export { healthRouter };
