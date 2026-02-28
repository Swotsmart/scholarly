/**
 * ============================================================================
 * Protected Reader React Wrapper — Tests
 * ============================================================================
 */
import {
  createUseProtectedReader,
  createProtectedReaderComponent,
} from '../components/use-protected-reader';
import type {
  ReactBinding,
  ProtectedReaderControllerLike,
} from '../components/use-protected-reader';
import type {
  ProtectedReaderProps,
  ReaderState,
} from '../components/protected-reader';

// ============================================================================
// MOCK REACT
// ============================================================================

/**
 * A minimal mock React that captures hook calls for testing.
 * Like a test harness for a car engine — we can run the engine on a
 * dyno (mock React) without needing the full car (real React DOM).
 */
function createMockReact() {
  const stateStore: Array<{ value: unknown; setter: (v: unknown) => void }> = [];
  const effects: Array<{ effect: () => void | (() => void); deps: readonly unknown[] | undefined; cleanup?: (() => void) }> = [];
  const refs: Array<{ current: unknown }> = [];
  let hookIndex = 0;
  let effectIndex = 0;
  let refIndex = 0;

  const react: ReactBinding = {
    useState: <S,>(initial: S | (() => S)): [S, (v: S | ((prev: S) => S)) => void] => {
      const idx = hookIndex++;
      if (!stateStore[idx]) {
        const value = typeof initial === 'function' ? (initial as () => S)() : initial;
        stateStore[idx] = {
          value,
          setter: (v: unknown) => { stateStore[idx]!.value = v; },
        };
      }
      const entry = stateStore[idx]!;
      return [entry.value as S, entry.setter as (v: S | ((prev: S) => S)) => void];
    },

    useEffect: (effect: () => void | (() => void), deps?: readonly unknown[]) => {
      const idx = effectIndex++;
      if (!effects[idx]) {
        effects[idx] = { effect, deps };
      }
    },

    useRef: <T,>(initial: T | null): { current: T | null } => {
      const idx = refIndex++;
      if (!refs[idx]) {
        refs[idx] = { current: initial };
      }
      return refs[idx] as { current: T | null };
    },

    useCallback: <T extends (...args: unknown[]) => unknown>(cb: T, _deps: readonly unknown[]): T => cb,

    createElement: (type: string, props: Record<string, unknown> | null, ...children: unknown[]) => ({
      type,
      props: { ...props, children },
      key: null,
    }),
  };

  return {
    react,
    /** Run all captured useEffect calls and return their cleanups. */
    runEffects() {
      for (const e of effects) {
        if (e && !e.cleanup) {
          const cleanup = e.effect();
          if (typeof cleanup === 'function') {
            e.cleanup = cleanup;
          }
        }
      }
    },
    /** Run all effect cleanups. */
    runCleanups() {
      for (const e of effects) {
        if (e?.cleanup) {
          e.cleanup();
          e.cleanup = (() => {}) as (() => void);
        }
      }
    },
    /** Reset hook indices for "re-render". */
    resetIndices() {
      hookIndex = 0;
      effectIndex = 0;
      refIndex = 0;
    },
    getState: (idx: number) => stateStore[idx]?.value,
    setState: (idx: number, value: unknown) => stateStore[idx]?.setter(value),
  };
}

// ============================================================================
// MOCK CONTROLLER
// ============================================================================

function createMockController(): ProtectedReaderControllerLike & {
  started: boolean;
  stopped: boolean;
  _onStateChange: ((state: ReaderState) => void) | null;
  _triggerState: (state: ReaderState) => void;
} {
  let onStateChangeCb: ((state: ReaderState) => void) | null = null;

  return {
    started: false,
    stopped: false,
    _onStateChange: null,
    _triggerState(state: ReaderState) {
      onStateChangeCb?.(state);
    },

    start(onStateChange: (state: ReaderState) => void) {
      this.started = true;
      onStateChangeCb = onStateChange;
      this._onStateChange = onStateChange;
    },
    async stop() { this.stopped = true; },
    async goToPage(_page: number) {},
    async nextPage() {},
    async previousPage() {},
    onFocus() {},
    onBlur() {},
    onContextMenu() { return false; },
    onKeyDown(_key: string, _ctrlOrMeta: boolean, _shift: boolean) { return false; },
  };
}

// ============================================================================
// TESTS
// ============================================================================

const baseProps: ProtectedReaderProps = {
  sessionId: 'sess_test123',
  totalPages: 24,
  apiBaseUrl: '/api/v1/protection',
  authToken: 'Bearer test-token',
  onSessionExpired: jest.fn(),
};

describe('useProtectedReader hook', () => {
  it('should create controller and call start on mount', () => {
    const { react, runEffects } = createMockReact();
    const mockCtrl = createMockController();

    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);
    const useHook = createUseProtectedReader(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    // "Render" the hook
    const result = useHook(baseProps);
    runEffects();

    expect(MockControllerClass).toHaveBeenCalledWith(baseProps);
    expect(mockCtrl.started).toBe(true);
    expect(result.state).toBeDefined();
    expect(result.state.currentPage).toBe(1);
  });

  it('should call stop on cleanup (unmount)', () => {
    const { react, runEffects, runCleanups } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const useHook = createUseProtectedReader(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    useHook(baseProps);
    runEffects();
    expect(mockCtrl.started).toBe(true);

    runCleanups();
    expect(mockCtrl.stopped).toBe(true);
  });

  it('should expose navigation functions', () => {
    const { react } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const useHook = createUseProtectedReader(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    const result = useHook(baseProps);

    expect(typeof result.goToPage).toBe('function');
    expect(typeof result.nextPage).toBe('function');
    expect(typeof result.previousPage).toBe('function');
  });

  it('should return initial state with default values', () => {
    const { react } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const useHook = createUseProtectedReader(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    const result = useHook(baseProps);

    expect(result.state.currentPage).toBe(1);
    expect(result.state.isBlurred).toBe(false);
    expect(result.state.sessionActive).toBe(true);
    expect(result.state.pages.size).toBe(0);
  });
});

describe('createProtectedReaderComponent', () => {
  it('should create a component function', () => {
    const { react } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const Component = createProtectedReaderComponent(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    expect(typeof Component).toBe('function');
  });

  it('should render a div with data-testid protected-reader', () => {
    const { react, runEffects, resetIndices } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const Component = createProtectedReaderComponent(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    // First render — hook captures effects
    Component(baseProps);
    runEffects();

    // Re-render after effects set isReady=true
    resetIndices();
    const tree = Component(baseProps);

    expect(tree.type).toBe('div');
    expect(tree.props['data-testid']).toBe('protected-reader');
  });

  it('should show loading state when page image not available', () => {
    const { react, runEffects, resetIndices } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const Component = createProtectedReaderComponent(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    Component(baseProps);
    runEffects();
    resetIndices();
    const tree = Component(baseProps);

    // Should contain a loading element
    const children = tree.props['children'] as unknown[];
    const loadingEl = children.find((child: unknown) =>
      child && typeof child === 'object' && (child as Record<string, unknown>)['props'] &&
      ((child as Record<string, unknown>)['props'] as Record<string, unknown>)['data-testid'] === 'page-loading',
    );
    expect(loadingEl).toBeDefined();
  });

  it('should include navigation bar with prev/next buttons', () => {
    const { react, runEffects, resetIndices } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const Component = createProtectedReaderComponent(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    Component(baseProps);
    runEffects();
    resetIndices();
    const tree = Component(baseProps);

    const children = tree.props['children'] as unknown[];
    const navBar = children.find((child: unknown) =>
      child && typeof child === 'object' && (child as Record<string, unknown>)['props'] &&
      ((child as Record<string, unknown>)['props'] as Record<string, unknown>)['data-testid'] === 'navigation-bar',
    );
    expect(navBar).toBeDefined();
  });

  it('should include identity overlay element', () => {
    const { react, runEffects, resetIndices } = createMockReact();
    const mockCtrl = createMockController();
    const MockControllerClass = jest.fn().mockReturnValue(mockCtrl);

    const Component = createProtectedReaderComponent(
      react,
      MockControllerClass as unknown as new (props: ProtectedReaderProps) => ProtectedReaderControllerLike,
    );

    Component(baseProps);
    runEffects();
    resetIndices();
    const tree = Component(baseProps);

    const children = tree.props['children'] as unknown[];
    const overlay = children.find((child: unknown) =>
      child && typeof child === 'object' && (child as Record<string, unknown>)['props'] &&
      ((child as Record<string, unknown>)['props'] as Record<string, unknown>)['data-testid'] === 'identity-overlay',
    );
    expect(overlay).toBeDefined();
  });
});

describe('ProtectedReaderControllerLike interface', () => {
  it('should be satisfied by mock controller', () => {
    const ctrl = createMockController();

    // Verify all required methods exist
    expect(typeof ctrl.start).toBe('function');
    expect(typeof ctrl.stop).toBe('function');
    expect(typeof ctrl.goToPage).toBe('function');
    expect(typeof ctrl.nextPage).toBe('function');
    expect(typeof ctrl.previousPage).toBe('function');
    expect(typeof ctrl.onFocus).toBe('function');
    expect(typeof ctrl.onBlur).toBe('function');
    expect(typeof ctrl.onContextMenu).toBe('function');
    expect(typeof ctrl.onKeyDown).toBe('function');
  });
});
