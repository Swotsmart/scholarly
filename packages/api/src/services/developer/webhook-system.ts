// =============================================================================
// Webhook Event System
// =============================================================================
// The nervous system of the developer ecosystem — delivers real-time
// notifications to external systems via HMAC-signed HTTP callbacks with
// exponential backoff retry and dead letter queue for failed deliveries.
//
// File: infrastructure/webhook-system.ts
// Sprint: 8 | Backlog: DE-006 | Lines: ~530
// =============================================================================

import { randomUUID, randomBytes } from 'crypto';
import { Result } from '../shared/result';

// === Types ===

export type WebhookEventType =
  | 'story.generated' | 'story.illustrated' | 'story.narrated'
  | 'story.validated' | 'story.submitted' | 'story.published'
  | 'story.rejected' | 'story.archived'
  | 'review.assigned' | 'review.completed' | 'review.stage_advanced'
  | 'analytics.milestone.reads' | 'analytics.milestone.rating' | 'analytics.milestone.completion'
  | 'bounty.posted' | 'bounty.submission' | 'bounty.awarded'
  | 'creator.tier_promoted' | 'creator.payout_initiated'
  | 'arena.competition_started' | 'arena.competition_ended';

export interface WebhookSubscription {
  id: string; tenantId: string; creatorId: string; url: string;
  events: WebhookEventType[]; secret: string; active: boolean;
  description?: string; headers?: Record<string, string>;
  createdAt: string; updatedAt: string; lastDeliveryAt?: string;
  lastDeliveryStatus?: number; consecutiveFailures: number;
  disabled: boolean; disabledReason?: string;
}

export interface WebhookPayload {
  id: string; type: WebhookEventType; timestamp: string;
  tenantId: string; data: Record<string, unknown>;
  metadata: { apiVersion: string; webhookSubscriptionId: string; deliveryAttempt: number };
}

export interface DeliveryAttempt {
  id: string; webhookId: string; payloadId: string; attempt: number;
  url: string; requestHeaders: Record<string, string>;
  responseStatus?: number; responseBody?: string; responseTimeMs?: number;
  error?: string; timestamp: string; success: boolean;
}

export interface DeliveryRecord {
  payloadId: string; webhookId: string; eventType: WebhookEventType;
  status: 'pending' | 'delivered' | 'failed' | 'dead_letter';
  attempts: DeliveryAttempt[]; nextRetryAt?: string;
  createdAt: string; completedAt?: string;
}

export interface DeadLetterEntry {
  id: string; deliveryRecord: DeliveryRecord; payload: WebhookPayload;
  reason: string; movedAt: string; retriedAt?: string; resolved: boolean;
}

// === HMAC Signing ===

export class HmacSigner {
  static async sign(payload: string, secret: string): Promise<string> {
    try {
      if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
        const encoder = new TextEncoder();
        const key = await globalThis.crypto.subtle.importKey(
          'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
        );
        const sig = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(payload));
        return `sha256=${Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, '0')).join('')}`;
      }
    } catch { /* fall through */ }
    const crypto = await import('crypto');
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(payload);
    return `sha256=${hmac.digest('hex')}`;
  }

  static async verify(payload: string, secret: string, signature: string): Promise<boolean> {
    const expected = await this.sign(payload, secret);
    if (expected.length !== signature.length) return false;
    let result = 0;
    for (let i = 0; i < expected.length; i++) result |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    return result === 0;
  }
}

// === Retry Strategy ===
// Exponential backoff: 30s, 1m, 5m, 30m, 2h, 12h → dead letter

export class RetryStrategy {
  private static readonly DELAYS_MS = [30_000, 60_000, 300_000, 1_800_000, 7_200_000, 43_200_000];
  static readonly MAX_ATTEMPTS = 6;

  static getRetryDelay(attempt: number): number | null {
    if (attempt >= this.DELAYS_MS.length) return null;
    const jitter = randomBytes(4).readUInt32BE(0) / 0xffffffff;
    return this.DELAYS_MS[attempt] + this.DELAYS_MS[attempt] * 0.1 * jitter;
  }

  static getNextRetryTime(attempt: number): string | null {
    const delay = this.getRetryDelay(attempt);
    return delay ? new Date(Date.now() + delay).toISOString() : null;
  }

  static isExhausted(attempt: number): boolean { return attempt >= this.MAX_ATTEMPTS; }
}

// === Webhook System Service ===

export class WebhookSystem {
  private readonly subscriptions = new Map<string, WebhookSubscription>();
  private readonly deliveries = new Map<string, DeliveryRecord>();
  private readonly deadLetters = new Map<string, DeadLetterEntry>();
  private readonly fetchFn: typeof fetch;
  private readonly MAX_CONSECUTIVE_FAILURES = 10;
  private readonly DELIVERY_TIMEOUT_MS = 10_000;

  constructor(fetchImpl?: typeof fetch) {
    this.fetchFn = fetchImpl || globalThis.fetch.bind(globalThis);
  }

  // --- Subscription Management ---

  createSubscription(
    tenantId: string, creatorId: string, url: string, events: WebhookEventType[],
    description?: string, customHeaders?: Record<string, string>
  ): Result<WebhookSubscription> {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return { success: false, error: 'Webhook URL must use HTTPS' };
    } catch { return { success: false, error: 'Invalid webhook URL' }; }

    if (events.length === 0) return { success: false, error: 'At least one event type is required' };

    for (const existing of this.subscriptions.values()) {
      if (existing.tenantId === tenantId && existing.url === url && existing.active) {
        return { success: false, error: 'Active subscription already exists for this URL' };
      }
    }

    const id = `wh_${randomUUID()}`;
    const secret = `whsec_${randomBytes(32).toString('hex')}`;
    const now = new Date().toISOString();

    const subscription: WebhookSubscription = {
      id, tenantId, creatorId, url, events, secret, active: true,
      description, headers: customHeaders, createdAt: now, updatedAt: now,
      consecutiveFailures: 0, disabled: false,
    };

    this.subscriptions.set(id, subscription);
    return { success: true, data: subscription };
  }

  updateSubscription(id: string, updates: Partial<Pick<WebhookSubscription, 'url' | 'events' | 'active' | 'description' | 'headers'>>): Result<WebhookSubscription> {
    const sub = this.subscriptions.get(id);
    if (!sub) return { success: false, error: 'Subscription not found' };

    if (updates.url) {
      try { const p = new URL(updates.url); if (p.protocol !== 'https:') return { success: false, error: 'HTTPS required' }; sub.url = updates.url; }
      catch { return { success: false, error: 'Invalid URL' }; }
    }
    if (updates.events) sub.events = updates.events;
    if (updates.active !== undefined) sub.active = updates.active;
    if (updates.description !== undefined) sub.description = updates.description;
    if (updates.headers !== undefined) sub.headers = updates.headers;
    sub.updatedAt = new Date().toISOString();

    if (updates.active === true && sub.disabled) {
      sub.disabled = false; sub.disabledReason = undefined; sub.consecutiveFailures = 0;
    }
    return { success: true, data: sub };
  }

  deleteSubscription(id: string): Result<void> {
    if (!this.subscriptions.has(id)) return { success: false, error: 'Not found' };
    this.subscriptions.delete(id);
    return { success: true, data: undefined };
  }

  listSubscriptions(tenantId: string, creatorId?: string): Result<WebhookSubscription[]> {
    let subs = Array.from(this.subscriptions.values()).filter(s => s.tenantId === tenantId);
    if (creatorId) subs = subs.filter(s => s.creatorId === creatorId);
    return { success: true, data: subs };
  }

  rotateSecret(id: string): Result<{ newSecret: string }> {
    const sub = this.subscriptions.get(id);
    if (!sub) return { success: false, error: 'Not found' };
    const newSecret = `whsec_${randomBytes(32).toString('hex')}`;
    sub.secret = newSecret; sub.updatedAt = new Date().toISOString();
    return { success: true, data: { newSecret } };
  }

  // --- Event Dispatch ---

  async dispatchEvent(tenantId: string, eventType: WebhookEventType, data: Record<string, unknown>): Promise<Result<{ dispatched: number; subscriptions: string[] }>> {
    const matching = Array.from(this.subscriptions.values()).filter(
      s => s.tenantId === tenantId && s.active && !s.disabled && s.events.includes(eventType)
    );
    if (matching.length === 0) return { success: true, data: { dispatched: 0, subscriptions: [] } };

    const ids: string[] = [];
    for (const sub of matching) {
      const payloadId = `evt_${randomUUID()}`;
      const payload: WebhookPayload = {
        id: payloadId, type: eventType, timestamp: new Date().toISOString(), tenantId, data,
        metadata: { apiVersion: '1.0.0', webhookSubscriptionId: sub.id, deliveryAttempt: 1 },
      };
      const record: DeliveryRecord = {
        payloadId, webhookId: sub.id, eventType, status: 'pending', attempts: [], createdAt: new Date().toISOString(),
      };
      this.deliveries.set(payloadId, record);
      this.deliverPayload(sub, payload, record).catch((err) => { console.error('Webhook delivery failed:', err?.message || err); });
      ids.push(sub.id);
    }
    return { success: true, data: { dispatched: ids.length, subscriptions: ids } };
  }

  // --- Delivery Engine ---

  private async deliverPayload(sub: WebhookSubscription, payload: WebhookPayload, record: DeliveryRecord): Promise<void> {
    const payloadJson = JSON.stringify(payload);
    const signature = await HmacSigner.sign(payloadJson, sub.secret);
    const attemptNum = record.attempts.length + 1;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json', 'User-Agent': 'Scholarly-Webhooks/1.0',
      'X-Scholarly-Signature': signature, 'X-Scholarly-Event': payload.type,
      'X-Scholarly-Delivery': payload.id, 'X-Scholarly-Attempt': String(attemptNum),
      ...(sub.headers || {}),
    };

    const attempt: DeliveryAttempt = {
      id: `att_${randomUUID()}`,
      webhookId: sub.id, payloadId: payload.id, attempt: attemptNum,
      url: sub.url, requestHeaders: headers, timestamp: new Date().toISOString(), success: false,
    };

    const startTime = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.DELIVERY_TIMEOUT_MS);
      const response = await this.fetchFn(sub.url, { method: 'POST', headers, body: payloadJson, signal: controller.signal });
      clearTimeout(timeout);

      attempt.responseStatus = response.status;
      attempt.responseTimeMs = Date.now() - startTime;
      try { attempt.responseBody = await response.text(); } catch { attempt.responseBody = '(unreadable)'; }

      if (response.status >= 200 && response.status < 300) {
        attempt.success = true;
        record.status = 'delivered'; record.completedAt = new Date().toISOString();
        sub.consecutiveFailures = 0; sub.lastDeliveryAt = new Date().toISOString(); sub.lastDeliveryStatus = response.status;
      } else {
        this.handleFailure(sub, payload, record, attempt, `HTTP ${response.status}`);
      }
    } catch (error) {
      attempt.responseTimeMs = Date.now() - startTime;
      attempt.error = error instanceof Error ? error.message : String(error);
      this.handleFailure(sub, payload, record, attempt, attempt.error);
    }
    record.attempts.push(attempt);
  }

  private handleFailure(sub: WebhookSubscription, payload: WebhookPayload, record: DeliveryRecord, _attempt: DeliveryAttempt, reason: string): void {
    sub.consecutiveFailures++;
    sub.lastDeliveryStatus = _attempt.responseStatus;
    const count = record.attempts.length + 1;

    if (RetryStrategy.isExhausted(count)) {
      record.status = 'dead_letter'; record.completedAt = new Date().toISOString();
      const dlId = `dl_${randomUUID()}`;
      this.deadLetters.set(dlId, {
        id: dlId, deliveryRecord: record, payload,
        reason: `Exhausted ${RetryStrategy.MAX_ATTEMPTS} attempts. Last: ${reason}`,
        movedAt: new Date().toISOString(), resolved: false,
      });
    } else {
      record.status = 'pending';
      record.nextRetryAt = RetryStrategy.getNextRetryTime(count) || undefined;
    }

    if (sub.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      sub.disabled = true;
      sub.disabledReason = `Auto-disabled after ${this.MAX_CONSECUTIVE_FAILURES} consecutive failures. Last: ${reason}`;
    }
  }

  // --- Retry Processing ---

  async processRetries(): Promise<Result<{ processed: number; succeeded: number; failed: number }>> {
    const now = new Date(); let processed = 0, succeeded = 0, failed = 0;
    for (const delivery of this.deliveries.values()) {
      if (delivery.status !== 'pending' || !delivery.nextRetryAt) continue;
      if (new Date(delivery.nextRetryAt) > now) continue;
      const sub = this.subscriptions.get(delivery.webhookId);
      if (!sub || !sub.active || sub.disabled) continue;

      const payload: WebhookPayload = {
        id: delivery.payloadId, type: delivery.eventType, timestamp: new Date().toISOString(),
        tenantId: sub.tenantId, data: {},
        metadata: { apiVersion: '1.0.0', webhookSubscriptionId: sub.id, deliveryAttempt: delivery.attempts.length + 1 },
      };
      delivery.nextRetryAt = undefined;
      await this.deliverPayload(sub, payload, delivery);
      processed++;
      if (delivery.status === 'delivered') succeeded++; else failed++;
    }
    return { success: true, data: { processed, succeeded, failed } };
  }

  // --- Dead Letter Queue ---

  getDeliveryStatus(payloadId: string): Result<DeliveryRecord> {
    const r = this.deliveries.get(payloadId);
    return r ? { success: true, data: r } : { success: false, error: 'Not found' };
  }

  getDeliveryHistory(webhookId: string, limit = 20): Result<DeliveryRecord[]> {
    const records = Array.from(this.deliveries.values())
      .filter(d => d.webhookId === webhookId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
    return { success: true, data: records };
  }

  getDeadLetters(tenantId: string, includeResolved = false): Result<DeadLetterEntry[]> {
    let entries = Array.from(this.deadLetters.values());
    if (!includeResolved) entries = entries.filter(e => !e.resolved);
    entries = entries.filter(e => { const s = this.subscriptions.get(e.deliveryRecord.webhookId); return s?.tenantId === tenantId; });
    return { success: true, data: entries };
  }

  async retryDeadLetter(id: string): Promise<Result<DeliveryRecord>> {
    const entry = this.deadLetters.get(id);
    if (!entry) return { success: false, error: 'Not found' };
    if (entry.resolved) return { success: false, error: 'Already resolved' };
    const sub = this.subscriptions.get(entry.deliveryRecord.webhookId);
    if (!sub) return { success: false, error: 'Subscription not found' };

    const newDelivery: DeliveryRecord = {
      payloadId: `${entry.payload.id}_retry`, webhookId: sub.id, eventType: entry.deliveryRecord.eventType,
      status: 'pending', attempts: [], createdAt: new Date().toISOString(),
    };
    this.deliveries.set(newDelivery.payloadId, newDelivery);
    await this.deliverPayload(sub, entry.payload, newDelivery);
    entry.retriedAt = new Date().toISOString();
    if (newDelivery.status === 'delivered') entry.resolved = true;
    return { success: true, data: newDelivery };
  }

  resolveDeadLetter(id: string): Result<void> {
    const entry = this.deadLetters.get(id);
    if (!entry) return { success: false, error: 'Not found' };
    entry.resolved = true;
    return { success: true, data: undefined };
  }

  // --- Metrics ---

  getMetrics(): Record<string, unknown> {
    const all = Array.from(this.deliveries.values());
    const recent = all.filter(d => new Date(d.createdAt).getTime() > Date.now() - 3600_000);
    return {
      subscriptions: {
        total: this.subscriptions.size,
        active: Array.from(this.subscriptions.values()).filter(s => s.active && !s.disabled).length,
        disabled: Array.from(this.subscriptions.values()).filter(s => s.disabled).length,
      },
      deliveries: {
        totalAllTime: all.length,
        lastHour: {
          total: recent.length,
          delivered: recent.filter(d => d.status === 'delivered').length,
          pending: recent.filter(d => d.status === 'pending').length,
          deadLettered: recent.filter(d => d.status === 'dead_letter').length,
        },
      },
      deadLetterQueue: {
        unresolved: Array.from(this.deadLetters.values()).filter(e => !e.resolved).length,
        total: this.deadLetters.size,
      },
    };
  }
}

export default WebhookSystem;
