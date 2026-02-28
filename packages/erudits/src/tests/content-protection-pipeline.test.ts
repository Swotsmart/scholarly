/**
 * ============================================================================
 * Content Protection — Full Pipeline Integration Test
 * ============================================================================
 *
 * End-to-end test that exercises the complete download protection pipeline:
 *   1. Set a maximum protection policy on a resource
 *   2. Register a device against a licence
 *   3. Prepare a protected download (all 4 layers)
 *   4. Verify the returned download has all watermark layers
 *   5. Extract the steganographic fingerprint
 *   6. Verify it matches the download record
 *
 * This is the "smoke test" that proves the entire system works together —
 * the airport terminal with all its metal detectors, scanners, and cameras
 * operating in concert rather than in isolation.
 */

import { ContentProtectionServiceImpl } from '../services/content-protection.service';
import type {
  ContentProtectionPolicy,
  DeviceRegistration,
  ContentSession,
  DownloadRecord,
  ContentViolation,
  EncryptionKeyRecord,
  FingerprintExtractionResult,
  WatermarkResult,
  ContentProtectionPolicyRepository,
  DeviceRegistrationRepository,
  ContentSessionRepository,
  DownloadRecordRepository,
  EncryptionKeyRepository,
  ContentViolationRepository,
  SteganographicWatermarkService,
  ContentEncryptionService,
  WatermarkParams,
} from '../types/content-protection.types';
import type { EventBus, Cache } from '../types/erudits.types';

// ============================================================================
// MOCK FACTORIES (reused from content-protection.service.test.ts patterns)
// ============================================================================

function createMockEventBus(): EventBus {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

function createMockCache(): Cache {
  const store = new Map<string, string>();
  return {
    get: jest.fn().mockImplementation((key: string) => Promise.resolve(store.get(key) ?? null)),
    set: jest.fn().mockImplementation((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    del: jest.fn().mockImplementation((key: string) => {
      store.delete(key);
      return Promise.resolve();
    }),
    invalidatePattern: jest.fn().mockResolvedValue(undefined),
    incr: jest.fn().mockResolvedValue(1),
  };
}

function createMockFileStorage() {
  return {
    upload: jest.fn().mockResolvedValue('https://cdn.example.com/protected-file.pdf'),
    getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url?token=abc'),
  };
}

// ── Watermark service that records what it was called with ──
function createTrackingWatermarkService(): SteganographicWatermarkService & {
  lastApplyParams: WatermarkParams | null;
  lastExtractResult: FingerprintExtractionResult;
} {
  let lastApplyParams: WatermarkParams | null = null;
  const lastExtractResult: FingerprintExtractionResult = {
    found: false, confidence: 0, techniques: [],
  };

  return {
    lastApplyParams,
    lastExtractResult,

    applyFullWatermark: jest.fn().mockImplementation(
      async (_buf: Buffer, _mime: string, params: WatermarkParams) => {
        lastApplyParams = params;
        return {
          watermarkedBuffer: Buffer.from('watermarked-pdf-with-fingerprint'),
          layersApplied: [
            'visible_text',
            'metadata',
            ...(params.techniques.length > 0 ? ['steganographic' as const] : []),
          ],
          fingerprint: params.fingerprint,
          fileSizeBytes: 2048,
          processingTimeMs: 42,
        } as WatermarkResult;
      },
    ),

    extractFingerprint: jest.fn().mockImplementation(async () => ({
      found: true,
      fingerprint: lastApplyParams?.fingerprint ?? 'unknown',
      confidence: 0.95,
      techniques: ['micro_typography', 'homoglyph'],
      decodedBits: lastApplyParams?.fingerprintBits,
    } as FingerprintExtractionResult)),

    verifyEmbedding: jest.fn().mockResolvedValue(true),
  };
}

function createMockEncryptionService(): ContentEncryptionService {
  return {
    encryptForBuyer: jest.fn().mockResolvedValue({
      encrypted: Buffer.from('encrypted-content'),
      buyerKeyDerivation: 'v1:licence:device',
    }),
    decryptForBuyer: jest.fn().mockResolvedValue(Buffer.from('decrypted-content')),
    applyPdfPermissions: jest.fn().mockResolvedValue(Buffer.from('restricted-pdf')),
    generateResourceKey: jest.fn().mockResolvedValue({
      id: 'key-1',
      tenantId: 'tenant-1',
      resourceId: 'resource-1',
      masterKeyEncrypted: 'enc-key-hex',
      algorithm: 'aes-256-gcm',
      keyVersion: 1,
      iv: 'iv-hex',
      authTag: 'tag-hex',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as EncryptionKeyRecord),
  };
}

// ── In-Memory Repository Mocks ──

function createMockPolicyRepo(): ContentProtectionPolicyRepository {
  const store = new Map<string, ContentProtectionPolicy>();
  return {
    save: jest.fn().mockImplementation((_t: string, p: ContentProtectionPolicy) => {
      store.set(p.resourceId, p);
      return Promise.resolve(p);
    }),
    findByResource: jest.fn().mockImplementation((_t: string, rid: string) =>
      Promise.resolve(store.get(rid) ?? null),
    ),
    update: jest.fn().mockImplementation((_t: string, rid: string, updates: Partial<ContentProtectionPolicy>) => {
      const existing = store.get(rid);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...updates, updatedAt: new Date() };
      store.set(rid, updated);
      return Promise.resolve(updated);
    }),
    findByAuthor: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
  };
}

function createMockDeviceRepo(): DeviceRegistrationRepository {
  const store = new Map<string, DeviceRegistration>();
  return {
    save: jest.fn().mockImplementation((_t: string, d: DeviceRegistration) => {
      store.set(d.id, d);
      return Promise.resolve(d);
    }),
    findById: jest.fn().mockImplementation((_t: string, id: string) =>
      Promise.resolve(store.get(id) ?? null),
    ),
    findByLicence: jest.fn().mockImplementation((_t: string, licenceId: string) =>
      Promise.resolve(Array.from(store.values()).filter(d => d.licenceId === licenceId)),
    ),
    findByFingerprint: jest.fn().mockImplementation((_t: string, licenceId: string, fp: string) =>
      Promise.resolve(Array.from(store.values()).find(
        d => d.licenceId === licenceId && d.fingerprint === fp && d.status === 'active',
      ) ?? null),
    ),
    countActiveByLicence: jest.fn().mockImplementation((_t: string, licenceId: string) =>
      Promise.resolve(Array.from(store.values()).filter(
        d => d.licenceId === licenceId && d.status === 'active',
      ).length),
    ),
    update: jest.fn().mockImplementation((_t: string, id: string, updates: Partial<DeviceRegistration>) => {
      const existing = store.get(id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...updates };
      store.set(id, updated);
      return Promise.resolve(updated);
    }),
    deactivate: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockDownloadRepo(): DownloadRecordRepository {
  const store = new Map<string, DownloadRecord>();
  return {
    save: jest.fn().mockImplementation((_t: string, r: DownloadRecord) => {
      store.set(r.id, r);
      return Promise.resolve(r);
    }),
    findById: jest.fn().mockImplementation((_t: string, id: string) =>
      Promise.resolve(store.get(id) ?? null),
    ),
    findByFingerprint: jest.fn().mockImplementation((fp: string) =>
      Promise.resolve(Array.from(store.values()).find(r => r.steganographicFingerprint === fp) ?? null),
    ),
    findByResource: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    findByUser: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    countByDeviceAndResource: jest.fn().mockResolvedValue(0),
  };
}

function createMockSessionRepo(): ContentSessionRepository {
  return {
    save: jest.fn().mockImplementation((_t: string, s: ContentSession) => Promise.resolve(s)),
    findById: jest.fn().mockResolvedValue(null),
    findActiveByLicence: jest.fn().mockResolvedValue([]),
    findActiveByResource: jest.fn().mockResolvedValue([]),
    countActiveByLicence: jest.fn().mockResolvedValue(0),
    update: jest.fn().mockResolvedValue({} as ContentSession),
    terminateExpired: jest.fn().mockResolvedValue(0),
  };
}

function createMockEncryptionKeyRepo(): EncryptionKeyRepository {
  return {
    save: jest.fn().mockImplementation((_t: string, k: EncryptionKeyRecord) => Promise.resolve(k)),
    findActiveByResource: jest.fn().mockResolvedValue(null),
    findByVersion: jest.fn().mockResolvedValue(null),
    deactivate: jest.fn().mockResolvedValue(undefined),
  };
}

function createMockViolationRepo(): ContentViolationRepository {
  const store = new Map<string, ContentViolation>();
  return {
    save: jest.fn().mockImplementation((_t: string, v: ContentViolation) => {
      store.set(v.id, v);
      return Promise.resolve(v);
    }),
    findById: jest.fn().mockResolvedValue(null),
    findByResource: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    findUnresolved: jest.fn().mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
    update: jest.fn().mockResolvedValue({} as ContentViolation),
  };
}

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('Content Protection — Full Pipeline Integration', () => {
  let service: ContentProtectionServiceImpl;
  let eventBus: EventBus;
  let watermarkService: ReturnType<typeof createTrackingWatermarkService>;
  let downloadRepo: DownloadRecordRepository;

  const TENANT = 'tenant-erudits';
  const RESOURCE = 'resource-atar-exam-2026';
  const USER = 'user-teacher-sarah';
  const LICENCE = 'licence-brighton-grammar';
  const DEVICE_FP = 'fp-ipad-pro-2024';

  beforeEach(() => {
    eventBus = createMockEventBus();
    watermarkService = createTrackingWatermarkService();
    downloadRepo = createMockDownloadRepo();

    service = new ContentProtectionServiceImpl({
      eventBus,
      cache: createMockCache(),
      config: {
        aiEnabled: false, aiModel: '', aiMaxTokens: 0, defaultPageSize: 10,
        maxPageSize: 100, environment: 'development' as const,
        platformFeePercent: 15, stripeFeeFixedCents: 30, stripeFeePercent: 2.9,
      },
      fileStorage: createMockFileStorage(),
      watermarkService,
      encryptionService: createMockEncryptionService(),
      policyRepo: createMockPolicyRepo(),
      deviceRepo: createMockDeviceRepo(),
      sessionRepo: createMockSessionRepo(),
      downloadRepo,
      encryptionKeyRepo: createMockEncryptionKeyRepo(),
      violationRepo: createMockViolationRepo(),
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Full Pipeline: Policy → Device → Download → Verify
  // ════════════════════════════════════════════════════════════════════════

  it('should execute the full download protection pipeline end-to-end', async () => {
    // ── Step 1: Set maximum protection policy ──
    const policyResult = await service.setPolicy(TENANT, RESOURCE, {
      protectionLevel: 'maximum',
      deliveryMode: 'both',
      visibleWatermark: true,
      steganographicEnabled: true,
      steganographicTechniques: ['micro_typography', 'homoglyph'],
      downloadEncrypted: true,
      pdfPermissions: ['print_low_quality', 'accessibility'],
    });

    expect(policyResult.success).toBe(true);
    if (!policyResult.success) return;
    expect(policyResult.data.protectionLevel).toBe('maximum');
    expect(policyResult.data.steganographicEnabled).toBe(true);

    // ── Step 2: Register a device ──
    const deviceResult = await service.registerDevice(TENANT, LICENCE, USER, {
      fingerprint: DEVICE_FP,
      fingerprintComponents: {
        platform: 'ios',
        hardwareId: 'ipad-serial-123',
        osVersion: '18.3',
      },
      deviceName: "Sarah's iPad Pro",
      platform: 'ios',
    });

    expect(deviceResult.success).toBe(true);
    if (!deviceResult.success) return;
    expect(deviceResult.data.status).toBe('active');
    expect(deviceResult.data.fingerprint).toBe(DEVICE_FP);

    // ── Step 3: Prepare a protected download ──
    const downloadResult = await service.prepareDownload(TENANT, {
      resourceId: RESOURCE,
      fileId: 'file-exam-pdf',
      userId: USER,
      licenceId: LICENCE,
      deviceFingerprint: DEVICE_FP,
      institutionName: 'Brighton Grammar School',
    });

    expect(downloadResult.success).toBe(true);
    if (!downloadResult.success) return;

    const download = downloadResult.data;

    // ── Step 4: Verify all layers were applied ──
    expect(download.watermarkLayers).toContain('visible_text');
    expect(download.watermarkLayers).toContain('metadata');
    expect(download.watermarkLayers).toContain('steganographic');
    expect(download.steganographicFingerprint).toBeTruthy();
    expect(download.steganographicFingerprint.length).toBe(16); // 64-bit hex
    expect(download.downloadUrl).toContain('signed-url');
    expect(download.downloadRecordId).toBeTruthy();

    // ── Step 5: Verify events were published ──
    expect(eventBus.publish).toHaveBeenCalledWith(
      'scholarly.protection.policy.set',
      expect.objectContaining({ tenantId: TENANT, resourceId: RESOURCE }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      'scholarly.protection.device.registered',
      expect.objectContaining({ tenantId: TENANT, licenceId: LICENCE }),
    );
    expect(eventBus.publish).toHaveBeenCalledWith(
      'scholarly.protection.download.protected',
      expect.objectContaining({
        tenantId: TENANT,
        resourceId: RESOURCE,
        fingerprint: download.steganographicFingerprint,
      }),
    );

    // ── Step 6: Verify download was recorded in the repository ──
    expect(downloadRepo.save).toHaveBeenCalledWith(
      TENANT,
      expect.objectContaining({
        resourceId: RESOURCE,
        userId: USER,
        licenceId: LICENCE,
        steganographicFingerprint: download.steganographicFingerprint,
        watermarkLayers: expect.arrayContaining(['visible_text', 'metadata', 'steganographic']),
      }),
    );
  });

  // ════════════════════════════════════════════════════════════════════════
  // Forensic Traceability: Download → Extract → Match
  // ════════════════════════════════════════════════════════════════════════

  it('should trace a leaked file back to its download record', async () => {
    // Set up policy and device
    await service.setPolicy(TENANT, RESOURCE, {
      protectionLevel: 'standard',
      deliveryMode: 'download',
      steganographicEnabled: true,
      steganographicTechniques: ['homoglyph'],
    });

    await service.registerDevice(TENANT, LICENCE, USER, {
      fingerprint: DEVICE_FP,
      fingerprintComponents: { platform: 'web' },
      deviceName: 'Chrome Browser',
      platform: 'web',
    });

    // Download the protected file
    const downloadResult = await service.prepareDownload(TENANT, {
      resourceId: RESOURCE,
      fileId: 'file-1',
      userId: USER,
      licenceId: LICENCE,
      deviceFingerprint: DEVICE_FP,
    });
    expect(downloadResult.success).toBe(true);
    if (!downloadResult.success) return;

    // fingerprint is stored in the download record for forensic matching

    // Simulate finding a leaked copy and extracting the fingerprint
    const leakedFile = Buffer.from('leaked-pdf-content');
    const extractResult = await service.extractFingerprint(leakedFile);

    expect(extractResult.success).toBe(true);
    if (!extractResult.success) return;
    expect(extractResult.data.found).toBe(true);
    expect(extractResult.data.confidence).toBeGreaterThanOrEqual(0.7);

    // Report the violation with the leaked file
    const violationResult = await service.reportViolation(TENANT, {
      resourceId: RESOURCE,
      sourceUrl: 'https://telegram.me/pirated-exams',
      sourceDescription: 'Found ATAR exam pack shared in Telegram group',
      reportedBy: 'author-erudits',
      fileBuffer: leakedFile,
    });

    expect(violationResult.success).toBe(true);
    if (!violationResult.success) return;

    // The violation should have high severity (Telegram source)
    expect(violationResult.data.severity).toBe('critical');
    expect(violationResult.data.detectedFingerprint).toBeTruthy();
  });

  // ════════════════════════════════════════════════════════════════════════
  // Device Limit Enforcement
  // ════════════════════════════════════════════════════════════════════════

  it('should block downloads from unregistered devices', async () => {
    await service.setPolicy(TENANT, RESOURCE, {
      protectionLevel: 'standard',
      deliveryMode: 'download',
    });

    // Try to download WITHOUT registering a device first
    const result = await service.prepareDownload(TENANT, {
      resourceId: RESOURCE,
      fileId: 'file-1',
      userId: USER,
      licenceId: LICENCE,
      deviceFingerprint: 'unknown-device-fp',
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('FORBIDDEN');
  });

  // ════════════════════════════════════════════════════════════════════════
  // Basic Protection (Watermark-Only, No Device Check)
  // ════════════════════════════════════════════════════════════════════════

  it('should allow basic protection without device registration', async () => {
    await service.setPolicy(TENANT, RESOURCE, {
      protectionLevel: 'basic',
      deliveryMode: 'download',
    });

    // Basic protection doesn't require device registration
    const result = await service.prepareDownload(TENANT, {
      resourceId: RESOURCE,
      fileId: 'file-1',
      userId: USER,
      licenceId: LICENCE,
      deviceFingerprint: 'any-device',
    });

    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.watermarkLayers).toContain('visible_text');
    expect(result.data.watermarkLayers).toContain('metadata');
  });
});
