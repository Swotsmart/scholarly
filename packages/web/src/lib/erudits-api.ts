/**
 * Erudits Publishing Platform — API Client
 *
 * Namespaced client covering storefront, publishing, book club, and migration.
 * Follows the teacher-api.ts pattern: class-free, credentials: 'include'.
 *
 * Route mount paths (from packages/erudits/src/routes/mount.ts):
 *   /api/v1/erudits/storefront/*  — storefront.routes.ts
 *   /api/v1/erudits/publishing/*  — publishing.routes.ts
 *   /api/v1/erudits/bookclub/*    — bookclub.routes.ts
 *   /api/v1/erudits/migration/*   — migration.routes.ts
 */

import type {
  DigitalResource,
  Manuscript,
  ManuscriptVersion,
  BookPublication,
  BookCover,
  BookClub,
  BookClubSession,
  BookClubReading,
  BookClubMember,
  PlatformMigration,
  MigrationContentItem,
  ResourceReview,
  SalesRecord,
  AuthorStats,
  PaginatedResult,
  StorefrontSearchParams,
  ResourceFormat,
  LicenceScope,
  ManuscriptStatus,
  DistributionChannel,
  PublicationFormat,
  MigrationSource,
} from '@/types/erudits';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const V1 = `${API_BASE}/api/v1/erudits`;
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

// =============================================================================
// BASE REQUEST HELPER
// =============================================================================

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const url = `${V1}${path}`;
  const options: RequestInit = {
    method,
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  };
  if (body) options.body = JSON.stringify(body);
  const response = await fetch(url, options);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as Record<string, string>).message || `${method} ${path} failed (${response.status})`);
  }
  return response.json();
}

function qs(params: Record<string, string | number | boolean | string[] | undefined>): string {
  const entries: [string, string][] = [];
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const item of v) entries.push([k, item]);
    } else {
      entries.push([k, String(v)]);
    }
  }
  if (entries.length === 0) return '';
  return '?' + new URLSearchParams(entries).toString();
}

// =============================================================================
// DEMO FALLBACK DATA
// =============================================================================

const DEMO_RESOURCES: DigitalResource[] = [
  {
    id: 'res-demo-1',
    tenantId: 'demo',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-15T00:00:00Z',
    authorId: 'author-1',
    authorName: 'Marie Dupont',
    title: 'French ATAR Unit 1 — Complete Study Guide',
    slug: 'french-atar-u1-study-guide',
    description: 'Comprehensive study guide covering all Unit 1 ATAR French topics, with practice exercises, vocabulary lists, and grammar explanations aligned to WACE syllabus.',
    shortDescription: 'Complete Unit 1 ATAR French study guide',
    coverImageUrl: undefined,
    files: [],
    priceIndividualCents: 2499,
    priceSingleSchoolCents: 9999,
    priceMultiSchoolCents: 24999,
    currency: 'AUD',
    format: 'pdf',
    status: 'published',
    subjectArea: 'French',
    yearLevels: ['Year 11', 'Year 12'],
    curriculumTags: [{ id: 'ct-1', tenantId: 'demo', framework: 'WACE_ATAR', code: 'FR_SL_U1', label: 'French Second Language ATAR Unit 1', level: 1 }],
    tags: ['french', 'atar', 'wace', 'study-guide'],
    featured: true,
    totalPurchases: 142,
    totalRevenueCents: 354858,
    averageRating: 4.8,
    ratingCount: 38,
    moderationStatus: 'approved',
    previewPageCount: 5,
    sampleFileUrl: undefined,
  },
  {
    id: 'res-demo-2',
    tenantId: 'demo',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-02-20T00:00:00Z',
    authorId: 'author-1',
    authorName: 'Marie Dupont',
    title: 'CEFR B1 Conversation Cards — 200 Prompts',
    slug: 'cefr-b1-conversation-cards',
    description: 'Printable conversation prompt cards for intermediate French learners. Covers 20 themes: travel, food, culture, education, technology, and more.',
    shortDescription: '200 conversation prompts for B1 French',
    coverImageUrl: undefined,
    files: [],
    priceIndividualCents: 1499,
    currency: 'AUD',
    format: 'pdf',
    status: 'published',
    subjectArea: 'French',
    yearLevels: ['Year 9', 'Year 10', 'Year 11'],
    curriculumTags: [{ id: 'ct-2', tenantId: 'demo', framework: 'CEFR', code: 'B1', label: 'Threshold / Intermediate', level: 1 }],
    tags: ['french', 'conversation', 'cefr', 'b1'],
    featured: false,
    totalPurchases: 87,
    totalRevenueCents: 130413,
    averageRating: 4.6,
    ratingCount: 22,
    moderationStatus: 'approved',
  },
  {
    id: 'res-demo-3',
    tenantId: 'demo',
    createdAt: '2026-02-10T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    authorId: 'author-2',
    authorName: 'Jean-Luc Martin',
    title: 'French Phonics Audio Pack — Years 3-6',
    slug: 'french-phonics-audio-pack',
    description: 'Native-speaker audio recordings for 120 French phonics patterns. Includes lesson plans, worksheets, and assessment rubrics.',
    shortDescription: 'Audio phonics pack with lesson plans',
    coverImageUrl: undefined,
    files: [],
    priceIndividualCents: 3499,
    priceSingleSchoolCents: 14999,
    currency: 'AUD',
    format: 'audio_mp3',
    status: 'published',
    subjectArea: 'French',
    yearLevels: ['Year 3', 'Year 4', 'Year 5', 'Year 6'],
    curriculumTags: [],
    tags: ['french', 'phonics', 'audio', 'primary'],
    featured: true,
    totalPurchases: 54,
    totalRevenueCents: 188946,
    averageRating: 4.9,
    ratingCount: 15,
    moderationStatus: 'approved',
  },
];

const DEMO_MANUSCRIPTS: Manuscript[] = [
  {
    id: 'ms-demo-1',
    tenantId: 'demo',
    createdAt: '2026-01-10T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    authorId: 'author-1',
    authorName: 'Marie Dupont',
    collaboratorIds: [],
    title: 'Le Petit Guide du Francais ATAR',
    subtitle: 'A Student Companion for WACE French',
    slug: 'le-petit-guide-francais-atar',
    description: 'A comprehensive textbook covering all four ATAR French units with exercises, cultural notes, and exam preparation.',
    language: 'fr',
    secondaryLanguage: 'en',
    content: {},
    wordCount: 45200,
    pageCountEstimate: 186,
    chapters: [
      { id: 'ch-1', tenantId: 'demo', manuscriptId: 'ms-demo-1', title: 'Unit 1: Moi et mon monde', sortOrder: 1, wordCount: 11200, learningObjectives: ['Introduce self', 'Describe daily routine'] },
      { id: 'ch-2', tenantId: 'demo', manuscriptId: 'ms-demo-1', title: 'Unit 2: Voyages et aventures', sortOrder: 2, wordCount: 10800, learningObjectives: ['Discuss travel', 'Book accommodation'] },
      { id: 'ch-3', tenantId: 'demo', manuscriptId: 'ms-demo-1', title: 'Unit 3: Societe et culture', sortOrder: 3, wordCount: 12400, learningObjectives: ['Analyse cultural differences'] },
      { id: 'ch-4', tenantId: 'demo', manuscriptId: 'ms-demo-1', title: 'Unit 4: Le monde contemporain', sortOrder: 4, wordCount: 10800, learningObjectives: ['Discuss current affairs'] },
    ],
    genre: 'textbook',
    subjectArea: 'French',
    yearLevels: ['Year 11', 'Year 12'],
    curriculumTags: [],
    status: 'formatting',
    currentVersionId: 'v-12',
  },
  {
    id: 'ms-demo-2',
    tenantId: 'demo',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-02-28T00:00:00Z',
    authorId: 'author-1',
    authorName: 'Marie Dupont',
    collaboratorIds: ['author-3'],
    title: 'French Grammar Essentials',
    slug: 'french-grammar-essentials',
    description: 'Quick-reference grammar guide for secondary French students.',
    language: 'en',
    content: {},
    wordCount: 18400,
    pageCountEstimate: 76,
    chapters: [
      { id: 'ch-5', tenantId: 'demo', manuscriptId: 'ms-demo-2', title: 'Verbs & Tenses', sortOrder: 1, wordCount: 6200, learningObjectives: ['Master verb conjugation'] },
      { id: 'ch-6', tenantId: 'demo', manuscriptId: 'ms-demo-2', title: 'Pronouns & Agreement', sortOrder: 2, wordCount: 4800, learningObjectives: ['Use pronouns correctly'] },
      { id: 'ch-7', tenantId: 'demo', manuscriptId: 'ms-demo-2', title: 'Complex Sentences', sortOrder: 3, wordCount: 7400, learningObjectives: ['Build complex sentences'] },
    ],
    genre: 'reference',
    subjectArea: 'French',
    yearLevels: ['Year 9', 'Year 10', 'Year 11', 'Year 12'],
    curriculumTags: [],
    status: 'draft',
  },
];

const DEMO_BOOKCLUBS: BookClub[] = [
  {
    id: 'bc-demo-1',
    tenantId: 'demo',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    organiserId: 'author-1',
    organiserName: 'Marie Dupont',
    name: 'Le Cercle Litteraire ATAR',
    slug: 'le-cercle-litteraire-atar',
    description: 'Weekly reading circle for ATAR French students. We read and discuss prescribed texts, building analytical and conversational skills.',
    language: 'fr',
    isPublic: true,
    requiresApproval: false,
    subscriptionRequired: false,
    subjectArea: 'French Literature',
    yearLevels: ['Year 11', 'Year 12'],
    curriculumTags: [],
    curriculumCodes: ['FR_SL_U3'],
    targetYearLevels: ['Year 11', 'Year 12'],
    timezone: 'Australia/Perth',
    isActive: true,
    participantCount: 24,
    memberCount: 24,
    sessionCount: 12,
    readingCount: 3,
    completionRate: 0.72,
    meetingFrequency: 'weekly',
    meetingDay: 'Wednesday',
    meetingTime: '16:00',
  },
  {
    id: 'bc-demo-2',
    tenantId: 'demo',
    createdAt: '2026-02-01T00:00:00Z',
    updatedAt: '2026-03-01T00:00:00Z',
    organiserId: 'author-2',
    organiserName: 'Jean-Luc Martin',
    name: 'Francais Facile Book Club',
    slug: 'francais-facile',
    description: 'Beginner-friendly French reading group. We read graded readers and discuss in a mix of French and English.',
    language: 'fr',
    isPublic: true,
    requiresApproval: false,
    subscriptionRequired: false,
    subjectArea: 'French',
    yearLevels: ['Year 7', 'Year 8', 'Year 9'],
    curriculumTags: [],
    curriculumCodes: [],
    targetYearLevels: ['Year 7', 'Year 8', 'Year 9'],
    timezone: 'Australia/Perth',
    isActive: true,
    participantCount: 18,
    memberCount: 18,
    sessionCount: 8,
    readingCount: 2,
    completionRate: 0.85,
    meetingFrequency: 'fortnightly',
    meetingDay: 'Thursday',
    meetingTime: '15:30',
  },
];

const DEMO_AUTHOR_STATS: AuthorStats = {
  totalResources: 3,
  totalManuscripts: 2,
  totalRevenueCents: 674217,
  totalSales: 283,
  averageRating: 4.77,
  bookClubCount: 2,
};

// =============================================================================
// NAMESPACED API CLIENT
// =============================================================================

export const eruditsApi = {

  // ── Storefront ──

  storefront: {
    async list(params?: StorefrontSearchParams): Promise<PaginatedResult<DigitalResource>> {
      if (DEMO_MODE) {
        let items = [...DEMO_RESOURCES];
        if (params?.search) {
          const q = params.search.toLowerCase();
          items = items.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
        }
        if (params?.subjectArea) items = items.filter(r => r.subjectArea === params.subjectArea);
        if (params?.format) items = items.filter(r => r.format === params.format);
        return { items, total: items.length, page: 1, pageSize: 20, totalPages: 1 };
      }
      return request('GET', `/storefront/resources/search${qs({
        search: params?.search,
        subjectArea: params?.subjectArea,
        format: params?.format,
        minPrice: params?.minPrice,
        maxPrice: params?.maxPrice,
        featured: params?.featured,
        page: params?.page,
        pageSize: params?.pageSize,
        sortBy: params?.sortBy,
        sortOrder: params?.sortOrder,
      })}`);
    },

    async get(id: string): Promise<DigitalResource> {
      if (DEMO_MODE) {
        const found = DEMO_RESOURCES.find(r => r.id === id);
        if (!found) throw new Error('Resource not found');
        return found;
      }
      return request('GET', `/storefront/resources/${id}`);
    },

    async search(query: string): Promise<PaginatedResult<DigitalResource>> {
      return eruditsApi.storefront.list({ search: query });
    },

    async getReviews(resourceId: string): Promise<ResourceReview[]> {
      if (DEMO_MODE) {
        return [
          { id: 'rev-1', tenantId: 'demo', createdAt: '2026-02-20T00:00:00Z', resourceId, reviewerId: 'u-1', reviewerName: 'Sophie L.', rating: 5, title: 'Excellent resource', body: 'Very well structured and aligned to the ATAR syllabus. My students loved it.', isPublished: true },
          { id: 'rev-2', tenantId: 'demo', createdAt: '2026-02-18T00:00:00Z', resourceId, reviewerId: 'u-2', reviewerName: 'Thomas R.', rating: 4, title: 'Great quality', body: 'Thorough coverage of Unit 1 topics. Would love to see audio included.', isPublished: true },
        ];
      }
      return request('GET', `/storefront/resources/${resourceId}/reviews`);
    },

    async getRecommendations(): Promise<DigitalResource[]> {
      if (DEMO_MODE) return DEMO_RESOURCES.filter(r => r.featured);
      return request('GET', '/storefront/resources/recommendations');
    },

    async purchase(resourceId: string, licenceScope: LicenceScope, paymentMethodId: string): Promise<{ purchaseId: string }> {
      return request('POST', `/storefront/resources/${resourceId}/purchase`, { licenceScope, stripePaymentMethodId: paymentMethodId });
    },
  },

  // ── Publishing ──

  publishing: {
    async list(): Promise<Manuscript[]> {
      if (DEMO_MODE) return DEMO_MANUSCRIPTS;
      const result = await request<{ items: Manuscript[] }>('GET', '/publishing/manuscripts');
      return result.items || [];
    },

    async get(id: string): Promise<Manuscript> {
      if (DEMO_MODE) {
        const found = DEMO_MANUSCRIPTS.find(m => m.id === id);
        if (!found) throw new Error('Manuscript not found');
        return found;
      }
      return request('GET', `/publishing/manuscripts/${id}`);
    },

    async create(data: {
      title: string;
      subtitle?: string;
      description?: string;
      language?: string;
      genre?: string;
      subjectArea?: string;
      yearLevels?: string[];
    }): Promise<Manuscript> {
      if (DEMO_MODE) {
        return {
          id: `ms-new-${Date.now()}`,
          tenantId: 'demo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          authorId: 'author-1',
          authorName: 'Demo Author',
          collaboratorIds: [],
          title: data.title,
          subtitle: data.subtitle,
          slug: data.title.toLowerCase().replace(/\s+/g, '-'),
          description: data.description,
          language: data.language || 'en',
          content: {},
          wordCount: 0,
          pageCountEstimate: 0,
          chapters: [],
          genre: data.genre,
          subjectArea: data.subjectArea,
          yearLevels: data.yearLevels || [],
          curriculumTags: [],
          status: 'draft',
        };
      }
      return request('POST', '/publishing/manuscripts', data);
    },

    async update(id: string, data: Record<string, unknown>): Promise<Manuscript> {
      return request('PUT', `/publishing/manuscripts/${id}`, data);
    },

    async getVersions(id: string): Promise<ManuscriptVersion[]> {
      if (DEMO_MODE) {
        return [
          { id: 'v-12', tenantId: 'demo', createdAt: '2026-03-01T00:00:00Z', manuscriptId: id, versionNumber: 12, label: 'Final review edits', content: {}, wordCount: 45200, changeDescription: 'Applied reviewer feedback', createdBy: 'author-1' },
          { id: 'v-11', tenantId: 'demo', createdAt: '2026-02-28T00:00:00Z', manuscriptId: id, versionNumber: 11, label: 'Chapter 4 complete', content: {}, wordCount: 44800, createdBy: 'author-1' },
          { id: 'v-10', tenantId: 'demo', createdAt: '2026-02-25T00:00:00Z', manuscriptId: id, versionNumber: 10, content: {}, wordCount: 42100, createdBy: 'author-1' },
        ];
      }
      return request('GET', `/publishing/manuscripts/${id}/versions`);
    },

    async saveVersion(id: string, label?: string): Promise<ManuscriptVersion> {
      return request('POST', `/publishing/manuscripts/${id}/versions`, { label });
    },

    async publish(id: string, params: {
      versionId: string;
      formats: PublicationFormat[];
      channels: DistributionChannel[];
      pricing: Record<string, { priceCents: number; currency: string }>;
    }): Promise<BookPublication> {
      return request('POST', `/publishing/manuscripts/${id}/publish`, params);
    },

    async getCovers(id: string): Promise<BookCover[]> {
      if (DEMO_MODE) {
        return [
          { id: 'cover-1', tenantId: 'demo', createdAt: '2026-02-15T00:00:00Z', manuscriptId: id, source: 'ai_generated', frontCoverUrl: undefined, thumbnailUrl: undefined, isSelected: true },
        ];
      }
      return request('GET', `/publishing/manuscripts/${id}/covers`);
    },

    async generateCover(id: string, prompt: string): Promise<BookCover> {
      return request('POST', `/publishing/manuscripts/${id}/covers/generate`, { prompt, manuscriptId: id });
    },

    async getAnalytics(): Promise<{ totalSales: number; totalRevenueCents: number; salesByChannel: Record<string, number> }> {
      if (DEMO_MODE) {
        return { totalSales: 283, totalRevenueCents: 674217, salesByChannel: { scholarly_direct: 198, amazon_kdp: 52, school_direct: 33 } };
      }
      return request('GET', '/publishing/analytics');
    },
  },

  // ── Book Club ──

  bookclub: {
    async list(): Promise<BookClub[]> {
      if (DEMO_MODE) return DEMO_BOOKCLUBS;
      const result = await request<{ items: BookClub[] }>('GET', '/bookclub/clubs');
      return result.items || [];
    },

    async get(id: string): Promise<BookClub> {
      if (DEMO_MODE) {
        const found = DEMO_BOOKCLUBS.find(c => c.id === id);
        if (!found) throw new Error('Book club not found');
        return found;
      }
      return request('GET', `/bookclub/clubs/${id}`);
    },

    async join(id: string): Promise<void> {
      return request('POST', `/bookclub/clubs/${id}/join`);
    },

    async leave(id: string): Promise<void> {
      return request('POST', `/bookclub/clubs/${id}/leave`);
    },

    async getMembers(id: string): Promise<BookClubMember[]> {
      if (DEMO_MODE) {
        return [
          { id: 'bm-1', tenantId: 'demo', createdAt: '2026-01-15T00:00:00Z', bookClubId: id, userId: 'u-1', displayName: 'Sophie Laurent', userName: 'sophie.l', role: 'organiser', isActive: true, readingsCompleted: 3, sessionsAttended: 10, engagementScore: 95 },
          { id: 'bm-2', tenantId: 'demo', createdAt: '2026-01-16T00:00:00Z', bookClubId: id, userId: 'u-2', displayName: 'Thomas Renard', userName: 'thomas.r', role: 'member', isActive: true, readingsCompleted: 2, sessionsAttended: 8, engagementScore: 82 },
          { id: 'bm-3', tenantId: 'demo', createdAt: '2026-01-20T00:00:00Z', bookClubId: id, userId: 'u-3', displayName: 'Emma Chen', userName: 'emma.c', role: 'member', isActive: true, readingsCompleted: 3, sessionsAttended: 11, engagementScore: 91 },
        ];
      }
      return request('GET', `/bookclub/clubs/${id}/members`);
    },

    async getSessions(id: string): Promise<BookClubSession[]> {
      if (DEMO_MODE) {
        return [
          { id: 'bs-1', tenantId: 'demo', createdAt: '2026-02-01T00:00:00Z', bookClubId: id, title: 'Chapter 1-3 Discussion', description: 'Discuss themes and characters introduced in the opening chapters.', sessionType: 'discussion', scheduledAt: '2026-03-12T16:00:00+08:00', durationMinutes: 45, sortOrder: 1, discussionPrompts: ['What are the main themes?', 'How does the setting influence the story?'], status: 'scheduled', isCompleted: false, attendeeCount: 0 },
          { id: 'bs-2', tenantId: 'demo', createdAt: '2026-02-01T00:00:00Z', bookClubId: id, title: 'Vocabulary Review', sessionType: 'activity', scheduledAt: '2026-03-19T16:00:00+08:00', durationMinutes: 30, sortOrder: 2, status: 'scheduled', isCompleted: false, attendeeCount: 0 },
          { id: 'bs-3', tenantId: 'demo', createdAt: '2026-02-01T00:00:00Z', bookClubId: id, title: 'Chapter 4-6 Discussion', sessionType: 'discussion', scheduledAt: '2026-03-26T16:00:00+08:00', durationMinutes: 45, sortOrder: 3, status: 'scheduled', isCompleted: false, attendeeCount: 0 },
        ];
      }
      return request('GET', `/bookclub/clubs/${id}/sessions/upcoming`);
    },

    async getReadings(id: string): Promise<BookClubReading[]> {
      if (DEMO_MODE) {
        return [
          { id: 'br-1', tenantId: 'demo', createdAt: '2026-01-20T00:00:00Z', bookClubId: id, title: 'Le Petit Prince', author: 'Antoine de Saint-Exupery', sortOrder: 1, startDate: '2026-02-01T00:00:00Z', endDate: '2026-03-15T00:00:00Z', learningObjectives: ['Analyse symbolism', 'Discuss philosophical themes'], isComplete: false, completionRate: 0.65 },
          { id: 'br-2', tenantId: 'demo', createdAt: '2026-01-20T00:00:00Z', bookClubId: id, title: "L'Etranger", author: 'Albert Camus', sortOrder: 2, startDate: '2026-03-16T00:00:00Z', endDate: '2026-04-30T00:00:00Z', learningObjectives: ['Understand existentialism', 'Analyse narrative voice'], isComplete: false, completionRate: 0 },
        ];
      }
      return request('GET', `/bookclub/clubs/${id}/readings`);
    },

    async generateQuestions(clubId: string, readingId: string): Promise<{ questions: string[] }> {
      if (DEMO_MODE) {
        return { questions: [
          'What symbolic meaning does the rose hold for the Little Prince?',
          'How does the fox define friendship, and what does "taming" mean?',
          'Compare the grown-ups on different planets. What criticism of adult society does Saint-Exupery make?',
          'Why does the narrator draw a boa constrictor eating an elephant?',
          'What lesson does the Little Prince learn about responsibility?',
        ]};
      }
      return request('POST', `/bookclub/clubs/${clubId}/readings/${readingId}/questions`);
    },
  },

  // ── Migration ──

  migration: {
    async start(source: MigrationSource, sourceUrl: string, customDomain?: string): Promise<PlatformMigration> {
      if (DEMO_MODE) {
        return {
          id: `mig-demo-${Date.now()}`,
          tenantId: 'demo',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          source,
          sourceUrl,
          ownerId: 'author-1',
          ownerEmail: 'demo@scholarly.com',
          status: 'created',
          progressPercent: 0,
          pagesFound: 0, productsFound: 0, membersFound: 0, imagesFound: 0, postsFound: 0,
          pagesImported: 0, productsImported: 0, membersImported: 0, imagesImported: 0, postsImported: 0,
          customDomain,
          dnsVerified: false,
          sslProvisioned: false,
        };
      }
      return request('POST', '/migration/migrations', { source, sourceUrl, customDomain });
    },

    async status(id: string): Promise<PlatformMigration> {
      if (DEMO_MODE) {
        return {
          id,
          tenantId: 'demo',
          createdAt: '2026-03-01T00:00:00Z',
          updatedAt: new Date().toISOString(),
          source: 'squarespace',
          sourceUrl: 'https://erudits-french.squarespace.com',
          ownerId: 'author-1',
          ownerEmail: 'demo@scholarly.com',
          status: 'ready_for_review',
          currentStep: 'review',
          progressPercent: 60,
          pagesFound: 12, productsFound: 8, membersFound: 45, imagesFound: 34, postsFound: 6,
          pagesImported: 0, productsImported: 0, membersImported: 0, imagesImported: 0, postsImported: 0,
          dnsVerified: false,
          sslProvisioned: false,
        };
      }
      return request('GET', `/migration/migrations/${id}`);
    },

    async getContent(id: string): Promise<MigrationContentItem[]> {
      if (DEMO_MODE) {
        return [
          { id: 'mc-1', tenantId: 'demo', migrationId: id, sourceType: 'product', sourceTitle: 'ATAR French Study Guide', status: 'mapped', requiresReview: false, targetType: 'digital_resource' },
          { id: 'mc-2', tenantId: 'demo', migrationId: id, sourceType: 'page', sourceTitle: 'About Erudits', status: 'mapped', requiresReview: true, targetType: 'cms_page' },
          { id: 'mc-3', tenantId: 'demo', migrationId: id, sourceType: 'post', sourceTitle: 'Tips for ATAR French Success', status: 'pending', requiresReview: true },
        ];
      }
      return request('GET', `/migration/migrations/${id}/content`);
    },

    async approve(id: string, approvedItems: string[], skippedItems: string[]): Promise<PlatformMigration> {
      return request('POST', `/migration/migrations/${id}/approve`, { approvedItems, skippedItems });
    },
  },

  // ── Author Dashboard Stats ──

  stats: {
    async get(): Promise<AuthorStats> {
      if (DEMO_MODE) return DEMO_AUTHOR_STATS;
      return request('GET', '/storefront/analytics');
    },
  },
};
