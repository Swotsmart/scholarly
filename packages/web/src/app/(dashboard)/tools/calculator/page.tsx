'use client';

/**
 * /tools/calculator — Standalone Calculator Page
 *
 * Part of the Math Toolkit module. Full-page calculator experience
 * accessible from the sidebar or direct URL.
 */

import Link from 'next/link';
import { ArrowLeft, BarChart2, BarChart3 } from 'lucide-react';
import { ScholarlyCalculator } from '@/components/calculator';

export default function CalculatorPage() {
  return (
    <div className="min-h-[calc(100vh-52px)] flex flex-col items-center p-8 pb-16 font-sans bg-background">

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="w-full max-w-[400px] flex items-center justify-between mb-6">
        <div className="flex items-center gap-2.5">
          <Link
            href="/tools/mathcanvas"
            className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground no-underline"
          >
            <ArrowLeft size={13} />
            Math Toolkit
          </Link>
          <span className="text-muted-foreground text-sm">›</span>
          <span className="text-xs font-bold text-foreground">Calculator</span>
        </div>

        <Link
          href="/tools/mathcanvas"
          className="flex items-center gap-1.5 text-xs font-semibold text-primary no-underline bg-primary/10 rounded-md px-2.5 py-1 hover:bg-primary/20"
        >
          <BarChart2 size={12} />
          Open MathCanvas
        </Link>
      </div>

      {/* ── Page title ──────────────────────────────────────────────────── */}
      <div className="w-full max-w-[400px] mb-5">
        <h1 className="text-xl font-extrabold text-foreground m-0">
          Scientific Calculator
        </h1>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
          Part of the Math Toolkit. Trig functions, logarithms, memory, and
          deg/rad modes. Open MathCanvas alongside for full AI visualisation.
        </p>
      </div>

      {/* ── Calculator ──────────────────────────────────────────────────── */}
      <div className="w-full max-w-[400px]">
        <ScholarlyCalculator size="full" />
      </div>

      {/* ── Math Toolkit footer links ────────────────────────────────────── */}
      <div className="mt-8 w-full max-w-[400px] border-t border-border pt-5">
        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Math Toolkit
        </div>
        <div className="flex gap-2">
          <Link
            href="/tools/mathcanvas"
            className="flex-1 flex flex-col gap-1 p-3 rounded-lg bg-card border border-border no-underline hover:border-primary/40"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
                <BarChart2 size={13} className="text-primary" />
              </div>
              <span className="text-xs font-bold text-foreground">MathCanvas</span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">
              AI-native 2D & 3D mathematical visualisation
            </span>
          </Link>

          <div className="flex-1 flex flex-col gap-1 p-3 rounded-lg bg-card border border-border opacity-50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <BarChart3 size={13} className="text-emerald-600" />
              </div>
              <span className="text-xs font-bold text-foreground">Statistics</span>
            </div>
            <span className="text-[10px] text-muted-foreground leading-snug">
              Distribution explorer — coming soon
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}
