/**
 * Governance Module - Type Definitions (DAO)
 *
 * Decentralised governance for the Scholarly ecosystem, enabling community-driven
 * decision-making through DAOs (Decentralised Autonomous Organisations).
 *
 * ## The Granny Explanation
 *
 * Imagine a school where decisions aren't made just by the principal, but by everyone
 * who cares about the school - teachers, parents, even students. But instead of noisy
 * town halls where the loudest voice wins, there's a fair, transparent system where:
 *
 * - Anyone can propose an idea ("Let's add a coding club")
 * - Everyone gets to discuss it thoughtfully
 * - People vote based on how involved they are (not just one vote each)
 * - The results are recorded permanently and fairly
 * - Approved ideas automatically get funding and happen
 *
 * That's what a DAO does for Scholarly. It could be:
 * - A school DAO where staff and parents vote on curriculum choices
 * - A district DAO where schools coordinate regional policies
 * - A platform DAO where all users shape Scholarly's future features
 *
 * The AI helps by:
 * - Summarising long proposals in plain language
 * - Predicting how proposals might affect different groups
 * - Flagging potential issues before they become problems
 * - Ensuring fair representation in discussions
 *
 * @module IntelligenceMesh/Governance
 * @version 1.7.0
 */

import { MeshBaseEntity } from './mesh-types-v17';

// ============================================================================
// CORE ENUMS
// ============================================================================

export type DAOType = 'school' | 'district' | 'regional' | 'platform' | 'community';

export type DAOScope = 'curriculum' | 'policy' | 'budget' | 'staffing' | 'technology' | 'general';

export type DAOStatus = 'draft' | 'active' | 'paused' | 'dissolved';

export type MemberRole = 'member' | 'delegate' | 'council' | 'admin' | 'founder';

export type MemberStatus = 'pending' | 'active' | 'suspended' | 'left';

export type ProposalType = 'governance' | 'treasury' | 'policy' | 'technical' | 'community' | 'emergency';

export type ProposalStatus =
  | 'draft' | 'submitted' | 'discussion' | 'voting'
  | 'passed' | 'rejected' | 'executed' | 'vetoed' | 'cancelled';

export type VoteChoice = 'for' | 'against' | 'abstain';

export type TransactionType = 'deposit' | 'withdrawal' | 'grant' | 'reward' | 'fee';

export type PolicyStatus = 'draft' | 'active' | 'superseded' | 'archived';

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Decentralised Autonomous Organisation
 */
export interface DAO extends MeshBaseEntity {
  name: string;
  description: string;
  purpose: string;

  type: DAOType;
  scope: DAOScope;

  status: DAOStatus;
  activatedAt?: Date;

  // Configuration
  votingConfig: VotingConfig;
  membershipConfig: MembershipConfig;
  treasuryConfig: TreasuryConfig;

  // Metadata
  logoUrl?: string;
  websiteUrl?: string;
  socialLinks?: Record<string, string>;

  // Stats
  memberCount: number;
  proposalCount: number;
  treasuryBalance: number;

  // AI governance
  aiConfig?: {
    enableSentimentAnalysis: boolean;
    enableImpactAssessment: boolean;
    autoSummariseProposals: boolean;
    quorumPrediction: boolean;
    fairnessMonitoring: boolean;
  };
}

export interface VotingConfig {
  quorumPercentage: number;            // Minimum participation (e.g., 40%)
  passingThreshold: number;            // Votes needed to pass (e.g., 50%)
  votingPeriodDays: number;            // How long voting lasts
  discussionPeriodDays: number;        // Discussion before voting
  executionDelayDays: number;          // Delay after passing before execution

  // Advanced options
  quadraticVoting: boolean;            // Square root of stake = voting power
  delegationAllowed: boolean;          // Can delegate votes to others
  vetoEnabled: boolean;                // Council can veto
  vetoThreshold?: number;              // Council votes needed to veto

  // By proposal type (overrides)
  typeOverrides?: Partial<Record<ProposalType, Partial<VotingConfig>>>;
}

export interface MembershipConfig {
  openMembership: boolean;             // Anyone can join
  requiresApproval: boolean;           // Needs admin approval
  minimumStake?: number;               // Tokens required to join
  memberCap?: number;                  // Maximum members

  // Roles
  roleRequirements?: {
    role: MemberRole;
    minimumStake?: number;
    minimumParticipation?: number;     // Proposal/vote count
    appointedBy?: MemberRole[];
  }[];

  // Inactivity handling
  inactivityThresholdDays?: number;
  inactivityAction?: 'warn' | 'reduce_power' | 'suspend' | 'remove';
}

export interface TreasuryConfig {
  multisigRequired: boolean;
  signaturesRequired: number;
  signatories?: string[];              // Member IDs who can sign

  // Spending limits
  spendingLimits: {
    daily?: number;
    weekly?: number;
    perProposal?: number;
    requiresVote: number;              // Above this needs proposal
  };

  // Budget allocation
  budgetCategories?: {
    category: string;
    allocation: number;                // Percentage
    purpose: string;
  }[];
}

/**
 * DAO Member
 */
export interface DAOMember extends MeshBaseEntity {
  daoId: string;
  userId: string;
  displayName: string;

  role: MemberRole;
  status: MemberStatus;

  // Voting power
  votingPower: number;
  baseVotingPower: number;             // Before delegation
  tokensStaked: number;

  // Delegation
  delegatedTo?: string;                // Member ID delegated to
  delegatedPower: number;              // Power received from others
  delegators: string[];                // Members who delegated to this one

  // History
  joinedAt: Date;
  lastActiveAt: Date;

  // Participation
  proposalsCreated: number;
  proposalsVotedOn: number;
  votescast: number;
  participationScore: number;          // 0-100

  // Reputation
  reputationScore: number;             // Based on participation quality
  badges: string[];
}

/**
 * Governance Proposal
 */
export interface DAOProposal extends MeshBaseEntity {
  daoId: string;
  proposalNumber: number;

  title: string;
  summary: string;                     // Brief description
  description: string;                 // Full proposal text

  type: ProposalType;
  category: string;
  tags: string[];

  // Proposer
  proposerId: string;
  proposerName: string;

  status: ProposalStatus;

  // Timeline
  submittedAt?: Date;
  discussionStartsAt?: Date;
  discussionEndsAt?: Date;
  votingStartsAt?: Date;
  votingEndsAt?: Date;
  executedAt?: Date;

  // Voting
  votesFor: number;
  votesAgainst: number;
  votesAbstain: number;
  totalVotingPower: number;            // Total power that voted
  quorumReached: boolean;

  // Execution
  executionData?: {
    type: 'treasury' | 'policy' | 'parameter' | 'custom';
    payload: Record<string, any>;
    executedBy?: string;
    executionResult?: string;
  };

  // Discussion
  discussionCount: number;
  lastDiscussionAt?: Date;

  // AI analysis
  aiAnalysis?: ProposalAIAnalysis;

  // Attachments
  attachments?: { name: string; url: string; type: string }[];

  // Amendments
  amendments?: ProposalAmendment[];
}

export interface ProposalAIAnalysis {
  generatedAt: Date;

  // Summary
  plainLanguageSummary: string;
  keyPoints: string[];

  // Sentiment
  discussionSentiment: {
    positive: number;
    neutral: number;
    negative: number;
    concerns: string[];
    supportReasons: string[];
  };

  // Impact assessment
  impactAssessment: {
    affectedGroups: { group: string; impact: 'positive' | 'neutral' | 'negative'; explanation: string }[];
    financialImpact?: { amount: number; type: 'cost' | 'savings' | 'investment'; timeframe: string };
    riskAssessment: { risk: string; likelihood: 'low' | 'medium' | 'high'; mitigation?: string }[];
  };

  // Predictions
  predictions: {
    predictedPassRate: number;
    predictedQuorumReached: boolean;
    predictedVoterTurnout: number;
    keyFactors: string[];
  };

  // Recommendations
  recommendations: string[];
  similarPastProposals: { proposalId: string; title: string; outcome: string; similarity: number }[];
}

export interface ProposalAmendment {
  id: string;
  proposedBy: string;
  proposedAt: Date;

  originalText: string;
  amendedText: string;
  rationale: string;

  status: 'proposed' | 'accepted' | 'rejected';
  votesFor: number;
  votesAgainst: number;
}

/**
 * Vote on a proposal
 */
export interface DAOVote extends MeshBaseEntity {
  proposalId: string;
  memberId: string;
  memberName: string;

  vote: VoteChoice;
  votingPower: number;

  reason?: string;

  // Delegation info
  delegatedFrom?: string;              // If voting on behalf of another
  delegatedPower?: number;

  votedAt: Date;

  // Change history (if vote changed)
  previousVote?: VoteChoice;
  changedAt?: Date;
}

/**
 * DAO Treasury
 */
export interface DAOTreasury extends MeshBaseEntity {
  daoId: string;

  balance: number;
  lockedBalance: number;               // Committed but not spent

  // Multi-sig
  signatories: string[];
  requiredSignatures: number;

  // Budget tracking
  budgetPeriod: { start: Date; end: Date };
  budgetAllocations: {
    category: string;
    allocated: number;
    spent: number;
    remaining: number;
  }[];

  // Pending transactions
  pendingTransactions: number;
  pendingAmount: number;
}

/**
 * Treasury Transaction
 */
export interface TreasuryTransaction extends MeshBaseEntity {
  treasuryId: string;
  daoId: string;

  type: TransactionType;
  amount: number;

  description: string;
  category?: string;

  // Link to proposal
  proposalId?: string;

  // Status
  status: 'pending' | 'approved' | 'executed' | 'rejected';

  // Signatures
  signatures: {
    signatory: string;
    signedAt: Date;
    approved: boolean;
  }[];
  signaturesRequired: number;
  signaturesReceived: number;

  // Execution
  executedAt?: Date;
  executedBy?: string;
  transactionHash?: string;            // If on-chain
}

/**
 * DAO Policy
 */
export interface DAOPolicy extends MeshBaseEntity {
  daoId: string;

  name: string;
  description: string;
  category: string;

  // Rules
  rules: PolicyRule[];

  // Enforcement
  enforcement: {
    automatic: boolean;
    enforcedBy: string[];              // Role or member IDs
    penaltyForViolation?: string;
  };

  status: PolicyStatus;
  effectiveFrom?: Date;
  effectiveUntil?: Date;

  // Provenance
  createdByProposal?: string;
  supersedes?: string;                 // Previous policy ID
}

export interface PolicyRule {
  id: string;
  name: string;
  condition: string;                   // Human-readable condition
  action: string;                      // What happens if condition is met/violated
  parameters?: Record<string, any>;
}

// ============================================================================
// AI SERVICE INTERFACES
// ============================================================================

export interface AIGovernanceService {
  // Proposal analysis
  analyseProposal(
    proposal: DAOProposal,
    daoContext: { members: DAOMember[]; pastProposals: DAOProposal[]; policies: DAOPolicy[] }
  ): Promise<ProposalAIAnalysis>;

  // Discussion summarisation
  summariseDiscussion(
    proposalId: string,
    comments: { author: string; content: string; timestamp: Date }[]
  ): Promise<{
    summary: string;
    keyThemes: string[];
    majorConcerns: string[];
    pointsOfAgreement: string[];
    unresolvedQuestions: string[];
  }>;

  // Voting prediction
  predictVotingOutcome(
    proposal: DAOProposal,
    members: DAOMember[],
    votingHistory: DAOVote[]
  ): Promise<{
    predictedPassRate: number;
    predictedTurnout: number;
    predictedQuorum: boolean;
    undecidedMembers: { memberId: string; likelyVote: VoteChoice; confidence: number }[];
    keySwingFactors: string[];
  }>;

  // Impact assessment
  assessProposalImpact(
    proposal: DAOProposal,
    daoContext: any
  ): Promise<{
    affectedStakeholders: { group: string; count: number; impact: string }[];
    financialProjection: { shortTerm: number; mediumTerm: number; longTerm: number };
    risks: { description: string; likelihood: number; severity: number; mitigation: string }[];
    opportunities: string[];
  }>;

  // Fairness monitoring
  checkFairness(
    proposal: DAOProposal,
    votes: DAOVote[],
    members: DAOMember[]
  ): Promise<{
    fairnessScore: number;
    concerns: string[];
    recommendations: string[];
    votingPowerDistribution: { percentile: string; share: number }[];
    participationGaps: { group: string; expectedParticipation: number; actualParticipation: number }[];
  }>;

  // Recommendation engine
  recommendProposals(
    member: DAOMember,
    activeProposals: DAOProposal[]
  ): Promise<{
    proposalId: string;
    relevanceScore: number;
    reason: string;
    suggestedAction: 'vote' | 'discuss' | 'review' | 'delegate';
  }[]>;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface DAOAnalytics {
  daoId: string;
  generatedAt: Date;
  period: { start: Date; end: Date };

  // Membership
  membershipMetrics: {
    totalMembers: number;
    activemembers: number;             // Voted/proposed in period
    newMembers: number;
    leftMembers: number;
    memberGrowthRate: number;
  };

  // Proposals
  proposalMetrics: {
    totalProposals: number;
    passed: number;
    rejected: number;
    pending: number;
    averageDiscussionLength: number;
    averageVotingTurnout: number;
    quorumReachRate: number;
  };

  // Voting
  votingMetrics: {
    totalVotes: number;
    uniqueVoters: number;
    averageVotingPower: number;
    delegationRate: number;
    votingPowerGini: number;           // Inequality measure
  };

  // Treasury
  treasuryMetrics: {
    startBalance: number;
    endBalance: number;
    totalInflows: number;
    totalOutflows: number;
    largestExpenditure: { amount: number; description: string };
  };

  // Health indicators
  healthIndicators: {
    participationHealth: 'excellent' | 'good' | 'fair' | 'poor';
    decentralisationScore: number;     // How distributed is power
    activityScore: number;
    contentionLevel: number;           // How controversial are votes
  };

  // AI insights
  aiInsights: {
    trends: string[];
    risks: string[];
    recommendations: string[];
    comparisonToPeers?: string;
  };
}

