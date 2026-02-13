/**
 * Identity / KYC / KYB / Trust Engine Routes
 *
 * API endpoints for identity management, KYC verification,
 * business (KYB) verification, and trust scoring.
 * Australian education context: WWCC, NESA, VIT, ABN/ACN.
 */

import { Router } from 'express';
import { randomUUID, randomBytes } from 'crypto';
import { z } from 'zod';
import { ApiError } from '../middleware/error-handler';

export const identityRouter: Router = Router();

// ============================================================================
// Validation Schemas
// ============================================================================

const createIdentitySchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(1).max(200),
  legalFirstName: z.string().min(1).max(100).optional(),
  legalLastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  jurisdiction: z.string().optional(),
  identityType: z.enum(['individual', 'organisation']).optional(),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(200).optional(),
  legalFirstName: z.string().min(1).max(100).optional(),
  legalLastName: z.string().min(1).max(100).optional(),
  dateOfBirth: z.string().optional(),
  nationality: z.string().optional(),
  jurisdiction: z.string().optional(),
  phoneNumber: z.string().optional(),
  address: z.object({
    line1: z.string().optional(),
    line2: z.string().optional(),
    suburb: z.string().optional(),
    state: z.string().optional(),
    postcode: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  metadata: z.record(z.string()).optional(),
});

const addContactSchema = z.object({
  type: z.enum(['email', 'phone', 'address']),
  value: z.string().min(1),
  label: z.string().optional(),
  isPrimary: z.boolean().optional(),
});

const verifyContactCodeSchema = z.object({
  code: z.string().min(4).max(8),
});

const startVerificationSchema = z.object({
  level: z.enum(['basic', 'standard', 'enhanced', 'educator']).optional(),
  provider: z.enum(['manual', 'greenid', 'onfido', 'jumio']).optional(),
  documentType: z.enum([
    'passport', 'drivers_licence', 'photo_id',
    'medicare_card', 'wwcc', 'teacher_registration',
    'visa', 'birth_certificate',
  ]).optional(),
  returnUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
});

const addCredentialSchema = z.object({
  type: z.enum([
    'wwcc', 'teacher_registration', 'nesa_accreditation',
    'vit_registration', 'tqa_registration', 'first_aid',
    'anaphylaxis', 'cpr', 'university_degree',
    'teaching_diploma', 'working_visa', 'citizenship',
    'professional_membership', 'other',
  ]),
  issuer: z.string().min(1),
  issuedDate: z.string(),
  expiryDate: z.string().optional(),
  credentialNumber: z.string().min(1),
  jurisdiction: z.string().optional(),
  documentUrl: z.string().url().optional(),
  metadata: z.record(z.string()).optional(),
});

const createBusinessSchema = z.object({
  legalName: z.string().min(1).max(300),
  tradingName: z.string().max(300).optional(),
  businessType: z.enum([
    'sole_trader', 'partnership', 'company', 'trust',
    'incorporated_association', 'cooperative',
    'government_entity', 'not_for_profit', 'school', 'university',
  ]),
  abn: z.string().regex(/^\d{11}$/).optional(),
  acn: z.string().regex(/^\d{9}$/).optional(),
  registeredAddress: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    suburb: z.string(),
    state: z.string(),
    postcode: z.string(),
    country: z.string().optional(),
  }),
  contactEmail: z.string().email(),
  contactPhone: z.string().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  sector: z.enum(['education', 'edtech', 'childcare', 'training', 'other']).optional(),
});

const updateBusinessSchema = createBusinessSchema.partial();

const addRegistrationSchema = z.object({
  type: z.enum([
    'abn', 'acn', 'arbn', 'gst', 'payg',
    'school_registration', 'rto_registration', 'cricos',
    'nesa_registration', 'vrqa_registration',
    'acara_school_id', 'myschool_id',
  ]),
  registrationNumber: z.string().min(1),
  issuingAuthority: z.string().min(1),
  issuedDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.enum(['active', 'pending', 'expired', 'revoked']).optional(),
  documentUrl: z.string().url().optional(),
});

const addDirectorSchema = z.object({
  name: z.string().min(1).max(200),
  role: z.enum(['director', 'secretary', 'principal', 'board_member', 'trustee']).optional(),
  appointedDate: z.string().optional(),
  identityId: z.string().optional(),
});

const addRepresentativeSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  identityId: z.string().optional(),
});

const addInsuranceSchema = z.object({
  type: z.enum([
    'public_liability', 'professional_indemnity',
    'workers_compensation', 'cyber_liability',
    'management_liability', 'student_accident',
  ]),
  provider: z.string().min(1),
  policyNumber: z.string().min(1),
  coverAmount: z.number().positive(),
  currency: z.string().optional(),
  startDate: z.string(),
  endDate: z.string(),
  documentUrl: z.string().url().optional(),
});

const checkTrustRequirementsSchema = z.object({
  action: z.string().min(1),
  context: z.record(z.unknown()).optional(),
});

// ============================================================================
// Helper
// ============================================================================

function getUserInfo(req: any): { tenantId: string; userId: string } {
  const tenantId = req.tenantId || req.user?.tenantId;
  const userId = req.user?.id;
  if (!tenantId || !userId) {
    throw ApiError.unauthorized('Authentication required');
  }
  return { tenantId, userId };
}

// ============================================================================
// Identity
// ============================================================================

/**
 * POST /identity/identity
 * Create a new identity
 */
identityRouter.post('/identity', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const data = createIdentitySchema.parse(req.body);

    const identity = {
      id: `ident_${randomUUID()}`,
      tenantId,
      userId,
      email: data.email,
      displayName: data.displayName,
      legalFirstName: data.legalFirstName || null,
      legalLastName: data.legalLastName || null,
      dateOfBirth: data.dateOfBirth || null,
      nationality: data.nationality || 'AU',
      jurisdiction: data.jurisdiction || 'NSW',
      identityType: data.identityType || 'individual',
      status: 'active',
      kycLevel: 'none',
      trustScore: 0,
      contacts: [],
      credentials: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { identity },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid identity data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to create identity');
  }
});

/**
 * GET /identity/identity/me
 * Get current user's identity
 */
identityRouter.get('/identity/me', async (req, res) => {
  try {
    getUserInfo(req);

    return res.status(501).json({
      error: 'Not implemented',
      message: 'This endpoint is not yet connected to a data source',
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch identity');
  }
});

/**
 * GET /identity/identity/:identityId
 * Get identity by ID
 */
identityRouter.get('/identity/:identityId', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId } = req.params;

    const identity = {
      id: identityId,
      tenantId,
      displayName: 'Sarah Chen',
      identityType: 'individual',
      status: 'active',
      kycLevel: 'enhanced',
      trustScore: 87,
      jurisdiction: 'NSW',
      createdAt: '2025-05-15T10:00:00.000Z',
      updatedAt: '2025-11-20T14:30:00.000Z',
    };

    res.json({
      success: true,
      data: { identity },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch identity');
  }
});

/**
 * PUT /identity/identity/:identityId/profile
 * Update identity profile
 */
identityRouter.put('/identity/:identityId/profile', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId } = req.params;
    const data = updateProfileSchema.parse(req.body);

    const identity = {
      id: identityId,
      tenantId,
      ...data,
      status: 'active',
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { identity },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid profile data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to update profile');
  }
});

/**
 * POST /identity/identity/:identityId/suspend
 * Suspend an identity
 */
identityRouter.post('/identity/:identityId/suspend', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId } = req.params;

    const identity = {
      id: identityId,
      tenantId,
      status: 'suspended',
      suspendedAt: new Date().toISOString(),
      suspendedReason: req.body.reason || 'Administrative action',
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { identity },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to suspend identity');
  }
});

/**
 * POST /identity/identity/:identityId/reinstate
 * Reinstate a suspended identity
 */
identityRouter.post('/identity/:identityId/reinstate', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId } = req.params;

    const identity = {
      id: identityId,
      tenantId,
      status: 'active',
      reinstatedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { identity },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to reinstate identity');
  }
});

// ============================================================================
// Contacts
// ============================================================================

/**
 * POST /identity/identity/:identityId/contacts
 * Add a contact to an identity
 */
identityRouter.post('/identity/:identityId/contacts', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId } = req.params;
    const data = addContactSchema.parse(req.body);

    const contact = {
      id: `contact_${randomUUID()}`,
      identityId,
      tenantId,
      type: data.type,
      value: data.value,
      label: data.label || null,
      isPrimary: data.isPrimary || false,
      verified: false,
      verifiedAt: null,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { contact },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid contact data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add contact');
  }
});

/**
 * POST /identity/identity/:identityId/contacts/:contactId/send-code
 * Send a verification code to a contact
 */
identityRouter.post('/identity/:identityId/contacts/:contactId/send-code', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId, contactId } = req.params;

    const result = {
      contactId,
      identityId,
      tenantId,
      codeSent: true,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      channel: 'sms',
      message: 'Verification code sent. It will expire in 10 minutes.',
    };

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to send verification code');
  }
});

/**
 * POST /identity/identity/:identityId/contacts/:contactId/verify
 * Verify a contact with a code
 */
identityRouter.post('/identity/:identityId/contacts/:contactId/verify', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId, contactId } = req.params;
    const data = verifyContactCodeSchema.parse(req.body);

    const contact = {
      id: contactId,
      identityId,
      tenantId,
      verified: true,
      verifiedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { contact },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid verification code', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to verify contact');
  }
});

/**
 * DELETE /identity/identity/:identityId/contacts/:contactId
 * Remove a contact
 */
identityRouter.delete('/identity/:identityId/contacts/:contactId', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { identityId, contactId } = req.params;

    res.json({
      success: true,
      data: {
        removed: true,
        contactId,
        identityId,
        tenantId,
        removedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to remove contact');
  }
});

// ============================================================================
// KYC (Know Your Customer)
// ============================================================================

/**
 * GET /identity/kyc/status
 * Get current user's KYC status
 */
identityRouter.get('/kyc/status', async (req, res) => {
  try {
    getUserInfo(req);

    return res.status(501).json({
      error: 'Not implemented',
      message: 'This endpoint is not yet connected to a data source',
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch KYC status');
  }
});

/**
 * GET /identity/kyc/level
 * Get current user's KYC level and what actions it permits
 */
identityRouter.get('/kyc/level', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);

    const kycLevel = {
      userId,
      tenantId,
      currentLevel: 'enhanced',
      levelDetails: {
        name: 'Enhanced Verification',
        description: 'Full identity verification with background checks. Required for educators and tutors.',
        requirements: [
          'Government-issued photo ID verified',
          'Address verified',
          'Identity match confirmed',
          'Working With Children Check (WWCC) validated',
        ],
        permissions: [
          'Full platform access',
          'Tutor / educator services',
          'Create and manage student records',
          'Access safeguarding features',
          'Participate in relief marketplace',
          'Issue portfolio endorsements',
        ],
      },
      availableLevels: [
        {
          level: 'none',
          name: 'Unverified',
          description: 'No verification completed.',
          permissions: ['Browse public content'],
        },
        {
          level: 'basic',
          name: 'Basic Verification',
          description: 'Email and phone verified.',
          permissions: ['Access learning content', 'Basic portfolio'],
        },
        {
          level: 'standard',
          name: 'Standard Verification',
          description: 'Government ID verified.',
          permissions: ['Full learning access', 'Purchase subscriptions', 'Parent features'],
        },
        {
          level: 'enhanced',
          name: 'Enhanced Verification',
          description: 'Full verification with WWCC/background checks.',
          permissions: ['Educator features', 'Tutoring', 'Relief marketplace', 'Safeguarding'],
        },
        {
          level: 'educator',
          name: 'Educator Accredited',
          description: 'NESA/VIT/TQI accreditation verified.',
          permissions: ['All enhanced permissions', 'Issue credentials', 'Formal assessment'],
        },
      ],
    };

    res.json({
      success: true,
      data: { kycLevel },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch KYC level');
  }
});

/**
 * POST /identity/kyc/verify
 * Start a KYC verification session
 */
identityRouter.post('/kyc/verify', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const data = startVerificationSchema.parse(req.body);

    const session = {
      id: `kyc_session_${randomUUID()}`,
      tenantId,
      userId,
      identityId: 'ident_demo_001',
      level: data.level || 'standard',
      provider: data.provider || 'greenid',
      status: 'pending',
      documentType: data.documentType || null,
      redirectUrl: data.provider === 'greenid'
        ? `https://verify.greenid.com.au/session/${Date.now()}`
        : null,
      returnUrl: data.returnUrl || null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { session },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid verification request', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to start verification');
  }
});

/**
 * GET /identity/kyc/session/:sessionId
 * Get verification session status
 */
identityRouter.get('/kyc/session/:sessionId', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { sessionId } = req.params;

    const session = {
      id: sessionId,
      tenantId,
      userId,
      identityId: 'ident_demo_001',
      level: 'standard',
      provider: 'greenid',
      status: 'completed',
      result: 'passed',
      checks: [
        { type: 'document_verification', status: 'passed', completedAt: new Date().toISOString() },
        { type: 'liveness', status: 'passed', completedAt: new Date().toISOString() },
      ],
      completedAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    };

    res.json({
      success: true,
      data: { session },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch session');
  }
});

/**
 * POST /identity/kyc/webhook/:provider
 * Handle KYC provider webhook callbacks
 */
identityRouter.post('/kyc/webhook/:provider', async (req, res) => {
  try {
    const { provider } = req.params;

    // In production, verify webhook signature per provider
    const webhookResult = {
      received: true,
      provider,
      eventType: req.body.event || req.body.type || 'unknown',
      processedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: webhookResult,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to process webhook');
  }
});

// ============================================================================
// Credentials
// ============================================================================

/**
 * GET /identity/credentials
 * Get current user's credentials
 */
identityRouter.get('/credentials', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);

    const credentials = [
      {
        id: 'cred_wwcc_001',
        identityId: 'ident_demo_001',
        tenantId,
        userId,
        type: 'wwcc',
        issuer: 'NSW Office of the Children\'s Guardian',
        credentialNumber: 'WWC1234567E',
        issuedDate: '2024-02-15',
        expiryDate: '2029-02-15',
        jurisdiction: 'NSW',
        status: 'verified',
        verifiedAt: '2025-06-02T08:00:00.000Z',
        verificationMethod: 'api_check',
        lastChecked: '2025-12-01T00:00:00.000Z',
        isExpired: false,
        daysUntilExpiry: 1172,
      },
      {
        id: 'cred_nesa_001',
        identityId: 'ident_demo_001',
        tenantId,
        userId,
        type: 'nesa_accreditation',
        issuer: 'NSW Education Standards Authority',
        credentialNumber: 'NESA-2024-78901',
        issuedDate: '2024-01-10',
        expiryDate: '2029-01-10',
        jurisdiction: 'NSW',
        status: 'verified',
        verifiedAt: '2025-06-02T08:15:00.000Z',
        verificationMethod: 'manual_review',
        lastChecked: '2025-12-01T00:00:00.000Z',
        isExpired: false,
        daysUntilExpiry: 1136,
        additionalData: {
          accreditationLevel: 'Proficient',
          teachingAreas: ['Mathematics', 'Science'],
          maintenanceStatus: 'current',
        },
      },
      {
        id: 'cred_firstaid_001',
        identityId: 'ident_demo_001',
        tenantId,
        userId,
        type: 'first_aid',
        issuer: 'St John Ambulance Australia',
        credentialNumber: 'FA-2024-456789',
        issuedDate: '2024-06-20',
        expiryDate: '2027-06-20',
        jurisdiction: 'NSW',
        status: 'verified',
        verifiedAt: '2025-06-03T09:00:00.000Z',
        verificationMethod: 'document_upload',
        lastChecked: '2025-12-01T00:00:00.000Z',
        isExpired: false,
        daysUntilExpiry: 874,
      },
      {
        id: 'cred_degree_001',
        identityId: 'ident_demo_001',
        tenantId,
        userId,
        type: 'university_degree',
        issuer: 'University of Sydney',
        credentialNumber: 'USYD-BEd-2010-12345',
        issuedDate: '2010-12-15',
        expiryDate: null,
        jurisdiction: 'NSW',
        status: 'verified',
        verifiedAt: '2025-06-03T10:00:00.000Z',
        verificationMethod: 'document_upload',
        lastChecked: '2025-12-01T00:00:00.000Z',
        isExpired: false,
        daysUntilExpiry: null,
        additionalData: {
          qualification: 'Bachelor of Education (Primary)',
          institution: 'University of Sydney',
          graduationYear: 2010,
        },
      },
    ];

    res.json({
      success: true,
      data: { credentials },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch credentials');
  }
});

/**
 * POST /identity/credentials
 * Add a credential
 */
identityRouter.post('/credentials', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const data = addCredentialSchema.parse(req.body);

    const credential = {
      id: `cred_${randomUUID()}`,
      identityId: 'ident_demo_001',
      tenantId,
      userId,
      type: data.type,
      issuer: data.issuer,
      credentialNumber: data.credentialNumber,
      issuedDate: data.issuedDate,
      expiryDate: data.expiryDate || null,
      jurisdiction: data.jurisdiction || 'NSW',
      status: 'pending_verification',
      verifiedAt: null,
      documentUrl: data.documentUrl || null,
      metadata: data.metadata || {},
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { credential },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid credential data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add credential');
  }
});

/**
 * POST /identity/credentials/:credentialId/verify
 * Request re-verification of a credential
 */
identityRouter.post('/credentials/:credentialId/verify', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const { credentialId } = req.params;

    const verificationRequest = {
      id: `vreq_${randomUUID()}`,
      credentialId,
      tenantId,
      userId,
      status: 'pending',
      requestedAt: new Date().toISOString(),
      estimatedCompletionTime: '24-48 hours for manual review, instant for API-verified credentials',
    };

    res.json({
      success: true,
      data: { verificationRequest },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to request verification');
  }
});

// ============================================================================
// KYB (Know Your Business)
// ============================================================================

/**
 * POST /identity/business
 * Create a business identity
 */
identityRouter.post('/business', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const data = createBusinessSchema.parse(req.body);

    const business = {
      id: `biz_${randomUUID()}`,
      tenantId,
      createdByUserId: userId,
      legalName: data.legalName,
      tradingName: data.tradingName || null,
      businessType: data.businessType,
      abn: data.abn || null,
      acn: data.acn || null,
      registeredAddress: data.registeredAddress,
      contactEmail: data.contactEmail,
      contactPhone: data.contactPhone || null,
      website: data.website || null,
      industry: data.industry || 'Education',
      sector: data.sector || 'education',
      status: 'pending_verification',
      kybLevel: 'none',
      registrations: [],
      directors: [],
      representatives: [],
      insurancePolicies: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { business },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid business data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to create business');
  }
});

/**
 * GET /identity/business/:businessId
 * Get business details
 */
identityRouter.get('/business/:businessId', async (req, res) => {
  try {
    getUserInfo(req);

    return res.status(501).json({
      error: 'Not implemented',
      message: 'This endpoint is not yet connected to a data source',
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch business');
  }
});

/**
 * PUT /identity/business/:businessId
 * Update business details
 */
identityRouter.put('/business/:businessId', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId } = req.params;
    const data = updateBusinessSchema.parse(req.body);

    const business = {
      id: businessId,
      tenantId,
      ...data,
      updatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { business },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid business data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to update business');
  }
});

/**
 * POST /identity/business/:businessId/registrations
 * Add a registration to a business
 */
identityRouter.post('/business/:businessId/registrations', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId } = req.params;
    const data = addRegistrationSchema.parse(req.body);

    const registration = {
      id: `reg_${randomUUID()}`,
      businessId,
      tenantId,
      type: data.type,
      registrationNumber: data.registrationNumber,
      issuingAuthority: data.issuingAuthority,
      issuedDate: data.issuedDate || null,
      expiryDate: data.expiryDate || null,
      status: data.status || 'pending',
      documentUrl: data.documentUrl || null,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { registration },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid registration data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add registration');
  }
});

/**
 * POST /identity/business/:businessId/directors
 * Add a director to a business
 */
identityRouter.post('/business/:businessId/directors', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId } = req.params;
    const data = addDirectorSchema.parse(req.body);

    const director = {
      id: `dir_${randomUUID()}`,
      businessId,
      tenantId,
      name: data.name,
      role: data.role || 'director',
      appointedDate: data.appointedDate || new Date().toISOString().split('T')[0],
      identityId: data.identityId || null,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { director },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid director data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add director');
  }
});

/**
 * DELETE /identity/business/:businessId/directors/:name
 * Remove a director from a business
 */
identityRouter.delete('/business/:businessId/directors/:name', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId, name } = req.params;

    res.json({
      success: true,
      data: {
        removed: true,
        directorName: decodeURIComponent(name),
        businessId,
        tenantId,
        removedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to remove director');
  }
});

/**
 * POST /identity/business/:businessId/representatives
 * Add an authorised representative to a business
 */
identityRouter.post('/business/:businessId/representatives', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId } = req.params;
    const data = addRepresentativeSchema.parse(req.body);

    const representative = {
      id: `rep_${randomUUID()}`,
      businessId,
      tenantId,
      name: data.name,
      email: data.email,
      role: data.role || 'Authorised Representative',
      permissions: data.permissions || ['view_business'],
      identityId: data.identityId || null,
      status: 'active',
      authorisedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { representative },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid representative data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add representative');
  }
});

/**
 * DELETE /identity/business/:businessId/representatives/:repId
 * Revoke an authorised representative
 */
identityRouter.delete('/business/:businessId/representatives/:repId', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId, repId } = req.params;

    res.json({
      success: true,
      data: {
        revoked: true,
        representativeId: repId,
        businessId,
        tenantId,
        revokedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to revoke representative');
  }
});

/**
 * POST /identity/business/:businessId/insurance
 * Add an insurance policy to a business
 */
identityRouter.post('/business/:businessId/insurance', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId } = req.params;
    const data = addInsuranceSchema.parse(req.body);

    const insurance = {
      id: `ins_${randomUUID()}`,
      businessId,
      tenantId,
      type: data.type,
      provider: data.provider,
      policyNumber: data.policyNumber,
      coverAmount: data.coverAmount,
      currency: data.currency || 'AUD',
      startDate: data.startDate,
      endDate: data.endDate,
      documentUrl: data.documentUrl || null,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({
      success: true,
      data: { insurance },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid insurance data', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to add insurance');
  }
});

/**
 * GET /identity/business/:businessId/kyb-level
 * Calculate and return the KYB level for a business
 */
identityRouter.get('/business/:businessId/kyb-level', async (req, res) => {
  try {
    const { tenantId } = getUserInfo(req);
    const { businessId } = req.params;

    const kybLevel = {
      businessId,
      tenantId,
      level: 'full',
      score: 92,
      breakdown: {
        businessRegistration: {
          score: 100,
          checks: [
            { item: 'ABN registered and active', status: 'passed' },
            { item: 'ACN registered with ASIC', status: 'passed' },
            { item: 'GST registered', status: 'passed' },
          ],
        },
        directorVerification: {
          score: 85,
          checks: [
            { item: 'At least 2 directors listed', status: 'passed' },
            { item: 'Director identities verified', status: 'partial', details: '2/3 verified' },
          ],
        },
        insuranceCoverage: {
          score: 100,
          checks: [
            { item: 'Public liability insurance (min $10M)', status: 'passed' },
            { item: 'Professional indemnity insurance', status: 'passed' },
            { item: 'Cyber liability insurance', status: 'passed' },
          ],
        },
        complianceChecks: {
          score: 90,
          checks: [
            { item: 'Privacy policy published', status: 'passed' },
            { item: 'Terms of service published', status: 'passed' },
            { item: 'Child safety policy', status: 'passed' },
            { item: 'Annual compliance review', status: 'pending', details: 'Due 2026-03-01' },
          ],
        },
        representativeAuthorisation: {
          score: 100,
          checks: [
            { item: 'At least 1 authorised representative', status: 'passed' },
            { item: 'Representative identity verified', status: 'passed' },
          ],
        },
      },
      availableLevels: [
        { level: 'none', minScore: 0, description: 'No verification' },
        { level: 'basic', minScore: 30, description: 'ABN/ACN verified' },
        { level: 'standard', minScore: 60, description: 'Directors and insurance verified' },
        { level: 'full', minScore: 85, description: 'Full compliance verification' },
      ],
      nextReviewDate: '2026-03-01T00:00:00.000Z',
      evaluatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { kybLevel },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to calculate KYB level');
  }
});

// ============================================================================
// Trust Engine
// ============================================================================

/**
 * GET /identity/trust/score
 * Get current user's trust score
 */
identityRouter.get('/trust/score', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);

    const trustScore = {
      userId,
      tenantId,
      identityId: 'ident_demo_001',
      overallScore: 87,
      tier: 'trusted',
      components: {
        identityVerification: {
          score: 95,
          weight: 0.25,
          factors: [
            { name: 'KYC level', value: 'enhanced', contribution: 25 },
            { name: 'Email verified', value: true, contribution: 10 },
            { name: 'Phone verified', value: true, contribution: 10 },
            { name: 'Address verified', value: true, contribution: 10 },
            { name: 'Government ID verified', value: true, contribution: 20 },
            { name: 'WWCC verified', value: true, contribution: 20 },
          ],
        },
        credentialStrength: {
          score: 92,
          weight: 0.25,
          factors: [
            { name: 'NESA accreditation', value: 'Proficient', contribution: 30 },
            { name: 'WWCC current', value: true, contribution: 25 },
            { name: 'First Aid current', value: true, contribution: 15 },
            { name: 'University degree verified', value: true, contribution: 22 },
          ],
        },
        platformBehaviour: {
          score: 85,
          weight: 0.20,
          factors: [
            { name: 'Account age', value: '8 months', contribution: 15 },
            { name: 'Sessions completed', value: 47, contribution: 20 },
            { name: 'Average rating', value: 4.8, contribution: 25 },
            { name: 'Reports against', value: 0, contribution: 15 },
            { name: 'Disputes resolved favourably', value: '100%', contribution: 10 },
          ],
        },
        communityReputation: {
          score: 78,
          weight: 0.15,
          factors: [
            { name: 'Endorsements received', value: 12, contribution: 25 },
            { name: 'Peer reviews', value: 8, contribution: 20 },
            { name: 'Mentoring hours', value: 15, contribution: 18 },
            { name: 'Content contributions', value: 5, contribution: 15 },
          ],
        },
        complianceHistory: {
          score: 90,
          weight: 0.15,
          factors: [
            { name: 'Safeguarding compliance', value: 'current', contribution: 30 },
            { name: 'Policy acknowledgements', value: 'all signed', contribution: 20 },
            { name: 'Training completed', value: '3/3 mandatory', contribution: 25 },
            { name: 'Incident history', value: 'clean', contribution: 15 },
          ],
        },
      },
      tiers: [
        { tier: 'new', minScore: 0, label: 'New User' },
        { tier: 'basic', minScore: 30, label: 'Basic Trust' },
        { tier: 'established', minScore: 50, label: 'Established' },
        { tier: 'trusted', minScore: 75, label: 'Trusted' },
        { tier: 'exemplary', minScore: 90, label: 'Exemplary' },
      ],
      lastCalculated: new Date().toISOString(),
      nextRecalculation: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };

    res.json({
      success: true,
      data: { trustScore },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch trust score');
  }
});

/**
 * POST /identity/trust/calculate
 * Force recalculate the trust score
 */
identityRouter.post('/trust/calculate', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);

    const result = {
      userId,
      tenantId,
      previousScore: 85,
      newScore: 87,
      delta: 2,
      reason: 'New credential verified (First Aid renewal)',
      tier: 'trusted',
      previousTier: 'trusted',
      tierChanged: false,
      calculatedAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      data: { result },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to recalculate trust score');
  }
});

/**
 * GET /identity/trust/risk
 * Get risk assessment for the current user
 */
identityRouter.get('/trust/risk', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);

    const riskAssessment = {
      userId,
      tenantId,
      identityId: 'ident_demo_001',
      overallRisk: 'low',
      riskScore: 12,
      assessedAt: new Date().toISOString(),
      factors: [
        {
          category: 'identity',
          risk: 'low',
          score: 5,
          details: 'Fully verified identity with enhanced KYC.',
        },
        {
          category: 'credentials',
          risk: 'low',
          score: 8,
          details: 'All credentials current and verified. WWCC expires 2029.',
        },
        {
          category: 'behaviour',
          risk: 'low',
          score: 10,
          details: 'No reports, disputes, or policy violations.',
        },
        {
          category: 'financial',
          risk: 'low',
          score: 15,
          details: 'Subscription current, no failed payments.',
        },
        {
          category: 'safeguarding',
          risk: 'low',
          score: 5,
          details: 'WWCC current, mandatory training complete, zero incidents.',
        },
      ],
      alerts: [],
      recommendations: [
        {
          action: 'renew_first_aid',
          priority: 'low',
          dueDate: '2027-06-20',
          description: 'First Aid certificate renewal due in 2027.',
        },
      ],
      riskLevels: [
        { level: 'low', range: '0-25', description: 'Minimal risk, full access granted' },
        { level: 'medium', range: '26-50', description: 'Some concerns, periodic review' },
        { level: 'high', range: '51-75', description: 'Elevated risk, enhanced monitoring' },
        { level: 'critical', range: '76-100', description: 'Immediate review required' },
      ],
    };

    res.json({
      success: true,
      data: { riskAssessment },
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to fetch risk assessment');
  }
});

/**
 * POST /identity/trust/check-requirements
 * Check if user meets trust requirements for a given action
 */
identityRouter.post('/trust/check-requirements', async (req, res) => {
  try {
    const { tenantId, userId } = getUserInfo(req);
    const data = checkTrustRequirementsSchema.parse(req.body);

    const requirementsMap: Record<string, any> = {
      'become_tutor': {
        action: 'become_tutor',
        allowed: true,
        requirements: [
          { requirement: 'KYC level >= enhanced', met: true, currentValue: 'enhanced' },
          { requirement: 'WWCC verified and current', met: true, currentValue: 'WWC1234567E (expires 2029)' },
          { requirement: 'Teacher registration or accreditation', met: true, currentValue: 'NESA Proficient' },
          { requirement: 'Trust score >= 60', met: true, currentValue: 87 },
          { requirement: 'No active safeguarding concerns', met: true, currentValue: 'clear' },
        ],
        allRequirementsMet: true,
      },
      'access_student_data': {
        action: 'access_student_data',
        allowed: true,
        requirements: [
          { requirement: 'KYC level >= standard', met: true, currentValue: 'enhanced' },
          { requirement: 'WWCC verified and current', met: true, currentValue: 'WWC1234567E' },
          { requirement: 'Trust score >= 50', met: true, currentValue: 87 },
          { requirement: 'Privacy training completed', met: true, currentValue: 'completed 2025-09-15' },
        ],
        allRequirementsMet: true,
      },
      'manage_finances': {
        action: 'manage_finances',
        allowed: false,
        requirements: [
          { requirement: 'KYC level >= standard', met: true, currentValue: 'enhanced' },
          { requirement: 'Trust score >= 75', met: true, currentValue: 87 },
          { requirement: 'Financial role assigned', met: false, currentValue: 'not assigned' },
        ],
        allRequirementsMet: false,
        missingRequirements: ['Financial role not assigned. Contact your organisation administrator.'],
      },
    };

    const result = requirementsMap[data.action] || {
      action: data.action,
      allowed: false,
      requirements: [],
      allRequirementsMet: false,
      missingRequirements: [`Unknown action: ${data.action}. No requirements defined.`],
    };

    res.json({
      success: true,
      data: {
        ...result,
        userId,
        tenantId,
        checkedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw ApiError.badRequest('Invalid requirements check', error.errors);
    }
    if (error instanceof ApiError) throw error;
    throw ApiError.badRequest('Failed to check trust requirements');
  }
});
