/**
 * Scholarly DAO Governance Service
 * 
 * Implements decentralized governance for the Scholarly platform, enabling
 * community-driven decision making through proposals, voting, and delegation.
 * 
 * ## The Granny Explanation
 * 
 * Remember how town councils work? People propose ideas, everyone discusses them,
 * then they vote. If enough people agree, the idea becomes reality.
 * 
 * The DAO (Decentralized Autonomous Organization) is like a town council, but:
 * - The rules are written in computer code that can't be bent or broken
 * - Everyone who holds tokens gets voting power proportional to their stake
 * - You can delegate your vote to someone you trust (like giving your proxy)
 * - Once a vote passes, the changes happen automatically - no bureaucracy
 * 
 * For Scholarly, this means:
 * - Teachers can propose new features ("Let's add a music curriculum!")
 * - The community votes on how to spend the ecosystem fund
 * - Platform fees can only change if the community agrees
 * - Featured content is curated democratically, not by executives
 * 
 * The "Timelock" is like a cooling-off period - even after a vote passes,
 * there's a delay before execution. This gives people time to react if
 * something unexpected happens.
 * 
 * @module DAOGovernanceService
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  AuthorizationError,
  Validator,
  EventBus,
  Cache,
  ScholarlyConfig
} from './types';

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
  // Config
  getDAOConfig(tenantId: string): Promise<DAOConfig>;
  
  // Proposals
  createProposal(
    tenantId: string,
    proposer: EthAddress,
    actions: ProposalAction[],
    description: string
  ): Promise<{ proposalId: bigint; txHash: TxHash }>;
  
  getProposalState(tenantId: string, proposalId: bigint): Promise<ProposalState>;
  getProposalVotes(tenantId: string, proposalId: bigint): Promise<{ forVotes: TokenAmount; againstVotes: TokenAmount; abstainVotes: TokenAmount }>;
  
  // Voting
  castVote(
    tenantId: string,
    voter: EthAddress,
    proposalId: bigint,
    support: 0 | 1 | 2, // Against, For, Abstain
    reason?: string
  ): Promise<{ txHash: TxHash; weight: TokenAmount }>;
  
  getVotingPower(tenantId: string, account: EthAddress, blockNumber?: BlockNumber): Promise<TokenAmount>;
  hasVoted(tenantId: string, proposalId: bigint, account: EthAddress): Promise<boolean>;
  
  // Delegation
  delegate(tenantId: string, delegator: EthAddress, delegatee: EthAddress): Promise<TxHash>;
  getDelegates(tenantId: string, account: EthAddress): Promise<EthAddress>;
  
  // Execution
  queueProposal(tenantId: string, proposalId: bigint): Promise<TxHash>;
  executeProposal(tenantId: string, proposalId: bigint): Promise<TxHash>;
  cancelProposal(tenantId: string, proposalId: bigint, proposer: EthAddress): Promise<TxHash>;
  
  // Treasury
  getTreasuryBalance(tenantId: string): Promise<TreasuryStatus>;
  
  // Block info
  getCurrentBlock(): Promise<BlockNumber>;
  getBlockTimestamp(blockNumber: BlockNumber): Promise<number>;
}

/**
 * Wallet connection provider
 */
export interface WalletProvider {
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
  private readonly walletProvider: WalletProvider;

  constructor(
    deps: {
      eventBus: EventBus;
      cache: Cache;
      config: ScholarlyConfig;
    },
    repos: {
      proposalRepo: ProposalRepository;
      voteRepo: VoteRepository;
      delegationRepo: DelegationRepository;
      delegateProfileRepo: DelegateProfileRepository;
    },
    providers: {
      blockchainProvider: GovernanceBlockchainProvider;
      walletProvider: WalletProvider;
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
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getDAOConfig', tenantId, async () => {
      const cacheKey = this.cacheKey(tenantId, 'dao:config');
      const cached = await this.cache.get<DAOConfig>(cacheKey);
      if (cached) return cached;

      const config = await this.blockchainProvider.getDAOConfig(tenantId);
      await this.cache.set(cacheKey, config, 3600); // Cache for 1 hour

      return config;
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.proposerId, 'proposerId');
      Validator.required(data.title, 'title');
      Validator.required(data.description, 'description');
      Validator.required(data.actions, 'actions');
      
      if (data.actions.length === 0) {
        throw new ValidationError('At least one action is required');
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createProposal', tenantId, async () => {
      // Get proposer's wallet
      const wallet = await this.walletProvider.getConnectedWallet(data.proposerId);
      if (!wallet) {
        throw new AuthorizationError('No wallet connected for proposer');
      }

      // Check voting power meets threshold
      const config = await this.blockchainProvider.getDAOConfig(tenantId);
      const votingPower = await this.blockchainProvider.getVotingPower(tenantId, wallet);
      
      if (votingPower < config.proposalThreshold) {
        throw new AuthorizationError(
          `Insufficient voting power. Required: ${config.proposalThreshold}, Have: ${votingPower}`
        );
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

      return proposal;
    }, { proposerId: data.proposerId, category: data.category });
  }

  /**
   * Get proposal by ID
   */
  async getProposal(
    tenantId: string,
    proposalId: string
  ): Promise<Result<GovernanceProposal>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(proposalId, 'proposalId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getProposal', tenantId, async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        throw new NotFoundError('Proposal', proposalId);
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

      return proposal;
    }, { proposalId });
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
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('listProposals', tenantId, async () => {
      const { limit = 20, offset = 0 } = options;
      let proposals: GovernanceProposal[];
      let total: number;

      if (options.state) {
        proposals = await this.proposalRepo.findByState(tenantId, options.state, limit, offset);
        total = await this.proposalRepo.countByState(tenantId, options.state);
      } else if (options.category) {
        proposals = await this.proposalRepo.findByCategory(tenantId, options.category, limit, offset);
        total = proposals.length; // Simplified for category filter
      } else if (options.proposer) {
        proposals = await this.proposalRepo.findByProposer(tenantId, options.proposer, limit, offset);
        total = proposals.length;
      } else {
        proposals = await this.proposalRepo.findAll(tenantId, limit, offset);
        total = proposals.length;
      }

      return { proposals, total };
    }, options);
  }

  /**
   * Get active proposals (currently in voting)
   */
  async getActiveProposals(tenantId: string): Promise<Result<GovernanceProposal[]>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getActiveProposals', tenantId, async () => {
      return this.proposalRepo.findByState(tenantId, ProposalState.ACTIVE);
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(proposalId, 'proposalId');
      Validator.required(userId, 'userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('cancelProposal', tenantId, async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        throw new NotFoundError('Proposal', proposalId);
      }

      // Verify ownership
      if (proposal.proposerId !== userId) {
        throw new AuthorizationError('Only the proposer can cancel a proposal');
      }

      // Check state allows cancellation
      const cancelableStates = [ProposalState.PENDING, ProposalState.ACTIVE, ProposalState.SUCCEEDED, ProposalState.QUEUED];
      if (!cancelableStates.includes(proposal.state)) {
        throw new ValidationError(`Cannot cancel proposal in state: ${proposal.state}`);
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

      return updated;
    }, { proposalId, userId });
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.userId, 'userId');
      Validator.required(data.proposalId, 'proposalId');
      Validator.required(data.support, 'support');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('castVote', tenantId, async () => {
      // Get proposal
      const proposal = await this.proposalRepo.findById(tenantId, data.proposalId);
      if (!proposal) {
        throw new NotFoundError('Proposal', data.proposalId);
      }

      // Check proposal is active
      const currentState = await this.blockchainProvider.getProposalState(tenantId, proposal.proposalId);
      if (currentState !== ProposalState.ACTIVE) {
        throw new ValidationError(`Proposal is not active for voting. Current state: ${currentState}`);
      }

      // Get voter wallet
      const wallet = await this.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) {
        throw new AuthorizationError('No wallet connected for voter');
      }

      // Check hasn't already voted
      const hasVoted = await this.blockchainProvider.hasVoted(tenantId, proposal.proposalId, wallet);
      if (hasVoted) {
        throw new ValidationError('Already voted on this proposal');
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

      return vote;
    }, { userId: data.userId, proposalId: data.proposalId, support: data.support });
  }

  /**
   * Get votes for a proposal
   */
  async getProposalVotes(
    tenantId: string,
    proposalId: string,
    options: { limit?: number; offset?: number } = {}
  ): Promise<Result<{ votes: Vote[]; summary: { for: TokenAmount; against: TokenAmount; abstain: TokenAmount } }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(proposalId, 'proposalId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getProposalVotes', tenantId, async () => {
      const votes = await this.voteRepo.findByProposal(tenantId, proposalId, options.limit, options.offset);
      const summary = await this.voteRepo.getVotingPowerBySupport(tenantId, proposalId);
      return { votes, summary };
    }, { proposalId });
  }

  /**
   * Get user's voting power
   */
  async getVotingPower(
    tenantId: string,
    userId: string
  ): Promise<Result<{ power: TokenAmount; delegatedTo?: EthAddress; receivedDelegations: TokenAmount }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(userId, 'userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getVotingPower', tenantId, async () => {
      const wallet = await this.walletProvider.getConnectedWallet(userId);
      if (!wallet) {
        return { power: BigInt(0), receivedDelegations: BigInt(0) };
      }

      const power = await this.blockchainProvider.getVotingPower(tenantId, wallet);
      const delegatedTo = await this.blockchainProvider.getDelegates(tenantId, wallet);
      const receivedDelegations = await this.delegationRepo.getTotalDelegatedTo(tenantId, wallet);

      return {
        power,
        delegatedTo: delegatedTo !== wallet ? delegatedTo : undefined,
        receivedDelegations
      };
    }, { userId });
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.delegatorId, 'delegatorId');
      Validator.required(data.delegateAddress, 'delegateAddress');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('delegateVotingPower', tenantId, async () => {
      // Get delegator wallet
      const delegatorWallet = await this.walletProvider.getConnectedWallet(data.delegatorId);
      if (!delegatorWallet) {
        throw new AuthorizationError('No wallet connected for delegator');
      }

      // Can't delegate to self
      if (delegatorWallet.toLowerCase() === data.delegateAddress.toLowerCase()) {
        throw new ValidationError('Cannot delegate to self');
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

      return delegation;
    }, { delegatorId: data.delegatorId, delegate: data.delegateAddress });
  }

  /**
   * Revoke delegation (return to self-voting)
   */
  async revokeDelegation(
    tenantId: string,
    delegatorId: string
  ): Promise<Result<void>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(delegatorId, 'delegatorId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('revokeDelegation', tenantId, async () => {
      const wallet = await this.walletProvider.getConnectedWallet(delegatorId);
      if (!wallet) {
        throw new AuthorizationError('No wallet connected');
      }

      const delegation = await this.delegationRepo.findByDelegator(tenantId, wallet);
      if (!delegation || !delegation.isActive) {
        throw new NotFoundError('Active delegation', wallet);
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
    }, { delegatorId });
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.userId, 'userId');
      Validator.required(data.name, 'name');
      Validator.required(data.bio, 'bio');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('registerAsDelegate', tenantId, async () => {
      const wallet = await this.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) {
        throw new AuthorizationError('No wallet connected');
      }

      // Check not already registered
      const existing = await this.delegateProfileRepo.findByAddress(tenantId, wallet);
      if (existing) {
        throw new ValidationError('Already registered as delegate');
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

      return profile;
    }, { userId: data.userId });
  }

  /**
   * Get delegate profile
   */
  async getDelegateProfile(
    tenantId: string,
    address: EthAddress
  ): Promise<Result<DelegateProfile>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(address, 'address');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getDelegateProfile', tenantId, async () => {
      const profile = await this.delegateProfileRepo.findByAddress(tenantId, address);
      if (!profile) {
        throw new NotFoundError('Delegate profile', address);
      }
      return profile;
    }, { address });
  }

  /**
   * List top delegates by delegated power
   */
  async getTopDelegates(
    tenantId: string,
    limit: number = 20
  ): Promise<Result<DelegateProfile[]>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getTopDelegates', tenantId, async () => {
      return this.delegateProfileRepo.findTopByDelegatedPower(tenantId, limit);
    }, { limit });
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
    try {
      Validator.tenantId(tenantId);
      Validator.required(proposalId, 'proposalId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('queueProposal', tenantId, async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        throw new NotFoundError('Proposal', proposalId);
      }

      // Verify state
      const currentState = await this.blockchainProvider.getProposalState(tenantId, proposal.proposalId);
      if (currentState !== ProposalState.SUCCEEDED) {
        throw new ValidationError(`Proposal must be in Succeeded state to queue. Current: ${currentState}`);
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

      return updated;
    }, { proposalId });
  }

  /**
   * Execute a queued proposal
   */
  async executeProposal(
    tenantId: string,
    proposalId: string
  ): Promise<Result<GovernanceProposal>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(proposalId, 'proposalId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('executeProposal', tenantId, async () => {
      const proposal = await this.proposalRepo.findById(tenantId, proposalId);
      if (!proposal) {
        throw new NotFoundError('Proposal', proposalId);
      }

      // Verify state
      const currentState = await this.blockchainProvider.getProposalState(tenantId, proposal.proposalId);
      if (currentState !== ProposalState.QUEUED) {
        throw new ValidationError(`Proposal must be in Queued state to execute. Current: ${currentState}`);
      }

      // Check timelock has passed
      if (proposal.eta && Date.now() / 1000 < proposal.eta) {
        throw new ValidationError(`Timelock not yet passed. ETA: ${new Date(proposal.eta * 1000)}`);
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

      return updated;
    }, { proposalId });
  }

  // ==========================================================================
  // TREASURY
  // ==========================================================================

  /**
   * Get treasury status
   */
  async getTreasuryStatus(tenantId: string): Promise<Result<TreasuryStatus>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getTreasuryStatus', tenantId, async () => {
      return this.blockchainProvider.getTreasuryBalance(tenantId);
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
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getGovernanceStats', tenantId, async () => {
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

      // This would need more sophisticated tracking in production
      return {
        totalProposals: allProposals.length,
        activeProposals: activeCount,
        totalVotesCast: 0, // Would aggregate from vote repo
        uniqueVoters: 0,   // Would need distinct count
        averageParticipation: 0, // Would calculate from quorum data
        proposalsByCategory: byCategory,
        proposalsByOutcome: byOutcome
      };
    });
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export default DAOGovernanceService;
