/**
 * Self-Sovereign Identity & Verifiable Credentials Types
 *
 * Phase 1 Foundation: Trust & Identity Layer
 *
 * ## The Granny Explanation
 *
 * Imagine your wallet: it holds your driver's license, library card, gym membership,
 * and professional certificates. You control what you show to whom - the bouncer
 * sees your age, the library sees your membership, your employer sees your degree.
 *
 * Self-Sovereign Identity (SSI) is a digital version of that wallet:
 * - YOU own your credentials, not the companies that issued them
 * - YOU decide what to share and with whom
 * - The credentials are cryptographically signed, so they can't be faked
 * - Even if a company goes bankrupt, your credentials remain valid
 *
 * In Scholarly:
 * - Teachers carry their WWCC/DBS checks, qualifications, and certifications
 * - Students carry their academic achievements and skill badges
 * - Schools carry their accreditation and compliance records
 * - When a parent books a tutor, they can verify credentials instantly
 *
 * ## Architecture
 *
 * This module implements:
 * - W3C DID Core 1.0 specification for decentralized identifiers
 * - W3C Verifiable Credentials Data Model v2.0 for credentials
 * - DIF Presentation Exchange for selective disclosure
 *
 * ## Standards Compliance
 *
 * - DIDs: https://www.w3.org/TR/did-core/
 * - VCs: https://www.w3.org/TR/vc-data-model-2.0/
 * - Presentation Exchange: https://identity.foundation/presentation-exchange/
 *
 * @module SSI-VC-Types
 */

// ============================================================================
// JURISDICTION & SAFEGUARDING TYPES (used by credential subjects)
// ============================================================================

/**
 * Supported jurisdictions for Scholarly
 */
export type Jurisdiction =
  | 'AU_NSW' | 'AU_VIC' | 'AU_QLD' | 'AU_WA' | 'AU_SA' | 'AU_TAS' | 'AU_ACT' | 'AU_NT'
  | 'UK_ENGLAND' | 'UK_SCOTLAND' | 'UK_WALES' | 'UK_NI'
  | 'CA_ON' | 'CA_BC' | 'CA_AB' | 'CA_QC'
  | 'CN';

/**
 * Safeguarding check type reference (for credential subjects)
 */
export type SafeguardingCheckType = 'WWCC' | 'DBS' | 'VSC' | 'PVG' | 'CPIC' | 'NATIONAL';

// ============================================================================
// DECENTRALIZED IDENTIFIER (DID) TYPES
// ============================================================================

/**
 * Supported DID methods
 *
 * did:web  - Web-based DIDs using domain verification (enterprise use)
 * did:key  - Self-contained DIDs using public keys (individual use)
 * did:ethr - Ethereum-based DIDs (blockchain anchoring)
 */
export type DIDMethod = 'did:web' | 'did:key' | 'did:ethr';

/**
 * A Decentralized Identifier following W3C DID Core 1.0
 *
 * Format: did:<method>:<method-specific-identifier>
 * Examples:
 *   - did:web:scholarly.edu.au:users:u_123
 *   - did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
 *   - did:ethr:0x1234...abcd
 */
export interface DecentralizedIdentifier {
  /** Full DID string */
  did: string;

  /** DID method (web, key, ethr) */
  method: DIDMethod;

  /** Method-specific identifier portion */
  methodSpecificId: string;

  /** Controller of this DID (usually the DID itself) */
  controller: string;

  /** When the DID was created */
  created: Date;

  /** When the DID document was last updated */
  updated: Date;

  /** Whether this DID is active or has been deactivated */
  status: 'active' | 'deactivated' | 'revoked';
}

/**
 * DID Document - The resolution of a DID
 * Contains verification methods and service endpoints
 */
export interface DIDDocument {
  /** JSON-LD context */
  '@context': string[];

  /** The DID this document describes */
  id: string;

  /** DID(s) that control this DID */
  controller?: string | string[];

  /** Verification methods (public keys) */
  verificationMethod: VerificationMethod[];

  /** Methods for authentication */
  authentication?: (string | VerificationMethod)[];

  /** Methods for assertion (signing credentials) */
  assertionMethod?: (string | VerificationMethod)[];

  /** Methods for key agreement (encryption) */
  keyAgreement?: (string | VerificationMethod)[];

  /** Methods for capability invocation */
  capabilityInvocation?: (string | VerificationMethod)[];

  /** Methods for capability delegation */
  capabilityDelegation?: (string | VerificationMethod)[];

  /** Service endpoints */
  service?: ServiceEndpoint[];

  /** Also known as (aliases) */
  alsoKnownAs?: string[];
}

/**
 * A verification method (public key)
 */
export interface VerificationMethod {
  /** Unique identifier for this key */
  id: string;

  /** Type of key */
  type: 'Ed25519VerificationKey2020' | 'JsonWebKey2020' | 'EcdsaSecp256k1VerificationKey2019';

  /** Controller of this key */
  controller: string;

  /** Public key in multibase format */
  publicKeyMultibase?: string;

  /** Public key as JWK */
  publicKeyJwk?: JsonWebKey;
}

/**
 * JSON Web Key representation
 */
export interface JsonWebKey {
  kty: 'EC' | 'OKP' | 'RSA';
  crv?: 'Ed25519' | 'secp256k1' | 'P-256' | 'P-384';
  x?: string;
  y?: string;
  d?: string; // Private key (never exposed)
  kid?: string;
  use?: 'sig' | 'enc';
  alg?: string;
}

/**
 * Service endpoint in DID Document
 */
export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string | Record<string, any>;
}

// ============================================================================
// KEY MANAGEMENT TYPES
// ============================================================================

/**
 * Key purpose defines what a key can be used for
 */
export type KeyPurpose =
  | 'authentication'       // Prove control of DID
  | 'assertion'            // Sign credentials
  | 'keyAgreement'         // Establish encrypted communication
  | 'capabilityInvocation' // Invoke capabilities
  | 'capabilityDelegation'; // Delegate capabilities

/**
 * A cryptographic key pair
 */
export interface KeyPair {
  /** Unique identifier */
  id: string;

  /** Associated DID */
  did: string;

  /** Key type */
  type: 'Ed25519' | 'secp256k1' | 'P-256';

  /** Public key (base64url encoded) */
  publicKey: string;

  /** Encrypted private key (never stored in plain text) */
  encryptedPrivateKey: string;

  /** Encryption algorithm used for private key */
  privateKeyEncryption: 'AES-256-GCM';

  /** Key derivation function used */
  kdf: 'PBKDF2' | 'Argon2id';

  /** Purposes this key can be used for */
  purposes: KeyPurpose[];

  /** Creation timestamp */
  created: Date;

  /** Expiration (optional) */
  expires?: Date;

  /** Whether this is the primary key */
  isPrimary: boolean;

  /** Key status */
  status: 'active' | 'rotated' | 'revoked' | 'expired';
}

/**
 * Key rotation event for audit trail
 */
export interface KeyRotationRecord {
  id: string;
  did: string;
  previousKeyId: string;
  newKeyId: string;
  rotatedAt: Date;
  reason: 'scheduled' | 'compromise_suspected' | 'user_requested' | 'policy';
  rotatedBy: string;
}

/**
 * Key recovery configuration
 */
export interface KeyRecoveryConfig {
  /** Recovery method */
  method: 'social_recovery' | 'hardware_backup' | 'custodial' | 'mnemonic';

  /** For social recovery: threshold of guardians needed */
  threshold?: number;

  /** For social recovery: total guardians */
  totalGuardians?: number;

  /** Guardian DIDs (hashed for privacy) */
  guardianHashes?: string[];

  /** Recovery endpoint if custodial */
  recoveryEndpoint?: string;

  /** Last verification of recovery capability */
  lastVerified?: Date;
}

// ============================================================================
// DIGITAL WALLET TYPES
// ============================================================================

/**
 * A user's digital identity wallet
 * Contains DIDs, keys, and credentials
 */
export interface DigitalWallet {
  /** Wallet identifier */
  id: string;

  /** Tenant this wallet belongs to */
  tenantId: string;

  /** User who owns this wallet */
  userId: string;

  /** Primary DID for this user */
  primaryDid: string;

  /** All DIDs controlled by this wallet */
  dids: DecentralizedIdentifier[];

  /** Key pairs (encrypted) */
  keyPairs: KeyPair[];

  /** Verifiable credentials held */
  credentials: VerifiableCredential[];

  /** Presentations created */
  presentations: VerifiablePresentation[];

  /** Recovery configuration */
  recovery: KeyRecoveryConfig;

  /** Wallet encryption key (derived from user passphrase) */
  encryptionKeyId: string;

  /** Creation timestamp */
  created: Date;

  /** Last accessed */
  lastAccessed: Date;

  /** Wallet status */
  status: 'active' | 'locked' | 'recovering' | 'deactivated';
}

/**
 * Wallet backup for export/import
 */
export interface WalletBackup {
  /** Backup version for compatibility */
  version: string;

  /** Encrypted wallet data */
  encryptedPayload: string;

  /** Encryption parameters */
  encryption: {
    algorithm: 'AES-256-GCM';
    kdf: 'Argon2id';
    salt: string;
    iterations: number;
    memory: number;
    parallelism: number;
  };

  /** Backup timestamp */
  created: Date;

  /** Integrity checksum */
  checksum: string;
}

// ============================================================================
// VERIFIABLE CREDENTIAL TYPES (W3C VC Data Model v2.0)
// ============================================================================

/**
 * Credential subject types for Scholarly
 */
export type CredentialSubjectType =
  | 'SafeguardingCredential'      // WWCC, DBS, PVG checks
  | 'QualificationCredential'     // Degrees, certifications
  | 'SkillCredential'             // Specific skill demonstrations
  | 'AchievementCredential'       // Course completions, badges
  | 'MembershipCredential'        // Professional memberships
  | 'ComplianceCredential'        // Regulatory compliance
  | 'EmploymentCredential'        // Work history verification
  | 'IdentityCredential';         // Identity verification

/**
 * W3C Verifiable Credential v2.0
 */
export interface VerifiableCredential {
  /** JSON-LD context */
  '@context': string[];

  /** Unique identifier for this credential */
  id: string;

  /** Credential types */
  type: string[];

  /** Issuer DID or object */
  issuer: string | {
    id: string;
    name?: string;
    image?: string;
    [key: string]: any;
  };

  /** Issuance date */
  issuanceDate: string; // ISO 8601

  /** Expiration date (optional) */
  expirationDate?: string; // ISO 8601

  /** Valid from date (if different from issuance) */
  validFrom?: string;

  /** Valid until date */
  validUntil?: string;

  /** Credential subject (the claims) */
  credentialSubject: CredentialSubject;

  /** Credential status for revocation checking */
  credentialStatus?: CredentialStatus;

  /** Credential schema */
  credentialSchema?: CredentialSchema | CredentialSchema[];

  /** Refresh service */
  refreshService?: RefreshService;

  /** Terms of use */
  termsOfUse?: TermsOfUse[];

  /** Evidence supporting the credential */
  evidence?: Evidence[];

  /** Cryptographic proof */
  proof?: Proof | Proof[];
}

/**
 * Credential subject - the entity the credential is about
 */
export interface CredentialSubject {
  /** DID of the subject */
  id?: string;

  /** Additional claims - structure depends on credential type */
  [key: string]: any;
}

/**
 * Credential status for revocation checking
 */
export interface CredentialStatus {
  id: string;
  type: 'StatusList2021Entry' | 'RevocationList2020Status' | 'BitstringStatusListEntry';
  statusPurpose?: 'revocation' | 'suspension';
  statusListIndex?: string;
  statusListCredential?: string;
}

/**
 * Credential schema reference
 */
export interface CredentialSchema {
  id: string;
  type: 'JsonSchema' | 'JsonSchemaCredential';
}

/**
 * Refresh service for credential updates
 */
export interface RefreshService {
  id: string;
  type: 'ManualRefreshService2018' | 'AutoRefreshService';
}

/**
 * Terms of use for credentials
 */
export interface TermsOfUse {
  id?: string;
  type: string;
  [key: string]: any;
}

/**
 * Evidence supporting a credential
 */
export interface Evidence {
  id?: string;
  type: string[];
  verifier?: string;
  evidenceDocument?: string;
  subjectPresence?: 'Physical' | 'Digital';
  documentPresence?: 'Physical' | 'Digital';
  [key: string]: any;
}

/**
 * Cryptographic proof
 */
export interface Proof {
  type: 'Ed25519Signature2020' | 'JsonWebSignature2020' | 'EcdsaSecp256k1Signature2019';
  created: string;
  verificationMethod: string;
  proofPurpose: 'assertionMethod' | 'authentication';
  proofValue?: string;
  jws?: string;
  challenge?: string;
  domain?: string;
}

// ============================================================================
// SCHOLARLY-SPECIFIC CREDENTIAL SUBJECTS
// ============================================================================

/**
 * Safeguarding credential subject (WWCC, DBS, etc.)
 */
export interface SafeguardingCredentialSubject extends CredentialSubject {
  /** Type indicator */
  type: 'SafeguardingCheck';

  /** Check type */
  checkType: SafeguardingCheckType;

  /** Jurisdiction where check is valid */
  jurisdiction: Jurisdiction;

  /** Check/card number */
  checkNumber: string;

  /** Name as it appears on the check */
  holderName: string;

  /** Date of birth (for verification) - hashed for privacy */
  dateOfBirthHash?: string;

  /** Date check was issued */
  issuedDate: string;

  /** Expiry date */
  expiryDate?: string;

  /** Current status */
  checkStatus: 'cleared' | 'pending' | 'barred' | 'expired';

  /** Categories cleared for (e.g., 'children', 'vulnerable adults') */
  clearedCategories: string[];

  /** Verification URL for real-time status check */
  verificationUrl?: string;
}

/**
 * Qualification credential subject (degrees, certifications)
 */
export interface QualificationCredentialSubject extends CredentialSubject {
  type: 'Qualification';

  /** Qualification name */
  qualificationName: string;

  /** Field of study */
  fieldOfStudy: string;

  /** Level (e.g., 'Bachelor', 'Master', 'Certificate IV') */
  level: string;

  /** Australian Qualifications Framework level (1-10) */
  aqfLevel?: number;

  /** Awarding institution */
  awardingInstitution: string;

  /** Institution identifier (e.g., TEQSA provider code) */
  institutionId?: string;

  /** Date awarded */
  dateAwarded: string;

  /** Student/graduate number */
  studentNumber?: string;

  /** Specializations or majors */
  specializations?: string[];

  /** Honours classification if applicable */
  honours?: 'First Class' | 'Second Class Division 1' | 'Second Class Division 2' | 'Third Class';

  /** GPA if provided */
  gpa?: number;

  /** Accreditation body */
  accreditedBy?: string;
}

/**
 * Skill credential subject
 */
export interface SkillCredentialSubject extends CredentialSubject {
  type: 'Skill';

  /** Skill name */
  skillName: string;

  /** Skill category */
  category: string;

  /** Proficiency level */
  proficiencyLevel: 'beginner' | 'intermediate' | 'advanced' | 'expert';

  /** How the skill was demonstrated */
  assessmentMethod: 'examination' | 'portfolio' | 'observation' | 'peer_review' | 'self_assessment';

  /** Assessment score if applicable */
  score?: number;

  /** Maximum possible score */
  maxScore?: number;

  /** Date skill was demonstrated */
  demonstrationDate: string;

  /** Related curriculum standards */
  alignedStandards?: string[];

  /** Evidence links */
  evidenceUrls?: string[];
}

/**
 * Achievement credential subject (course completions, badges)
 */
export interface AchievementCredentialSubject extends CredentialSubject {
  type: 'Achievement';

  /** Achievement name */
  achievementName: string;

  /** Achievement description */
  description: string;

  /** Achievement type */
  achievementType: 'course_completion' | 'badge' | 'certificate' | 'award' | 'milestone';

  /** Criteria for achievement */
  criteria: string;

  /** Date achieved */
  dateAchieved: string;

  /** Image/badge URL */
  image?: string;

  /** Related course or program */
  relatedCourse?: {
    id: string;
    name: string;
    provider: string;
  };

  /** Hours of learning (if applicable) */
  learningHours?: number;

  /** Alignment to standards */
  alignment?: {
    targetName: string;
    targetUrl: string;
    targetFramework: string;
  }[];
}

/**
 * Teaching registration credential
 */
export interface TeachingRegistrationCredentialSubject extends CredentialSubject {
  type: 'TeachingRegistration';

  /** Registration authority */
  registrationAuthority: string;

  /** Registration number */
  registrationNumber: string;

  /** Registration type */
  registrationType: 'full' | 'provisional' | 'limited' | 'non_practising';

  /** Categories of registration */
  categories: ('early_childhood' | 'primary' | 'secondary' | 'special_education' | 'vocational')[];

  /** Subject specializations */
  subjectSpecializations?: string[];

  /** Date of initial registration */
  initialRegistrationDate: string;

  /** Current registration valid from */
  currentValidFrom: string;

  /** Current registration valid until */
  currentValidUntil: string;

  /** Professional standards met */
  standardsMet?: string;

  /** Any conditions on registration */
  conditions?: string[];
}

// ============================================================================
// VERIFIABLE PRESENTATION TYPES
// ============================================================================

/**
 * W3C Verifiable Presentation
 * A container for presenting one or more credentials
 */
export interface VerifiablePresentation {
  /** JSON-LD context */
  '@context': string[];

  /** Unique identifier */
  id?: string;

  /** Presentation types */
  type: string[];

  /** Holder DID (who is presenting) */
  holder?: string;

  /** Credentials being presented */
  verifiableCredential?: VerifiableCredential[];

  /** Cryptographic proof */
  proof?: Proof | Proof[];
}

/**
 * Presentation request (what credentials are being asked for)
 * Based on DIF Presentation Exchange
 */
export interface PresentationRequest {
  /** Request identifier */
  id: string;

  /** Name of the request */
  name?: string;

  /** Purpose explanation */
  purpose?: string;

  /** Input descriptors (what's being requested) */
  input_descriptors: InputDescriptor[];

  /** Submission requirements */
  submission_requirements?: SubmissionRequirement[];
}

/**
 * Input descriptor - describes a credential being requested
 */
export interface InputDescriptor {
  id: string;
  name?: string;
  purpose?: string;

  /** Format requirements */
  format?: {
    jwt_vc?: { alg: string[] };
    jwt_vp?: { alg: string[] };
    ldp_vc?: { proof_type: string[] };
    ldp_vp?: { proof_type: string[] };
  };

  /** Constraints on the credential */
  constraints?: {
    fields?: FieldConstraint[];
    limit_disclosure?: 'required' | 'preferred';
  };
}

/**
 * Field constraint for selective disclosure
 */
export interface FieldConstraint {
  /** JSON path to the field */
  path: string[];

  /** Field ID */
  id?: string;

  /** Purpose of requesting this field */
  purpose?: string;

  /** Filter on the field value */
  filter?: {
    type: string;
    pattern?: string;
    minimum?: number;
    maximum?: number;
    const?: any;
    enum?: any[];
  };

  /** Whether this field is optional */
  optional?: boolean;
}

/**
 * Submission requirement for presentations
 */
export interface SubmissionRequirement {
  name?: string;
  purpose?: string;
  rule: 'all' | 'pick';
  count?: number;
  min?: number;
  max?: number;
  from?: string;
  from_nested?: SubmissionRequirement[];
}

/**
 * Presentation submission (response to a request)
 */
export interface PresentationSubmission {
  id: string;
  definition_id: string;
  descriptor_map: DescriptorMapEntry[];
}

/**
 * Maps credentials to input descriptors
 */
export interface DescriptorMapEntry {
  id: string;
  format: string;
  path: string;
  path_nested?: DescriptorMapEntry;
}

// ============================================================================
// CREDENTIAL SCHEMA DEFINITIONS
// ============================================================================

/**
 * Schema registry entry
 */
export interface CredentialSchemaEntry {
  /** Schema identifier */
  id: string;

  /** Schema name */
  name: string;

  /** Schema version */
  version: string;

  /** Credential type this schema is for */
  credentialType: CredentialSubjectType;

  /** JSON Schema definition */
  schema: Record<string, any>;

  /** Who created this schema */
  author: string;

  /** Creation date */
  created: Date;

  /** Whether this is the default schema for this type */
  isDefault: boolean;

  /** Jurisdictions this schema is valid in */
  validJurisdictions?: Jurisdiction[];
}

// ============================================================================
// SSI EVENTS
// ============================================================================

/**
 * SSI-related events for the event bus
 */
export type SSIEventType =
  | 'ssi.did.created'
  | 'ssi.did.updated'
  | 'ssi.did.deactivated'
  | 'ssi.key.created'
  | 'ssi.key.rotated'
  | 'ssi.key.revoked'
  | 'ssi.wallet.created'
  | 'ssi.wallet.locked'
  | 'ssi.wallet.unlocked'
  | 'ssi.wallet.recovered'
  | 'ssi.credential.issued'
  | 'ssi.credential.received'
  | 'ssi.credential.revoked'
  | 'ssi.credential.expired'
  | 'ssi.presentation.created'
  | 'ssi.presentation.verified'
  | 'ssi.presentation.rejected';

export interface SSIEvent {
  id: string;
  type: SSIEventType;
  tenantId: string;
  userId: string;
  did?: string;
  credentialId?: string;
  timestamp: Date;
  payload: Record<string, any>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  };
}

// ============================================================================
// DOMAIN-SPECIFIC ERROR CLASSES
// ============================================================================

export class SSIError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(code: string, message: string, details?: Record<string, any>) {
    super(message);
    this.name = 'SSIError';
    this.code = code;
    this.details = details;
  }
}

export class DIDResolutionError extends SSIError {
  constructor(did: string, reason: string) {
    super('DID_RESOLUTION_ERROR', `Failed to resolve DID ${did}: ${reason}`, { did, reason });
    this.name = 'DIDResolutionError';
  }
}

export class CredentialValidationError extends SSIError {
  constructor(message: string, details?: Record<string, any>) {
    super('CREDENTIAL_VALIDATION_ERROR', message, details);
    this.name = 'CredentialValidationError';
  }
}

export class KeyManagementError extends SSIError {
  constructor(message: string, details?: Record<string, any>) {
    super('KEY_MANAGEMENT_ERROR', message, details);
    this.name = 'KeyManagementError';
  }
}

export class WalletError extends SSIError {
  constructor(message: string, details?: Record<string, any>) {
    super('WALLET_ERROR', message, details);
    this.name = 'WalletError';
  }
}

export class PresentationError extends SSIError {
  constructor(message: string, details?: Record<string, any>) {
    super('PRESENTATION_ERROR', message, details);
    this.name = 'PresentationError';
  }
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** W3C VC context URLs */
export const VC_CONTEXTS = {
  CREDENTIALS_V2: 'https://www.w3.org/ns/credentials/v2',
  CREDENTIALS_V1: 'https://www.w3.org/2018/credentials/v1',
  SECURITY_V2: 'https://w3id.org/security/suites/ed25519-2020/v1',
  SCHOLARLY: 'https://scholarly.edu.au/credentials/v1'
} as const;

/** DID context URLs */
export const DID_CONTEXTS = {
  DID_V1: 'https://www.w3.org/ns/did/v1',
  SECURITY_V2: 'https://w3id.org/security/suites/ed25519-2020/v1'
} as const;

/** Credential types */
export const CREDENTIAL_TYPES = {
  BASE: 'VerifiableCredential',
  SAFEGUARDING: 'SafeguardingCredential',
  QUALIFICATION: 'QualificationCredential',
  SKILL: 'SkillCredential',
  ACHIEVEMENT: 'AchievementCredential',
  MEMBERSHIP: 'MembershipCredential',
  COMPLIANCE: 'ComplianceCredential',
  EMPLOYMENT: 'EmploymentCredential',
  IDENTITY: 'IdentityCredential',
  TEACHING_REGISTRATION: 'TeachingRegistrationCredential'
} as const;

/** Presentation types */
export const PRESENTATION_TYPES = {
  BASE: 'VerifiablePresentation'
} as const;

/** Module version */
export const SSI_MODULE_VERSION = '1.0.0';
