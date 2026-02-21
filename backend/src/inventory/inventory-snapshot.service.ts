import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface SnapshotResult {
  month: number;
  year: number;
  totalInventoryValue: number;
  totalProducts: number;
  totalUnits: number;
  created: boolean; // true si se creó nuevo, false si ya existía
}

@Injectable()
export class InventorySnapshotService {
  private readonly logger = new Logger(InventorySnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crea un snapshot del inventario para un mes y año específico
   * Si ya existe un snapshot para ese mes/año, lo actualiza
   */
  async createSnapshot(
    month: number,
    year: number,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<SnapshotResult> {
    this.logger.log(
      `Creando snapshot de inventario para ${month}/${year}, org=${organizationId}, company=${companyId}`,
    );

    // 1. Construir filtro para productos
    const productFilter: any = {};
    if (organizationId !== null && organizationId !== undefined) {
      productFilter.organizationId = organizationId;
    }
    if (companyId !== null && companyId !== undefined) {
      productFilter.companyId = companyId;
    }

    // 2. Obtener productos con stock > 0
    const productsWithStock = await this.prisma.product.findMany({
      where: productFilter,
      select: {
        id: true,
        inventory: {
          select: {
            storeOnInventory: {
              where: {
                stock: { gt: 0 },
              },
              select: {
                stock: true,
              },
            },
          },
        },
        entryDetail: {
          select: {
            price: true,
            createdAt: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 1, // Último precio de compra
        },
      },
    });

    // 3. Calcular valor total del inventario
    let totalInventoryValue = 0;
    let totalProducts = 0;
    let totalUnits = 0;

    for (const product of productsWithStock) {
      const lastPurchasePrice = product.entryDetail[0]?.price ?? 0;

      // Sumar stock de todas las tiendas
      const productStock = product.inventory.reduce((sum, inv) => {
        return (
          sum +
          inv.storeOnInventory.reduce(
            (storeSum, store) => storeSum + store.stock,
            0,
          )
        );
      }, 0);

      if (productStock > 0) {
        totalProducts++;
        totalUnits += productStock;

        if (lastPurchasePrice > 0) {
          totalInventoryValue += productStock * lastPurchasePrice;
        }
      }
    }

    // 4. Guardar o actualizar snapshot
    const snapshot = await this.prisma.inventorySnapshot.upsert({
      where: {
        organizationId_companyId_year_month: {
          organizationId: (organizationId !== undefined ? organizationId : null) as any,
          companyId: (companyId !== undefined ? companyId : null) as any,
          year,
          month,
        },
      },
      create: {
        month,
        year,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalProducts,
        totalUnits,
        organizationId: organizationId !== undefined ? organizationId : null,
        companyId: companyId !== undefined ? companyId : null,
      },
      update: {
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        totalProducts,
        totalUnits,
      },
    });

    const created = snapshot.createdAt === snapshot.updatedAt;

    this.logger.log(
      `Snapshot ${created ? 'creado' : 'actualizado'}: ${month}/${year} - ` +
        `Valor: S/. ${totalInventoryValue.toFixed(2)}, ` +
        `Productos: ${totalProducts}, Unidades: ${totalUnits}`,
    );

    return {
      month,
      year,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalProducts,
      totalUnits,
      created,
    };
  }

  /**
   * Crea snapshot para el mes actual
   */
  async createCurrentMonthSnapshot(
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<SnapshotResult> {
    const now = new Date();
    return this.createSnapshot(
      now.getMonth() + 1, // JavaScript months are 0-indexed
      now.getFullYear(),
      organizationId,
      companyId,
    );
  }

  /**
   * Obtiene todos los snapshots históricos para una organización/empresa
   */
  async getSnapshots(
    organizationId?: number | null,
    companyId?: number | null,
    limit: number = 12,
  ) {
    const filter: any = {};
    if (organizationId !== null && organizationId !== undefined) {
      filter.organizationId = organizationId;
    }
    if (companyId !== null && companyId !== undefined) {
      filter.companyId = companyId;
    }

    return this.prisma.inventorySnapshot.findMany({
      where: filter,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      take: limit,
    });
  }

  /**
   * Obtiene un snapshot específico por mes/año
   */
  async getSnapshot(
    month: number,
    year: number,
    organizationId?: number | null,
    companyId?: number | null,
  ) {
    return this.prisma.inventorySnapshot.findUnique({
      where: {
        organizationId_companyId_year_month: {
          organizationId: (organizationId !== undefined ? organizationId : null) as any,
          companyId: (companyId !== undefined ? companyId : null) as any,
          year,
          month,
        },
      },
    });
  }
}
