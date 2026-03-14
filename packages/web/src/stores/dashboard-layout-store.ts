'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =============================================================================
// Generic page layout store factory
// =============================================================================

interface PageLayoutState<T extends string> {
  panelOrder: T[];
  setPanelOrder: (order: T[]) => void;
  resetOrder: () => void;
}

/**
 * Creates a Zustand store that persists panel order for a specific page.
 * Each page gets its own localStorage key so layouts are independent.
 *
 * Usage:
 *   const useMyPageLayout = createPageLayoutStore('my-page', ['panel-a', 'panel-b']);
 */
export function createPageLayoutStore<T extends string>(
  pageKey: string,
  defaultOrder: T[],
) {
  return create<PageLayoutState<T>>()(
    persist(
      (set) => ({
        panelOrder: defaultOrder,
        setPanelOrder: (order) => set({ panelOrder: order }),
        resetOrder: () => set({ panelOrder: defaultOrder }),
      }),
      {
        name: `scholarly-layout-${pageKey}`,
        // Migration guard: ensure saved layout contains all known panels
        merge: (persisted, current) => {
          const state = persisted as Partial<PageLayoutState<T>> | undefined;
          if (!state?.panelOrder) return current;

          // Keep saved panels that still exist, then append any new ones
          const saved = state.panelOrder.filter((id) =>
            (defaultOrder as string[]).includes(id),
          );
          const missing = defaultOrder.filter(
            (id) => !(saved as string[]).includes(id),
          );
          const merged = [...saved, ...missing] as T[];

          return { ...current, panelOrder: merged };
        },
      },
    ),
  );
}

// =============================================================================
// Page-specific stores
// =============================================================================

// Teacher dashboard panels
export type TeacherPanelId =
  | 'quick-actions'
  | 'stats-grid'
  | 'main-content'
  | 'at-risk-help'
  | 'upcoming-ai'
  | 'math-toolkit';

export const useTeacherDashboardLayout = createPageLayoutStore<TeacherPanelId>(
  'teacher-dashboard',
  ['quick-actions', 'stats-grid', 'main-content', 'at-risk-help', 'upcoming-ai', 'math-toolkit'],
);

// Admin dashboard panels
export type AdminPanelId =
  | 'kpi-stats'
  | 'alerts'
  | 'trends-staff'
  | 'students-compliance'
  | 'quick-actions'
  | 'system-health';

export const useAdminDashboardLayout = createPageLayoutStore<AdminPanelId>(
  'admin-dashboard',
  ['kpi-stats', 'alerts', 'trends-staff', 'students-compliance', 'quick-actions', 'system-health'],
);

// Parent dashboard panels
export type ParentPanelId =
  | 'progress-summary'
  | 'class-story'
  | 'upcoming-messages-payments'
  | 'reports';

export const useParentDashboardLayout = createPageLayoutStore<ParentPanelId>(
  'parent-dashboard',
  ['progress-summary', 'class-story', 'upcoming-messages-payments', 'reports'],
);

// Showcase panels
export type ShowcasePanelId =
  | 'stats'
  | 'featured-portfolio'
  | 'quick-actions';

export const useShowcaseDashboardLayout = createPageLayoutStore<ShowcasePanelId>(
  'showcase',
  ['stats', 'featured-portfolio', 'quick-actions'],
);
