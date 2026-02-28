/**
 * ============================================================================
 * Migration Service Tests
 * ============================================================================
 */

import { SquarespaceMigrationService } from '../services/migration.service';
import {
  mockEventBus, mockCache, mockConfig, mockFileStorage,
  mockMigrationRepo, mockMigrationContentRepo,
  fixtures, expectSuccess, expectFailure,
} from './helpers';

// Mock the SquarespaceApiClient
function mockSqClient() {
  return {
    exportSite: jest.fn().mockResolvedValue({
      success: true,
      data: {
        pages: [{ id: 'p1', title: 'Home', url: '/home', html: '<h1>Welcome</h1>' }],
        products: [{ id: 'pr1', title: 'Exam Pack', price: 50.00, currency: 'AUD', variants: [], images: [] }],
        posts: [],
        members: [{ email: 'student@test.com', name: 'Student' }],
        images: ['https://erudits.com/img/logo.png'],
        siteSettings: { title: 'Érudits', description: 'French tutoring' },
      },
    }),
    downloadAsset: jest.fn().mockResolvedValue({
      success: true,
      data: Buffer.from('fake-image-data'),
    }),
  };
}

describe('SquarespaceMigrationService', () => {
  let service: SquarespaceMigrationService;
  let deps: ReturnType<typeof createDeps>;
  let sqClient: ReturnType<typeof mockSqClient>;

  function createDeps() {
    return {
      eventBus: mockEventBus(),
      cache: mockCache(),
      config: mockConfig(),
      fileStorage: mockFileStorage(),
      migrationRepo: mockMigrationRepo(),
      contentRepo: mockMigrationContentRepo(),
    };
  }

  beforeEach(() => {
    deps = createDeps();
    sqClient = mockSqClient();
    service = new SquarespaceMigrationService(deps, sqClient);
  });

  // ── STAGE 1: Start Migration ──

  describe('startMigration', () => {
    it('should create a migration job for a valid Squarespace URL', async () => {
      const result = await service.startMigration(
        fixtures.tenantId, fixtures.userId, fixtures.userEmail,
        { source: 'squarespace', sourceUrl: 'https://erudits.com' },
      );

      expectSuccess(result);
      expect(deps.migrationRepo.save).toHaveBeenCalledTimes(1);
      expect(deps.eventBus.publish).toHaveBeenCalled();
    });

    it('should reject invalid URLs', async () => {
      const result = await service.startMigration(
        fixtures.tenantId, fixtures.userId, fixtures.userEmail,
        { source: 'squarespace', sourceUrl: 'not-a-url' },
      );

      expectFailure(result, 'VALIDATION_ERROR');
      expect(deps.migrationRepo.save).not.toHaveBeenCalled();
    });

    it('should reject if an active migration already exists', async () => {
      deps.migrationRepo.findByOwner.mockResolvedValue([
        fixtures.migration({ status: 'extracting' }),
      ]);

      const result = await service.startMigration(
        fixtures.tenantId, fixtures.userId, fixtures.userEmail,
        { source: 'squarespace', sourceUrl: 'https://erudits.com' },
      );

      expectFailure(result, 'CONFLICT');
    });
  });

  // ── STAGE 4: Approve Migration ──

  describe('approveMigration', () => {
    it('should approve migration and update content items', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'ready_for_review' }),
      );
      deps.contentRepo.findByMigration.mockResolvedValue([
        fixtures.migrationContentItem({ id: 'item_1', status: 'mapped' }),
        fixtures.migrationContentItem({ id: 'item_2', status: 'mapped' }),
      ]);

      const result = await service.approveMigration(
        fixtures.tenantId, fixtures.userId,
        { migrationId: 'mig_001', approvedItems: ['item_1'], skippedItems: ['item_2'] },
      );

      expectSuccess(result);
      expect(deps.contentRepo.updateBatch).toHaveBeenCalled();
      expect(deps.migrationRepo.update).toHaveBeenCalled();
    });

    it('should reject if migration is not in review state', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'extracting' }),
      );

      const result = await service.approveMigration(
        fixtures.tenantId, fixtures.userId,
        { migrationId: 'mig_001', approvedItems: [], skippedItems: [] },
      );

      expectFailure(result);
    });

    it('should return NOT_FOUND for nonexistent migration', async () => {
      deps.migrationRepo.findById.mockResolvedValue(null);

      const result = await service.approveMigration(
        fixtures.tenantId, fixtures.userId,
        { migrationId: 'nonexistent', approvedItems: [], skippedItems: [] },
      );

      expectFailure(result, 'NOT_FOUND');
    });
  });

  // ── STAGE 5: Execute Import ──

  describe('executeImport', () => {
    it('should import approved content items', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'approved' }),
      );
      deps.contentRepo.findByMigration.mockResolvedValue([
        fixtures.migrationContentItem({ id: 'item_1', status: 'mapped', targetType: 'cms_page' }),
      ]);

      const result = await service.executeImport(fixtures.tenantId, 'mig_001');

      expectSuccess(result);
      expect(deps.migrationRepo.update).toHaveBeenCalled();
    });

    it('should reject if migration is not approved', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'extracting' }),
      );

      const result = await service.executeImport(fixtures.tenantId, 'mig_001');
      expectFailure(result);
    });
  });

  // ── STAGE 6: Cutover ──

  describe('executeCutover', () => {
    it('should reject if migration has not completed import', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'importing' }),
      );

      const result = await service.executeCutover(fixtures.tenantId, 'mig_001');
      expectFailure(result);
    });

    it('should execute cutover for a migration in parallel_run state', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'parallel_run', customDomain: 'erudits.com' }),
      );

      const result = await service.executeCutover(fixtures.tenantId, 'mig_001');

      expectSuccess(result);
      // DNS verification is skipped in development environment (mockConfig)
      expect(deps.migrationRepo.update).toHaveBeenCalled();
    });

    it('should execute cutover for cutover_ready state', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'cutover_ready', customDomain: 'erudits.com' }),
      );

      const result = await service.executeCutover(fixtures.tenantId, 'mig_001');
      expectSuccess(result);
    });

    it('should return NOT_FOUND for missing migration', async () => {
      deps.migrationRepo.findById.mockResolvedValue(null);

      const result = await service.executeCutover(fixtures.tenantId, 'nonexistent');
      expectFailure(result, 'NOT_FOUND');
    });
  });

  // ── Rollback ──

  describe('rollback', () => {
    it('should rollback a live migration', async () => {
      deps.migrationRepo.findById.mockResolvedValue(
        fixtures.migration({ status: 'live', customDomain: 'erudits.com' }),
      );

      const result = await service.rollback(fixtures.tenantId, 'mig_001', 'Testing');

      expectSuccess(result);
      expect(deps.migrationRepo.update).toHaveBeenCalled();
    });
  });

  // ── Status Query ──

  describe('getMigrationStatus', () => {
    it('should return migration details', async () => {
      deps.migrationRepo.findById.mockResolvedValue(fixtures.migration());

      const result = await service.getMigrationStatus(fixtures.tenantId, 'mig_001');

      expectSuccess(result);
      if (result.success) {
        expect(result.data.id).toBe('mig_001');
      }
    });

    it('should return NOT_FOUND for missing migration', async () => {
      deps.migrationRepo.findById.mockResolvedValue(null);

      const result = await service.getMigrationStatus(fixtures.tenantId, 'nonexistent');
      expectFailure(result, 'NOT_FOUND');
    });
  });
});
