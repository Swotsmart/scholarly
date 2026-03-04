/**
 * Identity & Auth Type Definitions
 *
 * Types for authentication, identity management, KYC/KYB verification,
 * verifiable credentials (SSI), and the trust scoring engine.
 * Australian education context: WWCC, NESA, VIT, ABN/ACN.
 *
 * Backend sources:
 *   routes/auth.ts (428L, 10 endpoints)
 *   routes/identity.ts (1,503L, 32 endpoints)
 */

// =============================================================================
// AUTH
// =============================================================================

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
  walletAddress?: string | null;
  createdAt: string;
}

export interface LoginInput {
  email: string;
  password: string;
  tenantId?: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  displayName: string;
  role?: string;
  tenantId?: string;
  jurisdiction?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface DemoUser {
  email: string;
  role: string;
  displayName: string;
  description: string;
}

export interface CsrfToken {
  csrfToken: string;
}

// =============================================================================
// IDENTITY
// =============================================================================

export type IdentityType = 'individual' | 'organisation';
export type IdentityStatus = 'active' | 'suspended' | 'pending_verification';
export type ContactType = 'email' | 'phone' | 'address';
export type ContactStatus = 'unverified' | 'pending' | 'verified';

export interface IdentityAddress {
  line1?: string;
  line2?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  country?: string;
}

export interface Identity {
  id: string;
  tenantId: string;
  userId: string;
  email: string;
  displayName: string;
  legalFirstName?: string;
  legalLastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  jurisdiction?: string;
  identityType: IdentityType;
  status: IdentityStatus;
  kycLevel: number;
  address?: IdentityAddress;
  metadata: Record<string, string>;
  contacts: IdentityContact[];
  createdAt: string;
  updatedAt: string;
}

export interface IdentityContact {
  id: string;
  identityId: string;
  type: ContactType;
  value: string;
  label?: string;
  isPrimary: boolean;
  status: ContactStatus;
  verifiedAt?: string;
  createdAt: string;
}

export interface CreateIdentityInput {
  email: string;
  displayName: string;
  legalFirstName?: string;
  legalLastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  jurisdiction?: string;
  identityType?: IdentityType;
}

export interface UpdateProfileInput {
  displayName?: string;
  legalFirstName?: string;
  legalLastName?: string;
  dateOfBirth?: string;
  nationality?: string;
  jurisdiction?: string;
  phoneNumber?: string;
  address?: IdentityAddress;
  metadata?: Record<string, string>;
}

export interface AddContactInput {
  type: ContactType;
  value: string;
  label?: string;
  isPrimary?: boolean;
}

// =============================================================================
// KYC
// =============================================================================

export type KYCLevel = 0 | 1 | 2 | 3 | 4;

export interface KYCStatus {
  identityId: string;
  currentLevel: KYCLevel;
  status: 'not_started' | 'in_progress' | 'completed' | 'failed';
  checks: KYCCheck[];
  lastCheckedAt?: string;
}

export interface KYCCheck {
  type: string;
  status: 'passed' | 'failed' | 'pending' | 'expired';
  completedAt?: string;
  expiresAt?: string;
  provider?: string;
}

export interface KYCLevelRequirements {
  level: KYCLevel;
  name: string;
  description: string;
  requirements: string[];
  currentlyMet: boolean;
  missingRequirements: string[];
  capabilities: string[];
}

export interface KYCLevelInfo {
  currentLevel: KYCLevel;
  levels: KYCLevelRequirements[];
}

export interface KYCVerifyInput {
  verificationType: 'document' | 'wwcc' | 'teacher_registration' | 'abn_acn';
  documentType?: string;
  documentNumber?: string;
  issuingAuthority?: string;
  jurisdiction?: string;
}

export interface KYCSession {
  sessionId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'expired';
  verificationType: string;
  result?: { verified: boolean; confidence: number; details: Record<string, unknown> };
  createdAt: string;
  expiresAt: string;
}

// =============================================================================
// VERIFIABLE CREDENTIALS (SSI)
// =============================================================================

export type CredentialStatus = 'active' | 'revoked' | 'expired' | 'pending';

export interface VerifiableCredential {
  id: string;
  identityId: string;
  type: string;
  issuer: string;
  issuedAt: string;
  expiresAt?: string;
  status: CredentialStatus;
  claims: Record<string, unknown>;
  verificationMethod?: string;
  proof?: Record<string, unknown>;
}

export interface IssueCredentialInput {
  type: string;
  claims: Record<string, unknown>;
  expiresAt?: string;
}

// =============================================================================
// BUSINESS (KYB)
// =============================================================================

export type BusinessType = 'sole_trader' | 'company' | 'trust' | 'partnership' | 'association' | 'not_for_profit';
export type BusinessStatus = 'pending' | 'active' | 'suspended';

export interface BusinessEntity {
  id: string;
  tenantId: string;
  identityId: string;
  legalName: string;
  tradingName?: string;
  businessType: BusinessType;
  abn?: string;
  acn?: string;
  jurisdiction: string;
  registeredAddress: IdentityAddress;
  status: BusinessStatus;
  kybLevel: number;
  directors: BusinessDirector[];
  representatives: BusinessRepresentative[];
  registrations: BusinessRegistration[];
  insurancePolicies: InsurancePolicy[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDirector {
  name: string;
  role: string;
  identityId?: string;
  appointedAt?: string;
}

export interface BusinessRepresentative {
  id: string;
  name: string;
  role: string;
  identityId?: string;
  wwccNumber?: string;
  wwccJurisdiction?: string;
}

export interface BusinessRegistration {
  id: string;
  type: string;
  registrationNumber: string;
  issuingBody: string;
  jurisdiction: string;
  issuedAt: string;
  expiresAt?: string;
  status: 'active' | 'expired' | 'pending';
}

export interface InsurancePolicy {
  id: string;
  type: string;
  provider: string;
  policyNumber: string;
  coverageAmount: number;
  currency: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
}

export interface CreateBusinessInput {
  legalName: string;
  tradingName?: string;
  businessType: BusinessType;
  abn?: string;
  acn?: string;
  jurisdiction: string;
  registeredAddress: IdentityAddress;
}

export interface UpdateBusinessInput {
  legalName?: string;
  tradingName?: string;
  abn?: string;
  acn?: string;
  registeredAddress?: IdentityAddress;
}

export interface KYBLevelInfo {
  currentLevel: number;
  levels: Array<{
    level: number;
    name: string;
    requirements: string[];
    currentlyMet: boolean;
    missingRequirements: string[];
    capabilities: string[];
  }>;
}

// =============================================================================
// TRUST ENGINE
// =============================================================================

export interface TrustScore {
  identityId: string;
  overallScore: number;
  components: TrustComponent[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  lastCalculated: string;
}

export interface TrustComponent {
  name: string;
  score: number;
  weight: number;
  factors: Array<{ factor: string; value: number; impact: 'positive' | 'negative' | 'neutral' }>;
}

export interface TrustRiskAssessment {
  identityId: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: Array<{ factor: string; severity: string; description: string; mitigations: string[] }>;
  recommendations: string[];
  lastAssessed: string;
}

export interface TrustRequirementsCheck {
  action: string;
  allowed: boolean;
  requirements: Array<{ requirement: string; met: boolean; description: string }>;
  missingRequirements: string[];
}
