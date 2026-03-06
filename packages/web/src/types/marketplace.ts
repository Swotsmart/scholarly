/**
 * Marketplace & Developer Portal Types
 */

// =============================================================================
// App & Marketplace
// =============================================================================

export interface MarketplaceApp {
  id: string;
  name: string;
  developer: string;
  developerId: string;
  description: string;
  rating: number;
  reviewCount: number;
  installs: number;
  pricing: 'Free' | 'Premium' | 'Freemium';
  priceAmount: string | null;
  category: string;
  appType: string;
  version: string;
  lastUpdated: string;
  color: string;
  letter: string;
  features: string[];
  isFeatured: boolean;
  status: string;
}

export interface AppDetail extends MarketplaceApp {
  fullDescription: string;
  developerVerified: boolean;
  screenshots: string[];
  educationLevels: string[];
  platforms: { name: string; icon: string }[];
  permissions: AppPermission[];
  size: string;
  changelog: ChangelogEntry[];
  reviews: AppReview[];
  ratingBreakdown: { stars: number; count: number; percentage: number }[];
}

export interface AppPermission {
  name: string;
  description: string;
  level: 'Read' | 'Write' | 'Read/Write';
}

export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

export interface AppReview {
  id: string;
  author: string;
  role: string;
  school?: string;
  rating: number;
  date: string;
  text: string;
}

export interface MarketplaceCategory {
  id: string;
  name: string;
  count: number;
}

export interface MarketplaceStats {
  totalApps: number;
  activeInstalls: number;
  communityRequests: number;
  activeBounties: number;
}

// =============================================================================
// Developer Portal
// =============================================================================

export interface DeveloperProfile {
  id: string;
  name: string;
  email: string;
  verified: boolean;
  verifiedDate: string | null;
  memberSince: string;
  accountType: string;
  status: string;
  tier: string;
  revenueShare: number;
}

export interface DeveloperApp {
  id: string;
  name: string;
  status: 'draft' | 'in_review' | 'published' | 'suspended';
  version: string;
  installs: number;
  rating: number;
  reviewCount: number;
  revenue: number;
  lastUpdated: string;
  color: string;
  letter: string;
}

export interface DeveloperStats {
  appsPublished: number;
  totalInstalls: number;
  totalRevenue: number;
  averageRating: number;
}

// =============================================================================
// API Keys
// =============================================================================

export interface ApiKeyRecord {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  permissions: string[];
  status: 'active' | 'revoked';
  expiresAt: string | null;
}

export interface ApiKeyCreateResult {
  id: string;
  name: string;
  prefix: string;
  key: string; // Full key, shown only once
  permissions: string[];
  createdAt: string;
}

// =============================================================================
// Webhooks
// =============================================================================

export interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  status: 'active' | 'disabled' | 'suspended';
  lastDeliveredAt: string | null;
  failureCount: number;
  deliveryCount: number;
  secret?: string;
  createdAt: string;
}

export interface WebhookDeliveryRecord {
  id: string;
  eventType: string;
  statusCode: number | null;
  success: boolean;
  attempt: number;
  deliveredAt: string;
}

export interface WebhookTestResult {
  success: boolean;
  statusCode: number | null;
  responseTime: number;
  error?: string;
}

// =============================================================================
// Analytics
// =============================================================================

export interface UsageDataPoint {
  date: string;
  requests: number;
  errors: number;
}

export interface RevenueDataPoint {
  month: string;
  revenue: number;
}

// =============================================================================
// Payouts
// =============================================================================

export interface PayoutRecord {
  id: string;
  date: string;
  amount: number;
  apps: string;
  status: 'completed' | 'pending' | 'processing';
  method: string;
}

// =============================================================================
// Community
// =============================================================================

export interface FeatureRequest {
  id: string;
  title: string;
  requester: string;
  requesterRole: string;
  description: string;
  currentFunding: number;
  goalFunding: number;
  pledgeCount: number;
  deadline: string;
  category: string;
  status: 'active' | 'funded' | 'in_development';
  upvotes: number;
}

export interface Bounty {
  id: string;
  title: string;
  sponsor: string;
  sponsorType: string;
  description: string;
  amount: number;
  requiredSkills: string[];
  deadline: string;
  claimCount: number;
  claimed: boolean;
  milestones: { name: string; reward: number; completed: boolean }[];
  status: 'open' | 'claimed' | 'completed';
}

// =============================================================================
// API Docs
// =============================================================================

export interface ApiDocCategory {
  key: string;
  category: string;
  description: string;
  endpointCount: number;
}

export interface ApiDocEndpoint {
  path: string;
  method: string;
  description: string;
  parameters?: { name: string; type: string; required: boolean; description: string }[];
  responses?: Record<string, string>;
}

// =============================================================================
// AI Features
// =============================================================================

export interface AppRecommendation {
  app: MarketplaceApp;
  score: number;
  reason: string;
}

export interface CodeSnippet {
  language: string;
  code: string;
  endpoint: string;
}

export interface DocSearchResult {
  category: string;
  endpoint: ApiDocEndpoint;
  relevance: number;
}
