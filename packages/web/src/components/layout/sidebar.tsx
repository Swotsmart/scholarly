'use client';

// =============================================================================
// SIDEBAR — Self-Composing Interface
// =============================================================================
// Refactored to render from the ComposingMenuStore instead of static
// NavSection arrays. The visual structure is preserved — logo, search,
// nav items, settings footer — but items now come from the lifecycle system.
//
// Visual treatments by state:
//   ANCHOR  — Full opacity, no decoration. Always at top.
//   SEED    — Sparkle icon indicator. Pin/dismiss on hover.
//   ACTIVE  — Full opacity. Remove/pin on hover.
//   DECAYING — 60% opacity, dotted underline. Pin/remove on hover.
//   PUSHED  — Lock icon. Cannot remove. Tooltip shows reason.
//   OVERFLOW — Not rendered here. Shown in OverflowDrawer.
//
// Original sidebar preserved at sidebar.tsx.original for reference.
// =============================================================================

import { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import { useMenuToast } from '@/hooks/use-menu-toast';
import { getTask, findTaskByPath } from '@/config/menu-registry';
import { Input } from '@/components/ui/input';
import {
  GraduationCap, Settings, Search, PanelLeftClose, PanelLeft,
  Pin, PinOff, X, Sparkles, Lock, MoreHorizontal, ChevronRight,
  RotateCcw,
} from 'lucide-react';
import type { ComposingMenuItem } from '@/types/composing-menu-types';
import type { NavChild } from '@/types/composing-menu-types';

// =============================================================================
// CONSTANTS
// =============================================================================

const MEANINGFUL_USE_MS = 5000; // 5 seconds

// =============================================================================
// USAGE TRACKING HOOK
// =============================================================================
// Tracks time spent on the current route and reports meaningful uses
// to the composing menu store. This is the input signal that drives
// the entire promotion system.
// =============================================================================

function useUsageTracking() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const recordUse = useComposingMenuStore(s => s.recordUse);
  const menuToast = useMenuToast();
  const enteredAt = useRef<number>(0);
  const lastPath = useRef<string>('');

  useEffect(() => {
    if (!user?.role || !pathname) return;

    // Record exit from previous route
    if (lastPath.current && lastPath.current !== pathname) {
      const elapsed = Date.now() - enteredAt.current;
      if (elapsed >= MEANINGFUL_USE_MS) {
        const task = findTaskByPath(lastPath.current);
        if (task) {
          const result = recordUse(user.role, task.ref);
          // Fire toast for promotion events
          menuToast.handleUseResult(result, user.role, task.ref);
        }
      }
    }

    // Record entry to new route
    lastPath.current = pathname;
    enteredAt.current = Date.now();
  }, [pathname, user?.role, recordUse, menuToast]);
}

// =============================================================================
// SIDEBAR COMPONENT
// =============================================================================

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const store = useComposingMenuStore();
  const menuToast = useMenuToast();
  const role = user?.role || 'learner';

  // Initialise anchors for this role on mount
  useEffect(() => {
    if (role) store.initRole(role);
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Run decay cycle on mount (session start) and feed results to toast system
  useEffect(() => {
    if (role) {
      menuToast.resetSessionCount();
      const overflowed = store.runDecayCycle(role);
      if (overflowed.length > 0) {
        menuToast.handleDecayResults(overflowed, role);
      }
    }
  }, [role]); // eslint-disable-line react-hooks/exhaustive-deps

  // Start usage tracking
  useUsageTracking();

  // Get items from the store
  const visibleItems = useMemo(
    () => store.getVisibleItems(role),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.roleMenus, role]
  );
  const overflowItems = useMemo(
    () => store.getOverflowItems(role),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [store.roleMenus, role]
  );

  // Search filter
  const [navSearch, setNavSearch] = useState('');
  const filteredItems = useMemo(() => {
    if (!navSearch.trim()) return visibleItems;
    const q = navSearch.toLowerCase();
    return visibleItems.filter(item => {
      const task = getTask(item.ref);
      if (!task) return false;
      return (
        task.name.toLowerCase().includes(q) ||
        task.description?.toLowerCase().includes(q) ||
        task.children?.some(c => c.name.toLowerCase().includes(q))
      );
    });
  }, [visibleItems, navSearch]);

  // Separate anchors, seeds, and growth items for rendering
  const anchors = filteredItems.filter(i => i.state === 'anchor');
  const seeds = filteredItems.filter(i => i.state === 'seed');
  const growthItems = filteredItems.filter(i =>
    i.state === 'active' || i.state === 'decaying' || i.state === 'pushed'
  );

  // ── Collapsed (icon-only) sidebar ──
  if (store.collapsed) {
    return (
      <aside className="hidden w-16 flex-shrink-0 border-r bg-card lg:flex lg:flex-col">
        <div className="flex h-16 items-center justify-center border-b">
          <Link href="/dashboard">
            <GraduationCap className="h-7 w-7 text-primary" />
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto py-2" aria-label="Main navigation">
          <ul className="space-y-1 px-2">
            {anchors.map(item => (
              <CollapsedItem key={item.ref} item={item} pathname={pathname} />
            ))}
          </ul>
        </nav>

        <div className="border-t p-2">
          <button
            onClick={store.toggleCollapsed}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent mx-auto"
            title="Expand sidebar"
          >
            <PanelLeft className="h-5 w-5" />
          </button>
        </div>
      </aside>
    );
  }

  // ── Expanded sidebar ──
  return (
    <aside className="hidden w-64 flex-shrink-0 border-r bg-card lg:flex lg:flex-col">
      {/* Logo + Collapse */}
      <div className="flex h-16 items-center justify-between border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <GraduationCap className="h-7 w-7 text-primary" />
          <span className="text-lg font-bold">Scholarly</span>
        </Link>
        <button
          onClick={store.toggleCollapsed}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Collapse sidebar"
        >
          <PanelLeftClose className="h-4 w-4" />
        </button>
      </div>

      {/* Role Indicator + Search */}
      <div className="px-3 py-2 space-y-2 border-b">
        {user && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <span className="capitalize">{user.role || 'Learner'}</span>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search or Cmd+K..."
            value={navSearch}
            onChange={e => setNavSearch(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2" aria-label="Main navigation">
        {/* ARIA live region for menu change announcements */}
        <div
          className="sr-only"
          role="status"
          aria-live="polite"
          aria-atomic="true"
          id="menu-announcements"
        />
        {/* ── Anchors ── */}
        {anchors.length > 0 && (
          <div className="py-1 mb-1">
            <ul className="space-y-0.5" role="list">
              {anchors.map(item => (
                <MenuItemRow key={item.ref} item={item} pathname={pathname} role={role} />
              ))}
            </ul>
          </div>
        )}

        {/* ── Seeds ── */}
        {seeds.length > 0 && !navSearch && (
          <div className="py-1 mb-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1.5 px-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3 text-amber-500" />
              Suggested for you
            </p>
            <ul className="space-y-0.5" role="list">
              {seeds.map(item => (
                <MenuItemRow key={item.ref} item={item} pathname={pathname} role={role} />
              ))}
            </ul>
          </div>
        )}

        {/* ── Growth Items (active, decaying, pushed) ── */}
        {growthItems.length > 0 && (
          <div className="py-1 mb-1">
            {(anchors.length > 0 || seeds.length > 0) && (
              <div className="h-px bg-border/50 mb-2" />
            )}
            <ul className="space-y-0.5" role="list">
              {growthItems.map(item => (
                <MenuItemRow key={item.ref} item={item} pathname={pathname} role={role} />
              ))}
            </ul>
          </div>
        )}

        {/* ── Overflow / More ── */}
        {overflowItems.length > 0 && !navSearch && (
          <div className="mt-1">
            <button
              onClick={store.toggleOverflow}
              className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground/60 hover:text-muted-foreground hover:bg-accent/50 transition-colors"
              aria-expanded={store.overflowOpen}
              aria-controls="overflow-drawer"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
              More ({overflowItems.length})
            </button>

            {store.overflowOpen && (
              <OverflowDrawer items={overflowItems} pathname={pathname} role={role} />
            )}
          </div>
        )}
      </nav>

      {/* Settings Footer */}
      <div className="border-t px-3 py-2">
        <Link
          href="/settings"
          className={cn(
            'flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors',
            pathname === '/settings'
              ? 'bg-primary/10 text-primary'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
          )}
        >
          <Settings className="h-4 w-4" />
          Settings
        </Link>
      </div>
    </aside>
  );
}

// =============================================================================
// COLLAPSED ITEM — Icon-only rendering for collapsed sidebar
// =============================================================================

function CollapsedItem({ item, pathname }: { item: ComposingMenuItem; pathname: string }) {
  const task = getTask(item.ref);
  if (!task) return null;

  const isActive = pathname === task.href || pathname.startsWith(task.href + '/');
  const Icon = task.icon;

  return (
    <li>
      <Link
        href={task.href}
        title={task.name}
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-lg transition-colors mx-auto',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
        )}
      >
        <Icon className="h-5 w-5" />
      </Link>
    </li>
  );
}

// =============================================================================
// MENU ITEM ROW — Full rendering with lifecycle visual treatments
// =============================================================================

function MenuItemRow({
  item,
  pathname,
  role,
}: {
  item: ComposingMenuItem;
  pathname: string;
  role: string;
}) {
  const task = getTask(item.ref);
  if (!task) return null;

  const store = useComposingMenuStore();
  const isActive = pathname === task.href || pathname.startsWith(task.href + '/');
  const hasChildren = task.type === 'compound' && task.children && task.children.length > 0;
  const [isExpanded, setIsExpanded] = useState(isActive && hasChildren);
  const [isHovered, setIsHovered] = useState(false);
  const Icon = task.icon;

  // Auto-expand when navigating to a child route
  useEffect(() => {
    if (isActive && hasChildren && !isExpanded) {
      setIsExpanded(true);
    }
  }, [isActive, hasChildren]); // eslint-disable-line react-hooks/exhaustive-deps

  // State-specific visual classes
  const stateClasses = cn(
    'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-primary/10 text-primary'
      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
    item.state === 'decaying' && 'opacity-60',
    item.state === 'seed' && !isActive && 'bg-amber-500/5 border border-amber-500/20',
  );

  const stateLabel =
    item.state === 'decaying'
      ? 'Unused for 30+ days. Pin to keep.'
      : item.state === 'pushed' && item.pushReason
        ? `Required by your school: ${item.pushReason}`
        : item.state === 'seed' && item.seedReason
          ? item.seedReason
          : task.description || '';

  return (
    <li>
      <div
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={task.href}
          onClick={hasChildren ? (e) => { e.preventDefault(); setIsExpanded(!isExpanded); } : undefined}
          className={stateClasses}
          title={stateLabel}
          aria-label={
            item.state === 'seed'
              ? `${task.name} — Suggested: ${item.seedReason || ''}`
              : item.state === 'pushed'
                ? `${task.name} — Required: ${item.pushReason || ''}`
                : task.name
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className={cn(
            'flex-1 truncate',
            item.state === 'decaying' && 'underline decoration-dotted decoration-muted-foreground/40 underline-offset-4'
          )}>
            {task.name}
          </span>

          {item.state === 'seed' && <Sparkles className="h-3 w-3 shrink-0 text-amber-500" aria-hidden="true" />}
          {item.state === 'pushed' && <Lock className="h-3 w-3 shrink-0 text-muted-foreground/50" aria-hidden="true" />}
          {item.pinned && item.state !== 'anchor' && <Pin className="h-3 w-3 shrink-0 text-blue-500/60" aria-hidden="true" />}

          {task.badge && (
            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-semibold text-primary">
              {task.badge}
            </span>
          )}

          {hasChildren && (
            <ChevronRight className={cn(
              'h-3.5 w-3.5 shrink-0 text-muted-foreground/50 transition-transform',
              isExpanded && 'rotate-90'
            )} />
          )}
        </Link>

        {/* Hover actions */}
        {isHovered && !hasChildren && (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
            {item.state === 'seed' && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); store.promoteSeed(role, item.ref); }}
                  className="rounded p-0.5 text-muted-foreground/40 hover:text-green-500 transition-colors"
                  title="Add to menu"
                  aria-label={`Add ${task.name} to your menu`}
                >
                  <Pin className="h-3 w-3" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); store.dismissSeed(role, item.ref); }}
                  className="rounded p-0.5 text-muted-foreground/40 hover:text-red-400 transition-colors"
                  title="Dismiss suggestion"
                  aria-label={`Dismiss ${task.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}

            {(item.state === 'active' || item.state === 'decaying') && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    item.pinned ? store.unpinItem(role, item.ref) : store.pinItem(role, item.ref);
                  }}
                  className={cn(
                    'rounded p-0.5 transition-colors',
                    item.pinned ? 'text-blue-500 hover:text-blue-400' : 'text-muted-foreground/40 hover:text-blue-500'
                  )}
                  title={item.pinned ? 'Unpin' : 'Pin to keep'}
                  aria-label={item.pinned ? `Unpin ${task.name}` : `Pin ${task.name}`}
                >
                  {item.pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); store.removeItem(role, item.ref); }}
                  className="rounded p-0.5 text-muted-foreground/40 hover:text-red-400 transition-colors"
                  title="Remove from menu"
                  aria-label={`Remove ${task.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && task.children && (
        <ul className="ml-4 mt-0.5 space-y-0.5 border-l border-border/50 pl-2">
          {task.children.map(child => (
            <ChildItem key={child.href} child={child} pathname={pathname} />
          ))}
        </ul>
      )}
    </li>
  );
}

// =============================================================================
// CHILD ITEM
// =============================================================================

function ChildItem({ child, pathname }: { child: NavChild; pathname: string }) {
  const ChildIcon = child.icon;
  const isChildActive = pathname === child.href || pathname.startsWith(child.href + '/');

  return (
    <li>
      <Link
        href={child.href}
        className={cn(
          'flex items-center gap-2 rounded-md px-2 py-1 text-xs font-medium transition-colors',
          isChildActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground hover:bg-accent/50 hover:text-accent-foreground'
        )}
      >
        <ChildIcon className="h-3.5 w-3.5 shrink-0" />
        {child.name}
      </Link>
    </li>
  );
}

// =============================================================================
// OVERFLOW DRAWER
// =============================================================================

function OverflowDrawer({
  items,
  pathname,
  role,
}: {
  items: ComposingMenuItem[];
  pathname: string;
  role: string;
}) {
  const store = useComposingMenuStore();

  return (
    <div
      id="overflow-drawer"
      className="mt-1 rounded-md border bg-background/95 backdrop-blur p-2 space-y-0.5"
      role="region"
      aria-label="Overflow menu items"
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 mb-1 px-2">
        Previously used
      </p>
      {items.map(item => {
        const task = getTask(item.ref);
        if (!task) return null;
        const Icon = task.icon;

        const daysAgo = item.lastUsed
          ? Math.floor((Date.now() - new Date(item.lastUsed).getTime()) / (1000 * 60 * 60 * 24))
          : null;

        return (
          <div key={item.ref} className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
            <Link href={task.href} className="flex items-center gap-2 flex-1 min-w-0">
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{task.name}</span>
            </Link>
            {daysAgo !== null && (
              <span className="text-[10px] text-muted-foreground/50 shrink-0">{daysAgo}d ago</span>
            )}
            <button
              onClick={() => store.restoreItem(role, item.ref)}
              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-muted-foreground/40 hover:text-green-500 transition-all"
              title="Restore to menu"
              aria-label={`Restore ${task.name}`}
            >
              <RotateCcw className="h-3 w-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
