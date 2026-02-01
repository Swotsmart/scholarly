/**
 * Verification API Client
 * Handles KYC, WWCC, and KYB verification API calls
 */

import api from './api';

// ==========================================================================
// TYPES
// ==========================================================================

export type VerificationProvider = 'stripe_identity' | 'onfido' | 'persona' | 'jumio' | 'veriff' | 'manual';
export type KYCVerificationType = 'document_only' | 'document_and_selfie' | 'document_and_video' | 'enhanced';
export type KYCStatus = 'pending' | 'processing' | 'requires_input' | 'verified' | 'failed' | 'expired';
export type WWCCStatus = 'pending' | 'checking' | 'verified' | 'failed' | 'expired' | 'revoked';
export type WWCCState = 'NSW' | 'VIC' | 'QLD' | 'WA' | 'SA' | 'TAS' | 'NT' | 'ACT';
export type KYBStatus = 'pending' | 'checking' | 'verified' | 'failed' | 'requires_review';

export interface IdentityVerification {
  id: string;
  tenantId: string;
  userId: string;
  provider: VerificationProvider;
  providerSessionId?: string;
  verificationType: KYCVerificationType;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  documentType?: string;
  documentCountry?: string;
  documentExpiresAt?: string;
  status: KYCStatus;
  verifiedAt?: string;
  failureCode?: string;
  failureMessage?: string;
  riskScore?: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WWCCVerification {
  id: string;
  tenantId: string;
  userId: string;
  wwccNumber: string;
  state: WWCCState;
  cardType?: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  status: WWCCStatus;
  registryStatus?: string;
  registryLastChecked?: string;
  verifiedAt?: string;
  verificationMethod?: string;
  verifierNotes?: string;
  issuedAt?: string;
  expiresAt?: string;
  employerRegistrationNumber?: string;
  organisationName?: string;
  cardFrontUrl?: string;
  cardBackUrl?: string;
  lastMonitoredAt?: string;
  monitoringEnabled: boolean;
  alertOnStatusChange: boolean;
  failureCode?: string;
  failureMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BusinessVerification {
  id: string;
  tenantId: string;
  entityType: string;
  entityId: string;
  abn?: string;
  acn?: string;
  abnStatus?: string;
  abnStatusDate?: string;
  gstRegistered?: boolean;
  legalName?: string;
  tradingName?: string;
  businessType?: string;
  businessAddress?: Record<string, unknown>;
  businessStartDate?: string;
  asicStatus?: string;
  registrationAuthority?: string;
  registrationNumber?: string;
  registrationStatus?: string;
  registrationExpiresAt?: string;
  status: KYBStatus;
  verifiedAt?: string;
  verifierNotes?: string;
  riskLevel?: string;
  failureCode?: string;
  failureMessage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ABNLookupResult {
  abn: string;
  abnStatus: string;
  abnStatusEffectiveFrom: string;
  entityName: string;
  entityTypeCode: string;
  entityTypeDescription: string;
  gstRegistered: boolean;
  gstRegisteredFrom?: string;
  businessNames: Array<{ name: string; effectiveFrom: string }>;
  tradingNames: string[];
  mainBusinessLocation: {
    state: string;
    postcode: string;
  };
}

export interface VerificationStatus {
  kyc: {
    status: KYCStatus;
    verification?: IdentityVerification;
    required: boolean;
    canStart: boolean;
  };
  wwcc: {
    status: WWCCStatus;
    verifications: WWCCVerification[];
    required: boolean;
    canStart: boolean;
  };
  kyb?: {
    status: KYBStatus;
    verification?: BusinessVerification;
    required: boolean;
  };
  overallStatus: 'complete' | 'incomplete' | 'pending' | 'failed';
  requirements: string[];
}

export interface StartKYCRequest {
  verificationType?: KYCVerificationType;
  provider?: VerificationProvider;
  returnUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface StartKYCResponse {
  verificationId: string;
  clientSecret?: string;
  verificationUrl?: string;
  provider: VerificationProvider;
  expiresAt?: string;
}

export interface SubmitWWCCRequest {
  wwccNumber: string;
  state: WWCCState;
  cardType?: 'employee' | 'volunteer' | 'both';
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  employerRegistrationNumber?: string;
  organisationName?: string;
}

export interface StateInfo {
  code: WWCCState;
  name: string;
  verificationMethod: 'api' | 'manual';
  cardName: string;
  websiteUrl: string;
  processingTime: string;
}

// ==========================================================================
// DEMO DATA
// ==========================================================================

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE !== 'false';

const DEMO_KYC_VERIFICATION: IdentityVerification = {
  id: 'kyc_demo_1',
  tenantId: 'tenant_demo',
  userId: 'user_tutor_1',
  provider: 'stripe_identity',
  verificationType: 'document_and_selfie',
  firstName: 'Sarah',
  lastName: 'Chen',
  status: 'verified',
  verifiedAt: '2024-01-15T10:30:00Z',
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:30:00Z',
};

const DEMO_WWCC_VERIFICATION: WWCCVerification = {
  id: 'wwcc_demo_1',
  tenantId: 'tenant_demo',
  userId: 'user_tutor_1',
  wwccNumber: 'WWC1234567E',
  state: 'NSW',
  cardType: 'employee',
  firstName: 'Sarah',
  lastName: 'Chen',
  dateOfBirth: '1990-05-15',
  status: 'verified',
  registryStatus: 'current',
  registryLastChecked: '2024-01-20T00:00:00Z',
  verifiedAt: '2024-01-16T14:00:00Z',
  verificationMethod: 'api_check',
  issuedAt: '2023-06-01T00:00:00Z',
  expiresAt: '2028-06-01T00:00:00Z',
  monitoringEnabled: true,
  alertOnStatusChange: true,
  createdAt: '2024-01-16T10:00:00Z',
  updatedAt: '2024-01-20T00:00:00Z',
};

const DEMO_STATES: StateInfo[] = [
  {
    code: 'NSW',
    name: 'New South Wales',
    verificationMethod: 'api',
    cardName: 'Working With Children Check',
    websiteUrl: 'https://www.ocg.nsw.gov.au/working-with-children-check',
    processingTime: 'Instant via API',
  },
  {
    code: 'VIC',
    name: 'Victoria',
    verificationMethod: 'api',
    cardName: 'Working With Children Check',
    websiteUrl: 'https://www.workingwithchildren.vic.gov.au/',
    processingTime: 'Instant via Employer Portal',
  },
  {
    code: 'QLD',
    name: 'Queensland',
    verificationMethod: 'api',
    cardName: 'Blue Card',
    websiteUrl: 'https://www.qld.gov.au/law/laws-regulated-industries-and-accountability/queensland-laws-and-regulations/regulated-industries-and-licensing/blue-card-services',
    processingTime: 'Instant via API',
  },
  {
    code: 'WA',
    name: 'Western Australia',
    verificationMethod: 'manual',
    cardName: 'Working With Children Check',
    websiteUrl: 'https://workingwithchildren.wa.gov.au/',
    processingTime: '1-2 business days',
  },
  {
    code: 'SA',
    name: 'South Australia',
    verificationMethod: 'manual',
    cardName: 'Working With Children Check',
    websiteUrl: 'https://screening.sa.gov.au/',
    processingTime: '1-2 business days',
  },
  {
    code: 'TAS',
    name: 'Tasmania',
    verificationMethod: 'manual',
    cardName: 'Working With Vulnerable People Registration',
    websiteUrl: 'https://www.cbos.tas.gov.au/topics/licensing-and-registration/registrations/work-with-vulnerable-people',
    processingTime: '1-2 business days',
  },
  {
    code: 'NT',
    name: 'Northern Territory',
    verificationMethod: 'manual',
    cardName: 'Working With Children Clearance (Ochre Card)',
    websiteUrl: 'https://nt.gov.au/law/crime/working-with-children-clearance-ochre-card',
    processingTime: '1-2 business days',
  },
  {
    code: 'ACT',
    name: 'Australian Capital Territory',
    verificationMethod: 'manual',
    cardName: 'Working With Vulnerable People Registration',
    websiteUrl: 'https://www.accesscanberra.act.gov.au/s/article/working-with-vulnerable-people-wwvp-registration-tab-overview',
    processingTime: '1-2 business days',
  },
];

// ==========================================================================
// API CLIENT
// ==========================================================================

export const verificationApi = {
  // ==========================================================================
  // KYC (Identity Verification)
  // ==========================================================================

  kyc: {
    /**
     * Start a new KYC verification session
     */
    start: async (request: StartKYCRequest = {}): Promise<StartKYCResponse> => {
      if (DEMO_MODE) {
        return {
          verificationId: 'kyc_demo_new',
          clientSecret: 'demo_client_secret',
          verificationUrl: 'https://verify.stripe.com/demo',
          provider: 'stripe_identity',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
        };
      }
      const response = await api.post<StartKYCResponse>('/verification/kyc/start', request);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Get KYC verification status by session ID
     */
    getStatus: async (sessionId: string): Promise<IdentityVerification> => {
      if (DEMO_MODE) {
        return { ...DEMO_KYC_VERIFICATION, providerSessionId: sessionId };
      }
      const response = await api.get<IdentityVerification>(`/verification/kyc/${sessionId}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Get current user's KYC verification status
     */
    getUserStatus: async (): Promise<{ verification: IdentityVerification | null; canStartNew: boolean }> => {
      if (DEMO_MODE) {
        // Simulate different states based on user
        const currentUser = localStorage.getItem('demo_user_role');
        if (currentUser === 'tutor') {
          return { verification: DEMO_KYC_VERIFICATION, canStartNew: false };
        }
        return { verification: null, canStartNew: true };
      }
      const response = await api.get<{ verification: IdentityVerification | null; canStartNew: boolean }>('/verification/kyc/user/status');
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  },

  // ==========================================================================
  // WWCC (Working With Children Check)
  // ==========================================================================

  wwcc: {
    /**
     * Submit WWCC for verification
     */
    submit: async (request: SubmitWWCCRequest): Promise<WWCCVerification> => {
      if (DEMO_MODE) {
        return {
          ...DEMO_WWCC_VERIFICATION,
          id: `wwcc_${Date.now()}`,
          wwccNumber: request.wwccNumber,
          state: request.state,
          firstName: request.firstName,
          lastName: request.lastName,
          dateOfBirth: request.dateOfBirth,
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      const response = await api.post<WWCCVerification>('/verification/wwcc', request);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Get WWCC verification by ID
     */
    get: async (id: string): Promise<WWCCVerification> => {
      if (DEMO_MODE) {
        return { ...DEMO_WWCC_VERIFICATION, id };
      }
      const response = await api.get<WWCCVerification>(`/verification/wwcc/${id}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Get all WWCC verifications for a user
     */
    getUserVerifications: async (userId?: string): Promise<WWCCVerification[]> => {
      if (DEMO_MODE) {
        return [DEMO_WWCC_VERIFICATION];
      }
      const endpoint = userId ? `/verification/wwcc/user/${userId}` : '/verification/wwcc/user/me';
      const response = await api.get<WWCCVerification[]>(endpoint);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Check if user has valid WWCC
     */
    checkValid: async (userId?: string): Promise<{ hasValidWWCC: boolean; verification?: WWCCVerification }> => {
      if (DEMO_MODE) {
        return { hasValidWWCC: true, verification: DEMO_WWCC_VERIFICATION };
      }
      const endpoint = userId ? `/verification/wwcc/check/${userId}` : '/verification/wwcc/check/me';
      const response = await api.get<{ hasValidWWCC: boolean; verification?: WWCCVerification }>(endpoint);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Get supported states with info
     */
    getStates: async (): Promise<StateInfo[]> => {
      if (DEMO_MODE) {
        return DEMO_STATES;
      }
      const response = await api.get<StateInfo[]>('/verification/wwcc/states');
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Upload WWCC card image
     */
    uploadCardImage: async (verificationId: string, side: 'front' | 'back', file: File): Promise<{ url: string }> => {
      if (DEMO_MODE) {
        return { url: `https://demo.scholarly.app/wwcc/${verificationId}/${side}.jpg` };
      }
      const formData = new FormData();
      formData.append('file', file);
      formData.append('side', side);

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/verification/wwcc/${verificationId}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to upload image');
      return response.json();
    },
  },

  // ==========================================================================
  // KYB (Business Verification)
  // ==========================================================================

  kyb: {
    /**
     * Start business verification
     */
    start: async (request: {
      entityType: string;
      entityId: string;
      abn?: string;
      registrationNumber?: string;
    }): Promise<BusinessVerification> => {
      if (DEMO_MODE) {
        return {
          id: `kyb_${Date.now()}`,
          tenantId: 'tenant_demo',
          entityType: request.entityType,
          entityId: request.entityId,
          abn: request.abn,
          status: 'checking',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
      const response = await api.post<BusinessVerification>('/verification/kyb', request);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Get business verification status
     */
    get: async (id: string): Promise<BusinessVerification> => {
      if (DEMO_MODE) {
        return {
          id,
          tenantId: 'tenant_demo',
          entityType: 'micro_school',
          entityId: 'school_1',
          abn: '51824753556',
          abnStatus: 'active',
          legalName: 'Riverside Learning Academy Pty Ltd',
          tradingName: 'Riverside Learning Academy',
          businessType: 'company',
          gstRegistered: true,
          status: 'verified',
          verifiedAt: '2024-01-10T00:00:00Z',
          createdAt: '2024-01-10T00:00:00Z',
          updatedAt: '2024-01-10T00:00:00Z',
        };
      }
      const response = await api.get<BusinessVerification>(`/verification/kyb/${id}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  },

  // ==========================================================================
  // ABN Lookup
  // ==========================================================================

  abn: {
    /**
     * Look up ABN details
     */
    lookup: async (abn: string): Promise<ABNLookupResult> => {
      if (DEMO_MODE) {
        // Simulate ABN lookup
        const cleanAbn = abn.replace(/\s/g, '');
        if (cleanAbn.length !== 11) {
          throw new Error('Invalid ABN format');
        }
        return {
          abn: cleanAbn,
          abnStatus: 'Active',
          abnStatusEffectiveFrom: '2020-01-01',
          entityName: 'Demo Business Pty Ltd',
          entityTypeCode: 'PRV',
          entityTypeDescription: 'Australian Private Company',
          gstRegistered: true,
          gstRegisteredFrom: '2020-01-01',
          businessNames: [
            { name: 'Demo Business', effectiveFrom: '2020-01-01' },
          ],
          tradingNames: ['Demo Business'],
          mainBusinessLocation: {
            state: 'NSW',
            postcode: '2000',
          },
        };
      }
      const response = await api.get<ABNLookupResult>(`/verification/abn/${abn}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },

    /**
     * Search ABN by business name
     */
    search: async (name: string, state?: string): Promise<ABNLookupResult[]> => {
      if (DEMO_MODE) {
        return [
          {
            abn: '51824753556',
            abnStatus: 'Active',
            abnStatusEffectiveFrom: '2020-01-01',
            entityName: `${name} Pty Ltd`,
            entityTypeCode: 'PRV',
            entityTypeDescription: 'Australian Private Company',
            gstRegistered: true,
            businessNames: [],
            tradingNames: [name],
            mainBusinessLocation: { state: state || 'NSW', postcode: '2000' },
          },
        ];
      }
      const params = new URLSearchParams({ name });
      if (state) params.append('state', state);
      const response = await api.get<ABNLookupResult[]>(`/verification/abn/search?${params}`);
      if (!response.success) throw new Error(response.error);
      return response.data;
    },
  },

  // ==========================================================================
  // Combined Status
  // ==========================================================================

  /**
   * Get complete verification status for current user
   */
  getStatus: async (): Promise<VerificationStatus> => {
    if (DEMO_MODE) {
      const role = localStorage.getItem('demo_user_role') || 'learner';
      const isTutor = role === 'tutor';
      const isParent = role === 'parent';

      return {
        kyc: {
          status: isTutor || isParent ? 'verified' : 'pending',
          verification: isTutor || isParent ? DEMO_KYC_VERIFICATION : undefined,
          required: isTutor || isParent,
          canStart: !isTutor && !isParent,
        },
        wwcc: {
          status: isTutor ? 'verified' : 'pending',
          verifications: isTutor ? [DEMO_WWCC_VERIFICATION] : [],
          required: isTutor,
          canStart: !isTutor,
        },
        overallStatus: isTutor ? 'complete' : isParent ? 'complete' : 'incomplete',
        requirements: isTutor
          ? []
          : isParent
            ? []
            : ['KYC verification not required for learners'],
      };
    }
    const response = await api.get<VerificationStatus>('/verification/status');
    if (!response.success) throw new Error(response.error);
    return response.data;
  },
};

export default verificationApi;
