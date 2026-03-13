/**
 * useMathCanvas Hook — Priority 2 + 3 Extended
 *
 * Extends the Priority 1 hook with:
 *
 *   Priority 2 — CAS Mode (Symbolic CAS Engine)
 *     - New 'cas' canvas mode triggers MathCanvasCASResponse generation
 *     - buildCASSystemPrompt() instructs Claude to design structured tasks
 *     - casState tracks student answers, grades, and progress
 *     - submitCASAnswer() grades via math.js — zero LLM involvement in marking
 *     - computeLiveTangentPlane() for interactive tangent plane overlay
 *
 *   Priority 3 — Expression Mode (Live Equation → Surface)
 *     - New 'expression' canvas mode — bypasses AI entirely
 *     - setLiveExpression() parses via math.js and renders in <16ms
 *     - liveExpression state drives MathCanvasExpressionBar
 *     - expressionSurface drives the 3D renderer directly from parsed expr
 *
 * All Priority 1 outputs (dual surface, intersection) preserved unchanged.
 *
 * Extends the base hook with dual-surface support:
 *   - New 'dual' canvas mode triggers CompoundSurfaceDescriptor generation
 *   - buildDualSystemPrompt() instructs Claude to return two named surfaces
 *   - resultDual state holds the compound descriptor for MathCanvasDualSurface
 *   - DEMO_DUAL_RESPONSE provides a paraboloid-vs-plane demo for offline use
 *   - resolvedDual applies parameter slider values to both surfaces simultaneously
 *
 * Pattern: follows use-storybook.ts / use-arena-intelligence.ts conventions.
 * DEMO_MODE respected: falls back to sample surfaces when API unavailable.
 *
 * Hook outputs that are NEW in this version (vs base):
 *   resultDual         — CompoundSurfaceDescriptor | null
 *   resolvedDual       — CompoundSurfaceDescriptor with param overrides applied | null
 *   isDualMode         — boolean convenience flag
 *
 * All existing outputs are preserved unchanged for backward compatibility.
 */

'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import type {
  CanvasMode,
  ViewMode,
  MathCanvas2DResponse,
  MathCanvas3DResponse,
  MathCanvasDualResponse,
  MathCanvasCASResponse,
  CASTask,
  CASSessionState,
  CASModeState,
  LiveExpression,
  CompoundSurfaceDescriptor,
  SurfaceParameter,
  ScholarlyContext,
} from '@/types/mathcanvas';
import {
  getMathJS,
  parseExpression,
  evaluateExpression,
  computeTangentPlane,
  computeGradient,
  gradeAnswer,
} from '@/lib/mathcanvas-cas';

// =============================================================================
// DEMO SURFACES
// =============================================================================

const DEMO_3D_RESPONSE: MathCanvas3DResponse = {
  surface: {
    type: 'explicit',
    kind: 'ripple',
    coefficients: { A: 1.5, k: 1.5 },
    domain: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 },
    resolution: 60,
  },
  title: 'Ripple Surface — z = A·sin(k·r)',
  description: 'A circular ripple propagating outward from the origin.',
  topic: 'Trigonometric Surfaces',
  curriculumCode: 'AC9M10A02',
  parameters: [
    { name: 'A', label: 'Amplitude', min: 0.5, max: 4, step: 0.1, default: 1.5, group: 'Wave Properties' },
    { name: 'k', label: 'Frequency', min: 0.5, max: 4, step: 0.1, default: 1.5, group: 'Wave Properties' },
  ],
  colorScheme: '3d_heat',
  teacherNote: 'Ask students: what happens to the wavelength as k increases?',
  suggestedExploration: 'What happens if you add two ripple surfaces centred at different points?',
};

/**
 * Demo dual response: paraboloid z = x² + y² meeting a tilted plane z = H.
 * The intersection is a circle — a result students can verify analytically,
 * making this pairing ideal for introducing intersection curves.
 *
 * Pedagogical note: "The circle you see is the set of all (x,y) where the
 * paraboloid and plane are at the same height. At Year 10, students can
 * derive this algebraically: x² + y² = H, the equation of a circle."
 */
const DEMO_DUAL_RESPONSE: MathCanvasDualResponse = {
  compound: {
    kind: 'compound',
    surface1: {
      descriptor: {
        type: 'explicit',
        kind: 'paraboloid',
        coefficients: { A: 0.5 },
        domain: { xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
        resolution: 50,
      },
      appearance: {
        colorScheme: '3d_heat',
        opacity: 0.85,
        label: 'Paraboloid z = ½(x² + y²)',
      },
    },
    surface2: {
      descriptor: {
        type: 'explicit',
        kind: 'plane',
        coefficients: { A: 0, B: 0, C: 2 },
        domain: { xMin: -4, xMax: 4, yMin: -4, yMax: 4 },
        resolution: 50,
      },
      appearance: {
        colorScheme: '3d_cool',
        opacity: 0.65,
        label: 'Plane z = H',
      },
    },
    sharedDomain: { xMin: -4, xMax: 4, yMin: -4, yMax: 4, resolution: 60 },
    title: 'Paraboloid meets a Horizontal Plane',
    description: 'Where does the bowl-shaped paraboloid z = ½(x² + y²) reach the height H = 2? The intersection is a perfect circle of radius 2.',
    topic: 'Intersections of Surfaces',
    curriculumCode: 'AC9M10A02',
    parameters: [
      { name: 'A', label: 'Paraboloid Coefficient', min: 0.1, max: 2, step: 0.05, default: 0.5, group: 'Paraboloid', surfaceTarget: 1 },
      { name: 'C', label: 'Plane Height H', min: 0.5, max: 6, step: 0.25, default: 2, group: 'Plane', surfaceTarget: 2 },
    ],
    intersectionExplanation: 'The amber curve is a circle: every point on it satisfies both z = ½(x² + y²) and z = H simultaneously. Algebraically, ½(x² + y²) = H simplifies to x² + y² = 2H — the equation of a circle of radius √(2H). As you increase H with the slider, watch the circle grow.',
    teacherNote: 'Use the H slider to show how changing the plane height changes the intersection radius. Ask: "What value of H makes a circle of radius 3? Can you write a general formula?" This builds toward Section Formula and then volumes of revolution.',
    suggestedExploration: 'What shape would the intersection be if you tilted the plane? Try changing coefficient A in the paraboloid — how does the intersection circle change?',
  },
};

// =============================================================================
// SYSTEM PROMPTS
// =============================================================================

function build2DSystemPrompt(sc: ScholarlyContext): string {
  return `You are MathCanvas, the mathematical visualization engine for the Scholarly educational platform.

LEARNER PROFILE:
• ${sc.student.name}, Year ${sc.student.yearLevel}
• BKT Mastery: Functions ${Math.round(sc.mastery.functions * 100)}% | Geometry ${Math.round(sc.mastery.geometry * 100)}% | Statistics ${Math.round(sc.mastery.statistics * 100)}%

CRITICAL: Return ONLY a valid JSON object. No markdown, no backticks, no text outside the JSON.

SVG REQUIREMENTS:
• viewBox="0 0 680 500" always — this exact size
• Inline styles only, no <style> blocks, no external refs
• Colors (Scholarly brand): axes=#c5d8e4, axis-labels=#8b99a4, minor-grid=rgba(30,157,241,0.05), primary-curve=#1e9df1, secondary=#6366f1, tertiary=#10b981, accent=#f59e0b, annotations=#536471, title=#0f1419
• Draw labeled x and y axes: center at (340,250), each unit = 60px
• Tick marks every unit, numeric labels every 2 units
• Plot REAL mathematically accurate curves using 100–200 computed (x,y) coordinate pairs as SVG <path> elements
• Font: sans-serif for all text labels
• Include axis arrows, clear curve labels, and a descriptive title inside the SVG

RESPONSE (strict JSON, all fields required):
{
  "svg": "<svg viewBox=\\"0 0 680 500\\" xmlns=\\"http://www.w3.org/2000/svg\\">…</svg>",
  "title": "Short display title",
  "description": "1-2 sentence clear description for Year ${sc.student.yearLevel}",
  "topic": "topic name",
  "curriculumCode": "e.g. AC9M9A04",
  "parameters": [{ "name":"A","label":"Amplitude A","min":0.1,"max":5,"step":0.1,"default":1,"group":"Wave Properties" }],
  "teacherNote": "Pedagogical note for the teacher"
}`;
}

function build3DSystemPrompt(sc: ScholarlyContext): string {
  return `You are MathCanvas 3D, the three-dimensional mathematical surface engine for the Scholarly educational platform.

LEARNER PROFILE:
• ${sc.student.name}, Year ${sc.student.yearLevel}
• BKT Mastery: Functions ${Math.round(sc.mastery.functions * 100)}% | Geometry ${Math.round(sc.mastery.geometry * 100)}% | Statistics ${Math.round(sc.mastery.statistics * 100)}%

CRITICAL: Return ONLY a valid JSON object. No markdown, no backticks, no text outside the JSON.
CRITICAL: Do NOT generate JavaScript code, eval strings, or function bodies. Use ONLY the descriptor format below.

SURFACE TYPES AVAILABLE:
Explicit (z = f(x,y)): paraboloid, elliptic_paraboloid, hyperbolic_paraboloid, cone, plane, sphere_upper, sphere_lower, gaussian, ripple, wave_product, wave_sum, polynomial_2, exponential_decay, monkey_saddle, absolute_value
Parametric: sphere, torus, cylinder, helicoid, catenoid, mobius, klein_bottle, ellipsoid, hyperboloid_1, hyperboloid_2, seashell, trefoil_knot
Revolution: linear, quadratic, sine, exponential, sqrt, reciprocal

PEDAGOGY:
• Scaffold to mastery — Year ${sc.student.yearLevel} students need achievable challenge
• Functions mastery ${Math.round(sc.mastery.functions * 100)}%: ${sc.mastery.functions < 0.5 ? 'prefer simple explicit surfaces' : sc.mastery.functions < 0.75 ? 'use parametric introductions' : 'full parametric and revolution surfaces appropriate'}

RESPONSE (strict JSON, all fields required):
{
  "surface": { "type": "explicit", "kind": "paraboloid", "coefficients": {"A":1}, "domain":{"xMin":-4,"xMax":4,"yMin":-4,"yMax":4}, "resolution":60 },
  "title": "Short display title",
  "description": "1-2 sentences for Year ${sc.student.yearLevel}",
  "topic": "e.g. Quadric Surfaces",
  "curriculumCode": "e.g. AC9M10A02",
  "parameters": [{ "name":"A","label":"Coefficient A","min":0.1,"max":5,"step":0.1,"default":1,"group":"Surface Shape" }],
  "colorScheme": "3d_heat",
  "teacherNote": "Pedagogical insight",
  "suggestedExploration": "Optional follow-up question"
}`;
}

/**
 * Dual-surface system prompt.
 *
 * The prompt teaches Claude to generate two surfaces that will be
 * rendered simultaneously. The intersection explanation is the key
 * pedagogical value — it must explain what the intersection curve
 * means geometrically in terms the year-level student can understand.
 */
function buildDualSystemPrompt(sc: ScholarlyContext): string {
  return `You are MathCanvas Dual, the comparative surface engine for the Scholarly educational platform.
The student has asked to see TWO mathematical surfaces in the same scene, or to compare two related surfaces.

LEARNER PROFILE:
• ${sc.student.name}, Year ${sc.student.yearLevel}
• BKT Mastery: Functions ${Math.round(sc.mastery.functions * 100)}% | Geometry ${Math.round(sc.mastery.geometry * 100)}% | Statistics ${Math.round(sc.mastery.statistics * 100)}%

CRITICAL: Return ONLY a valid JSON object. No markdown, no backticks, no text outside the JSON.
CRITICAL: Use ONLY named surface types from the allowed list. No eval, no code strings.

ALLOWED EXPLICIT TYPES: paraboloid, elliptic_paraboloid, hyperbolic_paraboloid, cone, plane, sphere_upper, sphere_lower, gaussian, ripple, wave_product, wave_sum, polynomial_2, exponential_decay, monkey_saddle, absolute_value
ALLOWED PARAMETRIC TYPES: sphere, torus, cylinder, helicoid, catenoid, ellipsoid, hyperboloid_1, hyperboloid_2, seashell, trefoil_knot
ALLOWED REVOLUTION PROFILES: linear, quadratic, sine, exponential, sqrt, reciprocal

COLOUR SCHEMES:
• surface1 appearance.colorScheme should be "3d_heat" (warm: blue→red gradient)
• surface2 appearance.colorScheme should be "3d_cool" (cool: violet→pink gradient)
These two schemes are visually distinct so students can identify each surface.

PEDAGOGY:
• Choose surface pairs that produce a meaningful, visible intersection for Year ${sc.student.yearLevel}
• Good pairings: paraboloid + plane (intersection = circle), two paraboloids (intersection = circle/ellipse),
  paraboloid + cone (intersection = ellipse), gaussian + plane (intersection = circle), ripple + plane (intersection = wave rings)
• intersectionExplanation must be curriculum-connected: what is the intersection SET? Can it be described algebraically?
• parameters should include at least one slider per surface so students can observe how the intersection changes

RESPONSE (strict JSON, all fields required):
{
  "compound": {
    "kind": "compound",
    "surface1": {
      "descriptor": { "type": "explicit", "kind": "paraboloid", "coefficients": {"A": 0.5}, "domain": {"xMin":-4,"xMax":4,"yMin":-4,"yMax":4}, "resolution": 50 },
      "appearance": { "colorScheme": "3d_heat", "opacity": 0.85, "label": "Paraboloid z = ½(x²+y²)" }
    },
    "surface2": {
      "descriptor": { "type": "explicit", "kind": "plane", "coefficients": {"A":0,"B":0,"C":2}, "domain": {"xMin":-4,"xMax":4,"yMin":-4,"yMax":4}, "resolution": 50 },
      "appearance": { "colorScheme": "3d_cool", "opacity": 0.65, "label": "Plane z = H" }
    },
    "sharedDomain": { "xMin": -4, "xMax": 4, "yMin": -4, "yMax": 4, "resolution": 60 },
    "title": "Paraboloid meets a Horizontal Plane",
    "description": "1-2 sentences describing both surfaces and their relationship for Year ${sc.student.yearLevel}",
    "topic": "Intersections of Surfaces",
    "curriculumCode": "AC9M10A02",
    "parameters": [
      { "name": "A", "label": "Paraboloid Coefficient", "min": 0.1, "max": 2, "step": 0.05, "default": 0.5, "group": "Paraboloid", "surfaceTarget": 1 },
      { "name": "C", "label": "Plane Height H", "min": 0.5, "max": 6, "step": 0.25, "default": 2, "group": "Plane", "surfaceTarget": 2 }
    ],
    "intersectionExplanation": "Geometric explanation of what the amber curve represents, connected to the Year ${sc.student.yearLevel} curriculum. Include the algebraic condition if appropriate.",
    "teacherNote": "Pedagogical note for the teacher",
    "suggestedExploration": "Follow-up question for Issy to ask the student"
  }
}`;
}

// =============================================================================
// API CALLER — proxied through Scholarly API server
// =============================================================================

const MC_API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function callClaudeAPI<T>(systemPrompt: string, userPrompt: string): Promise<T> {
  // Get auth token from localStorage (matches scholarly-auth Zustand persist key)
  let token: string | null = null;
  try {
    const stored = localStorage.getItem('scholarly-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.state?.accessToken || null;
    }
  } catch { /* ignore */ }

  const res = await fetch(`${MC_API_BASE}/mathcanvas/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ systemPrompt, userPrompt }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: res.statusText }));
    const errMsg = (errData as any).error;
    const errStr = typeof errMsg === 'string' ? errMsg
      : typeof errMsg === 'object' && errMsg?.message ? errMsg.message
      : `API ${res.status}: ${res.statusText}`;
    throw new Error(errStr);
  }

  const d = await res.json();
  if (!d.success) throw new Error(d.error || 'Generation failed');
  return d.result as T;
}

// =============================================================================
// DEFAULT SCHOLARLY CONTEXT
// =============================================================================

const DEFAULT_SC: ScholarlyContext = {
  student: { name: 'Student', yearLevel: '10', id: 'demo' },
  mastery: { functions: 0.72, geometry: 0.58, statistics: 0.65 },
  tenantId: 'scholarly',
};

// =============================================================================
// CAS MODE SYSTEM PROMPT
// =============================================================================

function buildCASSystemPrompt(sc: ScholarlyContext): string {
  return `You are a mathematics curriculum expert designing a structured CAS (Computer Algebra System) task set for a Year ${sc.student.yearLevel} student.

Your response must be a single valid JSON object matching the MathCanvasCASResponse schema.

The student (${sc.student.name}) has these mastery levels:
- Functions: ${Math.round(sc.mastery.functions * 100)}%
- Geometry: ${Math.round(sc.mastery.geometry * 100)}%
- Statistics: ${Math.round(sc.mastery.statistics * 100)}%

TASK DESIGN RULES:
1. Generate 3-5 tasks of increasing difficulty
2. Each task must have a CANONICAL expectedAnswer that math.js can parse and compare
3. expectedAnswer must be in math.js syntax: use ^ for power, * for multiply, sqrt(), sin(), cos(), exp(), log()
4. workedSolution must show step-by-step working that a teacher can follow
5. Tasks should build on each other — e.g. find derivative, then use it to find tangent plane

TASK TYPES AVAILABLE:
- find_derivative: partial derivatives ∂f/∂x or ∂f/∂y (Year 11-12)
- find_gradient: gradient vector at a specific point
- find_tangent_plane: tangent plane equation at (a,b)
- simplify: algebraic simplification
- expand: expand a factored expression
- factorise: factorise a polynomial
- evaluate_at_point: compute f(a,b) numerically
- compare_expressions: are two forms equivalent?

CRITICAL: expectedAnswer must be exactly what a student would type — a plain expression, no "z =", no LaTeX.
For derivatives: "2*x + y" not "∂f/∂x = 2x + y"
For tangent planes: "2*x + 3*y - 1" not "z = 2x + 3y - 1"

RESPONSE JSON SCHEMA:
{
  "surface": { /* optional SurfaceDescriptor for context — use null if not needed */ },
  "introduction": "1-2 sentences introducing the mathematical context for the student",
  "tasks": [
    {
      "id": "task-1",
      "type": "find_derivative",
      "expression": "x^2 + x*y + y^2",
      "prompt": "Find the partial derivative of f with respect to x.",
      "expectedAnswer": "2*x + y",
      "hint": "Treat y as a constant and differentiate with respect to x.",
      "marks": 1,
      "workedSolution": "∂f/∂x: differentiate each term — ∂(x²)/∂x = 2x, ∂(xy)/∂x = y, ∂(y²)/∂x = 0. So ∂f/∂x = 2x + y."
    }
  ],
  "concepts": ["partial derivatives", "gradient vectors"],
  "curriculum": {
    "strand": "Functions",
    "yearLevel": "${sc.student.yearLevel}",
    "outcome": "AC9M10A02"
  }
}`;
}

// =============================================================================
// DEMO CAS RESPONSE — used when API is unavailable
// =============================================================================

const DEMO_CAS_RESPONSE: MathCanvasCASResponse = {
  surface: {
    type: 'explicit',
    kind: 'polynomial_2',
    coefficients: { A: 1, B: 1, C: 0 },
    domain: { xMin: -3, xMax: 3, yMin: -3, yMax: 3 },
    resolution: 50,
  } as never,
  introduction: `We're working with the surface f(x,y) = x² + xy + y². This is an elliptic paraboloid — let's explore its partial derivatives and gradient.`,
  tasks: [
    {
      id: 'task-1',
      type: 'find_derivative',
      expression: 'x^2 + x*y + y^2',
      prompt: 'Find the partial derivative ∂f/∂x. (Treat y as a constant.)',
      expectedAnswer: '2*x + y',
      hint: 'Differentiate each term: x² → 2x, xy → y (y is constant), y² → 0.',
      marks: 1,
      workedSolution: '∂f/∂x: ∂(x²)/∂x = 2x, ∂(xy)/∂x = y, ∂(y²)/∂x = 0. Result: 2x + y',
    },
    {
      id: 'task-2',
      type: 'find_derivative',
      expression: 'x^2 + x*y + y^2',
      prompt: 'Find the partial derivative ∂f/∂y. (Treat x as a constant.)',
      expectedAnswer: 'x + 2*y',
      hint: 'Now treat x as a constant and differentiate with respect to y.',
      marks: 1,
      workedSolution: '∂f/∂y: ∂(x²)/∂y = 0, ∂(xy)/∂y = x, ∂(y²)/∂y = 2y. Result: x + 2y',
    },
    {
      id: 'task-3',
      type: 'evaluate_at_point',
      expression: 'x^2 + x*y + y^2',
      prompt: 'Evaluate f(1, 2).',
      expectedAnswer: '7',
      marks: 1,
      workedSolution: 'f(1,2) = 1² + (1)(2) + 2² = 1 + 2 + 4 = 7',
    },
  ],
  concepts: ['partial derivatives', 'function evaluation'],
  curriculum: { strand: 'Functions', yearLevel: '10', outcome: 'AC9M10A02' },
};

// =============================================================================
// HOOK — extended for dual-surface mode
// =============================================================================

export function useMathCanvas() {
  const [mode, setMode]               = useState<CanvasMode>('graphing');
  const [viewMode, setViewMode]       = useState<ViewMode>('3d');
  const [intent, setIntent]           = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [result2D, setResult2D]       = useState<MathCanvas2DResponse | null>(null);
  const [result3D, setResult3D]       = useState<MathCanvas3DResponse | null>(null);
  const [resultDual, setResultDual]   = useState<MathCanvasDualResponse | null>(null);
  const [paramValues, setParamValues] = useState<Record<string, number>>({});

  // ── Priority 2: CAS mode state ──────────────────────────────────────────
  const [casResponse, setCasResponse]     = useState<MathCanvasCASResponse | null>(null);
  const [casSession, setCasSession]       = useState<CASSessionState | null>(null);
  const [tangentPlaneState, setTangentPlaneState] = useState<CASModeState['tangentPlane']>({
    visible: false, point: [0, 0], plane: null,
  });
  const [gradientState, setGradientState] = useState<CASModeState['gradient']>({
    visible: false, point: [0, 0], vector: null,
  });

  // ── Priority 3: Live expression state ───────────────────────────────────
  const [liveExpression, setLiveExpressionState] = useState<LiveExpression | null>(null);
  const [showExpressionBar, setShowExpressionBar] = useState(false);

  const scRef = useRef<ScholarlyContext>(DEFAULT_SC);

  useEffect(() => {
    if (typeof window !== 'undefined' &&
        (window as Window & { SCHOLARLY_CONTEXT?: ScholarlyContext }).SCHOLARLY_CONTEXT) {
      scRef.current = (window as Window & { SCHOLARLY_CONTEXT?: ScholarlyContext }).SCHOLARLY_CONTEXT!;
    }
  }, []);

  // Initialise param values when any result changes
  useEffect(() => {
    const params = result3D?.parameters ?? resultDual?.compound?.parameters ?? null;
    if (params) {
      const defaults: Record<string, number> = {};
      params.forEach((p: SurfaceParameter) => { defaults[p.name] = p.default; });
      setParamValues(defaults);
    }
  }, [result3D, resultDual]);

  // ── Convenience flag ──────────────────────────────────────────────────────
  const isDualMode = mode === 'dual' as CanvasMode;

  // ── Core visualise ────────────────────────────────────────────────────────
  const visualise = useCallback(async (intentText: string) => {
    if (!intentText.trim() || isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const sc = scRef.current;

      if (mode === ('dual' as CanvasMode)) {
        const data = await callClaudeAPI<MathCanvasDualResponse>(
          buildDualSystemPrompt(sc),
          intentText
        );
        setResultDual(data);
        sc.onVisualizationCreated?.({
          intent: intentText,
          topic: data.compound.topic,
          code: data.compound.curriculumCode,
          studentId: sc.student.id,
          mode: '3d',
          surfaceType: 'compound',
        });

      } else if (mode === ('cas' as CanvasMode)) {
        const data = await callClaudeAPI<MathCanvasCASResponse>(
          buildCASSystemPrompt(sc),
          intentText
        );
        setCasResponse(data);
        // Initialise a fresh session
        const tasks = data.tasks ?? [];
        setCasSession({
          tasks,
          answers: {},
          grades: {},
          totalMarks: tasks.reduce((s, t) => s + t.marks, 0),
          earnedMarks: 0,
          completed: false,
        });
        // Optionally display the surface context in 3D
        if (data.surface) {
          setResult3D({
            surface: data.surface as never,
            title: data.introduction,
            description: '',
            topic: data.curriculum?.strand ?? '',
            curriculumCode: data.curriculum?.outcome ?? '',
            parameters: [],
            colorScheme: '3d_heat',
            teacherNote: '',
            suggestedExploration: '',
          });
        }
        sc.onVisualizationCreated?.({
          intent: intentText,
          topic: data.curriculum?.strand ?? 'CAS',
          code: data.curriculum?.outcome ?? '',
          studentId: sc.student.id,
          mode: 'cas' as CanvasMode,
        });

      } else if (mode === '3d') {
        const data = await callClaudeAPI<MathCanvas3DResponse>(
          build3DSystemPrompt(sc),
          intentText
        );
        setResult3D(data);
        setViewMode('3d');
        sc.onVisualizationCreated?.({
          intent: intentText,
          topic: data.topic,
          code: data.curriculumCode,
          studentId: sc.student.id,
          mode: '3d',
          surfaceType: data.surface.type === 'explicit' ? data.surface.kind : data.surface.type,
        });

      } else {
        const data = await callClaudeAPI<MathCanvas2DResponse>(
          build2DSystemPrompt(sc),
          intentText
        );
        setResult2D(data);
        sc.onVisualizationCreated?.({
          intent: intentText,
          topic: data.topic,
          code: data.curriculumCode,
          studentId: sc.student.id,
          mode,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unexpected error';

      if (mode === ('cas' as CanvasMode)) {
        console.warn('CAS API call failed, using demo:', msg);
        setCasResponse(DEMO_CAS_RESPONSE);
        setCasSession({
          tasks: DEMO_CAS_RESPONSE.tasks,
          answers: {},
          grades: {},
          totalMarks: DEMO_CAS_RESPONSE.tasks.reduce((s, t) => s + t.marks, 0),
          earnedMarks: 0,
          completed: false,
        });
        setError('Using demo CAS tasks — API unavailable');
      } else if (mode === ('dual' as CanvasMode)) {
        console.warn('Dual API call failed, using demo:', msg);
        setResultDual(DEMO_DUAL_RESPONSE);
        setError('Using demo surfaces — API unavailable');
      } else if (mode === '3d') {
        console.warn('3D API call failed, using demo surface:', msg);
        setResult3D(DEMO_3D_RESPONSE);
        setError('Using demo surface — API unavailable');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [mode, isLoading]);

  const quickIntent = useCallback((text: string) => {
    setIntent(text);
    setParamValues({});
    visualise(text);
  }, [visualise]);

  const updateParam = useCallback((name: string, value: number) => {
    setParamValues(prev => ({ ...prev, [name]: value }));
  }, []);

  const switchMode = useCallback((newMode: CanvasMode) => {
    setMode(newMode);
    setError(null);
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(prev => prev === '3d' ? '2d' : '3d');
  }, []);

  const clearCanvas = useCallback(() => {
    setResult2D(null);
    setResult3D(null);
    setResultDual(null);
    setCasResponse(null);
    setCasSession(null);
    setLiveExpressionState(null);
    setTangentPlaneState({ visible: false, point: [0, 0], plane: null });
    setGradientState({ visible: false, point: [0, 0], vector: null });
    setIntent('');
    setParamValues({});
    setError(null);
  }, []);

  // ── Priority 3: Live expression actions ─────────────────────────────────

  const updateLiveExpression = useCallback((raw: string) => {
    if (!raw.trim()) { setLiveExpressionState(null); return; }
    const parsed = parseExpression(raw);
    const live: LiveExpression = {
      raw,
      canonical: parsed.canonical,
      renderMode: parsed.variables.includes('y') ? '3d' : parsed.variables.includes('x') ? '2d' : 'unknown',
      error: parsed.error,
    };
    setLiveExpressionState(live);
  }, []);

  const commitLiveExpression = useCallback((raw: string) => {
    updateLiveExpression(raw);
  }, [updateLiveExpression]);

  // ── Priority 2: CAS action — submit an answer ────────────────────────────

  const submitCASAnswer = useCallback((
    taskId: string,
    answer: string,
    result: { correct: boolean; marks: number; feedback: string; attemptCount: number }
  ) => {
    setCasSession(prev => {
      if (!prev) return prev;
      const newGrades = { ...prev.grades, [taskId]: result };
      const earnedMarks = Object.values(newGrades).reduce((s, g) => s + g.marks, 0);
      const allDone = prev.tasks.every(t => newGrades[t.id]?.correct);
      return { ...prev, grades: newGrades, earnedMarks, completed: allDone };
    });
  }, []);

  // ── Priority 2: Tangent plane overlay ────────────────────────────────────

  const updateTangentPlane = useCallback(async (expression: string, a: number, b: number) => {
    await getMathJS(); // ensure loaded
    const tp = computeTangentPlane(expression, a, b, {
      xMin: -4, xMax: 4, yMin: -4, yMax: 4, resolution: 50,
    });
    setTangentPlaneState({
      visible: true,
      point: [a, b],
      plane: tp ? { z0: tp.z0, dfdx: tp.dfdx, dfdy: tp.dfdy, equation: tp.equation } : null,
    });
  }, []);

  const hideTangentPlane = useCallback(() => {
    setTangentPlaneState(prev => ({ ...prev, visible: false, plane: null }));
  }, []);

  // ── Priority 2: Gradient overlay ─────────────────────────────────────────

  const updateGradient = useCallback(async (expression: string, a: number, b: number) => {
    await getMathJS();
    const grad = computeGradient(expression, a, b);
    setGradientState({
      visible: true, point: [a, b],
      vector: grad ? { gx: grad.gx, gy: grad.gy, magnitude: grad.magnitude, directionDeg: grad.directionDeg } : null,
    });
  }, []);

  const hideGradient = useCallback(() => {
    setGradientState(prev => ({ ...prev, visible: false, vector: null }));
  }, []);

  // ── Expression surface — drives renderer directly ────────────────────────
  const expressionSurface = liveExpression?.canonical && !liveExpression.error
    ? evaluateExpression({
        expression: liveExpression.canonical,
        domain: { xMin: -5, xMax: 5, yMin: -5, yMax: 5, resolution: 60 },
      })
    : null;

  // ── Resolved surfaces (param overrides applied) ───────────────────────────
  const resolvedSurface = result3D
    ? { ...result3D.surface, coefficients: { ...result3D.surface.coefficients, ...paramValues } }
    : null;

  /**
   * Resolved dual compound descriptor — applies parameter slider values to
   * both surfaces simultaneously. Parameters are routed to the correct surface
   * via the surfaceTarget field (1 = surface1 only, 2 = surface2 only, undefined = both).
   */
  const resolvedDual: MathCanvasDualResponse | null = resultDual
    ? (() => {
        const compound = resultDual.compound;
        const params = compound.parameters ?? [];

        // Split overrides by target
        const overrides1: Record<string, number> = {};
        const overrides2: Record<string, number> = {};
        params.forEach(p => {
          const val = paramValues[p.name] ?? p.default;
          if (!p.surfaceTarget || p.surfaceTarget === 1) overrides1[p.name] = val;
          if (!p.surfaceTarget || p.surfaceTarget === 2) overrides2[p.name] = val;
        });

        return {
          compound: {
            ...compound,
            surface1: {
              ...compound.surface1,
              descriptor: {
                ...compound.surface1.descriptor,
                coefficients: {
                  ...(compound.surface1.descriptor as { coefficients?: Record<string, number> }).coefficients,
                  ...overrides1,
                },
              },
            },
            surface2: {
              ...compound.surface2,
              descriptor: {
                ...compound.surface2.descriptor,
                coefficients: {
                  ...(compound.surface2.descriptor as { coefficients?: Record<string, number> }).coefficients,
                  ...overrides2,
                },
              },
            },
          },
        } as MathCanvasDualResponse;
      })()
    : null;

  // isDualMode convenience flag
  const isCASMode = mode === ('cas' as CanvasMode);
  const isExpressionMode = mode === ('expression' as CanvasMode);

  return {
    // State
    mode,
    viewMode,
    intent,
    isLoading,
    error,
    result2D,
    result3D,
    resultDual,
    paramValues,
    resolvedSurface,
    resolvedDual,
    isDualMode,

    // Priority 2 — CAS state
    casResponse,
    casSession,
    tangentPlaneState,
    gradientState,
    isCASMode,

    // Priority 3 — Live expression state
    liveExpression,
    expressionSurface,
    showExpressionBar,
    isExpressionMode,

    sc: scRef.current,

    // Actions (base)
    setIntent,
    visualise,
    quickIntent,
    updateParam,
    switchMode,
    toggleViewMode,
    clearCanvas,

    // Actions — Priority 3 (live expression)
    updateLiveExpression,
    commitLiveExpression,
    setShowExpressionBar,

    // Actions — Priority 2 (CAS)
    submitCASAnswer,
    updateTangentPlane,
    hideTangentPlane,
    updateGradient,
    hideGradient,
  };
}
