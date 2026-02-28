/**
 * Chekd Unified Communications 3.0 — Event Bus
 *
 * The EventBus is the central nervous system. Rather than plugins calling
 * each other directly (which creates tangled dependencies), they communicate
 * through events. This is the "pub/sub" pattern, but typed and with support
 * for request-reply, wildcards, and event history.
 *
 * Analogy: Think of it like a building's intercom system. The Video plugin
 * announces "room:participant-joined" on the intercom. The Chat plugin hears
 * it and sends a system message. The Whiteboard plugin hears it and adds a
 * collaborator cursor. None of them know about each other — they just listen
 * to the intercom.
 *
 * Event naming convention: {domain}:{action}
 *   - room:created, room:participant-joined, room:closed
 *   - chat:message-sent, chat:channel-created, chat:reaction-added
 *   - call:initiated, call:completed, call:bridged
 *   - whiteboard:stroke-added, whiteboard:element-updated
 *   - cloud:file-shared, cloud:connection-established
 *   - platform:plugin-registered, platform:health-check
 *
 * @example
 * ```ts
 * // In the Video plugin
 * bus.emit('room:participant-joined', { roomId, userId, userName });
 *
 * // In the Chat plugin
 * bus.on('room:participant-joined', async (data) => {
 *   await this.sendSystemMessage(data.roomId, `${data.userName} joined the call`);
 * });
 * ```
 */

export type EventHandler<T = unknown> = (data: T) => void | Promise<void>;

export interface EventSubscription {
  event: string;
  handler: EventHandler;
  pluginId?: string;
  once: boolean;
}

export interface BusEvent<T = unknown> {
  type: string;
  data: T;
  timestamp: Date;
  sourcePluginId?: string;
}

export class EventBus {
  private handlers: Map<string, Set<EventSubscription>> = new Map();
  private history: BusEvent[] = [];
  private maxHistory: number;
  private middlewares: BusMiddleware[] = [];

  constructor(options?: { maxHistory?: number }) {
    this.maxHistory = options?.maxHistory ?? 1000;
  }

  // ─── Subscribe ───────────────────────────────────────────────

  /**
   * Subscribe to an event. Returns an unsubscribe function.
   */
  on<T = unknown>(event: string, handler: EventHandler<T>, pluginId?: string): () => void {
    return this.addSubscription(event, handler as EventHandler, pluginId, false);
  }

  /**
   * Subscribe to an event once — handler is removed after first call.
   */
  once<T = unknown>(event: string, handler: EventHandler<T>, pluginId?: string): () => void {
    return this.addSubscription(event, handler as EventHandler, pluginId, true);
  }

  /**
   * Subscribe to all events matching a wildcard pattern.
   * Supports '*' (all events) and 'domain:*' (all events in a domain).
   */
  onPattern(pattern: string, handler: EventHandler, pluginId?: string): () => void {
    // For '*', subscribe to a special wildcard key
    // For 'domain:*', subscribe to the domain prefix
    const key = pattern.endsWith(':*') ? pattern.slice(0, -1) : pattern;
    return this.addSubscription(`__pattern:${key}`, handler, pluginId, false);
  }

  private addSubscription(event: string, handler: EventHandler, pluginId: string | undefined, once: boolean): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    const sub: EventSubscription = { event, handler, pluginId, once };
    this.handlers.get(event)!.add(sub);

    return () => {
      this.handlers.get(event)?.delete(sub);
    };
  }

  // ─── Publish ─────────────────────────────────────────────────

  /**
   * Emit an event to all subscribers. Handlers run concurrently.
   */
  async emit<T = unknown>(type: string, data: T, sourcePluginId?: string): Promise<void> {
    const event: BusEvent<T> = { type, data, timestamp: new Date(), sourcePluginId };

    // Run middlewares
    for (const mw of this.middlewares) {
      const shouldContinue = await mw(event);
      if (shouldContinue === false) return;
    }

    // Store in history
    this.history.push(event as BusEvent);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    // Collect matching handlers
    const handlers: EventHandler[] = [];

    // Exact match
    const exact = this.handlers.get(type);
    if (exact) {
      for (const sub of exact) {
        handlers.push(sub.handler);
        if (sub.once) exact.delete(sub);
      }
    }

    // Wildcard '*' match
    const wildcard = this.handlers.get('__pattern:*');
    if (wildcard) {
      for (const sub of wildcard) handlers.push(sub.handler);
    }

    // Domain wildcard 'domain:*' match (e.g., 'room:' matches 'room:created')
    const domain = type.split(':')[0];
    if (domain) {
      const domainWild = this.handlers.get(`__pattern:${domain}:`);
      if (domainWild) {
        for (const sub of domainWild) handlers.push(sub.handler);
      }
    }

    // Execute all handlers concurrently
    await Promise.allSettled(handlers.map((h) => h(data)));
  }

  /**
   * Emit and wait for a single response (request-reply pattern).
   * Useful for cross-plugin queries:
   *   const participants = await bus.request('video:get-room-participants', { roomId });
   */
  async request<TReq = unknown, TRes = unknown>(type: string, data: TReq, timeoutMs = 5000): Promise<TRes> {
    return new Promise<TRes>((resolve, reject) => {
      const replyEvent = `${type}:reply:${Date.now()}`;
      const timer = setTimeout(() => {
        reject(new Error(`Bus request timeout: ${type} (${timeoutMs}ms)`));
      }, timeoutMs);

      this.once<TRes>(replyEvent, (response) => {
        clearTimeout(timer);
        resolve(response);
      });

      this.emit(type, { ...data as any, __replyTo: replyEvent });
    });
  }

  // ─── Middleware ───────────────────────────────────────────────

  /**
   * Add middleware that runs before every event emission.
   * Return false to cancel the event.
   */
  use(middleware: BusMiddleware): void {
    this.middlewares.push(middleware);
  }

  // ─── Introspection ───────────────────────────────────────────

  /** Get recent event history */
  getHistory(filter?: { type?: string; since?: Date; limit?: number }): BusEvent[] {
    let events = this.history;
    if (filter?.type) events = events.filter((e) => e.type === filter.type);
    if (filter?.since) events = events.filter((e) => e.timestamp >= filter.since!);
    if (filter?.limit) events = events.slice(-filter.limit);
    return events;
  }

  /** Get all registered event names and their subscriber counts */
  getSubscriptions(): { event: string; subscriberCount: number; pluginIds: string[] }[] {
    const result: { event: string; subscriberCount: number; pluginIds: string[] }[] = [];
    for (const [event, subs] of this.handlers.entries()) {
      if (event.startsWith('__pattern:')) continue;
      result.push({
        event,
        subscriberCount: subs.size,
        pluginIds: [...new Set([...subs].map((s) => s.pluginId).filter(Boolean))] as string[],
      });
    }
    return result;
  }

  /** Remove all handlers for a specific plugin (used during plugin shutdown) */
  removePluginHandlers(pluginId: string): void {
    for (const [, subs] of this.handlers.entries()) {
      for (const sub of subs) {
        if (sub.pluginId === pluginId) subs.delete(sub);
      }
    }
  }

  /** Clear all handlers and history */
  reset(): void {
    this.handlers.clear();
    this.history = [];
  }
}

export type BusMiddleware = (event: BusEvent) => boolean | void | Promise<boolean | void>;

export default EventBus;
