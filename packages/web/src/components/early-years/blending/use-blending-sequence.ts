'use client';

/**
 * useBlendingSequence — Animation orchestration hook for phonics blending.
 *
 * Manages tile states, x-offsets, and the blending line to create
 * a connected phonation animation where letters physically slide together.
 *
 * Two modes:
 * - Successive: blend first two, then add the third (/s/ → /sa/ → /sat/)
 * - Connected: all letters slide together simultaneously
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { sleep } from '@/lib/utils';
import type { BlendingMode } from './blending-data';
import { getGraphemeType, GRAPHEME_DATA } from './blending-data';

// =============================================================================
// TYPES
// =============================================================================

export type BlendingPhase = 'idle' | 'exploring' | 'blending' | 'reveal';
export type TileState = 'idle' | 'highlighted' | 'blending' | 'merged';

interface UseBlendingSequenceOptions {
  phonemes: string[];
  mode: BlendingMode;
  onSpeak: (text: string) => void;
}

interface UseBlendingSequenceReturn {
  phase: BlendingPhase;
  tileStates: TileState[];
  tileXOffsets: number[];
  activeSoundButton: number | null;
  mouthHints: (string | undefined)[];
  blendingLineActive: boolean;
  blendingLineDuration: number;
  allExplored: boolean;
  tapTile: (index: number) => void;
  startBlending: () => void;
  reset: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TILE_GAP = 24; // px initial gap between tiles
const TILE_GAP_MERGED = 2; // px final gap
const HIGHLIGHT_HOLD = 800; // ms to hold highlight on each sound
const SLIDE_SETTLE = 700; // ms for spring to settle
const POST_BLEND_PAUSE = 600; // ms after final merge before reveal
const CONNECTED_DURATION = 2500; // ms for connected phonation sweep

// =============================================================================
// HOOK
// =============================================================================

export function useBlendingSequence({
  phonemes,
  mode,
  onSpeak,
}: UseBlendingSequenceOptions): UseBlendingSequenceReturn {
  const count = phonemes.length;

  const [phase, setPhase] = useState<BlendingPhase>('idle');
  const [tileStates, setTileStates] = useState<TileState[]>(() => Array(count).fill('idle'));
  const [tileXOffsets, setTileXOffsets] = useState<number[]>(() => Array(count).fill(0));
  const [activeSoundButton, setActiveSoundButton] = useState<number | null>(null);
  const [mouthHints, setMouthHints] = useState<(string | undefined)[]>(() => Array(count).fill(undefined));
  const [exploredSounds, setExploredSounds] = useState<Set<number>>(() => new Set());
  const [blendingLineActive, setBlendingLineActive] = useState(false);
  const [blendingLineDuration, setBlendingLineDuration] = useState(0);

  const isRunningRef = useRef(false);
  const abortRef = useRef(false);

  const allExplored = exploredSounds.size >= count;

  // Reset when phonemes change (new word)
  useEffect(() => {
    setPhase('idle');
    setTileStates(Array(count).fill('idle'));
    setTileXOffsets(Array(count).fill(0));
    setActiveSoundButton(null);
    setMouthHints(Array(count).fill(undefined));
    setExploredSounds(new Set());
    setBlendingLineActive(false);
    setBlendingLineDuration(0);
    isRunningRef.current = false;
    abortRef.current = false;

    // Auto-transition to exploring after a brief delay
    const timer = setTimeout(() => setPhase('exploring'), 300);
    return () => clearTimeout(timer);
  }, [phonemes.join(','), count]);

  // Tap a tile to hear its sound
  const tapTile = useCallback(
    (index: number) => {
      if (phase !== 'exploring' || isRunningRef.current) return;

      // Mark as explored
      setExploredSounds((prev) => {
        const next = new Set(prev);
        next.add(index);
        return next;
      });

      // Highlight this tile
      setTileStates((prev) => {
        const next = [...prev];
        next[index] = 'highlighted';
        return next;
      });
      setActiveSoundButton(index);

      // Show mouth hint
      const data = GRAPHEME_DATA[phonemes[index].toLowerCase()];
      if (data) {
        setMouthHints((prev) => {
          const next = [...prev];
          next[index] = data.mouthPosition;
          return next;
        });
      }

      // Speak the sound
      onSpeak(phonemes[index]);

      // Reset highlight after delay
      setTimeout(() => {
        setTileStates((prev) => {
          const next = [...prev];
          if (next[index] === 'highlighted') next[index] = 'idle';
          return next;
        });
        setActiveSoundButton((prev) => (prev === index ? null : prev));
        setMouthHints((prev) => {
          const next = [...prev];
          next[index] = undefined;
          return next;
        });
      }, HIGHLIGHT_HOLD);
    },
    [phase, phonemes, onSpeak],
  );

  // Calculate x-offsets for merging tiles
  const calcMergedOffsets = useCallback(
    (mergeUpTo: number): number[] => {
      // Merge tiles 0..mergeUpTo together (reduce gaps between them)
      const offsets = Array(count).fill(0);
      const gapReduction = TILE_GAP - TILE_GAP_MERGED;

      for (let i = 0; i <= mergeUpTo; i++) {
        // Each tile shifts toward the center of the merged group
        const center = mergeUpTo / 2;
        const shift = (i - center) * -gapReduction + (center - i) * gapReduction;
        // Simpler: tile[i] shifts by -(mergeUpTo - i) * gapReduction/2 from left,
        // and +i * gapReduction/2 from right
        offsets[i] = (center - i) * gapReduction;
      }
      return offsets;
    },
    [count],
  );

  // Run successive blending
  const runSuccessiveBlend = useCallback(async () => {
    if (abortRef.current) return;
    // Successive: highlight each sound, then merge in stages
    // For 3 phonemes: highlight 0, highlight 1, merge 0+1, highlight 2, merge all
    // For 4 phonemes: highlight 0, highlight 1, merge 0+1, highlight 2, merge 0+1+2, highlight 3, merge all

    for (let step = 0; step < count; step++) {
      if (abortRef.current) return;

      // Highlight current tile
      setTileStates((prev) => {
        const next = [...prev];
        next[step] = 'highlighted';
        return next;
      });
      setActiveSoundButton(step);

      // Show mouth hint
      const data = GRAPHEME_DATA[phonemes[step].toLowerCase()];
      if (data) {
        setMouthHints((prev) => {
          const next = [...prev];
          next[step] = data.mouthPosition;
          return next;
        });
      }

      // Speak the phoneme
      onSpeak(phonemes[step]);
      await sleep(HIGHLIGHT_HOLD);
      if (abortRef.current) return;

      // Clear highlight + mouth hint
      setTileStates((prev) => {
        const next = [...prev];
        next[step] = 'blending';
        return next;
      });
      setActiveSoundButton(null);
      setMouthHints((prev) => {
        const next = [...prev];
        next[step] = undefined;
        return next;
      });

      // After revealing at least 2 tiles, merge them
      if (step >= 1) {
        // Set all tiles up to this point to 'blending'
        setTileStates((prev) => {
          const next = [...prev];
          for (let i = 0; i <= step; i++) next[i] = 'blending';
          return next;
        });

        // Calculate merged offsets for tiles 0..step
        const gapReduction = TILE_GAP - TILE_GAP_MERGED;
        setTileXOffsets((prev) => {
          const next = [...prev];
          const center = step / 2;
          for (let i = 0; i <= step; i++) {
            next[i] = (center - i) * gapReduction;
          }
          return next;
        });

        // Activate blending line
        setBlendingLineDuration((step + 1) * 0.4);
        setBlendingLineActive(true);

        // Speak the blended partial: "sa", "sat", etc.
        const partial = phonemes.slice(0, step + 1).join('');
        onSpeak(partial);
        await sleep(SLIDE_SETTLE);
        if (abortRef.current) return;

        setBlendingLineActive(false);
      }
    }

    // Final: set all tiles to merged
    setTileStates(Array(count).fill('merged'));

    // Speak the complete word clearly
    const fullWord = phonemes.join('');
    await sleep(300);
    if (abortRef.current) return;
    onSpeak(fullWord);
    await sleep(POST_BLEND_PAUSE);
    if (abortRef.current) return;

    setPhase('reveal');
  }, [count, phonemes, onSpeak, abortRef]);

  // Run connected phonation
  const runConnectedBlend = useCallback(async () => {
    if (abortRef.current) return;

    // All tiles slide together simultaneously
    const gapReduction = TILE_GAP - TILE_GAP_MERGED;
    const center = (count - 1) / 2;

    setTileStates(Array(count).fill('blending'));

    // Activate blending line for the full sweep
    setBlendingLineDuration(CONNECTED_DURATION / 1000);
    setBlendingLineActive(true);

    // Slide all tiles together
    setTileXOffsets(() => {
      const next = Array(count).fill(0);
      for (let i = 0; i < count; i++) {
        next[i] = (center - i) * gapReduction;
      }
      return next;
    });

    // Speak each phoneme quickly in sequence (connected)
    for (let i = 0; i < count; i++) {
      onSpeak(phonemes[i]);
      await sleep(CONNECTED_DURATION / count);
      if (abortRef.current) return;
    }

    setBlendingLineActive(false);
    setTileStates(Array(count).fill('merged'));

    // Speak the full word
    const fullWord = phonemes.join('');
    await sleep(300);
    if (abortRef.current) return;
    onSpeak(fullWord);
    await sleep(POST_BLEND_PAUSE);
    if (abortRef.current) return;

    setPhase('reveal');
  }, [count, phonemes, onSpeak, abortRef]);

  // Start the blending sequence
  const startBlending = useCallback(() => {
    if (isRunningRef.current || phase !== 'exploring') return;
    isRunningRef.current = true;
    abortRef.current = false;
    setPhase('blending');

    const run = mode === 'successive' ? runSuccessiveBlend : runConnectedBlend;
    run().finally(() => {
      isRunningRef.current = false;
    });
  }, [phase, mode, runSuccessiveBlend, runConnectedBlend]);

  // Reset for next word
  const reset = useCallback(() => {
    abortRef.current = true;
    isRunningRef.current = false;
    setPhase('idle');
    setTileStates(Array(count).fill('idle'));
    setTileXOffsets(Array(count).fill(0));
    setActiveSoundButton(null);
    setMouthHints(Array(count).fill(undefined));
    setExploredSounds(new Set());
    setBlendingLineActive(false);
    setBlendingLineDuration(0);
  }, [count]);

  return {
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
  };
}
