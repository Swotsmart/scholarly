/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Arena Competition Engine: MathCanvas Extension
 * =============================================================================
 *
 * Chunk 2: Additive extension to arena-competition-engine.ts
 *
 * File to patch: packages/api/src/services/arena/arena-competition-engine.ts
 *
 * INSTRUCTIONS:
 *   1. In CompetitionFormat enum, append the three new values below the
 *      COLLABORATIVE_CREATION line.
 *   2. In DEFAULT_CONFIGS array, append the three new config objects at the end.
 *   3. In ScoringEngine.calculateRoundScore(), add the MATH_CHALLENGE case
 *      to the switch statement.
 *   4. Add calculateMathHandicap() method to the ScoringEngine class.
 *
 * Why additive only: The enum is a discriminated union used throughout
 * arena routes, frontend types, Prisma schema, and token economy.
 * Inserting values mid-enum would require recompiling nothing — TypeScript
 * enums are additive. The Zod schema in arena.ts also needs patching (see
 * arena-route.patch.ts).
 * =============================================================================
 */

// ─── PATCH 1: CompetitionFormat enum additions ───────────────────────────────
// Append after: COLLABORATIVE_CREATION = 'COLLABORATIVE_CREATION',

/*
  MATH_CHALLENGE = 'MATH_CHALLENGE',         // Individual: timed mathematical construction / visualisation
  MATH_CONSTRUCTION = 'MATH_CONSTRUCTION',   // Team: collaboratively build a geometric proof or model
  MATH_RELAY = 'MATH_RELAY',                 // Team relay: sequential mathematical problem chain
*/

// ─── PATCH 2: DEFAULT_CONFIGS array additions ────────────────────────────────
// Append after the COLLABORATIVE_CREATION config object, before the closing ];

export const MATH_FORMAT_CONFIGS = [
  {
    format: 'MATH_CHALLENGE' as const,
    minParticipants: 2, maxParticipants: 40, roundCount: 3,
    roundDurationSeconds: 300,              // 5 min per round — think, then visualise
    scoringModel: 'HANDICAPPED' as const,   // BKT mastery-adjusted: weaker students get a boost
    allowWagers: true, maxWagerPerParticipant: 50,
    phonicsPhasesAllowed: [],               // Math: no phonics phase restriction
    ageRange: { min: 8, max: 99 },
    handicapEnabled: true,
    teacherParticipation: true,
    teamSize: null,                          // Individual
    description: 'Individual timed math challenge — visualise and construct in MathCanvas. BKT mastery handicapping ensures fair competition across year levels.',
  },
  {
    format: 'MATH_CONSTRUCTION' as const,
    minParticipants: 4, maxParticipants: 32, roundCount: 1,
    roundDurationSeconds: 1800,             // 30 min collaborative build
    scoringModel: 'COLLABORATIVE' as const,
    allowWagers: false, maxWagerPerParticipant: 0,
    phonicsPhasesAllowed: [],
    ageRange: { min: 10, max: 99 },
    handicapEnabled: false,
    teacherParticipation: true,
    teamSize: 4,                             // Teams of 4
    description: 'Team geometry and algebra construction challenge — collaboratively build a proof, model, or visualisation in MathCanvas. Scored on completeness, elegance, and curriculum alignment.',
  },
  {
    format: 'MATH_RELAY' as const,
    minParticipants: 6, maxParticipants: 48, roundCount: 4,
    roundDurationSeconds: 120,              // 2 min per leg — relay speed
    scoringModel: 'GROWTH_BASED' as const,
    allowWagers: true, maxWagerPerParticipant: 30,
    phonicsPhasesAllowed: [],
    ageRange: { min: 9, max: 99 },
    handicapEnabled: true,
    teacherParticipation: false,            // Students only — teacher sets problems
    teamSize: 3,
    description: 'Sequential math relay — each team member visualises one step of a multi-part problem and passes the canvas to the next. Speed and accuracy both score.',
  },
] as const;

// ─── PATCH 3: ScoringEngine.calculateRoundScore() math cases ─────────────────
// Add to the switch (config.scoringModel) statement after the existing COLLABORATIVE case.
// NOTE: The math scoring re-uses existing ScoringModel values (HANDICAPPED, COLLABORATIVE,
// GROWTH_BASED) — no new ScoringModel enum values needed. What differs is HOW the
// submission payload is interpreted (math dimensions vs reading dimensions).

/**
 * Math submission payload shape (extends SubmitRoundRequest):
 * {
 *   ...existing fields (accuracy, timeSeconds, round),
 *   // Math-specific dimensions:
 *   visualisationScore: number;    // 0–100: did they produce a valid visualisation?
 *   constructionScore:  number;    // 0–100: completeness of geometric/algebraic construction
 *   eleganceScore:      number;    // 0–100: AI-assessed solution elegance (steps, clarity)
 *   curriculumHits:     number;    // Count of ACARA/IB objectives directly evidenced
 *   stepsToSolution:    number;    // Fewer correct steps = higher elegance bonus
 *   collaborationScore: number;    // For MATH_CONSTRUCTION — peer contribution weighting
 * }
 */

// In calculateRoundScore(), the math formats are detected by checking config.format.
// Insert this block BEFORE the switch on config.scoringModel:

/*
  // ── Math format scoring override ──────────────────────────────
  if (
    config.format === 'MATH_CHALLENGE' ||
    config.format === 'MATH_CONSTRUCTION' ||
    config.format === 'MATH_RELAY'
  ) {
    return this.calculateMathScore(submission, config, participant);
  }
*/

// ─── PATCH 4: New ScoringEngine methods ──────────────────────────────────────
// Add these methods to the ScoringEngine class body.

export class MathScoringMethods {
  /**
   * calculateMathScore
   *
   * Math competition scoring departs from the reading scoring model in one key
   * respect: speed (WCPM) is irrelevant. Instead, the three dimensions are:
   *
   *   visualisationScore  — did the student produce a semantically correct
   *                         visualisation for the problem? (AI-assessed by Claude)
   *   constructionScore   — how complete is the construction? (geometry: all
   *                         required elements present; algebra: equation correctly
   *                         solved and graphed)
   *   eleganceScore       — how elegantly was the solution reached? (fewer steps,
   *                         cleaner construction, no redundant elements)
   *
   * These are weighted differently per format:
   *   MATH_CHALLENGE:    vis 40%, construction 40%, elegance 20%
   *   MATH_CONSTRUCTION: vis 25%, construction 50%, elegance 25%
   *   MATH_RELAY:        vis 30%, construction 50%, elegance 20%
   *
   * The BKT handicap applies to MATH_CHALLENGE (same as READING/HANDICAPPED)
   * but uses calculateMathHandicap() which factors in domain mastery
   * (functions / geometry / statistics) rather than phonics phase.
   */
  static calculateMathScore(
    submission: {
      round: number;
      accuracy: number;
      timeSeconds: number;
      visualisationScore?: number;
      constructionScore?: number;
      eleganceScore?: number;
      curriculumHits?: number;
      stepsToSolution?: number;
      collaborationScore?: number;
    },
    config: { format: string; scoringModel: string },
    participant: { handicapFactor: number },
  ): {
    round: number;
    accuracy: number;
    wordsCorrect: number;
    wordsAttempted: number;
    wcpm: number;
    comprehensionScore: number;
    timeSeconds: number;
    growthPoints: number;
    bonusPoints: number;
    totalPoints: number;
    submittedAt: Date;
  } {
    const vis     = submission.visualisationScore  ?? 0;
    const constr  = submission.constructionScore   ?? 0;
    const eleg    = submission.eleganceScore       ?? 0;
    const curHits = submission.curriculumHits      ?? 0;
    const steps   = submission.stepsToSolution     ?? 10;
    const collab  = submission.collaborationScore  ?? 0;

    // Format-specific weights
    const weights =
      config.format === 'MATH_CONSTRUCTION' ? { vis: 0.25, constr: 0.50, eleg: 0.25 } :
      config.format === 'MATH_RELAY'        ? { vis: 0.30, constr: 0.50, eleg: 0.20 } :
      /* MATH_CHALLENGE */                    { vis: 0.40, constr: 0.40, eleg: 0.20 };

    let rawScore = Math.round(
      vis    * weights.vis   * 100 +
      constr * weights.constr * 100 +
      eleg   * weights.eleg  * 100,
    ) / 100;

    // Normalise to 0–100
    rawScore = Math.min(100, Math.max(0, rawScore));

    let bonusPoints = 0;

    // Curriculum bonus: +3 per ACARA/IB objective evidenced (cap 15)
    bonusPoints += Math.min(15, curHits * 3);

    // Elegance bonus: reward compact solutions (fewer steps = better)
    if (steps <= 3) bonusPoints += 10;
    else if (steps <= 5) bonusPoints += 5;

    // Speed bonus for MATH_CHALLENGE and MATH_RELAY: solve quickly
    if (
      (config.format === 'MATH_CHALLENGE' || config.format === 'MATH_RELAY') &&
      submission.timeSeconds < 60
    ) {
      bonusPoints += 8;
    } else if (submission.timeSeconds < 120) {
      bonusPoints += 4;
    }

    // Collaboration bonus for MATH_CONSTRUCTION
    if (config.format === 'MATH_CONSTRUCTION') {
      bonusPoints += Math.round(collab * 0.1); // contribution weighting
    }

    // Apply BKT handicap for MATH_CHALLENGE
    let totalPoints = rawScore + bonusPoints;
    if (config.scoringModel === 'HANDICAPPED') {
      totalPoints = Math.round(totalPoints * participant.handicapFactor);
    }

    // Map back to the standard RoundScore shape (math has no WCPM/wordsCorrect)
    return {
      round:             submission.round,
      accuracy:          submission.accuracy,
      wordsCorrect:      0,     // not applicable for math
      wordsAttempted:    0,     // not applicable for math
      wcpm:              0,     // not applicable for math
      comprehensionScore: constr, // repurpose comprehensionScore for constructionScore
      timeSeconds:       submission.timeSeconds,
      growthPoints:      Math.round(rawScore),
      bonusPoints,
      totalPoints,
      submittedAt:       new Date(),
    };
  }

  /**
   * calculateMathHandicap
   *
   * The existing calculateHandicap() uses phonics phase and mastery average.
   * For math, phase is irrelevant. Instead we use the student's domain mastery
   * (functions, geometry, statistics) averaged across the relevant domain for
   * the competition format, sourced from the BKT engine.
   *
   * Handicap scale:
   *   masterAvg < 40% → 1.30 boost (struggling student gets 30% bonus)
   *   masterAvg < 60% → 1.15 boost
   *   masterAvg < 80% → 1.05 boost
   *   masterAvg >= 80% → 1.00 (no adjustment — strong student plays at full score)
   *   masterAvg >= 90% → 0.90 (top performers slightly penalised to level field)
   *
   * Teacher handicap remains 0.6 (from existing calculateTeacherHandicap()).
   */
  static calculateMathHandicap(
    domainMasteryAvg: number, // 0–1 float from BKT engine
    isTeacher: boolean = false,
  ): number {
    if (isTeacher) return 0.6; // Teacher penalty — same as existing policy

    const pct = domainMasteryAvg * 100;
    if (pct < 40) return 1.30;
    if (pct < 60) return 1.15;
    if (pct < 80) return 1.05;
    if (pct < 90) return 1.00;
    return 0.90; // Top performers play near-full difficulty
  }
}

// ─── PATCH 5: joinCompetition — math domain mastery for handicap ──────────────
// In ArenaCompetitionEngine.joinCompetition(), the existing handicap calculation
// calls calculateHandicap(learnerPhase, learnerMasteryAvg, competitionPhase).
// For math formats, replace with:
//
//   if (isMathFormat(config.format)) {
//     handicapFactor = MathScoringMethods.calculateMathHandicap(
//       domainMasteryAvg,   // from BKT: avg of functions/geometry/statistics
//       isTeacher,
//     );
//   }
//
// domainMasteryAvg should be sourced from the existing BKT lookup:
//   const bktData = await this.redis.get(`bkt:${userId}:math`);
// Falling back to 0.5 (50% = neutral) if not found.

export function isMathFormat(format: string): boolean {
  return (
    format === 'MATH_CHALLENGE' ||
    format === 'MATH_CONSTRUCTION' ||
    format === 'MATH_RELAY'
  );
}

// ─── SUMMARY OF CHANGES ──────────────────────────────────────────────────────
//
// Files changed: 1 (arena-competition-engine.ts)
// Enum additions: 3 (MATH_CHALLENGE, MATH_CONSTRUCTION, MATH_RELAY)
// Config additions: 3 (appended to DEFAULT_CONFIGS array)
// New methods: 2 (calculateMathScore, calculateMathHandicap)
// New utility: 1 (isMathFormat type guard)
// Breaking changes: NONE — purely additive
// Existing tests: unaffected (new formats not in existing test cases)
