/**
 * =============================================================================
 * SCHOLARLY PLATFORM — App Store Configuration & IAP Wiring
 * Sprint 5, PW-009 | ~600 lines
 * =============================================================================
 */

// =============================================================================
// IAP PRODUCT DEFINITIONS
// =============================================================================

interface IAPProduct {
  id: string;
  platform: 'ios' | 'android' | 'web';
  type: 'subscription';
  tier: 'explorer' | 'scholar' | 'academy';
  priceUsd: number;
  periodMonths: number;
  trialDays: number;
  features: string[];
  limits: Record<string, number>;
}

const TIER_FEATURES = {
  explorer: {
    features: [
      'Full Enchanted Library access',
      'Personalised book recommendations',
      'Read-along with word highlighting',
      'Progress tracking & parent dashboard',
      'Offline reading (up to 10 books)',
    ],
    limits: { offlineBooks: 10, monthlyAIStories: 5, familyMembers: 2, arenaCompetitions: 1, learners: 2 },
  },
  scholar: {
    features: [
      'Everything in Explorer',
      'Unlimited AI story generation',
      'Read-aloud with speech recognition',
      'BKT mastery tracking',
      'Arena competitions (unlimited)',
      'Offline reading (up to 50 books)',
    ],
    limits: { offlineBooks: 50, monthlyAIStories: -1, familyMembers: 5, arenaCompetitions: -1, learners: 5 },
  },
  academy: {
    features: [
      'Everything in Scholar',
      'Content creation tools & Storybook Studio',
      'Class management & gradebook integration',
      'Curriculum mapping',
      'Up to 35 learners per class',
    ],
    limits: { offlineBooks: -1, monthlyAIStories: -1, familyMembers: -1, arenaCompetitions: -1, learners: 35 },
  },
};

const PRICING: Record<string, Record<string, { price: number; trial: number }>> = {
  explorer: { ios: { price: 4.99, trial: 7 }, android: { price: 4.99, trial: 7 }, web: { price: 3.99, trial: 7 } },
  scholar:  { ios: { price: 9.99, trial: 7 }, android: { price: 9.99, trial: 7 }, web: { price: 7.99, trial: 7 } },
  academy:  { ios: { price: 19.99, trial: 14 }, android: { price: 19.99, trial: 14 }, web: { price: 14.99, trial: 14 } },
};

export function generateIAPProducts(): IAPProduct[] {
  const products: IAPProduct[] = [];
  const platforms: Array<'ios' | 'android' | 'web'> = ['ios', 'android', 'web'];
  const tiers: Array<'explorer' | 'scholar' | 'academy'> = ['explorer', 'scholar', 'academy'];
  const idSeparator = { ios: '.', android: '_', web: '-' };

  for (const tier of tiers) {
    for (const platform of platforms) {
      products.push({
        id: `scholarly${idSeparator[platform]}${tier}${idSeparator[platform]}monthly`,
        platform,
        type: 'subscription',
        tier,
        priceUsd: PRICING[tier][platform].price,
        periodMonths: 1,
        trialDays: PRICING[tier][platform].trial,
        features: TIER_FEATURES[tier].features,
        limits: TIER_FEATURES[tier].limits,
      });
    }
  }
  return products;
}

// =============================================================================
// APP STORE METADATA
// =============================================================================

interface AppStoreMetadata {
  platform: string;
  bundleId: string;
  name: string;
  subtitle: string;
  description: string;
  keywords: string[];
  category: string;
  subcategory: string;
  rating: string;
  primaryLanguage: string;
  supportedLanguages: string[];
  privacyUrl: string;
  supportUrl: string;
  marketingUrl: string;
  coppaCompliant: boolean;
  ageRating: string;
}

export const APP_METADATA: Record<string, AppStoreMetadata> = {
  ios: {
    platform: 'ios',
    bundleId: 'com.scholarly.phonics',
    name: 'Scholarly Phonics',
    subtitle: 'Learn to Read with AI Storybooks',
    description: `Scholarly Phonics transforms how children learn to read with a magical, AI-powered Enchanted Library that grows with every learner.

Every storybook is curriculum-aligned, targeting specific grapheme-phoneme correspondences and validated for decodability against your child's reading level. The Bayesian Knowledge Tracing engine adapts in real time, ensuring your child always has the right book at the right moment.

FEATURES:
• Enchanted Library with 100+ decodable storybooks across 6 phonics phases
• AI-generated stories personalised to your child's interests and reading level
• Read-along mode with karaoke-style word highlighting
• Read-aloud mode with speech recognition for pronunciation practice
• Adaptive difficulty powered by Bayesian Knowledge Tracing
• Arena competitive reading platform for classrooms and families
• Offline reading — download books for on-the-go learning
• Parent dashboard with reading progress, fluency trends, and recommendations
• Teacher tools for classroom management and curriculum mapping

PHONICS APPROACH:
Built on Systematic Synthetic Phonics (SSP) aligned with Letters and Sounds phases, EYFS, EYLF, and IB PYP frameworks. Every word in every story is validated against your child's taught grapheme-phoneme set.

PRIVACY & SAFETY:
COPPA compliant. No advertising. No data shared with third parties. Parental consent required for all child accounts.`,
    keywords: [
      'phonics', 'reading', 'learn to read', 'decodable books', 'children stories',
      'storybooks', 'education', 'literacy', 'early reading', 'SSP', 'phonics phases',
      'AI storybooks', 'reading practice', 'word recognition', 'dyslexia friendly',
    ],
    category: 'Education',
    subcategory: 'Reading & Writing',
    rating: '4+',
    primaryLanguage: 'en-AU',
    supportedLanguages: ['en-AU', 'en-GB', 'en-US', 'en-NZ', 'en-ZA', 'en-IE'],
    privacyUrl: 'https://scholarly.app/privacy',
    supportUrl: 'https://scholarly.app/support',
    marketingUrl: 'https://scholarly.app',
    coppaCompliant: true,
    ageRating: '4+',
  },
  android: {
    platform: 'android',
    bundleId: 'app.scholarly.phonics',
    name: 'Scholarly Phonics',
    subtitle: 'Learn to Read with AI Storybooks',
    description: `Scholarly Phonics transforms how children learn to read with a magical, AI-powered Enchanted Library. Every storybook targets specific phonics skills and adapts to your child's reading level in real time.

Highlights:
★ 100+ curriculum-aligned decodable storybooks
★ AI-generated stories matched to your child's interests
★ Read-along with karaoke word highlighting
★ Speech recognition for read-aloud practice
★ Arena competitive reading for classrooms
★ Offline reading support
★ Parent & teacher dashboards
★ COPPA compliant — no ads, no third-party data sharing`,
    keywords: [
      'phonics', 'reading', 'decodable', 'storybooks', 'education',
      'literacy', 'children', 'learn to read', 'AI', 'phonics phases',
    ],
    category: 'Education',
    subcategory: 'Education',
    rating: 'Everyone',
    primaryLanguage: 'en-AU',
    supportedLanguages: ['en-AU', 'en-GB', 'en-US', 'en-NZ', 'en-ZA'],
    privacyUrl: 'https://scholarly.app/privacy',
    supportUrl: 'https://scholarly.app/support',
    marketingUrl: 'https://scholarly.app',
    coppaCompliant: true,
    ageRating: 'Everyone',
  },
};

// =============================================================================
// COPPA COMPLIANCE CONFIGURATION
// =============================================================================

export const COPPA_CONFIG = {
  /** Parental consent is required before any data collection */
  parentalConsentRequired: true,

  /** Consent methods supported (FTC-approved) */
  consentMethods: [
    'verifiable_email',       // Email plus follow-up confirmation
    'credit_card_verification', // Small charge verification
    'government_id',          // ID verification via third party
    'video_consent',          // Video call consent (high security)
  ],

  /** Data collection policies */
  dataCollection: {
    /** What we collect */
    collected: [
      { type: 'reading_performance', purpose: 'Adaptive difficulty and mastery tracking', retention: '3_years' },
      { type: 'audio_recordings', purpose: 'Real-time speech recognition (processed, not stored)', retention: 'session_only' },
      { type: 'device_identifiers', purpose: 'Cross-device sync and offline support', retention: 'account_lifetime' },
      { type: 'usage_analytics', purpose: 'Reading time, book completions, engagement metrics', retention: '3_years' },
    ],
    /** What we explicitly do NOT collect */
    notCollected: [
      'location_data',
      'contact_lists',
      'photos_or_videos',
      'browsing_history',
      'biometric_data',
      'advertising_identifiers',
    ],
  },

  /** Third-party services that process child data */
  thirdPartyProcessors: [
    { name: 'ElevenLabs', purpose: 'Audio narration generation (no child data sent)', childDataAccess: false },
    { name: 'Anthropic', purpose: 'Story generation (no child data sent)', childDataAccess: false },
    { name: 'OpenAI', purpose: 'Illustration generation (no child data sent)', childDataAccess: false },
  ],

  /** Child safety rules */
  childSafety: {
    noAdvertising: true,
    noSocialFeatures: true,      // Children cannot message each other
    noExternalLinks: true,       // No links that leave the app
    noInAppPurchaseByChild: true, // Only parents can purchase
    contentModeration: true,     // All AI content passes safety pipeline
    parentalControls: {
      readingTimeLimit: true,
      contentFiltering: true,
      progressVisibility: true,
      dataExportRequest: true,
      accountDeletion: true,
    },
  },

  /** Apple Kids Category requirements */
  appleKidsCategory: {
    noThirdPartyAds: true,
    noAnalyticsWithoutConsent: true,
    noSocialLoginRequired: true,
    parentGateForPurchases: true,
    parentGateForExternalLinks: true,
    ageGateOnLaunch: false, // Not needed since we require parent setup
  },

  /** Google Designed for Families requirements */
  googleDesignedForFamilies: {
    noMatureContent: true,
    noDeceptiveAds: true,
    adsComplianceWithCOPPA: true, // N/A — no ads
    privacyPolicyAccessible: true,
    teacherApprovedEligible: true,
  },
};

// =============================================================================
// PWA MANIFEST & SERVICE WORKER CONFIG
// =============================================================================

export const PWA_MANIFEST = {
  name: 'Scholarly Phonics',
  short_name: 'Scholarly',
  description: 'Learn to read with AI-powered decodable storybooks',
  start_url: '/',
  display: 'standalone',
  orientation: 'portrait-primary',
  background_color: '#FFF8F0',
  theme_color: '#4CAF50',
  categories: ['education', 'kids'],
  lang: 'en',
  dir: 'ltr',
  icons: [
    { src: '/icons/icon-72.png', sizes: '72x72', type: 'image/png' },
    { src: '/icons/icon-96.png', sizes: '96x96', type: 'image/png' },
    { src: '/icons/icon-128.png', sizes: '128x128', type: 'image/png' },
    { src: '/icons/icon-144.png', sizes: '144x144', type: 'image/png' },
    { src: '/icons/icon-152.png', sizes: '152x152', type: 'image/png' },
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '/icons/icon-384.png', sizes: '384x384', type: 'image/png' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '/icons/icon-maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
  screenshots: [
    { src: '/screenshots/library.png', sizes: '1170x2532', type: 'image/png', label: 'Enchanted Library' },
    { src: '/screenshots/reader.png', sizes: '1170x2532', type: 'image/png', label: 'Interactive Reader' },
    { src: '/screenshots/dashboard.png', sizes: '1170x2532', type: 'image/png', label: 'Parent Dashboard' },
  ],
};

export const SERVICE_WORKER_CONFIG = {
  /** Cache strategies for different asset types */
  cacheStrategies: {
    'reader-ui': { strategy: 'cache-first', maxAge: 7 * 24 * 60 * 60 }, // 7 days
    'storybook-assets': { strategy: 'cache-first', maxAge: 30 * 24 * 60 * 60 }, // 30 days
    'illustrations': { strategy: 'cache-first', maxAge: 90 * 24 * 60 * 60 }, // 90 days
    'audio-narration': { strategy: 'cache-first', maxAge: 90 * 24 * 60 * 60 },
    'api-responses': { strategy: 'network-first', maxAge: 5 * 60 }, // 5 minutes
    'bkt-engine': { strategy: 'cache-first', maxAge: 30 * 24 * 60 * 60 }, // WASM module
  },

  /** Precache manifest: critical assets cached on install */
  precache: [
    '/',
    '/library',
    '/reader',
    '/offline.html',
    '/js/bkt-engine.wasm',
    '/js/app.js',
    '/css/app.css',
  ],

  /** Background sync for offline reading data */
  backgroundSync: {
    tag: 'scholarly-reading-sync',
    maxRetentionTime: 24 * 60, // 24 hours in minutes
    events: [
      'reading-completion',
      'bkt-mastery-update',
      'reading-position-sync',
      'favourite-toggle',
    ],
  },
};

// =============================================================================
// EXPO APP CONFIG GENERATOR
// =============================================================================

export function generateExpoConfig(environment: 'development' | 'staging' | 'production') {
  const envConfig = {
    development: { apiUrl: 'http://localhost:3000', scheme: 'scholarly-dev' },
    staging: { apiUrl: 'https://staging-api.scholarly.app', scheme: 'scholarly-staging' },
    production: { apiUrl: 'https://api.scholarly.app', scheme: 'scholarly' },
  };

  const env = envConfig[environment];

  return {
    expo: {
      name: 'Scholarly Phonics',
      slug: 'scholarly-phonics',
      version: '1.0.0',
      orientation: 'portrait',
      icon: './assets/icon.png',
      splash: {
        image: './assets/splash.png',
        resizeMode: 'contain',
        backgroundColor: '#FFF8F0',
      },
      scheme: env.scheme,
      updates: {
        fallbackToCacheTimeout: 0,
        url: 'https://u.expo.dev/scholarly-phonics',
      },
      runtimeVersion: { policy: 'appVersion' },
      ios: {
        bundleIdentifier: 'com.scholarly.phonics',
        buildNumber: '1',
        supportsTablet: true,
        config: {
          usesNonExemptEncryption: false,
        },
        infoPlist: {
          NSMicrophoneUsageDescription: 'Scholarly needs microphone access for read-aloud practice with speech recognition.',
          ITSAppUsesNonExemptEncryption: false,
        },
        entitlements: {
          'com.apple.developer.applesignin': ['Default'],
        },
      },
      android: {
        package: 'app.scholarly.phonics',
        versionCode: 1,
        adaptiveIcon: {
          foregroundImage: './assets/adaptive-icon.png',
          backgroundColor: '#FFF8F0',
        },
        permissions: [
          'android.permission.RECORD_AUDIO',
          'android.permission.INTERNET',
          'android.permission.ACCESS_NETWORK_STATE',
        ],
      },
      web: {
        bundler: 'metro',
        favicon: './assets/favicon.png',
        output: 'single',
      },
      plugins: [
        'expo-router',
        ['expo-av', { microphonePermission: 'Allow Scholarly to access your microphone for read-aloud practice.' }],
        'expo-notifications',
        'expo-file-system',
        'expo-sqlite',
      ],
      extra: {
        apiUrl: env.apiUrl,
        eas: { projectId: 'scholarly-phonics-eas' },
      },
    },
  };
}
