import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InvoiceTemplatesMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  private extractConfidence(json: Prisma.JsonValue | null) {
    if (typeof json !== 'object' || json === null) {
      return null;
    }
    if ('mlConfidence' in json) {
      const value = (json as any).mlConfidence;
      return typeof value === 'number' ? value : Number(value) || null;
    }
    return null;
  }

  async getMonitoringStats() {
    const totalProcessed = await this.prisma.invoiceSample.count();
    const failedExtractions = await this.prisma.invoiceSample.count({
      where: { extractionStatus: 'FAILED' },
    });

    const samples = await this.prisma.invoiceSample.findMany({
      where: { extractionResult: { not: Prisma.JsonNull } },
      select: { id: true, extractionResult: true },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const confidenceThreshold = Number(
      process.env.INVOICE_CONFIDENCE_THRESHOLD ?? 0.45,
    );
    const entries = samples.map((sample) => ({
      id: sample.id,
      providerId: null,
      mlConfidence: this.extractConfidence(sample.extractionResult),
    }));

    const confidences = entries
      .map((entry) => entry.mlConfidence)
      .filter((value): value is number => typeof value === 'number');

    const averageConfidence =
      confidences.length > 0
        ? confidences.reduce((sum, value) => sum + value, 0) /
          confidences.length
        : null;

    const lowConfidenceSamples = entries
      .filter(
        (entry) =>
          typeof entry.mlConfidence === 'number' &&
          entry.mlConfidence < confidenceThreshold,
      )
      .map((entry) => ({
        id: entry.id,
        providerId: entry.providerId ?? null,
        mlConfidence: entry.mlConfidence as number,
      }));

    return {
      totalProcessed,
      failedExtractions,
      averageConfidence,
      lowConfidenceSamples,
    };
  }
}
