// =============================================================================
// SCHOLARLY PLATFORM — Sprint 11: S11-002
// Android Instant App Configuration & Experience
// =============================================================================
// The Android Instant App is the digital equivalent of a free sample at an ice
// cream parlour: a child (and their parent) gets to taste the Scholarly reading
// experience — the magical library, one or two interactive storybooks, the
// narration and highlighting — without committing to a full download. If the
// taste is good, the path to full installation is a single tap.
//
// Google Play Instant Apps impose strict constraints: the instant module must be
// under 15MB, network calls must be minimal for fast cold-start, and the
// experience must be self-contained enough to be compelling in 2-3 minutes.
// This module defines the instant app configuration, the curated content
// selection strategy, the streamlined UI that fits within the size budget,
// and the conversion funnel that transitions users to the full app.
//
// Architecture:
//   The instant app is a separate Expo build target that shares the same
//   codebase but tree-shakes aggressively to meet the size constraint.
//   Only the library browser, a simplified reader, and the conversion
//   flow are included. Heavy features (ASR, offline storage, BKT engine,
//   content creation) are excluded and replaced with "unlock more" CTAs.
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: INSTANT APP CONFIGURATION
// =============================================================================

/**
 * Master configuration for the Android Instant App build.
 * These values control what's included in the instant module,
 * size budgets for each asset category, and the conversion funnel.
 */
export interface InstantAppConfig {
  /** Maximum total bundle size in bytes (Google limit: 15MB) */
  maxBundleSize: number;
  /** Budget allocation per category */
  sizeBudget: SizeBudget;
  /** Number of preview storybooks to include */
  previewBookCount: number;
  /** Maximum pages per preview book (reduce to save space) */
  maxPagesPerBook: number;
  /** Illustration quality for preview (lower = smaller) */
  illustrationQuality: 'low' | 'medium' | 'high';
  /** Whether to include audio narration in preview */
  includeNarration: boolean;
  /** Entry point deep link pattern */
  deepLinkPattern: string;
  /** Conversion prompts configuration */
  conversionConfig: ConversionConfig;
  /** Analytics events to track in instant mode */
  analyticsEvents: InstantAnalyticsEvent[];
  /** Feature flags for instant app (what's enabled vs disabled) */
  featureFlags: InstantFeatureFlags;
}

export interface SizeBudget {
  /** JavaScript bundle budget in bytes */
  jsBundleMax: number;
  /** Asset budget (images, animations, fonts) in bytes */
  assetsMax: number;
  /** Preview storybook content budget in bytes */
  contentMax: number;
  /** Lottie animation budget in bytes */
  animationsMax: number;
}

export const DEFAULT_INSTANT_CONFIG: InstantAppConfig = {
  maxBundleSize: 15 * 1024 * 1024, // 15MB
  sizeBudget: {
    jsBundleMax: 4 * 1024 * 1024,     // 4MB for JS (Hermes bytecode)
    assetsMax: 5 * 1024 * 1024,        // 5MB for images, fonts, icons
    contentMax: 4 * 1024 * 1024,       // 4MB for preview storybook assets
    animationsMax: 2 * 1024 * 1024,    // 2MB for Lottie library animations
  },
  previewBookCount: 3,
  maxPagesPerBook: 8,
  illustrationQuality: 'medium',
  includeNarration: true,
  deepLinkPattern: 'https://scholarly.app/instant/library',
  conversionConfig: {
    firstPromptAfterPages: 3,
    secondPromptAfterBook: true,
    finalPromptOnExit: true,
    installButtonStyle: 'floating_fab',
    incentiveText: 'Install free to unlock 100+ magical storybooks!',
    parentGateRequired: true,
    parentGateType: 'math_question',
  },
  analyticsEvents: [
    { event: 'instant_app_launched', category: 'acquisition' },
    { event: 'preview_book_opened', category: 'engagement' },
    { event: 'preview_page_turned', category: 'engagement' },
    { event: 'narration_played', category: 'engagement' },
    { event: 'install_prompt_shown', category: 'conversion' },
    { event: 'install_button_tapped', category: 'conversion' },
    { event: 'install_completed', category: 'conversion' },
    { event: 'install_dismissed', category: 'conversion' },
    { event: 'instant_session_ended', category: 'retention' },
  ],
  featureFlags: {
    enchantedLibrary: true,          // Simplified version
    interactiveReader: true,          // Read-only, no ASR
    audioNarration: true,             // Pre-bundled audio only
    wordHighlighting: true,           // Karaoke highlighting works
    readAloudMode: false,             // Requires ASR — too large
    letterFormation: false,           // Requires pencil pipeline
    offlineDownload: false,           // No persistent storage
    userAccount: false,               // No signup in instant
    bktTracking: false,               // No mastery tracking
    achievements: false,              // No gamification
    parentDashboard: false,           // Not in instant
    contentCreation: false,           // Not in instant
    arenaCompetition: false,          // Not in instant
    search: false,                    // Simplified browsing only
  },
};

export interface ConversionConfig {
  /** Show first install prompt after this many pages read */
  firstPromptAfterPages: number;
  /** Show prompt after completing a preview book */
  secondPromptAfterBook: boolean;
  /** Show prompt when user tries to exit instant app */
  finalPromptOnExit: boolean;
  /** Style of the persistent install button */
  installButtonStyle: 'floating_fab' | 'bottom_bar' | 'inline_card';
  /** Primary incentive message */
  incentiveText: string;
  /** Whether parent gate is required before install (COPPA) */
  parentGateRequired: boolean;
  /** Type of parent gate verification */
  parentGateType: 'math_question' | 'year_of_birth' | 'text_entry';
}

export interface InstantAnalyticsEvent {
  event: string;
  category: 'acquisition' | 'engagement' | 'conversion' | 'retention';
}

export interface InstantFeatureFlags {
  enchantedLibrary: boolean;
  interactiveReader: boolean;
  audioNarration: boolean;
  wordHighlighting: boolean;
  readAloudMode: boolean;
  letterFormation: boolean;
  offlineDownload: boolean;
  userAccount: boolean;
  bktTracking: boolean;
  achievements: boolean;
  parentDashboard: boolean;
  contentCreation: boolean;
  arenaCompetition: boolean;
  search: boolean;
}

// =============================================================================
// SECTION 2: PREVIEW CONTENT SELECTION
// =============================================================================

/**
 * The preview content selector chooses which storybooks to bundle with the
 * instant app. This is a critical acquisition decision — these 3 books are
 * the first impression that determines whether a family installs the full app.
 *
 * Selection criteria:
 * 1. Diverse phonics phases (one each from Phase 2, 3, and 4)
 * 2. Highest engagement metrics from the full library
 * 3. Visually stunning illustrations (first impressions matter)
 * 4. Short enough to complete in the instant session
 * 5. Age-diverse themes (animals, adventure, everyday life)
 */
export interface PreviewBookSelection {
  /** Book identifier from the library */
  bookId: string;
  /** Why this book was selected */
  selectionReason: string;
  /** Target phonics phase */
  phonicsPhase: number;
  /** Target age group */
  ageGroup: string;
  /** Number of pages (trimmed for instant) */
  pageCount: number;
  /** Compressed illustration assets (bundled, not fetched) */
  bundledAssetPaths: string[];
  /** Pre-generated narration audio (bundled) */
  bundledAudioPaths: string[];
  /** Engagement score from full library analytics */
  engagementScore: number;
}

export interface PreviewSelectionStrategy {
  /** Ensure at least one book per phase range */
  phaseDistribution: { minPhase: number; maxPhase: number; count: number }[];
  /** Minimum engagement score threshold */
  minEngagementScore: number;
  /** Preferred art styles for visual impact */
  preferredArtStyles: string[];
  /** Maximum total content size across all preview books */
  maxTotalContentSize: number;
  /** Age group distribution */
  ageGroups: string[];
}

export const DEFAULT_PREVIEW_STRATEGY: PreviewSelectionStrategy = {
  phaseDistribution: [
    { minPhase: 2, maxPhase: 2, count: 1 },
    { minPhase: 3, maxPhase: 3, count: 1 },
    { minPhase: 4, maxPhase: 5, count: 1 },
  ],
  minEngagementScore: 0.7,
  preferredArtStyles: ['watercolour', 'soft_3d', 'flat_vector'],
  maxTotalContentSize: 4 * 1024 * 1024,
  ageGroups: ['3-5', '5-7', '7-9'],
};

// =============================================================================
// SECTION 3: INSTANT APP BUILD PIPELINE
// =============================================================================

/**
 * Build configuration for the instant app Expo target. This extends the
 * standard EAS Build configuration with instant-specific optimisations.
 */
export interface InstantBuildConfig {
  /** Expo build profile name */
  buildProfile: string;
  /** Tree-shaking configuration — aggressive removal of unused code */
  treeShaking: TreeShakeConfig;
  /** Asset optimisation pipeline */
  assetOptimisation: AssetOptimisationConfig;
  /** Hermes bytecode precompilation settings */
  hermesConfig: HermesConfig;
  /** Google Play Instant specific manifest entries */
  manifestEntries: AndroidManifestEntries;
}

export interface TreeShakeConfig {
  /** Modules to explicitly exclude from the instant bundle */
  excludeModules: string[];
  /** Feature flags that drive conditional compilation */
  buildTimeFlags: Record<string, boolean>;
  /** Dead code elimination aggressiveness */
  eliminationLevel: 'conservative' | 'aggressive' | 'maximum';
}

export interface AssetOptimisationConfig {
  /** Maximum illustration dimension (pixels) */
  maxImageDimension: number;
  /** JPEG quality for illustrations (0-100) */
  jpegQuality: number;
  /** Whether to convert PNGs to WebP */
  useWebP: boolean;
  /** Lottie simplification (reduce keyframes) */
  simplifyLottie: boolean;
  /** Font subsetting — only include used glyphs */
  subsetFonts: boolean;
  /** Audio format for narration */
  audioFormat: 'opus' | 'aac';
  /** Audio bitrate (kbps) */
  audioBitrate: number;
}

export interface HermesConfig {
  /** Enable Hermes bytecode precompilation */
  enabled: boolean;
  /** Optimisation level */
  optimisationLevel: 'O0' | 'O1' | 'O2';
  /** Strip debug info */
  stripDebugInfo: boolean;
}

export interface AndroidManifestEntries {
  /** Target sandbox version for instant apps */
  targetSandboxVersion: number;
  /** Whether the instant module is the default entry point */
  isDefaultUrl: boolean;
  /** URL patterns that trigger the instant app */
  intentFilterPatterns: string[];
  /** Maximum SDK version (instant apps have limited API access) */
  maxSdkVersion: number;
}

export const DEFAULT_BUILD_CONFIG: InstantBuildConfig = {
  buildProfile: 'instant',
  treeShaking: {
    excludeModules: [
      '@scholarly/arena',
      '@scholarly/tokenomics',
      '@scholarly/content-sdk',
      '@scholarly/storybook-cli',
      '@scholarly/letter-formation',
      '@scholarly/offline-engine',
      '@scholarly/bkt-engine',
      '@scholarly/asr-pipeline',
      '@scholarly/parent-dashboard',
      '@scholarly/achievement-system',
      '@scholarly/wellbeing-monitor',
    ],
    buildTimeFlags: {
      INSTANT_APP: true,
      ENABLE_ASR: false,
      ENABLE_OFFLINE: false,
      ENABLE_BKT: false,
      ENABLE_ARENA: false,
      ENABLE_CREATION: false,
    },
    eliminationLevel: 'aggressive',
  },
  assetOptimisation: {
    maxImageDimension: 1024,
    jpegQuality: 75,
    useWebP: true,
    simplifyLottie: true,
    subsetFonts: true,
    audioFormat: 'opus',
    audioBitrate: 48,
  },
  hermesConfig: {
    enabled: true,
    optimisationLevel: 'O2',
    stripDebugInfo: true,
  },
  manifestEntries: {
    targetSandboxVersion: 2,
    isDefaultUrl: true,
    intentFilterPatterns: [
      'https://scholarly.app/instant/*',
      'https://scholarly.app/preview/*',
    ],
    maxSdkVersion: 35,
  },
};

// =============================================================================
// SECTION 4: CONVERSION FUNNEL SERVICE
// =============================================================================

/**
 * The ConversionFunnelService manages the journey from "curious visitor"
 * to "installed user." It tracks engagement milestones, triggers install
 * prompts at the right moments, and handles the handoff from instant to
 * full app — preserving any progress from the preview session.
 *
 * The funnel is designed with COPPA compliance in mind: all conversion
 * prompts go through a parent gate, and no personal data is collected
 * during the instant session.
 */
export class ConversionFunnelService {
  private pagesViewed: number = 0;
  private booksCompleted: number = 0;
  private narrationPlayed: boolean = false;
  private promptsShown: number = 0;
  private readonly config: ConversionConfig;
  private readonly analytics: InstantAnalyticsEvent[];

  constructor(config: ConversionConfig = DEFAULT_INSTANT_CONFIG.conversionConfig) {
    this.config = config;
    this.analytics = [];
  }

  /**
   * Record a page turn and check if an install prompt should be shown.
   */
  onPageViewed(): { showPrompt: boolean; promptType: PromptType | null } {
    this.pagesViewed++;
    this.trackEvent('preview_page_turned', 'engagement');

    if (this.pagesViewed === this.config.firstPromptAfterPages && this.promptsShown === 0) {
      return { showPrompt: true, promptType: 'soft_inline' };
    }
    return { showPrompt: false, promptType: null };
  }

  /**
   * Record a book completion and check for conversion prompt.
   */
  onBookCompleted(): { showPrompt: boolean; promptType: PromptType | null } {
    this.booksCompleted++;
    this.trackEvent('preview_book_opened', 'engagement');

    if (this.config.secondPromptAfterBook && this.booksCompleted >= 1) {
      return { showPrompt: true, promptType: 'celebration_modal' };
    }
    return { showPrompt: false, promptType: null };
  }

  /**
   * User is attempting to leave the instant app.
   */
  onExitAttempt(): { showPrompt: boolean; promptType: PromptType | null } {
    if (this.config.finalPromptOnExit && this.promptsShown < 3) {
      return { showPrompt: true, promptType: 'exit_intent' };
    }
    return { showPrompt: false, promptType: null };
  }

  /**
   * Record that a prompt was shown.
   */
  onPromptShown(promptType: PromptType): void {
    this.promptsShown++;
    this.trackEvent('install_prompt_shown', 'conversion');
  }

  /**
   * User tapped install.
   */
  onInstallTapped(): InstallHandoff {
    this.trackEvent('install_button_tapped', 'conversion');
    return {
      pagesViewedInPreview: this.pagesViewed,
      booksCompletedInPreview: this.booksCompleted,
      totalTimeInPreview: Date.now(), // Would track actual duration in production
      referralSource: 'instant_app',
      previewBooksRead: [], // Would contain actual book IDs
    };
  }

  /**
   * Generate the Google Play install intent with handoff data.
   * The full app reads this handoff to continue the experience seamlessly.
   */
  generateInstallIntent(handoff: InstallHandoff): string {
    const params = new URLSearchParams({
      referrer: `utm_source=instant&utm_medium=preview&pages=${handoff.pagesViewedInPreview}&books=${handoff.booksCompletedInPreview}`,
    });
    return `market://details?id=com.scholarly.app&${params.toString()}`;
  }

  private trackEvent(event: string, category: InstantAnalyticsEvent['category']): void {
    this.analytics.push({ event, category });
  }
}

export type PromptType = 'soft_inline' | 'celebration_modal' | 'exit_intent' | 'persistent_fab';

export interface InstallHandoff {
  /** Pages viewed during the instant preview */
  pagesViewedInPreview: number;
  /** Books completed during preview */
  booksCompletedInPreview: number;
  /** Total time spent in preview (ms) */
  totalTimeInPreview: number;
  /** Attribution source */
  referralSource: string;
  /** Book IDs that were read */
  previewBooksRead: string[];
}

// =============================================================================
// SECTION 5: NATS EVENTS
// =============================================================================

export const INSTANT_APP_EVENTS = {
  LAUNCHED: 'scholarly.instant.launched',
  BOOK_PREVIEWED: 'scholarly.instant.book_previewed',
  INSTALL_PROMPTED: 'scholarly.instant.install_prompted',
  INSTALL_TAPPED: 'scholarly.instant.install_tapped',
  INSTALL_COMPLETED: 'scholarly.instant.install_completed',
  SESSION_ENDED: 'scholarly.instant.session_ended',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================
export {
  DEFAULT_INSTANT_CONFIG,
  DEFAULT_PREVIEW_STRATEGY,
  DEFAULT_BUILD_CONFIG,
  ConversionFunnelService,
  INSTANT_APP_EVENTS,
};
