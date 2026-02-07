// =============================================================================
// SCHOLARLY PLATFORM — React Native UI & App Store Preparation
// Sprint 4 | XP-004 + XP-005 | rn-ui-appstore.ts
// =============================================================================
// XP-004: React Native JSX component logic consuming the state machines
//   from Sprint 3 (cross-platform-core.ts, interactive-reader.ts).
//   Enchanted Library bookshelf rendering, Interactive Reader with word
//   highlighting, and Settings screens.
//
// XP-005: App Store submission preparation — app icons, screenshots,
//   privacy policies, COPPA compliance, StoreKit 2 and Google Play
//   Billing integration scaffolding.
//
// These components are the "skin" over Sprint 3's "skeleton" — they
// consume the pure state machines and present them as interactive UI.
//
// =============================================================================

// =============================================================================
// Section 1: Enchanted Library UI Components (XP-004)
// =============================================================================

/**
 * The Enchanted Library is where books become living portals.
 * These types define the visual state that the rendering layer
 * needs to bring the magical bookshelf to life.
 */

/** Visual state for a book on the shelf */
export interface BookShelfItem {
  id: string;
  title: string;
  coverUrl: string;
  phonicsPhase: number;
  readProgress: number;          // 0-1
  isNew: boolean;
  isDownloaded: boolean;
  glowColor: string;            // Phase-specific glow colour
  spine: {
    width: number;
    color: string;
    textColor: string;
  };
  animation: BookAnimation;
}

export enum BookAnimation {
  IDLE = 'IDLE',                 // Gentle pulse
  HOVER = 'HOVER',              // Slight lift
  OPENING = 'OPENING',          // Book opens wide
  SLIDING_IN = 'SLIDING_IN',    // New book slides onto shelf
  SPARKLE = 'SPARKLE',          // Just completed
}

/** Floating letter configuration for the Enchanted Library */
export interface FloatingLetter {
  grapheme: string;
  position: { x: number; y: number; z: number };
  velocity: { dx: number; dy: number };
  size: number;
  opacity: number;
  color: string;
  rotation: number;
  phase: number;                 // Which phonics phase this letter belongs to
}

/** Shelf configuration for the library view */
export interface LibraryShelf {
  id: string;
  name: string;
  icon: string;
  books: BookShelfItem[];
  backgroundColor: string;
  isLocked: boolean;
  unlockRequirement?: string;
  position: number;             // Vertical position index
}

/** Phase-specific visual themes for the library rooms */
export const PHASE_THEMES: Record<number, {
  roomName: string;
  backgroundColor: string;
  shelfColor: string;
  glowColor: string;
  floatingLetterColors: string[];
  ambientAnimation: string;
}> = {
  1: {
    roomName: 'The Letter Garden',
    backgroundColor: '#FFF8E7',
    shelfColor: '#D4A574',
    glowColor: '#FFD700',
    floatingLetterColors: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    ambientAnimation: 'butterflies',
  },
  2: {
    roomName: 'The Word Workshop',
    backgroundColor: '#F0F8FF',
    shelfColor: '#8B7355',
    glowColor: '#7EC8E3',
    floatingLetterColors: ['#6C63FF', '#FF6584', '#43A047', '#FF9800'],
    ambientAnimation: 'fireflies',
  },
  3: {
    roomName: 'The Story Cave',
    backgroundColor: '#F5F0FF',
    shelfColor: '#6B4C3B',
    glowColor: '#B388FF',
    floatingLetterColors: ['#E040FB', '#00BCD4', '#FF5722', '#8BC34A'],
    ambientAnimation: 'stars',
  },
  4: {
    roomName: 'The Adventure Tower',
    backgroundColor: '#FFF3E0',
    shelfColor: '#5D4037',
    glowColor: '#FF8A65',
    floatingLetterColors: ['#FF7043', '#26A69A', '#7E57C2', '#FFB300'],
    ambientAnimation: 'clouds',
  },
  5: {
    roomName: 'The Knowledge Keep',
    backgroundColor: '#E8F5E9',
    shelfColor: '#4E342E',
    glowColor: '#66BB6A',
    floatingLetterColors: ['#42A5F5', '#EC407A', '#AB47BC', '#FFA726'],
    ambientAnimation: 'aurora',
  },
  6: {
    roomName: 'The Master Library',
    backgroundColor: '#ECEFF1',
    shelfColor: '#37474F',
    glowColor: '#78909C',
    floatingLetterColors: ['#5C6BC0', '#EF5350', '#26C6DA', '#9CCC65'],
    ambientAnimation: 'constellations',
  },
};

// ── Enchanted Library Component Props ────────────────────────────

export interface EnchantedLibraryProps {
  shelves: LibraryShelf[];
  floatingLetters: FloatingLetter[];
  currentPhase: number;
  onBookSelect: (bookId: string) => void;
  onShelfScroll: (shelfId: string) => void;
  onLetterTap: (grapheme: string) => void;
  isLoading: boolean;
}

export interface BookCardProps {
  book: BookShelfItem;
  onPress: () => void;
  onLongPress: () => void;
  size: 'small' | 'medium' | 'large';
}

export interface ShelfRowProps {
  shelf: LibraryShelf;
  onBookSelect: (bookId: string) => void;
  scrollEnabled: boolean;
}

// =============================================================================
// Section 2: Interactive Reader UI Components (XP-004)
// =============================================================================

/** Props for the Interactive Reader component */
export interface InteractiveReaderProps {
  bookData: ReaderBookData;
  mode: 'listen' | 'read_aloud';
  audioSyncData: AudioSyncData;
  onPageChange: (pageIndex: number) => void;
  onModeSwitch: (mode: 'listen' | 'read_aloud') => void;
  onReadAloudComplete: (assessment: ReadAloudResult) => void;
  onClose: () => void;
  settings: ReaderDisplaySettings;
}

export interface ReaderBookData {
  id: string;
  title: string;
  pages: ReaderPageData[];
  totalPages: number;
}

export interface ReaderPageData {
  pageNumber: number;
  text: string;
  words: WordSegment[];
  illustrationUrl: string;
  illustrationAltText: string;
  layout: string;
}

export interface WordSegment {
  id: string;
  word: string;
  startIndex: number;
  endIndex: number;
  isTargetGPC: boolean;
  graphemes: string[];
}

export interface AudioSyncData {
  audioUrl: string;
  wordTimestamps: Array<{
    wordId: string;
    startMs: number;
    endMs: number;
  }>;
  totalDurationMs: number;
}

export interface ReadAloudResult {
  accuracy: number;
  wcpm: number;
  errors: Array<{
    expected: string;
    actual: string;
    type: 'substitution' | 'omission' | 'insertion' | 'mispronunciation';
    wordId: string;
  }>;
  gpcAccuracy: Record<string, number>;
  completionTime: number;
}

export interface ReaderDisplaySettings {
  fontFamily: string;
  fontSize: number;
  lineSpacing: number;
  textColor: string;
  backgroundColor: string;
  highlightColor: string;
  highlightActiveWord: boolean;
  showGPCColors: boolean;
  dyslexiaFriendly: boolean;
  pageTransition: 'slide' | 'fade' | 'flip';
  autoPageTurn: boolean;
}

/** Default reader settings with dyslexia-friendly options */
export const DEFAULT_READER_SETTINGS: ReaderDisplaySettings = {
  fontFamily: 'OpenDyslexic',
  fontSize: 28,
  lineSpacing: 2.0,
  textColor: '#333333',
  backgroundColor: '#FDF6E3',       // Warm cream (easier on eyes than pure white)
  highlightColor: '#FFE082',         // Soft gold highlight
  highlightActiveWord: true,
  showGPCColors: false,
  dyslexiaFriendly: true,
  pageTransition: 'slide',
  autoPageTurn: false,
};

// ── Word Highlighting State ─────────────────────────────────────

/** State for the karaoke-style word highlighting engine */
export interface WordHighlightState {
  currentWordIndex: number;
  highlightedWordIds: Set<string>;
  isPlaying: boolean;
  currentTimeMs: number;
  sentenceBoundaries: number[];      // Word indices that start new sentences
}

/**
 * Compute which word should be highlighted based on current playback time.
 * Uses binary search over the sorted timestamp array for O(log n) lookup.
 */
export function computeActiveWord(
  timestamps: AudioSyncData['wordTimestamps'],
  currentTimeMs: number
): { activeIndex: number; activeWordId: string | null } {
  if (timestamps.length === 0 || currentTimeMs < 0) {
    return { activeIndex: -1, activeWordId: null };
  }

  // Binary search for the word that contains currentTimeMs
  let low = 0;
  let high = timestamps.length - 1;
  let result = -1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const ts = timestamps[mid];

    if (currentTimeMs >= ts.startMs && currentTimeMs <= ts.endMs) {
      result = mid;
      break;
    } else if (currentTimeMs < ts.startMs) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  // If between words, highlight the next upcoming word
  if (result === -1 && low < timestamps.length) {
    result = low;
  }

  return {
    activeIndex: result,
    activeWordId: result >= 0 ? timestamps[result].wordId : null,
  };
}

/**
 * Compute the set of words to highlight for "sentence context" mode.
 * Highlights all words in the current sentence, with the active word
 * having a stronger highlight.
 */
export function computeSentenceHighlight(
  words: WordSegment[],
  activeIndex: number,
  sentenceBoundaries: number[]
): { sentenceStart: number; sentenceEnd: number; wordIds: string[] } {
  if (activeIndex < 0 || activeIndex >= words.length) {
    return { sentenceStart: 0, sentenceEnd: 0, wordIds: [] };
  }

  // Find which sentence contains the active word
  let sentenceStart = 0;
  let sentenceEnd = words.length - 1;

  for (let i = 0; i < sentenceBoundaries.length; i++) {
    if (sentenceBoundaries[i] <= activeIndex) {
      sentenceStart = sentenceBoundaries[i];
    }
    if (sentenceBoundaries[i] > activeIndex) {
      sentenceEnd = sentenceBoundaries[i] - 1;
      break;
    }
  }

  const wordIds = words.slice(sentenceStart, sentenceEnd + 1).map(w => w.id);
  return { sentenceStart, sentenceEnd, wordIds };
}

// =============================================================================
// Section 3: Settings Screen Configuration (XP-004)
// =============================================================================

export interface SettingsSection {
  id: string;
  title: string;
  icon: string;
  items: SettingsItem[];
}

export type SettingsItem =
  | { type: 'toggle'; key: string; label: string; description: string; value: boolean }
  | { type: 'slider'; key: string; label: string; description: string; value: number; min: number; max: number; step: number }
  | { type: 'select'; key: string; label: string; description: string; value: string; options: Array<{ label: string; value: string }> }
  | { type: 'action'; key: string; label: string; description: string; destructive: boolean }
  | { type: 'info'; key: string; label: string; value: string };

export const SETTINGS_SECTIONS: SettingsSection[] = [
  {
    id: 'reading', title: 'Reading', icon: '📖',
    items: [
      { type: 'toggle', key: 'dyslexiaFriendly', label: 'Dyslexia-Friendly Mode', description: 'Uses OpenDyslexic font and warm background', value: true },
      { type: 'slider', key: 'fontSize', label: 'Text Size', description: 'Adjust reading text size', value: 28, min: 16, max: 48, step: 2 },
      { type: 'slider', key: 'lineSpacing', label: 'Line Spacing', description: 'Adjust space between lines', value: 2.0, min: 1.2, max: 3.0, step: 0.2 },
      { type: 'toggle', key: 'highlightActiveWord', label: 'Word Highlighting', description: 'Highlight words during narration', value: true },
      { type: 'toggle', key: 'showGPCColors', label: 'GPC Colour Coding', description: 'Colour-code grapheme-phoneme patterns', value: false },
      { type: 'select', key: 'pageTransition', label: 'Page Animation', description: 'How pages transition', value: 'slide', options: [
        { label: 'Slide', value: 'slide' }, { label: 'Fade', value: 'fade' }, { label: 'Flip', value: 'flip' },
      ]},
      { type: 'toggle', key: 'autoPageTurn', label: 'Auto Page Turn', description: 'Automatically turn pages during narration', value: false },
    ],
  },
  {
    id: 'audio', title: 'Audio', icon: '🔊',
    items: [
      { type: 'slider', key: 'narrationVolume', label: 'Narration Volume', description: 'Adjust narrator volume', value: 0.8, min: 0, max: 1, step: 0.1 },
      { type: 'slider', key: 'sfxVolume', label: 'Sound Effects', description: 'Adjust UI sound effects', value: 0.5, min: 0, max: 1, step: 0.1 },
      { type: 'toggle', key: 'readAloudFeedback', label: 'Read-Aloud Feedback', description: 'Show pronunciation feedback in read-aloud mode', value: true },
    ],
  },
  {
    id: 'account', title: 'Account', icon: '👤',
    items: [
      { type: 'info', key: 'email', label: 'Email', value: '' },
      { type: 'info', key: 'subscription', label: 'Subscription', value: '' },
      { type: 'info', key: 'learnerCount', label: 'Learners', value: '' },
      { type: 'action', key: 'manageSubscription', label: 'Manage Subscription', description: 'Change plan or payment method', destructive: false },
      { type: 'action', key: 'exportData', label: 'Export Data', description: 'Download your learning data', destructive: false },
    ],
  },
  {
    id: 'offline', title: 'Offline & Storage', icon: '📱',
    items: [
      { type: 'info', key: 'downloadedBooks', label: 'Downloaded Books', value: '0' },
      { type: 'info', key: 'storageUsed', label: 'Storage Used', value: '0 MB' },
      { type: 'toggle', key: 'autoDownload', label: 'Auto-Download', description: 'Automatically download recommended books on Wi-Fi', value: true },
      { type: 'action', key: 'clearDownloads', label: 'Clear Downloads', description: 'Remove all downloaded books', destructive: true },
    ],
  },
  {
    id: 'privacy', title: 'Privacy & Safety', icon: '🔒',
    items: [
      { type: 'toggle', key: 'analyticsEnabled', label: 'Learning Analytics', description: 'Share anonymised usage data to improve the platform', value: true },
      { type: 'toggle', key: 'parentalLock', label: 'Parental Lock', description: 'Require PIN to access settings and store', value: false },
      { type: 'action', key: 'privacyPolicy', label: 'Privacy Policy', description: 'View our privacy policy', destructive: false },
      { type: 'action', key: 'deleteAccount', label: 'Delete Account', description: 'Permanently delete account and data', destructive: true },
    ],
  },
];

// =============================================================================
// Section 4: App Store Submission Preparation (XP-005)
// =============================================================================

/** App Store metadata configuration */
export interface AppStoreMetadata {
  platform: 'ios' | 'android' | 'web';
  appName: string;
  subtitle: string;
  description: string;
  keywords: string[];
  category: string;
  contentRating: string;
  privacyPolicyUrl: string;
  supportUrl: string;
  marketingUrl: string;
  screenshots: ScreenshotSpec[];
  appIcon: AppIconSpec;
}

export interface ScreenshotSpec {
  device: string;
  width: number;
  height: number;
  scenes: string[];
}

export interface AppIconSpec {
  sizes: Array<{ width: number; height: number; scale: number; platform: string }>;
  designGuidelines: string;
}

/** iOS App Store configuration */
export const IOS_METADATA: AppStoreMetadata = {
  platform: 'ios',
  appName: 'Scholarly Phonics',
  subtitle: 'Learn to Read with Magic',
  description: 'Scholarly brings the magic of reading to life with curriculum-aligned storybooks that adapt to your child. Powered by AI and guided by phonics science, every story is perfectly calibrated to stretch abilities without frustration.',
  keywords: ['phonics', 'reading', 'education', 'children', 'storybooks', 'learn to read', 'literacy', 'decodable', 'SSP', 'early years'],
  category: 'Education > Reading & Writing',
  contentRating: '4+',
  privacyPolicyUrl: 'https://scholarly.education/privacy',
  supportUrl: 'https://scholarly.education/support',
  marketingUrl: 'https://scholarly.education',
  screenshots: [
    { device: 'iPhone 6.7"', width: 1290, height: 2796, scenes: ['library', 'reading', 'progress', 'settings'] },
    { device: 'iPhone 6.1"', width: 1179, height: 2556, scenes: ['library', 'reading', 'progress', 'settings'] },
    { device: 'iPad 12.9"', width: 2048, height: 2732, scenes: ['library', 'reading', 'progress', 'settings'] },
  ],
  appIcon: {
    sizes: [
      { width: 1024, height: 1024, scale: 1, platform: 'App Store' },
      { width: 180, height: 180, scale: 3, platform: 'iPhone' },
      { width: 167, height: 167, scale: 2, platform: 'iPad Pro' },
      { width: 152, height: 152, scale: 2, platform: 'iPad' },
    ],
    designGuidelines: 'Book icon with magical sparkles, warm colours, child-friendly. No text on icon.',
  },
};

/** Google Play Store configuration */
export const ANDROID_METADATA: AppStoreMetadata = {
  platform: 'android',
  appName: 'Scholarly Phonics',
  subtitle: 'Learn to Read with Magic',
  description: IOS_METADATA.description,
  keywords: IOS_METADATA.keywords,
  category: 'Education > Education',
  contentRating: 'Everyone',
  privacyPolicyUrl: 'https://scholarly.education/privacy',
  supportUrl: 'https://scholarly.education/support',
  marketingUrl: 'https://scholarly.education',
  screenshots: [
    { device: 'Phone', width: 1080, height: 1920, scenes: ['library', 'reading', 'progress', 'settings'] },
    { device: 'Tablet 7"', width: 1200, height: 1920, scenes: ['library', 'reading', 'progress'] },
    { device: 'Tablet 10"', width: 1920, height: 1200, scenes: ['library', 'reading', 'progress'] },
  ],
  appIcon: {
    sizes: [
      { width: 512, height: 512, scale: 1, platform: 'Play Store' },
      { width: 192, height: 192, scale: 1, platform: 'Launcher' },
      { width: 48, height: 48, scale: 1, platform: 'Notification' },
    ],
    designGuidelines: 'Adaptive icon with foreground/background layers. Rounded square safe zone.',
  },
};

// ── COPPA Compliance ────────────────────────────────────────────

export interface COPPAComplianceConfig {
  dataCollectionPolicy: {
    collectsPersonalInfo: boolean;
    personalInfoTypes: string[];
    collectionPurposes: string[];
    thirdPartySharing: boolean;
    thirdParties: string[];
    retentionPolicy: string;
    deletionProcess: string;
  };
  parentalConsent: {
    required: boolean;
    method: string;
    verificationSteps: string[];
    consentScope: string[];
    withdrawalProcess: string;
  };
  childSafety: {
    noAdvertising: boolean;
    noInAppPurchasesByChildren: boolean;
    noSocialFeatures: boolean;
    noExternalLinks: boolean;
    contentModeration: boolean;
    dataEncryption: boolean;
  };
}

export const COPPA_CONFIG: COPPAComplianceConfig = {
  dataCollectionPolicy: {
    collectsPersonalInfo: true,
    personalInfoTypes: [
      'Reading performance metrics (accuracy, speed, completion)',
      'Learning progression data (GPC mastery, phonics phase)',
      'Session duration and engagement metrics',
      'Device information for cross-platform sync',
    ],
    collectionPurposes: [
      'Personalising learning content to the child\'s reading level',
      'Tracking progress and generating reports for parents/educators',
      'Improving the adaptive difficulty engine',
    ],
    thirdPartySharing: false,
    thirdParties: [],
    retentionPolicy: 'Data retained while account is active. Deleted within 30 days of account deletion.',
    deletionProcess: 'Parents can request full data deletion via Settings > Privacy > Delete Account or by emailing privacy@scholarly.education',
  },
  parentalConsent: {
    required: true,
    method: 'Verifiable parental consent via email confirmation with knowledge-based verification',
    verificationSteps: [
      'Parent creates account with valid email',
      'Verification email sent with unique link',
      'Parent confirms by answering knowledge-based question',
      'Consent recorded with timestamp and IP',
    ],
    consentScope: [
      'Collection of reading performance data',
      'Use of voice recording for read-aloud assessment',
      'Cross-device synchronisation of learning progress',
    ],
    withdrawalProcess: 'Parents can withdraw consent at any time via Settings. Withdrawal triggers data deletion within 48 hours.',
  },
  childSafety: {
    noAdvertising: true,
    noInAppPurchasesByChildren: true,
    noSocialFeatures: true,
    noExternalLinks: true,
    contentModeration: true,
    dataEncryption: true,
  },
};

// ── In-App Purchase Configuration ───────────────────────────────

export interface IAPProduct {
  id: string;
  platform: 'ios' | 'android' | 'web';
  type: 'subscription' | 'consumable';
  name: string;
  description: string;
  priceUSD: number;
  period?: 'monthly' | 'yearly';
  trialDays?: number;
  features: string[];
}

export const IAP_PRODUCTS: IAPProduct[] = [
  {
    id: 'scholarly_basic_monthly', platform: 'ios', type: 'subscription',
    name: 'Scholarly Basic', description: 'Essential phonics learning for one child',
    priceUSD: 4.99, period: 'monthly', trialDays: 7,
    features: ['1 learner profile', 'Core storybook library', 'Progress tracking', 'Offline reading (5 books)'],
  },
  {
    id: 'scholarly_premium_monthly', platform: 'ios', type: 'subscription',
    name: 'Scholarly Premium', description: 'Full access for the whole family',
    priceUSD: 9.99, period: 'monthly', trialDays: 7,
    features: ['Up to 5 learner profiles', 'Full library + community books', 'AI-generated personalised stories', 'Unlimited offline downloads', 'Parent dashboard analytics'],
  },
  {
    id: 'scholarly_premium_yearly', platform: 'ios', type: 'subscription',
    name: 'Scholarly Premium (Annual)', description: 'Save 40% with annual billing',
    priceUSD: 71.99, period: 'yearly', trialDays: 14,
    features: ['All Premium features', '40% savings vs monthly', 'Priority access to new features'],
  },
  {
    id: 'scholarly_basic_monthly_android', platform: 'android', type: 'subscription',
    name: 'Scholarly Basic', description: 'Essential phonics learning for one child',
    priceUSD: 4.99, period: 'monthly', trialDays: 7,
    features: ['1 learner profile', 'Core storybook library', 'Progress tracking', 'Offline reading (5 books)'],
  },
  {
    id: 'scholarly_premium_monthly_android', platform: 'android', type: 'subscription',
    name: 'Scholarly Premium', description: 'Full access for the whole family',
    priceUSD: 9.99, period: 'monthly', trialDays: 7,
    features: ['Up to 5 learner profiles', 'Full library + community books', 'AI-generated personalised stories', 'Unlimited offline downloads', 'Parent dashboard analytics'],
  },
];

/**
 * Platform-specific billing integration configuration.
 * StoreKit 2 for iOS, Google Play Billing for Android, Stripe for Web.
 */
export interface BillingConfig {
  platform: 'ios' | 'android' | 'web';
  provider: 'storekit2' | 'google_play_billing' | 'stripe';
  productIds: string[];
  sharedSecret?: string;
  webhookUrl: string;
  sandboxEnabled: boolean;
  receiptValidationUrl: string;
}

export const BILLING_CONFIGS: BillingConfig[] = [
  {
    platform: 'ios',
    provider: 'storekit2',
    productIds: ['scholarly_basic_monthly', 'scholarly_premium_monthly', 'scholarly_premium_yearly'],
    webhookUrl: 'https://api.scholarly.education/v1/billing/apple/webhook',
    sandboxEnabled: true,
    receiptValidationUrl: 'https://api.scholarly.education/v1/billing/apple/validate',
  },
  {
    platform: 'android',
    provider: 'google_play_billing',
    productIds: ['scholarly_basic_monthly_android', 'scholarly_premium_monthly_android'],
    webhookUrl: 'https://api.scholarly.education/v1/billing/google/webhook',
    sandboxEnabled: true,
    receiptValidationUrl: 'https://api.scholarly.education/v1/billing/google/validate',
  },
  {
    platform: 'web',
    provider: 'stripe',
    productIds: ['price_basic_monthly', 'price_premium_monthly', 'price_premium_yearly'],
    webhookUrl: 'https://api.scholarly.education/v1/billing/stripe/webhook',
    sandboxEnabled: true,
    receiptValidationUrl: 'https://api.scholarly.education/v1/billing/stripe/validate',
  },
];

// =============================================================================
// Section 5: Factory Functions
// =============================================================================

export function createDefaultBookItem(book: {
  id: string;
  title: string;
  coverUrl: string;
  phonicsPhase: number;
  readProgress?: number;
}): BookShelfItem {
  const theme = PHASE_THEMES[book.phonicsPhase] || PHASE_THEMES[2];
  return {
    id: book.id,
    title: book.title,
    coverUrl: book.coverUrl,
    phonicsPhase: book.phonicsPhase,
    readProgress: book.readProgress || 0,
    isNew: true,
    isDownloaded: false,
    glowColor: theme.glowColor,
    spine: { width: 20, color: theme.shelfColor, textColor: '#FFFFFF' },
    animation: BookAnimation.IDLE,
  };
}

export function generateFloatingLetters(phase: number, count: number = 15): FloatingLetter[] {
  const theme = PHASE_THEMES[phase] || PHASE_THEMES[2];
  const phaseLetters: Record<number, string[]> = {
    1: ['a', 'b', 'c', 'd', 'e'],
    2: ['s', 'a', 't', 'p', 'i', 'n', 'm', 'd'],
    3: ['sh', 'ch', 'th', 'ai', 'ee', 'igh', 'oa'],
    4: ['str', 'spl', 'scr', 'nd', 'mp', 'nk'],
    5: ['ay', 'ou', 'ie', 'ea', 'a_e', 'i_e', 'o_e'],
    6: ['tion', 'sion', 'ough', 'ight'],
  };

  const letters = phaseLetters[phase] || phaseLetters[2];

  return Array.from({ length: count }, (_, i) => ({
    grapheme: letters[i % letters.length],
    position: {
      x: Math.random() * 100,
      y: Math.random() * 100,
      z: Math.random() * 50,
    },
    velocity: {
      dx: (Math.random() - 0.5) * 0.5,
      dy: (Math.random() - 0.5) * 0.3,
    },
    size: 16 + Math.random() * 24,
    opacity: 0.3 + Math.random() * 0.4,
    color: theme.floatingLetterColors[i % theme.floatingLetterColors.length],
    rotation: Math.random() * 360,
    phase,
  }));
}

// =============================================================================
// End of rn-ui-appstore.ts
// =============================================================================
