// =============================================================================
// SCHOLARLY PLATFORM — Sprint 11: S11-005
// Performance Optimisation
// =============================================================================
// Performance in an educational app isn't just a technical concern — it's a
// pedagogical one. A child waiting 3 seconds for a page to turn loses focus.
// A parent watching a loading spinner instead of their child reading loses
// confidence. A teacher whose dashboard takes 10 seconds to load stops checking.
// Every millisecond we shave from load times and every frame we add to animations
// translates directly into better learning outcomes.
//
// This module defines the performance optimisation strategies across three layers:
//   BUILD TIME: Bundle splitting, tree shaking, Hermes precompilation, asset compression
//   NETWORK: Image CDN, progressive loading, predictive prefetch, cache strategies
//   RUNTIME: Render optimisation, memory management, animation performance, offline engine
// =============================================================================

import { Result, ServiceError } from '../shared/base';

// =============================================================================
// SECTION 1: BUILD-TIME OPTIMISATIONS
// =============================================================================

export interface BuildOptimisationConfig {
  /** Bundle splitting strategy */
  bundleSplitting: BundleSplitConfig;
  /** Tree shaking configuration */
  treeShaking: TreeShakeConfig;
  /** Hermes bytecode compilation */
  hermes: HermesConfig;
  /** Asset preprocessing pipeline */
  assetPipeline: AssetPipelineConfig;
  /** Source map configuration */
  sourceMaps: SourceMapConfig;
}

export interface BundleSplitConfig {
  /** Entry points for code splitting */
  entryPoints: BundleEntryPoint[];
  /** Shared chunks extracted from multiple entry points */
  sharedChunks: SharedChunkConfig[];
  /** Maximum chunk size before warning (bytes) */
  maxChunkSize: number;
  /** Lazy loading strategy for routes */
  routeLazyLoading: boolean;
  /** Prefetch strategy for anticipated navigation */
  prefetchStrategy: 'none' | 'visible_links' | 'predicted_navigation';
}

export interface BundleEntryPoint {
  name: string;
  path: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  lazyLoad: boolean;
  estimatedSize: number;
}

export const APP_ENTRY_POINTS: BundleEntryPoint[] = [
  { name: 'core', path: './src/core', priority: 'critical', lazyLoad: false, estimatedSize: 180_000 },
  { name: 'auth', path: './src/auth', priority: 'critical', lazyLoad: false, estimatedSize: 45_000 },
  { name: 'library', path: './src/library', priority: 'high', lazyLoad: false, estimatedSize: 120_000 },
  { name: 'reader', path: './src/reader', priority: 'high', lazyLoad: true, estimatedSize: 250_000 },
  { name: 'formation', path: './src/formation', priority: 'normal', lazyLoad: true, estimatedSize: 85_000 },
  { name: 'collaboration', path: './src/collaboration', priority: 'normal', lazyLoad: true, estimatedSize: 95_000 },
  { name: 'arena', path: './src/arena', priority: 'normal', lazyLoad: true, estimatedSize: 110_000 },
  { name: 'analytics', path: './src/analytics', priority: 'low', lazyLoad: true, estimatedSize: 150_000 },
  { name: 'parent_dashboard', path: './src/parent', priority: 'low', lazyLoad: true, estimatedSize: 80_000 },
  { name: 'content_creation', path: './src/creation', priority: 'low', lazyLoad: true, estimatedSize: 130_000 },
  { name: 'settings', path: './src/settings', priority: 'low', lazyLoad: true, estimatedSize: 40_000 },
];

export interface SharedChunkConfig {
  name: string;
  modules: string[];
  minSharedBy: number;
}

export const SHARED_CHUNKS: SharedChunkConfig[] = [
  { name: 'vendor_react', modules: ['react', 'react-native', 'react-native-reanimated'], minSharedBy: 2 },
  { name: 'vendor_audio', modules: ['expo-av', 'elevenlabs-client'], minSharedBy: 2 },
  { name: 'scholarly_bkt', modules: ['./src/bkt', './src/mastery'], minSharedBy: 3 },
  { name: 'scholarly_ui', modules: ['./src/components', 'nativewind'], minSharedBy: 4 },
  { name: 'vendor_charts', modules: ['recharts', 'd3'], minSharedBy: 1 },
];

export interface TreeShakeConfig {
  /** Side-effect-free modules that can be safely tree-shaken */
  sideEffectFreeModules: string[];
  /** Build-time feature flags for dead code elimination */
  featureFlags: Record<string, boolean>;
  /** Unused export detection */
  detectUnusedExports: boolean;
}

export interface HermesConfig {
  enabled: boolean;
  optimisationLevel: 'O0' | 'O1' | 'O2' | 'O3';
  bytecodePrecompilation: boolean;
  stripFlowTypes: boolean;
  enableProxySupport: boolean;
  /** Custom Hermes flags for the scholarly BKT engine (numeric heavy) */
  numericOptimisations: boolean;
}

export const DEFAULT_HERMES_CONFIG: HermesConfig = {
  enabled: true,
  optimisationLevel: 'O2',
  bytecodePrecompilation: true,
  stripFlowTypes: true,
  enableProxySupport: false,
  numericOptimisations: true,
};

export interface AssetPipelineConfig {
  images: ImageOptimisationConfig;
  audio: AudioOptimisationConfig;
  lottie: LottieOptimisationConfig;
  fonts: FontOptimisationConfig;
}

export interface ImageOptimisationConfig {
  formats: ImageFormatConfig[];
  maxDimensions: Record<string, { width: number; height: number }>;
  qualityPresets: Record<string, number>;
  lazyLoadThreshold: number;
  blurHashPlaceholders: boolean;
  responsiveBreakpoints: number[];
}

export const DEFAULT_IMAGE_CONFIG: ImageOptimisationConfig = {
  formats: [
    { format: 'avif', quality: 75, fallback: 'webp', browserSupport: 0.85 },
    { format: 'webp', quality: 80, fallback: 'jpeg', browserSupport: 0.97 },
    { format: 'jpeg', quality: 85, fallback: null, browserSupport: 1.0 },
  ],
  maxDimensions: {
    thumbnail: { width: 200, height: 200 },
    card: { width: 400, height: 300 },
    page_illustration: { width: 1200, height: 900 },
    full_screen: { width: 2048, height: 1536 },
  },
  qualityPresets: { low: 50, medium: 75, high: 85, lossless: 100 },
  lazyLoadThreshold: 200, // pixels before viewport
  blurHashPlaceholders: true,
  responsiveBreakpoints: [320, 640, 768, 1024, 1440, 2048],
};

export interface ImageFormatConfig {
  format: 'avif' | 'webp' | 'jpeg' | 'png';
  quality: number;
  fallback: string | null;
  browserSupport: number;
}

export interface AudioOptimisationConfig {
  format: 'opus' | 'aac' | 'mp3';
  bitrate: number;
  sampleRate: number;
  preloadStrategy: 'none' | 'metadata' | 'auto';
  streamingThreshold: number;
  cacheExpiry: number;
}

export const DEFAULT_AUDIO_CONFIG: AudioOptimisationConfig = {
  format: 'opus',
  bitrate: 48_000,
  sampleRate: 24_000,
  preloadStrategy: 'metadata',
  streamingThreshold: 500_000, // Stream if > 500KB
  cacheExpiry: 7 * 24 * 60 * 60, // 7 days
};

export interface LottieOptimisationConfig {
  simplifyKeyframes: boolean;
  removeUnusedLayers: boolean;
  maxFileSize: number;
  preloadCritical: boolean;
}

export interface FontOptimisationConfig {
  subsetStrategy: 'latin_basic' | 'latin_extended' | 'full' | 'custom';
  customSubset?: string;
  preloadFonts: string[];
  fontDisplay: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
  variableFonts: boolean;
}

export interface SourceMapConfig {
  production: boolean;
  uploadToSentry: boolean;
  stripFromBundle: boolean;
}

// =============================================================================
// SECTION 2: NETWORK & CDN OPTIMISATIONS
// =============================================================================

export interface CdnConfig {
  provider: 'cloudflare' | 'cloudfront' | 'bunny' | 'custom';
  imageTransformation: boolean;
  edgeCaching: EdgeCacheConfig;
  prefetchRules: PrefetchRule[];
  compressionConfig: CompressionConfig;
}

export interface EdgeCacheConfig {
  defaultTtl: number;
  immutableAssetsTtl: number;
  apiResponseTtl: number;
  staleWhileRevalidate: number;
  cacheTags: string[];
}

export const DEFAULT_EDGE_CACHE: EdgeCacheConfig = {
  defaultTtl: 3600,
  immutableAssetsTtl: 31536000, // 1 year for hashed assets
  apiResponseTtl: 60,
  staleWhileRevalidate: 300,
  cacheTags: ['storybook', 'illustration', 'narration', 'lottie', 'font'],
};

export interface PrefetchRule {
  trigger: 'page_load' | 'hover' | 'visible' | 'idle' | 'predicted';
  resources: PrefetchResource[];
  priority: 'high' | 'low';
  condition?: string;
}

export interface PrefetchResource {
  type: 'image' | 'audio' | 'data' | 'script' | 'font';
  pattern: string;
  maxItems: number;
}

export const PREFETCH_RULES: PrefetchRule[] = [
  {
    trigger: 'page_load',
    resources: [
      { type: 'font', pattern: '/fonts/scholarly-*.woff2', maxItems: 3 },
      { type: 'image', pattern: '/library/hero-*.avif', maxItems: 1 },
    ],
    priority: 'high',
  },
  {
    trigger: 'visible',
    resources: [
      { type: 'image', pattern: '/books/{id}/cover.*', maxItems: 6 },
    ],
    priority: 'low',
  },
  {
    trigger: 'predicted',
    resources: [
      { type: 'audio', pattern: '/books/{id}/narration-page-1.*', maxItems: 1 },
      { type: 'image', pattern: '/books/{id}/page-1.*', maxItems: 1 },
    ],
    priority: 'low',
    condition: 'user_likely_to_open_book',
  },
];

export interface CompressionConfig {
  brotli: boolean;
  gzip: boolean;
  minSizeForCompression: number;
  compressibleMimeTypes: string[];
}

// =============================================================================
// SECTION 3: RUNTIME PERFORMANCE
// =============================================================================

export interface RuntimePerformanceConfig {
  rendering: RenderConfig;
  memory: MemoryConfig;
  animations: AnimationConfig;
  monitoring: PerformanceMonitoringConfig;
}

export interface RenderConfig {
  virtualizedListThreshold: number;
  imageCacheSize: number;
  maxConcurrentImageLoads: number;
  rerenderDebounce: number;
  memoizationStrategy: 'aggressive' | 'selective' | 'minimal';
  recyclerViewEnabled: boolean;
}

export const DEFAULT_RENDER_CONFIG: RenderConfig = {
  virtualizedListThreshold: 20,
  imageCacheSize: 100,
  maxConcurrentImageLoads: 4,
  rerenderDebounce: 16, // One frame at 60fps
  memoizationStrategy: 'selective',
  recyclerViewEnabled: true,
};

export interface MemoryConfig {
  maxImageCacheMemory: number;
  maxAudioBufferMemory: number;
  bktCacheSize: number;
  gcIntervalMs: number;
  lowMemoryThreshold: number;
  lowMemoryActions: LowMemoryAction[];
}

export interface LowMemoryAction {
  threshold: number;
  action: 'clear_image_cache' | 'release_audio_buffers' | 'compact_bkt_cache' | 'reduce_animation_quality' | 'force_gc';
  priority: number;
}

export const DEFAULT_MEMORY_CONFIG: MemoryConfig = {
  maxImageCacheMemory: 100 * 1024 * 1024, // 100MB
  maxAudioBufferMemory: 50 * 1024 * 1024,  // 50MB
  bktCacheSize: 1000,
  gcIntervalMs: 30_000,
  lowMemoryThreshold: 0.85,
  lowMemoryActions: [
    { threshold: 0.7, action: 'compact_bkt_cache', priority: 1 },
    { threshold: 0.8, action: 'clear_image_cache', priority: 2 },
    { threshold: 0.85, action: 'release_audio_buffers', priority: 3 },
    { threshold: 0.9, action: 'reduce_animation_quality', priority: 4 },
    { threshold: 0.95, action: 'force_gc', priority: 5 },
  ],
};

export interface AnimationConfig {
  useNativeDriver: boolean;
  targetFps: 60 | 30;
  reduceMotion: boolean;
  parallaxEnabled: boolean;
  particleLimit: number;
  lottieQuality: 'high' | 'medium' | 'low';
  pageTransitionDuration: number;
}

export const DEFAULT_ANIMATION_CONFIG: AnimationConfig = {
  useNativeDriver: true,
  targetFps: 60,
  reduceMotion: false, // Respects system accessibility setting
  parallaxEnabled: true,
  particleLimit: 100,
  lottieQuality: 'high',
  pageTransitionDuration: 300,
};

export interface PerformanceMonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  metrics: PerformanceMetric[];
  alertThresholds: PerformanceAlert[];
  reportingEndpoint: string;
}

export interface PerformanceMetric {
  name: string;
  type: 'timing' | 'counter' | 'gauge';
  unit: 'ms' | 'bytes' | 'fps' | 'count';
  sampleRate: number;
}

export const PERFORMANCE_METRICS: PerformanceMetric[] = [
  { name: 'app_cold_start', type: 'timing', unit: 'ms', sampleRate: 1.0 },
  { name: 'app_warm_start', type: 'timing', unit: 'ms', sampleRate: 0.5 },
  { name: 'library_render', type: 'timing', unit: 'ms', sampleRate: 0.5 },
  { name: 'book_open', type: 'timing', unit: 'ms', sampleRate: 1.0 },
  { name: 'page_turn', type: 'timing', unit: 'ms', sampleRate: 0.3 },
  { name: 'narration_start', type: 'timing', unit: 'ms', sampleRate: 1.0 },
  { name: 'asr_latency', type: 'timing', unit: 'ms', sampleRate: 1.0 },
  { name: 'bkt_update', type: 'timing', unit: 'ms', sampleRate: 0.5 },
  { name: 'image_decode', type: 'timing', unit: 'ms', sampleRate: 0.2 },
  { name: 'frame_drop_count', type: 'counter', unit: 'count', sampleRate: 0.3 },
  { name: 'memory_usage', type: 'gauge', unit: 'bytes', sampleRate: 0.1 },
  { name: 'js_heap_size', type: 'gauge', unit: 'bytes', sampleRate: 0.1 },
  { name: 'animation_fps', type: 'gauge', unit: 'fps', sampleRate: 0.2 },
  { name: 'sync_duration', type: 'timing', unit: 'ms', sampleRate: 1.0 },
];

export interface PerformanceAlert {
  metric: string;
  threshold: number;
  operator: 'gt' | 'lt';
  severity: 'warning' | 'critical';
  message: string;
}

export const PERFORMANCE_ALERTS: PerformanceAlert[] = [
  { metric: 'app_cold_start', threshold: 3000, operator: 'gt', severity: 'warning', message: 'Cold start exceeds 3s target' },
  { metric: 'app_cold_start', threshold: 5000, operator: 'gt', severity: 'critical', message: 'Cold start exceeds 5s — degraded UX' },
  { metric: 'book_open', threshold: 1500, operator: 'gt', severity: 'warning', message: 'Book open exceeds 1.5s target' },
  { metric: 'page_turn', threshold: 300, operator: 'gt', severity: 'warning', message: 'Page turn exceeds 300ms target' },
  { metric: 'narration_start', threshold: 500, operator: 'gt', severity: 'warning', message: 'Narration start exceeds 500ms target' },
  { metric: 'animation_fps', threshold: 30, operator: 'lt', severity: 'critical', message: 'Animation FPS below 30 — visible jank' },
  { metric: 'memory_usage', threshold: 300 * 1024 * 1024, operator: 'gt', severity: 'critical', message: 'Memory exceeds 300MB — risk of OOM' },
];

// =============================================================================
// SECTION 4: PERFORMANCE BUDGET
// =============================================================================

/**
 * Performance budgets define hard limits that trigger CI/CD warnings or failures.
 * Think of them as the speed limits on the road: you can tune the engine all
 * you want, but if you exceed the budget, you're creating a degraded experience.
 */
export interface PerformanceBudget {
  /** Maximum JS bundle size (gzipped, bytes) */
  maxBundleSizeGzip: number;
  /** Maximum total app download size */
  maxAppDownloadSize: number;
  /** Maximum time to interactive (milliseconds) */
  maxTimeToInteractive: number;
  /** Maximum First Contentful Paint */
  maxFCP: number;
  /** Maximum Largest Contentful Paint */
  maxLCP: number;
  /** Maximum Cumulative Layout Shift */
  maxCLS: number;
  /** Maximum First Input Delay */
  maxFID: number;
  /** Minimum Lighthouse performance score (PWA) */
  minLighthouseScore: number;
}

export const PERFORMANCE_BUDGET: PerformanceBudget = {
  maxBundleSizeGzip: 2 * 1024 * 1024, // 2MB gzipped
  maxAppDownloadSize: 50 * 1024 * 1024, // 50MB app store download
  maxTimeToInteractive: 3000,
  maxFCP: 1500,
  maxLCP: 2500,
  maxCLS: 0.1,
  maxFID: 100,
  minLighthouseScore: 90,
};

// =============================================================================
// SECTION 5: NATS EVENTS
// =============================================================================

export const PERFORMANCE_EVENTS = {
  BUDGET_EXCEEDED: 'scholarly.performance.budget_exceeded',
  SLOW_RENDER: 'scholarly.performance.slow_render',
  MEMORY_WARNING: 'scholarly.performance.memory_warning',
  FRAME_DROP_SPIKE: 'scholarly.performance.frame_drop_spike',
  COLD_START_SLOW: 'scholarly.performance.cold_start_slow',
} as const;

// =============================================================================
// EXPORTS
// =============================================================================
export {
  APP_ENTRY_POINTS,
  SHARED_CHUNKS,
  DEFAULT_HERMES_CONFIG,
  DEFAULT_IMAGE_CONFIG,
  DEFAULT_AUDIO_CONFIG,
  DEFAULT_EDGE_CACHE,
  PREFETCH_RULES,
  DEFAULT_RENDER_CONFIG,
  DEFAULT_MEMORY_CONFIG,
  DEFAULT_ANIMATION_CONFIG,
  PERFORMANCE_METRICS,
  PERFORMANCE_ALERTS,
  PERFORMANCE_BUDGET,
  PERFORMANCE_EVENTS,
};
