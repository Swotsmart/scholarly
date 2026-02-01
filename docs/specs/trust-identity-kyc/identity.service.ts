/**
 * Identity Service
 * 
 * Core identity management service that serves as the foundation for
 * KYC, KYB, and Trust services. Manages user identities, profiles,
 * contact verification, and links to credentials.
 * 
 * @version 1.0.0
 */

import { injectable, inject } from 'tsyringe';
import {
  Identity,
  IdentityStatus,
  IdentityProfile,
  IdentityContact,
  KycLevel,
  VerificationSession,
  VerificationRecord,
  Credential,
  CredentialType,
  CredentialStatus,
  TrustScore,
  RiskAssessment,
  Address,
  IdentityRepository,
  AuditLogEntry,
} from './types';

// ============================================================================
// RESULT TYPE
// ============================================================================

export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

export function success<T>(data: T): Result<T> {
  return { success: true, data };
}

export function failure<E = Error>(error: E): Result<never, E> {
  return { success: false, error };
}

// ============================================================================
// ERRORS
// ============================================================================

export class IdentityError extends Error {
  constructor(message: string, public code: string, public details?: any) {
    super(message);
    this.name = 'IdentityError';
  }
}

export class IdentityNotFoundError extends IdentityError {
  constructor(identifier: string) {
    super(`Identity not found: ${identifier}`, 'IDENTITY_NOT_FOUND');
  }
}

export class ContactVerificationError extends IdentityError {
  constructor(message: string) {
    super(message, 'CONTACT_VERIFICATION_FAILED');
  }
}

export class DuplicateIdentityError extends IdentityError {
  constructor(field: string, value: string) {
    super(`Identity already exists with ${field}: ${value}`, 'DUPLICATE_IDENTITY');
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

export interface OtpService {
  generate(length?: number): string;
  send(type: 'email' | 'sms', destination: string, code: string): Promise<boolean>;
}

export interface IdentityServiceConfig {
  /** OTP expiry in minutes */
  otpExpiryMinutes: number;
  
  /** Maximum OTP attempts */
  maxOtpAttempts: number;
  
  /** Whether to require email verification */
  requireEmailVerification: boolean;
  
  /** Whether to require phone verification */
  requirePhoneVerification: boolean;
  
  /** Platform identifier */
  platformId: string;
}

const DEFAULT_CONFIG: IdentityServiceConfig = {
  otpExpiryMinutes: 10,
  maxOtpAttempts: 3,
  requireEmailVerification: true,
  requirePhoneVerification: false,
  platformId: 'platform'
};

// ============================================================================
// SERVICE
// ============================================================================

@injectable()
export class IdentityService {
  private config: IdentityServiceConfig;

  constructor(
    @inject('IdentityRepository') private repo: IdentityRepository,
    @inject('EventBus') private eventBus: EventBus,
    @inject('OtpService') private otpService: OtpService,
    @inject('Logger') private logger: Logger,
    @inject('IdentityConfig') config?: Partial<IdentityServiceConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // ==========================================================================
  // IDENTITY LIFECYCLE
  // ==========================================================================

  /**
   * Create a new identity for a user
   */
  async createIdentity(
    tenantId: string,
    userId: string,
    profile?: Partial<IdentityProfile>,
    email?: string,
    phone?: string
  ): Promise<Result<Identity>> {
    try {
      this.logger.info('Creating identity', { tenantId, userId });

      // Check for existing identity
      const existing = await this.repo.findByUserId(tenantId, userId);
      if (existing) {
        return failure(new DuplicateIdentityError('userId', userId));
      }

      const contacts: IdentityContact[] = [];
      
      if (email) {
        contacts.push({
          id: this.generateId(),
          type: 'email',
          value: email.toLowerCase(),
          isPrimary: true,
          isVerified: false
        });
      }

      if (phone) {
        contacts.push({
          id: this.generateId(),
          type: 'phone',
          value: this.normalizePhone(phone),
          isPrimary: true,
          isVerified: false
        });
      }

      const identity = await this.repo.create({
        tenantId,
        userId,
        status: IdentityStatus.UNVERIFIED,
        kycLevel: KycLevel.NONE,
        profile: {
          ...profile,
          isVerified: false
        },
        contacts,
        verifications: [],
        credentials: []
      });

      await this.audit('identity', identity.id, 'created', tenantId, 'system', {
        userId,
        hasEmail: !!email,
        hasPhone: !!phone
      });

      await this.publishEvent('identity.created', tenantId, {
        identityId: identity.id,
        userId
      });

      this.logger.info('Identity created', { tenantId, identityId: identity.id });
      return success(identity);
    } catch (error) {
      this.logger.error('Failed to create identity', error as Error, { tenantId, userId });
      return failure(error as Error);
    }
  }

  /**
   * Get an identity by ID
   */
  async getIdentity(tenantId: string, identityId: string): Promise<Result<Identity>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }
      return success(identity);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get an identity by user ID
   */
  async getIdentityByUserId(tenantId: string, userId: string): Promise<Result<Identity>> {
    try {
      const identity = await this.repo.findByUserId(tenantId, userId);
      if (!identity) {
        return failure(new IdentityNotFoundError(`userId:${userId}`));
      }
      return success(identity);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Update identity profile
   */
  async updateProfile(
    tenantId: string,
    identityId: string,
    profile: Partial<IdentityProfile>
  ): Promise<Result<Identity>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const updatedProfile = {
        ...identity.profile,
        ...profile,
        isVerified: false // Profile changes require re-verification
      };

      const updated = await this.repo.update(identityId, { profile: updatedProfile });

      await this.audit('identity', identityId, 'profile_updated', tenantId, 'user', {
        changedFields: Object.keys(profile)
      });

      await this.publishEvent('identity.profile_updated', tenantId, {
        identityId,
        changedFields: Object.keys(profile)
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Suspend an identity
   */
  async suspendIdentity(
    tenantId: string,
    identityId: string,
    reason: string,
    suspendedBy: string
  ): Promise<Result<Identity>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const updated = await this.repo.update(identityId, {
        status: IdentityStatus.SUSPENDED,
        metadata: {
          ...identity.metadata,
          suspensionReason: reason,
          suspendedAt: new Date(),
          suspendedBy
        }
      });

      await this.audit('identity', identityId, 'suspended', tenantId, suspendedBy, { reason });

      await this.publishEvent('identity.suspended', tenantId, {
        identityId,
        reason,
        suspendedBy
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Reinstate a suspended identity
   */
  async reinstateIdentity(
    tenantId: string,
    identityId: string,
    reinstatedBy: string
  ): Promise<Result<Identity>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      if (identity.status !== IdentityStatus.SUSPENDED) {
        return failure(new IdentityError('Identity is not suspended', 'NOT_SUSPENDED'));
      }

      // Determine appropriate status based on KYC level
      let newStatus = IdentityStatus.UNVERIFIED;
      if (identity.kycLevel >= KycLevel.STANDARD) {
        newStatus = IdentityStatus.VERIFIED;
      } else if (identity.kycLevel >= KycLevel.BASIC) {
        newStatus = IdentityStatus.BASIC;
      }

      const updated = await this.repo.update(identityId, {
        status: newStatus,
        metadata: {
          ...identity.metadata,
          reinstatedAt: new Date(),
          reinstatedBy
        }
      });

      await this.audit('identity', identityId, 'reinstated', tenantId, reinstatedBy);

      await this.publishEvent('identity.reinstated', tenantId, {
        identityId,
        reinstatedBy
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // CONTACT VERIFICATION
  // ==========================================================================

  /**
   * Add a contact method to an identity
   */
  async addContact(
    tenantId: string,
    identityId: string,
    type: 'email' | 'phone' | 'mobile',
    value: string,
    isPrimary: boolean = false
  ): Promise<Result<IdentityContact>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const normalizedValue = type === 'email' ? value.toLowerCase() : this.normalizePhone(value);

      // Check for duplicate
      const existingContact = identity.contacts.find(
        c => c.type === type && c.value === normalizedValue
      );
      if (existingContact) {
        return failure(new IdentityError('Contact already exists', 'DUPLICATE_CONTACT'));
      }

      // If setting as primary, unset other primaries of same type
      if (isPrimary) {
        for (const contact of identity.contacts.filter(c => c.type === type && c.isPrimary)) {
          await this.repo.updateContact(contact.id, { isPrimary: false });
        }
      }

      const contact = await this.repo.addContact(identityId, {
        type,
        value: normalizedValue,
        isPrimary,
        isVerified: false
      });

      await this.audit('identity', identityId, 'contact_added', tenantId, 'user', {
        contactType: type,
        isPrimary
      });

      return success(contact);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Send verification code to a contact
   */
  async sendVerificationCode(
    tenantId: string,
    identityId: string,
    contactId: string
  ): Promise<Result<{ expiresAt: Date }>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const contact = identity.contacts.find(c => c.id === contactId);
      if (!contact) {
        return failure(new IdentityError('Contact not found', 'CONTACT_NOT_FOUND'));
      }

      if (contact.isVerified) {
        return failure(new IdentityError('Contact already verified', 'ALREADY_VERIFIED'));
      }

      const code = this.otpService.generate(6);
      const expiresAt = new Date(Date.now() + this.config.otpExpiryMinutes * 60 * 1000);

      await this.repo.updateContact(contactId, {
        verificationCode: code,
        codeExpiresAt: expiresAt
      });

      const sendType = contact.type === 'email' ? 'email' : 'sms';
      const sent = await this.otpService.send(sendType, contact.value, code);

      if (!sent) {
        return failure(new ContactVerificationError('Failed to send verification code'));
      }

      await this.audit('identity', identityId, 'verification_code_sent', tenantId, 'system', {
        contactId,
        contactType: contact.type
      });

      return success({ expiresAt });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Verify a contact with the provided code
   */
  async verifyContact(
    tenantId: string,
    identityId: string,
    contactId: string,
    code: string
  ): Promise<Result<IdentityContact>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const contact = identity.contacts.find(c => c.id === contactId);
      if (!contact) {
        return failure(new IdentityError('Contact not found', 'CONTACT_NOT_FOUND'));
      }

      if (contact.isVerified) {
        return failure(new IdentityError('Contact already verified', 'ALREADY_VERIFIED'));
      }

      if (!contact.verificationCode || !contact.codeExpiresAt) {
        return failure(new ContactVerificationError('No verification code pending'));
      }

      if (new Date() > contact.codeExpiresAt) {
        return failure(new ContactVerificationError('Verification code expired'));
      }

      if (contact.verificationCode !== code) {
        return failure(new ContactVerificationError('Invalid verification code'));
      }

      const updated = await this.repo.updateContact(contactId, {
        isVerified: true,
        verifiedAt: new Date(),
        verificationMethod: contact.type === 'email' ? 'otp' : 'otp',
        verificationCode: undefined,
        codeExpiresAt: undefined
      });

      // Check if this upgrades KYC level
      await this.checkAndUpgradeKycLevel(identity);

      await this.audit('identity', identityId, 'contact_verified', tenantId, 'user', {
        contactId,
        contactType: contact.type
      });

      await this.publishEvent('identity.contact_verified', tenantId, {
        identityId,
        contactType: contact.type
      });

      return success(updated);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Remove a contact from an identity
   */
  async removeContact(
    tenantId: string,
    identityId: string,
    contactId: string
  ): Promise<Result<void>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const contact = identity.contacts.find(c => c.id === contactId);
      if (!contact) {
        return failure(new IdentityError('Contact not found', 'CONTACT_NOT_FOUND'));
      }

      // Don't allow removing the only verified email
      if (contact.type === 'email' && contact.isVerified) {
        const otherVerifiedEmails = identity.contacts.filter(
          c => c.type === 'email' && c.isVerified && c.id !== contactId
        );
        if (otherVerifiedEmails.length === 0) {
          return failure(new IdentityError(
            'Cannot remove only verified email',
            'CANNOT_REMOVE_PRIMARY_CONTACT'
          ));
        }
      }

      await this.repo.removeContact(contactId);

      await this.audit('identity', identityId, 'contact_removed', tenantId, 'user', {
        contactType: contact.type
      });

      return success(undefined);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // KYC LEVEL MANAGEMENT
  // ==========================================================================

  /**
   * Get current KYC level for an identity
   */
  async getKycLevel(tenantId: string, identityId: string): Promise<Result<{
    level: KycLevel;
    status: IdentityStatus;
    verifiedContacts: string[];
    credentials: CredentialType[];
    nextLevelRequirements?: string[];
  }>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const verifiedContacts = identity.contacts
        .filter(c => c.isVerified)
        .map(c => c.type);

      const validCredentials = identity.credentials
        .filter(c => c.status === CredentialStatus.VALID)
        .map(c => c.type);

      const nextLevelRequirements = this.getNextLevelRequirements(identity);

      return success({
        level: identity.kycLevel,
        status: identity.status,
        verifiedContacts,
        credentials: validCredentials,
        nextLevelRequirements
      });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Check and upgrade KYC level based on current verifications
   */
  private async checkAndUpgradeKycLevel(identity: Identity): Promise<void> {
    const hasVerifiedEmail = identity.contacts.some(c => c.type === 'email' && c.isVerified);
    const hasVerifiedPhone = identity.contacts.some(c => 
      (c.type === 'phone' || c.type === 'mobile') && c.isVerified
    );
    const hasVerifiedProfile = identity.profile.isVerified;
    const hasValidCredentials = identity.credentials.some(c => c.status === CredentialStatus.VALID);

    let newLevel = identity.kycLevel;
    let newStatus = identity.status;

    // Level 1: Basic (email OR phone verified)
    if (hasVerifiedEmail || hasVerifiedPhone) {
      if (identity.kycLevel < KycLevel.BASIC) {
        newLevel = KycLevel.BASIC;
        newStatus = IdentityStatus.BASIC;
      }
    }

    // Level 2: Standard (profile verified via ID check)
    if (hasVerifiedProfile) {
      if (identity.kycLevel < KycLevel.STANDARD) {
        newLevel = KycLevel.STANDARD;
        newStatus = IdentityStatus.VERIFIED;
      }
    }

    // Level 3: Enhanced (has valid credentials like WWCC)
    if (hasVerifiedProfile && hasValidCredentials) {
      if (identity.kycLevel < KycLevel.ENHANCED) {
        newLevel = KycLevel.ENHANCED;
        newStatus = IdentityStatus.ENHANCED;
      }
    }

    if (newLevel !== identity.kycLevel) {
      await this.repo.update(identity.id, {
        kycLevel: newLevel,
        status: newStatus
      });

      await this.publishEvent('identity.kyc_level_changed', identity.tenantId, {
        identityId: identity.id,
        previousLevel: identity.kycLevel,
        newLevel
      });
    }
  }

  /**
   * Get requirements for next KYC level
   */
  private getNextLevelRequirements(identity: Identity): string[] {
    const requirements: string[] = [];

    switch (identity.kycLevel) {
      case KycLevel.NONE:
        if (!identity.contacts.some(c => c.type === 'email' && c.isVerified)) {
          requirements.push('Verify email address');
        }
        break;
        
      case KycLevel.BASIC:
        if (!identity.profile.isVerified) {
          requirements.push('Complete identity verification with government ID');
        }
        break;
        
      case KycLevel.STANDARD:
        if (!identity.credentials.some(c => c.status === CredentialStatus.VALID)) {
          requirements.push('Add and verify a professional credential (e.g., WWCC)');
        }
        break;
        
      case KycLevel.ENHANCED:
        requirements.push('Maximum verification level achieved');
        break;
    }

    return requirements;
  }

  // ==========================================================================
  // CREDENTIAL HELPERS
  // ==========================================================================

  /**
   * Get all credentials for an identity
   */
  async getCredentials(
    tenantId: string,
    identityId: string
  ): Promise<Result<Credential[]>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }
      return success(identity.credentials);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get a specific credential by type
   */
  async getCredentialByType(
    tenantId: string,
    identityId: string,
    credentialType: CredentialType
  ): Promise<Result<Credential | null>> {
    try {
      const credential = await this.repo.getCredentialByType(identityId, credentialType);
      return success(credential);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // TRUST & RISK HELPERS
  // ==========================================================================

  /**
   * Get trust score for an identity
   */
  async getTrustScore(
    tenantId: string,
    identityId: string
  ): Promise<Result<TrustScore | null>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }
      return success(identity.trustScore || null);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get risk assessment for an identity
   */
  async getRiskAssessment(
    tenantId: string,
    identityId: string
  ): Promise<Result<RiskAssessment | null>> {
    try {
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }
      return success(identity.riskAssessment || null);
    } catch (error) {
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private generateId(): string {
    return `id_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private normalizePhone(phone: string): string {
    // Remove all non-numeric characters except leading +
    return phone.replace(/[^\d+]/g, '');
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
      actorType: actorId === 'system' ? 'system' : 'user',
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
    await this.eventBus.publish(`identity.${type}`, tenantId, {
      type,
      timestamp: new Date().toISOString(),
      ...data
    });
  }
}
