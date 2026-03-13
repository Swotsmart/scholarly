/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Arena Routes: MathCanvas Format Schema Extension
 * =============================================================================
 *
 * File to patch: packages/api/src/routes/arena.ts
 *
 * Two changes:
 *   1. createCompetitionSchema — add math formats to z.enum()
 *   2. POST /competitions handler — add math domain mastery lookup for handicap
 * =============================================================================
 */

// ─── PATCH 1: createCompetitionSchema ────────────────────────────────────────
// Replace the existing format z.enum([...]) with the extended version.
//
// FROM:
//   format: z.enum([
//     'READING_SPRINT', 'ACCURACY_CHALLENGE', 'COMPREHENSION_QUIZ',
//     'WORD_BLITZ', 'PHONICS_DUEL', 'TEAM_RELAY', 'STORY_SHOWDOWN',
//     'SPELLING_BEE', 'VOCABULARY_CHALLENGE', 'COLLABORATIVE_CREATION',
//   ]),
//
// TO:
//   format: z.enum([
//     'READING_SPRINT', 'ACCURACY_CHALLENGE', 'COMPREHENSION_QUIZ',
//     'WORD_BLITZ', 'PHONICS_DUEL', 'TEAM_RELAY', 'STORY_SHOWDOWN',
//     'SPELLING_BEE', 'VOCABULARY_CHALLENGE', 'COLLABORATIVE_CREATION',
//     'MATH_CHALLENGE', 'MATH_CONSTRUCTION', 'MATH_RELAY',          // ← NEW
//   ]),

// The diff is a single line addition. Everything else in the schema is unchanged.

// ─── PATCH 2: submitRoundSchema — math fields (optional, backward compatible) ─
// If a submitRoundSchema exists in arena.ts, add these optional fields so math
// submissions carry their scoring dimensions without breaking reading submissions.
//
// Append to submitRoundSchema (or wherever round submissions are validated):
//
//   visualisationScore: z.number().min(0).max(100).optional(),
//   constructionScore:  z.number().min(0).max(100).optional(),
//   eleganceScore:      z.number().min(0).max(100).optional(),
//   curriculumHits:     z.number().int().min(0).optional(),
//   stepsToSolution:    z.number().int().min(1).optional(),
//   collaborationScore: z.number().min(0).max(100).optional(),

// ─── PATCH 3: POST /competitions — math handicap lookup ──────────────────────
// In the joinCompetition handler, after the existing BKT lookup for phonics phase,
// add the math mastery lookup:
//
//   // Math format: use domain mastery instead of phonics phase for handicap
//   if (isMathFormat(params.format)) {
//     const mathBkt = await redis.get(`bkt:${user.id}:math`);
//     const mathMastery = mathBkt ? JSON.parse(mathBkt) : null;
//     const domainAvg = mathMastery
//       ? (mathMastery.functions + mathMastery.geometry + mathMastery.statistics) / 3
//       : 0.5; // default to 50% if no BKT data yet
//     handicapFactor = MathScoringMethods.calculateMathHandicap(domainAvg, isTeacher);
//   }

// ─── PATCH 4: New route — POST /competitions/:id/math-submit ─────────────────
// Dedicated submission endpoint for MathCanvas competitions. Mirrors the existing
// round submission pattern but accepts math-specific payload dimensions.
// This is NEW — does not replace any existing route.

export const MATH_SUBMIT_ROUTE_SPEC = `
arenaRouter.post('/competitions/:id/math-submit', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const body = mathSubmitSchema.parse(req.body);

    // 1. Validate competition exists and is IN_PROGRESS
    const competition = await prisma.arenaCompetition.findFirst({
      where: { id, tenantId: user.tenantId, status: 'IN_PROGRESS' },
    });
    if (!competition) return res.status(404).json({ error: 'Competition not found or not active' });

    // 2. Get participant record
    const participant = await prisma.arenaParticipant.findFirst({
      where: { competitionId: id, userId: user.id },
    });
    if (!participant) return res.status(403).json({ error: 'Not registered for this competition' });

    // 3. Calculate math score
    const score = MathScoringMethods.calculateMathScore(body, competition.config, {
      handicapFactor: participant.handicapFactor,
    });

    // 4. Persist round score (reuses existing ArenaRoundScore model)
    await prisma.arenaRoundScore.create({
      data: {
        participantId: participant.id,
        round: body.round,
        totalPoints: score.totalPoints,
        bonusPoints: score.bonusPoints,
        growthPoints: score.growthPoints,
        accuracy: body.visualisationScore ?? 0,  // repurposed field
        wcpm: 0,
        wordsCorrect: 0,
        wordsAttempted: 0,
        timeSeconds: body.timeSeconds,
        submittedAt: score.submittedAt,
        // metadata stores math-specific dimensions
        metadata: JSON.stringify({
          visualisationScore: body.visualisationScore,
          constructionScore:  body.constructionScore,
          eleganceScore:      body.eleganceScore,
          curriculumHits:     body.curriculumHits,
          stepsToSolution:    body.stepsToSolution,
          canvasStateHash:    body.canvasStateHash,
        }),
      },
    });

    // 5. Award MATH_VISUALIZATION tokens
    // (token engine call — see token-economy-engine.patch.ts)

    // 6. Publish NATS event: scholarly.arena.competition.round-completed
    // (same pattern as existing phonics round completions)

    return res.json({ score, message: 'Math round submitted' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to submit math round' });
  }
});
`;

// ─── SUMMARY ─────────────────────────────────────────────────────────────────
// Files changed: 1 (arena.ts)
// Schema changes: +3 enum values in createCompetitionSchema (1 line addition)
// New routes: 1 (POST /competitions/:id/math-submit)
// Breaking changes: NONE
