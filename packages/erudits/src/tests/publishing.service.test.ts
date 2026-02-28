/**
 * ============================================================================
 * Publishing Service Tests
 * ============================================================================
 */

import { PublishingEngineService } from '../services/publishing.service';
import {
  mockEventBus, mockCache, mockConfig, mockFileStorage, mockAIService,
  mockFormattingEngine,
  mockManuscriptRepo, mockVersionRepo,
  mockPublicationRepo, mockCoverRepo, mockSalesRepo,
  fixtures, expectSuccess, expectFailure,
} from './helpers';

describe('PublishingEngineService', () => {
  let service: PublishingEngineService;
  let deps: ReturnType<typeof createDeps>;

  function createDeps() {
    return {
      eventBus: mockEventBus(),
      cache: mockCache(),
      config: mockConfig(),
      fileStorage: mockFileStorage(),
      ai: mockAIService(),
      formatter: mockFormattingEngine(),
      manuscriptRepo: mockManuscriptRepo(),
      versionRepo: mockVersionRepo(),
      publicationRepo: mockPublicationRepo(),
      coverRepo: mockCoverRepo(),
      salesRepo: mockSalesRepo(),
    };
  }

  beforeEach(() => {
    deps = createDeps();
    service = new PublishingEngineService(deps);
  });

  // ── Manuscript Lifecycle ──

  describe('createManuscript', () => {
    it('should create a manuscript with default US Trade trim size', async () => {
      const result = await service.createManuscript(
        fixtures.tenantId, fixtures.userId, fixtures.userName,
        { title: 'French Grammar Essentials' },
      );

      expectSuccess(result);
      expect(deps.manuscriptRepo.save).toHaveBeenCalledTimes(1);

      if (result.success) {
        expect(result.data.status).toBe('draft');
        expect(result.data.trimWidth).toBe(6);
        expect(result.data.trimHeight).toBe(9);
      }
    });

    it('should reject duplicate slugs', async () => {
      deps.manuscriptRepo.findBySlug.mockResolvedValue(fixtures.manuscript());

      const result = await service.createManuscript(
        fixtures.tenantId, fixtures.userId, fixtures.userName,
        { title: 'French Grammar Essentials' },
      );

      expectFailure(result, 'CONFLICT');
    });

    it('should accept custom trim size', async () => {
      const result = await service.createManuscript(
        fixtures.tenantId, fixtures.userId, fixtures.userName,
        { title: 'A5 Workbook', trimWidth: 5.83, trimHeight: 8.27 },
      );

      expectSuccess(result);
      if (result.success) {
        expect(result.data.trimWidth).toBe(5.83);
        expect(result.data.trimHeight).toBe(8.27);
      }
    });
  });

  describe('updateManuscript', () => {
    it('should update manuscript content and recalculate word count', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript());

      const result = await service.updateManuscript(
        fixtures.tenantId, 'ms_001', fixtures.userId,
        { content: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Hello world' }] }] } },
      );

      expectSuccess(result);
      expect(deps.manuscriptRepo.update).toHaveBeenCalled();
    });

    it('should reject updates by non-author', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(
        fixtures.manuscript({ authorId: 'other_author' }),
      );

      const result = await service.updateManuscript(
        fixtures.tenantId, 'ms_001', fixtures.userId,
        { title: 'New Title' },
      );

      expectFailure(result, 'FORBIDDEN');
    });
  });

  // ── Version Control ──

  describe('saveVersion', () => {
    it('should create a version snapshot', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript({ wordCount: 500 }));
      deps.versionRepo.findLatest.mockResolvedValue(null);

      const result = await service.saveVersion(
        fixtures.tenantId, 'ms_001', fixtures.userId, 'First draft',
      );

      expectSuccess(result);
      expect(deps.versionRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should increment version number', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript());
      deps.versionRepo.findLatest.mockResolvedValue({
        id: 'ver_001', tenantId: fixtures.tenantId, createdAt: new Date(),
        manuscriptId: 'ms_001', versionNumber: 3, content: {}, wordCount: 100, createdBy: fixtures.userId,
      });

      const result = await service.saveVersion(
        fixtures.tenantId, 'ms_001', fixtures.userId,
      );

      expectSuccess(result);
      if (result.success) {
        expect(result.data.versionNumber).toBe(4);
      }
    });
  });

  describe('restoreVersion', () => {
    it('should restore manuscript content from a version', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript());
      deps.versionRepo.findById.mockResolvedValue({
        id: 'ver_002', tenantId: fixtures.tenantId, createdAt: new Date(),
        manuscriptId: 'ms_001', versionNumber: 2,
        content: { type: 'doc', content: [{ type: 'paragraph' }] },
        wordCount: 200, createdBy: fixtures.userId,
      });

      const result = await service.restoreVersion(
        fixtures.tenantId, 'ms_001', 'ver_002', fixtures.userId,
      );

      expectSuccess(result);
      expect(deps.manuscriptRepo.update).toHaveBeenCalled();
    });

    it('should reject restoring a nonexistent version', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript());
      deps.versionRepo.findById.mockResolvedValue(null);

      const result = await service.restoreVersion(
        fixtures.tenantId, 'ms_001', 'nonexistent', fixtures.userId,
      );

      expectFailure(result, 'NOT_FOUND');
    });
  });

  // ── Cover Management ──

  describe('generateCover', () => {
    it('should generate an AI cover and save it', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript());
      deps.ai.generateImage.mockResolvedValue({ imageUrl: "https://generated-cover.png", cost: 0.05 });





      const result = await service.generateCover(
        fixtures.tenantId, fixtures.userId,
        { manuscriptId: 'ms_001', prompt: 'Professional French textbook cover' },
      );

      expectSuccess(result);
      expect(deps.coverRepo.save).toHaveBeenCalledTimes(1);
    });
  });

  describe('selectCover', () => {
    it('should set the selected cover for a manuscript', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript());
      deps.coverRepo.findById.mockResolvedValue({
        id: 'cover_001', tenantId: fixtures.tenantId, createdAt: new Date(),
        manuscriptId: 'ms_001', source: 'ai_generated',
        isKdpCompliant: true, isSelected: false,
      });

      const result = await service.selectCover(
        fixtures.tenantId, 'ms_001', 'cover_001', fixtures.userId,
      );

      expectSuccess(result);
      expect(deps.coverRepo.setSelected).toHaveBeenCalledWith(
        fixtures.tenantId, 'ms_001', 'cover_001',
      );
    });
  });

  // ── Multi-Channel Publishing ──

  describe('publish', () => {
    it('should create publications for requested formats and channels', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(
        fixtures.manuscript({ status: 'approved', pageCountEstimate: 150 }),
      );
      deps.versionRepo.findById.mockResolvedValue({
        id: 'ver_001', tenantId: fixtures.tenantId, createdAt: new Date(),
        manuscriptId: 'ms_001', versionNumber: 1, content: {}, wordCount: 30000, createdBy: fixtures.userId,
      });
      deps.coverRepo.findSelected.mockResolvedValue({
        id: 'cover_001', tenantId: fixtures.tenantId, createdAt: new Date(),
        manuscriptId: 'ms_001', source: 'ai_generated', isKdpCompliant: true, isSelected: true,
      });

      const result = await service.publish(
        fixtures.tenantId, fixtures.userId,
        {
          manuscriptId: 'ms_001',
          versionId: 'ver_001',
          formats: ['ebook_epub', 'paperback'],
          channels: ['scholarly_direct', 'amazon_kdp'],
          pricing: {
            scholarly_direct: { priceCents: 2999, currency: 'AUD' },
            amazon_kdp: { priceCents: 3499, currency: 'AUD' },
          },
        },
      );

      expectSuccess(result);
      // Should create one publication per format
      expect(deps.publicationRepo.save).toHaveBeenCalledTimes(2);
    });

    it('should reject publishing without a selected cover', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(
        fixtures.manuscript({ status: 'draft' }),
      );
      deps.versionRepo.findById.mockResolvedValue({
        id: 'ver_001', tenantId: fixtures.tenantId, createdAt: new Date(),
        manuscriptId: 'ms_001', versionNumber: 1, content: {}, wordCount: 100, createdBy: fixtures.userId,
      });
      deps.coverRepo.findSelected.mockResolvedValue(null);

      const result = await service.publish(
        fixtures.tenantId, fixtures.userId,
        {
          manuscriptId: 'ms_001', versionId: 'ver_001',
          formats: ['ebook_epub'], channels: ['scholarly_direct'],
          pricing: { scholarly_direct: { priceCents: 2999, currency: 'AUD' } },
        },
      );

      expectFailure(result, 'VALIDATION_ERROR');
    });
  });

  // ── AI Assistant ──

  describe('aiAssist', () => {
    it('should generate curriculum-aligned content', async () => {
      deps.manuscriptRepo.findById.mockResolvedValue(fixtures.manuscript({ language: 'fr' }));
      deps.ai.complete.mockResolvedValue({
        text: 'Generated French grammar exercises...',
        tokensUsed: 500,
        cost: 0.02,
      });

      const result = await service.aiAssist(
        fixtures.tenantId, 'ms_001', fixtures.userId,
        'Generate 10 passé composé exercises',
        { contentType: 'exercise', targetLanguage: 'fr' },
      );

      expectSuccess(result);
      expect(deps.ai.complete).toHaveBeenCalled();
    });
  });
});
