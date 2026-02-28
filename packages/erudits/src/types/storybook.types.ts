/**
 * ============================================================================
 * Scholarly Storybook Engine (SSE) — Types & Interfaces
 * ============================================================================
 *
 * Extends the Érudits type system (erudits.types.ts) with the Storybook Engine
 * domain. While the Érudits types serve tutor-authors selling digital resources
 * and publishing manuscripts, these types serve the phonics learning pipeline:
 * curriculum-aligned, AI-generated storybooks that adapt to each learner.
 *
 * The two domains share the same architectural patterns (Result<T>, EventBus,
 * Cache, FileStorage, multi-tenant isolation) but serve fundamentally different
 * missions. The Érudits wing is a marketplace; the SSE wing is a personalised
 * learning engine that happens to produce books.
 *
 * ## Domain Organisation
 *
 *   §1 — Core Entities (Storybook, Page, Character, Series)
 *   §2 — Generation Pipeline (illustration, narration, validation)
 *   §3 — Quality Gate (reviews, analytics, creator profiles)
 *   §4 — Community Content (bounties, marketplace, developer tools)
 *   §5 — Cross-Platform (device sync, offline reading)
 *   §6 — Repository Interfaces
 *   §7 — NATS Event Taxonomy
 *   §8 — API DTOs
 *
 * @module erudits/types/storybook
 * @version 1.0.0
 */

import type { ListFilter, PaginatedResult } from './erudits.types';

// ============================================================================
// §1 — CORE ENTITIES
// ============================================================================

export type StorybookStatus =
  | 'generating' | 'illustrating' | 'narrating'
  | 'draft' | 'in_review' | 'approved' | 'published' | 'archived' | 'failed';

export type ArtStyle =
  | 'watercolour' | 'flat_vector' | 'soft_3d' | 'crayon' | 'papercraft'
  | 'storybook_classic' | 'anime_soft' | 'pixel_art' | 'collage'
  | 'pencil_sketch' | 'gouache' | 'digital_paint' | 'woodblock' | 'linocut' | 'pop_art';

export type CreatorTier = 'bronze' | 'silver' | 'gold' | 'platinum';
export type ReviewStage = 'automated_validation' | 'ai_review' | 'peer_review' | 'pilot_testing' | 'library_publication';
export type BountyStatus = 'open' | 'in_progress' | 'awarded' | 'cancelled' | 'expired';
export type CreatorType = 'ai' | 'community' | 'internal';

/**
 * The core storybook entity. Every field is intentional:
 *   - phonicsPhase + targetGpcs + taughtGpcSet = the pedagogical fingerprint
 *   - decodabilityScore = the quality metric (minimum 85%)
 *   - generationCost = the economic tracking for per-book cost analysis
 */
export interface Storybook {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;

  // Identity
  title: string;
  slug: string;
  description?: string | undefined;
  status: StorybookStatus;

  // Authorship
  creatorId: string;
  creatorType: CreatorType;
  seriesId?: string | undefined;
  seriesOrder?: number | undefined;

  // Phonics metadata — the pedagogical fingerprint
  phonicsPhase: number;            // Letters & Sounds phase (1–6)
  targetGpcs: string[];            // GPCs this book practises
  taughtGpcSet: string[];          // Full GPC set required to read this book
  decodabilityScore: number;       // 0.0–1.0 (threshold: 0.85)
  wcpmBand?: { min: number; max: number } | undefined;
  vocabularyTier: 'tier_1' | 'tier_2' | 'tier_3';
  morphemeFocus?: string[] | undefined;
  comprehensionStrand?: string | undefined;

  // Curriculum alignment
  eylfAlignment?: Record<string, string> | undefined;
  ibPypAlignment?: Record<string, string> | undefined;
  culturalContext?: Record<string, string[]> | undefined;

  // Content
  ageGroupMin: number;
  ageGroupMax: number;
  artStyle: ArtStyle;
  themes: string[];
  narrativeTemplate?: string | undefined;
  pageCount: number;

  // Generation metadata
  generationCost: number;
  generationModel?: string | undefined;
  generationPrompt?: Record<string, unknown> | undefined;
}

export interface StorybookPage {
  id: string;
  tenantId: string;
  createdAt: Date;
  storybookId: string;
  pageNumber: number;

  text: string;
  illustrationUrl?: string | undefined;
  audioUrl?: string | undefined;
  wordTimestamps?: Array<{ word: string; startMs: number; endMs: number }> | undefined;

  sceneLayout?: Record<string, unknown> | undefined;
  textOverlayZone?: { x: number; y: number; width: number; height: number } | undefined;

  decodableWords?: string[] | undefined;
  nonDecodableWords?: string[] | undefined;
}

export interface StorybookCharacter {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;

  name: string;
  description: string;
  personalityTraits?: string[] | undefined;

  styleSheetUrl?: string | undefined;
  stylePrompt?: string | undefined;
  artStyle?: ArtStyle | undefined;

  seriesId?: string | undefined;
  creatorId: string;
}

export interface StorybookSeries {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;

  name: string;
  slug: string;
  description?: string | undefined;
  theme?: string | undefined;
  narrativeArc?: string | undefined;

  targetPhases: number[];
  ageGroupMin: number;
  ageGroupMax: number;
  artStyle: ArtStyle;
  coverImageUrl?: string | undefined;

  creatorId: string;
}

// ============================================================================
// §2 — GENERATION PIPELINE
// ============================================================================

export interface StorybookIllustration {
  id: string;
  tenantId: string;
  createdAt: Date;
  storybookId: string;
  pageNumber?: number | undefined;

  prompt: string;
  negativePrompt?: string | undefined;
  model: string;
  artStyle: ArtStyle;
  seed?: number | undefined;
  imageUrl: string;
  thumbnailUrl?: string | undefined;

  moderationResult?: Record<string, unknown> | undefined;
  moderationPassed: boolean;
  generationCost: number;
}

/**
 * The "phonics fingerprint" — the complete context that drives
 * story generation. Think of it as a prescription for a book:
 * what letters the child knows, what they're ready to learn next,
 * what interests them, and how fast they can read.
 */
export interface PhonicsFingerprint {
  learnerId: string;
  taughtGpcs: string[];
  targetGpcs: string[];
  phonicsPhase: number;
  ageGroup: number;
  readingLevel: number;          // WCPM
  preferredThemes: string[];
  affectiveState?: string;       // "confident" | "struggling" | "bored" | "engaged"
  excludeThemes?: string[] | undefined;
  artStylePreference?: ArtStyle | undefined;
}

// ============================================================================
// §3 — QUALITY GATE
// ============================================================================

export interface StorybookReview {
  id: string;
  tenantId: string;
  createdAt: Date;
  storybookId: string;

  stage: ReviewStage;
  reviewerId?: string | undefined;
  reviewerType: 'automated' | 'ai' | 'educator';

  overallScore?: number | undefined;
  decodabilityOk: boolean;
  safetyOk: boolean;
  curriculumAligned: boolean;
  narrativeCoherent: boolean;
  ageAppropriate: boolean;

  comments?: string | undefined;
  structuredReport?: Record<string, unknown> | undefined;
  passed: boolean;
}

export interface StorybookAnalytics {
  id: string;
  tenantId: string;
  updatedAt: Date;
  storybookId: string;

  readCount: number;
  uniqueReaders: number;
  completionRate: number;
  reReadRate: number;
  avgTimeSeconds: number;

  avgAccuracy: number;
  avgWcpm: number;
  gpcMasteryImpact?: Record<string, number> | undefined;

  avgRating: number;
  ratingCount: number;
}

export interface CreatorProfile {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;

  userId: string;
  displayName: string;
  bio?: string | undefined;
  avatarUrl?: string | undefined;

  tier: CreatorTier;
  isVerifiedEducator: boolean;
  verificationDate?: Date | undefined;

  totalContributions: number;
  publishedBooks: number;
  totalReads: number;
  engagementScore: number;
  reviewsCompleted: number;

  totalEarningsCents: number;
  pendingPayoutCents: number;
  stripeConnectId?: string | undefined;
  bountiesWon: number;
}

// ============================================================================
// §4 — COMMUNITY CONTENT
// ============================================================================

export interface ContentBounty {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;

  title: string;
  description: string;
  phonicsPhase?: number | undefined;
  targetGpcs?: string[] | undefined;
  ageGroupMin?: number | undefined;
  ageGroupMax?: number | undefined;
  themes?: string[] | undefined;
  artStyle?: ArtStyle | undefined;

  rewardCents: number;
  rewardCurrency: string;
  fundingSource: 'dao_treasury' | 'platform' | 'sponsor';

  status: BountyStatus;
  deadline?: Date | undefined;
  submissionCount: number;

  winnerId?: string | undefined;
  winningBookId?: string | undefined;
  awardedAt?: Date | undefined;

  postedBy: string;
}

// ============================================================================
// §5 — CROSS-PLATFORM
// ============================================================================

export interface DeviceStorybook {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;

  deviceId: string;
  userId: string;
  storybookId: string;

  downloadStatus: 'pending' | 'downloading' | 'complete' | 'failed';
  storageSizeBytes: number;
  syncVersion: number;
  lastAccessedAt?: Date | undefined;

  currentPage: number;
  currentWordIndex: number;
  completedAt?: Date | undefined;
}

// ============================================================================
// §6 — REPOSITORY INTERFACES
// ============================================================================

export interface StorybookRepository {
  save(tenantId: string, storybook: Storybook): Promise<Storybook>;
  findById(tenantId: string, id: string): Promise<Storybook | null>;
  findBySlug(tenantId: string, slug: string): Promise<Storybook | null>;
  findByCreator(tenantId: string, creatorId: string, filter: ListFilter): Promise<PaginatedResult<Storybook>>;
  findByPhase(tenantId: string, phase: number, filter: ListFilter): Promise<PaginatedResult<Storybook>>;
  findPublished(tenantId: string, filter: StorybookSearchFilter): Promise<PaginatedResult<Storybook>>;
  update(tenantId: string, id: string, updates: Partial<Storybook>): Promise<Storybook>;
  delete(tenantId: string, id: string): Promise<void>;
}

export interface StorybookPageRepository {
  saveBatch(tenantId: string, pages: StorybookPage[]): Promise<StorybookPage[]>;
  findByStorybook(tenantId: string, storybookId: string): Promise<StorybookPage[]>;
  update(tenantId: string, id: string, updates: Partial<StorybookPage>): Promise<StorybookPage>;
}

export interface StorybookCharacterRepository {
  save(tenantId: string, character: StorybookCharacter): Promise<StorybookCharacter>;
  findById(tenantId: string, id: string): Promise<StorybookCharacter | null>;
  findBySeries(tenantId: string, seriesId: string): Promise<StorybookCharacter[]>;
  update(tenantId: string, id: string, updates: Partial<StorybookCharacter>): Promise<StorybookCharacter>;
}

export interface StorybookSeriesRepository {
  save(tenantId: string, series: StorybookSeries): Promise<StorybookSeries>;
  findById(tenantId: string, id: string): Promise<StorybookSeries | null>;
  findBySlug(tenantId: string, slug: string): Promise<StorybookSeries | null>;
  findByCreator(tenantId: string, creatorId: string): Promise<StorybookSeries[]>;
  update(tenantId: string, id: string, updates: Partial<StorybookSeries>): Promise<StorybookSeries>;
}

export interface StorybookReviewRepository {
  save(tenantId: string, review: StorybookReview): Promise<StorybookReview>;
  findByStorybook(tenantId: string, storybookId: string): Promise<StorybookReview[]>;
  findByStage(tenantId: string, stage: ReviewStage, filter: ListFilter): Promise<PaginatedResult<StorybookReview>>;
  findByReviewer(tenantId: string, reviewerId: string, filter: ListFilter): Promise<PaginatedResult<StorybookReview>>;
}

export interface StorybookAnalyticsRepository {
  upsert(tenantId: string, analytics: StorybookAnalytics): Promise<StorybookAnalytics>;
  findByStorybook(tenantId: string, storybookId: string): Promise<StorybookAnalytics | null>;
  findTopByEngagement(tenantId: string, limit: number): Promise<StorybookAnalytics[]>;
}

export interface CreatorProfileRepository {
  save(tenantId: string, profile: CreatorProfile): Promise<CreatorProfile>;
  findByUserId(tenantId: string, userId: string): Promise<CreatorProfile | null>;
  findByTier(tenantId: string, tier: CreatorTier, filter: ListFilter): Promise<PaginatedResult<CreatorProfile>>;
  update(tenantId: string, userId: string, updates: Partial<CreatorProfile>): Promise<CreatorProfile>;
}

export interface ContentBountyRepository {
  save(tenantId: string, bounty: ContentBounty): Promise<ContentBounty>;
  findById(tenantId: string, id: string): Promise<ContentBounty | null>;
  findOpen(tenantId: string, filter: ListFilter): Promise<PaginatedResult<ContentBounty>>;
  update(tenantId: string, id: string, updates: Partial<ContentBounty>): Promise<ContentBounty>;
}

export interface DeviceStorybookRepository {
  save(tenantId: string, record: DeviceStorybook): Promise<DeviceStorybook>;
  findByDevice(tenantId: string, deviceId: string): Promise<DeviceStorybook[]>;
  findByUser(tenantId: string, userId: string): Promise<DeviceStorybook[]>;
  updateReadingPosition(tenantId: string, deviceId: string, storybookId: string, page: number, wordIndex: number): Promise<void>;
  updateDownloadStatus(tenantId: string, deviceId: string, storybookId: string, status: string): Promise<void>;
}

// ── Search Filter ──

export interface StorybookSearchFilter extends ListFilter {
  phonicsPhase?: number | undefined;
  targetGpcs?: string[] | undefined;
  ageGroupMin?: number | undefined;
  ageGroupMax?: number | undefined;
  artStyle?: ArtStyle | undefined;
  themes?: string[] | undefined;
  creatorType?: CreatorType | undefined;
  minDecodability?: number | undefined;
  seriesId?: string | undefined;
}

// ============================================================================
// §7 — NATS EVENT TAXONOMY
// ============================================================================

export const SSE_EVENTS = {
  // Storybook lifecycle
  STORYBOOK_GENERATION_STARTED: 'scholarly.storybook.generation_started',
  STORYBOOK_GENERATION_COMPLETED: 'scholarly.storybook.generation_completed',
  STORYBOOK_GENERATION_FAILED: 'scholarly.storybook.generation_failed',
  STORYBOOK_ILLUSTRATED: 'scholarly.storybook.illustrated',
  STORYBOOK_NARRATED: 'scholarly.storybook.narrated',
  STORYBOOK_SUBMITTED_FOR_REVIEW: 'scholarly.storybook.submitted_for_review',
  STORYBOOK_REVIEW_COMPLETED: 'scholarly.storybook.review_completed',
  STORYBOOK_PUBLISHED: 'scholarly.storybook.published',
  STORYBOOK_ARCHIVED: 'scholarly.storybook.archived',

  // Reading events
  STORYBOOK_READ_STARTED: 'scholarly.storybook.read_started',
  STORYBOOK_READ_COMPLETED: 'scholarly.storybook.read_completed',
  STORYBOOK_PAGE_TURNED: 'scholarly.storybook.page_turned',
  STORYBOOK_READ_ALOUD_SCORED: 'scholarly.storybook.read_aloud_scored',

  // Community events
  CREATOR_PROFILE_CREATED: 'scholarly.creator.profile_created',
  CREATOR_TIER_UPGRADED: 'scholarly.creator.tier_upgraded',
  BOUNTY_CREATED: 'scholarly.bounty.created',
  BOUNTY_SUBMISSION_RECEIVED: 'scholarly.bounty.submission_received',
  BOUNTY_AWARDED: 'scholarly.bounty.awarded',

  // Cross-platform
  DEVICE_BOOK_DOWNLOADED: 'scholarly.device.book_downloaded',
  DEVICE_READING_POSITION_SYNCED: 'scholarly.device.reading_position_synced',
} as const;

// ============================================================================
// §8 — API DTOs
// ============================================================================

export interface GenerateStorybookRequest {
  fingerprint: PhonicsFingerprint;
  themes?: string[] | undefined;
  artStyle?: ArtStyle | undefined;
  narrativeTemplate?: string | undefined;
  seriesId?: string | undefined;
}

export interface CreateSeriesRequest {
  name: string;
  description?: string | undefined;
  theme?: string | undefined;
  targetPhases: number[];
  ageGroupMin?: number | undefined;
  ageGroupMax?: number | undefined;
  artStyle?: ArtStyle | undefined;
}

export interface CreateCharacterRequest {
  name: string;
  description: string;
  personalityTraits?: string[] | undefined;
  stylePrompt?: string | undefined;
  artStyle?: ArtStyle | undefined;
  seriesId?: string | undefined;
}

export interface SubmitReviewRequest {
  storybookId: string;
  stage: ReviewStage;
  overallScore?: number | undefined;
  comments?: string | undefined;
  passed: boolean;
}

export interface CreateBountyRequest {
  title: string;
  description: string;
  phonicsPhase?: number | undefined;
  targetGpcs?: string[] | undefined;
  ageGroupMin?: number | undefined;
  ageGroupMax?: number | undefined;
  themes?: string[] | undefined;
  artStyle?: ArtStyle | undefined;
  rewardCents: number;
  deadline?: string | undefined;
}

export interface StorybookRecommendationRequest {
  learnerId: string;
  limit?: number | undefined;
  excludeRead?: boolean | undefined;
}

export interface SyncReadingPositionRequest {
  deviceId: string;
  storybookId: string;
  currentPage: number;
  currentWordIndex: number;
}
