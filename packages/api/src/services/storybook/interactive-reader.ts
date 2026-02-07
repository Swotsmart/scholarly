// =============================================================================
// SCHOLARLY PLATFORM — Interactive Storybook Reader Component
// Sprint 3 | SB-005 | interactive-reader.ts
// =============================================================================
// React Native component logic for rendering storybook pages with dual-mode
// reading (listen/read-aloud), karaoke-style word highlighting, page
// navigation, and ASR-based pronunciation feedback.
// =============================================================================

import type { WordTimestamp, PageNarration, ReadAloudAssessment } from './audio-narration';

// ---------------------------------------------------------------------------
// Section 1: Reader State & Types
// ---------------------------------------------------------------------------

export type ReadingMode = 'listen' | 'read_aloud';
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'loading' | 'recording';
export type PageDirection = 'forward' | 'backward';

export interface ReaderSettings {
  mode: ReadingMode;
  autoPlayNarration: boolean;
  showWordHighlight: boolean;
  highlightColour: string;
  fontSize: 'small' | 'medium' | 'large';
  fontFamily: string;
  textColour: string;
  backgroundDimming: number;
  autoAdvancePage: boolean;
  autoAdvanceDelayMs: number;
  narrationSpeed: number;
  showReadAloudPrompts: boolean;
  enableSoundEffects: boolean;
  parallaxEnabled: boolean;
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  mode: 'listen',
  autoPlayNarration: true,
  showWordHighlight: true,
  highlightColour: '#FFE066',
  fontSize: 'medium',
  fontFamily: 'OpenDyslexic',
  textColour: '#1A1A2E',
  backgroundDimming: 0.3,
  autoAdvancePage: false,
  autoAdvanceDelayMs: 2000,
  narrationSpeed: 1.0,
  showReadAloudPrompts: true,
  enableSoundEffects: true,
  parallaxEnabled: true,
};

export const FONT_SIZE_MAP: Record<ReaderSettings['fontSize'], number> = {
  small: 18,
  medium: 24,
  large: 32,
};

export interface ReaderPage {
  pageNumber: number;
  text: string;
  illustrationUrl: string;
  thumbnailUrl: string;
  narration?: PageNarration;
  layers?: Array<{
    layerId: string;
    imageUrl: string;
    depthOrder: number;
    parallaxFactor: number;
  }>;
  targetGPCs?: string[];
  focusWords?: string[];
}

export interface ReaderBookData {
  storybookId: string;
  title: string;
  coverImageUrl: string;
  pages: ReaderPage[];
  characters: Array<{ name: string; imageUrl: string }>;
  seriesId?: string;
  phonicsPhase: number;
  decodabilityScore: number;
}

export interface ReadingSession {
  sessionId: string;
  storybookId: string;
  learnerId: string;
  startedAt: string;
  completedAt?: string;
  pagesRead: number[];
  totalTimeMs: number;
  mode: ReadingMode;
  pageAssessments: Map<number, ReadAloudAssessment>;
  metrics: {
    averageAccuracy: number;
    averageWCPM: number;
    completionRate: number;
    engagementScore: number;
  };
}

// ---------------------------------------------------------------------------
// Section 2: Audio Sync Engine
// ---------------------------------------------------------------------------

/**
 * Manages synchronisation between audio playback and word highlighting.
 * Think of it as a conductor's baton — it precisely coordinates when each
 * word "lights up" on the page as the narrator's voice reaches it.
 */
export class AudioSyncEngine {
  private wordTimestamps: WordTimestamp[] = [];
  private currentWordIndex: number = -1;
  private playbackStartTime: number = 0;
  private playbackOffsetMs: number = 0;
  private isPlaying: boolean = false;
  private timerId: ReturnType<typeof setTimeout> | null = null;
  private speedMultiplier: number = 1.0;

  private onWordChange?: (wordIndex: number, word: WordTimestamp) => void;
  private onSentenceEnd?: (sentenceIndex: number) => void;
  private onPageComplete?: () => void;
  private sentenceBoundaries: PageNarration['sentenceBoundaries'] = [];

  loadPage(narration: PageNarration, speedMultiplier: number = 1.0): void {
    this.wordTimestamps = narration.wordTimestamps;
    this.sentenceBoundaries = narration.sentenceBoundaries;
    this.currentWordIndex = -1;
    this.speedMultiplier = speedMultiplier;
    this.isPlaying = false;
  }

  start(fromOffsetMs: number = 0): void {
    this.playbackStartTime = Date.now();
    this.playbackOffsetMs = fromOffsetMs;
    this.isPlaying = true;
    this.tick();
  }

  pause(): void {
    this.isPlaying = false;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  resume(): void {
    if (this.currentWordIndex >= 0) {
      const currentWord = this.wordTimestamps[this.currentWordIndex];
      if (currentWord) {
        this.playbackOffsetMs = currentWord.startMs / this.speedMultiplier;
        this.playbackStartTime = Date.now();
      }
    }
    this.isPlaying = true;
    this.tick();
  }

  seekTo(positionMs: number): void {
    this.playbackOffsetMs = positionMs;
    this.playbackStartTime = Date.now();
    const adjustedPosition = positionMs * this.speedMultiplier;
    this.currentWordIndex = this.wordTimestamps.findIndex(
      wt => wt.startMs <= adjustedPosition && wt.endMs > adjustedPosition
    );
    if (this.currentWordIndex >= 0 && this.onWordChange) {
      this.onWordChange(this.currentWordIndex, this.wordTimestamps[this.currentWordIndex]);
    }
  }

  stop(): void {
    this.isPlaying = false;
    this.currentWordIndex = -1;
    if (this.timerId !== null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  getCurrentWordIndex(): number {
    return this.currentWordIndex;
  }

  setCallbacks(callbacks: {
    onWordChange?: (wordIndex: number, word: WordTimestamp) => void;
    onSentenceEnd?: (sentenceIndex: number) => void;
    onPageComplete?: () => void;
  }): void {
    this.onWordChange = callbacks.onWordChange;
    this.onSentenceEnd = callbacks.onSentenceEnd;
    this.onPageComplete = callbacks.onPageComplete;
  }

  private tick(): void {
    if (!this.isPlaying) return;

    const elapsed = Date.now() - this.playbackStartTime;
    const currentTimeMs = (this.playbackOffsetMs + elapsed) * this.speedMultiplier;

    let newWordIndex = this.currentWordIndex;
    for (let i = Math.max(0, this.currentWordIndex); i < this.wordTimestamps.length; i++) {
      const wt = this.wordTimestamps[i];
      if (currentTimeMs >= wt.startMs && currentTimeMs < wt.endMs) {
        newWordIndex = i;
        break;
      } else if (currentTimeMs < wt.startMs) {
        break;
      }
    }

    if (newWordIndex !== this.currentWordIndex && newWordIndex >= 0) {
      this.currentWordIndex = newWordIndex;
      const word = this.wordTimestamps[newWordIndex];
      if (this.onWordChange) {
        this.onWordChange(newWordIndex, word);
      }
      if (this.onSentenceEnd) {
        for (const boundary of this.sentenceBoundaries) {
          if (Math.abs(word.endMs - boundary.endMs) < 100) {
            this.onSentenceEnd(boundary.sentenceIndex);
          }
        }
      }
    }

    if (this.wordTimestamps.length > 0) {
      const lastWord = this.wordTimestamps[this.wordTimestamps.length - 1];
      if (currentTimeMs >= lastWord.endMs) {
        this.isPlaying = false;
        if (this.onPageComplete) {
          this.onPageComplete();
        }
        return;
      }
    }

    this.timerId = setTimeout(() => this.tick(), 16);
  }
}

// ---------------------------------------------------------------------------
// Section 3: Reader State Machine
// ---------------------------------------------------------------------------

export type ReaderEvent =
  | { type: 'OPEN_BOOK'; book: ReaderBookData; learnerId: string }
  | { type: 'CLOSE_BOOK' }
  | { type: 'NEXT_PAGE' }
  | { type: 'PREV_PAGE' }
  | { type: 'GO_TO_PAGE'; pageNumber: number }
  | { type: 'PLAY_NARRATION' }
  | { type: 'PAUSE_NARRATION' }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING'; assessment: ReadAloudAssessment }
  | { type: 'SWITCH_MODE'; mode: ReadingMode }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<ReaderSettings> }
  | { type: 'WORD_HIGHLIGHTED'; wordIndex: number }
  | { type: 'PAGE_NARRATION_COMPLETE' }
  | { type: 'BOOK_COMPLETE' };

export interface ReaderState {
  book: ReaderBookData | null;
  learnerId: string;
  currentPage: number;
  totalPages: number;
  playbackState: PlaybackState;
  settings: ReaderSettings;
  highlightedWordIndex: number;
  session: ReadingSession | null;
  isBookOpen: boolean;
  isBookComplete: boolean;
  canGoForward: boolean;
  canGoBack: boolean;
  pageStartTime: number;
}

export function createInitialReaderState(): ReaderState {
  return {
    book: null,
    learnerId: '',
    currentPage: 0,
    totalPages: 0,
    playbackState: 'idle',
    settings: { ...DEFAULT_READER_SETTINGS },
    highlightedWordIndex: -1,
    session: null,
    isBookOpen: false,
    isBookComplete: false,
    canGoForward: false,
    canGoBack: false,
    pageStartTime: 0,
  };
}

/**
 * Pure reducer for reader state — every state transition is explicit
 * and testable. The React Native UI dispatches events, this function
 * computes the new state.
 */
export function readerReducer(state: ReaderState, event: ReaderEvent): ReaderState {
  switch (event.type) {
    case 'OPEN_BOOK': {
      const sessionId = `rs_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
      return {
        ...state,
        book: event.book,
        learnerId: event.learnerId,
        currentPage: 0,
        totalPages: event.book.pages.length,
        playbackState: 'idle',
        highlightedWordIndex: -1,
        isBookOpen: true,
        isBookComplete: false,
        canGoForward: event.book.pages.length > 1,
        canGoBack: false,
        pageStartTime: Date.now(),
        session: {
          sessionId,
          storybookId: event.book.storybookId,
          learnerId: event.learnerId,
          startedAt: new Date().toISOString(),
          pagesRead: [0],
          totalTimeMs: 0,
          mode: state.settings.mode,
          pageAssessments: new Map(),
          metrics: {
            averageAccuracy: 0,
            averageWCPM: 0,
            completionRate: 0,
            engagementScore: 0,
          },
        },
      };
    }

    case 'CLOSE_BOOK': {
      const session = state.session;
      if (session) {
        session.completedAt = new Date().toISOString();
        session.totalTimeMs = Date.now() - new Date(session.startedAt).getTime();
        session.metrics = computeSessionMetrics(session, state.totalPages);
      }
      return {
        ...state,
        isBookOpen: false,
        playbackState: 'idle',
        highlightedWordIndex: -1,
      };
    }

    case 'NEXT_PAGE': {
      if (!state.canGoForward) return state;
      const nextPage = state.currentPage + 1;
      const pagesRead = state.session
        ? [...new Set([...state.session.pagesRead, nextPage])]
        : [];
      const isComplete = nextPage >= state.totalPages - 1;
      return {
        ...state,
        currentPage: nextPage,
        playbackState: 'idle',
        highlightedWordIndex: -1,
        canGoForward: nextPage < state.totalPages - 1,
        canGoBack: true,
        isBookComplete: isComplete,
        pageStartTime: Date.now(),
        session: state.session ? {
          ...state.session,
          pagesRead,
        } : null,
      };
    }

    case 'PREV_PAGE': {
      if (!state.canGoBack) return state;
      const prevPage = state.currentPage - 1;
      return {
        ...state,
        currentPage: prevPage,
        playbackState: 'idle',
        highlightedWordIndex: -1,
        canGoForward: true,
        canGoBack: prevPage > 0,
        isBookComplete: false,
        pageStartTime: Date.now(),
      };
    }

    case 'GO_TO_PAGE': {
      const page = Math.max(0, Math.min(event.pageNumber, state.totalPages - 1));
      return {
        ...state,
        currentPage: page,
        playbackState: 'idle',
        highlightedWordIndex: -1,
        canGoForward: page < state.totalPages - 1,
        canGoBack: page > 0,
        pageStartTime: Date.now(),
      };
    }

    case 'PLAY_NARRATION':
      return { ...state, playbackState: 'playing' };

    case 'PAUSE_NARRATION':
      return { ...state, playbackState: 'paused' };

    case 'START_RECORDING':
      return { ...state, playbackState: 'recording', highlightedWordIndex: -1 };

    case 'STOP_RECORDING': {
      const updatedAssessments = state.session
        ? new Map(state.session.pageAssessments)
        : new Map();
      updatedAssessments.set(state.currentPage, event.assessment);

      return {
        ...state,
        playbackState: 'idle',
        session: state.session ? {
          ...state.session,
          pageAssessments: updatedAssessments,
        } : null,
      };
    }

    case 'SWITCH_MODE':
      return {
        ...state,
        settings: { ...state.settings, mode: event.mode },
        playbackState: 'idle',
        highlightedWordIndex: -1,
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...event.settings },
      };

    case 'WORD_HIGHLIGHTED':
      return { ...state, highlightedWordIndex: event.wordIndex };

    case 'PAGE_NARRATION_COMPLETE':
      return {
        ...state,
        playbackState: 'idle',
        highlightedWordIndex: -1,
      };

    case 'BOOK_COMPLETE': {
      const session = state.session;
      if (session) {
        session.completedAt = new Date().toISOString();
        session.totalTimeMs = Date.now() - new Date(session.startedAt).getTime();
        session.metrics = computeSessionMetrics(session, state.totalPages);
      }
      return {
        ...state,
        isBookComplete: true,
        playbackState: 'idle',
      };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Section 4: Session Metrics Computation
// ---------------------------------------------------------------------------

function computeSessionMetrics(
  session: ReadingSession,
  totalPages: number
): ReadingSession['metrics'] {
  const assessments = Array.from(session.pageAssessments.values());

  const averageAccuracy = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + a.accuracy, 0) / assessments.length
    : 0;

  const averageWCPM = assessments.length > 0
    ? assessments.reduce((sum, a) => sum + a.wcpm, 0) / assessments.length
    : 0;

  const uniquePagesRead = new Set(session.pagesRead).size;
  const completionRate = totalPages > 0 ? uniquePagesRead / totalPages : 0;

  // Engagement score: weighted combination of completion, time-per-page, re-reads
  const avgTimePerPage = session.totalTimeMs / Math.max(session.pagesRead.length, 1);
  const expectedTimePerPage = 30000; // 30 seconds expected
  const timeRatio = Math.min(avgTimePerPage / expectedTimePerPage, 2.0);
  const reReadRatio = session.pagesRead.length / Math.max(uniquePagesRead, 1);

  const engagementScore = Math.min(1.0,
    (completionRate * 0.4) +
    (Math.min(timeRatio, 1.0) * 0.3) +
    (Math.min(reReadRatio - 1, 1) * 0.1) +
    (averageAccuracy * 0.2)
  );

  return { averageAccuracy, averageWCPM, completionRate, engagementScore };
}

// ---------------------------------------------------------------------------
// Section 5: Parallax Engine
// ---------------------------------------------------------------------------

/**
 * Computes layer transforms for parallax effect based on scroll/gesture
 * position. Each layer moves at a different rate based on its depth,
 * creating an illusion of depth — like looking through a View-Master
 * where foreground objects shift more than the background.
 */
export class ParallaxEngine {
  /**
   * Compute transform values for each layer based on the current
   * scroll/tilt offset.
   *
   * @param layers - Scene layers sorted by depth
   * @param offsetX - Horizontal offset (from gyroscope or touch drag), -1.0 to 1.0
   * @param offsetY - Vertical offset, -1.0 to 1.0
   * @param maxShiftPx - Maximum pixel shift for the most foreground layer
   */
  computeTransforms(
    layers: ReaderPage['layers'],
    offsetX: number,
    offsetY: number,
    maxShiftPx: number = 20
  ): Array<{ layerId: string; translateX: number; translateY: number; scale: number }> {
    if (!layers || layers.length === 0) return [];

    return layers.map(layer => ({
      layerId: layer.layerId,
      translateX: offsetX * maxShiftPx * layer.parallaxFactor,
      translateY: offsetY * maxShiftPx * layer.parallaxFactor,
      scale: 1.0 + (layer.parallaxFactor * 0.02), // Subtle scale for depth
    }));
  }
}

// ---------------------------------------------------------------------------
// Section 6: Reading Progress Tracker
// ---------------------------------------------------------------------------

/**
 * Tracks reading progress and generates BKT update payloads.
 * After each reading session, this produces the data needed to update
 * the learner's GPC mastery estimates in the Bayesian Knowledge Tracing engine.
 */
export interface BKTUpdatePayload {
  learnerId: string;
  storybookId: string;
  sessionId: string;
  gpcObservations: Array<{
    gpc: string;
    correct: boolean;
    context: 'storybook_read_aloud';
    timestamp: string;
  }>;
  fluencyMetrics: {
    wcpm: number;
    accuracy: number;
    prosody?: number;
  };
}

export class ReadingProgressTracker {
  /**
   * Convert a reading session's assessments into BKT update observations.
   */
  generateBKTPayload(session: ReadingSession): BKTUpdatePayload | null {
    if (session.pageAssessments.size === 0) return null;

    const gpcObservations: BKTUpdatePayload['gpcObservations'] = [];
    const timestamp = new Date().toISOString();

    for (const [, assessment] of session.pageAssessments) {
      for (const word of assessment.words) {
        if (word.gpcs && word.gpcs.length > 0) {
          for (const gpc of word.gpcs) {
            gpcObservations.push({
              gpc,
              correct: word.correct,
              context: 'storybook_read_aloud',
              timestamp,
            });
          }
        }
      }
    }

    if (gpcObservations.length === 0) return null;

    const assessments = Array.from(session.pageAssessments.values());
    const avgWCPM = assessments.reduce((s, a) => s + a.wcpm, 0) / assessments.length;
    const avgAccuracy = assessments.reduce((s, a) => s + a.accuracy, 0) / assessments.length;

    return {
      learnerId: session.learnerId,
      storybookId: session.storybookId,
      sessionId: session.sessionId,
      gpcObservations,
      fluencyMetrics: {
        wcpm: Math.round(avgWCPM),
        accuracy: Number(avgAccuracy.toFixed(3)),
      },
    };
  }
}

// ---------------------------------------------------------------------------
// Section 7: Accessibility Helpers
// ---------------------------------------------------------------------------

/**
 * Generates accessibility labels and hints for the reader UI.
 * Ensures WCAG 2.1 AA compliance with VoiceOver (iOS) and TalkBack (Android).
 */
export class ReaderAccessibility {
  static pageLabel(pageNumber: number, totalPages: number, text: string): string {
    const preview = text.substring(0, 100);
    return `Page ${pageNumber + 1} of ${totalPages}. ${preview}`;
  }

  static wordLabel(word: string, isFocusWord: boolean): string {
    return isFocusWord ? `Focus word: ${word}` : word;
  }

  static playButtonHint(mode: ReadingMode, state: PlaybackState): string {
    if (mode === 'listen') {
      return state === 'playing'
        ? 'Double tap to pause narration'
        : 'Double tap to play narration';
    }
    return state === 'recording'
      ? 'Double tap to stop recording your reading'
      : 'Double tap to start reading aloud';
  }

  static navigationHint(direction: PageDirection, canNavigate: boolean): string {
    if (!canNavigate) {
      return direction === 'forward' ? 'Last page reached' : 'First page reached';
    }
    return direction === 'forward' ? 'Swipe left for next page' : 'Swipe right for previous page';
  }

  static modeLabel(mode: ReadingMode): string {
    return mode === 'listen' ? 'Listen mode: hear the story read to you' : 'Read aloud mode: read the story yourself';
  }
}

// ---------------------------------------------------------------------------
// Section 8: Text Layout Engine
// ---------------------------------------------------------------------------

/**
 * Computes text layout for the reader, splitting page text into
 * renderable word segments with highlight-able boundaries.
 * Each word gets its own "hit box" for tap-to-hear-word and highlight sync.
 */
export interface TextSegment {
  word: string;
  wordIndex: number;
  isSpace: boolean;
  isPunctuation: boolean;
  isFocusWord: boolean;
  charStart: number;
  charEnd: number;
}

export function buildTextSegments(
  text: string,
  focusWords?: string[]
): TextSegment[] {
  const segments: TextSegment[] = [];
  const focusSet = new Set((focusWords ?? []).map(w => w.toLowerCase()));

  // Tokenise into words and spaces, preserving positions
  const regex = /(\S+)|(\s+)/g;
  let match: RegExpExecArray | null;
  let wordIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    const isSpace = match[2] !== undefined;
    const token = match[0];
    const charStart = match.index;
    const charEnd = charStart + token.length;

    if (isSpace) {
      segments.push({
        word: token,
        wordIndex: -1,
        isSpace: true,
        isPunctuation: false,
        isFocusWord: false,
        charStart,
        charEnd,
      });
    } else {
      const cleanWord = token.replace(/[^a-zA-Z']/g, '').toLowerCase();
      segments.push({
        word: token,
        wordIndex,
        isSpace: false,
        isPunctuation: /^[.,!?;:'"()\-]+$/.test(token),
        isFocusWord: focusSet.has(cleanWord),
        charStart,
        charEnd,
      });
      wordIndex++;
    }
  }

  return segments;
}

// ---------------------------------------------------------------------------
// Section 9: Exports
// ---------------------------------------------------------------------------

export {
  type WordTimestamp,
  type PageNarration,
  type ReadAloudAssessment,
};
