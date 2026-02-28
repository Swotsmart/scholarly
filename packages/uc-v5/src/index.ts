/**
 * Scholarly Unified Communications 4.0
 *
 * A pluggable, event-driven collaboration platform that provides video
 * conferencing, team chat, telephony, whiteboard, cloud file sharing,
 * approval workflows, and virtual classroom access as composable plugins.
 *
 * v4.0 transforms the standalone @chekd/unified-communications package
 * into a first-class Scholarly service, with automatic Prisma persistence,
 * NATS event bridging, and Scholarly JWT authentication when configured.
 *
 * @example Standalone (v3.3 compatible):
 * ```ts
 * import { UnifiedCommsPlatform } from '@scholarly/unified-communications';
 * import { VideoPlugin } from '@scholarly/unified-communications/plugins/video';
 *
 * const platform = new UnifiedCommsPlatform({ port: 3100 });
 * platform.register(new VideoPlugin());
 * await platform.start();
 * ```
 *
 * @example Scholarly Integration (v4.0):
 * ```ts
 * import { UnifiedCommsPlatform } from '@scholarly/unified-communications';
 * import { VideoPlugin, ChatPlugin, WebinarPlugin, ApprovalWorkflowPlugin } from '@scholarly/unified-communications/plugins';
 *
 * const uc = new UnifiedCommsPlatform({
 *   prismaClient: prisma,
 *   natsConfig: { url: 'nats://localhost:4222' },
 *   authConfig: { jwtSecret: process.env.JWT_SECRET! },
 *   tenantIsolation: 'strict',
 * });
 *
 * uc.register(new VideoPlugin())
 *   .register(new ChatPlugin())
 *   .register(new WebinarPlugin())
 *   .register(new ApprovalWorkflowPlugin());
 *
 * uc.mountOnto(scholarlyApp, '/api/uc');
 * await uc.initialize();
 * ```
 */

import express, { Express } from 'express';
import cors from 'cors';
import { EventBus } from './bus/event-bus';
import { PluginManager } from './core/plugin-manager';
import { createLogger } from './utils/logger';
import { mergeConfig, DEFAULT_CONFIG, type PlatformConfig } from './config';
import type { UCPlugin, StorageAdapter } from './core/plugin-interface';
import { PrismaStorageAdapter } from './adapters/prisma-storage-adapter';
import { NatsEventBridge } from './adapters/nats-event-bridge';
import { createScholarlyAuthMiddleware } from './adapters/scholarly-auth-middleware';

export class UnifiedCommsPlatform {
  readonly bus: EventBus;
  readonly config: PlatformConfig;

  private app: Express;
  private pluginManager: PluginManager;
  private logger = createLogger('UnifiedCommsPlatform');
  private isStarted = false;
  private storage: StorageAdapter;
  private natsBridge: NatsEventBridge | null = null;

  constructor(options: Partial<PlatformConfig> & { storage?: StorageAdapter } = {}) {
    this.config = mergeConfig(options);
    this.bus = new EventBus({ maxHistory: 1000 });
    this.app = express();

    // ─── Storage: Prisma or In-Memory ────────────────────────────
    if (options.storage) {
      this.storage = options.storage;
    } else if (this.config.prismaClient) {
      this.storage = new PrismaStorageAdapter({
        prisma: this.config.prismaClient,
        tenantIsolation: this.config.tenantIsolation || 'none',
      });
      this.logger.info('Using PrismaStorageAdapter for persistence');
    } else {
      this.storage = createInMemoryStorage();
      this.logger.info('Using in-memory storage (data will not persist across restarts)');
    }

    this.pluginManager = new PluginManager(this.bus, this.config, this.app, this.storage);

    // Default middleware
    this.app.use(cors({
      origin: this.config.corsOrigins.length > 0 ? this.config.corsOrigins : '*',
    }));
    this.app.use(express.json());

    // ─── Auth Middleware ──────────────────────────────────────────
    const authMiddleware = createScholarlyAuthMiddleware(
      this.config.authConfig,
      this.config.tenantIsolation || 'none'
    );
    this.app.use(authMiddleware);
  }

  // ─── Plugin Registration ───────────────────────────────────────

  register(plugin: UCPlugin): this {
    this.pluginManager.register(plugin);
    return this;
  }

  // ─── Startup ───────────────────────────────────────────────────

  async start(): Promise<void> {
    if (this.isStarted) throw new Error('Platform already started');

    this.logger.info('═══════════════════════════════════════════════════');
    this.logger.info('  Scholarly Unified Communications 4.0');
    this.logger.info(`  Plugins: ${this.pluginManager.getRegisteredPlugins().join(', ')}`);
    this.logger.info(`  Persistence: ${this.config.prismaClient ? 'Prisma' : 'In-Memory'}`);
    this.logger.info(`  NATS: ${this.config.natsConfig ? this.config.natsConfig.url : 'Not configured'}`);
    this.logger.info(`  Auth: ${this.config.authConfig ? 'Scholarly JWT' : 'None (open access)'}`);
    this.logger.info(`  Tenant Isolation: ${this.config.tenantIsolation || 'none'}`);
    this.logger.info('═══════════════════════════════════════════════════');

    this.mountPlatformRoutes();
    await this.connectNats();
    await this.pluginManager.initializeAll();

    this.app.listen(this.config.port, () => {
      this.logger.info(`HTTP API listening on port ${this.config.port}`);
    });

    this.isStarted = true;
    this.bus.emit('platform:started', { port: this.config.port });
    this.logger.info('Platform started successfully ✓');

    const shutdown = async () => {
      this.logger.info('Shutting down...');
      await this.pluginManager.shutdownAll();
      if (this.natsBridge) await this.natsBridge.shutdown();
      this.bus.reset();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  }

  mountOnto(hostApp: Express, basePath = '/api/uc'): void {
    this.mountPlatformRoutes();
    hostApp.use(basePath, this.app);
    this.logger.info(`Mounted onto host app at ${basePath}`);
  }

  async initialize(): Promise<void> {
    await this.connectNats();
    await this.pluginManager.initializeAll();
    this.isStarted = true;
  }

  // ─── NATS Connection ───────────────────────────────────────────

  private async connectNats(): Promise<void> {
    if (!this.config.natsConfig) return;
    this.natsBridge = new NatsEventBridge(this.bus, this.config.natsConfig);
    await this.natsBridge.connect();
  }

  // ─── Platform Routes ───────────────────────────────────────────

  private mountPlatformRoutes(): void {
    this.app.get('/health', async (_req, res) => {
      const pluginHealth = await this.pluginManager.healthCheck();
      const natsHealth = this.natsBridge
        ? await this.natsBridge.healthCheck()
        : { status: 'healthy' as const, message: 'NATS not configured' };
      const storageHealth = this.storage instanceof PrismaStorageAdapter
        ? await (this.storage as PrismaStorageAdapter).healthCheck()
        : { status: 'healthy' as const, message: 'In-memory storage' };

      const statuses = [pluginHealth.overall, natsHealth.status, storageHealth.status];
      const overall = statuses.includes('unhealthy') ? 'unhealthy'
        : statuses.includes('degraded') ? 'degraded' : 'healthy';

      res.status(overall === 'healthy' ? 200 : 503).json({
        overall, version: '4.0.0',
        plugins: pluginHealth.plugins, nats: natsHealth, storage: storageHealth,
        tenantIsolation: this.config.tenantIsolation || 'none',
      });
    });

    this.app.get('/plugins', (_req, res) => res.json(this.pluginManager.getMetadata()));
    this.app.get('/capabilities', (_req, res) => res.json(this.pluginManager.getCapabilities()));
    this.app.get('/bus/subscriptions', (_req, res) => res.json(this.bus.getSubscriptions()));
    this.app.get('/bus/history', (req, res) => {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const type = req.query.type as string | undefined;
      res.json(this.bus.getHistory({ type, limit }));
    });
  }

  // ─── Accessors ─────────────────────────────────────────────────

  getPlugin<T extends UCPlugin>(id: string): T | undefined { return this.pluginManager.getPlugin<T>(id); }
  getExpressApp(): Express { return this.app; }
  getNatsBridge(): NatsEventBridge | null { return this.natsBridge; }
  getStorage(): StorageAdapter { return this.storage; }
}

// ─── In-Memory Storage (default, for dev/testing) ────────────────

function createInMemoryStorage(): StorageAdapter {
  const store = new Map<string, Map<string, unknown>>();
  const getCollection = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };

  return {
    async get<T>(collection: string, key: string) { return (getCollection(collection).get(key) as T) ?? null; },
    async set<T>(collection: string, key: string, value: T) { getCollection(collection).set(key, value); },
    async delete(collection: string, key: string) { return getCollection(collection).delete(key); },
    async query<T>(collection: string, filter: Record<string, unknown>, options?: { limit?: number; offset?: number; orderBy?: { field: string; direction: 'asc' | 'desc' } }) {
      const col = getCollection(collection);
      let results = [...col.values()].filter((item: any) =>
        Object.entries(filter).every(([k, v]) => item[k] === v)
      ) as T[];
      if (options?.orderBy) {
        results.sort((a: any, b: any) => {
          const av = a[options.orderBy!.field]; const bv = b[options.orderBy!.field];
          return options.orderBy!.direction === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
        });
      }
      if (options?.offset) results = results.slice(options.offset);
      if (options?.limit) results = results.slice(0, options.limit);
      return results;
    },
    async count(collection: string, filter: Record<string, unknown>) {
      return (await this.query(collection, filter)).length;
    },
    async raw<T>() { throw new Error('In-memory storage does not support raw queries'); },
    async transaction<T>(fn: (tx: StorageAdapter) => Promise<T>) { return fn(this); },
  };
}

// ─── Exports ─────────────────────────────────────────────────────

export { EventBus } from './bus/event-bus';
export { PluginManager } from './core/plugin-manager';
export { PrismaStorageAdapter } from './adapters/prisma-storage-adapter';
export { NatsEventBridge } from './adapters/nats-event-bridge';
export { createScholarlyAuthMiddleware, getAuthUser, requireRole } from './adapters/scholarly-auth-middleware';
export type { UCPlugin, PluginContext, StorageAdapter, PluginHealth, PluginMetadata, PluginCapability, AuthenticatedUser } from './core/plugin-interface';
export type { PlatformConfig, ScholarlyAuthConfig, NatsBridgeConfig, TenantIsolationMode } from './config';
export type { Logger } from './utils/logger';
export * from './bus/event-types';

export default UnifiedCommsPlatform;
