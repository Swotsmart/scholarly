/**
 * Arena API Client
 * Handles all API interactions for the competitive learning arena,
 * tournaments, teams, community, tokens, governance, and bounties.
 */

import type {
  ArenaCompetition,
  ArenaTeam,
  ArenaTeamMember,
  ArenaTeamTrade,
  ArenaTeamChallenge,
  ArenaTreasuryVote,
  TokenBalance,
  ArenaTokenTransaction,
  ArenaStakePosition,
  ContentBounty,
  BountySubmission,
  ArenaProposal,
  ArenaVote,
  ArenaDelegation,
  DaoTreasury,
  DaoTreasuryTransaction,
  GovernanceStats,
  UserCompetitionStats,
  LeaderboardEntry,
  CreatorProfile,
  CreatorAnalytics,
  OnboardingChecklist,
  TokenEconomyMetrics,
  CommunityHealthMetrics,
  CommunityFeedItem,
} from '@/types/arena';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// =============================================================================
// DEMO DATA
// =============================================================================

const DEMO_COMPETITIONS: ArenaCompetition[] = [
  {
    id: 'comp_kl3m8n9p',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_1',
    format: 'READING_SPRINT',
    title: 'Year 4 Reading Sprint — Australian Animals',
    description: 'A fast-paced reading comprehension sprint focused on Australian native animals. Read passages and answer questions to earn points!',
    config: { scoringModel: 'GROWTH_BASED', maxParticipants: 20, durationMinutes: 30 },
    status: 'REGISTRATION_OPEN',
    scheduledAt: '2026-02-12T10:00:00Z',
    currentRound: 0,
    totalRounds: 3,
    phonicsPhase: '5',
    wagerPool: 0,
    participantCount: 12,
    createdAt: '2026-02-08T09:00:00Z',
    updatedAt: '2026-02-08T09:00:00Z',
  },
  {
    id: 'comp_qr5s7t2u',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_2',
    format: 'WORD_BLITZ',
    title: 'Spelling Showdown — Bushland Vocabulary',
    description: 'Test your spelling skills with words from Australian bushland stories. Speed and accuracy both count!',
    config: { scoringModel: 'ABSOLUTE', maxParticipants: 30, durationMinutes: 15 },
    status: 'REGISTRATION_OPEN',
    scheduledAt: '2026-02-11T13:00:00Z',
    currentRound: 0,
    totalRounds: 5,
    phonicsPhase: '4',
    wagerPool: 0,
    participantCount: 8,
    createdAt: '2026-02-07T14:30:00Z',
    updatedAt: '2026-02-07T14:30:00Z',
  },
  {
    id: 'comp_wx4y6z1a',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_3',
    format: 'COMPREHENSION_QUIZ',
    title: 'Great Barrier Reef Knowledge Challenge',
    description: 'Dive deep into passages about the Great Barrier Reef and test your understanding. Collaborative scoring means everyone benefits!',
    config: { scoringModel: 'COLLABORATIVE', maxParticipants: 25, durationMinutes: 45 },
    status: 'IN_PROGRESS',
    scheduledAt: '2026-02-10T09:00:00Z',
    startedAt: '2026-02-10T09:02:00Z',
    currentRound: 2,
    totalRounds: 4,
    phonicsPhase: '6',
    wagerPool: 50,
    wagerTokenType: 'SPARKS',
    participantCount: 25,
    createdAt: '2026-02-05T08:00:00Z',
    updatedAt: '2026-02-10T09:02:00Z',
  },
  {
    id: 'comp_bc8d3e5f',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_1',
    format: 'PHONICS_DUEL',
    title: 'Phonics Phase 3 Tournament — Melbourne Schools',
    description: 'Inter-school phonics duel for Phase 3 learners. Decode words, blend sounds, and race to the finish!',
    config: { scoringModel: 'HANDICAPPED', maxParticipants: 16, durationMinutes: 20 },
    status: 'IN_PROGRESS',
    scheduledAt: '2026-02-10T11:00:00Z',
    startedAt: '2026-02-10T11:01:00Z',
    currentRound: 5,
    totalRounds: 8,
    phonicsPhase: '3',
    wagerPool: 100,
    wagerTokenType: 'GEMS',
    participantCount: 16,
    createdAt: '2026-02-03T10:00:00Z',
    updatedAt: '2026-02-10T11:01:00Z',
  },
  {
    id: 'comp_gh7i9j2k',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_2',
    format: 'TEAM_RELAY',
    title: 'Sydney Schools Team Reading Relay',
    description: 'Teams of 4 take turns reading and answering questions. The fastest team with the highest accuracy wins!',
    config: { scoringModel: 'GROWTH_BASED', maxParticipants: 32, durationMinutes: 60 },
    status: 'COMPLETED',
    scheduledAt: '2026-02-01T10:00:00Z',
    startedAt: '2026-02-01T10:03:00Z',
    completedAt: '2026-02-01T11:05:00Z',
    currentRound: 4,
    totalRounds: 4,
    phonicsPhase: '5',
    wagerPool: 200,
    wagerTokenType: 'SPARKS',
    participantCount: 32,
    createdAt: '2026-01-28T08:00:00Z',
    updatedAt: '2026-02-01T11:05:00Z',
  },
  {
    id: 'comp_lm1n4o6p',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_3',
    format: 'STORY_SHOWDOWN',
    title: 'Dreamtime Story Creation Challenge',
    description: 'Create a short story inspired by Australian Indigenous Dreamtime narratives. Culturally respectful and creative entries encouraged.',
    config: { scoringModel: 'GROWTH_BASED', maxParticipants: 40, durationMinutes: 90 },
    status: 'SCHEDULED',
    scheduledAt: '2026-02-20T09:00:00Z',
    currentRound: 0,
    totalRounds: 1,
    wagerPool: 0,
    participantCount: 0,
    createdAt: '2026-02-09T16:00:00Z',
    updatedAt: '2026-02-09T16:00:00Z',
  },
];

const DEMO_TOURNAMENTS: ArenaCompetition[] = [
  {
    id: 'tourn_abc123def',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_1',
    format: 'SINGLE_ELIMINATION',
    title: 'Term 1 Phonics Championship',
    description: 'Single-elimination tournament for phonics champions across Years 2-4. Top readers from each class compete head-to-head.',
    config: { scoringModel: 'ABSOLUTE', maxParticipants: 32, durationMinutes: 120, teamBased: false, prizePool: { xp: 500, badges: ['phonics-champion-2026'], tokens: 200 } },
    status: 'IN_PROGRESS',
    scheduledAt: '2026-02-01T09:00:00Z',
    startedAt: '2026-02-01T09:05:00Z',
    currentRound: 4,
    totalRounds: 5,
    wagerPool: 0,
    participantCount: 32,
    createdAt: '2026-01-20T08:00:00Z',
    updatedAt: '2026-02-08T10:00:00Z',
  },
  {
    id: 'tourn_ghi456jkl',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_2',
    format: 'ROUND_ROBIN',
    title: 'Victorian Schools Reading League',
    description: 'A round-robin league where teams from Victorian primary schools compete in weekly reading challenges over the term.',
    config: { scoringModel: 'GROWTH_BASED', maxParticipants: 16, durationMinutes: 60, teamBased: true, prizePool: { xp: 1000, badges: ['reading-league-winner'], tokens: 500 } },
    status: 'REGISTRATION_OPEN',
    scheduledAt: '2026-02-17T09:00:00Z',
    currentRound: 0,
    totalRounds: 15,
    wagerPool: 0,
    participantCount: 10,
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-02-05T10:00:00Z',
  },
  {
    id: 'tourn_mno789pqr',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_3',
    format: 'SWISS',
    title: 'National Spelling Bee Qualifier',
    description: 'Swiss-system tournament qualifying the top spellers for the national Scholarly Spelling Bee. Five rounds of increasingly difficult words.',
    config: { scoringModel: 'ABSOLUTE', maxParticipants: 64, durationMinutes: 180, teamBased: false, prizePool: { xp: 2000, badges: ['spelling-bee-qualifier', 'word-wizard'], tokens: 1000 } },
    status: 'COMPLETED',
    scheduledAt: '2026-01-25T09:00:00Z',
    startedAt: '2026-01-25T09:02:00Z',
    completedAt: '2026-01-25T15:30:00Z',
    currentRound: 5,
    totalRounds: 5,
    wagerPool: 0,
    participantCount: 64,
    createdAt: '2026-01-10T08:00:00Z',
    updatedAt: '2026-01-25T15:30:00Z',
  },
];

const DEMO_TEAMS: ArenaTeam[] = [
  {
    id: 'team_xyz456abc',
    tenantId: 'tenant_scholarly',
    name: 'Kookaburra Readers',
    type: 'CLASSROOM',
    description: 'Mrs Patterson\'s Year 3 class reading team from Bondi Public School',
    createdBy: 'user_teacher_1',
    maxMembers: 30,
    memberCount: 24,
    treasurySparks: 340,
    treasuryGems: 85,
    totalWins: 6,
    totalCompetitions: 14,
    xp: 4520,
    level: 8,
    streak: 3,
    isActive: true,
    createdAt: '2025-09-15T08:00:00Z',
    updatedAt: '2026-02-10T08:00:00Z',
  },
  {
    id: 'team_def789ghi',
    tenantId: 'tenant_scholarly',
    name: 'Blue Tongue Bookworms',
    type: 'SCHOOL_HOUSE',
    description: 'Warratah House reading squad — Parramatta Grammar School',
    createdBy: 'user_teacher_2',
    maxMembers: 50,
    memberCount: 42,
    treasurySparks: 1200,
    treasuryGems: 320,
    totalWins: 12,
    totalCompetitions: 28,
    xp: 8750,
    level: 14,
    streak: 5,
    isActive: true,
    createdAt: '2025-06-01T08:00:00Z',
    updatedAt: '2026-02-09T16:00:00Z',
  },
  {
    id: 'team_jkl012mno',
    tenantId: 'tenant_scholarly',
    name: 'Platypus Pioneers',
    type: 'GLOBAL_GUILD',
    description: 'An international reading guild connecting Australian and New Zealand learners who love adventure stories',
    createdBy: 'user_learner_1',
    maxMembers: 50,
    memberCount: 35,
    treasurySparks: 2500,
    treasuryGems: 750,
    totalWins: 18,
    totalCompetitions: 42,
    xp: 12300,
    level: 18,
    streak: 8,
    isActive: true,
    createdAt: '2025-03-10T08:00:00Z',
    updatedAt: '2026-02-10T10:00:00Z',
  },
  {
    id: 'team_pqr345stu',
    tenantId: 'tenant_scholarly',
    name: 'The O\'Brien Family Readers',
    type: 'FAMILY',
    description: 'Mum, Dad, and the three kids — reading together every evening',
    createdBy: 'user_parent_1',
    maxMembers: 6,
    memberCount: 5,
    treasurySparks: 180,
    treasuryGems: 45,
    totalWins: 3,
    totalCompetitions: 8,
    xp: 2100,
    level: 5,
    streak: 12,
    isActive: true,
    createdAt: '2025-11-20T18:00:00Z',
    updatedAt: '2026-02-09T20:00:00Z',
  },
  {
    id: 'team_vwx678yza',
    tenantId: 'tenant_scholarly',
    name: 'Wombat Warriors',
    type: 'CLASSROOM',
    description: 'Mr Chen\'s Year 5 competitive reading team from Sunshine Coast State School',
    createdBy: 'user_teacher_3',
    maxMembers: 28,
    memberCount: 26,
    treasurySparks: 580,
    treasuryGems: 150,
    totalWins: 9,
    totalCompetitions: 20,
    xp: 6200,
    level: 11,
    streak: 2,
    isActive: true,
    createdAt: '2025-08-22T08:00:00Z',
    updatedAt: '2026-02-08T14:00:00Z',
  },
];

const DEMO_MY_TEAMS: (ArenaTeam & { myRole: 'CAPTAIN' | 'VICE_CAPTAIN' | 'MEMBER' | 'COACH' })[] = [
  {
    ...DEMO_TEAMS[0],
    myRole: 'CAPTAIN',
  },
  {
    ...DEMO_TEAMS[2],
    myRole: 'MEMBER',
  },
];

const DEMO_TEAM_MEMBERS: ArenaTeamMember[] = [
  {
    id: 'mem_a1b2c3',
    teamId: 'team_xyz456abc',
    userId: 'user_teacher_1',
    tenantId: 'tenant_scholarly',
    role: 'COACH',
    isActive: true,
    joinedAt: '2025-09-15T08:00:00Z',
    contributedSparks: 50,
    contributedGems: 20,
    competitionsPlayed: 14,
    competitionsWon: 6,
    user: { id: 'user_teacher_1', displayName: 'Mrs Patterson' },
  },
  {
    id: 'mem_d4e5f6',
    teamId: 'team_xyz456abc',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    role: 'CAPTAIN',
    isActive: true,
    joinedAt: '2025-09-15T08:05:00Z',
    contributedSparks: 120,
    contributedGems: 35,
    competitionsPlayed: 14,
    competitionsWon: 6,
    user: { id: 'user_learner_1', displayName: 'Lachlan Murray' },
  },
  {
    id: 'mem_g7h8i9',
    teamId: 'team_xyz456abc',
    userId: 'user_learner_2',
    tenantId: 'tenant_scholarly',
    role: 'VICE_CAPTAIN',
    isActive: true,
    joinedAt: '2025-09-16T09:00:00Z',
    contributedSparks: 80,
    contributedGems: 15,
    competitionsPlayed: 12,
    competitionsWon: 5,
    user: { id: 'user_learner_2', displayName: 'Mia Thompson' },
  },
  {
    id: 'mem_j1k2l3',
    teamId: 'team_xyz456abc',
    userId: 'user_learner_3',
    tenantId: 'tenant_scholarly',
    role: 'MEMBER',
    isActive: true,
    joinedAt: '2025-09-17T10:00:00Z',
    contributedSparks: 45,
    contributedGems: 10,
    competitionsPlayed: 10,
    competitionsWon: 4,
    user: { id: 'user_learner_3', displayName: 'Aanya Patel' },
  },
  {
    id: 'mem_m4n5o6',
    teamId: 'team_xyz456abc',
    userId: 'user_learner_4',
    tenantId: 'tenant_scholarly',
    role: 'MEMBER',
    isActive: true,
    joinedAt: '2025-09-18T08:30:00Z',
    contributedSparks: 30,
    contributedGems: 5,
    competitionsPlayed: 8,
    competitionsWon: 3,
    user: { id: 'user_learner_4', displayName: 'Oliver Nguyen' },
  },
  {
    id: 'mem_p7q8r9',
    teamId: 'team_xyz456abc',
    userId: 'user_learner_5',
    tenantId: 'tenant_scholarly',
    role: 'MEMBER',
    isActive: true,
    joinedAt: '2025-09-19T09:15:00Z',
    contributedSparks: 15,
    contributedGems: 0,
    competitionsPlayed: 6,
    competitionsWon: 2,
    user: { id: 'user_learner_5', displayName: 'Zara Williams' },
  },
];

const DEMO_TOKEN_BALANCE: TokenBalance = {
  id: 'bal_user_learner_1',
  userId: 'user_learner_1',
  tenantId: 'tenant_scholarly',
  sparks: 1250,
  gems: 340,
  voice: 85,
  stakedSparks: 200,
  stakedGems: 50,
  stakedVoice: 15,
  lifetimeSparksEarned: 3800,
  lifetimeGemsEarned: 620,
  lifetimeVoiceEarned: 140,
  lastEarnedAt: '2026-02-10T08:30:00Z',
  lastSpentAt: '2026-02-09T14:20:00Z',
  createdAt: '2025-06-01T08:00:00Z',
  updatedAt: '2026-02-10T08:30:00Z',
};

const DEMO_TRANSACTIONS: ArenaTokenTransaction[] = [
  {
    id: 'txn_001',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'SPARKS',
    transactionType: 'EARN',
    amount: 25,
    balanceBefore: 1225,
    balanceAfter: 1250,
    category: 'COMPETITION_WIN',
    referenceId: 'comp_wx4y6z1a',
    referenceType: 'COMPETITION',
    createdAt: '2026-02-10T08:30:00Z',
  },
  {
    id: 'txn_002',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'GEMS',
    transactionType: 'EARN',
    amount: 10,
    balanceBefore: 330,
    balanceAfter: 340,
    category: 'BOUNTY_REWARD',
    referenceId: 'bounty_abc123',
    referenceType: 'BOUNTY',
    createdAt: '2026-02-09T16:45:00Z',
  },
  {
    id: 'txn_003',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'SPARKS',
    transactionType: 'SPEND',
    amount: -50,
    balanceBefore: 1275,
    balanceAfter: 1225,
    category: 'AVATAR_PURCHASE',
    referenceId: 'item_koala_hat',
    referenceType: 'SHOP_ITEM',
    createdAt: '2026-02-09T14:20:00Z',
  },
  {
    id: 'txn_004',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'VOICE',
    transactionType: 'EARN',
    amount: 5,
    balanceBefore: 80,
    balanceAfter: 85,
    category: 'GOVERNANCE_PARTICIPATION',
    referenceId: 'prop_mno789',
    referenceType: 'PROPOSAL',
    createdAt: '2026-02-09T11:00:00Z',
  },
  {
    id: 'txn_005',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'SPARKS',
    transactionType: 'STAKE',
    amount: -100,
    balanceBefore: 1375,
    balanceAfter: 1275,
    category: 'ARENA_TOURNAMENT',
    referenceId: 'stake_pos_001',
    referenceType: 'STAKE_POSITION',
    createdAt: '2026-02-08T10:00:00Z',
  },
  {
    id: 'txn_006',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'SPARKS',
    transactionType: 'EARN',
    amount: 15,
    balanceBefore: 1360,
    balanceAfter: 1375,
    category: 'DAILY_READING',
    createdAt: '2026-02-08T08:15:00Z',
  },
  {
    id: 'txn_007',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'GEMS',
    transactionType: 'EARN',
    amount: 20,
    balanceBefore: 310,
    balanceAfter: 330,
    category: 'STORY_PUBLISHED',
    referenceId: 'story_platypus_adventure',
    referenceType: 'STORY',
    createdAt: '2026-02-07T15:30:00Z',
  },
  {
    id: 'txn_008',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'SPARKS',
    transactionType: 'SPEND',
    amount: -30,
    balanceBefore: 1390,
    balanceAfter: 1360,
    category: 'TEAM_TREASURY',
    referenceId: 'team_xyz456abc',
    referenceType: 'TEAM',
    createdAt: '2026-02-07T09:00:00Z',
  },
  {
    id: 'txn_009',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'VOICE',
    transactionType: 'SPEND',
    amount: -10,
    balanceBefore: 90,
    balanceAfter: 80,
    category: 'GOVERNANCE_VOTE',
    referenceId: 'prop_def456',
    referenceType: 'PROPOSAL',
    createdAt: '2026-02-06T14:00:00Z',
  },
  {
    id: 'txn_010',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    tokenType: 'SPARKS',
    transactionType: 'UNSTAKE',
    amount: 110,
    balanceBefore: 1280,
    balanceAfter: 1390,
    category: 'SAVINGS_POOL',
    referenceId: 'stake_pos_old_001',
    referenceType: 'STAKE_POSITION',
    createdAt: '2026-02-06T08:00:00Z',
  },
];

const DEMO_BOUNTIES: ContentBounty[] = [
  {
    id: 'bounty_abc123',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_1',
    category: 'PHASE_GAP',
    title: 'Phase 3 Decodable Readers — Australian Farm Animals',
    description: 'We need 5 new decodable readers for Phase 3 phonics featuring Australian farm animals. Each story should be 200-300 words, use only Phase 1-3 graphemes, and include comprehension questions.',
    requirements: { wordCount: '200-300', graphemePhase: 3, storiesNeeded: 5, theme: 'Australian farm animals' },
    reward: { tokenType: 'GEMS', amount: 100, badges: ['content-creator'] },
    submissionDeadline: '2026-02-28T23:59:00Z',
    judgingDeadline: '2026-03-07T23:59:00Z',
    maxSubmissions: 20,
    currentSubmissions: 8,
    eligibleTiers: ['CONTRIBUTOR', 'ESTABLISHED', 'EXPERT', 'MASTER'],
    tags: ['phonics', 'phase-3', 'decodable', 'animals'],
    status: 'ACCEPTING',
    createdAt: '2026-02-01T09:00:00Z',
    updatedAt: '2026-02-08T12:00:00Z',
  },
  {
    id: 'bounty_def456',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_2',
    category: 'CULTURAL_DIVERSITY',
    title: 'First Nations Stories — Sharing Knowledge',
    description: 'Create culturally appropriate stories that share Aboriginal and Torres Strait Islander knowledge with young learners. Must be developed in consultation with Indigenous educators.',
    requirements: { consultationRequired: true, ageRange: '5-8', culturalReview: true },
    reward: { tokenType: 'GEMS', amount: 250, badges: ['cultural-contributor', 'community-champion'] },
    submissionDeadline: '2026-03-31T23:59:00Z',
    judgingDeadline: '2026-04-15T23:59:00Z',
    maxSubmissions: 10,
    currentSubmissions: 3,
    eligibleTiers: ['ESTABLISHED', 'EXPERT', 'MASTER'],
    tags: ['indigenous', 'cultural', 'first-nations', 'diversity'],
    status: 'PUBLISHED',
    createdAt: '2026-01-25T10:00:00Z',
    updatedAt: '2026-02-05T09:00:00Z',
  },
  {
    id: 'bounty_ghi789',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_3',
    category: 'LANGUAGE_GAP',
    title: 'Bilingual Readers — Mandarin-English',
    description: 'Develop bilingual story readers that support Mandarin-English learners in Phase 4-5. Stories should present key vocabulary in both languages with pronunciation guides.',
    requirements: { languages: ['en', 'zh'], phase: '4-5', pronunciationGuide: true },
    reward: { tokenType: 'GEMS', amount: 150, badges: ['language-bridge'] },
    submissionDeadline: '2026-02-08T23:59:00Z',
    judgingDeadline: '2026-02-15T23:59:00Z',
    maxSubmissions: 15,
    currentSubmissions: 12,
    eligibleTiers: ['CONTRIBUTOR', 'ESTABLISHED', 'EXPERT', 'MASTER'],
    tags: ['bilingual', 'mandarin', 'english', 'language'],
    status: 'JUDGING',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-09T10:00:00Z',
  },
  {
    id: 'bounty_jkl012',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_1',
    category: 'SERIES_EXTENSION',
    title: 'Koala Creek Adventures — New Episodes',
    description: 'Extend the popular Koala Creek Adventures series with 3 new episodes. Must maintain the existing characters and reading level. Include illustrations guidance.',
    requirements: { series: 'Koala Creek Adventures', episodesNeeded: 3, existingCharacters: true },
    reward: { tokenType: 'SPARKS', amount: 200, badges: ['series-contributor'] },
    submissionDeadline: '2026-01-31T23:59:00Z',
    judgingDeadline: '2026-02-07T23:59:00Z',
    maxSubmissions: 25,
    currentSubmissions: 18,
    eligibleTiers: ['CONTRIBUTOR', 'ESTABLISHED', 'EXPERT', 'MASTER'],
    tags: ['series', 'koala-creek', 'adventure', 'fiction'],
    status: 'COMPLETED',
    createdAt: '2026-01-05T08:00:00Z',
    updatedAt: '2026-02-07T23:59:00Z',
  },
  {
    id: 'bounty_mno345',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_2',
    category: 'SEASONAL',
    title: 'Harmony Week Reading Collection',
    description: 'Create a collection of 4 stories celebrating cultural diversity for Harmony Week (March 15-21). Stories should feature characters from different cultural backgrounds living in Australia.',
    requirements: { storiesNeeded: 4, theme: 'Harmony Week', ageRange: '4-7', diversityFocus: true },
    reward: { tokenType: 'GEMS', amount: 180, badges: ['harmony-champion'] },
    submissionDeadline: '2026-03-01T23:59:00Z',
    judgingDeadline: '2026-03-08T23:59:00Z',
    maxSubmissions: 30,
    currentSubmissions: 1,
    eligibleTiers: ['NEWCOMER', 'CONTRIBUTOR', 'ESTABLISHED', 'EXPERT', 'MASTER'],
    tags: ['harmony-week', 'diversity', 'seasonal', 'cultural'],
    status: 'PUBLISHED',
    createdAt: '2026-02-09T12:00:00Z',
    updatedAt: '2026-02-09T12:00:00Z',
  },
];

const DEMO_PROPOSALS: ArenaProposal[] = [
  {
    id: 'prop_abc123',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_1',
    type: 'FEATURE_PRIORITY',
    title: 'Add Audio Narration to All Phase 2-3 Stories',
    description: 'Proposal to prioritise adding professional audio narration to all Phase 2 and Phase 3 decodable readers. This would significantly benefit early readers who need auditory support and learners with dyslexia. Estimated effort: 3 sprints. Community voice tokens would fund narrator recordings.',
    specification: { phases: [2, 3], estimatedCost: 5000, timeline: '3 sprints' },
    votingStrategy: 'SIMPLE_MAJORITY',
    status: 'ACTIVE',
    votingStartsAt: '2026-02-07T00:00:00Z',
    votingEndsAt: '2026-02-14T00:00:00Z',
    quorumRequired: 0.1,
    votesFor: 145,
    votesAgainst: 32,
    votesAbstain: 18,
    totalVoters: 195,
    voiceLocked: 480,
    createdAt: '2026-02-07T00:00:00Z',
    updatedAt: '2026-02-10T08:00:00Z',
    creator: { id: 'user_teacher_1', displayName: 'Mrs Patterson' },
  },
  {
    id: 'prop_def456',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_2',
    type: 'CONTENT_POLICY',
    title: 'Mandatory Cultural Sensitivity Review for Indigenous Content',
    description: 'All content referencing Aboriginal or Torres Strait Islander culture must undergo review by an approved Indigenous educator before publication. This ensures cultural accuracy and respect in all platform content.',
    specification: { reviewProcess: 'mandatory', reviewerPool: 'indigenous-educators' },
    votingStrategy: 'SUPERMAJORITY',
    status: 'ACTIVE',
    votingStartsAt: '2026-02-05T00:00:00Z',
    votingEndsAt: '2026-02-12T00:00:00Z',
    quorumRequired: 0.1,
    votesFor: 210,
    votesAgainst: 15,
    votesAbstain: 8,
    totalVoters: 233,
    voiceLocked: 620,
    createdAt: '2026-02-05T00:00:00Z',
    updatedAt: '2026-02-10T06:00:00Z',
    creator: { id: 'user_teacher_2', displayName: 'Mr Chen' },
  },
  {
    id: 'prop_ghi789',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_3',
    type: 'TREASURY_SPEND',
    title: 'Fund Inter-School Reading Competition Prizes',
    description: 'Allocate 500 GEMS from the DAO treasury to fund prizes for the upcoming Victorian Schools Reading League. Prizes include digital badges, avatar upgrades, and bonus story access for the top 3 teams.',
    specification: { tokenType: 'GEMS', amount: 500, purpose: 'Victorian Schools Reading League prizes' },
    votingStrategy: 'SIMPLE_MAJORITY',
    status: 'PASSED',
    votingStartsAt: '2026-01-28T00:00:00Z',
    votingEndsAt: '2026-02-04T00:00:00Z',
    executionAt: '2026-02-05T00:00:00Z',
    quorumRequired: 0.1,
    votesFor: 180,
    votesAgainst: 45,
    votesAbstain: 25,
    totalVoters: 250,
    voiceLocked: 520,
    createdAt: '2026-01-28T00:00:00Z',
    updatedAt: '2026-02-05T00:00:00Z',
    creator: { id: 'user_teacher_3', displayName: 'Ms Garcia' },
  },
  {
    id: 'prop_jkl012',
    tenantId: 'tenant_scholarly',
    creatorId: 'user_teacher_1',
    type: 'PLATFORM_RULE',
    title: 'Introduce Weekly Reading Streak Bonuses',
    description: 'Students who maintain a 7-day reading streak should receive bonus SPARKS. The proposal suggests 50 bonus SPARKS for a 7-day streak, 150 for 14 days, and 500 for a full month. This encourages consistent daily reading habits.',
    specification: { streaks: { '7_days': 50, '14_days': 150, '30_days': 500 }, tokenType: 'SPARKS' },
    votingStrategy: 'SIMPLE_MAJORITY',
    status: 'EXECUTED',
    votingStartsAt: '2026-01-15T00:00:00Z',
    votingEndsAt: '2026-01-22T00:00:00Z',
    executionAt: '2026-01-23T00:00:00Z',
    quorumRequired: 0.1,
    votesFor: 320,
    votesAgainst: 28,
    votesAbstain: 12,
    totalVoters: 360,
    voiceLocked: 890,
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-23T00:00:00Z',
    creator: { id: 'user_teacher_1', displayName: 'Mrs Patterson' },
  },
];

const DEMO_USER_STATS: UserCompetitionStats = {
  totalCompetitions: 24,
  wins: 8,
  totalScore: 1836,
  avgScore: 76.5,
  bestFormat: 'READING_SPRINT',
  activeCompetitions: 2,
};

const DEMO_LEADERBOARD: LeaderboardEntry[] = [
  { id: 'part_lb_1', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_1', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 2450, roundScores: [], rank: 1, status: 'COMPLETED', joinedAt: '2026-02-01T09:00:00Z', user: { id: 'user_lb_1', displayName: 'Lachlan Murray' } },
  { id: 'part_lb_2', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_2', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 2380, roundScores: [], rank: 2, status: 'COMPLETED', joinedAt: '2026-02-01T09:01:00Z', user: { id: 'user_lb_2', displayName: 'Mia Thompson' } },
  { id: 'part_lb_3', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_3', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 2210, roundScores: [], rank: 3, status: 'COMPLETED', joinedAt: '2026-02-01T09:02:00Z', user: { id: 'user_lb_3', displayName: 'Aanya Patel' } },
  { id: 'part_lb_4', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_4', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 2050, roundScores: [], rank: 4, status: 'COMPLETED', joinedAt: '2026-02-01T09:03:00Z', user: { id: 'user_lb_4', displayName: 'Oliver Nguyen' } },
  { id: 'part_lb_5', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_5', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 1980, roundScores: [], rank: 5, status: 'COMPLETED', joinedAt: '2026-02-01T09:04:00Z', user: { id: 'user_lb_5', displayName: 'Zara Williams' } },
  { id: 'part_lb_6', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_6', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 1920, roundScores: [], rank: 6, status: 'COMPLETED', joinedAt: '2026-02-01T09:05:00Z', user: { id: 'user_lb_6', displayName: 'Ethan O\'Brien' } },
  { id: 'part_lb_7', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_7', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 1850, roundScores: [], rank: 7, status: 'COMPLETED', joinedAt: '2026-02-01T09:06:00Z', user: { id: 'user_lb_7', displayName: 'Isla Chen' } },
  { id: 'part_lb_8', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_8', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 1790, roundScores: [], rank: 8, status: 'COMPLETED', joinedAt: '2026-02-01T09:07:00Z', user: { id: 'user_lb_8', displayName: 'Hugo Kowalski' } },
  { id: 'part_lb_9', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_9', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 1720, roundScores: [], rank: 9, status: 'COMPLETED', joinedAt: '2026-02-01T09:08:00Z', user: { id: 'user_lb_9', displayName: 'Sienna Garcia' } },
  { id: 'part_lb_10', competitionId: 'comp_wx4y6z1a', userId: 'user_lb_10', tenantId: 'tenant_scholarly', type: 'STUDENT', handicapFactor: 1.0, wagerAmount: 0, totalScore: 1680, roundScores: [], rank: 10, status: 'COMPLETED', joinedAt: '2026-02-01T09:09:00Z', user: { id: 'user_lb_10', displayName: 'Jack Fitzgerald' } },
];

const DEMO_CREATOR_PROFILE: CreatorProfile = {
  id: 'creator_001',
  userId: 'user_learner_1',
  displayName: 'Lachlan Murray',
  bio: 'Year 5 student at Bondi Public School who loves writing adventure stories about Australian wildlife.',
  specialisations: ['adventure', 'wildlife', 'phonics-phase-5'],
  tier: 'CONTRIBUTOR',
  onboardingPhase: 'FIRST_PUBLICATION',
  totalPublished: 4,
  totalDrafts: 2,
  avgEngagement: 3.2,
  isVerifiedEducator: false,
  tenantId: 'tenant_scholarly',
  createdAt: '2025-10-01T08:00:00Z',
  updatedAt: '2026-02-08T10:00:00Z',
  user: { id: 'user_learner_1', displayName: 'Lachlan Murray' },
};

const DEMO_ECONOMY_METRICS: TokenEconomyMetrics = {
  circulating: {
    sparks: 485200,
    gems: 124800,
    voice: 38500,
  },
  staked: {
    sparks: 95400,
    gems: 28600,
    voice: 12200,
    totalPositions: 342,
    totalYieldAccrued: 4850,
  },
  lifetime: {
    sparksEarned: 720000,
    gemsEarned: 185000,
    voiceEarned: 62000,
  },
  activeUsers: 1247,
  transactionsLast24h: 856,
};

const DEMO_STAKE_POSITIONS: ArenaStakePosition[] = [
  {
    id: 'stake_pos_001',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    poolType: 'ARENA_TOURNAMENT',
    poolId: 'tourn_abc123def',
    tokenType: 'SPARKS',
    amount: 100,
    yieldAccrued: 8,
    lockedUntil: '2026-03-10T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-02-08T10:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'stake_pos_002',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    poolType: 'SAVINGS_POOL',
    tokenType: 'SPARKS',
    amount: 100,
    yieldAccrued: 22,
    lockedUntil: '2026-06-01T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-01-01T08:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
  {
    id: 'stake_pos_003',
    userId: 'user_learner_1',
    tenantId: 'tenant_scholarly',
    poolType: 'GOVERNANCE_LOCK',
    tokenType: 'VOICE',
    amount: 15,
    yieldAccrued: 3,
    lockedUntil: '2026-04-01T00:00:00Z',
    status: 'ACTIVE',
    createdAt: '2026-01-15T08:00:00Z',
    updatedAt: '2026-02-10T00:00:00Z',
  },
];

const DEMO_COMMUNITY_HEALTH: CommunityHealthMetrics = {
  creators: { total: 245, verified: 42 },
  content: { activeBounties: 12 },
  competitions: { active: 8 },
  economy: {
    totalUsers: 1247,
    totalSparks: 580600,
    totalGems: 153400,
    totalVoice: 50700,
    totalStaked: 136200,
  },
};

const DEMO_GOVERNANCE_STATS: GovernanceStats = {
  totalProposals: 47,
  activeProposals: 2,
  passedProposals: 28,
  totalVotesCast: 4820,
  uniqueVoters: 389,
  treasury: {
    sparks: 12500,
    gems: 4800,
    voice: 2200,
    totalAllocated: 25000,
    totalSpent: 5500,
  },
};

const DEMO_TREASURY: DaoTreasury = {
  id: 'treasury_001',
  tenantId: 'tenant_scholarly',
  sparksBalance: 12500,
  gemsBalance: 4800,
  voiceBalance: 2200,
  totalAllocated: 25000,
  totalSpent: 5500,
  createdAt: '2025-06-01T00:00:00Z',
  updatedAt: '2026-02-10T00:00:00Z',
};

const DEMO_DELEGATIONS: ArenaDelegation[] = [
  {
    id: 'deleg_001',
    delegatorId: 'user_learner_1',
    delegateId: 'user_teacher_1',
    tenantId: 'tenant_scholarly',
    proposalTypes: ['CONTENT_POLICY', 'CURRICULUM_ADDITION'],
    voiceAmount: 10,
    isActive: true,
    expiresAt: '2026-04-01T00:00:00Z',
    createdAt: '2026-02-01T08:00:00Z',
    updatedAt: '2026-02-01T08:00:00Z',
    delegator: { id: 'user_learner_1', displayName: 'Lachlan Murray' },
    delegate: { id: 'user_teacher_1', displayName: 'Mrs Patterson' },
  },
  {
    id: 'deleg_002',
    delegatorId: 'user_learner_1',
    delegateId: 'user_teacher_2',
    tenantId: 'tenant_scholarly',
    proposalTypes: ['FEATURE_PRIORITY'],
    voiceAmount: 5,
    isActive: true,
    expiresAt: '2026-03-15T00:00:00Z',
    createdAt: '2026-02-05T10:00:00Z',
    updatedAt: '2026-02-05T10:00:00Z',
    delegator: { id: 'user_learner_1', displayName: 'Lachlan Murray' },
    delegate: { id: 'user_teacher_2', displayName: 'Mr Chen' },
  },
];

const DEMO_COMMUNITY_FEED: CommunityFeedItem[] = [
  {
    type: 'competition',
    data: {
      id: 'comp_gh7i9j2k',
      title: 'Sydney Schools Team Reading Relay',
      format: 'TEAM_RELAY',
      status: 'COMPLETED',
      participantCount: 32,
    },
    timestamp: '2026-02-01T11:05:00Z',
  },
  {
    type: 'bounty',
    data: {
      id: 'bounty_jkl012',
      title: 'Koala Creek Adventures — New Episodes',
      category: 'SERIES_EXTENSION',
      status: 'COMPLETED',
      currentSubmissions: 18,
    },
    timestamp: '2026-02-07T23:59:00Z',
  },
  {
    type: 'competition',
    data: {
      id: 'comp_bc8d3e5f',
      title: 'Phonics Phase 3 Tournament — Melbourne Schools',
      format: 'PHONICS_DUEL',
      status: 'IN_PROGRESS',
      participantCount: 16,
    },
    timestamp: '2026-02-10T11:01:00Z',
  },
  {
    type: 'bounty',
    data: {
      id: 'bounty_mno345',
      title: 'Harmony Week Reading Collection',
      category: 'SEASONAL',
      status: 'PUBLISHED',
      currentSubmissions: 1,
    },
    timestamp: '2026-02-09T12:00:00Z',
  },
  {
    type: 'competition',
    data: {
      id: 'comp_wx4y6z1a',
      title: 'Great Barrier Reef Knowledge Challenge',
      format: 'COMPREHENSION_QUIZ',
      status: 'IN_PROGRESS',
      participantCount: 25,
    },
    timestamp: '2026-02-10T09:02:00Z',
  },
];

// =============================================================================
// API CLIENT
// =============================================================================

class ArenaApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = `${API_BASE}/api/v1/arena`;
  }

  private async request<T>(method: string, endpoint: string, body?: unknown): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    try {
      const stored = localStorage.getItem('scholarly-auth');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.accessToken) {
          headers['Authorization'] = `Bearer ${parsed.accessToken}`;
        }
      }
    } catch {
      // localStorage unavailable or invalid JSON — continue without token
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method,
        headers,
        credentials: 'include',
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Request failed' }));
        throw new Error(error.message || error.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' } as T;
    }
  }

  // ==========================================================================
  // Competitions (10 endpoints)
  // ==========================================================================

  async createCompetition(data: any): Promise<any> {
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      const newComp: ArenaCompetition = {
        id: `comp_${Date.now()}`,
        tenantId: 'tenant_scholarly',
        creatorId: 'user_current',
        format: data.format || 'READING_SPRINT',
        title: data.title,
        description: data.description || '',
        config: {
          scoringModel: data.scoringModel || 'GROWTH_BASED',
          maxParticipants: data.maxParticipants || 20,
          durationMinutes: data.durationMinutes || 30,
        },
        status: 'REGISTRATION_OPEN',
        scheduledAt: data.scheduledAt,
        currentRound: 0,
        totalRounds: data.totalRounds || 1,
        phonicsPhase: data.phase?.toString(),
        wagerPool: 0,
        participantCount: 0,
        curriculumAlignments: data.curriculumAlignments || [],
        createdAt: now,
        updatedAt: now,
      };
      return { success: true, data: newComp };
    }
    return this.request('POST', '/competitions', data);
  }

  async listCompetitions(params?: { status?: string; format?: string; page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      let filtered = [...DEMO_COMPETITIONS];
      if (params?.status) filtered = filtered.filter(c => c.status === params.status);
      if (params?.format) filtered = filtered.filter(c => c.format === params.format);
      return {
        success: true,
        data: {
          competitions: filtered,
          pagination: { page: params?.page || 1, limit: params?.limit || 20, total: filtered.length },
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.format) query.set('format', params.format);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/competitions${qs ? `?${qs}` : ''}`);
  }

  async getUserStats(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_USER_STATS };
    return this.request('GET', '/competitions/user-stats');
  }

  async getCompetition(id: string): Promise<any> {
    if (DEMO_MODE) {
      const comp = DEMO_COMPETITIONS.find(c => c.id === id);
      if (comp) return { success: true, data: comp };
      return { success: false, error: 'Competition not found' };
    }
    return this.request('GET', `/competitions/${id}`);
  }

  async joinCompetition(id: string, type?: string): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          id: `participant_${Date.now()}`,
          competitionId: id,
          userId: 'user_current',
          tenantId: 'tenant_scholarly',
          type: type || 'STUDENT',
          handicapFactor: 1.0,
          wagerAmount: 0,
          status: 'REGISTERED',
          totalScore: 0,
          roundScores: [],
          rank: undefined,
          joinedAt: new Date().toISOString(),
        },
      };
    }
    return this.request('POST', `/competitions/${id}/join`, { type });
  }

  async getLeaderboard(competitionId: string): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          competitionId,
          entries: DEMO_LEADERBOARD,
          updatedAt: new Date().toISOString(),
        },
      };
    }
    return this.request('GET', `/competitions/${competitionId}/leaderboard`);
  }

  async startCompetition(id: string): Promise<any> {
    if (DEMO_MODE) {
      const comp = DEMO_COMPETITIONS.find(c => c.id === id);
      if (!comp) return { success: false, error: 'Competition not found' };
      return {
        success: true,
        data: { ...comp, status: 'IN_PROGRESS', startedAt: new Date().toISOString(), currentRound: 1 },
      };
    }
    return this.request('POST', `/competitions/${id}/start`);
  }

  async submitRound(id: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      const points = Math.round((data.accuracy || 0) * 0.4 + (data.wcpm || 0) * 0.3 + (data.comprehensionScore || 0) * 0.3);
      return {
        success: true,
        data: {
          participant: {
            id: 'participant_demo',
            competitionId: id,
            userId: 'user_current',
            tenantId: 'tenant_scholarly',
            totalScore: points,
            roundScores: [{ round: 1, ...data, points }],
          },
          roundScore: { round: 1, ...data, points },
        },
      };
    }
    return this.request('POST', `/competitions/${id}/rounds/submit`, data);
  }

  async advanceRound(id: string): Promise<any> {
    if (DEMO_MODE) {
      const comp = DEMO_COMPETITIONS.find(c => c.id === id);
      if (!comp) return { success: false, error: 'Competition not found' };
      const nextRound = comp.currentRound + 1;
      if (nextRound > comp.totalRounds) {
        return { success: true, data: { status: 'COMPLETED', finalRound: comp.currentRound } };
      }
      return { success: true, data: { ...comp, currentRound: nextRound } };
    }
    return this.request('POST', `/competitions/${id}/advance`);
  }

  async completeCompetition(id: string): Promise<any> {
    if (DEMO_MODE) {
      return { success: true, data: { competitionId: id, status: 'COMPLETED', rankedParticipants: 16 } };
    }
    return this.request('POST', `/competitions/${id}/complete`);
  }

  // ==========================================================================
  // Tournaments (3 endpoints)
  // ==========================================================================

  async createTournament(data: any): Promise<any> {
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      const newTournament: ArenaCompetition = {
        id: `tourn_${Date.now()}`,
        tenantId: 'tenant_scholarly',
        creatorId: 'user_current',
        format: data.format || 'SINGLE_ELIMINATION',
        title: data.name,
        description: data.description || '',
        config: {
          scoringModel: 'ABSOLUTE',
          maxParticipants: data.maxParticipants || 16,
          durationMinutes: 120,
          teamBased: data.teamBased || false,
          prizePool: data.prizePool || {},
        },
        status: 'REGISTRATION_OPEN',
        scheduledAt: data.scheduledAt,
        currentRound: 0,
        totalRounds: 1,
        wagerPool: 0,
        participantCount: 0,
        createdAt: now,
        updatedAt: now,
      };
      return { success: true, data: newTournament };
    }
    return this.request('POST', '/tournaments', data);
  }

  async listTournaments(params?: { page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      return { success: true, data: { tournaments: DEMO_TOURNAMENTS, total: DEMO_TOURNAMENTS.length } };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/tournaments${qs ? `?${qs}` : ''}`);
  }

  async getTournament(id: string): Promise<any> {
    if (DEMO_MODE) {
      const tournament = DEMO_TOURNAMENTS.find(t => t.id === id);
      if (tournament) return { success: true, data: tournament };
      return { success: false, error: 'Tournament not found' };
    }
    return this.request('GET', `/tournaments/${id}`);
  }

  // ==========================================================================
  // Teams (14 endpoints including challenge)
  // ==========================================================================

  async createTeam(data: any): Promise<any> {
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      const newTeam: ArenaTeam = {
        id: `team_${Date.now()}`,
        tenantId: 'tenant_scholarly',
        name: data.name,
        type: data.type || 'CLASSROOM',
        description: data.description || '',
        createdBy: 'user_current',
        maxMembers: data.maxMembers || 10,
        memberCount: 1,
        treasurySparks: 0,
        treasuryGems: 0,
        totalWins: 0,
        totalCompetitions: 0,
        xp: 0,
        level: 1,
        streak: 0,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      return { success: true, data: newTeam };
    }
    return this.request('POST', '/teams', data);
  }

  async listTeams(params?: { type?: string; page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      let filtered = [...DEMO_TEAMS];
      if (params?.type) filtered = filtered.filter(t => t.type === params.type);
      return { success: true, data: { teams: filtered, total: filtered.length } };
    }
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/teams${qs ? `?${qs}` : ''}`);
  }

  async getMyTeams(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_MY_TEAMS };
    return this.request('GET', '/teams/my');
  }

  async getTeamLeaderboard(params?: { type?: string; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      let filtered = [...DEMO_TEAMS];
      if (params?.type) filtered = filtered.filter(t => t.type === params.type);
      const sorted = filtered.sort((a, b) => b.xp - a.xp);
      const limited = params?.limit ? sorted.slice(0, params.limit) : sorted;
      return { success: true, data: { teams: limited.map((t, i) => ({ ...t, rank: i + 1 })) } };
    }
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/teams/leaderboard${qs ? `?${qs}` : ''}`);
  }

  async getTeam(id: string): Promise<any> {
    if (DEMO_MODE) {
      const team = DEMO_TEAMS.find(t => t.id === id);
      if (team) return { success: true, data: { ...team, members: DEMO_TEAM_MEMBERS.slice(0, 3) } };
      return { success: false, error: 'Team not found' };
    }
    return this.request('GET', `/teams/${id}`);
  }

  async getTeamMembers(teamId: string): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_TEAM_MEMBERS };
    return this.request('GET', `/teams/${teamId}/members`);
  }

  async addTeamMember(teamId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          id: `mem_${Date.now()}`,
          teamId,
          userId: data.userId,
          tenantId: 'tenant_scholarly',
          role: data.role || 'MEMBER',
          isActive: true,
          joinedAt: new Date().toISOString(),
          contributedSparks: 0,
          contributedGems: 0,
          competitionsPlayed: 0,
          competitionsWon: 0,
        } as ArenaTeamMember,
      };
    }
    return this.request('POST', `/teams/${teamId}/members`, data);
  }

  async leaveTeam(teamId: string): Promise<any> {
    if (DEMO_MODE) return { success: true, data: { teamId, left: true } };
    return this.request('POST', `/teams/${teamId}/leave`);
  }

  async contributeToTreasury(teamId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      const team = DEMO_TEAMS.find(t => t.id === teamId);
      if (!team) return { success: false, error: 'Team not found' };
      return {
        success: true,
        data: {
          ...team,
          treasurySparks: team.treasurySparks + (data.tokenType === 'SPARKS' ? data.amount : 0),
          treasuryGems: team.treasuryGems + (data.tokenType === 'GEMS' ? data.amount : 0),
        },
      };
    }
    return this.request('POST', `/teams/${teamId}/treasury/contribute`, data);
  }

  async proposeTreasurySpend(teamId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          id: `vote_${Date.now()}`,
          teamId,
          tenantId: 'tenant_scholarly',
          proposerId: 'user_current',
          description: data.description,
          tokenType: data.tokenType,
          amount: data.amount,
          purpose: data.purpose,
          status: 'OPEN',
          votesFor: 0,
          votesAgainst: 0,
          totalVoters: 24,
          requiredApproval: 0.5,
          expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        } as ArenaTreasuryVote,
      };
    }
    return this.request('POST', `/teams/${teamId}/treasury/propose`, data);
  }

  async castTreasuryVote(voteId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          id: voteId,
          votesFor: data.choice === 'FOR' ? 1 : 0,
          votesAgainst: data.choice === 'AGAINST' ? 1 : 0,
          autoFinalised: false,
        },
      };
    }
    return this.request('POST', `/teams/treasury-votes/${voteId}/cast`, data);
  }

  async proposeTrade(teamId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          id: `trade_${Date.now()}`,
          tenantId: 'tenant_scholarly',
          proposerTeamId: teamId,
          recipientTeamId: data.recipientTeamId,
          offerTokenType: data.offerTokenType,
          offerAmount: data.offerAmount,
          requestTokenType: data.requestTokenType,
          requestAmount: data.requestAmount,
          message: data.message,
          status: 'PROPOSED',
          expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
        } as ArenaTeamTrade,
      };
    }
    return this.request('POST', `/teams/${teamId}/trades/propose`, data);
  }

  async acceptTrade(tradeId: string): Promise<any> {
    if (DEMO_MODE) return { success: true, data: { id: tradeId, status: 'COMPLETED' } };
    return this.request('POST', `/teams/trades/${tradeId}/accept`);
  }

  async challengeTeam(teamId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          id: `challenge_${Date.now()}`,
          tenantId: 'tenant_scholarly',
          challengerTeamId: teamId,
          challengedTeamId: data.challengedTeamId,
          format: data.format,
          phonicsPhase: data.phonicsPhase,
          wagerAmount: data.wagerAmount || 0,
          wagerTokenType: data.wagerTokenType,
          status: 'PENDING',
          createdAt: new Date().toISOString(),
        } as ArenaTeamChallenge,
      };
    }
    return this.request('POST', `/teams/${teamId}/challenge`, data);
  }

  // ==========================================================================
  // Community (11 endpoints)
  // ==========================================================================

  async getCommunityLeaderboards(params?: { type?: string; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          leaderboard: DEMO_LEADERBOARD.slice(0, params?.limit || 20),
          type: params?.type || 'sparks',
          period: 'all-time',
        },
      };
    }
    const query = new URLSearchParams();
    if (params?.type) query.set('type', params.type);
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/community/leaderboards${qs ? `?${qs}` : ''}`);
  }

  async getTrending(): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          trendingBounties: DEMO_BOUNTIES.filter(b => b.status === 'ACCEPTING' || b.status === 'PUBLISHED').slice(0, 5),
          featuredCreators: [
            { ...DEMO_CREATOR_PROFILE, totalPublished: 12, tier: 'ESTABLISHED' as const },
            { ...DEMO_CREATOR_PROFILE, id: 'creator_002', displayName: 'Mia Thompson', tier: 'EXPERT' as const, totalPublished: 28, user: { id: 'user_lb_2', displayName: 'Mia Thompson' } },
            { ...DEMO_CREATOR_PROFILE, id: 'creator_003', displayName: 'Aanya Patel', tier: 'CONTRIBUTOR' as const, totalPublished: 6, user: { id: 'user_lb_3', displayName: 'Aanya Patel' } },
          ],
        },
      };
    }
    return this.request('GET', '/community/trending');
  }

  async getCommunityFeed(params?: { page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) return { success: true, data: { feed: DEMO_COMMUNITY_FEED, hasMore: false } };
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/community/feed${qs ? `?${qs}` : ''}`);
  }

  async getMyCreatorProfile(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_CREATOR_PROFILE };
    return this.request('GET', '/community/creators/me');
  }

  async registerCreator(data: any): Promise<any> {
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      return {
        success: true,
        data: {
          id: `creator_${Date.now()}`,
          userId: 'user_current',
          displayName: data.displayName,
          bio: data.bio || '',
          specialisations: data.specialisations || [],
          tier: 'NEWCOMER',
          onboardingPhase: 'REGISTERED',
          totalPublished: 0,
          totalDrafts: 0,
          avgEngagement: 0,
          isVerifiedEducator: false,
          tenantId: 'tenant_scholarly',
          createdAt: now,
          updatedAt: now,
        } as CreatorProfile,
      };
    }
    return this.request('POST', '/community/creators/register', data);
  }

  async getCreator(id: string): Promise<any> {
    if (DEMO_MODE) {
      if (id === DEMO_CREATOR_PROFILE.id) return { success: true, data: DEMO_CREATOR_PROFILE };
      return { success: false, error: 'Creator not found' };
    }
    return this.request('GET', `/community/creators/${id}`);
  }

  async getCreatorAnalytics(id: string): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          profile: DEMO_CREATOR_PROFILE,
          content: { totalPublished: 4, totalDrafts: 2, bountiesCreated: 1 },
          engagement: { avgEngagement: 3.2, totalSubmissions: 7, acceptedSubmissions: 3, avgSubmissionScore: 78.5 },
          tier: { current: 'CONTRIBUTOR', nextTier: 'ESTABLISHED' },
        } as CreatorAnalytics,
      };
    }
    return this.request('GET', `/community/creators/${id}/analytics`);
  }

  async advanceCreatorOnboarding(id: string): Promise<any> {
    if (DEMO_MODE) {
      return { success: true, data: { ...DEMO_CREATOR_PROFILE, onboardingPhase: 'ACTIVE_CREATOR' } };
    }
    return this.request('POST', `/community/creators/${id}/advance`);
  }

  async getCreatorChecklist(id: string): Promise<any> {
    if (DEMO_MODE) {
      const phases: Array<'REGISTERED' | 'PROFILE_COMPLETE' | 'TUTORIAL_COMPLETE' | 'FIRST_DRAFT' | 'FIRST_PUBLICATION' | 'ACTIVE_CREATOR'> =
        ['REGISTERED', 'PROFILE_COMPLETE', 'TUTORIAL_COMPLETE', 'FIRST_DRAFT', 'FIRST_PUBLICATION', 'ACTIVE_CREATOR'];
      const currentIndex = 4; // FIRST_PUBLICATION
      return {
        success: true,
        data: {
          steps: phases.map((phase, i) => ({
            phase,
            title: phase.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c: string) => c.toUpperCase()),
            isComplete: i <= currentIndex,
            isCurrent: i === currentIndex,
          })),
          completionPercentage: Math.round(((currentIndex + 1) / phases.length) * 100),
          nextAction: phases[currentIndex + 1] || null,
        } as OnboardingChecklist,
      };
    }
    return this.request('GET', `/community/creators/${id}/checklist`);
  }

  async requestTierUpgrade(id: string): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          eligible: false,
          nextTier: 'ESTABLISHED',
          missing: ['Need 6 more publications', 'Need 3.5 avg engagement (current: 3.2)'],
        },
      };
    }
    return this.request('POST', `/community/creators/${id}/tier-upgrade`);
  }

  async getCommunityHealth(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_COMMUNITY_HEALTH };
    return this.request('GET', '/community/health');
  }

  // ==========================================================================
  // Tokens (7 endpoints)
  // ==========================================================================

  async getTokenBalance(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_TOKEN_BALANCE };
    return this.request('GET', '/tokens/balance');
  }

  async getTokenHistory(params?: { tokenType?: string; page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      let filtered = [...DEMO_TRANSACTIONS];
      if (params?.tokenType) filtered = filtered.filter(t => t.tokenType === params.tokenType);
      return { success: true, data: { transactions: filtered, total: filtered.length } };
    }
    const query = new URLSearchParams();
    if (params?.tokenType) query.set('tokenType', params.tokenType);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/tokens/history${qs ? `?${qs}` : ''}`);
  }

  async redeemTokens(data: any): Promise<any> {
    if (DEMO_MODE) {
      const field = (data.tokenType || 'SPARKS').toLowerCase() as 'sparks' | 'gems' | 'voice';
      const currentAmount = DEMO_TOKEN_BALANCE[field];
      if (currentAmount < data.amount) return { success: false, error: 'Insufficient token balance' };
      return {
        success: true,
        data: {
          transaction: {
            id: `txn_${Date.now()}`,
            userId: 'user_current',
            tenantId: 'tenant_scholarly',
            tokenType: data.tokenType,
            transactionType: 'SPEND' as const,
            amount: -data.amount,
            balanceBefore: currentAmount,
            balanceAfter: currentAmount - data.amount,
            category: data.category,
            createdAt: new Date().toISOString(),
          },
          balance: { ...DEMO_TOKEN_BALANCE, [field]: currentAmount - data.amount },
        },
      };
    }
    return this.request('POST', '/tokens/redeem', data);
  }

  async earnTokens(data: any): Promise<any> {
    if (DEMO_MODE) {
      const field = (data.tokenType || 'SPARKS').toLowerCase() as 'sparks' | 'gems' | 'voice';
      const currentAmount = DEMO_TOKEN_BALANCE[field];
      return {
        success: true,
        data: {
          transaction: {
            id: `txn_${Date.now()}`,
            userId: 'user_current',
            tenantId: 'tenant_scholarly',
            tokenType: data.tokenType,
            transactionType: 'EARN' as const,
            amount: data.amount,
            balanceBefore: currentAmount,
            balanceAfter: currentAmount + data.amount,
            category: data.category,
            referenceId: data.referenceId,
            referenceType: data.referenceType,
            createdAt: new Date().toISOString(),
          },
          balance: { ...DEMO_TOKEN_BALANCE, [field]: currentAmount + data.amount },
        },
      };
    }
    return this.request('POST', '/tokens/earn', data);
  }

  async stakeTokens(data: any): Promise<any> {
    if (DEMO_MODE) {
      const lockedUntil = new Date();
      lockedUntil.setDate(lockedUntil.getDate() + (data.lockDays || 30));
      const now = new Date().toISOString();
      return {
        success: true,
        data: {
          id: `stake_pos_${Date.now()}`,
          userId: 'user_current',
          tenantId: 'tenant_scholarly',
          poolType: data.poolType,
          poolId: data.poolId,
          tokenType: data.tokenType,
          amount: data.amount,
          yieldAccrued: 0,
          lockedUntil: lockedUntil.toISOString(),
          status: 'ACTIVE',
          createdAt: now,
          updatedAt: now,
        } as ArenaStakePosition,
      };
    }
    return this.request('POST', '/tokens/stake', data);
  }

  async unstakeTokens(data: any): Promise<any> {
    if (DEMO_MODE) {
      const position = DEMO_STAKE_POSITIONS.find(p => p.id === data.positionId);
      if (!position) return { success: false, error: 'Stake position not found' };
      const isEarlyWithdrawal = new Date() < new Date(position.lockedUntil);
      const penalty = isEarlyWithdrawal ? Math.floor(position.amount * 0.1) : 0;
      const returnAmount = position.amount - penalty + position.yieldAccrued;
      return {
        success: true,
        data: {
          transaction: {
            id: `txn_${Date.now()}`,
            userId: 'user_current',
            tenantId: 'tenant_scholarly',
            tokenType: position.tokenType,
            transactionType: 'UNSTAKE' as const,
            amount: returnAmount,
            balanceBefore: 0,
            balanceAfter: returnAmount,
            category: position.poolType,
            referenceId: position.id,
            referenceType: 'STAKE_POSITION',
            metadata: { penalty, yieldAccrued: position.yieldAccrued, earlyWithdrawal: isEarlyWithdrawal },
            createdAt: new Date().toISOString(),
          },
          returnAmount,
          penalty,
          yieldAccrued: position.yieldAccrued,
        },
      };
    }
    return this.request('POST', '/tokens/unstake', data);
  }

  async getEconomyMetrics(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_ECONOMY_METRICS };
    return this.request('GET', '/tokens/economy');
  }

  // ==========================================================================
  // Governance (13 endpoints)
  // ==========================================================================

  async createProposal(data: any): Promise<any> {
    if (DEMO_MODE) {
      const votingEndsAt = new Date();
      votingEndsAt.setHours(votingEndsAt.getHours() + (data.votingPeriodHours || 72));
      const now = new Date().toISOString();
      const newProposal: ArenaProposal = {
        id: `prop_${Date.now()}`,
        tenantId: 'tenant_scholarly',
        creatorId: 'user_current',
        type: data.type || 'SIGNAL',
        title: data.title,
        description: data.description,
        specification: data.specification,
        votingStrategy: data.votingStrategy || 'SIMPLE_MAJORITY',
        status: 'ACTIVE',
        votingStartsAt: now,
        votingEndsAt: votingEndsAt.toISOString(),
        quorumRequired: 0.1,
        votesFor: 0,
        votesAgainst: 0,
        votesAbstain: 0,
        totalVoters: 0,
        voiceLocked: 0,
        createdAt: now,
        updatedAt: now,
        creator: { id: 'user_current', displayName: 'Current User' },
      };
      return { success: true, data: newProposal };
    }
    return this.request('POST', '/governance/proposals', data);
  }

  async listProposals(params?: { status?: string; type?: string; page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      let filtered = [...DEMO_PROPOSALS];
      if (params?.status) filtered = filtered.filter(p => p.status === params.status);
      if (params?.type) filtered = filtered.filter(p => p.type === params.type);
      return { success: true, data: { proposals: filtered, total: filtered.length } };
    }
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.type) query.set('type', params.type);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/governance/proposals${qs ? `?${qs}` : ''}`);
  }

  async getProposal(id: string): Promise<any> {
    if (DEMO_MODE) {
      const proposal = DEMO_PROPOSALS.find(p => p.id === id);
      if (proposal) return { success: true, data: proposal };
      return { success: false, error: 'Proposal not found' };
    }
    return this.request('GET', `/governance/proposals/${id}`);
  }

  async castVote(proposalId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      const proposal = DEMO_PROPOSALS.find(p => p.id === proposalId);
      if (!proposal) return { success: false, error: 'Proposal not found' };
      const weight = data.voiceAmount || 1;
      return {
        success: true,
        data: {
          vote: {
            id: `vote_${Date.now()}`,
            proposalId,
            voterId: 'user_current',
            tenantId: 'tenant_scholarly',
            choice: data.choice,
            weight,
            voiceSpent: data.voiceAmount || 1,
            reason: data.reason,
            createdAt: new Date().toISOString(),
          } as ArenaVote,
          proposal: {
            ...proposal,
            votesFor: proposal.votesFor + (data.choice === 'FOR' ? weight : 0),
            votesAgainst: proposal.votesAgainst + (data.choice === 'AGAINST' ? weight : 0),
            votesAbstain: proposal.votesAbstain + (data.choice === 'ABSTAIN' ? weight : 0),
            totalVoters: proposal.totalVoters + 1,
          },
        },
      };
    }
    return this.request('POST', `/governance/proposals/${proposalId}/vote`, data);
  }

  async finaliseProposal(id: string): Promise<any> {
    if (DEMO_MODE) {
      const proposal = DEMO_PROPOSALS.find(p => p.id === id);
      if (!proposal) return { success: false, error: 'Proposal not found' };
      const votesExcludingAbstain = proposal.votesFor + proposal.votesAgainst;
      const passed = votesExcludingAbstain > 0 && (proposal.votesFor / votesExcludingAbstain) >= 0.5;
      return {
        success: true,
        data: {
          ...proposal,
          status: passed ? 'PASSED' : 'FAILED',
          executionAt: passed ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() : undefined,
        },
      };
    }
    return this.request('POST', `/governance/proposals/${id}/finalise`);
  }

  async executeProposal(id: string): Promise<any> {
    if (DEMO_MODE) return { success: true, data: { proposalId: id, status: 'EXECUTED' } };
    return this.request('POST', `/governance/proposals/${id}/execute`);
  }

  async getProposalVotes(proposalId: string, params?: { page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      const demoVotes: ArenaVote[] = [
        { id: 'vote_001', proposalId, voterId: 'user_lb_1', tenantId: 'tenant_scholarly', choice: 'FOR', weight: 5, voiceSpent: 5, reason: 'Audio narration would be a game-changer for my students with dyslexia.', createdAt: '2026-02-08T10:00:00Z', voter: { id: 'user_lb_1', displayName: 'Lachlan Murray' } },
        { id: 'vote_002', proposalId, voterId: 'user_lb_2', tenantId: 'tenant_scholarly', choice: 'FOR', weight: 3, voiceSpent: 3, reason: 'Strongly support this — listening while reading helps so many kids.', createdAt: '2026-02-08T11:30:00Z', voter: { id: 'user_lb_2', displayName: 'Mia Thompson' } },
        { id: 'vote_003', proposalId, voterId: 'user_lb_3', tenantId: 'tenant_scholarly', choice: 'AGAINST', weight: 2, voiceSpent: 2, reason: 'I think we should prioritise more content creation first.', createdAt: '2026-02-08T14:00:00Z', voter: { id: 'user_lb_3', displayName: 'Aanya Patel' } },
        { id: 'vote_004', proposalId, voterId: 'user_lb_4', tenantId: 'tenant_scholarly', choice: 'FOR', weight: 1, voiceSpent: 1, createdAt: '2026-02-09T09:00:00Z', voter: { id: 'user_lb_4', displayName: 'Oliver Nguyen' } },
        { id: 'vote_005', proposalId, voterId: 'user_lb_5', tenantId: 'tenant_scholarly', choice: 'ABSTAIN', weight: 1, voiceSpent: 1, reason: 'Not sure about the cost estimate.', createdAt: '2026-02-09T10:15:00Z', voter: { id: 'user_lb_5', displayName: 'Zara Williams' } },
      ];
      return { success: true, data: demoVotes };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/governance/proposals/${proposalId}/votes${qs ? `?${qs}` : ''}`);
  }

  async createDelegation(data: any): Promise<any> {
    if (DEMO_MODE) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + (data.durationDays || 30));
      const now = new Date().toISOString();
      return {
        success: true,
        data: {
          id: `deleg_${Date.now()}`,
          delegatorId: 'user_current',
          delegateId: data.delegateId,
          tenantId: 'tenant_scholarly',
          proposalTypes: data.proposalTypes || [],
          voiceAmount: data.voiceAmount,
          isActive: true,
          expiresAt: expiresAt.toISOString(),
          createdAt: now,
          updatedAt: now,
          delegator: { id: 'user_current', displayName: 'Current User' },
          delegate: { id: data.delegateId, displayName: 'Delegate User' },
        } as ArenaDelegation,
      };
    }
    return this.request('POST', '/governance/delegations', data);
  }

  async revokeDelegation(id: string): Promise<any> {
    if (DEMO_MODE) return { success: true, data: { revoked: true } };
    return this.request('DELETE', `/governance/delegations/${id}`);
  }

  async listDelegations(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_DELEGATIONS };
    return this.request('GET', '/governance/delegations');
  }

  async getTreasury(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_TREASURY };
    return this.request('GET', '/governance/treasury');
  }

  async getTreasuryTransactions(params?: { page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      const transactions: DaoTreasuryTransaction[] = [
        { id: 'ttxn_001', tenantId: 'tenant_scholarly', proposalId: 'prop_jkl012', tokenType: 'SPARKS', amount: 2000, direction: 'OUTFLOW', description: 'Introduce Weekly Reading Streak Bonuses — initial allocation', createdAt: '2026-01-23T00:00:00Z' },
        { id: 'ttxn_002', tenantId: 'tenant_scholarly', tokenType: 'GEMS', amount: 500, direction: 'INFLOW', description: 'Monthly platform fee contribution to DAO treasury', createdAt: '2026-02-01T00:00:00Z' },
        { id: 'ttxn_003', tenantId: 'tenant_scholarly', proposalId: 'prop_ghi789', tokenType: 'GEMS', amount: 500, direction: 'OUTFLOW', description: 'Fund Inter-School Reading Competition Prizes', createdAt: '2026-02-05T00:00:00Z' },
        { id: 'ttxn_004', tenantId: 'tenant_scholarly', tokenType: 'SPARKS', amount: 1000, direction: 'INFLOW', description: 'Arena competition fee pool contribution', createdAt: '2026-02-03T00:00:00Z' },
        { id: 'ttxn_005', tenantId: 'tenant_scholarly', tokenType: 'VOICE', amount: 200, direction: 'INFLOW', description: 'Governance participation rewards distribution', createdAt: '2026-02-06T00:00:00Z' },
      ];
      return { success: true, data: { transactions, total: transactions.length } };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/governance/treasury/transactions${qs ? `?${qs}` : ''}`);
  }

  async getGovernanceStats(): Promise<any> {
    if (DEMO_MODE) return { success: true, data: DEMO_GOVERNANCE_STATS };
    return this.request('GET', '/governance/stats');
  }

  // ==========================================================================
  // Bounties (7 endpoints)
  // ==========================================================================

  async listBounties(params?: { status?: string; category?: string; page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      let filtered = [...DEMO_BOUNTIES];
      if (params?.status) filtered = filtered.filter(b => b.status === params.status);
      if (params?.category) filtered = filtered.filter(b => b.category === params.category);
      return { success: true, data: { bounties: filtered, total: filtered.length } };
    }
    const query = new URLSearchParams();
    if (params?.status) query.set('status', params.status);
    if (params?.category) query.set('category', params.category);
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/bounties${qs ? `?${qs}` : ''}`);
  }

  async createBounty(data: any): Promise<any> {
    if (DEMO_MODE) {
      const now = new Date().toISOString();
      const newBounty: ContentBounty = {
        id: `bounty_${Date.now()}`,
        tenantId: 'tenant_scholarly',
        creatorId: 'user_current',
        category: data.category || 'PHASE_GAP',
        title: data.title,
        description: data.description,
        requirements: data.requirements || {},
        reward: data.reward || { tokenType: 'GEMS', amount: 50 },
        submissionDeadline: data.submissionDeadline,
        judgingDeadline: data.judgingDeadline,
        maxSubmissions: data.maxSubmissions || 50,
        currentSubmissions: 0,
        eligibleTiers: data.eligibleTiers || [],
        tags: data.tags || [],
        status: 'PUBLISHED',
        createdAt: now,
        updatedAt: now,
      };
      return { success: true, data: newBounty };
    }
    return this.request('POST', '/bounties', data);
  }

  async getBounty(id: string): Promise<any> {
    if (DEMO_MODE) {
      const bounty = DEMO_BOUNTIES.find(b => b.id === id);
      if (bounty) return { success: true, data: bounty };
      return { success: false, error: 'Bounty not found' };
    }
    return this.request('GET', `/bounties/${id}`);
  }

  async getBountySubmissions(bountyId: string, params?: { page?: number; limit?: number }): Promise<any> {
    if (DEMO_MODE) {
      const demoSubmissions: BountySubmission[] = [
        { id: 'sub_001', bountyId, creatorId: 'user_lb_1', tenantId: 'tenant_scholarly', storyId: 'story_farm_chickens', status: 'SUBMITTED', submittedAt: '2026-02-05T10:00:00Z', creator: { id: 'user_lb_1', displayName: 'Lachlan Murray' } },
        { id: 'sub_002', bountyId, creatorId: 'user_lb_2', tenantId: 'tenant_scholarly', storyId: 'story_farm_sheep', status: 'SUBMITTED', submittedAt: '2026-02-06T14:30:00Z', creator: { id: 'user_lb_2', displayName: 'Mia Thompson' } },
        { id: 'sub_003', bountyId, creatorId: 'user_lb_3', tenantId: 'tenant_scholarly', storyId: 'story_farm_cows', status: 'UNDER_REVIEW', totalScore: 82, reviewedAt: '2026-02-08T09:00:00Z', submittedAt: '2026-02-04T11:00:00Z', creator: { id: 'user_lb_3', displayName: 'Aanya Patel' } },
      ];
      return { success: true, data: { submissions: demoSubmissions, total: demoSubmissions.length } };
    }
    const query = new URLSearchParams();
    if (params?.page) query.set('page', params.page.toString());
    if (params?.limit) query.set('limit', params.limit.toString());
    const qs = query.toString();
    return this.request('GET', `/bounties/${bountyId}/submissions${qs ? `?${qs}` : ''}`);
  }

  async submitToBounty(bountyId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          id: `sub_${Date.now()}`,
          bountyId,
          creatorId: 'user_current',
          tenantId: 'tenant_scholarly',
          storyId: data.storyId,
          status: 'SUBMITTED',
          submittedAt: new Date().toISOString(),
        } as BountySubmission,
      };
    }
    return this.request('POST', `/bounties/${bountyId}/submit`, data);
  }

  async startJudging(bountyId: string): Promise<any> {
    if (DEMO_MODE) return { success: true, data: { bountyId, status: 'JUDGING' } };
    return this.request('POST', `/bounties/${bountyId}/judging`);
  }

  async awardBounty(bountyId: string, data: any): Promise<any> {
    if (DEMO_MODE) {
      const winnerShare = 50;
      const runnerUpShare = 5;
      return {
        success: true,
        data: {
          bountyId,
          status: 'COMPLETED',
          winnersRewarded: data.winnerIds?.length || 0,
          runnerUpsRewarded: data.runnerUpIds?.length || 0,
          totalTokensDistributed: (winnerShare * (data.winnerIds?.length || 0)) + (runnerUpShare * (data.runnerUpIds?.length || 0)),
        },
      };
    }
    return this.request('POST', `/bounties/${bountyId}/award`, data);
  }

  // ==========================================================================
  // Pilot (1 endpoint)
  // ==========================================================================

  async getPilotStatus(): Promise<any> {
    if (DEMO_MODE) {
      return {
        success: true,
        data: {
          status: 'active',
          format: 'students_vs_teachers',
          teacherHandicap: 1.5,
          milestones: [
            { id: 'first-book', name: 'First Book', badge: 'reader' },
            { id: 'bookworm', name: 'Bookworm', badge: '5-books' },
            { id: 'champion', name: 'Reading Champion', badge: '10-books' },
          ],
        },
      };
    }
    return this.request('GET', '/pilot/status');
  }
}

export const arenaApi = new ArenaApiClient();
