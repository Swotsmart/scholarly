/**
 * ============================================================================
 * Production Integrations — Barrel Export
 * ============================================================================
 *
 * Every production integration in one import. Each module wraps a real
 * third-party SDK behind the interface defined in the types or service layer,
 * keeping the coupling confined to this directory.
 *
 * Usage:
 *   import { createStripeConnectClient, createAnthropicAIService, ... } from './integrations';
 */

// Payment processing
export { StripeConnectClient, createStripeConnectClient } from './stripe-connect.client';
export type { ConnectedAccountRegistry } from './stripe-connect.client';

// AI text & image generation
export { AnthropicAIServiceImpl, createAnthropicAIService } from './anthropic-ai.service';

// File storage
export { S3FileStorageImpl, createS3FileStorage } from './s3-storage.service';

// Caching
export { RedisCacheImpl, createRedisCache } from './redis-cache.service';

// Event bus
export { NatsEventBusImpl, createNatsEventBus } from './nats-eventbus.service';

// Squarespace migration
export { SquarespaceApiClientImpl, createSquarespaceApiClient } from './squarespace-api.client';
export type {
  SquarespaceExportData,
  SquarespacePage,
  SquarespaceProduct,
  SquarespaceBlogPost,
  SquarespaceMediaAsset,
  SquarespaceNavItem,
} from './squarespace-api.client';

// Document watermarking
export { PdfWatermarkServiceImpl, createPdfWatermarkService } from './watermark.service';

// Steganographic watermarking (Layer 1c — invisible forensic fingerprinting)
export {
  SteganographicWatermarkServiceImpl,
  createSteganographicWatermarkService,
  computeCrc12,
  HOMOGLYPH_MAP,
  REVERSE_HOMOGLYPH_MAP,
  KERNING_SHIFT_PT,
} from './steganographic-watermark.service';

// Content encryption (Layer 4 — download protection)
export {
  ContentEncryptionServiceImpl,
  createContentEncryptionService,
  AES_KEY_LENGTH,
  AES_IV_LENGTH,
  AES_AUTH_TAG_LENGTH,
  HKDF_SALT,
  PDF_PERMISSION_BITS,
} from './content-encryption.service';

// Page rendering (Layer 3 — encrypted reader)
export {
  PageRendererServiceImpl,
  createPageRendererService,
  DEFAULT_RENDERER_CONFIG,
} from './page-renderer.service';
export type {
  PageRendererConfig,
  RenderedPageImage,
  PreRenderResult,
} from './page-renderer.service';

// Puppeteer canvas renderer (production PDF→PNG engine)
export {
  PuppeteerCanvasRenderer,
  BrowserPool,
  createPuppeteerRenderer,
  DEFAULT_POOL_CONFIG,
} from './puppeteer-canvas.renderer';
export type {
  PuppeteerLike,
  BrowserLike,
  PageLike,
  SharpLike,
  SharpInstance,
  BrowserPoolConfig,
} from './puppeteer-canvas.renderer';
