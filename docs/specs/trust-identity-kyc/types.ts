/**
 * Universal Identity, KYC/KYB & Trust Services - Type Definitions
 * 
 * A comprehensive identity verification and trust scoring system designed
 * for multi-platform use across the Chekd ecosystem.
 * 
 * Architecture:
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                      IDENTITY SERVICE                          │
 * │  (Core identity management, SSI wallet, DID, profiles)         │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *         ┌────────────────────┼────────────────────┐
 *         ▼                    ▼                    ▼
 * ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
 * │  KYC SERVICE  │   │  KYB SERVICE  │   │ TRUST SERVICE │
 * │  (Individual  │   │  (Business    │   │ (Reputation,  │
 * │  verification)│   │  verification)│   │  scoring)     │
 * └───────────────┘   └───────────────┘   └───────────────┘
 *         │                    │                    │
 *         └────────────────────┼────────────────────┘
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    VERIFICATION PROVIDERS                       │
 * │  (Onfido, Jumio, GreenID, WWCC APIs, ASIC, teaching regs...)   │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * @version 1.0.0
 * @author Chekd Platform Team
 */

// ============================================================================
// CORE ENUMS
// ============================================================================

/**
 * Identity verification status
 */
export enum IdentityStatus {
  /** Identity created but not verified */
  UNVERIFIED = 'unverified',
  /** Verification in progress */
  PENDING = 'pending',
  /** Basic verification complete (email/phone) */
  BASIC = 'basic',
  /** Full identity verified (government ID) */
  VERIFIED = 'verified',
  /** Enhanced verification (credentials) */
  ENHANCED = 'enhanced',
  /** Verification failed */
  FAILED = 'failed',
  /** Identity suspended */
  SUSPENDED = 'suspended',
  /** Identity revoked */
  REVOKED = 'revoked'
}

/**
 * KYC verification levels (progressive)
 */
export enum KycLevel {
  /** No verification performed */
  NONE = 0,
  /** Email and/or phone verified */
  BASIC = 1,
  /** Government ID verified */
  STANDARD = 2,
  /** ID + credentials verified (WWCC, etc.) */
  ENHANCED = 3,
  /** Full business verification (KYB) */
  BUSINESS = 4
}

/**
 * Document types for verification
 */
export enum DocumentType {
  // Identity Documents
  PASSPORT = 'passport',
  DRIVERS_LICENSE = 'drivers_license',
  NATIONAL_ID = 'national_id',
  STATE_ID = 'state_id',
  RESIDENCE_PERMIT = 'residence_permit',
  
  // Proof of Address
  UTILITY_BILL = 'utility_bill',
  BANK_STATEMENT = 'bank_statement',
  TAX_DOCUMENT = 'tax_document',
  GOVERNMENT_LETTER = 'government_letter',
  
  // Business Documents
  BUSINESS_REGISTRATION = 'business_registration',
  CERTIFICATE_OF_INCORPORATION = 'certificate_of_incorporation',
  ARTICLES_OF_ASSOCIATION = 'articles_of_association',
  TRUST_DEED = 'trust_deed',
  PARTNERSHIP_AGREEMENT = 'partnership_agreement',
  
  // Professional Credentials
  WWCC_CARD = 'wwcc_card',
  WWCC_LETTER = 'wwcc_letter',
  DBS_CERTIFICATE = 'dbs_certificate',
  TEACHING_REGISTRATION = 'teaching_registration',
  PROFESSIONAL_LICENSE = 'professional_license',
  QUALIFICATION_CERTIFICATE = 'qualification_certificate',
  
  // Insurance
  PUBLIC_LIABILITY_CERTIFICATE = 'public_liability_certificate',
  PROFESSIONAL_INDEMNITY = 'professional_indemnity',
  WORKERS_COMP = 'workers_comp',
  
  // Other
  SELFIE = 'selfie',
  LIVENESS_VIDEO = 'liveness_video',
  SIGNATURE = 'signature',
  OTHER = 'other'
}

/**
 * Credential types (verifiable credentials)
 */
export enum CredentialType {
  // Safeguarding
  WWCC_NSW = 'wwcc_nsw',
  WWCC_VIC = 'wwcc_vic',
  WWCC_QLD = 'wwcc_qld',
  WWCC_WA = 'wwcc_wa',
  WWCC_SA = 'wwcc_sa',
  WWCC_TAS = 'wwcc_tas',
  WWCC_ACT = 'wwcc_act',
  WWCC_NT = 'wwcc_nt',
  DBS_BASIC = 'dbs_basic',
  DBS_STANDARD = 'dbs_standard',
  DBS_ENHANCED = 'dbs_enhanced',
  PVG_SCOTLAND = 'pvg_scotland',
  VSC_CANADA = 'vsc_canada',
  
  // Teaching Registration
  NESA_NSW = 'nesa_nsw',
  VIT_VIC = 'vit_vic',
  QCT_QLD = 'qct_qld',
  TRBWA_WA = 'trbwa_wa',
  TRB_SA = 'trb_sa',
  TRB_TAS = 'trb_tas',
  TRB_ACT = 'trb_act',
  TRB_NT = 'trb_nt',
  
  // Professional
  FIRST_AID = 'first_aid',
  CPR = 'cpr',
  ANAPHYLAXIS = 'anaphylaxis',
  FOOD_SAFETY = 'food_safety',
  RSA = 'rsa',
  RCG = 'rcg',
  SECURITY_LICENSE = 'security_license',
  
  // Business
  ABN = 'abn',
  ACN = 'acn',
  GST_REGISTRATION = 'gst_registration',
  
  // Qualifications
  BACHELOR_DEGREE = 'bachelor_degree',
  MASTER_DEGREE = 'master_degree',
  DOCTORATE = 'doctorate',
  DIPLOMA = 'diploma',
  CERTIFICATE = 'certificate',
  
  // Insurance
  PUBLIC_LIABILITY = 'public_liability',
  PROFESSIONAL_INDEMNITY = 'professional_indemnity',
  
  // Platform-Specific
  PLATFORM_VERIFIED = 'platform_verified',
  PLATFORM_TRUSTED = 'platform_trusted'
}

/**
 * Credential status
 */
export enum CredentialStatus {
  /** Credential submitted, awaiting verification */
  PENDING = 'pending',
  /** Currently being verified */
  VERIFYING = 'verifying',
  /** Verified and valid */
  VALID = 'valid',
  /** Verification failed */
  FAILED = 'failed',
  /** Expired (past expiry date) */
  EXPIRED = 'expired',
  /** Revoked by issuing authority */
  REVOKED = 'revoked',
  /** Suspended (temporary) */
  SUSPENDED = 'suspended',
  /** Could not be verified (issuer unavailable) */
  UNVERIFIABLE = 'unverifiable'
}

/**
 * Verification check types
 */
export enum VerificationCheckType {
  // Identity Checks
  EMAIL = 'email',
  PHONE = 'phone',
  DOCUMENT = 'document',
  BIOMETRIC = 'biometric',
  LIVENESS = 'liveness',
  ADDRESS = 'address',
  
  // Database Checks
  WATCHLIST = 'watchlist',
  PEP = 'pep',  // Politically Exposed Person
  SANCTIONS = 'sanctions',
  ADVERSE_MEDIA = 'adverse_media',
  
  // Credential Checks
  CREDENTIAL_VALIDITY = 'credential_validity',
  CREDENTIAL_AUTHENTICITY = 'credential_authenticity',
  
  // Business Checks
  BUSINESS_REGISTRATION = 'business_registration',
  DIRECTOR_CHECK = 'director_check',
  UBO_CHECK = 'ubo_check',  // Ultimate Beneficial Owner
  
  // Custom
  CUSTOM = 'custom'
}

/**
 * Verification check status
 */
export enum VerificationCheckStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  PASSED = 'passed',
  FAILED = 'failed',
  NEEDS_REVIEW = 'needs_review',
  EXPIRED = 'expired',
  SKIPPED = 'skipped'
}

/**
 * Verification provider identifiers
 */
export enum VerificationProvider {
  // Identity Verification
  ONFIDO = 'onfido',
  JUMIO = 'jumio',
  VERIFF = 'veriff',
  SUMSUB = 'sumsub',
  GREENID = 'greenid',
  IDV_PACIFIC = 'idv_pacific',
  
  // Australian WWCC
  SERVICE_NSW = 'service_nsw',
  VICTORIA_WWCC = 'victoria_wwcc',
  QUEENSLAND_WWCC = 'queensland_wwcc',
  
  // Teaching Registration
  NESA = 'nesa',
  VIT = 'vit',
  QCT = 'qct',
  
  // Business
  ASIC = 'asic',
  ABR = 'abr',  // Australian Business Register
  
  // UK
  DBS = 'dbs',
  COMPANIES_HOUSE = 'companies_house',
  
  // International
  WORLD_CHECK = 'world_check',
  DOW_JONES = 'dow_jones',
  COMPLY_ADVANTAGE = 'comply_advantage',
  
  // Internal
  MANUAL = 'manual',
  INTERNAL = 'internal'
}

/**
 * Trust score components
 */
export enum TrustComponent {
  IDENTITY_VERIFICATION = 'identity_verification',
  CREDENTIAL_VERIFICATION = 'credential_verification',
  PLATFORM_HISTORY = 'platform_history',
  TRANSACTION_HISTORY = 'transaction_history',
  REVIEW_SCORE = 'review_score',
  RESPONSE_RATE = 'response_rate',
  COMPLETION_RATE = 'completion_rate',
  DISPUTE_HISTORY = 'dispute_history',
  TENURE = 'tenure',
  ACTIVITY_LEVEL = 'activity_level',
  ENDORSEMENTS = 'endorsements',
  COMMUNITY_STANDING = 'community_standing'
}

/**
 * Risk levels
 */
export enum RiskLevel {
  VERY_LOW = 'very_low',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  VERY_HIGH = 'very_high',
  BLOCKED = 'blocked'
}

/**
 * Jurisdiction codes
 */
export enum Jurisdiction {
  // Australia
  AU_NSW = 'AU-NSW',
  AU_VIC = 'AU-VIC',
  AU_QLD = 'AU-QLD',
  AU_WA = 'AU-WA',
  AU_SA = 'AU-SA',
  AU_TAS = 'AU-TAS',
  AU_ACT = 'AU-ACT',
  AU_NT = 'AU-NT',
  
  // UK
  UK_ENGLAND = 'UK-ENG',
  UK_SCOTLAND = 'UK-SCT',
  UK_WALES = 'UK-WLS',
  UK_NI = 'UK-NIR',
  
  // Others
  NZ = 'NZ',
  US = 'US',
  CA = 'CA',
  SG = 'SG',
  
  // Generic
  INTERNATIONAL = 'INTL'
}

// ============================================================================
// IDENTITY INTERFACES
// ============================================================================

/**
 * Core identity record
 */
export interface Identity {
  id: string;
  
  /** Tenant this identity belongs to */
  tenantId: string;
  
  /** External user ID in the platform */
  userId: string;
  
  /** Decentralized Identifier (DID) if using SSI */
  did?: string;
  
  /** Current verification status */
  status: IdentityStatus;
  
  /** Current KYC level achieved */
  kycLevel: KycLevel;
  
  /** Personal information */
  profile: IdentityProfile;
  
  /** Verified contact methods */
  contacts: IdentityContact[];
  
  /** Verification history */
  verifications: VerificationRecord[];
  
  /** Active credentials */
  credentials: Credential[];
  
  /** Trust score */
  trustScore?: TrustScore;
  
  /** Risk assessment */
  riskAssessment?: RiskAssessment;
  
  /** Linked business identities (if any) */
  linkedBusinessIds?: string[];
  
  /** Metadata */
  metadata?: Record<string, any>;
  
  /** When identity was created */
  createdAt: Date;
  
  /** Last update */
  updatedAt: Date;
  
  /** Last verification attempt */
  lastVerifiedAt?: Date;
}

/**
 * Identity profile information
 */
export interface IdentityProfile {
  /** Legal first name */
  firstName?: string;
  
  /** Legal middle name(s) */
  middleName?: string;
  
  /** Legal last name / surname */
  lastName?: string;
  
  /** Full name as it appears on ID */
  fullName?: string;
  
  /** Preferred name / display name */
  preferredName?: string;
  
  /** Date of birth */
  dateOfBirth?: Date;
  
  /** Gender */
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  
  /** Nationality (ISO country code) */
  nationality?: string;
  
  /** Country of residence (ISO country code) */
  countryOfResidence?: string;
  
  /** Primary address */
  address?: Address;
  
  /** Profile photo URL */
  photoUrl?: string;
  
  /** Tax file number (encrypted reference) */
  taxIdReference?: string;
  
  /** Whether this profile has been verified */
  isVerified: boolean;
  
  /** Source of verification */
  verificationSource?: string;
  
  /** When profile was last verified */
  verifiedAt?: Date;
}

/**
 * Address structure
 */
export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  
  /** Is this address verified */
  isVerified?: boolean;
  
  /** Verification method */
  verificationMethod?: string;
  
  /** When verified */
  verifiedAt?: Date;
}

/**
 * Contact method
 */
export interface IdentityContact {
  id: string;
  
  /** Contact type */
  type: 'email' | 'phone' | 'mobile';
  
  /** Contact value */
  value: string;
  
  /** Is this the primary contact of this type */
  isPrimary: boolean;
  
  /** Is this contact verified */
  isVerified: boolean;
  
  /** Verification method */
  verificationMethod?: 'otp' | 'magic_link' | 'voice' | 'manual';
  
  /** When verified */
  verifiedAt?: Date;
  
  /** Verification code (temporary, for pending verifications) */
  verificationCode?: string;
  
  /** Code expiry */
  codeExpiresAt?: Date;
}

// ============================================================================
// VERIFICATION INTERFACES
// ============================================================================

/**
 * Verification session
 */
export interface VerificationSession {
  id: string;
  identityId: string;
  tenantId: string;
  
  /** What type of verification this is */
  verificationType: 'kyc' | 'kyb' | 'credential' | 'document';
  
  /** Target KYC level for this session */
  targetLevel?: KycLevel;
  
  /** Provider handling this verification */
  provider: VerificationProvider;
  
  /** External session ID from provider */
  externalSessionId?: string;
  
  /** URL to redirect user for verification */
  verificationUrl?: string;
  
  /** Current status */
  status: 'created' | 'in_progress' | 'pending_review' | 'completed' | 'failed' | 'expired';
  
  /** Checks performed */
  checks: VerificationCheck[];
  
  /** Documents collected */
  documents: CollectedDocument[];
  
  /** Session expiry */
  expiresAt: Date;
  
  /** Webhook callback URL */
  webhookUrl?: string;
  
  /** Result (when completed) */
  result?: VerificationResult;
  
  /** Metadata */
  metadata?: Record<string, any>;
  
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

/**
 * Individual verification check
 */
export interface VerificationCheck {
  id: string;
  sessionId: string;
  
  /** Type of check */
  type: VerificationCheckType;
  
  /** Provider that performed this check */
  provider: VerificationProvider;
  
  /** External check ID */
  externalCheckId?: string;
  
  /** Check status */
  status: VerificationCheckStatus;
  
  /** Confidence score (0-100) */
  confidenceScore?: number;
  
  /** Check-specific result data */
  resultData?: Record<string, any>;
  
  /** Failure reasons (if failed) */
  failureReasons?: string[];
  
  /** Manual review notes */
  reviewNotes?: string;
  
  /** Reviewer ID (if manually reviewed) */
  reviewedBy?: string;
  
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Collected document during verification
 */
export interface CollectedDocument {
  id: string;
  sessionId: string;
  
  /** Document type */
  type: DocumentType;
  
  /** Document subtype/variant */
  subtype?: string;
  
  /** Issuing country */
  issuingCountry?: string;
  
  /** Document number (partially masked) */
  documentNumber?: string;
  
  /** Issue date */
  issuedDate?: Date;
  
  /** Expiry date */
  expiryDate?: Date;
  
  /** Storage reference (encrypted) */
  storageReference?: string;
  
  /** Whether document is still stored */
  isStored: boolean;
  
  /** When document will be deleted */
  retentionExpiresAt?: Date;
  
  /** Extracted data */
  extractedData?: Record<string, any>;
  
  /** Verification status for this document */
  verificationStatus: 'pending' | 'verified' | 'rejected' | 'expired';
  
  /** Rejection reason */
  rejectionReason?: string;
  
  createdAt: Date;
}

/**
 * Verification result
 */
export interface VerificationResult {
  /** Overall result */
  outcome: 'approved' | 'rejected' | 'review_required';
  
  /** New KYC level achieved (if approved) */
  achievedLevel?: KycLevel;
  
  /** Confidence score (0-100) */
  confidenceScore: number;
  
  /** Summary of checks */
  checksSummary: {
    total: number;
    passed: number;
    failed: number;
    needsReview: number;
  };
  
  /** Risk indicators found */
  riskIndicators?: string[];
  
  /** Recommended actions */
  recommendedActions?: string[];
  
  /** Extracted/verified profile data */
  verifiedProfile?: Partial<IdentityProfile>;
  
  /** Provider's raw response (for debugging) */
  providerResponse?: Record<string, any>;
}

/**
 * Verification record (historical)
 */
export interface VerificationRecord {
  id: string;
  identityId: string;
  
  /** Session that produced this record */
  sessionId: string;
  
  /** Type of verification */
  type: 'kyc' | 'kyb' | 'credential' | 'document';
  
  /** Provider used */
  provider: VerificationProvider;
  
  /** Level before this verification */
  previousLevel: KycLevel;
  
  /** Level after this verification */
  newLevel: KycLevel;
  
  /** Outcome */
  outcome: 'approved' | 'rejected' | 'review_required';
  
  /** Checks performed */
  checksPerformed: VerificationCheckType[];
  
  /** Documents verified */
  documentsVerified: DocumentType[];
  
  /** When this verification occurred */
  verifiedAt: Date;
  
  /** Valid until (for time-limited verifications) */
  validUntil?: Date;
  
  /** Notes */
  notes?: string;
}

// ============================================================================
// CREDENTIAL INTERFACES
// ============================================================================

/**
 * Verified credential
 */
export interface Credential {
  id: string;
  identityId: string;
  tenantId: string;
  
  /** Credential type */
  type: CredentialType;
  
  /** Current status */
  status: CredentialStatus;
  
  /** Credential number/reference */
  credentialNumber?: string;
  
  /** Issuing authority */
  issuer: string;
  
  /** Issuer's jurisdiction */
  jurisdiction: Jurisdiction;
  
  /** Issue date */
  issuedAt?: Date;
  
  /** Expiry date */
  expiresAt?: Date;
  
  /** Last verified with issuer */
  lastVerifiedAt?: Date;
  
  /** Next scheduled verification */
  nextVerificationAt?: Date;
  
  /** Verification provider used */
  verificationProvider?: VerificationProvider;
  
  /** Verification method */
  verificationMethod: 'api' | 'document' | 'manual';
  
  /** Supporting document ID (if document-verified) */
  documentId?: string;
  
  /** Credential-specific data */
  credentialData?: Record<string, any>;
  
  /** W3C Verifiable Credential (if issued as VC) */
  verifiableCredential?: VerifiableCredentialData;
  
  /** Alerts */
  alerts?: CredentialAlert[];
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * W3C Verifiable Credential data
 */
export interface VerifiableCredentialData {
  /** VC ID */
  id: string;
  
  /** VC type */
  type: string[];
  
  /** Issuer DID */
  issuer: string;
  
  /** Issuance date */
  issuanceDate: string;
  
  /** Expiration date */
  expirationDate?: string;
  
  /** Credential subject */
  credentialSubject: Record<string, any>;
  
  /** Proof */
  proof: {
    type: string;
    created: string;
    verificationMethod: string;
    proofPurpose: string;
    proofValue: string;
  };
}

/**
 * Credential alert
 */
export interface CredentialAlert {
  id: string;
  type: 'expiring' | 'expired' | 'verification_due' | 'status_change' | 'revoked';
  message: string;
  severity: 'info' | 'warning' | 'critical';
  createdAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// ============================================================================
// BUSINESS (KYB) INTERFACES
// ============================================================================

/**
 * Business identity
 */
export interface BusinessIdentity {
  id: string;
  tenantId: string;
  
  /** Business name */
  legalName: string;
  
  /** Trading name(s) */
  tradingNames?: string[];
  
  /** Business type */
  entityType: 'sole_trader' | 'partnership' | 'company' | 'trust' | 'association' | 'government';
  
  /** Registration numbers */
  registrations: BusinessRegistration[];
  
  /** Registered address */
  registeredAddress: Address;
  
  /** Business address (if different) */
  businessAddress?: Address;
  
  /** Industry classification */
  industryCode?: string;
  
  /** Business description */
  description?: string;
  
  /** Website */
  website?: string;
  
  /** Directors/officers */
  directors: BusinessPerson[];
  
  /** Ultimate beneficial owners (>25% ownership) */
  beneficialOwners: BusinessPerson[];
  
  /** Authorised representatives */
  authorisedRepresentatives: AuthorisedRepresentative[];
  
  /** Verification status */
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'failed' | 'suspended';
  
  /** KYB level achieved */
  kybLevel: 0 | 1 | 2 | 3;
  
  /** Risk assessment */
  riskAssessment?: RiskAssessment;
  
  /** Trust score */
  trustScore?: TrustScore;
  
  /** Insurance policies */
  insurancePolicies?: InsurancePolicy[];
  
  /** Linked individual identities */
  linkedIdentityIds: string[];
  
  /** Documents */
  documents: CollectedDocument[];
  
  /** Credentials */
  credentials: Credential[];
  
  createdAt: Date;
  updatedAt: Date;
  verifiedAt?: Date;
}

/**
 * Business registration
 */
export interface BusinessRegistration {
  type: 'abn' | 'acn' | 'arbn' | 'company_number' | 'ein' | 'vat' | 'gst' | 'other';
  number: string;
  jurisdiction: Jurisdiction;
  status: 'active' | 'cancelled' | 'deregistered' | 'unknown';
  registeredDate?: Date;
  verifiedAt?: Date;
  verificationProvider?: VerificationProvider;
}

/**
 * Person associated with a business
 */
export interface BusinessPerson {
  /** Link to their individual identity (if on platform) */
  identityId?: string;
  
  /** Full name */
  fullName: string;
  
  /** Date of birth */
  dateOfBirth?: Date;
  
  /** Role */
  role: 'director' | 'secretary' | 'shareholder' | 'ubo' | 'trustee' | 'partner';
  
  /** Ownership percentage (for shareholders/UBOs) */
  ownershipPercent?: number;
  
  /** Appointment date */
  appointedAt?: Date;
  
  /** Resignation date */
  resignedAt?: Date;
  
  /** Is this person verified */
  isVerified: boolean;
  
  /** Verification reference */
  verificationRef?: string;
}

/**
 * Authorised representative
 */
export interface AuthorisedRepresentative {
  /** Link to their individual identity */
  identityId: string;
  
  /** Full name */
  fullName: string;
  
  /** Role/title */
  role: string;
  
  /** What they're authorised to do */
  authorisations: ('sign_contracts' | 'manage_account' | 'make_payments' | 'view_only' | 'full_access')[];
  
  /** Authorisation document */
  authorisationDocumentId?: string;
  
  /** When authorised */
  authorisedAt: Date;
  
  /** Authorisation expiry */
  expiresAt?: Date;
  
  /** Is currently active */
  isActive: boolean;
}

/**
 * Insurance policy
 */
export interface InsurancePolicy {
  id: string;
  type: 'public_liability' | 'professional_indemnity' | 'workers_comp' | 'product_liability' | 'cyber' | 'other';
  policyNumber: string;
  insurer: string;
  coverageAmount: number;
  currency: string;
  startDate: Date;
  endDate: Date;
  status: 'active' | 'expired' | 'cancelled' | 'pending';
  documentId?: string;
  verifiedAt?: Date;
}

// ============================================================================
// TRUST SERVICE INTERFACES
// ============================================================================

/**
 * Trust score
 */
export interface TrustScore {
  /** Overall trust score (0-100) */
  overall: number;
  
  /** Trust tier */
  tier: 'untrusted' | 'basic' | 'verified' | 'trusted' | 'highly_trusted';
  
  /** Component scores */
  components: TrustComponentScore[];
  
  /** Score history (last 12 months) */
  history?: { date: Date; score: number }[];
  
  /** Factors positively affecting score */
  positiveFactors: string[];
  
  /** Factors negatively affecting score */
  negativeFactors: string[];
  
  /** Recommendations to improve score */
  recommendations: string[];
  
  /** When score was last calculated */
  calculatedAt: Date;
  
  /** When score expires (needs recalculation) */
  expiresAt: Date;
}

/**
 * Individual trust component score
 */
export interface TrustComponentScore {
  component: TrustComponent;
  score: number;  // 0-100
  weight: number; // Percentage weight in overall score
  dataPoints: number; // Number of data points used
  lastUpdated: Date;
}

/**
 * Risk assessment
 */
export interface RiskAssessment {
  /** Overall risk level */
  level: RiskLevel;
  
  /** Numeric risk score (0-100, higher = riskier) */
  score: number;
  
  /** Risk categories */
  categories: RiskCategory[];
  
  /** Specific risk flags */
  flags: RiskFlag[];
  
  /** Required actions based on risk */
  requiredActions?: string[];
  
  /** Restrictions applied */
  restrictions?: string[];
  
  /** When assessment was performed */
  assessedAt: Date;
  
  /** Assessment valid until */
  validUntil: Date;
  
  /** Assessor (system or user ID) */
  assessedBy: string;
}

/**
 * Risk category assessment
 */
export interface RiskCategory {
  category: 'identity' | 'financial' | 'compliance' | 'behavioral' | 'geographic' | 'industry';
  level: RiskLevel;
  score: number;
  factors: string[];
}

/**
 * Risk flag
 */
export interface RiskFlag {
  code: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
}

// ============================================================================
// PROVIDER CONFIGURATION INTERFACES
// ============================================================================

/**
 * Verification provider configuration
 */
export interface ProviderConfig {
  provider: VerificationProvider;
  isEnabled: boolean;
  priority: number;  // Lower = higher priority
  
  /** Jurisdictions this provider supports */
  supportedJurisdictions: Jurisdiction[];
  
  /** Document types this provider can verify */
  supportedDocuments: DocumentType[];
  
  /** Check types this provider can perform */
  supportedChecks: VerificationCheckType[];
  
  /** Credential types this provider can verify */
  supportedCredentials: CredentialType[];
  
  /** API configuration */
  apiConfig: {
    baseUrl: string;
    apiKey?: string;
    apiSecret?: string;
    webhookSecret?: string;
    timeout: number;
    retries: number;
  };
  
  /** Cost per verification (for tracking) */
  costPerVerification?: number;
  
  /** SLA configuration */
  sla?: {
    maxResponseTime: number; // seconds
    availabilityTarget: number; // percentage
  };
}

/**
 * Provider health status
 */
export interface ProviderHealth {
  provider: VerificationProvider;
  status: 'healthy' | 'degraded' | 'down' | 'unknown';
  lastChecked: Date;
  responseTime?: number;
  errorRate?: number;
  lastError?: string;
}

// ============================================================================
// AUDIT & COMPLIANCE INTERFACES
// ============================================================================

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string;
  
  /** Entity type being audited */
  entityType: 'identity' | 'business' | 'credential' | 'verification' | 'trust_score';
  
  /** Entity ID */
  entityId: string;
  
  /** Action performed */
  action: string;
  
  /** Actor (user or system) */
  actorType: 'user' | 'system' | 'provider';
  actorId: string;
  
  /** Changes made */
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  
  /** Request context */
  context?: {
    ipAddress?: string;
    userAgent?: string;
    requestId?: string;
  };
  
  /** Timestamp */
  timestamp: Date;
}

/**
 * Data retention policy
 */
export interface RetentionPolicy {
  /** Document/data type */
  dataType: string;
  
  /** How long to retain (days) */
  retentionDays: number;
  
  /** What to do on expiry */
  expiryAction: 'delete' | 'anonymize' | 'archive';
  
  /** Legal basis for retention */
  legalBasis: string;
}

// ============================================================================
// SERVICE INPUT/OUTPUT INTERFACES
// ============================================================================

/**
 * Start verification session input
 */
export interface StartVerificationInput {
  /** Target KYC level */
  targetLevel: KycLevel;
  
  /** Specific checks to perform */
  requiredChecks?: VerificationCheckType[];
  
  /** Specific documents to collect */
  requiredDocuments?: DocumentType[];
  
  /** Redirect URL after completion */
  redirectUrl?: string;
  
  /** Webhook URL for updates */
  webhookUrl?: string;
  
  /** Preferred provider (optional) */
  preferredProvider?: VerificationProvider;
  
  /** Custom data to include */
  metadata?: Record<string, any>;
}

/**
 * Add credential input
 */
export interface AddCredentialInput {
  type: CredentialType;
  credentialNumber: string;
  issuer?: string;
  jurisdiction: Jurisdiction;
  issuedAt?: Date;
  expiresAt?: Date;
  documentId?: string;
  verificationMethod?: 'api' | 'document' | 'manual';
}

/**
 * Trust score calculation input
 */
export interface CalculateTrustScoreInput {
  /** Components to include */
  components?: TrustComponent[];
  
  /** Custom weights (overrides defaults) */
  customWeights?: Partial<Record<TrustComponent, number>>;
  
  /** Include platform-specific data */
  includePlatformData?: boolean;
  
  /** Force recalculation even if cached */
  forceRecalculate?: boolean;
}

/**
 * Risk assessment input
 */
export interface AssessRiskInput {
  /** Transaction/action context */
  context?: {
    type: string;
    amount?: number;
    currency?: string;
    counterpartyId?: string;
  };
  
  /** Force reassessment */
  forceReassess?: boolean;
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

/**
 * Identity repository interface
 */
export interface IdentityRepository {
  // Identity CRUD
  create(identity: Omit<Identity, 'id' | 'createdAt' | 'updatedAt'>): Promise<Identity>;
  findById(tenantId: string, id: string): Promise<Identity | null>;
  findByUserId(tenantId: string, userId: string): Promise<Identity | null>;
  findByDid(did: string): Promise<Identity | null>;
  update(id: string, updates: Partial<Identity>): Promise<Identity>;
  
  // Contact methods
  addContact(identityId: string, contact: Omit<IdentityContact, 'id'>): Promise<IdentityContact>;
  updateContact(contactId: string, updates: Partial<IdentityContact>): Promise<IdentityContact>;
  removeContact(contactId: string): Promise<void>;
  
  // Verification sessions
  createSession(session: Omit<VerificationSession, 'id' | 'createdAt' | 'updatedAt'>): Promise<VerificationSession>;
  getSession(sessionId: string): Promise<VerificationSession | null>;
  updateSession(sessionId: string, updates: Partial<VerificationSession>): Promise<VerificationSession>;
  
  // Credentials
  addCredential(credential: Omit<Credential, 'id' | 'createdAt' | 'updatedAt'>): Promise<Credential>;
  getCredential(identityId: string, credentialId: string): Promise<Credential | null>;
  getCredentialByType(identityId: string, type: CredentialType): Promise<Credential | null>;
  updateCredential(credentialId: string, updates: Partial<Credential>): Promise<Credential>;
  getExpiringCredentials(withinDays: number): Promise<Credential[]>;
  
  // Business
  createBusiness(business: Omit<BusinessIdentity, 'id' | 'createdAt' | 'updatedAt'>): Promise<BusinessIdentity>;
  getBusiness(tenantId: string, businessId: string): Promise<BusinessIdentity | null>;
  updateBusiness(businessId: string, updates: Partial<BusinessIdentity>): Promise<BusinessIdentity>;
  
  // Trust & Risk
  updateTrustScore(identityId: string, score: TrustScore): Promise<void>;
  updateRiskAssessment(identityId: string, assessment: RiskAssessment): Promise<void>;
  
  // Audit
  createAuditLog(entry: Omit<AuditLogEntry, 'id'>): Promise<AuditLogEntry>;
  getAuditLogs(entityType: string, entityId: string, limit?: number): Promise<AuditLogEntry[]>;
}

/**
 * Provider adapter interface (implemented by each provider)
 */
export interface VerificationProviderAdapter {
  /** Provider identifier */
  readonly provider: VerificationProvider;
  
  /** Check if provider is available */
  healthCheck(): Promise<ProviderHealth>;
  
  /** Create a verification session */
  createSession(identity: Identity, input: StartVerificationInput): Promise<{
    externalSessionId: string;
    verificationUrl?: string;
  }>;
  
  /** Get session status from provider */
  getSessionStatus(externalSessionId: string): Promise<{
    status: VerificationSession['status'];
    checks: VerificationCheck[];
    result?: VerificationResult;
  }>;
  
  /** Verify a specific credential */
  verifyCredential(credential: AddCredentialInput): Promise<{
    status: CredentialStatus;
    verifiedData?: Record<string, any>;
    expiresAt?: Date;
  }>;
  
  /** Handle webhook from provider */
  handleWebhook(payload: any, signature: string): Promise<{
    sessionId: string;
    event: string;
    data: any;
  }>;
}
