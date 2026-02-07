// ============================================================================
// SCHOLARLY PLATFORM — S12-004: Internationalisation (i18n)
// Sprint 12: UI string extraction, translation pipeline, RTL layout support
// ============================================================================
// Making Scholarly speak every family's language — from right-to-left Arabic to
// character-based Chinese, ensuring phonics education transcends language barriers.
// ============================================================================

import { ScholarlyBaseService, Result } from '../shared/base';

// Section 1: Types
interface I18nConfig {
  defaultLocale: string; supportedLocales: LocaleDefinition[];
  fallbackChain: Record<string, string[]>; namespaces: string[];
  interpolation: { prefix: string; suffix: string };
  pluralRules: PluralRule[];
}
interface LocaleDefinition { code: string; name: string; nativeName: string; direction: 'ltr' | 'rtl'; script: string; numberFormat: Intl.NumberFormatOptions; dateFormat: Intl.DateTimeFormatOptions; enabled: boolean; completionPercentage: number; }
interface PluralRule { locale: string; categories: string[]; rule: (n: number) => string; }
interface TranslationKey { namespace: string; key: string; defaultValue: string; description: string; maxLength?: number; context?: string; }
interface TranslationEntry { locale: string; namespace: string; key: string; value: string; status: 'draft' | 'reviewed' | 'approved'; translator?: string; reviewedBy?: string; updatedAt: Date; }
interface ExtractionResult { totalKeys: number; byNamespace: Record<string, number>; newKeys: number; deprecatedKeys: number; keys: TranslationKey[]; }

// Section 2: Supported Locales
const SUPPORTED_LOCALES: LocaleDefinition[] = [
  { code: 'en-AU', name: 'English (Australia)', nativeName: 'English (Australia)', direction: 'ltr', script: 'Latin', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: true, completionPercentage: 100 },
  { code: 'en-GB', name: 'English (UK)', nativeName: 'English (UK)', direction: 'ltr', script: 'Latin', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: true, completionPercentage: 100 },
  { code: 'en-US', name: 'English (US)', nativeName: 'English (US)', direction: 'ltr', script: 'Latin', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: true, completionPercentage: 100 },
  { code: 'es', name: 'Spanish', nativeName: 'Espanol', direction: 'ltr', script: 'Latin', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: true, completionPercentage: 0 },
  { code: 'fr', name: 'French', nativeName: 'Francais', direction: 'ltr', script: 'Latin', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: true, completionPercentage: 0 },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'rtl', script: 'Arabic', numberFormat: { style: 'decimal', numberingSystem: 'arab' }, dateFormat: { dateStyle: 'medium', calendar: 'gregory' }, enabled: false, completionPercentage: 0 },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文', direction: 'ltr', script: 'Han', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: false, completionPercentage: 0 },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'ltr', script: 'Devanagari', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: false, completionPercentage: 0 },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', direction: 'ltr', script: 'Japanese', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: false, completionPercentage: 0 },
  { code: 'id', name: 'Indonesian', nativeName: 'Bahasa Indonesia', direction: 'ltr', script: 'Latin', numberFormat: { style: 'decimal' }, dateFormat: { dateStyle: 'medium' }, enabled: false, completionPercentage: 0 },
];

// Section 3: Translation Namespaces (UI string categories)
const NAMESPACES = {
  common: { description: 'Shared UI elements: buttons, labels, navigation', estimatedKeys: 120 },
  auth: { description: 'Login, registration, password flows', estimatedKeys: 45 },
  library: { description: 'Storybook library, search, recommendations', estimatedKeys: 65 },
  reader: { description: 'Interactive reader, narration controls', estimatedKeys: 40 },
  phonics: { description: 'Phase names, GPC labels, assessment terms', estimatedKeys: 80 },
  dashboard: { description: 'Teacher/parent/admin dashboards, analytics', estimatedKeys: 95 },
  arena: { description: 'Competition modes, leaderboards, scoring', estimatedKeys: 50 },
  settings: { description: 'User preferences, accessibility, account', estimatedKeys: 55 },
  onboarding: { description: 'Setup wizards, tutorials, guided tours', estimatedKeys: 60 },
  errors: { description: 'Error messages, validation, status codes', estimatedKeys: 40 },
};

// Section 4: String Extraction Engine
class StringExtractionEngine extends ScholarlyBaseService {
  private keys: TranslationKey[] = [];

  async extractAllStrings(): Promise<Result<ExtractionResult>> {
    // Extract from all namespaces
    this.extractCommon(); this.extractAuth(); this.extractLibrary();
    this.extractReader(); this.extractPhonics(); this.extractDashboard();
    this.extractArena(); this.extractSettings(); this.extractOnboarding();
    this.extractErrors();

    const byNamespace: Record<string, number> = {};
    for (const key of this.keys) { byNamespace[key.namespace] = (byNamespace[key.namespace] || 0) + 1; }

    return { success: true, data: { totalKeys: this.keys.length, byNamespace, newKeys: this.keys.length, deprecatedKeys: 0, keys: this.keys } };
  }

  private extractCommon(): void {
    const keys: [string, string, string][] = [
      ['common.save', 'Save', 'Save button'], ['common.cancel', 'Cancel', 'Cancel button'],
      ['common.delete', 'Delete', 'Delete action'], ['common.edit', 'Edit', 'Edit action'],
      ['common.search', 'Search', 'Search input placeholder'], ['common.loading', 'Loading...', 'Loading indicator'],
      ['common.back', 'Back', 'Navigation back'], ['common.next', 'Next', 'Navigation next'],
      ['common.done', 'Done', 'Completion action'], ['common.close', 'Close', 'Close modal/panel'],
      ['common.confirm', 'Confirm', 'Confirmation button'], ['common.yes', 'Yes', 'Affirmative'],
      ['common.no', 'No', 'Negative'], ['common.retry', 'Try Again', 'Retry action'],
      ['common.viewAll', 'View All', 'See all items'], ['common.learnMore', 'Learn More', 'More info link'],
      ['common.welcome', 'Welcome, {{name}}!', 'Welcome with user name'],
      ['common.items', '{{count}} item||{{count}} items', 'Pluralised item count'],
      ['common.lastUpdated', 'Last updated {{date}}', 'Timestamp display'],
      ['common.offline', 'You are offline', 'Offline notification'],
      ['common.online', 'You are back online', 'Online restored'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'common', key, defaultValue: val, description: desc });
  }

  private extractAuth(): void {
    const keys: [string, string, string][] = [
      ['auth.login', 'Log In', 'Login button'], ['auth.logout', 'Log Out', 'Logout button'],
      ['auth.email', 'Email address', 'Email field'], ['auth.password', 'Password', 'Password field'],
      ['auth.forgotPassword', 'Forgot password?', 'Reset link'],
      ['auth.createAccount', 'Create Account', 'Registration CTA'],
      ['auth.parentConsent', 'A parent or guardian must approve this account', 'COPPA consent'],
      ['auth.verifyEmail', 'Check your email for a verification link', 'Email verification'],
      ['auth.invalidCredentials', 'Invalid email or password', 'Login error'],
      ['auth.passwordRequirements', 'At least 8 characters with a number and letter', 'Password hint'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'auth', key, defaultValue: val, description: desc });
  }

  private extractLibrary(): void {
    const keys: [string, string, string][] = [
      ['library.title', 'My Library', 'Library page title'],
      ['library.readyForYou', 'Ready for You', 'Personalised shelf'],
      ['library.favourites', 'Favourites', 'Favourites shelf'],
      ['library.adventuresWaiting', 'Adventures Waiting', 'Stretch shelf'],
      ['library.communityPicks', 'Community Picks', 'Popular shelf'],
      ['library.searchBooks', 'Search storybooks...', 'Search placeholder'],
      ['library.filterPhase', 'Phonics Phase', 'Phase filter'],
      ['library.filterTheme', 'Theme', 'Theme filter'],
      ['library.bookCount', '{{count}} book||{{count}} books', 'Book count'],
      ['library.readTime', '{{minutes}} min read', 'Estimated read time'],
      ['library.downloadBook', 'Download for offline', 'Download button'],
      ['library.downloading', 'Downloading...', 'Download progress'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'library', key, defaultValue: val, description: desc });
  }

  private extractReader(): void {
    const keys: [string, string, string][] = [
      ['reader.listenMode', 'Listen to the story', 'Passive mode'],
      ['reader.readAloud', 'Read aloud', 'Active mode'],
      ['reader.tapToRead', 'Tap a word to hear it', 'Word tap hint'],
      ['reader.greatJob', 'Great job!', 'Positive feedback'],
      ['reader.tryAgain', 'Let\'s try that word again', 'Retry prompt'],
      ['reader.pageOf', 'Page {{current}} of {{total}}', 'Page indicator'],
      ['reader.bookComplete', 'You finished the book!', 'Completion celebration'],
      ['reader.earnedXP', 'You earned {{xp}} XP!', 'XP reward notification'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'reader', key, defaultValue: val, description: desc });
  }

  private extractPhonics(): void {
    const keys: [string, string, string][] = [
      ['phonics.phase', 'Phase {{number}}', 'Phase label'],
      ['phonics.phase1', 'Listening & Sounds', 'Phase 1 name'],
      ['phonics.phase2', 'First Letters', 'Phase 2 name'],
      ['phonics.phase3', 'More Letters', 'Phase 3 name'],
      ['phonics.phase4', 'Consonant Clusters', 'Phase 4 name'],
      ['phonics.phase5', 'Alternative Spellings', 'Phase 5 name'],
      ['phonics.phase6', 'Fluency & Spelling', 'Phase 6 name'],
      ['phonics.mastery', 'Mastery: {{percentage}}%', 'Mastery display'],
      ['phonics.gpcLearned', 'You can read: {{gpc}}', 'GPC learned'],
      ['phonics.decodable', 'Decodable', 'Decodable label'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'phonics', key, defaultValue: val, description: desc });
  }

  private extractDashboard(): void {
    const keys: [string, string, string][] = [
      ['dashboard.overview', 'Overview', 'Dashboard tab'],
      ['dashboard.students', 'Students', 'Students section'],
      ['dashboard.progress', 'Progress', 'Progress tab'],
      ['dashboard.interventionAlert', 'Intervention needed for {{name}}', 'Alert message'],
      ['dashboard.weeklyDigest', 'Weekly Reading Digest', 'Parent digest title'],
      ['dashboard.booksRead', '{{count}} books read this week', 'Weekly count'],
      ['dashboard.timeReading', '{{minutes}} minutes reading', 'Time display'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'dashboard', key, defaultValue: val, description: desc });
  }

  private extractArena(): void {
    const keys: [string, string, string][] = [
      ['arena.joinCompetition', 'Join Competition', 'Join CTA'],
      ['arena.leaderboard', 'Leaderboard', 'Leaderboard title'],
      ['arena.yourRank', 'Your Rank: #{{rank}}', 'Rank display'],
      ['arena.studentsVsTeachers', 'Students vs Teachers', 'Format name'],
      ['arena.roundOf', 'Round {{current}} of {{total}}', 'Round indicator'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'arena', key, defaultValue: val, description: desc });
  }

  private extractSettings(): void {
    const keys: [string, string, string][] = [
      ['settings.title', 'Settings', 'Settings page'],
      ['settings.language', 'Language', 'Language selector'],
      ['settings.accessibility', 'Accessibility', 'A11y section'],
      ['settings.dyslexiaFont', 'Dyslexia-friendly font', 'Font toggle'],
      ['settings.colourOverlay', 'Colour overlay', 'Overlay selector'],
      ['settings.textSpacing', 'Text spacing', 'Spacing control'],
      ['settings.notifications', 'Notifications', 'Notification prefs'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'settings', key, defaultValue: val, description: desc });
  }

  private extractOnboarding(): void {
    const keys: [string, string, string][] = [
      ['onboarding.welcome', 'Welcome to Scholarly!', 'Welcome screen'],
      ['onboarding.iAmA', 'I am a...', 'Role selection'],
      ['onboarding.teacher', 'Teacher', 'Teacher role'],
      ['onboarding.parent', 'Parent', 'Parent role'],
      ['onboarding.student', 'Student', 'Student role'],
      ['onboarding.setupClass', 'Set Up Your Class', 'Class setup step'],
      ['onboarding.addStudents', 'Add Your Students', 'Student import step'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'onboarding', key, defaultValue: val, description: desc });
  }

  private extractErrors(): void {
    const keys: [string, string, string][] = [
      ['errors.generic', 'Something went wrong. Please try again.', 'Generic error'],
      ['errors.network', 'No internet connection', 'Network error'],
      ['errors.notFound', 'Page not found', '404 error'],
      ['errors.unauthorized', 'Please log in to continue', '401 error'],
      ['errors.forbidden', 'You don\'t have permission', '403 error'],
      ['errors.rateLimit', 'Too many requests. Please wait.', '429 error'],
    ];
    for (const [key, val, desc] of keys) this.keys.push({ namespace: 'errors', key, defaultValue: val, description: desc });
  }
}

// Section 5: Translation Pipeline (AI-assisted + human review)
class TranslationPipeline extends ScholarlyBaseService {
  constructor(tenantId: string, userId: string, private readonly aipal: any) { super(tenantId, userId); }

  async translateNamespace(namespace: string, keys: TranslationKey[], targetLocale: string): Promise<Result<TranslationEntry[]>> {
    const batchSize = 20;
    const entries: TranslationEntry[] = [];

    for (let i = 0; i < keys.length; i += batchSize) {
      const batch = keys.slice(i, i + batchSize);
      const prompt = this.buildTranslationPrompt(batch, targetLocale);

      const result = await this.aipal.textCompletion({
        provider: 'anthropic', model: 'claude-sonnet-4-20250514',
        systemPrompt: `You are a professional translator specializing in educational software localisation. Translate UI strings to ${targetLocale}. Preserve {{interpolation}} tokens exactly. Return JSON array.`,
        userPrompt: prompt, temperature: 0.3, maxTokens: 2000
      });

      if (result.success) {
        try {
          const translations = JSON.parse(result.data.text.replace(/```json\n?|```/g, '').trim());
          for (const t of translations) {
            entries.push({ locale: targetLocale, namespace, key: t.key, value: t.value, status: 'draft', updatedAt: new Date() });
          }
        } catch { /* parse error — skip batch */ }
      }
    }

    return { success: true, data: entries };
  }

  private buildTranslationPrompt(keys: TranslationKey[], locale: string): string {
    const items = keys.map(k => ({ key: k.key, english: k.defaultValue, context: k.description, maxLength: k.maxLength }));
    return `Translate to ${locale}. Keep {{tokens}} untouched. Keep || plural separator.\n${JSON.stringify(items, null, 2)}`;
  }
}

// Section 6: RTL Layout Engine
class RTLLayoutEngine {
  static getLayoutDirection(locale: string): 'ltr' | 'rtl' {
    const rtlLocales = ['ar', 'he', 'fa', 'ur', 'ps', 'sd', 'yi'];
    return rtlLocales.some(l => locale.startsWith(l)) ? 'rtl' : 'ltr';
  }

  static getFlippedStyles(direction: 'rtl'): Record<string, string> {
    return {
      'margin-left': 'margin-right', 'margin-right': 'margin-left',
      'padding-left': 'padding-right', 'padding-right': 'padding-left',
      'text-align: left': 'text-align: right', 'text-align: right': 'text-align: left',
      'border-left': 'border-right', 'border-right': 'border-left',
      'left': 'right', 'right': 'left',
      'flex-direction: row': 'flex-direction: row-reverse',
    };
  }

  static getTextDirection(locale: string): { writingMode: string; direction: string } {
    const dir = this.getLayoutDirection(locale);
    return { writingMode: 'horizontal-tb', direction: dir };
  }
}

// Section 7: Locale-Aware Formatting
class LocaleFormatter {
  constructor(private readonly locale: string) {}

  formatNumber(n: number, options?: Intl.NumberFormatOptions): string {
    return new Intl.NumberFormat(this.locale, options).format(n);
  }

  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(this.locale, options || { dateStyle: 'medium' }).format(date);
  }

  formatRelativeTime(date: Date): string {
    const diff = Date.now() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const rtf = new Intl.RelativeTimeFormat(this.locale, { numeric: 'auto' });
    if (seconds < 60) return rtf.format(-seconds, 'second');
    if (seconds < 3600) return rtf.format(-Math.floor(seconds/60), 'minute');
    if (seconds < 86400) return rtf.format(-Math.floor(seconds/3600), 'hour');
    return rtf.format(-Math.floor(seconds/86400), 'day');
  }

  formatPlural(count: number, template: string): string {
    const forms = template.split('||');
    const rules = new Intl.PluralRules(this.locale);
    const category = rules.select(count);
    const index = category === 'one' ? 0 : Math.min(1, forms.length - 1);
    return forms[index].replace('{{count}}', this.formatNumber(count));
  }
}

export { StringExtractionEngine, TranslationPipeline, RTLLayoutEngine, LocaleFormatter, SUPPORTED_LOCALES, NAMESPACES, I18nConfig, LocaleDefinition, TranslationKey, TranslationEntry, ExtractionResult };
