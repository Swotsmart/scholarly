'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { VoiceWordTimestamp } from '@/lib/api';

interface KaraokePlayerProps {
  timestamps: VoiceWordTimestamp[];
  audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  /** When set, words containing these GPCs get special emphasis styling */
  targetGpcs?: string[];
  className?: string;
}

function wordContainsGpc(word: string, gpcs: string[]): boolean {
  const lower = word.toLowerCase();
  return gpcs.some(g => lower.includes(g.toLowerCase()));
}

export function KaraokePlayer({
  timestamps,
  audioRef,
  isPlaying,
  targetGpcs,
  className,
}: KaraokePlayerProps) {
  const [activeIndex, setActiveIndex] = useState(-1);
  const rafRef = useRef<number>(0);

  const findActiveWord = useCallback((currentTime: number): number => {
    // Binary search for the word where start <= currentTime < end
    let lo = 0;
    let hi = timestamps.length - 1;
    let result = -1;
    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (timestamps[mid].start <= currentTime) {
        result = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    // Verify the found word's end hasn't passed
    if (result >= 0 && timestamps[result].end < currentTime) {
      // We're in a gap between words — check if the next word is close
      if (result + 1 < timestamps.length && timestamps[result + 1].start - currentTime < 0.15) {
        return result + 1;
      }
      return result; // Stay on last word during brief gaps
    }
    return result;
  }, [timestamps]);

  useEffect(() => {
    if (!isPlaying || timestamps.length === 0) {
      if (!isPlaying) setActiveIndex(-1);
      return;
    }

    const tick = () => {
      if (audioRef.current) {
        const idx = findActiveWord(audioRef.current.currentTime);
        setActiveIndex(idx);
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, timestamps, audioRef, findActiveWord]);

  if (timestamps.length === 0) {
    return <p className="text-sm text-muted-foreground">No word timestamps available</p>;
  }

  return (
    <div className={cn('flex flex-wrap gap-1.5 leading-relaxed', className)}>
      {timestamps.map((wt, i) => {
        const isActive = i === activeIndex;
        const isPlayed = activeIndex >= 0 && i < activeIndex;
        const isGpcWord = targetGpcs && targetGpcs.length > 0 && wordContainsGpc(wt.word, targetGpcs);

        return (
          <span
            key={i}
            className={cn(
              'inline-flex items-center rounded-md px-2 py-0.5 text-sm font-medium transition-all duration-150',
              // Default (upcoming)
              !isActive && !isPlayed && 'bg-secondary text-secondary-foreground',
              // Played
              isPlayed && 'bg-muted text-muted-foreground',
              // Active — standard
              isActive && !isGpcWord && 'bg-primary text-primary-foreground scale-110 shadow-md',
              // Active — GPC emphasis (phonics mode)
              isActive && isGpcWord && 'bg-violet-600 text-white scale-115 shadow-lg px-3 animate-pulse',
              // Not active but is GPC word (static highlight)
              !isActive && isGpcWord && !isPlayed && 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300 ring-1 ring-violet-300 dark:ring-violet-700',
            )}
          >
            {wt.word}
          </span>
        );
      })}
    </div>
  );
}
