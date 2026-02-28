/**
 * ============================================================================
 * §6 — CONTENT PROTECTION TYPES
 * ============================================================================
 *
 * The content protection system is a four-layer defence-in-depth architecture
 * designed to protect high-value educational content (like Érudits' $280 ATAR
 * exam packs) from unauthorised sharing while keeping legitimate access
 * frictionless.
 *
 * Think of it like airport security: each layer catches a different class of
 * threat, and no single layer needs to be perfect because the others provide
 * backup. Watermarking is the security camera (traceability). Licence
 * enforcement is the boarding pass check (access control). The encrypted
 * reader is the cockpit door (containment). Download encryption is the
 * luggage lock (casual deterrent).
 *
 * ## Architecture Layers
 *   Layer 1: Forensic Watermarking — visible + steganographic fingerprints
 *   Layer 2: Licence Enforcement — device binding, session limits, expiry
 *   Layer 3: Encrypted Reader — server-side decryption, anti-screenshot
 *   Layer 4: Download Protection — AES-256-GCM encryption, PDF permissions
 *
 * ## Integration Points
 *   - Extends ResourceLicence / ResourcePurchase from §2 (Storefront)
 *   - Consumes WatermarkService interface from storefront.service.ts
 *   - Uses Redis (Cache interface) for session management
 *   - Publishes events via EventBus (NATS)
 *   - Device fingerprinting adapts patterns from phonics federated sync
 *
 * @module erudits/types/content-protection
 * @version 1.0.0
 */

import type {
  ListFilter,
  PaginatedResult,
StrictPartial,
} from './erudits.types';

// ── Base entity fields (inlined in each interface, matching §2 pattern) ──
interface BaseFields {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// ENUMS & LITERALS
// ============================================================================

/**
 * Protection levels determine which layers are active for a given resource.
 * Authors configure this per-product through the storefront dashboard.
 *
 *   basic:    Layer 1 only (visible watermark + metadata fingerprint)
 *   standard: Layer 1 + 2 (watermarking + licence enforcement)
 *   premium:  Layer 1 + 2 + 3 (add encrypted reader for browser viewing)
 *   maximum:  All 4 layers (add download encryption + PDF permissions)
 */
export type ProtectionLevel = 'basic' | 'standard' | 'premium' | 'maximum';

/**
 * The delivery modes available for a protected resource. Authors choose
 * which modes are permitted for each product — e.g., solutions might be
 * 'reader_only' while exam papers allow 'download' with full protection.
 */
export type DeliveryMode = 'download' | 'reader_only' | 'both';

/**
 * Device platforms for fingerprinting. Each platform uses a different
 * fingerprinting strategy tuned for its unique characteristics.
 */
export type DevicePlatform = 'ios' | 'android' | 'web' | 'desktop_mac' | 'desktop_win' | 'desktop_linux';

/**
 * Lifecycle status of a device registration. Devices progress through
 * these states as they're registered, used, and eventually replaced.
 */
export type DeviceStatus = 'active' | 'suspended' | 'deregistered' | 'expired';

/**
 * Content session states. Sessions are ephemeral — they live in Redis
 * with TTL-based expiry and a heartbeat mechanism to detect abandoned
 * sessions that should release their concurrency slot.
 */
export type SessionStatus = 'active' | 'idle' | 'expired' | 'terminated';

/**
 * Watermark layers applied during download preparation. Each layer
 * targets a different attack vector — stripping one doesn't remove
 * the others. Together they encode the same fingerprint through three
 * independent channels.
 */
export type WatermarkLayer = 'visible_text' | 'metadata' | 'steganographic';

/**
 * PDF permission flags. These map to the PDF specification's permission
 * bits (ISO 32000-2:2020, Table 22). Not all combinations are valid.
 */
export type PdfPermission =
  | 'print_high_quality'
  | 'print_low_quality'
  | 'copy_text'
  | 'edit'
  | 'annotate'
  | 'extract_pages'
  | 'fill_forms'
  | 'accessibility';

/**
 * Violation severity determines the automated response and escalation
 * path when a leaked file is detected.
 */
export type ViolationSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Actions that can be taken in response to a detected violation.
 * These are graduated — the system recommends an action based on
 * severity, but the author makes the final decision.
 */
export type ViolationAction =
  | 'flag_for_review'       // Internal monitoring only
  | 'send_warning'          // Email warning to the licence holder
  | 'suspend_licence'       // Temporarily suspend access
  | 'revoke_licence'        // Permanently revoke access
  | 'legal_escalation';     // Generate evidence package for legal

/**
 * Steganographic encoding techniques used to embed invisible
 * fingerprints. Multiple techniques are combined for redundancy.
 */
export type SteganographicTechnique =
  | 'micro_typography'      // Letter/word spacing variations
  | 'homoglyph'            // Visually identical Unicode substitutions
  | 'dot_pattern'          // Near-invisible dot overlay
  | 'image_perturbation';  // Sub-pixel image modifications

// ============================================================================
// CORE ENTITIES
// ============================================================================

/**
 * Per-resource protection configuration. This is the "policy" that
 * determines how a specific piece of content is protected. Authors
 * configure this through the storefront dashboard; the system enforces
 * it at every access point.
 *
 * Think of it as the insurance policy for a piece of content — it
 * defines what's covered (which layers are active), the terms (device
 * limits, session caps), and the claims process (violation responses).
 */
export interface ContentProtectionPolicy extends BaseFields {
  resourceId: string;

  // ── Protection Configuration ──
  protectionLevel: ProtectionLevel;
  deliveryMode: DeliveryMode;

  // ── Watermark Settings (Layer 1) ──
  visibleWatermark: boolean;
  watermarkText?: string;              // Override, or derived from licence
  steganographicEnabled: boolean;
  steganographicTechniques: SteganographicTechnique[];

  // ── Licence Enforcement (Layer 2) ──
  maxDevicesIndividual: number;         // Default: 3
  maxDevicesInstitution: number;        // Default: 10
  concurrentSessionLimit: number;       // Default: 5
  sessionTimeoutMinutes: number;        // Default: 480 (8 hours)

  // ── Reader Settings (Layer 3) ──
  readerEnabled: boolean;
  antiScreenshotOverlay: boolean;
  overlayRefreshSeconds: number;        // Default: 30
  focusBlurEnabled: boolean;
  pageRateLimitPerMinute: number;       // Default: 30

  // ── Download Settings (Layer 4) ──
  downloadEncrypted: boolean;
  pdfPermissions: PdfPermission[];
  downloadLimitPerDevice: number;       // Default: 5 (re-downloads)

  // ── Automated Response ──
  autoSuspendOnViolation: boolean;
  violationNotifyAuthor: boolean;
  violationNotifyAdmin: boolean;
}

/**
 * A trusted device registered against a licence. Each device gets a
 * composite fingerprint and a slot in the licence's device allowance.
 *
 * The device registration is the "key card" — without it, you can't
 * access the protected content even if you have the download URL.
 * Unlike the phonics tool's simpler device registration (which mainly
 * tracks sync state), this registration is a security boundary.
 */
export interface DeviceRegistration extends BaseFields {
  licenceId: string;
  userId: string;

  // ── Device Identity ──
  fingerprint: string;                  // Composite hash of device attributes
  fingerprintComponents: {              // Raw components for re-verification
    platform: DevicePlatform;
    userAgent?: string | undefined;
    screenResolution?: string | undefined;
    timezone?: string | undefined;
    canvasHash?: string;                // Browser canvas fingerprint
    webglRenderer?: string;             // WebGL renderer string
    hardwareId?: string;                // Native device ID (iOS/Android)
    osVersion?: string | undefined;
  };
  deviceName: string;                   // User-friendly name ("Sarah's iPad")
  platform: DevicePlatform;

  // ── Status ──
  status: DeviceStatus;
  lastSeenAt: Date;
  lastIpAddress?: string;
  lastAccessedResourceId?: string;

  // ── Deregistration ──
  deregisteredAt?: Date;
  deregisteredBy?: string;              // userId of who deregistered
  deregistrationReason?: string;
}

/**
 * An active content viewing session. Sessions live in Redis with TTL
 * and are replicated to the database for audit purposes. The heartbeat
 * mechanism ensures abandoned sessions don't permanently consume
 * concurrency slots.
 *
 * Analogy: this is the "checked out" slip at a library. While you have
 * a book checked out, nobody else can borrow it (within the concurrency
 * limit). If you don't return it (heartbeat stops), the librarian
 * reclaims it after a grace period.
 */
export interface ContentSession extends BaseFields {
  userId: string;
  licenceId: string;
  resourceId: string;
  deviceFingerprint: string;

  // ── Session State ──
  status: SessionStatus;
  startedAt: Date;
  lastHeartbeatAt: Date;
  endedAt?: Date | undefined;
  expiresAt: Date;

  // ── Activity Tracking ──
  pagesViewed: number[];                // Page numbers accessed (ordered)
  totalPageViews: number;
  peakConcurrentPages: number;          // For anomaly detection
  ipAddress: string;
  userAgent: string;

  // ── Termination ──
  terminatedReason?: string;            // e.g., 'session_limit', 'licence_expired', 'manual'
}

/**
 * Forensic record of every file download. This is the evidence chain
 * that links a leaked file back to a specific person, device, and moment
 * in time. The steganographic fingerprint embedded in the file matches
 * the fingerprint stored here.
 *
 * If Layer 1 (watermarking) is the camera, this is the footage archive.
 */
export interface DownloadRecord extends BaseFields {
  purchaseId: string;
  licenceId: string;
  userId: string;
  resourceId: string;
  fileId: string;

  // ── Device Context ──
  deviceRegistrationId: string;
  deviceFingerprint: string;

  // ── Steganographic Fingerprint ──
  steganographicFingerprint: string;    // 64-bit fingerprint as hex string
  fingerprintBits: {
    purchaseHash: number;               // Bits 0-15
    userHash: number;                   // Bits 16-31
    timestampMod: number;               // Bits 32-43
    deviceHash: number;                 // Bits 44-51
    checksum: number;                   // Bits 52-63
  };

  // ── Watermark Layers Applied ──
  watermarkLayers: WatermarkLayer[];
  watermarkText: string;

  // ── Context ──
  ipAddress: string;
  userAgent: string;
  fileHash: string;                     // SHA-256 of the delivered file
  fileSizeBytes: number;

  // ── Encryption (Layer 4) ──
  encrypted: boolean;
  encryptionKeyVersion?: number;
}

/**
 * Per-resource encryption key management. Keys are AES-256-GCM and
 * stored encrypted at rest using an envelope encryption pattern:
 * each resource key is encrypted by a tenant-level master key,
 * which is itself managed by the platform's key management service.
 *
 * Keys are versioned to support rotation without re-encrypting
 * already-distributed content (old keys remain valid for old downloads).
 */
export interface EncryptionKeyRecord extends BaseFields {
  resourceId: string;

  // ── Key Material ──
  masterKeyEncrypted: string;           // AES-256-GCM key, encrypted by tenant master key
  algorithm: 'aes-256-gcm';
  keyVersion: number;
  iv: string;                           // Initialisation vector (hex)
  authTag: string;                      // GCM authentication tag (hex)

  // ── Lifecycle ──
  isActive: boolean;
  rotatedAt?: Date | undefined;
  rotatedBy?: string | undefined;
  previousKeyVersion?: number | undefined;
}

/**
 * A detected or reported content violation. This is the incident
 * record when a leaked file is discovered — either through automated
 * web scanning (future) or manual reporting by the author.
 *
 * The evidence package generated from this record can be used for
 * takedown notices, licence revocation, or legal proceedings.
 */
export interface ContentViolation extends BaseFields {
  resourceId: string;

  // ── Detection ──
  detectedFingerprint?: string;         // Extracted steganographic fingerprint
  matchedDownloadRecordId?: string;     // Linked download record (if fingerprint matched)
  matchConfidence: number;              // 0.0 to 1.0

  // ── Source ──
  sourceUrl?: string;                   // Where the leaked file was found
  sourceDescription: string;            // Free-text description of the leak
  reportedBy: string;                   // userId of who reported
  reportedAt: Date;

  // ── Matched Identity (populated after fingerprint extraction) ──
  matchedUserId?: string | undefined;
  matchedLicenceId?: string | undefined;
  matchedInstitutionId?: string | undefined;
  matchedInstitutionName?: string | undefined;
  matchedDownloadTimestamp?: Date | undefined;

  // ── Response ──
  severity: ViolationSeverity;
  actionTaken?: ViolationAction | undefined;
  actionTakenBy?: string | undefined;
  actionTakenAt?: Date | undefined;
  actionNotes?: string | undefined;

  // ── Resolution ──
  isResolved: boolean;
  resolvedAt?: Date | undefined;
  resolvedBy?: string | undefined;
  resolutionNotes?: string | undefined;
}

// ============================================================================
// SERVICE INTERFACE
// ============================================================================

/**
 * The ContentProtectionService orchestrates all four defence layers.
 * It sits alongside the StorefrontService and is called during the
 * download/reader-launch flow. The service is the conductor — it
 * doesn't generate watermarks or encrypt files itself, but coordinates
 * the specialised components that do.
 *
 * ## Dependency Chain
 *   StorefrontService.getDownloadUrl()
 *     → ContentProtectionService.prepareDownload()
 *       → SteganographicWatermarkService.apply()
 *       → EncryptionService.encrypt()
 *       → DownloadRecordRepository.save()
 *       → EventBus.publish()
 */
export interface ContentProtectionService {
  // ── Policy Management ──
  setPolicy(tenantId: string, resourceId: string, policy: SetProtectionPolicyRequest): Promise<ContentProtectionPolicy>;
  getPolicy(tenantId: string, resourceId: string): Promise<ContentProtectionPolicy | null>;

  // ── Device Management ──
  registerDevice(tenantId: string, licenceId: string, userId: string, request: RegisterDeviceRequest): Promise<DeviceRegistration>;
  deregisterDevice(tenantId: string, licenceId: string, deviceId: string, userId: string): Promise<void>;
  listDevices(tenantId: string, licenceId: string): Promise<DeviceRegistration[]>;
  verifyDevice(tenantId: string, licenceId: string, fingerprint: string): Promise<DeviceRegistration | null>;

  // ── Download Protection (Layers 1 + 4) ──
  prepareDownload(tenantId: string, request: PrepareDownloadRequest): Promise<ProtectedDownload>;

  // ── Reader Sessions (Layers 2 + 3) ──
  startSession(tenantId: string, request: StartSessionRequest): Promise<ContentSession>;
  heartbeat(tenantId: string, sessionId: string): Promise<void>;
  requestPage(tenantId: string, sessionId: string, pageNumber: number): Promise<RenderedPage>;
  endSession(tenantId: string, sessionId: string): Promise<void>;

  // ── Forensics ──
  extractFingerprint(fileBuffer: Buffer): Promise<FingerprintExtractionResult>;
  reportViolation(tenantId: string, request: ReportViolationRequest): Promise<ContentViolation>;
  getViolations(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<ContentViolation>>;

  // ── Analytics ──
  getProtectionSummary(tenantId: string, authorId: string): Promise<ProtectionSummary>;
  getDownloadAudit(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<DownloadRecord>>;
}

/**
 * The steganographic watermark service extends the existing visible
 * watermark with invisible encoding techniques. This is a separate
 * interface because steganographic encoding is computationally more
 * expensive and requires different validation (fingerprint extraction
 * to verify correct encoding).
 */
export interface SteganographicWatermarkService {
  /** Apply all watermark layers (visible + metadata + steganographic). */
  applyFullWatermark(
    fileBuffer: Buffer,
    mimeType: string,
    params: WatermarkParams,
  ): Promise<WatermarkResult>;

  /** Extract the steganographic fingerprint from a file. */
  extractFingerprint(fileBuffer: Buffer, mimeType: string): Promise<FingerprintExtractionResult>;

  /** Verify that a fingerprint was correctly embedded. */
  verifyEmbedding(fileBuffer: Buffer, expectedFingerprint: string): Promise<boolean>;
}

/**
 * Encryption service for download protection (Layer 4). Handles
 * AES-256-GCM encryption/decryption and PDF permission setting.
 */
export interface ContentEncryptionService {
  /** Encrypt a file buffer with a per-buyer derived key. */
  encryptForBuyer(
    fileBuffer: Buffer,
    resourceEncryptionKey: EncryptionKeyRecord,
    buyerLicenceId: string,
    deviceFingerprint: string,
  ): Promise<{ encrypted: Buffer; buyerKeyDerivation: string }>;

  /** Decrypt a buyer-encrypted file (for re-download or device transfer). */
  decryptForBuyer(
    encryptedBuffer: Buffer,
    resourceEncryptionKey: EncryptionKeyRecord,
    buyerKeyDerivation: string,
  ): Promise<Buffer>;

  /** Apply PDF permission restrictions using owner password. */
  applyPdfPermissions(
    fileBuffer: Buffer,
    permissions: PdfPermission[],
    ownerPassword: string,
  ): Promise<Buffer>;

  /** Generate or rotate a resource encryption key. */
  generateResourceKey(tenantId: string, resourceId: string): Promise<EncryptionKeyRecord>;
}

// ============================================================================
// REQUEST / RESPONSE DTOs
// ============================================================================

export interface SetProtectionPolicyRequest {
  protectionLevel: ProtectionLevel;
  deliveryMode: DeliveryMode;
  visibleWatermark?: boolean | undefined;
  steganographicEnabled?: boolean | undefined;
  steganographicTechniques?: SteganographicTechnique[] | undefined;
  maxDevicesIndividual?: number | undefined;
  maxDevicesInstitution?: number | undefined;
  concurrentSessionLimit?: number | undefined;
  sessionTimeoutMinutes?: number | undefined;
  readerEnabled?: boolean | undefined;
  antiScreenshotOverlay?: boolean | undefined;
  downloadEncrypted?: boolean | undefined;
  pdfPermissions?: PdfPermission[] | undefined;
  downloadLimitPerDevice?: number | undefined;
  autoSuspendOnViolation?: boolean | undefined;
}

export interface RegisterDeviceRequest {
  fingerprint: string;
  fingerprintComponents: DeviceRegistration['fingerprintComponents'];
  deviceName: string;
  platform: DevicePlatform;
}

export interface PrepareDownloadRequest {
  resourceId: string;
  fileId: string;
  userId: string;
  licenceId: string;
  deviceFingerprint: string;
  institutionName?: string | undefined;
}

export interface StartSessionRequest {
  resourceId: string;
  userId: string;
  licenceId: string;
  deviceFingerprint: string;
  ipAddress: string;
  userAgent: string;
}

export interface ReportViolationRequest {
  resourceId: string;
  sourceUrl?: string | undefined;
  sourceDescription: string;
  reportedBy: string;
  fileBuffer?: Buffer;              // Optional: the leaked file for fingerprint extraction
}

export interface WatermarkParams {
  fingerprint: string;              // 64-bit hex string
  fingerprintBits: DownloadRecord['fingerprintBits'];
  watermarkText: string;            // "Licensed to Brighton Grammar School"
  techniques: SteganographicTechnique[];
  visibleWatermark: boolean;
}

// ── Response Types ──

export interface ProtectedDownload {
  downloadUrl: string;
  expiresInSeconds: number;
  watermarkLayers: WatermarkLayer[];
  steganographicFingerprint: string;
  encrypted: boolean;
  downloadRecordId: string;
}

export interface RenderedPage {
  pageNumber: number;
  imageDataUrl: string;             // Base64-encoded rendered page image
  textOverlay?: string;             // Selectable text layer (if permitted)
  watermarkOverlayHtml: string;     // Dynamic anti-screenshot overlay
  sessionValidUntil: Date;
}

export interface FingerprintExtractionResult {
  found: boolean;
  fingerprint?: string | undefined;
  confidence: number;               // 0.0 to 1.0
  techniques: SteganographicTechnique[];  // Which techniques yielded results
  decodedBits?: DownloadRecord['fingerprintBits'] | undefined;
  matchedDownloadRecordId?: string | undefined;
}

export interface WatermarkResult {
  watermarkedBuffer: Buffer;
  layersApplied: WatermarkLayer[];
  fingerprint: string;
  fileSizeBytes: number;
  processingTimeMs: number;
}

export interface ProtectionSummary {
  totalProtectedResources: number;
  totalActiveLicences: number;
  totalRegisteredDevices: number;
  totalDownloadsTracked: number;
  totalActiveReaderSessions: number;
  totalViolationsDetected: number;
  totalViolationsResolved: number;
  protectionCoverage: {             // % of resources at each level
    basic: number;
    standard: number;
    premium: number;
    maximum: number;
    unprotected: number;
  };
  recentDownloads: DownloadRecord[];    // Last 10
  recentViolations: ContentViolation[]; // Last 10
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface ContentProtectionPolicyRepository {
  save(tenantId: string, policy: ContentProtectionPolicy): Promise<ContentProtectionPolicy>;
  findByResource(tenantId: string, resourceId: string): Promise<ContentProtectionPolicy | null>;
  update(tenantId: string, resourceId: string, updates: StrictPartial<ContentProtectionPolicy>): Promise<ContentProtectionPolicy>;
  findByAuthor(tenantId: string, authorId: string, filter: ListFilter): Promise<PaginatedResult<ContentProtectionPolicy>>;
}

export interface DeviceRegistrationRepository {
  save(tenantId: string, device: DeviceRegistration): Promise<DeviceRegistration>;
  findById(tenantId: string, id: string): Promise<DeviceRegistration | null>;
  findByLicence(tenantId: string, licenceId: string): Promise<DeviceRegistration[]>;
  findByFingerprint(tenantId: string, licenceId: string, fingerprint: string): Promise<DeviceRegistration | null>;
  countActiveByLicence(tenantId: string, licenceId: string): Promise<number>;
  update(tenantId: string, id: string, updates: StrictPartial<DeviceRegistration>): Promise<DeviceRegistration>;
  deactivate(tenantId: string, id: string, reason: string, deregisteredBy: string): Promise<void>;
}

export interface ContentSessionRepository {
  save(tenantId: string, session: ContentSession): Promise<ContentSession>;
  findById(tenantId: string, id: string): Promise<ContentSession | null>;
  findActiveByLicence(tenantId: string, licenceId: string): Promise<ContentSession[]>;
  findActiveByResource(tenantId: string, resourceId: string): Promise<ContentSession[]>;
  countActiveByLicence(tenantId: string, licenceId: string): Promise<number>;
  update(tenantId: string, id: string, updates: StrictPartial<ContentSession>): Promise<ContentSession>;
  terminateExpired(tenantId: string): Promise<number>;
}

export interface DownloadRecordRepository {
  save(tenantId: string, record: DownloadRecord): Promise<DownloadRecord>;
  findById(tenantId: string, id: string): Promise<DownloadRecord | null>;
  findByFingerprint(fingerprint: string): Promise<DownloadRecord | null>;
  findByResource(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<DownloadRecord>>;
  findByUser(tenantId: string, userId: string, filter: ListFilter): Promise<PaginatedResult<DownloadRecord>>;
  countByDeviceAndResource(tenantId: string, deviceId: string, resourceId: string): Promise<number>;
}

export interface EncryptionKeyRepository {
  save(tenantId: string, key: EncryptionKeyRecord): Promise<EncryptionKeyRecord>;
  findActiveByResource(tenantId: string, resourceId: string): Promise<EncryptionKeyRecord | null>;
  findByVersion(tenantId: string, resourceId: string, version: number): Promise<EncryptionKeyRecord | null>;
  deactivate(tenantId: string, resourceId: string, version: number): Promise<void>;
}

export interface ContentViolationRepository {
  save(tenantId: string, violation: ContentViolation): Promise<ContentViolation>;
  findById(tenantId: string, id: string): Promise<ContentViolation | null>;
  findByResource(tenantId: string, resourceId: string, filter: ListFilter): Promise<PaginatedResult<ContentViolation>>;
  findUnresolved(tenantId: string, filter: ListFilter): Promise<PaginatedResult<ContentViolation>>;
  update(tenantId: string, id: string, updates: StrictPartial<ContentViolation>): Promise<ContentViolation>;
}

// ============================================================================
// EVENTS
// ============================================================================

/**
 * Content protection events published to the NATS event bus. These
 * integrate with the existing analytics pipeline and power the
 * Author Protection Dashboard.
 */
export const PROTECTION_EVENTS = {
  // ── Policy ──
  POLICY_SET:              'scholarly.protection.policy.set',
  POLICY_UPDATED:          'scholarly.protection.policy.updated',

  // ── Devices ──
  DEVICE_REGISTERED:       'scholarly.protection.device.registered',
  DEVICE_DEREGISTERED:     'scholarly.protection.device.deregistered',
  DEVICE_LIMIT_REACHED:    'scholarly.protection.device.limit_reached',
  DEVICE_SUSPICIOUS:       'scholarly.protection.device.suspicious',

  // ── Downloads ──
  DOWNLOAD_PROTECTED:      'scholarly.protection.download.protected',
  DOWNLOAD_LIMIT_REACHED:  'scholarly.protection.download.limit_reached',
  DOWNLOAD_BLOCKED:        'scholarly.protection.download.blocked',

  // ── Sessions ──
  SESSION_STARTED:         'scholarly.protection.session.started',
  SESSION_ENDED:           'scholarly.protection.session.ended',
  SESSION_LIMIT_REACHED:   'scholarly.protection.session.limit_reached',
  SESSION_TERMINATED:      'scholarly.protection.session.terminated',
  SESSION_ANOMALY:         'scholarly.protection.session.anomaly',

  // ── Violations ──
  VIOLATION_REPORTED:      'scholarly.protection.violation.reported',
  VIOLATION_MATCHED:       'scholarly.protection.violation.matched',
  VIOLATION_ACTION_TAKEN:  'scholarly.protection.violation.action_taken',
  VIOLATION_RESOLVED:      'scholarly.protection.violation.resolved',

  // ── Encryption ──
  KEY_GENERATED:           'scholarly.protection.key.generated',
  KEY_ROTATED:             'scholarly.protection.key.rotated',
} as const;
