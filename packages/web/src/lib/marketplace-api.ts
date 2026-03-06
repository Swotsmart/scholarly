/**
 * Marketplace & Developer Portal API Client
 * Follows the golden-path-api.ts pattern with DEMO_MODE fallback.
 */

import type {
  MarketplaceApp,
  AppDetail,
  AppReview,
  DeveloperProfile,
  DeveloperApp,
  DeveloperStats,
  ApiKeyRecord,
  ApiKeyCreateResult,
  WebhookConfig,
  WebhookDeliveryRecord,
  WebhookTestResult,
  UsageDataPoint,
  RevenueDataPoint,
  PayoutRecord,
  FeatureRequest,
  Bounty,
  MarketplaceCategory,
  MarketplaceStats,
  ApiDocCategory,
  ApiDocEndpoint,
  AppRecommendation,
  CodeSnippet,
  DocSearchResult,
} from '@/types/marketplace';

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

// =============================================================================
// DEMO DATA
// =============================================================================

const demoApps: MarketplaceApp[] = [
  {
    id: 'vocabmaster-pro', name: 'VocabMaster Pro', developer: 'LangTech Solutions', developerId: 'dev-1',
    description: 'AI-powered vocabulary acquisition with spaced repetition, contextual learning, and Australian English dialect support for Years 3-12.',
    rating: 4.8, reviewCount: 342, installs: 5420, pricing: 'Premium', priceAmount: '$4.99/mo',
    category: 'learning-tools', appType: 'WEB_APP', version: '3.2.1', lastUpdated: '2026-01-15',
    color: 'bg-blue-500', letter: 'V', features: ['Spaced Repetition', 'Australian English', 'Classroom Sync', 'Progress Analytics'],
    isFeatured: true, status: 'published',
  },
  {
    id: 'chemlab-vr', name: 'ChemLab VR', developer: 'Immersive Edu Labs', developerId: 'dev-2',
    description: 'Virtual reality chemistry laboratory aligned with the Australian Curriculum. Conduct experiments safely with realistic simulations.',
    rating: 4.9, reviewCount: 287, installs: 3187, pricing: 'Premium', priceAmount: '$9.99/mo',
    category: 'vr', appType: 'IMMERSIVE_EXPERIENCE', version: '2.4.0', lastUpdated: '2026-01-10',
    color: 'bg-emerald-500', letter: 'C', features: ['VR Lab Simulations', 'Safety Training', 'Curriculum Aligned', 'Assessment Tools'],
    isFeatured: true, status: 'published',
  },
  {
    id: 'quizforge', name: 'QuizForge', developer: 'AssessTech AU', developerId: 'dev-3',
    description: 'Intelligent assessment builder with auto-marking, NAPLAN-style question templates, and detailed analytics for educators.',
    rating: 4.7, reviewCount: 521, installs: 8934, pricing: 'Free', priceAmount: null,
    category: 'assessment', appType: 'WEB_APP', version: '4.1.2', lastUpdated: '2026-01-18',
    color: 'bg-purple-500', letter: 'Q', features: ['Auto-marking', 'NAPLAN Templates', 'Detailed Analytics', 'Question Bank'],
    isFeatured: true, status: 'published',
  },
  {
    id: 'classchat', name: 'ClassChat', developer: 'EduComm Pty Ltd', developerId: 'dev-4',
    description: 'Secure classroom communication platform with parent messaging, announcement broadcasting, and emergency alerts.',
    rating: 4.6, reviewCount: 189, installs: 6721, pricing: 'Freemium', priceAmount: '$2.99/mo',
    category: 'communication', appType: 'WEB_APP', version: '5.0.3', lastUpdated: '2026-01-12',
    color: 'bg-green-500', letter: 'C', features: ['Parent Messaging', 'Emergency Alerts', 'COPPA Compliant', 'Broadcast Tools'],
    isFeatured: false, status: 'published',
  },
  {
    id: 'insightiq', name: 'InsightIQ', developer: 'DataEd Analytics', developerId: 'dev-5',
    description: 'Comprehensive learning analytics dashboard with predictive insights, cohort analysis, and intervention recommendations.',
    rating: 4.5, reviewCount: 156, installs: 2890, pricing: 'Premium', priceAmount: '$7.99/mo',
    category: 'analytics', appType: 'WEB_APP', version: '2.2.0', lastUpdated: '2026-01-08',
    color: 'bg-amber-500', letter: 'I', features: ['Predictive Analytics', 'Cohort Analysis', 'Risk Detection', 'Custom Reports'],
    isFeatured: false, status: 'published',
  },
  {
    id: 'mathquest', name: 'MathQuest', developer: 'GameLearn AU', developerId: 'dev-6',
    description: 'Gamified mathematics learning with adventure-based problem solving for Years 1-10.',
    rating: 4.6, reviewCount: 423, installs: 7890, pricing: 'Free', priceAmount: null,
    category: 'learning-tools', appType: 'WEB_APP', version: '6.1.0', lastUpdated: '2026-01-20',
    color: 'bg-orange-500', letter: 'M', features: ['Gamified Learning', 'Adaptive Difficulty', 'Multiplayer Mode', 'Progress Tracking'],
    isFeatured: false, status: 'published',
  },
  {
    id: 'readaloud-ai', name: 'ReadAloud AI', developer: 'AccessEd Tech', developerId: 'dev-7',
    description: 'AI-powered text-to-speech with natural voices, reading speed control, and highlight tracking.',
    rating: 4.5, reviewCount: 234, installs: 4756, pricing: 'Premium', priceAmount: '$2.99/mo',
    category: 'accessibility', appType: 'WEB_APP', version: '3.0.1', lastUpdated: '2026-01-14',
    color: 'bg-teal-500', letter: 'R', features: ['Natural AI Voices', 'Dyslexia Support', 'Multi-language', 'Speed Control'],
    isFeatured: false, status: 'published',
  },
  {
    id: 'classsync', name: 'ClassSync', developer: 'EduSync Pty Ltd', developerId: 'dev-8',
    description: 'LMS integration hub connecting Scholarly with Canvas, Moodle, and Blackboard.',
    rating: 4.4, reviewCount: 167, installs: 4210, pricing: 'Free', priceAmount: null,
    category: 'integrations', appType: 'NATIVE_INTEGRATION', version: '2.8.0', lastUpdated: '2026-01-16',
    color: 'bg-indigo-500', letter: 'C', features: ['LMS Integration', 'Grade Sync', 'SSO Support', 'Roster Management'],
    isFeatured: false, status: 'published',
  },
  {
    id: 'biologyexplorer-vr', name: 'BiologyExplorer VR', developer: 'Immersive Edu Labs', developerId: 'dev-2',
    description: 'Explore the human body in virtual reality. Navigate through organs and witness cellular processes.',
    rating: 4.8, reviewCount: 198, installs: 2340, pricing: 'Premium', priceAmount: '$8.99/mo',
    category: 'vr', appType: 'IMMERSIVE_EXPERIENCE', version: '1.9.0', lastUpdated: '2026-01-11',
    color: 'bg-pink-500', letter: 'B', features: ['Body Navigation', 'Cell Visualization', 'Virtual Dissection', 'Curriculum Aligned'],
    isFeatured: false, status: 'published',
  },
  {
    id: 'stemlab', name: 'STEMLab Simulations', developer: 'ScienceFirst AU', developerId: 'dev-9',
    description: 'Physics and engineering simulations with virtual experiments.',
    rating: 4.7, reviewCount: 312, installs: 5670, pricing: 'Freemium', priceAmount: '$5.99/mo',
    category: 'stem', appType: 'WEB_APP', version: '4.3.0', lastUpdated: '2026-01-19',
    color: 'bg-cyan-500', letter: 'S', features: ['Physics Engine', 'Circuit Builder', 'Engineering Labs', 'Real-world Data'],
    isFeatured: false, status: 'published',
  },
];

const demoCategories: MarketplaceCategory[] = [
  { id: 'learning-tools', name: 'Learning Tools', count: 58 },
  { id: 'assessment', name: 'Assessment', count: 42 },
  { id: 'communication', name: 'Communication', count: 34 },
  { id: 'analytics', name: 'Analytics', count: 28 },
  { id: 'vr', name: 'VR Experiences', count: 24 },
  { id: 'stem', name: 'STEM', count: 56 },
  { id: 'accessibility', name: 'Accessibility', count: 18 },
  { id: 'integrations', name: 'Integrations', count: 16 },
];

const demoStats: MarketplaceStats = {
  totalApps: 276,
  activeInstalls: 24518,
  communityRequests: 89,
  activeBounties: 23,
};

const demoDeveloperProfile: DeveloperProfile = {
  id: 'dev-1', name: 'EduTech Solutions', email: 'dev@edutechsolutions.com.au',
  verified: true, verifiedDate: '14 Sep 2025', memberSince: 'March 2024',
  accountType: 'COMPANY', status: 'active', tier: 'Professional', revenueShare: 0.7,
};

const demoDeveloperApps: DeveloperApp[] = [
  { id: 'vocabmaster-pro', name: 'VocabMaster Pro', status: 'published', version: '3.2.1', installs: 5420, rating: 4.8, reviewCount: 342, revenue: 18250, lastUpdated: '15 Jan 2026', color: 'bg-blue-500', letter: 'V' },
  { id: 'grammar-guru', name: 'Grammar Guru', status: 'published', version: '2.0.4', installs: 3246, rating: 4.5, reviewCount: 189, revenue: 8720, lastUpdated: '8 Jan 2026', color: 'bg-purple-500', letter: 'G' },
  { id: 'spelling-sprint', name: 'Spelling Sprint', status: 'in_review', version: '1.0.0', installs: 987, rating: 4.4, reviewCount: 56, revenue: 1500, lastUpdated: '20 Jan 2026', color: 'bg-emerald-500', letter: 'S' },
];

const demoDeveloperStats: DeveloperStats = {
  appsPublished: 3, totalInstalls: 9653, totalRevenue: 28470, averageRating: 4.6,
};

const demoApiKeys: ApiKeyRecord[] = [
  { id: 'key-1', name: 'Production Key', prefix: 'sk_prod_...a4f2', createdAt: '2026-01-10', lastUsedAt: '2026-01-29', permissions: ['read', 'write', 'delete'], status: 'active', expiresAt: null },
  { id: 'key-2', name: 'Development Key', prefix: 'sk_dev_...b8c1', createdAt: '2026-01-05', lastUsedAt: '2026-01-28', permissions: ['read', 'write'], status: 'active', expiresAt: null },
  { id: 'key-3', name: 'Testing Key', prefix: 'sk_test_...d3e9', createdAt: '2026-01-01', lastUsedAt: '2026-01-15', permissions: ['read'], status: 'revoked', expiresAt: null },
];

const demoWebhooks: WebhookConfig[] = [
  { id: 'wh-1', url: 'https://api.edutechsolutions.com.au/webhooks/scholarly', events: ['app.installed', 'app.uninstalled', 'subscription.created', 'subscription.cancelled'], status: 'active', lastDeliveredAt: '2026-01-29T14:32:00Z', failureCount: 0, deliveryCount: 1247, createdAt: '2025-09-14' },
  { id: 'wh-2', url: 'https://api.edutechsolutions.com.au/webhooks/analytics', events: ['usage.milestone', 'review.created'], status: 'active', lastDeliveredAt: '2026-01-28T09:15:00Z', failureCount: 0, deliveryCount: 89, createdAt: '2025-11-01' },
];

const demoUsageData: UsageDataPoint[] = [
  { date: '23 Jan', requests: 12450, errors: 23 },
  { date: '24 Jan', requests: 14200, errors: 18 },
  { date: '25 Jan', requests: 13800, errors: 31 },
  { date: '26 Jan', requests: 15600, errors: 12 },
  { date: '27 Jan', requests: 16200, errors: 15 },
  { date: '28 Jan', requests: 17800, errors: 8 },
  { date: '29 Jan', requests: 18400, errors: 5 },
];

const demoRevenueData: RevenueDataPoint[] = [
  { month: 'Aug', revenue: 1820 },
  { month: 'Sep', revenue: 2340 },
  { month: 'Oct', revenue: 2890 },
  { month: 'Nov', revenue: 3150 },
  { month: 'Dec', revenue: 3780 },
  { month: 'Jan', revenue: 4210 },
];

const demoPayouts: PayoutRecord[] = [
  { id: 'po-1', date: '15 Jan 2026', amount: 3780, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-2', date: '15 Dec 2025', amount: 3150, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-3', date: '15 Nov 2025', amount: 2890, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-4', date: '15 Oct 2025', amount: 2340, apps: 'VocabMaster Pro, Grammar Guru', status: 'completed', method: 'Bank Transfer' },
  { id: 'po-5', date: '15 Sep 2025', amount: 1820, apps: 'VocabMaster Pro', status: 'completed', method: 'Bank Transfer' },
];

const demoFeatureRequests: FeatureRequest[] = [
  { id: 'fr-1', title: 'Real-time Collaboration Whiteboard', requester: 'Emily Watson', requesterRole: 'Year 6 Teacher, Canberra Grammar', description: 'A shared digital whiteboard where students and teachers can collaborate in real-time during lessons.', currentFunding: 3200, goalFunding: 5000, pledgeCount: 47, deadline: '28 Feb 2026', category: 'Classroom Management', status: 'active', upvotes: 156 },
  { id: 'fr-2', title: 'Parent-Teacher Conference Scheduler', requester: 'Michael Torres', requesterRole: 'Deputy Principal, Adelaide Hills PS', description: 'An intelligent scheduling tool that coordinates parent-teacher conferences.', currentFunding: 4800, goalFunding: 4800, pledgeCount: 62, deadline: '15 Mar 2026', category: 'Management', status: 'funded', upvotes: 203 },
  { id: 'fr-3', title: 'Indigenous Language Dictionary', requester: 'Aunty Rose Campbell', requesterRole: 'Cultural Advisor, NT Education', description: 'A comprehensive digital dictionary supporting Australian Indigenous languages.', currentFunding: 7500, goalFunding: 12000, pledgeCount: 134, deadline: '30 Apr 2026', category: 'Language Learning', status: 'active', upvotes: 412 },
  { id: 'fr-4', title: 'Special Needs Adaptive Testing', requester: 'Dr. Lisa Pham', requesterRole: 'SENCO, Melbourne Metro Schools', description: 'An assessment tool that dynamically adapts to students with additional learning needs.', currentFunding: 2100, goalFunding: 8000, pledgeCount: 38, deadline: '31 Mar 2026', category: 'Accessibility', status: 'active', upvotes: 289 },
  { id: 'fr-5', title: 'Offline Mode for Rural Schools', requester: 'Tom Bradley', requesterRole: 'Principal, Outback Distance Ed', description: 'Full offline functionality for Scholarly platform features.', currentFunding: 6000, goalFunding: 6000, pledgeCount: 89, deadline: '28 Feb 2026', category: 'Infrastructure', status: 'funded', upvotes: 367 },
];

const demoBounties: Bounty[] = [
  { id: 'b-1', title: 'SCORM 2004 Content Import Plugin', sponsor: 'NSW Department of Education', sponsorType: 'Government', description: 'Build a plugin that imports SCORM 2004 compliant learning packages into the Scholarly content library.', amount: 15000, requiredSkills: ['TypeScript', 'SCORM 2004', 'React', 'Node.js'], deadline: '15 Mar 2026', claimCount: 4, claimed: true, milestones: [{ name: 'SCORM parser and manifest reader', reward: 4000, completed: true }, { name: 'Content rendering engine', reward: 5000, completed: true }, { name: 'Progress tracking integration', reward: 3000, completed: false }, { name: 'Testing and documentation', reward: 3000, completed: false }], status: 'claimed' },
  { id: 'b-2', title: 'Auslan Sign Language Recognition Module', sponsor: 'Deaf Australia Foundation', sponsorType: 'Non-profit', description: 'Develop a computer vision module that recognises Australian Sign Language (Auslan) gestures via webcam.', amount: 25000, requiredSkills: ['Python', 'TensorFlow', 'Computer Vision', 'WebRTC', 'TypeScript'], deadline: '30 Apr 2026', claimCount: 2, claimed: false, milestones: [{ name: 'Auslan gesture dataset curation', reward: 5000, completed: false }, { name: 'ML model training and validation', reward: 8000, completed: false }, { name: 'WebRTC integration and browser SDK', reward: 7000, completed: false }, { name: 'Scholarly platform integration', reward: 5000, completed: false }], status: 'open' },
  { id: 'b-3', title: 'Aboriginal Astronomy Interactive Sky Map', sponsor: 'CSIRO Education', sponsorType: 'Research', description: 'Create an interactive sky map that overlays Aboriginal astronomical knowledge onto a real-time star chart.', amount: 18000, requiredSkills: ['Three.js', 'WebGL', 'TypeScript', 'React', 'GIS'], deadline: '31 May 2026', claimCount: 1, claimed: false, milestones: [{ name: 'Star chart rendering engine', reward: 5000, completed: false }, { name: 'Aboriginal knowledge overlay system', reward: 6000, completed: false }, { name: 'Interactive storytelling features', reward: 4000, completed: false }, { name: 'Curriculum integration and testing', reward: 3000, completed: false }], status: 'open' },
];

const demoDocCategories: ApiDocCategory[] = [
  { key: 'stories', category: 'Stories', description: 'AI-powered storybook creation, generation, and management', endpointCount: 3 },
  { key: 'library', category: 'Library', description: 'Browse and search the story library', endpointCount: 2 },
  { key: 'arena', category: 'Arena', description: 'Competitions, tournaments, and gamification', endpointCount: 3 },
  { key: 'tokens', category: 'Tokens', description: 'Token economy, balances, and transactions', endpointCount: 2 },
  { key: 'webhooks', category: 'Webhooks', description: 'Webhook subscription management', endpointCount: 3 },
  { key: 'lms', category: 'LMS Integration', description: 'Connect to Learning Management Systems', endpointCount: 3 },
  { key: 'studio', category: 'Studio Portal', description: 'Design studio for creating and managing projects', endpointCount: 4 },
  { key: 'developer', category: 'Developer Account', description: 'Developer account management and tier information', endpointCount: 1 },
];

// =============================================================================
// API CLIENT
// =============================================================================

class MarketplaceApiClient {
  private baseUrl: string;
  private demoMode: boolean;

  constructor() {
    this.baseUrl = API_BASE;
    this.demoMode = DEMO_MODE;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.error?.message || error.message || `HTTP ${response.status}`);
    }

    const json = await response.json();
    return json.data ?? json;
  }

  // ── Apps ──

  apps = {
    search: async (params?: { query?: string; category?: string; limit?: number; offset?: number }): Promise<{ apps: MarketplaceApp[]; total: number }> => {
      if (this.demoMode) {
        let apps = [...demoApps];
        if (params?.query) {
          const q = params.query.toLowerCase();
          apps = apps.filter(a => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
        }
        if (params?.category) {
          apps = apps.filter(a => a.category === params.category);
        }
        return { apps, total: apps.length };
      }
      const qs = new URLSearchParams();
      if (params?.query) qs.set('query', params.query);
      if (params?.category) qs.set('category', params.category);
      if (params?.limit) qs.set('limit', String(params.limit));
      if (params?.offset) qs.set('offset', String(params.offset));
      return this.request('GET', `/marketplace/apps?${qs}`);
    },

    getById: async (id: string): Promise<AppDetail> => {
      if (this.demoMode) {
        const app = demoApps.find(a => a.id === id);
        if (!app) throw new Error('App not found');
        return {
          ...app,
          fullDescription: app.description + '\n\nThis is an extended description available in the detail view.',
          developerVerified: true,
          screenshots: ['/screenshots/1.png', '/screenshots/2.png', '/screenshots/3.png'],
          educationLevels: ['Years 3-4', 'Years 5-6', 'Years 7-8', 'Years 9-10'],
          platforms: [{ name: 'Web Browser', icon: 'globe' }, { name: 'iOS', icon: 'smartphone' }],
          permissions: [
            { name: 'Student Profiles', description: 'Read student name and year level', level: 'Read' },
            { name: 'Assessment Data', description: 'Write assessment scores', level: 'Read/Write' },
          ],
          size: '24 MB',
          changelog: [
            { version: app.version, date: app.lastUpdated, changes: ['Bug fixes and improvements'] },
          ],
          reviews: [
            { id: 'r1', author: 'Sarah T.', role: 'Teacher', rating: 5, date: '12 Jan 2026', text: 'Absolutely fantastic for my Year 5 class.' },
            { id: 'r2', author: 'Michael R.', role: 'Admin', rating: 4, date: '10 Jan 2026', text: 'Great integration with our existing systems.' },
          ],
          ratingBreakdown: [
            { stars: 5, count: 218, percentage: 64 },
            { stars: 4, count: 89, percentage: 26 },
            { stars: 3, count: 24, percentage: 7 },
            { stars: 2, count: 8, percentage: 2 },
            { stars: 1, count: 3, percentage: 1 },
          ],
        };
      }
      return this.request('GET', `/marketplace/apps/${id}`);
    },

    install: async (id: string, params?: { installScope?: string; scopeId?: string; grantedPermissions?: string[] }): Promise<{ success: boolean }> => {
      if (this.demoMode) return { success: true };
      return this.request('POST', `/marketplace/apps/${id}/install`, {
        installScope: params?.installScope || 'user',
        scopeId: params?.scopeId || 'self',
        grantedPermissions: params?.grantedPermissions || [],
      });
    },

    uninstall: async (id: string): Promise<{ success: boolean }> => {
      if (this.demoMode) return { success: true };
      return this.request('POST', `/marketplace/apps/${id}/uninstall`);
    },

    submitReview: async (id: string, review: { rating: number; title: string; content: string }): Promise<AppReview> => {
      if (this.demoMode) return { id: 'demo-r', author: 'You', role: 'Educator', rating: review.rating, date: new Date().toISOString(), text: review.content };
      return this.request('POST', `/marketplace/apps/${id}/reviews`, {
        reviewerName: 'Current User',
        reviewerRole: 'educator',
        ...review,
      });
    },

    getStats: async (): Promise<MarketplaceStats> => {
      if (this.demoMode) return demoStats;
      return this.request('GET', '/marketplace/stats');
    },

    getCategories: async (): Promise<MarketplaceCategory[]> => {
      if (this.demoMode) return demoCategories;
      return this.request('GET', '/marketplace/categories');
    },

    getRecommendations: async (): Promise<AppRecommendation[]> => {
      if (this.demoMode) {
        return demoApps.slice(0, 3).map(app => ({ app, score: 0.9 + Math.random() * 0.1, reason: 'Popular in your role' }));
      }
      return this.request('GET', '/marketplace/apps/recommendations');
    },
  };

  // ── Developer ──

  developer = {
    register: async (data: { name: string; displayName: string; description: string; accountType: string; supportEmail: string; websiteUrl?: string }): Promise<DeveloperProfile> => {
      if (this.demoMode) return demoDeveloperProfile;
      return this.request('POST', '/marketplace/developers', data);
    },

    getProfile: async (): Promise<{ profile: DeveloperProfile; stats: DeveloperStats }> => {
      if (this.demoMode) return { profile: demoDeveloperProfile, stats: demoDeveloperStats };
      return this.request('GET', '/developer/tier');
    },

    getApps: async (): Promise<DeveloperApp[]> => {
      if (this.demoMode) return demoDeveloperApps;
      const result = await this.request<{ apps: DeveloperApp[] }>('GET', '/marketplace/developers/me/apps');
      return result.apps;
    },

    createApp: async (data: { name: string; tagline: string; description: string; category: string; appType: string; iconUrl: string; screenshotUrls: string[]; pricingModel: { type: string } }): Promise<{ id: string }> => {
      if (this.demoMode) return { id: 'demo-app-new' };
      return this.request('POST', '/marketplace/apps', data);
    },
  };

  // ── API Keys ──

  apiKeys = {
    list: async (): Promise<ApiKeyRecord[]> => {
      if (this.demoMode) return demoApiKeys;
      return this.request('GET', '/developer/api-keys');
    },

    create: async (name: string, permissions: string[]): Promise<ApiKeyCreateResult> => {
      if (this.demoMode) {
        return {
          id: 'key-demo', name, prefix: 'sk_prod_...demo',
          key: 'sk_prod_demo1234567890abcdef', permissions,
          createdAt: new Date().toISOString(),
        };
      }
      return this.request('POST', '/developer/api-keys', { name, permissions });
    },

    revoke: async (id: string): Promise<{ success: boolean }> => {
      if (this.demoMode) return { success: true };
      return this.request('DELETE', `/developer/api-keys/${id}`);
    },
  };

  // ── Webhooks ──

  webhooks = {
    list: async (): Promise<WebhookConfig[]> => {
      if (this.demoMode) return demoWebhooks;
      const result = await this.request<{ webhooks: WebhookConfig[] }>('GET', '/developer/webhooks');
      return result.webhooks;
    },

    create: async (url: string, events: string[]): Promise<WebhookConfig> => {
      if (this.demoMode) {
        return { id: 'wh-demo', url, events, status: 'active', lastDeliveredAt: null, failureCount: 0, deliveryCount: 0, createdAt: new Date().toISOString() };
      }
      return this.request('POST', '/developer/webhooks', { url, events });
    },

    delete: async (id: string): Promise<{ success: boolean }> => {
      if (this.demoMode) return { success: true };
      return this.request('DELETE', `/developer/webhooks/${id}`);
    },

    test: async (id: string): Promise<WebhookTestResult> => {
      if (this.demoMode) return { success: true, statusCode: 200, responseTime: 142 };
      return this.request('POST', `/developer/webhooks/${id}/test`);
    },

    getDeliveries: async (id: string, limit?: number): Promise<WebhookDeliveryRecord[]> => {
      if (this.demoMode) return [];
      return this.request('GET', `/developer/webhooks/${id}/deliveries?limit=${limit || 20}`);
    },
  };

  // ── Analytics ──

  analytics = {
    usage: async (period?: string): Promise<UsageDataPoint[]> => {
      if (this.demoMode) return demoUsageData;
      return this.request('GET', `/developer/analytics/usage?period=${period || '7d'}`);
    },

    revenue: async (period?: string): Promise<RevenueDataPoint[]> => {
      if (this.demoMode) return demoRevenueData;
      return this.request('GET', `/developer/analytics/revenue?period=${period || '6m'}`);
    },

    payouts: async (): Promise<PayoutRecord[]> => {
      if (this.demoMode) return demoPayouts;
      return this.request('GET', '/developer/analytics/payouts');
    },
  };

  // ── Community ──

  community = {
    listRequests: async (): Promise<FeatureRequest[]> => {
      if (this.demoMode) return demoFeatureRequests;
      return this.request('GET', '/marketplace/community-requests');
    },

    createRequest: async (data: { title: string; description: string; category: string; fundingGoal: number }): Promise<FeatureRequest> => {
      if (this.demoMode) {
        return { id: 'fr-demo', ...data, requester: 'You', requesterRole: 'Educator', currentFunding: 0, goalFunding: data.fundingGoal, pledgeCount: 0, deadline: '30 Jun 2026', status: 'active', upvotes: 0 };
      }
      return this.request('POST', '/marketplace/community-requests', {
        ...data,
        requirements: [],
        targetAudience: { roles: ['educator'], educationLevels: ['primary'], contexts: ['traditional_school'] },
        fundingGoal: String(data.fundingGoal),
      });
    },

    pledge: async (requestId: string, amount: number): Promise<{ success: boolean }> => {
      if (this.demoMode) return { success: true };
      return this.request('POST', `/marketplace/community-requests/${requestId}/pledge`, { amount: String(amount) });
    },

    listBounties: async (): Promise<Bounty[]> => {
      if (this.demoMode) return demoBounties;
      return this.request('GET', '/marketplace/bounties');
    },

    claimBounty: async (bountyId: string, proposal: string): Promise<{ success: boolean }> => {
      if (this.demoMode) return { success: true };
      return this.request('POST', `/marketplace/bounties/${bountyId}/claim`, {
        developerId: 'self',
        developerName: 'Current User',
        proposal,
        estimatedDeliveryDate: new Date(Date.now() + 90 * 86400000).toISOString(),
        proposedMilestones: [],
        relevantExperience: 'N/A',
        portfolioLinks: [],
      });
    },
  };

  // ── Docs ──

  docs = {
    getCategories: async (): Promise<{ categories: ApiDocCategory[]; totalEndpoints: number }> => {
      if (this.demoMode) {
        const total = demoDocCategories.reduce((sum, c) => sum + c.endpointCount, 0);
        return { categories: demoDocCategories, totalEndpoints: total };
      }
      return this.request('GET', '/developer/api-docs');
    },

    getEndpoint: async (key: string): Promise<{ category: string; description: string; endpoints: ApiDocEndpoint[] }> => {
      if (this.demoMode) {
        const cat = demoDocCategories.find(c => c.key === key);
        return { category: cat?.category || key, description: cat?.description || '', endpoints: [] };
      }
      return this.request('GET', `/developer/api-docs/${key}`);
    },
  };

  // ── AI ──

  ai = {
    recommendations: async (): Promise<AppRecommendation[]> => {
      return this.apps.getRecommendations();
    },

    generateSnippet: async (endpointPath: string, method: string, language: string): Promise<CodeSnippet> => {
      if (this.demoMode) {
        const snippets: Record<string, (path: string, m: string) => string> = {
          typescript: (p, m) => `const response = await fetch('${API_BASE}${p}', {\n  method: '${m}',\n  headers: {\n    'Content-Type': 'application/json',\n    'Authorization': 'Bearer sk_prod_YOUR_KEY',\n  },\n});\nconst data = await response.json();`,
          python: (p, m) => `import requests\n\nresponse = requests.${m.toLowerCase()}(\n    '${API_BASE}${p}',\n    headers={'Authorization': 'Bearer sk_prod_YOUR_KEY'},\n)\ndata = response.json()`,
          curl: (p, m) => `curl -X ${m} '${API_BASE}${p}' \\\n  -H 'Content-Type: application/json' \\\n  -H 'Authorization: Bearer sk_prod_YOUR_KEY'`,
        };
        return { language, code: (snippets[language] || snippets.typescript)(endpointPath, method), endpoint: endpointPath };
      }
      return this.request('POST', '/developer/ai/generate-snippet', { endpointPath, method, language });
    },

    searchDocs: async (query: string): Promise<DocSearchResult[]> => {
      if (this.demoMode) {
        const q = query.toLowerCase();
        return demoDocCategories
          .filter(c => c.category.toLowerCase().includes(q) || c.description.toLowerCase().includes(q))
          .map(c => ({ category: c.category, endpoint: { path: '', method: 'GET', description: c.description }, relevance: 0.8 }));
      }
      return this.request('POST', '/developer/ai/search-docs', { query });
    },
  };
}

export const marketplaceApi = new MarketplaceApiClient();
