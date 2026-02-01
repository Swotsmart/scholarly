/**
 * Scholarly Hosting - Type Definitions
 *
 * Complete type system for the educational web hosting platform.
 * Enables schools, tutors, micro-schools, and homeschool co-ops to have
 * professional web presences with AI-discoverable structured data.
 *
 * @module ScholarlyHosting/Types
 * @version 1.0.0
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

export type HostingProviderType =
  | 'school' // Traditional K-12 school
  | 'micro_school' // Small independent school (< 50 students)
  | 'tutoring_centre' // Commercial tutoring business
  | 'solo_tutor' // Independent tutor
  | 'homeschool_coop' // Homeschool cooperative
  | 'curriculum_provider' // Sells curriculum/resources
  | 'enrichment' // After-school programs, camps
  | 'online_academy'; // Fully online provider

export type HostingProviderStatus =
  | 'pending_setup'
  | 'active'
  | 'suspended'
  | 'archived';

export type HostingDomainType =
  | 'subdomain' // school.scholarly.io
  | 'custom' // www.school.edu.au
  | 'alias'; // Additional domain

export type HostingDomainStatus =
  | 'pending_verification'
  | 'verified'
  | 'failed_verification'
  | 'suspended';

export type HostingSSLStatus =
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'failed';

export type HostingRegistrationStatus =
  | 'registered' // Government registered
  | 'accredited' // Accredited by recognised body
  | 'pending_registration'
  | 'exempt' // Legally exempt (homeschool)
  | 'unregistered';

export type HostingVerificationLevel =
  | 'unverified'
  | 'email_verified'
  | 'identity_verified' // KYC for solo providers
  | 'registration_verified'
  | 'outcomes_verified'
  | 'premium_verified'; // Full audit + site visit

export type HostingOutcomeType =
  | 'academic_achievement'
  | 'progress_growth'
  | 'graduation_rate'
  | 'university_admission'
  | 'employment_outcomes'
  | 'parent_satisfaction'
  | 'student_satisfaction'
  | 'attendance_rate'
  | 'wellbeing_score';

export type HostingOfferingType =
  | 'school_program'
  | 'course'
  | 'tutoring_package'
  | 'tutoring_session'
  | 'workshop'
  | 'camp'
  | 'curriculum'
  | 'assessment'
  | 'enrichment_program';

export type HostingOfferingStatus = 'draft' | 'published' | 'archived';

export type HostingDeliveryMode =
  | 'in_person'
  | 'online_live'
  | 'online_self_paced'
  | 'hybrid'
  | 'home_visit';

export type HostingYearLevel =
  | 'early_years' // 0-5
  | 'foundation' // Prep/Kindy
  | 'year_1'
  | 'year_2'
  | 'year_3'
  | 'year_4'
  | 'year_5'
  | 'year_6'
  | 'year_7'
  | 'year_8'
  | 'year_9'
  | 'year_10'
  | 'year_11'
  | 'year_12'
  | 'adult';

export type HostingCEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// ============================================================================
// BASE TYPES
// ============================================================================

export interface HostingBaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface HostingTenantEntity extends HostingBaseEntity {
  tenantId: string;
}

// ============================================================================
// EDUCATIONAL PROVIDER
// ============================================================================

export interface HostingEducationalProvider extends HostingBaseEntity {
  tenantId: string; // Link to Scholarly core tenant
  type: HostingProviderType;

  // Identity
  displayName: string;
  legalName: string | null;
  description: string;
  tagline: string | null;

  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  theme: HostingProviderTheme;

  // Location(s)
  locations: HostingProviderLocation[];
  serviceArea: HostingServiceArea | null;

  // Contact
  primaryContact: HostingContactInfo;

  // Domains
  domains: HostingProviderDomain[];
  primaryDomain: string;

  // Trust & Compliance
  qualityProfile: HostingEducationalQualityProfile;

  // Features & Configuration
  features: HostingProviderFeatures;
  seoConfig: HostingEducationalSEOConfig;
  agentConfig: HostingEducationalAgentConfig;

  // Integration
  lisIdentifiers: HostingLISIdentifiers | null;
  scholarlyTenantId: string;

  // Status
  status: HostingProviderStatus;
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

export interface HostingProviderLocation {
  id: string;
  name: string;
  isPrimary: boolean;
  address: HostingPostalAddress;
  coordinates: HostingGeoCoordinates | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  operatingHours: HostingOperatingHours | null;
}

export interface HostingPostalAddress {
  streetAddress: string;
  addressLocality: string; // City/suburb
  addressRegion: string; // State
  postalCode: string;
  addressCountry: string;
}

export interface HostingGeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface HostingOperatingHours {
  monday: HostingTimeRange | null;
  tuesday: HostingTimeRange | null;
  wednesday: HostingTimeRange | null;
  thursday: HostingTimeRange | null;
  friday: HostingTimeRange | null;
  saturday: HostingTimeRange | null;
  sunday: HostingTimeRange | null;
}

export interface HostingTimeRange {
  open: string; // "09:00"
  close: string; // "17:00"
}

export interface HostingServiceArea {
  type: 'radius' | 'regions' | 'nationwide' | 'international';
  radiusKm: number | null;
  centerPoint: HostingGeoCoordinates | null;
  regions: string[];
  countries: string[];
}

export interface HostingContactInfo {
  name: string;
  role: string;
  email: string;
  phone: string | null;
  preferredContact: 'email' | 'phone';
}

export interface HostingProviderDomain extends HostingBaseEntity {
  providerId: string;
  domain: string;
  type: HostingDomainType;
  status: HostingDomainStatus;
  sslStatus: HostingSSLStatus;
  sslExpiresAt: Date | null;
  verificationToken: string | null;
  verifiedAt: Date | null;
}

export interface HostingLISIdentifiers {
  sourcedId: string;
  schoolCode: string | null;
  acnc: string | null; // Australian Charities and Not-for-profits
  abn: string | null;
  cricos: string | null; // CRICOS provider code
}

// ============================================================================
// QUALITY PROFILE - THE SCHOLARLY MOAT
// ============================================================================

export interface HostingEducationalQualityProfile {
  providerId: string;

  // Overall score (0-100)
  overallScore: number;
  scoreBreakdown: HostingQualityScoreBreakdown;

  // Registration & Accreditation
  registrationStatus: HostingRegistrationStatus;
  registrationDetails: HostingRegistrationDetails | null;
  accreditations: HostingAccreditation[];

  // Verified Outcomes
  verifiedOutcomes: HostingVerifiedOutcome[];

  // Reviews & Ratings
  aggregateRating: HostingAggregateRating | null;

  // Staff qualifications
  staffQualifications: HostingStaffQualificationSummary | null;

  // Compliance
  complianceRecords: HostingComplianceRecord[];
  complianceStatus:
    | 'compliant'
    | 'minor_issues'
    | 'major_issues'
    | 'not_assessed';

  // Scholarly verification
  verificationLevel: HostingVerificationLevel;
  memberSince: Date;
  lastVerificationDate: Date | null;
  nextVerificationDue: Date | null;

  // Confidence
  confidenceLevel: number; // 0-1
  dataCompleteness: number; // 0-1
}

export interface HostingQualityScoreBreakdown {
  registration: number; // 0-100
  accreditation: number;
  outcomes: number;
  reviews: number;
  staffQualifications: number;
  compliance: number;
  engagement: number;

  weights: {
    registration: number;
    accreditation: number;
    outcomes: number;
    reviews: number;
    staffQualifications: number;
    compliance: number;
    engagement: number;
  };
}

export interface HostingRegistrationDetails {
  registrationNumber: string;
  registrationBody: string;
  registeredAt: Date;
  expiresAt: Date | null;
  verificationUrl: string | null;
  sector: 'government' | 'catholic' | 'independent';
  schoolType: string | null;
}

export interface HostingAccreditation {
  id: string;
  body: string; // e.g., "IB World School", "CRICOS"
  type: string; // e.g., "PYP", "MYP", "DP"
  level: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  verificationUrl: string | null;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  verifiedByScholarly: boolean;
  verifiedAt: Date | null;
}

export interface HostingVerifiedOutcome {
  id: string;
  type: HostingOutcomeType;
  metric: string; // e.g., "NAPLAN Reading Year 5"
  value: number;
  unit: string | null; // e.g., "%", "score", "days"
  comparisonBasis: string; // e.g., "state average", "national median"
  comparisonValue: number | null;
  percentile: number | null;
  year: number;
  cohortSize: number | null;

  verifiedAt: Date;
  verifiedBy: string; // "scholarly", "myschool", "government"
  dataSource: string;
  confidenceLevel: number; // 0-1

  validFrom: Date;
  validUntil: Date | null;
}

export interface HostingAggregateRating {
  average: number; // 1-5
  count: number;
  distribution: {
    star1: number;
    star2: number;
    star3: number;
    star4: number;
    star5: number;
  };
  recommendationRate: number; // % who would recommend
  responseRate: number | null; // Provider response rate
}

export interface HostingStaffQualificationSummary {
  totalStaff: number;
  teachingStaff: number;
  qualifiedTeachers: number; // With teaching registration
  advancedDegrees: number; // Masters/PhD
  averageExperienceYears: number;
  studentTeacherRatio: number;
  specialistStaff: HostingSpecialistCount[];

  lastUpdated: Date;
  verifiedByScholarly: boolean;
}

export interface HostingSpecialistCount {
  area: string; // e.g., "Learning Support", "Gifted Ed"
  count: number;
}

export interface HostingComplianceRecord {
  id: string;
  type: string; // e.g., "Child Safety", "Building Code"
  status: 'compliant' | 'non_compliant' | 'pending' | 'expired';
  issuedBy: string;
  issuedAt: Date;
  expiresAt: Date | null;
  notes: string | null;
  documentUrl: string | null;
}

// ============================================================================
// EDUCATIONAL OFFERINGS
// ============================================================================

export interface HostingEducationalOffering extends HostingBaseEntity {
  providerId: string;
  type: HostingOfferingType;

  // Core info
  name: string;
  description: string;
  shortDescription: string;

  // Educational details
  subjectAreas: string[];
  yearLevels: HostingYearLevel[];
  cefrLevels: HostingCEFRLevel[] | null;
  curriculumAlignment: HostingCurriculumAlignment[];
  learningOutcomes: string[];
  prerequisites: string[];

  // Delivery
  deliveryModes: HostingDeliveryMode[];
  duration: HostingDuration;
  schedule: HostingScheduleInfo | null;

  // Capacity & Availability
  availability: HostingOfferingAvailability;

  // Pricing
  pricing: HostingEducationalPricing;

  // Quality signals
  qualitySignals: HostingOfferingQualitySignals;

  // Agent-optimised content
  naturalLanguageSummary: string;
  parentFriendlySummary: string;
  agentContext: string;

  // Media
  images: HostingMediaAsset[];
  videos: HostingMediaAsset[];
  virtualTourUrl: string | null;

  // Categories & search
  categories: string[];
  tags: string[];

  // Status
  status: HostingOfferingStatus;
  publishedAt: Date | null;
}

export interface HostingCurriculumAlignment {
  framework: string; // e.g., "Australian Curriculum", "IB PYP"
  subject: string;
  level: string;
  codes: string[];
}

export interface HostingDuration {
  type: 'fixed' | 'ongoing' | 'flexible';
  value: number | null;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'terms' | 'years' | null;
  sessionsPerWeek: number | null;
  totalSessions: number | null;
}

export interface HostingScheduleInfo {
  type: 'fixed' | 'flexible' | 'on_demand';
  startDate: Date | null;
  endDate: Date | null;
  enrollmentDeadline: Date | null;
  sessions: HostingScheduledSession[];
}

export interface HostingScheduledSession {
  dayOfWeek: number; // 0-6 (Sun-Sat)
  startTime: string; // "09:00"
  endTime: string;
  timezone: string;
  locationId: string | null;
}

export interface HostingOfferingAvailability {
  status: 'available' | 'limited' | 'waitlist' | 'full' | 'not_available';
  spotsTotal: number | null;
  spotsAvailable: number | null;
  waitlistSize: number | null;
  nextAvailableDate: Date | null;
  bookingLeadDays: number | null;
}

export interface HostingEducationalPricing {
  type:
    | 'free'
    | 'fixed'
    | 'hourly'
    | 'per_session'
    | 'package'
    | 'subscription'
    | 'enquire';
  amount: number | null;
  currency: string;

  // For packages
  packageOptions: HostingPricingPackage[];

  // Discounts
  discounts: HostingPricingDiscount[];

  // Additional info
  includesGst: boolean;
  paymentTerms: string | null;
  cancellationPolicy: string | null;
}

export interface HostingPricingPackage {
  name: string;
  sessions: number;
  amount: number;
  validityDays: number;
  savings: number | null;
}

export interface HostingPricingDiscount {
  type: 'sibling' | 'early_bird' | 'bulk' | 'scholarship' | 'other';
  description: string;
  percentage: number | null;
  amount: number | null;
  conditions: string | null;
}

export interface HostingOfferingQualitySignals {
  providerQualityScore: number;
  completionRate: number | null;
  satisfactionScore: number | null;
  reviewCount: number;
  averageRating: number | null;
  outcomeStatements: string[];
  certificationAwarded: string | null;
}

export interface HostingMediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  title: string;
  alt: string;
  width: number | null;
  height: number | null;
  duration: number | null; // For videos, in seconds
  isPrimary: boolean;
}

// ============================================================================
// PROVIDER FEATURES
// ============================================================================

export interface HostingProviderFeatures {
  // Core features
  customDomains: boolean;
  multipleLocations: boolean;
  advancedAnalytics: boolean;

  // Agent & AI features
  agentApiAccess: boolean;
  structuredDataEnhanced: boolean;
  aiRecommendationsEnabled: boolean;

  // Educational features
  onlineEnrollment: boolean;
  waitlistManagement: boolean;
  tourBooking: boolean;

  // Content features
  blogEnabled: boolean;
  eventsCalendar: boolean;
  resourceLibrary: boolean;

  // Integration features
  webhooksEnabled: boolean;
  apiAccess: boolean;
  lisIntegration: boolean;

  // Premium features
  whiteLabel: boolean;
  prioritySupport: boolean;
  customReporting: boolean;
}

// ============================================================================
// SEO CONFIGURATION
// ============================================================================

export interface HostingEducationalSEOConfig {
  defaultTitle: string;
  titleTemplate: string;
  defaultDescription: string;
  defaultKeywords: string[];

  // Open Graph
  ogImage: string | null;
  ogType: string;

  // Twitter Card
  twitterCard: 'summary' | 'summary_large_image';
  twitterSite: string | null;

  // Structured data
  organizationSchema: HostingEducationalOrganizationSchema;

  // Robots
  robotsConfig: HostingRobotsConfig;
  sitemapEnabled: boolean;
}

export interface HostingEducationalOrganizationSchema {
  '@type': 'EducationalOrganization' | 'School';
  name: string;
  legalName: string | null;
  url: string;
  logo: string | null;
  description: string;
  foundingDate: string | null;

  // Educational specifics
  educationalCredentialAwarded: string[];
  hasCredential: string[];

  // Location
  address: HostingPostalAddress | null;
  areaServed: string[];

  // Contact
  telephone: string | null;
  email: string | null;

  // Social
  sameAs: string[];

  // Scholarly trust signals
  scholarlyQualityScore: number;
  scholarlyVerificationLevel: string;
  scholarlyMemberSince: string;
}

export interface HostingRobotsConfig {
  allowIndexing: boolean;
  allowFollowing: boolean;
  disallowPaths: string[];
  crawlDelay: number | null;
}

// ============================================================================
// AGENT API CONFIGURATION
// ============================================================================

export interface HostingEducationalAgentConfig {
  // API access
  apiEnabled: boolean;
  apiKey: string | null;
  apiKeyPrefix: string | null;

  // Rate limiting
  rateLimit: HostingRateLimitConfig;

  // Capabilities
  capabilities: HostingEducationalAgentCapabilities;

  // Discoverability
  discoverability: HostingDiscoverabilitySettings;
}

export interface HostingRateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface HostingEducationalAgentCapabilities {
  // Discovery
  searchProviders: boolean;
  searchOfferings: boolean;
  getProviderDetails: boolean;
  getOfferingDetails: boolean;
  checkAvailability: boolean;
  compareProviders: boolean;
  compareOfferings: boolean;

  // Quality queries
  getQualityProfile: boolean;
  getVerifiedOutcomes: boolean;
  getReviews: boolean;
  getComplianceStatus: boolean;

  // Enrollment
  checkEnrollmentEligibility: boolean;
  submitEnquiry: boolean;
  bookTour: boolean;
  reservePlace: boolean;
}

export interface HostingDiscoverabilitySettings {
  showInSearch: boolean;
  showPricing: boolean;
  showAvailability: boolean;
  showOutcomes: boolean;
  showStaffInfo: boolean;

  targetAreas: HostingGeoArea[];
  targetYearLevels: HostingYearLevel[];
  targetNeedsTypes: string[];
}

export interface HostingGeoArea {
  type: 'suburb' | 'postcode' | 'region' | 'state' | 'country';
  value: string;
}

// ============================================================================
// AGENT API REQUEST/RESPONSE TYPES
// ============================================================================

export interface HostingProviderSearchRequest {
  query: string;
  filters: HostingProviderSearchFilters;
  sort: HostingProviderSortOption;
  limit: number;
  offset: number;
}

export interface HostingProviderSearchFilters {
  types: HostingProviderType[];
  yearLevels: HostingYearLevel[];
  subjectAreas: string[];
  location: HostingLocationFilter | null;
  minQualityScore: number | null;
  verificationLevels: HostingVerificationLevel[];
  accreditations: string[];
  priceRange: HostingPriceRange | null;
  deliveryModes: HostingDeliveryMode[];
  availability: 'available' | 'waitlist' | 'any';
}

export interface HostingLocationFilter {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface HostingPriceRange {
  min: number | null;
  max: number | null;
  currency: string;
}

export type HostingProviderSortOption =
  | 'relevance'
  | 'quality_score_desc'
  | 'distance_asc'
  | 'rating_desc'
  | 'name_asc';

export interface HostingProviderSearchResult {
  providers: HostingProviderSummary[];
  totalCount: number;
  facets: HostingSearchFacets;
  trustSummary: HostingEducationalTrustSummary;
}

export interface HostingProviderSummary {
  id: string;
  type: HostingProviderType;
  displayName: string;
  tagline: string | null;
  logoUrl: string | null;
  primaryDomain: string;

  location: {
    suburb: string;
    state: string;
    distanceKm: number | null;
  } | null;

  qualityScore: number;
  verificationLevel: HostingVerificationLevel;

  aggregateRating: HostingAggregateRating | null;

  yearLevels: HostingYearLevel[];
  subjectAreas: string[];

  highlightedOutcomes: string[];
  accreditationBadges: string[];
}

export interface HostingSearchFacets {
  types: HostingFacetValue[];
  yearLevels: HostingFacetValue[];
  subjectAreas: HostingFacetValue[];
  accreditations: HostingFacetValue[];
  verificationLevels: HostingFacetValue[];
  priceRanges: HostingFacetValue[];
}

export interface HostingFacetValue {
  value: string;
  count: number;
  label: string;
}

export interface HostingEducationalTrustSummary {
  totalProviders: number;
  verifiedProviders: number;
  averageQualityScore: number;
  outcomesVerifiedCount: number;
  platformStatement: string;
}

export interface HostingProviderCompareRequest {
  providerIds: string[];
  criteria: HostingComparisonCriteria[];
  userContext: HostingUserContext | null;
}

export interface HostingComparisonCriteria {
  category:
    | 'quality'
    | 'outcomes'
    | 'staff'
    | 'facilities'
    | 'pricing'
    | 'location';
  metrics: string[];
}

export interface HostingUserContext {
  studentAge: number | null;
  yearLevel: HostingYearLevel | null;
  learningNeeds: string[];
  priorities: string[];
  location: HostingGeoCoordinates | null;
  budget: HostingPriceRange | null;
}

export interface HostingProviderCompareResult {
  providers: HostingEducationalProvider[];
  comparisonMatrix: HostingComparisonMatrix;
  recommendation: HostingAIRecommendation | null;
  trustSummary: HostingEducationalTrustSummary;
}

export interface HostingComparisonMatrix {
  criteria: string[];
  rows: HostingComparisonRow[];
}

export interface HostingComparisonRow {
  criterion: string;
  category: string;
  values: HostingComparisonValue[];
}

export interface HostingComparisonValue {
  providerId: string;
  value: string | number | null;
  displayValue: string;
  score: number | null;
  isBest: boolean;
}

export interface HostingAIRecommendation {
  recommendedProviderId: string;
  confidence: number;
  reasoning: string;
  considerations: string[];
  alternatives: {
    providerId: string;
    reason: string;
  }[];
}

// ============================================================================
// REVIEWS
// ============================================================================

export interface HostingProviderReview extends HostingBaseEntity {
  providerId: string;

  // Author
  authorType: 'parent' | 'student' | 'staff' | 'alumni';
  authorName: string | null;
  isVerified: boolean;

  // Rating
  overallRating: number; // 1-5
  categoryRatings: HostingCategoryRating[];

  // Content
  title: string | null;
  content: string;

  // Recommendation
  wouldRecommend: boolean;

  // Engagement
  helpfulCount: number;

  // Response
  providerResponse: string | null;
  providerRespondedAt: Date | null;

  // Moderation
  status: 'pending' | 'published' | 'hidden' | 'flagged';
  moderatedAt: Date | null;
}

export interface HostingCategoryRating {
  category: string; // e.g., "Teaching Quality", "Communication"
  rating: number;
}

// ============================================================================
// ENQUIRIES & BOOKINGS
// ============================================================================

export interface HostingEnquiry extends HostingBaseEntity {
  providerId: string;
  offeringId: string | null;

  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  preferredContact: 'email' | 'phone';

  // Student info
  studentName: string | null;
  studentAge: number | null;
  studentYearLevel: HostingYearLevel | null;

  // Enquiry details
  enquiryType: 'general' | 'enrollment' | 'tour' | 'pricing' | 'availability';
  message: string;

  // Source
  source: 'website' | 'agent_api' | 'referral' | 'other';
  agentId: string | null;

  // Status
  status: 'new' | 'contacted' | 'in_progress' | 'converted' | 'closed';

  // Response
  respondedAt: Date | null;
  responseTime: number | null; // Minutes
}

export interface HostingTourBooking extends HostingBaseEntity {
  providerId: string;
  locationId: string;

  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;

  // Booking
  scheduledAt: Date;
  duration: number; // Minutes
  tourType: 'in_person' | 'virtual';

  // Attendees
  attendeeCount: number;
  studentNames: string[];

  // Status
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
  confirmedAt: Date | null;

  // Notes
  specialRequests: string | null;
  providerNotes: string | null;
}

// ============================================================================
// EVENTS
// ============================================================================

export interface HostingEvent {
  id: string;
  type: HostingEventType;
  providerId: string;
  timestamp: Date;
  data: Record<string, unknown>;
  metadata: HostingEventMetadata;
}

export type HostingEventType =
  // Provider lifecycle
  | 'provider.created'
  | 'provider.updated'
  | 'provider.verified'
  | 'provider.suspended'
  | 'provider.activated'

  // Domain lifecycle
  | 'domain.created'
  | 'domain.verified'
  | 'domain.ssl_provisioned'
  | 'domain.ssl_expiring'
  | 'domain.deleted'

  // Quality events
  | 'quality.score_updated'
  | 'quality.outcome_verified'
  | 'quality.accreditation_added'
  | 'quality.compliance_updated'

  // Offering lifecycle
  | 'offering.created'
  | 'offering.published'
  | 'offering.updated'
  | 'offering.archived'

  // Engagement events
  | 'enquiry.received'
  | 'enquiry.responded'
  | 'tour.booked'
  | 'tour.completed'
  | 'review.submitted'
  | 'review.responded'

  // Agent events
  | 'agent.authenticated'
  | 'agent.search_performed'
  | 'agent.comparison_requested'
  | 'agent.recommendation_generated';

export interface HostingEventMetadata {
  source: string;
  version: string;
  correlationId: string | null;
  userId: string | null;
  agentId: string | null;
}
