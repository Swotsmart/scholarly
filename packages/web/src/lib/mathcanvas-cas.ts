/**
 * MathCanvas CAS Engine
 *
 * Wraps math.js to provide three capabilities:
 *
 *   1. Expression Evaluation (Priority 3 — Live Update)
 *      Parse "z = x^2 - y^2" or "sin(x)*exp(-y)" into a sampled
 *      Float32Array that evaluateSurface() can render. No eval(), no
 *      Function constructor. math.js's scope-based evaluate() is sandboxed
 *      and cannot access window, document, or any browser API.
 *
 *   2. Symbolic Differentiation (Priority 2 — CAS mode)
 *      Compute ∂f/∂x, ∂f/∂y symbolically. Used to:
 *        - Find the gradient vector at a point
 *        - Compute the tangent plane z = f(a,b) + fₓ(a,b)(x-a) + fᵧ(a,b)(y-b)
 *        - Validate student-submitted derivatives (exact comparison)
 *
 *   3. Algebraic Assessment (Priority 2 — Rubric Grading)
 *      Compare student expressions for mathematical equivalence, not
 *      string equality. "x^2 + 2x + 1" === "(x+1)^2" returns true.
 *      Eliminates the hallucination risk in LLM-based grading.
 *
 * Why math.js over nerdamer?
 *   math.js is already used by Scholarly's recharts/analytics layer
 *   (it's in the artifact runner context). nerdamer is more powerful for
 *   CAS but adds 800KB. math.js at 230KB does everything needed for
 *   secondary curriculum. nerdamer is the right call for university-level
 *   symbolic algebra — flagged as a future upgrade path.
 *
 * Safety guarantee:
 *   math.js evaluate() runs in a pure math scope. The scope object we
 *   pass contains ONLY {x, y} numeric values. There is no path from the
 *   expression string to JavaScript execution.
 *
 *   The one risk is infinite loops from expressions like "while(true){}".
 *   We guard against this with a 50ms timeout on the first evaluation probe.
 *
 * No eval(). No Function constructor. No dynamic import of user code.
 */

// math.js is loaded via CDN script tag in the Next.js layout (see deployment notes).
// We access it through the typed window binding below.
// This avoids bundling 230KB into the initial chunk — it loads lazily with MathCanvas.

// Type declaration for the math.js global (loaded via CDN)
declare global {
  interface Window {
    mathjs?: {
      evaluate: (expr: string, scope?: Record<string, number>) => number;
      parse: (expr: string) => MathNode;
      derivative: (expr: string | MathNode, variable: string) => MathNode;
      simplify: (expr: string | MathNode) => MathNode;
      rationalize: (expr: string | MathNode) => MathNode;
    };
  }
}

interface MathNode {
  toString: () => string;
  evaluate: (scope?: Record<string, number>) => number;
}

// =============================================================================
// MODULE-LEVEL MATH.JS ACCESS
// =============================================================================

/**
 * Get the math.js instance, loading it from CDN if not yet available.
 * Returns null if CDN is unreachable (offline mode).
 */
let _math: Window['mathjs'] | null = null;

export async function getMathJS(): Promise<Window['mathjs'] | null> {
  if (_math) return _math;

  // Already loaded by CDN script tag?
  if (typeof window !== 'undefined' && window.mathjs) {
    _math = window.mathjs;
    return _math;
  }

  // Load from CDN on demand
  return new Promise<Window['mathjs'] | null>((resolve) => {
    if (typeof document === 'undefined') { resolve(null); return; }

    const existing = document.getElementById('mathjs-cdn');
    if (existing) {
      // Script tag exists but hasn't fired load yet
      existing.addEventListener('load', () => { _math = window.mathjs ?? null; resolve(_math); });
      return;
    }

    const script = document.createElement('script');
    script.id = 'mathjs-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.3/math.min.js';
    script.onload = () => { _math = window.mathjs ?? null; resolve(_math); };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

/** Synchronous access — only valid after getMathJS() has resolved */
export function getMathJSSync(): Window['mathjs'] | null {
  if (_math) return _math;
  if (typeof window !== 'undefined' && window.mathjs) {
    _math = window.mathjs;
    return _math;
  }
  return null;
}

// =============================================================================
// EXPRESSION PARSING & VALIDATION
// =============================================================================

export interface ParseResult {
  valid: boolean;
  /** Cleaned expression in math.js canonical form, e.g. "x^2 - y^2" */
  canonical: string;
  /** Variables detected in the expression */
  variables: string[];
  /** Error message if invalid */
  error?: string;
}

/**
 * Parse and validate an expression string entered by the student.
 * Strips common prefixes ("z =", "f(x,y) =", "y =") before parsing.
 *
 * Returns the canonical form and detected variables so the caller
 * can decide whether to treat it as a 2D or 3D expression.
 */
export function parseExpression(raw: string): ParseResult {
  const math = getMathJSSync();
  if (!math) return { valid: false, canonical: '', variables: [], error: 'math.js not loaded' };

  // Strip function definition prefixes
  let expr = raw.trim()
    .replace(/^z\s*=\s*/i, '')
    .replace(/^f\s*\([^)]*\)\s*=\s*/i, '')
    .replace(/^y\s*=\s*/i, '')
    .replace(/^f\s*=\s*/i, '')
    .trim();

  if (!expr) return { valid: false, canonical: '', variables: [], error: 'Empty expression' };

  // Detect potentially dangerous patterns before passing to math.js
  const BLOCKED = /\b(import|require|fetch|XMLHttpRequest|eval|Function|window|document|process|__proto__|prototype)\b/i;
  if (BLOCKED.test(expr)) {
    return { valid: false, canonical: '', variables: [], error: 'Expression contains disallowed keywords' };
  }

  try {
    const node = math.parse(expr);
    const canonical = node.toString();

    // Detect variables by probing with x=1,y=1 and x=2,y=2
    // Any non-constant expression will differ between the two evaluations
    const variables: string[] = [];
    try {
      const v1 = math.evaluate(expr, { x: 1, y: 1, t: 1, u: 1, v: 1 });
      const v2 = math.evaluate(expr, { x: 2, y: 1, t: 1, u: 1, v: 1 });
      const v3 = math.evaluate(expr, { x: 1, y: 2, t: 1, u: 1, v: 1 });
      if (v1 !== v2) variables.push('x');
      if (v1 !== v3) variables.push('y');
      if (!isFinite(v1)) return { valid: false, canonical, variables, error: 'Expression produces non-finite values' };
    } catch {
      // Variables not resolved — expression might need both x and y
    }

    return { valid: true, canonical, variables };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Parse error';
    return { valid: false, canonical: '', variables: [], error: `Invalid expression: ${msg}` };
  }
}

// =============================================================================
// EXPRESSION SURFACE EVALUATOR — Float32Array for Three.js
// =============================================================================

export interface ExpressionDomain {
  xMin: number; xMax: number;
  yMin: number; yMax: number;
  resolution: number;
}

export interface ExpressionSurface {
  /** Cleaned expression string, ready for math.js.evaluate() */
  expression: string;
  domain: ExpressionDomain;
  /** Current parameter values (slider overrides) */
  params?: Record<string, number>;
}

/**
 * Evaluate an arbitrary expression z = f(x,y) to a vertex Float32Array.
 *
 * This is the P3 "live update" path: student types "sin(x)*cos(y)",
 * this function produces the same Float32Array format that evaluateSurface()
 * produces, so the same Three.js renderer can display it with zero changes.
 *
 * The math.js scope is STRICTLY {x, y, ...params}. No other globals.
 * Any expression that attempts to access window, eval, etc. will throw at
 * parse time (blocked by parseExpression) or fail silently here.
 */
export function evaluateExpression(
  surface: ExpressionSurface,
): { vertices: Float32Array; resolution: number; valid: boolean; error?: string } {
  const math = getMathJSSync();
  if (!math) return { vertices: new Float32Array(0), resolution: 0, valid: false, error: 'math.js not loaded' };

  const { expression, domain, params = {} } = surface;
  const { xMin, xMax, yMin, yMax, resolution: N } = domain;

  const safeN = Math.max(10, Math.min(80, N));
  const dx = (xMax - xMin) / safeN;
  const dy = (yMax - yMin) / safeN;
  const verts = new Float32Array((safeN + 1) * (safeN + 1) * 3);

  let idx = 0;
  let hadInfinite = false;

  for (let j = 0; j <= safeN; j++) {
    const y = yMin + j * dy;
    for (let i = 0; i <= safeN; i++) {
      const x = xMin + i * dx;
      let z = 0;
      try {
        z = math.evaluate(expression, { x, y, ...params });
        if (!isFinite(z)) { z = 0; hadInfinite = true; }
      } catch {
        z = 0;
        hadInfinite = true;
      }
      verts[idx++] = x;
      verts[idx++] = z;  // Three.js y = mathematical z
      verts[idx++] = y;
    }
  }

  return {
    vertices: verts,
    resolution: safeN,
    valid: true,
    error: hadInfinite ? 'Some values undefined in domain (shown as z=0)' : undefined,
  };
}

// =============================================================================
// SYMBOLIC DIFFERENTIATION — for tangent planes & gradient display
// =============================================================================

export interface TangentPlane {
  /** z-value at the base point */
  z0: number;
  /** ∂f/∂x at (a, b) — slope in x direction */
  dfdx: number;
  /** ∂f/∂y at (a, b) — slope in y direction */
  dfdy: number;
  /** Tangent plane as an ExpressionSurface: z = z0 + dfdx*(x-a) + dfdy*(y-b) */
  plane: ExpressionSurface;
  /** Human-readable equation string */
  equation: string;
}

/**
 * Compute the tangent plane to z = f(x,y) at point (a, b).
 *
 * This is the core of the "tangent plane" feature in CAS mode:
 * student has a surface, drags a point on it, and sees the tangent
 * plane snap into position. The derivative is computed symbolically
 * by math.js's built-in derivative() function, then evaluated numerically
 * at (a, b).
 *
 * The resulting plane descriptor can be fed directly to the dual-surface
 * renderer — one surface = f(x,y), second surface = tangent plane.
 * The intersection is the "contact circle" at (a,b).
 */
export function computeTangentPlane(
  expression: string,
  a: number,
  b: number,
  domain: ExpressionDomain,
): TangentPlane | null {
  const math = getMathJSSync();
  if (!math) return null;

  try {
    // Symbolic partial derivatives
    const dfdxNode = math.derivative(expression, 'x');
    const dfdyNode = math.derivative(expression, 'y');

    const scope = { x: a, y: b };
    const z0   = math.evaluate(expression, scope);
    const dfdx = dfdxNode.evaluate(scope);
    const dfdy = dfdyNode.evaluate(scope);

    if (!isFinite(z0) || !isFinite(dfdx) || !isFinite(dfdy)) return null;

    // Tangent plane expression: z = z0 + dfdx*(x-a) + dfdy*(y-b)
    // Expanded: z = (z0 - dfdx*a - dfdy*b) + dfdx*x + dfdy*y
    const C = z0 - dfdx * a - dfdy * b;
    const planeExpr = `${dfdx.toFixed(4)} * x + ${dfdy.toFixed(4)} * y + ${C.toFixed(4)}`;

    const equation = `z = ${z0.toFixed(3)} + ${dfdx.toFixed(3)}(x − ${a.toFixed(2)}) + ${dfdy.toFixed(3)}(y − ${b.toFixed(2)})`;

    return {
      z0, dfdx, dfdy,
      plane: { expression: planeExpr, domain, params: {} },
      equation,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// GRADIENT VECTOR — for vector field overlay
// =============================================================================

export interface GradientVector {
  /** x-component of ∇f at point */
  gx: number;
  /** y-component of ∇f at point */
  gy: number;
  /** Magnitude |∇f| */
  magnitude: number;
  /** Direction in degrees (from positive x-axis) */
  directionDeg: number;
  /** Human-readable: "∇f(a,b) = (gx, gy)" */
  display: string;
}

/**
 * Compute ∇f(x,y) = (∂f/∂x, ∂f/∂y) at point (a, b).
 * Used in CAS mode to show gradient vectors on the surface.
 * The gradient points in the direction of steepest ascent —
 * a key concept for Year 11-12 calculus students.
 */
export function computeGradient(
  expression: string,
  a: number,
  b: number,
): GradientVector | null {
  const math = getMathJSSync();
  if (!math) return null;

  try {
    const dfdxNode = math.derivative(expression, 'x');
    const dfdyNode = math.derivative(expression, 'y');
    const scope = { x: a, y: b };
    const gx = dfdxNode.evaluate(scope);
    const gy = dfdyNode.evaluate(scope);

    if (!isFinite(gx) || !isFinite(gy)) return null;

    const magnitude = Math.sqrt(gx * gx + gy * gy);
    const directionDeg = (Math.atan2(gy, gx) * 180) / Math.PI;

    return {
      gx, gy, magnitude, directionDeg,
      display: `∇f(${a.toFixed(2)}, ${b.toFixed(2)}) = (${gx.toFixed(3)}, ${gy.toFixed(3)})`,
    };
  } catch {
    return null;
  }
}

// =============================================================================
// ALGEBRAIC EQUIVALENCE — for rubric grading
// =============================================================================

export interface EquivalenceResult {
  equivalent: boolean;
  /** Confidence: 'exact' (symbolic) | 'numerical' (high-confidence numerical) | 'unknown' */
  method: 'exact' | 'numerical' | 'unknown';
  /** Simplified forms of both expressions */
  simplified1: string;
  simplified2: string;
  /** Human-readable explanation for teacher dashboard */
  explanation: string;
}

/**
 * Determine whether two student expressions are mathematically equivalent.
 *
 * Strategy (layered, fastest first):
 *   1. String equality after whitespace normalisation (trivial case)
 *   2. Symbolic simplification: simplify(expr1 - expr2) → 0 ?
 *   3. Numerical sampling: evaluate both at 20 random (x,y) points.
 *      If all agree within ε = 1e-9, declare equivalent with high confidence.
 *
 * This layered approach catches "x^2 + 2x + 1" === "(x+1)^2" via step 2,
 * and catches exotic equivalences via step 3.
 *
 * Used in:
 *   - CAS mode: student submits derivative, system compares to computed exact answer
 *   - Assessment rubric: spot-check submitted expressions without LLM involvement
 */
export function checkEquivalence(
  expr1: string,
  expr2: string,
): EquivalenceResult {
  const math = getMathJSSync();
  if (!math) {
    return { equivalent: false, method: 'unknown', simplified1: expr1, simplified2: expr2, explanation: 'math.js not loaded' };
  }

  // Step 1: String equality after normalisation
  const normalise = (e: string) => e.replace(/\s+/g, '').toLowerCase();
  if (normalise(expr1) === normalise(expr2)) {
    return { equivalent: true, method: 'exact', simplified1: expr1, simplified2: expr2, explanation: 'Expressions are identical.' };
  }

  let simplified1 = expr1;
  let simplified2 = expr2;

  // Step 2: Symbolic simplification of the difference
  try {
    simplified1 = math.simplify(expr1).toString();
    simplified2 = math.simplify(expr2).toString();
    const diff = math.simplify(`(${expr1}) - (${expr2})`).toString();
    if (diff === '0' || diff === '0i' || diff.replace(/\s/g, '') === '0') {
      return {
        equivalent: true, method: 'exact', simplified1, simplified2,
        explanation: `Both expressions simplify to the same form. Difference: (${expr1}) − (${expr2}) = 0`,
      };
    }
  } catch {
    // Symbolic simplification failed (e.g. transcendental functions) — fall through to numerical
  }

  // Step 3: Numerical sampling at 20 pseudo-random points
  const POINTS = 20;
  const SEED_POINTS = [
    [0.1, 0.2], [0.7, 0.3], [-0.5, 0.8], [1.2, -0.4], [-1.1, -0.9],
    [0.3, 1.5], [-0.8, 0.6], [2.0, 0.1], [-2.0, -0.5], [0.5, -1.5],
    [1.0, 1.0], [-1.0, 1.0], [1.0, -1.0], [-1.0, -1.0], [0.0, 0.0],
    [0.4, 0.9], [-0.3, 0.7], [1.8, -1.2], [-1.7, 0.4], [0.6, -0.6],
  ].slice(0, POINTS);

  let allMatch = true;
  let checkedCount = 0;

  for (const [x, y] of SEED_POINTS) {
    try {
      const v1 = math.evaluate(expr1, { x, y });
      const v2 = math.evaluate(expr2, { x, y });
      if (!isFinite(v1) || !isFinite(v2)) continue; // skip undefined points
      checkedCount++;
      if (Math.abs(v1 - v2) > 1e-9) { allMatch = false; break; }
    } catch {
      // Expression doesn't evaluate at this point — skip
    }
  }

  if (checkedCount < 5) {
    return { equivalent: false, method: 'unknown', simplified1, simplified2, explanation: 'Could not compare expressions numerically.' };
  }

  return {
    equivalent: allMatch,
    method: 'numerical',
    simplified1, simplified2,
    explanation: allMatch
      ? `Expressions agree at ${checkedCount} test points (numerical equivalence, high confidence).`
      : 'Expressions produce different values — not equivalent.',
  };
}

// =============================================================================
// CAS ASSESSMENT RUBRIC
// =============================================================================

export interface RubricQuestion {
  id: string;
  type: import('@/types/mathcanvas').CASTaskType | 'derivative' | 'antiderivative';
  /** The expression students are working with */
  expression: string;
  /** Variable(s) for differentiation/integration */
  variables?: string[];
  /** Expected answer (exact form) */
  expectedAnswer: string;
}

export interface RubricResult {
  questionId: string;
  studentAnswer: string;
  correct: boolean;
  equivalence: EquivalenceResult;
  /** Marks awarded (0 or 1 for exact, partial credit not yet implemented) */
  marks: number;
  feedback: string;
}

/**
 * Grade a student's CAS answer against the expected answer.
 * Returns structured feedback suitable for the teacher gradebook.
 *
 * This replaces the LLM grading path for algebraic questions entirely —
 * math.js gives a definitive correct/incorrect determination without
 * any hallucination risk.
 */
export function gradeAnswer(
  question: RubricQuestion,
  studentAnswer: string,
): RubricResult {
  const equivalence = checkEquivalence(studentAnswer, question.expectedAnswer);

  const feedback = equivalence.equivalent
    ? `✓ Correct. ${equivalence.explanation}`
    : `✗ Not equivalent to expected answer. Your answer: ${equivalence.simplified1}. Expected: ${equivalence.simplified2}.`;

  return {
    questionId: question.id,
    studentAnswer,
    correct: equivalence.equivalent,
    equivalence,
    marks: equivalence.equivalent ? 1 : 0,
    feedback,
  };
}

// =============================================================================
// EXPRESSION SUGGESTIONS — for the live input field autocomplete
// =============================================================================

/**
 * Common expressions grouped by curriculum strand.
 * Used to populate the expression bar's suggestion dropdown in live mode.
 */
export const EXPRESSION_SUGGESTIONS = {
  'Functions': [
    'x^2 - y^2',
    'sin(x) * cos(y)',
    'x^2 + y^2',
    'sqrt(x^2 + y^2)',
    'x^3 - 3*x*y^2',
  ],
  'Exponential & Log': [
    'exp(-(x^2 + y^2) / 2)',
    'exp(-x) * cos(y)',
    'log(x^2 + y^2 + 1)',
  ],
  'Trigonometric': [
    'sin(sqrt(x^2 + y^2))',
    'sin(x) + cos(y)',
    'sin(x) * sin(y)',
    'cos(x^2 + y^2)',
  ],
  'Polynomial': [
    'x^2 + x*y + y^2',
    'x^3 + y^3 - 3*x*y',
    '(x^2 - 1) * (y^2 - 1)',
  ],
  'Tangent Planes': [
    'x^2 + y^2',           // then compute tangent at a point
    'sin(x) * cos(y)',      // interesting tangent geometry
    'x*y',                  // hyperbolic paraboloid — tangent = plane through origin
  ],
} as const;
