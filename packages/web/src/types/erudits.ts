/**
 * Erudits Publishing Platform — Frontend Types
 *
 * Extracted from packages/erudits/src/types/erudits.types.ts for use
 * in the web frontend. These mirror the backend types but use string
 * dates (JSON serialisation) rather than Date objects.
 */

// ── Status & Format Enums ──

export type ResourceStatus = 'draft' | 'pending_review' | 'approved' | 'published' | 'archived' | 'rejected';
export type ResourceFormat = 'pdf' | 'docx' | 'pptx' | 'epub' | 'audio_mp3' | 'audio_wav' | 'video_mp4' | 'image_set' | 'interactive' | 'other';
export type LicenceScope = 'individual' | 'single_school' | 'multi_school' | 'unlimited';
export type ManuscriptStatus = 'draft' | 'in_review' | 'revision_requested' | 'approved' | 'formatting' | 'published' | 'archived';
export type PublicationFormat = 'ebook_epub' | 'ebook_kpf' | 'paperback' | 'hardcover' | 'digital_pdf' | 'print_pdf' | 'docx_modifiable';
export type DistributionChannel = 'scholarly_direct' | 'amazon_kdp' | 'ingram_spark' | 'scholarly_marketplace' | 'school_direct';
export type ChannelPublicationStatus = 'not_submitted' | 'pending_review' | 'live' | 'suspended' | 'removed';
export type CoverSource = 'ai_generated' | 'template' | 'uploaded' | 'professional';
export type BookClubSessionType = 'reading_assignment' | 'discussion' | 'activity' | 'assessment' | 'guest_speaker';
export type MigrationSource = 'squarespace' | 'wordpress' | 'wix' | 'shopify' | 'teacherspayteachers' | 'custom';
export type MigrationStatus =
  | 'created' | 'extracting' | 'transforming' | 'validating'
  | 'ready_for_review' | 'approved' | 'importing'
  | 'parallel_run' | 'cutover_ready' | 'live' | 'failed' | 'rolled_back';

// ── Shared ──

export interface CurriculumTag {
  id: string;
  tenantId: string;
  framework: string;
  code: string;
  label: string;
  description?: string;
  parentId?: string;
  level: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Resource Marketplace ──

export interface ResourceFile {
  id: string;
  tenantId: string;
  createdAt: string;
  resourceId: string;
  fileName: string;
  fileUrl: string;
  fileSizeBytes: number;
  mimeType: string;
  format: ResourceFormat;
  label?: string;
  sortOrder: number;
  pageCount?: number;
  durationSeconds?: number;
  watermarkEnabled: boolean;
}

export interface DigitalResource {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  title: string;
  slug: string;
  description: string;
  shortDescription?: string;
  coverImageUrl?: string;
  files: ResourceFile[];
  priceIndividualCents: number;
  priceSingleSchoolCents?: number;
  priceMultiSchoolCents?: number;
  currency: string;
  format: ResourceFormat;
  status: ResourceStatus;
  subjectArea?: string;
  yearLevels: string[];
  curriculumTags: CurriculumTag[];
  tags: string[];
  featured: boolean;
  totalPurchases: number;
  totalRevenueCents: number;
  averageRating: number;
  ratingCount: number;
  moderationStatus: string;
  previewPageCount?: number;
  sampleFileUrl?: string;
}

export interface ResourceReview {
  id: string;
  tenantId: string;
  createdAt: string;
  resourceId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  title?: string;
  body?: string;
  isPublished: boolean;
}

export interface ResourcePurchase {
  id: string;
  tenantId: string;
  createdAt: string;
  resourceId: string;
  buyerId: string;
  buyerEmail: string;
  buyerName: string;
  amountCents: number;
  currency: string;
  platformFeeCents: number;
  authorEarningsCents: number;
  licenceScope: LicenceScope;
  status: string;
  downloadCount: number;
}

// ── Publishing Engine ──

export interface ManuscriptChapter {
  id: string;
  tenantId: string;
  manuscriptId: string;
  title: string;
  sortOrder: number;
  wordCount: number;
  pageStart?: number;
  curriculumCode?: string;
  learningObjectives: string[];
  contentNodeId?: string;
}

export interface Manuscript {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  authorId: string;
  authorName: string;
  collaboratorIds: string[];
  title: string;
  subtitle?: string;
  slug: string;
  description?: string;
  language: string;
  secondaryLanguage?: string;
  content: Record<string, unknown>;
  wordCount: number;
  pageCountEstimate: number;
  chapters: ManuscriptChapter[];
  genre?: string;
  subjectArea?: string;
  yearLevels: string[];
  curriculumTags: CurriculumTag[];
  status: ManuscriptStatus;
  currentVersionId?: string;
}

export interface ManuscriptVersion {
  id: string;
  tenantId: string;
  createdAt: string;
  manuscriptId: string;
  versionNumber: number;
  label?: string;
  content: Record<string, unknown>;
  wordCount: number;
  changeDescription?: string;
  createdBy: string;
}

export interface PublicationChannelRecord {
  id: string;
  tenantId: string;
  publicationId: string;
  channel: DistributionChannel;
  status: ChannelPublicationStatus;
  externalId?: string;
  listPriceCents?: number;
  currency: string;
  royaltyPercent?: number;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
}

export interface BookPublication {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  manuscriptId: string;
  versionId: string;
  format: PublicationFormat;
  fileUrl?: string;
  fileSizeBytes?: number;
  pageCount?: number;
  channels: PublicationChannelRecord[];
  totalSales: number;
  totalRevenueCents: number;
  averageRating: number;
}

export interface BookCover {
  id: string;
  tenantId: string;
  createdAt: string;
  manuscriptId: string;
  source: CoverSource;
  frontCoverUrl?: string;
  fullCoverUrl?: string;
  thumbnailUrl?: string;
  widthPx?: number;
  heightPx?: number;
  isSelected: boolean;
}

export interface SalesRecord {
  id: string;
  tenantId: string;
  createdAt: string;
  publicationId?: string;
  resourceId?: string;
  channel: DistributionChannel;
  quantitySold: number;
  unitPriceCents: number;
  totalPriceCents: number;
  platformFeeCents: number;
  channelFeeCents: number;
  authorEarningsCents: number;
  currency: string;
  isRefunded: boolean;
}

// ── Book Club ──

export interface BookClub {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  organiserId: string;
  organiserName: string;
  name: string;
  slug: string;
  description?: string;
  coverImageUrl?: string;
  language: string;
  maxParticipants?: number;
  isPublic: boolean;
  requiresApproval: boolean;
  subscriptionRequired?: boolean;
  subjectArea?: string;
  yearLevels: string[];
  curriculumTags: CurriculumTag[];
  curriculumCodes?: string[];
  targetYearLevels?: string[];
  startDate?: string;
  endDate?: string;
  meetingFrequency?: string;
  meetingDay?: string;
  meetingTime?: string;
  timezone: string;
  isActive: boolean;
  participantCount: number;
  memberCount: number;
  sessionCount: number;
  readingCount: number;
  completionRate: number;
  maxMembers?: number;
}

export interface BookClubSession {
  id: string;
  tenantId: string;
  createdAt: string;
  bookClubId: string;
  title: string;
  description?: string;
  sessionType: BookClubSessionType;
  scheduledAt: string;
  durationMinutes: number;
  sortOrder: number;
  readingId?: string;
  chaptersFrom?: string;
  chaptersTo?: string;
  pagesFrom?: number;
  pagesTo?: number;
  meetingUrl?: string;
  location?: string;
  discussionPrompts?: string[];
  status: string;
  isCompleted: boolean;
  attendeeCount: number;
}

export interface BookClubReading {
  id: string;
  tenantId: string;
  createdAt: string;
  bookClubId: string;
  title: string;
  author?: string;
  isbn?: string;
  coverImageUrl?: string;
  sortOrder: number;
  startDate?: string;
  endDate?: string;
  readByDate?: string;
  curriculumCode?: string;
  learningObjectives: string[];
  isComplete: boolean;
  completionRate: number;
}

export interface BookClubMember {
  id: string;
  tenantId: string;
  createdAt: string;
  bookClubId: string;
  userId: string;
  displayName: string;
  userName: string;
  role: 'member' | 'moderator' | 'organiser' | 'student' | 'facilitator';
  isActive: boolean;
  readingsCompleted: number;
  sessionsAttended: number;
  engagementScore: number;
  lastActiveAt?: string;
}

// ── Migration ──

export interface MigrationError {
  step: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface MigrationWarning {
  step: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface PlatformMigration {
  id: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  source: MigrationSource;
  sourceUrl: string;
  ownerId: string;
  ownerEmail: string;
  status: MigrationStatus;
  currentStep?: string;
  progressPercent: number;
  pagesFound: number;
  productsFound: number;
  membersFound: number;
  imagesFound: number;
  postsFound: number;
  pagesImported: number;
  productsImported: number;
  membersImported: number;
  imagesImported: number;
  postsImported: number;
  urlMappings?: Record<string, string>;
  customDomain?: string;
  dnsVerified: boolean;
  sslProvisioned: boolean;
  errors?: MigrationError[];
  warnings?: MigrationWarning[];
}

export interface MigrationContentItem {
  id: string;
  tenantId: string;
  migrationId: string;
  sourceType: 'page' | 'product' | 'post' | 'image' | 'member';
  sourceId?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  targetType?: 'cms_page' | 'digital_resource' | 'user' | 'media';
  targetId?: string;
  targetUrl?: string;
  status: 'pending' | 'mapped' | 'imported' | 'failed' | 'skipped';
  errorMessage?: string;
  requiresReview: boolean;
  reviewNotes?: string;
}

// ── Author Stats (composite for dashboard) ──

export interface AuthorStats {
  totalResources: number;
  totalManuscripts: number;
  totalRevenueCents: number;
  totalSales: number;
  averageRating: number;
  bookClubCount: number;
}

// ── Storefront Search Params ──

export interface StorefrontSearchParams {
  search?: string;
  subjectArea?: string;
  yearLevels?: string[];
  format?: ResourceFormat;
  minPrice?: number;
  maxPrice?: number;
  curriculumFramework?: string;
  featured?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
