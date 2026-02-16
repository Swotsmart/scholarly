'use client';

// =============================================================================
// ADMIN PUSH UI
// =============================================================================
// The "Menu Management" section within the Admin Dashboard. This is where
// school administrators push, preview, and revoke required menu items
// for their users.
//
// Think of it as the school PA system's control room. From here, the admin
// can see what's currently being broadcast (active pushes), preview what
// a new announcement would look like (push preview), and manage the
// bulletin board (revoke, view audit history).
//
// Specification references:
//   Section 5.2  — Admin Push UI (select task, target role, reason,
//                   optional expiry, preview of affected menus)
//   Section 15   — Push rules summary (max 3 per role)
//   Phase 5 plan — "Admin push UI: 2–3 days — Menu Management section"
//
// Integration points:
//   - admin-push.service.ts: createPush, revokePush, previewPush, getAuditHistory
//   - menu-registry.ts (Phase 1): getAllTasks, getTask for label resolution
//   - composing-menu-types.ts (Phase 1): PushableRole type
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';

import type {
  MenuPushRecord,
  PushableRole,
  PushPreview,
  CreatePushInput,
  PushErrorCode,
} from './admin-push.service';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Task option for the task selector dropdown.
 */
export interface TaskOption {
  ref: string;
  label: string;
  category: string;
  alreadyPushed: boolean;
}

export interface AdminPushPanelProps {
  institutionId: string;
  getTasksForRole: (role: PushableRole) => TaskOption[];
  onCreatePush: (input: CreatePushInput) => Promise<{
    success: boolean;
    error?: string;
    code?: PushErrorCode;
  }>;
  onRevokePush: (pushId: string, reason?: string) => Promise<{
    success: boolean;
    error?: string;
  }>;
  onPreviewPush: (
    role: PushableRole,
    taskRef: string,
  ) => Promise<PushPreview | null>;
  activePushes: MenuPushRecord[];
  auditHistory: MenuPushRecord[];
  auditTotal: number;
  onLoadAuditHistory: (offset: number, limit: number) => Promise<void>;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const AVAILABLE_ROLES: { value: PushableRole; label: string }[] = [
  { value: 'teacher', label: 'Teachers' },
  { value: 'parent', label: 'Parents' },
  { value: 'learner', label: 'Learners' },
  { value: 'admin', label: 'Administrators' },
  { value: 'tutor', label: 'Tutors' },
  { value: 'homeschool', label: 'Homeschool Parents' },
  { value: 'creator', label: 'Content Creators' },
];

const MAX_PUSHES_PER_ROLE = 3;

// =============================================================================
// COMPONENT
// =============================================================================

export function AdminPushPanel({
  institutionId,
  getTasksForRole,
  onCreatePush,
  onRevokePush,
  onPreviewPush,
  activePushes,
  auditHistory,
  auditTotal,
  onLoadAuditHistory,
}: AdminPushPanelProps) {
  // ── Form state ──
  const [selectedRole, setSelectedRole] = useState<PushableRole>('teacher');
  const [selectedTaskRef, setSelectedTaskRef] = useState('');
  const [reason, setReason] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // ── Preview state ──
  const [preview, setPreview] = useState<PushPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // ── Revocation state ──
  const [revokingPushId, setRevokingPushId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // ── Tabs & pagination ──
  const [activeTab, setActiveTab] = useState<'create' | 'active' | 'audit'>('create');
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_PAGE_SIZE = 20;

  // ── Derived ──
  const tasks = useMemo(
    () => getTasksForRole(selectedRole),
    [getTasksForRole, selectedRole],
  );

  const rolePushes = useMemo(
    () => activePushes.filter(p => p.targetRole === selectedRole),
    [activePushes, selectedRole],
  );

  const roleAtLimit = rolePushes.length >= MAX_PUSHES_PER_ROLE;

  // ── Clear form on role change ──
  useEffect(() => {
    setSelectedTaskRef('');
    setReason('');
    setHasExpiry(false);
    setExpiryDate('');
    setFormError(null);
    setFormSuccess(null);
    setPreview(null);
  }, [selectedRole]);

  // ── Load preview when task changes ──
  useEffect(() => {
    if (!selectedTaskRef) {
      setPreview(null);
      return;
    }

    let cancelled = false;

    const loadPreview = async () => {
      setIsPreviewLoading(true);
      try {
        const p = await onPreviewPush(selectedRole, selectedTaskRef);
        if (!cancelled) setPreview(p);
      } catch {
        if (!cancelled) setPreview(null);
      } finally {
        if (!cancelled) setIsPreviewLoading(false);
      }
    };

    loadPreview();
    return () => { cancelled = true; };
  }, [selectedTaskRef, selectedRole, onPreviewPush]);

  // ── Submit handler ──
  const handleSubmit = useCallback(async () => {
    setFormError(null);
    setFormSuccess(null);

    if (!selectedTaskRef) {
      setFormError('Please select a task to push.');
      return;
    }

    if (reason.trim().length < 10) {
      setFormError('Please provide a reason of at least 10 characters.');
      return;
    }

    if (hasExpiry && !expiryDate) {
      setFormError('Please set an expiry date or uncheck the expiry option.');
      return;
    }

    if (hasExpiry && new Date(expiryDate).getTime() <= Date.now()) {
      setFormError('Expiry date must be in the future.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await onCreatePush({
        institutionId,
        targetRole: selectedRole,
        taskRef: selectedTaskRef,
        pushedBy: 'current-admin',
        reason: reason.trim(),
        expiresAt: hasExpiry ? new Date(expiryDate).toISOString() : null,
      });

      if (result.success) {
        const taskLabel = tasks.find(t => t.ref === selectedTaskRef)?.label ?? selectedTaskRef;
        setFormSuccess(
          `"${taskLabel}" has been pushed to all ${AVAILABLE_ROLES.find(r => r.value === selectedRole)?.label ?? selectedRole}. `
          + `They will see it in their menu immediately.`,
        );
        setSelectedTaskRef('');
        setReason('');
        setHasExpiry(false);
        setExpiryDate('');
        setPreview(null);
      } else {
        setFormError(result.error ?? 'An unexpected error occurred.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }, [institutionId, selectedRole, selectedTaskRef, reason, hasExpiry, expiryDate, tasks, onCreatePush]);

  // ── Revoke handler ──
  const handleRevoke = useCallback(async (pushId: string) => {
    setIsRevoking(true);
    try {
      const result = await onRevokePush(pushId, revokeReason.trim() || undefined);
      if (result.success) {
        setRevokingPushId(null);
        setRevokeReason('');
      } else {
        setFormError(result.error ?? 'Failed to revoke push.');
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to revoke push.');
    } finally {
      setIsRevoking(false);
    }
  }, [onRevokePush, revokeReason]);

  // ── Pagination ──
  const handleLoadMore = useCallback(async () => {
    const nextOffset = auditOffset + AUDIT_PAGE_SIZE;
    await onLoadAuditHistory(nextOffset, AUDIT_PAGE_SIZE);
    setAuditOffset(nextOffset);
  }, [auditOffset, onLoadAuditHistory]);

  // ── Render ──
  return (
    <div className="admin-push-panel" role="region" aria-label="Menu Management">
      <h2 className="admin-push-panel__title">Menu Management</h2>
      <p className="admin-push-panel__description">
        Push required menu items to users by role. Pushed items appear with a
        lock icon and cannot be removed by users.
      </p>

      {/* Tab navigation */}
      <div className="admin-push-panel__tabs" role="tablist">
        {(['create', 'active', 'audit'] as const).map(tab => (
          <button
            key={tab}
            role="tab"
            aria-selected={activeTab === tab}
            className={`admin-push-panel__tab ${activeTab === tab ? 'admin-push-panel__tab--active' : ''}`}
            onClick={() => setActiveTab(tab)}
            type="button"
          >
            {tab === 'create' && 'New Push'}
            {tab === 'active' && `Active Pushes (${activePushes.length})`}
            {tab === 'audit' && 'Audit History'}
          </button>
        ))}
      </div>

      {/* ── CREATE TAB ── */}
      {activeTab === 'create' && (
        <div className="admin-push-panel__create" role="tabpanel">
          {/* Role selector */}
          <fieldset className="admin-push-panel__field">
            <legend className="admin-push-panel__label">Target Role</legend>
            <div className="admin-push-panel__role-grid">
              {AVAILABLE_ROLES.map(role => {
                const count = activePushes.filter(p => p.targetRole === role.value).length;
                return (
                  <button
                    key={role.value}
                    className={`admin-push-panel__role-button ${
                      selectedRole === role.value ? 'admin-push-panel__role-button--selected' : ''
                    }`}
                    onClick={() => setSelectedRole(role.value)}
                    type="button"
                    aria-pressed={selectedRole === role.value}
                  >
                    <span>{role.label}</span>
                    <span className="admin-push-panel__role-count">
                      {count}/{MAX_PUSHES_PER_ROLE}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Task selector */}
          <div className="admin-push-panel__field">
            <label className="admin-push-panel__label" htmlFor="push-task-select">
              Menu Item to Push
            </label>
            <select
              id="push-task-select"
              className="admin-push-panel__select"
              value={selectedTaskRef}
              onChange={e => setSelectedTaskRef(e.target.value)}
              disabled={roleAtLimit}
            >
              <option value="">
                {roleAtLimit
                  ? `Limit reached (${MAX_PUSHES_PER_ROLE}/${MAX_PUSHES_PER_ROLE}). Revoke one first.`
                  : 'Select a task...'
                }
              </option>
              {tasks.map(task => (
                <option
                  key={task.ref}
                  value={task.ref}
                  disabled={task.alreadyPushed}
                >
                  {task.label} ({task.ref})
                  {task.alreadyPushed ? ' — Already pushed' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div className="admin-push-panel__field">
            <label className="admin-push-panel__label" htmlFor="push-reason">
              Reason (shown to users in tooltip)
            </label>
            <textarea
              id="push-reason"
              className="admin-push-panel__textarea"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="e.g., New attendance policy effective Monday. All teachers must track daily attendance."
              maxLength={200}
              rows={3}
              disabled={roleAtLimit}
            />
            <span className="admin-push-panel__char-count">
              {reason.length}/200
            </span>
          </div>

          {/* Expiry */}
          <div className="admin-push-panel__field admin-push-panel__field--inline">
            <label className="admin-push-panel__checkbox-label">
              <input
                type="checkbox"
                checked={hasExpiry}
                onChange={e => setHasExpiry(e.target.checked)}
                disabled={roleAtLimit}
              />
              Set expiry date
            </label>
            {hasExpiry && (
              <input
                type="date"
                className="admin-push-panel__date-input"
                value={expiryDate}
                onChange={e => setExpiryDate(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
              />
            )}
          </div>

          {/* Preview */}
          {preview && (
            <div
              className={`admin-push-panel__preview ${
                preview.wouldExceedLimit || preview.alreadyPushed
                  ? 'admin-push-panel__preview--warning'
                  : 'admin-push-panel__preview--ok'
              }`}
              role="status"
            >
              <h4 className="admin-push-panel__preview-title">Push Preview</h4>
              <dl className="admin-push-panel__preview-grid">
                <dt>Task</dt>
                <dd>{preview.taskLabel} ({preview.taskRef})</dd>
                <dt>Target</dt>
                <dd>{AVAILABLE_ROLES.find(r => r.value === preview.targetRole)?.label}</dd>
                <dt>Affected users</dt>
                <dd>{preview.affectedUserCount}</dd>
                <dt>Current pushes for role</dt>
                <dd>
                  {preview.currentPushCount}/{MAX_PUSHES_PER_ROLE}
                  {preview.wouldExceedLimit && (
                    <span className="admin-push-panel__warning"> — Limit reached</span>
                  )}
                </dd>
              </dl>
              {preview.alreadyPushed && (
                <p className="admin-push-panel__warning">
                  This task is already pushed to {preview.targetRole}.
                </p>
              )}
            </div>
          )}

          {isPreviewLoading && (
            <p className="admin-push-panel__loading" role="status" aria-live="polite">
              Loading preview...
            </p>
          )}

          {/* Messages */}
          {formError && (
            <div className="admin-push-panel__message admin-push-panel__message--error" role="alert">
              {formError}
            </div>
          )}

          {formSuccess && (
            <div className="admin-push-panel__message admin-push-panel__message--success" role="status">
              {formSuccess}
            </div>
          )}

          {/* Submit */}
          <button
            className="admin-push-panel__submit"
            onClick={handleSubmit}
            disabled={isSubmitting || roleAtLimit || !selectedTaskRef}
            type="button"
          >
            {isSubmitting ? 'Pushing...' : 'Push to All'}
          </button>
        </div>
      )}

      {/* ── ACTIVE PUSHES TAB ── */}
      {activeTab === 'active' && (
        <div className="admin-push-panel__active" role="tabpanel">
          {activePushes.length === 0 ? (
            <p className="admin-push-panel__empty">
              No active pushes. Use the "New Push" tab to push required menu
              items to your users.
            </p>
          ) : (
            <table className="admin-push-panel__table" role="table">
              <thead>
                <tr>
                  <th scope="col">Task</th>
                  <th scope="col">Role</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Pushed By</th>
                  <th scope="col">Expires</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {activePushes.map(push => (
                  <tr key={push.id}>
                    <td>{push.taskRef}</td>
                    <td>{push.targetRole}</td>
                    <td className="admin-push-panel__reason-cell">{push.reason}</td>
                    <td>{push.pushedBy}</td>
                    <td>
                      {push.expiresAt
                        ? new Date(push.expiresAt).toLocaleDateString()
                        : 'Never'
                      }
                    </td>
                    <td>
                      {revokingPushId === push.id ? (
                        <div className="admin-push-panel__revoke-form">
                          <input
                            type="text"
                            className="admin-push-panel__revoke-input"
                            placeholder="Reason for revocation (optional)"
                            value={revokeReason}
                            onChange={e => setRevokeReason(e.target.value)}
                          />
                          <button
                            className="admin-push-panel__revoke-confirm"
                            onClick={() => handleRevoke(push.id)}
                            disabled={isRevoking}
                            type="button"
                          >
                            {isRevoking ? 'Revoking...' : 'Confirm'}
                          </button>
                          <button
                            className="admin-push-panel__revoke-cancel"
                            onClick={() => { setRevokingPushId(null); setRevokeReason(''); }}
                            type="button"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          className="admin-push-panel__revoke-button"
                          onClick={() => setRevokingPushId(push.id)}
                          type="button"
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* ── AUDIT HISTORY TAB ── */}
      {activeTab === 'audit' && (
        <div className="admin-push-panel__audit" role="tabpanel">
          {auditHistory.length === 0 ? (
            <p className="admin-push-panel__empty">No push history yet.</p>
          ) : (
            <>
              <table className="admin-push-panel__table" role="table">
                <thead>
                  <tr>
                    <th scope="col">Task</th>
                    <th scope="col">Role</th>
                    <th scope="col">Status</th>
                    <th scope="col">Pushed By</th>
                    <th scope="col">Created</th>
                    <th scope="col">Revoked</th>
                    <th scope="col">Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {auditHistory.map(record => (
                    <tr
                      key={record.id}
                      className={`admin-push-panel__audit-row admin-push-panel__audit-row--${record.status}`}
                    >
                      <td>{record.taskRef}</td>
                      <td>{record.targetRole}</td>
                      <td>
                        <span className={`admin-push-panel__status-badge admin-push-panel__status-badge--${record.status}`}>
                          {record.status}
                        </span>
                      </td>
                      <td>{record.pushedBy}</td>
                      <td>{new Date(record.createdAt).toLocaleDateString()}</td>
                      <td>
                        {record.revokedAt
                          ? `${new Date(record.revokedAt).toLocaleDateString()} by ${record.revokedBy}`
                          : '—'
                        }
                      </td>
                      <td className="admin-push-panel__reason-cell">
                        {record.reason}
                        {record.revocationReason && (
                          <span className="admin-push-panel__revocation-reason">
                            {' '}(Revoked: {record.revocationReason})
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {auditHistory.length < auditTotal && (
                <button
                  className="admin-push-panel__load-more"
                  onClick={handleLoadMore}
                  type="button"
                >
                  Load more ({auditTotal - auditHistory.length} remaining)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
