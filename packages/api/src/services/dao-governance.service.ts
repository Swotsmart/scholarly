/**
 * Scholarly DAO Governance Service
 *
 * Implements decentralized governance for the Scholarly platform, enabling
 * community-driven decision making through proposals, voting, and delegation.
 *
 * @module DAOGovernanceService
 */

import { ScholarlyBaseService, Result, success, failure, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

import {
  EthAddress,
  TxHash,
  BlockNumber,
  TokenAmount,
  DAOConfig,
  GovernanceProposal,
  ProposalCategory,
  ProposalState,
  ProposalAction,
  Vote,
  VoteDelegation,
  DelegateProfile,
  TreasuryStatus
} from './phase4-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

/**
 * Repository for governance proposals
 */
export interface ProposalRepository {
  create(tenantId: string, proposal: Omit<GovernanceProposal, 'id'>): Promise<GovernanceProposal>;
  findById(tenantId: string, id: string): Promise<GovernanceProposal | null>;
  findByProposalId(tenantId: string, proposalId: bigint): Promise<GovernanceProposal | null>;
  findByState(tenantId: string, state: ProposalState, limit?: number, offset?: number): Promise<GovernanceProposal[]>;
  findByCategory(tenantId: string, category: ProposalCategory, limit?: number, offset?: number): Promise<GovernanceProposal[]>;
  findByProposer(tenantId: string, proposer: EthAddress, limit?: number, offset?: number): Promise<GovernanceProposal[]>;
  findAll(tenantId: string, limit?: number, offset?: number): Promise<GovernanceProposal[]>;
  update(tenantId: string, id: string, updates: Partial<GovernanceProposal>): Promise<GovernanceProposal>;
  countByState(tenantId: string, state: ProposalState): Promise<number>;
}

/**
 * Repository for votes
 */
export interface VoteRepository {
  create(tenantId: string, vote: Omit<Vote, 'id'>): Promise<Vote>;
  findByProposal(tenantId: string, proposalId: string, limit?: number, offset?: number): Promise<Vote[]>;
  findByVoter(tenantId: string, voter: EthAddress, limit?: number, offset?: number): Promise<Vote[]>;
  findVote(tenantId: string, proposalId: string, voter: EthAddress): Promise<Vote | null>;
  countByProposal(tenantId: string, proposalId: string): Promise<number>;
  getVotingPowerBySupport(tenantId: string, proposalId: string): Promise<{ for: TokenAmount; against: TokenAmount; abstain: TokenAmount }>;
}

/**
 * Repository for delegations
 */
export interface DelegationRepository {
  create(tenantId: string, delegation: Omit<VoteDelegation, 'id'>): Promise<VoteDelegation>;
  findByDelegator(tenantId: string, delegator: EthAddress): Promise<VoteDelegation | null>;
  findByDelegate(tenantId: string, delegate: EthAddress, limit?: number, offset?: number): Promise<VoteDelegation[]>;
  findActive(tenantId: string, limit?: number, offset?: number): Promise<VoteDelegation[]>;
  update(tenantId: string, id: string, updates: Partial<VoteDelegation>): Promise<VoteDelegation>;
  getTotalDelegatedTo(tenantId: string, delegate: EthAddress): Promise<TokenAmount>;
}

/**
 * Repository for delegate profiles
 */
export interface DelegateProfileRepository {
  create(tenantId: string, profile: Omit<DelegateProfile, 'registeredAt' | 'lastActiveAt'>): Promise<DelegateProfile>;
  findByAddress(tenantId: string, address: EthAddress): Promise<DelegateProfile | null>;
  findByUserId(tenantId: string, userId: string): Promise<DelegateProfile | null>;
  findAll(tenantId: string, limit?: number, offset?: number): Promise<DelegateProfile[]>;
  findTopByDelegatedPower(tenantId: string, limit: number): Promise<DelegateProfile[]>;
  update(tenantId: string, address: EthAddress, updates: Partial<DelegateProfile>): Promise<DelegateProfile>;
  addVoteToHistory(tenantId: string, address: EthAddress, vote: DelegateProfile['votingHistory'][0]): Promise<void>;
}

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

/**
 * Interface to blockchain for governance operations
 */
export interface GovernanceBlockchainProvider {
  getDAOConfig(tenantId: string): Promise<DAOConfig>;
  createProposal(
    tenantId: string,
    proposer: EthAddress,
    actions: ProposalAction[],
    description: string
  ): Promise<{ proposalId: bigint; txHash: TxHash }>;
  getProposalState(tenantId: string, proposalId: bigint): Promise<ProposalState>;
  getProposalVotes(tenantId: string, proposalId: bigint): Promise<{ forVotes: TokenAmount; againstVotes: TokenAmount; abstainVotes: TokenAmount }>;
  castVote(
    tenantId: string,
    voter: EthAddress,
    proposalId: bigint,
    support: 0 | 1 | 2,
    reason?: string
  ): Promise<{ txHash: TxHash; weight: TokenAmount }>;
  getVotingPower(tenantId: string, account: EthAddress, blockNumber?: BlockNumber): Promise<TokenAmount>;
  hasVoted(tenantId: string, proposalId: bigint, account: EthAddress): Promise<boolean>;
  delegate(tenantId: string, delegator: EthAddress, delegatee: EthAddress): Promise<TxHash>;
  getDelegates(tenantId: string, account: EthAddress): Promise<EthAddress>;
  queueProposal(tenantId: string, proposalId: bigint): Promise<TxHash>;
  executeProposal(tenantId: string, proposalId: bigint): Promise<TxHash>;
  cancelProposal(tenantId: string, proposalId: bigint, proposer: EthAddress): Promise<TxHash>;
  getTreasuryBalance(tenantId: string): Promise<TreasuryStatus>;
  getCurrentBlock(): Promise<BlockNumber>;
  getBlockTimestamp(blockNumber: BlockNumber): Promise<number>;
}

/**
 * Wallet connection provider
 */
export interface GovernanceWalletProvider {
  getConnectedWallet(userId: string): Promise<EthAddress | null>;
  signMessage(userId: string, message: string): Promise<string>;
  verifySignature(message: string, signature: string, expectedSigner: EthAddress): Promise<boolean>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

/**
 * DAO Governance Service
 *
 * Manages the full governance lifecycle:
 * 1. Proposal creation and management
 * 2. Voting with delegation support
 * 3. Proposal execution through timelock
 * 4. Treasury oversight
 * 5. Delegate discovery and profiles
 */
export class DAOGovernanceService extends ScholarlyBaseService {
  private readonly proposalRepo: ProposalRepository;
  private readonly voteRepo: VoteRepository;
  private readonly delegationRepo: DelegationRepository;
  private readonly delegateProfileRepo: DelegateProfileRepository;
  private readonly blockchainProvider: GovernanceBlockchainProvider;
  private readonly walletProvider: GovernanceWalletProvider;

  constructor(
    deps: ServiceDependencies & Record<string, unknown>,
    repos: {
      proposalRepo: ProposalRepository;
      voteRepo: VoteRepository;
      delegationRepo: DelegationRepository;
      delegateProfileRepo: DelegateProfileRepository;
    },
    providers: {
      blockchainProvider: GovernanceBlockchainProvider;
      walletProvider: GovernanceWalletProvider;
    }
  ) {
    super('DAOGovernanceService', deps);
    this.proposalRepo = repos.proposalRepo;
    this.voteRepo = repos.voteRepo;
    this.delegationRepo = repos.delegationRepo;
    this.delegateProfileRepo = repos.delegateProfileRepo;
    this.blockchainProvider = providers.blockchainProvider;
    this.walletProvider = providers.walletProvider;
  }

  // ==========================================================================
  // DAO CONFIGURATION
  // ==========================================================================

  /**
   * Get DAO configuration
   */
  async getDAOConfig(tenantId: string): Promise<Result<DAOConfig>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('getDAOConfig', async () => {
      const cached = await this.cacheGet<DAOConfig>(`dao:config:${tenantId}`);
      if (cached) return success(cached);

      const config = await this.blockchainProvider.getDAOConfig(tenantId);
      await this.cacheSet(`dao:config:${tenantId}`, config, 3600);

      return success(config);
    });
  }

  // ==========================================================================
  // PROPOSAL MANAGEMENT
  // ==========================================================================

  /**
   * Create a new governance proposal
   *
   * Requires the proposer to have sufficient voting power (proposal threshold)
   */
  async createProposal(
    tenantId: string,
    data: {
      proposerId: string;
      title: string;
      description: string;
      category: ProposalCategory;
      actions: ProposalAction[];
      discussionUrl?: string;
    }
  ): Promise<Result<GovernanceProposal>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.proposerId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'proposerId is required' });
    }
    if (!data.title) {
      return failure({ code: 'VALIDATION_ERROR', message: 'title is required' });
    }
    if (!data.description) {
      return failure({ code: 'VALIDATION_ERROR', message: 'description is required' });
    }
    if (!data.actions || data.actions.length === 0) {
      return failure({ code: 'VALIDATION_ERROR', message: 'At least one action is required' });
    }

    return this.withTiming('createProposal', async () => {
      // Get proposer's wallet
      const wallet = await this.walletProvider.getConnectedWallet(data.proposerId);
      if (!wallet) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'No wallet connected for proposer' });
      }

      // Check voting power meets threshold
      const config = await this.blockchainProvider.getDAOConfig(tenantId);
      const votingPower = await this.blockchainProvider.getVotingPower(tenantId, wallet);

      if (votingPower < config.proposalThreshold) {
        return failure({
          code: 'AUTHORIZATION_ERROR',
          message: `Insufficient voting power. Required: ${config.proposalThreshold}, Have: ${votingPower}`
        });
      }

      // Create on-chain proposal
      const fullDescription = `# ${data.title}\n\n${data.description}`;
      const { proposalId, txHash } = await this.blockchainProvider.createProposal(
        tenantId,
        wallet,
        data.actions,
        fullDescription
      );

      // Get block info for timing
      const currentBlock = await this.blockchainProvider.getCurrentBlock();
      const startBlock = currentBlock + BigInt(config.votingDelay);
      const endBlock = startBlock + BigInt(config.votingPeriod);

      // Create local record
      const proposal = await this.proposalRepo.create(tenantId, {
        proposalId,
        proposer: wallet,
        proposerId: data.proposerId,
        title: data.title,
        description: data.description,
        discussionUrl: data.discussionUrl,
        category: data.category,
        actions: data.actions,
        state: ProposalState.PENDING,
        forVotes: BigInt(0),
        againstVotes: BigInt(0),
        abstainVotes: BigInt(0),
        startBlock,
        endBlock,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.dao.proposal_created', tenantId, {
        proposalId: proposal.id,
        onChainId: proposalId.toString(),
        proposer: wallet,
        title: data.title,
        category: data.category,
        txHash
      });

      return success(proposal);
    });
  }

  /**
   * Get proposal by ID
   */
  async getProposal(
    tenantId: string,
    proposalId: string
  ): Promise<Result<GovernanceProposal>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!proposalId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'proposalId is required' });
    }

    return this.withTiming('getProposal', async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        return failure({ code: 'NOT_FOUND', message: `Proposal ${proposalId} not found` });
      }

      // Sync state from blockchain
      const onChainState = await this.blockchainProvider.getProposalState(tenantId, proposal.proposalId);
      if (onChainState !== proposal.state) {
        await this.proposalRepo.update(tenantId, proposalId, {
          state: onChainState,
          updatedAt: new Date()
        });
        proposal.state = onChainState;
      }

      // Sync vote counts
      const votes = await this.blockchainProvider.getProposalVotes(tenantId, proposal.proposalId);
      proposal.forVotes = votes.forVotes;
      proposal.againstVotes = votes.againstVotes;
      proposal.abstainVotes = votes.abstainVotes;

      return success(proposal);
    });
  }

  /**
   * List proposals with filters
   */
  async listProposals(
    tenantId: string,
    options: {
      state?: ProposalState;
      category?: ProposalCategory;
      proposer?: EthAddress;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<Result<{ proposals: GovernanceProposal[]; total: number }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('listProposals', async () => {
      const { limit = 20, offset = 0 } = options;
      let proposals: GovernanceProposal[];
      let total: number;

      if (options.state) {
        proposals = await this.proposalRepo.findByState(tenantId, options.state, limit, offset);
        total = await this.proposalRepo.countByState(tenantId, options.state);
      } else if (options.category) {
        proposals = await this.proposalRepo.findByCategory(tenantId, options.category, limit, offset);
        total = proposals.length;
      } else if (options.proposer) {
        proposals = await this.proposalRepo.findByProposer(tenantId, options.proposer, limit, offset);
        total = proposals.length;
      } else {
        proposals = await this.proposalRepo.findAll(tenantId, limit, offset);
        total = proposals.length;
      }

      return success({ proposals, total });
    });
  }

  /**
   * Get active proposals (currently in voting)
   */
  async getActiveProposals(tenantId: string): Promise<Result<GovernanceProposal[]>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('getActiveProposals', async () => {
      const proposals = await this.proposalRepo.findByState(tenantId, ProposalState.ACTIVE);
      return success(proposals);
    });
  }

  /**
   * Cancel a proposal (only proposer can cancel, only if not yet executed)
   */
  async cancelProposal(
    tenantId: string,
    proposalId: string,
    userId: string
  ): Promise<Result<GovernanceProposal>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!proposalId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'proposalId is required' });
    }
    if (!userId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
    }

    return this.withTiming('cancelProposal', async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        return failure({ code: 'NOT_FOUND', message: `Proposal ${proposalId} not found` });
      }

      // Verify ownership
      if (proposal.proposerId !== userId) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'Only the proposer can cancel a proposal' });
      }

      // Check state allows cancellation
      const cancelableStates = [ProposalState.PENDING, ProposalState.ACTIVE, ProposalState.SUCCEEDED, ProposalState.QUEUED];
      if (!cancelableStates.includes(proposal.state)) {
        return failure({ code: 'VALIDATION_ERROR', message: `Cannot cancel proposal in state: ${proposal.state}` });
      }

      // Cancel on-chain
      await this.blockchainProvider.cancelProposal(tenantId, proposal.proposalId, proposal.proposer);

      // Update local state
      const updated = await this.proposalRepo.update(tenantId, proposalId, {
        state: ProposalState.CANCELED,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.dao.proposal_canceled', tenantId, {
        proposalId: proposal.id,
        proposer: proposal.proposer,
        title: proposal.title
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // VOTING
  // ==========================================================================

  /**
   * Cast a vote on a proposal
   */
  async castVote(
    tenantId: string,
    data: {
      userId: string;
      proposalId: string;
      support: 'for' | 'against' | 'abstain';
      reason?: string;
    }
  ): Promise<Result<Vote>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.userId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
    }
    if (!data.proposalId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'proposalId is required' });
    }
    if (!data.support) {
      return failure({ code: 'VALIDATION_ERROR', message: 'support is required' });
    }

    return this.withTiming('castVote', async () => {
      // Get proposal
      const proposal = await this.proposalRepo.findById(tenantId, data.proposalId);
      if (!proposal) {
        return failure({ code: 'NOT_FOUND', message: `Proposal ${data.proposalId} not found` });
      }

      // Check proposal is active
      const currentState = await this.blockchainProvider.getProposalState(tenantId, proposal.proposalId);
      if (currentState !== ProposalState.ACTIVE) {
        return failure({ code: 'VALIDATION_ERROR', message: `Proposal is not active for voting. Current state: ${currentState}` });
      }

      // Get voter wallet
      const wallet = await this.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'No wallet connected for voter' });
      }

      // Check hasn't already voted
      const hasVoted = await this.blockchainProvider.hasVoted(tenantId, proposal.proposalId, wallet);
      if (hasVoted) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Already voted on this proposal' });
      }

      // Map support to on-chain value
      const supportValue = data.support === 'against' ? 0 : data.support === 'for' ? 1 : 2;

      // Cast vote on-chain
      const { txHash, weight } = await this.blockchainProvider.castVote(
        tenantId,
        wallet,
        proposal.proposalId,
        supportValue as 0 | 1 | 2,
        data.reason
      );

      const currentBlock = await this.blockchainProvider.getCurrentBlock();

      // Create local record
      const vote = await this.voteRepo.create(tenantId, {
        proposalId: data.proposalId,
        voter: wallet,
        voterId: data.userId,
        support: data.support,
        weight,
        reason: data.reason,
        txHash,
        blockNumber: currentBlock,
        votedAt: new Date()
      });

      // Update delegate profile voting history
      const delegateProfile = await this.delegateProfileRepo.findByAddress(tenantId, wallet);
      if (delegateProfile) {
        await this.delegateProfileRepo.addVoteToHistory(tenantId, wallet, {
          proposalId: data.proposalId,
          vote: data.support,
          weight,
          outcome: 'passed' // Will be updated when proposal concludes
        });
        await this.delegateProfileRepo.update(tenantId, wallet, {
          totalVotes: delegateProfile.totalVotes + 1,
          lastActiveAt: new Date()
        });
      }

      await this.publishEvent('scholarly.dao.vote_cast', tenantId, {
        proposalId: data.proposalId,
        voter: wallet,
        support: data.support,
        weight: weight.toString(),
        reason: data.reason
      });

      return success(vote);
    });
  }

  /**
   * Get votes for a proposal
   */
  async getProposalVotes(
    tenantId: string,
    proposalId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Result<{ votes: Vote[]; summary: { for: TokenAmount; against: TokenAmount; abstain: TokenAmount } }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!proposalId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'proposalId is required' });
    }

    return this.withTiming('getProposalVotes', async () => {
      const votes = await this.voteRepo.findByProposal(tenantId, proposalId, options.limit, options.offset);
      const summary = await this.voteRepo.getVotingPowerBySupport(tenantId, proposalId);
      return success({ votes, summary });
    });
  }

  /**
   * Get user's voting power
   */
  async getVotingPower(
    tenantId: string,
    userId: string
  ): Promise<Result<{ power: TokenAmount; delegatedTo?: EthAddress; receivedDelegations: TokenAmount }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!userId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
    }

    return this.withTiming('getVotingPower', async () => {
      const wallet = await this.walletProvider.getConnectedWallet(userId);
      if (!wallet) {
        return success({ power: BigInt(0), receivedDelegations: BigInt(0) });
      }

      const power = await this.blockchainProvider.getVotingPower(tenantId, wallet);
      const delegatedTo = await this.blockchainProvider.getDelegates(tenantId, wallet);
      const receivedDelegations = await this.delegationRepo.getTotalDelegatedTo(tenantId, wallet);

      return success({
        power,
        delegatedTo: delegatedTo !== wallet ? delegatedTo : undefined,
        receivedDelegations
      });
    });
  }

  // ==========================================================================
  // DELEGATION
  // ==========================================================================

  /**
   * Delegate voting power to another address
   *
   * Implements "liquid democracy" - users can delegate their votes to trusted
   * community members who vote on their behalf.
   */
  async delegateVotingPower(
    tenantId: string,
    data: {
      delegatorId: string;
      delegateAddress: EthAddress;
    }
  ): Promise<Result<VoteDelegation>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.delegatorId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'delegatorId is required' });
    }
    if (!data.delegateAddress) {
      return failure({ code: 'VALIDATION_ERROR', message: 'delegateAddress is required' });
    }

    return this.withTiming('delegateVotingPower', async () => {
      // Get delegator wallet
      const delegatorWallet = await this.walletProvider.getConnectedWallet(data.delegatorId);
      if (!delegatorWallet) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'No wallet connected for delegator' });
      }

      // Can't delegate to self
      if (delegatorWallet.toLowerCase() === data.delegateAddress.toLowerCase()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Cannot delegate to self' });
      }

      // Check for existing delegation
      const existing = await this.delegationRepo.findByDelegator(tenantId, delegatorWallet);
      if (existing && existing.isActive) {
        // Revoke existing first
        await this.delegationRepo.update(tenantId, existing.id, {
          isActive: false,
          revokedAt: new Date()
        });
      }

      // Delegate on-chain
      const txHash = await this.blockchainProvider.delegate(tenantId, delegatorWallet, data.delegateAddress);

      // Get delegated amount
      const amount = await this.blockchainProvider.getVotingPower(tenantId, delegatorWallet);

      // Create delegation record
      const delegation = await this.delegationRepo.create(tenantId, {
        delegator: delegatorWallet,
        delegatorId: data.delegatorId,
        delegate: data.delegateAddress,
        amount,
        isActive: true,
        txHash,
        delegatedAt: new Date()
      });

      // Update delegate profile
      const delegateProfile = await this.delegateProfileRepo.findByAddress(tenantId, data.delegateAddress);
      if (delegateProfile) {
        const totalDelegated = await this.delegationRepo.getTotalDelegatedTo(tenantId, data.delegateAddress);
        const delegators = await this.delegationRepo.findByDelegate(tenantId, data.delegateAddress);
        await this.delegateProfileRepo.update(tenantId, data.delegateAddress, {
          totalDelegatedPower: totalDelegated,
          delegatorCount: delegators.filter(d => d.isActive).length
        });
      }

      await this.publishEvent('scholarly.dao.delegation_created', tenantId, {
        delegator: delegatorWallet,
        delegate: data.delegateAddress,
        amount: amount.toString()
      });

      return success(delegation);
    });
  }

  /**
   * Revoke delegation (return to self-voting)
   */
  async revokeDelegation(
    tenantId: string,
    delegatorId: string
  ): Promise<Result<void>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!delegatorId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'delegatorId is required' });
    }

    return this.withTiming('revokeDelegation', async () => {
      const wallet = await this.walletProvider.getConnectedWallet(delegatorId);
      if (!wallet) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'No wallet connected' });
      }

      const delegation = await this.delegationRepo.findByDelegator(tenantId, wallet);
      if (!delegation || !delegation.isActive) {
        return failure({ code: 'NOT_FOUND', message: `Active delegation for ${wallet} not found` });
      }

      // Delegate back to self on-chain
      await this.blockchainProvider.delegate(tenantId, wallet, wallet);

      // Update delegation record
      await this.delegationRepo.update(tenantId, delegation.id, {
        isActive: false,
        revokedAt: new Date()
      });

      // Update delegate profile
      const delegateProfile = await this.delegateProfileRepo.findByAddress(tenantId, delegation.delegate);
      if (delegateProfile) {
        const totalDelegated = await this.delegationRepo.getTotalDelegatedTo(tenantId, delegation.delegate);
        const delegators = await this.delegationRepo.findByDelegate(tenantId, delegation.delegate);
        await this.delegateProfileRepo.update(tenantId, delegation.delegate, {
          totalDelegatedPower: totalDelegated,
          delegatorCount: delegators.filter(d => d.isActive).length
        });
      }

      await this.publishEvent('scholarly.dao.delegation_revoked', tenantId, {
        delegator: wallet,
        previousDelegate: delegation.delegate
      });

      return success(undefined);
    });
  }

  // ==========================================================================
  // DELEGATE PROFILES
  // ==========================================================================

  /**
   * Register as a delegate
   *
   * Creates a public profile for users who want to receive delegations
   */
  async registerAsDelegate(
    tenantId: string,
    data: {
      userId: string;
      name: string;
      bio: string;
      avatar?: string;
      focusAreas: ProposalCategory[];
    }
  ): Promise<Result<DelegateProfile>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.userId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
    }
    if (!data.name) {
      return failure({ code: 'VALIDATION_ERROR', message: 'name is required' });
    }
    if (!data.bio) {
      return failure({ code: 'VALIDATION_ERROR', message: 'bio is required' });
    }

    return this.withTiming('registerAsDelegate', async () => {
      const wallet = await this.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) {
        return failure({ code: 'AUTHORIZATION_ERROR', message: 'No wallet connected' });
      }

      // Check not already registered
      const existing = await this.delegateProfileRepo.findByAddress(tenantId, wallet);
      if (existing) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Already registered as delegate' });
      }

      const profile = await this.delegateProfileRepo.create(tenantId, {
        address: wallet,
        userId: data.userId,
        name: data.name,
        bio: data.bio,
        avatar: data.avatar,
        focusAreas: data.focusAreas,
        totalVotes: 0,
        participationRate: 0,
        totalDelegatedPower: BigInt(0),
        delegatorCount: 0,
        votingHistory: []
      });

      await this.publishEvent('scholarly.dao.delegate_registered', tenantId, {
        address: wallet,
        name: data.name,
        focusAreas: data.focusAreas
      });

      return success(profile);
    });
  }

  /**
   * Get delegate profile
   */
  async getDelegateProfile(
    tenantId: string,
    address: EthAddress
  ): Promise<Result<DelegateProfile>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!address) {
      return failure({ code: 'VALIDATION_ERROR', message: 'address is required' });
    }

    return this.withTiming('getDelegateProfile', async () => {
      const profile = await this.delegateProfileRepo.findByAddress(tenantId, address);
      if (!profile) {
        return failure({ code: 'NOT_FOUND', message: `Delegate profile for ${address} not found` });
      }
      return success(profile);
    });
  }

  /**
   * List top delegates by delegated power
   */
  async getTopDelegates(
    tenantId: string,
    limit: number = 20
  ): Promise<Result<DelegateProfile[]>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('getTopDelegates', async () => {
      const delegates = await this.delegateProfileRepo.findTopByDelegatedPower(tenantId, limit);
      return success(delegates);
    });
  }

  // ==========================================================================
  // PROPOSAL EXECUTION
  // ==========================================================================

  /**
   * Queue a successful proposal for execution
   */
  async queueProposal(
    tenantId: string,
    proposalId: string
  ): Promise<Result<GovernanceProposal>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!proposalId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'proposalId is required' });
    }

    return this.withTiming('queueProposal', async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        return failure({ code: 'NOT_FOUND', message: `Proposal ${proposalId} not found` });
      }

      // Verify state
      const currentState = await this.blockchainProvider.getProposalState(tenantId, proposal.proposalId);
      if (currentState !== ProposalState.SUCCEEDED) {
        return failure({ code: 'VALIDATION_ERROR', message: `Proposal must be in Succeeded state to queue. Current: ${currentState}` });
      }

      // Queue on-chain
      await this.blockchainProvider.queueProposal(tenantId, proposal.proposalId);

      // Get ETA
      const config = await this.blockchainProvider.getDAOConfig(tenantId);
      const eta = Math.floor(Date.now() / 1000) + config.timelockDelay;

      // Update local state
      const updated = await this.proposalRepo.update(tenantId, proposalId, {
        state: ProposalState.QUEUED,
        eta,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.dao.proposal_queued', tenantId, {
        proposalId: proposal.id,
        title: proposal.title,
        eta
      });

      return success(updated);
    });
  }

  /**
   * Execute a queued proposal
   */
  async executeProposal(
    tenantId: string,
    proposalId: string
  ): Promise<Result<GovernanceProposal>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!proposalId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'proposalId is required' });
    }

    return this.withTiming('executeProposal', async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        return failure({ code: 'NOT_FOUND', message: `Proposal ${proposalId} not found` });
      }

      // Verify state
      const currentState = await this.blockchainProvider.getProposalState(tenantId, proposal.proposalId);
      if (currentState !== ProposalState.QUEUED) {
        return failure({ code: 'VALIDATION_ERROR', message: `Proposal must be in Queued state to execute. Current: ${currentState}` });
      }

      // Check timelock has passed
      if (proposal.eta && Date.now() / 1000 < proposal.eta) {
        return failure({ code: 'VALIDATION_ERROR', message: `Timelock not yet passed. ETA: ${new Date(proposal.eta * 1000)}` });
      }

      // Execute on-chain
      const txHash = await this.blockchainProvider.executeProposal(tenantId, proposal.proposalId);

      // Update local state
      const updated = await this.proposalRepo.update(tenantId, proposalId, {
        state: ProposalState.EXECUTED,
        executedAt: new Date(),
        executionTxHash: txHash,
        updatedAt: new Date()
      });

      await this.publishEvent('scholarly.dao.proposal_executed', tenantId, {
        proposalId: proposal.id,
        title: proposal.title,
        txHash,
        actions: proposal.actions.map(a => a.description)
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // TREASURY
  // ==========================================================================

  /**
   * Get treasury status
   */
  async getTreasuryStatus(tenantId: string): Promise<Result<TreasuryStatus>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('getTreasuryStatus', async () => {
      const status = await this.blockchainProvider.getTreasuryBalance(tenantId);
      return success(status);
    });
  }

  // ==========================================================================
  // GOVERNANCE ANALYTICS
  // ==========================================================================

  /**
   * Get governance statistics
   */
  async getGovernanceStats(tenantId: string): Promise<Result<{
    totalProposals: number;
    activeProposals: number;
    totalVotesCast: number;
    uniqueVoters: number;
    averageParticipation: number;
    proposalsByCategory: Record<ProposalCategory, number>;
    proposalsByOutcome: Record<string, number>;
  }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('getGovernanceStats', async () => {
      const allProposals = await this.proposalRepo.findAll(tenantId);
      const activeCount = await this.proposalRepo.countByState(tenantId, ProposalState.ACTIVE);

      // Count by category
      const byCategory = allProposals.reduce((acc, p) => {
        acc[p.category] = (acc[p.category] || 0) + 1;
        return acc;
      }, {} as Record<ProposalCategory, number>);

      // Count by outcome
      const byOutcome = allProposals.reduce((acc, p) => {
        acc[p.state] = (acc[p.state] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return success({
        totalProposals: allProposals.length,
        activeProposals: activeCount,
        totalVotesCast: 0,
        uniqueVoters: 0,
        averageParticipation: 0,
        proposalsByCategory: byCategory,
        proposalsByOutcome: byOutcome
      });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: DAOGovernanceService | null = null;

export function initializeDAOGovernanceService(deps?: any): DAOGovernanceService {
  if (!instance) {
    instance = new DAOGovernanceService(deps, deps?.repos || {}, deps?.providers || {});
    log.info('DAOGovernanceService initialized');
  }
  return instance;
}

export function getDAOGovernanceService(): DAOGovernanceService {
  if (!instance) {
    throw new Error('DAOGovernanceService not initialized. Call initializeDAOGovernanceService() first.');
  }
  return instance;
}
