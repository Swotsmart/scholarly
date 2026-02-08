/** Message types sent from WebView to Native */
export type WebToNativeMessage =
  | { type: 'haptic'; intensity: 'light' | 'medium' | 'heavy' }
  | { type: 'navigate'; route: string }
  | { type: 'authRequest' }
  | { type: 'openParentalGate'; reason: string }
  | { type: 'sessionComplete'; data: { module: string; score: number; duration: number } }
  | { type: 'audioPlay'; url: string }
  | { type: 'audioStop' }
  | { type: 'ready' };

/** Message types sent from Native to WebView */
export type NativeToWebMessage =
  | { type: 'authToken'; token: string }
  | { type: 'parentalGateResult'; passed: boolean }
  | { type: 'themeChange'; theme: 'light' | 'dark' }
  | { type: 'offlineStatus'; isOffline: boolean }
  | { type: 'subscriptionStatus'; tier: string | null };

export function serializeMessage(msg: NativeToWebMessage): string {
  return JSON.stringify(msg);
}

export function parseWebMessage(data: string): WebToNativeMessage | null {
  try {
    const parsed = JSON.parse(data);
    if (parsed && typeof parsed.type === 'string') {
      return parsed as WebToNativeMessage;
    }
    return null;
  } catch {
    return null;
  }
}
