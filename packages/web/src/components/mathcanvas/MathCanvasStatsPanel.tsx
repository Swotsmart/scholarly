'use client';

/**
 * MathCanvasStatsPanel — Statistics Mode Distribution Panel
 *
 * Renders in the right panel when mode === 'stats'. Shows the key statistics
 * (mean, variance, skewness), shaded probability regions, and curriculum link
 * for the current probability distribution visualisation.
 *
 * The slider parameters (μ, σ, n, p, λ etc.) are handled by the existing
 * ParamPanel in MathCanvasPage — this panel is complementary metadata.
 */

import React from 'react';
import type { MathCanvasStatsResponse } from '@/types/mathcanvas-extensions';

const T = {
  sf: '#1a2332', bd: '#1e2d3d',
  bl: '#1e9df1', blLt: '#e3f3fd', blMid: '#b3daf7',
  em: '#10b981', emLt: '#ecfdf5', emMid: '#a7f3d0',
  am: '#f59e0b', amLt: '#fffbeb', amMid: '#fde68a',
  vl: '#8b5cf6', vlLt: '#f5f3ff', vlMid: '#ddd6fe',
  ind: '#6366f1', indLt: '#eef2ff', indMid: '#c7d2fe',
  tx: '#e8edf2', tx2: '#8899aa', tx3: '#4d6070',
  fm: "'JetBrains Mono', monospace",
  fs: "'Open Sans', sans-serif",
};

const DISTRIBUTION_LABELS: Record<string, string> = {
  normal:      'Normal Distribution N(μ, σ²)',
  binomial:    'Binomial Distribution B(n, p)',
  poisson:     'Poisson Distribution Pois(λ)',
  uniform:     'Uniform Distribution U(a, b)',
  t:           'Student\'s t-Distribution t(ν)',
  chi_squared: 'Chi-Squared Distribution χ²(k)',
  exponential: 'Exponential Distribution Exp(λ)',
  geometric:   'Geometric Distribution Geo(p)',
};

interface StatsPanelProps {
  response: MathCanvasStatsResponse;
}

export function MathCanvasStatsPanel({ response }: StatsPanelProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Distribution badge */}
      <div style={{
        background: T.vlLt, border: `1px solid ${T.vlMid}`,
        borderRadius: 8, padding: '8px 10px',
      }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: T.vl, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
          Distribution
        </div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#4c1d95', fontFamily: T.fm }}>
          {DISTRIBUTION_LABELS[response.distribution] ?? response.distribution}
        </div>
        <div style={{ fontSize: 10, color: T.tx3, marginTop: 3, lineHeight: 1.5 }}>
          {response.curriculumDetail}
        </div>
      </div>

      {/* Key statistics grid */}
      {response.keyStats && response.keyStats.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Key Statistics
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
            {response.keyStats.map(stat => (
              <div key={stat.label} style={{
                background: T.sf, border: `1px solid ${T.bd}`,
                borderRadius: 6, padding: '6px 8px',
              }}>
                <div style={{ fontSize: 9, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                  {stat.label}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.bl, fontFamily: T.fm }}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shaded probability regions */}
      {response.shading && response.shading.length > 0 && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, color: T.tx3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
            Probability Regions
          </div>
          {response.shading.map((region, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', borderRadius: 6, marginBottom: 4,
              background: T.amLt, border: `1px solid ${T.amMid}`,
            }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, color: '#92400e' }}>
                  {region.label}
                </div>
                <div style={{ fontSize: 9, color: '#b45309', fontFamily: T.fm }}>
                  [{region.from.toFixed(2)}, {region.to.toFixed(2)}]
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: T.am, fontFamily: T.fm }}>
                {(region.probability * 100).toFixed(1)}%
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Teacher note */}
      {response.teacherNote && (
        <div style={{
          background: T.emLt, border: `1px solid ${T.emMid}`,
          borderRadius: 6, padding: '7px 9px',
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: '#065f46', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
            Teacher Note
          </div>
          <div style={{ fontSize: 10, color: '#064e3b', lineHeight: 1.5 }}>
            {response.teacherNote}
          </div>
        </div>
      )}
    </div>
  );
}

export default MathCanvasStatsPanel;
