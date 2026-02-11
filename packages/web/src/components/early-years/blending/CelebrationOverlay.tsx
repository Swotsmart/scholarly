'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';

// =============================================================================
// TYPES
// =============================================================================

interface CelebrationOverlayProps {
  word: string;
  emoji: string;
  onNext: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const SPARKLE_COLORS = [
  'bg-purple-400',
  'bg-pink-400',
  'bg-yellow-400',
  'bg-green-400',
  'bg-blue-400',
  'bg-purple-400',
  'bg-pink-400',
  'bg-yellow-400',
];

const SPARKLE_COUNT = 8;
const SPARKLE_RADIUS = 60;

// =============================================================================
// COMPONENT
// =============================================================================

export function CelebrationOverlay({ word, emoji, onNext }: CelebrationOverlayProps) {
  // Generate 8 sparkle particles at evenly spaced angles
  const sparkles = useMemo(() => {
    const angleStep = 360 / SPARKLE_COUNT;

    return Array.from({ length: SPARKLE_COUNT }, (_, i) => {
      const angleDeg = i * angleStep;
      const angleRad = (angleDeg * Math.PI) / 180;
      const dx = Math.cos(angleRad) * SPARKLE_RADIUS;
      const dy = Math.sin(angleRad) * SPARKLE_RADIUS;
      const size = i % 2 === 0 ? 'w-2 h-2' : 'w-1.5 h-1.5';

      return (
        <motion.div
          key={i}
          className={`absolute top-1/2 left-1/2 rounded-full ${size} ${SPARKLE_COLORS[i]} -translate-x-1/2 -translate-y-1/2`}
          initial={{ scale: 0, x: 0, y: 0, opacity: 1 }}
          animate={{
            scale: [0, 1, 0],
            x: dx,
            y: dy,
            opacity: [1, 1, 0],
          }}
          transition={{
            duration: 1,
            delay: 0.2 + i * 0.05,
            ease: 'easeOut',
          }}
        />
      );
    });
  }, []);

  return (
    <motion.div
      className="flex flex-col items-center gap-4 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Emoji with sparkle particles */}
      <div className="relative">
        {sparkles}
        <motion.span
          className="text-6xl block"
          initial={{ scale: 0, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        >
          {emoji}
        </motion.span>
      </div>

      {/* Pulsing word */}
      <motion.h2
        className="text-4xl font-bold text-purple-700"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
      >
        {word}
      </motion.h2>

      {/* Next word button — appears after 1.5s */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.4 }}
      >
        <button
          onClick={onNext}
          className="px-8 py-3 min-h-[44px] rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all"
          aria-label="Next word"
        >
          Well Done! Next Word &rarr;
        </button>
      </motion.div>
    </motion.div>
  );
}
