/**
 * Agent API Routes
 * 
 * Public API endpoints for AI agents to discover educational providers.
 * All endpoints require API key authentication.
 * 
 * @module ScholarlyHosting/Routes
 * @version 1.0.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { EducationalAgentApiService } from '../services/agent-api.service';
import { StructuredDataService } from '../services/structured-data.service';
import { PostgresProviderRepository } from '../repositories/provider.repository';
import { PostgresQualityProfileRepository } from '../repositories/quality.repository';
import { PostgresOfferingRepository } from '../repositories/offering.repository';
import { logger, verifyApiKey } from '../infrastructure';
import { ValidationError, NotFoundError, AgentAuthenticationError } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface AgentRequest extends Request {
  agentId?: string;
  providerId?: string;
  rateLimit?: {
    remaining: number;
    limit: number;
    resetAt: Date;
  };
}

interface AgentApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    total?: number;
    limit?: number;
    offset?: number;
    rateLimit?: {
      remaining: number;
      resetAt: string;
    };
  };
  trustSummary?: {
    totalProviders: number;
    verifiedProviders: number;
    averageQualityScore: number;
    platformStatement: string;
  };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * API Key authentication middleware
 */
function createAuthMiddleware(providerRepository: PostgresProviderRepository) {
  return async (req: AgentRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'UNAUTHORIZED',
            message: 'API key required. Use Authorization: Bearer <api_key>'
          }
        } as AgentApiResponse);
      }

      const apiKey = authHeader.substring(7);
      const agentId = req.headers['x-agent-id'] as string || 'unknown';

      // Extract provider ID from API key prefix (first 12 chars)
      const keyPrefix = apiKey.substring(0, 12);

      // Find provider by API key prefix
      const { providers } = await providerRepository.findAll({ limit: 1000 });
      const provider = providers.find(p => p.agentConfig.apiKeyPrefix === keyPrefix);

      if (!provider) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key'
          }
        } as AgentApiResponse);
      }

      // Verify full API key
      if (!provider.agentConfig.apiKey || !verifyApiKey(apiKey, provider.agentConfig.apiKey)) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'Invalid API key'
          }
        } as AgentApiResponse);
      }

      // Check if API is enabled
      if (!provider.agentConfig.apiEnabled) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'API_DISABLED',
            message: 'Agent API is disabled for this provider'
          }
        } as AgentApiResponse);
      }

      req.agentId = agentId;
      req.providerId = provider.id;

      logger.info({ agentId, providerId: provider.id, path: req.path }, 'Agent API request authenticated');
      next();
    } catch (error) {
      logger.error({ error }, 'Agent authentication error');
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication failed'
        }
      } as AgentApiResponse);
    }
  };
}

/**
 * Error handler
 */
function handleError(error: unknown, res: Response): void {
  if (error instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: error.message
      }
    } as AgentApiResponse);
    return;
  }

  if (error instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: error.message
      }
    } as AgentApiResponse);
    return;
  }

  if (error instanceof AgentAuthenticationError) {
    res.status(401).json({
      success: false,
      error: {
        code: 'AGENT_AUTH_FAILED',
        message: error.message
      }
    } as AgentApiResponse);
    return;
  }

  logger.error({ error }, 'Unhandled Agent API error');
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    }
  } as AgentApiResponse);
}

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createAgentApiRouter(
  agentService: EducationalAgentApiService,
  structuredDataService: StructuredDataService,
  providerRepository: PostgresProviderRepository
): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(providerRepository);

  // Apply auth to all routes
  router.use(authMiddleware);

  // ==========================================================================
  // SEARCH
  // ==========================================================================

  /**
   * POST /agent/search/providers
   * Search for educational providers
   */
  router.post('/search/providers', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.searchProviders({
        query: req.body.query || '',
        filters: {
          types: req.body.types || [],
          yearLevels: req.body.yearLevels || [],
          subjectAreas: req.body.subjectAreas || [],
          location: req.body.location,
          minQualityScore: req.body.minQualityScore,
          verificationLevels: req.body.verificationLevels || [],
          accreditations: req.body.accreditations || [],
          priceRange: req.body.priceRange,
          deliveryModes: req.body.deliveryModes || [],
          availability: req.body.availability || 'any'
        },
        sort: req.body.sort || 'relevance',
        limit: Math.min(req.body.limit || 20, 100),
        offset: req.body.offset || 0
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value.providers,
        meta: {
          total: result.value.totalCount,
          limit: req.body.limit || 20,
          offset: req.body.offset || 0
        },
        trustSummary: result.value.trustSummary
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * POST /agent/search/offerings
   * Search for educational offerings
   */
  router.post('/search/offerings', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.searchOfferings({
        query: req.body.query || '',
        providerId: req.body.providerId,
        filters: {
          types: req.body.types || [],
          yearLevels: req.body.yearLevels || [],
          subjectAreas: req.body.subjectAreas || [],
          deliveryModes: req.body.deliveryModes || [],
          priceMax: req.body.priceMax,
          availability: req.body.availability || 'any'
        },
        limit: Math.min(req.body.limit || 20, 100),
        offset: req.body.offset || 0
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value.offerings,
        meta: {
          total: result.value.totalCount,
          limit: req.body.limit || 20,
          offset: req.body.offset || 0
        }
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // PROVIDER DETAILS
  // ==========================================================================

  /**
   * GET /agent/providers/:id
   * Get provider details
   */
  router.get('/providers/:id', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.getProviderDetails(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      // Generate structured data
      const jsonLdResult = structuredDataService.generateOrganization(result.value);
      const jsonLd = jsonLdResult.success ? jsonLdResult.value : null;

      res.json({
        success: true,
        data: {
          provider: result.value,
          structuredData: jsonLd
        }
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /agent/providers/:id/quality
   * Get provider quality profile
   */
  router.get('/providers/:id/quality', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.getQualityProfile(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  /**
   * GET /agent/providers/:id/outcomes
   * Get verified outcomes for a provider
   */
  router.get('/providers/:id/outcomes', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.getVerifiedOutcomes(req.params.id);

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // COMPARISON
  // ==========================================================================

  /**
   * POST /agent/compare
   * Compare multiple providers
   */
  router.post('/compare', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.compareProviders({
        providerIds: req.body.providerIds,
        criteria: req.body.criteria || [
          { category: 'quality', metrics: ['overallScore', 'verificationLevel'] },
          { category: 'outcomes', metrics: ['NAPLAN Reading'] },
          { category: 'staff', metrics: ['studentTeacherRatio'] }
        ],
        userContext: req.body.userContext
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: {
          providers: result.value.providers,
          comparisonMatrix: result.value.comparisonMatrix,
          recommendation: result.value.recommendation
        },
        trustSummary: result.value.trustSummary
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // AVAILABILITY
  // ==========================================================================

  /**
   * GET /agent/availability/:offeringId
   * Check availability for an offering
   */
  router.get('/availability/:offeringId', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.checkAvailability({
        offeringId: req.params.offeringId,
        preferredDate: req.query.preferredDate ? new Date(req.query.preferredDate as string) : undefined,
        studentCount: req.query.studentCount ? parseInt(req.query.studentCount as string) : undefined
      });

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.json({
        success: true,
        data: result.value
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // ENQUIRIES
  // ==========================================================================

  /**
   * POST /agent/enquiries
   * Submit an enquiry to a provider
   */
  router.post('/enquiries', async (req: AgentRequest, res: Response) => {
    try {
      const result = await agentService.submitEnquiry({
        providerId: req.body.providerId,
        offeringId: req.body.offeringId,
        contactName: req.body.contactName,
        contactEmail: req.body.contactEmail,
        contactPhone: req.body.contactPhone,
        studentName: req.body.studentName,
        studentAge: req.body.studentAge,
        studentYearLevel: req.body.studentYearLevel,
        enquiryType: req.body.enquiryType || 'general',
        message: req.body.message
      }, req.agentId || 'unknown');

      if (!result.success) {
        return handleError(result.error, res);
      }

      res.status(201).json({
        success: true,
        data: result.value
      } as AgentApiResponse);
    } catch (error) {
      handleError(error, res);
    }
  });

  // ==========================================================================
  // STRUCTURED DATA
  // ==========================================================================

  /**
   * GET /agent/providers/:id/jsonld
   * Get Schema.org JSON-LD for a provider
   */
  router.get('/providers/:id/jsonld', async (req: AgentRequest, res: Response) => {
    try {
      const providerResult = await agentService.getProviderDetails(req.params.id);

      if (!providerResult.success) {
        return handleError(providerResult.error, res);
      }

      const jsonLdResult = structuredDataService.generateOrganization(providerResult.value);

      if (!jsonLdResult.success) {
        return handleError(jsonLdResult.error, res);
      }

      // Return as JSON-LD with proper content type
      res.setHeader('Content-Type', 'application/ld+json');
      res.json(jsonLdResult.value);
    } catch (error) {
      handleError(error, res);
    }
  });

  return router;
}

// ============================================================================
// DEFAULT EXPORT WITH INSTANTIATED SERVICES
// ============================================================================

export function createDefaultAgentApiRouter(): Router {
  const providerRepository = new PostgresProviderRepository();
  const qualityRepository = new PostgresQualityProfileRepository();
  const offeringRepository = new PostgresOfferingRepository();

  const agentService = new EducationalAgentApiService(
    providerRepository,
    qualityRepository,
    offeringRepository
  );
  const structuredDataService = new StructuredDataService();

  return createAgentApiRouter(agentService, structuredDataService, providerRepository);
}
