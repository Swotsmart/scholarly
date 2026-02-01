/**
 * Provider API Routes
 * 
 * REST API endpoints for managing educational providers.
 * 
 * @module ScholarlyHosting/Routes
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { EducationalProviderService } from '../services/provider.service';
import { EducationalQualityService } from '../services/quality.service';
import { PostgresProviderRepository } from '../repositories/provider.repository';
import { PostgresQualityProfileRepository } from '../repositories/quality.repository';
import { logger } from '../infrastructure';
import { ValidationError, NotFoundError } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  tenantId?: string;
  providerId?: string;
  userId?: string;
  isAdmin?: boolean;
}

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    field?: string;
  };
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
  };
}

// ============================================================================
// ERROR HANDLER
// ============================================================================

function handleError(error: unknown, res: Response): void {
  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message,
        field: error.field
      }
    } as ApiResponse);
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message
      }
    } as ApiResponse);
    return;
  }

  logger.error({ error }, 'Unhandled API error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  } as ApiResponse);
}

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createProviderRouter(
  providerService: EducationalProviderService,
  qualityService: EducationalQualityService
): Router {
  const router = Router();

  // ==========================================================================
  // PROVIDER CRUD
  // ==========================================================================

  /**
   * POST /providers
   * Create a new educational provider
   */
  router.post('/', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { tenantId } = req;
      if (!tenantId) {
        return res.status(401).json({
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' }
        } as ApiResponse);
      }

      const result = await providerService.createProvider({
        tenantId,
        type: req.body.type,
        displayName: req.body.displayName,
        legalName: req.body.legalName,
        description: req.body.description,
        tagline: req.body.tagline,
        location: req.body.location,
        contact: req.body.contact,
        subdomain: req.body.subdomain
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.status(201).json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /providers/:id
   * Get provider by ID
   */
  router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await providerService.getProvider(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * PATCH /providers/:id
   * Update provider profile
   */
  router.patch('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { providerId } = req;
      if (providerId !== req.params.id && !req.isAdmin) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Cannot update other providers' }
        } as ApiResponse);
      }

      const result = await providerService.updateProvider(req.params.id, {
        displayName: req.body.displayName,
        legalName: req.body.legalName,
        description: req.body.description,
        tagline: req.body.tagline,
        logoUrl: req.body.logoUrl,
        faviconUrl: req.body.faviconUrl,
        status: req.body.status
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * DELETE /providers/:id
   * Delete provider (admin only)
   */
  router.delete('/:id', async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.isAdmin) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Admin access required' }
        } as ApiResponse);
      }

      // TODO: Implement delete in service
      res.status(501).json({
        success: false,
        error: { code: 'NOT_IMPLEMENTED', message: 'Provider deletion not yet implemented' }
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/activate
   * Activate a pending provider
   */
  router.post('/:id/activate', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await providerService.activateProvider(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // THEME
  // ==========================================================================

  /**
   * PATCH /providers/:id/theme
   * Update provider theme
   */
  router.patch('/:id/theme', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await providerService.updateTheme(req.params.id, req.body);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value.theme
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // DOMAINS
  // ==========================================================================

  /**
   * POST /providers/:id/domains
   * Add a custom domain
   */
  router.post('/:id/domains', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await providerService.addCustomDomain(req.params.id, req.body.domain);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.status(201).json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/domains/:domainId/verify
   * Verify domain ownership
   */
  router.post('/:id/domains/:domainId/verify', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await providerService.verifyDomain(req.params.id, req.params.domainId);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // API KEY
  // ==========================================================================

  /**
   * POST /providers/:id/api-key
   * Generate new API key for agent access
   */
  router.post('/:id/api-key', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await providerService.generateAgentApiKey(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.status(201).json({
        success: true,
        data: {
          apiKey: result.value.apiKey,
          prefix: result.value.prefix,
          message: 'Store this API key securely - it will not be shown again'
        }
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // QUALITY PROFILE
  // ==========================================================================

  /**
   * GET /providers/:id/quality
   * Get quality profile
   */
  router.get('/:id/quality', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.getQualityProfile(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/quality/calculate
   * Recalculate quality score
   */
  router.post('/:id/quality/calculate', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.calculateQualityScore(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/outcomes
   * Submit an outcome for verification
   */
  router.post('/:id/outcomes', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.submitOutcome(req.params.id, {
        type: req.body.type,
        metric: req.body.metric,
        value: req.body.value,
        unit: req.body.unit,
        comparisonBasis: req.body.comparisonBasis,
        comparisonValue: req.body.comparisonValue,
        year: req.body.year,
        cohortSize: req.body.cohortSize,
        dataSource: req.body.dataSource
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.status(201).json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /providers/:id/outcomes
   * Get verified outcomes
   */
  router.get('/:id/outcomes', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.getVerifiedOutcomes(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/accreditations
   * Add an accreditation
   */
  router.post('/:id/accreditations', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.addAccreditation(req.params.id, {
        body: req.body.body,
        type: req.body.type,
        level: req.body.level,
        issuedAt: new Date(req.body.issuedAt),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        verificationUrl: req.body.verificationUrl
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.status(201).json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/registration
   * Submit registration details
   */
  router.post('/:id/registration', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.submitRegistration(req.params.id, {
        registrationNumber: req.body.registrationNumber,
        registrationBody: req.body.registrationBody,
        registeredAt: new Date(req.body.registeredAt),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : undefined,
        verificationUrl: req.body.verificationUrl,
        sector: req.body.sector,
        schoolType: req.body.schoolType
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/staff
   * Update staff qualifications
   */
  router.post('/:id/staff', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.updateStaffQualifications(req.params.id, {
        totalStaff: req.body.totalStaff,
        teachingStaff: req.body.teachingStaff,
        qualifiedTeachers: req.body.qualifiedTeachers,
        advancedDegrees: req.body.advancedDegrees,
        averageExperienceYears: req.body.averageExperienceYears,
        studentTeacherRatio: req.body.studentTeacherRatio,
        specialistStaff: req.body.specialistStaff
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /providers/:id/compliance
   * Add compliance record
   */
  router.post('/:id/compliance', async (req: AuthenticatedRequest, res: Response) => {
    try {
      const result = await qualityService.addComplianceRecord(req.params.id, {
        type: req.body.type,
        status: req.body.status,
        issuedBy: req.body.issuedBy,
        issuedAt: new Date(req.body.issuedAt),
        expiresAt: req.body.expiresAt ? new Date(req.body.expiresAt) : null,
        notes: req.body.notes,
        documentUrl: req.body.documentUrl
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.status(201).json({
        success: true,
        data: result.value
      } as ApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  return router;
}

// ============================================================================
// DEFAULT EXPORT WITH INSTANTIATED SERVICES
// ============================================================================

export function createDefaultProviderRouter(): Router {
  const providerRepository = new PostgresProviderRepository();
  const qualityRepository = new PostgresQualityProfileRepository();

  const providerService = new EducationalProviderService(providerRepository);
  const qualityService = new EducationalQualityService(qualityRepository, providerRepository);

  return createProviderRouter(providerService, qualityService);
}
