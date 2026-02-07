// =============================================================================
// SCHOLARLY PLATFORM — Sprint 7: LR-003
// React Native Build Pipeline & Device Testing
// =============================================================================
// This is the factory floor where source code becomes installable apps.
// It orchestrates Expo EAS Build for iOS and Android, manages build profiles
// (development, preview, production), handles code signing, and defines the
// device testing matrix. Think of it as the assembly line at the end of a
// car factory — the engineering is done, now we need to stamp out vehicles
// that actually start when you turn the key, on every type of road surface.
// =============================================================================

import { Result } from '../shared/result';

// =============================================================================
// Section 1: Build Configuration Types
// =============================================================================

export enum BuildPlatform {
  IOS = 'ios',
  ANDROID = 'android',
  WEB = 'web',
}

export enum BuildProfile {
  DEVELOPMENT = 'development',   // Local testing, debug flags
  PREVIEW = 'preview',           // TestFlight / Internal Testing
  PRODUCTION = 'production',     // App Store / Play Store release
}

export enum BuildStatus {
  QUEUED = 'QUEUED',
  BUILDING = 'BUILDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export interface EASBuildConfig {
  projectId: string;
  slug: string;
  owner: string;
  sdkVersion: string;
  runtimeVersion: string;
  ios: IOSBuildConfig;
  android: AndroidBuildConfig;
  web: WebBuildConfig;
  environment: EnvironmentConfig;
}

export interface IOSBuildConfig {
  bundleIdentifier: string;
  buildNumber: string;
  teamId: string;
  provisioningProfile: string;
  distributionCertificate: string;
  infoPlist: Record<string, unknown>;
  entitlements: string[];
  supportedDevices: ('iphone' | 'ipad')[];
  minimumOsVersion: string;
  usesApplePencil: boolean;
}

export interface AndroidBuildConfig {
  package: string;
  versionCode: number;
  keystorePath: string;
  keystoreAlias: string;
  minSdkVersion: number;
  targetSdkVersion: number;
  compileSdkVersion: number;
  permissions: string[];
  features: string[];
  supportsChromeOS: boolean;
}

export interface WebBuildConfig {
  name: string;
  shortName: string;
  description: string;
  themeColor: string;
  backgroundColor: string;
  display: 'standalone' | 'fullscreen' | 'minimal-ui';
  orientation: 'any' | 'portrait' | 'landscape';
  scope: string;
  startUrl: string;
  icons: PWAIcon[];
  serviceWorker: ServiceWorkerConfig;
}

export interface PWAIcon {
  src: string;
  sizes: string;
  type: string;
  purpose: 'any' | 'maskable' | 'monochrome';
}

export interface ServiceWorkerConfig {
  precacheAssets: string[];
  runtimeCaching: CacheStrategy[];
  backgroundSync: boolean;
  pushNotifications: boolean;
}

export interface CacheStrategy {
  urlPattern: string;
  handler: 'CacheFirst' | 'NetworkFirst' | 'StaleWhileRevalidate' | 'NetworkOnly';
  options: {
    cacheName: string;
    expiration?: { maxEntries: number; maxAgeSeconds: number };
  };
}

export interface EnvironmentConfig {
  apiBaseUrl: string;
  wsBaseUrl: string;
  sentryDsn: string;
  elevenLabsApiKey: string;
  analyticsId: string;
  featureFlags: Record<string, boolean>;
}

// =============================================================================
// Section 2: EAS Configuration Generator
// =============================================================================
// Generates the eas.json and app.config.ts files that tell EAS Build how
// to compile, sign, and package the app for each platform and profile.
// =============================================================================

export class EASConfigGenerator {
  static generate(config: EASBuildConfig): EASJson {
    return {
      cli: {
        version: '>= 12.0.0',
        appVersionSource: 'remote',
      },
      build: {
        development: {
          developmentClient: true,
          distribution: 'internal',
          ios: {
            buildConfiguration: 'Debug',
            simulator: false,
            resourceClass: 'large',
          },
          android: {
            buildType: 'apk',
            gradleCommand: ':app:assembleDebug',
          },
          env: {
            APP_ENV: 'development',
            API_BASE_URL: 'https://dev-api.scholarly.app',
            ENABLE_STORYMODE: 'true',
          },
        },
        preview: {
          distribution: 'internal',
          ios: {
            buildConfiguration: 'Release',
            resourceClass: 'large',
          },
          android: {
            buildType: 'apk',
            gradleCommand: ':app:assembleRelease',
          },
          env: {
            APP_ENV: 'preview',
            API_BASE_URL: 'https://staging-api.scholarly.app',
            ENABLE_STORYMODE: 'true',
          },
          autoIncrement: true,
        },
        production: {
          ios: {
            buildConfiguration: 'Release',
            resourceClass: 'large',
            autoIncrement: true,
          },
          android: {
            buildType: 'app-bundle',
            gradleCommand: ':app:bundleRelease',
            autoIncrement: true,
          },
          env: {
            APP_ENV: 'production',
            API_BASE_URL: 'https://api.scholarly.app',
            ENABLE_STORYMODE: 'true',
          },
        },
      },
      submit: {
        production: {
          ios: {
            appleId: 'developer@scholarly.app',
            ascAppId: config.projectId,
            appleTeamId: config.ios.teamId,
          },
          android: {
            serviceAccountKeyPath: './credentials/play-store-key.json',
            track: 'internal',
          },
        },
      },
    };
  }

  static generateAppConfig(config: EASBuildConfig): ExpoAppConfig {
    return {
      expo: {
        name: 'Scholarly',
        slug: config.slug,
        version: '1.0.0',
        orientation: 'default',
        icon: './assets/icon.png',
        scheme: 'scholarly',
        userInterfaceStyle: 'automatic',
        splash: {
          image: './assets/splash.png',
          resizeMode: 'contain',
          backgroundColor: '#1a1a2e',
        },
        assetBundlePatterns: ['**/*'],
        ios: {
          supportsTablet: true,
          bundleIdentifier: config.ios.bundleIdentifier,
          buildNumber: config.ios.buildNumber,
          infoPlist: {
            NSMicrophoneUsageDescription: 'Scholarly uses the microphone for read-aloud phonics practice. Audio is processed in real-time and never stored.',
            NSCameraUsageDescription: 'Scholarly uses the camera for AR letter activities.',
            NSSpeechRecognitionUsageDescription: 'Scholarly uses speech recognition to assess reading accuracy during read-aloud practice.',
            ITSAppUsesNonExemptEncryption: false,
            UISupportsDocumentBrowser: false,
            LSApplicationQueriesSchemes: ['scholarly'],
          },
          usesAppleSignIn: true,
          associatedDomains: ['applinks:scholarly.app', 'webcredentials:scholarly.app'],
          config: {
            usesNonExemptEncryption: false,
          },
          privacyManifests: {
            NSPrivacyTracking: false,
            NSPrivacyTrackingDomains: [],
            NSPrivacyCollectedDataTypes: [
              {
                NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeAudioData',
                NSPrivacyCollectedDataTypeLinked: false,
                NSPrivacyCollectedDataTypeTracking: false,
                NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
              },
            ],
            NSPrivacyAccessedAPITypes: [
              {
                NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
                NSPrivacyAccessedAPITypeReasons: ['C617.1'],
              },
            ],
          },
        },
        android: {
          adaptiveIcon: {
            foregroundImage: './assets/adaptive-icon.png',
            backgroundColor: '#1a1a2e',
          },
          package: config.android.package,
          versionCode: config.android.versionCode,
          permissions: config.android.permissions,
          intentFilters: [
            {
              action: 'VIEW',
              autoVerify: true,
              data: [{ scheme: 'https', host: 'scholarly.app', pathPrefix: '/book/' }],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ],
          blockedPermissions: [
            'android.permission.READ_CONTACTS',
            'android.permission.WRITE_CONTACTS',
            'android.permission.READ_CALENDAR',
          ],
        },
        web: {
          favicon: './assets/favicon.png',
          bundler: 'metro',
          output: 'single',
        },
        plugins: [
          'expo-router',
          'expo-font',
          'expo-localization',
          ['expo-av', { microphonePermission: 'Scholarly uses the microphone for phonics read-aloud practice.' }],
          ['expo-notifications', { icon: './assets/notification-icon.png', color: '#4A90D9' }],
          ['expo-sqlite', {}],
          ['expo-file-system', {}],
          'expo-apple-authentication',
        ],
        extra: {
          eas: { projectId: config.projectId },
          router: { origin: 'https://scholarly.app' },
        },
        runtimeVersion: { policy: 'appVersion' },
        updates: {
          url: `https://u.expo.dev/${config.projectId}`,
          fallbackToCacheTimeout: 30000,
        },
        owner: config.owner,
      },
    };
  }
}

// =============================================================================
// Section 3: Device Testing Matrix
// =============================================================================
// Defines the complete matrix of physical devices that must pass testing
// before any release. This is the quality checkpoint — like crash-testing
// cars against barriers of different heights and angles.
// =============================================================================

export interface DeviceTestCase {
  id: string;
  device: string;
  platform: BuildPlatform;
  osVersion: string;
  screenSize: string;
  category: DeviceCategory;
  priority: 'critical' | 'high' | 'medium' | 'low';
  testAreas: TestArea[];
  notes: string;
}

export enum DeviceCategory {
  PHONE_SMALL = 'PHONE_SMALL',
  PHONE_STANDARD = 'PHONE_STANDARD',
  PHONE_LARGE = 'PHONE_LARGE',
  TABLET = 'TABLET',
  CHROMEBOOK = 'CHROMEBOOK',
  DESKTOP_BROWSER = 'DESKTOP_BROWSER',
}

export enum TestArea {
  ENCHANTED_LIBRARY = 'ENCHANTED_LIBRARY',
  INTERACTIVE_READER = 'INTERACTIVE_READER',
  AUDIO_RECORDING = 'AUDIO_RECORDING',
  AUDIO_PLAYBACK = 'AUDIO_PLAYBACK',
  OFFLINE_READING = 'OFFLINE_READING',
  PUSH_NOTIFICATIONS = 'PUSH_NOTIFICATIONS',
  IN_APP_PURCHASE = 'IN_APP_PURCHASE',
  DEEP_LINKING = 'DEEP_LINKING',
  ACCESSIBILITY = 'ACCESSIBILITY',
  PERFORMANCE = 'PERFORMANCE',
  ANIMATION = 'ANIMATION',
  KEYBOARD_INPUT = 'KEYBOARD_INPUT',
}

export const DEVICE_TESTING_MATRIX: DeviceTestCase[] = [
  // === iOS Devices ===
  {
    id: 'DT-001',
    device: 'iPhone 15',
    platform: BuildPlatform.IOS,
    osVersion: '18.0+',
    screenSize: '6.1"',
    category: DeviceCategory.PHONE_STANDARD,
    priority: 'critical',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.AUDIO_PLAYBACK,
      TestArea.PUSH_NOTIFICATIONS, TestArea.IN_APP_PURCHASE,
      TestArea.DEEP_LINKING, TestArea.ACCESSIBILITY,
      TestArea.PERFORMANCE, TestArea.ANIMATION,
    ],
    notes: 'Primary iOS reference device. All features must pass.',
  },
  {
    id: 'DT-002',
    device: 'iPhone SE (3rd gen)',
    platform: BuildPlatform.IOS,
    osVersion: '17.0+',
    screenSize: '4.7"',
    category: DeviceCategory.PHONE_SMALL,
    priority: 'high',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.PERFORMANCE,
      TestArea.ANIMATION,
    ],
    notes: 'Smallest supported iOS device. Test layout overflow and touch targets.',
  },
  {
    id: 'DT-003',
    device: 'iPad Air (5th gen)',
    platform: BuildPlatform.IOS,
    osVersion: '17.0+',
    screenSize: '10.9"',
    category: DeviceCategory.TABLET,
    priority: 'critical',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.AUDIO_PLAYBACK,
      TestArea.OFFLINE_READING, TestArea.IN_APP_PURCHASE,
      TestArea.ACCESSIBILITY, TestArea.ANIMATION,
      TestArea.KEYBOARD_INPUT,
    ],
    notes: 'Primary tablet. Test landscape mode, Split View, Apple Pencil letter tracing.',
  },
  {
    id: 'DT-004',
    device: 'iPad Mini (6th gen)',
    platform: BuildPlatform.IOS,
    osVersion: '17.0+',
    screenSize: '8.3"',
    category: DeviceCategory.TABLET,
    priority: 'medium',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.ANIMATION,
    ],
    notes: 'Smaller tablet form factor. Common for younger children.',
  },

  // === Android Devices ===
  {
    id: 'DT-005',
    device: 'Samsung Galaxy S24',
    platform: BuildPlatform.ANDROID,
    osVersion: '14+',
    screenSize: '6.2"',
    category: DeviceCategory.PHONE_STANDARD,
    priority: 'critical',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.AUDIO_PLAYBACK,
      TestArea.PUSH_NOTIFICATIONS, TestArea.IN_APP_PURCHASE,
      TestArea.DEEP_LINKING, TestArea.ACCESSIBILITY,
      TestArea.PERFORMANCE, TestArea.ANIMATION,
    ],
    notes: 'Primary Android reference device. All features must pass.',
  },
  {
    id: 'DT-006',
    device: 'Google Pixel 8',
    platform: BuildPlatform.ANDROID,
    osVersion: '14+',
    screenSize: '6.2"',
    category: DeviceCategory.PHONE_STANDARD,
    priority: 'high',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.PERFORMANCE,
    ],
    notes: 'Stock Android baseline. Tests Hermes engine compatibility.',
  },
  {
    id: 'DT-007',
    device: 'Samsung Galaxy Tab S9',
    platform: BuildPlatform.ANDROID,
    osVersion: '14+',
    screenSize: '11"',
    category: DeviceCategory.TABLET,
    priority: 'critical',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.AUDIO_PLAYBACK,
      TestArea.OFFLINE_READING, TestArea.IN_APP_PURCHASE,
      TestArea.ACCESSIBILITY, TestArea.ANIMATION,
      TestArea.KEYBOARD_INPUT,
    ],
    notes: 'Primary Android tablet. Test DeX mode if available.',
  },
  {
    id: 'DT-008',
    device: 'Samsung Galaxy A14',
    platform: BuildPlatform.ANDROID,
    osVersion: '13+',
    screenSize: '6.6"',
    category: DeviceCategory.PHONE_LARGE,
    priority: 'high',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.PERFORMANCE, TestArea.ANIMATION,
      TestArea.OFFLINE_READING,
    ],
    notes: 'Budget Android device. Tests performance on lower-spec hardware — critical for accessibility commitment.',
  },

  // === Chromebook & Web ===
  {
    id: 'DT-009',
    device: 'Lenovo Chromebook Duet',
    platform: BuildPlatform.ANDROID,
    osVersion: 'Chrome OS 120+',
    screenSize: '10.1"',
    category: DeviceCategory.CHROMEBOOK,
    priority: 'high',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.KEYBOARD_INPUT,
      TestArea.PERFORMANCE, TestArea.ANIMATION,
    ],
    notes: 'School Chromebook. Test keyboard/trackpad navigation and larger screen layout.',
  },
  {
    id: 'DT-010',
    device: 'Chrome Desktop (macOS)',
    platform: BuildPlatform.WEB,
    osVersion: 'Chrome 120+',
    screenSize: 'Variable',
    category: DeviceCategory.DESKTOP_BROWSER,
    priority: 'critical',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.AUDIO_PLAYBACK,
      TestArea.OFFLINE_READING, TestArea.DEEP_LINKING,
      TestArea.ACCESSIBILITY, TestArea.PERFORMANCE,
      TestArea.ANIMATION, TestArea.KEYBOARD_INPUT,
    ],
    notes: 'Primary PWA target. Test install prompt, service worker, responsive layout.',
  },
  {
    id: 'DT-011',
    device: 'Safari Desktop (macOS)',
    platform: BuildPlatform.WEB,
    osVersion: 'Safari 17+',
    screenSize: 'Variable',
    category: DeviceCategory.DESKTOP_BROWSER,
    priority: 'high',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_RECORDING, TestArea.AUDIO_PLAYBACK,
      TestArea.PERFORMANCE, TestArea.ANIMATION,
    ],
    notes: 'Safari has different Web Audio API behaviour. Verify audio recording and playback.',
  },
  {
    id: 'DT-012',
    device: 'Safari Mobile (iOS)',
    platform: BuildPlatform.WEB,
    osVersion: 'iOS 17+',
    screenSize: '6.1"',
    category: DeviceCategory.PHONE_STANDARD,
    priority: 'high',
    testAreas: [
      TestArea.ENCHANTED_LIBRARY, TestArea.INTERACTIVE_READER,
      TestArea.AUDIO_PLAYBACK, TestArea.ANIMATION,
    ],
    notes: 'PWA on iOS. Verify home screen install and offline capabilities.',
  },
];

// =============================================================================
// Section 4: Build Pipeline Orchestrator
// =============================================================================

export interface BuildResult {
  id: string;
  platform: BuildPlatform;
  profile: BuildProfile;
  status: BuildStatus;
  buildUrl: string | null;
  artifactUrl: string | null;
  startedAt: Date;
  completedAt: Date | null;
  durationMs: number;
  errorMessage: string | null;
  buildNumber: string;
  version: string;
}

export interface BuildPipelineReport {
  totalBuilds: number;
  succeeded: number;
  failed: number;
  totalDurationMs: number;
  results: BuildResult[];
  deviceTestResults: DeviceTestResult[];
  readyForSubmission: boolean;
  blockers: string[];
}

export interface DeviceTestResult {
  testCase: DeviceTestCase;
  passed: boolean;
  failedAreas: TestArea[];
  notes: string;
  screenshots: string[];
  performanceMetrics: PerformanceMetrics | null;
}

export interface PerformanceMetrics {
  appLaunchTimeMs: number;
  libraryLoadTimeMs: number;
  readerOpenTimeMs: number;
  audioLatencyMs: number;
  animationFps: number;
  memoryUsageMb: number;
  bundleSizeMb: number;
}

export class BuildPipelineOrchestrator {
  private readonly easConfig: EASJson;

  constructor(
    private readonly config: EASBuildConfig,
    private readonly buildService: EASBuildService,
    private readonly testRunner: DeviceTestRunner
  ) {
    this.easConfig = EASConfigGenerator.generate(config);
  }

  async runFullPipeline(profile: BuildProfile): Promise<Result<BuildPipelineReport>> {
    const report: BuildPipelineReport = {
      totalBuilds: 0,
      succeeded: 0,
      failed: 0,
      totalDurationMs: 0,
      results: [],
      deviceTestResults: [],
      readyForSubmission: false,
      blockers: [],
    };

    const startTime = Date.now();

    // Step 1: Pre-build checks
    const preflightResult = await this.preflightChecks();
    if (!preflightResult.success) {
      report.blockers.push(preflightResult.error!);
      return Result.ok(report);
    }

    // Step 2: Build for each platform (iOS and Android in parallel)
    const platforms = [BuildPlatform.IOS, BuildPlatform.ANDROID];
    const buildPromises = platforms.map(p => this.buildForPlatform(p, profile));
    const buildResults = await Promise.allSettled(buildPromises);

    for (const result of buildResults) {
      if (result.status === 'fulfilled') {
        report.results.push(result.value);
        report.totalBuilds++;
        if (result.value.status === BuildStatus.SUCCEEDED) {
          report.succeeded++;
        } else {
          report.failed++;
          report.blockers.push(`${result.value.platform} build failed: ${result.value.errorMessage}`);
        }
      } else {
        report.failed++;
        report.blockers.push(`Build failed: ${result.reason}`);
      }
    }

    // Step 3: Build PWA (web)
    const webResult = await this.buildWeb(profile);
    report.results.push(webResult);
    report.totalBuilds++;
    if (webResult.status === BuildStatus.SUCCEEDED) {
      report.succeeded++;
    } else {
      report.failed++;
      report.blockers.push(`Web build failed: ${webResult.errorMessage}`);
    }

    // Step 4: Run device tests (only if builds succeeded)
    if (report.failed === 0) {
      const criticalTests = DEVICE_TESTING_MATRIX.filter(t => t.priority === 'critical');
      for (const testCase of criticalTests) {
        const testResult = await this.testRunner.runTest(testCase, report.results);
        report.deviceTestResults.push(testResult);
        if (!testResult.passed) {
          report.blockers.push(`Device test failed: ${testCase.device} — ${testResult.failedAreas.join(', ')}`);
        }
      }
    }

    report.totalDurationMs = Date.now() - startTime;
    report.readyForSubmission = report.blockers.length === 0;

    return Result.ok(report);
  }

  private async preflightChecks(): Promise<Result<void>> {
    const checks: string[] = [];

    // Verify Expo CLI
    const expoCheck = await this.buildService.checkTool('expo');
    if (!expoCheck) checks.push('Expo CLI not installed');

    // Verify EAS CLI
    const easCheck = await this.buildService.checkTool('eas');
    if (!easCheck) checks.push('EAS CLI not installed');

    // Verify credentials
    const credsCheck = await this.buildService.verifyCredentials();
    if (!credsCheck.success) checks.push(`Credentials: ${credsCheck.error}`);

    if (checks.length > 0) {
      return Result.fail(`Pre-flight checks failed:\n${checks.join('\n')}`);
    }

    return Result.ok(undefined);
  }

  private async buildForPlatform(platform: BuildPlatform, profile: BuildProfile): Promise<BuildResult> {
    const startTime = Date.now();
    const buildId = `build_${platform}_${profile}_${Date.now()}`;

    try {
      const result = await this.buildService.build({
        platform,
        profile,
        config: this.easConfig,
        wait: true,
      });

      return {
        id: buildId,
        platform,
        profile,
        status: result.success ? BuildStatus.SUCCEEDED : BuildStatus.FAILED,
        buildUrl: result.success ? result.value!.buildUrl : null,
        artifactUrl: result.success ? result.value!.artifactUrl : null,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage: result.success ? null : result.error!,
        buildNumber: result.success ? result.value!.buildNumber : '0',
        version: result.success ? result.value!.version : '0.0.0',
      };
    } catch (error) {
      return {
        id: buildId,
        platform,
        profile,
        status: BuildStatus.FAILED,
        buildUrl: null,
        artifactUrl: null,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage: String(error),
        buildNumber: '0',
        version: '0.0.0',
      };
    }
  }

  private async buildWeb(profile: BuildProfile): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      const result = await this.buildService.buildWeb({
        profile,
        outputDir: './dist',
        serviceWorker: true,
      });

      return {
        id: `build_web_${profile}_${Date.now()}`,
        platform: BuildPlatform.WEB,
        profile,
        status: result.success ? BuildStatus.SUCCEEDED : BuildStatus.FAILED,
        buildUrl: null,
        artifactUrl: result.success ? result.value!.deployUrl : null,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage: result.success ? null : result.error!,
        buildNumber: '1',
        version: '1.0.0',
      };
    } catch (error) {
      return {
        id: `build_web_${profile}_${Date.now()}`,
        platform: BuildPlatform.WEB,
        profile,
        status: BuildStatus.FAILED,
        buildUrl: null,
        artifactUrl: null,
        startedAt: new Date(startTime),
        completedAt: new Date(),
        durationMs: Date.now() - startTime,
        errorMessage: String(error),
        buildNumber: '0',
        version: '0.0.0',
      };
    }
  }
}

// =============================================================================
// Section 5: Service Interfaces
// =============================================================================

export interface EASBuildService {
  checkTool(name: string): Promise<boolean>;
  verifyCredentials(): Promise<Result<void>>;
  build(params: { platform: BuildPlatform; profile: BuildProfile; config: EASJson; wait: boolean }):
    Promise<Result<{ buildUrl: string; artifactUrl: string; buildNumber: string; version: string }>>;
  buildWeb(params: { profile: BuildProfile; outputDir: string; serviceWorker: boolean }):
    Promise<Result<{ deployUrl: string }>>;
  submit(params: { platform: BuildPlatform; buildId: string }):
    Promise<Result<{ submissionId: string; status: string }>>;
}

export interface DeviceTestRunner {
  runTest(testCase: DeviceTestCase, builds: BuildResult[]): Promise<DeviceTestResult>;
}

export interface EASJson {
  cli: { version: string; appVersionSource: string };
  build: Record<string, unknown>;
  submit: Record<string, unknown>;
}

export interface ExpoAppConfig {
  expo: Record<string, unknown>;
}

// Line count: ~540
