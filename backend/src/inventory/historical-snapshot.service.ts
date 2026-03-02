import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { InventorySnapshot } from '@prisma/client';

interface HistoricalStockData {
  productId: number;
  productName: string;
  storeId: number;
  storeName: string;
  historicalStock: number; // Stock al final del mes histórico
  lastPurchasePrice: number; // Último precio de compra vigente en ese mes
  totalValue: number; // stock × precio
}

@Injectable()
export class HistoricalSnapshotService {
  private readonly logger = new Logger(HistoricalSnapshotService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Calcula el stock histórico de un mes específico reconstruyéndolo desde el stock actual
   * Algoritmo: Stock en Mes X = Stock Actual - (Entradas después de X) + (Salidas después de X)
   */
  async calculateHistoricalSnapshot(
    month: number,
    year: number,
    organizationId?: number,
    companyId?: number,
  ) {
    this.logger.log(
      `📊 Calculando snapshot histórico para ${month}/${year} - Org: ${organizationId}, Company: ${companyId}`,
    );

    // 1. Calcular el rango de fechas del mes histórico
    const startOfMonth = new Date(year, month - 1, 1); // Primer día del mes
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999); // Último día del mes

    this.logger.log(
      `📅 Rango del mes: ${startOfMonth.toISOString()} a ${endOfMonth.toISOString()}`,
    );

    // 2. Obtener todos los productos con stock actual en las tiendas de esta org/company
    const storeFilter: any = {};
    if (organizationId !== undefined && organizationId !== null) {
      storeFilter.organizationId = organizationId;
    }
    if (companyId !== undefined && companyId !== null) {
      storeFilter.companyId = companyId;
    }

    const currentInventory = await this.prisma.inventory.findMany({
      where: {
        ...(organizationId !== undefined && organizationId !== null
          ? { organizationId }
          : {}),
      },
      include: {
        product: true,
        storeOnInventory: {
          where: {
            store: storeFilter,
          },
          include: {
            store: true,
          },
        },
      },
    });

    this.logger.log(
      `📦 Encontrados ${currentInventory.length} productos en inventario`,
    );

    const historicalStockData: HistoricalStockData[] = [];

    // 3. Para cada producto, calcular el stock histórico
    for (const inv of currentInventory) {
      if (!inv.product) continue;

      for (const storeInv of inv.storeOnInventory) {
        const currentStock = storeInv.stock;
        const productId = inv.productId;
        const storeId = storeInv.storeId;

        // 3a. Calcular entradas DESPUÉS del mes histórico
        const entriesAfter = await this.prisma.entryDetail.findMany({
          where: {
            productId: productId,
            entry: {
              storeId: storeId,
              createdAt: {
                gt: endOfMonth, // Después del fin del mes histórico
              },
              ...(organizationId !== undefined && organizationId !== null
                ? { organizationId }
                : {}),
            },
          },
        });

        const totalEntriesAfter = entriesAfter.reduce(
          (sum, e) => sum + e.quantity,
          0,
        );

        // 3b. Calcular salidas (ventas) DESPUÉS del mes histórico
        const salesAfter = await this.prisma.salesDetail.findMany({
          where: {
            productId: productId,
            sale: {
              storeId: storeId,
              createdAt: {
                gt: endOfMonth,
              },
              ...(organizationId !== undefined && organizationId !== null
                ? { organizationId }
                : {}),
            },
          },
        });

        const totalSalesAfter = salesAfter.reduce(
          (sum, s) => sum + s.quantity,
          0,
        );

        // 3c. Calcular stock histórico
        const historicalStock =
          currentStock - totalEntriesAfter + totalSalesAfter;

        // Solo incluir si había stock en ese mes
        if (historicalStock <= 0) continue;

        // 4. Obtener el último precio de compra VIGENTE en ese mes
        // (la última entrada ANTES o DURANTE el mes histórico)
        const lastEntry = await this.prisma.entryDetail.findFirst({
          where: {
            productId: productId,
            entry: {
              storeId: storeId,
              createdAt: {
                lte: endOfMonth, // Antes o durante el mes histórico
              },
              ...(organizationId !== undefined && organizationId !== null
                ? { organizationId }
                : {}),
            },
          },
          orderBy: {
            entry: {
              createdAt: 'desc',
            },
          },
        });

        const lastPurchasePrice = lastEntry
          ? lastEntry.priceInSoles || lastEntry.price || 0
          : inv.product.price || 0;

        // 5. Calcular valor total
        const totalValue = historicalStock * lastPurchasePrice;

        historicalStockData.push({
          productId,
          productName: inv.product.name,
          storeId,
          storeName: storeInv.store.name,
          historicalStock,
          lastPurchasePrice,
          totalValue,
        });
      }
    }

    this.logger.log(
      `✅ Calculados ${historicalStockData.length} registros de stock histórico`,
    );

    // 6. Agregar totales
    const totalInventoryValue = historicalStockData.reduce(
      (sum, item) => sum + item.totalValue,
      0,
    );
    const totalProducts = new Set(
      historicalStockData.map((item) => item.productId),
    ).size;
    const totalUnits = historicalStockData.reduce(
      (sum, item) => sum + item.historicalStock,
      0,
    );

    this.logger.log(
      `💰 Totales - Valor: S/. ${totalInventoryValue.toFixed(2)}, Productos: ${totalProducts}, Unidades: ${totalUnits}`,
    );

    return {
      month,
      year,
      totalInventoryValue,
      totalProducts,
      totalUnits,
      details: historicalStockData,
    };
  }

  /**
   * Crea y guarda un snapshot histórico calculado en la base de datos
   */
  async createCalculatedSnapshot(
    month: number,
    year: number,
    organizationId?: number,
    companyId?: number,
  ) {
    this.logger.log(
      `🔄 Creando snapshot calculado para ${month}/${year}...`,
    );

    // Calcular datos históricos
    const data = await this.calculateHistoricalSnapshot(
      month,
      year,
      organizationId,
      companyId,
    );

    // Guardar en base de datos
    const snapshot = await this.prisma.inventorySnapshot.upsert({
      where: {
        organizationId_companyId_year_month: {
          organizationId:
            organizationId !== undefined ? organizationId : (null as any),
          companyId: companyId !== undefined ? companyId : (null as any),
          year,
          month,
        },
      },
      create: {
        month,
        year,
        totalInventoryValue: data.totalInventoryValue,
        totalProducts: data.totalProducts,
        totalUnits: data.totalUnits,
        organizationId,
        companyId,
        snapshotType: 'CALCULATED',
        calculatedAt: new Date(),
        dataSourcePeriod: `Calculated from current stock backwards`,
      },
      update: {
        totalInventoryValue: data.totalInventoryValue,
        totalProducts: data.totalProducts,
        totalUnits: data.totalUnits,
        snapshotType: 'CALCULATED',
        calculatedAt: new Date(),
        dataSourcePeriod: `Calculated from current stock backwards`,
      },
    });

    this.logger.log(
      `✅ Snapshot calculado guardado - ID: ${snapshot.id}, Valor: S/. ${snapshot.totalInventoryValue.toFixed(2)}`,
    );

    return snapshot;
  }

  /**
   * Backfill: crea snapshots calculados para un rango de meses
   */
  async backfillSnapshots(
    startMonth: number,
    startYear: number,
    endMonth: number,
    endYear: number,
    organizationId?: number,
    companyId?: number,
  ) {
    this.logger.log(
      `🚀 Iniciando backfill desde ${startMonth}/${startYear} hasta ${endMonth}/${endYear}`,
    );

    const snapshots: InventorySnapshot[] = [];
    let currentMonth = startMonth;
    let currentYear = startYear;

    while (
      currentYear < endYear ||
      (currentYear === endYear && currentMonth <= endMonth)
    ) {
      try {
        const snapshot = await this.createCalculatedSnapshot(
          currentMonth,
          currentYear,
          organizationId,
          companyId,
        );
        snapshots.push(snapshot);
      } catch (error) {
        this.logger.error(
          `❌ Error al crear snapshot para ${currentMonth}/${currentYear}:`,
          error instanceof Error ? error.message : String(error),
        );
      }

      // Avanzar al siguiente mes
      currentMonth++;
      if (currentMonth > 12) {
        currentMonth = 1;
        currentYear++;
      }
    }

    this.logger.log(`🎉 Backfill completado: ${snapshots.length} snapshots creados`);

    return snapshots;
  }

  /**
   * Obtiene el rango de fechas disponibles en los datos (primera entrada y última venta)
   */
  async getDataRange(organizationId?: number, companyId?: number) {
    const orgFilter =
      organizationId !== undefined && organizationId !== null
        ? { organizationId }
        : {};

    const storeFilter: any = { ...orgFilter };
    if (companyId !== undefined && companyId !== null) {
      storeFilter.companyId = companyId;
    }

    // Primera entrada
    const firstEntry = await this.prisma.entry.findFirst({
      where: {
        ...orgFilter,
        store: storeFilter,
      },
      orderBy: { createdAt: 'asc' },
    });

    // Última venta
    const lastSale = await this.prisma.sales.findFirst({
      where: {
        ...orgFilter,
        storeId: {
          in: (
            await this.prisma.store.findMany({
              where: storeFilter,
              select: { id: true },
            })
          ).map((s) => s.id),
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    return {
      firstEntryDate: firstEntry?.createdAt || now,
      lastSaleDate: lastSale?.createdAt || now,
      firstMonth: firstEntry
        ? firstEntry.createdAt.getMonth() + 1
        : now.getMonth() + 1,
      firstYear: firstEntry
        ? firstEntry.createdAt.getFullYear()
        : now.getFullYear(),
      lastMonth: lastSale
        ? lastSale.createdAt.getMonth() + 1
        : now.getMonth() + 1,
      lastYear: lastSale
        ? lastSale.createdAt.getFullYear()
        : now.getFullYear(),
    };
  }
}
