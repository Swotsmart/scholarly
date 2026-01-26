/**
 * Scholarly Phase 4: Governance & Immersion
 * Type Definitions
 * 
 * This module defines all types for the final phase of Scholarly development:
 * - DAO Governance Framework (Decentralized Autonomous Organization)
 * - EDU-Nexus Token Economy (Utility Token, Staking, NFTs)
 * - Virtual Language Immersion (2D Scenarios, WebXR VR)
 * 
 * ## The Granny Explanation
 * 
 * Imagine a village school that was so successful it grew into a whole network
 * of schools, tutors, and learning resources. Now the question is: who runs it?
 * 
 * **DAO Governance** is like turning the school board into a direct democracy.
 * Instead of a few appointed people making decisions, everyone who has invested
 * in the school (teachers, parents, students, tutors) gets a vote proportional
 * to their stake. Want to change the curriculum? Propose it, discuss it, vote
 * on it. The rules are written in code that executes automatically - no one
 * can bend them for personal gain.
 * 
 * **EDU-Nexus Token** is like the school's own currency. Teachers earn tokens
 * for great lessons, students earn them for progress, and tutors earn them for
 * helping. These tokens can be spent on premium content, give you voting power,
 * or be "staked" to become a content validator. It's like having "skin in the
 * game" - if you approve bad content, you lose your stake.
 * 
 * **Virtual Language Immersion** is like having a magic door that opens to Paris,
 * Tokyo, or Madrid whenever you're learning those languages. First, we build 2D
 * interactive scenarios (like video games where you order croissants in French).
 * Then, we add VR so you can actually "be there" with AI characters who respond
 * to what you say. It's the ultimate language practice without the airfare.
 * 
 * @module ScholarlyPhase4Types
 */

// ============================================================================
// COMMON TYPES
// ============================================================================

/**
 * Ethereum address (0x prefixed, 42 characters)
 */
export type EthAddress = `0x${string}`;

/**
 * Transaction hash
 */
export type TxHash = `0x${string}`;

/**
 * Block number
 */
export type BlockNumber = bigint;

/**
 * Wei amount (smallest ETH unit)
 */
export type Wei = bigint;

/**
 * Token amount (in smallest unit)
 */
export type TokenAmount = bigint;

/**
 * IPFS Content Identifier
 */
export type IPFSCID = string;

/**
 * Unix timestamp in seconds
 */
export type UnixTimestamp = number;

// ============================================================================
// EDU-NEXUS TOKEN TYPES
// ============================================================================

/**
 * Token supply allocation categories per the tokenomics model
 */
export enum TokenAllocation {
  ECOSYSTEM_FUND = 'ECOSYSTEM_FUND',     // 30% - Rewards, grants, partnerships
  TEAM = 'TEAM',                          // 15% - Core team allocation
  ADVISORS = 'ADVISORS',                  // 5% - Strategic advisors
  STRATEGIC_SALE = 'STRATEGIC_SALE',      // 15% - Private sale
  PUBLIC_SALE = 'PUBLIC_SALE',            // 5% - Public launchpad
  LIQUIDITY = 'LIQUIDITY',                // 10% - DEX liquidity
  FOUNDATION_TREASURY = 'FOUNDATION_TREASURY' // 20% - Long-term treasury
}

/**
 * Token allocation details with vesting schedules
 */
export interface AllocationSchedule {
  category: TokenAllocation;
  totalAmount: TokenAmount;
  vestingMonths: number;
  cliffMonths: number;
  tgeUnlockPercent: number; // Percentage unlocked at Token Generation Event
  releasedAmount: TokenAmount;
  remainingAmount: TokenAmount;
  nextReleaseDate?: Date;
}

/**
 * EDU-Nexus Token configuration
 */
export interface TokenConfig {
  name: string;               // "EDU-Nexus"
  symbol: string;             // "NEXU"
  decimals: number;           // 18
  totalSupply: TokenAmount;   // 1,000,000,000 * 10^18
  contractAddress: EthAddress;
  chainId: number;
  deployedAt: Date;
}

/**
 * User token balance with staking details
 */
export interface UserTokenBalance {
  userId: string;
  walletAddress: EthAddress;
  
  // Balances
  available: TokenAmount;     // Freely transferable
  staked: TokenAmount;        // Locked in staking contracts
  locked: TokenAmount;        // Vesting/locked tokens
  pendingRewards: TokenAmount; // Unclaimed rewards
  
  // Staking positions
  stakingPositions: StakingPosition[];
  
  // Delegation
  delegatedTo?: EthAddress;
  delegatedVotingPower: TokenAmount;
  receivedDelegations: TokenAmount;
  
  lastUpdated: Date;
}

/**
 * Individual staking position
 */
export interface StakingPosition {
  id: string;
  poolId: string;
  poolName: string;
  stakedAmount: TokenAmount;
  
  // Timing
  stakedAt: Date;
  lockUntil?: Date;
  
  // Rewards
  earnedRewards: TokenAmount;
  apr: number; // Annual percentage rate
  
  // Status
  status: 'active' | 'unstaking' | 'completed';
  unstakingRequestedAt?: Date;
  unstakingCompletesAt?: Date;
}

/**
 * Staking pool configuration
 */
export interface StakingPool {
  id: string;
  name: string;
  description: string;
  
  // Purpose
  purpose: StakingPurpose;
  
  // Parameters
  minimumStake: TokenAmount;
  lockPeriodDays: number;
  apr: number;
  maxCapacity?: TokenAmount;
  
  // Status
  totalStaked: TokenAmount;
  participantCount: number;
  isActive: boolean;
  
  // Contract
  contractAddress: EthAddress;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Purposes for staking tokens
 */
export enum StakingPurpose {
  GOVERNANCE = 'GOVERNANCE',           // Voting power boost
  CONTENT_VALIDATOR = 'CONTENT_VALIDATOR', // Quality control participation
  TUTOR_VERIFICATION = 'TUTOR_VERIFICATION', // Tutor credential backing
  PREMIUM_ACCESS = 'PREMIUM_ACCESS',   // Platform feature access
  LIQUIDITY_PROVISION = 'LIQUIDITY_PROVISION' // DEX liquidity
}

/**
 * Token reward types
 */
export enum RewardType {
  LEARNING_MILESTONE = 'LEARNING_MILESTONE',
  PEER_FEEDBACK = 'PEER_FEEDBACK',
  CONTENT_CREATION = 'CONTENT_CREATION',
  MENTORING = 'MENTORING',
  VALIDATOR_REWARD = 'VALIDATOR_REWARD',
  STAKING_YIELD = 'STAKING_YIELD',
  REFERRAL = 'REFERRAL',
  GOVERNANCE_PARTICIPATION = 'GOVERNANCE_PARTICIPATION'
}

/**
 * Token reward record
 */
export interface TokenReward {
  id: string;
  recipientId: string;
  recipientWallet: EthAddress;
  
  // Reward details
  type: RewardType;
  amount: TokenAmount;
  reason: string;
  
  // Source
  sourceType: 'smart_contract' | 'admin' | 'ecosystem_fund';
  sourceReference?: string;
  
  // Status
  status: 'pending' | 'claimed' | 'expired';
  txHash?: TxHash;
  
  // Timing
  earnedAt: Date;
  claimableAt: Date;
  expiresAt?: Date;
  claimedAt?: Date;
}

/**
 * Token transaction record
 */
export interface TokenTransaction {
  id: string;
  txHash: TxHash;
  blockNumber: BlockNumber;
  
  // Parties
  from: EthAddress;
  to: EthAddress;
  
  // Amount
  amount: TokenAmount;
  
  // Type
  type: 'transfer' | 'stake' | 'unstake' | 'reward' | 'delegate' | 'burn';
  
  // Status
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
  
  // Metadata
  memo?: string;
  
  timestamp: Date;
}

// ============================================================================
// NFT MARKETPLACE TYPES
// ============================================================================

/**
 * Publisher NFT - Represents ownership of educational content
 */
export interface PublisherNFT {
  tokenId: bigint;
  contractAddress: EthAddress;
  
  // Ownership
  creator: EthAddress;
  currentOwner: EthAddress;
  
  // Content reference
  contentType: NFTContentType;
  contentId: string;
  metadataUri: IPFSCID;
  
  // Revenue sharing (basis points, 10000 = 100%)
  creatorRoyalty: number;     // e.g., 700 = 7%
  coPublisherRoyalty: number; // e.g., 150 = 1.5%
  platformFee: number;        // e.g., 150 = 1.5%
  
  // Co-publishers
  coPublishers: CoPublisher[];
  
  // Validation
  validationStatus: NFTValidationStatus;
  validatorScores: ValidatorScore[];
  
  // Marketplace
  isListed: boolean;
  listPrice?: TokenAmount;
  totalSales: number;
  totalRevenue: TokenAmount;
  
  mintedAt: Date;
  lastTransferAt?: Date;
}

/**
 * NFT content types
 */
export enum NFTContentType {
  CURRICULUM_MODULE = 'CURRICULUM_MODULE',
  VIDEO_LESSON = 'VIDEO_LESSON',
  INTERACTIVE_SIMULATION = 'INTERACTIVE_SIMULATION',
  ASSESSMENT_PACK = 'ASSESSMENT_PACK',
  PROJECT_TEMPLATE = 'PROJECT_TEMPLATE',
  RESOURCE_BUNDLE = 'RESOURCE_BUNDLE'
}

/**
 * NFT validation status
 */
export enum NFTValidationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED'
}

/**
 * Co-publisher revenue share
 */
export interface CoPublisher {
  address: EthAddress;
  userId?: string;
  name: string;
  shareBasisPoints: number; // Share of co-publisher royalty pool
  role: 'marketer' | 'translator' | 'curator' | 'contributor';
}

/**
 * Validator score for NFT content
 */
export interface ValidatorScore {
  validatorAddress: EthAddress;
  validatorId?: string;
  
  // Rubric scores (1-5)
  pedagogicalSoundness: number;
  contentAccuracy: number;
  engagementQuality: number;
  accessibilityCompliance: number;
  technicalQuality: number;
  
  overallScore: number;
  comments: string;
  recommendation: 'approve' | 'revise' | 'reject';
  
  submittedAt: Date;
}

/**
 * Content validator profile
 */
export interface ContentValidator {
  id: string;
  userId: string;
  walletAddress: EthAddress;
  
  // Qualifications
  expertiseAreas: string[];
  credentials: string[]; // Reference to VCs
  
  // Staking
  stakedAmount: TokenAmount;
  stakingPoolId: string;
  
  // Performance
  totalReviews: number;
  approvalAccuracy: number; // % of approved content that wasn't later flagged
  averageReviewTime: number; // hours
  
  // Rewards/Penalties
  totalEarned: TokenAmount;
  totalSlashed: TokenAmount;
  
  // Status
  status: 'active' | 'suspended' | 'inactive';
  suspensionReason?: string;
  
  registeredAt: Date;
  lastReviewAt?: Date;
}

/**
 * NFT purchase/license record
 */
export interface NFTPurchase {
  id: string;
  nftTokenId: bigint;
  
  // Parties
  buyerAddress: EthAddress;
  buyerId?: string;
  sellerAddress: EthAddress;
  
  // Payment
  price: TokenAmount;
  txHash: TxHash;
  
  // Revenue distribution
  creatorShare: TokenAmount;
  coPublisherShare: TokenAmount;
  platformShare: TokenAmount;
  validatorShare: TokenAmount;
  
  // License
  licenseType: 'perpetual' | 'subscription' | 'single_use';
  licenseExpiry?: Date;
  
  purchasedAt: Date;
}

// ============================================================================
// DAO GOVERNANCE TYPES
// ============================================================================

/**
 * DAO configuration
 */
export interface DAOConfig {
  name: string;               // "Scholarly DAO"
  governorAddress: EthAddress;
  timelockAddress: EthAddress;
  treasuryAddress: EthAddress;
  
  // Voting parameters
  votingDelay: number;        // Blocks before voting starts
  votingPeriod: number;       // Blocks voting is open
  proposalThreshold: TokenAmount; // Tokens needed to propose
  quorumPercent: number;      // % of total supply needed
  
  // Timelock
  timelockDelay: number;      // Seconds between approval and execution
  
  // Token
  governanceTokenAddress: EthAddress;
}

/**
 * Governance proposal
 */
export interface GovernanceProposal {
  id: string;
  proposalId: bigint; // On-chain ID
  
  // Proposer
  proposer: EthAddress;
  proposerId?: string;
  
  // Content
  title: string;
  description: string;
  discussionUrl?: string;
  
  // Category
  category: ProposalCategory;
  
  // Actions to execute if passed
  actions: ProposalAction[];
  
  // Voting
  state: ProposalState;
  forVotes: TokenAmount;
  againstVotes: TokenAmount;
  abstainVotes: TokenAmount;
  
  // Timing (block numbers)
  startBlock: BlockNumber;
  endBlock: BlockNumber;
  
  // Execution
  eta?: UnixTimestamp; // Estimated time of execution
  executedAt?: Date;
  executionTxHash?: TxHash;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Proposal categories
 */
export enum ProposalCategory {
  ECOSYSTEM_GRANT = 'ECOSYSTEM_GRANT',       // Fund allocation from ecosystem
  FEE_ADJUSTMENT = 'FEE_ADJUSTMENT',         // Platform fee changes
  PARAMETER_CHANGE = 'PARAMETER_CHANGE',     // Governance parameters
  FEATURED_CONTENT = 'FEATURED_CONTENT',     // Content curation
  PROTOCOL_UPGRADE = 'PROTOCOL_UPGRADE',     // Smart contract upgrades
  PARTNERSHIP = 'PARTNERSHIP',               // Strategic partnerships
  TREASURY_MANAGEMENT = 'TREASURY_MANAGEMENT', // Treasury operations
  COMMUNITY = 'COMMUNITY'                    // Community initiatives
}

/**
 * Proposal lifecycle states
 */
export enum ProposalState {
  PENDING = 'PENDING',       // Before voting starts
  ACTIVE = 'ACTIVE',         // Voting in progress
  CANCELED = 'CANCELED',     // Proposer canceled
  DEFEATED = 'DEFEATED',     // Did not reach quorum or majority
  SUCCEEDED = 'SUCCEEDED',   // Passed, awaiting queue
  QUEUED = 'QUEUED',         // In timelock queue
  EXPIRED = 'EXPIRED',       // Not executed in time
  EXECUTED = 'EXECUTED'      // Successfully executed
}

/**
 * Action to execute when proposal passes
 */
export interface ProposalAction {
  target: EthAddress;        // Contract to call
  value: Wei;                // ETH to send
  signature: string;         // Function signature
  calldata: string;          // Encoded parameters
  
  // Human-readable
  description: string;
}

/**
 * Individual vote record
 */
export interface Vote {
  id: string;
  proposalId: string;
  
  // Voter
  voter: EthAddress;
  voterId?: string;
  
  // Vote
  support: 'for' | 'against' | 'abstain';
  weight: TokenAmount;
  reason?: string;
  
  // Transaction
  txHash: TxHash;
  blockNumber: BlockNumber;
  
  votedAt: Date;
}

/**
 * Voting delegation
 */
export interface VoteDelegation {
  id: string;
  
  // Parties
  delegator: EthAddress;
  delegatorId?: string;
  delegate: EthAddress;
  delegateId?: string;
  
  // Amount
  amount: TokenAmount;
  
  // Status
  isActive: boolean;
  txHash: TxHash;
  
  delegatedAt: Date;
  revokedAt?: Date;
}

/**
 * Delegate profile (for liquid democracy)
 */
export interface DelegateProfile {
  address: EthAddress;
  userId?: string;
  
  // Profile
  name: string;
  bio: string;
  avatar?: string;
  
  // Expertise
  focusAreas: ProposalCategory[];
  
  // Voting history
  totalVotes: number;
  participationRate: number; // % of proposals voted on
  
  // Delegation
  totalDelegatedPower: TokenAmount;
  delegatorCount: number;
  
  // Track record
  votingHistory: {
    proposalId: string;
    vote: 'for' | 'against' | 'abstain';
    weight: TokenAmount;
    outcome: 'passed' | 'failed';
  }[];
  
  registeredAt: Date;
  lastActiveAt: Date;
}

/**
 * Treasury balance and allocation
 */
export interface TreasuryStatus {
  address: EthAddress;
  
  // Balances
  nexuBalance: TokenAmount;
  ethBalance: Wei;
  stablecoinBalances: {
    token: string;
    symbol: string;
    balance: TokenAmount;
  }[];
  
  // Allocation tracking
  allocations: {
    category: string;
    budgeted: TokenAmount;
    spent: TokenAmount;
    committed: TokenAmount; // Approved but not yet spent
  }[];
  
  // Recent activity
  recentTransactions: {
    txHash: TxHash;
    type: 'inflow' | 'outflow';
    amount: TokenAmount;
    token: string;
    description: string;
    proposalId?: string;
    timestamp: Date;
  }[];
  
  lastUpdated: Date;
}

// ============================================================================
// VIRTUAL LANGUAGE IMMERSION TYPES
// ============================================================================

/**
 * Immersion technology tiers - progressive pathway from simple to advanced
 * 
 * The design philosophy is "progressive immersion" - learners start with
 * accessible 2D experiences and advance through increasingly immersive
 * technologies as they gain confidence and access to hardware.
 */
export enum ImmersionTier {
  TIER_2D = 'TIER_2D',       // Browser-based 2D scenarios (visual novel style)
  TIER_3D = 'TIER_3D',       // Browser-based 3D (Three.js/Babylon.js)
  TIER_AR = 'TIER_AR',       // Mobile AR (ARKit/ARCore via WebXR)
  TIER_VR = 'TIER_VR',       // Full VR (Quest, Pico, PCVR via WebXR)
  TIER_MR = 'TIER_MR'        // Mixed Reality (passthrough AR on VR headsets)
}

/**
 * Device capability detection result
 */
export interface DeviceCapabilities {
  // Basic
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasWebGPU: boolean;
  
  // WebXR
  hasWebXR: boolean;
  xrSessionModes: XRSessionMode[];
  
  // Audio
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  supportedVoices: string[];
  
  // Input
  hasGamepad: boolean;
  hasTouchscreen: boolean;
  hasGyroscope: boolean;
  
  // Performance
  estimatedPerformanceTier: 'low' | 'medium' | 'high' | 'ultra';
  gpuInfo?: string;
  
  // Recommended tier based on capabilities
  recommendedTier: ImmersionTier;
  availableTiers: ImmersionTier[];
}

/**
 * WebXR session modes
 */
export type XRSessionMode = 
  | 'inline'           // Rendered in page (no headset)
  | 'immersive-vr'     // Full VR
  | 'immersive-ar';    // AR with camera passthrough

/**
 * Supported languages for immersion
 */
export enum ImmersionLanguage {
  FRENCH = 'fr',
  SPANISH = 'es',
  MANDARIN = 'zh',
  GERMAN = 'de',
  JAPANESE = 'ja',
  ITALIAN = 'it',
  PORTUGUESE = 'pt',
  KOREAN = 'ko',
  ARABIC = 'ar',
  RUSSIAN = 'ru'
}

/**
 * CEFR proficiency levels
 */
export enum CEFRLevel {
  A1 = 'A1', // Beginner
  A2 = 'A2', // Elementary
  B1 = 'B1', // Intermediate
  B2 = 'B2', // Upper Intermediate
  C1 = 'C1', // Advanced
  C2 = 'C2'  // Proficiency
}

/**
 * Immersion scenario - a complete learning experience
 */
export interface ImmersionScenario {
  id: string;
  tenantId: string;
  
  // Basic info
  title: string;
  description: string;
  thumbnailUrl: string;
  previewVideoUrl?: string;
  
  // Language & level
  targetLanguage: ImmersionLanguage;
  nativeLanguage?: ImmersionLanguage; // For translations/hints
  cefrLevel: CEFRLevel;
  
  // Scenario context
  category: ScenarioCategory;
  setting: ScenarioSetting;
  culturalRegion: string; // e.g., "France-Paris", "Spain-Barcelona"
  
  // Learning objectives
  learningObjectives: LearningObjective[];
  vocabularyFocus: VocabularyItem[];
  grammarFocus: string[];
  culturalNotes: CulturalNote[];
  
  // Technical
  supportedTiers: ImmersionTier[];
  assets: ScenarioAssets;
  
  // Characters
  characters: AICharacter[];
  
  // Progression
  scenes: Scene[];
  estimatedDuration: number; // minutes
  
  // Metadata
  difficulty: 1 | 2 | 3 | 4 | 5;
  rating: number;
  completionCount: number;
  
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

/**
 * Scenario categories
 */
export enum ScenarioCategory {
  DAILY_LIFE = 'DAILY_LIFE',           // Shopping, dining, transport
  TRAVEL = 'TRAVEL',                    // Airport, hotel, directions
  WORK = 'WORK',                        // Office, meetings, interviews
  SOCIAL = 'SOCIAL',                    // Parties, introductions, small talk
  EMERGENCY = 'EMERGENCY',              // Medical, police, lost items
  CULTURE = 'CULTURE',                  // Museums, festivals, traditions
  EDUCATION = 'EDUCATION',              // Classroom, university, tutoring
  FAMILY = 'FAMILY'                     // Home, relatives, celebrations
}

/**
 * Physical setting for the scenario
 */
export interface ScenarioSetting {
  name: string;           // "Parisian Café"
  description: string;
  
  // Environment
  environmentType: 'indoor' | 'outdoor' | 'mixed';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  
  // Atmosphere
  ambientSounds: string[];  // ["cafe_chatter", "coffee_machine", "street_noise"]
  musicTrack?: string;
  
  // For 3D/VR environments
  environmentAssetId?: string;
  spawnPoint?: Vector3;
  boundaryRadius?: number;
}

/**
 * 3D Vector
 */
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

/**
 * 3D Rotation (Euler angles or Quaternion)
 */
export interface Rotation {
  x: number;
  y: number;
  z: number;
  w?: number; // For quaternion
}

/**
 * Learning objective within a scenario
 */
export interface LearningObjective {
  id: string;
  description: string;
  type: 'vocabulary' | 'grammar' | 'pronunciation' | 'cultural' | 'listening' | 'conversation';
  targetPhrases?: string[];
  assessmentCriteria: string;
  weight: number; // Importance for scoring
}

/**
 * Vocabulary item with audio
 */
export interface VocabularyItem {
  id: string;
  word: string;
  translation: string;
  pronunciation: string;     // IPA
  audioUrl: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
  exampleAudioUrl: string;
  
  // Contextual hints
  formalityLevel: 'formal' | 'neutral' | 'informal' | 'slang';
  usageNotes?: string;
}

/**
 * Cultural note for context
 */
export interface CulturalNote {
  id: string;
  title: string;
  content: string;
  relevance: string; // When this applies
  imageUrl?: string;
  videoUrl?: string;
}

/**
 * Assets required for a scenario across all tiers
 */
export interface ScenarioAssets {
  // 2D Assets
  tier2D: {
    backgrounds: { sceneId: string; imageUrl: string }[];
    characterSprites: { characterId: string; emotions: Record<string, string> }[];
    uiElements: string[];
  };
  
  // 3D Assets (Three.js/Babylon.js)
  tier3D: {
    environmentGLTF: string;     // GLTF/GLB model
    characterModels: { characterId: string; modelUrl: string; animationsUrl: string }[];
    props: { id: string; modelUrl: string; position: Vector3 }[];
    lightingPreset: string;
    skyboxUrl?: string;
  };
  
  // AR Assets
  tierAR: {
    anchorType: 'plane' | 'image' | 'face' | 'geolocation';
    imageTargets?: { id: string; imageUrl: string; physicalWidth: number }[];
    characterScale: number;
    occlusionEnabled: boolean;
  };
  
  // VR Assets
  tierVR: {
    environmentGLTF: string;     // May be higher detail than 3D
    interactableObjects: InteractableObject[];
    teleportPoints: Vector3[];
    comfortSettings: VRComfortSettings;
  };
  
  // Shared audio
  audio: {
    ambient: string[];
    music?: string;
    sfx: Record<string, string>;
  };
}

/**
 * Object that can be interacted with in VR
 */
export interface InteractableObject {
  id: string;
  name: string;
  modelUrl: string;
  position: Vector3;
  rotation: Rotation;
  scale: Vector3;
  
  // Interaction
  interactionType: 'grab' | 'point' | 'touch' | 'gaze';
  highlightColor?: string;
  
  // Triggers
  onInteract: InteractionTrigger[];
  
  // Physics
  isPhysicsEnabled: boolean;
  mass?: number;
}

/**
 * What happens when an object is interacted with
 */
export interface InteractionTrigger {
  type: 'dialogue' | 'animation' | 'sound' | 'teleport' | 'spawn' | 'vocabulary_popup';
  payload: Record<string, any>;
}

/**
 * VR comfort settings
 */
export interface VRComfortSettings {
  locomotionType: 'teleport' | 'smooth' | 'both';
  turnType: 'snap' | 'smooth';
  snapTurnAngle?: number;
  vignetteDuringMovement: boolean;
  seatedModeSupported: boolean;
  standingModeSupported: boolean;
  roomScaleSupported: boolean;
}

/**
 * AI Character that learners interact with
 */
export interface AICharacter {
  id: string;
  
  // Identity
  name: string;
  role: string;           // "Café Owner", "Tourist", "Professor"
  personality: string;    // Brief personality description
  
  // Appearance
  avatarUrl: string;      // 2D avatar
  model3DUrl?: string;    // 3D model for VR/AR
  
  // Voice
  voiceId: string;        // TTS voice identifier
  voiceStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  speakingSpeed: number;  // 0.5 - 2.0
  
  // Behavior
  defaultMood: CharacterMood;
  patience: number;       // How tolerant of mistakes (1-10)
  helpfulness: number;    // How likely to offer hints (1-10)
  
  // Language
  nativeLanguage: ImmersionLanguage;
  dialectRegion?: string;
  formalityDefault: 'formal' | 'informal';
  
  // Conversation style
  conversationStyle: ConversationStyle;
  
  // Position in 3D space (default)
  defaultPosition?: Vector3;
  defaultRotation?: Rotation;
}

/**
 * Character mood affects responses
 */
export enum CharacterMood {
  HAPPY = 'HAPPY',
  NEUTRAL = 'NEUTRAL',
  CURIOUS = 'CURIOUS',
  IMPATIENT = 'IMPATIENT',
  HELPFUL = 'HELPFUL',
  CONFUSED = 'CONFUSED',
  IMPRESSED = 'IMPRESSED'
}

/**
 * How the AI character conducts conversations
 */
export interface ConversationStyle {
  // Response patterns
  usesFillerWords: boolean;      // "Euh...", "Alors..."
  asksClarifyingQuestions: boolean;
  offersAlternatives: boolean;   // Suggests simpler ways to say things
  
  // Error handling
  errorCorrectionStyle: 'direct' | 'recast' | 'elicit' | 'ignore';
  encouragementFrequency: 'high' | 'medium' | 'low';
  
  // Adaptation
  adjustsToLearnerLevel: boolean;
  remembersContext: boolean;     // References earlier in conversation
}

/**
 * Individual scene within a scenario
 */
export interface Scene {
  id: string;
  sequence: number;
  
  // Scene info
  title: string;
  objective: string;
  
  // Setting override (if different from scenario)
  settingOverride?: Partial<ScenarioSetting>;
  
  // Characters present
  activeCharacters: string[]; // Character IDs
  
  // Dialogue flow
  dialogueTree: DialogueNode[];
  
  // Success criteria
  completionCriteria: CompletionCriteria;
  
  // Branching
  nextSceneOnSuccess?: string;
  nextSceneOnFailure?: string;
  
  // Timing
  maxDuration?: number; // seconds, for timed challenges
}

/**
 * Node in a dialogue tree
 */
export interface DialogueNode {
  id: string;
  type: DialogueNodeType;
  
  // Content
  speakerId?: string;        // Character ID or 'learner'
  text?: string;             // What is said
  audioUrl?: string;         // Pre-recorded audio
  ssmlOverride?: string;     // Custom SSML for TTS
  
  // Display
  emotion?: CharacterMood;
  animation?: string;
  
  // For learner input nodes
  expectedResponses?: ExpectedResponse[];
  freeformAccepted?: boolean;
  
  // Hints
  hints: Hint[];
  
  // Navigation
  nextNodeId?: string;
  conditionalNext?: ConditionalBranch[];
  
  // Assessment
  assessmentWeight?: number;
}

/**
 * Types of dialogue nodes
 */
export enum DialogueNodeType {
  NPC_SPEECH = 'NPC_SPEECH',           // AI character speaks
  LEARNER_CHOICE = 'LEARNER_CHOICE',   // Multiple choice response
  LEARNER_SPEECH = 'LEARNER_SPEECH',   // Free speech input
  LEARNER_ACTION = 'LEARNER_ACTION',   // Physical interaction (VR)
  NARRATION = 'NARRATION',             // Scene description
  INSTRUCTION = 'INSTRUCTION',         // Learning instruction
  VOCABULARY_POPUP = 'VOCABULARY_POPUP', // Show vocabulary
  BRANCH = 'BRANCH'                    // Conditional logic
}

/**
 * Expected response for assessment
 */
export interface ExpectedResponse {
  id: string;
  
  // The response
  text: string;
  variations: string[];      // Acceptable variations
  
  // For speech recognition
  phonemes?: string;         // Expected pronunciation
  
  // Assessment
  isCorrect: boolean;
  isPartiallyCorrect?: boolean;
  feedback: string;
  
  // Navigation
  nextNodeId?: string;
}

/**
 * Hint for struggling learners
 */
export interface Hint {
  level: number;            // 1 = subtle, 3 = explicit
  type: 'text' | 'audio' | 'translation' | 'vocabulary' | 'grammar';
  content: string;
  audioUrl?: string;
  penaltyPercent: number;   // Score reduction for using hint
}

/**
 * Conditional branch based on learner performance
 */
export interface ConditionalBranch {
  condition: BranchCondition;
  nextNodeId: string;
}

/**
 * Conditions for branching
 */
export interface BranchCondition {
  type: 'score_above' | 'score_below' | 'used_hint' | 'time_elapsed' | 'vocabulary_known' | 'attempts';
  value: number | string | boolean;
}

/**
 * Criteria for completing a scene
 */
export interface CompletionCriteria {
  minimumScore: number;        // 0-100
  requiredObjectives: string[]; // Learning objective IDs
  maxAttempts?: number;
  maxDuration?: number;        // seconds
}

/**
 * Learner's immersion session
 */
export interface ImmersionSession {
  id: string;
  tenantId: string;
  learnerId: string;
  
  // What they're doing
  scenarioId: string;
  currentSceneId: string;
  currentNodeId: string;
  
  // Technical
  activeTier: ImmersionTier;
  deviceInfo: DeviceCapabilities;
  
  // Progress
  startedAt: Date;
  lastActivityAt: Date;
  completedScenes: string[];
  
  // Performance
  currentScore: number;
  hintsUsed: number;
  errorsCount: number;
  
  // Conversation history (for AI context)
  conversationHistory: ConversationTurn[];
  
  // State
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  
  // Pronunciation tracking
  pronunciationAttempts: PronunciationAttempt[];
  
  // Vocabulary encountered
  vocabularyExposed: string[]; // Vocabulary IDs
  vocabularyMastered: string[];
}

/**
 * Single turn in conversation
 */
export interface ConversationTurn {
  timestamp: Date;
  speaker: 'learner' | 'character';
  characterId?: string;
  
  // Content
  text: string;
  audioUrl?: string;
  
  // For learner turns
  transcribedText?: string;
  intendedText?: string;
  pronunciationScore?: number;
  grammarCorrect?: boolean;
  
  // AI analysis
  sentiment?: string;
  intent?: string;
}

/**
 * Pronunciation attempt for analysis
 */
export interface PronunciationAttempt {
  id: string;
  timestamp: Date;
  
  // What was attempted
  targetText: string;
  targetPhonemes: string;
  
  // What was detected
  audioUrl: string;
  transcribedText: string;
  detectedPhonemes: string;
  
  // Scoring
  overallScore: number;        // 0-100
  phonemeScores: { phoneme: string; score: number; feedback: string }[];
  fluencyScore: number;
  prosodyScore: number;        // Intonation, stress
  
  // Feedback
  feedback: string;
  suggestedPractice?: string;
}

/**
 * Completed scenario result
 */
export interface ImmersionResult {
  id: string;
  sessionId: string;
  learnerId: string;
  scenarioId: string;
  
  // Completion
  completedAt: Date;
  totalDuration: number;       // seconds
  tier: ImmersionTier;
  
  // Scores
  overallScore: number;
  objectiveScores: { objectiveId: string; score: number; feedback: string }[];
  
  // Skill breakdown
  vocabularyScore: number;
  grammarScore: number;
  pronunciationScore: number;
  listeningScore: number;
  culturalScore: number;
  fluencyScore: number;
  
  // Progress
  vocabularyLearned: VocabularyItem[];
  grammarPracticed: string[];
  
  // Performance metrics
  hintsUsed: number;
  errorsCount: number;
  selfCorrections: number;
  
  // Recommendations
  recommendedNextScenarios: string[];
  practiceAreas: string[];
  
  // Credential (if earned)
  credentialIssued?: boolean;
  credentialId?: string;
}

/**
 * Speech recognition configuration
 */
export interface SpeechConfig {
  language: ImmersionLanguage;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  
  // Pronunciation assessment
  pronunciationAssessment: {
    enabled: boolean;
    granularity: 'phoneme' | 'word' | 'sentence';
    scoringSystem: 'percentage' | 'cefr';
  };
  
  // Noise handling
  noiseSuppressionEnabled: boolean;
  silenceThresholdMs: number;
  
  // Custom vocabulary
  customVocabulary?: string[];
  grammarHints?: string[];
}

/**
 * Text-to-Speech configuration
 */
export interface TTSConfig {
  language: ImmersionLanguage;
  voiceId: string;
  
  // Voice characteristics
  pitch: number;      // 0.5 - 2.0
  rate: number;       // 0.5 - 2.0
  volume: number;     // 0.0 - 1.0
  
  // SSML support
  ssmlEnabled: boolean;
  
  // Caching
  cacheEnabled: boolean;
  cacheExpiryHours: number;
}

/**
 * Peer language exchange session
 */
export interface LanguageExchangeSession {
  id: string;
  tenantId: string;
  
  // Participants
  participants: ExchangeParticipant[];
  
  // Languages
  language1: ImmersionLanguage;
  language2: ImmersionLanguage;
  
  // Session structure
  structure: ExchangeStructure;
  
  // Environment
  environmentId?: string;      // Optional shared scenario
  tier: ImmersionTier;
  
  // Scheduling
  scheduledAt: Date;
  duration: number;            // minutes
  
  // Status
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startedAt?: Date;
  endedAt?: Date;
  
  // Recording
  isRecorded: boolean;
  recordingUrl?: string;
  
  // Feedback
  aiModeratorEnabled: boolean;
  feedbackGenerated?: ExchangeFeedback;
}

/**
 * Participant in language exchange
 */
export interface ExchangeParticipant {
  userId: string;
  nativeLanguage: ImmersionLanguage;
  learningLanguage: ImmersionLanguage;
  cefrLevel: CEFRLevel;
  
  // Connection
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  
  // In-session metrics
  speakingTime: number;        // seconds
  corrections Received: number;
  correctionsGiven: number;
}

/**
 * Structure for language exchange session
 */
export interface ExchangeStructure {
  totalDuration: number;
  
  phases: {
    name: string;
    language: ImmersionLanguage;
    duration: number;
    activity: 'free_conversation' | 'topic_discussion' | 'scenario_roleplay' | 'vocabulary_practice';
    topic?: string;
    scenarioId?: string;
  }[];
  
  // Turn-taking
  turnTakingEnforced: boolean;
  suggestedTurnDuration?: number;
}

/**
 * AI-generated feedback for language exchange
 */
export interface ExchangeFeedback {
  sessionId: string;
  generatedAt: Date;
  
  // Per-participant
  participantFeedback: {
    userId: string;
    
    // Speaking
    speakingTimePercent: number;
    fluencyScore: number;
    vocabularyRange: 'limited' | 'adequate' | 'good' | 'excellent';
    
    // Interaction
    engagementScore: number;
    helpfulnessScore: number;
    
    // Language-specific
    commonErrors: { error: string; correction: string; count: number }[];
    strongPoints: string[];
    areasToImprove: string[];
    
    // Recommendations
    suggestedVocabulary: string[];
    suggestedScenarios: string[];
  }[];
  
  // Session-level
  overallDynamics: string;
  conversationHighlights: string[];
  suggestedTopicsForNext: string[];
}

// ============================================================================
// WEBXR SPECIFIC TYPES
// ============================================================================

/**
 * WebXR session configuration
 */
export interface WebXRConfig {
  sessionMode: XRSessionMode;
  
  // Required features
  requiredFeatures: XRFeature[];
  optionalFeatures: XRFeature[];
  
  // Reference space
  referenceSpaceType: 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
  
  // Rendering
  framebufferScaleFactor: number;
  antialias: boolean;
  
  // Input
  inputSources: ('controller' | 'hand' | 'gaze' | 'screen')[];
  
  // AR specific
  arConfig?: {
    domOverlay: boolean;
    lightEstimation: boolean;
    depthSensing: boolean;
    hitTest: boolean;
    anchors: boolean;
    planeDetection: boolean;
  };
}

/**
 * WebXR features
 */
export type XRFeature = 
  | 'local'
  | 'local-floor'
  | 'bounded-floor'
  | 'unbounded'
  | 'hand-tracking'
  | 'hit-test'
  | 'dom-overlay'
  | 'light-estimation'
  | 'depth-sensing'
  | 'anchors'
  | 'plane-detection'
  | 'mesh-detection';

/**
 * Hand tracking data
 */
export interface HandTrackingData {
  hand: 'left' | 'right';
  joints: Record<XRHandJoint, JointPose>;
  pinchStrength: number;
  gripStrength: number;
  gesture?: RecognizedGesture;
}

/**
 * XR Hand joints
 */
export type XRHandJoint = 
  | 'wrist'
  | 'thumb-metacarpal' | 'thumb-phalanx-proximal' | 'thumb-phalanx-distal' | 'thumb-tip'
  | 'index-finger-metacarpal' | 'index-finger-phalanx-proximal' | 'index-finger-phalanx-intermediate' | 'index-finger-phalanx-distal' | 'index-finger-tip'
  | 'middle-finger-metacarpal' | 'middle-finger-phalanx-proximal' | 'middle-finger-phalanx-intermediate' | 'middle-finger-phalanx-distal' | 'middle-finger-tip'
  | 'ring-finger-metacarpal' | 'ring-finger-phalanx-proximal' | 'ring-finger-phalanx-intermediate' | 'ring-finger-phalanx-distal' | 'ring-finger-tip'
  | 'pinky-finger-metacarpal' | 'pinky-finger-phalanx-proximal' | 'pinky-finger-phalanx-intermediate' | 'pinky-finger-phalanx-distal' | 'pinky-finger-tip';

/**
 * Joint position and rotation
 */
export interface JointPose {
  position: Vector3;
  rotation: Rotation;
  radius: number;
}

/**
 * Recognized hand gestures
 */
export type RecognizedGesture = 
  | 'point'
  | 'pinch'
  | 'grab'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'wave'
  | 'open_palm'
  | 'fist';

/**
 * AR anchor for placing virtual content
 */
export interface ARAnchor {
  id: string;
  type: 'plane' | 'image' | 'face' | 'mesh';
  
  // Transform
  position: Vector3;
  rotation: Rotation;
  
  // Plane-specific
  planeOrientation?: 'horizontal' | 'vertical';
  planeExtent?: { width: number; height: number };
  
  // Image-specific
  imageTargetId?: string;
  trackingState: 'tracking' | 'paused' | 'stopped';
  
  // Attached content
  attachedObjects: string[];
  
  createdAt: Date;
  lastUpdatedAt: Date;
}

// ============================================================================
// DEVELOPER MARKETPLACE / APP STORE TYPES
// ============================================================================

/**
 * Developer/Partner account for building on Scholarly
 */
export interface DeveloperAccount {
  id: string;
  tenantId: string;
  
  // Identity
  userId: string;
  walletAddress: EthAddress;
  
  // Profile
  name: string;
  displayName: string;
  description: string;
  logoUrl?: string;
  websiteUrl?: string;
  supportEmail: string;
  
  // Type
  accountType: DeveloperAccountType;
  
  // Verification
  verificationStatus: DeveloperVerificationStatus;
  verifiedAt?: Date;
  verificationDocuments?: string[];
  
  // Agreements
  developerAgreementSignedAt: Date;
  revenueSharePercent: number; // Developer's share (e.g., 70%)
  
  // Banking/Payout
  payoutMethod?: PayoutMethod;
  
  // Stats
  totalApps: number;
  totalDownloads: number;
  totalRevenue: TokenAmount;
  averageRating: number;
  
  // Status
  status: 'active' | 'suspended' | 'pending_review';
  suspensionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Developer account types
 */
export enum DeveloperAccountType {
  INDIVIDUAL = 'INDIVIDUAL',           // Solo developer
  COMPANY = 'COMPANY',                 // Registered business
  EDUCATIONAL_INSTITUTION = 'EDUCATIONAL_INSTITUTION', // School/university
  NON_PROFIT = 'NON_PROFIT',          // Non-profit organization
  STRATEGIC_PARTNER = 'STRATEGIC_PARTNER' // Formal partnership
}

/**
 * Verification status for developers
 */
export enum DeveloperVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

/**
 * Payout method for developers
 */
export interface PayoutMethod {
  type: 'crypto_wallet' | 'bank_transfer' | 'paypal';
  
  // For crypto
  walletAddress?: EthAddress;
  preferredToken?: string;
  
  // For bank
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    bankName: string;
    country: string;
  };
  
  // For PayPal
  paypalEmail?: string;
  
  isVerified: boolean;
  verifiedAt?: Date;
}

/**
 * Marketplace App/Experience
 */
export interface MarketplaceApp {
  id: string;
  tenantId: string;
  
  // Developer
  developerId: string;
  developerName: string;
  
  // Basic Info
  name: string;
  slug: string; // URL-friendly identifier
  tagline: string;
  description: string;
  
  // Categorization
  category: AppCategory;
  subcategories: string[];
  tags: string[];
  
  // Target Audience
  targetAudience: AppTargetAudience;
  ageRange?: { min: number; max: number };
  cefrLevels?: CEFRLevel[];
  subjectAreas?: string[];
  
  // Media
  iconUrl: string;
  screenshotUrls: string[];
  videoUrl?: string;
  bannerUrl?: string;
  
  // Technical
  appType: AppType;
  platformSupport: PlatformSupport;
  integrationPoints: IntegrationPoint[];
  permissions: AppPermission[];
  
  // Version
  currentVersion: string;
  versionHistory: AppVersion[];
  
  // Pricing
  pricingModel: AppPricingModel;
  price?: TokenAmount;
  subscriptionPlans?: SubscriptionPlan[];
  
  // Trial
  hasTrial: boolean;
  trialDays?: number;
  
  // Review Status
  reviewStatus: AppReviewStatus;
  reviewNotes?: string;
  lastReviewedAt?: Date;
  reviewedBy?: string;
  
  // Stats
  totalInstalls: number;
  activeInstalls: number;
  totalRevenue: TokenAmount;
  rating: number;
  reviewCount: number;
  
  // Flags
  isFeatured: boolean;
  isEditorChoice: boolean;
  isVerified: boolean;
  
  // Status
  status: 'draft' | 'pending_review' | 'published' | 'suspended' | 'deprecated';
  
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * App categories
 */
export enum AppCategory {
  // Learning Tools
  LANGUAGE_LEARNING = 'LANGUAGE_LEARNING',
  MATH_SCIENCE = 'MATH_SCIENCE',
  LITERACY_READING = 'LITERACY_READING',
  ARTS_CREATIVITY = 'ARTS_CREATIVITY',
  STEM = 'STEM',
  SOCIAL_STUDIES = 'SOCIAL_STUDIES',
  TEST_PREP = 'TEST_PREP',
  
  // Immersive Experiences
  VR_EXPERIENCES = 'VR_EXPERIENCES',
  AR_EXPERIENCES = 'AR_EXPERIENCES',
  SIMULATIONS = 'SIMULATIONS',
  VIRTUAL_FIELD_TRIPS = 'VIRTUAL_FIELD_TRIPS',
  
  // Educator Tools
  CLASSROOM_MANAGEMENT = 'CLASSROOM_MANAGEMENT',
  ASSESSMENT_TOOLS = 'ASSESSMENT_TOOLS',
  LESSON_PLANNING = 'LESSON_PLANNING',
  PARENT_COMMUNICATION = 'PARENT_COMMUNICATION',
  
  // Administrative
  SCHEDULING = 'SCHEDULING',
  REPORTING_ANALYTICS = 'REPORTING_ANALYTICS',
  COMPLIANCE = 'COMPLIANCE',
  
  // Community
  PEER_LEARNING = 'PEER_LEARNING',
  TUTORING = 'TUTORING',
  STUDY_GROUPS = 'STUDY_GROUPS',
  
  // Accessibility
  ACCESSIBILITY_TOOLS = 'ACCESSIBILITY_TOOLS',
  TRANSLATION = 'TRANSLATION',
  
  // Other
  UTILITIES = 'UTILITIES',
  INTEGRATIONS = 'INTEGRATIONS',
  OTHER = 'OTHER'
}

/**
 * Target audience for apps
 */
export interface AppTargetAudience {
  roles: ('learner' | 'educator' | 'parent' | 'administrator' | 'tutor')[];
  educationLevels: ('early_years' | 'primary' | 'secondary' | 'higher_ed' | 'professional' | 'lifelong')[];
  contexts: ('homeschool' | 'traditional_school' | 'micro_school' | 'tutoring' | 'self_directed')[];
}

/**
 * App types
 */
export enum AppType {
  WEB_APP = 'WEB_APP',                 // Embedded iframe/web component
  NATIVE_INTEGRATION = 'NATIVE_INTEGRATION', // Deep platform integration
  LTI_TOOL = 'LTI_TOOL',              // LTI-compatible tool
  API_SERVICE = 'API_SERVICE',         // Backend service/API
  CONTENT_PACK = 'CONTENT_PACK',       // Curriculum/content package
  IMMERSIVE_EXPERIENCE = 'IMMERSIVE_EXPERIENCE', // VR/AR/3D experience
  WIDGET = 'WIDGET',                   // Dashboard widget
  THEME = 'THEME',                     // UI customization
  BOT = 'BOT'                          // AI assistant/bot
}

/**
 * Platform support specification
 */
export interface PlatformSupport {
  web: boolean;
  ios: boolean;
  android: boolean;
  desktop: boolean;
  
  // Immersive
  webXR: boolean;
  quest: boolean;
  visionPro: boolean;
  
  // Minimum requirements
  minBrowserVersion?: string;
  minIOSVersion?: string;
  minAndroidVersion?: string;
  
  // Offline support
  offlineCapable: boolean;
}

/**
 * Integration points with Scholarly platform
 */
export interface IntegrationPoint {
  type: IntegrationPointType;
  description: string;
  required: boolean;
}

/**
 * Types of integration points
 */
export enum IntegrationPointType {
  // Data Access
  READ_LEARNER_PROFILE = 'READ_LEARNER_PROFILE',
  READ_PROGRESS_DATA = 'READ_PROGRESS_DATA',
  WRITE_PROGRESS_DATA = 'WRITE_PROGRESS_DATA',
  READ_CURRICULUM = 'READ_CURRICULUM',
  
  // Learning Path
  INJECT_CONTENT = 'INJECT_CONTENT',
  RECOMMEND_CONTENT = 'RECOMMEND_CONTENT',
  ASSESS_LEARNING = 'ASSESS_LEARNING',
  
  // Communication
  SEND_NOTIFICATIONS = 'SEND_NOTIFICATIONS',
  ACCESS_MESSAGING = 'ACCESS_MESSAGING',
  
  // Scheduling
  CREATE_EVENTS = 'CREATE_EVENTS',
  ACCESS_CALENDAR = 'ACCESS_CALENDAR',
  
  // Credentials
  ISSUE_CREDENTIALS = 'ISSUE_CREDENTIALS',
  VERIFY_CREDENTIALS = 'VERIFY_CREDENTIALS',
  
  // Payments
  PROCESS_PAYMENTS = 'PROCESS_PAYMENTS',
  ACCESS_TOKEN_BALANCE = 'ACCESS_TOKEN_BALANCE',
  
  // AI Services
  ACCESS_AI_BUDDY = 'ACCESS_AI_BUDDY',
  ACCESS_LIS_DATA = 'ACCESS_LIS_DATA',
  
  // Immersive
  LAUNCH_XR_SESSION = 'LAUNCH_XR_SESSION',
  ACCESS_AVATAR = 'ACCESS_AVATAR'
}

/**
 * App permissions
 */
export interface AppPermission {
  permission: string;
  reason: string;
  required: boolean;
}

/**
 * App version record
 */
export interface AppVersion {
  version: string;
  releaseNotes: string;
  releaseDate: Date;
  
  // Technical
  bundleUrl: string;
  bundleSize: number;
  checksum: string;
  
  // Compatibility
  minPlatformVersion: string;
  maxPlatformVersion?: string;
  
  // Review
  reviewStatus: AppReviewStatus;
  reviewedAt?: Date;
}

/**
 * App review status
 */
export enum AppReviewStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED'
}

/**
 * App pricing models
 */
export interface AppPricingModel {
  type: 'free' | 'paid' | 'freemium' | 'subscription' | 'pay_per_use';
  
  // For paid/freemium
  oneTimePrice?: TokenAmount;
  
  // For subscription
  subscriptionRequired?: boolean;
  
  // For pay-per-use
  usageUnit?: string; // "session", "query", "minute"
  pricePerUnit?: TokenAmount;
  
  // Free tier limits (for freemium)
  freeTierLimits?: {
    [key: string]: number; // e.g., { "sessionsPerMonth": 10 }
  };
}

/**
 * Subscription plan
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  
  // Pricing
  price: TokenAmount;
  billingPeriod: 'monthly' | 'quarterly' | 'annual';
  
  // Features
  features: string[];
  limits: { [key: string]: number };
  
  // Trial
  trialDays?: number;
  
  isPopular: boolean;
}

/**
 * App installation record
 */
export interface AppInstallation {
  id: string;
  tenantId: string;
  
  // What & Who
  appId: string;
  appVersion: string;
  installedBy: string;
  
  // Scope
  installScope: 'user' | 'classroom' | 'school' | 'district';
  scopeId: string; // User ID, classroom ID, etc.
  
  // Permissions granted
  grantedPermissions: string[];
  
  // Subscription (if applicable)
  subscriptionId?: string;
  subscriptionPlanId?: string;
  subscriptionStatus?: 'active' | 'trial' | 'expired' | 'cancelled';
  subscriptionExpiresAt?: Date;
  
  // Usage
  lastUsedAt?: Date;
  usageCount: number;
  
  // Status
  status: 'active' | 'disabled' | 'uninstalled';
  
  installedAt: Date;
  updatedAt: Date;
}

/**
 * App review/rating
 */
export interface AppReview {
  id: string;
  appId: string;
  
  // Reviewer
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'learner' | 'educator' | 'parent' | 'administrator';
  
  // Rating
  rating: 1 | 2 | 3 | 4 | 5;
  
  // Review content
  title: string;
  content: string;
  
  // Aspects
  aspectRatings?: {
    easeOfUse?: number;
    educational Value?: number;
    engagement?: number;
    support?: number;
    valueForMoney?: number;
  };
  
  // Helpful votes
  helpfulCount: number;
  notHelpfulCount: number;
  
  // Developer response
  developerResponse?: {
    content: string;
    respondedAt: Date;
  };
  
  // Moderation
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  hiddenReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COMMUNITY REQUEST / BOUNTY TYPES
// ============================================================================

/**
 * Community feature/experience request
 * 
 * Users can propose experiences they want built and pledge tokens
 * to fund development. Developers can then claim and build them.
 */
export interface CommunityRequest {
  id: string;
  tenantId: string;
  
  // Requester
  requesterId: string;
  requesterName: string;
  
  // Request details
  title: string;
  description: string;
  category: AppCategory;
  
  // Detailed requirements
  requirements: RequestRequirement[];
  targetAudience: AppTargetAudience;
  
  // Examples/inspiration
  inspirationLinks?: string[];
  mockupUrls?: string[];
  
  // Funding
  fundingGoal: TokenAmount;
  currentFunding: TokenAmount;
  pledges: FundingPledge[];
  
  // Bounty
  bountyStatus: BountyStatus;
  bountyAmount: TokenAmount; // Total available to developer
  platformContribution: TokenAmount; // Scholarly's contribution
  
  // Timeline
  desiredDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  
  // Claiming
  claimedBy?: string; // Developer ID
  claimedAt?: Date;
  
  // Deliverable
  deliveredAppId?: string;
  
  // Voting
  upvotes: number;
  downvotes: number;
  voterIds: string[];
  
  // Status
  status: RequestStatus;
  
  // Moderation
  isApproved: boolean;
  approvedBy?: string;
  rejectionReason?: string;
  
  createdAt: Date;
  updatedAt: Date;
  fundingDeadline?: Date;
}

/**
 * Requirement specification for a request
 */
export interface RequestRequirement {
  id: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
  category: 'functional' | 'technical' | 'design' | 'accessibility' | 'performance';
}

/**
 * Funding pledge for a community request
 */
export interface FundingPledge {
  id: string;
  requestId: string;
  
  // Pledger
  pledgerId: string;
  pledgerName: string;
  walletAddress: EthAddress;
  
  // Amount
  amount: TokenAmount;
  
  // Status
  status: 'pledged' | 'locked' | 'released' | 'refunded';
  
  // Transaction
  pledgeTxHash?: TxHash;
  releaseTxHash?: TxHash;
  refundTxHash?: TxHash;
  
  pledgedAt: Date;
  lockedAt?: Date;
  releasedAt?: Date;
}

/**
 * Bounty status
 */
export enum BountyStatus {
  FUNDING = 'FUNDING',           // Collecting pledges
  FUNDED = 'FUNDED',             // Reached goal, awaiting claims
  CLAIMED = 'CLAIMED',           // Developer working on it
  IN_REVIEW = 'IN_REVIEW',       // Deliverable submitted
  COMPLETED = 'COMPLETED',       // Approved and paid
  EXPIRED = 'EXPIRED',           // Funding deadline passed without success
  CANCELLED = 'CANCELLED',       // Request cancelled
  DISPUTED = 'DISPUTED'          // Issue with deliverable
}

/**
 * Request status
 */
export enum RequestStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  FUNDING = 'FUNDING',
  FUNDED = 'FUNDED',
  IN_DEVELOPMENT = 'IN_DEVELOPMENT',
  DELIVERED = 'DELIVERED',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

/**
 * Bounty claim by a developer
 */
export interface BountyClaim {
  id: string;
  requestId: string;
  
  // Developer
  developerId: string;
  developerName: string;
  
  // Proposal
  proposal: string;
  estimatedDeliveryDate: Date;
  proposedMilestones: ClaimMilestone[];
  
  // Portfolio/credentials
  relevantExperience: string;
  portfolioLinks: string[];
  
  // Status
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  
  // If accepted
  acceptedAt?: Date;
  contractTerms?: string;
  
  // Community vote
  communityVotes: {
    for: number;
    against: number;
    voterIds: string[];
  };
  
  submittedAt: Date;
  updatedAt: Date;
}

/**
 * Milestone for bounty claim
 */
export interface ClaimMilestone {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  dueDate: Date;
  paymentPercent: number; // % of bounty released on completion
  
  // Status
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: Date;
  approvedAt?: Date;
  feedback?: string;
}

/**
 * Bounty dispute
 */
export interface BountyDispute {
  id: string;
  requestId: string;
  claimId: string;
  
  // Parties
  raisedBy: 'requester' | 'developer' | 'platform';
  raisedById: string;
  
  // Dispute details
  reason: DisputeReason;
  description: string;
  evidence: string[];
  
  // Resolution
  status: 'open' | 'under_review' | 'resolved' | 'escalated';
  resolution?: {
    outcome: 'favor_requester' | 'favor_developer' | 'split' | 'cancelled';
    explanation: string;
    refundAmount?: TokenAmount;
    payoutAmount?: TokenAmount;
    resolvedBy: string;
    resolvedAt: Date;
  };
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Dispute reasons
 */
export enum DisputeReason {
  INCOMPLETE_DELIVERY = 'INCOMPLETE_DELIVERY',
  QUALITY_ISSUES = 'QUALITY_ISSUES',
  MISSED_DEADLINE = 'MISSED_DEADLINE',
  SCOPE_DISAGREEMENT = 'SCOPE_DISAGREEMENT',
  COMMUNICATION_ISSUES = 'COMMUNICATION_ISSUES',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  OTHER = 'OTHER'
}

/**
 * Developer payout record
 */
export interface DeveloperPayout {
  id: string;
  developerId: string;
  
  // Source
  sourceType: 'app_sale' | 'subscription' | 'bounty' | 'tip';
  sourceId: string; // App ID, subscription ID, or bounty ID
  
  // Amounts
  grossAmount: TokenAmount;
  platformFee: TokenAmount;
  netAmount: TokenAmount;
  
  // Payout
  payoutMethod: PayoutMethod;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: TxHash;
  
  // Timing
  earnedAt: Date;
  payoutRequestedAt?: Date;
  paidAt?: Date;
  
  // Notes
  notes?: string;
}

/**
 * Featured section on marketplace
 */
export interface FeaturedSection {
  id: string;
  tenantId: string;
  
  // Display
  title: string;
  subtitle?: string;
  position: number;
  
  // Content
  type: 'apps' | 'requests' | 'developers' | 'collections';
  items: string[]; // IDs of featured items
  
  // Visibility
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  
  // Targeting
  targetAudience?: AppTargetAudience;
  
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Curated collection of apps
 */
export interface AppCollection {
  id: string;
  tenantId: string;
  
  // Basic info
  name: string;
  description: string;
  iconUrl?: string;
  bannerUrl?: string;
  
  // Apps
  appIds: string[];
  
  // Curator
  curatedBy: 'platform' | 'community' | 'developer';
  curatorId?: string;
  curatorName?: string;
  
  // Status
  isPublished: boolean;
  isFeatured: boolean;
  
  // Stats
  viewCount: number;
  saveCount: number;
  
  createdAt: Date;
  updatedAt: Date;
}