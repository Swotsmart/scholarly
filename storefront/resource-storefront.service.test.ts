/**
 * ============================================================================
 * Resource Storefront Service — Test Suite
 * ============================================================================
 *
 * Comprehensive tests covering the storefront pipeline from resource creation
 * through purchase, download, review, and analytics. Uses in-memory mock
 * repositories following the same pattern as migration-transform.service.test.ts.
 *
 * Test groups:
 *   §1 Resource Lifecycle (create, update, publish, archive)
 *   §2 File Management (upload)
 *   §3 Purchase & Payment (initiate, confirm, refund, free resources)
 *   §4 Download & Access Control (signed URLs, watermarking, licences)
 *   §5 Search & Recommendations (marketplace search, AI recommendations)
 *   §6 Reviews (submit, rating calculation)
 *   §7 Author Analytics (revenue, breakdown)
 *   §8 Integration (full Érudits purchase flow)
 *
 * @module scholarly/storefront/resource-storefront.service.test
 */

import { ResourceStorefrontService } from './resource-storefront.service';
import {
  Result, success, failure, Errors,
  DigitalResource, ResourceFile, ResourcePurchase, ResourceLicence,
  ResourceReview, ResourceFormat, LicenceScope,
  CreateResourceRequest, PurchaseResourceRequest, ResourceSearchRequest,
  PaginatedResult, ListFilter,
  StorefrontDeps, STOREFRONT_EVENTS,
  EventBus, Cache, FileStorage, AIService, ScholarlyConfig,
  StripeClient, WatermarkService,
  ResourceRepository, PurchaseRepository, LicenceRepository,
} from './resource-storefront.types';

// ============================================================================
// MOCK FACTORIES
// ============================================================================

const TENANT_ID = 'tenant_erudits';
const AUTHOR_ID = 'user_marie';
const AUTHOR_NAME = 'Marie Dupont';
const BUYER_ID = 'user_student1';
const BUYER_EMAIL = 'student@example.com';
const BUYER_NAME = 'Alice Student';

function createMockConfig(overrides: Partial<ScholarlyConfig> = {}): ScholarlyConfig {
  return {
    environment: 'development',
    platformFeePercent: 15,
    aiEnabled: false,
    aiModel: 'claude-sonnet-4-5-20250929',
    aiMaxTokens: 4096,
    defaultPageSize: 20,
    maxPageSize: 100,
    stripeFeeFixedCents: 30,
    stripeFeePercent: 2.9,
    ...overrides,
  };
}

function createMockEventBus(): EventBus & { events: Array<{ topic: string; payload: Record<string, unknown> }> } {
  const events: Array<{ topic: string; payload: Record<string, unknown> }> = [];
  return {
    events,
    async publish(topic: string, payload: Record<string, unknown>) {
      events.push({ topic, payload });
    },
  };
}

function createMockCache(): Cache {
  const store = new Map<string, unknown>();
  return {
    async get<T>(key: string) { return (store.get(key) as T) ?? null; },
    async set(key: string, value: unknown) { store.set(key, value); },
    async del(key: string) { store.delete(key); },
    async invalidatePattern() { store.clear(); },
  };
}

function createMockFileStorage(): FileStorage {
  return {
    async upload(key: string, _data: Buffer, _mimeType: string) {
      return `https://storage.scholarly.test/${key}`;
    },
    async getSignedUrl(key: string, _expires: number) {
      return `https://storage.scholarly.test/signed/${key}?token=mock`;
    },
    async delete(_key: string) {},
  };
}

function createMockAI(response = '{"safe": true}'): AIService {
  return {
    async complete() { return { text: response }; },
  };
}

function createMockStripe(overrides: Partial<StripeClient> = {}): StripeClient {
  return {
    async createPaymentIntent(params) {
      return success({
        paymentIntentId: `pi_${Date.now()}`,
        clientSecret: `pi_secret_${Date.now()}`,
      });
    },
    async confirmPaymentIntent(_id) {
      return success({ status: 'succeeded', chargeId: `ch_${Date.now()}` });
    },
    async createRefund(params) {
      return success({ refundId: `re_${Date.now()}`, amountCents: params.amountCents || 0 });
    },
    async getConnectedAccountId(_authorId) {
      return 'acct_erudits_stripe';
    },
    ...overrides,
  };
}

function createMockWatermark(): WatermarkService {
  return {
    async applyWatermark(buffer, _mime, _text) { return buffer; },
  };
}

function createMockResourceRepo(): ResourceRepository & { _store: Map<string, DigitalResource> } {
  const store = new Map<string, DigitalResource>();
  return {
    _store: store,
    async save(_tenantId, resource) {
      store.set(resource.id, { ...resource });
      return { ...resource };
    },
    async findById(_tenantId, id) {
      const r = store.get(id);
      return r ? { ...r } : null;
    },
    async findBySlug(_tenantId, slug) {
      for (const r of store.values()) {
        if (r.slug === slug) return { ...r };
      }
      return null;
    },
    async findByAuthor(_tenantId, authorId, filter) {
      const items = Array.from(store.values()).filter(r => r.authorId === authorId);
      return paginate(items, filter);
    },
    async search(_tenantId, filter) {
      let items = Array.from(store.values());
      if (filter.status) items = items.filter(r => r.status === filter.status);
      if (filter.search) {
        const q = filter.search.toLowerCase();
        items = items.filter(r => r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q));
      }
      if (filter.subjectArea) items = items.filter(r => r.subjectArea === filter.subjectArea);
      if (filter.authorId) items = items.filter(r => r.authorId === filter.authorId);
      if (filter.sortBy === 'totalPurchases') {
        items.sort((a, b) => filter.sortOrder === 'asc' ? a.totalPurchases - b.totalPurchases : b.totalPurchases - a.totalPurchases);
      }
      return paginate(items, filter);
    },
    async update(_tenantId, id, updates) {
      const existing = store.get(id);
      if (!existing) throw new Error(`Resource not found: ${id}`);
      const updated = { ...existing, ...updates };
      store.set(id, updated);
      return { ...updated };
    },
    async delete(_tenantId, id) { store.delete(id); },
    async incrementPurchaseCount(_tenantId, id, amountCents) {
      const r = store.get(id);
      if (r) {
        r.totalPurchases += 1;
        r.totalRevenueCents += amountCents;
        store.set(id, r);
      }
    },
    async updateRating(_tenantId, id, averageRating, ratingCount) {
      const r = store.get(id);
      if (r) {
        r.averageRating = averageRating;
        r.ratingCount = ratingCount;
        store.set(id, r);
      }
    },
  };
}

function createMockPurchaseRepo(): PurchaseRepository & { _store: Map<string, ResourcePurchase> } {
  const store = new Map<string, ResourcePurchase>();
  return {
    _store: store,
    async save(_tenantId, purchase) {
      store.set(purchase.id, { ...purchase });
      return { ...purchase };
    },
    async findById(_tenantId, id) {
      const p = store.get(id);
      return p ? { ...p } : null;
    },
    async findByBuyer(_tenantId, buyerId, filter) {
      const items = Array.from(store.values()).filter(p => p.buyerId === buyerId);
      return paginate(items, filter);
    },
    async findByResource(_tenantId, resourceId, filter) {
      const items = Array.from(store.values()).filter(p => p.resourceId === resourceId);
      return paginate(items, filter);
    },
    async findByStripePaymentIntent(piId) {
      for (const p of store.values()) {
        if (p.stripePaymentIntentId === piId) return { ...p };
      }
      return null;
    },
    async hasBuyerPurchased(_tenantId, buyerId, resourceId) {
      for (const p of store.values()) {
        if (p.buyerId === buyerId && p.resourceId === resourceId && p.status === 'completed') return true;
      }
      return false;
    },
    async incrementDownloadCount(_tenantId, id) {
      const p = store.get(id);
      if (p) {
        p.downloadCount += 1;
        p.lastDownloadedAt = new Date();
        store.set(id, p);
      }
    },
  };
}

function createMockLicenceRepo(): LicenceRepository & { _store: Map<string, ResourceLicence> } {
  const store = new Map<string, ResourceLicence>();
  return {
    _store: store,
    async save(_tenantId, licence) {
      store.set(licence.id, { ...licence });
      return { ...licence };
    },
    async findById(_tenantId, id) {
      const l = store.get(id);
      return l ? { ...l } : null;
    },
    async findActiveByInstitution(_tenantId, institutionId) {
      return Array.from(store.values()).filter(l => l.institutionId === institutionId && l.isActive);
    },
    async findByPurchase(_tenantId, purchaseId) {
      for (const l of store.values()) {
        if (l.purchaseId === purchaseId) return { ...l };
      }
      return null;
    },
    async deactivate(_tenantId, id, _reason) {
      const l = store.get(id);
      if (l) {
        l.isActive = false;
        store.set(id, l);
      }
    },
  };
}

function paginate<T>(items: T[], filter: ListFilter): PaginatedResult<T> {
  const page = filter.page || 1;
  const pageSize = filter.pageSize || 20;
  const start = (page - 1) * pageSize;
  const sliced = items.slice(start, start + pageSize);
  return {
    items: sliced,
    total: items.length,
    page,
    pageSize,
    totalPages: Math.ceil(items.length / pageSize),
  };
}

function createDeps(overrides: Partial<StorefrontDeps> = {}): StorefrontDeps {
  return {
    eventBus: createMockEventBus(),
    cache: createMockCache(),
    config: createMockConfig(),
    fileStorage: createMockFileStorage(),
    ai: createMockAI(),
    stripe: createMockStripe(),
    watermark: createMockWatermark(),
    resourceRepo: createMockResourceRepo(),
    purchaseRepo: createMockPurchaseRepo(),
    licenceRepo: createMockLicenceRepo(),
    ...overrides,
  };
}

/** Create a valid resource via the service and return it. */
async function seedResource(
  service: ResourceStorefrontService,
  deps: StorefrontDeps,
  overrides: Partial<CreateResourceRequest> = {},
): Promise<DigitalResource> {
  const result = await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
    title: 'French Vocabulary Booklet',
    description: 'Comprehensive A1-A2 vocabulary with exercises and audio links',
    format: 'pdf' as ResourceFormat,
    priceIndividualCents: 1500,
    priceSingleSchoolCents: 5000,
    ...overrides,
  });
  if (!result.success) throw new Error(`Seed failed: ${result.error.message}`);
  return result.data;
}

/** Add a file to a resource via the service. */
async function seedFile(
  service: ResourceStorefrontService,
  resourceId: string,
): Promise<ResourceFile> {
  const result = await service.addFile(TENANT_ID, resourceId, AUTHOR_ID, {
    fileName: 'vocab-booklet.pdf',
    data: Buffer.from('mock-pdf-content'),
    mimeType: 'application/pdf',
  });
  if (!result.success) throw new Error(`File seed failed: ${result.error.message}`);
  return result.data;
}


// ============================================================================
// TESTS
// ============================================================================

describe('ResourceStorefrontService', () => {
  let service: ResourceStorefrontService;
  let deps: StorefrontDeps;

  beforeEach(() => {
    deps = createDeps();
    service = new ResourceStorefrontService(deps);
  });

  // ────────────────────────────────────────────────────────────────────────
  // §1 RESOURCE LIFECYCLE
  // ────────────────────────────────────────────────────────────────────────

  describe('createResource', () => {
    it('should create a draft resource with valid data', async () => {
      const result = await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'French Exam Pack',
        description: 'Comprehensive exam preparation materials',
        format: 'pdf',
        priceIndividualCents: 5000,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('draft');
      expect(result.data.authorId).toBe(AUTHOR_ID);
      expect(result.data.slug).toBe('french-exam-pack');
      expect(result.data.priceIndividualCents).toBe(5000);
      expect(result.data.currency).toBe('AUD');
    });

    it('should publish RESOURCE_CREATED event', async () => {
      await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'Test Resource', description: 'Test description text',
        format: 'pdf', priceIndividualCents: 0,
      });

      const eventBus = deps.eventBus as ReturnType<typeof createMockEventBus>;
      expect(eventBus.events.some(e => e.topic === STOREFRONT_EVENTS.RESOURCE_CREATED)).toBe(true);
    });

    it('should reject invalid data — title too short', async () => {
      const result = await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'AB', description: 'Valid description text',
        format: 'pdf', priceIndividualCents: 100,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject negative prices', async () => {
      const result = await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'Valid Title', description: 'Valid description text',
        format: 'pdf', priceIndividualCents: -100,
      });
      expect(result.success).toBe(false);
    });

    it('should reject duplicate slugs', async () => {
      await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'Unique Title', description: 'First resource description',
        format: 'pdf', priceIndividualCents: 0,
      });
      const result = await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'Unique Title', description: 'Second resource description',
        format: 'pdf', priceIndividualCents: 0,
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('CONFLICT');
    });

    it('should generate slug from title with diacritics', async () => {
      const result = await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'Préparation au DELF B2',
        description: 'Comprehensive DELF exam preparation',
        format: 'pdf', priceIndividualCents: 2500,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.slug).toBe('preparation-au-delf-b2');
    });
  });

  describe('updateResource', () => {
    it('should update resource metadata', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.updateResource(TENANT_ID, resource.id, AUTHOR_ID, {
        title: 'Updated Title',
        priceIndividualCents: 2000,
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.title).toBe('Updated Title');
    });

    it('should reject updates from non-author', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.updateResource(TENANT_ID, resource.id, 'user_other', {
        title: 'Hijacked',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should reject edits on archived resources', async () => {
      const resource = await seedResource(service, deps);
      await service.archiveResource(TENANT_ID, resource.id, AUTHOR_ID);
      const result = await service.updateResource(TENANT_ID, resource.id, AUTHOR_ID, { title: 'New' });
      expect(result.success).toBe(false);
    });
  });

  describe('publishResource', () => {
    it('should publish a resource with files and valid description', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);

      const result = await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('published');
    });

    it('should reject publication without files', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.details?.issues).toBeDefined();
    });

    it('should run AI safety check when enabled', async () => {
      const aiMock = createMockAI('{"safe": false, "reason": "Inappropriate content"}');
      deps = createDeps({ ai: aiMock, config: createMockConfig({ aiEnabled: true }) });
      service = new ResourceStorefrontService(deps);

      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);

      const result = await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);
      expect(result.success).toBe(false);
    });

    it('should publish RESOURCE_PUBLISHED event', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const eventBus = deps.eventBus as ReturnType<typeof createMockEventBus>;
      expect(eventBus.events.some(e => e.topic === STOREFRONT_EVENTS.RESOURCE_PUBLISHED)).toBe(true);
    });
  });

  describe('archiveResource', () => {
    it('should archive a resource', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.archiveResource(TENANT_ID, resource.id, AUTHOR_ID);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('archived');
    });

    it('should reject archive from non-author', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.archiveResource(TENANT_ID, resource.id, 'user_other');
      expect(result.success).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // §2 FILE MANAGEMENT
  // ────────────────────────────────────────────────────────────────────────

  describe('addFile', () => {
    it('should upload a file and add it to the resource', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.addFile(TENANT_ID, resource.id, AUTHOR_ID, {
        fileName: 'grammar-guide.pdf',
        data: Buffer.from('pdf-content'),
        mimeType: 'application/pdf',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.fileName).toBe('grammar-guide.pdf');
      expect(result.data.format).toBe('pdf');
    });

    it('should reject upload from non-author', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.addFile(TENANT_ID, resource.id, 'user_other', {
        fileName: 'test.pdf', data: Buffer.from('x'), mimeType: 'application/pdf',
      });
      expect(result.success).toBe(false);
    });

    it('should detect format from MIME type', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.addFile(TENANT_ID, resource.id, AUTHOR_ID, {
        fileName: 'listening.mp3', data: Buffer.from('audio'),
        mimeType: 'audio/mpeg',
      });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.format).toBe('audio_mp3');
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // §3 PURCHASE & PAYMENT
  // ────────────────────────────────────────────────────────────────────────

  describe('initiatePurchase', () => {
    it('should create a PaymentIntent for a published resource', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const result = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.clientSecret).toBeTruthy();
      expect(result.data.purchaseId).toMatch(/^pur_/);
    });

    it('should reject purchase of unpublished resource', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });
      expect(result.success).toBe(false);
    });

    it('should reject duplicate individual purchase', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      // Manually seed a completed purchase
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      purchaseRepo._store.set('pur_existing', {
        id: 'pur_existing', tenantId: TENANT_ID, createdAt: new Date(),
        resourceId: resource.id, buyerId: BUYER_ID, buyerEmail: BUYER_EMAIL,
        buyerName: BUYER_NAME, amountCents: 1500, currency: 'AUD',
        platformFeeCents: 225, authorEarningsCents: 1275,
        licenceScope: 'individual', status: 'completed', downloadCount: 0,
      });

      const result = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('CONFLICT');
    });

    it('should handle free resources without Stripe', async () => {
      const resource = await seedResource(service, deps, { priceIndividualCents: 0 });
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const result = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.clientSecret).toBe('');
    });

    it('should use school price for single_school scope', async () => {
      const resource = await seedResource(service, deps, {
        priceIndividualCents: 1500,
        priceSingleSchoolCents: 5000,
      });
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const result = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'single_school', stripePaymentMethodId: 'pm_test',
      });

      expect(result.success).toBe(true);
      // Verify the pending purchase was saved with the school price
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      const purchases = Array.from(purchaseRepo._store.values());
      const schoolPurchase = purchases.find(p => p.licenceScope === 'single_school');
      expect(schoolPurchase?.amountCents).toBe(5000);
      expect(schoolPurchase?.platformFeeCents).toBe(750); // 15% of 5000
    });

    it('should reject if resource does not offer requested licence scope', async () => {
      // No multi_school price set
      const resource = await seedResource(service, deps, {
        priceIndividualCents: 1500,
      });
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const result = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'multi_school', stripePaymentMethodId: 'pm_test',
      });
      expect(result.success).toBe(false);
    });

    it('should fail gracefully when author has no Stripe account', async () => {
      const stripeNoAccount = createMockStripe({
        async getConnectedAccountId() { return null; },
      });
      deps = createDeps({ stripe: stripeNoAccount });
      service = new ResourceStorefrontService(deps);

      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const result = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('INTERNAL_ERROR');
    });
  });

  describe('confirmPurchase', () => {
    it('should confirm and grant access after Stripe webhook', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const initResult = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });
      if (!initResult.success) throw new Error('Setup failed');

      // Find the payment intent ID from the purchase repo
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      const pendingPurchase = Array.from(purchaseRepo._store.values()).find(p => p.status === 'pending');
      if (!pendingPurchase?.stripePaymentIntentId) throw new Error('No pending purchase');

      const result = await service.confirmPurchase(pendingPurchase.stripePaymentIntentId, 'ch_test123');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('completed');
      expect(result.data.stripeChargeId).toBe('ch_test123');
    });

    it('should publish RESOURCE_PURCHASED event on confirmation', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const initResult = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });
      if (!initResult.success) throw new Error('Setup failed');

      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      const pending = Array.from(purchaseRepo._store.values()).find(p => p.status === 'pending');
      if (!pending?.stripePaymentIntentId) throw new Error('No pending');

      await service.confirmPurchase(pending.stripePaymentIntentId, 'ch_test');

      const eventBus = deps.eventBus as ReturnType<typeof createMockEventBus>;
      expect(eventBus.events.some(e => e.topic === STOREFRONT_EVENTS.RESOURCE_PURCHASED)).toBe(true);
    });
  });

  describe('refundPurchase', () => {
    it('should refund a completed purchase', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const initResult = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });
      if (!initResult.success) throw new Error('Setup failed');

      // Manually mark as completed
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      const pending = Array.from(purchaseRepo._store.values()).find(p => p.status === 'pending');
      if (!pending) throw new Error('No pending');
      pending.status = 'completed';
      purchaseRepo._store.set(pending.id, pending);

      const result = await service.refundPurchase(TENANT_ID, pending.id, 'Customer requested');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('refunded');
    });

    it('should reject refund of non-completed purchase', async () => {
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      purchaseRepo._store.set('pur_pending', {
        id: 'pur_pending', tenantId: TENANT_ID, createdAt: new Date(),
        resourceId: 'res_1', buyerId: BUYER_ID, buyerEmail: BUYER_EMAIL,
        buyerName: BUYER_NAME, amountCents: 1500, currency: 'AUD',
        platformFeeCents: 225, authorEarningsCents: 1275,
        licenceScope: 'individual', status: 'pending', downloadCount: 0,
        stripePaymentIntentId: 'pi_test',
      });

      const result = await service.refundPurchase(TENANT_ID, 'pur_pending', 'reason');
      expect(result.success).toBe(false);
    });

    it('should reject refund of free purchase', async () => {
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      purchaseRepo._store.set('pur_free', {
        id: 'pur_free', tenantId: TENANT_ID, createdAt: new Date(),
        resourceId: 'res_1', buyerId: BUYER_ID, buyerEmail: BUYER_EMAIL,
        buyerName: BUYER_NAME, amountCents: 0, currency: 'AUD',
        platformFeeCents: 0, authorEarningsCents: 0,
        licenceScope: 'individual', status: 'completed', downloadCount: 0,
      });

      const result = await service.refundPurchase(TENANT_ID, 'pur_free', 'reason');
      expect(result.success).toBe(false);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // §4 DOWNLOAD & ACCESS CONTROL
  // ────────────────────────────────────────────────────────────────────────

  describe('verifyAccess', () => {
    it('should grant access to resource author', async () => {
      const resource = await seedResource(service, deps);
      const hasAccess = await service.verifyAccess(TENANT_ID, resource.id, AUTHOR_ID);
      expect(hasAccess).toBe(true);
    });

    it('should grant access to buyer with completed purchase', async () => {
      const resource = await seedResource(service, deps);
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      purchaseRepo._store.set('pur_1', {
        id: 'pur_1', tenantId: TENANT_ID, createdAt: new Date(),
        resourceId: resource.id, buyerId: BUYER_ID, buyerEmail: BUYER_EMAIL,
        buyerName: BUYER_NAME, amountCents: 1500, currency: 'AUD',
        platformFeeCents: 225, authorEarningsCents: 1275,
        licenceScope: 'individual', status: 'completed', downloadCount: 0,
      });

      const hasAccess = await service.verifyAccess(TENANT_ID, resource.id, BUYER_ID);
      expect(hasAccess).toBe(true);
    });

    it('should deny access to unpurchased user', async () => {
      const resource = await seedResource(service, deps);
      const hasAccess = await service.verifyAccess(TENANT_ID, resource.id, 'user_random');
      expect(hasAccess).toBe(false);
    });

    it('should grant access via institutional licence', async () => {
      const resource = await seedResource(service, deps);
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      const licenceRepo = deps.licenceRepo as ReturnType<typeof createMockLicenceRepo>;

      // School purchase
      purchaseRepo._store.set('pur_school', {
        id: 'pur_school', tenantId: TENANT_ID, createdAt: new Date(),
        resourceId: resource.id, buyerId: 'user_admin', buyerEmail: 'admin@school.edu',
        buyerName: 'Admin', amountCents: 5000, currency: 'AUD',
        platformFeeCents: 750, authorEarningsCents: 4250,
        licenceScope: 'single_school', status: 'completed', downloadCount: 0,
      });

      // School licence
      licenceRepo._store.set('lic_school', {
        id: 'lic_school', tenantId: TENANT_ID, createdAt: new Date(), updatedAt: new Date(),
        purchaseId: 'pur_school', scope: 'single_school',
        institutionId: 'school_brighton', maxUsers: 10, activeUsers: 2, isActive: true,
      });

      const hasAccess = await service.verifyAccess(TENANT_ID, resource.id, 'user_teacher', 'school_brighton');
      expect(hasAccess).toBe(true);
    });
  });

  describe('getDownloadUrl', () => {
    it('should return signed URL for authorised user', async () => {
      const resource = await seedResource(service, deps);
      const file = await seedFile(service, resource.id);

      // Author always has access
      const result = await service.getDownloadUrl(TENANT_ID, resource.id, file.id, AUTHOR_ID);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.url).toContain('signed');
      expect(result.data.expiresInSeconds).toBe(3600);
    });

    it('should deny download without access', async () => {
      const resource = await seedResource(service, deps);
      const file = await seedFile(service, resource.id);

      const result = await service.getDownloadUrl(TENANT_ID, resource.id, file.id, 'user_random');
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should publish RESOURCE_DOWNLOADED event', async () => {
      const resource = await seedResource(service, deps);
      const file = await seedFile(service, resource.id);
      await service.getDownloadUrl(TENANT_ID, resource.id, file.id, AUTHOR_ID);

      const eventBus = deps.eventBus as ReturnType<typeof createMockEventBus>;
      expect(eventBus.events.some(e => e.topic === STOREFRONT_EVENTS.RESOURCE_DOWNLOADED)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // §5 SEARCH & RECOMMENDATIONS
  // ────────────────────────────────────────────────────────────────────────

  describe('searchResources', () => {
    it('should return only published resources by default', async () => {
      await seedResource(service, deps, { title: 'Draft Resource' });
      const published = await seedResource(service, deps, { title: 'Published Resource' });
      await seedFile(service, published.id);
      await service.publishResource(TENANT_ID, published.id, AUTHOR_ID);

      const result = await service.searchResources(TENANT_ID, { page: 1, pageSize: 20 });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.items.every(r => r.status === 'published')).toBe(true);
    });
  });

  describe('getRecommendations', () => {
    it('should return popular resources as fallback when AI disabled', async () => {
      const resource = await seedResource(service, deps);
      await seedFile(service, resource.id);
      await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);

      const result = await service.getRecommendations(TENANT_ID, {
        studentId: BUYER_ID,
      });
      expect(result.success).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // §6 REVIEWS
  // ────────────────────────────────────────────────────────────────────────

  describe('submitReview', () => {
    it('should accept a review from a purchaser', async () => {
      const resource = await seedResource(service, deps);

      // Seed a completed purchase
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      purchaseRepo._store.set('pur_rev', {
        id: 'pur_rev', tenantId: TENANT_ID, createdAt: new Date(),
        resourceId: resource.id, buyerId: BUYER_ID, buyerEmail: BUYER_EMAIL,
        buyerName: BUYER_NAME, amountCents: 1500, currency: 'AUD',
        platformFeeCents: 225, authorEarningsCents: 1275,
        licenceScope: 'individual', status: 'completed', downloadCount: 1,
      });

      const result = await service.submitReview(TENANT_ID, resource.id, BUYER_ID, BUYER_NAME, 5, 'Excellent!', 'Great resource for exam prep');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.rating).toBe(5);
    });

    it('should reject review from non-purchaser', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.submitReview(TENANT_ID, resource.id, 'user_random', 'Random', 5);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('FORBIDDEN');
    });

    it('should reject invalid ratings', async () => {
      const resource = await seedResource(service, deps);
      const result = await service.submitReview(TENANT_ID, resource.id, BUYER_ID, BUYER_NAME, 6);
      expect(result.success).toBe(false);
    });

    it('should update average rating on resource', async () => {
      const resource = await seedResource(service, deps);
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      purchaseRepo._store.set('pur_r1', {
        id: 'pur_r1', tenantId: TENANT_ID, createdAt: new Date(),
        resourceId: resource.id, buyerId: BUYER_ID, buyerEmail: BUYER_EMAIL,
        buyerName: BUYER_NAME, amountCents: 1500, currency: 'AUD',
        platformFeeCents: 225, authorEarningsCents: 1275,
        licenceScope: 'individual', status: 'completed', downloadCount: 0,
      });

      await service.submitReview(TENANT_ID, resource.id, BUYER_ID, BUYER_NAME, 4);

      const resourceRepo = deps.resourceRepo as ReturnType<typeof createMockResourceRepo>;
      const updated = resourceRepo._store.get(resource.id);
      expect(updated?.ratingCount).toBe(1);
      expect(updated?.averageRating).toBe(4);
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // §7 AUTHOR ANALYTICS
  // ────────────────────────────────────────────────────────────────────────

  describe('getAuthorAnalytics', () => {
    it('should return accurate analytics for an author', async () => {
      // Seed 2 resources with purchases
      const r1 = await seedResource(service, deps, { title: 'Resource One' });
      const r2 = await seedResource(service, deps, { title: 'Resource Two' });

      const resourceRepo = deps.resourceRepo as ReturnType<typeof createMockResourceRepo>;
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      const r1Data = resourceRepo._store.get(r1.id)!;
      r1Data.totalPurchases = 10; r1Data.totalRevenueCents = 15000; r1Data.averageRating = 4.5;
      resourceRepo._store.set(r1.id, r1Data);

      const r2Data = resourceRepo._store.get(r2.id)!;
      r2Data.totalPurchases = 5; r2Data.totalRevenueCents = 25000; r2Data.averageRating = 4.0;
      resourceRepo._store.set(r2.id, r2Data);

      // Seed actual purchase records within the date range for period-scoped analytics
      const now = new Date();
      for (let i = 0; i < 10; i++) {
        purchaseRepo._store.set(`pur_r1_${i}`, {
          id: `pur_r1_${i}`, tenantId: TENANT_ID, createdAt: now,
          resourceId: r1.id, buyerId: `buyer_${i}`, buyerEmail: `b${i}@test.com`,
          buyerName: `Buyer ${i}`, amountCents: 1500, currency: 'AUD',
          platformFeeCents: 225, authorEarningsCents: 1275,
          licenceScope: 'individual', status: 'completed', downloadCount: 0,
        });
      }
      for (let i = 0; i < 5; i++) {
        purchaseRepo._store.set(`pur_r2_${i}`, {
          id: `pur_r2_${i}`, tenantId: TENANT_ID, createdAt: now,
          resourceId: r2.id, buyerId: `buyer_r2_${i}`, buyerEmail: `b2_${i}@test.com`,
          buyerName: `Buyer R2 ${i}`, amountCents: 5000, currency: 'AUD',
          platformFeeCents: 750, authorEarningsCents: 4250,
          licenceScope: 'individual', status: 'completed', downloadCount: 0,
        });
      }

      const fromDate = new Date(now.getTime() - 86400000); // 1 day ago
      const toDate = new Date(now.getTime() + 86400000); // 1 day from now
      const result = await service.getAuthorAnalytics(TENANT_ID, AUTHOR_ID, fromDate, toDate);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.totalResources).toBe(2);
      expect(result.data.totalPurchases).toBe(15);
      expect(result.data.totalRevenueCents).toBe(40000);
      expect(result.data.platformFeeCents).toBe(6000); // 15% of 40000
      expect(result.data.authorEarningsCents).toBe(34000);
      expect(result.data.topResources[0].title).toBe('Resource Two'); // Higher revenue first
    });
  });

  // ────────────────────────────────────────────────────────────────────────
  // §8 INTEGRATION: Full Érudits Purchase Flow
  // ────────────────────────────────────────────────────────────────────────

  describe('Full Érudits purchase flow', () => {
    it('should handle complete lifecycle: create → publish → purchase → download → review', async () => {
      // 1. Marie creates a vocabulary booklet
      const createResult = await service.createResource(TENANT_ID, AUTHOR_ID, AUTHOR_NAME, {
        title: 'DELF B2 Vocabulary Master',
        description: 'Complete vocabulary list with exercises for DELF B2 preparation',
        format: 'pdf',
        priceIndividualCents: 1500,
        priceSingleSchoolCents: 5000,
        subjectArea: 'French',
        tags: ['DELF', 'B2', 'vocabulary'],
      });
      expect(createResult.success).toBe(true);
      if (!createResult.success) return;
      const resource = createResult.data;

      // 2. Marie uploads the PDF
      const fileResult = await service.addFile(TENANT_ID, resource.id, AUTHOR_ID, {
        fileName: 'delf-b2-vocab.pdf',
        data: Buffer.from('mock-pdf'),
        mimeType: 'application/pdf',
      });
      expect(fileResult.success).toBe(true);

      // 3. Marie publishes
      const publishResult = await service.publishResource(TENANT_ID, resource.id, AUTHOR_ID);
      expect(publishResult.success).toBe(true);
      if (!publishResult.success) return;
      expect(publishResult.data.status).toBe('published');

      // 4. Alice searches for French resources
      const searchResult = await service.searchResources(TENANT_ID, {
        page: 1, pageSize: 10, search: 'DELF',
      });
      expect(searchResult.success).toBe(true);
      if (!searchResult.success) return;
      expect(searchResult.data.items.length).toBe(1);

      // 5. Alice initiates purchase
      const purchaseResult = await service.initiatePurchase(TENANT_ID, BUYER_ID, BUYER_EMAIL, BUYER_NAME, {
        resourceId: resource.id, licenceScope: 'individual', stripePaymentMethodId: 'pm_test',
      });
      expect(purchaseResult.success).toBe(true);
      if (!purchaseResult.success) return;

      // 6. Stripe webhook confirms payment
      const purchaseRepo = deps.purchaseRepo as ReturnType<typeof createMockPurchaseRepo>;
      const pending = Array.from(purchaseRepo._store.values()).find(p => p.status === 'pending');
      expect(pending).toBeDefined();
      if (!pending?.stripePaymentIntentId) return;

      const confirmResult = await service.confirmPurchase(pending.stripePaymentIntentId, 'ch_live_123');
      expect(confirmResult.success).toBe(true);

      // 7. Alice downloads the file
      if (!fileResult.success) return;
      const downloadResult = await service.getDownloadUrl(TENANT_ID, resource.id, fileResult.data.id, BUYER_ID);
      expect(downloadResult.success).toBe(true);
      if (!downloadResult.success) return;
      expect(downloadResult.data.url).toContain('signed');

      // 8. Alice reviews
      const reviewResult = await service.submitReview(TENANT_ID, resource.id, BUYER_ID, BUYER_NAME, 5, 'Très bien!', 'Exactly what I needed for DELF prep');
      expect(reviewResult.success).toBe(true);

      // 9. Verify event trail
      const eventBus = deps.eventBus as ReturnType<typeof createMockEventBus>;
      const topics = eventBus.events.map(e => e.topic);
      expect(topics).toContain(STOREFRONT_EVENTS.RESOURCE_CREATED);
      expect(topics).toContain(STOREFRONT_EVENTS.RESOURCE_PUBLISHED);
      expect(topics).toContain(STOREFRONT_EVENTS.RESOURCE_PURCHASED);
      expect(topics).toContain(STOREFRONT_EVENTS.RESOURCE_DOWNLOADED);
      expect(topics).toContain(STOREFRONT_EVENTS.RESOURCE_REVIEWED);

      // 10. Marie checks analytics
      const analyticsResult = await service.getAuthorAnalytics(TENANT_ID, AUTHOR_ID, new Date(0), new Date());
      expect(analyticsResult.success).toBe(true);
      if (!analyticsResult.success) return;
      expect(analyticsResult.data.totalPurchases).toBeGreaterThanOrEqual(1);
    });
  });
});
