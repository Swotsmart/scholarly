'use client';

/**
 * Admin Menu Management Page
 * Allows platform admins to push required menu items to users by role,
 * view active pushes, and manage the institutional override system.
 */

import { useState, useCallback } from 'react';
import { AdminPushPanel } from '@/components/admin-push-ui';
import { getAllTasks } from '@/config/menu-registry';
import type { TaskOption } from '@/components/admin-push-ui';
import type { PushableRole, MenuPushRecord, CreatePushInput, PushPreview } from '@/services/admin-push.service';

function getTasksForRole(_role: PushableRole): TaskOption[] {
  try {
    const tasks = getAllTasks();
    return tasks.map((t) => ({
      ref: t.ref,
      label: t.name,
      category: t.cluster,
      alreadyPushed: false,
    }));
  } catch {
    return [];
  }
}

export default function MenuManagementPage() {
  const [activePushes, setActivePushes] = useState<MenuPushRecord[]>([]);
  const [auditHistory] = useState<MenuPushRecord[]>([]);

  const handleCreatePush = useCallback(async (input: CreatePushInput) => {
    console.log('Creating push:', input);
    const newPush: MenuPushRecord = {
      id: `push_${Date.now()}`,
      institutionId: input.institutionId,
      targetRole: input.targetRole,
      taskRef: input.taskRef,
      pushedBy: input.pushedBy,
      reason: input.reason,
      status: 'active',
      expiresAt: input.expiresAt || null,
      createdAt: new Date().toISOString(),
      revokedAt: null,
      revokedBy: null,
      revocationReason: null,
    };
    setActivePushes((prev: MenuPushRecord[]) => [...prev, newPush]);
    return { success: true as const };
  }, []);

  const handleRevokePush = useCallback(async (pushId: string, _reason?: string) => {
    console.log('Revoking push:', pushId);
    setActivePushes((prev: MenuPushRecord[]) => prev.filter((p: MenuPushRecord) => p.id !== pushId));
    return { success: true as const };
  }, []);

  const handlePreviewPush = useCallback(async (
    _role: PushableRole,
    _taskRef: string,
  ): Promise<PushPreview | null> => {
    return {
      taskRef: _taskRef,
      taskLabel: _taskRef,
      targetRole: _role,
      affectedUserCount: 0,
      currentPushCount: 0,
      wouldExceedLimit: false,
      alreadyPushed: false,
    };
  }, []);

  const handleLoadAuditHistory = useCallback(async (_offset: number, _limit: number) => {
    console.log('Loading audit history');
  }, []);

  return (
    <AdminPushPanel
      institutionId="default"
      getTasksForRole={getTasksForRole}
      onCreatePush={handleCreatePush}
      onRevokePush={handleRevokePush}
      onPreviewPush={handlePreviewPush}
      activePushes={activePushes}
      auditHistory={auditHistory}
      auditTotal={auditHistory.length}
      onLoadAuditHistory={handleLoadAuditHistory}
    />
  );
}
