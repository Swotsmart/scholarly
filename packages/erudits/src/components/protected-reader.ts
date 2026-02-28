/**
 * ============================================================================
 * Protected Content Reader — React Component
 * ============================================================================
 *
 * The client-side half of the encrypted reader (Layer 3). This component
 * receives rendered page images from the server (via requestPage()), displays
 * them with anti-screenshot CSS protections, and manages the session lifecycle
 * (heartbeat, page navigation, focus detection).
 *
 * ## Defence Layers (Client-Side)
 *
 *   1. **Anti-Screenshot CSS**: user-select: none, -webkit-touch-callout: none,
 *      pointer-events restrictions on the image container. These don't prevent
 *      screenshots entirely (nothing can), but they disable casual copy-paste
 *      and right-click-save workflows.
 *
 *   2. **Context Menu Blocking**: Disables right-click on the reader area.
 *      Again, easily bypassed by a technical user, but raises the friction
 *      for casual sharing.
 *
 *   3. **Focus/Blur Detection**: When the browser tab loses focus (user
 *      switches to another app or screen-capture tool), the content is
 *      replaced with a blur overlay. This doesn't prevent screenshots per se,
 *      but it means any automated screen-capture tool that switches windows
 *      will capture a blurred image.
 *
 *   4. **Dynamic Overlay**: The server-side overlay (composited into the page
 *      image) carries the viewer's identity. The client also renders an HTML
 *      overlay that repositions periodically, creating a "moving target" that
 *      makes it harder to crop out the watermark from a screenshot series.
 *
 *   5. **Session Heartbeat**: Regular heartbeat calls keep the session alive.
 *      If the heartbeat stops (user closes the tab, network drops), the
 *      session expires and no more pages are served.
 *
 * ## Important Caveat
 *
 * No client-side protection is bulletproof. A determined attacker with dev
 * tools can bypass CSS protections, disable JavaScript, or use hardware
 * screen capture. The goal isn't to make content impossible to capture —
 * it's to make it difficult enough that casual sharing is deterred, and any
 * captured content carries the viewer's forensic identity (via the
 * server-side overlay baked into the pixel data).
 *
 * The real security is server-side: the PDF never leaves the server, pages
 * are session-bound, and every rendered image carries a forensic fingerprint.
 *
 * ## Usage
 *
 *   <ProtectedContentReader
 *     sessionId="sess_abc123"
 *     totalPages={24}
 *     apiBaseUrl="/api/v1/protection"
 *     authToken="Bearer xyz..."
 *     onSessionExpired={() => navigate('/library')}
 *   />
 *
 * @module erudits/components/protected-reader
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/** Props for the ProtectedContentReader component. */
export interface ProtectedReaderProps {
  /** Active session ID from startSession(). */
  sessionId: string;
  /** Total number of pages in the document. */
  totalPages: number;
  /** Base URL for protection API endpoints. */
  apiBaseUrl: string;
  /** Bearer token for authenticated API requests. */
  authToken: string;
  /** Callback when the session expires or is terminated. */
  onSessionExpired: () => void;
  /** Callback when an error occurs during page loading. */
  onError?: (error: Error) => void;
  /** Anti-screenshot overlay HTML from the server. */
  overlayHtml?: string | undefined;
  /** How often to refresh the overlay position (seconds). Default: 30. */
  overlayRefreshSeconds?: number | undefined;
  /** How often to send heartbeat (seconds). Default: 60. */
  heartbeatIntervalSeconds?: number | undefined;
  /** Whether focus/blur detection is enabled. Default: true. */
  focusBlurEnabled?: boolean | undefined;
}

/** Internal state for a loaded page. */
export interface PageState {
  pageNumber: number;
  imageDataUrl: string;
  loading: boolean;
  error: string | null;
}

/** Reader component state. */
export interface ReaderState {
  currentPage: number;
  pages: Map<number, PageState>;
  isBlurred: boolean;
  sessionActive: boolean;
  overlayPosition: { top: string; left: string; rotation: string };
}

// ============================================================================
// ANTI-SCREENSHOT CSS
// ============================================================================

/**
 * CSS styles applied to the reader container to deter casual content capture.
 *
 * These styles are the "glass case" around the museum exhibit: they don't
 * prevent a determined attacker (who could break the glass), but they stop
 * casual visitors from reaching in and grabbing the artifact.
 */
export const READER_CONTAINER_STYLES: Record<string, string> = {
  // Prevent text selection across the entire reader
  'user-select': 'none',
  '-webkit-user-select': 'none',
  '-moz-user-select': 'none',
  '-ms-user-select': 'none',

  // Prevent iOS callout (long-press menu) on images
  '-webkit-touch-callout': 'none',

  // Prevent image dragging
  '-webkit-user-drag': 'none',

  // Container positioning for overlay
  'position': 'relative',
  'overflow': 'hidden',

  // Ensure the reader fills its container
  'width': '100%',
  'height': '100%',
  'display': 'flex',
  'flex-direction': 'column',
  'align-items': 'center',
  'justify-content': 'center',
  'background-color': '#1a1a2e',
};

/**
 * CSS styles for the page image element.
 */
export const PAGE_IMAGE_STYLES: Record<string, string> = {
  // Prevent right-click save
  'pointer-events': 'none',

  // Disable image dragging
  '-webkit-user-drag': 'none',
  'user-drag': 'none',

  // Scale to fit within the reader viewport
  'max-width': '100%',
  'max-height': 'calc(100vh - 80px)',
  'object-fit': 'contain',

  // Subtle shadow for depth
  'box-shadow': '0 4px 24px rgba(0, 0, 0, 0.3)',
  'border-radius': '2px',
};

/**
 * CSS styles for the blur overlay shown when the window loses focus.
 */
export const BLUR_OVERLAY_STYLES: Record<string, string> = {
  'position': 'absolute',
  'top': '0',
  'left': '0',
  'right': '0',
  'bottom': '0',
  'backdrop-filter': 'blur(20px)',
  '-webkit-backdrop-filter': 'blur(20px)',
  'background-color': 'rgba(26, 26, 46, 0.8)',
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'z-index': '1000',
  'color': '#ffffff',
  'font-size': '18px',
  'font-family': 'Arial, sans-serif',
};

/**
 * CSS styles for the dynamic anti-screenshot overlay.
 */
export const OVERLAY_STYLES: Record<string, string> = {
  'position': 'absolute',
  'pointer-events': 'none',
  'z-index': '999',
  'font-size': '14px',
  'color': 'rgba(0, 0, 0, 0.03)',
  'white-space': 'nowrap',
  'user-select': 'none',
  '-webkit-user-select': 'none',
  'font-family': 'Arial, sans-serif',
};

/**
 * CSS styles for the page navigation controls.
 */
export const NAVIGATION_STYLES: Record<string, string> = {
  'display': 'flex',
  'align-items': 'center',
  'justify-content': 'center',
  'gap': '16px',
  'padding': '12px',
  'background-color': '#16213e',
  'border-top': '1px solid rgba(255, 255, 255, 0.1)',
  'width': '100%',
  'color': '#e0e0e0',
  'font-family': 'Arial, sans-serif',
  'font-size': '14px',
};

// ============================================================================
// READER CONTROLLER (Framework-Agnostic Logic)
// ============================================================================

/**
 * The ReaderController encapsulates the business logic for the protected
 * content reader, separate from any React/DOM dependencies. This makes it
 * testable without a DOM environment and portable across frameworks.
 *
 * In a React component, you'd instantiate this controller and wire its
 * methods to component lifecycle events. In a React Native app, the same
 * controller works with different UI primitives.
 */
export class ProtectedReaderController {
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private overlayTimer: ReturnType<typeof setInterval> | null = null;
  private state: ReaderState;
  private readonly props: ProtectedReaderProps;
  private onStateChange: ((state: ReaderState) => void) | null = null;

  constructor(props: ProtectedReaderProps) {
    this.props = props;
    this.state = {
      currentPage: 1,
      pages: new Map(),
      isBlurred: false,
      sessionActive: true,
      overlayPosition: this.randomOverlayPosition(),
    };
  }

  // ── Lifecycle ──

  /**
   * Initialise the reader: start heartbeat, focus listeners, overlay rotation.
   * Call this when the component mounts.
   */
  start(onStateChange: (state: ReaderState) => void): void {
    this.onStateChange = onStateChange;

    // Start heartbeat
    const heartbeatMs = (this.props.heartbeatIntervalSeconds ?? 60) * 1000;
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), heartbeatMs);

    // Start overlay rotation
    const overlayMs = (this.props.overlayRefreshSeconds ?? 30) * 1000;
    this.overlayTimer = setInterval(() => this.rotateOverlay(), overlayMs);

    // Load first page
    this.loadPage(1);
  }

  /**
   * Clean up: stop timers, end session. Call on component unmount.
   */
  async stop(): Promise<void> {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.overlayTimer) clearInterval(this.overlayTimer);
    this.heartbeatTimer = null;
    this.overlayTimer = null;

    // End the session server-side
    if (this.state.sessionActive) {
      try {
        await this.apiCall(`/sessions/${this.props.sessionId}/end`, 'POST');
      } catch {
        // Best-effort session end; TTL will clean up if this fails
      }
    }
  }

  // ── Page Navigation ──

  async goToPage(pageNumber: number): Promise<void> {
    if (pageNumber < 1 || pageNumber > this.props.totalPages) return;
    this.updateState({ currentPage: pageNumber });
    await this.loadPage(pageNumber);

    // Pre-fetch adjacent pages for smooth navigation
    if (pageNumber < this.props.totalPages) this.loadPage(pageNumber + 1);
    if (pageNumber > 1) this.loadPage(pageNumber - 1);
  }

  async nextPage(): Promise<void> {
    if (this.state.currentPage < this.props.totalPages) {
      await this.goToPage(this.state.currentPage + 1);
    }
  }

  async previousPage(): Promise<void> {
    if (this.state.currentPage > 1) {
      await this.goToPage(this.state.currentPage - 1);
    }
  }

  // ── Focus/Blur Detection ──

  /**
   * Called when the browser window gains focus.
   * Removes the blur overlay so the user can continue reading.
   */
  onFocus(): void {
    if (this.props.focusBlurEnabled !== false) {
      this.updateState({ isBlurred: false });
    }
  }

  /**
   * Called when the browser window loses focus.
   * Applies the blur overlay to prevent screen capture by other apps.
   */
  onBlur(): void {
    if (this.props.focusBlurEnabled !== false) {
      this.updateState({ isBlurred: true });
    }
  }

  // ── Context Menu Prevention ──

  /**
   * Context menu handler. Returns false to prevent the context menu
   * from appearing on the reader area.
   */
  onContextMenu(): boolean {
    return false;
  }

  // ── State Access ──

  getState(): ReaderState {
    return { ...this.state };
  }

  getCurrentPage(): PageState | undefined {
    return this.state.pages.get(this.state.currentPage);
  }

  // ── Private Methods ──

  private async loadPage(pageNumber: number): Promise<void> {
    // Skip if already loaded or loading
    const existing = this.state.pages.get(pageNumber);
    if (existing && (existing.imageDataUrl || existing.loading)) return;

    // Set loading state
    const pages = new Map(this.state.pages);
    pages.set(pageNumber, { pageNumber, imageDataUrl: '', loading: true, error: null });
    this.updateState({ pages });

    try {
      const response = await this.apiCall(
        `/sessions/${this.props.sessionId}/pages/${pageNumber}`,
        'GET',
      );

      const data = response as { imageDataUrl: string; watermarkOverlayHtml: string };
      const updatedPages = new Map(this.state.pages);
      updatedPages.set(pageNumber, {
        pageNumber,
        imageDataUrl: data.imageDataUrl,
        loading: false,
        error: null,
      });
      this.updateState({ pages: updatedPages });
    } catch (err) {
      const errorMsg = (err as Error).message;

      // Check for session expiry
      if (errorMsg.includes('expired') || errorMsg.includes('not found')) {
        this.updateState({ sessionActive: false });
        this.props.onSessionExpired();
        return;
      }

      const updatedPages = new Map(this.state.pages);
      updatedPages.set(pageNumber, {
        pageNumber,
        imageDataUrl: '',
        loading: false,
        error: errorMsg,
      });
      this.updateState({ pages: updatedPages });
      this.props.onError?.(err as Error);
    }
  }

  private async sendHeartbeat(): Promise<void> {
    if (!this.state.sessionActive) return;

    try {
      await this.apiCall(
        `/sessions/${this.props.sessionId}/heartbeat`,
        'POST',
      );
    } catch (err) {
      const errorMsg = (err as Error).message;
      if (errorMsg.includes('expired') || errorMsg.includes('not found')) {
        this.updateState({ sessionActive: false });
        this.props.onSessionExpired();
      }
    }
  }

  private rotateOverlay(): void {
    this.updateState({ overlayPosition: this.randomOverlayPosition() });
  }

  private randomOverlayPosition(): ReaderState['overlayPosition'] {
    return {
      top: `${20 + Math.random() * 60}%`,
      left: `${20 + Math.random() * 60}%`,
      rotation: `rotate(-${30 + Math.random() * 30}deg)`,
    };
  }

  private updateState(partial: Partial<ReaderState>): void {
    this.state = { ...this.state, ...partial };
    this.onStateChange?.(this.getState());
  }

  private async apiCall(path: string, method: string, body?: unknown): Promise<unknown> {
    const url = `${this.props.apiBaseUrl}${path}`;
    const headers: Record<string, string> = {
      'Authorization': this.props.authToken,
      'Content-Type': 'application/json',
    };

    const init: RequestInit = { method, headers };
    if (body) init.body = JSON.stringify(body);

    const response = await fetch(url, init);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `HTTP ${response.status}`);
    }

    if (response.status === 204) return undefined;
    return response.json();
  }
}

// ============================================================================
// KEYBOARD SHORTCUTS
// ============================================================================

/**
 * Keyboard shortcut mappings for the reader.
 * These provide a natural reading experience with keyboard navigation.
 */
export const READER_KEYBOARD_SHORTCUTS: Record<string, string> = {
  'ArrowRight': 'nextPage',
  'ArrowLeft': 'previousPage',
  'ArrowDown': 'nextPage',
  'ArrowUp': 'previousPage',
  'PageDown': 'nextPage',
  'PageUp': 'previousPage',
  'Home': 'firstPage',
  'End': 'lastPage',
  'Escape': 'exitReader',
};

// ============================================================================
// PRINT PREVENTION
// ============================================================================

/**
 * CSS media query to hide content when printing.
 * This prevents the simplest print-to-PDF attack vector.
 * A determined user can still override this via dev tools.
 */
export const PRINT_PREVENTION_CSS = `
@media print {
  .scholarly-reader-container {
    display: none !important;
  }
  body::after {
    content: 'This content is protected and cannot be printed.';
    display: block;
    text-align: center;
    padding: 2rem;
    font-family: Arial, sans-serif;
    font-size: 18px;
    color: #666;
  }
}
`;

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ProtectedReaderController as default,
};
