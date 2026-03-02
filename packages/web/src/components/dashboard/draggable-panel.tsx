'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { Reorder, useDragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';

// =============================================================================
// DraggablePanel — wraps a single panel with a drag handle
// =============================================================================

interface DraggablePanelProps {
  id: string;
  children: ReactNode;
}

export function DraggablePanel({ id, children }: DraggablePanelProps) {
  const controls = useDragControls();

  return (
    <Reorder.Item
      value={id}
      dragListener={false}
      dragControls={controls}
      className="relative group/drag"
      transition={{ duration: 0.2 }}
    >
      {/* Drag handle — centered at top, visible on hover */}
      <button
        onPointerDown={(e) => controls.start(e)}
        className="absolute left-1/2 -translate-x-1/2 -top-1 z-10 flex items-center gap-0.5 rounded-b-md bg-muted/80 px-3 py-0.5 opacity-0 group-hover/drag:opacity-100 transition-opacity cursor-grab active:cursor-grabbing touch-none"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </button>
      {children}
    </Reorder.Item>
  );
}

// =============================================================================
// ReorderablePanels — drop-in wrapper that handles Reorder.Group + hydration
// =============================================================================

interface ReorderablePanelsProps<T extends string> {
  /** Ordered array of panel IDs from the layout store */
  panelOrder: T[];
  /** Callback when the user reorders panels */
  onReorder: (newOrder: T[]) => void;
  /** Map of panel ID → render function returning JSX */
  panelMap: Record<T, () => JSX.Element>;
  /** Gap between panels (Tailwind spacing class, default "space-y-8") */
  className?: string;
}

export function ReorderablePanels<T extends string>({
  panelOrder,
  onReorder,
  panelMap,
  className = 'space-y-8',
}: ReorderablePanelsProps<T>) {
  // Hydration guard: avoid layout flash from persisted order
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  if (!hydrated) {
    return (
      <div className={className}>
        {panelOrder.map((id) => {
          const render = panelMap[id];
          return <div key={id}>{render()}</div>;
        })}
      </div>
    );
  }

  return (
    <Reorder.Group
      axis="y"
      values={panelOrder}
      onReorder={(newOrder) => onReorder(newOrder as T[])}
      className={className}
    >
      {panelOrder.map((id) => {
        const render = panelMap[id];
        return (
          <DraggablePanel key={id} id={id}>
            {render()}
          </DraggablePanel>
        );
      })}
    </Reorder.Group>
  );
}
