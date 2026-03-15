'use client';

/**
 * MathCanvasProbabilityPanel — Probability Calculator Right Panel
 *
 * The interactive instrument panel for MathCanvas's probability calculator mode.
 * Unlike the stats panel (which is read-only metadata), this panel is the
 * primary control surface: the student manipulates distribution parameters,
 * sets tail bounds, and reads exact probability answers here.
 *
 * Think of it as the difference between a weather chart (stats panel — showing
 * you the shape of rain probability over a region) and a rain gauge
 * (probability panel — giving you the exact millimetres at a specific point).
 *
 * Three interaction zones:
 *   1. Distribution selector  — switch family (Normal, Binomial, etc.)
 *   2. Parameter sliders      — adjust μ, σ, n, p, λ etc. in real time
 *   3. Bound inputs           — type lower / upper / exact value → live P answer
 *
 * The answer display is the hero of the component — large, monospaced, prominent.
 * Everything else is in service of getting that number right.
 */

import React, { useState, useCallback } from 'react';
import type {
  DistributionFamily,
  ProbabilityState,
  ProbabilityBound,
} from '@/types/mathcanvas-extensions';
import {
  DISTRIBUTION_PARAM_SCHEMA,
  DISTRIBUTION_DISPLAY_NAMES,
  CONTINUOUS_DISTRIBUTIONS,
  DISCRETE_DISTRIBUTIONS,
  isDiscrete,
  cdf,
  quantile,
} from '@/lib/probability-engine';

// ── Design tokens (matches MathCanvasPage palette exactly) ────────────────────
const T = {
  bg: '#0f1419', sf: '#1a2332', bd: '#1e2d3d', bdBright: '#2a3f56',
  bl: '#1e9df1', blLt: '#e3f3fd', blMid: '#b3daf7',
  em: '#10b981', emLt: '#ecfdf5', emMid: '#a7f3d0',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  vl: '#8b5cf6', vlLt: '#f5f3ff', vlMid: '#ddd6fe',
  ind: '#6366f1', indLt: '#eef2ff', indMid: '#c7d2fe',
  rose: '#f43f5e', roseLt: '#fff1f2', roseMid: '#fecdd3',
  tx: '#e8edf2', tx2: '#8899aa', tx3: '#4d6070',
  fm: "'JetBrains Mono', Menlo, monospace",
  fs: "'Open Sans', sans-serif",
};

interface Props {
  state: ProbabilityState;
  onDistributionChange: (dist: DistributionFamily) => void;
  onParamChange: (name: string, value: number) => void;
  onBoundChange: (bound: ProbabilityBound) => void;
}

// ── Bound mode selector ───────────────────────────────────────────────────────
type BoundMode = 'left' | 'right' | 'interval' | 'point';

const BOUND_MODES: { id: BoundMode; label: string; symbol: string; tooltip: string }[] = [
  { id: 'left',     label: 'P(X ≤ b)',       symbol: '◀',  tooltip: 'Left tail — cumulative from −∞' },
  { id: 'right',    label: 'P(X > a)',        symbol: '▶',  tooltip: 'Right tail — survivor function' },
  { id: 'interval', label: 'P(a ≤ X ≤ b)',   symbol: '◀▶', tooltip: 'Interval probability' },
  { id: 'point',    label: 'P(X = k)',        symbol: '·',  tooltip: 'Point probability (discrete)' },
];

function formatProbability(p: number): string {
  if (isNaN(p)) return '—';
  if (p > 0.9999) return '≈ 1.0000';
  if (p < 0.0001 && p > 0) return '< 0.0001';
  return p.toFixed(4);
}

function formatPercent(p: number): string {
  if (isNaN(p)) return '—';
  return (p * 100).toFixed(2) + '%';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 9, fontWeight: 800, color: T.tx3,
      textTransform: 'uppercase', letterSpacing: '0.1em',
      marginBottom: 7, marginTop: 2,
    }}>
      {children}
    </div>
  );
}

function SliderRow({
  label, name, min, max, step, value, onChange,
}: {
  label: string; name: string; min: number; max: number; step: number;
  value: number; onChange: (name: string, v: number) => void;
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: T.tx2, fontFamily: T.fs }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: T.bl, fontFamily: T.fm, minWidth: 44, textAlign: 'right' }}>
          {Number.isInteger(step) ? value : value.toFixed(step < 0.01 ? 2 : 1)}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: T.bl, cursor: 'pointer' }}
      />
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MathCanvasProbabilityPanel({ state, onDistributionChange, onParamChange, onBoundChange }: Props) {
  const [boundMode, setBoundMode] = useState<BoundMode>('left');
  const [inputA, setInputA] = useState('');
  const [inputB, setInputB] = useState('');

  const { setup, liveParams, liveBound, result } = state;
  const dist = setup?.distribution ?? 'normal';
  const params = liveParams;
  const paramSchema = DISTRIBUTION_PARAM_SCHEMA[dist];
  const discrete = isDiscrete(dist);

  // ── Sync input fields when the AI sets a new setup with a bound ──────────
  // When visualise() fires, the hook sets probabilityState.setup with the AI's
  // chosen bound (e.g. {lower: null, upper: 80} from "find P(X ≤ 80)").
  // Pre-populate the text inputs so the student can see and adjust the bound
  // the AI identified, rather than staring at empty boxes.
  const prevSetupRef = React.useRef<typeof setup>(null);
  React.useEffect(() => {
    if (!setup || setup === prevSetupRef.current) return;
    prevSetupRef.current = setup;
    const lo = setup.bound?.lower;
    const hi = setup.bound?.upper;
    // Determine the best boundMode from the AI's bound
    if (lo === null && hi !== null) {
      setBoundMode('left');
      setInputA('');
      setInputB(String(hi));
    } else if (lo !== null && hi === null) {
      setBoundMode('right');
      setInputA(String(lo));
      setInputB('');
    } else if (lo !== null && hi !== null) {
      if (Math.abs(lo - hi) < 1e-10) {
        setBoundMode('point');
        setInputA(String(lo));
        setInputB('');
      } else {
        setBoundMode('interval');
        setInputA(String(lo));
        setInputB(String(hi));
      }
    }
    // Propagate to hook immediately so canvas shading matches
    if (setup.bound) onBoundChange(setup.bound);
  }, [setup, onBoundChange]);

  // ── Atomic bound application — no stale closure ──────────────────────────
  // All bound changes funnel through this function with explicit values.
  // Never derive one input from the other via state — state updates are async
  // and calling setInputA then reading inputA in the next line gives stale data.
  const applyBound = useCallback((mode: BoundMode, a: string, b: string) => {
    const parseVal = (s: string) => {
      const v = parseFloat(s);
      return isNaN(v) ? null : v;
    };
    let bound: ProbabilityBound;
    switch (mode) {
      case 'left':     bound = { lower: null,        upper: parseVal(b) }; break;
      case 'right':    bound = { lower: parseVal(a), upper: null };        break;
      case 'interval': bound = { lower: parseVal(a), upper: parseVal(b) }; break;
      case 'point': {  const v = parseVal(a); bound = { lower: v, upper: v }; break; }
      default:         bound = { lower: null, upper: null };
    }
    onBoundChange(bound);
  }, [onBoundChange]);

  const handleModeChange = (m: BoundMode) => {
    setBoundMode(m);
    applyBound(m, inputA, inputB);
  };

  const handleAChange = (v: string) => {
    setInputA(v);
    applyBound(boundMode, v, inputB);
  };

  const handleBChange = (v: string) => {
    setInputB(v);
    applyBound(boundMode, inputA, v);
  };

  // ── Quick-fill: atomic updates — compute both values first, apply once ───
  // Bug fix: the previous implementation called handleAChange then handleBChange
  // in sequence. Each call fires applyBound with the stale value of the OTHER
  // input (React state hasn't updated yet). Fix: compute both strings up front,
  // set both state values, call applyBound with both new values in one shot.
  const handleQuickFill = useCallback((type: string) => {
    const mu     = params.mu     ?? 0;
    const sigma  = params.sigma  ?? 1;
    const lambda = params.lambda ?? 3;
    const n      = params.n      ?? 10;
    const p      = params.p      ?? 0.5;

    let newA = inputA, newB = inputB, newMode = boundMode;

    switch (type) {
      case '1sigma_left':
        newB = (mu + sigma).toFixed(2);
        newMode = 'left';
        break;
      case '1sigma':
        newA = (mu - sigma).toFixed(2);
        newB = (mu + sigma).toFixed(2);
        newMode = 'interval';
        break;
      case '2sigma':
        newA = (mu - 2 * sigma).toFixed(2);
        newB = (mu + 2 * sigma).toFixed(2);
        newMode = 'interval';
        break;
      case '95ci':
        newA = (mu - 1.96 * sigma).toFixed(3);
        newB = (mu + 1.96 * sigma).toFixed(3);
        newMode = 'interval';
        break;
      case 'mean':
        newA = dist === 'poisson'
          ? lambda.toFixed(1)
          : dist === 'binomial'
            ? (n * p).toFixed(1)
            : newA;
        newMode = 'right';
        break;
    }

    // Batch all three updates then fire applyBound once with both final values
    setInputA(newA);
    setInputB(newB);
    setBoundMode(newMode);
    applyBound(newMode, newA, newB);
  }, [params, dist, inputA, inputB, boundMode, applyBound]);

  const prob = result?.probability;
  const comp = result?.complement;
  const hasBound = liveBound.lower !== null || liveBound.upper !== null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

      {/* ── Distribution selector ── */}
      <div>
        <SectionLabel>Distribution</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
          {(CONTINUOUS_DISTRIBUTIONS as DistributionFamily[]).map(d => (
            <button
              key={d}
              onClick={() => onDistributionChange(d)}
              style={{
                padding: '5px 4px', fontSize: 10, fontWeight: 600,
                borderRadius: 6, border: `1px solid ${dist === d ? T.bl : T.bd}`,
                background: dist === d ? T.blLt : T.sf,
                color: dist === d ? '#1a6fa8' : T.tx2,
                cursor: 'pointer', fontFamily: T.fs, textAlign: 'center',
                transition: 'all 0.12s',
              }}
            >
              {DISTRIBUTION_DISPLAY_NAMES[d]}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 9, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Discrete</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 4 }}>
          {(DISCRETE_DISTRIBUTIONS as DistributionFamily[]).map(d => (
            <button
              key={d}
              onClick={() => onDistributionChange(d)}
              style={{
                padding: '5px 4px', fontSize: 10, fontWeight: 600,
                borderRadius: 6, border: `1px solid ${dist === d ? T.am : T.bd}`,
                background: dist === d ? T.amLt : T.sf,
                color: dist === d ? '#92400e' : T.tx2,
                cursor: 'pointer', fontFamily: T.fs, textAlign: 'center',
                transition: 'all 0.12s',
              }}
            >
              {DISTRIBUTION_DISPLAY_NAMES[d]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Parameter sliders ── */}
      <div>
        <SectionLabel>Parameters</SectionLabel>
        {paramSchema.map(p => (
          <SliderRow
            key={p.name}
            label={p.label}
            name={p.name}
            min={p.min}
            max={p.max}
            step={p.step}
            value={params[p.name] ?? p.default}
            onChange={onParamChange}
          />
        ))}
      </div>

      {/* ── Bound mode selector ── */}
      <div>
        <SectionLabel>Query Type</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 8 }}>
          {BOUND_MODES.filter(m => !discrete || m.id !== 'point' ? true : discrete).map(m => (
            <button
              key={m.id}
              onClick={() => handleModeChange(m.id)}
              title={m.tooltip}
              style={{
                padding: '6px 4px', fontSize: 10, fontWeight: 700,
                borderRadius: 6, border: `1px solid ${boundMode === m.id ? T.vl : T.bd}`,
                background: boundMode === m.id ? T.vlLt : T.sf,
                color: boundMode === m.id ? '#4c1d95' : T.tx2,
                cursor: 'pointer', fontFamily: T.fm, textAlign: 'center',
                lineHeight: 1.3, transition: 'all 0.12s',
              }}
            >
              <div>{m.symbol}</div>
              <div style={{ fontSize: 9, fontFamily: T.fs, marginTop: 1 }}>{m.label}</div>
            </button>
          ))}
        </div>

        {/* Bound inputs */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(boundMode === 'right' || boundMode === 'interval') && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: T.tx3, marginBottom: 3, fontWeight: 600 }}>
                a =
              </div>
              <input
                type="number"
                value={inputA}
                onChange={e => handleAChange(e.target.value)}
                placeholder="e.g. −1"
                step="any"
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 12,
                  fontFamily: T.fm, background: T.bg, color: T.tx,
                  border: `1px solid ${T.bdBright}`, borderRadius: 6, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          {(boundMode === 'point') && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: T.tx3, marginBottom: 3, fontWeight: 600 }}>k =</div>
              <input
                type="number"
                value={inputA}
                onChange={e => handleAChange(e.target.value)}
                placeholder={discrete ? 'integer k' : 'x'}
                step={discrete ? '1' : 'any'}
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 12,
                  fontFamily: T.fm, background: T.bg, color: T.tx,
                  border: `1px solid ${T.bdBright}`, borderRadius: 6, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
          {(boundMode === 'left' || boundMode === 'interval') && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 9, color: T.tx3, marginBottom: 3, fontWeight: 600 }}>
                {boundMode === 'left' ? 'b =' : 'b ='}
              </div>
              <input
                type="number"
                value={inputB}
                onChange={e => handleBChange(e.target.value)}
                placeholder="e.g. 1"
                step="any"
                style={{
                  width: '100%', padding: '6px 8px', fontSize: 12,
                  fontFamily: T.fm, background: T.bg, color: T.tx,
                  border: `1px solid ${T.bdBright}`, borderRadius: 6, outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Quick-fill shortcuts ── */}
      {dist === 'normal' && (
        <div>
          <SectionLabel>Quick Bounds</SectionLabel>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {[
              { label: 'μ ± 1σ (68%)', fn: '1sigma' },
              { label: 'μ ± 2σ (95%)', fn: '2sigma' },
              { label: '95% CI',        fn: '95ci' },
              { label: 'P(X ≤ μ+σ)',   fn: '1sigma_left' },
            ].map(q => (
              <button
                key={q.fn}
                onClick={() => handleQuickFill(q.fn)}
                style={{
                  padding: '4px 8px', fontSize: 10, fontWeight: 600,
                  borderRadius: 5, border: `1px solid ${T.bd}`,
                  background: T.sf, color: T.tx2, cursor: 'pointer', fontFamily: T.fs,
                }}
              >
                {q.label}
              </button>
            ))}
          </div>
        </div>
      )}
      {(dist === 'poisson' || dist === 'binomial') && (
        <div>
          <SectionLabel>Quick Bounds</SectionLabel>
          <button
            onClick={() => handleQuickFill('mean')}
            style={{
              padding: '4px 8px', fontSize: 10, fontWeight: 600,
              borderRadius: 5, border: `1px solid ${T.bd}`,
              background: T.sf, color: T.tx2, cursor: 'pointer', fontFamily: T.fs,
            }}
          >
            P(X &gt; mean)
          </button>
        </div>
      )}

      {/* ── Answer hero ── */}
      <div style={{
        background: hasBound && prob !== undefined
          ? 'linear-gradient(135deg, #0d2137 0%, #1a2332 100%)'
          : T.sf,
        border: `1px solid ${hasBound && prob !== undefined ? T.bl : T.bd}`,
        borderRadius: 10, padding: '14px 12px',
        transition: 'all 0.2s',
      }}>
        <div style={{
          fontSize: 9, fontWeight: 800, color: T.tx3,
          textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8,
        }}>
          {boundMode === 'left' ? 'P(X ≤ b)' : boundMode === 'right' ? 'P(X > a)' : boundMode === 'interval' ? 'P(a ≤ X ≤ b)' : 'P(X = k)'}
        </div>

        {hasBound && prob !== undefined ? (
          <>
            {/* Main probability */}
            <div style={{
              fontSize: 32, fontWeight: 800, fontFamily: T.fm,
              color: T.bl, lineHeight: 1, marginBottom: 4,
            }}>
              {formatProbability(prob)}
            </div>
            <div style={{ fontSize: 13, color: T.tx2, fontFamily: T.fm, marginBottom: 10 }}>
              {formatPercent(prob)}
            </div>

            {/* Complement */}
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '7px 8px', borderRadius: 7,
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.bd}`,
            }}>
              <span style={{ fontSize: 10, color: T.tx3 }}>
                {boundMode === 'left' ? 'P(X > b)' : boundMode === 'right' ? 'P(X ≤ a)' : boundMode === 'interval' ? 'P(X outside)' : 'P(X ≠ k)'}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: T.fm, color: T.am }}>
                {comp !== undefined ? formatProbability(comp) : '—'}
              </span>
            </div>

            {/* CDF readouts */}
            {result && (result.lowerCDF !== null || result.upperCDF !== null) && (
              <div style={{ marginTop: 8, display: 'flex', gap: 6 }}>
                {result.lowerCDF !== null && (
                  <div style={{ flex: 1, padding: '5px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.bd}` }}>
                    <div style={{ fontSize: 8, color: T.tx3, marginBottom: 2 }}>P(X ≤ a)</div>
                    <div style={{ fontSize: 11, fontFamily: T.fm, color: T.tx2 }}>{formatProbability(result.lowerCDF)}</div>
                  </div>
                )}
                {result.upperCDF !== null && (
                  <div style={{ flex: 1, padding: '5px 6px', borderRadius: 6, background: 'rgba(255,255,255,0.03)', border: `1px solid ${T.bd}` }}>
                    <div style={{ fontSize: 8, color: T.tx3, marginBottom: 2 }}>P(X ≤ b)</div>
                    <div style={{ fontSize: 11, fontFamily: T.fm, color: T.tx2 }}>{formatProbability(result.upperCDF)}</div>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 11, color: T.tx3, textAlign: 'center', padding: '8px 0' }}>
            Enter a value above to compute probability
          </div>
        )}
      </div>

      {/* ── Curriculum info ── */}
      {setup && (
        <div style={{
          background: T.emLt, border: `1px solid ${T.emMid}`,
          borderRadius: 7, padding: '8px 10px',
        }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
            Curriculum
          </div>
          <div style={{ fontSize: 10, color: '#064e3b', lineHeight: 1.55 }}>
            {setup.curriculumDetail}
          </div>
          {setup.teacherNote && (
            <div style={{ marginTop: 6, fontSize: 10, color: '#065f46', borderTop: `1px solid ${T.emMid}`, paddingTop: 5 }}>
              <strong>Note:</strong> {setup.teacherNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default MathCanvasProbabilityPanel;
