// =============================================================================
// SCHOLARLY PLATFORM — Sprint 11: S11-006
// Accessibility Audit & Remediation
// =============================================================================
// Accessibility in an educational app is not a checkbox — it's a moral
// imperative. A child with a visual impairment deserves the same enchanted
// library experience. A child with motor difficulties deserves the same
// interactive reader. A child with dyslexia deserves text that adapts to
// their needs. This module ensures Scholarly meets WCAG 2.1 AA and provides
// the framework for VoiceOver/TalkBack certification.
//
// Architecture:
//   AccessibilityAuditEngine (automated WCAG checker)
//   → RemediationRegistry (maps issues to fixes)
//   → A11yComponentLibrary (accessible component patterns)
//   → CertificationPipeline (VoiceOver/TalkBack test suites)
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: WCAG COMPLIANCE FRAMEWORK
// =============================================================================

export interface WcagAuditConfig {
  /** Target conformance level */
  targetLevel: 'A' | 'AA' | 'AAA';
  /** WCAG version */
  version: '2.1' | '2.2';
  /** Audit scope */
  scope: AuditScope;
  /** Success criteria to evaluate */
  criteria: WcagCriterion[];
  /** Platform-specific rules */
  platformRules: PlatformA11yRules;
}

export interface AuditScope {
  /** Screens to audit */
  screens: ScreenAuditEntry[];
  /** Components to audit */
  components: string[];
  /** User flows to audit end-to-end */
  flows: UserFlowAudit[];
}

export interface ScreenAuditEntry {
  screenId: string;
  name: string;
  route: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  hasInteractiveElements: boolean;
  hasAudioContent: boolean;
  hasAnimations: boolean;
}

export const SCREEN_AUDIT_INVENTORY: ScreenAuditEntry[] = [
  { screenId: 'login', name: 'Login/Welcome', route: '/(auth)/login', priority: 'critical', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: true },
  { screenId: 'library', name: 'Enchanted Library', route: '/(tabs)/library', priority: 'critical', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: true },
  { screenId: 'reader', name: 'Interactive Reader', route: '/reader/[id]', priority: 'critical', hasInteractiveElements: true, hasAudioContent: true, hasAnimations: true },
  { screenId: 'formation', name: 'Letter Formation', route: '/formation/[grapheme]', priority: 'critical', hasInteractiveElements: true, hasAudioContent: true, hasAnimations: true },
  { screenId: 'arena', name: 'Arena Lobby', route: '/(tabs)/arena', priority: 'high', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: true },
  { screenId: 'collaboration', name: 'Collaborative Story', route: '/collab/[session]', priority: 'high', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: false },
  { screenId: 'dashboard', name: 'Analytics Dashboard', route: '/dashboard', priority: 'high', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: true },
  { screenId: 'parent', name: 'Parent Companion', route: '/parent', priority: 'medium', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: false },
  { screenId: 'settings', name: 'Settings', route: '/settings', priority: 'medium', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: false },
  { screenId: 'profile', name: 'Learner Profile', route: '/profile', priority: 'medium', hasInteractiveElements: true, hasAudioContent: false, hasAnimations: false },
];

export interface UserFlowAudit {
  flowId: string;
  name: string;
  steps: string[];
  criticalPath: boolean;
}

export const CRITICAL_USER_FLOWS: UserFlowAudit[] = [
  { flowId: 'onboarding', name: 'First-time user onboarding', steps: ['welcome', 'age_select', 'assessment', 'library'], criticalPath: true },
  { flowId: 'read_story', name: 'Browse and read a story', steps: ['library', 'book_select', 'reader_open', 'page_read', 'complete'], criticalPath: true },
  { flowId: 'read_aloud', name: 'Read-aloud phonics practice', steps: ['library', 'book_select', 'mode_select', 'read_aloud', 'feedback'], criticalPath: true },
  { flowId: 'letter_practice', name: 'Letter formation practice', steps: ['formation_menu', 'letter_select', 'demonstrate', 'practice', 'feedback'], criticalPath: true },
  { flowId: 'arena_match', name: 'Join Arena competition', steps: ['arena_lobby', 'match_join', 'compete', 'results'], criticalPath: false },
];

export interface WcagCriterion {
  id: string;       // e.g., '1.1.1'
  name: string;
  level: 'A' | 'AA' | 'AAA';
  principle: 'perceivable' | 'operable' | 'understandable' | 'robust';
  status: 'pass' | 'fail' | 'partial' | 'not_applicable' | 'not_tested';
  issues: A11yIssue[];
  remediation?: RemediationPlan;
}

export interface A11yIssue {
  issueId: string;
  criterion: string;
  severity: 'critical' | 'major' | 'minor';
  screen: string;
  element: string;
  description: string;
  impact: string;
  remediation: string;
  automated: boolean;
}

export interface RemediationPlan {
  effort: 'trivial' | 'small' | 'medium' | 'large';
  priority: number;
  assignee?: string;
  deadline?: Date;
  status: 'planned' | 'in_progress' | 'testing' | 'complete';
}

// =============================================================================
// SECTION 2: PLATFORM-SPECIFIC ACCESSIBILITY
// =============================================================================

export interface PlatformA11yRules {
  ios: IosA11yConfig;
  android: AndroidA11yConfig;
  web: WebA11yConfig;
}

export interface IosA11yConfig {
  voiceOverSemantics: VoiceOverConfig;
  dynamicType: DynamicTypeConfig;
  reduceMotion: boolean;
  switchControl: boolean;
  guidedAccess: boolean;
}

export interface VoiceOverConfig {
  customActions: VoiceOverAction[];
  customRotors: VoiceOverRotor[];
  announcements: Record<string, string>;
  groupedElements: GroupedElement[];
}

export interface VoiceOverAction {
  name: string;
  screen: string;
  description: string;
  handler: string;
}

export const VOICEOVER_ACTIONS: VoiceOverAction[] = [
  { name: 'Turn Page', screen: 'reader', description: 'Turn to the next page', handler: 'handleNextPage' },
  { name: 'Play Narration', screen: 'reader', description: 'Play audio narration for current page', handler: 'handlePlayNarration' },
  { name: 'Pause Narration', screen: 'reader', description: 'Pause audio narration', handler: 'handlePauseNarration' },
  { name: 'Repeat Word', screen: 'reader', description: 'Hear the highlighted word again', handler: 'handleRepeatWord' },
  { name: 'Open Book', screen: 'library', description: 'Open the selected book', handler: 'handleOpenBook' },
  { name: 'Clear Canvas', screen: 'formation', description: 'Clear the writing canvas', handler: 'handleClearCanvas' },
  { name: 'Show Demonstration', screen: 'formation', description: 'Watch how to write this letter', handler: 'handleDemonstrate' },
];

export interface VoiceOverRotor {
  name: string;
  items: string[];
  description: string;
}

export interface GroupedElement {
  groupId: string;
  label: string;
  elements: string[];
  hint: string;
}

export interface DynamicTypeConfig {
  minScale: number;
  maxScale: number;
  supportedCategories: string[];
  customFontScaling: Record<string, { min: number; max: number }>;
}

export const DEFAULT_DYNAMIC_TYPE: DynamicTypeConfig = {
  minScale: 0.8,
  maxScale: 2.0,
  supportedCategories: ['body', 'headline', 'caption', 'title1', 'title2', 'title3'],
  customFontScaling: {
    storyText: { min: 18, max: 48 },
    uiLabel: { min: 12, max: 28 },
    readerWord: { min: 24, max: 64 },
  },
};

export interface AndroidA11yConfig {
  talkBackSemantics: TalkBackConfig;
  fontScaling: boolean;
  highContrast: boolean;
  switchAccess: boolean;
}

export interface TalkBackConfig {
  contentDescriptions: Record<string, string>;
  liveRegions: LiveRegion[];
  customActions: TalkBackAction[];
}

export interface LiveRegion {
  elementId: string;
  mode: 'polite' | 'assertive';
  description: string;
}

export interface TalkBackAction {
  label: string;
  screen: string;
  handler: string;
}

export interface WebA11yConfig {
  ariaLandmarks: AriaLandmark[];
  skipLinks: SkipLink[];
  focusManagement: FocusConfig;
  keyboardNavigation: KeyboardConfig;
}

export interface AriaLandmark {
  role: string;
  label: string;
  selector: string;
}

export interface SkipLink {
  label: string;
  target: string;
}

export interface FocusConfig {
  trapFocusInModals: boolean;
  restoreFocusOnClose: boolean;
  visibleFocusIndicator: boolean;
  focusIndicatorColor: string;
  focusIndicatorWidth: number;
}

export interface KeyboardConfig {
  shortcuts: KeyboardShortcut[];
  tabOrder: string[];
}

export interface KeyboardShortcut {
  key: string;
  modifiers: string[];
  action: string;
  screen: string;
  description: string;
}

export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'ArrowRight', modifiers: [], action: 'nextPage', screen: 'reader', description: 'Next page' },
  { key: 'ArrowLeft', modifiers: [], action: 'prevPage', screen: 'reader', description: 'Previous page' },
  { key: ' ', modifiers: [], action: 'toggleNarration', screen: 'reader', description: 'Play/pause narration' },
  { key: 'Escape', modifiers: [], action: 'closeReader', screen: 'reader', description: 'Close reader' },
  { key: 'r', modifiers: ['ctrl'], action: 'repeatWord', screen: 'reader', description: 'Repeat current word' },
];

// =============================================================================
// SECTION 3: DYSLEXIA & COGNITIVE ACCESSIBILITY
// =============================================================================

export interface DyslexiaConfig {
  fontFamily: 'OpenDyslexic' | 'Lexie_Readable' | 'system_default';
  letterSpacing: number;
  wordSpacing: number;
  lineHeight: number;
  syllableHighlighting: boolean;
  colourOverlays: ColourOverlay[];
  rulerGuide: boolean;
  rulerGuideHeight: number;
  readingMask: boolean;
  textToSpeechOnTap: boolean;
}

export interface ColourOverlay {
  name: string;
  backgroundColor: string;
  textColor: string;
  highlightColor: string;
}

export const COLOUR_OVERLAYS: ColourOverlay[] = [
  { name: 'None', backgroundColor: '#FFFFFF', textColor: '#000000', highlightColor: '#FFEB3B' },
  { name: 'Cream', backgroundColor: '#FFF8E7', textColor: '#333333', highlightColor: '#FFD54F' },
  { name: 'Pale Blue', backgroundColor: '#E3F2FD', textColor: '#1A237E', highlightColor: '#64B5F6' },
  { name: 'Pale Green', backgroundColor: '#E8F5E9', textColor: '#1B5E20', highlightColor: '#81C784' },
  { name: 'Pale Pink', backgroundColor: '#FCE4EC', textColor: '#880E4F', highlightColor: '#F48FB1' },
  { name: 'Pale Yellow', backgroundColor: '#FFFDE7', textColor: '#F57F17', highlightColor: '#FFF176' },
];

export const DEFAULT_DYSLEXIA_CONFIG: DyslexiaConfig = {
  fontFamily: 'system_default',
  letterSpacing: 0,
  wordSpacing: 0,
  lineHeight: 1.5,
  syllableHighlighting: false,
  colourOverlays: COLOUR_OVERLAYS,
  rulerGuide: false,
  rulerGuideHeight: 48,
  readingMask: false,
  textToSpeechOnTap: true,
};

// =============================================================================
// SECTION 4: MOTOR ACCESSIBILITY
// =============================================================================

export interface MotorAccessibilityConfig {
  minTouchTargetSize: number;
  touchTargetSpacing: number;
  gestureAlternatives: GestureAlternative[];
  dwellActivation: DwellConfig;
  switchControlMapping: SwitchMapping[];
  autoScrollSpeed: number;
}

export interface GestureAlternative {
  gesture: string;
  alternative: string;
  screen: string;
}

export const GESTURE_ALTERNATIVES: GestureAlternative[] = [
  { gesture: 'swipe_left', alternative: 'tap_next_button', screen: 'reader' },
  { gesture: 'swipe_right', alternative: 'tap_prev_button', screen: 'reader' },
  { gesture: 'pinch_zoom', alternative: 'zoom_buttons', screen: 'reader' },
  { gesture: 'long_press', alternative: 'double_tap', screen: 'library' },
  { gesture: 'drag_pencil', alternative: 'tap_waypoints', screen: 'formation' },
];

export interface DwellConfig {
  enabled: boolean;
  dwellTime: number;
  visualIndicator: boolean;
  indicatorColor: string;
}

export interface SwitchMapping {
  switchId: number;
  action: string;
  screen: string;
}

export const DEFAULT_MOTOR_CONFIG: MotorAccessibilityConfig = {
  minTouchTargetSize: 48,
  touchTargetSpacing: 8,
  gestureAlternatives: GESTURE_ALTERNATIVES,
  dwellActivation: { enabled: false, dwellTime: 1000, visualIndicator: true, indicatorColor: '#2196F3' },
  switchControlMapping: [],
  autoScrollSpeed: 1.0,
};

// =============================================================================
// SECTION 5: ACCESSIBILITY TESTING PIPELINE
// =============================================================================

export interface A11yTestSuite {
  suiteId: string;
  name: string;
  platform: 'ios' | 'android' | 'web' | 'cross_platform';
  tests: A11yTestCase[];
  automatedPercentage: number;
  manualTests: ManualTestCase[];
}

export interface A11yTestCase {
  testId: string;
  criterion: string;
  description: string;
  automated: boolean;
  tool: 'axe' | 'jest_a11y' | 'detox_a11y' | 'xcuitest' | 'espresso' | 'manual';
  steps?: string[];
  expectedResult: string;
  priority: 'P0' | 'P1' | 'P2';
}

export interface ManualTestCase {
  testId: string;
  description: string;
  assistiveTechnology: 'voiceover' | 'talkback' | 'switch_control' | 'keyboard' | 'screen_magnifier';
  steps: string[];
  expectedBehavior: string;
  screenRecording: boolean;
}

export const A11Y_TEST_SUITES: A11yTestSuite[] = [
  {
    suiteId: 'voiceover_reader',
    name: 'VoiceOver Interactive Reader',
    platform: 'ios',
    automatedPercentage: 40,
    tests: [
      { testId: 'vo_1', criterion: '1.1.1', description: 'All illustrations have alt text describing the scene', automated: true, tool: 'xcuitest', expectedResult: 'Every image has a meaningful accessibility label', priority: 'P0' },
      { testId: 'vo_2', criterion: '1.3.1', description: 'Story text is read in correct order', automated: true, tool: 'xcuitest', expectedResult: 'VoiceOver reads page text left-to-right, top-to-bottom', priority: 'P0' },
      { testId: 'vo_3', criterion: '2.1.1', description: 'All reader controls accessible via VoiceOver', automated: false, tool: 'manual', expectedResult: 'Every button and control is reachable and operable', priority: 'P0' },
      { testId: 'vo_4', criterion: '4.1.2', description: 'Reading mode change announced', automated: true, tool: 'xcuitest', expectedResult: 'Mode changes produce VoiceOver announcements', priority: 'P1' },
    ],
    manualTests: [
      { testId: 'vo_m1', description: 'Complete read-aloud flow with VoiceOver', assistiveTechnology: 'voiceover', steps: ['Open book', 'Select read-aloud mode', 'Read page aloud', 'Receive feedback', 'Turn page'], expectedBehavior: 'Full flow completable without sighted assistance', screenRecording: true },
    ],
  },
  {
    suiteId: 'talkback_library',
    name: 'TalkBack Enchanted Library',
    platform: 'android',
    automatedPercentage: 50,
    tests: [
      { testId: 'tb_1', criterion: '2.4.3', description: 'Focus order follows visual layout', automated: true, tool: 'espresso', expectedResult: 'Focus moves logically through shelves and books', priority: 'P0' },
      { testId: 'tb_2', criterion: '1.4.3', description: 'Text contrast meets AA minimum (4.5:1)', automated: true, tool: 'espresso', expectedResult: 'All text elements meet contrast ratio', priority: 'P0' },
    ],
    manualTests: [
      { testId: 'tb_m1', description: 'Browse library and open book with TalkBack', assistiveTechnology: 'talkback', steps: ['Navigate to library', 'Browse shelves', 'Select a book', 'Open in reader'], expectedBehavior: 'Smooth navigation with meaningful descriptions at each step', screenRecording: true },
    ],
  },
  {
    suiteId: 'keyboard_web',
    name: 'Keyboard Navigation (Web)',
    platform: 'web',
    automatedPercentage: 70,
    tests: [
      { testId: 'kb_1', criterion: '2.1.1', description: 'All interactive elements keyboard accessible', automated: true, tool: 'jest_a11y', expectedResult: 'Tab reaches every interactive element', priority: 'P0' },
      { testId: 'kb_2', criterion: '2.4.7', description: 'Focus indicator visible on all elements', automated: true, tool: 'axe', expectedResult: 'Clear focus indicator on every focusable element', priority: 'P0' },
      { testId: 'kb_3', criterion: '2.1.2', description: 'No keyboard traps', automated: true, tool: 'jest_a11y', expectedResult: 'Can navigate away from every element', priority: 'P0' },
    ],
    manualTests: [],
  },
];

// =============================================================================
// SECTION 6: NATS EVENTS
// =============================================================================

export const ACCESSIBILITY_EVENTS = {
  AUDIT_COMPLETED: 'scholarly.a11y.audit_completed',
  ISSUE_DETECTED: 'scholarly.a11y.issue_detected',
  REMEDIATION_COMPLETE: 'scholarly.a11y.remediation_complete',
  DYSLEXIA_MODE_ACTIVATED: 'scholarly.a11y.dyslexia_mode',
  SCREEN_READER_DETECTED: 'scholarly.a11y.screen_reader_detected',
  MOTOR_ACCOMMODATION_USED: 'scholarly.a11y.motor_accommodation',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================
export {
  SCREEN_AUDIT_INVENTORY,
  CRITICAL_USER_FLOWS,
  VOICEOVER_ACTIONS,
  DEFAULT_DYNAMIC_TYPE,
  KEYBOARD_SHORTCUTS,
  COLOUR_OVERLAYS,
  DEFAULT_DYSLEXIA_CONFIG,
  GESTURE_ALTERNATIVES,
  DEFAULT_MOTOR_CONFIG,
  A11Y_TEST_SUITES,
  ACCESSIBILITY_EVENTS,
};
