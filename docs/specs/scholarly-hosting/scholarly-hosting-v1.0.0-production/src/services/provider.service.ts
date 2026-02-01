/**
 * Educational Provider Service
 * 
 * Core service for managing educational providers (schools, tutors, micro-schools, etc.)
 * Handles provider lifecycle, domain management, and configuration.
 * 
 * @module ScholarlyHosting/Services
 * @version 1.0.0
 */

import {
  EducationalProvider,
  ProviderType,
  ProviderStatus,
  ProviderTheme,
  ProviderLocation,
  ProviderDomain,
  ProviderFeatures,
  EducationalSEOConfig,
  EducationalAgentConfig,
  EducationalQualityProfile,
  DomainType,
  DomainStatus,
  SSLStatus,
  VerificationLevel,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  DomainAlreadyExistsError
} from '../types';

import {
  getPool,
  withTransaction,
  publishEvent,
  logger,
  validators,
  generateId,
  generateVerificationToken,
  generateApiKey,
  getQualityWeightsForType
} from '../infrastructure';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface EducationalProviderRepository {
  findById(providerId: string): Promise<EducationalProvider | null>;
  findByTenantId(tenantId: string): Promise<EducationalProvider | null>;
  findByDomain(domain: string): Promise<EducationalProvider | null>;
  findAll(filters: ProviderFilters): Promise<{ providers: EducationalProvider[]; total: number }>;
  create(provider: Omit<EducationalProvider, 'id' | 'createdAt' | 'updatedAt'>): Promise<EducationalProvider>;
  update(providerId: string, updates: Partial<EducationalProvider>): Promise<EducationalProvider>;
  delete(providerId: string): Promise<void>;
  
  // Domain methods
  addDomain(providerId: string, domain: Omit<ProviderDomain, 'id' | 'createdAt' | 'updatedAt'>): Promise<ProviderDomain>;
  updateDomain(providerId: string, domainId: string, updates: Partial<ProviderDomain>): Promise<ProviderDomain>;
  deleteDomain(providerId: string, domainId: string): Promise<void>;
  findDomainByName(domain: string): Promise<(ProviderDomain & { providerId: string }) | null>;
}

export interface ProviderFilters {
  types?: ProviderType[];
  status?: ProviderStatus[];
  verificationLevels?: VerificationLevel[];
  limit?: number;
  offset?: number;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateProviderInput {
  tenantId: string;
  type: ProviderType;
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

export interface UpdateProviderInput {
  displayName?: string;
  legalName?: string;
  description?: string;
  tagline?: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  status?: ProviderStatus;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

const DEFAULT_THEME: ProviderTheme = {
  primaryColor: '#2563eb',
  secondaryColor: '#1e40af',
  accentColor: '#3b82f6',
  backgroundColor: '#ffffff',
  textColor: '#1f2937',
  fontFamily: 'Inter, system-ui, sans-serif',
  customCss: null
};

const DEFAULT_FEATURES: ProviderFeatures = {
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
  customReporting: false
};

const DEFAULT_AGENT_CONFIG: EducationalAgentConfig = {
  apiEnabled: true,
  apiKey: null,
  apiKeyPrefix: null,
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
    showStaffInfo: false,
    targetAreas: [],
    targetYearLevels: [],
    targetNeedsTypes: []
  }
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class EducationalProviderService {
  private readonly baseDomain: string;

  constructor(
    private readonly repository: EducationalProviderRepository,
    baseDomain?: string
  ) {
    this.baseDomain = baseDomain ?? process.env['BASE_DOMAIN'] ?? 'scholar.ly';
  }

  /**
   * Create a new educational provider.
   * Automatically creates subdomain and initializes quality profile.
   */
  async createProvider(input: CreateProviderInput): Promise<Result<EducationalProvider>> {
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
        return failure(new ValidationError('Tenant already has a provider', 'tenantId'));
      }

      // Generate subdomain from display name if not provided
      const subdomain = input.subdomain ?? this.generateSubdomain(input.displayName);
      validators.subdomain(subdomain);

      const fullDomain = `${subdomain}.${this.baseDomain}`;

      // Check if domain already exists
      const existingDomain = await this.repository.findDomainByName(fullDomain);
      if (existingDomain) {
        return failure(new DomainAlreadyExistsError(fullDomain));
      }

      // Create provider
      const providerId = generateId();
      const now = new Date();

      // Build initial quality profile
      const qualityProfile = this.buildInitialQualityProfile(providerId, input.type);

      // Build SEO config
      const seoConfig = this.buildInitialSEOConfig(input.displayName, fullDomain, input.description);

      // Build location if provided
      const locations: ProviderLocation[] = input.location ? [{
        id: generateId(),
        name: input.location.name,
        isPrimary: true,
        address: input.location.address,
        coordinates: null,
        phone: input.location.phone ?? null,
        email: input.location.email ?? null,
        timezone: input.location.timezone ?? 'Australia/Sydney',
        operatingHours: null
      }] : [];

      // Build initial domain
      const domain: ProviderDomain = {
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
        updatedAt: now
      };

      const provider: EducationalProvider = {
        id: providerId,
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
          preferredContact: 'email'
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
        createdAt: now,
        updatedAt: now
      };

      const created = await this.repository.create(provider);

      // Publish event
      await publishEvent('provider.created', created.id, {
        type: created.type,
        displayName: created.displayName,
        primaryDomain: created.primaryDomain
      });

      // Initiate SSL provisioning for subdomain
      this.provisionSSL(created.id, domain.id).catch(err => {
        logger.error({ err, providerId: created.id }, 'SSL provisioning failed');
      });

      logger.info({ providerId: created.id, type: created.type }, 'Provider created');
      return success(created);

    } catch (error) {
      logger.error({ error, input }, 'Failed to create provider');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get provider by ID.
   */
  async getProvider(providerId: string): Promise<Result<EducationalProvider>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
      }

      return success(provider);
    } catch (error) {
      logger.error({ error, providerId }, 'Failed to get provider');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Get provider by domain.
   * This is the core routing function - domain → provider resolution.
   */
  async resolveByDomain(domain: string): Promise<Result<EducationalProvider>> {
    try {
      const validatedDomain = validators.domain(domain);
      
      const provider = await this.repository.findByDomain(validatedDomain);
      if (!provider) {
        return failure(new NotFoundError('Provider', domain));
      }

      if (provider.status !== 'active') {
        return failure(new NotFoundError('Provider', domain));
      }

      return success(provider);
    } catch (error) {
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update provider profile.
   */
  async updateProvider(providerId: string, updates: UpdateProviderInput): Promise<Result<EducationalProvider>> {
    try {
      validators.providerId(providerId);

      if (updates.displayName) {
        validators.nonEmptyString(updates.displayName, 'displayName');
      }

      const updated = await this.repository.update(providerId, {
        ...updates,
        updatedAt: new Date()
      });

      await publishEvent('provider.updated', providerId, {
        fields: Object.keys(updates)
      });

      logger.info({ providerId, updates: Object.keys(updates) }, 'Provider updated');
      return success(updated);

    } catch (error) {
      logger.error({ error, providerId, updates }, 'Failed to update provider');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Update provider theme.
   */
  async updateTheme(providerId: string, theme: Partial<ProviderTheme>): Promise<Result<EducationalProvider>> {
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
        return failure(new NotFoundError('Provider', providerId));
      }

      const updatedTheme = { ...provider.theme, ...theme };
      const updated = await this.repository.update(providerId, {
        theme: updatedTheme,
        updatedAt: new Date()
      });

      await publishEvent('provider.updated', providerId, { field: 'theme' });

      logger.info({ providerId }, 'Provider theme updated');
      return success(updated);

    } catch (error) {
      logger.error({ error, providerId }, 'Failed to update theme');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Activate a provider (transition from pending_setup to active).
   */
  async activateProvider(providerId: string): Promise<Result<EducationalProvider>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
      }

      if (provider.status !== 'pending_setup') {
        return failure(new ValidationError(
          `Cannot activate provider with status '${provider.status}'`,
          'status'
        ));
      }

      const updated = await this.repository.update(providerId, {
        status: 'active',
        updatedAt: new Date()
      });

      await publishEvent('provider.activated', providerId, {
        displayName: updated.displayName
      });

      logger.info({ providerId }, 'Provider activated');
      return success(updated);

    } catch (error) {
      logger.error({ error, providerId }, 'Failed to activate provider');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Add a custom domain for verification.
   */
  async addCustomDomain(providerId: string, domain: string): Promise<Result<ProviderDomain>> {
    try {
      validators.providerId(providerId);
      const validatedDomain = validators.domain(domain);

      // Prevent adding our own subdomains as custom
      if (validatedDomain.endsWith(`.${this.baseDomain}`)) {
        return failure(new ValidationError(
          `Cannot add ${this.baseDomain} subdomain as custom domain`,
          'domain'
        ));
      }

      // Check if domain already exists
      const existing = await this.repository.findDomainByName(validatedDomain);
      if (existing) {
        return failure(new DomainAlreadyExistsError(validatedDomain));
      }

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
      }

      const verificationToken = generateVerificationToken();
      const now = new Date();

      const newDomain = await this.repository.addDomain(providerId, {
        providerId,
        domain: validatedDomain,
        type: 'custom',
        status: 'pending_verification',
        sslStatus: 'pending',
        sslExpiresAt: null,
        verificationToken,
        verifiedAt: null
      });

      await publishEvent('domain.created', providerId, {
        domainId: newDomain.id,
        domain: validatedDomain,
        type: 'custom',
        verificationToken
      });

      logger.info({ providerId, domain: validatedDomain }, 'Custom domain added, pending verification');
      return success(newDomain);

    } catch (error) {
      logger.error({ error, providerId, domain }, 'Failed to add custom domain');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Verify a custom domain.
   */
  async verifyDomain(providerId: string, domainId: string): Promise<Result<{ verified: boolean; instructions: string }>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
      }

      const domain = provider.domains.find(d => d.id === domainId);
      if (!domain) {
        return failure(new NotFoundError('Domain', domainId));
      }

      if (domain.status === 'verified') {
        return success({
          verified: true,
          instructions: 'Domain is already verified.'
        });
      }

      // Check DNS verification (simulated for now)
      const verified = await this.checkDNSVerification(domain.domain, domain.verificationToken!);

      if (verified) {
        await this.repository.updateDomain(providerId, domainId, {
          status: 'verified',
          verifiedAt: new Date()
        });

        await publishEvent('domain.verified', providerId, {
          domainId,
          domain: domain.domain
        });

        // Initiate SSL provisioning
        this.provisionSSL(providerId, domainId).catch(err => {
          logger.error({ err, providerId, domainId }, 'SSL provisioning failed');
        });

        logger.info({ providerId, domain: domain.domain }, 'Domain verified');
        return success({
          verified: true,
          instructions: 'Domain verified successfully. SSL certificate is being provisioned.'
        });
      }

      const instructions = this.getVerificationInstructions(domain);
      return success({
        verified: false,
        instructions
      });

    } catch (error) {
      logger.error({ error, providerId, domainId }, 'Failed to verify domain');
      return failure(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Generate API key for agent access.
   */
  async generateAgentApiKey(providerId: string): Promise<Result<{ apiKey: string; prefix: string }>> {
    try {
      validators.providerId(providerId);

      const provider = await this.repository.findById(providerId);
      if (!provider) {
        return failure(new NotFoundError('Provider', providerId));
      }

      const { key, prefix, hash } = generateApiKey();

      await this.repository.update(providerId, {
        agentConfig: {
          ...provider.agentConfig,
          apiEnabled: true,
          apiKey: hash,
          apiKeyPrefix: prefix
        },
        updatedAt: new Date()
      });

      await publishEvent('provider.updated', providerId, {
        field: 'agentConfig.apiKey',
        prefix
      });

      logger.info({ providerId, prefix }, 'Agent API key generated');
      return success({ apiKey: key, prefix });

    } catch (error) {
      logger.error({ error, providerId }, 'Failed to generate API key');
      return failure(error instanceof Error ? error : new Error(String(error)));
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

  private buildInitialQualityProfile(providerId: string, type: ProviderType): EducationalQualityProfile {
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
        weights
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
      dataCompleteness: 0.1
    };
  }

  private buildInitialSEOConfig(displayName: string, domain: string, description: string): EducationalSEOConfig {
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
        scholarlyMemberSince: new Date().toISOString()
      },
      robotsConfig: {
        allowIndexing: true,
        allowFollowing: true,
        disallowPaths: ['/admin', '/api'],
        crawlDelay: null
      },
      sitemapEnabled: true
    };
  }

  private async checkDNSVerification(domain: string, token: string): Promise<boolean> {
    // In production, implement actual DNS lookup
    logger.debug({ domain, token }, 'DNS verification check (simulated)');
    return false;
  }

  private getVerificationInstructions(domain: ProviderDomain): string {
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

  private async provisionSSL(providerId: string, domainId: string): Promise<void> {
    await this.repository.updateDomain(providerId, domainId, {
      sslStatus: 'provisioning'
    });

    // Simulate SSL provisioning
    setTimeout(async () => {
      try {
        await this.repository.updateDomain(providerId, domainId, {
          sslStatus: 'active',
          sslExpiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        });

        await publishEvent('domain.ssl_provisioned', providerId, { domainId });
      } catch (error) {
        logger.error({ error, providerId, domainId }, 'SSL provisioning failed');
      }
    }, 5000);
  }
}
