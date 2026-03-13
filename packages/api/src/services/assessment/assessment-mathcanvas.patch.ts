/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Assessment Mesh: MathCanvas Extension
 * =============================================================================
 *
 * Files to patch:
 *   packages/api/src/services/assessment-mesh-types.ts  → new format enum value
 *   packages/api/src/services/assessment-mesh.service.ts → new submitMathCanvas()
 *   packages/api/src/routes/advanced-learning.ts (or new route file)
 *
 * All changes additive. Existing AssessmentFormat, AssessmentPurpose enums
 * are extended with one new value each. No existing code modified.
 * =============================================================================
 */

// ─── PATCH 1: AssessmentFormat enum ──────────────────────────────────────────
// Append after MIXED = 'mixed':
//   MATHCANVAS = 'mathcanvas'   // MathCanvas visualisation + construction artifact

// ─── PATCH 2: New MathCanvas submission payload type ─────────────────────────
export interface MathCanvasSubmissionPayload {
  // Canvas state
  svgSnapshot:       string;           // base64 SVG or serialised canvas state
  intentText:        string;           // student's stated intent
  paramHistory:      string[];         // list of parameters used (e.g. ['a=2','b=-3'])
  issyChatLog?:      { role:string; content:string }[];  // Issy conversation

  // Auto-scored dimensions (from MathScoringMethods.calculateMathScore)
  visualisationScore: number;
  constructionScore:  number;
  eleganceScore:      number;
  curriculumHits:     number;
  stepsToSolution:    number;

  // Context
  strand:            'functions'|'geometry'|'statistics'|'number';
  sessionId?:        string;           // MathCanvas collaboration session ID
  competitionId?:    string;           // Arena competition ID if applicable
  canvasStateHash:   string;           // delta hash for audit trail
}

// ─── PATCH 3: GradebookItem metadata extension ───────────────────────────────
// GradebookItem.metadata (JSON column) accepts MathCanvas context:
export interface MathCanvasGradebookMetadata {
  source:            'mathcanvas';
  strand:            string;
  visualisationScore: number;
  constructionScore:  number;
  eleganceScore:      number;
  curriculumHits:     number;
  rubricGrade?:      string;           // AI rubric grade (A/B/C/D)
  sessionId?:        string;
  competitionId?:    string;
  svgSnapshot?:      string;
}

// ─── PATCH 4: New API route — POST /api/assessment/mathcanvas ─────────────────
// Add to packages/api/src/routes/advanced-learning.ts (or create
// packages/api/src/routes/mathcanvas-assessment.ts and mount in server.ts)

export const MATHCANVAS_ASSESSMENT_ROUTES = `
// POST /api/assessment/mathcanvas — create MathCanvas assessment attempt
router.post('/assessment/mathcanvas', async (req, res) => {
  try {
    const user = req.user!;
    const body = mathCanvasSubmitSchema.parse(req.body);

    // 1. Resolve or create a MathCanvas assessment definition
    //    (the teacher may have set one up via /teacher/assessment/builder,
    //     or we auto-create a formative one for the session)
    const assessmentId = body.assessmentId || await getOrCreateMathCanvasAssessment(
      user.tenantId, body.strand, body.purpose, prisma
    );

    // 2. Create AssessmentAttempt
    const attempt = await prisma.assessmentAttempt.create({
      data: {
        tenantId:      user.tenantId,
        assessmentId,
        studentId:     user.id,
        status:        'SUBMITTED',
        startedAt:     new Date(body.startedAt || Date.now()),
        submittedAt:   new Date(),
        answers: [{
          questionId:   'mathcanvas-main',
          responseType: 'mathcanvas',
          response:     JSON.stringify(body.payload),
          autoScore:    body.payload.visualisationScore,
          maxScore:     100,
        }],
        totalScore:    body.total,
        metadata:      JSON.stringify({
          strand:        body.strand,
          sessionId:     body.sessionId,
          competitionId: body.competitionId,
        }),
      },
    });

    // 3. Add GradebookItem
    await gradebookService.addItem({
      tenantId:     user.tenantId,
      gradebookId:  body.gradebookId,
      assessmentId,
      studentId:    user.id,
      score:        body.total,
      maxScore:     100,
      feedback:     'MathCanvas ' + body.purpose,
      metadata:     { source:'mathcanvas', ...body.payload },
    });

    // 4. Publish NATS event for BKT update
    await nats.publish('scholarly.mathcanvas.assessment.submitted', {
      attemptId:  attempt.id,
      studentId:  user.id,
      tenantId:   user.tenantId,
      strand:     body.strand,
      scores:     body.payload,
      total:      body.total,
    });

    return res.json({ attemptId: attempt.id, total: body.total });
  } catch (err) {
    return res.status(500).json({ error: 'Submission failed' });
  }
});

// POST /api/assessment/mathcanvas/:id/rubric — AI rubric for existing attempt
router.post('/assessment/mathcanvas/:id/rubric', async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user!;
    const attempt = await prisma.assessmentAttempt.findFirst({
      where: { id, tenantId: user.tenantId },
    });
    if (!attempt) return res.status(404).json({ error: 'Attempt not found' });

    // AI rubric scoring via existing assessmentService.aiMark()
    const rubric = await assessmentService.generateAIRubric(attempt.id, {
      format: 'MATHCANVAS',
      strand: JSON.parse(attempt.metadata || '{}').strand,
    });

    // Update attempt with rubric scores
    await prisma.assessmentAttempt.update({
      where: { id },
      data: { aiRubricScore: rubric.overall, aiRubricFeedback: rubric.narrative },
    });

    return res.json(rubric);
  } catch (err) {
    return res.status(500).json({ error: 'AI rubric failed' });
  }
});

// GET /api/assessment/quickcheck/session/:sessionId — teacher quick-check view
// Returns all student canvas states for a given collaboration session
router.get('/assessment/quickcheck/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const user = req.user!;
    // Fetch from Redis (live session deltas) + DB (committed snapshots)
    const liveStates = await redis.get(\`mathcanvas:session:\${sessionId}:states\`);
    return res.json({ students: JSON.parse(liveStates || '[]') });
  } catch (err) {
    return res.status(500).json({ error: 'Quick-check data unavailable' });
  }
});
`;
