/**
 * Scholarly Hosting Routes
 *
 * API routes for the educational web hosting platform.
 * Enables schools, tutors, micro-schools, and homeschool co-ops to have
 * professional web presences with AI-discoverable structured data.
 *
 * @module Routes/Hosting
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/error-handler';
import {
  getHostingProviderService,
  getHostingEngagementService,
  getHostingAgentApiService,
  getHostingQualityService,
  getHostingStructuredDataService,
  HostingProviderType,
} from '../services';

export const hostingRouter: Router = Router();

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const createProviderSchema = z.object({
  type: z.enum([
    'school',
    'micro_school',
    'tutoring_centre',
    'solo_tutor',
    'homeschool_coop',
    'curriculum_provider',
    'enrichment',
    'online_academy',
  ]),
  displayName: z.string().min(1).max(200),
  legalName: z.string().max(200).optional(),
  description: z.string().min(10).max(2000),
  tagline: z.string().max(200).optional(),
  subdomain: z.string().regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/).optional(),
  location: z.object({
    name: z.string(),
    address: z.object({
      streetAddress: z.string(),
      addressLocality: z.string(),
      addressRegion: z.string(),
      postalCode: z.string(),
      addressCountry: z.string(),
    }),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    timezone: z.string().optional(),
  }).optional(),
  contact: z.object({
    name: z.string().min(1),
    role: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
  }),
});

const updateProviderSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  legalName: z.string().max(200).nullable().optional(),
  description: z.string().min(10).max(2000).optional(),
  tagline: z.string().max(200).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  faviconUrl: z.string().url().nullable().optional(),
});

const updateThemeSchema = z.object({
  primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  backgroundColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  textColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  fontFamily: z.string().optional(),
  customCss: z.string().nullable().optional(),
});

const addDomainSchema = z.object({
  domain: z.string().regex(/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/),
});

const createEnquirySchema = z.object({
  providerId: z.string(),
  offeringId: z.string().optional(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  preferredContact: z.enum(['email', 'phone']).optional(),
  studentName: z.string().optional(),
  studentAge: z.number().min(0).max(100).optional(),
  studentYearLevel: z.string().optional(),
  enquiryType: z.enum(['general', 'enrollment', 'tour', 'pricing', 'availability']),
  message: z.string().min(10).max(5000),
  source: z.enum(['website', 'agent_api', 'referral', 'other']).optional(),
});

const createTourBookingSchema = z.object({
  providerId: z.string(),
  locationId: z.string(),
  contactName: z.string().min(1),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  scheduledAt: z.string().datetime(),
  duration: z.number().min(15).max(180).optional(),
  tourType: z.enum(['in_person', 'virtual']),
  attendeeCount: z.number().min(1).max(20),
  studentNames: z.array(z.string()).optional(),
  specialRequests: z.string().max(1000).optional(),
});

const createReviewSchema = z.object({
  providerId: z.string(),
  authorType: z.enum(['parent', 'student', 'staff', 'alumni']),
  authorName: z.string().optional(),
  overallRating: z.number().min(1).max(5),
  categoryRatings: z.array(z.object({
    category: z.string(),
    rating: z.number().min(1).max(5),
    weight: z.number().optional(),
  })).optional(),
  title: z.string().max(200).optional(),
  content: z.string().min(20).max(5000),
  wouldRecommend: z.boolean(),
});

const searchProvidersSchema = z.object({
  query: z.string().optional(),
  types: z.array(z.string()).optional(),
  yearLevels: z.array(z.string()).optional(),
  subjectAreas: z.array(z.string()).optional(),
  location: z.object({
    latitude: z.number(),
    longitude: z.number(),
    radiusKm: z.number().optional(),
  }).optional(),
  minQualityScore: z.number().min(0).max(100).optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

// ============================================================================
// PROVIDER MANAGEMENT ROUTES
// ============================================================================

/**
 * Create a new hosting provider
 * POST /hosting/providers
 */
hostingRouter.post('/providers', async (req: Request, res: Response) => {
  const { tenantId } = req;
  const validation = createProviderSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingProviderService();
  const result = await service.createProvider({
    ...validation.data,
    tenantId,
  });

  if (!result.success) {
    const statusCode = result.error.code === 'VALIDATION_ERROR' ? 400 :
                       result.error.code === 'DOMAIN_EXISTS' ? 409 : 500;
    throw new ApiError(statusCode, result.error.message, result.error.details);
  }

  res.status(201).json(result.value);
});

/**
 * Get provider by ID
 * GET /hosting/providers/:providerId
 */
hostingRouter.get('/providers/:providerId', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingProviderService();
  const result = await service.getProvider(providerId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Get provider by domain (public endpoint for domain resolution)
 * GET /hosting/resolve/:domain
 */
hostingRouter.get('/resolve/:domain', async (req: Request, res: Response) => {
  const { domain } = req.params;

  const service = getHostingProviderService();
  const result = await service.resolveByDomain(domain);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Update provider
 * PATCH /hosting/providers/:providerId
 */
hostingRouter.patch('/providers/:providerId', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const validation = updateProviderSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingProviderService();
  const result = await service.updateProvider(providerId, validation.data);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Update provider theme
 * PATCH /hosting/providers/:providerId/theme
 */
hostingRouter.patch('/providers/:providerId/theme', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const validation = updateThemeSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingProviderService();
  const result = await service.updateTheme(providerId, validation.data);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Activate provider
 * POST /hosting/providers/:providerId/activate
 */
hostingRouter.post('/providers/:providerId/activate', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingProviderService();
  const result = await service.activateProvider(providerId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

// ============================================================================
// DOMAIN MANAGEMENT ROUTES
// ============================================================================

/**
 * Add custom domain
 * POST /hosting/providers/:providerId/domains
 */
hostingRouter.post('/providers/:providerId/domains', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const validation = addDomainSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingProviderService();
  const result = await service.addCustomDomain(providerId, validation.data.domain);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'DOMAIN_EXISTS' ? 409 :
                       result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    throw new ApiError(statusCode, result.error.message, result.error.details);
  }

  res.status(201).json(result.value);
});

/**
 * Verify domain
 * POST /hosting/providers/:providerId/domains/:domainId/verify
 */
hostingRouter.post('/providers/:providerId/domains/:domainId/verify', async (req: Request, res: Response) => {
  const { providerId, domainId } = req.params;

  const service = getHostingProviderService();
  const result = await service.verifyDomain(providerId, domainId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Generate agent API key
 * POST /hosting/providers/:providerId/api-key
 */
hostingRouter.post('/providers/:providerId/api-key', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingProviderService();
  const result = await service.generateAgentApiKey(providerId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.status(201).json(result.value);
});

// ============================================================================
// ENGAGEMENT ROUTES (Enquiries, Tours, Reviews)
// ============================================================================

/**
 * Create enquiry
 * POST /hosting/enquiries
 */
hostingRouter.post('/enquiries', async (req: Request, res: Response) => {
  const validation = createEnquirySchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingEngagementService();
  const result = await service.createEnquiry(validation.data);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.status(201).json(result.value);
});

/**
 * Get enquiries for a provider
 * GET /hosting/providers/:providerId/enquiries
 */
hostingRouter.get('/providers/:providerId/enquiries', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { status } = req.query;

  const service = getHostingEngagementService();
  const statusFilter = status ? (status as string).split(',') : undefined;
  const result = await service.getProviderEnquiries(providerId, statusFilter);

  if (!result.success) {
    throw new ApiError(500, result.error.message);
  }

  res.json(result.value);
});

/**
 * Update enquiry status
 * PATCH /hosting/enquiries/:enquiryId
 */
hostingRouter.patch('/enquiries/:enquiryId', async (req: Request, res: Response) => {
  const { enquiryId } = req.params;
  const { status, responseMessage } = req.body;

  const service = getHostingEngagementService();
  const result = await service.updateEnquiryStatus(enquiryId, status, responseMessage);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Create tour booking
 * POST /hosting/tours
 */
hostingRouter.post('/tours', async (req: Request, res: Response) => {
  const validation = createTourBookingSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingEngagementService();
  const result = await service.createTourBooking({
    ...validation.data,
    scheduledAt: new Date(validation.data.scheduledAt),
  });

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.status(201).json(result.value);
});

/**
 * Get tour bookings for a provider
 * GET /hosting/providers/:providerId/tours
 */
hostingRouter.get('/providers/:providerId/tours', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { upcoming } = req.query;

  const service = getHostingEngagementService();

  if (upcoming === 'true') {
    const result = await service.getUpcomingTours(providerId);
    if (!result.success) {
      throw new ApiError(500, result.error.message);
    }
    return res.json(result.value);
  }

  // Get upcoming tours as default (service handles filtering)
  const result = await service.getUpcomingTours(providerId);

  if (!result.success) {
    throw new ApiError(500, result.error.message);
  }

  res.json(result.value);
});

/**
 * Confirm tour booking
 * POST /hosting/tours/:bookingId/confirm
 */
hostingRouter.post('/tours/:bookingId/confirm', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const service = getHostingEngagementService();
  const result = await service.confirmTourBooking(bookingId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Cancel tour booking
 * POST /hosting/tours/:bookingId/cancel
 */
hostingRouter.post('/tours/:bookingId/cancel', async (req: Request, res: Response) => {
  const { bookingId } = req.params;

  const service = getHostingEngagementService();
  const result = await service.cancelTourBooking(bookingId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Create review
 * POST /hosting/reviews
 */
hostingRouter.post('/reviews', async (req: Request, res: Response) => {
  const validation = createReviewSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingEngagementService();
  const result = await service.createReview(validation.data);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.status(201).json(result.value);
});

/**
 * Get reviews for a provider
 * GET /hosting/providers/:providerId/reviews
 */
hostingRouter.get('/providers/:providerId/reviews', async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const { status } = req.query;

  const service = getHostingEngagementService();
  const statusFilter = status ? (status as string).split(',') : ['published'];
  const result = await service.getProviderReviews(providerId, statusFilter);

  if (!result.success) {
    throw new ApiError(500, result.error.message);
  }

  res.json(result.value);
});

/**
 * Publish review (after moderation approval)
 * POST /hosting/reviews/:reviewId/publish
 */
hostingRouter.post('/reviews/:reviewId/publish', async (req: Request, res: Response) => {
  const { reviewId } = req.params;

  const service = getHostingEngagementService();
  const result = await service.publishReview(reviewId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Add provider response to review
 * POST /hosting/reviews/:reviewId/response
 */
hostingRouter.post('/reviews/:reviewId/response', async (req: Request, res: Response) => {
  const { reviewId } = req.params;
  const { response } = req.body;

  if (!response || typeof response !== 'string') {
    throw new ApiError(400, 'Response text is required');
  }

  const service = getHostingEngagementService();
  const result = await service.addProviderResponse(reviewId, response);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Mark review as helpful
 * POST /hosting/reviews/:reviewId/helpful
 */
hostingRouter.post('/reviews/:reviewId/helpful', async (req: Request, res: Response) => {
  const { reviewId } = req.params;

  const service = getHostingEngagementService();
  const result = await service.markReviewHelpful(reviewId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

// ============================================================================
// QUALITY PROFILE ROUTES
// ============================================================================

/**
 * Get quality profile for a provider
 * GET /hosting/providers/:providerId/quality
 */
hostingRouter.get('/providers/:providerId/quality', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingQualityService();
  const result = await service.getQualityProfile(providerId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Submit verified outcome
 * POST /hosting/providers/:providerId/outcomes
 */
hostingRouter.post('/providers/:providerId/outcomes', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingQualityService();
  const result = await service.submitOutcome({
    providerId,
    ...req.body,
  });

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.status(201).json(result.value);
});

/**
 * Submit registration verification
 * POST /hosting/providers/:providerId/registration
 */
hostingRouter.post('/providers/:providerId/registration', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingQualityService();
  const result = await service.submitRegistration({
    providerId,
    ...req.body,
  });

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

// ============================================================================
// STRUCTURED DATA ROUTES
// ============================================================================

/**
 * Get JSON-LD structured data for a provider
 * GET /hosting/providers/:providerId/structured-data
 */
hostingRouter.get('/providers/:providerId/structured-data', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const providerService = getHostingProviderService();
  const providerResult = await providerService.getProvider(providerId);

  if (!providerResult.success) {
    const statusCode = providerResult.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, providerResult.error.message);
  }

  const structuredDataService = getHostingStructuredDataService();
  const jsonLd = structuredDataService.generateProviderJsonLd(providerResult.value);

  res.json(jsonLd);
});

// ============================================================================
// AGENT API ROUTES (Public discovery endpoints)
// ============================================================================

/**
 * Search providers (Agent API)
 * POST /hosting/agent/search/providers
 */
hostingRouter.post('/agent/search/providers', async (req: Request, res: Response) => {
  const validation = searchProvidersSchema.safeParse(req.body);

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingAgentApiService();
  const result = await service.searchProviders({
    query: validation.data.query || '',
    filters: {
      types: validation.data.types as HostingProviderType[],
      yearLevels: validation.data.yearLevels as any,
      subjectAreas: validation.data.subjectAreas,
      location: validation.data.location,
      minQualityScore: validation.data.minQualityScore,
    },
    limit: validation.data.limit || 20,
    offset: validation.data.offset || 0,
  });

  if (!result.success) {
    throw new ApiError(500, result.error.message);
  }

  res.json(result.value);
});

/**
 * Search offerings (Agent API)
 * POST /hosting/agent/search/offerings
 */
hostingRouter.post('/agent/search/offerings', async (req: Request, res: Response) => {
  const service = getHostingAgentApiService();
  const result = await service.searchOfferings(req.body);

  if (!result.success) {
    throw new ApiError(500, result.error.message);
  }

  res.json(result.value);
});

/**
 * Compare providers (Agent API)
 * POST /hosting/agent/compare
 */
hostingRouter.post('/agent/compare', async (req: Request, res: Response) => {
  const { providerIds, criteria } = req.body;

  if (!Array.isArray(providerIds) || providerIds.length < 2) {
    throw new ApiError(400, 'At least 2 provider IDs required for comparison');
  }

  const service = getHostingAgentApiService();
  const result = await service.compareProviders({
    providerIds,
    comparisonCriteria: criteria || ['quality', 'pricing', 'outcomes', 'reviews'],
    includeRecommendation: true,
  });

  if (!result.success) {
    throw new ApiError(500, result.error.message);
  }

  res.json(result.value);
});

/**
 * Check availability (Agent API)
 * POST /hosting/agent/availability
 */
hostingRouter.post('/agent/availability', async (req: Request, res: Response) => {
  const service = getHostingAgentApiService();
  const result = await service.checkAvailability(req.body);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Submit enquiry via Agent API (routes to engagement service)
 * POST /hosting/agent/enquiry
 */
hostingRouter.post('/agent/enquiry', async (req: Request, res: Response) => {
  const validation = createEnquirySchema.safeParse({
    ...req.body,
    source: 'agent_api',
  });

  if (!validation.success) {
    throw new ApiError(400, 'Validation failed', validation.error.errors);
  }

  const service = getHostingEngagementService();
  const result = await service.createEnquiry(validation.data);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 :
                       result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.status(201).json(result.value);
});

/**
 * Get provider quality profile (Agent API)
 * GET /hosting/agent/providers/:providerId/quality
 */
hostingRouter.get('/agent/providers/:providerId/quality', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingAgentApiService();
  const result = await service.getQualityProfile(providerId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Get provider details (Agent API)
 * GET /hosting/agent/providers/:providerId
 */
hostingRouter.get('/agent/providers/:providerId', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingAgentApiService();
  const result = await service.getProviderDetails(providerId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});

/**
 * Get provider verified outcomes (Agent API)
 * GET /hosting/agent/providers/:providerId/outcomes
 */
hostingRouter.get('/agent/providers/:providerId/outcomes', async (req: Request, res: Response) => {
  const { providerId } = req.params;

  const service = getHostingAgentApiService();
  const result = await service.getVerifiedOutcomes(providerId);

  if (!result.success) {
    const statusCode = result.error.code === 'NOT_FOUND' ? 404 : 500;
    throw new ApiError(statusCode, result.error.message);
  }

  res.json(result.value);
});
