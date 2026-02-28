/**
 * Scholarly Unified Communications 4.0 — Plugin Interface
 *
 * Every capability in the platform is a Plugin. Think of the platform
 * as a power strip: each plugin is an appliance that plugs in, draws
 * from the shared power bus (the EventBus), and exposes its controls
 * (routes, WebSocket handlers) through a standard socket shape.
 *
 * To add a new capability (say, "AI Transcription"), you:
 *   1. Create a class that implements UCPlugin
 *   2. Register it with the PluginManager
 *   3. It automatically gets the EventBus, config, logger, and HTTP mount
 *
 * The host application (Chekd Lawyer Toolkit, Plutus OS, or any other)
 * imports the platform, registers the plugins it needs, and starts.
 *
 * @example
 * ```ts
 * import { UnifiedCommsPlatform } from '@scholarly/unified-communications';
 * import { VideoPlugin } from '@scholarly/unified-communications/plugins/video';
 * import { ChatPlugin } from '@scholarly/unified-communications/plugins/chat';
 *
 * const platform = new UnifiedCommsPlatform({ port: 3100, wsPort: 3101 });
 * platform.register(new VideoPlugin());
 * platform.register(new ChatPlugin());
 * await platform.start();
 * ```
 */

import type { Express, Router } from 'express';
import type { EventBus } from '../bus/event-bus';
import type { PlatformConfig } from '../config';
import type { Logger } from '../utils/logger';

// ─── Plugin Lifecycle ────────────────────────────────────────────

export interface UCPlugin {
  /** Unique identifier: 'video', 'chat', 'telephony', 'whiteboard', 'cloud-files' */
  readonly id: string;

  /** Human-readable name for logs and admin UI */
  readonly name: string;

  /** Semver version string */
  readonly version: string;

  /** Which other plugins this one depends on (by id) */
  readonly dependencies?: string[];

  /**
   * Called when the plugin is registered. Receives the shared
   * bus, config, and logger. This is where the plugin sets up
   * its internal state and subscribes to bus events.
   */
  initialize(context: PluginContext): Promise<void>;

  /**
   * Return Express routes to mount under /api/{pluginId}/
   * Called after initialize(). Return null if no REST routes.
   */
  getRoutes(): Router | null;

  /**
   * Handle an incoming WebSocket message. The signaling server
   * routes messages to plugins based on message type prefix.
   * Return true if handled, false to pass to next plugin.
   */
  handleWebSocketMessage?(
    socketId: string,
    userId: string,
    roomId: string | undefined,
    messageType: string,
    data: unknown,
    reply: (msg: unknown) => void,
    broadcast: (roomId: string, msg: unknown, excludeSocketId?: string) => void,
  ): Promise<boolean>;

  /**
   * Called on graceful shutdown. Clean up resources, close connections.
   */
  shutdown(): Promise<void>;

  /**
   * Health check — return status for the /health endpoint.
   */
  healthCheck(): Promise<PluginHealth>;
}

// ─── Plugin Context (injected by platform) ───────────────────────

export interface PluginContext {
  /** The shared event bus — plugins communicate through events, not direct calls */
  bus: EventBus;

  /** Platform configuration (merged with plugin-specific overrides) */
  config: PlatformConfig;

  /** Structured logger scoped to this plugin */
  logger: Logger;

  /** Reference to the Express app (for advanced mounting) */
  app: Express;

  /**
   * Get another registered plugin by id. Useful for optional
   * cross-plugin features (e.g., Chat plugin asking Video plugin
   * for active room participants).
   */
  getPlugin<T extends UCPlugin>(id: string): T | undefined;

  /**
   * Storage adapter — plugins can persist state through this
   * interface without knowing the underlying database.
   */
  storage: StorageAdapter;

  // ─── Scholarly v4.0 Additions ──────────────────────────────

  /**
   * The current tenant ID, extracted from the authenticated request.
   * In 'strict' isolation mode, this is always set and all storage
   * operations are automatically scoped to this tenant. In 'none'
   * mode, this may be undefined.
   */
  tenantId?: string;

  /**
   * Helper to extract the authenticated user from an Express request.
   * Returns the decoded JWT payload with userId, tenantId, role, and
   * any custom claims. Returns null if the request is unauthenticated
   * (public path or auth not configured).
   *
   * Usage in a plugin route handler:
   *   const user = ctx.getAuthenticatedUser(req);
   *   if (!user) return res.status(401).json({ error: 'Unauthorized' });
   */
  getAuthenticatedUser(req: import('express').Request): AuthenticatedUser | null;
}

/**
 * Represents a verified user extracted from a Scholarly JWT token.
 * Attached to Express requests by the auth middleware.
 */
export interface AuthenticatedUser {
  /** Scholarly user ID */
  userId: string;
  /** Tenant (organisation) ID */
  tenantId: string;
  /** User's role within the tenant */
  role: string;
  /** User's display name */
  name?: string;
  /** User's email */
  email?: string;
  /** Raw JWT claims for plugin-specific use */
  claims: Record<string, unknown>;
}

// ─── Storage Adapter ─────────────────────────────────────────────

/**
 * Abstraction over the persistence layer. The host application
 * provides the implementation (Prisma, Knex, raw SQL, in-memory).
 * Plugins interact with storage through this interface.
 */
export interface StorageAdapter {
  /** Get a record by key from a collection */
  get<T = unknown>(collection: string, key: string): Promise<T | null>;

  /** Set/upsert a record */
  set<T = unknown>(collection: string, key: string, value: T): Promise<void>;

  /** Delete a record */
  delete(collection: string, key: string): Promise<boolean>;

  /** Query records with a filter */
  query<T = unknown>(collection: string, filter: Record<string, unknown>, options?: QueryOptions): Promise<T[]>;

  /** Count records matching a filter */
  count(collection: string, filter: Record<string, unknown>): Promise<number>;

  /**
   * Run a raw query (for complex operations). The implementation
   * determines the query language (SQL, Prisma, etc.)
   */
  raw<T = unknown>(query: string, params?: unknown[]): Promise<T>;

  /**
   * Transaction wrapper — ensures atomicity across multiple operations.
   */
  transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T>;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: { field: string; direction: 'asc' | 'desc' };
}

// ─── Plugin Health ───────────────────────────────────────────────

export interface PluginHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  message?: string;
  details?: Record<string, unknown>;
}

// ─── Plugin Metadata (for admin/registry) ────────────────────────

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  dependencies: string[];
  status: 'registered' | 'initialized' | 'running' | 'stopped' | 'error';
  health: PluginHealth;
  registeredAt: Date;
  initializedAt?: Date;
  routePrefix: string;
  wsMessagePrefixes: string[];
  eventSubscriptions: string[];
  /** v4.0: Capability descriptors for Self-Composing Interface discovery */
  capabilities?: PluginCapability[];
}

/**
 * Describes a discrete capability that a plugin exposes. The Self-Composing
 * Interface menu system reads these to dynamically build navigation items
 * and task registry entries. Think of each capability as a "menu item card"
 * that tells the UI: "I exist, here's what I do, and here's how to reach me."
 */
export interface PluginCapability {
  /** Unique capability key, e.g. 'chat.send-message', 'approval.submit-request' */
  key: string;
  /** Human-readable label for the UI */
  label: string;
  /** Brief description of what this capability does */
  description: string;
  /** Icon identifier for the UI (e.g. Lucide icon name) */
  icon?: string;
  /** Route path relative to the plugin's mount point */
  routePath?: string;
  /** Required roles to access this capability */
  requiredRoles?: string[];
  /** Whether this capability requires an active session/connection */
  requiresSession?: boolean;
}

export default UCPlugin;
