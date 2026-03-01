'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';

// SRCanvasProduction — 3,860 lines of custom SVG canvas with drag-and-drop,
// typed port connections, undo/redo, recipe system, AI Intelligence Layer,
// and real-time execution dashboard. Loaded dynamically (ssr: false) because
// it uses SVG refs, mouse events, and WebSocket that only work client-side.
const SRCanvasProduction = dynamic(
  () => import('@/components/canvas-v2/SRCanvas'),
  {
    ssr: false,
    loading: () => <CanvasLoadingSkeleton />,
  }
);

function CanvasLoadingSkeleton() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
        <p className="text-sm text-muted-foreground">Loading Visual Workflow Designer...</p>
      </div>
    </div>
  );
}

export default function CanvasPage() {
  return (
    <div className="h-full">
      <SRCanvasProduction />
    </div>
  );
}
