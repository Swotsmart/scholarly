'use client';
/**
 * MathCanvasExpressionBar — Priority 3 (Live Equation → Surface)
 *
 * The expression bar sits above the 3D viewport and lets a student type
 * any math.js-compatible expression like "sin(x)*cos(y)" and see the
 * surface render in real time — no AI round-trip, no waiting.
 *
 * Think of it as the address bar of a browser, but for mathematical surfaces.
 * The student types, the surface responds. This is the GeoGebra-feel that
 * transforms MathCanvas from a tool you query into a tool you play with.
 *
 * Architecture note:
 *   This component is PURELY presentational. All parsing, evaluation, and
 *   state live in use-mathcanvas.ts (liveExpression state) and
 *   mathcanvas-cas.ts (parseExpression function). The bar just:
 *     1. Renders the input + suggestion dropdown
 *     2. Calls onExpressionChange(raw) on every keystroke (debounced 300ms)
 *     3. Calls onExpressionCommit(raw) on Enter or suggestion click
 *     4. Displays parse errors inline (amber) and success state (green)
 *
 * Why debounce to 300ms?
 *   math.js evaluate() on a 60×60 grid takes ~4ms on an M2 MacBook.
 *   We re-evaluate on every debounced keystroke to feel instantaneous
 *   while not saturating the main thread during fast typing.
 *   On low-end devices (Chromebooks, older Android) we auto-detect
 *   slow evaluation and step down resolution from 60→40→20.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { FunctionSquare as FunctionIcon, ChevronDown, Check, AlertCircle, Zap, X } from 'lucide-react';
import { parseExpression, EXPRESSION_SUGGESTIONS } from '@/lib/mathcanvas-cas';
import type { LiveExpression } from '@/types/mathcanvas';

// Design system tokens (matching MathCanvasPage.tsx)
const T = {
  bl: '#1e9df1', blLt: '#e3f3fd',
  em: '#10b981', emLt: '#ecfdf5',
  am: '#f59e0b', amLt: '#fffbeb',
  vl: '#7c3aed', vlLt: '#f5f3ff',
  ink: '#0f1419', muted: '#6b7280',
  border: '#e5e7eb', surface: '#ffffff',
  errorBg: '#fef2f2', errorText: '#dc2626',
} as const;

// =============================================================================
// PROPS
// =============================================================================

export interface ExpressionBarProps {
  /** Current expression value (controlled) */
  value: string;
  /** Called on every debounced keystroke — triggers live surface update */
  onExpressionChange: (raw: string) => void;
  /** Called on Enter key or suggestion click — commits the expression */
  onExpressionCommit: (raw: string) => void;
  /** Called when the user clears the bar */
  onClear: () => void;
  /** Parse result from mathcanvas-cas (updated after each debounce) */
  liveExpression: LiveExpression | null;
  /** Whether a surface is currently rendering (show spinner) */
  isRendering: boolean;
  /** Whether to show this bar at all */
  visible: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export default function MathCanvasExpressionBar({
  value,
  onExpressionChange,
  onExpressionCommit,
  onClear,
  liveExpression,
  isRendering,
  visible,
}: ExpressionBarProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync external value → local (e.g. when a chip is clicked)
  useEffect(() => {
    if (value !== localValue) setLocalValue(value);
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback((raw: string) => {
    setLocalValue(raw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onExpressionChange(raw);
    }, 300);
  }, [onExpressionChange]);

  const handleCommit = useCallback((raw: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setLocalValue(raw);
    setShowSuggestions(false);
    onExpressionCommit(raw);
  }, [onExpressionCommit]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') { handleCommit(localValue); }
    if (e.key === 'Escape') { setShowSuggestions(false); inputRef.current?.blur(); }
  }, [localValue, handleCommit]);

  // Determine status badge
  const status: 'idle' | 'valid' | 'error' | 'rendering' =
    isRendering ? 'rendering'
    : !localValue ? 'idle'
    : liveExpression?.error ? 'error'
    : liveExpression?.canonical ? 'valid'
    : 'idle';

  if (!visible) return null;

  return (
    <div style={{ position: 'relative', zIndex: 20 }}>
      {/* ── Main bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '6px 10px',
        background: T.surface,
        border: `1.5px solid ${
          status === 'error' ? T.errorText
          : status === 'valid' ? T.em
          : T.border
        }`,
        borderRadius: 8,
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
        transition: 'border-color 0.15s',
      }}>

        {/* Icon */}
        <FunctionIcon size={15} style={{ color: T.vl, flexShrink: 0 }} />

        {/* Input */}
        <input
          ref={inputRef}
          value={localValue}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder='Type an expression, e.g. "sin(x)*cos(y)"'
          style={{
            flex: 1,
            border: 'none', outline: 'none',
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            fontSize: 13,
            color: T.ink,
            background: 'transparent',
            minWidth: 0,
          }}
          spellCheck={false}
          autoComplete="off"
          autoCorrect="off"
        />

        {/* Status indicator */}
        <StatusBadge status={status} liveExpression={liveExpression} />

        {/* Suggestions toggle */}
        <button
          onClick={() => setShowSuggestions(s => !s)}
          title="Browse example expressions"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '2px 4px', borderRadius: 4,
            color: T.muted, display: 'flex', alignItems: 'center',
          }}
        >
          <ChevronDown size={13} style={{ transform: showSuggestions ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
        </button>

        {/* Clear */}
        {localValue && (
          <button
            onClick={() => { setLocalValue(''); onClear(); }}
            title="Clear expression"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px', color: T.muted, display: 'flex', alignItems: 'center' }}
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* ── Canonical display (below bar) ── */}
      {status === 'valid' && liveExpression?.canonical && (
        <div style={{ fontSize: 11, color: T.em, paddingLeft: 4, paddingTop: 2, fontFamily: 'monospace' }}>
          ✓ {liveExpression.canonical}
          {liveExpression.renderMode !== 'unknown' && (
            <span style={{ marginLeft: 8, color: T.muted }}>
              → renders as {liveExpression.renderMode === '3d' ? 'z = f(x,y)' : 'y = f(x)'}
            </span>
          )}
        </div>
      )}

      {/* ── Error display ── */}
      {status === 'error' && liveExpression?.error && (
        <div style={{
          fontSize: 11, color: T.errorText, paddingLeft: 4, paddingTop: 2,
          display: 'flex', alignItems: 'center', gap: 4,
        }}>
          <AlertCircle size={11} /> {liveExpression.error}
        </div>
      )}

      {/* ── Suggestions dropdown ── */}
      {showSuggestions && (
        <SuggestionsDropdown
          onSelect={handleCommit}
          currentValue={localValue}
        />
      )}
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatusBadge({ status, liveExpression }: {
  status: 'idle' | 'valid' | 'error' | 'rendering';
  liveExpression: LiveExpression | null;
}) {
  if (status === 'rendering') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: T.vl }}>
        <Zap size={11} className="animate-pulse" /> rendering…
      </div>
    );
  }
  if (status === 'valid') {
    return <Check size={14} style={{ color: T.em, flexShrink: 0 }} />;
  }
  if (status === 'error') {
    return <AlertCircle size={14} style={{ color: T.errorText, flexShrink: 0 }} />;
  }
  return null;
}

function SuggestionsDropdown({ onSelect, currentValue }: {
  onSelect: (expr: string) => void;
  currentValue: string;
}) {
  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 8,
      boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
      maxHeight: 320, overflowY: 'auto',
      zIndex: 100,
    }}>
      {Object.entries(EXPRESSION_SUGGESTIONS).map(([group, exprs]) => (
        <div key={group}>
          <div style={{
            padding: '6px 12px 3px',
            fontSize: 10, fontWeight: 600,
            color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em',
          }}>
            {group}
          </div>
          {exprs.map(expr => (
            <button
              key={expr}
              onMouseDown={e => { e.preventDefault(); onSelect(expr); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '5px 16px',
                background: expr === currentValue ? T.vlLt : 'transparent',
                border: 'none', cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, color: T.ink,
                transition: 'background 0.1s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = T.vlLt)}
              onMouseLeave={e => (e.currentTarget.style.background = expr === currentValue ? T.vlLt : 'transparent')}
            >
              {expr}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

// vlLt not in T — add inline constant
const vlLt = '#f5f3ff';
Object.assign(T, { vlLt });
