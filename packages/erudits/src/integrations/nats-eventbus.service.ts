/**
 * ============================================================================
 * NATS Event Bus — Production Integration
 * ============================================================================
 *
 * Implements the EventBus interface using NATS (nats.ws or nats). NATS is
 * the nervous system of the Scholarly platform: when a resource is purchased,
 * when a book club session completes, when a manuscript is published — the
 * event propagates through NATS to every service that needs to know.
 *
 * This implementation publishes events as JSON payloads to hierarchical
 * subjects matching the ERUDITS_EVENTS taxonomy defined in erudits.types.ts.
 * For example, a resource purchase publishes to 'scholarly.resource.purchased'
 * which can be consumed by:
 *   - The analytics service (tracks revenue)
 *   - The notification service (emails the author)
 *   - The recommendation engine (updates purchase graph)
 *
 * JetStream is used when available for guaranteed delivery. If JetStream
 * is not configured, we fall back to core NATS pub/sub (at-most-once).
 *
 * ## Environment Variables
 *   NATS_URL          — NATS server URL (e.g., 'nats://localhost:4222')
 *   NATS_TOKEN        — Authentication token (optional)
 *   NATS_USE_JETSTREAM — Enable JetStream for durable delivery (default: true)
 *
 * @module erudits/integrations/nats-eventbus
 * @version 1.0.0
 */

import type { EventBus } from '../types/erudits.types';

// ── NATS SDK Type Stubs ──

interface NatsConnection {
  publish(subject: string, data: Uint8Array): void;
  jetstream(): JetStreamClient;
  drain(): Promise<void>;
  close(): Promise<void>;
  isClosed(): boolean;
}

interface JetStreamClient {
  publish(subject: string, data: Uint8Array): Promise<{ seq: number; stream: string }>;
}

// ── Implementation ──

export class NatsEventBusImpl implements EventBus {
  private js: JetStreamClient | null = null;

  constructor(
    private readonly nc: NatsConnection,
    private readonly useJetStream: boolean = true,
    private readonly encoder: TextEncoder = new TextEncoder(),
  ) {
    if (this.useJetStream) {
      try {
        this.js = this.nc.jetstream();
      } catch {
        console.warn('[NatsEventBus] JetStream not available, falling back to core NATS');
        this.js = null;
      }
    }
  }

  /**
   * Publish an event to the NATS bus.
   *
   * The payload is enriched with a timestamp and a unique event ID
   * before publishing, giving downstream consumers idempotency keys
   * and temporal ordering without relying on NATS metadata alone.
   */
  async publish(topic: string, payload: Record<string, unknown>): Promise<void> {
    const enrichedPayload = {
      ...payload,
      _eventId: this.generateEventId(),
      _publishedAt: new Date().toISOString(),
      _topic: topic,
    };

    const data = this.encoder.encode(JSON.stringify(enrichedPayload));

    try {
      if (this.js) {
        // JetStream: guaranteed delivery with acknowledgement
        await this.js.publish(topic, data);
      } else {
        // Core NATS: fire-and-forget (at-most-once)
        this.nc.publish(topic, data);
      }
    } catch (err) {
      // Event publishing should not crash the request.
      // Log the error but don't throw — the primary operation succeeded,
      // and downstream consumers will reconcile from the source of truth.
      console.error(`[NatsEventBus] Failed to publish ${topic}:`, (err as Error).message);
    }
  }

  /**
   * Gracefully drain the connection. Call this during shutdown to
   * ensure in-flight messages are delivered before the process exits.
   */
  async shutdown(): Promise<void> {
    if (!this.nc.isClosed()) {
      await this.nc.drain();
    }
  }

  // ── Helpers ──

  private generateEventId(): string {
    // Sortable event ID: timestamp prefix + random suffix
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}-${random}`;
  }
}

// ── Factory ──

export function createNatsEventBus(
  connection: NatsConnection,
  useJetStream?: boolean,
): NatsEventBusImpl {
  return new NatsEventBusImpl(connection, useJetStream);
}
