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
}
