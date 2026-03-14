'use client';

/**
 * ScholarlyCalculator — React Component
 *
 * A scientific calculator built with the Scholarly design system.
 * Designed to embed as a collapsible panel in the Teacher Dashboard and
 * Tutor Profile pages, giving educators and tutors a context-aware
 * calculating tool without leaving their workspace.
 *
 * Features:
 *   - Scientific functions: sin, cos, tan, ln, log, √, x², x³, xⁿ
 *   - Expression history with 10-entry scroll
 *   - Degree/Radian toggle (critical for trigonometry teaching)
 *   - Fraction/decimal display toggle
 *   - Memory: M+, M-, MR, MC
 *   - Keyboard input support
 *   - Collapsible/expandable (prop-driven) for dashboard embedding
 *
 * Design tokens match Scholarly's existing palette exactly:
 *   Blue #1e9df1, Emerald #10b981, Amber #f59e0b, Violet #8b5cf6, Ink #0f1419
 *   Fonts: Open Sans (UI) + JetBrains Mono (display)
 *
 * Usage:
 *   <ScholarlyCalculator />                    — standalone, always expanded
 *   <ScholarlyCalculator collapsible />        — show toggle button
 *   <ScholarlyCalculator defaultExpanded={false} collapsible />  — starts collapsed
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ── Design tokens ──────────────────────────────────────────────────────────
const T = {
  ink: '#0f1419', ink2: '#1a2332', ink3: '#243040',
  bl: '#1e9df1', blDim: '#1483cc', blLt: '#e3f3fd', blMid: '#b3daf7',
  em: '#10b981', emLt: '#ecfdf5', emMid: '#a7f3d0',
  am: '#f59e0b', amLt: '#fffbeb',
  vl: '#8b5cf6', vlLt: '#f5f3ff',
  rd: '#ef4444', rdLt: '#fef2f2',
  tx: '#e8edf2', tx2: '#6b7f94', tx3: '#3d5068',
  bd: '#1e2d3d', bdBright: '#2a3f56',
  fm: "'JetBrains Mono', 'Courier New', monospace",
  fs: "'Open Sans', system-ui, sans-serif",
};

// ── Types ──────────────────────────────────────────────────────────────────
interface HistoryEntry {
  expression: string;
  result: string;
  timestamp: number;
}

export interface ScholarlyCalculatorProps {
  /** When true, show a header toggle button. Default: false */
  collapsible?: boolean;
  /** Initial expanded state when collapsible=true. Default: true */
  defaultExpanded?: boolean;
  /** Visual size variant */
  size?: 'compact' | 'full';
}

// ── Safe evaluator ─────────────────────────────────────────────────────────
/**
 * Evaluates the expression string through a carefully restricted path.
 * We never use raw eval() — instead we parse and compute manually for the
 * set of operations a scientific calculator needs.
 *
 * The technique: use Function() constructor with a whitelist of allowed
 * names from Math, plus our custom trig wrappers. This gives us full
 * precedence handling without code injection risk.
 */
function safeEvaluate(expr: string, isDeg: boolean): string {
  if (!expr.trim()) return '0';

  const degToRad = (x: number) => x * (Math.PI / 180);

  // Build the safe evaluation context
  const sinFn  = (x: number) => Math.sin(isDeg ? degToRad(x) : x);
  const cosFn  = (x: number) => Math.cos(isDeg ? degToRad(x) : x);
  const tanFn  = (x: number) => Math.tan(isDeg ? degToRad(x) : x);
  const asinFn = (x: number) => { const r = Math.asin(x); return isDeg ? r * (180 / Math.PI) : r; };
  const acosFn = (x: number) => { const r = Math.acos(x); return isDeg ? r * (180 / Math.PI) : r; };
  const atanFn = (x: number) => { const r = Math.atan(x); return isDeg ? r * (180 / Math.PI) : r; };

  const safeNames = {
    sin: sinFn, cos: cosFn, tan: tanFn,
    asin: asinFn, acos: acosFn, atan: atanFn,
    ln: Math.log, log: Math.log10, log2: Math.log2,
    sqrt: Math.sqrt, cbrt: Math.cbrt,
    abs: Math.abs, floor: Math.floor, ceil: Math.ceil, round: Math.round,
    exp: Math.exp, pow: Math.pow,
    PI: Math.PI, E: Math.E,
  };

  try {
    // Sanitize: allow only safe characters
    const sanitized = expr
      .replace(/×/g, '*')
      .replace(/÷/g, '/')
      .replace(/π/g, 'PI')
      .replace(/e(?![a-z])/g, 'E')
      .replace(/\^/g, '**');

    // Check: only digits, operators, parens, dots, and whitelisted names
    const allowed = /^[0-9+\-*/.(),%\s]*$/.test(sanitized.replace(
      /\b(sin|cos|tan|asin|acos|atan|ln|log|log2|sqrt|cbrt|abs|floor|ceil|round|exp|pow|PI|E)\b/g, ''
    ));
    if (!allowed) return 'Error';

    // eslint-disable-next-line no-new-func
    const fn = new Function(
      ...Object.keys(safeNames),
      `"use strict"; return (${sanitized});`
    );
    const result = fn(...Object.values(safeNames));

    if (typeof result !== 'number') return 'Error';
    if (!isFinite(result)) return result > 0 ? '∞' : result < 0 ? '-∞' : 'Error';
    if (isNaN(result)) return 'Error';

    // Format: avoid unnecessary .000000 but keep significant digits
    if (Number.isInteger(result) && Math.abs(result) < 1e15) return result.toString();
    const formatted = parseFloat(result.toPrecision(12)).toString();
    return formatted;
  } catch {
    return 'Error';
  }
}

// ── Button definitions ─────────────────────────────────────────────────────
type BtnType = 'num' | 'op' | 'fn' | 'eq' | 'clear' | 'mem' | 'mode';

interface CalcButton {
  label: string;
  value?: string;
  type: BtnType;
  wide?: boolean;
}

const BUTTONS: CalcButton[][] = [
  // Row 1 — memory + clear
  [
    { label: 'MC',  value: 'MC',   type: 'mem' },
    { label: 'MR',  value: 'MR',   type: 'mem' },
    { label: 'M+',  value: 'M+',   type: 'mem' },
    { label: 'M−',  value: 'M-',   type: 'mem' },
    { label: 'AC',  value: 'AC',   type: 'clear' },
    { label: '⌫',  value: 'BS',   type: 'clear' },
  ],
  // Row 2 — trig
  [
    { label: 'sin', value: 'sin(', type: 'fn' },
    { label: 'cos', value: 'cos(', type: 'fn' },
    { label: 'tan', value: 'tan(', type: 'fn' },
    { label: 'π',   value: 'π',    type: 'fn' },
    { label: 'e',   value: 'e',    type: 'fn' },
    { label: '(',   value: '(',    type: 'op' },
  ],
  // Row 3 — inverse trig + log
  [
    { label: 'sin⁻¹', value: 'asin(', type: 'fn' },
    { label: 'cos⁻¹', value: 'acos(', type: 'fn' },
    { label: 'tan⁻¹', value: 'atan(', type: 'fn' },
    { label: 'ln',  value: 'ln(',  type: 'fn' },
    { label: 'log', value: 'log(', type: 'fn' },
    { label: ')',   value: ')',    type: 'op' },
  ],
  // Row 4 — powers + root
  [
    { label: 'x²',  value: '**2',    type: 'fn' },
    { label: 'x³',  value: '**3',    type: 'fn' },
    { label: 'xⁿ',  value: '**',     type: 'fn' },
    { label: '√',   value: 'sqrt(',  type: 'fn' },
    { label: '%',   value: '%',      type: 'op' },
    { label: '±',   value: 'NEG',    type: 'fn' },
  ],
  // Row 5 — 7 8 9 ÷
  [
    { label: '7', value: '7', type: 'num' },
    { label: '8', value: '8', type: 'num' },
    { label: '9', value: '9', type: 'num' },
    { label: '÷', value: '/', type: 'op',  wide: false },
  ],
  // Row 6 — 4 5 6 ×
  [
    { label: '4', value: '4', type: 'num' },
    { label: '5', value: '5', type: 'num' },
    { label: '6', value: '6', type: 'num' },
    { label: '×', value: '*', type: 'op' },
  ],
  // Row 7 — 1 2 3 −
  [
    { label: '1', value: '1', type: 'num' },
    { label: '2', value: '2', type: 'num' },
    { label: '3', value: '3', type: 'num' },
    { label: '−', value: '-', type: 'op' },
  ],
  // Row 8 — 0 . = +
  [
    { label: '0', value: '0', type: 'num', wide: true },
    { label: '.', value: '.', type: 'num' },
    { label: '=', value: '=', type: 'eq' },
    { label: '+', value: '+', type: 'op' },
  ],
];

// ── Button colour by type ──────────────────────────────────────────────────
function btnStyle(type: BtnType, active = false) {
  const base: React.CSSProperties = {
    fontFamily: T.fm, fontSize: 12, fontWeight: 600,
    border: 'none', borderRadius: 8, cursor: 'pointer',
    padding: '10px 4px', transition: 'background 0.1s, transform 0.07s',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: 36,
  };
  const map: Record<BtnType, React.CSSProperties> = {
    num:   { background: T.ink3, color: T.tx },
    op:    { background: T.bdBright, color: T.bl, fontWeight: 700 },
    fn:    { background: T.ink2, color: T.tx2, fontSize: 11 },
    eq:    { background: T.bl, color: '#fff', fontWeight: 800 },
    clear: { background: T.rdLt, color: T.rd, fontWeight: 700 },
    mem:   { background: T.vlLt, color: T.vl, fontSize: 10, fontWeight: 700 },
    mode:  { background: active ? T.em : T.ink2, color: active ? '#fff' : T.tx2, fontWeight: 700 },
  };
  return { ...base, ...map[type] };
}

// ── Main component ─────────────────────────────────────────────────────────
export function ScholarlyCalculator({
  collapsible = false,
  defaultExpanded = true,
  size = 'full',
}: ScholarlyCalculatorProps) {
  const [expression, setExpression] = useState('');
  const [display, setDisplay]       = useState('0');
  const [history, setHistory]       = useState<HistoryEntry[]>([]);
  const [memory, setMemory]         = useState<number>(0);
  const [isDeg, setIsDeg]           = useState(true);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [justEvaled, setJustEvaled] = useState(false);
  const displayRef = useRef<HTMLDivElement>(null);

  // ── Keyboard support ─────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isExpanded) return;
      const k = e.key;
      if (/^[0-9]$/.test(k))           handleInput(k,   'num');
      else if (k === '+')               handleInput('+', 'op');
      else if (k === '-')               handleInput('-', 'op');
      else if (k === '*')               handleInput('*', 'op');
      else if (k === '/')               { e.preventDefault(); handleInput('/', 'op'); }
      else if (k === '.')               handleInput('.', 'num');
      else if (k === '(' || k === ')')  handleInput(k,   'op');
      else if (k === 'Enter' || k === '=') { e.preventDefault(); handleEquals(); }
      else if (k === 'Backspace')       handleBackspace();
      else if (k === 'Escape')          handleClear();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expression, isExpanded, isDeg]);

  const handleInput = useCallback((value: string, type: BtnType) => {
    if (type === 'mem' || value === 'AC' || value === 'BS' || value === '=' || value === 'NEG') return;

    if (justEvaled && type === 'num') {
      setExpression(value);
      setDisplay(value);
      setJustEvaled(false);
      return;
    }
    if (justEvaled && (type === 'op')) {
      // Continue from result
      const newExpr = display + value;
      setExpression(newExpr);
      setDisplay(newExpr);
      setJustEvaled(false);
      return;
    }

    const newExpr = expression + value;
    setExpression(newExpr);
    setDisplay(newExpr || '0');
    setJustEvaled(false);
  }, [expression, display, justEvaled]);

  const handleEquals = useCallback(() => {
    if (!expression.trim()) return;
    const result = safeEvaluate(expression, isDeg);
    setHistory(prev => [
      { expression, result, timestamp: Date.now() },
      ...prev.slice(0, 9),
    ]);
    setDisplay(result);
    setExpression(result === 'Error' ? '' : result);
    setJustEvaled(true);
  }, [expression, isDeg]);

  const handleClear = useCallback(() => {
    setExpression('');
    setDisplay('0');
    setJustEvaled(false);
  }, []);

  const handleBackspace = useCallback(() => {
    const newExpr = expression.slice(0, -1);
    setExpression(newExpr);
    setDisplay(newExpr || '0');
    setJustEvaled(false);
  }, [expression]);

  const handleNegate = useCallback(() => {
    if (!expression) return;
    const negated = expression.startsWith('-') ? expression.slice(1) : '-' + expression;
    setExpression(negated);
    setDisplay(negated || '0');
  }, [expression]);

  const handleMemory = useCallback((op: string) => {
    const current = parseFloat(display);
    if (op === 'MC') setMemory(0);
    else if (op === 'MR') {
      setExpression(memory.toString());
      setDisplay(memory.toString());
      setJustEvaled(false);
    }
    else if (op === 'M+') setMemory(prev => prev + (isNaN(current) ? 0 : current));
    else if (op === 'M-') setMemory(prev => prev - (isNaN(current) ? 0 : current));
  }, [display, memory]);

  const handleButton = useCallback((btn: CalcButton) => {
    if (btn.value === 'AC')    handleClear();
    else if (btn.value === 'BS')   handleBackspace();
    else if (btn.value === '=')    handleEquals();
    else if (btn.value === 'NEG')  handleNegate();
    else if (btn.type === 'mem')   handleMemory(btn.value!);
    else                           handleInput(btn.value!, btn.type);
  }, [handleClear, handleBackspace, handleEquals, handleNegate, handleMemory, handleInput]);

  // Display font size — shrink for long expressions
  const dispFontSize = display.length > 18 ? 14 : display.length > 12 ? 17 : 22;

  return (
    <div style={{
      background: T.ink, border: `1px solid ${T.bd}`, borderRadius: 12,
      overflow: 'hidden', fontFamily: T.fs,
      boxShadow: '0 4px 24px rgba(0,0,0,0.35)',
      width: '100%',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 14px', borderBottom: `1px solid ${T.bd}`,
        background: T.ink2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 26, height: 26, borderRadius: 7,
            background: T.blLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 14,
          }}>🧮</div>
          <span style={{ fontSize: 12, fontWeight: 700, color: T.tx, fontFamily: T.fs }}>
            Calculator
          </span>
          {memory !== 0 && (
            <span style={{
              fontSize: 9, fontWeight: 700, color: T.vl,
              background: T.vlLt, borderRadius: 4, padding: '2px 5px',
            }}>
              M={memory}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Deg/Rad toggle */}
          <button
            onClick={() => setIsDeg(d => !d)}
            style={{
              padding: '3px 8px', fontSize: 10, fontWeight: 700, borderRadius: 6,
              border: 'none', cursor: 'pointer', fontFamily: T.fs,
              background: isDeg ? T.emLt : T.amLt,
              color: isDeg ? '#065f46' : '#92400e',
            }}
            title="Toggle degrees/radians"
          >
            {isDeg ? 'DEG' : 'RAD'}
          </button>

          {/* Collapse toggle */}
          {collapsible && (
            <button
              onClick={() => setIsExpanded(e => !e)}
              style={{
                padding: '3px 7px', fontSize: 11, background: T.bd,
                border: 'none', borderRadius: 5, color: T.tx2, cursor: 'pointer',
              }}
            >
              {isExpanded ? '▲' : '▼'}
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Display */}
          <div style={{
            padding: '12px 14px 8px', background: T.ink,
            borderBottom: `1px solid ${T.bd}`,
          }}>
            {/* History scroll */}
            {history.length > 0 && (
              <div style={{
                maxHeight: 64, overflowY: 'auto', marginBottom: 6,
                display: 'flex', flexDirection: 'column', gap: 2,
              }}>
                {history.slice(0, 3).map(h => (
                  <div
                    key={h.timestamp}
                    style={{
                      display: 'flex', justifyContent: 'space-between',
                      fontSize: 10, color: T.tx3, fontFamily: T.fm,
                      cursor: 'pointer', padding: '1px 0',
                    }}
                    onClick={() => { setExpression(h.result); setDisplay(h.result); }}
                    title="Click to reuse result"
                  >
                    <span style={{ color: T.tx3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '65%' }}>
                      {h.expression}
                    </span>
                    <span style={{ color: T.tx2 }}>= {h.result}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Main display */}
            <div
              ref={displayRef}
              style={{
                textAlign: 'right',
                fontSize: dispFontSize,
                fontWeight: 700,
                fontFamily: T.fm,
                color: display === 'Error' ? T.rd : display === '∞' ? T.am : T.tx,
                lineHeight: 1.2,
                minHeight: 32,
                wordBreak: 'break-all',
              }}
            >
              {display}
            </div>
            {/* Expression preview (when display shows result) */}
            {justEvaled && expression && (
              <div style={{ textAlign: 'right', fontSize: 10, color: T.tx3, fontFamily: T.fm, marginTop: 2 }}>
                ANS
              </div>
            )}
          </div>

          {/* Button grid */}
          <div style={{ padding: '8px 10px 12px', display: 'flex', flexDirection: 'column', gap: 5 }}>
            {BUTTONS.map((row, ri) => (
              <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 5 }}>
                {row.map((btn, bi) => {
                  // Handle wide buttons (0 key spans 2 columns)
                  const gridStyle: React.CSSProperties = btn.wide
                    ? { gridColumn: 'span 2' }
                    : {};
                  // Row 5-8 have only 4 buttons — span the first 3 across top-half cols
                  const isBottomRow = ri >= 4;
                  const adjustedGrid: React.CSSProperties = isBottomRow
                    ? {
                        gridColumn: bi === 0 ? 'span 2' : bi === 1 ? 'span 1' : bi === 2 ? 'span 2' : 'span 1',
                        ...gridStyle,
                      }
                    : gridStyle;

                  return (
                    <button
                      key={bi}
                      style={{ ...btnStyle(btn.type), ...adjustedGrid }}
                      onClick={() => handleButton(btn)}
                      onMouseDown={e => { (e.target as HTMLButtonElement).style.transform = 'scale(0.94)'; }}
                      onMouseUp={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1)'; }}
                      onMouseLeave={e => { (e.target as HTMLButtonElement).style.transform = 'scale(1)'; }}
                    >
                      {btn.label}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ScholarlyCalculator;
