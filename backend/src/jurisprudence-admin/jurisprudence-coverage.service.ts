import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JurisprudenceProcessingStatus } from '@prisma/client';

export interface CoverageStats {
  totalDocuments: number;
  withText: number;
  withTextPercentage: number;
  withoutText: number;
  withoutTextPercentage: number;
  withEmbeddings: number;
  withEmbeddingsPercentage: number;
  withoutEmbeddings: number;
  withoutEmbeddingsPercentage: number;
  failed: number;
  failedPercentage: number;
  byYear: Record<string, YearStats>;
  byCourt: Record<string, CourtStats>;
}

export interface YearStats {
  total: number;
  withText: number;
  withEmbeddings: number;
  failed: number;
}

export interface CourtStats {
  total: number;
  withText: number;
  withEmbeddings: number;
  failed: number;
}

@Injectable()
export class JurisprudenceCoverageService {
  private readonly logger = new Logger(JurisprudenceCoverageService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get coverage dashboard statistics
   */
  async getCoverage(organizationId: number, companyId: number): Promise<CoverageStats> {
    this.logger.log(`Generating coverage report for org ${organizationId}`);

    const documents = await this.prisma.jurisprudenceDocument.findMany({
      where: {
        organizationId,
        companyId,
        deletedAt: null,
      },
      include: {
        pages: {
          select: {
            hasText: true,
          },
        },
        embeddings: {
          select: {
            id: true,
          },
          take: 1,
        },
      },
    });

    const totalDocuments = documents.length;

    // Count documents with text (at least one page with text)
    const withText = documents.filter((d) => d.pages.some((p) => p.hasText)).length;
    const withoutText = totalDocuments - withText;

    // Count documents with embeddings
    const withEmbeddings = documents.filter((d) => d.embeddings.length > 0).length;
    const withoutEmbeddings = totalDocuments - withEmbeddings;

    // Count failed documents
    const failed = documents.filter(
      (d) => d.processingStatus === JurisprudenceProcessingStatus.FAILED,
    ).length;

    // Group by year
    const byYear: Record<string, YearStats> = {};
    for (const doc of documents) {
      const year = doc.year.toString();
      if (!byYear[year]) {
        byYear[year] = {
          total: 0,
          withText: 0,
          withEmbeddings: 0,
          failed: 0,
        };
      }

      byYear[year].total++;
      if (doc.pages.some((p) => p.hasText)) byYear[year].withText++;
      if (doc.embeddings.length > 0) byYear[year].withEmbeddings++;
      if (doc.processingStatus === JurisprudenceProcessingStatus.FAILED) byYear[year].failed++;
    }

    // Group by court
    const byCourt: Record<string, CourtStats> = {};
    for (const doc of documents) {
      const court = doc.court;
      if (!byCourt[court]) {
        byCourt[court] = {
          total: 0,
          withText: 0,
          withEmbeddings: 0,
          failed: 0,
        };
      }

      byCourt[court].total++;
      if (doc.pages.some((p) => p.hasText)) byCourt[court].withText++;
      if (doc.embeddings.length > 0) byCourt[court].withEmbeddings++;
      if (doc.processingStatus === JurisprudenceProcessingStatus.FAILED) byCourt[court].failed++;
    }

    return {
      totalDocuments,
      withText,
      withTextPercentage: totalDocuments > 0 ? (withText / totalDocuments) * 100 : 0,
      withoutText,
      withoutTextPercentage: totalDocuments > 0 ? (withoutText / totalDocuments) * 100 : 0,
      withEmbeddings,
      withEmbeddingsPercentage: totalDocuments > 0 ? (withEmbeddings / totalDocuments) * 100 : 0,
      withoutEmbeddings,
      withoutEmbeddingsPercentage: totalDocuments > 0 ? (withoutEmbeddings / totalDocuments) * 100 : 0,
      failed,
      failedPercentage: totalDocuments > 0 ? (failed / totalDocuments) * 100 : 0,
      byYear,
      byCourt,
    };
  }

  /**
   * Get failed documents with details
   */
  async getFailedDocuments(
    organizationId: number,
    companyId: number,
    limit: number = 50,
  ) {
    const failed = await this.prisma.jurisprudenceDocument.findMany({
      where: {
        organizationId,
        companyId,
        processingStatus: JurisprudenceProcessingStatus.FAILED,
        deletedAt: null,
      },
      orderBy: {
        lastAttemptAt: 'desc',
      },
      take: limit,
      select: {
        id: true,
        title: true,
        court: true,
        year: true,
        expediente: true,
        failedReason: true,
        retryCount: true,
        lastAttemptAt: true,
        createdAt: true,
      },
    });

    return failed.map((doc) => ({
      ...doc,
      canRetry: doc.retryCount < 5,
      requiresManual: doc.retryCount >= 5 || doc.failedReason?.includes('CAPTCHA'),
    }));
  }

  /**
   * Get documents pending processing
   */
  async getPendingDocuments(
    organizationId: number,
    companyId: number,
    limit: number = 50,
  ) {
    return this.prisma.jurisprudenceDocument.findMany({
      where: {
        organizationId,
        companyId,
        processingStatus: {
          in: [
            JurisprudenceProcessingStatus.PENDING,
            JurisprudenceProcessingStatus.DOWNLOADING,
            JurisprudenceProcessingStatus.EXTRACTING,
            JurisprudenceProcessingStatus.EMBEDDING,
          ],
        },
        deletedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: limit,
      select: {
        id: true,
        title: true,
        court: true,
        year: true,
        processingStatus: true,
        createdAt: true,
      },
    });
  }
}
