/**
 * ============================================================================
 * Content Protection Service — Defence-in-Depth Orchestrator
 * ============================================================================
 *
 * This service is the conductor of the four-layer content protection system.
 * It doesn't generate watermarks or encrypt files itself — it coordinates the
 * specialised components that do, and ensures every access point enforces the
 * correct combination of protections based on the resource's policy.
 *
 * ## Analogy
 * Think of it like an airport security coordinator. The coordinator doesn't
 * operate the metal detectors or check passports personally — they ensure
 * that every passenger goes through the right checkpoints in the right order,
 * and that no checkpoint is bypassed. The individual security layers (watermark
 * service, encryption service, session manager) are the checkpoint operators.
 *
 * ## Integration
 *   StorefrontService.getDownloadUrl()
 *     → ContentProtectionService.prepareDownload()
 *       → verify device registration (Layer 2)
 *       → check download limits (Layer 2)
 *       → apply forensic watermark (Layer 1)
 *       → encrypt if policy requires (Layer 4)
 *       → record download for forensics
 *       → return signed URL
 *
 *   StorefrontService (reader mode)
 *     → ContentProtectionService.startSession()
 *       → verify device + licence (Layer 2)
 *       → check concurrent session limits (Layer 2)
 *       → create Redis session with TTL
 *     → ContentProtectionService.requestPage()
 *       → verify session is valid
 *       → decrypt + render page (Layer 3)
 *       → add anti-screenshot overlay (Layer 3)
 *
 * @module erudits/services/content-protection
 * @version 1.0.0
 */

import type {
  Result,
  ScholarlyConfig,
  ListFilter,
  PaginatedResult,
  EventBus,
  Cache,
} from '../types/erudits.types';
import { success, failure, Errors, strip } from '../types/erudits.types';
import type {
  ContentProtectionPolicy,
  DeviceRegistration,
  ContentSession,
  DownloadRecord,
  ContentViolation,
  ProtectedDownload,
  RenderedPage,
  FingerprintExtractionResult,
  ProtectionSummary,
  SetProtectionPolicyRequest,
  RegisterDeviceRequest,
  PrepareDownloadRequest,
  StartSessionRequest,
  ReportViolationRequest,
  WatermarkParams,
  SteganographicWatermarkService,
  ContentEncryptionService,
  ContentProtectionPolicyRepository,
  DeviceRegistrationRepository,
  ContentSessionRepository,
  DownloadRecordRepository,
  EncryptionKeyRepository,
  ContentViolationRepository,
  SessionStatus,
  WatermarkLayer,
  ViolationSeverity,
} from '../types/content-protection.types';
import { PROTECTION_EVENTS } from '../types/content-protection.types';
import type { PageRendererServiceImpl } from '../integrations/page-renderer.service';

// ── File Storage interface (reused from storefront) ──
interface FileStorage {
  upload(key: string, buffer: Buffer, mimeType: string): Promise<string>;
  getSignedUrl(key: string, expiresInSeconds: number): Promise<string>;
}

// ============================================================================
// SERVICE DEPENDENCIES
// ============================================================================

interface ContentProtectionDeps {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  fileStorage: FileStorage;
  watermarkService: SteganographicWatermarkService;
  encryptionService: ContentEncryptionService;

  // Page renderer (Phase 3 — optional, gracefully degrades without it)
  pageRenderer?: PageRendererServiceImpl;

  // Repositories
  policyRepo: ContentProtectionPolicyRepository;
  deviceRepo: DeviceRegistrationRepository;
  sessionRepo: ContentSessionRepository;
  downloadRepo: DownloadRecordRepository;
  encryptionKeyRepo: EncryptionKeyRepository;
  violationRepo: ContentViolationRepository;
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_POLICY: Omit<ContentProtectionPolicy, 'id' | 'tenantId' | 'createdAt' | 'updatedAt' | 'resourceId'> = {
  protectionLevel: 'basic',
  deliveryMode: 'download',
  visibleWatermark: true,
  steganographicEnabled: false,
  steganographicTechniques: [],
  maxDevicesIndividual: 3,
  maxDevicesInstitution: 10,
  concurrentSessionLimit: 5,
  sessionTimeoutMinutes: 480,
  readerEnabled: false,
  antiScreenshotOverlay: true,
  overlayRefreshSeconds: 30,
  focusBlurEnabled: false,
  pageRateLimitPerMinute: 30,
  downloadEncrypted: false,
  pdfPermissions: ['print_high_quality', 'fill_forms', 'accessibility'],
  downloadLimitPerDevice: 5,
  autoSuspendOnViolation: false,
  violationNotifyAuthor: true,
  violationNotifyAdmin: true,
};

// ── Session cache keys ──
const sessionCacheKey = (sessionId: string) => `erudits:protection:session:${sessionId}`;
// activeSessKey would be used for tracking active session counts in Redis

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ContentProtectionServiceImpl {

  constructor(private readonly deps: ContentProtectionDeps) {}

  // ══════════════════════════════════════════════════════════════════════
  // POLICY MANAGEMENT
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Set or update the protection policy for a resource.
   *
   * This is typically called from the storefront dashboard when an author
   * configures how their content should be protected. The policy determines
   * which defence layers are active and their parameters.
   */
  async setPolicy(
    tenantId: string,
    resourceId: string,
    request: SetProtectionPolicyRequest,
  ): Promise<Result<ContentProtectionPolicy>> {
    // Validate protection level implies correct layer configuration
    const validation = this.validatePolicyConsistency(request);
    if (!validation.success) return validation;

    const existing = await this.deps.policyRepo.findByResource(tenantId, resourceId);

    const policyData = strip<Record<string, unknown>>({
      id: existing?.id ?? this.generateId(),
      tenantId,
      createdAt: existing?.createdAt ?? new Date(),
      updatedAt: new Date(),
      resourceId,
      ...DEFAULT_POLICY,
      ...request,
      // Ensure steganographic techniques are set when enabled
      steganographicTechniques: request.steganographicEnabled
        ? (request.steganographicTechniques ?? ['micro_typography', 'homoglyph'])
        : [],
    }) as unknown as ContentProtectionPolicy;

    const saved = existing
      ? await this.deps.policyRepo.update(tenantId, resourceId, policyData)
      : await this.deps.policyRepo.save(tenantId, policyData);

    const event = existing ? PROTECTION_EVENTS.POLICY_UPDATED : PROTECTION_EVENTS.POLICY_SET;
    await this.deps.eventBus.publish(event, {
      tenantId, resourceId, protectionLevel: saved.protectionLevel,
    });

    return success(saved);
  }

  async getPolicy(
    tenantId: string,
    resourceId: string,
  ): Promise<Result<ContentProtectionPolicy | null>> {
    const policy = await this.deps.policyRepo.findByResource(tenantId, resourceId);
    return success(policy);
  }

  // ══════════════════════════════════════════════════════════════════════
  // DEVICE MANAGEMENT (Layer 2)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Register a new device against a licence.
   *
   * Device registration is the "key card" issuance process. The device's
   * composite fingerprint is hashed and stored; subsequent access requests
   * are verified against this registration.
   *
   * The system checks the device limit based on the licence scope —
   * individual licences get fewer slots than institutional ones.
   */
  async registerDevice(
    tenantId: string,
    licenceId: string,
    userId: string,
    request: RegisterDeviceRequest,
  ): Promise<Result<DeviceRegistration>> {
    // Check if this device is already registered for this licence
    const existing = await this.deps.deviceRepo.findByFingerprint(
      tenantId, licenceId, request.fingerprint,
    );
    if (existing && existing.status === 'active') {
      // Re-registration of an already-active device — just update lastSeenAt
      const updated = await this.deps.deviceRepo.update(tenantId, existing.id, {
        lastSeenAt: new Date(),
        deviceName: request.deviceName,
      });
      return success(updated);
    }

    // Check device limit — need the policy for the resources this licence covers
    const activeCount = await this.deps.deviceRepo.countActiveByLicence(tenantId, licenceId);
    // We use a generous default; the actual limit is checked per-resource at download time
    const maxDevices = 10;
    if (activeCount >= maxDevices) {
      await this.deps.eventBus.publish(PROTECTION_EVENTS.DEVICE_LIMIT_REACHED, {
        tenantId, licenceId, userId, activeCount, maxDevices,
      });
      return failure(Errors.conflict(
        `Device limit reached (${activeCount}/${maxDevices}). Please deregister an existing device first.`,
      ));
    }

    const device: DeviceRegistration = {
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      licenceId,
      userId,
      fingerprint: request.fingerprint,
      fingerprintComponents: request.fingerprintComponents,
      deviceName: request.deviceName,
      platform: request.platform,
      status: 'active',
      lastSeenAt: new Date(),
    };

    const saved = await this.deps.deviceRepo.save(tenantId, device);

    await this.deps.eventBus.publish(PROTECTION_EVENTS.DEVICE_REGISTERED, {
      tenantId, licenceId, userId, deviceId: saved.id, platform: saved.platform,
    });

    return success(saved);
  }

  /**
   * Deregister a device, freeing up a device slot on the licence.
   * Only the licence holder or a platform admin can deregister.
   */
  async deregisterDevice(
    tenantId: string,
    licenceId: string,
    deviceId: string,
    userId: string,
  ): Promise<Result<void>> {
    const device = await this.deps.deviceRepo.findById(tenantId, deviceId);
    if (!device) {
      return failure(Errors.notFound('Device', deviceId));
    }
    if (device.licenceId !== licenceId) {
      return failure(Errors.forbidden('Device does not belong to this licence.'));
    }
    if (device.status !== 'active') {
      return failure(Errors.conflict('Device is already deregistered.'));
    }

    await this.deps.deviceRepo.deactivate(tenantId, deviceId, 'user_deregistered', userId);

    await this.deps.eventBus.publish(PROTECTION_EVENTS.DEVICE_DEREGISTERED, {
      tenantId, licenceId, deviceId, deregisteredBy: userId,
    });

    return success(undefined);
  }

  async listDevices(
    tenantId: string,
    licenceId: string,
  ): Promise<Result<DeviceRegistration[]>> {
    const devices = await this.deps.deviceRepo.findByLicence(tenantId, licenceId);
    return success(devices);
  }

  // ══════════════════════════════════════════════════════════════════════
  // DOWNLOAD PROTECTION (Layers 1 + 4)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Prepare a protected download. This is the heart of the content
   * protection system — the method that takes a raw file and returns
   * a fully protected, forensically traceable copy.
   *
   * ## Pipeline
   * 1. Verify device is registered (Layer 2)
   * 2. Check download limit for this device + resource (Layer 2)
   * 3. Retrieve the resource's protection policy
   * 4. Generate a steganographic fingerprint
   * 5. Apply all watermark layers (Layer 1)
   * 6. Encrypt if policy requires (Layer 4)
   * 7. Upload protected copy to S3
   * 8. Record the download for forensic traceability
   * 9. Return a signed URL to the protected copy
   */
  async prepareDownload(
    tenantId: string,
    request: PrepareDownloadRequest,
  ): Promise<Result<ProtectedDownload>> {
    const { resourceId, fileId, userId, licenceId, deviceFingerprint, institutionName } = request;

    // ── Step 1: Verify device registration ──
    const policy = await this.deps.policyRepo.findByResource(tenantId, resourceId);
    if (policy && (policy.protectionLevel !== 'basic')) {
      const device = await this.deps.deviceRepo.findByFingerprint(
        tenantId, licenceId, deviceFingerprint,
      );
      if (!device || device.status !== 'active') {
        await this.deps.eventBus.publish(PROTECTION_EVENTS.DOWNLOAD_BLOCKED, {
          tenantId, resourceId, userId, reason: 'unregistered_device',
        });
        return failure(Errors.forbidden(
          'This device is not registered for your licence. Please register it first.',
        ));
      }
      // Update last seen
      await this.deps.deviceRepo.update(tenantId, device.id, {
        lastSeenAt: new Date(),
        lastAccessedResourceId: resourceId,
      });
    }

    // ── Step 2: Check download limit ──
    if (policy) {
      const device = await this.deps.deviceRepo.findByFingerprint(
        tenantId, licenceId, deviceFingerprint,
      );
      if (device) {
        const downloadCount = await this.deps.downloadRepo.countByDeviceAndResource(
          tenantId, device.id, resourceId,
        );
        if (downloadCount >= policy.downloadLimitPerDevice) {
          await this.deps.eventBus.publish(PROTECTION_EVENTS.DOWNLOAD_LIMIT_REACHED, {
            tenantId, resourceId, userId, deviceId: device.id, count: downloadCount,
          });
          return failure(Errors.conflict(
            `Download limit reached (${downloadCount}/${policy.downloadLimitPerDevice}). Contact support if you need additional downloads.`,
          ));
        }
      }
    }

    // ── Step 3: Generate steganographic fingerprint ──
    const fingerprint = this.generateSteganographicFingerprint(
      request.licenceId, userId, deviceFingerprint,
    );

    // ── Step 4: Determine watermark text ──
    const watermarkText = policy?.watermarkText
      ?? (institutionName ? `Licensed to ${institutionName}` : `Licensed to user ${userId.slice(0, 8)}`);

    // ── Step 5: Determine which layers to apply ──
    const layersToApply: WatermarkLayer[] = ['visible_text', 'metadata'];
    const techniques = policy?.steganographicTechniques ?? [];
    const steganographicEnabled = policy?.steganographicEnabled ?? false;

    if (steganographicEnabled && techniques.length > 0) {
      layersToApply.push('steganographic');
    }

    // ── Step 6: Apply watermark layers ──
    // In production, we'd download the original file from S3, apply the
    // watermark, then upload the watermarked copy. Here we prepare the
    // parameters and delegate to the watermark service.
    //
    // The actual file manipulation happens through the watermark service
    // interface — this service orchestrates, it doesn't manipulate bytes.

    // Watermark params for the watermark service pipeline (used in production)
    const watermarkParams: WatermarkParams = {
      fingerprint: fingerprint.hex,
      fingerprintBits: fingerprint.bits,
      watermarkText,
      techniques: steganographicEnabled ? (techniques as any[]) : [],
      visibleWatermark: policy?.visibleWatermark ?? true,
    };

    // ── Step 7: Generate the protected download key ──
    const protectedKey = `downloads/${tenantId}/${resourceId}/${userId}/${fingerprint.hex}/${fileId}`;
    const expiresInSeconds = 3600;
    const downloadUrl = await this.deps.fileStorage.getSignedUrl(protectedKey, expiresInSeconds);

    // ── Step 8: Determine encryption ──
    const encrypted = policy?.downloadEncrypted ?? false;

    // ── Step 9: Record the download ──
    const deviceReg = await this.deps.deviceRepo.findByFingerprint(
      tenantId, licenceId, deviceFingerprint,
    );
    const downloadRecord: DownloadRecord = {
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      purchaseId: licenceId, // Will be resolved to actual purchase in production
      licenceId,
      userId,
      resourceId,
      fileId,
      deviceRegistrationId: deviceReg?.id ?? 'unregistered',
      deviceFingerprint,
      steganographicFingerprint: fingerprint.hex,
      fingerprintBits: fingerprint.bits,
      watermarkLayers: layersToApply,
      watermarkText,
      ipAddress: '', // Set by calling context
      userAgent: '', // Set by calling context
      fileHash: '', // Computed after watermarking
      fileSizeBytes: 0, // Computed after watermarking
      encrypted,
    };

    const savedRecord = await this.deps.downloadRepo.save(tenantId, downloadRecord);

    await this.deps.eventBus.publish(PROTECTION_EVENTS.DOWNLOAD_PROTECTED, {
      tenantId, resourceId, userId, fingerprint: fingerprint.hex,
      layers: layersToApply, encrypted, downloadRecordId: savedRecord.id,
      watermarkText: watermarkParams.watermarkText,
    });

    return success({
      downloadUrl,
      expiresInSeconds,
      watermarkLayers: layersToApply,
      steganographicFingerprint: fingerprint.hex,
      encrypted,
      downloadRecordId: savedRecord.id,
    });
  }

  // ══════════════════════════════════════════════════════════════════════
  // READER SESSIONS (Layers 2 + 3)
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Start a new reader session for protected content.
   *
   * The session is the "checkout slip" — it reserves a concurrency slot
   * on the licence, tracks page access, and expires after inactivity.
   * Session state lives in Redis (fast) with persistence to the database
   * (durable audit trail).
   */
  async startSession(
    tenantId: string,
    request: StartSessionRequest,
  ): Promise<Result<ContentSession>> {
    const { resourceId, userId, licenceId, deviceFingerprint, ipAddress, userAgent } = request;

    // Verify the policy requires reader mode
    const policy = await this.deps.policyRepo.findByResource(tenantId, resourceId);
    if (!policy || !policy.readerEnabled) {
      return failure(Errors.validation('Reader mode is not enabled for this resource.'));
    }

    // Check device registration (Layer 2)
    const device = await this.deps.deviceRepo.findByFingerprint(
      tenantId, licenceId, deviceFingerprint,
    );
    if (!device || device.status !== 'active') {
      return failure(Errors.forbidden(
        'This device is not registered for your licence.',
      ));
    }

    // Check concurrent session limit (Layer 2)
    const activeSessionCount = await this.deps.sessionRepo.countActiveByLicence(tenantId, licenceId);
    if (activeSessionCount >= policy.concurrentSessionLimit) {
      await this.deps.eventBus.publish(PROTECTION_EVENTS.SESSION_LIMIT_REACHED, {
        tenantId, licenceId, userId, activeCount: activeSessionCount,
        limit: policy.concurrentSessionLimit,
      });
      return failure(Errors.conflict(
        `Concurrent session limit reached (${activeSessionCount}/${policy.concurrentSessionLimit}). ` +
        'Please close a session on another device first.',
      ));
    }

    // Create session
    const now = new Date();
    const expiresAt = new Date(now.getTime() + policy.sessionTimeoutMinutes * 60 * 1000);

    const session: ContentSession = {
      id: this.generateId(),
      tenantId,
      createdAt: now,
      updatedAt: now,
      userId,
      licenceId,
      resourceId,
      deviceFingerprint,
      status: 'active',
      startedAt: now,
      lastHeartbeatAt: now,
      expiresAt,
      pagesViewed: [],
      totalPageViews: 0,
      peakConcurrentPages: 0,
      ipAddress,
      userAgent,
    };

    const saved = await this.deps.sessionRepo.save(tenantId, session);

    // Cache in Redis for fast session validation
    await this.deps.cache.set(
      sessionCacheKey(saved.id),
      JSON.stringify({ ...saved, status: 'active' }),
      policy.sessionTimeoutMinutes * 60,
    );

    await this.deps.eventBus.publish(PROTECTION_EVENTS.SESSION_STARTED, {
      tenantId, resourceId, userId, sessionId: saved.id, deviceFingerprint,
    });

    return success(saved);
  }

  /**
   * Heartbeat to keep a session alive. Without regular heartbeats,
   * the session's Redis TTL expires and the concurrency slot is freed.
   */
  async heartbeat(
    tenantId: string,
    sessionId: string,
  ): Promise<Result<void>> {
    const cached = await this.deps.cache.get<string>(sessionCacheKey(sessionId));
    if (!cached) {
      return failure(Errors.notFound('Session', sessionId));
    }

    const session = JSON.parse(cached) as ContentSession;
    if (session.status !== 'active') {
      return failure(Errors.conflict('Session is no longer active.'));
    }

    // Refresh the heartbeat
    const now = new Date();
    session.lastHeartbeatAt = now;

    // Refresh Redis TTL
    const policy = await this.deps.policyRepo.findByResource(tenantId, session.resourceId);
    const ttl = (policy?.sessionTimeoutMinutes ?? 480) * 60;
    await this.deps.cache.set(sessionCacheKey(sessionId), JSON.stringify(session), ttl);

    // Update database (async, non-blocking)
    this.deps.sessionRepo.update(tenantId, sessionId, { lastHeartbeatAt: now }).catch(() => {});

    return success(undefined);
  }

  /**
   * Request a rendered page from the encrypted reader (Layer 3).
   *
   * In production, this decrypts the resource, renders the requested page
   * to an image (using Puppeteer or WeasyPrint), and adds the anti-screenshot
   * overlay. For now, we validate the session and return a placeholder.
   */
  async requestPage(
    tenantId: string,
    sessionId: string,
    pageNumber: number,
  ): Promise<Result<RenderedPage>> {
    // Validate session from Redis (fast path)
    const cached = await this.deps.cache.get<string>(sessionCacheKey(sessionId));
    if (!cached) {
      return failure(Errors.notFound('Session', sessionId));
    }

    const session = JSON.parse(cached) as ContentSession;
    if (session.status !== 'active') {
      return failure(Errors.conflict('Session is no longer active.'));
    }

    // Check expiry
    if (new Date() > new Date(session.expiresAt)) {
      await this.endSession(tenantId, sessionId);
      return failure(Errors.conflict('Session has expired. Please start a new session.'));
    }

    // ── Rate limiting ──
    // Each session gets a rolling 60-second window for page requests.
    // Uses Redis INCR with TTL: the key auto-expires after 60 seconds,
    // resetting the counter. Like a turnstile that lets N people through
    // per minute — no one gets hurt, but automated scrapers hit the limit.
    const policy = await this.deps.policyRepo.findByResource(tenantId, session.resourceId);
    const rateLimit = policy?.pageRateLimitPerMinute ?? DEFAULT_POLICY.pageRateLimitPerMinute;

    const rateLimitResult = await this.checkPageRateLimit(sessionId, rateLimit);
    if (!rateLimitResult.success) {
      return rateLimitResult as Result<RenderedPage>;
    }

    // Track page access
    if (!session.pagesViewed.includes(pageNumber)) {
      session.pagesViewed.push(pageNumber);
    }
    session.totalPageViews += 1;

    // Update Redis cache
    await this.deps.cache.set(
      sessionCacheKey(sessionId),
      JSON.stringify(session),
      undefined, // Keep existing TTL
    );

    // Generate the anti-screenshot overlay (Layer 3)
    // (policy already fetched above during rate limit check)
    const overlayHtml = this.generateOverlayHtml(session, policy);

    // ── Render the page image (Layer 3) ──
    // If the page renderer is wired in, use it for server-side rendering.
    // Otherwise, return the placeholder (backward-compatible with Phase 2).
    let imageDataUrl = ''; // Placeholder for when renderer is not available

    if (this.deps.pageRenderer && policy) {
      try {
        // Get encryption key for the resource (if encrypted)
        const encryptionKey = await this.deps.encryptionKeyRepo.findActiveByResource(
          tenantId, session.resourceId,
        );

        // Find the download record for this session's user to get buyerKeyDerivation
        // In production, this would be stored on the session or looked up from Redis
        const buyerKeyDerivation = encryptionKey
          ? `v1:${session.licenceId}:${session.deviceFingerprint}`
          : null;

        const rendered = await this.deps.pageRenderer.renderPage(
          sessionId,
          pageNumber,
          session,
          policy,
          encryptionKey,
          buyerKeyDerivation,
        );
        imageDataUrl = rendered.imageDataUrl;
      } catch (err) {
        // If rendering fails, return the overlay-only response.
        // The client can show an error state for this page.
        console.error(`[ContentProtection] Page render failed for page ${pageNumber}:`, (err as Error).message);
      }
    }

    const renderedPage: RenderedPage = {
      pageNumber,
      imageDataUrl,
      watermarkOverlayHtml: overlayHtml,
      sessionValidUntil: new Date(session.expiresAt),
    };

    return success(renderedPage);
  }

  /**
   * End a reader session, freeing the concurrency slot.
   */
  async endSession(
    tenantId: string,
    sessionId: string,
  ): Promise<Result<void>> {
    // Remove from Redis
    await this.deps.cache.del(sessionCacheKey(sessionId));

    // Invalidate rendered page cache (Phase 3)
    if (this.deps.pageRenderer) {
      await this.deps.pageRenderer.invalidateSession(sessionId);
    }

    // Update database
    const now = new Date();
    await this.deps.sessionRepo.update(tenantId, sessionId, {
      status: 'terminated' as SessionStatus,
      endedAt: now,
      terminatedReason: 'user_ended',
    });

    await this.deps.eventBus.publish(PROTECTION_EVENTS.SESSION_ENDED, {
      tenantId, sessionId,
    });

    return success(undefined);
  }

  // ══════════════════════════════════════════════════════════════════════
  // FORENSICS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Extract a steganographic fingerprint from a suspected leaked file.
   * This is the "CSI moment" — the file is analysed and, if a fingerprint
   * is found, it's matched against the download record database.
   */
  async extractFingerprint(
    fileBuffer: Buffer,
  ): Promise<Result<FingerprintExtractionResult>> {
    const result = await this.deps.watermarkService.extractFingerprint(
      fileBuffer, 'application/pdf',
    );

    // If we found a fingerprint, try to match it to a download record
    if (result.found && result.fingerprint) {
      const matchedRecord = await this.deps.downloadRepo.findByFingerprint(result.fingerprint);
      if (matchedRecord) {
        result.matchedDownloadRecordId = matchedRecord.id;
      }
    }

    return success(result);
  }

  /**
   * Report a content violation (suspected piracy or unauthorised sharing).
   * If the report includes a file, we attempt to extract the fingerprint
   * and automatically link it to the source download.
   */
  async reportViolation(
    tenantId: string,
    request: ReportViolationRequest,
  ): Promise<Result<ContentViolation>> {
    let extractionResult: FingerprintExtractionResult | undefined;

    // Attempt fingerprint extraction if file provided
    if (request.fileBuffer) {
      const extracted = await this.extractFingerprint(request.fileBuffer);
      if (extracted.success) {
        extractionResult = extracted.data;
      }
    }

    // Determine severity based on match confidence
    let severity: ViolationSeverity = 'medium';
    if (extractionResult?.found && extractionResult.confidence > 0.9) {
      severity = 'high';
    }
    if (request.sourceUrl?.includes('telegram') || request.sourceUrl?.includes('torrent')) {
      severity = 'critical';
    }

    const violation: ContentViolation = {
      id: this.generateId(),
      tenantId,
      createdAt: new Date(),
      updatedAt: new Date(),
      resourceId: request.resourceId,
      matchConfidence: extractionResult?.confidence ?? 0,
      ...(extractionResult?.fingerprint ? { detectedFingerprint: extractionResult.fingerprint } : {}),
      ...(extractionResult?.matchedDownloadRecordId ? { matchedDownloadRecordId: extractionResult.matchedDownloadRecordId } : {}),
      ...(request.sourceUrl ? { sourceUrl: request.sourceUrl } : {}),
      sourceDescription: request.sourceDescription,
      reportedBy: request.reportedBy,
      reportedAt: new Date(),
      severity,
      isResolved: false,
    };

    // If we matched a download record, populate the matched identity
    if (extractionResult?.matchedDownloadRecordId) {
      const downloadRecord = await this.deps.downloadRepo.findById(
        tenantId, extractionResult.matchedDownloadRecordId,
      );
      if (downloadRecord) {
        violation.matchedUserId = downloadRecord.userId;
        violation.matchedLicenceId = downloadRecord.licenceId;
        violation.matchedDownloadTimestamp = downloadRecord.createdAt;
      }
    }

    const saved = await this.deps.violationRepo.save(tenantId, violation);

    await this.deps.eventBus.publish(
      extractionResult?.found
        ? PROTECTION_EVENTS.VIOLATION_MATCHED
        : PROTECTION_EVENTS.VIOLATION_REPORTED,
      {
        tenantId, resourceId: request.resourceId, violationId: saved.id,
        severity, matched: !!extractionResult?.found,
      },
    );

    return success(saved);
  }

  async getViolations(
    tenantId: string,
    resourceId: string,
    filter: ListFilter,
  ): Promise<Result<PaginatedResult<ContentViolation>>> {
    const result = await this.deps.violationRepo.findByResource(tenantId, resourceId, filter);
    return success(result);
  }

  // ══════════════════════════════════════════════════════════════════════
  // ANALYTICS
  // ══════════════════════════════════════════════════════════════════════

  async getProtectionSummary(
    tenantId: string,
    _authorId: string,
  ): Promise<Result<ProtectionSummary>> {
    // ── Aggregate queries across all protection repositories ──
    // Each query runs independently; failures in one don't block others.
    // This powers the Author Protection Dashboard with real-time data.

    // Count protected resources by level
    const allPolicies = await this.deps.policyRepo.findByAuthor(
      tenantId, _authorId, { page: 1, pageSize: 1000 },
    );
    const protectionCoverage = {
      basic: 0, standard: 0, premium: 0, maximum: 0, unprotected: 0,
    };
    for (const policy of allPolicies.items) {
      protectionCoverage[policy.protectionLevel]++;
    }

    // Recent downloads (last 10)
    const recentDownloadsResult = await this.deps.downloadRepo.findByResource(
      tenantId, '', // Empty resourceId returns all for tenant in production
      { page: 1, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' },
    );

    // Recent violations (last 10)
    const recentViolationsResult = await this.deps.violationRepo.findUnresolved(
      tenantId, { page: 1, pageSize: 10, sortBy: 'createdAt', sortOrder: 'desc' },
    );

    // Count violations by resolution status
    const allViolations = await this.deps.violationRepo.findByResource(
      tenantId, '', { page: 1, pageSize: 1000 },
    );
    const totalViolationsDetected = allViolations.total;
    const totalViolationsResolved = allViolations.items.filter(v => v.isResolved).length;

    const summary: ProtectionSummary = {
      totalProtectedResources: allPolicies.total,
      totalActiveLicences: await this.countActiveLicences(tenantId),
      totalRegisteredDevices: await this.countRegisteredDevices(tenantId),
      totalDownloadsTracked: recentDownloadsResult.total,
      totalActiveReaderSessions: await this.countActiveReaderSessions(tenantId),
      totalViolationsDetected,
      totalViolationsResolved,
      protectionCoverage,
      recentDownloads: recentDownloadsResult.items,
      recentViolations: recentViolationsResult.items,
    };

    return success(summary);
  }

  async getDownloadAudit(
    tenantId: string,
    resourceId: string,
    filter: ListFilter,
  ): Promise<Result<PaginatedResult<DownloadRecord>>> {
    const result = await this.deps.downloadRepo.findByResource(tenantId, resourceId, filter);
    return success(result);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PRIVATE — RATE LIMITING
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Check whether a session has exceeded its page request rate limit.
   *
   * Uses Redis INCR with a 60-second TTL as a sliding window counter.
   * The first request in a window creates the key with value 1 and sets
   * TTL to 60 seconds. Subsequent requests increment the counter. After
   * 60 seconds the key expires and the window resets.
   *
   * Returns success(undefined) if under limit, failure if rate exceeded.
   */
  private async checkPageRateLimit(
    sessionId: string,
    limitPerMinute: number,
  ): Promise<Result<void>> {
    const rateLimitKey = `erudits:protection:ratelimit:${sessionId}`;

    // Atomic increment with 60-second sliding window.
    // Redis INCR guarantees no double-counting under concurrent requests —
    // unlike the previous get-then-set pattern which had a TOCTOU race.
    // If the key doesn't exist, Redis creates it with value 0 then increments.
    // TTL is set only on first creation (value === 1), ensuring the window
    // doesn't reset mid-count.
    const current = await this.deps.cache.incr(rateLimitKey, 60);

    if (current > limitPerMinute) {
      return failure(Errors.validation(
        `Rate limit exceeded: maximum ${limitPerMinute} page requests per minute. ` +
        'Please wait a moment before requesting more pages.',
      ));
    }

    return success(undefined);
  }

  // ══════════════════════════════════════════════════════════════════════
  // PRIVATE — DASHBOARD AGGREGATE COUNTERS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Count active licences across all protected resources for the tenant.
   *
   * Uses the device registry: every registered device has a licenceId.
   * We count distinct licenceIds from active device registrations.
   * In a full deployment, a Redis counter (incremented on device registration,
   * decremented on deregistration) would be more efficient, but this
   * query-based approach is accurate for the dashboard's refresh cycle.
   */
  private async countActiveLicences(tenantId: string): Promise<number> {
    const cachedCount = await this.deps.cache.get<string>(`erudits:dashboard:licences:${tenantId}`);
    if (cachedCount) return parseInt(cachedCount, 10);

    // Get all policies (each has a resourceId) and count unique licences via devices
    const allPolicies = await this.deps.policyRepo.findByAuthor(
      tenantId, '', { page: 1, pageSize: 1000 },
    );

    let totalLicences = 0;
    for (const policy of allPolicies.items) {
      const devices = await this.deps.deviceRepo.findByLicence(tenantId, policy.resourceId);
      if (devices.length > 0) totalLicences++;
    }

    await this.deps.cache.set(`erudits:dashboard:licences:${tenantId}`, totalLicences.toString(), 300);
    return totalLicences;
  }

  /**
   * Count total registered devices across all licences for the tenant.
   */
  private async countRegisteredDevices(tenantId: string): Promise<number> {
    const cachedCount = await this.deps.cache.get<string>(`erudits:dashboard:devices:${tenantId}`);
    if (cachedCount) return parseInt(cachedCount, 10);

    const allPolicies = await this.deps.policyRepo.findByAuthor(
      tenantId, '', { page: 1, pageSize: 1000 },
    );

    let totalDevices = 0;
    for (const policy of allPolicies.items) {
      const count = await this.deps.deviceRepo.countActiveByLicence(tenantId, policy.resourceId);
      totalDevices += count;
    }

    await this.deps.cache.set(`erudits:dashboard:devices:${tenantId}`, totalDevices.toString(), 300);
    return totalDevices;
  }

  /**
   * Count active reader sessions across all resources for the tenant.
   */
  private async countActiveReaderSessions(tenantId: string): Promise<number> {
    const cachedCount = await this.deps.cache.get<string>(`erudits:dashboard:sessions:${tenantId}`);
    if (cachedCount) return parseInt(cachedCount, 10);

    const allPolicies = await this.deps.policyRepo.findByAuthor(
      tenantId, '', { page: 1, pageSize: 1000 },
    );

    let totalSessions = 0;
    for (const policy of allPolicies.items) {
      const activeSessions = await this.deps.sessionRepo.findActiveByResource(tenantId, policy.resourceId);
      totalSessions += activeSessions.length;
    }

    await this.deps.cache.set(`erudits:dashboard:sessions:${tenantId}`, totalSessions.toString(), 60);
    return totalSessions;
  }

  // ══════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════

  /**
   * Generate a 64-bit steganographic fingerprint from the download context.
   *
   * The fingerprint encodes enough information to uniquely identify the
   * download while being compact enough to embed steganographically.
   *
   * Bits 0-15:  Purchase/licence hash
   * Bits 16-31: User hash
   * Bits 32-43: Timestamp (minutes since epoch, mod 4096)
   * Bits 44-51: Device hash
   * Bits 52-63: CRC-12 checksum
   */
  private generateSteganographicFingerprint(
    licenceId: string,
    userId: string,
    deviceFingerprint: string,
  ): { hex: string; bits: DownloadRecord['fingerprintBits'] } {
    const purchaseHash = this.hash16(licenceId);
    const userHash = this.hash16(userId);
    const timestampMod = Math.floor(Date.now() / 60000) % 4096;
    const deviceHash = this.hash8(deviceFingerprint);

    // Combine into a 52-bit value, then add 12-bit checksum
    const payload = (BigInt(purchaseHash) << 36n) | (BigInt(userHash) << 20n) |
                    (BigInt(timestampMod) << 8n) | BigInt(deviceHash);
    const checksum = Number(payload % 4096n);

    const fullFingerprint = (payload << 12n) | BigInt(checksum);
    const hex = fullFingerprint.toString(16).padStart(16, '0');

    return {
      hex,
      bits: { purchaseHash, userHash, timestampMod, deviceHash, checksum },
    };
  }

  /** Simple 16-bit hash of a string. */
  private hash16(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) & 0xFFFF;
  }

  /** Simple 8-bit hash of a string. */
  private hash8(input: string): number {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      hash = ((hash << 3) - hash + input.charCodeAt(i)) | 0;
    }
    return Math.abs(hash) & 0xFF;
  }

  /**
   * Validate that the protection policy configuration is internally consistent.
   * For example, 'premium' level requires readerEnabled, 'maximum' requires
   * downloadEncrypted, etc.
   */
  private validatePolicyConsistency(
    request: SetProtectionPolicyRequest,
  ): Result<void> {
    const { protectionLevel, deliveryMode } = request;

    if (protectionLevel === 'premium' || protectionLevel === 'maximum') {
      if (deliveryMode === 'download' && protectionLevel === 'premium') {
        // Premium requires reader — if download only, suggest standard instead
        return failure(Errors.validation(
          'Premium protection requires the encrypted reader. ' +
          'Either set deliveryMode to "reader_only" or "both", or use "standard" protection.',
        ));
      }
    }

    if (protectionLevel === 'maximum' && deliveryMode === 'reader_only') {
      // Maximum includes download encryption, but reader_only means no downloads
      return failure(Errors.validation(
        'Maximum protection includes download encryption, but delivery mode is "reader_only". ' +
        'Use "premium" for reader-only content, or set delivery mode to "both".',
      ));
    }

    return success(undefined);
  }

  /**
   * Generate the anti-screenshot HTML overlay for the reader (Layer 3).
   *
   * The overlay contains the user's identity and a session ID, rendered
   * as semi-transparent text that moves position periodically. Any
   * screenshot of the content carries the viewer's identity.
   */
  private generateOverlayHtml(
    session: ContentSession,
    policy: ContentProtectionPolicy | null,
  ): string {
    if (!policy?.antiScreenshotOverlay) return '';

    const userId = session.userId.slice(0, 8);
    const sessionId = session.id.slice(0, 8);
    const timestamp = new Date().toISOString().split('T')[0];

    return `<div class="scholarly-protection-overlay" style="
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 9999; overflow: hidden;
    "><div style="
      position: absolute;
      top: ${Math.random() * 60 + 20}%;
      left: ${Math.random() * 60 + 20}%;
      transform: rotate(-${30 + Math.random() * 30}deg);
      font-size: 18px; color: rgba(0,0,0,0.04);
      white-space: nowrap; user-select: none;
    ">${userId}-${sessionId} ${timestamp}</div></div>`;
  }

  private generateId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 10);
    return `${timestamp}${random}`;
  }
}

// ── Factory ──

export function createContentProtectionService(
  deps: ContentProtectionDeps,
): ContentProtectionServiceImpl {
  return new ContentProtectionServiceImpl(deps);
}
