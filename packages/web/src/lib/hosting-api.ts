/**
 * Hosting API Client
 *
 * Complete client for the educational web hosting platform.
 * 33 endpoints across 4 groups:
 *   - Provider Management (9): CRUD, theme, domains, activation, API keys
 *   - Engagement (11): enquiries, tours, reviews
 *   - Quality & Outcomes (4): quality profiles, outcomes, registration, structured data
 *   - Agent API (9): search, compare, availability, quality queries
 *
 * Backend: packages/api/src/routes/hosting.ts (855L)
 * Types:   packages/api/src/services/hosting-types.ts (1,059L)
 */

import type {
  HostingEducationalProvider,
  HostingProviderDomain,
  HostingProviderTheme,
  HostingEducationalQualityProfile,
  HostingEnquiry,
  HostingTourBooking,
  HostingProviderReview,
  HostingProviderSummary,
  HostingProviderSearchResult,
  HostingProviderCompareResult,
  HostingVerifiedOutcome,
  CreateProviderInput,
  UpdateProviderInput,
  UpdateThemeInput,
  CreateEnquiryInput,
  CreateTourBookingInput,
  CreateReviewInput,
  SearchProvidersInput,
  AddOutcomeInput,
  RegistrationInput,
} from '@/types/hosting';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const HOST_BASE = `${API_BASE}/api/v1/hosting`;

// =============================================================================
// DEMO DATA
// =============================================================================

const now = new Date().toISOString();
const lastMonth = new Date(Date.now() - 30 * 86400000).toISOString();

const demoProvider: HostingEducationalProvider = {
  id: 'provider-demo-001',
  tenantId: 'tenant-demo',
  type: 'tutoring_centre',
  displayName: 'Bright Minds Tutoring',
  legalName: 'Bright Minds Education Pty Ltd',
  description: 'Expert tutoring for primary and secondary students across Perth. Specialising in mathematics, English, and science with qualified teachers and personalised learning plans.',
  tagline: 'Where every learner shines',
  logoUrl: null,
  faviconUrl: null,
  theme: {
    primaryColor: '#1e9df1',
    secondaryColor: '#f59e0b',
    accentColor: '#10b981',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'Open Sans',
    customCss: null,
  },
  locations: [
    {
      id: 'loc-001', name: 'Fremantle Centre', isPrimary: true,
      address: { streetAddress: '45 High Street', addressLocality: 'Fremantle', addressRegion: 'WA', postalCode: '6160', addressCountry: 'AU' },
      coordinates: { latitude: -32.0569, longitude: 115.7439 },
      phone: '08 9335 1234', email: 'fremantle@brightminds.edu.au', timezone: 'Australia/Perth',
    },
    {
      id: 'loc-002', name: 'Subiaco Centre', isPrimary: false,
      address: { streetAddress: '112 Rokeby Road', addressLocality: 'Subiaco', addressRegion: 'WA', postalCode: '6008', addressCountry: 'AU' },
      coordinates: { latitude: -31.9492, longitude: 115.8266 },
      phone: '08 9380 5678', email: 'subiaco@brightminds.edu.au', timezone: 'Australia/Perth',
    },
  ],
  primaryContact: { name: 'Dr. Sarah Mitchell', role: 'Director', email: 'sarah@brightminds.edu.au', phone: '0412 345 678', preferredContact: 'email' },
  domains: [
    { id: 'dom-001', providerId: 'provider-demo-001', domain: 'brightminds.scholarly.io', type: 'subdomain', status: 'verified', sslStatus: 'active', sslExpiresAt: '2027-01-15T00:00:00Z', verificationToken: null, verifiedAt: lastMonth, createdAt: lastMonth, updatedAt: lastMonth },
    { id: 'dom-002', providerId: 'provider-demo-001', domain: 'www.brightminds.edu.au', type: 'custom', status: 'verified', sslStatus: 'active', sslExpiresAt: '2026-12-01T00:00:00Z', verificationToken: null, verifiedAt: lastMonth, createdAt: lastMonth, updatedAt: lastMonth },
  ],
  primaryDomain: 'www.brightminds.edu.au',
  qualityProfile: {
    providerId: 'provider-demo-001', overallScore: 82,
    scoreBreakdown: { registration: 90, accreditation: 75, outcomes: 85, reviews: 88, staffQualifications: 80, compliance: 95, engagement: 78, weights: { registration: 0.15, accreditation: 0.15, outcomes: 0.2, reviews: 0.15, staffQualifications: 0.15, compliance: 0.1, engagement: 0.1 } },
    registrationStatus: 'registered',
    accreditations: [{ id: 'acc-001', body: 'Australian Tutoring Association', type: 'Member', level: 'Gold', issuedAt: '2024-01-15T00:00:00Z', expiresAt: '2027-01-15T00:00:00Z', status: 'active', verifiedByScholarly: true }],
    verifiedOutcomes: [
      { id: 'out-001', type: 'academic_achievement', metric: 'NAPLAN Improvement (Year 5 Numeracy)', value: 78, unit: '% improved', comparisonBasis: 'state average improvement', comparisonValue: 45, percentile: 85, year: 2025, cohortSize: 42, verifiedAt: lastMonth, verifiedBy: 'scholarly', confidenceLevel: 0.88 },
      { id: 'out-002', type: 'parent_satisfaction', metric: 'Parent Satisfaction Survey', value: 92, unit: '%', comparisonBasis: 'industry average', comparisonValue: 78, percentile: 90, year: 2025, cohortSize: 38, verifiedAt: lastMonth, verifiedBy: 'scholarly', confidenceLevel: 0.92 },
    ],
    aggregateRating: { average: 4.6, count: 47, distribution: { star1: 1, star2: 0, star3: 3, star4: 12, star5: 31 }, recommendationRate: 94, responseRate: 89 },
    verificationLevel: 'outcomes_verified', complianceStatus: 'compliant',
    confidenceLevel: 0.85, dataCompleteness: 0.78, memberSince: '2024-06-01T00:00:00Z',
  },
  features: {
    customDomains: true, multipleLocations: true, advancedAnalytics: true,
    agentApiAccess: true, structuredDataEnhanced: true, aiRecommendationsEnabled: true,
    onlineEnrollment: true, waitlistManagement: true, tourBooking: true,
    blogEnabled: true, eventsCalendar: true, resourceLibrary: false,
    webhooksEnabled: false, apiAccess: true, lisIntegration: false,
    whiteLabel: false, prioritySupport: true, customReporting: false,
  },
  status: 'active',
  createdAt: lastMonth,
  updatedAt: now,
};

const demoEnquiries: HostingEnquiry[] = [
  { id: 'enq-001', providerId: 'provider-demo-001', offeringId: null, contactName: 'Lisa Nguyen', contactEmail: 'lisa@example.com', contactPhone: '0423 456 789', studentName: 'Tom Nguyen', studentAge: 11, studentYearLevel: 'year_6', enquiryType: 'enrollment', message: 'Looking for Year 6 maths tutoring to prepare for high school entry tests. Tom is currently scoring in the 70th percentile and we want to strengthen his algebra.', source: 'website', status: 'new', respondedAt: null, responseTime: null, createdAt: now, updatedAt: now },
  { id: 'enq-002', providerId: 'provider-demo-001', offeringId: null, contactName: 'James Cooper', contactEmail: 'james@example.com', contactPhone: null, studentName: 'Maya Cooper', studentAge: 14, studentYearLevel: 'year_9', enquiryType: 'pricing', message: 'Interested in science tutoring packages for Year 9. Would like to know about sibling discounts as I have two children who need help.', source: 'agent_api', status: 'contacted', respondedAt: now, responseTime: 45, createdAt: lastMonth, updatedAt: now },
];

const demoTours: HostingTourBooking[] = [
  { id: 'tour-001', providerId: 'provider-demo-001', locationId: 'loc-001', contactName: 'Priya Sharma', contactEmail: 'priya@example.com', contactPhone: '0434 567 890', scheduledAt: new Date(Date.now() + 7 * 86400000).toISOString(), duration: 30, tourType: 'in_person', attendeeCount: 3, studentNames: ['Arun Sharma', 'Devi Sharma'], status: 'confirmed', specialRequests: 'Interested in seeing the maths resources area', createdAt: now, updatedAt: now },
];

const demoReviews: HostingProviderReview[] = [
  { id: 'rev-001', providerId: 'provider-demo-001', authorType: 'parent', authorName: 'Michelle T.', isVerified: true, overallRating: 5, categoryRatings: [{ category: 'Teaching Quality', rating: 5 }, { category: 'Communication', rating: 5 }, { category: 'Value', rating: 4 }], title: 'Transformed our son\'s confidence in maths', content: 'After 6 months of tutoring, our Year 5 son went from dreading maths homework to actually enjoying it. The tutors are patient and really understand how to explain concepts in ways that click.', wouldRecommend: true, helpfulCount: 12, providerResponse: 'Thank you Michelle! It\'s been wonderful watching your son\'s progress.', providerRespondedAt: lastMonth, status: 'published', createdAt: lastMonth, updatedAt: lastMonth },
  { id: 'rev-002', providerId: 'provider-demo-001', authorType: 'parent', authorName: 'David K.', isVerified: true, overallRating: 4, categoryRatings: [{ category: 'Teaching Quality', rating: 5 }, { category: 'Communication', rating: 3 }, { category: 'Value', rating: 4 }], title: 'Great tutors, booking system could be better', content: 'The tutoring itself is excellent and our daughter has made significant progress in English. The only area for improvement is the online booking — sometimes it\'s hard to reschedule.', wouldRecommend: true, helpfulCount: 5, providerResponse: null, providerRespondedAt: null, status: 'published', createdAt: lastMonth, updatedAt: lastMonth },
];

const demoSearchResults: HostingProviderSearchResult = {
  providers: [
    { id: 'provider-demo-001', type: 'tutoring_centre', displayName: 'Bright Minds Tutoring', tagline: 'Where every learner shines', logoUrl: null, primaryDomain: 'www.brightminds.edu.au', location: { suburb: 'Fremantle', state: 'WA', distanceKm: 2.3 }, qualityScore: 82, verificationLevel: 'outcomes_verified', aggregateRating: demoProvider.qualityProfile.aggregateRating, yearLevels: ['year_3', 'year_4', 'year_5', 'year_6', 'year_7', 'year_8', 'year_9', 'year_10'], subjectAreas: ['Mathematics', 'English', 'Science'], highlightedOutcomes: ['78% NAPLAN improvement', '92% parent satisfaction'], accreditationBadges: ['ATA Gold Member'] },
    { id: 'provider-demo-002', type: 'tutoring_centre', displayName: 'Perth Academic Excellence', tagline: 'Results that speak', logoUrl: null, primaryDomain: 'perthacademic.scholarly.io', location: { suburb: 'Subiaco', state: 'WA', distanceKm: 5.1 }, qualityScore: 75, verificationLevel: 'registration_verified', aggregateRating: { average: 4.3, count: 28, distribution: { star1: 0, star2: 1, star3: 4, star4: 10, star5: 13 }, recommendationRate: 86, responseRate: 72 }, yearLevels: ['year_7', 'year_8', 'year_9', 'year_10', 'year_11', 'year_12'], subjectAreas: ['Mathematics', 'Physics', 'Chemistry'], highlightedOutcomes: ['65% university offer rate improvement'], accreditationBadges: [] },
  ],
  totalCount: 2,
  facets: {
    types: [{ value: 'tutoring_centre', count: 2, label: 'Tutoring Centre' }],
    yearLevels: [{ value: 'year_5', count: 1, label: 'Year 5' }, { value: 'year_10', count: 2, label: 'Year 10' }],
    subjectAreas: [{ value: 'Mathematics', count: 2, label: 'Mathematics' }, { value: 'Science', count: 1, label: 'Science' }],
  },
};

// =============================================================================
// API CLIENT
// =============================================================================

class HostingApiClient {
  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const response = await fetch(`${HOST_BASE}${endpoint}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { code: 'UNKNOWN' } }));
      throw new Error(error.error?.code || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // ===========================================================================
  // PROVIDER MANAGEMENT (9 endpoints)
  // ===========================================================================

  /** POST /providers */
  async createProvider(input: CreateProviderInput): Promise<HostingEducationalProvider> {
    if (DEMO_MODE) return { ...demoProvider, displayName: input.displayName, type: input.type, status: 'pending_setup' };
    return this.request('POST', '/providers', input);
  }

  /** GET /providers/:providerId */
  async getProvider(providerId: string): Promise<HostingEducationalProvider> {
    if (DEMO_MODE) return demoProvider;
    return this.request('GET', `/providers/${providerId}`);
  }

  /** GET /resolve/:domain */
  async resolveDomain(domain: string): Promise<HostingEducationalProvider> {
    if (DEMO_MODE) return demoProvider;
    return this.request('GET', `/resolve/${domain}`);
  }

  /** PATCH /providers/:providerId */
  async updateProvider(providerId: string, input: UpdateProviderInput): Promise<HostingEducationalProvider> {
    if (DEMO_MODE) return { ...demoProvider, ...input, updatedAt: now };
    return this.request('PATCH', `/providers/${providerId}`, input);
  }

  /** PATCH /providers/:providerId/theme */
  async updateTheme(providerId: string, theme: UpdateThemeInput): Promise<HostingProviderTheme> {
    if (DEMO_MODE) return { ...demoProvider.theme, ...theme };
    return this.request('PATCH', `/providers/${providerId}/theme`, theme);
  }

  /** POST /providers/:providerId/activate */
  async activateProvider(providerId: string): Promise<HostingEducationalProvider> {
    if (DEMO_MODE) return { ...demoProvider, status: 'active' };
    return this.request('POST', `/providers/${providerId}/activate`);
  }

  /** POST /providers/:providerId/domains */
  async addDomain(providerId: string, domain: string): Promise<HostingProviderDomain> {
    if (DEMO_MODE) return { ...demoProvider.domains[1], id: `dom-${Date.now()}`, domain, status: 'pending_verification', createdAt: now, updatedAt: now };
    return this.request('POST', `/providers/${providerId}/domains`, { domain });
  }

  /** POST /providers/:providerId/domains/:domainId/verify */
  async verifyDomain(providerId: string, domainId: string): Promise<HostingProviderDomain> {
    if (DEMO_MODE) return { ...demoProvider.domains[0], id: domainId, status: 'verified', verifiedAt: now };
    return this.request('POST', `/providers/${providerId}/domains/${domainId}/verify`);
  }

  /** POST /providers/:providerId/api-key */
  async generateApiKey(providerId: string): Promise<{ apiKey: string; prefix: string }> {
    if (DEMO_MODE) return { apiKey: 'sk_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', prefix: 'sk_demo' };
    return this.request('POST', `/providers/${providerId}/api-key`);
  }

  // ===========================================================================
  // ENGAGEMENT: ENQUIRIES (3 endpoints)
  // ===========================================================================

  /** POST /enquiries */
  async createEnquiry(input: CreateEnquiryInput): Promise<HostingEnquiry> {
    if (DEMO_MODE) return { ...demoEnquiries[0], id: `enq-${Date.now()}`, ...input, status: 'new', createdAt: now, updatedAt: now } as HostingEnquiry;
    return this.request('POST', '/enquiries', input);
  }

  /** GET /providers/:providerId/enquiries */
  async getEnquiries(providerId: string, options?: { status?: string; page?: number }): Promise<HostingEnquiry[]> {
    if (DEMO_MODE) return demoEnquiries;
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.page) params.set('page', String(options.page));
    const qs = params.toString();
    return this.request('GET', `/providers/${providerId}/enquiries${qs ? `?${qs}` : ''}`);
  }

  /** PATCH /enquiries/:enquiryId */
  async updateEnquiry(enquiryId: string, update: { status?: string; notes?: string }): Promise<HostingEnquiry> {
    if (DEMO_MODE) return { ...demoEnquiries[0], id: enquiryId, ...update, updatedAt: now } as HostingEnquiry;
    return this.request('PATCH', `/enquiries/${enquiryId}`, update);
  }

  // ===========================================================================
  // ENGAGEMENT: TOURS (4 endpoints)
  // ===========================================================================

  /** POST /tours */
  async createTourBooking(input: CreateTourBookingInput): Promise<HostingTourBooking> {
    if (DEMO_MODE) return { ...demoTours[0], id: `tour-${Date.now()}`, ...input, status: 'pending', createdAt: now, updatedAt: now } as HostingTourBooking;
    return this.request('POST', '/tours', input);
  }

  /** GET /providers/:providerId/tours */
  async getTourBookings(providerId: string, options?: { status?: string; upcoming?: boolean }): Promise<HostingTourBooking[]> {
    if (DEMO_MODE) return demoTours;
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.upcoming !== undefined) params.set('upcoming', String(options.upcoming));
    const qs = params.toString();
    return this.request('GET', `/providers/${providerId}/tours${qs ? `?${qs}` : ''}`);
  }

  /** POST /tours/:bookingId/confirm */
  async confirmTour(bookingId: string): Promise<HostingTourBooking> {
    if (DEMO_MODE) return { ...demoTours[0], id: bookingId, status: 'confirmed', updatedAt: now };
    return this.request('POST', `/tours/${bookingId}/confirm`);
  }

  /** POST /tours/:bookingId/cancel */
  async cancelTour(bookingId: string): Promise<HostingTourBooking> {
    if (DEMO_MODE) return { ...demoTours[0], id: bookingId, status: 'cancelled', updatedAt: now };
    return this.request('POST', `/tours/${bookingId}/cancel`);
  }

  // ===========================================================================
  // ENGAGEMENT: REVIEWS (4 endpoints)
  // ===========================================================================

  /** POST /reviews */
  async createReview(input: CreateReviewInput): Promise<HostingProviderReview> {
    if (DEMO_MODE) return { ...demoReviews[0], id: `rev-${Date.now()}`, ...input, isVerified: false, helpfulCount: 0, status: 'pending', createdAt: now, updatedAt: now } as HostingProviderReview;
    return this.request('POST', '/reviews', input);
  }

  /** GET /providers/:providerId/reviews */
  async getReviews(providerId: string, options?: { status?: string; page?: number }): Promise<HostingProviderReview[]> {
    if (DEMO_MODE) return demoReviews;
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.page) params.set('page', String(options.page));
    const qs = params.toString();
    return this.request('GET', `/providers/${providerId}/reviews${qs ? `?${qs}` : ''}`);
  }

  /** POST /reviews/:reviewId/publish */
  async publishReview(reviewId: string): Promise<HostingProviderReview> {
    if (DEMO_MODE) return { ...demoReviews[0], id: reviewId, status: 'published', updatedAt: now };
    return this.request('POST', `/reviews/${reviewId}/publish`);
  }

  /** POST /reviews/:reviewId/response */
  async respondToReview(reviewId: string, response: string): Promise<HostingProviderReview> {
    if (DEMO_MODE) return { ...demoReviews[0], id: reviewId, providerResponse: response, providerRespondedAt: now, updatedAt: now };
    return this.request('POST', `/reviews/${reviewId}/response`, { response });
  }

  /** POST /reviews/:reviewId/helpful */
  async markReviewHelpful(reviewId: string): Promise<{ helpfulCount: number }> {
    if (DEMO_MODE) return { helpfulCount: 13 };
    return this.request('POST', `/reviews/${reviewId}/helpful`);
  }

  // ===========================================================================
  // QUALITY & OUTCOMES (4 endpoints)
  // ===========================================================================

  /** GET /providers/:providerId/quality */
  async getQualityProfile(providerId: string): Promise<HostingEducationalQualityProfile> {
    if (DEMO_MODE) return demoProvider.qualityProfile;
    return this.request('GET', `/providers/${providerId}/quality`);
  }

  /** POST /providers/:providerId/outcomes */
  async addOutcome(providerId: string, outcome: AddOutcomeInput): Promise<HostingVerifiedOutcome> {
    if (DEMO_MODE) return { ...demoProvider.qualityProfile.verifiedOutcomes[0], id: `out-${Date.now()}`, ...outcome } as unknown as HostingVerifiedOutcome;
    return this.request('POST', `/providers/${providerId}/outcomes`, outcome);
  }

  /** POST /providers/:providerId/registration */
  async submitRegistration(providerId: string, reg: RegistrationInput): Promise<{ registrationStatus: string }> {
    if (DEMO_MODE) return { registrationStatus: 'registered' };
    return this.request('POST', `/providers/${providerId}/registration`, reg);
  }

  /** GET /providers/:providerId/structured-data */
  async getStructuredData(providerId: string): Promise<Record<string, unknown>> {
    if (DEMO_MODE) return { '@context': 'https://schema.org', '@type': 'EducationalOrganization', name: demoProvider.displayName };
    return this.request('GET', `/providers/${providerId}/structured-data`);
  }

  // ===========================================================================
  // AGENT API (9 endpoints)
  // ===========================================================================

  /** POST /agent/search/providers */
  async agentSearchProviders(input: SearchProvidersInput): Promise<HostingProviderSearchResult> {
    if (DEMO_MODE) return demoSearchResults;
    return this.request('POST', '/agent/search/providers', input);
  }

  /** POST /agent/search/offerings */
  async agentSearchOfferings(input: SearchProvidersInput): Promise<{ offerings: unknown[]; totalCount: number }> {
    if (DEMO_MODE) return { offerings: [], totalCount: 0 };
    return this.request('POST', '/agent/search/offerings', input);
  }

  /** POST /agent/compare */
  async agentCompareProviders(providerIds: string[]): Promise<HostingProviderCompareResult> {
    if (DEMO_MODE) return { providers: [demoProvider], comparisonMatrix: { criteria: [], rows: [] }, recommendation: null };
    return this.request('POST', '/agent/compare', { providerIds });
  }

  /** POST /agent/availability */
  async agentCheckAvailability(providerId: string, offeringId?: string): Promise<{ available: boolean; spotsAvailable: number | null }> {
    if (DEMO_MODE) return { available: true, spotsAvailable: 5 };
    return this.request('POST', '/agent/availability', { providerId, offeringId });
  }

  /** POST /agent/enquiry */
  async agentSubmitEnquiry(input: CreateEnquiryInput): Promise<HostingEnquiry> {
    if (DEMO_MODE) return { ...demoEnquiries[0], source: 'agent_api', createdAt: now, updatedAt: now };
    return this.request('POST', '/agent/enquiry', input);
  }

  /** GET /agent/providers/:providerId/quality */
  async agentGetQuality(providerId: string): Promise<HostingEducationalQualityProfile> {
    if (DEMO_MODE) return demoProvider.qualityProfile;
    return this.request('GET', `/agent/providers/${providerId}/quality`);
  }

  /** GET /agent/providers/:providerId */
  async agentGetProvider(providerId: string): Promise<HostingEducationalProvider> {
    if (DEMO_MODE) return demoProvider;
    return this.request('GET', `/agent/providers/${providerId}`);
  }

  /** GET /agent/providers/:providerId/outcomes */
  async agentGetOutcomes(providerId: string): Promise<HostingVerifiedOutcome[]> {
    if (DEMO_MODE) return demoProvider.qualityProfile.verifiedOutcomes;
    return this.request('GET', `/agent/providers/${providerId}/outcomes`);
  }
}

export const hostingApi = new HostingApiClient();
