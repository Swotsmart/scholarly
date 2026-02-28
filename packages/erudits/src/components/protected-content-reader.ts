/**
 * ============================================================================
 * ProtectedContentReader — React Component
 * ============================================================================
 *
 * This component wraps the framework-agnostic ProtectedReaderController in
 * React lifecycle management, providing a drop-in reader widget for the
 * Érudits storefront.
 *
 * Think of it as the steering wheel on a car: the engine (controller) does
 * all the real work — session management, page loading, heartbeats, overlay
 * rotation — but the driver interacts through the steering wheel, pedals,
 * and dashboard (this React component). The driver never touches the engine
 * directly; the steering column translates their intent into mechanical action.
 *
 * ## Usage
 *
 * ```tsx
 * import { ProtectedContentReader } from './protected-content-reader';
 *
 * function BookViewer({ sessionId, totalPages, authToken }) {
 *   return (
 *     <ProtectedContentReader
 *       sessionId={sessionId}
 *       totalPages={totalPages}
 *       apiBaseUrl="/api/v1/content-protection"
 *       authToken={authToken}
 *       onSessionExpired={() => router.push('/library')}
 *       onError={(err) => toast.error(err.message)}
 *     />
 *   );
 * }
 * ```
 *
 * ## Security Layers (DOM-level)
 *
 * The component installs event listeners that form the "glass case" around
 * the content:
 *   - contextmenu: Blocked (prevents right-click → Save Image As)
 *   - keydown: Blocks Ctrl+S, Ctrl+P, PrintScreen, Ctrl+Shift+I
 *   - visibilitychange: Triggers blur overlay when tab loses focus
 *   - focus/blur: Triggers blur overlay when window loses focus
 *
 * These are deterrents, not guarantees — a determined user with dev tools
 * can bypass them. The real protection is server-side (encrypted PDFs,
 * rendered-image delivery, steganographic fingerprinting). The DOM layer
 * just raises the effort bar for casual capture.
 *
 * @module erudits/components/protected-content-reader
 * @version 1.0.0
 */

// ── React types (minimal interface for DI, no hard React dependency) ──
// In production, these come from 'react'. We define the minimal shapes
// here so the module compiles without requiring React as a dependency
// in the test/build environment.

export interface ReactRef<T> {
  current: T | null;
}

export interface ReactHooks {
  useState<T>(initial: T): [T, (value: T | ((prev: T) => T)) => void];
  useEffect(effect: () => void | (() => void), deps?: unknown[]): void;
  useRef<T>(initial: T): ReactRef<T>;
  useCallback<T extends (...args: unknown[]) => unknown>(fn: T, deps: unknown[]): T;
}

/**
 * Minimal DOM interface subset — injected rather than referenced globally.
 * This keeps the Node.js project free from the `dom` lib while allowing
 * the browser component to compile and be tested with mocks.
 */
export interface DomEnvironment {
  document: {
    hidden: boolean;
    addEventListener(type: string, handler: (e: unknown) => void): void;
    removeEventListener(type: string, handler: (e: unknown) => void): void;
  };
  window: {
    addEventListener(type: string, handler: (e: unknown) => void): void;
    removeEventListener(type: string, handler: (e: unknown) => void): void;
  };
}

export interface KeyboardEventLike {
  key: string;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

// ── Imports from the controller ──
import {
  ProtectedReaderController,
  READER_CONTAINER_STYLES,
  PAGE_IMAGE_STYLES,
  BLUR_OVERLAY_STYLES,
  OVERLAY_STYLES,
  NAVIGATION_STYLES,
} from './protected-reader';
import type {
  ProtectedReaderProps,
  ReaderState,
} from './protected-reader';

export type { ProtectedReaderProps, ReaderState };

// ============================================================================
// BLOCKED KEY COMBINATIONS
// ============================================================================

/**
 * Key combinations blocked during reader sessions.
 *
 * Each entry specifies modifier keys (ctrl/alt/shift/meta) and the key code.
 * When a matching combination is detected, preventDefault() is called to
 * stop the browser's default action (saving, printing, dev tools, etc.).
 */
interface BlockedKeyCombination {
  key: string;
  ctrl?: boolean | undefined;
  shift?: boolean | undefined;
  alt?: boolean | undefined;
  meta?: boolean | undefined;
}

export const BLOCKED_KEY_COMBINATIONS: BlockedKeyCombination[] = [
  // Save shortcuts
  { key: 's', ctrl: true },
  { key: 's', meta: true },

  // Print shortcuts
  { key: 'p', ctrl: true },
  { key: 'p', meta: true },

  // Dev tools
  { key: 'i', ctrl: true, shift: true },   // Chrome/Firefox
  { key: 'j', ctrl: true, shift: true },   // Chrome console
  { key: 'u', ctrl: true },                // View source
  { key: 'F12', ctrl: false },             // Dev tools toggle

  // Screenshot (best-effort — most OS-level shortcuts can't be intercepted)
  { key: 'PrintScreen', ctrl: false },
];

// ============================================================================
// HOOK: useProtectedReader
// ============================================================================

/**
 * Core hook that manages the ProtectedReaderController lifecycle.
 *
 * Returns the current reader state and navigation functions. This is
 * the "nervous system" connecting the React component's render cycle
 * to the controller's internal state machine.
 *
 * Separated as a hook so it can be tested independently of the DOM
 * rendering layer.
 */
export function createUseProtectedReader(hooks: ReactHooks, dom: DomEnvironment) {
  return function useProtectedReader(props: ProtectedReaderProps) {
    const { useState, useEffect, useRef, useCallback } = hooks;

    const [state, setState] = useState<ReaderState>({
      currentPage: 1,
      pages: new Map(),
      isBlurred: false,
      sessionActive: true,
      overlayPosition: { top: '50%', left: '50%', rotation: '0deg' },
    });

    const controllerRef = useRef<ProtectedReaderController | null>(null);

    // ── Mount: create controller, start session ──
    useEffect(() => {
      const controller = new ProtectedReaderController(props);
      controllerRef.current = controller;

      controller.start((newState: ReaderState) => {
        setState(newState);
      });

      // Load the first page
      controller.goToPage(1).catch((err: unknown) => {
        props.onError?.(err instanceof Error ? err : new Error(String(err)));
      });

      // ── Unmount: stop controller, clean up ──
      return () => {
        controller.stop().catch(() => {/* swallow cleanup errors */});
        controllerRef.current = null;
      };
    }, [props.sessionId]); // Re-mount if session changes

    // ── Focus/blur detection ──
    useEffect(() => {
      if (props.focusBlurEnabled === false) return;

      const handleVisibilityChange = () => {
        const controller = controllerRef.current;
        if (!controller) return;

        if (dom.document.hidden) {
          controller.onBlur();
        } else {
          controller.onFocus();
        }
      };

      const handleFocus = () => controllerRef.current?.onFocus();
      const handleBlur = () => controllerRef.current?.onBlur();

      dom.document.addEventListener('visibilitychange', handleVisibilityChange);
      dom.window.addEventListener('focus', handleFocus);
      dom.window.addEventListener('blur', handleBlur);

      return () => {
        dom.document.removeEventListener('visibilitychange', handleVisibilityChange);
        dom.window.removeEventListener('focus', handleFocus);
        dom.window.removeEventListener('blur', handleBlur);
      };
    }, [props.focusBlurEnabled]);

    // ── Context menu blocking ──
    useEffect(() => {
      const handleContextMenu = (e: unknown) => {
        if (e && typeof e === 'object' && 'preventDefault' in e) {
          (e as { preventDefault(): void }).preventDefault();
        }
        return false;
      };

      dom.document.addEventListener('contextmenu', handleContextMenu);
      return () => dom.document.removeEventListener('contextmenu', handleContextMenu);
    }, []);

    // ── Keyboard shortcut blocking ──
    useEffect(() => {
      const handleKeydown = (e: unknown) => {
        const event = e as KeyboardEventLike;
        for (const combo of BLOCKED_KEY_COMBINATIONS) {
          const ctrlMatch = combo.ctrl ? (event.ctrlKey || event.metaKey) : true;
          const shiftMatch = combo.shift ? event.shiftKey : !event.shiftKey || combo.shift === undefined;
          const metaMatch = combo.meta ? event.metaKey : true;
          const keyMatch = event.key === combo.key || event.key.toLowerCase() === combo.key.toLowerCase();

          if (keyMatch && ctrlMatch && shiftMatch && metaMatch) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
        }
      };

      dom.document.addEventListener('keydown', handleKeydown);
      return () => dom.document.removeEventListener('keydown', handleKeydown);
    }, []);

    // ── Navigation callbacks ──
    const goToPage = useCallback(((page: unknown) => {
      controllerRef.current?.goToPage(page as number).catch((err: unknown) => {
        props.onError?.(err instanceof Error ? err : new Error(String(err)));
      });
    }) as (...args: unknown[]) => unknown, []);

    const nextPage = useCallback((() => {
      controllerRef.current?.nextPage().catch((err: unknown) => {
        props.onError?.(err instanceof Error ? err : new Error(String(err)));
      });
    }) as (...args: unknown[]) => unknown, []);

    const previousPage = useCallback((() => {
      controllerRef.current?.previousPage().catch((err: unknown) => {
        props.onError?.(err instanceof Error ? err : new Error(String(err)));
      });
    }) as (...args: unknown[]) => unknown, []);

    return {
      state,
      goToPage,
      nextPage,
      previousPage,
      totalPages: props.totalPages,
    };
  };
}

// ============================================================================
// CSS STYLE HELPERS
// ============================================================================

/**
 * Convert a Record<string, string> CSS map to an inline style string.
 * Used when rendering outside of React's style prop (e.g., in
 * server-rendered HTML or tests).
 */
export function cssMapToString(styles: Record<string, string>): string {
  return Object.entries(styles)
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');
}

/**
 * Convert a CSS property map to a React-compatible style object.
 * Transforms kebab-case keys to camelCase and handles vendor prefixes.
 */
export function cssMapToReactStyle(styles: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  const toCamel = (s: string) => s.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
  const capitalise = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  for (const [key, value] of Object.entries(styles)) {
    let camelKey: string;
    if (key.startsWith('-webkit-')) {
      camelKey = 'WebKit' + capitalise(toCamel(key.slice(8)));
    } else if (key.startsWith('-moz-')) {
      camelKey = 'Moz' + capitalise(toCamel(key.slice(5)));
    } else if (key.startsWith('-ms-')) {
      camelKey = 'ms' + capitalise(toCamel(key.slice(4)));
    } else {
      camelKey = toCamel(key);
    }
    result[camelKey] = value;
  }
  return result;
}

// ============================================================================
// REACT-STYLE OBJECT EXPORTS (pre-converted for JSX)
// ============================================================================

export const containerStyle = cssMapToReactStyle(READER_CONTAINER_STYLES);
export const pageImageStyle = cssMapToReactStyle(PAGE_IMAGE_STYLES);
export const blurOverlayStyle = cssMapToReactStyle(BLUR_OVERLAY_STYLES);
export const overlayStyle = cssMapToReactStyle(OVERLAY_STYLES);
export const navigationStyle = cssMapToReactStyle(NAVIGATION_STYLES);

// ============================================================================
// RENDER HELPERS
// ============================================================================

/**
 * Build the overlay inline style for the current overlay position.
 * Merges the base overlay styles with the dynamic position values.
 */
export function getOverlayPositionStyle(
  position: ReaderState['overlayPosition'],
): Record<string, string> {
  return {
    ...overlayStyle,
    top: position.top,
    left: position.left,
    transform: `rotate(${position.rotation})`,
  };
}

/**
 * Get the current page's image data URL from the reader state.
 * Returns null if the page hasn't loaded yet.
 */
export function getCurrentPageImageUrl(state: ReaderState): string | null {
  const page = state.pages.get(state.currentPage);
  if (!page) return null;
  return page.imageDataUrl;
}

/**
 * Get page loading status.
 */
export function isPageLoading(state: ReaderState, pageNumber: number): boolean {
  const page = state.pages.get(pageNumber);
  return !page || page.loading;
}

/**
 * Get page error message.
 */
export function getPageError(state: ReaderState, pageNumber: number): string | null {
  const page = state.pages.get(pageNumber);
  if (!page) return null;
  return page.error;
}
