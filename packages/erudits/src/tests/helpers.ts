/**
 * ============================================================================
 * Test Helpers — Mock Factories & Fixtures
 * ============================================================================
 */

import type {
  EventBus, Cache, AIService, FileStorage, ScholarlyConfig,
  MigrationRepository, MigrationContentRepository,
  ResourceRepository, PurchaseRepository, LicenceRepository,
  ManuscriptRepository, ManuscriptVersionRepository,
  PublicationRepository, CoverRepository, SalesRepository,
  BookClubRepository, BookClubSessionRepository,
  BookClubReadingRepository, BookClubMemberRepository,
  DigitalResource, Manuscript, BookClub, PlatformMigration,
  BookClubMember, BookClubSession, BookClubReading, BookPublication,
  MigrationContentItem,
  Result,
} from '../types/erudits.types';

import type { StripeClient, WatermarkService } from '../services/storefront.service';
import type { FormattingEngine } from '../services/publishing.service';

// ============================================================================
// INFRASTRUCTURE MOCKS
// ============================================================================

export function mockEventBus(): jest.Mocked<EventBus> {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

export function mockCache(): jest.Mocked<Cache> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(1),
  };
}

export function mockAIService(): jest.Mocked<AIService> {
  return {
    complete: jest.fn().mockResolvedValue({ text: 'AI response', tokensUsed: 100, cost: 0.01 }),
    generateImage: jest.fn().mockResolvedValue({ imageUrl: 'https://img.test/cover.png', cost: 0.05 }),
  };
}

export function mockFileStorage(): jest.Mocked<FileStorage> {
  return {
    upload: jest.fn().mockResolvedValue('https://cdn.scholarly.app/files/test.pdf'),
    getSignedUrl: jest.fn().mockResolvedValue('https://cdn.scholarly.app/signed/test.pdf?token=abc'),
    delete: jest.fn().mockResolvedValue(undefined),
    copy: jest.fn().mockResolvedValue('https://cdn.scholarly.app/files/copy.pdf'),
  };
}

export function mockConfig(): ScholarlyConfig {
  return {
    aiEnabled: true,
    aiModel: 'claude-sonnet-4-20250514',
    aiMaxTokens: 4000,
    defaultPageSize: 20,
    maxPageSize: 100,
    environment: 'development',
    platformFeePercent: 15,
    stripeFeeFixedCents: 30,
    stripeFeePercent: 2.9,
  };
}

export function mockStripeClient(): jest.Mocked<StripeClient> {
  return {
    createPaymentIntent: jest.fn().mockResolvedValue({
      success: true, data: { paymentIntentId: 'pi_test_123', clientSecret: 'cs_test_456' },
    }),
    confirmPaymentIntent: jest.fn().mockResolvedValue({
      success: true, data: { status: 'succeeded' as const, chargeId: 'ch_test_789' },
    }),
    createRefund: jest.fn().mockResolvedValue({ success: true, data: { refundId: 're_test_abc' } }),
    getConnectedAccountId: jest.fn().mockResolvedValue('acct_test_author'),
  };
}

export function mockWatermarkService(): jest.Mocked<WatermarkService> {
  return { applyWatermark: jest.fn().mockResolvedValue(Buffer.from('watermarked')) };
}

export function mockFormattingEngine(): jest.Mocked<FormattingEngine> {
  return {
    format: jest.fn().mockResolvedValue({
      success: true,
      data: { buffer: Buffer.from('formatted'), mimeType: 'application/epub+zip', fileExtension: '.epub', pageCount: 100, fileSizeBytes: 50000 },
    }),
    estimatePageCount: jest.fn().mockResolvedValue(100),
  };
}

// ============================================================================
// REPOSITORY MOCKS
// ============================================================================

export function mockMigrationRepo(): jest.Mocked<MigrationRepository> {
  return {
    save: jest.fn().mockImplementation((_t, m) => Promise.resolve(m)),
    findById: jest.fn().mockResolvedValue(null),
    findByOwner: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.migration(), ...updates })),
  };
}

export function mockMigrationContentRepo(): jest.Mocked<MigrationContentRepository> {
  return {
    saveBatch: jest.fn().mockImplementation((_t, items) => Promise.resolve(items)),
    findByMigration: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.migrationContentItem(), ...updates })),
    updateBatch: jest.fn().mockResolvedValue(undefined),
  };
}

export function mockResourceRepo(): jest.Mocked<ResourceRepository> {
  return {
    save: jest.fn().mockImplementation((_t, r) => Promise.resolve(r)),
    findById: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn().mockResolvedValue(null),
    findByAuthor: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    search: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.resource(), ...updates })),
    delete: jest.fn().mockResolvedValue(undefined),
    incrementPurchaseCount: jest.fn().mockResolvedValue(undefined),
    updateRating: jest.fn().mockResolvedValue(undefined),
  };
}

export function mockPurchaseRepo(): jest.Mocked<PurchaseRepository> {
  return {
    save: jest.fn().mockImplementation((_t, p) => Promise.resolve(p)),
    findById: jest.fn().mockResolvedValue(null),
    findByBuyer: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    findByResource: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    findByStripePaymentIntent: jest.fn().mockResolvedValue(null),
    hasBuyerPurchased: jest.fn().mockResolvedValue(false),
    incrementDownloadCount: jest.fn().mockResolvedValue(undefined),
  };
}

export function mockLicenceRepo(): jest.Mocked<LicenceRepository> {
  return {
    save: jest.fn().mockImplementation((_t, l) => Promise.resolve(l)),
    findById: jest.fn().mockResolvedValue(null),
    findActiveByInstitution: jest.fn().mockResolvedValue([]),
    findByPurchase: jest.fn().mockResolvedValue(null),
    deactivate: jest.fn().mockResolvedValue(undefined),
  };
}

export function mockManuscriptRepo(): jest.Mocked<ManuscriptRepository> {
  return {
    save: jest.fn().mockImplementation((_t, m) => Promise.resolve(m)),
    findById: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn().mockResolvedValue(null),
    findByAuthor: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.manuscript(), ...updates })),
    delete: jest.fn().mockResolvedValue(undefined),
  };
}

export function mockVersionRepo(): jest.Mocked<ManuscriptVersionRepository> {
  return {
    save: jest.fn().mockImplementation((_t, v) => Promise.resolve(v)),
    findById: jest.fn().mockResolvedValue(null),
    findByManuscript: jest.fn().mockResolvedValue([]),
    findLatest: jest.fn().mockResolvedValue(null),
  };
}

export function mockPublicationRepo(): jest.Mocked<PublicationRepository> {
  return {
    save: jest.fn().mockImplementation((_t, p) => Promise.resolve(p)),
    findById: jest.fn().mockResolvedValue(null),
    findByManuscript: jest.fn().mockResolvedValue([]),
    findByChannel: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.publication(), ...updates })),
  };
}

export function mockCoverRepo(): jest.Mocked<CoverRepository> {
  return {
    save: jest.fn().mockImplementation((_t, c) => Promise.resolve(c)),
    findById: jest.fn().mockResolvedValue(null),
    findByManuscript: jest.fn().mockResolvedValue([]),
    findSelected: jest.fn().mockResolvedValue(null),
    setSelected: jest.fn().mockResolvedValue(undefined),
  };
}

export function mockSalesRepo(): jest.Mocked<SalesRepository> {
  return {
    save: jest.fn().mockImplementation((_t, s) => Promise.resolve(s)),
    findByPublication: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    findByAuthor: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    getRevenueByChannel: jest.fn().mockResolvedValue({}),
    getTotalRevenue: jest.fn().mockResolvedValue(0),
  };
}

export function mockBookClubRepo(): jest.Mocked<BookClubRepository> {
  return {
    save: jest.fn().mockImplementation((_t, c) => Promise.resolve(c)),
    findById: jest.fn().mockResolvedValue(null),
    findBySlug: jest.fn().mockResolvedValue(null),
    findByOrganiser: jest.fn().mockResolvedValue([]),
    findPublic: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 0 }),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.bookClub(), ...updates })),
  };
}

export function mockSessionRepo(): jest.Mocked<BookClubSessionRepository> {
  return {
    save: jest.fn().mockImplementation((_t, s) => Promise.resolve(s)),
    findById: jest.fn().mockResolvedValue(null),
    findByClub: jest.fn().mockResolvedValue([]),
    findUpcoming: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.session(), ...updates })),
  };
}

export function mockReadingRepo(): jest.Mocked<BookClubReadingRepository> {
  return {
    save: jest.fn().mockImplementation((_t, r) => Promise.resolve(r)),
    findById: jest.fn().mockResolvedValue(null),
    findByClub: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.reading(), ...updates })),
  };
}

export function mockMemberRepo(): jest.Mocked<BookClubMemberRepository> {
  return {
    save: jest.fn().mockImplementation((_t, m) => Promise.resolve(m)),
    findById: jest.fn().mockResolvedValue(null),
    findByClub: jest.fn().mockResolvedValue([]),
    findByUser: jest.fn().mockResolvedValue([]),
    findByUserAndClub: jest.fn().mockResolvedValue(null),
    isMember: jest.fn().mockResolvedValue(false),
    update: jest.fn().mockImplementation((_t, _id, updates) => Promise.resolve({ ...fixtures.member(), ...updates })),
    deactivate: jest.fn().mockResolvedValue(undefined),
    recordAttendance: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };
}

// ============================================================================
// FIXTURES
// ============================================================================

const T = 'tenant_test';
const now = new Date('2026-02-25T00:00:00Z');

export const fixtures = {
  tenantId: T,
  userId: 'user_test',
  userName: 'Test User',
  userEmail: 'test@erudits.com',

  migration: (overrides?: Partial<PlatformMigration>): PlatformMigration => ({
    id: 'mig_001', tenantId: T, createdAt: now, updatedAt: now,
    source: 'squarespace', sourceUrl: 'https://erudits.com',
    ownerId: 'user_test', ownerEmail: 'test@erudits.com',
    status: 'created', progressPercent: 0,
    pagesFound: 0, productsFound: 0, membersFound: 0, imagesFound: 0, postsFound: 0,
    pagesImported: 0, productsImported: 0, membersImported: 0, imagesImported: 0, postsImported: 0,
    dnsVerified: false, sslProvisioned: false,
    ...overrides,
  }),

  migrationContentItem: (overrides?: Partial<MigrationContentItem>): MigrationContentItem => ({
    id: 'mci_001', tenantId: T, migrationId: 'mig_001',
    sourceType: 'page', status: 'pending', requiresReview: false,
    ...overrides,
  }),

  resource: (overrides?: Partial<DigitalResource>): DigitalResource => ({
    id: 'res_001', tenantId: T, createdAt: now, updatedAt: now,
    authorId: 'user_test', authorName: 'Test User',
    title: 'French Exam Pack 2026', slug: 'french-exam-pack-2026',
    description: 'Comprehensive exam preparation',
    priceIndividualCents: 5000, currency: 'AUD', format: 'pdf', status: 'draft',
    files: [], yearLevels: ['11', '12'], curriculumTags: [], tags: ['french', 'atar'],
    featured: false, totalPurchases: 0, totalRevenueCents: 0,
    averageRating: 0, ratingCount: 0, moderationStatus: 'pending',
    ...overrides,
  }),

  manuscript: (overrides?: Partial<Manuscript>): Manuscript => ({
    id: 'ms_001', tenantId: T, createdAt: now, updatedAt: now,
    authorId: 'user_test', authorName: 'Test User', collaboratorIds: [],
    title: 'French Grammar Essentials', slug: 'french-grammar-essentials',
    language: 'fr', content: { type: 'doc', content: [] },
    wordCount: 0, pageCountEstimate: 0, chapters: [],
    yearLevels: ['11'], curriculumTags: [], hasBleed: false, status: 'draft',
    ...overrides,
  }),

  bookClub: (overrides?: Partial<BookClub>): BookClub => ({
    id: 'bc_001', tenantId: T, createdAt: now, updatedAt: now,
    organiserId: 'user_test', organiserName: 'Test User',
    name: 'French Literature Circle', slug: 'french-literature-circle',
    language: 'fr', isPublic: true, requiresApproval: false, subscriptionRequired: false,
    yearLevels: ['11'], targetYearLevels: ['11'], curriculumTags: [],
    curriculumCodes: ['FR_SL_U3'], timezone: 'Australia/Perth',
    isActive: true, participantCount: 0, memberCount: 0,
    sessionCount: 0, readingCount: 0, completionRate: 0,
    ...overrides,
  }),

  session: (overrides?: Partial<BookClubSession>): BookClubSession => ({
    id: 'sess_001', tenantId: T, createdAt: now, bookClubId: 'bc_001',
    title: 'Discussion: Chapter 1', sessionType: 'discussion',
    scheduledAt: new Date('2026-03-01T10:00:00Z'), durationMinutes: 60,
    sortOrder: 1, status: 'scheduled', isCompleted: false, attendeeCount: 0,
    ...overrides,
  }),

  reading: (overrides?: Partial<BookClubReading>): BookClubReading => ({
    id: 'read_001', tenantId: T, createdAt: now, bookClubId: 'bc_001',
    title: 'Le Petit Prince', author: 'Antoine de Saint-Exupéry',
    sortOrder: 1, learningObjectives: [], isComplete: false, completionRate: 0,
    ...overrides,
  }),

  member: (overrides?: Partial<BookClubMember>): BookClubMember => ({
    id: 'mem_001', tenantId: T, createdAt: now, bookClubId: 'bc_001',
    userId: 'user_test', displayName: 'Test User', userName: 'Test User',
    role: 'member', isActive: true, readingsCompleted: 0,
    sessionsAttended: 0, engagementScore: 0,
    ...overrides,
  }),

  publication: (overrides?: Partial<BookPublication>): BookPublication => ({
    id: 'pub_001', tenantId: T, createdAt: now, updatedAt: now,
    manuscriptId: 'ms_001', versionId: 'ver_001', format: 'ebook_epub',
    channels: [], pricing: {}, totalSales: 0, totalRevenueCents: 0, averageRating: 0,
    ...overrides,
  }),
};

// ============================================================================
// ASSERTION HELPERS
// ============================================================================

export function expectSuccess<T>(result: Result<T>): asserts result is { success: true; data: T } {
  expect(result.success).toBe(true);
}

export function expectFailure<T>(result: Result<T>, expectedCode?: string): void {
  expect(result.success).toBe(false);
  if (!result.success && expectedCode) {
    expect(result.error.code).toBe(expectedCode);
  }
}
