'use client';

// =============================================================================
// ADMIN PUSH UI
// =============================================================================
// The "Menu Management" section within the Admin Dashboard. This is where
// school administrators push, preview, and revoke required menu items
// for their users.
//
// Specification references:
//   Section 5.2  — Admin Push UI (select task, target role, reason,
//                   optional expiry, preview of affected menus)
//   Section 15   — Push rules summary (max 3 per role)
//   Phase 5 plan — "Admin push UI: 2–3 days — Menu Management section"
// =============================================================================

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Shield,
  Lock,
  Send,
  Trash2,
  Clock,
  AlertTriangle,
  Users,
  Settings,
  Calendar,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { PageHeader } from '@/components/shared';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

import type {
  MenuPushRecord,
  PushableRole,
  PushPreview,
  CreatePushInput,
  PushErrorCode,
} from '@/services/admin-push.service';

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
  // -- Form state --
  const [selectedRole, setSelectedRole] = useState<PushableRole>('teacher');
  const [selectedTaskRef, setSelectedTaskRef] = useState('');
  const [reason, setReason] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // -- Preview state --
  const [preview, setPreview] = useState<PushPreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  // -- Revocation state --
  const [revokingPushId, setRevokingPushId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');
  const [isRevoking, setIsRevoking] = useState(false);

  // -- Tabs & pagination --
  const [activeTab, setActiveTab] = useState<string>('create');
  const [auditOffset, setAuditOffset] = useState(0);
  const AUDIT_PAGE_SIZE = 20;

  // -- Derived --
  const tasks = useMemo(
    () => getTasksForRole(selectedRole),
    [getTasksForRole, selectedRole],
  );

  const rolePushes = useMemo(
    () => activePushes.filter(p => p.targetRole === selectedRole),
    [activePushes, selectedRole],
  );

  const roleAtLimit = rolePushes.length >= MAX_PUSHES_PER_ROLE;

  // -- Clear form on role change --
  useEffect(() => {
    setSelectedTaskRef('');
    setReason('');
    setHasExpiry(false);
    setExpiryDate('');
    setFormError(null);
    setFormSuccess(null);
    setPreview(null);
  }, [selectedRole]);

  // -- Load preview when task changes --
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

  // -- Submit handler --
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
        const taskLabel = tasks.find((t: TaskOption) => t.ref === selectedTaskRef)?.label ?? selectedTaskRef;
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

  // -- Revoke handler --
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

  // -- Pagination --
  const handleLoadMore = useCallback(async () => {
    const nextOffset = auditOffset + AUDIT_PAGE_SIZE;
    await onLoadAuditHistory(nextOffset, AUDIT_PAGE_SIZE);
    setAuditOffset(nextOffset);
  }, [auditOffset, onLoadAuditHistory]);

  // -- Render --
  return (
    <div className="space-y-6" role="region" aria-label="Menu Management">
      <PageHeader
        title="Menu Management"
        description="Push required menu items to users by role. Pushed items appear with a lock icon and cannot be removed by users."
        actions={
          <Badge variant="secondary" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" />
            Admin Only
          </Badge>
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="create" className="gap-1.5">
            <Send className="h-4 w-4" />
            New Push
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-1.5">
            <Lock className="h-4 w-4" />
            Active Pushes ({activePushes.length})
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-1.5">
            <Clock className="h-4 w-4" />
            Audit History
          </TabsTrigger>
        </TabsList>

        {/* ---- CREATE TAB ---- */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Create New Push</CardTitle>
              <CardDescription>
                Select a target role, choose a menu item, and provide a reason for the push.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Role selector */}
              <div className="space-y-3">
                <Label>Target Role</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                  {AVAILABLE_ROLES.map(role => {
                    const count = activePushes.filter(p => p.targetRole === role.value).length;
                    const isSelected = selectedRole === role.value;
                    return (
                      <Button
                        key={role.value}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className={cn(
                          'justify-between gap-2',
                          isSelected && 'ring-2 ring-primary ring-offset-2',
                        )}
                        onClick={() => setSelectedRole(role.value)}
                        type="button"
                        aria-pressed={isSelected}
                      >
                        <span className="truncate">{role.label}</span>
                        <Badge
                          variant={count >= MAX_PUSHES_PER_ROLE ? 'destructive' : 'secondary'}
                          className="ml-1 text-xs"
                        >
                          {count}/{MAX_PUSHES_PER_ROLE}
                        </Badge>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Task selector */}
              <div className="space-y-2">
                <Label htmlFor="push-task-select">Menu Item to Push</Label>
                <Select
                  value={selectedTaskRef}
                  onValueChange={setSelectedTaskRef}
                  disabled={roleAtLimit}
                >
                  <SelectTrigger id="push-task-select">
                    <SelectValue
                      placeholder={
                        roleAtLimit
                          ? `Limit reached (${MAX_PUSHES_PER_ROLE}/${MAX_PUSHES_PER_ROLE}). Revoke one first.`
                          : 'Select a task...'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map((task: TaskOption) => (
                      <SelectItem
                        key={task.ref}
                        value={task.ref}
                        disabled={task.alreadyPushed}
                      >
                        {task.label} ({task.ref})
                        {task.alreadyPushed ? ' -- Already pushed' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Reason */}
              <div className="space-y-2">
                <Label htmlFor="push-reason">Reason (shown to users in tooltip)</Label>
                <Textarea
                  id="push-reason"
                  value={reason}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setReason(e.target.value)}
                  placeholder="e.g., New attendance policy effective Monday. All teachers must track daily attendance."
                  maxLength={200}
                  rows={3}
                  disabled={roleAtLimit}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {reason.length}/200
                </p>
              </div>

              {/* Expiry */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="push-expiry-checkbox"
                    checked={hasExpiry}
                    onCheckedChange={(checked: boolean | 'indeterminate') => setHasExpiry(checked === true)}
                    disabled={roleAtLimit}
                  />
                  <Label htmlFor="push-expiry-checkbox" className="cursor-pointer">
                    Set expiry date
                  </Label>
                </div>
                {hasExpiry && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={expiryDate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setExpiryDate(e.target.value)}
                      min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                      className="w-auto"
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              {isPreviewLoading && (
                <p className="text-sm text-muted-foreground animate-pulse" role="status" aria-live="polite">
                  Loading preview...
                </p>
              )}

              {preview && (
                <Card
                  className={cn(
                    'border-l-4',
                    preview.wouldExceedLimit || preview.alreadyPushed
                      ? 'border-l-destructive bg-destructive/5'
                      : 'border-l-primary bg-primary/5',
                  )}
                  role="status"
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {preview.wouldExceedLimit || preview.alreadyPushed ? (
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                      ) : (
                        <Shield className="h-4 w-4 text-primary" />
                      )}
                      Push Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <dt className="font-medium text-muted-foreground">Task</dt>
                      <dd>{preview.taskLabel} ({preview.taskRef})</dd>
                      <dt className="font-medium text-muted-foreground">Target</dt>
                      <dd>{AVAILABLE_ROLES.find(r => r.value === preview.targetRole)?.label}</dd>
                      <dt className="font-medium text-muted-foreground">Affected users</dt>
                      <dd className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        {preview.affectedUserCount}
                      </dd>
                      <dt className="font-medium text-muted-foreground">Current pushes for role</dt>
                      <dd className="flex items-center gap-2">
                        {preview.currentPushCount}/{MAX_PUSHES_PER_ROLE}
                        {preview.wouldExceedLimit && (
                          <Badge variant="destructive" className="text-xs">Limit reached</Badge>
                        )}
                      </dd>
                    </dl>
                    {preview.alreadyPushed && (
                      <p className="mt-3 flex items-center gap-1.5 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4" />
                        This task is already pushed to {preview.targetRole}.
                      </p>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Messages */}
              {formError && (
                <div
                  className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  role="alert"
                >
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  {formError}
                </div>
              )}

              {formSuccess && (
                <div
                  className="flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-4 py-3 text-sm text-primary"
                  role="status"
                >
                  <Shield className="h-4 w-4 shrink-0" />
                  {formSuccess}
                </div>
              )}
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || roleAtLimit || !selectedTaskRef}
                isLoading={isSubmitting}
                leftIcon={<Send className="h-4 w-4" />}
              >
                {isSubmitting ? 'Pushing...' : 'Push to All'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* ---- ACTIVE PUSHES TAB ---- */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Active Pushes</CardTitle>
              <CardDescription>
                Currently enforced menu pushes across all roles.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activePushes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Lock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">
                    No active pushes. Use the &quot;New Push&quot; tab to push required menu
                    items to your users.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Task</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Pushed By</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activePushes.map(push => (
                      <TableRow key={push.id}>
                        <TableCell className="font-medium">{push.taskRef}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{push.targetRole}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">{push.reason}</TableCell>
                        <TableCell>{push.pushedBy}</TableCell>
                        <TableCell>
                          {push.expiresAt ? (
                            <span className="flex items-center gap-1.5 text-sm">
                              <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                              {new Date(push.expiresAt).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setRevokingPushId(push.id)}
                            leftIcon={<Trash2 className="h-3.5 w-3.5" />}
                          >
                            Revoke
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Revoke confirmation dialog */}
          <Dialog
            open={revokingPushId !== null}
            onOpenChange={(open: boolean) => {
              if (!open) {
                setRevokingPushId(null);
                setRevokeReason('');
              }
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Revoke Push</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p className="text-sm text-muted-foreground">
                  Are you sure you want to revoke this push? Users will no longer see this
                  item as a required menu entry.
                </p>
                <div className="space-y-2">
                  <Label htmlFor="revoke-reason">Reason for revocation (optional)</Label>
                  <Input
                    id="revoke-reason"
                    placeholder="Reason for revocation (optional)"
                    value={revokeReason}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRevokeReason(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => { setRevokingPushId(null); setRevokeReason(''); }}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => revokingPushId && handleRevoke(revokingPushId)}
                  disabled={isRevoking}
                  isLoading={isRevoking}
                >
                  {isRevoking ? 'Revoking...' : 'Confirm Revoke'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ---- AUDIT HISTORY TAB ---- */}
        <TabsContent value="audit">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Audit History</CardTitle>
              <CardDescription>
                Complete history of all push and revocation actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {auditHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Clock className="h-10 w-10 text-muted-foreground/50 mb-3" />
                  <p className="text-sm text-muted-foreground">No push history yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Pushed By</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Revoked</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {auditHistory.map(record => (
                        <TableRow key={record.id}>
                          <TableCell className="font-medium">{record.taskRef}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{record.targetRole}</Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                record.status === 'active'
                                  ? 'default'
                                  : record.status === 'revoked'
                                    ? 'destructive'
                                    : 'outline'
                              }
                            >
                              {record.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{record.pushedBy}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(record.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-sm">
                            {record.revokedAt
                              ? `${new Date(record.revokedAt).toLocaleDateString()} by ${record.revokedBy}`
                              : <span className="text-muted-foreground">--</span>
                            }
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="truncate block">{record.reason}</span>
                            {record.revocationReason && (
                              <span className="block text-xs text-muted-foreground mt-1">
                                Revoked: {record.revocationReason}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {auditHistory.length < auditTotal && (
                    <div className="flex justify-center pt-2">
                      <Button
                        variant="outline"
                        onClick={handleLoadMore}
                        leftIcon={<Clock className="h-4 w-4" />}
                      >
                        Load more ({auditTotal - auditHistory.length} remaining)
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
