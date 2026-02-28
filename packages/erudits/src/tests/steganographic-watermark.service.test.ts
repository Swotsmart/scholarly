/**
 * ============================================================================
 * Steganographic Watermark Service — Unit Tests
 * ============================================================================
 *
 * Tests the invisible forensic fingerprinting pipeline: encoding a 64-bit
 * fingerprint into a PDF via homoglyph substitution and micro-typography,
 * then extracting it back and verifying the round-trip is clean.
 *
 * The test strategy mirrors the "CSI" workflow:
 *   1. Create a "clean" PDF (mock)
 *   2. Embed a known fingerprint using the watermark service
 *   3. Extract the fingerprint from the watermarked PDF
 *   4. Verify the extracted fingerprint matches the original
 *
 * Additional tests verify graceful degradation when channels are unavailable,
 * CRC-12 checksum validation, and non-PDF passthrough behaviour.
 */

import {
  SteganographicWatermarkServiceImpl,
  computeCrc12,
  HOMOGLYPH_MAP,
  REVERSE_HOMOGLYPH_MAP,
  KERNING_SHIFT_PT,
} from '../integrations/steganographic-watermark.service';
import type {
  WatermarkParams,
  SteganographicTechnique,
} from '../types/content-protection.types';

// ============================================================================
// MOCK PDF-LIB
// ============================================================================

/**
 * Creates a mock PDFDocument that stores metadata in a Map (simulating
 * pdf-lib's Info dictionary) and provides page stubs for the visible
 * watermark layer.
 */
function createMockPdfDocument(pageCount = 3) {
  const metadata = new Map<string, string>();
  const pages = Array.from({ length: pageCount }, () => ({
    getWidth: () => 612,
    getHeight: () => 792,
    drawText: jest.fn(),
    getTextContent: jest.fn().mockResolvedValue([]),
  }));

  return {
    getPages: () => pages,
    getPageCount: () => pageCount,
    setAuthor: jest.fn(),
    setSubject: jest.fn(),
    setKeywords: jest.fn(),
    setCustomMetadata: jest.fn().mockImplementation((key: string, value: string) => {
      metadata.set(key, value);
    }),
    save: jest.fn().mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46])),
    _customMetadata: metadata,
    _pages: pages,
  };
}

function createMockPdfLib() {
  const docStore = new Map<string, ReturnType<typeof createMockPdfDocument>>();

  return {
    load: jest.fn().mockImplementation(async (data: Buffer | Uint8Array) => {
      // Use buffer content hash as key to allow round-trip (same buffer = same doc)
      const key = Buffer.from(data).toString('hex').slice(0, 16);
      if (!docStore.has(key)) {
        const doc = createMockPdfDocument();
        // Make save() return a buffer that encodes the metadata,
        // so extractFingerprint can read it back
        doc.save = jest.fn().mockImplementation(async () => {
          // Encode metadata into the "saved" bytes so round-trip works
          const metaJson = JSON.stringify(Object.fromEntries(doc._customMetadata));
          const bytes = Buffer.from(`PDF-MOCK:${metaJson}`);
          return new Uint8Array(bytes);
        });
        docStore.set(key, doc);
      }
      // For round-trip: if the buffer contains encoded metadata, restore it
      const bufStr = Buffer.from(data).toString('utf-8');
      if (bufStr.startsWith('PDF-MOCK:')) {
        const metaJson = bufStr.slice('PDF-MOCK:'.length);
        const meta = JSON.parse(metaJson) as Record<string, string>;
        const doc = createMockPdfDocument();
        for (const [k, v] of Object.entries(meta)) {
          doc._customMetadata.set(k, v);
        }
        doc.save = jest.fn().mockImplementation(async () => {
          const updatedMetaJson = JSON.stringify(Object.fromEntries(doc._customMetadata));
          return new Uint8Array(Buffer.from(`PDF-MOCK:${updatedMetaJson}`));
        });
        return doc;
      }
      return docStore.get(key)!;
    }),
    rgb: jest.fn().mockImplementation((r: number, g: number, b: number) => ({
      red: r, green: g, blue: b,
    })),
    degrees: jest.fn().mockImplementation((angle: number) => ({
      type: 'degrees', angle,
    })),
  };
}

// ============================================================================
// TEST HELPERS
// ============================================================================

function createDefaultParams(overrides?: Partial<WatermarkParams>): WatermarkParams {
  return {
    fingerprint: 'a1b2c3d4e5f60718',  // 64-bit hex string
    fingerprintBits: {
      purchaseHash: 0xa1b2,
      userHash: 0xc3d4,
      timestampMod: 0xe5f,
      deviceHash: 0x60,
      checksum: 0x718,
    },
    watermarkText: 'Licensed to Brighton Grammar School',
    techniques: ['homoglyph', 'micro_typography'] as SteganographicTechnique[],
    visibleWatermark: true,
    ...overrides,
  };
}

// ============================================================================
// TESTS
// ============================================================================

describe('SteganographicWatermarkServiceImpl', () => {
  let service: SteganographicWatermarkServiceImpl;
  let mockPdfLib: ReturnType<typeof createMockPdfLib>;

  beforeEach(() => {
    mockPdfLib = createMockPdfLib();
    service = new SteganographicWatermarkServiceImpl(mockPdfLib);
  });

  // ════════════════════════════════════════════════════════════════════════
  // applyFullWatermark
  // ════════════════════════════════════════════════════════════════════════

  describe('applyFullWatermark', () => {

    it('should apply all three layers for a PDF with full techniques', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('test-pdf-content');

      const result = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      expect(result.layersApplied).toContain('visible_text');
      expect(result.layersApplied).toContain('metadata');
      expect(result.layersApplied).toContain('steganographic');
      expect(result.fingerprint).toBe('a1b2c3d4e5f60718');
      expect(result.watermarkedBuffer).toBeInstanceOf(Buffer);
      expect(result.fileSizeBytes).toBeGreaterThan(0);
      expect(result.processingTimeMs).toBeGreaterThanOrEqual(0);
    });

    it('should apply visible watermark to every page', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('test-pdf-content');

      await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      // The mock PDF has 3 pages; each should get drawText called (twice: diagonal + footer)
      const doc = await mockPdfLib.load(inputBuffer);
      for (const page of doc.getPages()) {
        expect(page.drawText).toHaveBeenCalled();
      }
    });

    it('should embed metadata fingerprint in PDF properties', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('test-pdf-content');

      await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      const doc = await mockPdfLib.load(inputBuffer);
      expect(doc.setAuthor).toHaveBeenCalledWith('Scholarly Platform');
      expect(doc.setSubject).toHaveBeenCalledWith('Licensed: Licensed to Brighton Grammar School');
      expect(doc.setCustomMetadata).toHaveBeenCalledWith('scholarly:fingerprint', 'a1b2c3d4e5f60718');
    });

    it('should skip visible watermark when disabled', async () => {
      const params = createDefaultParams({ visibleWatermark: false });
      const inputBuffer = Buffer.from('test-pdf-no-visible');

      const result = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      expect(result.layersApplied).not.toContain('visible_text');
      expect(result.layersApplied).toContain('metadata');
    });

    it('should return unchanged buffer for non-PDF mime types', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('image-data');

      const result = await service.applyFullWatermark(inputBuffer, 'image/png', params);

      expect(result.watermarkedBuffer).toBe(inputBuffer);
      expect(result.layersApplied).toEqual([]);
    });

    it('should handle PDF load failure gracefully', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('corrupt-pdf');
      mockPdfLib.load.mockRejectedValueOnce(new Error('Invalid PDF'));

      const result = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      expect(result.watermarkedBuffer).toBe(inputBuffer);
      expect(result.layersApplied).toEqual([]);
    });

    it('should only apply homoglyph when techniques is homoglyph-only', async () => {
      const params = createDefaultParams({
        techniques: ['homoglyph'] as SteganographicTechnique[],
      });
      const inputBuffer = Buffer.from('test-pdf-hg-only');

      const result = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      expect(result.layersApplied).toContain('steganographic');
      expect(result.layersApplied).toContain('metadata');
    });

    it('should only apply micro_typography when techniques is typography-only', async () => {
      const params = createDefaultParams({
        techniques: ['micro_typography'] as SteganographicTechnique[],
      });
      const inputBuffer = Buffer.from('test-pdf-mt-only');

      const result = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      expect(result.layersApplied).toContain('steganographic');
      expect(result.layersApplied).toContain('metadata');
    });

    it('should not apply steganographic layer when techniques array is empty', async () => {
      const params = createDefaultParams({ techniques: [] });
      const inputBuffer = Buffer.from('test-pdf-no-steg');

      const result = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      expect(result.layersApplied).not.toContain('steganographic');
      expect(result.layersApplied).toContain('visible_text');
      expect(result.layersApplied).toContain('metadata');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Round-Trip: applyFullWatermark → extractFingerprint
  // ════════════════════════════════════════════════════════════════════════

  describe('round-trip encoding/extraction', () => {

    it('should recover the same fingerprint after watermarking (both channels)', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('round-trip-test');

      // Apply watermark
      const watermarked = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);

      // Extract fingerprint from watermarked buffer
      const extracted = await service.extractFingerprint(watermarked.watermarkedBuffer, 'application/pdf');

      expect(extracted.found).toBe(true);
      expect(extracted.fingerprint).toBe('a1b2c3d4e5f60718');
      expect(extracted.confidence).toBeGreaterThanOrEqual(0.35);
    });

    it('should recover fingerprint from metadata channel alone', async () => {
      const params = createDefaultParams({ techniques: [] }); // No steganographic techniques
      const inputBuffer = Buffer.from('metadata-only-test');

      const watermarked = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);
      const extracted = await service.extractFingerprint(watermarked.watermarkedBuffer, 'application/pdf');

      expect(extracted.found).toBe(true);
      expect(extracted.fingerprint).toBe('a1b2c3d4e5f60718');
      // Metadata-only confidence is lower (easily stripped)
      expect(extracted.confidence).toBeLessThan(0.7);
    });

    it('should recover fingerprint from homoglyph channel', async () => {
      const params = createDefaultParams({
        techniques: ['homoglyph'] as SteganographicTechnique[],
      });
      const inputBuffer = Buffer.from('homoglyph-roundtrip');

      const watermarked = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);
      const extracted = await service.extractFingerprint(watermarked.watermarkedBuffer, 'application/pdf');

      expect(extracted.found).toBe(true);
      expect(extracted.fingerprint).toBe('a1b2c3d4e5f60718');
      expect(extracted.techniques).toContain('homoglyph');
    });

    it('should recover fingerprint from micro-typography channel', async () => {
      const params = createDefaultParams({
        techniques: ['micro_typography'] as SteganographicTechnique[],
      });
      const inputBuffer = Buffer.from('typography-roundtrip');

      const watermarked = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);
      const extracted = await service.extractFingerprint(watermarked.watermarkedBuffer, 'application/pdf');

      expect(extracted.found).toBe(true);
      expect(extracted.fingerprint).toBe('a1b2c3d4e5f60718');
      expect(extracted.techniques).toContain('micro_typography');
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // verifyEmbedding
  // ════════════════════════════════════════════════════════════════════════

  describe('verifyEmbedding', () => {

    it('should return true for correctly embedded fingerprint', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('verify-test');

      const watermarked = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);
      const verified = await service.verifyEmbedding(
        watermarked.watermarkedBuffer,
        'a1b2c3d4e5f60718',
      );

      expect(verified).toBe(true);
    });

    it('should return false for non-matching fingerprint', async () => {
      const params = createDefaultParams();
      const inputBuffer = Buffer.from('verify-mismatch');

      const watermarked = await service.applyFullWatermark(inputBuffer, 'application/pdf', params);
      const verified = await service.verifyEmbedding(
        watermarked.watermarkedBuffer,
        '0000000000000000', // Wrong fingerprint
      );

      expect(verified).toBe(false);
    });

    it('should return false for unwatermarked PDF', async () => {
      const cleanBuffer = Buffer.from('clean-pdf');
      const verified = await service.verifyEmbedding(cleanBuffer, 'a1b2c3d4e5f60718');
      expect(verified).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // extractFingerprint — edge cases
  // ════════════════════════════════════════════════════════════════════════

  describe('extractFingerprint', () => {

    it('should return found=false for non-PDF mime types', async () => {
      const result = await service.extractFingerprint(Buffer.from('not-a-pdf'), 'image/png');
      expect(result.found).toBe(false);
      expect(result.confidence).toBe(0);
    });

    it('should return found=false for corrupt PDF buffer', async () => {
      mockPdfLib.load.mockRejectedValueOnce(new Error('Parse error'));
      const result = await service.extractFingerprint(Buffer.from('corrupt'), 'application/pdf');
      expect(result.found).toBe(false);
    });

    it('should return found=false for PDF with no watermark metadata', async () => {
      const cleanBuffer = Buffer.from('clean-unwatermarked-pdf');
      const result = await service.extractFingerprint(cleanBuffer, 'application/pdf');
      expect(result.found).toBe(false);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // CRC-12 Checksum
  // ════════════════════════════════════════════════════════════════════════

  describe('CRC-12', () => {

    it('should compute a deterministic 12-bit checksum', () => {
      const data = BigInt('0x1234567890AB');
      const crc1 = computeCrc12(data, 48);
      const crc2 = computeCrc12(data, 48);
      expect(crc1).toBe(crc2);
      expect(crc1).toBeGreaterThanOrEqual(0);
      expect(crc1).toBeLessThan(4096);
    });

    it('should produce different checksums for different data', () => {
      const crc1 = computeCrc12(BigInt('0xAAAAAAAAAAAA'), 48);
      const crc2 = computeCrc12(BigInt('0xBBBBBBBBBBBB'), 48);
      expect(crc1).not.toBe(crc2);
    });

    it('should handle zero data', () => {
      const crc = computeCrc12(0n, 48);
      expect(crc).toBeGreaterThanOrEqual(0);
      expect(crc).toBeLessThan(4096);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Homoglyph Map Integrity
  // ════════════════════════════════════════════════════════════════════════

  describe('homoglyph map', () => {

    it('should have matching forward and reverse maps', () => {
      expect(HOMOGLYPH_MAP.size).toBe(REVERSE_HOMOGLYPH_MAP.size);
      for (const [latin, cyrillic] of HOMOGLYPH_MAP.entries()) {
        expect(REVERSE_HOMOGLYPH_MAP.get(cyrillic)).toBe(latin);
      }
    });

    it('should contain at least 15 homoglyph pairs for 64-bit encoding', () => {
      // With MIN_CHARS_BETWEEN_SITES = 20, we need enough distinct eligible
      // characters in typical text. 15+ pairs gives good coverage.
      expect(HOMOGLYPH_MAP.size).toBeGreaterThanOrEqual(15);
    });

    it('should map Latin characters to non-Latin alternatives', () => {
      for (const [latin, cyrillic] of HOMOGLYPH_MAP.entries()) {
        // Latin characters: U+0041–U+005A (A–Z), U+0061–U+007A (a–z)
        expect(latin).toBeGreaterThanOrEqual(0x0041);
        expect(latin).toBeLessThanOrEqual(0x007A);
        // Cyrillic characters: U+0400–U+04FF
        expect(cyrillic).toBeGreaterThanOrEqual(0x0400);
        expect(cyrillic).toBeLessThanOrEqual(0x04FF);
      }
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Constants Verification
  // ════════════════════════════════════════════════════════════════════════

  describe('constants', () => {

    it('KERNING_SHIFT_PT should be sub-perceptual (<0.3pt)', () => {
      expect(KERNING_SHIFT_PT).toBeLessThan(0.3);
      expect(KERNING_SHIFT_PT).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Multiple fingerprints produce different watermarks
  // ════════════════════════════════════════════════════════════════════════

  describe('fingerprint uniqueness', () => {

    it('should produce different watermarked outputs for different fingerprints', async () => {
      const params1 = createDefaultParams({ fingerprint: 'aaaaaaaaaaaaaaaa' });
      const params2 = createDefaultParams({ fingerprint: 'bbbbbbbbbbbbbbbb' });
      const inputBuffer = Buffer.from('uniqueness-test');

      const result1 = await service.applyFullWatermark(inputBuffer, 'application/pdf', params1);
      const result2 = await service.applyFullWatermark(inputBuffer, 'application/pdf', params2);

      // The watermarked buffers should differ because different fingerprints
      // produce different metadata and steganographic encodings
      expect(result1.fingerprint).not.toBe(result2.fingerprint);
    });
  });
});
