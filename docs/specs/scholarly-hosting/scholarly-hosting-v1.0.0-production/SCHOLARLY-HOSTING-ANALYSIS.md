# Scholarly Web Hosting - One-Stop Educational Presence

## Refactoring the Chekd Web Hosting Solution for Education

---

## Executive Summary

The Chekd web-hosting solution is a sophisticated multi-tenant platform designed for e-commerce storefronts with AI agent discoverability. This analysis explores how to refactor it into **Scholarly Hosting** - a complete web presence solution for schools, tutors, micro-schools, and homeschool entrepreneurs.

### The Vision

Imagine a parent searching online: *"best primary school with coding program near me"*. Today, that query goes to Google, which ranks schools by SEO tricks and advertising spend. Tomorrow, with Scholarly Hosting:

1. **AI agents** query structured educational data directly
2. **Schools** are ranked by verified outcomes, not marketing budgets
3. **Parents** get trustworthy, standardised information
4. **Small operators** (tutors, micro-schools, homeschool co-ops) compete on quality, not brand recognition

This is the **"Agent-Ready Education"** paradigm - making Scholarly the platform AI agents trust for educational discovery.

---

## The Chekd Architecture (What We're Starting With)

### Core Services

| Service | Purpose | Lines |
|---------|---------|-------|
| `domain.service.ts` | Subdomain/custom domain management, SSL, DNS verification | 510 |
| `tenant-config.service.ts` | Branding, features, SEO, agent API configuration | 729 |
| `structured-data.service.ts` | Schema.org JSON-LD generation for AI discoverability | 491 |
| `agent-api.service.ts` | AI agent authentication, product search, trust queries | 497 |

### Key Architectural Patterns

1. **Multi-tenant isolation** - Every entity has `tenantId`, complete data separation
2. **Domain flexibility** - Subdomains (school.scholar.ly) or custom (www.brightongrammar.edu.au)
3. **Structured data first** - Schema.org JSON-LD for every entity
4. **Agent API** - Authenticated API for AI agents to query the platform
5. **Trust signals** - Verification levels, trust scores embedded in all responses
6. **Feature flags** - Granular control over capabilities per tenant

---

## The Scholarly Refactoring

### Domain Mapping: Chekd → Scholarly

| Chekd Concept | Scholarly Equivalent | Notes |
|---------------|---------------------|-------|
| Tenant | Educational Provider | School, tutor, micro-school, homeschool co-op |
| Product | Educational Offering | Course, program, tutoring service, curriculum |
| Seller Trust Score | Educational Quality Score | Based on verified outcomes, reviews, compliance |
| Product Authenticity | Accreditation Status | Registered, accredited, certified, verified outcomes |
| Agent (AI buyer) | Agent (AI advisor) | Helps parents/students find best educational fit |
| Order | Enrollment/Booking | Course enrollment, tutoring session booking |
| Inventory | Availability | Class capacity, tutor availability, session slots |

### New Type System

```typescript
// =============================================================================
// EDUCATIONAL PROVIDER (was: Tenant)
// =============================================================================

export type ProviderType = 
  | 'school'           // Traditional K-12 school
  | 'micro_school'     // Small independent school (typically < 50 students)
  | 'tutoring_centre'  // Commercial tutoring business
  | 'solo_tutor'       // Independent tutor
  | 'homeschool_coop'  // Homeschool cooperative
  | 'curriculum_provider' // Sells curriculum/resources
  | 'enrichment'       // After-school programs, camps
  | 'online_academy';  // Fully online educational provider

export interface EducationalProvider {
  id: string;
  type: ProviderType;
  
  // Identity
  displayName: string;
  legalName: string | null;
  description: string;
  tagline: string;
  
  // Branding
  logoUrl: string | null;
  faviconUrl: string | null;
  theme: ProviderTheme;
  
  // Location(s)
  locations: ProviderLocation[];
  serviceArea: ServiceArea | null;  // For tutors who travel or online providers
  
  // Contact
  primaryContact: ContactInfo;
  
  // Domains
  domains: ProviderDomain[];
  primaryDomain: string;
  
  // Trust & Compliance
  qualityProfile: EducationalQualityProfile;
  complianceStatus: ComplianceStatus;
  
  // Features & Configuration
  features: ProviderFeatures;
  seoConfig: EducationalSEOConfig;
  agentConfig: EducationalAgentConfig;
  
  // Integration
  lisIdentifiers: LISIdentifiers | null;  // Learning Information Services interop
  scholarlyTenantId: string;              // Link to core Scholarly tenant
  
  // Metadata
  status: ProviderStatus;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// EDUCATIONAL OFFERINGS (was: Products)
// =============================================================================

export type OfferingType = 
  | 'school_program'      // Full school program (K-6, Year 7-12)
  | 'course'              // Individual course/subject
  | 'tutoring_package'    // Bundle of tutoring sessions
  | 'tutoring_session'    // Single tutoring session
  | 'workshop'            // One-off workshop
  | 'camp'                // Holiday camp/intensive
  | 'curriculum'          // Curriculum for purchase
  | 'assessment'          // Assessment service
  | 'enrichment_program'; // Extra-curricular program

export interface EducationalOffering {
  id: string;
  providerId: string;
  type: OfferingType;
  
  // Core info
  name: string;
  description: string;
  shortDescription: string;
  
  // Educational details
  subjectArea: string[];
  yearLevels: YearLevel[];
  cefrLevels: CEFRLevel[] | null;   // For language programs
  curriculumAlignment: CurriculumAlignment[];
  
  // Delivery
  deliveryMode: DeliveryMode[];
  duration: Duration;
  schedule: ScheduleInfo | null;
  
  // Capacity & Availability
  availability: OfferingAvailability;
  
  // Pricing
  pricing: EducationalPricing;
  
  // Quality signals - THE SCHOLARLY MOAT
  qualitySignals: OfferingQualitySignals;
  
  // Agent-optimised content
  naturalLanguageSummary: string;
  parentFriendlySummary: string;
  agentContext: string;
  
  // Media
  images: MediaAsset[];
  videos: MediaAsset[];
  virtualTourUrl: string | null;
  
  // Metadata
  status: OfferingStatus;
  createdAt: Date;
  updatedAt: Date;
}

// =============================================================================
// QUALITY & TRUST SIGNALS - THE SCHOLARLY MOAT
// =============================================================================

export interface EducationalQualityProfile {
  // Overall score (0-100)
  overallScore: number;
  
  // Registration & Accreditation
  registrationStatus: RegistrationStatus;
  accreditations: Accreditation[];
  
  // Verified Outcomes
  verifiedOutcomes: VerifiedOutcome[];
  
  // Reviews & Ratings
  aggregateRating: AggregateRating | null;
  
  // Staff qualifications
  staffQualifications: StaffQualificationSummary;
  
  // Compliance
  complianceRecords: ComplianceRecord[];
  
  // Scholarly verification
  scholarlyVerificationLevel: VerificationLevel;
  scholarlyMemberSince: Date;
  lastVerificationDate: Date;
}

export type RegistrationStatus = 
  | 'registered'           // Government registered
  | 'accredited'           // Accredited by recognised body
  | 'pending_registration' // Application in progress
  | 'exempt'               // Legally exempt (homeschool)
  | 'unregistered';        // Not registered

export interface Accreditation {
  body: string;               // e.g., "IB World School", "CRICOS"
  level: string;              // e.g., "PYP", "MYP", "DP"
  issuedAt: Date;
  expiresAt: Date | null;
  verificationUrl: string | null;
  status: 'active' | 'expired' | 'suspended';
}

export interface VerifiedOutcome {
  type: OutcomeType;
  metric: string;
  value: number;
  comparisonBasis: string;    // e.g., "state average", "national median"
  percentile: number | null;
  verifiedAt: Date;
  verifiedBy: string;         // Scholarly, government, independent body
  confidenceLevel: number;
}

export type OutcomeType = 
  | 'academic_achievement'    // Test scores, grades
  | 'progress_growth'         // Learning gains
  | 'graduation_rate'
  | 'university_admission'
  | 'employment_outcomes'
  | 'parent_satisfaction'
  | 'student_satisfaction'
  | 'attendance_rate'
  | 'wellbeing_score';

export interface StaffQualificationSummary {
  totalStaff: number;
  qualifiedTeachers: number;
  advancedDegrees: number;
  averageExperience: number;
  studentTeacherRatio: number;
  specialistStaff: { area: string; count: number }[];
}

export type VerificationLevel = 
  | 'unverified'        // Just signed up
  | 'email_verified'    // Email confirmed
  | 'identity_verified' // KYC for solo providers
  | 'registration_verified' // Gov registration confirmed
  | 'outcomes_verified' // Academic outcomes verified
  | 'premium_verified'; // Full audit including site visit

// =============================================================================
// AGENT API - EDUCATIONAL DISCOVERY
// =============================================================================

export interface EducationalAgentConfig {
  // API access
  apiEnabled: boolean;
  apiKey: string | null;
  apiKeyPrefix: string | null;
  
  // Rate limiting
  rateLimit: RateLimitConfig;
  
  // Capabilities
  capabilities: EducationalAgentCapabilities;
  
  // What agents can discover
  discoverability: DiscoverabilitySettings;
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
  
  // Enrollment (higher trust required)
  checkEnrollmentEligibility: boolean;
  submitEnquiry: boolean;
  bookTour: boolean;
  reservePlace: boolean;
}

export interface DiscoverabilitySettings {
  // What can be discovered
  showInSearch: boolean;
  showPricing: boolean;
  showAvailability: boolean;
  showOutcomes: boolean;
  showStaffInfo: boolean;
  
  // Geographic targeting
  targetAreas: GeoArea[];
  
  // Audience targeting
  targetYearLevels: YearLevel[];
  targetNeedsTypes: string[];  // e.g., "gifted", "learning_support", "esl"
}

// =============================================================================
// SCHEMA.ORG TYPES - EDUCATIONAL
// =============================================================================

export interface EducationalOrganizationSchema {
  '@type': 'EducationalOrganization' | 'School';
  name: string;
  url: string;
  logo: string | null;
  description: string;
  
  // Educational specifics
  educationalCredentialAwarded: string[];
  hasCredential: CredentialSchema[];
  
  // Location
  address: PostalAddressSchema | null;
  areaServed: string[];
  
  // Contact
  contactPoint: ContactPointSchema | null;
  
  // Ratings
  aggregateRating: AggregateRatingSchema | null;
  
  // Scholarly trust signals (custom properties)
  additionalProperty: PropertyValueSchema[];
}

export interface CourseSchema {
  '@type': 'Course';
  name: string;
  description: string;
  provider: EducationalOrganizationSchema;
  
  // Educational details
  educationalLevel: string;
  about: string[];
  teaches: string[];
  assesses: string[];
  coursePrerequisites: string[];
  
  // Delivery
  courseMode: string;              // "online", "onsite", "blended"
  hasCourseInstance: CourseInstanceSchema[];
  
  // Outcomes
  educationalCredentialAwarded: string | null;
  competencyRequired: string[];
  
  // Cost
  offers: OfferSchema;
}
```

### New Services

#### 1. Educational Provider Service (refactored from TenantConfigService)

```typescript
export class EducationalProviderService {
  constructor(
    private readonly repository: EducationalProviderRepository,
    private readonly qualityService: EducationalQualityService,
    private readonly complianceService: ComplianceService
  ) {}

  /**
   * Create a new educational provider.
   * Automatically creates subdomain and initialises quality profile.
   */
  async createProvider(input: CreateProviderInput): Promise<Result<EducationalProvider>> {
    // Validate based on provider type
    // Schools need registration, tutors need identity verification
    // ...
  }

  /**
   * Update provider profile.
   * Triggers re-verification if key fields change.
   */
  async updateProfile(providerId: string, updates: UpdateProviderInput): Promise<Result<EducationalProvider>> {
    // ...
  }

  /**
   * Get provider by domain.
   * This is the core routing function - domain → provider resolution.
   */
  async resolveByDomain(domain: string): Promise<Result<EducationalProvider>> {
    // ...
  }

  /**
   * Generate complete structured data for provider.
   * Returns Schema.org EducationalOrganization + Scholarly extensions.
   */
  async generateStructuredData(providerId: string): Promise<Result<EducationalOrganizationSchema>> {
    const provider = await this.repository.findById(providerId);
    if (!provider) return failure(new NotFoundError('Provider', providerId));

    const quality = await this.qualityService.getProfile(providerId);
    
    return success({
      '@context': 'https://schema.org',
      '@type': provider.type === 'school' ? 'School' : 'EducationalOrganization',
      name: provider.displayName,
      url: `https://${provider.primaryDomain}`,
      logo: provider.logoUrl,
      description: provider.description,
      educationalCredentialAwarded: this.extractCredentials(provider),
      hasCredential: this.mapAccreditations(quality.accreditations),
      address: this.mapLocation(provider.locations[0]),
      areaServed: provider.serviceArea?.regions ?? [],
      aggregateRating: quality.aggregateRating ? {
        '@type': 'AggregateRating',
        ratingValue: quality.aggregateRating.average,
        reviewCount: quality.aggregateRating.count,
        bestRating: 5,
        worstRating: 1
      } : null,
      additionalProperty: [
        { '@type': 'PropertyValue', name: 'scholarlyQualityScore', value: quality.overallScore },
        { '@type': 'PropertyValue', name: 'scholarlyVerificationLevel', value: quality.scholarlyVerificationLevel },
        { '@type': 'PropertyValue', name: 'scholarlyMemberSince', value: quality.scholarlyMemberSince.toISOString() },
        { '@type': 'PropertyValue', name: 'registrationStatus', value: quality.registrationStatus },
        { '@type': 'PropertyValue', name: 'studentTeacherRatio', value: quality.staffQualifications.studentTeacherRatio }
      ]
    });
  }
}
```

#### 2. Educational Agent API Service (refactored from AgentApiService)

```typescript
export class EducationalAgentApiService {
  /**
   * Search educational providers.
   * AI agents use this to find schools/tutors matching criteria.
   */
  async searchProviders(
    request: ProviderSearchRequest
  ): Promise<Result<ProviderSearchResult>> {
    // Natural language query understanding
    // e.g., "private primary schools with strong STEM program in eastern suburbs"
    // → type: school, yearLevels: [K-6], subjects: [STEM], location: eastern suburbs
    
    // Trust-weighted ranking
    // Higher quality scores, verified outcomes rank higher
    
    // Return structured results with trust summary
  }

  /**
   * Search educational offerings.
   * Find specific courses, tutoring services, programs.
   */
  async searchOfferings(
    request: OfferingSearchRequest
  ): Promise<Result<OfferingSearchResult>> {
    // ...
  }

  /**
   * Compare providers side-by-side.
   * AI agents use this to help parents compare options.
   */
  async compareProviders(
    request: ProviderCompareRequest
  ): Promise<Result<ProviderCompareResult>> {
    const providers = await Promise.all(
      request.providerIds.map(id => this.getProvider(id))
    );

    const comparison = this.buildComparisonMatrix(providers, request.criteria);
    
    return success({
      providers,
      comparisonMatrix: comparison,
      trustSummary: this.buildEducationalTrustSummary(providers),
      aiRecommendation: await this.generateRecommendation(providers, request.userContext)
    });
  }

  /**
   * Check availability for an offering.
   * E.g., "Does this tutoring service have slots next Tuesday 4pm?"
   */
  async checkAvailability(
    request: AvailabilityCheckRequest
  ): Promise<Result<AvailabilityCheckResult>> {
    // ...
  }

  /**
   * Get verified outcomes for a provider.
   * Critical for trust - agents need verified data to recommend confidently.
   */
  async getVerifiedOutcomes(
    providerId: string
  ): Promise<Result<VerifiedOutcome[]>> {
    // Only return outcomes that have been verified by Scholarly
    // Include verification date, methodology, confidence level
  }

  /**
   * Generate educational recommendation.
   * AI agents can request a recommendation based on student profile.
   */
  async generateRecommendation(
    request: RecommendationRequest
  ): Promise<Result<EducationalRecommendation>> {
    // Consider:
    // - Student's age, year level
    // - Learning needs (gifted, support, ESL)
    // - Location constraints
    // - Budget
    // - Parent priorities (academic, wellbeing, sports, arts)
    // - Verified outcomes for matching providers
  }
}
```

#### 3. Educational Quality Service (new)

```typescript
export class EducationalQualityService {
  /**
   * Calculate quality score for a provider.
   * This is the educational equivalent of the Chekd trust score.
   */
  async calculateQualityScore(providerId: string): Promise<Result<QualityScoreBreakdown>> {
    const provider = await this.repository.findById(providerId);
    
    // Weight components based on provider type
    const weights = this.getWeightsForType(provider.type);
    
    const components = {
      registration: await this.scoreRegistration(provider),        // 0-100
      accreditation: await this.scoreAccreditations(provider),     // 0-100
      outcomes: await this.scoreVerifiedOutcomes(provider),        // 0-100
      reviews: await this.scoreReviews(provider),                  // 0-100
      staffQualifications: await this.scoreStaff(provider),        // 0-100
      compliance: await this.scoreCompliance(provider),            // 0-100
      engagement: await this.scoreScholarlyEngagement(provider)    // 0-100
    };

    const overall = Object.entries(components).reduce(
      (sum, [key, score]) => sum + score * weights[key],
      0
    );

    return success({
      overall,
      components,
      weights,
      lastCalculated: new Date(),
      confidenceLevel: this.calculateConfidence(components)
    });
  }

  /**
   * Verify an outcome claim.
   * Providers submit outcome data, we verify it.
   */
  async verifyOutcome(
    providerId: string,
    outcome: OutcomeSubmission
  ): Promise<Result<VerifiedOutcome>> {
    // 1. Check data source (government data, standardised tests)
    // 2. Validate methodology
    // 3. Calculate percentile vs comparison group
    // 4. Mark as verified with confidence level
  }

  /**
   * Import government data for verification.
   * E.g., MySchool data in Australia, Ofsted in UK.
   */
  async importGovernmentData(
    providerId: string,
    dataSource: GovernmentDataSource,
    data: any
  ): Promise<Result<void>> {
    // Parse and validate government data
    // Update quality profile with verified outcomes
  }
}
```

---

## Integration with Scholarly Core

### Connecting to Existing Modules

The web hosting service integrates deeply with existing Scholarly modules:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SCHOLARLY HOSTING LAYER                       │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │   Provider  │ │  Offering   │ │   Quality   │ │   Agent    │ │
│  │   Service   │ │   Service   │ │   Service   │ │    API     │ │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘ └─────┬──────┘ │
└─────────┼───────────────┼───────────────┼──────────────┼────────┘
          │               │               │              │
          ▼               ▼               ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    INTELLIGENCE MESH                             │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ │
│  │Wellbeing│ │Assessment│ │Attendance│ │ Parent   │ │ Token   │ │
│  │ Module  │ │  Module  │ │  Module  │ │ Portal   │ │ Economy │ │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬────┘ │
└───────┼───────────┼────────────┼────────────┼────────────┼──────┘
        │           │            │            │            │
        └───────────┴────────────┴────────────┴────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │   Data Lake /   │
                    │   ML Pipeline   │
                    └─────────────────┘
```

### Event Integration

```typescript
// Hosting → Intelligence Mesh events
HOSTING_EVENTS = {
  // Provider lifecycle
  'scholarly.hosting.provider.created': { providerId, type, displayName },
  'scholarly.hosting.provider.verified': { providerId, verificationLevel },
  'scholarly.hosting.provider.quality_updated': { providerId, newScore, oldScore },
  
  // Offering lifecycle
  'scholarly.hosting.offering.created': { offeringId, providerId, type },
  'scholarly.hosting.offering.availability_changed': { offeringId, available, reason },
  
  // Agent interactions
  'scholarly.hosting.agent.search': { agentId, query, resultCount },
  'scholarly.hosting.agent.comparison': { agentId, providerIds, recommendation },
  'scholarly.hosting.agent.enquiry_submitted': { agentId, providerId, studentProfile },
  
  // Quality events
  'scholarly.hosting.outcome.verified': { providerId, outcomeType, value, percentile },
  'scholarly.hosting.compliance.updated': { providerId, status, changes }
}

// Intelligence Mesh → Hosting events (consumed)
MESH_EVENTS_CONSUMED = {
  // Wellbeing data can inform quality scores
  'scholarly.wellbeing.cohort_health_updated': { schoolId, healthIndicators },
  
  // Assessment data informs verified outcomes
  'scholarly.assessment.results_published': { schoolId, assessmentType, aggregateResults },
  
  // Attendance data informs engagement metrics
  'scholarly.attendance.pattern_detected': { schoolId, patternType, significance },
  
  // Parent engagement informs reviews
  'scholarly.parent.review_submitted': { schoolId, rating, review }
}
```

### Data Flow for Quality Scores

```
┌──────────────────────────────────────────────────────────────────┐
│                      QUALITY SCORE CALCULATION                    │
│                                                                   │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      │
│   │  External   │      │   Mesh      │      │   Direct    │      │
│   │   Sources   │      │   Events    │      │   Input     │      │
│   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      │
│          │                    │                    │             │
│          ▼                    ▼                    ▼             │
│   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐      │
│   │ - MySchool  │      │ - Wellbeing │      │ - Provider  │      │
│   │ - NAPLAN    │      │ - Assess    │      │   Profile   │      │
│   │ - Gov Reg   │      │ - Attend    │      │ - Reviews   │      │
│   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘      │
│          │                    │                    │             │
│          └────────────────────┼────────────────────┘             │
│                               ▼                                  │
│                    ┌─────────────────────┐                       │
│                    │   Quality Service   │                       │
│                    │                     │                       │
│                    │  - Score Components │                       │
│                    │  - Weight by Type   │                       │
│                    │  - Confidence Calc  │                       │
│                    └──────────┬──────────┘                       │
│                               │                                  │
│                               ▼                                  │
│                    ┌─────────────────────┐                       │
│                    │   Quality Profile   │                       │
│                    │                     │                       │
│                    │  Score: 87/100      │                       │
│                    │  Confidence: High   │                       │
│                    │  Verified: ✓        │                       │
│                    └─────────────────────┘                       │
└──────────────────────────────────────────────────────────────────┘
```

---

## Use Cases by Provider Type

### 1. Traditional School

**Brighton Grammar (fictional)**
- Domain: `brightongrammar.scholar.ly` or `www.brightongrammar.edu.au`
- Type: `school`
- Verification: `premium_verified` (site visit, outcomes audit)
- Features: Full school website, parent portal integration, enrolment enquiries

**Quality Profile:**
- Government registration: Verified ✓
- Accreditations: CRICOS, IB World School (PYP, MYP)
- Verified outcomes: NAPLAN 95th percentile, 98% Year 12 completion
- Student:teacher ratio: 12:1
- Parent satisfaction: 4.6/5 (234 reviews)

**AI Agent Query:**
> "Find IB World Schools in Melbourne with strong science outcomes"

→ Brighton Grammar appears with verified NAPLAN science scores, IB credentials

### 2. Solo Tutor

**Sarah's Maths Tutoring**
- Domain: `sarahmaths.scholar.ly`
- Type: `solo_tutor`
- Verification: `identity_verified` + `outcomes_verified`
- Features: Booking calendar, session packages, progress tracking

**Quality Profile:**
- Identity verified: WWC check, teaching registration
- Qualifications: MEd (Maths Education), 8 years experience
- Verified outcomes: 94% of students improved by 1+ grade level
- Reviews: 4.9/5 (67 reviews)

**AI Agent Query:**
> "Find maths tutor for Year 10 VCE prep in Brunswick, available Tuesdays"

→ Sarah appears with availability, pricing, verified outcomes

### 3. Micro-School

**Forest Learning Academy**
- Domain: `forestlearning.scholar.ly`
- Type: `micro_school`
- Verification: `registration_verified`
- Features: Enrolment applications, virtual tours, curriculum info

**Quality Profile:**
- Registration: Registered non-government school (VIC)
- Philosophy: Nature-based, project-based learning
- Student:teacher ratio: 8:1
- Verified outcomes: Student wellbeing 95th percentile
- Parent satisfaction: 4.8/5 (28 reviews)

**AI Agent Query:**
> "Find alternative schools with nature-based learning for anxious 8-year-old"

→ Forest Learning appears with wellbeing outcomes, small class sizes

### 4. Homeschool Co-op

**Northern Rivers Homeschool Network**
- Domain: `nrhomeschool.scholar.ly`
- Type: `homeschool_coop`
- Verification: `email_verified` (exempt from registration)
- Features: Class listings, resource sharing, event calendar

**Quality Profile:**
- Status: Homeschool cooperative (registration exempt)
- Members: 45 families
- Classes: Weekly art, science labs, sports days
- Resources: Shared curriculum library

**AI Agent Query:**
> "Find homeschool groups in Northern Rivers with science programs"

→ Network appears with class offerings, member count

---

## Implementation Roadmap

### Phase 1: Core Refactoring (Week 1-2)

1. **Rename and restructure types**
   - Tenant → EducationalProvider
   - Product → EducationalOffering
   - Create new quality signal types

2. **Refactor domain service**
   - Same functionality, education-focused naming
   - Support `.edu.au` custom domains with verification

3. **Refactor config service**
   - EducationalProviderService
   - Add quality profile management
   - Add compliance status tracking

### Phase 2: Quality Service (Week 3-4)

1. **Build EducationalQualityService**
   - Score calculation engine
   - Outcome verification workflow
   - Review aggregation

2. **External data integration**
   - MySchool data import (Australia)
   - NAPLAN results import
   - Registration verification API

3. **Mesh event integration**
   - Subscribe to wellbeing, assessment events
   - Publish quality updates

### Phase 3: Agent API (Week 5-6)

1. **Refactor agent API for education**
   - Provider search with educational filters
   - Offering search
   - Comparison endpoints
   - Recommendation engine

2. **Schema.org structured data**
   - EducationalOrganization schema
   - Course schema
   - Event schema (for workshops, camps)

3. **Trust signals in every response**
   - Quality score
   - Verification level
   - Verified outcomes summary

### Phase 4: Provider Portal (Week 7-8)

1. **Provider dashboard**
   - Profile management
   - Offering management
   - Quality score breakdown
   - Analytics

2. **Verification workflows**
   - Document upload for registration
   - Outcome data submission
   - Review moderation

3. **Public-facing pages**
   - Provider profile pages
   - Offering detail pages
   - Booking/enquiry forms

---

## Technical Specifications

### Database Schema (Prisma additions)

```prisma
// Add to existing schema.prisma

model EducationalProvider {
  id              String   @id @default(cuid())
  tenantId        String   @unique
  type            ProviderType
  
  displayName     String
  legalName       String?
  description     String
  tagline         String?
  
  logoUrl         String?
  faviconUrl      String?
  theme           Json     // ProviderTheme
  
  primaryDomain   String   @unique
  
  status          ProviderStatus @default(PENDING_SETUP)
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // Relations
  domains         ProviderDomain[]
  locations       ProviderLocation[]
  offerings       EducationalOffering[]
  qualityProfile  EducationalQualityProfile?
  features        ProviderFeatures?
  seoConfig       EducationalSEOConfig?
  agentConfig     EducationalAgentConfig?
  
  @@index([type, status])
  @@index([primaryDomain])
}

model EducationalQualityProfile {
  id              String   @id @default(cuid())
  providerId      String   @unique
  
  overallScore    Int      @default(50) // 0-100
  
  registrationStatus  RegistrationStatus @default(UNREGISTERED)
  verificationLevel   VerificationLevel @default(UNVERIFIED)
  
  memberSince     DateTime @default(now())
  lastVerified    DateTime?
  
  // Relations
  provider        EducationalProvider @relation(fields: [providerId], references: [id])
  accreditations  Accreditation[]
  verifiedOutcomes VerifiedOutcome[]
  complianceRecords ComplianceRecord[]
  
  @@index([overallScore])
  @@index([verificationLevel])
}

model VerifiedOutcome {
  id              String   @id @default(cuid())
  qualityProfileId String
  
  type            OutcomeType
  metric          String
  value           Float
  comparisonBasis String
  percentile      Int?
  
  verifiedAt      DateTime
  verifiedBy      String
  confidenceLevel Float    // 0-1
  
  validUntil      DateTime?
  
  qualityProfile  EducationalQualityProfile @relation(fields: [qualityProfileId], references: [id])
  
  @@index([type])
  @@index([verifiedAt])
}

enum ProviderType {
  SCHOOL
  MICRO_SCHOOL
  TUTORING_CENTRE
  SOLO_TUTOR
  HOMESCHOOL_COOP
  CURRICULUM_PROVIDER
  ENRICHMENT
  ONLINE_ACADEMY
}

enum ProviderStatus {
  PENDING_SETUP
  ACTIVE
  SUSPENDED
  ARCHIVED
}

enum RegistrationStatus {
  REGISTERED
  ACCREDITED
  PENDING_REGISTRATION
  EXEMPT
  UNREGISTERED
}

enum VerificationLevel {
  UNVERIFIED
  EMAIL_VERIFIED
  IDENTITY_VERIFIED
  REGISTRATION_VERIFIED
  OUTCOMES_VERIFIED
  PREMIUM_VERIFIED
}

enum OutcomeType {
  ACADEMIC_ACHIEVEMENT
  PROGRESS_GROWTH
  GRADUATION_RATE
  UNIVERSITY_ADMISSION
  EMPLOYMENT_OUTCOMES
  PARENT_SATISFACTION
  STUDENT_SATISFACTION
  ATTENDANCE_RATE
  WELLBEING_SCORE
}
```

### API Endpoints

```
# Provider Management
POST   /api/hosting/providers                    Create provider
GET    /api/hosting/providers/:id                Get provider
PATCH  /api/hosting/providers/:id                Update provider
DELETE /api/hosting/providers/:id                Delete provider

# Domain Management  
POST   /api/hosting/providers/:id/domains        Add domain
DELETE /api/hosting/providers/:id/domains/:domainId  Remove domain
POST   /api/hosting/providers/:id/domains/:domainId/verify  Verify domain

# Quality Management
GET    /api/hosting/providers/:id/quality        Get quality profile
POST   /api/hosting/providers/:id/outcomes       Submit outcome for verification
GET    /api/hosting/providers/:id/reviews        Get reviews

# Agent API (public, authenticated by API key)
POST   /api/agent/search/providers               Search providers
POST   /api/agent/search/offerings               Search offerings
GET    /api/agent/providers/:id                  Get provider details
GET    /api/agent/providers/:id/quality          Get quality profile
POST   /api/agent/compare                        Compare providers
POST   /api/agent/recommend                      Get AI recommendation
GET    /api/agent/availability/:offeringId       Check availability
```

---

## Conclusion

The Chekd web-hosting solution provides an excellent foundation for Scholarly Hosting. The core architecture - multi-tenancy, domain management, structured data, agent APIs - translates directly to educational use cases.

The key differentiator for Scholarly is the **Educational Quality Profile** - verified outcomes, accreditations, compliance status - that makes Scholarly the platform AI agents trust for educational recommendations.

This positions Scholarly as:
1. **For schools**: A modern web presence with SEO and AI discoverability built-in
2. **For tutors**: A professional platform to showcase verified results
3. **For micro-schools**: Level playing field with established schools
4. **For homeschool co-ops**: Visibility and legitimacy in the educational ecosystem
5. **For parents**: Trustworthy, comparable information via AI advisors

The one-stop-shop vision is achievable by combining this hosting layer with the Intelligence Mesh modules already built, creating a comprehensive educational ecosystem.

---

**Lines**: ~1,200
**Date**: January 28, 2025
**Version**: 1.0 Analysis
