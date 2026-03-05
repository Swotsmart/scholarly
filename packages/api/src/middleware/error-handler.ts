/**
 * Error Handler Middleware
 *
 * Centralized error management with:
 * - ZodError -> 400 with structured validation details
 * - ApiError -> proper HTTP status codes
 * - Prisma errors -> mapped to appropriate responses
 * - Production error sanitization (no stack traces)
 * - Metrics integration for exception tracking
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../lib/logger';
import { registry } from './metrics';

export class ApiError extends Error {
  status: number;
  code?: string;
  details?: unknown;

  constructor(status: number, message: string, code?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
    this.name = 'ApiError';
  }

  static badRequest(message: string, details?: unknown) {
    return new ApiError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message, 'FORBIDDEN');
  }

  static notFound(resource: string, id?: string) {
    return new ApiError(404, `${resource} not found${id ? `: ${id}` : ''}`, 'NOT_FOUND');
  }

  static conflict(message: string) {
    return new ApiError(409, message, 'CONFLICT');
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const requestId = (req as any).id || 'unknown';

  logger.error({ err, name: err?.name, status: (err as any)?.statusCode || 500, requestId }, 'Request error');

  // Track error metrics
  registry.increment('api_errors_total', 'Total API errors', {
    type: err.constructor.name,
    path: req.path,
  });

  // Zod validation errors
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Custom API errors
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      error: err.message,
      code: err.code,
      details: err.details,
    });
  }

  // Prisma errors - check by error name/code pattern
  if (err.name === 'PrismaClientKnownRequestError' || (err as any).code?.startsWith('P')) {
    const prismaErr = err as any;
    switch (prismaErr.code) {
      case 'P2002':
        return res.status(409).json({
          error: 'A record with this value already exists',
          field: (prismaErr.meta?.target as string[])?.[0],
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Record not found',
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Related record not found',
        });
      default:
        return res.status(400).json({
          error: 'Database error',
          code: prismaErr.code,
        });
    }
  }

  if (err.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'Invalid data provided',
    });
  }

  // Default server error — sanitize in production (no stack traces)
  const isProduction = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
    requestId,
    timestamp: new Date().toISOString(),
  });
}
