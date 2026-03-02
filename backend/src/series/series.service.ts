import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';

@Injectable()
export class SeriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tenantContext: TenantContextService,
  ) {}

  async checkSeries(serial: string): Promise<{ exists: boolean }> {
    const context = this.tenantContext.getContext();
    const organizationId = context.organizationId ?? null;

    const where =
      organizationId === null
        ? { serial, organizationId: null }
        : { serial, organizationId };

    const existingSeries = await this.prisma.entryDetailSeries.findFirst({
      where,
    });

    return { exists: !!existingSeries };
  }

  async batchCheckSeries(
    serials: string[],
  ): Promise<{ serial: string; exists: boolean }[]> {
    if (!serials.length) return [];

    const context = this.tenantContext.getContext();
    const organizationId = context.organizationId ?? null;

    if (organizationId === null) {
      return serials.map((serial) => ({ serial, exists: false }));
    }

    const existing = await this.prisma.entryDetailSeries.findMany({
      where: {
        serial: { in: serials },
        organizationId,
      },
      select: { serial: true },
    });

    const existingSet = new Set(existing.map((e) => e.serial));

    return serials.map((serial) => ({
      serial,
      exists: existingSet.has(serial),
    }));
  }
}
