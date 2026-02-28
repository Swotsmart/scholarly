/**
 * Scholarly Unified Communications 4.0 — Prisma Storage Adapter
 *
 * This adapter is the bridge between the UC platform's generic StorageAdapter
 * interface and Scholarly's Prisma Client. Think of it as a universal power
 * adapter: the UC plugins speak "StorageAdapter" (a generic plug shape), and
 * Prisma speaks its own ORM dialect. This adapter translates between the two
 * so every plugin can persist data without knowing anything about Prisma.
 *
 * The adapter uses Prisma's generic `$queryRawUnsafe` and `$executeRawUnsafe`
 * for the `raw()` method, but the primary interface (get/set/delete/query/count)
 * uses a JSON-based storage pattern via a single `uc_kv_store` table. This
 * avoids requiring separate Prisma models for every plugin's data — plugins
 * store their data as JSON documents in a key-value pattern, similar to how
 * DynamoDB or Firestore work.
 *
 * For plugins that need relational queries (like the Approval Workflow), the
 * `raw()` method provides escape-hatch access to full SQL via Prisma.
 *
 * Multi-tenant isolation: When tenantIsolation is 'strict', every operation
 * automatically includes tenantId in the WHERE clause. The plugin doesn't
 * need to think about it — the adapter enforces boundaries at the data layer.
 *
 * Table schema (auto-created if missing):
 *   uc_kv_store (
 *     id          TEXT PRIMARY KEY,
 *     collection  TEXT NOT NULL,
 *     key         TEXT NOT NULL,
 *     tenant_id   TEXT,
 *     data        JSONB NOT NULL,
 *     created_at  TIMESTAMP DEFAULT NOW(),
 *     updated_at  TIMESTAMP DEFAULT NOW(),
 *     UNIQUE(collection, key, tenant_id)
 *   )
 */

import type { StorageAdapter, QueryOptions } from '../core/plugin-interface';
import type { TenantIsolationMode } from '../config';
import { createLogger } from '../utils/logger';

/**
 * Configuration for the Prisma storage adapter.
 */
export interface PrismaStorageAdapterConfig {
  /** Prisma Client instance (typed as unknown to avoid hard dependency) */
  prisma: unknown;
  /** Tenant isolation mode */
  tenantIsolation: TenantIsolationMode;
  /** Current tenant ID (set per-request in strict mode) */
  tenantId?: string;
  /** Table name for the KV store. Default: 'uc_kv_store' */
  tableName?: string;
}

export class PrismaStorageAdapter implements StorageAdapter {
  private prisma: any;
  private tenantIsolation: TenantIsolationMode;
  private tenantId?: string;
  private tableName: string;
  private logger = createLogger('PrismaStorageAdapter');
  private initialized = false;

  constructor(config: PrismaStorageAdapterConfig) {
    this.prisma = config.prisma;
    this.tenantIsolation = config.tenantIsolation;
    this.tenantId = config.tenantId;
    this.tableName = config.tableName || 'uc_kv_store';
  }

  // ─── Initialization ────────────────────────────────────────────

  /**
   * Ensure the KV store table exists. Called lazily on first operation.
   * Uses CREATE TABLE IF NOT EXISTS so it's safe to call multiple times.
   */
  private async ensureTable(): Promise<void> {
    if (this.initialized) return;

    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "${this.tableName}" (
          "id"          TEXT NOT NULL,
          "collection"  TEXT NOT NULL,
          "key"         TEXT NOT NULL,
          "tenant_id"   TEXT,
          "data"        JSONB NOT NULL DEFAULT '{}',
          "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "${this.tableName}_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "${this.tableName}_collection_key_tenant" UNIQUE ("collection", "key", "tenant_id")
        );
      `);

      await this.prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "${this.tableName}_collection_tenant_idx"
          ON "${this.tableName}" ("collection", "tenant_id");
      `);

      this.initialized = true;
      this.logger.info(`KV store table "${this.tableName}" ready`);
    } catch (error) {
      // Table might already exist with slightly different schema — that's OK
      this.logger.debug(`Table init: ${error}`);
      this.initialized = true;
    }
  }

  // ─── Tenant Scoping ────────────────────────────────────────────

  private getTenantScope(): string {
    if (this.tenantIsolation === 'strict' && !this.tenantId) {
      throw new Error(
        'PrismaStorageAdapter: tenantId is required in strict isolation mode. ' +
        'Ensure auth middleware is setting tenantId on the request context.'
      );
    }
    return this.tenantId || '__global__';
  }

  /**
   * Create a tenant-scoped clone of this adapter. Used by auth middleware
   * to provide per-request storage instances with the correct tenantId.
   */
  withTenant(tenantId: string): PrismaStorageAdapter {
    return new PrismaStorageAdapter({
      prisma: this.prisma,
      tenantIsolation: this.tenantIsolation,
      tenantId,
      tableName: this.tableName,
    });
  }

  // ─── StorageAdapter Interface ──────────────────────────────────

  async get<T = unknown>(collection: string, key: string): Promise<T | null> {
    await this.ensureTable();
    const tenant = this.getTenantScope();

    const results: any[] = await this.prisma.$queryRawUnsafe(
      `SELECT "data" FROM "${this.tableName}" WHERE "collection" = $1 AND "key" = $2 AND "tenant_id" = $3 LIMIT 1`,
      collection, key, tenant
    );

    if (results.length === 0) return null;
    return results[0].data as T;
  }

  async set<T = unknown>(collection: string, key: string, value: T): Promise<void> {
    await this.ensureTable();
    const tenant = this.getTenantScope();
    const id = `${collection}:${tenant}:${key}`;
    const data = JSON.stringify(value);

    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "${this.tableName}" ("id", "collection", "key", "tenant_id", "data", "created_at", "updated_at")
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
       ON CONFLICT ("collection", "key", "tenant_id")
       DO UPDATE SET "data" = $5::jsonb, "updated_at" = NOW()`,
      id, collection, key, tenant, data
    );
  }

  async delete(collection: string, key: string): Promise<boolean> {
    await this.ensureTable();
    const tenant = this.getTenantScope();

    const result = await this.prisma.$executeRawUnsafe(
      `DELETE FROM "${this.tableName}" WHERE "collection" = $1 AND "key" = $2 AND "tenant_id" = $3`,
      collection, key, tenant
    );

    return result > 0;
  }

  async query<T = unknown>(
    collection: string,
    filter: Record<string, unknown>,
    options?: QueryOptions
  ): Promise<T[]> {
    await this.ensureTable();
    const tenant = this.getTenantScope();

    // Build JSONB filter conditions
    const conditions: string[] = [
      `"collection" = $1`,
      `"tenant_id" = $2`,
    ];
    const params: unknown[] = [collection, tenant];
    let paramIdx = 3;

    for (const [field, value] of Object.entries(filter)) {
      if (value === undefined) continue;
      conditions.push(`"data"->>'${field.replace(/'/g, "''")}' = $${paramIdx}`);
      params.push(String(value));
      paramIdx++;
    }

    // Build ORDER BY
    let orderClause = '';
    if (options?.orderBy) {
      const dir = options.orderBy.direction === 'desc' ? 'DESC' : 'ASC';
      const field = options.orderBy.field.replace(/'/g, "''");
      orderClause = ` ORDER BY "data"->>'${field}' ${dir}`;
    } else {
      orderClause = ' ORDER BY "updated_at" DESC';
    }

    // Build LIMIT/OFFSET
    let limitClause = '';
    if (options?.limit) {
      limitClause += ` LIMIT ${Math.max(1, Math.floor(options.limit))}`;
    }
    if (options?.offset) {
      limitClause += ` OFFSET ${Math.max(0, Math.floor(options.offset))}`;
    }

    const sql = `SELECT "data" FROM "${this.tableName}" WHERE ${conditions.join(' AND ')}${orderClause}${limitClause}`;
    const results: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);

    return results.map((r: any) => r.data as T);
  }

  async count(collection: string, filter: Record<string, unknown>): Promise<number> {
    await this.ensureTable();
    const tenant = this.getTenantScope();

    const conditions: string[] = [
      `"collection" = $1`,
      `"tenant_id" = $2`,
    ];
    const params: unknown[] = [collection, tenant];
    let paramIdx = 3;

    for (const [field, value] of Object.entries(filter)) {
      if (value === undefined) continue;
      conditions.push(`"data"->>'${field.replace(/'/g, "''")}' = $${paramIdx}`);
      params.push(String(value));
      paramIdx++;
    }

    const sql = `SELECT COUNT(*)::int as count FROM "${this.tableName}" WHERE ${conditions.join(' AND ')}`;
    const results: any[] = await this.prisma.$queryRawUnsafe(sql, ...params);

    return results[0]?.count ?? 0;
  }

  async raw<T = unknown>(query: string, params?: unknown[]): Promise<T> {
    return this.prisma.$queryRawUnsafe(query, ...(params || []));
  }

  async transaction<T>(fn: (tx: StorageAdapter) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(async (txPrisma: any) => {
      const txAdapter = new PrismaStorageAdapter({
        prisma: txPrisma,
        tenantIsolation: this.tenantIsolation,
        tenantId: this.tenantId,
        tableName: this.tableName,
      });
      txAdapter.initialized = this.initialized;
      return fn(txAdapter);
    });
  }

  // ─── Diagnostics ───────────────────────────────────────────────

  /**
   * Health check: verify the Prisma connection is alive.
   */
  async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; message?: string }> {
    try {
      await this.prisma.$queryRawUnsafe('SELECT 1');
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', message: String(error) };
    }
  }
}

export default PrismaStorageAdapter;
