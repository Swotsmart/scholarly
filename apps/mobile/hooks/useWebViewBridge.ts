import { useRef, useCallback } from 'react';
import { WebView } from 'react-native-webview';
import { serializeMessage, type NativeToWebMessage } from '@/lib/bridge';

/**
 * Hook for managing communication with the WebView bridge.
 * Returns a ref to attach to the WebView and a function to send messages.
 */
export function useWebViewBridge() {
  const webViewRef = useRef<WebView>(null);

  const sendMessage = useCallback((msg: NativeToWebMessage) => {
    webViewRef.current?.postMessage(serializeMessage(msg));
  }, []);

  const sendAuthToken = useCallback(
    (token: string) => {
      sendMessage({ type: 'authToken', token });
    },
    [sendMessage]
  );

  const sendOfflineStatus = useCallback(
    (isOffline: boolean) => {
      sendMessage({ type: 'offlineStatus', isOffline });
    },
    [sendMessage]
  );

  const sendSubscriptionStatus = useCallback(
    (tier: string | null) => {
      sendMessage({ type: 'subscriptionStatus', tier });
    },
    [sendMessage]
  );

  const sendParentalGateResult = useCallback(
    (passed: boolean) => {
      sendMessage({ type: 'parentalGateResult', passed });
    },
    [sendMessage]
  );

  return {
    webViewRef,
    sendMessage,
    sendAuthToken,
    sendOfflineStatus,
    sendSubscriptionStatus,
    sendParentalGateResult,
  };
}
