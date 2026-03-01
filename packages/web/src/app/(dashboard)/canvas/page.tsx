import { Suspense } from 'react';
import { Metadata } from 'next';
import { SRCanvasClient } from '@/components/canvas/sr-canvas-client';

export const metadata: Metadata = {
  title: 'S&R Canvas | Scholarly',
  description: 'Visual workflow designer for Sense & Respond automation pipelines.',
};

// Canvas loading skeleton — gives immediate visual feedback while the
// heavy canvas component hydrates. The skeleton mirrors the canvas
// layout: a left palette panel, centre canvas area, right inspector.
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

export default function CanvasPage() {
  return (
    <Suspense fallback={<CanvasLoadingSkeleton />}>
      <SRCanvasClient />
    </Suspense>
  );
}
