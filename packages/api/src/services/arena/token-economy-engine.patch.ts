/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Token Economy Engine: MathCanvas Extension
 * =============================================================================
 *
 * File to patch: packages/api/src/services/arena/token-economy-engine.ts
 *
 * Additive extension only. Three new EarningCategory values + three new
 * EarningRule configs appended to the existing EARNING_RULES array.
 * =============================================================================
 */

// ─── PATCH 1: EarningCategory enum additions ─────────────────────────────────
// Append after: BOUNTY_COMPLETION = 'BOUNTY_COMPLETION',

/*
  // Math domain earning categories
  MATH_VISUALIZATION   = 'MATH_VISUALIZATION',    // Sparks: student creates and shares a valid MathCanvas visualisation
  MATH_COMPETITION_WIN = 'MATH_COMPETITION_WIN',  // Gems: win a MATH_CHALLENGE or MATH_RELAY competition
  MATH_CONSTRUCTION    = 'MATH_CONSTRUCTION',     // Voice: complete a collaborative MATH_CONSTRUCTION event
*/

// ─── PATCH 2: New EarningRule entries ────────────────────────────────────────
// These are appended to the EARNING_RULES array in token-economy-engine.ts.
// The array is initialised at module load. No structural changes required.

export const MATH_EARNING_RULES = [
  {
    // Every time a student visualises something meaningful in MathCanvas and
    // it's broadcast or submitted to a session, they earn Sparks.
    // Intentionally modest — this fires frequently, so the daily cap prevents farming.
    category: 'MATH_VISUALIZATION' as const,
    tokenType: 'SPARKS' as const,
    baseAmount: 5,
    multiplierFactors: [
      { condition: 'sessionBroadcast',  multiplier: 1.5, description: 'Visualisation shared in live session' },
      { condition: 'curriculumAligned', multiplier: 1.4, description: 'AI confirmed ACARA/IB objective alignment' },
      { condition: 'teacherFlagged',    multiplier: 1.3, description: 'Teacher spotlighted for class discussion' },
      { condition: 'forkedByPeer',      multiplier: 1.2, description: 'Another student forked their canvas' },
    ],
    dailyCap: 35,       // ~7 meaningful visualisations per day before cap
    weeklyCap: 150,
    cooldownMinutes: 0, // No cooldown — fires on each distinct visualisation
    minAge: 7,
    description: 'Earn Sparks for creating and sharing mathematical visualisations in MathCanvas.',
  },
  {
    // Winning or placing top-3 in a MATH_CHALLENGE or MATH_RELAY competition.
    // Gems are the premium currency — only awarded for meaningful achievements.
    category: 'MATH_COMPETITION_WIN' as const,
    tokenType: 'GEMS' as const,
    baseAmount: 12,
    multiplierFactors: [
      { condition: 'tournamentFinal',    multiplier: 3.0, description: 'Tournament final (school/platform-wide)' },
      { condition: 'firstPlace',         multiplier: 2.0, description: 'First place in competition' },
      { condition: 'secondPlace',        multiplier: 1.4, description: 'Second place in competition' },
      { condition: 'thirdPlace',         multiplier: 1.2, description: 'Third place in competition' },
      { condition: 'perfectScore',       multiplier: 2.5, description: 'Perfect visualisation and construction score' },
      { condition: 'handicapOvercome',   multiplier: 1.5, description: 'Won despite negative BKT handicap' },
    ],
    dailyCap: 60,       // Up to 5 competition wins per day
    weeklyCap: 250,
    cooldownMinutes: 30,
    minAge: 8,
    description: 'Earn Gems for winning or placing in MathCanvas competitions.',
  },
  {
    // Completing a MATH_CONSTRUCTION collaborative event earns Voice tokens —
    // the platform's community/contribution currency. Collaborative mathematical
    // work is a contribution to the community knowledge base.
    category: 'MATH_CONSTRUCTION' as const,
    tokenType: 'VOICE' as const,
    baseAmount: 8,
    multiplierFactors: [
      { condition: 'teamCaptain',        multiplier: 1.3, description: 'Led the construction team' },
      { condition: 'curriculumEvidence', multiplier: 1.4, description: 'Team construction cited 3+ objectives' },
      { condition: 'teacherEndorsed',    multiplier: 1.5, description: 'Teacher endorsed for class showcase' },
      { condition: 'communityFeatured',  multiplier: 2.0, description: 'Construction featured in community gallery' },
    ],
    dailyCap: 30,
    weeklyCap: 100,
    cooldownMinutes: 60, // One construction event per hour max
    minAge: 10,
    description: 'Earn Voice tokens for completing collaborative mathematical construction events.',
  },
] as const;

// ─── Integration note ─────────────────────────────────────────────────────────
//
// When a MathCanvas session submits a visualisation or competition result, the
// calling service should invoke tokenEngine.awardTokens() with the appropriate
// category from the list above.
//
// Example (in the mathcanvas session submission handler):
//
//   await tokenEngine.awardTokens({
//     userId:     submission.studentId,
//     tenantId:   submission.tenantId,
//     category:   EarningCategory.MATH_VISUALIZATION,
//     conditions: {
//       sessionBroadcast:  submission.wasBroadcast,
//       curriculumAligned: submission.curriculumHits > 0,
//       teacherFlagged:    submission.teacherSpotlighted,
//       forkedByPeer:      submission.forkCount > 0,
//     },
//   });
//
// The existing awardTokens() method handles multiplier application, daily/weekly
// caps, and cooldown enforcement — no changes required to its implementation.
