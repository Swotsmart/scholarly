/**
 * Offering API Routes
 * 
 * REST API endpoints for managing educational offerings.
 * 
 * @module ScholarlyHosting/Routes
 * @version 1.0.0
 */

import { Router, Request, Response } from 'express';
import { PostgresOfferingRepository, OfferingRepository } from '../repositories/offering.repository';
import { logger } from '../infrastructure';
import { ValidationError, NotFoundError } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  providerId?: string;
  isAdmin?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; field?: string };
  meta?: { total?: number; limit?: number; offset?: number };
}

function handleError(error: unknown, res: Response): void {
  if (error instanceof ValidationError) {
    res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: error.message, field: error.field } });
    return;
  }
  if (error instanceof NotFoundError) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: error.message } });
    return;
  }
  logger.error({ error }, 'Unhandled API error');
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
}

// ============================================================================
// ROUTER
// ============================================================================

export function createOfferingRouter(offeringRepository: OfferingRepository): Router {
  const router = Router();

  /**
   * GET /offerings
   * List offerings with filters
   */
  router.get('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { offerings, total } = await offeringRepository.search({
        query: req.query.query as string,
        providerId: req.query.providerId as string,
        types: req.query.types ? (req.query.types as string).split(',') as any : undefined,
        yearLevels: req.query.yearLevels ? (req.query.yearLevels as string).split(',') as any : undefined,
        subjectAreas: req.query.subjectAreas ? (req.query.subjectAreas as string).split(',') : undefined,
        deliveryModes: req.query.deliveryModes ? (req.query.deliveryModes as string).split(',') as any : undefined,
        priceMax: req.query.priceMax ? parseFloat(req.query.priceMax as string) : undefined,
        availability: req.query.availability as any,
        status: req.query.status ? (req.query.status as string).split(',') as any : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0
      });

      res.json({ success: true, data: offerings, meta: { total, limit: 20, offset: 0 } } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /offerings/:id
   * Get offering by ID
   */
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const offering = await offeringRepository.findById(req.params.id);
      if (!offering) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      }
      res.json({ success: true, data: offering } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /offerings
   * Create new offering
   */
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const providerId = req.providerId;
      if (!providerId) {
        return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Provider authentication required' } });
      }

      const offering = await offeringRepository.create({
        providerId,
        type: req.body.type,
        name: req.body.name,
        description: req.body.description,
        shortDescription: req.body.shortDescription,
        subjectAreas: req.body.subjectAreas || [],
        yearLevels: req.body.yearLevels || [],
        cefrLevels: req.body.cefrLevels || [],
        curriculumAlignment: req.body.curriculumAlignment || [],
        learningOutcomes: req.body.learningOutcomes || [],
        prerequisites: req.body.prerequisites || [],
        deliveryModes: req.body.deliveryModes || [],
        duration: req.body.duration || { type: 'flexible' },
        schedule: req.body.schedule,
        availability: req.body.availability || { status: 'available' },
        pricing: req.body.pricing || { type: 'enquire', currency: 'AUD' },
        qualitySignals: req.body.qualitySignals || { providerQualityScore: 50, reviewCount: 0 },
        naturalLanguageSummary: req.body.naturalLanguageSummary || req.body.description,
        parentFriendlySummary: req.body.parentFriendlySummary || req.body.shortDescription,
        agentContext: req.body.agentContext || '',
        images: req.body.images || [],
        videos: req.body.videos || [],
        virtualTourUrl: req.body.virtualTourUrl,
        categories: req.body.categories || [],
        tags: req.body.tags || [],
        status: 'draft',
        publishedAt: null
      });

      res.status(201).json({ success: true, data: offering } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * PATCH /offerings/:id
   * Update offering
   */
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await offeringRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      }

      if (existing.providerId !== req.providerId && !req.isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot update other provider offerings' } });
      }

      const updated = await offeringRepository.update(req.params.id, req.body);
      res.json({ success: true, data: updated } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * DELETE /offerings/:id
   * Delete offering
   */
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await offeringRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      }

      if (existing.providerId !== req.providerId && !req.isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot delete other provider offerings' } });
      }

      await offeringRepository.delete(req.params.id);
      res.json({ success: true } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /offerings/:id/publish
   * Publish offering
   */
  router.post('/:id/publish', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await offeringRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      }

      if (existing.providerId !== req.providerId && !req.isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot publish other provider offerings' } });
      }

      const published = await offeringRepository.publish(req.params.id);
      res.json({ success: true, data: published } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /offerings/:id/archive
   * Archive offering
   */
  router.post('/:id/archive', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const existing = await offeringRepository.findById(req.params.id);
      if (!existing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Offering not found' } });
      }

      if (existing.providerId !== req.providerId && !req.isAdmin) {
        return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Cannot archive other provider offerings' } });
      }

      const archived = await offeringRepository.archive(req.params.id);
      res.json({ success: true, data: archived } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  return router;
}

export function createDefaultOfferingRouter(): Router {
  return createOfferingRouter(new PostgresOfferingRepository());
}
