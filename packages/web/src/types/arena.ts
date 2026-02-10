/**
 * Arena & Gamification Type Definitions
 *
 * Competitive learning arena, tournaments, teams, community features,
 * token economy, DAO governance, content bounties, and AI intelligence.
 * Mirrors backend Prisma models and API response shapes.
 * Sprints: 5, 7, 9, 12, 14
 */

// =============================================================================
// PAGINATED RESPONSE
// =============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page?: number;
  limit?: number;
}

// =============================================================================
// COMPETITION TYPES
// =============================================================================

export type CompetitionFormat =
  | 'READING_SPRINT'
  | 'ACCURACY_CHALLENGE'
  | 'COMPREHENSION_QUIZ'
  | 'WORD_BLITZ'
  | 'PHONICS_DUEL'
  | 'TEAM_RELAY'
  | 'STORY_SHOWDOWN'
  | 'SPELLING_BEE'
  | 'VOCABULARY_CHALLENGE'
  | 'COLLABORATIVE_CREATION';

export type CompetitionStatus =
  | 'SCHEDULED'
  | 'REGISTRATION_OPEN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type ScoringModel =
  | 'GROWTH_BASED'
  | 'ABSOLUTE'
  | 'HANDICAPPED'
  | 'COLLABORATIVE';

export type TournamentFormat =
  | 'SINGLE_ELIMINATION'
  | 'DOUBLE_ELIMINATION'
  | 'ROUND_ROBIN'
  | 'SWISS'
  | 'LEAGUE'
  | 'SPEED_ROUND'
  | 'ACCURACY_CHALLENGE'
  | 'PHONICS_BEE';

export interface ArenaCompetition {
  id: string;
  tenantId: string;
  creatorId: string;
  format: CompetitionFormat | TournamentFormat;
  title: string;
  description?: string;
  config: {
    scoringModel: ScoringModel;
    maxParticipants: number;
    durationMinutes: number;
    teamBased?: boolean;
    prizePool?: {
      xp?: number;
      badges?: string[];
      tokens?: number;
    };
  };
  status: CompetitionStatus;
  scheduledAt?: string;
  startedAt?: string;
  completedAt?: string;
  currentRound: number;
  totalRounds: number;
  phonicsPhase?: string;
  wagerPool: number;
  wagerTokenType?: TokenType;
  participantCount: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface RoundScore {
  round: number;
  accuracy: number;
  wcpm: number;
  comprehensionScore: number;
  highlights: string[];
  points: number;
}

export interface ArenaParticipant {
  id: string;
  competitionId: string;
  userId: string;
  tenantId: string;
  teamId?: string;
  type: string;
  handicapFactor: number;
  wagerAmount: number;
  totalScore: number;
  roundScores: RoundScore[];
  rank?: number;
  status: string;
  joinedAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface UserCompetitionStats {
  totalCompetitions: number;
  wins: number;
  totalScore: number;
  avgScore: number;
  bestFormat: string | null;
  activeCompetitions: number;
}

export interface LeaderboardEntry extends ArenaParticipant {
  rank: number;
}

// =============================================================================
// TEAM TYPES
// =============================================================================

export type TeamType =
  | 'CLASSROOM'
  | 'SCHOOL_HOUSE'
  | 'GLOBAL_GUILD'
  | 'FAMILY';

export type TeamMemberRole =
  | 'CAPTAIN'
  | 'VICE_CAPTAIN'
  | 'MEMBER'
  | 'COACH';

export interface ArenaTeam {
  id: string;
  tenantId: string;
  name: string;
  type: TeamType;
  description?: string;
  avatarUrl?: string;
  createdBy: string;
  maxMembers: number;
  memberCount: number;
  treasurySparks: number;
  treasuryGems: number;
  totalWins: number;
  totalCompetitions: number;
  xp: number;
  level: number;
  streak: number;
  isActive: boolean;
  metadata?: Record<string, unknown>;
  members?: ArenaTeamMember[];
  myRole?: TeamMemberRole;
  createdAt: string;
  updatedAt: string;
}

export interface ArenaTeamMember {
  id: string;
  teamId: string;
  userId: string;
  tenantId: string;
  role: TeamMemberRole;
  contributedSparks: number;
  contributedGems: number;
  competitionsPlayed: number;
  competitionsWon: number;
  joinedAt: string;
  isActive: boolean;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ArenaTreasuryVoteCast {
  id: string;
  voteId: string;
  voterId: string;
  tenantId: string;
  choice: string;
  createdAt: string;
}

export interface ArenaTreasuryVote {
  id: string;
  teamId: string;
  tenantId: string;
  proposerId: string;
  description: string;
  tokenType: TokenType;
  amount: number;
  purpose: string;
  status: 'OPEN' | 'PASSED' | 'REJECTED';
  votesFor: number;
  votesAgainst: number;
  totalVoters: number;
  requiredApproval: number;
  expiresAt: string;
  createdAt: string;
  votes?: ArenaTreasuryVoteCast[];
}

export interface ArenaTeamTrade {
  id: string;
  tenantId: string;
  proposerTeamId: string;
  recipientTeamId: string;
  offerTokenType: TokenType;
  offerAmount: number;
  requestTokenType: TokenType;
  requestAmount: number;
  message?: string;
  status: 'PROPOSED' | 'COMPLETED' | 'EXPIRED' | 'REJECTED';
  expiresAt: string;
  createdAt: string;
}

export interface ArenaTeamChallenge {
  id: string;
  tenantId: string;
  challengerTeamId: string;
  challengedTeamId: string;
  competitionId?: string;
  format: CompetitionFormat | TournamentFormat;
  phonicsPhase?: string;
  wagerAmount: number;
  wagerTokenType?: TokenType;
  status: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';
  createdAt: string;
}

// =============================================================================
// TOKEN TYPES
// =============================================================================

export type TokenType =
  | 'SPARKS'
  | 'GEMS'
  | 'VOICE';

export interface TokenBalance {
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
  lastEarnedAt?: string;
  lastSpentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ArenaTokenTransaction {
  id: string;
  userId: string;
  tenantId: string;
  tokenType: TokenType;
  transactionType: 'EARN' | 'SPEND' | 'STAKE' | 'UNSTAKE';
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  category?: string;
  referenceId?: string;
  referenceType?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export type StakePoolType =
  | 'ARENA_TOURNAMENT'
  | 'TEAM_TREASURY'
  | 'CONTENT_BOUNTY'
  | 'GOVERNANCE_LOCK'
  | 'CREATOR_BOND'
  | 'SAVINGS_POOL';

export interface ArenaStakePosition {
  id: string;
  userId: string;
  tenantId: string;
  poolType: StakePoolType;
  poolId?: string;
  tokenType: TokenType;
  amount: number;
  yieldAccrued: number;
  lockedUntil: string;
  status: 'ACTIVE' | 'COMPLETED';
  createdAt: string;
  updatedAt: string;
}

export interface TokenEconomyMetrics {
  circulating: {
    sparks: number;
    gems: number;
    voice: number;
  };
  staked: {
    sparks: number;
    gems: number;
    voice: number;
    totalPositions: number;
    totalYieldAccrued: number;
  };
  lifetime: {
    sparksEarned: number;
    gemsEarned: number;
    voiceEarned: number;
  };
  activeUsers: number;
  transactionsLast24h: number;
}

// =============================================================================
// GOVERNANCE TYPES
// =============================================================================

export type ProposalType =
  | 'SIGNAL'
  | 'FEATURE_PRIORITY'
  | 'CONTENT_POLICY'
  | 'CURRICULUM_ADDITION'
  | 'TOKEN_ALLOCATION'
  | 'TREASURY_SPEND'
  | 'PLATFORM_RULE'
  | 'PARTNERSHIP'
  | 'EVENT_PLANNING'
  | 'COMMUNITY_FUND';

export type VotingStrategy =
  | 'SIMPLE_MAJORITY'
  | 'SUPERMAJORITY'
  | 'QUADRATIC'
  | 'CONVICTION';

export type ProposalStatus =
  | 'DRAFT'
  | 'ACTIVE'
  | 'QUORUM_REACHED'
  | 'PASSED'
  | 'FAILED'
  | 'EXPIRED'
  | 'EXECUTED';

export interface ArenaProposal {
  id: string;
  tenantId: string;
  creatorId: string;
  type: ProposalType;
  title: string;
  description: string;
  specification?: Record<string, unknown>;
  votingStrategy: VotingStrategy;
  status: ProposalStatus;
  votingStartsAt?: string;
  votingEndsAt?: string;
  executionAt?: string;
  quorumRequired: number;
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVoters: number;
  voiceLocked: number;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
  _count?: {
    votes: number;
  };
}

export interface ArenaVote {
  id: string;
  proposalId: string;
  voterId: string;
  tenantId: string;
  choice: 'FOR' | 'AGAINST' | 'ABSTAIN';
  weight: number;
  voiceSpent: number;
  delegatedFrom?: string;
  reason?: string;
  createdAt: string;
  voter?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface ArenaDelegation {
  id: string;
  delegatorId: string;
  delegateId: string;
  tenantId: string;
  proposalTypes: string[];
  voiceAmount: number;
  expiresAt?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  delegator?: {
    id: string;
    displayName: string;
  };
  delegate?: {
    id: string;
    displayName: string;
  };
}

export interface DaoTreasury {
  id: string;
  tenantId: string;
  sparksBalance: number;
  gemsBalance: number;
  voiceBalance: number;
  totalAllocated: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface DaoTreasuryTransaction {
  id: string;
  tenantId: string;
  proposalId?: string;
  tokenType: TokenType;
  amount: number;
  direction: 'INFLOW' | 'OUTFLOW';
  description?: string;
  createdAt: string;
}

export interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  passedProposals: number;
  totalVotesCast: number;
  uniqueVoters: number;
  treasury: {
    sparks: number;
    gems: number;
    voice: number;
    totalAllocated: number;
    totalSpent: number;
  } | null;
}

// =============================================================================
// BOUNTY TYPES
// =============================================================================

export type BountyCategory =
  | 'PHASE_GAP'
  | 'THEME_GAP'
  | 'LANGUAGE_GAP'
  | 'SERIES_EXTENSION'
  | 'CULTURAL_DIVERSITY'
  | 'SEASONAL'
  | 'COMMUNITY_REQUEST';

export type BountyStatus =
  | 'DRAFT'
  | 'PUBLISHED'
  | 'ACCEPTING'
  | 'JUDGING'
  | 'COMPLETED';

export interface ContentBounty {
  id: string;
  tenantId: string;
  creatorId: string;
  category: BountyCategory;
  title: string;
  description: string;
  requirements: Record<string, unknown>;
  reward: Record<string, unknown>;
  submissionDeadline: string;
  judgingDeadline?: string;
  maxSubmissions: number;
  currentSubmissions: number;
  eligibleTiers: string[];
  tags: string[];
  proposalId?: string;
  status: BountyStatus;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  _count?: {
    submissions: number;
  };
}

export interface BountySubmission {
  id: string;
  bountyId: string;
  creatorId: string;
  tenantId: string;
  storyId?: string;
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'RUNNER_UP';
  automatedScore?: number;
  communityScore?: number;
  expertScore?: number;
  totalScore?: number;
  feedback?: Record<string, unknown>;
  submittedAt: string;
  reviewedAt?: string;
  creator?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// =============================================================================
// COMMUNITY TYPES
// =============================================================================

export type CreatorTier =
  | 'NEWCOMER'
  | 'CONTRIBUTOR'
  | 'ESTABLISHED'
  | 'EXPERT'
  | 'MASTER';

export type OnboardingPhase =
  | 'REGISTERED'
  | 'PROFILE_COMPLETE'
  | 'TUTORIAL_COMPLETE'
  | 'FIRST_DRAFT'
  | 'FIRST_PUBLICATION'
  | 'ACTIVE_CREATOR';

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  websiteUrl?: string;
  specialisations: string[];
  tier: CreatorTier;
  onboardingPhase: OnboardingPhase;
  totalPublished: number;
  totalDrafts: number;
  avgEngagement: number;
  isVerifiedEducator: boolean;
  tenantId?: string;
  lastActiveAt?: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
  };
}

export interface CreatorAnalytics {
  profile: CreatorProfile;
  content: {
    totalPublished: number;
    totalDrafts: number;
    bountiesCreated: number;
  };
  engagement: {
    avgEngagement: number;
    totalSubmissions: number;
    acceptedSubmissions: number;
    avgSubmissionScore: number;
  };
  tier: {
    current: CreatorTier;
    nextTier: string | null;
  };
}

export interface OnboardingChecklist {
  steps: {
    phase: OnboardingPhase;
    title: string;
    isComplete: boolean;
    isCurrent: boolean;
  }[];
  completionPercentage: number;
  nextAction: string | null;
}

export interface CommunityHealthMetrics {
  creators: {
    total: number;
    verified: number;
  };
  content: {
    activeBounties: number;
  };
  competitions: {
    active: number;
  };
  economy: {
    totalUsers: number;
    totalSparks: number;
    totalGems: number;
    totalVoice: number;
    totalStaked: number;
  };
}

export interface CommunityFeedItem {
  type: 'competition' | 'bounty';
  data: Record<string, unknown>;
  timestamp: string;
}

// =============================================================================
// AI INTELLIGENCE TYPES
// =============================================================================

export interface ArenaInsight {
  id: string;
  icon: string;
  label: string;
  value: string | number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  href: string;
  description: string;
}

export interface ArenaRecommendation {
  type: 'competition' | 'team' | 'bounty' | 'governance' | 'token';
  title: string;
  reason: string;
  confidence: number;
  action: {
    label: string;
    href: string;
  };
}

export interface PerformanceTrend {
  direction: 'improving' | 'declining' | 'stable';
  metric: string;
  change: number;
  period: string;
}

export interface NextAction {
  label: string;
  href: string;
  icon: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface ArenaIntelligence {
  greeting: string;
  insights: ArenaInsight[];
  recommendations: ArenaRecommendation[];
  performanceTrend: PerformanceTrend;
  nextBestAction: NextAction;
}
