'use client';

/**
 * Voice Status Banner
 * Displays a warm notification when Kokoro TTS is unavailable
 * and the system has fallen back to browser SpeechSynthesis.
 *
 * Two faces:
 * - Children see a friendly, non-alarming message
 * - Teachers/parents see a professional alert with details
 */

import { useEffect, useState, useRef } from 'react';
import { Volume2, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface VoiceStatusBannerProps {
  isUsingFallback: boolean;
  /** 'child' shows a warm, simple message; 'adult' shows technical details */
  audience?: 'child' | 'adult';
  className?: string;
}

export function VoiceStatusBanner({
  isUsingFallback,
  audience = 'child',
  className,
}: VoiceStatusBannerProps) {
  const [dismissed, setDismissed] = useState(false);
  const hasNotified = useRef(false);

  // Send degradation alert to backend (rate-limited: once per session)
  useEffect(() => {
    if (!isUsingFallback || hasNotified.current) return;
    hasNotified.current = true;

    const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const url = apiBase.endsWith('/api/v1')
      ? `${apiBase}/early-years/voice-degradation`
      : `${apiBase}/api/v1/early-years/voice-degradation`;

    fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      }),
    }).catch(() => {
      // Silently fail — this is a best-effort notification
    });
  }, [isUsingFallback]);

  // Reset dismissed state when fallback recovers
  useEffect(() => {
    if (!isUsingFallback) {
      setDismissed(false);
      hasNotified.current = false;
    }
  }, [isUsingFallback]);

  if (!isUsingFallback || dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'rounded-xl px-4 py-3 flex items-center gap-3',
          audience === 'child'
            ? 'bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
            : 'bg-yellow-50 border border-yellow-300 dark:bg-yellow-950/30 dark:border-yellow-700',
          className,
        )}
      >
        {audience === 'child' ? (
          <>
            <motion.div
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
            >
              <Volume2 className="h-5 w-5 text-amber-500" />
            </motion.div>
            <p className="text-sm text-amber-800 dark:text-amber-200 flex-1">
              Our special voice is having a little rest — a helper voice is here instead!
            </p>
          </>
        ) : (
          <>
            <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Voice service temporarily unavailable
              </p>
              <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                Kokoro TTS is unreachable — children are hearing a browser-generated fallback voice.
                Support has been notified.
              </p>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="p-1 rounded hover:bg-yellow-200/50 dark:hover:bg-yellow-800/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
            </button>
          </>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
