'use client';

/**
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
import type {
  MathCanvasStatsResponse,
  MathCanvasGeometryResponse,
  ConstructionState,
  ResolvedSvgState,
} from '@/types/mathcanvas-extensions';
import {
  getMathJS,
  parseExpression,
  evaluateExpression,
  computeTangentPlane,
  computeGradient,
  gradeAnswer,
} from '@/lib/mathcanvas-cas';

// =============================================================================
// SVG RE-RENDER PROMPT
// =============================================================================

/**
 * buildSvgReRenderPrompt — terse re-render prompt for 2D param slider changes.
 */
function buildSvgReRenderPrompt(
  originalIntent: string,
  originalSvg: string,
  paramValues: Record<string, number>,
  mode: CanvasMode
): string {
  const paramStr = Object.entries(paramValues)
    .map(([k, v]) => `${k}=${v}`)
    .join(', ');

  const modeHint = mode === 'stats'
    ? 'probability distribution curve'
    : mode === 'geometry'
      ? 'geometric construction'
      : '2D mathematical plot';

  return `You are MathCanvas. Redraw this ${modeHint} with updated parameter values.

ORIGINAL VISUALISATION: "${originalIntent}"
UPDATED PARAMETER VALUES: ${paramStr}

REFERENCE SVG (keep this exact layout, axis positions, scale, and style):
${originalSvg.slice(0, 800)}...

CRITICAL RULES:
1. Return ONLY a valid JSON object: { "svg": "..." }
2. Keep viewBox="0 0 680 500" exactly
3. Keep all axis positions, scale (60px per unit), grid lines, and label positions identical
4. Only update the curve/bars/construction to reflect the new parameter values
5. Recompute all mathematical values (probabilities, coordinates, angles) using the new params
6. Inline styles only — no <style> blocks
7. No other fields — only { "svg": "..." }`;
}

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

// ── Statistics mode system prompt ─────────────────────────────────────────────
function buildStatsSystemPrompt(sc: ScholarlyContext): string {
  return `You are MathCanvas Statistics, the probability and statistics engine for Scholarly.

LEARNER PROFILE:
• ${sc.student.name}, Year ${sc.student.yearLevel}
• Statistics Mastery: ${Math.round(sc.mastery.statistics * 100)}%

CRITICAL: Return ONLY a valid JSON object. No markdown, no backticks, no text outside JSON.

DISTRIBUTION FAMILIES AVAILABLE:
normal, binomial, poisson, uniform, t, chi_squared, exponential, geometric

SVG REQUIREMENTS:
• viewBox="0 0 680 500" always — this exact size
• Inline styles only, no <style> blocks
• Colors: axes=#c5d8e4, grid=rgba(30,157,241,0.05), curve=#1e9df1, fill=rgba(30,157,241,0.18), shading=#f59e0b, shadingFill=rgba(245,158,11,0.3)
• Draw accurate distribution curve as SVG <path> with 200+ computed coordinate pairs
• X-axis at y=420, centre at x=340. Y-axis for probability density/mass.
• Shade P(a ≤ X ≤ b) regions in amber. Label mean with a vertical dashed blue line.
• For discrete (binomial, poisson, geometric): draw vertical bars, not a smooth curve.
• Include distribution name, parameter values, axis labels, and title inside the SVG.

PARAMETER SLIDER SCHEMA — use these exact name keys:
• normal:      mu (mean, -10 to 10, step 0.5), sigma (0.1 to 4, step 0.1)
• binomial:    n (1 to 50, step 1), p (0.01 to 0.99, step 0.01)
• poisson:     lambda (0.1 to 15, step 0.1)
• uniform:     a (-10 to 0, step 0.5), b (0 to 10, step 0.5)
• t:           nu (1 to 30, step 1)
• chi_squared: k (1 to 20, step 1)
• exponential: lambda (0.1 to 5, step 0.1)
• geometric:   p (0.01 to 0.99, step 0.01)

CURRICULUM ALIGNMENT (ACARA):
• Year 9-10: normal shape, standard deviation, AC9M10SP01
• Year 11-12: t-distribution, chi-squared, hypothesis testing, AC9M12SP01-03

RESPONSE (strict JSON, all fields required):
{
  "svg": "<svg viewBox=\\"0 0 680 500\\" xmlns=\\"http://www.w3.org/2000/svg\\">…</svg>",
  "title": "e.g. Normal Distribution N(0,1)",
  "description": "1-2 sentence description for Year ${sc.student.yearLevel}",
  "topic": "e.g. Normal Distribution",
  "curriculumCode": "e.g. AC9M10SP01",
  "distribution": "normal",
  "parameters": [
    { "name": "mu", "label": "Mean μ", "min": -5, "max": 5, "step": 0.5, "default": 0, "group": "Distribution" },
    { "name": "sigma", "label": "Std Dev σ", "min": 0.1, "max": 3, "step": 0.1, "default": 1, "group": "Distribution" }
  ],
  "shading": [
    { "from": -1, "to": 1, "probability": 0.6827, "label": "μ ± 1σ" }
  ],
  "keyStats": [
    { "label": "Mean", "value": "0" },
    { "label": "Variance", "value": "1.00" },
    { "label": "Std Dev", "value": "1.00" },
    { "label": "Skewness", "value": "0" }
  ],
  "teacherNote": "Pedagogical note for the teacher",
  "curriculumDetail": "AC9M10SP01 — Normal distributions, Year 10"
}`;
}

// ── Geometry mode system prompt — construction protocol ──────────────────────
function buildGeometrySystemPrompt(sc: ScholarlyContext): string {
  return `You are MathCanvas Geometry, the geometric construction engine for Scholarly.

LEARNER PROFILE:
• ${sc.student.name}, Year ${sc.student.yearLevel}
• Geometry Mastery: ${Math.round(sc.mastery.geometry * 100)}%

CRITICAL: Return ONLY a valid JSON object. No markdown, no backticks, no text outside JSON.

MISSION: Generate a step-by-step geometric construction with a full Construction Protocol.
Each step is one atomic geometric action. Each step's "svg" field is the FULL CUMULATIVE
SVG at that point — not a delta. The student replays these steps like a mathematical flip-book.

SVG REQUIREMENTS:
• viewBox="0 0 680 500" always — this exact size. No axes unless the problem needs them.
• Inline styles only, no <style> blocks.
• Colors: construction-helpers=rgba(30,157,241,0.35) (thin dashed), primary-figure=#1e9df1 (2px),
  secondary=#10b981, angle-arcs=#f59e0b, points-fill=#0f1419, labels=#0f1419.
• Points: filled circle r=4. Capital letter labels offset 8px from point.
• Helper arcs/lines: 1px dashed. Final figure lines: 2px solid.
• Angle marks: small arc. Right-angle marks: small square (7×7px).

STEP ICONS — choose the closest match:
"dot" | "line" | "circle" | "arc" | "bisect" | "perpendicular" | "label" | "shade"

STEP COUNT: min 4, max 12. Each step genuinely atomic.
Good: "Draw arc centred at A passing through B and C"
Bad:  "Construct the entire angle bisector"

CURRICULUM ALIGNMENT:
• Year 7-8: basic constructions (perp bisector, equilateral triangle, angle bisector)
• Year 9: Pythagoras diagram, circle chord bisection
• Year 10: circle geometry, similarity proofs (AC9M10MG01-04)
• Year 11-12: formal proofs, loci, vector diagrams

RESPONSE (strict JSON, all fields required):
{
  "svg": "<svg viewBox=\\"0 0 680 500\\" ...>FINAL COMPLETE FIGURE</svg>",
  "title": "e.g. Perpendicular Bisector Construction",
  "description": "1-2 sentences about the construction",
  "topic": "e.g. Geometric Constructions",
  "curriculumCode": "e.g. AC9M8MG03",
  "theorem": "Optional theorem/postulate demonstrated",
  "steps": [
    {
      "stepNumber": 1,
      "action": "Mark points A and B — the endpoints of the segment to bisect",
      "svg": "<svg viewBox=\\"0 0 680 500\\" ...>SVG WITH ONLY A AND B MARKED</svg>",
      "reason": "These are the endpoints of segment AB",
      "icon": "dot"
    }
  ],
  "parameters": [],
  "teacherNote": "Ask students: what guarantees the bisector is perpendicular and not just passing through the midpoint?"
}`;
}

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

  // ── Stats + Geometry extended state ─────────────────────────────────────
  const [resultStats, setResultStats]       = useState<MathCanvasStatsResponse | null>(null);
  const [resultGeometry, setResultGeometry] = useState<MathCanvasGeometryResponse | null>(null);
  const [constructionState, setConstructionState] = useState<ConstructionState>({
    response: null, currentStep: 0, isPlaying: false,
  });
  const [resolvedSvgState, setResolvedSvgState] = useState<ResolvedSvgState | null>(null);

  // Debounce timer for 2D parameter slider re-renders
  const reRenderTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Initialise param values when any result changes — includes 2D so sliders
  // for graphing, stats, and geometry all get defaults on first render.
  useEffect(() => {
    const params =
      result3D?.parameters ??
      resultDual?.compound?.parameters ??
      result2D?.parameters ??       // 2D modes: graphing, stats, geometry
      null;
    if (params && params.length > 0) {
      const defaults: Record<string, number> = {};
      params.forEach((p: SurfaceParameter) => { defaults[p.name] = p.default; });
      setParamValues(defaults);
    }
  }, [result3D, resultDual, result2D]);

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

      } else if (mode === 'stats') {
        // Statistics mode — dedicated distribution prompt with full metadata
        const data = await callClaudeAPI<MathCanvasStatsResponse>(
          buildStatsSystemPrompt(sc),
          intentText
        );
        setResultStats(data);
        // Feed into result2D so the SVG renderer + existing ParamPanel work unchanged
        setResult2D({
          svg: data.svg,
          title: data.title,
          description: data.description,
          topic: data.topic,
          curriculumCode: data.curriculumCode,
          parameters: data.parameters,
          teacherNote: data.teacherNote,
        });
        setResolvedSvgState(null);
        sc.onVisualizationCreated?.({
          intent: intentText, topic: data.topic, code: data.curriculumCode,
          studentId: sc.student.id, mode,
        });

      } else if (mode === 'geometry') {
        // Geometry mode — construction protocol with step-replay
        const data = await callClaudeAPI<MathCanvasGeometryResponse>(
          buildGeometrySystemPrompt(sc),
          intentText
        );
        setResultGeometry(data);
        // Initialise construction state at step 0
        setConstructionState({ response: data, currentStep: 0, isPlaying: false });
        // Feed final figure into result2D so SVG renderer shows completed figure by default
        setResult2D({
          svg: data.svg,
          title: data.title,
          description: data.description,
          topic: data.topic,
          curriculumCode: data.curriculumCode,
          parameters: data.parameters,
          teacherNote: data.teacherNote,
        });
        setResolvedSvgState(null);
        sc.onVisualizationCreated?.({
          intent: intentText, topic: data.topic, code: data.curriculumCode,
          studentId: sc.student.id, mode,
        });

      } else {
        // graphing (and expression fallback) — generic 2D prompt
        const data = await callClaudeAPI<MathCanvas2DResponse>(
          build2DSystemPrompt(sc),
          intentText
        );
        setResult2D(data);
        setResolvedSvgState(null);
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
    setParamValues(prev => {
      const next = { ...prev, [name]: value };

      // 3D and Dual modes: re-render is free (browser-side vertex evaluation)
      // No API call needed — resolvedSurface / resolvedDual derive from paramValues.
      if (mode === '3d' || mode === ('dual' as CanvasMode) || mode === ('cas' as CanvasMode)) {
        return next;
      }

      // 2D modes (graphing, stats, geometry): SVG is AI-generated.
      // Debounce at 650ms — fire once the student has settled on a value,
      // not on every pixel of slider movement. This keeps API costs low
      // while making the slider feel responsive.
      if (result2D?.svg && intent) {
        if (reRenderTimerRef.current) clearTimeout(reRenderTimerRef.current);
        reRenderTimerRef.current = setTimeout(async () => {
          setResolvedSvgState(prev2 => prev2
            ? { ...prev2, isRerendering: true }
            : { svg: result2D.svg, paramSnapshot: next, isRerendering: true }
          );
          try {
            const prompt = buildSvgReRenderPrompt(intent, result2D.svg, next, mode);
            const data = await callClaudeAPI<{ svg: string }>(
              'You are MathCanvas. Return only { "svg": "..." } with no other fields.',
              prompt
            );
            if (data?.svg) {
              setResolvedSvgState({ svg: data.svg, paramSnapshot: next, isRerendering: false });
            }
          } catch {
            // Silent fail — keep showing the last good SVG
            setResolvedSvgState(prev2 => prev2 ? { ...prev2, isRerendering: false } : null);
          }
        }, 650);
      }

      return next;
    });
  }, [mode, result2D, intent]);

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

  /**
   * resolvedSvg — the SVG string shown in the 2D canvas area.
   *
   * For geometry mode: when a construction step is selected, the canvas shows
   * that step's cumulative SVG (the flip-book page) rather than the final figure.
   * For all other 2D modes: shows resolvedSvgState.svg if a param re-render has
   * fired (slider was moved), otherwise falls back to result2D.svg.
   *
   * Priority order: constructionStep.svg > resolvedSvgState.svg > result2D.svg
   *
   * This mirrors exactly how resolvedSurface works for 3D — it is the
   * "param-overridden" version that the renderer actually receives.
   */
  const resolvedSvg: string | null = (() => {
    if (mode === 'geometry' && constructionState.response) {
      const step = constructionState.response.steps[constructionState.currentStep];
      return step?.svg ?? resolvedSvgState?.svg ?? result2D?.svg ?? null;
    }
    // For graphing, stats: prefer the param-re-rendered SVG if one exists
    return resolvedSvgState?.svg ?? result2D?.svg ?? null;
  })();

  // ── Construction protocol actions ─────────────────────────────────────────

  const goToConstructionStep = useCallback((index: number) => {
    setConstructionState(prev => {
      if (!prev.response) return prev;
      const clamped = Math.max(0, Math.min(prev.response.steps.length - 1, index));
      return { ...prev, currentStep: clamped };
    });
  }, []);

  const toggleConstructionPlay = useCallback(() => {
    setConstructionState(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
  }, []);

  const resetConstruction = useCallback(() => {
    setConstructionState(prev => ({ ...prev, currentStep: 0, isPlaying: false }));
  }, []);

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

    // Stats mode state
    resultStats,

    // Geometry / construction state
    resultGeometry,
    constructionState,

    // Resolved SVG for 2D canvas (param re-render aware, construction step-aware)
    resolvedSvg,
    // True while a debounced 2D param re-render is in flight
    isRerendering: resolvedSvgState?.isRerendering ?? false,

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

    // Actions — Construction protocol (geometry mode)
    goToConstructionStep,
    toggleConstructionPlay,
    resetConstruction,
  };
}
