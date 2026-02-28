/**
 * ============================================================================
 * PDF Watermark Service — Production Integration
 * ============================================================================
 *
 * Implements the WatermarkService interface for applying invisible and
 * visible watermarks to downloaded resources. Think of it as the security
 * stamp at a library — it doesn't stop you from reading the book, but it
 * makes it traceable if someone redistributes it without authorisation.
 *
 * For Érudits' $280 ATAR exam packs with school licensing, watermarking is
 * a business requirement: each downloaded PDF is stamped with the licensee's
 * institution name and a unique download fingerprint, creating a paper trail
 * that discourages unauthorised sharing.
 *
 * ## Watermark Strategy
 *   - PDF files: Uses pdf-lib to overlay text + add metadata
 *   - Other files: Returns the buffer unchanged (watermarking only applies to PDFs)
 *
 * ## Dependencies
 *   pdf-lib — Pure JS PDF manipulation (no native dependencies)
 *
 * @module erudits/integrations/watermark
 * @version 1.0.0
 */

import type { WatermarkService } from '../services/storefront.service';

// ── pdf-lib Type Stubs ──

interface PDFDocument {
  getPages(): PDFPage[];
  setAuthor(author: string): void;
  setSubject(subject: string): void;
  setKeywords(keywords: string[]): void;
  setCustomMetadata(key: string, value: string): void;
  save(): Promise<Uint8Array>;
}

interface PDFPage {
  getWidth(): number;
  getHeight(): number;
  drawText(text: string, options: {
    x: number;
    y: number;
    size: number;
    color: { red: number; green: number; blue: number };
    opacity: number;
    rotate?: { type: string; angle: number } | undefined;
  }): void;
}

interface PDFLib {
  load(data: Buffer | Uint8Array): Promise<PDFDocument>;
  rgb(r: number, g: number, b: number): { red: number; green: number; blue: number };
  degrees(angle: number): { type: string; angle: number };
}

// ── Implementation ──

export class PdfWatermarkServiceImpl implements WatermarkService {
  constructor(
    private readonly pdfLib: PDFLib,
  ) {}

  /**
   * Apply a watermark to a file buffer.
   *
   * For PDF files: adds a diagonal watermark text on every page plus
   * metadata embedding. The watermark is semi-transparent and positioned
   * diagonally across the page — visible enough to deter sharing but not
   * so prominent that it impairs readability.
   *
   * For non-PDF files: returns the original buffer unchanged. Future
   * iterations could add image watermarking for PNG/JPEG resources.
   */
  async applyWatermark(
    fileBuffer: Buffer,
    mimeType: string,
    watermarkText: string,
  ): Promise<Buffer> {
    if (mimeType !== 'application/pdf') {
      return fileBuffer;
    }

    try {
      const pdfDoc = await this.pdfLib.load(fileBuffer);

      // Add visible diagonal watermark to every page
      const pages = pdfDoc.getPages();
      for (const page of pages) {
        this.applyPageWatermark(page, watermarkText);
      }

      // Embed watermark info in PDF metadata (invisible but extractable)
      const fingerprint = this.generateFingerprint(watermarkText);
      pdfDoc.setAuthor('Scholarly Platform');
      pdfDoc.setSubject(`Licensed: ${watermarkText}`);
      pdfDoc.setKeywords(['scholarly', 'licensed', fingerprint]);
      pdfDoc.setCustomMetadata('scholarly:licensee', watermarkText);
      pdfDoc.setCustomMetadata('scholarly:fingerprint', fingerprint);
      pdfDoc.setCustomMetadata('scholarly:timestamp', new Date().toISOString());

      const watermarkedBytes = await pdfDoc.save();
      return Buffer.from(watermarkedBytes);
    } catch (err) {
      // If watermarking fails, return the original rather than blocking
      // the download. Log the error for investigation.
      console.error(`[Watermark] PDF watermarking failed:`, (err as Error).message);
      return fileBuffer;
    }
  }

  // ── Private Helpers ──

  private applyPageWatermark(page: PDFPage, text: string): void {
    const width = page.getWidth();
    const height = page.getHeight();

    // Large diagonal watermark across the centre
    page.drawText(text, {
      x: width * 0.1,
      y: height * 0.4,
      size: 36,
      color: this.pdfLib.rgb(0.8, 0.8, 0.8),   // Light grey
      opacity: 0.15,                               // Very transparent
      rotate: this.pdfLib.degrees(45),
    });

    // Small footer watermark with timestamp
    const footerText = `Licensed to ${text} | ${new Date().toISOString().split('T')[0]}`;
    page.drawText(footerText, {
      x: 20,
      y: 15,
      size: 6,
      color: this.pdfLib.rgb(0.7, 0.7, 0.7),
      opacity: 0.3,
    });
  }

  private generateFingerprint(text: string): string {
    // Combine watermark text with timestamp for a unique fingerprint
    const source = `${text}:${Date.now()}:${Math.random()}`;
    let hash = 0;
    for (let i = 0; i < source.length; i++) {
      const char = source.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash |= 0;
    }
    return `sf-${Math.abs(hash).toString(36)}`;
  }
}

// ── Factory ──

/**
 * Create a production watermark service.
 *
 * Usage:
 *   import { PDFDocument, rgb, degrees } from 'pdf-lib';
 *   const pdfLib = { load: PDFDocument.load, rgb, degrees };
 *   const watermark = createPdfWatermarkService(pdfLib);
 */
export function createPdfWatermarkService(pdfLib: PDFLib): PdfWatermarkServiceImpl {
  return new PdfWatermarkServiceImpl(pdfLib);
}
