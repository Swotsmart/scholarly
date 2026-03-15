/**
 * MathCanvas Type Extensions — Session 2026-03-14
 *
 * Append these exports to packages/web/src/types/mathcanvas.ts,
 * OR import from '@/types/mathcanvas-extensions' directly.
 *
 * Supports:
 *   1. Generalised 2D param re-render — ResolvedSvgState
 *   2. Statistics mode — MathCanvasStatsResponse, DistributionFamily
 *   3. Geometry mode — ConstructionStep, MathCanvasGeometryResponse, ConstructionState
 */

// =============================================================================
// 1. RESOLVED SVG — 2D param re-render state
// =============================================================================

export interface ResolvedSvgState {
  svg: string;
  paramSnapshot: Record<string, number>;
  isRerendering: boolean;
}

// =============================================================================
// 2. STATISTICS MODE
// =============================================================================

export type DistributionFamily =
  | 'normal'
  | 'binomial'
  | 'poisson'
  | 'uniform'
  | 't'
  | 'chi_squared'
  | 'exponential'
  | 'geometric';

export interface DistributionShading {
  from: number;
  to: number;
  probability: number;
  label: string;
}

export interface MathCanvasStatsResponse {
  svg: string;
  title: string;
  description: string;
  topic: string;
  curriculumCode: string;
  distribution: DistributionFamily;
  parameters: Array<{
    name: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
    group: string;
  }>;
  shading?: DistributionShading[];
  keyStats: Array<{ label: string; value: string }>;
  teacherNote: string;
  curriculumDetail: string;
}

// =============================================================================
// 3. GEOMETRY MODE — construction protocol
// =============================================================================

export interface ConstructionStep {
  stepNumber: number;
  action: string;
  svg: string;
  reason?: string;
  icon?: 'dot' | 'line' | 'circle' | 'arc' | 'bisect' | 'perpendicular' | 'label' | 'shade';
}

export interface MathCanvasGeometryResponse {
  svg: string;
  title: string;
  description: string;
  topic: string;
  curriculumCode: string;
  steps: ConstructionStep[];
  parameters: Array<{
    name: string;
    label: string;
    min: number;
    max: number;
    step: number;
    default: number;
    group: string;
  }>;
  teacherNote: string;
  theorem?: string;
}

export interface ConstructionState {
  response: MathCanvasGeometryResponse | null;
  currentStep: number;
  isPlaying: boolean;
}

// =============================================================================
// 4. PROBABILITY CALCULATOR MODE
// =============================================================================

/**
 * ProbabilitySetup — what Claude returns when interpreting a natural-language
 * probability problem. The AI's only job is to identify the distribution,
 * extract parameters, and classify the query type. All actual CDF/PDF math
 * happens in-browser from this struct.
 */
export type ProbabilityQueryType =
  | 'less_than'      // P(X ≤ b)
  | 'greater_than'   // P(X > a)
  | 'between'        // P(a ≤ X ≤ b)
  | 'exactly'        // P(X = k)  — discrete only
  | 'display_only';  // No specific query — just show the distribution

export type ProbabilityTailMode = 'left' | 'right' | 'interval' | 'point' | 'none';

export interface ProbabilityBound {
  lower: number | null;   // null → −∞
  upper: number | null;   // null → +∞
}

export interface ProbabilitySetup {
  distribution: DistributionFamily;
  parameters: Record<string, number>;  // e.g. { mu: 0, sigma: 1 } or { n: 10, p: 0.4 }
  query: ProbabilityQueryType;
  bound: ProbabilityBound;
  title: string;
  description: string;
  topic: string;
  curriculumCode: string;
  teacherNote: string;
  curriculumDetail: string;
}

/** Result produced by the in-browser CDF engine for a given setup + bound */
export interface ProbabilityCDFResult {
  probability: number;        // The answer: P(event)
  complement: number;         // 1 - probability
  lowerCDF: number | null;    // P(X ≤ lower) — used to draw left tail
  upperCDF: number | null;    // P(X ≤ upper) — used to derive right tail
  tailMode: ProbabilityTailMode;
  shadedFrom: number;         // SVG x-coordinate where shading starts
  shadedTo: number;           // SVG x-coordinate where shading ends
}

/** Full state held by the hook for probability mode */
export interface ProbabilityState {
  setup: ProbabilitySetup | null;
  // Live interactive parameters (overridable by the right-panel sliders)
  liveParams: Record<string, number>;
  // Live bound inputs (overridable by user typing in the right panel)
  liveBound: ProbabilityBound;
  // Computed CDF result — recomputed whenever params or bound changes
  result: ProbabilityCDFResult | null;
}
