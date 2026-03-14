/**
 * Storybook Engine API Client
 *
 * Namespaced client covering the storybook route file:
 *   /api/v1/storybook/*  →  storybook.ts (1,224L, 20 endpoints)
 *
 * Follows the teacherApi/parentApi pattern: namespaced object, credentials:include,
 * DEMO_MODE fallback with sample storybook data.
 *
 * Namespace structure mirrors the backend route groups:
 *   storybookApi.generation   — story generation pipeline
 *   storybookApi.library      — browse and search published stories
 *   storybookApi.review       — 5-stage quality review pipeline
 *   storybookApi.seedLibrary  — curated seed storybook library
 *   storybookApi.marketplace  — creator profiles and content bounties
 *   storybookApi.moderation   — content moderation queue
 *   storybookApi.languages    — supported language reference data
 */

import type {
  GenerateStoryInput,
  GenerationJob,
  IllustrateInput,
  NarrateInput,
  LibraryListResponse,
  StoryDetail,
  RecommendedStory,
  ReviewItem,
  PeerReviewInput,
  SeedLibraryResponse,
  CreatorProfile,
  CreatorListResponse,
  ContentBounty,
  CreateBountyInput,
  BountyListResponse,
  ModerationItem,
  ModerationMetrics,
  ModerationDecision,
  SupportedLanguage,
  StoryListItem,
} from '@/types/storybook';

const V1 = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// =============================================================================
// BASE REQUEST HELPER
// =============================================================================

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${V1}${path}`;
  let token: string | null = null;
  try {
    const stored = localStorage.getItem('scholarly-auth');
    if (stored) {
      const parsed = JSON.parse(stored);
      token = parsed?.state?.accessToken || null;
    }
  } catch { /* ignore */ }
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).message || `${method} ${path} failed (${response.status})`);
  }
  const json = await response.json();
  return json.data ?? json;
}

function qs(params: Record<string, string | number | boolean | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// =============================================================================
// DEMO DATA
// =============================================================================

const DEMO_STORIES: StoryListItem[] = [
  {
    id: 'story-001',
    title: 'Finn the Fox and the Singing Stream',
    description: 'A Phase 2 decodable story about a fox who discovers music in nature. Targets: sh, ch, th digraphs.',
    thumbnailUrl: null,
    qualityScore: 4.6,
    averageRating: 4.7,
    reviewCount: 23,
    downloadCount: 156,
    tags: ['phase-2', 'animals', 'nature', 'en-AU'],
    publishedAt: '2026-02-15T00:00:00Z',
    createdAt: '2026-02-10T00:00:00Z',
    creator: { id: 'creator-001', displayName: 'Ms. Sarah Chen', avatarUrl: null },
  },
  {
    id: 'story-002',
    title: 'The Big Red Bus Goes Up the Hill',
    description: 'A Phase 1 story practising CVC words with s, a, t, p, i, n. Perfect for beginning readers.',
    thumbnailUrl: null,
    qualityScore: 4.8,
    averageRating: 4.9,
    reviewCount: 45,
    downloadCount: 312,
    tags: ['phase-1', 'transport', 'adventure', 'en-AU'],
    publishedAt: '2026-01-20T00:00:00Z',
    createdAt: '2026-01-15T00:00:00Z',
    creator: { id: 'creator-002', displayName: 'James Wright', avatarUrl: null },
  },
  {
    id: 'story-003',
    title: 'Pip and the Magic Garden',
    description: 'A Phase 3 story featuring long vowel sounds. A little bird helps a garden grow with the power of reading.',
    thumbnailUrl: null,
    qualityScore: 4.4,
    averageRating: 4.5,
    reviewCount: 18,
    downloadCount: 89,
    tags: ['phase-3', 'garden', 'magic', 'en-AU'],
    publishedAt: '2026-02-28T00:00:00Z',
    createdAt: '2026-02-20T00:00:00Z',
    creator: { id: 'creator-001', displayName: 'Ms. Sarah Chen', avatarUrl: null },
  },
  {
    id: 'story-004',
    title: 'The Wombat Who Wanted to Fly',
    description: 'A Phase 2 Australian animals story with blending practice. Decodability: 92%.',
    thumbnailUrl: null,
    qualityScore: 4.3,
    averageRating: 4.6,
    reviewCount: 12,
    downloadCount: 67,
    tags: ['phase-2', 'australian-animals', 'dreams', 'en-AU'],
    publishedAt: '2026-03-01T00:00:00Z',
    createdAt: '2026-02-25T00:00:00Z',
    creator: { id: 'creator-003', displayName: 'Emily Nguyen', avatarUrl: null },
  },
];

const DEMO_CREATORS: CreatorProfile[] = [
  {
    id: 'creator-001', userId: 'user-001', displayName: 'Ms. Sarah Chen', bio: 'Primary school teacher in Fremantle, WA. Passionate about phonics-based literacy.',
    avatarUrl: null, tier: 'gold', level: 8, badges: ['verified-educator', 'top-creator', 'quality-champion'],
    totalContent: 24, totalSales: 450, totalDownloads: 1200, averageRating: 4.7, totalReviews: 89,
    totalEarnings: 2340, totalPublished: 18, subjects: ['Phonics', 'Reading', 'Literacy'], yearLevels: ['Foundation', 'Year 1', 'Year 2'],
    isVerifiedEducator: true, createdAt: '2025-09-01T00:00:00Z',
  },
  {
    id: 'creator-002', userId: 'user-002', displayName: 'James Wright', bio: 'Children\'s author and literacy consultant based in Perth.',
    avatarUrl: null, tier: 'platinum', level: 12, badges: ['verified-educator', 'prolific-creator', 'community-leader'],
    totalContent: 45, totalSales: 890, totalDownloads: 3400, averageRating: 4.8, totalReviews: 156,
    totalEarnings: 5670, totalPublished: 38, subjects: ['Phonics', 'Creative Writing'], yearLevels: ['Foundation', 'Year 1', 'Year 2', 'Year 3'],
    isVerifiedEducator: true, createdAt: '2025-06-15T00:00:00Z',
  },
];

const DEMO_BOUNTIES: ContentBounty[] = [
  {
    id: 'bounty-001', title: 'Phase 3 Australian Animals Stories (ages 5-7)', description: 'We need engaging Phase 3 storybooks featuring Australian native animals. Must target long vowel sounds and achieve 85%+ decodability.',
    category: 'storybook', status: 'open', rewardTokens: 500, rewardCurrency: 50, requirements: { phase: 3, minDecodability: 0.85 },
    rubric: null, eligibleTiers: ['silver', 'gold', 'platinum'], tags: ['phase-3', 'australian-animals'],
    submissionDeadline: '2026-04-30T00:00:00Z', submissionCount: 3, createdAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'bounty-002', title: 'Multilingual Phase 1 Stories (French)', description: 'Create beginner French phonics storybooks aligned with the French phonics scope & sequence.',
    category: 'storybook', status: 'open', rewardTokens: 750, rewardCurrency: 75, requirements: { language: 'fr-FR', phase: 1 },
    rubric: null, eligibleTiers: ['gold', 'platinum'], tags: ['phase-1', 'french', 'multilingual'],
    submissionDeadline: '2026-05-15T00:00:00Z', submissionCount: 1, createdAt: '2026-02-15T00:00:00Z',
  },
];

// =============================================================================
// NAMESPACED API CLIENT
// =============================================================================

export const storybookApi = {

  // ── Generation (2 endpoints) ──
  generation: {
    async create(input: GenerateStoryInput): Promise<GenerationJob> {
      if (DEMO_MODE) return { id: 'job-demo-001', status: 'pending', jobType: 'story', progress: 0, createdAt: new Date().toISOString() };
      return request('POST', '/storybook/generate', input);
    },
    async getStatus(jobId: string): Promise<GenerationJob> {
      if (DEMO_MODE) return { id: jobId, status: 'completed', jobType: 'story', progress: 100, resultContentId: 'story-demo-001', createdAt: new Date().toISOString() };
      return request('GET', `/storybook/generate/${jobId}/status`);
    },
    async illustrate(input: IllustrateInput): Promise<GenerationJob> {
      if (DEMO_MODE) return { id: 'job-illus-001', status: 'pending', jobType: 'illustration', progress: 0, createdAt: new Date().toISOString() };
      return request('POST', '/storybook/illustrate', input);
    },
    async narrate(input: NarrateInput): Promise<GenerationJob> {
      if (DEMO_MODE) return { id: 'job-narr-001', status: 'pending', jobType: 'narration', progress: 0, createdAt: new Date().toISOString() };
      return request('POST', '/storybook/narrate', input);
    },
  },

  // ── Library (3 endpoints) ──
  library: {
    async list(params?: { phase?: string; theme?: string; language?: string; search?: string; page?: number; limit?: number }): Promise<LibraryListResponse> {
      if (DEMO_MODE) {
        let items = [...DEMO_STORIES];
        if (params?.phase) items = items.filter(s => s.tags.some(t => t.includes(params.phase!)));
        if (params?.search) items = items.filter(s => s.title.toLowerCase().includes(params.search!.toLowerCase()));
        return { items, pagination: { page: 1, limit: 20, total: items.length, totalPages: 1 }, filters: params || {} };
      }
      return request('GET', `/storybook/library${qs({ phase: params?.phase, theme: params?.theme, language: params?.language, search: params?.search, page: params?.page, limit: params?.limit })}`);
    },
    async get(storyId: string): Promise<StoryDetail> {
      if (DEMO_MODE) {
        const story = DEMO_STORIES.find(s => s.id === storyId) || DEMO_STORIES[0];
        return { ...story, reviews: [] };
      }
      return request('GET', `/storybook/library/${storyId}`);
    },
    async getRecommendations(learnerId?: string): Promise<{ recommendations: RecommendedStory[] }> {
      if (DEMO_MODE) {
        return {
          recommendations: DEMO_STORIES.slice(0, 3).map(s => ({
            ...s, matchScore: 0.9 + Math.random() * 0.1, matchReason: 'Matches current phonics phase and interests',
          })),
        };
      }
      return request('GET', `/storybook/library/recommendations${qs({ learnerId })}`);
    },
  },

  // ── Review Pipeline (3 endpoints) ──
  review: {
    async submit(contentId: string): Promise<ReviewItem> {
      if (DEMO_MODE) {
        return { id: 'review-demo-001', contentId, tenantId: 'tenant-001', currentStage: 'automated_validation', automatedScore: null, aiReviewScore: null, peerReviewScore: null, pilotMetrics: null, status: 'pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      return request('POST', '/storybook/review/submit', { contentId });
    },
    async get(reviewId: string): Promise<ReviewItem> {
      if (DEMO_MODE) {
        return { id: reviewId, contentId: 'story-001', tenantId: 'tenant-001', currentStage: 'peer_review', automatedScore: 92, aiReviewScore: 88, peerReviewScore: null, pilotMetrics: null, status: 'in_review', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      }
      return request('GET', `/storybook/review/${reviewId}`);
    },
    async submitPeerReview(reviewId: string, input: PeerReviewInput): Promise<void> {
      if (DEMO_MODE) return;
      return request('POST', `/storybook/review/${reviewId}/peer-review`, input);
    },
  },

  // ── Seed Library (2 endpoints) ──
  seedLibrary: {
    async list(params?: { phase?: string; theme?: string; language?: string; page?: number; limit?: number }): Promise<SeedLibraryResponse> {
      if (DEMO_MODE) {
        return { items: DEMO_STORIES.map(s => ({ id: s.id, title: s.title, description: s.description, thumbnailUrl: s.thumbnailUrl, tags: s.tags, qualityScore: s.qualityScore, averageRating: s.averageRating, publishedAt: s.publishedAt })), pagination: { page: 1, limit: 20, total: DEMO_STORIES.length, totalPages: 1 }, filters: params || {} };
      }
      return request('GET', `/storybook/seed-library${qs({ phase: params?.phase, theme: params?.theme, language: params?.language, page: params?.page, limit: params?.limit })}`);
    },
    async generate(params: { phase: number; count?: number; language?: string }): Promise<GenerationJob> {
      if (DEMO_MODE) return { id: 'seed-job-001', status: 'pending', jobType: 'seed-library', progress: 0, createdAt: new Date().toISOString() };
      return request('POST', '/storybook/seed-library/generate', params);
    },
  },

  // ── Marketplace (4 endpoints) ──
  marketplace: {
    async listCreators(params?: { page?: number; limit?: number }): Promise<CreatorListResponse> {
      if (DEMO_MODE) return { creators: DEMO_CREATORS, pagination: { page: 1, limit: 20, total: DEMO_CREATORS.length, totalPages: 1 } };
      return request('GET', `/storybook/marketplace/creators${qs({ page: params?.page, limit: params?.limit })}`);
    },
    async getCreator(creatorId: string): Promise<CreatorProfile> {
      if (DEMO_MODE) return DEMO_CREATORS.find(c => c.id === creatorId) || DEMO_CREATORS[0];
      return request('GET', `/storybook/marketplace/creators/${creatorId}`);
    },
    async listBounties(params?: { page?: number; limit?: number }): Promise<BountyListResponse> {
      if (DEMO_MODE) return { bounties: DEMO_BOUNTIES, pagination: { page: 1, limit: 20, total: DEMO_BOUNTIES.length, totalPages: 1 } };
      return request('GET', `/storybook/marketplace/bounties${qs({ page: params?.page, limit: params?.limit })}`);
    },
    async createBounty(input: CreateBountyInput): Promise<ContentBounty> {
      if (DEMO_MODE) return { ...DEMO_BOUNTIES[0], id: 'bounty-new', ...input, status: 'open', submissionCount: 0, createdAt: new Date().toISOString() };
      return request('POST', '/storybook/marketplace/bounties', input);
    },
  },

  // ── Moderation (3 endpoints) ──
  moderation: {
    async getNext(): Promise<ModerationItem | null> {
      if (DEMO_MODE) return { id: 'mod-001', contentId: 'story-003', title: 'Pip and the Magic Garden', creatorName: 'Ms. Sarah Chen', contentType: 'storybook', submittedAt: '2026-03-01T00:00:00Z', status: 'pending', priority: 1 };
      return request('GET', '/storybook/moderation/next');
    },
    async submitDecision(itemId: string, decision: ModerationDecision): Promise<void> {
      if (DEMO_MODE) return;
      return request('POST', `/storybook/moderation/${itemId}/review`, decision);
    },
    async getMetrics(): Promise<ModerationMetrics> {
      if (DEMO_MODE) return { totalPending: 5, totalReviewedToday: 12, averageReviewTime: 180, approvalRate: 0.78 };
      return request('GET', '/storybook/moderation/metrics');
    },
  },

  // ── Languages (1 endpoint) ──
  languages: {
    async list(): Promise<{ languages: SupportedLanguage[] }> {
      if (DEMO_MODE) return { languages: [
        { code: 'en-AU', name: 'English (Australia)', phonicsPhases: 6 },
        { code: 'en-GB', name: 'English (UK)', phonicsPhases: 6 },
        { code: 'fr-FR', name: 'French (France)', phonicsPhases: 4 },
      ] };
      return request('GET', '/storybook/languages');
    },
  },
};
