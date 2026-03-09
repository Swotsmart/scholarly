/**
 * Identity & Auth API Client
 *
 * 42 endpoints across two route files:
 *   auth.ts (10): login, register, refresh, logout, me, CSRF, demo-users, wallet connect/disconnect
 *   identity.ts (32): identity CRUD, contacts, KYC, credentials, business (KYB), trust scoring
 *
 * Backend: routes/auth.ts (428L) + routes/identity.ts (1,503L)
 */

import type {
  AuthUser, LoginInput, RegisterInput, AuthTokens, DemoUser, CsrfToken,
  Identity, CreateIdentityInput, UpdateProfileInput, IdentityContact, AddContactInput,
  KYCStatus, KYCLevelInfo, KYCVerifyInput, KYCSession,
  VerifiableCredential, IssueCredentialInput,
  BusinessEntity, CreateBusinessInput, UpdateBusinessInput, KYBLevelInfo,
  BusinessDirector, BusinessRepresentative, InsurancePolicy, BusinessRegistration,
  TrustScore, TrustRiskAssessment, TrustRequirementsCheck,
} from '@/types/identity';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const AUTH_BASE = `${API_BASE}/api/v1/auth`;
const ID_BASE = `${API_BASE}/api/v1`;

const now = new Date().toISOString();

// =============================================================================
// DEMO DATA
// =============================================================================

const demoAuthUser: AuthUser = { id: 'user-demo-001', tenantId: 'tenant-demo', email: 'sarah@example.com', displayName: 'Sarah Patterson', role: 'parent', permissions: ['read', 'write', 'manage_family'], walletAddress: null, createdAt: '2025-08-15T10:00:00Z' };

const demoIdentity: Identity = {
  id: 'ident-demo-001', tenantId: 'tenant-demo', userId: 'user-demo-001', email: 'sarah@example.com',
  displayName: 'Sarah Patterson', legalFirstName: 'Sarah', legalLastName: 'Patterson',
  dateOfBirth: '1988-04-12', nationality: 'AU', jurisdiction: 'WA', identityType: 'individual',
  status: 'active', kycLevel: 2,
  address: { line1: '45 Marine Terrace', suburb: 'Fremantle', state: 'WA', postcode: '6160', country: 'AU' },
  metadata: { homeschoolRegNo: 'WA-HS-2025-5678' },
  contacts: [
    { id: 'contact-001', identityId: 'ident-demo-001', type: 'email', value: 'sarah@example.com', label: 'Primary', isPrimary: true, status: 'verified', verifiedAt: '2025-08-15T10:00:00Z', createdAt: '2025-08-15T10:00:00Z' },
    { id: 'contact-002', identityId: 'ident-demo-001', type: 'phone', value: '+61 412 345 678', label: 'Mobile', isPrimary: false, status: 'verified', verifiedAt: '2025-08-16T09:00:00Z', createdAt: '2025-08-16T09:00:00Z' },
  ],
  createdAt: '2025-08-15T10:00:00Z', updatedAt: now,
};

const demoKYCStatus: KYCStatus = { identityId: 'ident-demo-001', currentLevel: 2, status: 'completed', checks: [{ type: 'email_verification', status: 'passed', completedAt: '2025-08-15T10:00:00Z' }, { type: 'identity_document', status: 'passed', completedAt: '2025-08-20T14:00:00Z', provider: 'scholarly' }, { type: 'wwcc', status: 'pending' }], lastCheckedAt: now };

const demoTrustScore: TrustScore = { identityId: 'ident-demo-001', overallScore: 78, components: [{ name: 'Identity Verification', score: 85, weight: 0.3, factors: [{ factor: 'KYC Level 2', value: 85, impact: 'positive' }] }, { name: 'Platform Engagement', score: 72, weight: 0.2, factors: [{ factor: 'Active 6+ months', value: 75, impact: 'positive' }] }, { name: 'Community Standing', score: 80, weight: 0.2, factors: [{ factor: 'Positive reviews', value: 80, impact: 'positive' }] }], riskLevel: 'low', lastCalculated: now };

// =============================================================================
// API CLIENT
// =============================================================================

class IdentityApiClient {
  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: body ? JSON.stringify(body) : undefined });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error?.message || e.message || `HTTP ${res.status}`); }
    const json = await res.json();
    return json.data ?? json;
  }
  private auth<T>(method: string, ep: string, body?: unknown) { return this.request<T>(method, `${AUTH_BASE}${ep}`, body); }
  private id<T>(method: string, ep: string, body?: unknown) { return this.request<T>(method, `${ID_BASE}${ep}`, body); }

  // =========================================================================
  // AUTH (10 endpoints)
  // =========================================================================
  async login(input: LoginInput): Promise<AuthTokens & { user: AuthUser }> { if (DEMO_MODE) return { accessToken: 'demo-token', refreshToken: 'demo-refresh', expiresIn: 3600, user: demoAuthUser }; return this.auth('POST', '/login', input); }
  async register(input: RegisterInput): Promise<AuthTokens & { user: AuthUser }> { if (DEMO_MODE) return { accessToken: 'demo-token', refreshToken: 'demo-refresh', expiresIn: 3600, user: { ...demoAuthUser, email: input.email, displayName: input.displayName } }; return this.auth('POST', '/register', input); }
  async refreshToken(): Promise<AuthTokens> { if (DEMO_MODE) return { accessToken: 'demo-token-refreshed', refreshToken: 'demo-refresh-2', expiresIn: 3600 }; return this.auth('POST', '/refresh'); }
  async logout(): Promise<void> { if (DEMO_MODE) return; await this.auth('POST', '/logout'); }
  async logoutAll(): Promise<void> { if (DEMO_MODE) return; await this.auth('POST', '/logout-all'); }
  async getMe(): Promise<AuthUser> { if (DEMO_MODE) return demoAuthUser; return this.auth('GET', '/me'); }
  async getCsrfToken(): Promise<CsrfToken> { if (DEMO_MODE) return { csrfToken: 'demo-csrf-token' }; return this.auth('GET', '/csrf-token'); }
  async getDemoUsers(): Promise<DemoUser[]> { if (DEMO_MODE) return [{ email: 'parent@demo.com', role: 'parent', displayName: 'Sarah Patterson', description: 'Homeschool parent with 2 children' }, { email: 'teacher@demo.com', role: 'teacher', displayName: 'Dr. James Mitchell', description: 'Year 5 teacher at Fremantle PS' }, { email: 'admin@demo.com', role: 'admin', displayName: 'Platform Admin', description: 'Full platform access' }]; return this.auth('GET', '/demo-users'); }
  async connectWallet(address: string, signature: string): Promise<{ user: AuthUser }> { if (DEMO_MODE) return { user: { ...demoAuthUser, walletAddress: address } }; return this.auth('POST', '/connect-wallet', { walletAddress: address, signature }); }
  async disconnectWallet(): Promise<{ user: AuthUser }> { if (DEMO_MODE) return { user: { ...demoAuthUser, walletAddress: null } }; return this.auth('POST', '/disconnect-wallet'); }

  // =========================================================================
  // IDENTITY MANAGEMENT (8 endpoints)
  // =========================================================================
  async createIdentity(input: CreateIdentityInput): Promise<Identity> { if (DEMO_MODE) return { ...demoIdentity, email: input.email, displayName: input.displayName }; return this.id('POST', '/identity', input); }
  async getMyIdentity(): Promise<Identity> { if (DEMO_MODE) return demoIdentity; return this.id('GET', '/identity/me'); }
  async getIdentity(identityId: string): Promise<Identity> { if (DEMO_MODE) return demoIdentity; return this.id('GET', `/identity/${identityId}`); }
  async updateProfile(identityId: string, input: UpdateProfileInput): Promise<Identity> { if (DEMO_MODE) return { ...demoIdentity, ...input, updatedAt: now }; return this.id('PUT', `/identity/${identityId}/profile`, input); }
  async suspendIdentity(identityId: string, reason: string): Promise<Identity> { if (DEMO_MODE) return { ...demoIdentity, status: 'suspended' }; return this.id('POST', `/identity/${identityId}/suspend`, { reason }); }
  async reinstateIdentity(identityId: string): Promise<Identity> { if (DEMO_MODE) return { ...demoIdentity, status: 'active' }; return this.id('POST', `/identity/${identityId}/reinstate`); }
  async addContact(identityId: string, input: AddContactInput): Promise<IdentityContact> { if (DEMO_MODE) return { id: `contact-${Date.now()}`, identityId, type: input.type, value: input.value, label: input.label, isPrimary: input.isPrimary || false, status: 'unverified', createdAt: now }; return this.id('POST', `/identity/${identityId}/contacts`, input); }
  async sendVerificationCode(identityId: string, contactId: string): Promise<{ sent: boolean }> { if (DEMO_MODE) return { sent: true }; return this.id('POST', `/identity/${identityId}/contacts/${contactId}/send-code`); }
  async verifyContact(identityId: string, contactId: string, code: string): Promise<IdentityContact> { if (DEMO_MODE) return { ...demoIdentity.contacts[0], id: contactId, status: 'verified', verifiedAt: now }; return this.id('POST', `/identity/${identityId}/contacts/${contactId}/verify`, { code }); }
  async deleteContact(identityId: string, contactId: string): Promise<{ deleted: boolean }> { if (DEMO_MODE) return { deleted: true }; return this.id('DELETE', `/identity/${identityId}/contacts/${contactId}`); }

  // =========================================================================
  // KYC (5 endpoints)
  // =========================================================================
  async getKYCStatus(): Promise<KYCStatus> { if (DEMO_MODE) return demoKYCStatus; return this.id('GET', '/kyc/status'); }
  async getKYCLevels(): Promise<KYCLevelInfo> { if (DEMO_MODE) return { currentLevel: 2, levels: [{ level: 0, name: 'Unverified', description: 'No verification', requirements: [], currentlyMet: true, missingRequirements: [], capabilities: ['Browse marketplace'] }, { level: 1, name: 'Email Verified', description: 'Email confirmed', requirements: ['Verified email'], currentlyMet: true, missingRequirements: [], capabilities: ['Enroll learners', 'Use Ask Issy'] }, { level: 2, name: 'Identity Verified', description: 'Government ID check', requirements: ['Government ID', 'Selfie match'], currentlyMet: true, missingRequirements: [], capabilities: ['Create content', 'Join co-ops', 'Receive payouts'] }, { level: 3, name: 'WWCC Verified', description: 'Working With Children Check', requirements: ['Valid WWCC'], currentlyMet: false, missingRequirements: ['Valid WWCC in WA'], capabilities: ['Teach in co-ops', 'Host excursions'] }] }; return this.id('GET', '/kyc/level'); }
  async submitKYCVerification(input: KYCVerifyInput): Promise<KYCSession> { if (DEMO_MODE) return { sessionId: `kyc_${Date.now()}`, status: 'pending', verificationType: input.verificationType, createdAt: now, expiresAt: new Date(Date.now() + 86400000).toISOString() }; return this.id('POST', '/kyc/verify', input); }
  async getKYCSession(sessionId: string): Promise<KYCSession> { if (DEMO_MODE) return { sessionId, status: 'completed', verificationType: 'document', result: { verified: true, confidence: 0.95, details: {} }, createdAt: now, expiresAt: new Date(Date.now() + 86400000).toISOString() }; return this.id('GET', `/kyc/session/${sessionId}`); }

  // =========================================================================
  // CREDENTIALS / SSI (3 endpoints)
  // =========================================================================
  async getCredentials(): Promise<VerifiableCredential[]> { if (DEMO_MODE) return [{ id: 'cred-001', identityId: 'ident-demo-001', type: 'HomeschoolRegistration', issuer: 'WA Department of Education', issuedAt: '2025-06-01T00:00:00Z', expiresAt: '2027-06-01T00:00:00Z', status: 'active', claims: { registrationNumber: 'WA-HS-2025-5678', jurisdiction: 'WA' } }]; return this.id('GET', '/credentials'); }
  async issueCredential(input: IssueCredentialInput): Promise<VerifiableCredential> { if (DEMO_MODE) return { id: `cred-${Date.now()}`, identityId: 'ident-demo-001', type: input.type, issuer: 'Scholarly Platform', issuedAt: now, expiresAt: input.expiresAt, status: 'active', claims: input.claims }; return this.id('POST', '/credentials', input); }
  async verifyCredential(credentialId: string): Promise<{ valid: boolean; credential: VerifiableCredential }> { if (DEMO_MODE) return { valid: true, credential: { id: credentialId, identityId: 'ident-demo-001', type: 'HomeschoolRegistration', issuer: 'WA Department of Education', issuedAt: '2025-06-01T00:00:00Z', status: 'active', claims: {} } }; return this.id('POST', `/credentials/${credentialId}/verify`); }

  // =========================================================================
  // BUSINESS / KYB (10 endpoints)
  // =========================================================================
  async createBusiness(input: CreateBusinessInput): Promise<BusinessEntity> { if (DEMO_MODE) return { id: `biz-${Date.now()}`, tenantId: 'tenant-demo', identityId: 'ident-demo-001', ...input, status: 'pending', kybLevel: 0, directors: [], representatives: [], registrations: [], insurancePolicies: [], createdAt: now, updatedAt: now } as BusinessEntity; return this.id('POST', '/business', input); }
  async getBusiness(businessId: string): Promise<BusinessEntity> { if (DEMO_MODE) return { id: businessId, tenantId: 'tenant-demo', identityId: 'ident-demo-001', legalName: 'Bright Minds Education Pty Ltd', tradingName: 'Bright Minds Tutoring', businessType: 'company', abn: '12 345 678 901', acn: '123 456 789', jurisdiction: 'WA', registeredAddress: { line1: '45 High Street', suburb: 'Fremantle', state: 'WA', postcode: '6160', country: 'AU' }, status: 'active', kybLevel: 2, directors: [{ name: 'Sarah Mitchell', role: 'Director', appointedAt: '2023-01-15T00:00:00Z' }], representatives: [], registrations: [{ id: 'reg-001', type: 'ABN', registrationNumber: '12 345 678 901', issuingBody: 'ATO', jurisdiction: 'AU', issuedAt: '2023-01-15T00:00:00Z', status: 'active' }], insurancePolicies: [{ id: 'ins-001', type: 'Professional Indemnity', provider: 'QBE', policyNumber: 'PI-2025-1234', coverageAmount: 5000000, currency: 'AUD', startDate: '2025-01-01T00:00:00Z', endDate: '2026-01-01T00:00:00Z', status: 'active' }], createdAt: '2023-01-15T00:00:00Z', updatedAt: now }; return this.id('GET', `/business/${businessId}`); }
  async updateBusiness(businessId: string, input: UpdateBusinessInput): Promise<BusinessEntity> { if (DEMO_MODE) return this.getBusiness(businessId); return this.id('PUT', `/business/${businessId}`, input); }
  async addRegistration(businessId: string, reg: Omit<BusinessRegistration, 'id'>): Promise<BusinessRegistration> { if (DEMO_MODE) return { ...reg, id: `reg-${Date.now()}` } as BusinessRegistration; return this.id('POST', `/business/${businessId}/registrations`, reg); }
  async addDirector(businessId: string, director: BusinessDirector): Promise<BusinessDirector> { if (DEMO_MODE) return director; return this.id('POST', `/business/${businessId}/directors`, director); }
  async removeDirector(businessId: string, name: string): Promise<{ removed: boolean }> { if (DEMO_MODE) return { removed: true }; return this.id('DELETE', `/business/${businessId}/directors/${encodeURIComponent(name)}`); }
  async addRepresentative(businessId: string, rep: Omit<BusinessRepresentative, 'id'>): Promise<BusinessRepresentative> { if (DEMO_MODE) return { ...rep, id: `rep-${Date.now()}` } as BusinessRepresentative; return this.id('POST', `/business/${businessId}/representatives`, rep); }
  async removeRepresentative(businessId: string, repId: string): Promise<{ removed: boolean }> { if (DEMO_MODE) return { removed: true }; return this.id('DELETE', `/business/${businessId}/representatives/${repId}`); }
  async addInsurance(businessId: string, policy: Omit<InsurancePolicy, 'id'>): Promise<InsurancePolicy> { if (DEMO_MODE) return { ...policy, id: `ins-${Date.now()}` } as InsurancePolicy; return this.id('POST', `/business/${businessId}/insurance`, policy); }
  async getKYBLevels(businessId: string): Promise<KYBLevelInfo> { if (DEMO_MODE) return { currentLevel: 2, levels: [{ level: 0, name: 'Unverified Business', requirements: [], currentlyMet: true, missingRequirements: [], capabilities: ['Create profile'] }, { level: 1, name: 'ABN Verified', requirements: ['Valid ABN'], currentlyMet: true, missingRequirements: [], capabilities: ['List offerings'] }, { level: 2, name: 'Fully Verified', requirements: ['ABN', 'Insurance', 'Director ID'], currentlyMet: true, missingRequirements: [], capabilities: ['Accept payments', 'Featured listings'] }] }; return this.id('GET', `/business/${businessId}/kyb-level`); }

  // =========================================================================
  // TRUST ENGINE (4 endpoints)
  // =========================================================================
  async getTrustScore(): Promise<TrustScore> { if (DEMO_MODE) return demoTrustScore; return this.id('GET', '/trust/score'); }
  async calculateTrust(): Promise<TrustScore> { if (DEMO_MODE) return demoTrustScore; return this.id('POST', '/trust/calculate'); }
  async getRiskAssessment(): Promise<TrustRiskAssessment> { if (DEMO_MODE) return { identityId: 'ident-demo-001', riskLevel: 'low', riskFactors: [], recommendations: ['Consider completing WWCC verification for enhanced trust'], lastAssessed: now }; return this.id('GET', '/trust/risk'); }
  async checkRequirements(action: string): Promise<TrustRequirementsCheck> { if (DEMO_MODE) return { action, allowed: true, requirements: [{ requirement: 'KYC Level 2', met: true, description: 'Identity verified' }, { requirement: 'Active subscription', met: true, description: 'Family plan active' }], missingRequirements: [] }; return this.id('POST', '/trust/check-requirements', { action }); }
}

export const identityApi = new IdentityApiClient();
