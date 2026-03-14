'use client';

/**
 * MathCanvasGeometryPanel — Construction Protocol Step-Replay
 *
 * This panel is the MathCanvas answer to GeoGebra's Construction Protocol.
 * In GeoGebra, every geometric construction is recorded as an ordered log of
 * atomic steps that the student can replay forward and backward, watching the
 * figure build itself one action at a time.
 *
 * The analogy is a mathematical flip-book: each page adds one geometric action
 * (draw a line, mark a point, bisect an angle) until the full construction is
 * revealed. Replaying teaches students the *why* behind a figure, not just the
 * what. This is the single highest-value GeoGebra parity feature for secondary
 * geometry education.
 *
 * Architecture:
 *   - Receives ConstructionState from the hook (via MathCanvasPage right panel)
 *   - Renders the step list with a highlighted current step
 *   - Play/pause auto-advances through steps on a configurable interval
 *   - Step SVG is rendered in the main canvas area via constructionSvg export
 *   - The panel itself occupies the right-panel 'steps' tab
 */

import React, { useEffect, useRef, useCallback } from 'react';
import type { ConstructionState } from '@/types/mathcanvas-extensions';

// ---------------------------------------------------------------------------
// Design tokens — mirrors MathCanvasPage's T object exactly
// ---------------------------------------------------------------------------
const T = {
  ink: '#0f1419', bg: '#0f1419', sf: '#1a2332', bd: '#1e2d3d',
  bl: '#1e9df1', blLt: '#e3f3fd', blMid: '#b3daf7',
  em: '#10b981', emLt: '#ecfdf5',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  vl: '#8b5cf6', vlLt: '#f5f3ff',
  ind: '#6366f1', indLt: '#eef2ff', indMid: '#c7d2fe',
  tx: '#e8edf2', tx2: '#8899aa', tx3: '#4d6070',
  fm: "'JetBrains Mono', monospace",
  fs: "'Open Sans', sans-serif",
};

// Icon map — simple SVG glyphs for each construction step type
const STEP_ICONS: Record<string, React.ReactNode> = {
  dot:          <circle cx="8" cy="8" r="3" fill={T.bl} />,
  line:         <line x1="2" y1="8" x2="14" y2="8" stroke={T.bl} strokeWidth="2" />,
  circle:       <circle cx="8" cy="8" r="5" stroke={T.bl} strokeWidth="1.5" fill="none" />,
  arc:          <path d="M4,12 A6,6 0 0,1 12,4" stroke={T.bl} strokeWidth="1.5" fill="none" />,
  bisect:       <><line x1="8" y1="2" x2="8" y2="14" stroke={T.ind} strokeWidth="1.5" strokeDasharray="3,2"/><line x1="2" y1="8" x2="14" y2="8" stroke={T.ind} strokeWidth="1.5" strokeDasharray="3,2"/></>,
  perpendicular:<><line x1="8" y1="2" x2="8" y2="14" stroke={T.em} strokeWidth="1.5"/><line x1="2" y1="8" x2="14" y2="8" stroke={T.em} strokeWidth="1.5"/></>,
  label:        <text x="4" y="12" fontSize="9" fill={T.am} fontFamily="monospace">A</text>,
  shade:        <rect x="3" y="5" width="10" height="6" fill={T.am} opacity="0.4" rx="1" />,
};

function StepIcon({ icon }: { icon?: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" style={{ flexShrink: 0 }}>
      {icon && STEP_ICONS[icon] ? STEP_ICONS[icon] : STEP_ICONS.dot}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface GeometryPanelProps {
  state: ConstructionState;
  onStepChange: (index: number) => void;
  onPlayPause: () => void;
  onReset: () => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function MathCanvasGeometryPanel({
  state,
  onStepChange,
  onPlayPause,
  onReset,
}: GeometryPanelProps) {
  const { response, currentStep, isPlaying } = state;
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying || !response) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      onStepChange(currentStep + 1 >= response.steps.length ? 0 : currentStep + 1);
    }, 1800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, currentStep, response, onStepChange]);

  const prev = useCallback(() => {
    if (!response) return;
    onStepChange(Math.max(0, currentStep - 1));
  }, [currentStep, response, onStepChange]);

  const next = useCallback(() => {
    if (!response) return;
    onStepChange(Math.min(response.steps.length - 1, currentStep + 1));
  }, [currentStep, response, onStepChange]);

  if (!response) {
    return (
      <div style={{ textAlign: 'center', padding: '24px 0', color: T.tx3, fontSize: 12 }}>
        Ask a geometry question to generate a construction protocol.
      </div>
    );
  }

  const steps = response.steps;
  const total = steps.length;
  const progress = total > 1 ? Math.round((currentStep / (total - 1)) * 100) : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.tx2, marginBottom: 2 }}>
          {response.title}
        </div>
        {response.theorem && (
          <div style={{
            fontSize: 10, color: T.ind, background: T.indLt,
            borderRadius: 4, padding: '3px 7px', display: 'inline-block',
            fontWeight: 600, marginBottom: 4,
          }}>
            {response.theorem}
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ fontSize: 10, color: T.tx3 }}>
            Step {currentStep + 1} of {total}
          </span>
          <span style={{ fontSize: 10, color: T.bl, fontFamily: T.fm, fontWeight: 700 }}>
            {progress}%
          </span>
        </div>
        <div style={{ height: 4, background: T.bd, borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%', width: `${progress}%`,
            background: T.bl, borderRadius: 2,
            transition: 'width 0.35s ease',
          }} />
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
        {/* Reset */}
        <button
          onClick={onReset}
          title="Reset to step 1"
          style={{
            padding: '5px 8px', fontSize: 11, fontWeight: 600,
            background: T.sf, border: `1px solid ${T.bd}`, borderRadius: 6,
            color: T.tx2, cursor: 'pointer', fontFamily: T.fs,
          }}
        >
          ↩
        </button>

        {/* Prev */}
        <button
          onClick={prev}
          disabled={currentStep === 0}
          style={{
            flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
            background: currentStep === 0 ? T.bd : T.sf,
            border: `1px solid ${T.bd}`, borderRadius: 6,
            color: currentStep === 0 ? T.tx3 : T.tx2,
            cursor: currentStep === 0 ? 'not-allowed' : 'pointer',
            fontFamily: T.fs,
          }}
        >
          ← Prev
        </button>

        {/* Play/Pause */}
        <button
          onClick={onPlayPause}
          style={{
            flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 700,
            background: isPlaying ? T.amMid : T.blLt,
            border: `1px solid ${isPlaying ? T.am : T.blMid}`,
            borderRadius: 6, color: isPlaying ? '#92400e' : T.bl,
            cursor: 'pointer', fontFamily: T.fs,
          }}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>

        {/* Next */}
        <button
          onClick={next}
          disabled={currentStep === total - 1}
          style={{
            flex: 1, padding: '5px 0', fontSize: 11, fontWeight: 600,
            background: currentStep === total - 1 ? T.bd : T.sf,
            border: `1px solid ${T.bd}`, borderRadius: 6,
            color: currentStep === total - 1 ? T.tx3 : T.tx2,
            cursor: currentStep === total - 1 ? 'not-allowed' : 'pointer',
            fontFamily: T.fs,
          }}
        >
          Next →
        </button>
      </div>

      {/* Current step highlight */}
      {steps[currentStep] && (
        <div style={{
          background: T.indLt, border: `1px solid ${T.indMid}`,
          borderRadius: 8, padding: '8px 10px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <StepIcon icon={steps[currentStep].icon} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: T.ind, marginBottom: 2 }}>
                Step {steps[currentStep].stepNumber}
              </div>
              <div style={{ fontSize: 11, color: '#3730a3', lineHeight: 1.5 }}>
                {steps[currentStep].action}
              </div>
              {steps[currentStep].reason && (
                <div style={{
                  fontSize: 10, color: T.tx3, marginTop: 4,
                  fontStyle: 'italic', lineHeight: 1.4,
                }}>
                  {steps[currentStep].reason}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step list — scrollable */}
      <div style={{ fontSize: 10, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        All Steps
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 220, overflowY: 'auto' }}>
        {steps.map((step, idx) => {
          const isCurrent = idx === currentStep;
          const isPast    = idx < currentStep;
          return (
            <button
              key={step.stepNumber}
              onClick={() => onStepChange(idx)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '6px 8px', borderRadius: 6, textAlign: 'left',
                border: isCurrent ? `1px solid ${T.indMid}` : `1px solid transparent`,
                background: isCurrent ? T.indLt : 'transparent',
                cursor: 'pointer', fontFamily: T.fs,
                transition: 'background 0.1s',
              }}
            >
              {/* Step number bubble */}
              <div style={{
                width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                background: isCurrent ? T.ind : isPast ? T.em : T.bd,
                color: (isCurrent || isPast) ? '#fff' : T.tx3,
              }}>
                {isPast ? '✓' : step.stepNumber}
              </div>
              <span style={{
                fontSize: 11,
                color: isCurrent ? T.ind : isPast ? T.tx2 : T.tx3,
                fontWeight: isCurrent ? 600 : 400,
                lineHeight: 1.4,
              }}>
                {step.action}
              </span>
            </button>
          );
        })}
      </div>

      {/* Teacher note */}
      {response.teacherNote && (
        <div style={{
          background: T.amLt, border: `1px solid ${T.amMid}`,
          borderRadius: 6, padding: '7px 9px', marginTop: 4,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
            Teacher Note
          </div>
          <div style={{ fontSize: 10, color: '#78350f', lineHeight: 1.5 }}>
            {response.teacherNote}
          </div>
        </div>
      )}
    </div>
  );
}

export default MathCanvasGeometryPanel;
