// =============================================================================
// Token Economy Engine — EDU-Nexus Token Mechanics
// =============================================================================
// The Token Economy Engine is the financial nervous system of the Scholarly
// platform. If the Intelligence Mesh is the brain (processing learning data)
// and the Storybook Engine is the heart (pumping creative content), then the
// Token Economy is the circulatory system that ensures value flows to every
// participant — learners, educators, creators, and the platform itself.
//
// The engine implements a three-token model inspired by Self-Determination
// Theory's three psychological needs:
//
//   ⚡ Sparks  — High-frequency activity tokens (competence)
//                Earned every session, spent on immediate rewards.
//                Think of them as the "cash" in the economy.
//
//   💎 Gems    — Milestone achievement tokens (autonomy)
//                Earned through sustained effort, unlock premium features.
//                Think of them as "savings bonds" that compound over time.
//
//   🗳️ Voice   — Governance participation tokens (relatedness)
//                Earned through community contribution, spent on platform
//                governance votes. Think of them as "civic participation rights."
//
// Architecture: Event-driven with NATS integration, multi-tenant isolation,
// Result<T> error handling, comprehensive audit trail, and anti-exploitation
// safeguards including rate limiting, age-appropriate caps, and loss aversion
// mitigation.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';

// ─── Token Types ────────────────────────────────────────────────────────────

export enum TokenType {
  SPARKS = 'SPARKS',     // ⚡ High-frequency activity tokens
  GEMS = 'GEMS',         // 💎 Milestone achievement tokens
  VOICE = 'VOICE',       // 🗳️ Governance participation tokens
}

export enum TransactionType {
  EARN = 'EARN',
  SPEND = 'SPEND',
  STAKE = 'STAKE',
  UNSTAKE = 'UNSTAKE',
  TRANSFER = 'TRANSFER',
  BURN = 'BURN',
  MINT = 'MINT',
  REWARD = 'REWARD',
  REFUND = 'REFUND',
  BOUNTY_PAYOUT = 'BOUNTY_PAYOUT',
  TEAM_POOL = 'TEAM_POOL',
  WAGER = 'WAGER',
  WAGER_WIN = 'WAGER_WIN',
  WAGER_LOSS = 'WAGER_LOSS',
  CONSOLATION = 'CONSOLATION',
}

export enum EarningCategory {
  // Sparks earning categories
  READING_COMPLETION = 'READING_COMPLETION',
  READING_ACCURACY = 'READING_ACCURACY',
  PHONICS_MASTERY = 'PHONICS_MASTERY',
  DAILY_STREAK = 'DAILY_STREAK',
  STORY_CREATION = 'STORY_CREATION',
  PEER_REVIEW = 'PEER_REVIEW',
  ARENA_PARTICIPATION = 'ARENA_PARTICIPATION',
  ARENA_WIN = 'ARENA_WIN',
  HELP_GIVEN = 'HELP_GIVEN',
  QUIZ_COMPLETION = 'QUIZ_COMPLETION',

  // Gems earning categories
  PHASE_COMPLETION = 'PHASE_COMPLETION',
  SERIES_COMPLETION = 'SERIES_COMPLETION',
  WEEK_STREAK = 'WEEK_STREAK',
  MONTH_STREAK = 'MONTH_STREAK',
  CREATOR_MILESTONE = 'CREATOR_MILESTONE',
  ARENA_TOURNAMENT_WIN = 'ARENA_TOURNAMENT_WIN',
  COMMUNITY_ACHIEVEMENT = 'COMMUNITY_ACHIEVEMENT',
  PERFECT_SCORE = 'PERFECT_SCORE',

  // Voice earning categories
  CONTENT_CREATION = 'CONTENT_CREATION',
  QUALITY_REVIEW = 'QUALITY_REVIEW',
  BUG_REPORT = 'BUG_REPORT',
  FEATURE_SUGGESTION = 'FEATURE_SUGGESTION',
  COMMUNITY_MODERATION = 'COMMUNITY_MODERATION',
  MENTORING = 'MENTORING',
  BOUNTY_COMPLETION = 'BOUNTY_COMPLETION',
  TUTORIAL_CREATION = 'TUTORIAL_CREATION',
}

export enum SpendingCategory {
  // Sparks spending
  AVATAR_CUSTOMISATION = 'AVATAR_CUSTOMISATION',
  LIBRARY_THEME = 'LIBRARY_THEME',
  NARRATOR_VOICE = 'NARRATOR_VOICE',
  READING_EFFECT = 'READING_EFFECT',
  BADGE_UPGRADE = 'BADGE_UPGRADE',
  HINT_PURCHASE = 'HINT_PURCHASE',
  ARENA_ENTRY_FEE = 'ARENA_ENTRY_FEE',
  TEAM_DECORATION = 'TEAM_DECORATION',
  PET_COMPANION = 'PET_COMPANION',
  STICKER_PACK = 'STICKER_PACK',

  // Gems spending
  PREMIUM_STORY_UNLOCK = 'PREMIUM_STORY_UNLOCK',
  ART_STYLE_UNLOCK = 'ART_STYLE_UNLOCK',
  ADVANCED_ANALYTICS = 'ADVANCED_ANALYTICS',
  CUSTOM_CHARACTER = 'CUSTOM_CHARACTER',
  SERIES_EARLY_ACCESS = 'SERIES_EARLY_ACCESS',
  CREATOR_TOOLS_UPGRADE = 'CREATOR_TOOLS_UPGRADE',
  CERTIFICATE_GENERATION = 'CERTIFICATE_GENERATION',

  // Voice spending
  GOVERNANCE_VOTE = 'GOVERNANCE_VOTE',
  PROPOSAL_CREATION = 'PROPOSAL_CREATION',
  FEATURE_PRIORITISATION = 'FEATURE_PRIORITISATION',
  CONTENT_CURATION = 'CONTENT_CURATION',
}

export enum StakePoolType {
  ARENA_TOURNAMENT = 'ARENA_TOURNAMENT',
  TEAM_TREASURY = 'TEAM_TREASURY',
  CONTENT_BOUNTY = 'CONTENT_BOUNTY',
  GOVERNANCE_LOCK = 'GOVERNANCE_LOCK',
  CREATOR_BOND = 'CREATOR_BOND',
  SAVINGS_POOL = 'SAVINGS_POOL',
}

// ─── Earning Rules Configuration ────────────────────────────────────────────

export interface EarningRule {
  category: EarningCategory;
  tokenType: TokenType;
  baseAmount: number;
  multiplierFactors: MultiplierFactor[];
  dailyCap: number;
  weeklyCap: number;
  cooldownMinutes: number;
  minAge: number;
  maxAge: number;
  description: string;
}

export interface MultiplierFactor {
  condition: string;
  multiplier: number;
  description: string;
}

export interface SpendingOption {
  category: SpendingCategory;
  tokenType: TokenType;
  cost: number;
  description: string;
  minAge: number;
  repeatable: boolean;
  cooldownHours: number;
}

export interface StakeConfig {
  poolType: StakePoolType;
  tokenType: TokenType;
  minStake: number;
  maxStake: number;
  lockDurationDays: number;
  yieldPercentage: number; // Annual yield for savings pools
  earlyWithdrawalPenalty: number; // Percentage penalty
  description: string;
}

// ─── Transaction & Balance Types ────────────────────────────────────────────

export interface TokenBalance {
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
  lastEarnedAt: Date;
  lastSpentAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenTransaction {
  id: string;
  userId: string;
  tenantId: string;
  tokenType: TokenType;
  transactionType: TransactionType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  category: EarningCategory | SpendingCategory | null;
  referenceId: string | null; // Links to storybook, arena match, bounty, etc.
  referenceType: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export interface StakePosition {
  id: string;
  userId: string;
  tenantId: string;
  poolType: StakePoolType;
  poolId: string; // References the specific pool (team, tournament, etc.)
  tokenType: TokenType;
  amount: number;
  lockedUntil: Date;
  yieldAccrued: number;
  status: 'ACTIVE' | 'UNLOCKING' | 'WITHDRAWN' | 'FORFEITED';
  createdAt: Date;
  updatedAt: Date;
}

export interface EarningEvent {
  userId: string;
  tenantId: string;
  category: EarningCategory;
  referenceId: string;
  referenceType: string;
  performanceData: Record<string, unknown>;
  timestamp: Date;
}

export interface SpendRequest {
  userId: string;
  tenantId: string;
  category: SpendingCategory;
  quantity: number;
  referenceId?: string;
  metadata?: Record<string, unknown>;
}

export interface StakeRequest {
  userId: string;
  tenantId: string;
  poolType: StakePoolType;
  poolId: string;
  tokenType: TokenType;
  amount: number;
}

export interface UnstakeRequest {
  userId: string;
  tenantId: string;
  stakePositionId: string;
  earlyWithdrawal: boolean;
}

export interface WagerRequest {
  userId: string;
  tenantId: string;
  competitionId: string;
  tokenType: TokenType;
  amount: number;
}

// ─── Anti-Exploitation & Safety ─────────────────────────────────────────────

export interface RateLimitState {
  userId: string;
  category: EarningCategory;
  dailyCount: number;
  dailyAmount: number;
  weeklyCount: number;
  weeklyAmount: number;
  lastEarnedAt: Date;
  resetDailyAt: Date;
  resetWeeklyAt: Date;
}

export interface AgeGuardrails {
  minAge: number;
  maxAge: number;
  maxDailySparks: number;
  maxDailyGems: number;
  maxDailyVoice: number;
  canStake: boolean;
  canWager: boolean;
  maxWagerAmount: number;
  canTransfer: boolean;
  maxTransferPerDay: number;
  requiresParentalConsent: boolean;
  sessionTimeLimitMinutes: number;
}

export interface ConsolationConfig {
  enabled: boolean;
  minConsolation: number; // Minimum tokens for losers
  consolationPercentage: number; // % of wager returned on loss
  streakProtection: boolean; // Don't break earning streaks on loss
  lossCapPerSession: number; // Maximum tokens that can be lost per session
}

// ─── Earning Rules Database ─────────────────────────────────────────────────
// These rules encode the incentive design — every number here shapes
// learner behaviour. The philosophy: frequent small rewards for effort
// (Sparks), occasional larger rewards for achievement (Gems), and
// meaningful rewards for community contribution (Voice).

const EARNING_RULES: EarningRule[] = [
  // ── Sparks: Activity Tokens ──
  {
    category: EarningCategory.READING_COMPLETION,
    tokenType: TokenType.SPARKS,
    baseAmount: 10,
    multiplierFactors: [
      { condition: 'accuracy >= 95%', multiplier: 1.5, description: 'Near-perfect reading' },
      { condition: 'firstRead', multiplier: 1.2, description: 'First time reading this book' },
      { condition: 'aboveLevel', multiplier: 1.3, description: 'Reading above current level' },
    ],
    dailyCap: 100,
    weeklyCap: 500,
    cooldownMinutes: 0,
    minAge: 3,
    maxAge: 18,
    description: 'Complete reading a storybook from start to finish',
  },
  {
    category: EarningCategory.READING_ACCURACY,
    tokenType: TokenType.SPARKS,
    baseAmount: 5,
    multiplierFactors: [
      { condition: 'accuracy >= 98%', multiplier: 2.0, description: 'Near-flawless accuracy' },
      { condition: 'wcpmImproved', multiplier: 1.3, description: 'Reading speed improved' },
    ],
    dailyCap: 50,
    weeklyCap: 250,
    cooldownMinutes: 0,
    minAge: 3,
    maxAge: 18,
    description: 'Bonus for high accuracy per-page reading',
  },
  {
    category: EarningCategory.PHONICS_MASTERY,
    tokenType: TokenType.SPARKS,
    baseAmount: 15,
    multiplierFactors: [
      { condition: 'mastery >= 90%', multiplier: 1.5, description: 'High mastery BKT score' },
      { condition: 'newGPC', multiplier: 2.0, description: 'First time mastering this GPC' },
    ],
    dailyCap: 75,
    weeklyCap: 350,
    cooldownMinutes: 5,
    minAge: 3,
    maxAge: 12,
    description: 'Demonstrate mastery of a grapheme-phoneme correspondence',
  },
  {
    category: EarningCategory.DAILY_STREAK,
    tokenType: TokenType.SPARKS,
    baseAmount: 5,
    multiplierFactors: [
      { condition: 'streak >= 7', multiplier: 2.0, description: 'Week-long streak' },
      { condition: 'streak >= 30', multiplier: 3.0, description: 'Month-long streak' },
      { condition: 'streak >= 100', multiplier: 5.0, description: 'Century streak' },
    ],
    dailyCap: 25,
    weeklyCap: 175,
    cooldownMinutes: 0,
    minAge: 3,
    maxAge: 18,
    description: 'Maintain a daily reading streak',
  },
  {
    category: EarningCategory.STORY_CREATION,
    tokenType: TokenType.SPARKS,
    baseAmount: 20,
    multiplierFactors: [
      { condition: 'decodability >= 90%', multiplier: 1.5, description: 'High decodability score' },
      { condition: 'published', multiplier: 2.0, description: 'Story passed review and published' },
    ],
    dailyCap: 60,
    weeklyCap: 200,
    cooldownMinutes: 30,
    minAge: 8,
    maxAge: 99,
    description: 'Create a storybook using the Content SDK or Studio',
  },
  {
    category: EarningCategory.PEER_REVIEW,
    tokenType: TokenType.SPARKS,
    baseAmount: 8,
    multiplierFactors: [
      { condition: 'reviewQuality >= 4.0', multiplier: 1.5, description: 'High-quality review' },
      { condition: 'verifiedEducator', multiplier: 1.3, description: 'Verified educator reviewer' },
    ],
    dailyCap: 40,
    weeklyCap: 200,
    cooldownMinutes: 10,
    minAge: 16,
    maxAge: 99,
    description: 'Submit a peer review of community content',
  },
  {
    category: EarningCategory.ARENA_PARTICIPATION,
    tokenType: TokenType.SPARKS,
    baseAmount: 8,
    multiplierFactors: [
      { condition: 'completedAllRounds', multiplier: 1.5, description: 'Completed all rounds' },
      { condition: 'teamEvent', multiplier: 1.2, description: 'Team participation bonus' },
    ],
    dailyCap: 40,
    weeklyCap: 200,
    cooldownMinutes: 0,
    minAge: 5,
    maxAge: 18,
    description: 'Participate in an Arena competition',
  },
  {
    category: EarningCategory.ARENA_WIN,
    tokenType: TokenType.SPARKS,
    baseAmount: 15,
    multiplierFactors: [
      { condition: 'perfectScore', multiplier: 2.0, description: 'Won with perfect score' },
      { condition: 'comebackWin', multiplier: 1.5, description: 'Won from behind' },
      { condition: 'tournamentFinal', multiplier: 2.5, description: 'Tournament final win' },
    ],
    dailyCap: 75,
    weeklyCap: 350,
    cooldownMinutes: 0,
    minAge: 5,
    maxAge: 18,
    description: 'Win an Arena competition',
  },
  {
    category: EarningCategory.HELP_GIVEN,
    tokenType: TokenType.SPARKS,
    baseAmount: 5,
    multiplierFactors: [
      { condition: 'helpAccepted', multiplier: 1.5, description: 'Recipient found it helpful' },
    ],
    dailyCap: 25,
    weeklyCap: 100,
    cooldownMinutes: 5,
    minAge: 8,
    maxAge: 18,
    description: 'Help another learner in the community',
  },
  {
    category: EarningCategory.QUIZ_COMPLETION,
    tokenType: TokenType.SPARKS,
    baseAmount: 8,
    multiplierFactors: [
      { condition: 'score >= 80%', multiplier: 1.3, description: 'High quiz score' },
      { condition: 'score >= 95%', multiplier: 1.8, description: 'Near-perfect quiz score' },
    ],
    dailyCap: 40,
    weeklyCap: 200,
    cooldownMinutes: 0,
    minAge: 5,
    maxAge: 18,
    description: 'Complete a comprehension quiz',
  },

  // ── Gems: Achievement Tokens ──
  {
    category: EarningCategory.PHASE_COMPLETION,
    tokenType: TokenType.GEMS,
    baseAmount: 50,
    multiplierFactors: [
      { condition: 'avgMastery >= 90%', multiplier: 1.5, description: 'High average mastery across phase' },
      { condition: 'completedUnderTarget', multiplier: 1.3, description: 'Completed faster than expected' },
    ],
    dailyCap: 100,
    weeklyCap: 200,
    cooldownMinutes: 0,
    minAge: 3,
    maxAge: 12,
    description: 'Complete all GPCs in a phonics phase (Phase 1-6)',
  },
  {
    category: EarningCategory.SERIES_COMPLETION,
    tokenType: TokenType.GEMS,
    baseAmount: 30,
    multiplierFactors: [
      { condition: 'allBooksRead', multiplier: 1.5, description: 'Read every book in the series' },
      { condition: 'highAccuracy', multiplier: 1.3, description: 'Average accuracy above 90%' },
    ],
    dailyCap: 90,
    weeklyCap: 300,
    cooldownMinutes: 0,
    minAge: 3,
    maxAge: 18,
    description: 'Complete all books in a storybook series',
  },
  {
    category: EarningCategory.WEEK_STREAK,
    tokenType: TokenType.GEMS,
    baseAmount: 20,
    multiplierFactors: [
      { condition: 'consecutiveWeeks >= 4', multiplier: 2.0, description: 'Month of weekly streaks' },
    ],
    dailyCap: 20,
    weeklyCap: 20,
    cooldownMinutes: 0,
    minAge: 3,
    maxAge: 18,
    description: 'Maintain reading activity every day for a full week',
  },
  {
    category: EarningCategory.MONTH_STREAK,
    tokenType: TokenType.GEMS,
    baseAmount: 100,
    multiplierFactors: [
      { condition: 'consecutiveMonths >= 3', multiplier: 2.0, description: 'Quarter of monthly streaks' },
      { condition: 'consecutiveMonths >= 12', multiplier: 5.0, description: 'Year of monthly streaks' },
    ],
    dailyCap: 100,
    weeklyCap: 100,
    cooldownMinutes: 0,
    minAge: 3,
    maxAge: 18,
    description: 'Maintain reading activity every day for a full month',
  },
  {
    category: EarningCategory.CREATOR_MILESTONE,
    tokenType: TokenType.GEMS,
    baseAmount: 25,
    multiplierFactors: [
      { condition: 'booksPublished >= 10', multiplier: 1.5, description: '10+ books published' },
      { condition: 'booksPublished >= 50', multiplier: 3.0, description: '50+ books published' },
      { condition: 'totalReads >= 10000', multiplier: 2.0, description: '10K+ total reads' },
    ],
    dailyCap: 75,
    weeklyCap: 300,
    cooldownMinutes: 0,
    minAge: 16,
    maxAge: 99,
    description: 'Reach a content creation milestone',
  },
  {
    category: EarningCategory.ARENA_TOURNAMENT_WIN,
    tokenType: TokenType.GEMS,
    baseAmount: 40,
    multiplierFactors: [
      { condition: 'undefeated', multiplier: 2.0, description: 'Won tournament without a loss' },
      { condition: 'teamSize >= 5', multiplier: 1.3, description: 'Large team tournament' },
    ],
    dailyCap: 80,
    weeklyCap: 200,
    cooldownMinutes: 0,
    minAge: 5,
    maxAge: 18,
    description: 'Win a multi-round Arena tournament',
  },
  {
    category: EarningCategory.COMMUNITY_ACHIEVEMENT,
    tokenType: TokenType.GEMS,
    baseAmount: 15,
    multiplierFactors: [
      { condition: 'firstAchievement', multiplier: 2.0, description: 'First community achievement' },
    ],
    dailyCap: 30,
    weeklyCap: 100,
    cooldownMinutes: 0,
    minAge: 8,
    maxAge: 99,
    description: 'Earn a community-voted achievement badge',
  },
  {
    category: EarningCategory.PERFECT_SCORE,
    tokenType: TokenType.GEMS,
    baseAmount: 10,
    multiplierFactors: [
      { condition: 'consecutivePerfect >= 3', multiplier: 2.0, description: '3+ perfect scores in a row' },
    ],
    dailyCap: 30,
    weeklyCap: 100,
    cooldownMinutes: 0,
    minAge: 5,
    maxAge: 18,
    description: 'Achieve 100% accuracy on a storybook reading',
  },

  // ── Voice: Governance Tokens ──
  {
    category: EarningCategory.CONTENT_CREATION,
    tokenType: TokenType.VOICE,
    baseAmount: 10,
    multiplierFactors: [
      { condition: 'published', multiplier: 2.0, description: 'Content passed review' },
      { condition: 'highEngagement', multiplier: 1.5, description: 'Above-average engagement metrics' },
    ],
    dailyCap: 30,
    weeklyCap: 150,
    cooldownMinutes: 30,
    minAge: 16,
    maxAge: 99,
    description: 'Create and submit content to the platform',
  },
  {
    category: EarningCategory.QUALITY_REVIEW,
    tokenType: TokenType.VOICE,
    baseAmount: 5,
    multiplierFactors: [
      { condition: 'detailedFeedback', multiplier: 1.5, description: 'Provided detailed feedback' },
      { condition: 'verifiedEducator', multiplier: 1.3, description: 'Verified educator status' },
    ],
    dailyCap: 25,
    weeklyCap: 100,
    cooldownMinutes: 10,
    minAge: 16,
    maxAge: 99,
    description: 'Review community content through the quality pipeline',
  },
  {
    category: EarningCategory.BUG_REPORT,
    tokenType: TokenType.VOICE,
    baseAmount: 8,
    multiplierFactors: [
      { condition: 'confirmed', multiplier: 2.0, description: 'Bug confirmed and fixed' },
    ],
    dailyCap: 24,
    weeklyCap: 80,
    cooldownMinutes: 60,
    minAge: 13,
    maxAge: 99,
    description: 'Submit a valid bug report',
  },
  {
    category: EarningCategory.FEATURE_SUGGESTION,
    tokenType: TokenType.VOICE,
    baseAmount: 5,
    multiplierFactors: [
      { condition: 'implemented', multiplier: 5.0, description: 'Suggestion implemented' },
      { condition: 'communityUpvoted', multiplier: 1.5, description: 'Community upvoted' },
    ],
    dailyCap: 15,
    weeklyCap: 50,
    cooldownMinutes: 120,
    minAge: 13,
    maxAge: 99,
    description: 'Suggest a platform feature improvement',
  },
  {
    category: EarningCategory.COMMUNITY_MODERATION,
    tokenType: TokenType.VOICE,
    baseAmount: 3,
    multiplierFactors: [
      { condition: 'accurateModeration', multiplier: 1.5, description: 'Moderation decisions upheld' },
    ],
    dailyCap: 15,
    weeklyCap: 75,
    cooldownMinutes: 5,
    minAge: 18,
    maxAge: 99,
    description: 'Moderate community interactions',
  },
  {
    category: EarningCategory.MENTORING,
    tokenType: TokenType.VOICE,
    baseAmount: 8,
    multiplierFactors: [
      { condition: 'menteeImproved', multiplier: 2.0, description: 'Mentee showed measurable improvement' },
    ],
    dailyCap: 24,
    weeklyCap: 100,
    cooldownMinutes: 30,
    minAge: 16,
    maxAge: 99,
    description: 'Mentor a fellow creator or educator',
  },
  {
    category: EarningCategory.BOUNTY_COMPLETION,
    tokenType: TokenType.VOICE,
    baseAmount: 20,
    multiplierFactors: [
      { condition: 'bountyWinner', multiplier: 2.0, description: 'Selected as bounty winner' },
      { condition: 'earlySubmission', multiplier: 1.3, description: 'Submitted before deadline' },
    ],
    dailyCap: 40,
    weeklyCap: 200,
    cooldownMinutes: 0,
    minAge: 16,
    maxAge: 99,
    description: 'Complete a content bounty challenge',
  },
  {
    category: EarningCategory.TUTORIAL_CREATION,
    tokenType: TokenType.VOICE,
    baseAmount: 15,
    multiplierFactors: [
      { condition: 'approved', multiplier: 1.5, description: 'Tutorial approved for portal' },
      { condition: 'highCompletionRate', multiplier: 1.3, description: 'Learners complete the tutorial' },
    ],
    dailyCap: 30,
    weeklyCap: 100,
    cooldownMinutes: 60,
    minAge: 16,
    maxAge: 99,
    description: 'Create an educational tutorial for the developer portal',
  },
];

// ─── Age Guardrails ─────────────────────────────────────────────────────────
// Children's economies require careful safeguards. These aren't just
// technical limits — they're ethical commitments. A 6-year-old should
// never feel the sting of losing tokens they worked hard to earn, and
// a 15-year-old shouldn't be able to gamble away their progress.

const AGE_GUARDRAILS: AgeGuardrails[] = [
  {
    minAge: 3, maxAge: 5,
    maxDailySparks: 50, maxDailyGems: 20, maxDailyVoice: 0,
    canStake: false, canWager: false, maxWagerAmount: 0,
    canTransfer: false, maxTransferPerDay: 0,
    requiresParentalConsent: true, sessionTimeLimitMinutes: 30,
  },
  {
    minAge: 6, maxAge: 8,
    maxDailySparks: 100, maxDailyGems: 40, maxDailyVoice: 0,
    canStake: false, canWager: false, maxWagerAmount: 0,
    canTransfer: false, maxTransferPerDay: 0,
    requiresParentalConsent: true, sessionTimeLimitMinutes: 45,
  },
  {
    minAge: 9, maxAge: 12,
    maxDailySparks: 200, maxDailyGems: 80, maxDailyVoice: 0,
    canStake: true, canWager: true, maxWagerAmount: 10,
    canTransfer: true, maxTransferPerDay: 20,
    requiresParentalConsent: true, sessionTimeLimitMinutes: 60,
  },
  {
    minAge: 13, maxAge: 15,
    maxDailySparks: 500, maxDailyGems: 200, maxDailyVoice: 50,
    canStake: true, canWager: true, maxWagerAmount: 25,
    canTransfer: true, maxTransferPerDay: 50,
    requiresParentalConsent: true, sessionTimeLimitMinutes: 90,
  },
  {
    minAge: 16, maxAge: 17,
    maxDailySparks: 1000, maxDailyGems: 500, maxDailyVoice: 100,
    canStake: true, canWager: true, maxWagerAmount: 50,
    canTransfer: true, maxTransferPerDay: 100,
    requiresParentalConsent: false, sessionTimeLimitMinutes: 120,
  },
  {
    minAge: 18, maxAge: 99,
    maxDailySparks: 5000, maxDailyGems: 2000, maxDailyVoice: 500,
    canStake: true, canWager: true, maxWagerAmount: 200,
    canTransfer: true, maxTransferPerDay: 500,
    requiresParentalConsent: false, sessionTimeLimitMinutes: 0, // No limit
  },
];

// ─── Consolation Economy ────────────────────────────────────────────────────
// Loss aversion is 2x more powerful than gain motivation (Kahneman &
// Tversky). In a children's economy, this asymmetry is even more
// pronounced. The consolation config ensures that losing a wager never
// feels devastating — the worst case is a mild setback, not a catastrophe.

const CONSOLATION_CONFIG: ConsolationConfig = {
  enabled: true,
  minConsolation: 2,           // Always get at least 2 tokens back
  consolationPercentage: 30,   // Get 30% of wager back on loss
  streakProtection: true,      // Losing a wager doesn't break streaks
  lossCapPerSession: 50,       // Can never lose more than 50 tokens per session
};

// ─── Staking Configurations ─────────────────────────────────────────────────

const STAKE_CONFIGS: StakeConfig[] = [
  {
    poolType: StakePoolType.ARENA_TOURNAMENT,
    tokenType: TokenType.SPARKS,
    minStake: 5,
    maxStake: 100,
    lockDurationDays: 0, // Locked until tournament ends
    yieldPercentage: 0,
    earlyWithdrawalPenalty: 100, // Cannot withdraw from tournament
    description: 'Stake Sparks on Arena tournament outcomes',
  },
  {
    poolType: StakePoolType.TEAM_TREASURY,
    tokenType: TokenType.SPARKS,
    minStake: 1,
    maxStake: 50,
    lockDurationDays: 7,
    yieldPercentage: 0,
    earlyWithdrawalPenalty: 20,
    description: 'Contribute Sparks to team shared treasury',
  },
  {
    poolType: StakePoolType.CONTENT_BOUNTY,
    tokenType: TokenType.GEMS,
    minStake: 10,
    maxStake: 200,
    lockDurationDays: 30,
    yieldPercentage: 0,
    earlyWithdrawalPenalty: 50,
    description: 'Stake Gems to fund content bounties',
  },
  {
    poolType: StakePoolType.GOVERNANCE_LOCK,
    tokenType: TokenType.VOICE,
    minStake: 5,
    maxStake: 500,
    lockDurationDays: 14,
    yieldPercentage: 0,
    earlyWithdrawalPenalty: 30,
    description: 'Lock Voice tokens for weighted governance voting',
  },
  {
    poolType: StakePoolType.CREATOR_BOND,
    tokenType: TokenType.GEMS,
    minStake: 50,
    maxStake: 1000,
    lockDurationDays: 90,
    yieldPercentage: 5, // 5% annual yield
    earlyWithdrawalPenalty: 25,
    description: 'Creator bonds for long-term platform commitment',
  },
  {
    poolType: StakePoolType.SAVINGS_POOL,
    tokenType: TokenType.SPARKS,
    minStake: 10,
    maxStake: 500,
    lockDurationDays: 30,
    yieldPercentage: 3, // 3% annual yield — teaches savings concepts
    earlyWithdrawalPenalty: 10,
    description: 'Savings pool teaching children about compound interest',
  },
];

// ─── Token Economy Engine ───────────────────────────────────────────────────

export class TokenEconomyEngine extends ScholarlyBaseService {
  private earningRules: Map<EarningCategory, EarningRule>;
  private ageGuardrails: Map<string, AgeGuardrails>; // key: `${minAge}-${maxAge}`
  private stakeConfigs: Map<StakePoolType, StakeConfig>;
  private rateLimitCache: Map<string, RateLimitState>; // In-memory for hot path

  constructor(
    private prisma: PrismaClient,
    private nats: NATSClient,
    private redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: any) => Promise<void>; del: (k: string) => Promise<void> },
  ) {
    super('TokenEconomyEngine');

    this.earningRules = new Map();
    for (const rule of EARNING_RULES) {
      this.earningRules.set(rule.category, rule);
    }

    this.ageGuardrails = new Map();
    for (const g of AGE_GUARDRAILS) {
      this.ageGuardrails.set(`${g.minAge}-${g.maxAge}`, g);
    }

    this.stakeConfigs = new Map();
    for (const s of STAKE_CONFIGS) {
      this.stakeConfigs.set(s.poolType, s);
    }

    this.rateLimitCache = new Map();
  }

  // ── Balance Operations ──────────────────────────────────────────────────

  async getBalance(userId: string, tenantId: string): Promise<Result<TokenBalance>> {
    try {
      const cached = await this.redis.get(`balance:${tenantId}:${userId}`);
      if (cached) {
        return { success: true, data: JSON.parse(cached) };
      }

      const balance = await this.prisma.tokenBalance.findUnique({
        where: { userId_tenantId: { userId, tenantId } },
      });

      if (!balance) {
        // Create initial balance for new users
        const newBalance = await this.prisma.tokenBalance.create({
          data: {
            userId,
            tenantId,
            sparks: 0,
            gems: 0,
            voice: 0,
            stakedSparks: 0,
            stakedGems: 0,
            stakedVoice: 0,
            lifetimeSparksEarned: 0,
            lifetimeGemsEarned: 0,
            lifetimeVoiceEarned: 0,
            lastEarnedAt: new Date(),
          },
        });

        await this.cacheBalance(newBalance as unknown as TokenBalance);
        return { success: true, data: newBalance as unknown as TokenBalance };
      }

      await this.cacheBalance(balance as unknown as TokenBalance);
      return { success: true, data: balance as unknown as TokenBalance };
    } catch (error) {
      return { success: false, error: `Failed to get balance: ${(error as Error).message}` };
    }
  }

  private async cacheBalance(balance: TokenBalance): Promise<void> {
    await this.redis.set(
      `balance:${balance.tenantId}:${balance.userId}`,
      JSON.stringify(balance),
      { EX: 300 }, // 5-minute cache
    );
  }

  // ── Earning ─────────────────────────────────────────────────────────────

  async processEarning(event: EarningEvent): Promise<Result<TokenTransaction>> {
    const rule = this.earningRules.get(event.category);
    if (!rule) {
      return { success: false, error: `Unknown earning category: ${event.category}` };
    }

    // 1. Get user age for guardrails
    const ageResult = await this.getUserAge(event.userId, event.tenantId);
    if (!ageResult.success) return { success: false, error: ageResult.error };
    const age = ageResult.data!;

    // 2. Check age eligibility
    if (age < rule.minAge || age > rule.maxAge) {
      return { success: false, error: `User age ${age} outside eligible range [${rule.minAge}-${rule.maxAge}]` };
    }

    // 3. Get age guardrails
    const guardrails = this.getGuardrailsForAge(age);
    if (!guardrails) {
      return { success: false, error: `No guardrails configured for age ${age}` };
    }

    // 4. Check rate limits
    const rateLimitResult = await this.checkRateLimit(event.userId, event.category, rule, guardrails);
    if (!rateLimitResult.success) return rateLimitResult as Result<TokenTransaction>;

    // 5. Calculate amount with multipliers
    let amount = rule.baseAmount;
    for (const factor of rule.multiplierFactors) {
      if (this.evaluateCondition(factor.condition, event.performanceData)) {
        amount = Math.floor(amount * factor.multiplier);
      }
    }

    // 6. Apply daily cap
    const dailyCap = this.getDailyCap(rule.tokenType, guardrails);
    const currentDailyEarned = await this.getDailyEarned(event.userId, event.tenantId, rule.tokenType);
    if (currentDailyEarned + amount > dailyCap) {
      amount = Math.max(0, dailyCap - currentDailyEarned);
      if (amount === 0) {
        return { success: false, error: `Daily ${rule.tokenType} cap reached (${dailyCap})` };
      }
    }

    // 7. Execute transaction atomically
    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        const balance = await tx.tokenBalance.findUnique({
          where: { userId_tenantId: { userId: event.userId, tenantId: event.tenantId } },
        });

        const currentBalance = balance ? this.getTokenBalance(balance, rule.tokenType) : 0;
        const newBalance = currentBalance + amount;

        // Update balance
        const updateData = this.buildBalanceUpdate(rule.tokenType, amount, 'earn');
        await tx.tokenBalance.upsert({
          where: { userId_tenantId: { userId: event.userId, tenantId: event.tenantId } },
          create: {
            userId: event.userId,
            tenantId: event.tenantId,
            ...this.initialBalanceWithAmount(rule.tokenType, amount),
            lastEarnedAt: event.timestamp,
          },
          update: {
            ...updateData,
            lastEarnedAt: event.timestamp,
          },
        });

        // Record transaction
        const transaction = await tx.tokenTransaction.create({
          data: {
            userId: event.userId,
            tenantId: event.tenantId,
            tokenType: rule.tokenType,
            transactionType: TransactionType.EARN,
            amount,
            balanceBefore: currentBalance,
            balanceAfter: newBalance,
            category: event.category,
            referenceId: event.referenceId,
            referenceType: event.referenceType,
            metadata: event.performanceData,
          },
        });

        return transaction;
      });

      // 8. Invalidate cache
      await this.redis.del(`balance:${event.tenantId}:${event.userId}`);

      // 9. Publish event
      await this.nats.publish(`scholarly.tokens.earned`, {
        userId: event.userId,
        tenantId: event.tenantId,
        tokenType: rule.tokenType,
        amount,
        category: event.category,
        referenceId: event.referenceId,
        timestamp: event.timestamp.toISOString(),
      });

      // 10. Update rate limit state
      await this.updateRateLimit(event.userId, event.category, amount);

      return { success: true, data: result as unknown as TokenTransaction };
    } catch (error) {
      return { success: false, error: `Transaction failed: ${(error as Error).message}` };
    }
  }

  // ── Spending ────────────────────────────────────────────────────────────

  async processSpend(request: SpendRequest): Promise<Result<TokenTransaction>> {
    const option = this.getSpendingOption(request.category);
    if (!option) {
      return { success: false, error: `Unknown spending category: ${request.category}` };
    }

    const totalCost = option.cost * request.quantity;

    // 1. Age check
    const ageResult = await this.getUserAge(request.userId, request.tenantId);
    if (!ageResult.success) return { success: false, error: ageResult.error };
    const age = ageResult.data!;

    if (age < option.minAge) {
      return { success: false, error: `User must be at least ${option.minAge} to purchase ${request.category}` };
    }

    // 2. Balance check
    const balanceResult = await this.getBalance(request.userId, request.tenantId);
    if (!balanceResult.success) return { success: false, error: balanceResult.error };
    const currentBalance = this.getTokenBalanceFromObj(balanceResult.data!, option.tokenType);

    if (currentBalance < totalCost) {
      return {
        success: false,
        error: `Insufficient ${option.tokenType}: need ${totalCost}, have ${currentBalance}`,
      };
    }

    // 3. Cooldown check
    if (option.cooldownHours > 0) {
      const lastPurchase = await this.getLastPurchase(request.userId, request.tenantId, request.category);
      if (lastPurchase) {
        const cooldownMs = option.cooldownHours * 60 * 60 * 1000;
        const timeSinceLastMs = Date.now() - lastPurchase.getTime();
        if (timeSinceLastMs < cooldownMs) {
          const remainingHours = Math.ceil((cooldownMs - timeSinceLastMs) / (60 * 60 * 1000));
          return { success: false, error: `Cooldown active: ${remainingHours} hours remaining` };
        }
      }
    }

    // 4. Execute
    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        const updateData = this.buildBalanceUpdate(option.tokenType, totalCost, 'spend');
        await tx.tokenBalance.update({
          where: { userId_tenantId: { userId: request.userId, tenantId: request.tenantId } },
          data: {
            ...updateData,
            lastSpentAt: new Date(),
          },
        });

        return tx.tokenTransaction.create({
          data: {
            userId: request.userId,
            tenantId: request.tenantId,
            tokenType: option.tokenType,
            transactionType: TransactionType.SPEND,
            amount: totalCost,
            balanceBefore: currentBalance,
            balanceAfter: currentBalance - totalCost,
            category: request.category,
            referenceId: request.referenceId || null,
            referenceType: 'PURCHASE',
            metadata: request.metadata || {},
          },
        });
      });

      await this.redis.del(`balance:${request.tenantId}:${request.userId}`);

      await this.nats.publish(`scholarly.tokens.spent`, {
        userId: request.userId,
        tenantId: request.tenantId,
        tokenType: option.tokenType,
        amount: totalCost,
        category: request.category,
        timestamp: new Date().toISOString(),
      });

      return { success: true, data: result as unknown as TokenTransaction };
    } catch (error) {
      return { success: false, error: `Spend failed: ${(error as Error).message}` };
    }
  }

  // ── Staking ─────────────────────────────────────────────────────────────

  async processStake(request: StakeRequest): Promise<Result<StakePosition>> {
    const config = this.stakeConfigs.get(request.poolType);
    if (!config) {
      return { success: false, error: `Unknown stake pool type: ${request.poolType}` };
    }

    if (request.tokenType !== config.tokenType) {
      return { success: false, error: `Pool ${request.poolType} requires ${config.tokenType}, got ${request.tokenType}` };
    }

    if (request.amount < config.minStake || request.amount > config.maxStake) {
      return { success: false, error: `Stake amount must be between ${config.minStake} and ${config.maxStake}` };
    }

    // Age + capability check
    const ageResult = await this.getUserAge(request.userId, request.tenantId);
    if (!ageResult.success) return { success: false, error: ageResult.error };
    const guardrails = this.getGuardrailsForAge(ageResult.data!);
    if (!guardrails || !guardrails.canStake) {
      return { success: false, error: 'User is not eligible for staking at this age' };
    }

    // Balance check
    const balanceResult = await this.getBalance(request.userId, request.tenantId);
    if (!balanceResult.success) return { success: false, error: balanceResult.error };
    const available = this.getTokenBalanceFromObj(balanceResult.data!, request.tokenType);
    if (available < request.amount) {
      return { success: false, error: `Insufficient ${request.tokenType}: need ${request.amount}, have ${available}` };
    }

    const lockedUntil = new Date(Date.now() + config.lockDurationDays * 24 * 60 * 60 * 1000);

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        // Deduct from available, add to staked
        const deductUpdate = this.buildBalanceUpdate(request.tokenType, request.amount, 'spend');
        const stakeUpdate = this.buildStakeBalanceUpdate(request.tokenType, request.amount, 'stake');

        await tx.tokenBalance.update({
          where: { userId_tenantId: { userId: request.userId, tenantId: request.tenantId } },
          data: { ...deductUpdate, ...stakeUpdate },
        });

        // Create stake position
        const position = await tx.stakePosition.create({
          data: {
            userId: request.userId,
            tenantId: request.tenantId,
            poolType: request.poolType,
            poolId: request.poolId,
            tokenType: request.tokenType,
            amount: request.amount,
            lockedUntil,
            yieldAccrued: 0,
            status: 'ACTIVE',
          },
        });

        // Record transaction
        await tx.tokenTransaction.create({
          data: {
            userId: request.userId,
            tenantId: request.tenantId,
            tokenType: request.tokenType,
            transactionType: TransactionType.STAKE,
            amount: request.amount,
            balanceBefore: available,
            balanceAfter: available - request.amount,
            category: null,
            referenceId: position.id,
            referenceType: 'STAKE_POSITION',
            metadata: { poolType: request.poolType, poolId: request.poolId, lockedUntil: lockedUntil.toISOString() },
          },
        });

        return position;
      });

      await this.redis.del(`balance:${request.tenantId}:${request.userId}`);

      await this.nats.publish(`scholarly.tokens.staked`, {
        userId: request.userId,
        tenantId: request.tenantId,
        poolType: request.poolType,
        poolId: request.poolId,
        tokenType: request.tokenType,
        amount: request.amount,
        lockedUntil: lockedUntil.toISOString(),
      });

      return { success: true, data: result as unknown as StakePosition };
    } catch (error) {
      return { success: false, error: `Stake failed: ${(error as Error).message}` };
    }
  }

  async processUnstake(request: UnstakeRequest): Promise<Result<TokenTransaction>> {
    try {
      const position = await this.prisma.stakePosition.findUnique({
        where: { id: request.stakePositionId },
      });

      if (!position || position.userId !== request.userId || position.tenantId !== request.tenantId) {
        return { success: false, error: 'Stake position not found' };
      }

      if (position.status !== 'ACTIVE') {
        return { success: false, error: `Cannot unstake: position is ${position.status}` };
      }

      const config = this.stakeConfigs.get(position.poolType as StakePoolType);
      if (!config) {
        return { success: false, error: `Unknown pool type: ${position.poolType}` };
      }

      const now = new Date();
      const isEarly = now < new Date(position.lockedUntil);

      if (isEarly && config.earlyWithdrawalPenalty >= 100) {
        return { success: false, error: 'Early withdrawal not permitted for this pool type' };
      }

      let returnAmount = position.amount + position.yieldAccrued;
      if (isEarly) {
        const penalty = Math.floor(position.amount * (config.earlyWithdrawalPenalty / 100));
        returnAmount = Math.max(0, returnAmount - penalty);
      }

      const result = await this.prisma.$transaction(async (tx: any) => {
        // Update position
        await tx.stakePosition.update({
          where: { id: request.stakePositionId },
          data: { status: 'WITHDRAWN', updatedAt: now },
        });

        // Return tokens to available balance
        const stakeUpdate = this.buildStakeBalanceUpdate(position.tokenType as TokenType, position.amount, 'unstake');
        const addUpdate = this.buildBalanceUpdate(position.tokenType as TokenType, returnAmount, 'earn');

        await tx.tokenBalance.update({
          where: { userId_tenantId: { userId: request.userId, tenantId: request.tenantId } },
          data: { ...stakeUpdate, ...addUpdate },
        });

        // Record transaction
        return tx.tokenTransaction.create({
          data: {
            userId: request.userId,
            tenantId: request.tenantId,
            tokenType: position.tokenType,
            transactionType: TransactionType.UNSTAKE,
            amount: returnAmount,
            balanceBefore: 0, // Will be set from actual balance
            balanceAfter: returnAmount,
            category: null,
            referenceId: request.stakePositionId,
            referenceType: 'STAKE_POSITION',
            metadata: {
              originalAmount: position.amount,
              yieldAccrued: position.yieldAccrued,
              earlyWithdrawal: isEarly,
              penaltyApplied: isEarly ? config.earlyWithdrawalPenalty : 0,
              returnAmount,
            },
          },
        });
      });

      await this.redis.del(`balance:${request.tenantId}:${request.userId}`);

      await this.nats.publish(`scholarly.tokens.unstaked`, {
        userId: request.userId,
        tenantId: request.tenantId,
        stakePositionId: request.stakePositionId,
        returnAmount,
        earlyWithdrawal: isEarly,
      });

      return { success: true, data: result as unknown as TokenTransaction };
    } catch (error) {
      return { success: false, error: `Unstake failed: ${(error as Error).message}` };
    }
  }

  // ── Wagering (Arena Integration) ────────────────────────────────────────

  async processWager(request: WagerRequest): Promise<Result<TokenTransaction>> {
    // Age + wager eligibility
    const ageResult = await this.getUserAge(request.userId, request.tenantId);
    if (!ageResult.success) return { success: false, error: ageResult.error };
    const guardrails = this.getGuardrailsForAge(ageResult.data!);
    if (!guardrails || !guardrails.canWager) {
      return { success: false, error: 'User is not eligible for wagering at this age' };
    }
    if (request.amount > guardrails.maxWagerAmount) {
      return { success: false, error: `Wager exceeds maximum: ${guardrails.maxWagerAmount}` };
    }

    // Session loss cap check
    const sessionLosses = await this.getSessionLosses(request.userId, request.tenantId);
    if (sessionLosses >= CONSOLATION_CONFIG.lossCapPerSession) {
      return { success: false, error: 'Session loss cap reached. Try again in the next session.' };
    }

    // Balance check
    const balanceResult = await this.getBalance(request.userId, request.tenantId);
    if (!balanceResult.success) return { success: false, error: balanceResult.error };
    const available = this.getTokenBalanceFromObj(balanceResult.data!, request.tokenType);
    if (available < request.amount) {
      return { success: false, error: `Insufficient ${request.tokenType}` };
    }

    try {
      const result = await this.prisma.$transaction(async (tx: any) => {
        const updateData = this.buildBalanceUpdate(request.tokenType, request.amount, 'spend');
        await tx.tokenBalance.update({
          where: { userId_tenantId: { userId: request.userId, tenantId: request.tenantId } },
          data: updateData,
        });

        return tx.tokenTransaction.create({
          data: {
            userId: request.userId,
            tenantId: request.tenantId,
            tokenType: request.tokenType,
            transactionType: TransactionType.WAGER,
            amount: request.amount,
            balanceBefore: available,
            balanceAfter: available - request.amount,
            category: null,
            referenceId: request.competitionId,
            referenceType: 'ARENA_COMPETITION',
            metadata: {},
          },
        });
      });

      await this.redis.del(`balance:${request.tenantId}:${request.userId}`);
      return { success: true, data: result as unknown as TokenTransaction };
    } catch (error) {
      return { success: false, error: `Wager failed: ${(error as Error).message}` };
    }
  }

  async resolveWager(
    competitionId: string,
    tenantId: string,
    winners: { userId: string; share: number }[],
    losers: { userId: string; wageredAmount: number }[],
    totalPool: number,
  ): Promise<Result<{ winnerPayouts: TokenTransaction[]; consolationPayouts: TokenTransaction[] }>> {
    try {
      const winnerPayouts: TokenTransaction[] = [];
      const consolationPayouts: TokenTransaction[] = [];

      await this.prisma.$transaction(async (tx: any) => {
        // Pay winners
        for (const winner of winners) {
          const winAmount = Math.floor(totalPool * winner.share);
          const balance = await tx.tokenBalance.findUnique({
            where: { userId_tenantId: { userId: winner.userId, tenantId } },
          });
          const currentBalance = balance ? balance.sparks : 0;

          await tx.tokenBalance.update({
            where: { userId_tenantId: { userId: winner.userId, tenantId } },
            data: { sparks: { increment: winAmount } },
          });

          const txn = await tx.tokenTransaction.create({
            data: {
              userId: winner.userId,
              tenantId,
              tokenType: TokenType.SPARKS,
              transactionType: TransactionType.WAGER_WIN,
              amount: winAmount,
              balanceBefore: currentBalance,
              balanceAfter: currentBalance + winAmount,
              category: null,
              referenceId: competitionId,
              referenceType: 'ARENA_COMPETITION',
              metadata: { share: winner.share, totalPool },
            },
          });
          winnerPayouts.push(txn as unknown as TokenTransaction);
        }

        // Pay consolation to losers
        if (CONSOLATION_CONFIG.enabled) {
          for (const loser of losers) {
            const consolationAmount = Math.max(
              CONSOLATION_CONFIG.minConsolation,
              Math.floor(loser.wageredAmount * (CONSOLATION_CONFIG.consolationPercentage / 100)),
            );

            const balance = await tx.tokenBalance.findUnique({
              where: { userId_tenantId: { userId: loser.userId, tenantId } },
            });
            const currentBalance = balance ? balance.sparks : 0;

            await tx.tokenBalance.update({
              where: { userId_tenantId: { userId: loser.userId, tenantId } },
              data: { sparks: { increment: consolationAmount } },
            });

            const txn = await tx.tokenTransaction.create({
              data: {
                userId: loser.userId,
                tenantId,
                tokenType: TokenType.SPARKS,
                transactionType: TransactionType.CONSOLATION,
                amount: consolationAmount,
                balanceBefore: currentBalance,
                balanceAfter: currentBalance + consolationAmount,
                category: null,
                referenceId: competitionId,
                referenceType: 'ARENA_COMPETITION',
                metadata: { wageredAmount: loser.wageredAmount, consolationPercentage: CONSOLATION_CONFIG.consolationPercentage },
              },
            });
            consolationPayouts.push(txn as unknown as TokenTransaction);
          }
        }
      });

      // Invalidate caches for all participants
      for (const w of winners) await this.redis.del(`balance:${tenantId}:${w.userId}`);
      for (const l of losers) await this.redis.del(`balance:${tenantId}:${l.userId}`);

      await this.nats.publish(`scholarly.tokens.wager_resolved`, {
        competitionId,
        tenantId,
        winnersCount: winners.length,
        losersCount: losers.length,
        totalPool,
        consolationPaid: consolationPayouts.reduce((s, t) => s + t.amount, 0),
      });

      return { success: true, data: { winnerPayouts, consolationPayouts } };
    } catch (error) {
      return { success: false, error: `Wager resolution failed: ${(error as Error).message}` };
    }
  }

  // ── Yield Accrual (Savings Pools) ───────────────────────────────────────

  async accrueYields(tenantId: string): Promise<Result<{ positionsUpdated: number; totalYield: number }>> {
    try {
      const activePositions = await this.prisma.stakePosition.findMany({
        where: {
          tenantId,
          status: 'ACTIVE',
          poolType: { in: [StakePoolType.SAVINGS_POOL, StakePoolType.CREATOR_BOND] },
        },
      });

      let positionsUpdated = 0;
      let totalYield = 0;

      for (const position of activePositions) {
        const config = this.stakeConfigs.get(position.poolType as StakePoolType);
        if (!config || config.yieldPercentage === 0) continue;

        // Daily yield = (annual % / 365) * staked amount
        const dailyYield = Math.max(1, Math.floor((config.yieldPercentage / 100 / 365) * position.amount));

        await this.prisma.stakePosition.update({
          where: { id: position.id },
          data: { yieldAccrued: { increment: dailyYield } },
        });

        positionsUpdated++;
        totalYield += dailyYield;
      }

      return { success: true, data: { positionsUpdated, totalYield } };
    } catch (error) {
      return { success: false, error: `Yield accrual failed: ${(error as Error).message}` };
    }
  }

  // ── Transaction History ─────────────────────────────────────────────────

  async getTransactionHistory(
    userId: string,
    tenantId: string,
    options: { tokenType?: TokenType; limit?: number; offset?: number; fromDate?: Date; toDate?: Date },
  ): Promise<Result<{ transactions: TokenTransaction[]; total: number }>> {
    try {
      const where: any = { userId, tenantId };
      if (options.tokenType) where.tokenType = options.tokenType;
      if (options.fromDate || options.toDate) {
        where.createdAt = {};
        if (options.fromDate) where.createdAt.gte = options.fromDate;
        if (options.toDate) where.createdAt.lte = options.toDate;
      }

      const [transactions, total] = await Promise.all([
        this.prisma.tokenTransaction.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          take: options.limit || 50,
          skip: options.offset || 0,
        }),
        this.prisma.tokenTransaction.count({ where }),
      ]);

      return { success: true, data: { transactions: transactions as unknown as TokenTransaction[], total } };
    } catch (error) {
      return { success: false, error: `History fetch failed: ${(error as Error).message}` };
    }
  }

  // ── Leaderboards ────────────────────────────────────────────────────────

  async getLeaderboard(
    tenantId: string,
    tokenType: TokenType,
    options: { period: 'daily' | 'weekly' | 'monthly' | 'allTime'; limit?: number },
  ): Promise<Result<{ entries: { userId: string; amount: number; rank: number }[] }>> {
    try {
      let dateFilter: Date | undefined;
      const now = new Date();
      switch (options.period) {
        case 'daily': dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate()); break;
        case 'weekly': dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000); break;
        case 'monthly': dateFilter = new Date(now.getFullYear(), now.getMonth(), 1); break;
        case 'allTime': dateFilter = undefined; break;
      }

      const where: any = {
        tenantId,
        tokenType,
        transactionType: TransactionType.EARN,
      };
      if (dateFilter) where.createdAt = { gte: dateFilter };

      const grouped = await this.prisma.tokenTransaction.groupBy({
        by: ['userId'],
        where,
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: options.limit || 100,
      });

      const entries = grouped.map((g: any, index: number) => ({
        userId: g.userId,
        amount: g._sum.amount || 0,
        rank: index + 1,
      }));

      return { success: true, data: { entries } };
    } catch (error) {
      return { success: false, error: `Leaderboard fetch failed: ${(error as Error).message}` };
    }
  }

  // ── Economy Health Metrics ──────────────────────────────────────────────

  async getEconomyMetrics(tenantId: string): Promise<Result<{
    totalSparksCirculating: number;
    totalGemsCirculating: number;
    totalVoiceCirculating: number;
    totalStaked: number;
    dailyMintRate: number;
    dailyBurnRate: number;
    velocity: number; // transactions per token per day
    giniCoefficient: number; // wealth inequality measure
    activeUsers24h: number;
  }>> {
    try {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const [balanceAggs, dailyEarnings, dailySpending, dailyActive] = await Promise.all([
        this.prisma.tokenBalance.aggregate({
          where: { tenantId },
          _sum: {
            sparks: true,
            gems: true,
            voice: true,
            stakedSparks: true,
            stakedGems: true,
            stakedVoice: true,
          },
        }),
        this.prisma.tokenTransaction.aggregate({
          where: { tenantId, transactionType: TransactionType.EARN, createdAt: { gte: yesterday } },
          _sum: { amount: true },
        }),
        this.prisma.tokenTransaction.aggregate({
          where: { tenantId, transactionType: TransactionType.SPEND, createdAt: { gte: yesterday } },
          _sum: { amount: true },
        }),
        this.prisma.tokenTransaction.findMany({
          where: { tenantId, createdAt: { gte: yesterday } },
          distinct: ['userId'],
          select: { userId: true },
        }),
      ]);

      const totalCirculating =
        (balanceAggs._sum.sparks || 0) + (balanceAggs._sum.gems || 0) + (balanceAggs._sum.voice || 0);
      const totalStaked =
        (balanceAggs._sum.stakedSparks || 0) + (balanceAggs._sum.stakedGems || 0) + (balanceAggs._sum.stakedVoice || 0);
      const dailyMintRate = dailyEarnings._sum.amount || 0;
      const dailyBurnRate = dailySpending._sum.amount || 0;
      const velocity = totalCirculating > 0 ? dailyMintRate / totalCirculating : 0;

      // Simplified Gini — proper implementation would need all balances sorted
      const giniCoefficient = await this.calculateGini(tenantId);

      return {
        success: true,
        data: {
          totalSparksCirculating: balanceAggs._sum.sparks || 0,
          totalGemsCirculating: balanceAggs._sum.gems || 0,
          totalVoiceCirculating: balanceAggs._sum.voice || 0,
          totalStaked,
          dailyMintRate,
          dailyBurnRate,
          velocity,
          giniCoefficient,
          activeUsers24h: dailyActive.length,
        },
      };
    } catch (error) {
      return { success: false, error: `Metrics fetch failed: ${(error as Error).message}` };
    }
  }

  // ── Helper Methods ──────────────────────────────────────────────────────

  private async getUserAge(userId: string, tenantId: string): Promise<Result<number>> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { dateOfBirth: true },
      });
      if (!user?.dateOfBirth) {
        return { success: false, error: 'User date of birth not set' };
      }
      const age = Math.floor((Date.now() - new Date(user.dateOfBirth).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
      return { success: true, data: age };
    } catch (error) {
      return { success: false, error: `Age lookup failed: ${(error as Error).message}` };
    }
  }

  private getGuardrailsForAge(age: number): AgeGuardrails | null {
    for (const [, guardrails] of this.ageGuardrails) {
      if (age >= guardrails.minAge && age <= guardrails.maxAge) {
        return guardrails;
      }
    }
    return null;
  }

  private getDailyCap(tokenType: TokenType, guardrails: AgeGuardrails): number {
    switch (tokenType) {
      case TokenType.SPARKS: return guardrails.maxDailySparks;
      case TokenType.GEMS: return guardrails.maxDailyGems;
      case TokenType.VOICE: return guardrails.maxDailyVoice;
    }
  }

  private getTokenBalance(balance: any, tokenType: TokenType): number {
    switch (tokenType) {
      case TokenType.SPARKS: return balance.sparks || 0;
      case TokenType.GEMS: return balance.gems || 0;
      case TokenType.VOICE: return balance.voice || 0;
    }
  }

  private getTokenBalanceFromObj(balance: TokenBalance, tokenType: TokenType): number {
    switch (tokenType) {
      case TokenType.SPARKS: return balance.sparks;
      case TokenType.GEMS: return balance.gems;
      case TokenType.VOICE: return balance.voice;
    }
  }

  private buildBalanceUpdate(tokenType: TokenType, amount: number, direction: 'earn' | 'spend'): Record<string, any> {
    const field = tokenType.toLowerCase();
    const lifetimeField = `lifetime${tokenType.charAt(0)}${tokenType.slice(1).toLowerCase()}Earned`;
    const update: Record<string, any> = {};

    if (direction === 'earn') {
      update[field] = { increment: amount };
      update[lifetimeField] = { increment: amount };
    } else {
      update[field] = { decrement: amount };
    }

    return update;
  }

  private buildStakeBalanceUpdate(tokenType: TokenType, amount: number, direction: 'stake' | 'unstake'): Record<string, any> {
    const field = `staked${tokenType.charAt(0)}${tokenType.slice(1).toLowerCase()}`;
    return direction === 'stake'
      ? { [field]: { increment: amount } }
      : { [field]: { decrement: amount } };
  }

  private initialBalanceWithAmount(tokenType: TokenType, amount: number): Record<string, number> {
    return {
      sparks: tokenType === TokenType.SPARKS ? amount : 0,
      gems: tokenType === TokenType.GEMS ? amount : 0,
      voice: tokenType === TokenType.VOICE ? amount : 0,
      stakedSparks: 0,
      stakedGems: 0,
      stakedVoice: 0,
      lifetimeSparksEarned: tokenType === TokenType.SPARKS ? amount : 0,
      lifetimeGemsEarned: tokenType === TokenType.GEMS ? amount : 0,
      lifetimeVoiceEarned: tokenType === TokenType.VOICE ? amount : 0,
    };
  }

  private evaluateCondition(condition: string, data: Record<string, unknown>): boolean {
    // Simplified condition evaluator — production would use a proper expression parser
    const parts = condition.split(' ');
    if (parts.length === 1) {
      return !!data[parts[0]];
    }
    if (parts.length === 3) {
      const [field, op, value] = parts;
      const actual = data[field] as number;
      const target = parseFloat(value.replace('%', ''));
      switch (op) {
        case '>=': return actual >= target;
        case '<=': return actual <= target;
        case '>': return actual > target;
        case '<': return actual < target;
        case '==': return actual === target;
        default: return false;
      }
    }
    return false;
  }

  private async checkRateLimit(
    userId: string,
    category: EarningCategory,
    rule: EarningRule,
    guardrails: AgeGuardrails,
  ): Promise<Result<void>> {
    const key = `rateLimit:${userId}:${category}`;
    const cached = this.rateLimitCache.get(key);

    if (cached) {
      const now = new Date();
      if (now >= cached.resetDailyAt) {
        cached.dailyCount = 0;
        cached.dailyAmount = 0;
        cached.resetDailyAt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }
      if (now >= cached.resetWeeklyAt) {
        cached.weeklyCount = 0;
        cached.weeklyAmount = 0;
        const nextMonday = new Date(now);
        nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);
        cached.resetWeeklyAt = nextMonday;
      }

      if (cached.dailyAmount >= rule.dailyCap) {
        return { success: false, error: `Daily cap reached for ${category}` };
      }
      if (cached.weeklyAmount >= rule.weeklyCap) {
        return { success: false, error: `Weekly cap reached for ${category}` };
      }

      if (rule.cooldownMinutes > 0 && cached.lastEarnedAt) {
        const cooldownMs = rule.cooldownMinutes * 60 * 1000;
        if (now.getTime() - cached.lastEarnedAt.getTime() < cooldownMs) {
          return { success: false, error: `Cooldown active for ${category}` };
        }
      }
    }

    return { success: true, data: undefined };
  }

  private async updateRateLimit(userId: string, category: EarningCategory, amount: number): Promise<void> {
    const key = `rateLimit:${userId}:${category}`;
    const existing = this.rateLimitCache.get(key);
    const now = new Date();

    if (existing) {
      existing.dailyCount++;
      existing.dailyAmount += amount;
      existing.weeklyCount++;
      existing.weeklyAmount += amount;
      existing.lastEarnedAt = now;
    } else {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const nextMonday = new Date(now);
      nextMonday.setDate(now.getDate() + (8 - now.getDay()) % 7);

      this.rateLimitCache.set(key, {
        userId,
        category,
        dailyCount: 1,
        dailyAmount: amount,
        weeklyCount: 1,
        weeklyAmount: amount,
        lastEarnedAt: now,
        resetDailyAt: tomorrow,
        resetWeeklyAt: nextMonday,
      });
    }
  }

  private async getDailyEarned(userId: string, tenantId: string, tokenType: TokenType): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const result = await this.prisma.tokenTransaction.aggregate({
      where: {
        userId,
        tenantId,
        tokenType,
        transactionType: TransactionType.EARN,
        createdAt: { gte: today },
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private async getLastPurchase(userId: string, tenantId: string, category: SpendingCategory): Promise<Date | null> {
    const last = await this.prisma.tokenTransaction.findFirst({
      where: { userId, tenantId, transactionType: TransactionType.SPEND, category },
      orderBy: { createdAt: 'desc' },
      select: { createdAt: true },
    });
    return last?.createdAt || null;
  }

  private async getSessionLosses(userId: string, tenantId: string): Promise<number> {
    // Session = last 2 hours of activity
    const sessionStart = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const result = await this.prisma.tokenTransaction.aggregate({
      where: {
        userId,
        tenantId,
        transactionType: TransactionType.WAGER_LOSS,
        createdAt: { gte: sessionStart },
      },
      _sum: { amount: true },
    });
    return result._sum.amount || 0;
  }

  private async calculateGini(tenantId: string): Promise<number> {
    const balances = await this.prisma.tokenBalance.findMany({
      where: { tenantId },
      select: { sparks: true, gems: true, voice: true },
      orderBy: { sparks: 'asc' },
    });

    if (balances.length <= 1) return 0;

    const totalWealth = balances.map((b: any) => b.sparks + b.gems + b.voice);
    const sorted = totalWealth.sort((a: number, b: number) => a - b);
    const n = sorted.length;
    const mean = sorted.reduce((s: number, v: number) => s + v, 0) / n;

    if (mean === 0) return 0;

    let sumOfDifferences = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        sumOfDifferences += Math.abs(sorted[i] - sorted[j]);
      }
    }

    return sumOfDifferences / (2 * n * n * mean);
  }

  private getSpendingOption(category: SpendingCategory): SpendingOption | null {
    const options: SpendingOption[] = [
      { category: SpendingCategory.AVATAR_CUSTOMISATION, tokenType: TokenType.SPARKS, cost: 20, description: 'Customise your avatar', minAge: 3, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.LIBRARY_THEME, tokenType: TokenType.SPARKS, cost: 50, description: 'Unlock a library theme', minAge: 3, repeatable: false, cooldownHours: 0 },
      { category: SpendingCategory.NARRATOR_VOICE, tokenType: TokenType.SPARKS, cost: 30, description: 'Unlock a narrator voice', minAge: 3, repeatable: false, cooldownHours: 0 },
      { category: SpendingCategory.READING_EFFECT, tokenType: TokenType.SPARKS, cost: 15, description: 'Unlock a reading effect', minAge: 3, repeatable: false, cooldownHours: 0 },
      { category: SpendingCategory.BADGE_UPGRADE, tokenType: TokenType.SPARKS, cost: 25, description: 'Upgrade a badge', minAge: 5, repeatable: true, cooldownHours: 24 },
      { category: SpendingCategory.HINT_PURCHASE, tokenType: TokenType.SPARKS, cost: 5, description: 'Buy a reading hint', minAge: 5, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.ARENA_ENTRY_FEE, tokenType: TokenType.SPARKS, cost: 10, description: 'Enter a premium Arena event', minAge: 5, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.TEAM_DECORATION, tokenType: TokenType.SPARKS, cost: 40, description: 'Decorate team space', minAge: 8, repeatable: true, cooldownHours: 12 },
      { category: SpendingCategory.PET_COMPANION, tokenType: TokenType.SPARKS, cost: 100, description: 'Adopt a reading companion pet', minAge: 3, repeatable: false, cooldownHours: 0 },
      { category: SpendingCategory.STICKER_PACK, tokenType: TokenType.SPARKS, cost: 10, description: 'Sticker pack', minAge: 3, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.PREMIUM_STORY_UNLOCK, tokenType: TokenType.GEMS, cost: 20, description: 'Unlock a premium storybook', minAge: 3, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.ART_STYLE_UNLOCK, tokenType: TokenType.GEMS, cost: 30, description: 'Unlock an illustration art style', minAge: 8, repeatable: false, cooldownHours: 0 },
      { category: SpendingCategory.ADVANCED_ANALYTICS, tokenType: TokenType.GEMS, cost: 50, description: 'Access advanced reading analytics', minAge: 16, repeatable: false, cooldownHours: 0 },
      { category: SpendingCategory.CUSTOM_CHARACTER, tokenType: TokenType.GEMS, cost: 40, description: 'Create a custom storybook character', minAge: 8, repeatable: true, cooldownHours: 24 },
      { category: SpendingCategory.SERIES_EARLY_ACCESS, tokenType: TokenType.GEMS, cost: 25, description: 'Early access to new storybook series', minAge: 3, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.CREATOR_TOOLS_UPGRADE, tokenType: TokenType.GEMS, cost: 100, description: 'Unlock premium creator tools', minAge: 16, repeatable: false, cooldownHours: 0 },
      { category: SpendingCategory.CERTIFICATE_GENERATION, tokenType: TokenType.GEMS, cost: 15, description: 'Generate a reading achievement certificate', minAge: 3, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.GOVERNANCE_VOTE, tokenType: TokenType.VOICE, cost: 1, description: 'Cast a governance vote', minAge: 13, repeatable: true, cooldownHours: 0 },
      { category: SpendingCategory.PROPOSAL_CREATION, tokenType: TokenType.VOICE, cost: 10, description: 'Create a governance proposal', minAge: 16, repeatable: true, cooldownHours: 168 },
      { category: SpendingCategory.FEATURE_PRIORITISATION, tokenType: TokenType.VOICE, cost: 5, description: 'Vote on feature prioritisation', minAge: 13, repeatable: true, cooldownHours: 24 },
      { category: SpendingCategory.CONTENT_CURATION, tokenType: TokenType.VOICE, cost: 3, description: 'Curate featured content', minAge: 16, repeatable: true, cooldownHours: 12 },
    ];

    return options.find((o) => o.category === category) || null;
  }

  // ── Public API: Earning Rules & Configs ─────────────────────────────────

  getEarningRules(): EarningRule[] {
    return EARNING_RULES;
  }

  getAgeGuardrails(): AgeGuardrails[] {
    return AGE_GUARDRAILS;
  }

  getStakeConfigs(): StakeConfig[] {
    return STAKE_CONFIGS;
  }

  getConsolationConfig(): ConsolationConfig {
    return CONSOLATION_CONFIG;
  }
}
