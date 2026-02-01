/**
 * Hosting Provider Service
 *
 * Core service for managing educational providers (schools, tutors, micro-schools, etc.)
 * Handles provider lifecycle, domain management, and configuration.
 *
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import {
  Result,
  ScholarlyError,
  success,
  failure,
} from './base.service';

import {
  HostingEducationalProvider,
  HostingProviderType,
  HostingProviderStatus,
  HostingProviderTheme,
  HostingProviderLocation,
  HostingProviderDomain,
  HostingProviderFeatures,
  HostingEducationalSEOConfig,
  HostingEducationalAgentConfig,
  HostingEducationalQualityProfile,
  HostingVerificationLevel,
  HostingQualityScoreBreakdown,
} from './hosting-types';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface HostingProviderRepository {
  findById(providerId: string): Promise<HostingEducationalProvider | null>;
  findByTenantId(tenantId: string): Promise<HostingEducationalProvider | null>;
  findByDomain(domain: string): Promise<HostingEducationalProvider | null>;
  findAll(filters: HostingProviderFilters): Promise<{
    providers: HostingEducationalProvider[];
    total: number;
  }>;
  create(
    provider: Omit<HostingEducationalProvider, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<HostingEducationalProvider>;
  update(
    providerId: string,
    updates: Partial<HostingEducationalProvider>
  ): Promise<HostingEducationalProvider>;
  delete(providerId: string): Promise<void>;

  // Domain methods
  addDomain(
    providerId: string,
    domain: Omit<HostingProviderDomain, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<HostingProviderDomain>;
  updateDomain(
    providerId: string,
    domainId: string,
    updates: Partial<HostingProviderDomain>
  ): Promise<HostingProviderDomain>;
  deleteDomain(providerId: string, domainId: string): Promise<void>;
  findDomainByName(
    domain: string
  ): Promise<(HostingProviderDomain & { providerId: string }) | null>;
}

export interface HostingProviderFilters {
  types?: HostingProviderType[];
  status?: HostingProviderStatus[];
  verificationLevels?: HostingVerificationLevel[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateHostingProviderInput {
  tenantId: string;
  type: HostingProviderType;
  displayName: string;
  legalName?: string;
  description: string;
  tagline?: string;

  // Primary location
  location?: {
    name: string;
    address: {
      streetAddress: string;
      addressLocality: string;
      addressRegion: string;
      postalCode: string;
      addressCountry: string;
    };
    phone?: string;
    email?: string;
    timezone?: string;
  };

  // Contact
  contact: {
    name: string;
    role: string;
    email: string;
    phone?: string;
  };

  // Subdomain (auto-generated if not provided)
  subdomain?: string;
}

export interface UpdateHostingProviderInput {
  displayName?: string;
  legalName?: string;
  description?: string;
  tagline?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  status?: HostingProviderStatus;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_THEME: HostingProviderTheme = {
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#3b82f6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontFamily: 'Inter, system-ui, sans-serif',
  customCss: null,
};

const DEFAULT_FEATURES: HostingProviderFeatures = {
  customDomains: true,
  multipleLocations: false,
  advancedAnalytics: false,
  agentApiAccess: true,
  structuredDataEnhanced: true,
  aiRecommendationsEnabled: true,
  onlineEnrollment: false,
  waitlistManagement: false,
  tourBooking: true,
  blogEnabled: false,
  eventsCalendar: false,
  resourceLibrary: false,
  webhooksEnabled: false,
  apiAccess: true,
  lisIntegration: false,
  whiteLabel: false,
  prioritySupport: false,
  customReporting: false,
};

const DEFAULT_AGENT_CONFIG: HostingEducationalAgentConfig = {
  apiEnabled: true,
  apiKey: null,
  apiKeyPrefix: null,
  rateLimit: {
    requestsPerMinute: 60,
    requestsPerHour: 1000,
    requestsPerDay: 10000,
    burstLimit: 10,
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
    reservePlace: false,
  },
  discoverability: {
    showInSearch: true,
    showPricing: true,
    showAvailability: true,
    showOutcomes: true,
    showStaffInfo: false,
    targetAreas: [],
    targetYearLevels: [],
    targetNeedsTypes: [],
  },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${random}`;
}

function generateVerificationToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateApiKey(): { key: string; prefix: string; hash: string } {
  const prefix = `sch_${Date.now().toString(36).slice(-4)}`;
  const keyBytes = new Uint8Array(32);
  crypto.getRandomValues(keyBytes);
  const key = `${prefix}_${Array.from(keyBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')}`;
  // In production, use proper hashing
  const hash = key; // Placeholder - use bcrypt or similar in production
  return { key, prefix, hash };
}

function getQualityWeightsForType(
  type: HostingProviderType
): HostingQualityScoreBreakdown['weights'] {
  // Default weights
  const defaultWeights = {
    registration: 0.2,
    accreditation: 0.15,
    outcomes: 0.25,
    reviews: 0.15,
    staffQualifications: 0.15,
    compliance: 0.05,
    engagement: 0.05,
  };

  // Type-specific adjustments
  switch (type) {
    case 'school':
      return {
        ...defaultWeights,
        registration: 0.25,
        outcomes: 0.3,
        staffQualifications: 0.15,
      };
    case 'solo_tutor':
      return {
        ...defaultWeights,
        registration: 0.1,
        reviews: 0.3,
        outcomes: 0.2,
      };
    case 'homeschool_coop':
      return {
        ...defaultWeights,
        registration: 0.05,
        engagement: 0.2,
        reviews: 0.25,
      };
    default:
      return defaultWeights;
  }
}

// ============================================================================
// VALIDATORS
// ============================================================================

const validators = {
  tenantId(value: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Invalid tenantId');
    }
  },
  providerType(value: HostingProviderType): void {
    const validTypes: HostingProviderType[] = [
      'school',
      'micro_school',
      'tutoring_centre',
      'solo_tutor',
      'homeschool_coop',
      'curriculum_provider',
      'enrichment',
      'online_academy',
    ];
    if (!validTypes.includes(value)) {
      throw new Error(`Invalid provider type: ${value}`);
    }
  },
  nonEmptyString(value: string, field: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error(`${field} is required and must be a non-empty string`);
    }
  },
  email(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Invalid email format');
    }
  },
  subdomain(value: string): void {
    const subdomainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;
    if (!subdomainRegex.test(value)) {
      throw new Error('Invalid subdomain format');
    }
  },
  providerId(value: string): void {
    if (!value || typeof value !== 'string' || value.trim().length === 0) {
      throw new Error('Invalid providerId');
    }
  },
  domain(value: string): string {
    const domain = value.toLowerCase().trim();
    const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)*$/;
    if (!domainRegex.test(domain)) {
      throw new Error('Invalid domain format');
    }
    return domain;
  },
  color(value: string): void {
    const colorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (!colorRegex.test(value)) {
      throw new Error('Invalid color format (use hex format #RRGGBB)');
    }
  },
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class HostingProviderService {
  private readonly baseDomain: string;

  constructor(
    private readonly repository: HostingProviderRepository,
    baseDomain?: string
  ) {
    this.baseDomain = baseDomain ?? process.env['BASE_DOMAIN'] ?? 'scholar.ly';
  }

  /**
   * Create a new educational provider.
   * Automatically creates subdomain and initializes quality profile.
   */
  async createProvider(
    input: CreateHostingProviderInput
  ): Promise<Result<HostingEducationalProvider>> {
    try {
      // Validate input
      validators.tenantId(input.tenantId);
      validators.providerType(input.type);
      validators.nonEmptyString(input.displayName, 'displayName');
      validators.nonEmptyString(input.description, 'description');
      validators.email(input.contact.email);
      validators.nonEmptyString(input.contact.name, 'contact.name');

      // Check if tenant already has a provider
      const existing = await this.repository.findByTenantId(input.tenantId);
      if (existing) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: 'Tenant already has a provider',
          details: { field: 'tenantId' },
        });
      }

      // Generate subdomain from display name if not provided
      const subdomain = input.subdomain ?? this.generateSubdomain(input.displayName);
      validators.subdomain(subdomain);

      const fullDomain = `${subdomain}.${this.baseDomain}`;

      // Check if domain already exists
      const existingDomain = await this.repository.findDomainByName(fullDomain);
      if (existingDomain) {
        return failure({
          code: 'DOMAIN_EXISTS',
          message: `Domain already exists: ${fullDomain}`,
          details: { domain: fullDomain },
        });
      }

      // Create provider
      const providerId = generateId();
      const now = new Date();

      // Build initial quality profile
      const qualityProfile = this.buildInitialQualityProfile(providerId, input.type);

      // Build SEO config
      const seoConfig = this.buildInitialSEOConfig(
        input.displayName,
        fullDomain,
        input.description
      );

      // Build location if provided
      const locations: HostingProviderLocation[] = input.location
        ? [
            {
              id: generateId(),
              name: input.location.name,
              isPrimary: true,
              address: input.location.address,
              coordinates: null,
              phone: input.location.phone ?? null,
              email: input.location.email ?? null,
              timezone: input.location.timezone ?? 'Australia/Sydney',
              operatingHours: null,
            },
          ]
        : [];

      // Build initial domain
      const domain: HostingProviderDomain = {
        id: generateId(),
        providerId,
        domain: fullDomain,
        type: 'subdomain',
        status: 'verified', // Subdomains auto-verified
        sslStatus: 'pending',
        sslExpiresAt: null,
        verificationToken: null,
        verifiedAt: now,
        createdAt: now,
        updatedAt: now,
      };

      const provider: Omit<HostingEducationalProvider, 'id' | 'createdAt' | 'updatedAt'> = {
        tenantId: input.tenantId,
        type: input.type,
        displayName: input.displayName,
        legalName: input.legalName ?? null,
        description: input.description,
        tagline: input.tagline ?? null,
        logoUrl: null,
        faviconUrl: null,
        theme: DEFAULT_THEME,
        locations,
        serviceArea: null,
        primaryContact: {
          name: input.contact.name,
          role: input.contact.role,
          email: input.contact.email,
          phone: input.contact.phone ?? null,
          preferredContact: 'email',
        },
        domains: [domain],
        primaryDomain: fullDomain,
        qualityProfile,
        features: DEFAULT_FEATURES,
        seoConfig,
        agentConfig: DEFAULT_AGENT_CONFIG,
        lisIdentifiers: null,
        scholarlyTenantId: input.tenantId,
        status: 'pending_setup',
      };

      const created = await this.repository.create(provider);

      // Initiate SSL provisioning for subdomain (non-blocking)
      this.provisionSSL(created.id, domain.id).catch((err) => {
        log.error('SSL provisioning failed', err as Error, {
          providerId: created.id,
        });
      });

      log.info('Provider created', {
        providerId: created.id,
        type: created.type,
      });

      return success(created);
    } catch (error) {
      log.error('Failed to create provider', error as Error, { input });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get provider by ID.
   */
  async getProvider(
    providerId: string
  ): Promise<Result<HostingEducationalProvider>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      return success(provider);
    } catch (error) {
      log.error('Failed to get provider', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get provider by domain.
   * This is the core routing function - domain -> provider resolution.
   */
  async resolveByDomain(
    domain: string
  ): Promise<Result<HostingEducationalProvider>> {
    try {
      const validatedDomain = validators.domain(domain);

      const provider = await this.repository.findByDomain(validatedDomain);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found for domain: ${domain}`,
          details: { domain },
        });
      }

      if (provider.status !== 'active') {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found for domain: ${domain}`,
          details: { domain },
        });
      }

      return success(provider);
    } catch (error) {
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update provider profile.
   */
  async updateProvider(
    providerId: string,
    updates: UpdateHostingProviderInput
  ): Promise<Result<HostingEducationalProvider>> {
    try {
      validators.providerId(providerId);

      if (updates.displayName) {
        validators.nonEmptyString(updates.displayName, 'displayName');
      }

      const updated = await this.repository.update(providerId, {
        ...updates,
      });

      log.info('Provider updated', {
        providerId,
        updates: Object.keys(updates),
      });

      return success(updated);
    } catch (error) {
      log.error('Failed to update provider', error as Error, {
        providerId,
        updates,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Update provider theme.
   */
  async updateTheme(
    providerId: string,
    theme: Partial<HostingProviderTheme>
  ): Promise<Result<HostingEducationalProvider>> {
    try {
      validators.providerId(providerId);

      // Validate colors
      if (theme.primaryColor) validators.color(theme.primaryColor);
      if (theme.secondaryColor) validators.color(theme.secondaryColor);
      if (theme.accentColor) validators.color(theme.accentColor);
      if (theme.backgroundColor) validators.color(theme.backgroundColor);
      if (theme.textColor) validators.color(theme.textColor);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      const updatedTheme = { ...provider.theme, ...theme };
      const updated = await this.repository.update(providerId, {
        theme: updatedTheme,
      });

      log.info('Provider theme updated', { providerId });
      return success(updated);
    } catch (error) {
      log.error('Failed to update theme', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Activate a provider (transition from pending_setup to active).
   */
  async activateProvider(
    providerId: string
  ): Promise<Result<HostingEducationalProvider>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      if (provider.status !== 'pending_setup') {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Cannot activate provider with status '${provider.status}'`,
          details: { status: provider.status },
        });
      }

      const updated = await this.repository.update(providerId, {
        status: 'active',
      });

      log.info('Provider activated', { providerId });
      return success(updated);
    } catch (error) {
      log.error('Failed to activate provider', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Add a custom domain for verification.
   */
  async addCustomDomain(
    providerId: string,
    domain: string
  ): Promise<Result<HostingProviderDomain>> {
    try {
      validators.providerId(providerId);
      const validatedDomain = validators.domain(domain);

      // Prevent adding our own subdomains as custom
      if (validatedDomain.endsWith(`.${this.baseDomain}`)) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Cannot add ${this.baseDomain} subdomain as custom domain`,
          details: { domain: validatedDomain },
        });
      }

      // Check if domain already exists
      const existing = await this.repository.findDomainByName(validatedDomain);
      if (existing) {
        return failure({
          code: 'DOMAIN_EXISTS',
          message: `Domain already exists: ${validatedDomain}`,
          details: { domain: validatedDomain },
        });
      }

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      const verificationToken = generateVerificationToken();

      const newDomain = await this.repository.addDomain(providerId, {
        providerId,
        domain: validatedDomain,
        type: 'custom',
        status: 'pending_verification',
        sslStatus: 'pending',
        sslExpiresAt: null,
        verificationToken,
        verifiedAt: null,
      });

      log.info('Custom domain added, pending verification', {
        providerId,
        domain: validatedDomain,
      });

      return success(newDomain);
    } catch (error) {
      log.error('Failed to add custom domain', error as Error, {
        providerId,
        domain,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Verify a custom domain.
   */
  async verifyDomain(
    providerId: string,
    domainId: string
  ): Promise<Result<{ verified: boolean; instructions: string }>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      const domain = provider.domains.find((d) => d.id === domainId);
      if (!domain) {
        return failure({
          code: 'NOT_FOUND',
          message: `Domain not found: ${domainId}`,
          details: { domainId },
        });
      }

      if (domain.status === 'verified') {
        return success({
          verified: true,
          instructions: 'Domain is already verified.',
        });
      }

      // Check DNS verification (simulated for now)
      const verified = await this.checkDNSVerification(
        domain.domain,
        domain.verificationToken!
      );

      if (verified) {
        await this.repository.updateDomain(providerId, domainId, {
          status: 'verified',
          verifiedAt: new Date(),
        });

        // Initiate SSL provisioning
        this.provisionSSL(providerId, domainId).catch((err) => {
          log.error('SSL provisioning failed', err as Error, {
            providerId,
            domainId,
          });
        });

        log.info('Domain verified', { providerId, domain: domain.domain });
        return success({
          verified: true,
          instructions:
            'Domain verified successfully. SSL certificate is being provisioned.',
        });
      }

      const instructions = this.getVerificationInstructions(domain);
      return success({
        verified: false,
        instructions,
      });
    } catch (error) {
      log.error('Failed to verify domain', error as Error, {
        providerId,
        domainId,
      });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Generate API key for agent access.
   */
  async generateAgentApiKey(
    providerId: string
  ): Promise<Result<{ apiKey: string; prefix: string }>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure({
          code: 'NOT_FOUND',
          message: `Provider not found: ${providerId}`,
          details: { providerId },
        });
      }

      const { key, prefix, hash } = generateApiKey();

      await this.repository.update(providerId, {
        agentConfig: {
          ...provider.agentConfig,
          apiEnabled: true,
          apiKey: hash,
          apiKeyPrefix: prefix,
        },
      });

      log.info('Agent API key generated', { providerId, prefix });
      return success({ apiKey: key, prefix });
    } catch (error) {
      log.error('Failed to generate API key', error as Error, { providerId });
      return failure({
        code: 'SERVICE_ERROR',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private generateSubdomain(displayName: string): string {
    return displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 63);
  }

  private buildInitialQualityProfile(
    providerId: string,
    type: HostingProviderType
  ): HostingEducationalQualityProfile {
    const weights = getQualityWeightsForType(type);

    return {
      providerId,
      overallScore: 50,
      scoreBreakdown: {
        registration: 0,
        accreditation: 0,
        outcomes: 0,
        reviews: 0,
        staffQualifications: 0,
        compliance: 0,
        engagement: 50,
        weights,
      },
      registrationStatus: 'unregistered',
      registrationDetails: null,
      accreditations: [],
      verifiedOutcomes: [],
      aggregateRating: null,
      staffQualifications: null,
      complianceRecords: [],
      complianceStatus: 'not_assessed',
      verificationLevel: 'unverified',
      memberSince: new Date(),
      lastVerificationDate: null,
      nextVerificationDue: null,
      confidenceLevel: 0.2,
      dataCompleteness: 0.1,
    };
  }

  private buildInitialSEOConfig(
    displayName: string,
    domain: string,
    description: string
  ): HostingEducationalSEOConfig {
    return {
      defaultTitle: displayName,
      titleTemplate: `%s | ${displayName}`,
      defaultDescription: description.substring(0, 160),
      defaultKeywords: [],
      ogImage: null,
      ogType: 'website',
      twitterCard: 'summary_large_image',
      twitterSite: null,
      organizationSchema: {
        '@type': 'EducationalOrganization',
        name: displayName,
        legalName: null,
        url: `https://${domain}`,
        logo: null,
        description: description,
        foundingDate: null,
        educationalCredentialAwarded: [],
        hasCredential: [],
        address: null,
        areaServed: [],
        telephone: null,
        email: null,
        sameAs: [],
        scholarlyQualityScore: 50,
        scholarlyVerificationLevel: 'unverified',
        scholarlyMemberSince: new Date().toISOString(),
      },
      robotsConfig: {
        allowIndexing: true,
        allowFollowing: true,
        disallowPaths: ['/admin', '/api'],
        crawlDelay: null,
      },
      sitemapEnabled: true,
    };
  }

  private async checkDNSVerification(
    domain: string,
    token: string
  ): Promise<boolean> {
    // In production, implement actual DNS lookup
    log.debug('DNS verification check (simulated)', { domain, token });
    return false;
  }

  private getVerificationInstructions(domain: HostingProviderDomain): string {
    return `To verify ownership of ${domain.domain}, add a DNS TXT record:

Host: _scholarly-verify.${domain.domain}
Type: TXT
Value: ${domain.verificationToken}

After adding the record, wait a few minutes for DNS propagation and click "Verify" again.

Alternatively, you can add a CNAME record:
Host: ${domain.domain}
Type: CNAME
Value: ${domain.domain.replace(/\./g, '-')}.ssl.scholar.ly`;
  }

  private async provisionSSL(
    providerId: string,
    domainId: string
  ): Promise<void> {
    await this.repository.updateDomain(providerId, domainId, {
      sslStatus: 'provisioning',
    });

    // Simulate SSL provisioning
    setTimeout(async () => {
      try {
        await this.repository.updateDomain(providerId, domainId, {
          sslStatus: 'active',
          sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        });
      } catch (error) {
        log.error('SSL provisioning failed', error as Error, {
          providerId,
          domainId,
        });
      }
    }, 5000);
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let serviceInstance: HostingProviderService | null = null;

export function initializeHostingProviderService(
  repository: HostingProviderRepository,
  baseDomain?: string
): HostingProviderService {
  serviceInstance = new HostingProviderService(repository, baseDomain);
  return serviceInstance;
}

export function getHostingProviderService(): HostingProviderService {
  if (!serviceInstance) {
    throw new Error('HostingProviderService not initialized');
  }
  return serviceInstance;
}
