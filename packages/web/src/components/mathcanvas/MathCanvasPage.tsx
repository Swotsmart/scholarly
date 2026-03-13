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

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Loader2, BarChart2, Compass, Box, BarChart3, Calculator, FlaskConical,
  RotateCcw, Play, Layers, Info, Brain, BookOpen,
  ZoomIn, ZoomOut, Trash2, RefreshCw, GitMerge, Sigma,
} from 'lucide-react';
import { useMathCanvas } from '@/hooks/use-mathcanvas';
import type { CanvasMode } from '@/types/mathcanvas';

// ── Lazy-load WebGL renderers ─────────────────────────────────────────────────

const MathCanvas3DSurface = dynamic(
  () => import('@/components/mathcanvas/MathCanvas3DSurface').then(m => ({ default: m.MathCanvas3DSurface })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full items-center justify-center" style={{ minHeight: 400, background: '#f7f8f8', borderRadius: 8 }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#1e9df1' }} />
          <p style={{ fontSize: 12, color: '#8b99a4', fontFamily: 'Open Sans, sans-serif' }}>Loading WebGL renderer…</p>
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
      <div className="flex h-full items-center justify-center" style={{ minHeight: 400, background: '#f7f8f8', borderRadius: 8 }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: '#10b981' }} />
          <p style={{ fontSize: 12, color: '#8b99a4', fontFamily: 'Open Sans, sans-serif' }}>Loading dual surface renderer…</p>
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
// DESIGN TOKENS
// =============================================================================

const T = {
  bl: '#1e9df1', blDk: '#1580c8', blLt: '#e3f3fd', blMid: '#b8ddf8',
  ink: '#0f1419', ink2: '#1c2631', ind: '#6366f1', vio: '#8b5cf6',
  em: '#10b981', emLt: '#ecfdf5', emMid: '#a7f3d0',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  rd: '#ef4444',
  bg: '#f7f8f8', sf: '#ffffff', bd: '#e1eaef', bd2: '#c5d8e4', mt: '#e5e5e6',
  tx: '#0f1419', tx2: '#536471', tx3: '#8b99a4',
  // Dual-mode accent: violet for surface 2
  vl: '#7c3aed', vlLt: '#f5f3ff', vlMid: '#ddd6fe',
  fs: "'Open Sans', system-ui, sans-serif",
  fm: "'JetBrains Mono', Menlo, monospace",
};

// =============================================================================
// MODE CONFIG — 7 modes total
// =============================================================================

// We use a type assertion here because 'dual' and 'expression' extend the base CanvasMode
type ExtCanvasMode = CanvasMode | 'dual' | 'expression';

const MODES: { id: ExtCanvasMode; label: string; icon: React.ReactNode; color: string }[] = [
  { id: 'graphing', label: '📈 Graphing',   icon: <BarChart2 size={14} />, color: T.bl },
  { id: 'geometry', label: '📐 Geometry',   icon: <Compass size={14} />,   color: T.ind },
  { id: '3d',       label: '🧊 3D',          icon: <Box size={14} />,       color: T.em },
  { id: 'dual',     label: '⊕ Dual',         icon: <GitMerge size={14} />,  color: T.vl },
  { id: 'stats',    label: '📊 Statistics', icon: <BarChart3 size={14} />,  color: T.am },
  { id: 'cas',        label: '𝑓 CAS',        icon: <Calculator size={14} />,  color: T.vio },
  { id: 'expression', label: '∿ Expression', icon: <Sigma size={14} />,      color: T.em },
];

// =============================================================================
// QUICK-START CHIPS
// =============================================================================

const CHIPS_2D = [
  { label: 'sine wave',  prompt: 'Plot y=sin(x) clearly showing its period T=2π and amplitude=1' },
  { label: 'derivative', prompt: 'Plot sin(x) and cos(x), draw tangent line at x=a with slope=cos(a)' },
  { label: 'normal',     prompt: 'Normal distribution bell curve with sliders for μ and σ, shade area between μ±σ' },
  { label: 'quadratic',  prompt: 'Plot y=x²-4x+3 showing roots, vertex, and axis of symmetry' },
  { label: 'Lissajous',  prompt: 'Lissajous figure x=sin(at), y=sin(bt+δ) with sliders for a, b, δ' },
];

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
}

function ParamPanel({ parameters, values, onChange, isDual }: ParamPanelProps) {
  if (!parameters.length) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: T.tx3, fontSize: 12 }}>
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
            fontSize: 10, fontWeight: 700, color: T.tx3,
            textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            display: 'flex', alignItems: 'center', gap: 5,
          }}>
            {/* In dual mode, colour-code the group header by surface target */}
            {isDual && params[0]?.surfaceTarget === 1 && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.am, flexShrink: 0 }} />
            )}
            {isDual && params[0]?.surfaceTarget === 2 && (
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: T.vl, flexShrink: 0 }} />
            )}
            {groupName}
          </div>
          {params.map(p => {
            const val = values[p.name] ?? p.min;
            const accent = isDual && p.surfaceTarget === 2 ? T.vl : T.bl;
            return (
              <div key={p.name} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: T.tx2 }}>{p.label}</span>
                  <input
                    type="number"
                    value={val.toFixed(2)}
                    step={p.step}
                    min={p.min}
                    max={p.max}
                    onChange={e => onChange(p.name, Math.max(p.min, Math.min(p.max, parseFloat(e.target.value) || p.min)))}
                    style={{
                      width: 60, fontSize: 11, fontFamily: T.fm, fontWeight: 600,
                      textAlign: 'right', border: `1px solid ${T.bd}`, borderRadius: 4,
                      padding: '2px 5px', color: accent, background: T.blLt,
                    }}
                  />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 10, color: T.tx3, width: 28 }}>{p.min}</span>
                  <input
                    type="range"
                    min={p.min}
                    max={p.max}
                    step={p.step}
                    value={val}
                    onChange={e => onChange(p.name, parseFloat(e.target.value))}
                    style={{ flex: 1, accentColor: accent }}
                  />
                  <span style={{ fontSize: 10, color: T.tx3, width: 28, textAlign: 'right' }}>{p.max}</span>
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
}

function SurfaceBadge({ title, description, topic, curriculumCode, teacherNote }: SurfaceBadgeProps) {
  const [showTeacher, setShowTeacher] = useState(false);
  return (
    <div style={{
      position: 'absolute', bottom: 40, left: 12, right: 12,
      background: 'rgba(255,255,255,0.95)', borderRadius: 8,
      border: `1px solid ${T.bd}`, padding: '10px 14px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      backdropFilter: 'blur(4px)', zIndex: 5,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{title}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: T.bl, background: T.blLt, borderRadius: 4, padding: '1px 6px' }}>{curriculumCode}</span>
        <span style={{ fontSize: 10, color: T.tx3, background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 4, padding: '1px 6px' }}>{topic}</span>
      </div>
      <div style={{ fontSize: 11, color: T.tx2, lineHeight: 1.5 }}>{description}</div>
      {teacherNote && (
        <>
          <button
            onClick={() => setShowTeacher(v => !v)}
            style={{ fontSize: 10, color: T.am, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3, marginTop: 6 }}
          >
            <BookOpen size={10} /> Teacher Note {showTeacher ? '▲' : '▼'}
          </button>
          {showTeacher && (
            <div style={{ fontSize: 11, color: T.am, background: T.amLt, border: `1px solid ${T.amMid}`, borderRadius: 5, padding: '6px 9px', marginTop: 4 }}>
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
}

function DualInfoPanel({
  title, description, intersectionExplanation, curriculumCode, topic, teacherNote,
}: DualInfoPanelProps) {
  const [showTeacher, setShowTeacher] = useState(false);
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      background: 'rgba(255,255,255,0.96)', borderTop: `1px solid ${T.bd}`,
      padding: '10px 14px', zIndex: 5,
      boxShadow: '0 -2px 10px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Left: surface metadata */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: T.ink }}>{title}</span>
            <span style={{ fontSize: 10, fontWeight: 600, color: T.bl, background: T.blLt, borderRadius: 4, padding: '1px 6px' }}>{curriculumCode}</span>
            <span style={{ fontSize: 10, color: T.tx3, background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 4, padding: '1px 6px' }}>{topic}</span>
          </div>
          <div style={{ fontSize: 11, color: T.tx2, lineHeight: 1.5 }}>{description}</div>
        </div>

        {/* Right: intersection explanation */}
        <div style={{
          flex: '0 0 340px', background: T.amLt,
          border: `1px solid ${T.amMid}`, borderRadius: 7,
          padding: '8px 12px', fontSize: 11, color: T.ink, lineHeight: 1.6,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>∩</span>
            <strong style={{ color: '#92400e', fontSize: 11 }}>Intersection Curve</strong>
          </div>
          {intersectionExplanation}
        </div>
      </div>

      {/* Teacher note toggle */}
      {teacherNote && (
        <div style={{ marginTop: 6 }}>
          <button
            onClick={() => setShowTeacher(v => !v)}
            style={{ fontSize: 10, color: T.am, fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 3 }}
          >
            <BookOpen size={10} /> Teacher Note {showTeacher ? '▲' : '▼'}
          </button>
          {showTeacher && (
            <div style={{ fontSize: 11, color: T.am, background: T.amLt, border: `1px solid ${T.amMid}`, borderRadius: 5, padding: '6px 9px', marginTop: 4 }}>
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

function WelcomeOverlay({ mode, onChip }: { mode: ExtCanvasMode; onChip: (p: string) => void }) {
  const chips = mode === '3d' ? CHIPS_3D : mode === 'dual' ? CHIPS_DUAL : CHIPS_2D;

  return (
    <div style={{
      position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.bg, borderRadius: 8, zIndex: 10, padding: '24px 32px',
    }}>
      <div style={{ maxWidth: 560, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
          {mode === 'dual'
            ? (['🧊', '⊕', '🧊'] as string[]).map((ic, i) => (
                <div key={i} style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: [T.emLt, T.vlLt, T.emLt][i],
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{ic}</div>
              ))
            : (['📈', '📐', '∫'] as string[]).map((ic, i) => (
                <div key={i} style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: ['#e3f3fd', '#eef2ff', '#ecfdf5'][i],
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
                }}>{ic}</div>
              ))
          }
        </div>
        <div style={{ fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 6 }}>
          {mode === 'dual' ? 'Compare Two Surfaces' : mode === '3d' ? 'Explore 3D Surfaces' : 'What shall we explore?'}
        </div>
        <div style={{ fontSize: 12, color: T.tx2, lineHeight: 1.7, marginBottom: 16 }}>
          {mode === 'dual'
            ? 'Ask to see any two mathematical surfaces side-by-side. MathCanvas renders both in WebGL and computes the intersection curve — the amber line where both surfaces share the same height.'
            : mode === '3d'
              ? 'Describe any 3D surface in plain language. MathCanvas renders it as a true WebGL surface you can rotate, zoom, and interact with.'
              : 'Describe any mathematical concept in plain language, or pick a quick-start card below.'}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
          {chips.map(c => (
            <button
              key={c.label}
              onClick={() => onChip(c.prompt)}
              style={{
                padding: '6px 12px', fontSize: 11, fontWeight: 600,
                background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 20,
                color: T.tx2, cursor: 'pointer', fontFamily: T.fs,
              }}
              onMouseEnter={e => {
                const btn = e.target as HTMLButtonElement;
                btn.style.background = mode === 'dual' ? T.vlLt : T.blLt;
                btn.style.borderColor = mode === 'dual' ? T.vlMid : T.blMid;
              }}
              onMouseLeave={e => {
                const btn = e.target as HTMLButtonElement;
                btn.style.background = T.sf;
                btn.style.borderColor = T.bd;
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
        {mode === 'dual' && (
          <div style={{
            fontSize: 11, color: T.vl, background: T.vlLt, border: `1px solid ${T.vlMid}`,
            borderRadius: 7, padding: '8px 12px', display: 'inline-flex', alignItems: 'flex-start',
            gap: 6, textAlign: 'left',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>∩</span>
            <div>
              <strong style={{ color: T.ink }}>Intersection algorithm:</strong> Marching squares
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

type RightTab = 'params' | 'issy' | 'info';

// =============================================================================
// MAIN PAGE COMPONENT
// =============================================================================

export default function MathCanvasPage() {
  const mc = useMathCanvas();
  const [rightTab, setRightTab] = useState<RightTab>('params');
  const [zoom, setZoom] = useState(100);

  // Mode as extended type — 'dual' is valid here
  const mode = mc.mode as ExtCanvasMode;

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
  const svgResult     = mode !== '3d' && mode !== 'dual' && mode !== 'cas' && mode !== 'expression' ? mc.result2D : null;

  // Active quick-start chips for the left panel
  const quickChips = mode === '3d' ? CHIPS_3D
    : mode === 'dual' ? CHIPS_DUAL
    : mode === 'cas' ? CHIPS_CAS
    : mode === 'expression' ? CHIPS_EXPRESSION
    : CHIPS_2D;

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '52px 42px 1fr',
      gridTemplateColumns: '260px 1fr 260px',
      height: 'calc(100vh - 52px)',
      fontFamily: T.fs,
      color: T.tx,
      background: T.bg,
    }}>

      {/* ── HEADER ROW ─────────────────────────────────────────────────────── */}
      <div style={{
        gridColumn: '1 / -1', background: T.sf,
        borderBottom: `1px solid ${T.bd}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12,
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)', zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: T.blLt, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>📐</div>
          <span style={{ fontSize: 14, fontWeight: 700, color: T.ink }}>MathCanvas</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: T.bl, background: T.blLt, borderRadius: 4, padding: '2px 6px' }}>AI-Native</span>
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
                color: mode === m.id ? '#fff' : T.tx2,
                fontFamily: T.fs, transition: 'all 0.15s',
              }}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* 2D/3D view toggle (single 3D mode only) */}
        {mode === '3d' && has3DResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, padding: '3px 8px', background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 7 }}>
            <span style={{ fontSize: 10, color: T.tx3, fontWeight: 600 }}>View:</span>
            <button
              onClick={mc.toggleViewMode}
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: mc.viewMode === '3d' ? T.em : 'transparent',
                color: mc.viewMode === '3d' ? '#fff' : T.tx2, fontFamily: T.fs,
              }}
            >
              🧊 WebGL
            </button>
            <button
              onClick={mc.toggleViewMode}
              style={{
                fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 5, border: 'none', cursor: 'pointer',
                background: mc.viewMode === '2d' ? T.ind : 'transparent',
                color: mc.viewMode === '2d' ? '#fff' : T.tx2, fontFamily: T.fs,
              }}
            >
              📐 2D View
            </button>
          </div>
        )}

        {/* Dual mode legend badge */}
        {mode === 'dual' && hasDualResult && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8, padding: '3px 8px', background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 7, fontSize: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.am, flexShrink: 0 }} />
            <span style={{ color: T.tx2, fontWeight: 600 }}>{mc.resultDual?.compound.surface1.appearance.label ?? 'Surface 1'}</span>
            <span style={{ color: T.tx3 }}>·</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.vl, flexShrink: 0 }} />
            <span style={{ color: T.tx2, fontWeight: 600 }}>{mc.resultDual?.compound.surface2.appearance.label ?? 'Surface 2'}</span>
            <span style={{ color: T.tx3 }}>·</span>
            <span style={{ color: T.am, fontWeight: 700 }}>∩ amber</span>
          </div>
        )}

        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: T.tx3 }}>
          {mc.sc.student.name} · Year {mc.sc.student.yearLevel}
        </span>
      </div>

      {/* ── TOOLBAR ROW ────────────────────────────────────────────────────── */}
      <div style={{
        gridColumn: '1 / -1', background: T.sf,
        borderBottom: `1px solid ${T.bd}`,
        display: 'flex', alignItems: 'center', padding: '0 12px', gap: 6,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 0, background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 7, overflow: 'hidden' }}>
          <span style={{ padding: '0 10px', fontSize: 12, color: T.tx3, fontFamily: T.fm, flexShrink: 0 }}>
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
            style={{ flex: 1, border: 'none', outline: 'none', fontSize: 12, background: 'transparent', padding: '0 8px', fontFamily: T.fs, color: T.ink }}
          />
        </div>

        <button
          onClick={() => mc.visualise(mc.intent)}
          disabled={mc.isLoading || !mc.intent.trim()}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '6px 14px', fontSize: 12, fontWeight: 700,
            background: mc.isLoading ? T.bd : mode === 'dual' ? T.vl : T.bl,
            color: mc.isLoading ? T.tx3 : '#fff',
            border: 'none', borderRadius: 7, cursor: mc.isLoading ? 'not-allowed' : 'pointer',
            fontFamily: T.fs, transition: 'background 0.15s',
          }}
        >
          {mc.isLoading ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />}
          {mc.isLoading ? 'Thinking…' : '⌘↵ Visualise'}
        </button>

        {mode !== '3d' && mode !== 'dual' && (
          <>
            <div style={{ width: 1, height: 20, background: T.bd, margin: '0 4px' }} />
            <button onClick={() => setZoom(z => Math.max(25, z - 10))} style={{ ...btnStyle }}><ZoomOut size={13} /></button>
            <span style={{ fontSize: 11, color: T.tx2, minWidth: 36, textAlign: 'center' }}>{zoom}%</span>
            <button onClick={() => setZoom(z => Math.min(400, z + 10))} style={{ ...btnStyle }}><ZoomIn size={13} /></button>
          </>
        )}

        <div style={{ width: 1, height: 20, background: T.bd, margin: '0 4px' }} />
        <button onClick={mc.clearCanvas} title="Clear" style={{ ...btnStyle }}><Trash2 size={13} /></button>
      </div>

      {/* ── LEFT PANEL ─────────────────────────────────────────────────────── */}
      <div style={{
        borderRight: `1px solid ${T.bd}`, background: T.sf,
        overflowY: 'auto', padding: 14,
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {/* BKT mastery mini-bar */}
        <div style={{ padding: '10px 12px', background: T.bg, borderRadius: 8, border: `1px solid ${T.bd}` }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Mastery</div>
          {[
            { label: 'Functions', val: mc.sc.mastery.functions, color: T.bl },
            { label: 'Geometry',  val: mc.sc.mastery.geometry,  color: T.ind },
            { label: 'Statistics',val: mc.sc.mastery.statistics, color: T.em },
          ].map(({ label, val, color }) => (
            <div key={label} style={{ marginBottom: 7 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: T.tx2, marginBottom: 2 }}>
                <span>{label}</span><span style={{ fontWeight: 700, color }}>{Math.round(val * 100)}%</span>
              </div>
              <div style={{ height: 4, background: T.bd, borderRadius: 99 }}>
                <div style={{ height: 4, background: color, borderRadius: 99, width: `${val * 100}%`, transition: 'width 0.4s' }} />
              </div>
            </div>
          ))}
        </div>

        {/* Quick starts */}
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Quick Start</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {quickChips.map(c => (
              <button
                key={c.label}
                onClick={() => mc.quickIntent(c.prompt)}
                style={{
                  textAlign: 'left', padding: '7px 10px', fontSize: 11,
                  background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 6,
                  color: T.tx2, cursor: 'pointer', fontFamily: T.fs, fontWeight: 500,
                  transition: 'all 0.12s',
                }}
                onMouseEnter={e => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.background = mode === 'dual' ? T.vlLt : T.blLt;
                  btn.style.borderColor = mode === 'dual' ? T.vlMid : T.blMid;
                }}
                onMouseLeave={e => {
                  const btn = e.target as HTMLButtonElement;
                  btn.style.background = T.bg;
                  btn.style.borderColor = T.bd;
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CANVAS VIEWPORT ────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', overflow: 'hidden', background: T.bg }}>

        {showWelcome && <WelcomeOverlay mode={mode} onChip={mc.quickIntent} />}

        {mc.isLoading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(247,248,248,0.92)', zIndex: 20 }}>
            <div style={{ textAlign: 'center' }}>
              <Loader2 size={32} style={{ color: mode === 'dual' ? T.vl : T.bl, animation: 'spin 1s linear infinite', margin: '0 auto 8px' }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: T.ink }}>Computing visualization…</div>
              <div style={{ fontSize: 11, color: T.tx2, marginTop: 3 }}>
                {mode === 'dual' ? 'Computing intersection curve…' : 'Aligning to curriculum'}
              </div>
            </div>
          </div>
        )}

        {mc.error && !mc.isLoading && !hasResult && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: T.bg, zIndex: 15 }}>
            <div style={{ textAlign: 'center', maxWidth: 300 }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⚠️</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: T.ink, marginBottom: 4 }}>Visualization failed</div>
              <div style={{ fontSize: 11, color: T.tx2, marginBottom: 14 }}>{mc.error}</div>
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
            />
          </div>
        )}

        {/* ── 2D SVG VIEW ── */}
        {svgResult && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center', transition: 'transform 0.2s' }}
              dangerouslySetInnerHTML={{ __html: svgResult.svg }}
            />
            <SurfaceBadge
              title={svgResult.title}
              description={svgResult.description}
              topic={svgResult.topic}
              curriculumCode={svgResult.curriculumCode}
              teacherNote={svgResult.teacherNote}
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

      {/* ── RIGHT PANEL ────────────────────────────────────────────────────── */}
      <div style={{ borderLeft: `1px solid ${T.bd}`, background: T.sf, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: `1px solid ${T.bd}` }}>
          {([
            { id: 'params' as RightTab, label: 'Parameters', icon: <Layers size={11} /> },
            { id: 'issy' as RightTab, label: 'Issy', icon: <Brain size={11} /> },
            { id: 'info' as RightTab, label: 'Info', icon: <Info size={11} /> },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setRightTab(tab.id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '8px 4px', fontSize: 11, fontWeight: rightTab === tab.id ? 700 : 500,
                border: 'none', borderBottom: rightTab === tab.id ? `2px solid ${T.bl}` : '2px solid transparent',
                background: 'none', color: rightTab === tab.id ? T.bl : T.tx2,
                cursor: 'pointer', fontFamily: T.fs,
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
            />
          )}

          {rightTab === 'issy' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Ask Issy</div>
              {[
                { label: '💡 Explain this',    prompt: 'explain' },
                { label: '🪜 Scaffold me',     prompt: 'scaffold' },
                { label: '🎯 Challenge me',    prompt: 'challenge' },
                { label: '📚 Curriculum link', prompt: 'curriculum' },
                ...(mode === 'dual' ? [{ label: '∩ Explain intersection', prompt: 'intersection' }] : []),
              ].map(({ label }) => (
                <button key={label} style={{
                  textAlign: 'left', padding: '8px 10px', fontSize: 11, background: T.bg,
                  border: `1px solid ${T.bd}`, borderRadius: 6, color: T.tx2,
                  cursor: 'pointer', fontFamily: T.fs,
                }}>
                  {label}
                </button>
              ))}
              {/* Suggested exploration from whichever result is active */}
              {(mc.result3D?.suggestedExploration ?? mc.resultDual?.compound.suggestedExploration) && (
                <div style={{ marginTop: 8, padding: '8px 10px', background: T.blLt, border: `1px solid ${T.blMid}`, borderRadius: 7, fontSize: 11, color: T.ink, lineHeight: 1.6 }}>
                  <strong style={{ color: T.bl }}>💬 Explore: </strong>
                  {mc.result3D?.suggestedExploration ?? mc.resultDual?.compound.suggestedExploration}
                </div>
              )}
            </div>
          )}

          {rightTab === 'info' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Session Info</div>

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
                    <div key={k} style={{ background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 6, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.ink, marginTop: 2 }}>{v}</div>
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
                    <div key={k} style={{ background: T.bg, border: `1px solid ${T.bd}`, borderRadius: 6, padding: '7px 10px' }}>
                      <div style={{ fontSize: 9, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{k}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: T.ink, marginTop: 2, fontFamily: typeof v === 'string' && v.includes('=') ? T.fm : T.fs }}>{v}</div>
                    </div>
                  ))}
                </>
              ) : (
                <div style={{ fontSize: 11, color: T.tx3 }}>Visualise something to see session info.</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// STYLE HELPERS
// =============================================================================

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  width: 28, height: 28, border: `1px solid ${T.bd}`,
  borderRadius: 6, background: T.sf, cursor: 'pointer', color: T.tx2,
};

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 5,
  padding: '6px 14px', fontSize: 11, fontWeight: 700,
  background: T.bl, color: '#fff', border: 'none',
  borderRadius: 7, cursor: 'pointer', fontFamily: "'Open Sans', system-ui, sans-serif",
};
