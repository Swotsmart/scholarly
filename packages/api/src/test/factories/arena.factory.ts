/**
 * Arena Test Factory
 *
 * Creates test data for Arena models with sensible defaults.
 * Australian education-themed defaults for competition content.
 */

import { faker } from '@faker-js/faker';

// ============================================================================
// Interfaces
// ============================================================================

export interface TestCompetition {
  id: string;
  tenantId: string;
  creatorId: string;
  format: string;
  title: string;
  description: string | null;
  totalRounds: number;
  currentRound: number;
  phonicsPhase: string | null;
  scheduledAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
  config: Record<string, unknown>;
  status: string;
  participantCount: number;
  wagerPool: number;
  wagerTokenType: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestParticipant {
  id: string;
  competitionId: string;
  userId: string;
  tenantId: string;
  type: string;
  status: string;
  totalScore: number;
  rank: number | null;
  roundScores: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTeam {
  id: string;
  tenantId: string;
  name: string;
  type: string;
  description: string | null;
  maxMembers: number;
  memberCount: number;
  createdBy: string;
  xp: number;
  treasurySparks: number;
  treasuryGems: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTeamMember {
  id: string;
  teamId: string;
  userId: string;
  tenantId: string;
  role: string;
  isActive: boolean;
  contributedSparks: number;
  contributedGems: number;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTokenBalance {
  id: string;
  userId: string;
  tenantId: string;
  sparks: number;
  gems: number;
  voice: number;
  stakedSparks: number;
  stakedGems: number;
  stakedVoice: number;
  lifetimeSparksEarned: number;
  lifetimeGemsEarned: number;
  lifetimeVoiceEarned: number;
  lastEarnedAt: Date | null;
  lastSpentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTokenTransaction {
  id: string;
  userId: string;
  tenantId: string;
  tokenType: string;
  transactionType: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  category: string;
  referenceId: string | null;
  referenceType: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

export interface TestBounty {
  id: string;
  tenantId: string;
  creatorId: string;
  category: string;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  reward: Record<string, unknown>;
  submissionDeadline: Date;
  judgingDeadline: Date | null;
  maxSubmissions: number;
  currentSubmissions: number;
  eligibleTiers: string[];
  tags: string[];
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestBountySubmission {
  id: string;
  bountyId: string;
  creatorId: string;
  tenantId: string;
  storyId: string | null;
  status: string;
  totalScore: number;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestProposal {
  id: string;
  tenantId: string;
  creatorId: string;
  type: string;
  title: string;
  description: string;
  specification: Record<string, unknown> | null;
  votingStrategy: string;
  status: string;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVoters: number;
  quorumRequired: number;
  votingStartsAt: Date;
  votingEndsAt: Date | null;
  executionAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestVote {
  id: string;
  proposalId: string;
  voterId: string;
  tenantId: string;
  choice: string;
  weight: number;
  voiceSpent: number;
  reason: string | null;
  createdAt: Date;
}

export interface TestDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  tenantId: string;
  proposalTypes: string[];
  voiceAmount: number;
  isActive: boolean;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestCreatorProfile {
  id: string;
  userId: string;
  tenantId: string;
  displayName: string;
  bio: string | null;
  specialisations: string[];
  tier: string;
  onboardingPhase: string;
  totalPublished: number;
  totalDrafts: number;
  avgEngagement: number;
  isVerifiedEducator: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestStakePosition {
  id: string;
  userId: string;
  tenantId: string;
  poolType: string;
  poolId: string | null;
  tokenType: string;
  amount: number;
  yieldAccrued: number;
  lockedUntil: Date;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTreasuryVote {
  id: string;
  teamId: string;
  tenantId: string;
  proposerId: string;
  description: string;
  tokenType: string;
  amount: number;
  purpose: string;
  status: string;
  totalVoters: number;
  requiredApproval: number;
  votesFor: number;
  votesAgainst: number;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTeamTrade {
  id: string;
  tenantId: string;
  proposerTeamId: string;
  recipientTeamId: string;
  offerTokenType: string;
  offerAmount: number;
  requestTokenType: string;
  requestAmount: number;
  message: string | null;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTeamChallenge {
  id: string;
  tenantId: string;
  challengerTeamId: string;
  challengedTeamId: string;
  format: string;
  phonicsPhase: string | null;
  wagerAmount: number;
  wagerTokenType: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Counters
// ============================================================================

let competitionCounter = 0;
let participantCounter = 0;
let teamCounter = 0;
let teamMemberCounter = 0;
let tokenBalanceCounter = 0;
let tokenTransactionCounter = 0;
let bountyCounter = 0;
let bountySubmissionCounter = 0;
let proposalCounter = 0;
let voteCounter = 0;
let delegationCounter = 0;
let creatorProfileCounter = 0;
let stakePositionCounter = 0;
let treasuryVoteCounter = 0;
let teamTradeCounter = 0;
let teamChallengeCounter = 0;

// ============================================================================
// Constants
// ============================================================================

const COMPETITION_FORMATS = [
  'READING_SPRINT', 'ACCURACY_CHALLENGE', 'COMPREHENSION_QUIZ',
  'WORD_BLITZ', 'PHONICS_DUEL', 'TEAM_RELAY', 'STORY_SHOWDOWN',
  'SPELLING_BEE', 'VOCABULARY_CHALLENGE', 'COLLABORATIVE_CREATION',
] as const;

const TEAM_TYPES = ['CLASSROOM', 'SCHOOL_HOUSE', 'GLOBAL_GUILD', 'FAMILY'] as const;

const TOKEN_TYPES = ['SPARKS', 'GEMS', 'VOICE'] as const;

const PROPOSAL_TYPES = [
  'SIGNAL', 'FEATURE_PRIORITY', 'CONTENT_POLICY', 'CURRICULUM_ADDITION',
  'TOKEN_ALLOCATION', 'TREASURY_SPEND', 'PLATFORM_RULE', 'PARTNERSHIP',
  'EVENT_PLANNING', 'COMMUNITY_FUND',
] as const;

const VOTING_STRATEGIES = ['SIMPLE_MAJORITY', 'SUPERMAJORITY', 'QUADRATIC', 'CONVICTION'] as const;

const BOUNTY_CATEGORIES = [
  'PHASE_GAP', 'THEME_GAP', 'LANGUAGE_GAP', 'SERIES_EXTENSION',
  'CULTURAL_DIVERSITY', 'SEASONAL', 'COMMUNITY_REQUEST',
] as const;

const STAKE_POOL_TYPES = [
  'ARENA_TOURNAMENT', 'TEAM_TREASURY', 'CONTENT_BOUNTY',
  'GOVERNANCE_LOCK', 'CREATOR_BOND', 'SAVINGS_POOL',
] as const;

const TEAM_MEMBER_ROLES = ['CAPTAIN', 'VICE_CAPTAIN', 'MEMBER', 'COACH'] as const;

const CREATOR_TIERS = ['NEWCOMER', 'CONTRIBUTOR', 'ESTABLISHED', 'EXPERT', 'MASTER'] as const;

const ONBOARDING_PHASES = [
  'REGISTERED', 'PROFILE_COMPLETE', 'TUTORIAL_COMPLETE',
  'FIRST_DRAFT', 'FIRST_PUBLICATION', 'ACTIVE_CREATOR',
] as const;

const AUSTRALIAN_COMPETITION_TITLES = [
  'Year 3 Reading Sprint Championship',
  'Aussie Phonics Phase 2 Challenge',
  'NSW Comprehension Quiz Bowl',
  'Victorian Spelling Bee Finals',
  'Queensland Story Showdown',
  'South Australian Vocabulary Challenge',
  'Tasmanian Word Blitz',
  'ACT Team Relay Reading',
  'Western Australian Phonics Duel',
  'Northern Territory Collaborative Creation',
];

const AUSTRALIAN_TEAM_NAMES = [
  'Kookaburra Readers',
  'Platypus Scholars',
  'Wombat Warriors',
  'Kangaroo Crew',
  'Koala Champions',
  'Emu Eagles',
  'Cockatoo Club',
  'Quokka Questers',
  'Bilby Brigade',
  'Echidna Elite',
];

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Create a test competition with Australian education-themed defaults
 */
export function createTestCompetition(overrides: Partial<TestCompetition> = {}): TestCompetition {
  competitionCounter++;
  return {
    id: `comp_${competitionCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    creatorId: overrides.creatorId || `user_${faker.string.alphanumeric(8)}`,
    format: faker.helpers.arrayElement([...COMPETITION_FORMATS]),
    title: faker.helpers.arrayElement(AUSTRALIAN_COMPETITION_TITLES),
    description: faker.lorem.paragraph(),
    totalRounds: faker.number.int({ min: 1, max: 5 }),
    currentRound: 0,
    phonicsPhase: faker.helpers.arrayElement(['1', '2', '3', '4', '5', '6', null]),
    scheduledAt: faker.helpers.maybe(() => faker.date.future(), { probability: 0.5 }) || null,
    startedAt: null,
    completedAt: null,
    config: {
      scoringModel: 'GROWTH_BASED',
      maxParticipants: 20,
      durationMinutes: 30,
    },
    status: 'REGISTRATION_OPEN',
    participantCount: 0,
    wagerPool: 0,
    wagerTokenType: null,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test participant
 */
export function createTestParticipant(overrides: Partial<TestParticipant> = {}): TestParticipant {
  participantCounter++;
  return {
    id: `part_${participantCounter}_${faker.string.alphanumeric(8)}`,
    competitionId: overrides.competitionId || `comp_${faker.string.alphanumeric(8)}`,
    userId: overrides.userId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    type: 'STUDENT',
    status: 'REGISTERED',
    totalScore: 0,
    rank: null,
    roundScores: [],
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test team with Australian-themed defaults
 */
export function createTestTeam(overrides: Partial<TestTeam> = {}): TestTeam {
  teamCounter++;
  return {
    id: `team_${teamCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    name: faker.helpers.arrayElement(AUSTRALIAN_TEAM_NAMES),
    type: faker.helpers.arrayElement([...TEAM_TYPES]),
    description: faker.lorem.sentence(),
    maxMembers: faker.number.int({ min: 5, max: 30 }),
    memberCount: 1,
    createdBy: overrides.createdBy || `user_${faker.string.alphanumeric(8)}`,
    xp: faker.number.int({ min: 0, max: 5000 }),
    treasurySparks: faker.number.int({ min: 0, max: 500 }),
    treasuryGems: faker.number.int({ min: 0, max: 200 }),
    isActive: true,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test team member
 */
export function createTestTeamMember(overrides: Partial<TestTeamMember> = {}): TestTeamMember {
  teamMemberCounter++;
  return {
    id: `tmember_${teamMemberCounter}_${faker.string.alphanumeric(8)}`,
    teamId: overrides.teamId || `team_${faker.string.alphanumeric(8)}`,
    userId: overrides.userId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    role: faker.helpers.arrayElement([...TEAM_MEMBER_ROLES]),
    isActive: true,
    contributedSparks: faker.number.int({ min: 0, max: 100 }),
    contributedGems: faker.number.int({ min: 0, max: 50 }),
    joinedAt: faker.date.past(),
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test token balance
 */
export function createTestTokenBalance(overrides: Partial<TestTokenBalance> = {}): TestTokenBalance {
  tokenBalanceCounter++;
  return {
    id: `tbal_${tokenBalanceCounter}_${faker.string.alphanumeric(8)}`,
    userId: overrides.userId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    sparks: faker.number.int({ min: 0, max: 1000 }),
    gems: faker.number.int({ min: 0, max: 500 }),
    voice: faker.number.int({ min: 0, max: 200 }),
    stakedSparks: faker.number.int({ min: 0, max: 200 }),
    stakedGems: faker.number.int({ min: 0, max: 100 }),
    stakedVoice: faker.number.int({ min: 0, max: 50 }),
    lifetimeSparksEarned: faker.number.int({ min: 0, max: 5000 }),
    lifetimeGemsEarned: faker.number.int({ min: 0, max: 2000 }),
    lifetimeVoiceEarned: faker.number.int({ min: 0, max: 500 }),
    lastEarnedAt: faker.date.recent(),
    lastSpentAt: faker.helpers.maybe(() => faker.date.recent(), { probability: 0.5 }) || null,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test token transaction
 */
export function createTestTokenTransaction(overrides: Partial<TestTokenTransaction> = {}): TestTokenTransaction {
  tokenTransactionCounter++;
  const tokenType = overrides.tokenType || faker.helpers.arrayElement([...TOKEN_TYPES]);
  const amount = overrides.amount || faker.number.int({ min: 1, max: 100 });
  const balanceBefore = overrides.balanceBefore || faker.number.int({ min: 100, max: 1000 });

  return {
    id: `ttx_${tokenTransactionCounter}_${faker.string.alphanumeric(8)}`,
    userId: overrides.userId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    tokenType,
    transactionType: faker.helpers.arrayElement(['EARN', 'SPEND', 'STAKE', 'UNSTAKE']),
    amount,
    balanceBefore,
    balanceAfter: balanceBefore + amount,
    category: faker.helpers.arrayElement(['COMPETITION_REWARD', 'BOUNTY_REWARD', 'TEAM_TREASURY', 'READING_ACTIVITY']),
    referenceId: faker.helpers.maybe(() => faker.string.alphanumeric(12), { probability: 0.5 }) || null,
    referenceType: faker.helpers.maybe(() => faker.helpers.arrayElement(['COMPETITION', 'BOUNTY', 'TEAM', 'STAKE_POSITION']), { probability: 0.5 }) || null,
    metadata: null,
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create a test content bounty with Australian education-themed defaults
 */
export function createTestBounty(overrides: Partial<TestBounty> = {}): TestBounty {
  bountyCounter++;
  return {
    id: `bounty_${bountyCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    creatorId: overrides.creatorId || `user_${faker.string.alphanumeric(8)}`,
    category: faker.helpers.arrayElement([...BOUNTY_CATEGORIES]),
    title: faker.helpers.arrayElement([
      'Phase 3 Digraphs Story Collection',
      'Australian Wildlife Phonics Series',
      'Indigenous Dreamtime Readers',
      'Outback Adventure Comprehension Set',
      'Great Barrier Reef Vocabulary Pack',
      'Sydney Harbour Bridge STEM Reading',
    ]),
    description: faker.lorem.paragraphs(2),
    requirements: {
      minWordCount: faker.number.int({ min: 200, max: 1000 }),
      targetPhase: faker.helpers.arrayElement(['1', '2', '3', '4', '5', '6']),
      ageGroup: faker.helpers.arrayElement(['3-5', '5-7', '6-8']),
    },
    reward: {
      tokenType: faker.helpers.arrayElement(['SPARKS', 'GEMS']),
      amount: faker.number.int({ min: 20, max: 200 }),
    },
    submissionDeadline: faker.date.future(),
    judgingDeadline: faker.helpers.maybe(() => faker.date.future(), { probability: 0.5 }) || null,
    maxSubmissions: faker.number.int({ min: 10, max: 100 }),
    currentSubmissions: 0,
    eligibleTiers: ['NEWCOMER', 'CONTRIBUTOR', 'ESTABLISHED'],
    tags: faker.helpers.arrayElements(['phonics', 'reading', 'comprehension', 'vocabulary', 'australian', 'indigenous', 'stem', 'nature'], { min: 2, max: 4 }),
    status: 'PUBLISHED',
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test bounty submission
 */
export function createTestBountySubmission(overrides: Partial<TestBountySubmission> = {}): TestBountySubmission {
  bountySubmissionCounter++;
  return {
    id: `bsub_${bountySubmissionCounter}_${faker.string.alphanumeric(8)}`,
    bountyId: overrides.bountyId || `bounty_${faker.string.alphanumeric(8)}`,
    creatorId: overrides.creatorId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    storyId: faker.helpers.maybe(() => `story_${faker.string.alphanumeric(8)}`, { probability: 0.7 }) || null,
    status: 'SUBMITTED',
    totalScore: 0,
    reviewedAt: null,
    createdAt: faker.date.recent(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test governance proposal
 */
export function createTestProposal(overrides: Partial<TestProposal> = {}): TestProposal {
  proposalCounter++;
  const votingStartsAt = overrides.votingStartsAt || new Date();
  const votingEndsAt = overrides.votingEndsAt || new Date(votingStartsAt.getTime() + 72 * 60 * 60 * 1000);

  return {
    id: `prop_${proposalCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    creatorId: overrides.creatorId || `user_${faker.string.alphanumeric(8)}`,
    type: faker.helpers.arrayElement([...PROPOSAL_TYPES]),
    title: faker.helpers.arrayElement([
      'Add Phase 6 curriculum content',
      'Increase bounty rewards for indigenous stories',
      'Allocate tokens for national reading week',
      'New competition format: Aussie Spelling Bee',
      'Fund community library for remote schools',
    ]),
    description: faker.lorem.paragraphs(2),
    specification: faker.helpers.maybe(() => ({
      tokenType: 'SPARKS',
      amount: faker.number.int({ min: 50, max: 500 }),
    }), { probability: 0.5 }) || null,
    votingStrategy: faker.helpers.arrayElement([...VOTING_STRATEGIES]),
    status: 'ACTIVE',
    votesFor: 0,
    votesAgainst: 0,
    votesAbstain: 0,
    totalVoters: 0,
    quorumRequired: 0.1,
    votingStartsAt,
    votingEndsAt,
    executionAt: null,
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test governance vote
 */
export function createTestVote(overrides: Partial<TestVote> = {}): TestVote {
  voteCounter++;
  const voiceSpent = overrides.voiceSpent || faker.number.int({ min: 1, max: 20 });

  return {
    id: `vote_${voteCounter}_${faker.string.alphanumeric(8)}`,
    proposalId: overrides.proposalId || `prop_${faker.string.alphanumeric(8)}`,
    voterId: overrides.voterId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    choice: faker.helpers.arrayElement(['FOR', 'AGAINST', 'ABSTAIN']),
    weight: voiceSpent,
    voiceSpent,
    reason: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.4 }) || null,
    createdAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create a test delegation
 */
export function createTestDelegation(overrides: Partial<TestDelegation> = {}): TestDelegation {
  delegationCounter++;
  return {
    id: `deleg_${delegationCounter}_${faker.string.alphanumeric(8)}`,
    delegatorId: overrides.delegatorId || `user_${faker.string.alphanumeric(8)}`,
    delegateId: overrides.delegateId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    proposalTypes: faker.helpers.arrayElements([...PROPOSAL_TYPES], { min: 0, max: 3 }),
    voiceAmount: faker.number.int({ min: 1, max: 50 }),
    isActive: true,
    expiresAt: faker.date.future(),
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test creator profile
 */
export function createTestCreatorProfile(overrides: Partial<TestCreatorProfile> = {}): TestCreatorProfile {
  creatorProfileCounter++;
  return {
    id: `creator_${creatorProfileCounter}_${faker.string.alphanumeric(8)}`,
    userId: overrides.userId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    displayName: faker.person.fullName(),
    bio: faker.lorem.paragraph(),
    specialisations: faker.helpers.arrayElements(
      ['phonics', 'comprehension', 'vocabulary', 'early-years', 'indigenous-content', 'stem-reading', 'creative-writing'],
      { min: 1, max: 3 },
    ),
    tier: faker.helpers.arrayElement([...CREATOR_TIERS]),
    onboardingPhase: faker.helpers.arrayElement([...ONBOARDING_PHASES]),
    totalPublished: faker.number.int({ min: 0, max: 50 }),
    totalDrafts: faker.number.int({ min: 0, max: 10 }),
    avgEngagement: faker.number.float({ min: 0, max: 5, multipleOf: 0.1 }),
    isVerifiedEducator: faker.datatype.boolean(),
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test stake position
 */
export function createTestStakePosition(overrides: Partial<TestStakePosition> = {}): TestStakePosition {
  stakePositionCounter++;
  const lockedUntil = new Date();
  lockedUntil.setDate(lockedUntil.getDate() + faker.number.int({ min: 7, max: 90 }));

  return {
    id: `stake_${stakePositionCounter}_${faker.string.alphanumeric(8)}`,
    userId: overrides.userId || `user_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    poolType: faker.helpers.arrayElement([...STAKE_POOL_TYPES]),
    poolId: faker.helpers.maybe(() => faker.string.alphanumeric(12), { probability: 0.5 }) || null,
    tokenType: faker.helpers.arrayElement([...TOKEN_TYPES]),
    amount: faker.number.int({ min: 10, max: 500 }),
    yieldAccrued: faker.number.int({ min: 0, max: 50 }),
    lockedUntil,
    status: 'ACTIVE',
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test treasury vote (team treasury proposal)
 */
export function createTestTreasuryVote(overrides: Partial<TestTreasuryVote> = {}): TestTreasuryVote {
  treasuryVoteCounter++;
  return {
    id: `tvote_${treasuryVoteCounter}_${faker.string.alphanumeric(8)}`,
    teamId: overrides.teamId || `team_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    proposerId: overrides.proposerId || `user_${faker.string.alphanumeric(8)}`,
    description: faker.helpers.arrayElement([
      'Fund new reading materials for the team library',
      'Reward top contributors from this term',
      'Purchase competition entry for team members',
      'Sponsor a community reading event',
    ]),
    tokenType: faker.helpers.arrayElement(['SPARKS', 'GEMS']),
    amount: faker.number.int({ min: 10, max: 200 }),
    purpose: faker.helpers.arrayElement(['REWARD', 'COMPETITION_ENTRY', 'COMMUNITY_EVENT', 'RESOURCE_PURCHASE']),
    status: 'OPEN',
    totalVoters: faker.number.int({ min: 3, max: 20 }),
    requiredApproval: 0.5,
    votesFor: 0,
    votesAgainst: 0,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    createdAt: faker.date.recent(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test team trade
 */
export function createTestTeamTrade(overrides: Partial<TestTeamTrade> = {}): TestTeamTrade {
  teamTradeCounter++;
  return {
    id: `trade_${teamTradeCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    proposerTeamId: overrides.proposerTeamId || `team_${faker.string.alphanumeric(8)}`,
    recipientTeamId: overrides.recipientTeamId || `team_${faker.string.alphanumeric(8)}`,
    offerTokenType: faker.helpers.arrayElement(['SPARKS', 'GEMS']),
    offerAmount: faker.number.int({ min: 10, max: 100 }),
    requestTokenType: faker.helpers.arrayElement(['SPARKS', 'GEMS']),
    requestAmount: faker.number.int({ min: 10, max: 100 }),
    message: faker.helpers.maybe(() => faker.lorem.sentence(), { probability: 0.6 }) || null,
    status: 'PROPOSED',
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000),
    createdAt: faker.date.recent(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test team challenge
 */
export function createTestTeamChallenge(overrides: Partial<TestTeamChallenge> = {}): TestTeamChallenge {
  teamChallengeCounter++;
  return {
    id: `challenge_${teamChallengeCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    challengerTeamId: overrides.challengerTeamId || `team_${faker.string.alphanumeric(8)}`,
    challengedTeamId: overrides.challengedTeamId || `team_${faker.string.alphanumeric(8)}`,
    format: faker.helpers.arrayElement([...COMPETITION_FORMATS]),
    phonicsPhase: faker.helpers.maybe(() => faker.helpers.arrayElement(['1', '2', '3', '4', '5', '6']), { probability: 0.5 }) || null,
    wagerAmount: faker.number.int({ min: 0, max: 50 }),
    wagerTokenType: faker.helpers.maybe(() => faker.helpers.arrayElement(['SPARKS', 'GEMS']), { probability: 0.5 }) || null,
    status: 'PENDING',
    createdAt: faker.date.recent(),
    updatedAt: new Date(),
    ...overrides,
  };
}

export interface TestDaoTreasury {
  id: string;
  tenantId: string;
  sparksBalance: number;
  gemsBalance: number;
  voiceBalance: number;
  totalAllocated: number;
  totalSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

let daoTreasuryCounter = 0;

/**
 * Create a test DAO treasury
 */
export function createTestDaoTreasury(overrides: Partial<TestDaoTreasury> = {}): TestDaoTreasury {
  daoTreasuryCounter++;
  return {
    id: `treasury_${daoTreasuryCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || 'tenant_default',
    sparksBalance: faker.number.int({ min: 500, max: 5000 }),
    gemsBalance: faker.number.int({ min: 200, max: 2000 }),
    voiceBalance: faker.number.int({ min: 100, max: 1000 }),
    totalAllocated: faker.number.int({ min: 1000, max: 10000 }),
    totalSpent: faker.number.int({ min: 0, max: 3000 }),
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Reset all arena factory counters (call between test files if needed)
 */
export function resetArenaFactoryCounters(): void {
  competitionCounter = 0;
  participantCounter = 0;
  teamCounter = 0;
  teamMemberCounter = 0;
  tokenBalanceCounter = 0;
  tokenTransactionCounter = 0;
  bountyCounter = 0;
  bountySubmissionCounter = 0;
  proposalCounter = 0;
  voteCounter = 0;
  delegationCounter = 0;
  creatorProfileCounter = 0;
  stakePositionCounter = 0;
  treasuryVoteCounter = 0;
  teamTradeCounter = 0;
  teamChallengeCounter = 0;
  daoTreasuryCounter = 0;
}
