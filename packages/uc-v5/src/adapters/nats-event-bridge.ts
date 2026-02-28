/**
 * Scholarly Unified Communications 4.0 — NATS Event Bridge
 *
 * The EventBus is the UC platform's internal nervous system — it carries
 * events between plugins within a single process. But Scholarly is a
 * distributed system: the API server, voice service, phonics engine, and
 * other services all need to react to UC events. That's where NATS comes in.
 *
 * The NATS Event Bridge is like a radio transmitter attached to the intercom
 * system. Every announcement on the internal intercom (EventBus) is
 * simultaneously broadcast on a radio frequency (NATS subject) so that
 * anyone tuned in — anywhere on the network — can hear it.
 *
 * Subject naming convention:
 *   Internal event: room:created
 *   NATS subject:   scholarly.uc.room.created
 *
 * The bridge is bidirectional by default: external services can publish
 * to NATS subjects and the bridge re-emits them on the local EventBus,
 * enabling cross-service orchestration.
 *
 * Event filtering prevents storms: you can configure which event prefixes
 * are bridged to NATS. By default all events are bridged, but for
 * high-frequency events (like typing indicators), you may want to filter.
 */

import type { EventBus, BusEvent } from '../bus/event-bus';
import type { NatsBridgeConfig } from '../config';
import { createLogger } from '../utils/logger';

/**
 * Interface for the NATS connection. We define our own minimal interface
 * rather than importing the nats package directly, so the bridge can be
 * instantiated with any NATS-compatible client.
 */
interface NatsConnection {
  publish(subject: string, data?: Uint8Array): void;
  subscribe(subject: string): AsyncIterable<NatsMessage>;
  drain(): Promise<void>;
  close(): Promise<void>;
  isClosed(): boolean;
}

interface NatsMessage {
  subject: string;
  data: Uint8Array;
}

export class NatsEventBridge {
  private bus: EventBus;
  private config: NatsBridgeConfig;
  private connection: NatsConnection | null = null;
  private unsubscribeBus: (() => void) | null = null;
  private logger = createLogger('NatsEventBridge');
  private subjectPrefix: string;
  private eventFilter: string[];
  private bidirectional: boolean;
  private subscriptionAbort: AbortController | null = null;
  private isShutdown = false;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  constructor(bus: EventBus, config: NatsBridgeConfig) {
    this.bus = bus;
    this.config = config;
    this.subjectPrefix = config.subjectPrefix || 'scholarly.uc';
    this.eventFilter = config.eventFilter || [];
    this.bidirectional = config.bidirectional !== false;
  }

  // ─── Connection ────────────────────────────────────────────────

  /**
   * Connect to NATS and start bridging events. This method dynamically
   * imports the 'nats' package so it remains an optional peer dependency.
   */
  async connect(): Promise<void> {
    try {
      // Dynamic import — nats is an optional peer dependency
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const nats: any = await (Function('return import("nats")')());

      const connectOpts: any = {
        servers: this.config.url.split(',').map((s: string) => s.trim()),
      };

      if (this.config.credentials) {
        if (this.config.credentials.user) connectOpts.user = this.config.credentials.user;
        if (this.config.credentials.pass) connectOpts.pass = this.config.credentials.pass;
        if (this.config.credentials.token) connectOpts.token = this.config.credentials.token;
      }

      this.connection = await nats.connect(connectOpts) as unknown as NatsConnection;
      this.logger.info(`Connected to NATS at ${this.config.url}`);

      // Bridge local EventBus → NATS
      this.startOutboundBridge();

      // Bridge NATS → local EventBus (if bidirectional)
      if (this.bidirectional) {
        this.startInboundBridge();
      }

      this.logger.info(`Event bridge active (prefix: ${this.subjectPrefix}, bidirectional: ${this.bidirectional})`);
    } catch (error) {
      this.logger.warn(`NATS connection failed: ${error}. UC platform will operate without NATS bridge.`);
      // Don't throw — NATS is optional. The platform works without it.
    }
  }

  // ─── Outbound: EventBus → NATS ─────────────────────────────────

  private startOutboundBridge(): void {
    // Subscribe to ALL events on the internal bus using a wildcard
    this.unsubscribeBus = this.bus.onPattern('*', (data: any) => {
      // The pattern handler receives data but not the event type directly.
      // We use a bus middleware instead for full event access.
    });

    // Actually, we need the event type. Use middleware instead.
    if (this.unsubscribeBus) {
      this.unsubscribeBus();
      this.unsubscribeBus = null;
    }

    this.bus.use((event: BusEvent) => {
      if (this.isShutdown || !this.connection) return;

      // Don't re-bridge events that came FROM NATS (prevent infinite loops)
      if (event.sourcePluginId === '__nats-bridge__') return;

      // Apply event filter
      if (this.shouldBridgeEvent(event.type)) {
        this.publishToNats(event);
      }
    });
  }

  private shouldBridgeEvent(eventType: string): boolean {
    // No filter = bridge everything
    if (this.eventFilter.length === 0) return true;

    // Check if the event type starts with any of the filter prefixes
    return this.eventFilter.some(prefix => eventType.startsWith(prefix));
  }

  private publishToNats(event: BusEvent): void {
    if (!this.connection || this.connection.isClosed()) return;

    try {
      // Convert event type to NATS subject: room:created → scholarly.uc.room.created
      const subject = `${this.subjectPrefix}.${event.type.replace(/:/g, '.')}`;

      const payload = this.encoder.encode(JSON.stringify({
        type: event.type,
        data: event.data,
        timestamp: event.timestamp.toISOString(),
        sourcePluginId: event.sourcePluginId,
      }));

      this.connection.publish(subject, payload);
    } catch (error) {
      this.logger.debug(`Failed to publish ${event.type} to NATS: ${error}`);
    }
  }

  // ─── Inbound: NATS → EventBus ──────────────────────────────────

  private async startInboundBridge(): Promise<void> {
    if (!this.connection) return;

    try {
      // Subscribe to all subjects under our prefix: scholarly.uc.>
      const wildcardSubject = `${this.subjectPrefix}.>`;
      const subscription = this.connection.subscribe(wildcardSubject);

      this.logger.info(`Subscribed to NATS: ${wildcardSubject}`);

      // Process incoming messages in the background
      this.processInboundMessages(subscription).catch((error: Error) => {
        if (!this.isShutdown) {
          this.logger.error(`Inbound NATS bridge error: ${error}`);
        }
      });
    } catch (error) {
      this.logger.warn(`Failed to subscribe to NATS: ${error}`);
    }
  }

  private async processInboundMessages(subscription: AsyncIterable<NatsMessage>): Promise<void> {
    for await (const msg of subscription) {
      if (this.isShutdown) break;

      try {
        const payload = JSON.parse(this.decoder.decode(msg.data));
        const eventType = payload.type || this.subjectToEventType(msg.subject);

        // Re-emit on local bus with special source to prevent re-bridging
        await this.bus.emit(eventType, payload.data, '__nats-bridge__');
      } catch (error) {
        this.logger.debug(`Failed to process NATS message on ${msg.subject}: ${error}`);
      }
    }
  }

  /**
   * Convert NATS subject back to event type:
   *   scholarly.uc.room.created → room:created
   */
  private subjectToEventType(subject: string): string {
    const withoutPrefix = subject.replace(`${this.subjectPrefix}.`, '');
    const parts = withoutPrefix.split('.');
    if (parts.length >= 2) {
      // First part is the domain, rest joined with '-'
      return `${parts[0]}:${parts.slice(1).join('-')}`;
    }
    return withoutPrefix;
  }

  // ─── Lifecycle ─────────────────────────────────────────────────

  async shutdown(): Promise<void> {
    this.isShutdown = true;

    if (this.unsubscribeBus) {
      this.unsubscribeBus();
      this.unsubscribeBus = null;
    }

    if (this.connection && !this.connection.isClosed()) {
      try {
        await this.connection.drain();
        this.logger.info('NATS connection drained and closed');
      } catch (error) {
        this.logger.warn(`NATS shutdown error: ${error}`);
        try {
          await this.connection.close();
        } catch { /* already closed */ }
      }
    }

    this.connection = null;
  }

  /**
   * Check if the NATS connection is alive.
   */
  isConnected(): boolean {
    return this.connection !== null && !this.connection.isClosed();
  }

  /**
   * Health check for the NATS bridge.
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; message?: string }> {
    if (!this.config.url) {
      return { status: 'healthy', message: 'NATS not configured (operating without bridge)' };
    }

    if (!this.connection || this.connection.isClosed()) {
      return { status: 'degraded', message: 'NATS disconnected — events are local-only' };
    }

    return { status: 'healthy', message: `Connected to ${this.config.url}` };
  }
}

export default NatsEventBridge;
