/**
 * MathCanvas Surface Evaluator
 *
 * Pure TypeScript lookup table: SurfaceDescriptor → sampled Float32Array vertices.
 * No eval(), no dynamic code execution. Every surface type is a pre-written function.
 * Claude returns a descriptor; this module resolves it to geometry.
 *
 * Architecture note: this runs on the client inside the Three.js render cycle.
 * It is intentionally stateless and side-effect-free so it can be called
 * on every parameter slider tick (debounced at 120ms in the hook).
 */

import type {
  SurfaceDescriptor,
  SurfaceExplicit,
  SurfaceParametric,
  SurfaceRevolution,
  EvaluatedSurface,
} from '@/types/mathcanvas';

// =============================================================================
// EXPLICIT SURFACE EVALUATORS  z = f(x, y)
// =============================================================================

type ExplicitFn = (x: number, y: number, c: Record<string, number>) => number;

const EXPLICIT_EVALUATORS: Record<string, ExplicitFn> = {
  paraboloid:             (x, y, c) => (c.A ?? 1) * (x * x + y * y),
  elliptic_paraboloid:    (x, y, c) => (c.A ?? 1) * x * x + (c.B ?? 1) * y * y,
  hyperbolic_paraboloid:  (x, y, c) => (c.A ?? 1) * x * x - (c.B ?? 1) * y * y,
  cone:                   (x, y, c) => (c.A ?? 1) * Math.sqrt(x * x + y * y),
  plane:                  (x, y, c) => (c.A ?? 1) * x + (c.B ?? 0) * y + (c.C ?? 0),
  sphere_upper:           (x, y, c) => {
    const r2 = (c.R ?? 3) ** 2 - x * x - y * y;
    return r2 >= 0 ? Math.sqrt(r2) : NaN;
  },
  sphere_lower:           (x, y, c) => {
    const r2 = (c.R ?? 3) ** 2 - x * x - y * y;
    return r2 >= 0 ? -Math.sqrt(r2) : NaN;
  },
  gaussian:               (x, y, c) => {
    const sigma = c.sigma ?? 1;
    return (c.A ?? 3) * Math.exp(-(x * x + y * y) / (2 * sigma * sigma));
  },
  ripple:                 (x, y, c) => {
    const r = Math.sqrt(x * x + y * y);
    return (c.A ?? 1) * Math.sin((c.k ?? 2) * r);
  },
  wave_product:           (x, y, c) =>
    (c.A ?? 1) * Math.sin((c.kx ?? 1) * x) * Math.cos((c.ky ?? 1) * y),
  wave_sum:               (x, y, c) =>
    (c.A ?? 1) * Math.sin((c.kx ?? 1) * x) + (c.B ?? 1) * Math.cos((c.ky ?? 1) * y),
  polynomial_2:           (x, y, c) =>
    (c.A ?? 1) * x * x + (c.B ?? 0) * x * y + (c.C ?? 1) * y * y,
  exponential_decay:      (x, y, c) =>
    (c.A ?? 3) * Math.exp(-(c.k ?? 0.5) * (x * x + y * y)),
  monkey_saddle:          (x, y, _c) => x * x * x - 3 * x * y * y,
  absolute_value:         (x, y, c) => (c.A ?? 1) * Math.abs(x) + (c.B ?? 1) * Math.abs(y),
};

function evaluateExplicit(desc: SurfaceExplicit): EvaluatedSurface {
  const fn = EXPLICIT_EVALUATORS[desc.kind];
  if (!fn) return { vertices: new Float32Array(0), resolution: 0, uRange: [0, 1], vRange: [0, 1], valid: false, error: `Unknown explicit kind: ${desc.kind}` };

  const N = (desc.resolution ?? 60);
  const { xMin, xMax, yMin, yMax } = desc.domain;
  const c = desc.coefficients;
  const verts = new Float32Array((N + 1) * (N + 1) * 3);

  let idx = 0;
  for (let j = 0; j <= N; j++) {
    const y = yMin + (yMax - yMin) * (j / N);
    for (let i = 0; i <= N; i++) {
      const x = xMin + (xMax - xMin) * (i / N);
      const z = fn(x, y, c);
      verts[idx++] = x;
      verts[idx++] = isFinite(z) ? z : 0;
      verts[idx++] = y;  // Three.js: y is up, so swap y↔z
    }
  }
  return { vertices: verts, resolution: N, uRange: [xMin, xMax], vRange: [yMin, yMax], valid: true };
}

// =============================================================================
// PARAMETRIC SURFACE EVALUATORS  (x,y,z) = f(u,v)
// =============================================================================

type ParametricFn = (u: number, v: number, c: Record<string, number>) => [number, number, number];

const PARAMETRIC_EVALUATORS: Record<string, ParametricFn> = {
  sphere: (u, v, c) => {
    const R = c.R ?? 3;
    return [R * Math.sin(v) * Math.cos(u), R * Math.cos(v), R * Math.sin(v) * Math.sin(u)];
  },
  torus: (u, v, c) => {
    const R = c.R ?? 3, r = c.r ?? 1;
    return [
      (R + r * Math.cos(v)) * Math.cos(u),
      r * Math.sin(v),
      (R + r * Math.cos(v)) * Math.sin(u),
    ];
  },
  cylinder: (u, v, c) => {
    const R = c.R ?? 2;
    return [R * Math.cos(u), v, R * Math.sin(u)];
  },
  helicoid: (u, v, c) => {
    const k = c.k ?? 0.5;
    return [u * Math.cos(v), k * v, u * Math.sin(v)];
  },
  catenoid: (u, v, c) => {
    const k = c.k ?? 1;
    return [k * Math.cosh(v / k) * Math.cos(u), v, k * Math.cosh(v / k) * Math.sin(u)];
  },
  mobius: (u, v, _c) => {
    const half = v / 2;
    return [
      (1 + half * Math.cos(u / 2)) * Math.cos(u),
      half * Math.sin(u / 2),
      (1 + half * Math.cos(u / 2)) * Math.sin(u),
    ];
  },
  klein_bottle: (u, v, c) => {
    const a = c.a ?? 2.5;
    if (u < Math.PI) {
      return [
        a * (1 - Math.cos(u) / 2) * Math.cos(u) * Math.cos(v),
        a * (1 - Math.cos(u) / 2) * Math.cos(u) * Math.sin(v),
        -a * Math.sin(u),
      ];
    } else {
      return [
        a * (Math.cos(u) - 0.5) * Math.cos(v),
        a * Math.sin(u),
        a * (Math.cos(u) - 0.5) * Math.sin(v),
      ];
    }
  },
  ellipsoid: (u, v, c) => {
    const a = c.a ?? 3, b = c.b ?? 2, cc = c.c ?? 1.5;
    return [a * Math.sin(v) * Math.cos(u), b * Math.cos(v), cc * Math.sin(v) * Math.sin(u)];
  },
  hyperboloid_1: (u, v, c) => {
    const a = c.a ?? 1.5, b = c.b ?? 1.5, k = c.k ?? 1;
    return [a * Math.cosh(v) * Math.cos(u), k * Math.sinh(v), b * Math.cosh(v) * Math.sin(u)];
  },
  hyperboloid_2: (u, v, c) => {
    const a = c.a ?? 1.5, b = c.b ?? 1.5, k = c.k ?? 1;
    return [a * Math.sinh(v) * Math.cos(u), k * Math.cosh(v), b * Math.sinh(v) * Math.sin(u)];
  },
  seashell: (u, v, c) => {
    const k = c.k ?? 0.2;
    const eu = Math.exp(k * u);
    return [
      eu * Math.cos(u) * (1 + Math.cos(v)),
      eu * Math.sin(u) * (1 + Math.cos(v)),
      eu * Math.sin(v),
    ];
  },
  trefoil_knot: (u, v, _c) => {
    const tu = u;
    const cx = Math.sin(tu) + 2 * Math.sin(2 * tu);
    const cy = Math.cos(tu) - 2 * Math.cos(2 * tu);
    const cz = -Math.sin(3 * tu);
    // Tube around the knot
    const r = 0.3;
    return [cx + r * Math.cos(v), cy + r * Math.cos(v), cz + r * Math.sin(v)];
  },
};

function evaluateParametric(desc: SurfaceParametric): EvaluatedSurface {
  const fn = PARAMETRIC_EVALUATORS[desc.kind];
  if (!fn) return { vertices: new Float32Array(0), resolution: 0, uRange: [0, 1], vRange: [0, 1], valid: false, error: `Unknown parametric kind: ${desc.kind}` };

  const N = (desc.resolution ?? 60);
  const [uMin, uMax] = desc.uRange;
  const [vMin, vMax] = desc.vRange;
  const c = desc.coefficients;
  const verts = new Float32Array((N + 1) * (N + 1) * 3);

  let idx = 0;
  for (let j = 0; j <= N; j++) {
    const v = vMin + (vMax - vMin) * (j / N);
    for (let i = 0; i <= N; i++) {
      const u = uMin + (uMax - uMin) * (i / N);
      const [x, y, z] = fn(u, v, c);
      verts[idx++] = isFinite(x) ? x : 0;
      verts[idx++] = isFinite(y) ? y : 0;
      verts[idx++] = isFinite(z) ? z : 0;
    }
  }
  return { vertices: verts, resolution: N, uRange: [uMin, uMax], vRange: [vMin, vMax], valid: true };
}

// =============================================================================
// REVOLUTION SURFACE EVALUATORS
// =============================================================================

type ProfileFn = (x: number, c: Record<string, number>) => number;

const REVOLUTION_PROFILES: Record<string, ProfileFn> = {
  linear:      (x, c) => (c.m ?? 1) * x + (c.b ?? 0),
  quadratic:   (x, c) => (c.a ?? 1) * x * x + (c.b ?? 0) * x + (c.cc ?? 0),
  sine:        (x, c) => Math.max(0, (c.A ?? 1) * Math.sin((c.k ?? 1) * x)),
  exponential: (x, c) => (c.A ?? 1) * Math.exp((c.s ?? 0.5) * x),
  sqrt:        (x, c) => x >= 0 ? (c.A ?? 1) * Math.sqrt(x) : 0,
  reciprocal:  (x, c) => x !== 0 ? (c.A ?? 1) / Math.abs(x) : 4,
};

function evaluateRevolution(desc: SurfaceRevolution): EvaluatedSurface {
  const profile = REVOLUTION_PROFILES[desc.profile];
  if (!profile) return { vertices: new Float32Array(0), resolution: 0, uRange: [0, 1], vRange: [0, 1], valid: false, error: `Unknown profile: ${desc.profile}` };

  const N = (desc.resolution ?? 60);
  const [xMin, xMax] = desc.xRange;
  const c = desc.coefficients;
  const verts = new Float32Array((N + 1) * (N + 1) * 3);

  let idx = 0;
  for (let j = 0; j <= N; j++) {
    const theta = (2 * Math.PI * j) / N;
    for (let i = 0; i <= N; i++) {
      const x = xMin + (xMax - xMin) * (i / N);
      const r = Math.max(0, profile(x, c));
      // Rotate around z-axis (axis='z'), x-axis (axis='x'), or y-axis
      if (desc.axis === 'x') {
        verts[idx++] = x;
        verts[idx++] = r * Math.cos(theta);
        verts[idx++] = r * Math.sin(theta);
      } else if (desc.axis === 'y') {
        verts[idx++] = r * Math.cos(theta);
        verts[idx++] = x;
        verts[idx++] = r * Math.sin(theta);
      } else {
        // z-axis (default)
        verts[idx++] = r * Math.cos(theta);
        verts[idx++] = x;
        verts[idx++] = r * Math.sin(theta);
      }
    }
  }
  return { vertices: verts, resolution: N, uRange: [0, 2 * Math.PI], vRange: [xMin, xMax], valid: true };
}

// =============================================================================
// PUBLIC ENTRY POINT
// =============================================================================

export function evaluateSurface(
  desc: SurfaceDescriptor,
  paramOverrides?: Record<string, number>
): EvaluatedSurface {
  // Apply parameter overrides (from sliders) on top of base coefficients
  const overridden: SurfaceDescriptor = {
    ...desc,
    coefficients: { ...desc.coefficients, ...(paramOverrides ?? {}) },
  } as SurfaceDescriptor;

  switch (overridden.type) {
    case 'explicit':    return evaluateExplicit(overridden as SurfaceExplicit);
    case 'parametric':  return evaluateParametric(overridden as SurfaceParametric);
    case 'revolution':  return evaluateRevolution(overridden as SurfaceRevolution);
    default:
      return { vertices: new Float32Array(0), resolution: 0, uRange: [0, 1], vRange: [0, 1], valid: false, error: 'Unknown surface type' };
  }
}

/** Compute z-range of a vertex array for colour gradient normalisation */
export function computeZRange(vertices: Float32Array): [number, number] {
  let zMin = Infinity, zMax = -Infinity;
  for (let i = 1; i < vertices.length; i += 3) {
    const y = vertices[i]; // Three.js y = mathematical z
    if (isFinite(y)) { zMin = Math.min(zMin, y); zMax = Math.max(zMax, y); }
  }
  return [isFinite(zMin) ? zMin : 0, isFinite(zMax) ? zMax : 1];
}
