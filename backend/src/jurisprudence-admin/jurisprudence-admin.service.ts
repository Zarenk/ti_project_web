import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface QueryStats {
  totalQueries: number;
  avgConfidence: number;
  withValidCitations: number;
  withValidCitationsPercentage: number;
  needsHumanReview: number;
  needsHumanReviewPercentage: number;
  avgResponseTimeMs: number;
  avgCostUsd: number;
  totalCostUsd: number;
  p50Latency: number;
  p95Latency: number;
  byConfidence: Record<string, number>;
}

@Injectable()
export class JurisprudenceAdminService {
  private readonly logger = new Logger(JurisprudenceAdminService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Get query statistics
   */
  async getQueryStats(organizationId: number, companyId: number): Promise<QueryStats> {
    this.logger.log(`Generating query stats for org ${organizationId}`);

    const queries = await this.prisma.jurisprudenceQuery.findMany({
      where: {
        organizationId,
        companyId,
      },
      select: {
        confidence: true,
        hasValidCitations: true,
        needsHumanReview: true,
        responseTime: true,
        costUsd: true,
      },
    });

    const totalQueries = queries.length;

    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        avgConfidence: 0,
        withValidCitations: 0,
        withValidCitationsPercentage: 0,
        needsHumanReview: 0,
        needsHumanReviewPercentage: 0,
        avgResponseTimeMs: 0,
        avgCostUsd: 0,
        totalCostUsd: 0,
        p50Latency: 0,
        p95Latency: 0,
        byConfidence: {},
      };
    }

    // Count by metrics
    const withValidCitations = queries.filter((q) => q.hasValidCitations).length;
    const needsHumanReview = queries.filter((q) => q.needsHumanReview).length;

    // Calculate averages
    const totalResponseTime = queries.reduce((sum, q) => sum + q.responseTime, 0);
    const avgResponseTimeMs = totalResponseTime / totalQueries;

    const totalCostUsd = queries.reduce((sum, q) => sum + Number(q.costUsd), 0);
    const avgCostUsd = totalCostUsd / totalQueries;

    // Calculate confidence score (ALTA=1, MEDIA=0.66, BAJA=0.33, NO_CONCLUYENTE=0)
    const confidenceScores: number[] = queries.map((q) => {
      switch (q.confidence) {
        case 'ALTA':
          return 1;
        case 'MEDIA':
          return 0.66;
        case 'BAJA':
          return 0.33;
        default:
          return 0;
      }
    });
    const avgConfidence = confidenceScores.reduce((sum: number, s: number) => sum + s, 0) / totalQueries;

    // Calculate percentiles
    const sortedResponseTimes = [...queries].map((q) => q.responseTime).sort((a, b) => a - b);
    const p50Index = Math.floor(totalQueries * 0.5);
    const p95Index = Math.floor(totalQueries * 0.95);
    const p50Latency = sortedResponseTimes[p50Index] || 0;
    const p95Latency = sortedResponseTimes[p95Index] || 0;

    // Count by confidence
    const byConfidence: Record<string, number> = {};
    for (const query of queries) {
      const conf = query.confidence;
      byConfidence[conf] = (byConfidence[conf] || 0) + 1;
    }

    return {
      totalQueries,
      avgConfidence,
      withValidCitations,
      withValidCitationsPercentage: (withValidCitations / totalQueries) * 100,
      needsHumanReview,
      needsHumanReviewPercentage: (needsHumanReview / totalQueries) * 100,
      avgResponseTimeMs,
      avgCostUsd,
      totalCostUsd,
      p50Latency,
      p95Latency,
      byConfidence,
    };
  }

  /**
   * Trigger reprocessing of documents
   */
  async reprocessDocuments(
    organizationId: number,
    companyId: number,
    filters?: {
      documentIds?: number[];
      court?: string;
      year?: number;
      failedOnly?: boolean;
    },
  ) {
    this.logger.log(`Reprocessing documents for org ${organizationId} with filters:`, filters);

    const where: any = {
      organizationId,
      companyId,
      deletedAt: null,
    };

    if (filters?.documentIds?.length) {
      where.id = { in: filters.documentIds };
    }

    if (filters?.court) {
      where.court = filters.court;
    }

    if (filters?.year) {
      where.year = filters.year;
    }

    if (filters?.failedOnly) {
      where.processingStatus = 'FAILED';
    }

    // Reset documents to PENDING status
    const result = await this.prisma.jurisprudenceDocument.updateMany({
      where,
      data: {
        processingStatus: 'PENDING',
        failedReason: null,
        lastAttemptAt: new Date(),
      },
    });

    this.logger.log(`Marked ${result.count} documents for reprocessing`);

    // TODO: Enqueue documents to extract queue

    return {
      success: true,
      count: result.count,
      message: `${result.count} documents marked for reprocessing`,
    };
  }

  /**
   * Get overall system health
   */
  async getSystemHealth(organizationId: number, companyId: number) {
    const [
      totalDocuments,
      pendingDocuments,
      failedDocuments,
      completedDocuments,
      totalQueries,
      recentQueries,
    ] = await Promise.all([
      this.prisma.jurisprudenceDocument.count({
        where: { organizationId, companyId, deletedAt: null },
      }),
      this.prisma.jurisprudenceDocument.count({
        where: {
          organizationId,
          companyId,
          deletedAt: null,
          processingStatus: { in: ['PENDING', 'DOWNLOADING', 'EXTRACTING', 'EMBEDDING'] },
        },
      }),
      this.prisma.jurisprudenceDocument.count({
        where: {
          organizationId,
          companyId,
          deletedAt: null,
          processingStatus: 'FAILED',
        },
      }),
      this.prisma.jurisprudenceDocument.count({
        where: {
          organizationId,
          companyId,
          deletedAt: null,
          processingStatus: 'COMPLETED',
        },
      }),
      this.prisma.jurisprudenceQuery.count({
        where: { organizationId, companyId },
      }),
      this.prisma.jurisprudenceQuery.count({
        where: {
          organizationId,
          companyId,
          createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }, // Last 24h
        },
      }),
    ]);

    const completionRate = totalDocuments > 0 ? (completedDocuments / totalDocuments) * 100 : 0;
    const failureRate = totalDocuments > 0 ? (failedDocuments / totalDocuments) * 100 : 0;

    return {
      documents: {
        total: totalDocuments,
        pending: pendingDocuments,
        failed: failedDocuments,
        completed: completedDocuments,
        completionRate,
        failureRate,
      },
      queries: {
        total: totalQueries,
        last24h: recentQueries,
      },
      health: failureRate < 5 && completionRate > 90 ? 'HEALTHY' : failureRate > 20 ? 'CRITICAL' : 'WARNING',
    };
  }
}
