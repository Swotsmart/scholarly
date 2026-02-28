/**
 * ============================================================================
 * Protected Content Reader — React Component Tests
 * ============================================================================
 */
import {
  createUseProtectedReader,
  cssMapToString,
  cssMapToReactStyle,
  getOverlayPositionStyle,
  getCurrentPageImageUrl,
  isPageLoading,
  getPageError,
  containerStyle,
  BLOCKED_KEY_COMBINATIONS,
} from '../components/protected-content-reader';
import type { ReactHooks, DomEnvironment } from '../components/protected-content-reader';
import type { ReaderState } from '../components/protected-reader';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

interface TrackedEffect {
  effect: () => void | (() => void);
  deps: unknown[] | undefined;
}

function createMockHooks() {
  let stateCounter = 0;
  const states = new Map<number, unknown>();
  const effects: TrackedEffect[] = [];

  const hooks: ReactHooks = {
    useState<T>(initial: T): [T, (value: T | ((prev: T) => T)) => void] {
      const id = stateCounter++;
      if (!states.has(id)) states.set(id, initial);
      const setState = (value: T | ((prev: T) => T)) => {
        const current = states.get(id) as T;
        const next = typeof value === 'function' ? (value as (prev: T) => T)(current) : value;
        states.set(id, next);
      };
      return [states.get(id) as T, setState];
    },

    useEffect(effect: () => void | (() => void), deps?: unknown[]) {
      effects.push({ effect, deps });
    },

    useRef<T>(initial: T) {
      return { current: initial };
    },

    useCallback<T extends (...args: unknown[]) => unknown>(fn: T, _deps: unknown[]): T {
      return fn;
    },
  };

  return { hooks, effects, states };
}

function createMockDom(): DomEnvironment & {
  listeners: Map<string, Array<(e: unknown) => void>>;
  windowListeners: Map<string, Array<(e: unknown) => void>>;
} {
  const listeners = new Map<string, Array<(e: unknown) => void>>();
  const windowListeners = new Map<string, Array<(e: unknown) => void>>();

  return {
    listeners,
    windowListeners,
    document: {
      hidden: false,
      addEventListener(type: string, handler: (e: unknown) => void) {
        const existing = listeners.get(type) ?? [];
        existing.push(handler);
        listeners.set(type, existing);
      },
      removeEventListener(type: string, handler: (e: unknown) => void) {
        const existing = listeners.get(type) ?? [];
        listeners.set(type, existing.filter(h => h !== handler));
      },
    },
    window: {
      addEventListener(type: string, handler: (e: unknown) => void) {
        const existing = windowListeners.get(type) ?? [];
        existing.push(handler);
        windowListeners.set(type, existing);
      },
      removeEventListener(type: string, handler: (e: unknown) => void) {
        const existing = windowListeners.get(type) ?? [];
        windowListeners.set(type, existing.filter(h => h !== handler));
      },
    },
  };
}

// ============================================================================
// CSS CONVERSION TESTS
// ============================================================================

describe('CSS Utilities', () => {
  describe('cssMapToString', () => {
    it('should convert a style map to an inline CSS string', () => {
      const result = cssMapToString({
        'user-select': 'none',
        'position': 'relative',
        'width': '100%',
      });
      expect(result).toBe('user-select: none; position: relative; width: 100%');
    });

    it('should handle empty map', () => {
      expect(cssMapToString({})).toBe('');
    });
  });

  describe('cssMapToReactStyle', () => {
    it('should convert kebab-case to camelCase', () => {
      const result = cssMapToReactStyle({
        'background-color': '#1a1a2e',
        'flex-direction': 'column',
        'align-items': 'center',
      });
      expect(result).toEqual({
        backgroundColor: '#1a1a2e',
        flexDirection: 'column',
        alignItems: 'center',
      });
    });

    it('should handle webkit vendor prefixes', () => {
      const result = cssMapToReactStyle({
        '-webkit-user-select': 'none',
        '-webkit-touch-callout': 'none',
      });
      expect(result).toHaveProperty('WebKitUserSelect', 'none');
      expect(result).toHaveProperty('WebKitTouchCallout', 'none');
    });

    it('should handle single-word properties', () => {
      const result = cssMapToReactStyle({ 'position': 'relative', 'overflow': 'hidden' });
      expect(result).toEqual({ position: 'relative', overflow: 'hidden' });
    });
  });

  describe('pre-converted style objects', () => {
    it('should have containerStyle with required properties', () => {
      expect(containerStyle).toHaveProperty('position', 'relative');
      expect(containerStyle).toHaveProperty('overflow', 'hidden');
      expect(containerStyle).toHaveProperty('width', '100%');
    });
  });
});

// ============================================================================
// STATE HELPER TESTS
// ============================================================================

describe('State Helpers', () => {
  const makeState = (overrides?: Partial<ReaderState>): ReaderState => ({
    currentPage: 1,
    pages: new Map(),
    isBlurred: false,
    sessionActive: true,
    overlayPosition: { top: '50%', left: '50%', rotation: '0deg' },
    ...overrides,
  });

  describe('getOverlayPositionStyle', () => {
    it('should merge base overlay styles with dynamic position', () => {
      const result = getOverlayPositionStyle({
        top: '35%', left: '65%', rotation: '-30deg',
      });
      expect(result.top).toBe('35%');
      expect(result.left).toBe('65%');
      expect(result.transform).toBe('rotate(-30deg)');
      expect(result.position).toBe('absolute');
      expect(result.pointerEvents).toBe('none');
    });
  });

  describe('getCurrentPageImageUrl', () => {
    it('should return null for unloaded page', () => {
      expect(getCurrentPageImageUrl(makeState())).toBeNull();
    });

    it('should return the data URL for a loaded page', () => {
      const pages = new Map();
      pages.set(1, { pageNumber: 1, imageDataUrl: 'data:image/png;base64,AAAA', loading: false, error: null });
      expect(getCurrentPageImageUrl(makeState({ currentPage: 1, pages }))).toBe('data:image/png;base64,AAAA');
    });
  });

  describe('isPageLoading', () => {
    it('should return true for missing page', () => {
      expect(isPageLoading(makeState(), 1)).toBe(true);
    });

    it('should return false for loaded page', () => {
      const pages = new Map();
      pages.set(1, { pageNumber: 1, imageDataUrl: 'data:...', loading: false, error: null });
      expect(isPageLoading(makeState({ pages }), 1)).toBe(false);
    });
  });

  describe('getPageError', () => {
    it('should return null for missing page', () => {
      expect(getPageError(makeState(), 1)).toBeNull();
    });

    it('should return error message for failed page', () => {
      const pages = new Map();
      pages.set(1, { pageNumber: 1, imageDataUrl: '', loading: false, error: 'Network error' });
      expect(getPageError(makeState({ pages }), 1)).toBe('Network error');
    });
  });
});

// ============================================================================
// BLOCKED KEY COMBINATIONS TESTS
// ============================================================================

describe('Blocked Key Combinations', () => {
  it('should block Ctrl+S, Ctrl+P, F12, Ctrl+Shift+I, PrintScreen', () => {
    const keys = BLOCKED_KEY_COMBINATIONS.map(c => c.key);
    expect(keys).toContain('s');
    expect(keys).toContain('p');
    expect(keys).toContain('F12');
    expect(keys).toContain('i');
    expect(keys).toContain('PrintScreen');
  });

  it('should have at least 8 blocked combinations', () => {
    expect(BLOCKED_KEY_COMBINATIONS.length).toBeGreaterThanOrEqual(8);
  });
});

// ============================================================================
// HOOK TESTS
// ============================================================================

describe('createUseProtectedReader', () => {
  const defaultProps = {
    sessionId: 'session-123',
    totalPages: 10,
    apiBaseUrl: 'http://localhost:3000/api/v1/content-protection',
    authToken: 'bearer-token',
    onSessionExpired: jest.fn(),
    onError: jest.fn(),
  };

  it('should register 4 useEffect hooks', () => {
    const { hooks, effects } = createMockHooks();
    const dom = createMockDom();
    const useProtectedReader = createUseProtectedReader(hooks, dom);

    useProtectedReader(defaultProps);

    expect(effects.length).toBe(4);
  });

  it('should return state with initial values', () => {
    const { hooks } = createMockHooks();
    const dom = createMockDom();
    const useProtectedReader = createUseProtectedReader(hooks, dom);

    const result = useProtectedReader(defaultProps);

    expect(result.state.currentPage).toBe(1);
    expect(result.state.isBlurred).toBe(false);
    expect(result.state.sessionActive).toBe(true);
    expect(result.totalPages).toBe(10);
    expect(typeof result.goToPage).toBe('function');
    expect(typeof result.nextPage).toBe('function');
    expect(typeof result.previousPage).toBe('function');
  });

  it('should use sessionId as the mount effect dependency', () => {
    const { hooks, effects } = createMockHooks();
    const dom = createMockDom();
    createUseProtectedReader(hooks, dom)(defaultProps);

    expect(effects[0]!.deps).toEqual(['session-123']);
  });

  it('should register DOM event listeners when effects fire', () => {
    const { hooks, effects } = createMockHooks();
    const dom = createMockDom();
    createUseProtectedReader(hooks, dom)(defaultProps);

    // Trigger focus/blur, contextmenu, keyboard effects
    effects[1]!.effect();
    effects[2]!.effect();
    effects[3]!.effect();

    expect(dom.listeners.has('visibilitychange')).toBe(true);
    expect(dom.windowListeners.has('focus')).toBe(true);
    expect(dom.windowListeners.has('blur')).toBe(true);
    expect(dom.listeners.has('contextmenu')).toBe(true);
    expect(dom.listeners.has('keydown')).toBe(true);
  });

  it('should clean up DOM listeners on unmount', () => {
    const { hooks, effects } = createMockHooks();
    const dom = createMockDom();
    createUseProtectedReader(hooks, dom)(defaultProps);

    // Fire and cleanup each effect
    const cleanup1 = effects[1]!.effect();
    if (typeof cleanup1 === 'function') cleanup1();
    expect(dom.listeners.get('visibilitychange')?.length ?? 0).toBe(0);

    const cleanup2 = effects[2]!.effect();
    if (typeof cleanup2 === 'function') cleanup2();
    expect(dom.listeners.get('contextmenu')?.length ?? 0).toBe(0);

    const cleanup3 = effects[3]!.effect();
    if (typeof cleanup3 === 'function') cleanup3();
    expect(dom.listeners.get('keydown')?.length ?? 0).toBe(0);
  });
});
