import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PredictiveAlgorithmService } from './predictive-algorithm.service';
import {
  InvestmentRecommendationService,
  ProductInvestmentData,
  InvestmentRecommendation,
} from './investment-recommendation.service';
import { buildOrganizationFilter } from 'src/tenancy/organization.utils';
import { Prisma } from '@prisma/client';
import { subDays } from 'date-fns';
import { InventorySnapshotService } from 'src/inventory/inventory-snapshot.service';

export interface ProductProfitSummary {
  productId: number;
  sku?: string;
  name: string;
  unitsSold: number;
  avgSalePrice: number;
  avgPurchasePrice: number;
  revenue: number;
  cost: number;
  profit: number;
  currentStock: number;
}

export interface MonthlyHistoryItem {
  month: string; // "Ene 2025"
  year: number;
  monthNumber: number; // 1-12
  profit: number;
  changePercent: number;
}

export interface MonthlyHistory {
  months: MonthlyHistoryItem[];
  bestMonth: MonthlyHistoryItem | null;
  worstMonth: MonthlyHistoryItem | null;
}

export interface InventoryROI {
  totalInventoryValue: number;
  monthlyProfit: number;
  roiPercent: number;
  status: 'critical' | 'warning' | 'healthy';
  alertMessage?: string;
}

export interface ROIHistoryItem {
  month: string; // "Ene 2025"
  year: number;
  monthNumber: number; // 1-12
  roiPercent: number;
  changePercent: number;
  profit: number;
  inventoryValue: number;
  totalSales: number; // Ventas totales del mes
  totalPurchases: number; // Valor total de compras/entradas del mes
}

export interface ROIHistory {
  months: ROIHistoryItem[];
  bestMonth: ROIHistoryItem | null;
  worstMonth: ROIHistoryItem | null;
}

export interface ProfitAnalysisResponse {
  top50Profitable: ProductProfitSummary[];
  top50Unprofitable: ProductProfitSummary[];
  monthProjection: {
    current: number;
    projected: number;
    confidence: number;
    trend: 'up' | 'down' | 'stable';
    daysAnalyzed: number;
    daysRemaining: number;
    breakdown: {
      last30Days: number;
      days30to60: number;
      days60to90: number;
    };
  };
  recommendations: InvestmentRecommendation[];
  monthlyHistory: MonthlyHistory;
  inventoryROI: InventoryROI;
  roiHistory: ROIHistory;
}

@Injectable()
export class ProfitAnalysisService {
  private readonly logger = new Logger(ProfitAnalysisService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly predictiveService: PredictiveAlgorithmService,
    private readonly recommendationService: InvestmentRecommendationService,
    private readonly snapshotService: InventorySnapshotService,
  ) {}

  /**
   * Obtiene el análisis completo de utilidades
   */
  async getProfitAnalysis(
    from: Date,
    to: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<ProfitAnalysisResponse> {
    try {
      this.logger.log(
        `Generando análisis de utilidades para org=${organizationId}, company=${companyId}, from=${from.toISOString()}, to=${to.toISOString()}`,
      );

      const orgFilter = buildOrganizationFilter(
        organizationId,
        companyId,
      ) as Prisma.SalesWhereInput;

      // 1. Obtener ventas con detalles (últimos 90 días para proyecciones)
      const last90Days = subDays(new Date(), 90);
      const sales = await this.prisma.sales.findMany({
        where: {
          ...orgFilter,
          createdAt: {
            gte: last90Days,
          },
        },
        select: {
          createdAt: true,
          salesDetails: {
            select: {
              quantity: true,
              price: true,
              entryDetail: {
                select: {
                  price: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 1.5. Obtener ventas de los últimos 12 meses para histórico mensual
      const last12Months = subDays(new Date(), 365);
      const salesForHistory = await this.prisma.sales.findMany({
        where: {
          ...orgFilter,
          createdAt: {
            gte: last12Months,
          },
        },
        select: {
          createdAt: true,
          salesDetails: {
            select: {
              quantity: true,
              price: true,
              entryDetail: {
                select: {
                  price: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      // 2. Calcular proyección mensual usando precio de compra (entryDetail.price)
      const dailyProfits = this.predictiveService.groupSalesByDay(
        sales.map((s) => ({
          createdAt: s.createdAt,
          details: s.salesDetails.map((d) => ({
            quantity: d.quantity,
            price: d.price,
            product: { avgCost: d.entryDetail?.price ?? 0 },
          })),
        })),
      );

      const monthProjection =
        this.predictiveService.projectMonthlyProfit(dailyProfits);

      // 2.5. Calcular desglose mensual (últimos 30, 60, 90 días)
      const breakdown = this.calculateMonthlyBreakdown(dailyProfits);

      // 2.6. Calcular utilidades diarias de los últimos 12 meses
      const dailyProfitsForHistory = this.predictiveService.groupSalesByDay(
        salesForHistory.map((s) => ({
          createdAt: s.createdAt,
          details: s.salesDetails.map((d) => ({
            quantity: d.quantity,
            price: d.price,
            product: { avgCost: d.entryDetail?.price ?? 0 },
          })),
        })),
      );

      // 2.7. Calcular histórico mensual (últimos 12 meses)
      const monthlyHistory = this.calculateMonthlyHistory(dailyProfitsForHistory);

      // 2.8. Calcular ROI del inventario usando utilidad de últimos 30 días
      const inventoryROI = await this.calculateInventoryROI(
        breakdown.last30Days,
        organizationId,
        companyId,
      );

      // 2.9. Calcular histórico de ROI usando las utilidades mensuales
      const roiHistory = await this.calculateROIHistory(
        monthlyHistory,
        inventoryROI.totalInventoryValue,
        organizationId,
        companyId,
      );

      // 3. Calcular top 10 productos más/menos rentables (en el rango especificado)
      const productProfits = await this.calculateProductProfits(
        from,
        to,
        organizationId,
        companyId,
      );

      const top50Profitable = productProfits
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 50);

      const top50Unprofitable = productProfits
        .filter((p) => p.profit < 0 || (p.profit < 100 && p.currentStock > 10))
        .sort((a, b) => a.profit - b.profit)
        .slice(0, 50);

      // 4. Generar recomendaciones de inversión
      const investmentData: ProductInvestmentData[] = productProfits.map(
        (p) => ({
          productId: p.productId,
          name: p.name,
          sku: p.sku,
          avgSalePrice: p.avgSalePrice,
          avgPurchasePrice: p.avgPurchasePrice,
          unitsSold: p.unitsSold,
          currentStock: p.currentStock,
          daysAnalyzed: 90,
        }),
      );

      const recommendations =
        this.recommendationService.getTopRecommendations(investmentData, 10);

      return {
        top50Profitable,
        top50Unprofitable,
        monthProjection: {
          ...monthProjection,
          breakdown,
        },
        recommendations,
        monthlyHistory,
        inventoryROI,
        roiHistory,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error desconocido';
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Error en getProfitAnalysis: ${message}`,
        stack,
      );
      throw error;
    }
  }

  /**
   * Calcula histórico de utilidades por mes (últimos 12 meses)
   */
  private calculateMonthlyHistory(
    dailyProfits: { date: Date; profit: number }[],
  ): MonthlyHistory {
    const monthMap = new Map<string, number>();
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];

    // Agrupar utilidades por mes
    for (const day of dailyProfits) {
      const year = day.date.getFullYear();
      const month = day.date.getMonth(); // 0-11
      const key = `${year}-${String(month + 1).padStart(2, '0')}`; // "2025-01"

      monthMap.set(key, (monthMap.get(key) || 0) + day.profit);
    }

    // Convertir a array y ordenar por fecha (más reciente primero)
    const sortedEntries = Array.from(monthMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 12); // Solo últimos 12 meses

    // Convertir a MonthlyHistoryItem con porcentaje de cambio
    const months: MonthlyHistoryItem[] = [];
    for (let i = 0; i < sortedEntries.length; i++) {
      const [key, profit] = sortedEntries[i];
      const [yearStr, monthStr] = key.split('-');
      const year = parseInt(yearStr, 10);
      const monthNumber = parseInt(monthStr, 10);
      const monthName = monthNames[monthNumber - 1];

      // Calcular cambio porcentual vs mes anterior (el siguiente en el array por orden desc)
      let changePercent = 0;
      if (i < sortedEntries.length - 1) {
        const prevProfit = sortedEntries[i + 1][1];
        if (prevProfit > 0) {
          changePercent = ((profit - prevProfit) / prevProfit) * 100;
        }
      }

      months.push({
        month: `${monthName} ${year}`,
        year,
        monthNumber,
        profit: Math.round(profit * 100) / 100,
        changePercent: Math.round(changePercent * 10) / 10,
      });
    }

    // Encontrar mejor y peor mes
    let bestMonth: MonthlyHistoryItem | null = null;
    let worstMonth: MonthlyHistoryItem | null = null;

    if (months.length > 0) {
      bestMonth = months.reduce((max, current) =>
        current.profit > max.profit ? current : max,
      );
      worstMonth = months.reduce((min, current) =>
        current.profit < min.profit ? current : min,
      );
    }

    return {
      months,
      bestMonth,
      worstMonth,
    };
  }

  /**
   * Calcula histórico de ROI basado en utilidades mensuales y snapshots de inventario
   * Usa snapshots históricos cuando están disponibles, si no usa valor actual
   */
  private async calculateROIHistory(
    monthlyHistory: MonthlyHistory,
    currentInventoryValue: number,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<ROIHistory> {
    const roiMonths: ROIHistoryItem[] = [];

    const orgFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.SalesWhereInput;

    // Obtener ventas de los últimos 12 meses agrupadas por mes
    const last12Months = subDays(new Date(), 365);
    const sales = await this.prisma.sales.findMany({
      where: {
        ...orgFilter,
        createdAt: {
          gte: last12Months,
        },
      },
      select: {
        createdAt: true,
        total: true,
      },
    });

    // Obtener entradas (compras) de los últimos 12 meses
    // NOTE: Entry model only has organizationId, NOT companyId
    // We filter by companyId through the Store relation
    const entries = await this.prisma.entry.findMany({
      where: {
        ...(organizationId !== null && organizationId !== undefined
          ? { organizationId }
          : {}),
        ...(companyId !== null && companyId !== undefined
          ? {
              store: {
                companyId: companyId,
              },
            }
          : {}),
        createdAt: {
          gte: last12Months,
        },
      },
      include: {
        details: true,
      },
    });

    // Obtener snapshots históricos de inventario (últimos 12 meses)
    const snapshots = await this.snapshotService.getSnapshots(
      organizationId ?? undefined,
      companyId ?? undefined,
      12,
    );

    // Crear mapa de snapshots por mes/año para acceso rápido
    const snapshotsByMonth = new Map<string, number>();
    for (const snapshot of snapshots) {
      const key = `${snapshot.year}-${String(snapshot.month).padStart(2, '0')}`;
      snapshotsByMonth.set(key, snapshot.totalInventoryValue);
    }

    // Log para debug
    this.logger.log(
      `ROI History: Encontradas ${sales.length} ventas, ${entries.length} entradas, ` +
        `y ${snapshots.length} snapshots en últimos 12 meses`,
    );

    // Agrupar ventas por mes
    const salesByMonth = new Map<string, number>();
    for (const sale of sales) {
      const year = sale.createdAt.getFullYear();
      const month = sale.createdAt.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;
      salesByMonth.set(key, (salesByMonth.get(key) || 0) + sale.total);
    }

    // Agrupar compras por mes
    const purchasesByMonth = new Map<string, number>();
    for (const entry of entries) {
      const year = entry.createdAt.getFullYear();
      const month = entry.createdAt.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;

      const entryTotal = entry.details.reduce(
        (sum, detail) => sum + detail.quantity * detail.price,
        0,
      );

      purchasesByMonth.set(
        key,
        (purchasesByMonth.get(key) || 0) + entryTotal,
      );
    }

    // Para cada mes con utilidad, calcular ROI
    for (let i = 0; i < monthlyHistory.months.length; i++) {
      const monthData = monthlyHistory.months[i];
      const key = `${monthData.year}-${String(monthData.monthNumber).padStart(2, '0')}`;

      // Usar snapshot histórico si existe, si no usar valor actual
      const monthInventoryValue =
        snapshotsByMonth.get(key) ?? currentInventoryValue;
      const hasSnapshot = snapshotsByMonth.has(key);

      // Calcular ROI% = (utilidad del mes / valor inventario) * 100
      const roiPercent =
        monthInventoryValue > 0
          ? (monthData.profit / monthInventoryValue) * 100
          : 0;

      // Calcular cambio porcentual vs mes anterior
      let changePercent = 0;
      if (i < monthlyHistory.months.length - 1) {
        const prevMonthData = monthlyHistory.months[i + 1];
        const prevKey = `${prevMonthData.year}-${String(prevMonthData.monthNumber).padStart(2, '0')}`;
        const prevMonthInventoryValue =
          snapshotsByMonth.get(prevKey) ?? currentInventoryValue;

        const prevROI =
          prevMonthInventoryValue > 0
            ? (prevMonthData.profit / prevMonthInventoryValue) * 100
            : 0;

        if (prevROI > 0) {
          changePercent = ((roiPercent - prevROI) / prevROI) * 100;
        }
      }

      this.logger.log(
        `ROI ${monthData.month}: Inventario=${monthInventoryValue.toFixed(2)} ` +
          `(${hasSnapshot ? 'snapshot' : 'actual'}), ROI=${roiPercent.toFixed(2)}%`,
      );

      roiMonths.push({
        month: monthData.month,
        year: monthData.year,
        monthNumber: monthData.monthNumber,
        roiPercent: Math.round(roiPercent * 100) / 100,
        changePercent: Math.round(changePercent * 10) / 10,
        profit: monthData.profit,
        inventoryValue: Math.round(monthInventoryValue * 100) / 100,
        totalSales: Math.round((salesByMonth.get(key) || 0) * 100) / 100,
        totalPurchases:
          Math.round((purchasesByMonth.get(key) || 0) * 100) / 100,
      });
    }

    // Encontrar mejor y peor mes por ROI
    let bestMonth: ROIHistoryItem | null = null;
    let worstMonth: ROIHistoryItem | null = null;

    if (roiMonths.length > 0) {
      bestMonth = roiMonths.reduce((max, current) =>
        current.roiPercent > max.roiPercent ? current : max,
      );
      worstMonth = roiMonths.reduce((min, current) =>
        current.roiPercent < min.roiPercent ? current : min,
      );
    }

    return {
      months: roiMonths,
      bestMonth,
      worstMonth,
    };
  }

  /**
   * Calcula desglose de utilidades por períodos de 30 días
   */
  private calculateMonthlyBreakdown(
    dailyProfits: { date: Date; profit: number }[],
  ): { last30Days: number; days30to60: number; days60to90: number } {
    const now = new Date();
    let last30Days = 0;
    let days30to60 = 0;
    let days60to90 = 0;

    for (const day of dailyProfits) {
      const daysDiff = Math.floor(
        (now.getTime() - day.date.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (daysDiff <= 30) {
        last30Days += day.profit;
      } else if (daysDiff <= 60) {
        days30to60 += day.profit;
      } else if (daysDiff <= 90) {
        days60to90 += day.profit;
      }
    }

    return {
      last30Days: Math.round(last30Days * 100) / 100,
      days30to60: Math.round(days30to60 * 100) / 100,
      days60to90: Math.round(days60to90 * 100) / 100,
    };
  }

  /**
   * Calcula el ROI del inventario comparando utilidades vs valor inmovilizado
   */
  private async calculateInventoryROI(
    monthlyProfit: number,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<InventoryROI> {
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

    for (const product of productsWithStock) {
      const lastPurchasePrice = product.entryDetail[0]?.price ?? 0;

      // Sumar stock de todas las tiendas
      const totalStock = product.inventory.reduce((sum, inv) => {
        return (
          sum +
          inv.storeOnInventory.reduce((storeSum, store) => storeSum + store.stock, 0)
        );
      }, 0);

      if (totalStock > 0 && lastPurchasePrice > 0) {
        totalInventoryValue += totalStock * lastPurchasePrice;
      }
    }

    // 4. Calcular ROI%
    const roiPercent =
      totalInventoryValue > 0 ? (monthlyProfit / totalInventoryValue) * 100 : 0;

    // 5. Determinar status y mensaje
    let status: 'critical' | 'warning' | 'healthy';
    let alertMessage: string | undefined;

    if (roiPercent < 5) {
      status = 'critical';
      alertMessage = 'Capital inmovilizado - Inventario genera bajo retorno';
    } else if (roiPercent < 10) {
      status = 'warning';
      alertMessage = 'ROI por debajo del objetivo - Monitorear rotación';
    } else {
      status = 'healthy';
    }

    // Log para debug
    this.logger.log(
      `ROI Calculado: Valor Inventario=${totalInventoryValue.toFixed(2)}, ` +
        `Utilidad Mensual=${monthlyProfit.toFixed(2)}, ROI=${roiPercent.toFixed(2)}%, Status=${status}`,
    );

    return {
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      monthlyProfit: Math.round(monthlyProfit * 100) / 100,
      roiPercent: Math.round(roiPercent * 100) / 100,
      status,
      alertMessage,
    };
  }

  /**
   * Calcula utilidades por producto en un rango de fechas
   */
  private async calculateProductProfits(
    from: Date,
    to: Date,
    organizationId?: number | null,
    companyId?: number | null,
  ): Promise<ProductProfitSummary[]> {
    const orgFilter = buildOrganizationFilter(
      organizationId,
      companyId,
    ) as Prisma.SalesWhereInput;

    // Obtener ventas del período con entryDetail para precio de compra
    const sales = await this.prisma.sales.findMany({
      where: {
        ...orgFilter,
        createdAt: {
          gte: from,
          lte: to,
        },
      },
      select: {
        id: true,
        salesDetails: {
          select: {
            productId: true,
            quantity: true,
            price: true,
            entryDetail: {
              select: {
                price: true,
              },
            },
          },
        },
      },
    });

    // Agrupar por producto
    const productMap = new Map<number, ProductProfitSummary>();

    for (const sale of sales) {
      for (const detail of sale.salesDetails) {
        const productId = detail.productId;
        const purchasePrice = detail.entryDetail?.price ?? 0;
        const revenue = detail.quantity * detail.price;
        const cost = detail.quantity * purchasePrice;
        const profit = revenue - cost;

        if (!productMap.has(productId)) {
          productMap.set(productId, {
            productId,
            sku: undefined,
            name: '',
            unitsSold: 0,
            avgSalePrice: 0,
            avgPurchasePrice: purchasePrice,
            revenue: 0,
            cost: 0,
            profit: 0,
            currentStock: 0,
          });
        }

        const summary = productMap.get(productId)!;
        summary.unitsSold += detail.quantity;
        summary.revenue += revenue;
        summary.cost += cost;
        summary.profit += profit;
      }
    }

    // Calcular promedios y obtener datos del producto (nombre, barcode, stock)
    const productIds = Array.from(productMap.keys());
    const products = await this.prisma.product.findMany({
      where: {
        id: { in: productIds },
      },
      select: {
        id: true,
        name: true,
        barcode: true,
        inventory: {
          select: {
            storeOnInventory: {
              select: {
                stock: true,
              },
            },
          },
        },
      },
    });

    for (const product of products) {
      const summary = productMap.get(product.id);
      if (summary) {
        // Agregar nombre y barcode (como SKU)
        summary.name = product.name;
        summary.sku = product.barcode ?? undefined; // Convertir null a undefined

        // Calcular precio de venta promedio
        summary.avgSalePrice =
          summary.unitsSold > 0 ? summary.revenue / summary.unitsSold : 0;

        // Stock actual (suma de todas las tiendas)
        summary.currentStock = product.inventory.reduce((total, inv) => {
          return (
            total +
            inv.storeOnInventory.reduce(
              (storeTotal, storeInv) => storeTotal + storeInv.stock,
              0,
            )
          );
        }, 0);
      }
    }

    return Array.from(productMap.values());
  }
}
