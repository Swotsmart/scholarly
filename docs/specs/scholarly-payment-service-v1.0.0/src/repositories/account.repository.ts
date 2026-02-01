/**
 * Financial Account Repository
 * 
 * Data access layer for financial accounts. Handles all database operations
 * for accounts including creation, updates, and complex queries.
 * 
 * The repository pattern serves as an abstraction over the database,
 * allowing the service layer to work with domain objects without knowing
 * the details of how they're stored. Think of it as a translator between
 * the language of business logic and the language of SQL.
 * 
 * @module ScholarlyPayment/Repositories
 * @version 1.0.0
 */

import { PoolClient } from 'pg';
import {
  FinancialAccount,
  AccountOwnerType,
  AccountStatus,
  AccountVerificationLevel,
  Currency,
  LegalEntityDetails,
  AccountBalances,
  StripeConnectDetails,
  XeroIntegrationDetails,
  PayoutMethodDetails,
  AccountSettings,
  AccountStatistics,
  KYCStatus,
  AuditInfo,
  Result,
  success,
  failure,
  NotFoundError,
  ValidationError
} from '../types';

import {
  getPool,
  withTransaction,
  logger,
  generateId
} from '../infrastructure';

// ============================================================================
// REPOSITORY INTERFACE
// ============================================================================

export interface AccountFilters {
  tenantId?: string;
  ownerType?: AccountOwnerType[];
  status?: AccountStatus[];
  verificationLevel?: AccountVerificationLevel[];
  stripeConnected?: boolean;
  xeroConnected?: boolean;
  hasBalance?: boolean;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: 'createdAt' | 'updatedAt' | 'ownerName' | 'balance';
  orderDirection?: 'asc' | 'desc';
}

export interface FinancialAccountRepository {
  // Core CRUD
  findById(id: string): Promise<FinancialAccount | null>;
  findByTenantAndOwner(tenantId: string, ownerId: string): Promise<FinancialAccount | null>;
  findByStripeAccountId(stripeAccountId: string): Promise<FinancialAccount | null>;
  findAll(filters: AccountFilters): Promise<{ accounts: FinancialAccount[]; total: number }>;
  create(account: Omit<FinancialAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<FinancialAccount>;
  update(id: string, updates: Partial<FinancialAccount>): Promise<FinancialAccount>;
  delete(id: string): Promise<void>;
  
  // Balance operations
  updateBalances(id: string, balances: Partial<AccountBalances>): Promise<AccountBalances>;
  addToBalance(id: string, field: 'available' | 'pending' | 'reserved' | 'tokenBalance', amount: number): Promise<AccountBalances>;
  transferBalance(id: string, from: 'pending' | 'reserved', to: 'available', amount: number): Promise<AccountBalances>;
  
  // Stripe operations
  updateStripeConnect(id: string, details: Partial<StripeConnectDetails>): Promise<void>;
  
  // Xero operations
  updateXeroIntegration(id: string, details: XeroIntegrationDetails | null): Promise<void>;
  
  // Statistics
  updateStatistics(id: string, stats: Partial<AccountStatistics>): Promise<void>;
  incrementStatistic(id: string, field: keyof AccountStatistics, amount?: number): Promise<void>;
}

// ============================================================================
// REPOSITORY IMPLEMENTATION
// ============================================================================

export class PostgresFinancialAccountRepository implements FinancialAccountRepository {
  
  /**
   * Find account by ID
   */
  async findById(id: string): Promise<FinancialAccount | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM financial_accounts WHERE id = $1`,
      [id]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToAccount(result.rows[0]);
  }

  /**
   * Find account by tenant and owner
   */
  async findByTenantAndOwner(tenantId: string, ownerId: string): Promise<FinancialAccount | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM financial_accounts WHERE tenant_id = $1 AND owner_id = $2`,
      [tenantId, ownerId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToAccount(result.rows[0]);
  }

  /**
   * Find account by Stripe account ID
   */
  async findByStripeAccountId(stripeAccountId: string): Promise<FinancialAccount | null> {
    const pool = getPool();
    const result = await pool.query(
      `SELECT * FROM financial_accounts WHERE stripe_connect->>'accountId' = $1`,
      [stripeAccountId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToAccount(result.rows[0]);
  }

  /**
   * Find all accounts with filters
   */
  async findAll(filters: AccountFilters): Promise<{ accounts: FinancialAccount[]; total: number }> {
    const pool = getPool();
    const conditions: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    // Build WHERE conditions
    if (filters.tenantId) {
      conditions.push(`tenant_id = $${paramIndex++}`);
      params.push(filters.tenantId);
    }

    if (filters.ownerType && filters.ownerType.length > 0) {
      conditions.push(`owner_type = ANY($${paramIndex++})`);
      params.push(filters.ownerType);
    }

    if (filters.status && filters.status.length > 0) {
      conditions.push(`status = ANY($${paramIndex++})`);
      params.push(filters.status);
    }

    if (filters.verificationLevel && filters.verificationLevel.length > 0) {
      conditions.push(`verification_level = ANY($${paramIndex++})`);
      params.push(filters.verificationLevel);
    }

    if (filters.stripeConnected !== undefined) {
      if (filters.stripeConnected) {
        conditions.push(`stripe_connect->>'accountId' IS NOT NULL`);
      } else {
        conditions.push(`stripe_connect->>'accountId' IS NULL`);
      }
    }

    if (filters.xeroConnected !== undefined) {
      if (filters.xeroConnected) {
        conditions.push(`xero_integration IS NOT NULL`);
      } else {
        conditions.push(`xero_integration IS NULL`);
      }
    }

    if (filters.hasBalance !== undefined) {
      if (filters.hasBalance) {
        conditions.push(`(balances->>'available')::int > 0`);
      } else {
        conditions.push(`(balances->>'available')::int = 0`);
      }
    }

    if (filters.search) {
      conditions.push(`(owner_name ILIKE $${paramIndex++} OR owner_email ILIKE $${paramIndex++})`);
      const searchTerm = `%${filters.search}%`;
      params.push(searchTerm, searchTerm);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Order by
    const orderByMap: Record<string, string> = {
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      ownerName: 'owner_name',
      balance: `(balances->>'available')::int`
    };
    const orderBy = orderByMap[filters.orderBy || 'createdAt'] || 'created_at';
    const orderDirection = filters.orderDirection === 'asc' ? 'ASC' : 'DESC';

    // Get total count
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM financial_accounts ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].total);

    // Get accounts with pagination
    const limit = Math.min(filters.limit || 50, 100);
    const offset = filters.offset || 0;

    const result = await pool.query(
      `SELECT * FROM financial_accounts ${whereClause}
       ORDER BY ${orderBy} ${orderDirection}
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...params, limit, offset]
    );

    const accounts = result.rows.map(row => this.mapRowToAccount(row));

    return { accounts, total };
  }

  /**
   * Create a new account
   */
  async create(
    account: Omit<FinancialAccount, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<FinancialAccount> {
    const pool = getPool();
    const id = generateId('acc');
    const now = new Date();

    const result = await pool.query(
      `INSERT INTO financial_accounts (
        id, tenant_id, owner_type, owner_id, owner_name, owner_email,
        legal_entity, balances, stripe_connect, xero_integration,
        payout_method, settings, stats, status, status_reason, status_changed_at,
        verification_level, kyc_status, audit, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21
      ) RETURNING *`,
      [
        id,
        account.tenantId,
        account.ownerType,
        account.ownerId,
        account.ownerName,
        account.ownerEmail,
        JSON.stringify(account.legalEntity),
        JSON.stringify(account.balances),
        JSON.stringify(account.stripeConnect),
        account.xeroIntegration ? JSON.stringify(account.xeroIntegration) : null,
        account.payoutMethod ? JSON.stringify(account.payoutMethod) : null,
        JSON.stringify(account.settings),
        JSON.stringify(account.stats),
        account.status,
        account.statusReason,
        account.statusChangedAt,
        account.verificationLevel,
        JSON.stringify(account.kycStatus),
        JSON.stringify({ ...account.audit, createdAt: now, updatedAt: now }),
        now,
        now
      ]
    );

    logger.info('Financial account created', { 
      accountId: id, 
      tenantId: account.tenantId,
      ownerType: account.ownerType 
    });

    return this.mapRowToAccount(result.rows[0]);
  }

  /**
   * Update an account
   */
  async update(id: string, updates: Partial<FinancialAccount>): Promise<FinancialAccount> {
    const pool = getPool();
    const now = new Date();

    // Build update fields
    const fields: string[] = ['updated_at = $2'];
    const params: any[] = [id, now];
    let paramIndex = 3;

    const fieldMap: Record<string, string> = {
      ownerName: 'owner_name',
      ownerEmail: 'owner_email',
      status: 'status',
      statusReason: 'status_reason',
      statusChangedAt: 'status_changed_at',
      verificationLevel: 'verification_level'
    };

    const jsonFields = ['legalEntity', 'balances', 'stripeConnect', 'xeroIntegration', 
                        'payoutMethod', 'settings', 'stats', 'kycStatus', 'audit'];

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined) continue;

      if (fieldMap[key]) {
        fields.push(`${fieldMap[key]} = $${paramIndex++}`);
        params.push(value);
      } else if (jsonFields.includes(key)) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramIndex++}`);
        params.push(value ? JSON.stringify(value) : null);
      }
    }

    const result = await pool.query(
      `UPDATE financial_accounts SET ${fields.join(', ')} WHERE id = $1 RETURNING *`,
      params
    );

    if (result.rows.length === 0) {
      throw new NotFoundError('FinancialAccount', id);
    }

    logger.info('Financial account updated', { accountId: id, fields: Object.keys(updates) });

    return this.mapRowToAccount(result.rows[0]);
  }

  /**
   * Delete an account (soft delete via status change)
   */
  async delete(id: string): Promise<void> {
    const pool = getPool();
    const now = new Date();

    const result = await pool.query(
      `UPDATE financial_accounts 
       SET status = 'closed', status_reason = 'Deleted', status_changed_at = $2, updated_at = $2
       WHERE id = $1`,
      [id, now]
    );

    if (result.rowCount === 0) {
      throw new NotFoundError('FinancialAccount', id);
    }

    logger.info('Financial account deleted', { accountId: id });
  }

  /**
   * Update account balances
   */
  async updateBalances(id: string, balances: Partial<AccountBalances>): Promise<AccountBalances> {
    const pool = getPool();
    const now = new Date();

    // Merge with existing balances
    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('FinancialAccount', id);
    }

    const newBalances: AccountBalances = {
      ...existing.balances,
      ...balances,
      lastUpdatedAt: now
    };

    await pool.query(
      `UPDATE financial_accounts SET balances = $1, updated_at = $2 WHERE id = $3`,
      [JSON.stringify(newBalances), now, id]
    );

    logger.debug('Account balances updated', { accountId: id, balances: newBalances });

    return newBalances;
  }

  /**
   * Add to a specific balance field
   */
  async addToBalance(
    id: string, 
    field: 'available' | 'pending' | 'reserved' | 'tokenBalance', 
    amount: number
  ): Promise<AccountBalances> {
    return withTransaction(async (client) => {
      const now = new Date();

      // Lock the row for update
      const result = await client.query(
        `SELECT balances FROM financial_accounts WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('FinancialAccount', id);
      }

      const currentBalances = result.rows[0].balances as AccountBalances;
      const newAmount = currentBalances[field] + amount;

      if (newAmount < 0) {
        throw new ValidationError(`Insufficient ${field} balance`, field);
      }

      const newBalances: AccountBalances = {
        ...currentBalances,
        [field]: newAmount,
        lastUpdatedAt: now
      };

      await client.query(
        `UPDATE financial_accounts SET balances = $1, updated_at = $2 WHERE id = $3`,
        [JSON.stringify(newBalances), now, id]
      );

      logger.debug('Balance adjusted', { accountId: id, field, amount, newAmount });

      return newBalances;
    });
  }

  /**
   * Transfer between balance fields
   */
  async transferBalance(
    id: string, 
    from: 'pending' | 'reserved', 
    to: 'available', 
    amount: number
  ): Promise<AccountBalances> {
    return withTransaction(async (client) => {
      const now = new Date();

      const result = await client.query(
        `SELECT balances FROM financial_accounts WHERE id = $1 FOR UPDATE`,
        [id]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('FinancialAccount', id);
      }

      const currentBalances = result.rows[0].balances as AccountBalances;

      if (currentBalances[from] < amount) {
        throw new ValidationError(`Insufficient ${from} balance for transfer`, from);
      }

      const newBalances: AccountBalances = {
        ...currentBalances,
        [from]: currentBalances[from] - amount,
        [to]: currentBalances[to] + amount,
        lastUpdatedAt: now
      };

      await client.query(
        `UPDATE financial_accounts SET balances = $1, updated_at = $2 WHERE id = $3`,
        [JSON.stringify(newBalances), now, id]
      );

      logger.debug('Balance transferred', { accountId: id, from, to, amount });

      return newBalances;
    });
  }

  /**
   * Update Stripe Connect details
   */
  async updateStripeConnect(id: string, details: Partial<StripeConnectDetails>): Promise<void> {
    const pool = getPool();
    const now = new Date();

    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('FinancialAccount', id);
    }

    const newDetails: StripeConnectDetails = {
      ...existing.stripeConnect,
      ...details
    };

    await pool.query(
      `UPDATE financial_accounts SET stripe_connect = $1, updated_at = $2 WHERE id = $3`,
      [JSON.stringify(newDetails), now, id]
    );

    logger.info('Stripe Connect updated', { accountId: id });
  }

  /**
   * Update Xero integration
   */
  async updateXeroIntegration(id: string, details: XeroIntegrationDetails | null): Promise<void> {
    const pool = getPool();
    const now = new Date();

    await pool.query(
      `UPDATE financial_accounts SET xero_integration = $1, updated_at = $2 WHERE id = $3`,
      [details ? JSON.stringify(details) : null, now, id]
    );

    logger.info('Xero integration updated', { accountId: id, connected: details !== null });
  }

  /**
   * Update statistics
   */
  async updateStatistics(id: string, stats: Partial<AccountStatistics>): Promise<void> {
    const pool = getPool();
    const now = new Date();

    const existing = await this.findById(id);
    if (!existing) {
      throw new NotFoundError('FinancialAccount', id);
    }

    const newStats: AccountStatistics = {
      ...existing.stats,
      ...stats
    };

    await pool.query(
      `UPDATE financial_accounts SET stats = $1, updated_at = $2 WHERE id = $3`,
      [JSON.stringify(newStats), now, id]
    );
  }

  /**
   * Increment a statistic
   */
  async incrementStatistic(id: string, field: keyof AccountStatistics, amount: number = 1): Promise<void> {
    const pool = getPool();
    const now = new Date();

    // Use JSON path update for atomic increment
    await pool.query(
      `UPDATE financial_accounts 
       SET stats = jsonb_set(
         stats::jsonb, 
         $1, 
         (COALESCE((stats->>$2)::numeric, 0) + $3)::text::jsonb
       ),
       updated_at = $4
       WHERE id = $5`,
      [`{${field}}`, field, amount, now, id]
    );
  }

  // =========================================================================
  // PRIVATE METHODS
  // =========================================================================

  /**
   * Map database row to FinancialAccount
   */
  private mapRowToAccount(row: any): FinancialAccount {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      ownerType: row.owner_type,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      legalEntity: row.legal_entity as LegalEntityDetails,
      balances: row.balances as AccountBalances,
      stripeConnect: row.stripe_connect as StripeConnectDetails,
      xeroIntegration: row.xero_integration as XeroIntegrationDetails | null,
      payoutMethod: row.payout_method as PayoutMethodDetails | null,
      settings: row.settings as AccountSettings,
      stats: row.stats as AccountStatistics,
      status: row.status,
      statusReason: row.status_reason,
      statusChangedAt: row.status_changed_at,
      verificationLevel: row.verification_level,
      kycStatus: row.kyc_status as KYCStatus,
      audit: row.audit as AuditInfo
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let repository: FinancialAccountRepository | null = null;

export function getFinancialAccountRepository(): FinancialAccountRepository {
  if (!repository) {
    repository = new PostgresFinancialAccountRepository();
  }
  return repository;
}

export function setFinancialAccountRepository(repo: FinancialAccountRepository): void {
  repository = repo;
}
