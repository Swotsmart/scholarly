/**
 * Correlation ID Middleware
 *
 * Generates or propagates request IDs for distributed tracing.
 * Attaches to both request and response for end-to-end correlation.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      id?: string;
    }
  }
}

export function correlationIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const id = (req.headers['x-request-id'] as string) ||
    (req.headers['x-correlation-id'] as string) ||
    `req_${Date.now().toString(36)}_${crypto.randomBytes(6).toString('hex')}`;

  req.id = id;
  res.setHeader('X-Request-Id', id);
  next();
}
