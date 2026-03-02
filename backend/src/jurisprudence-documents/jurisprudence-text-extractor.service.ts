import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JurisprudenceProcessingStatus } from '@prisma/client';
import { JurisprudenceEmbeddingService } from './jurisprudence-embedding.service';
import pdfParse from 'pdf-parse';
import * as fs from 'fs/promises';

@Injectable()
export class JurisprudenceTextExtractorService {
  private readonly logger = new Logger(JurisprudenceTextExtractorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddingService: JurisprudenceEmbeddingService,
  ) {}

  /**
   * Extract text from a document's PDF and create page records.
   * After extraction, triggers embedding generation if text was found.
   */
  async extractAndProcess(documentId: number): Promise<void> {
    this.logger.log(`Starting text extraction for document ${documentId}`);

    const document = await this.prisma.jurisprudenceDocument.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    if (!document.pdfPath) {
      throw new Error(`Document ${documentId} has no PDF path`);
    }

    try {
      // Mark as extracting
      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: { processingStatus: JurisprudenceProcessingStatus.EXTRACTING },
      });

      // Read and parse the PDF
      const pages = await this.parsePdf(document.pdfPath);
      this.logger.log(`Extracted ${pages.length} pages from document ${documentId}`);

      // Delete existing pages (if reprocessing)
      await this.prisma.jurisprudenceDocumentPage.deleteMany({
        where: { documentId },
      });

      // Create page records
      const hasAnyText = pages.some((p) => p.text.trim().length > 0);

      if (pages.length > 0) {
        await this.prisma.jurisprudenceDocumentPage.createMany({
          data: pages.map((p) => ({
            documentId,
            organizationId: document.organizationId,
            companyId: document.companyId,
            pageNumber: p.pageNum,
            rawText: p.text,
            hasText: p.text.trim().length > 0,
            ocrRequired: !p.text.trim(),
          })),
        });
      }

      if (!hasAnyText) {
        // PDF has no extractable text — probably a scanned image
        this.logger.warn(`Document ${documentId} has no extractable text - may need OCR`);
        await this.prisma.jurisprudenceDocument.update({
          where: { id: documentId },
          data: { processingStatus: JurisprudenceProcessingStatus.OCR_REQUIRED },
        });
        return;
      }

      // Trigger embedding generation
      this.logger.log(`Triggering embedding generation for document ${documentId}`);
      try {
        await this.embeddingService.processDocument(documentId);
      } catch (error) {
        this.logger.error(
          `Embedding generation failed for document ${documentId}: ${(error as Error).message}`,
        );
        // Don't fail the whole extraction — text was extracted successfully
        await this.prisma.jurisprudenceDocument.update({
          where: { id: documentId },
          data: {
            processingStatus: JurisprudenceProcessingStatus.COMPLETED_WITH_WARNINGS,
            failedReason: `Text extracted but embedding failed: ${(error as Error).message}`,
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `Text extraction failed for document ${documentId}: ${(error as Error).message}`,
      );
      await this.prisma.jurisprudenceDocument.update({
        where: { id: documentId },
        data: {
          processingStatus: JurisprudenceProcessingStatus.FAILED,
          failedReason: (error as Error).message,
          retryCount: { increment: 1 },
          lastAttemptAt: new Date(),
        },
      });
      throw error;
    }
  }

  /**
   * Parse a PDF file and return text content per page.
   */
  private async parsePdf(
    filePath: string,
  ): Promise<Array<{ pageNum: number; text: string }>> {
    const buffer = await fs.readFile(filePath);

    // pdf-parse returns the combined text; we use the page render callback
    // to capture per-page text
    const pageTexts: Array<{ pageNum: number; text: string }> = [];

    const pdfData = await pdfParse(buffer, {
      // Custom page renderer to get per-page text
      pagerender: async (pageData: any) => {
        const textContent = await pageData.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        return pageText;
      },
    });

    // If per-page extraction didn't work, split by form feeds or distribute evenly
    if (pageTexts.length === 0 && pdfData.numpages > 0) {
      // pdf-parse concatenates all text; split as best we can
      const fullText = pdfData.text || '';

      if (pdfData.numpages === 1) {
        pageTexts.push({ pageNum: 1, text: fullText });
      } else {
        // Try splitting by form feed characters (common in PDFs)
        const pageSplits = fullText.split(/\f/);

        if (pageSplits.length >= pdfData.numpages) {
          // Good split — form feeds align with pages
          for (let i = 0; i < pdfData.numpages; i++) {
            pageTexts.push({
              pageNum: i + 1,
              text: pageSplits[i]?.trim() || '',
            });
          }
        } else {
          // Fallback: put all text on page 1
          pageTexts.push({ pageNum: 1, text: fullText });
          for (let i = 1; i < pdfData.numpages; i++) {
            pageTexts.push({ pageNum: i + 1, text: '' });
          }
        }
      }
    }

    return pageTexts;
  }

  /**
   * Process all documents in PENDING status for a given organization.
   */
  async processAllPending(organizationId: number, companyId: number): Promise<number> {
    const pending = await this.prisma.jurisprudenceDocument.findMany({
      where: {
        organizationId,
        companyId,
        processingStatus: JurisprudenceProcessingStatus.PENDING,
        deletedAt: null,
      },
      select: { id: true },
      take: 50, // Process in batches of 50
    });

    this.logger.log(`Found ${pending.length} pending documents to process`);

    let processed = 0;
    for (const doc of pending) {
      try {
        await this.extractAndProcess(doc.id);
        processed++;
      } catch (error) {
        this.logger.error(
          `Failed to process document ${doc.id}: ${(error as Error).message}`,
        );
        // Continue processing other documents
      }
    }

    return processed;
  }
}
