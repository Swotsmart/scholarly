/**
 * ============================================================================
 * Protected Reader — React Component
 * ============================================================================
 *
 * This component wraps the ProtectedReaderController in React's declarative
 * lifecycle. Think of the controller as the engine of a car and this component
 * as the dashboard: the engine does the real work (rendering pages, managing
 * sessions, compositing overlays), while the dashboard displays the current
 * state to the driver and relays their inputs back to the engine.
 *
 * ## Lifecycle Mapping
 *
 *   React mount   → controller.start()   → begins heartbeat, loads page 1
 *   React unmount → controller.stop()    → cleans timers, ends session
 *   State change  → controller callback  → triggers React re-render
 *   User input    → controller methods   → goToPage, nextPage, previousPage
 *
 * ## Event Listeners
 *
 * The component attaches browser event listeners for:
 *   - visibilitychange: blur reader when tab is hidden (deters tab-switch screenshots)
 *   - contextmenu: prevent right-click → "Save Image As"
 *   - keydown: block Ctrl+S, Ctrl+P, PrintScreen
 *
 * These are the "museum guard" layer — they don't prevent a determined attacker
 * but they block the most common casual content capture workflows.
 *
 * ## Usage
 *
 *   import { ProtectedReader } from './protected-reader.component';
 *
 *   <ProtectedReader
 *     sessionId="sess_abc123"
 *     totalPages={24}
 *     apiBaseUrl="/api/v1/content-protection"
 *     authToken={bearerToken}
 *     onSessionExpired={() => navigate('/library')}
 *   />
 *
 * @module erudits/components/protected-reader-component
 * @version 1.0.0
 */

// ── DOM type stubs ──
// This module is designed for browser execution but compiles in a Node
// tsconfig without lib: ["dom"]. We declare the minimal DOM surface
// used, keeping the Node compilation clean.
declare const document: {
  hidden: boolean;
  addEventListener(type: string, listener: (e: unknown) => void, capture?: boolean): void;
  removeEventListener(type: string, listener: (e: unknown) => void, capture?: boolean): void;
};

interface DOMKeyboardEvent {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

// ============================================================================
// TYPES — React dependency injection
// ============================================================================
// We accept React as a type parameter rather than importing it directly,
// keeping this module decoupled from any specific React version and
// testable without a full React runtime.

/**
 * Minimal React API surface we need. This is satisfied by React 17+
 * and any compatible implementation (Preact, etc.).
 */
export interface ReactLike {
  createElement: (
    type: string | ((...args: unknown[]) => unknown),
    props: Record<string, unknown> | null,
    ...children: unknown[]
  ) => unknown;
  useState: <T>(initial: T) => [T, (value: T | ((prev: T) => T)) => void];
  useEffect: (effect: () => void | (() => void), deps?: unknown[]) => void;
  useCallback: <T extends (...args: unknown[]) => unknown>(fn: T, deps: unknown[]) => T;
  useRef: <T>(initial: T) => { current: T };
}

import type {
  ProtectedReaderProps,
  ReaderState,
  PageState,
} from './protected-reader';

import {
  ProtectedReaderController,
  READER_CONTAINER_STYLES,
  PAGE_IMAGE_STYLES,
  BLUR_OVERLAY_STYLES,
  OVERLAY_STYLES,
} from './protected-reader';

// ============================================================================
// COMPONENT PROPS
// ============================================================================

export interface ProtectedReaderComponentProps extends ProtectedReaderProps {
  /** Optional CSS class for the container element. */
  className?: string | undefined;
  /** Optional inline styles merged with protection styles. */
  style?: Record<string, string> | undefined;
  /** Show page navigation controls. Default: true. */
  showNavigation?: boolean | undefined;
  /** Show page counter (e.g., "3 / 24"). Default: true. */
  showPageCounter?: boolean | undefined;
}

// ============================================================================
// BLOCKED KEY COMBOS
// ============================================================================

/** Keyboard shortcuts that could capture content. */
const BLOCKED_KEYS: Array<{ key: string; ctrl?: boolean; meta?: boolean; shift?: boolean }> = [
  { key: 's', ctrl: true },         // Ctrl+S — Save page
  { key: 's', meta: true },         // Cmd+S (Mac)
  { key: 'p', ctrl: true },         // Ctrl+P — Print
  { key: 'p', meta: true },         // Cmd+P (Mac)
  { key: 'PrintScreen' },           // PrintScreen key
  { key: 'S', ctrl: true, shift: true }, // Ctrl+Shift+S — Save As
  { key: 'S', meta: true, shift: true }, // Cmd+Shift+S (Mac)
  { key: 'i', ctrl: true, shift: true }, // Ctrl+Shift+I — DevTools
  { key: 'u', ctrl: true },         // Ctrl+U — View Source
];

// ============================================================================
// COMPONENT FACTORY
// ============================================================================

/**
 * Create the ProtectedReader React component.
 *
 * We use a factory pattern because the component needs React as a
 * dependency, but we don't want to import it at module level (which
 * would create a hard dependency on a specific React version/package).
 *
 * Usage:
 *   import React from 'react';
 *   import { createProtectedReaderComponent } from './protected-reader.component';
 *
 *   const ProtectedReader = createProtectedReaderComponent(React);
 *
 *   // Then use it like any other React component:
 *   <ProtectedReader sessionId="..." totalPages={24} ... />
 */
export function createProtectedReaderComponent(React: ReactLike) {
  const { createElement: h, useState, useEffect, useCallback, useRef } = React;

  return function ProtectedReader(props: ProtectedReaderComponentProps) {
    const {
      className,
      style,
      showNavigation = true,
      showPageCounter = true,
      ...controllerProps
    } = props;

    // ── State ──
    const [readerState, setReaderState] = useState<ReaderState>({
      currentPage: 1,
      pages: new Map<number, PageState>(),
      isBlurred: false,
      sessionActive: true,
      overlayPosition: { top: '50%', left: '50%', rotation: '0deg' },
    });

    const controllerRef = useRef<ProtectedReaderController | null>(null);
    const containerRef = useRef<unknown>(null);

    // ── Controller lifecycle ──
    useEffect(() => {
      const controller = new ProtectedReaderController(controllerProps);
      controllerRef.current = controller;

      controller.start((newState: ReaderState) => {
        setReaderState(newState);
      });

      return () => {
        controller.stop().catch(() => {/* best-effort cleanup */});
        controllerRef.current = null;
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps — props are stable for session lifetime
    }, [controllerProps.sessionId]);

    // ── Browser event listeners ──
    useEffect(() => {
      // Visibility change — blur when tab hidden
      const handleVisibility = () => {
        if (document.hidden && controllerRef.current) {
          controllerRef.current.onBlur();
        } else if (controllerRef.current) {
          controllerRef.current.onFocus();
        }
      };

      // Context menu — prevent right-click save
      const handleContextMenu = (e: unknown) => {
        (e as { preventDefault(): void }).preventDefault();
      };

      // Keyboard — block capture shortcuts
      const handleKeydown = (e: unknown) => {
        const ke = e as DOMKeyboardEvent;
        for (const combo of BLOCKED_KEYS) {
          const keyMatch = ke.key.toLowerCase() === combo.key.toLowerCase();
          const ctrlMatch = combo.ctrl ? (ke.ctrlKey || ke.metaKey) : true;
          const metaMatch = combo.meta ? ke.metaKey : true;
          const shiftMatch = combo.shift ? ke.shiftKey : true;

          if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
            ke.preventDefault();
            ke.stopPropagation();
            return;
          }
        }
      };

      document.addEventListener('visibilitychange', handleVisibility);
      document.addEventListener('contextmenu', handleContextMenu);
      document.addEventListener('keydown', handleKeydown, true);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibility);
        document.removeEventListener('contextmenu', handleContextMenu);
        document.removeEventListener('keydown', handleKeydown, true);
      };
    }, []);

    // ── Navigation callbacks ──
    const goNext = useCallback(() => {
      controllerRef.current?.nextPage();
    }, []) as () => void;

    const goPrev = useCallback(() => {
      controllerRef.current?.previousPage();
    }, []) as () => void;

    // ── Current page data ──
    const currentPageState = readerState.pages.get(readerState.currentPage);
    const isLoading = currentPageState?.loading ?? true;
    const hasError = currentPageState?.error ?? null;
    const imageUrl = currentPageState?.imageDataUrl ?? '';

    // ── Render ──
    const containerStyles = {
      ...READER_CONTAINER_STYLES,
      ...style,
    };

    return h('div', {
      ref: containerRef,
      className: className ?? 'protected-reader',
      style: containerStyles,
      'data-testid': 'protected-reader',
    },
      // Page image
      !isLoading && !hasError && imageUrl
        ? h('img', {
            src: imageUrl,
            style: PAGE_IMAGE_STYLES,
            draggable: false,
            alt: `Page ${readerState.currentPage}`,
            'data-testid': 'reader-page-image',
          })
        : null,

      // Loading spinner
      isLoading
        ? h('div', {
            style: { color: '#ffffff', fontSize: '18px' },
            'data-testid': 'reader-loading',
          }, `Loading page ${readerState.currentPage}...`)
        : null,

      // Error message
      hasError
        ? h('div', {
            style: { color: '#ff6b6b', fontSize: '16px', textAlign: 'center' as const, padding: '20px' },
            'data-testid': 'reader-error',
          }, `Error: ${hasError}`)
        : null,

      // Anti-screenshot overlay (always present, semi-transparent)
      readerState.sessionActive
        ? h('div', {
            style: {
              ...OVERLAY_STYLES,
              top: readerState.overlayPosition.top,
              left: readerState.overlayPosition.left,
              transform: `rotate(${readerState.overlayPosition.rotation})`,
            },
            'data-testid': 'reader-overlay',
          }, controllerProps.overlayHtml ?? '')
        : null,

      // Blur overlay (shown when window loses focus)
      readerState.isBlurred
        ? h('div', {
            style: BLUR_OVERLAY_STYLES,
            'data-testid': 'reader-blur-overlay',
          }, h('div', {
            style: { color: '#ffffff', fontSize: '24px', textAlign: 'center' as const },
          }, 'Content hidden — return to this tab to continue reading'))
        : null,

      // Navigation controls
      showNavigation
        ? h('div', {
            style: {
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '16px',
              padding: '12px',
              position: 'absolute' as const,
              bottom: '0',
              left: '0',
              right: '0',
              background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
            },
            'data-testid': 'reader-navigation',
          },
          h('button', {
            onClick: goPrev,
            disabled: readerState.currentPage <= 1,
            style: { padding: '8px 16px', cursor: 'pointer' },
            'data-testid': 'reader-prev-button',
          }, '← Previous'),

          showPageCounter
            ? h('span', {
                style: { color: '#ffffff', fontSize: '14px' },
                'data-testid': 'reader-page-counter',
              }, `${readerState.currentPage} / ${controllerProps.totalPages}`)
            : null,

          h('button', {
            onClick: goNext,
            disabled: readerState.currentPage >= controllerProps.totalPages,
            style: { padding: '8px 16px', cursor: 'pointer' },
            'data-testid': 'reader-next-button',
          }, 'Next →'),
        )
        : null,
    );
  };
}

// ============================================================================
// CONVENIENCE RE-EXPORTS
// ============================================================================

export { READER_CONTAINER_STYLES, PAGE_IMAGE_STYLES, BLUR_OVERLAY_STYLES, OVERLAY_STYLES };
export type { ProtectedReaderProps, ReaderState, PageState };
