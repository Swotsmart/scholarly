/**
 * Scholarly WWCC Verification Service
 *
 * Working With Children Check verification service for Australian states.
 * Integrates with state registry APIs where available, with fallback to
 * manual verification for states without API access.
 *
 * Supported States:
 * - NSW: Office of the Children's Guardian API (real-time)
 * - VIC: Working with Children Check Unit API (employer portal)
 * - QLD: Blue Card Services API (organisation portal)
 * - WA, SA, TAS, NT, ACT: Manual verification with document upload
 *
 * @module WWCCVerificationService
 * @version 1.0.0
 */

import { log } from '../lib/logger';
import {
  Result,
  success,
  failure,
  ScholarlyBaseService,
} from './base.service';

// ============================================================================
// TYPES
// ============================================================================

export type AustralianState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT';
export type WWCCCardType = 'employee' | 'volunteer' | 'both';
export type WWCCStatus = 'pending' | 'checking' | 'verified' | 'failed' | 'expired' | 'revoked' | 'barred' | 'not_found';
export type RegistryStatus = 'current' | 'expired' | 'barred' | 'cancelled' | 'suspended' | 'not_found' | 'unknown';

export interface WWCCConfig {
  // NSW Office of the Children's Guardian
  nsw?: {
    apiKey: string;
    apiSecret?: string;
    baseUrl?: string;
    employerNumber?: string; // Required for employer verification
  };
  // VIC Working with Children Check Unit
  vic?: {
    apiKey: string;
    organisationId: string;
    baseUrl?: string;
  };
  // QLD Blue Card Services
  qld?: {
    apiKey: string;
    organisationId: string;
    baseUrl?: string;
  };
  // Enable background monitoring
  enableMonitoring?: boolean;
  monitoringIntervalDays?: number;
  // Alert thresholds
  expiryWarningDays?: number;
}

export interface WWCCVerificationRequest {
  userId: string;
  tenantId: string;
  wwccNumber: string;
  state: AustralianState;
  cardType?: WWCCCardType;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  // Optional employer registration for some states
  employerNumber?: string;
  organisationName?: string;
}

export interface WWCCVerificationResult {
  id: string;
  userId: string;
  wwccNumber: string;
  state: AustralianState;
  status: WWCCStatus;
  registryStatus?: RegistryStatus;

  // Verified holder details
  holder?: {
    firstName?: string;
    lastName?: string;
    dateOfBirth?: Date;
  };

  // Card details
  cardType?: WWCCCardType;
  issuedAt?: Date;
  expiresAt?: Date;

  // Verification metadata
  verificationMethod: 'api_check' | 'employer_portal' | 'manual_check' | 'document_upload';
  verifiedAt?: Date;
  lastCheckedAt?: Date;

  // Failure details
  failure?: {
    code: string;
    message: string;
    details?: string;
  };
}

export interface WWCCMonitoringAlert {
  userId: string;
  wwccNumber: string;
  state: AustralianState;
  alertType: 'status_change' | 'expiring' | 'expired' | 'revoked';
  previousStatus?: RegistryStatus;
  newStatus?: RegistryStatus;
  expiresAt?: Date;
  daysUntilExpiry?: number;
  timestamp: Date;
}

// ============================================================================
// STATE REGISTRY ADAPTERS
// ============================================================================

interface StateRegistryAdapter {
  readonly state: AustralianState;
  readonly hasApiAccess: boolean;

  verifyWWCC(request: WWCCVerificationRequest): Promise<Result<WWCCVerificationResult>>;
  checkStatus(wwccNumber: string): Promise<Result<{ status: RegistryStatus; expiresAt?: Date }>>;
}

/**
 * NSW Office of the Children's Guardian Registry Adapter
 * Real-time API verification available
 */
class NSWRegistryAdapter implements StateRegistryAdapter {
  readonly state: AustralianState = 'NSW';
  readonly hasApiAccess = true;

  private config: NonNullable<WWCCConfig['nsw']>;
  private baseUrl: string;

  constructor(config: NonNullable<WWCCConfig['nsw']>) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.kidsguardian.nsw.gov.au/v1';
  }

  async verifyWWCC(request: WWCCVerificationRequest): Promise<Result<WWCCVerificationResult>> {
    try {
      // NSW OCG API endpoint for employer verification
      const response = await fetch(`${this.baseUrl}/wwcc/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Employer-Number': this.config.employerNumber || '',
        },
        body: JSON.stringify({
          wwcc_number: request.wwccNumber,
          first_name: request.firstName,
          last_name: request.lastName,
          date_of_birth: request.dateOfBirth.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        if (response.status === 404) {
          return success({
            id: this.generateId(),
            userId: request.userId,
            wwccNumber: request.wwccNumber,
            state: 'NSW',
            status: 'not_found',
            verificationMethod: 'api_check',
            lastCheckedAt: new Date(),
            failure: {
              code: 'NOT_FOUND',
              message: 'WWCC number not found in NSW registry',
            },
          });
        }

        return failure({
          code: 'API_ERROR',
          message: `NSW registry API error: ${response.statusText}`,
          details: error,
        });
      }

      const data = await response.json();

      return success({
        id: this.generateId(),
        userId: request.userId,
        wwccNumber: request.wwccNumber,
        state: 'NSW',
        status: this.mapRegistryStatus(data.status),
        registryStatus: data.status,
        holder: {
          firstName: data.first_name,
          lastName: data.last_name,
          dateOfBirth: data.date_of_birth ? new Date(data.date_of_birth) : undefined,
        },
        cardType: data.card_type,
        issuedAt: data.issue_date ? new Date(data.issue_date) : undefined,
        expiresAt: data.expiry_date ? new Date(data.expiry_date) : undefined,
        verificationMethod: 'api_check',
        verifiedAt: new Date(),
        lastCheckedAt: new Date(),
      });
    } catch (error) {
      log.error('NSW WWCC verification failed', error as Error);
      return failure({
        code: 'VERIFICATION_ERROR',
        message: `NSW verification failed: ${(error as Error).message}`,
      });
    }
  }

  async checkStatus(wwccNumber: string): Promise<Result<{ status: RegistryStatus; expiresAt?: Date }>> {
    try {
      const response = await fetch(`${this.baseUrl}/wwcc/status/${wwccNumber}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Employer-Number': this.config.employerNumber || '',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return success({ status: 'not_found' });
        }
        return failure({
          code: 'API_ERROR',
          message: `NSW status check failed: ${response.statusText}`,
        });
      }

      const data = await response.json();

      return success({
        status: data.status as RegistryStatus,
        expiresAt: data.expiry_date ? new Date(data.expiry_date) : undefined,
      });
    } catch (error) {
      return failure({
        code: 'STATUS_CHECK_ERROR',
        message: `NSW status check failed: ${(error as Error).message}`,
      });
    }
  }

  private mapRegistryStatus(status: string): WWCCStatus {
    const mapping: Record<string, WWCCStatus> = {
      'current': 'verified',
      'cleared': 'verified',
      'expired': 'expired',
      'barred': 'barred',
      'cancelled': 'revoked',
      'suspended': 'revoked',
    };
    return mapping[status.toLowerCase()] || 'failed';
  }

  private generateId(): string {
    return `wwcc_nsw_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * VIC Working with Children Check Unit Registry Adapter
 * Employer portal API available
 */
class VICRegistryAdapter implements StateRegistryAdapter {
  readonly state: AustralianState = 'VIC';
  readonly hasApiAccess = true;

  private config: NonNullable<WWCCConfig['vic']>;
  private baseUrl: string;

  constructor(config: NonNullable<WWCCConfig['vic']>) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://online.justice.vic.gov.au/wwcc/api/v1';
  }

  async verifyWWCC(request: WWCCVerificationRequest): Promise<Result<WWCCVerificationResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Organisation-Id': this.config.organisationId,
        },
        body: JSON.stringify({
          application_number: request.wwccNumber,
          family_name: request.lastName,
          given_name: request.firstName,
          date_of_birth: request.dateOfBirth.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        if (response.status === 404 || response.status === 400) {
          return success({
            id: this.generateId(),
            userId: request.userId,
            wwccNumber: request.wwccNumber,
            state: 'VIC',
            status: 'not_found',
            verificationMethod: 'employer_portal',
            lastCheckedAt: new Date(),
            failure: {
              code: 'NOT_FOUND',
              message: 'WWCC number not found or details do not match',
            },
          });
        }

        return failure({
          code: 'API_ERROR',
          message: `VIC registry API error: ${response.statusText}`,
          details: error,
        });
      }

      const data = await response.json();

      return success({
        id: this.generateId(),
        userId: request.userId,
        wwccNumber: request.wwccNumber,
        state: 'VIC',
        status: this.mapStatus(data.status),
        registryStatus: data.status,
        holder: {
          firstName: data.given_name,
          lastName: data.family_name,
        },
        cardType: data.card_category?.toLowerCase() as WWCCCardType,
        expiresAt: data.expiry_date ? new Date(data.expiry_date) : undefined,
        verificationMethod: 'employer_portal',
        verifiedAt: new Date(),
        lastCheckedAt: new Date(),
      });
    } catch (error) {
      log.error('VIC WWCC verification failed', error as Error);
      return failure({
        code: 'VERIFICATION_ERROR',
        message: `VIC verification failed: ${(error as Error).message}`,
      });
    }
  }

  async checkStatus(wwccNumber: string): Promise<Result<{ status: RegistryStatus; expiresAt?: Date }>> {
    try {
      const response = await fetch(`${this.baseUrl}/status/${wwccNumber}`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Organisation-Id': this.config.organisationId,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return success({ status: 'not_found' });
        }
        return failure({
          code: 'API_ERROR',
          message: `VIC status check failed: ${response.statusText}`,
        });
      }

      const data = await response.json();

      return success({
        status: data.status as RegistryStatus,
        expiresAt: data.expiry_date ? new Date(data.expiry_date) : undefined,
      });
    } catch (error) {
      return failure({
        code: 'STATUS_CHECK_ERROR',
        message: `VIC status check failed: ${(error as Error).message}`,
      });
    }
  }

  private mapStatus(status: string): WWCCStatus {
    const mapping: Record<string, WWCCStatus> = {
      'current': 'verified',
      'valid': 'verified',
      'expired': 'expired',
      'negative_notice': 'barred',
      'revoked': 'revoked',
    };
    return mapping[status.toLowerCase()] || 'failed';
  }

  private generateId(): string {
    return `wwcc_vic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * QLD Blue Card Services Registry Adapter
 * Organisation portal API available
 */
class QLDRegistryAdapter implements StateRegistryAdapter {
  readonly state: AustralianState = 'QLD';
  readonly hasApiAccess = true;

  private config: NonNullable<WWCCConfig['qld']>;
  private baseUrl: string;

  constructor(config: NonNullable<WWCCConfig['qld']>) {
    this.config = config;
    this.baseUrl = config.baseUrl || 'https://api.bluecard.qld.gov.au/v1';
  }

  async verifyWWCC(request: WWCCVerificationRequest): Promise<Result<WWCCVerificationResult>> {
    try {
      const response = await fetch(`${this.baseUrl}/cards/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
          'X-Organisation-Id': this.config.organisationId,
        },
        body: JSON.stringify({
          card_number: request.wwccNumber,
          surname: request.lastName,
          given_names: request.firstName,
          date_of_birth: request.dateOfBirth.toISOString().split('T')[0],
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));

        if (response.status === 404) {
          return success({
            id: this.generateId(),
            userId: request.userId,
            wwccNumber: request.wwccNumber,
            state: 'QLD',
            status: 'not_found',
            verificationMethod: 'api_check',
            lastCheckedAt: new Date(),
            failure: {
              code: 'NOT_FOUND',
              message: 'Blue Card number not found in QLD registry',
            },
          });
        }

        return failure({
          code: 'API_ERROR',
          message: `QLD registry API error: ${response.statusText}`,
          details: error,
        });
      }

      const data = await response.json();

      return success({
        id: this.generateId(),
        userId: request.userId,
        wwccNumber: request.wwccNumber,
        state: 'QLD',
        status: this.mapStatus(data.status),
        registryStatus: data.status,
        holder: {
          firstName: data.given_names,
          lastName: data.surname,
        },
        cardType: data.card_type?.toLowerCase() as WWCCCardType,
        issuedAt: data.issue_date ? new Date(data.issue_date) : undefined,
        expiresAt: data.expiry_date ? new Date(data.expiry_date) : undefined,
        verificationMethod: 'api_check',
        verifiedAt: new Date(),
        lastCheckedAt: new Date(),
      });
    } catch (error) {
      log.error('QLD Blue Card verification failed', error as Error);
      return failure({
        code: 'VERIFICATION_ERROR',
        message: `QLD verification failed: ${(error as Error).message}`,
      });
    }
  }

  async checkStatus(wwccNumber: string): Promise<Result<{ status: RegistryStatus; expiresAt?: Date }>> {
    try {
      const response = await fetch(`${this.baseUrl}/cards/${wwccNumber}/status`, {
        headers: {
          'Authorization': `Bearer ${this.config.apiKey}`,
          'X-Organisation-Id': this.config.organisationId,
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return success({ status: 'not_found' });
        }
        return failure({
          code: 'API_ERROR',
          message: `QLD status check failed: ${response.statusText}`,
        });
      }

      const data = await response.json();

      return success({
        status: data.status as RegistryStatus,
        expiresAt: data.expiry_date ? new Date(data.expiry_date) : undefined,
      });
    } catch (error) {
      return failure({
        code: 'STATUS_CHECK_ERROR',
        message: `QLD status check failed: ${(error as Error).message}`,
      });
    }
  }

  private mapStatus(status: string): WWCCStatus {
    const mapping: Record<string, WWCCStatus> = {
      'current': 'verified',
      'positive': 'verified',
      'expired': 'expired',
      'negative': 'barred',
      'cancelled': 'revoked',
      'suspended': 'revoked',
    };
    return mapping[status.toLowerCase()] || 'failed';
  }

  private generateId(): string {
    return `wwcc_qld_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * Manual verification adapter for states without API access
 * (WA, SA, TAS, NT, ACT)
 */
class ManualVerificationAdapter implements StateRegistryAdapter {
  readonly state: AustralianState;
  readonly hasApiAccess = false;

  constructor(state: AustralianState) {
    this.state = state;
  }

  async verifyWWCC(request: WWCCVerificationRequest): Promise<Result<WWCCVerificationResult>> {
    // For states without API, return pending status requiring manual verification
    return success({
      id: this.generateId(),
      userId: request.userId,
      wwccNumber: request.wwccNumber,
      state: this.state,
      status: 'pending',
      holder: {
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
      },
      cardType: request.cardType,
      verificationMethod: 'manual_check',
      lastCheckedAt: new Date(),
    });
  }

  async checkStatus(_wwccNumber: string): Promise<Result<{ status: RegistryStatus; expiresAt?: Date }>> {
    return success({ status: 'unknown' });
  }

  private generateId(): string {
    return `wwcc_${this.state.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface WWCCRepository {
  createVerification(data: {
    tenantId: string;
    userId: string;
    wwccNumber: string;
    state: AustralianState;
    cardType?: WWCCCardType;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    status: WWCCStatus;
    registryStatus?: RegistryStatus;
    verificationMethod: string;
    issuedAt?: Date;
    expiresAt?: Date;
    verifiedAt?: Date;
    employerRegistrationNumber?: string;
    organisationName?: string;
  }): Promise<{ id: string }>;

  updateVerification(id: string, data: Partial<{
    status: WWCCStatus;
    registryStatus: RegistryStatus;
    verifiedAt: Date;
    lastMonitoredAt: Date;
    issuedAt: Date;
    expiresAt: Date;
    failureCode: string;
    failureMessage: string;
    cardFrontUrl: string;
    cardBackUrl: string;
  }>): Promise<void>;

  getVerificationById(id: string): Promise<{
    id: string;
    userId: string;
    tenantId: string;
    wwccNumber: string;
    state: AustralianState;
    status: WWCCStatus;
    registryStatus?: RegistryStatus;
    expiresAt?: Date;
    verifiedAt?: Date;
    monitoringEnabled: boolean;
  } | null>;

  getVerificationByUserAndState(userId: string, state: AustralianState): Promise<{
    id: string;
    status: WWCCStatus;
    verifiedAt?: Date;
    expiresAt?: Date;
  } | null>;

  getVerificationsByUser(userId: string): Promise<Array<{
    id: string;
    wwccNumber: string;
    state: AustralianState;
    status: WWCCStatus;
    verifiedAt?: Date;
    expiresAt?: Date;
  }>>;

  getVerificationsRequiringMonitoring(): Promise<Array<{
    id: string;
    userId: string;
    tenantId: string;
    wwccNumber: string;
    state: AustralianState;
    status: WWCCStatus;
    lastMonitoredAt?: Date;
  }>>;

  getExpiringVerifications(withinDays: number): Promise<Array<{
    id: string;
    userId: string;
    tenantId: string;
    wwccNumber: string;
    state: AustralianState;
    expiresAt: Date;
  }>>;
}

// ============================================================================
// WWCC VERIFICATION SERVICE
// ============================================================================

export class WWCCVerificationService extends ScholarlyBaseService {
  private config: WWCCConfig;
  private adapters: Map<AustralianState, StateRegistryAdapter> = new Map();
  private repository: WWCCRepository;

  constructor(config: WWCCConfig, repository: WWCCRepository) {
    super('WWCCVerificationService');
    this.config = config;
    this.repository = repository;
    this.initializeAdapters();
  }

  private initializeAdapters(): void {
    // NSW - API available
    if (this.config.nsw) {
      this.adapters.set('NSW', new NSWRegistryAdapter(this.config.nsw));
    } else {
      this.adapters.set('NSW', new ManualVerificationAdapter('NSW'));
    }

    // VIC - API available
    if (this.config.vic) {
      this.adapters.set('VIC', new VICRegistryAdapter(this.config.vic));
    } else {
      this.adapters.set('VIC', new ManualVerificationAdapter('VIC'));
    }

    // QLD - API available
    if (this.config.qld) {
      this.adapters.set('QLD', new QLDRegistryAdapter(this.config.qld));
    } else {
      this.adapters.set('QLD', new ManualVerificationAdapter('QLD'));
    }

    // Other states - manual verification only
    const manualStates: AustralianState[] = ['WA', 'SA', 'TAS', 'NT', 'ACT'];
    for (const state of manualStates) {
      this.adapters.set(state, new ManualVerificationAdapter(state));
    }

    log.info('WWCC adapters initialized', {
      states: Array.from(this.adapters.keys()),
      apiEnabled: Array.from(this.adapters.entries())
        .filter(([_, adapter]) => adapter.hasApiAccess)
        .map(([state]) => state),
    });
  }

  private getAdapter(state: AustralianState): StateRegistryAdapter {
    const adapter = this.adapters.get(state);
    if (!adapter) {
      throw new Error(`No adapter available for state: ${state}`);
    }
    return adapter;
  }

  // ==========================================================================
  // PUBLIC METHODS
  // ==========================================================================

  /**
   * Verify a WWCC number
   */
  async verifyWWCC(request: WWCCVerificationRequest): Promise<Result<WWCCVerificationResult>> {
    return this.withTiming('verifyWWCC', async () => {
      const adapter = this.getAdapter(request.state);

      // Check for existing verification
      const existing = await this.repository.getVerificationByUserAndState(
        request.userId,
        request.state
      );

      if (existing && existing.status === 'verified') {
        // Check if still valid
        if (!existing.expiresAt || existing.expiresAt > new Date()) {
          log.info('User already has valid WWCC verification', {
            userId: request.userId,
            state: request.state,
          });
          return success({
            id: existing.id,
            userId: request.userId,
            wwccNumber: request.wwccNumber,
            state: request.state,
            status: 'verified',
            verificationMethod: 'api_check',
            verifiedAt: existing.verifiedAt,
            expiresAt: existing.expiresAt,
          });
        }
      }

      // Perform verification
      const result = await adapter.verifyWWCC(request);

      if (!result.success) {
        return result;
      }

      const verification = result.data;

      // Store in database
      const stored = await this.repository.createVerification({
        tenantId: request.tenantId,
        userId: request.userId,
        wwccNumber: request.wwccNumber,
        state: request.state,
        cardType: request.cardType,
        firstName: request.firstName,
        lastName: request.lastName,
        dateOfBirth: request.dateOfBirth,
        status: verification.status,
        registryStatus: verification.registryStatus,
        verificationMethod: verification.verificationMethod,
        issuedAt: verification.issuedAt,
        expiresAt: verification.expiresAt,
        verifiedAt: verification.verifiedAt,
        employerRegistrationNumber: request.employerNumber,
        organisationName: request.organisationName,
      });

      log.info('WWCC verification completed', {
        id: stored.id,
        userId: request.userId,
        state: request.state,
        status: verification.status,
        method: verification.verificationMethod,
      });

      await this.publishEvent('wwcc.verification_completed', request.userId, {
        verificationId: stored.id,
        state: request.state,
        status: verification.status,
        requiresManualReview: !adapter.hasApiAccess,
      });

      return success({
        ...verification,
        id: stored.id,
      });
    });
  }

  /**
   * Re-check status of an existing verification
   */
  async recheckStatus(verificationId: string): Promise<Result<WWCCVerificationResult>> {
    return this.withTiming('recheckStatus', async () => {
      const verification = await this.repository.getVerificationById(verificationId);

      if (!verification) {
        return failure({
          code: 'NOT_FOUND',
          message: 'Verification not found',
        });
      }

      const adapter = this.getAdapter(verification.state);

      if (!adapter.hasApiAccess) {
        // Can't re-check without API access
        return success({
          id: verification.id,
          userId: verification.userId,
          wwccNumber: verification.wwccNumber,
          state: verification.state,
          status: verification.status,
          verificationMethod: 'manual_check',
          verifiedAt: verification.verifiedAt,
          expiresAt: verification.expiresAt,
        });
      }

      const statusResult = await adapter.checkStatus(verification.wwccNumber);

      if (!statusResult.success) {
        return failure(statusResult.error);
      }

      const newStatus = this.mapRegistryStatusToWWCCStatus(statusResult.data.status);

      // Update if status changed
      if (newStatus !== verification.status) {
        await this.repository.updateVerification(verificationId, {
          status: newStatus,
          registryStatus: statusResult.data.status,
          lastMonitoredAt: new Date(),
          expiresAt: statusResult.data.expiresAt,
        });

        await this.publishEvent('wwcc.status_changed', verification.userId, {
          verificationId,
          previousStatus: verification.status,
          newStatus,
          state: verification.state,
        });

        log.info('WWCC status changed', {
          verificationId,
          previousStatus: verification.status,
          newStatus,
        });
      } else {
        await this.repository.updateVerification(verificationId, {
          lastMonitoredAt: new Date(),
        });
      }

      return success({
        id: verification.id,
        userId: verification.userId,
        wwccNumber: verification.wwccNumber,
        state: verification.state,
        status: newStatus,
        registryStatus: statusResult.data.status,
        verificationMethod: 'api_check',
        verifiedAt: verification.verifiedAt,
        expiresAt: statusResult.data.expiresAt,
        lastCheckedAt: new Date(),
      });
    });
  }

  /**
   * Manually verify a WWCC (for states without API access)
   */
  async manuallyVerify(
    verificationId: string,
    verifierNotes?: string,
    documentUrls?: { front?: string; back?: string }
  ): Promise<Result<void>> {
    return this.withTiming('manuallyVerify', async () => {
      const verification = await this.repository.getVerificationById(verificationId);

      if (!verification) {
        return failure({
          code: 'NOT_FOUND',
          message: 'Verification not found',
        });
      }

      if (verification.status !== 'pending') {
        return failure({
          code: 'INVALID_STATE',
          message: 'Verification is not in pending state',
        });
      }

      await this.repository.updateVerification(verificationId, {
        status: 'verified',
        verifiedAt: new Date(),
        cardFrontUrl: documentUrls?.front,
        cardBackUrl: documentUrls?.back,
      });

      await this.publishEvent('wwcc.manually_verified', verification.userId, {
        verificationId,
        state: verification.state,
        verifierNotes,
      });

      log.info('WWCC manually verified', {
        verificationId,
        userId: verification.userId,
        state: verification.state,
      });

      return success(undefined);
    });
  }

  /**
   * Check if a user has a valid WWCC for any state
   */
  async hasValidWWCC(userId: string): Promise<boolean> {
    const verifications = await this.repository.getVerificationsByUser(userId);
    const now = new Date();

    return verifications.some(v =>
      v.status === 'verified' &&
      (!v.expiresAt || v.expiresAt > now)
    );
  }

  /**
   * Check if a user has a valid WWCC for a specific state
   */
  async hasValidWWCCForState(userId: string, state: AustralianState): Promise<boolean> {
    const verification = await this.repository.getVerificationByUserAndState(userId, state);

    if (!verification) {
      return false;
    }

    const now = new Date();
    return verification.status === 'verified' &&
      (!verification.expiresAt || verification.expiresAt > now);
  }

  /**
   * Get all WWCC verifications for a user
   */
  async getUserVerifications(userId: string): Promise<Array<{
    id: string;
    wwccNumber: string;
    state: AustralianState;
    status: WWCCStatus;
    verifiedAt?: Date;
    expiresAt?: Date;
  }>> {
    return this.repository.getVerificationsByUser(userId);
  }

  /**
   * Run background monitoring for all verified WWCCs
   */
  async runMonitoringCheck(): Promise<{
    checked: number;
    alerts: WWCCMonitoringAlert[];
  }> {
    const verifications = await this.repository.getVerificationsRequiringMonitoring();
    const alerts: WWCCMonitoringAlert[] = [];
    let checked = 0;

    for (const verification of verifications) {
      const adapter = this.getAdapter(verification.state);

      if (!adapter.hasApiAccess) {
        continue;
      }

      try {
        const statusResult = await adapter.checkStatus(verification.wwccNumber);
        checked++;

        if (statusResult.success) {
          const newStatus = this.mapRegistryStatusToWWCCStatus(statusResult.data.status);

          if (newStatus !== verification.status) {
            alerts.push({
              userId: verification.userId,
              wwccNumber: verification.wwccNumber,
              state: verification.state,
              alertType: newStatus === 'revoked' || newStatus === 'barred' ? 'revoked' : 'status_change',
              previousStatus: verification.status as RegistryStatus,
              newStatus: statusResult.data.status,
              timestamp: new Date(),
            });

            await this.repository.updateVerification(verification.id, {
              status: newStatus,
              registryStatus: statusResult.data.status,
              lastMonitoredAt: new Date(),
            });

            await this.publishEvent('wwcc.monitoring_alert', verification.userId, {
              verificationId: verification.id,
              alertType: 'status_change',
              previousStatus: verification.status,
              newStatus,
            });
          } else {
            await this.repository.updateVerification(verification.id, {
              lastMonitoredAt: new Date(),
            });
          }
        }
      } catch (error) {
        log.error('WWCC monitoring check failed', error as Error, {
          verificationId: verification.id,
          state: verification.state,
        });
      }
    }

    log.info('WWCC monitoring check completed', {
      checked,
      alertsGenerated: alerts.length,
    });

    return { checked, alerts };
  }

  /**
   * Check for expiring WWCCs and generate alerts
   */
  async checkExpiringWWCCs(withinDays: number = 30): Promise<WWCCMonitoringAlert[]> {
    const expiring = await this.repository.getExpiringVerifications(withinDays);
    const alerts: WWCCMonitoringAlert[] = [];
    const now = new Date();

    for (const verification of expiring) {
      const daysUntilExpiry = Math.ceil(
        (verification.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const alertType = daysUntilExpiry <= 0 ? 'expired' : 'expiring';

      alerts.push({
        userId: verification.userId,
        wwccNumber: verification.wwccNumber,
        state: verification.state,
        alertType,
        expiresAt: verification.expiresAt,
        daysUntilExpiry,
        timestamp: new Date(),
      });

      await this.publishEvent(`wwcc.${alertType}`, verification.userId, {
        verificationId: verification.id,
        state: verification.state,
        expiresAt: verification.expiresAt.toISOString(),
        daysUntilExpiry,
      });
    }

    log.info('WWCC expiry check completed', {
      expiring: alerts.filter(a => a.alertType === 'expiring').length,
      expired: alerts.filter(a => a.alertType === 'expired').length,
    });

    return alerts;
  }

  /**
   * Get states with API verification available
   */
  getStatesWithApiAccess(): AustralianState[] {
    return Array.from(this.adapters.entries())
      .filter(([_, adapter]) => adapter.hasApiAccess)
      .map(([state]) => state);
  }

  /**
   * Get all supported states
   */
  getSupportedStates(): AustralianState[] {
    return Array.from(this.adapters.keys());
  }

  private mapRegistryStatusToWWCCStatus(status: RegistryStatus): WWCCStatus {
    const mapping: Record<RegistryStatus, WWCCStatus> = {
      'current': 'verified',
      'expired': 'expired',
      'barred': 'barred',
      'cancelled': 'revoked',
      'suspended': 'revoked',
      'not_found': 'not_found',
      'unknown': 'pending',
    };
    return mapping[status] || 'failed';
  }
}

// ============================================================================
// SINGLETON MANAGEMENT
// ============================================================================

let wwccService: WWCCVerificationService | null = null;

export function initializeWWCCService(
  config: WWCCConfig,
  repository: WWCCRepository
): WWCCVerificationService {
  wwccService = new WWCCVerificationService(config, repository);
  return wwccService;
}

export function getWWCCService(): WWCCVerificationService {
  if (!wwccService) {
    throw new Error('WWCC service not initialized. Call initializeWWCCService first.');
  }
  return wwccService;
}
