// =============================================================================
// SCHOLARLY PLATFORM — Cross-Platform Core
// Sprint 3 | XP-001 + XP-002 + XP-003 | cross-platform-core.ts
// =============================================================================
// XP-001: React Native app shell — navigation structure, auth flow,
//         platform-specific layer definitions, and configuration.
// XP-002: Enchanted Library — state management and data model for
//         the magical bookshelf interface.
// XP-003: Offline Download & Sync — storybook download management
//         with federated knowledge tracing synchronisation.
// =============================================================================

// ---------------------------------------------------------------------------
// Section 1: App Shell Configuration (XP-001)
// ---------------------------------------------------------------------------

/** Platform detection */
export type AppPlatform = 'ios' | 'android' | 'web';

/** App configuration — environment-aware */
export interface AppConfig {
  platform: AppPlatform;
  apiBaseUrl: string;
  wsBaseUrl: string;
  environment: 'development' | 'staging' | 'production';
  appVersion: string;
  buildNumber: string;
  features: FeatureFlags;
  analytics: AnalyticsConfig;
}

export interface FeatureFlags {
  enableOfflineReading: boolean;
  enableReadAloud: boolean;
  enableParallax: boolean;
  enableStoryCreation: boolean;
  enableCommunityContent: boolean;
  enablePushNotifications: boolean;
  enableBiometricAuth: boolean;
  enableApplePencil: boolean; // iPad only
  maxDownloadedBooks: number;
  maxOfflineSessionsBeforeSync: number;
}

export interface AnalyticsConfig {
  enabled: boolean;
  sessionTimeoutMs: number;
  batchSize: number;
  flushIntervalMs: number;
}

export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  enableOfflineReading: true,
  enableReadAloud: true,
  enableParallax: true,
  enableStoryCreation: false, // Phase 2
  enableCommunityContent: false, // Phase 2
  enablePushNotifications: true,
  enableBiometricAuth: true,
  enableApplePencil: true,
  maxDownloadedBooks: 50,
  maxOfflineSessionsBeforeSync: 10,
};

// ---------------------------------------------------------------------------
// Section 2: Navigation Structure (XP-001)
// ---------------------------------------------------------------------------

/**
 * File-based routing structure for Expo Router.
 * Maps to the app/(tabs)/ directory structure.
 */
export interface NavigationRoute {
  name: string;
  path: string;
  icon: string;
  requiresAuth: boolean;
  requiresSubscription: boolean;
  availableOffline: boolean;
}

export const APP_ROUTES: NavigationRoute[] = [
  // Tab routes
  {
    name: 'Library',
    path: '/(tabs)/library',
    icon: 'book-open',
    requiresAuth: true,
    requiresSubscription: false, // Free tier gets limited library
    availableOffline: true,
  },
  {
    name: 'Learn',
    path: '/(tabs)/learn',
    icon: 'graduation-cap',
    requiresAuth: true,
    requiresSubscription: true,
    availableOffline: true,
  },
  {
    name: 'Create',
    path: '/(tabs)/create',
    icon: 'wand-2',
    requiresAuth: true,
    requiresSubscription: true,
    availableOffline: false,
  },
  {
    name: 'Progress',
    path: '/(tabs)/progress',
    icon: 'bar-chart-2',
    requiresAuth: true,
    requiresSubscription: false,
    availableOffline: true,
  },
  {
    name: 'Profile',
    path: '/(tabs)/profile',
    icon: 'user',
    requiresAuth: true,
    requiresSubscription: false,
    availableOffline: true,
  },

  // Stack routes (non-tab)
  {
    name: 'Reader',
    path: '/reader/[storybookId]',
    icon: 'book',
    requiresAuth: true,
    requiresSubscription: false,
    availableOffline: true,
  },
  {
    name: 'Onboarding',
    path: '/onboarding',
    icon: 'sparkles',
    requiresAuth: false,
    requiresSubscription: false,
    availableOffline: false,
  },
  {
    name: 'Auth',
    path: '/auth',
    icon: 'lock',
    requiresAuth: false,
    requiresSubscription: false,
    availableOffline: false,
  },
];

// ---------------------------------------------------------------------------
// Section 3: Auth Flow (XP-001)
// ---------------------------------------------------------------------------

/** Authentication state for the app */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
  biometricEnabled: boolean;
  lastSyncAt: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  role: 'learner' | 'parent' | 'educator' | 'admin';
  tenantId: string;
  subscriptionTier: 'free' | 'basic' | 'premium' | 'school';
  learnerProfiles: LearnerProfile[];
}

export interface LearnerProfile {
  learnerId: string;
  name: string;
  avatarUrl?: string;
  ageGroup: string;
  phonicsPhase: number;
  currentLevel: number;
  preferences: {
    favouriteThemes: string[];
    preferredArtStyle: string;
    readingMode: 'listen' | 'read_aloud';
  };
}

export type AuthEvent =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; user: AuthUser; tokens: { access: string; refresh: string; expiresAt: number } }
  | { type: 'LOGIN_FAILURE'; error: string }
  | { type: 'LOGOUT' }
  | { type: 'TOKEN_REFRESHED'; tokens: { access: string; refresh: string; expiresAt: number } }
  | { type: 'TOKEN_EXPIRED' }
  | { type: 'BIOMETRIC_ENABLED' }
  | { type: 'BIOMETRIC_DISABLED' }
  | { type: 'PROFILE_SWITCHED'; learnerId: string };

export function authReducer(state: AuthState, event: AuthEvent): AuthState {
  switch (event.type) {
    case 'LOGIN_START':
      return { ...state, isLoading: true };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        isAuthenticated: true,
        isLoading: false,
        user: event.user,
        accessToken: event.tokens.access,
        refreshToken: event.tokens.refresh,
        tokenExpiresAt: event.tokens.expiresAt,
      };

    case 'LOGIN_FAILURE':
      return {
        ...state,
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
      };

    case 'LOGOUT':
      return {
        isAuthenticated: false,
        isLoading: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        tokenExpiresAt: null,
        biometricEnabled: state.biometricEnabled,
        lastSyncAt: state.lastSyncAt,
      };

    case 'TOKEN_REFRESHED':
      return {
        ...state,
        accessToken: event.tokens.access,
        refreshToken: event.tokens.refresh,
        tokenExpiresAt: event.tokens.expiresAt,
      };

    case 'TOKEN_EXPIRED':
      return { ...state, accessToken: null, tokenExpiresAt: null };

    case 'BIOMETRIC_ENABLED':
      return { ...state, biometricEnabled: true };

    case 'BIOMETRIC_DISABLED':
      return { ...state, biometricEnabled: false };

    case 'PROFILE_SWITCHED':
      return state; // Active learner profile managed separately

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Section 4: Platform-Specific Layer Definitions (XP-001)
// ---------------------------------------------------------------------------

/**
 * Abstracts platform-specific capabilities behind a common interface.
 * The 5% of code that differs per platform.
 */
export interface IPlatformServices {
  // Audio
  startAudioRecording(): Promise<string>; // Returns file path
  stopAudioRecording(): Promise<{ filePath: string; durationMs: number }>;
  playAudio(uri: string, options?: { rate?: number; position?: number }): Promise<void>;
  pauseAudio(): Promise<void>;
  getAudioPosition(): Promise<number>; // Current position in ms

  // Storage
  downloadFile(url: string, localPath: string): Promise<void>;
  deleteFile(localPath: string): Promise<void>;
  getFileSize(localPath: string): Promise<number>;
  getAvailableStorage(): Promise<number>; // Bytes
  readLocalDb<T>(table: string, query: Record<string, unknown>): Promise<T[]>;
  writeLocalDb<T>(table: string, data: T): Promise<void>;

  // Push Notifications
  requestNotificationPermission(): Promise<boolean>;
  getNotificationToken(): Promise<string | null>;
  scheduleLocalNotification(title: string, body: string, triggerMs: number): Promise<string>;

  // Biometric Auth
  isBiometricAvailable(): Promise<boolean>;
  authenticateWithBiometric(prompt: string): Promise<boolean>;

  // Deep Linking
  getInitialDeepLink(): Promise<string | null>;
  onDeepLink(callback: (url: string) => void): () => void; // Returns unsubscribe

  // In-App Purchase
  getProducts(productIds: string[]): Promise<IAPProduct[]>;
  purchaseProduct(productId: string): Promise<IAPPurchaseResult>;
  restorePurchases(): Promise<IAPPurchaseResult[]>;

  // Device Info
  getDeviceId(): Promise<string>;
  getPlatform(): AppPlatform;
  getAppVersion(): string;
  isTablet(): boolean;
}

export interface IAPProduct {
  productId: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  priceAmountMicros: number;
}

export interface IAPPurchaseResult {
  productId: string;
  transactionId: string;
  receiptData: string;
  platform: AppPlatform;
}

// ---------------------------------------------------------------------------
// Section 5: Enchanted Library State (XP-002)
// ---------------------------------------------------------------------------

/**
 * The Enchanted Library is the heart of the child-facing experience.
 * Instead of a flat grid of thumbnails, books live on magical bookshelves
 * where they glow, characters peek out, and letters float in the air.
 *
 * This section defines the data model and state management for the
 * library experience. The actual rendering is handled by React Native
 * components that consume this state.
 */

/** A book as it appears on the shelf */
export interface LibraryBook {
  storybookId: string;
  title: string;
  coverImageUrl: string;
  thumbnailUrl: string;
  series?: { seriesId: string; seriesName: string; bookNumber: number };
  phonicsPhase: number;
  decodabilityScore: number;
  artStyle: string;
  pageCount: number;
  estimatedReadTimeMinutes: number;
  /** Reading status for the current learner */
  readingStatus: 'unread' | 'in_progress' | 'completed';
  /** Progress 0.0–1.0 */
  readingProgress: number;
  /** Last page read (for resume) */
  lastPageRead: number;
  /** Stars earned (0–3) based on read-aloud accuracy */
  starsEarned: number;
  /** Is this book downloaded for offline reading? */
  isDownloaded: boolean;
  downloadSizeMb: number;
  /** Community rating (if community-created) */
  communityRating?: number;
  /** Is this a Scholarly-curated or community-created book? */
  source: 'scholarly' | 'community';
  /** Tags for filtering */
  themes: string[];
  /** New book animation flag */
  isNew: boolean;
}

/** Library shelf categories */
export interface LibraryShelf {
  shelfId: string;
  name: string;
  description: string;
  icon: string;
  books: LibraryBook[];
  sortOrder: number;
  isExpandable: boolean;
  /** For "Ready for You" — these are curriculum-matched */
  isCurriculumMatched: boolean;
}

/** Complete library state */
export interface LibraryState {
  shelves: LibraryShelf[];
  selectedShelfId: string | null;
  searchQuery: string;
  searchResults: LibraryBook[];
  filters: LibraryFilters;
  isLoading: boolean;
  isSearching: boolean;
  totalBooksAvailable: number;
  totalBooksRead: number;
  currentPhase: number;
  /** The "magical room" the learner has unlocked */
  unlockedRoom: number; // 1–6 corresponding to phonics phases
  /** Floating letter animation pool */
  floatingLetters: string[];
}

export interface LibraryFilters {
  phonicsPhase?: number;
  themes?: string[];
  readingStatus?: 'unread' | 'in_progress' | 'completed' | 'all';
  source?: 'scholarly' | 'community' | 'all';
  artStyle?: string;
  downloadedOnly?: boolean;
}

export type LibraryEvent =
  | { type: 'LOAD_LIBRARY'; shelves: LibraryShelf[]; phase: number; unlockedRoom: number }
  | { type: 'SEARCH'; query: string }
  | { type: 'SEARCH_RESULTS'; results: LibraryBook[] }
  | { type: 'CLEAR_SEARCH' }
  | { type: 'SET_FILTERS'; filters: Partial<LibraryFilters> }
  | { type: 'SELECT_SHELF'; shelfId: string }
  | { type: 'BOOK_DOWNLOADED'; storybookId: string }
  | { type: 'BOOK_REMOVED'; storybookId: string }
  | { type: 'READING_PROGRESS_UPDATED'; storybookId: string; progress: number; lastPage: number; stars?: number }
  | { type: 'BOOK_COMPLETED'; storybookId: string; starsEarned: number }
  | { type: 'ROOM_UNLOCKED'; roomNumber: number }
  | { type: 'REFRESH_START' }
  | { type: 'REFRESH_COMPLETE'; shelves: LibraryShelf[] };

export function libraryReducer(state: LibraryState, event: LibraryEvent): LibraryState {
  switch (event.type) {
    case 'LOAD_LIBRARY':
      return {
        ...state,
        shelves: event.shelves,
        currentPhase: event.phase,
        unlockedRoom: event.unlockedRoom,
        isLoading: false,
        totalBooksAvailable: event.shelves.reduce((sum, s) => sum + s.books.length, 0),
        totalBooksRead: event.shelves.reduce(
          (sum, s) => sum + s.books.filter(b => b.readingStatus === 'completed').length, 0
        ),
        floatingLetters: generateFloatingLetters(event.phase),
      };

    case 'SEARCH':
      return { ...state, searchQuery: event.query, isSearching: true };

    case 'SEARCH_RESULTS':
      return { ...state, searchResults: event.results, isSearching: false };

    case 'CLEAR_SEARCH':
      return { ...state, searchQuery: '', searchResults: [], isSearching: false };

    case 'SET_FILTERS':
      return { ...state, filters: { ...state.filters, ...event.filters } };

    case 'SELECT_SHELF':
      return { ...state, selectedShelfId: event.shelfId };

    case 'BOOK_DOWNLOADED':
      return updateBookInShelves(state, event.storybookId, { isDownloaded: true });

    case 'BOOK_REMOVED':
      return updateBookInShelves(state, event.storybookId, { isDownloaded: false });

    case 'READING_PROGRESS_UPDATED':
      return updateBookInShelves(state, event.storybookId, {
        readingProgress: event.progress,
        lastPageRead: event.lastPage,
        readingStatus: event.progress >= 1.0 ? 'completed' : 'in_progress',
        starsEarned: event.stars,
      });

    case 'BOOK_COMPLETED':
      return updateBookInShelves(state, event.storybookId, {
        readingStatus: 'completed',
        readingProgress: 1.0,
        starsEarned: event.starsEarned,
      });

    case 'ROOM_UNLOCKED':
      return {
        ...state,
        unlockedRoom: event.roomNumber,
        floatingLetters: generateFloatingLetters(event.roomNumber),
      };

    case 'REFRESH_START':
      return { ...state, isLoading: true };

    case 'REFRESH_COMPLETE':
      return {
        ...state,
        shelves: event.shelves,
        isLoading: false,
        totalBooksAvailable: event.shelves.reduce((sum, s) => sum + s.books.length, 0),
      };

    default:
      return state;
  }
}

function updateBookInShelves(
  state: LibraryState,
  storybookId: string,
  updates: Partial<LibraryBook>
): LibraryState {
  return {
    ...state,
    shelves: state.shelves.map(shelf => ({
      ...shelf,
      books: shelf.books.map(book =>
        book.storybookId === storybookId ? { ...book, ...updates } : book
      ),
    })),
  };
}

/** Generates the floating letters appropriate for the learner's phase */
function generateFloatingLetters(phase: number): string[] {
  const PHASE_LETTERS: Record<number, string[]> = {
    1: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd', 'g', 'o', 'c', 'k'],
    2: ['ck', 'e', 'u', 'r', 'h', 'b', 'f', 'l', 'ff', 'll', 'ss'],
    3: ['j', 'v', 'w', 'x', 'y', 'z', 'qu', 'ch', 'sh', 'th', 'ng', 'ai', 'ee'],
    4: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew'],
    5: ['ay', 'ou', 'ie', 'ea', 'oy', 'ir', 'ue', 'aw', 'wh', 'ph', 'ew', 'oe', 'au'],
    6: ['tion', 'sion', 'ous', 'ture', 'sure', 'ment', 'ness', 'ful', 'less'],
  };
  return PHASE_LETTERS[phase] ?? PHASE_LETTERS[1];
}

/** Default shelf configuration */
export function createDefaultShelves(): LibraryShelf[] {
  return [
    {
      shelfId: 'ready_for_you',
      name: 'Ready for You',
      description: 'Stories matched to your reading level',
      icon: 'sparkles',
      books: [],
      sortOrder: 0,
      isExpandable: true,
      isCurriculumMatched: true,
    },
    {
      shelfId: 'favourites',
      name: 'Favourites',
      description: 'Stories you love to read again',
      icon: 'heart',
      books: [],
      sortOrder: 1,
      isExpandable: true,
      isCurriculumMatched: false,
    },
    {
      shelfId: 'adventures_waiting',
      name: 'Adventures Waiting',
      description: 'Just a little bit harder — ready for a challenge?',
      icon: 'rocket',
      books: [],
      sortOrder: 2,
      isExpandable: true,
      isCurriculumMatched: true,
    },
    {
      shelfId: 'community_picks',
      name: 'Community Picks',
      description: 'Popular stories from our creator community',
      icon: 'users',
      books: [],
      sortOrder: 3,
      isExpandable: true,
      isCurriculumMatched: false,
    },
    {
      shelfId: 'downloaded',
      name: 'Downloaded',
      description: 'Available to read offline',
      icon: 'download',
      books: [],
      sortOrder: 4,
      isExpandable: true,
      isCurriculumMatched: false,
    },
  ];
}

// ---------------------------------------------------------------------------
// Section 6: Offline Download Manager (XP-003)
// ---------------------------------------------------------------------------

/**
 * Manages storybook downloads for offline reading. Handles download
 * queuing, progress tracking, storage management, and data synchronisation
 * when connectivity returns.
 *
 * Think of it as a library's mobile lending van: it selects books,
 * loads them into local storage, and keeps track of everything that
 * was read while off-grid, syncing the reading records back when
 * it returns to the main library.
 */

export interface DownloadedBook {
  storybookId: string;
  title: string;
  downloadedAt: string;
  lastAccessedAt: string;
  storageSizeBytes: number;
  version: number;
  syncVersion: number;
  assets: {
    coverImage: string;   // Local file path
    pages: Array<{
      pageNumber: number;
      illustration: string; // Local file path
      audioNarration?: string; // Local file path
    }>;
    metadata: string; // Local JSON file path
  };
  offlineReadingSessions: OfflineReadingSession[];
}

export interface OfflineReadingSession {
  sessionId: string;
  storybookId: string;
  learnerId: string;
  startedAt: string;
  completedAt?: string;
  pagesRead: number[];
  mode: 'listen' | 'read_aloud';
  /** Serialised assessment data for sync */
  assessmentData?: string;
  synced: boolean;
}

export interface DownloadProgress {
  storybookId: string;
  totalBytes: number;
  downloadedBytes: number;
  progress: number; // 0.0–1.0
  status: 'queued' | 'downloading' | 'complete' | 'failed' | 'cancelled';
  error?: string;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface OfflineSyncState {
  syncStatus: SyncStatus;
  lastSyncAt: string | null;
  pendingSessionCount: number;
  downloadQueue: DownloadProgress[];
  downloadedBooks: Map<string, DownloadedBook>;
  availableStorageBytes: number;
  usedStorageBytes: number;
  isOnline: boolean;
}

export type OfflineSyncEvent =
  | { type: 'CONNECTIVITY_CHANGED'; isOnline: boolean }
  | { type: 'DOWNLOAD_QUEUED'; storybookId: string; totalBytes: number }
  | { type: 'DOWNLOAD_PROGRESS'; storybookId: string; downloadedBytes: number }
  | { type: 'DOWNLOAD_COMPLETE'; storybookId: string; book: DownloadedBook }
  | { type: 'DOWNLOAD_FAILED'; storybookId: string; error: string }
  | { type: 'DOWNLOAD_CANCELLED'; storybookId: string }
  | { type: 'BOOK_DELETED'; storybookId: string; freedBytes: number }
  | { type: 'OFFLINE_SESSION_RECORDED'; session: OfflineReadingSession }
  | { type: 'SYNC_START' }
  | { type: 'SYNC_COMPLETE'; syncedCount: number; timestamp: string }
  | { type: 'SYNC_ERROR'; error: string }
  | { type: 'STORAGE_UPDATED'; available: number; used: number };

export function offlineSyncReducer(state: OfflineSyncState, event: OfflineSyncEvent): OfflineSyncState {
  switch (event.type) {
    case 'CONNECTIVITY_CHANGED':
      return { ...state, isOnline: event.isOnline };

    case 'DOWNLOAD_QUEUED':
      return {
        ...state,
        downloadQueue: [
          ...state.downloadQueue,
          {
            storybookId: event.storybookId,
            totalBytes: event.totalBytes,
            downloadedBytes: 0,
            progress: 0,
            status: 'queued',
          },
        ],
      };

    case 'DOWNLOAD_PROGRESS':
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(d =>
          d.storybookId === event.storybookId
            ? {
                ...d,
                downloadedBytes: event.downloadedBytes,
                progress: d.totalBytes > 0 ? event.downloadedBytes / d.totalBytes : 0,
                status: 'downloading' as const,
              }
            : d
        ),
      };

    case 'DOWNLOAD_COMPLETE': {
      const newDownloaded = new Map(state.downloadedBooks);
      newDownloaded.set(event.storybookId, event.book);
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(d =>
          d.storybookId === event.storybookId
            ? { ...d, progress: 1, status: 'complete' as const }
            : d
        ),
        downloadedBooks: newDownloaded,
        usedStorageBytes: state.usedStorageBytes + event.book.storageSizeBytes,
      };
    }

    case 'DOWNLOAD_FAILED':
      return {
        ...state,
        downloadQueue: state.downloadQueue.map(d =>
          d.storybookId === event.storybookId
            ? { ...d, status: 'failed' as const, error: event.error }
            : d
        ),
      };

    case 'DOWNLOAD_CANCELLED':
      return {
        ...state,
        downloadQueue: state.downloadQueue.filter(d => d.storybookId !== event.storybookId),
      };

    case 'BOOK_DELETED': {
      const updatedDownloads = new Map(state.downloadedBooks);
      updatedDownloads.delete(event.storybookId);
      return {
        ...state,
        downloadedBooks: updatedDownloads,
        usedStorageBytes: Math.max(0, state.usedStorageBytes - event.freedBytes),
      };
    }

    case 'OFFLINE_SESSION_RECORDED': {
      const bookId = event.session.storybookId;
      const book = state.downloadedBooks.get(bookId);
      if (book) {
        const updatedBook = {
          ...book,
          offlineReadingSessions: [...book.offlineReadingSessions, event.session],
        };
        const newMap = new Map(state.downloadedBooks);
        newMap.set(bookId, updatedBook);
        return {
          ...state,
          downloadedBooks: newMap,
          pendingSessionCount: state.pendingSessionCount + 1,
        };
      }
      return state;
    }

    case 'SYNC_START':
      return { ...state, syncStatus: 'syncing' };

    case 'SYNC_COMPLETE':
      return {
        ...state,
        syncStatus: 'idle',
        lastSyncAt: event.timestamp,
        pendingSessionCount: Math.max(0, state.pendingSessionCount - event.syncedCount),
      };

    case 'SYNC_ERROR':
      return { ...state, syncStatus: 'error' };

    case 'STORAGE_UPDATED':
      return {
        ...state,
        availableStorageBytes: event.available,
        usedStorageBytes: event.used,
      };

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// Section 7: Offline Sync Manager Logic (XP-003)
// ---------------------------------------------------------------------------

/**
 * Orchestrates the synchronisation of offline reading data with the
 * server. Uses the federated knowledge tracing system from the Phonics
 * Tool to merge offline BKT observations.
 */
export interface SyncPayload {
  deviceId: string;
  learnerId: string;
  sessions: Array<{
    sessionId: string;
    storybookId: string;
    pagesRead: number[];
    mode: 'listen' | 'read_aloud';
    assessmentData?: string;
    startedAt: string;
    completedAt?: string;
  }>;
  /** BKT observations from offline read-aloud sessions */
  bktObservations: Array<{
    gpc: string;
    correct: boolean;
    context: 'storybook_read_aloud';
    timestamp: string;
  }>;
  /** Client-side BKT state for conflict resolution */
  localBKTState?: Record<string, {
    mastery: number;
    lastUpdated: string;
    observationCount: number;
  }>;
  syncVersion: number;
}

export interface SyncResponse {
  success: boolean;
  syncedSessionCount: number;
  /** Updated BKT mastery values after merging server + client observations */
  mergedBKTState?: Record<string, { mastery: number }>;
  /** New books available since last sync */
  newBooksAvailable: number;
  /** Server sync version for conflict detection */
  serverSyncVersion: number;
  /** Any library updates (new shelves, updated recommendations) */
  libraryUpdates?: {
    shelvesUpdated: string[];
    newRecommendations: string[];
  };
}

/**
 * Determines if a sync should be triggered based on conditions.
 */
export function shouldTriggerSync(state: OfflineSyncState, config: FeatureFlags): boolean {
  // Don't sync if offline
  if (!state.isOnline) return false;

  // Don't sync if already syncing
  if (state.syncStatus === 'syncing') return false;

  // Sync if pending sessions exceed threshold
  if (state.pendingSessionCount >= config.maxOfflineSessionsBeforeSync) return true;

  // Sync if it's been more than 1 hour since last sync
  if (state.lastSyncAt) {
    const lastSync = new Date(state.lastSyncAt).getTime();
    const hourAgo = Date.now() - 3_600_000;
    if (lastSync < hourAgo) return true;
  } else {
    return true; // Never synced before
  }

  return false;
}

/**
 * Calculates storage requirements for downloading a book.
 */
export function estimateDownloadSize(pageCount: number, hasAudio: boolean): {
  estimatedBytes: number;
  breakdown: { illustrations: number; audio: number; metadata: number };
} {
  // Average sizes based on content type
  const illustrationSizePerPage = 200_000; // ~200KB per illustration
  const audioSizePerPage = 150_000;        // ~150KB per page narration (MP3)
  const metadataSize = 10_000;             // ~10KB for book metadata + timestamps

  const illustrations = pageCount * illustrationSizePerPage;
  const audio = hasAudio ? pageCount * audioSizePerPage : 0;

  return {
    estimatedBytes: illustrations + audio + metadataSize,
    breakdown: {
      illustrations,
      audio,
      metadata: metadataSize,
    },
  };
}

// ---------------------------------------------------------------------------
// Section 8: Subscription Portability (XP-001)
// ---------------------------------------------------------------------------

/**
 * A single Scholarly subscription works across all platforms.
 * This handles the server-side verification regardless of which
 * store the subscription was purchased through.
 */
export interface SubscriptionVerification {
  tenantId: string;
  userId: string;
  tier: 'free' | 'basic' | 'premium' | 'school';
  isActive: boolean;
  expiresAt: string;
  purchasePlatform: AppPlatform;
  features: {
    maxLearnerProfiles: number;
    offlineDownloads: boolean;
    communityContent: boolean;
    storyCreation: boolean;
    advancedAnalytics: boolean;
    adFree: boolean;
  };
}

export const SUBSCRIPTION_TIERS: Record<string, SubscriptionVerification['features']> = {
  free: {
    maxLearnerProfiles: 1,
    offlineDownloads: false,
    communityContent: false,
    storyCreation: false,
    advancedAnalytics: false,
    adFree: false,
  },
  basic: {
    maxLearnerProfiles: 2,
    offlineDownloads: true,
    communityContent: true,
    storyCreation: false,
    advancedAnalytics: false,
    adFree: true,
  },
  premium: {
    maxLearnerProfiles: 5,
    offlineDownloads: true,
    communityContent: true,
    storyCreation: true,
    advancedAnalytics: true,
    adFree: true,
  },
  school: {
    maxLearnerProfiles: 100,
    offlineDownloads: true,
    communityContent: true,
    storyCreation: true,
    advancedAnalytics: true,
    adFree: true,
  },
};
