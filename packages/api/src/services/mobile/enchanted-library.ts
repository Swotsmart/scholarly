// =============================================================================
// SCHOLARLY PLATFORM — Sprint 10: UI-001
// Enchanted Library UI
// =============================================================================
// The Enchanted Library is where the magic of the strategy document's vision
// materialises. Remember those concept images — books leaping from shelves,
// characters peeking from spines, letters floating in the air, entire worlds
// emerging from pages? This service defines the data structures, animation
// specifications, layout algorithms, and interaction models that make that
// vision achievable with CSS transforms, Lottie animations, and Reanimated
// on React Native.
//
// The library isn't just a grid of thumbnails — it's a living environment
// that responds to the child's progress, celebrates their achievements,
// and gently guides them toward books that will stretch their abilities
// without frustrating them. Think of it as a librarian who knows every
// child by name and always has the perfect book waiting on the counter.
// =============================================================================

import { Result } from '../shared/base';

// =============================================================================
// SECTION 1: LIBRARY ENVIRONMENT THEMING
// =============================================================================

/**
 * The library environment changes as the learner progresses through phonics
 * phases. Phase 1 learners see a warm, cozy nursery with soft lighting and
 * friendly characters. Phase 4+ learners explore a grand enchanted castle
 * library with soaring shelves and hidden passages. This progressive theming
 * reinforces the feeling of growing up as a reader.
 */

export enum LibraryTheme {
  NURSERY = 'nursery',           // Phase 1: warm, soft, simple
  TREEHOUSE = 'treehouse',       // Phase 2: nature, adventure begins
  ENCHANTED_COTTAGE = 'enchanted_cottage', // Phase 3: magical elements appear
  CASTLE_LIBRARY = 'castle_library',       // Phase 4: grand, expansive
  WIZARD_TOWER = 'wizard_tower',           // Phase 5: mystical, complex
  INFINITE_LIBRARY = 'infinite_library',   // Phase 6: endless possibility
}

export interface LibraryEnvironment {
  theme: LibraryTheme;
  backgroundLayers: EnvironmentLayer[];
  ambientAnimations: AmbientAnimation[];
  lightingConfig: LightingConfig;
  soundscapeUrl: string | null;
  particleEffects: ParticleEffect[];
  unlockAnimation: string | null;    // played when environment first unlocks
}

export interface EnvironmentLayer {
  id: string;
  imageUrl: string;
  depth: number;               // 0 (far back) to 1 (foreground)
  parallaxMultiplier: number;  // how much it moves on scroll/tilt
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'soft-light';
}

export interface AmbientAnimation {
  id: string;
  type: 'lottie' | 'sprite' | 'css';
  assetUrl: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  loop: boolean;
  playOnScroll: boolean;
  triggerDistance: number;      // pixels from viewport to trigger
  speed: number;
}

export interface LightingConfig {
  ambientColor: string;
  ambientIntensity: number;
  spotlightOnNewBooks: boolean;
  spotlightColor: string;
  timeOfDayAdaptive: boolean;  // warm tones in evening
  warmthShift: number;         // 0-1, applied in evening hours
}

export interface ParticleEffect {
  type: 'sparkle' | 'dust' | 'letters' | 'firefly' | 'snow' | 'leaves';
  density: number;             // particles per screen area
  speed: number;
  color: string;
  size: { min: number; max: number };
  region: 'full_screen' | 'shelves_only' | 'header';
}

/** Phase → theme mapping */
export const PHASE_THEME_MAP: Record<number, LibraryTheme> = {
  1: LibraryTheme.NURSERY,
  2: LibraryTheme.TREEHOUSE,
  3: LibraryTheme.ENCHANTED_COTTAGE,
  4: LibraryTheme.CASTLE_LIBRARY,
  5: LibraryTheme.WIZARD_TOWER,
  6: LibraryTheme.INFINITE_LIBRARY,
};

/** Environment configurations for each theme */
export const LIBRARY_ENVIRONMENTS: Record<LibraryTheme, LibraryEnvironment> = {
  [LibraryTheme.NURSERY]: {
    theme: LibraryTheme.NURSERY,
    backgroundLayers: [
      { id: 'wall', imageUrl: '/assets/library/nursery/wall.png', depth: 0, parallaxMultiplier: 0.1, opacity: 1, blendMode: 'normal' },
      { id: 'window', imageUrl: '/assets/library/nursery/window.png', depth: 0.3, parallaxMultiplier: 0.2, opacity: 1, blendMode: 'normal' },
      { id: 'rug', imageUrl: '/assets/library/nursery/rug.png', depth: 0.8, parallaxMultiplier: 0.5, opacity: 1, blendMode: 'normal' },
    ],
    ambientAnimations: [
      { id: 'mobile', type: 'lottie', assetUrl: '/assets/library/nursery/mobile.json', position: { x: 0.7, y: 0.1 }, size: { width: 120, height: 120 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.5 },
      { id: 'nightlight', type: 'lottie', assetUrl: '/assets/library/nursery/nightlight.json', position: { x: 0.9, y: 0.4 }, size: { width: 60, height: 80 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.3 },
    ],
    lightingConfig: { ambientColor: '#FFF8E7', ambientIntensity: 0.9, spotlightOnNewBooks: true, spotlightColor: '#FFE082', timeOfDayAdaptive: true, warmthShift: 0.3 },
    soundscapeUrl: '/audio/ambient/nursery-gentle.mp3',
    particleEffects: [
      { type: 'sparkle', density: 0.3, speed: 0.5, color: '#FFD700', size: { min: 2, max: 5 }, region: 'shelves_only' },
    ],
    unlockAnimation: null,
  },
  [LibraryTheme.TREEHOUSE]: {
    theme: LibraryTheme.TREEHOUSE,
    backgroundLayers: [
      { id: 'sky', imageUrl: '/assets/library/treehouse/sky.png', depth: 0, parallaxMultiplier: 0.05, opacity: 1, blendMode: 'normal' },
      { id: 'branches', imageUrl: '/assets/library/treehouse/branches.png', depth: 0.4, parallaxMultiplier: 0.3, opacity: 1, blendMode: 'normal' },
      { id: 'platform', imageUrl: '/assets/library/treehouse/platform.png', depth: 0.7, parallaxMultiplier: 0.5, opacity: 1, blendMode: 'normal' },
    ],
    ambientAnimations: [
      { id: 'bird', type: 'lottie', assetUrl: '/assets/library/treehouse/bird.json', position: { x: 0.2, y: 0.15 }, size: { width: 80, height: 60 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.7 },
      { id: 'leaves', type: 'sprite', assetUrl: '/assets/library/treehouse/falling-leaves.png', position: { x: 0, y: 0 }, size: { width: 400, height: 800 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.4 },
    ],
    lightingConfig: { ambientColor: '#F0FFF0', ambientIntensity: 1.0, spotlightOnNewBooks: true, spotlightColor: '#98FB98', timeOfDayAdaptive: true, warmthShift: 0.2 },
    soundscapeUrl: '/audio/ambient/treehouse-birds.mp3',
    particleEffects: [
      { type: 'leaves', density: 0.5, speed: 0.8, color: '#228B22', size: { min: 8, max: 16 }, region: 'full_screen' },
    ],
    unlockAnimation: '/assets/library/treehouse/unlock-climb.json',
  },
  [LibraryTheme.ENCHANTED_COTTAGE]: {
    theme: LibraryTheme.ENCHANTED_COTTAGE,
    backgroundLayers: [
      { id: 'stone_wall', imageUrl: '/assets/library/cottage/stone.png', depth: 0, parallaxMultiplier: 0.1, opacity: 1, blendMode: 'normal' },
      { id: 'fireplace', imageUrl: '/assets/library/cottage/fireplace.png', depth: 0.3, parallaxMultiplier: 0.2, opacity: 1, blendMode: 'normal' },
      { id: 'cauldron', imageUrl: '/assets/library/cottage/cauldron.png', depth: 0.6, parallaxMultiplier: 0.4, opacity: 0.8, blendMode: 'normal' },
    ],
    ambientAnimations: [
      { id: 'fire', type: 'lottie', assetUrl: '/assets/library/cottage/fire.json', position: { x: 0.5, y: 0.6 }, size: { width: 200, height: 150 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.8 },
      { id: 'cat', type: 'lottie', assetUrl: '/assets/library/cottage/cat.json', position: { x: 0.3, y: 0.75 }, size: { width: 100, height: 80 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.3 },
    ],
    lightingConfig: { ambientColor: '#FFF0E0', ambientIntensity: 0.8, spotlightOnNewBooks: true, spotlightColor: '#FF8C00', timeOfDayAdaptive: false, warmthShift: 0.5 },
    soundscapeUrl: '/audio/ambient/cottage-fire.mp3',
    particleEffects: [
      { type: 'sparkle', density: 0.6, speed: 0.6, color: '#FF6347', size: { min: 3, max: 7 }, region: 'shelves_only' },
      { type: 'dust', density: 0.2, speed: 0.3, color: '#D4A574', size: { min: 1, max: 3 }, region: 'full_screen' },
    ],
    unlockAnimation: '/assets/library/cottage/unlock-door.json',
  },
  [LibraryTheme.CASTLE_LIBRARY]: {
    theme: LibraryTheme.CASTLE_LIBRARY,
    backgroundLayers: [
      { id: 'stone_arches', imageUrl: '/assets/library/castle/arches.png', depth: 0, parallaxMultiplier: 0.1, opacity: 1, blendMode: 'normal' },
      { id: 'stained_glass', imageUrl: '/assets/library/castle/glass.png', depth: 0.2, parallaxMultiplier: 0.15, opacity: 0.7, blendMode: 'screen' },
      { id: 'tall_shelves', imageUrl: '/assets/library/castle/shelves.png', depth: 0.5, parallaxMultiplier: 0.35, opacity: 1, blendMode: 'normal' },
      { id: 'reading_desk', imageUrl: '/assets/library/castle/desk.png', depth: 0.8, parallaxMultiplier: 0.6, opacity: 1, blendMode: 'normal' },
    ],
    ambientAnimations: [
      { id: 'candles', type: 'lottie', assetUrl: '/assets/library/castle/candles.json', position: { x: 0.8, y: 0.2 }, size: { width: 60, height: 100 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.5 },
    ],
    lightingConfig: { ambientColor: '#F5F0E8', ambientIntensity: 0.7, spotlightOnNewBooks: true, spotlightColor: '#FFD700', timeOfDayAdaptive: true, warmthShift: 0.4 },
    soundscapeUrl: '/audio/ambient/castle-echo.mp3',
    particleEffects: [
      { type: 'dust', density: 0.3, speed: 0.2, color: '#C0A875', size: { min: 1, max: 4 }, region: 'full_screen' },
      { type: 'sparkle', density: 0.4, speed: 0.7, color: '#FFD700', size: { min: 2, max: 6 }, region: 'shelves_only' },
    ],
    unlockAnimation: '/assets/library/castle/unlock-gates.json',
  },
  [LibraryTheme.WIZARD_TOWER]: {
    theme: LibraryTheme.WIZARD_TOWER,
    backgroundLayers: [
      { id: 'spiral_stairs', imageUrl: '/assets/library/wizard/stairs.png', depth: 0, parallaxMultiplier: 0.1, opacity: 1, blendMode: 'normal' },
      { id: 'floating_books', imageUrl: '/assets/library/wizard/floating.png', depth: 0.4, parallaxMultiplier: 0.3, opacity: 0.9, blendMode: 'normal' },
      { id: 'crystal_ball', imageUrl: '/assets/library/wizard/crystal.png', depth: 0.7, parallaxMultiplier: 0.5, opacity: 0.8, blendMode: 'screen' },
    ],
    ambientAnimations: [
      { id: 'floating_book', type: 'lottie', assetUrl: '/assets/library/wizard/float-book.json', position: { x: 0.6, y: 0.3 }, size: { width: 80, height: 60 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.4 },
      { id: 'crystal_glow', type: 'lottie', assetUrl: '/assets/library/wizard/crystal-glow.json', position: { x: 0.4, y: 0.5 }, size: { width: 120, height: 120 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.6 },
    ],
    lightingConfig: { ambientColor: '#E8E0F0', ambientIntensity: 0.6, spotlightOnNewBooks: true, spotlightColor: '#9370DB', timeOfDayAdaptive: false, warmthShift: 0.1 },
    soundscapeUrl: '/audio/ambient/wizard-mystical.mp3',
    particleEffects: [
      { type: 'sparkle', density: 0.8, speed: 0.9, color: '#9370DB', size: { min: 3, max: 8 }, region: 'full_screen' },
      { type: 'letters', density: 0.3, speed: 0.4, color: '#DDA0DD', size: { min: 10, max: 18 }, region: 'header' },
    ],
    unlockAnimation: '/assets/library/wizard/unlock-portal.json',
  },
  [LibraryTheme.INFINITE_LIBRARY]: {
    theme: LibraryTheme.INFINITE_LIBRARY,
    backgroundLayers: [
      { id: 'void', imageUrl: '/assets/library/infinite/void.png', depth: 0, parallaxMultiplier: 0.05, opacity: 1, blendMode: 'normal' },
      { id: 'endless_shelves', imageUrl: '/assets/library/infinite/shelves.png', depth: 0.3, parallaxMultiplier: 0.2, opacity: 0.9, blendMode: 'normal' },
      { id: 'light_beams', imageUrl: '/assets/library/infinite/beams.png', depth: 0.5, parallaxMultiplier: 0.4, opacity: 0.6, blendMode: 'screen' },
      { id: 'floating_pages', imageUrl: '/assets/library/infinite/pages.png', depth: 0.7, parallaxMultiplier: 0.6, opacity: 0.7, blendMode: 'normal' },
    ],
    ambientAnimations: [
      { id: 'aurora', type: 'lottie', assetUrl: '/assets/library/infinite/aurora.json', position: { x: 0, y: 0 }, size: { width: 400, height: 200 }, loop: true, playOnScroll: false, triggerDistance: 0, speed: 0.3 },
    ],
    lightingConfig: { ambientColor: '#F0F8FF', ambientIntensity: 0.5, spotlightOnNewBooks: true, spotlightColor: '#00CED1', timeOfDayAdaptive: false, warmthShift: 0 },
    soundscapeUrl: '/audio/ambient/infinite-ethereal.mp3',
    particleEffects: [
      { type: 'firefly', density: 0.6, speed: 0.5, color: '#00CED1', size: { min: 4, max: 10 }, region: 'full_screen' },
      { type: 'letters', density: 0.5, speed: 0.6, color: '#87CEEB', size: { min: 12, max: 24 }, region: 'full_screen' },
    ],
    unlockAnimation: '/assets/library/infinite/unlock-dimension.json',
  },
};

// =============================================================================
// SECTION 2: PERSONALISED SHELVES
// =============================================================================

export enum ShelfType {
  READY_FOR_YOU = 'ready_for_you',
  FAVOURITES = 'favourites',
  ADVENTURES_WAITING = 'adventures_waiting',
  COMMUNITY_PICKS = 'community_picks',
  RECENTLY_READ = 'recently_read',
  DOWNLOADED = 'downloaded',
  SERIES = 'series',
  NEW_ARRIVALS = 'new_arrivals',
  PHASE_COLLECTION = 'phase_collection',
}

export interface ShelfDefinition {
  type: ShelfType;
  title: string;
  subtitle: string;
  icon: string;
  sortOrder: number;
  maxBooks: number;
  refreshIntervalMs: number;
  emptyStateMessage: string;
  emptyStateAction: string;
  requiresAuth: boolean;
  visibleOffline: boolean;
}

export const SHELF_DEFINITIONS: ShelfDefinition[] = [
  {
    type: ShelfType.READY_FOR_YOU,
    title: 'Ready For You',
    subtitle: 'Stories matched to your reading level',
    icon: '✨',
    sortOrder: 1,
    maxBooks: 12,
    refreshIntervalMs: 300000,
    emptyStateMessage: "We're finding the perfect books for you!",
    emptyStateAction: 'Take a quick reading check',
    requiresAuth: true,
    visibleOffline: true,
  },
  {
    type: ShelfType.RECENTLY_READ,
    title: 'Recently Read',
    subtitle: 'Pick up where you left off',
    icon: '📖',
    sortOrder: 2,
    maxBooks: 8,
    refreshIntervalMs: 60000,
    emptyStateMessage: "You haven't read any books yet!",
    emptyStateAction: 'Start your first adventure',
    requiresAuth: true,
    visibleOffline: true,
  },
  {
    type: ShelfType.FAVOURITES,
    title: 'Favourites',
    subtitle: 'Books you love to read again',
    icon: '❤️',
    sortOrder: 3,
    maxBooks: 20,
    refreshIntervalMs: 600000,
    emptyStateMessage: 'Tap the heart on any book to save it here!',
    emptyStateAction: 'Explore the library',
    requiresAuth: true,
    visibleOffline: true,
  },
  {
    type: ShelfType.ADVENTURES_WAITING,
    title: 'Adventures Waiting',
    subtitle: 'A little challenging — ready when you are!',
    icon: '🚀',
    sortOrder: 4,
    maxBooks: 8,
    refreshIntervalMs: 300000,
    emptyStateMessage: "You're reading so well — keep going!",
    emptyStateAction: 'Keep practising',
    requiresAuth: true,
    visibleOffline: false,
  },
  {
    type: ShelfType.COMMUNITY_PICKS,
    title: 'Community Picks',
    subtitle: 'Popular with readers like you',
    icon: '🌟',
    sortOrder: 5,
    maxBooks: 10,
    refreshIntervalMs: 3600000,
    emptyStateMessage: 'Community picks are loading...',
    emptyStateAction: 'Check back soon',
    requiresAuth: false,
    visibleOffline: false,
  },
  {
    type: ShelfType.NEW_ARRIVALS,
    title: 'New Arrivals',
    subtitle: 'Fresh stories from our creators',
    icon: '🆕',
    sortOrder: 6,
    maxBooks: 10,
    refreshIntervalMs: 3600000,
    emptyStateMessage: 'New books are on their way!',
    emptyStateAction: 'Check back tomorrow',
    requiresAuth: false,
    visibleOffline: false,
  },
  {
    type: ShelfType.DOWNLOADED,
    title: 'Downloaded',
    subtitle: 'Available offline',
    icon: '📥',
    sortOrder: 7,
    maxBooks: 50,
    refreshIntervalMs: 0,
    emptyStateMessage: 'Download books to read offline!',
    emptyStateAction: 'Browse and download',
    requiresAuth: true,
    visibleOffline: true,
  },
];

// =============================================================================
// SECTION 3: BOOK CARD COMPONENT SPECIFICATION
// =============================================================================

export interface BookCardData {
  storybookId: string;
  title: string;
  coverImageUrl: string;
  artStyle: string;
  phonicsPhase: number;
  decodabilityScore: number;
  targetGpcs: string[];
  pageCount: number;
  estimatedReadTimeMinutes: number;
  seriesName: string | null;
  seriesPosition: number | null;
  authorName: string;
  authorType: 'scholarly' | 'community' | 'educator';
  rating: number;
  readCount: number;
  language: string;

  // User-specific state
  isDownloaded: boolean;
  downloadProgress: number;
  isFavourite: boolean;
  readProgress: number;         // 0-1
  lastReadAt: number | null;
  timesRead: number;

  // Visual config
  spineColor: string;
  glowColor: string;
  badgeType: BookBadge | null;
}

export enum BookBadge {
  NEW = 'new',
  POPULAR = 'popular',
  SERIES = 'series',
  PERFECT_MATCH = 'perfect_match',
  CHALLENGE = 'challenge',
  COMMUNITY = 'community',
  DOWNLOADED = 'downloaded',
  UNREAD = 'unread',
}

/**
 * Book card visual states — the card appearance changes based on context.
 * On the shelf, books are shown as 3D-ish spines with parallax tilt.
 * When highlighted, they "pop out" with a glow effect.
 * When being read, they have a progress indicator on the spine.
 */
export interface BookCardVisualConfig {
  display: 'spine' | 'cover' | 'mini';
  tiltDegrees: number;          // 3D perspective tilt
  glowIntensity: number;       // 0-1
  scaleOnHover: number;        // 1.05 typical
  showProgressBar: boolean;
  showBadge: boolean;
  showRating: boolean;
  showReadCount: boolean;
  animateOnAppear: boolean;
  appearDelay: number;          // staggered animation
}

export const BOOK_CARD_PRESETS: Record<string, BookCardVisualConfig> = {
  'shelf_spine': {
    display: 'spine', tiltDegrees: 5, glowIntensity: 0.3, scaleOnHover: 1.08,
    showProgressBar: true, showBadge: true, showRating: false,
    showReadCount: false, animateOnAppear: true, appearDelay: 50,
  },
  'shelf_cover': {
    display: 'cover', tiltDegrees: 3, glowIntensity: 0.2, scaleOnHover: 1.05,
    showProgressBar: true, showBadge: true, showRating: true,
    showReadCount: true, animateOnAppear: true, appearDelay: 80,
  },
  'search_result': {
    display: 'cover', tiltDegrees: 0, glowIntensity: 0, scaleOnHover: 1.03,
    showProgressBar: false, showBadge: false, showRating: true,
    showReadCount: true, animateOnAppear: false, appearDelay: 0,
  },
  'mini_recommendation': {
    display: 'mini', tiltDegrees: 0, glowIntensity: 0.1, scaleOnHover: 1.1,
    showProgressBar: false, showBadge: true, showRating: false,
    showReadCount: false, animateOnAppear: true, appearDelay: 30,
  },
};

// =============================================================================
// SECTION 4: BOOK OPENING ANIMATION
// =============================================================================

/**
 * The signature interaction: tapping a book on the shelf triggers a
 * cinematic opening animation that transitions from the library into
 * the reading experience. The book lifts off the shelf, floats to
 * centre screen, opens its cover, and the first page fills the viewport.
 *
 * This is achievable with React Native Reanimated + shared element
 * transitions on native, and CSS transforms + FLIP animations on web.
 */

export interface BookOpenAnimation {
  phases: AnimationPhase[];
  totalDurationMs: number;
  interruptible: boolean;
  onPhaseComplete: (phaseIndex: number) => void;
}

export interface AnimationPhase {
  name: string;
  durationMs: number;
  easing: string;
  transforms: AnimationTransform[];
  opacity: { from: number; to: number };
}

export interface AnimationTransform {
  property: 'translateX' | 'translateY' | 'scale' | 'rotateY' | 'rotateX' | 'perspective';
  from: number;
  to: number;
  unit: 'px' | 'deg' | '%' | 'none';
}

export const BOOK_OPEN_ANIMATION: BookOpenAnimation = {
  totalDurationMs: 1200,
  interruptible: false,
  onPhaseComplete: () => {},
  phases: [
    {
      name: 'lift_from_shelf',
      durationMs: 300,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',  // overshoot
      transforms: [
        { property: 'translateY', from: 0, to: -50, unit: 'px' },
        { property: 'scale', from: 1, to: 1.15, unit: 'none' },
      ],
      opacity: { from: 1, to: 1 },
    },
    {
      name: 'float_to_centre',
      durationMs: 400,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      transforms: [
        { property: 'translateX', from: 0, to: 0, unit: '%' }, // dynamic
        { property: 'translateY', from: -50, to: -200, unit: 'px' }, // dynamic
        { property: 'scale', from: 1.15, to: 2.0, unit: 'none' },
      ],
      opacity: { from: 1, to: 1 },
    },
    {
      name: 'open_cover',
      durationMs: 500,
      easing: 'cubic-bezier(0.68, -0.55, 0.27, 1.55)',
      transforms: [
        { property: 'perspective', from: 1000, to: 1000, unit: 'px' },
        { property: 'rotateY', from: 0, to: -160, unit: 'deg' },
      ],
      opacity: { from: 1, to: 0 }, // cover fades as pages appear
    },
  ],
};

/** Book close animation — reverse of open */
export const BOOK_CLOSE_ANIMATION: BookOpenAnimation = {
  totalDurationMs: 800,
  interruptible: true,
  onPhaseComplete: () => {},
  phases: [
    {
      name: 'close_cover',
      durationMs: 400,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      transforms: [
        { property: 'rotateY', from: -160, to: 0, unit: 'deg' },
      ],
      opacity: { from: 0, to: 1 },
    },
    {
      name: 'return_to_shelf',
      durationMs: 400,
      easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
      transforms: [
        { property: 'scale', from: 2.0, to: 1, unit: 'none' },
        { property: 'translateY', from: -200, to: 0, unit: 'px' },
      ],
      opacity: { from: 1, to: 1 },
    },
  ],
};

// =============================================================================
// SECTION 5: RECOMMENDATION ENGINE (CLIENT-SIDE)
// =============================================================================

/**
 * The client-side recommendation engine handles shelf population when the
 * device is offline. It uses the locally cached BKT snapshot and downloaded
 * book metadata to rank books by relevance. When online, server-side
 * recommendations take precedence (richer data, collaborative filtering).
 */

export interface RecommendationConfig {
  readyForYouWeight: RecommendationWeights;
  adventuresWaitingMinPhaseGap: number;
  maxRecommendationsPerShelf: number;
  diversityFactor: number;          // 0-1, how much to diversify themes
  recencyBias: number;              // 0-1, preference for unread books
  seriesContinuationBoost: number;  // multiplier for next book in series
}

export interface RecommendationWeights {
  decodabilityMatch: number;
  gpcTargetRelevance: number;
  themePreference: number;
  difficultyAppropriate: number;
  engagementPrediction: number;
  seriesContinuation: number;
}

export const DEFAULT_RECOMMENDATION_WEIGHTS: RecommendationWeights = {
  decodabilityMatch: 0.25,
  gpcTargetRelevance: 0.30,
  themePreference: 0.15,
  difficultyAppropriate: 0.15,
  engagementPrediction: 0.10,
  seriesContinuation: 0.05,
};

export interface BookScore {
  storybookId: string;
  totalScore: number;
  breakdown: Record<string, number>;
  shelfPlacement: ShelfType;
}

export class ClientRecommendationEngine {
  private config: RecommendationConfig;

  constructor(config?: Partial<RecommendationConfig>) {
    this.config = {
      readyForYouWeight: DEFAULT_RECOMMENDATION_WEIGHTS,
      adventuresWaitingMinPhaseGap: 1,
      maxRecommendationsPerShelf: 12,
      diversityFactor: 0.3,
      recencyBias: 0.6,
      seriesContinuationBoost: 1.5,
      ...config,
    };
  }

  /**
   * Score and rank books for a learner's personalised shelves.
   * This runs locally using cached BKT data for offline capability.
   */
  rankBooks(
    availableBooks: BookCardData[],
    learnerMastery: Record<string, number>,
    learnerPhase: number,
    preferredThemes: string[],
    readHistory: { storybookId: string; timesRead: number; lastReadAt: number }[],
    activeSeriesIds: string[],
  ): Map<ShelfType, BookCardData[]> {
    const readHistoryMap = new Map(readHistory.map(h => [h.storybookId, h]));
    const scored: BookScore[] = [];

    for (const book of availableBooks) {
      const history = readHistoryMap.get(book.storybookId);
      const score = this.scoreBook(
        book, learnerMastery, learnerPhase, preferredThemes,
        history, activeSeriesIds,
      );
      scored.push(score);
    }

    // Sort by total score descending
    scored.sort((a, b) => b.totalScore - a.totalScore);

    // Distribute to shelves
    const shelves = new Map<ShelfType, BookCardData[]>();
    for (const shelfDef of SHELF_DEFINITIONS) {
      shelves.set(shelfDef.type, []);
    }

    for (const score of scored) {
      const book = availableBooks.find(b => b.storybookId === score.storybookId)!;
      const shelf = shelves.get(score.shelfPlacement);
      if (shelf && shelf.length < this.config.maxRecommendationsPerShelf) {
        shelf.push(book);
      }
    }

    return shelves;
  }

  private scoreBook(
    book: BookCardData,
    mastery: Record<string, number>,
    learnerPhase: number,
    preferredThemes: string[],
    readHistory: { storybookId: string; timesRead: number; lastReadAt: number } | undefined,
    activeSeriesIds: string[],
  ): BookScore {
    const w = this.config.readyForYouWeight;
    const breakdown: Record<string, number> = {};

    // 1. Decodability match — how well does this book match the learner's taught GPCs?
    const decodabilityDelta = Math.abs(book.decodabilityScore - 0.9); // ideal is ~90%
    breakdown.decodabilityMatch = (1 - decodabilityDelta) * w.decodabilityMatch;

    // 2. GPC target relevance — does this book target GPCs the learner needs to practise?
    const unmasteredTargetCount = book.targetGpcs.filter(gpc =>
      (mastery[gpc] ?? 0) < 0.8,
    ).length;
    breakdown.gpcTargetRelevance = Math.min(1, unmasteredTargetCount / Math.max(1, book.targetGpcs.length))
      * w.gpcTargetRelevance;

    // 3. Difficulty appropriateness — is this book at the right phonics phase?
    const phaseDelta = Math.abs(book.phonicsPhase - learnerPhase);
    if (phaseDelta === 0) breakdown.difficultyAppropriate = w.difficultyAppropriate;
    else if (phaseDelta === 1) breakdown.difficultyAppropriate = w.difficultyAppropriate * 0.5;
    else breakdown.difficultyAppropriate = 0;

    // 4. Engagement prediction (simplified — real model uses collaborative filtering)
    breakdown.engagementPrediction = (book.rating / 5) * w.engagementPrediction;

    // 5. Series continuation bonus
    if (book.seriesName && activeSeriesIds.includes(book.storybookId)) {
      breakdown.seriesContinuation = w.seriesContinuation * this.config.seriesContinuationBoost;
    } else {
      breakdown.seriesContinuation = 0;
    }

    // 6. Recency bias — prefer unread or recently started
    if (!readHistory) {
      breakdown.recency = this.config.recencyBias * 0.1;
    } else if (readHistory.timesRead === 0) {
      breakdown.recency = this.config.recencyBias * 0.08;
    } else {
      breakdown.recency = 0;
    }

    const totalScore = Object.values(breakdown).reduce((sum, v) => sum + v, 0);

    // Determine shelf placement
    let shelfPlacement: ShelfType;
    if (readHistory && readHistory.timesRead > 1) {
      shelfPlacement = ShelfType.FAVOURITES;
    } else if (book.phonicsPhase > learnerPhase) {
      shelfPlacement = ShelfType.ADVENTURES_WAITING;
    } else if (phaseDelta === 0 && unmasteredTargetCount > 0) {
      shelfPlacement = ShelfType.READY_FOR_YOU;
    } else {
      shelfPlacement = ShelfType.COMMUNITY_PICKS;
    }

    return { storybookId: book.storybookId, totalScore, breakdown, shelfPlacement };
  }
}

// =============================================================================
// SECTION 6: ACHIEVEMENT & GAMIFICATION INTEGRATION
// =============================================================================

export interface LibraryAchievement {
  id: string;
  type: AchievementType;
  title: string;
  description: string;
  iconUrl: string;
  earnedAt: number | null;
  progress: number;               // 0-1
  target: number;
  current: number;
  reward: { sparks: number; gems: number; xp: number };
  celebrationAnimation: string;
}

export enum AchievementType {
  BOOKS_READ = 'books_read',
  SERIES_COMPLETE = 'series_complete',
  PHASE_COMPLETE = 'phase_complete',
  PERFECT_BOOK = 'perfect_book',
  STREAK_MILESTONE = 'streak_milestone',
  SPEED_RECORD = 'speed_record',
  WORD_COUNT = 'word_count',
  LIBRARY_EXPLORER = 'library_explorer',
  COMMUNITY_READER = 'community_reader',
  THEME_EXPLORER = 'theme_explorer',
}

export const LIBRARY_ACHIEVEMENTS: LibraryAchievement[] = [
  {
    id: 'first_book', type: AchievementType.BOOKS_READ,
    title: 'First Page Turner', description: 'Read your very first book!',
    iconUrl: '/assets/badges/first-book.png',
    earnedAt: null, progress: 0, target: 1, current: 0,
    reward: { sparks: 50, gems: 1, xp: 100 },
    celebrationAnimation: 'confetti',
  },
  {
    id: 'bookworm_10', type: AchievementType.BOOKS_READ,
    title: 'Bookworm', description: 'Read 10 books',
    iconUrl: '/assets/badges/bookworm.png',
    earnedAt: null, progress: 0, target: 10, current: 0,
    reward: { sparks: 200, gems: 5, xp: 500 },
    celebrationAnimation: 'stars',
  },
  {
    id: 'library_legend', type: AchievementType.BOOKS_READ,
    title: 'Library Legend', description: 'Read 100 books',
    iconUrl: '/assets/badges/library-legend.png',
    earnedAt: null, progress: 0, target: 100, current: 0,
    reward: { sparks: 1000, gems: 25, xp: 5000 },
    celebrationAnimation: 'fireworks',
  },
  {
    id: 'series_hero', type: AchievementType.SERIES_COMPLETE,
    title: 'Series Hero', description: 'Complete your first book series',
    iconUrl: '/assets/badges/series-hero.png',
    earnedAt: null, progress: 0, target: 1, current: 0,
    reward: { sparks: 300, gems: 10, xp: 750 },
    celebrationAnimation: 'trophy',
  },
  {
    id: 'phase_master', type: AchievementType.PHASE_COMPLETE,
    title: 'Phase Master', description: 'Master all GPCs in a phonics phase',
    iconUrl: '/assets/badges/phase-master.png',
    earnedAt: null, progress: 0, target: 1, current: 0,
    reward: { sparks: 500, gems: 15, xp: 2000 },
    celebrationAnimation: 'fireworks',
  },
  {
    id: 'perfect_reader', type: AchievementType.PERFECT_BOOK,
    title: 'Perfect Reader', description: 'Read a book with 100% accuracy',
    iconUrl: '/assets/badges/perfect.png',
    earnedAt: null, progress: 0, target: 1, current: 0,
    reward: { sparks: 100, gems: 3, xp: 300 },
    celebrationAnimation: 'stars',
  },
  {
    id: 'week_streak', type: AchievementType.STREAK_MILESTONE,
    title: 'Week Warrior', description: 'Read every day for a week',
    iconUrl: '/assets/badges/week-streak.png',
    earnedAt: null, progress: 0, target: 7, current: 0,
    reward: { sparks: 150, gems: 5, xp: 400 },
    celebrationAnimation: 'rainbow',
  },
  {
    id: 'theme_explorer', type: AchievementType.THEME_EXPLORER,
    title: 'Theme Explorer', description: 'Read books from 5 different themes',
    iconUrl: '/assets/badges/explorer.png',
    earnedAt: null, progress: 0, target: 5, current: 0,
    reward: { sparks: 200, gems: 5, xp: 500 },
    celebrationAnimation: 'confetti',
  },
];

// =============================================================================
// SECTION 7: SEARCH & FILTER SYSTEM
// =============================================================================

export interface LibrarySearchConfig {
  debounceMs: number;
  minQueryLength: number;
  maxResults: number;
  enableFuzzySearch: boolean;
  enableVoiceSearch: boolean;
  recentSearchesMax: number;
  suggestionsEnabled: boolean;
}

export const DEFAULT_SEARCH_CONFIG: LibrarySearchConfig = {
  debounceMs: 300,
  minQueryLength: 2,
  maxResults: 50,
  enableFuzzySearch: true,
  enableVoiceSearch: true,
  recentSearchesMax: 10,
  suggestionsEnabled: true,
};

export interface LibraryFilter {
  phonicsPhases: number[];
  languages: string[];
  artStyles: string[];
  themes: string[];
  ageGroups: string[];
  minDecodability: number;
  seriesOnly: boolean;
  downloadedOnly: boolean;
  unreadOnly: boolean;
  minRating: number;
  sortBy: 'relevance' | 'newest' | 'popular' | 'difficulty_asc' | 'difficulty_desc' | 'rating';
}

export const DEFAULT_LIBRARY_FILTER: LibraryFilter = {
  phonicsPhases: [],
  languages: [],
  artStyles: [],
  themes: [],
  ageGroups: [],
  minDecodability: 0,
  seriesOnly: false,
  downloadedOnly: false,
  unreadOnly: false,
  minRating: 0,
  sortBy: 'relevance',
};

// =============================================================================
// SECTION 8: NATS EVENTS
// =============================================================================

export const LIBRARY_EVENTS = {
  SHELF_LOADED: 'scholarly.library.shelf_loaded',
  BOOK_SELECTED: 'scholarly.library.book_selected',
  BOOK_DOWNLOADED: 'scholarly.library.book_downloaded',
  BOOK_FAVOURITED: 'scholarly.library.book_favourited',
  SEARCH_PERFORMED: 'scholarly.library.search_performed',
  THEME_UNLOCKED: 'scholarly.library.theme_unlocked',
  ACHIEVEMENT_EARNED: 'scholarly.library.achievement_earned',
  RECOMMENDATION_VIEWED: 'scholarly.library.recommendation_viewed',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================

export {
  PHASE_THEME_MAP,
  LIBRARY_ENVIRONMENTS,
  SHELF_DEFINITIONS,
  BOOK_CARD_PRESETS,
  BOOK_OPEN_ANIMATION,
  BOOK_CLOSE_ANIMATION,
  DEFAULT_RECOMMENDATION_WEIGHTS,
  LIBRARY_ACHIEVEMENTS,
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_LIBRARY_FILTER,
  LIBRARY_EVENTS,
};
