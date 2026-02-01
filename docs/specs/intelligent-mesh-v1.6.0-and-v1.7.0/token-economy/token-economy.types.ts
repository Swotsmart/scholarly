/**
 * Token Economy Module - Type Definitions
 * 
 * The economic layer of the Scholarly ecosystem, enabling rewards, staking,
 * NFT credentials, and a sustainable creator economy through EDU-Nexus tokens.
 * 
 * ## The Granny Explanation
 * 
 * Remember when we used to give kids gold stars for good work? The token economy
 * is like gold stars for the digital age, but much more powerful:
 * 
 * - **Students** earn tokens for completing lessons, helping peers, maintaining
 *   streaks, and achieving goals. They can spend tokens on special content,
 *   avatar items, or even real rewards.
 * 
 * - **Teachers** earn tokens for creating popular resources, mentoring students,
 *   and contributing to the platform. Top creators can earn real income.
 * 
 * - **Parents** earn tokens for engagement, completing school tasks on time,
 *   and participating in the community.
 * 
 * - **Schools** can stake tokens to get governance voting power, access premium
 *   features, or fund bounties for content they need.
 * 
 * NFTs (unique digital certificates) are used for:
 * - **Credentials**: Completing a course gives you an NFT certificate that
 *   can't be faked and lives on the blockchain forever
 * - **Achievements**: Special accomplishments become collectible badges
 * - **Access passes**: VIP access to events, content, or communities
 * 
 * The AI helps by:
 * - Optimising reward amounts to motivate without inflating
 * - Detecting gaming/cheating of the reward system
 * - Personalising rewards to what motivates each learner
 * - Predicting engagement based on reward structures
 * 
 * @module IntelligenceMesh/TokenEconomy
 * @version 1.7.0
 */

import { MeshBaseEntity } from '../shared/mesh-types';

// ============================================================================
// CORE ENUMS
// ============================================================================

export type TokenTransactionType = 
  | 'mint' | 'burn' | 'transfer' | 'reward' 
  | 'stake' | 'unstake' | 'purchase' | 'sale';

export type RewardCategory = 
  | 'learning_completion'   // Completing lessons, courses
  | 'assessment_performance'// Good grades, improvement
  | 'streak_maintenance'    // Daily/weekly streaks
  | 'peer_support'          // Helping others
  | 'content_creation'      // Creating resources
  | 'community_contribution'// Forum posts, reviews
  | 'governance_participation'// Voting, proposals
  | 'referral'              // Bringing new users
  | 'achievement'           // Unlocking achievements
  | 'bonus';                // Special bonuses

export type StakeStatus = 'active' | 'unlocking' | 'withdrawn';

export type NFTType = 'achievement' | 'credential' | 'collectible' | 'access_pass';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

export type ListingStatus = 'active' | 'sold' | 'cancelled' | 'expired';

export type AuctionStatus = 'active' | 'ended' | 'cancelled';

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * User's token account
 */
export interface TokenAccount extends MeshBaseEntity {
  userId: string;
  userType: 'student' | 'teacher' | 'parent' | 'admin';
  
  // Balances
  balance: number;                     // Available tokens
  lockedBalance: number;               // Locked (pending transactions)
  stakedBalance: number;               // Staked for rewards/voting
  
  // Lifetime stats
  lifetimeEarned: number;
  lifetimeSpent: number;
  lifetimeStaked: number;
  
  // Level system
  level: number;
  experiencePoints: number;
  experienceToNextLevel: number;
  
  // Multipliers
  rewardMultiplier: number;            // Bonus for premium/high level
  streakMultiplier: number;            // Bonus for maintaining streaks
  
  // Streaks
  currentDailyStreak: number;
  longestDailyStreak: number;
  lastActivityDate?: Date;
  
  // Preferences
  autoStake: boolean;                  // Auto-stake rewards
  autoStakePercentage: number;
  notifyOnReward: boolean;
  
  // Stats
  achievementsUnlocked: number;
  nftsOwned: number;
}

/**
 * Token Transaction
 */
export interface TokenTransaction extends MeshBaseEntity {
  accountId: string;
  
  type: TokenTransactionType;
  amount: number;
  
  // For transfers
  fromAccountId?: string;
  toAccountId?: string;
  
  // Details
  reason: string;
  category: RewardCategory | string;
  
  // Related entity
  relatedEntityType?: string;
  relatedEntityId?: string;
  
  // Status
  status: 'pending' | 'completed' | 'failed' | 'reversed';
  completedAt?: Date;
  
  // Blockchain (if applicable)
  onChain: boolean;
  transactionHash?: string;
  blockNumber?: number;
  
  // Metadata
  metadata?: Record<string, any>;
}

/**
 * Reward definition
 */
export interface RewardDefinition extends MeshBaseEntity {
  code: string;
  name: string;
  description: string;
  
  category: RewardCategory;
  
  // Reward amount
  baseAmount: number;
  maxAmount?: number;                  // If variable
  
  // Calculation
  calculationType: 'fixed' | 'variable' | 'percentage' | 'formula';
  formula?: string;                    // For complex calculations
  variables?: string[];                // Variables used in formula
  
  // Conditions
  conditions: RewardCondition[];
  
  // Limits
  limits?: {
    perDay?: number;
    perWeek?: number;
    perMonth?: number;
    lifetime?: number;
  };
  
  // Eligibility
  eligibleUserTypes: ('student' | 'teacher' | 'parent')[];
  eligibleLevels?: { min: number; max?: number };
  
  // Status
  isActive: boolean;
  effectiveFrom: Date;
  effectiveUntil?: Date;
  
  // Analytics
  totalAwarded: number;
  timesAwarded: number;
}

export interface RewardCondition {
  type: 'completion' | 'score' | 'streak' | 'count' | 'time' | 'custom';
  parameter: string;
  operator: '=' | '>' | '<' | '>=' | '<=' | 'between';
  value: any;
  valueMax?: any;                      // For 'between'
}

/**
 * Pending reward (to be claimed or auto-distributed)
 */
export interface PendingReward extends MeshBaseEntity {
  accountId: string;
  rewardDefinitionId: string;
  
  amount: number;
  
  reason: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  
  // Status
  status: 'pending' | 'claimed' | 'expired' | 'auto_distributed';
  expiresAt?: Date;
  claimedAt?: Date;
  
  // AI bonus
  aiBonus?: number;
  aiBonusReason?: string;
}

// ============================================================================
// STAKING
// ============================================================================

/**
 * Token Stake
 */
export interface TokenStake extends MeshBaseEntity {
  accountId: string;
  
  amount: number;
  lockPeriodDays: number;
  
  // Timeline
  startedAt: Date;
  unlocksAt: Date;
  
  // Rewards
  apy: number;                         // Annual percentage yield
  rewardsEarned: number;
  rewardsClaimed: number;
  lastRewardCalculation: Date;
  
  status: StakeStatus;
  withdrawnAt?: Date;
  
  // For DAO staking
  daoId?: string;
  votingPowerGranted?: number;
  
  // Auto-compound
  autoCompound: boolean;
}

/**
 * Staking pool configuration
 */
export interface StakingPool extends MeshBaseEntity {
  name: string;
  description: string;
  
  // APY tiers
  apyTiers: {
    minDays: number;
    maxDays?: number;
    apy: number;
  }[];
  
  // Limits
  minStake: number;
  maxStake?: number;
  totalPoolCap?: number;
  
  // Current state
  totalStaked: number;
  participantCount: number;
  rewardsDistributed: number;
  
  // Status
  isActive: boolean;
  
  // For DAO pools
  daoId?: string;
  votingPowerMultiplier?: number;
}

// ============================================================================
// NFTs
// ============================================================================

/**
 * NFT Token
 */
export interface TokenNFT extends MeshBaseEntity {
  tokenId: string;                     // Unique token identifier
  ownerId: string;
  
  type: NFTType;
  name: string;
  description: string;
  
  // Media
  imageUrl: string;
  animationUrl?: string;
  thumbnailUrl?: string;
  
  // Metadata
  metadataUrl: string;                 // IPFS or similar
  attributes: NFTAttribute[];
  
  // Rarity
  rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  edition?: number;
  totalEditions?: number;
  
  // For credentials
  credential?: {
    issuerId: string;
    issuerName: string;
    issuedTo: string;
    recipientName: string;
    issuedAt: Date;
    achievement: string;
    validUntil?: Date;
    revoked: boolean;
    revokedAt?: Date;
    revokedReason?: string;
    verificationUrl: string;
  };
  
  // For access passes
  accessPass?: {
    accessType: string;
    validFrom: Date;
    validUntil?: Date;
    usesRemaining?: number;
    accessDetails: Record<string, any>;
  };
  
  // Marketplace
  isListed: boolean;
  listingPrice?: number;
  lastSalePrice?: number;
  
  // Blockchain
  onChain: boolean;
  contractAddress?: string;
  mintTransactionHash?: string;
  
  // Transfer history
  transferCount: number;
  previousOwners: string[];
}

export interface NFTAttribute {
  traitType: string;
  value: string | number;
  displayType?: 'string' | 'number' | 'date' | 'boost_percentage';
  maxValue?: number;
}

/**
 * NFT Collection
 */
export interface NFTCollection extends MeshBaseEntity {
  name: string;
  description: string;
  
  type: NFTType;
  
  // Creator
  creatorId: string;
  creatorName: string;
  
  // Media
  bannerUrl?: string;
  thumbnailUrl?: string;
  
  // Stats
  totalSupply: number;
  minted: number;
  owners: number;
  floorPrice?: number;
  totalVolume: number;
  
  // Configuration
  maxSupply?: number;
  mintPrice?: number;
  royaltyPercentage: number;
  
  // Status
  isActive: boolean;
  mintStartDate?: Date;
  mintEndDate?: Date;
}

// ============================================================================
// MARKETPLACE
// ============================================================================

/**
 * NFT Marketplace Listing
 */
export interface NFTListing extends MeshBaseEntity {
  nftId: string;
  sellerId: string;
  
  price: number;
  currency: 'EDU' | 'USD';             // EDU tokens or fiat equivalent
  
  status: ListingStatus;
  
  listedAt: Date;
  expiresAt?: Date;
  soldAt?: Date;
  
  buyerId?: string;
  saleTransactionId?: string;
}

/**
 * NFT Auction
 */
export interface NFTAuction extends MeshBaseEntity {
  nftId: string;
  sellerId: string;
  
  startingPrice: number;
  reservePrice?: number;
  currentBid?: number;
  currentBidderId?: string;
  
  status: AuctionStatus;
  
  startsAt: Date;
  endsAt: Date;
  
  bidCount: number;
  
  winnerId?: string;
  winningBid?: number;
  settledAt?: Date;
}

/**
 * Auction Bid
 */
export interface AuctionBid extends MeshBaseEntity {
  auctionId: string;
  bidderId: string;
  
  amount: number;
  
  status: 'active' | 'outbid' | 'winning' | 'lost' | 'cancelled';
  
  bidAt: Date;
}

// ============================================================================
// ACHIEVEMENTS
// ============================================================================

/**
 * Achievement Definition
 */
export interface Achievement extends MeshBaseEntity {
  code: string;
  name: string;
  description: string;
  
  category: string;
  tier: AchievementTier;
  
  // Criteria
  criteria: AchievementCriterion[];
  
  // Rewards
  reward: {
    tokens: number;
    experiencePoints: number;
    nftId?: string;                    // NFT badge
  };
  
  // Display
  iconUrl: string;
  unlockedIconUrl?: string;
  
  // Rarity
  totalUnlocks: number;
  unlockPercentage?: number;           // % of users who have it
  
  // Status
  isActive: boolean;
  isSecret: boolean;                   // Hidden until unlocked
  
  // Progression
  isProgressive: boolean;              // Has progress steps
  progressSteps?: number;
}

export interface AchievementCriterion {
  type: string;
  parameter: string;
  target: number;
  description: string;
}

/**
 * User's achievement
 */
export interface UserAchievement extends MeshBaseEntity {
  accountId: string;
  achievementId: string;
  
  // Progress
  progress: number;
  progressMax: number;
  progressPercentage: number;
  
  // Unlock
  unlockedAt?: Date;
  
  // Reward
  rewardClaimed: boolean;
  rewardClaimedAt?: Date;
  tokensRewarded?: number;
  nftMinted?: string;
}

// ============================================================================
// AI SERVICES
// ============================================================================

export interface AITokenEconomyService {
  // Reward optimisation
  optimiseRewardAmount(
    reward: RewardDefinition,
    recipient: TokenAccount,
    context: { recentRewards: TokenTransaction[]; cohortStats: any }
  ): Promise<{
    recommendedAmount: number;
    reasoning: string;
    engagementPrediction: number;
    inflationImpact: number;
  }>;
  
  // Fraud detection
  detectGaming(
    account: TokenAccount,
    recentActivity: TokenTransaction[]
  ): Promise<{
    riskScore: number;
    suspiciousPatterns: string[];
    recommendedAction: 'allow' | 'review' | 'block';
    evidence: { pattern: string; examples: any[] }[];
  }>;
  
  // Personalised rewards
  personaliseRewards(
    account: TokenAccount,
    availableRewards: RewardDefinition[]
  ): Promise<{
    prioritisedRewards: {
      reward: RewardDefinition;
      personalMultiplier: number;
      engagementBoost: number;
      reason: string;
    }[];
    motivationProfile: string;
  }>;
  
  // Economy health
  analyseEconomyHealth(
    tenantId: string,
    period: { start: Date; end: Date }
  ): Promise<{
    healthScore: number;
    inflationRate: number;
    velocityOfMoney: number;
    giniCoefficient: number;           // Wealth inequality
    concerns: string[];
    recommendations: string[];
  }>;
  
  // Price prediction (for marketplace)
  predictNFTValue(
    nft: TokenNFT,
    marketData: { recentSales: any[]; listings: NFTListing[] }
  ): Promise<{
    estimatedValue: number;
    confidence: number;
    priceRange: { low: number; high: number };
    factors: { factor: string; impact: number }[];
  }>;
  
  // Achievement recommendations
  recommendAchievements(
    account: TokenAccount,
    achievements: Achievement[],
    userProgress: UserAchievement[]
  ): Promise<{
    recommended: {
      achievement: Achievement;
      currentProgress: number;
      estimatedEffort: string;
      motivationMatch: number;
    }[];
  }>;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface TokenEconomyAnalytics {
  tenantId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };
  
  // Supply metrics
  supplyMetrics: {
    totalSupply: number;
    circulatingSupply: number;
    stakedSupply: number;
    burnedSupply: number;
    inflationRate: number;
  };
  
  // Distribution
  distribution: {
    totalAccounts: number;
    activeAccounts: number;
    averageBalance: number;
    medianBalance: number;
    giniCoefficient: number;
    top10PercentShare: number;
  };
  
  // Activity
  activity: {
    totalTransactions: number;
    totalVolume: number;
    averageTransactionSize: number;
    uniqueUsers: number;
    velocityOfMoney: number;
  };
  
  // Rewards
  rewards: {
    totalDistributed: number;
    byCategory: { category: RewardCategory; amount: number; count: number }[];
    averageRewardSize: number;
    uniqueRecipients: number;
  };
  
  // Staking
  staking: {
    totalStaked: number;
    stakingRate: number;
    averageStakeDuration: number;
    totalRewardsDistributed: number;
  };
  
  // NFTs
  nfts: {
    totalMinted: number;
    totalTraded: number;
    tradingVolume: number;
    averagePrice: number;
    uniqueOwners: number;
  };
  
  // Achievements
  achievements: {
    totalUnlocked: number;
    mostPopular: { achievementId: string; name: string; unlocks: number }[];
    averagePerUser: number;
  };
  
  // AI insights
  aiInsights: {
    healthScore: number;
    trends: string[];
    risks: string[];
    recommendations: string[];
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  TokenAccount,
  TokenTransaction,
  RewardDefinition,
  PendingReward,
  TokenStake,
  StakingPool,
  TokenNFT,
  NFTCollection,
  NFTListing,
  NFTAuction,
  AuctionBid,
  Achievement,
  UserAchievement,
  TokenEconomyAnalytics
};
