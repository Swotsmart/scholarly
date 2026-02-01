'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SidebarState {
  // Sidebar collapse state
  collapsed: boolean;
  toggleCollapsed: () => void;

  // Favorites — persisted navigation shortcuts
  favorites: string[];
  toggleFavorite: (href: string) => void;

  // Advanced sections visibility
  showAdvanced: boolean;
  toggleAdvanced: () => void;
}

export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      collapsed: false,
      toggleCollapsed: () => set(state => ({ collapsed: !state.collapsed })),

      favorites: [],
      toggleFavorite: (href: string) =>
        set(state => ({
          favorites: state.favorites.includes(href)
            ? state.favorites.filter(f => f !== href)
            : [...state.favorites, href],
        })),

      showAdvanced: false,
      toggleAdvanced: () => set(state => ({ showAdvanced: !state.showAdvanced })),
    }),
    {
      name: 'scholarly-sidebar',
    }
  )
);
