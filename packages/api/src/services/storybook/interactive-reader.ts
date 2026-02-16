// ============================================================================
// SCHOLARLY PLATFORM — Sprint 22, Deliverable S22-002
// Interactive Reader & Enchanted Library
// ============================================================================
//
// This is the moment everything comes together. Sprint 19 gave us words.
// Sprint 20 gave us pictures. Sprint 21 gave us a voice. Sprint 22 now
// builds the stage where those three performers give their show.
//
// If the storybook generation pipeline (Sprints 19-21) is the kitchen
// of a restaurant, the Interactive Reader is the dining room — where the
// carefully prepared meal is finally served, plated beautifully, and
// enjoyed. The Enchanted Library is the restaurant's entrance — warm
// lighting, inviting atmosphere, the host who knows your name and leads
// you to exactly the right table.
//
// Four deliverables:
//   C22-001: Interactive Reader Component (page rendering, karaoke highlight,
//            page navigation, reading position bookmarking)
//   C22-002: Enchanted Library View (animated bookshelves, personalised
//            shelves, achievement integration)
//   C22-003: Reading Analytics Loop (per-word accuracy, WCPM, session events
//            published to NATS via Sprint 22 Path B)
//   C22-004: Offline Reading Support (download manifest, local BKT, sync queue)
//
// Consumes:
//   - StoryPage from Sprint 19 (page text, target GPC words)
//   - PageIllustrationResult from Sprint 20 (image URLs, scene composition)
//   - PageNarrationResult from Sprint 21 (audio URLs, word timestamps)
//   - DualModeConfig from Sprint 21 (passive/active mode settings)
//   - NATSEventBus from Sprint 22 Path B (analytics event publishing)
// ============================================================================

import { ScholarlyBaseService, Result, ok, fail } from '../shared/base';

// ==========================================================================
// Section 1: Composite Book Model
// ==========================================================================
// The reader doesn't consume the three pipeline outputs separately.
// Instead, it consumes a unified "rendered book" that merges narrative,
// illustration, and audio into a single coherent structure per page.
// This is the final assembled product — like a film that merges script,
// cinematography, and soundtrack into one viewing experience.

export interface RenderedBook {
  readonly id: string;
  readonly title: string;
  readonly seriesId?: string;
  readonly seriesName?: string;
  readonly coverImageUrl: string;
  readonly pages: RenderedPage[];
  readonly metadata: BookMetadata;
  readonly voicePersonaId: string;
  readonly paceProfileName: string;
  readonly totalDurationMs: number;
  readonly totalWords: number;
  readonly downloadSizeBytes: number;
}

export interface RenderedPage {
  readonly pageNumber: number;
  readonly text: string;
  readonly illustrationUrl: string;
  readonly audioUrl: string;
  readonly timestampManifestUrl: string;
  readonly wordTimestamps: WordTimestampRef[];
  readonly sentenceTimestamps: SentenceTimestampRef[];
  readonly targetGPCWords: string[];
  readonly sceneComposition: SceneCompositionRef;
  readonly textOverlay: TextOverlayConfig;
  readonly durationMs: number;
}

export interface WordTimestampRef {
  readonly wordIndex: number;
  readonly word: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly isTargetGPC: boolean;
  readonly charStart: number;
  readonly charEnd: number;
}

export interface SentenceTimestampRef {
  readonly sentenceIndex: number;
  readonly startMs: number;
  readonly endMs: number;
}

export interface SceneCompositionRef {
  readonly backgroundDepth: number;
  readonly midgroundDepth: number;
  readonly foregroundDepth: number;
  readonly parallaxMultipliers: [number, number, number];
  readonly textZonePosition: 'top' | 'bottom' | 'overlay-bottom';
  readonly textZoneOpacity: number;
}

export interface TextOverlayConfig {
  readonly fontSize: 'small' | 'medium' | 'large';
  readonly lineHeight: number;
  readonly maxLines: number;
  readonly backgroundColor: string;
  readonly backgroundOpacity: number;
  readonly position: 'top' | 'bottom' | 'overlay-bottom';
  readonly padding: number;
}

export interface BookMetadata {
  readonly phonicsPhase: number;
  readonly targetGPCs: string[];
  readonly decodabilityScore: number;
  readonly wcpmBand: [number, number];
  readonly ageGroup: string;
  readonly themes: string[];
  readonly vocabularyTier: string;
  readonly curriculumAlignment: string[];
}

// ==========================================================================
// Section 2: Interactive Reader — State Machine
// ==========================================================================
// The reader is a state machine that tracks where the child is in the
// book, what mode they're in, and what's happening with audio playback.
// State transitions are triggered by user interaction (tap, swipe),
// audio events (word boundary reached, page audio complete), and
// system events (ASR result received, BKT update computed).

export type ReaderState =
  | 'loading'           // Book assets loading
  | 'ready'             // Book loaded, waiting for interaction
  | 'playing'           // Audio playing (passive mode)
  | 'listening'         // Recording child's reading (active mode)
  | 'comparing'         // ASR result being compared
  | 'feedback'          // Showing accuracy feedback
  | 'paused'            // User paused playback
  | 'page-turning'      // Page turn animation in progress
  | 'complete';         // Book finished

export interface ReaderSessionState {
  readonly bookId: string;
  readonly currentPage: number;
  readonly totalPages: number;
  readonly mode: 'passive' | 'active';
  readonly readerState: ReaderState;
  readonly audioPosition: number;
  readonly currentWordIndex: number;
  readonly highlightedWords: number[];
  readonly pagesCompleted: number[];
  readonly startTime: Date;
  readonly sessionId: string;
  readonly isOffline: boolean;
}

export interface ReaderConfig {
  readonly mode: 'passive' | 'active';
  readonly highlightStyle: HighlightStyle;
  readonly pageTransition: PageTransitionConfig;
  readonly textDisplay: TextDisplayConfig;
  readonly parallax: ParallaxConfig;
  readonly accessibility: AccessibilityConfig;
}

export interface HighlightStyle {
  readonly activeWordColor: string;
  readonly activeWordBackground: string;
  readonly targetGPCColor: string;
  readonly targetGPCBackground: string;
  readonly completedWordOpacity: number;
  readonly upcomingWordOpacity: number;
  readonly animationDurationMs: number;
  readonly animationEasing: 'linear' | 'ease-in-out' | 'spring';
}

export interface PageTransitionConfig {
  readonly type: 'slide' | 'fade' | 'curl' | 'flip';
  readonly durationMs: number;
  readonly direction: 'horizontal' | 'vertical';
  readonly enableSwipeGesture: boolean;
  readonly swipeThreshold: number;
}

export interface TextDisplayConfig {
  readonly fontFamily: string;
  readonly baseFontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly wordSpacing: number;
  readonly fontWeight: 'normal' | 'bold';
  readonly dyslexiaFriendlyFont: boolean;
}

export interface ParallaxConfig {
  readonly enabled: boolean;
  readonly intensity: number;
  readonly responseTo: 'scroll' | 'tilt' | 'both';
  readonly maxOffset: number;
}

export interface AccessibilityConfig {
  readonly enableVoiceOver: boolean;
  readonly enableHighContrast: boolean;
  readonly enableReducedMotion: boolean;
  readonly enableLargeText: boolean;
  readonly minimumTapTarget: number;
}

// ==========================================================================
// Section 3: Default Configurations
// ==========================================================================

export const DEFAULT_READER_CONFIG: ReaderConfig = {
  mode: 'passive',
  highlightStyle: {
    activeWordColor: '#1A1A2E',
    activeWordBackground: '#FFD93D',
    targetGPCColor: '#1A1A2E',
    targetGPCBackground: '#6BCB77',
    completedWordOpacity: 0.6,
    upcomingWordOpacity: 1.0,
    animationDurationMs: 150,
    animationEasing: 'ease-in-out',
  },
  pageTransition: {
    type: 'slide',
    durationMs: 400,
    direction: 'horizontal',
    enableSwipeGesture: true,
    swipeThreshold: 50,
  },
  textDisplay: {
    fontFamily: 'Sassoon Primary',
    baseFontSize: 28,
    lineHeight: 1.8,
    letterSpacing: 0.5,
    wordSpacing: 4,
    fontWeight: 'normal',
    dyslexiaFriendlyFont: false,
  },
  parallax: {
    enabled: true,
    intensity: 0.3,
    responseTo: 'scroll',
    maxOffset: 20,
  },
  accessibility: {
    enableVoiceOver: true,
    enableHighContrast: false,
    enableReducedMotion: false,
    enableLargeText: false,
    minimumTapTarget: 44,
  },
};

export const AGE_SPECIFIC_CONFIGS: Record<string, Partial<ReaderConfig>> = {
  '3-4': {
    textDisplay: { fontFamily: 'Sassoon Primary', baseFontSize: 36, lineHeight: 2.0, letterSpacing: 1.0, wordSpacing: 6, fontWeight: 'bold', dyslexiaFriendlyFont: false },
    highlightStyle: { ...DEFAULT_READER_CONFIG.highlightStyle, animationDurationMs: 200, activeWordBackground: '#FFD93D' },
    pageTransition: { type: 'slide', durationMs: 500, direction: 'horizontal', enableSwipeGesture: true, swipeThreshold: 30 },
  },
  '4-5': {
    textDisplay: { fontFamily: 'Sassoon Primary', baseFontSize: 32, lineHeight: 1.9, letterSpacing: 0.8, wordSpacing: 5, fontWeight: 'bold', dyslexiaFriendlyFont: false },
  },
  '5-6': {
    textDisplay: { fontFamily: 'Sassoon Primary', baseFontSize: 28, lineHeight: 1.8, letterSpacing: 0.5, wordSpacing: 4, fontWeight: 'normal', dyslexiaFriendlyFont: false },
  },
  '7-8': {
    textDisplay: { fontFamily: 'Sassoon Primary', baseFontSize: 24, lineHeight: 1.6, letterSpacing: 0.3, wordSpacing: 3, fontWeight: 'normal', dyslexiaFriendlyFont: false },
  },
  '8-9': {
    textDisplay: { fontFamily: 'Sassoon Primary', baseFontSize: 22, lineHeight: 1.5, letterSpacing: 0.2, wordSpacing: 2, fontWeight: 'normal', dyslexiaFriendlyFont: false },
  },
};

// ==========================================================================
// Section 4: Interactive Reader Engine
// ==========================================================================

export class InteractiveReaderEngine extends ScholarlyBaseService {
  private state: ReaderSessionState | null = null;
  private config: ReaderConfig;
  private book: RenderedBook | null = null;
  private pageAnalytics: Map<number, PageReadingAnalytics> = new Map();

  constructor(config?: Partial<ReaderConfig>) {
    super('InteractiveReaderEngine');
    this.config = { ...DEFAULT_READER_CONFIG, ...config };
  }

  /**
   * Load a book and initialise the reading session.
   * Returns the initial state the UI should render.
   */
  async loadBook(book: RenderedBook, mode: 'passive' | 'active', ageGroup: string): Promise<Result<ReaderSessionState>> {
    try {
      const ageConfig = AGE_SPECIFIC_CONFIGS[ageGroup];
      if (ageConfig) this.config = { ...this.config, ...ageConfig };

      this.book = book;
      this.state = {
        bookId: book.id,
        currentPage: 1,
        totalPages: book.pages.length,
        mode,
        readerState: 'ready',
        audioPosition: 0,
        currentWordIndex: -1,
        highlightedWords: [],
        pagesCompleted: [],
        startTime: new Date(),
        sessionId: `rs-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        isOffline: false,
      };

      this.log('info', 'Book loaded', { bookId: book.id, pages: book.pages.length, mode, ageGroup });
      return ok(this.state);
    } catch (error) { return fail(`Failed to load book: ${error}`); }
  }

  /**
   * Start playback on the current page.
   * In passive mode: plays audio and highlights words in sync.
   * In active mode: waits for the child to start reading.
   */
  startPage(): Result<PagePlaybackPlan> {
    if (!this.state || !this.book) return fail('No book loaded');
    const page = this.book.pages[this.state.currentPage - 1];
    if (!page) return fail(`Page ${this.state.currentPage} not found`);

    const plan: PagePlaybackPlan = {
      pageNumber: page.pageNumber,
      mode: this.state.mode,
      audioUrl: page.audioUrl,
      durationMs: page.durationMs,
      wordHighlightSequence: this.buildHighlightSequence(page),
      parallaxLayers: this.buildParallaxLayers(page.sceneComposition),
      textLayout: this.buildTextLayout(page),
    };

    this.state = { ...this.state, readerState: this.state.mode === 'passive' ? 'playing' : 'listening' };
    this.emit('reader:page-started', { pageNumber: page.pageNumber, mode: this.state.mode });
    return ok(plan);
  }

  /**
   * Handle audio position updates — the heartbeat of karaoke highlighting.
   * Called by the audio player at ~60fps (16ms intervals). Updates which
   * word should be highlighted based on the current playback position.
   */
  onAudioPositionUpdate(positionMs: number): HighlightUpdate | null {
    if (!this.state || !this.book || this.state.readerState !== 'playing') return null;
    const page = this.book.pages[this.state.currentPage - 1];
    if (!page) return null;

    const currentWord = page.wordTimestamps.findIndex(
      w => positionMs >= w.startMs && positionMs < w.endMs
    );

    if (currentWord === this.state.currentWordIndex) return null;

    const highlighted = page.wordTimestamps.filter(w => positionMs >= w.startMs).map(w => w.wordIndex);

    this.state = { ...this.state, audioPosition: positionMs, currentWordIndex: currentWord, highlightedWords: highlighted };

    return {
      currentWordIndex: currentWord,
      highlightedWordIndices: highlighted,
      currentWord: currentWord >= 0 ? page.wordTimestamps[currentWord] : null,
      isTargetGPC: currentWord >= 0 ? page.wordTimestamps[currentWord].isTargetGPC : false,
      progressPercent: page.durationMs > 0 ? (positionMs / page.durationMs) * 100 : 0,
    };
  }

  /**
   * Handle page audio complete — triggers page turn or book completion.
   */
  onPageAudioComplete(): PageCompleteAction {
    if (!this.state || !this.book) return { action: 'error' };

    const completed = [...this.state.pagesCompleted, this.state.currentPage];
    this.state = { ...this.state, pagesCompleted: completed };

    if (this.state.currentPage >= this.state.totalPages) {
      this.state = { ...this.state, readerState: 'complete' };
      this.emit('reader:book-complete', { bookId: this.state.bookId, sessionId: this.state.sessionId });
      return { action: 'book-complete', pagesRead: completed.length };
    }

    this.state = { ...this.state, readerState: 'page-turning' };
    return { action: 'next-page', nextPage: this.state.currentPage + 1, transitionConfig: this.config.pageTransition };
  }

  /**
   * Navigate to a specific page (user swipe or tap).
   */
  navigateToPage(pageNumber: number): Result<ReaderSessionState> {
    if (!this.state || !this.book) return fail('No book loaded');
    if (pageNumber < 1 || pageNumber > this.book.pages.length) return fail('Invalid page number');

    this.state = { ...this.state, currentPage: pageNumber, readerState: 'ready', audioPosition: 0, currentWordIndex: -1, highlightedWords: [] };
    this.emit('reader:page-navigated', { pageNumber });
    return ok(this.state);
  }

  /**
   * Record per-page reading analytics for active mode.
   */
  recordPageAnalytics(pageNumber: number, analytics: PageReadingAnalytics): void {
    this.pageAnalytics.set(pageNumber, analytics);
    this.emit('reader:page-analytics', { pageNumber, ...analytics });
  }

  /**
   * Build the final reading session summary for NATS publishing.
   */
  buildSessionSummary(): ReadingSessionSummary | null {
    if (!this.state || !this.book) return null;

    const pageResults = Array.from(this.pageAnalytics.entries()).map(([page, analytics]) => ({ pageNumber: page, ...analytics }));
    const totalCorrect = pageResults.reduce((s, p) => s + (p.wordsCorrect || 0), 0);
    const totalWords = pageResults.reduce((s, p) => s + (p.wordsTotal || 0), 0);
    const totalTargetCorrect = pageResults.reduce((s, p) => s + (p.targetGPCCorrect || 0), 0);
    const totalTargetWords = pageResults.reduce((s, p) => s + (p.targetGPCTotal || 0), 0);

    return {
      sessionId: this.state.sessionId,
      bookId: this.state.bookId,
      mode: this.state.mode,
      pagesRead: this.state.pagesCompleted.length,
      totalPages: this.state.totalPages,
      durationMs: Date.now() - this.state.startTime.getTime(),
      overallAccuracy: totalWords > 0 ? totalCorrect / totalWords : undefined,
      targetGPCAccuracy: totalTargetWords > 0 ? totalTargetCorrect / totalTargetWords : undefined,
      wcpm: this.calculateWCPM(totalCorrect),
      pageResults,
      completedAt: new Date(),
    };
  }

  // === Private helpers ===

  private buildHighlightSequence(page: RenderedPage): WordHighlightEvent[] {
    return page.wordTimestamps.map(w => ({
      wordIndex: w.wordIndex,
      word: w.word,
      startMs: w.startMs,
      endMs: w.endMs,
      isTargetGPC: w.isTargetGPC,
      highlightColor: w.isTargetGPC ? this.config.highlightStyle.targetGPCBackground : this.config.highlightStyle.activeWordBackground,
      textColor: w.isTargetGPC ? this.config.highlightStyle.targetGPCColor : this.config.highlightStyle.activeWordColor,
    }));
  }

  private buildParallaxLayers(scene: SceneCompositionRef): ParallaxLayer[] {
    if (!this.config.parallax.enabled) return [];
    const intensity = this.config.parallax.intensity;
    return [
      { depth: 'background', multiplier: scene.parallaxMultipliers[0] * intensity, maxOffset: this.config.parallax.maxOffset * 0.5 },
      { depth: 'midground', multiplier: scene.parallaxMultipliers[1] * intensity, maxOffset: this.config.parallax.maxOffset * 0.75 },
      { depth: 'foreground', multiplier: scene.parallaxMultipliers[2] * intensity, maxOffset: this.config.parallax.maxOffset },
    ];
  }

  private buildTextLayout(page: RenderedPage): TextLayoutResult {
    const config = this.config.textDisplay;
    const words = page.text.split(/\s+/);
    const targetSet = new Set(page.targetGPCWords.map(w => w.toLowerCase()));

    return {
      words: words.map((w, i) => ({
        text: w,
        index: i,
        isTargetGPC: targetSet.has(w.toLowerCase().replace(/[^a-z'-]/g, '')),
        charStart: page.text.indexOf(w),
        charEnd: page.text.indexOf(w) + w.length,
      })),
      fontFamily: config.fontFamily,
      fontSize: config.baseFontSize,
      lineHeight: config.lineHeight,
      letterSpacing: config.letterSpacing,
      position: page.textOverlay.position,
      backgroundOpacity: page.textOverlay.backgroundOpacity,
    };
  }

  private calculateWCPM(correctWords: number): number | undefined {
    if (!this.state) return undefined;
    const minutes = (Date.now() - this.state.startTime.getTime()) / 60000;
    return minutes > 0 ? Math.round(correctWords / minutes) : undefined;
  }

  getCurrentState(): ReaderSessionState | null { return this.state; }
  getConfig(): ReaderConfig { return this.config; }
}

// Supporting types for the reader engine

export interface PagePlaybackPlan {
  readonly pageNumber: number;
  readonly mode: 'passive' | 'active';
  readonly audioUrl: string;
  readonly durationMs: number;
  readonly wordHighlightSequence: WordHighlightEvent[];
  readonly parallaxLayers: ParallaxLayer[];
  readonly textLayout: TextLayoutResult;
}

export interface WordHighlightEvent {
  readonly wordIndex: number;
  readonly word: string;
  readonly startMs: number;
  readonly endMs: number;
  readonly isTargetGPC: boolean;
  readonly highlightColor: string;
  readonly textColor: string;
}

export interface HighlightUpdate {
  readonly currentWordIndex: number;
  readonly highlightedWordIndices: number[];
  readonly currentWord: WordTimestampRef | null;
  readonly isTargetGPC: boolean;
  readonly progressPercent: number;
}

export interface PageCompleteAction {
  readonly action: 'next-page' | 'book-complete' | 'error';
  readonly nextPage?: number;
  readonly pagesRead?: number;
  readonly transitionConfig?: PageTransitionConfig;
}

export interface ParallaxLayer {
  readonly depth: 'background' | 'midground' | 'foreground';
  readonly multiplier: number;
  readonly maxOffset: number;
}

export interface TextLayoutResult {
  readonly words: Array<{ text: string; index: number; isTargetGPC: boolean; charStart: number; charEnd: number }>;
  readonly fontFamily: string;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing: number;
  readonly position: string;
  readonly backgroundOpacity: number;
}

export interface PageReadingAnalytics {
  readonly wordsCorrect?: number;
  readonly wordsTotal?: number;
  readonly targetGPCCorrect?: number;
  readonly targetGPCTotal?: number;
  readonly durationMs: number;
  readonly attempts: number;
}

export interface ReadingSessionSummary {
  readonly sessionId: string;
  readonly bookId: string;
  readonly mode: 'passive' | 'active';
  readonly pagesRead: number;
  readonly totalPages: number;
  readonly durationMs: number;
  readonly overallAccuracy?: number;
  readonly targetGPCAccuracy?: number;
  readonly wcpm?: number;
  readonly pageResults: Array<{ pageNumber: number } & PageReadingAnalytics>;
  readonly completedAt: Date;
}

// ==========================================================================
// Section 5: Enchanted Library
// ==========================================================================
// The library is the discovery experience — where children find their
// next adventure. It organises books into personalised "shelves" based
// on the learner's BKT mastery profile, reading history, and interests.
// The metaphor is a magical library where bookshelves glow, characters
// peek from spines, and books float toward readers who are ready for them.

export interface LibraryShelf {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly type: ShelfType;
  readonly books: LibraryBookEntry[];
  readonly displayOrder: number;
  readonly animation: ShelfAnimation;
}

export type ShelfType =
  | 'ready-for-you'       // Curriculum-matched, right difficulty
  | 'favourites'          // Re-reads the child loves
  | 'adventures-waiting'  // Slightly above level — aspiration
  | 'community-picks'     // Popular community content
  | 'series-continue'     // Next in a series they've started
  | 'just-published'      // New additions to the library
  | 'achievement-unlock'  // Books unlocked by achievements
  | 'seasonal';           // Holiday or seasonal themes

export interface LibraryBookEntry {
  readonly bookId: string;
  readonly title: string;
  readonly coverImageUrl: string;
  readonly seriesName?: string;
  readonly phonicsPhase: number;
  readonly ageGroup: string;
  readonly readCount: number;
  readonly lastReadAt?: Date;
  readonly completionPercent: number;
  readonly matchScore: number;
  readonly isDownloaded: boolean;
  readonly isNew: boolean;
  readonly badges: string[];
}

export interface ShelfAnimation {
  readonly bookEntryAnimation: 'float' | 'pulse' | 'glow' | 'peek' | 'none';
  readonly shelfGlowColor: string;
  readonly bookHoverScale: number;
  readonly staggerDelayMs: number;
}

// === Library recommendation engine ===

export interface LearnerLibraryProfile {
  readonly learnerId: string;
  readonly currentPhase: number;
  readonly masteredGPCs: string[];
  readonly targetGPCs: string[];
  readonly wcpmBand: [number, number];
  readonly ageGroup: string;
  readonly preferredThemes: string[];
  readonly readBookIds: string[];
  readonly favouriteBookIds: string[];
  readonly seriesInProgress: string[];
  readonly achievementUnlocks: string[];
}

export class EnchantedLibraryEngine extends ScholarlyBaseService {
  constructor() { super('EnchantedLibraryEngine'); }

  /**
   * Build the complete library view for a learner.
   * Returns an ordered set of shelves, each populated with books
   * ranked by relevance to the learner's current profile.
   */
  buildLibraryView(profile: LearnerLibraryProfile, catalogue: LibraryBookEntry[]): LibraryShelf[] {
    const shelves: LibraryShelf[] = [];

    // Shelf 1: Ready For You — curriculum-matched books at the right level
    const readyForYou = this.selectReadyForYou(profile, catalogue);
    if (readyForYou.length > 0) {
      shelves.push({
        id: 'shelf-ready', name: 'Ready For You', description: 'Stories picked just for you!',
        type: 'ready-for-you', books: readyForYou.slice(0, 12), displayOrder: 1,
        animation: { bookEntryAnimation: 'glow', shelfGlowColor: '#FFD93D', bookHoverScale: 1.1, staggerDelayMs: 80 },
      });
    }

    // Shelf 2: Continue Your Series
    const seriesContinue = this.selectSeriesContinuation(profile, catalogue);
    if (seriesContinue.length > 0) {
      shelves.push({
        id: 'shelf-series', name: 'What Happens Next?', description: 'Continue your favourite stories',
        type: 'series-continue', books: seriesContinue.slice(0, 8), displayOrder: 2,
        animation: { bookEntryAnimation: 'peek', shelfGlowColor: '#6BCB77', bookHoverScale: 1.08, staggerDelayMs: 100 },
      });
    }

    // Shelf 3: Favourites — books they've read and loved
    const favourites = catalogue.filter(b => profile.favouriteBookIds.includes(b.bookId));
    if (favourites.length > 0) {
      shelves.push({
        id: 'shelf-favourites', name: 'Your Favourites', description: 'Stories you love to read again',
        type: 'favourites', books: favourites.slice(0, 10), displayOrder: 3,
        animation: { bookEntryAnimation: 'pulse', shelfGlowColor: '#FF6B6B', bookHoverScale: 1.05, staggerDelayMs: 60 },
      });
    }

    // Shelf 4: Adventures Waiting — slightly above current level
    const aspirational = this.selectAspirational(profile, catalogue);
    if (aspirational.length > 0) {
      shelves.push({
        id: 'shelf-adventures', name: 'Adventures Waiting', description: 'Ready for a bigger challenge?',
        type: 'adventures-waiting', books: aspirational.slice(0, 8), displayOrder: 4,
        animation: { bookEntryAnimation: 'float', shelfGlowColor: '#4ECDC4', bookHoverScale: 1.12, staggerDelayMs: 120 },
      });
    }

    // Shelf 5: Community Picks — popular with other learners
    const communityPicks = this.selectCommunityPicks(profile, catalogue);
    if (communityPicks.length > 0) {
      shelves.push({
        id: 'shelf-community', name: 'Community Picks', description: 'Popular with other readers',
        type: 'community-picks', books: communityPicks.slice(0, 10), displayOrder: 5,
        animation: { bookEntryAnimation: 'none', shelfGlowColor: '#A78BFA', bookHoverScale: 1.06, staggerDelayMs: 70 },
      });
    }

    // Shelf 6: Achievement Unlocks
    if (profile.achievementUnlocks.length > 0) {
      const unlocked = catalogue.filter(b => profile.achievementUnlocks.some(a => b.badges.includes(a)));
      if (unlocked.length > 0) {
        shelves.push({
          id: 'shelf-unlocked', name: 'Achievement Unlocked!', description: 'You earned these special books',
          type: 'achievement-unlock', books: unlocked.slice(0, 6), displayOrder: 6,
          animation: { bookEntryAnimation: 'glow', shelfGlowColor: '#F59E0B', bookHoverScale: 1.15, staggerDelayMs: 150 },
        });
      }
    }

    return shelves;
  }

  /**
   * Select books matching the learner's current phonics phase and reading level.
   * These are the pedagogically optimal books — decodable with the learner's
   * mastered GPCs and targeting their next GPCs for growth.
   */
  private selectReadyForYou(profile: LearnerLibraryProfile, catalogue: LibraryBookEntry[]): LibraryBookEntry[] {
    const unread = catalogue.filter(b => !profile.readBookIds.includes(b.bookId));
    return unread.filter(b => b.phonicsPhase === profile.currentPhase || b.phonicsPhase === profile.currentPhase - 1)
      .map(b => {
        let score = 0;
        if (b.phonicsPhase === profile.currentPhase) score += 5;
        if (b.ageGroup === profile.ageGroup) score += 3;
        if (profile.preferredThemes.some(t => b.title.toLowerCase().includes(t))) score += 2;
        if (b.isNew) score += 1;
        return { ...b, matchScore: score };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Find the next book in series the learner has started.
   */
  private selectSeriesContinuation(profile: LearnerLibraryProfile, catalogue: LibraryBookEntry[]): LibraryBookEntry[] {
    return catalogue.filter(b =>
      b.seriesName && profile.seriesInProgress.includes(b.seriesName) && !profile.readBookIds.includes(b.bookId)
    ).sort((a, b) => a.title.localeCompare(b.title));
  }

  /**
   * Select books one phase above current — stretch reads for aspiration.
   */
  private selectAspirational(profile: LearnerLibraryProfile, catalogue: LibraryBookEntry[]): LibraryBookEntry[] {
    return catalogue.filter(b =>
      b.phonicsPhase === profile.currentPhase + 1 && !profile.readBookIds.includes(b.bookId)
    ).sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Popular books at the learner's level from the community.
   */
  private selectCommunityPicks(profile: LearnerLibraryProfile, catalogue: LibraryBookEntry[]): LibraryBookEntry[] {
    return catalogue.filter(b =>
      b.phonicsPhase <= profile.currentPhase + 1 && b.readCount > 10
    ).sort((a, b) => b.readCount - a.readCount);
  }
}

// ==========================================================================
// Section 6: Reading Analytics Loop
// ==========================================================================
// Bridges the reader engine to the NATS event bus. Every reading session
// generates analytics events that flow through NATS to the BKT engine,
// parent dashboard, teacher analytics, and engagement aggregators.

export interface ReadingAnalyticsConfig {
  readonly publishToNATS: boolean;
  readonly publishPageEvents: boolean;
  readonly publishSessionEvents: boolean;
  readonly publishMasteryUpdates: boolean;
  readonly batchPageEvents: boolean;
  readonly batchIntervalMs: number;
}

export const DEFAULT_ANALYTICS_CONFIG: ReadingAnalyticsConfig = {
  publishToNATS: true,
  publishPageEvents: true,
  publishSessionEvents: true,
  publishMasteryUpdates: true,
  batchPageEvents: true,
  batchIntervalMs: 5000,
};

export class ReadingAnalyticsLoop extends ScholarlyBaseService {
  private config: ReadingAnalyticsConfig;
  private pageEventBuffer: Array<{ subject: string; event: any }> = [];

  constructor(config?: Partial<ReadingAnalyticsConfig>) {
    super('ReadingAnalyticsLoop');
    this.config = { ...DEFAULT_ANALYTICS_CONFIG, ...config };
  }

  /**
   * Build the NATS event for a page-level reading result.
   * Subject: scholarly.analytics.reading.page.{learnerId}
   */
  buildPageAnalyticsEvent(learnerId: string, tenantId: string, bookId: string, pageNumber: number, analytics: PageReadingAnalytics): { subject: string; payload: Record<string, any> } {
    return {
      subject: `scholarly.analytics.reading.page.${learnerId}`,
      payload: {
        specversion: '1.0',
        id: `evt-page-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
        source: '/scholarly/interactive-reader',
        type: 'scholarly.analytics.reading.page',
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        tenantid: tenantId,
        userid: learnerId,
        data: { learnerId, bookId, pageNumber, ...analytics },
      },
    };
  }

  /**
   * Build the NATS event for a completed reading session.
   * Subject: scholarly.phonics.session.completed.{learnerId}
   */
  buildSessionCompletedEvent(learnerId: string, tenantId: string, summary: ReadingSessionSummary): { subject: string; payload: Record<string, any> } {
    return {
      subject: `scholarly.phonics.session.completed.${learnerId}`,
      payload: {
        specversion: '1.0',
        id: `evt-session-${summary.sessionId}`,
        source: '/scholarly/interactive-reader',
        type: 'scholarly.phonics.session.completed',
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        tenantid: tenantId,
        userid: learnerId,
        data: summary,
      },
    };
  }

  /**
   * Build mastery update events for each target GPC.
   * Subject: scholarly.phonics.mastery.updated.{learnerId}
   */
  buildMasteryUpdateEvents(learnerId: string, tenantId: string, gpcResults: Array<{ gpc: string; correct: number; total: number; newMastery: number; previousMastery: number }>): Array<{ subject: string; payload: Record<string, any> }> {
    return gpcResults.map(r => ({
      subject: `scholarly.phonics.mastery.updated.${learnerId}`,
      payload: {
        specversion: '1.0',
        id: `evt-mastery-${Date.now()}-${r.gpc}`,
        source: '/scholarly/interactive-reader',
        type: 'scholarly.phonics.mastery.updated',
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        tenantid: tenantId,
        userid: learnerId,
        data: { learnerId, gpc: r.gpc, mastery: r.newMastery, previousMastery: r.previousMastery, evidenceSource: 'reading-session' },
      },
    }));
  }
}

// ==========================================================================
// Section 7: Offline Reading Support
// ==========================================================================
// Download management for offline reading. Books are downloaded as a
// manifest (JSON metadata) + illustrations (WebP) + audio (MP3) +
// timestamp manifests (JSON). Local BKT computation runs when offline,
// with a sync queue that replays analytics events when connectivity returns.

export interface DownloadManifest {
  readonly bookId: string;
  readonly version: number;
  readonly pages: DownloadPageManifest[];
  readonly totalSizeBytes: number;
  readonly downloadedAt?: Date;
  readonly expiresAt?: Date;
}

export interface DownloadPageManifest {
  readonly pageNumber: number;
  readonly illustrationUrl: string;
  readonly illustrationSizeBytes: number;
  readonly audioUrl: string;
  readonly audioSizeBytes: number;
  readonly timestampManifestUrl: string;
  readonly timestampSizeBytes: number;
}

export interface OfflineReadingConfig {
  readonly maxDownloadedBooks: number;
  readonly maxStorageMb: number;
  readonly autoDownloadOnWifi: boolean;
  readonly expiryDays: number;
  readonly syncQueueMaxSize: number;
  readonly localBKTEnabled: boolean;
}

export const DEFAULT_OFFLINE_CONFIG: OfflineReadingConfig = {
  maxDownloadedBooks: 20,
  maxStorageMb: 500,
  autoDownloadOnWifi: true,
  expiryDays: 30,
  syncQueueMaxSize: 1000,
  localBKTEnabled: true,
};

export class OfflineReadingManager extends ScholarlyBaseService {
  private config: OfflineReadingConfig;
  private downloadedBooks: Map<string, DownloadManifest> = new Map();
  private syncQueue: Array<{ subject: string; payload: any; timestamp: Date }> = [];

  constructor(config?: Partial<OfflineReadingConfig>) {
    super('OfflineReadingManager');
    this.config = { ...DEFAULT_OFFLINE_CONFIG, ...config };
  }

  /**
   * Build download manifest for a book.
   * The manifest lists every asset that needs to be cached for offline reading.
   */
  buildDownloadManifest(book: RenderedBook): DownloadManifest {
    const pages = book.pages.map(p => ({
      pageNumber: p.pageNumber,
      illustrationUrl: p.illustrationUrl,
      illustrationSizeBytes: 150000,       // Avg WebP illustration ~150KB
      audioUrl: p.audioUrl,
      audioSizeBytes: Math.round(p.durationMs * 16),  // ~128kbps MP3
      timestampManifestUrl: p.timestampManifestUrl,
      timestampSizeBytes: 2000,            // JSON timestamps ~2KB
    }));

    const totalSize = pages.reduce((s, p) => s + p.illustrationSizeBytes + p.audioSizeBytes + p.timestampSizeBytes, 0);

    return {
      bookId: book.id,
      version: 1,
      pages,
      totalSizeBytes: totalSize,
    };
  }

  /**
   * Check if download is possible within storage limits.
   */
  canDownload(manifest: DownloadManifest): Result<void> {
    if (this.downloadedBooks.size >= this.config.maxDownloadedBooks) {
      return fail(`Download limit reached (${this.config.maxDownloadedBooks} books). Remove a book first.`);
    }
    const currentUsage = Array.from(this.downloadedBooks.values()).reduce((s, m) => s + m.totalSizeBytes, 0);
    const availableBytes = this.config.maxStorageMb * 1024 * 1024 - currentUsage;
    if (manifest.totalSizeBytes > availableBytes) {
      return fail(`Insufficient storage. Need ${(manifest.totalSizeBytes / 1024 / 1024).toFixed(1)}MB, have ${(availableBytes / 1024 / 1024).toFixed(1)}MB`);
    }
    return ok(undefined);
  }

  /**
   * Mark a book as downloaded.
   */
  markDownloaded(manifest: DownloadManifest): void {
    const m = { ...manifest, downloadedAt: new Date(), expiresAt: new Date(Date.now() + this.config.expiryDays * 86400000) };
    this.downloadedBooks.set(manifest.bookId, m);
    this.log('info', 'Book downloaded for offline', { bookId: manifest.bookId, sizeBytes: manifest.totalSizeBytes });
  }

  /**
   * Queue an analytics event for later sync.
   */
  queueForSync(subject: string, payload: any): Result<void> {
    if (this.syncQueue.length >= this.config.syncQueueMaxSize) {
      return fail('Sync queue full — oldest events will be dropped');
    }
    this.syncQueue.push({ subject, payload, timestamp: new Date() });
    return ok(undefined);
  }

  /**
   * Get all queued events for sync when connectivity returns.
   */
  drainSyncQueue(): Array<{ subject: string; payload: any; timestamp: Date }> {
    const events = [...this.syncQueue];
    this.syncQueue = [];
    this.log('info', 'Sync queue drained', { events: events.length });
    return events;
  }

  /**
   * Remove expired downloads to free storage.
   */
  cleanExpired(): number {
    const now = new Date();
    let removed = 0;
    for (const [bookId, manifest] of this.downloadedBooks.entries()) {
      if (manifest.expiresAt && manifest.expiresAt < now) {
        this.downloadedBooks.delete(bookId);
        removed++;
      }
    }
    if (removed > 0) this.log('info', 'Expired downloads removed', { count: removed });
    return removed;
  }

  isDownloaded(bookId: string): boolean { return this.downloadedBooks.has(bookId); }
  getDownloadedBooks(): DownloadManifest[] { return Array.from(this.downloadedBooks.values()); }
  getSyncQueueSize(): number { return this.syncQueue.length; }
  getStorageUsage(): { usedMb: number; availableMb: number; bookCount: number } {
    const used = Array.from(this.downloadedBooks.values()).reduce((s, m) => s + m.totalSizeBytes, 0) / 1024 / 1024;
    return { usedMb: Math.round(used * 10) / 10, availableMb: Math.round((this.config.maxStorageMb - used) * 10) / 10, bookCount: this.downloadedBooks.size };
  }
}
