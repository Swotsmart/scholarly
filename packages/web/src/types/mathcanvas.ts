/**
 * MathCanvas Type Definitions — Priority 1 Extended
 *
 * Extends the base types.ts with the dual-surface and intersection-curve
 * schema needed for Priority 1: Two Simultaneous Surfaces.
 *
 * Architecture decision: CompoundSurfaceDescriptor wraps two SurfaceDescriptors
 * into a single AI response. Claude returns one JSON object; the renderer
 * unpacks both surfaces and runs the intersection sampler between them.
 *
 * No eval() — the intersection algorithm operates entirely on the pre-evaluated
 * Float32Array vertex grids produced by the existing evaluateSurface() function.
 *
 * Surface taxonomy (curriculum coverage):
 *   explicit    — z = f(x,y)          covers ~60% of secondary calculus/algebra
 *   parametric  — (x,y,z) = f(u,v)   covers ~25% (trig, polar, 3D curves)
 *   revolution  — z = f(x) rotated    covers ~10% (solids of revolution, Year 11-12)
 */

// =============================================================================
// SURFACE DESCRIPTORS — what Claude returns for 3D mode
// =============================================================================

/** A single numeric coefficient or constant in a surface expression */
export interface SurfaceCoefficient {
  name: string;   // e.g. "A", "k", "omega"
  value: number;  // resolved value (after applying parameters)
}

/**
 * Explicit surface: z = f(x, y)
 * Claude describes the function via a named type + coefficients.
 * The renderer maps SurfaceExplicitType → a pure TS function (x,y) => z.
 * No eval() — the mapping table is exhaustive for curriculum scope.
 */
export type SurfaceExplicitType =
  // Algebraic
  | 'paraboloid'          // z = A(x² + y²)
  | 'elliptic_paraboloid' // z = A·x² + B·y²
  | 'hyperbolic_paraboloid' // z = A·x² - B·y²  (saddle)
  | 'cone'                // z = A·√(x² + y²)
  | 'plane'               // z = A·x + B·y + C
  | 'sphere_upper'        // z = √(R² - x² - y²)
  | 'sphere_lower'        // z = -√(R² - x² - y²)
  | 'gaussian'            // z = A·exp(-(x² + y²) / (2σ²))
  | 'ripple'              // z = A·sin(k·√(x² + y²))
  | 'wave_product'        // z = A·sin(kx·x)·cos(ky·y)
  | 'wave_sum'            // z = A·sin(kx·x) + B·cos(ky·y)
  | 'polynomial_2'        // z = Ax² + Bxy + Cy²  (general quadric section)
  | 'exponential_decay'   // z = A·exp(-k·(x² + y²))
  | 'monkey_saddle'       // z = x³ - 3xy²
  | 'absolute_value';     // z = A·|x| + B·|y|

export interface SurfaceExplicit {
  type: 'explicit';
  kind: SurfaceExplicitType;
  coefficients: Record<string, number>; // e.g. { A: 1, B: 2, R: 3 }
  domain: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
  };
  resolution?: number; // grid points per axis, default 60
}

/**
 * Parametric surface: (x, y, z) = f(u, v)
 * Claude specifies a named parametric family + coefficients.
 * Pre-built evaluators cover the entire secondary curriculum.
 */
export type SurfaceParametricType =
  | 'sphere'          // (R·sin(v)·cos(u), R·sin(v)·sin(u), R·cos(v))
  | 'torus'           // ((R + r·cos(v))·cos(u), (R + r·cos(v))·sin(u), r·sin(v))
  | 'cylinder'        // (R·cos(u), R·sin(u), v)
  | 'helicoid'        // (u·cos(v), u·sin(v), k·v)
  | 'catenoid'        // (k·cosh(v/k)·cos(u), k·cosh(v/k)·sin(u), v)
  | 'mobius'          // Möbius strip
  | 'klein_bottle'    // Klein bottle (figure-8 immersion)
  | 'ellipsoid'       // (a·sin(v)·cos(u), b·sin(v)·sin(u), c·cos(v))
  | 'hyperboloid_1'   // (a·cosh(v)·cos(u), b·cosh(v)·sin(u), c·sinh(v)) — 1 sheet
  | 'hyperboloid_2'   // 2-sheet hyperboloid
  | 'seashell'        // Seashell / conchoid surface (engaging for younger years)
  | 'trefoil_knot';   // Trefoil knot tube (topology intro)

export interface SurfaceParametric {
  type: 'parametric';
  kind: SurfaceParametricType;
  coefficients: Record<string, number>;
  uRange: [number, number]; // e.g. [0, 2π]
  vRange: [number, number];
  resolution?: number;
}

/**
 * Surface of revolution: rotate z = f(x) around the z-axis
 * Covers solids of revolution (Year 11-12 calculus)
 */
export type RevolutionProfileType =
  | 'linear'     // y = mx + c
  | 'quadratic'  // y = ax² + bx + c
  | 'sine'       // y = A·sin(kx)
  | 'exponential'// y = A·eˢˣ
  | 'sqrt'       // y = A·√x
  | 'reciprocal';// y = A/x

export interface SurfaceRevolution {
  type: 'revolution';
  profile: RevolutionProfileType;
  coefficients: Record<string, number>;
  xRange: [number, number];
  axis: 'z' | 'x' | 'y';
  resolution?: number;
}

export type SurfaceDescriptor = SurfaceExplicit | SurfaceParametric | SurfaceRevolution;

// =============================================================================
// COMPOUND SURFACE DESCRIPTOR — Priority 1: Two Simultaneous Surfaces
// =============================================================================

/**
 * Visual appearance configuration for one surface in a compound scene.
 * Controls colour, opacity, and labelling independently per surface.
 */
export interface SurfaceAppearance {
  /** Colour scheme applied to this surface's vertex gradient */
  colorScheme: '3d_heat' | '3d_depth' | '3d_cool' | '3d_solid' | '3d_normal';
  /** Surface opacity: 0 = invisible, 1 = fully opaque */
  opacity: number;
  /** Human-readable label rendered in the legend and AI commentary */
  label: string;
}

/**
 * A named surface slot — the SurfaceDescriptor plus its visual configuration.
 * Claude populates both fields; the renderer uses appearance independently
 * for each mesh so students can toggle visibility without affecting the other.
 */
export interface NamedSurface {
  descriptor: SurfaceDescriptor;
  appearance: SurfaceAppearance;
}

/**
 * CompoundSurfaceDescriptor: Claude's response when a learner asks to compare
 * two surfaces ("show me z = x² + y² and z = 2 - x²", "plot the paraboloid
 * and its tangent plane at (1,1)").
 *
 * The AI commentary explains what the intersection means geometrically,
 * connecting it to the curriculum strand in play.
 */
export interface CompoundSurfaceDescriptor {
  kind: 'compound';
  /** Primary surface — rendered first, sets the shared domain for intersection */
  surface1: NamedSurface;
  /** Secondary surface — rendered in a distinct colour palette */
  surface2: NamedSurface;
  /**
   * Shared domain for the intersection sampler.
   * If the two surfaces have different natural domains, this defines
   * the overlap region where the sign-change test is meaningful.
   */
  sharedDomain: {
    xMin: number; xMax: number;
    yMin: number; yMax: number;
    resolution: number; // intersection grid density — 50 recommended, max 80
  };
  /** Display title shown in the info panel */
  title: string;
  /** 2-3 sentence description aimed at the learner's year level */
  description: string;
  /** Curriculum topic, e.g. "Quadric Surfaces and Their Intersections" */
  topic: string;
  /** ACARA / IB curriculum code */
  curriculumCode: string;
  /** Parameters Claude exposes for interactive exploration */
  parameters: SurfaceParameter[];
  /**
   * Geometric explanation of what the intersection curve represents.
   * Shown in the AI commentary panel below the 3D scene.
   */
  intersectionExplanation: string;
  /** Pedagogical note for the teacher visible in the gradebook attachment */
  teacherNote: string;
  /** Suggested next question for Issy to ask the student */
  suggestedExploration?: string;
}

// =============================================================================
// INTERSECTION CURVE — output of the marching-squares sampler
// =============================================================================

/**
 * A single segment of the intersection curve: two 3D points that are
 * endpoints of one edge-crossing in the marching-squares grid.
 * The renderer draws these as LineSegments in the R3F scene.
 */
export interface IntersectionSegment {
  x1: number; y1: number; z1: number;  // world-space start point
  x2: number; y2: number; z2: number;  // world-space end point
}

/**
 * The complete intersection result from computeIntersectionCurve().
 * Contains all line segments that, when rendered, approximate the
 * set { (x,y) : f₁(x,y) = f₂(x,y) } lifted onto both surfaces.
 */
export interface IntersectionCurve {
  segments: IntersectionSegment[];
  /** Approximate number of distinct curve components (connected components) */
  componentCount: number;
  /** True if at least one crossing was found */
  hasIntersection: boolean;
  /** Diagnostic message (e.g. "Surfaces are parallel — no intersection") */
  message?: string;
}

// =============================================================================
// AI RESPONSE SCHEMA — the full structured response from Claude for 3D mode
// =============================================================================

/** A slider parameter Claude can define to make surfaces interactive */
export interface SurfaceParameter {
  name: string;        // coefficient name, e.g. "A"
  label: string;       // display label, e.g. "Amplitude"
  min: number;
  max: number;
  step: number;
  default: number;
  group?: string;      // parameter group for UI grouping
  /** Which surface this parameter applies to (undefined = both) */
  surfaceTarget?: 1 | 2;
}

/** Claude's structured 3D response — never contains executable code */
export interface MathCanvas3DResponse {
  surface: SurfaceDescriptor;
  title: string;
  description: string;           // 1-2 sentences for the learner
  topic: string;                 // e.g. "Quadric Surfaces"
  curriculumCode: string;        // e.g. "AC9M10A02"
  parameters: SurfaceParameter[];
  colorScheme?: '3d_heat' | '3d_depth' | '3d_normal' | '3d_solid'; // rendering hint
  teacherNote: string;
  suggestedExploration?: string; // Issy prompt suggestion
}

/** Claude's structured response for dual-surface mode */
export interface MathCanvasDualResponse {
  compound: CompoundSurfaceDescriptor;
}

// =============================================================================
// 2D MODE RESPONSE — unchanged from the existing HTML implementation
// =============================================================================

export interface MathCanvas2DResponse {
  svg: string;
  title: string;
  description: string;
  topic: string;
  curriculumCode: string;
  parameters: SurfaceParameter[];
  teacherNote: string;
  /**
   * Optional: the canonical math.js-parseable expression for the primary curve,
   * e.g. "sin(x) + 0.5 * x^2". Populated by the 2D system prompt when a single
   * clean expression can be identified. Used by the Table of Values panel to
   * evaluate f(x) client-side without an API round-trip.
   * Absent for parametric, implicit, or multi-curve visualisations.
   */
  mathExpression?: string;
  /**
   * Optional: the independent variable name — almost always "x", but could be
   * "t" for parametric time plots. Defaults to "x" if absent.
   */
  expressionVariable?: string;
}

// =============================================================================
// SESSION STATE
// =============================================================================

export type CanvasMode = 'graphing' | 'geometry' | '3d' | 'stats' | 'cas' | 'probability';
export type ViewMode = '3d' | '2d';  // toggle within 3D mode: WebGL vs SVG projection

export interface MathCanvasSession {
  mode: CanvasMode;
  viewMode: ViewMode;
  intent: string;
  isLoading: boolean;
  error: string | null;

  // 2D state
  result2D: MathCanvas2DResponse | null;

  // 3D state — single surface
  result3D: MathCanvas3DResponse | null;

  // 3D state — dual surface (Priority 1)
  resultDual: MathCanvasDualResponse | null;

  /** Current parameter values (merged defaults + user adjustments) */
  paramValues: Record<string, number>;

  // Learner context (injected from SCHOLARLY_CONTEXT bridge)
  student: {
    name: string;
    yearLevel: string;
    id: string;
  };
  mastery: {
    functions: number;   // 0–1
    geometry: number;
    statistics: number;
  };
  curriculum: {
    framework: string;   // e.g. "ACARA"
    strand: string;
    yearLevel: string;
  };
}

// =============================================================================
// SCHOLARLY CONTEXT BRIDGE — matches the window.SCHOLARLY_CONTEXT contract
// =============================================================================

export interface ScholarlyContext {
  student: { name: string; yearLevel: string; id: string };
  mastery: { functions: number; geometry: number; statistics: number };
  tenantId: string;
  onVisualizationCreated?: (event: {
    intent: string;
    topic: string;
    code: string;
    studentId: string;
    mode: CanvasMode;
    surfaceType?: string;
  }) => void;
  onMasteryEvent?: (event: {
    type: string;
    topic: string;
    studentId: string;
  }) => void;
}

// =============================================================================
// SURFACE EVALUATOR RETURN — what the evaluator hands to Three.js
// =============================================================================

export interface EvaluatedSurface {
  /** Array of [x, y, z] triples, row-major, (resolution+1)² points */
  vertices: Float32Array;
  /** Resolution (grid subdivisions per axis) */
  resolution: number;
  /** u/v ranges for parametric, x/y ranges for explicit */
  uRange: [number, number];
  vRange: [number, number];
  valid: boolean;
  error?: string;
}

// =============================================================================
// CAS MODE TYPES — Priority 2 (Symbolic CAS) & Priority 3 (Live Expression)
// =============================================================================

/**
 * A live expression entered directly by the student — bypasses the AI
 * round-trip entirely. The string is parsed by mathcanvas-cas.ts using
 * math.js and rendered in <16ms.
 */
export interface LiveExpression {
  /** Raw string as typed, e.g. "sin(x) * exp(-y)" or "x^2 - y^2" */
  raw: string;
  /** Canonical form after math.js parse, e.g. "sin(x) * e^(-y)" */
  canonical: string;
  /** Inferred render mode based on detected variables */
  renderMode: '3d' | '2d' | 'unknown';
  /** Parse error if any */
  error?: string;
}

/**
 * CAS task types that the AI can assign to students in CAS mode.
 * Each maps to a structured grading path through mathcanvas-cas.ts.
 */
export type CASTaskType =
  | 'find_derivative'        // ∂f/∂x or ∂f/∂y
  | 'find_gradient'          // ∇f at a point
  | 'find_tangent_plane'     // tangent plane at (a,b)
  | 'simplify'               // algebraic simplification
  | 'expand'                 // expand factored form
  | 'factorise'              // factorise polynomial
  | 'evaluate_at_point'      // f(a, b) = ?
  | 'compare_expressions'    // are these two expressions equivalent?
  // ── Vectors & Matrices (Session 6) ──────────────────────────────────────────────
  | 'matrix_multiply'        // A × B — row–column expansion shown step by step
  | 'find_determinant'       // det(A) — 2×2 cofactor or 3×3 Sarrus/cofactor expansion
  | 'row_reduce'             // Gaussian elimination — pivots annotated
  | 'find_eigenvalues';      // characteristic polynomial → eigenvalues (Year 12+)

/**
 * A single CAS task — generated by the AI (Claude), graded by math.js.
 * The AI designs the task and provides the canonical expected answer.
 * math.js determines correctness — no LLM involved in marking.
 */
export interface CASTask {
  id: string;
  type: CASTaskType;
  /** The expression or equation the task is about */
  expression: string;
  /** Natural language task description, e.g. "Find ∂f/∂x for this surface" */
  prompt: string;
  /** Canonical expected answer (math.js parseable) */
  expectedAnswer: string;
  /** Hint to display after first wrong attempt */
  hint?: string;
  /** Marks available (default 1) */
  marks: number;
  /** Step-by-step worked solution for teacher view */
  workedSolution: string;
  /**
   * For matrix task types (matrix_multiply, find_determinant, row_reduce, find_eigenvalues):
   * the matrix operands encoded as JSON arrays of number arrays.
   * The renderer uses these to draw styled mathematical matrices with brackets.
   * e.g. matrixA: [[1,2],[3,4]]  matrixB: [[5,6],[7,8]]
   */
  matrixA?: number[][];
  matrixB?: number[][];
}

/**
 * Claude's response to a CAS mode prompt.
 * Contains the surface to display, tasks for the student, and
 * the worked solutions the teacher sees in gradebook.
 */
export interface MathCanvasCASResponse {
  /** Surface to display as context for the tasks */
  surface: SurfaceDescriptor | null;
  /** Natural language introduction for the student */
  introduction: string;
  /** Ordered list of tasks the student must complete */
  tasks: CASTask[];
  /** Key concepts being assessed (for BKT mastery tagging) */
  concepts: string[];
  /** Curriculum strand and year level this content targets */
  curriculum: {
    strand: string;
    yearLevel: string;
    outcome: string;
  };
}

/**
 * State of the student's CAS session — tracks their answers and marks.
 */
export interface CASSessionState {
  tasks: CASTask[];
  /** Student's submitted answers keyed by task id */
  answers: Record<string, string>;
  /** Grading results keyed by task id */
  grades: Record<string, {
    correct: boolean;
    marks: number;
    feedback: string;
    attemptCount: number;
  }>;
  totalMarks: number;
  earnedMarks: number;
  completed: boolean;
}

/**
 * Tangent plane display state — used by the CAS 3D view
 * to overlay the tangent plane on the surface as students drag the point.
 */
export interface TangentPlaneState {
  /** Whether tangent plane overlay is enabled */
  visible: boolean;
  /** Base point (a, b) on the surface */
  point: [number, number];
  /** Computed tangent plane (null while computing or if failed) */
  plane: {
    z0: number;
    dfdx: number;
    dfdy: number;
    equation: string;
  } | null;
}

/**
 * Gradient vector display state — shown as an arrow on the surface.
 */
export interface GradientState {
  visible: boolean;
  point: [number, number];
  vector: { gx: number; gy: number; magnitude: number; directionDeg: number } | null;
}

/**
 * Extends MathCanvasSession with CAS-specific state.
 * Added to the session object in the hook when mode === 'cas'.
 */
export interface CASModeState {
  /** The AI-generated CAS task set for this session */
  casResponse: MathCanvasCASResponse | null;
  /** Live student session progress */
  casSession: CASSessionState | null;
  /** Live expression entered directly (P3) */
  liveExpression: LiveExpression | null;
  /** Tangent plane overlay (draggable point on surface) */
  tangentPlane: TangentPlaneState;
  /** Gradient vector overlay */
  gradient: GradientState;
  /** Whether to show the expression input bar (P3) */
  showExpressionBar: boolean;
}

// Extended CanvasMode — add 'expression' and 'repl' for direct-input modes
// (CAS mode = AI-guided tasks; expression mode = free-form live input; repl = CAS REPL)
export type ExtCanvasMode = CanvasMode | 'expression' | 'repl';

// ---------------------------------------------------------------------------
// REPL / Steps types (mirrored from mathkernel API)
// ---------------------------------------------------------------------------

export interface REPLResponse {
  success: boolean;
  command: string;
  expression: string;
  result: string;
  latex: string;
  numeric?: number | null;
  steps_available: boolean;
  error?: string | null;
}

export interface WorkingStep {
  step_number: number;
  rule: string;
  explanation: string;
  expression: string;
  latex: string;
  note?: string | null;
}

export interface StepsResponse {
  success: boolean;
  operation: string;
  expression: string;
  final_result: string;
  final_latex: string;
  steps: WorkingStep[];
  concept_note?: string | null;
  error?: string | null;
}
