'use client';

/**
 * Menu Settings Page
 * Users can view all menu items, reorder, pin, unpin, restore overflow items,
 * and see decay timelines for their self-composing navigation.
 */

import React, { useMemo, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import { getTask } from '@/config/menu-registry';
import { MenuSettingsPage } from '@/components/menu-settings-page';
import type { MenuSettingsItem } from '@/components/menu-settings-page';
import type { ComposingMenuItem } from '@/types/composing-menu-types';

const ROLE_LABELS: Record<string, string> = {
  learner: 'Learner',
  teacher: 'Teacher',
  parent: 'Parent',
  tutor: 'Tutor',
  admin: 'Admin',
  educator: 'Teacher',
  guardian: 'Parent',
  tutor_professional: 'Tutor',
  platform_admin: 'Admin',
};

export default function MenuSettingsRoute() {
  const { user } = useAuthStore();
  const store = useComposingMenuStore();
  const role = user?.role || 'learner';
  const roleLabel = ROLE_LABELS[role] || 'Learner';

  // Build settings items from store
  const items = useMemo((): MenuSettingsItem[] => {
    const visible = store.getVisibleItems(role);
    const overflow = store.getOverflowItems(role);
    const all = [...visible, ...overflow];

    return all.map((item): MenuSettingsItem => {
      const task = getTask(item.ref);
      const TaskIcon = task?.icon;
      const icon: React.ReactNode = TaskIcon ? <TaskIcon className="h-4 w-4" /> : item.ref;
      return {
        ref: item.ref,
        label: task?.name || item.ref,
        icon,
        state: item.state,
        pinned: item.pinned,
        lastUsed: item.lastUsed,
        useCount: item.useCount,
        position: item.position,
        addedAt: item.addedAt,
        decayStartedAt: item.state === 'decaying' ? item.addedAt : null,
        pushReason: item.pushReason || null,
        pushExpiry: item.pushExpiry || null,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.roleMenus, role]);

  // Build sync status
  const syncStatus = useMemo(() => {
    const menu = store.roleMenus[role];
    return {
      isSyncing: false,
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      hasPendingChanges: false,
      lastSyncResult: menu ? { version: menu.menuVersion, summary: 'Local' } : null,
      localVersion: menu?.menuVersion || 0,
    };
  }, [store.roleMenus, role]);

  const handleReorder = useCallback(
    (ref: string, newPosition: number) => {
      const visible = store.getVisibleItems(role);
      const orderedRefs = visible.map((i: ComposingMenuItem) => i.ref);
      const fromIndex = orderedRefs.indexOf(ref);
      if (fromIndex >= 0) {
        orderedRefs.splice(fromIndex, 1);
        orderedRefs.splice(newPosition, 0, ref);
        store.reorderItems(role, orderedRefs);
      }
    },
    [store, role]
  );

  const handlePin = useCallback(
    (ref: string) => store.pinItem(role, ref),
    [store, role]
  );

  const handleUnpin = useCallback(
    (ref: string) => store.unpinItem(role, ref),
    [store, role]
  );

  const handleRestore = useCallback(
    (ref: string) => store.restoreItem(role, ref),
    [store, role]
  );

  const handleRemove = useCallback(
    (ref: string) => store.removeItem(role, ref),
    [store, role]
  );

  const handleSync = useCallback(async () => {
    // Sync placeholder — Phase 6 implementation
    console.log('Menu sync triggered for role:', role);
  }, [role]);

  return (
    <MenuSettingsPage
      items={items}
      roleLabel={roleLabel}
      syncStatus={syncStatus}
      onReorder={handleReorder}
      onPin={handlePin}
      onUnpin={handleUnpin}
      onRestore={handleRestore}
      onRemove={handleRemove}
      onTriggerSync={handleSync}
    />
  );
}
