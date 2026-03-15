/**
 * probability-engine.ts — In-browser CDF/PDF computation for MathCanvas
 * Probability Calculator mode.
 *
 * All eight DistributionFamily values are implemented here using pure
 * TypeScript — no external library, no eval(), no AI round-trip.
 *
 * Architecture analogy: this is the engine room of the probability
 * calculator. The AI (Claude) is the navigator — it reads the natural-
 * language intent and plots the course (distribution + parameters + query).
 * This module is the engine that actually drives the ship: once the course
 * is set, it computes exact values at full speed without consulting the
 * navigator again.
 *
 * Exported surface:
 *   pdf(dist, params, x)     → f(x)
 *   cdf(dist, params, x)     → P(X ≤ x)
 *   quantile(dist, params, p)→ x such that P(X ≤ x) = p  (approx via bisection)
 *   computeResult(setup, bound) → ProbabilityCDFResult
 *   curvePoints(dist, params) → Array<[x, y]> for SVG rendering (200 pts)
 *   discretePoints(dist, params) → Array<[k, p]> for bar charts
 *   distributionDomain(dist, params) → { xMin, xMax, yMax }
 */

import type {
  DistributionFamily,
  ProbabilityBound,
  ProbabilitySetup,
  ProbabilityCDFResult,
  ProbabilityTailMode,
} from '@/types/mathcanvas-extensions';

// ── Mathematical helpers ─────────────────────────────────────────────────────

/** ln(Γ(x)) via Lanczos approximation — accurate to ~15 significant figures */
function lnGamma(x: number): number {
  if (x <= 0) return Infinity;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function gamma(x: number): number { return Math.exp(lnGamma(x)); }

/**
 * Regularised incomplete gamma function P(a, x) via series expansion.
 * Used for chi-squared, gamma, and Poisson CDFs.
 */
function incGammaP(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;
  if (x < a + 1) {
    // Series representation
    let ap = a, del = 1 / a, sum = del;
    for (let n = 0; n < 200; n++) {
      ap++; del *= x / ap; sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  // Continued fraction (complement)
  return 1 - incGammaQ(a, x);
}

function incGammaQ(a: number, x: number): number {
  let b = x + 1 - a, c = 1e300, d = 1 / b, h = d;
  for (let i = 1; i <= 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;  if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    if (Math.abs(d * c - 1) < 1e-14) break;
  }
  return h * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/**
 * Regularised incomplete beta function I_x(a,b) via continued fraction.
 * Used for binomial and Student-t CDFs.
 */
function incBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const lbeta = lnGamma(a) + lnGamma(b) - lnGamma(a + b);
  const bt = Math.exp(Math.log(x) * a + Math.log(1 - x) * b - lbeta);
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  }
  return 1 - bt * betaCF(1 - x, b, a) / b;
}

function betaCF(x: number, a: number, b: number): number {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}

/** Standard normal CDF Φ(x) via erf approximation */
function normalCDF(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1=0.254829592, a2=-0.284496736, a3=1.421413741, a4=-1.453152027, a5=1.061405429, p=0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

/** Standard normal PDF φ(x) */
function normalPDF(x: number): number {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

// ── PDF implementations ──────────────────────────────────────────────────────

export function pdf(dist: DistributionFamily, params: Record<string, number>, x: number): number {
  switch (dist) {
    case 'normal': {
      const mu = params.mu ?? 0, sigma = params.sigma ?? 1;
      return normalPDF((x - mu) / sigma) / sigma;
    }
    case 'binomial': {
      const n = Math.round(params.n ?? 10), p = params.p ?? 0.5;
      const k = Math.round(x);
      if (k < 0 || k > n || !Number.isInteger(x)) return 0;
      return Math.exp(lnBinom(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
    }
    case 'poisson': {
      const lambda = params.lambda ?? 3;
      const k = Math.round(x);
      if (k < 0 || !Number.isInteger(x)) return 0;
      return Math.exp(k * Math.log(lambda) - lambda - lnFactorial(k));
    }
    case 'uniform': {
      const a = params.a ?? 0, b = params.b ?? 1;
      return x >= a && x <= b ? 1 / (b - a) : 0;
    }
    case 't': {
      const nu = params.nu ?? 5;
      const coeff = Math.exp(lnGamma((nu + 1) / 2) - 0.5 * Math.log(nu * Math.PI) - lnGamma(nu / 2));
      return coeff * Math.pow(1 + x * x / nu, -(nu + 1) / 2);
    }
    case 'chi_squared': {
      const k = params.k ?? 3;
      if (x <= 0) return 0;
      return Math.exp((k / 2 - 1) * Math.log(x) - x / 2 - (k / 2) * Math.log(2) - lnGamma(k / 2));
    }
    case 'exponential': {
      const lambda = params.lambda ?? 1;
      return x >= 0 ? lambda * Math.exp(-lambda * x) : 0;
    }
    case 'geometric': {
      const p = params.p ?? 0.5;
      const k = Math.round(x);
      if (k < 1 || !Number.isInteger(x)) return 0;
      return p * Math.pow(1 - p, k - 1);
    }
    default: return 0;
  }
}

// ── CDF implementations ──────────────────────────────────────────────────────

export function cdf(dist: DistributionFamily, params: Record<string, number>, x: number): number {
  switch (dist) {
    case 'normal': {
      const mu = params.mu ?? 0, sigma = params.sigma ?? 1;
      return normalCDF((x - mu) / sigma);
    }
    case 'binomial': {
      const n = Math.round(params.n ?? 10), p = params.p ?? 0.5;
      const k = Math.floor(x);
      if (k < 0) return 0;
      if (k >= n) return 1;
      // Regularised incomplete beta: I_{1-p}(n-k, k+1)
      return incBeta(1 - p, n - k, k + 1);
    }
    case 'poisson': {
      const lambda = params.lambda ?? 3;
      const k = Math.floor(x);
      if (k < 0) return 0;
      // Q(k+1, lambda) = 1 - I_lambda(k+1) = upper incomplete gamma
      return incGammaQ(k + 1, lambda);
    }
    case 'uniform': {
      const a = params.a ?? 0, b = params.b ?? 1;
      if (x < a) return 0;
      if (x > b) return 1;
      return (x - a) / (b - a);
    }
    case 't': {
      const nu = params.nu ?? 5;
      const ibx = incBeta(nu / (nu + x * x), nu / 2, 0.5);
      return x >= 0 ? 1 - 0.5 * ibx : 0.5 * ibx;
    }
    case 'chi_squared': {
      const k = params.k ?? 3;
      if (x <= 0) return 0;
      return incGammaP(k / 2, x / 2);
    }
    case 'exponential': {
      const lambda = params.lambda ?? 1;
      return x <= 0 ? 0 : 1 - Math.exp(-lambda * x);
    }
    case 'geometric': {
      const p = params.p ?? 0.5;
      const k = Math.floor(x);
      if (k < 1) return 0;
      return 1 - Math.pow(1 - p, k);
    }
    default: return 0;
  }
}

// ── Quantile (inverse CDF) via bisection ─────────────────────────────────────

export function quantile(
  dist: DistributionFamily,
  params: Record<string, number>,
  p: number
): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const dom = distributionDomain(dist, params);
  let lo = dom.xMin, hi = dom.xMax;
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (cdf(dist, params, mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

// ── Domain helpers ────────────────────────────────────────────────────────────

export function distributionDomain(
  dist: DistributionFamily,
  params: Record<string, number>
): { xMin: number; xMax: number; yMax: number; isDiscrete: boolean } {
  switch (dist) {
    case 'normal': {
      const mu = params.mu ?? 0, sigma = params.sigma ?? 1;
      return { xMin: mu - 4 * sigma, xMax: mu + 4 * sigma, yMax: normalPDF(0) / sigma * 1.15, isDiscrete: false };
    }
    case 'binomial': {
      const n = Math.round(params.n ?? 10), p = params.p ?? 0.5;
      const mu = n * p, sigma = Math.sqrt(n * p * (1 - p));
      const pMax = pdf('binomial', params, Math.round(mu));
      return { xMin: -0.5, xMax: n + 0.5, yMax: pMax * 1.2, isDiscrete: true };
    }
    case 'poisson': {
      const lambda = params.lambda ?? 3;
      const xMax = Math.max(20, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
      const mode = Math.floor(lambda);
      return { xMin: -0.5, xMax: xMax + 0.5, yMax: pdf('poisson', params, mode) * 1.2, isDiscrete: true };
    }
    case 'uniform': {
      const a = params.a ?? 0, b = params.b ?? 1;
      const h = 1 / (b - a);
      return { xMin: a - (b - a) * 0.2, xMax: b + (b - a) * 0.2, yMax: h * 1.3, isDiscrete: false };
    }
    case 't': {
      const nu = params.nu ?? 5;
      return { xMin: -5, xMax: 5, yMax: pdf('t', { nu }, 0) * 1.15, isDiscrete: false };
    }
    case 'chi_squared': {
      const k = params.k ?? 3;
      const xMax = Math.max(15, k + 4 * Math.sqrt(2 * k));
      const mode = k >= 2 ? k - 2 : 0;
      return { xMin: 0, xMax, yMax: (pdf('chi_squared', params, mode) || 0.5) * 1.2, isDiscrete: false };
    }
    case 'exponential': {
      const lambda = params.lambda ?? 1;
      return { xMin: 0, xMax: 5 / lambda, yMax: lambda * 1.15, isDiscrete: false };
    }
    case 'geometric': {
      const p = params.p ?? 0.5;
      const xMax = Math.ceil(Math.log(0.001) / Math.log(1 - p));
      return { xMin: 0.5, xMax: xMax + 0.5, yMax: p * 1.2, isDiscrete: true };
    }
    default: return { xMin: -5, xMax: 5, yMax: 1, isDiscrete: false };
  }
}

// ── Curve / bar data for SVG rendering ───────────────────────────────────────

/** 200 (x, y) pairs for continuous distributions — SVG path data */
export function curvePoints(
  dist: DistributionFamily,
  params: Record<string, number>,
  nPoints = 200
): Array<[number, number]> {
  const { xMin, xMax } = distributionDomain(dist, params);
  const pts: Array<[number, number]> = [];
  for (let i = 0; i <= nPoints; i++) {
    const x = xMin + (xMax - xMin) * (i / nPoints);
    pts.push([x, pdf(dist, params, x)]);
  }
  return pts;
}

/** Integer (k, p) pairs for discrete distributions — bar chart data */
export function discretePoints(
  dist: DistributionFamily,
  params: Record<string, number>
): Array<[number, number]> {
  const { xMin, xMax } = distributionDomain(dist, params);
  const pts: Array<[number, number]> = [];
  for (let k = Math.ceil(xMin); k <= Math.floor(xMax); k++) {
    pts.push([k, pdf(dist, params, k)]);
  }
  return pts;
}

// ── Main computation: ProbabilitySetup + bound → ProbabilityCDFResult ────────

export function computeResult(
  setup: ProbabilitySetup,
  liveBound: { lower: number | null; upper: number | null }
): import('@/types/mathcanvas-extensions').ProbabilityCDFResult {
  const { distribution: dist, parameters: params } = setup;
  const bound = { lower: liveBound.lower, upper: liveBound.upper };
  const dom = distributionDomain(dist, params);
  // SVG canvas is 680 wide, drawn domain is xMin..xMax mapped to 40..640
  const svgX = (x: number) => 40 + ((x - dom.xMin) / (dom.xMax - dom.xMin)) * 600;

  let probability = 0, lowerCDF: number | null = null, upperCDF: number | null = null;
  let tailMode: ProbabilityTailMode = 'none';
  let shadedFrom = 40, shadedTo = 640;

  const lo = bound.lower, hi = bound.upper;

  if (lo === null && hi !== null) {
    // Left tail: P(X ≤ hi)
    tailMode = 'left';
    probability = cdf(dist, params, hi);
    upperCDF = probability;
    shadedFrom = 40;
    shadedTo = Math.min(640, Math.max(40, svgX(hi)));
  } else if (lo !== null && hi === null) {
    // Right tail: P(X > lo)
    tailMode = 'right';
    lowerCDF = cdf(dist, params, lo);
    probability = 1 - lowerCDF;
    shadedFrom = Math.min(640, Math.max(40, svgX(lo)));
    shadedTo = 640;
  } else if (lo !== null && hi !== null) {
    if (Math.abs(lo - hi) < 1e-10) {
      // Point probability: P(X = k) for discrete, or ≈ 0 for continuous
      tailMode = 'point';
      probability = pdf(dist, params, lo);
      lowerCDF = cdf(dist, params, lo - 1);
      upperCDF = cdf(dist, params, lo);
      shadedFrom = Math.max(40, svgX(lo) - 8);
      shadedTo   = Math.min(640, svgX(lo) + 8);
    } else {
      // Interval: P(lo ≤ X ≤ hi)
      tailMode = 'interval';
      lowerCDF = cdf(dist, params, lo);
      upperCDF = cdf(dist, params, hi);
      probability = Math.max(0, upperCDF - lowerCDF);
      shadedFrom = Math.min(640, Math.max(40, svgX(lo)));
      shadedTo   = Math.min(640, Math.max(40, svgX(hi)));
    }
  }

  return {
    probability: Math.max(0, Math.min(1, probability)),
    complement: Math.max(0, Math.min(1, 1 - probability)),
    lowerCDF,
    upperCDF,
    tailMode,
    shadedFrom,
    shadedTo,
  };
}

// ── Helper utilities ──────────────────────────────────────────────────────────

function lnFactorial(n: number): number {
  return lnGamma(n + 1);
}

function lnBinom(n: number, k: number): number {
  return lnFactorial(n) - lnFactorial(k) - lnFactorial(n - k);
}

/** Human-readable parameter labels for each distribution */
export const DISTRIBUTION_PARAM_SCHEMA: Record<
  DistributionFamily,
  Array<{ name: string; label: string; min: number; max: number; step: number; default: number }>
> = {
  normal:      [{ name: 'mu', label: 'Mean μ', min: -10, max: 10, step: 0.5, default: 0 }, { name: 'sigma', label: 'Std Dev σ', min: 0.1, max: 4, step: 0.1, default: 1 }],
  binomial:    [{ name: 'n', label: 'Trials n', min: 1, max: 50, step: 1, default: 10 }, { name: 'p', label: 'Probability p', min: 0.01, max: 0.99, step: 0.01, default: 0.5 }],
  poisson:     [{ name: 'lambda', label: 'Rate λ', min: 0.1, max: 15, step: 0.1, default: 3 }],
  uniform:     [{ name: 'a', label: 'Lower a', min: -10, max: 0, step: 0.5, default: 0 }, { name: 'b', label: 'Upper b', min: 0, max: 10, step: 0.5, default: 1 }],
  t:           [{ name: 'nu', label: 'Degrees ν', min: 1, max: 30, step: 1, default: 5 }],
  chi_squared: [{ name: 'k', label: 'Degrees k', min: 1, max: 20, step: 1, default: 3 }],
  exponential: [{ name: 'lambda', label: 'Rate λ', min: 0.1, max: 5, step: 0.1, default: 1 }],
  geometric:   [{ name: 'p', label: 'Probability p', min: 0.01, max: 0.99, step: 0.01, default: 0.5 }],
};

export const DISTRIBUTION_DISPLAY_NAMES: Record<DistributionFamily, string> = {
  normal:      'Normal',
  binomial:    'Binomial',
  poisson:     'Poisson',
  uniform:     'Uniform',
  t:           "Student's t",
  chi_squared: 'Chi-Squared χ²',
  exponential: 'Exponential',
  geometric:   'Geometric',
};

export const CONTINUOUS_DISTRIBUTIONS: DistributionFamily[] = ['normal', 't', 'chi_squared', 'uniform', 'exponential'];
export const DISCRETE_DISTRIBUTIONS: DistributionFamily[] = ['binomial', 'poisson', 'geometric'];

export function isDiscrete(dist: DistributionFamily): boolean {
  return DISCRETE_DISTRIBUTIONS.includes(dist);
}
