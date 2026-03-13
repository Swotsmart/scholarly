/**
 * MathCanvas Surface Evaluator — Priority 1 Extension
 *
 * This file EXTENDS (not replaces) the base mathcanvas-evaluator.ts.
 * It adds:
 *   1. computeZRange() — exported utility used by both single and dual renderers
 *   2. buildVertexColoursExt() — adds the '3d_cool' scheme for surface 2
 *   3. Re-exports everything from the base evaluator for convenience
 *
 * The '3d_cool' scheme gives surface 2 a distinct violet-to-magenta palette,
 * ensuring students can visually distinguish the two surfaces even when they
 * overlap. Think of it like two different highlighters on the same textbook page.
 *
 * If the base evaluator already exports computeZRange, this module simply
 * re-exports it. The dual renderer imports from this extension module.
 */

import type { SurfaceDescriptor, EvaluatedSurface } from '@/types/mathcanvas';

// Re-export everything from the base evaluator
export { evaluateSurface, computeZRange } from '@/lib/mathcanvas-evaluator';

// =============================================================================
// COOL COLOUR SCHEME — for surface 2 in dual mode
// =============================================================================

/**
 * Cool gradient: deep violet (low z) → indigo → violet → pink → hot pink (high z)
 * Designed to contrast visually with the heat scheme (blue→red) used for surface 1.
 *
 * The mnemonic: surface 1 = warm fire, surface 2 = cool aurora.
 * Where they intersect, the glowing amber curve is unmistakable.
 */
export function coolColour(t: number): [number, number, number] {
  // 0 → deep violet (#4c1d95), 0.5 → violet (#7c3aed), 1 → hot pink (#ec4899)
  if (t < 0.5) {
    const s = t / 0.5;
    return [0.298 + s * 0.19, 0.114 + s * 0.116, 0.584 + s * 0.044];
  } else {
    const s = (t - 0.5) / 0.5;
    return [0.488 + s * 0.437, 0.230 - s * 0.078, 0.628 - s * 0.240];
  }
}

/**
 * Build vertex colour Float32Array for a surface mesh.
 * Supports all 5 schemes including the new '3d_cool'.
 */
export function buildVertexColoursExt(
  vertices: Float32Array,
  scheme: '3d_heat' | '3d_depth' | '3d_cool' | '3d_solid' | '3d_normal',
  zMin: number,
  zMax: number,
): Float32Array {
  const count = vertices.length / 3;
  const colours = new Float32Array(count * 3);
  const range = zMax - zMin || 1;

  for (let i = 0; i < count; i++) {
    const y = vertices[i * 3 + 1]; // Three.js y = mathematical z
    const t = Math.max(0, Math.min(1, (y - zMin) / range));

    let r: number, g: number, b: number;
    switch (scheme) {
      case '3d_heat':
        [r, g, b] = heatColour(t);
        break;
      case '3d_depth':
        [r, g, b] = depthColour(t);
        break;
      case '3d_cool':
        [r, g, b] = coolColour(t);
        break;
      case '3d_solid':
        r = 0.118; g = 0.616; b = 0.945; // #1e9df1
        break;
      default:
        [r, g, b] = heatColour(t);
    }

    colours[i * 3]     = r;
    colours[i * 3 + 1] = g;
    colours[i * 3 + 2] = b;
  }
  return colours;
}

// =============================================================================
// COLOUR HELPERS (duplicated here to avoid circular import with base evaluator)
// =============================================================================

function heatColour(t: number): [number, number, number] {
  if (t < 0.25) {
    const s = t / 0.25;
    return [0, s, 1];
  } else if (t < 0.5) {
    const s = (t - 0.25) / 0.25;
    return [0, 1, 1 - s];
  } else if (t < 0.75) {
    const s = (t - 0.5) / 0.25;
    return [s, 1, 0];
  } else {
    const s = (t - 0.75) / 0.25;
    return [1, 1 - s, 0];
  }
}

function depthColour(t: number): [number, number, number] {
  const r = 0.118 + t * 0.882;
  const g = 0.612 + t * 0.388;
  const b = 0.945;
  return [r, g, b];
}
