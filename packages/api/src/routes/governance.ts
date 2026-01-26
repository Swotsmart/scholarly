/**
 * Governance Routes
 *
 * API endpoints for DAO governance and token economy operations.
 * Includes proposal management, voting, delegation, staking, rewards, and NFTs.
 */

import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { log } from '../lib/logger';
import { isFailure } from '../services/base.service';
import { getDAOGovernanceService } from '../services/dao-governance.service';
import { getTokenEconomyService } from '../services/token-economy.service';

export const governanceRouter: Router = Router();
governanceRouter.use(authMiddleware);

// ============================================================================
// Helper
// ============================================================================

function errorStatus(code: string): number {
  if (code === 'VALIDATION_ERROR') return 400;
  if (code === 'NOT_FOUND') return 404;
  if (code === 'AUTHORIZATION_ERROR') return 403;
  return 500;
}

// ============================================================================
// Validation Schemas
// ============================================================================

const createProposalSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(20).max(10000),
  category: z.enum([
    'ECOSYSTEM_GRANT', 'FEE_ADJUSTMENT', 'PARAMETER_CHANGE', 'FEATURED_CONTENT',
    'PROTOCOL_UPGRADE', 'PARTNERSHIP', 'TREASURY_MANAGEMENT', 'COMMUNITY'
  ]),
  actions: z.array(z.object({
    target: z.string(),
    value: z.string(),
    signature: z.string(),
    calldata: z.string(),
    description: z.string(),
  })).min(1),
  discussionUrl: z.string().url().optional(),
});

const castVoteSchema = z.object({
  support: z.enum(['for', 'against', 'abstain']),
  reason: z.string().max(2000).optional(),
});

const delegateSchema = z.object({
  delegateAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
});

const transferSchema = z.object({
  toAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  amount: z.string().min(1),
  memo: z.string().max(200).optional(),
});

const stakeSchema = z.object({
  poolId: z.string().min(1),
  amount: z.string().min(1),
});

const unstakeSchema = z.object({
  positionId: z.string().min(1),
});

const mintNFTSchema = z.object({
  contentType: z.enum([
    'CURRICULUM_MODULE', 'VIDEO_LESSON', 'INTERACTIVE_SIMULATION',
    'ASSESSMENT_PACK', 'PROJECT_TEMPLATE', 'RESOURCE_BUNDLE'
  ]),
  contentId: z.string().min(1),
  metadata: z.object({
    name: z.string().min(1),
    description: z.string().min(1),
    imageUrl: z.string().url(),
    attributes: z.record(z.unknown()),
  }),
  royaltyPercent: z.number().min(0).max(25),
});

const purchaseNFTSchema = z.object({
  tokenId: z.string().min(1),
});

// ============================================================================
// DAO Routes
// ============================================================================

/**
 * GET /governance/dao/config
 * Get DAO configuration
 */
governanceRouter.get('/dao/config', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const service = getDAOGovernanceService();
  const result = await service.getDAOConfig(tenantId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * POST /governance/dao/proposals
 * Create a new governance proposal
 */
governanceRouter.post('/dao/proposals', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = createProposalSchema.parse(req.body);

    const service = getDAOGovernanceService();
    const result = await service.createProposal(tenantId, {
      proposerId: userId,
      title: data.title,
      description: data.description,
      category: data.category as any,
      actions: data.actions.map(a => ({
        ...a,
        value: BigInt(a.value),
      })) as any,
      discussionUrl: data.discussionUrl,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Governance proposal created', { tenantId, userId, proposalId: result.data.id });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /governance/dao/proposals
 * List governance proposals
 */
governanceRouter.get('/dao/proposals', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const state = req.query.state as string | undefined;
  const category = req.query.category as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
  const offset = parseInt(req.query.offset as string) || 0;

  const service = getDAOGovernanceService();
  const result = await service.listProposals(tenantId, {
    state: state as any,
    category: category as any,
    limit,
    offset,
  });

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * GET /governance/dao/proposals/:id
 * Get a specific proposal
 */
governanceRouter.get('/dao/proposals/:id', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const proposalId = req.params.id;

  const service = getDAOGovernanceService();
  const result = await service.getProposal(tenantId, proposalId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * POST /governance/dao/proposals/:id/vote
 * Cast a vote on a proposal
 */
governanceRouter.post('/dao/proposals/:id/vote', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;
  const proposalId = req.params.id;

  try {
    const data = castVoteSchema.parse(req.body);

    const service = getDAOGovernanceService();
    const result = await service.castVote(tenantId, {
      userId,
      proposalId,
      support: data.support,
      reason: data.reason,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Vote cast', { tenantId, userId, proposalId, support: data.support });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /governance/dao/proposals/:id/queue
 * Queue a successful proposal for execution
 */
governanceRouter.post('/dao/proposals/:id/queue', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const proposalId = req.params.id;

  const service = getDAOGovernanceService();
  const result = await service.queueProposal(tenantId, proposalId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  log.info('Proposal queued', { tenantId, proposalId });

  res.json({ success: true, data: result.data });
});

/**
 * POST /governance/dao/proposals/:id/execute
 * Execute a queued proposal
 */
governanceRouter.post('/dao/proposals/:id/execute', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const proposalId = req.params.id;

  const service = getDAOGovernanceService();
  const result = await service.executeProposal(tenantId, proposalId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  log.info('Proposal executed', { tenantId, proposalId });

  res.json({ success: true, data: result.data });
});

/**
 * POST /governance/dao/delegate
 * Delegate voting power
 */
governanceRouter.post('/dao/delegate', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = delegateSchema.parse(req.body);

    const service = getDAOGovernanceService();
    const result = await service.delegateVotingPower(tenantId, {
      delegatorId: userId,
      delegateAddress: data.delegateAddress as any,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Voting power delegated', { tenantId, userId, delegate: data.delegateAddress });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /governance/dao/delegates
 * Get top delegates
 */
governanceRouter.get('/dao/delegates', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

  const service = getDAOGovernanceService();
  const result = await service.getTopDelegates(tenantId, limit);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * GET /governance/dao/treasury
 * Get treasury status
 */
governanceRouter.get('/dao/treasury', async (req, res) => {
  const tenantId = req.user!.tenantId;

  const service = getDAOGovernanceService();
  const result = await service.getTreasuryStatus(tenantId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

// ============================================================================
// Token Economy Routes
// ============================================================================

/**
 * GET /governance/tokens/balance
 * Get user's token balance
 */
governanceRouter.get('/tokens/balance', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const service = getTokenEconomyService();
  const result = await service.getUserBalance(tenantId, userId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * POST /governance/tokens/transfer
 * Transfer tokens to another address
 */
governanceRouter.post('/tokens/transfer', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = transferSchema.parse(req.body);

    const service = getTokenEconomyService();
    const result = await service.transferTokens(tenantId, {
      fromUserId: userId,
      toAddress: data.toAddress as any,
      amount: BigInt(data.amount),
      memo: data.memo,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Tokens transferred', { tenantId, userId, to: data.toAddress });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * GET /governance/tokens/staking/pools
 * Get available staking pools
 */
governanceRouter.get('/tokens/staking/pools', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const purpose = req.query.purpose as string | undefined;

  const service = getTokenEconomyService();
  const result = await service.getStakingPools(tenantId, purpose as any);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  res.json({ success: true, data: result.data });
});

/**
 * POST /governance/tokens/staking/stake
 * Stake tokens in a pool
 */
governanceRouter.post('/tokens/staking/stake', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = stakeSchema.parse(req.body);

    const service = getTokenEconomyService();
    const result = await service.stakeTokens(tenantId, {
      userId,
      poolId: data.poolId,
      amount: BigInt(data.amount),
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Tokens staked', { tenantId, userId, poolId: data.poolId });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /governance/tokens/staking/unstake
 * Unstake tokens from a position
 */
governanceRouter.post('/tokens/staking/unstake', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = unstakeSchema.parse(req.body);

    const service = getTokenEconomyService();
    const result = await service.unstakeTokens(tenantId, {
      userId,
      positionId: data.positionId,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('Tokens unstaked', { tenantId, userId, positionId: data.positionId });

    res.json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /governance/tokens/rewards/claim
 * Claim pending rewards
 */
governanceRouter.post('/tokens/rewards/claim', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  const service = getTokenEconomyService();
  const result = await service.claimRewards(tenantId, userId);

  if (isFailure(result)) {
    const status = errorStatus(result.error.code);
    return res.status(status).json({ error: result.error });
  }

  log.info('Rewards claimed', { tenantId, userId });

  res.json({ success: true, data: result.data });
});

/**
 * POST /governance/tokens/nft/mint
 * Mint a publisher NFT
 */
governanceRouter.post('/tokens/nft/mint', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = mintNFTSchema.parse(req.body);

    const service = getTokenEconomyService();
    const result = await service.mintPublisherNFT(tenantId, {
      creatorId: userId,
      contentType: data.contentType as any,
      contentId: data.contentId,
      metadata: data.metadata as any,
      royaltyPercent: data.royaltyPercent,
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('NFT minted', { tenantId, userId, contentId: data.contentId });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});

/**
 * POST /governance/tokens/nft/purchase
 * Purchase an NFT
 */
governanceRouter.post('/tokens/nft/purchase', async (req, res) => {
  const tenantId = req.user!.tenantId;
  const userId = req.user!.id;

  try {
    const data = purchaseNFTSchema.parse(req.body);

    const service = getTokenEconomyService();
    const result = await service.purchaseNFT(tenantId, {
      buyerId: userId,
      tokenId: BigInt(data.tokenId),
    });

    if (isFailure(result)) {
      const status = errorStatus(result.error.code);
      return res.status(status).json({ error: result.error });
    }

    log.info('NFT purchased', { tenantId, userId, tokenId: data.tokenId });

    res.status(201).json({ success: true, data: result.data });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: error.errors } });
    }
    throw error;
  }
});
