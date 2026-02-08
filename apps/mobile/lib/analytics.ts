/**
 * Privacy-safe analytics — no tracking IDs, no IDFA/GAID, no third-party SDKs.
 * Uses random session IDs only. COPPA compliant.
 */

function generateSessionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 16; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
}

let currentSessionId = generateSessionId();

export function getSessionId(): string {
  return currentSessionId;
}

export function resetSession(): void {
  currentSessionId = generateSessionId();
}

type EventName =
  | 'app_open'
  | 'app_close'
  | 'screen_view'
  | 'session_start'
  | 'session_end'
  | 'module_complete'
  | 'subscription_view'
  | 'subscription_start';

interface AnalyticsEvent {
  event: EventName;
  sessionId: string;
  timestamp: number;
  properties?: Record<string, string | number | boolean>;
}

const eventQueue: AnalyticsEvent[] = [];

export function trackEvent(
  event: EventName,
  properties?: Record<string, string | number | boolean>
): void {
  eventQueue.push({
    event,
    sessionId: currentSessionId,
    timestamp: Date.now(),
    properties,
  });

  // In production, flush periodically to backend
  if (eventQueue.length >= 20) {
    flushEvents();
  }
}

export function flushEvents(): void {
  if (eventQueue.length === 0) return;

  // TODO: Send to privacy-safe analytics endpoint
  // POST /api/analytics/events with batch
  const batch = eventQueue.splice(0);
  if (__DEV__) {
    console.log('[Analytics] Flushing', batch.length, 'events');
  }
}
