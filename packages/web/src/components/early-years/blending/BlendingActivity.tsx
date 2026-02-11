'use client';

/**
 * BlendingActivity — Phonics word blending with animated slide-together.
 *
 * Children tap each phoneme tile to hear its sound, then press "Blend!"
 * to watch the letters physically slide together with spring physics,
 * accompanied by a sweeping blending line.
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles } from 'lucide-react';
import { VoiceCoachBubble } from './VoiceCoachBubble';
import { BlendingTile } from './BlendingTile';
import { BlendingLine } from './BlendingLine';
import { CelebrationOverlay } from './CelebrationOverlay';
import { useBlendingSequence } from './use-blending-sequence';
import {
  type BlendingWord,
  type BlendingMode,
  getGraphemeType,
  GRAPHEME_DATA,
  COACH_ENCOURAGEMENTS,
} from './blending-data';

// =============================================================================
// CONSTANTS
// =============================================================================

const TILE_WIDTHS: Record<string, number> = { single: 80, digraph: 96, trigraph: 112 };
const TILE_GAP = 24;

// =============================================================================
// COMPONENT
// =============================================================================

interface BlendingActivityProps {
  word: BlendingWord;
  wordIndex: number;
  totalWords: number;
  blendingMode: BlendingMode;
  onComplete: (success: boolean) => void;
  onSpeak: (text: string) => void;
}

export function BlendingActivity({
  word,
  wordIndex,
  totalWords,
  blendingMode,
  onComplete,
  onSpeak,
}: BlendingActivityProps) {
  const [coachMessage, setCoachMessage] = useState('');
  const [showCoach, setShowCoach] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    phase,
    tileStates,
    tileXOffsets,
    activeSoundButton,
    mouthHints,
    blendingLineActive,
    blendingLineDuration,
    allExplored,
    tapTile,
    startBlending,
    reset,
  } = useBlendingSequence({
    phonemes: word.phonemes,
    mode: blendingMode,
    onSpeak,
  });

  // Calculate total tile row width for blending line
  const totalTileWidth = useMemo(() => {
    let width = 0;
    for (const p of word.phonemes) {
      width += TILE_WIDTHS[getGraphemeType(p)] ?? 80;
    }
    width += (word.phonemes.length - 1) * TILE_GAP;
    return width;
  }, [word.phonemes]);

  // Voice coach: introduce each new word
  useEffect(() => {
    const sounds = word.phonemes.map((p) => p).join(', ');
    const intro = `Let's blend the sounds ${sounds}. Tap each sound to hear it!`;
    setCoachMessage(intro);
    setShowCoach(true);
    onSpeak(intro);

    const timer = setTimeout(() => setShowCoach(false), 4000);
    return () => clearTimeout(timer);
  }, [word.word]);

  // Coach prompt when all sounds explored
  useEffect(() => {
    if (allExplored && phase === 'exploring') {
      const sounds = word.phonemes.map((p) => `[${p}]`).join(' ');
      const msg = `Now press the button to blend ${sounds} together!`;
      setCoachMessage(msg);
      setShowCoach(true);
      onSpeak(msg);

      const timer = setTimeout(() => setShowCoach(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [allExplored, phase]);

  // Coach celebration on reveal
  useEffect(() => {
    if (phase === 'reveal') {
      const celebration = `${word.word}! That spells ${word.word}! ${COACH_ENCOURAGEMENTS[wordIndex % COACH_ENCOURAGEMENTS.length]}`;
      setCoachMessage(celebration);
      setShowCoach(true);
      onSpeak(celebration);
    }
  }, [phase]);

  // Handle next word
  const handleNext = useCallback(() => {
    setShowCoach(false);
    reset();
    onComplete(true);
  }, [reset, onComplete]);

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-lg mx-auto">
      {/* Word counter */}
      <div className="flex items-center gap-2 text-sm font-medium text-white/90 bg-white/20 backdrop-blur-sm rounded-full px-4 py-1.5">
        <Sparkles className="h-3.5 w-3.5" />
        <span>
          Word {wordIndex + 1} of {totalWords}
        </span>
      </div>

      {/* Voice Coach */}
      <VoiceCoachBubble message={coachMessage} isVisible={showCoach} />

      {/* Instruction */}
      <AnimatePresence mode="wait">
        {phase === 'exploring' && (
          <motion.p
            key="instruction"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-medium text-purple-800 bg-white/60 backdrop-blur-sm rounded-xl px-4 py-2"
          >
            Tap each sound, then blend!
          </motion.p>
        )}
        {phase === 'blending' && (
          <motion.p
            key="blending-msg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center text-sm font-medium text-orange-700 bg-orange-100/80 backdrop-blur-sm rounded-xl px-4 py-2"
          >
            Watch the sounds come together...
          </motion.p>
        )}
      </AnimatePresence>

      {/* Tile Row */}
      {phase !== 'reveal' && (
        <div
          ref={containerRef}
          className="relative flex justify-center items-start pt-4 pb-10"
          style={{ gap: `${TILE_GAP}px` }}
        >
          {word.phonemes.map((phoneme, i) => (
            <BlendingTile
              key={`${word.word}-${i}`}
              phoneme={phoneme}
              graphemeType={getGraphemeType(phoneme)}
              state={tileStates[i]}
              xOffset={tileXOffsets[i]}
              soundButtonActive={activeSoundButton === i}
              mouthHint={mouthHints[i]}
              isInteractive={phase === 'exploring'}
              onTap={() => tapTile(i)}
            />
          ))}

          {/* Blending Line */}
          <BlendingLine
            isActive={blendingLineActive}
            totalWidth={totalTileWidth}
            duration={blendingLineDuration}
          />
        </div>
      )}

      {/* Blend Button */}
      <AnimatePresence>
        {allExplored && phase === 'exploring' && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            onClick={startBlending}
            className="px-8 py-3 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all min-h-[44px]"
          >
            Blend the Sounds!
          </motion.button>
        )}
      </AnimatePresence>

      {/* Celebration */}
      <AnimatePresence>
        {phase === 'reveal' && (
          <CelebrationOverlay
            word={word.word}
            emoji={word.emoji}
            onNext={handleNext}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
