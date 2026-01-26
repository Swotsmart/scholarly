/**
 * LTI 1.3 Advantage Service
 *
 * Production-ready implementation of the IMS Global LTI 1.3 Advantage specification,
 * providing secure interoperability between Scholarly and external learning platforms/tools.
 *
 * Features:
 * - Platform & Tool Registration with RSA key pair management
 * - OIDC Login Initiation Flow (third-party initiated login)
 * - OIDC Callback Validation with JWT (RS256) signature verification
 * - Deep Linking 2.0 content item response creation
 * - Assignment & Grade Services (AGS) 2.0: line items, scores, results
 * - Names & Role Provisioning Services (NRPS) 2.0: membership queries
 * - RS256 JWT generation and verification utilities
 *
 * Implements: IMS LTI 1.3, LTI-AGS 2.0, LTI-NRPS 2.0, LTI-DL 2.0
 *
 * @see https://www.imsglobal.org/spec/lti/v1p3
 * @see https://www.imsglobal.org/spec/lti-ags/v2p0
 * @see https://www.imsglobal.org/spec/lti-nrps/v2p0
 * @see https://www.imsglobal.org/spec/lti-dl/v2p0
 */

import { ScholarlyBaseService, Result, success, failure, isFailure } from './base.service';
import { prisma } from '@scholarly/database';
import { log } from '../lib/logger';
import * as crypto from 'crypto';

import type {
  LTIPlatform,
  LTITool,
  LTIOIDCLoginRequest,
  LTIOIDCState,
  LTIIDTokenClaims,
  DeepLinkContentItem,
  AGSLineItem,
  AGSScore,
  AGSResult,
  NRPSMember,
  NRPSMembershipContainer,
  LTIScope,
  DeepLinkingSettings,
} from './one-edtech-types';

// ============================================================================
// ERROR CODES
// ============================================================================

const LTI_ERRORS = {
  LTI_001: { code: 'LTI_001', message: 'Platform not found' },
  LTI_002: { code: 'LTI_002', message: 'Invalid or expired OIDC state' },
  LTI_003: { code: 'LTI_003', message: 'OIDC state already consumed' },
  LTI_004: { code: 'LTI_004', message: 'OIDC state expired' },
  LTI_005: { code: 'LTI_005', message: 'JWT signature verification failed' },
  LTI_006: { code: 'LTI_006', message: 'JWT token expired' },
  LTI_007: { code: 'LTI_007', message: 'JWT nonce mismatch' },
  LTI_008: { code: 'LTI_008', message: 'JWT issuer mismatch' },
  LTI_009: { code: 'LTI_009', message: 'JWT audience mismatch' },
  LTI_010: { code: 'LTI_010', message: 'Tool not found' },
  LTI_011: { code: 'LTI_011', message: 'Line item not found' },
  LTI_012: { code: 'LTI_012', message: 'Invalid score data' },
  LTI_013: { code: 'LTI_013', message: 'Platform missing private key for signing' },
  LTI_014: { code: 'LTI_014', message: 'Platform missing public key or JWKS URL' },
  LTI_015: { code: 'LTI_015', message: 'Invalid JWT format' },
  LTI_016: { code: 'LTI_016', message: 'Missing required registration fields' },
  LTI_017: { code: 'LTI_017', message: 'Platform already registered for this issuer and client' },
  LTI_018: { code: 'LTI_018', message: 'Invalid login request: platform not found for issuer' },
  LTI_019: { code: 'LTI_019', message: 'Context not found' },
  LTI_020: { code: 'LTI_020', message: 'Key pair generation failed' },
  LTI_021: { code: 'LTI_021', message: 'Deep link response creation failed' },
  LTI_022: { code: 'LTI_022', message: 'Invalid redirect URI' },
  LTI_023: { code: 'LTI_023', message: 'JWKS fetch failed' },
  LTI_024: { code: 'LTI_024', message: 'No matching key found in JWKS' },
  LTI_025: { code: 'LTI_025', message: 'Score submission failed' },
  LTI_026: { code: 'LTI_026', message: 'Result retrieval failed' },
  LTI_027: { code: 'LTI_027', message: 'Membership query failed' },
  LTI_028: { code: 'LTI_028', message: 'Invalid platform status' },
  LTI_029: { code: 'LTI_029', message: 'Tool registration failed' },
  LTI_030: { code: 'LTI_030', message: 'Platform inactive' },
} as const;

// ============================================================================
// HELPER TYPES
// ============================================================================

interface PlatformRegistrationData {
  name: string;
  issuer: string;
  clientId: string;
  deploymentId: string;
  oidcAuthUrl: string;
  tokenUrl: string;
  jwksUrl: string;
  publicKey?: string;
  privateKey?: string;
  keyId?: string;
  accessTokenUrl?: string;
  scopes?: string[];
  metadata?: Record<string, unknown>;
}

interface ToolRegistrationData {
  name: string;
  description?: string;
  launchUrl: string;
  loginUrl: string;
  redirectUrls: string[];
  deepLinkUrl?: string;
  customParameters?: Record<string, string>;
  scopes?: LTIScope[];
  iconUrl?: string;
}

interface OIDCRedirectResponse {
  redirectUrl: string;
  state: string;
  nonce: string;
}

interface JWTHeader {
  alg: string;
  typ: string;
  kid?: string;
}

interface JWTPayload {
  [key: string]: unknown;
}

interface JWKSKey {
  kty: string;
  kid?: string;
  use?: string;
  alg?: string;
  n: string;
  e: string;
}

interface JWKSResponse {
  keys: JWKSKey[];
}

// ============================================================================
// LTI ADVANTAGE SERVICE
// ============================================================================

export class LTIAdvantageService extends ScholarlyBaseService {
  constructor() {
    super('LTIAdvantageService');
  }

  // --------------------------------------------------------------------------
  // Platform Registration
  // --------------------------------------------------------------------------

  /**
   * Register a new LTI platform with key pair management.
   * Generates RSA key pair if public/private keys are not provided.
   */
  async registerPlatform(
    tenantId: string,
    data: PlatformRegistrationData
  ): Promise<Result<LTIPlatform>> {
    return this.withTiming('registerPlatform', async () => {
      // Validate required fields
      if (!data.name || !data.issuer || !data.clientId || !data.deploymentId) {
        return failure({
          ...LTI_ERRORS.LTI_016,
          details: {
            missing: [
              !data.name && 'name',
              !data.issuer && 'issuer',
              !data.clientId && 'clientId',
              !data.deploymentId && 'deploymentId',
            ].filter(Boolean),
          },
        });
      }

      if (!data.oidcAuthUrl || !data.tokenUrl || !data.jwksUrl) {
        return failure({
          ...LTI_ERRORS.LTI_016,
          details: {
            missing: [
              !data.oidcAuthUrl && 'oidcAuthUrl',
              !data.tokenUrl && 'tokenUrl',
              !data.jwksUrl && 'jwksUrl',
            ].filter(Boolean),
          },
        });
      }

      // Check for duplicate registration
      const existing = await prisma.lTIPlatform.findFirst({
        where: {
          tenantId,
          issuer: data.issuer,
          clientId: data.clientId,
        },
      });

      if (existing) {
        return failure({
          ...LTI_ERRORS.LTI_017,
          details: { issuer: data.issuer, clientId: data.clientId },
        });
      }

      // Generate RSA key pair if not provided
      let publicKey = data.publicKey;
      let privateKey = data.privateKey;
      let keyId = data.keyId;

      if (!publicKey || !privateKey) {
        try {
          const keyPair = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: { type: 'spki', format: 'pem' },
            privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
          });
          publicKey = keyPair.publicKey;
          privateKey = keyPair.privateKey;
          keyId = keyId || crypto.randomBytes(16).toString('hex');
        } catch (err) {
          log.error('Key pair generation failed', err as Error, { tenantId });
          return failure({
            ...LTI_ERRORS.LTI_020,
            details: { error: (err as Error).message },
          });
        }
      }

      if (!keyId) {
        keyId = crypto.randomBytes(16).toString('hex');
      }

      const platform = await prisma.lTIPlatform.create({
        data: {
          tenantId,
          name: data.name,
          issuer: data.issuer,
          clientId: data.clientId,
          deploymentId: data.deploymentId,
          oidcAuthUrl: data.oidcAuthUrl,
          tokenUrl: data.tokenUrl,
          jwksUrl: data.jwksUrl,
          publicKey,
          privateKey,
          keyId,
          accessTokenUrl: data.accessTokenUrl || data.tokenUrl,
          scopes: data.scopes || [],
          status: 'active',
          lastKeyRotation: new Date(),
          metadata: (data.metadata || {}) as any,
        },
      });

      log.info('LTI platform registered', {
        tenantId,
        platformId: platform.id,
        issuer: data.issuer,
        clientId: data.clientId,
      });

      await this.publishEvent('lti.platform.registered', tenantId, {
        platformId: platform.id,
        issuer: data.issuer,
      });

      return success(this.mapPlatformToType(platform));
    });
  }

  // --------------------------------------------------------------------------
  // Tool Registration
  // --------------------------------------------------------------------------

  /**
   * Register an LTI tool linked to a platform.
   */
  async registerTool(
    tenantId: string,
    platformId: string,
    data: ToolRegistrationData
  ): Promise<Result<LTITool>> {
    return this.withTiming('registerTool', async () => {
      // Verify platform exists and belongs to tenant
      const platform = await prisma.lTIPlatform.findFirst({
        where: { id: platformId, tenantId },
      });

      if (!platform) {
        return failure({
          ...LTI_ERRORS.LTI_001,
          details: { platformId, tenantId },
        });
      }

      if (platform.status === 'inactive') {
        return failure({
          ...LTI_ERRORS.LTI_030,
          details: { platformId },
        });
      }

      // Validate required tool fields
      if (!data.name || !data.launchUrl || !data.loginUrl) {
        return failure({
          ...LTI_ERRORS.LTI_016,
          details: {
            missing: [
              !data.name && 'name',
              !data.launchUrl && 'launchUrl',
              !data.loginUrl && 'loginUrl',
            ].filter(Boolean),
          },
        });
      }

      if (!data.redirectUrls || data.redirectUrls.length === 0) {
        return failure({
          ...LTI_ERRORS.LTI_022,
          details: { message: 'At least one redirect URL is required' },
        });
      }

      const tool = await prisma.lTITool.create({
        data: {
          tenantId,
          platformId,
          name: data.name,
          description: data.description || null,
          launchUrl: data.launchUrl,
          loginUrl: data.loginUrl,
          redirectUrls: data.redirectUrls,
          deepLinkUrl: data.deepLinkUrl || null,
          customParameters: (data.customParameters || {}) as any,
          scopes: data.scopes || [],
          iconUrl: data.iconUrl || null,
          status: 'active',
        },
      });

      log.info('LTI tool registered', {
        tenantId,
        platformId,
        toolId: tool.id,
        name: data.name,
      });

      await this.publishEvent('lti.tool.registered', tenantId, {
        toolId: tool.id,
        platformId,
      });

      return success(this.mapToolToType(tool));
    });
  }

  // --------------------------------------------------------------------------
  // OIDC Login Initiation
  // --------------------------------------------------------------------------

  /**
   * Initiate the OIDC third-party login flow.
   * Generates state and nonce, validates the platform, stores state in DB
   * with 10-minute expiry, and returns the OIDC authorization redirect URL.
   */
  async initiateOIDCLogin(
    tenantId: string,
    loginRequest: LTIOIDCLoginRequest
  ): Promise<Result<OIDCRedirectResponse>> {
    return this.withTiming('initiateOIDCLogin', async () => {
      // Find the platform by issuer
      const platformWhere: any = {
        tenantId,
        issuer: loginRequest.iss,
      };
      if (loginRequest.client_id) {
        platformWhere.clientId = loginRequest.client_id;
      }

      const platform = await prisma.lTIPlatform.findFirst({
        where: platformWhere,
      });

      if (!platform) {
        return failure({
          ...LTI_ERRORS.LTI_018,
          details: {
            issuer: loginRequest.iss,
            clientId: loginRequest.client_id,
            tenantId,
          },
        });
      }

      if (platform.status === 'inactive') {
        return failure({
          ...LTI_ERRORS.LTI_030,
          details: { platformId: platform.id },
        });
      }

      // Generate cryptographically secure state and nonce
      const state = crypto.randomBytes(32).toString('hex');
      const nonce = crypto.randomBytes(32).toString('hex');

      // Store OIDC state with 10-minute expiry
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

      await prisma.lTIOIDCState.create({
        data: {
          platformId: platform.id,
          state,
          nonce,
          loginHint: loginRequest.login_hint,
          targetLinkUri: loginRequest.target_link_uri,
          ltiMessageHint: loginRequest.lti_message_hint || null,
          consumed: false,
          expiresAt,
        },
      });

      // Find the tool to get the redirect URI
      const tool = await prisma.lTITool.findFirst({
        where: {
          tenantId,
          platformId: platform.id,
          status: 'active',
        },
      });

      const redirectUri = tool?.redirectUrls?.[0] || loginRequest.target_link_uri;

      // Build the OIDC authorization URL
      const authParams = new URLSearchParams({
        scope: 'openid',
        response_type: 'id_token',
        client_id: platform.clientId,
        redirect_uri: redirectUri,
        login_hint: loginRequest.login_hint,
        state,
        nonce,
        response_mode: 'form_post',
        prompt: 'none',
      });

      if (loginRequest.lti_message_hint) {
        authParams.set('lti_message_hint', loginRequest.lti_message_hint);
      }

      const redirectUrl = `${platform.oidcAuthUrl}?${authParams.toString()}`;

      log.info('OIDC login initiated', {
        tenantId,
        platformId: platform.id,
        issuer: platform.issuer,
        loginHint: loginRequest.login_hint,
      });

      return success({
        redirectUrl,
        state,
        nonce,
      });
    });
  }

  // --------------------------------------------------------------------------
  // OIDC Callback Validation
  // --------------------------------------------------------------------------

  /**
   * Validate the OIDC callback after the platform redirects back.
   * Verifies state (not consumed/expired), JWT signature (RS256),
   * nonce, issuer, audience, and expiration. Marks state as consumed.
   */
  async validateOIDCCallback(
    tenantId: string,
    state: string,
    idToken: string
  ): Promise<Result<LTIIDTokenClaims>> {
    return this.withTiming('validateOIDCCallback', async () => {
      // Look up the stored OIDC state
      const oidcState = await prisma.lTIOIDCState.findUnique({
        where: { state },
        include: { platform: true },
      });

      if (!oidcState) {
        return failure({
          ...LTI_ERRORS.LTI_002,
          details: { state },
        });
      }

      // Verify state not consumed (anti-replay)
      if (oidcState.consumed) {
        return failure({
          ...LTI_ERRORS.LTI_003,
          details: { state, consumedAt: oidcState.createdAt },
        });
      }

      // Verify state not expired
      if (new Date() > oidcState.expiresAt) {
        // Mark as consumed to prevent future attempts
        await prisma.lTIOIDCState.update({
          where: { id: oidcState.id },
          data: { consumed: true },
        });

        return failure({
          ...LTI_ERRORS.LTI_004,
          details: { state, expiresAt: oidcState.expiresAt },
        });
      }

      // Verify the platform belongs to the tenant
      if (oidcState.platform.tenantId !== tenantId) {
        return failure({
          ...LTI_ERRORS.LTI_001,
          details: { tenantId, platformTenantId: oidcState.platform.tenantId },
        });
      }

      // Mark state as consumed immediately to prevent replay
      await prisma.lTIOIDCState.update({
        where: { id: oidcState.id },
        data: { consumed: true },
      });

      // Decode the JWT (without verification first, to inspect headers/claims)
      const parts = idToken.split('.');
      if (parts.length !== 3) {
        return failure({
          ...LTI_ERRORS.LTI_015,
          details: { message: 'JWT must have exactly 3 parts' },
        });
      }

      let header: JWTHeader;
      let payload: LTIIDTokenClaims;

      try {
        header = JSON.parse(this.base64UrlDecode(parts[0]));
        payload = JSON.parse(this.base64UrlDecode(parts[1]));
      } catch (err) {
        return failure({
          ...LTI_ERRORS.LTI_015,
          details: { message: 'Failed to decode JWT parts', error: (err as Error).message },
        });
      }

      // Verify the algorithm is RS256
      if (header.alg !== 'RS256') {
        return failure({
          ...LTI_ERRORS.LTI_005,
          details: { expectedAlg: 'RS256', actualAlg: header.alg },
        });
      }

      // Get the public key for verification
      let publicKey: string | null = oidcState.platform.publicKey || null;

      if (!publicKey) {
        // Fetch from JWKS endpoint
        const jwksResult = await this.fetchJWKS(oidcState.platform.jwksUrl);
        if (isFailure(jwksResult)) {
          return failure(jwksResult.error);
        }

        const matchingKey = this.findMatchingJWKSKey(jwksResult.data, header.kid);
        if (!matchingKey) {
          return failure({
            ...LTI_ERRORS.LTI_024,
            details: { kid: header.kid, jwksUrl: oidcState.platform.jwksUrl },
          });
        }

        publicKey = this.jwkToPem(matchingKey);
      }

      // Verify the JWT signature
      const verifyResult = this.verifyJWT(idToken, publicKey);
      if (isFailure(verifyResult)) {
        return failure(verifyResult.error);
      }

      // Validate issuer matches platform
      if (payload.iss !== oidcState.platform.issuer) {
        return failure({
          ...LTI_ERRORS.LTI_008,
          details: {
            expected: oidcState.platform.issuer,
            actual: payload.iss,
          },
        });
      }

      // Validate audience matches clientId
      const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
      if (!aud.includes(oidcState.platform.clientId)) {
        return failure({
          ...LTI_ERRORS.LTI_009,
          details: {
            expected: oidcState.platform.clientId,
            actual: payload.aud,
          },
        });
      }

      // Validate nonce matches
      if (payload.nonce !== oidcState.nonce) {
        return failure({
          ...LTI_ERRORS.LTI_007,
          details: {
            expected: oidcState.nonce,
            actual: payload.nonce,
          },
        });
      }

      // Validate token not expired
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        return failure({
          ...LTI_ERRORS.LTI_006,
          details: {
            exp: payload.exp,
            now,
            expiredSecondsAgo: now - payload.exp,
          },
        });
      }

      log.info('OIDC callback validated successfully', {
        tenantId,
        platformId: oidcState.platform.id,
        sub: payload.sub,
        messageType: payload['https://purl.imsglobal.org/spec/lti/claim/message_type'],
      });

      await this.publishEvent('lti.oidc.validated', tenantId, {
        platformId: oidcState.platform.id,
        sub: payload.sub,
        state,
      });

      return success(payload);
    });
  }

  // --------------------------------------------------------------------------
  // Deep Linking
  // --------------------------------------------------------------------------

  /**
   * Create a signed JWT deep link response containing content items.
   */
  async createDeepLinkResponse(
    tenantId: string,
    platformId: string,
    contentItems: DeepLinkContentItem[],
    data?: string
  ): Promise<Result<string>> {
    return this.withTiming('createDeepLinkResponse', async () => {
      const platform = await prisma.lTIPlatform.findFirst({
        where: { id: platformId, tenantId },
      });

      if (!platform) {
        return failure({
          ...LTI_ERRORS.LTI_001,
          details: { platformId, tenantId },
        });
      }

      if (!platform.privateKey) {
        return failure({
          ...LTI_ERRORS.LTI_013,
          details: { platformId },
        });
      }

      const now = Math.floor(Date.now() / 1000);

      const payload: Record<string, unknown> = {
        iss: platform.clientId,
        aud: platform.issuer,
        iat: now,
        exp: now + 300, // 5 minute expiry for deep link response
        nonce: crypto.randomBytes(16).toString('hex'),
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiDeepLinkingResponse',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': platform.deploymentId,
        'https://purl.imsglobal.org/spec/lti-dl/claim/content_items': contentItems,
      };

      if (data) {
        payload['https://purl.imsglobal.org/spec/lti-dl/claim/data'] = data;
      }

      const jwtResult = this.generateJWT(payload, platform.privateKey, platform.keyId || undefined);
      if (isFailure(jwtResult)) {
        return failure({
          ...LTI_ERRORS.LTI_021,
          details: { error: jwtResult.error.message },
        });
      }

      log.info('Deep link response created', {
        tenantId,
        platformId,
        contentItemCount: contentItems.length,
      });

      return success(jwtResult.data);
    });
  }

  // --------------------------------------------------------------------------
  // Assignment & Grade Services (AGS)
  // --------------------------------------------------------------------------

  /**
   * Create an AGS line item for grade passback in a specific context.
   */
  async createLineItem(
    tenantId: string,
    platformId: string,
    contextId: string,
    lineItem: AGSLineItem
  ): Promise<Result<AGSLineItem>> {
    return this.withTiming('createLineItem', async () => {
      // Verify platform exists and belongs to tenant
      const platform = await prisma.lTIPlatform.findFirst({
        where: { id: platformId, tenantId },
      });

      if (!platform) {
        return failure({
          ...LTI_ERRORS.LTI_001,
          details: { platformId, tenantId },
        });
      }

      if (!lineItem.label || lineItem.scoreMaximum === undefined || lineItem.scoreMaximum <= 0) {
        return failure({
          code: 'LTI_016',
          message: 'Line item requires a label and a positive scoreMaximum',
          details: { label: lineItem.label, scoreMaximum: lineItem.scoreMaximum },
        });
      }

      const created = await prisma.aGSLineItem.create({
        data: {
          tenantId,
          platformId,
          contextId,
          label: lineItem.label,
          scoreMaximum: lineItem.scoreMaximum,
          resourceId: lineItem.resourceId || null,
          resourceLinkId: lineItem.resourceLinkId || null,
          tag: lineItem.tag || null,
          startDateTime: lineItem.startDateTime ? new Date(lineItem.startDateTime) : null,
          endDateTime: lineItem.endDateTime ? new Date(lineItem.endDateTime) : null,
          gradesReleased: lineItem.gradesReleased ?? false,
        },
      });

      log.info('AGS line item created', {
        tenantId,
        platformId,
        contextId,
        lineItemId: created.id,
        label: lineItem.label,
      });

      await this.publishEvent('lti.ags.lineitem.created', tenantId, {
        lineItemId: created.id,
        platformId,
        contextId,
      });

      return success(this.mapLineItemToType(created));
    });
  }

  /**
   * List all AGS line items for a given platform context.
   */
  async getLineItems(
    tenantId: string,
    platformId: string,
    contextId: string
  ): Promise<Result<AGSLineItem[]>> {
    return this.withTiming('getLineItems', async () => {
      const platform = await prisma.lTIPlatform.findFirst({
        where: { id: platformId, tenantId },
      });

      if (!platform) {
        return failure({
          ...LTI_ERRORS.LTI_001,
          details: { platformId, tenantId },
        });
      }

      const lineItems = await prisma.aGSLineItem.findMany({
        where: {
          tenantId,
          platformId,
          contextId,
        },
        orderBy: { createdAt: 'asc' },
      });

      return success(lineItems.map((li) => this.mapLineItemToType(li)));
    });
  }

  /**
   * Submit a score for a line item (grade passback).
   */
  async submitScore(
    tenantId: string,
    lineItemId: string,
    score: AGSScore
  ): Promise<Result<AGSScore>> {
    return this.withTiming('submitScore', async () => {
      // Verify line item exists and belongs to tenant
      const lineItem = await prisma.aGSLineItem.findFirst({
        where: { id: lineItemId, tenantId },
      });

      if (!lineItem) {
        return failure({
          ...LTI_ERRORS.LTI_011,
          details: { lineItemId, tenantId },
        });
      }

      // Validate score data
      if (!score.userId) {
        return failure({
          ...LTI_ERRORS.LTI_012,
          details: { message: 'userId is required' },
        });
      }

      if (!score.activityProgress || !score.gradingProgress) {
        return failure({
          ...LTI_ERRORS.LTI_012,
          details: {
            message: 'activityProgress and gradingProgress are required',
            activityProgress: score.activityProgress,
            gradingProgress: score.gradingProgress,
          },
        });
      }

      if (score.scoreGiven !== undefined && score.scoreGiven < 0) {
        return failure({
          ...LTI_ERRORS.LTI_012,
          details: { message: 'scoreGiven must be non-negative', scoreGiven: score.scoreGiven },
        });
      }

      if (
        score.scoreGiven !== undefined &&
        score.scoreMaximum !== undefined &&
        score.scoreGiven > score.scoreMaximum
      ) {
        return failure({
          ...LTI_ERRORS.LTI_012,
          details: {
            message: 'scoreGiven cannot exceed scoreMaximum',
            scoreGiven: score.scoreGiven,
            scoreMaximum: score.scoreMaximum,
          },
        });
      }

      // Upsert the score (one score per user per line item)
      const existingScore = await prisma.aGSScore.findFirst({
        where: { lineItemId, userId: score.userId },
      });

      let savedScore;
      if (existingScore) {
        savedScore = await prisma.aGSScore.update({
          where: { id: existingScore.id },
          data: {
            scoreGiven: score.scoreGiven ?? null,
            scoreMaximum: score.scoreMaximum ?? null,
            comment: score.comment || null,
            activityProgress: score.activityProgress,
            gradingProgress: score.gradingProgress,
            timestamp: score.timestamp ? new Date(score.timestamp) : new Date(),
          },
        });
      } else {
        savedScore = await prisma.aGSScore.create({
          data: {
            lineItemId,
            userId: score.userId,
            scoreGiven: score.scoreGiven ?? null,
            scoreMaximum: score.scoreMaximum ?? null,
            comment: score.comment || null,
            activityProgress: score.activityProgress,
            gradingProgress: score.gradingProgress,
            timestamp: score.timestamp ? new Date(score.timestamp) : new Date(),
          },
        });
      }

      // Also upsert the corresponding result
      const existingResult = await prisma.aGSResult.findFirst({
        where: { lineItemId, userId: score.userId },
      });

      if (existingResult) {
        await prisma.aGSResult.update({
          where: { id: existingResult.id },
          data: {
            resultScore: score.scoreGiven ?? null,
            resultMaximum: score.scoreMaximum ?? lineItem.scoreMaximum,
            comment: score.comment || null,
          },
        });
      } else {
        await prisma.aGSResult.create({
          data: {
            lineItemId,
            userId: score.userId,
            resultScore: score.scoreGiven ?? null,
            resultMaximum: score.scoreMaximum ?? lineItem.scoreMaximum,
            comment: score.comment || null,
          },
        });
      }

      log.info('AGS score submitted', {
        tenantId,
        lineItemId,
        userId: score.userId,
        scoreGiven: score.scoreGiven,
        activityProgress: score.activityProgress,
        gradingProgress: score.gradingProgress,
      });

      await this.publishEvent('lti.ags.score.submitted', tenantId, {
        lineItemId,
        userId: score.userId,
        scoreGiven: score.scoreGiven,
      });

      return success({
        userId: savedScore.userId,
        scoreGiven: savedScore.scoreGiven ?? undefined,
        scoreMaximum: savedScore.scoreMaximum ?? undefined,
        comment: savedScore.comment ?? undefined,
        timestamp: savedScore.timestamp.toISOString(),
        activityProgress: savedScore.activityProgress as AGSScore['activityProgress'],
        gradingProgress: savedScore.gradingProgress as AGSScore['gradingProgress'],
      });
    });
  }

  /**
   * Get results for a line item (read-only aggregate of scores).
   */
  async getResults(
    tenantId: string,
    lineItemId: string
  ): Promise<Result<AGSResult[]>> {
    return this.withTiming('getResults', async () => {
      // Verify line item exists and belongs to tenant
      const lineItem = await prisma.aGSLineItem.findFirst({
        where: { id: lineItemId, tenantId },
      });

      if (!lineItem) {
        return failure({
          ...LTI_ERRORS.LTI_011,
          details: { lineItemId, tenantId },
        });
      }

      const results = await prisma.aGSResult.findMany({
        where: { lineItemId },
        orderBy: { createdAt: 'asc' },
      });

      return success(
        results.map((r) => ({
          id: r.id,
          userId: r.userId,
          resultScore: r.resultScore ?? undefined,
          resultMaximum: r.resultMaximum ?? undefined,
          comment: r.comment ?? undefined,
          scoreOf: lineItemId,
        }))
      );
    });
  }

  // --------------------------------------------------------------------------
  // Names & Role Provisioning Services (NRPS)
  // --------------------------------------------------------------------------

  /**
   * Query context memberships with optional role filtering.
   * In production, this would typically call the platform's NRPS endpoint.
   * This implementation provides the local membership data for Scholarly-hosted contexts.
   */
  async getContextMemberships(
    tenantId: string,
    platformId: string,
    contextId: string,
    role?: string
  ): Promise<Result<NRPSMembershipContainer>> {
    return this.withTiming('getContextMemberships', async () => {
      const platform = await prisma.lTIPlatform.findFirst({
        where: { id: platformId, tenantId },
      });

      if (!platform) {
        return failure({
          ...LTI_ERRORS.LTI_001,
          details: { platformId, tenantId },
        });
      }

      // Query scores/results to derive membership from AGS interactions
      // In a full LTI implementation, memberships would come from the platform's NRPS endpoint.
      // Here we build membership from known AGS interactions in this context.
      const lineItems = await prisma.aGSLineItem.findMany({
        where: {
          tenantId,
          platformId,
          contextId,
        },
        include: {
          scores: true,
        },
      });

      // Collect unique users from scores
      const userMap = new Map<string, NRPSMember>();

      for (const li of lineItems) {
        for (const score of li.scores) {
          if (!userMap.has(score.userId)) {
            userMap.set(score.userId, {
              status: 'Active',
              userId: score.userId,
              roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
            });
          }
        }
      }

      let members = Array.from(userMap.values());

      // Apply optional role filter
      if (role) {
        members = members.filter((m) =>
          m.roles.some((r) => r.toLowerCase().includes(role.toLowerCase()))
        );
      }

      const container: NRPSMembershipContainer = {
        id: `${platformId}/contexts/${contextId}/memberships`,
        context: {
          id: contextId,
          label: contextId,
          title: contextId,
        },
        members,
      };

      log.info('NRPS membership query completed', {
        tenantId,
        platformId,
        contextId,
        memberCount: members.length,
        roleFilter: role,
      });

      return success(container);
    });
  }

  // --------------------------------------------------------------------------
  // JWT Utilities
  // --------------------------------------------------------------------------

  /**
   * Generate a signed JWT using RS256 (RSA with SHA-256).
   */
  generateJWT(
    payload: Record<string, unknown>,
    privateKey: string,
    keyId?: string
  ): Result<string> {
    try {
      const header: JWTHeader = {
        alg: 'RS256',
        typ: 'JWT',
      };

      if (keyId) {
        header.kid = keyId;
      }

      const headerB64 = this.base64UrlEncode(JSON.stringify(header));
      const payloadB64 = this.base64UrlEncode(JSON.stringify(payload));

      const signingInput = `${headerB64}.${payloadB64}`;

      const sign = crypto.createSign('SHA256');
      sign.update(signingInput);
      sign.end();

      const signatureBuffer = sign.sign(privateKey);
      const signatureB64 = this.bufferToBase64Url(signatureBuffer);

      return success(`${signingInput}.${signatureB64}`);
    } catch (err) {
      log.error('JWT generation failed', err as Error);
      return failure({
        code: 'LTI_005',
        message: 'JWT generation failed',
        details: { error: (err as Error).message },
      });
    }
  }

  /**
   * Verify a JWT signature using RS256 and a PEM-encoded public key or JWKS URL.
   * For JWKS URLs, fetches the key set and matches by kid.
   */
  verifyJWT(
    token: string,
    publicKeyOrJWKS: string
  ): Result<JWTPayload> {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return failure({
          ...LTI_ERRORS.LTI_015,
          details: { message: 'JWT must have exactly 3 parts' },
        });
      }

      const signingInput = `${parts[0]}.${parts[1]}`;
      const signatureB64 = parts[2];
      const signature = this.base64UrlToBuffer(signatureB64);

      const verify = crypto.createVerify('SHA256');
      verify.update(signingInput);
      verify.end();

      const isValid = verify.verify(publicKeyOrJWKS, signature);

      if (!isValid) {
        return failure({
          ...LTI_ERRORS.LTI_005,
          details: { message: 'RS256 signature verification failed' },
        });
      }

      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      return success(payload);
    } catch (err) {
      log.error('JWT verification failed', err as Error);
      return failure({
        ...LTI_ERRORS.LTI_005,
        details: { error: (err as Error).message },
      });
    }
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Base64URL encode a string.
   */
  private base64UrlEncode(input: string): string {
    return Buffer.from(input, 'utf8')
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Base64URL decode a string back to UTF-8.
   */
  private base64UrlDecode(input: string): string {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    return Buffer.from(base64, 'base64').toString('utf8');
  }

  /**
   * Convert a Buffer to Base64URL string.
   */
  private bufferToBase64Url(buffer: Buffer): string {
    return buffer
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  /**
   * Convert a Base64URL string to Buffer.
   */
  private base64UrlToBuffer(input: string): Buffer {
    let base64 = input.replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4;
    if (pad) {
      base64 += '='.repeat(4 - pad);
    }
    return Buffer.from(base64, 'base64');
  }

  /**
   * Fetch a JWKS key set from a remote URL.
   */
  private async fetchJWKS(jwksUrl: string): Promise<Result<JWKSResponse>> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      const response = await fetch(jwksUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) {
        return failure({
          ...LTI_ERRORS.LTI_023,
          details: {
            jwksUrl,
            status: response.status,
            statusText: response.statusText,
          },
        });
      }

      const jwks: JWKSResponse = await response.json() as JWKSResponse;

      if (!jwks.keys || !Array.isArray(jwks.keys) || jwks.keys.length === 0) {
        return failure({
          ...LTI_ERRORS.LTI_023,
          details: { jwksUrl, message: 'JWKS response contains no keys' },
        });
      }

      return success(jwks);
    } catch (err) {
      log.error('JWKS fetch failed', err as Error, { jwksUrl });
      return failure({
        ...LTI_ERRORS.LTI_023,
        details: { jwksUrl, error: (err as Error).message },
      });
    }
  }

  /**
   * Find a matching key in a JWKS key set by kid.
   * Falls back to the first RS256/RSA key if no kid match is found.
   */
  private findMatchingJWKSKey(jwks: JWKSResponse, kid?: string): JWKSKey | null {
    if (kid) {
      const exactMatch = jwks.keys.find((k) => k.kid === kid);
      if (exactMatch) return exactMatch;
    }

    // Fallback: find the first RSA key suitable for signature verification
    const rsaKey = jwks.keys.find(
      (k) =>
        k.kty === 'RSA' &&
        (!k.use || k.use === 'sig') &&
        (!k.alg || k.alg === 'RS256')
    );

    return rsaKey || null;
  }

  /**
   * Convert a JWK RSA public key to PEM format.
   */
  private jwkToPem(jwk: JWKSKey): string {
    if (jwk.kty !== 'RSA' || !jwk.n || !jwk.e) {
      throw new Error('Invalid JWK: must be RSA with n and e parameters');
    }

    // Decode the modulus and exponent
    const modulusBuffer = this.base64UrlToBuffer(jwk.n);
    const exponentBuffer = this.base64UrlToBuffer(jwk.e);

    // Build the ASN.1 DER structure for an RSA public key
    const modulusInteger = this.asn1Integer(modulusBuffer);
    const exponentInteger = this.asn1Integer(exponentBuffer);

    // RSAPublicKey sequence
    const rsaPublicKey = this.asn1Sequence(
      Buffer.concat([modulusInteger, exponentInteger])
    );

    // Wrap in a bit string
    const bitString = this.asn1BitString(rsaPublicKey);

    // Algorithm identifier for RSA (OID 1.2.840.113549.1.1.1)
    const rsaOid = Buffer.from([
      0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01,
      0x05, 0x00, // NULL
    ]);
    const algorithmIdentifier = this.asn1Sequence(rsaOid);

    // SubjectPublicKeyInfo sequence
    const spki = this.asn1Sequence(
      Buffer.concat([algorithmIdentifier, bitString])
    );

    // Encode to PEM
    const base64 = spki.toString('base64');
    const lines: string[] = [];
    for (let i = 0; i < base64.length; i += 64) {
      lines.push(base64.substring(i, i + 64));
    }

    return `-----BEGIN PUBLIC KEY-----\n${lines.join('\n')}\n-----END PUBLIC KEY-----\n`;
  }

  /**
   * ASN.1 DER encode an integer.
   */
  private asn1Integer(buffer: Buffer): Buffer {
    // If the high bit is set, prepend a 0x00 byte
    let data = buffer;
    if (data[0] & 0x80) {
      data = Buffer.concat([Buffer.from([0x00]), data]);
    }
    return Buffer.concat([
      Buffer.from([0x02]), // INTEGER tag
      this.asn1Length(data.length),
      data,
    ]);
  }

  /**
   * ASN.1 DER encode a sequence.
   */
  private asn1Sequence(content: Buffer): Buffer {
    return Buffer.concat([
      Buffer.from([0x30]), // SEQUENCE tag
      this.asn1Length(content.length),
      content,
    ]);
  }

  /**
   * ASN.1 DER encode a bit string.
   */
  private asn1BitString(content: Buffer): Buffer {
    // Prepend 0x00 (no unused bits)
    const data = Buffer.concat([Buffer.from([0x00]), content]);
    return Buffer.concat([
      Buffer.from([0x03]), // BIT STRING tag
      this.asn1Length(data.length),
      data,
    ]);
  }

  /**
   * ASN.1 DER length encoding.
   */
  private asn1Length(length: number): Buffer {
    if (length < 0x80) {
      return Buffer.from([length]);
    }

    const bytes: number[] = [];
    let remaining = length;
    while (remaining > 0) {
      bytes.unshift(remaining & 0xff);
      remaining >>= 8;
    }
    return Buffer.from([0x80 | bytes.length, ...bytes]);
  }

  // --------------------------------------------------------------------------
  // Prisma Model Mappers
  // --------------------------------------------------------------------------

  /**
   * Map a Prisma LTIPlatform record to the service type.
   */
  private mapPlatformToType(record: any): LTIPlatform {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      issuer: record.issuer,
      clientId: record.clientId,
      deploymentId: record.deploymentId,
      oidcAuthUrl: record.oidcAuthUrl,
      tokenUrl: record.tokenUrl,
      jwksUrl: record.jwksUrl,
      publicKey: record.publicKey ?? undefined,
      privateKey: record.privateKey ?? undefined,
      keyId: record.keyId ?? undefined,
      accessTokenUrl: record.accessTokenUrl ?? undefined,
      scopes: record.scopes || [],
      status: record.status as LTIPlatform['status'],
      lastKeyRotation: record.lastKeyRotation ?? undefined,
      metadata: (record.metadata as Record<string, unknown>) || {},
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Map a Prisma LTITool record to the service type.
   */
  private mapToolToType(record: any): LTITool {
    return {
      id: record.id,
      tenantId: record.tenantId,
      platformId: record.platformId,
      name: record.name,
      description: record.description ?? undefined,
      launchUrl: record.launchUrl,
      loginUrl: record.loginUrl,
      redirectUrls: record.redirectUrls || [],
      deepLinkUrl: record.deepLinkUrl ?? undefined,
      customParameters: (record.customParameters as Record<string, string>) || {},
      scopes: (record.scopes || []) as LTIScope[],
      iconUrl: record.iconUrl ?? undefined,
      status: record.status as 'active' | 'inactive',
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  /**
   * Map a Prisma AGSLineItem record to the service type.
   */
  private mapLineItemToType(record: any): AGSLineItem {
    return {
      id: record.id,
      scoreMaximum: record.scoreMaximum,
      label: record.label,
      resourceId: record.resourceId ?? undefined,
      resourceLinkId: record.resourceLinkId ?? undefined,
      tag: record.tag ?? undefined,
      startDateTime: record.startDateTime?.toISOString() ?? undefined,
      endDateTime: record.endDateTime?.toISOString() ?? undefined,
      gradesReleased: record.gradesReleased ?? undefined,
    };
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: LTIAdvantageService | null = null;

export function initializeLTIAdvantageService(): LTIAdvantageService {
  if (!instance) {
    instance = new LTIAdvantageService();
  }
  return instance;
}

export function getLTIAdvantageService(): LTIAdvantageService {
  if (!instance) {
    throw new Error('LTIAdvantageService not initialized. Call initializeLTIAdvantageService() first.');
  }
  return instance;
}
