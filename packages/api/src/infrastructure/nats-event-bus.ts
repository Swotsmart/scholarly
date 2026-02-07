/**
 * Scholarly Platform — NATS Event Bus with JetStream
 * ===================================================
 *
 * REM-003: The current event bus is an in-memory Map that dispatches events
 * within a single process. This is like running a postal service where all
 * the mailboxes are in the same room — it works fine for one person, but the
 * moment you have two postal workers (server instances), letters start
 * disappearing. Events published on Instance A are invisible to Instance B.
 *
 * NATS with JetStream solves this by providing:
 * - **At-least-once delivery**: Messages are persisted to a stream and
 *   redelivered if a consumer doesn't acknowledge within a timeout.
 * - **Consumer groups**: Multiple instances of the same service share a
 *   subscription, so each event is processed exactly once across the cluster.
 * - **Replay**: New consumers can replay historical events from a stream.
 * - **Dead-letter queues**: Events that fail processing after max retries
 *   are sent to a DLQ for investigation.
 *
 * ## Event Architecture
 *
 * Events follow the subject hierarchy:
 *   scholarly.{domain}.{entity}.{action}
 *
 * Examples:
 *   scholarly.phonics.session.completed
 *   scholarly.storybook.story.published
 *   scholarly.arena.match.finished
 *   scholarly.payment.subscription.created
 *
 * @module infrastructure/nats-event-bus
 * @version 1.0.0
 */

import {
  connect,
  NatsConnection,
  JetStreamManager,
  JetStreamClient,
  JetStreamSubscription,
  StringCodec,
  AckPolicy,
  DeliverPolicy,
  RetentionPolicy,
  StorageType,
  nanos,
  ConsumerConfig,
  StreamConfig,
  NatsError,
} from 'nats';
import { Logger } from 'pino';
import { randomUUID } from 'crypto';

// ============================================================================
// SECTION 1: TYPE DEFINITIONS
// ============================================================================

/**
 * A domain event in the Scholarly platform. Every event carries enough
 * context to be processed independently — no external lookups needed.
 */
export interface ScholarlyEvent<T = unknown> {
  /** Unique event ID for idempotency. */
  id: string;
  /** Event type following the subject hierarchy. */
  type: string;
  /** When the event occurred. */
  timestamp: Date;
  /** The tenant this event belongs to. */
  tenantId: string;
  /** Who or what triggered the event. */
  source: string;
  /** The event payload. */
  data: T;
  /** Optional correlation ID for tracing event chains. */
  correlationId?: string;
  /** Schema version for backward compatibility. */
  version: number;
}

/**
 * Event handler function type. Handlers must be idempotent —
 * the same event may be delivered more than once.
 */
export type EventHandler<T = unknown> = (event: ScholarlyEvent<T>) => Promise<void>;

/**
 * Configuration for the NATS event bus.
 */
export interface NatsEventBusConfig {
  /** NATS server URL (e.g., nats://localhost:4222). */
  url: string;
  /** Name of the NATS cluster. */
  clusterName: string;
  /** Maximum reconnection attempts (-1 for infinite). */
  maxReconnectAttempts: number;
  /** Delay between reconnection attempts in ms. */
  reconnectTimeWaitMs: number;
  /** Whether JetStream is enabled. */
  jetStreamEnabled: boolean;
  /** JetStream domain (for multi-tenant NATS deployments). */
  jetStreamDomain?: string;
  /** Name of this service instance (used for consumer groups). */
  serviceName: string;
  /** Logger instance. */
  logger: Logger;
}

/**
 * Stream configuration for a domain's events.
 */
interface StreamDefinition {
  name: string;
  subjects: string[];
  maxAge: number; // nanoseconds
  maxBytes: number;
  retention: RetentionPolicy;
  storage: StorageType;
}

/**
 * The EventBus interface that all services depend on.
 * This is the contract — the NATS implementation is swappable
 * for testing with an in-memory implementation.
 */
export interface EventBus {
  publish<T>(subject: string, data: T, context: { tenantId: string; source: string; correlationId?: string }): Promise<void>;
  subscribe<T>(subject: string, group: string, handler: EventHandler<T>): Promise<void>;
  unsubscribe(subject: string, group: string): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  isConnected(): boolean;
}

// ============================================================================
// SECTION 2: STREAM DEFINITIONS
// ============================================================================

/**
 * Pre-defined streams for each domain. Each stream captures all events
 * for a domain, with appropriate retention and storage settings.
 */
const STREAM_DEFINITIONS: StreamDefinition[] = [
  {
    name: 'SCHOLARLY_PHONICS',
    subjects: ['scholarly.phonics.>'],
    maxAge: nanos(30 * 24 * 60 * 60 * 1000), // 30 days
    maxBytes: 1024 * 1024 * 1024, // 1 GB
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
  {
    name: 'SCHOLARLY_STORYBOOK',
    subjects: ['scholarly.storybook.>'],
    maxAge: nanos(30 * 24 * 60 * 60 * 1000),
    maxBytes: 1024 * 1024 * 1024,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
  {
    name: 'SCHOLARLY_ARENA',
    subjects: ['scholarly.arena.>'],
    maxAge: nanos(30 * 24 * 60 * 60 * 1000),
    maxBytes: 2 * 1024 * 1024 * 1024, // 2 GB (tournaments generate many events)
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
  {
    name: 'SCHOLARLY_PAYMENT',
    subjects: ['scholarly.payment.>'],
    maxAge: nanos(90 * 24 * 60 * 60 * 1000), // 90 days (financial events retained longer)
    maxBytes: 512 * 1024 * 1024,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
  {
    name: 'SCHOLARLY_AUTH',
    subjects: ['scholarly.auth.>'],
    maxAge: nanos(7 * 24 * 60 * 60 * 1000), // 7 days
    maxBytes: 256 * 1024 * 1024,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
  {
    name: 'SCHOLARLY_WELLBEING',
    subjects: ['scholarly.wellbeing.>'],
    maxAge: nanos(90 * 24 * 60 * 60 * 1000), // 90 days (sensitive data)
    maxBytes: 512 * 1024 * 1024,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
  {
    name: 'SCHOLARLY_AI',
    subjects: ['scholarly.ai.>'],
    maxAge: nanos(7 * 24 * 60 * 60 * 1000),
    maxBytes: 256 * 1024 * 1024,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
  {
    name: 'SCHOLARLY_CONTENT',
    subjects: ['scholarly.content.>'],
    maxAge: nanos(30 * 24 * 60 * 60 * 1000),
    maxBytes: 512 * 1024 * 1024,
    retention: RetentionPolicy.Limits,
    storage: StorageType.File,
  },
];

// ============================================================================
// SECTION 3: NATS EVENT BUS IMPLEMENTATION
// ============================================================================

const sc = StringCodec();

export class NatsEventBus implements EventBus {
  private connection: NatsConnection | null = null;
  private jsm: JetStreamManager | null = null;
  private js: JetStreamClient | null = null;
  private subscriptions = new Map<string, JetStreamSubscription>();
  private readonly config: NatsEventBusConfig;
  private readonly logger: Logger;
  private connected = false;

  constructor(config: NatsEventBusConfig) {
    this.config = config;
    this.logger = config.logger.child({ module: 'NatsEventBus' });
  }

  // --------------------------------------------------------------------------
  // Connection Lifecycle
  // --------------------------------------------------------------------------

  async connect(): Promise<void> {
    try {
      this.logger.info({ url: this.config.url }, 'Connecting to NATS...');

      this.connection = await connect({
        servers: this.config.url,
        name: this.config.serviceName,
        maxReconnectAttempts: this.config.maxReconnectAttempts,
        reconnectTimeWait: this.config.reconnectTimeWaitMs,
        reconnect: true,
        pingInterval: 30_000,
        maxPingOut: 3,
      });

      // Connection event handlers
      this.connection.closed().then(() => {
        this.connected = false;
        this.logger.info('NATS connection closed');
      });

      (async () => {
        if (!this.connection) return;
        for await (const status of this.connection.status()) {
          switch (status.type) {
            case 'reconnecting':
              this.logger.warn({ server: status.data }, 'NATS reconnecting...');
              break;
            case 'reconnect':
              this.logger.info({ server: status.data }, 'NATS reconnected');
              this.connected = true;
              break;
            case 'disconnect':
              this.logger.warn({ server: status.data }, 'NATS disconnected');
              this.connected = false;
              break;
            case 'error':
              this.logger.error({ error: status.data }, 'NATS error');
              break;
            case 'update':
              this.logger.info({ data: status.data }, 'NATS cluster update');
              break;
          }
        }
      })();

      // Initialise JetStream
      if (this.config.jetStreamEnabled) {
        this.jsm = await this.connection.jetstreamManager(
          this.config.jetStreamDomain ? { domain: this.config.jetStreamDomain } : undefined,
        );
        this.js = this.connection.jetstream(
          this.config.jetStreamDomain ? { domain: this.config.jetStreamDomain } : undefined,
        );

        await this.ensureStreams();
      }

      this.connected = true;
      this.logger.info({ url: this.config.url, jetStream: this.config.jetStreamEnabled }, 'NATS connected');
    } catch (err) {
      this.logger.error({ err, url: this.config.url }, 'Failed to connect to NATS');
      throw err;
    }
  }

  async disconnect(): Promise<void> {
    // Unsubscribe all
    for (const [key, sub] of this.subscriptions) {
      try {
        sub.unsubscribe();
        this.logger.debug({ key }, 'Unsubscribed from JetStream consumer');
      } catch (err) {
        this.logger.warn({ err, key }, 'Error unsubscribing');
      }
    }
    this.subscriptions.clear();

    if (this.connection) {
      await this.connection.drain();
      this.connection = null;
    }

    this.connected = false;
    this.logger.info('NATS disconnected');
  }

  isConnected(): boolean {
    return this.connected;
  }

  // --------------------------------------------------------------------------
  // Stream Management
  // --------------------------------------------------------------------------

  /**
   * Ensures all domain streams exist in JetStream. Idempotent — safe to
   * call on every startup. Existing streams are updated if their config
   * has changed; new streams are created.
   */
  private async ensureStreams(): Promise<void> {
    if (!this.jsm) return;

    for (const def of STREAM_DEFINITIONS) {
      try {
        const streamConfig: Partial<StreamConfig> = {
          name: def.name,
          subjects: def.subjects,
          max_age: def.maxAge,
          max_bytes: def.maxBytes,
          retention: def.retention,
          storage: def.storage,
          num_replicas: 1,
          duplicate_window: nanos(2 * 60 * 1000), // 2 min dedup window
        };

        try {
          await this.jsm.streams.info(def.name);
          await this.jsm.streams.update(def.name, streamConfig);
          this.logger.debug({ stream: def.name }, 'JetStream stream updated');
        } catch (err) {
          if ((err as NatsError)?.code === '404') {
            await this.jsm.streams.add(streamConfig);
            this.logger.info({ stream: def.name, subjects: def.subjects }, 'JetStream stream created');
          } else {
            throw err;
          }
        }
      } catch (err) {
        this.logger.error({ err, stream: def.name }, 'Failed to ensure JetStream stream');
      }
    }
  }

  // --------------------------------------------------------------------------
  // Publish
  // --------------------------------------------------------------------------

  async publish<T>(
    subject: string,
    data: T,
    context: { tenantId: string; source: string; correlationId?: string },
  ): Promise<void> {
    const event: ScholarlyEvent<T> = {
      id: randomUUID(),
      type: subject,
      timestamp: new Date(),
      tenantId: context.tenantId,
      source: context.source,
      data,
      correlationId: context.correlationId,
      version: 1,
    };

    const payload = sc.encode(JSON.stringify(event));

    try {
      if (this.js && this.config.jetStreamEnabled) {
        // JetStream publish with dedup
        const ack = await this.js.publish(subject, payload, {
          msgID: event.id,
          expect: { streamName: this.findStreamForSubject(subject) },
        });

        this.logger.debug({
          subject,
          eventId: event.id,
          stream: ack.stream,
          seq: ack.seq,
          tenantId: context.tenantId,
        }, 'Event published to JetStream');
      } else if (this.connection) {
        // Core NATS publish (no persistence)
        this.connection.publish(subject, payload);
        this.logger.debug({ subject, eventId: event.id }, 'Event published to core NATS');
      } else {
        throw new Error('NATS not connected');
      }
    } catch (err) {
      this.logger.error({
        err,
        subject,
        eventId: event.id,
        tenantId: context.tenantId,
      }, 'Failed to publish event');
      throw err;
    }
  }

  // --------------------------------------------------------------------------
  // Subscribe
  // --------------------------------------------------------------------------

  async subscribe<T>(
    subject: string,
    group: string,
    handler: EventHandler<T>,
  ): Promise<void> {
    const subKey = `${subject}:${group}`;

    if (this.subscriptions.has(subKey)) {
      this.logger.warn({ subject, group }, 'Already subscribed');
      return;
    }

    if (!this.js || !this.jsm) {
      throw new Error('JetStream not initialised — cannot create durable subscription');
    }

    const streamName = this.findStreamForSubject(subject);
    const durableName = `${group}-${subject.replace(/\./g, '-').replace(/>/g, 'all')}`;

    // Ensure consumer exists
    const consumerConfig: Partial<ConsumerConfig> = {
      durable_name: durableName,
      deliver_policy: DeliverPolicy.Last,
      ack_policy: AckPolicy.Explicit,
      ack_wait: nanos(30_000), // 30 seconds to process
      max_deliver: 5, // Max 5 delivery attempts
      filter_subject: subject,
    };

    try {
      try {
        await this.jsm.consumers.info(streamName, durableName);
        await this.jsm.consumers.update(streamName, durableName, consumerConfig);
      } catch (err) {
        if ((err as NatsError)?.code === '404') {
          await this.jsm.consumers.add(streamName, consumerConfig);
          this.logger.info({ stream: streamName, consumer: durableName }, 'JetStream consumer created');
        } else {
          throw err;
        }
      }

      // Subscribe
      const sub = await this.js.subscribe(subject, {
        stream: streamName,
        config: consumerConfig,
      });

      this.subscriptions.set(subKey, sub);

      // Process messages
      (async () => {
        for await (const msg of sub) {
          const eventData = sc.decode(msg.data);
          let event: ScholarlyEvent<T>;

          try {
            event = JSON.parse(eventData) as ScholarlyEvent<T>;
          } catch (parseErr) {
            this.logger.error({ parseErr, subject, raw: eventData.slice(0, 200) }, 'Failed to parse event');
            msg.ack(); // Ack to prevent infinite redelivery of unparseable messages
            continue;
          }

          try {
            await handler(event);
            msg.ack();

            this.logger.debug({
              subject,
              eventId: event.id,
              tenantId: event.tenantId,
            }, 'Event processed and acknowledged');
          } catch (handlerErr) {
            const redeliveryCount = msg.info?.redeliveryCount ?? 0;

            if (redeliveryCount >= 4) {
              // Max retries reached — ack to stop redelivery and log for DLQ
              msg.ack();
              this.logger.error({
                err: handlerErr,
                subject,
                eventId: event.id,
                tenantId: event.tenantId,
                redeliveryCount,
              }, 'Event handler failed after max retries — moving to DLQ');

              // Publish to dead letter subject
              await this.publishDeadLetter(subject, event, handlerErr as Error);
            } else {
              // NAK to trigger redelivery with backoff
              const delayMs = Math.min(1000 * Math.pow(2, redeliveryCount), 30000);
              msg.nak(delayMs);

              this.logger.warn({
                err: handlerErr,
                subject,
                eventId: event.id,
                redeliveryCount,
                nextRetryMs: delayMs,
              }, 'Event handler failed — scheduling retry');
            }
          }
        }
      })();

      this.logger.info({ subject, group, consumer: durableName }, 'Subscribed to JetStream');
    } catch (err) {
      this.logger.error({ err, subject, group }, 'Failed to subscribe');
      throw err;
    }
  }

  async unsubscribe(subject: string, group: string): Promise<void> {
    const subKey = `${subject}:${group}`;
    const sub = this.subscriptions.get(subKey);

    if (sub) {
      sub.unsubscribe();
      this.subscriptions.delete(subKey);
      this.logger.info({ subject, group }, 'Unsubscribed');
    }
  }

  // --------------------------------------------------------------------------
  // Helpers
  // --------------------------------------------------------------------------

  private findStreamForSubject(subject: string): string {
    for (const def of STREAM_DEFINITIONS) {
      for (const pattern of def.subjects) {
        const prefix = pattern.replace('.>', '');
        if (subject.startsWith(prefix)) {
          return def.name;
        }
      }
    }
    // Default to a catch-all stream
    return 'SCHOLARLY_CONTENT';
  }

  private async publishDeadLetter<T>(
    originalSubject: string,
    event: ScholarlyEvent<T>,
    error: Error,
  ): Promise<void> {
    const dlqSubject = `scholarly.dlq.${originalSubject}`;

    try {
      if (this.connection) {
        const dlqPayload = JSON.stringify({
          originalSubject,
          event,
          error: {
            name: error.name,
            message: error.message,
            stack: error.stack,
          },
          failedAt: new Date().toISOString(),
        });

        this.connection.publish(dlqSubject, sc.encode(dlqPayload));
        this.logger.info({ dlqSubject, eventId: event.id }, 'Event published to DLQ');
      }
    } catch (dlqErr) {
      this.logger.error({ dlqErr, originalSubject, eventId: event.id }, 'Failed to publish to DLQ');
    }
  }
}

// ============================================================================
// SECTION 4: IN-MEMORY EVENT BUS (FOR TESTING)
// ============================================================================

/**
 * An in-memory implementation of EventBus for unit testing.
 * Records all published events and allows synchronous handler dispatch.
 */
export class InMemoryEventBus implements EventBus {
  private handlers = new Map<string, Array<{ group: string; handler: EventHandler }>>();
  public publishedEvents: ScholarlyEvent[] = [];
  private connected = false;

  async connect(): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handlers.clear();
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish<T>(
    subject: string,
    data: T,
    context: { tenantId: string; source: string; correlationId?: string },
  ): Promise<void> {
    const event: ScholarlyEvent<T> = {
      id: randomUUID(),
      type: subject,
      timestamp: new Date(),
      tenantId: context.tenantId,
      source: context.source,
      data,
      correlationId: context.correlationId,
      version: 1,
    };

    this.publishedEvents.push(event as ScholarlyEvent);

    // Dispatch to handlers (one per group)
    const groupsSeen = new Set<string>();
    const entries = this.handlers.get(subject) ?? [];

    for (const entry of entries) {
      if (!groupsSeen.has(entry.group)) {
        groupsSeen.add(entry.group);
        await entry.handler(event);
      }
    }
  }

  async subscribe<T>(subject: string, group: string, handler: EventHandler<T>): Promise<void> {
    const existing = this.handlers.get(subject) ?? [];
    existing.push({ group, handler: handler as EventHandler });
    this.handlers.set(subject, existing);
  }

  async unsubscribe(subject: string, group: string): Promise<void> {
    const existing = this.handlers.get(subject) ?? [];
    this.handlers.set(
      subject,
      existing.filter((e) => e.group !== group),
    );
  }

  /** Test helper: clear all recorded events. */
  reset(): void {
    this.publishedEvents = [];
    this.handlers.clear();
  }

  /** Test helper: get events by subject. */
  getEventsBySubject(subject: string): ScholarlyEvent[] {
    return this.publishedEvents.filter((e) => e.type === subject);
  }
}
