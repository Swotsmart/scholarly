'use strict';

// =============================================================================
// ADMIN PUSH SERVICE
// =============================================================================
// The server-side backbone for institutional menu pushes. Think of this as the
// school PA system for navigation — when the principal says "everyone needs
// the new attendance app in their toolbar," this service makes it happen.
//
// Specification references:
//   Section 5   — Institutional Push Mechanism (rules & constraints)
//   Section 5.2 — Admin Push UI (preview & confirmation)
//   Section 15  — Push rules summary (max 3, requires reason, audit trail)
//   Section 17.2 — MenuPushRecord Prisma model
//
// Key rules (from spec):
//   1. Push targets ROLES, not individuals
//   2. Pushed items cannot be removed by the user (lock icon)
//   3. Every push requires a reason (shown in tooltip)
//   4. Optional expiry date (transitions to ACTIVE after expiry)
//   5. Maximum 3 concurrent pushes per role per institution
//   6. Full audit trail: every push & revocation logged with admin ID
//
// Architecture:
//   This service follows the ScholarlyBaseService pattern:
//   - Result<T> for explicit error handling
//   - Repository pattern abstraction for data access
//   - Multi-tenant isolation via institutionId
//   - Event-driven notifications via NATS
// =============================================================================

// =============================================================================
// TYPES — Prisma model equivalents as TypeScript interfaces
// =============================================================================

/**
 * Represents the valid roles that can receive pushed menu items.
 * Matches the role set from the task taxonomy (Part 2 of the spec).
 */
export type PushableRole =
  | 'teacher'
  | 'parent'
  | 'learner'
  | 'admin'
  | 'tutor'
  | 'homeschool'
  | 'creator';

/**
 * The lifecycle states a push record can be in.
 *
 * ACTIVE:   Currently enforced. Users see the locked menu item.
 * EXPIRED:  Past its expiry date. Item transitions to user's ACTIVE state.
 * REVOKED:  Manually removed by an admin before expiry.
 */
export type PushStatus = 'active' | 'expired' | 'revoked';

/**
 * Maps to the MenuPushRecord Prisma model (Section 17.2).
 *
 * This record is NEVER deleted — revocation sets revokedAt and revokedBy
 * rather than removing the row. The full history enables compliance
 * auditing and institutional accountability.
 */
export interface MenuPushRecord {
  /** Unique identifier for this push record. */
  id: string;

  /** The institution (school/organisation) that issued the push. */
  institutionId: string;

  /** The role receiving the pushed item (e.g., 'teacher', 'parent'). */
  targetRole: PushableRole;

  /** The task reference from the taxonomy (e.g., 'T1', 'D2'). */
  taskRef: string;

  /** The admin user who created this push. */
  pushedBy: string;

  /** Human-readable reason shown to users in the lock icon tooltip. */
  reason: string;

  /** Current status of the push. */
  status: PushStatus;

  /** Optional expiry date. Null means the push persists until manually revoked. */
  expiresAt: string | null;

  /** When this push was created. */
  createdAt: string;

  /** When this push was revoked (null if still active or expired). */
  revokedAt: string | null;

  /** The admin who revoked this push (null if not revoked). */
  revokedBy: string | null;

  /** Optional reason for revocation (for audit trail completeness). */
  revocationReason: string | null;
}

/**
 * Input for creating a new push. The service fills in id, status,
 * createdAt, and the revocation fields.
 */
export interface CreatePushInput {
  institutionId: string;
  targetRole: PushableRole;
  taskRef: string;
  pushedBy: string;
  reason: string;
  expiresAt?: string | null;
}

/**
 * Input for revoking an existing push.
 */
export interface RevokePushInput {
  pushId: string;
  revokedBy: string;
  revocationReason?: string;
}

/**
 * Preview data returned before confirming a push. Shows the admin
 * what will happen so they can make an informed decision.
 */
export interface PushPreview {
  /** The task being pushed. */
  taskRef: string;

  /** Human-readable task label from the registry. */
  taskLabel: string;

  /** The target role. */
  targetRole: PushableRole;

  /** How many users in this institution have this role. */
  affectedUserCount: number;

  /** Current active pushes for this role (before this one). */
  currentPushCount: number;

  /** Whether this push would exceed the 3-push limit. */
  wouldExceedLimit: boolean;

  /** Whether this task is already pushed to this role. */
  alreadyPushed: boolean;
}

// =============================================================================
// RESULT TYPE — explicit error handling
// =============================================================================

export type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: PushErrorCode };

export type PushErrorCode =
  | 'PUSH_LIMIT_EXCEEDED'
  | 'ALREADY_PUSHED'
  | 'PUSH_NOT_FOUND'
  | 'PUSH_ALREADY_REVOKED'
  | 'PUSH_ALREADY_EXPIRED'
  | 'INVALID_ROLE'
  | 'INVALID_TASK_REF'
  | 'MISSING_REASON'
  | 'INVALID_EXPIRY'
  | 'UNAUTHORIZED'
  | 'INSTITUTION_NOT_FOUND'
  | 'INTERNAL_ERROR';

// =============================================================================
// CONSTANTS
// =============================================================================

/**
 * Maximum concurrent active pushes per role per institution.
 * From spec Section 15: "Maximum 3 per role — Prevents recreating
 * the static sidebar via pushes."
 */
const MAX_PUSHES_PER_ROLE = 3;

/** Minimum reason length to ensure meaningful explanations. */
const MIN_REASON_LENGTH = 10;

/** Maximum reason length for UI display constraints. */
const MAX_REASON_LENGTH = 200;

/** Valid roles from the task taxonomy. */
const VALID_ROLES: ReadonlySet<string> = new Set<string>([
  'teacher', 'parent', 'learner', 'admin',
  'tutor', 'homeschool', 'creator',
]);

// =============================================================================
// REPOSITORY INTERFACE — abstraction over Prisma
// =============================================================================

/**
 * Repository interface for MenuPushRecord persistence.
 * Implementations can target Prisma (production), in-memory (testing),
 * or any other data layer without changing the service logic.
 */
export interface PushRepository {
  /** Create a new push record. */
  create(record: MenuPushRecord): Promise<MenuPushRecord>;

  /** Find a push by its ID. */
  findById(id: string): Promise<MenuPushRecord | null>;

  /** Find all active pushes for a role within an institution. */
  findActiveByRole(
    institutionId: string,
    targetRole: PushableRole,
  ): Promise<MenuPushRecord[]>;

  /** Find all active pushes across all roles for an institution. */
  findActiveByInstitution(institutionId: string): Promise<MenuPushRecord[]>;

  /** Find pushes that have passed their expiry date but are still 'active'. */
  findExpired(): Promise<MenuPushRecord[]>;

  /** Update a push record (for revocation or expiry). */
  update(id: string, data: Partial<MenuPushRecord>): Promise<MenuPushRecord>;

  /** Get the count of users with a given role in an institution. */
  countUsersInRole(
    institutionId: string,
    role: PushableRole,
  ): Promise<number>;

  /** Get the full audit history for an institution (active + revoked + expired). */
  findAuditHistory(
    institutionId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ records: MenuPushRecord[]; total: number }>;
}

// =============================================================================
// EVENT TYPES — for NATS-based notification
// =============================================================================

export interface PushCreatedEvent {
  type: 'menu.push.created';
  institutionId: string;
  targetRole: PushableRole;
  taskRef: string;
  reason: string;
  pushedBy: string;
  pushId: string;
  expiresAt: string | null;
  timestamp: string;
}

export interface PushRevokedEvent {
  type: 'menu.push.revoked';
  institutionId: string;
  targetRole: PushableRole;
  taskRef: string;
  revokedBy: string;
  pushId: string;
  timestamp: string;
}

export interface PushExpiredEvent {
  type: 'menu.push.expired';
  institutionId: string;
  targetRole: PushableRole;
  taskRef: string;
  pushId: string;
  timestamp: string;
}

export type PushEvent = PushCreatedEvent | PushRevokedEvent | PushExpiredEvent;

/**
 * Event emitter interface. In production, this publishes to NATS.
 * In tests, it can be a simple array collector.
 */
export interface PushEventEmitter {
  emit(event: PushEvent): Promise<void>;
}

// =============================================================================
// ADMIN PUSH SERVICE
// =============================================================================

export class AdminPushService {
  constructor(
    private readonly repository: PushRepository,
    private readonly eventEmitter: PushEventEmitter,
    private readonly generateId: () => string = () =>
      `push_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
  ) {}

  // ── CREATE PUSH ──────────────────────────────────────────────────────

  /**
   * Creates a new institutional push. This is the primary action an admin
   * takes: "Make sure all teachers see Attendance in their menu."
   *
   * The method validates all constraints before creating the record:
   * - Role must be valid
   * - Task ref must be a non-empty string
   * - Reason must be 10–200 characters
   * - Expiry (if provided) must be in the future
   * - Must not exceed 3 active pushes for this role
   * - Must not duplicate an existing active push for this task+role
   */
  async createPush(input: CreatePushInput): Promise<Result<MenuPushRecord>> {
    // ── Input validation ──

    if (!input.institutionId?.trim()) {
      return { success: false, error: 'Institution ID is required.', code: 'INSTITUTION_NOT_FOUND' };
    }

    if (!input.pushedBy?.trim()) {
      return { success: false, error: 'Admin user ID is required.', code: 'UNAUTHORIZED' };
    }

    if (!VALID_ROLES.has(input.targetRole)) {
      return {
        success: false,
        error: `Invalid role "${input.targetRole}". Valid roles: ${[...VALID_ROLES].join(', ')}.`,
        code: 'INVALID_ROLE',
      };
    }

    if (!input.taskRef?.trim()) {
      return { success: false, error: 'Task reference is required.', code: 'INVALID_TASK_REF' };
    }

    const reasonTrimmed = input.reason?.trim() ?? '';
    if (reasonTrimmed.length < MIN_REASON_LENGTH) {
      return {
        success: false,
        error: `Reason must be at least ${MIN_REASON_LENGTH} characters. Please provide a meaningful explanation for users.`,
        code: 'MISSING_REASON',
      };
    }

    if (reasonTrimmed.length > MAX_REASON_LENGTH) {
      return {
        success: false,
        error: `Reason must be at most ${MAX_REASON_LENGTH} characters.`,
        code: 'MISSING_REASON',
      };
    }

    if (input.expiresAt) {
      const expiryDate = new Date(input.expiresAt);
      if (isNaN(expiryDate.getTime())) {
        return { success: false, error: 'Expiry date is not a valid ISO timestamp.', code: 'INVALID_EXPIRY' };
      }
      if (expiryDate.getTime() <= Date.now()) {
        return { success: false, error: 'Expiry date must be in the future.', code: 'INVALID_EXPIRY' };
      }
    }

    // ── Business rule checks ──

    try {
      const activePushes = await this.repository.findActiveByRole(
        input.institutionId,
        input.targetRole,
      );

      // Rule: Maximum 3 concurrent pushes per role (Section 15)
      if (activePushes.length >= MAX_PUSHES_PER_ROLE) {
        return {
          success: false,
          error: `This role already has ${MAX_PUSHES_PER_ROLE} active pushes. `
            + `Revoke an existing push before adding a new one. `
            + `Current pushes: ${activePushes.map(p => p.taskRef).join(', ')}.`,
          code: 'PUSH_LIMIT_EXCEEDED',
        };
      }

      // Rule: No duplicate pushes for the same task+role
      const duplicate = activePushes.find(p => p.taskRef === input.taskRef);
      if (duplicate) {
        return {
          success: false,
          error: `"${input.taskRef}" is already pushed to ${input.targetRole} `
            + `(pushed by ${duplicate.pushedBy} on ${new Date(duplicate.createdAt).toLocaleDateString()}).`,
          code: 'ALREADY_PUSHED',
        };
      }

      // ── Create the record ──

      const now = new Date().toISOString();
      const record: MenuPushRecord = {
        id: this.generateId(),
        institutionId: input.institutionId,
        targetRole: input.targetRole,
        taskRef: input.taskRef,
        pushedBy: input.pushedBy,
        reason: reasonTrimmed,
        status: 'active',
        expiresAt: input.expiresAt ?? null,
        createdAt: now,
        revokedAt: null,
        revokedBy: null,
        revocationReason: null,
      };

      const created = await this.repository.create(record);

      // ── Emit event for real-time client sync ──

      await this.eventEmitter.emit({
        type: 'menu.push.created',
        institutionId: input.institutionId,
        targetRole: input.targetRole,
        taskRef: input.taskRef,
        reason: reasonTrimmed,
        pushedBy: input.pushedBy,
        pushId: created.id,
        expiresAt: input.expiresAt ?? null,
        timestamp: now,
      });

      return { success: true, data: created };
    } catch (err) {
      return {
        success: false,
        error: `Failed to create push: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  // ── REVOKE PUSH ──────────────────────────────────────────────────────

  /**
   * Revokes an existing push. The record is NOT deleted — it transitions
   * to 'revoked' status with full audit metadata. Think of it as
   * striking through a line in a ledger rather than erasing it.
   */
  async revokePush(input: RevokePushInput): Promise<Result<MenuPushRecord>> {
    if (!input.pushId?.trim()) {
      return { success: false, error: 'Push ID is required.', code: 'PUSH_NOT_FOUND' };
    }

    if (!input.revokedBy?.trim()) {
      return { success: false, error: 'Revoking admin user ID is required.', code: 'UNAUTHORIZED' };
    }

    try {
      const existing = await this.repository.findById(input.pushId);

      if (!existing) {
        return { success: false, error: `Push "${input.pushId}" not found.`, code: 'PUSH_NOT_FOUND' };
      }

      if (existing.status === 'revoked') {
        return {
          success: false,
          error: `Push "${input.pushId}" was already revoked on ${existing.revokedAt} by ${existing.revokedBy}.`,
          code: 'PUSH_ALREADY_REVOKED',
        };
      }

      if (existing.status === 'expired') {
        return {
          success: false,
          error: `Push "${input.pushId}" has already expired. No revocation needed.`,
          code: 'PUSH_ALREADY_EXPIRED',
        };
      }

      const now = new Date().toISOString();
      const updated = await this.repository.update(input.pushId, {
        status: 'revoked',
        revokedAt: now,
        revokedBy: input.revokedBy,
        revocationReason: input.revocationReason?.trim() || null,
      });

      await this.eventEmitter.emit({
        type: 'menu.push.revoked',
        institutionId: existing.institutionId,
        targetRole: existing.targetRole,
        taskRef: existing.taskRef,
        revokedBy: input.revokedBy,
        pushId: input.pushId,
        timestamp: now,
      });

      return { success: true, data: updated };
    } catch (err) {
      return {
        success: false,
        error: `Failed to revoke push: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  // ── PREVIEW PUSH ─────────────────────────────────────────────────────

  /**
   * Returns a preview of what will happen if a push is created.
   * The admin sees this before confirming. Spec Section 5.2:
   * "A preview shows what the affected users' menu will look like."
   */
  async previewPush(
    institutionId: string,
    targetRole: PushableRole,
    taskRef: string,
  ): Promise<Result<PushPreview>> {
    if (!VALID_ROLES.has(targetRole)) {
      return { success: false, error: `Invalid role "${targetRole}".`, code: 'INVALID_ROLE' };
    }

    try {
      const activePushes = await this.repository.findActiveByRole(
        institutionId,
        targetRole,
      );

      const affectedUserCount = await this.repository.countUsersInRole(
        institutionId,
        targetRole,
      );

      const alreadyPushed = activePushes.some(p => p.taskRef === taskRef);

      return {
        success: true,
        data: {
          taskRef,
          taskLabel: taskRef, // In production, resolved via getTask(taskRef)?.label
          targetRole,
          affectedUserCount,
          currentPushCount: activePushes.length,
          wouldExceedLimit: activePushes.length >= MAX_PUSHES_PER_ROLE,
          alreadyPushed,
        },
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to generate preview: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  // ── GET ACTIVE PUSHES ────────────────────────────────────────────────

  /**
   * Returns all active pushes for a role within an institution.
   * Used by the client sync mechanism to determine which items
   * should appear as PUSHED (locked) in the user's menu.
   */
  async getActivePushes(
    institutionId: string,
    targetRole: PushableRole,
  ): Promise<Result<MenuPushRecord[]>> {
    try {
      const pushes = await this.repository.findActiveByRole(
        institutionId,
        targetRole,
      );
      return { success: true, data: pushes };
    } catch (err) {
      return {
        success: false,
        error: `Failed to fetch pushes: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  /**
   * Returns all active pushes across all roles for an institution.
   * Used by the admin dashboard to show the complete push landscape.
   */
  async getAllActivePushes(
    institutionId: string,
  ): Promise<Result<MenuPushRecord[]>> {
    try {
      const pushes = await this.repository.findActiveByInstitution(institutionId);
      return { success: true, data: pushes };
    } catch (err) {
      return {
        success: false,
        error: `Failed to fetch pushes: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  // ── AUDIT HISTORY ────────────────────────────────────────────────────

  /**
   * Returns the full audit trail of pushes for an institution.
   * Includes active, expired, and revoked records.
   * Spec Section 15: "Fully auditable — Every push/removal logged."
   */
  async getAuditHistory(
    institutionId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<Result<{ records: MenuPushRecord[]; total: number }>> {
    try {
      const result = await this.repository.findAuditHistory(institutionId, options);
      return { success: true, data: result };
    } catch (err) {
      return {
        success: false,
        error: `Failed to fetch audit history: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INTERNAL_ERROR',
      };
    }
  }

  // ── PROCESS EXPIRED PUSHES ───────────────────────────────────────────

  /**
   * Finds all pushes that have passed their expiresAt date and transitions
   * them from 'active' to 'expired'. This is called by the push expiry
   * handler (a scheduled job, typically run every 15 minutes).
   *
   * Returns the count of expired pushes for logging/monitoring.
   */
  async processExpiredPushes(): Promise<Result<{ expiredCount: number; expiredPushes: MenuPushRecord[] }>> {
    try {
      const expired = await this.repository.findExpired();

      if (expired.length === 0) {
        return { success: true, data: { expiredCount: 0, expiredPushes: [] } };
      }

      const now = new Date().toISOString();
      const updatedPushes: MenuPushRecord[] = [];

      for (const push of expired) {
        const updated = await this.repository.update(push.id, {
          status: 'expired',
        });
        updatedPushes.push(updated);

        await this.eventEmitter.emit({
          type: 'menu.push.expired',
          institutionId: push.institutionId,
          targetRole: push.targetRole,
          taskRef: push.taskRef,
          pushId: push.id,
          timestamp: now,
        });
      }

      return {
        success: true,
        data: { expiredCount: updatedPushes.length, expiredPushes: updatedPushes },
      };
    } catch (err) {
      return {
        success: false,
        error: `Failed to process expired pushes: ${err instanceof Error ? err.message : String(err)}`,
        code: 'INTERNAL_ERROR',
      };
    }
  }
}

// =============================================================================
// IN-MEMORY REPOSITORY (for testing and development)
// =============================================================================

export class InMemoryPushRepository implements PushRepository {
  private records: MenuPushRecord[] = [];
  private userCounts: Record<string, Record<string, number>> = {};

  /** Set up user counts for testing. */
  setUserCount(institutionId: string, role: PushableRole, count: number): void {
    if (!this.userCounts[institutionId]) {
      this.userCounts[institutionId] = {};
    }
    this.userCounts[institutionId]![role] = count;
  }

  async create(record: MenuPushRecord): Promise<MenuPushRecord> {
    this.records.push({ ...record });
    return { ...record };
  }

  async findById(id: string): Promise<MenuPushRecord | null> {
    return this.records.find(r => r.id === id) ?? null;
  }

  async findActiveByRole(
    institutionId: string,
    targetRole: PushableRole,
  ): Promise<MenuPushRecord[]> {
    return this.records.filter(
      r => r.institutionId === institutionId
        && r.targetRole === targetRole
        && r.status === 'active',
    );
  }

  async findActiveByInstitution(institutionId: string): Promise<MenuPushRecord[]> {
    return this.records.filter(
      r => r.institutionId === institutionId && r.status === 'active',
    );
  }

  async findExpired(): Promise<MenuPushRecord[]> {
    const now = Date.now();
    return this.records.filter(
      r => r.status === 'active'
        && r.expiresAt !== null
        && new Date(r.expiresAt).getTime() <= now,
    );
  }

  async update(id: string, data: Partial<MenuPushRecord>): Promise<MenuPushRecord> {
    const index = this.records.findIndex(r => r.id === id);
    if (index === -1) throw new Error(`Push "${id}" not found.`);

    this.records[index] = { ...this.records[index]!, ...data };
    return { ...this.records[index]! };
  }

  async countUsersInRole(
    institutionId: string,
    role: PushableRole,
  ): Promise<number> {
    return this.userCounts[institutionId]?.[role] ?? 0;
  }

  async findAuditHistory(
    institutionId: string,
    options?: { limit?: number; offset?: number },
  ): Promise<{ records: MenuPushRecord[]; total: number }> {
    const all = this.records
      .filter(r => r.institutionId === institutionId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 50;

    return {
      records: all.slice(offset, offset + limit),
      total: all.length,
    };
  }

  /** Reset for test isolation. */
  clear(): void {
    this.records = [];
    this.userCounts = {};
  }
}

// =============================================================================
// IN-MEMORY EVENT EMITTER (for testing)
// =============================================================================

export class InMemoryPushEventEmitter implements PushEventEmitter {
  public events: PushEvent[] = [];

  async emit(event: PushEvent): Promise<void> {
    this.events.push(event);
  }

  clear(): void {
    this.events = [];
  }
}
