import { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useAuthStore } from '@/stores/auth-store';
import { useAppStore } from '@/stores/app-store';
import { parseWebMessage, serializeMessage, type NativeToWebMessage } from '@/lib/bridge';
import { ALLOWED_DOMAINS, COLORS } from '@/lib/constants';
import { trackEvent } from '@/lib/analytics';

interface WebViewShellProps {
  url: string;
}

const INJECTED_JS = `
  (function() {
    // Signal to web app that we're in native container
    window.__SCHOLARLY_NATIVE__ = true;
    window.__SCHOLARLY_PLATFORM__ = '${
      // Will be replaced at build time, default to iOS
      'mobile'
    }';
    true;
  })();
`;

export function WebViewShell({ url }: WebViewShellProps) {
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const token = useAuthStore((s) => s.token);
  const isOnline = useAppStore((s) => s.isOnline);

  const sendToWebView = useCallback((msg: NativeToWebMessage) => {
    webViewRef.current?.postMessage(serializeMessage(msg));
  }, []);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      const msg = parseWebMessage(event.nativeEvent.data);
      if (!msg) return;

      switch (msg.type) {
        case 'haptic':
          {
            const styles: Record<string, Haptics.ImpactFeedbackStyle> = {
              light: Haptics.ImpactFeedbackStyle.Light,
              medium: Haptics.ImpactFeedbackStyle.Medium,
              heavy: Haptics.ImpactFeedbackStyle.Heavy,
            };
            Haptics.impactAsync(styles[msg.intensity] ?? Haptics.ImpactFeedbackStyle.Medium);
          }
          break;

        case 'navigate':
          router.push(msg.route as never);
          break;

        case 'authRequest':
          if (token) {
            sendToWebView({ type: 'authToken', token });
          }
          break;

        case 'openParentalGate':
          router.push('/parental-gate');
          break;

        case 'sessionComplete':
          trackEvent('module_complete', {
            module: msg.data.module,
            score: msg.data.score,
            duration: msg.data.duration,
          });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;

        case 'ready':
          if (token) {
            sendToWebView({ type: 'authToken', token });
          }
          break;
      }
    },
    [token, sendToWebView]
  );

  const handleShouldStartLoad = useCallback((event: { url: string }) => {
    try {
      const { hostname } = new URL(event.url);
      return ALLOWED_DOMAINS.some((d) => hostname.endsWith(d));
    } catch {
      return false;
    }
  }, []);

  if (!isOnline) {
    return (
      <View style={styles.centered}>
        <Text style={styles.offlineEmoji}>📡</Text>
        <Text style={styles.offlineTitle}>No Internet</Text>
        <Text style={styles.offlineMessage}>
          Connect to the internet to continue learning.
        </Text>
      </View>
    );
  }

  if (hasError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.offlineEmoji}>😕</Text>
        <Text style={styles.offlineTitle}>Something went wrong</Text>
        <Text style={styles.offlineMessage}>
          We couldn't load this page. Please try again.
        </Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => {
            setHasError(false);
            webViewRef.current?.reload();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      <WebView
        ref={webViewRef}
        source={{ uri: url }}
        style={styles.webview}
        onLoadStart={() => setIsLoading(true)}
        onLoadEnd={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
        onMessage={handleMessage}
        onShouldStartLoadWithRequest={handleShouldStartLoad}
        injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
        allowsBackForwardNavigationGestures
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        allowsInlineMediaPlayback
        startInLoadingState={false}
        originWhitelist={['https://*']}
        bounces={false}
        contentMode="mobile"
        decelerationRate="normal"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#888',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    backgroundColor: COLORS.background,
    gap: 12,
  },
  offlineEmoji: {
    fontSize: 56,
    marginBottom: 8,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.foreground,
  },
  offlineMessage: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    lineHeight: 22,
  },
  retryButton: {
    marginTop: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
  },
  retryText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
