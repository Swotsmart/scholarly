/**
 * Content Marketplace Service
 *
 * A "Teachers Pay Teachers" style marketplace where content creators can sell
 * educational resources, and teachers can request specific content they need.
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  AuthorizationError, Validator, EventBus, Cache, ScholarlyConfig, Jurisdiction
} from '@scholarly/shared/types/scholarly-types';

// ============================================================================
// TYPES
// ============================================================================

export interface ContentItem {
  id: string;
  tenantId: string;
  creatorId: string;
  title: string;
  description: string;
  shortDescription: string;
  type: ContentType;
  subjectIds: string[];
  yearLevels: string[];
  curriculumAlignments: CurriculumAlignment[];
  tags: string[];
  previewImages: string[];
  previewContent?: string;
  files: ContentFile[];
  pricing: ContentPricing;
  metrics: ContentMetrics;
  status: 'draft' | 'pending_review' | 'published' | 'rejected' | 'archived';
  publishedAt?: Date;
  license: ContentLicense;
  createdAt: Date;
  updatedAt: Date;
}

export enum ContentType {
  LESSON_PLAN = 'lesson_plan',
  WORKSHEET = 'worksheet',
  PRESENTATION = 'presentation',
  ASSESSMENT = 'assessment',
  FLASHCARDS = 'flashcards',
  VIDEO = 'video',
  INTERACTIVE = 'interactive',
  UNIT_PLAN = 'unit_plan',
  RESOURCE_BUNDLE = 'resource_bundle',
  TEMPLATE = 'template',
  POSTER = 'poster',
  GAME = 'game'
}

export interface CurriculumAlignment {
  framework: string;
  code: string;
  description: string;
  yearLevel: string;
}

export interface ContentFile {
  id: string;
  filename: string;
  format: string;
  sizeBytes: number;
  url: string;
  isPreview: boolean;
}

export interface ContentPricing {
  isFree: boolean;
  price: number;
  currency: string;
  discountPrice?: number;
  discountEndsAt?: Date;
  bundleDiscount?: number;
}

export interface ContentMetrics {
  views: number;
  downloads: number;
  purchases: number;
  revenue: number;
  averageRating: number;
  ratingCount: number;
  wishlistCount: number;
}

export interface ContentLicense {
  type: 'single_classroom' | 'school_wide' | 'district' | 'unlimited';
  allowModification: boolean;
  allowRedistribution: boolean;
  attributionRequired: boolean;
}

export interface ContentReview {
  id: string;
  contentId: string;
  reviewerId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  title: string;
  comment: string;
  helpfulVotes: number;
  verifiedPurchase: boolean;
  createdAt: Date;
}

export interface LearningAssetRequest {
  id: string;
  tenantId: string;
  requesterId: string;
  title: string;
  description: string;
  contentType: ContentType;
  subjectIds: string[];
  yearLevels: string[];
  curriculumCodes?: string[];
  maxPrice?: number;
  currency: string;
  votes: RequestVote[];
  voteCount: number;
  status: 'open' | 'in_progress' | 'fulfilled' | 'closed';
  fulfilledByContentId?: string;
  neededBy?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface RequestVote {
  userId: string;
  voteType: 'want' | 'need_urgently';
  yearLevel?: string;
  comment?: string;
  votedAt: Date;
}

export interface CreatorProfile {
  userId: string;
  tenantId: string;
  displayName: string;
  bio: string;
  avatarUrl?: string;
  specializations: string[];
  totalItems: number;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  followerCount: number;
  creatorLevel: 'new' | 'rising' | 'established' | 'top' | 'featured';
  joinedAt: Date;
}

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface ContentRepository {
  findById(tenantId: string, id: string): Promise<ContentItem | null>;
  findByCreator(tenantId: string, creatorId: string): Promise<ContentItem[]>;
  search(tenantId: string, query: ContentSearchQuery): Promise<{ items: ContentItem[]; total: number }>;
  findTrending(tenantId: string, limit: number): Promise<ContentItem[]>;
  save(tenantId: string, content: ContentItem): Promise<ContentItem>;
  update(tenantId: string, id: string, updates: Partial<ContentItem>): Promise<ContentItem>;
}

export interface ContentSearchQuery {
  query?: string;
  contentTypes?: ContentType[];
  subjectIds?: string[];
  yearLevels?: string[];
  curriculumFramework?: string;
  priceRange?: { min: number; max: number };
  minRating?: number;
  sortBy?: 'relevance' | 'newest' | 'bestselling' | 'rating' | 'price_low' | 'price_high';
  page?: number;
  pageSize?: number;
}

export interface ReviewRepository {
  findByContent(tenantId: string, contentId: string): Promise<ContentReview[]>;
  findByReviewer(tenantId: string, reviewerId: string): Promise<ContentReview[]>;
  save(tenantId: string, review: ContentReview): Promise<ContentReview>;
}

export interface RequestRepository {
  findById(tenantId: string, id: string): Promise<LearningAssetRequest | null>;
  findOpen(tenantId: string, filters?: RequestFilters): Promise<LearningAssetRequest[]>;
  findTrending(tenantId: string, limit: number): Promise<LearningAssetRequest[]>;
  save(tenantId: string, request: LearningAssetRequest): Promise<LearningAssetRequest>;
  update(tenantId: string, id: string, updates: Partial<LearningAssetRequest>): Promise<LearningAssetRequest>;
}

export interface RequestFilters {
  contentTypes?: ContentType[];
  subjectIds?: string[];
  yearLevels?: string[];
  minVotes?: number;
}

export interface PurchaseRepository {
  findByUser(tenantId: string, userId: string): Promise<Purchase[]>;
  findByContent(tenantId: string, contentId: string): Promise<Purchase[]>;
  save(tenantId: string, purchase: Purchase): Promise<Purchase>;
}

export interface Purchase {
  id: string;
  tenantId: string;
  buyerId: string;
  contentId: string;
  creatorId: string;
  amount: number;
  platformFee: number;
  creatorEarnings: number;
  tokenRewards: number;
  purchasedAt: Date;
}

export interface CreatorProfileRepository {
  findByUser(tenantId: string, userId: string): Promise<CreatorProfile | null>;
  save(tenantId: string, profile: CreatorProfile): Promise<CreatorProfile>;
  getTopCreators(tenantId: string, limit: number): Promise<CreatorProfile[]>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class ContentMarketplaceService extends ScholarlyBaseService {
  private readonly contentRepo: ContentRepository;
  private readonly reviewRepo: ReviewRepository;
  private readonly requestRepo: RequestRepository;
  private readonly purchaseRepo: PurchaseRepository;
  private readonly creatorRepo: CreatorProfileRepository;

  constructor(deps: {
    eventBus: EventBus; cache: Cache; config: ScholarlyConfig;
    contentRepo: ContentRepository; reviewRepo: ReviewRepository;
    requestRepo: RequestRepository; purchaseRepo: PurchaseRepository;
    creatorRepo: CreatorProfileRepository;
  }) {
    super('ContentMarketplaceService', deps);
    this.contentRepo = deps.contentRepo;
    this.reviewRepo = deps.reviewRepo;
    this.requestRepo = deps.requestRepo;
    this.purchaseRepo = deps.purchaseRepo;
    this.creatorRepo = deps.creatorRepo;
  }

  async searchContent(tenantId: string, query: ContentSearchQuery): Promise<Result<{
    items: ContentItem[];
    total: number;
    page: number;
    pageSize: number;
  }>> {
    try { Validator.tenantId(tenantId); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('searchContent', tenantId, async () => {
      const result = await this.contentRepo.search(tenantId, {
        ...query,
        page: query.page || 1,
        pageSize: query.pageSize || 20
      });

      return {
        items: result.items,
        total: result.total,
        page: query.page || 1,
        pageSize: query.pageSize || 20
      };
    }, { query: query.query });
  }

  async getTrendingContent(tenantId: string, limit = 10): Promise<Result<ContentItem[]>> {
    try { Validator.tenantId(tenantId); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getTrendingContent', tenantId, async () => {
      return await this.contentRepo.findTrending(tenantId, limit);
    }, {});
  }

  async getContent(tenantId: string, contentId: string): Promise<Result<{
    content: ContentItem;
    creator: CreatorProfile;
    reviews: ContentReview[];
  }>> {
    try { Validator.tenantId(tenantId); Validator.required(contentId, 'contentId'); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getContent', tenantId, async () => {
      const content = await this.contentRepo.findById(tenantId, contentId);
      if (!content) throw new NotFoundError('Content', contentId);

      const creator = await this.creatorRepo.findByUser(tenantId, content.creatorId);
      if (!creator) throw new NotFoundError('Creator', content.creatorId);

      const reviews = await this.reviewRepo.findByContent(tenantId, contentId);

      content.metrics.views++;
      await this.contentRepo.update(tenantId, contentId, { metrics: content.metrics });

      return { content, creator, reviews };
    }, { contentId });
  }

  async createContent(tenantId: string, creatorId: string, data: {
    title: string;
    description: string;
    shortDescription: string;
    type: ContentType;
    subjectIds: string[];
    yearLevels: string[];
    curriculumAlignments?: CurriculumAlignment[];
    tags: string[];
    previewImages: string[];
    files: ContentFile[];
    pricing: ContentPricing;
    license: ContentLicense;
  }): Promise<Result<ContentItem>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(creatorId);
      Validator.required(data.title, 'title');
      Validator.required(data.description, 'description');
    } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('createContent', tenantId, async () => {
      const content: ContentItem = {
        id: this.generateId('content'),
        tenantId,
        creatorId,
        title: data.title,
        description: data.description,
        shortDescription: data.shortDescription,
        type: data.type,
        subjectIds: data.subjectIds,
        yearLevels: data.yearLevels,
        curriculumAlignments: data.curriculumAlignments || [],
        tags: data.tags,
        previewImages: data.previewImages,
        files: data.files,
        pricing: data.pricing,
        metrics: { views: 0, downloads: 0, purchases: 0, revenue: 0, averageRating: 0, ratingCount: 0, wishlistCount: 0 },
        status: 'draft',
        license: data.license,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.contentRepo.save(tenantId, content);

      await this.publishEvent('scholarly.content.created', tenantId, {
        contentId: saved.id, creatorId, type: data.type
      });

      return saved;
    }, { creatorId, type: data.type });
  }

  async submitForReview(tenantId: string, contentId: string, creatorId: string): Promise<Result<ContentItem>> {
    try { Validator.tenantId(tenantId); Validator.required(contentId, 'contentId'); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('submitForReview', tenantId, async () => {
      const content = await this.contentRepo.findById(tenantId, contentId);
      if (!content) throw new NotFoundError('Content', contentId);
      if (content.creatorId !== creatorId) throw new AuthorizationError('Not content creator');
      if (content.status !== 'draft') throw new ValidationError('Content not in draft status');

      content.status = 'pending_review';
      content.updatedAt = new Date();

      const updated = await this.contentRepo.update(tenantId, contentId, content);

      await this.publishEvent('scholarly.content.submitted_for_review', tenantId, { contentId });

      return updated;
    }, { contentId });
  }

  async approveContent(tenantId: string, contentId: string): Promise<Result<ContentItem>> {
    try { Validator.tenantId(tenantId); Validator.required(contentId, 'contentId'); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('approveContent', tenantId, async () => {
      const content = await this.contentRepo.findById(tenantId, contentId);
      if (!content) throw new NotFoundError('Content', contentId);

      content.status = 'published';
      content.publishedAt = new Date();
      content.updatedAt = new Date();

      const updated = await this.contentRepo.update(tenantId, contentId, content);

      const creator = await this.creatorRepo.findByUser(tenantId, content.creatorId);
      if (creator) {
        creator.totalItems++;
        await this.creatorRepo.save(tenantId, creator);
      }

      await this.publishEvent('scholarly.content.published', tenantId, {
        contentId, creatorId: content.creatorId
      });

      return updated;
    }, { contentId });
  }

  async purchaseContent(tenantId: string, buyerId: string, contentId: string): Promise<Result<{
    purchase: Purchase;
    downloadUrls: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(buyerId);
      Validator.required(contentId, 'contentId');
    } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('purchaseContent', tenantId, async () => {
      const content = await this.contentRepo.findById(tenantId, contentId);
      if (!content) throw new NotFoundError('Content', contentId);
      if (content.status !== 'published') throw new ValidationError('Content not available');

      const existingPurchases = await this.purchaseRepo.findByUser(tenantId, buyerId);
      if (existingPurchases.some(p => p.contentId === contentId)) {
        throw new ValidationError('Already purchased');
      }

      const price = content.pricing.discountPrice || content.pricing.price;
      const platformFee = price * 0.15;
      const creatorEarnings = price - platformFee;
      const tokenRewards = Math.round(price * 0.01);

      const purchase: Purchase = {
        id: this.generateId('purchase'),
        tenantId,
        buyerId,
        contentId,
        creatorId: content.creatorId,
        amount: price,
        platformFee,
        creatorEarnings,
        tokenRewards,
        purchasedAt: new Date()
      };

      await this.purchaseRepo.save(tenantId, purchase);

      content.metrics.purchases++;
      content.metrics.revenue += price;
      await this.contentRepo.update(tenantId, contentId, { metrics: content.metrics });

      const creator = await this.creatorRepo.findByUser(tenantId, content.creatorId);
      if (creator) {
        creator.totalSales++;
        creator.totalRevenue += creatorEarnings;
        creator.creatorLevel = this.calculateCreatorLevel(creator);
        await this.creatorRepo.save(tenantId, creator);
      }

      const downloadUrls = content.files.filter(f => !f.isPreview).map(f => f.url);

      await this.publishEvent('scholarly.content.purchased', tenantId, {
        contentId, buyerId, creatorId: content.creatorId, amount: price
      });

      return { purchase, downloadUrls };
    }, { buyerId, contentId });
  }

  async getPurchasedContent(tenantId: string, userId: string): Promise<Result<{
    purchases: Purchase[];
    content: ContentItem[];
  }>> {
    try { Validator.tenantId(tenantId); Validator.userId(userId); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getPurchasedContent', tenantId, async () => {
      const purchases = await this.purchaseRepo.findByUser(tenantId, userId);
      const contentIds = purchases.map(p => p.contentId);

      const content: ContentItem[] = [];
      for (const id of contentIds) {
        const item = await this.contentRepo.findById(tenantId, id);
        if (item) content.push(item);
      }

      return { purchases, content };
    }, { userId });
  }

  async submitReview(tenantId: string, reviewerId: string, contentId: string, data: {
    rating: 1 | 2 | 3 | 4 | 5;
    title: string;
    comment: string;
  }): Promise<Result<ContentReview>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(reviewerId);
      Validator.required(contentId, 'contentId');
    } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('submitReview', tenantId, async () => {
      const purchases = await this.purchaseRepo.findByUser(tenantId, reviewerId);
      const hasPurchased = purchases.some(p => p.contentId === contentId);

      const review: ContentReview = {
        id: this.generateId('review'),
        contentId,
        reviewerId,
        rating: data.rating,
        title: data.title,
        comment: data.comment,
        helpfulVotes: 0,
        verifiedPurchase: hasPurchased,
        createdAt: new Date()
      };

      const saved = await this.reviewRepo.save(tenantId, review);

      const content = await this.contentRepo.findById(tenantId, contentId);
      if (content) {
        const newTotal = content.metrics.averageRating * content.metrics.ratingCount + data.rating;
        content.metrics.ratingCount++;
        content.metrics.averageRating = newTotal / content.metrics.ratingCount;
        await this.contentRepo.update(tenantId, contentId, { metrics: content.metrics });
      }

      await this.publishEvent('scholarly.content.reviewed', tenantId, {
        contentId, reviewerId, rating: data.rating
      });

      return saved;
    }, { reviewerId, contentId });
  }

  async createRequest(tenantId: string, requesterId: string, data: {
    title: string;
    description: string;
    contentType: ContentType;
    subjectIds: string[];
    yearLevels: string[];
    curriculumCodes?: string[];
    maxPrice?: number;
    neededBy?: Date;
  }): Promise<Result<LearningAssetRequest>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(requesterId);
      Validator.required(data.title, 'title');
    } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('createRequest', tenantId, async () => {
      const request: LearningAssetRequest = {
        id: this.generateId('request'),
        tenantId,
        requesterId,
        title: data.title,
        description: data.description,
        contentType: data.contentType,
        subjectIds: data.subjectIds,
        yearLevels: data.yearLevels,
        curriculumCodes: data.curriculumCodes,
        maxPrice: data.maxPrice,
        currency: 'AUD',
        votes: [{ userId: requesterId, voteType: 'want', votedAt: new Date() }],
        voteCount: 1,
        status: 'open',
        neededBy: data.neededBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const saved = await this.requestRepo.save(tenantId, request);

      await this.publishEvent('scholarly.request.created', tenantId, {
        requestId: saved.id, contentType: data.contentType
      });

      return saved;
    }, { requesterId });
  }

  async voteOnRequest(tenantId: string, requestId: string, userId: string, voteData: {
    voteType: 'want' | 'need_urgently';
    yearLevel?: string;
    comment?: string;
  }): Promise<Result<LearningAssetRequest>> {
    try { Validator.tenantId(tenantId); Validator.required(requestId, 'requestId'); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('voteOnRequest', tenantId, async () => {
      const request = await this.requestRepo.findById(tenantId, requestId);
      if (!request) throw new NotFoundError('Request', requestId);
      if (request.status !== 'open') throw new ValidationError('Request not open for voting');

      if (request.votes.some(v => v.userId === userId)) {
        throw new ValidationError('Already voted');
      }

      request.votes.push({
        userId,
        voteType: voteData.voteType,
        yearLevel: voteData.yearLevel,
        comment: voteData.comment,
        votedAt: new Date()
      });
      request.voteCount++;
      request.updatedAt = new Date();

      const updated = await this.requestRepo.update(tenantId, requestId, request);

      await this.publishEvent('scholarly.request.voted', tenantId, {
        requestId, userId, voteCount: request.voteCount
      });

      return updated;
    }, { requestId, userId });
  }

  async getTrendingRequests(tenantId: string, limit = 20): Promise<Result<LearningAssetRequest[]>> {
    try { Validator.tenantId(tenantId); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getTrendingRequests', tenantId, async () => {
      return await this.requestRepo.findTrending(tenantId, limit);
    }, {});
  }

  async fulfillRequest(tenantId: string, requestId: string, contentId: string): Promise<Result<LearningAssetRequest>> {
    try { Validator.tenantId(tenantId); Validator.required(requestId, 'requestId'); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('fulfillRequest', tenantId, async () => {
      const request = await this.requestRepo.findById(tenantId, requestId);
      if (!request) throw new NotFoundError('Request', requestId);

      const content = await this.contentRepo.findById(tenantId, contentId);
      if (!content) throw new NotFoundError('Content', contentId);

      request.status = 'fulfilled';
      request.fulfilledByContentId = contentId;
      request.updatedAt = new Date();

      const updated = await this.requestRepo.update(tenantId, requestId, request);

      await this.publishEvent('scholarly.request.fulfilled', tenantId, {
        requestId, contentId, voterIds: request.votes.map(v => v.userId)
      });

      return updated;
    }, { requestId, contentId });
  }

  async getCreatorDashboard(tenantId: string, creatorId: string): Promise<Result<{
    profile: CreatorProfile;
    content: ContentItem[];
    recentSales: Purchase[];
    totalEarnings: number;
    pendingEarnings: number;
  }>> {
    try { Validator.tenantId(tenantId); Validator.userId(creatorId); }
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getCreatorDashboard', tenantId, async () => {
      let profile = await this.creatorRepo.findByUser(tenantId, creatorId);
      if (!profile) {
        profile = this.initializeCreatorProfile(creatorId, tenantId);
        await this.creatorRepo.save(tenantId, profile);
      }

      const content = await this.contentRepo.findByCreator(tenantId, creatorId);

      const recentSales: Purchase[] = [];
      for (const item of content) {
        const sales = await this.purchaseRepo.findByContent(tenantId, item.id);
        recentSales.push(...sales);
      }
      recentSales.sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime());

      return {
        profile,
        content,
        recentSales: recentSales.slice(0, 20),
        totalEarnings: profile.totalRevenue,
        pendingEarnings: 0
      };
    }, { creatorId });
  }

  private initializeCreatorProfile(userId: string, tenantId: string): CreatorProfile {
    return {
      userId,
      tenantId,
      displayName: 'New Creator',
      bio: '',
      specializations: [],
      totalItems: 0,
      totalSales: 0,
      totalRevenue: 0,
      averageRating: 0,
      followerCount: 0,
      creatorLevel: 'new',
      joinedAt: new Date()
    };
  }

  private calculateCreatorLevel(creator: CreatorProfile): CreatorProfile['creatorLevel'] {
    if (creator.totalSales >= 1000 && creator.averageRating >= 4.5) return 'featured';
    if (creator.totalSales >= 500) return 'top';
    if (creator.totalSales >= 100) return 'established';
    if (creator.totalSales >= 10) return 'rising';
    return 'new';
  }
}
