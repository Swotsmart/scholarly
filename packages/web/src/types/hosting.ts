/**
 * Scholarly Hosting Type Definitions
 *
 * Types for the educational web hosting platform that enables schools,
 * tutors, micro-schools, and homeschool co-ops to have professional
 * web presences with AI-discoverable structured data.
 *
 * Source of truth: packages/api/src/services/hosting-types.ts (1,059L)
 * Route endpoints: packages/api/src/routes/hosting.ts (855L, 33 endpoints)
 */

// =============================================================================
// CORE ENUMS
// =============================================================================

export type HostingProviderType =
  | 'school'
  | 'micro_school'
  | 'tutoring_centre'
  | 'solo_tutor'
  | 'homeschool_coop'
  | 'curriculum_provider'
  | 'enrichment'
  | 'online_academy';

export type HostingProviderStatus = 'pending_setup' | 'active' | 'suspended' | 'archived';
export type HostingDomainType = 'subdomain' | 'custom' | 'alias';
export type HostingDomainStatus = 'pending_verification' | 'verified' | 'failed_verification' | 'suspended';
export type HostingSSLStatus = 'pending' | 'provisioning' | 'active' | 'expiring_soon' | 'expired' | 'failed';
export type HostingVerificationLevel = 'unverified' | 'email_verified' | 'identity_verified' | 'registration_verified' | 'outcomes_verified' | 'premium_verified';
export type HostingRegistrationStatus = 'registered' | 'accredited' | 'pending_registration' | 'exempt' | 'unregistered';
export type HostingOfferingStatus = 'draft' | 'published' | 'archived';
export type HostingDeliveryMode = 'in_person' | 'online_live' | 'online_self_paced' | 'hybrid' | 'home_visit';
export type HostingYearLevel = 'early_years' | 'foundation' | 'year_1' | 'year_2' | 'year_3' | 'year_4' | 'year_5' | 'year_6' | 'year_7' | 'year_8' | 'year_9' | 'year_10' | 'year_11' | 'year_12' | 'adult';

// =============================================================================
// PROVIDER
// =============================================================================

export interface HostingPostalAddress {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode: string;
  addressCountry: string;
}

export interface HostingGeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface HostingProviderLocation {
  id: string;
  name: string;
  isPrimary: boolean;
  address: HostingPostalAddress;
  coordinates: HostingGeoCoordinates | null;
  phone: string | null;
  email: string | null;
  timezone: string;
}

export interface HostingContactInfo {
  name: string;
  role: string;
  email: string;
  phone: string | null;
  preferredContact: 'email' | 'phone';
}

export interface HostingProviderTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  customCss: string | null;
}

export interface HostingProviderDomain {
  id: string;
  providerId: string;
  domain: string;
  type: HostingDomainType;
  status: HostingDomainStatus;
  sslStatus: HostingSSLStatus;
  sslExpiresAt: string | null;
  verificationToken: string | null;
  verifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HostingProviderFeatures {
  customDomains: boolean;
  multipleLocations: boolean;
  advancedAnalytics: boolean;
  agentApiAccess: boolean;
  structuredDataEnhanced: boolean;
  aiRecommendationsEnabled: boolean;
  onlineEnrollment: boolean;
  waitlistManagement: boolean;
  tourBooking: boolean;
  blogEnabled: boolean;
  eventsCalendar: boolean;
  resourceLibrary: boolean;
  webhooksEnabled: boolean;
  apiAccess: boolean;
  lisIntegration: boolean;
  whiteLabel: boolean;
  prioritySupport: boolean;
  customReporting: boolean;
}

export interface HostingEducationalProvider {
  id: string;
  tenantId: string;
  type: HostingProviderType;
  displayName: string;
  legalName: string | null;
  description: string;
  tagline: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  theme: HostingProviderTheme;
  locations: HostingProviderLocation[];
  primaryContact: HostingContactInfo;
  domains: HostingProviderDomain[];
  primaryDomain: string;
  qualityProfile: HostingEducationalQualityProfile;
  features: HostingProviderFeatures;
  status: HostingProviderStatus;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// QUALITY PROFILE
// =============================================================================

export interface HostingAggregateRating {
  average: number;
  count: number;
  distribution: { star1: number; star2: number; star3: number; star4: number; star5: number };
  recommendationRate: number;
  responseRate: number | null;
}

export interface HostingAccreditation {
  id: string;
  body: string;
  type: string;
  level: string | null;
  issuedAt: string;
  expiresAt: string | null;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  verifiedByScholarly: boolean;
}

export interface HostingVerifiedOutcome {
  id: string;
  type: string;
  metric: string;
  value: number;
  unit: string | null;
  comparisonBasis: string;
  comparisonValue: number | null;
  percentile: number | null;
  year: number;
  cohortSize: number | null;
  verifiedAt: string;
  verifiedBy: string;
  confidenceLevel: number;
}

export interface HostingQualityScoreBreakdown {
  registration: number;
  accreditation: number;
  outcomes: number;
  reviews: number;
  staffQualifications: number;
  compliance: number;
  engagement: number;
  weights: Record<string, number>;
}

export interface HostingEducationalQualityProfile {
  providerId: string;
  overallScore: number;
  scoreBreakdown: HostingQualityScoreBreakdown;
  registrationStatus: HostingRegistrationStatus;
  accreditations: HostingAccreditation[];
  verifiedOutcomes: HostingVerifiedOutcome[];
  aggregateRating: HostingAggregateRating | null;
  verificationLevel: HostingVerificationLevel;
  complianceStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'not_assessed';
  confidenceLevel: number;
  dataCompleteness: number;
  memberSince: string;
}

// =============================================================================
// ENQUIRIES, TOURS, REVIEWS
// =============================================================================

export interface HostingEnquiry {
  id: string;
  providerId: string;
  offeringId: string | null;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  studentName: string | null;
  studentAge: number | null;
  studentYearLevel: string | null;
  enquiryType: 'general' | 'enrollment' | 'tour' | 'pricing' | 'availability';
  message: string;
  source: 'website' | 'agent_api' | 'referral' | 'other';
  status: 'new' | 'contacted' | 'in_progress' | 'converted' | 'closed';
  respondedAt: string | null;
  responseTime: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface HostingTourBooking {
  id: string;
  providerId: string;
  locationId: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  scheduledAt: string;
  duration: number;
  tourType: 'in_person' | 'virtual';
  attendeeCount: number;
  studentNames: string[];
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  specialRequests: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HostingProviderReview {
  id: string;
  providerId: string;
  authorType: 'parent' | 'student' | 'staff' | 'alumni';
  authorName: string | null;
  isVerified: boolean;
  overallRating: number;
  categoryRatings: Array<{ category: string; rating: number }>;
  title: string | null;
  content: string;
  wouldRecommend: boolean;
  helpfulCount: number;
  providerResponse: string | null;
  providerRespondedAt: string | null;
  status: 'pending' | 'published' | 'hidden' | 'flagged';
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// AGENT API TYPES
// =============================================================================

export interface HostingProviderSummary {
  id: string;
  type: HostingProviderType;
  displayName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryDomain: string;
  location: { suburb: string; state: string; distanceKm: number | null } | null;
  qualityScore: number;
  verificationLevel: HostingVerificationLevel;
  aggregateRating: HostingAggregateRating | null;
  yearLevels: HostingYearLevel[];
  subjectAreas: string[];
  highlightedOutcomes: string[];
  accreditationBadges: string[];
}

export interface HostingSearchFacets {
  types: Array<{ value: string; count: number; label: string }>;
  yearLevels: Array<{ value: string; count: number; label: string }>;
  subjectAreas: Array<{ value: string; count: number; label: string }>;
}

export interface HostingProviderSearchResult {
  providers: HostingProviderSummary[];
  totalCount: number;
  facets: HostingSearchFacets;
}

export interface HostingProviderCompareResult {
  providers: HostingEducationalProvider[];
  comparisonMatrix: {
    criteria: string[];
    rows: Array<{
      criterion: string;
      category: string;
      values: Array<{ providerId: string; displayValue: string; score: number | null; isBest: boolean }>;
    }>;
  };
  recommendation: { recommendedProviderId: string; confidence: number; reasoning: string } | null;
}

// =============================================================================
// INPUT TYPES (maps to route Zod schemas)
// =============================================================================

export interface CreateProviderInput {
  type: HostingProviderType;
  displayName: string;
  legalName?: string;
  description: string;
  tagline?: string;
  subdomain?: string;
  location?: {
    name: string;
    address: HostingPostalAddress;
    phone?: string;
    email?: string;
    timezone?: string;
  };
  contact: { name: string; role: string; email: string; phone?: string };
}

export interface UpdateProviderInput {
  displayName?: string;
  legalName?: string | null;
  description?: string;
  tagline?: string | null;
  logoUrl?: string | null;
  faviconUrl?: string | null;
}

export interface UpdateThemeInput {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  backgroundColor?: string;
  textColor?: string;
  fontFamily?: string;
  customCss?: string | null;
}

export interface CreateEnquiryInput {
  providerId: string;
  offeringId?: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  preferredContact?: 'email' | 'phone';
  studentName?: string;
  studentAge?: number;
  studentYearLevel?: string;
  enquiryType: 'general' | 'enrollment' | 'tour' | 'pricing' | 'availability';
  message: string;
  source?: 'website' | 'agent_api' | 'referral' | 'other';
}

export interface CreateTourBookingInput {
  providerId: string;
  locationId: string;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  scheduledAt: string;
  duration?: number;
  tourType: 'in_person' | 'virtual';
  attendeeCount: number;
  studentNames?: string[];
  specialRequests?: string;
}

export interface CreateReviewInput {
  providerId: string;
  authorType: 'parent' | 'student' | 'staff' | 'alumni';
  authorName?: string;
  overallRating: number;
  categoryRatings?: Array<{ category: string; rating: number }>;
  title?: string;
  content: string;
  wouldRecommend: boolean;
}

export interface SearchProvidersInput {
  query?: string;
  types?: string[];
  yearLevels?: string[];
  subjectAreas?: string[];
  location?: { latitude: number; longitude: number; radiusKm?: number };
  minQualityScore?: number;
  limit?: number;
  offset?: number;
}

export interface AddOutcomeInput {
  type: string;
  metric: string;
  value: number;
  unit?: string;
  year: number;
  cohortSize?: number;
  comparisonBasis?: string;
  comparisonValue?: number;
  dataSource?: string;
}

export interface RegistrationInput {
  registrationNumber: string;
  registrationBody: string;
  sector?: string;
  schoolType?: string;
  verificationUrl?: string;
}

// =============================================================================
// API ERROR
// =============================================================================

export interface HostingError {
  code: string;
  message?: string;
  details?: unknown;
}
