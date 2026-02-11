'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export type MentorId = 'ollie_owl' | 'penny_penguin' | 'leo_lion' | 'bella_butterfly';
export type MentorMood = 'idle' | 'speaking' | 'celebrating' | 'thinking' | 'encouraging' | 'waving';

interface MentorCharacterOverlayProps {
  mentor: MentorId;
  mood: MentorMood;
  speechBubble?: string;
  showSpeechBubble?: boolean;
  size?: 'small' | 'medium' | 'large';
  position?: 'bottom-right' | 'bottom-left';
  onTap?: () => void;
}

const MENTOR_CONFIG: Record<MentorId, { emoji: string; name: string; color: string; gradient: string }> = {
  ollie_owl: { emoji: '🦉', name: 'Ollie', color: '#8B5CF6', gradient: 'from-violet-400 to-purple-600' },
  penny_penguin: { emoji: '🐧', name: 'Penny', color: '#06B6D4', gradient: 'from-cyan-400 to-teal-600' },
  leo_lion: { emoji: '🦁', name: 'Leo', color: '#F59E0B', gradient: 'from-amber-400 to-orange-600' },
  bella_butterfly: { emoji: '🦋', name: 'Bella', color: '#EC4899', gradient: 'from-pink-400 to-rose-600' },
};

const SIZE_CONFIG: Record<string, { box: string; emoji: string; px: number }> = {
  small: { box: 'w-[60px] h-[60px]', emoji: 'text-2xl', px: 60 },
  medium: { box: 'w-[80px] h-[80px]', emoji: 'text-4xl', px: 80 },
  large: { box: 'w-[100px] h-[100px]', emoji: 'text-5xl', px: 100 },
};

const MOOD_VARIANTS: Record<MentorMood, object> = {
  idle: {
    y: [0, -5, 0],
    transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
  },
  speaking: {
    scale: [1, 1.08, 1],
    transition: { duration: 0.6, repeat: Infinity, ease: 'easeInOut' },
  },
  celebrating: {
    rotate: [0, 15, -15, 0],
    scale: [1, 1.15, 1],
    transition: { duration: 0.6, repeat: 3, ease: 'easeInOut' },
  },
  thinking: {
    rotate: [-8, 8, -8],
    transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
  },
  encouraging: {
    y: [-3, 3, -3],
    scale: [1, 1.05, 1],
    transition: { duration: 0.8, repeat: 2, ease: 'easeInOut' },
  },
  waving: {
    rotate: [-20, 20, -20, 20, 0],
    transition: { duration: 1.2, ease: 'easeInOut' },
  },
};

const SPARKLE_OFFSETS = [
  { x: -18, delay: 0 },
  { x: 12, delay: 0.15 },
  { x: -6, delay: 0.3 },
  { x: 20, delay: 0.1 },
];

const MentorCharacterOverlayInner: React.FC<MentorCharacterOverlayProps> = ({
  mentor,
  mood,
  speechBubble,
  showSpeechBubble = true,
  size = 'medium',
  position = 'bottom-right',
  onTap,
}) => {
  const [mounted, setMounted] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!speechBubble || !showSpeechBubble) {
      setBubbleVisible(false);
      return;
    }
    setBubbleVisible(true);
    const timer = setTimeout(() => setBubbleVisible(false), 4000);
    return () => clearTimeout(timer);
  }, [speechBubble, showSpeechBubble]);

  const handleTap = useCallback(() => onTap?.(), [onTap]);

  if (!mounted) return null;

  const config = MENTOR_CONFIG[mentor];
  const sizeConfig = SIZE_CONFIG[size];
  const positionClass = position === 'bottom-left' ? 'left-4' : 'right-4';

  return (
    <motion.div
      className={`fixed bottom-4 ${positionClass} z-30 flex flex-col items-center`}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Speech bubble */}
      <AnimatePresence>
        {bubbleVisible && speechBubble && (
          <motion.div
            className="relative mb-2 max-w-[200px] rounded-xl bg-white px-3 py-2 shadow-md"
            initial={{ opacity: 0, y: 8, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <p className="text-center text-sm font-medium text-gray-700">
              {speechBubble}
            </p>
            {/* Tail triangle */}
            <div className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sparkles for celebrating */}
      <AnimatePresence>
        {mood === 'celebrating' &&
          SPARKLE_OFFSETS.map((spark, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute text-lg"
              initial={{ opacity: 1, y: 0, x: spark.x }}
              animate={{
                opacity: 0,
                y: -40 - i * 10,
                x: spark.x + (i % 2 === 0 ? -8 : 8),
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, delay: spark.delay, ease: 'easeOut' }}
              style={{ bottom: sizeConfig.px * 0.6 }}
            >
              ✨
            </motion.span>
          ))}
      </AnimatePresence>

      {/* Character circle */}
      <motion.button
        className={`${sizeConfig.box} min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full border-4 border-white bg-gradient-to-br ${config.gradient} shadow-lg cursor-pointer select-none`}
        animate={MOOD_VARIANTS[mood]}
        whileTap={onTap ? { scale: 0.9 } : undefined}
        onClick={handleTap}
        aria-label={`Talk to ${config.name}`}
        type="button"
      >
        <span
          className={`${sizeConfig.emoji} leading-none`}
          role="img"
          aria-hidden="true"
        >
          {config.emoji}
        </span>
      </motion.button>
    </motion.div>
  );
};

export const MentorCharacterOverlay = React.memo(MentorCharacterOverlayInner);
