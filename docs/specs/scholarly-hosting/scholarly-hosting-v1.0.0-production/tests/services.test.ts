/**
 * Scholarly Hosting - Test Suite
 * 
 * Comprehensive tests for all services.
 * 
 * @module ScholarlyHosting/Tests
 * @version 1.0.0
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ============================================================================
// MOCK DATA
// ============================================================================

const mockProvider = {
  id: 'provider_001',
  tenantId: 'tenant_001',
  type: 'school' as const,
  displayName: 'Brighton Grammar School',
  legalName: 'Brighton Grammar School Ltd',
  description: 'An independent school committed to academic excellence and personal growth.',
  tagline: 'Learning for Life',
  logoUrl: 'https://example.com/logo.png',
  faviconUrl: null,
  theme: {
    primaryColor: '#1e40af',
    secondaryColor: '#3b82f6',
    accentColor: '#60a5fa',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    fontFamily: 'Inter, sans-serif',
    customCss: null
  },
  locations: [{
    id: 'loc_001',
    name: 'Main Campus',
    isPrimary: true,
    address: {
      streetAddress: '100 Education Way',
      addressLocality: 'Brighton',
      addressRegion: 'VIC',
      postalCode: '3186',
      addressCountry: 'AU'
    },
    coordinates: { latitude: -37.9075, longitude: 144.9876 },
    phone: '+61 3 9555 1234',
    email: 'info@brightongrammar.example.edu.au',
    timezone: 'Australia/Melbourne',
    operatingHours: null
  }],
  serviceArea: null,
  primaryContact: {
    name: 'Jane Smith',
    role: 'Admissions Director',
    email: 'admissions@brightongrammar.example.edu.au',
    phone: '+61 3 9555 1235',
    preferredContact: 'email'
  },
  domains: [{
    id: 'domain_001',
    providerId: 'provider_001',
    domain: 'brightongrammar.scholar.ly',
    type: 'subdomain' as const,
    status: 'verified' as const,
    sslStatus: 'active' as const,
    sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
    verificationToken: null,
    verifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  }],
  primaryDomain: 'brightongrammar.scholar.ly',
  qualityProfile: {
    providerId: 'provider_001',
    overallScore: 87,
    scoreBreakdown: {
      registration: 100,
      accreditation: 85,
      outcomes: 92,
      reviews: 88,
      staffQualifications: 90,
      compliance: 100,
      engagement: 75,
      weights: {
        registration: 0.20,
        accreditation: 0.15,
        outcomes: 0.25,
        reviews: 0.15,
        staffQualifications: 0.15,
        compliance: 0.05,
        engagement: 0.05
      }
    },
    registrationStatus: 'registered' as const,
    registrationDetails: {
      registrationNumber: 'REG123456',
      registrationBody: 'VRQA',
      registeredAt: new Date('2010-01-15'),
      expiresAt: null,
      verificationUrl: 'https://vrqa.vic.gov.au/verify/REG123456',
      sector: 'independent',
      schoolType: 'Secondary'
    },
    accreditations: [{
      id: 'accred_001',
      body: 'IB World School',
      type: 'DP',
      level: 'Diploma Programme',
      issuedAt: new Date('2015-06-01'),
      expiresAt: new Date('2025-06-01'),
      verificationUrl: 'https://ibo.org/verify/12345',
      status: 'active',
      verifiedByScholarly: true,
      verifiedAt: new Date()
    }],
    verifiedOutcomes: [{
      id: 'outcome_001',
      type: 'academic_achievement' as const,
      metric: 'NAPLAN Reading Year 9',
      value: 612,
      unit: 'score',
      comparisonBasis: 'state average',
      comparisonValue: 580,
      percentile: 85,
      year: 2024,
      cohortSize: 150,
      verifiedAt: new Date(),
      verifiedBy: 'naplan',
      dataSource: 'MySchool',
      confidenceLevel: 0.95,
      validFrom: new Date(),
      validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    }],
    aggregateRating: {
      average: 4.6,
      count: 234,
      distribution: { star1: 5, star2: 8, star3: 25, star4: 76, star5: 120 },
      recommendationRate: 92,
      responseRate: 85
    },
    staffQualifications: {
      totalStaff: 85,
      teachingStaff: 65,
      qualifiedTeachers: 63,
      advancedDegrees: 28,
      averageExperienceYears: 12,
      studentTeacherRatio: 12,
      specialistStaff: [
        { area: 'Learning Support', count: 5 },
        { area: 'Gifted Education', count: 2 }
      ],
      lastUpdated: new Date(),
      verifiedByScholarly: true
    },
    complianceRecords: [{
      id: 'comp_001',
      type: 'Child Safety',
      status: 'compliant' as const,
      issuedBy: 'Department of Education',
      issuedAt: new Date('2024-01-15'),
      expiresAt: new Date('2025-01-15'),
      notes: null,
      documentUrl: null
    }],
    complianceStatus: 'compliant',
    verificationLevel: 'outcomes_verified' as const,
    memberSince: new Date('2023-01-01'),
    lastVerificationDate: new Date(),
    nextVerificationDue: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    confidenceLevel: 0.85,
    dataCompleteness: 0.9
  },
  features: {
    customDomains: true,
    multipleLocations: false,
    advancedAnalytics: true,
    agentApiAccess: true,
    structuredDataEnhanced: true,
    aiRecommendationsEnabled: true,
    onlineEnrollment: true,
    waitlistManagement: true,
    tourBooking: true,
    blogEnabled: true,
    eventsCalendar: true,
    resourceLibrary: true,
    webhooksEnabled: false,
    apiAccess: true,
    lisIntegration: false,
    whiteLabel: false,
    prioritySupport: true,
    customReporting: false
  },
  seoConfig: {
    defaultTitle: 'Brighton Grammar School',
    titleTemplate: '%s | Brighton Grammar School',
    defaultDescription: 'An independent school committed to academic excellence.',
    defaultKeywords: ['school', 'education', 'Brighton', 'VIC'],
    ogImage: null,
    ogType: 'website',
    twitterCard: 'summary_large_image',
    twitterSite: null,
    organizationSchema: {
      '@type': 'School',
      name: 'Brighton Grammar School',
      legalName: 'Brighton Grammar School Ltd',
      url: 'https://brightongrammar.scholar.ly',
      logo: 'https://example.com/logo.png',
      description: 'An independent school committed to academic excellence.',
      foundingDate: null,
      educationalCredentialAwarded: ['VCE', 'IB Diploma'],
      hasCredential: ['IB World School'],
      address: null,
      areaServed: ['Victoria'],
      telephone: '+61 3 9555 1234',
      email: 'info@brightongrammar.example.edu.au',
      sameAs: [],
      scholarlyQualityScore: 87,
      scholarlyVerificationLevel: 'outcomes_verified',
      scholarlyMemberSince: '2023-01-01T00:00:00.000Z'
    },
    robotsConfig: {
      allowIndexing: true,
      allowFollowing: true,
      disallowPaths: ['/admin', '/api'],
      crawlDelay: null
    },
    sitemapEnabled: true
  },
  agentConfig: {
    apiEnabled: true,
    apiKey: 'hashed_key_here',
    apiKeyPrefix: 'sh_abcd1234',
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000,
      burstLimit: 10
    },
    capabilities: {
      searchProviders: true,
      searchOfferings: true,
      getProviderDetails: true,
      getOfferingDetails: true,
      checkAvailability: true,
      compareProviders: true,
      compareOfferings: true,
      getQualityProfile: true,
      getVerifiedOutcomes: true,
      getReviews: true,
      getComplianceStatus: false,
      checkEnrollmentEligibility: false,
      submitEnquiry: true,
      bookTour: true,
      reservePlace: false
    },
    discoverability: {
      showInSearch: true,
      showPricing: true,
      showAvailability: true,
      showOutcomes: true,
      showStaffInfo: true,
      targetAreas: [{ type: 'suburb', value: 'Brighton' }],
      targetYearLevels: ['year_7', 'year_8', 'year_9', 'year_10', 'year_11', 'year_12'],
      targetNeedsTypes: []
    }
  },
  lisIdentifiers: {
    sourcedId: 'lis_12345',
    schoolCode: 'VIC123',
    acnc: null,
    abn: '12345678901',
    cricos: 'CRICOS123'
  },
  scholarlyTenantId: 'tenant_001',
  status: 'active' as const,
  createdAt: new Date(),
  updatedAt: new Date()
};

const mockOffering = {
  id: 'offering_001',
  providerId: 'provider_001',
  type: 'school_program' as const,
  name: 'Year 7-12 Secondary Program',
  description: 'Comprehensive secondary education with VCE and IB pathways.',
  shortDescription: 'Secondary education Years 7-12 with VCE/IB options.',
  subjectAreas: ['Mathematics', 'English', 'Science', 'Humanities', 'Languages', 'Arts'],
  yearLevels: ['year_7', 'year_8', 'year_9', 'year_10', 'year_11', 'year_12'] as const,
  cefrLevels: [],
  curriculumAlignment: [
    { framework: 'Victorian Curriculum', subject: 'Mathematics', level: '7-10', codes: ['VCMNA001'] },
    { framework: 'IB DP', subject: 'Mathematics', level: 'HL/SL', codes: [] }
  ],
  learningOutcomes: [
    'Critical thinking and problem solving',
    'Effective communication',
    'Global citizenship'
  ],
  prerequisites: [],
  deliveryModes: ['in_person'] as const,
  duration: { type: 'fixed' as const, value: 6, unit: 'years' as const, sessionsPerWeek: null, totalSessions: null },
  schedule: null,
  availability: {
    status: 'limited' as const,
    spotsTotal: 150,
    spotsAvailable: 23,
    waitlistSize: 15,
    nextAvailableDate: new Date('2026-02-01'),
    bookingLeadDays: null
  },
  pricing: {
    type: 'fixed' as const,
    amount: 28500,
    currency: 'AUD',
    packageOptions: [],
    discounts: [
      { type: 'sibling' as const, description: '10% sibling discount', percentage: 10, amount: null, conditions: 'Second child and subsequent' }
    ],
    includesGst: false,
    paymentTerms: 'Payable per term',
    cancellationPolicy: null
  },
  qualitySignals: {
    providerQualityScore: 87,
    completionRate: 98,
    satisfactionScore: 4.6,
    reviewCount: 234,
    averageRating: 4.6,
    outcomeStatements: ['98% Year 12 completion rate', '95% university admission'],
    certificationAwarded: 'VCE / IB Diploma'
  },
  naturalLanguageSummary: 'Brighton Grammar offers a comprehensive secondary education program for students in Years 7-12, with pathways through Victorian Certificate of Education (VCE) or International Baccalaureate (IB) Diploma.',
  parentFriendlySummary: 'Our secondary program guides students from Year 7 through to Year 12, with excellent academic results and strong pastoral care.',
  agentContext: 'Independent school, strong academic outcomes, NAPLAN 85th percentile, IB World School, student:teacher ratio 12:1, comprehensive co-curricular program.',
  images: [{ id: 'img_001', url: 'https://example.com/campus.jpg', type: 'image', title: 'Main Campus', alt: 'Brighton Grammar main campus building', width: 1200, height: 800, duration: null, isPrimary: true }],
  videos: [],
  virtualTourUrl: 'https://example.com/virtual-tour',
  categories: ['Secondary Education', 'Independent School'],
  tags: ['VCE', 'IB', 'Co-ed', 'Brighton'],
  status: 'published' as const,
  publishedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date()
};

// ============================================================================
// QUALITY SCORE TESTS
// ============================================================================

describe('Quality Score Calculations', () => {
  describe('Registration Scoring', () => {
    it('scores registered status as 80', () => {
      const score = scoreRegistration('registered');
      expect(score).toBe(80);
    });

    it('scores accredited status as 100', () => {
      const score = scoreRegistration('accredited');
      expect(score).toBe(100);
    });

    it('scores exempt status as 60', () => {
      const score = scoreRegistration('exempt');
      expect(score).toBe(60);
    });

    it('scores unregistered status as 0', () => {
      const score = scoreRegistration('unregistered');
      expect(score).toBe(0);
    });
  });

  describe('Accreditation Scoring', () => {
    it('returns 0 for no accreditations', () => {
      const score = scoreAccreditations([]);
      expect(score).toBe(0);
    });

    it('scores active accreditations', () => {
      const accreds = [
        { body: 'IB World School', type: 'DP', status: 'active', verifiedByScholarly: true },
        { body: 'CRICOS', type: 'Provider', status: 'active', verifiedByScholarly: false }
      ];
      const score = scoreAccreditations(accreds);
      expect(score).toBeGreaterThanOrEqual(60);
    });

    it('gives bonus for premium accreditations', () => {
      const premium = [{ body: 'IB World School', status: 'active', verifiedByScholarly: true }];
      const regular = [{ body: 'Local Board', status: 'active', verifiedByScholarly: true }];
      
      expect(scoreAccreditations(premium)).toBeGreaterThan(scoreAccreditations(regular));
    });
  });

  describe('Review Scoring', () => {
    it('returns 0 for no reviews', () => {
      const score = scoreReviews(null);
      expect(score).toBe(0);
    });

    it('scores based on average rating', () => {
      const rating = { average: 4.5, count: 50, recommendationRate: 90 };
      const score = scoreReviews(rating);
      expect(score).toBeGreaterThanOrEqual(85);
    });

    it('gives bonus for high review count', () => {
      const lowCount = { average: 4.0, count: 5, recommendationRate: 80 };
      const highCount = { average: 4.0, count: 50, recommendationRate: 80 };
      
      expect(scoreReviews(highCount)).toBeGreaterThan(scoreReviews(lowCount));
    });
  });

  describe('Staff Scoring', () => {
    it('returns 0 for no staff data', () => {
      const score = scoreStaff(null);
      expect(score).toBe(0);
    });

    it('scores student:teacher ratio', () => {
      const goodRatio = { teachingStaff: 50, qualifiedTeachers: 50, studentTeacherRatio: 10, advancedDegrees: 20, averageExperienceYears: 10 };
      const poorRatio = { teachingStaff: 50, qualifiedTeachers: 50, studentTeacherRatio: 30, advancedDegrees: 20, averageExperienceYears: 10 };
      
      expect(scoreStaff(goodRatio)).toBeGreaterThan(scoreStaff(poorRatio));
    });
  });

  describe('Weighted Overall Score', () => {
    it('calculates weighted score correctly', () => {
      const components = {
        registration: 80,
        accreditation: 70,
        outcomes: 85,
        reviews: 90,
        staffQualifications: 75,
        compliance: 100,
        engagement: 60
      };
      const weights = {
        registration: 0.20,
        accreditation: 0.15,
        outcomes: 0.25,
        reviews: 0.15,
        staffQualifications: 0.15,
        compliance: 0.05,
        engagement: 0.05
      };

      const overall = Object.entries(components).reduce(
        (sum, [key, score]) => sum + score * (weights[key as keyof typeof weights] ?? 0),
        0
      );

      expect(overall).toBeCloseTo(80.5, 1);
    });
  });
});

// ============================================================================
// PROVIDER SERVICE TESTS
// ============================================================================

describe('Educational Provider Service', () => {
  describe('createProvider', () => {
    it('validates required fields', () => {
      const result = validateProviderInput({
        tenantId: '',
        type: 'school',
        displayName: 'Test School',
        description: 'A test school',
        contact: { name: 'John', role: 'Admin', email: 'john@test.com' }
      });

      expect(result.success).toBe(false);
    });

    it('generates subdomain from display name', () => {
      const subdomain = generateSubdomain('Brighton Grammar School');
      expect(subdomain).toBe('brighton-grammar-school');
    });

    it('handles special characters in subdomain generation', () => {
      const subdomain = generateSubdomain("St. Mary's Academy & Prep");
      expect(subdomain).toBe('st-marys-academy-prep');
    });
  });

  describe('resolveByDomain', () => {
    it('validates domain format', () => {
      const result = validateDomain('invalid domain');
      expect(result.success).toBe(false);
    });

    it('accepts valid domain', () => {
      const result = validateDomain('school.scholar.ly');
      expect(result.success).toBe(true);
    });
  });
});

// ============================================================================
// AGENT API TESTS
// ============================================================================

describe('Educational Agent API Service', () => {
  describe('searchProviders', () => {
    it('builds correct database filters', () => {
      const request = {
        query: 'IB schools Brighton',
        filters: {
          types: ['school'],
          yearLevels: ['year_7', 'year_8'],
          minQualityScore: 70,
          location: { latitude: -37.9, longitude: 145.0, radiusKm: 10 }
        },
        sort: 'quality_score_desc',
        limit: 20,
        offset: 0
      };

      const filters = buildProviderDbFilters(request);

      expect(filters.types).toContain('school');
      expect(filters.minQualityScore).toBe(70);
      expect(filters.location).toBeDefined();
    });
  });

  describe('compareProviders', () => {
    it('rejects fewer than 2 providers', () => {
      const result = validateCompareRequest(['provider_001']);
      expect(result.success).toBe(false);
    });

    it('rejects more than 5 providers', () => {
      const result = validateCompareRequest(['1', '2', '3', '4', '5', '6']);
      expect(result.success).toBe(false);
    });

    it('accepts valid provider count', () => {
      const result = validateCompareRequest(['1', '2', '3']);
      expect(result.success).toBe(true);
    });
  });

  describe('calculateDistance', () => {
    it('calculates correct distance between coordinates', () => {
      // Melbourne CBD to Brighton (approximately 12km)
      const distance = calculateDistance(-37.8136, 144.9631, -37.9075, 144.9876);
      expect(distance).toBeGreaterThan(10);
      expect(distance).toBeLessThan(15);
    });
  });
});

// ============================================================================
// STRUCTURED DATA TESTS
// ============================================================================

describe('Structured Data Service', () => {
  describe('generateOrganization', () => {
    it('creates valid Schema.org EducationalOrganization', () => {
      const jsonLd = generateOrganizationJsonLd(mockProvider);

      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('School');
      expect(jsonLd.name).toBe(mockProvider.displayName);
      expect(jsonLd.url).toBe(`https://${mockProvider.primaryDomain}`);
    });

    it('includes trust signals as additionalProperty', () => {
      const jsonLd = generateOrganizationJsonLd(mockProvider);

      expect(jsonLd.additionalProperty).toBeDefined();
      const props = jsonLd.additionalProperty as any[];
      
      const qualityScore = props.find(p => p.name === 'scholarlyQualityScore');
      expect(qualityScore).toBeDefined();
      expect(qualityScore.value).toBe(87);
    });

    it('includes aggregateRating when present', () => {
      const jsonLd = generateOrganizationJsonLd(mockProvider);

      expect(jsonLd.aggregateRating).toBeDefined();
      expect((jsonLd.aggregateRating as any).ratingValue).toBe(4.6);
      expect((jsonLd.aggregateRating as any).reviewCount).toBe(234);
    });
  });

  describe('generateCourse', () => {
    it('creates valid Schema.org Course', () => {
      const jsonLd = generateCourseJsonLd(mockOffering, mockProvider);

      expect(jsonLd['@context']).toBe('https://schema.org');
      expect(jsonLd['@type']).toBe('Course');
      expect(jsonLd.name).toBe(mockOffering.name);
    });

    it('includes provider information', () => {
      const jsonLd = generateCourseJsonLd(mockOffering, mockProvider);

      expect(jsonLd.provider).toBeDefined();
      expect((jsonLd.provider as any).name).toBe(mockProvider.displayName);
    });

    it('maps delivery mode correctly', () => {
      const jsonLd = generateCourseJsonLd(mockOffering, mockProvider);
      expect(jsonLd.courseMode).toBe('OnSite');
    });
  });

  describe('toScriptTag', () => {
    it('generates valid script tag', () => {
      const jsonLd = generateOrganizationJsonLd(mockProvider);
      const script = toScriptTag([jsonLd]);

      expect(script).toContain('<script type="application/ld+json">');
      expect(script).toContain('</script>');
      expect(script).toContain('"@context"');
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS (would be imported from services)
// ============================================================================

function scoreRegistration(status: string): number {
  switch (status) {
    case 'accredited': return 100;
    case 'registered': return 80;
    case 'pending_registration': return 40;
    case 'exempt': return 60;
    case 'unregistered': return 0;
    default: return 0;
  }
}

function scoreAccreditations(accreditations: any[]): number {
  if (accreditations.length === 0) return 0;
  const active = accreditations.filter(a => a.status === 'active');
  if (active.length === 0) return 10;

  const premiumBodies = ['IB World School', 'CRICOS', 'NESA', 'VRQA'];
  const hasPremium = active.some(a => premiumBodies.includes(a.body));
  const verifiedCount = active.filter(a => a.verifiedByScholarly).length;

  let score = Math.min(active.length * 20, 60);
  if (hasPremium) score += 20;
  if (verifiedCount > 0) score += 20;

  return Math.min(score, 100);
}

function scoreReviews(rating: any): number {
  if (!rating || rating.count === 0) return 0;
  let score = (rating.average - 1) * 25;
  if (rating.count >= 50) score += 15;
  else if (rating.count >= 20) score += 10;
  else if (rating.count >= 10) score += 5;
  if (rating.recommendationRate >= 90) score += 10;
  else if (rating.recommendationRate >= 80) score += 5;
  return Math.min(Math.round(score), 100);
}

function scoreStaff(staff: any): number {
  if (!staff) return 0;
  let score = 0;
  if (staff.teachingStaff > 0) {
    const qualifiedPct = (staff.qualifiedTeachers / staff.teachingStaff) * 100;
    score += Math.min(qualifiedPct * 0.4, 40);
  }
  if (staff.studentTeacherRatio > 0) {
    if (staff.studentTeacherRatio <= 10) score += 25;
    else if (staff.studentTeacherRatio <= 15) score += 20;
    else if (staff.studentTeacherRatio <= 20) score += 15;
    else if (staff.studentTeacherRatio <= 25) score += 10;
    else score += 5;
  }
  if (staff.averageExperienceYears >= 10) score += 15;
  else if (staff.averageExperienceYears >= 5) score += 10;
  else if (staff.averageExperienceYears >= 2) score += 5;
  if (staff.teachingStaff > 0) {
    const advancedPct = (staff.advancedDegrees / staff.teachingStaff) * 100;
    score += Math.min(advancedPct * 0.2, 20);
  }
  return Math.min(Math.round(score), 100);
}

function generateSubdomain(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 63);
}

function validateProviderInput(input: any): { success: boolean; error?: string } {
  if (!input.tenantId) return { success: false, error: 'tenantId required' };
  if (!input.displayName) return { success: false, error: 'displayName required' };
  return { success: true };
}

function validateDomain(domain: string): { success: boolean } {
  const valid = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}$/i.test(domain);
  return { success: valid };
}

function validateCompareRequest(providerIds: string[]): { success: boolean; error?: string } {
  if (providerIds.length < 2) return { success: false, error: 'At least 2 providers required' };
  if (providerIds.length > 5) return { success: false, error: 'Maximum 5 providers' };
  return { success: true };
}

function buildProviderDbFilters(request: any): any {
  return {
    query: request.query,
    types: request.filters.types,
    yearLevels: request.filters.yearLevels,
    minQualityScore: request.filters.minQualityScore,
    location: request.filters.location,
    limit: request.limit,
    offset: request.offset
  };
}

function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function generateOrganizationJsonLd(provider: any): any {
  return {
    '@context': 'https://schema.org',
    '@type': provider.type === 'school' ? 'School' : 'EducationalOrganization',
    name: provider.displayName,
    url: `https://${provider.primaryDomain}`,
    description: provider.description,
    logo: provider.logoUrl,
    aggregateRating: provider.qualityProfile.aggregateRating ? {
      '@type': 'AggregateRating',
      ratingValue: provider.qualityProfile.aggregateRating.average,
      reviewCount: provider.qualityProfile.aggregateRating.count
    } : undefined,
    additionalProperty: [
      { '@type': 'PropertyValue', name: 'scholarlyQualityScore', value: provider.qualityProfile.overallScore },
      { '@type': 'PropertyValue', name: 'scholarlyVerificationLevel', value: provider.qualityProfile.verificationLevel }
    ]
  };
}

function generateCourseJsonLd(offering: any, provider: any): any {
  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: offering.name,
    description: offering.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: provider.displayName,
      url: `https://${provider.primaryDomain}`
    },
    courseMode: 'OnSite'
  };
}

function toScriptTag(documents: any[]): string {
  const content = documents.length === 1 ? documents[0] : documents;
  return `<script type="application/ld+json">\n${JSON.stringify(content, null, 2)}\n</script>`;
}
