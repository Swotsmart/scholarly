'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { soundEffects, type SoundEffect } from '@/lib/sound-effects';
import { phonicsAudioCache } from '@/lib/phonics-audio-cache';
import { useEarlyYearsStore } from '@/stores/early-years-store';
import { GRAPHEME_DATA } from '@/components/early-years/blending/blending-data';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VoicePersona = 'pip' | 'sarah' | 'alex' | 'willow';

interface UsePhonicsAudioOptions {
  /** Override store's voice persona */
  voicePersona?: VoicePersona;
  /** Override store's audio enabled */
  enabled?: boolean;
}

interface UsePhonicsAudioReturn {
  /** Speak text via ElevenLabs TTS (or browser fallback) */
  speak: (text: string, options?: { priority?: 'high' | 'normal' }) => Promise<void>;
  /** Speak a single phoneme (uses pre-cached audio for instant playback) */
  speakPhoneme: (phoneme: string) => Promise<void>;
  /** Play a procedural sound effect */
  playEffect: (effect: SoundEffect) => void;
  /** Stop all audio */
  stop: () => void;
  /** Whether audio is currently playing */
  isPlaying: boolean;
  /** Whether ElevenLabs TTS API is available */
  isTTSAvailable: boolean;
  /** Pre-generate and cache phoneme audio for instant playback */
  preloadPhonemes: (phonemes: string[]) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
// NEXT_PUBLIC_API_URL may already include /api/v1 (production) or not (local dev)
const TTS_ENDPOINT = API_BASE.endsWith('/api/v1')
  ? `${API_BASE}/early-years/tts`
  : `${API_BASE}/api/v1/early-years/tts`;
const FETCH_TIMEOUT_MS = 3_000;
const RETRY_INTERVAL_MS = 30_000;
const PRELOAD_BATCH_SIZE = 5;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function cacheKey(persona: string, text: string): string {
  return `${persona}:${text}`;
}

function phonemeText(phoneme: string): string {
  const data = GRAPHEME_DATA[phoneme.toLowerCase()];
  if (data?.audioHint) return data.audioHint;
  // For very short phonemes without data, wrap them so the TTS has
  // something reasonable to pronounce.
  if (phoneme.length <= 2) return `The sound ${phoneme}`;
  return phoneme;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePhonicsAudio(
  options: UsePhonicsAudioOptions = {},
): UsePhonicsAudioReturn {
  const storePersona = useEarlyYearsStore((s) => s.voicePersona);
  const storeEnabled = useEarlyYearsStore((s) => s.audioEnabled);

  const persona = options.voicePersona ?? storePersona;
  const enabled = options.enabled ?? storeEnabled;

  const [isPlaying, setIsPlaying] = useState(false);
  const [isTTSAvailable, setIsTTSAvailable] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const memoryCache = useRef<Map<string, Blob>>(new Map());
  const objectUrls = useRef<Set<string>>(new Set());
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  // -----------------------------------------------------------------------
  // Lifecycle — open IndexedDB cache + cleanup on unmount
  // -----------------------------------------------------------------------

  useEffect(() => {
    mountedRef.current = true;
    phonicsAudioCache.open();

    return () => {
      mountedRef.current = false;

      // Revoke all outstanding object URLs
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      objectUrls.current.clear();

      // Stop any in-flight audio
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      window.speechSynthesis?.cancel();

      // Clear retry timer
      if (retryTimer.current) {
        clearInterval(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, []);

  // -----------------------------------------------------------------------
  // Retry availability ping when TTS is down
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (isTTSAvailable) {
      if (retryTimer.current) {
        clearInterval(retryTimer.current);
        retryTimer.current = null;
      }
      return;
    }

    retryTimer.current = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
        const res = await fetch(TTS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: 'hi', voicePersona: persona }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok && mountedRef.current) {
          setIsTTSAvailable(true);
        }
      } catch {
        // Still unavailable — keep retrying
      }
    }, RETRY_INTERVAL_MS);

    return () => {
      if (retryTimer.current) {
        clearInterval(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [isTTSAvailable, persona]);

  // -----------------------------------------------------------------------
  // Core: fetch audio blob (3-tier cache)
  // -----------------------------------------------------------------------

  const fetchAudioBlob = useCallback(
    async (text: string): Promise<Blob | null> => {
      const key = cacheKey(persona, text);

      // Tier 1: memory cache
      const memHit = memoryCache.current.get(key);
      if (memHit) return memHit;

      // Tier 2: IndexedDB
      const idbHit = await phonicsAudioCache.get(key);
      if (idbHit) {
        memoryCache.current.set(key, idbHit);
        return idbHit;
      }

      // Tier 3: API fetch
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

        const res = await fetch(TTS_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, voicePersona: persona }),
          signal: controller.signal,
        });
        clearTimeout(timer);

        if (!res.ok) {
          if (mountedRef.current) setIsTTSAvailable(false);
          return null;
        }

        const blob = await res.blob();
        // Populate both caches
        memoryCache.current.set(key, blob);
        phonicsAudioCache.set(key, blob); // fire-and-forget
        return blob;
      } catch {
        if (mountedRef.current) setIsTTSAvailable(false);
        return null;
      }
    },
    [persona],
  );

  // -----------------------------------------------------------------------
  // Play a blob through HTMLAudioElement
  // -----------------------------------------------------------------------

  const playBlob = useCallback(
    (blob: Blob): Promise<void> =>
      new Promise<void>((resolve) => {
        const url = URL.createObjectURL(blob);
        objectUrls.current.add(url);

        const audio = new Audio(url);
        audioRef.current = audio;

        if (mountedRef.current) setIsPlaying(true);

        const cleanup = () => {
          if (mountedRef.current) setIsPlaying(false);
          URL.revokeObjectURL(url);
          objectUrls.current.delete(url);
          resolve();
        };

        audio.addEventListener('ended', cleanup, { once: true });
        audio.addEventListener('error', cleanup, { once: true });
        audio.play().catch(cleanup);
      }),
    [],
  );

  // -----------------------------------------------------------------------
  // Kill any stray browser SpeechSynthesis (e.g. from other components)
  // -----------------------------------------------------------------------

  const cancelBrowserTTS = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis?.cancel();
    }
  }, []);

  // -----------------------------------------------------------------------
  // Public: speak
  // -----------------------------------------------------------------------

  const speak = useCallback(
    async (
      text: string,
      opts?: { priority?: 'high' | 'normal' },
    ): Promise<void> => {
      if (!enabled) return;

      // Always kill browser SpeechSynthesis — we only use ElevenLabs
      cancelBrowserTTS();

      const priority = opts?.priority ?? 'normal';

      // For high-priority, stop whatever is currently playing
      if (priority === 'high') {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current = null;
        }
      }

      // Stop any currently playing normal-priority audio too
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }

      const blob = isTTSAvailable ? await fetchAudioBlob(text) : null;

      if (blob) {
        cancelBrowserTTS(); // Kill again in case something triggered it during fetch
        await playBlob(blob);
      }
      // No browser fallback — silence is better than robotic voice
    },
    [enabled, isTTSAvailable, fetchAudioBlob, playBlob, cancelBrowserTTS],
  );

  // -----------------------------------------------------------------------
  // Public: speakPhoneme
  // -----------------------------------------------------------------------

  const speakPhoneme = useCallback(
    async (phoneme: string): Promise<void> => {
      if (!enabled) return;
      const text = phonemeText(phoneme);
      await speak(text, { priority: 'high' });
    },
    [enabled, speak],
  );

  // -----------------------------------------------------------------------
  // Public: playEffect
  // -----------------------------------------------------------------------

  const playEffect = useCallback((effect: SoundEffect): void => {
    soundEffects.play(effect);
  }, []);

  // -----------------------------------------------------------------------
  // Public: stop
  // -----------------------------------------------------------------------

  const stop = useCallback((): void => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    cancelBrowserTTS();
    if (mountedRef.current) setIsPlaying(false);
  }, [cancelBrowserTTS]);

  // -----------------------------------------------------------------------
  // Public: preloadPhonemes
  // -----------------------------------------------------------------------

  const preloadPhonemes = useCallback(
    async (phonemes: string[]): Promise<void> => {
      // Batch into groups to avoid overwhelming the API
      for (let i = 0; i < phonemes.length; i += PRELOAD_BATCH_SIZE) {
        const batch = phonemes.slice(i, i + PRELOAD_BATCH_SIZE);
        await Promise.all(
          batch.map((p) => {
            const text = phonemeText(p);
            return fetchAudioBlob(text);
          }),
        );
      }
    },
    [fetchAudioBlob],
  );

  // -----------------------------------------------------------------------
  // Return
  // -----------------------------------------------------------------------

  return {
    speak,
    speakPhoneme,
    playEffect,
    stop,
    isPlaying,
    isTTSAvailable,
    preloadPhonemes,
  };
}
