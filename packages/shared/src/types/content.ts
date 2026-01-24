/**
 * Content Marketplace Types
 */

import { CurriculumFramework, GeneralCapability } from './curriculum';

export enum ContentType {
  LESSON_PLAN = 'lesson_plan',
  WORKSHEET = 'worksheet',
  ASSESSMENT = 'assessment',
  PRESENTATION = 'presentation',
  VIDEO = 'video',
  INTERACTIVE = 'interactive',
  GAME = 'game',
  PROJECT = 'project',
  UNIT_PLAN = 'unit_plan',
  RESOURCE_BUNDLE = 'resource_bundle',
  TEMPLATE = 'template',
  POSTER = 'poster',
  FLASHCARDS = 'flashcards',
}

export interface ContentItem {
  id: string;
  tenantId: string;
  creatorId: string;

  // Identity
  title: string;
  description: string;
  type: ContentType;
  thumbnailUrl?: string;
  previewUrl?: string;

  // Classification
  subjects: string[];
  yearLevels: string[];
  curriculumFrameworks: CurriculumFramework[];

  // Curriculum Alignment
  curriculumCodes: string[];
  alignmentScores: { code: string; score: number }[];
  generalCapabilities: GeneralCapability[];

  // Content Details
  format: 'pdf' | 'docx' | 'pptx' | 'video' | 'interactive' | 'bundle' | 'other';
  fileSize?: number;
  pageCount?: number;
  duration?: number; // For videos, in seconds

  // Pricing
  pricing: ContentPricing;

  // Quality & Trust
  qualityScore: number;
  reviewCount: number;
  averageRating: number;
  downloadCount: number;
  purchaseCount: number;

  // Tags & Search
  tags: string[];
  keywords: string[];
  searchableText: string;
  embedding?: number[];

  // Status
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
  publishedAt?: Date;

  // License
  license: ContentLicense;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentPricing {
  type: 'free' | 'paid' | 'freemium';
  price?: number;
  currency?: string;
  tokenPrice?: number;
  discountPercent?: number;
  bundleDiscount?: number;
}

export interface ContentLicense {
  type: 'all_rights_reserved' | 'cc_by' | 'cc_by_sa' | 'cc_by_nc' | 'cc_by_nc_sa' | 'cc0' | 'custom';
  commercialUse: boolean;
  attribution: boolean;
  shareAlike: boolean;
  customTerms?: string;
}

export interface ContentReview {
  id: string;
  contentId: string;
  reviewerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title?: string;
  comment?: string;
  helpfulCount: number;
  notHelpfulCount: number;
  verified: boolean; // Verified purchase
  yearLevelUsed?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ContentPurchase {
  id: string;
  tenantId: string;
  contentId: string;
  buyerId: string;
  creatorId: string;
  price: number;
  currency: string;
  tokenAmount: number;
  platformFee: number;
  creatorEarnings: number;
  tokenRewards: number;
  downloadCount: number;
  maxDownloads: number;
  status: 'completed' | 'refunded' | 'disputed';
  purchasedAt: Date;
  lastDownloadedAt?: Date;
}

// ============================================================================
// LEARNING ASSET REQUEST (LAR) SYSTEM
// ============================================================================

export interface LearningAssetRequest {
  id: string;
  tenantId: string;
  requesterId: string;

  // Request Details
  title: string;
  description: string;
  type: ContentType;
  subjects: string[];
  yearLevels: string[];
  curriculumCodes: string[];

  // Specifications
  specifications: string[];
  preferredFormat?: string;
  budgetRange?: { min: number; max: number };
  deadline?: Date;

  // Voting
  voteCount: number;
  votes: RequestVote[];

  // Fulfillment
  status: 'open' | 'in_progress' | 'fulfilled' | 'closed';
  fulfilledByContentIds: string[];
  fulfilledAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export interface RequestVote {
  userId: string;
  voteType: 'up' | 'would_buy';
  intendedBudget?: number;
  comment?: string;
  votedAt: Date;
}

// ============================================================================
// CREATOR PROFILE
// ============================================================================

export type CreatorLevel = 'new' | 'rising' | 'established' | 'top' | 'featured';

export interface CreatorProfile {
  userId: string;
  tenantId: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  websiteUrl?: string;

  // Statistics
  totalContent: number;
  totalSales: number;
  totalDownloads: number;
  averageRating: number;
  totalReviews: number;
  totalEarnings: number;

  // Level & Badges
  level: CreatorLevel;
  badges: string[];
  featuredSince?: Date;

  // Specializations
  subjects: string[];
  yearLevels: string[];

  // Status
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}
