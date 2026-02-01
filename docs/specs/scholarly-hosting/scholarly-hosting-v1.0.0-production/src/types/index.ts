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

export type ProviderType = 
  | 'school'              // Traditional K-12 school
  | 'micro_school'        // Small independent school (< 50 students)
  | 'tutoring_centre'     // Commercial tutoring business
  | 'solo_tutor'          // Independent tutor
  | 'homeschool_coop'     // Homeschool cooperative
  | 'curriculum_provider' // Sells curriculum/resources
  | 'enrichment'          // After-school programs, camps
  | 'online_academy';     // Fully online provider

export type ProviderStatus = 
  | 'pending_setup'
  | 'active'
  | 'suspended'
  | 'archived';

export type DomainType = 
  | 'subdomain'           // school.scholarly.io
  | 'custom'              // www.school.edu.au
  | 'alias';              // Additional domain

export type DomainStatus = 
  | 'pending_verification'
  | 'verified'
  | 'failed_verification'
  | 'suspended';

export type SSLStatus = 
  | 'pending'
  | 'provisioning'
  | 'active'
  | 'expiring_soon'
  | 'expired'
  | 'failed';

export type RegistrationStatus = 
  | 'registered'          // Government registered
  | 'accredited'          // Accredited by recognised body
  | 'pending_registration'
  | 'exempt'              // Legally exempt (homeschool)
  | 'unregistered';

export type VerificationLevel = 
  | 'unverified'
  | 'email_verified'
  | 'identity_verified'   // KYC for solo providers
  | 'registration_verified'
  | 'outcomes_verified'
  | 'premium_verified';   // Full audit + site visit

export type OutcomeType = 
  | 'academic_achievement'
  | 'progress_growth'
  | 'graduation_rate'
  | 'university_admission'
  | 'employment_outcomes'
  | 'parent_satisfaction'
  | 'student_satisfaction'
  | 'attendance_rate'
  | 'wellbeing_score';

export type OfferingType = 
  | 'school_program'
  | 'course'
  | 'tutoring_package'
  | 'tutoring_session'
  | 'workshop'
  | 'camp'
  | 'curriculum'
  | 'assessment'
  | 'enrichment_program';

export type OfferingStatus = 
  | 'draft'
  | 'published'
  | 'archived';

export type DeliveryMode = 
  | 'in_person'
  | 'online_live'
  | 'online_self_paced'
  | 'hybrid'
  | 'home_visit';

export type YearLevel = 
  | 'early_years'         // 0-5
  | 'foundation'          // Prep/Kindy
  | 'year_1' | 'year_2' | 'year_3' | 'year_4' | 'year_5' | 'year_6'
  | 'year_7' | 'year_8' | 'year_9' | 'year_10' | 'year_11' | 'year_12'
  | 'adult';

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';

// ============================================================================
// BASE TYPES
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

// ============================================================================
// EDUCATIONAL PROVIDER
// ============================================================================

export interface EducationalProvider extends BaseEntity {
  tenantId: string;                    // Link to Scholarly core tenant
  type: ProviderType;
  
  // Identity
  displayName: string;
  legalName: string | null;
  description: string;
  tagline: string | null;
  
  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  theme: ProviderTheme;
  
  // Location(s)
  locations: ProviderLocation[];
  serviceArea: ServiceArea | null;
  
  // Contact
  primaryContact: ContactInfo;
  
  // Domains
  domains: ProviderDomain[];
  primaryDomain: string;
  
  // Trust & Compliance
  qualityProfile: EducationalQualityProfile;
  
  // Features & Configuration
  features: ProviderFeatures;
  seoConfig: EducationalSEOConfig;
  agentConfig: EducationalAgentConfig;
  
  // Integration
  lisIdentifiers: LISIdentifiers | null;
  scholarlyTenantId: string;
  
  // Status
  status: ProviderStatus;
}

export interface ProviderTheme {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontFamily: string;
  customCss: string | null;
}

export interface ProviderLocation {
  id: string;
  name: string;
  isPrimary: boolean;
  address: PostalAddress;
  coordinates: GeoCoordinates | null;
  phone: string | null;
  email: string | null;
  timezone: string;
  operatingHours: OperatingHours | null;
}

export interface PostalAddress {
  streetAddress: string;
  addressLocality: string;           // City/suburb
  addressRegion: string;             // State
  postalCode: string;
  addressCountry: string;
}

export interface GeoCoordinates {
  latitude: number;
  longitude: number;
}

export interface OperatingHours {
  monday: TimeRange | null;
  tuesday: TimeRange | null;
  wednesday: TimeRange | null;
  thursday: TimeRange | null;
  friday: TimeRange | null;
  saturday: TimeRange | null;
  sunday: TimeRange | null;
}

export interface TimeRange {
  open: string;                       // "09:00"
  close: string;                      // "17:00"
}

export interface ServiceArea {
  type: 'radius' | 'regions' | 'nationwide' | 'international';
  radiusKm: number | null;
  centerPoint: GeoCoordinates | null;
  regions: string[];
  countries: string[];
}

export interface ContactInfo {
  name: string;
  role: string;
  email: string;
  phone: string | null;
  preferredContact: 'email' | 'phone';
}

export interface ProviderDomain extends BaseEntity {
  providerId: string;
  domain: string;
  type: DomainType;
  status: DomainStatus;
  sslStatus: SSLStatus;
  sslExpiresAt: Date | null;
  verificationToken: string | null;
  verifiedAt: Date | null;
}

export interface LISIdentifiers {
  sourcedId: string;
  schoolCode: string | null;
  acnc: string | null;               // Australian Charities and Not-for-profits
  abn: string | null;
  cricos: string | null;             // CRICOS provider code
}

// ============================================================================
// QUALITY PROFILE - THE SCHOLARLY MOAT
// ============================================================================

export interface EducationalQualityProfile {
  providerId: string;
  
  // Overall score (0-100)
  overallScore: number;
  scoreBreakdown: QualityScoreBreakdown;
  
  // Registration & Accreditation
  registrationStatus: RegistrationStatus;
  registrationDetails: RegistrationDetails | null;
  accreditations: Accreditation[];
  
  // Verified Outcomes
  verifiedOutcomes: VerifiedOutcome[];
  
  // Reviews & Ratings
  aggregateRating: AggregateRating | null;
  
  // Staff qualifications
  staffQualifications: StaffQualificationSummary | null;
  
  // Compliance
  complianceRecords: ComplianceRecord[];
  complianceStatus: 'compliant' | 'minor_issues' | 'major_issues' | 'not_assessed';
  
  // Scholarly verification
  verificationLevel: VerificationLevel;
  memberSince: Date;
  lastVerificationDate: Date | null;
  nextVerificationDue: Date | null;
  
  // Confidence
  confidenceLevel: number;           // 0-1
  dataCompleteness: number;          // 0-1
}

export interface QualityScoreBreakdown {
  registration: number;              // 0-100
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

export interface RegistrationDetails {
  registrationNumber: string;
  registrationBody: string;
  registeredAt: Date;
  expiresAt: Date | null;
  verificationUrl: string | null;
  sector: 'government' | 'catholic' | 'independent';
  schoolType: string | null;
}

export interface Accreditation {
  id: string;
  body: string;                       // e.g., "IB World School", "CRICOS"
  type: string;                       // e.g., "PYP", "MYP", "DP"
  level: string | null;
  issuedAt: Date;
  expiresAt: Date | null;
  verificationUrl: string | null;
  status: 'active' | 'expired' | 'suspended' | 'pending';
  verifiedByScholarly: boolean;
  verifiedAt: Date | null;
}

export interface VerifiedOutcome {
  id: string;
  type: OutcomeType;
  metric: string;                     // e.g., "NAPLAN Reading Year 5"
  value: number;
  unit: string | null;                // e.g., "%", "score", "days"
  comparisonBasis: string;            // e.g., "state average", "national median"
  comparisonValue: number | null;
  percentile: number | null;
  year: number;
  cohortSize: number | null;
  
  verifiedAt: Date;
  verifiedBy: string;                 // "scholarly", "myschool", "government"
  dataSource: string;
  confidenceLevel: number;            // 0-1
  
  validFrom: Date;
  validUntil: Date | null;
}

export interface AggregateRating {
  average: number;                    // 1-5
  count: number;
  distribution: {
    star1: number;
    star2: number;
    star3: number;
    star4: number;
    star5: number;
  };
  recommendationRate: number;         // % who would recommend
  responseRate: number | null;        // Provider response rate
}

export interface StaffQualificationSummary {
  totalStaff: number;
  teachingStaff: number;
  qualifiedTeachers: number;          // With teaching registration
  advancedDegrees: number;            // Masters/PhD
  averageExperienceYears: number;
  studentTeacherRatio: number;
  specialistStaff: SpecialistCount[];
  
  lastUpdated: Date;
  verifiedByScholarly: boolean;
}

export interface SpecialistCount {
  area: string;                       // e.g., "Learning Support", "Gifted Ed"
  count: number;
}

export interface ComplianceRecord {
  id: string;
  type: string;                       // e.g., "Child Safety", "Building Code"
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

export interface EducationalOffering extends BaseEntity {
  providerId: string;
  type: OfferingType;
  
  // Core info
  name: string;
  description: string;
  shortDescription: string;
  
  // Educational details
  subjectAreas: string[];
  yearLevels: YearLevel[];
  cefrLevels: CEFRLevel[] | null;
  curriculumAlignment: CurriculumAlignment[];
  learningOutcomes: string[];
  prerequisites: string[];
  
  // Delivery
  deliveryModes: DeliveryMode[];
  duration: Duration;
  schedule: ScheduleInfo | null;
  
  // Capacity & Availability
  availability: OfferingAvailability;
  
  // Pricing
  pricing: EducationalPricing;
  
  // Quality signals
  qualitySignals: OfferingQualitySignals;
  
  // Agent-optimised content
  naturalLanguageSummary: string;
  parentFriendlySummary: string;
  agentContext: string;
  
  // Media
  images: MediaAsset[];
  videos: MediaAsset[];
  virtualTourUrl: string | null;
  
  // Categories & search
  categories: string[];
  tags: string[];
  
  // Status
  status: OfferingStatus;
  publishedAt: Date | null;
}

export interface CurriculumAlignment {
  framework: string;                  // e.g., "Australian Curriculum", "IB PYP"
  subject: string;
  level: string;
  codes: string[];
}

export interface Duration {
  type: 'fixed' | 'ongoing' | 'flexible';
  value: number | null;
  unit: 'minutes' | 'hours' | 'days' | 'weeks' | 'terms' | 'years' | null;
  sessionsPerWeek: number | null;
  totalSessions: number | null;
}

export interface ScheduleInfo {
  type: 'fixed' | 'flexible' | 'on_demand';
  startDate: Date | null;
  endDate: Date | null;
  enrollmentDeadline: Date | null;
  sessions: ScheduledSession[];
}

export interface ScheduledSession {
  dayOfWeek: number;                  // 0-6 (Sun-Sat)
  startTime: string;                  // "09:00"
  endTime: string;
  timezone: string;
  locationId: string | null;
}

export interface OfferingAvailability {
  status: 'available' | 'limited' | 'waitlist' | 'full' | 'not_available';
  spotsTotal: number | null;
  spotsAvailable: number | null;
  waitlistSize: number | null;
  nextAvailableDate: Date | null;
  bookingLeadDays: number | null;
}

export interface EducationalPricing {
  type: 'free' | 'fixed' | 'hourly' | 'per_session' | 'package' | 'subscription' | 'enquire';
  amount: number | null;
  currency: string;
  
  // For packages
  packageOptions: PricingPackage[];
  
  // Discounts
  discounts: PricingDiscount[];
  
  // Additional info
  includesGst: boolean;
  paymentTerms: string | null;
  cancellationPolicy: string | null;
}

export interface PricingPackage {
  name: string;
  sessions: number;
  amount: number;
  validityDays: number;
  savings: number | null;
}

export interface PricingDiscount {
  type: 'sibling' | 'early_bird' | 'bulk' | 'scholarship' | 'other';
  description: string;
  percentage: number | null;
  amount: number | null;
  conditions: string | null;
}

export interface OfferingQualitySignals {
  providerQualityScore: number;
  completionRate: number | null;
  satisfactionScore: number | null;
  reviewCount: number;
  averageRating: number | null;
  outcomeStatements: string[];
  certificationAwarded: string | null;
}

export interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video';
  title: string;
  alt: string;
  width: number | null;
  height: number | null;
  duration: number | null;           // For videos, in seconds
  isPrimary: boolean;
}

// ============================================================================
// PROVIDER FEATURES
// ============================================================================

export interface ProviderFeatures {
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

export interface EducationalSEOConfig {
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
  organizationSchema: EducationalOrganizationSchema;
  
  // Robots
  robotsConfig: RobotsConfig;
  sitemapEnabled: boolean;
}

export interface EducationalOrganizationSchema {
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
  address: PostalAddress | null;
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

export interface RobotsConfig {
  allowIndexing: boolean;
  allowFollowing: boolean;
  disallowPaths: string[];
  crawlDelay: number | null;
}

// ============================================================================
// AGENT API CONFIGURATION
// ============================================================================

export interface EducationalAgentConfig {
  // API access
  apiEnabled: boolean;
  apiKey: string | null;
  apiKeyPrefix: string | null;
  
  // Rate limiting
  rateLimit: RateLimitConfig;
  
  // Capabilities
  capabilities: EducationalAgentCapabilities;
  
  // Discoverability
  discoverability: DiscoverabilitySettings;
}

export interface RateLimitConfig {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
}

export interface EducationalAgentCapabilities {
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

export interface DiscoverabilitySettings {
  showInSearch: boolean;
  showPricing: boolean;
  showAvailability: boolean;
  showOutcomes: boolean;
  showStaffInfo: boolean;
  
  targetAreas: GeoArea[];
  targetYearLevels: YearLevel[];
  targetNeedsTypes: string[];
}

export interface GeoArea {
  type: 'suburb' | 'postcode' | 'region' | 'state' | 'country';
  value: string;
}

// ============================================================================
// AGENT API REQUEST/RESPONSE TYPES
// ============================================================================

export interface ProviderSearchRequest {
  query: string;
  filters: ProviderSearchFilters;
  sort: ProviderSortOption;
  limit: number;
  offset: number;
}

export interface ProviderSearchFilters {
  types: ProviderType[];
  yearLevels: YearLevel[];
  subjectAreas: string[];
  location: LocationFilter | null;
  minQualityScore: number | null;
  verificationLevels: VerificationLevel[];
  accreditations: string[];
  priceRange: PriceRange | null;
  deliveryModes: DeliveryMode[];
  availability: 'available' | 'waitlist' | 'any';
}

export interface LocationFilter {
  latitude: number;
  longitude: number;
  radiusKm: number;
}

export interface PriceRange {
  min: number | null;
  max: number | null;
  currency: string;
}

export type ProviderSortOption = 
  | 'relevance'
  | 'quality_score_desc'
  | 'distance_asc'
  | 'rating_desc'
  | 'name_asc';

export interface ProviderSearchResult {
  providers: ProviderSummary[];
  totalCount: number;
  facets: SearchFacets;
  trustSummary: EducationalTrustSummary;
}

export interface ProviderSummary {
  id: string;
  type: ProviderType;
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
  verificationLevel: VerificationLevel;
  
  aggregateRating: AggregateRating | null;
  
  yearLevels: YearLevel[];
  subjectAreas: string[];
  
  highlightedOutcomes: string[];
  accreditationBadges: string[];
}

export interface SearchFacets {
  types: FacetValue[];
  yearLevels: FacetValue[];
  subjectAreas: FacetValue[];
  accreditations: FacetValue[];
  verificationLevels: FacetValue[];
  priceRanges: FacetValue[];
}

export interface FacetValue {
  value: string;
  count: number;
  label: string;
}

export interface EducationalTrustSummary {
  totalProviders: number;
  verifiedProviders: number;
  averageQualityScore: number;
  outcomesVerifiedCount: number;
  platformStatement: string;
}

export interface ProviderCompareRequest {
  providerIds: string[];
  criteria: ComparisonCriteria[];
  userContext: UserContext | null;
}

export interface ComparisonCriteria {
  category: 'quality' | 'outcomes' | 'staff' | 'facilities' | 'pricing' | 'location';
  metrics: string[];
}

export interface UserContext {
  studentAge: number | null;
  yearLevel: YearLevel | null;
  learningNeeds: string[];
  priorities: string[];
  location: GeoCoordinates | null;
  budget: PriceRange | null;
}

export interface ProviderCompareResult {
  providers: EducationalProvider[];
  comparisonMatrix: ComparisonMatrix;
  recommendation: AIRecommendation | null;
  trustSummary: EducationalTrustSummary;
}

export interface ComparisonMatrix {
  criteria: string[];
  rows: ComparisonRow[];
}

export interface ComparisonRow {
  criterion: string;
  category: string;
  values: ComparisonValue[];
}

export interface ComparisonValue {
  providerId: string;
  value: string | number | null;
  displayValue: string;
  score: number | null;
  isBest: boolean;
}

export interface AIRecommendation {
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

export interface ProviderReview extends BaseEntity {
  providerId: string;
  
  // Author
  authorType: 'parent' | 'student' | 'staff' | 'alumni';
  authorName: string | null;
  isVerified: boolean;
  
  // Rating
  overallRating: number;             // 1-5
  categoryRatings: CategoryRating[];
  
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

export interface CategoryRating {
  category: string;                   // e.g., "Teaching Quality", "Communication"
  rating: number;
}

// ============================================================================
// ENQUIRIES & BOOKINGS
// ============================================================================

export interface Enquiry extends BaseEntity {
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
  studentYearLevel: YearLevel | null;
  
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
  responseTime: number | null;       // Minutes
}

export interface TourBooking extends BaseEntity {
  providerId: string;
  locationId: string;
  
  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  
  // Booking
  scheduledAt: Date;
  duration: number;                   // Minutes
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
  metadata: EventMetadata;
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

export interface EventMetadata {
  source: string;
  version: string;
  correlationId: string | null;
  userId: string | null;
  agentId: string | null;
}

// ============================================================================
// RESULT TYPE
// ============================================================================

export type Result<T, E = Error> = 
  | { success: true; value: T }
  | { success: false; error: E };

export const success = <T>(value: T): Result<T> => ({ success: true, value });
export const failure = <E>(error: E): Result<never, E> => ({ success: false, error });

// ============================================================================
// ERROR TYPES
// ============================================================================

export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(public entityType: string, public entityId: string) {
    super(`${entityType} not found: ${entityId}`);
    this.name = 'NotFoundError';
  }
}

export class DomainAlreadyExistsError extends Error {
  constructor(public domain: string) {
    super(`Domain already exists: ${domain}`);
    this.name = 'DomainAlreadyExistsError';
  }
}

export class AgentAuthenticationError extends Error {
  constructor(public agentId: string) {
    super(`Agent authentication failed: ${agentId}`);
    this.name = 'AgentAuthenticationError';
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  EducationalProvider,
  ProviderTheme,
  ProviderLocation,
  ProviderDomain,
  EducationalQualityProfile,
  QualityScoreBreakdown,
  VerifiedOutcome,
  Accreditation,
  EducationalOffering,
  OfferingAvailability,
  EducationalPricing,
  ProviderFeatures,
  EducationalSEOConfig,
  EducationalAgentConfig,
  ProviderSearchRequest,
  ProviderSearchResult,
  ProviderCompareRequest,
  ProviderCompareResult,
  ProviderReview,
  Enquiry,
  TourBooking,
  HostingEvent
};
