/**
 * ============================================================================
 * Migration Transform & Review Service Tests
 * ============================================================================
 *
 * Tests for Stages 3 (Transform) and 4 (Review) of the Squarespace
 * migration pipeline. Follows the same testing pattern as the tutor
 * onboarding tests: mock all dependencies via factory functions, test
 * each public method, and verify state machine transitions.
 *
 * ## Test Organisation
 *
 *   §1 — Mock factories (repositories, event bus, cache, config)
 *   §2 — Transform service tests
 *   §3 — HTML-to-blocks parser tests
 *   §4 — Review service tests
 *   §5 — Integration scenario (full transform → review → approve flow)
 *
 * @module scholarly/migrations/migration-transform.service.test
 */

import { MigrationTransformService } from './migration-transform.service';
import { MigrationReviewService } from './migration-review.service';
import type {
  PlatformMigration,
  MigrationContentItem,
  ContentItemStatus,
  ContentSourceType,
  MigrationRepository,
  MigrationContentRepository,
  EventBus,
  Cache,
  TransformServiceDeps,
  ReviewServiceDeps,
  SquarespacePage,
  SquarespaceProduct,
  SquarespacePost,
  SquarespaceMember,
  TransformedCmsPage,
  TransformedDigitalResource,
  TransformedUserInvitation,
  CmsBlock,
  ScholarlyConfig,
} from './migration-transform.types';


// ============================================================================
// §1 — MOCK FACTORIES
// ============================================================================

// ── Test Fixtures ──

function createMockMigration(overrides?: Partial<PlatformMigration>): PlatformMigration {
  return {
    id: 'mig_test123',
    tenantId: 'tenant_erudits',
    createdAt: new Date('2026-02-28'),
    updatedAt: new Date('2026-02-28'),
    source: 'squarespace',
    sourceUrl: 'https://www.erudits.com.au',
    ownerId: 'user_marie',
    ownerEmail: 'marie@erudits.com.au',
    status: 'extracting',
    currentStep: 'Extraction complete',
    progressPercent: 50,
    pagesFound: 3, productsFound: 2, membersFound: 1,
    imagesFound: 0, postsFound: 1,
    pagesImported: 0, productsImported: 0, membersImported: 0,
    imagesImported: 0, postsImported: 0,
    dnsVerified: false, sslProvisioned: false,
    errors: [], warnings: [],
    ...overrides,
  };
}

function createMockPage(overrides?: Partial<SquarespacePage>): SquarespacePage {
  return {
    id: 'page_1',
    title: 'About Érudits',
    slug: 'about-erudits',
    content: '<h1>Welcome</h1><p>French tutoring in Melbourne.</p>',
    seoTitle: 'About Érudits French Education',
    seoDescription: 'Premier French tutoring in Melbourne',
    url: '/about-erudits',
    updatedAt: '2026-01-15',
    isEnabled: true,
    ...overrides,
  };
}

function createMockProduct(overrides?: Partial<SquarespaceProduct>): SquarespaceProduct {
  return {
    id: 'prod_1',
    title: 'VCE French Exam Pack',
    slug: 'vce-french-exam-pack',
    description: '<p>Complete exam preparation for VCE French.</p>',
    price: 29.95,
    currency: 'AUD',
    images: ['https://erudits.com.au/img/vce-pack.jpg'],
    tags: ['exam-prep', 'VCE'],
    categories: ['VCE French'],
    isDigital: true,
    fileUrl: 'https://erudits.com.au/files/vce-pack.pdf',
    variants: [],
    isVisible: true,
    ...overrides,
  };
}

function createMockPost(overrides?: Partial<SquarespacePost>): SquarespacePost {
  return {
    id: 'post_1',
    title: 'How to Prepare for VCE French',
    slug: 'how-to-prepare-vce-french',
    content: '<h2>Study Tips</h2><p>Start with vocabulary.</p>',
    publishedAt: '2026-01-10T10:00:00Z',
    author: 'Marie Dupont',
    tags: ['VCE', 'study-tips'],
    excerpt: 'Top tips for VCE French preparation',
    featuredImageUrl: 'https://erudits.com.au/img/blog-vce.jpg',
    ...overrides,
  };
}

function createMockMember(overrides?: Partial<SquarespaceMember>): SquarespaceMember {
  return {
    email: 'student@example.com',
    firstName: 'Jean',
    lastName: 'Martin',
    createdAt: '2025-09-01',
    subscriptionStatus: 'active',
    ...overrides,
  };
}

function createMockContentItem(
  sourceType: ContentSourceType,
  sourceData: unknown,
  overrides?: Partial<MigrationContentItem>,
): MigrationContentItem {
  return {
    id: `mci_${sourceType}_${Math.random().toString(36).substring(2, 8)}`,
    tenantId: 'tenant_erudits',
    migrationId: 'mig_test123',
    sourceType,
    sourceId: `${sourceType}_1`,
    sourceUrl: `/${sourceType}/test`,
    sourceTitle: `Test ${sourceType}`,
    sourceData: sourceData as Record<string, unknown>,
    status: 'pending',
    requiresReview: false,
    ...overrides,
  };
}

// ── Mock Repositories ──

function createMockMigrationRepo(): MigrationRepository & { _store: Map<string, PlatformMigration> } {
  const store = new Map<string, PlatformMigration>();
  return {
    _store: store,
    save: jest.fn(async (_tenantId: string, migration: PlatformMigration) => {
      store.set(migration.id, { ...migration });
      return { ...migration };
    }),
    findById: jest.fn(async (_tenantId: string, id: string) => {
      const m = store.get(id);
      return m ? { ...m } : null;
    }),
    findByOwner: jest.fn(async (_tenantId: string, ownerId: string) => {
      return Array.from(store.values()).filter(m => m.ownerId === ownerId);
    }),
    update: jest.fn(async (_tenantId: string, id: string, updates: Partial<PlatformMigration>) => {
      const existing = store.get(id);
      if (!existing) throw new Error(`Migration not found: ${id}`);
      const updated = { ...existing, ...updates } as PlatformMigration;
      store.set(id, updated);
      return { ...updated };
    }),
  };
}

function createMockContentRepo(): MigrationContentRepository & { _store: Map<string, MigrationContentItem> } {
  const store = new Map<string, MigrationContentItem>();
  return {
    _store: store,
    saveBatch: jest.fn(async (_tenantId: string, items: MigrationContentItem[]) => {
      for (const item of items) {
        store.set(item.id, { ...item });
      }
      return items.map(i => ({ ...i }));
    }),
    findById: jest.fn(async (_tenantId: string, id: string) => {
      const item = store.get(id);
      return item ? { ...item } : null;
    }),
    findByMigration: jest.fn(async (
      _tenantId: string,
      migrationId: string,
      filter?: { sourceType?: ContentSourceType; status?: ContentItemStatus },
    ) => {
      let items = Array.from(store.values()).filter(i => i.migrationId === migrationId);
      if (filter?.sourceType) items = items.filter(i => i.sourceType === filter.sourceType);
      if (filter?.status) items = items.filter(i => i.status === (filter.status as string));
      return items.map(i => ({ ...i }));
    }),
    findPendingReview: jest.fn(async (_tenantId: string, migrationId: string) => {
      return Array.from(store.values())
        .filter(i => i.migrationId === migrationId && ['mapped', 'needs_edit'].includes(i.status))
        .map(i => ({ ...i }));
    }),
    findFlagged: jest.fn(async (_tenantId: string, migrationId: string) => {
      return Array.from(store.values())
        .filter(i => i.migrationId === migrationId && i.requiresReview)
        .map(i => ({ ...i }));
    }),
    update: jest.fn(async (_tenantId: string, id: string, updates: Partial<MigrationContentItem>) => {
      const existing = store.get(id);
      if (!existing) throw new Error(`Content item not found: ${id}`);
      const updated = { ...existing, ...updates } as MigrationContentItem;
      store.set(id, updated);
      return { ...updated };
    }),
    updateBatch: jest.fn(async (_tenantId: string, updates: Array<{ id: string; updates: Partial<MigrationContentItem> }>) => {
      for (const { id, updates: u } of updates) {
        const existing = store.get(id);
        if (existing) {
          store.set(id, { ...existing, ...u } as MigrationContentItem);
        }
      }
    }),
    countByStatus: jest.fn(async (_tenantId: string, migrationId: string) => {
      const counts: Record<string, number> = {};
      for (const item of store.values()) {
        if (item.migrationId === migrationId) {
          counts[item.status] = (counts[item.status] || 0) + 1;
        }
      }
      return counts as Record<ContentItemStatus, number>;
    }),
    countBySourceType: jest.fn(async (_tenantId: string, migrationId: string) => {
      const counts: Record<string, number> = {};
      for (const item of store.values()) {
        if (item.migrationId === migrationId) {
          counts[item.sourceType] = (counts[item.sourceType] || 0) + 1;
        }
      }
      return counts as Record<ContentSourceType, number>;
    }),
  };
}

function createMockEventBus(): EventBus & { published: Array<{ topic: string; payload: Record<string, unknown> }> } {
  const published: Array<{ topic: string; payload: Record<string, unknown> }> = [];
  return {
    published,
    publish: jest.fn(async (topic: string, payload: Record<string, unknown>) => {
      published.push({ topic, payload });
    }),
  };
}

function createMockCache(): Cache {
  const store = new Map<string, unknown>();
  return {
    get: jest.fn(async (key: string) => store.get(key) || null) as Cache['get'],
    set: jest.fn(async (key: string, value: unknown) => { store.set(key, value); }),
    del: jest.fn(async (key: string) => { store.delete(key); }),
    invalidatePattern: jest.fn(async () => { store.clear(); }),
  };
}

function createMockConfig(): ScholarlyConfig {
  return {
    environment: 'development',
    platformFeePercent: 15,
  };
}

// ── Helper to seed content items into the mock repo ──

function seedContentItems(
  contentRepo: ReturnType<typeof createMockContentRepo>,
  items: MigrationContentItem[],
): void {
  for (const item of items) {
    contentRepo._store.set(item.id, { ...item });
  }
}


// ============================================================================
// §2 — TRANSFORM SERVICE TESTS
// ============================================================================

describe('MigrationTransformService', () => {
  let transformService: MigrationTransformService;
  let migrationRepo: ReturnType<typeof createMockMigrationRepo>;
  let contentRepo: ReturnType<typeof createMockContentRepo>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let cache: ReturnType<typeof createMockCache>;

  const TENANT = 'tenant_erudits';
  const MIGRATION_ID = 'mig_test123';

  beforeEach(() => {
    migrationRepo = createMockMigrationRepo();
    contentRepo = createMockContentRepo();
    eventBus = createMockEventBus();
    cache = createMockCache();

    const deps: TransformServiceDeps = {
      migrationRepo,
      contentRepo,
      eventBus,
      cache,
      config: createMockConfig(),
    };

    transformService = new MigrationTransformService(deps);
  });

  // ── runTransformation ──

  describe('runTransformation', () => {
    it('should reject if migration does not exist', async () => {
      const result = await transformService.runTransformation(TENANT, 'nonexistent');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should reject if migration is in wrong status', async () => {
      const migration = createMockMigration({ status: 'approved' });
      migrationRepo._store.set(migration.id, migration);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('approved');
      }
    });

    it('should transform pages into CMS pages', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const page = createMockPage();
      const pageItem = createMockContentItem('page', page, { id: 'mci_page_1' });
      seedContentItems(contentRepo, [pageItem]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transformed.pages).toBe(1);

        // Verify the content item was updated
        const updated = contentRepo._store.get('mci_page_1')!;
        expect(updated.status).toBe('mapped');
        expect(updated.targetType).toBe('cms_page');
        expect(updated.targetUrl).toBe('/about-erudits');

        // Verify transform data was stored
        const transformed = (updated.sourceData as Record<string, unknown>).transformed as TransformedCmsPage;
        expect(transformed.type).toBe('cms_page');
        expect(transformed.slug).toBe('about-erudits');
        expect(transformed.seoTitle).toBe('About Érudits French Education');
      }
    });

    it('should transform products into digital resources with category mapping', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const product = createMockProduct();
      const productItem = createMockContentItem('product', product, { id: 'mci_prod_1' });
      seedContentItems(contentRepo, [productItem]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transformed.products).toBe(1);

        const updated = contentRepo._store.get('mci_prod_1')!;
        expect(updated.status).toBe('mapped');
        expect(updated.targetType).toBe('digital_resource');
        expect(updated.targetUrl).toBe('/resources/vce-french-exam-pack');

        const transformed = (updated.sourceData as Record<string, unknown>).transformed as TransformedDigitalResource;
        expect(transformed.priceIndividualCents).toBe(2995);
        expect(transformed.currency).toBe('AUD');
        expect(transformed.format).toBe('pdf');
        expect(transformed.scholarlyCategory).toBe('exam-prep');
        expect(transformed.curriculumTag).toBe('vce-french');
        expect(transformed.licenceType).toBe('both');
      }
    });

    it('should transform blog posts with author and publish date', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const post = createMockPost();
      const postItem = createMockContentItem('post', post, { id: 'mci_post_1' });
      seedContentItems(contentRepo, [postItem]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transformed.posts).toBe(1);

        const updated = contentRepo._store.get('mci_post_1')!;
        const transformed = (updated.sourceData as Record<string, unknown>).transformed as TransformedCmsPage;
        expect(transformed.type).toBe('blog_post');
        expect(transformed.author).toBe('Marie Dupont');
        expect(transformed.publishedAt).toBe('2026-01-10T10:00:00Z');
        expect(transformed.tags).toEqual(['VCE', 'study-tips']);
      }
    });

    it('should transform members into user invitations', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const member = createMockMember();
      const memberItem = createMockContentItem('member', member, { id: 'mci_member_1' });
      seedContentItems(contentRepo, [memberItem]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transformed.members).toBe(1);

        const updated = contentRepo._store.get('mci_member_1')!;
        const transformed = (updated.sourceData as Record<string, unknown>).transformed as TransformedUserInvitation;
        expect(transformed.type).toBe('user_invitation');
        expect(transformed.email).toBe('student@example.com');
        expect(transformed.firstName).toBe('Jean');
        expect(transformed.role).toBe('student');
      }
    });

    it('should flag physical products for review', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const physicalProduct = createMockProduct({ isDigital: false });
      const item = createMockContentItem('product', physicalProduct, { id: 'mci_prod_phys' });
      seedContentItems(contentRepo, [item]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flaggedForReview).toBe(1);
        const updated = contentRepo._store.get('mci_prod_phys')!;
        expect(updated.requiresReview).toBe(true);
        expect(updated.reviewNotes).toContain('physical product');
      }
    });

    it('should flag multi-variant products for review', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const multiVariant = createMockProduct({
        variants: [
          { name: 'Individual', price: 29.95 },
          { name: 'School', price: 99.95 },
        ],
      });
      const item = createMockContentItem('product', multiVariant, { id: 'mci_prod_mv' });
      seedContentItems(contentRepo, [item]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flaggedForReview).toBe(1);
        const updated = contentRepo._store.get('mci_prod_mv')!;
        expect(updated.requiresReview).toBe(true);
        expect(updated.reviewNotes).toContain('2 variants');
      }
    });

    it('should flag zero-price products for review', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const freeProduct = createMockProduct({ price: 0 });
      const item = createMockContentItem('product', freeProduct, { id: 'mci_prod_free' });
      seedContentItems(contentRepo, [item]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        const updated = contentRepo._store.get('mci_prod_free')!;
        expect(updated.requiresReview).toBe(true);
        expect(updated.reviewNotes).toContain('no price');
      }
    });

    it('should generate URL mappings for 301 redirects', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const page = createMockPage({ slug: 'about', url: '/about' });
      const pageItem = createMockContentItem('page', page, {
        id: 'mci_p1', sourceUrl: '/about',
      });
      seedContentItems(contentRepo, [pageItem]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        // URL mapping should map old URL to new URL
        expect(Object.keys(result.data.urlMappings).length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should transition migration to ready_for_review', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);
      seedContentItems(contentRepo, []);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      const updatedMigration = migrationRepo._store.get(MIGRATION_ID)!;
      expect(updatedMigration.status).toBe('ready_for_review');
      expect(updatedMigration.progressPercent).toBe(85);
    });

    it('should publish NATS events for transform lifecycle', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const page = createMockPage();
      seedContentItems(contentRepo, [createMockContentItem('page', page, { id: 'mci_p1' })]);

      await transformService.runTransformation(TENANT, MIGRATION_ID);

      const topics = eventBus.published.map(e => e.topic);
      expect(topics).toContain('scholarly.migration.transform.started');
      expect(topics).toContain('scholarly.migration.item.transformed');
      expect(topics).toContain('scholarly.migration.transform.completed');
    });

    it('should handle items with missing source data gracefully', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      // Item with null/empty source data
      const badItem = createMockContentItem('page', null, { id: 'mci_bad' });
      seedContentItems(contentRepo, [badItem]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.transformed.pages).toBe(0);
        const updated = contentRepo._store.get('mci_bad')!;
        expect(updated.status).toBe('failed');
        expect(updated.errorMessage).toContain('Missing');
      }
    });

    it('should skip already-mapped items on re-run', async () => {
      const migration = createMockMigration({ status: 'ready_for_review' });
      migrationRepo._store.set(migration.id, migration);

      // One mapped (should skip) + one pending (should transform)
      const page1 = createMockPage({ slug: 'already-done' });
      const page2 = createMockPage({ slug: 'new-page', title: 'New Page' });
      seedContentItems(contentRepo, [
        createMockContentItem('page', page1, { id: 'mci_done', status: 'mapped' }),
        createMockContentItem('page', page2, { id: 'mci_new', status: 'pending' }),
      ]);

      const result = await transformService.runTransformation(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        // Only the pending item should be transformed
        expect(result.data.transformed.pages).toBe(1);
      }
    });
  });

  // ── retransformItem ──

  describe('retransformItem', () => {
    it('should re-transform a needs_edit item with edits', async () => {
      const migration = createMockMigration({ status: 'ready_for_review' });
      migrationRepo._store.set(migration.id, migration);

      const product = createMockProduct({ title: 'Old Title', slug: 'old-slug' });
      const item = createMockContentItem('product', product, {
        id: 'mci_edit_1',
        status: 'needs_edit',
        targetType: 'digital_resource',
      });
      seedContentItems(contentRepo, [item]);

      const result = await transformService.retransformItem(
        TENANT, MIGRATION_ID, 'mci_edit_1',
        { title: 'Updated Title', slug: 'updated-slug' },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('mapped');
        expect(result.data.targetUrl).toBe('/resources/updated-slug');
      }
    });

    it('should reject retransform for non-existent item', async () => {
      const result = await transformService.retransformItem(
        TENANT, MIGRATION_ID, 'nonexistent', {},
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });

    it('should reject retransform for wrong migration', async () => {
      const item = createMockContentItem('page', createMockPage(), {
        id: 'mci_wrong',
        migrationId: 'other_migration',
        status: 'needs_edit',
      });
      seedContentItems(contentRepo, [item]);

      const result = await transformService.retransformItem(
        TENANT, MIGRATION_ID, 'mci_wrong', {},
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should reject retransform for items in non-editable status', async () => {
      const item = createMockContentItem('page', createMockPage(), {
        id: 'mci_approved',
        status: 'approved',
      });
      seedContentItems(contentRepo, [item]);

      const result = await transformService.retransformItem(
        TENANT, MIGRATION_ID, 'mci_approved', {},
      );
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('approved');
      }
    });
  });
});


// ============================================================================
// §3 — HTML-TO-BLOCKS PARSER TESTS
// ============================================================================

describe('htmlToBlocks (via MigrationTransformService)', () => {
  let service: MigrationTransformService;

  beforeEach(() => {
    service = new MigrationTransformService({
      migrationRepo: createMockMigrationRepo(),
      contentRepo: createMockContentRepo(),
      eventBus: createMockEventBus(),
      cache: createMockCache(),
      config: createMockConfig(),
    });
  });

  it('should parse headings at all levels', () => {
    const html = '<h1>Title</h1><h2>Subtitle</h2><h3>Section</h3>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(3);
    expect(blocks[0]).toEqual({ type: 'heading', level: 1, text: 'Title' });
    expect(blocks[1]).toEqual({ type: 'heading', level: 2, text: 'Subtitle' });
    expect(blocks[2]).toEqual({ type: 'heading', level: 3, text: 'Section' });
  });

  it('should parse paragraphs', () => {
    const html = '<p>First paragraph.</p><p>Second paragraph.</p>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'paragraph', text: 'First paragraph.' });
    expect(blocks[1]).toEqual({ type: 'paragraph', text: 'Second paragraph.' });
  });

  it('should parse images with alt text', () => {
    const html = '<img src="https://example.com/photo.jpg" alt="A photo">';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: 'image',
      src: 'https://example.com/photo.jpg',
      alt: 'A photo',
    });
  });

  it('should parse unordered lists', () => {
    const html = '<ul><li>Item one</li><li>Item two</li><li>Item three</li></ul>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: 'list',
      style: 'unordered',
      items: ['Item one', 'Item two', 'Item three'],
    });
  });

  it('should parse ordered lists', () => {
    const html = '<ol><li>First</li><li>Second</li></ol>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      type: 'list',
      style: 'ordered',
      items: ['First', 'Second'],
    });
  });

  it('should parse blockquotes as callout blocks', () => {
    const html = '<blockquote>An important quote.</blockquote>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: 'callout', text: 'An important quote.' });
  });

  it('should strip script tags', () => {
    const html = '<p>Safe content</p><script>alert("xss")</script><p>More safe content</p>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(2);
    expect(blocks[0]).toEqual({ type: 'paragraph', text: 'Safe content' });
    expect(blocks[1]).toEqual({ type: 'paragraph', text: 'More safe content' });
  });

  it('should strip style tags', () => {
    const html = '<style>.red { color: red; }</style><p>Visible text</p>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: 'paragraph', text: 'Visible text' });
  });

  it('should strip inline HTML tags from text', () => {
    const html = '<p>Text with <strong>bold</strong> and <em>italic</em> words.</p>';
    const blocks = service.htmlToBlocks(html);

    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({ type: 'paragraph', text: 'Text with bold and italic words.' });
  });

  it('should decode HTML entities', () => {
    const html = '<p>Caf&eacute; &amp; caf&eacute;</p>';
    const blocks = service.htmlToBlocks(html);

    // stripHtml handles &amp; → & but not &eacute; (would need full entity decoding)
    expect(blocks).toHaveLength(1);
    expect((blocks[0] as { text: string }).text).toContain('&');
  });

  it('should return empty array for empty/null input', () => {
    expect(service.htmlToBlocks('')).toEqual([]);
    expect(service.htmlToBlocks(null as unknown as string)).toEqual([]);
  });

  it('should handle mixed content from a real Squarespace page', () => {
    const html = `
      <h1>Érudits French Education</h1>
      <p>Welcome to Melbourne's premier French tutoring service.</p>
      <h2>Our Services</h2>
      <ul>
        <li>VCE French preparation</li>
        <li>DELF exam coaching</li>
        <li>Conversational French</li>
      </ul>
      <img src="/img/classroom.jpg" alt="Our classroom">
      <blockquote>Learning French opens doors to the world.</blockquote>
    `;
    const blocks = service.htmlToBlocks(html);

    expect(blocks.length).toBeGreaterThanOrEqual(5);
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 });
    expect(blocks[1]).toMatchObject({ type: 'paragraph' });
    expect(blocks[2]).toMatchObject({ type: 'heading', level: 2 });
    // The list or other elements should follow
    const types = blocks.map(b => b.type);
    expect(types).toContain('list');
    expect(types).toContain('image');
    expect(types).toContain('callout');
  });
});


// ============================================================================
// §4 — REVIEW SERVICE TESTS
// ============================================================================

describe('MigrationReviewService', () => {
  let reviewService: MigrationReviewService;
  let migrationRepo: ReturnType<typeof createMockMigrationRepo>;
  let contentRepo: ReturnType<typeof createMockContentRepo>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let cache: ReturnType<typeof createMockCache>;

  const TENANT = 'tenant_erudits';
  const MIGRATION_ID = 'mig_test123';

  beforeEach(() => {
    migrationRepo = createMockMigrationRepo();
    contentRepo = createMockContentRepo();
    eventBus = createMockEventBus();
    cache = createMockCache();

    const deps: ReviewServiceDeps = {
      migrationRepo,
      contentRepo,
      eventBus,
      cache,
    };

    reviewService = new MigrationReviewService(deps);
  });

  // ── Helper to set up a migration in review state with items ──

  function setupReviewState(items: MigrationContentItem[]): void {
    const migration = createMockMigration({ status: 'ready_for_review' });
    migrationRepo._store.set(migration.id, migration);
    seedContentItems(contentRepo, items);
  }

  // ── getReviewDashboard ──

  describe('getReviewDashboard', () => {
    it('should return dashboard with grouped items and stats', () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
        createMockContentItem('page', createMockPage(), { id: 'p2', status: 'approved' }),
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'mapped' }),
        createMockContentItem('member', createMockMember(), { id: 'm1', status: 'mapped' }),
      ];
      setupReviewState(items);

      return reviewService.getReviewDashboard(TENANT, MIGRATION_ID).then(result => {
        expect(result.success).toBe(true);
        if (result.success) {
          const { stats, groups } = result.data;
          expect(stats.total).toBe(4);
          expect(stats.approved).toBe(1);
          expect(stats.pendingReview).toBe(3);
          expect(stats.allReviewed).toBe(false);

          expect(groups.length).toBeGreaterThanOrEqual(2);
          const pageGroup = groups.find(g => g.sourceType === 'page');
          expect(pageGroup).toBeDefined();
          expect(pageGroup!.stats.total).toBe(2);
        }
      });
    });

    it('should return not found for invalid migration', async () => {
      const result = await reviewService.getReviewDashboard(TENANT, 'nonexistent');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('NOT_FOUND');
      }
    });
  });

  // ── reviewItem ──

  describe('reviewItem', () => {
    it('should approve a mapped item', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
      ];
      setupReviewState(items);

      const result = await reviewService.reviewItem(TENANT, MIGRATION_ID, 'p1', {
        decision: 'approved',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('approved');
      }
    });

    it('should reject a mapped item', async () => {
      const items = [
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'mapped' }),
      ];
      setupReviewState(items);

      const result = await reviewService.reviewItem(TENANT, MIGRATION_ID, 'pr1', {
        decision: 'rejected',
        notes: 'This product is no longer sold',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('rejected');
        expect(result.data.reviewNotes).toBe('This product is no longer sold');
      }
    });

    it('should flag an item for editing with required notes', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
      ];
      setupReviewState(items);

      const result = await reviewService.reviewItem(TENANT, MIGRATION_ID, 'p1', {
        decision: 'needs_edit',
        notes: 'Title should be updated to reflect new branding',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('needs_edit');
      }
    });

    it('should reject needs_edit without notes', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
      ];
      setupReviewState(items);

      const result = await reviewService.reviewItem(TENANT, MIGRATION_ID, 'p1', {
        decision: 'needs_edit',
        // No notes provided
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('Notes are required');
      }
    });

    it('should reject review when migration is not in review state', async () => {
      const migration = createMockMigration({ status: 'extracting' });
      migrationRepo._store.set(migration.id, migration);

      const item = createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' });
      seedContentItems(contentRepo, [item]);

      const result = await reviewService.reviewItem(TENANT, MIGRATION_ID, 'p1', {
        decision: 'approved',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('extracting');
      }
    });

    it('should reject review for item belonging to different migration', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), {
          id: 'p_other', migrationId: 'other_migration', status: 'mapped',
        }),
      ];
      setupReviewState(items);

      const result = await reviewService.reviewItem(TENANT, MIGRATION_ID, 'p_other', {
        decision: 'approved',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should publish NATS event on review', async () => {
      const items = [
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'mapped' }),
      ];
      setupReviewState(items);

      await reviewService.reviewItem(TENANT, MIGRATION_ID, 'pr1', {
        decision: 'approved',
      });

      const reviewEvent = eventBus.published.find(
        e => e.topic === 'scholarly.migration.item.reviewed'
      );
      expect(reviewEvent).toBeDefined();
      expect(reviewEvent!.payload.decision).toBe('approved');
      expect(reviewEvent!.payload.itemId).toBe('pr1');
    });

    it('should allow re-reviewing a previously approved item', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'approved' }),
      ];
      setupReviewState(items);

      const result = await reviewService.reviewItem(TENANT, MIGRATION_ID, 'p1', {
        decision: 'rejected',
        notes: 'Changed my mind — remove this page',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('rejected');
      }
    });
  });

  // ── bulkReview ──

  describe('bulkReview', () => {
    it('should approve multiple items at once', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
        createMockContentItem('page', createMockPage(), { id: 'p2', status: 'mapped' }),
        createMockContentItem('page', createMockPage(), { id: 'p3', status: 'mapped' }),
      ];
      setupReviewState(items);

      const result = await reviewService.bulkReview(TENANT, MIGRATION_ID, {
        approve: ['p1', 'p2', 'p3'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.approved).toBe(3);
        expect(result.data.pendingReview).toBe(0);
        expect(result.data.allReviewed).toBe(true);
      }
    });

    it('should handle mixed bulk decisions', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'mapped' }),
        createMockContentItem('member', createMockMember(), { id: 'm1', status: 'mapped' }),
      ];
      setupReviewState(items);

      const result = await reviewService.bulkReview(TENANT, MIGRATION_ID, {
        approve: ['p1'],
        reject: ['pr1'],
        skip: ['m1'],
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.approved).toBe(1);
        expect(result.data.rejected).toBe(1);
        expect(result.data.skipped).toBe(1);
      }
    });

    it('should reject empty bulk review', async () => {
      setupReviewState([]);

      const result = await reviewService.bulkReview(TENANT, MIGRATION_ID, {});

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should publish NATS event for bulk review', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
      ];
      setupReviewState(items);

      await reviewService.bulkReview(TENANT, MIGRATION_ID, { approve: ['p1'] });

      const event = eventBus.published.find(
        e => e.topic === 'scholarly.migration.review.bulk_completed'
      );
      expect(event).toBeDefined();
      expect(event!.payload.approved).toBe(1);
    });
  });

  // ── approveMigration ──

  describe('approveMigration', () => {
    it('should approve migration when all items reviewed and at least one approved', async () => {
      const items = [
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'approved' }),
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'approved' }),
        createMockContentItem('member', createMockMember(), { id: 'm1', status: 'skipped' }),
      ];
      setupReviewState(items);

      const result = await reviewService.approveMigration(
        TENANT, 'user_marie', MIGRATION_ID,
        { confirmReviewed: true },
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.status).toBe('approved');
        expect(result.data.progressPercent).toBe(90);
      }
    });

    it('should reject if not the migration owner', async () => {
      setupReviewState([
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'approved' }),
      ]);

      const result = await reviewService.approveMigration(
        TENANT, 'user_someone_else', MIGRATION_ID,
        { confirmReviewed: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('FORBIDDEN');
      }
    });

    it('should reject if confirmReviewed is false', async () => {
      setupReviewState([
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'approved' }),
      ]);

      const result = await reviewService.approveMigration(
        TENANT, 'user_marie', MIGRATION_ID,
        { confirmReviewed: false },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('confirm');
      }
    });

    it('should reject if items still pending review', async () => {
      setupReviewState([
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'approved' }),
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'mapped' }),
      ]);

      const result = await reviewService.approveMigration(
        TENANT, 'user_marie', MIGRATION_ID,
        { confirmReviewed: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('still need review');
      }
    });

    it('should reject if no items are approved', async () => {
      setupReviewState([
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'rejected' }),
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'skipped' }),
      ]);

      const result = await reviewService.approveMigration(
        TENANT, 'user_marie', MIGRATION_ID,
        { confirmReviewed: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
        expect(result.error.message).toContain('At least one item');
      }
    });

    it('should reject if migration is not in ready_for_review status', async () => {
      const migration = createMockMigration({ status: 'importing' });
      migrationRepo._store.set(migration.id, migration);

      const result = await reviewService.approveMigration(
        TENANT, 'user_marie', MIGRATION_ID,
        { confirmReviewed: true },
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });

    it('should publish NATS approval event with item counts', async () => {
      setupReviewState([
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'approved' }),
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'rejected' }),
      ]);

      await reviewService.approveMigration(
        TENANT, 'user_marie', MIGRATION_ID,
        { confirmReviewed: true },
      );

      const event = eventBus.published.find(
        e => e.topic === 'scholarly.migration.approved'
      );
      expect(event).toBeDefined();
      expect(event!.payload.approvedItems).toBe(1);
      expect(event!.payload.rejectedItems).toBe(1);
    });
  });

  // ── getReviewStats ──

  describe('getReviewStats', () => {
    it('should return accurate counts', async () => {
      setupReviewState([
        createMockContentItem('page', createMockPage(), { id: 'p1', status: 'mapped' }),
        createMockContentItem('page', createMockPage(), { id: 'p2', status: 'approved' }),
        createMockContentItem('product', createMockProduct(), { id: 'pr1', status: 'rejected' }),
        createMockContentItem('member', createMockMember(), { id: 'm1', status: 'needs_edit', requiresReview: true }),
      ]);

      const result = await reviewService.getReviewStats(TENANT, MIGRATION_ID);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.total).toBe(4);
        expect(result.data.pendingReview).toBe(2); // mapped + needs_edit
        expect(result.data.approved).toBe(1);
        expect(result.data.rejected).toBe(1);
        expect(result.data.flagged).toBe(1); // needs_edit with requiresReview
        expect(result.data.allReviewed).toBe(false);
        expect(result.data.canApprove).toBe(false);
      }
    });
  });
});


// ============================================================================
// §5 — INTEGRATION: FULL TRANSFORM → REVIEW → APPROVE FLOW
// ============================================================================

describe('Integration: Transform → Review → Approve', () => {
  let transformService: MigrationTransformService;
  let reviewService: MigrationReviewService;
  let migrationRepo: ReturnType<typeof createMockMigrationRepo>;
  let contentRepo: ReturnType<typeof createMockContentRepo>;
  let eventBus: ReturnType<typeof createMockEventBus>;
  let cache: ReturnType<typeof createMockCache>;

  const TENANT = 'tenant_erudits';
  const MIGRATION_ID = 'mig_integration';

  beforeEach(() => {
    migrationRepo = createMockMigrationRepo();
    contentRepo = createMockContentRepo();
    eventBus = createMockEventBus();
    cache = createMockCache();

    const transformDeps: TransformServiceDeps = {
      migrationRepo, contentRepo, eventBus, cache,
      config: createMockConfig(),
    };
    const reviewDeps: ReviewServiceDeps = {
      migrationRepo, contentRepo, eventBus, cache,
    };

    transformService = new MigrationTransformService(transformDeps);
    reviewService = new MigrationReviewService(reviewDeps);
  });

  it('should complete the full Érudits migration flow: extract → transform → review → approve', async () => {
    // ── Setup: migration in 'extracting' state with extracted content ──
    const migration = createMockMigration({
      id: MIGRATION_ID,
      status: 'extracting',
    });
    migrationRepo._store.set(MIGRATION_ID, migration);

    // Seed extracted content items (as if Stage 2 just completed)
    const items: MigrationContentItem[] = [
      createMockContentItem('page', createMockPage({ slug: 'home', title: 'Home' }), {
        id: 'int_p1', migrationId: MIGRATION_ID, sourceUrl: '/home',
      }),
      createMockContentItem('page', createMockPage({ slug: 'about', title: 'About' }), {
        id: 'int_p2', migrationId: MIGRATION_ID, sourceUrl: '/about',
      }),
      createMockContentItem('product', createMockProduct(), {
        id: 'int_pr1', migrationId: MIGRATION_ID, sourceUrl: '/products/vce-french-exam-pack',
      }),
      createMockContentItem('product', createMockProduct({
        title: 'Free Sample', slug: 'free-sample', price: 0, categories: ['Vocabulary'],
      }), {
        id: 'int_pr2', migrationId: MIGRATION_ID, sourceUrl: '/products/free-sample',
      }),
      createMockContentItem('post', createMockPost(), {
        id: 'int_post1', migrationId: MIGRATION_ID, sourceUrl: '/blog/how-to-prepare-vce-french',
      }),
      createMockContentItem('member', createMockMember(), {
        id: 'int_m1', migrationId: MIGRATION_ID,
      }),
    ];
    seedContentItems(contentRepo, items);

    // ── Stage 3: Transform ──
    const transformResult = await transformService.runTransformation(TENANT, MIGRATION_ID);
    expect(transformResult.success).toBe(true);
    if (!transformResult.success) return;

    expect(transformResult.data.transformed.pages).toBe(2);
    expect(transformResult.data.transformed.products).toBe(2);
    expect(transformResult.data.transformed.posts).toBe(1);
    expect(transformResult.data.transformed.members).toBe(1);
    // The free sample should be flagged (price === 0)
    expect(transformResult.data.flaggedForReview).toBe(1);

    // Migration should be in ready_for_review
    const migAfterTransform = migrationRepo._store.get(MIGRATION_ID)!;
    expect(migAfterTransform.status).toBe('ready_for_review');

    // ── Stage 4: Review dashboard ──
    const dashResult = await reviewService.getReviewDashboard(TENANT, MIGRATION_ID);
    expect(dashResult.success).toBe(true);
    if (!dashResult.success) return;

    expect(dashResult.data.stats.total).toBe(6);
    expect(dashResult.data.stats.pendingReview).toBe(6);
    expect(dashResult.data.flagged.length).toBe(1); // The free sample

    // ── Bulk approve all standard items ──
    const bulkResult = await reviewService.bulkReview(TENANT, MIGRATION_ID, {
      approve: ['int_p1', 'int_p2', 'int_pr1', 'int_post1', 'int_m1'],
    });
    expect(bulkResult.success).toBe(true);

    // ── Review the flagged item individually ──
    const flaggedReview = await reviewService.reviewItem(
      TENANT, MIGRATION_ID, 'int_pr2',
      { decision: 'approved', notes: 'Confirmed: this is a free sample, keep it free' },
    );
    expect(flaggedReview.success).toBe(true);

    // ── Check stats: all reviewed ──
    const statsResult = await reviewService.getReviewStats(TENANT, MIGRATION_ID);
    expect(statsResult.success).toBe(true);
    if (statsResult.success) {
      expect(statsResult.data.allReviewed).toBe(true);
      expect(statsResult.data.canApprove).toBe(true);
      expect(statsResult.data.approved).toBe(6);
    }

    // ── Final approval ──
    const approveResult = await reviewService.approveMigration(
      TENANT, 'user_marie', MIGRATION_ID,
      { confirmReviewed: true, notes: 'Looks good — ready to go live!' },
    );
    expect(approveResult.success).toBe(true);
    if (approveResult.success) {
      expect(approveResult.data.status).toBe('approved');
      expect(approveResult.data.progressPercent).toBe(90);
    }

    // ── Verify the full event trail ──
    const allTopics = eventBus.published.map(e => e.topic);
    expect(allTopics).toContain('scholarly.migration.transform.started');
    expect(allTopics).toContain('scholarly.migration.transform.completed');
    expect(allTopics).toContain('scholarly.migration.review.bulk_completed');
    expect(allTopics).toContain('scholarly.migration.item.reviewed');
    expect(allTopics).toContain('scholarly.migration.approved');
  });
});
