/**
 * Scholarly - Education Vertical for Chekd Platform
 * 
 * A comprehensive education ecosystem connecting learners with tutors,
 * enabling homeschool communities, supporting micro-schools, and creating
 * a marketplace for educational content.
 * 
 * ## Modules
 * 
 * - **Tutor Booking**: AI-powered matching between learners and tutors
 * - **Content Marketplace**: TPT-style resource marketplace with request system
 * - **Homeschool Hub**: Community platform for homeschool families (coming)
 * - **Micro-School**: Support for small learning communities (coming)
 * 
 * ## Integration with Chekd
 * 
 * - Uses $CHKD tokens (displayed as "Scholar Points")
 * - Integrates with LIS for learning insights
 * - Leverages Trust Service for safeguarding
 * - Multi-tenant architecture
 * 
 * @module Scholarly
 */

// Shared Types & Infrastructure
export * from './shared/types';

// Tutor Booking Service
export {
  TutorBookingService,
  TutorRepository,
  LearnerRepository,
  SessionRepository,
  BookingRepository,
  TutorSearchFilters,
  Booking,
  BookingPricing,
  TutorMatchRequest,
  TutorMatch,
  ProfileBuilderSession
} from './tutor-booking/tutor-booking.service';

// Content Marketplace Service
export {
  ContentMarketplaceService,
  ContentRepository,
  ReviewRepository,
  RequestRepository,
  PurchaseRepository,
  CreatorProfileRepository,
  ContentItem,
  ContentType,
  ContentSearchQuery,
  ContentReview,
  LearningAssetRequest,
  RequestVote,
  CreatorProfile,
  Purchase
} from './content-marketplace/content-marketplace.service';

// Module metadata
export const SCHOLARLY_VERSION = '1.0.0';
export const SCHOLARLY_MODULES = {
  tutorBooking: { status: 'complete', lines: 450 },
  contentMarketplace: { status: 'complete', lines: 600 },
  homeschoolHub: { status: 'planned', lines: 0 },
  microSchool: { status: 'planned', lines: 0 },
  scheduling: { status: 'planned', lines: 0 },
  trustVerification: { status: 'planned', lines: 0 }
};
