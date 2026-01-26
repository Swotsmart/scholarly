/**
 * Scholarly Platform - Server Entry Point
 * 
 * Production server with:
 * - Graceful shutdown handling
 * - Signal handling (SIGTERM, SIGINT)
 * - Database connection management
 * - Uncaught exception handling
 * 
 * @module @scholarly/api
 */

import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Server } from 'http';
import { prisma } from '@scholarly/database';
import { createApp, getDefaultConfig, AppConfig } from './app.js';
import { logger } from './middleware/index.js';

// =============================================================================
// CONFIGURATION
// =============================================================================

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const SHUTDOWN_TIMEOUT = parseInt(process.env.SHUTDOWN_TIMEOUT || '30000', 10);

// =============================================================================
// SERVER STATE
// =============================================================================

let server: Server | null = null;
let httpTerminator: HttpTerminator | null = null;
let isShuttingDown = false;

// =============================================================================
// STARTUP
// =============================================================================

async function startServer(): Promise<void> {
  try {
    // Validate configuration
    const config = getDefaultConfig();
    validateConfig(config);
    
    // Connect to database
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected');
    
    // Create and start Express app
    const app = createApp(config);
    
    server = app.listen(PORT, HOST, () => {
      logger.info({
        port: PORT,
        host: HOST,
        nodeEnv: process.env.NODE_ENV,
        version: process.env.npm_package_version,
      }, `🚀 Scholarly API server listening on ${HOST}:${PORT}`);
    });
    
    // Create HTTP terminator for graceful shutdown
    httpTerminator = createHttpTerminator({
      server,
      gracefulTerminationTimeout: SHUTDOWN_TIMEOUT,
    });
    
    // Setup signal handlers
    setupSignalHandlers();
    
    // Setup uncaught exception handlers
    setupExceptionHandlers();
    
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start server');
    process.exit(1);
  }
}

// =============================================================================
// CONFIGURATION VALIDATION
// =============================================================================

function validateConfig(config: AppConfig): void {
  const errors: string[] = [];
  
  // In production, require a real JWT secret
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('development')) {
      errors.push('JWT_SECRET must be set to a secure value in production');
    }
    
    if (!process.env.DATABASE_URL) {
      errors.push('DATABASE_URL must be set in production');
    }
  }
  
  if (errors.length > 0) {
    for (const error of errors) {
      logger.error(error);
    }
    throw new Error('Configuration validation failed');
  }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

async function shutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    logger.warn('Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
  logger.info({ signal }, 'Shutdown signal received, starting graceful shutdown...');
  
  const shutdownTimeout = setTimeout(() => {
    logger.error('Graceful shutdown timed out, forcing exit');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT + 5000);
  
  try {
    // Stop accepting new connections and wait for existing to complete
    if (httpTerminator) {
      logger.info('Closing HTTP server...');
      await httpTerminator.terminate();
      logger.info('HTTP server closed');
    }
    
    // Close database connection
    logger.info('Disconnecting from database...');
    await prisma.$disconnect();
    logger.info('Database disconnected');
    
    // Clear timeout
    clearTimeout(shutdownTimeout);
    
    logger.info('Graceful shutdown completed');
    process.exit(0);
    
  } catch (error) {
    logger.error({ err: error }, 'Error during shutdown');
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// =============================================================================
// SIGNAL HANDLERS
// =============================================================================

function setupSignalHandlers(): void {
  // SIGTERM - sent by Docker, Kubernetes, etc.
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  
  // SIGINT - Ctrl+C
  process.on('SIGINT', () => shutdown('SIGINT'));
  
  // SIGHUP - terminal closed
  process.on('SIGHUP', () => shutdown('SIGHUP'));
}

// =============================================================================
// EXCEPTION HANDLERS
// =============================================================================

function setupExceptionHandlers(): void {
  // Uncaught exceptions
  process.on('uncaughtException', (error: Error) => {
    logger.fatal({ err: error }, 'Uncaught exception');
    
    // Give time for logs to flush
    setTimeout(() => {
      process.exit(1);
    }, 1000);
  });
  
  // Unhandled promise rejections
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    logger.error({ reason, promise }, 'Unhandled promise rejection');
    
    // In production, treat unhandled rejections as fatal
    if (process.env.NODE_ENV === 'production') {
      setTimeout(() => {
        process.exit(1);
      }, 1000);
    }
  });
  
  // Warnings
  process.on('warning', (warning: Error) => {
    logger.warn({ warning }, 'Node.js warning');
  });
}

// =============================================================================
// START SERVER
// =============================================================================

startServer();
