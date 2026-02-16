'use client';

// =============================================================================
// USE MENU TOAST — Promotion & Lifecycle Toast System
// =============================================================================
// This hook bridges the composing menu store's lifecycle events to the
// toast notification system. It's the "dashboard gauges" layer that makes
// the menu's evolution visible to the user.
//
// Toast types and their triggers:
//   promotion_offer  — 1st meaningful use of a non-menu task
//   auto_added       — 2nd meaningful use, or seed pinned, or overflow restored
//   decay_overflow   — runDecayCycle() moved an item to overflow
//   seed_dismissed   — User dismissed a seed suggestion
//   push_received    — Admin pushed an item (Phase 5)
//
// Frequency cap: Maximum 2 menu-related toasts per session.
// Excess events are silently applied; the user sees changes on next
// sidebar interaction or overflow drawer open.
// =============================================================================

import { useCallback, useRef } from 'react';
import { toast } from '@/hooks/use-toast';
import { getTask } from '@/config/menu-registry';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import type { PromotionResponse } from '@/types/composing-menu-types';

// =============================================================================
// CONSTANTS
// =============================================================================

const SESSION_TOAST_CAP = 2;
const PROMOTION_DISMISS_MS = 8000;
const AUTO_ADD_DISMISS_MS = 10000;
const OVERFLOW_DISMISS_MS = 6000;

// =============================================================================
// TOAST CONTENT BUILDERS
// =============================================================================

interface MenuToastOptions {
  role: string;
  taskRef: string;
}

// =============================================================================
// HOOK
// =============================================================================

export function useMenuToast() {
  const store = useComposingMenuStore();
  const sessionToastCount = useRef(0);

  const canShowToast = useCallback(() => {
    return sessionToastCount.current < SESSION_TOAST_CAP;
  }, []);

  /**
   * Show a promotion offer toast.
   * Displayed on 1st meaningful use of a non-menu task.
   * Offers: Yes (add to menu), Not now (dismiss), Never (block forever).
   */
  const showPromotionOffer = useCallback(({ role, taskRef }: MenuToastOptions) => {
    if (!canShowToast()) return;

    const task = getTask(taskRef);
    if (!task) return;

    sessionToastCount.current += 1;

    // We use the raw toast() function with a custom React node for the action.
    // The ToastAction component from radix only supports a single action element,
    // so we compose our own button group.
    const { dismiss, id } = toast({
      title: `Add "${task.name}" to your menu?`,
      description: 'You just used this. Pin it for quick access.',
      duration: PROMOTION_DISMISS_MS,
      // The action slot renders our three-button group
      action: buildPromotionActions({
        role,
        taskRef,
        onRespond: (response: PromotionResponse) => {
          store.respondToPromotion(role, taskRef, response);
          dismiss();
        },
      }),
    });

    return id;
  }, [canShowToast, store]);

  /**
   * Show an auto-added confirmation toast.
   * Displayed when an item is auto-added on 2nd use.
   * Offers: Undo (remove the auto-added item).
   */
  const showAutoAdded = useCallback(({ role, taskRef }: MenuToastOptions) => {
    if (!canShowToast()) return;

    const task = getTask(taskRef);
    if (!task) return;

    sessionToastCount.current += 1;

    const { dismiss, id } = toast({
      title: `"${task.name}" added to your menu`,
      description: 'Pinned based on your usage.',
      duration: AUTO_ADD_DISMISS_MS,
      action: buildUndoAction({
        onUndo: () => {
          store.removeItem(role, taskRef);
          dismiss();
        },
      }),
    });

    return id;
  }, [canShowToast, store]);

  /**
   * Show an overflow toast.
   * Displayed when runDecayCycle() moves an item to the overflow drawer.
   * Offers: Restore (bring it back to active menu).
   */
  const showOverflow = useCallback(({ role, taskRef }: MenuToastOptions) => {
    if (!canShowToast()) return;

    const task = getTask(taskRef);
    if (!task) return;

    sessionToastCount.current += 1;

    const { dismiss, id } = toast({
      title: `"${task.name}" moved to More`,
      description: 'Unused for 60+ days. Restore anytime.',
      duration: OVERFLOW_DISMISS_MS,
      action: buildRestoreAction({
        onRestore: () => {
          store.restoreItem(role, taskRef);
          dismiss();
        },
      }),
    });

    return id;
  }, [canShowToast, store]);

  /**
   * Show a push received toast.
   * Displayed when an admin pushes a required item.
   * No dismissable actions — the item is mandatory.
   */
  const showPushReceived = useCallback(({ role, taskRef }: MenuToastOptions) => {
    const task = getTask(taskRef);
    if (!task) return;

    const item = store.getItem(role, taskRef);

    // Push toasts always show regardless of cap (they're institutional)
    toast({
      title: `"${task.name}" added by your school`,
      description: item?.pushReason || 'Required for all users in your role.',
      duration: AUTO_ADD_DISMISS_MS,
    });
  }, [store]);

  /**
   * Process a recordUse() return value and show appropriate toast.
   * This is the primary integration point — called by the sidebar's
   * usage tracking system after each meaningful navigation.
   */
  const handleUseResult = useCallback((
    result: 'offer' | 'auto_added' | 'updated' | 'blocked' | 'anchor',
    role: string,
    taskRef: string
  ) => {
    switch (result) {
      case 'offer':
        showPromotionOffer({ role, taskRef });
        break;
      case 'auto_added':
        showAutoAdded({ role, taskRef });
        break;
      // 'updated', 'blocked', 'anchor' — no toast needed
    }
  }, [showPromotionOffer, showAutoAdded]);

  /**
   * Process decay cycle results and show overflow toasts.
   * Called after runDecayCycle() returns the list of overflowed refs.
   */
  const handleDecayResults = useCallback((
    overflowedRefs: string[],
    role: string,
  ) => {
    // Show toast for the first overflowed item only (avoid toast spam)
    if (overflowedRefs.length > 0) {
      showOverflow({ role, taskRef: overflowedRefs[0] });
    }
  }, [showOverflow]);

  /**
   * Reset the session toast counter.
   * Called when a new session begins (e.g., page reload, return after 30+ min).
   */
  const resetSessionCount = useCallback(() => {
    sessionToastCount.current = 0;
  }, []);

  return {
    handleUseResult,
    handleDecayResults,
    showPromotionOffer,
    showAutoAdded,
    showOverflow,
    showPushReceived,
    resetSessionCount,
    canShowToast,
  };
}

// =============================================================================
// ACTION BUILDERS
// =============================================================================
// These return React elements compatible with the ToastAction slot.
// We import React lazily to avoid circular dependencies in the hook file.
// =============================================================================

function buildPromotionActions({
  role,
  taskRef,
  onRespond,
}: {
  role: string;
  taskRef: string;
  onRespond: (response: PromotionResponse) => void;
}) {
  // We need to return a ToastActionElement, but we want 3 buttons.
  // The radix ToastAction is a single element — so we wrap in a fragment-like div.
  const React = require('react');
  const { ToastAction } = require('@/components/ui/toast');

  return React.createElement(
    'div',
    {
      className: 'flex items-center gap-1.5 shrink-0',
      role: 'group',
      'aria-label': 'Menu promotion options',
    },
    React.createElement(
      'button',
      {
        onClick: () => onRespond('yes'),
        className: 'inline-flex h-7 items-center justify-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors',
        'aria-label': 'Yes, add to menu',
      },
      'Yes'
    ),
    React.createElement(
      'button',
      {
        onClick: () => onRespond('not_now'),
        className: 'inline-flex h-7 items-center justify-center rounded-md border px-2.5 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors',
        'aria-label': 'Not now',
      },
      'Not now'
    ),
    React.createElement(
      'button',
      {
        onClick: () => onRespond('never'),
        className: 'inline-flex h-7 items-center justify-center rounded-md px-2 text-xs font-medium text-muted-foreground/60 hover:text-destructive transition-colors',
        'aria-label': 'Never show this again',
      },
      'Never'
    ),
  ) as any;
}

function buildUndoAction({ onUndo }: { onUndo: () => void }) {
  const React = require('react');

  return React.createElement(
    'button',
    {
      onClick: onUndo,
      className: 'inline-flex h-7 items-center justify-center rounded-md border px-3 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors shrink-0',
      'aria-label': 'Undo adding to menu',
    },
    'Undo'
  ) as any;
}

function buildRestoreAction({ onRestore }: { onRestore: () => void }) {
  const React = require('react');

  return React.createElement(
    'button',
    {
      onClick: onRestore,
      className: 'inline-flex h-7 items-center justify-center rounded-md border px-3 text-xs font-medium text-muted-foreground hover:bg-accent transition-colors shrink-0',
      'aria-label': 'Restore to menu',
    },
    'Restore'
  ) as any;
}
