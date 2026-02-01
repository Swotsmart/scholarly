/**
 * Scholarly Token Economy Service
 * 
 * Manages the EDU-Nexus token economy including balances, staking,
 * rewards, and NFT content marketplace.
 * 
 * @module TokenEconomyService
 */

import {
  ScholarlyBaseService, Result, success, failure,
  ValidationError, NotFoundError, AuthorizationError, Validator,
  EventBus, Cache, ScholarlyConfig
} from './types';

import {
  EthAddress, TxHash, TokenAmount, TokenConfig, UserTokenBalance,
  StakingPosition, StakingPool, StakingPurpose, RewardType, TokenReward,
  TokenTransaction, PublisherNFT, NFTContentType, NFTValidationStatus,
  ValidatorScore, ContentValidator, NFTPurchase
} from './phase4-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface TokenBalanceRepository {
  findByUserId(tenantId: string, userId: string): Promise<UserTokenBalance | null>;
  findByWallet(tenantId: string, wallet: EthAddress): Promise<UserTokenBalance | null>;
  create(tenantId: string, balance: Omit<UserTokenBalance, 'lastUpdated'>): Promise<UserTokenBalance>;
  update(tenantId: string, wallet: EthAddress, updates: Partial<UserTokenBalance>): Promise<UserTokenBalance>;
}

export interface StakingPoolRepository {
  findById(tenantId: string, id: string): Promise<StakingPool | null>;
  findByPurpose(tenantId: string, purpose: StakingPurpose): Promise<StakingPool[]>;
  findAll(tenantId: string, activeOnly?: boolean): Promise<StakingPool[]>;
  update(tenantId: string, id: string, updates: Partial<StakingPool>): Promise<StakingPool>;
}

export interface StakingPositionRepository {
  findById(tenantId: string, id: string): Promise<StakingPosition | null>;
  findByUser(tenantId: string, userId: string): Promise<StakingPosition[]>;
  create(tenantId: string, position: Omit<StakingPosition, 'id'>): Promise<StakingPosition>;
  update(tenantId: string, id: string, updates: Partial<StakingPosition>): Promise<StakingPosition>;
  countByPool(tenantId: string, poolId: string): Promise<number>;
  sumStakedByPool(tenantId: string, poolId: string): Promise<TokenAmount>;
}

export interface TokenRewardRepository {
  findPendingRewards(tenantId: string, recipientId: string): Promise<TokenReward[]>;
  create(tenantId: string, reward: Omit<TokenReward, 'id'>): Promise<TokenReward>;
  update(tenantId: string, id: string, updates: Partial<TokenReward>): Promise<TokenReward>;
  sumByRecipient(tenantId: string, recipientId: string, status?: string): Promise<TokenAmount>;
}

export interface PublisherNFTRepository {
  findByTokenId(tenantId: string, tokenId: bigint): Promise<PublisherNFT | null>;
  findByContentId(tenantId: string, contentId: string): Promise<PublisherNFT | null>;
  create(tenantId: string, nft: Omit<PublisherNFT, 'mintedAt'>): Promise<PublisherNFT>;
  update(tenantId: string, tokenId: bigint, updates: Partial<PublisherNFT>): Promise<PublisherNFT>;
}

export interface ContentValidatorRepository {
  findById(tenantId: string, id: string): Promise<ContentValidator | null>;
  findByWallet(tenantId: string, wallet: EthAddress): Promise<ContentValidator | null>;
  create(tenantId: string, validator: Omit<ContentValidator, 'id' | 'registeredAt'>): Promise<ContentValidator>;
  update(tenantId: string, id: string, updates: Partial<ContentValidator>): Promise<ContentValidator>;
  selectRandomValidators(tenantId: string, count: number): Promise<ContentValidator[]>;
}

export interface NFTPurchaseRepository {
  create(tenantId: string, purchase: Omit<NFTPurchase, 'id'>): Promise<NFTPurchase>;
}

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

export interface TokenBlockchainProvider {
  getTokenConfig(tenantId: string): Promise<TokenConfig>;
  getBalance(tenantId: string, address: EthAddress): Promise<TokenAmount>;
  transfer(tenantId: string, from: EthAddress, to: EthAddress, amount: TokenAmount): Promise<TxHash>;
  stake(tenantId: string, staker: EthAddress, poolId: string, amount: TokenAmount): Promise<TxHash>;
  unstake(tenantId: string, staker: EthAddress, positionId: string): Promise<TxHash>;
  distributeReward(tenantId: string, recipient: EthAddress, amount: TokenAmount, reason: string): Promise<TxHash>;
  mintNFT(tenantId: string, creator: EthAddress, metadataUri: string, royaltyBps: number): Promise<{ tokenId: bigint; txHash: TxHash }>;
  listNFT(tenantId: string, owner: EthAddress, tokenId: bigint, price: TokenAmount): Promise<TxHash>;
  purchaseNFT(tenantId: string, buyer: EthAddress, tokenId: bigint): Promise<TxHash>;
  slashValidator(tenantId: string, validator: EthAddress, amount: TokenAmount, reason: string): Promise<TxHash>;
}

export interface IPFSProvider {
  uploadJSON(data: Record<string, any>): Promise<string>;
}

export interface WalletProvider {
  getConnectedWallet(userId: string): Promise<EthAddress | null>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class TokenEconomyService extends ScholarlyBaseService {
  constructor(
    deps: { eventBus: EventBus; cache: Cache; config: ScholarlyConfig },
    private readonly repos: {
      balanceRepo: TokenBalanceRepository;
      poolRepo: StakingPoolRepository;
      positionRepo: StakingPositionRepository;
      rewardRepo: TokenRewardRepository;
      nftRepo: PublisherNFTRepository;
      validatorRepo: ContentValidatorRepository;
      purchaseRepo: NFTPurchaseRepository;
    },
    private readonly providers: {
      blockchainProvider: TokenBlockchainProvider;
      ipfsProvider: IPFSProvider;
      walletProvider: WalletProvider;
    }
  ) {
    super('TokenEconomyService', deps);
  }

  // ==========================================================================
  // TOKEN BALANCES
  // ==========================================================================

  async getUserBalance(tenantId: string, userId: string): Promise<Result<UserTokenBalance>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(userId, 'userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getUserBalance', tenantId, async () => {
      const wallet = await this.providers.walletProvider.getConnectedWallet(userId);
      if (!wallet) {
        return {
          userId,
          walletAddress: '0x0' as EthAddress,
          available: BigInt(0),
          staked: BigInt(0),
          locked: BigInt(0),
          pendingRewards: BigInt(0),
          stakingPositions: [],
          delegatedVotingPower: BigInt(0),
          receivedDelegations: BigInt(0),
          lastUpdated: new Date()
        };
      }

      const onChainBalance = await this.providers.blockchainProvider.getBalance(tenantId, wallet);
      const positions = await this.repos.positionRepo.findByUser(tenantId, userId);
      const stakedAmount = positions
        .filter(p => p.status === 'active')
        .reduce((sum, p) => sum + p.stakedAmount, BigInt(0));
      const pendingRewards = await this.repos.rewardRepo.sumByRecipient(tenantId, userId, 'pending');

      return {
        userId,
        walletAddress: wallet,
        available: onChainBalance - stakedAmount,
        staked: stakedAmount,
        locked: BigInt(0),
        pendingRewards,
        stakingPositions: positions,
        delegatedVotingPower: BigInt(0),
        receivedDelegations: BigInt(0),
        lastUpdated: new Date()
      };
    }, { userId });
  }

  async transferTokens(
    tenantId: string,
    data: { fromUserId: string; toAddress: EthAddress; amount: TokenAmount; memo?: string }
  ): Promise<Result<{ txHash: TxHash }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.fromUserId, 'fromUserId');
      if (data.amount <= BigInt(0)) throw new ValidationError('Amount must be positive');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('transferTokens', tenantId, async () => {
      const wallet = await this.providers.walletProvider.getConnectedWallet(data.fromUserId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const balance = await this.providers.blockchainProvider.getBalance(tenantId, wallet);
      if (balance < data.amount) throw new ValidationError('Insufficient balance');

      const txHash = await this.providers.blockchainProvider.transfer(tenantId, wallet, data.toAddress, data.amount);

      await this.publishEvent('scholarly.token.transfer', tenantId, {
        from: wallet, to: data.toAddress, amount: data.amount.toString(), txHash
      });

      return { txHash };
    }, { fromUserId: data.fromUserId });
  }

  // ==========================================================================
  // STAKING
  // ==========================================================================

  async getStakingPools(tenantId: string, purpose?: StakingPurpose): Promise<Result<StakingPool[]>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getStakingPools', tenantId, async () => {
      return purpose
        ? this.repos.poolRepo.findByPurpose(tenantId, purpose)
        : this.repos.poolRepo.findAll(tenantId, true);
    });
  }

  async stakeTokens(
    tenantId: string,
    data: { userId: string; poolId: string; amount: TokenAmount }
  ): Promise<Result<StakingPosition>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.userId, 'userId');
      Validator.required(data.poolId, 'poolId');
      if (data.amount <= BigInt(0)) throw new ValidationError('Amount must be positive');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('stakeTokens', tenantId, async () => {
      const pool = await this.repos.poolRepo.findById(tenantId, data.poolId);
      if (!pool) throw new NotFoundError('Staking pool', data.poolId);
      if (!pool.isActive) throw new ValidationError('Pool is not active');
      if (data.amount < pool.minimumStake) throw new ValidationError(`Minimum stake: ${pool.minimumStake}`);

      const wallet = await this.providers.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const balance = await this.providers.blockchainProvider.getBalance(tenantId, wallet);
      if (balance < data.amount) throw new ValidationError('Insufficient balance');

      await this.providers.blockchainProvider.stake(tenantId, wallet, data.poolId, data.amount);

      const lockUntil = pool.lockPeriodDays > 0
        ? new Date(Date.now() + pool.lockPeriodDays * 24 * 60 * 60 * 1000)
        : undefined;

      const position = await this.repos.positionRepo.create(tenantId, {
        poolId: data.poolId,
        poolName: pool.name,
        stakedAmount: data.amount,
        stakedAt: new Date(),
        lockUntil,
        earnedRewards: BigInt(0),
        apr: pool.apr,
        status: 'active'
      });

      await this.publishEvent('scholarly.token.staked', tenantId, {
        userId: data.userId, poolId: data.poolId, amount: data.amount.toString()
      });

      return position;
    }, { userId: data.userId, poolId: data.poolId });
  }

  async unstakeTokens(
    tenantId: string,
    data: { userId: string; positionId: string }
  ): Promise<Result<StakingPosition>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.userId, 'userId');
      Validator.required(data.positionId, 'positionId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('unstakeTokens', tenantId, async () => {
      const position = await this.repos.positionRepo.findById(tenantId, data.positionId);
      if (!position) throw new NotFoundError('Position', data.positionId);
      if (position.status !== 'active') throw new ValidationError('Position not active');
      if (position.lockUntil && new Date() < position.lockUntil) {
        throw new ValidationError(`Locked until ${position.lockUntil}`);
      }

      const wallet = await this.providers.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      await this.providers.blockchainProvider.unstake(tenantId, wallet, data.positionId);

      return this.repos.positionRepo.update(tenantId, data.positionId, {
        status: 'unstaking',
        unstakingRequestedAt: new Date(),
        unstakingCompletesAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });
    }, { userId: data.userId, positionId: data.positionId });
  }

  // ==========================================================================
  // REWARDS
  // ==========================================================================

  async issueReward(
    tenantId: string,
    data: {
      recipientId: string;
      type: RewardType;
      amount: TokenAmount;
      reason: string;
      sourceType: TokenReward['sourceType'];
      sourceReference?: string;
    }
  ): Promise<Result<TokenReward>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.recipientId, 'recipientId');
      if (data.amount <= BigInt(0)) throw new ValidationError('Amount must be positive');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('issueReward', tenantId, async () => {
      const wallet = await this.providers.walletProvider.getConnectedWallet(data.recipientId);

      const reward = await this.repos.rewardRepo.create(tenantId, {
        recipientId: data.recipientId,
        recipientWallet: wallet || '0x0' as EthAddress,
        type: data.type,
        amount: data.amount,
        reason: data.reason,
        sourceType: data.sourceType,
        sourceReference: data.sourceReference,
        status: 'pending',
        earnedAt: new Date(),
        claimableAt: new Date()
      });

      await this.publishEvent('scholarly.token.reward_issued', tenantId, {
        recipientId: data.recipientId, type: data.type, amount: data.amount.toString()
      });

      return reward;
    }, { recipientId: data.recipientId });
  }

  async claimRewards(tenantId: string, userId: string): Promise<Result<{ totalAmount: TokenAmount; txHash: TxHash }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(userId, 'userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('claimRewards', tenantId, async () => {
      const wallet = await this.providers.walletProvider.getConnectedWallet(userId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const rewards = await this.repos.rewardRepo.findPendingRewards(tenantId, userId);
      const now = new Date();
      const claimable = rewards.filter(r => r.status === 'pending' && r.claimableAt <= now);

      if (claimable.length === 0) throw new ValidationError('No claimable rewards');

      const totalAmount = claimable.reduce((sum, r) => sum + r.amount, BigInt(0));
      const txHash = await this.providers.blockchainProvider.distributeReward(tenantId, wallet, totalAmount, 'Claim rewards');

      for (const reward of claimable) {
        await this.repos.rewardRepo.update(tenantId, reward.id, { status: 'claimed', txHash, claimedAt: new Date() });
      }

      await this.publishEvent('scholarly.token.rewards_claimed', tenantId, { userId, totalAmount: totalAmount.toString() });

      return { totalAmount, txHash };
    }, { userId });
  }

  // ==========================================================================
  // NFT MARKETPLACE
  // ==========================================================================

  async mintPublisherNFT(
    tenantId: string,
    data: {
      creatorId: string;
      contentType: NFTContentType;
      contentId: string;
      metadata: { name: string; description: string; imageUrl: string; attributes: Record<string, any> };
      royaltyPercent: number;
    }
  ): Promise<Result<PublisherNFT>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.creatorId, 'creatorId');
      Validator.required(data.contentId, 'contentId');
      if (data.royaltyPercent < 0 || data.royaltyPercent > 25) {
        throw new ValidationError('Royalty must be 0-25%');
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('mintPublisherNFT', tenantId, async () => {
      const existing = await this.repos.nftRepo.findByContentId(tenantId, data.contentId);
      if (existing) throw new ValidationError('Content already has NFT');

      const wallet = await this.providers.walletProvider.getConnectedWallet(data.creatorId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const metadataUri = await this.providers.ipfsProvider.uploadJSON({
        ...data.metadata, contentType: data.contentType, contentId: data.contentId, creator: wallet
      });

      const royaltyBps = data.royaltyPercent * 100;
      const { tokenId, txHash } = await this.providers.blockchainProvider.mintNFT(tenantId, wallet, metadataUri, royaltyBps);
      const config = await this.providers.blockchainProvider.getTokenConfig(tenantId);

      const nft = await this.repos.nftRepo.create(tenantId, {
        tokenId,
        contractAddress: config.contractAddress,
        creator: wallet,
        currentOwner: wallet,
        contentType: data.contentType,
        contentId: data.contentId,
        metadataUri,
        creatorRoyalty: royaltyBps,
        coPublisherRoyalty: 150,
        platformFee: 150,
        coPublishers: [],
        validationStatus: NFTValidationStatus.PENDING,
        validatorScores: [],
        isListed: false,
        totalSales: 0,
        totalRevenue: BigInt(0)
      });

      await this.publishEvent('scholarly.nft.minted', tenantId, { tokenId: tokenId.toString(), creator: wallet, txHash });

      return nft;
    }, { creatorId: data.creatorId });
  }

  async submitForValidation(tenantId: string, tokenId: bigint): Promise<Result<{ nft: PublisherNFT; validators: ContentValidator[] }>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitForValidation', tenantId, async () => {
      const nft = await this.repos.nftRepo.findByTokenId(tenantId, tokenId);
      if (!nft) throw new NotFoundError('NFT', tokenId.toString());
      if (nft.validationStatus !== NFTValidationStatus.PENDING) {
        throw new ValidationError(`Already in status: ${nft.validationStatus}`);
      }

      const validators = await this.repos.validatorRepo.selectRandomValidators(tenantId, 3);
      if (validators.length < 3) throw new ValidationError('Insufficient validators');

      const updated = await this.repos.nftRepo.update(tenantId, tokenId, { validationStatus: NFTValidationStatus.IN_REVIEW });

      await this.publishEvent('scholarly.nft.validation_started', tenantId, { tokenId: tokenId.toString() });

      return { nft: updated, validators };
    }, { tokenId: tokenId.toString() });
  }

  async submitValidationScore(
    tenantId: string,
    data: { validatorId: string; tokenId: bigint; score: Omit<ValidatorScore, 'validatorAddress' | 'validatorId' | 'submittedAt'> }
  ): Promise<Result<PublisherNFT>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.validatorId, 'validatorId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitValidationScore', tenantId, async () => {
      const nft = await this.repos.nftRepo.findByTokenId(tenantId, data.tokenId);
      if (!nft) throw new NotFoundError('NFT', data.tokenId.toString());
      if (nft.validationStatus !== NFTValidationStatus.IN_REVIEW) throw new ValidationError('Not in review');

      const validator = await this.repos.validatorRepo.findById(tenantId, data.validatorId);
      if (!validator) throw new NotFoundError('Validator', data.validatorId);

      const newScore: ValidatorScore = {
        ...data.score,
        validatorAddress: validator.walletAddress,
        validatorId: data.validatorId,
        submittedAt: new Date()
      };

      const updatedScores = [...nft.validatorScores, newScore];
      let newStatus = nft.validationStatus;

      if (updatedScores.length >= 3) {
        const avgScore = updatedScores.reduce((sum, s) => sum + s.overallScore, 0) / updatedScores.length;
        const approvals = updatedScores.filter(s => s.recommendation === 'approve').length;
        
        if (approvals >= 2 && avgScore >= 3.5) newStatus = NFTValidationStatus.APPROVED;
        else if (updatedScores.filter(s => s.recommendation === 'reject').length >= 2) newStatus = NFTValidationStatus.REJECTED;
      }

      return this.repos.nftRepo.update(tenantId, data.tokenId, { validatorScores: updatedScores, validationStatus: newStatus });
    }, { validatorId: data.validatorId, tokenId: data.tokenId.toString() });
  }

  async listNFTForSale(tenantId: string, data: { ownerId: string; tokenId: bigint; price: TokenAmount }): Promise<Result<PublisherNFT>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.ownerId, 'ownerId');
      if (data.price <= BigInt(0)) throw new ValidationError('Price must be positive');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('listNFTForSale', tenantId, async () => {
      const nft = await this.repos.nftRepo.findByTokenId(tenantId, data.tokenId);
      if (!nft) throw new NotFoundError('NFT', data.tokenId.toString());
      if (nft.validationStatus !== NFTValidationStatus.APPROVED) throw new ValidationError('NFT must be approved');

      const wallet = await this.providers.walletProvider.getConnectedWallet(data.ownerId);
      if (!wallet || wallet.toLowerCase() !== nft.currentOwner.toLowerCase()) {
        throw new AuthorizationError('Only owner can list');
      }

      await this.providers.blockchainProvider.listNFT(tenantId, wallet, data.tokenId, data.price);

      return this.repos.nftRepo.update(tenantId, data.tokenId, { isListed: true, listPrice: data.price });
    }, { tokenId: data.tokenId.toString() });
  }

  async purchaseNFT(tenantId: string, data: { buyerId: string; tokenId: bigint }): Promise<Result<NFTPurchase>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.buyerId, 'buyerId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('purchaseNFT', tenantId, async () => {
      const nft = await this.repos.nftRepo.findByTokenId(tenantId, data.tokenId);
      if (!nft) throw new NotFoundError('NFT', data.tokenId.toString());
      if (!nft.isListed || !nft.listPrice) throw new ValidationError('Not listed');

      const wallet = await this.providers.walletProvider.getConnectedWallet(data.buyerId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const balance = await this.providers.blockchainProvider.getBalance(tenantId, wallet);
      if (balance < nft.listPrice) throw new ValidationError('Insufficient balance');

      const txHash = await this.providers.blockchainProvider.purchaseNFT(tenantId, wallet, data.tokenId);

      const price = nft.listPrice;
      const creatorShare = (price * BigInt(nft.creatorRoyalty)) / BigInt(10000);
      const coPublisherShare = (price * BigInt(nft.coPublisherRoyalty)) / BigInt(10000);
      const platformShare = (price * BigInt(nft.platformFee)) / BigInt(10000);
      const validatorShare = price - creatorShare - coPublisherShare - platformShare;

      const purchase = await this.repos.purchaseRepo.create(tenantId, {
        nftTokenId: data.tokenId,
        buyerAddress: wallet,
        buyerId: data.buyerId,
        sellerAddress: nft.currentOwner,
        price,
        txHash,
        creatorShare,
        coPublisherShare,
        platformShare,
        validatorShare,
        licenseType: 'perpetual',
        purchasedAt: new Date()
      });

      await this.repos.nftRepo.update(tenantId, data.tokenId, {
        totalSales: nft.totalSales + 1,
        totalRevenue: nft.totalRevenue + price,
        isListed: false,
        listPrice: undefined
      });

      await this.publishEvent('scholarly.nft.purchased', tenantId, { tokenId: data.tokenId.toString(), buyer: wallet, price: price.toString() });

      return purchase;
    }, { buyerId: data.buyerId, tokenId: data.tokenId.toString() });
  }

  // ==========================================================================
  // VALIDATORS
  // ==========================================================================

  async registerAsValidator(
    tenantId: string,
    data: { userId: string; expertiseAreas: string[]; credentials: string[]; stakeAmount: TokenAmount }
  ): Promise<Result<ContentValidator>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.userId, 'userId');
      if (data.expertiseAreas.length === 0) throw new ValidationError('Expertise required');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('registerAsValidator', tenantId, async () => {
      const wallet = await this.providers.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const existing = await this.repos.validatorRepo.findByWallet(tenantId, wallet);
      if (existing) throw new ValidationError('Already registered');

      const pools = await this.repos.poolRepo.findByPurpose(tenantId, StakingPurpose.CONTENT_VALIDATOR);
      if (pools.length === 0) throw new ValidationError('No validator pool');
      
      const pool = pools[0];
      if (data.stakeAmount < pool.minimumStake) throw new ValidationError(`Minimum stake: ${pool.minimumStake}`);

      await this.providers.blockchainProvider.stake(tenantId, wallet, pool.id, data.stakeAmount);

      const validator = await this.repos.validatorRepo.create(tenantId, {
        userId: data.userId,
        walletAddress: wallet,
        expertiseAreas: data.expertiseAreas,
        credentials: data.credentials,
        stakedAmount: data.stakeAmount,
        stakingPoolId: pool.id,
        totalReviews: 0,
        approvalAccuracy: 100,
        averageReviewTime: 0,
        totalEarned: BigInt(0),
        totalSlashed: BigInt(0),
        status: 'active'
      });

      await this.publishEvent('scholarly.validator.registered', tenantId, { validatorId: validator.id, wallet });

      return validator;
    }, { userId: data.userId });
  }

  async slashValidator(
    tenantId: string,
    data: { validatorId: string; amount: TokenAmount; reason: string; nftTokenId: bigint }
  ): Promise<Result<ContentValidator>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(data.validatorId, 'validatorId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('slashValidator', tenantId, async () => {
      const validator = await this.repos.validatorRepo.findById(tenantId, data.validatorId);
      if (!validator) throw new NotFoundError('Validator', data.validatorId);

      await this.providers.blockchainProvider.slashValidator(tenantId, validator.walletAddress, data.amount, data.reason);

      const updated = await this.repos.validatorRepo.update(tenantId, data.validatorId, {
        stakedAmount: validator.stakedAmount - data.amount,
        totalSlashed: validator.totalSlashed + data.amount,
        approvalAccuracy: Math.max(0, validator.approvalAccuracy - 10),
        status: validator.stakedAmount - data.amount < BigInt(1000) ? 'suspended' : 'active'
      });

      await this.publishEvent('scholarly.validator.slashed', tenantId, { validatorId: data.validatorId, amount: data.amount.toString() });

      return updated;
    }, { validatorId: data.validatorId });
  }
}

export default TokenEconomyService;
