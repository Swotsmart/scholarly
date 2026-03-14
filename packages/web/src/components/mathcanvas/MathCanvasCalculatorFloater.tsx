'use client';

/**
 * MathCanvasCalculatorFloater
 *
 * A draggable, minimisable scientific calculator that lives inside the
 * MathCanvas canvas area as a floating overlay. The mental model is a
 * physical calculator sitting on the desk next to graph paper — always
 * within reach, never requiring the student to leave their work.
 *
 * ── BEHAVIOUR ──────────────────────────────────────────────────────────────
 *
 * Three states:
 *   HIDDEN     — not rendered. Toggle button in toolbar shows it.
 *   MINIMISED  — compact title bar only (180×36px). Floats at saved position.
 *                Click the bar or the 🧮 icon to restore.
 *   OPEN       — full calculator (280px wide). Draggable by title bar.
 *
 * Drag:
 *   Grab anywhere on the title bar. Position is clamped to stay within the
 *   canvas bounds (never draggable outside the grid column 3 area). Uses
 *   the same mousemove/mouseup pattern as the existing panel resizers.
 *
 * Result injection:
 *   When the student presses = the result is copied to clipboard AND
 *   optionally injected into the MathCanvas intent input via the
 *   onResultReady callback — so they can pipe a computed value directly
 *   into the visualisation prompt.
 *
 * ── Z-INDEX ────────────────────────────────────────────────────────────────
 *   Canvas elements: 5–20
 *   WelcomeOverlay: 10
 *   ExpressionBar: 20
 *   Header row: 200
 *   THIS FLOATER: 300  (sits above everything including the header)
 *
 * ── POSITIONING ────────────────────────────────────────────────────────────
 *   Rendered inside the canvas area div (gridColumn 3, position: relative).
 *   Default position: top-right corner with 16px margin.
 *   position: absolute — moves with canvas, not with viewport scroll.
 *
 * ── PROPS ──────────────────────────────────────────────────────────────────
 *   isOpen          — controlled visibility (parent holds open/closed state)
 *   onClose         — called when user clicks the × button
 *   onResultReady   — optional: called with result string when = is pressed
 *                     (enables injecting computed values into intent input)
 */

import React, {
  useState, useEffect, useRef, useCallback, useLayoutEffect,
} from 'react';

// ── Design tokens (mirrors MathCanvasPage T object exactly) ────────────────
const T = {
  ink: '#0f1419', ink2: '#1a2332', ink3: '#243040',
  sf: '#1a2332', bd: '#1e2d3d', bdBright: '#2a3f56',
  bl: '#1e9df1', blLt: '#e3f3fd', blMid: '#b3daf7', blDim: '#1483cc',
  em: '#10b981', emLt: '#ecfdf5', emMid: '#a7f3d0',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  vl: '#8b5cf6', vlLt: '#f5f3ff',
  rd: '#ef4444', rdLt: '#fef2f2',
  tx: '#e8edf2', tx2: '#8899aa', tx3: '#4d6070',
  fm: "'JetBrains Mono', 'Courier New', monospace",
  fs: "'Open Sans', system-ui, sans-serif",
};

// ── Safe evaluator ─────────────────────────────────────────────────────────
function safeEval(expr: string, isDeg: boolean): string {
  if (!expr.trim()) return '0';
  const d2r = (x: number) => x * (Math.PI / 180);
  const r2d = (x: number) => x * (180 / Math.PI);
  const ctx = {
    sin: (x: number) => Math.sin(isDeg ? d2r(x) : x),
    cos: (x: number) => Math.cos(isDeg ? d2r(x) : x),
    tan: (x: number) => Math.tan(isDeg ? d2r(x) : x),
    asin: (x: number) => { const r = Math.asin(x); return isDeg ? r2d(r) : r; },
    acos: (x: number) => { const r = Math.acos(x); return isDeg ? r2d(r) : r; },
    atan: (x: number) => { const r = Math.atan(x); return isDeg ? r2d(r) : r; },
    ln: Math.log, log: Math.log10,
    sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs,
    exp: Math.exp, pow: Math.pow,
    PI: Math.PI, E: Math.E,
  };
  try {
    const s = expr
      .replace(/×/g, '*').replace(/÷/g, '/').replace(/π/g, 'PI')
      .replace(/(?<![a-zA-Z])e(?![a-zA-Z])/g, 'E').replace(/\^/g, '**');
    const safe = /^[0-9+\-*/.(),%\s]*$/.test(
      s.replace(/\b(sin|cos|tan|asin|acos|atan|ln|log|sqrt|cbrt|abs|exp|pow|PI|E)\b/g, '')
    );
    if (!safe) return 'Error';
    // eslint-disable-next-line no-new-func
    const result = new Function(...Object.keys(ctx), `"use strict"; return (${s});`)(...Object.values(ctx));
    if (typeof result !== 'number' || isNaN(result)) return 'Error';
    if (!isFinite(result)) return result > 0 ? '∞' : '-∞';
    if (Number.isInteger(result) && Math.abs(result) < 1e15) return result.toString();
    return parseFloat(result.toPrecision(12)).toString();
  } catch {
    return 'Error';
  }
}

// ── Button layout ──────────────────────────────────────────────────────────
type BtnType = 'num' | 'op' | 'fn' | 'eq' | 'clear' | 'mem';
interface Btn { label: string; value: string; type: BtnType; span?: number; }

// Compact 4-column layout suited to the narrow floater width
const ROWS: Btn[][] = [
  [
    { label: 'MC',    value: 'MC',    type: 'mem' },
    { label: 'MR',    value: 'MR',    type: 'mem' },
    { label: 'M+',    value: 'M+',    type: 'mem' },
    { label: 'M−',    value: 'M-',    type: 'mem' },
  ],
  [
    { label: 'sin',   value: 'sin(',  type: 'fn'  },
    { label: 'cos',   value: 'cos(',  type: 'fn'  },
    { label: 'tan',   value: 'tan(',  type: 'fn'  },
    { label: 'π',     value: 'π',     type: 'fn'  },
  ],
  [
    { label: 'ln',    value: 'ln(',   type: 'fn'  },
    { label: 'log',   value: 'log(',  type: 'fn'  },
    { label: '√',     value: 'sqrt(', type: 'fn'  },
    { label: 'x²',    value: '**2',   type: 'fn'  },
  ],
  [
    { label: '(',     value: '(',     type: 'op'  },
    { label: ')',     value: ')',     type: 'op'  },
    { label: 'AC',    value: 'AC',    type: 'clear'},
    { label: '⌫',    value: 'BS',    type: 'clear'},
  ],
  [
    { label: '7',     value: '7',     type: 'num' },
    { label: '8',     value: '8',     type: 'num' },
    { label: '9',     value: '9',     type: 'num' },
    { label: '÷',     value: '/',     type: 'op'  },
  ],
  [
    { label: '4',     value: '4',     type: 'num' },
    { label: '5',     value: '5',     type: 'num' },
    { label: '6',     value: '6',     type: 'num' },
    { label: '×',     value: '*',     type: 'op'  },
  ],
  [
    { label: '1',     value: '1',     type: 'num' },
    { label: '2',     value: '2',     type: 'num' },
    { label: '3',     value: '3',     type: 'num' },
    { label: '−',     value: '-',     type: 'op'  },
  ],
  [
    { label: '0',     value: '0',     type: 'num', span: 2 },
    { label: '.',     value: '.',     type: 'num' },
    { label: '=',     value: '=',     type: 'eq'  },
    // + is on the right of the row above to keep layout balanced
    { label: '+',     value: '+',     type: 'op'  },
  ],
];

function btnColors(type: BtnType): React.CSSProperties {
  switch (type) {
    case 'num':   return { background: T.ink3, color: T.tx };
    case 'op':    return { background: T.bdBright, color: T.bl, fontWeight: 700 };
    case 'fn':    return { background: T.ink2, color: T.tx2, fontSize: 10 };
    case 'eq':    return { background: T.bl, color: '#fff', fontWeight: 800 };
    case 'clear': return { background: T.rdLt, color: T.rd, fontWeight: 700 };
    case 'mem':   return { background: T.vlLt, color: T.vl, fontSize: 9, fontWeight: 700 };
  }
}

// ── Props ──────────────────────────────────────────────────────────────────
export interface FloaterProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the result string when = is pressed — use to inject into intent */
  onResultReady?: (result: string) => void;
}

// ── Component ──────────────────────────────────────────────────────────────
export function MathCanvasCalculatorFloater({ isOpen, onClose, onResultReady }: FloaterProps) {
  // ── Calculator state ───────────────────────────────────────────────────
  const [expression, setExpression] = useState('');
  const [display, setDisplay]       = useState('0');
  const [history, setHistory]       = useState<Array<{ expr: string; result: string }>>([]);
  const [memory, setMemory]         = useState(0);
  const [isDeg, setIsDeg]           = useState(true);
  const [justEvaled, setJustEvaled] = useState(false);
  const [minimised, setMinimised]   = useState(false);
  const [injected, setInjected]     = useState(false); // flash feedback on inject

  // ── Drag state ─────────────────────────────────────────────────────────
  // Default: top-right of canvas with 16px margin.
  // We initialise lazily on first render so we don't need to know canvas size.
  const [pos, setPos]         = useState({ x: -1, y: 16 }); // x=-1 signals "not yet placed"
  const draggingFloater       = useRef(false);
  const dragOffset            = useRef({ x: 0, y: 0 });
  const floaterRef            = useRef<HTMLDivElement>(null);
  const containerRef          = useRef<HTMLDivElement | null>(null);

  // Measure container (canvas area) for clamping, and set initial x
  useLayoutEffect(() => {
    if (!isOpen || !floaterRef.current) return;
    const parent = floaterRef.current.parentElement;
    if (!parent) return;
    containerRef.current = parent as HTMLDivElement;
    if (pos.x === -1) {
      const W = parent.getBoundingClientRect().width;
      const floaterW = 280;
      setPos({ x: W - floaterW - 16, y: 16 });
    }
  }, [isOpen, pos.x]);

  // ── Drag handlers ───────────────────────────────────────────────────────
  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (minimised) return; // minimised bar can be clicked to restore, not dragged
    e.preventDefault();
    draggingFloater.current = true;
    dragOffset.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  }, [pos, minimised]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingFloater.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const floaterH = floaterRef.current?.offsetHeight ?? 400;
      const floaterW = floaterRef.current?.offsetWidth  ?? 280;
      const newX = Math.max(0, Math.min(rect.width  - floaterW, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(rect.height - floaterH, e.clientY - dragOffset.current.y));
      setPos({ x: newX, y: newY });
    };
    const onUp = () => { draggingFloater.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── Calculator logic ────────────────────────────────────────────────────
  const handleInput = useCallback((value: string, type: BtnType) => {
    if (type === 'mem') {
      const cur = parseFloat(display);
      if (value === 'MC') { setMemory(0); return; }
      if (value === 'MR') { setExpression(memory.toString()); setDisplay(memory.toString()); setJustEvaled(false); return; }
      if (value === 'M+') { setMemory(m => m + (isNaN(cur) ? 0 : cur)); return; }
      if (value === 'M-') { setMemory(m => m - (isNaN(cur) ? 0 : cur)); return; }
    }
    if (value === 'AC') { setExpression(''); setDisplay('0'); setJustEvaled(false); return; }
    if (value === 'BS') {
      const n = expression.slice(0, -1);
      setExpression(n); setDisplay(n || '0'); setJustEvaled(false); return;
    }
    if (value === '=') {
      if (!expression.trim()) return;
      const result = safeEval(expression, isDeg);
      setHistory(h => [{ expr: expression, result }, ...h.slice(0, 7)]);
      setDisplay(result);
      setExpression(result === 'Error' ? '' : result);
      setJustEvaled(true);
      if (result !== 'Error' && onResultReady) onResultReady(result);
      return;
    }
    if (justEvaled && type === 'num') {
      setExpression(value); setDisplay(value); setJustEvaled(false); return;
    }
    if (justEvaled && type === 'op') {
      const n = display + value; setExpression(n); setDisplay(n); setJustEvaled(false); return;
    }
    const n = expression + value;
    setExpression(n); setDisplay(n || '0'); setJustEvaled(false);
  }, [expression, display, isDeg, justEvaled, memory, onResultReady]);

  // Keyboard input — only active when floater is open and not minimised
  useEffect(() => {
    if (!isOpen || minimised) return;
    const handler = (e: KeyboardEvent) => {
      // Don't steal from the intent input
      const active = document.activeElement;
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
      const k = e.key;
      if (/^[0-9]$/.test(k))                    handleInput(k, 'num');
      else if (k === '+')                        handleInput('+', 'op');
      else if (k === '-')                        handleInput('-', 'op');
      else if (k === '*')                        handleInput('*', 'op');
      else if (k === '/') { e.preventDefault();  handleInput('/', 'op'); }
      else if (k === '.')                        handleInput('.', 'num');
      else if (k === '(' || k === ')')           handleInput(k, 'op');
      else if (k === 'Enter' || k === '=')      { e.preventDefault(); handleInput('=', 'eq'); }
      else if (k === 'Backspace')                handleInput('BS', 'clear');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, minimised, handleInput]);

  // Inject result into intent input
  const handleInject = useCallback(() => {
    if (display === 'Error' || display === '0') return;
    if (onResultReady) { onResultReady(display); setInjected(true); setTimeout(() => setInjected(false), 1200); }
  }, [display, onResultReady]);

  if (!isOpen || pos.x === -1) return null;

  const dispSize = display.length > 18 ? 12 : display.length > 12 ? 15 : 20;

  // ── MINIMISED state — compact title bar ─────────────────────────────────
  if (minimised) {
    return (
      <div
        ref={floaterRef}
        style={{
          position: 'absolute',
          left: pos.x, top: pos.y,
          width: 200, height: 36,
          background: T.sf,
          border: `1px solid ${T.bd}`,
          borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.45)',
          zIndex: 300,
          display: 'flex', alignItems: 'center',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setMinimised(false)}
        title="Click to open calculator"
      >
        <div style={{ width: 28, height: 28, borderRadius: 7, background: T.blLt,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, marginLeft: 4, flexShrink: 0 }}>
          🧮
        </div>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: T.tx2,
          fontFamily: T.fs, paddingLeft: 8 }}>Calculator</span>
        {display !== '0' && (
          <span style={{ fontSize: 11, color: T.bl, fontFamily: T.fm,
            paddingRight: 8, fontWeight: 700 }}>{display}</span>
        )}
        <button
          onClick={e => { e.stopPropagation(); onClose(); }}
          style={{ width: 24, height: 24, borderRadius: 5, border: 'none',
            background: 'transparent', color: T.tx3, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 13, marginRight: 4 }}
        >×</button>
      </div>
    );
  }

  // ── OPEN state — full calculator ─────────────────────────────────────────
  return (
    <div
      ref={floaterRef}
      style={{
        position: 'absolute',
        left: pos.x, top: pos.y,
        width: 280,
        background: T.ink,
        border: `1px solid ${T.bdBright}`,
        borderRadius: 12,
        boxShadow: '0 8px 40px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.3)',
        zIndex: 300,
        overflow: 'hidden',
        userSelect: 'none',
        fontFamily: T.fs,
      }}
    >
      {/* ── Title bar — drag handle ─────────────────────────────────────── */}
      <div
        onMouseDown={onTitleMouseDown}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 10px',
          background: T.ink2,
          borderBottom: `1px solid ${T.bd}`,
          cursor: 'grab',
        }}
      >
        <div style={{ width: 22, height: 22, borderRadius: 6, background: T.blLt,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0 }}>
          🧮
        </div>
        <span style={{ flex: 1, fontSize: 11, fontWeight: 700, color: T.tx, fontFamily: T.fs }}>
          Calculator
        </span>
        {memory !== 0 && (
          <span style={{ fontSize: 9, fontWeight: 700, color: T.vl,
            background: T.vlLt, borderRadius: 4, padding: '1px 5px' }}>
            M={memory}
          </span>
        )}
        {/* Deg/Rad toggle */}
        <button
          onClick={() => setIsDeg(d => !d)}
          style={{
            padding: '2px 6px', fontSize: 9, fontWeight: 700, borderRadius: 4,
            border: 'none', cursor: 'pointer', fontFamily: T.fs,
            background: isDeg ? T.emLt : T.amLt,
            color: isDeg ? '#065f46' : '#92400e',
          }}
        >{isDeg ? 'DEG' : 'RAD'}</button>
        {/* Minimise */}
        <button
          onClick={() => setMinimised(true)}
          title="Minimise"
          style={{ width: 22, height: 22, borderRadius: 5, border: 'none',
            background: T.bd, color: T.tx2, cursor: 'pointer', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >−</button>
        {/* Close */}
        <button
          onClick={onClose}
          title="Close calculator"
          style={{ width: 22, height: 22, borderRadius: 5, border: 'none',
            background: T.rdLt, color: T.rd, cursor: 'pointer', fontSize: 13, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>

      {/* ── Display ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '10px 12px 6px', background: T.ink, borderBottom: `1px solid ${T.bd}` }}>
        {/* Recent history — last 2 entries */}
        {history.slice(0, 2).map((h, i) => (
          <div key={i}
            style={{ display: 'flex', justifyContent: 'space-between',
              fontSize: 9, color: T.tx3, fontFamily: T.fm, marginBottom: 2,
              cursor: 'pointer' }}
            onClick={() => { setExpression(h.result); setDisplay(h.result); setJustEvaled(false); }}
            title="Click to reuse"
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              {h.expr}
            </span>
            <span style={{ color: T.tx2 }}>= {h.result}</span>
          </div>
        ))}
        {/* Main display */}
        <div style={{
          textAlign: 'right', fontSize: dispSize, fontWeight: 700,
          fontFamily: T.fm, minHeight: 28, lineHeight: 1.2,
          color: display === 'Error' ? T.rd : display.includes('∞') ? T.am : T.tx,
          wordBreak: 'break-all',
        }}>
          {display}
        </div>
        {/* Expression preview */}
        {expression && !justEvaled && (
          <div style={{ textAlign: 'right', fontSize: 9, color: T.tx3, fontFamily: T.fm, marginTop: 2 }}>
            {expression.length > 36 ? '…' + expression.slice(-36) : expression}
          </div>
        )}
        {/* Inject button — appears after a result is computed */}
        {justEvaled && display !== 'Error' && onResultReady && (
          <button
            onClick={handleInject}
            title="Send result to MathCanvas intent input"
            style={{
              marginTop: 6, width: '100%', padding: '4px 0',
              fontSize: 10, fontWeight: 700, borderRadius: 6,
              border: `1px solid ${injected ? T.emMid : T.blMid}`,
              background: injected ? T.emLt : T.blLt,
              color: injected ? '#065f46' : T.blDim,
              cursor: 'pointer', fontFamily: T.fs,
              transition: 'all 0.2s',
            }}
          >
            {injected ? '✓ Sent to canvas' : '↗ Use in canvas'}
          </button>
        )}
      </div>

      {/* ── Buttons ─────────────────────────────────────────────────────── */}
      <div style={{ padding: '6px 8px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {ROWS.map((row, ri) => (
          <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4 }}>
            {row.map((btn, bi) => (
              <button
                key={bi}
                onClick={() => handleInput(btn.value, btn.type)}
                style={{
                  gridColumn: btn.span ? `span ${btn.span}` : undefined,
                  ...btnColors(btn.type),
                  fontFamily: T.fm, fontSize: 12, fontWeight: 600,
                  border: 'none', borderRadius: 7, cursor: 'pointer',
                  padding: '9px 4px', minHeight: 34,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'filter 0.1s, transform 0.07s',
                }}
                onMouseDown={e => { (e.currentTarget).style.transform = 'scale(0.93)'; }}
                onMouseUp={e => { (e.currentTarget).style.transform = 'scale(1)'; }}
                onMouseLeave={e => { (e.currentTarget).style.transform = 'scale(1)'; }}
              >
                {btn.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default MathCanvasCalculatorFloater;
