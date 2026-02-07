// =============================================================================
// SCHOLARLY PLATFORM — Sprint 10: MB-001
// Mobile App Shell — React Native + Expo Foundation
// =============================================================================
// Think of the App Shell as the chassis of a vehicle. It doesn't carry passengers
// directly (that's the UI's job) or decide where to go (that's navigation), but
// without it, nothing else can function. The shell provides the structural
// framework that makes everything else possible: initialisation sequences,
// platform detection, authentication gates, state hydration, offline detection,
// push notification registration, and the root layout that wraps every screen.
//
// Architecture follows the strategy document §3.3: 95% shared TypeScript core
// with a 5% platform-specific layer for audio, notifications, storage, payments,
// deep linking, biometrics, and animations.
//
// Built on Expo SDK 54+ with Expo Router (file-based routing), Zustand for state
// management, NativeWind for Tailwind-style utility classes, and Reanimated for
// native-driver animations on iOS/Android with CSS transition fallbacks on web.
// =============================================================================

import { ScholarlyBaseService, Result, ServiceError, EventPublisher } from '../shared/base';

// =============================================================================
// SECTION 1: PLATFORM DETECTION & CAPABILITIES
// =============================================================================

/**
 * Platform capabilities — the App Shell's first job on boot is to fingerprint
 * the host environment. Think of it as a doctor's intake assessment: before we
 * can prescribe the right experience, we need to know what the patient can handle.
 */
export enum PlatformType {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
  MACOS = 'macos',
  WINDOWS = 'windows',
}

export enum DeviceClass {
  PHONE = 'phone',       // < 768px logical width
  TABLET = 'tablet',     // 768-1024px
  DESKTOP = 'desktop',   // > 1024px
  TV = 'tv',             // Android TV / Apple TV (future)
}

export interface PlatformCapabilities {
  platform: PlatformType;
  deviceClass: DeviceClass;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  hasCamera: boolean;
  hasMicrophone: boolean;
  hasBiometrics: boolean;
  biometricType: 'face_id' | 'touch_id' | 'fingerprint' | 'webauthn' | 'none';
  hasHaptics: boolean;
  hasPushNotifications: boolean;
  hasFileSystem: boolean;
  maxOfflineStorageMb: number;
  supportsBackgroundAudio: boolean;
  supportsApplePencil: boolean;
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';
  browserEngine: string | null;     // null for native
  osVersion: string;
  appVersion: string;
  buildNumber: string;
  hermesBytecodeEnabled: boolean;   // true for iOS/Android, false for web
}

/**
 * Detects the current platform and its capabilities.
 * On native (iOS/Android), this uses Expo's Device and Constants modules.
 * On web, it falls back to navigator APIs and feature detection.
 */
export class PlatformDetector {
  private static cached: PlatformCapabilities | null = null;

  static detect(): PlatformCapabilities {
    if (this.cached) return this.cached;

    // In a real Expo environment, these would use:
    // - expo-device for device info
    // - expo-constants for app version
    // - expo-local-authentication for biometrics
    // - expo-camera for camera detection
    // - expo-av for microphone detection
    // - expo-haptics availability check
    // - expo-notifications for push support
    // - expo-file-system for storage capabilities
    // - NetInfo for network detection

    const platform = this.detectPlatform();
    const screen = this.detectScreen();

    this.cached = {
      platform,
      deviceClass: this.classifyDevice(screen.width),
      screenWidth: screen.width,
      screenHeight: screen.height,
      pixelRatio: screen.pixelRatio,
      hasCamera: platform !== PlatformType.WEB, // conservative default
      hasMicrophone: true,
      hasBiometrics: this.detectBiometrics(platform),
      biometricType: this.detectBiometricType(platform),
      hasHaptics: platform === PlatformType.IOS || platform === PlatformType.ANDROID,
      hasPushNotifications: true,
      hasFileSystem: platform !== PlatformType.WEB,
      maxOfflineStorageMb: this.estimateOfflineStorage(platform),
      supportsBackgroundAudio: platform !== PlatformType.WEB,
      supportsApplePencil: platform === PlatformType.IOS, // iPad detection needed
      networkType: 'unknown',
      browserEngine: platform === PlatformType.WEB ? this.detectBrowserEngine() : null,
      osVersion: this.detectOsVersion(platform),
      appVersion: '1.0.0',
      buildNumber: '1',
      hermesBytecodeEnabled: platform !== PlatformType.WEB,
    };

    return this.cached;
  }

  static invalidateCache(): void {
    this.cached = null;
  }

  private static detectPlatform(): PlatformType {
    // React Native: Platform.OS
    // Web fallback: navigator.userAgent
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent.toLowerCase();
      if (/iphone|ipad|ipod/.test(ua)) return PlatformType.IOS;
      if (/android/.test(ua)) return PlatformType.ANDROID;
      if (/macintosh/.test(ua)) return PlatformType.MACOS;
      if (/windows/.test(ua)) return PlatformType.WINDOWS;
    }
    return PlatformType.WEB;
  }

  private static detectScreen(): { width: number; height: number; pixelRatio: number } {
    // Expo: Dimensions.get('window')
    return { width: 390, height: 844, pixelRatio: 3 }; // iPhone 14 defaults
  }

  private static classifyDevice(width: number): DeviceClass {
    if (width < 768) return DeviceClass.PHONE;
    if (width <= 1024) return DeviceClass.TABLET;
    return DeviceClass.DESKTOP;
  }

  private static detectBiometrics(platform: PlatformType): boolean {
    return platform === PlatformType.IOS || platform === PlatformType.ANDROID;
  }

  private static detectBiometricType(platform: PlatformType): PlatformCapabilities['biometricType'] {
    switch (platform) {
      case PlatformType.IOS: return 'face_id';
      case PlatformType.ANDROID: return 'fingerprint';
      case PlatformType.WEB: return 'webauthn';
      default: return 'none';
    }
  }

  private static estimateOfflineStorage(platform: PlatformType): number {
    switch (platform) {
      case PlatformType.IOS: return 2048;      // 2GB conservative
      case PlatformType.ANDROID: return 1024;   // 1GB conservative
      case PlatformType.WEB: return 100;        // IndexedDB ~100MB typical
      default: return 50;
    }
  }

  private static detectBrowserEngine(): string {
    if (typeof navigator === 'undefined') return 'unknown';
    const ua = navigator.userAgent;
    if (ua.includes('Chrome')) return 'blink';
    if (ua.includes('Safari')) return 'webkit';
    if (ua.includes('Firefox')) return 'gecko';
    return 'unknown';
  }

  private static detectOsVersion(platform: PlatformType): string {
    // expo-device provides this natively
    return platform === PlatformType.IOS ? '18.0' : platform === PlatformType.ANDROID ? '15' : 'web';
  }
}

// =============================================================================
// SECTION 2: APPLICATION STATE MANAGEMENT
// =============================================================================

/**
 * The Zustand store architecture. Think of this as the nervous system of the app:
 * every component can read state and trigger actions, and state changes propagate
 * instantly to all interested observers. Unlike Redux's ceremony of actions,
 * reducers, and selectors, Zustand provides a lightweight, TypeScript-first
 * approach that works identically across iOS, Android, and web.
 */

/** Authentication state — who is the user and what can they access? */
export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  userId: string | null;
  tenantId: string | null;
  learnerId: string | null;       // active learner profile (child)
  role: UserRole;
  accessToken: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;  // unix ms
  biometricEnabled: boolean;
  lastActivity: number;           // unix ms — for session timeout
}

export enum UserRole {
  LEARNER = 'learner',
  PARENT = 'parent',
  TEACHER = 'teacher',
  ADMIN = 'admin',
  CREATOR = 'creator',
}

/** Learner profile state — the child's identity within the learning system */
export interface LearnerState {
  learnerId: string | null;
  name: string;
  ageGroup: AgeGroup;
  avatarUrl: string | null;
  currentPhonicsPhase: number;    // 1-6 Letters & Sounds
  bktMasterySnapshot: Record<string, number>; // GPC -> mastery probability
  wcpm: number;                   // words correct per minute
  preferredThemes: string[];
  preferredArtStyle: string;
  streakDays: number;
  totalXp: number;
  tokenBalances: TokenBalances;
  readingLevel: ReadingLevel;
}

export enum AgeGroup {
  EARLY_YEARS = 'early_years',    // 3-5
  FOUNDATION = 'foundation',      // 5-7
  DEVELOPING = 'developing',      // 7-9
  FLUENT = 'fluent',              // 9-12
  ADVANCED = 'advanced',          // 12+
}

export enum ReadingLevel {
  PRE_READER = 'pre_reader',
  EMERGENT = 'emergent',
  EARLY = 'early',
  TRANSITIONAL = 'transitional',
  FLUENT = 'fluent',
  ADVANCED = 'advanced',
}

export interface TokenBalances {
  sparks: number;
  gems: number;
  voice: number;
  stakedSparks: number;
  stakedGems: number;
}

/** Library state — what's available, downloaded, and being read */
export interface LibraryState {
  shelves: LibraryShelf[];
  downloadedBooks: Map<string, DownloadedBook>;
  currentBook: string | null;     // storybook ID being read
  currentPage: number;
  readingSession: ReadingSession | null;
  libraryLoading: boolean;
  lastSyncTimestamp: number;
}

export interface LibraryShelf {
  id: string;
  name: string;
  type: ShelfType;
  bookIds: string[];
  sortOrder: number;
}

export enum ShelfType {
  READY_FOR_YOU = 'ready_for_you',       // curriculum-matched
  FAVOURITES = 'favourites',              // re-reads
  ADVENTURES_WAITING = 'adventures_waiting', // aspirational
  COMMUNITY_PICKS = 'community_picks',    // popular
  RECENTLY_READ = 'recently_read',
  DOWNLOADED = 'downloaded',
  SERIES = 'series',
}

export interface DownloadedBook {
  storybookId: string;
  title: string;
  downloadedAt: number;
  storageSizeMb: number;
  syncVersion: number;
  pagesDownloaded: number;
  totalPages: number;
  narrationDownloaded: boolean;
  lastAccessed: number;
}

export interface ReadingSession {
  sessionId: string;
  storybookId: string;
  startedAt: number;
  currentPage: number;
  mode: ReadingMode;
  wordsRead: number;
  wordsCorrect: number;
  gpcEncounters: Record<string, number>;  // GPC -> times encountered
  gpcSuccesses: Record<string, number>;   // GPC -> times decoded correctly
  pauseTimestamps: number[];
  isActive: boolean;
}

export enum ReadingMode {
  LISTEN = 'listen',         // passive narration
  READ_ALOUD = 'read_aloud', // active with ASR
  INDEPENDENT = 'independent', // silent reading with comprehension checks
}

/** Navigation state */
export interface NavigationState {
  currentRoute: string;
  previousRoute: string | null;
  deepLinkPending: string | null;
  tabBarVisible: boolean;
  headerVisible: boolean;
  modalStack: string[];
}

/** Connectivity state — essential for offline-first behaviour */
export interface ConnectivityState {
  isOnline: boolean;
  networkType: 'wifi' | 'cellular' | 'ethernet' | 'offline' | 'unknown';
  syncQueueSize: number;
  lastSyncAt: number | null;
  syncInProgress: boolean;
  pendingUploads: number;       // reading sessions awaiting upload
}

/** The root application state — the union of all state slices */
export interface AppState {
  auth: AuthState;
  learner: LearnerState;
  library: LibraryState;
  navigation: NavigationState;
  connectivity: ConnectivityState;
  platform: PlatformCapabilities;
}

// =============================================================================
// SECTION 3: ZUSTAND STORE FACTORY
// =============================================================================

/**
 * Store configuration and creation. In the actual Expo app, this would use
 * zustand/middleware for persistence (AsyncStorage on native, localStorage on web)
 * and devtools integration.
 */
export interface StoreConfig {
  persistKey: string;
  persistVersion: number;
  enableDevtools: boolean;
  enablePersistence: boolean;
  sessionTimeoutMs: number;     // auto-logout after inactivity
  syncIntervalMs: number;       // background sync frequency
}

export const DEFAULT_STORE_CONFIG: StoreConfig = {
  persistKey: 'scholarly-app-state',
  persistVersion: 1,
  enableDevtools: process.env.NODE_ENV !== 'production',
  enablePersistence: true,
  sessionTimeoutMs: 30 * 60 * 1000,  // 30 minutes
  syncIntervalMs: 60 * 1000,          // 1 minute
};

export const INITIAL_AUTH_STATE: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  userId: null,
  tenantId: null,
  learnerId: null,
  role: UserRole.LEARNER,
  accessToken: null,
  refreshToken: null,
  tokenExpiresAt: null,
  biometricEnabled: false,
  lastActivity: Date.now(),
};

export const INITIAL_LEARNER_STATE: LearnerState = {
  learnerId: null,
  name: '',
  ageGroup: AgeGroup.FOUNDATION,
  avatarUrl: null,
  currentPhonicsPhase: 1,
  bktMasterySnapshot: {},
  wcpm: 0,
  preferredThemes: [],
  preferredArtStyle: 'watercolour',
  streakDays: 0,
  totalXp: 0,
  tokenBalances: { sparks: 0, gems: 0, voice: 0, stakedSparks: 0, stakedGems: 0 },
  readingLevel: ReadingLevel.PRE_READER,
};

export const INITIAL_LIBRARY_STATE: LibraryState = {
  shelves: [],
  downloadedBooks: new Map(),
  currentBook: null,
  currentPage: 0,
  readingSession: null,
  libraryLoading: true,
  lastSyncTimestamp: 0,
};

export const INITIAL_CONNECTIVITY_STATE: ConnectivityState = {
  isOnline: true,
  networkType: 'unknown',
  syncQueueSize: 0,
  lastSyncAt: null,
  syncInProgress: false,
  pendingUploads: 0,
};

// =============================================================================
// SECTION 4: STORE ACTIONS
// =============================================================================

/**
 * Actions define every possible state mutation. Think of them as the verbs
 * of the application: "login", "selectBook", "startReading", "goOffline".
 * Each action encapsulates the business logic for its mutation, ensuring
 * that state transitions are always valid and observable.
 */

export interface AuthActions {
  login(credentials: LoginCredentials): Promise<Result<AuthState>>;
  loginWithBiometrics(): Promise<Result<AuthState>>;
  logout(): Promise<void>;
  refreshTokens(): Promise<Result<void>>;
  switchLearnerProfile(learnerId: string): Promise<Result<void>>;
  updateLastActivity(): void;
  checkSessionTimeout(): boolean;
}

export interface LoginCredentials {
  email?: string;
  password?: string;
  provider?: 'google' | 'apple' | 'microsoft';
  providerToken?: string;
}

export interface LearnerActions {
  loadProfile(learnerId: string): Promise<Result<LearnerState>>;
  updateMasterySnapshot(gpcUpdates: Record<string, number>): void;
  addXp(amount: number, source: string): void;
  updateStreak(): void;
  setPreferredThemes(themes: string[]): void;
  setPreferredArtStyle(style: string): void;
  refreshTokenBalances(): Promise<Result<TokenBalances>>;
}

export interface LibraryActions {
  loadShelves(): Promise<Result<LibraryShelf[]>>;
  searchBooks(query: LibrarySearchQuery): Promise<Result<StorybookSummary[]>>;
  getRecommendations(): Promise<Result<StorybookSummary[]>>;
  downloadBook(storybookId: string): Promise<Result<DownloadedBook>>;
  deleteDownloadedBook(storybookId: string): Promise<Result<void>>;
  openBook(storybookId: string): Promise<Result<void>>;
  closeBook(): void;
  navigateToPage(page: number): void;
  startReadingSession(mode: ReadingMode): Result<ReadingSession>;
  endReadingSession(): Promise<Result<ReadingSessionSummary>>;
  recordWordAttempt(word: string, correct: boolean, gpcs: string[]): void;
  syncReadingProgress(): Promise<Result<void>>;
}

export interface LibrarySearchQuery {
  text?: string;
  phonicsPhase?: number;
  targetGpcs?: string[];
  themes?: string[];
  artStyles?: string[];
  ageGroup?: AgeGroup;
  language?: string;
  minDecodability?: number;
  seriesId?: string;
  sortBy?: 'relevance' | 'newest' | 'popular' | 'difficulty';
  limit?: number;
  offset?: number;
}

export interface StorybookSummary {
  id: string;
  title: string;
  coverUrl: string;
  phonicsPhase: number;
  targetGpcs: string[];
  decodabilityScore: number;
  pageCount: number;
  artStyle: string;
  seriesName: string | null;
  authorName: string;
  rating: number;
  readCount: number;
  isDownloaded: boolean;
  estimatedReadTimeMinutes: number;
}

export interface ReadingSessionSummary {
  sessionId: string;
  storybookId: string;
  durationMs: number;
  pagesRead: number;
  wordsRead: number;
  wordsCorrect: number;
  accuracy: number;
  wcpm: number;
  gpcMasteryUpdates: Record<string, number>;
  xpEarned: number;
  sparksEarned: number;
  badgesEarned: string[];
  streakMaintained: boolean;
}

export interface ConnectivityActions {
  setOnlineStatus(isOnline: boolean, networkType: ConnectivityState['networkType']): void;
  incrementSyncQueue(): void;
  decrementSyncQueue(): void;
  startSync(): void;
  endSync(success: boolean): void;
}

// =============================================================================
// SECTION 5: APP INITIALISATION SEQUENCE
// =============================================================================

/**
 * The boot sequence — a carefully orchestrated series of steps that transforms
 * a blank screen into a fully functional, personalised learning environment.
 * Think of it as starting a car: ignition (platform detection), fuel check
 * (connectivity), key verification (authentication), mirror adjustment
 * (profile loading), and finally pulling out of the driveway (navigation).
 *
 * The sequence is designed to be as fast as possible on the happy path (user
 * is authenticated, online, and has cached data) while gracefully degrading
 * when conditions aren't ideal (offline, expired tokens, first launch).
 */

export enum InitPhase {
  NOT_STARTED = 'not_started',
  PLATFORM_DETECTION = 'platform_detection',
  CONNECTIVITY_CHECK = 'connectivity_check',
  STATE_HYDRATION = 'state_hydration',
  AUTH_VERIFICATION = 'auth_verification',
  PROFILE_LOADING = 'profile_loading',
  PUSH_REGISTRATION = 'push_registration',
  DEVICE_REGISTRATION = 'device_registration',
  SYNC_CHECK = 'sync_check',
  READY = 'ready',
  ERROR = 'error',
}

export interface InitProgress {
  phase: InitPhase;
  progress: number;        // 0-100
  message: string;
  startedAt: number;
  completedPhases: InitPhase[];
  error: string | null;
}

export interface InitConfig {
  skipPushRegistration: boolean;   // for testing
  forceOnlineCheck: boolean;       // bypass cache
  maxInitTimeMs: number;           // timeout
  splashMinDisplayMs: number;      // minimum splash screen time for branding
}

export const DEFAULT_INIT_CONFIG: InitConfig = {
  skipPushRegistration: false,
  forceOnlineCheck: false,
  maxInitTimeMs: 15000,
  splashMinDisplayMs: 2000,
};

export class AppInitialiser {
  private config: InitConfig;
  private progress: InitProgress;
  private onProgressUpdate: (progress: InitProgress) => void;

  constructor(
    config: Partial<InitConfig> = {},
    onProgressUpdate: (progress: InitProgress) => void = () => {},
  ) {
    this.config = { ...DEFAULT_INIT_CONFIG, ...config };
    this.onProgressUpdate = onProgressUpdate;
    this.progress = {
      phase: InitPhase.NOT_STARTED,
      progress: 0,
      message: 'Starting...',
      startedAt: Date.now(),
      completedPhases: [],
      error: null,
    };
  }

  /**
   * Run the full initialisation sequence. Returns the initial navigation
   * destination based on auth state and pending deep links.
   */
  async initialise(): Promise<Result<InitialRoute>> {
    const startTime = Date.now();
    const timeout = setTimeout(() => {
      this.updateProgress(InitPhase.ERROR, 0, 'Initialisation timed out');
    }, this.config.maxInitTimeMs);

    try {
      // Phase 1: Platform Detection (instant)
      this.updateProgress(InitPhase.PLATFORM_DETECTION, 10, 'Detecting platform...');
      const platform = PlatformDetector.detect();
      this.completePhase(InitPhase.PLATFORM_DETECTION);

      // Phase 2: Connectivity Check
      this.updateProgress(InitPhase.CONNECTIVITY_CHECK, 20, 'Checking connectivity...');
      const connectivity = await this.checkConnectivity();
      this.completePhase(InitPhase.CONNECTIVITY_CHECK);

      // Phase 3: State Hydration (load persisted state from AsyncStorage/IndexedDB)
      this.updateProgress(InitPhase.STATE_HYDRATION, 30, 'Loading saved data...');
      const hydratedState = await this.hydrateState();
      this.completePhase(InitPhase.STATE_HYDRATION);

      // Phase 4: Auth Verification
      this.updateProgress(InitPhase.AUTH_VERIFICATION, 50, 'Verifying login...');
      const authResult = await this.verifyAuth(hydratedState, connectivity.isOnline);
      this.completePhase(InitPhase.AUTH_VERIFICATION);

      if (!authResult.isAuthenticated) {
        // Not authenticated — route to onboarding/login
        this.updateProgress(InitPhase.READY, 100, 'Ready');
        clearTimeout(timeout);
        return {
          success: true,
          data: { screen: 'auth/login', params: {} },
        };
      }

      // Phase 5: Profile Loading
      this.updateProgress(InitPhase.PROFILE_LOADING, 60, 'Loading profile...');
      await this.loadLearnerProfile(authResult.learnerId!);
      this.completePhase(InitPhase.PROFILE_LOADING);

      // Phase 6: Push Notification Registration
      if (!this.config.skipPushRegistration && platform.hasPushNotifications) {
        this.updateProgress(InitPhase.PUSH_REGISTRATION, 70, 'Setting up notifications...');
        await this.registerPushToken(platform);
        this.completePhase(InitPhase.PUSH_REGISTRATION);
      }

      // Phase 7: Device Registration (for federated sync)
      this.updateProgress(InitPhase.DEVICE_REGISTRATION, 80, 'Registering device...');
      await this.registerDevice(platform);
      this.completePhase(InitPhase.DEVICE_REGISTRATION);

      // Phase 8: Sync Check
      if (connectivity.isOnline) {
        this.updateProgress(InitPhase.SYNC_CHECK, 90, 'Syncing progress...');
        await this.performInitialSync();
        this.completePhase(InitPhase.SYNC_CHECK);
      }

      // Ensure minimum splash display time
      const elapsed = Date.now() - startTime;
      if (elapsed < this.config.splashMinDisplayMs) {
        await this.delay(this.config.splashMinDisplayMs - elapsed);
      }

      this.updateProgress(InitPhase.READY, 100, 'Ready!');
      clearTimeout(timeout);

      // Determine initial route
      const route = this.determineInitialRoute(hydratedState);
      return { success: true, data: route };

    } catch (error) {
      clearTimeout(timeout);
      const message = error instanceof Error ? error.message : 'Unknown initialisation error';
      this.updateProgress(InitPhase.ERROR, 0, message);
      return {
        success: false,
        error: { code: 'INIT_FAILED', message, details: { phase: this.progress.phase } },
      };
    }
  }

  private updateProgress(phase: InitPhase, progress: number, message: string): void {
    this.progress = { ...this.progress, phase, progress, message };
    this.onProgressUpdate(this.progress);
  }

  private completePhase(phase: InitPhase): void {
    this.progress.completedPhases.push(phase);
  }

  private async checkConnectivity(): Promise<{ isOnline: boolean; networkType: string }> {
    // expo-network: NetInfo.fetch()
    // Web: navigator.onLine + fetch probe
    try {
      // Simple connectivity probe — hit a lightweight endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const response = await fetch('/api/health', {
        method: 'HEAD',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      return { isOnline: response.ok, networkType: 'unknown' };
    } catch {
      return { isOnline: false, networkType: 'offline' };
    }
  }

  private async hydrateState(): Promise<Partial<AppState> | null> {
    // In Expo: AsyncStorage.getItem(PERSIST_KEY)
    // In Web: localStorage.getItem(PERSIST_KEY)
    // Returns parsed state or null if first launch
    try {
      // Placeholder — actual implementation uses zustand persist middleware
      return null;
    } catch {
      return null;
    }
  }

  private async verifyAuth(
    hydratedState: Partial<AppState> | null,
    isOnline: boolean,
  ): Promise<{ isAuthenticated: boolean; learnerId: string | null }> {
    const auth = hydratedState?.auth;

    if (!auth?.accessToken) {
      return { isAuthenticated: false, learnerId: null };
    }

    // Check token expiry
    if (auth.tokenExpiresAt && auth.tokenExpiresAt < Date.now()) {
      if (!isOnline) {
        // Offline with expired token — allow grace period for offline reading
        const OFFLINE_GRACE_PERIOD_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
        if (auth.tokenExpiresAt + OFFLINE_GRACE_PERIOD_MS > Date.now()) {
          return { isAuthenticated: true, learnerId: auth.learnerId };
        }
        return { isAuthenticated: false, learnerId: null };
      }

      // Online with expired token — attempt refresh
      if (auth.refreshToken) {
        try {
          // POST /api/auth/refresh with refresh token
          // If successful, update stored tokens
          return { isAuthenticated: true, learnerId: auth.learnerId };
        } catch {
          return { isAuthenticated: false, learnerId: null };
        }
      }
      return { isAuthenticated: false, learnerId: null };
    }

    return { isAuthenticated: true, learnerId: auth.learnerId };
  }

  private async loadLearnerProfile(learnerId: string): Promise<void> {
    // GET /api/learners/{learnerId}/profile
    // Updates learner state slice with BKT snapshot, phase, themes, etc.
  }

  private async registerPushToken(platform: PlatformCapabilities): Promise<void> {
    // expo-notifications: getExpoPushTokenAsync()
    // POST /api/devices/push-token with { token, platform, deviceId }
  }

  private async registerDevice(platform: PlatformCapabilities): Promise<void> {
    // POST /api/devices/register with platform capabilities
    // This enables the federated sync system to track this device
  }

  private async performInitialSync(): Promise<void> {
    // Pull latest reading progress, downloaded book status, token balances
    // Push any queued offline reading sessions
    // Resolve conflicts using federated-knowledge-tracing timestamps
  }

  private determineInitialRoute(hydratedState: Partial<AppState> | null): InitialRoute {
    // Check for pending deep link (e.g., "open this storybook")
    const deepLink = hydratedState?.navigation?.deepLinkPending;
    if (deepLink) {
      return this.parseDeepLink(deepLink);
    }

    // Check if mid-book (resume reading)
    const currentBook = hydratedState?.library?.currentBook;
    if (currentBook) {
      return {
        screen: 'reader',
        params: {
          storybookId: currentBook,
          page: hydratedState?.library?.currentPage ?? 0,
          resuming: true,
        },
      };
    }

    // Default: library home
    return { screen: 'library', params: {} };
  }

  private parseDeepLink(link: string): InitialRoute {
    // scholarly://book/{id} → reader screen
    // scholarly://arena/{id} → arena screen
    // scholarly://library?phase={n} → filtered library
    const url = new URL(link, 'scholarly://');
    const path = url.pathname;

    if (path.startsWith('/book/')) {
      return { screen: 'reader', params: { storybookId: path.split('/')[2] } };
    }
    if (path.startsWith('/arena/')) {
      return { screen: 'arena', params: { competitionId: path.split('/')[2] } };
    }
    return { screen: 'library', params: {} };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export interface InitialRoute {
  screen: string;
  params: Record<string, unknown>;
}

// =============================================================================
// SECTION 6: ROOT LAYOUT COMPONENT SPECIFICATION
// =============================================================================

/**
 * The root layout defines the structural hierarchy of the application.
 * In Expo Router, this maps to app/_layout.tsx — the outermost wrapper
 * that every screen renders inside.
 *
 * The component tree looks like this:
 *
 * <SafeAreaProvider>
 *   <GestureHandlerRootView>
 *     <ThemeProvider>
 *       <StoreProvider>
 *         <SplashScreen> (during init)
 *         │
 *         <AuthGate>
 *           ├── Not authenticated → <AuthStack>
 *           │     ├── /auth/login
 *           │     ├── /auth/register
 *           │     └── /auth/onboarding
 *           │
 *           └── Authenticated → <AppTabs>
 *                 ├── /library (Library Home)
 *                 ├── /arena (Arena)
 *                 ├── /progress (Progress Dashboard)
 *                 ├── /create (Creator Studio — adults only)
 *                 └── /profile (Settings & Profile)
 *                 │
 *                 └── <Modal Stack>
 *                       ├── /reader/{id} (Storybook Reader — full screen)
 *                       ├── /book/{id} (Book Detail)
 *                       └── /achievement/{id} (Achievement Celebration)
 *       </StoreProvider>
 *     </ThemeProvider>
 *   </GestureHandlerRootView>
 * </SafeAreaProvider>
 */

export interface RootLayoutConfig {
  theme: ThemeConfig;
  tabBar: TabBarConfig;
  splash: SplashConfig;
  fonts: FontConfig;
}

export interface ThemeConfig {
  mode: 'light' | 'dark' | 'system';
  primaryColor: string;
  accentColor: string;
  fontFamily: string;
  borderRadius: number;
  ageGroupOverrides: Partial<Record<AgeGroup, Partial<ThemeConfig>>>;
}

export const DEFAULT_THEME: ThemeConfig = {
  mode: 'light',
  primaryColor: '#4A90D9',      // Scholarly blue
  accentColor: '#F5A623',        // warm gold for achievements
  fontFamily: 'Inter',
  borderRadius: 12,
  ageGroupOverrides: {
    [AgeGroup.EARLY_YEARS]: {
      primaryColor: '#7ED321',   // friendlier green for young children
      borderRadius: 20,           // rounder, softer shapes
    },
    [AgeGroup.ADVANCED]: {
      primaryColor: '#4A4A4A',   // more mature palette
      borderRadius: 8,
    },
  },
};

export interface TabBarConfig {
  tabs: TabDefinition[];
  height: number;
  iconSize: number;
  showLabels: boolean;
  hapticFeedback: boolean;
  hideOnReader: boolean;          // hide tab bar when reading
}

export interface TabDefinition {
  name: string;
  route: string;
  icon: string;                   // Lucide icon name
  activeIcon: string;
  label: string;
  badge?: () => number | null;   // dynamic badge count
  requiresAuth: boolean;
  minimumAge: AgeGroup;           // tab visibility by age
  roles: UserRole[];              // tab visibility by role
}

export const DEFAULT_TAB_BAR: TabBarConfig = {
  height: 64,
  iconSize: 24,
  showLabels: true,
  hapticFeedback: true,
  hideOnReader: true,
  tabs: [
    {
      name: 'library',
      route: '/(tabs)/library',
      icon: 'book-open',
      activeIcon: 'book-open',
      label: 'Library',
      requiresAuth: true,
      minimumAge: AgeGroup.EARLY_YEARS,
      roles: [UserRole.LEARNER, UserRole.PARENT, UserRole.TEACHER],
    },
    {
      name: 'arena',
      route: '/(tabs)/arena',
      icon: 'swords',
      activeIcon: 'swords',
      label: 'Arena',
      requiresAuth: true,
      minimumAge: AgeGroup.FOUNDATION,
      roles: [UserRole.LEARNER, UserRole.TEACHER],
    },
    {
      name: 'progress',
      route: '/(tabs)/progress',
      icon: 'bar-chart-2',
      activeIcon: 'bar-chart-2',
      label: 'Progress',
      requiresAuth: true,
      minimumAge: AgeGroup.EARLY_YEARS,
      roles: [UserRole.LEARNER, UserRole.PARENT, UserRole.TEACHER],
    },
    {
      name: 'create',
      route: '/(tabs)/create',
      icon: 'palette',
      activeIcon: 'palette',
      label: 'Create',
      requiresAuth: true,
      minimumAge: AgeGroup.ADVANCED,
      roles: [UserRole.CREATOR, UserRole.TEACHER, UserRole.ADMIN],
    },
    {
      name: 'profile',
      route: '/(tabs)/profile',
      icon: 'user',
      activeIcon: 'user',
      label: 'Profile',
      requiresAuth: true,
      minimumAge: AgeGroup.EARLY_YEARS,
      roles: [UserRole.LEARNER, UserRole.PARENT, UserRole.TEACHER, UserRole.ADMIN, UserRole.CREATOR],
    },
  ],
};

export interface SplashConfig {
  backgroundColor: string;
  logoSource: string;            // require('./assets/logo.png')
  fadeOutDuration: number;
  showProgressBar: boolean;
  progressBarColor: string;
}

export interface FontConfig {
  regular: string;
  medium: string;
  bold: string;
  serif: string;                 // for story text
  mono: string;                  // for code/phonics notation
  storyTitle: string;            // decorative font for book titles
}

export const DEFAULT_FONTS: FontConfig = {
  regular: 'Inter-Regular',
  medium: 'Inter-Medium',
  bold: 'Inter-Bold',
  serif: 'Merriweather-Regular',  // excellent readability for long text
  mono: 'JetBrainsMono-Regular',
  storyTitle: 'Quicksand-Bold',   // friendly, rounded for children's titles
};

// =============================================================================
// SECTION 7: PLATFORM-SPECIFIC SERVICE INTERFACES
// =============================================================================

/**
 * These interfaces define the 5% platform-specific layer from Strategy §3.3.
 * Each interface has three implementations: iOS, Android, and Web. The App Shell
 * selects the correct implementation at boot time based on PlatformDetector.
 *
 * Think of these as electrical adapters: the appliance (shared code) doesn't
 * care whether the wall socket is US, UK, or EU — it just needs the right
 * adapter to plug in.
 */

/** Audio recording — for read-aloud ASR */
export interface AudioRecordingService {
  requestPermission(): Promise<Result<boolean>>;
  startRecording(config: AudioRecordingConfig): Promise<Result<string>>; // session ID
  stopRecording(): Promise<Result<AudioRecordingResult>>;
  pauseRecording(): Promise<Result<void>>;
  resumeRecording(): Promise<Result<void>>;
  getRecordingLevel(): number;  // 0-1 amplitude for visualisation
}

export interface AudioRecordingConfig {
  sampleRate: number;           // 16000 for ASR
  bitDepth: number;             // 16
  channels: number;             // 1 (mono)
  format: 'wav' | 'mp3' | 'aac';
  maxDurationMs: number;
  streamToServer: boolean;      // real-time ASR vs batch
}

export interface AudioRecordingResult {
  uri: string;
  durationMs: number;
  sizeBytes: number;
  format: string;
  averageAmplitude: number;
}

/** Audio playback — for narration */
export interface AudioPlaybackService {
  loadAudio(uri: string): Promise<Result<string>>;  // player ID
  play(playerId: string): Promise<Result<void>>;
  pause(playerId: string): Promise<Result<void>>;
  stop(playerId: string): Promise<Result<void>>;
  seekTo(playerId: string, positionMs: number): Promise<Result<void>>;
  setPlaybackRate(playerId: string, rate: number): Promise<Result<void>>;
  getCurrentPosition(playerId: string): number;      // ms
  getDuration(playerId: string): number;              // ms
  onPlaybackStatus(playerId: string, callback: (status: PlaybackStatus) => void): () => void;
}

export interface PlaybackStatus {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isBuffering: boolean;
  didJustFinish: boolean;
}

/** Push notifications */
export interface PushNotificationService {
  requestPermission(): Promise<Result<boolean>>;
  getToken(): Promise<Result<string>>;
  onNotificationReceived(callback: (notification: AppNotification) => void): () => void;
  onNotificationOpened(callback: (notification: AppNotification) => void): () => void;
  setBadgeCount(count: number): Promise<void>;
  scheduleLocal(notification: LocalNotification): Promise<Result<string>>;
  cancelLocal(notificationId: string): Promise<Result<void>>;
}

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  receivedAt: number;
}

export enum NotificationType {
  NEW_BOOK = 'new_book',                // new book ready for you
  STREAK_REMINDER = 'streak_reminder',   // don't break your streak!
  ARENA_STARTING = 'arena_starting',     // competition starting soon
  ARENA_RESULT = 'arena_result',         // competition results
  ACHIEVEMENT = 'achievement',           // badge earned
  PARENT_REPORT = 'parent_report',       // weekly progress report
  BOUNTY_ACCEPTED = 'bounty_accepted',   // creator: submission accepted
  REVIEW_READY = 'review_ready',         // creator: book needs review
}

export interface LocalNotification {
  title: string;
  body: string;
  triggerAt: number;              // unix ms
  repeatInterval?: 'day' | 'week';
  data?: Record<string, unknown>;
}

/** Offline storage */
export interface OfflineStorageService {
  /** Store a storybook's full content for offline reading */
  downloadBook(storybookId: string, content: StorybookContent): Promise<Result<DownloadedBook>>;
  /** Get a downloaded book's content */
  getBookContent(storybookId: string): Promise<Result<StorybookContent | null>>;
  /** Delete a downloaded book */
  deleteBook(storybookId: string): Promise<Result<void>>;
  /** Get total storage used */
  getStorageUsed(): Promise<Result<number>>;  // bytes
  /** Get available storage */
  getStorageAvailable(): Promise<Result<number>>;  // bytes
  /** List all downloaded books */
  listDownloads(): Promise<Result<DownloadedBook[]>>;
  /** Store offline reading session for later sync */
  queueReadingSession(session: ReadingSession): Promise<Result<void>>;
  /** Get queued sessions for sync */
  getQueuedSessions(): Promise<Result<ReadingSession[]>>;
  /** Clear synced sessions */
  clearSyncedSessions(sessionIds: string[]): Promise<Result<void>>;
  /** Store BKT snapshot for offline mastery computation */
  saveBktSnapshot(learnerId: string, snapshot: Record<string, number>): Promise<Result<void>>;
  /** Load BKT snapshot */
  loadBktSnapshot(learnerId: string): Promise<Result<Record<string, number> | null>>;
}

export interface StorybookContent {
  storybookId: string;
  title: string;
  pages: StorybookPageContent[];
  characters: CharacterDefinition[];
  metadata: StorybookMetadata;
  narrationAudioUrls: string[];
  wordTimestamps: WordTimestamp[][];  // per page
  totalSizeBytes: number;
}

export interface StorybookPageContent {
  pageNumber: number;
  text: string;
  illustrationUrl: string;
  sceneLayout: SceneLayout | null;
  words: PageWord[];
}

export interface PageWord {
  text: string;
  gpcs: string[];                 // grapheme-phoneme correspondences in this word
  isDecodable: boolean;           // decodable with taught GPC set
  frequencyTier: 1 | 2 | 3;      // Beck's vocabulary tiers
  startCharIndex: number;
  endCharIndex: number;
}

export interface CharacterDefinition {
  characterId: string;
  name: string;
  description: string;
  styleSheetUrl: string;
  personalityTraits: string[];
}

export interface StorybookMetadata {
  phonicsPhase: number;
  targetGpcs: string[];
  taughtGpcSet: string[];
  decodabilityScore: number;
  wcpmBand: [number, number];
  vocabularyTier: 1 | 2 | 3;
  morphemeFocus: string[];
  comprehensionStrand: string;
  culturalContext: string;
  seriesId: string | null;
  language: string;
  cefrLevel: string | null;
}

export interface SceneLayout {
  backgroundLayer: string;        // URL
  characterPositions: { characterId: string; x: number; y: number; scale: number }[];
  foregroundLayer: string | null;  // URL
  textOverlayZone: { x: number; y: number; width: number; height: number };
  parallaxDepth: number;          // 0-1 for scroll effect
}

export interface WordTimestamp {
  word: string;
  startMs: number;
  endMs: number;
  pageWordIndex: number;
}

/** In-app purchases */
export interface InAppPurchaseService {
  /** Initialise the purchase system */
  initialise(): Promise<Result<void>>;
  /** Get available subscription plans */
  getProducts(): Promise<Result<SubscriptionProduct[]>>;
  /** Initiate a purchase */
  purchase(productId: string): Promise<Result<PurchaseResult>>;
  /** Restore previous purchases */
  restorePurchases(): Promise<Result<PurchaseResult[]>>;
  /** Check active subscription */
  getActiveSubscription(): Promise<Result<ActiveSubscription | null>>;
  /** Listen for purchase updates */
  onPurchaseUpdate(callback: (result: PurchaseResult) => void): () => void;
}

export interface SubscriptionProduct {
  productId: string;
  title: string;
  description: string;
  priceString: string;
  priceAmountMicros: number;
  currencyCode: string;
  subscriptionPeriod: 'month' | 'year';
  freeTrialPeriod: string | null;
  introductoryPrice: string | null;
}

export interface PurchaseResult {
  productId: string;
  transactionId: string;
  receiptData: string;            // for server-side verification
  purchaseState: 'purchased' | 'pending' | 'cancelled' | 'refunded';
  purchaseTime: number;
}

export interface ActiveSubscription {
  productId: string;
  expiresAt: number;
  autoRenewing: boolean;
  platform: 'apple' | 'google' | 'stripe';
  originalTransactionId: string;
}

/** Biometric authentication */
export interface BiometricService {
  isAvailable(): Promise<boolean>;
  getType(): Promise<'face_id' | 'touch_id' | 'fingerprint' | 'webauthn' | 'none'>;
  authenticate(reason: string): Promise<Result<boolean>>;
  storeCredentials(key: string, value: string): Promise<Result<void>>;
  retrieveCredentials(key: string): Promise<Result<string | null>>;
}

// =============================================================================
// SECTION 8: DEEP LINKING & UNIVERSAL LINKS
// =============================================================================

/**
 * Deep linking routes — these enable "open this storybook" notifications,
 * shared links, and QR codes in classrooms that take children directly
 * to the right content.
 */

export interface DeepLinkConfig {
  scheme: 'scholarly';
  webDomain: 'app.scholarly.edu';
  routes: DeepLinkRoute[];
}

export interface DeepLinkRoute {
  pattern: string;                // e.g., '/book/:id'
  screen: string;                 // e.g., 'reader'
  requiresAuth: boolean;
  extractParams: (url: URL) => Record<string, string>;
}

export const DEEP_LINK_ROUTES: DeepLinkRoute[] = [
  {
    pattern: '/book/:id',
    screen: 'reader',
    requiresAuth: true,
    extractParams: (url) => ({ storybookId: url.pathname.split('/')[2] }),
  },
  {
    pattern: '/arena/:id',
    screen: 'arena/competition',
    requiresAuth: true,
    extractParams: (url) => ({ competitionId: url.pathname.split('/')[2] }),
  },
  {
    pattern: '/library',
    screen: 'library',
    requiresAuth: true,
    extractParams: (url) => Object.fromEntries(url.searchParams),
  },
  {
    pattern: '/invite/:code',
    screen: 'auth/register',
    requiresAuth: false,
    extractParams: (url) => ({ inviteCode: url.pathname.split('/')[2] }),
  },
  {
    pattern: '/team/:id/join',
    screen: 'arena/team-join',
    requiresAuth: true,
    extractParams: (url) => ({ teamId: url.pathname.split('/')[2] }),
  },
  {
    pattern: '/bounty/:id',
    screen: 'create/bounty',
    requiresAuth: true,
    extractParams: (url) => ({ bountyId: url.pathname.split('/')[2] }),
  },
];

export class DeepLinkHandler {
  private routes: DeepLinkRoute[];

  constructor(routes: DeepLinkRoute[] = DEEP_LINK_ROUTES) {
    this.routes = routes;
  }

  resolve(url: string): Result<InitialRoute> {
    try {
      const parsed = new URL(url, 'scholarly://');

      for (const route of this.routes) {
        if (this.matchPattern(parsed.pathname, route.pattern)) {
          const params = route.extractParams(parsed);
          return {
            success: true,
            data: {
              screen: route.screen,
              params: { ...params, requiresAuth: route.requiresAuth },
            },
          };
        }
      }

      // No matching route — go to library
      return { success: true, data: { screen: 'library', params: {} } };
    } catch (error) {
      return {
        success: false,
        error: { code: 'INVALID_DEEP_LINK', message: `Failed to parse: ${url}` },
      };
    }
  }

  private matchPattern(pathname: string, pattern: string): boolean {
    const pathParts = pathname.split('/').filter(Boolean);
    const patternParts = pattern.split('/').filter(Boolean);

    if (pathParts.length !== patternParts.length) return false;

    return patternParts.every((part, i) =>
      part.startsWith(':') || part === pathParts[i],
    );
  }

  /** Generate a shareable link for a storybook */
  generateBookLink(storybookId: string): string {
    return `https://app.scholarly.edu/book/${storybookId}`;
  }

  /** Generate a shareable link for an arena competition */
  generateArenaLink(competitionId: string): string {
    return `https://app.scholarly.edu/arena/${competitionId}`;
  }

  /** Generate a team invite link */
  generateTeamInviteLink(teamId: string): string {
    return `https://app.scholarly.edu/team/${teamId}/join`;
  }
}

// =============================================================================
// SECTION 9: SERVICE REGISTRY & DEPENDENCY INJECTION
// =============================================================================

/**
 * The service registry is the nervous system junction box. It maps abstract
 * service interfaces to their platform-specific implementations, allowing
 * the shared 95% of code to call services without knowing which platform
 * it's running on.
 *
 * Example: shared code calls `registry.get<AudioRecordingService>('audio.recording')`
 * and gets back the iOS CoreAudio implementation, Android AudioRecord
 * implementation, or Web MediaRecorder implementation — all transparently.
 */

export class ServiceRegistry {
  private services: Map<string, unknown> = new Map();
  private factories: Map<string, () => unknown> = new Map();

  /** Register a service instance */
  register<T>(key: string, service: T): void {
    this.services.set(key, service);
  }

  /** Register a lazy factory (service created on first access) */
  registerFactory<T>(key: string, factory: () => T): void {
    this.factories.set(key, factory);
  }

  /** Get a service by key */
  get<T>(key: string): T {
    if (this.services.has(key)) {
      return this.services.get(key) as T;
    }

    if (this.factories.has(key)) {
      const factory = this.factories.get(key)!;
      const service = factory();
      this.services.set(key, service); // cache for subsequent calls
      this.factories.delete(key);
      return service as T;
    }

    throw new Error(`Service not registered: ${key}. Did you call bootstrapPlatformServices()?`);
  }

  /** Check if a service is registered */
  has(key: string): boolean {
    return this.services.has(key) || this.factories.has(key);
  }

  /** Clear all services (for testing) */
  clear(): void {
    this.services.clear();
    this.factories.clear();
  }
}

/** Global service registry singleton */
export const globalRegistry = new ServiceRegistry();

/** Service keys — typed constants prevent typos */
export const SERVICE_KEYS = {
  AUDIO_RECORDING: 'audio.recording',
  AUDIO_PLAYBACK: 'audio.playback',
  PUSH_NOTIFICATIONS: 'push.notifications',
  OFFLINE_STORAGE: 'offline.storage',
  IN_APP_PURCHASE: 'iap',
  BIOMETRICS: 'biometrics',
  ANALYTICS: 'analytics',
  CRASH_REPORTING: 'crash_reporting',
} as const;

/**
 * Bootstrap the platform-specific service layer.
 * Called once during AppInitialiser.initialise(), after platform detection.
 */
export function bootstrapPlatformServices(
  platform: PlatformCapabilities,
  registry: ServiceRegistry = globalRegistry,
): void {
  // In the actual Expo app, this would import the platform-specific implementations:
  //
  // iOS:
  //   registry.register(SERVICE_KEYS.AUDIO_RECORDING, new ExpoAvAudioRecording());
  //   registry.register(SERVICE_KEYS.AUDIO_PLAYBACK, new ExpoAvAudioPlayback());
  //   registry.register(SERVICE_KEYS.PUSH_NOTIFICATIONS, new ExpoApnsNotifications());
  //   registry.register(SERVICE_KEYS.OFFLINE_STORAGE, new ExpoSqliteStorage());
  //   registry.register(SERVICE_KEYS.IN_APP_PURCHASE, new ExpoStoreKit2());
  //   registry.register(SERVICE_KEYS.BIOMETRICS, new ExpoLocalAuth());
  //
  // Android:
  //   registry.register(SERVICE_KEYS.AUDIO_RECORDING, new ExpoAvAudioRecording());
  //   registry.register(SERVICE_KEYS.AUDIO_PLAYBACK, new ExpoAvAudioPlayback());
  //   registry.register(SERVICE_KEYS.PUSH_NOTIFICATIONS, new ExpoFcmNotifications());
  //   registry.register(SERVICE_KEYS.OFFLINE_STORAGE, new ExpoSqliteStorage());
  //   registry.register(SERVICE_KEYS.IN_APP_PURCHASE, new ExpoGooglePlayBilling());
  //   registry.register(SERVICE_KEYS.BIOMETRICS, new ExpoLocalAuth());
  //
  // Web:
  //   registry.register(SERVICE_KEYS.AUDIO_RECORDING, new WebMediaRecorderRecording());
  //   registry.register(SERVICE_KEYS.AUDIO_PLAYBACK, new WebAudioApiPlayback());
  //   registry.register(SERVICE_KEYS.PUSH_NOTIFICATIONS, new WebPushNotifications());
  //   registry.register(SERVICE_KEYS.OFFLINE_STORAGE, new IndexedDbStorage());
  //   registry.register(SERVICE_KEYS.IN_APP_PURCHASE, new StripeCheckout());
  //   registry.register(SERVICE_KEYS.BIOMETRICS, new WebAuthnService());

  console.log(
    `[AppShell] Platform services bootstrapped for ${platform.platform} ` +
    `(${platform.deviceClass}, ${platform.osVersion})`,
  );
}

// =============================================================================
// SECTION 10: EXPO ROUTER FILE STRUCTURE SPECIFICATION
// =============================================================================

/**
 * The file-based routing structure. In Expo Router, the directory structure
 * under app/ maps directly to URL routes:
 *
 * app/
 * ├── _layout.tsx              → Root layout (SafeArea, Theme, Store, AuthGate)
 * ├── index.tsx                → Splash/redirect
 * ├── (auth)/
 * │   ├── _layout.tsx          → Auth stack layout
 * │   ├── login.tsx            → Login screen
 * │   ├── register.tsx         → Registration
 * │   └── onboarding.tsx       → First-time setup
 * ├── (tabs)/
 * │   ├── _layout.tsx          → Tab bar layout
 * │   ├── library/
 * │   │   ├── _layout.tsx      → Library stack
 * │   │   ├── index.tsx        → Enchanted Library Home
 * │   │   ├── [id].tsx         → Book detail
 * │   │   └── search.tsx       → Search & filters
 * │   ├── arena/
 * │   │   ├── _layout.tsx      → Arena stack
 * │   │   ├── index.tsx        → Arena home
 * │   │   ├── [id].tsx         → Competition detail
 * │   │   └── teams.tsx        → Team management
 * │   ├── progress/
 * │   │   ├── _layout.tsx      → Progress stack
 * │   │   ├── index.tsx        → Dashboard
 * │   │   └── history.tsx      → Reading history
 * │   ├── create/
 * │   │   ├── _layout.tsx      → Creator stack
 * │   │   ├── index.tsx        → Creator dashboard
 * │   │   ├── studio.tsx       → Storybook Studio
 * │   │   └── bounties.tsx     → Available bounties
 * │   └── profile/
 * │       ├── _layout.tsx      → Profile stack
 * │       ├── index.tsx        → Profile settings
 * │       ├── family.tsx       → Family management
 * │       └── subscription.tsx → Subscription management
 * └── reader/
 *     └── [id].tsx             → Full-screen storybook reader (modal)
 *
 * This structure ensures:
 * - Clean URL paths (/library, /arena/123, /reader/abc)
 * - Deep linking support (scholarly://book/abc → /reader/abc)
 * - Tab persistence (switching tabs preserves stack state)
 * - Modal presentation (reader slides up over tabs)
 */

export interface RouteDefinition {
  path: string;
  component: string;
  layout: string;
  requiresAuth: boolean;
  preloadData?: string[];
}

export const APP_ROUTES: RouteDefinition[] = [
  { path: '/', component: 'index', layout: 'root', requiresAuth: false },
  { path: '/auth/login', component: 'auth/login', layout: 'auth', requiresAuth: false },
  { path: '/auth/register', component: 'auth/register', layout: 'auth', requiresAuth: false },
  { path: '/auth/onboarding', component: 'auth/onboarding', layout: 'auth', requiresAuth: false },
  { path: '/library', component: 'tabs/library/index', layout: 'tabs', requiresAuth: true, preloadData: ['shelves', 'recommendations'] },
  { path: '/library/:id', component: 'tabs/library/[id]', layout: 'tabs', requiresAuth: true, preloadData: ['bookDetail'] },
  { path: '/library/search', component: 'tabs/library/search', layout: 'tabs', requiresAuth: true },
  { path: '/arena', component: 'tabs/arena/index', layout: 'tabs', requiresAuth: true, preloadData: ['activeCompetitions'] },
  { path: '/arena/:id', component: 'tabs/arena/[id]', layout: 'tabs', requiresAuth: true },
  { path: '/arena/teams', component: 'tabs/arena/teams', layout: 'tabs', requiresAuth: true },
  { path: '/progress', component: 'tabs/progress/index', layout: 'tabs', requiresAuth: true, preloadData: ['masterySnapshot', 'readingHistory'] },
  { path: '/progress/history', component: 'tabs/progress/history', layout: 'tabs', requiresAuth: true },
  { path: '/create', component: 'tabs/create/index', layout: 'tabs', requiresAuth: true },
  { path: '/create/studio', component: 'tabs/create/studio', layout: 'tabs', requiresAuth: true },
  { path: '/create/bounties', component: 'tabs/create/bounties', layout: 'tabs', requiresAuth: true },
  { path: '/profile', component: 'tabs/profile/index', layout: 'tabs', requiresAuth: true },
  { path: '/profile/family', component: 'tabs/profile/family', layout: 'tabs', requiresAuth: true },
  { path: '/profile/subscription', component: 'tabs/profile/subscription', layout: 'tabs', requiresAuth: true },
  { path: '/reader/:id', component: 'reader/[id]', layout: 'modal', requiresAuth: true, preloadData: ['bookContent', 'narrationAudio'] },
];

// =============================================================================
// SECTION 11: NATS EVENT INTEGRATION
// =============================================================================

/**
 * Events published by the mobile app shell to the platform event bus.
 * These flow through the API to NATS, enabling the backend to react
 * to mobile-originated events in real time.
 */

export const APP_SHELL_EVENTS = {
  /** Device registered or capabilities changed */
  DEVICE_REGISTERED: 'scholarly.mobile.device_registered',
  /** App opened (cold start or return from background) */
  APP_OPENED: 'scholarly.mobile.app_opened',
  /** App backgrounded */
  APP_BACKGROUNDED: 'scholarly.mobile.app_backgrounded',
  /** User authenticated */
  AUTH_COMPLETED: 'scholarly.mobile.auth_completed',
  /** Learner profile switched */
  PROFILE_SWITCHED: 'scholarly.mobile.profile_switched',
  /** Push notification received */
  NOTIFICATION_RECEIVED: 'scholarly.mobile.notification_received',
  /** Push notification opened */
  NOTIFICATION_OPENED: 'scholarly.mobile.notification_opened',
  /** Deep link resolved */
  DEEP_LINK_RESOLVED: 'scholarly.mobile.deep_link_resolved',
  /** Offline queue synced */
  SYNC_COMPLETED: 'scholarly.mobile.sync_completed',
  /** Subscription purchased */
  SUBSCRIPTION_PURCHASED: 'scholarly.mobile.subscription_purchased',
  /** Error boundary caught crash */
  APP_ERROR: 'scholarly.mobile.app_error',
} as const;

export interface DeviceRegisteredEvent {
  event: typeof APP_SHELL_EVENTS.DEVICE_REGISTERED;
  deviceId: string;
  platform: PlatformType;
  deviceClass: DeviceClass;
  osVersion: string;
  appVersion: string;
  capabilities: PlatformCapabilities;
  timestamp: number;
}

export interface AppOpenedEvent {
  event: typeof APP_SHELL_EVENTS.APP_OPENED;
  userId: string;
  learnerId: string;
  platform: PlatformType;
  coldStart: boolean;
  launchSource: 'icon' | 'notification' | 'deep_link' | 'background';
  deepLinkUrl: string | null;
  timestamp: number;
}

export interface SyncCompletedEvent {
  event: typeof APP_SHELL_EVENTS.SYNC_COMPLETED;
  userId: string;
  deviceId: string;
  sessionsUploaded: number;
  conflictsResolved: number;
  durationMs: number;
  timestamp: number;
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DEFAULT_STORE_CONFIG,
  DEFAULT_INIT_CONFIG,
  DEFAULT_THEME,
  DEFAULT_TAB_BAR,
  DEFAULT_FONTS,
  SERVICE_KEYS,
  APP_SHELL_EVENTS,
  DEEP_LINK_ROUTES,
  APP_ROUTES,
};
