/**
 * MathCanvas — Full React/Next.js Component — Priority 1 Extended
 *
 * Extends the base MathCanvasPage with dual-surface mode.
 * All 6 original modes are preserved exactly (graphing, geometry, 3d,
 * stats, cas, scientific). Dual surface is added as a 7th mode.
 *
 * New in this version:
 *   - 'dual' mode tab in the header (Layers icon, emerald accent)
 *   - Dual canvas area renders MathCanvasDualSurface (dynamically imported)
 *   - Dual quick-start chips: 8 high-value surface pairings
 *   - Right panel: dual parameters tab routes sliders to correct surface
 *   - Intersection explanation panel below the canvas (amber card)
 *   - Suggested exploration from Issy carries compound.suggestedExploration
 *
 * Dynamic import strategy:
 *   MathCanvas3DSurface      — ssr:false (single surface, Three.js)
 *   MathCanvasDualSurface    — ssr:false (dual surface, Three.js)
 *   Both load lazily so the initial bundle stays small.
 */

'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useTheme } from 'next-themes';
import {
  Loader2, BarChart2, Compass, Box, BarChart3, Calculator, FlaskConical,
  RotateCcw, Play, Layers, Info, Brain, BookOpen,
  ZoomIn, ZoomOut, Trash2, RefreshCw, GitMerge, Sigma,
  Maximize2, Minimize2, Expand, TrendingUp, Ruler,
  PieChart, AlertTriangle, Lightbulb, Target, Library,
  MessageCircle, Circle, GripVertical, Globe,
  FunctionSquare, Waves, Minus,
} from 'lucide-react';
import { useMathCanvas } from '@/hooks/use-mathcanvas';
import type { CanvasMode } from '@/types/mathcanvas';
import { MathCanvasGeometryPanel } from './MathCanvasGeometryPanel';
import { MathCanvasStatsPanel } from './MathCanvasStatsPanel';
import { MathCanvasCalculatorFloater } from './MathCanvasCalculatorFloater';

// ── Lazy-load WebGL renderers ─────────────────────────────────────────────────

const MathCanvas3DSurface = dynamic(
  () => import('@/components/mathcanvas/MathCanvas3DSurface').then(m => ({ default: m.MathCanvas3DSurface })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted" style={{ minHeight: 400, borderRadius: 8 }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground" style={{ fontSize: 12, fontFamily: 'Open Sans, sans-serif' }}>Loading WebGL renderer…</p>
        </div>
      </div>
    ),
  }
);

const MathCanvasDualSurface = dynamic(
  () => import('@/components/mathcanvas/MathCanvasDualSurface').then(m => ({ default: m.MathCanvasDualSurface })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center bg-muted" style={{ minHeight: 400, borderRadius: 8 }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
          <p className="text-muted-foreground" style={{ fontSize: 12, fontFamily: 'Open Sans, sans-serif' }}>Loading dual surface renderer…</p>
        </div>
      </div>
    ),
  }
);

const MathCanvasCASPanel = dynamic(
  () => import('@/components/mathcanvas/MathCanvasCASPanel').then(m => ({ default: m.default })),
  { ssr: false }
);

const MathCanvasExpressionBar = dynamic(
  () => import('@/components/mathcanvas/MathCanvasExpressionBar').then(m => ({ default: m.default })),
  { ssr: false }
);

// =============================================================================
// DESIGN TOKENS — theme-aware (light / dark)
// =============================================================================

const LIGHT = {
  bl: '#1e9df1', blDk: '#1580c8', blLt: '#e3f3fd', blMid: '#b8ddf8',
  ink: '#0f1419', ink2: '#1c2631', ind: '#6366f1', indLt: '#eef2ff', indMid: '#c7d2fe', vio: '#8b5cf6',
  em: '#10b981', emLt: '#ecfdf5', emMid: '#a7f3d0',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  rd: '#ef4444',
  bg: '#f7f8f8', sf: '#ffffff', bd: '#e1eaef', bd2: '#c5d8e4', bdBright: '#d1dce5', mt: '#e5e5e6',
  tx: '#0f1419', tx2: '#536471', tx3: '#8b99a4',
  vl: '#7c3aed', vlLt: '#f5f3ff', vlMid: '#ddd6fe',
  fs: "'Open Sans', system-ui, sans-serif" as const,
  fm: "'JetBrains Mono', Menlo, monospace" as const,
  // Overlay / glass
  overlayBg: 'rgba(255,255,255,0.95)',
  overlayBgStrong: 'rgba(255,255,255,0.96)',
  loadingBg: 'rgba(247,248,248,0.92)',
  canvasLoadBg: '#f7f8f8',
};

const DARK: typeof LIGHT = {
  bl: '#3eaff5', blDk: '#1e9df1', blLt: '#1a2a3a', blMid: '#1e3a52',
  ink: '#e8ecf0', ink2: '#d0d8e0', ind: '#818cf8', indLt: '#1e1e3a', indMid: '#3b3b6e', vio: '#a78bfa',
  em: '#34d399', emLt: '#0d2a20', emMid: '#155e3e',
  am: '#fbbf24', amLt: '#2a2010', amMid: '#5e4a1a',
  rd: '#f87171',
  bg: '#0f1419', sf: '#1a2028', bd: '#2a3440', bd2: '#384858', bdBright: '#3a4a58', mt: '#2a3038',
  tx: '#e8ecf0', tx2: '#9ca8b4', tx3: '#6b7a88',
  vl: '#a78bfa', vlLt: '#1e1a2e', vlMid: '#3b2e6e',
  fs: "'Open Sans', system-ui, sans-serif" as const,
  fm: "'JetBrains Mono', Menlo, monospace" as const,
  overlayBg: 'rgba(26,32,40,0.95)',
  overlayBgStrong: 'rgba(26,32,40,0.96)',
  loadingBg: 'rgba(15,20,25,0.92)',
  canvasLoadBg: '#1a2028',
};

function useTokens() {
  const { resolvedTheme } = useTheme();
  return useMemo(() => resolvedTheme === 'dark' ? DARK : LIGHT, [resolvedTheme]);
}

// Static ref for style helpers defined outside the component
const T = LIGHT;

// =============================================================================
// MODE CONFIG — 7 modes total
// =============================================================================

// We use a type assertion here because 'dual' and 'expression' extend the base CanvasMode
type ExtCanvasMode = CanvasMode | 'dual' | 'expression';

function getModes(C: typeof LIGHT): { id: ExtCanvasMode; label: string; icon: React.ReactNode; color: string }[] {
  return [
    { id: 'graphing',   label: 'Graphing',   icon: <TrendingUp size={14} />,  color: C.bl },
    { id: 'geometry',   label: 'Geometry',    icon: <Compass size={14} />,     color: C.ind },
    { id: '3d',         label: '3D',          icon: <Box size={14} />,         color: C.em },
    { id: 'dual',       label: 'Dual',        icon: <GitMerge size={14} />,    color: C.vl },
    { id: 'stats',      label: 'Statistics',  icon: <BarChart3 size={14} />,   color: C.am },
    { id: 'cas',        label: 'CAS',         icon: <FunctionSquare size={14} />, color: C.vio },
    { id: 'expression', label: 'Expression',  icon: <Sigma size={14} />,       color: C.em },
  ];
}

// =============================================================================
// QUICK-START CHIPS
// =============================================================================

// Generic graphing chips (used when mode === 'graphing')
const CHIPS_GRAPHING = [
  { label: 'sine wave',  prompt: 'Plot y=sin(x) clearly showing its period T=2π and amplitude=1' },
  { label: 'derivative', prompt: 'Plot sin(x) and cos(x), draw tangent line at x=a with slope=cos(a)' },
  { label: 'quadratic',  prompt: 'Plot y=x²-4x+3 showing roots, vertex, and axis of symmetry' },
  { label: 'Lissajous',  prompt: 'Lissajous figure x=sin(at), y=sin(bt+δ) with sliders for a, b, δ' },
  { label: 'circle',     prompt: 'Circle x²+y²=r² with slider for radius r, showing unit circle at r=1' },
];

// Statistics distribution chips
const CHIPS_STATS = [
  { label: 'normal dist',    prompt: 'Normal distribution N(μ,σ²) with sliders for mean and standard deviation, shade μ±σ region' },
  { label: 'binomial',       prompt: 'Binomial distribution B(n,p) with sliders for n trials and probability p' },
  { label: 'Poisson',        prompt: 'Poisson distribution showing probability of k events when mean rate λ=3' },
  { label: 't-distribution', prompt: 't-distribution with slider for degrees of freedom ν, compare to standard normal' },
  { label: 'z-scores',       prompt: 'Standard normal N(0,1) shading the 95% confidence interval between z=-1.96 and z=1.96' },
  { label: 'chi-squared',    prompt: 'Chi-squared distribution χ²(k) with slider for degrees of freedom' },
];

// Geometry construction chips
const CHIPS_GEOMETRY = [
  { label: 'perp bisector',   prompt: 'Construct the perpendicular bisector of segment AB using compass and straightedge — show all construction arcs' },
  { label: 'angle bisector',  prompt: 'Construct the bisector of angle ABC using compass and straightedge, step by step' },
  { label: 'equilateral △',   prompt: 'Construct an equilateral triangle on base AB using only compass and straightedge' },
  { label: 'circle theorem',  prompt: 'Show the inscribed angle theorem: angle at centre is twice the angle at the circumference' },
  { label: 'Pythagoras',      prompt: 'Construct squares on each side of a right-angled triangle to illustrate Pythagoras theorem' },
  { label: 'similar triangles', prompt: 'Construct two similar triangles showing the ratio of corresponding sides with a scale factor slider' },
];

// Keep CHIPS_2D as alias for backward compatibility (WelcomeOverlay default)
const CHIPS_2D = CHIPS_GRAPHING;

const CHIPS_3D = [
  { label: 'saddle',      prompt: 'Plot the hyperbolic paraboloid (saddle surface) z = x² - y²' },
  { label: 'ripple',      prompt: 'Ripple surface z = sin(√(x²+y²)) showing wave propagation' },
  { label: 'torus',       prompt: 'Torus (donut shape) with major radius R=3 and minor radius r=1' },
  { label: 'Gaussian',    prompt: '3D Gaussian bell surface z = exp(-(x²+y²)/2σ²) with slider for σ' },
  { label: 'ellipsoid',   prompt: 'Ellipsoid with semi-axes a=3, b=2, c=1.5' },
  { label: 'helicoid',    prompt: 'Helicoid surface — a twisted ramp' },
  { label: 'sphere',      prompt: 'Upper hemisphere of a sphere with radius R=3' },
  { label: 'monkey saddle', prompt: 'Monkey saddle surface z = x³ - 3xy²' },
];

/**
 * Dual-mode chips: each prompt is designed to produce two surfaces whose
 * intersection curve teaches a specific curriculum concept.
 *
 * The annotations are for the teacher — the chip labels are for students.
 * "Bowl meets shelf" → paraboloid ∩ plane → circle (great for Year 10 intro)
 * "Two bowls"        → paraboloid ∩ paraboloid → ellipse/circle (Year 11)
 * "Ripple meets plane" → wave surface ∩ plane → closed wave rings (engaging)
 */
const CHIPS_DUAL = [
  {
    label: 'bowl meets shelf',
    prompt: 'Show me a paraboloid z = ½(x²+y²) and a horizontal plane z = H. What shape is their intersection?',
  },
  {
    label: 'two bowls',
    prompt: 'Plot two paraboloids z = x² + y² and z = 4 - x² - y² and find where they intersect',
  },
  {
    label: 'cone and plane',
    prompt: 'Show the cone z = √(x²+y²) intersected by a horizontal plane — this gives a conic section',
  },
  {
    label: 'ripple and plane',
    prompt: 'Plot the ripple surface z = sin(√(x²+y²)) and a horizontal plane — where do they meet?',
  },
  {
    label: 'paraboloid and cone',
    prompt: 'Compare z = x²+y² (paraboloid) with z = √(x²+y²) (cone). Find their intersection curve.',
  },
  {
    label: 'saddle and plane',
    prompt: 'Show the saddle surface z = x² - y² and a horizontal plane z = C. Describe the intersection.',
  },
  {
    label: 'Gaussian and plane',
    prompt: 'Plot a 3D Gaussian bell z = exp(-(x²+y²)/2) and a horizontal plane to see circular cross-sections',
  },
  {
    label: 'two waves',
    prompt: 'Show z = sin(x)·cos(y) and z = cos(x)·sin(y) simultaneously — where are they equal?',
  },
];

const CHIPS_CAS = [
  { label: 'partial derivatives', prompt: 'Give me tasks on partial derivatives of a 3D surface' },
  { label: 'gradient vectors', prompt: 'Show me gradient vector tasks for a paraboloid or saddle' },
  { label: 'tangent plane', prompt: 'Design tasks for finding tangent planes to a smooth surface' },
  { label: 'chain rule', prompt: 'Create CAS tasks involving the chain rule for multivariable functions' },
  { label: 'critical points', prompt: 'Tasks for finding and classifying critical points of f(x,y)' },
  { label: 'polynomial algebra', prompt: 'Algebraic tasks: expand, factorise, and simplify polynomials' },
];

const CHIPS_EXPRESSION = [
  { label: 'saddle: x²−y²',     prompt: 'x^2 - y^2' },
  { label: 'bell: e^(−r²)',      prompt: 'exp(-(x^2+y^2)/2)' },
  { label: 'ripple: sin(r)',     prompt: 'sin(sqrt(x^2+y^2))' },
  { label: 'product: sin·cos',  prompt: 'sin(x)*cos(y)' },
  { label: 'monkey saddle',      prompt: 'x^3 - 3*x*y^2' },
  { label: 'log bump',           prompt: 'log(x^2 + y^2 + 1)' },
  { label: 'paraboloid',         prompt: 'x^2 + y^2' },
  { label: 'trig ridge',         prompt: 'sin(x) + cos(y)' },
];

// =============================================================================
// PARAMETER SLIDER PANEL — extended for dual mode
// =============================================================================

interface ParamPanelProps {
  parameters: Array<{
    name: string; label: string; min: number; max: number; step: number;
    group?: string; surfaceTarget?: 1 | 2;
  }>;
  values: Record<string, number>;
  onChange: (name: string, value: number) => void;
  isDual?: boolean;
  C: typeof LIGHT;
}

function ParamPanel({ parameters, values, onChange, isDual, C }: ParamPanelProps) {
  if (!parameters.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: C.tx3, fontSize: 12 }}>
        No interactive parameters for this surface.
      </div>
    );
  }

  // Group parameters
  const groups: Record<string, typeof parameters> = {};
  parameters.forEach(p => {
    const g = p.group ?? 'Parameters';
    (groups[g] ??= []).push(p);
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {Object.entries(groups).map(([groupName, params]) => (
        <div key={groupName}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: C.tx3,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {/* In dual mode, colour-code the group header by surface target */}
            {isDual && params[0]?.surfaceTarget === 1 && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.am, flexShrink: 0 }} />
            )}
            {isDual && params[0]?.surfaceTarget === 2 && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.vl, flexShrink: 0 }} />
            )}
            {groupName}
          </div>
          {params.map(p => {
            const val = values[p.name] ?? p.min;
            const accent = isDual && p.surfaceTarget === 2 ? C.vl : C.bl;
            return (
              <div key={p.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: C.tx2 }}>{p.label}</span>
                  <input
                    type="number"
                    value={val.toFixed(2)}
                    step={p.step}
                    min={p.min}
                    max={p.max}
                    onChange={e => onChange(p.name, Math.max(p.min, Math.min(p.max, parseFloat(e.target.value) || p.min)))}
                    style={{
                      width: 60, fontSize: 11, fontFamily: C.fm, fontWeight: 600,
                      textAlign: 'right', border: `1px solid ${C.bd}`, borderRadius: 4,
                      padding: '2px 5px', color: accent, background: C.blLt,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: C.tx3, width: 28 }}>{p.min}</span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    onChange={e => onChange(p.name, parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: accent }}
                  />
                  <span style={{ fontSize: 10, color: C.tx3, width: 28, textAlign: 'right' }}>{p.max}</span>
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// SURFACE INFO BADGE — reused for single-surface 3D mode
// =============================================================================

interface SurfaceBadgeProps {
  title: string;
  description: string;
  topic: string;
  curriculumCode: string;
  teacherNote?: string;
  C: typeof LIGHT;
}

function SurfaceBadge({ title, description, topic, curriculumCode, teacherNote, C }: SurfaceBadgeProps) {
  const [showTeacher, setShowTeacher] = useState(false);
  return (
    <div style={{
      position: 'absolute', bottom: 40, left: 12, right: 12,
      background: C.overlayBg, borderRadius: 8,
      border: `1px solid ${C.bd}`, padding: '10px 14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(4px)', zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: C.bl, background: C.blLt, borderRadius: 4, padding: '1px 6px' }}>{curriculumCode}</span>
        <span style={{ fontSize: 10, color: C.tx3, background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 4, padding: '1px 6px' }}>{topic}</span>
      </div>
      <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.5 }}>{description}</div>
      {teacherNote && (
        <>
          <button
            onClick={() => setShowTeacher(v => !v)}
            style={{ fontSize: 10, color: C.am, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}
          >
            <BookOpen size={10} /> Teacher Note {showTeacher ? '▲' : '▼'}
          </button>
          {showTeacher && (
            <div style={{ fontSize: 11, color: C.am, background: C.amLt, border: `1px solid ${C.amMid}`, borderRadius: 5, padding: '6px 9px', marginTop: 4 }}>
              {teacherNote}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// =============================================================================
// DUAL INFO PANEL — intersection explanation card
// =============================================================================

interface DualInfoPanelProps {
  title: string;
  description: string;
  intersectionExplanation: string;
  curriculumCode: string;
  topic: string;
  teacherNote?: string;
  C: typeof LIGHT;
}

function DualInfoPanel({
  title, description, intersectionExplanation, curriculumCode, topic, teacherNote, C,
}: DualInfoPanelProps) {
  const [showTeacher, setShowTeacher] = useState(false);
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: C.overlayBgStrong, borderTop: `1px solid ${C.bd}`,
      padding: '10px 14px', zIndex: 5,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Left: surface metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.ink }}>{title}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: C.bl, background: C.blLt, borderRadius: 4, padding: '1px 6px' }}>{curriculumCode}</span>
            <span style={{ fontSize: 10, color: C.tx3, background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 4, padding: '1px 6px' }}>{topic}</span>
          </div>
          <div style={{ fontSize: 11, color: C.tx2, lineHeight: 1.5 }}>{description}</div>
        </div>

        {/* Right: intersection explanation */}
        <div style={{
          flex: '0 0 340px', background: C.amLt,
          border: `1px solid ${C.amMid}`, borderRadius: 7,
          padding: '8px 12px', fontSize: 11, color: C.ink, lineHeight: 1.6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <GitMerge size={14} style={{ color: C.am }} />
            <strong style={{ color: C.am, fontSize: 11 }}>Intersection Curve</strong>
          </div>
          {intersectionExplanation}
        </div>
      </div>

      {/* Teacher note toggle */}
      {teacherNote && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setShowTeacher(v => !v)}
            style={{ fontSize: 10, color: C.am, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <BookOpen size={10} /> Teacher Note {showTeacher ? '▲' : '▼'}
          </button>
          {showTeacher && (
            <div style={{ fontSize: 11, color: C.am, background: C.amLt, border: `1px solid ${C.amMid}`, borderRadius: 5, padding: '6px 9px', marginTop: 4 }}>
              {teacherNote}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// WELCOME OVERLAY
// =============================================================================

function WelcomeOverlay({ mode, onChip, C }: { mode: ExtCanvasMode; onChip: (p: string) => void; C: typeof LIGHT }) {
  const chips =
    mode === '3d'       ? CHIPS_3D :
    mode === 'dual'     ? CHIPS_DUAL :
    mode === 'stats'    ? CHIPS_STATS :
    mode === 'geometry' ? CHIPS_GEOMETRY :
    CHIPS_GRAPHING;

  const modeIcons: Record<string, React.ReactNode[]> = {
    dual:       [<Box key={0} size={18} />, <GitMerge key={1} size={18} />, <Box key={2} size={18} />],
    '3d':       [<Box key={0} size={18} />, <Globe key={1} size={18} />, <Waves key={2} size={18} />],
    stats:      [<BarChart3 key={0} size={18} />, <PieChart key={1} size={18} />, <Sigma key={2} size={18} />],
    geometry:   [<Compass key={0} size={18} />, <Ruler key={1} size={18} />, <Circle key={2} size={18} />],
    graphing:   [<TrendingUp key={0} size={18} />, <Sigma key={1} size={18} />, <FunctionSquare key={2} size={18} />],
    expression: [<Waves key={0} size={18} />, <Minus key={1} size={18} />, <Compass key={2} size={18} />],
  };
  const iconBgs: Record<string, string[]> = {
    dual:     [C.emLt, C.vlLt, C.emLt],
    '3d':     [C.emLt, C.blLt, C.emLt],
    stats:    [C.amLt, C.vlLt, C.blLt],
    geometry: [C.indLt, C.emLt, C.blLt],
    graphing: [C.blLt, C.indLt, C.emLt],
    expression: [C.blLt, C.indLt, C.emLt],
  };
  const iconColors: Record<string, string[]> = {
    dual:       [C.em, C.vl, C.em],
    '3d':       [C.em, C.bl, C.em],
    stats:      [C.am, C.vl, C.bl],
    geometry:   [C.ind, C.em, C.bl],
    graphing:   [C.bl, C.ind, C.em],
    expression: [C.bl, C.ind, C.em],
  };
  const modeHeading: Record<string, string> = {
    dual:       'Compare Two Surfaces',
    '3d':       'Explore 3D Surfaces',
    stats:      'Visualise Probability Distributions',
    geometry:   'Geometric Constructions — Step by Step',
    graphing:   'What shall we explore?',
    expression: 'Enter a live expression',
  };
  const modeSubtext: Record<string, string> = {
    dual:     'Ask to see any two surfaces side-by-side. MathCanvas renders both in WebGL and computes the amber intersection curve.',
    '3d':     'Describe any 3D surface in plain language. MathCanvas renders it as a true WebGL surface you can rotate and zoom.',
    stats:    'Pick a distribution family or describe one. Sliders let you adjust parameters (μ, σ, n, p, λ) and watch the curve update in real time.',
    geometry: 'Ask for a geometric construction. MathCanvas generates a step-by-step Construction Protocol — replay each step like a mathematical flip-book.',
    graphing: 'Describe any mathematical function or relationship. MathCanvas plots it with labeled axes, sliders for key parameters, and curriculum context.',
    expression: 'Type any function directly into the expression bar above and it renders instantly — no AI call needed.',
  };

  const icons  = modeIcons[mode]  ?? modeIcons.graphing;
  const bgs    = iconBgs[mode]    ?? iconBgs.graphing;
  const colors = iconColors[mode] ?? iconColors.graphing;
  const accentHover = mode === 'dual' ? C.vlLt : mode === 'stats' ? C.amLt : mode === 'geometry' ? C.indLt : C.blLt;
  const accentBorder = mode === 'dual' ? C.vlMid : mode === 'stats' ? C.amMid : mode === 'geometry' ? C.indMid : C.blMid;

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: C.bg, borderRadius: 8, zIndex: 10, padding: '24px 32px',
    }}>
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {icons.map((ic, i) => (
            <div key={i} style={{
              width: 40, height: 40, borderRadius: 10,
              background: bgs[i] ?? C.blLt,
              color: colors[i] ?? C.bl,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{ic}</div>
          ))}
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.ink, marginBottom: 6 }}>
          {modeHeading[mode] ?? 'What shall we explore?'}
        </div>
        <div style={{ fontSize: 12, color: C.tx2, lineHeight: 1.7, marginBottom: 16 }}>
          {modeSubtext[mode] ?? 'Describe any mathematical concept in plain language, or pick a quick-start card below.'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {chips.map(c => (
            <button
              key={c.label}
              onClick={() => onChip(c.prompt)}
              style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 600,
                background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 20,
                color: C.tx2, cursor: 'pointer', fontFamily: C.fs,
              }}
              onMouseEnter={e => {
                const btn = e.target as HTMLButtonElement;
                btn.style.background = accentHover;
                btn.style.borderColor = accentBorder;
              }}
              onMouseLeave={e => {
                const btn = e.target as HTMLButtonElement;
                btn.style.background = C.sf;
                btn.style.borderColor = C.bd;
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {mode === 'dual' && (
          <div style={{
            fontSize: 11, color: C.vl, background: C.vlLt, border: `1px solid ${C.vlMid}`,
            borderRadius: 7, padding: '8px 12px', display: 'inline-flex', alignItems: 'flex-start',
            gap: 6, textAlign: 'left',
          }}>
            <GitMerge size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <strong style={{ color: C.ink }}>Intersection algorithm:</strong> Marching squares
              on the difference surface d(x,y) = f₁(x,y) − f₂(x,y). The amber curve shows every
              point where both surfaces have the same height.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// RIGHT PANEL TABS
// =============================================================================

type RightTab = 'params' | 'issy' | 'info' | 'steps' | 'dist';

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function MathCanvasPage() {
  const mc = useMathCanvas();
  const C = useTokens();
  const MODES = useMemo(() => getModes(C), [C]);
  const mode = mc.mode as ExtCanvasMode;
  const [rightTab, setRightTab] = useState<RightTab>('params');
  const [zoom, setZoom] = useState(100);

  // ── Theme-aware style helpers ──────────────────────────────────────────
  const btnStyle: React.CSSProperties = useMemo(() => ({
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, border: `1px solid ${C.bd}`,
    borderRadius: 6, background: C.sf, cursor: 'pointer', color: C.tx2,
  }), [C]);

  const btnPrimaryStyle: React.CSSProperties = useMemo(() => ({
    display: 'inline-flex', alignItems: 'center', gap: 5,
    padding: '6px 14px', fontSize: 11, fontWeight: 700,
    background: C.bl, color: '#fff', border: 'none',
    borderRadius: 7, cursor: 'pointer', fontFamily: C.fs,
  }), [C]);

  // ── Calculator floater state ───────────────────────────────────────────
  const [calcOpen, setCalcOpen] = useState(false);

  // ── Fullscreen state ───────────────────────────────────────────────────
  // isFullscreen: canvas-only — all chrome (header, toolbar, panels, footer) hidden
  // isFocused:    focused mode — panels hidden, header + toolbar remain
  // hudVisible:   floating HUD controls fade in on mouse movement in fullscreen
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFocused,    setIsFocused]    = useState(false);
  const [hudVisible,   setHudVisible]   = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const hudTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-switch to mode-specific tab when a new result arrives
  useEffect(() => {
    if (mc.resultGeometry && mode === 'geometry') setRightTab('steps');
  }, [mc.resultGeometry, mode]);
  useEffect(() => {
    if (mc.resultStats && mode === 'stats') setRightTab('dist');
  }, [mc.resultStats, mode]);
  // Return to params tab when switching away from geometry/stats
  useEffect(() => {
    if (mode !== 'geometry' && mode !== 'stats') setRightTab('params');
  }, [mode]);

  // C key toggles the calculator floater — only when focus is NOT in an input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (e.key === 'c' || e.key === 'C') setCalcOpen(o => !o);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // ── Fullscreen keyboard handler ─────────────────────────────────────────
  // F          → canvas-only fullscreen (all chrome hidden)
  // Shift+F    → focused fullscreen (panels hidden, toolbar visible)
  // Escape     → exit either mode
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      if (e.key === 'Escape') {
        if (isFullscreen || isFocused) {
          setIsFullscreen(false);
          setIsFocused(false);
          if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
        }
      } else if (e.key === 'f' || e.key === 'F') {
        if (e.shiftKey) {
          // Shift+F — focused mode (panels hidden, toolbar stays)
          setIsFocused(f => !f);
          setIsFullscreen(false);
        } else {
          // F — canvas-only fullscreen
          const entering = !isFullscreen;
          setIsFullscreen(entering);
          setIsFocused(false);
          if (entering && containerRef.current) {
            containerRef.current.requestFullscreen().catch(() => {});
          } else if (!entering && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen, isFocused]);

  // ── Sync state when browser exits fullscreen natively (e.g. user presses
  //    Escape directly via browser — without going through our handler) ────
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── HUD fade: show on mouse movement, auto-hide after 2s idle ───────────
  useEffect(() => {
    if (!isFullscreen) { setHudVisible(false); return; }
    const onMove = () => {
      setHudVisible(true);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
      hudTimerRef.current = setTimeout(() => setHudVisible(false), 2000);
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (hudTimerRef.current) clearTimeout(hudTimerRef.current);
    };
  }, [isFullscreen]);

  // ── Resizable panels ──────────────────────────────────────────────────────
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(260);
  const dragging = useRef<'left' | 'right' | null>(null);
  const dragStartX = useRef(0);
  const dragStartW = useRef(0);

  const onDragStart = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    dragging.current = side;
    dragStartX.current = e.clientX;
    dragStartW.current = side === 'left' ? leftWidth : rightWidth;
  }, [leftWidth, rightWidth]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const dx = e.clientX - dragStartX.current;
      const newW = Math.max(180, Math.min(450,
        dragging.current === 'left' ? dragStartW.current + dx : dragStartW.current - dx
      ));
      if (dragging.current === 'left') setLeftWidth(newW);
      else setRightWidth(newW);
    };
    const onUp = () => { dragging.current = null; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  const has2DResult   = !!mc.result2D;
  const has3DResult   = !!mc.result3D;
  const hasDualResult = !!mc.resultDual;

  const hasCASResult  = !!mc.casResponse;
  const hasExprResult = !!mc.liveExpression && !mc.liveExpression.error;

  const hasResult = mode === '3d' ? has3DResult
    : mode === 'dual' ? hasDualResult
    : mode === 'cas' ? hasCASResult
    : mode === 'expression' ? hasExprResult
    : has2DResult;
  const showWelcome   = !hasResult && !mc.isLoading && !mc.error;
  const show3D        = (mode === '3d' || (mode === 'cas' && has3DResult)) && has3DResult && mc.viewMode === '3d';
  const showDual      = mode === 'dual' && hasDualResult;
  const showExpression = mode === 'expression' && hasExprResult;
  // Use resolvedSvg from the hook — for geometry mode this tracks the current
  // construction step's cumulative SVG; for all other 2D modes it's result2D.svg.
  // This is the same pattern as resolvedSurface for 3D mode.
  const activeSvg = mc.resolvedSvg ?? null;
  const svgResult = (mode !== '3d' && mode !== 'dual' && mode !== 'cas' && mode !== 'expression' && activeSvg)
    ? { ...mc.result2D!, svg: activeSvg }
    : null;

  // Active quick-start chips for the left panel
  const quickChips = mode === '3d' ? CHIPS_3D
    : mode === 'dual' ? CHIPS_DUAL
    : mode === 'cas' ? CHIPS_CAS
    : mode === 'expression' ? CHIPS_EXPRESSION
    : CHIPS_2D;

  return (
    <div
      ref={containerRef}
      style={{
        display: 'grid',
        gridTemplateRows: isFullscreen
          ? '1fr'
          : isFocused
            ? '52px 42px 1fr 32px'
            : '52px 42px 1fr 32px',
        gridTemplateColumns: (isFullscreen || isFocused)
          ? '1fr'
          : `${leftWidth}px 4px 1fr 4px ${rightWidth}px`,
        height: isFullscreen ? '100vh' : 'calc(100vh - 52px)',
        overflow: 'hidden',
        fontFamily: C.fs,
        color: C.tx,
        background: C.bg,
      }}
    >

      {/* ── HEADER ROW — hidden in canvas-only fullscreen ──────────────────── */}
      {!isFullscreen && <div style={{
        gridColumn: '1 / -1', background: C.sf,
        borderBottom: `1px solid ${C.bd}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)', zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: C.blLt, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.bl }}><Compass size={16} /></div>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.ink }}>MathCanvas</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: C.bl, background: C.blLt, borderRadius: 4, padding: '2px 6px' }}>AI-Native</span>
        </div>

        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 2, marginLeft: 8 }}>
          {MODES.map(m => (
            <button
              key={m.id}
              onClick={() => mc.switchMode(m.id as CanvasMode)}
              style={{
                padding: '5px 12px', fontSize: 11, fontWeight: 600,
                borderRadius: 6, border: 'none', cursor: 'pointer',
                background: mode === m.id ? m.color : 'transparent',
                color: mode === m.id ? '#fff' : C.tx2,
                fontFamily: C.fs, transition: 'all 0.15s',
                display: 'flex', alignItems: 'center', gap: 4,
              }}
            >
              {m.icon} {m.label}
            </button>
          ))}
        </div>

        {/* 2D/3D view toggle (single 3D mode only) */}
        {mode === '3d' && has3DResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, padding: '3px 8px', background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 7 }}>
            <span style={{ fontSize: 10, color: C.tx3, fontWeight: 600 }}>View:</span>
            <button
              onClick={mc.toggleViewMode}
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: mc.viewMode === '3d' ? C.em : 'transparent',
                color: mc.viewMode === '3d' ? '#fff' : C.tx2, fontFamily: C.fs,
              }}
            >
              <Box size={10} style={{ marginRight: 3 }} /> WebGL
            </button>
            <button
              onClick={mc.toggleViewMode}
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: mc.viewMode === '2d' ? C.ind : 'transparent',
                color: mc.viewMode === '2d' ? '#fff' : C.tx2, fontFamily: C.fs,
              }}
            >
              <Compass size={10} style={{ marginRight: 3 }} /> 2D View
            </button>
          </div>
        )}

        {/* Dual mode legend badge */}
        {mode === 'dual' && hasDualResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, padding: '3px 8px', background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 7, fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.am, flexShrink: 0 }} />
            <span style={{ color: C.tx2, fontWeight: 600 }}>{mc.resultDual?.compound.surface1.appearance.label ?? 'Surface 1'}</span>
            <span style={{ color: C.tx3 }}>·</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.vl, flexShrink: 0 }} />
            <span style={{ color: C.tx2, fontWeight: 600 }}>{mc.resultDual?.compound.surface2.appearance.label ?? 'Surface 2'}</span>
            <span style={{ color: C.tx3 }}>·</span>
            <span style={{ color: C.am, fontWeight: 700 }}>∩ amber</span>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: C.tx3 }}>
          {mc.sc.student.name} · Year {mc.sc.student.yearLevel}
        </span>
      </div>}

      {/* ── TOOLBAR ROW — hidden in canvas-only fullscreen ────────────────── */}
      {!isFullscreen && <div style={{
        gridColumn: '1 / -1', background: C.sf,
        borderBottom: `1px solid ${C.bd}`,
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0, background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 7, overflow: 'hidden' }}>
          <span style={{ padding: '0 10px', fontSize: 12, color: C.tx3, fontFamily: C.fm, flexShrink: 0 }}>
            {mode === '3d' ? 'z = f(x,y)' : mode === 'dual' ? 'f₁ ∩ f₂' : 'f(x) ='}
          </span>
          <input
            value={mc.intent}
            onChange={e => mc.setIntent(e.target.value)}
            onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') mc.visualise(mc.intent); }}
            placeholder={
              mode === 'dual'
                ? 'describe two surfaces e.g. "paraboloid and a plane, find their intersection"'
                : mode === '3d'
                  ? 'describe a 3D surface e.g. "saddle surface z = x² − y²"'
                  : 'describe or type e.g. y = x²-2x+1'
            }
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, background: 'transparent', padding: '0 8px', fontFamily: C.fs, color: C.ink }}
          />
        </div>

        <button
          onClick={() => mc.visualise(mc.intent)}
          disabled={mc.isLoading || !mc.intent.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            background: mc.isLoading ? C.bd : mode === 'dual' ? C.vl : C.bl,
            color: mc.isLoading ? C.tx3 : '#fff',
            border: 'none', borderRadius: 7, cursor: mc.isLoading ? 'not-allowed' : 'pointer',
            fontFamily: C.fs, transition: 'background 0.15s',
          }}
        >
          {mc.isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {mc.isLoading ? 'Thinking…' : '⌘↵ Visualise'}
        </button>

        {mode !== '3d' && mode !== 'dual' && (
          <>
            <div style={{ width: 1, height: 20, background: C.bd, margin: '0 4px' }} />
            <button onClick={() => setZoom(z => Math.max(25, z - 10))} style={{ ...btnStyle }}><ZoomOut size={13} /></button>
            <span style={{ fontSize: 11, color: C.tx2, minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(400, z + 10))} style={{ ...btnStyle }}><ZoomIn size={13} /></button>
          </>
        )}

        <div style={{ width: 1, height: 20, background: C.bd, margin: '0 4px' }} />
        <button onClick={mc.clearCanvas} title="Clear" style={{ ...btnStyle }}><Trash2 size={13} /></button>

        <div style={{ width: 1, height: 20, background: C.bd, margin: '0 4px' }} />
        <button
          onClick={() => setCalcOpen(o => !o)}
          title={calcOpen ? 'Close calculator' : 'Open calculator [C]'}
          style={{
            ...btnStyle,
            background: calcOpen ? C.blLt : 'transparent',
            color: calcOpen ? C.bl : C.tx2,
            border: calcOpen ? `1px solid ${C.blMid}` : '1px solid transparent',
            borderRadius: 6, padding: '4px 8px',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
          }}
        >
          <Calculator size={13} />
        </button>

        {/* Fullscreen controls — always at far right of toolbar */}
        <div style={{ width: 1, height: 20, background: C.bd, margin: '0 4px' }} />
        {/* Focused mode (Shift+F) — panels hidden, toolbar stays */}
        <button
          onClick={() => { setIsFocused(f => !f); setIsFullscreen(false); }}
          title={isFocused ? 'Exit focused mode [Shift+F]' : 'Focused mode — hide panels [Shift+F]'}
          style={{
            ...btnStyle,
            background: isFocused ? C.amLt : 'transparent',
            color: isFocused ? C.am : C.tx2,
            border: isFocused ? `1px solid ${C.amMid}` : '1px solid transparent',
            borderRadius: 6, padding: '4px 8px',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
          }}
        >
          <Expand size={13} />
        </button>
        {/* Canvas-only fullscreen (F) */}
        <button
          onClick={() => {
            const entering = !isFullscreen;
            setIsFullscreen(entering);
            setIsFocused(false);
            if (entering && containerRef.current) {
              containerRef.current.requestFullscreen().catch(() => {});
            } else if (!entering && document.fullscreenElement) {
              document.exitFullscreen().catch(() => {});
            }
          }}
          title={isFullscreen ? 'Exit fullscreen [F or Esc]' : 'Canvas fullscreen [F]'}
          style={{
            ...btnStyle,
            background: isFullscreen ? C.blLt : 'transparent',
            color: isFullscreen ? C.bl : C.tx2,
            border: isFullscreen ? `1px solid ${C.blMid}` : '1px solid transparent',
            borderRadius: 6, padding: '4px 8px',
            display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700,
          }}
        >
          {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
        </button>
      </div>}

      {/* ── LEFT PANEL — hidden in fullscreen and focused mode ────────────── */}
      {!isFullscreen && !isFocused && <div style={{
        gridColumn: '1', background: C.sf,
        overflowY: 'auto', padding: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* BKT mastery mini-bar */}
        <div style={{ padding: '10px 12px', background: C.bg, borderRadius: 8, border: `1px solid ${C.bd}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.tx3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mastery</div>
          {[
            { label: 'Functions', val: mc.sc.mastery.functions, color: C.bl },
            { label: 'Geometry',  val: mc.sc.mastery.geometry,  color: C.ind },
            { label: 'Statistics',val: mc.sc.mastery.statistics, color: C.em },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: C.tx2, marginBottom: 2 }}>
                <span>{label}</span><span style={{ fontWeight: 700, color }}>{Math.round(val * 100)}%</span>
              </div>
              <div style={{ height: 4, background: C.bd, borderRadius: 99 }}>
                <div style={{ height: 4, background: color, borderRadius: 99, width: `${val * 100}%`, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick starts */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.tx3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Quick Start</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {quickChips.map(c => (
              <button
                key={c.label}
                onClick={() => mc.quickIntent(c.prompt)}
                style={{
                  textAlign: 'left', padding: '7px 10px', fontSize: 11,
                  background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 6,
                  color: C.tx2, cursor: 'pointer', fontFamily: C.fs, fontWeight: 500,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.background = mode === 'dual' ? C.vlLt : C.blLt;
                  btn.style.borderColor = mode === 'dual' ? C.vlMid : C.blMid;
                }}
                onMouseLeave={e => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.background = C.bg;
                  btn.style.borderColor = C.bd;
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>}

      {/* ── LEFT DRAG HANDLE — hidden in fullscreen and focused mode ─────── */}
      {!isFullscreen && !isFocused && <div
        onMouseDown={e => onDragStart('left', e)}
        style={{
          gridColumn: '2', cursor: 'col-resize', background: C.bd,
          transition: 'background 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = C.bl)}
        onMouseLeave={e => (e.currentTarget.style.background = C.bd)}
      >
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.5,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: C.tx3 }} />
          ))}
        </div>
      </div>}

      {/* ── CANVAS VIEWPORT ────────────────────────────────────────────────── */}
      <div style={{ gridColumn: (isFullscreen || isFocused) ? '1' : '3', position: 'relative', overflow: 'hidden', background: C.bg }}>

        {/* ── Calculator floater — draggable, minimisable ────────────────── */}
        <MathCanvasCalculatorFloater
          isOpen={calcOpen}
          onClose={() => setCalcOpen(false)}
          onResultReady={(result) => {
            // Append result to the intent input so the student can pipe
            // a computed value directly into a visualisation prompt.
            // e.g. they compute "2*π" → 6.283... → type "plot sin(x) with period 6.283..."
            mc.setIntent(prev =>
              prev ? `${prev} ${result}` : result
            );
          }}
        />

        {/* ── Fullscreen HUD ─────────────────────────────────────────────────
            Only visible in canvas-only fullscreen (isFullscreen=true).
            Zoom controls and mode badge fade with mouse idle after 2s.
            Exit button never fades — always accessible.
            Analogy: video player controls that retreat when you stop moving,
            but the pause button is always reachable. ─────────────────────── */}
        {isFullscreen && (
          <div style={{
            position: 'absolute', bottom: 20, right: 20,
            zIndex: 300,
            display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8,
            pointerEvents: 'none', // container itself is non-blocking
          }}>
            {/* Mode badge + zoom — fade on idle */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 6,
              opacity: hudVisible ? 1 : 0.12,
              transition: 'opacity 0.5s ease',
              pointerEvents: hudVisible ? 'auto' : 'none',
            }}>
              {/* Mode badge */}
              <div style={{
                padding: '4px 10px', borderRadius: 20,
                background: 'rgba(26,35,50,0.88)',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${C.bd}`,
                fontSize: 11, fontWeight: 700, color: C.tx2, fontFamily: C.fs,
              }}>
                {mode === '3d' ? '3D Surface'
                  : mode === 'dual' ? 'Dual Surface'
                  : mode === 'stats' ? 'Statistics'
                  : mode === 'geometry' ? 'Geometry'
                  : mode === 'cas' ? 'CAS'
                  : 'Graphing'}
              </div>
              {/* Zoom controls */}
              {(mode !== '3d' && mode !== 'dual') && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(26,35,50,0.88)',
                  backdropFilter: 'blur(6px)',
                  border: `1px solid ${C.bd}`,
                  borderRadius: 8, padding: '3px 6px',
                }}>
                  <button
                    onClick={() => setZoom(z => Math.max(25, z - 10))}
                    style={{ background: 'none', border: 'none', color: C.tx2, cursor: 'pointer', padding: '2px 4px', fontSize: 14, lineHeight: 1 }}
                  >−</button>
                  <span style={{ fontSize: 11, color: C.tx2, minWidth: 32, textAlign: 'center', fontFamily: C.fm }}>{zoom}%</span>
                  <button
                    onClick={() => setZoom(z => Math.min(400, z + 10))}
                    style={{ background: 'none', border: 'none', color: C.tx2, cursor: 'pointer', padding: '2px 4px', fontSize: 14, lineHeight: 1 }}
                  >+</button>
                </div>
              )}
            </div>

            {/* Exit fullscreen — always visible at full opacity, always clickable */}
            <button
              onClick={() => {
                setIsFullscreen(false);
                if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
              }}
              title="Exit fullscreen [Esc]"
              style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px',
                background: 'rgba(26,35,50,0.92)',
                backdropFilter: 'blur(8px)',
                border: `1px solid ${C.bdBright}`,
                borderRadius: 8,
                color: C.tx, fontSize: 12, fontWeight: 700,
                cursor: 'pointer', fontFamily: C.fs,
                boxShadow: '0 2px 12px rgba(0,0,0,0.4)',
              }}
            >
              <Minimize2 size={13} />
              Exit Fullscreen
              <span style={{ fontSize: 10, color: C.tx3, fontFamily: C.fm, marginLeft: 2 }}>Esc</span>
            </button>
          </div>
        )}

        {showWelcome && <WelcomeOverlay mode={mode} onChip={mc.quickIntent} C={C} />}

        {mc.isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(247,248,248,0.92)', zIndex: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <Loader2 size={32} style={{ color: mode === 'dual' ? C.vl : C.bl, animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: C.ink }}>Computing visualization…</div>
              <div style={{ fontSize: 11, color: C.tx2, marginTop: 3 }}>
                {mode === 'dual' ? 'Computing intersection curve…' : 'Aligning to curriculum'}
              </div>
            </div>
          </div>
        )}

        {mc.error && !mc.isLoading && !hasResult && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg, zIndex: 15 }}>
            <div style={{ textAlign: 'center', maxWidth: 300 }}>
              <AlertTriangle size={32} style={{ color: C.am, marginBottom: 8 }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: C.ink, marginBottom: 4 }}>Visualization failed</div>
              <div style={{ fontSize: 11, color: C.tx2, marginBottom: 14 }}>{mc.error}</div>
              <button onClick={() => mc.visualise(mc.intent)} style={{ ...btnPrimaryStyle }}>
                <RefreshCw size={12} /> Retry
              </button>
            </div>
          </div>
        )}

        {/* ── SINGLE 3D SURFACE ── */}
        {show3D && mc.resolvedSurface && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <MathCanvas3DSurface
              surface={mc.resolvedSurface}
              paramOverrides={mc.paramValues}
              colorScheme={mc.result3D?.colorScheme ?? '3d_heat'}
              className="w-full h-full"
            />
            {mc.result3D && (
              <SurfaceBadge
                title={mc.result3D.title}
                description={mc.result3D.description}
                topic={mc.result3D.topic}
                curriculumCode={mc.result3D.curriculumCode}
                teacherNote={mc.result3D.teacherNote}
                C={C}
              />
            )}
          </div>
        )}

        {/* ── DUAL SURFACE ── */}
        {showDual && mc.resolvedDual && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
            {/* Canvas area — leaves room for info panel at bottom */}
            <div style={{ flex: 1, position: 'relative', minHeight: 0 }}>
              <MathCanvasDualSurface
                compound={mc.resolvedDual.compound}
                paramOverrides={mc.paramValues}
                className="w-full h-full"
              />
            </div>
            {/* Intersection info panel */}
            <DualInfoPanel
              title={mc.resultDual!.compound.title}
              description={mc.resultDual!.compound.description}
              intersectionExplanation={mc.resultDual!.compound.intersectionExplanation}
              curriculumCode={mc.resultDual!.compound.curriculumCode}
              topic={mc.resultDual!.compound.topic}
              teacherNote={mc.resultDual!.compound.teacherNote}
              C={C}
            />
          </div>
        )}

        {/* ── 2D SVG VIEW ── */}
        {svgResult && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: 'center',
                transition: 'opacity 0.2s, transform 0.2s',
                opacity: mc.isRerendering ? 0.65 : 1,
              }}
              dangerouslySetInnerHTML={{ __html: svgResult.svg }}
            />
            {/* Re-render pulse — visible while 650ms debounce re-render is in flight.
                Dims the SVG slightly so the student knows the canvas is updating.
                Disappears the moment the fresh SVG arrives. */}
            {mc.isRerendering && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '4px 10px', borderRadius: 20,
                background: C.blLt, border: `1px solid ${C.blMid}`,
                fontSize: 10, fontWeight: 700, color: C.bl,
                pointerEvents: 'none',
              }}>
                <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} />
                Updating…
              </div>
            )}
            <SurfaceBadge
              title={svgResult.title}
              description={svgResult.description}
              topic={svgResult.topic}
              curriculumCode={svgResult.curriculumCode}
              teacherNote={svgResult.teacherNote}
              C={C}
            />
          </div>
        )}

        {/* ── Expression bar (P3) — floats at top of canvas ── */}
        {mode === 'expression' && (
          <div style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 20 }}>
            <MathCanvasExpressionBar
              value={mc.liveExpression?.raw ?? ''}
              onExpressionChange={mc.updateLiveExpression}
              onExpressionCommit={(raw) => {
                mc.commitLiveExpression(raw);
              }}
              onClear={() => mc.updateLiveExpression('')}
              liveExpression={mc.liveExpression}
              isRendering={mc.isLoading}
              visible={true}
            />
          </div>
        )}

        {/* ── Expression 3D surface render (P3) ── */}
        {showExpression && mc.expressionSurface && (
          <div style={{ position: 'absolute', inset: 0 }}>
            <MathCanvas3DSurface
              surface={{
                type: 'explicit', kind: 'polynomial_2',
                coefficients: {}, domain: { xMin: -5, xMax: 5, yMin: -5, yMax: 5 }, resolution: 60,
              } as never}
              paramOverrides={{}}
              precomputedVertices={mc.expressionSurface.vertices}
              precomputedResolution={mc.expressionSurface.resolution}
              colorScheme="3d_heat"
            />
            <div style={{
              position: 'absolute', bottom: 12, left: 12,
              padding: '6px 10px', borderRadius: 6, fontSize: 11,
              background: 'rgba(15,20,25,0.75)', color: '#fff',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              z = {mc.liveExpression?.canonical}
            </div>
          </div>
        )}
      </div>

      {/* ── RIGHT DRAG HANDLE — hidden in fullscreen and focused mode ────── */}
      {!isFullscreen && !isFocused && <div
        onMouseDown={e => onDragStart('right', e)}
        style={{
          gridColumn: '4', cursor: 'col-resize', background: C.bd,
          transition: 'background 0.15s',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          position: 'relative',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = C.bl)}
        onMouseLeave={e => (e.currentTarget.style.background = C.bd)}
      >
        <div style={{
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          display: 'flex', flexDirection: 'column', gap: 2, opacity: 0.5,
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: 3, height: 3, borderRadius: '50%', background: C.tx3 }} />
          ))}
        </div>
      </div>}

      {/* ── RIGHT PANEL — hidden in fullscreen and focused mode ───────────── */}
      {!isFullscreen && !isFocused && <div style={{ gridColumn: '5', background: C.sf, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${C.bd}` }}>
          {([
            { id: 'params' as RightTab, label: 'Parameters', icon: <Layers size={11} /> },
            // Construction Protocol tab — geometry mode only, when a response exists
            ...(mode === 'geometry' && mc.resultGeometry
              ? [{ id: 'steps' as RightTab, label: 'Steps', icon: <Circle size={11} /> }]
              : []),
            // Distribution tab — stats mode only, when a response exists
            ...(mode === 'stats' && mc.resultStats
              ? [{ id: 'dist' as RightTab, label: 'Dist', icon: <BarChart3 size={11} /> }]
              : []),
            { id: 'issy' as RightTab, label: 'Issy', icon: <Brain size={11} /> },
            { id: 'info' as RightTab, label: 'Info', icon: <Info size={11} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '8px 4px', fontSize: 11, fontWeight: rightTab === tab.id ? 700 : 500,
                border: 'none', borderBottom: rightTab === tab.id ? `2px solid ${
                  tab.id === 'steps' ? C.ind : tab.id === 'dist' ? C.vl : C.bl
                }` : '2px solid transparent',
                background: 'none', color: rightTab === tab.id ? (
                  tab.id === 'steps' ? C.ind : tab.id === 'dist' ? C.vl : C.bl
                ) : C.tx2,
                cursor: 'pointer', fontFamily: C.fs,
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
          {/* CAS task panel — shown in CAS mode instead of params */}
          {mode === 'cas' && mc.casResponse && mc.casSession && rightTab === 'params' && (
            <MathCanvasCASPanel
              tasks={mc.casResponse.tasks}
              session={mc.casSession}
              introduction={mc.casResponse.introduction}
              onSubmitAnswer={mc.submitCASAnswer}
              onComplete={(earned, total) => {
                mc.sc.onMasteryEvent?.({
                  type: 'cas_session_complete',
                  topic: mc.casResponse!.curriculum?.strand ?? 'CAS',
                  studentId: mc.sc.student.id,
                });
              }}
            />
          )}

          {/* ── Construction Protocol tab — geometry mode ── */}
          {rightTab === 'steps' && mode === 'geometry' && (
            <MathCanvasGeometryPanel
              state={mc.constructionState}
              onStepChange={mc.goToConstructionStep}
              onPlayPause={mc.toggleConstructionPlay}
              onReset={mc.resetConstruction}
            />
          )}

          {/* ── Distribution metadata tab — stats mode ── */}
          {rightTab === 'dist' && mode === 'stats' && mc.resultStats && (
            <MathCanvasStatsPanel response={mc.resultStats} />
          )}

          {/* Standard params — shown in all modes except CAS */}
          {rightTab === 'params' && mode !== 'cas' && (
            <ParamPanel
              parameters={
                mode === 'dual'
                  ? (mc.resultDual?.compound.parameters ?? [])
                  : mode === '3d'
                    ? (mc.result3D?.parameters ?? [])
                    : (mc.result2D?.parameters ?? [])
              }
              values={mc.paramValues}
              onChange={mc.updateParam}
              isDual={mode === 'dual'}
              C={C}
            />
          )}

          {rightTab === 'issy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.tx3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ask Issy</div>
              {[
                { label: 'Explain this', icon: <Lightbulb size={12} />, prompt: 'explain' },
                { label: 'Scaffold me', icon: <Layers size={12} />, prompt: 'scaffold' },
                { label: 'Challenge me', icon: <Target size={12} />, prompt: 'challenge' },
                { label: 'Curriculum link', icon: <Library size={12} />, prompt: 'curriculum' },
                ...(mode === 'dual' ? [{ label: 'Explain intersection', icon: <GitMerge size={12} />, prompt: 'intersection' }] : []),
              ].map(({ label, icon }) => (
                <button key={label} style={{
                  textAlign: 'left', padding: '8px 10px', fontSize: 11, background: C.bg,
                  border: `1px solid ${C.bd}`, borderRadius: 6, color: C.tx2,
                  cursor: 'pointer', fontFamily: C.fs,
                  display: 'flex', alignItems: 'center', gap: 6,
                }}>
                  {icon} {label}
                </button>
              ))}
              {/* Suggested exploration from whichever result is active */}
              {(mc.result3D?.suggestedExploration ?? mc.resultDual?.compound.suggestedExploration) && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: C.blLt, border: `1px solid ${C.blMid}`, borderRadius: 7, fontSize: 11, color: C.ink, lineHeight: 1.6 }}>
                  <strong style={{ color: C.bl, display: 'inline-flex', alignItems: 'center', gap: 4 }}><MessageCircle size={12} /> Explore: </strong>
                  {mc.result3D?.suggestedExploration ?? mc.resultDual?.compound.suggestedExploration}
                </div>
              )}
            </div>
          )}

          {rightTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.tx3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session Info</div>

              {mode === 'dual' && mc.resultDual ? (
                <>
                  {[
                    ['Mode', 'Dual Surface (⊕)'],
                    ['Surface 1', mc.resultDual.compound.surface1.appearance.label],
                    ['Surface 2', mc.resultDual.compound.surface2.appearance.label],
                    ['Topic', mc.resultDual.compound.topic],
                    ['Code', mc.resultDual.compound.curriculumCode],
                    ['Algorithm', 'Marching Squares'],
                    ['Renderer', 'WebGL / Three.js'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: C.tx3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginTop: 2 }}>{v}</div>
                    </div>
                  ))}
                </>
              ) : mode === '3d' && mc.result3D ? (
                <>
                  {[
                    ['Surface', 'kind' in mc.result3D.surface ? (mc.result3D.surface as { kind: string }).kind : mc.result3D.surface.type],
                    ['Type', mc.result3D.surface.type],
                    ['Topic', mc.result3D.topic],
                    ['Code', mc.result3D.curriculumCode],
                    ['Renderer', 'WebGL / Three.js'],
                    ['Coefficients', Object.entries(mc.result3D.surface.coefficients).map(([k, v]) => `${k}=${v}`).join(', ')],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background: C.bg, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: C.tx3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: C.ink, marginTop: 2, fontFamily: typeof v === 'string' && v.includes('=') ? C.fm : C.fs }}>{v}</div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize: 11, color: C.tx3 }}>Visualise something to see session info.</div>
              )}
            </div>
          )}
        </div>
      </div>}

      {/* ── FOOTER — hidden in fullscreen ─────────────────────────────────── */}
      {!isFullscreen && <div style={{
        gridColumn: '1 / -1',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 6,
        fontSize: 10, color: C.tx3,
        borderTop: `1px solid ${C.bd}`, background: C.sf,
        padding: '0 16px',
      }}>
        <span>&copy; 2026 Swotsmart Holdings All rights reserved</span>
        <span>&middot;</span>
        <a href="/terms" style={{ color: C.tx3, textDecoration: 'none' }}>Terms of Use</a>
        <span>|</span>
        <a href="/privacy" style={{ color: C.tx3, textDecoration: 'none' }}>Privacy Policy</a>
      </div>}
    </div>
  );
}

