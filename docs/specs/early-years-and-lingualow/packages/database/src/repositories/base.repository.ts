/**
 * Scholarly Platform - Base Repository
 * 
 * Abstract base class for all repositories providing:
 * - Common CRUD operations
 * - Soft delete support
 * - Pagination
 * - Tenant isolation
 * - Transaction support
 * 
 * @module @scholarly/database/repositories
 */

import {
  prisma,
  withDatabase,
  withTransaction,
  TransactionClient,
  excludeDeleted,
  softDeleteData,
  paginationToSkipTake,
  buildOrderBy,
  PaginationParams,
} from '../client.js';
import {
  Result,
  success,
  failure,
  NotFoundError,
  ValidationError,
  PaginatedResult,
} from '@scholarly/shared';

// =============================================================================
// TYPES
// =============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface TenantEntity extends BaseEntity {
  tenantId: string;
}

export interface FindOptions<TOrderBy = Record<string, 'asc' | 'desc'>> {
  includeDeleted?: boolean;
  orderBy?: TOrderBy;
}

export interface FindManyOptions<TOrderBy = Record<string, 'asc' | 'desc'>>
  extends FindOptions<TOrderBy> {
  pagination?: PaginationParams;
}

// =============================================================================
// BASE REPOSITORY
// =============================================================================

export abstract class BaseRepository<
  TEntity extends BaseEntity,
  TCreateInput,
  TUpdateInput,
  TWhereUnique,
  TWhereInput,
  TOrderBy = Record<string, 'asc' | 'desc'>
> {
  protected abstract entityName: string;

  /**
   * Get the Prisma model delegate
   */
  protected abstract getDelegate(
    client?: TransactionClient
  ): {
    findUnique: (args: { where: TWhereUnique; include?: unknown }) => Promise<TEntity | null>;
    findFirst: (args: { where: TWhereInput; include?: unknown; orderBy?: TOrderBy }) => Promise<TEntity | null>;
    findMany: (args: { where?: TWhereInput; include?: unknown; orderBy?: TOrderBy; skip?: number; take?: number }) => Promise<TEntity[]>;
    create: (args: { data: TCreateInput; include?: unknown }) => Promise<TEntity>;
    update: (args: { where: TWhereUnique; data: TUpdateInput; include?: unknown }) => Promise<TEntity>;
    delete: (args: { where: TWhereUnique }) => Promise<TEntity>;
    count: (args: { where?: TWhereInput }) => Promise<number>;
  };

  /**
   * Find entity by unique identifier
   */
  async findById(
    id: string,
    options?: FindOptions<TOrderBy>
  ): Promise<Result<TEntity>> {
    return withDatabase(async () => {
      const where = this.buildUniqueWhere(id);
      const entity = await this.getDelegate().findUnique({ where });

      if (!entity) {
        return failure(new NotFoundError(this.entityName, id));
      }

      if (!options?.includeDeleted && this.hasDeletedAt(entity) && entity.deletedAt) {
        return failure(new NotFoundError(this.entityName, id));
      }

      return success(entity);
    }, `${this.entityName}.findById`);
  }

  /**
   * Find first entity matching criteria
   */
  async findFirst(
    where: TWhereInput,
    options?: FindOptions<TOrderBy>
  ): Promise<Result<TEntity | null>> {
    return withDatabase(async () => {
      const whereClause = options?.includeDeleted
        ? where
        : this.addDeletedFilter(where);

      const entity = await this.getDelegate().findFirst({
        where: whereClause,
        orderBy: options?.orderBy,
      });

      return success(entity);
    }, `${this.entityName}.findFirst`);
  }

  /**
   * Find all entities matching criteria
   */
  async findMany(
    where?: TWhereInput,
    options?: FindManyOptions<TOrderBy>
  ): Promise<Result<TEntity[]>> {
    return withDatabase(async () => {
      const whereClause = where
        ? options?.includeDeleted
          ? where
          : this.addDeletedFilter(where)
        : undefined;

      const { skip, take } = options?.pagination
        ? paginationToSkipTake(options.pagination)
        : { skip: undefined, take: undefined };

      const entities = await this.getDelegate().findMany({
        where: whereClause,
        orderBy: options?.orderBy,
        skip,
        take,
      });

      return success(entities);
    }, `${this.entityName}.findMany`);
  }

  /**
   * Find all entities with pagination
   */
  async findManyPaginated(
    where: TWhereInput | undefined,
    pagination: PaginationParams,
    options?: FindOptions<TOrderBy>
  ): Promise<Result<PaginatedResult<TEntity>>> {
    return withDatabase(async () => {
      const whereClause = where
        ? options?.includeDeleted
          ? where
          : this.addDeletedFilter(where)
        : undefined;

      const { skip, take } = paginationToSkipTake(pagination);
      const orderBy = options?.orderBy || buildOrderBy(pagination.sortBy, pagination.sortOrder);

      const [entities, total] = await Promise.all([
        this.getDelegate().findMany({
          where: whereClause,
          orderBy,
          skip,
          take,
        }),
        this.getDelegate().count({ where: whereClause }),
      ]);

      const totalPages = Math.ceil(total / pagination.limit);

      return success({
        data: entities,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages,
          hasMore: pagination.page < totalPages,
        },
      });
    }, `${this.entityName}.findManyPaginated`);
  }

  /**
   * Create a new entity
   */
  async create(
    data: TCreateInput,
    tx?: TransactionClient
  ): Promise<Result<TEntity>> {
    return withDatabase(async () => {
      const entity = await this.getDelegate(tx).create({ data });
      return success(entity);
    }, `${this.entityName}.create`);
  }

  /**
   * Update an existing entity
   */
  async update(
    id: string,
    data: TUpdateInput,
    tx?: TransactionClient
  ): Promise<Result<TEntity>> {
    return withDatabase(async () => {
      // Verify entity exists
      const existing = await this.findById(id);
      if (!existing.success) {
        return existing;
      }

      const where = this.buildUniqueWhere(id);
      const entity = await this.getDelegate(tx).update({ where, data });
      return success(entity);
    }, `${this.entityName}.update`);
  }

  /**
   * Soft delete an entity
   */
  async softDelete(
    id: string,
    tx?: TransactionClient
  ): Promise<Result<TEntity>> {
    return this.update(id, softDeleteData() as unknown as TUpdateInput, tx);
  }

  /**
   * Hard delete an entity
   */
  async hardDelete(
    id: string,
    tx?: TransactionClient
  ): Promise<Result<TEntity>> {
    return withDatabase(async () => {
      const where = this.buildUniqueWhere(id);
      const entity = await this.getDelegate(tx).delete({ where });
      return success(entity);
    }, `${this.entityName}.hardDelete`);
  }

  /**
   * Count entities matching criteria
   */
  async count(
    where?: TWhereInput,
    options?: { includeDeleted?: boolean }
  ): Promise<Result<number>> {
    return withDatabase(async () => {
      const whereClause = where
        ? options?.includeDeleted
          ? where
          : this.addDeletedFilter(where)
        : undefined;

      const count = await this.getDelegate().count({ where: whereClause });
      return success(count);
    }, `${this.entityName}.count`);
  }

  /**
   * Check if entity exists
   */
  async exists(id: string): Promise<boolean> {
    const result = await this.findById(id);
    return result.success;
  }

  /**
   * Execute operations in a transaction
   */
  protected async transaction<T>(
    operation: (tx: TransactionClient) => Promise<T>
  ): Promise<T> {
    return withTransaction(operation);
  }

  // ==========================================================================
  // ABSTRACT/PROTECTED METHODS
  // ==========================================================================

  /**
   * Build unique where clause from ID
   */
  protected abstract buildUniqueWhere(id: string): TWhereUnique;

  /**
   * Add soft delete filter to where clause
   */
  protected addDeletedFilter(where: TWhereInput): TWhereInput {
    return { ...where, deletedAt: null } as TWhereInput;
  }

  /**
   * Check if entity has deletedAt field
   */
  protected hasDeletedAt(entity: TEntity): entity is TEntity & { deletedAt: Date | null } {
    return 'deletedAt' in entity;
  }
}

// =============================================================================
// TENANT-SCOPED REPOSITORY
// =============================================================================

export abstract class TenantScopedRepository<
  TEntity extends TenantEntity,
  TCreateInput,
  TUpdateInput,
  TWhereUnique,
  TWhereInput,
  TOrderBy = Record<string, 'asc' | 'desc'>
> extends BaseRepository<
  TEntity,
  TCreateInput,
  TUpdateInput,
  TWhereUnique,
  TWhereInput,
  TOrderBy
> {
  /**
   * Find entity by ID within tenant scope
   */
  async findByIdInTenant(
    tenantId: string,
    id: string,
    options?: FindOptions<TOrderBy>
  ): Promise<Result<TEntity>> {
    const result = await this.findById(id, options);
    
    if (result.success && result.data.tenantId !== tenantId) {
      return failure(new NotFoundError(this.entityName, id));
    }
    
    return result;
  }

  /**
   * Find all entities for a tenant
   */
  async findByTenant(
    tenantId: string,
    where?: Omit<TWhereInput, 'tenantId'>,
    options?: FindManyOptions<TOrderBy>
  ): Promise<Result<TEntity[]>> {
    const whereWithTenant = {
      ...where,
      tenantId,
    } as TWhereInput;

    return this.findMany(whereWithTenant, options);
  }

  /**
   * Find all entities for a tenant with pagination
   */
  async findByTenantPaginated(
    tenantId: string,
    pagination: PaginationParams,
    where?: Omit<TWhereInput, 'tenantId'>,
    options?: FindOptions<TOrderBy>
  ): Promise<Result<PaginatedResult<TEntity>>> {
    const whereWithTenant = {
      ...where,
      tenantId,
    } as TWhereInput;

    return this.findManyPaginated(whereWithTenant, pagination, options);
  }

  /**
   * Create entity with tenant scope
   */
  async createInTenant(
    tenantId: string,
    data: Omit<TCreateInput, 'tenantId'>,
    tx?: TransactionClient
  ): Promise<Result<TEntity>> {
    const dataWithTenant = {
      ...data,
      tenantId,
    } as TCreateInput;

    return this.create(dataWithTenant, tx);
  }

  /**
   * Update entity within tenant scope
   */
  async updateInTenant(
    tenantId: string,
    id: string,
    data: TUpdateInput,
    tx?: TransactionClient
  ): Promise<Result<TEntity>> {
    // Verify entity belongs to tenant
    const existing = await this.findByIdInTenant(tenantId, id);
    if (!existing.success) {
      return existing;
    }

    return this.update(id, data, tx);
  }

  /**
   * Soft delete entity within tenant scope
   */
  async softDeleteInTenant(
    tenantId: string,
    id: string,
    tx?: TransactionClient
  ): Promise<Result<TEntity>> {
    // Verify entity belongs to tenant
    const existing = await this.findByIdInTenant(tenantId, id);
    if (!existing.success) {
      return existing;
    }

    return this.softDelete(id, tx);
  }

  /**
   * Count entities for a tenant
   */
  async countInTenant(
    tenantId: string,
    where?: Omit<TWhereInput, 'tenantId'>,
    options?: { includeDeleted?: boolean }
  ): Promise<Result<number>> {
    const whereWithTenant = {
      ...where,
      tenantId,
    } as TWhereInput;

    return this.count(whereWithTenant, options);
  }
}
