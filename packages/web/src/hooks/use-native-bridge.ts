'use client';

import { useEffect, useCallback, useRef } from 'react';

/**
 * Detects whether we're running inside the Scholarly native app WebView.
 * Provides methods to communicate with the native shell via postMessage bridge.
 */

type HapticIntensity = 'light' | 'medium' | 'heavy';

interface NativeToWebMessage {
  type: string;
  [key: string]: unknown;
}

interface NativeBridge {
  isNative: boolean;
  sendHaptic: (intensity?: HapticIntensity) => void;
  sendNavigate: (route: string) => void;
  requestAuth: () => void;
  openParentalGate: (reason: string) => void;
  sendSessionComplete: (data: { module: string; score: number; duration: number }) => void;
  sendReady: () => void;
}

declare global {
  interface Window {
    __SCHOLARLY_NATIVE__?: boolean;
    ReactNativeWebView?: {
      postMessage: (data: string) => void;
    };
  }
}

function postToNative(message: Record<string, unknown>): void {
  if (typeof window !== 'undefined' && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(JSON.stringify(message));
  }
}

export function useNativeBridge(
  onMessage?: (msg: NativeToWebMessage) => void
): NativeBridge {
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  const isNative =
    typeof window !== 'undefined' && !!window.__SCHOLARLY_NATIVE__;

  useEffect(() => {
    if (!isNative) return;

    function handleMessage(event: MessageEvent) {
      try {
        const data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data && typeof data.type === 'string') {
          callbackRef.current?.(data as NativeToWebMessage);
        }
      } catch {
        // Ignore non-JSON messages
      }
    }

    window.addEventListener('message', handleMessage);
    // React Native WebView sends messages via document
    document.addEventListener('message', handleMessage as EventListener);

    // Signal that we're ready
    postToNative({ type: 'ready' });

    return () => {
      window.removeEventListener('message', handleMessage);
      document.removeEventListener('message', handleMessage as EventListener);
    };
  }, [isNative]);

  const sendHaptic = useCallback(
    (intensity: HapticIntensity = 'medium') => {
      if (isNative) postToNative({ type: 'haptic', intensity });
    },
    [isNative]
  );

  const sendNavigate = useCallback(
    (route: string) => {
      if (isNative) postToNative({ type: 'navigate', route });
    },
    [isNative]
  );

  const requestAuth = useCallback(() => {
    if (isNative) postToNative({ type: 'authRequest' });
  }, [isNative]);

  const openParentalGate = useCallback(
    (reason: string) => {
      if (isNative) postToNative({ type: 'openParentalGate', reason });
    },
    [isNative]
  );

  const sendSessionComplete = useCallback(
    (data: { module: string; score: number; duration: number }) => {
      if (isNative) postToNative({ type: 'sessionComplete', data });
    },
    [isNative]
  );

  const sendReady = useCallback(() => {
    if (isNative) postToNative({ type: 'ready' });
  }, [isNative]);

  return {
    isNative,
    sendHaptic,
    sendNavigate,
    requestAuth,
    openParentalGate,
    sendSessionComplete,
    sendReady,
  };
}
