/**
 * Hosting Services Initialization
 *
 * Sets up the hosting services with Prisma-backed repositories.
 */

import {
  initializeHostingProviderService,
  initializeHostingEngagementService,
  initializeHostingAgentApiService,
  initializeHostingQualityService,
  initializeHostingStructuredDataService,
} from '../services';
import { logger } from './logger';

import {
  createPrismaProviderRepository,
  createPrismaEnquiryRepository,
  createPrismaTourBookingRepository,
  createPrismaReviewRepository,
  createPrismaQualityProfileRepository,
  createPrismaAgentProviderRepository,
  createPrismaAgentQualityRepository,
  createPrismaAgentOfferingRepository,
} from '../repositories/hosting.repository';

// ============================================================================
// INITIALIZATION FUNCTION
// ============================================================================

let initialized = false;

export function initializeHostingServices(): void {
  if (initialized) {
    return;
  }

  // Create Prisma repositories
  const providerRepo = createPrismaProviderRepository();
  const enquiryRepo = createPrismaEnquiryRepository();
  const tourRepo = createPrismaTourBookingRepository();
  const reviewRepo = createPrismaReviewRepository();
  const qualityRepo = createPrismaQualityProfileRepository();
  const agentProviderRepo = createPrismaAgentProviderRepository();
  const agentQualityRepo = createPrismaAgentQualityRepository();
  const agentOfferingRepo = createPrismaAgentOfferingRepository();

  // Initialize services
  initializeHostingProviderService(providerRepo);

  initializeHostingEngagementService(enquiryRepo, tourRepo, reviewRepo);

  initializeHostingQualityService(qualityRepo, providerRepo);

  initializeHostingAgentApiService(
    agentProviderRepo,
    agentQualityRepo,
    agentOfferingRepo
  );

  initializeHostingStructuredDataService();

  initialized = true;
  logger.info('Hosting services initialized with Prisma repositories');
}
