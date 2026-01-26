/**
 * Verifiable Credentials Service
 * 
 * Phase 1 Foundation: Trust & Identity Layer
 * 
 * ## The Granny Explanation
 * 
 * Think of a Verifiable Credential like a digital version of your physical credentials:
 * your driver's license, university degree, or professional certification. But better!
 * 
 * - A university issues you a digital degree (credential)
 * - You store it in your digital wallet
 * - When an employer asks for proof, you show just what's needed
 * - The employer can instantly verify it's real without calling the university
 * - Even if the university closes down, your credential remains valid
 * 
 * In Scholarly:
 * - Teachers get VCs for their WWCC checks, qualifications, and registrations
 * - Students get VCs for course completions, skill badges, and achievements
 * - Parents can verify a tutor's credentials in seconds
 * - Credentials travel with users to other platforms
 * 
 * ## Architecture
 * 
 * This service implements:
 * - W3C Verifiable Credentials Data Model v2.0
 * - Credential issuance with cryptographic signing
 * - Credential verification and validation
 * - Revocation checking via Status List 2021
 * - Selective disclosure via Presentation Exchange
 * 
 * ## Standards
 * 
 * - VCs: https://www.w3.org/TR/vc-data-model-2.0/
 * - Status List: https://w3c.github.io/vc-status-list-2021/
 * - Presentation Exchange: https://identity.foundation/presentation-exchange/
 * 
 * @module VerifiableCredentialsService
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  EventBus,
  Cache,
  ScholarlyConfig,
  Validator,
  Jurisdiction,
  SafeguardingCheck
} from './types';

import {
  VerifiableCredential,
  VerifiablePresentation,
  CredentialSubject,
  CredentialSubjectType,
  CredentialStatus,
  Proof,
  Evidence,
  SafeguardingCredentialSubject,
  QualificationCredentialSubject,
  SkillCredentialSubject,
  AchievementCredentialSubject,
  PresentationRequest,
  PresentationSubmission,
  InputDescriptor,
  CredentialSchemaEntry,
  CredentialValidationError,
  PresentationError,
  VC_CONTEXTS,
  CREDENTIAL_TYPES,
  PRESENTATION_TYPES
} from './ssi-vc-types';

import { DIDService, CryptoProvider } from './did-service';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface CredentialRepository {
  findById(tenantId: string, id: string): Promise<VerifiableCredential | null>;
  findByHolder(tenantId: string, holderDid: string): Promise<VerifiableCredential[]>;
  findByType(tenantId: string, holderDid: string, type: string): Promise<VerifiableCredential[]>;
  findByIssuer(tenantId: string, issuerDid: string): Promise<VerifiableCredential[]>;
  save(tenantId: string, holderDid: string, credential: VerifiableCredential): Promise<VerifiableCredential>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface RevocationRepository {
  isRevoked(credentialId: string): Promise<boolean>;
  revoke(tenantId: string, credentialId: string, reason: string, revokedBy: string): Promise<void>;
  getStatus(credentialId: string): Promise<{ revoked: boolean; reason?: string; revokedAt?: Date } | null>;
  getStatusList(statusListId: string): Promise<{ encodedList: string; purpose: string } | null>;
  updateStatusList(statusListId: string, encodedList: string): Promise<void>;
}

export interface SchemaRepository {
  findById(id: string): Promise<CredentialSchemaEntry | null>;
  findDefault(credentialType: CredentialSubjectType): Promise<CredentialSchemaEntry | null>;
  findByJurisdiction(credentialType: CredentialSubjectType, jurisdiction: Jurisdiction): Promise<CredentialSchemaEntry[]>;
  save(schema: CredentialSchemaEntry): Promise<CredentialSchemaEntry>;
}

export interface PresentationRepository {
  save(tenantId: string, holderDid: string, presentation: VerifiablePresentation): Promise<VerifiablePresentation>;
  findByHolder(tenantId: string, holderDid: string): Promise<VerifiablePresentation[]>;
  findById(tenantId: string, id: string): Promise<VerifiablePresentation | null>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface VCServiceConfig {
  issuerDid: string;
  issuerName: string;
  statusListBaseUrl: string;
  schemaBaseUrl: string;
  defaultValidityDays: number;
  requireSchemaValidation: boolean;
  supportedProofTypes: string[];
}

// ============================================================================
// ISSUANCE REQUEST TYPES
// ============================================================================

export interface IssueCredentialRequest<T extends CredentialSubject = CredentialSubject> {
  credentialType: CredentialSubjectType;
  subjectDid: string;
  subjectData: Omit<T, 'id'>;
  expirationDate?: Date;
  evidence?: Evidence[];
  schemaId?: string;
  metadata?: Record<string, any>;
}

export interface IssueSafeguardingCredentialRequest extends IssueCredentialRequest<SafeguardingCredentialSubject> {
  credentialType: 'SafeguardingCredential';
  safeguardingCheck: SafeguardingCheck;
}

export interface IssueQualificationCredentialRequest extends IssueCredentialRequest<QualificationCredentialSubject> {
  credentialType: 'QualificationCredential';
}

export interface IssueAchievementCredentialRequest extends IssueCredentialRequest<AchievementCredentialSubject> {
  credentialType: 'AchievementCredential';
}

// ============================================================================
// VERIFICATION TYPES
// ============================================================================

export interface VerificationResult {
  valid: boolean;
  checks: VerificationCheck[];
  warnings: string[];
  errors: string[];
  metadata?: {
    issuer: string;
    issuanceDate: Date;
    expirationDate?: Date;
    credentialTypes: string[];
    subjectId?: string;
  };
}

export interface VerificationCheck {
  check: 'proof' | 'status' | 'schema' | 'issuer' | 'expiration' | 'signature';
  passed: boolean;
  message?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class VerifiableCredentialsService extends ScholarlyBaseService {
  private readonly credentialRepo: CredentialRepository;
  private readonly revocationRepo: RevocationRepository;
  private readonly schemaRepo: SchemaRepository;
  private readonly presentationRepo: PresentationRepository;
  private readonly didService: DIDService;
  private readonly crypto: CryptoProvider;
  private readonly vcConfig: VCServiceConfig;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    credentialRepo: CredentialRepository;
    revocationRepo: RevocationRepository;
    schemaRepo: SchemaRepository;
    presentationRepo: PresentationRepository;
    didService: DIDService;
    crypto: CryptoProvider;
    vcConfig: VCServiceConfig;
  }) {
    super('VerifiableCredentialsService', deps);
    this.credentialRepo = deps.credentialRepo;
    this.revocationRepo = deps.revocationRepo;
    this.schemaRepo = deps.schemaRepo;
    this.presentationRepo = deps.presentationRepo;
    this.didService = deps.didService;
    this.crypto = deps.crypto;
    this.vcConfig = deps.vcConfig;
  }

  // --------------------------------------------------------------------------
  // CREDENTIAL ISSUANCE
  // --------------------------------------------------------------------------

  /**
   * Issue a new Verifiable Credential
   */
  async issueCredential<T extends CredentialSubject>(
    tenantId: string,
    issuerPassphrase: string,
    request: IssueCredentialRequest<T>
  ): Promise<Result<VerifiableCredential>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(issuerPassphrase, 'issuerPassphrase');
      Validator.required(request.credentialType, 'credentialType');
      Validator.required(request.subjectDid, 'subjectDid');
      Validator.required(request.subjectData, 'subjectData');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('issueCredential', tenantId, async () => {
      // Validate subject DID exists
      const subjectResolution = await this.didService.resolveDID(request.subjectDid);
      if (!subjectResolution.success) {
        throw new ValidationError(`Subject DID not resolvable: ${request.subjectDid}`);
      }

      // Get schema
      const schema = await this.getOrValidateSchema(request.credentialType, request.schemaId);
      
      // Validate against schema if required
      if (this.vcConfig.requireSchemaValidation && schema) {
        this.validateAgainstSchema(request.subjectData, schema.schema);
      }

      // Build the credential
      const credentialId = `${this.vcConfig.schemaBaseUrl}/credentials/${this.generateId('vc')}`;
      const now = new Date();
      const expirationDate = request.expirationDate || 
        new Date(now.getTime() + this.vcConfig.defaultValidityDays * 24 * 60 * 60 * 1000);

      const credentialSubject: CredentialSubject = {
        id: request.subjectDid,
        ...request.subjectData
      };

      // Build credential status
      const statusListIndex = await this.getNextStatusListIndex();
      const credentialStatus: CredentialStatus = {
        id: `${this.vcConfig.statusListBaseUrl}/status/${credentialId.split('/').pop()}`,
        type: 'StatusList2021Entry',
        statusPurpose: 'revocation',
        statusListIndex: statusListIndex.toString(),
        statusListCredential: `${this.vcConfig.statusListBaseUrl}/status-list/1`
      };

      // Build unsigned credential
      const credential: VerifiableCredential = {
        '@context': [VC_CONTEXTS.CREDENTIALS_V2, VC_CONTEXTS.SCHOLARLY],
        id: credentialId,
        type: [CREDENTIAL_TYPES.BASE, this.mapCredentialType(request.credentialType)],
        issuer: {
          id: this.vcConfig.issuerDid,
          name: this.vcConfig.issuerName
        },
        issuanceDate: now.toISOString(),
        expirationDate: expirationDate.toISOString(),
        validFrom: now.toISOString(),
        validUntil: expirationDate.toISOString(),
        credentialSubject,
        credentialStatus,
        credentialSchema: schema ? { id: schema.id, type: 'JsonSchema' } : undefined,
        evidence: request.evidence
      };

      // Sign the credential
      const signedCredential = await this.signCredential(tenantId, credential, issuerPassphrase);

      // Save to holder's wallet
      await this.credentialRepo.save(tenantId, request.subjectDid, signedCredential);

      await this.publishEvent('ssi.credential.issued', tenantId, {
        credentialId: signedCredential.id,
        credentialType: request.credentialType,
        subjectDid: request.subjectDid,
        issuerDid: this.vcConfig.issuerDid
      });

      this.logger.info('Credential issued successfully', {
        tenantId,
        credentialId: signedCredential.id,
        credentialType: request.credentialType,
        subjectDid: request.subjectDid
      });

      return signedCredential;
    }, { credentialType: request.credentialType, subjectDid: request.subjectDid });
  }

  /**
   * Issue a Safeguarding Credential (WWCC, DBS, etc.)
   */
  async issueSafeguardingCredential(
    tenantId: string,
    issuerPassphrase: string,
    request: IssueSafeguardingCredentialRequest
  ): Promise<Result<VerifiableCredential>> {
    const safeguardingSubject: Omit<SafeguardingCredentialSubject, 'id'> = {
      type: 'SafeguardingCheck',
      checkType: request.safeguardingCheck.type,
      jurisdiction: request.safeguardingCheck.jurisdiction,
      checkNumber: request.safeguardingCheck.checkNumber,
      holderName: (request.subjectData as any).holderName,
      issuedDate: request.safeguardingCheck.verifiedAt.toISOString(),
      expiryDate: request.safeguardingCheck.expiresAt?.toISOString(),
      checkStatus: request.safeguardingCheck.status === 'valid' ? 'cleared' : 
                   request.safeguardingCheck.status === 'pending' ? 'pending' : 'expired',
      clearedCategories: ['children'],
      ...request.subjectData
    };

    return this.issueCredential(tenantId, issuerPassphrase, {
      ...request,
      subjectData: safeguardingSubject
    });
  }

  /**
   * Issue an Achievement Credential
   */
  async issueAchievementCredential(
    tenantId: string,
    issuerPassphrase: string,
    request: IssueAchievementCredentialRequest
  ): Promise<Result<VerifiableCredential>> {
    const achievementSubject: Omit<AchievementCredentialSubject, 'id'> = {
      type: 'Achievement',
      ...request.subjectData
    };

    return this.issueCredential(tenantId, issuerPassphrase, {
      ...request,
      subjectData: achievementSubject
    });
  }

  /**
   * Sign a credential with the issuer's key
   */
  private async signCredential(
    tenantId: string,
    credential: VerifiableCredential,
    passphrase: string
  ): Promise<VerifiableCredential> {
    const dataToSign = this.canonicalizeCredential(credential);
    const dataBytes = new TextEncoder().encode(dataToSign);

    const signResult = await this.didService.signWithDID(
      tenantId,
      this.vcConfig.issuerDid,
      dataBytes,
      passphrase
    );

    if (!signResult.success) {
      throw new CredentialValidationError('Failed to sign credential', { error: signResult.error });
    }

    const proof: Proof = {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: signResult.data.verificationMethod,
      proofPurpose: 'assertionMethod',
      proofValue: this.crypto.toBase64Url(signResult.data.signature)
    };

    return { ...credential, proof };
  }

  /**
   * Canonicalize credential for signing
   */
  private canonicalizeCredential(credential: VerifiableCredential): string {
    const { proof, ...rest } = credential;
    return JSON.stringify(rest, Object.keys(rest).sort());
  }

  /**
   * Map credential type to string
   */
  private mapCredentialType(type: CredentialSubjectType): string {
    const mapping: Record<CredentialSubjectType, string> = {
      'SafeguardingCredential': CREDENTIAL_TYPES.SAFEGUARDING,
      'QualificationCredential': CREDENTIAL_TYPES.QUALIFICATION,
      'SkillCredential': CREDENTIAL_TYPES.SKILL,
      'AchievementCredential': CREDENTIAL_TYPES.ACHIEVEMENT,
      'MembershipCredential': CREDENTIAL_TYPES.MEMBERSHIP,
      'ComplianceCredential': CREDENTIAL_TYPES.COMPLIANCE,
      'EmploymentCredential': CREDENTIAL_TYPES.EMPLOYMENT,
      'IdentityCredential': CREDENTIAL_TYPES.IDENTITY
    };
    return mapping[type] || type;
  }

  // --------------------------------------------------------------------------
  // CREDENTIAL VERIFICATION
  // --------------------------------------------------------------------------

  /**
   * Verify a Verifiable Credential
   */
  async verifyCredential(
    credential: VerifiableCredential,
    options?: {
      checkStatus?: boolean;
      checkSchema?: boolean;
      trustedIssuers?: string[];
    }
  ): Promise<Result<VerificationResult>> {
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // 1. Verify proof/signature
      const proofCheck = await this.verifyProof(credential);
      checks.push(proofCheck);
      if (!proofCheck.passed) {
        errors.push(proofCheck.message || 'Proof verification failed');
      }

      // 2. Check expiration
      const expirationCheck = this.checkExpiration(credential);
      checks.push(expirationCheck);
      if (!expirationCheck.passed) {
        errors.push(expirationCheck.message || 'Credential has expired');
      }

      // 3. Check issuer trust
      const issuerCheck = this.checkIssuer(credential, options?.trustedIssuers);
      checks.push(issuerCheck);
      if (!issuerCheck.passed) {
        warnings.push(issuerCheck.message || 'Issuer not in trusted list');
      }

      // 4. Check revocation status
      if (options?.checkStatus !== false && credential.credentialStatus) {
        const statusCheck = await this.checkRevocationStatus(credential);
        checks.push(statusCheck);
        if (!statusCheck.passed) {
          errors.push(statusCheck.message || 'Credential has been revoked');
        }
      }

      // 5. Validate against schema
      if (options?.checkSchema !== false && credential.credentialSchema) {
        const schemaCheck = await this.validateSchema(credential);
        checks.push(schemaCheck);
        if (!schemaCheck.passed) {
          warnings.push(schemaCheck.message || 'Schema validation failed');
        }
      }

      const valid = errors.length === 0 && checks.filter(c => 
        ['proof', 'status', 'expiration'].includes(c.check)
      ).every(c => c.passed);

      const result: VerificationResult = {
        valid,
        checks,
        warnings,
        errors,
        metadata: {
          issuer: typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id,
          issuanceDate: new Date(credential.issuanceDate),
          expirationDate: credential.expirationDate ? new Date(credential.expirationDate) : undefined,
          credentialTypes: credential.type,
          subjectId: credential.credentialSubject.id
        }
      };

      return success(result);
    } catch (error) {
      this.logger.error('Credential verification failed', error as Error);
      return failure(new CredentialValidationError('Verification failed', { error: (error as Error).message }));
    }
  }

  /**
   * Verify the cryptographic proof
   */
  private async verifyProof(credential: VerifiableCredential): Promise<VerificationCheck> {
    if (!credential.proof) {
      return { check: 'proof', passed: false, message: 'No proof found' };
    }

    const proof = Array.isArray(credential.proof) ? credential.proof[0] : credential.proof;
    const issuerDid = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;

    const dataToVerify = this.canonicalizeCredential(credential);
    const dataBytes = new TextEncoder().encode(dataToVerify);

    const signature = proof.proofValue 
      ? this.crypto.fromBase64Url(proof.proofValue)
      : proof.jws ? this.extractJWSSignature(proof.jws) : null;

    if (!signature) {
      return { check: 'proof', passed: false, message: 'No signature found in proof' };
    }

    const verifyResult = await this.didService.verifySignature(
      issuerDid,
      dataBytes,
      signature,
      proof.verificationMethod
    );

    if (!verifyResult.success) {
      return { check: 'proof', passed: false, message: 'Signature verification failed' };
    }

    return { 
      check: 'proof', 
      passed: verifyResult.data, 
      message: verifyResult.data ? 'Signature verified' : 'Invalid signature' 
    };
  }

  /**
   * Extract signature from JWS
   */
  private extractJWSSignature(jws: string): Uint8Array {
    const parts = jws.split('.');
    if (parts.length !== 3) throw new Error('Invalid JWS format');
    return this.crypto.fromBase64Url(parts[2]);
  }

  /**
   * Check credential expiration
   */
  private checkExpiration(credential: VerifiableCredential): VerificationCheck {
    const now = new Date();

    if (credential.validFrom) {
      const validFrom = new Date(credential.validFrom);
      if (now < validFrom) {
        return { check: 'expiration', passed: false, message: 'Credential not yet valid' };
      }
    }

    const expirationDate = credential.validUntil || credential.expirationDate;
    if (expirationDate) {
      const expiry = new Date(expirationDate);
      if (now > expiry) {
        return { check: 'expiration', passed: false, message: 'Credential has expired' };
      }
    }

    return { check: 'expiration', passed: true, message: 'Credential is within validity period' };
  }

  /**
   * Check if issuer is trusted
   */
  private checkIssuer(credential: VerifiableCredential, trustedIssuers?: string[]): VerificationCheck {
    const issuerDid = typeof credential.issuer === 'string' ? credential.issuer : credential.issuer.id;

    if (!trustedIssuers || trustedIssuers.length === 0) {
      return { check: 'issuer', passed: true, message: 'No trusted issuer list configured' };
    }

    const isTrusted = trustedIssuers.includes(issuerDid);
    return { 
      check: 'issuer', 
      passed: isTrusted, 
      message: isTrusted ? 'Issuer is trusted' : `Issuer ${issuerDid} not in trusted list` 
    };
  }

  /**
   * Check revocation status
   */
  private async checkRevocationStatus(credential: VerifiableCredential): Promise<VerificationCheck> {
    if (!credential.credentialStatus) {
      return { check: 'status', passed: true, message: 'No status to check' };
    }

    const status = await this.revocationRepo.isRevoked(credential.id!);
    return { 
      check: 'status', 
      passed: !status, 
      message: status ? 'Credential has been revoked' : 'Credential is not revoked' 
    };
  }

  /**
   * Validate against schema
   */
  private async validateSchema(credential: VerifiableCredential): Promise<VerificationCheck> {
    if (!credential.credentialSchema) {
      return { check: 'schema', passed: true, message: 'No schema to validate' };
    }

    const schemaRef = Array.isArray(credential.credentialSchema) 
      ? credential.credentialSchema[0] : credential.credentialSchema;

    const schema = await this.schemaRepo.findById(schemaRef.id);
    if (!schema) {
      return { check: 'schema', passed: false, message: 'Schema not found' };
    }

    try {
      this.validateAgainstSchema(credential.credentialSubject, schema.schema);
      return { check: 'schema', passed: true, message: 'Schema validation passed' };
    } catch (error) {
      return { check: 'schema', passed: false, message: (error as Error).message };
    }
  }

  /**
   * Validate data against JSON schema
   */
  private validateAgainstSchema(data: any, schema: Record<string, any>): void {
    if (schema.required) {
      for (const field of schema.required) {
        if (data[field] === undefined || data[field] === null) {
          throw new ValidationError(`Missing required field: ${field}`);
        }
      }
    }

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        if (data[key] !== undefined) {
          this.validateProperty(data[key], propSchema as any, key);
        }
      }
    }
  }

  /**
   * Validate a single property
   */
  private validateProperty(value: any, schema: { type?: string; format?: string; enum?: any[] }, fieldName: string): void {
    if (schema.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (schema.type !== actualType) {
        throw new ValidationError(`Field ${fieldName} should be ${schema.type}, got ${actualType}`);
      }
    }

    if (schema.enum && !schema.enum.includes(value)) {
      throw new ValidationError(`Field ${fieldName} must be one of: ${schema.enum.join(', ')}`);
    }

    if (schema.format === 'date-time' && typeof value === 'string') {
      if (isNaN(Date.parse(value))) {
        throw new ValidationError(`Field ${fieldName} is not a valid date-time`);
      }
    }
  }

  /**
   * Get or validate schema
   */
  private async getOrValidateSchema(
    credentialType: CredentialSubjectType,
    schemaId?: string
  ): Promise<CredentialSchemaEntry | null> {
    if (schemaId) {
      const schema = await this.schemaRepo.findById(schemaId);
      if (!schema) throw new ValidationError(`Schema not found: ${schemaId}`);
      return schema;
    }
    return this.schemaRepo.findDefault(credentialType);
  }

  /**
   * Get next status list index
   */
  private async getNextStatusListIndex(): Promise<number> {
    return Math.floor(Math.random() * 100000);
  }

  // --------------------------------------------------------------------------
  // CREDENTIAL MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get all credentials for a holder
   */
  async getCredentials(
    tenantId: string,
    holderDid: string,
    filter?: { type?: string; issuer?: string }
  ): Promise<Result<VerifiableCredential[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(holderDid, 'holderDid');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getCredentials', tenantId, async () => {
      let credentials: VerifiableCredential[];

      if (filter?.type) {
        credentials = await this.credentialRepo.findByType(tenantId, holderDid, filter.type);
      } else {
        credentials = await this.credentialRepo.findByHolder(tenantId, holderDid);
      }

      if (filter?.issuer) {
        credentials = credentials.filter(c => {
          const issuerDid = typeof c.issuer === 'string' ? c.issuer : c.issuer.id;
          return issuerDid === filter.issuer;
        });
      }

      return credentials;
    }, { holderDid });
  }

  /**
   * Revoke a credential
   */
  async revokeCredential(
    tenantId: string,
    credentialId: string,
    reason: string,
    revokedBy: string
  ): Promise<Result<void>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(credentialId, 'credentialId');
      Validator.required(reason, 'reason');
      Validator.required(revokedBy, 'revokedBy');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('revokeCredential', tenantId, async () => {
      const credential = await this.credentialRepo.findById(tenantId, credentialId);
      if (!credential) throw new NotFoundError('Credential', credentialId);

      await this.revocationRepo.revoke(tenantId, credentialId, reason, revokedBy);

      await this.publishEvent('ssi.credential.revoked', tenantId, {
        credentialId, reason, revokedBy
      });

      this.logger.info('Credential revoked', { tenantId, credentialId, reason, revokedBy });
    }, { credentialId });
  }

  // --------------------------------------------------------------------------
  // VERIFIABLE PRESENTATIONS
  // --------------------------------------------------------------------------

  /**
   * Create a Verifiable Presentation
   */
  async createPresentation(
    tenantId: string,
    holderDid: string,
    holderPassphrase: string,
    credentials: VerifiableCredential[],
    options?: { challenge?: string; domain?: string; presentationId?: string }
  ): Promise<Result<VerifiablePresentation>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(holderDid, 'holderDid');
      Validator.required(holderPassphrase, 'holderPassphrase');
      if (!credentials || credentials.length === 0) {
        throw new ValidationError('At least one credential is required');
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createPresentation', tenantId, async () => {
      // Verify all credentials are owned by the holder
      for (const cred of credentials) {
        if (cred.credentialSubject.id !== holderDid) {
          throw new ValidationError(`Credential ${cred.id} does not belong to holder`);
        }
      }

      const presentation: VerifiablePresentation = {
        '@context': [VC_CONTEXTS.CREDENTIALS_V2],
        id: options?.presentationId || `urn:uuid:${this.generateId('vp')}`,
        type: [PRESENTATION_TYPES.BASE],
        holder: holderDid,
        verifiableCredential: credentials
      };

      // Sign presentation
      const dataToSign = JSON.stringify({
        ...presentation,
        challenge: options?.challenge,
        domain: options?.domain
      }, Object.keys(presentation).sort());
      
      const dataBytes = new TextEncoder().encode(dataToSign);

      const signResult = await this.didService.signWithDID(
        tenantId, holderDid, dataBytes, holderPassphrase
      );

      if (!signResult.success) {
        throw new PresentationError('Failed to sign presentation');
      }

      const proof: Proof = {
        type: 'Ed25519Signature2020',
        created: new Date().toISOString(),
        verificationMethod: signResult.data.verificationMethod,
        proofPurpose: 'authentication',
        proofValue: this.crypto.toBase64Url(signResult.data.signature),
        challenge: options?.challenge,
        domain: options?.domain
      };

      const signedPresentation: VerifiablePresentation = { ...presentation, proof };

      await this.presentationRepo.save(tenantId, holderDid, signedPresentation);

      await this.publishEvent('ssi.presentation.created', tenantId, {
        presentationId: signedPresentation.id,
        holderDid,
        credentialCount: credentials.length
      });

      return signedPresentation;
    }, { holderDid, credentialCount: credentials.length });
  }

  /**
   * Verify a Verifiable Presentation
   */
  async verifyPresentation(
    presentation: VerifiablePresentation,
    options?: { challenge?: string; domain?: string; trustedIssuers?: string[] }
  ): Promise<Result<VerificationResult>> {
    const checks: VerificationCheck[] = [];
    const warnings: string[] = [];
    const errors: string[] = [];

    try {
      // Verify presentation proof
      const presentationProofCheck = await this.verifyPresentationProof(presentation, options);
      checks.push(presentationProofCheck);
      if (!presentationProofCheck.passed) {
        errors.push(presentationProofCheck.message || 'Presentation proof verification failed');
      }

      // Verify each credential
      if (presentation.verifiableCredential) {
        for (const credential of presentation.verifiableCredential) {
          const credVerification = await this.verifyCredential(credential, {
            trustedIssuers: options?.trustedIssuers
          });

          if (credVerification.success) {
            if (!credVerification.data.valid) {
              errors.push(`Credential ${credential.id} is invalid: ${credVerification.data.errors.join(', ')}`);
            }
            checks.push(...credVerification.data.checks);
            warnings.push(...credVerification.data.warnings);
          } else {
            errors.push(`Failed to verify credential ${credential.id}`);
          }
        }
      }

      // Verify holder matches credential subjects
      if (presentation.holder && presentation.verifiableCredential) {
        for (const credential of presentation.verifiableCredential) {
          if (credential.credentialSubject.id !== presentation.holder) {
            errors.push(`Credential ${credential.id} subject does not match presentation holder`);
          }
        }
      }

      const valid = errors.length === 0;

      return success({ valid, checks, warnings, errors });
    } catch (error) {
      this.logger.error('Presentation verification failed', error as Error);
      return failure(new PresentationError('Verification failed', { error: (error as Error).message }));
    }
  }

  /**
   * Verify presentation proof
   */
  private async verifyPresentationProof(
    presentation: VerifiablePresentation,
    options?: { challenge?: string; domain?: string }
  ): Promise<VerificationCheck> {
    if (!presentation.proof) {
      return { check: 'proof', passed: false, message: 'No proof found on presentation' };
    }

    const proof = Array.isArray(presentation.proof) ? presentation.proof[0] : presentation.proof;

    if (options?.challenge && proof.challenge !== options.challenge) {
      return { check: 'proof', passed: false, message: 'Challenge mismatch' };
    }

    if (options?.domain && proof.domain !== options.domain) {
      return { check: 'proof', passed: false, message: 'Domain mismatch' };
    }

    if (!presentation.holder) {
      return { check: 'proof', passed: false, message: 'No holder specified' };
    }

    const dataToVerify = JSON.stringify({
      '@context': presentation['@context'],
      id: presentation.id,
      type: presentation.type,
      holder: presentation.holder,
      verifiableCredential: presentation.verifiableCredential,
      challenge: proof.challenge,
      domain: proof.domain
    }, null, 0);

    const dataBytes = new TextEncoder().encode(dataToVerify);
    const signature = proof.proofValue ? this.crypto.fromBase64Url(proof.proofValue) : null;

    if (!signature) {
      return { check: 'proof', passed: false, message: 'No signature in proof' };
    }

    const verifyResult = await this.didService.verifySignature(
      presentation.holder, dataBytes, signature, proof.verificationMethod
    );

    if (!verifyResult.success) {
      return { check: 'proof', passed: false, message: 'Signature verification failed' };
    }

    return { 
      check: 'proof', 
      passed: verifyResult.data, 
      message: verifyResult.data ? 'Presentation proof verified' : 'Invalid presentation signature' 
    };
  }

  // --------------------------------------------------------------------------
  // PRESENTATION EXCHANGE
  // --------------------------------------------------------------------------

  /**
   * Process a presentation request and find matching credentials
   */
  async processRequestForCredentials(
    tenantId: string,
    holderDid: string,
    request: PresentationRequest
  ): Promise<Result<{
    matchingCredentials: Map<string, VerifiableCredential[]>;
    canSatisfy: boolean;
    missingDescriptors: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(holderDid, 'holderDid');
      Validator.required(request.input_descriptors, 'input_descriptors');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('processRequestForCredentials', tenantId, async () => {
      const allCredentials = await this.credentialRepo.findByHolder(tenantId, holderDid);
      const matchingCredentials = new Map<string, VerifiableCredential[]>();
      const missingDescriptors: string[] = [];

      for (const descriptor of request.input_descriptors) {
        const matches = this.findMatchingCredentials(allCredentials, descriptor);
        
        if (matches.length > 0) {
          matchingCredentials.set(descriptor.id, matches);
        } else {
          missingDescriptors.push(descriptor.id);
        }
      }

      const canSatisfy = missingDescriptors.length === 0;

      return { matchingCredentials, canSatisfy, missingDescriptors };
    }, { holderDid, descriptorCount: request.input_descriptors.length });
  }

  /**
   * Find credentials matching an input descriptor
   */
  private findMatchingCredentials(
    credentials: VerifiableCredential[],
    descriptor: InputDescriptor
  ): VerifiableCredential[] {
    return credentials.filter(credential => {
      if (descriptor.constraints?.fields) {
        for (const field of descriptor.constraints.fields) {
          if (!this.credentialMatchesField(credential, field)) {
            return false;
          }
        }
      }
      return true;
    });
  }

  /**
   * Check if a credential matches a field constraint
   */
  private credentialMatchesField(
    credential: VerifiableCredential,
    field: { path: string[]; filter?: any; optional?: boolean }
  ): boolean {
    for (const path of field.path) {
      const value = this.extractValueByPath(credential, path);
      
      if (value !== undefined) {
        if (field.filter) {
          if (!this.valueMatchesFilter(value, field.filter)) continue;
        }
        return true;
      }
    }
    return field.optional === true;
  }

  /**
   * Extract value by JSON path
   */
  private extractValueByPath(credential: any, path: string): any {
    const parts = path.replace('$.', '').split('.');
    let value = credential;

    for (const part of parts) {
      if (value === undefined || value === null) return undefined;
      value = value[part];
    }

    return value;
  }

  /**
   * Check if value matches filter
   */
  private valueMatchesFilter(value: any, filter: any): boolean {
    if (filter.const !== undefined) return value === filter.const;
    if (filter.enum) return filter.enum.includes(value);
    if (filter.pattern) return new RegExp(filter.pattern).test(String(value));
    if (filter.type === 'string' && typeof value !== 'string') return false;
    if (filter.type === 'number' && typeof value !== 'number') return false;
    if (filter.minimum !== undefined && value < filter.minimum) return false;
    if (filter.maximum !== undefined && value > filter.maximum) return false;
    return true;
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const VC_SERVICE_VERSION = '1.0.0';
