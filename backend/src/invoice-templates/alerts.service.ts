import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class InvoiceTemplatesAlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAlerts() {
    const recentFailures = await this.prisma.invoiceExtractionLog.findMany({
      where: { level: { in: ['ERROR', 'WARN'] } },
      include: {
        sample: {
          include: {
            template: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    const reviewDays = Number(process.env.INVOICE_REVIEW_DAYS ?? 30);
    const thresholdDate = new Date(Date.now() - reviewDays * 24 * 60 * 60 * 1000);
    const reviewDue = await this.prisma.invoiceTemplate.findMany({
      where: { updatedAt: { lt: thresholdDate } },
      select: {
        id: true,
        documentType: true,
        providerName: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: 'asc' },
      take: 5,
    });

    return {
      failureAlerts: recentFailures.map((log) => ({
        id: log.id,
        sampleId: log.sampleId,
        template: log.sample?.template?.documentType ?? null,
        message: log.message,
        createdAt: log.createdAt,
      })),
      reviewDueTemplates: reviewDue,
    };
  }
}
