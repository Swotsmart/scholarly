/**
 * Content Protection Service — Unit Tests
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
} from '../types/content-protection.types';
import type { EventBus, Cache } from '../types/erudits.types';

// ── Mock Factories ──

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
    upload: jest.fn().mockResolvedValue('https://cdn.example.com/file.pdf'),
    getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
  };
}

function createMockWatermarkService(): SteganographicWatermarkService {
  return {
    applyFullWatermark: jest.fn().mockResolvedValue({
      watermarkedBuffer: Buffer.from('watermarked'),
      layersApplied: ['visible_text', 'metadata', 'steganographic'],
      fingerprint: 'abc123',
      fileSizeBytes: 1024,
      processingTimeMs: 50,
    } as WatermarkResult),
    extractFingerprint: jest.fn().mockResolvedValue({
      found: true,
      fingerprint: 'abc123',
      confidence: 0.95,
      techniques: ['micro_typography'],
    } as FingerprintExtractionResult),
    verifyEmbedding: jest.fn().mockResolvedValue(true),
  };
}

function createMockEncryptionService(): ContentEncryptionService {
  return {
    encryptForBuyer: jest.fn().mockResolvedValue({
      encrypted: Buffer.from('encrypted'),
      buyerKeyDerivation: 'derived-key-123',
    }),
    decryptForBuyer: jest.fn().mockResolvedValue(Buffer.from('decrypted')),
    applyPdfPermissions: jest.fn().mockResolvedValue(Buffer.from('restricted')),
    generateResourceKey: jest.fn().mockResolvedValue({
      id: 'key-1', tenantId: 'tenant-1', resourceId: 'res-1',
      masterKeyEncrypted: 'encrypted-key', algorithm: 'aes-256-gcm',
      keyVersion: 1, iv: 'iv-hex', authTag: 'tag-hex', isActive: true,
      createdAt: new Date(), updatedAt: new Date(),
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
    update: jest.fn().mockImplementation((_t: string, rid: string, updates: any) => {
      const existing = store.get(rid);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...updates };
      store.set(rid, updated);
      return Promise.resolve(updated);
    }),
    findByAuthor: jest.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 20, hasMore: false }),
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
    findByLicence: jest.fn().mockImplementation(() =>
      Promise.resolve(Array.from(store.values())),
    ),
    findByFingerprint: jest.fn().mockImplementation((_t: string, _l: string, fp: string) =>
      Promise.resolve(Array.from(store.values()).find(d => d.fingerprint === fp) ?? null),
    ),
    countActiveByLicence: jest.fn().mockImplementation(() =>
      Promise.resolve(Array.from(store.values()).filter(d => d.status === 'active').length),
    ),
    update: jest.fn().mockImplementation((_t: string, id: string, updates: any) => {
      const existing = store.get(id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...updates };
      store.set(id, updated);
      return Promise.resolve(updated);
    }),
    deactivate: jest.fn().mockImplementation((_t: string, id: string) => {
      const d = store.get(id);
      if (d) { d.status = 'deregistered'; store.set(id, d); }
      return Promise.resolve();
    }),
  };
}

function createMockSessionRepo(): ContentSessionRepository {
  const store = new Map<string, ContentSession>();
  return {
    save: jest.fn().mockImplementation((_t: string, s: ContentSession) => {
      store.set(s.id, s);
      return Promise.resolve(s);
    }),
    findById: jest.fn().mockImplementation((_t: string, id: string) =>
      Promise.resolve(store.get(id) ?? null),
    ),
    findActiveByLicence: jest.fn().mockImplementation((_t: string, lid: string) =>
      Promise.resolve(Array.from(store.values()).filter(s => s.licenceId === lid && s.status === 'active')),
    ),
    findActiveByResource: jest.fn().mockResolvedValue([]),
    countActiveByLicence: jest.fn().mockImplementation((_t: string, lid: string) =>
      Promise.resolve(Array.from(store.values()).filter(s => s.licenceId === lid && s.status === 'active').length),
    ),
    update: jest.fn().mockImplementation((_t: string, id: string, updates: any) => {
      const existing = store.get(id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...updates };
      store.set(id, updated);
      return Promise.resolve(updated);
    }),
    terminateExpired: jest.fn().mockResolvedValue(0),
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
    findByResource: jest.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 20, hasMore: false }),
    findByUser: jest.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 20, hasMore: false }),
    countByDeviceAndResource: jest.fn().mockResolvedValue(0),
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
    findById: jest.fn().mockImplementation((_t: string, id: string) =>
      Promise.resolve(store.get(id) ?? null),
    ),
    findByResource: jest.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 20, hasMore: false }),
    findUnresolved: jest.fn().mockResolvedValue({ items: [], total: 0, offset: 0, limit: 20, hasMore: false }),
    update: jest.fn().mockImplementation((_t: string, id: string, updates: any) => {
      const existing = store.get(id);
      if (!existing) throw new Error('Not found');
      const updated = { ...existing, ...updates };
      store.set(id, updated);
      return Promise.resolve(updated);
    }),
  };
}

// ── Test Setup ──

const TENANT = 'erudits-tenant';

function createService() {
  const eventBus = createMockEventBus();
  const cache = createMockCache();
  const fileStorage = createMockFileStorage();
  const watermarkService = createMockWatermarkService();
  const encryptionService = createMockEncryptionService();
  const policyRepo = createMockPolicyRepo();
  const deviceRepo = createMockDeviceRepo();
  const sessionRepo = createMockSessionRepo();
  const downloadRepo = createMockDownloadRepo();
  const encryptionKeyRepo = createMockEncryptionKeyRepo();
  const violationRepo = createMockViolationRepo();

  const service = new ContentProtectionServiceImpl({
    eventBus,
    cache,
    config: { environment: 'test' } as any,
    fileStorage,
    watermarkService,
    encryptionService,
    policyRepo,
    deviceRepo,
    sessionRepo,
    downloadRepo,
    encryptionKeyRepo,
    violationRepo,
  });

  return {
    service, eventBus, cache, fileStorage, watermarkService, encryptionService,
    policyRepo, deviceRepo, sessionRepo, downloadRepo, encryptionKeyRepo, violationRepo,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('ContentProtectionService', () => {

  // ── Policy Management ──

  describe('setPolicy', () => {
    it('should create a new protection policy with defaults', async () => {
      const { service, policyRepo, eventBus } = createService();

      const result = await service.setPolicy(TENANT, 'resource-1', {
        protectionLevel: 'standard',
        deliveryMode: 'download',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.protectionLevel).toBe('standard');
      expect(result.data.deliveryMode).toBe('download');
      expect(result.data.visibleWatermark).toBe(true);
      expect(result.data.maxDevicesIndividual).toBe(3);
      expect(result.data.concurrentSessionLimit).toBe(5);
      expect(policyRepo.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should enable steganographic techniques when steganographicEnabled is true', async () => {
      const { service } = createService();

      const result = await service.setPolicy(TENANT, 'resource-2', {
        protectionLevel: 'standard',
        deliveryMode: 'download',
        steganographicEnabled: true,
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.steganographicEnabled).toBe(true);
      expect(result.data.steganographicTechniques).toEqual(['micro_typography', 'homoglyph']);
    });

    it('should reject premium level with download-only delivery', async () => {
      const { service } = createService();

      const result = await service.setPolicy(TENANT, 'resource-3', {
        protectionLevel: 'premium',
        deliveryMode: 'download',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('encrypted reader');
    });

    it('should reject maximum level with reader-only delivery', async () => {
      const { service } = createService();

      const result = await service.setPolicy(TENANT, 'resource-4', {
        protectionLevel: 'maximum',
        deliveryMode: 'reader_only',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('download encryption');
    });

    it('should accept maximum level with both delivery modes', async () => {
      const { service } = createService();

      const result = await service.setPolicy(TENANT, 'resource-5', {
        protectionLevel: 'maximum',
        deliveryMode: 'both',
      });

      expect(result.success).toBe(true);
    });
  });

  // ── Device Registration ──

  describe('registerDevice', () => {
    it('should register a new device successfully', async () => {
      const { service, deviceRepo, eventBus } = createService();

      const result = await service.registerDevice(TENANT, 'licence-1', 'user-1', {
        fingerprint: 'fp-abc123',
        fingerprintComponents: { platform: 'ios', hardwareId: 'iphone-x' },
        deviceName: "Sarah's iPad",
        platform: 'ios',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.fingerprint).toBe('fp-abc123');
      expect(result.data.deviceName).toBe("Sarah's iPad");
      expect(result.data.status).toBe('active');
      expect(deviceRepo.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should return existing device if already registered and active', async () => {
      const { service, deviceRepo } = createService();

      // Register first
      await service.registerDevice(TENANT, 'licence-1', 'user-1', {
        fingerprint: 'fp-existing',
        fingerprintComponents: { platform: 'web' },
        deviceName: 'Chrome Browser',
        platform: 'web',
      });

      // Register same fingerprint again
      const result = await service.registerDevice(TENANT, 'licence-1', 'user-1', {
        fingerprint: 'fp-existing',
        fingerprintComponents: { platform: 'web' },
        deviceName: 'Chrome Browser Updated',
        platform: 'web',
      });

      expect(result.success).toBe(true);
      // save called once (first registration), update called once (re-registration)
      expect(deviceRepo.save).toHaveBeenCalledTimes(1);
      expect(deviceRepo.update).toHaveBeenCalledTimes(1);
    });

    it('should reject when device limit is reached', async () => {
      const { service, deviceRepo, eventBus } = createService();

      // Mock count to return max
      (deviceRepo.countActiveByLicence as jest.Mock).mockResolvedValue(10);

      const result = await service.registerDevice(TENANT, 'licence-full', 'user-1', {
        fingerprint: 'fp-new-device',
        fingerprintComponents: { platform: 'android' },
        deviceName: 'New Phone',
        platform: 'android',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('Device limit reached');
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('deregisterDevice', () => {
    it('should deregister an active device', async () => {
      const { service, deviceRepo } = createService();

      // Register first
      const regResult = await service.registerDevice(TENANT, 'licence-1', 'user-1', {
        fingerprint: 'fp-to-remove',
        fingerprintComponents: { platform: 'ios' },
        deviceName: 'Old iPad',
        platform: 'ios',
      });
      expect(regResult.success).toBe(true);
      if (!regResult.success) return;

      // Mock findById to return the device
      (deviceRepo.findById as jest.Mock).mockResolvedValue(regResult.data);

      const result = await service.deregisterDevice(
        TENANT, 'licence-1', regResult.data.id, 'user-1',
      );

      expect(result.success).toBe(true);
      expect(deviceRepo.deactivate).toHaveBeenCalled();
    });

    it('should reject deregistering a device from wrong licence', async () => {
      const { service, deviceRepo } = createService();

      (deviceRepo.findById as jest.Mock).mockResolvedValue({
        id: 'dev-1', licenceId: 'licence-other', status: 'active',
      });

      const result = await service.deregisterDevice(TENANT, 'licence-1', 'dev-1', 'user-1');
      expect(result.success).toBe(false);
    });
  });

  // ── Download Protection ──

  describe('prepareDownload', () => {
    it('should prepare a basic download with watermarking', async () => {
      const { service, downloadRepo, eventBus } = createService();

      const result = await service.prepareDownload(TENANT, {
        resourceId: 'res-1',
        fileId: 'file-1',
        userId: 'user-1',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-123',
        institutionName: 'Brighton Grammar School',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.downloadUrl).toBeTruthy();
      expect(result.data.watermarkLayers).toContain('visible_text');
      expect(result.data.watermarkLayers).toContain('metadata');
      expect(result.data.steganographicFingerprint).toBeTruthy();
      expect(result.data.downloadRecordId).toBeTruthy();
      expect(downloadRepo.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should block download when device is not registered for standard+ policy', async () => {
      const { service, deviceRepo } = createService();

      // Set up a standard policy
      await service.setPolicy(TENANT, 'res-protected', {
        protectionLevel: 'standard',
        deliveryMode: 'download',
      });

      // Device not registered — findByFingerprint returns null
      (deviceRepo.findByFingerprint as jest.Mock).mockResolvedValue(null);

      const result = await service.prepareDownload(TENANT, {
        resourceId: 'res-protected',
        fileId: 'file-1',
        userId: 'user-1',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-unknown',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('not registered');
    });

    it('should block download when download limit is reached', async () => {
      const { service, deviceRepo, downloadRepo } = createService();

      // Set up policy with download limit of 2
      await service.setPolicy(TENANT, 'res-limited', {
        protectionLevel: 'standard',
        deliveryMode: 'download',
        downloadLimitPerDevice: 2,
      });

      // Device is registered — mock both findByFingerprint AND update
      const mockDevice = {
        id: 'dev-1', status: 'active', licenceId: 'lic-1', fingerprint: 'fp-reg',
        tenantId: TENANT, lastSeenAt: new Date(),
      };
      (deviceRepo.findByFingerprint as jest.Mock).mockResolvedValue(mockDevice);
      (deviceRepo.update as jest.Mock).mockResolvedValue(mockDevice);

      // Already downloaded twice
      (downloadRepo.countByDeviceAndResource as jest.Mock).mockResolvedValue(2);

      const result = await service.prepareDownload(TENANT, {
        resourceId: 'res-limited',
        fileId: 'file-1',
        userId: 'user-1',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-reg',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('Download limit reached');
    });

    it('should generate a unique steganographic fingerprint per download', async () => {
      const { service } = createService();

      const result1 = await service.prepareDownload(TENANT, {
        resourceId: 'res-1', fileId: 'f-1', userId: 'user-1',
        licenceId: 'lic-1', deviceFingerprint: 'fp-1',
      });
      const result2 = await service.prepareDownload(TENANT, {
        resourceId: 'res-1', fileId: 'f-1', userId: 'user-2',
        licenceId: 'lic-2', deviceFingerprint: 'fp-2',
      });

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      if (!result1.success || !result2.success) return;
      // Different users should produce different fingerprints
      expect(result1.data.steganographicFingerprint).not.toBe(result2.data.steganographicFingerprint);
    });
  });

  // ── Reader Sessions ──

  describe('startSession', () => {
    it('should start a reader session when policy allows', async () => {
      const { service, deviceRepo, sessionRepo, cache, eventBus } = createService();

      // Set up premium policy with reader enabled
      await service.setPolicy(TENANT, 'res-reader', {
        protectionLevel: 'premium',
        deliveryMode: 'reader_only',
        readerEnabled: true,
      });

      // Register a device
      (deviceRepo.findByFingerprint as jest.Mock).mockResolvedValue({
        id: 'dev-1', status: 'active', licenceId: 'lic-1', fingerprint: 'fp-1',
      });

      const result = await service.startSession(TENANT, {
        resourceId: 'res-reader',
        userId: 'user-1',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.status).toBe('active');
      expect(result.data.resourceId).toBe('res-reader');
      expect(sessionRepo.save).toHaveBeenCalledTimes(1);
      expect(cache.set).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should reject when reader is not enabled', async () => {
      const { service } = createService();

      // No policy = reader not enabled
      const result = await service.startSession(TENANT, {
        resourceId: 'res-no-reader',
        userId: 'user-1',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('not enabled');
    });

    it('should reject when concurrent session limit is reached', async () => {
      const { service, deviceRepo, sessionRepo, eventBus } = createService();

      // Set up policy with limit of 1
      await service.setPolicy(TENANT, 'res-limited-sess', {
        protectionLevel: 'premium',
        deliveryMode: 'reader_only',
        readerEnabled: true,
        concurrentSessionLimit: 1,
      });

      (deviceRepo.findByFingerprint as jest.Mock).mockResolvedValue({
        id: 'dev-1', status: 'active', licenceId: 'lic-1', fingerprint: 'fp-1',
      });

      // Already one active session
      (sessionRepo.countActiveByLicence as jest.Mock).mockResolvedValue(1);

      const result = await service.startSession(TENANT, {
        resourceId: 'res-limited-sess',
        userId: 'user-2',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-1',
        ipAddress: '10.0.0.1',
        userAgent: 'Safari',
      });

      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('session limit');
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  describe('heartbeat', () => {
    it('should refresh session TTL', async () => {
      const { service, cache, deviceRepo } = createService();

      // Set up a policy
      await service.setPolicy(TENANT, 'res-hb', {
        protectionLevel: 'premium',
        deliveryMode: 'reader_only',
        readerEnabled: true,
      });

      (deviceRepo.findByFingerprint as jest.Mock).mockResolvedValue({
        id: 'dev-1', status: 'active', licenceId: 'lic-1', fingerprint: 'fp-1',
      });

      // Start session
      const sessionResult = await service.startSession(TENANT, {
        resourceId: 'res-hb',
        userId: 'user-1',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-1',
        ipAddress: '192.168.1.1',
        userAgent: 'Chrome',
      });
      expect(sessionResult.success).toBe(true);
      if (!sessionResult.success) return;

      // Heartbeat
      const hbResult = await service.heartbeat(TENANT, sessionResult.data.id);
      expect(hbResult.success).toBe(true);
      // Cache.set should have been called again for the heartbeat refresh
      expect((cache.set as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(2);
    });

    it('should return not found for expired session', async () => {
      const { service } = createService();

      const result = await service.heartbeat(TENANT, 'nonexistent-session');
      expect(result.success).toBe(false);
    });
  });

  describe('endSession', () => {
    it('should terminate session and free concurrency slot', async () => {
      const { service, cache, sessionRepo, deviceRepo, eventBus } = createService();

      await service.setPolicy(TENANT, 'res-end', {
        protectionLevel: 'premium',
        deliveryMode: 'reader_only',
        readerEnabled: true,
      });

      (deviceRepo.findByFingerprint as jest.Mock).mockResolvedValue({
        id: 'dev-1', status: 'active', licenceId: 'lic-1', fingerprint: 'fp-1',
      });

      const sessionResult = await service.startSession(TENANT, {
        resourceId: 'res-end',
        userId: 'user-1',
        licenceId: 'lic-1',
        deviceFingerprint: 'fp-1',
        ipAddress: '10.0.0.1',
        userAgent: 'Firefox',
      });
      expect(sessionResult.success).toBe(true);
      if (!sessionResult.success) return;

      const endResult = await service.endSession(TENANT, sessionResult.data.id);
      expect(endResult.success).toBe(true);
      expect(cache.del).toHaveBeenCalled();
      expect(sessionRepo.update).toHaveBeenCalled();
      expect(eventBus.publish).toHaveBeenCalled();
    });
  });

  // ── Forensics ──

  describe('reportViolation', () => {
    it('should create a violation report with fingerprint match', async () => {
      const { service, violationRepo, downloadRepo, eventBus } = createService();

      // Set up a download record that matches
      const mockDownloadRecord: Partial<DownloadRecord> = {
        id: 'dl-1',
        tenantId: TENANT,
        userId: 'leaker-user',
        licenceId: 'lic-leaked',
        createdAt: new Date(),
        steganographicFingerprint: 'abc123',
      };
      (downloadRepo.findByFingerprint as jest.Mock).mockResolvedValue(mockDownloadRecord);
      (downloadRepo.findById as jest.Mock).mockResolvedValue(mockDownloadRecord);

      const result = await service.reportViolation(TENANT, {
        resourceId: 'res-leaked',
        sourceUrl: 'https://pirate-site.com/atar-pack.pdf',
        sourceDescription: 'Found our ATAR pack on a sharing site',
        reportedBy: 'erudits-author',
        fileBuffer: Buffer.from('leaked-file-content'),
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.detectedFingerprint).toBe('abc123');
      expect(result.data.matchConfidence).toBe(0.95);
      expect(result.data.matchedDownloadRecordId).toBe('dl-1');
      expect(result.data.matchedUserId).toBe('leaker-user');
      expect(result.data.severity).toBe('high'); // >0.9 confidence
      expect(violationRepo.save).toHaveBeenCalledTimes(1);
      expect(eventBus.publish).toHaveBeenCalled();
    });

    it('should set critical severity for torrent/telegram sources', async () => {
      const { service, watermarkService } = createService();

      // No fingerprint match
      (watermarkService.extractFingerprint as jest.Mock).mockResolvedValue({
        found: false, confidence: 0, techniques: [],
      });

      const result = await service.reportViolation(TENANT, {
        resourceId: 'res-pirated',
        sourceUrl: 'https://telegram.me/pirated-atar',
        sourceDescription: 'Found on Telegram channel',
        reportedBy: 'erudits-author',
      });

      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data.severity).toBe('critical');
    });
  });

  // ── Analytics ──

  describe('getProtectionSummary', () => {
    it('should return a summary structure', async () => {
      const { service } = createService();

      const result = await service.getProtectionSummary(TENANT, 'author-1');
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.data).toHaveProperty('totalProtectedResources');
      expect(result.data).toHaveProperty('protectionCoverage');
      expect(result.data.protectionCoverage).toHaveProperty('basic');
      expect(result.data.protectionCoverage).toHaveProperty('maximum');
    });
  });

  // ── Rate Limiting ──

  describe('requestPage — rate limiting', () => {
    function seedSessionInCache(cache: Cache, sessionId: string) {
      const now = new Date();
      const session: ContentSession = {
        id: sessionId,
        tenantId: TENANT,
        resourceId: 'res-book-1',
        licenceId: 'lic-1',
        userId: 'user-1',
        deviceFingerprint: 'device-abc',
        status: 'active',
        startedAt: now,
        lastHeartbeatAt: now,
        expiresAt: new Date(Date.now() + 3600000),
        pagesViewed: [],
        totalPageViews: 0,
        peakConcurrentPages: 0,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        createdAt: now,
        updatedAt: now,
      };
      (cache.set as jest.Mock).mockImplementation((key: string, value: string) => {
        const store = new Map<string, string>();
        store.set(key, value);
        return Promise.resolve();
      });
      // Seed the session in cache
      const cacheKey = `erudits:protection:session:${sessionId}`;
      (cache.get as jest.Mock).mockImplementation((key: string) => {
        if (key === cacheKey) return Promise.resolve(JSON.stringify(session));
        return Promise.resolve(null);
      });
    }

    it('should allow page requests within rate limit', async () => {
      const { service, cache } = createService();
      seedSessionInCache(cache, 'sess-rate-1');

      // incr returns 1 (under limit of 30)
      (cache.incr as jest.Mock).mockResolvedValue(1);

      const result = await service.requestPage(TENANT, 'sess-rate-1', 1);
      expect(result.success).toBe(true);
    });

    it('should reject page requests exceeding rate limit', async () => {
      const { service, cache } = createService();
      seedSessionInCache(cache, 'sess-rate-2');

      // incr returns 31 (over default limit of 30)
      (cache.incr as jest.Mock).mockResolvedValue(31);

      const result = await service.requestPage(TENANT, 'sess-rate-2', 1);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.message).toContain('Rate limit exceeded');
    });

    it('should use atomic Redis INCR for thread-safe counting', async () => {
      const { service, cache } = createService();
      seedSessionInCache(cache, 'sess-rate-3');
      (cache.incr as jest.Mock).mockResolvedValue(5);

      await service.requestPage(TENANT, 'sess-rate-3', 1);

      // Verify incr was called with the rate limit key and 60s TTL
      expect(cache.incr).toHaveBeenCalledWith(
        'erudits:protection:ratelimit:sess-rate-3',
        60,
      );
    });

    it('should return not found for expired session', async () => {
      const { service } = createService();
      // No session seeded — cache returns null

      const result = await service.requestPage(TENANT, 'nonexistent', 1);
      expect(result.success).toBe(false);
      if (result.success) return;
      expect(result.error.code).toBe('NOT_FOUND');
    });
  });
});
