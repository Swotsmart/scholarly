'use client';

/**
 * /tools/calculator — Standalone Calculator Page
 *
 * Part of the Math Toolkit module. This is the full-page calculator experience
 * for users who want the calculator outside of MathCanvas — accessible from
 * the sidebar "Math Toolkit" entry or by direct URL.
 *
 * The same ScholarlyCalculator component is used here as in the MathCanvas
 * floater — one component, two surfaces. This is the Math Toolkit's module
 * boundary: the component library is shared; the routing and context differ.
 *
 * Layout: centred single-column, capped at 400px, on the Scholarly dark bg.
 * Links back to MathCanvas so the user can move between toolkit tools
 * without going through the sidebar.
 */

import Link from 'next/link';
import { ArrowLeft, BarChart2 } from 'lucide-react';
import { ScholarlyCalculator } from '@/components/calculator';

export default function CalculatorPage() {
  return (
    <div style={{
      minHeight: 'calc(100vh - 52px)',
      background: '#0f1419',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '32px 16px 64px',
      fontFamily: "'Open Sans', system-ui, sans-serif",
    }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{
        width: '100%', maxWidth: 400,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 24,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Math Toolkit breadcrumb */}
          <Link
            href="/tools/mathcanvas"
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              fontSize: 11, fontWeight: 600, color: '#8899aa',
              textDecoration: 'none',
            }}
          >
            <ArrowLeft size={13} />
            Math Toolkit
          </Link>
          <span style={{ color: '#2a3f56', fontSize: 13 }}>›</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#e8edf2' }}>
            Calculator
          </span>
        </div>

        {/* Quick link to MathCanvas */}
        <Link
          href="/tools/mathcanvas"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            fontSize: 11, fontWeight: 600, color: '#1e9df1',
            textDecoration: 'none',
            background: '#e3f3fd', borderRadius: 6, padding: '4px 10px',
          }}
        >
          <BarChart2 size={12} />
          Open MathCanvas
        </Link>
      </div>

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 400, marginBottom: 20 }}>
        <h1 style={{
          fontSize: 22, fontWeight: 800, color: '#e8edf2', margin: 0,
          fontFamily: "'Open Sans', system-ui, sans-serif",
        }}>
          Scientific Calculator
        </h1>
        <p style={{
          fontSize: 12, color: '#8899aa', marginTop: 6, lineHeight: 1.6,
        }}>
          Part of the Math Toolkit. Trig functions, logarithms, memory, and
          deg/rad modes. Open MathCanvas alongside for full AI visualisation.
        </p>
      </div>

      {/* ── Calculator ──────────────────────────────────────────────────── */}
      <div style={{ width: '100%', maxWidth: 400 }}>
        <ScholarlyCalculator size="full" />
      </div>

      {/* ── Math Toolkit footer links ────────────────────────────────────── */}
      <div style={{
        marginTop: 32, width: '100%', maxWidth: 400,
        borderTop: '1px solid #1e2d3d', paddingTop: 20,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 700, color: '#4d6070',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
        }}>
          Math Toolkit
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link
            href="/tools/mathcanvas"
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
              padding: '12px 14px', borderRadius: 10,
              background: '#1a2332', border: '1px solid #1e2d3d',
              textDecoration: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, background: '#e3f3fd',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>📐</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e8edf2' }}>MathCanvas</span>
            </div>
            <span style={{ fontSize: 10, color: '#8899aa', lineHeight: 1.5 }}>
              AI-native 2D & 3D mathematical visualisation
            </span>
          </Link>

          <div
            style={{
              flex: 1, display: 'flex', flexDirection: 'column', gap: 4,
              padding: '12px 14px', borderRadius: 10,
              background: '#1a2332', border: '1px solid #1e2d3d',
              opacity: 0.5,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <div style={{
                width: 24, height: 24, borderRadius: 6, background: '#ecfdf5',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
              }}>📊</div>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#e8edf2' }}>Statistics</span>
            </div>
            <span style={{ fontSize: 10, color: '#8899aa', lineHeight: 1.5 }}>
              Distribution explorer — coming soon
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
