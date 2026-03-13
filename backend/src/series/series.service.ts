import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TenantContextService } from 'src/tenancy/tenant-context.service';
import { RegisterSeriesDto } from './dto/create-series.dto';

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

  /**
   * Register a new series for a product in a store.
   * Links it to the most recent EntryDetail for that product+store.
   * Used when the user forgot to add series during the purchase entry.
   */
  async registerSeries(
    dto: RegisterSeriesDto,
  ): Promise<{ id: number; serial: string; status: string }> {
    const context = this.tenantContext.getContext();
    const organizationId = context.organizationId ?? null;
    const serial = dto.serial.trim();

    if (!serial) {
      throw new BadRequestException('El número de serie no puede estar vacío.');
    }

    // 1. Check uniqueness within organization
    const existing = await this.prisma.entryDetailSeries.findFirst({
      where: organizationId !== null
        ? { serial, organizationId }
        : { serial, organizationId: null },
    });
    if (existing) {
      throw new BadRequestException(
        `La serie "${serial}" ya existe en la organización.`,
      );
    }

    // 2. Find the most recent EntryDetail for this product + store
    const entryDetail = await this.prisma.entryDetail.findFirst({
      where: {
        productId: dto.productId,
        entry: {
          storeId: dto.storeId,
          ...(organizationId !== null ? { organizationId } : {}),
        },
      },
      orderBy: { id: 'desc' },
    });

    if (!entryDetail) {
      throw new NotFoundException(
        'No se encontró un detalle de entrada para este producto en esta tienda. Debe crear una entrada (compra) primero.',
      );
    }

    // 3. Create the EntryDetailSeries record
    try {
      const created = await this.prisma.entryDetailSeries.create({
        data: {
          entryDetailId: entryDetail.id,
          serial,
          organizationId,
          storeId: dto.storeId,
          status: 'active',
        },
      });

      return { id: created.id, serial: created.serial, status: created.status };
    } catch (error: any) {
      // Handle race condition: unique constraint violation
      if (error?.code === 'P2002') {
        throw new BadRequestException(
          `La serie "${serial}" ya existe en la organización.`,
        );
      }
      throw error;
    }
  }
}
