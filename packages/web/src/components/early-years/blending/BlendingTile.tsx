'use client';

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { GraphemeType } from './blending-data';

// =============================================================================
// TYPES
// =============================================================================

interface BlendingTileProps {
  phoneme: string;
  graphemeType: GraphemeType;
  state: 'idle' | 'highlighted' | 'blending' | 'merged';
  xOffset: number;
  soundButtonActive: boolean;
  mouthHint?: string;
  isInteractive: boolean;
  onTap: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const BLEND_SPRING = { type: 'spring' as const, stiffness: 120, damping: 14 };
const BOUNCE_SPRING = { type: 'spring' as const, stiffness: 300, damping: 20 };

const TILE_WIDTH: Record<GraphemeType, string> = {
  single: 'w-20',   // 80px
  digraph: 'w-24',  // 96px
  trigraph: 'w-28', // 112px
};

const FONT_SIZE: Record<GraphemeType, string> = {
  single: 'text-4xl',
  digraph: 'text-3xl',
  trigraph: 'text-2xl',
};

const PULSE_ANIMATION = {
  scale: [1, 1.4, 1],
  opacity: [0.7, 1, 0.7],
};

const PULSE_TRANSITION = {
  duration: 0.8,
  repeat: Infinity,
  ease: 'easeInOut' as const,
};

// =============================================================================
// COMPONENT
// =============================================================================

function BlendingTileInner({
  phoneme,
  graphemeType,
  state,
  xOffset,
  soundButtonActive,
  mouthHint,
  isInteractive,
  onTap,
}: BlendingTileProps) {
  // Build tile classes based on state
  const tileClasses = useMemo(() => {
    const base = [
      'flex items-center justify-center',
      'h-20 rounded-2xl border-2',
      'font-bold select-none',
      'min-h-[44px] min-w-[44px]', // WCAG touch target
      TILE_WIDTH[graphemeType],
      FONT_SIZE[graphemeType],
    ];

    switch (state) {
      case 'highlighted':
        return cn(
          ...base,
          'bg-gradient-to-br from-green-400 to-emerald-500 text-white border-green-400',
          'shadow-lg shadow-green-300/50'
        );
      case 'blending':
        return cn(...base, 'bg-white border-purple-300 text-gray-800');
      case 'merged':
        return cn(...base, 'bg-white border-purple-400 text-gray-800');
      case 'idle':
      default:
        return cn(...base, 'bg-white border-purple-200 text-gray-800');
    }
  }, [graphemeType, state]);

  // Build sound button classes
  const soundButtonClasses = useMemo(() => {
    const colorClass = soundButtonActive ? 'bg-purple-500' : 'bg-gray-300';

    switch (graphemeType) {
      case 'trigraph':
        return cn('h-1 w-14 rounded-full', colorClass);
      case 'digraph':
        return cn('h-1 w-10 rounded-full', colorClass);
      case 'single':
      default:
        return cn('w-2 h-2 rounded-full', colorClass);
    }
  }, [graphemeType, soundButtonActive]);

  // Scale animation based on state
  const scaleAnimate = useMemo(() => {
    switch (state) {
      case 'highlighted':
        return { scale: 1.15 };
      case 'merged':
        return { scale: 1.02 };
      default:
        return { scale: 1 };
    }
  }, [state]);

  return (
    <motion.div
      animate={{ x: xOffset }}
      transition={BLEND_SPRING}
      className="flex flex-col items-center gap-1.5"
    >
      {/* Phoneme tile */}
      <motion.button
        onClick={onTap}
        disabled={!isInteractive}
        animate={scaleAnimate}
        whileTap={isInteractive ? { scale: 0.95 } : undefined}
        transition={BOUNCE_SPRING}
        className={tileClasses}
        aria-label={`Phoneme ${phoneme}`}
      >
        <span>{phoneme}</span>
      </motion.button>

      {/* Sound button indicator */}
      <motion.div
        className={soundButtonClasses}
        animate={soundButtonActive ? PULSE_ANIMATION : {}}
        transition={soundButtonActive ? PULSE_TRANSITION : undefined}
      />

      {/* Mouth hint tooltip */}
      <AnimatePresence>
        {state === 'highlighted' && mouthHint && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-xs italic text-gray-500 text-center mt-0.5"
          >
            {mouthHint}
          </motion.p>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Custom comparison — only re-render when own props change
export const BlendingTile = React.memo(BlendingTileInner, (prev, next) => {
  return (
    prev.phoneme === next.phoneme &&
    prev.graphemeType === next.graphemeType &&
    prev.state === next.state &&
    prev.xOffset === next.xOffset &&
    prev.soundButtonActive === next.soundButtonActive &&
    prev.mouthHint === next.mouthHint &&
    prev.isInteractive === next.isInteractive &&
    prev.onTap === next.onTap
  );
});

BlendingTile.displayName = 'BlendingTile';
