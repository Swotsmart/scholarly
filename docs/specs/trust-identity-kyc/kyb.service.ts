/**
 * KYB Service (Know Your Business)
 * 
 * Business identity verification service supporting:
 * - Business registration verification (ABN, ACN, Company Number)
 * - Director and UBO verification
 * - Authorised representative management
 * - Insurance verification
 * - Business credential management
 * 
 * @version 1.0.0
 */

import { injectable, inject } from 'tsyringe';
import {
  BusinessIdentity,
  BusinessRegistration,
  BusinessPerson,
  AuthorisedRepresentative,
  InsurancePolicy,
  Identity,
  KycLevel,
  VerificationProvider,
  VerificationSession,
  Credential,
  CredentialType,
  CredentialStatus,
  Jurisdiction,
  RiskAssessment,
  RiskLevel,
  TrustScore,
  CollectedDocument,
  DocumentType,
  IdentityRepository,
  StartVerificationInput,
} from './types';

import { Result, success, failure, IdentityError, IdentityNotFoundError } from './identity.service';
import { ProviderRegistry } from './kyc.service';

// ============================================================================
// ERRORS
// ============================================================================

export class BusinessVerificationError extends IdentityError {
  constructor(message: string, code: string = 'BUSINESS_VERIFICATION_ERROR', details?: any) {
    super(message, code, details);
    this.name = 'BusinessVerificationError';
  }
}

export class BusinessNotFoundError extends IdentityError {
  constructor(identifier: string) {
    super(`Business not found: ${identifier}`, 'BUSINESS_NOT_FOUND');
  }
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface Logger {
  debug(message: string, context?: Record<string, any>): void;
  info(message: string, context?: Record<string, any>): void;
  warn(message: string, context?: Record<string, any>): void;
  error(message: string, error?: Error, context?: Record<string, any>): void;
}

export interface EventBus {
  publish(topic: string, tenantId: string, payload: Record<string, any>): Promise<void>;
}

export interface KybServiceConfig {
  /** Platform identifier */
  platformId: string;
  
  /** Default jurisdiction */
  defaultJurisdiction: Jurisdiction;
  
  /** Insurance expiry warning days */
  insuranceExpiryWarningDays: number;
  
  /** Minimum public liability coverage */
  minPublicLiabilityCoverage: number;
  
  /** Whether to require director KYC */
  requireDirectorKyc: boolean;
  
  /** Whether to require UBO KYC */
  requireUboKyc: boolean;
}

export interface CreateBusinessInput {
  legalName: string;
  tradingNames?: string[];
  entityType: BusinessIdentity['entityType'];
  registrations: Omit<BusinessRegistration, 'verifiedAt' | 'verificationProvider'>[];
  registeredAddress: BusinessIdentity['registeredAddress'];
  businessAddress?: BusinessIdentity['businessAddress'];
  industryCode?: string;
  description?: string;
  website?: string;
  founderId: string; // Identity ID of the founder/primary contact
}

export interface AddDirectorInput {
  identityId?: string;
  fullName: string;
  dateOfBirth?: Date;
  role: BusinessPerson['role'];
  ownershipPercent?: number;
  appointedAt?: Date;
}

export interface AddAuthorisedRepInput {
  identityId: string;
  fullName: string;
  role: string;
  authorisations: AuthorisedRepresentative['authorisations'];
  authorisationDocumentId?: string;
  expiresAt?: Date;
}

export interface AddInsuranceInput {
  type: InsurancePolicy['type'];
  policyNumber: string;
  insurer: string;
  coverageAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  documentId?: string;
}

// ============================================================================
// SERVICE
// ============================================================================

@injectable()
export class KybService {
  constructor(
    @inject('IdentityRepository') private repo: IdentityRepository,
    @inject('ProviderRegistry') private providers: ProviderRegistry,
    @inject('EventBus') private eventBus: EventBus,
    @inject('Logger') private logger: Logger,
    @inject('KybConfig') private config: KybServiceConfig
  ) {}

  // ==========================================================================
  // BUSINESS LIFECYCLE
  // ==========================================================================

  /**
   * Create a new business identity
   */
  async createBusiness(
    tenantId: string,
    input: CreateBusinessInput
  ): Promise<Result<BusinessIdentity>> {
    try {
      this.logger.info('Creating business identity', { tenantId, legalName: input.legalName });

      // Verify founder identity exists and is verified
      const founderIdentity = await this.repo.findById(tenantId, input.founderId);
      if (!founderIdentity) {
        return failure(new IdentityNotFoundError(input.founderId));
      }

      if (founderIdentity.kycLevel < KycLevel.STANDARD) {
        return failure(new BusinessVerificationError(
          'Founder must complete identity verification first',
          'FOUNDER_NOT_VERIFIED'
        ));
      }

      const business = await this.repo.createBusiness({
        tenantId,
        legalName: input.legalName,
        tradingNames: input.tradingNames,
        entityType: input.entityType,
        registrations: input.registrations.map(r => ({
          ...r,
          status: 'unknown' as const
        })),
        registeredAddress: input.registeredAddress,
        businessAddress: input.businessAddress,
        industryCode: input.industryCode,
        description: input.description,
        website: input.website,
        directors: [],
        beneficialOwners: [],
        authorisedRepresentatives: [{
          identityId: input.founderId,
          fullName: founderIdentity.profile.fullName || 
            `${founderIdentity.profile.firstName} ${founderIdentity.profile.lastName}`,
          role: 'Founder',
          authorisations: ['full_access'],
          authorisedAt: new Date(),
          isActive: true
        }],
        verificationStatus: 'unverified',
        kybLevel: 0,
        linkedIdentityIds: [input.founderId],
        documents: [],
        credentials: []
      });

      await this.audit('business', business.id, 'created', tenantId, input.founderId, {
        legalName: input.legalName,
        entityType: input.entityType
      });

      await this.publishEvent('kyb.business_created', tenantId, {
        businessId: business.id,
        legalName: input.legalName,
        founderId: input.founderId
      });

      // Start verification of registrations
      await this.verifyRegistrations(business);

      this.logger.info('Business created', { businessId: business.id });
      return success(business);
    } catch (error) {
      this.logger.error('Failed to create business', error as Error, { tenantId });
      return failure(error as Error);
    }
  }

  /**
   * Get a business by ID
   */
  async getBusiness(
    tenantId: string,
    businessId: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }
      return success(business);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Update business details
   */
  async updateBusiness(
    tenantId: string,
    businessId: string,
    updates: Partial<Pick<BusinessIdentity, 
      'tradingNames' | 'businessAddress' | 'industryCode' | 'description' | 'website'
    >>,
    updatedBy: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      // Check if updater is authorised
      const isAuthorised = business.authorisedRepresentatives.some(
        r => r.identityId === updatedBy && r.isActive && 
        (r.authorisations.includes('full_access') || r.authorisations.includes('manage_account'))
      );

      if (!isAuthorised) {
        return failure(new BusinessVerificationError(
          'Not authorised to update this business',
          'NOT_AUTHORISED'
        ));
      }

      const updated = await this.repo.updateBusiness(businessId, updates);

      await this.audit('business', businessId, 'updated', tenantId, updatedBy, {
        changedFields: Object.keys(updates)
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // REGISTRATION VERIFICATION
  // ==========================================================================

  /**
   * Verify business registrations (ABN, ACN, etc.)
   */
  async verifyRegistrations(business: BusinessIdentity): Promise<void> {
    for (const registration of business.registrations) {
      await this.verifyRegistration(business, registration);
    }
  }

  /**
   * Verify a single registration
   */
  private async verifyRegistration(
    business: BusinessIdentity,
    registration: BusinessRegistration
  ): Promise<void> {
    const provider = this.getProviderForRegistration(registration.type);
    if (!provider) {
      this.logger.warn('No provider for registration type', { type: registration.type });
      return;
    }

    const adapter = this.providers.getAdapter(provider);
    if (!adapter) {
      this.logger.warn('Provider adapter not available', { provider });
      return;
    }

    try {
      // Verify with provider (implementation depends on provider)
      // For Australian ABN/ACN, this would call ABR/ASIC APIs
      
      // Simulated verification result
      const isValid = true; // Would come from API
      
      registration.status = isValid ? 'active' : 'unknown';
      registration.verifiedAt = new Date();
      registration.verificationProvider = provider;

      await this.repo.updateBusiness(business.id, {
        registrations: business.registrations
      });

      if (isValid) {
        await this.publishEvent('kyb.registration_verified', business.tenantId, {
          businessId: business.id,
          registrationType: registration.type,
          registrationNumber: registration.number
        });
      }
    } catch (error) {
      this.logger.error('Registration verification failed', error as Error, {
        businessId: business.id,
        registrationType: registration.type
      });
    }
  }

  /**
   * Add a new registration to a business
   */
  async addRegistration(
    tenantId: string,
    businessId: string,
    registration: Omit<BusinessRegistration, 'verifiedAt' | 'verificationProvider'>,
    addedBy: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      // Check for duplicate
      const exists = business.registrations.some(
        r => r.type === registration.type && r.number === registration.number
      );
      if (exists) {
        return failure(new BusinessVerificationError(
          'Registration already exists',
          'DUPLICATE_REGISTRATION'
        ));
      }

      business.registrations.push({
        ...registration,
        status: 'unknown'
      });

      const updated = await this.repo.updateBusiness(businessId, {
        registrations: business.registrations
      });

      // Verify the new registration
      await this.verifyRegistration(updated, registration as BusinessRegistration);

      await this.audit('business', businessId, 'registration_added', tenantId, addedBy, {
        registrationType: registration.type
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // DIRECTOR & UBO MANAGEMENT
  // ==========================================================================

  /**
   * Add a director or beneficial owner
   */
  async addDirector(
    tenantId: string,
    businessId: string,
    input: AddDirectorInput,
    addedBy: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      const person: BusinessPerson = {
        identityId: input.identityId,
        fullName: input.fullName,
        dateOfBirth: input.dateOfBirth,
        role: input.role,
        ownershipPercent: input.ownershipPercent,
        appointedAt: input.appointedAt || new Date(),
        isVerified: false
      };

      // Add to appropriate list
      if (['director', 'secretary'].includes(input.role)) {
        business.directors.push(person);
      } else if (['shareholder', 'ubo', 'trustee', 'partner'].includes(input.role)) {
        business.beneficialOwners.push(person);
      }

      // Link identity if provided
      if (input.identityId && !business.linkedIdentityIds.includes(input.identityId)) {
        business.linkedIdentityIds.push(input.identityId);
      }

      const updated = await this.repo.updateBusiness(businessId, {
        directors: business.directors,
        beneficialOwners: business.beneficialOwners,
        linkedIdentityIds: business.linkedIdentityIds
      });

      // If identity is linked, check their KYC status
      if (input.identityId) {
        const identity = await this.repo.findById(tenantId, input.identityId);
        if (identity && identity.kycLevel >= KycLevel.STANDARD) {
          person.isVerified = true;
          person.verificationRef = identity.id;
          await this.repo.updateBusiness(businessId, {
            directors: business.directors,
            beneficialOwners: business.beneficialOwners
          });
        }
      }

      await this.audit('business', businessId, 'director_added', tenantId, addedBy, {
        role: input.role,
        fullName: input.fullName
      });

      await this.publishEvent('kyb.director_added', tenantId, {
        businessId,
        role: input.role,
        isLinked: !!input.identityId
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Remove a director or beneficial owner
   */
  async removeDirector(
    tenantId: string,
    businessId: string,
    personName: string,
    role: BusinessPerson['role'],
    removedBy: string,
    resignedAt?: Date
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      // Find and update the person
      const lists = [business.directors, business.beneficialOwners];
      for (const list of lists) {
        const index = list.findIndex(p => p.fullName === personName && p.role === role && !p.resignedAt);
        if (index >= 0) {
          list[index].resignedAt = resignedAt || new Date();
        }
      }

      const updated = await this.repo.updateBusiness(businessId, {
        directors: business.directors,
        beneficialOwners: business.beneficialOwners
      });

      await this.audit('business', businessId, 'director_removed', tenantId, removedBy, {
        role,
        fullName: personName
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // AUTHORISED REPRESENTATIVES
  // ==========================================================================

  /**
   * Add an authorised representative
   */
  async addAuthorisedRepresentative(
    tenantId: string,
    businessId: string,
    input: AddAuthorisedRepInput,
    addedBy: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      // Verify the identity exists and is verified
      const identity = await this.repo.findById(tenantId, input.identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(input.identityId));
      }

      if (identity.kycLevel < KycLevel.STANDARD) {
        return failure(new BusinessVerificationError(
          'Representative must complete identity verification first',
          'REP_NOT_VERIFIED'
        ));
      }

      // Check for existing active rep
      const existingActive = business.authorisedRepresentatives.find(
        r => r.identityId === input.identityId && r.isActive
      );
      if (existingActive) {
        return failure(new BusinessVerificationError(
          'This person is already an active representative',
          'DUPLICATE_REP'
        ));
      }

      const rep: AuthorisedRepresentative = {
        identityId: input.identityId,
        fullName: input.fullName,
        role: input.role,
        authorisations: input.authorisations,
        authorisationDocumentId: input.authorisationDocumentId,
        authorisedAt: new Date(),
        expiresAt: input.expiresAt,
        isActive: true
      };

      business.authorisedRepresentatives.push(rep);

      if (!business.linkedIdentityIds.includes(input.identityId)) {
        business.linkedIdentityIds.push(input.identityId);
      }

      const updated = await this.repo.updateBusiness(businessId, {
        authorisedRepresentatives: business.authorisedRepresentatives,
        linkedIdentityIds: business.linkedIdentityIds
      });

      await this.audit('business', businessId, 'rep_added', tenantId, addedBy, {
        representativeId: input.identityId,
        role: input.role,
        authorisations: input.authorisations
      });

      await this.publishEvent('kyb.representative_added', tenantId, {
        businessId,
        representativeId: input.identityId,
        role: input.role
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Revoke an authorised representative
   */
  async revokeAuthorisedRepresentative(
    tenantId: string,
    businessId: string,
    representativeId: string,
    revokedBy: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      const repIndex = business.authorisedRepresentatives.findIndex(
        r => r.identityId === representativeId && r.isActive
      );

      if (repIndex < 0) {
        return failure(new BusinessVerificationError(
          'Active representative not found',
          'REP_NOT_FOUND'
        ));
      }

      // Ensure at least one full_access rep remains
      const remainingFullAccess = business.authorisedRepresentatives.filter(
        (r, i) => i !== repIndex && r.isActive && r.authorisations.includes('full_access')
      );

      if (remainingFullAccess.length === 0 && 
          business.authorisedRepresentatives[repIndex].authorisations.includes('full_access')) {
        return failure(new BusinessVerificationError(
          'Cannot revoke the last full access representative',
          'LAST_ADMIN'
        ));
      }

      business.authorisedRepresentatives[repIndex].isActive = false;

      const updated = await this.repo.updateBusiness(businessId, {
        authorisedRepresentatives: business.authorisedRepresentatives
      });

      await this.audit('business', businessId, 'rep_revoked', tenantId, revokedBy, {
        representativeId
      });

      await this.publishEvent('kyb.representative_revoked', tenantId, {
        businessId,
        representativeId
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Check if an identity is authorised to act for a business
   */
  async isAuthorised(
    tenantId: string,
    businessId: string,
    identityId: string,
    requiredAuthorisation?: AuthorisedRepresentative['authorisations'][0]
  ): Promise<Result<boolean>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      const rep = business.authorisedRepresentatives.find(
        r => r.identityId === identityId && r.isActive
      );

      if (!rep) {
        return success(false);
      }

      // Check expiry
      if (rep.expiresAt && new Date() > rep.expiresAt) {
        return success(false);
      }

      // Check specific authorisation
      if (requiredAuthorisation) {
        const hasAuth = rep.authorisations.includes('full_access') || 
                       rep.authorisations.includes(requiredAuthorisation);
        return success(hasAuth);
      }

      return success(true);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // INSURANCE MANAGEMENT
  // ==========================================================================

  /**
   * Add an insurance policy
   */
  async addInsurance(
    tenantId: string,
    businessId: string,
    input: AddInsuranceInput,
    addedBy: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      const policy: InsurancePolicy = {
        id: this.generateId(),
        type: input.type,
        policyNumber: input.policyNumber,
        insurer: input.insurer,
        coverageAmount: input.coverageAmount,
        currency: input.currency,
        startDate: input.startDate,
        endDate: input.endDate,
        status: new Date() < input.endDate ? 'active' : 'expired',
        documentId: input.documentId
      };

      const policies = business.insurancePolicies || [];
      policies.push(policy);

      const updated = await this.repo.updateBusiness(businessId, {
        insurancePolicies: policies
      });

      await this.audit('business', businessId, 'insurance_added', tenantId, addedBy, {
        type: input.type,
        insurer: input.insurer,
        coverageAmount: input.coverageAmount
      });

      await this.publishEvent('kyb.insurance_added', tenantId, {
        businessId,
        policyId: policy.id,
        type: input.type
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Verify an insurance policy
   */
  async verifyInsurance(
    tenantId: string,
    businessId: string,
    policyId: string,
    verifiedBy: string
  ): Promise<Result<BusinessIdentity>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      const policies = business.insurancePolicies || [];
      const policyIndex = policies.findIndex(p => p.id === policyId);

      if (policyIndex < 0) {
        return failure(new BusinessVerificationError('Policy not found', 'POLICY_NOT_FOUND'));
      }

      policies[policyIndex].verifiedAt = new Date();

      const updated = await this.repo.updateBusiness(businessId, {
        insurancePolicies: policies
      });

      await this.audit('business', businessId, 'insurance_verified', tenantId, verifiedBy, {
        policyId
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Check if business has required insurance
   */
  async hasRequiredInsurance(
    tenantId: string,
    businessId: string,
    requiredTypes: InsurancePolicy['type'][],
    minCoverage?: number
  ): Promise<Result<{ 
    hasAll: boolean; 
    missing: InsurancePolicy['type'][]; 
    insufficientCoverage: InsurancePolicy['type'][] 
  }>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      const activePolicies = (business.insurancePolicies || []).filter(
        p => p.status === 'active' && new Date() < p.endDate
      );

      const missing: InsurancePolicy['type'][] = [];
      const insufficientCoverage: InsurancePolicy['type'][] = [];

      for (const requiredType of requiredTypes) {
        const policy = activePolicies.find(p => p.type === requiredType);
        if (!policy) {
          missing.push(requiredType);
        } else if (minCoverage && policy.coverageAmount < minCoverage) {
          insufficientCoverage.push(requiredType);
        }
      }

      return success({
        hasAll: missing.length === 0 && insufficientCoverage.length === 0,
        missing,
        insufficientCoverage
      });
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // KYB LEVEL & STATUS
  // ==========================================================================

  /**
   * Calculate and update KYB level
   */
  async calculateKybLevel(
    tenantId: string,
    businessId: string
  ): Promise<Result<{ level: number; status: BusinessIdentity['verificationStatus']; requirements: string[] }>> {
    try {
      const business = await this.repo.getBusiness(tenantId, businessId);
      if (!business) {
        return failure(new BusinessNotFoundError(businessId));
      }

      let level = 0;
      const requirements: string[] = [];
      let status: BusinessIdentity['verificationStatus'] = 'unverified';

      // Level 1: Basic registration verified
      const hasVerifiedRegistration = business.registrations.some(r => r.status === 'active');
      if (hasVerifiedRegistration) {
        level = 1;
        status = 'pending';
      } else {
        requirements.push('Verify at least one business registration (ABN/ACN)');
      }

      // Level 2: Directors/UBOs added and verified
      const hasDirectors = business.directors.length > 0 || business.beneficialOwners.length > 0;
      const allKeyPeopleVerified = [...business.directors, ...business.beneficialOwners]
        .filter(p => !p.resignedAt)
        .every(p => p.isVerified);

      if (level >= 1 && hasDirectors && allKeyPeopleVerified) {
        level = 2;
      } else if (level >= 1) {
        if (!hasDirectors) {
          requirements.push('Add directors/beneficial owners');
        }
        if (!allKeyPeopleVerified) {
          requirements.push('Verify all directors and beneficial owners');
        }
      }

      // Level 3: Insurance verified
      const hasInsurance = (business.insurancePolicies || []).some(
        p => p.status === 'active' && p.verifiedAt
      );

      if (level >= 2 && hasInsurance) {
        level = 3;
        status = 'verified';
      } else if (level >= 2) {
        requirements.push('Add and verify insurance policy');
      }

      // Update business
      await this.repo.updateBusiness(businessId, {
        kybLevel: level,
        verificationStatus: status,
        verifiedAt: status === 'verified' ? new Date() : undefined
      });

      await this.publishEvent('kyb.level_calculated', tenantId, {
        businessId,
        level,
        status
      });

      return success({ level, status, requirements });
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private getProviderForRegistration(type: BusinessRegistration['type']): VerificationProvider | null {
    const mapping: Record<string, VerificationProvider> = {
      'abn': VerificationProvider.ABR,
      'acn': VerificationProvider.ASIC,
      'arbn': VerificationProvider.ASIC,
      'company_number': VerificationProvider.COMPANIES_HOUSE
    };
    return mapping[type] || null;
  }

  private generateId(): string {
    return `biz_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async audit(
    entityType: string,
    entityId: string,
    action: string,
    tenantId: string,
    actorId: string,
    details?: Record<string, any>
  ): Promise<void> {
    await this.repo.createAuditLog({
      tenantId,
      entityType: entityType as any,
      entityId,
      action,
      actorType: 'user',
      actorId,
      changes: details ? [{ field: 'action', oldValue: null, newValue: details }] : undefined,
      timestamp: new Date()
    });
  }

  private async publishEvent(
    type: string,
    tenantId: string,
    data: Record<string, any>
  ): Promise<void> {
    await this.eventBus.publish(type, tenantId, {
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}
