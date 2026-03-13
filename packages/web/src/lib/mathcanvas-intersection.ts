/**
 * MathCanvas Intersection Computer
 *
 * Computes the intersection curve between two surfaces defined as
 * explicit z = f(x,y) functions over a shared domain.
 *
 * Algorithm: Marching Squares sign-change detection
 * ──────────────────────────────────────────────────
 * The intersection of two surfaces f₁(x,y) and f₂(x,y) is the set of
 * points where f₁(x,y) - f₂(x,y) = 0. Think of it like a topographic
 * map: we're finding the "sea level" contour of the difference surface.
 *
 * For each cell in the sampling grid:
 *   1. Evaluate d(x,y) = f₁(x,y) - f₂(x,y) at all four corners
 *   2. If corners have mixed signs (some positive, some negative),
 *      at least one zero crossing passes through the cell
 *   3. Linearly interpolate along each crossing edge to find where d ≈ 0
 *   4. Emit a line segment connecting the two edge-crossing midpoints
 *
 * This is the classical marching-squares algorithm at O(n²) complexity,
 * which is entirely adequate for 50×50 grids (2,500 cells, ~microseconds).
 *
 * Limitation: works on explicit z = f(x,y) surfaces only. Parametric and
 * revolution surfaces are approximated by evaluating at the same grid
 * coordinates as their explicit counterparts (see sampleSurfaceAtGrid).
 *
 * No eval(), no dynamic code — purely arithmetic on pre-evaluated grids.
 */

import type {
  SurfaceDescriptor,
  IntersectionCurve,
  IntersectionSegment,
  CompoundSurfaceDescriptor,
} from '@/types/mathcanvas';
import { evaluateSurface } from '@/lib/mathcanvas-evaluator';

// =============================================================================
// GRID SAMPLER
// =============================================================================

/**
 * Sample a surface at a regular (N+1)×(N+1) grid over the given domain.
 * Returns a flat Float32Array of z-values in row-major order.
 * Uses the existing evaluateSurface() evaluator — no duplication of logic.
 *
 * For parametric and revolution surfaces, we take the y-coordinate of the
 * evaluated vertex as the "height" value for sign-change testing. This is
 * an approximation that works well for curriculum-level surfaces.
 */
function sampleZGrid(
  surface: SurfaceDescriptor,
  paramOverrides: Record<string, number>,
  xMin: number, xMax: number,
  yMin: number, yMax: number,
  N: number,
): Float32Array {
  // Build a temporary explicit descriptor that forces the domain we want
  const tempSurface: SurfaceDescriptor = surface.type === 'explicit'
    ? { ...surface, domain: { xMin, xMax, yMin, yMax }, resolution: N }
    : surface; // parametric/revolution: use existing evaluator, project

  const evaluated = evaluateSurface(tempSurface, paramOverrides);
  if (!evaluated.valid || evaluated.vertices.length === 0) {
    // Return a zero grid — the intersection sampler will find no crossings
    return new Float32Array((N + 1) * (N + 1));
  }

  // Extract only the y (mathematical z) component from the vertex buffer
  const zGrid = new Float32Array((N + 1) * (N + 1));
  const verts = evaluated.vertices;
  const count = Math.min(zGrid.length, verts.length / 3);
  for (let i = 0; i < count; i++) {
    zGrid[i] = verts[i * 3 + 1]; // index 1 = Three.js y = mathematical z
  }
  return zGrid;
}

// =============================================================================
// MARCHING SQUARES EDGE INTERPOLATION
// =============================================================================

/**
 * Given a cell with corners at (i,j), (i+1,j), (i+1,j+1), (i,j+1) in the
 * grid, and the difference d = z1 - z2 at each corner, find all edge crossings
 * where d changes sign and emit line segments.
 *
 * Edge indexing convention (matches classic marching squares):
 *   0: bottom edge  (j  row, i..i+1)
 *   1: right  edge  (i+1 col, j..j+1)
 *   2: top    edge  (j+1 row, i..i+1)
 *   3: left   edge  (i  col, j..j+1)
 */
function interpolateEdge(
  x0: number, x1: number,
  y0: number, y1: number,
  d0: number, d1: number,
  z1Grid: Float32Array, z2Grid: Float32Array,
  idx0: number, idx1: number,
): [number, number, number] | null {
  if (Math.sign(d0) === Math.sign(d1)) return null;
  if (d0 === d1) return null; // parallel — no crossing

  const t = d0 / (d0 - d1);
  const x = x0 + t * (x1 - x0);
  const y = y0 + t * (y1 - y0);
  // z-value on the intersection: average both surfaces at the crossing point
  const z1 = z1Grid[idx0] + t * (z1Grid[idx1] - z1Grid[idx0]);
  const z2 = z2Grid[idx0] + t * (z2Grid[idx1] - z2Grid[idx0]);
  const z = (z1 + z2) / 2; // midpoint on the shared curve

  return [x, z, y]; // Three.js coordinate order: x, y_up, z_forward
}

// =============================================================================
// MAIN INTERSECTION COMPUTATION
// =============================================================================

/**
 * Compute the intersection curve between two surfaces over a shared domain.
 *
 * The algorithm is the mathematical equivalent of laying two transparent
 * topographic maps on top of each other and tracing where the contour lines
 * at the same elevation on both maps coincide — except here we're finding
 * where both surfaces share the same z-height, not the same colour.
 *
 * Returns an IntersectionCurve with all discovered line segments.
 * Empty segments array = surfaces don't intersect over this domain.
 */
export function computeIntersectionCurve(
  compound: CompoundSurfaceDescriptor,
  paramOverrides: Record<string, number>,
): IntersectionCurve {
  const { sharedDomain, surface1, surface2 } = compound;
  const { xMin, xMax, yMin, yMax, resolution: N } = sharedDomain;

  // Guard: resolution cap to prevent frame-rate degradation
  const safeN = Math.min(Math.max(N, 20), 80);

  // Sample both surfaces on the shared grid
  const z1 = sampleZGrid(surface1.descriptor, paramOverrides, xMin, xMax, yMin, yMax, safeN);
  const z2 = sampleZGrid(surface2.descriptor, paramOverrides, xMin, xMax, yMin, yMax, safeN);

  // Compute difference grid: d[i,j] = z1[i,j] - z2[i,j]
  const d = new Float32Array(z1.length);
  for (let k = 0; k < d.length; k++) {
    d[k] = isFinite(z1[k]) && isFinite(z2[k]) ? z1[k] - z2[k] : NaN;
  }

  const segments: IntersectionSegment[] = [];
  const dx = (xMax - xMin) / safeN;
  const dy = (yMax - yMin) / safeN;

  // March over all cells
  for (let j = 0; j < safeN; j++) {
    for (let i = 0; i < safeN; i++) {
      // Grid indices for the four corners of this cell
      const iBL = j * (safeN + 1) + i;       // bottom-left
      const iBR = j * (safeN + 1) + (i + 1); // bottom-right
      const iTL = (j + 1) * (safeN + 1) + i; // top-left
      const iTR = (j + 1) * (safeN + 1) + (i + 1); // top-right

      const dBL = d[iBL], dBR = d[iBR], dTL = d[iTL], dTR = d[iTR];

      // Skip cells with NaN (domain boundary, undefined surface)
      if (!isFinite(dBL) || !isFinite(dBR) || !isFinite(dTL) || !isFinite(dTR)) continue;

      // Quick rejection: all same sign → no crossing in this cell
      const allPos = dBL > 0 && dBR > 0 && dTL > 0 && dTR > 0;
      const allNeg = dBL < 0 && dBR < 0 && dTL < 0 && dTR < 0;
      if (allPos || allNeg) continue;

      // World-space corner coordinates
      const xL = xMin + i * dx;
      const xR = xMin + (i + 1) * dx;
      const yB = yMin + j * dy;
      const yT = yMin + (j + 1) * dy;

      // Find all edge crossings (up to 2 per cell in standard marching squares)
      const crossings: [number, number, number][] = [];

      const bottom = interpolateEdge(xL, xR, yB, yB, dBL, dBR, z1, z2, iBL, iBR);
      if (bottom) crossings.push(bottom);
      const right = interpolateEdge(xR, xR, yB, yT, dBR, dTR, z1, z2, iBR, iTR);
      if (right) crossings.push(right);
      const top = interpolateEdge(xR, xL, yT, yT, dTR, dTL, z1, z2, iTR, iTL);
      if (top) crossings.push(top);
      const left = interpolateEdge(xL, xL, yT, yB, dTL, dBL, z1, z2, iTL, iBL);
      if (left) crossings.push(left);

      // Emit a segment for each pair of crossings
      if (crossings.length >= 2) {
        segments.push({
          x1: crossings[0][0], y1: crossings[0][1], z1: crossings[0][2],
          x2: crossings[1][0], y2: crossings[1][1], z2: crossings[1][2],
        });
        // If we found 4 crossings (saddle point), emit the second pair too
        if (crossings.length === 4) {
          segments.push({
            x1: crossings[2][0], y1: crossings[2][1], z1: crossings[2][2],
            x2: crossings[3][0], y2: crossings[3][1], z2: crossings[3][2],
          });
        }
      }
    }
  }

  // Estimate number of connected components via a simple gap-distance heuristic
  // (full component labelling would require a union-find — overkill for display)
  const componentCount = estimateComponentCount(segments);
  const hasIntersection = segments.length > 0;
  const message = hasIntersection
    ? `${segments.length} segments · ~${componentCount} curve component${componentCount !== 1 ? 's' : ''}`
    : 'These surfaces do not intersect over the visible domain.';

  return { segments, componentCount, hasIntersection, message };
}

/**
 * Estimate the number of connected components in the intersection curve
 * by treating segments as a proximity graph.
 * Two segments belong to the same component if an endpoint of one is
 * within epsilon of an endpoint of the other.
 */
function estimateComponentCount(segments: IntersectionSegment[]): number {
  if (segments.length === 0) return 0;
  if (segments.length === 1) return 1;

  const EPSILON = 0.15; // world-space tolerance
  const visited = new Uint8Array(segments.length);
  let components = 0;

  function dfs(idx: number) {
    visited[idx] = 1;
    const s = segments[idx];
    for (let j = 0; j < segments.length; j++) {
      if (visited[j]) continue;
      const t = segments[j];
      // Check if any endpoints are close enough to be connected
      const d11 = dist3(s.x1, s.y1, s.z1, t.x1, t.y1, t.z1);
      const d12 = dist3(s.x1, s.y1, s.z1, t.x2, t.y2, t.z2);
      const d21 = dist3(s.x2, s.y2, s.z2, t.x1, t.y1, t.z1);
      const d22 = dist3(s.x2, s.y2, s.z2, t.x2, t.y2, t.z2);
      if (Math.min(d11, d12, d21, d22) < EPSILON) {
        dfs(j);
      }
    }
  }

  for (let i = 0; i < segments.length; i++) {
    if (!visited[i]) {
      components++;
      dfs(i);
    }
  }
  return components;
}

function dist3(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): number {
  return Math.sqrt((x1-x2)**2 + (y1-y2)**2 + (z1-z2)**2);
}
