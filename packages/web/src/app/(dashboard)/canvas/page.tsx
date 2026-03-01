'use client';

import React, { Suspense } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import the canvas client with SSR disabled — the canvas
// uses browser-only APIs (mouse events, getBoundingClientRect, etc.)
// and is 3800+ lines that must not crash the dashboard layout.
const SRCanvasClient = dynamic(
  () => import('@/components/canvas/sr-canvas-client'),
  { ssr: false, loading: () => <CanvasLoadingSkeleton /> }
);

function CanvasLoadingSkeleton() {
  return (
    <div className="flex h-[calc(100vh-64px)] bg-[#0F1923]">
      {/* Node palette skeleton */}
      <div className="w-60 border-r border-[#253545] p-4 space-y-3">
        <div className="h-8 bg-[#162230] rounded animate-pulse" />
        <div className="h-6 bg-[#162230] rounded animate-pulse w-3/4" />
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 bg-[#162230] rounded animate-pulse" />
        ))}
      </div>

      {/* Canvas area skeleton */}
      <div className="flex-1 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 border-2 border-[#4DA6FF] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm text-[#8BA4B8] font-mono">Loading canvas...</p>
          </div>
        </div>
      </div>

      {/* Inspector skeleton */}
      <div className="w-72 border-l border-[#253545] p-4 space-y-3">
        <div className="h-8 bg-[#162230] rounded animate-pulse" />
        <div className="h-40 bg-[#162230] rounded animate-pulse" />
        <div className="h-24 bg-[#162230] rounded animate-pulse" />
      </div>
    </div>
  );
}

class CanvasErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-[calc(100vh-64px)] items-center justify-center bg-[#0F1923]">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-4xl">&#x26A0;&#xFE0F;</div>
            <h2 className="text-lg font-semibold text-[#E8ECF0]">Canvas failed to load</h2>
            <p className="text-sm text-[#8BA4B8]">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-[#4DA6FF] text-white rounded text-sm hover:bg-[#3D96EF] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function CanvasPage() {
  return (
    <CanvasErrorBoundary>
      <Suspense fallback={<CanvasLoadingSkeleton />}>
        <SRCanvasClient />
      </Suspense>
    </CanvasErrorBoundary>
  );
}
