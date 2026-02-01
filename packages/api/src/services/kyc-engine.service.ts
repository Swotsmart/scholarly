/**
 * KYC Engine Service
 *
 * KYC (Know Your Customer) verification service with provider-based
 * identity verification. Manages verification sessions, credential
 * verification, and provider orchestration through a ProviderRegistry.
 *
 * Supports:
 * - Multi-provider verification with automatic failover
 * - Verification session lifecycle management
 * - Credential verification and lifecycle tracking
 * - Provider health monitoring
 * - Webhook handling for async verification flows
 * - Integration with subscription engine for KYC status checks
 *
 * @version 1.0.0
 */

import {
  KycLevel,
  VerificationSession,
  VerificationCheck,
  VerificationProvider,
  VerificationCheckType,
  VerificationCheckStatus,
  StartVerificationInput,
  AddCredentialInput,
  VerificationResult,
  Credential,
  CredentialType,
  CredentialStatus,
  IdentityRepository,
  VerificationProviderAdapter,
  ProviderConfig,
  ProviderHealth,
  CollectedDocument,
  Identity,
  Jurisdiction,
} from './identity-engine-types';

import {
  Result,
  success,
  failure,
  IdentityError,
  IdentityNotFoundError,
} from './identity-engine.service';

// ============================================================================
// PROVIDER REGISTRY
// ============================================================================

/**
 * Registry for managing verification provider adapters, configurations,
 * and health status. Handles provider selection based on capability,
 * jurisdiction, and health.
 */
export class ProviderRegistry {
  private adapters: Map<VerificationProvider, VerificationProviderAdapter> = new Map();
  private configs: Map<VerificationProvider, ProviderConfig> = new Map();
  private healthStatus: Map<VerificationProvider, ProviderHealth> = new Map();

  registerAdapter(provider: VerificationProvider, adapter: VerificationProviderAdapter): void {
    this.adapters.set(provider, adapter);
  }

  registerConfig(config: ProviderConfig): void {
    this.configs.set(config.provider, config);
  }

  getAdapter(provider: VerificationProvider): VerificationProviderAdapter | undefined {
    return this.adapters.get(provider);
  }

  getConfig(provider: VerificationProvider): ProviderConfig | undefined {
    return this.configs.get(provider);
  }

  getHealthStatus(provider: VerificationProvider): ProviderHealth | undefined {
    return this.healthStatus.get(provider);
  }

  updateHealthStatus(provider: VerificationProvider, health: ProviderHealth): void {
    this.healthStatus.set(provider, health);
  }

  getEnabledProviders(): VerificationProvider[] {
    return Array.from(this.configs.entries())
      .filter(([_, config]) => config.isEnabled)
      .sort((a, b) => a[1].priority - b[1].priority)
      .map(([provider]) => provider);
  }

  findProviderForCheck(checkType: VerificationCheckType, jurisdiction?: Jurisdiction): VerificationProvider | null {
    const enabled = this.getEnabledProviders();
    for (const provider of enabled) {
      const config = this.configs.get(provider);
      if (!config) continue;
      if (config.supportedChecks.includes(checkType)) {
        if (!jurisdiction || config.supportedJurisdictions.includes(jurisdiction)) {
          const health = this.healthStatus.get(provider);
          if (!health || health.status !== 'down') {
            return provider;
          }
        }
      }
    }
    return null;
  }

  findProviderForCredential(credentialType: CredentialType, jurisdiction?: Jurisdiction): VerificationProvider | null {
    const enabled = this.getEnabledProviders();
    for (const provider of enabled) {
      const config = this.configs.get(provider);
      if (!config) continue;
      if (config.supportedCredentials.includes(credentialType)) {
        if (!jurisdiction || config.supportedJurisdictions.includes(jurisdiction)) {
          const health = this.healthStatus.get(provider);
          if (!health || health.status !== 'down') {
            return provider;
          }
        }
      }
    }
    return null;
  }

  async checkAllHealth(): Promise<Map<VerificationProvider, ProviderHealth>> {
    for (const [provider, adapter] of this.adapters.entries()) {
      try {
        const health = await adapter.healthCheck();
        this.healthStatus.set(provider, health);
      } catch {
        this.healthStatus.set(provider, {
          provider,
          status: 'down',
          lastChecked: new Date(),
          lastError: 'Health check failed'
        });
      }
    }
    return this.healthStatus;
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

export interface KycServiceConfig {
  /** Platform identifier */
  platformId: string;

  /** Session expiry in minutes */
  sessionExpiryMinutes: number;

  /** Maximum provider retries before failing */
  maxProviderRetries: number;

  /** Whether to auto-verify basic contacts (email/phone) */
  autoVerifyBasicContacts: boolean;
}

const DEFAULT_KYC_CONFIG: KycServiceConfig = {
  platformId: 'platform',
  sessionExpiryMinutes: 60,
  maxProviderRetries: 2,
  autoVerifyBasicContacts: false,
};

// ============================================================================
// SERVICE
// ============================================================================

export class KycService {
  private config: KycServiceConfig;

  constructor(
    private repo: IdentityRepository,
    private providers: ProviderRegistry,
    private eventBus: EventBus,
    private logger: Logger,
    config?: Partial<KycServiceConfig>
  ) {
    this.config = { ...DEFAULT_KYC_CONFIG, ...config };
  }

  // ==========================================================================
  // VERIFICATION SESSIONS
  // ==========================================================================

  /**
   * Start a verification session with an appropriate provider
   */
  async startVerification(
    tenantId: string,
    identityId: string,
    input: StartVerificationInput
  ): Promise<Result<VerificationSession>> {
    try {
      this.logger.info('Starting verification session', {
        tenantId,
        identityId,
        targetLevel: input.targetLevel,
      });

      // Look up the identity
      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      // Already at or above the target level
      if (identity.kycLevel >= input.targetLevel) {
        return failure(new IdentityError(
          `Identity already at KYC level ${identity.kycLevel}, target is ${input.targetLevel}`,
          'ALREADY_VERIFIED'
        ));
      }

      // Select a provider
      const provider = this.selectProvider(input);
      if (!provider) {
        return failure(new IdentityError(
          'No suitable verification provider available',
          'NO_PROVIDER_AVAILABLE'
        ));
      }

      const adapter = this.providers.getAdapter(provider);
      if (!adapter) {
        return failure(new IdentityError(
          `Provider adapter not found for ${provider}`,
          'PROVIDER_ADAPTER_MISSING'
        ));
      }

      // Create session with the provider
      let externalSession: { externalSessionId: string; verificationUrl?: string };
      let retries = 0;
      while (true) {
        try {
          externalSession = await adapter.createSession(identity, input);
          break;
        } catch (err) {
          retries++;
          if (retries > this.config.maxProviderRetries) {
            this.logger.error('Provider session creation failed after retries', err as Error, {
              provider,
              retries,
            });
            return failure(new IdentityError(
              'Verification provider unavailable after retries',
              'PROVIDER_UNAVAILABLE'
            ));
          }
          this.logger.warn('Provider session creation retry', { provider, attempt: retries });
        }
      }

      const expiresAt = new Date(Date.now() + this.config.sessionExpiryMinutes * 60 * 1000);

      // Persist the session
      const session = await this.repo.createSession({
        identityId,
        tenantId,
        verificationType: 'kyc',
        targetLevel: input.targetLevel,
        provider,
        externalSessionId: externalSession.externalSessionId,
        verificationUrl: externalSession.verificationUrl,
        status: 'created',
        checks: [],
        documents: [],
        expiresAt,
        webhookUrl: input.webhookUrl,
        metadata: input.metadata,
      });

      await this.audit('verification', session.id, 'session_created', tenantId, 'system', {
        identityId,
        provider,
        targetLevel: input.targetLevel,
      });

      await this.publishEvent('kyc.session_created', tenantId, {
        sessionId: session.id,
        identityId,
        provider,
        targetLevel: input.targetLevel,
      });

      this.logger.info('Verification session created', {
        sessionId: session.id,
        provider,
      });

      return success(session);
    } catch (error) {
      this.logger.error('Failed to start verification', error as Error, {
        tenantId,
        identityId,
      });
      return failure(error as Error);
    }
  }

  /**
   * Get a verification session by ID
   */
  async getSession(
    tenantId: string,
    sessionId: string
  ): Promise<Result<VerificationSession>> {
    try {
      const session = await this.repo.getSession(sessionId);
      if (!session) {
        return failure(new IdentityError(
          `Verification session not found: ${sessionId}`,
          'SESSION_NOT_FOUND'
        ));
      }

      if (session.tenantId !== tenantId) {
        return failure(new IdentityError(
          'Session does not belong to this tenant',
          'TENANT_MISMATCH'
        ));
      }

      // If the session is still in progress, poll the provider for updates
      if (session.status === 'created' || session.status === 'in_progress') {
        // Check expiry
        if (new Date() > session.expiresAt) {
          const expired = await this.repo.updateSession(sessionId, {
            status: 'expired',
          });
          return success(expired);
        }

        // Poll provider
        const adapter = this.providers.getAdapter(session.provider);
        if (adapter && session.externalSessionId) {
          try {
            const providerStatus = await adapter.getSessionStatus(session.externalSessionId);
            if (providerStatus.status !== session.status) {
              const updated = await this.repo.updateSession(sessionId, {
                status: providerStatus.status,
                checks: providerStatus.checks,
                result: providerStatus.result,
                completedAt: providerStatus.status === 'completed' || providerStatus.status === 'failed'
                  ? new Date()
                  : undefined,
              });

              if (providerStatus.status === 'completed' && providerStatus.result) {
                await this.handleVerificationComplete(updated, providerStatus.result);
              }

              return success(updated);
            }
          } catch (err) {
            this.logger.warn('Failed to poll provider for session status', {
              sessionId,
              provider: session.provider,
            });
          }
        }
      }

      return success(session);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Handle a webhook callback from a verification provider
   */
  async handleProviderWebhook(
    provider: VerificationProvider,
    payload: any,
    signature: string
  ): Promise<Result<{ sessionId: string; event: string }>> {
    try {
      this.logger.info('Handling provider webhook', { provider });

      const adapter = this.providers.getAdapter(provider);
      if (!adapter) {
        return failure(new IdentityError(
          `No adapter registered for provider: ${provider}`,
          'PROVIDER_ADAPTER_MISSING'
        ));
      }

      const webhookResult = await adapter.handleWebhook(payload, signature);

      // Find and update the session
      const session = await this.repo.getSession(webhookResult.sessionId);
      if (!session) {
        this.logger.warn('Webhook received for unknown session', {
          provider,
          sessionId: webhookResult.sessionId,
        });
        return failure(new IdentityError(
          `Session not found for webhook: ${webhookResult.sessionId}`,
          'SESSION_NOT_FOUND'
        ));
      }

      // Get updated status from provider
      if (session.externalSessionId) {
        try {
          const providerStatus = await adapter.getSessionStatus(session.externalSessionId);
          const updated = await this.repo.updateSession(session.id, {
            status: providerStatus.status,
            checks: providerStatus.checks,
            result: providerStatus.result,
            completedAt: providerStatus.status === 'completed' || providerStatus.status === 'failed'
              ? new Date()
              : undefined,
          });

          if (providerStatus.status === 'completed' && providerStatus.result) {
            await this.handleVerificationComplete(updated, providerStatus.result);
          }
        } catch (err) {
          this.logger.error('Failed to fetch provider status after webhook', err as Error, {
            provider,
            sessionId: session.id,
          });
        }
      }

      await this.publishEvent('kyc.webhook_received', session.tenantId, {
        sessionId: session.id,
        provider,
        event: webhookResult.event,
      });

      return success({
        sessionId: session.id,
        event: webhookResult.event,
      });
    } catch (error) {
      this.logger.error('Failed to handle provider webhook', error as Error, { provider });
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // CREDENTIAL MANAGEMENT
  // ==========================================================================

  /**
   * Add and verify a credential for an identity
   */
  async addCredential(
    tenantId: string,
    identityId: string,
    input: AddCredentialInput
  ): Promise<Result<Credential>> {
    try {
      this.logger.info('Adding credential', {
        tenantId,
        identityId,
        type: input.type,
      });

      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      // Check for duplicate credential
      const existing = await this.repo.getCredentialByType(identityId, input.type);
      if (existing && existing.status === CredentialStatus.VALID) {
        return failure(new IdentityError(
          `Valid credential of type ${input.type} already exists`,
          'DUPLICATE_CREDENTIAL'
        ));
      }

      // Find a provider to verify this credential
      const provider = this.providers.findProviderForCredential(input.type, input.jurisdiction);
      let verificationResult: {
        status: CredentialStatus;
        verifiedData?: Record<string, any>;
        expiresAt?: Date;
      } | null = null;

      if (provider) {
        const adapter = this.providers.getAdapter(provider);
        if (adapter) {
          try {
            verificationResult = await adapter.verifyCredential(input);
          } catch (err) {
            this.logger.warn('Credential verification with provider failed', {
              provider,
              credentialType: input.type,
            });
          }
        }
      }

      const credential = await this.repo.addCredential({
        identityId,
        tenantId,
        type: input.type,
        status: verificationResult?.status ?? CredentialStatus.PENDING,
        credentialNumber: input.credentialNumber,
        issuer: input.issuer || 'unknown',
        jurisdiction: input.jurisdiction,
        issuedAt: input.issuedAt,
        expiresAt: verificationResult?.expiresAt ?? input.expiresAt,
        lastVerifiedAt: verificationResult ? new Date() : undefined,
        verificationProvider: provider,
        verificationMethod: input.verificationMethod || 'api',
        documentId: input.documentId,
        credentialData: verificationResult?.verifiedData,
      });

      await this.audit('credential', credential.id, 'credential_added', tenantId, 'user', {
        identityId,
        credentialType: input.type,
        status: credential.status,
        provider,
      });

      await this.publishEvent('kyc.credential_added', tenantId, {
        identityId,
        credentialId: credential.id,
        credentialType: input.type,
        status: credential.status,
      });

      this.logger.info('Credential added', {
        credentialId: credential.id,
        status: credential.status,
      });

      return success(credential);
    } catch (error) {
      this.logger.error('Failed to add credential', error as Error, {
        tenantId,
        identityId,
      });
      return failure(error as Error);
    }
  }

  /**
   * Re-verify an existing credential
   */
  async verifyCredential(
    tenantId: string,
    identityId: string,
    credentialId: string
  ): Promise<Result<Credential>> {
    try {
      this.logger.info('Re-verifying credential', {
        tenantId,
        identityId,
        credentialId,
      });

      const identity = await this.repo.findById(tenantId, identityId);
      if (!identity) {
        return failure(new IdentityNotFoundError(identityId));
      }

      const credential = await this.repo.getCredential(identityId, credentialId);
      if (!credential) {
        return failure(new IdentityError(
          `Credential not found: ${credentialId}`,
          'CREDENTIAL_NOT_FOUND'
        ));
      }

      // Find an appropriate provider
      const provider = this.providers.findProviderForCredential(
        credential.type,
        credential.jurisdiction
      );

      if (!provider) {
        return failure(new IdentityError(
          'No verification provider available for this credential type',
          'NO_PROVIDER_AVAILABLE'
        ));
      }

      const adapter = this.providers.getAdapter(provider);
      if (!adapter) {
        return failure(new IdentityError(
          `Provider adapter not found for ${provider}`,
          'PROVIDER_ADAPTER_MISSING'
        ));
      }

      // Mark as verifying
      await this.repo.updateCredential(credentialId, {
        status: CredentialStatus.VERIFYING,
      });

      try {
        const result = await adapter.verifyCredential({
          type: credential.type,
          credentialNumber: credential.credentialNumber || '',
          jurisdiction: credential.jurisdiction,
          issuedAt: credential.issuedAt,
          expiresAt: credential.expiresAt,
        });

        const updated = await this.repo.updateCredential(credentialId, {
          status: result.status,
          lastVerifiedAt: new Date(),
          verificationProvider: provider,
          credentialData: result.verifiedData ?? credential.credentialData,
          expiresAt: result.expiresAt ?? credential.expiresAt,
        });

        await this.audit('credential', credentialId, 'credential_reverified', tenantId, 'system', {
          identityId,
          status: result.status,
          provider,
        });

        await this.publishEvent('kyc.credential_verified', tenantId, {
          identityId,
          credentialId,
          credentialType: credential.type,
          status: result.status,
        });

        return success(updated);
      } catch (err) {
        // Mark as unverifiable if the provider call fails
        const updated = await this.repo.updateCredential(credentialId, {
          status: CredentialStatus.UNVERIFIABLE,
        });

        this.logger.error('Credential verification with provider failed', err as Error, {
          credentialId,
          provider,
        });

        return success(updated);
      }
    } catch (error) {
      this.logger.error('Failed to re-verify credential', error as Error, {
        tenantId,
        identityId,
        credentialId,
      });
      return failure(error as Error);
    }
  }

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

  // ==========================================================================
  // KYC STATUS & INTEGRATION
  // ==========================================================================

  /**
   * Get a user's current KYC status (for subscription engine integration)
   */
  async getUserKycStatus(
    tenantId: string,
    userId: string
  ): Promise<Result<{
    kycLevel: KycLevel;
    isVerified: boolean;
    hasValidCredentials: boolean;
    missingForNextLevel: string[];
  }>> {
    try {
      const identity = await this.repo.findByUserId(tenantId, userId);
      if (!identity) {
        return success({
          kycLevel: KycLevel.NONE,
          isVerified: false,
          hasValidCredentials: false,
          missingForNextLevel: ['Create an identity and verify email'],
        });
      }

      const hasValidCredentials = identity.credentials.some(
        c => c.status === CredentialStatus.VALID
      );

      const missingForNextLevel = this.getMissingForNextLevel(identity);

      return success({
        kycLevel: identity.kycLevel,
        isVerified: identity.kycLevel >= KycLevel.STANDARD,
        hasValidCredentials,
        missingForNextLevel,
      });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Check which of the required credential types are missing for a user
   */
  async getMissingCredentials(
    tenantId: string,
    userId: string,
    required: CredentialType[]
  ): Promise<Result<{
    missing: CredentialType[];
    expired: CredentialType[];
    valid: CredentialType[];
  }>> {
    try {
      const identity = await this.repo.findByUserId(tenantId, userId);
      if (!identity) {
        return success({
          missing: required,
          expired: [],
          valid: [],
        });
      }

      const missing: CredentialType[] = [];
      const expired: CredentialType[] = [];
      const valid: CredentialType[] = [];

      for (const requiredType of required) {
        const credential = identity.credentials.find(c => c.type === requiredType);
        if (!credential) {
          missing.push(requiredType);
        } else if (credential.status === CredentialStatus.EXPIRED) {
          expired.push(requiredType);
        } else if (credential.status === CredentialStatus.VALID) {
          valid.push(requiredType);
        } else {
          // Pending, verifying, failed, revoked, etc. - treat as missing
          missing.push(requiredType);
        }
      }

      return success({ missing, expired, valid });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get expired credentials for a user
   */
  async getExpiredCredentials(
    tenantId: string,
    userId: string
  ): Promise<Result<Credential[]>> {
    try {
      const identity = await this.repo.findByUserId(tenantId, userId);
      if (!identity) {
        return success([]);
      }

      const now = new Date();
      const expired = identity.credentials.filter(
        c => c.status === CredentialStatus.EXPIRED ||
          (c.expiresAt && c.expiresAt < now && c.status === CredentialStatus.VALID)
      );

      return success(expired);
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Get a verification URL for a user to complete the given KYC level
   */
  async getVerificationUrl(
    tenantId: string,
    userId: string,
    requiredLevel: KycLevel
  ): Promise<Result<{ url: string; sessionId: string } | null>> {
    try {
      const identity = await this.repo.findByUserId(tenantId, userId);
      if (!identity) {
        return failure(new IdentityNotFoundError(`userId:${userId}`));
      }

      if (identity.kycLevel >= requiredLevel) {
        return success(null); // Already verified to this level
      }

      // Start a new verification session
      const sessionResult = await this.startVerification(tenantId, identity.id, {
        targetLevel: requiredLevel,
      });

      if (!sessionResult.success) {
        return failure((sessionResult as { success: false; error: any }).error);
      }

      const session = (sessionResult as { success: true; data: VerificationSession }).data;

      if (!session.verificationUrl) {
        return failure(new IdentityError(
          'Provider did not return a verification URL',
          'NO_VERIFICATION_URL'
        ));
      }

      return success({
        url: session.verificationUrl,
        sessionId: session.id,
      });
    } catch (error) {
      return failure(error as Error);
    }
  }

  /**
   * Check for credentials that will expire within the given number of days.
   * Used for batch processing / cron jobs.
   */
  async checkExpiringCredentials(
    withinDays: number
  ): Promise<Result<Credential[]>> {
    try {
      this.logger.info('Checking for expiring credentials', { withinDays });

      const expiring = await this.repo.getExpiringCredentials(withinDays);

      for (const credential of expiring) {
        await this.publishEvent('kyc.credential_expiring', credential.tenantId, {
          identityId: credential.identityId,
          credentialId: credential.id,
          credentialType: credential.type,
          expiresAt: credential.expiresAt?.toISOString(),
          daysRemaining: credential.expiresAt
            ? Math.ceil((credential.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
            : 0,
        });
      }

      this.logger.info('Expiring credentials check complete', {
        count: expiring.length,
        withinDays,
      });

      return success(expiring);
    } catch (error) {
      this.logger.error('Failed to check expiring credentials', error as Error);
      return failure(error as Error);
    }
  }

  // ==========================================================================
  // PRIVATE HELPERS
  // ==========================================================================

  /**
   * Select the best provider for a verification request
   */
  private selectProvider(input: StartVerificationInput): VerificationProvider | null {
    // Honour preferred provider if specified and available
    if (input.preferredProvider) {
      const config = this.providers.getConfig(input.preferredProvider);
      if (config && config.isEnabled) {
        const health = this.providers.getHealthStatus(input.preferredProvider);
        if (!health || health.status !== 'down') {
          return input.preferredProvider;
        }
      }
    }

    // Determine the primary check type based on target level
    let primaryCheckType: VerificationCheckType;
    switch (input.targetLevel) {
      case KycLevel.BASIC:
        primaryCheckType = VerificationCheckType.EMAIL;
        break;
      case KycLevel.STANDARD:
        primaryCheckType = VerificationCheckType.DOCUMENT;
        break;
      case KycLevel.ENHANCED:
        primaryCheckType = VerificationCheckType.CREDENTIAL_VALIDITY;
        break;
      default:
        primaryCheckType = VerificationCheckType.DOCUMENT;
    }

    // If specific checks are requested, use the first one
    if (input.requiredChecks && input.requiredChecks.length > 0) {
      primaryCheckType = input.requiredChecks[0];
    }

    return this.providers.findProviderForCheck(primaryCheckType);
  }

  /**
   * Handle the completion of a verification session
   */
  private async handleVerificationComplete(
    session: VerificationSession,
    result: VerificationResult
  ): Promise<void> {
    try {
      if (result.outcome === 'approved' && result.achievedLevel !== undefined) {
        const identity = await this.repo.findById(session.tenantId, session.identityId);
        if (identity && result.achievedLevel > identity.kycLevel) {
          await this.repo.update(identity.id, {
            kycLevel: result.achievedLevel,
            lastVerifiedAt: new Date(),
          });

          await this.publishEvent('kyc.level_upgraded', session.tenantId, {
            identityId: identity.id,
            previousLevel: identity.kycLevel,
            newLevel: result.achievedLevel,
            sessionId: session.id,
          });
        }
      }

      await this.publishEvent('kyc.verification_complete', session.tenantId, {
        sessionId: session.id,
        identityId: session.identityId,
        outcome: result.outcome,
        achievedLevel: result.achievedLevel,
        confidenceScore: result.confidenceScore,
      });
    } catch (err) {
      this.logger.error('Failed to handle verification completion', err as Error, {
        sessionId: session.id,
      });
    }
  }

  /**
   * Determine what is missing for the next KYC level
   */
  private getMissingForNextLevel(identity: Identity): string[] {
    const missing: string[] = [];

    switch (identity.kycLevel) {
      case KycLevel.NONE:
        if (!identity.contacts.some(c => c.type === 'email' && c.isVerified)) {
          missing.push('Verify email address');
        }
        break;

      case KycLevel.BASIC:
        if (!identity.profile.isVerified) {
          missing.push('Complete identity verification with government ID');
        }
        break;

      case KycLevel.STANDARD:
        if (!identity.credentials.some(c => c.status === CredentialStatus.VALID)) {
          missing.push('Add and verify a professional credential (e.g., WWCC)');
        }
        break;

      case KycLevel.ENHANCED:
        missing.push('Maximum individual verification level achieved');
        break;
    }

    return missing;
  }

  private generateId(): string {
    return `kyc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
      timestamp: new Date(),
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
      ...data,
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let kycServiceInstance: KycService | null = null;

export function initializeKycService(
  repo: IdentityRepository,
  providers: ProviderRegistry,
  eventBus: EventBus,
  logger: Logger,
  config?: Partial<KycServiceConfig>
): KycService {
  kycServiceInstance = new KycService(repo, providers, eventBus, logger, config);
  return kycServiceInstance;
}

export function getKycService(): KycService {
  if (!kycServiceInstance) {
    throw new Error('KycService not initialized. Call initializeKycService first.');
  }
  return kycServiceInstance;
}
