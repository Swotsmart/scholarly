/**
 * Scholarly Unified Communications 4.0 — Plugin Manager
 *
 * Orchestrates the plugin lifecycle: registration, dependency resolution,
 * initialization order, health monitoring, and graceful shutdown.
 *
 * The manager ensures plugins start in dependency order — if Chat depends
 * on Video (to listen for room events), Video is guaranteed to initialize
 * first. Circular dependencies are detected and rejected.
 */

import type { Express, Router } from 'express';
import type { UCPlugin, PluginContext, PluginMetadata, PluginHealth, StorageAdapter, AuthenticatedUser, PluginCapability } from './plugin-interface';
import { EventBus } from '../bus/event-bus';
import type { PlatformConfig } from '../config';
import { createLogger, Logger } from '../utils/logger';

export class PluginManager {
  private plugins: Map<string, UCPlugin> = new Map();
  private metadata: Map<string, PluginMetadata> = new Map();
  private bus: EventBus;
  private config: PlatformConfig;
  private app: Express;
  private storage: StorageAdapter;
  private logger: Logger;

  constructor(bus: EventBus, config: PlatformConfig, app: Express, storage: StorageAdapter) {
    this.bus = bus;
    this.config = config;
    this.app = app;
    this.storage = storage;
    this.logger = createLogger('PluginManager');
  }

  // ─── Registration ──────────────────────────────────────────────

  register(plugin: UCPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    this.plugins.set(plugin.id, plugin);
    this.metadata.set(plugin.id, {
      id: plugin.id,
      name: plugin.name,
      version: plugin.version,
      dependencies: plugin.dependencies || [],
      status: 'registered',
      health: { status: 'healthy' },
      registeredAt: new Date(),
      routePrefix: `/api/${plugin.id}`,
      wsMessagePrefixes: [],
      eventSubscriptions: [],
    });

    this.logger.info(`Plugin registered: ${plugin.name} v${plugin.version} (${plugin.id})`);
    this.bus.emit('platform:plugin-registered', { pluginId: plugin.id, name: plugin.name, version: plugin.version });
  }

  // ─── Initialization ────────────────────────────────────────────

  async initializeAll(): Promise<void> {
    const order = this.resolveDependencyOrder();
    this.logger.info(`Initializing ${order.length} plugins in order: ${order.join(' → ')}`);

    for (const pluginId of order) {
      await this.initializePlugin(pluginId);
    }
  }

  private async initializePlugin(pluginId: string): Promise<void> {
    const plugin = this.plugins.get(pluginId);
    const meta = this.metadata.get(pluginId);
    if (!plugin || !meta) throw new Error(`Plugin not found: ${pluginId}`);

    // Check dependencies are initialized
    for (const depId of plugin.dependencies || []) {
      const depMeta = this.metadata.get(depId);
      if (!depMeta || depMeta.status !== 'running') {
        throw new Error(`Plugin ${pluginId} depends on ${depId} which is not running`);
      }
    }

    this.logger.info(`Initializing plugin: ${plugin.name}...`);
    const pluginLogger = createLogger(plugin.name);

    const context: PluginContext = {
      bus: this.bus,
      config: this.config,
      logger: pluginLogger,
      app: this.app,
      storage: this.storage,
      getPlugin: <T extends UCPlugin>(id: string) => this.plugins.get(id) as T | undefined,
      // v4.0: tenant and auth helpers
      tenantId: undefined, // Set per-request by auth middleware
      getAuthenticatedUser: (req: any): AuthenticatedUser | null => {
        return (req as any)?.scholarlyUser ?? null;
      },
    };

    try {
      await plugin.initialize(context);
      meta.status = 'initialized';
      meta.initializedAt = new Date();

      // Mount routes
      const routes = plugin.getRoutes();
      if (routes) {
        this.app.use(`/api/${pluginId}`, routes);
        this.logger.info(`  → Mounted routes at /api/${pluginId}`);
      }

      meta.status = 'running';
      this.logger.info(`  ✓ ${plugin.name} initialized successfully`);
      this.bus.emit('platform:plugin-initialized', { pluginId, name: plugin.name });
    } catch (error) {
      meta.status = 'error';
      meta.health = { status: 'unhealthy', message: String(error) };
      this.logger.error(`  ✗ ${plugin.name} failed to initialize: ${error}`);
      throw error;
    }
  }

  // ─── Dependency Resolution ─────────────────────────────────────

  /**
   * Topological sort of plugins by their dependencies.
   * Detects circular dependencies.
   */
  private resolveDependencyOrder(): string[] {
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    const visit = (id: string) => {
      if (visited.has(id)) return;
      if (visiting.has(id)) {
        throw new Error(`Circular dependency detected involving plugin: ${id}`);
      }

      visiting.add(id);
      const plugin = this.plugins.get(id);
      if (plugin?.dependencies) {
        for (const dep of plugin.dependencies) {
          if (!this.plugins.has(dep)) {
            throw new Error(`Plugin ${id} depends on ${dep} which is not registered`);
          }
          visit(dep);
        }
      }
      visiting.delete(id);
      visited.add(id);
      order.push(id);
    };

    for (const id of this.plugins.keys()) {
      visit(id);
    }

    return order;
  }

  // ─── WebSocket Routing ─────────────────────────────────────────

  /**
   * Route a WebSocket message to the appropriate plugin.
   * Tries each plugin in order until one handles it.
   */
  async routeWebSocketMessage(
    socketId: string,
    userId: string,
    roomId: string | undefined,
    messageType: string,
    data: unknown,
    reply: (msg: unknown) => void,
    broadcast: (roomId: string, msg: unknown, excludeSocketId?: string) => void,
  ): Promise<boolean> {
    for (const plugin of this.plugins.values()) {
      if (plugin.handleWebSocketMessage) {
        const handled = await plugin.handleWebSocketMessage(
          socketId, userId, roomId, messageType, data, reply, broadcast,
        );
        if (handled) return true;
      }
    }
    return false;
  }

  // ─── Health ────────────────────────────────────────────────────

  async healthCheck(): Promise<{ overall: 'healthy' | 'degraded' | 'unhealthy'; plugins: Record<string, PluginHealth> }> {
    const results: Record<string, PluginHealth> = {};
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    for (const [id, plugin] of this.plugins.entries()) {
      try {
        results[id] = await plugin.healthCheck();
      } catch (error) {
        results[id] = { status: 'unhealthy', message: String(error) };
      }
      if (results[id].status === 'unhealthy') overall = 'unhealthy';
      else if (results[id].status === 'degraded' && overall === 'healthy') overall = 'degraded';
    }

    return { overall, plugins: results };
  }

  // ─── Shutdown ──────────────────────────────────────────────────

  async shutdownAll(): Promise<void> {
    // Shutdown in reverse dependency order
    const order = this.resolveDependencyOrder().reverse();
    this.logger.info(`Shutting down ${order.length} plugins...`);

    for (const pluginId of order) {
      const plugin = this.plugins.get(pluginId);
      if (plugin) {
        try {
          await plugin.shutdown();
          this.bus.removePluginHandlers(pluginId);
          this.metadata.get(pluginId)!.status = 'stopped';
          this.logger.info(`  ✓ ${plugin.name} shut down`);
        } catch (error) {
          this.logger.error(`  ✗ ${plugin.name} shutdown error: ${error}`);
        }
      }
    }
  }

  // ─── Introspection ─────────────────────────────────────────────

  getPlugin<T extends UCPlugin>(id: string): T | undefined {
    return this.plugins.get(id) as T | undefined;
  }

  getMetadata(): PluginMetadata[] {
    return [...this.metadata.values()];
  }

  getRegisteredPlugins(): string[] {
    return [...this.plugins.keys()];
  }

  /**
   * v4.0: Aggregate capabilities from all running plugins.
   * Used by the Self-Composing Interface menu system to dynamically
   * build navigation based on what plugins are active.
   */
  getCapabilities(): { pluginId: string; capabilities: PluginCapability[] }[] {
    const result: { pluginId: string; capabilities: PluginCapability[] }[] = [];
    for (const [id, meta] of this.metadata.entries()) {
      if (meta.status === 'running' && meta.capabilities && meta.capabilities.length > 0) {
        result.push({ pluginId: id, capabilities: meta.capabilities });
      }
    }
    return result;
  }

  /**
   * v4.0: Register capabilities for a plugin after initialization.
   * Plugins call this to declare what they can do.
   */
  registerCapabilities(pluginId: string, capabilities: PluginCapability[]): void {
    const meta = this.metadata.get(pluginId);
    if (meta) {
      meta.capabilities = capabilities;
      this.logger.info(`  → Registered ${capabilities.length} capabilities for ${pluginId}`);
    }
  }
}

export default PluginManager;
