/**
 * Marketplace Client-Side Telemetry
 * Thin wrapper emitting events for client-side actions.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

type MarketplaceEventType =
  | 'marketplace.search'
  | 'marketplace.app.view'
  | 'marketplace.app.install_click'
  | 'marketplace.tab.navigate'
  | 'marketplace.docs.view'
  | 'marketplace.community.view'
  | 'marketplace.developer.tab';

interface TelemetryEvent {
  type: MarketplaceEventType;
  properties: Record<string, string | number | boolean>;
  timestamp: string;
}

const eventQueue: TelemetryEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;

function enqueue(type: MarketplaceEventType, properties: Record<string, string | number | boolean> = {}) {
  eventQueue.push({
    type,
    properties,
    timestamp: new Date().toISOString(),
  });

  // Batch-flush every 5 seconds or when queue hits 10 events
  if (eventQueue.length >= 10) {
    flush();
  } else if (!flushTimer) {
    flushTimer = setTimeout(flush, 5000);
  }
}

function flush() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (eventQueue.length === 0) return;

  const events = eventQueue.splice(0, eventQueue.length);

  // Fire-and-forget — don't block the UI
  fetch(`${API_BASE}/telemetry/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ events }),
    keepalive: true,
  }).catch(() => {
    // Silent fail — telemetry is best-effort
  });
}

// Flush remaining events on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

export const marketplaceTelemetry = {
  trackSearch(query: string, category?: string, resultCount?: number) {
    enqueue('marketplace.search', { query, category: category || 'all', resultCount: resultCount ?? 0 });
  },

  trackAppView(appId: string, appName: string) {
    enqueue('marketplace.app.view', { appId, appName });
  },

  trackInstallClick(appId: string, appName: string) {
    enqueue('marketplace.app.install_click', { appId, appName });
  },

  trackTabNavigate(from: string, to: string) {
    enqueue('marketplace.tab.navigate', { from, to });
  },

  trackDocsView(category: string) {
    enqueue('marketplace.docs.view', { category });
  },

  trackCommunityView(tab: string) {
    enqueue('marketplace.community.view', { tab });
  },

  trackDeveloperTab(tab: string) {
    enqueue('marketplace.developer.tab', { tab });
  },
};
