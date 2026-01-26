/**
 * SSI/VC API Routes
 *
 * Phase 1 Foundation: Trust & Identity Layer
 *
 * RESTful API endpoints for Self-Sovereign Identity and Verifiable Credentials.
 * Endpoints cover wallet management, DID operations, credential issuance/verification,
 * and verifiable presentations.
 *
 * @module SSIRoutes
 */

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { log } from '../lib/logger';
import { isFailure } from '../services/base.service';
import { getDIDService } from '../services/did.service';
import { getVCService } from '../services/verifiable-credentials.service';
import { getDigitalWalletService } from '../services/digital-wallet.service';

export const ssiRouter: Router = Router();
ssiRouter.use(authMiddleware);

// ============================================================================
// Validation Schemas
// ============================================================================

const createWalletSchema = z.object({
  passphrase: z.string().min(12, 'Passphrase must be at least 12 characters'),
  didMethod: z.enum(['did:web', 'did:key', 'did:ethr']).optional().default('did:key'),
});

const unlockWalletSchema = z.object({
  passphrase: z.string().min(1, 'Passphrase is required'),
});

const createBackupSchema = z.object({
  passphrase: z.string().min(1, 'Passphrase is required'),
});

const issueCredentialSchema = z.object({
  credentialType: z.string().min(1, 'credentialType is required'),
  subjectDid: z.string().min(1, 'subjectDid is required'),
  subjectData: z.record(z.unknown()),
  issuerPassphrase: z.string().min(1, 'issuerPassphrase is required'),
  expirationDate: z.string().datetime().optional(),
});

const verifyCredentialSchema = z.object({
  '@context': z.array(z.string()),
  id: z.string(),
  type: z.array(z.string()),
  issuer: z.union([z.string(), z.object({ id: z.string() }).passthrough()]),
  issuanceDate: z.string(),
  credentialSubject: z.record(z.unknown()),
}).passthrough();

const revokeCredentialSchema = z.object({
  credentialId: z.string().min(1, 'credentialId is required'),
  reason: z.string().min(1, 'reason is required'),
});

const createPresentationSchema = z.object({
  credentialIds: z.array(z.string()).min(1, 'At least one credential ID is required'),
  passphrase: z.string().min(1, 'passphrase is required'),
  challenge: z.string().optional(),
  domain: z.string().optional(),
});

const verifyPresentationSchema = z.object({
  presentation: z.object({
    '@context': z.array(z.string()),
    type: z.array(z.string()),
  }).passthrough(),
  challenge: z.string().optional(),
  domain: z.string().optional(),
  trustedIssuers: z.array(z.string()).optional(),
});

const rotateKeysSchema = z.object({
  currentPassphrase: z.string().min(1, 'currentPassphrase is required'),
  newPassphrase: z.string().optional(),
  reason: z.enum(['scheduled', 'compromise_suspected', 'user_requested', 'policy']).optional().default('user_requested'),
});

// ============================================================================
// WALLET ROUTES
// ============================================================================

/**
 * POST /wallet
 * Create a new digital wallet
 */
ssiRouter.post('/wallet', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const parsed = createWalletSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Creating wallet', { tenantId, userId });

  const walletService = getDigitalWalletService();
  const result = await walletService.createWallet(tenantId, userId, parsed.data.passphrase, {
    didMethod: parsed.data.didMethod as any,
  });

  if (isFailure(result)) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

/**
 * GET /wallet
 * Get wallet information
 */
ssiRouter.get('/wallet', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const walletService = getDigitalWalletService();
  const result = await walletService.getWalletInfo(tenantId, userId);

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /wallet/unlock
 * Unlock wallet for use
 */
ssiRouter.post('/wallet/unlock', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const parsed = unlockWalletSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Unlocking wallet', { tenantId, userId });

  const walletService = getDigitalWalletService();
  const result = await walletService.unlockWallet(tenantId, userId, parsed.data.passphrase);

  if (isFailure(result)) {
    const status = result.error.code === 'WALLET_ERROR' ? 423 :
                   result.error.code === 'NOT_FOUND' ? 404 : 401;
    return res.status(status).json({ error: result.error });
  }

  res.json({ sessionExpires: result.data.sessionExpires });
});

/**
 * POST /wallet/lock
 * Lock wallet (end session)
 */
ssiRouter.post('/wallet/lock', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const walletService = getDigitalWalletService();
  const result = await walletService.lockWallet(tenantId, userId);

  if (isFailure(result)) {
    return res.status(500).json({ error: result.error });
  }

  res.status(204).send();
});

/**
 * POST /wallet/backup
 * Create encrypted wallet backup
 */
ssiRouter.post('/wallet/backup', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const parsed = createBackupSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Creating wallet backup', { tenantId, userId });

  const walletService = getDigitalWalletService();
  const result = await walletService.createBackup(tenantId, userId, parsed.data.passphrase);

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 :
                   result.error.code === 'WALLET_ERROR' ? 400 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

/**
 * GET /wallet/backup
 * List wallet backups
 */
ssiRouter.get('/wallet/backup', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const walletService = getDigitalWalletService();
  const result = await walletService.listBackups(tenantId, userId);

  if (isFailure(result)) {
    return res.status(500).json({ error: result.error });
  }

  res.json(result.data);
});

// ============================================================================
// DID ROUTES
// ============================================================================

/**
 * GET /dids
 * List user's DIDs
 */
ssiRouter.get('/dids', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const didService = getDIDService();
  const result = await didService.getUserDIDs(tenantId, userId);

  if (isFailure(result)) {
    return res.status(500).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * GET /dids/:did/resolve
 * Resolve a DID to its document
 */
ssiRouter.get('/dids/:did/resolve', async (req, res) => {
  const { did } = req.params;

  log.info('Resolving DID', { did: decodeURIComponent(did) });

  const didService = getDIDService();
  const result = await didService.resolveDID(decodeURIComponent(did));

  if (isFailure(result)) {
    const status = result.error.code === 'DID_RESOLUTION_ERROR' ? 404 :
                   result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /dids/:did/rotate-keys
 * Rotate keys for a DID
 */
ssiRouter.post('/dids/:did/rotate-keys', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { did } = req.params;

  const parsed = rotateKeysSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Rotating keys', { tenantId, userId, did: decodeURIComponent(did) });

  const didService = getDIDService();
  const result = await didService.rotateKeys(
    tenantId,
    userId,
    decodeURIComponent(did),
    parsed.data.currentPassphrase,
    parsed.data.newPassphrase,
    parsed.data.reason
  );

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 :
                   result.error.code === 'KEY_MANAGEMENT_ERROR' ? 400 :
                   result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

// ============================================================================
// CREDENTIAL ROUTES
// ============================================================================

/**
 * GET /credentials
 * List credentials (from wallet)
 */
ssiRouter.get('/credentials', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const { type } = req.query;

  const walletService = getDigitalWalletService();
  const result = await walletService.getCredentials(tenantId, userId, {
    type: type as string | undefined,
  });

  if (isFailure(result)) {
    const status = result.error.code === 'WALLET_ERROR' ? 423 :
                   result.error.code === 'NOT_FOUND' ? 404 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /credentials/issue
 * Issue a new credential
 */
ssiRouter.post('/credentials/issue', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const parsed = issueCredentialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Issuing credential', {
    tenantId,
    credentialType: parsed.data.credentialType,
    subjectDid: parsed.data.subjectDid,
  });

  const vcService = getVCService();
  const result = await vcService.issueCredential(tenantId, parsed.data.issuerPassphrase, {
    credentialType: parsed.data.credentialType as any,
    subjectDid: parsed.data.subjectDid,
    subjectData: parsed.data.subjectData as any,
    expirationDate: parsed.data.expirationDate ? new Date(parsed.data.expirationDate) : undefined,
  });

  if (isFailure(result)) {
    const status = result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

/**
 * POST /credentials/verify
 * Verify a credential
 */
ssiRouter.post('/credentials/verify', async (req, res) => {
  const parsed = verifyCredentialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Verifying credential', { credentialId: parsed.data.id });

  const { checkStatus, checkSchema, trustedIssuers } = req.query;

  const vcService = getVCService();
  const result = await vcService.verifyCredential(parsed.data as any, {
    checkStatus: checkStatus !== 'false',
    checkSchema: checkSchema !== 'false',
    trustedIssuers: trustedIssuers ? (trustedIssuers as string).split(',') : undefined,
  });

  if (isFailure(result)) {
    return res.status(500).json({ error: result.error });
  }

  res.json(result.data);
});

/**
 * POST /credentials/revoke
 * Revoke a credential
 */
ssiRouter.post('/credentials/revoke', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const parsed = revokeCredentialSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Revoking credential', { tenantId, credentialId: parsed.data.credentialId });

  const vcService = getVCService();
  const result = await vcService.revokeCredential(
    tenantId,
    parsed.data.credentialId,
    parsed.data.reason,
    userId
  );

  if (isFailure(result)) {
    const status = result.error.code === 'NOT_FOUND' ? 404 :
                   result.error.code === 'VALIDATION_ERROR' ? 400 : 500;
    return res.status(status).json({ error: result.error });
  }

  res.status(204).send();
});

// ============================================================================
// PRESENTATION ROUTES
// ============================================================================

/**
 * POST /presentations
 * Create a verifiable presentation
 */
ssiRouter.post('/presentations', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const parsed = createPresentationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Creating presentation', { tenantId, userId, credentialCount: parsed.data.credentialIds.length });

  // Get credentials from wallet
  const walletService = getDigitalWalletService();
  const credsResult = await walletService.getCredentials(tenantId, userId);
  if (isFailure(credsResult)) {
    const status = credsResult.error.code === 'WALLET_ERROR' ? 423 : 400;
    return res.status(status).json({ error: credsResult.error });
  }

  const credentials = credsResult.data.filter(c => parsed.data.credentialIds.includes(c.id));
  if (credentials.length !== parsed.data.credentialIds.length) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Some credentials not found in wallet' }
    });
  }

  // Get primary DID
  const didService = getDIDService();
  const didResult = await didService.getPrimaryDID(tenantId, userId);
  if (isFailure(didResult) || !didResult.data) {
    return res.status(400).json({
      error: { code: 'NOT_FOUND', message: 'No primary DID found' }
    });
  }

  const vcService = getVCService();
  const result = await vcService.createPresentation(
    tenantId,
    didResult.data.did,
    parsed.data.passphrase,
    credentials,
    { challenge: parsed.data.challenge, domain: parsed.data.domain }
  );

  if (isFailure(result)) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json(result.data);
});

/**
 * POST /presentations/verify
 * Verify a verifiable presentation
 */
ssiRouter.post('/presentations/verify', async (req, res) => {
  const parsed = verifyPresentationSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', details: parsed.error.errors } });
  }

  log.info('Verifying presentation');

  const vcService = getVCService();
  const result = await vcService.verifyPresentation(parsed.data.presentation as any, {
    challenge: parsed.data.challenge,
    domain: parsed.data.domain,
    trustedIssuers: parsed.data.trustedIssuers,
  });

  if (isFailure(result)) {
    return res.status(500).json({ error: result.error });
  }

  res.json(result.data);
});
