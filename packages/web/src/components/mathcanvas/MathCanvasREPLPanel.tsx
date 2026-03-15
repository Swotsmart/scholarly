'use client';

/**
 * MathCanvasREPLPanel
 *
 * Interactive CAS REPL (Read–Eval–Print Loop) for the MathCanvas REPL tab.
 *
 * Think of it as a calculator that understands mathematics the way a
 * mathematician does — not as floating-point approximations, but as
 * symbolic truth.  Type "diff x^3 + sin(x)" and you get "3*x^2 + cos(x)",
 * not "2.9999..." at some sample point.
 *
 * Architecture:
 *   - Left: command palette (pill buttons for each CAS command)
 *   - Centre: input field + history scroll
 *   - Right: rendered result (KaTeX LaTeX display)
 *   - Below each result: "Show working" button → calls /steps
 *
 * KaTeX is loaded from CDN (same strategy as math.js).
 * Falls back to plain-text display if KaTeX is unavailable.
 *
 * History is maintained in component state — last 20 REPL entries.
 * Each entry shows: command badge · input expression · result · LaTeX
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Loader2, ChevronRight, Terminal, BookOpen, RotateCcw, Copy, Check, AlertTriangle, Lightbulb } from 'lucide-react';
import type { REPLResponse, StepsResponse } from '@/types/mathcanvas';

// =============================================================================
// Design tokens (inherited from MathCanvasPage)
// =============================================================================

const T = {
  bl: '#1e9df1', blLt: '#e3f3fd', blMid: '#b8ddf8',
  ink: '#0f1419',
  vio: '#8b5cf6', vioLt: '#f5f3ff', vioMid: '#ddd6fe',
  em: '#10b981', emLt: '#ecfdf5',
  am: '#f59e0b', amLt: '#fffbeb',
  rd: '#ef4444', rdLt: '#fef2f2',
  bg: '#f7f8f8', sf: '#ffffff', bd: '#e1eaef',
  tx: '#0f1419', tx2: '#536471', tx3: '#8b99a4',
  fs: "'Open Sans', system-ui, sans-serif",
  fm: "'JetBrains Mono', Menlo, monospace",
};

// =============================================================================
// Types
// =============================================================================

interface REPLEntry {
  id: string;
  command: string;
  expression: string;
  response: REPLResponse;
  steps?: StepsResponse | null;
  loadingSteps?: boolean;
  copiedResult?: boolean;
}

interface MathCanvasREPLPanelProps {
  onRequestSteps: (operation: string, expression: string, variable?: string) => Promise<StepsResponse>;
  onREPLEval: (command: string, expression: string, opts?: {
    variable?: string;
    lower?: number;
    upper?: number;
    point?: number;
    order?: number;
  }) => Promise<REPLResponse>;
  currentExpression?: string;  // pre-populate from active surface expression
}

// =============================================================================
// Command definitions
// =============================================================================

const COMMANDS = [
  { id: 'diff',      label: 'd/dx',      description: 'Differentiate',           color: T.bl,  example: 'x^3 - 3*x + 2' },
  { id: 'partial',   label: '∂/∂x',      description: 'Partial ∂f/∂x',           color: T.bl,  example: 'x^2 + x*y + y^2' },
  { id: 'integrate', label: '∫',          description: 'Integrate',               color: T.vio, example: '3*x^2 - 2*x' },
  { id: 'solve',     label: 'solve',      description: 'Solve equation',          color: T.em,  example: 'x^2 - 5*x + 6 = 0' },
  { id: 'factor',    label: 'factor',     description: 'Factorise',               color: T.am,  example: 'x^2 - 5*x + 6' },
  { id: 'expand',    label: 'expand',     description: 'Expand brackets',         color: T.am,  example: '(x+1)*(x-2)*(x+3)' },
  { id: 'simplify',  label: 'simplify',   description: 'Simplify expression',     color: T.tx2, example: '(x^2-1)/(x-1)' },
  { id: 'gradient',  label: '∇f',         description: 'Gradient vector',         color: T.em,  example: 'x^2 + y^2' },
  { id: 'taylor',    label: 'Taylor',     description: 'Taylor expansion',        color: T.vio, example: 'sin(x)' },
  { id: 'limit',     label: 'lim',        description: 'Limit as x → point',     color: T.bl,  example: 'sin(x)/x' },
  { id: 'evaluate',  label: '≈',          description: 'Numeric evaluation',      color: T.tx2, example: 'sqrt(2) + pi' },
];

// =============================================================================
// LaTeX renderer (KaTeX via CDN)
// =============================================================================

function LatexDisplay({ latex, inline = false }: { latex: string; inline?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current || !latex) return;
    const win = window as Window & { katex?: { renderToString: (s: string, opts: object) => string } };
    if (win.katex) {
      try {
        ref.current.innerHTML = win.katex.renderToString(latex, {
          displayMode: !inline,
          throwOnError: false,
          errorColor: T.rd,
        });
        return;
      } catch { /* fall through */ }
    }
    // Fallback: plain text in monospace
    ref.current.innerHTML = `<span style="font-family:${T.fm};font-size:13px;color:${T.tx}">${latex}</span>`;
  }, [latex, inline]);

  return <div ref={ref} style={{ lineHeight: 1.6 }} />;
}

// =============================================================================
// Single REPL history entry
// =============================================================================

function REPLHistoryEntry({
  entry,
  onShowSteps,
  onCopyResult,
}: {
  entry: REPLEntry;
  onShowSteps: (id: string) => void;
  onCopyResult: (id: string) => void;
}) {
  const cmd = COMMANDS.find(c => c.id === entry.command);
  const cmdColor = cmd?.color ?? T.bl;

  return (
    <div
      style={{
        background: entry.response.success ? T.sf : T.rdLt,
        border: `1px solid ${entry.response.success ? T.bd : '#fca5a5'}`,
        borderRadius: 8,
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Input line */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          style={{
            background: cmdColor,
            color: '#fff',
            borderRadius: 4,
            padding: '1px 7px',
            fontSize: 11,
            fontWeight: 700,
            fontFamily: T.fm,
            flexShrink: 0,
          }}
        >
          {entry.command}
        </span>
        <span style={{ fontFamily: T.fm, fontSize: 13, color: T.tx, flex: 1, wordBreak: 'break-all' }}>
          {entry.expression}
        </span>
      </div>

      {/* Error state */}
      {!entry.response.success && entry.response.error && (
        <div style={{ fontSize: 12, color: T.rd, fontFamily: T.fs }}>
          <AlertTriangle size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{entry.response.error}
        </div>
      )}

      {/* Result */}
      {entry.response.success && (
        <>
          {/* LaTeX rendered result */}
          <div
            style={{
              background: T.bg,
              border: `1px solid ${T.bd}`,
              borderRadius: 6,
              padding: '10px 14px',
              minHeight: 40,
              overflowX: 'auto',
            }}
          >
            <LatexDisplay latex={entry.response.latex} />
          </div>

          {/* Plain text result + actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: T.fm, fontSize: 11, color: T.tx2, flex: 1 }}>
              = {entry.response.result}
            </span>

            <button
              onClick={() => onCopyResult(entry.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 8px', fontSize: 11, fontFamily: T.fs, fontWeight: 600,
                background: 'transparent', color: entry.copiedResult ? T.em : T.tx3,
                border: `1px solid ${T.bd}`, borderRadius: 5, cursor: 'pointer',
              }}
              title="Copy result"
            >
              {entry.copiedResult ? <Check size={11} /> : <Copy size={11} />}
              {entry.copiedResult ? 'Copied' : 'Copy'}
            </button>

            {entry.response.steps_available && !entry.steps && !entry.loadingSteps && (
              <button
                onClick={() => onShowSteps(entry.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', fontSize: 11, fontFamily: T.fs, fontWeight: 600,
                  background: T.vioLt, color: T.vio,
                  border: `1px solid ${T.vioMid}`, borderRadius: 5, cursor: 'pointer',
                }}
              >
                <BookOpen size={11} />
                Show working
              </button>
            )}

            {entry.loadingSteps && (
              <span style={{ fontSize: 11, color: T.tx3, display: 'flex', alignItems: 'center', gap: 4 }}>
                <Loader2 size={11} className="animate-spin" /> Loading steps…
              </span>
            )}
          </div>

          {/* Numeric approximation */}
          {entry.response.numeric !== null && entry.response.numeric !== undefined && (
            <div style={{ fontSize: 11, color: T.tx3, fontFamily: T.fm }}>
              ≈ {entry.response.numeric.toFixed(6)}
            </div>
          )}
        </>
      )}

      {/* Working steps (expanded inline) */}
      {entry.steps && (
        <StepsDisplay steps={entry.steps} />
      )}
    </div>
  );
}

// =============================================================================
// Steps display (inline below REPL entry)
// =============================================================================

function StepsDisplay({ steps }: { steps: StepsResponse }) {
  if (!steps.success) {
    return (
      <div style={{ fontSize: 12, color: T.rd, fontFamily: T.fs }}>
        Steps unavailable: {steps.error}
      </div>
    );
  }

  return (
    <div
      style={{
        background: T.vioLt,
        border: `1px solid ${T.vioMid}`,
        borderRadius: 6,
        padding: '10px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: T.vio, fontFamily: T.fs, letterSpacing: '0.05em' }}>
        STEP-BY-STEP WORKING
      </div>

      {steps.steps.map(step => (
        <div key={step.step_number} style={{ display: 'flex', gap: 10 }}>
          {/* Step number */}
          <div
            style={{
              width: 22, height: 22, borderRadius: '50%',
              background: T.vio, color: '#fff',
              fontSize: 10, fontWeight: 700, fontFamily: T.fm,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 2,
            }}
          >
            {step.step_number}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* Rule badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{
                fontSize: 10, fontWeight: 700, fontFamily: T.fm,
                color: T.vio, textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {step.rule}
              </span>
            </div>
            {/* Explanation */}
            <div style={{ fontSize: 12, color: T.tx, fontFamily: T.fs, lineHeight: 1.5 }}>
              {step.explanation}
            </div>
            {/* LaTeX result */}
            <div style={{
              background: T.sf, border: `1px solid ${T.bd}`,
              borderRadius: 4, padding: '5px 10px',
            }}>
              <LatexDisplay latex={step.latex} />
            </div>
            {/* Teacher note */}
            {step.note && (
              <div style={{ fontSize: 11, color: T.am, fontFamily: T.fs, fontStyle: 'italic' }}>
                <Lightbulb size={11} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />{step.note}
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Final result */}
      <div style={{
        background: T.sf, border: `1px solid ${T.vioMid}`,
        borderRadius: 6, padding: '8px 12px',
        display: 'flex', flexDirection: 'column', gap: 4,
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.vio, fontFamily: T.fs, letterSpacing: '0.05em' }}>
          FINAL RESULT
        </div>
        <LatexDisplay latex={steps.final_latex} />
      </div>

      {/* Concept note */}
      {steps.concept_note && (
        <div style={{
          fontSize: 11, color: T.tx2, fontFamily: T.fs, lineHeight: 1.5,
          borderTop: `1px solid ${T.vioMid}`, paddingTop: 8, fontStyle: 'italic',
        }}>
          {steps.concept_note}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Main component
// =============================================================================

export default function MathCanvasREPLPanel({
  onRequestSteps,
  onREPLEval,
  currentExpression = '',
}: MathCanvasREPLPanelProps) {
  const [expression, setExpression] = useState(currentExpression);
  const [activeCommand, setActiveCommand] = useState<string>('diff');
  const [variable, setVariable] = useState('x');
  const [lower, setLower] = useState('');
  const [upper, setUpper] = useState('');
  const [history, setHistory] = useState<REPLEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const historyEndRef = useRef<HTMLDivElement>(null);

  // Load KaTeX CDN on mount
  useEffect(() => {
    const win = window as Window & { katex?: unknown };
    if (!win.katex && !document.getElementById('katex-cdn')) {
      const link = document.createElement('link');
      link.id = 'katex-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css';
      document.head.appendChild(link);

      const script = document.createElement('script');
      script.id = 'katex-cdn';
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.js';
      document.head.appendChild(script);
    }
  }, []);

  // Scroll to bottom when history grows
  useEffect(() => {
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  // Sync currentExpression prop
  useEffect(() => {
    if (currentExpression) setExpression(currentExpression);
  }, [currentExpression]);

  const handleEval = useCallback(async () => {
    if (!expression.trim() || isLoading) return;
    setIsLoading(true);

    const opts: {
      variable?: string;
      lower?: number;
      upper?: number;
    } = { variable };
    if (lower) opts.lower = parseFloat(lower);
    if (upper) opts.upper = parseFloat(upper);

    const response = await onREPLEval(activeCommand, expression.trim(), opts);

    const entry: REPLEntry = {
      id: `repl-${Date.now()}`,
      command: activeCommand,
      expression: expression.trim(),
      response,
    };

    setHistory(prev => [...prev.slice(-19), entry]); // keep last 20
    setIsLoading(false);
  }, [expression, activeCommand, variable, lower, upper, isLoading, onREPLEval]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEval();
    }
  };

  const handleShowSteps = useCallback(async (entryId: string) => {
    const entry = history.find(e => e.id === entryId);
    if (!entry) return;

    // Map REPL command → steps operation
    const opMap: Record<string, string> = {
      diff: 'diff', integrate: 'integrate', factor: 'factor',
      solve: 'solve', simplify: 'simplify', expand: 'expand',
      partial: 'partial_x', gradient: 'gradient',
    };
    const operation = opMap[entry.command] ?? entry.command;

    setHistory(prev => prev.map(e =>
      e.id === entryId ? { ...e, loadingSteps: true } : e
    ));

    const steps = await onRequestSteps(operation, entry.expression, variable);

    setHistory(prev => prev.map(e =>
      e.id === entryId ? { ...e, steps, loadingSteps: false } : e
    ));
  }, [history, variable, onRequestSteps]);

  const handleCopyResult = useCallback((entryId: string) => {
    const entry = history.find(e => e.id === entryId);
    if (!entry?.response.result) return;
    navigator.clipboard.writeText(entry.response.result).catch(() => {});
    setHistory(prev => prev.map(e =>
      e.id === entryId ? { ...e, copiedResult: true } : e
    ));
    setTimeout(() => {
      setHistory(prev => prev.map(e =>
        e.id === entryId ? { ...e, copiedResult: false } : e
      ));
    }, 2000);
  }, [history]);

  const clearHistory = () => setHistory([]);

  const isIntegrateMode = activeCommand === 'integrate';
  const isTaylorOrLimit = activeCommand === 'taylor' || activeCommand === 'limit';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', fontFamily: T.fs }}>

      {/* Header */}
      <div style={{
        padding: '10px 14px',
        borderBottom: `1px solid ${T.bd}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Terminal size={14} style={{ color: T.vio }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: T.ink, letterSpacing: '0.04em' }}>
            CAS REPL
          </span>
          <span style={{ fontSize: 10, color: T.tx3, fontFamily: T.fm }}>
            SageMath
          </span>
        </div>
        {history.length > 0 && (
          <button
            onClick={clearHistory}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '3px 8px', fontSize: 11, fontFamily: T.fs, fontWeight: 600,
              background: 'transparent', color: T.tx3,
              border: `1px solid ${T.bd}`, borderRadius: 5, cursor: 'pointer',
            }}
          >
            <RotateCcw size={10} /> Clear
          </button>
        )}
      </div>

      {/* Command palette */}
      <div style={{
        padding: '8px 12px',
        borderBottom: `1px solid ${T.bd}`,
        display: 'flex', flexWrap: 'wrap', gap: 5,
      }}>
        {COMMANDS.map(cmd => (
          <button
            key={cmd.id}
            onClick={() => {
              setActiveCommand(cmd.id);
              if (!expression && cmd.example) setExpression(cmd.example);
            }}
            title={cmd.description}
            style={{
              padding: '3px 9px', fontSize: 11, fontWeight: 700,
              fontFamily: T.fm,
              background: activeCommand === cmd.id ? cmd.color : T.bg,
              color: activeCommand === cmd.id ? '#fff' : T.tx2,
              border: `1px solid ${activeCommand === cmd.id ? cmd.color : T.bd}`,
              borderRadius: 5, cursor: 'pointer',
              transition: 'all 0.12s',
            }}
          >
            {cmd.label}
          </button>
        ))}
      </div>

      {/* Input bar */}
      <div style={{ padding: '10px 12px', borderBottom: `1px solid ${T.bd}`, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {/* Command badge */}
          <div style={{
            padding: '0 10px', background: COMMANDS.find(c => c.id === activeCommand)?.color ?? T.bl,
            color: '#fff', borderRadius: 6, fontSize: 11, fontWeight: 700,
            fontFamily: T.fm, display: 'flex', alignItems: 'center', flexShrink: 0,
          }}>
            {activeCommand}
          </div>

          {/* Expression input */}
          <input
            value={expression}
            onChange={e => setExpression(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={COMMANDS.find(c => c.id === activeCommand)?.example ?? 'expression…'}
            style={{
              flex: 1, padding: '6px 10px', fontSize: 13,
              fontFamily: T.fm, color: T.ink,
              background: T.sf, border: `1px solid ${T.bd}`,
              borderRadius: 6, outline: 'none',
            }}
          />

          {/* Variable */}
          <input
            value={variable}
            onChange={e => setVariable(e.target.value)}
            placeholder="var"
            title="Variable (e.g. x, y)"
            style={{
              width: 44, padding: '6px 6px', fontSize: 12, textAlign: 'center',
              fontFamily: T.fm, color: T.ink,
              background: T.sf, border: `1px solid ${T.bd}`,
              borderRadius: 6, outline: 'none',
            }}
          />

          {/* Eval button */}
          <button
            onClick={handleEval}
            disabled={isLoading || !expression.trim()}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '6px 12px', fontSize: 12, fontWeight: 700,
              fontFamily: T.fs,
              background: isLoading ? T.tx3 : T.vio,
              color: '#fff',
              border: 'none', borderRadius: 6, cursor: isLoading ? 'default' : 'pointer',
            }}
          >
            {isLoading ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} />}
            Eval
          </button>
        </div>

        {/* Definite integral bounds */}
        {isIntegrateMode && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.tx3, fontFamily: T.fm }}>bounds:</span>
            <input value={lower} onChange={e => setLower(e.target.value)}
              placeholder="lower" style={{ width: 60, padding: '4px 6px', fontSize: 12, fontFamily: T.fm, border: `1px solid ${T.bd}`, borderRadius: 4, outline: 'none' }} />
            <span style={{ fontSize: 11, color: T.tx3 }}>to</span>
            <input value={upper} onChange={e => setUpper(e.target.value)}
              placeholder="upper" style={{ width: 60, padding: '4px 6px', fontSize: 12, fontFamily: T.fm, border: `1px solid ${T.bd}`, borderRadius: 4, outline: 'none' }} />
            <span style={{ fontSize: 10, color: T.tx3, fontStyle: 'italic' }}>leave blank for indefinite</span>
          </div>
        )}

        {isTaylorOrLimit && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.tx3, fontFamily: T.fm }}>
              {activeCommand === 'taylor' ? 'about x =' : 'as x →'}
            </span>
            <input value={lower} onChange={e => setLower(e.target.value)}
              placeholder="0" style={{ width: 60, padding: '4px 6px', fontSize: 12, fontFamily: T.fm, border: `1px solid ${T.bd}`, borderRadius: 4, outline: 'none' }} />
          </div>
        )}
      </div>

      {/* History */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {history.length === 0 && (
          <div style={{ textAlign: 'center', color: T.tx3, fontSize: 12, marginTop: 40 }}>
            <Terminal size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
            Select a command, type an expression, press Enter
          </div>
        )}
        {history.map(entry => (
          <REPLHistoryEntry
            key={entry.id}
            entry={entry}
            onShowSteps={handleShowSteps}
            onCopyResult={handleCopyResult}
          />
        ))}
        <div ref={historyEndRef} />
      </div>
    </div>
  );
}
