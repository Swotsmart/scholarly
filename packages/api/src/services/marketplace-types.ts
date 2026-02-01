/**
 * Developer Marketplace Module - Type Definitions
 *
 * Enables a thriving ecosystem of third-party applications, integrations, and
 * educational tools built on the Scholarly platform.
 *
 * ## The Granny Explanation
 *
 * Remember how your phone has an App Store where you can download apps made by
 * different companies? The Developer Marketplace is like that for Scholarly:
 *
 * - **Schools** can find apps that add new features: "We need a music composition
 *   tool" -> find one in the marketplace -> install with one click
 *
 * - **Developers** can build apps that integrate with Scholarly's data (with
 *   permission): student progress, curriculum, assessments. They earn money
 *   when schools use their apps.
 *
 * - **Teachers** can request apps they wish existed. If enough teachers want
 *   something, developers see the demand and build it. Teachers can even put
 *   up "bounties" (rewards) for specific features.
 *
 * The AI helps by:
 * - Scanning apps for security vulnerabilities before approval
 * - Recommending apps based on what similar schools use
 * - Detecting if apps are misusing student data
 * - Matching teacher requests with developer capabilities
 *
 * @module IntelligenceMesh/DeveloperMarketplace
 * @version 1.7.0
 */

import { MeshBaseEntity } from './mesh-types-v17';

// ============================================================================
// CORE ENUMS
// ============================================================================

export type AppCategory =
  | 'assessment' | 'communication' | 'analytics' | 'content'
  | 'accessibility' | 'administration' | 'integration' | 'other';

export type AppStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'deprecated' | 'removed';

export type PricingModel = 'free' | 'one_time' | 'subscription' | 'usage_based' | 'freemium';

export type InstallStatus = 'active' | 'disabled' | 'uninstalled';

export type ReviewStatus = 'pending' | 'published' | 'hidden' | 'removed';

export type APIKeyStatus = 'active' | 'revoked' | 'expired';

export type BountyStatus = 'open' | 'funded' | 'claimed' | 'in_progress' | 'completed' | 'disputed' | 'cancelled';

export type WebhookStatus = 'active' | 'paused' | 'failed';

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Marketplace Application
 */
export interface MarketplaceApp extends MeshBaseEntity {
  developerId: string;

  // Identity
  name: string;
  slug: string;                        // URL-safe identifier
  tagline: string;                     // Short description
  description: string;                 // Full description (markdown)

  // Classification
  category: AppCategory;
  subcategory?: string;
  tags: string[];

  // Versioning
  version: string;
  changelog: VersionChangelog[];
  minPlatformVersion?: string;

  // Media
  iconUrl: string;
  screenshots: string[];
  videoUrl?: string;
  demoUrl?: string;

  // Status
  status: AppStatus;
  publishedAt?: Date;
  deprecatedAt?: Date;
  deprecationReason?: string;

  // Pricing
  pricingModel: PricingModel;
  price?: number;
  currency?: string;
  billingPeriod?: 'monthly' | 'yearly';
  trialDays?: number;

  // Stats
  installCount: number;
  activeInstalls: number;
  averageRating?: number;
  reviewCount: number;

  // Technical
  permissions: AppPermission[];
  scopes: string[];                    // API scopes required
  webhookUrl?: string;
  oauthConfig?: OAuthConfig;

  // Integration
  integratesWith: string[];            // Other apps/services
  dataAccess: DataAccessDeclaration[];

  // Security
  securityScanStatus?: 'pending' | 'passed' | 'failed' | 'warning';
  lastSecurityScan?: Date;
  securityScore?: number;

  // Support
  supportEmail: string;
  supportUrl?: string;
  documentationUrl?: string;

  // Legal
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
}

export interface VersionChangelog {
  version: string;
  releasedAt: Date;
  changes: string[];
  breakingChanges?: string[];
}

export interface AppPermission {
  permission: string;
  reason: string;
  required: boolean;
}

export interface DataAccessDeclaration {
  dataType: string;                    // e.g., 'student_grades', 'attendance'
  accessLevel: 'read' | 'write' | 'delete';
  purpose: string;
  retention?: string;
}

export interface OAuthConfig {
  clientId: string;
  redirectUris: string[];
  scopes: string[];
  grantTypes: ('authorization_code' | 'client_credentials' | 'refresh_token')[];
}

/**
 * Developer Account
 */
export interface MarketplaceDeveloper extends MeshBaseEntity {
  userId: string;

  // Identity
  name: string;
  displayName: string;
  companyName?: string;
  email: string;
  website?: string;

  // Verification
  verified: boolean;
  verifiedAt?: Date;
  verificationLevel: 'basic' | 'identity' | 'organisation';

  // Profile
  bio?: string;
  avatarUrl?: string;
  bannerUrl?: string;
  socialLinks?: Record<string, string>;

  // Payout
  payoutMethod?: 'bank_transfer' | 'paypal' | 'stripe' | 'crypto';
  payoutDetails?: Record<string, any>;
  payoutThreshold: number;

  // Financials
  totalEarnings: number;
  totalPayouts: number;
  pendingPayout: number;

  // Stats
  appCount: number;
  totalInstalls: number;
  averageRating?: number;

  // Status
  status: 'active' | 'suspended' | 'banned';
  suspensionReason?: string;

  // Capabilities
  capabilities: string[];              // What they can do (e.g., 'publish_apps')
}

/**
 * App Installation
 */
export interface AppInstallation extends MeshBaseEntity {
  appId: string;
  appName: string;

  // Where it's installed
  installedFor: 'tenant' | 'school' | 'user';
  targetId: string;                    // Tenant/school/user ID

  installedBy: string;

  status: InstallStatus;
  installedAt: Date;
  lastUsedAt?: Date;

  // Configuration
  configuration?: Record<string, any>;

  // Permissions granted
  permissionsGranted: string[];
  scopesGranted: string[];

  // Usage
  usageCount: number;
  lastMonthUsage: number;

  // Billing
  subscriptionId?: string;
  trialEndsAt?: Date;
  paidThrough?: Date;
}

/**
 * App Review
 */
export interface AppReview extends MeshBaseEntity {
  appId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerType: 'teacher' | 'admin' | 'student';

  // Review content
  rating: number;                      // 1-5
  title?: string;
  content: string;

  // Useful votes
  helpfulCount: number;
  notHelpfulCount: number;

  status: ReviewStatus;

  // Developer response
  developerResponse?: string;
  developerRespondedAt?: Date;

  // Moderation
  flagged: boolean;
  flagReason?: string;
  moderatedAt?: Date;
  moderatedBy?: string;

  // AI analysis
  aiAnalysis?: {
    sentiment: number;
    topics: string[];
    isSpam: boolean;
    qualityScore: number;
  };
}

// ============================================================================
// API & WEBHOOKS
// ============================================================================

/**
 * Developer API Key
 */
export interface DeveloperAPIKey extends MeshBaseEntity {
  developerId: string;

  name: string;
  keyHash: string;                     // Hashed key
  keyPrefix: string;                   // First 8 chars for display

  // Permissions
  permissions: string[];
  scopes: string[];

  // Rate limiting
  rateLimit: number;                   // Requests per hour
  rateLimitRemaining?: number;
  rateLimitResetsAt?: Date;

  // Status
  status: APIKeyStatus;
  lastUsedAt?: Date;
  lastUsedIp?: string;

  // Expiration
  expiresAt?: Date;
  revokedAt?: Date;
  revokedReason?: string;

  // Usage stats
  totalRequests: number;
  requestsThisMonth: number;
}

/**
 * Webhook Configuration
 */
export interface WebhookConfig extends MeshBaseEntity {
  appId: string;

  url: string;
  events: string[];                    // Event types to receive

  // Security
  secret: string;                      // For signature verification

  status: WebhookStatus;

  // Delivery stats
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  lastDeliveryAt?: Date;
  lastDeliveryStatus?: string;

  // Retry config
  retryEnabled: boolean;
  maxRetries: number;

  // Failure handling
  consecutiveFailures: number;
  disabledAt?: Date;
  disabledReason?: string;
}

/**
 * Webhook Delivery Log
 */
export interface WebhookDelivery extends MeshBaseEntity {
  webhookId: string;

  event: string;
  payload: Record<string, any>;

  // Delivery
  attemptNumber: number;
  deliveredAt?: Date;

  // Response
  responseStatus?: number;
  responseBody?: string;
  responseTimeMs?: number;

  // Status
  status: 'pending' | 'delivered' | 'failed' | 'retrying';
  error?: string;

  // Next retry
  nextRetryAt?: Date;
}

// ============================================================================
// BOUNTIES
// ============================================================================

/**
 * Feature Bounty
 */
export interface Bounty extends MeshBaseEntity {
  // Request details
  title: string;
  description: string;
  requirements: string;

  category: AppCategory;
  tags: string[];

  // Creator
  createdBy: string;
  creatorType: 'teacher' | 'school' | 'district';

  // Funding
  reward: number;
  funded: number;
  funders: BountyFunder[];

  // Status
  status: BountyStatus;
  deadline?: Date;

  // Claims
  claimedBy?: string;
  claimedAt?: Date;

  // Completion
  completedAt?: Date;
  completionProof?: string;
  resultAppId?: string;

  // Voting (for community bounties)
  votes: number;
  voters: string[];

  // Disputes
  disputed: boolean;
  disputeReason?: string;
  disputeResolution?: string;

  // AI matching
  aiMatchedDevelopers?: {
    developerId: string;
    matchScore: number;
    reason: string;
  }[];
}

export interface BountyFunder {
  userId: string;
  amount: number;
  fundedAt: Date;
}

// ============================================================================
// APP STORE SUBMISSION
// ============================================================================

/**
 * App Submission for Review
 */
export interface AppSubmission extends MeshBaseEntity {
  appId: string;
  developerId: string;
  version: string;

  // Submission details
  submittedAt: Date;
  releaseNotes: string;

  // Review
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'changes_requested';
  reviewedBy?: string;
  reviewedAt?: Date;

  // Feedback
  reviewNotes?: string;
  requiredChanges?: string[];

  // Security scan
  securityScanId?: string;
  securityScanPassed?: boolean;

  // Compliance
  complianceChecks: {
    check: string;
    passed: boolean;
    notes?: string;
  }[];
}

/**
 * Security Scan Result
 */
export interface SecurityScan extends MeshBaseEntity {
  appId: string;
  version: string;

  // Scan details
  startedAt: Date;
  completedAt?: Date;

  status: 'pending' | 'running' | 'completed' | 'failed';

  // Results
  overallScore?: number;               // 0-100
  passed?: boolean;

  vulnerabilities: {
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    type: string;
    description: string;
    location?: string;
    recommendation: string;
  }[];

  // Data access review
  dataAccessReview: {
    declaredAccess: DataAccessDeclaration[];
    actualAccess: DataAccessDeclaration[];
    undeclaredAccess: DataAccessDeclaration[];
    concerns: string[];
  };

  // AI analysis
  aiAnalysis?: {
    codeQualityScore: number;
    securityPractices: string[];
    concerns: string[];
    recommendations: string[];
  };
}

// ============================================================================
// AI SERVICES
// ============================================================================

export interface AIDeveloperMarketplaceService {
  // App recommendations
  recommendApps(
    context: { schoolType: string; existingApps: string[]; needs: string[] }
  ): Promise<{
    apps: {
      appId: string;
      relevanceScore: number;
      reason: string;
      similarSchoolsUsing: number;
    }[];
  }>;

  // Security scanning
  performSecurityScan(
    appId: string,
    version: string
  ): Promise<SecurityScan>;

  // Review moderation
  moderateReview(
    review: AppReview
  ): Promise<{
    isAppropriate: boolean;
    isSpam: boolean;
    sentiment: number;
    topics: string[];
    qualityScore: number;
    moderationAction: 'approve' | 'flag' | 'remove';
    reason: string;
  }>;

  // Bounty matching
  matchBountyToDevelopers(
    bounty: Bounty,
    developers: MarketplaceDeveloper[]
  ): Promise<{
    matches: {
      developerId: string;
      score: number;
      relevantApps: string[];
      estimatedCapability: number;
    }[];
  }>;

  // Pricing suggestions
  suggestPricing(
    app: MarketplaceApp,
    marketData: { similarApps: MarketplaceApp[]; installTrends: any }
  ): Promise<{
    suggestedPrice: number;
    suggestedModel: PricingModel;
    reasoning: string;
    projectedRevenue: { conservative: number; moderate: number; optimistic: number };
  }>;

  // Usage anomaly detection
  detectUsageAnomalies(
    installation: AppInstallation,
    usageHistory: any[]
  ): Promise<{
    anomalies: {
      type: string;
      severity: 'low' | 'medium' | 'high';
      description: string;
      evidence: any;
    }[];
    recommendedAction: string;
  }>;
}

// ============================================================================
// ANALYTICS
// ============================================================================

export interface MarketplaceAnalytics {
  generatedAt: Date;
  period: { start: Date; end: Date };

  // Overview
  overview: {
    totalApps: number;
    publishedApps: number;
    totalDevelopers: number;
    totalInstalls: number;
    activeInstalls: number;
  };

  // App metrics
  appMetrics: {
    newApps: number;
    updatedApps: number;
    deprecatedApps: number;
    averageRating: number;
    topCategories: { category: AppCategory; count: number }[];
  };

  // Developer metrics
  developerMetrics: {
    newDevelopers: number;
    activeDevelopers: number;
    totalPayouts: number;
    averageEarningsPerDeveloper: number;
  };

  // Install metrics
  installMetrics: {
    newInstalls: number;
    uninstalls: number;
    netGrowth: number;
    retentionRate: number;
  };

  // Revenue
  revenue: {
    totalRevenue: number;
    platformFees: number;
    developerPayouts: number;
    byPricingModel: { model: PricingModel; revenue: number }[];
  };

  // Bounties
  bountyMetrics: {
    totalBounties: number;
    totalFunding: number;
    completedBounties: number;
    averageReward: number;
  };

  // Top performers
  topApps: { appId: string; name: string; installs: number; rating: number }[];
  topDevelopers: { developerId: string; name: string; earnings: number; apps: number }[];

  // AI insights
  aiInsights: {
    trends: string[];
    opportunities: string[];
    risks: string[];
  };
}

