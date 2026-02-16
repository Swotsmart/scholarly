'use client';

// =============================================================================
// MENU SETTINGS PAGE
// =============================================================================
// The "control panel" for the self-composing interface. While the sidebar
// adapts automatically, this page gives users full transparency into what's
// happening and manual control when they want it.
//
// Uses shadcn/ui Tabs to group items into: Active, Seeds, Overflow, Pushed.
// Each item renders as a Card-like row with drag handle, icon, label,
// metadata, and action buttons. A footer Card shows sync status.
// =============================================================================

import React, { useState, useCallback, useMemo } from 'react';
import {
  Pin,
  PinOff,
  Lock,
  GripVertical,
  RotateCcw,
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  Sparkles,
  AlertTriangle,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { PageHeader } from '@/components/shared/page-header';

// =============================================================================
// TYPES
// =============================================================================

export interface MenuSettingsItem {
  ref: string;
  label: string;
  icon: string;
  state: 'anchor' | 'active' | 'seeded' | 'decaying' | 'overflow' | 'pushed' | 'removed';
  pinned: boolean;
  lastUsed: string | null;
  useCount: number;
  position: number;
  addedAt: string;
  decayStartedAt: string | null;
  pushReason: string | null;
  pushExpiry: string | null;
}

export interface MenuSettingsPageProps {
  /** All menu items across all states for the current role. */
  items: MenuSettingsItem[];

  /** The current role label (e.g., "Teacher"). */
  roleLabel: string;

  /** Sync status from useMenuSync. */
  syncStatus: {
    isSyncing: boolean;
    isOnline: boolean;
    hasPendingChanges: boolean;
    lastSyncResult: { version: number; summary: string } | null;
    localVersion: number;
  };

  // -- Actions --
  onReorder: (ref: string, newPosition: number) => void;
  onPin: (ref: string) => void;
  onUnpin: (ref: string) => void;
  onRestore: (ref: string) => void;
  onRemove: (ref: string) => void;
  onTriggerSync: () => Promise<void>;
}

// =============================================================================
// HELPERS
// =============================================================================

function timeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';

  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes > 1 ? 's' : ''} ago`;
  return 'Just now';
}

function decayDaysRemaining(decayStartedAt: string | null): number | null {
  if (!decayStartedAt) return null;

  const started = new Date(decayStartedAt).getTime();
  const decayPeriodMs = 30 * 24 * 60 * 60 * 1000; // 30 days
  const elapsed = Date.now() - started;
  const remaining = Math.ceil((decayPeriodMs - elapsed) / (24 * 60 * 60 * 1000));

  return Math.max(0, remaining);
}

function formatExpiry(expiryStr: string | null): string {
  if (!expiryStr) return 'No expiry';

  const remaining = Math.ceil(
    (new Date(expiryStr).getTime() - Date.now()) / (24 * 60 * 60 * 1000),
  );

  if (remaining <= 0) return 'Expired';
  if (remaining === 1) return 'Expires tomorrow';
  return `Expires in ${remaining} days`;
}

// =============================================================================
// ITEM ROW COMPONENT
// =============================================================================

interface ItemRowProps {
  item: MenuSettingsItem;
  draggable: boolean;
  showPin: boolean;
  showRemove: boolean;
  showRestore: boolean;
  subtitle: string;
  badge?: { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' | 'warning' };
  isDragging: boolean;
  isConfirmingRemove: boolean;
  onDragStart: (ref: string) => void;
  onDragOver: (e: React.DragEvent, ref: string) => void;
  onDragEnd: () => void;
  onPin: (ref: string) => void;
  onUnpin: (ref: string) => void;
  onRestore: (ref: string) => void;
  onRemoveClick: (ref: string) => void;
}

function ItemRow({
  item,
  draggable,
  showPin,
  showRemove,
  showRestore,
  subtitle,
  badge,
  isDragging,
  isConfirmingRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
  onPin,
  onUnpin,
  onRestore,
  onRemoveClick,
}: ItemRowProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border bg-card p-3 transition-colors',
        isDragging && 'opacity-50 border-dashed border-primary',
        draggable && 'cursor-grab active:cursor-grabbing',
      )}
      draggable={draggable}
      onDragStart={draggable ? () => onDragStart(item.ref) : undefined}
      onDragOver={draggable ? (e) => onDragOver(e, item.ref) : undefined}
      onDragEnd={draggable ? onDragEnd : undefined}
      role="listitem"
    >
      {/* Drag handle */}
      {draggable && (
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      )}

      {/* Icon */}
      <span className="shrink-0 text-base" aria-hidden="true">
        {item.icon}
      </span>

      {/* Label + subtitle */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium">{item.label}</span>
          {badge && (
            <Badge variant={badge.variant} className="shrink-0">
              {badge.label}
            </Badge>
          )}
        </div>
        <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-2">
        {showPin && (
          <div className="flex items-center gap-2">
            <label
              htmlFor={`pin-${item.ref}`}
              className="text-xs text-muted-foreground"
            >
              {item.pinned ? (
                <Pin className="h-3.5 w-3.5" />
              ) : (
                <PinOff className="h-3.5 w-3.5" />
              )}
            </label>
            <Switch
              id={`pin-${item.ref}`}
              checked={item.pinned}
              onCheckedChange={(checked) => {
                if (checked) {
                  onPin(item.ref);
                } else {
                  onUnpin(item.ref);
                }
              }}
              aria-label={item.pinned ? `Unpin ${item.label}` : `Pin ${item.label}`}
            />
          </div>
        )}
        {showRestore && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onRestore(item.ref)}
            aria-label={`Restore ${item.label} to menu`}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Restore
          </Button>
        )}
        {showRemove && (
          <Button
            variant={isConfirmingRemove ? 'destructive' : 'ghost'}
            size={isConfirmingRemove ? 'sm' : 'icon-sm'}
            onClick={() => onRemoveClick(item.ref)}
            aria-label={
              isConfirmingRemove
                ? `Confirm remove ${item.label}`
                : `Remove ${item.label}`
            }
          >
            {isConfirmingRemove ? (
              'Confirm?'
            ) : (
              <X className="h-4 w-4" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// SECTION COMPONENT
// =============================================================================

interface ItemSectionProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}

function ItemSection({ title, description, icon, count, children }: ItemSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          {icon}
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge variant="secondary" className="ml-1">
            {count}
          </Badge>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col gap-2" role="list">
          {children}
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function MenuSettingsPage({
  items,
  roleLabel,
  syncStatus,
  onReorder,
  onPin,
  onUnpin,
  onRestore,
  onRemove,
  onTriggerSync,
}: MenuSettingsPageProps) {
  const [draggedRef, setDraggedRef] = useState<string | null>(null);
  const [confirmRemoveRef, setConfirmRemoveRef] = useState<string | null>(null);

  // -- Group items by state --

  const grouped = useMemo(() => {
    const anchors = items
      .filter(i => i.state === 'anchor')
      .sort((a, b) => a.position - b.position);

    const active = items
      .filter(i => i.state === 'active')
      .sort((a, b) => a.position - b.position);

    const decaying = items
      .filter(i => i.state === 'decaying')
      .sort((a, b) => {
        const aRemain = decayDaysRemaining(a.decayStartedAt) ?? 999;
        const bRemain = decayDaysRemaining(b.decayStartedAt) ?? 999;
        return aRemain - bRemain;
      });

    const seeded = items.filter(i => i.state === 'seeded');

    const pushed = items.filter(i => i.state === 'pushed');

    const overflow = items
      .filter(i => i.state === 'overflow')
      .sort((a, b) => {
        const aTime = a.lastUsed ? new Date(a.lastUsed).getTime() : 0;
        const bTime = b.lastUsed ? new Date(b.lastUsed).getTime() : 0;
        return bTime - aTime;
      });

    return { anchors, active, decaying, seeded, pushed, overflow };
  }, [items]);

  // -- Drag handlers --

  const handleDragStart = useCallback((ref: string) => {
    setDraggedRef(ref);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetRef: string) => {
    e.preventDefault();
    if (!draggedRef || draggedRef === targetRef) return;

    const target = items.find(i => i.ref === targetRef);
    if (target) {
      onReorder(draggedRef, target.position);
    }
  }, [draggedRef, items, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDraggedRef(null);
  }, []);

  // -- Remove with confirmation --

  const handleRemoveClick = useCallback((ref: string) => {
    if (confirmRemoveRef === ref) {
      onRemove(ref);
      setConfirmRemoveRef(null);
    } else {
      setConfirmRemoveRef(ref);
    }
  }, [confirmRemoveRef, onRemove]);

  // -- Shared row props --

  const sharedRowProps = {
    isDragging: false,
    isConfirmingRemove: false,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDragEnd: handleDragEnd,
    onPin,
    onUnpin,
    onRestore,
    onRemoveClick: handleRemoveClick,
  };

  // -- Tab counts for badges --

  const activeCount = grouped.anchors.length + grouped.active.length + grouped.decaying.length;
  const seedsCount = grouped.seeded.length;
  const overflowCount = grouped.overflow.length;
  const pushedCount = grouped.pushed.length;

  // -- Render --

  return (
    <div className="flex flex-col gap-6" role="region" aria-label="Menu Settings">
      {/* Header */}
      <PageHeader
        title="Menu Settings"
        description={`Manage your ${roleLabel} navigation. Drag to reorder, pin to keep, or restore items from overflow.`}
        actions={
          <div className="flex items-center gap-3">
            {syncStatus.isOnline ? (
              <Wifi className="h-4 w-4 text-green-500" />
            ) : (
              <WifiOff className="h-4 w-4 text-red-500" />
            )}
            {syncStatus.hasPendingChanges && (
              <Badge variant="warning">Unsaved</Badge>
            )}
          </div>
        }
      />

      {/* Empty state */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
            <Sparkles className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm font-medium">Your menu will populate as you use the platform.</p>
            <p className="text-sm text-muted-foreground">
              Start exploring features to build your personalised navigation.
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Tabbed content */
        <Tabs defaultValue="active">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="active" className="gap-1.5">
              Active
              {activeCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="seeds" className="gap-1.5">
              Seeds
              {seedsCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {seedsCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="overflow" className="gap-1.5">
              Overflow
              {overflowCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {overflowCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="pushed" className="gap-1.5">
              Pushed
              {pushedCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                  {pushedCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* ── Active Tab ── */}
          <TabsContent value="active" className="flex flex-col gap-4">
            {/* Anchors */}
            {grouped.anchors.length > 0 && (
              <ItemSection
                title="Anchors"
                description="Your core items. These are always visible in your navigation."
                icon={<Pin className="h-4 w-4 text-primary" />}
                count={grouped.anchors.length}
              >
                {grouped.anchors.map(item => (
                  <ItemRow
                    key={item.ref}
                    item={item}
                    draggable
                    showPin
                    showRemove={false}
                    showRestore={false}
                    subtitle={`Used ${item.useCount} times · ${timeAgo(item.lastUsed)}`}
                    badge={{ label: 'Anchor', variant: 'default' }}
                    {...sharedRowProps}
                    isDragging={draggedRef === item.ref}
                    isConfirmingRemove={confirmRemoveRef === item.ref}
                  />
                ))}
              </ItemSection>
            )}

            {/* Active items */}
            {grouped.active.length > 0 && (
              <ItemSection
                title="Active Items"
                description="Items you use regularly. Pin them to prevent decay."
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                count={grouped.active.length}
              >
                {grouped.active.map(item => (
                  <ItemRow
                    key={item.ref}
                    item={item}
                    draggable
                    showPin
                    showRemove
                    showRestore={false}
                    subtitle={`Used ${item.useCount} times · Last: ${timeAgo(item.lastUsed)}`}
                    {...sharedRowProps}
                    isDragging={draggedRef === item.ref}
                    isConfirmingRemove={confirmRemoveRef === item.ref}
                  />
                ))}
              </ItemSection>
            )}

            {/* Decaying items */}
            {grouped.decaying.length > 0 && (
              <ItemSection
                title="Decaying"
                description="These items haven't been used recently and will move to overflow unless pinned or used again."
                icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
                count={grouped.decaying.length}
              >
                {grouped.decaying.map(item => {
                  const daysLeft = decayDaysRemaining(item.decayStartedAt);
                  return (
                    <ItemRow
                      key={item.ref}
                      item={item}
                      draggable={false}
                      showPin
                      showRemove
                      showRestore={false}
                      subtitle={
                        daysLeft !== null
                          ? `${daysLeft} day${daysLeft !== 1 ? 's' : ''} until overflow · Last: ${timeAgo(item.lastUsed)}`
                          : `Decaying · Last: ${timeAgo(item.lastUsed)}`
                      }
                      badge={{
                        label: daysLeft !== null ? `${daysLeft}d left` : 'Decaying',
                        variant: (daysLeft !== null && daysLeft <= 7) ? 'destructive' : 'warning',
                      }}
                      {...sharedRowProps}
                      isDragging={draggedRef === item.ref}
                      isConfirmingRemove={confirmRemoveRef === item.ref}
                    />
                  );
                })}
              </ItemSection>
            )}

            {/* Empty active state */}
            {grouped.anchors.length === 0 && grouped.active.length === 0 && grouped.decaying.length === 0 && (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No active menu items yet. Start using features to populate your navigation.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Seeds Tab ── */}
          <TabsContent value="seeds" className="flex flex-col gap-4">
            {grouped.seeded.length > 0 ? (
              <ItemSection
                title="Suggested Items"
                description="Items suggested for you based on your role and activity patterns."
                icon={<Sparkles className="h-4 w-4 text-primary" />}
                count={grouped.seeded.length}
              >
                {grouped.seeded.map(item => (
                  <ItemRow
                    key={item.ref}
                    item={item}
                    draggable={false}
                    showPin
                    showRemove
                    showRestore={false}
                    subtitle={`Suggested · Added: ${timeAgo(item.addedAt)}`}
                    badge={{ label: 'Seed', variant: 'secondary' }}
                    {...sharedRowProps}
                    isDragging={draggedRef === item.ref}
                    isConfirmingRemove={confirmRemoveRef === item.ref}
                  />
                ))}
              </ItemSection>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No suggested items right now. Suggestions appear based on your role and usage patterns.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Overflow Tab ── */}
          <TabsContent value="overflow" className="flex flex-col gap-4">
            {grouped.overflow.length > 0 ? (
              <ItemSection
                title="Overflow"
                description="Items that moved here due to inactivity. Restore them to bring them back to your menu."
                icon={<Clock className="h-4 w-4 text-muted-foreground" />}
                count={grouped.overflow.length}
              >
                {grouped.overflow.map(item => (
                  <ItemRow
                    key={item.ref}
                    item={item}
                    draggable={false}
                    showPin={false}
                    showRemove
                    showRestore
                    subtitle={`Last used: ${timeAgo(item.lastUsed)} · Used ${item.useCount} times`}
                    badge={{ label: 'Overflow', variant: 'outline' }}
                    {...sharedRowProps}
                    isDragging={draggedRef === item.ref}
                    isConfirmingRemove={confirmRemoveRef === item.ref}
                  />
                ))}
              </ItemSection>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No overflow items. Items that haven't been used for a while will appear here.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ── Pushed Tab ── */}
          <TabsContent value="pushed" className="flex flex-col gap-4">
            {grouped.pushed.length > 0 ? (
              <ItemSection
                title="Required by Your School"
                description="These items are required by your institution and cannot be removed."
                icon={<Lock className="h-4 w-4 text-muted-foreground" />}
                count={grouped.pushed.length}
              >
                {grouped.pushed.map(item => (
                  <ItemRow
                    key={item.ref}
                    item={item}
                    draggable={false}
                    showPin={false}
                    showRemove={false}
                    showRestore={false}
                    subtitle={`${item.pushReason ?? 'Required'} · ${formatExpiry(item.pushExpiry)}`}
                    badge={{ label: 'Required', variant: 'default' }}
                    {...sharedRowProps}
                    isDragging={draggedRef === item.ref}
                    isConfirmingRemove={confirmRemoveRef === item.ref}
                  />
                ))}
              </ItemSection>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
                  <Lock className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    No institution-required items at this time.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Sync status footer */}
      <Separator />
      <Card>
        <CardContent className="flex items-center gap-3 p-4">
          <div className={cn("h-2 w-2 rounded-full", syncStatus.isOnline ? "bg-green-500" : "bg-red-500")} />
          <span className="text-sm text-muted-foreground">
            Last synced: {syncStatus.lastSyncResult ? `v${syncStatus.localVersion}` : 'Never'}
          </span>
          {syncStatus.hasPendingChanges && (
            <Badge variant="outline" className="text-xs">
              Pending changes
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={onTriggerSync}
            disabled={syncStatus.isSyncing || !syncStatus.isOnline}
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", syncStatus.isSyncing && "animate-spin")} />
            {syncStatus.isSyncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
