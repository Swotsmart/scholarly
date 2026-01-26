/**
 * Scholarly Phase 4: Governance & Immersion
 * Type Definitions
 *
 * This module defines all types for the final phase of Scholarly development:
 * - DAO Governance Framework (Decentralized Autonomous Organization)
 * - EDU-Nexus Token Economy (Utility Token, Staking, NFTs)
 * - Virtual Language Immersion (2D Scenarios, WebXR VR)
 * - Developer Marketplace / App Store
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
  ECOSYSTEM_FUND = 'ECOSYSTEM_FUND',
  TEAM = 'TEAM',
  ADVISORS = 'ADVISORS',
  STRATEGIC_SALE = 'STRATEGIC_SALE',
  PUBLIC_SALE = 'PUBLIC_SALE',
  LIQUIDITY = 'LIQUIDITY',
  FOUNDATION_TREASURY = 'FOUNDATION_TREASURY'
}

/**
 * Token allocation details with vesting schedules
 */
export interface AllocationSchedule {
  category: TokenAllocation;
  totalAmount: TokenAmount;
  vestingMonths: number;
  cliffMonths: number;
  tgeUnlockPercent: number;
  releasedAmount: TokenAmount;
  remainingAmount: TokenAmount;
  nextReleaseDate?: Date;
}

/**
 * EDU-Nexus Token configuration
 */
export interface TokenConfig {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: TokenAmount;
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
  available: TokenAmount;
  staked: TokenAmount;
  locked: TokenAmount;
  pendingRewards: TokenAmount;
  stakingPositions: StakingPosition[];
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
  stakedAt: Date;
  lockUntil?: Date;
  earnedRewards: TokenAmount;
  apr: number;
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
  purpose: StakingPurpose;
  minimumStake: TokenAmount;
  lockPeriodDays: number;
  apr: number;
  maxCapacity?: TokenAmount;
  totalStaked: TokenAmount;
  participantCount: number;
  isActive: boolean;
  contractAddress: EthAddress;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Purposes for staking tokens
 */
export enum StakingPurpose {
  GOVERNANCE = 'GOVERNANCE',
  CONTENT_VALIDATOR = 'CONTENT_VALIDATOR',
  TUTOR_VERIFICATION = 'TUTOR_VERIFICATION',
  PREMIUM_ACCESS = 'PREMIUM_ACCESS',
  LIQUIDITY_PROVISION = 'LIQUIDITY_PROVISION'
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
  type: RewardType;
  amount: TokenAmount;
  reason: string;
  sourceType: 'smart_contract' | 'admin' | 'ecosystem_fund';
  sourceReference?: string;
  status: 'pending' | 'claimed' | 'expired';
  txHash?: TxHash;
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
  from: EthAddress;
  to: EthAddress;
  amount: TokenAmount;
  type: 'transfer' | 'stake' | 'unstake' | 'reward' | 'delegate' | 'burn';
  status: 'pending' | 'confirmed' | 'failed';
  confirmations: number;
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
  creator: EthAddress;
  currentOwner: EthAddress;
  contentType: NFTContentType;
  contentId: string;
  metadataUri: IPFSCID;
  creatorRoyalty: number;
  coPublisherRoyalty: number;
  platformFee: number;
  coPublishers: CoPublisher[];
  validationStatus: NFTValidationStatus;
  validatorScores: ValidatorScore[];
  isListed: boolean;
  listPrice?: TokenAmount;
  totalSales: number;
  totalRevenue: TokenAmount;
  mintedAt: Date;
  lastTransferAt?: Date;
}

export enum NFTContentType {
  CURRICULUM_MODULE = 'CURRICULUM_MODULE',
  VIDEO_LESSON = 'VIDEO_LESSON',
  INTERACTIVE_SIMULATION = 'INTERACTIVE_SIMULATION',
  ASSESSMENT_PACK = 'ASSESSMENT_PACK',
  PROJECT_TEMPLATE = 'PROJECT_TEMPLATE',
  RESOURCE_BUNDLE = 'RESOURCE_BUNDLE'
}

export enum NFTValidationStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  FLAGGED = 'FLAGGED'
}

export interface CoPublisher {
  address: EthAddress;
  userId?: string;
  name: string;
  shareBasisPoints: number;
  role: 'marketer' | 'translator' | 'curator' | 'contributor';
}

export interface ValidatorScore {
  validatorAddress: EthAddress;
  validatorId?: string;
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

export interface ContentValidator {
  id: string;
  userId: string;
  walletAddress: EthAddress;
  expertiseAreas: string[];
  credentials: string[];
  stakedAmount: TokenAmount;
  stakingPoolId: string;
  totalReviews: number;
  approvalAccuracy: number;
  averageReviewTime: number;
  totalEarned: TokenAmount;
  totalSlashed: TokenAmount;
  status: 'active' | 'suspended' | 'inactive';
  suspensionReason?: string;
  registeredAt: Date;
  lastReviewAt?: Date;
}

export interface NFTPurchase {
  id: string;
  nftTokenId: bigint;
  buyerAddress: EthAddress;
  buyerId?: string;
  sellerAddress: EthAddress;
  price: TokenAmount;
  txHash: TxHash;
  creatorShare: TokenAmount;
  coPublisherShare: TokenAmount;
  platformShare: TokenAmount;
  validatorShare: TokenAmount;
  licenseType: 'perpetual' | 'subscription' | 'single_use';
  licenseExpiry?: Date;
  purchasedAt: Date;
}

// ============================================================================
// DAO GOVERNANCE TYPES
// ============================================================================

export interface DAOConfig {
  name: string;
  governorAddress: EthAddress;
  timelockAddress: EthAddress;
  treasuryAddress: EthAddress;
  votingDelay: number;
  votingPeriod: number;
  proposalThreshold: TokenAmount;
  quorumPercent: number;
  timelockDelay: number;
  governanceTokenAddress: EthAddress;
}

export interface GovernanceProposal {
  id: string;
  proposalId: bigint;
  proposer: EthAddress;
  proposerId?: string;
  title: string;
  description: string;
  discussionUrl?: string;
  category: ProposalCategory;
  actions: ProposalAction[];
  state: ProposalState;
  forVotes: TokenAmount;
  againstVotes: TokenAmount;
  abstainVotes: TokenAmount;
  startBlock: BlockNumber;
  endBlock: BlockNumber;
  eta?: UnixTimestamp;
  executedAt?: Date;
  executionTxHash?: TxHash;
  createdAt: Date;
  updatedAt: Date;
}

export enum ProposalCategory {
  ECOSYSTEM_GRANT = 'ECOSYSTEM_GRANT',
  FEE_ADJUSTMENT = 'FEE_ADJUSTMENT',
  PARAMETER_CHANGE = 'PARAMETER_CHANGE',
  FEATURED_CONTENT = 'FEATURED_CONTENT',
  PROTOCOL_UPGRADE = 'PROTOCOL_UPGRADE',
  PARTNERSHIP = 'PARTNERSHIP',
  TREASURY_MANAGEMENT = 'TREASURY_MANAGEMENT',
  COMMUNITY = 'COMMUNITY'
}

export enum ProposalState {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  CANCELED = 'CANCELED',
  DEFEATED = 'DEFEATED',
  SUCCEEDED = 'SUCCEEDED',
  QUEUED = 'QUEUED',
  EXPIRED = 'EXPIRED',
  EXECUTED = 'EXECUTED'
}

export interface ProposalAction {
  target: EthAddress;
  value: Wei;
  signature: string;
  calldata: string;
  description: string;
}

export interface Vote {
  id: string;
  proposalId: string;
  voter: EthAddress;
  voterId?: string;
  support: 'for' | 'against' | 'abstain';
  weight: TokenAmount;
  reason?: string;
  txHash: TxHash;
  blockNumber: BlockNumber;
  votedAt: Date;
}

export interface VoteDelegation {
  id: string;
  delegator: EthAddress;
  delegatorId?: string;
  delegate: EthAddress;
  delegateId?: string;
  amount: TokenAmount;
  isActive: boolean;
  txHash: TxHash;
  delegatedAt: Date;
  revokedAt?: Date;
}

export interface DelegateProfile {
  address: EthAddress;
  userId?: string;
  name: string;
  bio: string;
  avatar?: string;
  focusAreas: ProposalCategory[];
  totalVotes: number;
  participationRate: number;
  totalDelegatedPower: TokenAmount;
  delegatorCount: number;
  votingHistory: {
    proposalId: string;
    vote: 'for' | 'against' | 'abstain';
    weight: TokenAmount;
    outcome: 'passed' | 'failed';
  }[];
  registeredAt: Date;
  lastActiveAt: Date;
}

export interface TreasuryStatus {
  address: EthAddress;
  nexuBalance: TokenAmount;
  ethBalance: Wei;
  stablecoinBalances: {
    token: string;
    symbol: string;
    balance: TokenAmount;
  }[];
  allocations: {
    category: string;
    budgeted: TokenAmount;
    spent: TokenAmount;
    committed: TokenAmount;
  }[];
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

export enum ImmersionTier {
  TIER_2D = 'TIER_2D',
  TIER_3D = 'TIER_3D',
  TIER_AR = 'TIER_AR',
  TIER_VR = 'TIER_VR',
  TIER_MR = 'TIER_MR'
}

export interface DeviceCapabilities {
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasWebGPU: boolean;
  hasWebXR: boolean;
  xrSessionModes: XRSessionMode[];
  hasSpeechRecognition: boolean;
  hasSpeechSynthesis: boolean;
  supportedVoices: string[];
  hasGamepad: boolean;
  hasTouchscreen: boolean;
  hasGyroscope: boolean;
  estimatedPerformanceTier: 'low' | 'medium' | 'high' | 'ultra';
  gpuInfo?: string;
  recommendedTier: ImmersionTier;
  availableTiers: ImmersionTier[];
}

export type XRSessionMode =
  | 'inline'
  | 'immersive-vr'
  | 'immersive-ar';

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

export enum ImmersionCEFRLevel {
  A1 = 'A1',
  A2 = 'A2',
  B1 = 'B1',
  B2 = 'B2',
  C1 = 'C1',
  C2 = 'C2'
}

export interface ImmersionScenario {
  id: string;
  tenantId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  previewVideoUrl?: string;
  targetLanguage: ImmersionLanguage;
  nativeLanguage?: ImmersionLanguage;
  cefrLevel: ImmersionCEFRLevel;
  category: ScenarioCategory;
  setting: ScenarioSetting;
  culturalRegion: string;
  learningObjectives: LearningObjective[];
  vocabularyFocus: ImmersionVocabularyItem[];
  grammarFocus: string[];
  culturalNotes: CulturalNote[];
  supportedTiers: ImmersionTier[];
  assets: ScenarioAssets;
  characters: AICharacter[];
  scenes: Scene[];
  estimatedDuration: number;
  difficulty: 1 | 2 | 3 | 4 | 5;
  rating: number;
  completionCount: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export enum ScenarioCategory {
  DAILY_LIFE = 'DAILY_LIFE',
  TRAVEL = 'TRAVEL',
  WORK = 'WORK',
  SOCIAL = 'SOCIAL',
  EMERGENCY = 'EMERGENCY',
  CULTURE = 'CULTURE',
  EDUCATION = 'EDUCATION',
  FAMILY = 'FAMILY'
}

export interface ScenarioSetting {
  name: string;
  description: string;
  environmentType: 'indoor' | 'outdoor' | 'mixed';
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
  weather?: 'sunny' | 'cloudy' | 'rainy' | 'snowy';
  ambientSounds: string[];
  musicTrack?: string;
  environmentAssetId?: string;
  spawnPoint?: Vector3;
  boundaryRadius?: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
  w?: number;
}

export interface LearningObjective {
  id: string;
  description: string;
  type: 'vocabulary' | 'grammar' | 'pronunciation' | 'cultural' | 'listening' | 'conversation';
  targetPhrases?: string[];
  assessmentCriteria: string;
  weight: number;
}

export interface ImmersionVocabularyItem {
  id: string;
  word: string;
  translation: string;
  pronunciation: string;
  audioUrl: string;
  partOfSpeech: string;
  exampleSentence: string;
  exampleTranslation: string;
  exampleAudioUrl: string;
  formalityLevel: 'formal' | 'neutral' | 'informal' | 'slang';
  usageNotes?: string;
}

export interface CulturalNote {
  id: string;
  title: string;
  content: string;
  relevance: string;
  imageUrl?: string;
  videoUrl?: string;
}

export interface ScenarioAssets {
  tier2D: {
    backgrounds: { sceneId: string; imageUrl: string }[];
    characterSprites: { characterId: string; emotions: Record<string, string> }[];
    uiElements: string[];
  };
  tier3D: {
    environmentGLTF: string;
    characterModels: { characterId: string; modelUrl: string; animationsUrl: string }[];
    props: { id: string; modelUrl: string; position: Vector3 }[];
    lightingPreset: string;
    skyboxUrl?: string;
  };
  tierAR: {
    anchorType: 'plane' | 'image' | 'face' | 'geolocation';
    imageTargets?: { id: string; imageUrl: string; physicalWidth: number }[];
    characterScale: number;
    occlusionEnabled: boolean;
  };
  tierVR: {
    environmentGLTF: string;
    interactableObjects: InteractableObject[];
    teleportPoints: Vector3[];
    comfortSettings: VRComfortSettings;
  };
  audio: {
    ambient: string[];
    music?: string;
    sfx: Record<string, string>;
  };
}

export interface InteractableObject {
  id: string;
  name: string;
  modelUrl: string;
  position: Vector3;
  rotation: Rotation;
  scale: Vector3;
  interactionType: 'grab' | 'point' | 'touch' | 'gaze';
  highlightColor?: string;
  onInteract: InteractionTrigger[];
  isPhysicsEnabled: boolean;
  mass?: number;
}

export interface InteractionTrigger {
  type: 'dialogue' | 'animation' | 'sound' | 'teleport' | 'spawn' | 'vocabulary_popup';
  payload: Record<string, any>;
}

export interface VRComfortSettings {
  locomotionType: 'teleport' | 'smooth' | 'both';
  turnType: 'snap' | 'smooth';
  snapTurnAngle?: number;
  vignetteDuringMovement: boolean;
  seatedModeSupported: boolean;
  standingModeSupported: boolean;
  roomScaleSupported: boolean;
}

export interface AICharacter {
  id: string;
  name: string;
  role: string;
  personality: string;
  avatarUrl: string;
  model3DUrl?: string;
  voiceId: string;
  voiceStyle: 'formal' | 'casual' | 'friendly' | 'professional';
  speakingSpeed: number;
  defaultMood: CharacterMood;
  patience: number;
  helpfulness: number;
  nativeLanguage: ImmersionLanguage;
  dialectRegion?: string;
  formalityDefault: 'formal' | 'informal';
  conversationStyle: ConversationStyle;
  defaultPosition?: Vector3;
  defaultRotation?: Rotation;
}

export enum CharacterMood {
  HAPPY = 'HAPPY',
  NEUTRAL = 'NEUTRAL',
  CURIOUS = 'CURIOUS',
  IMPATIENT = 'IMPATIENT',
  HELPFUL = 'HELPFUL',
  CONFUSED = 'CONFUSED',
  IMPRESSED = 'IMPRESSED'
}

export interface ConversationStyle {
  usesFillerWords: boolean;
  asksClarifyingQuestions: boolean;
  offersAlternatives: boolean;
  errorCorrectionStyle: 'direct' | 'recast' | 'elicit' | 'ignore';
  encouragementFrequency: 'high' | 'medium' | 'low';
  adjustsToLearnerLevel: boolean;
  remembersContext: boolean;
}

export interface Scene {
  id: string;
  sequence: number;
  title: string;
  objective: string;
  settingOverride?: Partial<ScenarioSetting>;
  activeCharacters: string[];
  dialogueTree: DialogueNode[];
  completionCriteria: CompletionCriteria;
  nextSceneOnSuccess?: string;
  nextSceneOnFailure?: string;
  maxDuration?: number;
}

export interface DialogueNode {
  id: string;
  type: DialogueNodeType;
  speakerId?: string;
  text?: string;
  audioUrl?: string;
  ssmlOverride?: string;
  emotion?: CharacterMood;
  animation?: string;
  expectedResponses?: ExpectedResponse[];
  freeformAccepted?: boolean;
  hints: Hint[];
  nextNodeId?: string;
  conditionalNext?: ConditionalBranch[];
  assessmentWeight?: number;
}

export enum DialogueNodeType {
  NPC_SPEECH = 'NPC_SPEECH',
  LEARNER_CHOICE = 'LEARNER_CHOICE',
  LEARNER_SPEECH = 'LEARNER_SPEECH',
  LEARNER_ACTION = 'LEARNER_ACTION',
  NARRATION = 'NARRATION',
  INSTRUCTION = 'INSTRUCTION',
  VOCABULARY_POPUP = 'VOCABULARY_POPUP',
  BRANCH = 'BRANCH'
}

export interface ExpectedResponse {
  id: string;
  text: string;
  variations: string[];
  phonemes?: string;
  isCorrect: boolean;
  isPartiallyCorrect?: boolean;
  feedback: string;
  nextNodeId?: string;
}

export interface Hint {
  level: number;
  type: 'text' | 'audio' | 'translation' | 'vocabulary' | 'grammar';
  content: string;
  audioUrl?: string;
  penaltyPercent: number;
}

export interface ConditionalBranch {
  condition: BranchCondition;
  nextNodeId: string;
}

export interface BranchCondition {
  type: 'score_above' | 'score_below' | 'used_hint' | 'time_elapsed' | 'vocabulary_known' | 'attempts';
  value: number | string | boolean;
}

export interface CompletionCriteria {
  minimumScore: number;
  requiredObjectives: string[];
  maxAttempts?: number;
  maxDuration?: number;
}

export interface ImmersionSession {
  id: string;
  tenantId: string;
  learnerId: string;
  scenarioId: string;
  currentSceneId: string;
  currentNodeId: string;
  activeTier: ImmersionTier;
  deviceInfo: DeviceCapabilities;
  startedAt: Date;
  lastActivityAt: Date;
  completedScenes: string[];
  currentScore: number;
  hintsUsed: number;
  errorsCount: number;
  conversationHistory: ConversationTurn[];
  status: 'active' | 'paused' | 'completed' | 'abandoned';
  pronunciationAttempts: ImmersionPronunciationAttempt[];
  vocabularyExposed: string[];
  vocabularyMastered: string[];
}

export interface ConversationTurn {
  timestamp: Date;
  speaker: 'learner' | 'character';
  characterId?: string;
  text: string;
  audioUrl?: string;
  transcribedText?: string;
  intendedText?: string;
  pronunciationScore?: number;
  grammarCorrect?: boolean;
  sentiment?: string;
  intent?: string;
}

export interface ImmersionPronunciationAttempt {
  id: string;
  timestamp: Date;
  targetText: string;
  targetPhonemes: string;
  audioUrl: string;
  transcribedText: string;
  detectedPhonemes: string;
  overallScore: number;
  phonemeScores: { phoneme: string; score: number; feedback: string }[];
  fluencyScore: number;
  prosodyScore: number;
  feedback: string;
  suggestedPractice?: string;
}

export interface ImmersionResult {
  id: string;
  sessionId: string;
  learnerId: string;
  scenarioId: string;
  completedAt: Date;
  totalDuration: number;
  tier: ImmersionTier;
  overallScore: number;
  objectiveScores: { objectiveId: string; score: number; feedback: string }[];
  vocabularyScore: number;
  grammarScore: number;
  pronunciationScore: number;
  listeningScore: number;
  culturalScore: number;
  fluencyScore: number;
  vocabularyLearned: ImmersionVocabularyItem[];
  grammarPracticed: string[];
  hintsUsed: number;
  errorsCount: number;
  selfCorrections: number;
  recommendedNextScenarios: string[];
  practiceAreas: string[];
  credentialIssued?: boolean;
  credentialId?: string;
}

export interface SpeechConfig {
  language: ImmersionLanguage;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  pronunciationAssessment: {
    enabled: boolean;
    granularity: 'phoneme' | 'word' | 'sentence';
    scoringSystem: 'percentage' | 'cefr';
  };
  noiseSuppressionEnabled: boolean;
  silenceThresholdMs: number;
  customVocabulary?: string[];
  grammarHints?: string[];
}

export interface TTSConfig {
  language: ImmersionLanguage;
  voiceId: string;
  pitch: number;
  rate: number;
  volume: number;
  ssmlEnabled: boolean;
  cacheEnabled: boolean;
  cacheExpiryHours: number;
}

export interface LanguageExchangeSession {
  id: string;
  tenantId: string;
  participants: ExchangeParticipant[];
  language1: ImmersionLanguage;
  language2: ImmersionLanguage;
  structure: ExchangeStructure;
  environmentId?: string;
  tier: ImmersionTier;
  scheduledAt: Date;
  duration: number;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
  startedAt?: Date;
  endedAt?: Date;
  isRecorded: boolean;
  recordingUrl?: string;
  aiModeratorEnabled: boolean;
  feedbackGenerated?: ExchangeFeedback;
}

export interface ExchangeParticipant {
  userId: string;
  nativeLanguage: ImmersionLanguage;
  learningLanguage: ImmersionLanguage;
  cefrLevel: ImmersionCEFRLevel;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
  speakingTime: number;
  correctionsReceived: number;
  correctionsGiven: number;
}

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
  turnTakingEnforced: boolean;
  suggestedTurnDuration?: number;
}

export interface ExchangeFeedback {
  sessionId: string;
  generatedAt: Date;
  participantFeedback: {
    userId: string;
    speakingTimePercent: number;
    fluencyScore: number;
    vocabularyRange: 'limited' | 'adequate' | 'good' | 'excellent';
    engagementScore: number;
    helpfulnessScore: number;
    commonErrors: { error: string; correction: string; count: number }[];
    strongPoints: string[];
    areasToImprove: string[];
    suggestedVocabulary: string[];
    suggestedScenarios: string[];
  }[];
  overallDynamics: string;
  conversationHighlights: string[];
  suggestedTopicsForNext: string[];
}

// ============================================================================
// WEBXR SPECIFIC TYPES
// ============================================================================

export interface WebXRConfig {
  sessionMode: XRSessionMode;
  requiredFeatures: XRFeature[];
  optionalFeatures: XRFeature[];
  referenceSpaceType: 'local' | 'local-floor' | 'bounded-floor' | 'unbounded';
  framebufferScaleFactor: number;
  antialias: boolean;
  inputSources: ('controller' | 'hand' | 'gaze' | 'screen')[];
  arConfig?: {
    domOverlay: boolean;
    lightEstimation: boolean;
    depthSensing: boolean;
    hitTest: boolean;
    anchors: boolean;
    planeDetection: boolean;
  };
}

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

export interface HandTrackingData {
  hand: 'left' | 'right';
  joints: Record<XRHandJoint, JointPose>;
  pinchStrength: number;
  gripStrength: number;
  gesture?: RecognizedGesture;
}

export type XRHandJoint =
  | 'wrist'
  | 'thumb-metacarpal' | 'thumb-phalanx-proximal' | 'thumb-phalanx-distal' | 'thumb-tip'
  | 'index-finger-metacarpal' | 'index-finger-phalanx-proximal' | 'index-finger-phalanx-intermediate' | 'index-finger-phalanx-distal' | 'index-finger-tip'
  | 'middle-finger-metacarpal' | 'middle-finger-phalanx-proximal' | 'middle-finger-phalanx-intermediate' | 'middle-finger-phalanx-distal' | 'middle-finger-tip'
  | 'ring-finger-metacarpal' | 'ring-finger-phalanx-proximal' | 'ring-finger-phalanx-intermediate' | 'ring-finger-phalanx-distal' | 'ring-finger-tip'
  | 'pinky-finger-metacarpal' | 'pinky-finger-phalanx-proximal' | 'pinky-finger-phalanx-intermediate' | 'pinky-finger-phalanx-distal' | 'pinky-finger-tip';

export interface JointPose {
  position: Vector3;
  rotation: Rotation;
  radius: number;
}

export type RecognizedGesture =
  | 'point'
  | 'pinch'
  | 'grab'
  | 'thumbs_up'
  | 'thumbs_down'
  | 'wave'
  | 'open_palm'
  | 'fist';

export interface ARAnchor {
  id: string;
  type: 'plane' | 'image' | 'face' | 'mesh';
  position: Vector3;
  rotation: Rotation;
  planeOrientation?: 'horizontal' | 'vertical';
  planeExtent?: { width: number; height: number };
  imageTargetId?: string;
  trackingState: 'tracking' | 'paused' | 'stopped';
  attachedObjects: string[];
  createdAt: Date;
  lastUpdatedAt: Date;
}

// ============================================================================
// DEVELOPER MARKETPLACE / APP STORE TYPES
// ============================================================================

export interface DeveloperAccount {
  id: string;
  tenantId: string;
  userId: string;
  walletAddress: EthAddress;
  name: string;
  displayName: string;
  description: string;
  logoUrl?: string;
  websiteUrl?: string;
  supportEmail: string;
  accountType: DeveloperAccountType;
  verificationStatus: DeveloperVerificationStatus;
  verifiedAt?: Date;
  verificationDocuments?: string[];
  developerAgreementSignedAt: Date;
  revenueSharePercent: number;
  payoutMethod?: PayoutMethod;
  totalApps: number;
  totalDownloads: number;
  totalRevenue: TokenAmount;
  averageRating: number;
  status: 'active' | 'suspended' | 'pending_review';
  suspensionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum DeveloperAccountType {
  INDIVIDUAL = 'INDIVIDUAL',
  COMPANY = 'COMPANY',
  EDUCATIONAL_INSTITUTION = 'EDUCATIONAL_INSTITUTION',
  NON_PROFIT = 'NON_PROFIT',
  STRATEGIC_PARTNER = 'STRATEGIC_PARTNER'
}

export enum DeveloperVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED'
}

export interface PayoutMethod {
  type: 'crypto_wallet' | 'bank_transfer' | 'paypal';
  walletAddress?: EthAddress;
  preferredToken?: string;
  bankDetails?: {
    accountName: string;
    accountNumber: string;
    routingNumber?: string;
    swiftCode?: string;
    bankName: string;
    country: string;
  };
  paypalEmail?: string;
  isVerified: boolean;
  verifiedAt?: Date;
}

export interface MarketplaceApp {
  id: string;
  tenantId: string;
  developerId: string;
  developerName: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: AppCategory;
  subcategories: string[];
  tags: string[];
  targetAudience: AppTargetAudience;
  ageRange?: { min: number; max: number };
  cefrLevels?: ImmersionCEFRLevel[];
  subjectAreas?: string[];
  iconUrl: string;
  screenshotUrls: string[];
  videoUrl?: string;
  bannerUrl?: string;
  appType: AppType;
  platformSupport: PlatformSupport;
  integrationPoints: IntegrationPoint[];
  permissions: AppPermission[];
  currentVersion: string;
  versionHistory: AppVersion[];
  pricingModel: AppPricingModel;
  price?: TokenAmount;
  subscriptionPlans?: SubscriptionPlan[];
  hasTrial: boolean;
  trialDays?: number;
  reviewStatus: AppReviewStatus;
  reviewNotes?: string;
  lastReviewedAt?: Date;
  reviewedBy?: string;
  totalInstalls: number;
  activeInstalls: number;
  totalRevenue: TokenAmount;
  rating: number;
  reviewCount: number;
  isFeatured: boolean;
  isEditorChoice: boolean;
  isVerified: boolean;
  status: 'draft' | 'pending_review' | 'published' | 'suspended' | 'deprecated';
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export enum AppCategory {
  LANGUAGE_LEARNING = 'LANGUAGE_LEARNING',
  MATH_SCIENCE = 'MATH_SCIENCE',
  LITERACY_READING = 'LITERACY_READING',
  ARTS_CREATIVITY = 'ARTS_CREATIVITY',
  STEM = 'STEM',
  SOCIAL_STUDIES = 'SOCIAL_STUDIES',
  TEST_PREP = 'TEST_PREP',
  VR_EXPERIENCES = 'VR_EXPERIENCES',
  AR_EXPERIENCES = 'AR_EXPERIENCES',
  SIMULATIONS = 'SIMULATIONS',
  VIRTUAL_FIELD_TRIPS = 'VIRTUAL_FIELD_TRIPS',
  CLASSROOM_MANAGEMENT = 'CLASSROOM_MANAGEMENT',
  ASSESSMENT_TOOLS = 'ASSESSMENT_TOOLS',
  LESSON_PLANNING = 'LESSON_PLANNING',
  PARENT_COMMUNICATION = 'PARENT_COMMUNICATION',
  SCHEDULING = 'SCHEDULING',
  REPORTING_ANALYTICS = 'REPORTING_ANALYTICS',
  COMPLIANCE = 'COMPLIANCE',
  PEER_LEARNING = 'PEER_LEARNING',
  TUTORING = 'TUTORING',
  STUDY_GROUPS = 'STUDY_GROUPS',
  ACCESSIBILITY_TOOLS = 'ACCESSIBILITY_TOOLS',
  TRANSLATION = 'TRANSLATION',
  UTILITIES = 'UTILITIES',
  INTEGRATIONS = 'INTEGRATIONS',
  OTHER = 'OTHER'
}

export interface AppTargetAudience {
  roles: ('learner' | 'educator' | 'parent' | 'administrator' | 'tutor')[];
  educationLevels: ('early_years' | 'primary' | 'secondary' | 'higher_ed' | 'professional' | 'lifelong')[];
  contexts: ('homeschool' | 'traditional_school' | 'micro_school' | 'tutoring' | 'self_directed')[];
}

export enum AppType {
  WEB_APP = 'WEB_APP',
  NATIVE_INTEGRATION = 'NATIVE_INTEGRATION',
  LTI_TOOL = 'LTI_TOOL',
  API_SERVICE = 'API_SERVICE',
  CONTENT_PACK = 'CONTENT_PACK',
  IMMERSIVE_EXPERIENCE = 'IMMERSIVE_EXPERIENCE',
  WIDGET = 'WIDGET',
  THEME = 'THEME',
  BOT = 'BOT'
}

export interface PlatformSupport {
  web: boolean;
  ios: boolean;
  android: boolean;
  desktop: boolean;
  webXR: boolean;
  quest: boolean;
  visionPro: boolean;
  minBrowserVersion?: string;
  minIOSVersion?: string;
  minAndroidVersion?: string;
  offlineCapable: boolean;
}

export interface IntegrationPoint {
  type: IntegrationPointType;
  description: string;
  required: boolean;
}

export enum IntegrationPointType {
  READ_LEARNER_PROFILE = 'READ_LEARNER_PROFILE',
  READ_PROGRESS_DATA = 'READ_PROGRESS_DATA',
  WRITE_PROGRESS_DATA = 'WRITE_PROGRESS_DATA',
  READ_CURRICULUM = 'READ_CURRICULUM',
  INJECT_CONTENT = 'INJECT_CONTENT',
  RECOMMEND_CONTENT = 'RECOMMEND_CONTENT',
  ASSESS_LEARNING = 'ASSESS_LEARNING',
  SEND_NOTIFICATIONS = 'SEND_NOTIFICATIONS',
  ACCESS_MESSAGING = 'ACCESS_MESSAGING',
  CREATE_EVENTS = 'CREATE_EVENTS',
  ACCESS_CALENDAR = 'ACCESS_CALENDAR',
  ISSUE_CREDENTIALS = 'ISSUE_CREDENTIALS',
  VERIFY_CREDENTIALS = 'VERIFY_CREDENTIALS',
  PROCESS_PAYMENTS = 'PROCESS_PAYMENTS',
  ACCESS_TOKEN_BALANCE = 'ACCESS_TOKEN_BALANCE',
  ACCESS_AI_BUDDY = 'ACCESS_AI_BUDDY',
  ACCESS_LIS_DATA = 'ACCESS_LIS_DATA',
  LAUNCH_XR_SESSION = 'LAUNCH_XR_SESSION',
  ACCESS_AVATAR = 'ACCESS_AVATAR'
}

export interface AppPermission {
  permission: string;
  reason: string;
  required: boolean;
}

export interface AppVersion {
  version: string;
  releaseNotes: string;
  releaseDate: Date;
  bundleUrl: string;
  bundleSize: number;
  checksum: string;
  minPlatformVersion: string;
  maxPlatformVersion?: string;
  reviewStatus: AppReviewStatus;
  reviewedAt?: Date;
}

export enum AppReviewStatus {
  NOT_SUBMITTED = 'NOT_SUBMITTED',
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CHANGES_REQUESTED = 'CHANGES_REQUESTED'
}

export interface AppPricingModel {
  type: 'free' | 'paid' | 'freemium' | 'subscription' | 'pay_per_use';
  oneTimePrice?: TokenAmount;
  subscriptionRequired?: boolean;
  usageUnit?: string;
  pricePerUnit?: TokenAmount;
  freeTierLimits?: {
    [key: string]: number;
  };
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: TokenAmount;
  billingPeriod: 'monthly' | 'quarterly' | 'annual';
  features: string[];
  limits: { [key: string]: number };
  trialDays?: number;
  isPopular: boolean;
}

export interface AppInstallation {
  id: string;
  tenantId: string;
  appId: string;
  appVersion: string;
  installedBy: string;
  installScope: 'user' | 'classroom' | 'school' | 'district';
  scopeId: string;
  grantedPermissions: string[];
  subscriptionId?: string;
  subscriptionPlanId?: string;
  subscriptionStatus?: 'active' | 'trial' | 'expired' | 'cancelled';
  subscriptionExpiresAt?: Date;
  lastUsedAt?: Date;
  usageCount: number;
  status: 'active' | 'disabled' | 'uninstalled';
  installedAt: Date;
  updatedAt: Date;
}

export interface AppReview {
  id: string;
  appId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: 'learner' | 'educator' | 'parent' | 'administrator';
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  content: string;
  aspectRatings?: {
    easeOfUse?: number;
    educationalValue?: number;
    engagement?: number;
    support?: number;
    valueForMoney?: number;
  };
  helpfulCount: number;
  notHelpfulCount: number;
  developerResponse?: {
    content: string;
    respondedAt: Date;
  };
  isVerifiedPurchase: boolean;
  isHidden: boolean;
  hiddenReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COMMUNITY REQUEST / BOUNTY TYPES
// ============================================================================

export interface CommunityRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  requesterName: string;
  title: string;
  description: string;
  category: AppCategory;
  requirements: RequestRequirement[];
  targetAudience: AppTargetAudience;
  inspirationLinks?: string[];
  mockupUrls?: string[];
  fundingGoal: TokenAmount;
  currentFunding: TokenAmount;
  pledges: FundingPledge[];
  bountyStatus: BountyStatus;
  bountyAmount: TokenAmount;
  platformContribution: TokenAmount;
  desiredDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  claimedBy?: string;
  claimedAt?: Date;
  deliveredAppId?: string;
  upvotes: number;
  downvotes: number;
  voterIds: string[];
  status: RequestStatus;
  isApproved: boolean;
  approvedBy?: string;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
  fundingDeadline?: Date;
}

export interface RequestRequirement {
  id: string;
  description: string;
  priority: 'must_have' | 'should_have' | 'nice_to_have';
  category: 'functional' | 'technical' | 'design' | 'accessibility' | 'performance';
}

export interface FundingPledge {
  id: string;
  requestId: string;
  pledgerId: string;
  pledgerName: string;
  walletAddress: EthAddress;
  amount: TokenAmount;
  status: 'pledged' | 'locked' | 'released' | 'refunded';
  pledgeTxHash?: TxHash;
  releaseTxHash?: TxHash;
  refundTxHash?: TxHash;
  pledgedAt: Date;
  lockedAt?: Date;
  releasedAt?: Date;
}

export enum BountyStatus {
  FUNDING = 'FUNDING',
  FUNDED = 'FUNDED',
  CLAIMED = 'CLAIMED',
  IN_REVIEW = 'IN_REVIEW',
  COMPLETED = 'COMPLETED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  DISPUTED = 'DISPUTED'
}

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

export interface BountyClaim {
  id: string;
  requestId: string;
  developerId: string;
  developerName: string;
  proposal: string;
  estimatedDeliveryDate: Date;
  proposedMilestones: ClaimMilestone[];
  relevantExperience: string;
  portfolioLinks: string[];
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  acceptedAt?: Date;
  contractTerms?: string;
  communityVotes: {
    for: number;
    against: number;
    voterIds: string[];
  };
  submittedAt: Date;
  updatedAt: Date;
}

export interface ClaimMilestone {
  id: string;
  title: string;
  description: string;
  deliverables: string[];
  dueDate: Date;
  paymentPercent: number;
  status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'rejected';
  submittedAt?: Date;
  approvedAt?: Date;
  feedback?: string;
}

export interface BountyDispute {
  id: string;
  requestId: string;
  claimId: string;
  raisedBy: 'requester' | 'developer' | 'platform';
  raisedById: string;
  reason: DisputeReason;
  description: string;
  evidence: string[];
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

export enum DisputeReason {
  INCOMPLETE_DELIVERY = 'INCOMPLETE_DELIVERY',
  QUALITY_ISSUES = 'QUALITY_ISSUES',
  MISSED_DEADLINE = 'MISSED_DEADLINE',
  SCOPE_DISAGREEMENT = 'SCOPE_DISAGREEMENT',
  COMMUNICATION_ISSUES = 'COMMUNICATION_ISSUES',
  PAYMENT_DISPUTE = 'PAYMENT_DISPUTE',
  OTHER = 'OTHER'
}

export interface DeveloperPayout {
  id: string;
  developerId: string;
  sourceType: 'app_sale' | 'subscription' | 'bounty' | 'tip';
  sourceId: string;
  grossAmount: TokenAmount;
  platformFee: TokenAmount;
  netAmount: TokenAmount;
  payoutMethod: PayoutMethod;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  txHash?: TxHash;
  earnedAt: Date;
  payoutRequestedAt?: Date;
  paidAt?: Date;
  notes?: string;
}

export interface FeaturedSection {
  id: string;
  tenantId: string;
  title: string;
  subtitle?: string;
  position: number;
  type: 'apps' | 'requests' | 'developers' | 'collections';
  items: string[];
  isActive: boolean;
  startDate?: Date;
  endDate?: Date;
  targetAudience?: AppTargetAudience;
  createdAt: Date;
  updatedAt: Date;
}

export interface AppCollection {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  iconUrl?: string;
  bannerUrl?: string;
  appIds: string[];
  curatedBy: 'platform' | 'community' | 'developer';
  curatorId?: string;
  curatorName?: string;
  isPublished: boolean;
  isFeatured: boolean;
  viewCount: number;
  saveCount: number;
  createdAt: Date;
  updatedAt: Date;
}
