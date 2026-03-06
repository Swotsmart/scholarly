'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '@/lib/api';

interface UseKokoroTTSOptions {
  voice?: string;
  rate?: number;
  lang?: string;
}

interface UseKokoroTTSReturn {
  speak: (text: string) => Promise<void>;
  stop: () => void;
  isSpeaking: boolean;
  isLoading: boolean;
  isKokoroAvailable: boolean;
}

const HEALTH_CHECK_INTERVAL_MS = 30_000;

export function useKokoroTTS(options: UseKokoroTTSOptions = {}): UseKokoroTTSReturn {
  const { voice, rate = 0.85, lang = 'en-AU' } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isKokoroAvailable, setIsKokoroAvailable] = useState(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const retryTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      window.speechSynthesis?.cancel();
      if (retryTimer.current) {
        clearInterval(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, []);

  // Retry health check when Kokoro is down
  useEffect(() => {
    if (isKokoroAvailable) {
      if (retryTimer.current) {
        clearInterval(retryTimer.current);
        retryTimer.current = null;
      }
      return;
    }
    retryTimer.current = setInterval(async () => {
      const healthy = await api.voice.health();
      if (healthy && mountedRef.current) {
        setIsKokoroAvailable(true);
      }
    }, HEALTH_CHECK_INTERVAL_MS);
    return () => {
      if (retryTimer.current) {
        clearInterval(retryTimer.current);
        retryTimer.current = null;
      }
    };
  }, [isKokoroAvailable]);

  const playBlob = useCallback((blob: Blob): Promise<void> => {
    return new Promise<void>((resolve) => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      const audio = new Audio(url);
      audioRef.current = audio;
      if (mountedRef.current) setIsSpeaking(true);

      const cleanup = () => {
        if (mountedRef.current) setIsSpeaking(false);
        URL.revokeObjectURL(url);
        if (objectUrlRef.current === url) objectUrlRef.current = null;
        resolve();
      };
      audio.addEventListener('ended', cleanup, { once: true });
      audio.addEventListener('error', cleanup, { once: true });
      audio.play().catch(cleanup);
    });
  }, []);

  const browserFallback = useCallback((text: string): Promise<void> => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve) => {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = rate;
      utterance.lang = lang;
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => { if (mountedRef.current) setIsSpeaking(false); resolve(); };
      utterance.onerror = () => { if (mountedRef.current) setIsSpeaking(false); resolve(); };
      if (mountedRef.current) setIsSpeaking(true);
      window.speechSynthesis.speak(utterance);
    });
  }, [rate, lang]);

  const speak = useCallback(async (text: string): Promise<void> => {
    // Stop anything currently playing
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();

    if (mountedRef.current) setIsLoading(true);

    if (isKokoroAvailable) {
      const blob = await api.voice.tts(text, voice);
      if (mountedRef.current) setIsLoading(false);
      if (blob) {
        await playBlob(blob);
        return;
      }
      // Kokoro failed — mark unavailable and fall through
      if (mountedRef.current) setIsKokoroAvailable(false);
    } else {
      if (mountedRef.current) setIsLoading(false);
    }

    // Browser SpeechSynthesis fallback
    await browserFallback(text);
  }, [isKokoroAvailable, voice, playBlob, browserFallback]);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (mountedRef.current) {
      setIsSpeaking(false);
      setIsLoading(false);
    }
  }, []);

  return { speak, stop, isSpeaking, isLoading, isKokoroAvailable };
}
