/**
 * ============================================================================
 * Storefront Service Tests
 * ============================================================================
 */

import { ResourceStorefrontService } from '../services/storefront.service';
import {
  mockEventBus, mockCache, mockConfig, mockFileStorage, mockAIService,
  mockStripeClient, mockWatermarkService,
  mockResourceRepo, mockPurchaseRepo, mockLicenceRepo,
  fixtures, expectSuccess, expectFailure,
} from './helpers';

describe('ResourceStorefrontService', () => {
  let service: ResourceStorefrontService;
  let deps: ReturnType<typeof createDeps>;

  function createDeps() {
    return {
      eventBus: mockEventBus(),
      cache: mockCache(),
      config: mockConfig(),
      fileStorage: mockFileStorage(),
      ai: mockAIService(),
      stripe: mockStripeClient(),
      watermark: mockWatermarkService(),
      resourceRepo: mockResourceRepo(),
      purchaseRepo: mockPurchaseRepo(),
      licenceRepo: mockLicenceRepo(),
    };
  }

  beforeEach(() => {
    deps = createDeps();
    service = new ResourceStorefrontService(deps);
  });

  // ── Resource Lifecycle ──

  describe('createResource', () => {
    it('should create a draft resource with valid data', async () => {
      const result = await service.createResource(
        fixtures.tenantId, fixtures.userId, fixtures.userName,
        {
          title: 'French Exam Pack',
          description: 'Comprehensive exam prep',
          format: 'pdf',
          priceIndividualCents: 5000,
        },
      );

      expectSuccess(result);
      expect(deps.resourceRepo.save).toHaveBeenCalledTimes(1);
      expect(deps.eventBus.publish).toHaveBeenCalled();

      if (result.success) {
        expect(result.data.status).toBe('draft');
        expect(result.data.authorId).toBe(fixtures.userId);
      }
    });

    it('should reject if slug already exists', async () => {
      deps.resourceRepo.findBySlug.mockResolvedValue(fixtures.resource());

      const result = await service.createResource(
        fixtures.tenantId, fixtures.userId, fixtures.userName,
        { title: 'French Exam Pack 2026', description: 'Comprehensive exam preparation materials', format: 'pdf', priceIndividualCents: 5000 },
      );

      expectFailure(result, 'CONFLICT');
    });
  });

  describe('publishResource', () => {
    it('should publish a draft resource with files', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({
          status: 'draft',
          files: [{ id: 'f1', tenantId: fixtures.tenantId, createdAt: new Date(), resourceId: 'res_001',
            fileName: 'pack.pdf', fileUrl: 'https://cdn/pack.pdf', fileSizeBytes: 1024,
            mimeType: 'application/pdf', format: 'pdf', sortOrder: 1, watermarkEnabled: false }],
        }),
      );

      const result = await service.publishResource(fixtures.tenantId, 'res_001', fixtures.userId);

      expectSuccess(result);
      expect(deps.resourceRepo.update).toHaveBeenCalled();
    });

    it('should reject publishing a resource with no files', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({ status: 'draft', files: [] }),
      );

      const result = await service.publishResource(fixtures.tenantId, 'res_001', fixtures.userId);
      expectFailure(result, 'VALIDATION_ERROR');
    });

    it('should reject publishing by non-author', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({ authorId: 'other_user' }),
      );

      const result = await service.publishResource(fixtures.tenantId, 'res_001', fixtures.userId);
      expectFailure(result, 'FORBIDDEN');
    });
  });

  // ── Purchases ──

  describe('initiatePurchase', () => {
    it('should create a Stripe payment intent for paid resources', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({ status: 'published', priceIndividualCents: 5000 }),
      );

      const result = await service.initiatePurchase(
        fixtures.tenantId, 'buyer_001', 'buyer@test.com', 'Buyer',
        { resourceId: 'res_001', licenceScope: 'individual', stripePaymentMethodId: 'pm_test' },
      );

      expectSuccess(result);
      expect(deps.stripe.createPaymentIntent).toHaveBeenCalled();
    });

    it('should handle free resources without Stripe', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({ status: 'published', priceIndividualCents: 0 }),
      );

      const result = await service.initiatePurchase(
        fixtures.tenantId, 'buyer_001', 'buyer@test.com', 'Buyer',
        { resourceId: 'res_001', licenceScope: 'individual', stripePaymentMethodId: 'pm_test' },
      );

      expectSuccess(result);
      // Free purchase should NOT call Stripe
      expect(deps.stripe.createPaymentIntent).not.toHaveBeenCalled();
    });

    it('should reject duplicate purchases', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({ status: 'published' }),
      );
      deps.purchaseRepo.hasBuyerPurchased.mockResolvedValue(true);

      const result = await service.initiatePurchase(
        fixtures.tenantId, 'buyer_001', 'buyer@test.com', 'Buyer',
        { resourceId: 'res_001', licenceScope: 'individual', stripePaymentMethodId: 'pm_test' },
      );

      expectFailure(result, 'CONFLICT');
    });
  });

  // ── Download Access ──

  describe('getDownloadUrl', () => {
    it('should grant access to a purchased resource', async () => {
      const resource = fixtures.resource({
        status: 'published',
        files: [{ id: 'f1', tenantId: fixtures.tenantId, createdAt: new Date(), resourceId: 'res_001',
          fileName: 'pack.pdf', fileUrl: 'https://cdn/pack.pdf', fileSizeBytes: 1024,
          mimeType: 'application/pdf', format: 'pdf', sortOrder: 1, watermarkEnabled: false }],
      });
      deps.resourceRepo.findById.mockResolvedValue(resource);
      deps.purchaseRepo.hasBuyerPurchased.mockResolvedValue(true);

      const result = await service.getDownloadUrl(fixtures.tenantId, 'res_001', 'f1', 'buyer_001');

      expectSuccess(result);
    });

    it('should deny access without purchase', async () => {
      deps.resourceRepo.findById.mockResolvedValue(fixtures.resource({ status: 'published' }));
      deps.purchaseRepo.hasBuyerPurchased.mockResolvedValue(false);
      deps.licenceRepo.findActiveByInstitution.mockResolvedValue([]);

      const result = await service.getDownloadUrl(fixtures.tenantId, 'res_001', 'f1', 'random_user');
      expectFailure(result, 'FORBIDDEN');
    });

    it('should grant access to the author without purchase', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({ authorId: 'author_001', status: 'published',
          files: [{ id: 'f1', tenantId: fixtures.tenantId, createdAt: new Date(), resourceId: 'res_001',
            fileName: 'pack.pdf', fileUrl: 'https://cdn/pack.pdf', fileSizeBytes: 1024,
            mimeType: 'application/pdf', format: 'pdf', sortOrder: 1, watermarkEnabled: false }],
        }),
      );

      const result = await service.getDownloadUrl(fixtures.tenantId, 'res_001', 'f1', 'author_001');
      expectSuccess(result);
    });
  });

  // ── Search ──

  describe('searchResources', () => {
    it('should delegate to repository with filters', async () => {
      deps.resourceRepo.search.mockResolvedValue({
        items: [fixtures.resource()],
        total: 1, page: 1, pageSize: 20, totalPages: 1,
      });

      const result = await service.searchResources(fixtures.tenantId, {
        search: 'french',
        subjectArea: 'Languages',
        page: 1,
        pageSize: 20,
      });

      expectSuccess(result);
      expect(deps.resourceRepo.search).toHaveBeenCalledTimes(1);
    });
  });

  // ── Reviews ──

  describe('submitReview', () => {
    it('should accept a valid review', async () => {
      deps.resourceRepo.findById.mockResolvedValue(
        fixtures.resource({ status: 'published' }),
      );
      deps.purchaseRepo.hasBuyerPurchased.mockResolvedValue(true);

      const result = await service.submitReview(
        fixtures.tenantId, 'res_001', 'buyer_001', 'Buyer', 5, 'Excellent!', 'Very helpful.',
      );

      expectSuccess(result);
    });
  });
});
