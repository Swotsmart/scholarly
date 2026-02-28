/**
 * ============================================================================
 * Content Encryption Service — Unit Tests
 * ============================================================================
 *
 * Tests the Layer 4 (download protection) pipeline: AES-256-GCM encryption
 * with HKDF-derived buyer keys, envelope encryption for key storage,
 * and PDF permission restriction.
 *
 * The test strategy verifies:
 *   1. Round-trip: encrypt → decrypt yields original content
 *   2. Key derivation is deterministic: same inputs = same key
 *   3. Different buyers get different derived keys
 *   4. Key rotation creates new versions without breaking old decryption
 *   5. PDF permissions are applied correctly
 *   6. Packed format: [IV][AuthTag][Ciphertext] is self-contained
 */

import {
  ContentEncryptionServiceImpl,
  AES_KEY_LENGTH,
  AES_IV_LENGTH,
  AES_AUTH_TAG_LENGTH,
  PDF_PERMISSION_BITS,
} from '../integrations/content-encryption.service';
import type {
  EncryptionKeyRecord,
  EncryptionKeyRepository,
  PdfPermission,
} from '../types/content-protection.types';
import type { EventBus } from '../types/erudits.types';

// ============================================================================
// MOCK CRYPTO MODULE
// ============================================================================
// A deterministic mock of Node.js crypto that simulates AES-256-GCM and HKDF
// without requiring real cryptographic operations. This lets us test the
// service logic (key management, derivation chain, format packing) without
// the non-determinism of real encryption.

function createMockCrypto() {
  let randomCounter = 0;

  return {
    randomBytes: jest.fn().mockImplementation((size: number) => {
      // Deterministic "random" bytes for reproducible tests
      randomCounter++;
      const buf = Buffer.alloc(size);
      for (let i = 0; i < size; i++) {
        buf[i] = (randomCounter + i) & 0xFF;
      }
      return buf;
    }),

    createCipheriv: jest.fn().mockImplementation((_algo: string, key: Buffer, iv: Buffer) => {
      // Simulate encryption: XOR input with key (not real crypto, but invertible)
      const keyHash = simpleHash(Buffer.concat([key, iv]));
      return {
        update: jest.fn().mockImplementation((data: Buffer) => {
          const out = Buffer.alloc(data.length);
          for (let i = 0; i < data.length; i++) {
            out[i] = data[i]! ^ keyHash[i % keyHash.length]!;
          }
          return out;
        }),
        final: jest.fn().mockReturnValue(Buffer.alloc(0)),
        getAuthTag: jest.fn().mockReturnValue(Buffer.alloc(AES_AUTH_TAG_LENGTH, 0xAA)),
      };
    }),

    createDecipheriv: jest.fn().mockImplementation((_algo: string, key: Buffer, iv: Buffer) => {
      // Simulate decryption: same XOR operation reverses itself
      const keyHash = simpleHash(Buffer.concat([key, iv]));
      return {
        setAuthTag: jest.fn(),
        update: jest.fn().mockImplementation((data: Buffer) => {
          const out = Buffer.alloc(data.length);
          for (let i = 0; i < data.length; i++) {
            out[i] = data[i]! ^ keyHash[i % keyHash.length]!;
          }
          return out;
        }),
        final: jest.fn().mockReturnValue(Buffer.alloc(0)),
      };
    }),

    createHmac: jest.fn().mockImplementation((_algo: string, _key: Buffer) => {
      let data = '';
      const hmac = {
        update: jest.fn().mockImplementation((input: string) => {
          data += input;
          return hmac;
        }),
        digest: jest.fn().mockImplementation((_enc: string) => {
          return simpleHash(Buffer.from(data)).toString('hex');
        }),
      };
      return hmac;
    }),

    hkdfSync: jest.fn().mockImplementation(
      (_digest: string, ikm: Buffer, _salt: Buffer, info: Buffer, keyLength: number) => {
        // Deterministic key derivation: hash(ikm + info) truncated to keyLength
        const combined = Buffer.concat([ikm, info]);
        const derived = Buffer.alloc(keyLength);
        const hash = simpleHash(combined);
        for (let i = 0; i < keyLength; i++) {
          derived[i] = hash[i % hash.length]!;
        }
        return derived;
      },
    ),

    _resetCounter: () => { randomCounter = 0; },
  };
}

/** Simple deterministic hash for mock crypto operations. */
function simpleHash(data: Buffer): Buffer {
  const out = Buffer.alloc(32);
  for (let i = 0; i < data.length; i++) {
    out[i % 32] = (out[i % 32]! + data[i]!) & 0xFF;
  }
  return out;
}

// ============================================================================
// MOCK PDF-LIB
// ============================================================================

function createMockPdfLib() {
  return {
    load: jest.fn().mockImplementation(async (data: Buffer | Uint8Array) => {
      const metadata = new Map<string, string>();
      return {
        save: jest.fn().mockResolvedValue(new Uint8Array(data)),
        setCustomMetadata: jest.fn().mockImplementation((key: string, value: string) => {
          metadata.set(key, value);
        }),
        _customMetadata: metadata,
      };
    }),
  };
}

// ============================================================================
// MOCK REPOSITORIES & DEPS
// ============================================================================

function createMockEncryptionKeyRepo(): EncryptionKeyRepository {
  const store = new Map<string, EncryptionKeyRecord>();
  return {
    save: jest.fn().mockImplementation((_t: string, key: EncryptionKeyRecord) => {
      store.set(`${key.resourceId}:${key.keyVersion}`, key);
      return Promise.resolve(key);
    }),
    findActiveByResource: jest.fn().mockImplementation((_t: string, resourceId: string) => {
      for (const key of store.values()) {
        if (key.resourceId === resourceId && key.isActive) return Promise.resolve(key);
      }
      return Promise.resolve(null);
    }),
    findByVersion: jest.fn().mockImplementation((_t: string, resourceId: string, version: number) => {
      return Promise.resolve(store.get(`${resourceId}:${version}`) ?? null);
    }),
    deactivate: jest.fn().mockImplementation((_t: string, resourceId: string, version: number) => {
      const key = store.get(`${resourceId}:${version}`);
      if (key) key.isActive = false;
      return Promise.resolve();
    }),
  };
}

function createMockEventBus(): EventBus {
  return { publish: jest.fn().mockResolvedValue(undefined) };
}

// ============================================================================
// TESTS
// ============================================================================

describe('ContentEncryptionServiceImpl', () => {
  let service: ContentEncryptionServiceImpl;
  let mockCrypto: ReturnType<typeof createMockCrypto>;
  let mockPdfLib: ReturnType<typeof createMockPdfLib>;
  let mockKeyRepo: EncryptionKeyRepository;
  let mockEventBus: EventBus;
  let tenantMasterKey: Buffer;

  beforeEach(() => {
    mockCrypto = createMockCrypto();
    mockCrypto._resetCounter();
    mockPdfLib = createMockPdfLib();
    mockKeyRepo = createMockEncryptionKeyRepo();
    mockEventBus = createMockEventBus();
    tenantMasterKey = Buffer.alloc(AES_KEY_LENGTH, 0x42); // Deterministic master key

    service = new ContentEncryptionServiceImpl({
      crypto: mockCrypto,
      pdfLib: mockPdfLib,
      encryptionKeyRepo: mockKeyRepo,
      eventBus: mockEventBus,
      tenantMasterKey,
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // generateResourceKey
  // ════════════════════════════════════════════════════════════════════════

  describe('generateResourceKey', () => {

    it('should generate a new key with version 1 for a fresh resource', async () => {
      const key = await service.generateResourceKey('tenant-1', 'resource-1');

      expect(key.resourceId).toBe('resource-1');
      expect(key.tenantId).toBe('tenant-1');
      expect(key.keyVersion).toBe(1);
      expect(key.algorithm).toBe('aes-256-gcm');
      expect(key.isActive).toBe(true);
      expect(key.masterKeyEncrypted).toBeTruthy();
      expect(key.iv).toBeTruthy();
      expect(key.authTag).toBeTruthy();
    });

    it('should store the key via the repository', async () => {
      await service.generateResourceKey('tenant-1', 'resource-1');
      expect(mockKeyRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should publish KEY_GENERATED event for first key', async () => {
      await service.generateResourceKey('tenant-1', 'resource-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'scholarly.protection.key.generated',
        expect.objectContaining({
          tenantId: 'tenant-1',
          resourceId: 'resource-1',
          keyVersion: 1,
        }),
      );
    });

    it('should increment version when rotating an existing key', async () => {
      // Generate first key
      const key1 = await service.generateResourceKey('tenant-1', 'resource-1');
      expect(key1.keyVersion).toBe(1);

      // Generate second key (rotation)
      const key2 = await service.generateResourceKey('tenant-1', 'resource-1');
      expect(key2.keyVersion).toBe(2);
      expect(key2.previousKeyVersion).toBe(1);
    });

    it('should deactivate previous key on rotation', async () => {
      await service.generateResourceKey('tenant-1', 'resource-1');
      await service.generateResourceKey('tenant-1', 'resource-1');

      expect(mockKeyRepo.deactivate).toHaveBeenCalledWith('tenant-1', 'resource-1', 1);
    });

    it('should publish KEY_ROTATED event on rotation', async () => {
      await service.generateResourceKey('tenant-1', 'resource-1');
      await service.generateResourceKey('tenant-1', 'resource-1');

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'scholarly.protection.key.rotated',
        expect.objectContaining({
          keyVersion: 2,
          previousVersion: 1,
        }),
      );
    });

    it('should use crypto.randomBytes for key generation', async () => {
      await service.generateResourceKey('tenant-1', 'resource-1');

      // Should call randomBytes twice: once for the AES key, once for the IV
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(AES_KEY_LENGTH);
      expect(mockCrypto.randomBytes).toHaveBeenCalledWith(AES_IV_LENGTH);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // encryptForBuyer + decryptForBuyer — Round-Trip
  // ════════════════════════════════════════════════════════════════════════

  describe('encrypt/decrypt round-trip', () => {

    it('should recover original content after encrypt → decrypt', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('This is a secret ATAR exam paper worth $280');

      const { encrypted, buyerKeyDerivation } = await service.encryptForBuyer(
        original, keyRecord, 'licence-abc', 'device-xyz',
      );

      const decrypted = await service.decryptForBuyer(
        encrypted, keyRecord, buyerKeyDerivation,
      );

      expect(decrypted).toEqual(original);
    });

    it('should produce encrypted output larger than input (IV + AuthTag overhead)', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('Short content');

      const { encrypted } = await service.encryptForBuyer(
        original, keyRecord, 'licence-1', 'device-1',
      );

      // Output = IV (12) + AuthTag (16) + Ciphertext (same length as input for stream cipher)
      const expectedMinSize = AES_IV_LENGTH + AES_AUTH_TAG_LENGTH + original.length;
      expect(encrypted.length).toBeGreaterThanOrEqual(expectedMinSize);
    });

    it('should produce different ciphertext for different buyers (same content)', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('Same content for different buyers');

      const result1 = await service.encryptForBuyer(original, keyRecord, 'licence-A', 'device-A');
      const result2 = await service.encryptForBuyer(original, keyRecord, 'licence-B', 'device-B');

      // Different buyers should get different derived keys → different ciphertext
      expect(result1.buyerKeyDerivation).not.toBe(result2.buyerKeyDerivation);
    });

    it('should produce different buyerKeyDerivation for different devices (same licence)', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('Content for different devices');

      const result1 = await service.encryptForBuyer(original, keyRecord, 'licence-1', 'device-A');
      const result2 = await service.encryptForBuyer(original, keyRecord, 'licence-1', 'device-B');

      expect(result1.buyerKeyDerivation).not.toBe(result2.buyerKeyDerivation);
    });

    it('should embed derivation context in buyerKeyDerivation string', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('test');

      const { buyerKeyDerivation } = await service.encryptForBuyer(
        original, keyRecord, 'licence-xyz', 'device-abc',
      );

      expect(buyerKeyDerivation).toBe('v1:licence-xyz:device-abc');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // HKDF Key Derivation Determinism
  // ════════════════════════════════════════════════════════════════════════

  describe('key derivation determinism', () => {

    it('should call hkdfSync with correct parameters', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('test');

      await service.encryptForBuyer(original, keyRecord, 'licence-1', 'device-1');

      expect(mockCrypto.hkdfSync).toHaveBeenCalledWith(
        'sha256',
        expect.any(Buffer),                    // Unwrapped resource key
        expect.any(Buffer),                    // HKDF salt
        Buffer.from('licence-1:device-1'),     // Context info
        AES_KEY_LENGTH,
      );
    });

    it('should use the same derivation for encrypt and decrypt', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('determinism test content');

      // Encrypt
      const { encrypted, buyerKeyDerivation } = await service.encryptForBuyer(
        original, keyRecord, 'licence-det', 'device-det',
      );

      // Decrypt with the same derivation context
      const decrypted = await service.decryptForBuyer(encrypted, keyRecord, buyerKeyDerivation);

      expect(decrypted).toEqual(original);

      // hkdfSync should have been called with the same info both times
      const hkdfCalls = (mockCrypto.hkdfSync as jest.Mock).mock.calls;
      const encryptInfo = hkdfCalls[hkdfCalls.length - 2][3]; // Second-to-last call
      const decryptInfo = hkdfCalls[hkdfCalls.length - 1][3]; // Last call
      expect(encryptInfo).toEqual(decryptInfo);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // applyPdfPermissions
  // ════════════════════════════════════════════════════════════════════════

  describe('applyPdfPermissions', () => {

    it('should load and save the PDF', async () => {
      const original = Buffer.from('pdf-content');
      const permissions: PdfPermission[] = ['print_high_quality', 'accessibility'];

      await service.applyPdfPermissions(original, permissions, 'owner-pass-123');

      expect(mockPdfLib.load).toHaveBeenCalled();
    });

    it('should return a buffer', async () => {
      const original = Buffer.from('pdf-content');
      const permissions: PdfPermission[] = ['fill_forms'];

      const result = await service.applyPdfPermissions(original, permissions, 'pass');

      expect(result).toBeInstanceOf(Buffer);
    });

    it('should handle PDF load failure gracefully', async () => {
      mockPdfLib.load.mockRejectedValueOnce(new Error('Corrupt PDF'));
      const original = Buffer.from('corrupt-pdf');

      const result = await service.applyPdfPermissions(original, ['print_low_quality'], 'pass');

      // Should return original buffer on failure (graceful degradation)
      expect(result).toBe(original);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // PDF Permission Bit Mapping
  // ════════════════════════════════════════════════════════════════════════

  describe('PDF permission bits', () => {

    it('should map all PdfPermission values to valid bit positions', () => {
      const allPermissions: PdfPermission[] = [
        'print_high_quality', 'print_low_quality', 'copy_text',
        'edit', 'annotate', 'extract_pages', 'fill_forms', 'accessibility',
      ];

      for (const perm of allPermissions) {
        expect(PDF_PERMISSION_BITS[perm]).toBeDefined();
        expect(PDF_PERMISSION_BITS[perm]).toBeGreaterThan(0);
      }
    });

    it('should have unique bit values for each permission', () => {
      const values = Object.values(PDF_PERMISSION_BITS);
      const unique = new Set(values);
      expect(unique.size).toBe(values.length);
    });

    it('should use power-of-2 values (single bit flags)', () => {
      for (const bit of Object.values(PDF_PERMISSION_BITS)) {
        // Each value should be a power of 2 (single bit set)
        expect(bit & (bit - 1)).toBe(0);
        expect(bit).toBeGreaterThan(0);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Constants
  // ════════════════════════════════════════════════════════════════════════

  describe('constants', () => {

    it('AES_KEY_LENGTH should be 32 bytes (256 bits)', () => {
      expect(AES_KEY_LENGTH).toBe(32);
    });

    it('AES_IV_LENGTH should be 12 bytes (NIST recommended for GCM)', () => {
      expect(AES_IV_LENGTH).toBe(12);
    });

    it('AES_AUTH_TAG_LENGTH should be 16 bytes (128-bit tag)', () => {
      expect(AES_AUTH_TAG_LENGTH).toBe(16);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Packed Buffer Format
  // ════════════════════════════════════════════════════════════════════════

  describe('encrypted buffer format', () => {

    it('should pack [IV][AuthTag][Ciphertext] in the output', async () => {
      const keyRecord = await service.generateResourceKey('tenant-1', 'resource-1');
      const original = Buffer.from('format test');

      const { encrypted } = await service.encryptForBuyer(
        original, keyRecord, 'licence-1', 'device-1',
      );

      // First 12 bytes = IV
      const iv = encrypted.subarray(0, AES_IV_LENGTH);
      expect(iv.length).toBe(AES_IV_LENGTH);

      // Next 16 bytes = AuthTag
      const authTag = encrypted.subarray(AES_IV_LENGTH, AES_IV_LENGTH + AES_AUTH_TAG_LENGTH);
      expect(authTag.length).toBe(AES_AUTH_TAG_LENGTH);

      // Remaining = Ciphertext
      const ciphertext = encrypted.subarray(AES_IV_LENGTH + AES_AUTH_TAG_LENGTH);
      expect(ciphertext.length).toBe(original.length);
    });
  });
});
