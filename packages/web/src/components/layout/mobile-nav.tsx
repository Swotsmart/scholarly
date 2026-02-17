'use client';

// =============================================================================
// MOBILE NAVIGATION — Self-Composing Interface Integration
// =============================================================================
// Modified to read from the composing menu store instead of hardcoded arrays.
//
// MobileBottomTabs: reads anchor items from the store for bottom tab bar.
// MobileNav: reads active items, seeds, and overflow from the store for
//            the hamburger sheet menu.
//
// The hardcoded role-specific arrays are kept as fallbacks for when the
// composing store hasn't been initialized yet (first render).
//
// Import in header.tsx must continue to work:
//   import { MobileNav } from "./mobile-nav"
// =============================================================================

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { useComposingMenuStore } from '@/stores/composing-menu-store';
import { getTask } from '@/config/menu-registry';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Settings, GraduationCap, Sparkles, Menu, Search, Home,
  ChevronDown, ChevronUp, X, Pin, Lock, MoreHorizontal, RotateCcw,
} from 'lucide-react';
import type { ComposingMenuItem } from '@/types/composing-menu-types';

// =============================================================================
// BOTTOM TAB BAR — reads anchors from composing store
// =============================================================================

export function MobileBottomTabs() {
  const { user } = useAuthStore();
  const store = useComposingMenuStore();
  const pathname = usePathname();
  const role = user?.role || 'learner';

  // Get anchor items from the composing store for the bottom tabs
  const tabs = useMemo(() => {
    const anchors = store.getVisibleItems(role).filter((i: ComposingMenuItem) => i.state === 'anchor');

    if (anchors.length === 0) return [];

    return anchors.slice(0, 4).map((item: ComposingMenuItem) => {
      const task = getTask(item.ref);
      if (!task) return null;
      return {
        label: task.name.length > 8 ? task.name.split(' ')[0] || task.name : task.name,
        href: task.href,
        icon: task.icon,
        badge: task.badge ? Number(task.badge) : undefined,
      };
    }).filter(Boolean) as Array<{ label: string; href: string; icon: React.ElementType; badge?: number }>;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.roleMenus, role]);

  if (tabs.length === 0) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 lg:hidden"
         aria-label="Mobile navigation">
      <div className="flex items-center justify-around h-16 px-2">
        {tabs.map((tab: { label: string; href: string; icon: React.ElementType; badge?: number }) => {
          const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/');
          const Icon = tab.icon;

          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[64px]',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <div className="relative">
                <Icon className="h-5 w-5" />
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className={cn(
                'text-[10px] font-medium',
                isActive ? 'text-primary' : 'text-muted-foreground'
              )}>
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 h-0.5 w-8 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

// =============================================================================
// MOBILE MENU ITEM — renders a single item with lifecycle visual treatments
// =============================================================================

function MobileMenuItem({
  item,
  pathname,
  onClose,
}: {
  item: ComposingMenuItem;
  pathname: string;
  onClose: () => void;
}) {
  const task = getTask(item.ref);
  if (!task) return null;

  const isActive = pathname === task.href || pathname.startsWith(task.href + '/');
  const Icon = task.icon;

  return (
    <li>
      <Link
        href={task.href}
        onClick={onClose}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          item.state === 'decaying' && 'opacity-60',
          item.state === 'seed' && !isActive && 'bg-amber-500/5 border border-amber-500/20',
        )}
      >
        <Icon className="h-5 w-5" />
        <span className="flex-1">{task.name}</span>
        {item.state === 'seed' && <Sparkles className="h-3.5 w-3.5 text-amber-500" />}
        {item.state === 'pushed' && <Lock className="h-3.5 w-3.5 text-muted-foreground/50" />}
        {item.pinned && item.state !== 'anchor' && <Pin className="h-3 w-3 text-blue-500/60" />}
        {task.badge && (
          <Badge variant={isActive ? 'secondary' : 'default'} className="h-5 text-xs">
            {task.badge}
          </Badge>
        )}
      </Link>
    </li>
  );
}

// =============================================================================
// HAMBURGER SHEET MENU — reads from composing store
// =============================================================================

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showOverflow, setShowOverflow] = useState(false);
  const pathname = usePathname();
  const { user } = useAuthStore();
  const store = useComposingMenuStore();
  const role = user?.role || 'learner';

  // Get items from the composing store
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

  // Separate by state
  const anchors = useMemo(
    () => visibleItems.filter((i: ComposingMenuItem) => i.state === 'anchor'),
    [visibleItems]
  );
  const activeItems = useMemo(
    () => visibleItems.filter((i: ComposingMenuItem) => i.state === 'active' || i.state === 'decaying' || i.state === 'pushed'),
    [visibleItems]
  );
  const seeds = useMemo(
    () => visibleItems.filter((i: ComposingMenuItem) => i.state === 'seed'),
    [visibleItems]
  );

  // Filter all items by search
  const filteredAnchors = useMemo(() => {
    if (!searchQuery.trim()) return anchors;
    const q = searchQuery.toLowerCase();
    return anchors.filter((item: ComposingMenuItem) => {
      const task = getTask(item.ref);
      return task && task.name.toLowerCase().includes(q);
    });
  }, [anchors, searchQuery]);

  const filteredActive = useMemo(() => {
    if (!searchQuery.trim()) return activeItems;
    const q = searchQuery.toLowerCase();
    return activeItems.filter((item: ComposingMenuItem) => {
      const task = getTask(item.ref);
      return task && task.name.toLowerCase().includes(q);
    });
  }, [activeItems, searchQuery]);

  const handleClose = () => setOpen(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-6 w-6" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <span className="text-lg font-bold">Scholarly</span>
          </SheetTitle>
        </SheetHeader>

        {/* Search */}
        <div className="px-4 py-3 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search navigation..."
              className="pl-9 h-9"
              value={searchQuery}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost" size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Role badge */}
        {user && (
          <div className="px-4 py-2 border-b">
            <div className="flex items-center gap-2 text-sm">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-muted-foreground capitalize">{user.role || 'Learner'}</span>
            </div>
          </div>
        )}

        {/* Navigation sections from composing store */}
        <nav className="flex-1 overflow-y-auto p-4 space-y-5" aria-label="Navigation menu">
          {/* Anchors */}
          {filteredAnchors.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Navigation
              </p>
              <ul className="space-y-0.5">
                {filteredAnchors.map((item: ComposingMenuItem) => (
                  <MobileMenuItem
                    key={item.ref}
                    item={item}
                    pathname={pathname}
                    onClose={handleClose}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Active / Decaying / Pushed items */}
          {filteredActive.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2">
                Your Menu
              </p>
              <ul className="space-y-0.5">
                {filteredActive.map((item: ComposingMenuItem) => (
                  <MobileMenuItem
                    key={item.ref}
                    item={item}
                    pathname={pathname}
                    onClose={handleClose}
                  />
                ))}
              </ul>
            </div>
          )}

          {/* Seeds */}
          {seeds.length > 0 && !searchQuery && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 px-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" />
                Suggested for you
              </p>
              <ul className="space-y-0.5">
                {seeds.map((item: ComposingMenuItem) => {
                  const task = getTask(item.ref);
                  if (!task) return null;
                  const Icon = task.icon;

                  return (
                    <li key={item.ref} className="flex items-center gap-1">
                      <Link
                        href={task.href}
                        onClick={handleClose}
                        className="flex-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors bg-amber-500/5 border border-amber-500/20"
                      >
                        <Icon className="h-5 w-5" />
                        <span className="flex-1">{task.name}</span>
                        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                      </Link>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => store.promoteSeed(role, item.ref)}
                        title="Add to menu"
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => store.dismissSeed(role, item.ref)}
                        title="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Overflow section */}
          {overflowItems.length > 0 && !searchQuery && (
            <div>
              <button
                onClick={() => setShowOverflow(!showOverflow)}
                className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 w-full"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">More ({overflowItems.length})</span>
                {showOverflow ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {showOverflow && (
                <ul className="mt-1 space-y-0.5">
                  {overflowItems.map((item: ComposingMenuItem) => {
                    const task = getTask(item.ref);
                    if (!task) return null;
                    const Icon = task.icon;
                    const daysAgo = item.lastUsed
                      ? Math.floor((Date.now() - new Date(item.lastUsed).getTime()) / (1000 * 60 * 60 * 24))
                      : null;

                    return (
                      <li key={item.ref} className="flex items-center gap-1">
                        <Link
                          href={task.href}
                          onClick={handleClose}
                          className="flex-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                        >
                          <Icon className="h-4 w-4" />
                          <span className="flex-1 truncate">{task.name}</span>
                          {daysAgo !== null && (
                            <span className="text-[10px] text-muted-foreground/50 shrink-0">{daysAgo}d</span>
                          )}
                        </Link>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => store.restoreItem(role, item.ref)}
                          title="Restore to menu"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Settings link */}
          <div className="pt-2 border-t">
            <Link
              href="/settings"
              onClick={handleClose}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                pathname === '/settings'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </div>
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-medium text-primary">
                  {user.firstName?.[0]}{user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
