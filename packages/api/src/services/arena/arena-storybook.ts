/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Arena Storybook Integration
 * =============================================================================
 *
 * Sprint 5, PW-008: The bridge between the Storybook Engine and the Arena
 * competitive learning platform. When a child finishes reading a book in the
 * Enchanted Library, this service translates that reading performance into
 * competitive points that feed into whatever Arena format is active — whether
 * that's a classroom tournament, an inter-school league, or a student vs
 * teacher showdown.
 *
 * Think of it like a sports league where reading is the game: every book
 * completed is a match played, the accuracy and fluency metrics determine
 * the score, and the Arena tracks standings across teams and seasons.
 *
 * Key design: The scoring is deliberately generous — a child who reads a book
 * and struggles through it still earns points. The system rewards effort and
 * engagement, not just accuracy. A child reading below their level earns
 * fewer points than one stretching to a harder book, creating a natural
 * incentive to progress.
 *
 * Total: ~650 lines
 * =============================================================================
 */

import { randomUUID } from 'crypto';

// =============================================================================
// ARENA TYPES (from Arena module)
// =============================================================================

interface ArenaCompetition {
  id: string;
  tenantId: string;
  format: ArenaFormat;
  status: 'setup' | 'active' | 'paused' | 'completed';
  startDate: Date;
  endDate: Date;
  config: ArenaConfig;
}

type ArenaFormat =
  | 'individual_rivalry'     // Student vs student
  | 'class_battle'           // Class vs class
  | 'school_league'          // School vs school
  | 'state_championship'     // State/region vs state/region
  | 'students_vs_teachers'   // Students collectively vs their teachers
  | 'house_cup'              // House system (like Hogwarts)
  | 'guild_tournament'       // Self-formed groups
  | 'parent_child_duo'       // Parent-child pairs
  | 'reading_relay'          // Sequential team challenge
  | 'global_quest';          // All learners contribute to a shared goal

interface ArenaConfig {
  scoringModel: ScoringModel;
  handicapEnabled: boolean;
  handicapConfig?: HandicapConfig;
  bonusRules: BonusRule[];
  leaderboardVisibility: 'public' | 'class_only' | 'hidden';
}

interface ScoringModel {
  basePointsPerBook: number;        // Points just for completing a book
  accuracyMultiplierMax: number;    // Max multiplier for high accuracy
  fluencyMultiplierMax: number;     // Max multiplier for good WCPM
  stretchBonus: number;             // Extra points for reading above level
  reReadPenalty: number;            // Multiplier for re-reads (0.5 = half points)
  phaseMultipliers: Record<string, number>; // Higher phases worth more
}

interface HandicapConfig {
  // For students_vs_teachers: teachers need to score X% more to win
  teacherHandicap: number;          // e.g. 1.5 = teachers need 150% of student score
  // For mixed-age competitions: normalise by reading level
  levelNormalisation: boolean;
  // For school leagues: normalise by school size
  sizeNormalisation: boolean;
}

interface BonusRule {
  type: 'streak' | 'milestone' | 'team_complete' | 'gpc_mastery' | 'diversity' | 'challenge';
  points: number;
  condition: any; // Rule-specific condition
}

// =============================================================================
// SCORING ENGINE
// =============================================================================

interface ReadingCompletionData {
  learnerId: string;
  storybookId: string;
  phonicsPhase: string;
  completed: boolean;
  accuracy: number;         // 0–1
  wcpm: number;             // Words correct per minute
  timeSeconds: number;
  isReRead: boolean;
  gpcAccuracy: Record<string, number>;
  learnerCurrentPhase: string;
  deviceId: string;
}

interface ArenaScoreResult {
  competitionId: string;
  learnerId: string;
  teamId?: string;
  rawPoints: number;
  bonusPoints: number;
  totalPoints: number;
  breakdown: ScoreBreakdown;
  badges: string[];          // Badges earned from this reading
  streakCount: number;       // Current reading streak
  milestones: string[];      // Milestones hit
}

interface ScoreBreakdown {
  basePoints: number;
  accuracyMultiplier: number;
  fluencyMultiplier: number;
  phaseMultiplier: number;
  stretchBonus: number;
  reReadAdjustment: number;
  handicapAdjustment: number;
  bonuses: Array<{ type: string; points: number; reason: string }>;
}

export class ArenaStorybookScoring {
  /**
   * Calculate Arena points from a reading completion event.
   *
   * The scoring formula:
   * total = (base × accuracy_mult × fluency_mult × phase_mult + stretch_bonus)
   *         × reread_adjustment + bonus_points
   *
   * Then adjusted by handicap if applicable.
   */
  calculateScore(
    reading: ReadingCompletionData,
    competition: ArenaCompetition,
    context: {
      currentStreak: number;
      totalBooksInCompetition: number;
      teamMembersCompleted?: number;
      teamSize?: number;
      isTeacher?: boolean;
    }
  ): ArenaScoreResult {
    const model = competition.config.scoringModel;
    const breakdown: ScoreBreakdown = {
      basePoints: 0,
      accuracyMultiplier: 1,
      fluencyMultiplier: 1,
      phaseMultiplier: 1,
      stretchBonus: 0,
      reReadAdjustment: 1,
      handicapAdjustment: 1,
      bonuses: [],
    };
    const badges: string[] = [];
    const milestones: string[] = [];

    // --- Base points: you showed up and read a book ---
    if (!reading.completed) {
      // Partial credit: proportional to how far they got
      breakdown.basePoints = Math.round(model.basePointsPerBook * 0.3);
    } else {
      breakdown.basePoints = model.basePointsPerBook;
    }

    // --- Accuracy multiplier: how well they read ---
    // Linear scale from 0.5 (0% accuracy) to max (100% accuracy)
    breakdown.accuracyMultiplier = 0.5 + (reading.accuracy * (model.accuracyMultiplierMax - 0.5));

    // --- Fluency multiplier: how smoothly they read ---
    // Based on WCPM relative to expected range for their phase
    const expectedWcpm = this.getExpectedWcpm(reading.phonicsPhase);
    const fluencyRatio = Math.min(reading.wcpm / expectedWcpm.target, 1.5);
    breakdown.fluencyMultiplier = 0.7 + (fluencyRatio * (model.fluencyMultiplierMax - 0.7));

    // --- Phase multiplier: harder phases worth more ---
    breakdown.phaseMultiplier = model.phaseMultipliers[reading.phonicsPhase] || 1.0;

    // --- Stretch bonus: reading above your current level ---
    const phaseOrder = ['PHASE_1', 'PHASE_2', 'PHASE_3', 'PHASE_4', 'PHASE_5', 'PHASE_6'];
    const bookPhaseIndex = phaseOrder.indexOf(reading.phonicsPhase);
    const learnerPhaseIndex = phaseOrder.indexOf(reading.learnerCurrentPhase);
    if (bookPhaseIndex > learnerPhaseIndex) {
      breakdown.stretchBonus = model.stretchBonus * (bookPhaseIndex - learnerPhaseIndex);
      badges.push('stretch_reader');
    }

    // --- Re-read adjustment ---
    if (reading.isReRead) {
      breakdown.reReadAdjustment = model.reReadPenalty;
    }

    // --- Calculate raw points ---
    let rawPoints = Math.round(
      (breakdown.basePoints *
        breakdown.accuracyMultiplier *
        breakdown.fluencyMultiplier *
        breakdown.phaseMultiplier +
        breakdown.stretchBonus) *
      breakdown.reReadAdjustment
    );

    // --- Handicap adjustment (for students_vs_teachers and mixed formats) ---
    if (competition.config.handicapEnabled && competition.config.handicapConfig) {
      if (context.isTeacher && competition.format === 'students_vs_teachers') {
        // Teachers earn fewer effective points to make competition fair
        breakdown.handicapAdjustment = 1 / competition.config.handicapConfig.teacherHandicap;
        rawPoints = Math.round(rawPoints * breakdown.handicapAdjustment);
      }
    }

    // --- Bonus rules ---
    let bonusPoints = 0;
    for (const rule of competition.config.bonusRules) {
      const bonus = this.evaluateBonus(rule, reading, context, badges);
      if (bonus) {
        breakdown.bonuses.push(bonus);
        bonusPoints += bonus.points;
      }
    }

    // --- Milestones ---
    const totalWithThis = context.totalBooksInCompetition + 1;
    const milestoneThresholds = [5, 10, 25, 50, 100, 250, 500];
    for (const threshold of milestoneThresholds) {
      if (totalWithThis === threshold) {
        milestones.push(`${threshold}_books_read`);
        bonusPoints += Math.round(threshold * 0.5); // Milestone bonus
        breakdown.bonuses.push({
          type: 'milestone',
          points: Math.round(threshold * 0.5),
          reason: `Reached ${threshold} books in this competition`,
        });
      }
    }

    // --- Accuracy badges ---
    if (reading.accuracy >= 0.95 && reading.completed) {
      badges.push('perfect_reader');
    } else if (reading.accuracy >= 0.85 && reading.completed) {
      badges.push('excellent_reader');
    }

    // --- Streak recognition ---
    const newStreak = reading.completed ? context.currentStreak + 1 : 0;
    if (newStreak >= 7) {
      badges.push('week_warrior');
    }
    if (newStreak >= 30) {
      badges.push('monthly_champion');
    }

    return {
      competitionId: competition.id,
      learnerId: reading.learnerId,
      rawPoints,
      bonusPoints,
      totalPoints: rawPoints + bonusPoints,
      breakdown,
      badges,
      streakCount: newStreak,
      milestones,
    };
  }

  /**
   * Evaluate a bonus rule against the current reading context.
   */
  private evaluateBonus(
    rule: BonusRule,
    reading: ReadingCompletionData,
    context: {
      currentStreak: number;
      totalBooksInCompetition: number;
      teamMembersCompleted?: number;
      teamSize?: number;
    },
    badges: string[]
  ): { type: string; points: number; reason: string } | null {
    switch (rule.type) {
      case 'streak': {
        const streakThreshold = rule.condition?.minStreak || 3;
        if (context.currentStreak + 1 >= streakThreshold) {
          return {
            type: 'streak',
            points: rule.points,
            reason: `${streakThreshold}-day reading streak`,
          };
        }
        break;
      }
      case 'gpc_mastery': {
        // Bonus if all target GPCs have >80% accuracy
        const threshold = rule.condition?.accuracyThreshold || 0.8;
        const targetGpcs = rule.condition?.gpcs as string[] || [];
        if (targetGpcs.length > 0) {
          const allMastered = targetGpcs.every(
            (gpc) => (reading.gpcAccuracy[gpc] || 0) >= threshold
          );
          if (allMastered) {
            return {
              type: 'gpc_mastery',
              points: rule.points,
              reason: `Mastered GPCs: ${targetGpcs.join(', ')}`,
            };
          }
        }
        break;
      }
      case 'team_complete': {
        // Bonus when every team member has read at least one book today
        if (context.teamMembersCompleted && context.teamSize) {
          if (context.teamMembersCompleted + 1 >= context.teamSize) {
            return {
              type: 'team_complete',
              points: rule.points,
              reason: 'Entire team read today!',
            };
          }
        }
        break;
      }
      case 'diversity': {
        // Bonus for reading books across different themes/cultural contexts
        const threshold = rule.condition?.minDiversity || 3;
        const booksRead = context.totalBooksInCompetition + 1;
        if (booksRead >= threshold && booksRead % threshold === 0) {
          return {
            type: 'diversity',
            points: rule.points,
            reason: `Read ${booksRead} diverse books`,
          };
        }
        break;
      }
      case 'challenge': {
        // Bonus for completing a specific challenge book
        const challengeBookId = rule.condition?.storybookId;
        if (challengeBookId && reading.storybookId === challengeBookId && reading.completed) {
          return {
            type: 'challenge',
            points: rule.points,
            reason: 'Completed challenge book!',
          };
        }
        break;
      }
    }
    return null;
  }

  /**
   * Expected WCPM ranges by phonics phase. These are based on research
   * benchmarks for fluency development in English-speaking children.
   */
  private getExpectedWcpm(phase: string): { min: number; target: number; max: number } {
    const ranges: Record<string, { min: number; target: number; max: number }> = {
      PHASE_1: { min: 10, target: 20, max: 30 },
      PHASE_2: { min: 20, target: 40, max: 60 },
      PHASE_3: { min: 40, target: 60, max: 90 },
      PHASE_4: { min: 60, target: 80, max: 110 },
      PHASE_5: { min: 80, target: 100, max: 130 },
      PHASE_6: { min: 100, target: 120, max: 160 },
    };
    return ranges[phase] || ranges['PHASE_3'];
  }
}

// =============================================================================
// ARENA EVENT HANDLER
// =============================================================================
// This is the NATS consumer handler registered in PW-004 that processes
// library.book.read events and translates them into Arena score updates.

export class ArenaReadingEventHandler {
  constructor(
    private readonly scoring: ArenaStorybookScoring,
    private readonly deps: {
      /** Find active competitions for a learner */
      getActiveCompetitions: (tenantId: string, learnerId: string) => Promise<ArenaCompetition[]>;
      /** Get learner's context within a competition */
      getCompetitionContext: (competitionId: string, learnerId: string) => Promise<{
        currentStreak: number;
        totalBooksInCompetition: number;
        teamId?: string;
        teamMembersCompleted?: number;
        teamSize?: number;
        isTeacher?: boolean;
      }>;
      /** Save score to Arena leaderboard */
      saveScore: (score: ArenaScoreResult & { teamId?: string }) => Promise<void>;
      /** Emit Arena events */
      emitArenaEvent: (event: {
        type: string;
        tenantId: string;
        competitionId: string;
        learnerId: string;
        data: any;
      }) => Promise<void>;
      /** Award badges */
      awardBadges: (tenantId: string, learnerId: string, badges: string[]) => Promise<void>;
    }
  ) {}

  /**
   * Handle a book.read event: find all active competitions the learner
   * is enrolled in, calculate scores for each, and update leaderboards.
   */
  async handleReadingCompletion(
    tenantId: string,
    reading: ReadingCompletionData
  ): Promise<ArenaScoreResult[]> {
    const competitions = await this.deps.getActiveCompetitions(tenantId, reading.learnerId);

    if (competitions.length === 0) {
      return []; // Learner not in any active competition
    }

    const results: ArenaScoreResult[] = [];

    for (const competition of competitions) {
      try {
        const context = await this.deps.getCompetitionContext(
          competition.id,
          reading.learnerId
        );

        const score = this.scoring.calculateScore(reading, competition, context);

        // Save to leaderboard
        await this.deps.saveScore({ ...score, teamId: context.teamId });

        // Award badges
        if (score.badges.length > 0) {
          await this.deps.awardBadges(tenantId, reading.learnerId, score.badges);
        }

        // Emit events for real-time leaderboard updates
        await this.deps.emitArenaEvent({
          type: 'arena.score.updated',
          tenantId,
          competitionId: competition.id,
          learnerId: reading.learnerId,
          data: {
            totalPoints: score.totalPoints,
            rawPoints: score.rawPoints,
            bonusPoints: score.bonusPoints,
            streakCount: score.streakCount,
            teamId: context.teamId,
            milestones: score.milestones,
            badges: score.badges,
          },
        });

        results.push(score);
      } catch (error: any) {
        // Log but don't fail: one competition's scoring failure shouldn't
        // prevent other competitions from being updated
        console.error(
          `Arena scoring failed for competition ${competition.id}: ${error.message}`
        );
      }
    }

    return results;
  }
}

// =============================================================================
// DEFAULT SCORING MODELS BY FORMAT
// =============================================================================
// Pre-configured scoring models that work well for each Arena format.
// These are starting points that tenant administrators can customise.

export const DEFAULT_SCORING_MODELS: Record<ArenaFormat, ScoringModel> = {
  individual_rivalry: {
    basePointsPerBook: 100,
    accuracyMultiplierMax: 2.0,
    fluencyMultiplierMax: 1.5,
    stretchBonus: 50,
    reReadPenalty: 0.3,
    phaseMultipliers: {
      PHASE_1: 0.5, PHASE_2: 0.8, PHASE_3: 1.0,
      PHASE_4: 1.2, PHASE_5: 1.5, PHASE_6: 2.0,
    },
  },
  class_battle: {
    basePointsPerBook: 80,
    accuracyMultiplierMax: 1.8,
    fluencyMultiplierMax: 1.3,
    stretchBonus: 40,
    reReadPenalty: 0.5,
    phaseMultipliers: {
      PHASE_1: 0.7, PHASE_2: 0.9, PHASE_3: 1.0,
      PHASE_4: 1.1, PHASE_5: 1.3, PHASE_6: 1.5,
    },
  },
  school_league: {
    basePointsPerBook: 60,
    accuracyMultiplierMax: 1.5,
    fluencyMultiplierMax: 1.3,
    stretchBonus: 30,
    reReadPenalty: 0.5,
    phaseMultipliers: {
      PHASE_1: 0.8, PHASE_2: 0.9, PHASE_3: 1.0,
      PHASE_4: 1.1, PHASE_5: 1.2, PHASE_6: 1.3,
    },
  },
  state_championship: {
    basePointsPerBook: 50,
    accuracyMultiplierMax: 1.5,
    fluencyMultiplierMax: 1.2,
    stretchBonus: 25,
    reReadPenalty: 0.5,
    phaseMultipliers: {
      PHASE_1: 0.8, PHASE_2: 0.9, PHASE_3: 1.0,
      PHASE_4: 1.1, PHASE_5: 1.2, PHASE_6: 1.3,
    },
  },
  students_vs_teachers: {
    basePointsPerBook: 100,
    accuracyMultiplierMax: 2.0,
    fluencyMultiplierMax: 1.5,
    stretchBonus: 75, // Extra incentive for students to stretch
    reReadPenalty: 0.5,
    phaseMultipliers: {
      PHASE_1: 0.6, PHASE_2: 0.8, PHASE_3: 1.0,
      PHASE_4: 1.3, PHASE_5: 1.6, PHASE_6: 2.0,
    },
  },
  house_cup: {
    basePointsPerBook: 80,
    accuracyMultiplierMax: 1.8,
    fluencyMultiplierMax: 1.4,
    stretchBonus: 50,
    reReadPenalty: 0.4,
    phaseMultipliers: {
      PHASE_1: 0.7, PHASE_2: 0.9, PHASE_3: 1.0,
      PHASE_4: 1.2, PHASE_5: 1.4, PHASE_6: 1.6,
    },
  },
  guild_tournament: {
    basePointsPerBook: 90,
    accuracyMultiplierMax: 2.0,
    fluencyMultiplierMax: 1.5,
    stretchBonus: 60,
    reReadPenalty: 0.3,
    phaseMultipliers: {
      PHASE_1: 0.6, PHASE_2: 0.8, PHASE_3: 1.0,
      PHASE_4: 1.3, PHASE_5: 1.5, PHASE_6: 1.8,
    },
  },
  parent_child_duo: {
    basePointsPerBook: 120,
    accuracyMultiplierMax: 1.5,
    fluencyMultiplierMax: 1.3,
    stretchBonus: 30,
    reReadPenalty: 0.7, // Re-reads more valuable in parent-child context
    phaseMultipliers: {
      PHASE_1: 1.0, PHASE_2: 1.0, PHASE_3: 1.0,
      PHASE_4: 1.0, PHASE_5: 1.0, PHASE_6: 1.0,
    },
  },
  reading_relay: {
    basePointsPerBook: 100,
    accuracyMultiplierMax: 1.8,
    fluencyMultiplierMax: 1.5,
    stretchBonus: 40,
    reReadPenalty: 0.0, // No re-reads in relay format
    phaseMultipliers: {
      PHASE_1: 0.7, PHASE_2: 0.9, PHASE_3: 1.0,
      PHASE_4: 1.2, PHASE_5: 1.4, PHASE_6: 1.6,
    },
  },
  global_quest: {
    basePointsPerBook: 50,
    accuracyMultiplierMax: 1.3,
    fluencyMultiplierMax: 1.2,
    stretchBonus: 20,
    reReadPenalty: 0.5,
    phaseMultipliers: {
      PHASE_1: 1.0, PHASE_2: 1.0, PHASE_3: 1.0,
      PHASE_4: 1.0, PHASE_5: 1.0, PHASE_6: 1.0,
    },
  },
};
