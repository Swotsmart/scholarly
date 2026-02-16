'use client';

// =============================================================================
// SIDEBAR STORE — BACKWARD COMPATIBILITY SHIM
// =============================================================================
// This file preserves the original useSidebarStore export so that any
// components that haven't been migrated yet continue to work.
//
// The actual state now lives in composing-menu-store.ts.
// This shim maps the old API (collapsed, favorites, showAdvanced) to the
// new composing menu system.
//
// Original 41-line store preserved at sidebar-store.ts.original
// =============================================================================

export { useSidebarStore } from './composing-menu-store';
