/**
 * PDF OCR Utility
 *
 * Handles scanned/image-based PDFs that contain no extractable text.
 * Pipeline: PDF → render page via pdfjs-dist + canvas → tesseract.js OCR → text
 *
 * Uses multi-pass OCR at different DPIs to maximize data extraction:
 *   - 300 DPI: best for headers, structured text, and some product lines
 *   - 250 DPI: better for price columns in invoice tables
 *
 * Used as fallback when pdf-parse returns empty text (<10 chars).
 */

import { Logger } from '@nestjs/common';
import { createCanvas } from 'canvas';
import Tesseract from 'tesseract.js';

const logger = new Logger('PdfOcr');

/**
 * Render the first page of a PDF buffer to a PNG image buffer.
 * Uses pdfjs-dist (Mozilla) + node-canvas for server-side rendering.
 */
async function renderPdfPageToImage(
  pdfBuffer: Buffer,
  dpi = 300,
): Promise<Buffer> {
  // Dynamic import because pdfjs-dist is ESM-only in v4+
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBuffer),
    // Disable font/image workers for server-side rendering
    useSystemFonts: true,
    isEvalSupported: false,
  });

  const pdf = await loadingTask.promise;
  const page = await pdf.getPage(1);

  // Scale for target DPI (PDF default is 72 DPI)
  const scale = dpi / 72;
  const viewport = page.getViewport({ scale });

  const canvas = createCanvas(viewport.width, viewport.height);
  const context = canvas.getContext('2d');

  // pdfjs render expects a CanvasRenderingContext2D-like object
  await page.render({
    canvasContext: context as any,
    viewport,
  }).promise;

  // Export as PNG buffer
  return canvas.toBuffer('image/png');
}

/**
 * Run OCR on a PNG image buffer using tesseract.js.
 * Uses Spanish language for better recognition of Peruvian invoices.
 */
async function ocrImage(imageBuffer: Buffer): Promise<string> {
  const {
    data: { text },
  } = await Tesseract.recognize(imageBuffer, 'spa', {
    logger: (info) => {
      if (info.status === 'recognizing text') {
        // Only log progress at 25% intervals to avoid spam
        const pct = Math.round((info.progress ?? 0) * 100);
        if (pct % 25 === 0) {
          logger.debug(`OCR progress: ${pct}%`);
        }
      }
    },
  });

  return text;
}

/**
 * Extract text from a scanned/image PDF using multi-pass OCR.
 *
 * Runs OCR at two DPI levels (300 and 250) in parallel because different
 * resolutions produce better results for different parts of the document.
 * Both texts are returned separated by a marker so the frontend extractor
 * can use data from whichever pass captured it best.
 *
 * @param pdfBuffer - The raw PDF file buffer
 * @returns Combined OCR text from both passes
 */
export async function extractTextWithOCR(
  pdfBuffer: Buffer,
): Promise<string> {
  logger.log('Starting multi-pass OCR pipeline for scanned PDF...');
  const startTime = Date.now();

  try {
    // Render at both DPIs in parallel
    logger.debug('Rendering PDF at 300 DPI and 250 DPI...');
    const [img300, img250] = await Promise.all([
      renderPdfPageToImage(pdfBuffer, 300),
      renderPdfPageToImage(pdfBuffer, 250),
    ]);
    logger.debug(
      `Rendered: 300dpi=${(img300.length / 1024).toFixed(0)}KB, 250dpi=${(img250.length / 1024).toFixed(0)}KB`,
    );

    // Run OCR on both in parallel
    logger.debug('Running dual OCR with tesseract.js (spa)...');
    const [text300, text250] = await Promise.all([
      ocrImage(img300),
      ocrImage(img250),
    ]);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.log(
      `Multi-pass OCR complete in ${elapsed}s — 300dpi: ${text300.length} chars, 250dpi: ${text250.length} chars`,
    );

    // Return both texts separated by a marker for the frontend to merge
    return `${text300}\n===OCR_PASS_250===\n${text250}`;
  } catch (error) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    logger.error(`OCR failed after ${elapsed}s: ${error}`);
    throw error;
  }
}
