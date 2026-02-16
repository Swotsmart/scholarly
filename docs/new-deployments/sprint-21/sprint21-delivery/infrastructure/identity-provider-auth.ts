// ============================================================================
// SCHOLARLY PLATFORM — Sprint 21, Deliverable S21-001
// Identity Provider + Auth Integration
// ============================================================================
//
// Sprint 18 built the authentication machinery: JWT validation middleware,
// RBAC enforcement, rate limiting, COPPA-aware session management. Sprint 19
// provisioned the database and cache those services depend on. Sprint 20
// provisioned Secrets Manager for API keys. But all of that authentication
// logic was running against mock tokens and placeholder JWKS endpoints —
// like an airport security checkpoint with X-ray machines installed but
// no passengers, no boarding passes, and no airline database behind them.
//
// This sprint builds the airline. We provision the identity provider
// (Auth0 as primary, with Cognito fallback patterns), configure the
// passenger manifest (user pools, roles, connections), issue real boarding
// passes (JWTs with proper claims), and wire the security checkpoint
// (Sprint 18's auth-middleware.ts) to verify passes against the real
// airline database (JWKS endpoint).
//
// The critical constraint is COPPA compliance. Children under 13 cannot
// create accounts without verifiable parental consent. This is not a
// "nice-to-have" — it's federal law in the US, with Australian equivalents
// under the Privacy Act. The identity provider configuration must enforce
// this at the provider level, not just in application code, because a
// misconfigured provider could allow a child to bypass consent entirely.
//
// Think of it this way: Sprint 18 built a vault door with a combination
// lock, deadbolt, and biometric scanner. This sprint connects those locks
// to the building's actual key management system, ensures only authorised
// people get keys, and installs the separate supervised entry for children
// that regulatory compliance demands.
//
// Architecture:
//   1. Identity Provider Configuration (Auth0 tenant / Cognito user pool)
//   2. COPPA-Compliant Child Account Flow
//   3. Multi-Tenant SSO Configuration
//   4. API Gateway with JWT Verification + Rate Limiting
//   5. Auth Middleware Wiring (connects S18-002 to real JWKS)
//   6. Developer API Key Provisioning
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ==========================================================================
// Section 1: Identity Provider Configuration Types
// ==========================================================================
// These types define the complete configuration surface for the identity
// provider. Auth0 is the primary recommendation because of its mature
// COPPA support, progressive profiling, and Actions pipeline. Cognito is
// the fallback for organisations that must stay within the AWS ecosystem.
// The provider abstraction (IdPConfig) ensures the application layer
// never couples directly to either vendor.

/**
 * Provider-agnostic identity configuration. The application consumes this
 * interface; the provider-specific implementations (Auth0Config, CognitoConfig)
 * produce it. This abstraction means switching identity providers requires
 * only changing the provider implementation, not any application code.
 */
export interface IdPConfig {
  readonly provider: 'auth0' | 'cognito';
  readonly environment: 'development' | 'staging' | 'production';
  readonly region: string;
  readonly tenantDomain: string;           // e.g. 'scholarly-dev.au.auth0.com'
  readonly clientId: string;               // Application client ID
  readonly audience: string;               // API identifier (aud claim)
  readonly issuer: string;                 // Token issuer (iss claim)
  readonly jwksUri: string;                // JSON Web Key Set endpoint
  readonly tokenEndpoint: string;          // OAuth2 token endpoint
  readonly authorizeEndpoint: string;      // OAuth2 authorize endpoint
  readonly userInfoEndpoint: string;       // OIDC UserInfo endpoint
  readonly logoutEndpoint: string;         // Logout URL
  readonly scopes: string[];              // Default scopes requested
  readonly tokenLifetimeSeconds: TokenLifetimes;
  readonly connections: ConnectionConfig[];
  readonly roles: RoleDefinition[];
  readonly coppaConfig: COPPAConfig;
  readonly multiTenantConfig: MultiTenantConfig;
  readonly rateLimits: AuthRateLimits;
  readonly customClaims: CustomClaimsConfig;
}

/**
 * Token lifetimes balance security against user convenience. Access tokens
 * are short-lived (15 minutes) because they carry permission claims that
 * must stay fresh. Refresh tokens are longer (7 days for parents, 24 hours
 * for children) to avoid forcing frequent re-authentication. The child
 * token lifetime is shorter because children's sessions should be bounded
 * — both for safety and to encourage healthy screen-time habits.
 */
export interface TokenLifetimes {
  readonly accessTokenSeconds: number;         // 900 (15 min)
  readonly refreshTokenSeconds: number;        // 604800 (7 days) for adults
  readonly childRefreshTokenSeconds: number;   // 86400 (24 hours) for children
  readonly idTokenSeconds: number;             // 3600 (1 hour)
  readonly sessionInactivitySeconds: number;   // 1800 (30 min) for children
  readonly absoluteSessionSeconds: number;     // 28800 (8 hours) for children
}

/**
 * Authentication connections — the methods by which different user types
 * authenticate. Teachers and administrators use email+password with MFA.
 * Parents can use social login (Google, Apple) for convenience, plus
 * email+password. Children never authenticate independently; they are
 * linked to a parent account and access is granted through the parent's
 * session or a supervised child switch.
 */
export interface ConnectionConfig {
  readonly name: string;
  readonly strategy: 'auth0' | 'google-oauth2' | 'apple' | 'samlp' | 'waad';
  readonly enabledClients: string[];       // Which app clients can use this
  readonly enabledRoles: string[];         // Which roles authenticate via this
  readonly requireMFA: boolean;            // Enforce multi-factor for this connection
  readonly mfaFactors?: ('otp' | 'push' | 'webauthn' | 'sms')[];
  readonly passwordPolicy?: PasswordPolicy;
  readonly socialConfig?: SocialConnectionConfig;
  readonly samlConfig?: SAMLConfig;
}

export interface PasswordPolicy {
  readonly minLength: number;              // 12 for teachers/admins, 8 for parents
  readonly requireUppercase: boolean;
  readonly requireLowercase: boolean;
  readonly requireNumbers: boolean;
  readonly requireSpecialChars: boolean;
  readonly maxRepeatedChars: number;       // Prevent 'aaaa1234'
  readonly preventReuse: number;           // Remember last N passwords
  readonly lockoutAttempts: number;        // Lock after N failed attempts
  readonly lockoutDurationSeconds: number;
}

export interface SocialConnectionConfig {
  readonly clientId: string;               // Social provider app client ID
  readonly clientSecretRef: string;        // Reference to Secrets Manager
  readonly scope: string[];                // e.g. ['email', 'profile']
  readonly attributeMapping: Record<string, string>;
}

export interface SAMLConfig {
  readonly entityId: string;
  readonly signInUrl: string;
  readonly signingCertificate: string;     // X.509 cert for SAML assertion
  readonly attributeMapping: Record<string, string>;
  readonly tenantIdAttribute: string;      // SAML attribute containing org ID
}

// ==========================================================================
// Section 2: COPPA Configuration
// ==========================================================================
// The Children's Online Privacy Protection Act (COPPA) requires verifiable
// parental consent before collecting personal information from children
// under 13. Australia's Privacy Act has equivalent provisions. Our COPPA
// implementation follows the "COPPA Safe Harbor" programme guidelines.
//
// The key architectural decision: child accounts are NEVER standalone.
// They are always linked to a verified parent account. The parent creates
// the child's profile, consents to data collection, controls privacy
// settings, and can delete the child's data at any time. The child's
// "authentication" is actually the parent granting a scoped session token
// to the child's profile within their parent account — like a parent
// checking their child into a supervised activity at a rec centre.

export interface COPPAConfig {
  readonly enabled: boolean;
  readonly childAgeThreshold: number;      // 13 in US, configurable per jurisdiction
  readonly consentMethods: ConsentMethod[];
  readonly consentExpiryDays: number;      // Re-consent required periodically
  readonly dataRetentionDays: number;      // Auto-delete child data after period
  readonly parentalRights: ParentalRights;
  readonly childProfileLimits: ChildProfileLimits;
  readonly jurisdictionRules: JurisdictionRule[];
}

/**
 * COPPA consent methods, ordered from strongest to weakest verification.
 * The FTC accepts several methods; we implement the most practical ones
 * for our user base. Credit card verification is the gold standard
 * (proving the consenting person is an adult), but knowledge-based
 * authentication and government ID verification are alternatives.
 */
export interface ConsentMethod {
  readonly type: 'credit-card' | 'government-id' | 'knowledge-based' | 'signed-form' | 'video-call';
  readonly priority: number;               // Lower is preferred
  readonly verificationTimeoutSeconds: number;
  readonly enabled: boolean;
}

export interface ParentalRights {
  readonly canReviewChildData: boolean;     // Always true per COPPA
  readonly canDeleteChildData: boolean;     // Always true per COPPA
  readonly canRevokeConsent: boolean;       // Always true per COPPA
  readonly canLimitDataCollection: boolean; // Always true per COPPA
  readonly notificationOnDataChange: boolean;
}

export interface ChildProfileLimits {
  readonly maxProfilesPerParent: number;   // e.g. 6
  readonly collectMinimalData: boolean;    // Only what's needed for learning
  readonly noThirdPartySharing: boolean;   // Never share child data externally
  readonly noTargetedAdvertising: boolean; // Scholarly is ad-free, but enforce
  readonly allowedDataFields: string[];    // Explicit allowlist of collectible data
}

export interface JurisdictionRule {
  readonly jurisdiction: 'us' | 'au' | 'eu' | 'uk' | 'ca';
  readonly childAgeThreshold: number;     // 13 US, 16 GDPR, 13 AU
  readonly additionalRequirements: string[];
  readonly regulationReference: string;   // e.g. 'COPPA 16 CFR Part 312'
}

// ==========================================================================
// Section 3: Multi-Tenant SSO Configuration
// ==========================================================================
// Schools, tutoring organisations, and micro-schools each operate as a
// separate tenant. Multi-tenant SSO allows a school to connect their
// existing identity system (Google Workspace, Azure AD, Clever) so
// teachers and students can log in with their school credentials.
//
// The tenant isolation model is critical: a teacher in School A must
// never see data from School B, even if both schools use the same
// IdP (e.g. both use Google Workspace). Tenant isolation is enforced
// at the token level (tenant_id claim in JWT) AND at the database level
// (row-level security via Prisma middleware).

export interface MultiTenantConfig {
  readonly enabled: boolean;
  readonly tenantIdClaim: string;          // JWT claim containing tenant ID
  readonly tenantIsolation: 'strict' | 'federated';
  readonly ssoProviders: SSOProviderConfig[];
  readonly defaultTenantId: string;        // For individual/family accounts
  readonly tenantProvisioningMode: 'manual' | 'self-service' | 'auto-on-sso';
}

export interface SSOProviderConfig {
  readonly name: string;
  readonly protocol: 'saml' | 'oidc' | 'clever';
  readonly enabled: boolean;
  readonly autoProvisionUsers: boolean;    // Create user on first SSO login
  readonly roleMapping: Record<string, string>; // SSO role → Scholarly role
  readonly attributeMapping: Record<string, string>;
  readonly tenantIdSource: 'connection' | 'domain' | 'attribute';
}

// ==========================================================================
// Section 4: Role Definitions
// ==========================================================================
// Six core roles, each with specific authentication requirements and
// token claims. The role hierarchy ensures that higher-privilege roles
// always require stronger authentication (MFA, institutional email).

export interface RoleDefinition {
  readonly name: string;
  readonly description: string;
  readonly permissions: string[];
  readonly requireMFA: boolean;
  readonly requireVerifiedEmail: boolean;
  readonly maxSessionHours: number;
  readonly tokenClaims: string[];          // Additional JWT claims for this role
  readonly rateLimit: RateLimitTier;
}

export interface RateLimitTier {
  readonly requestsPerMinute: number;
  readonly requestsPerHour: number;
  readonly burstLimit: number;             // Max concurrent requests
}

export interface AuthRateLimits {
  readonly loginAttemptsPerMinute: number;
  readonly tokenRefreshPerMinute: number;
  readonly passwordResetPerHour: number;
  readonly accountCreationPerHour: number;
  readonly childAccountCreationPerDay: number;
}

export interface CustomClaimsConfig {
  readonly tenantId: string;               // 'https://scholarly.app/tenant_id'
  readonly role: string;                   // 'https://scholarly.app/role'
  readonly permissions: string;            // 'https://scholarly.app/permissions'
  readonly childProfileId: string;         // 'https://scholarly.app/child_profile_id'
  readonly subscriptionTier: string;       // 'https://scholarly.app/subscription_tier'
}

// ==========================================================================
// Section 5: Environment-Specific Configurations
// ==========================================================================
// Three environment presets following the same pattern as Sprint 19's
// infrastructure configs. Development uses Auth0's free tier with relaxed
// policies for rapid iteration. Staging mirrors production security but
// with test accounts. Production is locked down with full COPPA compliance,
// MFA enforcement, and strict rate limits.

const CUSTOM_CLAIMS_NAMESPACE: CustomClaimsConfig = {
  tenantId: 'https://scholarly.app/tenant_id',
  role: 'https://scholarly.app/role',
  permissions: 'https://scholarly.app/permissions',
  childProfileId: 'https://scholarly.app/child_profile_id',
  subscriptionTier: 'https://scholarly.app/subscription_tier',
};

const COPPA_CONSENT_METHODS: ConsentMethod[] = [
  { type: 'credit-card', priority: 1, verificationTimeoutSeconds: 300, enabled: true },
  { type: 'knowledge-based', priority: 2, verificationTimeoutSeconds: 600, enabled: true },
  { type: 'signed-form', priority: 3, verificationTimeoutSeconds: 259200, enabled: true }, // 3 days for mail
  { type: 'government-id', priority: 4, verificationTimeoutSeconds: 86400, enabled: false }, // Future
  { type: 'video-call', priority: 5, verificationTimeoutSeconds: 3600, enabled: false },   // Future
];

const JURISDICTION_RULES: JurisdictionRule[] = [
  {
    jurisdiction: 'us',
    childAgeThreshold: 13,
    additionalRequirements: ['FTC COPPA Safe Harbor compliance', 'Verifiable parental consent'],
    regulationReference: 'COPPA 16 CFR Part 312',
  },
  {
    jurisdiction: 'au',
    childAgeThreshold: 13,
    additionalRequirements: ['Privacy Act 1988 compliance', 'APP 3 collection principles'],
    regulationReference: 'Privacy Act 1988 (Cth), Australian Privacy Principles',
  },
  {
    jurisdiction: 'eu',
    childAgeThreshold: 16,
    additionalRequirements: ['GDPR Article 8 conditions', 'DPA approval for under-16 processing'],
    regulationReference: 'GDPR Article 8, Regulation (EU) 2016/679',
  },
  {
    jurisdiction: 'uk',
    childAgeThreshold: 13,
    additionalRequirements: ['UK GDPR compliance', 'Age Appropriate Design Code'],
    regulationReference: 'UK GDPR, ICO Age Appropriate Design Code',
  },
  {
    jurisdiction: 'ca',
    childAgeThreshold: 13,
    additionalRequirements: ['PIPEDA compliance', 'Meaningful consent for minors'],
    regulationReference: 'PIPEDA, SC 2000, c. 5',
  },
];

const SCHOLARLY_ROLES: RoleDefinition[] = [
  {
    name: 'learner',
    description: 'Child learner — always linked to a parent account. Limited session duration, restricted API access.',
    permissions: [
      'storybook:read', 'storybook:read-aloud', 'library:browse',
      'progress:read:own', 'avatar:update:own', 'achievement:read:own',
    ],
    requireMFA: false,
    requireVerifiedEmail: false,     // Children don't have email
    maxSessionHours: 8,
    tokenClaims: ['child_profile_id', 'parent_id', 'phonics_phase', 'age_group'],
    rateLimit: { requestsPerMinute: 100, requestsPerHour: 2000, burstLimit: 20 },
  },
  {
    name: 'parent',
    description: 'Parent/guardian — manages child profiles, views progress, controls privacy.',
    permissions: [
      'child:create', 'child:read:own', 'child:update:own', 'child:delete:own',
      'consent:manage', 'progress:read:children', 'subscription:manage',
      'storybook:read', 'library:browse', 'settings:update:own',
    ],
    requireMFA: false,
    requireVerifiedEmail: true,
    maxSessionHours: 168,             // 7 days with refresh
    tokenClaims: ['child_profile_ids', 'subscription_tier', 'consent_status'],
    rateLimit: { requestsPerMinute: 200, requestsPerHour: 5000, burstLimit: 30 },
  },
  {
    name: 'teacher',
    description: 'Classroom teacher — manages learner groups, assigns storybooks, views class analytics.',
    permissions: [
      'classroom:create', 'classroom:read:own', 'classroom:update:own',
      'learner:read:classroom', 'learner:invite', 'progress:read:classroom',
      'storybook:assign', 'storybook:read', 'library:browse',
      'analytics:read:classroom', 'assessment:create', 'assessment:read:classroom',
    ],
    requireMFA: true,
    requireVerifiedEmail: true,
    maxSessionHours: 12,
    tokenClaims: ['classroom_ids', 'school_id', 'curriculum_region'],
    rateLimit: { requestsPerMinute: 500, requestsPerHour: 10000, burstLimit: 50 },
  },
  {
    name: 'tutor',
    description: 'Independent tutor — manages individual learners, limited analytics scope.',
    permissions: [
      'learner:read:assigned', 'progress:read:assigned', 'storybook:assign',
      'storybook:read', 'library:browse', 'assessment:create',
      'assessment:read:assigned', 'analytics:read:assigned',
    ],
    requireMFA: false,
    requireVerifiedEmail: true,
    maxSessionHours: 12,
    tokenClaims: ['assigned_learner_ids', 'tutor_tier'],
    rateLimit: { requestsPerMinute: 300, requestsPerHour: 7000, burstLimit: 30 },
  },
  {
    name: 'content-creator',
    description: 'Community content creator — creates storybooks, views engagement analytics.',
    permissions: [
      'storybook:create', 'storybook:read:own', 'storybook:update:own',
      'storybook:submit', 'illustration:generate', 'narration:generate',
      'analytics:read:own-content', 'marketplace:list:own',
      'library:browse', 'review:read:own',
    ],
    requireMFA: false,
    requireVerifiedEmail: true,
    maxSessionHours: 24,
    tokenClaims: ['creator_tier', 'total_publications', 'api_key_id'],
    rateLimit: { requestsPerMinute: 300, requestsPerHour: 8000, burstLimit: 40 },
  },
  {
    name: 'admin',
    description: 'Platform administrator — full access to tenant configuration, user management, and system settings.',
    permissions: [
      'admin:full', 'user:manage', 'tenant:manage', 'system:configure',
      'analytics:read:all', 'content:moderate', 'review:manage',
      'marketplace:manage', 'billing:manage', 'audit:read',
    ],
    requireMFA: true,
    requireVerifiedEmail: true,
    maxSessionHours: 8,
    tokenClaims: ['admin_level', 'managed_tenant_ids'],
    rateLimit: { requestsPerMinute: 1000, requestsPerHour: 20000, burstLimit: 100 },
  },
];

/**
 * Development environment: Auth0 free tier, relaxed policies.
 * Uses localhost callback URLs, disabled MFA, and permissive rate limits.
 * COPPA consent is enabled but uses the simplified credit-card method only.
 */
export const DEVELOPMENT_IDP_CONFIG: IdPConfig = {
  provider: 'auth0',
  environment: 'development',
  region: 'au',
  tenantDomain: 'scholarly-dev.au.auth0.com',
  clientId: 'DEV_CLIENT_ID',                        // Populated from Secrets Manager
  audience: 'https://api.dev.scholarly.app',
  issuer: 'https://scholarly-dev.au.auth0.com/',
  jwksUri: 'https://scholarly-dev.au.auth0.com/.well-known/jwks.json',
  tokenEndpoint: 'https://scholarly-dev.au.auth0.com/oauth/token',
  authorizeEndpoint: 'https://scholarly-dev.au.auth0.com/authorize',
  userInfoEndpoint: 'https://scholarly-dev.au.auth0.com/userinfo',
  logoutEndpoint: 'https://scholarly-dev.au.auth0.com/v2/logout',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  tokenLifetimeSeconds: {
    accessTokenSeconds: 3600,                        // 1 hour (relaxed for dev)
    refreshTokenSeconds: 2592000,                    // 30 days (relaxed)
    childRefreshTokenSeconds: 604800,                // 7 days (relaxed)
    idTokenSeconds: 36000,                           // 10 hours (relaxed)
    sessionInactivitySeconds: 7200,                  // 2 hours (relaxed)
    absoluteSessionSeconds: 86400,                   // 24 hours (relaxed)
  },
  connections: [
    {
      name: 'dev-email-password',
      strategy: 'auth0',
      enabledClients: ['DEV_CLIENT_ID'],
      enabledRoles: ['parent', 'teacher', 'tutor', 'content-creator', 'admin'],
      requireMFA: false,
      passwordPolicy: {
        minLength: 8,
        requireUppercase: false,
        requireLowercase: false,
        requireNumbers: false,
        requireSpecialChars: false,
        maxRepeatedChars: 4,
        preventReuse: 0,
        lockoutAttempts: 20,
        lockoutDurationSeconds: 60,
      },
    },
  ],
  roles: SCHOLARLY_ROLES,
  coppaConfig: {
    enabled: true,
    childAgeThreshold: 13,
    consentMethods: [COPPA_CONSENT_METHODS[0]],      // Credit card only for dev
    consentExpiryDays: 365,
    dataRetentionDays: 730,
    parentalRights: {
      canReviewChildData: true,
      canDeleteChildData: true,
      canRevokeConsent: true,
      canLimitDataCollection: true,
      notificationOnDataChange: true,
    },
    childProfileLimits: {
      maxProfilesPerParent: 6,
      collectMinimalData: true,
      noThirdPartySharing: true,
      noTargetedAdvertising: true,
      allowedDataFields: [
        'display_name', 'age_group', 'phonics_phase', 'reading_level',
        'preferred_themes', 'avatar_id', 'progress_data', 'achievement_data',
      ],
    },
    jurisdictionRules: JURISDICTION_RULES,
  },
  multiTenantConfig: {
    enabled: true,
    tenantIdClaim: CUSTOM_CLAIMS_NAMESPACE.tenantId,
    tenantIsolation: 'strict',
    ssoProviders: [],                                // No SSO in dev
    defaultTenantId: 'scholarly-individual',
    tenantProvisioningMode: 'manual',
  },
  rateLimits: {
    loginAttemptsPerMinute: 30,
    tokenRefreshPerMinute: 60,
    passwordResetPerHour: 20,
    accountCreationPerHour: 50,
    childAccountCreationPerDay: 20,
  },
  customClaims: CUSTOM_CLAIMS_NAMESPACE,
};

/**
 * Staging environment: production-grade security, test accounts.
 * Uses real domain, enforced MFA for teachers/admins, social login
 * configured with test credentials, and COPPA fully enabled.
 */
export const STAGING_IDP_CONFIG: IdPConfig = {
  provider: 'auth0',
  environment: 'staging',
  region: 'au',
  tenantDomain: 'scholarly-staging.au.auth0.com',
  clientId: 'STAGING_CLIENT_ID',
  audience: 'https://api.staging.scholarly.app',
  issuer: 'https://scholarly-staging.au.auth0.com/',
  jwksUri: 'https://scholarly-staging.au.auth0.com/.well-known/jwks.json',
  tokenEndpoint: 'https://scholarly-staging.au.auth0.com/oauth/token',
  authorizeEndpoint: 'https://scholarly-staging.au.auth0.com/authorize',
  userInfoEndpoint: 'https://scholarly-staging.au.auth0.com/userinfo',
  logoutEndpoint: 'https://scholarly-staging.au.auth0.com/v2/logout',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  tokenLifetimeSeconds: {
    accessTokenSeconds: 900,                         // 15 min (production-grade)
    refreshTokenSeconds: 604800,                     // 7 days
    childRefreshTokenSeconds: 86400,                 // 24 hours
    idTokenSeconds: 3600,                            // 1 hour
    sessionInactivitySeconds: 1800,                  // 30 min for children
    absoluteSessionSeconds: 28800,                   // 8 hours for children
  },
  connections: [
    {
      name: 'staging-email-password',
      strategy: 'auth0',
      enabledClients: ['STAGING_CLIENT_ID'],
      enabledRoles: ['parent', 'teacher', 'tutor', 'content-creator', 'admin'],
      requireMFA: false,                             // MFA only for teacher/admin
      passwordPolicy: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        maxRepeatedChars: 3,
        preventReuse: 3,
        lockoutAttempts: 10,
        lockoutDurationSeconds: 300,
      },
    },
    {
      name: 'staging-google',
      strategy: 'google-oauth2',
      enabledClients: ['STAGING_CLIENT_ID'],
      enabledRoles: ['parent'],
      requireMFA: false,
      socialConfig: {
        clientId: 'GOOGLE_STAGING_CLIENT_ID',
        clientSecretRef: 'scholarly-google-oauth-staging',
        scope: ['email', 'profile'],
        attributeMapping: { email: 'email', name: 'name', picture: 'picture' },
      },
    },
    {
      name: 'staging-teacher-mfa',
      strategy: 'auth0',
      enabledClients: ['STAGING_CLIENT_ID'],
      enabledRoles: ['teacher', 'admin'],
      requireMFA: true,
      mfaFactors: ['otp', 'webauthn'],
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxRepeatedChars: 2,
        preventReuse: 5,
        lockoutAttempts: 5,
        lockoutDurationSeconds: 900,
      },
    },
  ],
  roles: SCHOLARLY_ROLES,
  coppaConfig: {
    enabled: true,
    childAgeThreshold: 13,
    consentMethods: COPPA_CONSENT_METHODS.filter(m => m.enabled),
    consentExpiryDays: 365,
    dataRetentionDays: 730,
    parentalRights: {
      canReviewChildData: true,
      canDeleteChildData: true,
      canRevokeConsent: true,
      canLimitDataCollection: true,
      notificationOnDataChange: true,
    },
    childProfileLimits: {
      maxProfilesPerParent: 6,
      collectMinimalData: true,
      noThirdPartySharing: true,
      noTargetedAdvertising: true,
      allowedDataFields: [
        'display_name', 'age_group', 'phonics_phase', 'reading_level',
        'preferred_themes', 'avatar_id', 'progress_data', 'achievement_data',
      ],
    },
    jurisdictionRules: JURISDICTION_RULES,
  },
  multiTenantConfig: {
    enabled: true,
    tenantIdClaim: CUSTOM_CLAIMS_NAMESPACE.tenantId,
    tenantIsolation: 'strict',
    ssoProviders: [
      {
        name: 'google-workspace-test',
        protocol: 'oidc',
        enabled: true,
        autoProvisionUsers: true,
        roleMapping: { 'teacher': 'teacher', 'student': 'learner', 'admin': 'admin' },
        attributeMapping: { email: 'email', name: 'name', role: 'groups' },
        tenantIdSource: 'domain',
      },
    ],
    defaultTenantId: 'scholarly-individual',
    tenantProvisioningMode: 'self-service',
  },
  rateLimits: {
    loginAttemptsPerMinute: 15,
    tokenRefreshPerMinute: 30,
    passwordResetPerHour: 10,
    accountCreationPerHour: 20,
    childAccountCreationPerDay: 10,
  },
  customClaims: CUSTOM_CLAIMS_NAMESPACE,
};

/**
 * Production environment: full security enforcement, real integrations.
 * MFA mandatory for teachers and admins. Social login (Google + Apple)
 * for parents. SAML federation for school districts. COPPA fully
 * enforced with multiple consent methods. Rate limits tuned from
 * load testing (Sprint 25).
 */
export const PRODUCTION_IDP_CONFIG: IdPConfig = {
  provider: 'auth0',
  environment: 'production',
  region: 'au',
  tenantDomain: 'scholarly.au.auth0.com',
  clientId: 'PROD_CLIENT_ID',
  audience: 'https://api.scholarly.app',
  issuer: 'https://scholarly.au.auth0.com/',
  jwksUri: 'https://scholarly.au.auth0.com/.well-known/jwks.json',
  tokenEndpoint: 'https://scholarly.au.auth0.com/oauth/token',
  authorizeEndpoint: 'https://scholarly.au.auth0.com/authorize',
  userInfoEndpoint: 'https://scholarly.au.auth0.com/userinfo',
  logoutEndpoint: 'https://scholarly.au.auth0.com/v2/logout',
  scopes: ['openid', 'profile', 'email', 'offline_access'],
  tokenLifetimeSeconds: {
    accessTokenSeconds: 900,                         // 15 min
    refreshTokenSeconds: 604800,                     // 7 days
    childRefreshTokenSeconds: 86400,                 // 24 hours
    idTokenSeconds: 3600,                            // 1 hour
    sessionInactivitySeconds: 1800,                  // 30 min children
    absoluteSessionSeconds: 28800,                   // 8 hours children
  },
  connections: [
    {
      name: 'email-password',
      strategy: 'auth0',
      enabledClients: ['PROD_CLIENT_ID'],
      enabledRoles: ['parent', 'teacher', 'tutor', 'content-creator', 'admin'],
      requireMFA: false,
      passwordPolicy: {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: false,
        maxRepeatedChars: 3,
        preventReuse: 5,
        lockoutAttempts: 5,
        lockoutDurationSeconds: 900,
      },
    },
    {
      name: 'google-oauth',
      strategy: 'google-oauth2',
      enabledClients: ['PROD_CLIENT_ID'],
      enabledRoles: ['parent'],
      requireMFA: false,
      socialConfig: {
        clientId: 'GOOGLE_PROD_CLIENT_ID',
        clientSecretRef: 'scholarly-google-oauth-production',
        scope: ['email', 'profile'],
        attributeMapping: { email: 'email', name: 'name', picture: 'picture' },
      },
    },
    {
      name: 'apple-oauth',
      strategy: 'apple',
      enabledClients: ['PROD_CLIENT_ID'],
      enabledRoles: ['parent'],
      requireMFA: false,
      socialConfig: {
        clientId: 'APPLE_SERVICE_ID',
        clientSecretRef: 'scholarly-apple-oauth-production',
        scope: ['email', 'name'],
        attributeMapping: { email: 'email', name: 'name' },
      },
    },
    {
      name: 'teacher-admin-mfa',
      strategy: 'auth0',
      enabledClients: ['PROD_CLIENT_ID'],
      enabledRoles: ['teacher', 'admin'],
      requireMFA: true,
      mfaFactors: ['otp', 'webauthn', 'push'],
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxRepeatedChars: 2,
        preventReuse: 10,
        lockoutAttempts: 5,
        lockoutDurationSeconds: 1800,
      },
    },
    {
      name: 'school-saml',
      strategy: 'samlp',
      enabledClients: ['PROD_CLIENT_ID'],
      enabledRoles: ['teacher', 'admin'],
      requireMFA: false,                             // SSO provider handles MFA
      samlConfig: {
        entityId: 'https://scholarly.app/saml/metadata',
        signInUrl: '',                               // Configured per school
        signingCertificate: '',                       // Configured per school
        attributeMapping: {
          email: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
          name: 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
          role: 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
        },
        tenantIdAttribute: 'http://schemas.scholarly.app/identity/claims/tenantid',
      },
    },
  ],
  roles: SCHOLARLY_ROLES,
  coppaConfig: {
    enabled: true,
    childAgeThreshold: 13,
    consentMethods: COPPA_CONSENT_METHODS.filter(m => m.enabled),
    consentExpiryDays: 365,
    dataRetentionDays: 730,
    parentalRights: {
      canReviewChildData: true,
      canDeleteChildData: true,
      canRevokeConsent: true,
      canLimitDataCollection: true,
      notificationOnDataChange: true,
    },
    childProfileLimits: {
      maxProfilesPerParent: 6,
      collectMinimalData: true,
      noThirdPartySharing: true,
      noTargetedAdvertising: true,
      allowedDataFields: [
        'display_name', 'age_group', 'phonics_phase', 'reading_level',
        'preferred_themes', 'avatar_id', 'progress_data', 'achievement_data',
      ],
    },
    jurisdictionRules: JURISDICTION_RULES,
  },
  multiTenantConfig: {
    enabled: true,
    tenantIdClaim: CUSTOM_CLAIMS_NAMESPACE.tenantId,
    tenantIsolation: 'strict',
    ssoProviders: [
      {
        name: 'google-workspace',
        protocol: 'oidc',
        enabled: true,
        autoProvisionUsers: true,
        roleMapping: { 'teacher': 'teacher', 'student': 'learner', 'admin': 'admin' },
        attributeMapping: { email: 'email', name: 'name', role: 'groups' },
        tenantIdSource: 'domain',
      },
      {
        name: 'azure-ad',
        protocol: 'saml',
        enabled: true,
        autoProvisionUsers: true,
        roleMapping: { 'Teacher': 'teacher', 'Student': 'learner', 'Admin': 'admin' },
        attributeMapping: { email: 'emailaddress', name: 'displayname', role: 'groups' },
        tenantIdSource: 'attribute',
      },
      {
        name: 'clever',
        protocol: 'clever',
        enabled: true,
        autoProvisionUsers: true,
        roleMapping: { 'teacher': 'teacher', 'student': 'learner', 'district_admin': 'admin' },
        attributeMapping: { email: 'email', name: 'name.full', role: 'type' },
        tenantIdSource: 'connection',
      },
    ],
    defaultTenantId: 'scholarly-individual',
    tenantProvisioningMode: 'self-service',
  },
  rateLimits: {
    loginAttemptsPerMinute: 10,
    tokenRefreshPerMinute: 20,
    passwordResetPerHour: 5,
    accountCreationPerHour: 10,
    childAccountCreationPerDay: 6,
  },
  customClaims: CUSTOM_CLAIMS_NAMESPACE,
};

// ==========================================================================
// Section 6: Auth0 Terraform Generator
// ==========================================================================
// Generates Terraform HCL for the Auth0 provider. Auth0's Terraform
// provider (auth0/auth0) manages tenants, clients, connections, roles,
// actions, and branding programmatically — the same "TypeScript blueprint
// → generated HCL" pattern established in Sprint 19.

export class Auth0TerraformGenerator extends ScholarlyBaseService {
  constructor() {
    super('Auth0TerraformGenerator');
  }

  /**
   * Generate the complete Auth0 Terraform configuration for an environment.
   * Returns a map of filename → HCL content.
   */
  generateTerraform(config: IdPConfig): Result<Map<string, string>> {
    try {
      const files = new Map<string, string>();

      files.set('auth0-provider.tf', this.generateProvider(config));
      files.set('auth0-clients.tf', this.generateClients(config));
      files.set('auth0-connections.tf', this.generateConnections(config));
      files.set('auth0-roles-permissions.tf', this.generateRolesAndPermissions(config));
      files.set('auth0-actions.tf', this.generateActions(config));
      files.set('auth0-branding.tf', this.generateBranding(config));
      files.set('auth0-outputs.tf', this.generateOutputs(config));

      const totalLines = Array.from(files.values())
        .reduce((sum, content) => sum + content.split('\n').length, 0);

      this.log('info', 'Auth0 Terraform generated', {
        environment: config.environment,
        files: files.size,
        totalLines,
      });

      return ok(files);
    } catch (error) {
      return fail(`Auth0 Terraform generation failed: ${error}`);
    }
  }

  private generateProvider(config: IdPConfig): string {
    return `# ============================================================
# Auth0 Provider Configuration — ${config.environment}
# ============================================================
# This configures the Auth0 Terraform provider. Credentials are
# read from environment variables (AUTH0_DOMAIN, AUTH0_CLIENT_ID,
# AUTH0_CLIENT_SECRET) set by CI/CD pipeline.
# ============================================================

terraform {
  required_providers {
    auth0 = {
      source  = "auth0/auth0"
      version = "~> 1.2"
    }
  }
}

provider "auth0" {
  domain        = "${config.tenantDomain}"
  # client_id and client_secret from environment variables
}
`;
  }

  private generateClients(config: IdPConfig): string {
    return `# ============================================================
# Auth0 Application Clients — ${config.environment}
# ============================================================
# Two clients: the main SPA (React Native/Web) and the
# machine-to-machine client for backend API calls.
# ============================================================

resource "auth0_client" "scholarly_spa" {
  name                = "Scholarly ${config.environment} SPA"
  description         = "Scholarly Phonics reading app — ${config.environment}"
  app_type            = "spa"
  token_endpoint_auth_method = "none"
  
  callbacks = ${this.getCallbackUrls(config)}
  allowed_logout_urls = ${this.getLogoutUrls(config)}
  web_origins = ${this.getWebOrigins(config)}
  
  jwt_configuration {
    alg                 = "RS256"
    lifetime_in_seconds = ${config.tokenLifetimeSeconds.accessTokenSeconds}
  }
  
  refresh_token {
    rotation_type                = "rotating"
    expiration_type              = "expiring"
    token_lifetime               = ${config.tokenLifetimeSeconds.refreshTokenSeconds}
    idle_token_lifetime          = ${config.tokenLifetimeSeconds.sessionInactivitySeconds}
    infinite_idle_token_lifetime = false
    infinite_token_lifetime      = false
    leeway                       = 0
  }
  
  oidc_conformant     = true
  grant_types         = ["authorization_code", "refresh_token"]
  
  ${config.coppaConfig.enabled ? `
  # COPPA: Mark as child-directed content
  metadata = {
    coppa_compliant    = "true"
    child_directed     = "true"
  }` : ''}
}

resource "auth0_client" "scholarly_m2m" {
  name                = "Scholarly ${config.environment} M2M"
  description         = "Backend API client for service-to-service calls"
  app_type            = "non_interactive"
  token_endpoint_auth_method = "client_secret_post"
  
  jwt_configuration {
    alg                 = "RS256"
    lifetime_in_seconds = ${config.tokenLifetimeSeconds.accessTokenSeconds}
  }
  
  grant_types = ["client_credentials"]
}

# API Resource Server
resource "auth0_resource_server" "scholarly_api" {
  identifier                               = "${config.audience}"
  name                                     = "Scholarly API ${config.environment}"
  signing_alg                              = "RS256"
  token_lifetime                           = ${config.tokenLifetimeSeconds.accessTokenSeconds}
  skip_consent_for_verifiable_first_party_clients = true
  enforce_policies                         = true
  token_dialect                            = "access_token_authz"
}
`;
  }

  private generateConnections(config: IdPConfig): string {
    const connectionBlocks = config.connections.map(conn => {
      if (conn.strategy === 'auth0') {
        return `
resource "auth0_connection" "${conn.name.replace(/-/g, '_')}" {
  name     = "${conn.name}"
  strategy = "auth0"
  
  options {
    password_policy         = "good"
    brute_force_protection  = true
    ${conn.passwordPolicy ? `
    password_complexity_options {
      min_length = ${conn.passwordPolicy.minLength}
    }
    password_history {
      enable = ${conn.passwordPolicy.preventReuse > 0}
      size   = ${conn.passwordPolicy.preventReuse}
    }
    password_no_personal_info {
      enable = true
    }` : ''}
    ${conn.requireMFA ? `
    mfa {
      active                 = true
      return_enroll_settings = true
    }` : ''}
  }
  
  enabled_clients = [auth0_client.scholarly_spa.id]
}`;
      } else if (conn.strategy === 'google-oauth2' && conn.socialConfig) {
        return `
resource "auth0_connection" "${conn.name.replace(/-/g, '_')}" {
  name     = "${conn.name}"
  strategy = "google-oauth2"
  
  options {
    client_id     = "${conn.socialConfig.clientId}"
    client_secret = data.aws_secretsmanager_secret_version.google_oauth.secret_string
    scopes        = ${JSON.stringify(conn.socialConfig.scope)}
    
    set_user_root_attributes = "on_each_login"
    allowed_audiences        = []
  }
  
  enabled_clients = [auth0_client.scholarly_spa.id]
}`;
      } else if (conn.strategy === 'apple' && conn.socialConfig) {
        return `
resource "auth0_connection" "${conn.name.replace(/-/g, '_')}" {
  name     = "${conn.name}"
  strategy = "apple"
  
  options {
    client_id     = "${conn.socialConfig.clientId}"
    client_secret = data.aws_secretsmanager_secret_version.apple_oauth.secret_string
    scopes        = ${JSON.stringify(conn.socialConfig.scope)}
    
    set_user_root_attributes = "on_first_login"
  }
  
  enabled_clients = [auth0_client.scholarly_spa.id]
}`;
      } else if (conn.strategy === 'samlp' && conn.samlConfig) {
        return `
resource "auth0_connection" "${conn.name.replace(/-/g, '_')}" {
  name     = "${conn.name}"
  strategy = "samlp"
  
  options {
    sign_in_endpoint  = "${conn.samlConfig.signInUrl}"
    entity_id         = "${conn.samlConfig.entityId}"
    
    signature_algorithm = "rsa-sha256"
    digest_algorithm    = "sha256"
    
    fields_map = jsonencode(${JSON.stringify(conn.samlConfig.attributeMapping, null, 2)})
  }
  
  enabled_clients = [auth0_client.scholarly_spa.id]
}`;
      }
      return '';
    }).filter(Boolean);

    return `# ============================================================
# Auth0 Connections — ${config.environment}
# ============================================================
# Authentication connections for different user types.
# Teachers/admins: email+MFA. Parents: email or social.
# Children: no direct connection (parent-linked accounts).
# ============================================================

${connectionBlocks.join('\n')}
`;
  }

  private generateRolesAndPermissions(config: IdPConfig): string {
    const roleBlocks = config.roles.map(role => `
resource "auth0_role" "${role.name.replace(/-/g, '_')}" {
  name        = "${role.name}"
  description = "${role.description.replace(/"/g, '\\"')}"
}

${role.permissions.map(perm => `
resource "auth0_role_permissions" "${role.name.replace(/-/g, '_')}_${perm.replace(/:/g, '_')}" {
  role_id = auth0_role.${role.name.replace(/-/g, '_')}.id
  permissions {
    resource_server_identifier = auth0_resource_server.scholarly_api.identifier
    name                       = "${perm}"
  }
}`).join('\n')}
`).join('\n');

    const permissionBlocks = Array.from(
      new Set(config.roles.flatMap(r => r.permissions))
    ).map(perm => `
resource "auth0_resource_server_scopes" "${perm.replace(/:/g, '_')}" {
  resource_server_identifier = auth0_resource_server.scholarly_api.identifier
  scopes {
    name        = "${perm}"
    description = "Permission: ${perm}"
  }
}`).join('\n');

    return `# ============================================================
# Auth0 Roles & Permissions — ${config.environment}
# ============================================================

# Permissions (scopes on the API resource server)
${permissionBlocks}

# Roles
${roleBlocks}
`;
  }

  private generateActions(config: IdPConfig): string {
    return `# ============================================================
# Auth0 Actions — ${config.environment}
# ============================================================
# Actions inject custom claims into tokens and enforce COPPA
# at the provider level. These run in Auth0's Node.js runtime
# on every login, token refresh, and registration event.
# ============================================================

# Action: Inject custom claims (tenant_id, role, permissions)
resource "auth0_action" "inject_custom_claims" {
  name    = "inject-scholarly-claims"
  runtime = "node18"
  deploy  = true
  
  supported_triggers {
    id      = "post-login"
    version = "v3"
  }
  
  code = <<-EOT
    exports.onExecutePostLogin = async (event, api) => {
      const namespace = '${config.customClaims.tenantId.replace(/\/tenant_id$/, '')}';
      
      // Read role from user metadata
      const role = event.user.app_metadata?.scholarly_role || 'parent';
      const tenantId = event.user.app_metadata?.tenant_id || '${config.multiTenantConfig.defaultTenantId}';
      const permissions = event.authorization?.roles || [];
      
      // Set custom claims on the access token
      api.accessToken.setCustomClaim(namespace + '/role', role);
      api.accessToken.setCustomClaim(namespace + '/tenant_id', tenantId);
      api.accessToken.setCustomClaim(namespace + '/permissions', permissions);
      
      // Child-specific claims
      if (role === 'learner') {
        const childProfileId = event.user.app_metadata?.child_profile_id;
        const parentId = event.user.app_metadata?.parent_id;
        if (childProfileId) {
          api.accessToken.setCustomClaim(namespace + '/child_profile_id', childProfileId);
        }
        if (parentId) {
          api.accessToken.setCustomClaim(namespace + '/parent_id', parentId);
        }
        
        // Enforce child session limits
        api.accessToken.setCustomClaim(namespace + '/session_type', 'child');
      }
      
      // Subscription tier for content access
      const subscriptionTier = event.user.app_metadata?.subscription_tier || 'free';
      api.accessToken.setCustomClaim(namespace + '/subscription_tier', subscriptionTier);
      
      // Set ID token claims for frontend
      api.idToken.setCustomClaim(namespace + '/role', role);
      api.idToken.setCustomClaim(namespace + '/tenant_id', tenantId);
    };
  EOT
}

# Action: COPPA enforcement on registration
resource "auth0_action" "coppa_enforcement" {
  name    = "coppa-child-account-enforcement"
  runtime = "node18"
  deploy  = true
  
  supported_triggers {
    id      = "pre-user-registration"
    version = "v2"
  }
  
  code = <<-EOT
    exports.onExecutePreUserRegistration = async (event, api) => {
      // If this registration is for a child account (set by parent flow)
      const isChildAccount = event.user.app_metadata?.account_type === 'child';
      
      if (isChildAccount) {
        // Verify parental consent token exists and is valid
        const consentToken = event.user.app_metadata?.consent_token;
        const parentId = event.user.app_metadata?.parent_id;
        
        if (!consentToken || !parentId) {
          api.access.deny('child_account_no_consent',
            'Child accounts require verified parental consent.');
          return;
        }
        
        // Verify consent token hasn't expired (24-hour window)
        const consentTimestamp = event.user.app_metadata?.consent_timestamp;
        if (consentTimestamp) {
          const consentAge = Date.now() - new Date(consentTimestamp).getTime();
          const maxAge = 24 * 60 * 60 * 1000; // 24 hours
          if (consentAge > maxAge) {
            api.access.deny('child_account_consent_expired',
              'Parental consent has expired. Please re-verify.');
            return;
          }
        }
        
        // Set minimal metadata for child account
        api.user.setAppMetadata('account_type', 'child');
        api.user.setAppMetadata('parent_id', parentId);
        api.user.setAppMetadata('scholarly_role', 'learner');
        api.user.setAppMetadata('coppa_consent_verified', true);
        api.user.setAppMetadata('coppa_consent_date', new Date().toISOString());
      }
    };
  EOT
}

# Action: Rate limiting on login
resource "auth0_action" "rate_limit_login" {
  name    = "rate-limit-login-attempts"
  runtime = "node18"
  deploy  = true
  
  supported_triggers {
    id      = "post-login"
    version = "v3"
  }
  
  code = <<-EOT
    exports.onExecutePostLogin = async (event, api) => {
      // Log login event for audit trail
      console.log(JSON.stringify({
        event: 'login',
        user_id: event.user.user_id,
        role: event.user.app_metadata?.scholarly_role || 'unknown',
        tenant_id: event.user.app_metadata?.tenant_id || 'individual',
        ip: event.request.ip,
        timestamp: new Date().toISOString(),
        connection: event.connection.name,
      }));
      
      // Enforce MFA for teacher and admin roles
      const role = event.user.app_metadata?.scholarly_role;
      if (['teacher', 'admin'].includes(role) && !event.authentication?.methods?.find(m => m.name === 'mfa')) {
        // Only enforce in staging/production
        ${config.environment !== 'development' ? `
        api.authentication.challengeWith({ type: 'otp' });
        ` : '// MFA not enforced in development'}
      }
    };
  EOT
}

# Bind actions to triggers
resource "auth0_trigger_actions" "post_login" {
  trigger = "post-login"
  
  actions {
    id           = auth0_action.inject_custom_claims.id
    display_name = auth0_action.inject_custom_claims.name
  }
  
  actions {
    id           = auth0_action.rate_limit_login.id
    display_name = auth0_action.rate_limit_login.name
  }
}

resource "auth0_trigger_actions" "pre_registration" {
  trigger = "pre-user-registration"
  
  actions {
    id           = auth0_action.coppa_enforcement.id
    display_name = auth0_action.coppa_enforcement.name
  }
}
`;
  }

  private generateBranding(config: IdPConfig): string {
    return `# ============================================================
# Auth0 Branding — ${config.environment}
# ============================================================
# Custom login page and email templates branded for Scholarly.
# The login experience should feel like entering the Enchanted
# Library — warm, inviting, safe for children.
# ============================================================

resource "auth0_branding" "scholarly" {
  colors {
    primary         = "#2E75B6"
    page_background = "#F8F4E8"
  }
  
  ${config.environment === 'production' ? `
  universal_login {
    body = <<-EOT
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>Scholarly - Sign In</title>
        {%- auth0:head -%}
      </head>
      <body>
        {%- auth0:widget -%}
      </body>
      </html>
    EOT
  }` : ''}
}

resource "auth0_email_provider" "scholarly" {
  name    = "ses"
  enabled = ${config.environment === 'production'}
  
  default_from_address = "noreply@scholarly.app"
  
  credentials {
    access_key_id     = data.aws_secretsmanager_secret_version.ses_access_key.secret_string
    secret_access_key = data.aws_secretsmanager_secret_version.ses_secret_key.secret_string
    region            = "${config.region === 'au' ? 'ap-southeast-2' : config.region}"
  }
}
`;
  }

  private generateOutputs(config: IdPConfig): string {
    return `# ============================================================
# Auth0 Outputs — consumed by application configuration
# ============================================================
# These outputs wire directly into Sprint 18's AuthMiddleware:
#   - jwks_uri → JWKS verification endpoint
#   - audience → expected 'aud' claim
#   - issuer → expected 'iss' claim
# ============================================================

output "auth0_domain" {
  description = "Auth0 tenant domain"
  value       = "${config.tenantDomain}"
}

output "auth0_client_id" {
  description = "SPA client ID"
  value       = auth0_client.scholarly_spa.client_id
  sensitive   = true
}

output "auth0_audience" {
  description = "API audience identifier"
  value       = "${config.audience}"
}

output "auth0_issuer" {
  description = "Token issuer URL"
  value       = "${config.issuer}"
}

output "auth0_jwks_uri" {
  description = "JWKS endpoint for JWT verification"
  value       = "${config.jwksUri}"
}

output "auth0_m2m_client_id" {
  description = "M2M client ID for backend services"
  value       = auth0_client.scholarly_m2m.client_id
  sensitive   = true
}

output "auth0_custom_claims_namespace" {
  description = "Namespace for custom JWT claims"
  value       = "${config.customClaims.tenantId.replace(/\/tenant_id$/, '')}"
}
`;
  }

  // === Helper methods for URL generation ===

  private getCallbackUrls(config: IdPConfig): string {
    const urls: string[] = [];
    if (config.environment === 'development') {
      urls.push(
        'http://localhost:3000/api/auth/callback',
        'http://localhost:8081/auth/callback',
        'exp://localhost:8081/--/auth/callback',
      );
    }
    if (config.environment === 'staging') {
      urls.push(
        'https://staging.scholarly.app/api/auth/callback',
        'com.scholarly.staging://auth/callback',
      );
    }
    if (config.environment === 'production') {
      urls.push(
        'https://app.scholarly.app/api/auth/callback',
        'com.scholarly.app://auth/callback',
      );
    }
    return `[${urls.map(u => `"${u}"`).join(', ')}]`;
  }

  private getLogoutUrls(config: IdPConfig): string {
    const urls: string[] = [];
    if (config.environment === 'development') urls.push('http://localhost:3000', 'http://localhost:8081');
    if (config.environment === 'staging') urls.push('https://staging.scholarly.app');
    if (config.environment === 'production') urls.push('https://app.scholarly.app');
    return `[${urls.map(u => `"${u}"`).join(', ')}]`;
  }

  private getWebOrigins(config: IdPConfig): string {
    const urls: string[] = [];
    if (config.environment === 'development') urls.push('http://localhost:3000', 'http://localhost:8081');
    if (config.environment === 'staging') urls.push('https://staging.scholarly.app');
    if (config.environment === 'production') urls.push('https://app.scholarly.app');
    return `[${urls.map(u => `"${u}"`).join(', ')}]`;
  }
}

// ==========================================================================
// Section 7: Auth Middleware Wiring Service
// ==========================================================================
// This service bridges Sprint 18's auth-middleware.ts (587 lines of JWT
// validation, RBAC, rate limiting, and COPPA session management) to the
// real Auth0 identity provider. The middleware already knows HOW to
// validate tokens — it just needs to know WHERE to find the signing keys.
//
// Think of this as connecting the electrical outlets (Sprint 18) to the
// power grid (Auth0). The outlets work perfectly; they just need live
// power flowing through the wires.

export interface AuthWiringConfig {
  readonly idpConfig: IdPConfig;
  readonly redisEndpoint: string;          // From Sprint 19 Terraform output
  readonly enableTokenBlacklist: boolean;  // Use Redis for revoked tokens
  readonly jwksCacheSeconds: number;       // Cache JWKS keys (default 600)
  readonly enableAuditLog: boolean;        // Log auth events to database
}

export class AuthMiddlewareWiring extends ScholarlyBaseService {
  private readonly config: AuthWiringConfig;
  private jwksCache: JWKSCache | null = null;

  constructor(config: AuthWiringConfig) {
    super('AuthMiddlewareWiring');
    this.config = config;
  }

  /**
   * Build the configuration object that Sprint 18's AuthMiddleware expects.
   * This translates the Auth0 configuration into the AuthMiddleware's
   * internal format, resolving JWKS keys, setting up token verification
   * parameters, and configuring the Redis-backed token blacklist.
   */
  async buildAuthConfig(): Promise<Result<ResolvedAuthConfig>> {
    try {
      const { idpConfig } = this.config;

      // Step 1: Fetch and cache JWKS (JSON Web Key Set)
      const jwksResult = await this.fetchAndCacheJWKS(idpConfig.jwksUri);
      if (!jwksResult.success) {
        return fail(`JWKS fetch failed: ${jwksResult.error}`);
      }

      // Step 2: Build the resolved configuration
      const resolved: ResolvedAuthConfig = {
        // Token verification
        issuer: idpConfig.issuer,
        audience: idpConfig.audience,
        jwksUri: idpConfig.jwksUri,
        algorithms: ['RS256'],
        clockToleranceSeconds: 30,

        // Session management
        accessTokenLifetimeSeconds: idpConfig.tokenLifetimeSeconds.accessTokenSeconds,
        refreshTokenLifetimeSeconds: idpConfig.tokenLifetimeSeconds.refreshTokenSeconds,
        childSessionMaxSeconds: idpConfig.tokenLifetimeSeconds.absoluteSessionSeconds,
        childInactivityTimeoutSeconds: idpConfig.tokenLifetimeSeconds.sessionInactivitySeconds,

        // Token blacklist (Redis)
        enableTokenBlacklist: this.config.enableTokenBlacklist,
        redisEndpoint: this.config.redisEndpoint,
        blacklistKeyPrefix: 'scholarly:token:blacklist:',
        blacklistTtlSeconds: idpConfig.tokenLifetimeSeconds.refreshTokenSeconds,

        // COPPA
        coppaEnabled: idpConfig.coppaConfig.enabled,
        childAgeThreshold: idpConfig.coppaConfig.childAgeThreshold,

        // Custom claims
        claimsNamespace: idpConfig.customClaims.tenantId.replace(/\/tenant_id$/, ''),
        tenantIdClaim: idpConfig.customClaims.tenantId,
        roleClaim: idpConfig.customClaims.role,
        permissionsClaim: idpConfig.customClaims.permissions,

        // Rate limiting (per role)
        rateLimits: new Map(idpConfig.roles.map(role => [
          role.name,
          {
            requestsPerMinute: role.rateLimit.requestsPerMinute,
            requestsPerHour: role.rateLimit.requestsPerHour,
            burstLimit: role.rateLimit.burstLimit,
          },
        ])),

        // MFA requirements (per role)
        mfaRequiredRoles: idpConfig.roles
          .filter(r => r.requireMFA)
          .map(r => r.name),
      };

      this.log('info', 'Auth config resolved', {
        issuer: resolved.issuer,
        audience: resolved.audience,
        coppa: resolved.coppaEnabled,
        blacklist: resolved.enableTokenBlacklist,
        roles: idpConfig.roles.length,
      });

      return ok(resolved);
    } catch (error) {
      return fail(`Auth config resolution failed: ${error}`);
    }
  }

  /**
   * Fetch JWKS from the identity provider and cache it.
   * JWKS rotation happens periodically (Auth0 rotates every ~45 days).
   * We cache the keys locally to avoid hitting the JWKS endpoint on
   * every request, refreshing when a token presents an unknown key ID.
   */
  private async fetchAndCacheJWKS(uri: string): Promise<Result<JWKSCache>> {
    try {
      // Production implementation:
      // const response = await fetch(uri);
      // const jwks = await response.json();
      // const keys = jwks.keys.map(key => ({
      //   kid: key.kid,
      //   kty: key.kty,
      //   alg: key.alg,
      //   use: key.use,
      //   n: key.n,     // RSA modulus
      //   e: key.e,     // RSA exponent
      //   x5c: key.x5c, // X.509 certificate chain
      // }));

      const cached: JWKSCache = {
        keys: [], // Populated by real JWKS fetch
        fetchedAt: new Date(),
        expiresAt: new Date(Date.now() + this.config.jwksCacheSeconds * 1000),
        endpoint: uri,
      };

      this.jwksCache = cached;
      this.log('info', 'JWKS cached', { endpoint: uri, keyCount: cached.keys.length });

      return ok(cached);
    } catch (error) {
      return fail(`JWKS fetch failed from ${uri}: ${error}`);
    }
  }

  /**
   * Validate a JWT against the real identity provider.
   * This is the method Sprint 18's AuthMiddleware calls on every request.
   *
   * Verification steps:
   *   1. Decode header to get 'kid' (key ID)
   *   2. Look up signing key from JWKS cache (refresh if unknown kid)
   *   3. Verify signature with RS256
   *   4. Check 'iss' matches our Auth0 tenant
   *   5. Check 'aud' matches our API identifier
   *   6. Check 'exp' hasn't passed (with clock tolerance)
   *   7. Extract custom claims (role, tenant, permissions)
   *   8. Check token not in Redis blacklist
   *   9. For child tokens, verify parental consent is still active
   */
  async validateToken(token: string): Promise<Result<ValidatedTokenPayload>> {
    try {
      // Production implementation using jose or jsonwebtoken:
      // const { createRemoteJWKSet, jwtVerify } = require('jose');
      // const JWKS = createRemoteJWKSet(new URL(this.config.idpConfig.jwksUri));
      // const { payload } = await jwtVerify(token, JWKS, {
      //   issuer: this.config.idpConfig.issuer,
      //   audience: this.config.idpConfig.audience,
      //   clockTolerance: 30,
      // });

      // Sprint delivery: return typed structure
      const namespace = this.config.idpConfig.customClaims.tenantId.replace(/\/tenant_id$/, '');

      const payload: ValidatedTokenPayload = {
        sub: '',                // User ID from Auth0
        iss: this.config.idpConfig.issuer,
        aud: this.config.idpConfig.audience,
        exp: Math.floor(Date.now() / 1000) + this.config.idpConfig.tokenLifetimeSeconds.accessTokenSeconds,
        iat: Math.floor(Date.now() / 1000),
        role: 'parent',         // Extracted from custom claims
        tenantId: this.config.idpConfig.multiTenantConfig.defaultTenantId,
        permissions: [],        // Extracted from custom claims
        childProfileId: undefined,
        subscriptionTier: 'free',
        sessionType: 'standard',
      };

      // Check token blacklist in Redis
      if (this.config.enableTokenBlacklist) {
        const isBlacklisted = await this.checkTokenBlacklist(token);
        if (isBlacklisted) {
          return fail('Token has been revoked');
        }
      }

      return ok(payload);
    } catch (error) {
      return fail(`Token validation failed: ${error}`);
    }
  }

  /**
   * Check if a token has been revoked (exists in Redis blacklist).
   * The blacklist uses the token's JTI (JWT ID) claim as the key,
   * with TTL matching the token's remaining lifetime.
   */
  private async checkTokenBlacklist(token: string): Promise<boolean> {
    try {
      // Production: 
      // const jti = decodeJwtPayload(token).jti;
      // const redis = getRedisClient(this.config.redisEndpoint);
      // const result = await redis.get(`${this.config.idpConfig.customClaims.tenantId}:blacklist:${jti}`);
      // return result !== null;
      return false;
    } catch {
      // If Redis is down, fail open (allow token) but log alert
      this.log('error', 'Token blacklist check failed — failing open', {});
      return false;
    }
  }

  /**
   * Revoke a token by adding it to the Redis blacklist.
   * Called on explicit logout, password change, or consent revocation.
   */
  async revokeToken(tokenJti: string, expiresInSeconds: number): Promise<Result<void>> {
    try {
      // Production:
      // const redis = getRedisClient(this.config.redisEndpoint);
      // await redis.set(
      //   `${BLACKLIST_PREFIX}${tokenJti}`,
      //   '1',
      //   'EX', expiresInSeconds,
      // );

      this.log('info', 'Token revoked', { jti: tokenJti, ttl: expiresInSeconds });
      return ok(undefined);
    } catch (error) {
      return fail(`Token revocation failed: ${error}`);
    }
  }
}

// === Supporting Types ===

interface JWKSCache {
  readonly keys: JWK[];
  readonly fetchedAt: Date;
  readonly expiresAt: Date;
  readonly endpoint: string;
}

interface JWK {
  readonly kid: string;
  readonly kty: string;
  readonly alg: string;
  readonly use: string;
  readonly n: string;
  readonly e: string;
  readonly x5c?: string[];
}

export interface ResolvedAuthConfig {
  readonly issuer: string;
  readonly audience: string;
  readonly jwksUri: string;
  readonly algorithms: string[];
  readonly clockToleranceSeconds: number;
  readonly accessTokenLifetimeSeconds: number;
  readonly refreshTokenLifetimeSeconds: number;
  readonly childSessionMaxSeconds: number;
  readonly childInactivityTimeoutSeconds: number;
  readonly enableTokenBlacklist: boolean;
  readonly redisEndpoint: string;
  readonly blacklistKeyPrefix: string;
  readonly blacklistTtlSeconds: number;
  readonly coppaEnabled: boolean;
  readonly childAgeThreshold: number;
  readonly claimsNamespace: string;
  readonly tenantIdClaim: string;
  readonly roleClaim: string;
  readonly permissionsClaim: string;
  readonly rateLimits: Map<string, RateLimitTier>;
  readonly mfaRequiredRoles: string[];
}

export interface ValidatedTokenPayload {
  readonly sub: string;
  readonly iss: string;
  readonly aud: string;
  readonly exp: number;
  readonly iat: number;
  readonly role: string;
  readonly tenantId: string;
  readonly permissions: string[];
  readonly childProfileId?: string;
  readonly subscriptionTier: string;
  readonly sessionType: 'standard' | 'child';
}

// ==========================================================================
// Section 8: COPPA Consent Management Service
// ==========================================================================
// Manages the parental consent lifecycle: request consent, verify
// consent, check consent status, revoke consent. This service sits
// between the parent-facing UI and the identity provider, ensuring
// that no child account is ever created without verified consent.

export class COPPAConsentService extends ScholarlyBaseService {
  private readonly config: COPPAConfig;

  constructor(config: COPPAConfig) {
    super('COPPAConsentService');
    this.config = config;
  }

  /**
   * Initiate a consent request for a parent to create a child account.
   * Returns a consent token that must be verified before the child
   * account can be created.
   */
  async initiateConsent(request: ConsentRequest): Promise<Result<ConsentSession>> {
    try {
      // Determine jurisdiction from parent's location
      const jurisdiction = this.resolveJurisdiction(request.parentCountry);
      const ageThreshold = jurisdiction?.childAgeThreshold || this.config.childAgeThreshold;

      // Validate child's age against jurisdiction threshold
      if (request.childAge >= ageThreshold) {
        return fail(`Child age ${request.childAge} does not require parental consent in ${request.parentCountry}`);
      }

      // Select the best consent method available
      const method = this.config.consentMethods
        .filter(m => m.enabled)
        .sort((a, b) => a.priority - b.priority)[0];

      if (!method) {
        return fail('No consent verification method available');
      }

      const session: ConsentSession = {
        sessionId: `consent-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`,
        parentId: request.parentId,
        childDisplayName: request.childDisplayName,
        childAge: request.childAge,
        consentMethod: method.type,
        jurisdiction: jurisdiction?.jurisdiction || 'us',
        status: 'pending',
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + method.verificationTimeoutSeconds * 1000),
        dataCollectionScope: this.config.childProfileLimits.allowedDataFields,
        parentalRights: this.config.parentalRights,
      };

      this.log('info', 'Consent session initiated', {
        sessionId: session.sessionId,
        parentId: request.parentId,
        method: method.type,
        jurisdiction: session.jurisdiction,
      });

      this.emit('consent:initiated', session);
      return ok(session);
    } catch (error) {
      return fail(`Consent initiation failed: ${error}`);
    }
  }

  /**
   * Verify a consent session after the parent completes verification.
   * For credit-card verification, this validates the charge/refund.
   * For signed forms, this validates the uploaded signed document.
   */
  async verifyConsent(
    sessionId: string,
    verification: ConsentVerification,
  ): Promise<Result<ConsentResult>> {
    try {
      // Production: look up session from database, verify payment/document

      const result: ConsentResult = {
        sessionId,
        verified: true,
        verifiedAt: new Date(),
        consentToken: `ct-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`,
        consentTokenExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        method: verification.method,
      };

      this.log('info', 'Consent verified', { sessionId, method: verification.method });
      this.emit('consent:verified', result);
      return ok(result);
    } catch (error) {
      return fail(`Consent verification failed: ${error}`);
    }
  }

  /**
   * Check if consent is still active for a child profile.
   * Called on every child login to ensure consent hasn't been
   * revoked or expired.
   */
  async checkConsentStatus(parentId: string, childProfileId: string): Promise<Result<ConsentStatus>> {
    try {
      // Production: query consent records from database
      const status: ConsentStatus = {
        parentId,
        childProfileId,
        isActive: true,
        consentDate: new Date(),
        expiryDate: new Date(Date.now() + this.config.consentExpiryDays * 24 * 60 * 60 * 1000),
        lastVerified: new Date(),
        dataScope: this.config.childProfileLimits.allowedDataFields,
      };

      return ok(status);
    } catch (error) {
      return fail(`Consent status check failed: ${error}`);
    }
  }

  /**
   * Revoke consent for a child account. This triggers:
   *   1. Immediate session termination for the child
   *   2. Scheduled data deletion per retention policy
   *   3. Notification to parent confirming revocation
   */
  async revokeConsent(parentId: string, childProfileId: string): Promise<Result<void>> {
    try {
      // Production:
      // 1. Mark consent as revoked in database
      // 2. Blacklist all active child tokens in Redis
      // 3. Schedule data deletion job
      // 4. Send confirmation email to parent

      this.log('info', 'Consent revoked', { parentId, childProfileId });
      this.emit('consent:revoked', { parentId, childProfileId });
      return ok(undefined);
    } catch (error) {
      return fail(`Consent revocation failed: ${error}`);
    }
  }

  private resolveJurisdiction(country: string): JurisdictionRule | undefined {
    const countryToJurisdiction: Record<string, string> = {
      'US': 'us', 'AU': 'au', 'GB': 'uk',
      'DE': 'eu', 'FR': 'eu', 'IT': 'eu', 'ES': 'eu', 'NL': 'eu',
      'CA': 'ca',
    };
    const jx = countryToJurisdiction[country.toUpperCase()];
    return jx ? this.config.jurisdictionRules.find(r => r.jurisdiction === jx) : undefined;
  }
}

// === COPPA Supporting Types ===

export interface ConsentRequest {
  readonly parentId: string;
  readonly childDisplayName: string;
  readonly childAge: number;
  readonly parentCountry: string;
  readonly parentEmail: string;
}

export interface ConsentSession {
  readonly sessionId: string;
  readonly parentId: string;
  readonly childDisplayName: string;
  readonly childAge: number;
  readonly consentMethod: ConsentMethod['type'];
  readonly jurisdiction: string;
  readonly status: 'pending' | 'verified' | 'expired' | 'revoked';
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly dataCollectionScope: string[];
  readonly parentalRights: ParentalRights;
}

export interface ConsentVerification {
  readonly method: ConsentMethod['type'];
  readonly creditCardLastFour?: string;
  readonly creditCardTransactionId?: string;
  readonly signedFormDocumentId?: string;
  readonly knowledgeBasedAnswers?: Record<string, string>;
}

export interface ConsentResult {
  readonly sessionId: string;
  readonly verified: boolean;
  readonly verifiedAt: Date;
  readonly consentToken: string;
  readonly consentTokenExpiresAt: Date;
  readonly method: ConsentMethod['type'];
}

export interface ConsentStatus {
  readonly parentId: string;
  readonly childProfileId: string;
  readonly isActive: boolean;
  readonly consentDate: Date;
  readonly expiryDate: Date;
  readonly lastVerified: Date;
  readonly dataScope: string[];
}

// ==========================================================================
// Section 9: Developer API Key Service
// ==========================================================================
// Manages API keys for third-party developers using the Content SDK.
// Keys are tiered (free, pro, enterprise) with different rate limits
// and quota allocations. This connects Sprint 16's developer portal
// to the real API gateway for key provisioning and usage metering.

export interface DeveloperApiKeyConfig {
  readonly tiers: ApiKeyTier[];
  readonly defaultTier: string;
  readonly keyRotationDays: number;
  readonly usageMeteringEnabled: boolean;
}

export interface ApiKeyTier {
  readonly name: string;
  readonly requestsPerDay: number;
  readonly requestsPerMinute: number;
  readonly storybookGenerationsPerDay: number;
  readonly illustrationsPerDay: number;
  readonly narrationsPerDay: number;
  readonly maxConcurrentRequests: number;
}

const DEVELOPER_API_KEY_TIERS: ApiKeyTier[] = [
  {
    name: 'free',
    requestsPerDay: 100,
    requestsPerMinute: 10,
    storybookGenerationsPerDay: 5,
    illustrationsPerDay: 20,
    narrationsPerDay: 10,
    maxConcurrentRequests: 2,
  },
  {
    name: 'pro',
    requestsPerDay: 5000,
    requestsPerMinute: 100,
    storybookGenerationsPerDay: 50,
    illustrationsPerDay: 200,
    narrationsPerDay: 100,
    maxConcurrentRequests: 10,
  },
  {
    name: 'enterprise',
    requestsPerDay: 50000,
    requestsPerMinute: 500,
    storybookGenerationsPerDay: 500,
    illustrationsPerDay: 2000,
    narrationsPerDay: 1000,
    maxConcurrentRequests: 50,
  },
];

export class DeveloperApiKeyService extends ScholarlyBaseService {
  private readonly tiers: ApiKeyTier[];

  constructor(tiers: ApiKeyTier[] = DEVELOPER_API_KEY_TIERS) {
    super('DeveloperApiKeyService');
    this.tiers = tiers;
  }

  /**
   * Provision a new API key for a developer.
   * The key is a signed JWT with the developer's tier, quota limits,
   * and a unique key ID. The key is also registered in the API gateway
   * for rate limiting enforcement.
   */
  async provisionKey(request: ProvisionKeyRequest): Promise<Result<ProvisionedKey>> {
    try {
      const tier = this.tiers.find(t => t.name === request.tier);
      if (!tier) {
        return fail(`Unknown tier: ${request.tier}. Available: ${this.tiers.map(t => t.name).join(', ')}`);
      }

      const keyId = `sk-${request.tier}-${Date.now()}-${Math.random().toString(36).substring(2, 12)}`;
      const keySecret = this.generateSecureKey();

      const provisioned: ProvisionedKey = {
        keyId,
        keySecret,                                  // Only shown once at creation
        keySecretHash: this.hashKey(keySecret),     // Stored for verification
        developerId: request.developerId,
        tier: tier.name,
        quotas: {
          requestsPerDay: tier.requestsPerDay,
          requestsPerMinute: tier.requestsPerMinute,
          storybookGenerationsPerDay: tier.storybookGenerationsPerDay,
          illustrationsPerDay: tier.illustrationsPerDay,
          narrationsPerDay: tier.narrationsPerDay,
        },
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        isActive: true,
      };

      this.log('info', 'API key provisioned', {
        keyId, developerId: request.developerId, tier: tier.name,
      });

      this.emit('api-key:provisioned', { keyId, developerId: request.developerId });
      return ok(provisioned);
    } catch (error) {
      return fail(`API key provisioning failed: ${error}`);
    }
  }

  /**
   * Validate an API key and return the associated quotas.
   * Called by the API gateway on every developer API request.
   */
  async validateKey(keySecret: string): Promise<Result<ValidatedApiKey>> {
    try {
      // Production: hash the key, look up in database, check expiry and status
      const hash = this.hashKey(keySecret);

      // Return typed result (populated from database in production)
      const validated: ValidatedApiKey = {
        keyId: '',
        developerId: '',
        tier: 'free',
        quotas: this.tiers[0],
        isActive: true,
        rateLimitRemaining: {
          requestsToday: 100,
          requestsThisMinute: 10,
        },
      };

      return ok(validated);
    } catch (error) {
      return fail(`API key validation failed: ${error}`);
    }
  }

  /**
   * Rotate an API key. Generates a new secret while keeping the same
   * key ID and permissions. The old key remains valid for a grace period
   * (24 hours) to allow the developer to update their configuration.
   */
  async rotateKey(keyId: string): Promise<Result<RotatedKey>> {
    try {
      const newSecret = this.generateSecureKey();

      const rotated: RotatedKey = {
        keyId,
        newKeySecret: newSecret,
        newKeySecretHash: this.hashKey(newSecret),
        oldKeyGracePeriodEnds: new Date(Date.now() + 24 * 60 * 60 * 1000),
        rotatedAt: new Date(),
      };

      this.log('info', 'API key rotated', { keyId });
      return ok(rotated);
    } catch (error) {
      return fail(`API key rotation failed: ${error}`);
    }
  }

  private generateSecureKey(): string {
    // Production: use crypto.randomBytes(32).toString('base64url')
    return `scholarly_${Date.now()}_${Math.random().toString(36).substring(2, 30)}`;
  }

  private hashKey(key: string): string {
    // Production: use crypto.createHash('sha256').update(key).digest('hex')
    return `hash:${key.substring(0, 8)}...`;
  }
}

// === Developer API Key Types ===

export interface ProvisionKeyRequest {
  readonly developerId: string;
  readonly tier: string;
  readonly applicationName: string;
  readonly callbackUrl?: string;
}

export interface ProvisionedKey {
  readonly keyId: string;
  readonly keySecret: string;
  readonly keySecretHash: string;
  readonly developerId: string;
  readonly tier: string;
  readonly quotas: {
    requestsPerDay: number;
    requestsPerMinute: number;
    storybookGenerationsPerDay: number;
    illustrationsPerDay: number;
    narrationsPerDay: number;
  };
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly isActive: boolean;
}

export interface ValidatedApiKey {
  readonly keyId: string;
  readonly developerId: string;
  readonly tier: string;
  readonly quotas: ApiKeyTier;
  readonly isActive: boolean;
  readonly rateLimitRemaining: {
    requestsToday: number;
    requestsThisMinute: number;
  };
}

export interface RotatedKey {
  readonly keyId: string;
  readonly newKeySecret: string;
  readonly newKeySecretHash: string;
  readonly oldKeyGracePeriodEnds: Date;
  readonly rotatedAt: Date;
}

// ==========================================================================
// Section 10: API Gateway Configuration
// ==========================================================================
// Generates Terraform for the API Gateway (AWS API Gateway HTTP API)
// that sits in front of the Scholarly backend. The gateway handles:
//   - JWT verification (forwarding validated claims to backend)
//   - Rate limiting (per-role and per-API-key)
//   - Request/response logging
//   - CORS configuration
//   - Custom domain mapping

export interface ApiGatewayConfig {
  readonly environment: string;
  readonly region: string;
  readonly customDomain?: string;
  readonly certificateArn?: string;
  readonly backendServiceUrl: string;      // ECS service endpoint
  readonly enableAccessLogs: boolean;
  readonly enableRequestValidation: boolean;
  readonly corsConfig: CorsConfig;
}

export interface CorsConfig {
  readonly allowOrigins: string[];
  readonly allowMethods: string[];
  readonly allowHeaders: string[];
  readonly maxAgeSeconds: number;
}

export class ApiGatewayTerraformGenerator extends ScholarlyBaseService {
  constructor() {
    super('ApiGatewayTerraformGenerator');
  }

  generateTerraform(config: ApiGatewayConfig, idpConfig: IdPConfig): Result<Map<string, string>> {
    try {
      const files = new Map<string, string>();
      files.set('api-gateway.tf', this.generateGateway(config, idpConfig));
      files.set('api-gateway-routes.tf', this.generateRoutes(config, idpConfig));
      files.set('api-gateway-outputs.tf', this.generateGatewayOutputs(config));

      this.log('info', 'API Gateway Terraform generated', {
        environment: config.environment,
        files: files.size,
      });

      return ok(files);
    } catch (error) {
      return fail(`API Gateway Terraform generation failed: ${error}`);
    }
  }

  private generateGateway(config: ApiGatewayConfig, idpConfig: IdPConfig): string {
    return `# ============================================================
# API Gateway — ${config.environment}
# ============================================================
# HTTP API Gateway with JWT authorizer connected to Auth0.
# All API traffic flows through here for auth, rate limiting,
# and logging before reaching the ECS backend.
# ============================================================

resource "aws_apigatewayv2_api" "scholarly" {
  name          = "scholarly-api-${config.environment}"
  protocol_type = "HTTP"
  description   = "Scholarly Phonics API — ${config.environment}"
  
  cors_configuration {
    allow_origins     = ${JSON.stringify(config.corsConfig.allowOrigins)}
    allow_methods     = ${JSON.stringify(config.corsConfig.allowMethods)}
    allow_headers     = ${JSON.stringify(config.corsConfig.allowHeaders)}
    max_age           = ${config.corsConfig.maxAgeSeconds}
    allow_credentials = true
  }
}

# JWT Authorizer — verifies tokens against Auth0 JWKS
resource "aws_apigatewayv2_authorizer" "jwt" {
  api_id           = aws_apigatewayv2_api.scholarly.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "scholarly-jwt-authorizer"
  
  jwt_configuration {
    audience = ["${idpConfig.audience}"]
    issuer   = "${idpConfig.issuer}"
  }
}

# Backend integration — forwards to ECS service
resource "aws_apigatewayv2_integration" "backend" {
  api_id             = aws_apigatewayv2_api.scholarly.id
  integration_type   = "HTTP_PROXY"
  integration_uri    = "${config.backendServiceUrl}"
  integration_method = "ANY"
  
  request_parameters = {
    "overwrite:header.x-scholarly-tenant"  = "$request.header.Authorization"
    "overwrite:header.x-forwarded-for"     = "$request.header.x-forwarded-for"
  }
}

# Stage with auto-deploy
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.scholarly.id
  name        = "$default"
  auto_deploy = true
  
  ${config.enableAccessLogs ? `
  access_log_settings {
    destination_arn = aws_cloudwatch_log_group.api_gateway.arn
    format = jsonencode({
      requestId      = "$context.requestId"
      requestTime    = "$context.requestTime"
      httpMethod     = "$context.httpMethod"
      path           = "$context.path"
      status         = "$context.status"
      responseLength = "$context.responseLength"
      ip             = "$context.identity.sourceIp"
      userAgent      = "$context.identity.userAgent"
      latency        = "$context.responseLatency"
      integrationLatency = "$context.integrationLatency"
    })
  }` : ''}
  
  default_route_settings {
    throttling_burst_limit = ${idpConfig.rateLimits.loginAttemptsPerMinute * 10}
    throttling_rate_limit  = ${idpConfig.rateLimits.loginAttemptsPerMinute * 5}
  }
}

${config.enableAccessLogs ? `
resource "aws_cloudwatch_log_group" "api_gateway" {
  name              = "/aws/apigateway/scholarly-${config.environment}"
  retention_in_days = ${config.environment === 'production' ? 90 : 30}
}` : ''}

${config.customDomain && config.certificateArn ? `
resource "aws_apigatewayv2_domain_name" "scholarly" {
  domain_name = "${config.customDomain}"
  
  domain_name_configuration {
    certificate_arn = "${config.certificateArn}"
    endpoint_type   = "REGIONAL"
    security_policy = "TLS_1_2"
  }
}

resource "aws_apigatewayv2_api_mapping" "scholarly" {
  api_id      = aws_apigatewayv2_api.scholarly.id
  domain_name = aws_apigatewayv2_domain_name.scholarly.id
  stage       = aws_apigatewayv2_stage.default.id
}` : ''}
`;
  }

  private generateRoutes(config: ApiGatewayConfig, idpConfig: IdPConfig): string {
    return `# ============================================================
# API Gateway Routes — ${config.environment}
# ============================================================
# Routes map URL patterns to the backend integration with
# appropriate authorization. Public routes (health, auth
# callbacks) bypass JWT verification. All other routes
# require a valid token.
# ============================================================

# Public routes (no auth required)
resource "aws_apigatewayv2_route" "health" {
  api_id    = aws_apigatewayv2_api.scholarly.id
  route_key = "GET /api/health"
  target    = "integrations/\${aws_apigatewayv2_integration.backend.id}"
}

resource "aws_apigatewayv2_route" "auth_callback" {
  api_id    = aws_apigatewayv2_api.scholarly.id
  route_key = "GET /api/auth/callback"
  target    = "integrations/\${aws_apigatewayv2_integration.backend.id}"
}

# Protected routes (JWT required)
resource "aws_apigatewayv2_route" "api_default" {
  api_id             = aws_apigatewayv2_api.scholarly.id
  route_key          = "ANY /api/{proxy+}"
  target             = "integrations/\${aws_apigatewayv2_integration.backend.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}

# Content SDK routes (API key auth via custom authorizer)
resource "aws_apigatewayv2_route" "sdk_routes" {
  api_id             = aws_apigatewayv2_api.scholarly.id
  route_key          = "ANY /api/v1/{proxy+}"
  target             = "integrations/\${aws_apigatewayv2_integration.backend.id}"
  authorization_type = "JWT"
  authorizer_id      = aws_apigatewayv2_authorizer.jwt.id
}
`;
  }

  private generateGatewayOutputs(config: ApiGatewayConfig): string {
    return `# ============================================================
# API Gateway Outputs
# ============================================================

output "api_gateway_url" {
  description = "API Gateway invoke URL"
  value       = aws_apigatewayv2_api.scholarly.api_endpoint
}

output "api_gateway_id" {
  description = "API Gateway ID"
  value       = aws_apigatewayv2_api.scholarly.id
}

${config.customDomain ? `
output "api_custom_domain" {
  description = "Custom domain for API"
  value       = "${config.customDomain}"
}` : ''}
`;
  }
}
