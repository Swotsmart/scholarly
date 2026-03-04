/**
 * Storybook Engine Type Definitions
 *
 * Types derived from the actual backend responses in:
 *   packages/api/src/routes/storybook.ts (1,224L, 20 endpoints)
 *
 * Backend mount: /api/v1/storybook/*
 *
 * Endpoint groups:
 *   Generation:   POST /generate, GET /generate/:id/status
 *   Illustration: POST /illustrate
 *   Narration:    POST /narrate
 *   Library:      GET /library, GET /library/:id, GET /library/recommendations
 *   Review:       POST /review/submit, GET /review/:id, POST /review/:id/peer-review
 *   Seed Library: GET /seed-library, POST /seed-library/generate
 *   Marketplace:  GET /marketplace/creators, GET /marketplace/creators/:id,
 *                 GET /marketplace/bounties, POST /marketplace/bounties
 *   Moderation:   GET /moderation/next, POST /moderation/:id/review, GET /moderation/metrics
 *   Languages:    GET /languages
 */

// =============================================================================
// GENERATION
// =============================================================================

export interface GenerateStoryInput {
  title: string;
  phase: number;
  targetGPCs?: string[];
  theme?: string;
  pageCount?: number;
  ageRange?: { min: number; max: number };
  language?: string;
  artStyle?: string;
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface GenerationJob {
  id: string;
  status: JobStatus;
  jobType: string;
  progress: number;
  resultContentId?: string | null;
  error?: string | null;
  createdAt: string;
  updatedAt?: string;
}

// =============================================================================
// ILLUSTRATION
// =============================================================================

export interface IllustrateInput {
  storyId: string;
  artStyle?: string;
  characterConsistency?: boolean;
}

// =============================================================================
// NARRATION
// =============================================================================

export interface NarrateInput {
  storyId: string;
  voiceId?: string;
  speed?: number;
}

// =============================================================================
// LIBRARY
// =============================================================================

export interface CreatorSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface StoryListItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  qualityScore: number | null;
  averageRating: number | null;
  reviewCount: number;
  downloadCount: number;
  tags: string[];
  publishedAt: string | null;
  createdAt: string;
  creator: CreatorSummary;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface LibraryListResponse {
  items: StoryListItem[];
  pagination: Pagination;
  filters: {
    phase?: string;
    theme?: string;
    language?: string;
    search?: string;
  };
}

export interface ReviewSummary {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  reviewer: CreatorSummary;
}

export interface StoryDetail extends StoryListItem {
  reviews: ReviewSummary[];
  body?: string | null;
  contentUrl?: string | null;
}

export interface RecommendedStory {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  qualityScore: number | null;
  averageRating: number | null;
  tags: string[];
  creator: CreatorSummary;
  matchScore: number;
  matchReason: string;
}

// =============================================================================
// REVIEW PIPELINE
// =============================================================================

export type ReviewStage =
  | 'automated_validation'
  | 'ai_review'
  | 'peer_review'
  | 'pilot_testing'
  | 'published'
  | 'rejected';

export interface ReviewItem {
  id: string;
  contentId: string;
  tenantId: string;
  currentStage: ReviewStage;
  automatedScore: number | null;
  aiReviewScore: number | null;
  peerReviewScore: number | null;
  pilotMetrics: Record<string, unknown> | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface PeerReviewInput {
  rating: number;
  comment?: string;
  topicsWellCovered?: string[];
  topicsNeedMoreWork?: string[];
  wouldRecommend?: boolean;
}

// =============================================================================
// SEED LIBRARY
// =============================================================================

export interface SeedLibraryItem {
  id: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  tags: string[];
  qualityScore: number | null;
  averageRating: number | null;
  publishedAt: string | null;
}

export interface SeedLibraryResponse {
  items: SeedLibraryItem[];
  pagination: Pagination;
  filters: {
    phase?: string;
    theme?: string;
    language?: string;
  };
}

// =============================================================================
// MARKETPLACE
// =============================================================================

export interface CreatorProfile {
  id: string;
  userId: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  websiteUrl?: string | null;
  tier: string;
  level: number;
  badges: string[];
  totalContent: number;
  totalSales: number;
  totalDownloads: number;
  averageRating: number | null;
  totalReviews: number;
  totalEarnings: number;
  totalPublished: number;
  totalDrafts?: number;
  avgEngagement?: number | null;
  subjects: string[];
  yearLevels: string[];
  specialisations?: string[];
  isVerifiedEducator: boolean;
  verificationStatus?: string;
  featuredSince?: string | null;
  createdAt: string;
  publishedContentCount?: number;
}

export interface CreatorListResponse {
  creators: CreatorProfile[];
  pagination: Pagination;
}

export type BountyStatus = 'open' | 'closed' | 'in_review' | 'awarded';

export interface ContentBounty {
  id: string;
  title: string;
  description: string;
  category: string;
  status: BountyStatus;
  rewardTokens: number;
  rewardCurrency: number | null;
  requirements: Record<string, unknown> | null;
  rubric: Record<string, unknown> | null;
  eligibleTiers: string[];
  tags: string[];
  submissionDeadline: string;
  submissionCount: number;
  createdAt: string;
}

export interface CreateBountyInput {
  title: string;
  description: string;
  category: string;
  rewardTokens: number;
  rewardCurrency?: number;
  requirements?: Record<string, unknown>;
  rubric?: Record<string, unknown>;
  eligibleTiers?: string[];
  tags?: string[];
  submissionDeadline: string;
}

export interface BountyListResponse {
  bounties: ContentBounty[];
  pagination: Pagination;
}

// =============================================================================
// MODERATION
// =============================================================================

export interface ModerationItem {
  id: string;
  contentId: string;
  title: string;
  creatorName: string;
  contentType: string;
  submittedAt: string;
  status: string;
  priority: number;
}

export interface ModerationMetrics {
  totalPending: number;
  totalReviewedToday: number;
  averageReviewTime: number;
  approvalRate: number;
}

export interface ModerationDecision {
  decision: 'approve' | 'reject';
  reason?: string;
}

// =============================================================================
// LANGUAGES
// =============================================================================

export interface SupportedLanguage {
  code: string;
  name: string;
  phonicsPhases: number;
}
