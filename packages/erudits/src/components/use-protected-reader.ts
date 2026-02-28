/**
 * ============================================================================
 * Protected Content Reader — React Component
 * ============================================================================
 *
 * This React component wraps the framework-agnostic ProtectedReaderController,
 * binding its lifecycle methods to React hooks and its state to component
 * re-renders.
 *
 * ## Architecture
 *
 * Think of it like a car dashboard (this React component) connected to the
 * engine (ProtectedReaderController). The dashboard displays speed, fuel,
 * and temperature, and has buttons for the driver. But all the mechanical
 * work — combustion, transmission, cooling — happens in the engine. If you
 * wanted to put the same engine in a different car (React Native, Vue, etc.),
 * you'd just build a different dashboard.
 *
 * The component handles:
 *   - Controller lifecycle (start on mount, stop on unmount)
 *   - Window event listeners (focus, blur, contextmenu, keyboard)
 *   - State synchronisation (controller state → React state → re-render)
 *   - Rendering: page image, blur overlay, identity overlay, navigation
 *
 * ## Usage
 *
 *   import { ProtectedContentReader } from './use-protected-reader';
 *
 *   function BookViewer({ sessionId, totalPages }) {
 *     return (
 *       <ProtectedContentReader
 *         sessionId={sessionId}
 *         totalPages={totalPages}
 *         apiBaseUrl="/api/v1/protection"
 *         authToken={authToken}
 *         onSessionExpired={() => navigate('/library')}
 *       />
 *     );
 *   }
 *
 * @module erudits/components/use-protected-reader
 * @version 1.0.0
 */

// ============================================================================
// TYPE-ONLY IMPORTS
// ============================================================================
// This module uses type-only imports for React to avoid bundling issues.
// In production, React is a peer dependency provided by the host application.

import type {
  ProtectedReaderProps,
  ReaderState,
} from './protected-reader';

// DOM type stubs for server-side compilation (no lib: "dom" in tsconfig)
declare const window: {
  addEventListener(type: string, listener: (e: Event) => void): void;
  removeEventListener(type: string, listener: (e: Event) => void): void;
} | undefined;

interface Event {
  preventDefault(): void;
}

// ============================================================================
// React type stubs — replaced by real React in production builds
// ============================================================================
// These mirror the subset of the React API we use. In production, import
// from 'react' directly. The stubs keep this module compilable and testable
// without React as a hard dependency.

interface ReactElement {
  type: string | ((...args: unknown[]) => ReactElement | null);
  props: Record<string, unknown>;
  key: string | null;
}

type SetStateAction<S> = S | ((prev: S) => S);
type Dispatch<A> = (action: A) => void;
type DependencyList = readonly unknown[];
type RefObject<T> = { current: T | null };

interface ReactHooks {
  useState<S>(initial: S | (() => S)): [S, Dispatch<SetStateAction<S>>];
  useEffect(effect: () => void | (() => void), deps?: DependencyList): void;
  useRef<T>(initial: T | null): RefObject<T>;
  useCallback<T extends (...args: unknown[]) => unknown>(callback: T, deps: DependencyList): T;
}

interface CreateElementFn {
  (type: string, props: Record<string, unknown> | null, ...children: unknown[]): ReactElement;
}

/**
 * React binding interface. In production, pass the real React module.
 * This decouples the component from a specific React version or import path.
 */
export interface ReactBinding extends ReactHooks {
  createElement: CreateElementFn;
}

// ============================================================================
// HOOK: useProtectedReader
// ============================================================================

/**
 * Custom hook that manages a ProtectedReaderController instance.
 *
 * Returns the current reader state and navigation functions, keeping the
 * controller alive for the component's lifetime and cleaning up on unmount.
 *
 * This is the "wiring harness" — it connects the controller's outputs
 * (state changes) to React's re-render cycle, and the user's inputs
 * (page navigation, window events) to the controller's methods.
 */
export interface UseProtectedReaderResult {
  /** Current reader state (page, blur, session status, overlay). */
  state: ReaderState;
  /** Navigate to a specific page. */
  goToPage: (page: number) => Promise<void>;
  /** Go to next page. */
  nextPage: () => Promise<void>;
  /** Go to previous page. */
  previousPage: () => Promise<void>;
  /** Whether the controller is initialised and active. */
  isReady: boolean;
}

/**
 * Create the useProtectedReader hook bound to a specific React instance.
 *
 * Why a factory? Because this module doesn't import React directly —
 * the consumer passes their React instance in, avoiding version conflicts
 * in monorepos or micro-frontends. Like a universal car stereo that works
 * with any vehicle's wiring, as long as you connect the right harness.
 */
export function createUseProtectedReader(
  react: ReactBinding,
  ControllerClass: new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
): (props: ProtectedReaderProps) => UseProtectedReaderResult {

  return function useProtectedReader(props: ProtectedReaderProps): UseProtectedReaderResult {
    const { useState, useEffect, useRef, useCallback } = react;

    const [state, setState] = useState<ReaderState>({
      currentPage: 1,
      pages: new Map(),
      isBlurred: false,
      sessionActive: true,
      overlayPosition: { top: '50%', left: '50%', rotation: '-30deg' },
    });
    const [isReady, setIsReady] = useState(false);
    const controllerRef = useRef<ProtectedReaderControllerLike | null>(null);

    // ── Mount: create controller, start, wire events ──
    useEffect(() => {
      const controller = new ControllerClass(props);
      controllerRef.current = controller;

      // Start the controller — it calls our setState on every state change
      controller.start((newState: ReaderState) => {
        setState(newState);
      });
      setIsReady(true);

      // ── Window event listeners ──
      // These are the "security sensors" on the museum display case.
      // When someone walks away (blur), the case frosts over.
      // When they return (focus), it clears.

      const handleFocus = () => controller.onFocus();
      const handleBlur = () => controller.onBlur();
      const handleContextMenu = (e: Event) => {
        if (controller.onContextMenu() === false) {
          e.preventDefault();
        }
      };
      const handleKeyDown = (e: Event) => {
        const kbEvent = e as unknown as { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; preventDefault: () => void };
        if (controller.onKeyDown(kbEvent.key, kbEvent.ctrlKey || kbEvent.metaKey, kbEvent.shiftKey) === false) {
          kbEvent.preventDefault();
        }
      };

      // Attach to window (works in both browser and Electron)
      if (typeof window !== 'undefined' && window) {
        window.addEventListener('focus', handleFocus);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('keydown', handleKeyDown);
      }

      // ── Cleanup on unmount ──
      return () => {
        // Stop the controller (ends session, clears timers)
        controller.stop().catch(() => {/* best-effort */});
        controllerRef.current = null;
        setIsReady(false);

        if (typeof window !== 'undefined' && window) {
          window.removeEventListener('focus', handleFocus);
          window.removeEventListener('blur', handleBlur);
          window.removeEventListener('contextmenu', handleContextMenu);
          window.removeEventListener('keydown', handleKeyDown);
        }
      };
    }, [props.sessionId]); // Re-create controller if session changes

    // ── Navigation callbacks (stable references) ──
    const goToPage = useCallback(async (page: unknown) => {
      await controllerRef.current?.goToPage(page as number);
    }, []) as unknown as (page: number) => Promise<void>;

    const nextPage = useCallback(async () => {
      await controllerRef.current?.nextPage();
    }, []) as unknown as () => Promise<void>;

    const previousPage = useCallback(async () => {
      await controllerRef.current?.previousPage();
    }, []) as unknown as () => Promise<void>;

    return { state, goToPage, nextPage, previousPage, isReady };
  };
}

// ============================================================================
// CONTROLLER INTERFACE (for dependency injection)
// ============================================================================

/**
 * Minimal interface the hook requires from the controller.
 * Mirrors ProtectedReaderController's public API.
 */
export interface ProtectedReaderControllerLike {
  start(onStateChange: (state: ReaderState) => void): void;
  stop(): Promise<void>;
  goToPage(page: number): Promise<void>;
  nextPage(): Promise<void>;
  previousPage(): Promise<void>;
  onFocus(): void;
  onBlur(): void;
  onContextMenu(): boolean;
  onKeyDown(key: string, ctrlOrMeta: boolean, shift: boolean): boolean;
}

// ============================================================================
// COMPONENT FACTORY
// ============================================================================

/**
 * Create a React component for the protected content reader.
 *
 * The component renders:
 *   - The page image (from the rendered page data URL)
 *   - A blur overlay when the window loses focus
 *   - An anti-screenshot identity overlay
 *   - Navigation controls (prev/next/page indicator)
 *
 * Returns a function component that can be used like:
 *   const ProtectedContentReader = createProtectedReaderComponent(React, Controller);
 *   <ProtectedContentReader sessionId="..." totalPages={24} ... />
 */
export function createProtectedReaderComponent(
  react: ReactBinding,
  ControllerClass: new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
): (props: ProtectedReaderProps) => ReactElement {

  const useProtectedReader = createUseProtectedReader(react, ControllerClass);
  const h = react.createElement;

  return function ProtectedContentReader(props: ProtectedReaderProps): ReactElement {
    const { state, nextPage, previousPage, isReady } = useProtectedReader(props);

    // Current page image
    const currentPageState = state.pages.get(state.currentPage);
    const imageUrl = currentPageState && !currentPageState.loading && !currentPageState.error
      ? currentPageState.imageDataUrl
      : null;

    // Loading state
    if (!isReady) {
      return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } },
        h('span', null, 'Initialising reader...'),
      );
    }

    // Session expired
    if (!state.sessionActive) {
      return h('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' } },
        h('span', null, 'Session expired. Please reload.'),
      );
    }

    // Main reader layout
    return h('div', {
      style: {
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        backgroundColor: '#1a1a2e',
      },
      'data-testid': 'protected-reader',
    },
      // Page image
      imageUrl
        ? h('img', {
          src: imageUrl,
          alt: `Page ${state.currentPage}`,
          style: {
            maxWidth: '100%',
            maxHeight: 'calc(100% - 60px)',
            objectFit: 'contain',
            pointerEvents: 'none',
            WebkitUserDrag: 'none',
          },
          draggable: false,
          'data-testid': 'page-image',
        })
        : h('div', {
          style: { display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 },
          'data-testid': 'page-loading',
        }, h('span', null, `Loading page ${state.currentPage}...`)),

      // Blur overlay (shown when window loses focus)
      state.isBlurred
        ? h('div', {
          style: {
            position: 'absolute',
            inset: 0,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            backgroundColor: 'rgba(26, 26, 46, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            color: '#ffffff',
          },
          'data-testid': 'blur-overlay',
        }, h('span', null, 'Content hidden — return to this window to continue reading.'))
        : null,

      // Anti-screenshot identity overlay
      h('div', {
        style: {
          position: 'absolute',
          top: state.overlayPosition.top,
          left: state.overlayPosition.left,
          transform: `rotate(${state.overlayPosition.rotation})`,
          pointerEvents: 'none',
          zIndex: 999,
          color: 'rgba(0, 0, 0, 0.03)',
          fontSize: '14px',
          whiteSpace: 'nowrap',
          userSelect: 'none',
        },
        'data-testid': 'identity-overlay',
      }, props.overlayHtml ?? ''),

      // Navigation bar
      h('div', {
        style: {
          position: 'absolute',
          bottom: 0,
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          padding: '12px',
          backgroundColor: '#16213e',
          borderTop: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#e0e0e0',
        },
        'data-testid': 'navigation-bar',
      },
        h('button', {
          onClick: previousPage,
          disabled: state.currentPage <= 1,
          'data-testid': 'prev-button',
        }, '← Previous'),
        h('span', { 'data-testid': 'page-indicator' },
          `Page ${state.currentPage} of ${props.totalPages}`),
        h('button', {
          onClick: nextPage,
          disabled: state.currentPage >= props.totalPages,
          'data-testid': 'next-button',
        }, 'Next →'),
      ),
    );
  };
}
