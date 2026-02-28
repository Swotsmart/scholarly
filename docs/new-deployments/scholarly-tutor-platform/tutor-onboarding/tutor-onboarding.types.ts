/**
 * ============================================================================
 * SCHOLARLY PLATFORM — Tutor Onboarding Types
 * ============================================================================
 *
 * The type system for the 7-step tutor onboarding orchestrator. Think of this
 * file as the blueprint for a guided tour through a new building: every room
 * (step) has a clear entrance, a defined experience, and an exit that leads
 * to the next room. The OnboardingSession is the visitor's wristband that
 * tracks which rooms they've visited and what they picked up along the way.
 *
 * These types are designed to integrate with the existing Scholarly codebase:
 * - auth.service.ts (Step 1: Identity)
 * - hosting-provider.service.ts (Step 2: Branding, Step 7: Go Live)
 * - tutor-booking.service.ts (Step 3: Calendar, Step 6: Profile)
 * - GoDaddyDomainClient (Step 4: Domain — new)
 * - StripeConnectClient (Step 5: Payments — ported from Érudits)
 * - ai-integration.service.ts (Step 6: Profile — AI bio generation)
 *
 * @module scholarly/tutor-onboarding/types
 * @version 1.0.0
 */

// ============================================================================
// §1 — ONBOARDING STATE MACHINE
// ============================================================================

/**
 * The eight states of the onboarding journey, progressing linearly from
 * NOT_STARTED through each step to COMPLETED. The tutor can revisit
 * completed steps (editing their answers) but the session tracks the
 * furthest step reached — think of it as a high-water mark.
 *
 * Each state transition persists the session and publishes an event on
 * the NATS bus under the `scholarly.onboarding.*` namespace.
 *
 * State machine diagram:
 *   NOT_STARTED → IDENTITY → BRANDING → CALENDAR → DOMAIN
 *     → PAYMENTS → PROFILE → GO_LIVE → COMPLETED
 *
 * Additionally, a session can enter ABANDONED if the tutor doesn't
 * return within the configurable timeout (default: 7 days).
 */
export enum OnboardingStep {
  NOT_STARTED = 'NOT_STARTED',
  IDENTITY    = 'IDENTITY',
  BRANDING    = 'BRANDING',
  CALENDAR    = 'CALENDAR',
  DOMAIN      = 'DOMAIN',
  PAYMENTS    = 'PAYMENTS',
  PROFILE     = 'PROFILE',
  GO_LIVE     = 'GO_LIVE',
  COMPLETED   = 'COMPLETED',
  ABANDONED   = 'ABANDONED',
}

/**
 * Defines valid transitions. The orchestrator enforces these — you can't
 * jump from IDENTITY to PAYMENTS without passing through BRANDING and
 * CALENDAR first. This prevents half-provisioned states.
 */
export const STEP_TRANSITIONS: Record<OnboardingStep, OnboardingStep[]> = {
  [OnboardingStep.NOT_STARTED]: [OnboardingStep.IDENTITY],
  [OnboardingStep.IDENTITY]:    [OnboardingStep.BRANDING],
  [OnboardingStep.BRANDING]:    [OnboardingStep.CALENDAR],
  [OnboardingStep.CALENDAR]:    [OnboardingStep.DOMAIN],
  [OnboardingStep.DOMAIN]:      [OnboardingStep.PAYMENTS],
  [OnboardingStep.PAYMENTS]:    [OnboardingStep.PROFILE],
  [OnboardingStep.PROFILE]:     [OnboardingStep.GO_LIVE],
  [OnboardingStep.GO_LIVE]:     [OnboardingStep.COMPLETED],
  [OnboardingStep.COMPLETED]:   [],
  [OnboardingStep.ABANDONED]:   [OnboardingStep.IDENTITY], // can restart
};

/**
 * Numeric ordering for step comparison. Allows checking whether a step
 * has been reached: `STEP_ORDER[current] >= STEP_ORDER[required]`.
 */
export const STEP_ORDER: Record<OnboardingStep, number> = {
  [OnboardingStep.NOT_STARTED]: 0,
  [OnboardingStep.IDENTITY]:    1,
  [OnboardingStep.BRANDING]:    2,
  [OnboardingStep.CALENDAR]:    3,
  [OnboardingStep.DOMAIN]:      4,
  [OnboardingStep.PAYMENTS]:    5,
  [OnboardingStep.PROFILE]:     6,
  [OnboardingStep.GO_LIVE]:     7,
  [OnboardingStep.COMPLETED]:   8,
  [OnboardingStep.ABANDONED]:   -1,
};

// ============================================================================
// §2 — ONBOARDING SESSION
// ============================================================================

/**
 * The OnboardingSession is the persistent state object that tracks a tutor's
 * journey through all seven steps. It's stored in the database (via Prisma)
 * and cached in Redis for fast resumption.
 *
 * Think of it as a boarding pass that accumulates stamps: each step stamps
 * the session with the data it produced. If the browser closes, the session
 * is reloaded from the database and the tutor picks up where they left off.
 */
export interface OnboardingSession {
  /** Unique session identifier */
  id: string;

  /** The persona blueprint used for this onboarding (e.g., 'TUTOR_SOLO') */
  personaType: PersonaType;

  /** Current step in the onboarding flow */
  currentStep: OnboardingStep;

  /** Highest step reached (high-water mark for progress tracking) */
  furthestStep: OnboardingStep;

  /** Timestamp of session creation */
  createdAt: Date;

  /** Timestamp of last activity (used for abandonment detection) */
  lastActivityAt: Date;

  /** Timestamp of completion (null until COMPLETED) */
  completedAt: Date | null;

  // ── Step 1: Identity Data ──
  /** User ID created during identity step */
  userId: string | null;
  /** Tenant ID created during identity step */
  tenantId: string | null;
  /** Tutor profile ID created during identity step */
  tutorProfileId: string | null;

  // ── Step 2: Branding Data ──
  /** Hosting provider ID created during branding step */
  providerId: string | null;
  /** Subdomain assigned (e.g., 'jane-smith' for jane-smith.scholar.ly) */
  subdomain: string | null;
  /** Business name chosen by the tutor */
  businessName: string | null;
  /** Theme configuration (colours, fonts) */
  theme: OnboardingTheme | null;

  // ── Step 3: Calendar Data ──
  /** Availability slots configured during calendar step */
  availabilitySlots: OnboardingAvailabilitySlot[];
  /** Timezone detected or selected */
  timezone: string | null;

  // ── Step 4: Domain Data ──
  /** Domain configuration choice */
  domainType: DomainChoice | null;
  /** Custom domain name (null if using subdomain only) */
  domainName: string | null;
  /** Domain provisioning status */
  domainStatus: DomainStatus | null;

  // ── Step 5: Payments Data ──
  /** Stripe connected account ID */
  stripeAccountId: string | null;
  /** Stripe onboarding status */
  stripeStatus: StripeOnboardingStatus | null;

  // ── Step 6: Profile Data ──
  /** AI-generated bio suggestion */
  suggestedBio: string | null;
  /** Final bio (after tutor edits) */
  bio: string | null;
  /** AI-generated social media posts */
  socialPosts: SocialPost[];
  /** Profile photo URL */
  profilePhotoUrl: string | null;

  // ── Step 7: Go Live Data ──
  /** Published URL (e.g., 'https://jane-smith.scholar.ly') */
  publishedUrl: string | null;

  // ── Metadata ──
  /** Error from the last failed step (cleared on retry) */
  lastError: OnboardingError | null;
  /** Number of times this session has been resumed */
  resumeCount: number;

  // ── Denormalised Context (populated during Step 1 for use by later steps) ──
  /** Tutor email address (copied from User for convenience in Steps 4–7) */
  userEmail: string | null;
  /** Tutor display name (copied from User) */
  displayName: string | null;
  /** Subjects taught (copied from TutorProfile) */
  subjects: string[];
  /** Location string (e.g., 'Sydney, NSW') */
  location: string | null;
  /** Detected jurisdiction code (e.g., 'NSW', 'VIC') */
  jurisdiction: string | null;
  /** Profile completeness percentage (0–100, updated during Step 6) */
  profileCompleteness: number;
  /** Stripe onboarding status (mirrors stripeStatus but matches SQL column name) */
  stripeOnboardingStatus: string | null;
}

// ============================================================================
// §3 — STEP DATA TYPES
// ============================================================================

// ── Step 1: Identity ──

export interface IdentityStepInput {
  /** Tutor's full name */
  displayName: string;
  /** Email address (becomes account login) */
  email: string;
  /** Password for account creation */
  password: string;
  /** Primary subjects taught (e.g., ['French', 'Spanish']) */
  subjects: string[];
  /** Location for jurisdiction detection (e.g., 'Sydney, NSW') */
  location: string;
  /** Detected or specified jurisdiction (e.g., 'NSW') */
  jurisdiction?: string | undefined;
}

export interface IdentityStepResult {
  userId: string;
  tenantId: string;
  tutorProfileId: string;
  jurisdiction: string;
}

// ── Step 2: Branding ──

export interface BrandingStepInput {
  /** Business name (AI may suggest, tutor can override) */
  businessName: string;
  /** Preferred subdomain slug (auto-generated from business name if not provided) */
  subdomainSlug?: string | undefined;
  /** Theme configuration */
  theme: OnboardingTheme;
}

export interface OnboardingTheme {
  /** Primary brand colour (hex, e.g., '#2563EB') */
  primaryColour: string;
  /** Secondary accent colour (hex) */
  accentColour: string;
  /** Logo URL (optional — AI generates a placeholder if not provided) */
  logoUrl?: string | undefined;
}

export interface BrandingStepResult {
  providerId: string;
  subdomain: string;
  businessName: string;
  providerUrl: string;
}

// ── Step 3: Calendar ──

export interface CalendarStepInput {
  /** Availability slots to set */
  slots: OnboardingAvailabilitySlot[];
  /** Timezone (e.g., 'Australia/Sydney'). Auto-detected if not provided. */
  timezone: string;
}

export interface OnboardingAvailabilitySlot {
  /** Day of week: 0 (Sunday) through 6 (Saturday) */
  dayOfWeek: number;
  /** Start time in HH:MM format (24h) */
  startTime: string;
  /** End time in HH:MM format (24h) */
  endTime: string;
}

export interface CalendarStepResult {
  slotsCreated: number;
  timezone: string;
}

// ── Step 4: Domain ──

export type DomainChoice = 'subdomain_only' | 'purchase_new' | 'transfer_existing' | 'point_existing';

export type DomainStatus =
  | 'not_configured'
  | 'subdomain_active'
  | 'purchase_pending'
  | 'transfer_pending'
  | 'dns_verification_pending'
  | 'ssl_provisioning'
  | 'active'
  | 'failed';

export interface DomainStepInput {
  /** Which domain path the tutor chose */
  choice: DomainChoice;
  /** Domain name (required for purchase/transfer/point) */
  domainName?: string | undefined;
  /** Auth code for domain transfer */
  authCode?: string | undefined;
}

export interface DomainStepResult {
  domainType: DomainChoice;
  domainName: string | null;
  domainStatus: DomainStatus;
  /** DNS instructions for the tutor (for point_existing) */
  dnsInstructions?: DnsInstruction[] | undefined;
}

export interface DnsInstruction {
  type: 'A' | 'CNAME' | 'TXT';
  host: string;
  value: string;
  ttl: number;
}

// ── Step 5: Payments ──

export type StripeOnboardingStatus =
  | 'not_started'
  | 'link_generated'
  | 'pending'
  | 'active'
  | 'restricted'
  | 'skipped';

export interface PaymentsStepInput {
  /** Whether to skip payment setup (can complete later) */
  skip?: boolean | undefined;
  /** Return URL after Stripe onboarding completes */
  returnUrl?: string | undefined;
  /** Refresh URL if Stripe link expires */
  refreshUrl?: string | undefined;
}

export interface PaymentsStepResult {
  stripeAccountId: string | null;
  stripeStatus: StripeOnboardingStatus;
  /** Stripe-hosted onboarding URL (null if skipped) */
  onboardingUrl: string | null;
  /** URL expiry timestamp (null if skipped) */
  expiresAt: number | null;
}

// ── Step 6: Profile ──

export interface ProfileStepInput {
  /** Answers to profile builder questions (AI generates bio from these) */
  answers?: Record<string, string> | undefined;
  /** Override bio (if tutor wants to write their own) */
  bio?: string | undefined;
  /** Profile photo URL */
  profilePhotoUrl?: string | undefined;
  /** Whether to generate social media posts */
  generateSocialPosts?: boolean | undefined;
}

export interface SocialPost {
  platform: 'facebook' | 'instagram' | 'linkedin' | 'twitter';
  content: string;
  hashtags: string[];
}

export interface ProfileStepResult {
  suggestedBio: string;
  bio: string;
  socialPosts: SocialPost[];
  profileCompleteness: number;
}

// ── Step 7: Go Live ──

export interface GoLiveStepInput {
  /** Confirmation that the tutor has reviewed everything */
  confirmed: boolean;
}

export interface GoLiveStepResult {
  publishedUrl: string;
  providerStatus: 'active';
  /** Summary of everything that was provisioned */
  summary: OnboardingSummary;
}

export interface OnboardingSummary {
  businessName: string;
  subdomain: string;
  customDomain: string | null;
  subjects: string[];
  availabilitySlots: number;
  hasStripeConnect: boolean;
  profileCompleteness: number;
}

// ============================================================================
// §4 — PERSONA BLUEPRINTS
// ============================================================================

/**
 * Persona types supported by the onboarding system. Each persona type
 * has a corresponding blueprint that defines the default configuration.
 *
 * Think of personas as templates at a print shop: the TUTOR_SOLO template
 * has sensible defaults for an individual tutor (Mon-Fri 9-5, $60/hr,
 * one-on-one sessions), while the TUTOR_CENTRE template adds multi-tutor
 * management and KYB verification.
 */
export type PersonaType = 'TUTOR_SOLO' | 'TUTOR_CENTRE';

/**
 * The PersonaBlueprint defines what gets provisioned automatically when
 * a tutor of this type signs up. The orchestrator reads the blueprint
 * and executes the provisioning steps in order.
 */
export interface PersonaBlueprint {
  /** Persona identifier */
  type: PersonaType;

  /** Human-readable description */
  description: string;

  /** HostingProvider type to create */
  hostingProviderType: string;

  /** Default user roles to assign */
  defaultRoles: string[];

  /** Default tutor type on the TutorProfile */
  defaultTutorType: string;

  /** Default session types offered */
  defaultSessionTypes: string[];

  /** Default availability configuration */
  defaultAvailability: {
    /** Days of week (0=Sun, 1=Mon, ..., 6=Sat) */
    days: number[];
    /** Start time (HH:MM) */
    startTime: string;
    /** End time (HH:MM) */
    endTime: string;
  };

  /** Default pricing configuration */
  defaultPricing: {
    /** Session type */
    sessionType: string;
    /** Duration in minutes */
    durationMinutes: number;
    /** Base rate in cents */
    baseRateCents: number;
    /** Currency code */
    currency: string;
  };

  /** Default trust score for new users */
  defaultTrustScore: number;

  /** Default subscription plan */
  defaultSubscriptionPlan: string;

  /** Whether KYB (business verification) is required */
  requiresKyb: boolean;

  /** Safeguarding check type per jurisdiction */
  safeguardingCheckType: string;

  /** Features enabled in the hosting provider */
  hostingFeatures: Record<string, boolean>;
}

// ============================================================================
// §5 — PERSONA BLUEPRINT CONFIGURATIONS
// ============================================================================

/**
 * TUTOR_SOLO blueprint: Individual tutor with sensible Australian defaults.
 *
 * This blueprint provisions everything a solo tutor needs to go live in
 * 15 minutes: a professional web presence, availability calendar, pricing,
 * WWCC placeholder, and free-tier subscription with tutoring features enabled.
 *
 * The defaults are deliberately conservative (Mon-Fri 9-5, $60/hr AUD,
 * one-on-one only) because it's easier for a tutor to expand from a
 * working baseline than to trim down an overwhelming configuration.
 */
export const TUTOR_SOLO_BLUEPRINT: PersonaBlueprint = {
  type: 'TUTOR_SOLO',
  description: 'Individual tutor with professional web presence, booking, and payments',
  hostingProviderType: 'solo_tutor',
  defaultRoles: ['tutor'],
  defaultTutorType: 'professional',
  defaultSessionTypes: ['one_on_one'],
  defaultAvailability: {
    days: [1, 2, 3, 4, 5], // Mon-Fri
    startTime: '09:00',
    endTime: '17:00',
  },
  defaultPricing: {
    sessionType: 'one_on_one',
    durationMinutes: 60,
    baseRateCents: 6000, // $60 AUD
    currency: 'AUD',
  },
  defaultTrustScore: 50,
  defaultSubscriptionPlan: 'tutor_free',
  requiresKyb: false,
  safeguardingCheckType: 'wwcc', // resolved to specific type by jurisdiction
  hostingFeatures: {
    agentApiEnabled: true,
    structuredDataEnabled: true,
    reviewsEnabled: true,
    enquiriesEnabled: true,
    tourBookingsEnabled: false,
    multipleLocations: false,
  },
};

/**
 * TUTOR_CENTRE blueprint: Tutoring business with multiple tutors.
 *
 * Inherits TUTOR_SOLO defaults and adds multi-tutor management,
 * KYB business verification, tour bookings, and multiple locations.
 */
export const TUTOR_CENTRE_BLUEPRINT: PersonaBlueprint = {
  ...TUTOR_SOLO_BLUEPRINT,
  type: 'TUTOR_CENTRE',
  description: 'Tutoring centre with multiple tutors, business verification, and institutional features',
  hostingProviderType: 'tutoring_centre',
  defaultRoles: ['tutor', 'admin'],
  requiresKyb: true,
  hostingFeatures: {
    ...TUTOR_SOLO_BLUEPRINT.hostingFeatures,
    tourBookingsEnabled: true,
    multipleLocations: true,
  },
};

/** Registry of all persona blueprints, keyed by type */
export const PERSONA_BLUEPRINTS: Record<PersonaType, PersonaBlueprint> = {
  TUTOR_SOLO: TUTOR_SOLO_BLUEPRINT,
  TUTOR_CENTRE: TUTOR_CENTRE_BLUEPRINT,
};

// ============================================================================
// §6 — ERROR TYPES
// ============================================================================

export interface OnboardingError {
  step: OnboardingStep;
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
}

// ============================================================================
// §7 — NATS EVENT TYPES
// ============================================================================

/**
 * Events published by the onboarding orchestrator. All events are published
 * under the `scholarly.onboarding.*` NATS namespace.
 */
export interface OnboardingStepCompletedEvent {
  sessionId: string;
  userId: string | null;
  tenantId: string | null;
  step: OnboardingStep;
  personaType: PersonaType;
  timestamp: string;
  durationMs: number;
}

export interface OnboardingCompletedEvent {
  sessionId: string;
  userId: string;
  tenantId: string;
  tutorProfileId: string;
  providerId: string;
  personaType: PersonaType;
  publishedUrl: string;
  totalDurationMs: number;
  stepsCompleted: number;
  timestamp: string;
}

export interface OnboardingAbandonedEvent {
  sessionId: string;
  userId: string | null;
  lastStep: OnboardingStep;
  personaType: PersonaType;
  abandonedAfterMs: number;
  timestamp: string;
}

// ============================================================================
// §8 — SERVICE INTERFACE
// ============================================================================

/**
 * The TutorOnboardingService contract. This is the conductor that
 * orchestrates calls to all existing services. Each method corresponds
 * to one onboarding step and returns a typed result.
 */
export interface ITutorOnboardingService {
  /** Create a new onboarding session */
  createSession(personaType: PersonaType): Promise<OnboardingSession>;

  /** Resume an existing session (from database/cache) */
  resumeSession(sessionId: string): Promise<OnboardingSession | null>;

  /** Get session by user ID (for post-registration resumption) */
  getSessionByUserId(userId: string): Promise<OnboardingSession | null>;

  /** Execute Step 1: Identity (account creation) */
  completeIdentity(sessionId: string, input: IdentityStepInput): Promise<IdentityStepResult>;

  /** Execute Step 2: Branding (hosting provider creation) */
  completeBranding(sessionId: string, input: BrandingStepInput): Promise<BrandingStepResult>;

  /** Execute Step 3: Calendar (availability setup) */
  completeCalendar(sessionId: string, input: CalendarStepInput): Promise<CalendarStepResult>;

  /** Execute Step 4: Domain (domain configuration) */
  completeDomain(sessionId: string, input: DomainStepInput): Promise<DomainStepResult>;

  /** Execute Step 5: Payments (Stripe Connect onboarding) */
  completePayments(sessionId: string, input: PaymentsStepInput): Promise<PaymentsStepResult>;

  /** Execute Step 6: Profile (bio generation) */
  completeProfile(sessionId: string, input: ProfileStepInput): Promise<ProfileStepResult>;

  /** Execute Step 7: Go Live (publish) */
  completeGoLive(sessionId: string, input: GoLiveStepInput): Promise<GoLiveStepResult>;

  /** Mark abandoned sessions (called by cleanup job) */
  markAbandoned(sessionId: string): Promise<void>;
}

// ============================================================================
// §9 — DEPENDENCY INTERFACES
// ============================================================================

/**
 * Abstractions for the existing services that the orchestrator calls.
 * These map 1:1 to the real services in the Scholarly codebase but are
 * defined as interfaces here for testability and compile-time safety.
 */

/** Maps to auth.service.ts */
export interface AuthServiceDependency {
  register(params: {
    email: string;
    password: string;
    displayName: string;
    roles: string[];
    tenantId: string;
    jurisdiction?: string | undefined;
  }): Promise<{ userId: string }>;
}

/** Maps to hosting-provider.service.ts */
export interface HostingServiceDependency {
  createProvider(params: {
    tenantId: string;
    name: string;
    type: string;
    settings?: Record<string, unknown> | undefined;
  }): Promise<{ id: string; subdomain: string }>;

  addCustomDomain(providerId: string, domain: string): Promise<{
    verificationToken: string;
    dnsInstructions: DnsInstruction[];
  }>;

  activateProvider(providerId: string): Promise<{ publishedUrl: string }>;
}

/** Maps to tutor-booking.service.ts */
export interface TutorBookingServiceDependency {
  updateTutorAvailability(profileId: string, slots: OnboardingAvailabilitySlot[], timezone: string): Promise<{ slotsCreated: number }>;
  upsertPricingTier(profileId: string, params: {
    sessionType: string;
    durationMinutes: number;
    baseRateCents: number;
    currency: string;
  }): Promise<void>;
  startProfileBuilder(profileId: string): Promise<{ questions: ProfileQuestion[] }>;
}

/** Maps to ai-integration.service.ts */
export interface AIServiceDependency {
  generateBio(params: {
    name: string;
    subjects: string[];
    answers: Record<string, string>;
  }): Promise<{ bio: string }>;

  generateSocialPosts(params: {
    name: string;
    bio: string;
    businessName: string;
  }): Promise<SocialPost[]>;

  suggestBusinessName(params: {
    name: string;
    subjects: string[];
    location: string;
  }): Promise<{ suggestions: string[] }>;

  suggestTheme(params: {
    businessName: string;
    subjects: string[];
  }): Promise<OnboardingTheme>;
}

/** Ported from Érudits stripe-connect.client.ts */
export interface StripeConnectDependency {
  createConnectedAccount(params: {
    authorId: string;
    email: string;
    country?: string | undefined;
    businessType?: 'individual' | 'company' | undefined;
  }): Promise<{ stripeAccountId: string }>;

  createOnboardingLink(params: {
    stripeAccountId: string;
    returnUrl: string;
    refreshUrl: string;
  }): Promise<{ url: string; expiresAt: number }>;

  getAccountStatus(stripeAccountId: string): Promise<{
    stripeAccountId: string;
    detailsSubmitted: boolean;
    chargesEnabled: boolean;
    payoutsEnabled: boolean;
    status: 'not_started' | 'pending' | 'active' | 'restricted';
  }>;
}

/** GoDaddy Domain API client — wraps /v1/domains endpoints */
export interface GoDaddyDomainDependency {
  checkAvailability(domain: string): Promise<{
    domain: string;
    available: boolean;
    priceMicros: number;
    currency: string;
    priceFormatted: string;
    periodYears: number;
  }>;

  suggestDomains(query: string, options?: {
    tlds?: string[];
    limit?: number;
    country?: string;
  }): Promise<Array<{
    domain: string;
    priceMicros: number;
    currency: string;
    priceFormatted: string;
  }>>;

  purchaseDomain(domain: string, contact: {
    nameFirst: string;
    nameLast: string;
    email: string;
    phone: string;
    addressMailing: {
      address1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  }): Promise<{
    domain: string;
    orderId: string;
    expiresAt: string;
    autoRenew: boolean;
  }>;

  initiateTransfer(domain: string, authCode: string, contact: {
    nameFirst: string;
    nameLast: string;
    email: string;
    phone: string;
    addressMailing: {
      address1: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  }): Promise<{
    orderId: string;
    estimatedCompletionDays: number;
  }>;

  updateDnsRecords(domain: string, records: Array<{
    type: 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'NS' | 'SRV';
    name: string;
    data: string;
    ttl: number;
    priority?: number;
  }>): Promise<{ updated: number }>;
}

/** Event bus for publishing onboarding events */
export interface OnboardingEventBus {
  publish(topic: string, payload: Record<string, unknown>): Promise<void>;
}

/** Cache for session quick-access */
export interface OnboardingCache {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
}

/** Profile builder question (from tutor-booking.service.ts) */
export interface ProfileQuestion {
  id: string;
  question: string;
  type: 'text' | 'select' | 'multiselect';
  options?: string[] | undefined;
}
