'use client';

/**
 * MathCanvasTablePanel — Table of Values Right Panel
 *
 * Renders a scrollable table of (x, f(x)) or (k, P(X=k)) values for the
 * current canvas visualisation. Appears as a right-panel tab alongside
 * Parameters in graphing, stats, and probability modes.
 *
 * Three data-source strategies, chosen by mode:
 *
 *   GRAPHING — math.js evaluates the AI's returned `mathExpression` string
 *   client-side at each x in the configured range, substituting current
 *   `paramValues`. No API call. Falls back gracefully if expression is absent.
 *
 *   PROBABILITY — `discretePoints()` or `curvePoints()` from probability-engine.ts,
 *   driven by `probabilityState.liveParams`. Instant, no math.js needed.
 *
 *   STATS — same engine, driven by `resultStats.parameters` defaults.
 *
 * The analogy: if the canvas is a map showing the shape of a landscape, the
 * Table of Values is the surveyor's field notebook — exact readings at specific
 * stations, precise where the map is impressionistic.
 *
 * User controls:
 *   - x-range: min / max / step inputs (graphing mode)
 *   - number of values: 5 / 10 / 20 (probability mode)
 *   - copy to clipboard as CSV
 *   - highlight row where f(x) = 0 (crossing detection for graphing)
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import type { MathCanvas2DResponse } from '@/types/mathcanvas';
import type { MathCanvasStatsResponse, ProbabilityState, DistributionFamily } from '@/types/mathcanvas-extensions';
import {
  curvePoints,
  discretePoints,
  distributionDomain,
  isDiscrete,
  DISTRIBUTION_PARAM_SCHEMA,
} from '@/lib/probability-engine';

// ── Design tokens — matches MathCanvasPage T palette ─────────────────────────
const T = {
  bg: 'var(--background, #f7f8f8)',
  sf: 'var(--card, #ffffff)',
  bd: 'var(--border, #e1eaef)',
  bl: '#1e9df1', blLt: '#e3f3fd', blMid: '#b8ddf8',
  em: '#10b981', emLt: '#ecfdf5',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  rose: '#f43f5e', roseLt: '#fff1f2',
  tx: 'var(--foreground, #0f1419)',
  tx2: 'var(--muted-foreground, #536471)',
  tx3: '#8b99a4',
  fm: "'JetBrains Mono', Menlo, monospace",
  fs: "'Open Sans', system-ui, sans-serif",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface TableRow {
  x: number;
  y: number;
  isZeroCrossing?: boolean;
  isHighlighted?: boolean;
}

interface Props {
  mode: string;
  result2D: MathCanvas2DResponse | null;
  paramValues: Record<string, number>;
  resultStats: MathCanvasStatsResponse | null;
  probabilityState: ProbabilityState;
}

// ── math.js loader (mirrors mathcanvas-cas pattern) ───────────────────────────
type MathJS = { evaluate: (expr: string, scope?: Record<string, number>) => number };
let _mathRef: MathJS | null = null;

async function loadMathJS(): Promise<MathJS | null> {
  if (_mathRef) return _mathRef;
  if (typeof window !== 'undefined' && (window as unknown as { mathjs?: MathJS }).mathjs) {
    _mathRef = (window as unknown as { mathjs: MathJS }).mathjs;
    return _mathRef;
  }
  return new Promise(resolve => {
    const existing = document.getElementById('mathjs-cdn');
    if (existing) {
      existing.addEventListener('load', () => {
        _mathRef = (window as unknown as { mathjs: MathJS }).mathjs ?? null;
        resolve(_mathRef);
      });
      return;
    }
    const script = document.createElement('script');
    script.id = 'mathjs-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/mathjs/12.4.3/math.min.js';
    script.onload = () => {
      _mathRef = (window as unknown as { mathjs: MathJS }).mathjs ?? null;
      resolve(_mathRef);
    };
    script.onerror = () => resolve(null);
    document.head.appendChild(script);
  });
}

// ── Evaluate a math.js expression string over a range ────────────────────────
function evaluateRange(
  expr: string,
  variable: string,
  xMin: number,
  xMax: number,
  step: number,
  params: Record<string, number>,
  math: MathJS
): TableRow[] {
  const rows: TableRow[] = [];
  // Guard against runaway step
  const safestep = Math.max(step, (xMax - xMin) / 200);
  let prevY: number | null = null;

  for (let x = xMin; x <= xMax + 1e-10; x += safestep) {
    const xRounded = parseFloat(x.toFixed(10));
    try {
      const scope = { [variable]: xRounded, ...params, PI: Math.PI, E: Math.E };
      const y = math.evaluate(expr, scope);
      const yNum = typeof y === 'number' && isFinite(y) ? y : NaN;
      const isZeroCrossing = prevY !== null && !isNaN(yNum) &&
        ((prevY < 0 && yNum >= 0) || (prevY >= 0 && yNum < 0));
      rows.push({ x: xRounded, y: yNum, isZeroCrossing });
      if (!isNaN(yNum)) prevY = yNum;
    } catch {
      rows.push({ x: xRounded, y: NaN });
    }
  }
  return rows;
}

// ── Format helpers ────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 4): string {
  if (isNaN(n)) return 'undefined';
  if (!isFinite(n)) return n > 0 ? '+∞' : '−∞';
  if (Math.abs(n) < 1e-10) return '0';
  // Switch to scientific for very large / very small
  if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) {
    return n.toExponential(3);
  }
  return parseFloat(n.toFixed(decimals)).toString();
}

function rowsToCSV(rows: TableRow[], xLabel: string, yLabel: string): string {
  const header = `${xLabel},${yLabel}`;
  const lines = rows.map(r => `${fmt(r.x)},${fmt(r.y)}`);
  return [header, ...lines].join('\n');
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, color: T.tx3,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: 6,
    }}>
      {children}
    </div>
  );
}

function NumInput({
  label, value, onChange, step = 1,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 9, color: T.tx3, marginBottom: 3, fontWeight: 600 }}>{label}</div>
      <input
        type="number"
        value={value}
        step={step}
        onChange={e => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        style={{
          width: '100%', padding: '5px 7px', fontSize: 11,
          fontFamily: T.fm, background: T.bg, color: T.tx,
          border: `1px solid ${T.bd}`, borderRadius: 6, outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MathCanvasTablePanel({
  mode, result2D, paramValues, resultStats, probabilityState,
}: Props) {
  // ── Graphing mode config ──────────────────────────────────────────────────
  const [xMin, setXMin]   = useState(-5);
  const [xMax, setXMax]   = useState(5);
  const [xStep, setXStep] = useState(1);

  // ── Shared state ──────────────────────────────────────────────────────────
  const [rows, setRows]           = useState<TableRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied]       = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const mathRef = useRef<MathJS | null>(null);

  // ── Derive labels and source mode ─────────────────────────────────────────
  const isGraphing     = mode === 'graphing';
  const isProbability  = mode === 'probability';
  const isStats        = mode === 'stats';
  const expr           = result2D?.mathExpression;
  const variable       = result2D?.expressionVariable ?? 'x';
  const hasExpr        = isGraphing && !!expr;

  const dist: DistributionFamily =
    isProbability ? (probabilityState.setup?.distribution ?? 'normal') :
    isStats       ? (resultStats?.distribution ?? 'normal') :
    'normal';

  const liveParams: Record<string, number> =
    isProbability ? probabilityState.liveParams :
    isStats       ? (() => {
      const schema = DISTRIBUTION_PARAM_SCHEMA[dist];
      const p: Record<string, number> = {};
      schema.forEach(s => { p[s.name] = s.default; });
      // Override with AI-returned defaults from resultStats.parameters
      resultStats?.parameters?.forEach(sp => { p[sp.name] = sp.default; });
      return p;
    })() :
    {};

  const discrete = isProbability || isStats ? isDiscrete(dist) : false;

  // ── Compute table data ─────────────────────────────────────────────────────
  const compute = useCallback(async () => {
    setError(null);

    if (isGraphing) {
      if (!hasExpr) { setRows([]); return; }
      setIsLoading(true);
      try {
        let math = mathRef.current;
        if (!math) {
          math = await loadMathJS();
          mathRef.current = math;
        }
        if (!math) { setError('Math engine unavailable'); setIsLoading(false); return; }
        const computed = evaluateRange(expr!, variable, xMin, xMax, xStep, paramValues, math);
        setRows(computed);
      } catch (e) {
        setError('Could not evaluate expression');
        setRows([]);
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // Probability / Stats — in-browser engine, synchronous
    if (isProbability || isStats) {
      if (discrete) {
        const pts = discretePoints(dist, liveParams);
        setRows(pts.map(([k, p]) => ({ x: k, y: p })));
      } else {
        const dom = distributionDomain(dist, liveParams);
        // Use 21 evenly-spaced values across the domain for a clean table
        const step = (dom.xMax - dom.xMin) / 20;
        const pts = curvePoints(dist, liveParams, 20);
        setRows(pts.map(([x, y]) => ({ x, y })));
      }
      return;
    }

    setRows([]);
  }, [isGraphing, isProbability, isStats, hasExpr, expr, variable, xMin, xMax, xStep,
      paramValues, dist, liveParams, discrete]);

  // ── Auto-compute on mode/result change ────────────────────────────────────
  useEffect(() => { compute(); }, [result2D?.mathExpression, probabilityState.liveParams,
    resultStats?.distribution, mode]);

  // ── Labels ────────────────────────────────────────────────────────────────
  const xLabel = isGraphing ? variable : (discrete ? 'k' : 'x');
  const yLabel = isGraphing ? `f(${variable})`
    : isProbability || isStats
      ? (discrete ? 'P(X = k)' : 'f(x)')
      : 'f(x)';

  const handleCopy = () => {
    if (!rows.length) return;
    navigator.clipboard?.writeText(rowsToCSV(rows, xLabel, yLabel)).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // ── Render — no data state ─────────────────────────────────────────────────
  const noData =
    (isGraphing && !hasExpr) ||
    (!isGraphing && !isProbability && !isStats) ||
    (isProbability && !probabilityState.setup) ||
    (isStats && !resultStats);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

      {/* ── Graphing mode controls ── */}
      {isGraphing && hasExpr && (
        <div>
          <SectionLabel>x range</SectionLabel>
          {/* Expression display */}
          <div style={{
            padding: '5px 8px', borderRadius: 6, marginBottom: 8,
            background: T.blLt, border: `1px solid ${T.blMid}`,
            fontSize: 11, fontFamily: T.fm, color: '#1a6fa8',
            wordBreak: 'break-all',
          }}>
            {yLabel} = {expr}
          </div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <NumInput label="x min" value={xMin} onChange={setXMin} step={0.5} />
            <NumInput label="x max" value={xMax} onChange={setXMax} step={0.5} />
            <NumInput label="step" value={xStep} onChange={setXStep} step={0.5} />
          </div>
          <button
            onClick={compute}
            disabled={isLoading}
            style={{
              width: '100%', padding: '6px 0', fontSize: 11, fontWeight: 700,
              borderRadius: 6, border: `1px solid ${T.blMid}`,
              background: T.blLt, color: '#1a6fa8',
              cursor: isLoading ? 'not-allowed' : 'pointer',
              fontFamily: T.fs, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 5,
            }}
          >
            <RefreshCw size={11} style={{ animation: isLoading ? 'spin 1s linear infinite' : 'none' }} />
            {isLoading ? 'Computing…' : 'Refresh table'}
          </button>
        </div>
      )}

      {/* ── No expression fallback for graphing mode ── */}
      {isGraphing && !hasExpr && result2D && (
        <div style={{
          padding: '10px 12px', borderRadius: 8,
          background: T.amLt, border: `1px solid ${T.amMid}`,
          fontSize: 11, color: '#92400e', lineHeight: 1.6,
        }}>
          <strong>No expression available</strong> — this visualisation contains multiple
          curves or a parametric form that can't be tabulated directly. Try a single-function
          graph like "plot y = sin(x)" to enable the Table of Values.
        </div>
      )}

      {/* ── No result yet ── */}
      {noData && !result2D && !probabilityState.setup && !resultStats && (
        <div style={{ fontSize: 11, color: T.tx3, textAlign: 'center', padding: '16px 0' }}>
          Visualise something to generate a table.
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{
          padding: '8px 10px', borderRadius: 6,
          background: '#fff1f2', border: '1px solid #fecdd3',
          fontSize: 11, color: '#be123c',
        }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      {rows.length > 0 && (
        <div>
          {/* Header row with copy button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
            <SectionLabel>{yLabel} values</SectionLabel>
            <button
              onClick={handleCopy}
              title="Copy as CSV"
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', fontSize: 10, fontWeight: 600,
                borderRadius: 5, border: `1px solid ${T.bd}`,
                background: copied ? T.emLt : T.sf,
                color: copied ? T.em : T.tx2,
                cursor: 'pointer', fontFamily: T.fs,
                transition: 'all 0.15s',
              }}
            >
              {copied ? <Check size={10} /> : <Copy size={10} />}
              {copied ? 'Copied!' : 'CSV'}
            </button>
          </div>

          {/* Table */}
          <div style={{
            border: `1px solid ${T.bd}`, borderRadius: 8, overflow: 'hidden',
            maxHeight: 320, overflowY: 'auto',
          }}>
            {/* Sticky header */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              background: 'var(--card, #1a2332)', position: 'sticky', top: 0, zIndex: 1,
              borderBottom: `1px solid ${T.bd}`,
            }}>
              {[xLabel, yLabel].map(label => (
                <div key={label} style={{
                  padding: '6px 10px', fontSize: 10, fontWeight: 800,
                  color: T.bl, fontFamily: T.fm,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                }}>
                  {label}
                </div>
              ))}
            </div>

            {/* Data rows */}
            {rows.map((row, i) => {
              const isZero = row.isZeroCrossing;
              const isNear0 = !isNaN(row.y) && Math.abs(row.y) < 0.001;
              const bg = isZero ? T.amLt
                : isNear0 ? T.emLt
                : i % 2 === 0 ? T.sf : T.bg;
              return (
                <div
                  key={i}
                  style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr',
                    background: bg,
                    borderBottom: i < rows.length - 1 ? `1px solid ${T.bd}` : 'none',
                  }}
                >
                  <div style={{ padding: '5px 10px', fontSize: 11, fontFamily: T.fm, color: T.tx2 }}>
                    {fmt(row.x, isGraphing ? 2 : 3)}
                  </div>
                  <div style={{
                    padding: '5px 10px', fontSize: 11, fontFamily: T.fm,
                    color: isNaN(row.y) ? T.tx3 : isNear0 ? T.em : T.tx,
                    fontWeight: isNear0 || isZero ? 700 : 400,
                  }}>
                    {fmt(row.y, 4)}
                    {isZero && (
                      <span style={{ fontSize: 9, color: T.am, marginLeft: 4, fontFamily: T.fs }}>
                        crossing
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary stats */}
          {isGraphing && rows.some(r => !isNaN(r.y)) && (() => {
            const valid = rows.filter(r => !isNaN(r.y) && isFinite(r.y)).map(r => r.y);
            const min = Math.min(...valid), max = Math.max(...valid);
            const zeros = rows.filter(r => r.isZeroCrossing).length;
            return (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
                gap: 4, marginTop: 8,
              }}>
                {[
                  { label: 'min f(x)', value: fmt(min, 3) },
                  { label: 'max f(x)', value: fmt(max, 3) },
                  { label: 'zeros', value: zeros > 0 ? `≈${zeros}` : '0' },
                ].map(({ label, value }) => (
                  <div key={label} style={{
                    padding: '5px 6px', borderRadius: 6,
                    background: T.sf, border: `1px solid ${T.bd}`,
                  }}>
                    <div style={{ fontSize: 8, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                      {label}
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 700, fontFamily: T.fm, color: T.bl }}>
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

export default MathCanvasTablePanel;
