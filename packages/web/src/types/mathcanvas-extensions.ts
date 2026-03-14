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
