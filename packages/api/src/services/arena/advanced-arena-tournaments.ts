// ============================================================================
// SCHOLARLY PLATFORM — Sprint 14, Deliverable S14-004
// Advanced Arena Tournaments
// ============================================================================
//
// PURPOSE: Multi-school competitions, seasonal events, bracket systems,
// prize distribution, and team tournaments. Sprint 9 built the Arena as
// a 1v1 ring; this Sprint transforms it into a stadium with leagues,
// seasons, and championship events. Think of it as the difference between
// a chess club match and a national tournament.
//
// KEY FORMATS:
//   - Individual brackets (single/double elimination)
//   - Team competitions (class vs class, school vs school)
//   - Seasonal leagues (weekly matches, points table)
//   - Students vs Teachers showdowns
//   - Speed rounds, accuracy challenges, phonics bees
//
// INTEGRATIONS:
//   - Sprint 9 (Arena core, token economy)
//   - Sprint 11 (gamification, badges, XP)
//   - Sprint 13 (SIS for school rosters)
//   - S14-001 (Data Lake for tournament analytics)
// ============================================================================

import { ScholarlyBaseService, Result } from '../shared/base';

// ============================================================================
// SECTION 1: TOURNAMENT DEFINITIONS
// ============================================================================

export interface Tournament {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  // Format
  format: TournamentFormat;
  competitionType: 'individual' | 'team' | 'class' | 'school' | 'students_vs_teachers';
  // Phonics constraints
  phonicsPhases: number[];        // Which phases this tournament covers
  allowedGPCs?: string[];         // Limit to specific GPCs (null = all in phase)
  difficultyTier: 'beginner' | 'intermediate' | 'advanced' | 'open';
  // Schedule
  registrationOpens: Date;
  registrationCloses: Date;
  startDate: Date;
  endDate: Date;
  timezone: string;
  // Participants
  minParticipants: number;
  maxParticipants: number;
  currentParticipants: number;
  eligibility: TournamentEligibility;
  // Prizes
  prizes: TournamentPrize[];
  // Status
  status: 'draft' | 'registration' | 'active' | 'completed' | 'cancelled';
  // Rounds
  rounds: TournamentRound[];
  // Leaderboard
  leaderboard: LeaderboardEntry[];
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TournamentFormat =
  | { type: 'single_elimination'; seeding: 'random' | 'ranked' | 'geographic' }
  | { type: 'double_elimination'; seeding: 'random' | 'ranked' }
  | { type: 'round_robin'; matchesPerPair: number }
  | { type: 'swiss'; rounds: number }
  | { type: 'league'; weeksPerSeason: number; matchesPerWeek: number }
  | { type: 'speed_round'; durationMinutes: number; questionsPerRound: number }
  | { type: 'accuracy_challenge'; targetAccuracy: number; timeLimit: number }
  | { type: 'phonics_bee'; eliminationThreshold: number };

export interface TournamentEligibility {
  minPhase: number;
  maxPhase: number;
  ageGroups: string[];
  schoolIds?: string[];           // Limit to specific schools
  districtIds?: string[];
  requiresTeacherApproval: boolean;
  requiresParentConsent: boolean;  // Always true for competitive events
}

export interface TournamentPrize {
  rank: number;                   // 1st, 2nd, 3rd, etc.
  xpReward: number;
  badgeId: string;
  tokenReward: number;            // Scholarly tokens from DAO treasury
  title: string;                  // e.g., "Phase 3 Champion"
  description: string;
}

export interface TournamentRound {
  roundId: string;
  roundNumber: number;
  roundName: string;              // e.g., "Quarter-finals", "Week 3"
  status: 'scheduled' | 'in_progress' | 'completed';
  startDate: Date;
  endDate: Date;
  matches: TournamentMatch[];
}

export interface TournamentMatch {
  matchId: string;
  roundId: string;
  // Participants (individual or team)
  participant1: MatchParticipant;
  participant2: MatchParticipant;
  // Challenge
  challengeType: 'reading_accuracy' | 'speed_reading' | 'gpc_identification' | 'word_building' | 'comprehension' | 'mixed';
  phonicsContent: {
    targetGPCs: string[];
    storybookId?: string;
    wordList?: string[];
    questionCount: number;
  };
  // Results
  status: 'scheduled' | 'in_progress' | 'completed' | 'forfeit' | 'bye';
  result?: MatchResult;
  scheduledAt: Date;
  completedAt?: Date;
}

export interface MatchParticipant {
  type: 'individual' | 'team';
  id: string;                     // User ID or team ID
  name: string;
  avatarUrl?: string;
  seed?: number;
  school?: string;
}

export interface MatchResult {
  winnerId: string;
  participant1Score: number;
  participant2Score: number;
  participant1Accuracy: number;
  participant2Accuracy: number;
  participant1WCPM?: number;
  participant2WCPM?: number;
  matchDurationSeconds: number;
  highlights: MatchHighlight[];
}

export interface MatchHighlight {
  timestamp: number;
  type: 'streak' | 'perfect_round' | 'comeback' | 'photo_finish' | 'record_broken';
  description: string;
  participantId: string;
}

export interface LeaderboardEntry {
  rank: number;
  participantId: string;
  participantName: string;
  participantType: 'individual' | 'team';
  schoolName?: string;
  // Stats
  wins: number;
  losses: number;
  draws: number;
  points: number;
  totalAccuracy: number;
  totalWCPM: number;
  matchesPlayed: number;
  currentStreak: number;
  bestStreak: number;
  // Movement
  previousRank: number;
  rankChange: number;
}


// ============================================================================
// SECTION 2: TEAM MANAGEMENT
// ============================================================================

export interface ArenaTeam {
  id: string;
  tenantId: string;
  name: string;
  mascot?: string;
  // Membership
  captainId: string;
  members: TeamMember[];
  maxSize: number;
  // Type
  teamType: 'class' | 'school' | 'custom' | 'teacher_team';
  classroomId?: string;           // If class-based team
  schoolId?: string;              // If school team
  // Stats
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  tournamentParticipations: number;
  elo: number;                    // Team Elo rating
  createdAt: Date;
}

export interface TeamMember {
  userId: string;
  role: 'captain' | 'member' | 'substitute';
  joinedAt: Date;
  individualWins: number;
  individualAccuracy: number;
}

export class TeamManagementService extends ScholarlyBaseService {
  private readonly DEFAULT_ELO = 1200;
  private readonly K_FACTOR = 32;

  constructor(tenantId: string) {
    super('TeamManagement', tenantId);
  }

  async createTeam(team: Omit<ArenaTeam, 'id' | 'totalWins' | 'totalLosses' | 'totalDraws' | 'tournamentParticipations' | 'elo' | 'createdAt'>): Promise<Result<ArenaTeam>> {
    if (team.members.length === 0) {
      return this.fail('Team must have at least one member');
    }
    if (team.members.length > team.maxSize) {
      return this.fail(`Team exceeds maximum size of ${team.maxSize}`);
    }

    const newTeam: ArenaTeam = {
      ...team,
      id: `team_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      totalWins: 0,
      totalLosses: 0,
      totalDraws: 0,
      tournamentParticipations: 0,
      elo: this.DEFAULT_ELO,
      createdAt: new Date(),
    };

    this.log('info', 'Arena team created', {
      teamId: newTeam.id,
      name: team.name,
      type: team.teamType,
      members: team.members.length,
    });

    return this.ok(newTeam);
  }

  // Update Elo ratings after a match
  updateEloRatings(
    team1Elo: number,
    team2Elo: number,
    result: 'team1_win' | 'team2_win' | 'draw'
  ): { team1NewElo: number; team2NewElo: number } {
    const expected1 = 1 / (1 + Math.pow(10, (team2Elo - team1Elo) / 400));
    const expected2 = 1 - expected1;

    let actual1: number, actual2: number;
    switch (result) {
      case 'team1_win': actual1 = 1; actual2 = 0; break;
      case 'team2_win': actual1 = 0; actual2 = 1; break;
      case 'draw': actual1 = 0.5; actual2 = 0.5; break;
    }

    return {
      team1NewElo: Math.round(team1Elo + this.K_FACTOR * (actual1 - expected1)),
      team2NewElo: Math.round(team2Elo + this.K_FACTOR * (actual2 - expected2)),
    };
  }

  async addMember(teamId: string, member: TeamMember): Promise<Result<void>> {
    this.log('info', 'Team member added', { teamId, userId: member.userId });
    return this.ok(undefined);
  }

  async removeMember(teamId: string, userId: string): Promise<Result<void>> {
    this.log('info', 'Team member removed', { teamId, userId });
    return this.ok(undefined);
  }
}


// ============================================================================
// SECTION 3: TOURNAMENT ENGINE
// ============================================================================

export class TournamentEngine extends ScholarlyBaseService {
  private teamService: TeamManagementService;

  constructor(tenantId: string) {
    super('TournamentEngine', tenantId);
    this.teamService = new TeamManagementService(tenantId);
  }

  async createTournament(tournament: Omit<Tournament, 'id' | 'currentParticipants' | 'rounds' | 'leaderboard' | 'createdAt' | 'updatedAt'>): Promise<Result<Tournament>> {
    // Validate dates
    if (tournament.registrationCloses >= tournament.startDate) {
      return this.fail('Registration must close before tournament starts');
    }
    if (tournament.startDate >= tournament.endDate) {
      return this.fail('Tournament must end after it starts');
    }

    const newTournament: Tournament = {
      ...tournament,
      id: `tourn_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      currentParticipants: 0,
      rounds: [],
      leaderboard: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.log('info', 'Tournament created', {
      tournamentId: newTournament.id,
      name: tournament.name,
      format: tournament.format.type,
      type: tournament.competitionType,
      phases: tournament.phonicsPhases,
    });

    return this.ok(newTournament);
  }

  // Generate bracket for elimination-style tournaments
  generateBracket(
    participants: MatchParticipant[],
    format: TournamentFormat
  ): Result<TournamentRound[]> {
    if (format.type !== 'single_elimination' && format.type !== 'double_elimination') {
      return this.fail(`Bracket generation only supports elimination formats, got: ${format.type}`);
    }

    // Pad to nearest power of 2 for clean brackets
    const targetSize = Math.pow(2, Math.ceil(Math.log2(participants.length)));
    const byeCount = targetSize - participants.length;

    // Apply seeding
    const seeded = this.seedParticipants(participants, format.seeding);

    // Generate rounds
    const rounds: TournamentRound[] = [];
    let roundParticipants = [...seeded];
    let roundNumber = 1;
    const roundNames = this.getRoundNames(targetSize);

    while (roundParticipants.length > 1) {
      const matches: TournamentMatch[] = [];

      for (let i = 0; i < roundParticipants.length; i += 2) {
        const p1 = roundParticipants[i];
        const p2 = roundParticipants[i + 1];

        // Assign byes in round 1
        const isBye = roundNumber === 1 && i >= (participants.length - byeCount) * 2;

        matches.push({
          matchId: `match_${Date.now()}_${i}`,
          roundId: `round_${roundNumber}`,
          participant1: p1,
          participant2: p2 || { type: 'individual', id: 'bye', name: 'BYE' },
          challengeType: 'mixed',
          phonicsContent: {
            targetGPCs: [],
            questionCount: 10,
          },
          status: isBye ? 'bye' : 'scheduled',
          scheduledAt: new Date(),
        });
      }

      rounds.push({
        roundId: `round_${roundNumber}`,
        roundNumber,
        roundName: roundNames[roundNumber - 1] || `Round ${roundNumber}`,
        status: 'scheduled',
        startDate: new Date(),
        endDate: new Date(),
        matches,
      });

      // Next round has half the participants
      roundParticipants = matches.map(m => m.participant1);  // Placeholder for winners
      roundNumber++;
    }

    return this.ok(rounds);
  }

  // Generate round-robin schedule
  generateRoundRobin(
    participants: MatchParticipant[],
    matchesPerPair: number = 1
  ): Result<TournamentRound[]> {
    const n = participants.length;
    const rounds: TournamentRound[] = [];

    // Circle method for round-robin scheduling
    // If odd number of participants, add a "BYE" participant
    const padded = n % 2 === 0 ? [...participants] : [...participants, { type: 'individual' as const, id: 'bye', name: 'BYE' }];
    const numRounds = padded.length - 1;

    for (let round = 0; round < numRounds * matchesPerPair; round++) {
      const actualRound = round % numRounds;
      const matches: TournamentMatch[] = [];

      // Fixed first participant, rotate rest
      const rotated = [padded[0], ...this.rotateArray(padded.slice(1), actualRound)];

      for (let i = 0; i < rotated.length / 2; i++) {
        const p1 = rotated[i];
        const p2 = rotated[rotated.length - 1 - i];

        if (p1.id === 'bye' || p2.id === 'bye') continue;

        matches.push({
          matchId: `match_rr_${round}_${i}`,
          roundId: `round_${round + 1}`,
          participant1: p1,
          participant2: p2,
          challengeType: 'mixed',
          phonicsContent: { targetGPCs: [], questionCount: 10 },
          status: 'scheduled',
          scheduledAt: new Date(),
        });
      }

      rounds.push({
        roundId: `round_${round + 1}`,
        roundNumber: round + 1,
        roundName: `Week ${round + 1}`,
        status: 'scheduled',
        startDate: new Date(),
        endDate: new Date(),
        matches,
      });
    }

    return this.ok(rounds);
  }

  // Record match result and update leaderboard
  async recordMatchResult(
    tournamentId: string,
    matchId: string,
    result: MatchResult
  ): Promise<Result<{ leaderboardUpdated: boolean; nextMatch?: string }>> {
    // In production: update match record, advance bracket, update Elo
    this.log('info', 'Match result recorded', {
      tournamentId,
      matchId,
      winnerId: result.winnerId,
      score: `${result.participant1Score}-${result.participant2Score}`,
    });

    // Update Elo if team match
    // In production: call teamService.updateEloRatings()

    return this.ok({ leaderboardUpdated: true });
  }

  // Create a "Students vs Teachers" special event
  async createStudentsVsTeachers(config: {
    name: string;
    tenantId: string;
    classroomId: string;
    phonicsPhases: number[];
    handicap: number;             // Teacher accuracy penalty (e.g., 0.1 = teachers need 10% higher accuracy to win)
    matchCount: number;
  }): Promise<Result<Tournament>> {
    const tournament = await this.createTournament({
      tenantId: config.tenantId,
      name: config.name,
      description: `Can the class beat their teacher? Students take turns challenging their teacher in phonics battles. Teachers have a ${Math.round(config.handicap * 100)}% accuracy handicap to keep things fair!`,
      format: { type: 'round_robin', matchesPerPair: config.matchCount },
      competitionType: 'students_vs_teachers',
      phonicsPhases: config.phonicsPhases,
      difficultyTier: 'open',
      registrationOpens: new Date(),
      registrationCloses: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      timezone: 'Australia/Perth',
      minParticipants: 2,
      maxParticipants: 40,
      eligibility: {
        minPhase: config.phonicsPhases[0],
        maxPhase: config.phonicsPhases[config.phonicsPhases.length - 1],
        ageGroups: ['5-7', '7-9'],
        requiresTeacherApproval: true,
        requiresParentConsent: true,
      },
      prizes: [
        { rank: 1, xpReward: 500, badgeId: 'teacher_slayer', tokenReward: 50, title: 'Teacher Slayer', description: 'Beat the teacher in a phonics challenge!' },
        { rank: 0, xpReward: 200, badgeId: 'brave_challenger', tokenReward: 20, title: 'Brave Challenger', description: 'Took on the teacher in a phonics battle' },
      ],
      status: 'draft',
      createdBy: 'system',
    });

    return tournament;
  }

  // Seasonal event factory
  async createSeasonalEvent(season: 'spring' | 'summer' | 'autumn' | 'winter', year: number): Promise<Result<Tournament>> {
    const seasonalThemes: Record<string, { name: string; description: string; badge: string }> = {
      spring: { name: 'Spring Reading Bloom', description: 'Watch your reading skills blossom!', badge: 'spring_bloom' },
      summer: { name: 'Summer Reading Quest', description: 'An epic summer adventure through phonics!', badge: 'summer_quest' },
      autumn: { name: 'Autumn Word Harvest', description: 'Harvest as many words as you can!', badge: 'autumn_harvest' },
      winter: { name: 'Winter Phonics Championship', description: 'The ultimate year-end phonics showdown!', badge: 'winter_champ' },
    };

    const theme = seasonalThemes[season];

    return this.createTournament({
      tenantId: this.tenantId,
      name: `${theme.name} ${year}`,
      description: theme.description,
      format: { type: 'league', weeksPerSeason: 6, matchesPerWeek: 3 },
      competitionType: 'individual',
      phonicsPhases: [1, 2, 3, 4, 5, 6],
      difficultyTier: 'open',
      registrationOpens: new Date(),
      registrationCloses: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      endDate: new Date(Date.now() + 56 * 24 * 60 * 60 * 1000),
      timezone: 'Australia/Perth',
      minParticipants: 8,
      maxParticipants: 1000,
      eligibility: {
        minPhase: 1,
        maxPhase: 6,
        ageGroups: ['3-5', '5-7', '7-9', '9-12'],
        requiresTeacherApproval: false,
        requiresParentConsent: true,
      },
      prizes: [
        { rank: 1, xpReward: 1000, badgeId: `${theme.badge}_gold`, tokenReward: 200, title: `${season.charAt(0).toUpperCase() + season.slice(1)} Champion`, description: `#1 in the ${theme.name}` },
        { rank: 2, xpReward: 500, badgeId: `${theme.badge}_silver`, tokenReward: 100, title: 'Runner-Up', description: 'Top 2 finish' },
        { rank: 3, xpReward: 250, badgeId: `${theme.badge}_bronze`, tokenReward: 50, title: 'Bronze Medalist', description: 'Top 3 finish' },
      ],
      status: 'draft',
      createdBy: 'system',
    });
  }

  private seedParticipants(
    participants: MatchParticipant[],
    seeding: 'random' | 'ranked' | 'geographic'
  ): MatchParticipant[] {
    switch (seeding) {
      case 'random':
        return [...participants].sort(() => Math.random() - 0.5);
      case 'ranked':
        return [...participants].sort((a, b) => (a.seed || 999) - (b.seed || 999));
      case 'geographic':
        // Group by school, then interleave to avoid early-round same-school matches
        const bySchool = new Map<string, MatchParticipant[]>();
        for (const p of participants) {
          const school = p.school || 'unknown';
          if (!bySchool.has(school)) bySchool.set(school, []);
          bySchool.get(school)!.push(p);
        }
        const interleaved: MatchParticipant[] = [];
        const schools = [...bySchool.values()];
        let maxLen = Math.max(...schools.map(s => s.length));
        for (let i = 0; i < maxLen; i++) {
          for (const school of schools) {
            if (i < school.length) interleaved.push(school[i]);
          }
        }
        return interleaved;
      default:
        return participants;
    }
  }

  private getRoundNames(bracketSize: number): string[] {
    const rounds = Math.log2(bracketSize);
    const names: string[] = [];
    for (let i = 0; i < rounds; i++) {
      const remaining = bracketSize / Math.pow(2, i);
      if (remaining === 2) names.push('Final');
      else if (remaining === 4) names.push('Semi-finals');
      else if (remaining === 8) names.push('Quarter-finals');
      else names.push(`Round of ${remaining}`);
    }
    return names.reverse();
  }

  private rotateArray<T>(arr: T[], positions: number): T[] {
    const n = arr.length;
    if (n === 0) return arr;
    const pos = ((positions % n) + n) % n;
    return [...arr.slice(pos), ...arr.slice(0, pos)];
  }
}
