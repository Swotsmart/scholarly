/**
 * Scholarly Developer Marketplace Service
 *
 * Manages the app store ecosystem where developers build experiences for
 * the Scholarly community, and users can request and fund new features.
 *
 * @module DeveloperMarketplaceService
 */

import { ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError, AuthorizationError, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

import {
  EthAddress, TxHash, TokenAmount,
  DeveloperAccount, DeveloperAccountType, DeveloperVerificationStatus,
  MarketplaceApp, AppCategory, AppType, AppReviewStatus,
  AppInstallation, AppReview, AppVersion,
  CommunityRequest, RequestStatus, BountyStatus, RequestRequirement,
  FundingPledge, BountyClaim, ClaimMilestone, DeveloperPayout, AppTargetAudience
} from './phase4-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface DeveloperAccountRepository {
  findById(tenantId: string, id: string): Promise<DeveloperAccount | null>;
  findByUserId(tenantId: string, userId: string): Promise<DeveloperAccount | null>;
  findAll(tenantId: string, status?: string, limit?: number): Promise<DeveloperAccount[]>;
  create(tenantId: string, account: Omit<DeveloperAccount, 'id' | 'createdAt' | 'updatedAt'>): Promise<DeveloperAccount>;
  update(tenantId: string, id: string, updates: Partial<DeveloperAccount>): Promise<DeveloperAccount>;
}

export interface MarketplaceAppRepository {
  findById(tenantId: string, id: string): Promise<MarketplaceApp | null>;
  findBySlug(tenantId: string, slug: string): Promise<MarketplaceApp | null>;
  findByDeveloper(tenantId: string, developerId: string, limit?: number): Promise<MarketplaceApp[]>;
  findByCategory(tenantId: string, category: AppCategory, limit?: number, offset?: number): Promise<MarketplaceApp[]>;
  findPublished(tenantId: string, limit?: number, offset?: number): Promise<MarketplaceApp[]>;
  findFeatured(tenantId: string, limit?: number): Promise<MarketplaceApp[]>;
  search(tenantId: string, query: string, filters?: Partial<{ category: AppCategory; appType: AppType }>, limit?: number): Promise<MarketplaceApp[]>;
  create(tenantId: string, app: Omit<MarketplaceApp, 'id' | 'createdAt' | 'updatedAt'>): Promise<MarketplaceApp>;
  update(tenantId: string, id: string, updates: Partial<MarketplaceApp>): Promise<MarketplaceApp>;
}

export interface AppInstallationRepository {
  findById(tenantId: string, id: string): Promise<AppInstallation | null>;
  findByAppAndScope(tenantId: string, appId: string, scopeId: string): Promise<AppInstallation | null>;
  findByScope(tenantId: string, scopeId: string): Promise<AppInstallation[]>;
  create(tenantId: string, installation: Omit<AppInstallation, 'id' | 'installedAt' | 'updatedAt'>): Promise<AppInstallation>;
  update(tenantId: string, id: string, updates: Partial<AppInstallation>): Promise<AppInstallation>;
  countByApp(tenantId: string, appId: string): Promise<number>;
  countActiveByApp(tenantId: string, appId: string): Promise<number>;
}

export interface AppReviewRepository {
  findById(tenantId: string, id: string): Promise<AppReview | null>;
  findByApp(tenantId: string, appId: string, limit?: number): Promise<AppReview[]>;
  create(tenantId: string, review: Omit<AppReview, 'id' | 'createdAt' | 'updatedAt'>): Promise<AppReview>;
  update(tenantId: string, id: string, updates: Partial<AppReview>): Promise<AppReview>;
  getAverageRating(tenantId: string, appId: string): Promise<number>;
  countByApp(tenantId: string, appId: string): Promise<number>;
}

export interface CommunityRequestRepository {
  findById(tenantId: string, id: string): Promise<CommunityRequest | null>;
  findByStatus(tenantId: string, status: RequestStatus, limit?: number, offset?: number): Promise<CommunityRequest[]>;
  findFunding(tenantId: string, limit?: number, offset?: number): Promise<CommunityRequest[]>;
  findTopVoted(tenantId: string, limit?: number): Promise<CommunityRequest[]>;
  search(tenantId: string, query: string, category?: AppCategory): Promise<CommunityRequest[]>;
  create(tenantId: string, request: Omit<CommunityRequest, 'id' | 'createdAt' | 'updatedAt'>): Promise<CommunityRequest>;
  update(tenantId: string, id: string, updates: Partial<CommunityRequest>): Promise<CommunityRequest>;
}

export interface FundingPledgeRepository {
  findByRequest(tenantId: string, requestId: string): Promise<FundingPledge[]>;
  create(tenantId: string, pledge: Omit<FundingPledge, 'id'>): Promise<FundingPledge>;
  update(tenantId: string, id: string, updates: Partial<FundingPledge>): Promise<FundingPledge>;
  sumByRequest(tenantId: string, requestId: string, status?: string): Promise<TokenAmount>;
}

export interface BountyClaimRepository {
  findById(tenantId: string, id: string): Promise<BountyClaim | null>;
  findByRequest(tenantId: string, requestId: string): Promise<BountyClaim[]>;
  findAccepted(tenantId: string, requestId: string): Promise<BountyClaim | null>;
  create(tenantId: string, claim: Omit<BountyClaim, 'id' | 'submittedAt' | 'updatedAt'>): Promise<BountyClaim>;
  update(tenantId: string, id: string, updates: Partial<BountyClaim>): Promise<BountyClaim>;
}

export interface DeveloperPayoutRepository {
  findByDeveloper(tenantId: string, developerId: string, limit?: number): Promise<DeveloperPayout[]>;
  create(tenantId: string, payout: Omit<DeveloperPayout, 'id'>): Promise<DeveloperPayout>;
  sumPendingByDeveloper(tenantId: string, developerId: string): Promise<TokenAmount>;
}

// ============================================================================
// EXTERNAL SERVICE INTERFACES
// ============================================================================

export interface PaymentProvider {
  lockFunds(tenantId: string, wallet: EthAddress, amount: TokenAmount, reason: string): Promise<TxHash>;
  releaseFunds(tenantId: string, from: EthAddress, to: EthAddress, amount: TokenAmount): Promise<TxHash>;
  processAppPurchase(tenantId: string, buyer: EthAddress, seller: EthAddress, amount: TokenAmount, platformFee: TokenAmount): Promise<TxHash>;
}

export interface MarketplaceWalletProvider {
  getConnectedWallet(userId: string): Promise<EthAddress | null>;
}

export interface NotificationProvider {
  notifyDeveloper(developerId: string, type: string, data: Record<string, any>): Promise<void>;
  notifyUser(userId: string, type: string, data: Record<string, any>): Promise<void>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class DeveloperMarketplaceService extends ScholarlyBaseService {
  constructor(
    deps: ServiceDependencies & Record<string, unknown>,
    private readonly repos: {
      developerRepo: DeveloperAccountRepository;
      appRepo: MarketplaceAppRepository;
      installationRepo: AppInstallationRepository;
      reviewRepo: AppReviewRepository;
      requestRepo: CommunityRequestRepository;
      pledgeRepo: FundingPledgeRepository;
      claimRepo: BountyClaimRepository;
      payoutRepo: DeveloperPayoutRepository;
    },
    private readonly providers: {
      paymentProvider: PaymentProvider;
      walletProvider: MarketplaceWalletProvider;
      notificationProvider: NotificationProvider;
    }
  ) {
    super('DeveloperMarketplaceService', deps);
  }

  // ==========================================================================
  // DEVELOPER ACCOUNTS
  // ==========================================================================

  async registerDeveloper(
    tenantId: string,
    data: {
      userId: string;
      name: string;
      displayName: string;
      description: string;
      accountType: DeveloperAccountType;
      supportEmail: string;
      websiteUrl?: string;
    }
  ): Promise<Result<DeveloperAccount>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.userId) {
      return failure(new ValidationError('userId is required'));
    }
    if (!data.name) {
      return failure(new ValidationError('name is required'));
    }

    return this.withTiming('registerDeveloper', async () => {
      const existing = await this.repos.developerRepo.findByUserId(tenantId, data.userId);
      if (existing) throw new ValidationError('Already registered');

      const wallet = await this.providers.walletProvider.getConnectedWallet(data.userId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const developer = await this.repos.developerRepo.create(tenantId, {
        tenantId,
        userId: data.userId,
        walletAddress: wallet,
        name: data.name,
        displayName: data.displayName,
        description: data.description,
        accountType: data.accountType,
        supportEmail: data.supportEmail,
        websiteUrl: data.websiteUrl,
        verificationStatus: DeveloperVerificationStatus.UNVERIFIED,
        developerAgreementSignedAt: new Date(),
        revenueSharePercent: 70,
        totalApps: 0,
        totalDownloads: 0,
        totalRevenue: BigInt(0),
        averageRating: 0,
        status: 'pending_review'
      });

      await this.publishEvent('scholarly.marketplace.developer_registered', tenantId, {
        developerId: developer.id, name: data.name
      });

      return success(developer);
    });
  }

  async verifyDeveloper(tenantId: string, developerId: string, approved: boolean): Promise<Result<DeveloperAccount>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!developerId) {
      return failure(new ValidationError('developerId is required'));
    }

    return this.withTiming('verifyDeveloper', async () => {
      const developer = await this.repos.developerRepo.findById(tenantId, developerId);
      if (!developer) throw new NotFoundError('Developer', developerId);

      const updated = await this.repos.developerRepo.update(tenantId, developerId, {
        verificationStatus: approved ? DeveloperVerificationStatus.VERIFIED : DeveloperVerificationStatus.REJECTED,
        verifiedAt: approved ? new Date() : undefined,
        status: approved ? 'active' : 'suspended',
        updatedAt: new Date()
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // APP MANAGEMENT
  // ==========================================================================

  async createApp(
    tenantId: string,
    data: {
      developerId: string;
      name: string;
      tagline: string;
      description: string;
      category: AppCategory;
      appType: AppType;
      iconUrl: string;
      screenshotUrls: string[];
      pricingModel: MarketplaceApp['pricingModel'];
    }
  ): Promise<Result<MarketplaceApp>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.developerId) {
      return failure(new ValidationError('developerId is required'));
    }
    if (!data.name) {
      return failure(new ValidationError('name is required'));
    }

    return this.withTiming('createApp', async () => {
      const developer = await this.repos.developerRepo.findById(tenantId, data.developerId);
      if (!developer) throw new NotFoundError('Developer', data.developerId);
      if (developer.status !== 'active') throw new ValidationError('Developer not active');

      const slug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '-' + Date.now().toString(36);

      const app = await this.repos.appRepo.create(tenantId, {
        tenantId,
        developerId: data.developerId,
        developerName: developer.displayName,
        name: data.name,
        slug,
        tagline: data.tagline,
        description: data.description,
        category: data.category,
        subcategories: [],
        tags: [],
        targetAudience: { roles: [], educationLevels: [], contexts: [] },
        iconUrl: data.iconUrl,
        screenshotUrls: data.screenshotUrls,
        appType: data.appType,
        platformSupport: { web: true, ios: false, android: false, desktop: false, webXR: false, quest: false, visionPro: false, offlineCapable: false },
        integrationPoints: [],
        permissions: [],
        currentVersion: '0.0.1',
        versionHistory: [],
        pricingModel: data.pricingModel,
        hasTrial: false,
        reviewStatus: AppReviewStatus.NOT_SUBMITTED,
        totalInstalls: 0,
        activeInstalls: 0,
        totalRevenue: BigInt(0),
        rating: 0,
        reviewCount: 0,
        isFeatured: false,
        isEditorChoice: false,
        isVerified: false,
        status: 'draft'
      });

      await this.publishEvent('scholarly.marketplace.app_created', tenantId, { appId: app.id, name: data.name });
      return success(app);
    });
  }

  async submitAppForReview(tenantId: string, appId: string, version: AppVersion): Promise<Result<MarketplaceApp>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!appId) {
      return failure(new ValidationError('appId is required'));
    }

    return this.withTiming('submitAppForReview', async () => {
      const app = await this.repos.appRepo.findById(tenantId, appId);
      if (!app) throw new NotFoundError('App', appId);

      const updated = await this.repos.appRepo.update(tenantId, appId, {
        currentVersion: version.version,
        versionHistory: [...app.versionHistory, { ...version, reviewStatus: AppReviewStatus.PENDING }],
        reviewStatus: AppReviewStatus.PENDING,
        status: 'pending_review',
        updatedAt: new Date()
      });

      return success(updated);
    });
  }

  async reviewApp(
    tenantId: string,
    data: { appId: string; reviewerId: string; decision: 'approved' | 'rejected' | 'changes_requested'; notes?: string }
  ): Promise<Result<MarketplaceApp>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.appId) {
      return failure(new ValidationError('appId is required'));
    }

    return this.withTiming('reviewApp', async () => {
      const app = await this.repos.appRepo.findById(tenantId, data.appId);
      if (!app) throw new NotFoundError('App', data.appId);

      const reviewStatus = data.decision === 'approved' ? AppReviewStatus.APPROVED
        : data.decision === 'rejected' ? AppReviewStatus.REJECTED : AppReviewStatus.CHANGES_REQUESTED;

      const updated = await this.repos.appRepo.update(tenantId, data.appId, {
        reviewStatus,
        reviewNotes: data.notes,
        lastReviewedAt: new Date(),
        reviewedBy: data.reviewerId,
        status: data.decision === 'approved' ? 'published' : 'draft',
        publishedAt: data.decision === 'approved' ? new Date() : undefined,
        isVerified: data.decision === 'approved'
      });

      if (data.decision === 'approved') {
        const developer = await this.repos.developerRepo.findById(tenantId, app.developerId);
        if (developer) {
          await this.repos.developerRepo.update(tenantId, app.developerId, { totalApps: developer.totalApps + 1 });
        }
      }

      return success(updated);
    });
  }

  async searchApps(
    tenantId: string,
    options: { query?: string; category?: AppCategory; limit?: number; offset?: number } = {}
  ): Promise<Result<{ apps: MarketplaceApp[]; total: number }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }

    return this.withTiming('searchApps', async () => {
      const { limit = 20 } = options;
      let apps: MarketplaceApp[];

      if (options.query) {
        apps = await this.repos.appRepo.search(tenantId, options.query, { category: options.category }, limit);
      } else if (options.category) {
        apps = await this.repos.appRepo.findByCategory(tenantId, options.category, limit, options.offset);
      } else {
        apps = await this.repos.appRepo.findPublished(tenantId, limit, options.offset);
      }

      return success({ apps, total: apps.length });
    });
  }

  async getApp(tenantId: string, appIdOrSlug: string): Promise<Result<MarketplaceApp>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!appIdOrSlug) {
      return failure(new ValidationError('appIdOrSlug is required'));
    }

    return this.withTiming('getApp', async () => {
      let app = await this.repos.appRepo.findById(tenantId, appIdOrSlug);
      if (!app) app = await this.repos.appRepo.findBySlug(tenantId, appIdOrSlug);
      if (!app) throw new NotFoundError('App', appIdOrSlug);
      return success(app);
    });
  }

  // ==========================================================================
  // APP INSTALLATION
  // ==========================================================================

  async installApp(
    tenantId: string,
    data: { appId: string; userId: string; installScope: AppInstallation['installScope']; scopeId: string; grantedPermissions: string[] }
  ): Promise<Result<AppInstallation>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.appId) {
      return failure(new ValidationError('appId is required'));
    }
    if (!data.userId) {
      return failure(new ValidationError('userId is required'));
    }

    return this.withTiming('installApp', async () => {
      const app = await this.repos.appRepo.findById(tenantId, data.appId);
      if (!app) throw new NotFoundError('App', data.appId);
      if (app.status !== 'published') throw new ValidationError('App not available');

      const existing = await this.repos.installationRepo.findByAppAndScope(tenantId, data.appId, data.scopeId);
      if (existing && existing.status === 'active') throw new ValidationError('Already installed');

      // Handle paid apps
      if (app.pricingModel.type === 'paid' && app.pricingModel.oneTimePrice) {
        const wallet = await this.providers.walletProvider.getConnectedWallet(data.userId);
        if (!wallet) throw new AuthorizationError('No wallet connected');

        const developer = await this.repos.developerRepo.findById(tenantId, app.developerId);
        if (!developer) throw new NotFoundError('Developer', app.developerId);

        const price = app.pricingModel.oneTimePrice;
        const platformFee = (price * BigInt(30)) / BigInt(100);

        await this.providers.paymentProvider.processAppPurchase(tenantId, wallet, developer.walletAddress, price, platformFee);
        await this.repos.appRepo.update(tenantId, data.appId, { totalRevenue: app.totalRevenue + price });
      }

      const installation = await this.repos.installationRepo.create(tenantId, {
        tenantId,
        appId: data.appId,
        appVersion: app.currentVersion,
        installedBy: data.userId,
        installScope: data.installScope,
        scopeId: data.scopeId,
        grantedPermissions: data.grantedPermissions,
        usageCount: 0,
        status: 'active'
      });

      const totalInstalls = await this.repos.installationRepo.countByApp(tenantId, data.appId);
      const activeInstalls = await this.repos.installationRepo.countActiveByApp(tenantId, data.appId);
      await this.repos.appRepo.update(tenantId, data.appId, { totalInstalls, activeInstalls });

      await this.publishEvent('scholarly.marketplace.app_installed', tenantId, { appId: data.appId, userId: data.userId });
      return success(installation);
    });
  }

  // ==========================================================================
  // APP REVIEWS
  // ==========================================================================

  async submitAppReview(
    tenantId: string,
    data: { appId: string; reviewerId: string; reviewerName: string; reviewerRole: AppReview['reviewerRole']; rating: 1|2|3|4|5; title: string; content: string }
  ): Promise<Result<AppReview>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.appId) {
      return failure(new ValidationError('appId is required'));
    }

    return this.withTiming('submitAppReview', async () => {
      const app = await this.repos.appRepo.findById(tenantId, data.appId);
      if (!app) throw new NotFoundError('App', data.appId);

      const installations = await this.repos.installationRepo.findByScope(tenantId, data.reviewerId);
      const hasInstalled = installations.some(i => i.appId === data.appId);

      const review = await this.repos.reviewRepo.create(tenantId, {
        appId: data.appId,
        reviewerId: data.reviewerId,
        reviewerName: data.reviewerName,
        reviewerRole: data.reviewerRole,
        rating: data.rating,
        title: data.title,
        content: data.content,
        helpfulCount: 0,
        notHelpfulCount: 0,
        isVerifiedPurchase: hasInstalled,
        isHidden: false
      });

      const avgRating = await this.repos.reviewRepo.getAverageRating(tenantId, data.appId);
      const reviewCount = await this.repos.reviewRepo.countByApp(tenantId, data.appId);
      await this.repos.appRepo.update(tenantId, data.appId, { rating: avgRating, reviewCount });

      return success(review);
    });
  }

  // ==========================================================================
  // COMMUNITY REQUESTS & BOUNTIES
  // ==========================================================================

  async createCommunityRequest(
    tenantId: string,
    data: {
      requesterId: string;
      requesterName: string;
      title: string;
      description: string;
      category: AppCategory;
      requirements: RequestRequirement[];
      targetAudience: AppTargetAudience;
      fundingGoal: TokenAmount;
      fundingDeadline?: Date;
    }
  ): Promise<Result<CommunityRequest>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.requesterId) {
      return failure(new ValidationError('requesterId is required'));
    }
    if (!data.title) {
      return failure(new ValidationError('title is required'));
    }
    if (data.fundingGoal <= BigInt(0)) {
      return failure(new ValidationError('Funding goal must be positive'));
    }

    return this.withTiming('createCommunityRequest', async () => {
      const request = await this.repos.requestRepo.create(tenantId, {
        tenantId,
        requesterId: data.requesterId,
        requesterName: data.requesterName,
        title: data.title,
        description: data.description,
        category: data.category,
        requirements: data.requirements,
        targetAudience: data.targetAudience,
        fundingGoal: data.fundingGoal,
        currentFunding: BigInt(0),
        pledges: [],
        bountyStatus: BountyStatus.FUNDING,
        bountyAmount: BigInt(0),
        platformContribution: BigInt(0),
        upvotes: 0,
        downvotes: 0,
        voterIds: [],
        status: RequestStatus.PENDING_APPROVAL,
        isApproved: false,
        fundingDeadline: data.fundingDeadline
      });

      await this.publishEvent('scholarly.marketplace.request_created', tenantId, { requestId: request.id, title: data.title });
      return success(request);
    });
  }

  async pledgeToRequest(
    tenantId: string,
    data: { requestId: string; pledgerId: string; pledgerName: string; amount: TokenAmount }
  ): Promise<Result<FundingPledge>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.requestId) {
      return failure(new ValidationError('requestId is required'));
    }
    if (data.amount <= BigInt(0)) {
      return failure(new ValidationError('Amount must be positive'));
    }

    return this.withTiming('pledgeToRequest', async () => {
      const request = await this.repos.requestRepo.findById(tenantId, data.requestId);
      if (!request) throw new NotFoundError('Request', data.requestId);
      if (request.status !== RequestStatus.FUNDING) throw new ValidationError('Not accepting funding');

      const wallet = await this.providers.walletProvider.getConnectedWallet(data.pledgerId);
      if (!wallet) throw new AuthorizationError('No wallet connected');

      const txHash = await this.providers.paymentProvider.lockFunds(tenantId, wallet, data.amount, `Pledge for ${data.requestId}`);

      const pledge = await this.repos.pledgeRepo.create(tenantId, {
        requestId: data.requestId,
        pledgerId: data.pledgerId,
        pledgerName: data.pledgerName,
        walletAddress: wallet,
        amount: data.amount,
        status: 'locked',
        pledgeTxHash: txHash,
        pledgedAt: new Date(),
        lockedAt: new Date()
      });

      const totalPledged = await this.repos.pledgeRepo.sumByRequest(tenantId, data.requestId, 'locked');
      const updates: Partial<CommunityRequest> = {
        currentFunding: totalPledged,
        bountyAmount: totalPledged + request.platformContribution,
        pledges: [...request.pledges, pledge]
      };

      if (totalPledged >= request.fundingGoal) {
        updates.bountyStatus = BountyStatus.FUNDED;
        updates.status = RequestStatus.FUNDED;
      }

      await this.repos.requestRepo.update(tenantId, data.requestId, updates);

      await this.publishEvent('scholarly.marketplace.pledge_created', tenantId, {
        requestId: data.requestId, amount: data.amount.toString(), totalFunding: totalPledged.toString()
      });

      return success(pledge);
    });
  }

  async voteOnRequest(
    tenantId: string,
    data: { requestId: string; voterId: string; isUpvote: boolean }
  ): Promise<Result<CommunityRequest>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.requestId) {
      return failure(new ValidationError('requestId is required'));
    }

    return this.withTiming('voteOnRequest', async () => {
      const request = await this.repos.requestRepo.findById(tenantId, data.requestId);
      if (!request) throw new NotFoundError('Request', data.requestId);
      if (request.voterIds.includes(data.voterId)) throw new ValidationError('Already voted');

      const updated = await this.repos.requestRepo.update(tenantId, data.requestId, {
        upvotes: data.isUpvote ? request.upvotes + 1 : request.upvotes,
        downvotes: !data.isUpvote ? request.downvotes + 1 : request.downvotes,
        voterIds: [...request.voterIds, data.voterId]
      });

      return success(updated);
    });
  }

  async claimBounty(
    tenantId: string,
    data: {
      requestId: string;
      developerId: string;
      developerName: string;
      proposal: string;
      estimatedDeliveryDate: Date;
      proposedMilestones: Omit<ClaimMilestone, 'id' | 'status'>[];
      relevantExperience: string;
      portfolioLinks: string[];
    }
  ): Promise<Result<BountyClaim>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.requestId) {
      return failure(new ValidationError('requestId is required'));
    }
    if (!data.developerId) {
      return failure(new ValidationError('developerId is required'));
    }

    return this.withTiming('claimBounty', async () => {
      const request = await this.repos.requestRepo.findById(tenantId, data.requestId);
      if (!request) throw new NotFoundError('Request', data.requestId);
      if (request.bountyStatus !== BountyStatus.FUNDED) throw new ValidationError('Bounty not available');

      const developer = await this.repos.developerRepo.findById(tenantId, data.developerId);
      if (!developer || developer.status !== 'active') throw new ValidationError('Developer not active');

      const existingClaim = await this.repos.claimRepo.findAccepted(tenantId, data.requestId);
      if (existingClaim) throw new ValidationError('Already claimed');

      const milestones: ClaimMilestone[] = data.proposedMilestones.map((m, i) => ({ ...m, id: `milestone-${i + 1}`, status: 'pending' }));

      const claim = await this.repos.claimRepo.create(tenantId, {
        requestId: data.requestId,
        developerId: data.developerId,
        developerName: data.developerName,
        proposal: data.proposal,
        estimatedDeliveryDate: data.estimatedDeliveryDate,
        proposedMilestones: milestones,
        relevantExperience: data.relevantExperience,
        portfolioLinks: data.portfolioLinks,
        status: 'pending',
        communityVotes: { for: 0, against: 0, voterIds: [] }
      });

      await this.publishEvent('scholarly.marketplace.bounty_claimed', tenantId, { requestId: data.requestId, claimId: claim.id });
      return success(claim);
    });
  }

  async acceptBountyClaim(
    tenantId: string,
    data: { requestId: string; claimId: string; acceptedBy: string }
  ): Promise<Result<BountyClaim>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.claimId) {
      return failure(new ValidationError('claimId is required'));
    }

    return this.withTiming('acceptBountyClaim', async () => {
      const request = await this.repos.requestRepo.findById(tenantId, data.requestId);
      if (!request) throw new NotFoundError('Request', data.requestId);
      if (request.requesterId !== data.acceptedBy) throw new AuthorizationError('Only requester can accept');

      const claim = await this.repos.claimRepo.findById(tenantId, data.claimId);
      if (!claim) throw new NotFoundError('Claim', data.claimId);
      if (claim.status !== 'pending') throw new ValidationError('Claim not pending');

      const updatedClaim = await this.repos.claimRepo.update(tenantId, data.claimId, { status: 'accepted', acceptedAt: new Date() });

      await this.repos.requestRepo.update(tenantId, data.requestId, {
        bountyStatus: BountyStatus.CLAIMED,
        status: RequestStatus.IN_DEVELOPMENT,
        claimedBy: claim.developerId,
        claimedAt: new Date()
      });

      // Reject other claims
      const otherClaims = await this.repos.claimRepo.findByRequest(tenantId, data.requestId);
      for (const other of otherClaims) {
        if (other.id !== data.claimId && other.status === 'pending') {
          await this.repos.claimRepo.update(tenantId, other.id, { status: 'rejected' });
        }
      }

      await this.publishEvent('scholarly.marketplace.bounty_claim_accepted', tenantId, { requestId: data.requestId, claimId: data.claimId });
      return success(updatedClaim);
    });
  }

  async approveMilestone(
    tenantId: string,
    data: { requestId: string; claimId: string; milestoneId: string; approvedBy: string }
  ): Promise<Result<{ claim: BountyClaim; payoutAmount: TokenAmount }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!data.claimId) {
      return failure(new ValidationError('claimId is required'));
    }
    if (!data.milestoneId) {
      return failure(new ValidationError('milestoneId is required'));
    }

    return this.withTiming('approveMilestone', async () => {
      const request = await this.repos.requestRepo.findById(tenantId, data.requestId);
      if (!request) throw new NotFoundError('Request', data.requestId);
      if (request.requesterId !== data.approvedBy) throw new AuthorizationError('Only requester can approve');

      const claim = await this.repos.claimRepo.findById(tenantId, data.claimId);
      if (!claim) throw new NotFoundError('Claim', data.claimId);

      const milestone = claim.proposedMilestones.find(m => m.id === data.milestoneId);
      if (!milestone) throw new NotFoundError('Milestone', data.milestoneId);

      const payoutAmount = (request.bountyAmount * BigInt(milestone.paymentPercent)) / BigInt(100);

      const developer = await this.repos.developerRepo.findById(tenantId, claim.developerId);
      if (!developer) throw new NotFoundError('Developer', claim.developerId);

      await this.providers.paymentProvider.releaseFunds(
        tenantId, request.pledges[0]?.walletAddress || '0x0' as EthAddress, developer.walletAddress, payoutAmount
      );

      const milestones = claim.proposedMilestones.map(m =>
        m.id === data.milestoneId ? { ...m, status: 'approved' as const, approvedAt: new Date() } : m
      );

      const allComplete = milestones.every(m => m.status === 'approved');
      const updatedClaim = await this.repos.claimRepo.update(tenantId, data.claimId, { proposedMilestones: milestones });

      if (allComplete) {
        await this.repos.requestRepo.update(tenantId, data.requestId, {
          bountyStatus: BountyStatus.COMPLETED,
          status: RequestStatus.COMPLETED,
          actualDeliveryDate: new Date()
        });
      }

      await this.publishEvent('scholarly.marketplace.milestone_approved', tenantId, {
        requestId: data.requestId, milestoneId: data.milestoneId, payoutAmount: payoutAmount.toString()
      });

      return success({ claim: updatedClaim, payoutAmount });
    });
  }

  async getCommunityRequests(
    tenantId: string,
    options: { status?: RequestStatus; category?: AppCategory; sortBy?: 'votes' | 'funding' | 'recent'; limit?: number; offset?: number } = {}
  ): Promise<Result<{ requests: CommunityRequest[]; total: number }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }

    return this.withTiming('getCommunityRequests', async () => {
      const { limit = 20 } = options;
      let requests: CommunityRequest[];

      if (options.sortBy === 'votes') {
        requests = await this.repos.requestRepo.findTopVoted(tenantId, limit);
      } else if (options.status) {
        requests = await this.repos.requestRepo.findByStatus(tenantId, options.status, limit, options.offset);
      } else {
        requests = await this.repos.requestRepo.findFunding(tenantId, limit, options.offset);
      }

      return success({ requests, total: requests.length });
    });
  }

  async getDeveloperEarnings(tenantId: string, developerId: string): Promise<Result<{ totalEarned: TokenAmount; pendingPayout: TokenAmount; recentPayouts: DeveloperPayout[] }>> {
    if (!tenantId || tenantId.trim() === '') {
      return failure(new ValidationError('tenantId is required'));
    }
    if (!developerId) {
      return failure(new ValidationError('developerId is required'));
    }

    return this.withTiming('getDeveloperEarnings', async () => {
      const developer = await this.repos.developerRepo.findById(tenantId, developerId);
      if (!developer) throw new NotFoundError('Developer', developerId);

      const pendingPayout = await this.repos.payoutRepo.sumPendingByDeveloper(tenantId, developerId);
      const recentPayouts = await this.repos.payoutRepo.findByDeveloper(tenantId, developerId, 20);

      return success({ totalEarned: developer.totalRevenue, pendingPayout, recentPayouts });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: DeveloperMarketplaceService | null = null;

export function initializeDeveloperMarketplaceService(deps?: any): DeveloperMarketplaceService {
  if (!instance) {
    instance = new DeveloperMarketplaceService(deps, deps?.repos || {}, deps?.providers || {});
    log.info('DeveloperMarketplaceService initialized');
  }
  return instance;
}

export function getDeveloperMarketplaceService(): DeveloperMarketplaceService {
  if (!instance) {
    throw new Error('DeveloperMarketplaceService not initialized. Call initializeDeveloperMarketplaceService() first.');
  }
  return instance;
}
